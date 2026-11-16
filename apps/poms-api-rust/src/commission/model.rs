use crate::contract_support::{Error, nonnegative_money};
use crate::shared::generated::CommissionAdjustmentType;
use chrono::{DateTime, Utc};
use rust_decimal::{Decimal, RoundingStrategy};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, str::FromStr};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier {
    pub min_margin_rate: f64,
    #[serde(deserialize_with = "required_nullable_rate")]
    pub max_margin_rate: Option<f64>,
    pub commission_rate: f64,
}

fn required_nullable_rate<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<f64>, D::Error> {
    Option::<f64>::deserialize(deserializer)
}

fn non_null_optional<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    T::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TierDefinition {
    pub tiers: Vec<Tier>,
}

impl TierDefinition {
    pub fn validate(&self) -> Result<(), Error> {
        if self.tiers.is_empty()
            || self.tiers.iter().any(|tier| {
                !unit_rate(tier.min_margin_rate)
                    || !unit_rate(tier.commission_rate)
                    || tier.max_margin_rate.is_some_and(|max| !unit_rate(max))
            })
        {
            return Err(Error::BadRequest(
                "提成梯度须非空，各比率须在0到1之间。".into(),
            ));
        }
        Ok(())
    }
}

fn unit_rate(value: f64) -> bool {
    value.is_finite() && (0.0..=1.0).contains(&value)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRule {
    pub rule_code: String,
    pub version: i32,
    pub tier_definition_json: TierDefinition,
    pub first_stage_cap_rule_json: Option<BTreeMap<String, Value>>,
    pub second_stage_cap_rule_json: Option<BTreeMap<String, Value>>,
    pub retention_rule_json: Option<BTreeMap<String, Value>>,
    pub low_down_payment_rule_json: Option<BTreeMap<String, Value>>,
    pub exception_rule_json: Option<BTreeMap<String, Value>>,
    pub effective_from: Option<DateTime<Utc>>,
}

impl CreateRule {
    fn validate(&self) -> Result<(), Error> {
        if self.rule_code.is_empty() || self.rule_code.chars().count() > 64 || self.version <= 0 {
            return Err(Error::BadRequest(
                "规则代码长度须为1到64，版本须为正整数。".into(),
            ));
        }
        self.tier_definition_json.validate()
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCalculation {
    pub rule_version_id: Uuid,
    pub recognized_revenue_tax_exclusive: String,
    pub recognized_cost_tax_exclusive: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmCalculation {
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Recalculate {
    pub reason: String,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub recognized_revenue_tax_exclusive: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub recognized_cost_tax_exclusive: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAdjustment {
    pub adjustment_type: CommissionAdjustmentType,
    pub related_payout_id: Option<Uuid>,
    pub related_calculation_id: Option<Uuid>,
    pub amount: Option<String>,
    pub reason: String,
}

#[derive(Debug)]
pub enum Request {
    None,
    CreateRule(CreateRule),
    CreateCalculation(CreateCalculation),
    ConfirmCalculation(ConfirmCalculation),
    Recalculate(Recalculate),
    CreateAdjustment(CreateAdjustment),
    AdjustmentVersion(ConfirmCalculation),
}

pub fn amount(raw: &str) -> Result<Decimal, Error> {
    let raw = raw.trim();
    if raw.is_empty() || raw.len() > 64 {
        return Err(Error::BadRequest("金额须为1到64位的十进制字符串。".into()));
    }
    let cents = nonnegative_money(raw)?;
    Ok(Decimal::from_i128_with_scale(cents, 2))
}

fn expected(value: Option<i32>) -> Result<(), Error> {
    if value.is_some_and(|v| v <= 0) {
        return Err(Error::BadRequest("expectedVersion须为正整数。".into()));
    }
    Ok(())
}

impl Request {
    pub fn parse(operation: &str, raw: Option<&str>) -> Result<Self, Error> {
        fn parse<T: serde::de::DeserializeOwned>(raw: Option<&str>) -> Result<T, Error> {
            serde_json::from_str(raw.unwrap_or("{}"))
                .map_err(|_| Error::BadRequest("提成请求字段或类型不符合接口契约。".into()))
        }
        Ok(match operation {
            "CommissionController_createRuleVersion" => {
                let input: CreateRule = parse(raw)?;
                input.validate()?;
                Self::CreateRule(input)
            }
            "CommissionController_createCalculation" => {
                let input: CreateCalculation = parse(raw)?;
                amount(&input.recognized_revenue_tax_exclusive)?;
                amount(&input.recognized_cost_tax_exclusive)?;
                Self::CreateCalculation(input)
            }
            "CommissionController_approveCalculation" => {
                let input: ConfirmCalculation = parse(raw)?;
                expected(input.expected_version)?;
                Self::ConfirmCalculation(input)
            }
            "CommissionController_recalculateCalculation" => {
                let input: Recalculate = parse(raw)?;
                expected(input.expected_version)?;
                if input.reason.trim().is_empty() || input.reason.trim().chars().count() > 256 {
                    return Err(Error::BadRequest("重算原因须为1到256字。".into()));
                }
                if let Some(raw) = &input.recognized_revenue_tax_exclusive {
                    amount(raw)?;
                }
                if let Some(raw) = &input.recognized_cost_tax_exclusive {
                    amount(raw)?;
                }
                Self::Recalculate(input)
            }
            "CommissionController_createAdjustment" => {
                let input: CreateAdjustment = parse(raw)?;
                if input.reason.trim().is_empty() || input.reason.trim().chars().count() > 256 {
                    return Err(Error::BadRequest("调整原因须为1到256字。".into()));
                }
                if let Some(raw) = &input.amount {
                    amount(raw)?;
                }
                Self::CreateAdjustment(input)
            }
            "CommissionController_submitAdjustmentApproval"
            | "CommissionController_executeAdjustment" => {
                let input: ConfirmCalculation = parse(raw)?;
                expected(input.expected_version)?;
                Self::AdjustmentVersion(input)
            }
            _ => Self::None,
        })
    }
}

#[derive(Debug)]
pub struct Calculation {
    pub revenue: Decimal,
    pub cost: Decimal,
    pub margin: Decimal,
    pub margin_rate: Decimal,
    pub pool: Decimal,
}

pub fn calculate(
    revenue: Decimal,
    cost: Decimal,
    tiers: &TierDefinition,
) -> Result<Calculation, Error> {
    tiers.validate()?;
    let margin = revenue.checked_sub(cost).ok_or(Error::Internal)?;
    let margin_rate = if revenue.is_zero() {
        Decimal::ZERO
    } else {
        margin.checked_div(revenue).ok_or(Error::Internal)?
    };
    let mut sorted = tiers.tiers.iter().collect::<Vec<_>>();
    sorted.sort_by(|a, b| a.min_margin_rate.total_cmp(&b.min_margin_rate));
    let mut rate = Decimal::ZERO;
    for tier in sorted {
        let min =
            Decimal::from_str(&tier.min_margin_rate.to_string()).map_err(|_| Error::Internal)?;
        let max = tier
            .max_margin_rate
            .map(|v| Decimal::from_str(&v.to_string()))
            .transpose()
            .map_err(|_| Error::Internal)?;
        if margin_rate >= min && max.is_none_or(|max| margin_rate < max) {
            rate = Decimal::from_str(&tier.commission_rate.to_string())
                .map_err(|_| Error::Internal)?;
            break;
        }
    }
    let pool = if margin > Decimal::ZERO {
        margin.checked_mul(rate).ok_or(Error::Internal)?
    } else {
        Decimal::ZERO
    };
    let rounded_margin_rate =
        margin_rate.round_dp_with_strategy(4, RoundingStrategy::MidpointAwayFromZero);
    if rounded_margin_rate.abs() >= Decimal::from(10_000) {
        return Err(Error::Unprocessable(
            "贡献毛利率超出数据库可保存范围。".into(),
        ));
    }
    Ok(Calculation {
        revenue,
        cost,
        margin,
        margin_rate: rounded_margin_rate,
        pool: pool.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn tiers() -> TierDefinition {
        serde_json::from_str(r#"{"tiers":[{"minMarginRate":0.3,"maxMarginRate":null,"commissionRate":0.2},{"minMarginRate":0,"maxMarginRate":0.3,"commissionRate":0.1}]}"#).unwrap()
    }
    #[test]
    fn tier_boundary_uses_unrounded_margin_and_exact_money() {
        let exact = calculate(
            amount("100.00").unwrap(),
            amount("70.00").unwrap(),
            &tiers(),
        )
        .unwrap();
        assert_eq!(exact.pool.to_string(), "6.00");
        let below = calculate(
            amount("100000.00").unwrap(),
            amount("70000.01").unwrap(),
            &tiers(),
        )
        .unwrap();
        assert_eq!(below.margin_rate.to_string(), "0.3000");
        assert_eq!(below.pool.to_string(), "3000.00");
    }
    #[test]
    fn zero_revenue_and_loss_do_not_produce_negative_commission() {
        for (revenue, cost) in [("0", "3"), ("1", "3")] {
            assert_eq!(
                calculate(amount(revenue).unwrap(), amount(cost).unwrap(), &tiers())
                    .unwrap()
                    .pool,
                Decimal::ZERO
            );
        }
    }
    #[test]
    fn numeric_money_precision_and_half_cent_rounding() {
        assert_eq!(
            amount("9999999999999999.99").unwrap().to_string(),
            "9999999999999999.99"
        );
        let tenth: TierDefinition = serde_json::from_str(
            r#"{"tiers":[{"minMarginRate":0,"maxMarginRate":null,"commissionRate":0.1}]}"#,
        )
        .unwrap();
        assert_eq!(
            calculate(amount("0.05").unwrap(), amount("0").unwrap(), &tenth)
                .unwrap()
                .pool
                .to_string(),
            "0.01"
        );
        for bad in ["NaN", "1e9", "-1", "0x10", "1.001", "10000000000000000"] {
            assert!(amount(bad).is_err(), "{bad}");
        }
    }
    #[test]
    fn invalid_requests_fail_before_opening_a_transaction() {
        assert!(Request::parse("CommissionController_createRuleVersion", Some(r#"{"ruleCode":"a","version":1,"tierDefinitionJson":{"tiers":[{"minMarginRate":0,"maxMarginRate":null,"commissionRate":2}]}}"#)).is_err());
        assert!(
            Request::parse(
                "CommissionController_approveCalculation",
                Some(r#"{"expectedVersion":0}"#)
            )
            .is_err()
        );
        assert!(
            Request::parse(
                "CommissionController_approveCalculation",
                Some(r#"{"expectedVersion":null}"#)
            )
            .is_err()
        );
        assert!(
            Request::parse(
                "CommissionController_recalculateCalculation",
                Some(r#"{"reason":"修正","recognizedRevenueTaxExclusive":null}"#)
            )
            .is_err()
        );
        assert!(
            serde_json::from_str::<TierDefinition>(
                r#"{"tiers":[{"minMarginRate":0,"commissionRate":0.1}]}"#
            )
            .is_err()
        );
        assert!(
            calculate(
                amount("0.01").unwrap(),
                amount("1000000").unwrap(),
                &tiers()
            )
            .is_err()
        );
        assert!(
            Request::parse(
                "CommissionController_recalculateCalculation",
                Some(r#"{"reason":" "}"#)
            )
            .is_err()
        );
    }
}
