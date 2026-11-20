//! A narrow read-only projection of the actual command admission facts.
//! Full Project detail lends its existing transaction; Role GET stays protected.
use super::facts::{self, id, text};
use crate::{
    approval_common::CommonSession,
    commission_assignment,
    contract_support::{Actor, Error},
    project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},
};
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

fn readiness_denial(error: &Error) -> bool {
    matches!(
        error,
        Error::NotFound(_) | Error::Forbidden(_) | Error::Conflict(_) | Error::CodedConflict { .. }
    )
}

pub(crate) async fn prepare_execution_admission_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    actor: &Actor,
) -> Result<Option<Value>, Error> {
    if !session.connection.is_in_transaction() {
        return Err(Error::Internal);
    }
    if !actor
        .session
        .user
        .permissions
        .iter()
        .any(|permission| permission.as_str() == "project:write")
    {
        return Ok(None);
    }
    let project = facts::project(session, project_id, true).await?;
    if project["current_stage"] != "handover" || project["status"] != "active" {
        return Ok(None);
    }
    let assignment: Option<Uuid> = sqlx::query_scalar(r#"SELECT a.id FROM poms.commission_role_assignment a
      JOIN poms.project_handover h ON h.id=a.source_handover_id AND h.project_id=a.project_id
      WHERE a.project_id=$1 AND a.is_current AND a.status='frozen' AND a.producer_version=1
        AND h.is_current AND h.status='confirmed' AND h.producer_version=1 AND h.execution_owner_user_id=$2"#)
        .bind(project_id).bind(actor.id).fetch_optional(&mut *session.connection).await?;
    let Some(assignment_id) = assignment else {
        return Ok(None);
    };
    let prepared = ready(session, project_id, &project, assignment_id, actor).await;
    match prepared {
        Ok(value) => Ok(Some(value)),
        Err(error) if readiness_denial(&error) => Ok(None),
        // Actual SQL/common/internal/required-write failures are never readiness.
        Err(error) => Err(error),
    }
}

async fn ready(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    project: &Value,
    assignment_id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    scope::require(
        session,
        actor,
        ProjectAction::ReadProjectAnchorOrIList,
        ProjectActionTarget::Project { id: project_id },
    )
    .await?;
    scope::require(
        session,
        actor,
        ProjectAction::StartExecution,
        ProjectActionTarget::Project { id: project_id },
    )
    .await?;
    // Exactly the real stage/frozen-role/handover verifiers used by execution.
    let previous = facts::current_stage(session, project, "handover").await?;
    let frozen =
        commission_assignment::require_current_frozen(session, project_id, assignment_id, None)
            .await?;
    if previous["source_handover_id"] != frozen.handover["id"]
        || frozen.handover["execution_owner_user_id"] != actor.id.to_string()
    {
        return Err(Error::Conflict(
            "Current execution admission chain is not ready".into(),
        ));
    }
    let value = json!({
        "handoverStageRecordId":id(&previous,"id")?,
        "handoverSummarySnapshotId":id(&frozen.handover,"summary_snapshot_id")?,
        "expectedRoleAssignmentVersion":frozen.row_version,
        "commissionRoleAssignmentId":frozen.assignment_id,
        "sourceHandoverId":id(&frozen.handover,"id")?,
        // This is the verified Handover hash, not the role-freeze payload hash.
        "sourcePayloadHash":text(&frozen.handover,"source_payload_hash")?,
    });
    crate::project_operating_common::schema::validate_public_value(
        "ExecutionAdmissionContextView",
        &value,
    )?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn internal_or_required_common_failures_are_not_readiness_nulls() {
        assert!(!readiness_denial(&Error::Internal));
        assert!(!readiness_denial(&Error::Database(sqlx::Error::Protocol(
            "required SQL fault".into()
        ))));
        assert!(!readiness_denial(&Error::Common(
            crate::approval_common::CommonFailure::database(Some("23514".into()))
        )));
        assert!(!readiness_denial(&Error::Common(
            crate::approval_common::CommonFailure::unexpected("required audit fault")
        )));
        assert!(readiness_denial(&Error::Conflict("not ready".into())));
        assert!(readiness_denial(&Error::Forbidden("not current EO".into())));
    }
}
