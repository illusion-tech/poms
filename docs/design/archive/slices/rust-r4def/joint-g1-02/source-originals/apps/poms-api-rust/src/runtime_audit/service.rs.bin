use std::{error::Error, fmt};

use chrono::{DateTime, Utc};

use super::{
    model::{AuditLogSummary, SecurityEventSummary},
    query::ValidatedQuery,
    store::{self, AuditFilter, SecurityFilter},
};
use crate::{
    auth::{cookie::trim_js, model::AuthUser},
    compat::scalars::parse_legacy_timestamp_utc,
    database::{Database, DbError},
    shared::generated::{EntityAuditTargetType, PermissionKey},
};

#[derive(Debug)]
pub enum RuntimeAuditError {
    BadRequest(String),
    Forbidden(String),
    Database(DbError),
    Internal,
}
impl fmt::Display for RuntimeAuditError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::BadRequest(_) => "runtime audit target was rejected",
            Self::Forbidden(_) => "runtime audit target access was denied",
            Self::Database(_) => "runtime audit read failed",
            Self::Internal => "runtime audit operation failed",
        })
    }
}
impl Error for RuntimeAuditError {}
impl From<DbError> for RuntimeAuditError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}

fn timestamp(
    query: &ValidatedQuery,
    key: &str,
) -> Result<Option<DateTime<Utc>>, RuntimeAuditError> {
    query
        .text(key)
        .map(|value| parse_legacy_timestamp_utc(&value).map_err(|_| RuntimeAuditError::Internal))
        .transpose()
}
fn audit_filter(query: &ValidatedQuery) -> Result<AuditFilter, RuntimeAuditError> {
    Ok(AuditFilter {
        from: timestamp(query, "from")?,
        to: timestamp(query, "to")?,
        event_type: query.text("eventType"),
        target_type: query.text("targetType"),
        target_id: query.text("targetId"),
        operator_id: query.text("operatorId"),
        result: query.text("result"),
        limit: query.limit(),
    })
}
pub(crate) fn read_permissions(target: EntityAuditTargetType) -> &'static [PermissionKey] {
    match target {
        EntityAuditTargetType::Lead => &[PermissionKey::LeadRead],
        EntityAuditTargetType::Customer | EntityAuditTargetType::CustomerContact => {
            &[PermissionKey::CustomerRead]
        }
        EntityAuditTargetType::OpportunityStakeholder
        | EntityAuditTargetType::CompetitorIntelligence
        | EntityAuditTargetType::SalesDiscoveryRecord => {
            &[PermissionKey::LeadRead, PermissionKey::ProjectRead]
        }
        EntityAuditTargetType::SalesFollowUpRecord => &[
            PermissionKey::CustomerRead,
            PermissionKey::LeadRead,
            PermissionKey::ProjectRead,
        ],
        EntityAuditTargetType::Project | EntityAuditTargetType::Contract => {
            &[PermissionKey::ProjectRead]
        }
    }
}

/// Query validation is performed first by HTTP; this preserves the subsequent
/// source service order without reading target entities or UUID-normalizing IDs.
pub fn require_entity_target(
    target_type: &str,
    target_id: &str,
    user: &AuthUser,
) -> Result<(EntityAuditTargetType, String), RuntimeAuditError> {
    let target = target_type.parse::<EntityAuditTargetType>().map_err(|_| {
        RuntimeAuditError::BadRequest(format!(
            "Unsupported entity audit targetType: {target_type}"
        ))
    })?;
    let id = trim_js(target_id);
    if id.is_empty() {
        return Err(RuntimeAuditError::BadRequest("targetId is required".into()));
    }
    if !read_permissions(target).iter().any(|key| {
        user.permissions
            .iter()
            .any(|value| value.as_str() == key.as_str())
    }) {
        return Err(RuntimeAuditError::Forbidden(format!(
            "Missing permission to read {target_type} audit logs"
        )));
    }
    Ok((target, id.to_owned()))
}

pub struct RuntimeAuditService {
    database: Database,
}
impl RuntimeAuditService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list_audit_logs(
        &self,
        query: ValidatedQuery,
    ) -> Result<Vec<AuditLogSummary>, RuntimeAuditError> {
        let filter = audit_filter(&query)?;
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::audit_logs(connection, &filter).await })
            })
            .await?)
    }

    pub async fn list_entity_audit_logs(
        &self,
        target_type: &str,
        target_id: &str,
        query: ValidatedQuery,
        user: &AuthUser,
    ) -> Result<Vec<AuditLogSummary>, RuntimeAuditError> {
        let (target, id) = require_entity_target(target_type, target_id, user)?;
        let mut filter = audit_filter(&query)?;
        filter.target_type = Some(target.as_str().to_owned());
        filter.target_id = Some(id);
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::audit_logs(connection, &filter).await })
            })
            .await?)
    }

    pub async fn list_security_events(
        &self,
        query: ValidatedQuery,
    ) -> Result<Vec<SecurityEventSummary>, RuntimeAuditError> {
        let filter = SecurityFilter {
            from: timestamp(&query, "from")?,
            to: timestamp(&query, "to")?,
            event_type: query.text("eventType"),
            actor_id: query.text("actorId"),
            principal: query.text("principal"),
            path: query.text("path"),
            permission_key: query.text("permissionKey"),
            result: query.text("result"),
            limit: query.limit(),
        };
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::security_events(connection, &filter).await })
            })
            .await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        compat::permissions::RawPermission,
        runtime_audit::{model::QueryKind, validation},
    };
    use serde_json::{Value, json};
    use uuid::Uuid;

    fn user(permissions: &[&str]) -> AuthUser {
        AuthUser {
            user_id: Uuid::nil(),
            username: "fixture".into(),
            permissions: permissions
                .iter()
                .map(|key| RawPermission::new(*key))
                .collect(),
        }
    }

    #[test]
    fn target_types_permissions_and_order_match_original_service_probes() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-authority.json"))
                .unwrap_or_else(|_| panic!("authority"));
        assert_eq!(
            json!(
                EntityAuditTargetType::ALL
                    .iter()
                    .map(|value| value.as_str())
                    .collect::<Vec<_>>()
            ),
            source["entityTargetTypes"]
        );
        for target in EntityAuditTargetType::ALL {
            let actual = PermissionKey::ALL
                .iter()
                .filter(|permission| {
                    require_entity_target(
                        target.as_str(),
                        "opaque-ID",
                        &user(&[permission.as_str()]),
                    )
                    .is_ok()
                })
                .map(|permission| permission.as_str())
                .collect::<Vec<_>>();
            assert_eq!(
                json!(actual),
                source["targetReadPermissions"][target.as_str()]
            );
        }
        assert!(
            matches!(require_entity_target("invalid", " ", &user(&[])), Err(RuntimeAuditError::BadRequest(message)) if message.starts_with("Unsupported"))
        );
        assert!(
            matches!(require_entity_target("lead", "\u{feff} \t", &user(&[])), Err(RuntimeAuditError::BadRequest(message)) if message == "targetId is required")
        );
        assert!(matches!(
            require_entity_target("lead", "id", &user(&["customer:read"])),
            Err(RuntimeAuditError::Forbidden(_))
        ));
    }

    #[test]
    fn target_id_keeps_case_uuid_alias_and_unbounded_path_text_after_js_trim() {
        for id in [
            "A0000000-0000-4000-8000-000000000001".to_owned(),
            "urn:uuid:a0000000-0000-4000-8000-000000000001".to_owned(),
            "x".repeat(129),
            "\u{85}id\u{85}".to_owned(),
        ] {
            let actual = require_entity_target(
                "lead",
                &format!("\u{feff}{id}\u{a0}"),
                &user(&["lead:read"]),
            )
            .unwrap_or_else(|_| panic!("target"));
            assert_eq!(actual.1, id);
        }
    }

    #[test]
    fn filters_keep_reverse_ranges_and_js_date_milliseconds() {
        let query = validation::validate_query(QueryKind::Audit, Some("{\"from\":\"2026-10-29T00:00:00.123456Z\",\"to\":\"2026-10-28T00:00:00Z\",\"targetId\":\" id \"}")).unwrap_or_else(|_| panic!("query"));
        let filter = audit_filter(&query).unwrap_or_else(|_| panic!("filter"));
        assert_eq!(filter.limit, 50);
        assert_eq!(filter.target_id.as_deref(), Some(" id "));
        assert!(filter.from > filter.to);
        assert_eq!(
            filter.from.map(|value| value.timestamp_subsec_micros()),
            Some(123000)
        );
    }
}
