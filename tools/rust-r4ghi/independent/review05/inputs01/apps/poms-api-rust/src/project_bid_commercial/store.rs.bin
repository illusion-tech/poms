//! Existing bid/commercial tables. The service owns project-level serialization
//! and atomic replacement; supersession still checks version and current state.

use chrono::{DateTime, Datelike, SecondsFormat, Timelike, Utc};
use serde_json::{Value, json};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row as SqlxRow, postgres::PgRow};
use uuid::Uuid;

use super::model::{CreateRequest, MaterialInput, TimelineInput};
use crate::auth::js_json::JsString;

#[derive(Clone, Debug)]
pub struct Row {
    pub id: Uuid,
    pub project_id: Uuid,
    pub version: i32,
    pub is_current: bool,
    pub supersedes_id: Option<Uuid>,
    pub status: String,
    pub bid_mode: String,
    pub current_stage: String,
    pub decision: String,
    pub result_status: String,
    pub process_summary: String,
    pub decision_summary: Option<String>,
    pub result_summary: Option<String>,
    pub tender_no: Option<String>,
    pub bid_package_no: Option<String>,
    pub owner_role: Option<String>,
    pub blocker_count: i32,
    pub effective_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
    pub row_version: i32,
}

#[derive(Clone)]
pub struct MaterialRow {
    pub id: Uuid,
    pub process_id: Uuid,
    pub material_key: String,
    pub label: String,
    pub material_status: String,
    pub responsible_role: Option<String>,
    pub due_at: Option<DateTime<Utc>>,
    pub blocks_next_step: bool,
    pub navigation_hint: Option<String>,
    pub sort_order: i32,
}

#[derive(Clone)]
pub struct TimelineRow {
    pub id: Uuid,
    pub process_id: Uuid,
    pub event_key: String,
    pub label: String,
    pub summary: Option<String>,
    pub timeline_status: String,
    pub occurred_at: Option<DateTime<Utc>>,
    pub due_at: Option<DateTime<Utc>>,
    pub responsible_role: Option<String>,
    pub sort_order: i32,
}

macro_rules! columns {
    () => {
        "id,project_id,version,is_current,supersedes_id,status,bid_mode,current_stage,\
         decision,result_status,process_summary,decision_summary,result_summary,\
         tender_no,bid_package_no,owner_role,blocker_count,effective_at,created_at,\
         created_by,updated_at,updated_by,row_version"
    };
}

fn row(value: PgRow) -> Result<Row, sqlx::Error> {
    Ok(Row {
        id: value.try_get("id")?,
        project_id: value.try_get("project_id")?,
        version: value.try_get("version")?,
        is_current: value.try_get("is_current")?,
        supersedes_id: value.try_get("supersedes_id")?,
        status: value.try_get("status")?,
        bid_mode: value.try_get("bid_mode")?,
        current_stage: value.try_get("current_stage")?,
        decision: value.try_get("decision")?,
        result_status: value.try_get("result_status")?,
        process_summary: value.try_get("process_summary")?,
        decision_summary: value.try_get("decision_summary")?,
        result_summary: value.try_get("result_summary")?,
        tender_no: value.try_get("tender_no")?,
        bid_package_no: value.try_get("bid_package_no")?,
        owner_role: value.try_get("owner_role")?,
        blocker_count: value.try_get("blocker_count")?,
        effective_at: value.try_get("effective_at")?,
        created_at: value.try_get("created_at")?,
        created_by: value.try_get("created_by")?,
        updated_at: value.try_get("updated_at")?,
        updated_by: value.try_get("updated_by")?,
        row_version: value.try_get("row_version")?,
    })
}

pub async fn list(
    connection: &mut PgConnection,
    project_id: &str,
) -> Result<Vec<Row>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        columns!(),
        " FROM poms.project_bid_commercial_process ",
        "WHERE project_id=$1::text::uuid ORDER BY version DESC,effective_at DESC,created_at DESC"
    ))
    .bind(project_id)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(row)
    .collect()
}

pub async fn current(
    connection: &mut PgConnection,
    project_id: &str,
) -> Result<Option<Row>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        columns!(),
        " FROM poms.project_bid_commercial_process ",
        "WHERE project_id=$1::text::uuid AND is_current=true AND status='effective' ",
        "ORDER BY version DESC,effective_at DESC,created_at DESC LIMIT 1"
    ))
    .bind(project_id)
    .fetch_optional(connection)
    .await?
    .map(row)
    .transpose()
}

pub(crate) async fn next_version(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar("SELECT COALESCE(MAX(version)::bigint,0)+1 FROM poms.project_bid_commercial_process WHERE project_id=$1")
        .bind(project_id).fetch_one(connection).await
}

pub async fn by_id(connection: &mut PgConnection, id: Uuid) -> Result<Option<Row>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        columns!(),
        " FROM poms.project_bid_commercial_process WHERE id=$1 LIMIT 1"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(row)
    .transpose()
}

pub async fn materials(
    connection: &mut PgConnection,
    process_id: Uuid,
) -> Result<Vec<MaterialRow>, sqlx::Error> {
    sqlx::query("SELECT id,process_id,material_key,label,material_status,responsible_role,due_at,blocks_next_step,navigation_hint,sort_order FROM poms.project_bid_commercial_material_item WHERE process_id=$1 ORDER BY process_id ASC,sort_order ASC")
        .bind(process_id)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|value| Ok(MaterialRow {
            id: value.try_get("id")?,
            process_id: value.try_get("process_id")?,
            material_key: value.try_get("material_key")?,
            label: value.try_get("label")?,
            material_status: value.try_get("material_status")?,
            responsible_role: value.try_get("responsible_role")?,
            due_at: value.try_get("due_at")?,
            blocks_next_step: value.try_get("blocks_next_step")?,
            navigation_hint: value.try_get("navigation_hint")?,
            sort_order: value.try_get("sort_order")?,
        }))
        .collect()
}

pub async fn timelines(
    connection: &mut PgConnection,
    process_id: Uuid,
) -> Result<Vec<TimelineRow>, sqlx::Error> {
    sqlx::query("SELECT id,process_id,event_key,label,summary,timeline_status,occurred_at,due_at,responsible_role,sort_order FROM poms.project_bid_commercial_timeline_item WHERE process_id=$1 ORDER BY process_id ASC,sort_order ASC")
        .bind(process_id)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|value| Ok(TimelineRow {
            id: value.try_get("id")?,
            process_id: value.try_get("process_id")?,
            event_key: value.try_get("event_key")?,
            label: value.try_get("label")?,
            summary: value.try_get("summary")?,
            timeline_status: value.try_get("timeline_status")?,
            occurred_at: value.try_get("occurred_at")?,
            due_at: value.try_get("due_at")?,
            responsible_role: value.try_get("responsible_role")?,
            sort_order: value.try_get("sort_order")?,
        }))
        .collect()
}

// Same JS ISO projection as compat::scalars, for a valid decoded DB instant.
// Direct formatting cannot fail on a chrono DateTime and keeps summary -> Value.
pub(crate) fn iso(value: DateTime<Utc>) -> String {
    let year = value.year();
    let year = if (0..=9999).contains(&year) {
        format!("{year:04}")
    } else {
        format!("{year:+07}")
    };
    format!(
        "{year}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        value.month(),
        value.day(),
        value.hour(),
        value.minute(),
        value.second(),
        value.timestamp_subsec_millis()
    )
}

pub fn summary(value: &Row) -> Value {
    json!({
        "id":value.id,"projectId":value.project_id,"version":value.version,
        "isCurrent":value.is_current,"supersedesId":value.supersedes_id,"status":value.status,
        "bidMode":value.bid_mode,"currentStage":value.current_stage,"decision":value.decision,
        "resultStatus":value.result_status,"processSummary":value.process_summary,
        "decisionSummary":value.decision_summary,"resultSummary":value.result_summary,
        "tenderNo":value.tender_no,"bidPackageNo":value.bid_package_no,"ownerRole":value.owner_role,
        "blockerCount":value.blocker_count,"effectiveAt":iso(value.effective_at),
        "createdAt":iso(value.created_at),"createdBy":value.created_by,
        "updatedAt":iso(value.updated_at),"updatedBy":value.updated_by,"rowVersion":value.row_version
    })
}

pub fn material_summary(value: &MaterialRow) -> Value {
    json!({
        "id":value.id,"processId":value.process_id,"materialKey":value.material_key,
        "label":value.label,"materialStatus":value.material_status,
        "responsibleRole":value.responsible_role,"dueAt":value.due_at.map(iso),
        "blocksNextStep":value.blocks_next_step,"navigationHint":value.navigation_hint,
        "sortOrder":value.sort_order
    })
}

pub fn timeline_summary(value: &TimelineRow) -> Value {
    json!({
        "id":value.id,"processId":value.process_id,"eventKey":value.event_key,
        "label":value.label,"summary":value.summary,"timelineStatus":value.timeline_status,
        "occurredAt":value.occurred_at.map(iso),"dueAt":value.due_at.map(iso),
        "responsibleRole":value.responsible_role,"sortOrder":value.sort_order
    })
}

pub(crate) struct NewProcess<'a> {
    pub id: Uuid,
    pub project_id: Uuid,
    pub version: i64,
    pub supersedes_id: Option<Uuid>,
    pub input: &'a CreateRequest,
    pub blocker_count: i64,
    pub effective_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub operator: Uuid,
}

pub(crate) async fn insert_parent(
    connection: &mut PgConnection,
    value: &NewProcess<'_>,
) -> Result<Row, sqlx::Error> {
    sqlx::query(concat!(
        "INSERT INTO poms.project_bid_commercial_process ",
        "(id,project_id,version,is_current,supersedes_id,status,bid_mode,current_stage,",
        "decision,result_status,process_summary,decision_summary,result_summary,tender_no,",
        "bid_package_no,owner_role,blocker_count,effective_at,created_at,created_by,updated_at,updated_by,row_version) ",
        "VALUES ($1,$2,$3,true,$4,'effective',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$18,1) ",
        "RETURNING ", columns!()
    ))
    .bind(value.id)
    .bind(value.project_id)
    .bind(value.version)
    .bind(value.supersedes_id)
    .bind(&value.input.bid_mode)
    .bind(&value.input.current_stage)
    .bind(&value.input.decision)
    .bind(&value.input.result_status)
    .bind(value.input.process_summary.to_utf8_lossy())
    .bind(value.input.decision_summary.as_ref().map(JsString::to_utf8_lossy))
    .bind(value.input.result_summary.as_ref().map(JsString::to_utf8_lossy))
    .bind(value.input.tender_no.as_ref().map(JsString::to_utf8_lossy))
    .bind(value.input.bid_package_no.as_ref().map(JsString::to_utf8_lossy))
    .bind(value.input.owner_role.as_ref().map(JsString::to_utf8_lossy))
    .bind(value.blocker_count)
    .bind(value.effective_at)
    .bind(value.created_at)
    .bind(value.operator)
    .bind(value.updated_at)
    .fetch_one(connection)
    .await
    .and_then(row)
}

pub(crate) async fn insert_timelines(
    connection: &mut PgConnection,
    process_id: Uuid,
    items: &[TimelineInput],
) -> Result<(), sqlx::Error> {
    if items.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Postgres>::new(
        "INSERT INTO poms.project_bid_commercial_timeline_item (process_id,event_key,label,summary,timeline_status,occurred_at,due_at,responsible_role,sort_order) ",
    );
    query.push_values(items.iter().enumerate(), |mut row, (index, item)| {
        row.push_bind(process_id)
            .push_bind(item.event_key.to_utf8_lossy())
            .push_bind(item.label.to_utf8_lossy())
            .push_bind(item.summary.as_ref().map(JsString::to_utf8_lossy))
            .push_bind(&item.timeline_status)
            // Native sends request Dates as millisecond ISO text. Keep PG's
            // year-zero rejection inside this child INSERT, not the DTO.
            .push_bind(
                item.occurred_at
                    .map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true)),
            )
            .push_unseparated("::timestamptz")
            .push_bind(
                item.due_at
                    .map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true)),
            )
            .push_unseparated("::timestamptz")
            .push_bind(item.responsible_role.as_ref().map(JsString::to_utf8_lossy))
            .push_bind(item.sort_order.unwrap_or(index as i64 + 1));
    });
    query.build().execute(connection).await?;
    Ok(())
}

pub(crate) async fn insert_materials(
    connection: &mut PgConnection,
    process_id: Uuid,
    items: &[MaterialInput],
) -> Result<(), sqlx::Error> {
    if items.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Postgres>::new(
        "INSERT INTO poms.project_bid_commercial_material_item (process_id,material_key,label,material_status,responsible_role,due_at,blocks_next_step,navigation_hint,sort_order) ",
    );
    query.push_values(items.iter().enumerate(), |mut row, (index, item)| {
        row.push_bind(process_id)
            .push_bind(item.material_key.to_utf8_lossy())
            .push_bind(item.label.to_utf8_lossy())
            .push_bind(&item.material_status)
            .push_bind(item.responsible_role.as_ref().map(JsString::to_utf8_lossy))
            .push_bind(
                item.due_at
                    .map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true)),
            )
            .push_unseparated("::timestamptz")
            .push_bind(item.blocks_next_step)
            .push_bind(item.navigation_hint.as_ref().map(JsString::to_utf8_lossy))
            .push_bind(item.sort_order.unwrap_or(index as i64 + 1));
    });
    query.build().execute(connection).await?;
    Ok(())
}

pub(crate) async fn supersede(
    connection: &mut PgConnection,
    previous: &Row,
    operator: Uuid,
    updated_at: DateTime<Utc>,
) -> Result<bool, sqlx::Error> {
    let changed = sqlx::query("UPDATE poms.project_bid_commercial_process SET is_current=false,status='superseded',updated_by=$1,updated_at=$2,row_version=row_version+1 WHERE id=$3 AND row_version=$4 AND is_current=true AND status='effective' RETURNING id")
        .bind(operator)
        .bind(updated_at)
        .bind(previous.id)
        .bind(previous.row_version)
        .fetch_optional(connection)
        .await?;
    Ok(changed.is_some())
}
