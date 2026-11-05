//! SQL reads preserve the existing customer filters and multiple-domain projections.

use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use std::collections::HashMap;
use uuid::Uuid;

use super::model::CustomerListQuery;
use crate::{
    compat::scalars::js_iso_string,
    shared::generated::{LeadStatus, ProjectStatus, SalesFollowUpRecordStatus},
};

pub(crate) const CUSTOMER_COLUMNS: &str = "id,customer_no,display_name,legal_name,short_name,status,owner_org_id,owner_user_id,source_channel,remark,merged_into_customer_id,row_version,created_at,created_by,updated_at,updated_by";
pub(crate) const ALIAS_COLUMNS: &str =
    "id,customer_id,alias_name,alias_type,normalized_name,is_primary,created_at,created_by";

#[derive(Debug, Clone)]
pub struct CustomerRow {
    pub id: Uuid,
    pub customer_no: String,
    pub display_name: String,
    pub legal_name: Option<String>,
    pub short_name: Option<String>,
    pub status: String,
    pub owner_org_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub source_channel: Option<String>,
    pub remark: Option<String>,
    pub merged_into_customer_id: Option<Uuid>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}
pub(crate) fn customer(row: PgRow) -> Result<CustomerRow, sqlx::Error> {
    Ok(CustomerRow {
        id: row.try_get("id")?,
        customer_no: row.try_get("customer_no")?,
        display_name: row.try_get("display_name")?,
        legal_name: row.try_get("legal_name")?,
        short_name: row.try_get("short_name")?,
        status: row.try_get("status")?,
        owner_org_id: row.try_get("owner_org_id")?,
        owner_user_id: row.try_get("owner_user_id")?,
        source_channel: row.try_get("source_channel")?,
        remark: row.try_get("remark")?,
        merged_into_customer_id: row.try_get("merged_into_customer_id")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}
#[derive(Debug, Clone)]
pub struct AliasRow {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub alias_name: String,
    pub alias_type: String,
    pub normalized_name: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}
pub(crate) fn alias(row: PgRow) -> Result<AliasRow, sqlx::Error> {
    Ok(AliasRow {
        id: row.try_get("id")?,
        customer_id: row.try_get("customer_id")?,
        alias_name: row.try_get("alias_name")?,
        alias_type: row.try_get("alias_type")?,
        normalized_name: row.try_get("normalized_name")?,
        is_primary: row.try_get("is_primary")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
    })
}
#[derive(Debug, Clone)]
pub struct OwnerRow {
    pub id: Uuid,
    pub display_name: String,
    pub primary_org_unit_id: Option<Uuid>,
}
fn owner(row: PgRow) -> Result<OwnerRow, sqlx::Error> {
    Ok(OwnerRow {
        id: row.try_get("id")?,
        display_name: row.try_get("display_name")?,
        primary_org_unit_id: row.try_get("primary_org_unit_id")?,
    })
}

pub async fn find_customer(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<CustomerRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(CUSTOMER_COLUMNS)
        .push(" FROM poms.customer WHERE id=")
        .push_bind(id)
        .push("::text::uuid");
    query
        .build()
        .fetch_optional(connection)
        .await?
        .map(customer)
        .transpose()
}
pub async fn list_customers(
    connection: &mut PgConnection,
    query: &CustomerListQuery,
) -> Result<Vec<CustomerRow>, sqlx::Error> {
    let mut sql = QueryBuilder::<Postgres>::new(format!(
        "SELECT {CUSTOMER_COLUMNS} FROM poms.customer WHERE true"
    ));
    if let Some(status) = &query.status {
        sql.push(" AND status=").push_bind(status);
    }
    if let Some(org) = &query.owner_org_id {
        sql.push(" AND owner_org_id=")
            .push_bind(org)
            .push("::text::uuid");
    }
    if let Some(keyword) = &query.keyword {
        let pattern = format!("%{}%", keyword.to_utf8_lossy());
        sql.push(" AND (customer_no ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR display_name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR legal_name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR short_name ILIKE ")
            .push_bind(pattern)
            .push(")");
    }
    sql.push(" ORDER BY updated_at DESC,created_at DESC");
    sql.build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(customer)
        .collect()
}
pub async fn aliases(
    connection: &mut PgConnection,
    customer_id: Uuid,
) -> Result<Vec<AliasRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(ALIAS_COLUMNS)
        .push(" FROM poms.customer_alias WHERE customer_id=")
        .push_bind(customer_id)
        .push(" ORDER BY is_primary DESC,created_at ASC");
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(alias)
        .collect()
}
pub async fn find_alias(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<AliasRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("SELECT ");
    query
        .push(ALIAS_COLUMNS)
        .push(" FROM poms.customer_alias WHERE id=")
        .push_bind(id)
        .push("::text::uuid");
    query
        .build()
        .fetch_optional(connection)
        .await?
        .map(alias)
        .transpose()
}

pub struct NewCustomer {
    pub id: Uuid,
    pub customer_no: String,
    pub display_name: String,
    pub legal_name: Option<String>,
    pub short_name: Option<String>,
    pub owner_org_id: Option<String>,
    pub owner_user_id: Option<Uuid>,
    pub source_channel: Option<String>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub operator_id: Uuid,
}
/// This inserts the business entity only; number allocation and its connection
/// boundary are owned by the corrective-frozen caller, never inferred here.
pub async fn insert_customer(
    connection: &mut PgConnection,
    input: &NewCustomer,
) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.customer (id,customer_no,display_name,legal_name,short_name,status,owner_org_id,owner_user_id,source_channel,remark,merged_into_customer_id,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7::text::uuid,$8,$9,$10,NULL,$11,$12,$13,$12) RETURNING row_version")
        .bind(input.id).bind(&input.customer_no).bind(&input.display_name).bind(&input.legal_name).bind(&input.short_name)
        .bind(crate::shared::generated::CustomerStatus::Active.as_str()).bind(&input.owner_org_id).bind(input.owner_user_id)
        .bind(&input.source_channel).bind(&input.remark).bind(input.created_at).bind(input.operator_id).bind(input.updated_at)
        .fetch_one(connection).await
}

pub struct NewAlias {
    pub customer_id: Uuid,
    pub alias_name: String,
    pub alias_type: String,
    pub normalized_name: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}
pub async fn insert_alias(
    connection: &mut PgConnection,
    input: &NewAlias,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.customer_alias (customer_id,alias_name,alias_type,normalized_name,is_primary,created_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id")
        .bind(input.customer_id).bind(&input.alias_name).bind(&input.alias_type).bind(&input.normalized_name).bind(input.is_primary).bind(input.created_at).bind(input.created_by)
        .fetch_one(connection).await
}
/// Native's delete has neither an optimistic predicate nor an affected-row
/// check. A second transaction that already read the alias still succeeds.
pub async fn delete_alias(connection: &mut PgConnection, id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM poms.customer_alias WHERE id=$1")
        .bind(id)
        .execute(connection)
        .await?;
    Ok(())
}

#[derive(Default)]
pub struct CustomerChanges {
    pub display_name: Option<String>,
    pub legal_name: Option<Option<String>>,
    pub short_name: Option<Option<String>>,
    pub status: Option<String>,
    pub owner_org_id: Option<Option<String>>,
    pub owner_user_id: Option<Option<Uuid>>,
    pub source_channel: Option<Option<String>>,
    pub remark: Option<Option<String>>,
    pub updated_by: Option<Option<Uuid>>,
}
impl CustomerChanges {
    pub fn is_empty(&self) -> bool {
        self.display_name.is_none()
            && self.legal_name.is_none()
            && self.short_name.is_none()
            && self.status.is_none()
            && self.owner_org_id.is_none()
            && self.owner_user_id.is_none()
            && self.source_channel.is_none()
            && self.remark.is_none()
            && self.updated_by.is_none()
    }
}
pub async fn update_customer(
    connection: &mut PgConnection,
    id: Uuid,
    version: i32,
    input: &CustomerChanges,
    updated_at: DateTime<Utc>,
) -> Result<Option<i32>, sqlx::Error> {
    let mut sql = QueryBuilder::<Postgres>::new("UPDATE poms.customer SET updated_at=");
    sql.push_bind(updated_at).push(",row_version=row_version+1");
    if let Some(value) = &input.display_name {
        sql.push(",display_name=").push_bind(value);
    }
    if let Some(value) = &input.legal_name {
        sql.push(",legal_name=").push_bind(value);
    }
    if let Some(value) = &input.short_name {
        sql.push(",short_name=").push_bind(value);
    }
    if let Some(value) = &input.status {
        sql.push(",status=").push_bind(value);
    }
    if let Some(value) = &input.owner_org_id {
        sql.push(",owner_org_id=")
            .push_bind(value)
            .push("::text::uuid");
    }
    if let Some(value) = input.owner_user_id {
        sql.push(",owner_user_id=").push_bind(value);
    }
    if let Some(value) = &input.source_channel {
        sql.push(",source_channel=").push_bind(value);
    }
    if let Some(value) = &input.remark {
        sql.push(",remark=").push_bind(value);
    }
    if let Some(value) = input.updated_by {
        sql.push(",updated_by=").push_bind(value);
    }
    sql.push(" WHERE id=")
        .push_bind(id)
        .push(" AND row_version=")
        .push_bind(version)
        .push(" RETURNING row_version");
    sql.build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await
}
pub async fn find_owner(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<OwnerRow>, sqlx::Error> {
    sqlx::query("SELECT id,display_name,primary_org_unit_id FROM poms.platform_user WHERE id=$1::text::uuid")
        .bind(id).fetch_optional(connection).await?.map(owner).transpose()
}
pub async fn org_exists(connection: &mut PgConnection, id: &str) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.org_unit WHERE id=$1::text::uuid)")
        .bind(id)
        .fetch_one(connection)
        .await
}
pub async fn owner_names(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, String>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,display_name FROM poms.platform_user WHERE id=ANY($1)")
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| Ok((row.try_get("id")?, row.try_get("display_name")?)))
        .collect()
}
pub async fn org_names(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, String>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,name FROM poms.org_unit WHERE id=ANY($1)")
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| Ok((row.try_get("id")?, row.try_get("name")?)))
        .collect()
}
pub async fn lead_counts(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, i64>, sqlx::Error> {
    counts(connection,ids,"SELECT customer_id,count(*)::int AS count FROM poms.lead WHERE customer_id=ANY($1) GROUP BY customer_id").await
}
pub async fn project_counts(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, i64>, sqlx::Error> {
    counts(connection,ids,"SELECT customer_id,count(*)::int AS count FROM poms.project WHERE customer_id=ANY($1) GROUP BY customer_id").await
}
pub async fn contract_counts(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, i64>, sqlx::Error> {
    counts(connection,ids,"SELECT project.customer_id,count(contract.id)::int AS count FROM poms.contract contract INNER JOIN poms.project project ON project.id=contract.project_id WHERE project.customer_id=ANY($1) GROUP BY project.customer_id").await
}
async fn counts(
    connection: &mut PgConnection,
    ids: &[Uuid],
    sql: &'static str,
) -> Result<HashMap<Uuid, i64>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query(sql)
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| {
            Ok((
                row.try_get("customer_id")?,
                i64::from(row.try_get::<i32, _>("count")?),
            ))
        })
        .collect()
}

pub async fn workspace_summary(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Value, sqlx::Error> {
    let row=sqlx::query("SELECT \
        (SELECT count(*)::int FROM poms.lead WHERE customer_id=$1) AS lead_count,\
        (SELECT count(*)::int FROM poms.lead WHERE customer_id=$1 AND status IN ($2,$3)) AS active_lead_count,\
        (SELECT count(*)::int FROM poms.lead WHERE customer_id=$1 AND (status=$4 OR converted_project_id IS NOT NULL)) AS converted_lead_count,\
        (SELECT count(*)::int FROM poms.project WHERE customer_id=$1) AS project_count,\
        (SELECT count(*)::int FROM poms.project WHERE customer_id=$1 AND status IN ($5,$6,$7,$8)) AS active_project_count,\
        (SELECT count(contract.id)::int FROM poms.contract contract INNER JOIN poms.project project ON project.id=contract.project_id WHERE project.customer_id=$1) AS contract_count,\
        (SELECT count(*)::int FROM poms.sales_follow_up_record WHERE customer_id=$1 AND status=$9) AS recent_follow_up_count,\
        (SELECT count(comment.id)::int FROM poms.business_discussion_comment comment INNER JOIN poms.business_discussion_thread thread ON thread.id=comment.thread_id WHERE thread.customer_id=$1) AS recent_discussion_count,\
        (SELECT max(occurred_at) FROM poms.sales_follow_up_record WHERE customer_id=$1 AND status=$9) AS latest_follow_up_at,\
        (SELECT max(comment.created_at) FROM poms.business_discussion_comment comment INNER JOIN poms.business_discussion_thread thread ON thread.id=comment.thread_id WHERE thread.customer_id=$1) AS latest_discussion_at")
        .bind(id).bind(LeadStatus::Registered.as_str()).bind(LeadStatus::Qualified.as_str()).bind(LeadStatus::Converted.as_str())
        .bind(ProjectStatus::Active.as_str()).bind(ProjectStatus::PendingApproval.as_str()).bind(ProjectStatus::Blocked.as_str()).bind(ProjectStatus::OnHold.as_str()).bind(SalesFollowUpRecordStatus::Active.as_str())
        .fetch_one(connection).await?;
    Ok(json!({
        "leadCount":row.try_get::<i32,_>("lead_count")?,"activeLeadCount":row.try_get::<i32,_>("active_lead_count")?,"convertedLeadCount":row.try_get::<i32,_>("converted_lead_count")?,
        "projectCount":row.try_get::<i32,_>("project_count")?,"activeProjectCount":row.try_get::<i32,_>("active_project_count")?,"contractCount":row.try_get::<i32,_>("contract_count")?,
        "recentFollowUpCount":row.try_get::<i32,_>("recent_follow_up_count")?,"recentDiscussionCount":row.try_get::<i32,_>("recent_discussion_count")?,
        "latestFollowUpAt":optional_iso(&row,"latest_follow_up_at")?,"latestDiscussionAt":optional_iso(&row,"latest_discussion_at")?
    }))
}
pub async fn workspace_leads(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT lead.id,lead.lead_no,lead.lead_name,lead.status,lead.rating,lead.urgency,owner.display_name AS owner_name,lead.updated_at FROM poms.lead lead LEFT JOIN poms.platform_user owner ON owner.id=lead.owner_user_id WHERE lead.customer_id=$1 AND lead.status IN ($2,$3) ORDER BY lead.updated_at DESC,lead.created_at DESC LIMIT 5")
        .bind(id).bind(LeadStatus::Registered.as_str()).bind(LeadStatus::Qualified.as_str()).fetch_all(connection).await?.into_iter().map(|row|Ok(json!({"id":row.try_get::<Uuid,_>("id")?.to_string(),"leadNo":row.try_get::<String,_>("lead_no")?,"leadName":row.try_get::<String,_>("lead_name")?,"status":row.try_get::<String,_>("status")?,"rating":row.try_get::<String,_>("rating")?,"urgency":row.try_get::<String,_>("urgency")?,"ownerName":row.try_get::<Option<String>,_>("owner_name")?,"updatedAt":iso(&row,"updated_at")?}))).collect()
}
pub async fn workspace_projects(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT project.id,project.project_no,project.project_name,project.status,project.current_stage,owner.display_name AS owner_name,project.planned_sign_at,project.updated_at FROM poms.project project LEFT JOIN poms.platform_user owner ON owner.id=project.owner_user_id WHERE project.customer_id=$1 AND project.status IN ($2,$3,$4,$5) ORDER BY project.updated_at DESC,project.created_at DESC LIMIT 5")
        .bind(id).bind(ProjectStatus::Active.as_str()).bind(ProjectStatus::PendingApproval.as_str()).bind(ProjectStatus::Blocked.as_str()).bind(ProjectStatus::OnHold.as_str()).fetch_all(connection).await?.into_iter().map(|row|Ok(json!({"id":row.try_get::<Uuid,_>("id")?.to_string(),"projectNo":row.try_get::<String,_>("project_no")?,"projectName":row.try_get::<String,_>("project_name")?,"status":row.try_get::<String,_>("status")?,"currentStage":row.try_get::<String,_>("current_stage")?,"ownerName":row.try_get::<Option<String>,_>("owner_name")?,"plannedSignAt":optional_iso(&row,"planned_sign_at")?,"updatedAt":iso(&row,"updated_at")?}))).collect()
}
pub async fn workspace_contracts(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT contract.id,contract.contract_no,contract.customer_contract_no,contract.status,contract.project_id,project.project_name,contract.signed_at,contract.updated_at FROM poms.contract contract INNER JOIN poms.project project ON project.id=contract.project_id WHERE project.customer_id=$1 ORDER BY contract.updated_at DESC,contract.created_at DESC LIMIT 5")
        .bind(id).fetch_all(connection).await?.into_iter().map(|row|Ok(json!({"id":row.try_get::<Uuid,_>("id")?.to_string(),"contractNo":row.try_get::<String,_>("contract_no")?,"customerContractNo":row.try_get::<Option<String>,_>("customer_contract_no")?,"status":row.try_get::<String,_>("status")?,"projectId":row.try_get::<Uuid,_>("project_id")?.to_string(),"projectName":row.try_get::<String,_>("project_name")?,"signedAt":optional_iso(&row,"signed_at")?,"updatedAt":iso(&row,"updated_at")?}))).collect()
}
pub async fn workspace_follow_ups(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT follow_up.id,follow_up.summary,follow_up.outcome,follow_up.occurred_at,follow_up.next_follow_up_at,owner.display_name AS owner_name FROM poms.sales_follow_up_record follow_up LEFT JOIN poms.platform_user owner ON owner.id=follow_up.owner_user_id WHERE follow_up.customer_id=$1 AND follow_up.status=$2 ORDER BY follow_up.occurred_at DESC,follow_up.created_at DESC LIMIT 5")
        .bind(id).bind(SalesFollowUpRecordStatus::Active.as_str()).fetch_all(connection).await?.into_iter().map(|row|Ok(json!({"id":row.try_get::<Uuid,_>("id")?.to_string(),"summary":row.try_get::<String,_>("summary")?,"outcome":row.try_get::<String,_>("outcome")?,"occurredAt":iso(&row,"occurred_at")?,"nextFollowUpAt":optional_iso(&row,"next_follow_up_at")?,"ownerName":row.try_get::<Option<String>,_>("owner_name")?}))).collect()
}
pub async fn workspace_discussions(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT comment.id,comment.thread_id,thread.target_object_type,thread.target_object_id,thread.target_title,comment.discussion_type,comment.body,comment.is_key_conclusion,comment.created_at FROM poms.business_discussion_comment comment INNER JOIN poms.business_discussion_thread thread ON thread.id=comment.thread_id WHERE thread.customer_id=$1 ORDER BY comment.created_at DESC LIMIT 5")
        .bind(id).fetch_all(connection).await?.into_iter().map(|row|Ok(json!({"id":row.try_get::<Uuid,_>("id")?.to_string(),"threadId":row.try_get::<Uuid,_>("thread_id")?.to_string(),"targetObjectType":row.try_get::<String,_>("target_object_type")?,"targetObjectId":row.try_get::<Uuid,_>("target_object_id")?.to_string(),"targetTitle":row.try_get::<String,_>("target_title")?,"discussionType":row.try_get::<String,_>("discussion_type")?,"body":row.try_get::<String,_>("body")?,"isKeyConclusion":row.try_get::<bool,_>("is_key_conclusion")?,"createdAt":iso(&row,"created_at")?}))).collect()
}
fn iso(row: &PgRow, key: &str) -> Result<String, sqlx::Error> {
    js_iso_string(row.try_get::<DateTime<Utc>, _>(key)?)
        .map_err(|_| sqlx::Error::Protocol("invalid customer projection date".to_owned()))
}
fn optional_iso(row: &PgRow, key: &str) -> Result<Option<String>, sqlx::Error> {
    row.try_get::<Option<DateTime<Utc>>, _>(key)?
        .map(|date| {
            js_iso_string(date)
                .map_err(|_| sqlx::Error::Protocol("invalid customer projection date".to_owned()))
        })
        .transpose()
}
