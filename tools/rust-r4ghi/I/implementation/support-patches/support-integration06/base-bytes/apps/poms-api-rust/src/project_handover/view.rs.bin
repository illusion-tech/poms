use super::{
    model::*,
    sources::{self, Sources},
};
use crate::{
    approval_common::CommonSession,
    auth::{
        audit::insert_security_event,
        projection::{self, ProjectionInput, ProjectionUser, StringField},
    },
    contract_support::{Actor, Error, money, money_string},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

async fn amount(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    target: Uuid,
    value: Option<String>,
) -> Result<Value, Error> {
    let plan = projection::plan(&ProjectionInput {
        field_package_key: SensitiveFieldPackageKey::ContractFinance,
        fields: vec![StringField {
            key: "amount".into(),
            display_text_when_full: value.clone(),
            raw_value: value,
            masked_display_text: None,
            denied_display_text: None,
        }],
        user: Some(ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|p| p.as_str().to_owned())
                .collect(),
        }),
        target_type: "project".into(),
        target_id: target.to_string(),
        request_context: actor.request_context.clone(),
        mode_when_unauthorized: None,
        masked_display_text: None,
        denied_display_text: None,
    })
    .map_err(|_| Error::Internal)?;
    if let Some(event) = plan.event {
        insert_security_event(session.connection, &event).await?;
    }
    serde_json::to_value(plan.fields.get("amount").ok_or(Error::Internal)?)
        .map_err(|_| Error::Internal)
}
pub(super) async fn contract_set(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    project: Uuid,
    members: &[Value],
) -> Result<Value, Error> {
    let mut totals: BTreeMap<String, i128> = BTreeMap::new();
    let mut contracts = Vec::new();
    let mut dates = Vec::new();
    for m in members {
        let currency = text(m, "currencyCode")?.to_owned();
        let value = text(m, "signedAmount")?.to_owned();
        let total = totals.entry(currency.clone()).or_default();
        *total = total.checked_add(money(&value)?).ok_or(Error::Internal)?;
        let signed = iso(&m["signedAt"]);
        if let Some(d) = signed.as_str() {
            dates.push(d.to_owned());
        }
        contracts.push(json!({"id":m["contractId"],"contractNo":m["contractNo"],"status":"active","signedAmountProjection":amount(session,actor,project,Some(value)).await?,"currencyCode":currency,"currentSnapshotId":m["snapshotId"],"signedAt":signed}));
    }
    dates.sort();
    let mut per_currency = Vec::new();
    for (currency, total) in &totals {
        per_currency.push(json!({"currencyCode":currency,"totalSignedAmountProjection":amount(session,actor,project,Some(money_string(*total))).await?}));
    }
    let mut total = amount(
        session,
        actor,
        project,
        if totals.len() == 1 {
            totals.values().next().copied().map(money_string)
        } else {
            None
        },
    )
    .await?;
    if totals.len() > 1 {
        total["displayText"] = json!("按币种查看");
    }
    Ok(
        json!({"activeContractCount":members.len(),"activeContractIds":members.iter().map(|m|m["contractId"].clone()).collect::<Vec<_>>(),"contractNos":members.iter().map(|m|m["contractNo"].clone()).collect::<Vec<_>>(),"totalSignedAmountProjection":total,"currencyCodes":totals.keys().collect::<Vec<_>>(),"contracts":contracts,"earliestSignedAt":dates.first(),"latestSignedAt":dates.last(),"amountTotalsByCurrency":per_currency}),
    )
}
pub(super) fn baseline(h: Option<&Value>) -> Value {
    match h {
        Some(h) if !h["basis_snapshot_id"].is_null() => {
            json!({"status":"available","baselineSnapshotId":h["effective_handover_baseline_snapshot_id"],"sourceType":if h["handover_rebaseline_record_id"].is_null(){"project-handover"}else{"handover-rebaseline"},"sourceId":if h["handover_rebaseline_record_id"].is_null(){h["id"].clone()}else{h["handover_rebaseline_record_id"].clone()},"summary":"全部合同的承接依据已固定；单快照字段仅为兼容锚点。"})
        }
        _ => {
            json!({"status":"missing","baselineSnapshotId":null,"sourceType":"none","sourceId":null,"summary":"尚未准备正式移交依据。"})
        }
    }
}
fn frozen_materials(h: &Value, members: &[Value]) -> Option<Value> {
    if members.is_empty() {
        return None;
    }
    let mut contracts = Vec::new();
    for m in members {
        let facts = &m["handoverFacts"];
        if facts["sourceVersion"].as_u64().is_none_or(|v| v == 0)
            || facts["sourcePackageId"]
                .as_str()
                .and_then(|s| Uuid::parse_str(s).ok())
                .is_none()
        {
            return None;
        }
        let scopes=facts["scopeItems"].as_array()?.iter().map(|v|json!({"id":v["id"],"packageId":v["packageId"],"scopeType":v["scopeType"],"label":v["label"],"description":v["description"],"sortOrder":v["sortOrder"]})).collect::<Vec<_>>();
        let risks=facts["riskItems"].as_array()?.iter().map(|v|json!({"id":v["id"],"packageId":v["packageId"],"riskCategory":v["riskCategory"],"riskLevel":v["riskLevel"],"riskDescription":v["riskDescription"],"impactScope":v["impactScope"],"mitigationPlan":v["mitigationPlan"],"ownerRole":v["ownerRole"],"riskStatus":v["riskStatus"],"blocksNextStage":v["blocksNextStage"],"sortOrder":v["sortOrder"]})).collect::<Vec<_>>();
        contracts.push(json!({"contractId":m["contractId"],"contractTermSnapshotId":m["snapshotId"],"technicalCostPackageId":facts["sourcePackageId"],"technicalCostVersion":facts["sourceVersion"],"scopeItems":scopes,"riskItems":risks}));
    }
    Some(
        json!({"basisSnapshotId":h["basis_snapshot_id"],"sourcePayloadHash":h["source_payload_hash"],"contracts":contracts}),
    )
}
pub(super) async fn summary(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    s: &Sources,
    h: Option<&Value>,
) -> Result<Value, Error> {
    let project = id(&s.project, "id")?;
    let ready = s.blockers.is_empty();
    let mut prepare_blockers = s.blockers.clone();
    if let Some(h) = h.filter(|h| h["producer_version"] == 1 && h["is_current"] == true) {
        let basis = sources::basis(session, h).await?;
        if sources::contract_changed(&basis["source_payload"], &s.members) {
            prepare_blockers
                .push("原承接合同口径已变更，请先通过真实合同变更记录完成再基线化。".into());
        } else if h["status"] == "confirmed" && h["source_payload_hash"] == s.hash {
            prepare_blockers.push("已有同来源的正式确认移交。".into());
        }
    }
    let one = (s.members.len() == 1).then(|| &s.members[0]);
    let rebaseline:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.contract_handover_rebaseline_record r WHERE project_id=$1 ORDER BY handled_at DESC,id DESC LIMIT 1").bind(project).fetch_optional(&mut *session.connection).await?;
    let latest = match rebaseline {
        Some(r) => {
            let count:i64=sqlx::query_scalar("SELECT count(*) FROM poms.handover_baseline_impact_item WHERE rebaseline_record_id=$1").bind(id(&r,"id")?).fetch_one(&mut *session.connection).await?;
            json!({"status":r["status"],"rebaselineRecordId":r["id"],"effectiveBaselineAfterId":r["effective_baseline_after_id"],"handledAt":iso(&r["handled_at"]),"blockingStatus":if matches!(r["status"].as_str(),Some("processing"|"pending-effective")){"blocking"}else if r["status"]=="effective"{"effective"}else{"none"},"impactItemCount":count,"impactSummary":format!("{count} 个承接来源项")})
        }
        None => {
            json!({"status":"none","rebaselineRecordId":null,"effectiveBaselineAfterId":null,"handledAt":null,"blockingStatus":"none","impactItemCount":0,"impactSummary":null})
        }
    };
    let mut result = json!({"projectId":project,"projectNo":s.project["project_no"],"projectName":s.project["project_name"],"projectRowVersion":s.project["row_version"],"sourcePayloadHash":s.hash,
        "effectiveContractSetSummary":contract_set(session,actor,project,&s.members).await?,
        "contractBaselineValidationSummary":{"status":if ready{"ready"}else{"blocked"},"readinessPackageId":one.map(|m|m["readinessId"].clone()),"sourceBaselineId":one.map(|m|m["baselineId"].clone()),"latestDiffResultId":one.map(|m|m["diffId"].clone()),"diffLevel":one.map(|m|m["diffLevel"].clone()),"reviewStatus":one.map(|m|m["reviewStatus"].clone()),"packageStatus":null,"guardDecision":if ready{"allowed"}else{"blocked"},"initializedContractSnapshotId":one.map(|m|m["snapshotId"].clone()),"contractSnapshotInitializedAt":one.map(|m|iso(&m["snapshotEffectiveAt"])),"blockingReasonSummary":s.blockers.first(),"missingPrerequisiteCount":s.blockers.len()},
        "currentHandoverBaselineSummary":baseline(h),"latestHandoverRebaselineSummary":latest,
        "receivablePlanInitSummary":{"status":if ready{"initialized"}else{"blocked"},"initializedReceivablePlanVersionId":one.map(|m|m["planVersionId"].clone()),"receivablePlanInitializedAt":one.map(|m|iso(&m["planInitializedAt"])),"summary":"逐合同检查当前快照对应的唯一正式计划。"},
        "contractSummarySnapshotId":h.map(|h|h["contract_summary_snapshot_id"].clone()),"projectionLevel":h.map(|_|"handover-confirmation"),"exportPolicy":h.map(|_|"handover-controlled"),
        "allowedActions":if prepare_blockers.is_empty()&&permission(actor,"project:write"){vec!["prepare-project-handover"]}else{vec![]},"blockingReasons":prepare_blockers,"generatedAt":now(),
        "contractReadiness":s.members.iter().map(|m|json!({"contractId":m["contractId"],"readinessPackageId":m["readinessId"],"preparationId":m["preparationId"],"snapshotId":m["snapshotId"],"planVersionId":m["planVersionId"],"status":if sources::member_ready(m){"ready"}else{"blocked"},"blockingReasons":if sources::member_ready(m){Vec::<String>::new()}else{vec!["合同生效来源或正式计划尚未齐备。".into()]}})).collect::<Vec<_>>()});
    if permission(actor, "project:write") {
        let users:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('id',id,'displayName',display_name) FROM poms.platform_user WHERE is_active ORDER BY display_name,id").fetch_all(&mut *session.connection).await?;
        result["availableParticipants"] = json!(users);
    }
    Ok(result)
}
pub(super) async fn detail(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    s: &Sources,
    h: Option<&Value>,
) -> Result<Value, Error> {
    let project = id(&s.project, "id")?;
    let mut participants: Vec<Value> = Vec::new();
    let mut confirmation = Value::Null;
    let mut items = Vec::new();
    let mut historical = s.members.clone();
    let mut source_changed = false;
    let mut materials = Value::Null;
    let mut inactive_participant = false;
    if let Some(h) = h {
        if h["producer_version"] == 1 {
            let b = sources::basis(session, h).await?;
            historical = b["source_payload"]["members"]
                .as_array()
                .ok_or(Error::Internal)?
                .clone();
            materials = frozen_materials(h, &historical).unwrap_or(Value::Null);
            source_changed = h["source_payload_hash"] != s.hash || materials.is_null();
            confirmation=sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.confirmation_record c WHERE id=$1 AND target_id=$2 AND target_type='project-handover' AND project_id=$3").bind(id(h,"confirmation_record_id")?).bind(id(h,"id")?).bind(project).fetch_optional(&mut *session.connection).await?.ok_or(Error::Internal)?;
            participants=sqlx::query_scalar(r#"SELECT jsonb_build_object('participantId',p.participant_id,'participantRoleKey',p.participant_role_key,'participantDisplayName',p.participant_display_name,'participantStatus',p.participant_status,'confirmedAt',p.confirmed_at,'confirmedComment',p.confirmed_comment,'responsibilities',(SELECT jsonb_agg(jsonb_build_object('roleKey',r.role_key,'responsibilitySummary',r.responsibility_summary) ORDER BY r.role_key) FROM poms.project_handover_participant_role r WHERE r.confirmation_participant_id=p.id AND r.handover_id=$2)) FROM poms.confirmation_participant p WHERE p.confirmation_record_id=$1 ORDER BY p.participant_id"#).bind(id(h,"confirmation_record_id")?).bind(id(h,"id")?).fetch_all(&mut *session.connection).await?;
            inactive_participant=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_handover_participant_role r LEFT JOIN poms.platform_user u ON u.id=r.participant_user_id WHERE r.handover_id=$1 AND (u.id IS NULL OR NOT u.is_active))").bind(id(h,"id")?).fetch_one(&mut *session.connection).await?;
            source_changed |= inactive_participant;
            for p in &mut participants {
                p["confirmedAt"] = iso(&p["confirmedAt"]);
            }
            let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(i) FROM poms.project_handover_basis_item i WHERE basis_snapshot_id=$1 ORDER BY item_key").bind(id(h,"basis_snapshot_id")?).fetch_all(&mut *session.connection).await?;
            items = rows.iter().map(safe_item).collect();
        } else {
            source_changed = true;
            historical.clear();
        }
    }
    let mut blockers = s.blockers.clone();
    if inactive_participant {
        blockers.push("参与人已停用，请核对销售主责并重新指派移交职责。".into());
    }
    if source_changed {
        blockers.push("移交依据来源已变化，请重新准备或再基线化。".into());
    }
    if h.is_none() {
        blockers.push("尚未发起移交准备。".into());
    }
    let confirmed = confirmation["status"] == "confirmed";
    if h.is_some() && !confirmed {
        blockers.push("参与人尚未全部确认。".into());
    }
    let mut actions = Vec::new();
    if let Some(h) = h
        && h["is_current"] == true
        && h["status"] == "draft"
        && !source_changed
        && s.blockers.is_empty()
    {
        if participants.iter().any(|p| {
            p["participantId"] == actor.id.to_string() && p["participantStatus"] == "pending"
        }) {
            actions.push("confirm-project-handover-participant");
        }
        if confirmed && permission(actor, "project:write") {
            actions.push("confirm-project-handover");
        }
    }
    let freeze: Option<Value> = if let Some(h) = h {
        sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.project_receipt_judgment_freeze f WHERE project_id=$1 AND source_handover_id=$2 ORDER BY version DESC NULLS LAST,created_at DESC,id LIMIT 1").bind(project).bind(id(h,"id")?).fetch_optional(&mut *session.connection).await?
    } else {
        sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.project_receipt_judgment_freeze f WHERE project_id=$1 AND is_current").bind(project).fetch_optional(&mut *session.connection).await?
    };
    let receipt=freeze.as_ref().map(|f|json!({"status":"frozen","receiptJudgmentMode":f["receipt_judgment_mode"],"sourceType":f["source_type"],"sourceId":f["source_id"],"summary":"回款判断模式已冻结。"})).unwrap_or(json!({"status":"not-frozen","receiptJudgmentMode":h.filter(|h|h["producer_version"]==1).map(|h|h["prepared_receipt_judgment_mode"].clone()),"sourceType":"none","sourceId":null,"summary":"当前显示本次准备选定的模式；最终移交事实确认后才冻结生效。"}));
    let status = h
        .map(|h| h["status"].clone())
        .unwrap_or(json!("not-started"));
    Ok(
        json!({"handoverId":h.map(|h|h["id"].clone()),"projectId":project,"projectNo":s.project["project_no"],"projectName":s.project["project_name"],"handoverStatus":status,"confirmedAt":h.map(|h|iso(&h["confirmed_at"])),"confirmedBy":h.map(|h|h["confirmed_by"].clone()),"comment":h.map(|h|h["comment"].clone()),"rowVersion":h.map(|h|h["row_version"].clone()),
        "effectiveContractSetSummary":contract_set(session,actor,project,&historical).await?,"contractSummarySnapshotId":h.map(|h|h["contract_summary_snapshot_id"].clone()),"currentHandoverBaselineSummary":baseline(h),
        "participantConfirmationSummary":{"status":confirmation["status"].as_str().unwrap_or("not-started"),"confirmationRecordId":confirmation["id"],"requiredCount":participants.len(),"confirmedCount":participants.iter().filter(|p|p["participantStatus"]=="confirmed").count(),"pendingCount":participants.iter().filter(|p|p["participantStatus"]=="pending").count(),"closedCount":participants.iter().filter(|p|p["participantStatus"]=="closed").count(),"submittedAt":iso(&confirmation["submitted_at"]),"confirmedAt":iso(&confirmation["confirmed_at"]),"closedAt":iso(&confirmation["closed_at"]),"rowVersion":confirmation["row_version"],"participants":participants},
        "receiptJudgmentModeSummary":receipt,"summaryPackageKey":h.map(|_|"project-handover-confirmation"),"summarySnapshotId":h.map(|h|h["summary_snapshot_id"].clone()),"projectionLevel":h.map(|_|"handover-confirmation"),"exportPolicy":h.map(|_|"handover-controlled"),"allowedActions":actions,"blockingReasons":blockers,"generatedAt":now(),"projectRowVersion":s.project["row_version"],"handoverBasisSnapshotId":h.map(|h|h["basis_snapshot_id"].clone()),"sourcePayloadHash":h.map(|h|h["source_payload_hash"].clone()),"currentSourcePayloadHash":s.hash,"sourceChanged":source_changed,"executionOwnerUserId":h.map(|h|h["execution_owner_user_id"].clone()),"financeConfirmationRequired":h.map(|h|h["finance_confirmation_required"].clone()),"version":h.map(|h|h["version"].clone()),
        "closureStatus":if source_changed{"review-required"}else if status=="confirmed"{"handover-confirmed-freeze-pending"}else if h.is_some(){"handover-in-progress"}else{"not-started"},"executionAdmission":{"allowed":false,"blockingReasons":["正式执行准入仍需 R5 同链有效提成角色冻结。"]},"handoverBasisItems":items,"frozenMaterials":materials}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn frozen_material_allowlist_keeps_operational_scope_and_risks_without_cost_or_source_payload()
    {
        let uid = Uuid::nil();
        let h = json!({"basis_snapshot_id":uid,"source_payload_hash":"h"});
        let member = json!({"contractId":uid,"snapshotId":uid,"amountTaxInclusive":"SECRET_AMOUNT","sourceFacts":{"salary":"SECRET_SALARY"},"handoverFacts":{"sourcePackageId":uid,"sourceVersion":2,"scopeItems":[{"id":uid,"packageId":uid,"scopeType":"deliverable","label":"范围","description":"冻结的交付范围","sortOrder":1,"unitPrice":"SECRET_RATE"}],"riskItems":[{"id":uid,"packageId":uid,"riskCategory":"交付","riskLevel":"low","riskDescription":"冻结的交付风险","impactScope":"范围","mitigationPlan":"已交底","ownerRole":"售前","riskStatus":"closed","blocksNextStage":false,"sortOrder":1}],"costItems":[{"amount":"SECRET_COST"}]}});
        let material = frozen_materials(&h, &[member]).expect("valid frozen source");
        let text = material.to_string();
        assert!(text.contains("冻结的交付范围"));
        assert!(text.contains("冻结的交付风险"));
        for hidden in [
            "SECRET_AMOUNT",
            "SECRET_SALARY",
            "SECRET_RATE",
            "SECRET_COST",
            "sourceFacts",
            "costItems",
        ] {
            assert!(!text.contains(hidden));
        }
        assert!(frozen_materials(&h, &[json!({"contractId":uid})]).is_none());
    }
}
