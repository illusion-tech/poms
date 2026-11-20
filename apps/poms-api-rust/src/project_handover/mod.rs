//! Versioned handover facts. The caller owns the connection and transaction.
mod model;
mod service;
mod sources;
mod view;

pub use service::execute;
pub use sources::load_handover_facts_in_session;

/// Scope consumers reuse D's actual frozen-basis verifier. No role name or
/// organization ancestor creates a handover responsibility.
pub struct ParticipantScopeFacts {
    pub roles: std::collections::BTreeSet<String>,
    pub confirmed: bool,
    pub execution_owner: bool,
}
pub async fn participant_scope_facts_with_session(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    project_id: uuid::Uuid,
    actor_id: uuid::Uuid,
) -> Result<Option<ParticipantScopeFacts>, crate::contract_support::Error> {
    use crate::contract_support::Error;
    use serde_json::Value;
    crate::contract_support::lock_project(session.connection, project_id).await?;
    let handovers: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(h) FROM poms.project_handover h WHERE project_id=$1 AND producer_version=1 AND is_current=true AND status IN ('draft','confirmed') ORDER BY id FOR SHARE")
        .bind(project_id).fetch_all(&mut *session.connection).await?;
    if handovers.len() > 1 {
        return Err(Error::Conflict(
            "Current handover authority is ambiguous".into(),
        ));
    }
    let Some(handover) = handovers.first() else {
        return Ok(None);
    };
    let id = model::id(handover, "id")?;
    let confirmation = model::id(handover, "confirmation_record_id")?;
    let rows: Vec<(String, String, String)> = sqlx::query_as("SELECT r.role_key,c.status,p.participant_status FROM poms.project_handover_participant_role r JOIN poms.confirmation_record c ON c.id=r.confirmation_record_id AND c.id=$2 AND c.target_type='project-handover' AND c.confirmation_type='project-handover' AND c.target_id=$1 AND c.project_id=$3 JOIN poms.confirmation_participant p ON p.confirmation_record_id=c.id AND p.participant_id=r.participant_user_id WHERE r.handover_id=$1 AND r.participant_user_id=$4 AND c.status IN ('pending','confirmed') AND p.participant_status IN ('pending','confirmed') ORDER BY r.role_key FOR SHARE OF r,c,p")
        .bind(id).bind(confirmation).bind(project_id).bind(actor_id).fetch_all(&mut *session.connection).await?;
    if rows.is_empty() {
        return Ok(None);
    }
    if handover["status"] == "confirmed" {
        sources::intrinsic_frozen_duties(session, handover).await?;
    } else {
        sources::fresh(session, handover).await?;
    }
    let confirmed = handover["status"] == "confirmed"
        && rows
            .iter()
            .all(|(_, record, person)| record == "confirmed" && person == "confirmed");
    let roles = rows
        .iter()
        .map(|(role, _, _)| role.clone())
        .collect::<std::collections::BTreeSet<_>>();
    let execution_owner = roles.contains("execution-owner")
        && handover["execution_owner_user_id"]
            .as_str()
            .and_then(|id| uuid::Uuid::parse_str(id).ok())
            == Some(actor_id);
    Ok(Some(ParticipantScopeFacts {
        roles,
        confirmed,
        execution_owner,
    }))
}

pub async fn verify_confirmed_handover_with_session(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    project_id: uuid::Uuid,
    handover_id: uuid::Uuid,
) -> Result<serde_json::Value, crate::contract_support::Error> {
    use crate::contract_support::{Error, lock_project};
    lock_project(session.connection, project_id).await?;
    let h: serde_json::Value = sqlx::query_scalar("SELECT to_jsonb(h) FROM poms.project_handover h WHERE id=$1 AND project_id=$2 AND producer_version=1 AND is_current=true AND status='confirmed' FOR UPDATE")
        .bind(handover_id).bind(project_id).fetch_optional(&mut *session.connection).await?.ok_or_else(|| Error::Conflict("A verified current confirmed handover is required".into()))?;
    sources::confirmed_sources(session, &h).await?;
    let confirmation = model::id(&h, "confirmation_record_id")?;
    let valid: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.confirmation_record c WHERE c.id=$1 AND c.target_type='project-handover' AND c.confirmation_type='project-handover' AND c.target_id=$2 AND c.project_id=$3 AND c.status='confirmed' AND c.required_count>0 AND c.required_count=c.confirmed_count AND c.required_count=(SELECT count(*) FROM poms.confirmation_participant p WHERE p.confirmation_record_id=c.id AND p.participant_status='confirmed') AND NOT EXISTS(SELECT 1 FROM poms.confirmation_participant p WHERE p.confirmation_record_id=c.id AND p.participant_status<>'confirmed'))")
        .bind(confirmation).bind(handover_id).bind(project_id).fetch_one(&mut *session.connection).await?;
    if !valid {
        return Err(Error::Conflict(
            "Handover participant confirmations are incomplete".into(),
        ));
    }
    Ok(h)
}
