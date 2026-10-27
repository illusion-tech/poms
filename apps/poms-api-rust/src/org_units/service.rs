//! Organization reads and command preflight preserve the original request's
//! strings and read order. Business/audit flush SQL follows actual Nest witnesses.

use std::{
    collections::{HashMap, HashSet, VecDeque},
    error::Error,
    fmt,
};

use chrono::{DateTime, Utc};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    collation::{self, CompareKey},
    model::{
        CreateOrgUnit, MoveOrgUnit, OrgUnitActivation, OrgUnitDetail, OrgUnitSummary,
        OrgUnitTreeNode, UpdateOrgUnit, js_string,
    },
    store::{self, Deactivation, OrgUnitAudit, OrgUnitRow, OrgUnitUpdate},
};
use crate::{
    auth::{
        js_json::JsString,
        model::{SessionFlush, clock_now},
        store::flush_managed_session,
    },
    compat::{json::Field, scalars::js_iso_string},
    database::{Database, DbError},
};

#[derive(Debug)]
pub enum OrgUnitsError {
    NotFound(String),
    /// A complete original ConflictException message, retaining UTF-16 input.
    Conflict(JsString),
    Database(DbError),
    Internal,
}

impl fmt::Display for OrgUnitsError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::NotFound(_) => "organization was not found",
            Self::Conflict(_) => "organization command was rejected",
            Self::Database(_) => "organization persistence failed",
            Self::Internal => "organization operation failed",
        })
    }
}

impl Error for OrgUnitsError {}

impl From<DbError> for OrgUnitsError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}

#[derive(Clone, Debug)]
pub struct OrgUnitsService {
    database: Database,
}

impl OrgUnitsService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self) -> Result<Vec<OrgUnitSummary>, OrgUnitsError> {
        self.org_units()
            .await?
            .into_iter()
            .map(|row| ManagedOrgUnit::from(row).summary())
            .collect()
    }

    pub async fn tree(&self) -> Result<Vec<OrgUnitTreeNode>, OrgUnitsError> {
        let mut rows = self.org_units().await?;
        let memberships = self.membership_counts().await?;
        let comparator = collation::comparator().map_err(|_| OrgUnitsError::Internal)?;
        rows.sort_by(|left, right| {
            comparator.compare(
                CompareKey {
                    display_order: left.display_order,
                    created_at_millis: left.created_at.timestamp_millis(),
                    name: &left.name,
                    id: &left.id.to_string(),
                },
                CompareKey {
                    display_order: right.display_order,
                    created_at_millis: right.created_at.timestamp_millis(),
                    name: &right.name,
                    id: &right.id.to_string(),
                },
            )
        });
        let mut children_by_parent = HashMap::<Option<Uuid>, Vec<OrgUnitRow>>::new();
        for row in rows {
            children_by_parent
                .entry(row.parent_id)
                .or_default()
                .push(row);
        }
        children_by_parent.get(&None).map_or_else(
            || Ok(Vec::new()),
            |roots| {
                roots
                    .iter()
                    .map(|row| tree_node(row, &children_by_parent, &memberships))
                    .collect()
            },
        )
    }

    pub async fn get(&self, id: &str) -> Result<OrgUnitDetail, OrgUnitsError> {
        let rows = self.org_units().await?;
        let row = strict_target(&rows, id)?;
        // Missing target exits before the source membership query.
        let memberships = self.membership_counts().await?;
        let child_count = rows
            .iter()
            .filter(|child| child.parent_id == Some(row.id))
            .count();
        detail(row, child_count, &memberships)
    }

    pub async fn create(
        &self,
        request: CreateOrgUnit,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<OrgUnitSummary, OrgUnitsError> {
        if self.by_code(&request.code).await?.is_some() {
            return Err(conflict_text(
                "OrgUnit code ",
                &request.code,
                " already exists",
            ));
        }
        let rows = self.org_units().await?;
        let parent = resolve_requested_parent(
            &rows,
            match &request.parent_id {
                Field::Value(value) => Some(value.as_str()),
                Field::Missing | Field::Null => None,
            },
        )?;
        let parent_id = parent.map(|row| row.id);
        assert_sibling_name_available(&rows, parent_id, &request.name, None)?;
        let order = resolve_display_order(&rows, parent_id, request.display_order);
        let mut org = ManagedOrgUnit::new(request, parent_id, order);
        let input = store::NewOrgUnit {
            name: org.name.to_utf8_lossy(),
            code: org.code.to_utf8_lossy(),
            description: org.description.as_ref().map(JsString::to_utf8_lossy),
            parent_id: org.parent_id,
            display_order: org.display_order,
            created_at: org.created_at,
            updated_at: org.updated_at,
        };
        let pending = pending.cloned();
        let (id, version) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(Uuid, i32), sqlx::Error> = async {
                        // Real R2C create witness: the new entity precedes the earlier
                        // managed session update within the first business flush.
                        let result = store::insert(&mut transaction, &input).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(result)
                    }
                    .await;
                    match result {
                        Ok(value) => {
                            transaction.commit().await?;
                            Ok(value)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        org.id = id;
        org.row_version = version;
        self.audit(
            org.audit(
                "platform.org-unit.created",
                operator_id,
                None,
                Some(org.created_snapshot()),
            ),
            None,
        )
        .await?;
        org.summary()
    }

    pub async fn update(
        &self,
        id: &str,
        request: UpdateOrgUnit,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<OrgUnitSummary, OrgUnitsError> {
        let rows = self.org_units().await?;
        let row = self.update_target(&rows, id).await?;
        let mut org = ManagedOrgUnit::from(row.clone());
        let before = org.updated_snapshot();
        if let Some(code) = request.code.as_ref()
            && code != &org.code
            && let Some(existing) = self.by_code(code).await?
        {
            if existing.id != org.id {
                return Err(conflict_text("OrgUnit code ", code, " already exists"));
            }
            // A code lookup that finds this same managed entity hydrates
            // its fresh non-null scalar values before the next check.
            org = ManagedOrgUnit::from(store::merge_find_one(existing, Some(&row)));
        }
        if let Some(name) = request.name.as_ref()
            && name != &org.name
        {
            assert_sibling_name_available(&rows, org.parent_id, name, Some(org.id))?;
        }
        let changes = org.apply_update(request);
        self.flush_one(&mut org, changes, pending).await?;
        self.audit(
            org.audit(
                "platform.org-unit.updated",
                operator_id,
                Some(before),
                Some(org.updated_snapshot()),
            ),
            None,
        )
        .await?;
        org.summary()
    }

    pub async fn activate(
        &self,
        id: &str,
        request: OrgUnitActivation,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<OrgUnitSummary, OrgUnitsError> {
        let rows = self.org_units().await?;
        let row = strict_target(&rows, id)?;
        let mut org = ManagedOrgUnit::from(row.clone());
        if row
            .parent_id
            .and_then(|parent_id| rows.iter().find(|parent| parent.id == parent_id))
            .is_some_and(|parent| !parent.is_active)
        {
            let mut audit = org.audit(
                "platform.org-unit.activate.rejected",
                operator_id,
                Some(format!(
                    r#"{{"isActive":{},"parentId":{}}}"#,
                    org.is_active,
                    parent_json(org.parent_id)
                )),
                None,
            );
            audit.result = "rejected";
            audit.reason = Some("inactive-parent");
            audit.metadata = Some(format!(
                r#"{{"request":{}}}"#,
                activation_request_json(&request)
            ));
            self.audit(audit, pending).await?;
            return Err(OrgUnitsError::Conflict(js_string(&format!(
                "OrgUnit {id} cannot be activated under an inactive parent"
            ))));
        }
        let before = org.activation_snapshot();
        let changes = OrgUnitUpdate {
            is_active: (!org.is_active).then_some(true),
            ..Default::default()
        };
        org.is_active = true;
        self.flush_one(&mut org, changes, pending).await?;
        self.audit(
            org.audit(
                "platform.org-unit.activated",
                operator_id,
                Some(before),
                Some(org.activation_snapshot()),
            ),
            None,
        )
        .await?;
        org.summary()
    }

    pub async fn deactivate(
        &self,
        id: &str,
        request: OrgUnitActivation,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<OrgUnitSummary, OrgUnitsError> {
        let rows = self.org_units().await?;
        let target_id = strict_target(&rows, id)?.id;
        let descendants = collect_descendant_ids(&rows, target_id);
        let mut affected: Vec<ManagedOrgUnit> = rows
            .into_iter()
            .filter(|row| row.id == target_id || descendants.contains(&row.id))
            .map(Into::into)
            .collect();
        let before = activation_list_snapshot(&affected);
        self.flush_deactivation(&mut affected, pending).await?;
        let org = affected
            .iter()
            .find(|org| org.id == target_id)
            .ok_or(OrgUnitsError::Internal)?;
        let mut audit = org.audit(
            "platform.org-unit.deactivated",
            operator_id,
            Some(before),
            Some(activation_list_snapshot(&affected)),
        );
        audit.metadata = Some(format!(
            r#"{{"request":{},"cascadedCount":{}}}"#,
            activation_request_json(&request),
            affected.len().saturating_sub(1)
        ));
        self.audit(audit, None).await?;
        org.summary()
    }

    pub async fn move_org_unit(
        &self,
        id: &str,
        request: MoveOrgUnit,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<OrgUnitSummary, OrgUnitsError> {
        let rows = self.org_units().await?;
        let mut org = ManagedOrgUnit::from(strict_target(&rows, id)?.clone());
        let parent_text = match &request.parent_id {
            Field::Missing => org.parent_id.map(|id| id.to_string()),
            Field::Null => None,
            Field::Value(value) => Some(value.clone()),
        };
        // This helper already rejects an inactive requested parent. The later
        // inactive-parent audit branch in the original source is unreachable.
        let next_parent = resolve_requested_parent(&rows, parent_text.as_deref())?;
        let next_parent_id = next_parent.map(|row| row.id);
        let descendants = collect_descendant_ids(&rows, org.id);
        if next_parent_id.is_some_and(|parent| descendants.contains(&parent)) {
            let mut audit = org.audit(
                "platform.org-unit.move.rejected",
                operator_id,
                Some(org.move_snapshot()),
                None,
            );
            audit.result = "rejected";
            audit.reason = Some("cycle-detected");
            audit.metadata = Some(format!(r#"{{"request":{}}}"#, move_request_json(&request)));
            self.audit(audit, pending).await?;
            return Err(OrgUnitsError::Conflict(js_string(&format!(
                "OrgUnit {id} cannot move under its own descendant"
            ))));
        }
        assert_sibling_name_available(&rows, next_parent_id, &org.name, Some(org.id))?;
        let before = org.move_snapshot();
        let order = request.display_order.unwrap_or(org.display_order);
        let changes = OrgUnitUpdate {
            parent_id: (next_parent_id != org.parent_id).then_some(next_parent_id),
            display_order: (order != org.display_order).then_some(order),
            ..Default::default()
        };
        org.parent_id = next_parent_id;
        org.display_order = order;
        self.flush_one(&mut org, changes, pending).await?;
        let mut audit = org.audit(
            "platform.org-unit.moved",
            operator_id,
            Some(before),
            Some(org.move_snapshot()),
        );
        audit.metadata = Some(format!(r#"{{"request":{}}}"#, move_request_json(&request)));
        self.audit(audit, None).await?;
        org.summary()
    }

    async fn by_code(&self, code: &JsString) -> Result<Option<OrgUnitRow>, OrgUnitsError> {
        let code = code.to_utf8_lossy();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_by_code(connection, &code).await })
            })
            .await
            .map_err(Into::into)
    }

    async fn update_target(
        &self,
        rows: &[OrgUnitRow],
        id: &str,
    ) -> Result<OrgUnitRow, OrgUnitsError> {
        if let Some(row) = rows.iter().find(|row| row.id.to_string() == id) {
            return Ok(row.clone());
        }
        let owned_id = id.to_owned();
        let row = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &owned_id).await })
            })
            .await?
            .ok_or_else(|| OrgUnitsError::NotFound(format!("OrgUnit {id} not found")))?;
        let cached = rows.iter().find(|cached| cached.id == row.id);
        Ok(store::merge_find_one(row, cached))
    }

    async fn flush_one(
        &self,
        org: &mut ManagedOrgUnit,
        changes: OrgUnitUpdate,
        pending: Option<&SessionFlush>,
    ) -> Result<(), OrgUnitsError> {
        let dirty = changes.is_dirty();
        if !dirty && pending.is_none() {
            return Ok(());
        }
        let id = org.id;
        let expected = org.row_version;
        let updated_at = clock_now();
        let pending = pending.cloned();
        let version = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Option<i32>, sqlx::Error> = async {
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if dirty {
                            Ok(Some(
                                store::update(&mut transaction, id, expected, &changes, updated_at)
                                    .await?,
                            ))
                        } else {
                            Ok(None)
                        }
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
            org.row_version = version;
            org.updated_at = updated_at;
        }
        Ok(())
    }

    async fn flush_deactivation(
        &self,
        affected: &mut [ManagedOrgUnit],
        pending: Option<&SessionFlush>,
    ) -> Result<(), OrgUnitsError> {
        let inputs: Vec<_> = affected
            .iter()
            .filter(|org| org.is_active)
            .map(|org| Deactivation {
                id: org.id,
                expected_version: org.row_version,
                updated_at: clock_now(),
            })
            .collect();
        for org in affected.iter_mut() {
            org.is_active = false;
        }
        if inputs.is_empty() && pending.is_none() {
            return Ok(());
        }
        let updates: HashMap<_, _> = inputs
            .iter()
            .map(|input| (input.id, input.updated_at))
            .collect();
        let pending = pending.cloned();
        let versions = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<HashMap<Uuid, i32>, sqlx::Error> = async {
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if inputs.len() == 1 {
                            let input = &inputs[0];
                            let changes = OrgUnitUpdate {
                                is_active: Some(false),
                                ..Default::default()
                            };
                            let version = store::update(
                                &mut transaction,
                                input.id,
                                input.expected_version,
                                &changes,
                                input.updated_at,
                            )
                            .await?;
                            Ok(HashMap::from([(input.id, version)]))
                        } else {
                            store::deactivate_many(&mut transaction, &inputs).await
                        }
                    }
                    .await;
                    match result {
                        Ok(versions) => {
                            transaction.commit().await?;
                            Ok(versions)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        for org in affected {
            if let Some(updated_at) = updates.get(&org.id) {
                org.updated_at = *updated_at;
            }
            if let Some(version) = versions.get(&org.id) {
                org.row_version = *version;
            }
        }
        Ok(())
    }

    async fn audit(
        &self,
        input: OrgUnitAudit,
        pending: Option<&SessionFlush>,
    ) -> Result<(), OrgUnitsError> {
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
                    match result {
                        Ok(()) => {
                            transaction.commit().await?;
                            Ok(())
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        Ok(())
    }

    async fn org_units(&self) -> Result<Vec<OrgUnitRow>, OrgUnitsError> {
        self.database
            .with_connection(|connection| Box::pin(store::list(connection)))
            .await
            .map_err(Into::into)
    }

    async fn membership_counts(&self) -> Result<HashMap<Uuid, i64>, OrgUnitsError> {
        self.database
            .with_connection(|connection| Box::pin(store::active_membership_counts(connection)))
            .await
            .map_err(Into::into)
    }
}

fn tree_node(
    row: &OrgUnitRow,
    children_by_parent: &HashMap<Option<Uuid>, Vec<OrgUnitRow>>,
    memberships: &HashMap<Uuid, i64>,
) -> Result<OrgUnitTreeNode, OrgUnitsError> {
    let children = children_by_parent.get(&Some(row.id)).map_or_else(
        || Ok(Vec::new()),
        |rows| {
            rows.iter()
                .map(|row| tree_node(row, children_by_parent, memberships))
                .collect::<Result<Vec<_>, _>>()
        },
    )?;
    Ok(OrgUnitTreeNode {
        detail: detail(row, children.len(), memberships)?,
        children,
    })
}

fn detail(
    row: &OrgUnitRow,
    child_count: usize,
    memberships: &HashMap<Uuid, i64>,
) -> Result<OrgUnitDetail, OrgUnitsError> {
    let child_count = i64::try_from(child_count).map_err(|_| OrgUnitsError::Internal)?;
    let active_membership_count = memberships.get(&row.id).copied().unwrap_or(0);
    Ok(OrgUnitDetail {
        summary: ManagedOrgUnit::from(row.clone()).summary()?,
        child_count,
        active_membership_count,
        can_delete: child_count == 0 && active_membership_count == 0,
    })
}

fn strict_target<'a>(rows: &'a [OrgUnitRow], id: &str) -> Result<&'a OrgUnitRow, OrgUnitsError> {
    rows.iter()
        .find(|row| row.id.to_string() == id)
        .ok_or_else(|| OrgUnitsError::NotFound(format!("OrgUnit {id} not found")))
}

fn resolve_requested_parent<'a>(
    rows: &'a [OrgUnitRow],
    parent_id: Option<&str>,
) -> Result<Option<&'a OrgUnitRow>, OrgUnitsError> {
    let Some(parent_id) = parent_id.filter(|id| !id.is_empty()) else {
        return Ok(None);
    };
    let parent = strict_target(rows, parent_id)?;
    if !parent.is_active {
        return Err(OrgUnitsError::Conflict(js_string(&format!(
            "OrgUnit {parent_id} is inactive"
        ))));
    }
    Ok(Some(parent))
}

fn assert_sibling_name_available(
    rows: &[OrgUnitRow],
    parent_id: Option<Uuid>,
    name: &JsString,
    excluded_id: Option<Uuid>,
) -> Result<(), OrgUnitsError> {
    let normalized = collation::sibling_name_key(name);
    if rows.iter().any(|row| {
        Some(row.id) != excluded_id
            && row.parent_id == parent_id
            && collation::sibling_name_key(&js_string(&row.name)) == normalized
    }) {
        return Err(conflict_text(
            "OrgUnit name ",
            name,
            " already exists under the same parent",
        ));
    }
    Ok(())
}

fn resolve_display_order(
    rows: &[OrgUnitRow],
    parent_id: Option<Uuid>,
    requested: Option<i64>,
) -> i64 {
    requested.unwrap_or_else(|| {
        rows.iter()
            .filter(|row| row.parent_id == parent_id)
            .map(|row| i64::from(row.display_order))
            .max()
            .map_or(0, |maximum| maximum + 1)
    })
}

fn collect_descendant_ids(rows: &[OrgUnitRow], root_id: Uuid) -> HashSet<Uuid> {
    let mut descendants = HashSet::new();
    let mut queue = VecDeque::from([root_id]);
    while let Some(current_id) = queue.pop_front() {
        for row in rows {
            if row.parent_id == Some(current_id) && descendants.insert(row.id) {
                queue.push_back(row.id);
            }
        }
    }
    descendants
}

fn conflict_text(prefix: &str, value: &JsString, suffix: &str) -> OrgUnitsError {
    let units = prefix
        .encode_utf16()
        .chain(value.as_code_units().iter().copied())
        .chain(suffix.encode_utf16())
        .collect();
    OrgUnitsError::Conflict(JsString::from_code_units(units))
}

fn parent_json(parent_id: Option<Uuid>) -> String {
    parent_id.map_or_else(|| "null".into(), |id| format!("\"{id}\""))
}

fn activation_request_json(request: &OrgUnitActivation) -> String {
    let mut fields = Vec::new();
    if let Some(value) = &request.reason {
        fields.push(format!("\"reason\":{}", value.json()));
    }
    if let Some(value) = &request.comment {
        fields.push(format!("\"comment\":{}", value.json()));
    }
    if let Some(value) = request.expected_version {
        fields.push(format!("\"expectedVersion\":{value}"));
    }
    format!("{{{}}}", fields.join(","))
}

fn move_request_json(request: &MoveOrgUnit) -> String {
    let mut fields = Vec::new();
    match &request.parent_id {
        Field::Missing => {}
        Field::Null => fields.push("\"parentId\":null".into()),
        Field::Value(value) => fields.push(format!("\"parentId\":{}", js_string(value).json())),
    }
    if let Some(value) = request.display_order {
        fields.push(format!("\"displayOrder\":{value}"));
    }
    if let Some(value) = &request.reason {
        fields.push(format!("\"reason\":{}", value.json()));
    }
    if let Some(value) = request.expected_version {
        fields.push(format!("\"expectedVersion\":{value}"));
    }
    format!("{{{}}}", fields.join(","))
}

fn activation_list_snapshot(orgs: &[ManagedOrgUnit]) -> String {
    let rows: Vec<_> = orgs
        .iter()
        .map(|org| format!(r#"{{"id":"{}","isActive":{}}}"#, org.id, org.is_active))
        .collect();
    format!(r#"{{"orgUnits":[{}]}}"#, rows.join(","))
}

struct ManagedOrgUnit {
    id: Uuid,
    name: JsString,
    code: JsString,
    description: Option<JsString>,
    parent_id: Option<Uuid>,
    is_active: bool,
    display_order: i64,
    row_version: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<OrgUnitRow> for ManagedOrgUnit {
    fn from(row: OrgUnitRow) -> Self {
        Self {
            id: row.id,
            name: js_string(&row.name),
            code: js_string(&row.code),
            description: row.description.as_deref().map(js_string),
            parent_id: row.parent_id,
            is_active: row.is_active,
            display_order: i64::from(row.display_order),
            row_version: row.row_version,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl ManagedOrgUnit {
    fn new(request: CreateOrgUnit, parent_id: Option<Uuid>, display_order: i64) -> Self {
        Self {
            id: Uuid::nil(),
            name: request.name,
            code: request.code,
            description: match request.description {
                Field::Missing | Field::Null => None,
                Field::Value(value) => Some(value),
            },
            parent_id,
            is_active: true,
            display_order,
            row_version: 1,
            created_at: clock_now(),
            updated_at: clock_now(),
        }
    }

    fn apply_update(&mut self, request: UpdateOrgUnit) -> OrgUnitUpdate {
        let mut changes = OrgUnitUpdate::default();
        if let Some(code) = request.code
            && code != self.code
        {
            changes.code = Some(code.to_utf8_lossy());
            self.code = code;
        }
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

    fn created_snapshot(&self) -> String {
        format!(
            r#"{{"code":{},"name":{},"parentId":{},"displayOrder":{},"isActive":{}}}"#,
            self.code.json(),
            self.name.json(),
            parent_json(self.parent_id),
            self.display_order,
            self.is_active
        )
    }

    fn updated_snapshot(&self) -> String {
        format!(
            r#"{{"name":{},"code":{},"description":{},"displayOrder":{}}}"#,
            self.name.json(),
            self.code.json(),
            self.description
                .as_ref()
                .map_or_else(|| "null".into(), JsString::json),
            self.display_order
        )
    }

    fn activation_snapshot(&self) -> String {
        format!(r#"{{"isActive":{}}}"#, self.is_active)
    }

    fn move_snapshot(&self) -> String {
        format!(
            r#"{{"parentId":{},"displayOrder":{}}}"#,
            parent_json(self.parent_id),
            self.display_order
        )
    }

    fn audit(
        &self,
        event_type: &'static str,
        operator_id: Option<Uuid>,
        before_snapshot: Option<String>,
        after_snapshot: Option<String>,
    ) -> OrgUnitAudit {
        OrgUnitAudit {
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

    fn summary(&self) -> Result<OrgUnitSummary, OrgUnitsError> {
        Ok(OrgUnitSummary {
            id: self.id.to_string(),
            name: self.name.clone(),
            code: self.code.clone(),
            description: self.description.clone(),
            parent_id: self.parent_id.map(|id| id.to_string()),
            is_active: self.is_active,
            display_order: i32::try_from(self.display_order)
                .map_err(|_| OrgUnitsError::Internal)?,
            created_at: js_iso_string(self.created_at).map_err(|_| OrgUnitsError::Internal)?,
            updated_at: js_iso_string(self.updated_at).map_err(|_| OrgUnitsError::Internal)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(value: u128, parent_id: Option<Uuid>, active: bool, order: i32) -> OrgUnitRow {
        OrgUnitRow {
            id: Uuid::from_u128(value),
            name: format!("组织{value}"),
            code: format!("ORG{value}"),
            description: None,
            parent_id,
            is_active: active,
            display_order: order,
            row_version: 7,
            created_at: DateTime::from_timestamp_millis(1_000).unwrap_or_default(),
            created_by: None,
            updated_at: DateTime::from_timestamp_millis(2_000).unwrap_or_default(),
            updated_by: None,
        }
    }

    #[test]
    fn strict_target_and_parent_preserve_alias_difference() {
        let rows = vec![row(0xabcd, None, true, 0)];
        let canonical = rows[0].id.to_string();
        assert!(strict_target(&rows, &canonical).is_ok());
        for alias in [
            canonical.to_uppercase(),
            canonical.replace('-', ""),
            "not-a-uuid".into(),
        ] {
            assert!(matches!(
                strict_target(&rows, &alias),
                Err(OrgUnitsError::NotFound(_))
            ));
            assert!(matches!(
                resolve_requested_parent(&rows, Some(&alias)),
                Err(OrgUnitsError::NotFound(_))
            ));
        }
        assert!(resolve_requested_parent(&rows, None).is_ok_and(|parent| parent.is_none()));
    }

    #[test]
    fn inactive_siblings_still_conflict_and_excluded_current_does_not() {
        let mut existing = row(1, None, false, 0);
        existing.name = "  Branch  ".into();
        let rows = vec![existing];
        assert!(assert_sibling_name_available(&rows, None, &js_string("BRANCH"), None).is_err());
        assert!(
            assert_sibling_name_available(&rows, None, &js_string("BRANCH"), Some(rows[0].id))
                .is_ok()
        );
        assert!(
            assert_sibling_name_available(
                &rows,
                Some(Uuid::from_u128(2)),
                &js_string("BRANCH"),
                None
            )
            .is_ok()
        );
    }

    #[test]
    fn default_order_includes_inactive_history_and_retains_storage_overflow() {
        assert_eq!(resolve_display_order(&[], None, None), 0);
        let rows = vec![row(1, None, false, -10), row(2, None, false, -5)];
        assert_eq!(resolve_display_order(&rows, None, None), -4);
        assert_eq!(resolve_display_order(&rows, None, Some(0)), 0);
        let rows = vec![row(1, None, false, i32::MAX)];
        assert_eq!(
            resolve_display_order(&rows, None, None),
            i64::from(i32::MAX) + 1
        );
        assert_eq!(
            resolve_display_order(&rows, None, Some(9_007_199_254_740_991)),
            9_007_199_254_740_991
        );
    }

    #[test]
    fn descendants_include_inactive_rows_and_do_not_seed_self() {
        let root = row(1, None, true, 0);
        let child = row(2, Some(root.id), false, 0);
        let grandchild = row(3, Some(child.id), true, 0);
        let rows = vec![
            root.clone(),
            child.clone(),
            grandchild.clone(),
            row(4, None, true, 0),
        ];
        let descendants = collect_descendant_ids(&rows, root.id);
        assert_eq!(descendants, HashSet::from([child.id, grandchild.id]));
        assert!(!descendants.contains(&root.id));
    }

    #[test]
    fn detail_counts_direct_inactive_children_and_raw_membership_total() {
        let root = row(1, None, false, 0);
        let memberships = HashMap::from([(root.id, 3)]);
        assert!(detail(&root, 1, &memberships).is_ok_and(|detail| {
            detail.child_count == 1 && detail.active_membership_count == 3 && !detail.can_delete
        }));
        assert!(detail(&root, 0, &HashMap::new()).is_ok_and(|detail| detail.can_delete));
    }
}
