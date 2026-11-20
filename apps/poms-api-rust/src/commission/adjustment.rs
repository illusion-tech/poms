use super::{
    cash_allocation as cash, contract_scope,
    model::{self, CreateAdjustment, Request},
    payout_context,
    service::{check_version, projection_packet},
};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error, new_uuid},
    project_lifecycle::facts::{self, id, instant, next_version, text, version},
    project_operating_common::ResourceKeys,
    shared::generated::{
        CommissionAdjustmentType as Kind, CommissionPayoutStage, CommissionPayoutTier,
        SensitiveFieldPackageKey,
    },
};
use rust_decimal::Decimal;
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    keys: &ResourceKeys,
    input: &Request,
    actor: &Actor,
) -> Result<Value, Error> {
    match (operation, input) {
        ("CommissionController_listAdjustments", Request::None) => {
            let project = keys.project_id()?;
            facts::project(session, project, false).await?;
            let rows: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(a)||jsonb_build_object('amount',a.amount::text) FROM poms.commission_adjustment a WHERE project_id=$1 ORDER BY created_at DESC,id")
                .bind(project).fetch_all(&mut *session.connection).await?;
            let mut values = Vec::with_capacity(rows.len());
            for row in rows {
                values.push(summary(session, &row, actor).await?);
            }
            Ok(json!(values))
        }
        ("CommissionController_createAdjustment", Request::CreateAdjustment(input)) => {
            create(session, keys.project_id()?, input, actor).await
        }
        ("CommissionController_submitAdjustmentApproval", Request::AdjustmentVersion(input)) => {
            submit(session, keys.id()?, input.expected_version, actor).await
        }
        ("CommissionController_executeAdjustment", Request::AdjustmentVersion(input)) => {
            execute_approved(session, keys.id()?, input.expected_version, actor).await
        }
        _ => Err(Error::Internal),
    }
}

async fn supplement_capacity(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    payout: &Value,
) -> Result<(payout_context::Source, Vec<(Uuid, Decimal)>), Error> {
    eligible(payout, &["paid", "suspended"])?;
    let stage: CommissionPayoutStage = text(payout, "stage_type")?
        .parse()
        .map_err(|_| Error::Internal)?;
    let tier: CommissionPayoutTier = text(payout, "selected_tier")?
        .parse()
        .map_err(|_| Error::Internal)?;
    let source = payout_context::source(session, project, stage).await?;
    payout_context::stage_eligible(session, project, stage, &source).await?;
    cash::check_scope(payout, &source)?;
    if stage == CommissionPayoutStage::Retention {
        super::payout::ready(session, project, &source, None, None).await?;
    }
    let pool:Option<String>=sqlx::query_scalar("SELECT commission_pool::text FROM poms.commission_calculation WHERE project_id=$1 AND is_current AND status='effective'").bind(project).fetch_optional(&mut *session.connection).await?;
    let pool = model::amount(
        &pool.ok_or_else(|| Error::Conflict("补发须引用当前已批准的提成池。".into()))?,
    )?;
    let (remaining, _) = cash::remaining(session, project, pool, stage, tier, &source).await?;
    Ok((source, remaining))
}

pub(crate) async fn prepare_approval(
    session: &mut CommonSession<'_, '_>,
    adjustment: Uuid,
) -> Result<(), Error> {
    let project = locked_project(session, adjustment).await?;
    let before = row(session, adjustment).await?;
    if before["adjustment_type"] != "supplement" {
        return Ok(());
    }
    if before["status"] != "pending-approval" {
        return Err(Error::Conflict("补发不处于待审批状态。".into()));
    }
    let payout = payout(session, id(&before, "related_payout_id")?, project).await?;
    let amount = model::amount(text(&before, "amount")?)?;
    let (source, remaining) = supplement_capacity(session, project, &payout).await?;
    if amount <= Decimal::ZERO || amount > contract_scope::sum(remaining.iter().map(|(_, v)| *v))? {
        return Err(Error::Unprocessable(
            "补发超过当前达标合同、阶段或项目余额。".into(),
        ));
    }
    let allocations = cash::packet(&source, &contract_scope::apportion(amount, &remaining)?)?;
    sqlx::query("UPDATE poms.commission_adjustment SET source_contract_scope=$1,approved_contract_allocations=$2 WHERE id=$3")
        .bind(cash::scope(&source)).bind(allocations).bind(adjustment).execute(&mut *session.connection).await?;
    Ok(())
}

async fn row(session: &mut CommonSession<'_, '_>, adjustment: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar("SELECT to_jsonb(a)||jsonb_build_object('amount',a.amount::text) FROM poms.commission_adjustment a WHERE id=$1 FOR UPDATE")
        .bind(adjustment).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::NotFound("提成调整不存在。".into()))
}

async fn payout(
    session: &mut CommonSession<'_, '_>,
    payout: Uuid,
    project: Uuid,
) -> Result<Value, Error> {
    sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('paid_record_amount',p.paid_record_amount::text,'approved_amount',p.approved_amount::text,'theoretical_cap_amount',p.theoretical_cap_amount::text) FROM poms.commission_payout p WHERE id=$1 AND project_id=$2 FOR UPDATE")
        .bind(payout).bind(project).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::NotFound("本项目的提成发放记录不存在。".into()))
}

async fn locked_project(
    session: &mut CommonSession<'_, '_>,
    adjustment: Uuid,
) -> Result<Uuid, Error> {
    let project: Uuid =
        sqlx::query_scalar("SELECT project_id FROM poms.commission_adjustment WHERE id=$1")
            .bind(adjustment)
            .fetch_optional(&mut *session.connection)
            .await?
            .ok_or_else(|| Error::NotFound("提成调整不存在。".into()))?;
    facts::project(session, project, true).await?;
    Ok(project)
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
        "commission-adjustment",
        SensitiveFieldPackageKey::CommissionCompensation,
        &[
            ("amountProjection", "amount"),
            ("reasonProjection", "reason"),
        ],
    )
    .await?;
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"rowVersion":row["row_version"],"adjustmentType":row["adjustment_type"],"relatedPayoutId":row["related_payout_id"],"relatedCalculationId":row["related_calculation_id"],"amountProjection":fields["amountProjection"],"reasonProjection":fields["reasonProjection"],"status":row["status"],"executedAt":instant(&row["executed_at"]),"createdAt":instant(&row["created_at"]),"updatedAt":instant(&row["updated_at"])}),
    )
}

fn primary(payout: &Value) -> Result<(), Error> {
    if payout["payout_kind"] != "primary" {
        return Err(Error::Unprocessable(
            "调整只能作用于原始发放，不能改挂补发记录。".into(),
        ));
    }
    Ok(())
}
fn eligible(payout: &Value, statuses: &[&str]) -> Result<(), Error> {
    primary(payout)?;
    if !statuses.iter().any(|status| payout["status"] == *status) {
        return Err(Error::Unprocessable("发放当前状态不允许本次调整。".into()));
    }
    Ok(())
}

async fn create(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    input: &CreateAdjustment,
    actor: &Actor,
) -> Result<Value, Error> {
    facts::project(session, project, true).await?;
    if input.adjustment_type == Kind::Recalculate {
        return Err(Error::Unprocessable("重算须使用专用重算命令。".into()));
    }
    let payout_id = input
        .related_payout_id
        .ok_or_else(|| Error::Unprocessable("本调整必须关联原始发放记录。".into()))?;
    let payout = payout(session, payout_id, project).await?;
    primary(&payout)?;
    let calculation = id(&payout, "calculation_id")?;
    if input
        .related_calculation_id
        .is_some_and(|requested| requested != calculation)
    {
        return Err(Error::Unprocessable(
            "调整的计算版本必须与关联发放一致。".into(),
        ));
    }
    match input.adjustment_type {
        Kind::SuspendPayout => eligible(&payout, &["approved", "paid"])?,
        Kind::ReversePayout => eligible(&payout, &["paid", "suspended"])?,
        _ => (),
    }
    let amount = input.amount.as_deref().map(model::amount).transpose()?;
    if amount.is_some_and(|value| value <= Decimal::ZERO)
        || (matches!(input.adjustment_type, Kind::Clawback | Kind::Supplement) && amount.is_none())
    {
        return Err(Error::Unprocessable("扣回和补发必须填写正数金额。".into()));
    }
    let adjustment = new_uuid()?;
    sqlx::query("INSERT INTO poms.commission_adjustment(id,project_id,adjustment_type,related_payout_id,related_calculation_id,amount,reason,status,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,'draft',$8,$8)")
        .bind(adjustment).bind(project).bind(input.adjustment_type.as_str()).bind(payout_id).bind(calculation).bind(amount).bind(input.reason.trim()).bind(actor.id)
        .execute(&mut *session.connection).await?;
    let after = row(session, adjustment).await?;
    facts::record(
        session,
        actor,
        "CommissionController_createAdjustment",
        "commission-adjustment",
        adjustment,
        project,
        None,
        after.clone(),
    )
    .await?;
    summary(session, &after, actor).await
}

async fn submit(
    session: &mut CommonSession<'_, '_>,
    adjustment: Uuid,
    expected: Option<i32>,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = locked_project(session, adjustment).await?;
    let before = row(session, adjustment).await?;
    check_version(&before, expected)?;
    next_version(version(&before)?)?;
    if before["status"] != "draft" {
        return Err(Error::Conflict("仅草稿调整可提交审批。".into()));
    }
    let pending: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.approval_record WHERE approval_type='commission-adjustment-approval' AND target_object_type='commission-adjustment' AND target_object_id=$1 AND current_status='pending')")
        .bind(adjustment).fetch_one(&mut *session.connection).await?;
    if pending {
        return Err(Error::Conflict("本调整已有待处理审批。".into()));
    }
    // Use the existing business approver account, resolved from live platform
    // data. Never create an approver or substitute the initiating actor.
    let approver: Uuid = sqlx::query_scalar(
        "SELECT id FROM poms.platform_user WHERE username='finance_mgr' AND is_active FOR SHARE",
    )
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::Unprocessable("缺少可用的提成审批账户finance_mgr。".into()))?;
    let approval = new_uuid()?;
    let todo = new_uuid()?;
    let now = crate::auth::model::clock_now();
    sqlx::query("INSERT INTO poms.approval_record(id,approval_type,business_domain,target_object_type,target_object_id,project_id,current_status,current_node_key,initiator_user_id,current_approver_user_id,submitted_at) VALUES($1,'commission-adjustment-approval','commission','commission-adjustment',$2,$3,'pending','commission-adjustment-approval',$4,$5,$6)")
        .bind(approval).bind(adjustment).bind(project).bind(actor.id).bind(approver).bind(now).execute(&mut *session.connection).await?;
    // The reason is a protected compensation field. Keep it in the detail
    // projection rather than copying clear text into an ordinary todo summary.
    sqlx::query("INSERT INTO poms.todo_item(id,source_type,source_id,todo_type,business_domain,target_object_type,target_object_id,project_id,title,assignee_user_id,status,priority) VALUES($1,'approval-record',$2,'approval','commission','commission-adjustment',$3,$4,$5,$6,'open','high')")
        .bind(todo).bind(approval).bind(adjustment).bind(project).bind(format!("提成调整审批：{}",text(&before,"adjustment_type")?)).bind(approver).execute(&mut *session.connection).await?;
    sqlx::query("UPDATE poms.commission_adjustment SET status='pending-approval',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
        .bind(now).bind(actor.id).bind(adjustment).execute(&mut *session.connection).await?;
    let after = row(session, adjustment).await?;
    facts::record(
        session,
        actor,
        "CommissionController_submitAdjustmentApproval",
        "commission-adjustment",
        adjustment,
        project,
        Some(before),
        json!({"adjustment":after,"approvalRecordId":approval,"todoItemId":todo}),
    )
    .await?;
    summary(session, &after, actor).await
}

async fn execute_approved(
    session: &mut CommonSession<'_, '_>,
    adjustment: Uuid,
    expected: Option<i32>,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = locked_project(session, adjustment).await?;
    let before = row(session, adjustment).await?;
    check_version(&before, expected)?;
    next_version(version(&before)?)?;
    if before["status"] != "approved" {
        return Err(Error::Unprocessable("仅已批准调整可执行。".into()));
    }
    let approved: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.approval_record WHERE approval_type='commission-adjustment-approval' AND target_object_type='commission-adjustment' AND target_object_id=$1 AND current_status='approved' AND decision='approved')")
        .bind(adjustment).fetch_one(&mut *session.connection).await?;
    if !approved {
        return Err(Error::Conflict("缺少本调整的实际批准记录。".into()));
    }
    let payout_id = id(&before, "related_payout_id")
        .map_err(|_| Error::Unprocessable("调整缺少原始发放引用。".into()))?;
    let payout = payout(session, payout_id, project).await?;
    if before["related_calculation_id"] != payout["calculation_id"] {
        return Err(Error::Conflict("调整与原始发放的计算版本已不一致。".into()));
    }
    let now = crate::auth::model::clock_now();
    let next_status = match text(&before, "adjustment_type")? {
        "suspend-payout" => {
            eligible(&payout, &["approved", "paid"])?;
            Some("suspended")
        }
        "reverse-payout" => {
            eligible(&payout, &["paid", "suspended"])?;
            Some("reversed")
        }
        "clawback" => {
            eligible(&payout, &["paid", "suspended"])?;
            let amount = model::amount(text(&before, "amount")?)?;
            let paid = model::amount(text(&payout, "paid_record_amount")?)?;
            let (previous, complete): (Decimal,bool) = sqlx::query_as("SELECT COALESCE(SUM(amount),0),COALESCE(bool_and(amount IS NOT NULL AND amount>0),true) FROM poms.commission_adjustment WHERE related_payout_id=$1 AND adjustment_type='clawback' AND status='executed'")
                .bind(payout_id).fetch_one(&mut *session.connection).await?;
            if !complete {
                return Err(Error::Conflict(
                    "历史扣回金额不完整，须先核实，不能按零处理。".into(),
                ));
            }
            let total = previous.checked_add(amount).ok_or(Error::Internal)?;
            if amount <= Decimal::ZERO || total > paid {
                return Err(Error::Unprocessable(
                    "累计扣回不能超过原始已登记发放金额。".into(),
                ));
            }
            Some(if total == paid {
                "reversed"
            } else {
                "suspended"
            })
        }
        "supplement" => {
            let amount = model::amount(text(&before, "amount")?)?;
            if amount <= Decimal::ZERO {
                return Err(Error::Unprocessable("补发金额必须为正数。".into()));
            }
            let (source, remaining) = supplement_capacity(session, project, &payout).await?;
            if before["source_contract_scope"].is_null()
                || before["approved_contract_allocations"].is_null()
            {
                return Err(Error::Conflict(
                    "补发缺少实际批准的合同分摊，须重新核实审批。".into(),
                ));
            }
            cash::check_scope(&before, &source)?;
            let approved = cash::parse(&before["approved_contract_allocations"], amount, &source)?;
            if approved.iter().any(|(id, amount)| {
                *amount
                    > remaining
                        .iter()
                        .find(|(contract, _)| contract == id)
                        .map_or(Decimal::ZERO, |(_, cap)| *cap)
            }) {
                return Err(Error::Unprocessable(
                    "实际批准合同的补发余额已变化，不能转移至其他合同。".into(),
                ));
            }
            let allocations = cash::packet(&source, &approved)?;
            sqlx::query("INSERT INTO poms.commission_payout(id,project_id,calculation_id,stage_type,payout_kind,source_payout_id,selected_tier,theoretical_cap_amount,approved_amount,paid_record_amount,status,approved_at,approved_by,handled_at,handled_by,created_by,updated_by,source_contract_scope,approved_contract_allocations,paid_contract_allocations) VALUES($1,$2,$3,$4,'supplement',$5,$6,$7,$7,$7,'paid',$8,$9,$8,$9,$9,$9,$10,$11,$11)")
                .bind(new_uuid()?).bind(project).bind(id(&payout,"calculation_id")?).bind(text(&payout,"stage_type")?).bind(payout_id).bind(text(&payout,"selected_tier")?).bind(amount).bind(now).bind(actor.id)
                .bind(cash::scope(&source)).bind(allocations)
                .execute(&mut *session.connection).await?;
            None
        }
        _ => return Err(Error::Unprocessable("重算只能由专用计算命令执行。".into())),
    };
    if let Some(status) = next_status {
        next_version(version(&payout)?)?;
        sqlx::query("UPDATE poms.commission_payout SET status=$1,handled_at=$2,handled_by=$3,row_version=row_version+1,updated_at=$2,updated_by=$3 WHERE id=$4")
            .bind(status).bind(now).bind(actor.id).bind(payout_id).execute(&mut *session.connection).await?;
    }
    sqlx::query("UPDATE poms.commission_adjustment SET status='executed',executed_at=$1,executed_by=$2,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
        .bind(now).bind(actor.id).bind(adjustment).execute(&mut *session.connection).await?;
    super::settlement::refresh(session, project, actor.id).await?;
    let after = row(session, adjustment).await?;
    facts::record(
        session,
        actor,
        "CommissionController_executeAdjustment",
        "commission-adjustment",
        adjustment,
        project,
        Some(before),
        json!({"adjustment":after,"sourcePayoutBefore":payout,"sourcePayoutAfter":next_status}),
    )
    .await?;
    summary(session, &after, actor).await
}
