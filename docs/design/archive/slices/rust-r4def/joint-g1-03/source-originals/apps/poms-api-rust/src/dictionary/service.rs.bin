use super::{
    model::{
        CreateDictionaryItem, DictionaryItemSummary, DictionaryQuery, UpdateDictionaryItem,
        js_string,
    },
    store::{self, DictionaryChanges, DictionaryRow},
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
use chrono::{DateTime, Utc};
use sqlx::Connection;
use std::{error::Error, fmt};
use uuid::Uuid;
#[derive(Debug)]
pub enum DictionaryError {
    NotFound(String),
    BadRequest(String),
    Conflict(String),
    Database(DbError),
    Internal,
}
impl fmt::Display for DictionaryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("dictionary operation failed")
    }
}
impl Error for DictionaryError {}
impl From<DbError> for DictionaryError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}
#[derive(Clone, Debug)]
pub struct DictionaryService {
    database: Database,
}
impl DictionaryService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }
    pub async fn list(
        &self,
        query: DictionaryQuery,
    ) -> Result<Vec<DictionaryItemSummary>, DictionaryError> {
        let rows = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::list(connection, &query).await })
            })
            .await?;
        let mut result = Vec::with_capacity(rows.len());
        for row in rows {
            result.push(self.summary(ManagedItem::from(row)).await?);
        }
        Ok(result)
    }
    pub async fn create(
        &self,
        request: CreateDictionaryItem,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<DictionaryItemSummary, DictionaryError> {
        let domain = request.domain.clone();
        let code = request.code.to_utf8_lossy();
        if self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_code(connection, &domain, &code).await })
            })
            .await?
            .is_some()
        {
            return Err(DictionaryError::Conflict(format!(
                "Dictionary item already exists: {}/{}",
                request.domain,
                request.code.to_utf8_lossy()
            )));
        }
        let mut item = ManagedItem::new(request, operator_id);
        let input = store::NewDictionaryItem {
            domain: item.domain.clone(),
            code: item.code.to_utf8_lossy(),
            name: item.name.to_utf8_lossy(),
            description: item.description.as_ref().map(JsString::to_utf8_lossy),
            sort_order: item.sort_order,
            operator_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
        };
        let pending = pending.cloned();
        item.id = self
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
        self.summary(item).await
    }
    pub async fn update(
        &self,
        id: &str,
        request: UpdateDictionaryItem,
        operator_id: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<DictionaryItemSummary, DictionaryError> {
        let path = id.to_owned();
        let row = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &path).await })
            })
            .await?
            .ok_or_else(|| DictionaryError::NotFound(format!("Dictionary item not found: {id}")))?;
        if let Some(expected) = request.expected_version
            && expected != i64::from(row.row_version)
        {
            return Err(DictionaryError::Conflict(format!(
                "Dictionary item version conflict: expected {expected}, actual {}",
                row.row_version
            )));
        }
        let mut item = ManagedItem::from(row);
        let changes = item.apply(request, operator_id);
        self.flush_update(&mut item, changes, pending).await?;
        self.summary(item).await
    }
    pub async fn require_active_item(
        &self,
        domain: &str,
        code: &str,
    ) -> Result<DictionaryRow, DictionaryError> {
        let bound_domain = domain.to_owned();
        let bound_code = code.to_owned();
        let row = self
            .database
            .with_connection(move |connection| {
                Box::pin(
                    async move { store::find_code(connection, &bound_domain, &bound_code).await },
                )
            })
            .await?
            .ok_or_else(|| {
                DictionaryError::BadRequest(format!("Dictionary item not found: {domain}/{code}"))
            })?;
        if row.status != "active" {
            return Err(DictionaryError::BadRequest(format!(
                "Dictionary item is inactive: {domain}/{code}"
            )));
        }
        Ok(row)
    }
    async fn summary(&self, item: ManagedItem) -> Result<DictionaryItemSummary, DictionaryError> {
        let domain = item.domain.clone();
        let code = item.code.to_utf8_lossy();
        let usage_count = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::count_usage(connection, &domain, &code).await })
            })
            .await?;
        Ok(DictionaryItemSummary {
            id: item.id.to_string(),
            domain: item.domain,
            code: item.code,
            name: item.name,
            description: item.description,
            status: item.status,
            sort_order: item.sort_order,
            is_system: item.is_system,
            usage_count,
            row_version: item.row_version,
            created_at: js_iso_string(item.created_at).map_err(|_| DictionaryError::Internal)?,
            created_by: item.created_by.map(|id| id.to_string()),
            updated_at: js_iso_string(item.updated_at).map_err(|_| DictionaryError::Internal)?,
            updated_by: item.updated_by.map(|id| id.to_string()),
        })
    }
    // Final statement order is checked against the joint R2EF original Nest witness.
    async fn flush_update(
        &self,
        item: &mut ManagedItem,
        changes: DictionaryChanges,
        pending: Option<&SessionFlush>,
    ) -> Result<(), DictionaryError> {
        let dirty = changes.is_dirty();
        if !dirty && pending.is_none() {
            return Ok(());
        }
        let id = item.id;
        let version = item.row_version;
        let at = clock_now();
        let pending = pending.cloned();
        let new_version = self
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
                                store::update(&mut transaction, id, version, &changes, at).await?,
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
        if let Some(version) = new_version {
            item.row_version = version;
            item.updated_at = at;
        }
        Ok(())
    }
}
struct ManagedItem {
    id: Uuid,
    domain: String,
    code: JsString,
    name: JsString,
    description: Option<JsString>,
    status: String,
    sort_order: i64,
    is_system: bool,
    row_version: i32,
    created_at: DateTime<Utc>,
    created_by: Option<Uuid>,
    updated_at: DateTime<Utc>,
    updated_by: Option<Uuid>,
}
impl From<DictionaryRow> for ManagedItem {
    fn from(row: DictionaryRow) -> Self {
        Self {
            id: row.id,
            domain: row.domain,
            code: js_string(&row.code),
            name: js_string(&row.name),
            description: row.description.as_deref().map(js_string),
            status: row.status,
            sort_order: i64::from(row.sort_order),
            is_system: row.is_system,
            row_version: row.row_version,
            created_at: row.created_at,
            created_by: row.created_by,
            updated_at: row.updated_at,
            updated_by: row.updated_by,
        }
    }
}
impl ManagedItem {
    fn new(request: CreateDictionaryItem, operator_id: Option<Uuid>) -> Self {
        Self {
            id: Uuid::nil(),
            domain: request.domain,
            code: request.code,
            name: request.name,
            description: match request.description {
                Field::Missing | Field::Null => None,
                Field::Value(value) => Some(value),
            },
            status: "active".into(),
            sort_order: request.sort_order.unwrap_or(100),
            is_system: false,
            row_version: 1,
            created_at: clock_now(),
            created_by: operator_id,
            updated_at: clock_now(),
            updated_by: operator_id,
        }
    }
    fn apply(
        &mut self,
        request: UpdateDictionaryItem,
        operator_id: Option<Uuid>,
    ) -> DictionaryChanges {
        let mut changes = DictionaryChanges::default();
        if let Some(value) = request.name
            && value != self.name
        {
            changes.name = Some(value.to_utf8_lossy());
            self.name = value;
        }
        let description = match request.description {
            Field::Missing => None,
            Field::Null => Some(None),
            Field::Value(value) => Some(Some(value)),
        };
        if let Some(value) = description
            && value != self.description
        {
            changes.description = Some(value.as_ref().map(JsString::to_utf8_lossy));
            self.description = value;
        }
        if let Some(value) = request.status
            && value != self.status
        {
            changes.status = Some(value.clone());
            self.status = value;
        }
        if let Some(value) = request.sort_order
            && value != self.sort_order
        {
            changes.sort_order = Some(value);
            self.sort_order = value;
        }
        if operator_id != self.updated_by {
            changes.updated_by = Some(operator_id);
            self.updated_by = operator_id;
        }
        changes
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_null_and_unchanged_fields_preserve_real_dirty_detection() {
        let request = CreateDictionaryItem {
            domain: "lead-source".into(),
            code: js_string("web"),
            name: js_string("Web"),
            description: Field::Value(js_string("old")),
            sort_order: None,
        };
        let mut row = ManagedItem::new(request, None);
        assert!(
            !row.apply(
                UpdateDictionaryItem {
                    name: Some(js_string("Web")),
                    ..Default::default()
                },
                None
            )
            .is_dirty()
        );
        assert_eq!(row.description, Some(js_string("old")));
        let changes = row.apply(
            UpdateDictionaryItem {
                description: Field::Null,
                ..Default::default()
            },
            None,
        );
        assert_eq!(changes.description, Some(None));
        assert!(changes.is_dirty());
        assert!(row.description.is_none());
        let actor = Uuid::from_u128(1);
        assert!(
            row.apply(UpdateDictionaryItem::default(), Some(actor))
                .updated_by
                .is_some()
        );
    }
}
