//! Read-only projections over the original project lifecycle tables. Predicates
//! and ordering follow the Native repositories without extra eligibility rules.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Row};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub(crate) struct Snapshot {
    pub id: Uuid,
    pub projection_level: String,
    pub export_policy: String,
    pub generated_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub(crate) struct Contract {
    pub id: Uuid,
    pub contract_no: String,
    pub signed_at: Option<DateTime<Utc>>,
    pub updated_by: Option<Uuid>,
    pub created_by: Option<Uuid>,
}

#[derive(Clone, Debug)]
pub(crate) struct Handover {
    pub id: Uuid,
    pub confirmed_at: DateTime<Utc>,
    pub confirmed_by: Option<Uuid>,
}

#[derive(Clone, Debug)]
pub(crate) struct Acceptance {
    pub id: Uuid,
    pub acceptance_type: String,
    pub acceptance_result: String,
    pub confirmed_at: DateTime<Utc>,
    pub confirmed_by: Option<Uuid>,
    pub evidence_summary: String,
}

#[derive(Clone, Debug)]
pub(crate) struct Completion {
    pub id: Uuid,
    pub completion_result: String,
    pub completed_at: DateTime<Utc>,
    pub completed_by: Option<Uuid>,
    pub evidence_summary: String,
}

#[derive(Clone, Debug)]
pub(crate) struct Archive {
    pub id: Uuid,
    pub archive_anchor_stage: String,
    pub archived_at: DateTime<Utc>,
    pub archived_by: Option<Uuid>,
    pub archive_summary: String,
    pub evidence_summary: String,
}

pub(crate) async fn user_names(
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

pub(crate) async fn org_names(
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

pub(crate) async fn snapshot(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Snapshot>, sqlx::Error> {
    sqlx::query("SELECT id,projection_level,export_policy,generated_at FROM poms.approval_summary_snapshot WHERE target_type='project' AND target_id=$1 AND approval_scenario_key='project-detail' AND projection_level='project-detail' AND status='active' ORDER BY generated_at DESC,created_at DESC LIMIT 1")
        .bind(project_id).fetch_optional(connection).await?.map(|row| Ok(Snapshot {
            id:row.try_get("id")?, projection_level:row.try_get("projection_level")?,
            export_policy:row.try_get("export_policy")?, generated_at:row.try_get("generated_at")?,
        })).transpose()
}

pub(crate) async fn contracts(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Vec<Contract>, sqlx::Error> {
    // All states are inputs. The query service selects the first signed
    // contract after a stable JS Date-millisecond sort.
    sqlx::query("SELECT id,contract_no,signed_at,updated_by,created_by FROM poms.contract WHERE project_id=$1 ORDER BY signed_at DESC,updated_at DESC,created_at DESC")
        .bind(project_id).fetch_all(connection).await?.into_iter().map(|row| Ok(Contract {
            id:row.try_get("id")?, contract_no:row.try_get("contract_no")?, signed_at:row.try_get("signed_at")?,
            updated_by:row.try_get("updated_by")?, created_by:row.try_get("created_by")?,
        })).collect()
}

pub(crate) async fn handover(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Handover>, sqlx::Error> {
    sqlx::query("SELECT id,confirmed_at,confirmed_by FROM poms.project_handover WHERE project_id=$1 AND status='confirmed' AND confirmed_at IS NOT NULL ORDER BY confirmed_at DESC,updated_at DESC,created_at DESC LIMIT 1")
        .bind(project_id).fetch_optional(connection).await?.map(|row| Ok(Handover {
            id:row.try_get("id")?, confirmed_at:row.try_get("confirmed_at")?, confirmed_by:row.try_get("confirmed_by")?,
        })).transpose()
}

pub(crate) async fn acceptance(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Acceptance>, sqlx::Error> {
    sqlx::query("SELECT id,acceptance_type,acceptance_result,confirmed_at,confirmed_by,evidence_summary FROM poms.acceptance_record WHERE project_id=$1 AND status='confirmed' AND acceptance_result IN ('accepted','conditional') AND confirmed_at IS NOT NULL ORDER BY confirmed_at DESC,created_at DESC LIMIT 1")
        .bind(project_id).fetch_optional(connection).await?.map(|row| Ok(Acceptance {
            id:row.try_get("id")?, acceptance_type:row.try_get("acceptance_type")?, acceptance_result:row.try_get("acceptance_result")?,
            confirmed_at:row.try_get("confirmed_at")?, confirmed_by:row.try_get("confirmed_by")?, evidence_summary:row.try_get("evidence_summary")?,
        })).transpose()
}

pub(crate) async fn completion(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Completion>, sqlx::Error> {
    sqlx::query("SELECT id,completion_result,completed_at,completed_by,evidence_summary FROM poms.project_completion_record WHERE project_id=$1 AND status='confirmed' AND completed_at IS NOT NULL ORDER BY completed_at DESC,created_at DESC LIMIT 1")
        .bind(project_id).fetch_optional(connection).await?.map(|row| Ok(Completion {
            id:row.try_get("id")?, completion_result:row.try_get("completion_result")?, completed_at:row.try_get("completed_at")?,
            completed_by:row.try_get("completed_by")?, evidence_summary:row.try_get("evidence_summary")?,
        })).transpose()
}

pub(crate) async fn archive(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Archive>, sqlx::Error> {
    sqlx::query("SELECT id,archive_anchor_stage,archived_at,archived_by,archive_summary,evidence_summary FROM poms.project_archive_record WHERE project_id=$1 AND status='recorded' AND archived_at IS NOT NULL ORDER BY archived_at DESC,created_at DESC LIMIT 1")
        .bind(project_id).fetch_optional(connection).await?.map(|row| Ok(Archive {
            id:row.try_get("id")?, archive_anchor_stage:row.try_get("archive_anchor_stage")?, archived_at:row.try_get("archived_at")?,
            archived_by:row.try_get("archived_by")?, archive_summary:row.try_get("archive_summary")?, evidence_summary:row.try_get("evidence_summary")?,
        })).transpose()
}
