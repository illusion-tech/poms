use super::payout_context::{fraction, money};
use crate::{
    approval_common::CommonSession, contract_support::Error, project_lifecycle::facts::id,
    shared::generated::ProjectReceiptJudgmentMode as Mode,
};
use rust_decimal::{Decimal, prelude::ToPrimitive};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub(super) struct Term {
    pub contract: Uuid,
    pub snapshot: Uuid,
    pub amount: Decimal,
    pub down: Decimal,
    pub retention: Decimal,
    pub due: Option<String>,
    pub currency: String,
    pub receipts: Decimal,
    pub row_version: i32,
    pub payload_hash: Option<String>,
}
impl Term {
    pub fn from_row(row: &Value, receipts: Decimal) -> Result<Self, Error> {
        let amount = money(row, "amount_tax_exclusive")?;
        if amount <= Decimal::ZERO {
            return Err(Error::Conflict("合同金额必须明确且大于零。".into()));
        }
        Ok(Self {
            contract: crate::project_lifecycle::facts::id(row, "contract_id")?,
            snapshot: crate::project_lifecycle::facts::id(row, "id")?,
            amount,
            down: fraction(row, "down_payment_rate")?,
            retention: fraction(row, "retention_rate")?,
            due: row["retention_due_date"].as_str().map(str::to_owned),
            currency: row["currency_code"].as_str().ok_or(Error::Internal)?.into(),
            receipts,
            row_version: crate::project_lifecycle::facts::version(row)?,
            payload_hash: row["payload_hash"].as_str().map(str::to_owned),
        })
    }
}
pub(super) fn references(terms: &[Term]) -> Value {
    json!(
        terms
            .iter()
            .map(|t| json!({"contractId":t.contract,"snapshotId":t.snapshot,"rowVersion":t.row_version,"payloadHash":t.payload_hash}))
            .collect::<Vec<_>>()
    )
}
pub(super) fn sum(values: impl IntoIterator<Item = Decimal>) -> Result<Decimal, Error> {
    values.into_iter().try_fold(Decimal::ZERO, |total, value| {
        total.checked_add(value).ok_or(Error::Internal)
    })
}

/// Cash is gross. Only G's actual immutable confirmation basis supplies net
/// income; a legacy confirmed row without that evidence stays UNKNOWN.
pub(super) async fn qualified_receipts(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    contracts: Option<&[Uuid]>,
    retention_only: bool,
) -> Result<Vec<Value>, Error> {
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(r)||jsonb_build_object('gross_receipt_amount',r.receipt_amount::text,'amount_excluding_tax',b.amount_excluding_tax::text,'basis_currency',b.currency,'accounting_basis_id',b.id,'basis_valid',COALESCE(b.producer_version=1 AND b.project_id=r.project_id AND b.contract_id=r.contract_id AND b.receipt_row_version=r.row_version AND b.cash_gross=r.receipt_amount,false)) FROM poms.receipt_record r LEFT JOIN poms.receipt_accounting_basis b ON b.receipt_id=r.id WHERE r.project_id=$1 AND ($2::uuid[] IS NULL OR r.contract_id=ANY($2)) AND r.status='confirmed' AND (NOT $3 OR r.source_type='retention') ORDER BY COALESCE(r.confirmed_at,r.receipt_date) DESC,r.id FOR SHARE OF r")
        .bind(project).bind(contracts).bind(retention_only).fetch_all(&mut *session.connection).await?;
    let mut currencies = BTreeSet::new();
    for row in &rows {
        if row["basis_valid"] != true {
            return Err(Error::Conflict(
                "已确认回款缺少匹配的实际不含税依据，不能以含税现金或零代替。".into(),
            ));
        }
        money(row, "amount_excluding_tax")?;
        currencies.insert(
            row["basis_currency"]
                .as_str()
                .ok_or(Error::Internal)?
                .to_owned(),
        );
    }
    if currencies.len() > 1 {
        return Err(Error::Conflict(
            "回款币种不一致，缺少可核实的汇率依据。".into(),
        ));
    }
    Ok(rows)
}
pub(super) async fn load(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    freeze: &Value,
) -> Result<(Vec<Term>, Mode), Error> {
    let h:Value=sqlx::query_scalar("SELECT to_jsonb(h) FROM poms.project_handover h WHERE id=$1 AND project_id=$2 AND is_current AND status='confirmed' FOR SHARE")
        .bind(id(freeze,"source_handover_id")?).bind(project).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::Conflict("当前移交依据已变化。".into()))?;
    let active: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM poms.contract WHERE project_id=$1 AND status='active'",
    )
    .bind(project)
    .fetch_one(&mut *session.connection)
    .await?;
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(t)||jsonb_build_object('amount_tax_exclusive',t.amount_tax_exclusive::text,'down_payment_rate',t.down_payment_rate::text,'retention_rate',t.retention_rate::text) FROM poms.contract c JOIN poms.contract_term_snapshot t ON t.id=c.current_snapshot_id AND t.contract_id=c.id WHERE c.project_id=$1 AND c.status='active' AND t.snapshot_status='active' ORDER BY c.id FOR SHARE OF c,t")
        .bind(project).fetch_all(&mut *session.connection).await?;
    if rows.is_empty() || i64::try_from(rows.len()).ok() != Some(active) {
        return Err(Error::Conflict("有效合同条款集合不完整。".into()));
    }
    let basis = h["basis_snapshot_id"]
        .as_str()
        .and_then(|v| Uuid::parse_str(v).ok());
    if let Some(basis) = basis {
        let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_handover_basis_snapshot WHERE id=$1 AND project_id=$2 AND is_current AND status='active')").bind(basis).bind(project).fetch_one(&mut *session.connection).await?;
        let captured:Vec<(Uuid,Uuid)>=sqlx::query_as("SELECT contract_id,term_snapshot_id FROM poms.project_handover_contract_basis WHERE basis_snapshot_id=$1 AND project_id=$2 ORDER BY contract_id").bind(basis).bind(project).fetch_all(&mut *session.connection).await?;
        let current = rows
            .iter()
            .map(|r| Ok((id(r, "contract_id")?, id(r, "id")?)))
            .collect::<Result<Vec<_>, Error>>()?;
        if !valid || captured != current {
            return Err(Error::Conflict(
                "冻结合同集合与当前有效合同不一致，须先完成受控移交。".into(),
            ));
        }
    } else if rows.len() != 1 {
        return Err(Error::Conflict(
            "多合同发放缺少完整冻结合同集合，不能从兼容anchor推测。".into(),
        ));
    }
    let frozen_mode:Option<String>=sqlx::query_scalar("SELECT receipt_judgment_mode FROM poms.project_receipt_judgment_freeze WHERE project_id=$1 AND is_current AND source_handover_id=$2 AND basis_snapshot_id IS NOT DISTINCT FROM $3")
        .bind(project).bind(id(&h,"id")?).bind(basis).fetch_optional(&mut *session.connection).await?;
    let mode = match frozen_mode.as_deref() {
        Some("project-aggregate") => Mode::ProjectAggregate,
        Some("contract-separate") => Mode::ContractSeparate,
        None if rows.len() == 1 => Mode::ProjectAggregate,
        _ => {
            return Err(Error::Conflict(
                "多合同回款判断模式没有实际冻结依据。".into(),
            ));
        }
    };
    let ids = rows
        .iter()
        .map(|r| id(r, "contract_id"))
        .collect::<Result<Vec<_>, _>>()?;
    let mut receipts = BTreeMap::new();
    let receipt_rows = qualified_receipts(session, project, Some(&ids), false).await?;
    for row in &receipt_rows {
        let contract = id(row, "contract_id")?;
        let term = rows
            .iter()
            .find(|term| term["contract_id"] == row["contract_id"])
            .ok_or(Error::Internal)?;
        if term["currency_code"]
            .as_str()
            .map(str::to_ascii_uppercase)
            .as_deref()
            != row["basis_currency"].as_str()
        {
            return Err(Error::Conflict("回款币种与当前冻结合同不一致。".into()));
        }
        let entry = receipts.entry(contract).or_insert(Decimal::ZERO);
        *entry = entry
            .checked_add(money(row, "amount_excluding_tax")?)
            .ok_or(Error::Internal)?;
    }
    let terms = rows
        .iter()
        .map(|r| {
            Term::from_row(
                r,
                receipts
                    .get(&id(r, "contract_id")?)
                    .copied()
                    .unwrap_or(Decimal::ZERO),
            )
        })
        .collect::<Result<Vec<_>, _>>()?;
    let currencies = terms
        .iter()
        .map(|t| t.currency.trim().to_ascii_uppercase())
        .collect::<BTreeSet<_>>();
    if currencies.len() != 1 || currencies.contains("") {
        return Err(Error::Conflict(
            "缺少统一币种依据，不支持推测跨币种提成。".into(),
        ));
    }
    Ok((terms, mode))
}

pub(super) fn receipt_eligible(
    terms: &[Term],
    mode: Mode,
    term: &Term,
    threshold: Decimal,
) -> Result<bool, Error> {
    let (paid, amount) = if mode == Mode::ProjectAggregate {
        (
            sum(terms.iter().map(|t| t.receipts))?,
            sum(terms.iter().map(|t| t.amount))?,
        )
    } else {
        (term.receipts, term.amount)
    };
    Ok(paid >= amount.checked_mul(threshold).ok_or(Error::Internal)?)
}

pub(super) fn round_distribution(exact: &[(Uuid, Decimal)]) -> Result<Vec<(Uuid, Decimal)>, Error> {
    let total = cents(super::payout_context::rounded(sum(exact
        .iter()
        .map(|(_, v)| *v))?))?;
    let mut rows = exact
        .iter()
        .map(|(id, value)| {
            if *value < Decimal::ZERO {
                return Err(Error::Internal);
            }
            let scaled = value
                .checked_mul(Decimal::from(100))
                .ok_or(Error::Internal)?;
            let floor = scaled.trunc().to_i128().ok_or(Error::Internal)?;
            Ok((*id, floor, scaled - Decimal::from_i128_with_scale(floor, 0)))
        })
        .collect::<Result<Vec<_>, Error>>()?;
    rows.sort_by_key(|r| r.0);
    let floors = rows
        .iter()
        .try_fold(0_i128, |sum, r| sum.checked_add(r.1).ok_or(Error::Internal))?;
    let remaining = usize::try_from(total - floors).map_err(|_| Error::Internal)?;
    let mut order = (0..rows.len()).collect::<Vec<_>>();
    order.sort_by(|a, b| {
        rows[*b]
            .2
            .cmp(&rows[*a].2)
            .then(rows[*a].0.cmp(&rows[*b].0))
    });
    if remaining > order.len() {
        return Err(Error::Internal);
    }
    for index in order.into_iter().take(remaining) {
        rows[index].1 += 1;
    }
    Ok(rows
        .into_iter()
        .map(|(id, v, _)| (id, Decimal::from_i128_with_scale(v, 2)))
        .collect())
}
fn cents(mut value: Decimal) -> Result<i128, Error> {
    if value < Decimal::ZERO || value.round_dp(2) != value {
        return Err(Error::Internal);
    }
    value.rescale(2);
    Ok(value.mantissa())
}
/// Integer cents and largest remainders keep the approved project pool exact.
/// UUID ordering makes ties reproducible without floating point or random bias.
pub(super) fn apportion(
    total: Decimal,
    weights: &[(Uuid, Decimal)],
) -> Result<Vec<(Uuid, Decimal)>, Error> {
    let total = cents(total)?;
    let mut weights = weights
        .iter()
        .map(|(id, v)| Ok((*id, cents(*v)?)))
        .collect::<Result<Vec<_>, Error>>()?;
    weights.sort_by_key(|(id, _)| *id);
    let denominator = weights.iter().try_fold(0_i128, |sum, (_, value)| {
        sum.checked_add(*value).ok_or(Error::Internal)
    })?;
    if denominator == 0 {
        if total != 0 {
            return Err(Error::Unprocessable("没有可分配的合同金额。".into()));
        }
        return Ok(weights
            .into_iter()
            .map(|(id, _)| (id, Decimal::ZERO))
            .collect());
    }
    let mut rows = weights
        .into_iter()
        .map(|(id, value)| {
            let numerator = total.checked_mul(value).ok_or(Error::Internal)?;
            Ok((id, numerator / denominator, numerator % denominator))
        })
        .collect::<Result<Vec<_>, Error>>()?;
    let assigned = rows.iter().try_fold(0_i128, |sum, (_, value, _)| {
        sum.checked_add(*value).ok_or(Error::Internal)
    })?;
    let remainder = usize::try_from(total - assigned).map_err(|_| Error::Internal)?;
    let mut order = (0..rows.len()).collect::<Vec<_>>();
    order.sort_by(|a, b| {
        rows[*b]
            .2
            .cmp(&rows[*a].2)
            .then(rows[*a].0.cmp(&rows[*b].0))
    });
    if remainder > order.len() {
        return Err(Error::Internal);
    }
    for index in order.into_iter().take(remainder) {
        rows[index].1 += 1;
    }
    Ok(rows
        .into_iter()
        .map(|(id, value, _)| (id, Decimal::from_i128_with_scale(value, 2)))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn allocation_preserves_cents_large_values_and_stable_ties() {
        let id = |i| Uuid::from_u128(i);
        let weights = vec![
            (id(3), Decimal::ONE),
            (id(2), Decimal::ONE),
            (id(1), Decimal::ONE),
        ];
        let result = apportion(Decimal::new(100, 2), &weights).unwrap();
        assert_eq!(
            result,
            vec![
                (id(1), Decimal::new(34, 2)),
                (id(2), Decimal::new(33, 2)),
                (id(3), Decimal::new(33, 2))
            ]
        );
        let pool: Decimal = "9999999999999999.99".parse().unwrap();
        let result = apportion(pool, &weights).unwrap();
        assert_eq!(sum(result.iter().map(|(_, v)| *v)).unwrap(), pool);
        assert!(apportion(Decimal::ONE, &[(id(1), Decimal::ZERO)]).is_err());
    }
}
