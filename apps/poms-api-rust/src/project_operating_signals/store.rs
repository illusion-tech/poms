//! Fixed H table access. No source collector, dynamic client table names, or TX.
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error},
    project_operating_common::{hash, model::*},
};
use serde_json::Value;
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug)]
pub(crate) struct EvaluationRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub snapshot_id: Uuid,
    pub snapshot_row_version: i32,
    pub maturity_id: Uuid,
    pub evidence_id: Uuid,
    pub row_version: i32,
    pub source_hash: String,
    pub evaluation_hash: String,
    pub source_current: bool,
    pub snapshot_status: String,
    pub status: String,
    pub draft: OperatingEvaluationDraft,
}

fn evaluation_row(row: sqlx::postgres::PgRow) -> Result<EvaluationRow, Error> {
    let frozen_output: Value = row.try_get("frozen_output")?;
    let payload_hash: String = row.try_get("output_payload_hash")?;
    if hash::canonical_hash(&frozen_output)?.as_str() != payload_hash {
        return Err(Error::Conflict(
            "Immutable operating output payload hash mismatch".into(),
        ));
    }
    Ok(EvaluationRow {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        snapshot_id: row.try_get("referenced_snapshot_id")?,
        snapshot_row_version: row.try_get("captured_row_version")?,
        maturity_id: row.try_get("data_maturity_evaluation_id")?,
        evidence_id: row.try_get("evidence_id")?,
        row_version: row.try_get("row_version")?,
        source_hash: row.try_get("source_hash")?,
        evaluation_hash: row.try_get("evaluation_hash")?,
        source_current: row.try_get("is_current")?,
        snapshot_status: row.try_get("snapshot_status")?,
        status: row.try_get("status")?,
        draft: serde_json::from_value(frozen_output).map_err(|_| Error::Internal)?,
    })
}

pub(crate) async fn evaluation_identity(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
) -> Result<Uuid, Error> {
    sqlx::query_scalar("SELECT project_id FROM poms.operating_signal_evaluation_result WHERE id=$1")
        .bind(id)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("Operating evaluation not found".into()))
}
pub(crate) async fn binding_identity(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
) -> Result<Uuid, Error> {
    sqlx::query_scalar("SELECT project_id FROM poms.operating_signal_gate_binding WHERE id=$1")
        .bind(id)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("Commission gate binding not found".into()))
}
pub(crate) async fn evaluation(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    project: Uuid,
    lock: bool,
) -> Result<EvaluationRow, Error> {
    let sql = if lock {
        "SELECT o.id,o.project_id,o.referenced_snapshot_id,o.data_maturity_evaluation_id,o.evidence_id,o.row_version,o.status,e.source_hash,e.evaluation_hash,e.frozen_output,e.output_payload_hash,s.captured_row_version,s.status AS snapshot_status,EXISTS(SELECT 1 FROM poms.project_operating_head h WHERE h.project_id=s.project_id AND h.current_snapshot_id=s.id) AS is_current FROM poms.operating_signal_evaluation_result o JOIN poms.operating_evaluation_evidence e ON e.id=o.evidence_id AND e.project_id=o.project_id AND e.snapshot_id=o.referenced_snapshot_id JOIN poms.project_operating_snapshot s ON s.id=o.referenced_snapshot_id AND s.project_id=o.project_id WHERE o.id=$1 AND o.project_id=$2 AND o.producer_version=1 AND e.producer_version=1 FOR UPDATE OF o"
    } else {
        "SELECT o.id,o.project_id,o.referenced_snapshot_id,o.data_maturity_evaluation_id,o.evidence_id,o.row_version,o.status,e.source_hash,e.evaluation_hash,e.frozen_output,e.output_payload_hash,s.captured_row_version,s.status AS snapshot_status,EXISTS(SELECT 1 FROM poms.project_operating_head h WHERE h.project_id=s.project_id AND h.current_snapshot_id=s.id) AS is_current FROM poms.operating_signal_evaluation_result o JOIN poms.operating_evaluation_evidence e ON e.id=o.evidence_id AND e.project_id=o.project_id AND e.snapshot_id=o.referenced_snapshot_id JOIN poms.project_operating_snapshot s ON s.id=o.referenced_snapshot_id AND s.project_id=o.project_id WHERE o.id=$1 AND o.project_id=$2 AND o.producer_version=1 AND e.producer_version=1"
    };
    let result = evaluation_row(
        sqlx::query(sql)
            .bind(id)
            .bind(project)
            .fetch_optional(&mut *session.connection)
            .await?
            .ok_or_else(|| Error::CodedConflict {
                code: "operating_evaluation_legacy_unverified",
                message: "This operating evaluation has no certified source context".into(),
            })?,
    )?;
    if result.project_id != project {
        return Err(Error::Internal);
    }
    Ok(result)
}

pub(crate) async fn current_evaluation_id(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
) -> Result<Option<Uuid>, Error> {
    Ok(sqlx::query_scalar("SELECT o.id FROM poms.project_operating_head h JOIN poms.operating_signal_evaluation_result o ON o.referenced_snapshot_id=h.current_snapshot_id AND o.project_id=h.project_id AND o.producer_version=1 AND o.status='active' WHERE h.project_id=$1")
        .bind(project).fetch_optional(&mut *session.connection).await?)
}

#[derive(Debug)]
pub(crate) struct BindingRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub signal_id: Uuid,
    pub evidence_id: Uuid,
    pub signal_review_id: Option<Uuid>,
    pub stage: OperatingGateStage,
    pub row_version: i32,
    pub system_action: OperatingSnapshotActionLevel,
    pub action: OperatingSnapshotActionLevel,
    pub evaluation_hash: String,
    pub summary_id: Uuid,
    pub status: String,
    pub source_summary_id: Option<Uuid>,
}
fn binding_row(row: sqlx::postgres::PgRow) -> Result<BindingRow, Error> {
    let stage: String = row.try_get("gate_stage_type")?;
    let system: String = row.try_get("system_binding_action")?;
    let action: String = row.try_get("binding_action")?;
    Ok(BindingRow {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        signal_id: row.try_get("signal_evaluation_id")?,
        evidence_id: row.try_get("evidence_id")?,
        signal_review_id: row.try_get("signal_review_id")?,
        stage: serde_json::from_value(Value::String(stage)).map_err(|_| Error::Internal)?,
        row_version: row.try_get("row_version")?,
        system_action: serde_json::from_value(Value::String(system))
            .map_err(|_| Error::Internal)?,
        action: serde_json::from_value(Value::String(action)).map_err(|_| Error::Internal)?,
        evaluation_hash: row.try_get("evaluation_hash")?,
        summary_id: row.try_get("current_summary_id")?,
        status: row.try_get("status")?,
        source_summary_id: row.try_get("source_summary_snapshot_id")?,
    })
}
pub(crate) async fn binding(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    project: Uuid,
    lock: bool,
) -> Result<BindingRow, Error> {
    let sql = if lock {
        "SELECT b.id,b.project_id,b.signal_evaluation_id,b.evidence_id,b.signal_review_id,b.gate_stage_type,b.row_version,b.system_binding_action,b.binding_action,b.evaluation_hash,b.current_summary_id,b.status,p.source_summary_snapshot_id FROM poms.operating_signal_gate_binding b JOIN poms.operating_gate_summary_payload p ON p.summary_snapshot_id=b.current_summary_id AND p.binding_id=b.id AND p.project_id=b.project_id WHERE b.id=$1 AND b.project_id=$2 AND b.producer_version=1 FOR UPDATE OF b"
    } else {
        "SELECT b.id,b.project_id,b.signal_evaluation_id,b.evidence_id,b.signal_review_id,b.gate_stage_type,b.row_version,b.system_binding_action,b.binding_action,b.evaluation_hash,b.current_summary_id,b.status,p.source_summary_snapshot_id FROM poms.operating_signal_gate_binding b JOIN poms.operating_gate_summary_payload p ON p.summary_snapshot_id=b.current_summary_id AND p.binding_id=b.id AND p.project_id=b.project_id WHERE b.id=$1 AND b.project_id=$2 AND b.producer_version=1"
    };
    let result = binding_row(
        sqlx::query(sql)
            .bind(id)
            .bind(project)
            .fetch_optional(&mut *session.connection)
            .await?
            .ok_or_else(|| Error::CodedConflict {
                code: "operating_binding_legacy_unverified",
                message: "This binding has no certified source summary".into(),
            })?,
    )?;
    if result.project_id != project {
        return Err(Error::Internal);
    }
    Ok(result)
}
pub(crate) async fn bindings(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    signal: Uuid,
) -> Result<Vec<BindingRow>, Error> {
    let rows=sqlx::query("SELECT b.id,b.project_id,b.signal_evaluation_id,b.evidence_id,b.signal_review_id,b.gate_stage_type,b.row_version,b.system_binding_action,b.binding_action,b.evaluation_hash,b.current_summary_id,b.status,p.source_summary_snapshot_id FROM poms.operating_signal_gate_binding b JOIN poms.operating_gate_summary_payload p ON p.summary_snapshot_id=b.current_summary_id AND p.binding_id=b.id AND p.project_id=b.project_id WHERE b.project_id=$1 AND b.signal_evaluation_id=$2 AND b.producer_version=1 AND b.status='active' ORDER BY b.id")
        .bind(project).bind(signal).fetch_all(&mut *session.connection).await?;
    rows.into_iter().map(binding_row).collect()
}

pub(crate) struct SignalReviewRow {
    pub id: Uuid,
    pub actor_id: Uuid,
    pub source_hash: String,
    pub evaluation_hash: String,
    pub payload_hash: String,
    pub payload: Value,
}
fn signal_review_row(row: sqlx::postgres::PgRow) -> Result<SignalReviewRow, Error> {
    Ok(SignalReviewRow {
        id: row.try_get("id")?,
        actor_id: row.try_get("handled_by")?,
        source_hash: row.try_get("source_hash")?,
        evaluation_hash: row.try_get("evaluation_hash")?,
        payload_hash: row.try_get("payload_hash")?,
        payload: row.try_get("review_payload")?,
    })
}
pub(crate) async fn active_signal_review(
    session: &mut CommonSession<'_, '_>,
    signal: Uuid,
) -> Result<Option<SignalReviewRow>, Error> {
    let row=sqlx::query("SELECT id,handled_by,source_hash,evaluation_hash,payload_hash,review_payload FROM poms.operating_signal_review_record WHERE signal_evaluation_id=$1 AND producer_version=1 AND status='active'")
        .bind(signal).fetch_optional(&mut *session.connection).await?;
    row.map(signal_review_row).transpose()
}
pub(crate) async fn signal_review(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    signal: Uuid,
) -> Result<SignalReviewRow, Error> {
    let row=sqlx::query("SELECT id,handled_by,source_hash,evaluation_hash,payload_hash,review_payload FROM poms.operating_signal_review_record WHERE id=$1 AND signal_evaluation_id=$2 AND producer_version=1")
        .bind(id).bind(signal).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Conflict("Binding signal review source is unavailable".into()))?;
    signal_review_row(row)
}
pub(crate) async fn active_gate_review(
    session: &mut CommonSession<'_, '_>,
    binding: Uuid,
) -> Result<Option<Value>, Error> {
    let row=sqlx::query("SELECT id,gate_review_decision,handled_by,handled_at,review_payload,summary_snapshot_id FROM poms.commission_gate_review_record WHERE binding_id=$1 AND producer_version=1 AND status='active'")
        .bind(binding).fetch_optional(&mut *session.connection).await?;
    row.map(|r|Ok(serde_json::json!({"id":r.try_get::<Uuid,_>("id")?,"gateReviewDecision":r.try_get::<String,_>("gate_review_decision")?,"handledBy":r.try_get::<Option<Uuid>,_>("handled_by")?,"handledAt":r.try_get::<chrono::DateTime<chrono::Utc>,_>("handled_at")?,"reviewPayload":r.try_get::<Value,_>("review_payload")?,"summarySnapshotId":r.try_get::<Uuid,_>("summary_snapshot_id")?}))).transpose()
}
pub(crate) async fn latest_gate_review(
    session: &mut CommonSession<'_, '_>,
    binding: Uuid,
) -> Result<Option<Value>, Error> {
    let row=sqlx::query("SELECT id,gate_review_decision,handled_by,handled_at,review_payload,summary_snapshot_id FROM poms.commission_gate_review_record WHERE binding_id=$1 AND producer_version=1 ORDER BY handled_at DESC,id DESC LIMIT 1")
        .bind(binding).fetch_optional(&mut *session.connection).await?;
    row.map(|r|Ok(serde_json::json!({"id":r.try_get::<Uuid,_>("id")?,"gateReviewDecision":r.try_get::<String,_>("gate_review_decision")?,"handledBy":r.try_get::<Option<Uuid>,_>("handled_by")?,"handledAt":r.try_get::<chrono::DateTime<chrono::Utc>,_>("handled_at")?,"reviewPayload":r.try_get::<Value,_>("review_payload")?,"summarySnapshotId":r.try_get::<Uuid,_>("summary_snapshot_id")?}))).transpose()
}

pub(crate) async fn replay(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    target: Uuid,
    actor: &Actor,
    key: Uuid,
    hash: &str,
) -> Result<Option<Value>, Error> {
    let row=sqlx::query("SELECT request_hash,authorized_response FROM poms.operating_command_receipt WHERE operation_id=$1 AND target_scope=$2 AND actor_id=$3 AND request_key=$4")
        .bind(operation).bind(target.to_string()).bind(actor.id).bind(key).fetch_optional(&mut *session.connection).await?;
    if let Some(row) = row {
        if row.try_get::<String, _>("request_hash")? != hash {
            return Err(Error::CodedConflict {
                code: "operating_request_key_reused",
                message: "Request key was already committed with a different payload".into(),
            });
        }
        return Ok(Some(row.try_get("authorized_response")?));
    }
    Ok(None)
}
pub(crate) struct CommandReceipt<'a> {
    pub operation: &'a str,
    pub target: Uuid,
    pub key: Uuid,
    pub request_hash: &'a str,
    pub response: &'a Value,
    pub source_hash: &'a str,
    pub evaluation_hash: &'a str,
}
pub(crate) async fn receipt(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    input: CommandReceipt<'_>,
) -> Result<(), Error> {
    sqlx::query("INSERT INTO poms.operating_command_receipt(operation_id,target_scope,actor_id,request_key,request_hash,authorized_response,http_status,source_hash,evaluation_hash) VALUES($1,$2,$3,$4,$5,$6,200,$7,$8)")
        .bind(input.operation).bind(input.target.to_string()).bind(actor.id).bind(input.key).bind(input.request_hash).bind(input.response).bind(input.source_hash).bind(input.evaluation_hash).execute(&mut *session.connection).await?;
    Ok(())
}
