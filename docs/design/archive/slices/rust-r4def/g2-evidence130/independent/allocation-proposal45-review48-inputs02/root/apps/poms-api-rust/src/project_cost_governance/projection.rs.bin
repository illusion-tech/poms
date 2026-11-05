use super::{
    logic,
    store::{self, Table},
};
use crate::{
    approval_common::{CommonSession, store as common},
    auth::{
        audit::{SecurityEventInput, insert_security_event},
        projection as sensitive,
    },
    contract_support::{Actor, Error},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

fn permission(actor: &Actor, key: &str) -> bool {
    actor
        .session
        .user
        .permissions
        .iter()
        .any(|p| p.as_str() == key)
}
pub(super) fn allowed(actor: &Actor, labor: bool) -> bool {
    logic::sensitive_allowed(
        labor,
        permission(actor, "operating:finance:sensitive:read"),
        permission(actor, "labor-cost-rate:sensitive:read"),
    )
}

/// Every decision and necessary security event uses this same borrowed session.
/// For a labor-tainted group both registered packages are evaluated, and the
/// most restrictive decision wins for every member of the reversible group.
pub(super) async fn fields(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    target: &str,
    id: Uuid,
    project: Option<Uuid>,
    labor: bool,
    values: Vec<(&str, Option<String>)>,
) -> Result<BTreeMap<String, Value>, Error> {
    let (projected, events) = plan_group(
        sensitive::ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|p| p.as_str().to_owned())
                .collect(),
        },
        actor.request_context.clone(),
        target,
        id,
        project,
        labor,
        values,
    )?;
    if !events.is_empty() {
        for event in events {
            insert_security_event(&mut *session.connection, &event).await?;
        }
        common::flush(session).await?;
    }
    Ok(projected)
}

fn plan_group(
    user: sensitive::ProjectionUser,
    request_context: sensitive::ProjectionRequestContext,
    target: &str,
    id: Uuid,
    project: Option<Uuid>,
    labor: bool,
    values: Vec<(&str, Option<String>)>,
) -> Result<(BTreeMap<String, Value>, Vec<SecurityEventInput>), Error> {
    let fields = values
        .into_iter()
        .map(|(key, value)| sensitive::StringField {
            key: key.into(),
            display_text_when_full: value.as_ref().map(|s| {
                if s.is_empty() {
                    "-".to_owned()
                } else if s.encode_utf16().count() > 2000 {
                    "已授权的成本治理明细".to_owned()
                } else {
                    s.clone()
                }
            }),
            raw_value: value,
            masked_display_text: None,
            denied_display_text: None,
        })
        .collect::<Vec<_>>();
    let mut plans = Vec::new();
    let mut events = Vec::new();
    let mut packages = vec![SensitiveFieldPackageKey::OperatingFinance];
    if labor {
        packages.push(SensitiveFieldPackageKey::LaborCostRate);
    }
    for package in packages {
        let plan = sensitive::plan(&sensitive::ProjectionInput {
            field_package_key: package,
            fields: fields.clone(),
            user: Some(user.clone()),
            target_type: target.into(),
            target_id: id.to_string(),
            request_context: request_context.clone(),
            mode_when_unauthorized: None,
            masked_display_text: None,
            denied_display_text: None,
        })
        .map_err(|_| Error::Internal)?;
        if let Some(mut event) = plan.event {
            if let Some(details) = event.details.as_mut().and_then(Value::as_object_mut) {
                details.insert("projectId".into(), json!(project));
            }
            events.push(event);
        }
        plans.push(plan.fields);
    }
    let selected = if labor
        && user
            .permissions
            .iter()
            .any(|p| p == "operating:finance:sensitive:read")
        && !user
            .permissions
            .iter()
            .any(|p| p == "labor-cost-rate:sensitive:read")
    {
        1
    } else {
        0
    };
    let selected = plans.get(selected).ok_or(Error::Internal)?;
    let projected = selected
        .iter()
        .map(|(key, value)| {
            serde_json::to_value(value)
                .map(|v| (key.clone(), v))
                .map_err(|_| Error::Internal)
        })
        .collect::<Result<BTreeMap<_, _>, _>>()?;
    Ok((projected, events))
}

pub(super) async fn guard_write(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    target: &str,
    id: Uuid,
    project: Option<Uuid>,
    labor: bool,
) -> Result<(), Error> {
    if labor && !allowed(actor, true) {
        fields(
            session,
            actor,
            target,
            id,
            project,
            true,
            vec![("governanceWrite", Some("protected".into()))],
        )
        .await?;
        return Err(Error::Forbidden(
            "Both operating and labor sensitive permissions are required".into(),
        ));
    }
    Ok(())
}

pub(super) fn evidence_labor(evidence: &Value) -> bool {
    let payload = &evidence["frozen_payload"];
    evidence
        .get("frozen_payload")
        .and_then(|p| p.get("containsLabor"))
        .and_then(Value::as_bool)
        .unwrap_or(true)
        || payload["costBefore"]["cost_type"] == "labor"
        || payload
            .get("sources")
            .and_then(Value::as_array)
            .is_some_and(|sources| sources.iter().any(|s| s["cost"]["cost_type"] == "labor"))
}

pub(super) async fn labor(session: &mut CommonSession<'_, '_>, row: &Value) -> Result<bool, Error> {
    let table = if row.get("source_cost_scope_key").is_some() {
        Table::Basis
    } else if row.get("basis_id").is_some() {
        Table::Result
    } else if row.get("cost_record_id").is_some() {
        Table::Stage
    } else if row.get("tax_treatment_type").is_some() {
        Table::Tax
    } else {
        return Ok(true);
    };
    let mut current = row.clone();
    let mut seen = std::collections::BTreeSet::new();
    loop {
        if !seen.insert(store::id(&current, "id")?) {
            return Ok(true);
        }
        match store::evidence(session.connection, &current).await? {
            Some(e) if !evidence_labor(&e) => {}
            _ => return Ok(true),
        }
        match store::optional_id(&current, "supersedes_id")? {
            Some(id) => current = store::row(session.connection, table, id, false).await?,
            None => return Ok(false),
        }
    }
}

fn safe_evidence(evidence: &Option<Value>) -> Option<String> {
    evidence.as_ref().map(|e|json!({"businessDate":e["business_date"],"reason":e["reason"],"sourceReferences":e["source_references"],"payloadHash":e["payload_hash"]}).to_string())
}

pub(super) async fn result_view(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    row: &Value,
    taint: bool,
) -> Result<Value, Error> {
    let taint = taint || labor(session, row).await?;
    let id = store::id(row, "id")?;
    let project = store::id(row, "project_id")?;
    let group = json!({"currency":row["currency"],"allocatedAmount":row["allocated_amount"],"allocationRatio":row["allocation_ratio"],"allocationWeight":row["allocation_weight"],"allocationSummary":row["allocation_summary"],"amountExcludingTax":row["allocated_amount_excluding_tax"],"taxCostAmount":row["allocated_tax_cost_amount"],"amountIncludingTax":row["allocated_amount_including_tax"],"residualMinorUnits":row["residual_minor_units"]});
    let fields = fields(
        session,
        actor,
        "SharedCostAllocationResult",
        id,
        Some(project),
        taint,
        vec![("financialProjection", Some(group.to_string()))],
    )
    .await?;
    Ok(
        json!({"id":id,"basisId":row["basis_id"],"projectId":project,"status":row["status"],"effectiveAt":store::timestamp(row,"effective_at")?,"supersedesId":row["supersedes_id"],"rowVersion":row["row_version"],"createdAt":store::timestamp(row,"created_at")?,"updatedAt":store::timestamp(row,"updated_at")?,"financialProjection":fields["financialProjection"],"evidenceId":row["governance_evidence_id"],"governanceCertification":store::certify(row)}),
    )
}

pub(super) async fn basis(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    id: Uuid,
) -> Result<Value, Error> {
    let basis = store::row(session.connection, Table::Basis, id, false).await?;
    let source = store::children(session.connection, Table::Source, id, false).await?;
    let results = store::children(session.connection, Table::Result, id, false).await?;
    let mut taint = labor(session, &basis).await?;
    for row in &results {
        taint |= labor(session, row).await?;
    }
    let mut projects = std::collections::BTreeSet::new();
    let mut source_summaries = Vec::new();
    for s in &source {
        let cost = &s["source_payload"]["cost"];
        if s["source_payload_hash"]
            != crate::contract_support::canonical_hash(&s["source_payload"])?
            || s["cost_record_id"] != cost["id"]
            || s["cost_row_version"] != cost["row_version"]
            || s["currency"] != cost["currency"]
        {
            return Err(Error::Conflict(
                "Allocation source snapshot integrity requires review".into(),
            ));
        }
        taint |= cost["cost_type"] == "labor";
        projects.insert(store::id(cost, "project_id")?);
        source_summaries.push(json!({"costRecordId":cost["id"],"costVersion":cost["row_version"],"projectId":cost["project_id"],"sourceType":cost["source_type"],"sourceId":cost["source_id"],"sourceVersion":s["source_row_version"],"currency":s["currency"],"amountExcludingTax":s["amount_excluding_tax"],"taxCostAmount":s["tax_cost_amount"],"amountIncludingTax":s["amount_including_tax"],"occurredOn":cost["occurred_on"]}));
    }
    for row in &results {
        projects.insert(store::id(row, "project_id")?);
    }
    let mut views = Vec::new();
    // Per-project decisions are applied before an aggregate can be released.
    for row in &results {
        views.push(result_view(session, actor, row, taint).await?);
    }
    let group = json!({"currency":basis["currency"],"measurementBasis":basis["measurement_basis"],"measurementAmount":basis["measurement_amount"],"sourceAmountExcludingTax":basis["source_amount_excluding_tax"],"sourceTaxCostAmount":basis["source_tax_cost_amount"],"sourceAmountIncludingTax":basis["source_amount_including_tax"],"algorithm":basis["allocation_algorithm"],"sourceCostRecords":source_summaries});
    let scopes = if projects.is_empty() {
        vec![None]
    } else {
        projects.into_iter().map(Some).collect()
    };
    let mut projected = None;
    for scope in scopes {
        let decision = fields(
            session,
            actor,
            "SharedCostAllocationBasis",
            id,
            scope,
            taint,
            vec![
                ("financialProjection", Some(group.to_string())),
                (
                    "basisSummaryProjection",
                    store::optional_text(&basis, "basis_summary"),
                ),
            ],
        )
        .await?;
        if projected.is_none() || decision["financialProjection"]["mode"] != "full" {
            projected = Some(decision);
        }
    }
    let projected = projected.ok_or(Error::Internal)?;
    let visible = projected["financialProjection"]["mode"] == "full";
    Ok(
        json!({"id":id,"sourceCostScopeKey":basis["source_cost_scope_key"],"basisType":if visible{basis["basis_type"].clone()}else{json!("sensitive")},"allocationMethod":if visible{basis["allocation_method"].clone()}else{json!("sensitive")},"status":basis["status"],"effectiveAt":store::timestamp(&basis,"effective_at")?,"effectiveBy":basis["effective_by"],"supersedesId":basis["supersedes_id"],"rowVersion":basis["row_version"],"createdAt":store::timestamp(&basis,"created_at")?,"updatedAt":store::timestamp(&basis,"updated_at")?,"results":views,"basisSummaryProjection":projected["basisSummaryProjection"],"financialProjection":projected["financialProjection"],"currency":basis["currency"],"measurementBasis":basis["measurement_basis"],"sourceRecordCount":source.len(),"evidenceId":basis["governance_evidence_id"],"governanceCertification":store::certify(&basis)}),
    )
}

pub(super) async fn results(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    id: Uuid,
) -> Result<Value, Error> {
    let view = basis(session, actor, id).await?;
    Ok(view["results"].clone())
}

pub(super) async fn stage_view(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    row: &Value,
) -> Result<Value, Error> {
    let cost = store::row(
        session.connection,
        Table::Cost,
        store::id(row, "cost_record_id")?,
        false,
    )
    .await?;
    let evidence = store::evidence(session.connection, row).await?;
    let taint = cost["cost_type"] == "labor" || labor(session, row).await?;
    let id = store::id(row, "id")?;
    let projected = fields(
        session,
        actor,
        "CostStageAttributionSnapshot",
        id,
        Some(store::id(&cost, "project_id")?),
        taint,
        vec![
            (
                "attributionSummaryProjection",
                store::optional_text(row, "attribution_summary"),
            ),
            ("evidenceProjection", safe_evidence(&evidence)),
        ],
    )
    .await?;
    Ok(
        json!({"id":id,"costRecordId":row["cost_record_id"],"attributedStage":if allowed(actor,taint){row["attributed_stage"].clone()}else{json!("sensitive")},"attributionMode":row["attribution_mode"],"lockedBySnapshotId":row["locked_by_snapshot_id"],"status":row["status"],"supersedesId":row["supersedes_id"],"handledAt":store::timestamp(row,"handled_at")?,"handledBy":row["handled_by"],"rowVersion":row["row_version"],"createdAt":store::timestamp(row,"created_at")?,"updatedAt":store::timestamp(row,"updated_at")?,"attributionSummaryProjection":projected["attributionSummaryProjection"],"evidenceProjection":projected["evidenceProjection"],"evidenceId":row["governance_evidence_id"],"evidenceBusinessDate":row["evidence_business_date"],"governanceCertification":store::certify(row)}),
    )
}
pub(super) async fn stage_detail(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    id: Uuid,
) -> Result<Value, Error> {
    let row = store::row(session.connection, Table::Stage, id, false).await?;
    stage_view(session, actor, &row).await
}
pub(super) async fn stage_history(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    id: Uuid,
) -> Result<Value, Error> {
    store::row(session.connection, Table::Cost, id, false).await?;
    let rows = store::children(session.connection, Table::Stage, id, false).await?;
    let mut values = Vec::new();
    for row in rows {
        values.push(stage_view(session, actor, &row).await?);
    }
    Ok(json!(values))
}
pub(super) async fn tax_view(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    row: &Value,
) -> Result<Value, Error> {
    let evidence = store::evidence(session.connection, row).await?;
    let taint = labor(session, row).await?;
    let id = store::id(row, "id")?;
    let projected = fields(
        session,
        actor,
        "AccountingTaxTreatmentSnapshot",
        id,
        Some(store::id(row, "project_id")?),
        taint,
        vec![
            (
                "taxImpactAmountProjection",
                store::optional_text(row, "tax_impact_amount"),
            ),
            (
                "taxImpactSummaryProjection",
                store::optional_text(row, "tax_impact_summary"),
            ),
            (
                "taxImpactPendingAmountProjection",
                store::optional_text(row, "tax_impact_pending_amount"),
            ),
            (
                "basisSummaryProjection",
                store::optional_text(row, "basis_summary"),
            ),
            ("sourceEvidenceProjection", safe_evidence(&evidence)),
        ],
    )
    .await?;
    let mut result = json!({"id":id,"projectId":row["project_id"],"taxTreatmentType":if allowed(actor,taint){row["tax_treatment_type"].clone()}else{json!("sensitive")},"deductibilityStatus":row["deductibility_status"],"taxPendingFlag":row["tax_pending_flag"],"status":row["status"],"supersedesId":row["supersedes_id"],"confirmedAt":store::timestamp(row,"confirmed_at")?,"confirmedBy":row["confirmed_by"],"rowVersion":row["row_version"],"createdAt":store::timestamp(row,"created_at")?,"updatedAt":store::timestamp(row,"updated_at")?,"currency":row["currency"],"evidenceId":row["governance_evidence_id"],"governanceCertification":store::certify(row)});
    for (k, v) in projected {
        result[k] = v;
    }
    Ok(result)
}
pub(super) async fn tax_detail(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    id: Uuid,
) -> Result<Value, Error> {
    let row = store::row(session.connection, Table::Tax, id, false).await?;
    tax_view(session, actor, &row).await
}
pub(super) async fn tax_history(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    id: Uuid,
) -> Result<Value, Error> {
    if !sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM poms.project WHERE id=$1)")
        .bind(id)
        .fetch_one(&mut *session.connection)
        .await?
    {
        return Err(Error::NotFound("Project not found".into()));
    }
    let rows = store::children(session.connection, Table::Tax, id, false).await?;
    let mut values = Vec::new();
    for row in rows {
        values.push(tax_view(session, actor, &row).await?);
    }
    Ok(json!(values))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn decisions(
        permissions: &[&str],
        labor: bool,
    ) -> (BTreeMap<String, Value>, Vec<SecurityEventInput>) {
        plan_group(
            sensitive::ProjectionUser {
                sub: Uuid::nil(),
                username: "finance".into(),
                permissions: permissions.iter().map(|p| (*p).into()).collect(),
            },
            sensitive::ProjectionRequestContext {
                request_id: Some("test".into()),
                path: "/api/shared-cost-allocation-bases/test".into(),
                method: Some("GET".into()),
                ip: None,
                user_agent: None,
            },
            "SharedCostAllocationBasis",
            Uuid::nil(),
            None,
            labor,
            vec![
                (
                    "financialProjection",
                    Some(
                        "{\"sourceTotal\":\"3399.21\",\"knownOther\":\"99.21\",\"ratio\":\"0.5\"}"
                            .into(),
                    ),
                ),
                (
                    "evidenceProjection",
                    Some("protected labor calculation".into()),
                ),
            ],
        )
        .unwrap()
    }
    #[test]
    fn actual_projection_plans_mask_mixed_inverse_values_with_either_permission_missing() {
        for permissions in [
            vec![],
            vec!["operating:finance:sensitive:read"],
            vec!["labor-cost-rate:sensitive:read"],
        ] {
            let (fields, events) = decisions(&permissions, true);
            for field in fields.values() {
                assert_eq!(field["mode"], "masked");
                assert!(field["value"].is_null());
                assert!(!field.to_string().contains("3399.21"));
            }
            assert_eq!(events.len(), if permissions.is_empty() { 2 } else { 1 });
            for event in events {
                let detail = event.details.unwrap().to_string();
                assert!(!detail.contains("3399.21"));
                assert!(!detail.contains("protected labor calculation"));
            }
        }
    }
    #[test]
    fn dual_authorization_uses_normal_financial_carrier_and_nonlabor_stays_operating() {
        let (fields, events) = decisions(
            &[
                "operating:finance:sensitive:read",
                "labor-cost-rate:sensitive:read",
            ],
            true,
        );
        assert!(events.is_empty());
        assert_eq!(fields["financialProjection"]["mode"], "full");
        assert_eq!(
            fields["financialProjection"]["fieldPackageKey"],
            "operating-finance"
        );
        let (fields, events) = decisions(&["operating:finance:sensitive:read"], false);
        assert!(events.is_empty());
        assert_eq!(fields["financialProjection"]["mode"], "full");
        let (fields, _) = decisions(&["operating:finance:sensitive:read"], true);
        assert_eq!(
            fields["financialProjection"]["fieldPackageKey"],
            "labor-cost-rate"
        );
    }
    #[test]
    fn taint_fails_closed_and_resolves_real_nested_labor_sources() {
        assert!(evidence_labor(&json!({})));
        assert!(evidence_labor(
            &json!({"frozen_payload":{"containsLabor":false,"sources":[{"cost":{"cost_type":"labor"}}]}})
        ));
        assert!(!evidence_labor(
            &json!({"frozen_payload":{"containsLabor":false,"sources":[{"cost":{"cost_type":"expense"}}]}})
        ));
    }
    #[test]
    fn public_evidence_summary_never_returns_full_source_payload() {
        let value = Some(
            json!({"business_date":"2026-11-04","reason":"source checked","source_references":[],"payload_hash":"hash","frozen_payload":{"personId":"private-person","rate":"1234.00","secret":"private-calculation"}}),
        );
        let public = safe_evidence(&value).unwrap();
        assert!(!public.contains("private-person"));
        assert!(!public.contains("1234.00"));
        assert!(!public.contains("private-calculation"));
    }
    #[test]
    fn large_authorized_payload_keeps_exact_value_with_a_bounded_display_carrier() {
        let text = "🚀".repeat(1100);
        let (fields, events) = plan_group(
            sensitive::ProjectionUser {
                sub: Uuid::nil(),
                username: "finance".into(),
                permissions: vec!["operating:finance:sensitive:read".into()],
            },
            sensitive::ProjectionRequestContext {
                request_id: None,
                path: "/api/shared-cost-allocation-bases/test".into(),
                method: Some("GET".into()),
                ip: None,
                user_agent: None,
            },
            "SharedCostAllocationBasis",
            Uuid::nil(),
            None,
            false,
            vec![("financialProjection", Some(text.clone()))],
        )
        .unwrap();
        assert!(events.is_empty());
        assert_eq!(fields["financialProjection"]["value"], text);
        assert!(
            fields["financialProjection"]["displayText"]
                .as_str()
                .unwrap()
                .encode_utf16()
                .count()
                <= 2000
        );
    }
}
