//! Explicit output whitelist and registered field packages. Raw data never
//! accompanies projections, including for privileged callers and write receipts.
use crate::{
    approval_common::CommonSession,
    auth::{
        audit::insert_security_event,
        projection::{self, ProjectionInput, ProjectionUser, StringField},
    },
    contract_support::{Actor, Error},
    shared::generated::SensitiveFieldPackageKey,
};
use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::{Value, json};

const OPERATING: &[&str] = &[
    "amountExcludingTax",
    "taxCostAmount",
    "amountIncludingTax",
    "sourceId",
    "sourceRefNo",
    "costDescription",
    "evidenceSummary",
    "taxImpactSummary",
    "riskNote",
    "voidReason",
    "measurementBasisSummary",
    "sourceStatusSummary",
];
const LABOR: &[&str] = &[
    "laborPersonId",
    "laborRole",
    "actualHours",
    "actualPersonDays",
    "internalCostRate",
    "rateVersionId",
    "laborAmount",
    "amountExcludingTax",
    "taxCostAmount",
    "amountIncludingTax",
    "sourceId",
    "sourceRefNo",
    "sourceStatusSummary",
    "measurementBasisSummary",
    "costDescription",
    "evidenceSummary",
    "workSummary",
    "taxImpactSummary",
    "riskNote",
    "voidReason",
];
const EXPENSE: &[&str] = &[
    "amountIncludingTax",
    "taxAmount",
    "amountExcludingTax",
    "expenseDescription",
    "evidenceSummary",
    "voidReason",
];

pub fn value(row: &Value, key: &str) -> Value {
    row.get(key).cloned().unwrap_or(Value::Null)
}
fn instant(v: &Value) -> Result<Value, Error> {
    match v.as_str() {
        None if v.is_null() => Ok(Value::Null),
        Some(v) => DateTime::parse_from_rfc3339(v)
            .map(|t| {
                json!(
                    t.with_timezone(&Utc)
                        .to_rfc3339_opts(SecondsFormat::Millis, true)
                )
            })
            .map_err(|_| Error::Internal),
        _ => Err(Error::Internal),
    }
}
fn snake(camel: &str) -> String {
    let mut s = String::new();
    for c in camel.chars() {
        if c.is_ascii_uppercase() {
            s.push('_');
            s.push(c.to_ascii_lowercase());
        } else {
            s.push(c);
        }
    }
    s
}
fn raw(row: &Value, keys: &[&str]) -> Value {
    Value::Object(
        keys.iter()
            .map(|k| ((*k).to_owned(), value(row, &snake(k))))
            .collect(),
    )
}
async fn packet(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    target: &str,
    row: &Value,
    package: SensitiveFieldPackageKey,
    keys: &[&str],
    raw: &Value,
) -> Result<Value, Error> {
    let input = ProjectionInput {
        field_package_key: package,
        fields: keys
            .iter()
            .map(|key| StringField {
                key: (*key).into(),
                raw_value: raw[*key].as_str().map(str::to_owned),
                display_text_when_full: raw[*key].as_str().map(display_text),
                masked_display_text: None,
                denied_display_text: None,
            })
            .collect(),
        user: Some(ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|p| p.as_str().to_owned())
                .collect(),
        }),
        target_type: target.into(),
        target_id: row["id"].as_str().ok_or(Error::Internal)?.into(),
        request_context: actor.request_context.clone(),
        mode_when_unauthorized: None,
        masked_display_text: None,
        denied_display_text: None,
    };
    let plan = projection::plan(&input).map_err(|_| Error::Internal)?;
    if let Some(event) = plan.event {
        insert_security_event(session.connection, &event).await?;
    }
    serde_json::to_value(plan.fields).map_err(|_| Error::Internal)
}
fn display_text(value: &str) -> String {
    if value.is_empty() {
        return "-".into();
    }
    let mut units = 0;
    value
        .chars()
        .take_while(|c| {
            units += c.len_utf16();
            units <= 2000
        })
        .collect()
}
fn expense_shape(row: &Value) -> Result<Value, Error> {
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"contractId":row["contract_id"],"expenseCategory":row["expense_category"],"expenseDescription":null,"expenseDate":row["expense_date"],"currency":row["currency"],"amountIncludingTax":null,"taxAmount":null,"amountExcludingTax":null,"sourceType":row["source_type"],"status":row["status"],"evidenceSummary":null,"attachmentCount":row["attachment_count"],"confirmedAt":instant(&row["confirmed_at"])? ,"confirmedBy":row["confirmed_by"],"voidedAt":instant(&row["voided_at"])? ,"voidReason":null,"rowVersion":row["row_version"],"createdAt":instant(&row["created_at"])? ,"updatedAt":instant(&row["updated_at"])?}),
    )
}
pub async fn expense(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    row: &Value,
    actions: Option<Vec<&str>>,
) -> Result<Value, Error> {
    let mut v = expense_shape(row)?;
    v["financialProjection"] = packet(
        session,
        actor,
        "ExpenseRecord",
        row,
        SensitiveFieldPackageKey::OperatingFinance,
        EXPENSE,
        &raw(row, EXPENSE),
    )
    .await?;
    if let Some(actions) = actions {
        v["allowedActions"] = json!(actions);
    }
    Ok(v)
}
fn cost_shape(row: &Value) -> Result<Value, Error> {
    let mut v = json!({});
    for k in [
        "id",
        "projectId",
        "recordNo",
        "costType",
        "costSubtype",
        "occurredOn",
        "accountingPeriod",
        "executionStageCode",
        "stageDerivedFromType",
        "stageDerivedFromId",
        "currency",
        "recordStatus",
        "isIncludedInProjectCost",
        "isHighRisk",
        "sourceType",
        "attachmentCount",
        "registeredBy",
        "confirmedBy",
        "includedBy",
        "ownerRole",
        "supersedesRecordId",
        "rowVersion",
    ] {
        v[k] = value(row, &snake(k));
    }
    for k in [
        "registeredAt",
        "confirmedAt",
        "includedAt",
        "stageDerivedAt",
        "stageLockedAt",
        "createdAt",
        "updatedAt",
    ] {
        v[k] = instant(&value(row, &snake(k)))?;
    }
    for k in [
        "amountExcludingTax",
        "taxCostAmount",
        "amountIncludingTax",
        "sourceId",
        "sourceRefNo",
        "costDescription",
        "evidenceSummary",
        "taxImpactSummary",
        "riskNote",
        "voidReason",
    ] {
        v[k] = Value::Null;
    }
    Ok(v)
}
pub async fn cost(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    row: &Value,
    detail: Option<(Value, Option<String>, Vec<&str>)>,
) -> Result<Value, Error> {
    let mut v = cost_shape(row)?;
    let labor = row["cost_type"] == "labor";
    let keys = if labor { LABOR } else { OPERATING };
    let mut data = raw(row, keys);
    if let Some((facts, chain, actions)) = &detail {
        data["sourceStatusSummary"] = value(facts, "sourceStatus");
        data["measurementBasisSummary"] = measurement(row);
        v["sourceStatusSummary"] = Value::Null;
        v["measurementBasisSummary"] = Value::Null;
        v["effectivePeriodSummary"] = if labor {
            json!(format!(
                "{} ~ {}",
                row["labor_period_start"].as_str().unwrap_or("-"),
                row["labor_period_end"].as_str().unwrap_or("-")
            ))
        } else {
            value(row, "occurred_on")
        };
        v["supersedesSummary"] = json!(chain);
        v["allowedActions"] = json!(actions);
        for k in [
            "laborPeriodType",
            "laborPeriodStart",
            "laborPeriodEnd",
            "deliveryStage",
        ] {
            v[k] = value(row, &snake(k));
        }
    }
    let projected = packet(
        session,
        actor,
        "ProjectActualCostRecord",
        row,
        if labor {
            SensitiveFieldPackageKey::LaborCostRate
        } else {
            SensitiveFieldPackageKey::OperatingFinance
        },
        keys,
        &data,
    )
    .await?;
    v["financialProjection"] = if labor {
        Value::Null
    } else {
        projected.clone()
    };
    v["laborSensitiveProjection"] = if labor { projected } else { Value::Null };
    Ok(v)
}
fn measurement(row: &Value) -> Value {
    if row["cost_type"] == "labor" {
        let (q, u) = if row["actual_hours"].is_string() {
            (&row["actual_hours"], "h")
        } else {
            (&row["actual_person_days"], "d")
        };
        match (
            q.as_str(),
            row["internal_cost_rate"].as_str(),
            row["currency"].as_str(),
        ) {
            (Some(q), Some(r), Some(c)) => json!(format!("{q}{u} × {r} {c}")),
            _ => Value::Null,
        }
    } else {
        match (
            row["amount_including_tax"]
                .as_str()
                .or(row["amount_excluding_tax"].as_str()),
            row["currency"].as_str(),
            row["occurred_on"].as_str(),
        ) {
            (Some(a), Some(c), Some(d)) => json!(format!("{a} {c} @ {d}")),
            _ => Value::Null,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn packets_cover_every_sensitive_financial_and_reversible_field() {
        for key in [
            "amountExcludingTax",
            "taxCostAmount",
            "amountIncludingTax",
            "sourceId",
            "sourceRefNo",
            "costDescription",
            "evidenceSummary",
            "taxImpactSummary",
            "riskNote",
            "voidReason",
            "measurementBasisSummary",
            "sourceStatusSummary",
        ] {
            assert!(OPERATING.contains(&key));
            assert!(LABOR.contains(&key));
        }
        assert!(EXPENSE.contains(&"expenseDescription"));
        assert!(EXPENSE.contains(&"voidReason"));
    }
    #[test]
    fn calculation_uses_immutable_record_not_live_source() {
        let row = json!({"cost_type":"labor","actual_hours":"0.01","internal_cost_rate":"0.5000","currency":"CNY"});
        assert_eq!(measurement(&row), json!("0.01h × 0.5000 CNY"));
    }
    #[test]
    fn raw_shapes_never_expose_financial_or_unknown_payload_for_any_cost_type() {
        for kind in ["expense", "invoice", "payment-fact", "procurement", "labor"] {
            let row = json!({"cost_type":kind,"amount_excluding_tax":"SECRET","tax_cost_amount":"SECRET","amount_including_tax":"SECRET","source_id":"SECRET","source_ref_no":"SECRET","cost_description":"SECRET","evidence_summary":"SECRET","tax_impact_summary":"SECRET","risk_note":"SECRET","void_reason":"SECRET","source_basis":{"data":"SECRET"},"calculation_basis":{"data":"SECRET"}});
            let Ok(v) = cost_shape(&row) else {
                panic!("cost shape");
            };
            assert!(!v.to_string().contains("SECRET"));
            for key in [
                "amountExcludingTax",
                "taxCostAmount",
                "amountIncludingTax",
                "sourceId",
                "sourceRefNo",
                "costDescription",
                "evidenceSummary",
                "taxImpactSummary",
                "riskNote",
                "voidReason",
            ] {
                assert!(v[key].is_null());
            }
            assert!(v.get("source_basis").is_none());
        }
    }
    #[test]
    fn expense_required_gross_description_and_write_receipt_shape_are_null() {
        let row = json!({"amount_including_tax":"SECRET","tax_amount":"SECRET","amount_excluding_tax":"SECRET","expense_description":"SECRET","evidence_summary":"SECRET","void_reason":"SECRET"});
        let Ok(v) = expense_shape(&row) else {
            panic!("expense shape");
        };
        assert!(!v.to_string().contains("SECRET"));
        for key in EXPENSE {
            assert!(v.get(*key).is_some_and(Value::is_null));
        }
    }
    #[test]
    fn instants_are_normalized_to_utc_regardless_of_pg_session_zone() {
        let Ok(v) = instant(&json!("2026-11-04T08:00:00+08:00")) else {
            panic!("instant");
        };
        assert_eq!(v, json!("2026-11-04T00:00:00.000Z"));
    }
    #[test]
    fn full_display_text_is_bounded_without_truncating_projected_original() {
        assert_eq!(
            display_text(&"🙂".repeat(1500)).encode_utf16().count(),
            2000
        );
        assert_eq!(display_text("123.45"), "123.45");
        assert_eq!(display_text(""), "-");
    }
    fn plan(
        package: SensitiveFieldPackageKey,
        permissions: Vec<String>,
        original: Option<&str>,
    ) -> projection::ProjectionPlan {
        let input = ProjectionInput {
            field_package_key: package,
            fields: vec![StringField {
                key: "amount".into(),
                raw_value: original.map(str::to_owned),
                display_text_when_full: None,
                masked_display_text: None,
                denied_display_text: None,
            }],
            user: Some(ProjectionUser {
                sub: uuid::Uuid::nil(),
                username: "pure-policy-test".into(),
                permissions,
            }),
            target_type: "ProjectActualCostRecord".into(),
            target_id: uuid::Uuid::nil().to_string(),
            request_context: crate::auth::projection::ProjectionRequestContext {
                request_id: None,
                path: "/pure-policy-test".into(),
                method: Some("GET".into()),
                ip: None,
                user_agent: None,
            },
            mode_when_unauthorized: None,
            masked_display_text: None,
            denied_display_text: None,
        };
        match projection::plan(&input) {
            Ok(p) => p,
            Err(_) => panic!("projection plan"),
        }
    }
    #[test]
    fn finance_manage_never_grants_sensitive_read_and_null_is_not_zero() {
        for package in [
            SensitiveFieldPackageKey::OperatingFinance,
            SensitiveFieldPackageKey::LaborCostRate,
        ] {
            let p = plan(
                package,
                vec!["contract:finance:manage".into()],
                Some("123.45"),
            );
            let Ok(value) = serde_json::to_value(p.fields) else {
                panic!("serialize");
            };
            assert_eq!(value["amount"]["mode"], "masked");
            assert!(value["amount"]["value"].is_null());
            assert!(p.event.is_some());
            assert!(!value.to_string().contains("123.45"));
        }
        let p = plan(SensitiveFieldPackageKey::OperatingFinance, vec![], None);
        let Ok(v) = serde_json::to_value(p.fields) else {
            panic!("serialize");
        };
        assert_eq!(v["amount"]["reasonCode"], "field-package-not-applicable");
        assert!(v["amount"]["value"].is_null());
        assert!(p.event.is_none());
    }
    #[test]
    fn operating_and_labor_sensitive_permissions_are_independent() {
        for (package, permission, other) in [
            (
                SensitiveFieldPackageKey::OperatingFinance,
                "operating:finance:sensitive:read",
                "labor-cost-rate:sensitive:read",
            ),
            (
                SensitiveFieldPackageKey::LaborCostRate,
                "labor-cost-rate:sensitive:read",
                "operating:finance:sensitive:read",
            ),
        ] {
            let yes = plan(package, vec![permission.into()], Some("123.45"));
            let no = plan(package, vec![other.into()], Some("123.45"));
            let Ok(yes) = serde_json::to_value(yes.fields) else {
                panic!("serialize");
            };
            let Ok(no) = serde_json::to_value(no.fields) else {
                panic!("serialize");
            };
            assert_eq!(yes["amount"]["value"], "123.45");
            assert_eq!(yes["amount"]["mode"], "full");
            assert!(no["amount"]["value"].is_null());
        }
    }
}
