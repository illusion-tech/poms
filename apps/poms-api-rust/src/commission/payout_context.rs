use super::model;
use crate::{
    approval_common::CommonSession,
    contract_support::Error,
    project_lifecycle::facts::{id, text},
    shared::generated::{CommissionPayoutStage as Stage, CommissionPayoutTier as Tier},
};
use rust_decimal::{Decimal, RoundingStrategy};
use serde_json::Value;
use std::{collections::BTreeMap, str::FromStr};
use uuid::Uuid;

pub(super) struct Source {
    pub freeze: Value,
    pub term: Value,
    pub binding: Option<Value>,
    pub review: Option<Value>,
}

pub(super) fn money(row: &Value, field: &str) -> Result<Decimal, Error> {
    row[field]
        .as_str()
        .ok_or_else(|| Error::Conflict(format!("{field}金额未知，不能按零处理。")))
        .and_then(|raw| {
            model::amount(raw).map_err(|_| Error::Conflict(format!("{field}不是有效金额。")))
        })
}
pub(super) fn fraction(row: &Value, field: &str) -> Result<Decimal, Error> {
    let value = row[field]
        .as_str()
        .and_then(|s| Decimal::from_str(s).ok())
        .filter(|v| *v >= Decimal::ZERO && *v <= Decimal::ONE)
        .ok_or_else(|| Error::Conflict(format!("合同{field}比例未明确。")))?;
    Ok(value)
}
pub(super) fn rounded(value: Decimal) -> Decimal {
    value.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero)
}
pub(super) fn blocked(value: &Value, key: &str, review_blocks: bool) -> bool {
    value[key].as_str().is_some_and(|s| {
        let s = s.trim().to_ascii_lowercase();
        s == "block"
            || s.starts_with("block-")
            || (review_blocks && (s == "review" || s.starts_with("review-")))
    })
}

pub(super) async fn source(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    stage: Stage,
) -> Result<Source, Error> {
    let freeze: Value = sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.commission_role_assignment a WHERE project_id=$1 AND is_current AND status='frozen' FOR SHARE")
        .bind(project).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::Unprocessable("缺少当前已冻结角色分配。".into()))?;
    let handover = id(&freeze, "source_handover_id")
        .map_err(|_| Error::Conflict("冻结角色缺少实际移交来源。".into()))?;
    let baseline = id(&freeze, "effective_handover_baseline_snapshot_id")
        .map_err(|_| Error::Conflict("冻结角色缺少合同基线来源。".into()))?;
    let valid: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_handover WHERE id=$1 AND project_id=$2 AND status='confirmed' AND is_current AND effective_handover_baseline_snapshot_id=$3)")
        .bind(handover).bind(project).bind(baseline).fetch_one(&mut *session.connection).await?;
    if !valid {
        return Err(Error::Conflict("冻结角色与当前已确认移交不一致。".into()));
    }
    let active: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM poms.contract WHERE project_id=$1 AND status='active'",
    )
    .bind(project)
    .fetch_one(&mut *session.connection)
    .await?;
    if active != 1 {
        return Err(Error::Conflict(
            "发放需要明确唯一合同冻结口径，不能推测多合同资格。".into(),
        ));
    }
    let term: Value = sqlx::query_scalar("SELECT to_jsonb(t)||jsonb_build_object('amount_tax_exclusive',t.amount_tax_exclusive::text,'down_payment_rate',t.down_payment_rate::text,'retention_rate',t.retention_rate::text) FROM poms.contract_term_snapshot t JOIN poms.contract c ON c.id=t.contract_id AND c.current_snapshot_id=t.id WHERE t.id=$1 AND c.project_id=$2 AND c.status='active' AND t.snapshot_status='active' FOR SHARE OF t,c")
        .bind(baseline).bind(project).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::Conflict("冻结合同基线已变化，请先明确发放依据。".into()))?;
    fraction(&term, "retention_rate")?;
    let selected_stage = if stage == Stage::Retention {
        "final"
    } else {
        stage.as_str()
    };
    let binding: Option<Value> = sqlx::query_scalar("SELECT to_jsonb(b) FROM poms.operating_signal_gate_binding b WHERE project_id=$1 AND gate_stage_type=$2 AND status='active' ORDER BY generated_at DESC,id LIMIT 1 FOR SHARE")
        .bind(project).bind(selected_stage).fetch_optional(&mut *session.connection).await?;
    let review = if let Some(binding) = &binding {
        sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.commission_gate_review_record r WHERE binding_id=$1 AND status='active' ORDER BY handled_at DESC,created_at DESC,id LIMIT 1 FOR SHARE")
            .bind(id(binding,"id")?).fetch_optional(&mut *session.connection).await?
    } else {
        None
    };
    if matches!(stage, Stage::Final | Stage::Retention) && (binding.is_none() || review.is_none()) {
        return Err(Error::Unprocessable(
            "最终发放/质保金缺少当前实际经营评审。".into(),
        ));
    }
    if binding
        .as_ref()
        .is_some_and(|b| blocked(b, "binding_action", stage == Stage::Retention))
        || review
            .as_ref()
            .is_some_and(|r| blocked(r, "gate_review_decision", stage == Stage::Retention))
    {
        return Err(Error::Unprocessable("当前经营评审不允许本次发放。".into()));
    }
    let open: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_freeze_dispute_record WHERE freeze_version_id=$1 AND status='submitted')")
        .bind(id(&freeze,"id")?).fetch_one(&mut *session.connection).await?;
    if open {
        return Err(Error::Unprocessable("冻结版本仍有未收口争议。".into()));
    }
    Ok(Source {
        freeze,
        term,
        binding,
        review,
    })
}

pub(super) async fn stage_eligible(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    stage: Stage,
    source: &Source,
) -> Result<(), Error> {
    if stage == Stage::Retention {
        return Ok(());
    }
    let amount = money(&source.term, "amount_tax_exclusive")?;
    if amount <= Decimal::ZERO {
        return Err(Error::Unprocessable(
            "合同不含税金额必须明确且为正数。".into(),
        ));
    }
    let receipts: Decimal = sqlx::query_scalar("SELECT COALESCE(SUM(receipt_amount),0) FROM poms.receipt_record WHERE project_id=$1 AND contract_id=$2 AND status='confirmed'")
        .bind(project).bind(id(&source.term,"contract_id")?).fetch_one(&mut *session.connection).await?;
    let threshold = match stage {
        Stage::First => Decimal::new(20, 2),
        Stage::Second => Decimal::new(80, 2),
        _ => Decimal::ONE - fraction(&source.term, "retention_rate")?,
    };
    if receipts < amount.checked_mul(threshold).ok_or(Error::Internal)? {
        return Err(Error::Unprocessable(
            "当前实际回款未达到本阶段发放条件。".into(),
        ));
    }
    if stage == Stage::Second {
        let accepted: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.acceptance_record WHERE project_id=$1 AND status='confirmed' AND acceptance_type IN ('stage-outcome','stage-acceptance') AND acceptance_result='accepted' AND confirmed_at IS NOT NULL AND btrim(evidence_summary)<>'')")
            .bind(project).fetch_one(&mut *session.connection).await?;
        if !accepted {
            return Err(Error::Unprocessable(
                "第二阶段缺少已确认且有证据摘要的阶段验收。".into(),
            ));
        }
    }
    Ok(())
}

pub(super) fn cumulative_limit(
    pool: Decimal,
    stage: Stage,
    tier: Tier,
    source: &Source,
) -> Result<Decimal, Error> {
    let retention = fraction(&source.term, "retention_rate")?;
    let percent = match stage {
        Stage::First if fraction(&source.term, "down_payment_rate")? < Decimal::new(20, 2) => {
            if tier == Tier::Basic {
                10
            } else {
                15
            }
        }
        Stage::First => match tier {
            Tier::Basic => 20,
            Tier::Mid => 25,
            Tier::Premium => 30,
        },
        Stage::Second => match tier {
            Tier::Basic => 70,
            Tier::Mid => 75,
            Tier::Premium => 80,
        },
        _ => 100,
    };
    let rate = if stage == Stage::Retention {
        Decimal::ONE
    } else {
        Decimal::new(percent, 2).min(Decimal::ONE - retention)
    };
    pool.checked_mul(rate).map(rounded).ok_or(Error::Internal)
}

/// Read the existing cash records, including older calculation versions and
/// supplements. A pause does not erase cash already registered as paid.
pub(super) async fn balances(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
) -> Result<(Decimal, Decimal), Error> {
    let clawbacks: Vec<(Uuid,Option<Decimal>,bool)> = sqlx::query_as("SELECT related_payout_id,SUM(amount),COALESCE(bool_and(amount IS NOT NULL AND amount>0),false) FROM poms.commission_adjustment WHERE project_id=$1 AND status='executed' AND adjustment_type='clawback' GROUP BY related_payout_id")
        .bind(project).fetch_all(&mut *session.connection).await?;
    let mut deductions = BTreeMap::new();
    for (payout, amount, valid) in clawbacks {
        if !valid {
            return Err(Error::Conflict(
                "历史扣回金额未知，不能推测发放余额。".into(),
            ));
        }
        deductions.insert(payout, amount.ok_or(Error::Internal)?);
    }
    let rows: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('paid_record_amount',p.paid_record_amount::text) FROM poms.commission_payout p WHERE project_id=$1 AND status IN ('paid','suspended','reversed') ORDER BY id")
        .bind(project).fetch_all(&mut *session.connection).await?;
    let (mut total, mut nonretention) = (Decimal::ZERO, Decimal::ZERO);
    for row in rows {
        if row["status"] == "reversed"
            || (row["status"] == "suspended" && row["paid_record_amount"].is_null())
        {
            continue;
        }
        let paid = money(&row, "paid_record_amount")?;
        let returned = deductions
            .get(&id(&row, "id")?)
            .copied()
            .unwrap_or(Decimal::ZERO);
        if returned > paid {
            return Err(Error::Conflict("历史累计扣回超过已发放金额。".into()));
        }
        let net = paid - returned;
        total = total.checked_add(net).ok_or(Error::Internal)?;
        if text(&row, "stage_type")? != "retention" {
            nonretention = nonretention.checked_add(net).ok_or(Error::Internal)?;
        }
    }
    Ok((total, nonretention))
}
