//! Registered sensitive engine adapter. The reversible group has one decision.
use crate::{
    approval_common::CommonSession,
    auth::{audit::insert_security_event, projection as sensitive},
    contract_support::{Actor, Error},
    project_operating_common::model::{FinancialProjection, SourceFinancialProjection},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};
use uuid::Uuid;

async fn group(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    project: Uuid,
    target: Uuid,
    labor: &str,
    value: Value,
    field: &str,
) -> Result<Value, Error> {
    let mut packages = vec![SensitiveFieldPackageKey::OperatingFinance];
    if labor != "no" {
        packages.push(SensitiveFieldPackageKey::LaborCostRate);
    }
    let user = sensitive::ProjectionUser {
        sub: actor.id,
        username: actor.session.user.username.clone(),
        permissions: actor
            .session
            .user
            .permissions
            .iter()
            .map(|p| p.as_str().to_owned())
            .collect(),
    };
    let mut selected = json!({"mode":"full","displayText":"已授权经营数据"});
    for package in &packages {
        let mut plan = sensitive::plan(&sensitive::ProjectionInput {
            field_package_key: *package,
            fields: vec![sensitive::StringField {
                key: field.into(),
                raw_value: Some(serde_json::to_string(&value).map_err(|_| Error::Internal)?),
                display_text_when_full: Some("已授权经营数据".into()),
                masked_display_text: None,
                denied_display_text: None,
            }],
            user: Some(user.clone()),
            target_type: "project-operating".into(),
            target_id: target.to_string(),
            request_context: actor.request_context.clone(),
            mode_when_unauthorized: None,
            masked_display_text: None,
            denied_display_text: None,
        })
        .map_err(|_| Error::Internal)?;
        if let Some(event) = plan.event.as_mut() {
            if let Some(details) = event.details.as_mut().and_then(Value::as_object_mut) {
                details.insert("projectId".into(), json!(project));
            }
            insert_security_event(session.connection, event).await?;
        }
        let projected = plan.fields.get(field).ok_or(Error::Internal)?;
        let p = serde_json::to_value(projected).map_err(|_| Error::Internal)?;
        let rank = |mode: &Value| match mode.as_str() {
            Some("denied") => 2,
            Some("masked") => 1,
            _ => 0,
        };
        if rank(&p["mode"]) > rank(&selected["mode"]) {
            selected = p;
        }
    }
    let full = selected["mode"] == "full";
    Ok(
        json!({"mode":selected["mode"],"displayText":selected["displayText"],"fieldPackageKeys":packages.iter().map(|p|p.as_str()).collect::<Vec<_>>(),"value":if full{value}else{Value::Null}}),
    )
}

pub(crate) fn money_fact(amount: &Value) -> Value {
    json!({"knowledge":amount["knowledge"],"value":amount["value"],"unknownReasonCode":amount["unknownReasonCode"],"evidenceRefs":amount["basisRefs"],"zeroProof":amount["zeroProof"]})
}

#[expect(
    clippy::too_many_arguments,
    reason = "Financial source facts and authorization are separate inputs to the masking boundary."
)]
pub(crate) async fn source(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    project: Uuid,
    target: Uuid,
    labor: &str,
    triple: &Value,
    rate: Option<&str>,
    detail: Option<&str>,
) -> Result<SourceFinancialProjection, Error> {
    let value = json!({"currency":triple["currency"],"net":money_fact(&triple["net"]),"tax":money_fact(&triple["tax"]),"gross":money_fact(&triple["gross"]),"rate":rate,"detailText":detail});
    serde_json::from_value(
        group(
            session,
            actor,
            project,
            target,
            labor,
            value,
            "sourceFinancialGroup",
        )
        .await?,
    )
    .map_err(|_| Error::Internal)
}

pub(crate) async fn financial(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    project: Uuid,
    target: Uuid,
    labor: &str,
    context: &Value,
    reason: Option<&str>,
) -> Result<FinancialProjection, Error> {
    let m = &context["metrics"];
    let value = json!({"effectiveContractNet":money_fact(&m["effectiveContractAmounts"]["net"]),"confirmedReceiptGross":money_fact(&m["confirmedReceiptAmounts"]["gross"]),"confirmedReceiptNet":money_fact(&m["confirmedReceiptAmounts"]["net"]),"includedCostNet":money_fact(&m["includedCostAmounts"]["net"]),"originalBaselineNet":money_fact(&context["baseline"]["originalNetCost"]),"currentBaselineNet":money_fact(&context["baseline"]["currentEffectiveNetCost"]),"taxPending":money_fact(&m["taxPendingAmount"]),"grossMarginNet":money_fact(&m["grossMarginNet"]),"grossMarginRate":m["grossMarginRate"]["value"],"grossMarginRateState":if m["grossMarginRate"]["knowledge"]=="known"{"known"}else if m["grossMarginRate"]["reasonCode"]=="zero-denominator"{"zero-denominator"}else{"unknown"},"taxSummary":Some("按已冻结税务依据；可抵扣税额不重复计入成本"),"allocationSummary":if context["allocations"].as_array().is_some_and(|v|!v.is_empty()){Some("已采用真实完整分摊批次的项目份额")}else{None},"unmappedSummary":if context["scope"]["unmappedCostCount"].as_u64().unwrap_or(0)>0{Some("存在未映射来源，需要真实成本记录")}else{None},"reasonText":reason});
    serde_json::from_value(
        group(
            session,
            actor,
            project,
            target,
            labor,
            value,
            "operatingFinancialGroup",
        )
        .await?,
    )
    .map_err(|_| Error::Internal)
}
