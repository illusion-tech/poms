use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, AuditWrite, Error, audit, canonical_hash, new_uuid},
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(crate) fn id(value: &Value, field: &str) -> Result<Uuid, Error> {
    value[field]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(Error::Internal)
}
pub(crate) fn text<'a>(value: &'a Value, field: &str) -> Result<&'a str, Error> {
    value[field].as_str().ok_or(Error::Internal)
}
pub(crate) fn version(value: &Value) -> Result<i32, Error> {
    value["row_version"]
        .as_i64()
        .and_then(|v| i32::try_from(v).ok())
        .filter(|v| *v > 0)
        .ok_or(Error::Internal)
}
pub(crate) fn next_version(value: i32) -> Result<i32, Error> {
    value
        .checked_add(1)
        .ok_or_else(|| Error::Conflict("版本容量已耗尽。".into()))
}
pub(crate) fn cas(expected: i32, actual: i32, name: &str) -> Result<(), Error> {
    if expected <= 0 || expected != actual {
        return Err(Error::Conflict(format!("{name}版本已变化，请重新读取。")));
    }
    Ok(())
}
pub(crate) fn qualification(row: &Value) -> &'static str {
    if row["producer_version"] == 1 {
        "verified-producer"
    } else {
        "legacy-unverified"
    }
}
pub(crate) fn instant(value: &Value) -> Value {
    value
        .as_str()
        .and_then(|v| chrono::DateTime::parse_from_rfc3339(v).ok())
        .map(|d| {
            json!(
                d.with_timezone(&chrono::Utc)
                    .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
            )
        })
        .unwrap_or(Value::Null)
}
pub(crate) async fn project(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    lock: bool,
) -> Result<Value, Error> {
    let sql = if lock {
        "SELECT to_jsonb(p) FROM poms.project p WHERE id=$1 FOR UPDATE"
    } else {
        "SELECT to_jsonb(p) FROM poms.project p WHERE id=$1"
    };
    sqlx::query_scalar(sql)
        .bind(project_id)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("项目不存在。".into()))
}

pub(crate) async fn stage(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    stage_id: Uuid,
) -> Result<Value, Error> {
    let row: Value = sqlx::query_scalar(
        "SELECT to_jsonb(s) FROM poms.project_stage_record s WHERE id=$1 AND project_id=$2",
    )
    .bind(stage_id)
    .bind(project_id)
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::Conflict("缺少真实阶段准入事实。".into()))?;
    if row["producer_version"] != 1
        || canonical_hash(&row["source_payload"])? != text(&row, "source_payload_hash")?
    {
        return Err(Error::Conflict("阶段来源事实校验失败。".into()));
    }
    Ok(row)
}
pub(crate) async fn current_stage(
    session: &mut CommonSession<'_, '_>,
    p: &Value,
    expected: &str,
) -> Result<Value, Error> {
    if p["current_stage"] != expected || p["status"] != "active" {
        return Err(Error::Conflict(format!(
            "项目当前阶段不允许{expected}操作。"
        )));
    }
    let key = id(p, "current_stage_record_id").map_err(|_| Error::CodedConflict {
        code: "lifecycle_admission_required",
        message: "旧项目缺少真实阶段准入事实，须先补齐受控来源。".into(),
    })?;
    let row = stage(session, id(p, "id")?, key).await?;
    if row["to_stage"] != expected
        || row["project_row_version_after"]
            .as_i64()
            .is_none_or(|v| v > i64::from(version(p).unwrap_or(0)))
    {
        return Err(Error::Conflict("当前阶段与真实准入链不一致。".into()));
    }
    Ok(row)
}

pub(crate) struct SummarySpec<'a> {
    pub scenario: &'a str,
    pub package: &'a str,
    pub target_type: &'a str,
    pub target: Uuid,
    pub status: &'a str,
    pub fields: &'a [&'a str],
}
pub(crate) async fn summary(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    spec: SummarySpec<'_>,
) -> Result<Uuid, Error> {
    let role = spec.scenario == "commission-role-freeze";
    let projection = if role {
        "commission-role-freeze"
    } else {
        "project-stage-admission"
    };
    let export = if role {
        "commission-controlled"
    } else {
        "internal-only"
    };
    let field_rule = if role {
        "r4i-role-freeze-v1"
    } else {
        "r4i-lifecycle-v1"
    };
    let definition: Uuid = sqlx::query_scalar("SELECT id FROM poms.approval_summary_package_definition WHERE approval_scenario_key=$1 AND summary_package_key=$2 AND projection_level=$3 AND export_policy=$4 AND field_rule_version=$5 AND status='active'")
        .bind(spec.scenario).bind(spec.package).bind(projection).bind(export).bind(field_rule)
        .fetch_optional(&mut *session.connection).await?.ok_or_else(|| Error::Conflict("生命周期摘要定义尚未部署。".into()))?;
    let snapshot = new_uuid()?;
    sqlx::query("INSERT INTO poms.approval_summary_snapshot(id,target_type,target_id,approval_scenario_key,summary_package_id,summary_package_key,projection_level,export_policy,business_status_at_snapshot,generated_at,status,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$11)")
        .bind(snapshot).bind(spec.target_type).bind(spec.target).bind(spec.scenario).bind(definition).bind(spec.package).bind(projection).bind(export).bind(spec.status)
        .bind(crate::auth::model::clock_now()).bind(actor.id).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("approval_summary_snapshot", &snapshot.to_string());
    for (order, field) in spec.fields.iter().enumerate() {
        let projection_id = new_uuid()?;
        sqlx::query("INSERT INTO poms.approval_summary_field_projection(id,summary_snapshot_id,field_key,visibility_level,masking_mode,export_policy,field_order,channel_scope_summary,created_by) VALUES($1,$2,$3,'minimum-confirmation','none',$4,$5,$6,$7)")
            .bind(projection_id).bind(snapshot).bind(field).bind(export).bind(i32::try_from(order).map_err(|_| Error::Internal)?)
            .bind("仅冻结当前真实来源引用；读取仍需项目责任范围及原附件权限。")
            .bind(actor.id).execute(&mut *session.connection).await?;
        session.state.trace.inserted(
            "approval_summary_field_projection",
            &projection_id.to_string(),
        );
    }
    Ok(snapshot)
}

pub(crate) struct StageWrite<'a> {
    pub id: Uuid,
    pub project: &'a Value,
    pub previous: Option<&'a Value>,
    pub handover_id: Uuid,
    pub assignment_id: Option<Uuid>,
    pub completion_id: Option<Uuid>,
    pub to_stage: &'a str,
    pub reason: &'a str,
    pub payload: Value,
}
pub(crate) async fn write_stage(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    input: StageWrite<'_>,
) -> Result<Value, Error> {
    let before = version(input.project)?;
    let after = next_version(before)?;
    let project_id = id(input.project, "id")?;
    let from = text(input.project, "current_stage")?;
    let package = match input.to_stage {
        "handover" => "project-handover-stage",
        "execution" => "project-execution-admission",
        "acceptance" => "project-acceptance-admission",
        "completed" | "conditional-completed" => "project-completion-stage",
        _ => return Err(Error::Internal),
    };
    let hash = canonical_hash(&input.payload)?;
    let summary_id = summary(
        session,
        actor,
        SummarySpec {
            scenario: "project-stage-transition",
            package,
            target_type: "project-stage-record",
            target: input.id,
            status: input.to_stage,
            fields: &[
                "project.identity",
                "stage.transition",
                "source.handover",
                "source.role-assignment",
                "source.evidence",
                "source.hash",
            ],
        },
    )
    .await?;
    let maximum_sequence: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sequence_no),0) FROM poms.project_stage_record WHERE project_id=$1",
    )
    .bind(project_id)
    .fetch_one(&mut *session.connection)
    .await?;
    let sequence = next_version(maximum_sequence)?;
    let entered_at = crate::auth::model::clock_now();
    let previous_id = input.previous.map(|v| id(v, "id")).transpose()?;
    sqlx::query("INSERT INTO poms.project_stage_record(id,project_id,sequence_no,event_type,from_stage,to_stage,previous_stage_record_id,source_handover_id,source_role_assignment_id,source_completion_record_id,summary_snapshot_id,project_row_version_before,project_row_version_after,entered_at,entered_by,reason,source_payload,source_payload_hash,producer_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,1)")
        .bind(input.id).bind(project_id).bind(sequence).bind(if from=="handover" && input.to_stage=="handover" {"stage-requalified"}else{"stage-entered"})
        .bind(from).bind(input.to_stage).bind(previous_id).bind(input.handover_id).bind(input.assignment_id).bind(input.completion_id).bind(summary_id)
        .bind(before).bind(after).bind(entered_at).bind(actor.id).bind(input.reason).bind(input.payload).bind(&hash).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("project_stage_record", &input.id.to_string());
    let changed = sqlx::query("UPDATE poms.project SET current_stage=$1,status=$2,current_stage_record_id=$3,row_version=$4,updated_at=$5,updated_by=$6 WHERE id=$7 AND row_version=$8")
        .bind(input.to_stage).bind(if matches!(input.to_stage,"completed"|"conditional-completed") {"completed"} else {"active"})
        .bind(input.id).bind(after).bind(entered_at).bind(actor.id).bind(project_id).bind(before)
        .execute(&mut *session.connection).await?.rows_affected();
    if changed != 1 {
        return Err(Error::Conflict("项目阶段版本已变化。".into()));
    }
    Ok(
        json!({"targetId":project_id,"businessStatusAfter":input.to_stage,"projectStageRecordId":input.id,"projectRowVersion":after,"summarySnapshotId":summary_id,"sourceHandoverId":input.handover_id,"commissionRoleAssignmentId":input.assignment_id,"sourcePayloadHash":hash,"enteredAt":entered_at,"enteredBy":actor.id}),
    )
}

#[allow(clippy::too_many_arguments)]
pub(crate) async fn record(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    operation: &str,
    target_type: &str,
    target: Uuid,
    project_id: Uuid,
    before: Option<Value>,
    after: Value,
) -> Result<(), Error> {
    audit(
        session,
        actor,
        AuditWrite {
            operation_id: operation.into(),
            target_type: target_type.into(),
            target_id: target,
            project_id,
            contract_id: None,
            before,
            after: Some(after),
            reason: None,
            metadata: json!({"producerVersion":1}),
        },
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cas_rejects_stale_nonpositive_and_exhausted_versions() {
        assert!(cas(1, 1, "项目").is_ok());
        for (expected, actual) in [(0, 1), (1, 2)] {
            assert!(cas(expected, actual, "项目").is_err());
        }
        assert!(cas(i32::MAX, i32::MAX, "只读来源").is_ok());
        assert!(next_version(i32::MAX).is_err());
    }
}
