use std::collections::HashMap;

use chrono::{DateTime, SecondsFormat, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::Query;

#[derive(Clone)]
pub(super) struct Customer {
    pub id: Uuid,
    pub name: String,
    pub status: String,
}
#[derive(Clone)]
pub(super) struct Lead {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub name: String,
    pub owner_user_id: Option<Uuid>,
    pub owner_org_id: Option<Uuid>,
}
#[derive(Clone)]
pub(super) struct Project {
    pub id: Uuid,
    pub customer_id: Option<Uuid>,
    pub name: String,
    pub owner_user_id: Option<Uuid>,
    pub owner_org_id: Option<Uuid>,
}
#[derive(Clone)]
pub(super) struct User {
    pub id: Uuid,
    pub name: String,
    pub primary_org_unit_id: Option<Uuid>,
}
#[derive(Clone)]
pub(super) struct Org {
    pub id: Uuid,
    pub name: String,
}

#[derive(Clone, Default)]
pub(super) struct Context {
    pub customer: Option<Customer>,
    pub lead: Option<Lead>,
    pub project: Option<Project>,
    pub owner_user: Option<User>,
    pub owner_org: Option<Org>,
    pub voided_by_user: Option<User>,
}

#[derive(Clone)]
pub(super) struct Record {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub lead_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub status: String,
    pub follow_up_type: String,
    pub occurred_at: DateTime<Utc>,
    pub summary: String,
    pub detail: Option<String>,
    pub outcome: String,
    pub next_follow_up_at: Option<DateTime<Utc>>,
    pub owner_org_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub supersedes_record_id: Option<Uuid>,
    pub replaced_by_record_id: Option<Uuid>,
    pub replacement_reason: Option<String>,
    pub voided_at: Option<DateTime<Utc>>,
    pub voided_by: Option<Uuid>,
    pub void_reason: Option<String>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

fn record(row: PgRow) -> Result<Record, sqlx::Error> {
    Ok(Record {
        id: row.try_get("id")?,
        customer_id: row.try_get("customer_id")?,
        lead_id: row.try_get("lead_id")?,
        project_id: row.try_get("project_id")?,
        status: row.try_get("status")?,
        follow_up_type: row.try_get("follow_up_type")?,
        occurred_at: row.try_get("occurred_at")?,
        summary: row.try_get("summary")?,
        detail: row.try_get("detail")?,
        outcome: row.try_get("outcome")?,
        next_follow_up_at: row.try_get("next_follow_up_at")?,
        owner_org_id: row.try_get("owner_org_id")?,
        owner_user_id: row.try_get("owner_user_id")?,
        supersedes_record_id: row.try_get("supersedes_record_id")?,
        replaced_by_record_id: row.try_get("replaced_by_record_id")?,
        replacement_reason: row.try_get("replacement_reason")?,
        voided_at: row.try_get("voided_at")?,
        voided_by: row.try_get("voided_by")?,
        void_reason: row.try_get("void_reason")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}

fn customer(row: PgRow) -> Result<Customer, sqlx::Error> {
    Ok(Customer {
        id: row.try_get("id")?,
        name: row.try_get("display_name")?,
        status: row.try_get("status")?,
    })
}
fn lead(row: PgRow) -> Result<Lead, sqlx::Error> {
    Ok(Lead {
        id: row.try_get("id")?,
        customer_id: row.try_get("customer_id")?,
        name: row.try_get("lead_name")?,
        owner_user_id: row.try_get("owner_user_id")?,
        owner_org_id: row.try_get("owner_org_id")?,
    })
}
fn project(row: PgRow) -> Result<Project, sqlx::Error> {
    Ok(Project {
        id: row.try_get("id")?,
        customer_id: row.try_get("customer_id")?,
        name: row.try_get("project_name")?,
        owner_user_id: row.try_get("owner_user_id")?,
        owner_org_id: row.try_get("owner_org_id")?,
    })
}
fn user(row: PgRow) -> Result<User, sqlx::Error> {
    Ok(User {
        id: row.try_get("id")?,
        name: row.try_get("display_name")?,
        primary_org_unit_id: row.try_get("primary_org_unit_id")?,
    })
}
fn org(row: PgRow) -> Result<Org, sqlx::Error> {
    Ok(Org {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
    })
}

pub(super) async fn find(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Record>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.sales_follow_up_record WHERE id=$1::text::uuid")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(record)
        .transpose()
}

pub(super) async fn lock_source(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<Record>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.sales_follow_up_record WHERE id=$1 FOR UPDATE")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(record)
        .transpose()
}

pub(super) async fn list(
    connection: &mut PgConnection,
    input: &Query,
) -> Result<Vec<Record>, sqlx::Error> {
    let mut query =
        QueryBuilder::<Postgres>::new("SELECT * FROM poms.sales_follow_up_record WHERE true");
    if let Some(id) = input.customer_id.as_ref() {
        query
            .push(" AND customer_id=")
            .push_bind(id)
            .push("::text::uuid");
    }
    if input.lifecycle_scope.as_deref().unwrap_or("active") == "active" {
        query.push(" AND status='active'");
    }
    if input.lead_id.is_some() || input.project_id.is_some() {
        query.push(" AND (");
        if let Some(id) = input.lead_id.as_ref() {
            query.push("lead_id=").push_bind(id).push("::text::uuid");
        }
        if let Some(id) = input.project_id.as_ref() {
            if input.lead_id.is_some() {
                query.push(" OR ");
            }
            query.push("project_id=").push_bind(id).push("::text::uuid");
        }
        query.push(")");
    }
    query.push(" ORDER BY occurred_at DESC,created_at DESC");
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(record)
        .collect()
}

pub(super) async fn find_customer(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Customer>, sqlx::Error> {
    sqlx::query("SELECT id,display_name,status FROM poms.customer WHERE id=$1::text::uuid")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(customer)
        .transpose()
}
pub(super) async fn find_lead(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Lead>, sqlx::Error> {
    sqlx::query("SELECT id,customer_id,lead_name,owner_user_id,owner_org_id FROM poms.lead WHERE id=$1::text::uuid").bind(id).fetch_optional(connection).await?.map(lead).transpose()
}
pub(super) async fn find_project(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Project>, sqlx::Error> {
    sqlx::query("SELECT id,customer_id,project_name,owner_user_id,owner_org_id FROM poms.project WHERE id=$1::text::uuid").bind(id).fetch_optional(connection).await?.map(project).transpose()
}
pub(super) async fn find_user(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query("SELECT id,display_name,primary_org_unit_id FROM poms.platform_user WHERE id=$1::text::uuid").bind(id).fetch_optional(connection).await?.map(user).transpose()
}
pub(super) async fn find_org(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<Org>, sqlx::Error> {
    sqlx::query("SELECT id,name FROM poms.org_unit WHERE id=$1::text::uuid")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(org)
        .transpose()
}
pub(super) async fn dictionary_status(
    connection: &mut PgConnection,
    code: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT status FROM poms.dictionary_item WHERE domain='sales-follow-up-type' AND code=$1",
    )
    .bind(code)
    .fetch_optional(connection)
    .await
}

pub(super) async fn customers(
    connection: &mut PgConnection,
    ids: Vec<Uuid>,
) -> Result<HashMap<Uuid, Customer>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,display_name,status FROM poms.customer WHERE id=ANY($1)")
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| customer(row).map(|row| (row.id, row)))
        .collect()
}
pub(super) async fn leads(
    connection: &mut PgConnection,
    ids: Vec<Uuid>,
) -> Result<HashMap<Uuid, Lead>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,customer_id,lead_name,owner_user_id,owner_org_id FROM poms.lead WHERE id=ANY($1)").bind(ids).fetch_all(connection).await?.into_iter().map(|row| lead(row).map(|row| (row.id, row))).collect()
}
pub(super) async fn projects(
    connection: &mut PgConnection,
    ids: Vec<Uuid>,
) -> Result<HashMap<Uuid, Project>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,customer_id,project_name,owner_user_id,owner_org_id FROM poms.project WHERE id=ANY($1)").bind(ids).fetch_all(connection).await?.into_iter().map(|row| project(row).map(|row| (row.id, row))).collect()
}
pub(super) async fn users(
    connection: &mut PgConnection,
    ids: Vec<Uuid>,
) -> Result<HashMap<Uuid, User>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query(
        "SELECT id,display_name,primary_org_unit_id FROM poms.platform_user WHERE id=ANY($1)",
    )
    .bind(ids)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(|row| user(row).map(|row| (row.id, row)))
    .collect()
}
pub(super) async fn orgs(
    connection: &mut PgConnection,
    ids: Vec<Uuid>,
) -> Result<HashMap<Uuid, Org>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,name FROM poms.org_unit WHERE id=ANY($1)")
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| org(row).map(|row| (row.id, row)))
        .collect()
}

pub(super) async fn insert(
    connection: &mut PgConnection,
    row: &Record,
) -> Result<i32, sqlx::Error> {
    // Native writes Date.toISOString text here. Keep PostgreSQL's year0000
    // rejection at this INSERT, instead of SQLx binary dates accepting 1BC.
    sqlx::query_scalar("INSERT INTO poms.sales_follow_up_record (id,customer_id,lead_id,project_id,status,follow_up_type,occurred_at,summary,detail,outcome,next_follow_up_at,owner_org_id,owner_user_id,supersedes_record_id,replaced_by_record_id,replacement_reason,voided_at,voided_by,void_reason,created_at,created_by,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7::text::timestamptz,$8,$9,$10,$11::text::timestamptz,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING row_version")
        .bind(row.id).bind(row.customer_id).bind(row.lead_id).bind(row.project_id).bind(&row.status)
        .bind(&row.follow_up_type).bind(row.occurred_at.to_rfc3339_opts(SecondsFormat::Millis, true)).bind(&row.summary).bind(&row.detail).bind(&row.outcome)
        .bind(row.next_follow_up_at.map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true))).bind(row.owner_org_id).bind(row.owner_user_id)
        .bind(row.supersedes_record_id).bind(row.replaced_by_record_id).bind(&row.replacement_reason)
        .bind(row.voided_at).bind(row.voided_by).bind(&row.void_reason)
        .bind(row.created_at).bind(row.created_by).bind(row.updated_at).bind(row.updated_by)
        .fetch_one(connection).await
}

pub(super) async fn update(
    connection: &mut PgConnection,
    before: &Record,
    after: &Record,
) -> Result<Option<i32>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.sales_follow_up_record SET status=");
    query.push_bind(&after.status);
    if before.replaced_by_record_id != after.replaced_by_record_id {
        query
            .push(",replaced_by_record_id=")
            .push_bind(after.replaced_by_record_id);
    }
    if before.voided_at != after.voided_at {
        query.push(",voided_at=").push_bind(after.voided_at);
    }
    if before.voided_by != after.voided_by {
        query.push(",voided_by=").push_bind(after.voided_by);
    }
    if before.void_reason != after.void_reason {
        query.push(",void_reason=").push_bind(&after.void_reason);
    }
    if before.updated_by != after.updated_by {
        query.push(",updated_by=").push_bind(after.updated_by);
    }
    query
        .push(",updated_at=")
        .push_bind(after.updated_at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(before.id)
        .push(" AND row_version=")
        .push_bind(before.row_version)
        .push(" AND status='active'")
        .push(" RETURNING row_version");
    query
        .build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await
}

#[derive(Clone)]
pub(super) struct Todo {
    pub id: Uuid,
    pub source_type: String,
    pub source_id: Uuid,
    pub todo_type: String,
    pub business_domain: String,
    pub target_object_type: String,
    pub target_object_id: Uuid,
    pub project_id: Option<Uuid>,
    pub title: String,
    pub summary: Option<String>,
    pub assignee_user_id: Uuid,
    pub status: String,
    pub priority: String,
    pub due_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn todo(row: PgRow) -> Result<Todo, sqlx::Error> {
    Ok(Todo {
        id: row.try_get("id")?,
        source_type: row.try_get("source_type")?,
        source_id: row.try_get("source_id")?,
        todo_type: row.try_get("todo_type")?,
        business_domain: row.try_get("business_domain")?,
        target_object_type: row.try_get("target_object_type")?,
        target_object_id: row.try_get("target_object_id")?,
        project_id: row.try_get("project_id")?,
        title: row.try_get("title")?,
        summary: row.try_get("summary")?,
        assignee_user_id: row.try_get("assignee_user_id")?,
        status: row.try_get("status")?,
        priority: row.try_get("priority")?,
        due_at: row.try_get("due_at")?,
        completed_at: row.try_get("completed_at")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

pub(super) async fn source_todos(
    connection: &mut PgConnection,
    source_id: Uuid,
) -> Result<Vec<Todo>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.todo_item WHERE source_type='sales-follow-up-record' AND source_id=$1 AND todo_type='sales-follow-up-reminder' AND status IN ('open','processing')")
        .bind(source_id).fetch_all(connection).await?.into_iter().map(todo).collect()
}

pub(super) async fn stream_todos(
    connection: &mut PgConnection,
    owner: Uuid,
    target_type: &str,
    target_id: Uuid,
) -> Result<Vec<Todo>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.todo_item WHERE source_type='sales-follow-up-record' AND todo_type='sales-follow-up-reminder' AND assignee_user_id=$1 AND target_object_type=$2 AND target_object_id=$3 AND status IN ('open','processing')")
        .bind(owner).bind(target_type).bind(target_id).fetch_all(connection).await?.into_iter().map(todo).collect()
}

pub(super) async fn existing_todo(
    connection: &mut PgConnection,
    source_id: Uuid,
    owner: Uuid,
) -> Result<Option<Todo>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.todo_item WHERE source_type='sales-follow-up-record' AND source_id=$1 AND assignee_user_id=$2 AND status IN ('open','processing') LIMIT 1")
        .bind(source_id).bind(owner).fetch_optional(connection).await?.map(todo).transpose()
}

pub(super) async fn insert_todo(
    connection: &mut PgConnection,
    row: &Todo,
) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.todo_item (id,source_type,source_id,todo_type,business_domain,target_object_type,target_object_id,project_id,title,summary,assignee_user_id,status,priority,due_at,completed_at,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text::timestamptz,$15,$16,$17) RETURNING row_version")
        .bind(row.id).bind(&row.source_type).bind(row.source_id).bind(&row.todo_type).bind(&row.business_domain)
        .bind(&row.target_object_type).bind(row.target_object_id).bind(row.project_id).bind(&row.title)
        .bind(&row.summary).bind(row.assignee_user_id).bind(&row.status).bind(&row.priority)
        .bind(row.due_at.map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true))).bind(row.completed_at).bind(row.created_at).bind(row.updated_at)
        .fetch_one(connection).await
}

pub(super) async fn update_todo(
    connection: &mut PgConnection,
    before: &Todo,
    after: &mut Todo,
) -> Result<bool, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.todo_item SET ");
    let mut dirty = false;
    macro_rules! field {
        ($field:ident, $column:literal) => {
            if before.$field != after.$field {
                if dirty {
                    query.push(",");
                }
                dirty = true;
                query.push($column).push("=").push_bind(&after.$field);
            }
        };
    }
    field!(todo_type, "todo_type");
    field!(business_domain, "business_domain");
    field!(target_object_type, "target_object_type");
    field!(target_object_id, "target_object_id");
    field!(project_id, "project_id");
    field!(title, "title");
    field!(summary, "summary");
    field!(status, "status");
    field!(priority, "priority");
    if before.due_at != after.due_at {
        if dirty {
            query.push(",");
        }
        dirty = true;
        query
            .push("due_at=")
            .push_bind(
                after
                    .due_at
                    .map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true)),
            )
            .push("::text::timestamptz");
    }
    field!(completed_at, "completed_at");
    if !dirty {
        return Ok(true);
    }
    after.updated_at = crate::auth::model::clock_now();
    query
        .push(",updated_at=")
        .push_bind(after.updated_at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(before.id)
        .push(" AND row_version=")
        .push_bind(before.row_version)
        .push(" RETURNING row_version");
    let version = query
        .build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await?;
    if let Some(version) = version {
        after.row_version = version;
        Ok(true)
    } else {
        Ok(false)
    }
}
