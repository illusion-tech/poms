use std::collections::BTreeSet;

use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    source, store,
    terms::{self, Terms, id, optional_text, text, uuid},
    view,
};
use crate::{
    approval_common::CommonSession,
    contract_support::{
        self, Actor, AuditWrite, Error, canonical_hash, contract_fact, lock_project, money,
        money_string, new_uuid, ratio, ratio_string,
    },
};

const PREFIX: &str = "ContractReadinessController_";

pub async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation_id: &str,
    key: Option<Uuid>,
    query: &Value,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    if !session.connection.is_in_transaction() {
        return Err(Error::Internal);
    }
    let operation = operation_id.strip_prefix(PREFIX).ok_or(Error::Internal)?;
    let (result, projection) = match operation {
        "createCommercialReleaseBaseline" => {
            let row = create_baseline(session, body, actor, operation_id).await?;
            let key = id(&row, "id")?;
            (
                view::baseline(session, &row).await?,
                Some(("CommercialReleaseBaseline", key)),
            )
        }
        "getCommercialReleaseBaseline" => {
            let key = required_key(key)?;
            let row = store::baseline(session.connection, key, false).await?;
            (
                view::baseline(session, &row).await?,
                Some(("CommercialReleaseBaseline", key)),
            )
        }
        "getDiffHistory" => {
            let key = required_key(key)?;
            (
                history(session, key, query).await?,
                Some(("CommercialReleaseBaseline", key)),
            )
        }
        "reviewDiff" => (
            review(session, required_key(key)?, body, actor, operation_id).await?,
            None,
        ),
        "createContractReadinessPackage" => {
            let row = create_package(session, body, actor, operation_id).await?;
            let key = id(&row, "id")?;
            (
                view::package(session, &row).await?,
                Some(("ContractReadinessPackage", key)),
            )
        }
        "getContractReadinessPackage" => {
            let key = required_key(key)?;
            let row = store::package(session.connection, key, false).await?;
            (
                view::package(session, &row).await?,
                Some(("ContractReadinessPackage", key)),
            )
        }
        "getCurrentContractReadiness" => {
            let project = required_key(key)?;
            let row = current_package(session, project, query).await?;
            let key = id(&row, "id")?;
            (
                view::package(session, &row).await?,
                Some(("ContractReadinessPackage", key)),
            )
        }
        "initializeContractSnapshot" => (
            prepare(session, required_key(key)?, body, actor, operation_id).await?,
            None,
        ),
        "initializeReceivablePlan" => (
            initialize_plan(session, required_key(key)?, body, actor, operation_id).await?,
            None,
        ),
        _ => return Err(Error::Internal),
    };
    if let Some((kind, key)) = projection {
        view::project(session, result, actor, kind, key).await
    } else {
        Ok(result)
    }
}
fn required_key(key: Option<Uuid>) -> Result<Uuid, Error> {
    key.ok_or_else(|| Error::BadRequest("Missing resource UUID".into()))
}
fn assert_package(key: Uuid, body: &Value) -> Result<(), Error> {
    if let Some(value) = body
        .get("contractReadinessPackageId")
        .filter(|v| !v.is_null())
        && uuid(
            value
                .as_str()
                .ok_or_else(|| Error::BadRequest("Invalid package UUID".into()))?,
        )? != key
    {
        return Err(Error::BadRequest(
            "Body readiness package must match the path".into(),
        ));
    }
    Ok(())
}
fn same_scope(row: &Value, project: Uuid, contract: Uuid) -> Result<(), Error> {
    if id(row, "project_id")? != project || id(row, "contract_id")? != contract {
        return Err(Error::NotFound(
            "Resource not found for this contract".into(),
        ));
    }
    Ok(())
}
fn validate_diff(d: &Value, project: Uuid, contract: Uuid, baseline: Uuid) -> Result<(), Error> {
    let expected = canonical_hash(
        &json!({"projectId":project,"contractId":contract,"baselineId":baseline,"referenceTerms":d["reference_terms"],"candidateTerms":d["candidate_terms"]}),
    )?;
    if d["payload_hash"] != expected {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Immutable contract diff payload changed".into(),
        });
    }
    Ok(())
}
#[allow(clippy::too_many_arguments)]
async fn audit(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    op: &str,
    kind: &str,
    after: &Value,
    before: Option<&Value>,
    project: Uuid,
    contract: Option<Uuid>,
    reason: Option<String>,
) -> Result<(), Error> {
    contract_support::audit(session,actor,AuditWrite{
        operation_id:op.into(),target_type:kind.into(),target_id:id(after,"id")?,project_id:project,contract_id:contract,
        before:before.map(view::audit_snapshot),after:Some(view::audit_snapshot(after)),reason,
        metadata:json!({"requiredSensitivePackages":["contract-finance"],"sourceIds":{"readinessId":after["source_readiness_id"],"baselineId":after["source_baseline_id"],"diffResultId":after["source_diff_result_id"],"preparationId":after["source_preparation_id"]},"payloadHash":after["payload_hash"]}),
    }).await
}
fn optional_money(body: &Value, key: &str) -> Result<Option<String>, Error> {
    optional_text(body, key)
        .map(|v| money(&v).map(money_string))
        .transpose()
}
fn optional_ratio(body: &Value, key: &str) -> Result<Option<String>, Error> {
    optional_text(body, key)
        .map(|v| ratio(&v).map(ratio_string))
        .transpose()
}

async fn create_baseline(
    session: &mut CommonSession<'_, '_>,
    body: &Value,
    actor: &Actor,
    op: &str,
) -> Result<Value, Error> {
    let project = id(body, "projectId")?;
    lock_project(session.connection, project).await?;
    let input = body["contractTerms"]
        .as_array()
        .filter(|a| !a.is_empty())
        .ok_or_else(|| {
            Error::BadRequest("contractTerms requires explicit contract references".into())
        })?;
    let mut all = Vec::new();
    let mut ids = BTreeSet::new();
    for value in input {
        let terms = Terms::parse(value)?;
        if !ids.insert(terms.contract_id) {
            return Err(Error::BadRequest(
                "Duplicate contractId in reference terms".into(),
            ));
        }
        all.push(terms);
    }
    all.sort_by_key(|terms| terms.contract_id);
    let mut currency = None::<String>;
    for terms in &all {
        let fact = contract_fact(session.connection, terms.contract_id, Some(project), true)
            .await?
            .ok_or_else(|| Error::NotFound("Draft contract not found in project".into()))?;
        if !matches!(fact.status.as_str(), "draft" | "active") {
            return Err(Error::BadRequest(
                "Reference terms require a draft or active contract".into(),
            ));
        }
        if fact.status == "active" {
            let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.contract_term_snapshot WHERE id=$1 AND contract_id=$2 AND snapshot_status='active')")
                .bind(fact.current_snapshot_id).bind(fact.id).fetch_one(&mut *session.connection).await?;
            if !valid {
                return Err(Error::Conflict(
                    "Active参考合同缺少真实当前生效快照。".into(),
                ));
            }
        }
        if currency.as_ref().is_some_and(|v| *v != fact.currency_code) {
            return Err(Error::BadRequest(
                "Commercial reference contracts must share source currency".into(),
            ));
        }
        currency = Some(fact.currency_code);
    }
    let quotation = optional_text(body, "quotationReviewId")
        .as_deref()
        .map(uuid)
        .transpose()?;
    if let Some(quotation) = quotation {
        let found:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_pricing_margin_review WHERE id=$1 AND project_id=$2)")
            .bind(quotation).bind(project).fetch_one(&mut *session.connection).await?;
        if !found {
            return Err(Error::NotFound(
                "Real project pricing review not found".into(),
            ));
        }
    }
    let code = text(body, "baselineCode")?.trim();
    if code.is_empty() || code.encode_utf16().count() > 64 {
        return Err(Error::BadRequest("Invalid baselineCode".into()));
    }
    let duplicate:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commercial_release_baseline WHERE project_id=$1 AND baseline_code=$2)")
        .bind(project).bind(code).fetch_one(&mut *session.connection).await?;
    if duplicate {
        return Err(Error::Conflict(
            "Commercial baseline code already exists".into(),
        ));
    }
    let inclusive = optional_money(body, "amountTaxInclusive")?;
    let exclusive = optional_money(body, "amountTaxExclusive")?;
    if let (Some(a), Some(b)) = (&inclusive, &exclusive)
        && money(b)? > money(a)?
    {
        return Err(Error::BadRequest(
            "Project exclusive source amount exceeds inclusive amount".into(),
        ));
    }
    let tax = optional_ratio(body, "taxRate")?;
    let down = optional_ratio(body, "downPaymentRate")?;
    let retention = optional_ratio(body, "retentionRate")?;
    sqlx::query("UPDATE poms.commercial_release_baseline SET is_current=false,baseline_status='superseded',updated_by=$2,updated_at=now(),row_version=row_version+1 WHERE project_id=$1 AND is_current")
        .bind(project).bind(actor.id).execute(&mut *session.connection).await?;
    let key = new_uuid()?;
    let refs = serde_json::to_value(&all).map_err(|_| Error::Internal)?;
    sqlx::query("INSERT INTO poms.commercial_release_baseline(id,project_id,baseline_code,quotation_review_id,baseline_status,is_current,gross_margin_summary,payment_terms_summary,amount_tax_inclusive,amount_tax_exclusive,tax_rate,down_payment_rate,retention_rate,payment_terms,latest_diff_result_id,created_by,updated_by,contract_terms,currency_code) VALUES($1,$2,$3,$4,'draft',true,$5,$6,$7::text::numeric,$8::text::numeric,$9::text::numeric,$10::text::numeric,$11::text::numeric,$12,NULL,$13,$13,$14,$15)")
        .bind(key).bind(project).bind(code).bind(quotation).bind(optional_text(body,"grossMarginSummary")).bind(optional_text(body,"paymentTermsSummary"))
        .bind(inclusive).bind(exclusive).bind(tax).bind(down).bind(retention).bind(optional_text(body,"paymentTerms")).bind(actor.id).bind(refs).bind(currency.ok_or(Error::Internal)?)
        .execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("commercial_release_baseline", &key.to_string());
    let row = store::baseline(session.connection, key, false).await?;
    audit(
        session,
        actor,
        op,
        "CommercialReleaseBaseline",
        &row,
        None,
        project,
        None,
        None,
    )
    .await?;
    Ok(row)
}

async fn current_package(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    query: &Value,
) -> Result<Value, Error> {
    let contract = optional_text(query, "contractId")
        .as_deref()
        .map(uuid)
        .transpose()?;
    let ids:Vec<Uuid>=sqlx::query_scalar("SELECT DISTINCT contract_id FROM poms.contract_readiness_package WHERE project_id=$1 AND is_current AND contract_id IS NOT NULL ORDER BY contract_id")
        .bind(project).fetch_all(&mut *session.connection).await?;
    let selected = select_contract(session, project, contract, ids).await?;
    let row:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.contract_readiness_package p WHERE project_id=$1 AND contract_id=$2 AND is_current")
        .bind(project).bind(selected).fetch_optional(&mut *session.connection).await?;
    row.ok_or_else(|| Error::NotFound("No current readiness for the selected contract".into()))
}
async fn select_contract(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    explicit: Option<Uuid>,
    ids: Vec<Uuid>,
) -> Result<Uuid, Error> {
    if let Some(contract) = explicit {
        contract_fact(session.connection, contract, Some(project), false)
            .await?
            .ok_or_else(|| Error::NotFound("Contract not found in project".into()))?;
        return Ok(contract);
    }
    match ids.as_slice() {
        [] => Err(Error::NotFound(
            "No contract-specific readiness or diff found".into(),
        )),
        [one] => Ok(*one),
        _ => Err(Error::Selection { ids }),
    }
}
async fn history(
    session: &mut CommonSession<'_, '_>,
    baseline_id: Uuid,
    query: &Value,
) -> Result<Value, Error> {
    let baseline = store::baseline(session.connection, baseline_id, false).await?;
    let project = id(&baseline, "project_id")?;
    let contracts:Vec<Uuid>=sqlx::query_scalar("SELECT DISTINCT contract_id FROM poms.commercial_baseline_diff_result WHERE baseline_id=$1 AND contract_id IS NOT NULL ORDER BY contract_id")
        .bind(baseline_id).fetch_all(&mut *session.connection).await?;
    let explicit = optional_text(query, "contractId")
        .as_deref()
        .map(uuid)
        .transpose()?;
    let contract = select_contract(session, project, explicit, contracts).await?;
    let diff:Value=sqlx::query_scalar("SELECT to_jsonb(d) FROM poms.commercial_baseline_diff_result d WHERE baseline_id=$1 AND contract_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1")
        .bind(baseline_id).bind(contract).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::NotFound("Contract diff history not found".into()))?;
    let items:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('id',id,'fieldKey',field_key,'fieldLabel',field_label,'oldValueSummary',old_value_summary,'newValueSummary',new_value_summary,'diffLevel',diff_level,'isBlocking',is_blocking,'sortOrder',sort_order) FROM poms.commercial_baseline_diff_item WHERE diff_result_id=$1 ORDER BY sort_order,id")
        .bind(id(&diff,"id")?).fetch_all(&mut *session.connection).await?;
    let reviews:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(r)||jsonb_build_object('attachment_ids',COALESCE((SELECT jsonb_agg(a.attachment_id ORDER BY a.attachment_id) FROM poms.commercial_baseline_review_attachment a WHERE a.review_record_id=r.id),'[]'::jsonb)) FROM poms.commercial_baseline_review_record r JOIN poms.commercial_baseline_diff_result d ON d.id=r.diff_result_id WHERE r.baseline_id=$1 AND d.contract_id=$2 ORDER BY r.created_at,r.id")
        .bind(baseline_id).bind(contract).fetch_all(&mut *session.connection).await?;
    let reviews:Vec<Value>=reviews.into_iter().map(|r|json!({"id":r["id"],"baselineId":r["baseline_id"],"diffResultId":r["diff_result_id"],"projectId":r["project_id"],"decision":r["decision"],"reviewedFieldKeys":r["reviewed_field_keys"],"comment":r["comment"],"reviewerUserId":r["reviewer_user_id"],"createdAt":store::iso(&r["created_at"]),"attachmentIds":r["attachment_ids"]})).collect();
    let mut baseline_view = view::baseline(session, &baseline).await?;
    baseline_view["latestDiffResultId"] = diff["id"].clone();
    baseline_view["diffLevel"] = diff["diff_level"].clone();
    baseline_view["reviewStatus"] = diff["review_status"].clone();
    baseline_view["diffSummary"] = diff["diff_summary"].clone();
    Ok(json!({"baseline":baseline_view,"diffItems":items,"reviewHistory":reviews}))
}

async fn create_package(
    session: &mut CommonSession<'_, '_>,
    body: &Value,
    actor: &Actor,
    op: &str,
) -> Result<Value, Error> {
    let project = id(body, "projectId")?;
    let contract = id(body, "contractId")?;
    let baseline_id = id(body, "sourceBaselineId")?;
    lock_project(session.connection, project).await?;
    let fact = contract_fact(session.connection, contract, Some(project), true)
        .await?
        .ok_or_else(|| Error::NotFound("Contract not found in project".into()))?;
    let amendment_input = body.get("amendment").filter(|v| !v.is_null());
    if (fact.status == "active") != amendment_input.is_some()
        || !matches!(fact.status.as_str(), "draft" | "active")
    {
        return Err(Error::BadRequest(
            "Readiness requires a draft contract".into(),
        ));
    }
    let baseline = store::baseline(session.connection, baseline_id, true).await?;
    if id(&baseline, "project_id")? != project {
        return Err(Error::NotFound(
            "Commercial baseline not found in project".into(),
        ));
    }
    let candidate = Terms::parse(&body["candidateTerms"])?;
    if candidate.contract_id != contract {
        return Err(Error::BadRequest(
            "candidateTerms.contractId must match contractId".into(),
        ));
    }
    if fact.status == "draft"
        && money(&candidate.amount_tax_inclusive)? != money(&fact.signed_amount)?
    {
        return Err(Error::BadRequest(
            "Candidate inclusive amount must equal the actual draft contract signedAmount".into(),
        ));
    }
    let reference = Terms::parse(&store::reference(&baseline, contract)?)?;
    let candidate_value = candidate.value()?;
    let reference_value = reference.value()?;
    let sources =
        source::collect(session.connection, &baseline, contract, &fact.currency_code).await?;
    let differences = terms::diff(&reference, &candidate)?;
    let level = terms::overall(&differences);
    let review_status = if level == "prompt" {
        "not-required"
    } else {
        "pending-review"
    };
    let mut blockers = sources.blockers.clone();
    if level == "reapproval-required" {
        blockers.push("合同条款偏离独立参考条款，必须建立新商业基线并重新放行。".into());
    } else if level == "review-required" {
        blockers.push("合同差异仍需精确字段复核。".into());
    }
    let (status, guard) = package_state(&sources.blockers, level, review_status);
    let diff_id = new_uuid()?;
    let key = new_uuid()?;
    let diff_hash = canonical_hash(
        &json!({"projectId":project,"contractId":contract,"baselineId":baseline_id,"referenceTerms":reference_value,"candidateTerms":candidate_value}),
    )?;
    let payload_hash = canonical_hash(
        &json!({"projectId":project,"contractId":contract,"candidateTerms":candidate_value,"sourceFacts":sources.facts,"diffResultId":diff_id,"diffPayloadHash":diff_hash}),
    )?;
    sqlx::query("INSERT INTO poms.commercial_baseline_diff_result(id,baseline_id,project_id,diff_level,review_status,diff_summary,contract_id,reference_terms,candidate_terms,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)")
        .bind(diff_id).bind(baseline_id).bind(project).bind(level).bind(review_status).bind(if differences.is_empty(){"合同条款与本合同参考条款一致。"}else{"合同条款差异已按同合同来源计算。"})
        .bind(contract).bind(&reference_value).bind(&candidate_value).bind(&diff_hash).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("commercial_baseline_diff_result", &diff_id.to_string());
    for (index, item) in differences.iter().enumerate() {
        let item_id = new_uuid()?;
        let mapped = item.value(item_id, index);
        sqlx::query("INSERT INTO poms.commercial_baseline_diff_item(id,diff_result_id,field_key,field_label,old_value_summary,new_value_summary,diff_level,is_blocking,sort_order) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8)")
            .bind(item_id).bind(diff_id).bind(&item.key).bind(mapped["oldValueSummary"].as_str()).bind(mapped["newValueSummary"].as_str()).bind(item.level).bind(item.level=="reapproval-required").bind(index as i32)
            .execute(&mut *session.connection).await?;
        session
            .state
            .trace
            .inserted("commercial_baseline_diff_item", &item_id.to_string());
    }
    sqlx::query("UPDATE poms.contract_readiness_package SET is_current=false,updated_by=$3,updated_at=now(),row_version=row_version+1 WHERE project_id=$1 AND contract_id=$2 AND is_current")
        .bind(project).bind(contract).bind(actor.id).execute(&mut *session.connection).await?;
    sqlx::query("INSERT INTO poms.contract_readiness_package(id,project_id,contract_id,source_baseline_id,latest_diff_result_id,package_status,guard_decision,current_effective_decision_summary,blocking_reason_summary,missing_prerequisite_count,candidate_terms,source_facts,payload_hash,source_cost_package_id,source_bid_process_id,source_pricing_review_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)")
        .bind(key).bind(project).bind(contract).bind(baseline_id).bind(diff_id).bind(status).bind(guard)
        .bind(if guard=="allowed"{"真实前置来源与本合同条款已满足准备条件。"}else{"签约前置来源或本合同差异尚未收口。"})
        .bind((!blockers.is_empty()).then(||blockers.join(" "))).bind(blockers.len() as i32).bind(&candidate_value).bind(&sources.facts).bind(&payload_hash)
        .bind(sources.cost).bind(sources.bid).bind(sources.pricing).bind(actor.id).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("contract_readiness_package", &key.to_string());
    for (index, (item_key, label, ready)) in [
        (
            "actual-cost-source",
            "真实技术与成本来源",
            sources.cost.is_some(),
        ),
        (
            "actual-pricing-source",
            "真实报价放行来源",
            sources.pricing.is_some() && sources.blockers.is_empty(),
        ),
        ("exact-contract-diff", "本合同精确差异", level == "prompt"),
    ]
    .into_iter()
    .enumerate()
    {
        let item_id = new_uuid()?;
        sqlx::query("INSERT INTO poms.contract_readiness_package_item(id,package_id,item_type,item_key,label,summary,status,sort_order) VALUES($1,$2,'checklist',$3,$4,NULL,$5,$6)")
            .bind(item_id).bind(key).bind(item_key).bind(label).bind(if ready{"ready"}else{"blocked"}).bind(index as i32).execute(&mut *session.connection).await?;
        session
            .state
            .trace
            .inserted("contract_readiness_package_item", &item_id.to_string());
    }
    let changed=sqlx::query("UPDATE poms.commercial_release_baseline SET latest_diff_result_id=$2,baseline_status=CASE WHEN $3 THEN 'effective' ELSE baseline_status END,updated_by=$4,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND row_version=$5")
        .bind(baseline_id).bind(diff_id).bind(sources.blockers.is_empty()).bind(actor.id).bind(store::rv(&baseline)?).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict("Commercial baseline changed".into()));
    }
    if let Some(input) = amendment_input {
        crate::contracts::prepare_amendment_readiness(
            session, project, contract, key, input, actor,
        )
        .await?;
    }
    let row = store::package(session.connection, key, false).await?;
    audit(
        session,
        actor,
        op,
        "ContractReadinessPackage",
        &row,
        None,
        project,
        Some(contract),
        None,
    )
    .await?;
    Ok(row)
}

fn package_state(
    source_blockers: &[String],
    level: &str,
    review_status: &str,
) -> (&'static str, &'static str) {
    if !source_blockers.is_empty() || level == "reapproval-required" || review_status == "rejected"
    {
        ("blocked", "blocked")
    } else if level == "review-required" && review_status != "approved" {
        ("conditional", "review-required")
    } else {
        ("ready", "allowed")
    }
}

async fn review(
    session: &mut CommonSession<'_, '_>,
    baseline_id: Uuid,
    body: &Value,
    actor: &Actor,
    op: &str,
) -> Result<Value, Error> {
    let discovered = store::baseline(session.connection, baseline_id, false).await?;
    let project = id(&discovered, "project_id")?;
    let contract = id(body, "contractId")?;
    let diff_id = id(body, "diffResultId")?;
    lock_project(session.connection, project).await?;
    let fact = contract_fact(session.connection, contract, Some(project), true)
        .await?
        .ok_or_else(|| Error::NotFound("Contract not found in project".into()))?;
    let baseline = store::baseline(session.connection, baseline_id, true).await?;
    store::expected(&baseline, body)?;
    let d = store::diff(session.connection, diff_id, true).await?;
    same_scope(&d, project, contract)?;
    if id(&d, "baseline_id")? != baseline_id {
        return Err(Error::NotFound(
            "Diff does not belong to this baseline".into(),
        ));
    }
    validate_diff(&d, project, contract, baseline_id)?;
    let package:Value=sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.contract_readiness_package p WHERE latest_diff_result_id=$1 AND contract_id=$2 AND is_current FOR UPDATE")
        .bind(diff_id).bind(contract).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Conflict("Diff no longer belongs to the current readiness package".into()))?;
    if d["review_status"] != "pending-review" || d["diff_level"] == "prompt" {
        return Err(Error::BadRequest(
            "Only a pending required diff may be reviewed".into(),
        ));
    }
    let decision = text(body, "diffDecision")?;
    if !matches!(decision, "approved" | "rejected") {
        return Err(Error::BadRequest("Invalid diff decision".into()));
    }
    if d["diff_level"] == "reapproval-required" && decision == "approved" {
        return Err(Error::BadRequest(
            "These differences require a new commercial baseline".into(),
        ));
    }
    let reviewed: BTreeSet<String> = body
        .get("reviewedFieldKeys")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::to_owned)
        .collect();
    let required:Vec<String>=sqlx::query_scalar("SELECT field_key FROM poms.commercial_baseline_diff_item WHERE diff_result_id=$1 AND diff_level='review-required' ORDER BY sort_order,id")
        .bind(diff_id).fetch_all(&mut *session.connection).await?;
    if required.iter().any(|key| !reviewed.contains(key)) {
        return Err(Error::BadRequest(
            "reviewedFieldKeys must cover every required review field".into(),
        ));
    }
    let sources =
        source::collect(session.connection, &baseline, contract, &fact.currency_code).await?;
    if decision == "approved"
        && (!sources.blockers.is_empty() || sources.facts != package["source_facts"])
    {
        return Err(Error::CodedConflict {
            code: "source_changed",
            message: "Readiness sources changed before review".into(),
        });
    }
    let attachments = source::authorize_attachments(
        session.connection,
        project,
        contract,
        &body["attachmentIds"],
        actor,
    )
    .await?;
    let record = new_uuid()?;
    let reviewed: Vec<String> = reviewed.into_iter().collect();
    sqlx::query("INSERT INTO poms.commercial_baseline_review_record(id,baseline_id,diff_result_id,project_id,decision,reviewed_field_keys,comment,reviewer_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)")
        .bind(record).bind(baseline_id).bind(diff_id).bind(project).bind(decision).bind(json!(reviewed)).bind(optional_text(body,"comment")).bind(actor.id).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("commercial_baseline_review_record", &record.to_string());
    for attachment in attachments {
        sqlx::query("INSERT INTO poms.commercial_baseline_review_attachment(review_record_id,attachment_id) VALUES($1,$2)")
            .bind(record).bind(attachment).execute(&mut *session.connection).await?;
    }
    let changed=sqlx::query("UPDATE poms.commercial_baseline_diff_result SET review_status=$2,current_review_decision=$2,reviewed_at=now() WHERE id=$1 AND review_status='pending-review'")
        .bind(diff_id).bind(decision).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict("Diff decision changed".into()));
    }
    let (status, guard) = package_state(&sources.blockers, text(&d, "diff_level")?, decision);
    let mut blockers = sources.blockers;
    if decision == "rejected" {
        blockers.push("合同差异复核已拒绝。".into());
    }
    let changed=sqlx::query("UPDATE poms.contract_readiness_package SET package_status=$2,guard_decision=$3,missing_prerequisite_count=$4,blocking_reason_summary=$5,current_effective_decision_summary=$6,updated_by=$7,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND row_version=$8")
        .bind(id(&package,"id")?).bind(status).bind(guard).bind(blockers.len() as i32).bind((!blockers.is_empty()).then(||blockers.join(" ")))
        .bind(if guard=="allowed"{"本合同差异已通过复核，真实前置条件已收口。"}else{"本合同差异或前置来源未通过。"}).bind(actor.id).bind(store::rv(&package)?).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict("Readiness package changed".into()));
    }
    sqlx::query("UPDATE poms.contract_readiness_package_item SET status=$2 WHERE package_id=$1 AND item_key='exact-contract-diff'")
        .bind(id(&package,"id")?).bind(if guard=="allowed"{"ready"}else{"blocked"}).execute(&mut *session.connection).await?;
    let changed=sqlx::query("UPDATE poms.commercial_release_baseline SET updated_by=$2,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND row_version=$3")
        .bind(baseline_id).bind(actor.id).bind(store::rv(&baseline)?).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict("Commercial baseline changed".into()));
    }
    let mut after = store::baseline(session.connection, baseline_id, false).await?;
    after["source_diff_result_id"] = json!(diff_id);
    after["contract_id"] = json!(contract);
    audit(
        session,
        actor,
        op,
        "CommercialReleaseBaseline",
        &after,
        Some(&baseline),
        project,
        Some(contract),
        optional_text(body, "comment"),
    )
    .await?;
    Ok(
        json!({"targetId":baseline_id,"diffResultId":diff_id,"baselineReviewDecision":decision,"resultStatus":"reviewed"}),
    )
}

fn preparation_result(p: &Value) -> Value {
    json!({"targetId":p["id"],"targetType":"contract-term-preparation","sourceReadinessId":p["source_readiness_id"],"contractId":p["contract_id"],
        "resultStatus":"prepared","businessStatusAfter":"prepared","preparationId":p["id"],"preparationVersion":p["version"],
        "snapshotId":null,"newVersionId":null,"planVersionId":null,"planVersion":null,"initRecordId":null,"contractAmendmentId":p["contract_amendment_id"]})
}
async fn prepare(
    session: &mut CommonSession<'_, '_>,
    package_id: Uuid,
    body: &Value,
    actor: &Actor,
    op: &str,
) -> Result<Value, Error> {
    assert_package(package_id, body)?;
    let contract = id(body, "contractId")?;
    let discovered = store::package(session.connection, package_id, false).await?;
    let project = id(&discovered, "project_id")?;
    lock_project(session.connection, project).await?;
    let fact = contract_fact(session.connection, contract, Some(project), true)
        .await?
        .ok_or_else(|| Error::NotFound("Contract not found in project".into()))?;
    let package = store::package(session.connection, package_id, true).await?;
    same_scope(&package, project, contract)?;
    let amendment_id = package["contract_amendment_id"]
        .as_str()
        .map(uuid)
        .transpose()?;
    if (fact.status == "active") != amendment_id.is_some()
        || !matches!(fact.status.as_str(), "draft" | "active")
    {
        return Err(Error::BadRequest(
            "Only a draft contract may prepare or retry preparation".into(),
        ));
    }
    if let Some(amendment) = amendment_id {
        if id(body, "contractAmendmentId")? != amendment {
            return Err(Error::Conflict("变更身份不匹配。".into()));
        }
        crate::contracts::validate_amendment_preparation(session, amendment, contract, package_id)
            .await?;
    }
    let baseline = store::baseline(
        session.connection,
        id(&package, "source_baseline_id")?,
        true,
    )
    .await?;
    let d = store::diff(
        session.connection,
        id(&package, "latest_diff_result_id")?,
        true,
    )
    .await?;
    same_scope(&d, project, contract)?;
    validate_diff(&d, project, contract, id(&baseline, "id")?)?;
    let terms = Terms::parse(&package["candidate_terms"])?;
    if terms.contract_id != contract
        || (amendment_id.is_none()
            && money(&terms.amount_tax_inclusive)? != money(&fact.signed_amount)?)
    {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Contract core no longer matches prepared terms".into(),
        });
    }
    let terms_value = terms.value()?;
    let core_hash = store::core_hash(session.connection, contract).await?;
    let hash = store::payload(
        project,
        contract,
        &core_hash,
        &terms_value,
        &package["source_facts"],
        &d,
    )?;
    let exact:Option<Uuid>=sqlx::query_scalar("SELECT id FROM poms.contract_term_preparation WHERE contract_id=$1 AND source_readiness_id=$2 AND payload_hash=$3 AND is_current")
        .bind(contract).bind(package_id).bind(&hash).fetch_optional(&mut *session.connection).await?;
    if let Some(exact) = exact
        && package["is_current"] == true
    {
        load_preparation(session, contract, exact, false).await?;
        let row = store::preparation(session.connection, exact, true).await?;
        // The original real product wins over a unique-conflict fallback. Exact
        // retry has no business dirty state, timestamp, audit or session flush.
        return Ok(preparation_result(&row));
    }
    store::expected(&package, body)?;
    let pending:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.approval_record WHERE approval_type='contract-review' AND target_object_type='contract' AND target_object_id=$1 AND current_status='pending')")
        .bind(contract).fetch_one(&mut *session.connection).await?;
    if pending {
        return Err(Error::Conflict(
            "A pending contract review pins its preparation".into(),
        ));
    }
    if package["is_current"] != true
        || package["guard_decision"] != "allowed"
        || package["package_status"] == "blocked"
        || package["missing_prerequisite_count"].as_i64() != Some(0)
        || !store::ready(&d)
    {
        return Err(Error::BadRequest(
            "Current contract readiness and exact diff are not approved for preparation".into(),
        ));
    }
    if id(&d, "baseline_id")? != id(&baseline, "id")? || d["candidate_terms"] != terms_value {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Readiness and exact diff payload differ".into(),
        });
    }
    source::fresh(
        session.connection,
        &baseline,
        contract,
        &fact.currency_code,
        &package["source_facts"],
    )
    .await?;
    let cost = id(&package, "source_cost_package_id")?;
    let pricing = id(&package, "source_pricing_review_id")?;
    let bid = optional_text(&package, "source_bid_process_id")
        .as_deref()
        .map(uuid)
        .transpose()?;
    let old:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.contract_term_preparation p WHERE contract_id=$1 AND is_current FOR UPDATE")
        .bind(contract).fetch_optional(&mut *session.connection).await?;
    if amendment_id.is_none() && old.as_ref().is_some_and(|p| p["status"] == "activated") {
        return Err(Error::BadRequest(
            "An activated preparation cannot be replaced through draft initialization".into(),
        ));
    }
    let version:i64=sqlx::query_scalar("SELECT COALESCE(MAX(version)::bigint,0)+1 FROM poms.contract_term_preparation WHERE contract_id=$1")
        .bind(contract).fetch_one(&mut *session.connection).await?;
    let supersedes = old.as_ref().map(|p| id(p, "id")).transpose()?;
    if let Some(old) = old.as_ref() {
        let changed=sqlx::query("UPDATE poms.contract_term_preparation SET is_current=false,status=CASE WHEN status='activated' THEN status ELSE 'superseded' END,row_version=row_version+1,updated_at=now() WHERE id=$1 AND row_version=$2 AND is_current AND status IN ('prepared','activated')")
            .bind(id(old,"id")?).bind(store::rv(old)?).execute(&mut *session.connection).await?;
        if changed.rows_affected() != 1 {
            return Err(Error::Conflict("Current preparation changed".into()));
        }
    }
    let key = new_uuid()?;
    let seeds = serde_json::to_value(&terms.receivable_plan_seeds).map_err(|_| Error::Internal)?;
    sqlx::query("INSERT INTO poms.contract_term_preparation(id,project_id,contract_id,source_readiness_id,source_baseline_id,source_diff_result_id,source_cost_package_id,source_bid_process_id,source_pricing_review_id,version,status,contract_row_version_at_preparation,currency_code,amount_tax_inclusive,amount_tax_exclusive,tax_rate,down_payment_rate,retention_rate,retention_due_date,payment_terms,receivable_plan_seeds,source_facts,contract_core_hash,payload_hash,prepared_by,prepared_comment,supersedes_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::bigint::integer,'prepared',$11,$12,$13::text::numeric,$14::text::numeric,$15::text::numeric,$16::text::numeric,$17::text::numeric,$18::text::date,$19,$20,$21,$22,$23,$24,$25,$26)")
        .bind(key).bind(project).bind(contract).bind(package_id).bind(id(&baseline,"id")?).bind(id(&d,"id")?).bind(cost).bind(bid).bind(pricing).bind(version).bind(fact.row_version)
        .bind(&fact.currency_code).bind(&terms.amount_tax_inclusive).bind(&terms.amount_tax_exclusive).bind(&terms.tax_rate).bind(&terms.down_payment_rate).bind(&terms.retention_rate)
        .bind(&terms.retention_due_date).bind(&terms.payment_terms).bind(seeds).bind(&package["source_facts"]).bind(&core_hash).bind(&hash).bind(actor.id).bind(optional_text(body,"comment")).bind(supersedes)
        .execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("contract_term_preparation", &key.to_string());
    if let Some(amendment) = amendment_id {
        sqlx::query("UPDATE poms.contract_term_preparation SET contract_amendment_id=$2,before_snapshot_id=(SELECT before_snapshot_id FROM poms.contract_amendment WHERE id=$2) WHERE id=$1").bind(key).bind(amendment).execute(&mut *session.connection).await?;
        let updated=sqlx::query("UPDATE poms.contract_amendment SET source_preparation_id=$2,payload_hash=$3,updated_at=now(),updated_by=$4,row_version=row_version+1 WHERE id=$1 AND status='draft' AND source_readiness_id=$5")
            .bind(amendment).bind(key).bind(&hash).bind(actor.id).bind(package_id).execute(&mut *session.connection).await?;
        if updated.rows_affected() != 1 {
            return Err(Error::Conflict("变更准备来源已变化。".into()));
        }
    }
    let changed=sqlx::query("UPDATE poms.contract_readiness_package SET current_preparation_id=$2,updated_by=$3,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND row_version=$4 AND is_current")
        .bind(package_id).bind(key).bind(actor.id).bind(store::rv(&package)?).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict(
            "Readiness changed during preparation".into(),
        ));
    }
    let row = store::preparation(session.connection, key, false).await?;
    audit(
        session,
        actor,
        op,
        "ContractTermPreparation",
        &row,
        old.as_ref(),
        project,
        Some(contract),
        optional_text(body, "comment"),
    )
    .await?;
    Ok(preparation_result(&row))
}

/// Internal exact producer boundary used by B and the existing approval handler.
/// Historical reject loads validate the persisted identity/hash, not current
/// draft core or sources: a stale preparation must remain rejectable.
pub async fn load_preparation(
    session: &mut CommonSession<'_, '_>,
    contract_id: Uuid,
    preparation_id: Uuid,
    require_current_sources: bool,
) -> Result<Value, Error> {
    if !session.connection.is_in_transaction() {
        return Err(Error::Internal);
    }
    let discovered = store::preparation(session.connection, preparation_id, false).await?;
    let project = id(&discovered, "project_id")?;
    if id(&discovered, "contract_id")? != contract_id {
        return Err(Error::NotFound(
            "Preparation not found for this contract".into(),
        ));
    }
    lock_project(session.connection, project).await?;
    let contract = contract_fact(session.connection, contract_id, Some(project), true)
        .await?
        .ok_or_else(|| Error::NotFound("Preparation contract not found".into()))?;
    let p = store::preparation(session.connection, preparation_id, true).await?;
    same_scope(&p, project, contract_id)?;
    if require_current_sources && let Some(amendment) = optional_text(&p, "contract_amendment_id") {
        crate::contracts::validate_amendment_preparation(
            session,
            uuid(&amendment)?,
            contract_id,
            id(&p, "source_readiness_id")?,
        )
        .await?;
    }
    let package = store::package(session.connection, id(&p, "source_readiness_id")?, true).await?;
    same_scope(&package, project, contract_id)?;
    let baseline = store::baseline(session.connection, id(&p, "source_baseline_id")?, true).await?;
    let d = store::diff(session.connection, id(&p, "source_diff_result_id")?, true).await?;
    same_scope(&d, project, contract_id)?;
    validate_diff(&d, project, contract_id, id(&baseline, "id")?)?;
    if id(&d, "baseline_id")? != id(&baseline, "id")?
        || id(&package, "source_baseline_id")? != id(&baseline, "id")?
        || id(&package, "latest_diff_result_id")? != id(&d, "id")?
    {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Preparation source identities do not match".into(),
        });
    }
    let terms = Terms::parse(&store::prep_terms(&p))?;
    let terms_value = terms.value()?;
    let stored_core = text(&p, "contract_core_hash")?;
    let hash = store::payload(
        project,
        contract_id,
        stored_core,
        &terms_value,
        &p["source_facts"],
        &d,
    )?;
    if hash != text(&p, "payload_hash")?
        || package["candidate_terms"] != terms_value
        || d["candidate_terms"] != terms_value
        || package["source_facts"] != p["source_facts"]
    {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Immutable preparation payload changed".into(),
        });
    }
    if require_current_sources {
        if p["is_current"] != true
            || p["status"] != "prepared"
            || package["is_current"] != true
            || package["current_preparation_id"] != p["id"]
            || package["guard_decision"] != "allowed"
            || package["missing_prerequisite_count"].as_i64() != Some(0)
            || !store::ready(&d)
        {
            return Err(Error::CodedConflict {
                code: "source_changed",
                message: "Preparation or readiness is no longer current and approved".into(),
            });
        }
        if contract.currency_code != text(&p, "currency_code")?
            || store::core_hash(session.connection, contract_id).await? != stored_core
        {
            return Err(Error::CodedConflict {
                code: "payload_changed",
                message: "Contract core changed after preparation".into(),
            });
        }
        source::fresh(
            session.connection,
            &baseline,
            contract_id,
            &contract.currency_code,
            &p["source_facts"],
        )
        .await?;
    }
    let mut result = terms_value;
    let fields = result.as_object_mut().ok_or(Error::Internal)?;
    for (camel, snake) in [
        ("id", "id"),
        ("projectId", "project_id"),
        ("contractId", "contract_id"),
        ("version", "version"),
        ("rowVersion", "row_version"),
        ("status", "status"),
        ("isCurrent", "is_current"),
        ("sourceReadinessId", "source_readiness_id"),
        ("sourceBaselineId", "source_baseline_id"),
        ("sourceDiffResultId", "source_diff_result_id"),
        ("sourceFacts", "source_facts"),
        ("currencyCode", "currency_code"),
        ("contractCoreHash", "contract_core_hash"),
        ("payloadHash", "payload_hash"),
        ("preparedBy", "prepared_by"),
        ("activatedSnapshotId", "activated_snapshot_id"),
        ("contractAmendmentId", "contract_amendment_id"),
        ("beforeSnapshotId", "before_snapshot_id"),
    ] {
        fields.insert(camel.into(), p[snake].clone());
    }
    fields.insert("preparedAt".into(), store::iso(&p["prepared_at"]));
    fields.insert("activatedAt".into(), store::iso(&p["activated_at"]));
    Ok(result)
}

/// The formal producer and downstream provenance guards use the same exact fingerprint.
pub fn formal_plan_payload_hash(
    project: Uuid,
    contract: Uuid,
    snapshot: Uuid,
    preparation: Uuid,
    preparation_hash: &str,
    terms: &Value,
) -> Result<String, Error> {
    canonical_hash(
        &json!({"projectId":project,"contractId":contract,"snapshotId":snapshot,"sourcePreparationId":preparation,"preparationPayloadHash":preparation_hash,"terms":Terms::parse(terms)?.value()?}),
    )
}
fn plan_result(plan: &Value, preparation: &Value, snapshot: Uuid, record: Uuid) -> Value {
    json!({"targetId":plan["id"],"targetType":"receivable-plan-version","sourceReadinessId":plan["source_readiness_id"],"contractId":plan["contract_id"],
        "resultStatus":"initialized","businessStatusAfter":"active","preparationId":preparation["id"],"preparationVersion":preparation["version"],
        "snapshotId":snapshot,"newVersionId":plan["id"],"planVersionId":plan["id"],"planVersion":plan["version"],"initRecordId":record,"contractAmendmentId":preparation["contract_amendment_id"]})
}
pub async fn initialize_plan_from_effective_snapshot(
    session: &mut CommonSession<'_, '_>,
    package_id: Uuid,
    contract: Uuid,
    actor: &Actor,
    operation_id: &str,
) -> Result<Value, Error> {
    initialize_plan(
        session,
        package_id,
        &json!({"contractId":contract}),
        actor,
        operation_id,
    )
    .await
}
async fn initialize_plan(
    session: &mut CommonSession<'_, '_>,
    package_id: Uuid,
    body: &Value,
    actor: &Actor,
    op: &str,
) -> Result<Value, Error> {
    assert_package(package_id, body)?;
    let contract = id(body, "contractId")?;
    let discovered = store::package(session.connection, package_id, false).await?;
    let project = id(&discovered, "project_id")?;
    lock_project(session.connection, project).await?;
    let fact = contract_fact(session.connection, contract, Some(project), true)
        .await?
        .ok_or_else(|| Error::NotFound("Contract not found in project".into()))?;
    let package = store::package(session.connection, package_id, true).await?;
    same_scope(&package, project, contract)?;
    if fact.status != "active" {
        return Err(Error::BadRequest(
            "A formal receivable plan requires an Active contract".into(),
        ));
    }
    let snapshot_id = fact
        .current_snapshot_id
        .ok_or_else(|| Error::BadRequest("Active contract has no effective snapshot".into()))?;
    let snapshot:Value=sqlx::query_scalar("SELECT to_jsonb(s)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text,'amount_tax_exclusive',amount_tax_exclusive::text,'tax_rate',tax_rate::text,'down_payment_rate',down_payment_rate::text,'retention_rate',retention_rate::text) FROM poms.contract_term_snapshot s WHERE id=$1 AND contract_id=$2 AND snapshot_status='active'")
        .bind(snapshot_id).bind(contract).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::BadRequest("Current active contract snapshot is missing".into()))?;
    let preparation_id = optional_text(&snapshot, "source_preparation_id")
        .as_deref()
        .map(uuid)
        .transpose()?
        .ok_or_else(|| Error::BadRequest("Snapshot lacks a real preparation source".into()))?;
    let preparation = store::preparation(session.connection, preparation_id, true).await?;
    same_scope(&preparation, project, contract)?;
    if preparation["status"] != "activated"
        || preparation["activated_snapshot_id"] != snapshot["id"]
        || id(&preparation, "source_readiness_id")? != package_id
        || snapshot["source_readiness_id"] != package["id"]
        || snapshot["source_baseline_id"] != preparation["source_baseline_id"]
        || snapshot["payload_hash"] != preparation["payload_hash"]
    {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Active snapshot does not match its real preparation and readiness".into(),
        });
    }
    let terms = Terms::parse(&store::prep_terms(&snapshot))?;
    let prepared_terms = Terms::parse(&store::prep_terms(&preparation))?;
    if terms != prepared_terms
        || terms.contract_id != contract
        || fact.currency_code != text(&preparation, "currency_code")?
    {
        return Err(Error::CodedConflict {
            code: "payload_changed",
            message: "Active snapshot's frozen terms or seeds changed".into(),
        });
    }
    // Deliberately do not read current project R3 sources here. An already
    // effective contract retains its approved source after another contract quote.
    let payload_hash = formal_plan_payload_hash(
        project,
        contract,
        snapshot_id,
        preparation_id,
        text(&preparation, "payload_hash")?,
        &terms.value()?,
    )?;
    let exact:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text) FROM poms.receivable_plan_version p WHERE contract_id=$1 AND snapshot_id=$2 FOR UPDATE")
        .bind(contract).bind(snapshot_id).fetch_optional(&mut *session.connection).await?;
    if let Some(exact) = exact {
        if exact["status"] != "active" || exact["is_current"] != true {
            return Err(Error::BadRequest(
                "The formal plan for this snapshot is no longer active".into(),
            ));
        }
        if exact["payload_hash"] != payload_hash
            || id(&exact, "source_readiness_id")? != package_id
            || id(&exact, "source_preparation_id")? != preparation_id
        {
            return Err(Error::CodedConflict {
                code: "payload_changed",
                message: "Existing formal plan has a different frozen payload".into(),
            });
        }
        let nodes:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('nodeKey',node_key,'label',label,'plannedAmount',planned_amount::text,'plannedDate',planned_date,'isRetentionNode',is_retention_node,'sortOrder',sort_order,'note',note) FROM poms.receivable_plan_node WHERE plan_version_id=$1 ORDER BY sort_order,id")
            .bind(id(&exact,"id")?).fetch_all(&mut *session.connection).await?;
        if json!(nodes)
            != serde_json::to_value(&terms.receivable_plan_seeds).map_err(|_| Error::Internal)?
        {
            return Err(Error::CodedConflict {
                code: "payload_changed",
                message: "Existing formal plan nodes differ from frozen snapshot seeds".into(),
            });
        }
        let record:Uuid=sqlx::query_scalar("SELECT id FROM poms.receivable_plan_init_record WHERE plan_version_id=$1 AND contract_id=$2 AND snapshot_id=$3")
            .bind(id(&exact,"id")?).bind(contract).bind(snapshot_id).fetch_optional(&mut *session.connection).await?.ok_or(Error::Internal)?;
        return Ok(plan_result(&exact, &preparation, snapshot_id, record));
    }
    store::expected(&package, body)?;
    let previous:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.receivable_plan_version p WHERE contract_id=$1 AND is_current FOR UPDATE")
        .bind(contract).fetch_optional(&mut *session.connection).await?;
    let supersedes = previous.as_ref().map(|p| id(p, "id")).transpose()?;
    let version:i64=sqlx::query_scalar("SELECT COALESCE(MAX(version)::bigint,0)+1 FROM poms.receivable_plan_version WHERE contract_id=$1")
        .bind(contract).fetch_one(&mut *session.connection).await?;
    if let Some(previous) = previous.as_ref() {
        let changed=sqlx::query("UPDATE poms.receivable_plan_version SET is_current=false,status='superseded',updated_at=now(),row_version=row_version+1 WHERE id=$1 AND is_current AND row_version=$2")
            .bind(id(previous,"id")?).bind(store::rv(previous)?).execute(&mut *session.connection).await?;
        if changed.rows_affected() != 1 {
            return Err(Error::Conflict("Current plan changed".into()));
        }
    }
    let key = new_uuid()?;
    sqlx::query("INSERT INTO poms.receivable_plan_version(id,project_id,contract_id,snapshot_id,source_preparation_id,source_readiness_id,version,supersedes_id,status,currency_code,amount_tax_inclusive,payload_hash,initialized_by) VALUES($1,$2,$3,$4,$5,$6,$7::bigint::integer,$8,'active',$9,$10::text::numeric,$11,$12)")
        .bind(key).bind(project).bind(contract).bind(snapshot_id).bind(preparation_id).bind(package_id).bind(version).bind(supersedes).bind(&fact.currency_code)
        .bind(&terms.amount_tax_inclusive).bind(&payload_hash).bind(actor.id).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("receivable_plan_version", &key.to_string());
    for seed in &terms.receivable_plan_seeds {
        let node = new_uuid()?;
        sqlx::query("INSERT INTO poms.receivable_plan_node(id,plan_version_id,node_key,label,planned_amount,planned_date,is_retention_node,sort_order,note) VALUES($1,$2,$3,$4,$5::text::numeric,$6::text::date,$7,$8,$9)")
            .bind(node).bind(key).bind(&seed.node_key).bind(&seed.label).bind(&seed.planned_amount).bind(&seed.planned_date).bind(seed.is_retention_node).bind(seed.sort_order).bind(&seed.note)
            .execute(&mut *session.connection).await?;
        session
            .state
            .trace
            .inserted("receivable_plan_node", &node.to_string());
    }
    let record = new_uuid()?;
    sqlx::query("INSERT INTO poms.receivable_plan_init_record(id,plan_version_id,contract_id,snapshot_id,source_readiness_id,actor_id,comment) VALUES($1,$2,$3,$4,$5,$6,$7)")
        .bind(record).bind(key).bind(contract).bind(snapshot_id).bind(package_id).bind(actor.id).bind(optional_text(body,"comment")).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("receivable_plan_init_record", &record.to_string());
    let changed=sqlx::query("UPDATE poms.contract_readiness_package SET initialized_receivable_plan_version_id=$2,receivable_plan_initialized_at=now(),updated_by=$3,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND row_version=$4")
        .bind(package_id).bind(key).bind(actor.id).bind(store::rv(&package)?).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict(
            "Readiness changed during plan initialization".into(),
        ));
    }
    let plan:Value=sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text) FROM poms.receivable_plan_version p WHERE id=$1")
        .bind(key).fetch_one(&mut *session.connection).await?;
    audit(
        session,
        actor,
        op,
        "ReceivablePlanVersion",
        &plan,
        previous.as_ref(),
        project,
        Some(contract),
        optional_text(body, "comment"),
    )
    .await?;
    Ok(plan_result(&plan, &preparation, snapshot_id, record))
}
