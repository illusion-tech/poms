use super::facts::{id, instant, qualification};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error},
    lifecycle_evidence::{self, EvidenceOwner},
};
use serde_json::{Value, json};
use uuid::Uuid;

async fn user_name(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    key: &str,
) -> Result<Option<String>, Error> {
    let Some(user) = row[key].as_str().and_then(|v| Uuid::parse_str(v).ok()) else {
        return Ok(None);
    };
    Ok(
        sqlx::query_scalar("SELECT display_name FROM poms.platform_user WHERE id=$1")
            .bind(user)
            .fetch_optional(&mut *session.connection)
            .await?,
    )
}

pub(super) async fn acceptance(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"acceptanceType":row["acceptance_type"],"acceptanceResult":row["acceptance_result"],"status":row["status"],"scopeSummary":row["scope_summary"],"evidenceSummary":row["evidence_summary"],"comment":row["comment"],"confirmationRecordId":row["confirmation_record_id"],"confirmedAt":instant(&row["confirmed_at"]),"confirmedBy":row["confirmed_by"],"createdAt":instant(&row["created_at"]),"createdBy":row["created_by"],"updatedAt":instant(&row["updated_at"]),"updatedBy":row["updated_by"],"rowVersion":row["row_version"],"sourcePayloadHash":row["source_payload_hash"],"sourceQualification":qualification(row),"sourceStageRecordId":row["source_stage_record_id"],"evidenceRefs":lifecycle_evidence::read(session,id(row,"project_id")?,EvidenceOwner::Acceptance(id(row,"id")?),actor).await?,"conditionalSummary":row["conditional_summary"]}),
    )
}

pub(super) async fn conditions(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    completion_id: Uuid,
    own_only: bool,
    actor: &Actor,
) -> Result<Vec<Value>, Error> {
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.project_completion_condition c WHERE project_id=$1 AND completion_record_id=$2 AND (NOT $3 OR responsible_user_id=$4) ORDER BY sort_order,id")
        .bind(project_id).bind(completion_id).bind(own_only).bind(actor.id).fetch_all(&mut *session.connection).await?;
    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        let condition_id = id(&row, "id")?;
        let evidence = lifecycle_evidence::read(
            session,
            project_id,
            EvidenceOwner::Condition(condition_id),
            actor,
        )
        .await?;
        let closure:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.project_completion_condition_closure c WHERE condition_id=$1 AND completion_record_id=$2 AND project_id=$3")
            .bind(condition_id).bind(completion_id).bind(project_id).fetch_optional(&mut *session.connection).await?;
        let closure_evidence = if let Some(c) = &closure {
            lifecycle_evidence::read(
                session,
                project_id,
                EvidenceOwner::Closure(id(c, "id")?),
                actor,
            )
            .await?
        } else {
            Vec::new()
        };
        if own_only {
            out.push(json!({"conditionId":condition_id,"conditionRowVersion":row["row_version"],"summary":row["summary"],"responsibleUserId":row["responsible_user_id"],"dueAt":instant(&row["due_at"]),"status":row["status"],"evidenceRefs":evidence,"closure":closure.map(|c|json!({"closureRecordId":c["id"],"closedAt":instant(&c["closed_at"]),"closedBy":c["closed_by"],"closureSummary":c["closure_summary"],"evidenceRefs":closure_evidence,"sourcePayloadHash":c["source_payload_hash"]}))}));
        } else {
            out.push(json!({"id":condition_id,"completionRecordId":completion_id,"summary":row["summary"],"responsibleUserId":row["responsible_user_id"],"responsibleUserName":user_name(session,&row,"responsible_user_id").await?,"dueAt":instant(&row["due_at"]),"status":row["status"],"rowVersion":row["row_version"],"evidenceRefs":evidence,"closedAt":instant(&row["closed_at"]),"closedBy":row["closed_by"],"closureRecordId":row["closure_record_id"],"closureSummary":closure.as_ref().map(|c|c["closure_summary"].clone()),"closureEvidenceRefs":closure_evidence,"allowedActions":if row["status"]=="pending"&&row["responsible_user_id"]==actor.id.to_string()&&actor.session.user.permissions.iter().any(|p|p.as_str()=="project:write"){vec!["close-completion-condition"]}else{vec![]}}));
        }
    }
    Ok(out)
}

pub(super) async fn completion(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    let project_id = id(row, "project_id")?;
    let completion_id = id(row, "id")?;
    Ok(
        json!({"id":row["id"],"projectId":project_id,"acceptanceRecordId":row["acceptance_record_id"],"completionResult":row["completion_result"],"status":row["status"],"completedAt":instant(&row["completed_at"]),"completedBy":row["completed_by"],"completedByName":user_name(session,row,"completed_by").await?,"completionSummary":row["completion_summary"],"evidenceSummary":row["evidence_summary"],"createdAt":instant(&row["created_at"]),"createdBy":row["created_by"],"updatedAt":instant(&row["updated_at"]),"updatedBy":row["updated_by"],"rowVersion":row["row_version"],"sourcePayloadHash":row["source_payload_hash"],"sourceQualification":qualification(row),"sourceStageRecordId":row["source_stage_record_id"],"evidenceRefs":lifecycle_evidence::read(session,project_id,EvidenceOwner::Completion(completion_id),actor).await?,"conditionStatus":if row["producer_version"]==1{row["condition_status"].clone()}else{json!("legacy-unverified")},"conditions":conditions(session,project_id,completion_id,false,actor).await?}),
    )
}

/// The narrow SQL projection never selects acceptance ID, parent summary or
/// parent evidence. Aggregate status sees every task; task rows see only self.
pub(super) async fn own_completion_tasks(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    let parents:Vec<Value>=sqlx::query_scalar(r#"SELECT jsonb_build_object('id',c.id,'rowVersion',c.row_version,
       'conditionStatus',CASE WHEN EXISTS(SELECT 1 FROM poms.project_completion_condition all_tasks WHERE all_tasks.completion_record_id=c.id AND all_tasks.status='pending') THEN 'pending' ELSE 'closed' END)
       FROM poms.project_completion_record c WHERE c.project_id=$1 AND c.producer_version=1
       AND c.status='confirmed' AND c.completion_result='conditional-completed'
       AND EXISTS(SELECT 1 FROM poms.project_completion_condition own_task WHERE own_task.completion_record_id=c.id AND own_task.project_id=$1 AND own_task.responsible_user_id=$2)
       ORDER BY c.id FOR SHARE OF c"#)
        .bind(project_id).bind(actor.id).fetch_all(&mut *session.connection).await?;
    let mut items = Vec::with_capacity(parents.len());
    for parent in parents {
        items.push(json!({"completionRecordId":parent["id"],"completionRowVersion":parent["rowVersion"],"conditionStatus":parent["conditionStatus"],"ownTasks":conditions(session,project_id,id(&parent,"id")?,true,actor).await?}));
    }
    Ok(json!({"scopeKind":"own-condition-only","projectId":project_id,"items":items}))
}

pub(super) async fn archive(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    actor: &Actor,
    can_mutate: bool,
) -> Result<Value, Error> {
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"archiveAnchorStage":row["archive_anchor_stage"],"archiveAnchorSourceType":row["archive_anchor_source_type"],"archiveAnchorSourceId":row["archive_anchor_source_id"],"status":row["status"],"archivedAt":instant(&row["archived_at"]),"archivedBy":row["archived_by"],"archivedByName":user_name(session,row,"archived_by").await?,"archiveSummary":row["archive_summary"],"evidenceSummary":row["evidence_summary"],"supersedesArchiveRecordId":row["supersedes_archive_record_id"],"replacementReason":row["replacement_reason"],"voidedAt":instant(&row["voided_at"]),"voidedBy":row["voided_by"],"voidedByName":user_name(session,row,"voided_by").await?,"voidReason":row["void_reason"],"createdAt":instant(&row["created_at"]),"createdBy":row["created_by"],"updatedAt":instant(&row["updated_at"]),"updatedBy":row["updated_by"],"rowVersion":row["row_version"],"allowedActions":if can_mutate&&row["status"]=="recorded" {vec!["replace-project-archive-record","void-project-archive-record"]}else{vec![]},"sourcePayloadHash":row["source_payload_hash"],"sourceQualification":row["source_qualification"].as_str().unwrap_or("legacy-unverified"),"sourceStageRecordId":row["source_stage_record_id"],"evidenceRefs":lifecycle_evidence::read(session,id(row,"project_id")?,EvidenceOwner::Archive(id(row,"id")?),actor).await?}),
    )
}
