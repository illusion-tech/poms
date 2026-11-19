use super::{
    contract_scope,
    model::{ApproveLowDown, Request},
    payout_context::{self as context, Source},
    service::projection_packet,
};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error, new_uuid},
    project_lifecycle::facts::{self, id, instant, version},
    shared::generated::{
        CommissionLowDownPaymentDecision as Decision, CommissionPayoutStage as Stage,
        SensitiveFieldPackageKey,
    },
};
use rust_decimal::Decimal;
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    project: Uuid,
    request: &Request,
    actor: &Actor,
) -> Result<Value, Error> {
    match (operation, request) {
        ("CommissionController_listLowDownPaymentReleases", Request::None) => {
            facts::project(session, project, true).await?;
            let source = match context::source(session, project, Stage::First).await {
                Ok(source) => Some(source),
                Err(
                    Error::Conflict(_)
                    | Error::Unprocessable(_)
                    | Error::NotFound(_)
                    | Error::CodedConflict { .. },
                ) => None,
                Err(error) => return Err(error),
            };
            let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.commission_low_down_payment_release r WHERE project_id=$1 ORDER BY approved_at DESC,id")
                .bind(project).fetch_all(&mut *session.connection).await?;
            let mut result = Vec::new();
            for row in rows {
                result.push(summary(session, &row, source.as_ref(), actor).await?);
            }
            let current_context = match &source {
                Some(source) => context_view(session, source, actor).await?,
                None => Value::Null,
            };
            Ok(
                json!({"projectId":project,"currentContext":current_context,"blockingReason":if source.is_none(){Some("当前冻结合同、回款或经营材料尚未齐备，请核实后刷新。") }else{None},"records":result}),
            )
        }
        ("CommissionController_approveLowDownPaymentRelease", Request::ApproveLowDown(input)) => {
            approve(session, project, input, actor).await
        }
        _ => Err(Error::Internal),
    }
}

async fn context_view(
    session: &mut CommonSession<'_, '_>,
    source: &Source,
    actor: &Actor,
) -> Result<Value, Error> {
    let ids = source.terms.iter().map(|t| t.contract).collect::<Vec<_>>();
    let names: Vec<(Uuid, String)> =
        sqlx::query_as("SELECT id,contract_no FROM poms.contract WHERE id=ANY($1)")
            .bind(&ids)
            .fetch_all(&mut *session.connection)
            .await?;
    let mut contracts = Vec::new();
    for term in &source.terms {
        let input = json!({"id":term.contract,"amount":format!("{:.2}",term.amount),"receipts":format!("{:.2}",term.receipts)});
        let fields = projection_packet(
            session,
            actor,
            &input,
            "contract",
            SensitiveFieldPackageKey::ContractFinance,
            &[
                ("amountTaxExclusiveProjection", "amount"),
                ("confirmedReceiptsTaxExclusiveProjection", "receipts"),
            ],
        )
        .await?;
        let low = term.down < Decimal::new(20, 2);
        let mut decisions = Vec::new();
        if low && !source.released.contains(&term.contract) {
            if !source.raised.contains(&term.contract)
                && contract_scope::receipt_eligible(
                    &source.terms,
                    source.mode,
                    term,
                    Decimal::new(20, 2),
                )?
            {
                decisions.push(Decision::RaiseFirstCap.as_str());
            }
            if contract_scope::receipt_eligible(
                &source.terms,
                source.mode,
                term,
                Decimal::new(50, 2),
            )? {
                decisions.push(Decision::ReleaseStandard.as_str());
            }
        }
        let name = names
            .iter()
            .find(|(id, _)| *id == term.contract)
            .ok_or(Error::Internal)?;
        contracts.push(json!({"contractId":term.contract,"contractNo":name.1,"amountTaxExclusiveProjection":fields["amountTaxExclusiveProjection"],"confirmedReceiptsTaxExclusiveProjection":fields["confirmedReceiptsTaxExclusiveProjection"],"lowDownPayment":low,"availableDecisions":decisions}));
    }
    Ok(
        json!({"freezeVersionId":source.freeze["id"],"expectedFreezeVersion":source.freeze["row_version"],"sourceHandoverId":source.freeze["source_handover_id"],"receiptJudgmentMode":source.mode.as_str(),"contracts":contracts}),
    )
}
async fn summary(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    source: Option<&Source>,
    actor: &Actor,
) -> Result<Value, Error> {
    let reason = projection_packet(
        session,
        actor,
        row,
        "commission-low-down-payment-release",
        SensitiveFieldPackageKey::ExceptionApprovalOpinion,
        &[("reasonProjection", "reason")],
    )
    .await?;
    let applicable = source
        .map(|s| context::release_applies(s, row))
        .transpose()?
        .unwrap_or(false);
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"freezeVersionId":row["freeze_version_id"],"sourceHandoverId":row["source_handover_id"],"contractIds":row["contract_ids"],"decision":row["decision"],"reasonProjection":reason["reasonProjection"],"approvedBy":row["approved_by"],"approvedAt":instant(&row["approved_at"]),"rowVersion":row["row_version"],"currentApplicable":applicable}),
    )
}
async fn approve(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    input: &ApproveLowDown,
    actor: &Actor,
) -> Result<Value, Error> {
    let p = facts::project(session, project, true).await?;
    if !matches!(
        p["current_stage"].as_str(),
        Some("execution" | "acceptance" | "completed" | "conditional-completed")
    ) || matches!(p["status"].as_str(), Some("blocked" | "closed"))
    {
        return Err(Error::Conflict(
            "须先完成实际实施准入并解除当前经营阻断。".into(),
        ));
    }
    let source = context::source(session, project, Stage::First).await?;
    if id(&source.freeze, "id")? != input.freeze_version_id
        || version(&source.freeze)? != input.expected_freeze_version
    {
        return Err(Error::Conflict("批准引用的当前冻结版本已变化。".into()));
    }
    let threshold = if input.decision == Decision::ReleaseStandard {
        Decimal::new(50, 2)
    } else {
        Decimal::new(20, 2)
    };
    let mut selected = input.contract_ids.clone();
    selected.sort();
    for contract in &selected {
        let term = source
            .terms
            .iter()
            .find(|t| t.contract == *contract)
            .ok_or_else(|| Error::BadRequest("批准合同不在当前冻结合同集合中。".into()))?;
        if term.down >= Decimal::new(20, 2) {
            return Err(Error::Unprocessable("所选合同不适用低首付款特例。".into()));
        }
        if !contract_scope::receipt_eligible(&source.terms, source.mode, term, threshold)? {
            return Err(Error::Unprocessable(
                "实际回款未达到本次管理层批准的20%/50%门槛。".into(),
            ));
        }
        let already = if input.decision == Decision::ReleaseStandard {
            source.released.contains(contract)
        } else {
            source.raised.contains(contract) || source.released.contains(contract)
        };
        if already {
            return Err(Error::Conflict(
                "所选合同已有当前适用的同类或更高管理层批准。".into(),
            ));
        }
    }
    let receipts:Vec<Uuid>=sqlx::query_scalar("SELECT id FROM poms.receipt_record WHERE project_id=$1 AND contract_id=ANY($2) AND status='confirmed' ORDER BY id")
        .bind(project).bind(source.terms.iter().map(|t|t.contract).collect::<Vec<_>>()).fetch_all(&mut *session.connection).await?;
    let criteria = json!({"receiptJudgmentMode":source.mode.as_str(),"confirmedReceiptIds":receipts,"contracts":source.terms.iter().map(|t|json!({"contractId":t.contract,"snapshotId":t.snapshot,"amountTaxExclusive":t.amount.to_string(),"downPaymentRate":t.down.to_string(),"confirmedReceipts":t.receipts.to_string(),"currencyCode":t.currency})).collect::<Vec<_>>()});
    let record = new_uuid()?;
    let row:Value=sqlx::query_scalar("INSERT INTO poms.commission_low_down_payment_release AS r(id,project_id,freeze_version_id,freeze_row_version,source_handover_id,contract_ids,source_contract_scope,decision,reason,conditions_confirmed,criteria,approved_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11) RETURNING to_jsonb(r)")
        .bind(record).bind(project).bind(input.freeze_version_id).bind(input.expected_freeze_version).bind(id(&source.freeze,"source_handover_id")?).bind(json!(selected)).bind(contract_scope::references(&source.terms)).bind(input.decision.as_str()).bind(input.reason.trim()).bind(criteria).bind(actor.id).fetch_one(&mut *session.connection).await?;
    facts::record(
        session,
        actor,
        "CommissionController_approveLowDownPaymentRelease",
        "commission-low-down-payment-release",
        record,
        project,
        None,
        row.clone(),
    )
    .await?;
    summary(session, &row, Some(&source), actor).await
}
