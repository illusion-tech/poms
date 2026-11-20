//! Six original project operations, consuming the real customer service and
//! the existing request-local authentication and audit infrastructure.

use std::{collections::BTreeMap, error::Error, fmt, sync::Arc};

use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    model::{
        CreateProject, ProjectListQuery, ReassignProjectOwner, UpdateProject, Wire, js, trim_js,
    },
    store::{self, ProjectRow},
};
use crate::{
    auth::{
        guards::RequestMetadata,
        js_json::JsString,
        model::{ResolvedSession, SessionFlush, UserReadSnapshot, clock_now},
        projection::{
            self, ProjectionInput, ProjectionRequestContext, ProjectionUser, StringField,
        },
        service::AuthService,
        store::flush_managed_session,
    },
    business_numbers::{BusinessNumberScope, BusinessNumberService},
    compat::{json::Field, scalars::js_iso_string},
    customers::service::{CustomersError, CustomersService},
    database::{Database, DbError},
    error::ApiError,
    shared::generated::{ProjectStage, SensitiveFieldPackageKey},
};
use axum::http::StatusCode;

#[derive(Debug)]
pub enum ProjectsError {
    NotFound(String),
    BadRequest(String),
    Conflict(String),
    Customer(CustomersError),
    Database(DbError),
    Business(crate::contract_support::Error),
    Internal,
}

impl ProjectsError {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
            Self::Customer(error) => error.into_api_error(),
            Self::Business(error) => error.into_api_error(),
            Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
}

impl fmt::Display for ProjectsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("project operation failed")
    }
}
impl Error for ProjectsError {}
impl From<DbError> for ProjectsError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}
impl From<CustomersError> for ProjectsError {
    fn from(error: CustomersError) -> Self {
        Self::Customer(error)
    }
}

#[derive(Clone)]
pub struct ProjectsService {
    database: Database,
    customers: Arc<CustomersService>,
    auth: Arc<AuthService>,
}

impl ProjectsService {
    pub fn new(
        database: Database,
        customers: Arc<CustomersService>,
        auth: Arc<AuthService>,
    ) -> Self {
        Self {
            database,
            customers,
            auth,
        }
    }

    pub async fn create(
        &self,
        input: CreateProject,
        session: &ResolvedSession,
    ) -> Result<Wire, ProjectsError> {
        let CreateProject {
            project_name,
            customer_id,
            customer_project_no,
            current_stage,
            planned_sign_at,
        } = input;
        if current_stage.is_some_and(|stage| stage != ProjectStage::Assessment) {
            return Err(ProjectsError::BadRequest(
                "New projects must begin at assessment".into(),
            ));
        }
        // Preserve source preflight before BEGIN; this is A's actual internal
        // customer producer contract, not a duplicate customer SQL predicate.
        let operator = self
            .require_user(&session.user.user_id.to_string(), session)
            .await?;
        let customer = self.customers.require_active_customer(&customer_id).await?;
        let customer_project_no = match customer_project_no {
            Field::Value(value) => {
                let value = trim_js(value);
                (!value.is_empty()).then_some(value)
            }
            Field::Missing | Field::Null => None,
        };
        let mut original_text = BTreeMap::from([("projectName".into(), project_name.clone())]);
        if let Some(value) = customer_project_no.as_ref() {
            original_text.insert("customerProjectNo".into(), value.clone());
        }
        let planned_sign_at = match planned_sign_at {
            Field::Value(value) => Some(value),
            Field::Missing | Field::Null => None,
        };
        let numbers = BusinessNumberService::new(self.database.clone());
        let pending = session.pending_flush.clone();
        let project = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<ProjectRow, crate::contract_support::Error> = async {
                        // Native oracle02 and the independently accepted corrective:
                        // BEGIN(business), NEXT(independent physical connection), then
                        // project INSERT and pending-session UPDATE. A business failure
                        // rolls back the row/session but keeps the committed number.
                        let project_no = numbers
                            .next(BusinessNumberScope::Project, None)
                            .await
                            .map_err(|_| {
                                sqlx::Error::Protocol("project number persistence failed".into())
                            })?;
                        let now = clock_now();
                        let project = store::insert(
                            &mut transaction,
                            &store::NewProject {
                                project_no,
                                project_name: project_name.to_utf8_lossy(),
                                customer_id: customer.id,
                                customer_name: customer.display_name,
                                customer_project_no: customer_project_no
                                    .as_ref()
                                    .map(JsString::to_utf8_lossy),
                                current_stage: ProjectStage::Assessment.as_str().to_owned(),
                                owner_org_id: operator.primary_org_unit_id,
                                owner_user_id: operator.id,
                                planned_sign_at,
                                created_at: now,
                                updated_at: now,
                            },
                        )
                        .await?;
                        crate::project_action_authorization::ownership::record_new_origin_with_connection(
                            &mut transaction,project.id,operator.id,"direct-create",project.id,None).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(project)
                    }
                    .await;
                    match result {
                        Ok(project) => {
                            transaction.commit().await?;
                            Ok(Ok(project))
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await?
            .map_err(ProjectsError::Business)?;
        raw_summary(&project, &original_text)
    }

    pub async fn list(&self, input: ProjectListQuery) -> Result<Wire, ProjectsError> {
        let projects = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::list(connection, &input).await })
            })
            .await?;
        let users = projects
            .iter()
            .filter_map(|row| row.owner_user_id)
            .collect::<Vec<_>>();
        let orgs = projects
            .iter()
            .filter_map(|row| row.owner_org_id)
            .collect::<Vec<_>>();
        let ids = projects.iter().map(|row| row.id).collect::<Vec<_>>();
        let (users, orgs, signed) = tokio::try_join!(
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::user_names(connection, &users).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::org_names(connection, &orgs).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::latest_signed_at(connection, &ids).await
                })),
        )?;
        let mut result = projects.iter().map(|row| {
            let milestone = [row.closed_at, signed.get(&row.id).copied()].into_iter().flatten().max();
            Ok(json!({
                "id":row.id,"projectNo":row.project_no,"projectName":row.project_name,
                "customerId":row.customer_id,"customerName":row.customer_name,"customerProjectNo":row.customer_project_no,
                "currentStage":row.current_stage,"status":row.status,
                "ownerOrgName":row.owner_org_id.and_then(|id| orgs.get(&id)),
                "ownerName":row.owner_user_id.and_then(|id| users.get(&id)),
                "latestMilestoneAt":optional_iso(milestone)?,"createdAt":iso(row.created_at)?,
            }))
        }).collect::<Result<Vec<Value>, ProjectsError>>()?;
        result.sort_by(|left, right| {
            let a = left["latestMilestoneAt"].as_str();
            let b = right["latestMilestoneAt"].as_str();
            match (a, b) {
                (Some(a), Some(b)) if a != b => b.cmp(a),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                _ => right["createdAt"].as_str().cmp(&left["createdAt"].as_str()),
            }
        });
        Ok(Wire::value(Value::Array(result)))
    }

    pub async fn lookup(&self, project_no: JsString) -> Result<Wire, ProjectsError> {
        let supplied = project_no.to_utf8_lossy();
        let query = supplied.clone();
        let project = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_by_no(connection, &query).await })
            })
            .await?
            .ok_or_else(|| ProjectsError::NotFound(format!("Project no {supplied} not found")))?;
        Ok(Wire::value(summary(&project)?))
    }

    pub async fn get(
        &self,
        id: &str,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, ProjectsError> {
        let project_id = Uuid::parse_str(id)
            .map_err(|_| ProjectsError::BadRequest("Invalid project UUID".into()))?;
        let actor = scoped_actor(session, metadata);
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let mut state = crate::approval_common::CommonState::default();
                    state.trace.begin(true);
                    let mut participant =
                        crate::approval::context::PendingAuthentication::from_resolved(
                            &actor.session,
                        );
                    let result = {
                        let mut borrowed =
                            crate::approval_common::CommonSession::borrow_with_participant(
                                &mut transaction,
                                &mut state,
                                &mut participant,
                            );
                        borrowed.request_id = actor.request_id.clone();
                        match detail_with_session(&mut borrowed, project_id, &actor).await {
                            Ok(value) => crate::approval_common::store::flush(&mut borrowed)
                                .await
                                .map_err(crate::contract_support::Error::from)
                                .map(|()| value),
                            Err(error) => Err(error),
                        }
                    };
                    match result {
                        Ok(value) => match transaction.commit().await {
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
                            let rollback = transaction.rollback().await;
                            state.trace.rolled_back();
                            rollback?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await?
            .map_err(ProjectsError::Business)
    }

    pub async fn update(
        &self,
        id: &str,
        input: UpdateProject,
        session: &ResolvedSession,
    ) -> Result<Wire, ProjectsError> {
        let mut project = self.require_project(id).await?;
        if !editable(&project) {
            return Err(ProjectsError::BadRequest(format!(
                "Project {id} cannot be edited in status {}",
                project.status
            )));
        }
        let mut changes = store::ProjectUpdate::default();
        let mut original_text = BTreeMap::new();
        if let Some(value) = input.project_name {
            if js(&project.project_name) != value {
                changes.project_name = Some(value.to_utf8_lossy());
            }
            project.project_name = value.to_utf8_lossy();
            original_text.insert("projectName".into(), value);
        }
        // Native witness01 name+missing customer retains its original DB row:
        // the preceding managed name assignment does not auto-flush here.
        if let Some(id) = input.customer_id {
            let customer = self.customers.require_active_customer(&id).await?;
            if project.customer_id != Some(customer.id) {
                changes.customer_id = Some(Some(customer.id));
            }
            if project.customer_name.as_ref() != Some(&customer.display_name) {
                changes.customer_name = Some(Some(customer.display_name.clone()));
            }
            project.customer_id = Some(customer.id);
            project.customer_name = Some(customer.display_name);
        }
        match input.customer_project_no {
            Field::Missing => {}
            Field::Null => {
                if project.customer_project_no.is_some() {
                    changes.customer_project_no = Some(None);
                }
                project.customer_project_no = None;
            }
            Field::Value(value) => {
                let value = trim_js(value);
                let value = (!value.is_empty()).then_some(value);
                if project.customer_project_no.as_ref().map(|value| js(value)) != value {
                    changes.customer_project_no = Some(value.as_ref().map(JsString::to_utf8_lossy));
                }
                project.customer_project_no = value.as_ref().map(JsString::to_utf8_lossy);
                if let Some(value) = value {
                    original_text.insert("customerProjectNo".into(), value);
                }
            }
        }
        match input.planned_sign_at {
            Field::Missing => {}
            Field::Null => {
                if project.planned_sign_at.is_some() {
                    changes.planned_sign_at = Some(None);
                }
                project.planned_sign_at = None;
            }
            Field::Value(value) => {
                if project
                    .planned_sign_at
                    .map(|value| value.timestamp_millis())
                    != Some(value.timestamp_millis())
                {
                    changes.planned_sign_at = Some(Some(value));
                }
                project.planned_sign_at = Some(value);
            }
        }
        if project.updated_by != Some(session.user.user_id) {
            changes.updated_by = Some(Some(session.user.user_id));
        }
        project.updated_by = Some(session.user.user_id);
        let dirty = changes.is_dirty();
        let at = clock_now();
        let version = self
            .flush_project(&project, changes, at, session.pending_flush.as_ref())
            .await?;
        if dirty {
            project.row_version = version;
            project.updated_at = at;
        }
        raw_summary(&project, &original_text)
    }

    pub async fn reassign(
        &self,
        id: &str,
        input: ReassignProjectOwner,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, ProjectsError> {
        let project_id = Uuid::parse_str(id)
            .map_err(|_| ProjectsError::BadRequest("Invalid project UUID".into()))?;
        let actor = scoped_actor(session, metadata);
        // Preserve one existing service-owned outer transaction. All old-state
        // authorization, source reads and necessary writes now borrow it.
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let mut state = crate::approval_common::CommonState::default();
                    state.trace.begin(true);
                    let mut participant =
                        crate::approval::context::PendingAuthentication::from_resolved(
                            &actor.session,
                        );
                    let result = {
                        let mut borrowed =
                            crate::approval_common::CommonSession::borrow_with_participant(
                                &mut transaction,
                                &mut state,
                                &mut participant,
                            );
                        borrowed.request_id = actor.request_id.clone();
                        match reassign_with_session(&mut borrowed, project_id, &input, &actor).await
                        {
                            Ok(value) => crate::approval_common::store::flush(&mut borrowed)
                                .await
                                .map_err(crate::contract_support::Error::from)
                                .map(|()| value),
                            Err(error) => Err(error),
                        }
                    };
                    match result {
                        Ok(value) => match transaction.commit().await {
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
                            let rollback = transaction.rollback().await;
                            state.trace.rolled_back();
                            rollback?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await?
            .map_err(ProjectsError::Business)
    }

    async fn flush_project(
        &self,
        project: &ProjectRow,
        changes: store::ProjectUpdate,
        at: DateTime<Utc>,
        pending: Option<&SessionFlush>,
    ) -> Result<i32, ProjectsError> {
        let id = project.id;
        let version = project.row_version;
        if !changes.is_dirty() && pending.is_none() {
            return Ok(version);
        }
        let pending = pending.cloned();
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<i32, sqlx::Error> = async {
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if !changes.is_dirty() {
                            return Ok(version);
                        }
                        store::update(&mut transaction, id, version, &changes, at)
                            .await?
                            .ok_or_else(|| {
                                sqlx::Error::Protocol("project managed version conflict".into())
                            })
                    }
                    .await;
                    match result {
                        Ok(value) => {
                            transaction.commit().await?;
                            Ok(value)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?)
    }

    async fn require_user(
        &self,
        id: &str,
        session: &ResolvedSession,
    ) -> Result<UserReadSnapshot, ProjectsError> {
        // Native witness01 project-create has no second user SELECT after
        // authorization: a fully initialized exact-key findOne is served by
        // this request's managed principal, including its primary organization.
        if id == session.user_snapshot.id.to_string() {
            return Ok(session.user_snapshot.clone());
        }
        let key = id.to_owned();
        let mut user = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { crate::users::store::find(connection, &key).await })
            })
            .await?
            .ok_or_else(|| ProjectsError::NotFound(format!("Platform user {id} not found")))?;
        // The existing R2D W07 identity-map witness applies to the same
        // PlatformUser findOne mapping: fresh null leaves a managed nullable
        // primary organization intact; non-null fresh values still overwrite.
        if user.id == session.user_snapshot.id && user.primary_org_unit_id.is_none() {
            user.primary_org_unit_id = session.user_snapshot.primary_org_unit_id;
        }
        Ok(user)
    }

    async fn require_project(&self, id: &str) -> Result<ProjectRow, ProjectsError> {
        let key = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &key).await })
            })
            .await?
            .ok_or_else(|| ProjectsError::NotFound(format!("Project {id} not found")))
    }
}

fn iso(value: DateTime<Utc>) -> Result<String, ProjectsError> {
    js_iso_string(value).map_err(|_| ProjectsError::Internal)
}
fn optional_iso(value: Option<DateTime<Utc>>) -> Result<Option<String>, ProjectsError> {
    value.map(iso).transpose()
}
fn closed(project: &ProjectRow) -> bool {
    project.status == "closed"
        || matches!(
            project.current_stage.as_str(),
            "closed-lost" | "closed-terminated"
        )
}
fn editable(project: &ProjectRow) -> bool {
    matches!(project.status.as_str(), "active" | "blocked")
}
fn stage_reasons(project: &ProjectRow) -> Vec<&'static str> {
    let mut reasons = Vec::new();
    if project.status == "blocked" {
        reasons.push("project-status-blocked");
    }
    if closed(project) {
        reasons.push("project-closed");
    }
    reasons
}
fn allowed_actions(project: &ProjectRow, session: &ResolvedSession) -> Vec<&'static str> {
    let has = |permission: &str| {
        session
            .user
            .permissions
            .iter()
            .any(|value| value.as_ref() == permission)
    };
    let mut result = vec!["view-project-workspace"];
    if !closed(project) && has("project:write") {
        result.push("edit-project-basic-info");
    }
    if editable(project) && has("project:write") {
        result.push("reassign-project-owner");
    }
    if !closed(project)
        && matches!(
            project.current_stage.as_str(),
            "handover" | "execution" | "acceptance" | "completed"
        )
        && [
            "commission:assignments:manage",
            "commission:calculations:manage",
            "commission:payouts:manage",
            "commission:adjustments:manage",
            "commission:rule-versions:manage",
        ]
        .iter()
        .any(|value| has(value))
    {
        result.push("manage-project-commission");
    }
    result
}
fn summary(project: &ProjectRow) -> Result<Value, ProjectsError> {
    Ok(json!({
        "id":project.id,"projectNo":project.project_no,"projectName":project.project_name,"sourceLeadId":project.source_lead_id,
        "customerId":project.customer_id,"customerName":project.customer_name,"customerProjectNo":project.customer_project_no,
        "status":project.status,"currentStage":project.current_stage,"ownerOrgId":project.owner_org_id,"ownerUserId":project.owner_user_id,
        "plannedSignAt":optional_iso(project.planned_sign_at)?,"closedAt":optional_iso(project.closed_at)?,"closedReason":project.closed_reason,
        "rowVersion":project.row_version,"createdAt":iso(project.created_at)?,"createdBy":project.created_by,"updatedAt":iso(project.updated_at)?,"updatedBy":project.updated_by,
    }))
}

fn raw_summary(
    project: &ProjectRow,
    text: &BTreeMap<String, JsString>,
) -> Result<Wire, ProjectsError> {
    Ok(Wire::object(summary(project)?, text))
}

fn random_uuid() -> Result<Uuid, ProjectsError> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| ProjectsError::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}

fn scoped_actor(
    session: &ResolvedSession,
    metadata: &RequestMetadata,
) -> crate::contract_support::Actor {
    crate::contract_support::Actor {
        id: session.user.user_id,
        request_id: metadata.request_id.clone(),
        session: session.clone(),
        request_context: ProjectionRequestContext {
            request_id: metadata.request_id.clone(),
            path: metadata.path.clone(),
            method: metadata.method.clone(),
            ip: metadata.info.ip.clone(),
            user_agent: metadata.info.user_agent.clone(),
        },
    }
}

async fn reassign_with_session(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    project_id: Uuid,
    input: &ReassignProjectOwner,
    actor: &crate::contract_support::Actor,
) -> Result<Wire, crate::contract_support::Error> {
    use crate::{
        contract_support::{AuditWrite, Error as BusinessError, audit, new_uuid},
        project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},
    };
    let expected = input
        .expected_version
        .and_then(|v| i32::try_from(v).ok())
        .filter(|v| *v > 0)
        .ok_or_else(|| {
            BusinessError::BadRequest("expectedVersion must be a positive int4".into())
        })?;
    let owner_id = Uuid::parse_str(&input.owner_user_id)
        .map_err(|_| BusinessError::BadRequest("Invalid target owner UUID".into()))?;
    crate::contract_support::lock_project(session.connection, project_id).await?;
    let p = store::find(session.connection, &project_id.to_string())
        .await?
        .ok_or_else(|| BusinessError::NotFound("Project resource not found".into()))?;
    // Resolve only a requested/default target reference here. No target failure
    // is surfaced and no grant is produced before the old relationship gate.
    let default_org = matches!(&input.owner_org_id, Field::Missing);
    let org_id=match &input.owner_org_id{
        Field::Value(raw)=>Some(Uuid::parse_str(raw).map_err(|_|BusinessError::BadRequest("Invalid target organization UUID".into()))?),
        Field::Null=>None,
        Field::Missing=>sqlx::query_scalar("SELECT m.org_unit_id FROM poms.user_org_membership m JOIN poms.org_unit o ON o.id=m.org_unit_id AND o.is_active WHERE m.user_id=$1 AND m.status='active' AND m.revoked_at IS NULL AND m.membership_type='primary' ORDER BY m.id LIMIT 1").bind(owner_id).fetch_optional(&mut *session.connection).await?,
    };
    let proof = scope::require(
        session,
        actor,
        ProjectAction::OwnerReassign,
        ProjectActionTarget::OwnerReassignment {
            project_id,
            expected_version: expected,
            new_owner_user_id: owner_id,
            new_owner_org_id: org_id,
        },
    )
    .await?;
    let scope_kind = proof.scope_kind();
    if !matches!(scope_kind, "full-project" | "creator-first-assignment-only") {
        return Err(BusinessError::Forbidden(
            "This scope cannot assign an owner".into(),
        ));
    }
    let bootstrap = scope_kind == "creator-first-assignment-only";
    drop(proof);
    if !editable(&p) {
        return Err(BusinessError::Conflict(
            "Project status does not allow owner reassignment".into(),
        ));
    }
    if expected != p.row_version {
        return Err(BusinessError::Conflict(
            "Project owner version changed".into(),
        ));
    }
    p.row_version
        .checked_add(1)
        .ok_or_else(|| BusinessError::Conflict("Project version capacity exhausted".into()))?;
    let org_id = org_id.ok_or_else(|| {
        BusinessError::BadRequest("A real target organization membership is required".into())
    })?;
    if default_org {
        let current:Option<Uuid>=sqlx::query_scalar("SELECT m.org_unit_id FROM poms.user_org_membership m JOIN poms.org_unit o ON o.id=m.org_unit_id AND o.is_active WHERE m.user_id=$1 AND m.status='active' AND m.revoked_at IS NULL AND m.membership_type='primary' ORDER BY m.id LIMIT 1").bind(owner_id).fetch_optional(&mut *session.connection).await?;
        if current != Some(org_id) {
            return Err(BusinessError::Conflict(
                "Target primary organization changed; reload the whole command".into(),
            ));
        }
    }
    if p.owner_user_id == Some(owner_id) && p.owner_org_id == Some(org_id) {
        return Err(BusinessError::BadRequest(
            "Project already has this owner".into(),
        ));
    }
    let record_id = new_uuid()?;
    let at = clock_now();
    let record = store::OwnerReassignmentRecord {
        id: record_id,
        project_id,
        previous_owner_org_id: p.owner_org_id,
        previous_owner_user_id: p.owner_user_id,
        new_owner_org_id: Some(org_id),
        new_owner_user_id: owner_id,
        reason: trim_js(input.reason.clone()).to_utf8_lossy(),
        at,
        operator_id: actor.id,
    };
    store::insert_reassignment(session.connection, &record).await?;
    session
        .state
        .trace
        .inserted("project_owner_reassignment_record", &record_id.to_string());
    let changes = store::ProjectUpdate {
        owner_user_id: Some(Some(owner_id)),
        owner_org_id: Some(Some(org_id)),
        updated_by: Some(Some(actor.id)),
        ..Default::default()
    };
    if store::update(session.connection, project_id, expected, &changes, at)
        .await?
        .is_none()
    {
        return Err(BusinessError::Conflict(
            "Project owner version changed".into(),
        ));
    }
    if bootstrap {
        let version:i32=sqlx::query_scalar("SELECT row_version FROM poms.project_ownership_origin WHERE project_id=$1 AND bootstrap_state='available' FOR UPDATE").bind(project_id).fetch_optional(&mut *session.connection).await?.ok_or_else(||BusinessError::Conflict("First owner assignment was already consumed".into()))?;
        version.checked_add(1).ok_or_else(|| {
            BusinessError::Conflict("Ownership origin version capacity exhausted".into())
        })?;
        let changed=sqlx::query("UPDATE poms.project_ownership_origin SET bootstrap_state='consumed',first_personal_owner_user_id=$1,first_personal_assigned_at=$2,bootstrap_consumed_at=$2,bootstrap_assignment_record_id=$3,row_version=row_version+1 WHERE project_id=$4 AND row_version=$5 AND bootstrap_state='available'")
            .bind(owner_id).bind(at).bind(record_id).bind(project_id).bind(version).execute(&mut *session.connection).await?.rows_affected();
        if changed != 1 {
            return Err(BusinessError::Conflict(
                "First owner assignment was already consumed".into(),
            ));
        }
    }
    audit(session,actor,AuditWrite{operation_id:"ProjectController_reassignOwner".into(),target_type:"project".into(),target_id:project_id,project_id,contract_id:None,before:Some(json!({"ownerUserId":p.owner_user_id,"ownerOrgId":p.owner_org_id,"rowVersion":p.row_version})),after:Some(json!({"ownerUserId":owner_id,"ownerOrgId":org_id,"rowVersion":expected+1,"projectOwnerReassignmentRecordId":record_id})),reason:Some(record.reason),metadata:json!({"scopeKind":scope_kind,"bootstrapConsumed":bootstrap})}).await?;
    Ok(Wire::value(
        json!({"targetId":project_id,"projectOwnerReassignmentRecordId":record_id,"previousOwnerUserId":p.owner_user_id,"previousOwnerOrgId":p.owner_org_id,"newOwnerUserId":owner_id,"newOwnerOrgId":org_id,"businessStatusAfter":p.status}),
    ))
}

async fn detail_with_session(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    project_id: Uuid,
    actor: &crate::contract_support::Actor,
) -> Result<Wire, crate::contract_support::Error> {
    use crate::{
        contract_support::Error as BusinessError,
        project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},
    };
    let proof = scope::require(
        session,
        actor,
        ProjectAction::ReadProjectAnchor,
        ProjectActionTarget::Project { id: project_id },
    )
    .await?;
    let scope_kind = proof.scope_kind();
    let owner_write = proof.owner_write();
    drop(proof);
    let narrow = match scope_kind {
        "legacy-owner-anchor-only" => {
            // Only real basic anchor fields. No finance/D/approval list query,
            // no creator fallback, and no full-project required field padding.
            let view:Option<Value>=sqlx::query_scalar("SELECT jsonb_build_object('scopeKind','legacy-owner-anchor-only','projectId',p.id,'projectNo',p.project_no,'projectName',p.project_name,'currentStage',p.current_stage,'rowVersion',p.row_version,'ownerUserId',p.owner_user_id,'ownerOrgId',NULL,'sourceQualification','legacy-unverified','allowedActions','[]'::jsonb,'explanation',$3::text) FROM poms.project p WHERE p.id=$1 AND p.owner_user_id=$2 AND p.owner_org_id IS NULL")
                .bind(project_id).bind(actor.id).bind("历史项目缺少主责组织来源，仅可查看基础锚点；完成受控来源补正前不提供业务操作。").fetch_optional(&mut *session.connection).await?;
            Some(view.ok_or_else(|| BusinessError::NotFound("Project resource not found".into()))?)
        }
        "creator-first-assignment-only" => {
            let mut view:Value=sqlx::query_scalar("SELECT jsonb_build_object('scopeKind','creator-first-assignment-only','projectId',p.id,'projectNo',p.project_no,'projectRowVersion',p.row_version,'ownerOrgId',p.owner_org_id,'ownerUserId',NULL,'creatorUserId',o.creator_user_id,'ownershipOriginRowVersion',o.row_version) FROM poms.project p JOIN poms.project_ownership_origin o ON o.project_id=p.id WHERE p.id=$1 AND p.owner_user_id IS NULL AND o.bootstrap_state='available' AND o.creator_user_id=$2")
                .bind(project_id).bind(actor.id).fetch_optional(&mut *session.connection).await?.ok_or_else(||BusinessError::NotFound("Project resource not found".into()))?;
            view["allowedActions"] = json!(if actor
                .session
                .user
                .permissions
                .iter()
                .any(|p| p.as_str() == "project:write")
            {
                vec!["reassign-owner"]
            } else {
                vec![]
            });
            Some(view)
        }
        "full-project" => None,
        _ => return Err(BusinessError::NotFound("Project resource not found".into())),
    };
    if let Some(view) = narrow {
        crate::project_operating_common::schema::validate_public_value("ProjectDetailView", &view)?;
        return Ok(Wire::value(view));
    }
    let project = store::find(session.connection, &project_id.to_string())
        .await?
        .ok_or_else(|| BusinessError::NotFound("Project resource not found".into()))?;
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
    let contracts = store::contracts(session.connection, project_id).await?;
    let snapshot = store::approval_snapshot(session.connection, project_id).await?;
    let bid = store::current_bid(session.connection, project_id).await?;
    let lead = store::lead(session.connection, project.source_lead_id).await?;
    let latest = contracts.first();
    let mut projected = projection::plan(&ProjectionInput {
        field_package_key: SensitiveFieldPackageKey::ContractFinance,
        fields: vec![StringField {
            key: "field".into(),
            raw_value: latest.map(|r| r.signed_amount.clone()),
            display_text_when_full: latest
                .map(|r| format!("{} {}", r.signed_amount, r.currency_code)),
            masked_display_text: None,
            denied_display_text: None,
        }],
        user: Some(ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|p| p.as_str().to_owned())
                .collect(),
        }),
        target_type: "project".into(),
        target_id: project_id.to_string(),
        request_context: actor.request_context.clone(),
        mode_when_unauthorized: None,
        masked_display_text: None,
        denied_display_text: None,
    })
    .map_err(|_| BusinessError::Internal)?;
    if let Some(event) = projected.event {
        crate::auth::audit::insert_security_event(session.connection, &event).await?;
    }
    let signed_amount = projected
        .fields
        .remove("field")
        .ok_or(BusinessError::Internal)?;
    let approval = match snapshot.as_ref() {
        Some(s) => {
            json!({"summarySnapshotId":s.id,"summaryPackageKey":s.summary_package_key,"projectionLevel":s.projection_level,"exportPolicy":s.export_policy,"generatedAt":iso(s.generated_at).map_err(|_|BusinessError::Internal)?})
        }
        None => {
            json!({"summarySnapshotId":null,"summaryPackageKey":null,"projectionLevel":null,"exportPolicy":null,"generatedAt":null})
        }
    };
    let stage_id: Option<Uuid> =
        sqlx::query_scalar("SELECT current_stage_record_id FROM poms.project WHERE id=$1")
            .bind(project_id)
            .fetch_one(&mut *session.connection)
            .await?;
    let confirmation:Option<(Uuid,String,i32,i32,i32,Option<DateTime<Utc>>)>=sqlx::query_as("SELECT c.id,c.status,c.required_count,c.confirmed_count,(SELECT count(*)::integer FROM poms.confirmation_participant cp WHERE cp.confirmation_record_id=c.id AND cp.participant_status='pending'),c.confirmed_at FROM poms.project_handover h JOIN poms.confirmation_record c ON c.id=h.confirmation_record_id AND c.project_id=h.project_id AND c.target_type='project-handover' AND c.target_id=h.id WHERE h.project_id=$1 AND h.producer_version=1 AND h.is_current AND h.status IN ('draft','confirmed') ORDER BY h.id LIMIT 1")
        .bind(project_id).fetch_optional(&mut *session.connection).await?;
    let confirmation = match confirmation {
        Some((id, status, required, confirmed, pending, at)) => {
            json!({"confirmationRecordId":id,"status":status,"requiredCount":required,"confirmedCount":confirmed,"pendingCount":pending,"confirmedAt":at})
        }
        None => {
            json!({"confirmationRecordId":null,"status":"not_configured","requiredCount":0,"confirmedCount":0,"pendingCount":0,"confirmedAt":null})
        }
    };
    let mut actions = allowed_actions(&project, &actor.session);
    if !owner_write {
        actions.retain(|action| *action != "reassign-project-owner");
    }
    let mut result = summary(&project).map_err(|_| BusinessError::Internal)?;
    let extra = json!({"scopeKind":"full-project","projectRowVersion":project.row_version,"currentStageRecordId":stage_id,
        "ownerName":project.owner_user_id.and_then(|id|users.get(&id)),"ownerOrgName":project.owner_org_id.and_then(|id|orgs.get(&id)),
        "sourceLeadSummary":lead.as_ref().map(|r|json!({"id":r.id,"leadNo":r.lead_no,"leadName":r.lead_name,"customerId":r.customer_id,"customerName":r.customer_name,"status":r.status})),
        "stageSummary":{"currentStage":project.current_stage,"status":project.status,"plannedSignAt":optional_iso(project.planned_sign_at).map_err(|_|BusinessError::Internal)?,"closedAt":optional_iso(project.closed_at).map_err(|_|BusinessError::Internal)?,"closedReason":project.closed_reason,"blockingReasons":stage_reasons(&project)},
        "currentBidSummary":bid.as_ref().map_or_else(||json!({"bidProcessId":null,"bidStatus":"not_configured","resultStatus":null,"tenderNo":null,"bidPackageNo":null,"summary":null}),|r|json!({"bidProcessId":r.id,"bidStatus":r.current_stage,"resultStatus":r.result_status,"tenderNo":r.tender_no,"bidPackageNo":r.bid_package_no,"summary":r.process_summary})),
        "currentContractSummary":{"activeContractCount":contracts.iter().filter(|r|r.status=="active").count(),"latestContractId":latest.map(|r|r.id),"latestContractNo":latest.map(|r|&r.contract_no),"latestContractStatus":latest.map(|r|&r.status),"signedAmountProjection":signed_amount,"currencyCode":latest.map(|r|&r.currency_code),"signedAt":optional_iso(latest.and_then(|r|r.signed_at)).map_err(|_|BusinessError::Internal)?,"currentSnapshotId":latest.and_then(|r|r.current_snapshot_id)},
        "currentApprovalSummary":approval,"currentConfirmationSummary":confirmation,
        "summarySnapshotId":snapshot.as_ref().map(|r|r.id),"projectionLevel":snapshot.as_ref().map(|r|&r.projection_level),"exportPolicy":snapshot.as_ref().map(|r|&r.export_policy),"allowedActions":actions,"generatedAt":iso(clock_now()).map_err(|_|BusinessError::Internal)?,
    });
    result
        .as_object_mut()
        .ok_or(BusinessError::Internal)?
        .extend(extra.as_object().ok_or(BusinessError::Internal)?.clone());
    crate::project_operating_common::schema::validate_public_value("ProjectDetailView", &result)?;
    Ok(Wire::value(result))
}
