//! Existing project guidance and lifecycle milestone queries. No lifecycle fact
//! is inferred from current stage, and this module never writes R4 state.

use std::{
    collections::{HashMap, HashSet},
    error::Error as StdError,
    fmt,
    sync::OnceLock,
};

use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use icu_collator::{
    Collator, CollatorPreferences,
    options::{AlternateHandling, CaseLevel, CollatorOptions, Strength},
    preferences::{CollationCaseFirst, CollationNumericOrdering},
};
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    guidance,
    store::{self, Acceptance, Archive, Completion, Contract, Handover},
};
use crate::{
    approval::context::PendingAuthentication,
    approval_common::{CommonSession, CommonState, store as common_store},
    auth::model::clock_now,
    compat::scalars::js_iso_string,
    contract_support::{Actor, Error as BusinessError},
    database::{Database, DbError},
    error::ApiError,
    project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},
    projects::{model::Wire, store::ProjectRow},
};

#[derive(Debug)]
pub enum Error {
    NotFound(String),
    Database(DbError),
    Business(BusinessError),
    Internal,
}
impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("project workspace query failed")
    }
}
impl StdError for Error {}
impl From<DbError> for Error {
    fn from(value: DbError) -> Self {
        Self::Database(value)
    }
}
impl From<sqlx::Error> for Error {
    fn from(value: sqlx::Error) -> Self {
        Self::Business(value.into())
    }
}
impl Error {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::Business(error) => error.into_api_error(),
            Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Service {
    database: Database,
}

#[derive(Default)]
struct Facts {
    contract: Option<Contract>,
    handover: Option<Handover>,
    acceptance: Option<Acceptance>,
    completion: Option<Completion>,
    archive: Option<Archive>,
}

impl Service {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn guidance(&self, project_id: &str, actor: Actor) -> Result<Wire, Error> {
        self.read(project_id, WorkspaceRead::Guidance, actor).await
    }

    pub async fn timeline(&self, project_id: &str, actor: Actor) -> Result<Wire, Error> {
        self.read(project_id, WorkspaceRead::Timeline, actor).await
    }

    async fn read(
        &self,
        project_id: &str,
        kind: WorkspaceRead,
        actor: Actor,
    ) -> Result<Wire, Error> {
        let project_id = Uuid::parse_str(project_id).map_err(|_| {
            Error::Business(BusinessError::BadRequest("Invalid project UUID".into()))
        })?;
        // This existing service owns the outer TX. Authorization, source reads,
        // projection and pending authentication use only its borrowed session.
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut tx = connection.begin().await?;
                    let mut state = CommonState::default();
                    state.trace.begin(true);
                    let mut participant = PendingAuthentication::from_resolved(&actor.session);
                    let result = {
                        let mut session = CommonSession::borrow_with_participant(
                            &mut tx,
                            &mut state,
                            &mut participant,
                        );
                        session.request_id = actor.request_id.clone();
                        match read_with_session(&mut session, project_id, kind, &actor).await {
                            Ok(value) => common_store::flush(&mut session)
                                .await
                                .map_err(BusinessError::from)
                                .map_err(Error::Business)
                                .map(|()| value),
                            Err(error) => Err(error),
                        }
                    };
                    match result {
                        Ok(value) => match tx.commit().await {
                            Ok(()) => {
                                state.trace.commit_succeeded();
                                Ok(Ok(value))
                            }
                            Err(error) => {
                                state.trace.unknown_commit();
                                Err(error)
                            }
                        },
                        Err(error) => {
                            let rollback = tx.rollback().await;
                            state.trace.rolled_back();
                            rollback?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await?
    }
}

#[derive(Clone, Copy)]
enum WorkspaceRead {
    Guidance,
    Timeline,
}

async fn read_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    kind: WorkspaceRead,
    actor: &Actor,
) -> Result<Wire, Error> {
    let proof = scope::require(
        session,
        actor,
        ProjectAction::ReadProjectAnchorOrIList,
        ProjectActionTarget::Project { id: project_id },
    )
    .await
    .map_err(Error::Business)?;
    if !proof.is_full_project() {
        return Err(Error::Business(BusinessError::Forbidden(
            "Project workspace requires full project responsibility".into(),
        )));
    }
    proof
        .assert_session(session, actor)
        .await
        .map_err(Error::Business)?;
    // Scope has locked the true project before any workspace source query.
    let project = crate::projects::store::find(session.connection, &project_id.to_string())
        .await?
        .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;
    match kind {
        WorkspaceRead::Guidance => guidance_with_session(session, &project, actor).await,
        WorkspaceRead::Timeline => timeline_with_session(session, &project).await,
    }
}

async fn guidance_with_session(
    session: &mut CommonSession<'_, '_>,
    project: &ProjectRow,
    actor: &Actor,
) -> Result<Wire, Error> {
    let users = store::user_names(
        session.connection,
        &project.owner_user_id.into_iter().collect::<Vec<_>>(),
    )
    .await?;
    let orgs = store::org_names(
        session.connection,
        &project.owner_org_id.into_iter().collect::<Vec<_>>(),
    )
    .await?;
    let snapshot = store::snapshot(session.connection, project.id).await?;
    let owner_name = project
        .owner_user_id
        .and_then(|id| users.get(&id))
        .map(String::as_str);
    let owner_org_name = project
        .owner_org_id
        .and_then(|id| orgs.get(&id))
        .map(String::as_str);
    let permissions = actor
        .session
        .user
        .permissions
        .iter()
        .map(|value| value.as_ref())
        .collect::<Vec<&str>>();
    Ok(Wire::value(guidance::view(
        project,
        owner_name,
        owner_org_name,
        snapshot.as_ref(),
        &permissions,
        iso(clock_now())?,
    )?))
}

async fn timeline_with_session(
    session: &mut CommonSession<'_, '_>,
    project: &ProjectRow,
) -> Result<Wire, Error> {
    let contracts = store::contracts(session.connection, project.id).await?;
    let handover = store::handover(session.connection, project.id).await?;
    let acceptance = store::acceptance(session.connection, project.id).await?;
    let completion = store::completion(session.connection, project.id).await?;
    let archive = store::archive(session.connection, project.id).await?;
    let facts = Facts {
        contract: first_signed_contract(contracts),
        handover,
        acceptance,
        completion,
        archive,
    };
    let mut seen = HashSet::new();
    let actor_ids = [
        project.created_by,
        facts
            .contract
            .as_ref()
            .and_then(|row| row.updated_by.or(row.created_by)),
        facts.handover.as_ref().and_then(|row| row.confirmed_by),
        facts.acceptance.as_ref().and_then(|row| row.confirmed_by),
        facts.completion.as_ref().and_then(|row| row.completed_by),
        facts.archive.as_ref().and_then(|row| row.archived_by),
        project.closed_at.and(project.updated_by),
    ]
    .into_iter()
    .flatten()
    .filter(|id| seen.insert(*id))
    .collect::<Vec<_>>();
    let users = store::user_names(session.connection, &actor_ids).await?;
    Ok(Wire::value(json!({
        "projectId":project.id,"events":timeline_events(project, &facts, &users)?,"generatedAt":iso(clock_now())?,
    })))
}

pub(crate) fn iso(value: DateTime<Utc>) -> Result<String, Error> {
    js_iso_string(value).map_err(|_| Error::Internal)
}

fn first_signed_contract(contracts: Vec<Contract>) -> Option<Contract> {
    let mut signed = contracts
        .into_iter()
        .filter(|row| row.signed_at.is_some())
        .collect::<Vec<_>>();
    // The first signing is the earliest stored business instant, before any
    // wire-format truncation. A true instant tie keeps repository order.
    signed.sort_by_key(|row| row.signed_at);
    signed.into_iter().next()
}

struct Event<'a> {
    key: String,
    stage: &'a str,
    event_type: &'a str,
    occurred_at: DateTime<Utc>,
    actor: Option<Uuid>,
    result: String,
    source_type: &'a str,
    source_id: Uuid,
    evidence: String,
}

fn event_value(event: Event<'_>, users: &HashMap<Uuid, String>) -> Result<Value, Error> {
    Ok(json!({
        "eventKey":event.key,"stage":event.stage,"stageLabel":guidance::stage_label(event.stage),
        "eventType":event.event_type,"occurredAt":iso(event.occurred_at)?,"actorUserId":event.actor,
        "actorName":event.actor.and_then(|id| users.get(&id)),"resultLabel":event.result,
        "sourceType":event.source_type,"sourceId":event.source_id,"evidenceLabel":event.evidence,"isAuthoritative":true,
    }))
}

fn timeline_events(
    project: &ProjectRow,
    facts: &Facts,
    users: &HashMap<Uuid, String>,
) -> Result<Vec<Value>, Error> {
    let mut events = vec![Event {
        key: "project-created".into(),
        stage: "assessment",
        event_type: "stage-entered",
        occurred_at: project.created_at,
        actor: project.created_by,
        result: "项目创建".into(),
        source_type: "project",
        source_id: project.id,
        evidence: project.project_no.clone(),
    }];
    if let Some(row) = facts.contract.as_ref()
        && let Some(occurred_at) = row.signed_at
    {
        events.push(Event {
            key: format!("contract-signed:{}", row.id),
            stage: "contracting",
            event_type: "stage-completed",
            occurred_at,
            actor: row.updated_by.or(row.created_by),
            result: "合同签约完成".into(),
            source_type: "contract",
            source_id: row.id,
            evidence: row.contract_no.clone(),
        });
    }
    if let Some(row) = facts.handover.as_ref() {
        events.push(Event {
            key: format!("project-handover-confirmed:{}", row.id),
            stage: "handover",
            event_type: "stage-completed",
            occurred_at: row.confirmed_at,
            actor: row.confirmed_by,
            result: "项目移交完成".into(),
            source_type: "project-handover",
            source_id: row.id,
            evidence: "移交确认".into(),
        });
    }
    if let Some(row) = facts.acceptance.as_ref() {
        let kind = match row.acceptance_type.as_str() {
            "stage-outcome" => "阶段成果确认",
            "stage-acceptance" => "阶段验收",
            "final-acceptance" => "最终验收",
            _ => "undefined",
        };
        let result = match row.acceptance_result.as_str() {
            "accepted" => "已通过",
            "conditional" => "有条件通过",
            "rejected" => "未通过",
            _ => "undefined",
        };
        events.push(Event {
            key: format!("acceptance-confirmed:{}", row.id),
            stage: "acceptance",
            event_type: "stage-completed",
            occurred_at: row.confirmed_at,
            actor: row.confirmed_by,
            result: format!("{kind}{result}"),
            source_type: "acceptance-record",
            source_id: row.id,
            evidence: row.evidence_summary.clone(),
        });
    }
    if let Some(row) = facts.completion.as_ref() {
        let result = match row.completion_result.as_str() {
            "completed" => "项目已完成",
            "conditional-completed" => "项目有条件完成",
            _ => "undefined",
        };
        events.push(Event {
            key: format!("project-completed:{}", row.id),
            stage: "completed",
            event_type: "stage-completed",
            occurred_at: row.completed_at,
            actor: row.completed_by,
            result: result.into(),
            source_type: "project-completion-record",
            source_id: row.id,
            evidence: row.evidence_summary.clone(),
        });
    }
    if let Some(row) = facts.archive.as_ref() {
        events.push(Event {
            key: format!("project-archived:{}", row.id),
            stage: &row.archive_anchor_stage,
            event_type: "milestone",
            occurred_at: row.archived_at,
            actor: row.archived_by,
            result: format!("项目归档：{}", row.archive_summary),
            source_type: "project-archive-record",
            source_id: row.id,
            evidence: row.evidence_summary.clone(),
        });
    }
    if let Some(occurred_at) = project.closed_at {
        events.push(Event {
            key: "project-closed".into(),
            stage: &project.current_stage,
            event_type: "stage-completed",
            occurred_at,
            actor: project.updated_by,
            result: project
                .closed_reason
                .as_deref()
                .filter(|value| !value.is_empty())
                .map_or_else(|| "项目关闭".into(), |value| format!("项目关闭：{value}")),
            source_type: "project",
            source_id: project.id,
            evidence: project
                .closed_reason
                .clone()
                .unwrap_or_else(|| "项目关闭".into()),
        });
    }
    let comparator = collator()?.as_borrowed();
    events.sort_by(|left, right| {
        left.occurred_at
            .cmp(&right.occurred_at)
            .then_with(|| comparator.compare(&left.key, &right.key))
    });
    // Serialize only after ordering by the complete stored business instant.
    // Equal millisecond display strings do not erase a sub-millisecond order.
    events
        .into_iter()
        .map(|event| event_value(event, users))
        .collect()
}

fn collator() -> Result<&'static Collator, Error> {
    static VALUE: OnceLock<Result<Collator, ()>> = OnceLock::new();
    VALUE
        .get_or_init(|| {
            let locale: icu_locale_core::Locale = "en-US".parse().map_err(|_| ())?;
            let mut preferences: CollatorPreferences = locale.into();
            preferences.case_first = Some(CollationCaseFirst::False);
            preferences.numeric_ordering = Some(CollationNumericOrdering::False);
            let mut options = CollatorOptions::default();
            options.strength = Some(Strength::Tertiary);
            options.alternate_handling = Some(AlternateHandling::NonIgnorable);
            options.case_level = Some(CaseLevel::Off);
            Collator::try_new_unstable(&crate::roles::collation::NodeData, preferences, options)
                .map_err(|_| ())
        })
        .as_ref()
        .map_err(|_| Error::Internal)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id(value: u128) -> Uuid {
        Uuid::from_u128(value)
    }
    fn at(value: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(value)
            .unwrap_or_else(|_| panic!("test timestamp"))
            .with_timezone(&Utc)
    }
    fn project() -> ProjectRow {
        let time = at("2026-01-01T00:00:00Z");
        ProjectRow {
            id: id(1),
            project_no: "P-1".into(),
            project_name: "project".into(),
            source_lead_id: None,
            customer_id: None,
            customer_name: None,
            customer_project_no: None,
            status: "active".into(),
            current_stage: "completed".into(),
            owner_org_id: None,
            owner_user_id: None,
            planned_sign_at: None,
            closed_at: None,
            closed_reason: None,
            row_version: 1,
            created_at: time,
            created_by: Some(id(2)),
            updated_at: time,
            updated_by: Some(id(3)),
        }
    }
    fn contract(value: u128, signed: Option<&str>) -> Contract {
        Contract {
            id: id(value),
            contract_no: format!("C-{value}"),
            signed_at: signed.map(at),
            updated_by: None,
            created_by: Some(id(5)),
        }
    }

    #[test]
    fn first_contract_uses_the_earliest_complete_signing_instant() {
        let values = vec![
            contract(1, None),
            contract(2, Some("2026-02-01T00:00:00Z")),
            contract(3, Some("2026-01-01T00:00:00.123900Z")),
            contract(4, Some("2026-01-01T00:00:00.123100Z")),
        ];
        assert_eq!(first_signed_contract(values).map(|row| row.id), Some(id(4)));
        assert!(first_signed_contract(vec![contract(1, None)]).is_none());
        let tied = vec![
            contract(9, Some("2026-01-01T00:00:00.123100Z")),
            contract(8, Some("2026-01-01T00:00:00.123100Z")),
        ];
        assert_eq!(first_signed_contract(tied).map(|row| row.id), Some(id(9)));
    }

    #[test]
    fn current_stage_does_not_invent_facts_and_missing_actor_is_null() {
        let value = timeline_events(&project(), &Facts::default(), &HashMap::new())
            .unwrap_or_else(|_| panic!("timeline"));
        assert_eq!(value.len(), 1);
        assert_eq!(value[0]["eventKey"], "project-created");
        assert_eq!(value[0]["stage"], "assessment");
        assert_eq!(value[0]["sourceId"], id(1).to_string());
        assert!(value[0]["actorName"].is_null());
        assert_eq!(value[0].as_object().map(|value| value.len()), Some(12));
    }

    #[test]
    fn lifecycle_projection_preserves_sources_evidence_labels_actors_and_order() {
        let mut project = project();
        project.closed_at = Some(at("2026-01-02T00:00:00Z"));
        project.closed_reason = Some("".into());
        let facts = Facts {
            contract: Some(contract(6, Some("2025-12-01T00:00:00Z"))),
            handover: Some(Handover {
                id: id(7),
                confirmed_at: at("2026-01-03T00:00:00Z"),
                confirmed_by: Some(id(2)),
            }),
            acceptance: Some(Acceptance {
                id: id(8),
                acceptance_type: "final-acceptance".into(),
                acceptance_result: "conditional".into(),
                confirmed_at: at("2026-01-04T00:00:00.123999Z"),
                confirmed_by: None,
                evidence_summary: "验收依据".into(),
            }),
            completion: Some(Completion {
                id: id(9),
                completion_result: "conditional-completed".into(),
                completed_at: at("2026-01-04T00:00:00.123001Z"),
                completed_by: Some(id(2)),
                evidence_summary: "完成依据".into(),
            }),
            archive: Some(Archive {
                id: id(10),
                archive_anchor_stage: "closed-terminated".into(),
                archived_at: at("2026-01-05T00:00:00Z"),
                archived_by: Some(id(11)),
                archive_summary: "保留结论".into(),
                evidence_summary: "归档依据".into(),
            }),
        };
        let users = HashMap::from([(id(2), "负责人".into()), (id(5), "签约人".into())]);
        let events =
            timeline_events(&project, &facts, &users).unwrap_or_else(|_| panic!("timeline"));
        assert_eq!(events.len(), 7);
        assert_eq!(events[0]["sourceType"], "contract");
        assert_eq!(events[0]["actorName"], "签约人");
        assert_eq!(events[2]["eventKey"], "project-closed");
        assert_eq!(events[2]["resultLabel"], "项目关闭");
        assert_eq!(events[2]["evidenceLabel"], "");
        assert_eq!(events[4]["resultLabel"], "项目有条件完成");
        assert_eq!(events[5]["resultLabel"], "最终验收有条件通过");
        assert_eq!(events[4]["occurredAt"], events[5]["occurredAt"]);
        assert_eq!(events[6]["stage"], "closed-terminated");
        assert_eq!(events[6]["resultLabel"], "项目归档：保留结论");
        assert_eq!(events[6]["evidenceLabel"], "归档依据");
        assert!(events.iter().all(|event| event["isAuthoritative"] == true
            && event.as_object().map(|value| value.len()) == Some(12)));
    }

    #[test]
    fn only_equal_business_instants_use_the_event_key_tiebreaker() {
        let instant = at("2026-01-04T00:00:00.123001Z");
        let facts = Facts {
            acceptance: Some(Acceptance {
                id: id(8),
                acceptance_type: "final-acceptance".into(),
                acceptance_result: "accepted".into(),
                confirmed_at: instant,
                confirmed_by: None,
                evidence_summary: "验收事实".into(),
            }),
            completion: Some(Completion {
                id: id(9),
                completion_result: "completed".into(),
                completed_at: instant,
                completed_by: None,
                evidence_summary: "完成事实".into(),
            }),
            ..Facts::default()
        };
        let events = timeline_events(&project(), &facts, &HashMap::new())
            .unwrap_or_else(|_| panic!("timeline"));
        assert_eq!(events[1]["sourceType"], "acceptance-record");
        assert_eq!(events[2]["sourceType"], "project-completion-record");
    }
}
