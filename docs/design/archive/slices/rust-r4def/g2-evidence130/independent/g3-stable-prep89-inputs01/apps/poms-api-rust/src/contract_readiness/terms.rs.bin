use std::collections::{BTreeMap, BTreeSet};

use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::contract_support::{Error, money, money_string, ratio, ratio_string};

pub(super) fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, Error> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| Error::BadRequest(format!("{key} is required")))
}
pub(super) fn uuid(value: &str) -> Result<Uuid, Error> {
    Uuid::parse_str(value).map_err(|_| Error::BadRequest("Invalid UUID".into()))
}
pub(super) fn id(value: &Value, key: &str) -> Result<Uuid, Error> {
    uuid(text(value, key)?)
}
pub(super) fn optional_text(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}
pub(super) fn date(value: &str) -> Result<NaiveDate, Error> {
    let parsed = NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| Error::BadRequest("Invalid calendar date".into()))?;
    if value.len() != 10 || parsed.year() < 1 || parsed.format("%Y-%m-%d").to_string() != value {
        return Err(Error::BadRequest("Invalid calendar date".into()));
    }
    Ok(parsed)
}
fn bounded(value: &str, max: usize, field: &str) -> Result<String, Error> {
    let value = value.trim();
    if value.is_empty() || value.encode_utf16().count() > max {
        return Err(Error::BadRequest(format!("Invalid {field}")));
    }
    Ok(value.to_owned())
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(super) struct Seed {
    pub node_key: String,
    pub label: String,
    pub planned_amount: String,
    pub planned_date: String,
    pub is_retention_node: bool,
    pub sort_order: i32,
    pub note: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(super) struct Terms {
    pub contract_id: Uuid,
    pub amount_tax_inclusive: String,
    pub amount_tax_exclusive: String,
    pub tax_rate: String,
    pub down_payment_rate: String,
    pub retention_rate: String,
    pub retention_due_date: Option<String>,
    pub payment_terms: String,
    pub receivable_plan_seeds: Vec<Seed>,
}

impl Terms {
    pub fn parse(value: &Value) -> Result<Self, Error> {
        let inclusive = money(text(value, "amountTaxInclusive")?)?;
        let exclusive = money(text(value, "amountTaxExclusive")?)?;
        if exclusive > inclusive {
            return Err(Error::BadRequest(
                "amountTaxExclusive cannot exceed amountTaxInclusive".into(),
            ));
        }
        let tax = ratio(text(value, "taxRate")?)?;
        let down = ratio(text(value, "downPaymentRate")?)?;
        let retention = ratio(text(value, "retentionRate")?)?;
        let retention_due_date = optional_text(value, "retentionDueDate");
        let due = retention_due_date.as_deref().map(date).transpose()?;
        let input_seeds = value
            .get("receivablePlanSeeds")
            .and_then(Value::as_array)
            .ok_or_else(|| Error::BadRequest("receivablePlanSeeds is required".into()))?;
        if input_seeds.is_empty() {
            return Err(Error::BadRequest(
                "Receivable plan requires at least one seed".into(),
            ));
        }
        let mut keys = BTreeSet::new();
        let mut orders = BTreeSet::new();
        let mut total = 0_i128;
        let mut retained = 0_i128;
        let mut seeds = Vec::with_capacity(input_seeds.len());
        let mut retention_nodes = 0;
        for seed in input_seeds {
            let node_key = bounded(text(seed, "nodeKey")?, 64, "nodeKey")?;
            let order = seed
                .get("sortOrder")
                .and_then(Value::as_i64)
                .and_then(|n| i32::try_from(n).ok())
                .filter(|n| *n >= 0)
                .ok_or_else(|| Error::BadRequest("sortOrder must be a nonnegative int4".into()))?;
            if !keys.insert(node_key.clone()) || !orders.insert(order) {
                return Err(Error::BadRequest(
                    "Duplicate seed nodeKey or sortOrder".into(),
                ));
            }
            let amount = money(text(seed, "plannedAmount")?)?;
            total = total
                .checked_add(amount)
                .ok_or_else(|| Error::BadRequest("Seed amount sum is out of range".into()))?;
            let planned_date = text(seed, "plannedDate")?.to_owned();
            let planned = date(&planned_date)?;
            let is_retention_node = seed
                .get("isRetentionNode")
                .and_then(Value::as_bool)
                .ok_or_else(|| Error::BadRequest("isRetentionNode is required".into()))?;
            if is_retention_node {
                retention_nodes += 1;
                retained = retained
                    .checked_add(amount)
                    .ok_or_else(|| Error::BadRequest("Retention amount is out of range".into()))?;
                if due.is_none_or(|due| planned < due) {
                    return Err(Error::BadRequest(
                        "Retention seed requires a due date and cannot precede it".into(),
                    ));
                }
            }
            let note = optional_text(seed, "note");
            if note
                .as_ref()
                .is_some_and(|s| s.encode_utf16().count() > 1000)
            {
                return Err(Error::BadRequest(
                    "Seed note exceeds 1000 characters".into(),
                ));
            }
            seeds.push(Seed {
                node_key,
                label: bounded(text(seed, "label")?, 128, "label")?,
                planned_amount: money_string(amount),
                planned_date,
                is_retention_node,
                sort_order: order,
                note,
            });
        }
        let product = inclusive
            .checked_mul(i128::from(retention))
            .ok_or_else(|| Error::BadRequest("Retention amount is out of range".into()))?;
        if total != inclusive
            || product % 10000 != 0
            || retained != product / 10000
            || (retention > 0 && (retention_nodes == 0 || due.is_none()))
            || (retention == 0 && retention_nodes != 0)
        {
            return Err(Error::BadRequest("Seeds must exactly match this contract amount and retention terms without rounding".into()));
        }
        seeds.sort_by_key(|seed| seed.sort_order);
        Ok(Self {
            contract_id: id(value, "contractId")?,
            amount_tax_inclusive: money_string(inclusive),
            amount_tax_exclusive: money_string(exclusive),
            tax_rate: ratio_string(tax),
            down_payment_rate: ratio_string(down),
            retention_rate: ratio_string(retention),
            retention_due_date,
            payment_terms: bounded(text(value, "paymentTerms")?, 1000, "paymentTerms")?,
            receivable_plan_seeds: seeds,
        })
    }
    pub fn value(&self) -> Result<Value, Error> {
        serde_json::to_value(self).map_err(|_| Error::Internal)
    }
}

#[derive(Clone)]
pub(super) struct DiffItem {
    pub key: String,
    pub level: &'static str,
    pub old: Value,
    pub new: Value,
}
impl DiffItem {
    pub fn value(&self, id: Uuid, order: usize) -> Value {
        json!({"id":id,"fieldKey":self.key,"fieldLabel":self.key,
            "oldValueSummary":summary(&self.old),"newValueSummary":summary(&self.new),
            "diffLevel":self.level,"isBlocking":self.level=="reapproval-required","sortOrder":order})
    }
}
fn summary(value: &Value) -> Value {
    if value.is_null() {
        return Value::Null;
    }
    let raw = value
        .as_str()
        .map(str::to_owned)
        .unwrap_or_else(|| value.to_string());
    let mut units = 0;
    let mut result = String::new();
    for c in raw.chars() {
        units += c.len_utf16();
        if units > 1000 {
            break;
        }
        result.push(c);
    }
    json!(result)
}
fn push(items: &mut Vec<DiffItem>, key: &str, old: Value, new: Value, level: &'static str) {
    if old != new {
        items.push(DiffItem {
            key: key.to_owned(),
            level,
            old,
            new,
        });
    }
}
pub(super) fn diff(reference: &Terms, candidate: &Terms) -> Result<Vec<DiffItem>, Error> {
    let mut items = Vec::new();
    // No real contract-specific cost producer exists in this slice. Amount
    // changes cannot prove that an approval band did not change, even <=3%.
    for (key, old, new) in [
        (
            "amountTaxInclusive",
            &reference.amount_tax_inclusive,
            &candidate.amount_tax_inclusive,
        ),
        (
            "amountTaxExclusive",
            &reference.amount_tax_exclusive,
            &candidate.amount_tax_exclusive,
        ),
        ("taxRate", &reference.tax_rate, &candidate.tax_rate),
        (
            "retentionRate",
            &reference.retention_rate,
            &candidate.retention_rate,
        ),
        (
            "paymentTerms",
            &reference.payment_terms,
            &candidate.payment_terms,
        ),
    ] {
        push(
            &mut items,
            key,
            json!(old),
            json!(new),
            "reapproval-required",
        );
    }
    push(
        &mut items,
        "retentionDueDate",
        json!(reference.retention_due_date),
        json!(candidate.retention_due_date),
        "reapproval-required",
    );
    let old_down = ratio(&reference.down_payment_rate)?;
    let new_down = ratio(&candidate.down_payment_rate)?;
    let level = if (old_down < 2000) != (new_down < 2000) || (old_down - new_down).abs() > 500 {
        "reapproval-required"
    } else {
        "review-required"
    };
    push(
        &mut items,
        "downPaymentRate",
        json!(reference.down_payment_rate),
        json!(candidate.down_payment_rate),
        level,
    );
    let old: BTreeMap<_, _> = reference
        .receivable_plan_seeds
        .iter()
        .map(|s| (s.node_key.as_str(), s))
        .collect();
    let new: BTreeMap<_, _> = candidate
        .receivable_plan_seeds
        .iter()
        .map(|s| (s.node_key.as_str(), s))
        .collect();
    let keys: BTreeSet<_> = old.keys().chain(new.keys()).copied().collect();
    for key in keys {
        match (old.get(key), new.get(key)) {
            (Some(a), Some(b)) => {
                let prefix = format!("receivablePlanSeeds[{key}]");
                for (field, a, b, level) in [
                    (
                        "plannedAmount",
                        json!(a.planned_amount),
                        json!(b.planned_amount),
                        "reapproval-required",
                    ),
                    (
                        "sortOrder",
                        json!(a.sort_order),
                        json!(b.sort_order),
                        "reapproval-required",
                    ),
                    (
                        "isRetentionNode",
                        json!(a.is_retention_node),
                        json!(b.is_retention_node),
                        "reapproval-required",
                    ),
                    ("label", json!(a.label), json!(b.label), "review-required"),
                    ("note", json!(a.note), json!(b.note), "review-required"),
                ] {
                    push(&mut items, &format!("{prefix}.{field}"), a, b, level);
                }
                let days = (date(&a.planned_date)? - date(&b.planned_date)?)
                    .num_days()
                    .abs();
                push(
                    &mut items,
                    &format!("{prefix}.plannedDate"),
                    json!(a.planned_date),
                    json!(b.planned_date),
                    if days > 10 {
                        "reapproval-required"
                    } else {
                        "review-required"
                    },
                );
            }
            (a, b) => push(
                &mut items,
                &format!("receivablePlanSeeds[{key}]"),
                json!(a.map(|s| s.node_key.as_str())),
                json!(b.map(|s| s.node_key.as_str())),
                "reapproval-required",
            ),
        }
    }
    Ok(items)
}
pub(super) fn overall(items: &[DiffItem]) -> &'static str {
    if items.iter().any(|i| i.level == "reapproval-required") {
        "reapproval-required"
    } else if !items.is_empty() {
        "review-required"
    } else {
        "prompt"
    }
}
