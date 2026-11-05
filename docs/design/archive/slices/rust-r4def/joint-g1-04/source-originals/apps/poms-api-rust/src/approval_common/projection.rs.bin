//! Pure original mappings. Facts are supplied explicitly; these types do not
//! read, validate, mutate or stand in for any migrated domain repository.

use super::{Text, model::*, transition::node_name};
use chrono::{Datelike, TimeDelta, Timelike};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractFact {
    pub contract_no: Option<Text>,
    pub status: Option<Text>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayoutFact {
    pub stage_type: Text,
    pub status: Option<Text>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustmentFact {
    pub adjustment_type: Text,
    pub status: Option<Text>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuppliedFacts {
    pub contract: Option<ContractFact>,
    pub payout: Option<PayoutFact>,
    pub adjustment: Option<AdjustmentFact>,
    pub project_name: Option<Text>,
    pub lead_name: Option<Text>,
    pub customer_display_name: Option<Text>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalProjection {
    #[serde(flatten)]
    pub record: ApprovalRecord,
    pub current_node_name: Option<Text>,
    pub target_title: Option<Text>,
    pub target_status: Option<Text>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoProjection {
    #[serde(flatten)]
    pub todo: TodoItem,
    pub target_title: Option<Text>,
    pub current_node_name: Option<Text>,
    pub allowed_actions: Vec<Text>,
}

pub fn payout_stage_name(stage: &Text) -> Text {
    for (key, name) in [
        ("first", "第一阶段"),
        ("second", "第二阶段"),
        ("final", "最终阶段"),
        ("retention", "质保金结算"),
    ] {
        if stage.eq_ascii(key) {
            return Text::from(name);
        }
    }
    stage.clone()
}

pub fn adjustment_type_name(kind: &Text) -> Text {
    for (key, name) in [
        ("suspend-payout", "暂停发放"),
        ("reverse-payout", "冲销发放"),
        ("clawback", "扣回"),
        ("supplement", "补发"),
        ("recalculate", "重算"),
    ] {
        if kind.eq_ascii(key) {
            return Text::from(name);
        }
    }
    kind.clone()
}

fn target_title(facts: &SuppliedFacts) -> Option<Text> {
    facts
        .contract
        .as_ref()
        .and_then(|contract| contract.contract_no.clone())
        .or_else(|| {
            facts
                .payout
                .as_ref()
                .map(|payout| payout_stage_name(&payout.stage_type).concat(&Text::from("提成发放")))
        })
        .or_else(|| {
            facts.adjustment.as_ref().map(|adjustment| {
                adjustment_type_name(&adjustment.adjustment_type).concat(&Text::from("调整"))
            })
        })
}

pub fn approval(record: &ApprovalRecord, facts: &SuppliedFacts) -> ApprovalProjection {
    ApprovalProjection {
        record: record.clone(),
        current_node_name: node_name(&record.current_node_key),
        target_title: target_title(facts),
        target_status: facts
            .contract
            .as_ref()
            .and_then(|contract| contract.status.clone())
            .or_else(|| {
                facts
                    .payout
                    .as_ref()
                    .and_then(|payout| payout.status.clone())
            })
            .or_else(|| {
                facts
                    .adjustment
                    .as_ref()
                    .and_then(|adjustment| adjustment.status.clone())
            }),
    }
}

pub fn china_date_time(value: Timestamp) -> Text {
    let Some(value) = value.0.checked_add_signed(TimeDelta::hours(8)) else {
        return Text::from("NaN-NaN-NaN NaN:NaN");
    };
    Text::from(format!(
        "{}-{:02}-{:02} {:02}:{:02}",
        value.year(),
        value.month(),
        value.day(),
        value.hour(),
        value.minute()
    ))
}

pub fn todo(
    todo: &TodoItem,
    record: Option<&ApprovalRecord>,
    facts: &SuppliedFacts,
) -> TodoProjection {
    let reminder = todo.source_type.eq_ascii("sales-follow-up-record")
        && todo.todo_type.eq_ascii("sales-follow-up-reminder");
    let current_node_name = if let Some(record) = record {
        node_name(&record.current_node_key)
    } else if reminder {
        Some(match todo.due_at {
            Some(due_at) => Text::from("下次跟进：").concat(&china_date_time(due_at)),
            None => Text::from("下次跟进"),
        })
    } else {
        None
    };
    TodoProjection {
        todo: todo.clone(),
        target_title: target_title(facts)
            .or_else(|| facts.project_name.clone())
            .or_else(|| facts.lead_name.clone())
            .or_else(|| facts.customer_display_name.clone()),
        current_node_name,
        allowed_actions: if todo.todo_type.eq_ascii("approval")
            && (todo.status.eq_ascii("open") || todo.status.eq_ascii("processing"))
        {
            vec![Text::from("approve"), Text::from("reject")]
        } else {
            Vec::new()
        },
    }
}
