use crate::approval_common::{Text, Timestamp, js::Value};
use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RetentionDueStatus {
    Missing,
    Pending,
    Due,
}
impl RetentionDueStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Missing => "missing",
            Self::Pending => "pending",
            Self::Due => "due",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct RetentionDueEvaluation {
    #[serde(rename = "retentionDueDate")]
    pub date: Option<Text>,
    #[serde(rename = "retentionDueStatus")]
    pub status: RetentionDueStatus,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleExplanationDraft {
    pub current_stage_status: &'static str,
    pub gate_decision_code: &'static str,
    pub blocking_reason_category: Option<&'static str>,
    pub blocking_reason_code: Option<Text>,
    pub blocking_reason_summary: Option<Text>,
    pub gate_decision_summary: Text,
    pub next_action_summary: Option<Text>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionSettlementDraft {
    pub final_settlement_status: &'static str,
    pub non_retention_settlement_status: &'static str,
    pub retention_settlement_status: &'static str,
    #[serde(flatten)]
    pub retention_due: RetentionDueEvaluation,
    pub retention_requirement_summary: Option<Text>,
    pub retention_receipt_summary: Option<Text>,
    pub departure_exception_summary: Option<Text>,
    pub rule_explanation: RuleExplanationDraft,
}

#[derive(Clone, Debug)]
pub struct DepartureDecisionSummary {
    pub decision_summary: Text,
    pub confirmation_requirement_summary: Option<Text>,
}

#[derive(Clone, Debug)]
pub struct SettlementReceiptSummary {
    /// The original utility accepts a string without reformatting or a Number.
    pub amount: Value,
    pub date: Timestamp,
}

pub struct RetentionEvaluationInput<'a> {
    pub open_freeze_dispute: bool,
    pub retention_due: &'a RetentionDueEvaluation,
    pub departure_decision: Option<&'a DepartureDecisionSummary>,
    pub retention_receipt: Option<&'a SettlementReceiptSummary>,
    pub gate_binding_action: Option<&'a Text>,
    pub gate_review_decision: Option<&'a Text>,
    pub gate_review_blocking_reason_code: Option<&'a Text>,
    pub gate_next_action_summary: Option<&'a Text>,
    pub mark_as_settled: bool,
}
