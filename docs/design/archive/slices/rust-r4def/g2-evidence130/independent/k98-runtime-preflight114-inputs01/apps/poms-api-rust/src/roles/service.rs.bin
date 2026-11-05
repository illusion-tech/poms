//! Role commands preserve the original independent business and audit flushes.
//! Request strings stay UTF-16 until SQL binding and wire/audit serialization.

use std::{collections::HashSet, error::Error, fmt};

use chrono::{DateTime, Utc};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    collation,
    model::{
        AssignRolePermissions, CreateRole, RoleActivation, RoleDetail, RoleSummary, UpdateRole,
        js_string,
    },
    store::{self, PermissionAssignmentRow, RoleAudit, RoleRow, RoleUpdate},
};
use crate::{
    auth::{
        js_json::JsString,
        model::{ResolvedSession, RoleReadSnapshot, SessionFlush, clock_now},
        store::flush_managed_session,
    },
    compat::{json::Field, scalars::js_iso_string},
    database::{Database, DbError},
    shared::generated::PermissionKey,
};

#[derive(Debug)]
pub enum RolesError {
    /// The complete original Nest NotFoundException message.
    NotFound(String),
    /// Preserve the raw key in the explicit 409, including UTF-16 code units.
    DuplicateKey(JsString),
    Baseline {
        role_key: String,
        missing: Vec<PermissionKey>,
    },
    Database(DbError),
    Internal,
}

impl fmt::Display for RolesError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::NotFound(_) => "role was not found",
            Self::DuplicateKey(_) => "role key already exists",
            Self::Baseline { .. } => "system role minimum permissions were rejected",
            Self::Database(_) => "role persistence failed",
            Self::Internal => "role operation failed",
        })
    }
}
impl Error for RolesError {}
impl From<DbError> for RolesError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}

#[derive(Clone, Debug)]
pub struct RolesService {
    database: Database,
    role_snapshots: Vec<RoleReadSnapshot>,
}

impl RolesService {
    pub fn new(database: Database) -> Self {
        Self {
            database,
            role_snapshots: Vec::new(),
        }
    }

    /// Derive request-local identity-map state; never mutate the shared service.
    pub fn for_session(&self, session: &ResolvedSession) -> Self {
        Self {
            database: self.database.clone(),
            role_snapshots: session.role_snapshots.clone(),
        }
    }

    pub async fn list(&self) -> Result<Vec<RoleSummary>, RolesError> {
        self.database
            .with_connection(|connection| Box::pin(store::list(connection)))
            .await?
            .into_iter()
            .map(|row| ManagedRole::from(merge_list_role(row, &self.role_snapshots)).summary())
            .collect()
    }

    pub async fn get(&self, id: &str) -> Result<RoleDetail, RolesError> {
        let owned_id = id.to_owned();
        let role = self.role(id).await?;
        let (assignments, assigned_user_count) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let assignments = store::assignments(connection, &owned_id).await?;
                    let count = store::assigned_user_count(connection, &owned_id).await?;
                    Ok((assignments, count))
                })
            })
            .await?;
        let mut permission_keys = assignments
            .into_iter()
            .filter(|assignment| assignment.status == "active")
            .map(|assignment| assignment.permission_key)
            .collect::<Vec<_>>();
        collation::sort_permission_keys(&mut permission_keys).map_err(|_| RolesError::Internal)?;
        Ok(RoleDetail {
            summary: ManagedRole::from(role).summary()?,
            permission_keys,
            assigned_user_count,
        })
    }

    pub async fn create(
        &self,
        request: CreateRole,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        let bound_key = request.role_key.to_utf8_lossy();
        let existing = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_by_key(connection, &bound_key).await })
            })
            .await?;
        if existing.is_some() {
            return Err(RolesError::DuplicateKey(request.role_key));
        }
        let mut role = ManagedRole::new(request);
        let input = store::NewRole {
            role_key: role.role_key.to_utf8_lossy(),
            name: role.name.to_utf8_lossy(),
            description: role.description.as_ref().map(JsString::to_utf8_lossy),
            display_order: role.display_order,
            created_at: role.created_at,
            updated_at: role.updated_at,
        };
        let pending = pending.cloned();
        role.id = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Uuid, sqlx::Error> = async {
                        let id = store::insert(&mut transaction, &input).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(id)
                    }
                    .await;
                    match result {
                        Ok(id) => {
                            transaction.commit().await?;
                            Ok(id)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        let audit = role.audit(
            "platform.role.created",
            operator_id,
            None,
            Some(role.created_snapshot()),
        );
        // The successful first flush already consumed its managed session.
        self.audit(audit, None).await?;
        role.summary()
    }

    pub async fn update(
        &self,
        id: &str,
        request: UpdateRole,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        let mut role = ManagedRole::from(self.role(id).await?);
        let before = role.updated_snapshot();
        let changes = role.apply_update(request);
        self.flush_role(&mut role, changes, pending).await?;
        let audit = role.audit(
            "platform.role.updated",
            operator_id,
            Some(before),
            Some(role.updated_snapshot()),
        );
        self.audit(audit, None).await?;
        role.summary()
    }

    pub async fn activate(
        &self,
        id: &str,
        _request: RoleActivation,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        self.set_active(id, true, operator_id, pending).await
    }

    pub async fn deactivate(
        &self,
        id: &str,
        _request: RoleActivation,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        self.set_active(id, false, operator_id, pending).await
    }

    async fn set_active(
        &self,
        id: &str,
        active: bool,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        let mut role = ManagedRole::from(self.role(id).await?);
        let before = role.activation_snapshot();
        let changes = RoleUpdate {
            is_active: (role.is_active != active).then_some(active),
            ..RoleUpdate::default()
        };
        role.is_active = active;
        self.flush_role(&mut role, changes, pending).await?;
        let audit = role.audit(
            if active {
                "platform.role.activated"
            } else {
                "platform.role.deactivated"
            },
            operator_id,
            Some(before),
            Some(role.activation_snapshot()),
        );
        self.audit(audit, None).await?;
        role.summary()
    }

    pub async fn assign_permissions(
        &self,
        id: &str,
        request: AssignRolePermissions,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        let role = ManagedRole::from(self.role(id).await?);
        let owned_id = id.to_owned();
        let assignments = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::assignments(connection, &owned_id).await })
            })
            .await?;
        let plan = PermissionPlan::new(assignments, request.permission_keys);
        let missing = role.baseline_violations(&plan.next);
        if !missing.is_empty() {
            let mut audit = role.permission_audit(
                "platform.role.permissions.baseline.rejected",
                id,
                operator_id,
                None,
                None,
            );
            audit.result = "rejected";
            audit.reason = Some("system-role-baseline-violation");
            audit.metadata = Some(
                serde_json::to_string(&serde_json::json!({
                    "missingPermissionKeys": missing.iter().map(|key| key.as_str()).collect::<Vec<_>>()
                }))
                .map_err(|_| RolesError::Internal)?,
            );
            // A rejected audit can fail first; do not return a successful 409
            // while silently losing the original awaited audit.
            self.audit(audit, pending).await?;
            return Err(RolesError::Baseline {
                role_key: role.role_key.to_utf8_lossy(),
                missing,
            });
        }
        let changed = !plan.added.is_empty() || !plan.revoked.is_empty();
        let mut audit = role.permission_audit(
            "platform.role.permissions.replaced",
            id,
            operator_id,
            Some(permission_snapshot(&plan.previous)?),
            Some(permission_snapshot(&plan.next)?),
        );
        if changed {
            self.flush_permissions(role.id, plan, operator_id, pending)
                .await?;
            // Match audit construction after the original business save.
            audit.occurred_at = clock_now();
        }
        self.audit(audit, if changed { None } else { pending })
            .await?;
        role.summary()
    }

    async fn role(&self, id: &str) -> Result<RoleRow, RolesError> {
        if let Some(role) = cached_role(&self.role_snapshots, id) {
            return Ok(role);
        }
        let owned_id = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &owned_id).await })
            })
            .await?
            .ok_or_else(|| not_found(id))
    }

    async fn flush_role(
        &self,
        role: &mut ManagedRole,
        changes: RoleUpdate,
        pending: Option<&SessionFlush>,
    ) -> Result<(), RolesError> {
        let dirty = changes.is_dirty();
        if !dirty && pending.is_none() {
            return Ok(());
        }
        let id = role.id;
        let expected_version = role.row_version;
        let updated_at = clock_now();
        let pending = pending.cloned();
        let version = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Option<i32>, sqlx::Error> = async {
                        // The real R2B Nest witness updates the earlier managed
                        // AuthSession before an existing managed Role.
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        let version = if dirty {
                            Some(
                                store::update(
                                    &mut transaction,
                                    id,
                                    expected_version,
                                    &changes,
                                    updated_at,
                                )
                                .await?,
                            )
                        } else {
                            None
                        };
                        Ok(version)
                    }
                    .await;
                    match result {
                        Ok(version) => {
                            transaction.commit().await?;
                            Ok(version)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        if let Some(version) = version {
            role.row_version = version;
            role.updated_at = updated_at;
        }
        Ok(())
    }

    async fn flush_permissions(
        &self,
        role_id: Uuid,
        plan: PermissionPlan,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<(), RolesError> {
        let pending = pending.cloned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(), sqlx::Error> = async {
                        // MikroORM creates new entities before managed updates.
                        for addition in plan.added {
                            store::insert_permission(
                                &mut transaction,
                                role_id,
                                &addition.key,
                                operator_id,
                                addition.assigned_at,
                                addition.created_at,
                            )
                            .await?;
                        }
                        // R2B mixed-due Nest followup: creates, the earlier
                        // managed session, then permission-history updates.
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        for (id, revoked_at) in plan.revoked {
                            store::revoke_permission(&mut transaction, id, operator_id, revoked_at)
                                .await?;
                        }
                        Ok(())
                    }
                    .await;
                    if let Err(error) = result {
                        transaction.rollback().await?;
                        return Err(error);
                    }
                    transaction.commit().await?;
                    Ok(())
                })
            })
            .await?;
        Ok(())
    }

    async fn audit(
        &self,
        input: RoleAudit,
        pending: Option<&SessionFlush>,
    ) -> Result<(), RolesError> {
        let pending = pending.cloned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(), sqlx::Error> = async {
                        store::insert_audit(&mut transaction, &input).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(())
                    }
                    .await;
                    if let Err(error) = result {
                        transaction.rollback().await?;
                        return Err(error);
                    }
                    transaction.commit().await?;
                    Ok(())
                })
            })
            .await?;
        Ok(())
    }
}

fn cached_role(snapshots: &[RoleReadSnapshot], id: &str) -> Option<RoleRow> {
    snapshots
        .iter()
        .find(|snapshot| snapshot.id.to_string() == id)
        .cloned()
        .map(Into::into)
}

fn merge_list_role(mut row: RoleRow, snapshots: &[RoleReadSnapshot]) -> RoleRow {
    // MikroORM find() hydrates fresh scalar values into an auth-loaded Role,
    // but mergeData omits null scalar values. The real concurrent list witness
    // retains only the earlier non-null description; other fields stay fresh.
    if row.description.is_none() {
        row.description = snapshots
            .iter()
            .find(|snapshot| snapshot.id == row.id)
            .and_then(|snapshot| snapshot.description.clone());
    }
    row
}

fn not_found(id: &str) -> RolesError {
    RolesError::NotFound(format!("Role {id} not found"))
}

struct ManagedRole {
    id: Uuid,
    role_key: JsString,
    name: JsString,
    description: Option<JsString>,
    is_active: bool,
    is_system_role: bool,
    display_order: i64,
    row_version: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<RoleRow> for ManagedRole {
    fn from(row: RoleRow) -> Self {
        Self {
            id: row.id,
            role_key: js_string(&row.role_key),
            name: js_string(&row.name),
            description: row.description.as_deref().map(js_string),
            is_active: row.is_active,
            is_system_role: row.is_system_role,
            display_order: i64::from(row.display_order),
            row_version: row.row_version,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl ManagedRole {
    fn new(request: CreateRole) -> Self {
        Self {
            id: Uuid::nil(),
            role_key: request.role_key,
            name: request.name,
            description: match request.description {
                Field::Missing | Field::Null => None,
                Field::Value(value) => Some(value),
            },
            is_active: true,
            is_system_role: false,
            display_order: request.display_order.unwrap_or(0),
            row_version: 1,
            created_at: clock_now(),
            updated_at: clock_now(),
        }
    }

    fn summary(&self) -> Result<RoleSummary, RolesError> {
        Ok(RoleSummary {
            id: self.id.to_string(),
            role_key: self.role_key.clone(),
            name: self.name.clone(),
            description: self.description.clone(),
            is_active: self.is_active,
            is_system_role: self.is_system_role,
            display_order: i32::try_from(self.display_order).map_err(|_| RolesError::Internal)?,
            created_at: js_iso_string(self.created_at).map_err(|_| RolesError::Internal)?,
            updated_at: js_iso_string(self.updated_at).map_err(|_| RolesError::Internal)?,
        })
    }

    fn apply_update(&mut self, request: UpdateRole) -> RoleUpdate {
        let mut changes = RoleUpdate::default();
        if let Some(name) = request.name
            && name != self.name
        {
            changes.name = Some(name.to_utf8_lossy());
            self.name = name;
        }
        let description = match request.description {
            Field::Missing => None,
            Field::Null => Some(None),
            Field::Value(value) => Some(Some(value)),
        };
        if let Some(description) = description
            && description != self.description
        {
            changes.description = Some(description.as_ref().map(JsString::to_utf8_lossy));
            self.description = description;
        }
        if let Some(order) = request.display_order
            && order != self.display_order
        {
            changes.display_order = Some(order);
            self.display_order = order;
        }
        changes
    }

    fn baseline_violations(&self, next: &[String]) -> Vec<PermissionKey> {
        if !self.is_system_role {
            return Vec::new();
        }
        let next: HashSet<&str> = next.iter().map(String::as_str).collect();
        super::minimum_permissions(&self.role_key.to_utf8_lossy())
            .iter()
            .copied()
            .filter(|permission| !next.contains(permission.as_str()))
            .collect()
    }

    fn created_snapshot(&self) -> String {
        format!(
            r#"{{"roleKey":{},"name":{},"isActive":{},"isSystemRole":{},"displayOrder":{}}}"#,
            self.role_key.json(),
            self.name.json(),
            self.is_active,
            self.is_system_role,
            self.display_order,
        )
    }

    fn updated_snapshot(&self) -> String {
        format!(
            r#"{{"name":{},"description":{},"displayOrder":{}}}"#,
            self.name.json(),
            self.description
                .as_ref()
                .map_or_else(|| "null".into(), JsString::json),
            self.display_order,
        )
    }

    fn activation_snapshot(&self) -> String {
        format!(r#"{{"isActive":{}}}"#, self.is_active)
    }

    fn audit(
        &self,
        event_type: &'static str,
        operator_id: Option<Uuid>,
        before_snapshot: Option<String>,
        after_snapshot: Option<String>,
    ) -> RoleAudit {
        RoleAudit {
            event_type,
            target_id: self.id.to_string(),
            operator_id,
            result: "success",
            reason: None,
            before_snapshot,
            after_snapshot,
            metadata: None,
            occurred_at: clock_now(),
        }
    }

    fn permission_audit(
        &self,
        event_type: &'static str,
        path_id: &str,
        operator_id: Option<Uuid>,
        before_snapshot: Option<String>,
        after_snapshot: Option<String>,
    ) -> RoleAudit {
        // Only permission replacement/rejection uses the original input ID.
        // The other four role events use the canonical persisted Role ID.
        let mut audit = self.audit(event_type, operator_id, before_snapshot, after_snapshot);
        audit.target_id = path_id.to_owned();
        audit
    }
}

struct PermissionAddition {
    key: String,
    assigned_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
}

struct PermissionPlan {
    previous: Vec<String>,
    next: Vec<String>,
    added: Vec<PermissionAddition>,
    revoked: Vec<(Uuid, DateTime<Utc>)>,
}

impl PermissionPlan {
    fn new(assignments: Vec<PermissionAssignmentRow>, requested: Vec<PermissionKey>) -> Self {
        let active = assignments
            .into_iter()
            .filter(|assignment| assignment.status == "active")
            .collect::<Vec<_>>();
        let previous = active
            .iter()
            .map(|assignment| assignment.permission_key.clone())
            .collect::<Vec<_>>();
        let mut seen = HashSet::new();
        let next = requested
            .into_iter()
            .filter(|permission| seen.insert(*permission))
            .map(|permission| permission.as_str().to_owned())
            .collect::<Vec<_>>();
        let next_set: HashSet<_> = next.iter().map(String::as_str).collect();
        let previous_set: HashSet<_> = previous.iter().map(String::as_str).collect();
        let revoked = active
            .into_iter()
            .filter(|assignment| !next_set.contains(assignment.permission_key.as_str()))
            .map(|assignment| (assignment.id, clock_now()))
            .collect();
        let added = next
            .iter()
            .filter(|key| !previous_set.contains(key.as_str()))
            .map(|key| PermissionAddition {
                key: key.clone(),
                assigned_at: clock_now(),
                created_at: clock_now(),
            })
            .collect();
        Self {
            previous,
            next,
            added,
            revoked,
        }
    }
}

fn permission_snapshot(keys: &[String]) -> Result<String, RolesError> {
    serde_json::to_string(&serde_json::json!({ "permissionKeys": keys }))
        .map_err(|_| RolesError::Internal)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn role() -> ManagedRole {
        ManagedRole::new(CreateRole {
            role_key: js_string("test-role"),
            name: js_string("Name"),
            description: Field::Value(js_string("original")),
            display_order: Some(7),
        })
    }

    #[test]
    fn utf16_changes_are_compared_before_pg_text_replacement() {
        let mut role = role();
        role.name = js_string("\u{fffd}");
        let surrogate = JsString::from_code_units(vec![0xd800]);
        assert_eq!(surrogate.to_utf8_lossy(), role.name.to_utf8_lossy());
        let changes = role.apply_update(UpdateRole {
            name: Some(surrogate),
            description: Field::Missing,
            display_order: None,
        });
        assert!(changes.is_dirty());
        assert_eq!(changes.name.as_deref(), Some("\u{fffd}"));
        assert!(role.updated_snapshot().contains(r#""name":"\ud800""#));
    }

    #[test]
    fn omitted_null_unchanged_and_wide_integer_updates_remain_distinct() {
        let mut role = role();
        let unchanged = role.apply_update(UpdateRole {
            name: Some(js_string("Name")),
            description: Field::Missing,
            display_order: Some(7),
        });
        assert!(!unchanged.is_dirty());
        assert_eq!(role.description, Some(js_string("original")));
        let cleared = role.apply_update(UpdateRole {
            name: None,
            description: Field::Null,
            display_order: Some(2_147_483_648),
        });
        assert_eq!(cleared.description, Some(None));
        assert_eq!(cleared.display_order, Some(2_147_483_648));
        assert!(role.updated_snapshot().contains(r#""description":null"#));
    }

    #[test]
    fn create_description_keeps_surrogate_on_wire_and_out_of_create_audit() {
        let mut role = role();
        role.description = Some(JsString::from_code_units(vec![0xd800]));
        let summary = role.summary().unwrap_or_else(|_| panic!("valid summary"));
        let wire = serde_json::to_string(&summary)
            .unwrap_or_else(|_| panic!("raw UTF-16 summary serialization"));
        assert!(wire.contains(r#""description":"\ud800""#));
        assert!(!role.created_snapshot().contains("description"));
        assert!(
            role.updated_snapshot()
                .contains(r#""description":"\ud800""#)
        );
    }

    #[test]
    fn replacing_permissions_preserves_history_order_and_never_revives_rows() {
        let read = PermissionKey::ProjectRead;
        let write = PermissionKey::ProjectWrite;
        let deleted = Uuid::from_u128(1);
        let retained = Uuid::from_u128(2);
        let historical = Uuid::from_u128(3);
        let plan = PermissionPlan::new(
            vec![
                PermissionAssignmentRow {
                    id: deleted,
                    permission_key: "legacy:unknown".into(),
                    status: "active".into(),
                },
                PermissionAssignmentRow {
                    id: retained,
                    permission_key: read.as_str().into(),
                    status: "active".into(),
                },
                PermissionAssignmentRow {
                    id: historical,
                    permission_key: write.as_str().into(),
                    status: "revoked".into(),
                },
            ],
            vec![write, read, write],
        );
        assert_eq!(plan.previous, ["legacy:unknown", read.as_str()]);
        assert_eq!(plan.next, [write.as_str(), read.as_str()]);
        assert_eq!(plan.added.len(), 1);
        assert_eq!(plan.added[0].key, write.as_str());
        assert_eq!(plan.revoked.len(), 1);
        assert_eq!(plan.revoked[0].0, deleted);
        assert!(plan.revoked.iter().all(|(id, _)| *id != historical));
    }

    #[test]
    fn system_protection_depends_on_flag_and_exact_role_key() {
        let mut role = role();
        role.role_key = js_string("project-viewer");
        assert!(role.baseline_violations(&[]).is_empty());
        role.is_system_role = true;
        let minimum = super::super::minimum_permissions("project-viewer");
        assert_eq!(role.baseline_violations(&[]), minimum);
        let keys = minimum
            .iter()
            .map(|permission| permission.as_str().to_owned())
            .collect::<Vec<_>>();
        assert!(role.baseline_violations(&keys).is_empty());
        role.role_key = js_string("other-system-role");
        assert!(role.baseline_violations(&[]).is_empty());
    }

    #[test]
    fn role_identity_map_keeps_guard_version_and_exact_canonical_key_only() {
        let id = Uuid::from_u128(0xabcdef1234567890abcdef1234567890);
        let now = clock_now();
        let snapshots = vec![RoleReadSnapshot {
            id,
            role_key: "assigned-inactive".into(),
            name: "earlier guard value".into(),
            description: None,
            is_active: false,
            is_system_role: false,
            display_order: 0,
            row_version: 7,
            created_at: now,
            created_by: None,
            updated_at: now,
            updated_by: None,
        }];
        let earlier = cached_role(&snapshots, &id.to_string())
            .unwrap_or_else(|| panic!("assigned role remains in this request"));
        assert_eq!(earlier.row_version, 7);
        assert_eq!(earlier.name, "earlier guard value");
        assert!(!earlier.is_active);
        assert!(cached_role(&snapshots, &id.to_string().to_uppercase()).is_none());
        assert!(cached_role(&snapshots, "invalid-uuid").is_none());
    }

    #[test]
    fn list_hydration_retains_only_auth_loaded_non_null_description() {
        let now = clock_now();
        let snapshot = RoleReadSnapshot {
            id: Uuid::from_u128(7),
            role_key: "assigned-role".into(),
            name: "earlier guard value".into(),
            description: Some("earlier non-null description".into()),
            is_active: true,
            is_system_role: false,
            display_order: 0,
            row_version: 7,
            created_at: now,
            created_by: None,
            updated_at: now,
            updated_by: None,
        };
        let mut fresh = RoleRow::from(snapshot.clone());
        fresh.name = "later committed name".into();
        fresh.description = None;
        fresh.is_active = false;
        fresh.display_order = 17;
        fresh.row_version = 8;
        fresh.updated_at = now + chrono::Duration::seconds(1);
        let merged = merge_list_role(fresh.clone(), std::slice::from_ref(&snapshot));
        assert_eq!(merged.description, snapshot.description);
        assert_eq!(merged.name, fresh.name);
        assert_eq!(merged.is_active, fresh.is_active);
        assert_eq!(merged.display_order, fresh.display_order);
        assert_eq!(merged.row_version, fresh.row_version);
        assert_eq!(merged.updated_at, fresh.updated_at);

        fresh.description = Some("fresh non-null description".into());
        let merged = merge_list_role(fresh.clone(), std::slice::from_ref(&snapshot));
        assert_eq!(merged.description, fresh.description);

        fresh.description = None;
        assert!(merge_list_role(fresh.clone(), &[]).description.is_none());
        fresh.id = Uuid::from_u128(8);
        assert!(merge_list_role(fresh, &[snapshot]).description.is_none());
    }

    #[test]
    fn permission_audits_keep_input_uuid_aliases_while_other_events_keep_canonical_ids() {
        let mut role = role();
        role.id = Uuid::from_u128(0xabcdef1234567890abcdef1234567890);
        let canonical = role.id.to_string();
        for path in [
            canonical.clone(),
            canonical.to_uppercase(),
            role.id.simple().to_string(),
        ] {
            for event in [
                "platform.role.permissions.replaced",
                "platform.role.permissions.baseline.rejected",
            ] {
                let audit = role.permission_audit(event, &path, None, None, None);
                assert_eq!(audit.target_id, path);
            }
        }
        for event in [
            "platform.role.created",
            "platform.role.updated",
            "platform.role.activated",
            "platform.role.deactivated",
        ] {
            assert_eq!(role.audit(event, None, None, None).target_id, canonical);
        }
        assert_eq!(
            role.summary()
                .unwrap_or_else(|_| panic!("valid summary"))
                .id,
            canonical
        );
    }
}
