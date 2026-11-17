use super::{
    model::{self, ApprovePayout, CreatePayout, RegisterPayout, Request, SubmitPayout},
    payout_context::{self as context, Source},
    service::{check_version, projection_packet},
    settlement,
};
use crate::{
    approval::ApprovalService,
    approval_common::{CommonSession, js::Value as JsValue, service::object},
    contract_support::{Actor, Error, new_uuid},
    project_lifecycle::facts::{self, id, instant, next_version, text, version},
    project_operating_common::ResourceKeys,
    shared::generated::{CommissionPayoutStage as Stage, SensitiveFieldPackageKey},
};
use rust_decimal::Decimal;
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    keys: &ResourceKeys,
    request: &Request,
    actor: &Actor,
    approval: &ApprovalService,
) -> Result<Value, Error> {
    match (operation, request) {
        ("CommissionController_listPayouts", Request::None) => {
            let project = keys.project_id()?;
            facts::project(session, project, false).await?;
            let rows: Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('theoretical_cap_amount',p.theoretical_cap_amount::text,'approved_amount',p.approved_amount::text,'paid_record_amount',p.paid_record_amount::text) FROM poms.commission_payout p WHERE project_id=$1 ORDER BY created_at DESC,id")
                .bind(project).fetch_all(&mut *session.connection).await?;
            let mut result = Vec::with_capacity(rows.len());
            for row in rows {
                result.push(summary(session, &row, actor).await?);
            }
            Ok(json!(result))
        }
        ("CommissionController_createPayout", Request::CreatePayout(input)) => {
            create(session, keys.project_id()?, input, actor).await
        }
        ("CommissionController_submitPayoutApproval", Request::SubmitPayout(input)) => {
            submit(session, keys.id()?, input, actor).await
        }
        ("CommissionController_approvePayout", Request::ApprovePayout(input)) => {
            approve(session, keys.id()?, input, actor, approval).await
        }
        ("CommissionController_registerPayout", Request::RegisterPayout(input)) => {
            register(session, keys.id()?, input, actor).await
        }
        _ => Err(Error::Internal),
    }
}

async fn row(session: &mut CommonSession<'_, '_>, payout: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('theoretical_cap_amount',p.theoretical_cap_amount::text,'approved_amount',p.approved_amount::text,'paid_record_amount',p.paid_record_amount::text) FROM poms.commission_payout p WHERE id=$1 FOR UPDATE")
        .bind(payout).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::NotFound("提成发放记录不存在。".into()))
}
async fn anchor(session: &mut CommonSession<'_, '_>, payout: Uuid) -> Result<Uuid, Error> {
    sqlx::query_scalar("SELECT project_id FROM poms.commission_payout WHERE id=$1")
        .bind(payout)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("提成发放记录不存在。".into()))
}
fn stage(row: &Value) -> Result<Stage, Error> {
    text(row, "stage_type")?
        .parse()
        .map_err(|_| Error::Internal)
}
fn primary(row: &Value) -> Result<(), Error> {
    if row["payout_kind"] != "primary" {
        return Err(Error::Unprocessable(
            "补发记录由调整链生成，不支持单独审批或登记。".into(),
        ));
    }
    Ok(())
}

async fn calculation(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    calculation: Uuid,
) -> Result<Decimal, Error> {
    let pool: Option<String>=sqlx::query_scalar("SELECT commission_pool::text FROM poms.commission_calculation WHERE id=$1 AND project_id=$2 AND is_current AND status='effective' FOR SHARE")
        .bind(calculation).bind(project).fetch_optional(&mut *session.connection).await?;
    model::amount(
        &pool.ok_or_else(|| {
            Error::Conflict("发放必须引用本项目当前已确认生效的计算版本。".into())
        })?,
    )
}
async fn available(
    session: &mut CommonSession<'_, '_>,
    payout: &Value,
) -> Result<(Decimal, Source, bool), Error> {
    let project = id(payout, "project_id")?;
    let stage = stage(payout)?;
    let source = context::source(session, project, stage).await?;
    context::stage_eligible(session, project, stage, &source).await?;
    let pool = calculation(session, project, id(payout, "calculation_id")?).await?;
    let tier = text(payout, "selected_tier")?
        .parse()
        .map_err(|_| Error::Internal)?;
    let limit = context::cumulative_limit(pool, stage, tier, &source)?;
    let (paid, nonretention) = context::balances(session, project).await?;
    let used = if stage == Stage::Retention {
        paid
    } else {
        nonretention
    };
    let remaining = (limit - used).min(pool - paid);
    let zero_final = stage == Stage::Final
        && remaining == Decimal::ZERO
        && nonretention == limit
        && paid <= pool;
    Ok((remaining.max(Decimal::ZERO), source, zero_final))
}
async fn summary(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    let fields = projection_packet(
        session,
        actor,
        row,
        "commission-payout",
        SensitiveFieldPackageKey::CommissionCompensation,
        &[
            ("theoreticalCapAmountProjection", "theoretical_cap_amount"),
            ("approvedAmountProjection", "approved_amount"),
            ("paidRecordAmountProjection", "paid_record_amount"),
        ],
    )
    .await?;
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"calculationId":row["calculation_id"],"rowVersion":row["row_version"],"stageType":row["stage_type"],"payoutKind":row["payout_kind"],"sourcePayoutId":row["source_payout_id"],"selectedTier":row["selected_tier"],"theoreticalCapAmountProjection":fields["theoreticalCapAmountProjection"],"approvedAmountProjection":fields["approvedAmountProjection"],"paidRecordAmountProjection":fields["paidRecordAmountProjection"],"status":row["status"],"approvedAt":instant(&row["approved_at"]),"handledAt":instant(&row["handled_at"]),"createdAt":instant(&row["created_at"]),"updatedAt":instant(&row["updated_at"])}),
    )
}

async fn create(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    input: &CreatePayout,
    actor: &Actor,
) -> Result<Value, Error> {
    facts::project(session, project, true).await?;
    let pool = calculation(session, project, input.calculation_id).await?;
    let source = context::source(session, project, input.stage_type).await?;
    context::stage_eligible(session, project, input.stage_type, &source).await?;
    if input.stage_type == Stage::Retention {
        let snapshot = settlement::current(session, project)
            .await?
            .ok_or_else(|| Error::Unprocessable("质保金草稿须先完成非质保结算。".into()))?;
        settlement::references(&snapshot, &source)?;
        if snapshot["final_settlement_status"] != "pending-retention-settlement"
            || snapshot["non_retention_settlement_status"] != "settled-non-retention"
        {
            return Err(Error::Unprocessable("尚未进入质保金结算阶段。".into()));
        }
    }
    let exists: bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_payout WHERE project_id=$1 AND calculation_id=$2 AND stage_type=$3 AND payout_kind='primary')")
        .bind(project).bind(input.calculation_id).bind(input.stage_type.as_str()).fetch_one(&mut *session.connection).await?;
    if exists {
        return Err(Error::Conflict(
            "当前计算版本与发放阶段已有原始发放记录。".into(),
        ));
    }
    let (paid, nonretention) = context::balances(session, project).await?;
    let limit = context::cumulative_limit(pool, input.stage_type, input.selected_tier, &source)?;
    let used = if input.stage_type == Stage::Retention {
        paid
    } else {
        nonretention
    };
    let cap = (limit - used).min(pool - paid);
    let zero_final = input.stage_type == Stage::Final
        && cap == Decimal::ZERO
        && nonretention == limit
        && paid <= pool;
    if cap < Decimal::ZERO || (cap == Decimal::ZERO && !zero_final) {
        return Err(Error::Unprocessable("当前阶段无剩余可发放金额。".into()));
    }
    let payout = new_uuid()?;
    sqlx::query("INSERT INTO poms.commission_payout(id,project_id,calculation_id,stage_type,payout_kind,selected_tier,theoretical_cap_amount,status,created_by,updated_by) VALUES($1,$2,$3,$4,'primary',$5,$6,'draft',$7,$7)")
        .bind(payout).bind(project).bind(input.calculation_id).bind(input.stage_type.as_str()).bind(input.selected_tier.as_str()).bind(cap).bind(actor.id).execute(&mut *session.connection).await?;
    let after = row(session, payout).await?;
    facts::record(
        session,
        actor,
        "CommissionController_createPayout",
        "commission-payout",
        payout,
        project,
        None,
        after.clone(),
    )
    .await?;
    summary(session, &after, actor).await
}

fn validate_refs(input: &SubmitPayout, source: &Source) -> Result<(), Error> {
    if input
        .freeze_version_id
        .is_some_and(|v| source.freeze["id"] != v.to_string())
    {
        return Err(Error::Conflict("角色冻结版本已变化。".into()));
    }
    if let Some(review) = &source.review {
        if input
            .gate_review_record_id
            .is_some_and(|v| review["id"] != v.to_string())
            || input
                .summary_snapshot_id
                .is_some_and(|v| review["summary_snapshot_id"] != v.to_string())
        {
            return Err(Error::Conflict("经营评审或摘要引用已变化。".into()));
        }
    } else if input.gate_review_record_id.is_some() || input.summary_snapshot_id.is_some() {
        return Err(Error::Conflict("当前阶段没有匹配的经营评审引用。".into()));
    }
    if input
        .baseline_selection_source
        .as_ref()
        .is_some_and(|requested| {
            source
                .binding
                .as_ref()
                .is_none_or(|b| b["baseline_selection_source"] != requested.trim())
        })
    {
        return Err(Error::Conflict("经营基线选择来源不一致。".into()));
    }
    Ok(())
}
async fn ready(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    source: &Source,
    receipt: Option<Uuid>,
    departure: Option<Uuid>,
) -> Result<settlement::Evaluation, Error> {
    let snapshot = settlement::current(session, project)
        .await?
        .ok_or_else(|| Error::Unprocessable("缺少当前最终结算材料。".into()))?;
    settlement::references(&snapshot, source)?;
    if snapshot["non_retention_settlement_status"] != "settled-non-retention"
        || snapshot["retention_settlement_status"] == "settled-retention"
    {
        return Err(Error::Unprocessable(
            "当前结算不允许进入质保金发放。".into(),
        ));
    }
    let evaluation = settlement::evaluate(
        session,
        project,
        source,
        receipt.or_else(|| id(&snapshot, "retention_receipt_record_id").ok()),
        departure.or_else(|| id(&snapshot, "departure_exception_decision_id").ok()),
        false,
    )
    .await?;
    if evaluation.draft.retention_settlement_status != "ready-retention" {
        return Err(Error::Unprocessable(
            "质保期、到账、争议或责任承接条件尚未满足。".into(),
        ));
    }
    Ok(evaluation)
}
async fn submit(
    session: &mut CommonSession<'_, '_>,
    payout: Uuid,
    input: &SubmitPayout,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = anchor(session, payout).await?;
    facts::project(session, project, true).await?;
    let before = row(session, payout).await?;
    check_version(&before, input.expected_version)?;
    primary(&before)?;
    next_version(version(&before)?)?;
    if before["status"] != "draft" {
        return Err(Error::Conflict("仅草稿发放可提交审批。".into()));
    }
    if stage(&before)? != input.payout_stage {
        return Err(Error::BadRequest("发放阶段与记录不一致。".into()));
    }
    let (available, source, zero_final) = available(session, &before).await?;
    if available <= Decimal::ZERO && !zero_final {
        return Err(Error::Unprocessable("当前阶段发放余额已用尽。".into()));
    }
    validate_refs(input, &source)?;
    if input.payout_stage == Stage::Retention {
        let evaluation = ready(
            session,
            project,
            &source,
            input.retention_receipt_record_id,
            input.departure_exception_decision_id,
        )
        .await?;
        settlement::write(session, project, actor.id, &source, &evaluation).await?;
    }
    let approver: Uuid = sqlx::query_scalar(
        "SELECT id FROM poms.platform_user WHERE username='finance_mgr' AND is_active FOR SHARE",
    )
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::Unprocessable("缺少可用的提成审批账户finance_mgr。".into()))?;
    let pending: bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.approval_record WHERE target_object_type='commission-payout' AND target_object_id=$1 AND current_status='pending')")
        .bind(payout).fetch_one(&mut *session.connection).await?;
    if pending {
        return Err(Error::Conflict("本发放已有待处理审批。".into()));
    }
    let approval = new_uuid()?;
    let todo = new_uuid()?;
    let now = crate::auth::model::clock_now();
    sqlx::query("INSERT INTO poms.approval_record(id,approval_type,business_domain,target_object_type,target_object_id,project_id,current_status,current_node_key,initiator_user_id,current_approver_user_id,submitted_at) VALUES($1,'commission-payout-approval','commission','commission-payout',$2,$3,'pending','commission-payout-approval',$4,$5,$6)")
        .bind(approval).bind(payout).bind(project).bind(actor.id).bind(approver).bind(now).execute(&mut *session.connection).await?;
    sqlx::query("INSERT INTO poms.todo_item(id,source_type,source_id,todo_type,business_domain,target_object_type,target_object_id,project_id,title,assignee_user_id,status,priority) VALUES($1,'approval-record',$2,'approval','commission','commission-payout',$3,$4,$5,$6,'open','high')")
        .bind(todo).bind(approval).bind(payout).bind(project).bind(format!("提成发放审批：{}",input.payout_stage.as_str())).bind(approver).execute(&mut *session.connection).await?;
    sqlx::query("UPDATE poms.commission_payout SET status='pending-approval',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
        .bind(now).bind(actor.id).bind(payout).execute(&mut *session.connection).await?;
    let after = row(session, payout).await?;
    facts::record(session,actor,"CommissionController_submitPayoutApproval","commission-payout",payout,project,Some(before),json!({"payout":after,"approvalRecordId":approval,"todoItemId":todo,"comment":input.comment.as_deref().map(str::trim)})).await?;
    summary(session, &after, actor).await
}

pub(crate) async fn prepare_approval(
    session: &mut CommonSession<'_, '_>,
    payout: Uuid,
) -> Result<(), Error> {
    let project = anchor(session, payout).await?;
    facts::project(session, project, true).await?;
    let before = row(session, payout).await?;
    primary(&before)?;
    if before["status"] != "pending-approval" {
        return Err(Error::Conflict("发放不处于待审批状态。".into()));
    }
    let (remaining, source, zero_final) = available(session, &before).await?;
    let cap = context::money(&before, "theoretical_cap_amount")?.min(remaining);
    if cap <= Decimal::ZERO && !zero_final {
        return Err(Error::Unprocessable("当前阶段无可批准发放余额。".into()));
    }
    let amount = if before["approved_amount"].is_null() {
        cap
    } else {
        context::money(&before, "approved_amount")?
    };
    if amount > cap {
        return Err(Error::Unprocessable(
            "批准金额超过当前阶段可发放余额。".into(),
        ));
    }
    if stage(&before)? == Stage::Retention {
        ready(session, project, &source, None, None).await?;
    }
    sqlx::query("UPDATE poms.commission_payout SET approved_amount=$1 WHERE id=$2")
        .bind(amount)
        .bind(payout)
        .execute(&mut *session.connection)
        .await?;
    Ok(())
}
async fn approve(
    session: &mut CommonSession<'_, '_>,
    payout: Uuid,
    input: &ApprovePayout,
    actor: &Actor,
    service: &ApprovalService,
) -> Result<Value, Error> {
    // Both approval entry points lock the approval record before its project.
    let record: Option<(Uuid,i32,Uuid)>=sqlx::query_as("SELECT id,row_version,current_approver_user_id FROM poms.approval_record WHERE target_object_type='commission-payout' AND target_object_id=$1 AND approval_type='commission-payout-approval' AND current_status='pending' FOR UPDATE")
        .bind(payout).fetch_optional(&mut *session.connection).await?;
    let (approval, approval_version, approver) =
        record.ok_or_else(|| Error::Conflict("缺少本次发放的实际待处理审批。".into()))?;
    if approver != actor.id {
        return Err(Error::Forbidden("仅指定财务审批人可批准本次发放。".into()));
    }
    let project = anchor(session, payout).await?;
    facts::project(session, project, true).await?;
    let before = row(session, payout).await?;
    check_version(&before, input.expected_version)?;
    primary(&before)?;
    if let Some(amount) = input.approved_amount.as_deref() {
        sqlx::query("UPDATE poms.commission_payout SET approved_amount=$1 WHERE id=$2")
            .bind(model::amount(amount)?)
            .bind(payout)
            .execute(&mut *session.connection)
            .await?;
    }
    service
        .approve_with_session(
            session,
            JsValue::text(approval.to_string()),
            JsValue::text(actor.id.to_string()),
            object([(
                "expectedVersion",
                JsValue::Number(f64::from(approval_version)),
            )]),
        )
        .await?;
    let after = row(session, payout).await?;
    facts::record(
        session,
        actor,
        "CommissionController_approvePayout",
        "commission-payout",
        payout,
        project,
        Some(before),
        after.clone(),
    )
    .await?;
    summary(session, &after, actor).await
}

async fn register(
    session: &mut CommonSession<'_, '_>,
    payout: Uuid,
    input: &RegisterPayout,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = anchor(session, payout).await?;
    facts::project(session, project, true).await?;
    let before = row(session, payout).await?;
    check_version(&before, input.expected_version)?;
    primary(&before)?;
    next_version(version(&before)?)?;
    if before["status"] != "approved" {
        return Err(Error::Unprocessable("仅已批准发放可登记。".into()));
    }
    if stage(&before)? != input.payout_stage {
        return Err(Error::BadRequest("登记阶段与发放记录不一致。".into()));
    }
    let approval: Option<Uuid>=sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_type='commission-payout' AND target_object_id=$1 AND approval_type='commission-payout-approval' AND current_status='approved' AND decision='approved' ORDER BY submitted_at DESC,id DESC LIMIT 1")
        .bind(payout).fetch_optional(&mut *session.connection).await?;
    let approval = approval.ok_or_else(|| Error::Conflict("缺少本发放的实际批准记录。".into()))?;
    if input
        .approval_record_id
        .is_some_and(|requested| requested != approval)
    {
        return Err(Error::Conflict("审批引用不匹配本次发放。".into()));
    }
    let amount = model::amount(&input.paid_record_amount)?;
    let (remaining, source, _) = available(session, &before).await?;
    if amount > context::money(&before, "approved_amount")? || amount > remaining {
        return Err(Error::Unprocessable(
            "登记金额超过批准金额或当前阶段累计余额。".into(),
        ));
    }
    if input.payout_stage == Stage::Retention {
        let snapshot = settlement::current(session, project)
            .await?
            .ok_or_else(|| Error::Conflict("缺少当前结算摘要。".into()))?;
        if snapshot["summary_snapshot_id"]
            != input
                .summary_snapshot_id
                .map(|v| v.to_string())
                .map_or(Value::Null, Value::String)
        {
            return Err(Error::Conflict("质保金摘要引用已变化。".into()));
        }
        ready(session, project, &source, None, None).await?;
    }
    let now = crate::auth::model::clock_now();
    sqlx::query("UPDATE poms.commission_payout SET status='paid',paid_record_amount=$1,handled_at=$2,handled_by=$3,row_version=row_version+1,updated_at=$4,updated_by=$3 WHERE id=$5")
        .bind(amount).bind(input.paid_at.unwrap_or(now)).bind(actor.id).bind(now).bind(payout).execute(&mut *session.connection).await?;
    if matches!(input.payout_stage, Stage::Final | Stage::Retention) {
        settlement::refresh(session, project, actor.id).await?;
    }
    let after = row(session, payout).await?;
    facts::record(session,actor,"CommissionController_registerPayout","commission-payout",payout,project,Some(before),json!({"payout":after,"approvalRecordId":approval,"comment":input.comment.as_deref().map(str::trim)})).await?;
    summary(session, &after, actor).await
}
