use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;
#[derive(Clone, Debug)]
pub struct SettingRow {
    pub key: String,
    pub value_type: String,
    pub value_json: String,
    pub row_version: i32,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}
// PostgreSQL JSONB can hold 1e1000. Keep its text until original JS Number
// hydration so this reaches the service's integer rejection rather than a new
// serde_json decode failure at the database boundary.
const SELECT: &str = "SELECT key,value_type,value_json::text AS value_json,row_version,updated_at,updated_by FROM poms.system_setting";
fn row(row: PgRow) -> Result<SettingRow, sqlx::Error> {
    Ok(SettingRow {
        key: row.try_get("key")?,
        value_type: row.try_get("value_type")?,
        value_json: row.try_get("value_json")?,
        row_version: row.try_get("row_version")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}
pub async fn list(connection: &mut PgConnection) -> Result<Vec<SettingRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(SELECT);
    query.push(" ORDER BY key ASC");
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(row)
        .collect()
}
pub async fn find(
    connection: &mut PgConnection,
    key: &str,
) -> Result<Option<SettingRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(SELECT);
    query.push(" WHERE key=").push_bind(key);
    query
        .build()
        .fetch_optional(connection)
        .await?
        .map(row)
        .transpose()
}
pub async fn insert(
    connection: &mut PgConnection,
    input: &SettingRow,
    created_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.system_setting(key,value_type,value_json,row_version,created_at,updated_at,updated_by) VALUES($1,$2,$3::text::jsonb,1,$4,$5,$6)").bind(&input.key).bind(&input.value_type).bind(&input.value_json).bind(created_at).bind(input.updated_at).bind(input.updated_by).execute(connection).await?;
    Ok(())
}
#[derive(Default)]
pub struct SettingChanges {
    pub value_type: Option<String>,
    pub value_json: Option<String>,
    pub updated_by: Option<Option<Uuid>>,
}
impl SettingChanges {
    pub fn is_dirty(&self) -> bool {
        self.value_type.is_some() || self.value_json.is_some() || self.updated_by.is_some()
    }
}
pub async fn update(
    connection: &mut PgConnection,
    key: &str,
    version: i32,
    changes: &SettingChanges,
    updated_at: DateTime<Utc>,
) -> Result<i32, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.system_setting SET ");
    {
        let mut fields = query.separated(",");
        if let Some(value) = &changes.value_type {
            fields.push("value_type=").push_bind_unseparated(value);
        }
        if let Some(value) = &changes.value_json {
            fields
                .push("value_json=")
                .push_bind_unseparated(value)
                .push_unseparated("::text::jsonb");
        }
        if let Some(value) = changes.updated_by {
            fields.push("updated_by=").push_bind_unseparated(value);
        }
        fields.push("updated_at=").push_bind_unseparated(updated_at);
        fields.push("row_version=row_version+1");
    }
    query
        .push(" WHERE key=")
        .push_bind(key)
        .push(" AND row_version=")
        .push_bind(version)
        .push(" RETURNING row_version");
    let row = query.build().fetch_optional(connection).await?;
    row.ok_or_else(|| sqlx::Error::Protocol("setting managed version conflict".into()))?
        .try_get("row_version")
}
