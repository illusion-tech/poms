use super::{
    contract_scope, model,
    payout_context::{self as context, Source},
};
use crate::{
    approval_common::CommonSession,
    contract_support::Error,
    project_lifecycle::facts::{id, text},
    shared::generated::{CommissionPayoutStage as Stage, CommissionPayoutTier as Tier},
};
use rust_decimal::Decimal;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

pub(super) fn scope(source: &Source) -> Value {
    json!({"freezeVersionId":source.freeze["id"],"sourceHandoverId":source.freeze["source_handover_id"],"receiptJudgmentMode":source.mode.as_str(),"contracts":contract_scope::references(&source.terms)})
}
pub(super) fn check_scope(payout: &Value, source: &Source) -> Result<(), Error> {
    if payout["source_contract_scope"].is_null() {
        if source.terms.len() != 1 {
            return Err(Error::Conflict(
                "历史多合同发放缺少明确合同分摊，不能推算。".into(),
            ));
        }
    } else if payout["source_contract_scope"] != scope(source) {
        return Err(Error::Conflict("发放的冻结合同/角色依据已变化。".into()));
    }
    Ok(())
}
pub(super) fn packet(source: &Source, rows: &[(Uuid, Decimal)]) -> Result<Value, Error> {
    Ok(json!(rows.iter().map(|(contract,amount)|{
        let term=source.terms.iter().find(|t|t.contract==*contract).ok_or(Error::Internal)?;
        Ok(json!({"contractId":contract,"snapshotId":term.snapshot,"amount":amount.to_string()}))
    }).collect::<Result<Vec<_>,Error>>()?))
}
pub(super) fn parse(
    raw: &Value,
    total: Decimal,
    source: &Source,
) -> Result<Vec<(Uuid, Decimal)>, Error> {
    if raw.is_null() {
        if total == Decimal::ZERO {
            return Ok(Vec::new());
        }
        if source.terms.len() == 1 {
            return Ok(vec![(source.terms[0].contract, total)]);
        }
        return Err(Error::Conflict(
            "历史已付款缺少合同分摊，须先取得真实明细，不能自动分配。".into(),
        ));
    }
    let mut result = BTreeMap::new();
    for row in raw
        .as_array()
        .ok_or_else(|| Error::Conflict("历史合同分摊格式未知。".into()))?
    {
        let contract =
            id(row, "contractId").map_err(|_| Error::Conflict("历史分摊合同标识无效。".into()))?;
        let amount = model::amount(text(row, "amount")?)
            .map_err(|_| Error::Conflict("历史分摊金额未知。".into()))?;
        if result.insert(contract, amount).is_some() {
            return Err(Error::Conflict("历史分摊包含重复合同。".into()));
        }
    }
    if contract_scope::sum(result.values().copied())? != total {
        return Err(Error::Conflict("合同分摊与实际金额不守恒。".into()));
    }
    Ok(result.into_iter().collect())
}

pub(super) struct Balances {
    pub total: Decimal,
    pub paid: BTreeMap<Uuid, Decimal>,
    pub nonretention: BTreeMap<Uuid, Decimal>,
}
pub(super) async fn balances(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    source: &Source,
) -> Result<Balances, Error> {
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('paid_record_amount',p.paid_record_amount::text) FROM poms.commission_payout p WHERE project_id=$1 AND status IN ('paid','suspended','reversed') ORDER BY id")
        .bind(project).fetch_all(&mut *session.connection).await?;
    let deductions:Vec<(Uuid,Option<Decimal>,bool)>=sqlx::query_as("SELECT related_payout_id,SUM(amount),COALESCE(bool_and(amount IS NOT NULL AND amount>0),false) FROM poms.commission_adjustment WHERE project_id=$1 AND adjustment_type='clawback' AND status='executed' GROUP BY related_payout_id")
        .bind(project).fetch_all(&mut *session.connection).await?;
    let mut returned = BTreeMap::new();
    for (payout, amount, valid) in deductions {
        if !valid || !rows.iter().any(|r| r["id"] == payout.to_string()) {
            return Err(Error::Conflict("历史扣回的来源或金额未知。".into()));
        }
        returned.insert(payout, amount.ok_or(Error::Internal)?);
    }
    let mut result = Balances {
        total: Decimal::ZERO,
        paid: BTreeMap::new(),
        nonretention: BTreeMap::new(),
    };
    for row in rows {
        if row["status"] == "reversed"
            || (row["status"] == "suspended" && row["paid_record_amount"].is_null())
        {
            continue;
        }
        let paid = context::money(&row, "paid_record_amount")?;
        let deduction = returned
            .get(&id(&row, "id")?)
            .copied()
            .unwrap_or(Decimal::ZERO);
        if deduction > paid {
            return Err(Error::Conflict("历史扣回超过实际已付款。".into()));
        }
        let original = parse(&row["paid_contract_allocations"], paid, source)?;
        let net = paid - deduction;
        result.total = result.total.checked_add(net).ok_or(Error::Internal)?;
        let allocation = contract_scope::apportion(net, &original)?;
        for (contract, amount) in allocation {
            let entry = result.paid.entry(contract).or_insert(Decimal::ZERO);
            *entry = entry.checked_add(amount).ok_or(Error::Internal)?;
            if row["stage_type"] != "retention" {
                let entry = result.nonretention.entry(contract).or_insert(Decimal::ZERO);
                *entry = entry.checked_add(amount).ok_or(Error::Internal)?;
            }
        }
    }
    Ok(result)
}
pub(super) async fn remaining(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    pool: Decimal,
    stage: Stage,
    tier: Tier,
    source: &Source,
) -> Result<(Vec<(Uuid, Decimal)>, Balances), Error> {
    let balances = balances(session, project, source).await?;
    let used = if stage == Stage::Retention {
        &balances.paid
    } else {
        &balances.nonretention
    };
    let mut remaining = context::limits(pool, stage, tier, source)?
        .into_iter()
        .map(|(contract, cap)| {
            (
                contract,
                (cap - used.get(&contract).copied().unwrap_or(Decimal::ZERO)).max(Decimal::ZERO),
            )
        })
        .collect::<Vec<_>>();
    let sum = contract_scope::sum(remaining.iter().map(|(_, v)| *v))?;
    let available = (pool - balances.total).max(Decimal::ZERO);
    if sum > available {
        remaining = contract_scope::apportion(available, &remaining)?;
    }
    Ok((remaining, balances))
}
pub(super) fn nonretention_limit(pool: Decimal, source: &Source) -> Result<Decimal, Error> {
    let shares = contract_scope::apportion(
        pool,
        &source
            .terms
            .iter()
            .map(|t| (t.contract, t.amount))
            .collect::<Vec<_>>(),
    )?;
    let exact = shares
        .iter()
        .map(|(contract, share)| {
            let term = source
                .terms
                .iter()
                .find(|t| t.contract == *contract)
                .ok_or(Error::Internal)?;
            Ok((
                *contract,
                share
                    .checked_mul(Decimal::ONE - term.retention)
                    .ok_or(Error::Internal)?,
            ))
        })
        .collect::<Result<Vec<_>, Error>>()?;
    contract_scope::sum(
        contract_scope::round_distribution(&exact)?
            .iter()
            .map(|(_, v)| *v),
    )
}
