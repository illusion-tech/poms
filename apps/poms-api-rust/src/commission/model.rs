use crate::contract_support::{Error, nonnegative_money};
use crate::shared::generated::{
    CommissionAdjustmentType, CommissionPayoutStage, CommissionPayoutTier,
};
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

fn basic_tier() -> CommissionPayoutTier {
    CommissionPayoutTier::Basic
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePayout {
    pub calculation_id: Uuid,
    pub stage_type: CommissionPayoutStage,
    #[serde(default = "basic_tier")]
    pub selected_tier: CommissionPayoutTier,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitPayout {
    pub payout_stage: CommissionPayoutStage,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub freeze_version_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub baseline_selection_source: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub gate_review_record_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub summary_snapshot_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub retention_receipt_record_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub departure_exception_decision_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub comment: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovePayout {
    #[serde(default, deserialize_with = "non_null_optional")]
    pub approved_amount: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterPayout {
    pub payout_stage: CommissionPayoutStage,
    pub paid_record_amount: String,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub approval_record_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub summary_snapshot_id: Option<Uuid>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub paid_at: Option<DateTime<Utc>>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub comment: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
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
    CreatePayout(CreatePayout),
    SubmitPayout(SubmitPayout),
    ApprovePayout(ApprovePayout),
    RegisterPayout(RegisterPayout),
    SubmitDispute(SubmitDispute),
    ArbitrateDispute(ArbitrateDispute),
    DepartureDecision(DepartureDecision),
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitDispute {
    pub freeze_version_id: Uuid,
    pub dispute_reason: String,
    pub affected_assignment_ids: Vec<Uuid>,
    pub recalculation_impact_mode: String,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub comment: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplacementParticipant {
    pub user_id: Uuid,
    pub display_name: String,
    pub role_type: String,
    pub weight: crate::project_operating_common::model::Millionths,
}
#[derive(Debug, Deserialize, Serialize)]
pub struct ReplacementAssignment {
    pub participants: Vec<ReplacementParticipant>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArbitrateDispute {
    pub arbitration_decision: String,
    pub replacement_assignment_payload: Option<ReplacementAssignment>,
    pub recalculation_impact_mode: String,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub comment: Option<String>,
    #[serde(default, deserialize_with = "non_null_optional")]
    pub expected_version: Option<i32>,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DepartureDecision {
    pub freeze_version_id: Uuid,
    pub departure_scenario_code: String,
    pub decision_code: String,
    pub decision_summary: String,
    pub confirmation_requirement_summary: Option<String>,
    pub summary_snapshot_id: Uuid,
}

fn bounded_text(value: &str, maximum: usize, allow_empty: bool) -> Result<(), Error> {
    let value = value.trim();
    if (!allow_empty && value.is_empty()) || value.encode_utf16().count() > maximum {
        return Err(Error::BadRequest("提成请求文本长度不符合契约。".into()));
    }
    Ok(())
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
        fn comment(value: Option<&str>, maximum: usize) -> Result<(), Error> {
            if value.is_some_and(|s| s.trim().is_empty() || s.trim().chars().count() > maximum) {
                return Err(Error::BadRequest("提成请求文本长度不符合契约。".into()));
            }
            Ok(())
        }
        Ok(match operation {
            "CommissionFreezeDisputeController_submitCommissionFreezeDispute" => {
                let input: SubmitDispute = parse(raw)?;
                expected(input.expected_version)?;
                bounded_text(&input.dispute_reason, 1000, false)?;
                bounded_text(&input.recalculation_impact_mode, 64, false)?;
                if let Some(comment) = &input.comment {
                    bounded_text(comment, 1000, true)?;
                }
                if input.affected_assignment_ids.is_empty() {
                    return Err(Error::BadRequest("至少指定一名受影响参与者。".into()));
                }
                Self::SubmitDispute(input)
            }
            "CommissionFreezeDisputeController_arbitrateCommissionFreezeDispute" => {
                let input: ArbitrateDispute = parse(raw)?;
                expected(input.expected_version)?;
                bounded_text(&input.arbitration_decision, 64, false)?;
                bounded_text(&input.recalculation_impact_mode, 64, false)?;
                if let Some(comment) = &input.comment {
                    bounded_text(comment, 1000, true)?;
                }
                if let Some(replacement) = &input.replacement_assignment_payload {
                    if replacement.participants.is_empty() {
                        return Err(Error::BadRequest("替代冻结至少需要一名参与者。".into()));
                    }
                    let mut total = 0_i32;
                    let mut identities = std::collections::BTreeSet::new();
                    for p in &replacement.participants {
                        bounded_text(&p.display_name, usize::MAX, false)?;
                        bounded_text(&p.role_type, 64, false)?;
                        if !identities.insert((p.user_id, p.role_type.trim())) {
                            return Err(Error::BadRequest("替代冻结的用户与角色不能重复。".into()));
                        }
                        total = total.checked_add(p.weight.units()).ok_or(Error::Internal)?;
                    }
                    if total != 1_000_000 {
                        return Err(Error::BadRequest("替代冻结权重合计必须精确等于1。".into()));
                    }
                }
                Self::ArbitrateDispute(input)
            }
            "CommissionDepartureExceptionDecisionController_createDepartureExceptionDecision" => {
                let input: DepartureDecision = parse(raw)?;
                bounded_text(&input.departure_scenario_code, 64, false)?;
                bounded_text(&input.decision_code, 32, false)?;
                bounded_text(&input.decision_summary, 2000, false)?;
                if let Some(value) = &input.confirmation_requirement_summary {
                    bounded_text(value, 2000, false)?;
                }
                Self::DepartureDecision(input)
            }
            "CommissionController_createPayout" => Self::CreatePayout(parse(raw)?),
            "CommissionController_submitPayoutApproval" => {
                let input: SubmitPayout = parse(raw)?;
                expected(input.expected_version)?;
                comment(input.comment.as_deref(), 2000)?;
                comment(input.baseline_selection_source.as_deref(), 32)?;
                if input.payout_stage == CommissionPayoutStage::Retention
                    && [
                        input.gate_review_record_id,
                        input.summary_snapshot_id,
                        input.retention_receipt_record_id,
                        input.departure_exception_decision_id,
                    ]
                    .iter()
                    .any(Option::is_none)
                {
                    return Err(Error::BadRequest(
                        "质保金审批必须提供评审、摘要、到账和离职/特例结论引用。".into(),
                    ));
                }
                Self::SubmitPayout(input)
            }
            "CommissionController_approvePayout" => {
                let input: ApprovePayout = parse(raw)?;
                expected(input.expected_version)?;
                if let Some(raw) = &input.approved_amount {
                    amount(raw)?;
                }
                Self::ApprovePayout(input)
            }
            "CommissionController_registerPayout" => {
                let input: RegisterPayout = parse(raw)?;
                expected(input.expected_version)?;
                amount(&input.paid_record_amount)?;
                comment(input.comment.as_deref(), 2000)?;
                if input.payout_stage == CommissionPayoutStage::Retention
                    && input.summary_snapshot_id.is_none()
                {
                    return Err(Error::BadRequest("质保金登记必须引用当前结算摘要。".into()));
                }
                Self::RegisterPayout(input)
            }
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
    #[test]
    fn controlled_freeze_request_precision_identity_and_text_boundaries() {
        let user = Uuid::from_u128(1);
        let other = Uuid::from_u128(2);
        let operation = "CommissionFreezeDisputeController_arbitrateCommissionFreezeDispute";
        let mut input = serde_json::json!({"arbitrationDecision":"replace","recalculationImpactMode":"review","replacementAssignmentPayload":{"participants":[{"userId":user,"displayName":"甲","roleType":"sales-owner","weight":0.333333},{"userId":other,"displayName":"乙","roleType":"delivery-owner","weight":0.666667}]}});
        assert!(Request::parse(operation, Some(&input.to_string())).is_ok());
        input["replacementAssignmentPayload"]["participants"][1]["weight"] =
            serde_json::json!(0.666666);
        assert!(Request::parse(operation, Some(&input.to_string())).is_err());
        input["replacementAssignmentPayload"]["participants"][1]["weight"] =
            serde_json::json!(0.6666667);
        assert!(Request::parse(operation, Some(&input.to_string())).is_err());
        input["replacementAssignmentPayload"] = serde_json::Value::Null;
        input["expectedVersion"] = serde_json::Value::Null;
        assert!(Request::parse(operation, Some(&input.to_string())).is_err());
        let input = serde_json::json!({"freezeVersionId":user,"disputeReason":"😀".repeat(501),"affectedAssignmentIds":[user],"recalculationImpactMode":"review"});
        assert!(
            Request::parse(
                "CommissionFreezeDisputeController_submitCommissionFreezeDispute",
                Some(&input.to_string())
            )
            .is_err()
        );
    }
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
