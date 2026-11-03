//! Lead-score-v2 arithmetic, hard gates, and semantic snapshot comparison.
//! These pure functions never refresh a stored Lead during a read operation.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

use super::model::trim_js;
use crate::auth::js_json::JsString;

pub const FORMULA_VERSION: &str = "lead-score-v2";

#[derive(Clone, Debug)]
pub struct GateInput {
    pub source_code: String,
    pub demand_description: Option<JsString>,
    pub budget_status: String,
    pub estimated_amount: Option<String>,
    pub urgency: String,
    pub expected_decision_date: Option<String>,
    pub owner_user_id: Option<Uuid>,
    pub owner_org_id: Option<Uuid>,
    pub status: String,
    pub converted_project_id: Option<Uuid>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceFacts {
    pub decision_maker_known: bool,
    pub technical_evaluator_known: bool,
    pub procurement_process_known: bool,
    pub budget_source_known: bool,
    pub competitor_known: bool,
    pub pain_point_known: bool,
    pub next_contact_known: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowUpFacts {
    pub last_follow_up_at: Option<String>,
    pub days_since_last_follow_up: Option<i64>,
    pub follow_up_count30d: usize,
    pub has_planned_next_follow_up: bool,
    pub next_follow_up_at: Option<String>,
    pub next_follow_up_overdue: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentFacts {
    pub evidence_attachment_count: usize,
    pub has_proposal_attachment: bool,
    pub has_quotation_attachment: bool,
    pub has_budget_evidence_attachment: bool,
    pub latest_attachment_count: usize,
    pub final_attachment_count: usize,
}

#[derive(Clone, Debug, Default)]
pub struct Facts {
    pub sales_intelligence: IntelligenceFacts,
    pub follow_up: FollowUpFacts,
    pub attachment_evidence: AttachmentFacts,
}

/// Structured score facts. Object member order is not a business fact.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Breakdown {
    pub source: i32,
    pub demand: i32,
    pub budget: i32,
    pub amount: i32,
    pub urgency: i32,
    pub expected_decision_date: i32,
    pub owner: i32,
    pub base_business: i32,
    pub sales_intelligence: i32,
    pub follow_up_activity: i32,
    pub attachment_evidence: i32,
    pub total: i32,
    pub formula_version: &'static str,
    pub sales_intelligence_facts: IntelligenceFacts,
    pub follow_up_facts: FollowUpFacts,
    pub attachment_facts: AttachmentFacts,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GateCheck {
    pub status: &'static str,
    pub missing_items: Vec<&'static str>,
    pub explanation: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct GateSummary {
    pub qualification: GateCheck,
    pub conversion: GateCheck,
}

pub fn rating(score: i32) -> &'static str {
    if score >= 80 {
        "A"
    } else if score >= 60 {
        "B"
    } else if score >= 40 {
        "C"
    } else {
        "D"
    }
}

fn positive_amount(value: Option<&str>) -> bool {
    value.is_some_and(|text| {
        !text.is_empty()
            && crate::compat::scalars::legacy_number(crate::compat::scalars::NumberInput::Text(
                text,
            )) > 0.0
    })
}

pub fn breakdown(input: &GateInput, facts: &Facts) -> Breakdown {
    let demand_length = input
        .demand_description
        .as_ref()
        .map_or(0, |text| trim_js(text.clone()).as_code_units().len());
    let source = if input.source_code.is_empty() { 0 } else { 10 };
    let demand = if demand_length >= 30 {
        15
    } else if demand_length > 0 {
        10
    } else {
        0
    };
    let budget = match input.budget_status.as_str() {
        "rough-budget" => 15,
        "budget-confirmed" => 20,
        "budget-approved" => 25,
        _ => 0,
    };
    let amount = if positive_amount(input.estimated_amount.as_deref()) {
        15
    } else {
        0
    };
    let urgency = match input.urgency.as_str() {
        "low" => 5,
        "normal" => 10,
        "high" | "critical" => 15,
        _ => 0,
    };
    let expected_decision_date = if input
        .expected_decision_date
        .as_ref()
        .is_some_and(|date| !date.is_empty())
    {
        10
    } else {
        0
    };
    let owner = if input.owner_user_id.is_some() && input.owner_org_id.is_some() {
        10
    } else {
        0
    };
    let raw = source + demand + budget + amount + urgency + expected_decision_date + owner;
    let base_business = (f64::from(raw.min(100)) * 0.65).round() as i32;
    let i = &facts.sales_intelligence;
    let sales_intelligence = (i32::from(i.decision_maker_known) * 4
        + i32::from(i.technical_evaluator_known) * 3
        + i32::from(i.procurement_process_known) * 3
        + i32::from(i.budget_source_known) * 3
        + i32::from(i.competitor_known) * 2
        + i32::from(i.pain_point_known) * 3
        + i32::from(i.next_contact_known) * 2)
        .min(20);
    let f = &facts.follow_up;
    let count = if f.follow_up_count30d >= 3 {
        4
    } else if f.follow_up_count30d > 0 {
        2
    } else {
        0
    };
    let recent = match f.days_since_last_follow_up {
        None => 0,
        Some(n) if n <= 7 => 3,
        Some(n) if n <= 14 => 2,
        Some(n) if n <= 30 => 1,
        _ => 0,
    };
    let plan = if f.has_planned_next_follow_up && !f.next_follow_up_overdue {
        3
    } else {
        0
    };
    let follow_up_activity = (count + recent + plan).min(10);
    let a = &facts.attachment_evidence;
    let attachment_evidence = (i32::from(a.has_proposal_attachment) * 2
        + i32::from(a.has_quotation_attachment) * 2
        + i32::from(a.has_budget_evidence_attachment))
    .min(5);
    Breakdown {
        source,
        demand,
        budget,
        amount,
        urgency,
        expected_decision_date,
        owner,
        base_business,
        sales_intelligence,
        follow_up_activity,
        attachment_evidence,
        total: (base_business + sales_intelligence + follow_up_activity + attachment_evidence)
            .min(100),
        formula_version: FORMULA_VERSION,
        sales_intelligence_facts: i.clone(),
        follow_up_facts: f.clone(),
        attachment_facts: a.clone(),
    }
}

pub fn score_reason(value: &Breakdown) -> String {
    let groups = [
        ("基础商务", value.base_business),
        ("销售情报", value.sales_intelligence),
        ("跟进活跃", value.follow_up_activity),
        ("附件证据", value.attachment_evidence),
    ];
    let reasons = groups
        .into_iter()
        .filter(|(_, score)| *score > 0)
        .map(|(label, score)| format!("{label}+{score}"))
        .collect::<Vec<_>>();
    if reasons.is_empty() {
        "暂无有效评分事实".into()
    } else {
        reasons.join("；")
    }
}

pub fn missing(input: &GateInput, conversion: bool) -> Vec<&'static str> {
    let mut values = Vec::new();
    if input.status == "closed" {
        values.push("not-closed");
    }
    if conversion {
        if input.status == "converted" || input.converted_project_id.is_some() {
            values.push("not-converted");
        }
        if input.status != "qualified" {
            values.push("qualified-status");
        }
    } else if input.status != "registered" {
        values.push("registered-status");
    }
    if input.source_code.is_empty() {
        values.push("source");
    }
    if input
        .demand_description
        .as_ref()
        .is_none_or(|text| trim_js(text.clone()).is_empty())
    {
        values.push("demand-description");
    }
    if matches!(input.budget_status.as_str(), "unknown" | "no-budget") {
        values.push("budget");
    }
    if !positive_amount(input.estimated_amount.as_deref()) {
        values.push("estimated-amount");
    }
    if input.urgency.is_empty() {
        values.push("urgency");
    }
    if input.owner_user_id.is_none() {
        values.push("owner");
    }
    if input.owner_org_id.is_none() {
        values.push("owner-org");
    }
    values
}

fn gate(input: &GateInput, conversion: bool) -> GateCheck {
    let missing_items = missing(input, conversion);
    if missing_items.is_empty() {
        return GateCheck {
            status: "ready",
            missing_items,
            explanation: if conversion {
                "已满足转项目硬闸口"
            } else {
                "已满足确认有效硬闸口"
            }
            .into(),
        };
    }
    let labels = missing_items
        .iter()
        .map(|value| match *value {
            "source" => "线索来源",
            "demand-description" => "需求描述",
            "budget" => "预算情况",
            "estimated-amount" => "预计金额",
            "urgency" => "紧迫程度",
            "owner" => "销售主责人",
            "owner-org" => "销售主责组织",
            "registered-status" => "待确认状态",
            "qualified-status" => "已确认有效状态",
            "not-converted" => "未转项目状态",
            "not-closed" => "未关闭状态",
            _ => "",
        })
        .collect::<Vec<_>>()
        .join("、");
    GateCheck {
        status: "blocked",
        missing_items,
        explanation: format!("缺少：{labels}"),
    }
}

pub fn gate_summary(input: &GateInput) -> GateSummary {
    GateSummary {
        qualification: gate(input, false),
        conversion: gate(input, true),
    }
}

pub fn scopes(input: &GateInput) -> Vec<&'static str> {
    let mut scopes = vec!["all"];
    if input.status == "converted" || input.converted_project_id.is_some() {
        scopes.push("converted");
    } else if input.status == "closed" {
        scopes.push("closed");
    } else if input.status == "registered" {
        scopes.extend(["active", "registered"]);
    } else if input.status == "qualified" {
        scopes.extend([
            "active",
            "qualified",
            if missing(input, true).is_empty() {
                "ready-to-convert"
            } else {
                "blocked-conversion"
            },
        ]);
    }
    scopes
}

pub fn follow_up_facts(
    rows: &[(DateTime<Utc>, Option<DateTime<Utc>>)],
    now: DateTime<Utc>,
) -> Result<FollowUpFacts, sqlx::Error> {
    let last = rows.first().map(|row| row.0);
    let next = rows.iter().filter_map(|row| row.1).min();
    let iso = |date| {
        crate::compat::scalars::js_iso_string(date)
            .map_err(|_| sqlx::Error::Protocol("invalid lead fact timestamp".into()))
    };
    Ok(FollowUpFacts {
        last_follow_up_at: last.map(iso).transpose()?,
        days_since_last_follow_up: last.map(|date| {
            ((now.timestamp_millis() - date.timestamp_millis()) as f64 / 86_400_000.0)
                .floor()
                .max(0.0) as i64
        }),
        follow_up_count30d: rows
            .iter()
            .filter(|row| row.0.timestamp_millis() >= now.timestamp_millis() - 30 * 86_400_000)
            .count(),
        has_planned_next_follow_up: next.is_some(),
        next_follow_up_at: next.map(iso).transpose()?,
        next_follow_up_overdue: next.is_some_and(|date| date < now),
    })
}

pub fn semantic_json_equal(left: &str, right: &str) -> Result<bool, sqlx::Error> {
    fn equal(left: &Value, right: &Value) -> bool {
        match (left, right) {
            (Value::Object(left), Value::Object(right)) => {
                left.len() == right.len()
                    && left
                        .iter()
                        .all(|(key, value)| right.get(key).is_some_and(|other| equal(value, other)))
            }
            (Value::Array(left), Value::Array(right)) => {
                left.len() == right.len()
                    && left
                        .iter()
                        .zip(right)
                        .all(|(left, right)| equal(left, right))
            }
            (Value::Number(left), Value::Number(right)) => {
                match (
                    left.to_string().parse::<rust_decimal::Decimal>(),
                    right.to_string().parse::<rust_decimal::Decimal>(),
                ) {
                    (Ok(left), Ok(right)) => left == right,
                    _ => left == right,
                }
            }
            _ => left == right,
        }
    }
    let parse = |raw: &str| {
        serde_json::from_str::<Value>(raw)
            .map_err(|_| sqlx::Error::Protocol("invalid lead snapshot JSON".into()))
    };
    Ok(equal(&parse(left)?, &parse(right)?))
}

#[cfg(test)]
mod tests {
    use super::super::model::js;
    use super::*;

    fn complete() -> GateInput {
        GateInput {
            source_code: "customer-visit".into(),
            demand_description: Some(js(&"😀".repeat(15))),
            budget_status: "budget-approved".into(),
            estimated_amount: Some("1200000.00".into()),
            urgency: "high".into(),
            expected_decision_date: Some("2026-06-01".into()),
            owner_user_id: Some(Uuid::nil()),
            owner_org_id: Some(Uuid::nil()),
            status: "registered".into(),
            converted_project_id: None,
        }
    }

    #[test]
    fn utf16_business_threshold_and_independent_gates() {
        let mut input = complete();
        let value = breakdown(&input, &Facts::default());
        assert_eq!(value.demand, 15);
        assert_eq!(value.total, 65);
        assert_eq!(rating(value.total), "B");
        assert!(missing(&input, false).is_empty());
        assert_eq!(missing(&input, true), vec!["qualified-status"]);
        input.status = "closed".into();
        input.budget_status = "unknown".into();
        input.owner_org_id = None;
        assert_eq!(
            missing(&input, false),
            vec!["not-closed", "registered-status", "budget", "owner-org"]
        );
    }

    #[test]
    fn full_facts_reach_one_hundred_and_keep_original_group_order() {
        let facts = Facts {
            sales_intelligence: IntelligenceFacts {
                decision_maker_known: true,
                technical_evaluator_known: true,
                procurement_process_known: true,
                budget_source_known: true,
                competitor_known: true,
                pain_point_known: true,
                next_contact_known: true,
            },
            follow_up: FollowUpFacts {
                follow_up_count30d: 3,
                days_since_last_follow_up: Some(2),
                has_planned_next_follow_up: true,
                ..Default::default()
            },
            attachment_evidence: AttachmentFacts {
                has_proposal_attachment: true,
                has_quotation_attachment: true,
                has_budget_evidence_attachment: true,
                ..Default::default()
            },
        };
        let value = breakdown(&complete(), &facts);
        assert_eq!(value.total, 100);
        assert_eq!(
            score_reason(&value),
            "基础商务+65；销售情报+20；跟进活跃+10；附件证据+5"
        );
    }

    #[test]
    fn semantic_facts_ignore_presentation_order_and_preserve_real_changes() {
        assert_eq!(
            semantic_json_equal(
                r#"{"a":1,"b":{"known":true,"text":"中"}}"#,
                r#"{"b":{"text":"\u4e2d","known":true},"a":1.0}"#
            )
            .ok(),
            Some(true)
        );
        assert_eq!(
            semantic_json_equal(
                r#"{"known":false,"count":1}"#,
                r#"{"count":1,"known":true}"#
            )
            .ok(),
            Some(false)
        );
        assert_eq!(
            semantic_json_equal(r#"["budget","owner"]"#, r#"["owner","budget"]"#).ok(),
            Some(false)
        );
        assert_eq!(
            semantic_json_equal(
                r#"{"count":9007199254740993}"#,
                r#"{"count":9007199254740992}"#
            )
            .ok(),
            Some(false)
        );
    }
}
