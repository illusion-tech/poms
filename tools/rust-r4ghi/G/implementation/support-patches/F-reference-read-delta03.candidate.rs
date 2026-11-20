use super::{
    logic,
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    compat::{
        json::Field,
        scalars::{self, BusinessTimeZone, DateInput},
    },
    contract_support::{self, Actor, Error},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};
use sqlx::{Postgres, QueryBuilder, Row};
use uuid::Uuid;

pub(super) fn date(value: &str) -> Result<String, Error> {
    let parsed = NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| Error::BadRequest("A real YYYY-MM-DD business date is required".into()))?;
    if parsed.to_string() != value {
        return Err(Error::BadRequest("Use YYYY-MM-DD business dates".into()));
    }
    Ok(value.into())
}
pub(super) fn business_date(value: &str) -> Result<String, Error> {
    if value.len() == 10 {
        return date(value);
    }
    let instant = DateTime::parse_from_rfc3339(value)
        .map_err(|_| Error::Unprocessable("Source business date is unavailable".into()))?
        .with_timezone(&Utc);
    scalars::business_date_only(
        Field::Value(DateInput::Instant(instant)),
        BusinessTimeZone::HongKong,
    )
    .map_err(|_| Error::Unprocessable("Source business date is unavailable".into()))?
    .ok_or(Error::Internal)
}

pub(super) fn layers(value: &Value, names: [&str; 3]) -> Result<logic::Layers, Error> {
    let mut result = [None; 3];
    for (index, name) in names.iter().enumerate() {
        result[index] = match value.get(*name) {
            None | Some(Value::Null) => None,
            Some(Value::String(s)) => {
                Some(logic::decimal(s, 2, logic::MAX_MONEY).map_err(|_| {
                    Error::Unprocessable("Source monetary precision is not certified".into())
                })?)
            }
            _ => {
                return Err(Error::Unprocessable(
                    "Source money must remain exact decimal text".into(),
                ));
            }
        };
    }
    Ok(result)
}

/// The exact E -> F contract is pinned in the F handoff record. This function
/// never manufactures a cost/source object and never re-evaluates a rate from
/// a later current version. E resolves the actual persisted source under locks.
pub(super) async fn cost_source(
    session: &mut CommonSession<'_, '_>,
    cost: &Value,
) -> Result<Value, Error> {
    if cost["basis_origin"] != "captured" || !cost["source_basis"].is_object() {
        return Err(Error::Conflict(
            "Cost source evidence is not captured".into(),
        ));
    }
    let mut facts =
        crate::project_actual_cost::source_facts(&mut *session.connection, cost, true).await?;
    if facts["sourceType"] != cost["source_type"]
        || facts["sourceId"] != cost["source_id"]
        || facts["currency"] != cost["currency"]
    {
        return Err(Error::Conflict(
            "Cost source identity or currency changed".into(),
        ));
    }
    let stored = layers(
        cost,
        [
            "amount_excluding_tax",
            "tax_cost_amount",
            "amount_including_tax",
        ],
    )?;
    let actual = layers(
        &facts,
        ["amountExcludingTax", "taxCostAmount", "amountIncludingTax"],
    )?;
    if stored != actual || facts["occurredOn"] != cost["occurred_on"] {
        return Err(Error::Conflict("Cost source facts changed".into()));
    }
    currency(store::text(&facts, "currency")?)?;
    let anchor = latest_source_anchor(session, store::id(cost, "id")?).await?;
    facts["governanceVersionProof"] = version_proof(cost, &facts, anchor.as_ref())?;
    Ok(facts)
}

fn version_proof(cost: &Value, facts: &Value, anchor: Option<&Value>) -> Result<Value, Error> {
    let expected = cost["source_basis"]
        .get("sourceRowVersion")
        .and_then(Value::as_i64)
        .filter(|n| *n > 0)
        .ok_or_else(|| Error::Conflict("Cost source version is unavailable".into()))?;
    let current = facts
        .get("sourceRowVersion")
        .and_then(Value::as_i64)
        .filter(|n| *n > 0)
        .ok_or(Error::Internal)?;
    let captured = &cost["source_basis"]["sourcePayload"];
    if !captured.is_object()
        || captured["row_version"].as_i64() != Some(expected)
        || facts["sourcePayload"]["row_version"].as_i64() != Some(current)
    {
        return Err(Error::Conflict(
            "Captured source version binding is unavailable".into(),
        ));
    }
    let (previous, prior) = match anchor {
        Some(proof) => {
            if proof["capturedVersion"] != expected
                || proof["capturedPayloadHash"] != contract_support::canonical_hash(captured)?
                || proof["sourceType"] != facts["sourceType"]
                || proof["sourceId"] != facts["sourceId"]
                || proof["currentPayloadHash"]
                    != contract_support::canonical_hash(&proof["sourcePayload"])?
            {
                return Err(Error::Conflict(
                    "Certified source anchor integrity requires review".into(),
                ));
            }
            let previous = proof["currentVersion"]
                .as_i64()
                .filter(|n| *n > 0)
                .ok_or(Error::Internal)?;
            if proof["sourcePayload"]["row_version"].as_i64() != Some(previous) {
                return Err(Error::Conflict(
                    "Certified source version binding requires review".into(),
                ));
            }
            (previous, &proof["sourcePayload"])
        }
        None => (expected, captured),
    };
    if previous > current {
        return Err(Error::Conflict(
            "Source version regressed behind its certified anchor".into(),
        ));
    }
    let reason = crate::project_actual_cost::compare_source_transition(
        cost,
        prior,
        &facts["sourcePayload"],
    )?;
    if previous != current
        && !matches!(
            reason,
            Some("payable-payment-progress-only" | "rate-superseded-covered-period")
        )
    {
        return Err(Error::Conflict(
            "Source version changed without a certified semantic transition".into(),
        ));
    }
    Ok(
        json!({"costRecordId":cost["id"],"sourceType":facts["sourceType"],"sourceId":facts["sourceId"],"capturedVersion":expected,"capturedPayloadHash":contract_support::canonical_hash(captured)?,"previousCertifiedVersion":previous,"currentVersion":current,"reason":reason.unwrap_or("unchanged"),"capturedToCurrent":facts.get("sourceVersionTransition").cloned().unwrap_or(Value::Null),"previousPayloadHash":contract_support::canonical_hash(prior)?,"currentPayloadHash":contract_support::canonical_hash(&facts["sourcePayload"])?,"sourcePayload":facts["sourcePayload"]}),
    )
}

async fn latest_source_anchor(
    session: &mut CommonSession<'_, '_>,
    cost: Uuid,
) -> Result<Option<Value>, Error> {
    let row=sqlx::query("SELECT to_jsonb(e) AS evidence,t.proof FROM poms.cost_governance_evidence e CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e.frozen_payload->'sourceVersionTransitions')='array' THEN e.frozen_payload->'sourceVersionTransitions' ELSE '[]'::jsonb END) AS t(proof) WHERE e.schema_version=1 AND t.proof->>'costRecordId'=$1 ORDER BY (t.proof->>'currentVersion')::bigint DESC,e.created_at DESC,e.id DESC LIMIT 1").bind(cost.to_string()).fetch_optional(&mut *session.connection).await?;
    match row {
        None => Ok(None),
        Some(row) => {
            let evidence: Value = row.try_get("evidence")?;
            if evidence["payload_hash"]
                != contract_support::canonical_hash(&evidence["frozen_payload"])?
            {
                return Err(Error::Conflict(
                    "Certified source evidence hash requires review".into(),
                ));
            }
            let proof: Value = row.try_get("proof")?;
            Ok(Some(proof))
        }
    }
}

pub(super) fn currency(value: &str) -> Result<&str, Error> {
    if value.len() != 3 || !value.bytes().all(|b| b.is_ascii_uppercase()) {
        return Err(Error::Unprocessable(
            "A proven three-letter currency is required".into(),
        ));
    }
    Ok(value)
}

pub(super) struct Reference {
    pub snapshot: Value,
    pub labor: bool,
    pub date: String,
    pub stage: Option<String>,
    pub currency: Option<String>,
}

pub(super) async fn cost_references(
    session: &mut CommonSession<'_, '_>,
    inputs: &[Value],
    project: Uuid,
) -> Result<Vec<Value>, Error> {
    let mut costs = std::collections::BTreeMap::new();
    for input in inputs {
        if input["kind"] != "source"
            || !matches!(
                input["sourceType"].as_str(),
                Some("project-actual-cost-record" | "source-cost-fact")
            )
        {
            continue;
        }
        let id = store::id(input, "sourceId")?;
        let cost = store::row(session.connection, Table::Cost, id, false).await?;
        if store::id(&cost, "project_id")? != project {
            return Err(Error::Unprocessable(
                "Evidence belongs to a different project".into(),
            ));
        }
        costs.insert(id, cost);
    }
    Ok(costs.into_values().collect())
}

pub(super) async fn reference(
    session: &mut CommonSession<'_, '_>,
    input: &Value,
    project: Uuid,
    actor: &Actor,
) -> Result<Reference, Error> {
    let supplied_date = date(store::text(input, "businessDate")?)?;
    if store::text(input, "reason")?.trim().is_empty() {
        return Err(Error::Unprocessable(
            "Evidence requires a nonempty responsible reason".into(),
        ));
    }
    if input["kind"] == "manual" {
        if store::text(input, "reason")?.trim().is_empty()
            || store::text(input, "evidenceSummary")?.trim().is_empty()
        {
            return Err(Error::Unprocessable(
                "Manual evidence requires a responsible explanation".into(),
            ));
        }
        let mut attachments = std::collections::BTreeSet::new();
        let mut attachment_proofs = Vec::<Value>::new();
        for attachment in input
            .get("attachmentIds")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let id = Uuid::parse_str(attachment.as_str().ok_or(Error::Internal)?)
                .map_err(|_| Error::BadRequest("Invalid attachment identity".into()))?;
            if !attachments.insert(id) {
                return Err(Error::Unprocessable("Duplicate evidence attachment".into()));
            }
        }
        for id in attachments {
            // Real attachment existence plus its actual project binding. Merely
            // possessing an arbitrary UUID is not evidence for this project.
            let rows=sqlx::query("SELECT to_jsonb(a) AS attachment,to_jsonb(l) AS link FROM poms.attachment a JOIN poms.attachment_link l ON l.attachment_id=a.id WHERE a.id=$1 AND a.status='active' AND l.status='active' AND ((l.target_type='project' AND l.target_id=$2) OR (l.target_type='contract' AND EXISTS(SELECT 1 FROM poms.contract c WHERE c.id=l.target_id AND c.project_id=$2))) ORDER BY l.id FOR SHARE OF a,l").bind(id).bind(project).fetch_all(&mut *session.connection).await?;
            if rows.is_empty() {
                return Err(Error::Unprocessable(
                    "Evidence attachment is not bound to this project".into(),
                ));
            }
            for row in rows {
                let attachment: Value = row.try_get("attachment")?;
                let link: Value = row.try_get("link")?;
                if matches!(
                    attachment["security_level"].as_str(),
                    Some("confidential" | "restricted")
                ) && !actor.session.user.permissions.iter().any(|p| {
                    [
                        "contract:finance:sensitive:read",
                        "operating:finance:sensitive:read",
                        "commission:amount:sensitive:read",
                        "platform:roles:manage",
                    ]
                    .contains(&p.as_str())
                }) {
                    return Err(Error::Forbidden(
                        "Attachment security authorization is required".into(),
                    ));
                }
                let checksum = attachment["checksum_sha256"]
                    .as_str()
                    .filter(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit()))
                    .ok_or_else(|| {
                        Error::Conflict("Evidence attachment checksum is unavailable".into())
                    })?;
                if attachment["deleted_at"].is_null()
                    && attachment["version_no"].as_i64().is_some_and(|n| n > 0)
                {
                    attachment_proofs.push(json!({"attachmentId":attachment["id"],"versionGroupId":attachment["version_group_id"],"versionNo":attachment["version_no"],"rowVersion":attachment["row_version"],"checksumSha256":checksum,"link":link}));
                } else {
                    return Err(Error::Conflict(
                        "Evidence attachment version is unavailable".into(),
                    ));
                }
            }
        }
        return Ok(Reference {
            snapshot: json!({"kind":"manual","businessDate":supplied_date,"reason":input["reason"],"evidenceSummary":input["evidenceSummary"],"attachmentIds":input.get("attachmentIds").cloned().unwrap_or_else(||json!([])),"attachmentProofs":attachment_proofs}),
            labor: false,
            date: supplied_date,
            stage: None,
            currency: None,
        });
    }
    if input["kind"] != "source" {
        return Err(Error::BadRequest("Unknown evidence kind".into()));
    }
    let source = store::text(input, "sourceType")?;
    if !matches!(
        source,
        "project-actual-cost-record"
            | "source-cost-fact"
            | "project-handover"
            | "acceptance-record"
            | "contract-term-snapshot"
            | "invoice-record"
            | "payment-record"
            | "payable-record"
            | "expense-record"
    ) {
        return Err(Error::Unprocessable("Unsupported real evidence source type; use a responsible manual assessment for external evidence".into()));
    }
    let id = store::id(input, "sourceId")?;
    let version = input
        .get("sourceVersion")
        .and_then(Value::as_i64)
        .filter(|v| *v > 0)
        .ok_or_else(|| Error::BadRequest("A source version is required".into()))?;
    if source == "project-actual-cost-record" || source == "source-cost-fact" {
        let cost = store::row(session.connection, Table::Cost, id, true).await?;
        if store::id(&cost, "project_id")? != project {
            return Err(Error::Unprocessable(
                "Evidence belongs to a different project".into(),
            ));
        }
        if i64::from(store::version(&cost)?) != version {
            return Err(Error::Conflict("Evidence source version changed".into()));
        }
        // This branch reads evidence and never changes the referenced cost.
        // Actual target stage/allocation/tax write guards remain in service.
        let included_readable = cost["record_status"] == "included"
            && cost["is_included_in_project_cost"] == true
            && !cost["confirmed_at"].is_null()
            && !cost["confirmed_by"].is_null();
        if !included_readable
            && !logic::valid_confirmation_state(
                store::text(&cost, "record_status")?,
                cost["is_included_in_project_cost"]
                    .as_bool()
                    .unwrap_or(true),
            )
        {
            return Err(Error::Conflict(
                "Evidence cost is not an eligible current fact".into(),
            ));
        }
        let facts = cost_source(session, &cost).await?;
        let occurred = date(store::text(&facts, "occurredOn")?)?;
        if occurred != supplied_date {
            return Err(Error::Unprocessable(
                "Evidence date does not match the real source".into(),
            ));
        }
        return Ok(Reference {
            snapshot: json!({"reference":input,"cost":cost,"source":facts}),
            labor: cost["cost_type"] == "labor",
            date: occurred,
            // Another cost's attribution does not prove a project-stage interval.
            stage: None,
            currency: store::optional_text(&facts, "currency"),
        });
    }
    let (table, stage) = match source {
        "project-handover" => ("project_handover", Some("handover")),
        "acceptance-record" => ("acceptance_record", Some("acceptance")),
        "contract-term-snapshot" => ("contract_term_snapshot", Some("contracting")),
        "invoice-record" => ("invoice_record", None),
        "payment-record" => ("payment_record", None),
        "payable-record" => ("payable_record", None),
        "expense-record" => ("expense_record", None),
        _ => {
            return Err(Error::Unprocessable(
                "Unsupported real evidence source type".into(),
            ));
        }
    };
    let financial = match source {
        "payment-record" | "payable-record" => {
            ",'amount_excluding_tax',t.amount_excluding_tax::text,'tax_amount',t.tax_amount::text,'amount_including_tax',t.amount_including_tax::text"
        }
        "expense-record" => {
            ",'amount_excluding_tax',t.amount_excluding_tax::text,'tax_amount',t.tax_amount::text,'amount_including_tax',t.amount_including_tax::text"
        }
        "invoice-record" => ",'invoice_amount',t.invoice_amount::text",
        _ => "",
    };
    let sql = if source == "contract-term-snapshot" {
        // A stage milestone needs identity, versions, time and the preparation's
        // currency proof. Selecting the full snapshot would decode its numeric
        // money/rates (and arbitrary seeds) through serde_json's float path.
        "SELECT jsonb_build_object('id',t.id,'contract_id',t.contract_id,'project_id',c.project_id,'snapshot_status',t.snapshot_status,'version',t.version,'row_version',t.row_version,'effective_at',t.effective_at,'source_preparation_id',t.source_preparation_id,'currency',p.currency_code,'preparation_currency_row_version',p.row_version) AS data FROM poms.contract_term_snapshot t JOIN poms.contract c ON c.id=t.contract_id LEFT JOIN poms.contract_term_preparation p ON p.id=t.source_preparation_id AND p.contract_id=t.contract_id WHERE t.id=$1 AND c.project_id=$2 FOR UPDATE OF t".to_owned()
    } else {
        format!(
            "SELECT to_jsonb(t)||jsonb_build_object('id',t.id{financial}) AS data FROM poms.{table} t WHERE t.id=$1 AND t.project_id=$2 FOR UPDATE"
        )
    };
    let row = QueryBuilder::<Postgres>::new(sql)
        .build()
        .bind(id)
        .bind(project)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| {
            Error::Unprocessable("Real same-project evidence source is unavailable".into())
        })?;
    let row: Value = row.try_get("data")?;
    if i64::from(store::version(&row)?) != version {
        return Err(Error::Conflict("Evidence source version changed".into()));
    }
    if let Some(contract) = store::optional_id(&row, "contract_id")?
        && contract_support::contract_fact(&mut *session.connection, contract, Some(project), false)
            .await?
            .is_none()
    {
        return Err(Error::Conflict(
            "Evidence source contract belongs to another project".into(),
        ));
    }
    let status = row
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let date_field = match source {
        "project-handover" => {
            if status != "confirmed"
                || row["producer_version"] != 1
                || row["basis_snapshot_id"].is_null()
            {
                return Err(Error::Conflict(
                    "A real confirmed handover is required".into(),
                ));
            }
            "confirmed_at"
        }
        "acceptance-record" => {
            if status != "confirmed"
                || !matches!(
                    row["acceptance_result"].as_str(),
                    Some("accepted" | "conditional")
                )
            {
                return Err(Error::Conflict(
                    "Effective acceptance evidence is required".into(),
                ));
            }
            "confirmed_at"
        }
        "contract-term-snapshot" => {
            if !matches!(
                row["snapshot_status"].as_str(),
                Some("active" | "superseded")
            ) {
                return Err(Error::Conflict(
                    "Effective contract snapshot evidence is required".into(),
                ));
            }
            "effective_at"
        }
        "payment-record" => {
            if status != "confirmed" {
                return Err(Error::Conflict(
                    "Confirmed payment evidence is required".into(),
                ));
            }
            "payment_date"
        }
        "payable-record" => {
            if !matches!(
                status,
                "recorded" | "partially-paid" | "completed" | "closed"
            ) {
                return Err(Error::Conflict(
                    "Formal payable evidence is required".into(),
                ));
            }
            "expected_payment_date"
        }
        "expense-record" => {
            if status != "confirmed" {
                return Err(Error::Conflict(
                    "Confirmed expense evidence is required".into(),
                ));
            }
            "expense_date"
        }
        "invoice-record" => {
            if status != "verified"
                || row["invoice_type"] != "input"
                || !matches!(row["exception_status"].as_str(), Some("none" | "resolved"))
                || row["currency_source"].is_null()
            {
                return Err(Error::Conflict(
                    "Verified input invoice currency evidence is required".into(),
                ));
            }
            "invoice_date"
        }
        _ => return Err(Error::Internal),
    };
    let source_date = business_date(store::text(&row, date_field)?)?;
    if supplied_date != source_date {
        return Err(Error::Unprocessable(
            "Evidence date does not match the real source".into(),
        ));
    }
    let ccy = store::optional_text(
        &row,
        if source == "invoice-record" {
            "currency_code"
        } else {
            "currency"
        },
    );
    if let Some(ref ccy) = ccy {
        currency(ccy)?;
    }
    if source == "invoice-record" {
        let proven = ccy
            .as_deref()
            .ok_or_else(|| Error::Unprocessable("Invoice currency proof is unavailable".into()))?;
        match row["currency_source"].as_str() {
            Some("explicit") if row["currency_source_snapshot_id"].is_null() => {}
            Some("contract-snapshot") => {
                let snapshot = store::id(&row, "currency_source_snapshot_id")?;
                let contract = store::id(&row, "contract_id")?;
                let actual:Option<String>=sqlx::query_scalar("SELECT p.currency_code FROM poms.contract_term_snapshot s JOIN poms.contract_term_preparation p ON p.id=s.source_preparation_id AND p.contract_id=s.contract_id WHERE s.id=$1 AND s.contract_id=$2").bind(snapshot).bind(contract).fetch_optional(&mut *session.connection).await?;
                if actual.as_deref() != Some(proven) {
                    return Err(Error::Conflict(
                        "Invoice currency snapshot proof does not match".into(),
                    ));
                }
            }
            _ => {
                return Err(Error::Unprocessable(
                    "Invoice currency provenance is unproven".into(),
                ));
            }
        }
    }
    Ok(Reference {
        snapshot: json!({"reference":input,"source":row}),
        labor: false,
        date: source_date,
        stage: stage.map(str::to_owned),
        currency: ccy,
    })
}

pub(super) struct Write<'a> {
    pub target: &'a str,
    pub target_id: Uuid,
    pub project: Option<Uuid>,
    pub kind: &'a str,
    pub business_date: &'a str,
    pub refs: &'a Value,
    pub payload: &'a Value,
    pub reason: &'a str,
}
pub(super) async fn persist(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    input: Write<'_>,
) -> Result<Uuid, Error> {
    let Write {
        target,
        target_id,
        project,
        kind,
        business_date,
        refs,
        payload,
        reason,
    } = input;
    if reason.trim().is_empty() {
        return Err(Error::Unprocessable(
            "Governance evidence requires a nonempty reason".into(),
        ));
    }
    let id = contract_support::new_uuid()?;
    let hash = contract_support::canonical_hash(payload)?;
    store::insert(session,Table::Evidence,&json!({"id":id,"target_type":target,"target_id":target_id,"project_id":project,"evidence_kind":kind,"business_date":business_date,"source_references":refs,"frozen_payload":payload,"payload_hash":hash,"reason":reason,"actor_id":actor.id,"request_id":actor.request_id,"schema_version":1,"created_at":store::now()})).await?;
    Ok(id)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hk_midnight_uses_source_instant_not_host_or_utc_slice() {
        assert_eq!(business_date("2026-11-03T16:00:00Z").unwrap(), "2026-11-04");
        assert_eq!(business_date("2026-11-03T15:59:59Z").unwrap(), "2026-11-03");
        assert_eq!(business_date("2026-11-03").unwrap(), "2026-11-03");
    }
    #[test]
    fn invalid_calendar_dates_are_not_accepted_as_evidence() {
        assert!(date("2026-02-29").is_err());
        assert!(date("2026-11-31").is_err());
        assert!(date("2026-1-01").is_err());
    }
    fn payable() -> (Value, Value) {
        let source = json!({"id":"10000000-0000-4000-8000-000000000001","project_id":"20000000-0000-4000-8000-000000000001","row_version":1,"status":"recorded","currency":"CNY","amount_excluding_tax":"100.00","tax_amount":"6.00","amount_including_tax":"106.00","expected_payment_date":"2026-11-04","confirmed_payment_amount_excluding_tax_total":"0.00"});
        let cost = json!({"id":"30000000-0000-4000-8000-000000000001","source_type":"payable-record","source_id":source["id"],"row_version":1,"source_basis":{"sourceRowVersion":1,"sourcePayload":source}});
        (cost, source)
    }
    fn facts(source: &Value) -> Value {
        json!({"sourceRowVersion":source["row_version"],"sourceType":"payable-record","sourceId":source["id"],"sourcePayload":source})
    }
    #[test]
    fn successive_certified_progress_preserves_original_basis_and_each_anchor() {
        let (cost, mut source) = payable();
        let original = cost.clone();
        source["row_version"] = json!(2);
        source["status"] = json!("partially-paid");
        source["confirmed_payment_amount_excluding_tax_total"] = json!("20.00");
        let first = version_proof(&cost, &facts(&source), None).unwrap();
        source["row_version"] = json!(3);
        source["confirmed_payment_amount_excluding_tax_total"] = json!("50.00");
        let second = version_proof(&cost, &facts(&source), Some(&first)).unwrap();
        source["row_version"] = json!(4);
        source["status"] = json!("completed");
        source["confirmed_payment_amount_excluding_tax_total"] = json!("100.00");
        let third = version_proof(&cost, &facts(&source), Some(&second)).unwrap();
        assert_eq!(first["capturedVersion"], 1);
        assert_eq!(first["previousCertifiedVersion"], 1);
        assert_eq!(first["currentVersion"], 2);
        assert_eq!(second["capturedVersion"], 1);
        assert_eq!(second["previousCertifiedVersion"], 2);
        assert_eq!(second["currentVersion"], 3);
        assert_eq!(second["reason"], "payable-payment-progress-only");
        assert_eq!(third["capturedVersion"], 1);
        assert_eq!(third["previousCertifiedVersion"], 3);
        assert_eq!(third["currentVersion"], 4);
        assert_eq!(third["sourcePayload"]["status"], "completed");
        assert_eq!(
            second["sourcePayload"]["confirmed_payment_amount_excluding_tax_total"],
            "50.00"
        );
        assert_eq!(cost, original);
        assert!(
            crate::contract_support::expected_version(
                &json!({"expectedVersion":2}),
                1,
                "ProjectActualCostRecord"
            )
            .is_err()
        );
    }
    #[test]
    fn a_prior_benign_proof_does_not_authorize_material_or_opaque_later_changes() {
        let (cost, mut source) = payable();
        source["row_version"] = json!(2);
        source["status"] = json!("partially-paid");
        source["confirmed_payment_amount_excluding_tax_total"] = json!("20.00");
        let first = version_proof(&cost, &facts(&source), None).unwrap();
        source["row_version"] = json!(3);
        source["status"] = json!("completed");
        source["confirmed_payment_amount_excluding_tax_total"] = json!("100.00");
        source["amount_excluding_tax"] = json!("101.00");
        assert!(version_proof(&cost, &facts(&source), Some(&first)).is_err());
        source["amount_excluding_tax"] = json!("100.00");
        let mut corrupt = first.clone();
        corrupt["sourcePayload"]["row_version"] = json!(1);
        assert!(version_proof(&cost, &facts(&source), Some(&corrupt)).is_err());
        source["row_version"] = json!(2);
        source["status"] = json!("recorded");
        source["confirmed_payment_amount_excluding_tax_total"] = json!("0.00");
        assert!(version_proof(&cost, &facts(&source), None).is_err());
    }
    #[test]
    fn certified_payment_progress_needs_real_total_increase_and_canonical_status() {
        let (cost, mut source) = payable();
        source["row_version"] = json!(2);
        source["status"] = json!("partially-paid");
        source["confirmed_payment_amount_excluding_tax_total"] = json!("20.00");
        let first = version_proof(&cost, &facts(&source), None).unwrap();
        source["row_version"] = json!(3);
        assert!(version_proof(&cost, &facts(&source), Some(&first)).is_err());
        source["row_version"] = json!(2);
        source["confirmed_payment_amount_excluding_tax_total"] = json!("50.00");
        assert!(version_proof(&cost, &facts(&source), Some(&first)).is_err());
        source["row_version"] = json!(3);
        source["confirmed_payment_amount_excluding_tax_total"] = json!("100.00");
        source["status"] = json!("paid");
        assert!(version_proof(&cost, &facts(&source), Some(&first)).is_err());
        source["status"] = json!("completed");
        assert!(version_proof(&cost, &facts(&source), Some(&first)).is_ok());
        let mut unknown_capture = cost.clone();
        unknown_capture["source_basis"]["sourcePayload"]
            .as_object_mut()
            .unwrap()
            .remove("confirmed_payment_amount_excluding_tax_total");
        assert!(version_proof(&unknown_capture, &facts(&source), None).is_err());
    }
    #[test]
    fn exact_large_source_layers_survive_immutable_payload_hash_replay() {
        let source: Value = serde_json::from_str(
            r#"{"amountExcludingTax":"9999999999999999.97","taxCostAmount":"0.02","amountIncludingTax":"9999999999999999.99"}"#,
        )
        .unwrap();
        let names = ["amountExcludingTax", "taxCostAmount", "amountIncludingTax"];
        assert_eq!(
            layers(&source, names).unwrap(),
            [Some(logic::MAX_MONEY - 2), Some(2), Some(logic::MAX_MONEY)]
        );
        let hash = contract_support::canonical_hash(&source).unwrap();
        let replay: Value = serde_json::from_slice(&serde_json::to_vec(&source).unwrap()).unwrap();
        assert_eq!(replay["amountExcludingTax"], "9999999999999999.97");
        assert_eq!(contract_support::canonical_hash(&replay).unwrap(), hash);
        let numeric: Value = serde_json::from_str(
            r#"{"amountExcludingTax":9999999999999999.97,"taxCostAmount":"0.02","amountIncludingTax":"9999999999999999.99"}"#,
        )
        .unwrap();
        assert!(layers(&numeric, names).is_err());
    }
    #[test]
    fn pure_rate_comparison_rejects_lost_period_coverage() {
        let before = json!({"id":"10000000-0000-4000-8000-000000000001","row_version":1,"status":"active","is_current":true,"effective_to":null,"rate_value":"100.0000"});
        let mut after = before.clone();
        after["row_version"] = json!(2);
        after["status"] = json!("superseded");
        after["is_current"] = json!(false);
        after["effective_to"] = json!("2026-11-09");
        let cost =
            json!({"source_type":"labor","source_id":before["id"],"labor_period_end":"2026-11-10"});
        assert!(
            crate::project_actual_cost::compare_source_transition(&cost, &before, &after).is_err()
        );
    }
}
