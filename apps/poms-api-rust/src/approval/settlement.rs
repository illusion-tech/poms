//! Direct port of commission-settlement-write-chain.ts and business-date.utils.
//! No persistence, DTO strengthening, amount coercion or implicit stage change.

use super::model::*;
use crate::approval_common::{CommonFailure, Text, Timestamp, js::Value};
use chrono::Datelike;
use chrono_tz::Asia::Hong_Kong;

pub const DEFAULT_RETENTION_REQUIREMENT_SUMMARY: &str = "待质保期届满、重大争议收口与质保金到账";

pub fn trim_text(value: &Text) -> Text {
    fn space(unit: u16) -> bool {
        matches!(unit, 0x0009..=0x000d | 0x0020 | 0x00a0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff)
    }
    let units = value.as_code_units();
    let start = units
        .iter()
        .position(|unit| !space(*unit))
        .unwrap_or(units.len());
    let end = units
        .iter()
        .rposition(|unit| !space(*unit))
        .map_or(start, |index| index + 1);
    Text::from_code_units(units[start..end].to_vec())
}

pub fn business_date(value: Timestamp) -> Text {
    let local = value.0.with_timezone(&Hong_Kong);
    let year = if local.year() <= 0 {
        1 - local.year()
    } else {
        local.year()
    };
    Text::from(format!("{year}-{:02}-{:02}", local.month(), local.day()))
}

pub fn evaluate_retention_due_date(
    value: &Value,
    now: Timestamp,
) -> Result<RetentionDueEvaluation, CommonFailure> {
    let date = match value {
        Value::Undefined | Value::Null => None,
        Value::Text(value) if !value.is_truthy() => None,
        Value::Text(value) => Some(Text::from_code_units(
            value.as_code_units().iter().take(10).copied().collect(),
        )),
        Value::Date(Some(value)) => Some(business_date(*value)),
        Value::Date(None) => return Err(CommonFailure::unexpected("Invalid time value")),
        _ => return Err(CommonFailure::unexpected("Invalid internal retention date")),
    };
    let status = date.as_ref().map_or(RetentionDueStatus::Missing, |date| {
        if date.as_code_units() <= business_date(now).as_code_units() {
            RetentionDueStatus::Due
        } else {
            RetentionDueStatus::Pending
        }
    });
    Ok(RetentionDueEvaluation { date, status })
}

pub fn blocking_gate(binding: Option<&Text>, review: Option<&Text>) -> bool {
    gate_severity(binding, review) == Some("block")
}
pub fn review_or_blocking_gate(binding: Option<&Text>, review: Option<&Text>) -> bool {
    gate_severity(binding, review).is_some()
}
fn gate_severity(binding: Option<&Text>, review: Option<&Text>) -> Option<&'static str> {
    let values: Vec<_> = [binding, review]
        .into_iter()
        .flatten()
        .map(|value| trim_text(value).to_utf8_lossy().to_lowercase())
        .collect();
    if values
        .iter()
        .any(|value| value == "block" || value.starts_with("block-"))
    {
        Some("block")
    } else if values
        .iter()
        .any(|value| value == "review" || value.starts_with("review-"))
    {
        Some("review")
    } else {
        None
    }
}

pub fn pending_final_rule_explanation() -> RuleExplanationDraft {
    RuleExplanationDraft {
        current_stage_status: "pending-final-settlement",
        gate_decision_code: "allow-final-settlement",
        blocking_reason_category: None,
        blocking_reason_code: None,
        blocking_reason_summary: None,
        gate_decision_summary: Text::from("当前可进入最终结算。"),
        next_action_summary: Some(Text::from("请登记最终阶段发放。")),
    }
}

fn receipt_summary(receipt: &SettlementReceiptSummary) -> Result<Text, CommonFailure> {
    let amount = match &receipt.amount {
        Value::Text(value) => value.clone(),
        Value::Number(value) => Text::from(ryu_js::Buffer::new().format_to_fixed(*value, 2)),
        _ => return Err(CommonFailure::unexpected("Invalid internal receipt amount")),
    };
    Ok(Text::from("质保金到账：")
        .concat(&business_date(receipt.date))
        .concat(&Text::from(" / "))
        .concat(&amount))
}

fn requirement_summary(input: &RetentionEvaluationInput<'_>) -> Text {
    let mut values = Vec::new();
    if input.retention_due.status == RetentionDueStatus::Missing {
        values.push("补齐合同质保期届满日期");
    } else if input.retention_due.status == RetentionDueStatus::Pending {
        values.push("质保期届满");
    }
    if input.departure_decision.is_none() {
        values.push("离职 / 特例结论明确");
    }
    if input.retention_receipt.is_none() {
        values.push("质保金到账");
    }
    if values.is_empty() {
        Text::from("当前质保金已具备结算条件")
    } else {
        Text::from(format!("待{}", values.join("、")))
    }
}

fn blocked(
    category: &'static str,
    code: &str,
    reason: Text,
    decision: &str,
    next: Text,
) -> RuleExplanationDraft {
    RuleExplanationDraft {
        current_stage_status: "blocked-retention",
        gate_decision_code: "block-retention",
        blocking_reason_category: Some(category),
        blocking_reason_code: Some(Text::from(code)),
        blocking_reason_summary: Some(reason),
        gate_decision_summary: Text::from(decision),
        next_action_summary: Some(next),
    }
}

pub fn retention_settlement_draft(
    input: &RetentionEvaluationInput<'_>,
) -> Result<RetentionSettlementDraft, CommonFailure> {
    let mut draft = RetentionSettlementDraft {
        final_settlement_status: "pending-retention-settlement",
        non_retention_settlement_status: "settled-non-retention",
        retention_settlement_status: "waiting-retention",
        retention_due: input.retention_due.clone(),
        retention_requirement_summary: None,
        retention_receipt_summary: input.retention_receipt.map(receipt_summary).transpose()?,
        departure_exception_summary: input
            .departure_decision
            .map(|decision| decision.decision_summary.clone()),
        rule_explanation: pending_final_rule_explanation(),
    };
    if input.mark_as_settled {
        draft.final_settlement_status = "settled-all";
        draft.retention_settlement_status = "settled-retention";
        draft.rule_explanation = RuleExplanationDraft {
            current_stage_status: "settled-retention",
            gate_decision_code: "settled-retention",
            blocking_reason_category: None,
            blocking_reason_code: None,
            blocking_reason_summary: None,
            gate_decision_summary: Text::from("当前非质保部分与质保金部分均已结清。"),
            next_action_summary: None,
        };
        return Ok(draft);
    }
    if input.open_freeze_dispute {
        draft.retention_requirement_summary = Some(Text::from("待重大争议收口"));
        draft.rule_explanation = blocked(
            "exception",
            "freeze-dispute-pending",
            Text::from("当前冻结版本存在待仲裁争议，后续发放已进入受控暂停。"),
            "当前暂不能进入质保金结算。",
            Text::from("请先完成冻结后争议仲裁，再复核质保金结算。"),
        );
    } else if input.retention_due.status == RetentionDueStatus::Missing {
        draft.retention_due.date = None;
        draft.retention_requirement_summary = Some(requirement_summary(input));
        draft.rule_explanation = blocked(
            "retention",
            "retention-due-fact-missing",
            Text::from("当前有效合同条款缺少质保期届满日期，暂不能进入质保金结算。"),
            "当前暂不能进入质保金结算。",
            Text::from("请先补齐当前有效合同条款的质保期届满日期，再复核质保金结算。"),
        );
    } else if input.retention_due.status == RetentionDueStatus::Pending {
        draft.retention_requirement_summary = Some(requirement_summary(input));
        draft.rule_explanation = blocked(
            "retention",
            "retention-due-pending",
            Text::from("当前质保期尚未届满。"),
            "当前暂不能进入质保金结算。",
            Text::from("请待合同约定质保期届满后再复核质保金结算。"),
        );
    } else if input.departure_decision.is_none() {
        draft.retention_requirement_summary = Some(requirement_summary(input));
        draft.rule_explanation = blocked(
            "exception",
            "departure-exception-pending",
            Text::from("离职 / 特例结论尚未明确。"),
            "当前暂不能进入质保金结算。",
            Text::from("请先创建当前有效离职 / 特例结论，再复核质保金结算。"),
        );
    } else if let Some(requirement) = input
        .departure_decision
        .and_then(|decision| decision.confirmation_requirement_summary.as_ref())
        .map(trim_text)
        .filter(Text::is_truthy)
    {
        draft.retention_requirement_summary = Some(requirement.clone());
        draft.rule_explanation = blocked(
            "special-case",
            "departure-confirmation-pending",
            requirement,
            "当前涉及离职 / 特例限制，暂不能进入质保金结算。",
            Text::from("请先完成责任承接确认，再复核质保金结算。"),
        );
    } else if input.retention_receipt.is_none() {
        draft.retention_requirement_summary = Some(Text::from("待质保金到账"));
        draft.rule_explanation = blocked(
            "retention",
            "retention-receipt-pending",
            Text::from("质保金尚未到账。"),
            "当前暂不能进入质保金结算。",
            Text::from("请财务确认质保金到账后再复核。"),
        );
    } else if let Some(severity) =
        gate_severity(input.gate_binding_action, input.gate_review_decision)
    {
        let block = severity == "block";
        draft.retention_requirement_summary = Some(Text::from("待经营依据复核完成"));
        draft.rule_explanation = RuleExplanationDraft {
            current_stage_status: "blocked-retention",
            gate_decision_code: if block {
                "block-retention"
            } else {
                "review-retention"
            },
            blocking_reason_category: Some("operating-risk"),
            blocking_reason_code: Some(
                input
                    .gate_review_blocking_reason_code
                    .map(trim_text)
                    .filter(Text::is_truthy)
                    .unwrap_or_else(|| {
                        Text::from(if block {
                            "final-gate-blocked"
                        } else {
                            "final-gate-review-pending"
                        })
                    }),
            ),
            blocking_reason_summary: Some(Text::from(if block {
                "当前经营依据已阻断质保金结算。"
            } else {
                "当前经营依据仍待复核，暂不能进入质保金结算。"
            })),
            gate_decision_summary: Text::from(if block {
                "当前已被经营风险阻断，暂不能进入质保金结算。"
            } else {
                "当前待补条件，暂不能进入质保金结算。"
            }),
            next_action_summary: Some(
                input
                    .gate_next_action_summary
                    .map(trim_text)
                    .filter(Text::is_truthy)
                    .unwrap_or_else(|| Text::from("请先完成经营核算复核，再处理质保金结算。")),
            ),
        };
    } else {
        draft.retention_settlement_status = "ready-retention";
        draft.retention_requirement_summary = Some(Text::from("当前质保金已具备结算条件"));
        draft.rule_explanation = RuleExplanationDraft {
            current_stage_status: "ready-retention",
            gate_decision_code: "allow-retention",
            blocking_reason_category: None,
            blocking_reason_code: None,
            blocking_reason_summary: None,
            gate_decision_summary: Text::from("当前质保金已到账，且无重大争议，可进入质保金结算。"),
            next_action_summary: Some(Text::from("请提交质保金结算审批并登记发放。")),
        };
    }
    Ok(draft)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::approval::service::as_value;
    use crate::approval_common::js::{Data, get};
    use serde::Deserialize;

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Oracle {
        pending_final_expected: Value,
        date_cases: Vec<DateCase>,
        draft_cases: Vec<DraftCase>,
    }
    #[derive(Deserialize)]
    struct DateCase {
        input: Value,
        expected: Option<Value>,
        error: Option<OracleError>,
    }
    #[derive(Deserialize)]
    struct OracleError {
        message: String,
    }
    #[derive(Deserialize)]
    struct DraftCase {
        name: String,
        input: Value,
        expected: Value,
    }

    fn object(value: Value) -> Data {
        match value {
            Value::Object(data) => data,
            _ => panic!("oracle input must be an object"),
        }
    }
    fn stamp(text: &Text) -> Timestamp {
        Timestamp::from_database(
            crate::compat::scalars::parse_legacy_timestamp_utc(&text.to_utf8_lossy())
                .unwrap_or_else(|error| panic!("oracle timestamp: {error:?}")),
        )
    }
    fn materialize(value: Value) -> Value {
        match value {
            Value::Object(data) if data.contains_key("$date") => {
                let parsed = crate::compat::scalars::parse_legacy_timestamp_utc(
                    &get(&data, "$date").js_text().to_utf8_lossy(),
                )
                .ok()
                .map(Timestamp::from_database);
                Value::Date(parsed)
            }
            Value::Object(data) if data.contains_key("$number") => Value::Number(
                get(&data, "$number")
                    .js_text()
                    .to_utf8_lossy()
                    .parse()
                    .unwrap_or(f64::NAN),
            ),
            Value::Object(data) => Value::Object(
                data.into_iter()
                    .map(|(key, value)| (key, materialize(value)))
                    .collect(),
            ),
            Value::Array(values) => Value::Array(values.into_iter().map(materialize).collect()),
            value => value,
        }
    }
    fn fixture() -> Oracle {
        serde_json::from_str(include_str!("settlement_original.json"))
            .unwrap_or_else(|error| panic!("original oracle fixture: {error}"))
    }
    fn text(data: &Data, key: &str) -> Option<Text> {
        get(data, key).as_text().cloned()
    }

    #[test]
    fn original_typescript_date_and_receipt_branch_vectors() {
        let oracle = fixture();
        assert_eq!(
            as_value(&pending_final_rule_explanation()).unwrap_or_else(|error| panic!("{error}")),
            oracle.pending_final_expected
        );
        for case in oracle.date_cases {
            let data = object(case.input);
            let actual = evaluate_retention_due_date(
                &materialize(get(&data, "value").clone()),
                stamp(&get(&data, "now").js_text()),
            );
            if let Some(error) = case.error {
                let failure = actual
                    .err()
                    .unwrap_or_else(|| panic!("expected original date failure"));
                assert_eq!(failure.message.to_utf8_lossy(), error.message);
            } else {
                let output = as_value(&actual.unwrap_or_else(|error| panic!("{error}")))
                    .unwrap_or_else(|error| panic!("{error}"));
                assert_eq!(
                    Some(output),
                    case.expected,
                    "date case {}",
                    get(&data, "name").js_text().to_utf8_lossy()
                );
            }
        }
        for case in oracle.draft_cases {
            let data = object(materialize(case.input));
            let due_data = object(get(&data, "retentionDue").clone());
            let due = RetentionDueEvaluation {
                date: text(&due_data, "retentionDueDate"),
                status: match get(&due_data, "retentionDueStatus")
                    .js_text()
                    .to_utf8_lossy()
                    .as_str()
                {
                    "missing" => RetentionDueStatus::Missing,
                    "pending" => RetentionDueStatus::Pending,
                    "due" => RetentionDueStatus::Due,
                    _ => panic!("original due status"),
                },
            };
            let departure = match get(&data, "departureDecision") {
                Value::Object(row) => Some(DepartureDecisionSummary {
                    decision_summary: get(row, "decisionSummary").js_text(),
                    confirmation_requirement_summary: text(row, "confirmationRequirementSummary"),
                }),
                _ => None,
            };
            let receipt = match get(&data, "retentionReceipt") {
                Value::Object(row) => Some(SettlementReceiptSummary {
                    amount: get(row, "receiptAmount").clone(),
                    date: match get(row, "receiptDate") {
                        Value::Date(Some(date)) => *date,
                        _ => panic!("original receipt date"),
                    },
                }),
                _ => None,
            };
            let draft = retention_settlement_draft(&RetentionEvaluationInput {
                open_freeze_dispute: get(&data, "openFreezeDispute").truthy(),
                retention_due: &due,
                departure_decision: departure.as_ref(),
                retention_receipt: receipt.as_ref(),
                gate_binding_action: text(&data, "gateBindingAction").as_ref(),
                gate_review_decision: text(&data, "gateReviewDecision").as_ref(),
                gate_review_blocking_reason_code: text(&data, "gateReviewBlockingReasonCode")
                    .as_ref(),
                gate_next_action_summary: text(&data, "gateNextActionSummary").as_ref(),
                mark_as_settled: get(&data, "markAsSettled").truthy(),
            })
            .unwrap_or_else(|error| panic!("{}: {error}", case.name));
            assert_eq!(
                as_value(&draft).unwrap_or_else(|error| panic!("{error}")),
                case.expected,
                "{}",
                case.name
            );
        }
    }

    #[test]
    fn final_and_retention_have_distinct_gate_admission() {
        let review = Text::from("\u{feff} REVIEW-PENDING \u{3000}");
        assert!(!blocking_gate(Some(&review), None));
        assert!(review_or_blocking_gate(Some(&review), None));
        assert!(!review_or_blocking_gate(
            Some(&Text::from("blockade")),
            Some(&Text::from("reviewing"))
        ));
        assert!(blocking_gate(None, Some(&Text::from("BLOCK"))));
    }
}
