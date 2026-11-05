//! Preserve the stored audit history while preventing a second raw-value read
//! path around the domain's declared sensitive packages.
use std::collections::BTreeSet;

use serde_json::{Value, json};
use uuid::Uuid;

use super::{model::AuditLogSummary, service::RuntimeAuditError};
use crate::{
    auth::{
        audit::SecurityEventInput,
        projection::{
            self, ProjectionInput, ProjectionRequestContext, ProjectionUser, StringField,
        },
    },
    shared::generated::{SensitiveFieldPackageKey, SensitiveProjectionMode},
};

fn required_packages(
    row: &AuditLogSummary,
) -> Result<Vec<SensitiveFieldPackageKey>, RuntimeAuditError> {
    let mut names = BTreeSet::new();
    if let Some(value) = row
        .metadata
        .as_ref()
        .and_then(|v| v.get("requiredSensitivePackages"))
    {
        for value in value.as_array().ok_or(RuntimeAuditError::Internal)? {
            names.insert(
                value
                    .as_str()
                    .ok_or(RuntimeAuditError::Internal)?
                    .to_owned(),
            );
        }
    }
    if names.is_empty() {
        if row
            .metadata
            .as_ref()
            .and_then(|v| v.get("safeAuditSummary"))
            == Some(&Value::Bool(true))
        {
            return Ok(Vec::new());
        }
        if row.event_type.starts_with("ContractFinanceController_")
            || row.event_type.starts_with("ContractController_")
            || row
                .event_type
                .starts_with("ContractTermSnapshotController_")
            || row.event_type.starts_with("ContractReadinessController_")
        {
            names.insert("contract-finance".to_owned());
        } else if row.event_type.starts_with("ProjectCostController_") {
            // Historical unlabelled cost snapshots may include personal rates.
            names.extend(["operating-finance".to_owned(), "labor-cost-rate".to_owned()]);
        }
    }
    names
        .into_iter()
        .map(|name| name.parse().map_err(|_| RuntimeAuditError::Internal))
        .collect()
}

fn safe_metadata(row: &AuditLogSummary, packages: &[SensitiveFieldPackageKey]) -> Value {
    let mut safe = serde_json::Map::new();
    safe.insert("sensitiveRedacted".into(), Value::Bool(true));
    safe.insert("operationId".into(), json!(row.event_type));
    safe.insert(
        "requiredSensitivePackages".into(),
        json!(packages.iter().map(|p| p.as_str()).collect::<Vec<_>>()),
    );
    if let Some(metadata) = row.metadata.as_ref().and_then(Value::as_object) {
        if let Some(version) = metadata.get("schemaVersion").and_then(Value::as_u64) {
            safe.insert("schemaVersion".into(), json!(version));
        }
        for key in ["projectId", "contractId"] {
            if let Some(value) = metadata.get(key)
                && (value.is_null() || value.as_str().is_some_and(|v| Uuid::parse_str(v).is_ok()))
            {
                safe.insert(key.to_owned(), value.clone());
            }
        }
    }
    Value::Object(safe)
}

pub fn protect(
    mut rows: Vec<AuditLogSummary>,
    user: ProjectionUser,
    context: ProjectionRequestContext,
) -> Result<(Vec<AuditLogSummary>, Vec<SecurityEventInput>), RuntimeAuditError> {
    let mut events = Vec::new();
    for row in &mut rows {
        let packages = required_packages(row)?;
        let mut hidden = false;
        for package in &packages {
            let plan = projection::plan(&ProjectionInput {
                field_package_key: *package,
                fields: vec![StringField {
                    key: "auditPayload".into(),
                    // A real audit identity is sufficient for a permission
                    // decision. Never copy the hidden data into event details.
                    raw_value: Some(row.id.clone()),
                    display_text_when_full: None,
                    masked_display_text: None,
                    denied_display_text: None,
                }],
                user: Some(user.clone()),
                target_type: "audit-log".into(),
                target_id: row.id.clone(),
                request_context: context.clone(),
                mode_when_unauthorized: None,
                masked_display_text: None,
                denied_display_text: None,
            })
            .map_err(|_| RuntimeAuditError::Internal)?;
            hidden |= plan
                .fields
                .get("auditPayload")
                .is_none_or(|field| field.mode != SensitiveProjectionMode::Full);
            if let Some(event) = plan.event {
                events.push(event);
            }
        }
        if hidden {
            let metadata = safe_metadata(row, &packages);
            row.before_snapshot = None;
            row.after_snapshot = None;
            row.reason = None;
            row.metadata = Some(metadata);
        }
    }
    Ok((rows, events))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row() -> AuditLogSummary {
        AuditLogSummary {
            id: Uuid::nil().to_string(),
            event_type: "ProjectCostController_createProjectActualCostRecord".into(),
            target_type: "ProjectActualCostRecord".into(),
            target_id: Uuid::nil().to_string(),
            operator_id: None,
            request_id: None,
            result: "success".into(),
            reason: Some("SECRET_RATE_REASON".into()),
            before_snapshot: Some(json!({"unitRate":"SECRET_RATE_BEFORE"})),
            after_snapshot: Some(json!({"amount":"SECRET_RATE_AFTER"})),
            metadata: Some(
                json!({"requiredSensitivePackages":["labor-cost-rate"],"projectId":Uuid::nil(),"raw":"SECRET_RATE_METADATA"}),
            ),
            occurred_at: "2026-11-04T00:00:00.000Z".into(),
        }
    }
    fn context() -> ProjectionRequestContext {
        ProjectionRequestContext {
            request_id: None,
            path: "/api/audit-logs".into(),
            method: Some("GET".into()),
            ip: None,
            user_agent: None,
        }
    }
    fn user(permissions: &[&str]) -> ProjectionUser {
        ProjectionUser {
            sub: Uuid::nil(),
            username: "audit-user".into(),
            permissions: permissions.iter().map(|p| (*p).to_owned()).collect(),
        }
    }
    #[test]
    fn audit_management_does_not_release_personal_rate_snapshots_or_freeform_metadata() {
        let (rows, events) = protect(
            vec![row()],
            user(&["platform:users:manage", "operating:finance:sensitive:read"]),
            context(),
        )
        .unwrap_or_else(|_| panic!("projection"));
        let wire = serde_json::to_string(&rows).unwrap_or_else(|_| panic!("json"));
        assert!(!wire.contains("SECRET_RATE"));
        assert_eq!(events.len(), 1);
        assert!(
            rows[0]
                .metadata
                .as_ref()
                .is_some_and(|m| m["sensitiveRedacted"] == true)
        );
    }
    #[test]
    fn explicitly_authorized_auditor_keeps_the_real_stored_history() {
        let (rows, events) = protect(
            vec![row()],
            user(&["labor-cost-rate:sensitive:read"]),
            context(),
        )
        .unwrap_or_else(|_| panic!("projection"));
        assert_eq!(rows[0].after_snapshot, row().after_snapshot);
        assert_eq!(rows[0].reason, row().reason);
        assert!(events.is_empty());
    }
    #[test]
    fn malformed_required_package_is_fail_closed() {
        let mut input = row();
        input.metadata = Some(json!({"requiredSensitivePackages":["invented-package"]}));
        assert!(protect(vec![input], user(&[]), context()).is_err());
    }
}
