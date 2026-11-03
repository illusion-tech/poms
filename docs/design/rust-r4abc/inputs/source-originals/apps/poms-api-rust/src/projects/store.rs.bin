//! Project-only SQL primitives. Original migrations own all columns and DDL.
//! Read queries preserve the source predicates and its PostgreSQL NULL ordering.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::ProjectListQuery;

#[derive(Clone, Debug)]
pub struct ProjectRow {
    pub id: Uuid,
    pub project_no: String,
    pub project_name: String,
    pub source_lead_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub customer_project_no: Option<String>,
    pub status: String,
    pub current_stage: String,
    pub owner_org_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub planned_sign_at: Option<DateTime<Utc>>,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_reason: Option<String>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

macro_rules! project_select {
    () => {
        "SELECT id,project_no,project_name,source_lead_id,customer_id,customer_name,customer_project_no,\
         status,current_stage,owner_org_id,owner_user_id,planned_sign_at,closed_at,closed_reason,\
         row_version,created_at,created_by,updated_at,updated_by FROM poms.project "
    };
}

fn project(row: PgRow) -> Result<ProjectRow, sqlx::Error> {
    Ok(ProjectRow {
        id: row.try_get("id")?,
        project_no: row.try_get("project_no")?,
        project_name: row.try_get("project_name")?,
        source_lead_id: row.try_get("source_lead_id")?,
        customer_id: row.try_get("customer_id")?,
        customer_name: row.try_get("customer_name")?,
        customer_project_no: row.try_get("customer_project_no")?,
        status: row.try_get("status")?,
        current_stage: row.try_get("current_stage")?,
        owner_org_id: row.try_get("owner_org_id")?,
        owner_user_id: row.try_get("owner_user_id")?,
        planned_sign_at: row.try_get("planned_sign_at")?,
        closed_at: row.try_get("closed_at")?,
        closed_reason: row.try_get("closed_reason")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}

pub async fn find(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<ProjectRow>, sqlx::Error> {
    sqlx::query(concat!(
        project_select!(),
        "WHERE id=$1::text::uuid LIMIT 1"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(project)
    .transpose()
}

pub async fn find_by_no(
    connection: &mut PgConnection,
    project_no: &str,
) -> Result<Option<ProjectRow>, sqlx::Error> {
    sqlx::query(concat!(project_select!(), "WHERE project_no=$1 LIMIT 1"))
        .bind(project_no)
        .fetch_optional(connection)
        .await?
        .map(project)
        .transpose()
}

pub async fn list(
    connection: &mut PgConnection,
    input: &ProjectListQuery,
) -> Result<Vec<ProjectRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(concat!(project_select!(), "WHERE TRUE"));
    if let Some(value) = input.status {
        query.push(" AND status=").push_bind(value.as_str());
    }
    if let Some(value) = input.current_stage {
        query.push(" AND current_stage=").push_bind(value.as_str());
    }
    if let Some(value) = input.owner_org_id.as_ref() {
        query
            .push(" AND owner_org_id=")
            .push_bind(value.clone())
            .push("::text::uuid");
    }
    if let Some(value) = input.keyword.as_ref() {
        let pattern = format!("%{}%", value.to_utf8_lossy());
        query
            .push(" AND (project_no ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR project_name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR customer_name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR customer_project_no ILIKE ")
            .push_bind(pattern)
            .push(")");
    }
    query.push(" ORDER BY created_at DESC");
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(project)
        .collect()
}

pub async fn user_names(
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

pub async fn latest_signed_at(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, DateTime<Utc>>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query("SELECT project_id,signed_at FROM poms.contract WHERE project_id=ANY($1) AND signed_at IS NOT NULL ORDER BY signed_at DESC,updated_at DESC")
        .bind(ids).fetch_all(connection).await?;
    let mut result = HashMap::new();
    for row in rows {
        result
            .entry(row.try_get("project_id")?)
            .or_insert(row.try_get("signed_at")?);
    }
    Ok(result)
}

#[derive(Clone)]
pub struct ContractRow {
    pub id: Uuid,
    pub contract_no: String,
    pub status: String,
    pub signed_amount: String,
    pub currency_code: String,
    pub signed_at: Option<DateTime<Utc>>,
    pub current_snapshot_id: Option<Uuid>,
}

pub async fn contracts(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<ContractRow>, sqlx::Error> {
    sqlx::query("SELECT id,contract_no,status,signed_amount::text AS signed_amount,currency_code,signed_at,current_snapshot_id FROM poms.contract WHERE project_id=$1 ORDER BY signed_at DESC,updated_at DESC,created_at DESC")
        .bind(id).fetch_all(connection).await?.into_iter().map(|row| Ok(ContractRow {
            id: row.try_get("id")?, contract_no: row.try_get("contract_no")?, status: row.try_get("status")?,
            signed_amount: row.try_get("signed_amount")?, currency_code: row.try_get("currency_code")?,
            signed_at: row.try_get("signed_at")?, current_snapshot_id: row.try_get("current_snapshot_id")?,
        })).collect()
}

pub struct ApprovalSnapshotRow {
    pub id: Uuid,
    pub summary_package_key: String,
    pub projection_level: String,
    pub export_policy: String,
    pub generated_at: DateTime<Utc>,
}

pub async fn approval_snapshot(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<ApprovalSnapshotRow>, sqlx::Error> {
    sqlx::query("SELECT id,summary_package_key,projection_level,export_policy,generated_at FROM poms.approval_summary_snapshot WHERE target_type='project' AND target_id=$1 AND approval_scenario_key='project-detail' AND projection_level='project-detail' AND status='active' ORDER BY generated_at DESC,created_at DESC LIMIT 1")
        .bind(id).fetch_optional(connection).await?.map(|row| Ok(ApprovalSnapshotRow {
            id: row.try_get("id")?, summary_package_key: row.try_get("summary_package_key")?,
            projection_level: row.try_get("projection_level")?, export_policy: row.try_get("export_policy")?, generated_at: row.try_get("generated_at")?,
        })).transpose()
}

pub struct BidRow {
    pub id: Uuid,
    pub current_stage: String,
    pub result_status: String,
    pub tender_no: Option<String>,
    pub bid_package_no: Option<String>,
    pub process_summary: String,
}

pub async fn current_bid(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<BidRow>, sqlx::Error> {
    sqlx::query("SELECT id,current_stage,result_status,tender_no,bid_package_no,process_summary FROM poms.project_bid_commercial_process WHERE project_id=$1 AND is_current=true AND status='effective' ORDER BY version DESC,effective_at DESC,created_at DESC LIMIT 1")
        .bind(id).fetch_optional(connection).await?.map(|row| Ok(BidRow {
            id: row.try_get("id")?, current_stage: row.try_get("current_stage")?, result_status: row.try_get("result_status")?,
            tender_no: row.try_get("tender_no")?, bid_package_no: row.try_get("bid_package_no")?, process_summary: row.try_get("process_summary")?,
        })).transpose()
}

pub struct LeadRow {
    pub id: Uuid,
    pub lead_no: String,
    pub lead_name: String,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub status: String,
}

pub async fn lead(
    connection: &mut PgConnection,
    id: Option<Uuid>,
) -> Result<Option<LeadRow>, sqlx::Error> {
    let Some(id) = id else {
        return Ok(None);
    };
    sqlx::query(
        "SELECT id,lead_no,lead_name,customer_id,customer_name,status FROM poms.lead WHERE id=$1",
    )
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(|row| {
        Ok(LeadRow {
            id: row.try_get("id")?,
            lead_no: row.try_get("lead_no")?,
            lead_name: row.try_get("lead_name")?,
            customer_id: row.try_get("customer_id")?,
            customer_name: row.try_get("customer_name")?,
            status: row.try_get("status")?,
        })
    })
    .transpose()
}

pub struct NewProject {
    pub project_no: String,
    pub project_name: String,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub customer_project_no: Option<String>,
    pub current_stage: String,
    pub owner_org_id: Option<Uuid>,
    pub owner_user_id: Uuid,
    pub planned_sign_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn insert(
    connection: &mut PgConnection,
    input: &NewProject,
) -> Result<ProjectRow, sqlx::Error> {
    let row = sqlx::query("INSERT INTO poms.project (project_no,project_name,source_lead_id,customer_id,customer_name,customer_project_no,status,current_stage,owner_org_id,owner_user_id,planned_sign_at,closed_at,closed_reason,created_at,created_by,updated_at,updated_by) VALUES ($1,$2,NULL,$3,$4,$5,'active',$6,$7,$8,$9,NULL,NULL,$10,$8,$11,$8) RETURNING *")
        .bind(&input.project_no).bind(&input.project_name).bind(input.customer_id).bind(&input.customer_name)
        .bind(&input.customer_project_no).bind(&input.current_stage).bind(input.owner_org_id).bind(input.owner_user_id)
        .bind(input.planned_sign_at).bind(input.created_at).bind(input.updated_at).fetch_one(connection).await?;
    project(row)
}

#[derive(Clone, Default)]
pub struct ProjectUpdate {
    pub project_name: Option<String>,
    pub customer_id: Option<Option<Uuid>>,
    pub customer_name: Option<Option<String>>,
    pub customer_project_no: Option<Option<String>>,
    pub owner_user_id: Option<Option<Uuid>>,
    pub owner_org_id: Option<Option<Uuid>>,
    pub planned_sign_at: Option<Option<DateTime<Utc>>>,
    pub updated_by: Option<Option<Uuid>>,
}

impl ProjectUpdate {
    pub fn is_dirty(&self) -> bool {
        self.project_name.is_some()
            || self.customer_id.is_some()
            || self.customer_name.is_some()
            || self.customer_project_no.is_some()
            || self.owner_user_id.is_some()
            || self.owner_org_id.is_some()
            || self.planned_sign_at.is_some()
            || self.updated_by.is_some()
    }
}

fn assignment(query: &mut QueryBuilder<Postgres>, first: &mut bool, column: &str) {
    if !*first {
        query.push(",");
    }
    *first = false;
    query.push(column).push("=");
}

/// A primitive only: the service decides which source-managed fields are dirty
/// and maps a missing CAS result using Root's original Native witness.
pub async fn update(
    connection: &mut PgConnection,
    id: Uuid,
    expected_version: i32,
    changes: &ProjectUpdate,
    at: DateTime<Utc>,
) -> Result<Option<i32>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.project SET ");
    let mut first = true;
    if let Some(value) = &changes.project_name {
        assignment(&mut query, &mut first, "project_name");
        query.push_bind(value.clone());
    }
    if let Some(value) = changes.customer_id {
        assignment(&mut query, &mut first, "customer_id");
        query.push_bind(value);
    }
    if let Some(value) = &changes.customer_name {
        assignment(&mut query, &mut first, "customer_name");
        query.push_bind(value.clone());
    }
    if let Some(value) = &changes.customer_project_no {
        assignment(&mut query, &mut first, "customer_project_no");
        query.push_bind(value.clone());
    }
    if let Some(value) = changes.owner_user_id {
        assignment(&mut query, &mut first, "owner_user_id");
        query.push_bind(value);
    }
    if let Some(value) = changes.owner_org_id {
        assignment(&mut query, &mut first, "owner_org_id");
        query.push_bind(value);
    }
    if let Some(value) = changes.planned_sign_at {
        assignment(&mut query, &mut first, "planned_sign_at");
        query.push_bind(value);
    }
    if let Some(value) = changes.updated_by {
        assignment(&mut query, &mut first, "updated_by");
        query.push_bind(value);
    }
    assignment(&mut query, &mut first, "updated_at");
    query
        .push_bind(at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(id)
        .push(" AND row_version=")
        .push_bind(expected_version)
        .push(" RETURNING row_version");
    query.build_query_scalar().fetch_optional(connection).await
}

pub struct OwnerReassignmentRecord {
    pub id: Uuid,
    pub project_id: Uuid,
    pub previous_owner_org_id: Option<Uuid>,
    pub previous_owner_user_id: Option<Uuid>,
    pub new_owner_org_id: Option<Uuid>,
    pub new_owner_user_id: Uuid,
    pub reason: String,
    pub at: DateTime<Utc>,
    pub operator_id: Uuid,
}

pub async fn insert_reassignment(
    connection: &mut PgConnection,
    input: &OwnerReassignmentRecord,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.project_owner_reassignment_record (id,project_id,previous_owner_org_id,previous_owner_user_id,new_owner_org_id,new_owner_user_id,reason,reassigned_at,reassigned_by,created_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$8,$9)")
        .bind(input.id).bind(input.project_id).bind(input.previous_owner_org_id).bind(input.previous_owner_user_id)
        .bind(input.new_owner_org_id).bind(input.new_owner_user_id).bind(&input.reason).bind(input.at).bind(input.operator_id)
        .execute(connection).await?;
    Ok(())
}
