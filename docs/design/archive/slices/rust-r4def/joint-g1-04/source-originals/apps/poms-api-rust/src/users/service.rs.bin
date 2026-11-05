//! Existing user commands preserve each original persistence boundary.
//! W01 and core31 original Nest observations determine generated-ID/child
//! failure, dirty flush ordering, split replacement and nullable hydration.

use std::{
    collections::{HashMap, HashSet},
    error::Error,
    fmt,
};

use chrono::{DateTime, Utc};
use serde_json::value::RawValue;
use sqlx::Connection;
use uuid::Uuid;

use super::{
    model::{
        AssignUserOrgMemberships, AssignUserRoles, CreateUser, OwnerReferenceData,
        OwnerReferenceOrgUnit, OwnerReferenceUser, RawUserEntity, SanitizedUserProfile,
        UpdateProfile, UpdateUser, UserActivation, UserDetail, UserOrgUnitSummary, UserSummary,
        js_string,
    },
    store::{self, NewUser, NewUserMembership, NewUserRole, UserAudit, UserRow, UserUpdate},
};
use crate::{
    auth::{
        js_json::JsString,
        model::{ResolvedSession, clock_now},
        store::flush_managed_session,
    },
    compat::{json::Field, scalars::js_iso_string},
    database::{Database, DbError},
    org_units::store as org_store,
    roles::store as role_store,
};

#[derive(Debug)]
pub enum UsersError {
    NotFound(String),
    Conflict(JsString),
    Database(DbError),
    Internal,
}

impl fmt::Display for UsersError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::NotFound(_) => "user reference was not found",
            Self::Conflict(_) => "user command was rejected",
            Self::Database(_) => "user persistence failed",
            Self::Internal => "user operation failed",
        })
    }
}
impl Error for UsersError {}
impl From<DbError> for UsersError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}

#[derive(Clone, Debug)]
pub struct UsersService {
    database: Database,
}

impl UsersService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self, session: &ResolvedSession) -> Result<Vec<UserSummary>, UsersError> {
        let mut cache = ReadCache::new(session);
        let context = self.aggregation(&mut cache).await?;
        context
            .users
            .iter()
            .map(|user| context.summary(user))
            .collect()
    }

    pub async fn owner_reference(
        &self,
        session: &ResolvedSession,
    ) -> Result<OwnerReferenceData, UsersError> {
        let mut cache = ReadCache::new(session);
        let context = self.aggregation(&mut cache).await?;
        Ok(OwnerReferenceData {
            users: context
                .users
                .iter()
                .map(|user| {
                    let primary = context.primary(user);
                    OwnerReferenceUser {
                        id: user.id.to_string(),
                        display_name: user.display_name.clone(),
                        is_active: user.is_active,
                        primary_org_unit_id: primary.map(|id| id.to_string()),
                        primary_org_unit_name: primary
                            .and_then(|id| context.org_units.get(&id))
                            .map(|org| js_string(&org.name)),
                    }
                })
                .collect(),
            org_units: context
                .organizations
                .iter()
                .map(|org| OwnerReferenceOrgUnit {
                    id: org.id.to_string(),
                    name: js_string(&org.name),
                    code: js_string(&org.code),
                    is_active: org.is_active,
                })
                .collect(),
        })
    }

    pub async fn get(&self, id: &str, session: &ResolvedSession) -> Result<UserDetail, UsersError> {
        let mut cache = ReadCache::new(session);
        let user = self.find_user(id, &mut cache).await?;
        let context = self.aggregation(&mut cache).await?;
        context.detail(cache.users.get(&user.id).unwrap_or(&user))
    }

    pub async fn profile(
        &self,
        session: &ResolvedSession,
    ) -> Result<SanitizedUserProfile, UsersError> {
        let mut cache = ReadCache::new(session);
        let permissions = session
            .user
            .permissions
            .iter()
            .map(|permission| permission.as_str().to_owned())
            .collect();
        self.profile_with(&session.user.user_id.to_string(), permissions, &mut cache)
            .await
    }

    pub async fn activate(
        &self,
        id: &str,
        _request: UserActivation,
        session: &ResolvedSession,
    ) -> Result<RawUserEntity, UsersError> {
        self.activation(id, true, session).await
    }

    pub async fn deactivate(
        &self,
        id: &str,
        _request: UserActivation,
        session: &ResolvedSession,
    ) -> Result<RawUserEntity, UsersError> {
        self.activation(id, false, session).await
    }

    async fn activation(
        &self,
        id: &str,
        active: bool,
        session: &ResolvedSession,
    ) -> Result<RawUserEntity, UsersError> {
        // Real W03: all DTO command fields are ignored. Already-active and
        // already-inactive commands still audit but emit no user UPDATE.
        let mut cache = ReadCache::new(session);
        let mut user = self.find_user(id, &mut cache).await?;
        let before = user.is_active;
        let changes = UserUpdate {
            is_active: (before != active).then_some(active),
            ..UserUpdate::default()
        };
        user.is_active = active;
        self.flush_user(&mut user, changes, Vec::new(), Vec::new(), session)
            .await?;
        self.audit(UserAudit {
            event_type: if active {
                "platform.user.activated"
            } else {
                "platform.user.deactivated"
            },
            target_id: user.id.to_string(),
            operator_id: Some(session.user.user_id),
            before_snapshot: Some(format!(r#"{{"isActive":{before}}}"#)),
            after_snapshot: Some(format!(r#"{{"isActive":{active}}}"#)),
            metadata: None,
            occurred_at: clock_now(),
        })
        .await?;
        // Disabling does not enumerate/revoke sessions. W03's current session
        // remains active until its next real authorization observes the flag.
        user.raw()
    }

    pub async fn update(
        &self,
        id: &str,
        request: UpdateUser,
        session: &ResolvedSession,
    ) -> Result<UserDetail, UsersError> {
        let mut cache = ReadCache::new(session);
        let mut user = self.find_user(id, &mut cache).await?;
        let patch = user.patch(request, true);
        self.flush_user(&mut user, patch.changes, Vec::new(), Vec::new(), session)
            .await?;
        self.audit(UserAudit {
            event_type: "platform.user.updated",
            target_id: user.id.to_string(),
            operator_id: Some(session.user.user_id),
            before_snapshot: Some(patch.before),
            after_snapshot: Some(patch.after),
            metadata: Some(patch.metadata),
            occurred_at: clock_now(),
        })
        .await?;
        let id = user.id;
        cache.users.insert(id, user);
        let context = self.aggregation(&mut cache).await?;
        context.detail(cache.users.get(&id).ok_or(UsersError::Internal)?)
    }

    pub async fn update_profile(
        &self,
        request: UpdateProfile,
        session: &ResolvedSession,
    ) -> Result<SanitizedUserProfile, UsersError> {
        let mut cache = ReadCache::new(session);
        let mut user = self
            .find_user(&session.user.user_id.to_string(), &mut cache)
            .await?;
        if !user.is_active {
            return Err(UsersError::Conflict(js_string(&format!(
                "Platform user {} is inactive",
                user.id
            ))));
        }
        let patch = user.patch(
            UpdateUser {
                display_name: request.display_name,
                email: request.email,
                phone: request.phone,
                avatar_url: Field::Missing,
            },
            false,
        );
        self.flush_user(&mut user, patch.changes, Vec::new(), Vec::new(), session)
            .await?;
        self.audit(UserAudit {
            event_type: "platform.user.self-updated",
            target_id: user.id.to_string(),
            operator_id: Some(user.id),
            before_snapshot: Some(patch.before),
            after_snapshot: Some(patch.after),
            metadata: Some(patch.metadata),
            occurred_at: clock_now(),
        })
        .await?;
        let id = user.id;
        cache.users.insert(id, user);
        let (permissions, _) = self
            .database
            .with_connection(move |connection| {
                Box::pin(crate::auth::store::permissions_with_role_snapshots(
                    connection, id,
                ))
            })
            .await?;
        self.profile_with(
            &id.to_string(),
            permissions
                .iter()
                .map(|permission| permission.as_str().to_owned())
                .collect(),
            &mut cache,
        )
        .await
    }

    pub async fn assign_roles(
        &self,
        id: &str,
        request: AssignUserRoles,
        session: &ResolvedSession,
    ) -> Result<SanitizedUserProfile, UsersError> {
        let mut cache = ReadCache::new(session);
        let mut user = self.find_user(id, &mut cache).await?;
        let unique = unique_ids(&request.role_ids);
        let role_ids = unique.clone();
        let roles = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::roles_by_ids(connection, &role_ids).await })
            })
            .await?;
        for role_id in unique {
            let role = roles
                .iter()
                .find(|role| role.id.to_string() == role_id)
                .ok_or_else(|| UsersError::NotFound(format!("Role {role_id} not found")))?;
            if !role.is_active {
                return Err(UsersError::Conflict(js_string(&format!(
                    "Role {role_id} is inactive"
                ))));
            }
        }
        let previous = self
            .database
            .with_connection(|connection| Box::pin(store::active_roles(connection)))
            .await?;
        let before = format!(
            r#"{{"roleIds":[{}]}}"#,
            previous
                .iter()
                .filter(|row| row.user_id.to_string() == id)
                .map(|row| format!("\"{}\"", row.role_id))
                .collect::<Vec<_>>()
                .join(",")
        );
        let target = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::delete_roles(connection, &target).await })
            })
            .await?;
        let rows = request
            .role_ids
            .iter()
            .map(|role_id| NewUserRole {
                user_id: id.to_owned(),
                role_id: role_id.clone(),
                assigned_at: clock_now(),
                created_at: clock_now(),
            })
            .collect();
        self.flush_user(&mut user, UserUpdate::default(), rows, Vec::new(), session)
            .await?;
        self.audit(UserAudit {
            event_type: "platform.user.roles.replaced",
            target_id: id.to_owned(),
            operator_id: Some(session.user.user_id),
            before_snapshot: Some(before),
            after_snapshot: Some(format!(
                r#"{{"roleIds":[{}]}}"#,
                string_array(&request.role_ids)
            )),
            metadata: None,
            occurred_at: clock_now(),
        })
        .await?;
        cache.users.insert(user.id, user);
        self.profile_with(id, Vec::new(), &mut cache).await
    }

    pub async fn assign_org_memberships(
        &self,
        id: &str,
        request: AssignUserOrgMemberships,
        session: &ResolvedSession,
    ) -> Result<SanitizedUserProfile, UsersError> {
        let mut cache = ReadCache::new(session);
        let mut user = self.find_user(id, &mut cache).await?;
        let all_ids = std::iter::once(request.primary_org_unit_id.clone())
            .chain(request.secondary_org_unit_ids.iter().cloned())
            .collect::<Vec<_>>();
        if unique_ids(&all_ids).len() != all_ids.len() {
            return Err(UsersError::Conflict(js_string(
                "Duplicate org unit assignments are not allowed",
            )));
        }
        self.assert_orgs(&all_ids, &mut cache).await?;
        let previous = self
            .database
            .with_connection(|connection| Box::pin(store::active_memberships(connection)))
            .await?;
        let before = format!(
            r#"{{"memberships":[{}]}}"#,
            previous
                .iter()
                .filter(|row| row.user_id.to_string() == id)
                .map(|row| format!(
                    r#"{{"orgUnitId":"{}","membershipType":{}}}"#,
                    row.org_unit_id,
                    js_string(&row.membership_type).json()
                ))
                .collect::<Vec<_>>()
                .join(",")
        );
        let target = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::delete_memberships(connection, &target).await })
            })
            .await?;
        let primary =
            Uuid::parse_str(&request.primary_org_unit_id).map_err(|_| UsersError::Internal)?;
        let changes = UserUpdate {
            primary_org_unit_id: (user.primary_org_unit_id != Some(primary))
                .then_some(Some(primary)),
            ..UserUpdate::default()
        };
        user.primary_org_unit_id = Some(primary);
        let rows = all_ids
            .iter()
            .enumerate()
            .map(|(index, org_id)| NewUserMembership {
                user_id: id.to_owned(),
                org_unit_id: org_id.clone(),
                membership_type: if index == 0 { "primary" } else { "secondary" },
                assigned_at: clock_now(),
                created_at: clock_now(),
            })
            .collect();
        self.flush_user(&mut user, changes, Vec::new(), rows, session)
            .await?;
        self.audit(UserAudit {
            event_type: "platform.user.org-memberships.replaced",
            target_id: id.to_owned(),
            operator_id: Some(session.user.user_id),
            before_snapshot: Some(before),
            after_snapshot: Some(format!(
                r#"{{"primaryOrgUnitId":{},"secondaryOrgUnitIds":[{}]}}"#,
                js_string(&request.primary_org_unit_id).json(),
                string_array(&request.secondary_org_unit_ids)
            )),
            metadata: None,
            occurred_at: clock_now(),
        })
        .await?;
        cache.users.insert(user.id, user);
        self.profile_with(id, Vec::new(), &mut cache).await
    }

    pub async fn create(
        &self,
        request: CreateUser,
        session: &ResolvedSession,
    ) -> Result<RawUserEntity, UsersError> {
        let username = request.username.to_utf8_lossy();
        let existing = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_by_username(connection, &username).await })
            })
            .await?;
        if existing.is_some() {
            return Err(UsersError::Conflict(js_message(
                "Platform user ",
                &request.username,
                " already exists",
            )));
        }
        if let Some(id) = request.primary_org_unit_id.as_deref() {
            let organizations = self
                .database
                .with_connection(|connection| Box::pin(org_store::list(connection)))
                .await?;
            // This check is the original JS Map lookup, not PostgreSQL UUID
            // equality. Preserve raw request spelling before any UUID parsing.
            let organization = organizations
                .iter()
                .find(|organization| organization.id.to_string() == id)
                .ok_or_else(|| UsersError::NotFound(format!("OrgUnit {id} not found")))?;
            if !organization.is_active {
                return Err(UsersError::Conflict(js_string(&format!(
                    "OrgUnit {id} is inactive"
                ))));
            }
        }
        let has_unbound_children =
            request.primary_org_unit_id.is_some() || !request.initial_role_ids.is_empty();
        let mut user = ManagedUser::new(request)?;
        let input = user.new_row();
        let pending = session.pending_flush.clone();
        let (id, version) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result = async {
                        let generated = store::insert(&mut transaction, &input).await?;
                        // Real W01 (both non-due and due): PostgreSQL allocates
                        // the user UUID, then MikroORM rejects the child whose
                        // userId was captured as undefined before this INSERT.
                        // No child INSERT or pending session UPDATE is emitted.
                        if has_unbound_children {
                            return Err(sqlx::Error::Protocol(
                                "original user relation has no pre-flush user id".into(),
                            ));
                        }
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(generated)
                    }
                    .await;
                    match result {
                        Ok(generated) => {
                            transaction.commit().await?;
                            Ok(generated)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        user.id = id;
        user.row_version = version;
        self.audit(UserAudit {
            event_type: "platform.user.created",
            target_id: id.to_string(),
            operator_id: Some(session.user.user_id),
            before_snapshot: None,
            after_snapshot: Some(user.created_snapshot()),
            metadata: None,
            occurred_at: clock_now(),
        })
        .await?;
        user.raw()
    }

    async fn find_user(&self, id: &str, cache: &mut ReadCache) -> Result<ManagedUser, UsersError> {
        if let Some(user) = cache.users.values().find(|user| user.id.to_string() == id) {
            return Ok(user.clone());
        }
        let target = id.to_owned();
        let fresh = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &target).await })
            })
            .await?
            .ok_or_else(|| UsersError::NotFound(format!("Platform user {id} not found")))?;
        Ok(cache.hydrate(fresh))
    }

    async fn assert_orgs(&self, ids: &[String], cache: &mut ReadCache) -> Result<(), UsersError> {
        let rows = self
            .database
            .with_connection(|connection| Box::pin(org_store::list(connection)))
            .await?;
        let rows = rows
            .into_iter()
            .map(|row| cache.hydrate_org(row))
            .collect::<Vec<_>>();
        for id in ids {
            let org = rows
                .iter()
                .find(|org| org.id.to_string() == *id)
                .ok_or_else(|| UsersError::NotFound(format!("OrgUnit {id} not found")))?;
            if !org.is_active {
                return Err(UsersError::Conflict(js_string(&format!(
                    "OrgUnit {id} is inactive"
                ))));
            }
        }
        Ok(())
    }

    async fn aggregation(&self, cache: &mut ReadCache) -> Result<Aggregation, UsersError> {
        // The source's Promise.all performs independent reads. Do not hold a
        // snapshot transaction or add relationship ordering to these queries.
        let (users, roles, organizations, assignments, memberships) = tokio::try_join!(
            self.database
                .with_connection(|connection| Box::pin(store::list(connection))),
            self.database
                .with_connection(|connection| Box::pin(role_store::list(connection))),
            self.database
                .with_connection(|connection| Box::pin(org_store::list(connection))),
            self.database
                .with_connection(|connection| Box::pin(store::active_roles(connection))),
            self.database
                .with_connection(|connection| Box::pin(store::active_memberships(connection))),
        )?;
        let users = users.into_iter().map(|row| cache.hydrate(row)).collect();
        let organizations = organizations
            .into_iter()
            .map(|row| cache.hydrate_org(row))
            .collect::<Vec<_>>();
        let role_map: HashMap<_, _> = roles.iter().map(|row| (row.id, row)).collect();
        let mut role_names: HashMap<Uuid, Vec<JsString>> = HashMap::new();
        for row in assignments {
            if let Some(role) = role_map.get(&row.role_id).filter(|role| role.is_active) {
                role_names
                    .entry(row.user_id)
                    .or_default()
                    .push(js_string(&role.name));
            }
        }
        let mut primary = HashMap::new();
        for row in &memberships {
            if row.membership_type == "primary" {
                primary.insert(row.user_id, row.org_unit_id);
            }
        }
        Ok(Aggregation {
            users,
            org_units: organizations
                .iter()
                .map(|row| (row.id, row.clone()))
                .collect(),
            organizations,
            role_names,
            primary,
            memberships,
        })
    }

    async fn profile_with(
        &self,
        id: &str,
        permissions: Vec<String>,
        cache: &mut ReadCache,
    ) -> Result<SanitizedUserProfile, UsersError> {
        let context = self.aggregation(cache).await?;
        // getSanitizedUserProfile loads aggregation before findUserById. The
        // same request identity map can satisfy that lookup without another SQL.
        let user = self.find_user(id, cache).await?;
        context.profile(&user, permissions)
    }

    async fn flush_user(
        &self,
        user: &mut ManagedUser,
        changes: UserUpdate,
        roles: Vec<NewUserRole>,
        memberships: Vec<NewUserMembership>,
        session: &ResolvedSession,
    ) -> Result<(), UsersError> {
        let dirty = changes.is_dirty();
        let pending = session.pending_flush.clone();
        if !dirty && roles.is_empty() && memberships.is_empty() && pending.is_none() {
            return Ok(());
        }
        let id = user.id;
        let expected_version = user.row_version;
        let result = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result = async {
                        store::insert_roles(&mut transaction, &roles).await?;
                        store::insert_memberships(&mut transaction, &memberships).await?;
                        let updated = if dirty {
                            let at = clock_now();
                            Some((
                                store::update(&mut transaction, id, expected_version, &changes, at)
                                    .await?,
                                at,
                            ))
                        } else {
                            None
                        };
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(updated)
                    }
                    .await;
                    match result {
                        Ok(updated) => {
                            transaction.commit().await?;
                            Ok(updated)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        if let Some((version, at)) = result {
            user.row_version = version;
            user.updated_at = at;
        }
        Ok(())
    }

    async fn audit(&self, input: UserAudit) -> Result<(), UsersError> {
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    if let Err(error) = store::insert_audit(&mut transaction, &input).await {
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

fn unique_ids(ids: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    ids.iter()
        .filter(|id| seen.insert(id.as_str()))
        .cloned()
        .collect()
}

fn string_array(values: &[String]) -> String {
    values
        .iter()
        .map(|value| js_string(value).json())
        .collect::<Vec<_>>()
        .join(",")
}

struct ReadCache {
    users: HashMap<Uuid, ManagedUser>,
    org_units: HashMap<Uuid, org_store::OrgUnitRow>,
}

impl ReadCache {
    fn new(session: &ResolvedSession) -> Self {
        let user: ManagedUser = session.user_snapshot.clone().into();
        Self {
            users: HashMap::from([(user.id, user)]),
            org_units: HashMap::new(),
        }
    }

    fn hydrate(&mut self, row: UserRow) -> ManagedUser {
        let mut fresh: ManagedUser = row.into();
        if let Some(cached) = self.users.get(&fresh.id) {
            // W07 is an actual self/other control: nonnull refreshes, while
            // null scalar hydration leaves the managed nullable value intact.
            if fresh.email.is_none() {
                fresh.email.clone_from(&cached.email);
            }
            if fresh.phone.is_none() {
                fresh.phone.clone_from(&cached.phone);
            }
            if fresh.avatar_url.is_none() {
                fresh.avatar_url.clone_from(&cached.avatar_url);
            }
            if fresh.primary_org_unit_id.is_none() {
                fresh.primary_org_unit_id = cached.primary_org_unit_id;
            }
            if fresh.last_login_at.is_none() {
                fresh.last_login_at = cached.last_login_at;
            }
            if fresh.created_by.is_none() {
                fresh.created_by = cached.created_by;
            }
            if fresh.updated_by.is_none() {
                fresh.updated_by = cached.updated_by;
            }
        }
        self.users.insert(fresh.id, fresh.clone());
        fresh
    }

    fn hydrate_org(&mut self, fresh: org_store::OrgUnitRow) -> org_store::OrgUnitRow {
        let row = org_store::merge_find_one(fresh.clone(), self.org_units.get(&fresh.id));
        self.org_units.insert(row.id, row.clone());
        row
    }
}

struct Aggregation {
    users: Vec<ManagedUser>,
    organizations: Vec<org_store::OrgUnitRow>,
    org_units: HashMap<Uuid, org_store::OrgUnitRow>,
    role_names: HashMap<Uuid, Vec<JsString>>,
    primary: HashMap<Uuid, Uuid>,
    memberships: Vec<store::UserOrgMembershipRow>,
}

impl Aggregation {
    fn primary(&self, user: &ManagedUser) -> Option<Uuid> {
        self.primary
            .get(&user.id)
            .copied()
            .or(user.primary_org_unit_id)
    }

    fn summary(&self, user: &ManagedUser) -> Result<UserSummary, UsersError> {
        let primary = self.primary(user);
        Ok(UserSummary {
            id: user.id.to_string(),
            username: user.username.clone(),
            display_name: user.display_name.clone(),
            email: user.email.clone(),
            phone: user.phone.clone(),
            is_active: user.is_active,
            primary_org_unit_id: primary.map(|id| id.to_string()),
            primary_org_unit_name: primary
                .and_then(|id| self.org_units.get(&id))
                .map(|org| js_string(&org.name)),
            role_names: self.role_names.get(&user.id).cloned().unwrap_or_default(),
            created_at: iso(user.created_at)?,
            updated_at: iso(user.updated_at)?,
        })
    }

    fn orgs(&self, user_id: Uuid) -> Vec<UserOrgUnitSummary> {
        self.memberships
            .iter()
            .filter(|row| row.user_id == user_id)
            .filter_map(|membership| {
                self.org_units
                    .get(&membership.org_unit_id)
                    .map(|org| UserOrgUnitSummary {
                        id: org.id.to_string(),
                        name: js_string(&org.name),
                        code: Some(js_string(&org.code)),
                        description: org.description.as_deref().map(js_string),
                        membership_type: membership.membership_type.clone(),
                    })
            })
            .collect()
    }

    fn detail(&self, user: &ManagedUser) -> Result<UserDetail, UsersError> {
        Ok(UserDetail {
            summary: self.summary(user)?,
            avatar_url: user.avatar_url.clone(),
            last_login_at: user.last_login_at.map(iso).transpose()?,
            email_verified: user.email_verified,
            phone_verified: user.phone_verified,
            org_units: self.orgs(user.id),
        })
    }

    fn profile(
        &self,
        user: &ManagedUser,
        permissions: Vec<String>,
    ) -> Result<SanitizedUserProfile, UsersError> {
        Ok(SanitizedUserProfile {
            id: user.id.to_string(),
            username: user.username.clone(),
            display_name: user.display_name.clone(),
            roles: self.role_names.get(&user.id).cloned().unwrap_or_default(),
            permissions,
            email: user.email.clone(),
            avatar_url: user.avatar_url.clone(),
            is_active: user.is_active,
            last_login_at: user.last_login_at.map(iso).transpose()?,
            email_verified: user.email_verified,
            phone_verified: user.phone_verified,
            phone: user.phone.clone(),
            org_units: self.orgs(user.id),
        })
    }
}

struct ProfilePatch {
    changes: UserUpdate,
    before: String,
    after: String,
    metadata: String,
}

fn nullable_text(field: Field<JsString>) -> Option<JsString> {
    match field {
        Field::Missing | Field::Null => None,
        Field::Value(value) => Some(value),
    }
}

fn js_message(prefix: &str, value: &JsString, suffix: &str) -> JsString {
    JsString::from_code_units(
        prefix
            .encode_utf16()
            .chain(value.as_code_units().iter().copied())
            .chain(suffix.encode_utf16())
            .collect(),
    )
}

fn text_json(value: &Option<JsString>) -> String {
    value.as_ref().map_or_else(|| "null".into(), JsString::json)
}

fn uuid_json(value: Option<Uuid>) -> String {
    value.map_or_else(|| "null".into(), |value| format!("\"{value}\""))
}

fn iso(value: DateTime<Utc>) -> Result<String, UsersError> {
    js_iso_string(value).map_err(|_| UsersError::Internal)
}

#[derive(Clone)]
struct ManagedUser {
    id: Uuid,
    username: JsString,
    display_name: JsString,
    email: Option<JsString>,
    email_verified: bool,
    phone: Option<JsString>,
    phone_verified: bool,
    avatar_url: Option<JsString>,
    is_active: bool,
    primary_org_unit_id: Option<Uuid>,
    last_login_at: Option<DateTime<Utc>>,
    row_version: i32,
    created_at: DateTime<Utc>,
    created_by: Option<Uuid>,
    updated_at: DateTime<Utc>,
    updated_by: Option<Uuid>,
    initial_role_ids: Vec<String>,
}

impl From<UserRow> for ManagedUser {
    fn from(row: UserRow) -> Self {
        Self {
            id: row.id,
            username: js_string(&row.username),
            display_name: js_string(&row.display_name),
            email: row.email.as_deref().map(js_string),
            email_verified: row.email_verified,
            phone: row.phone.as_deref().map(js_string),
            phone_verified: row.phone_verified,
            avatar_url: row.avatar_url.as_deref().map(js_string),
            is_active: row.is_active,
            primary_org_unit_id: row.primary_org_unit_id,
            last_login_at: row.last_login_at,
            row_version: row.row_version,
            created_at: row.created_at,
            created_by: row.created_by,
            updated_at: row.updated_at,
            updated_by: row.updated_by,
            initial_role_ids: Vec::new(),
        }
    }
}

impl ManagedUser {
    fn profile_snapshot(&self, include_avatar: bool) -> String {
        let avatar = if include_avatar {
            format!(r#", "avatarUrl":{}"#, text_json(&self.avatar_url))
        } else {
            String::new()
        };
        format!(
            r#"{{"displayName":{},"email":{},"phone":{},"emailVerified":{},"phoneVerified":{}{}}}"#,
            self.display_name.json(),
            text_json(&self.email),
            text_json(&self.phone),
            self.email_verified,
            self.phone_verified,
            avatar
        )
    }

    fn patch(&mut self, request: UpdateUser, include_avatar: bool) -> ProfilePatch {
        let before = self.profile_snapshot(include_avatar);
        let mut fields = Vec::new();
        let mut changes = UserUpdate::default();
        if let Some(name) = request
            .display_name
            .filter(|name| *name != self.display_name)
        {
            changes.display_name = Some(name.to_utf8_lossy());
            self.display_name = name;
            fields.push("displayName");
        }
        if !request.email.is_missing() {
            let next = nullable_text(request.email);
            if next != self.email {
                changes.email = Some(next.as_ref().map(JsString::to_utf8_lossy));
                self.email = next;
                fields.push("email");
                if self.email_verified {
                    self.email_verified = false;
                    changes.email_verified = Some(false);
                    fields.push("emailVerified");
                }
            }
        }
        if !request.phone.is_missing() {
            let next = nullable_text(request.phone);
            if next != self.phone {
                changes.phone = Some(next.as_ref().map(JsString::to_utf8_lossy));
                self.phone = next;
                fields.push("phone");
                if self.phone_verified {
                    self.phone_verified = false;
                    changes.phone_verified = Some(false);
                    fields.push("phoneVerified");
                }
            }
        }
        if include_avatar && !request.avatar_url.is_missing() {
            let next = nullable_text(request.avatar_url);
            if next != self.avatar_url {
                changes.avatar_url = Some(next.as_ref().map(JsString::to_utf8_lossy));
                self.avatar_url = next;
                fields.push("avatarUrl");
            }
        }
        ProfilePatch {
            changes,
            before,
            after: self.profile_snapshot(include_avatar),
            metadata: format!(
                r#"{{"changedFields":[{}]}}"#,
                fields
                    .iter()
                    .map(|field| format!("\"{field}\""))
                    .collect::<Vec<_>>()
                    .join(",")
            ),
        }
    }

    fn new(request: CreateUser) -> Result<Self, UsersError> {
        let primary_org_unit_id = request
            .primary_org_unit_id
            .as_deref()
            .map(Uuid::parse_str)
            .transpose()
            .map_err(|_| UsersError::Internal)?;
        Ok(Self {
            id: Uuid::nil(),
            username: request.username,
            display_name: request.display_name,
            email: nullable_text(request.email),
            email_verified: false,
            phone: nullable_text(request.phone),
            phone_verified: false,
            avatar_url: None,
            is_active: true,
            primary_org_unit_id,
            last_login_at: None,
            row_version: 1,
            created_at: clock_now(),
            created_by: None,
            updated_at: clock_now(),
            updated_by: None,
            initial_role_ids: request.initial_role_ids,
        })
    }

    fn new_row(&self) -> NewUser {
        NewUser {
            username: self.username.to_utf8_lossy(),
            display_name: self.display_name.to_utf8_lossy(),
            email: self.email.as_ref().map(JsString::to_utf8_lossy),
            phone: self.phone.as_ref().map(JsString::to_utf8_lossy),
            primary_org_unit_id: self.primary_org_unit_id,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }

    fn created_snapshot(&self) -> String {
        let roles = self
            .initial_role_ids
            .iter()
            .map(|role| js_string(role).json())
            .collect::<Vec<_>>()
            .join(",");
        format!(
            r#"{{"username":{},"displayName":{},"primaryOrgUnitId":{},"initialRoleIds":[{}]}}"#,
            self.username.json(),
            self.display_name.json(),
            uuid_json(self.primary_org_unit_id),
            roles,
        )
    }

    fn raw(&self) -> Result<RawUserEntity, UsersError> {
        let last_login_at = self
            .last_login_at
            .map(iso)
            .transpose()?
            .map_or_else(|| "null".into(), |date| format!("\"{date}\""));
        let raw = format!(
            r#"{{"id":"{}","username":{},"displayName":{},"email":{},"emailVerified":{},"phone":{},"phoneVerified":{},"avatarUrl":{},"isActive":{},"primaryOrgUnitId":{},"lastLoginAt":{},"rowVersion":{},"createdAt":"{}","createdBy":{},"updatedAt":"{}","updatedBy":{}}}"#,
            self.id,
            self.username.json(),
            self.display_name.json(),
            text_json(&self.email),
            self.email_verified,
            text_json(&self.phone),
            self.phone_verified,
            text_json(&self.avatar_url),
            self.is_active,
            uuid_json(self.primary_org_unit_id),
            last_login_at,
            self.row_version,
            iso(self.created_at)?,
            uuid_json(self.created_by),
            iso(self.updated_at)?,
            uuid_json(self.updated_by),
        );
        RawValue::from_string(raw)
            .map(RawUserEntity)
            .map_err(|_| UsersError::Internal)
    }
}
