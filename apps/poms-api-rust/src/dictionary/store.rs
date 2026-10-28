//! Original dictionary facts and SQL primitives. The service owns each flush.
use super::model::DictionaryQuery;
use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct DictionaryRow {
    pub id: Uuid,
    pub domain: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub sort_order: i32,
    pub is_system: bool,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}
const SELECT: &str = "SELECT id,domain,code,name,description,status,sort_order,is_system,row_version,created_at,created_by,updated_at,updated_by FROM poms.dictionary_item";
fn row(row: PgRow) -> Result<DictionaryRow, sqlx::Error> {
    Ok(DictionaryRow {
        id: row.try_get("id")?,
        domain: row.try_get("domain")?,
        code: row.try_get("code")?,
        name: row.try_get("name")?,
        description: row.try_get("description")?,
        status: row.try_get("status")?,
        sort_order: row.try_get("sort_order")?,
        is_system: row.try_get("is_system")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}
pub async fn list(
    connection: &mut PgConnection,
    query: &DictionaryQuery,
) -> Result<Vec<DictionaryRow>, sqlx::Error> {
    let mut sql = QueryBuilder::<Postgres>::new(SELECT);
    sql.push(" WHERE true");
    if let Some(domain) = &query.domain {
        sql.push(" AND domain=").push_bind(domain);
    }
    if let Some(status) = &query.status {
        sql.push(" AND status=").push_bind(status);
    }
    if let Some(keyword) = &query.keyword {
        let pattern = format!("%{}%", keyword.to_utf8_lossy());
        sql.push(" AND (code ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR description ILIKE ")
            .push_bind(pattern)
            .push(")");
    }
    sql.push(" ORDER BY domain ASC,sort_order ASC,code ASC");
    sql.build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(row)
        .collect()
}
pub async fn find(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<DictionaryRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(SELECT);
    query.push(" WHERE id=").push_bind(id).push("::text::uuid");
    query
        .build()
        .fetch_optional(connection)
        .await?
        .map(row)
        .transpose()
}
pub async fn find_code(
    connection: &mut PgConnection,
    domain: &str,
    code: &str,
) -> Result<Option<DictionaryRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(SELECT);
    query
        .push(" WHERE domain=")
        .push_bind(domain)
        .push(" AND code=")
        .push_bind(code);
    query
        .build()
        .fetch_optional(connection)
        .await?
        .map(row)
        .transpose()
}
pub async fn count_usage(
    connection: &mut PgConnection,
    domain: &str,
    code: &str,
) -> Result<i64, sqlx::Error> {
    let query = match domain {
        "attachment-category" => "SELECT count(*) FROM poms.attachment WHERE category=$1",
        "sales-follow-up-type" => {
            "SELECT count(*) FROM poms.sales_follow_up_record WHERE follow_up_type=$1"
        }
        "expense-category" => "SELECT count(*) FROM poms.expense_record WHERE expense_category=$1",
        "lead-source" => "SELECT count(*) FROM poms.lead WHERE source_code=$1",
        _ => {
            return Err(sqlx::Error::Protocol(
                "unknown stored dictionary domain".into(),
            ));
        }
    };
    sqlx::query_scalar(query)
        .bind(code)
        .fetch_one(connection)
        .await
}
pub struct NewDictionaryItem {
    pub domain: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: i64,
    pub operator_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
pub async fn insert(
    connection: &mut PgConnection,
    input: &NewDictionaryItem,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.dictionary_item(domain,code,name,description,status,sort_order,is_system,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,'active',$5,false,$6,$7,$8,$7) RETURNING id")
        .bind(&input.domain).bind(&input.code).bind(&input.name).bind(&input.description).bind(input.sort_order).bind(input.created_at).bind(input.operator_id).bind(input.updated_at).fetch_one(connection).await
}
#[derive(Debug, Default)]
pub struct DictionaryChanges {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub status: Option<String>,
    pub sort_order: Option<i64>,
    pub updated_by: Option<Option<Uuid>>,
}
impl DictionaryChanges {
    pub fn is_dirty(&self) -> bool {
        self.name.is_some()
            || self.description.is_some()
            || self.status.is_some()
            || self.sort_order.is_some()
            || self.updated_by.is_some()
    }
}
pub async fn update(
    connection: &mut PgConnection,
    id: Uuid,
    version: i32,
    changes: &DictionaryChanges,
    updated_at: DateTime<Utc>,
) -> Result<i32, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.dictionary_item SET ");
    {
        let mut columns = query.separated(",");
        if let Some(value) = &changes.name {
            columns.push("name=").push_bind_unseparated(value);
        }
        if let Some(value) = &changes.description {
            columns.push("description=").push_bind_unseparated(value);
        }
        if let Some(value) = &changes.status {
            columns.push("status=").push_bind_unseparated(value);
        }
        if let Some(value) = changes.sort_order {
            columns.push("sort_order=").push_bind_unseparated(value);
        }
        if let Some(value) = changes.updated_by {
            columns.push("updated_by=").push_bind_unseparated(value);
        }
        columns
            .push("updated_at=")
            .push_bind_unseparated(updated_at);
        columns.push("row_version=row_version+1");
    }
    query
        .push(" WHERE id=")
        .push_bind(id)
        .push(" AND row_version=")
        .push_bind(version)
        .push(" RETURNING row_version");
    let row = query.build().fetch_optional(connection).await?;
    row.ok_or_else(|| sqlx::Error::Protocol("dictionary managed version conflict".into()))?
        .try_get("row_version")
}
