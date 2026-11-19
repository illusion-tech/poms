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
    Internal,
}

impl ProjectsError {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
            Self::Customer(error) => error.into_api_error(),
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
                    let result: Result<ProjectRow, sqlx::Error> = async {
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
                                current_stage: current_stage
                                    .unwrap_or(ProjectStage::Assessment)
                                    .as_str()
                                    .to_owned(),
                                owner_org_id: operator.primary_org_unit_id,
                                owner_user_id: operator.id,
                                planned_sign_at,
                                created_at: now,
                                updated_at: now,
                            },
                        )
                        .await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(project)
                    }
                    .await;
                    match result {
                        Ok(project) => {
                            transaction.commit().await?;
                            Ok(project)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
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
        let project = self.require_project(id).await?;
        let user_ids = project.owner_user_id.into_iter().collect::<Vec<_>>();
        let org_ids = project.owner_org_id.into_iter().collect::<Vec<_>>();
        let project_id = project.id;
        let lead_id = project.source_lead_id;
        let (users, orgs, contracts, snapshot, bid, lead) = tokio::try_join!(
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::user_names(connection, &user_ids).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::org_names(connection, &org_ids).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::contracts(connection, project_id).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::approval_snapshot(connection, project_id).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::current_bid(connection, project_id).await
                })),
            self.database
                .with_connection(move |connection| Box::pin(async move {
                    store::lead(connection, lead_id).await
                })),
        )?;
        let latest = contracts.first();
        let input = ProjectionInput {
            field_package_key: SensitiveFieldPackageKey::ContractFinance,
            fields: vec![StringField {
                key: "field".into(),
                raw_value: latest.map(|row| row.signed_amount.clone()),
                display_text_when_full: latest
                    .map(|row| format!("{} {}", row.signed_amount, row.currency_code)),
                masked_display_text: None,
                denied_display_text: None,
            }],
            user: Some(ProjectionUser {
                sub: session.user.user_id,
                username: session.user.username.clone(),
                permissions: session
                    .user
                    .permissions
                    .iter()
                    .map(|value| value.as_ref().to_owned())
                    .collect(),
            }),
            target_type: "project".into(),
            target_id: project.id.to_string(),
            request_context: ProjectionRequestContext {
                request_id: metadata.request_id.clone(),
                path: metadata.path.clone(),
                method: metadata.method.clone(),
                ip: metadata.info.ip.clone(),
                user_agent: metadata.info.user_agent.clone(),
            },
            mode_when_unauthorized: None,
            masked_display_text: None,
            denied_display_text: None,
        };
        let mut projected = projection::plan(&input).map_err(|_| ProjectsError::Internal)?;
        if let Some(event) = projected.event {
            self.auth
                .record_security_event_with_session(event, session.pending_flush.as_ref())
                .await
                .map_err(|_| ProjectsError::Internal)?;
        }
        let signed_amount = projected
            .fields
            .remove("field")
            .ok_or(ProjectsError::Internal)?;
        let approval = match snapshot.as_ref() {
            Some(snapshot) => {
                json!({"summarySnapshotId":snapshot.id,"summaryPackageKey":snapshot.summary_package_key,"projectionLevel":snapshot.projection_level,"exportPolicy":snapshot.export_policy,"generatedAt":iso(snapshot.generated_at)?})
            }
            None => {
                json!({"summarySnapshotId":null,"summaryPackageKey":null,"projectionLevel":null,"exportPolicy":null,"generatedAt":null})
            }
        };
        let mut result = summary(&project)?;
        let fields = result.as_object_mut().ok_or(ProjectsError::Internal)?;
        let extra = json!({
            "ownerName":project.owner_user_id.and_then(|id| users.get(&id)),
            "ownerOrgName":project.owner_org_id.and_then(|id| orgs.get(&id)),
            "sourceLeadSummary":lead.as_ref().map(|row| json!({"id":row.id,"leadNo":row.lead_no,"leadName":row.lead_name,"customerId":row.customer_id,"customerName":row.customer_name,"status":row.status})),
            "stageSummary":{"currentStage":project.current_stage,"status":project.status,"plannedSignAt":optional_iso(project.planned_sign_at)?,"closedAt":optional_iso(project.closed_at)?,"closedReason":project.closed_reason,"blockingReasons":stage_reasons(&project)},
            "currentBidSummary":bid.as_ref().map_or_else(|| json!({"bidProcessId":null,"bidStatus":"not_configured","resultStatus":null,"tenderNo":null,"bidPackageNo":null,"summary":null}), |row| json!({"bidProcessId":row.id,"bidStatus":row.current_stage,"resultStatus":row.result_status,"tenderNo":row.tender_no,"bidPackageNo":row.bid_package_no,"summary":row.process_summary})),
            "currentContractSummary":{
                "activeContractCount":contracts.iter().filter(|row| row.status == "active").count(),
                "latestContractId":latest.map(|row| row.id),"latestContractNo":latest.map(|row| &row.contract_no),"latestContractStatus":latest.map(|row| &row.status),
                "signedAmountProjection":signed_amount,"currencyCode":latest.map(|row| &row.currency_code),
                "signedAt":optional_iso(latest.and_then(|row| row.signed_at))?,"currentSnapshotId":latest.and_then(|row| row.current_snapshot_id),
            },
            "currentApprovalSummary":approval,
            "currentConfirmationSummary":{"confirmationRecordId":null,"status":"not_configured","requiredCount":0,"confirmedCount":0,"pendingCount":0,"confirmedAt":null},
            "summarySnapshotId":snapshot.as_ref().map(|row| row.id),"projectionLevel":snapshot.as_ref().map(|row| &row.projection_level),"exportPolicy":snapshot.as_ref().map(|row| &row.export_policy),
            "allowedActions":allowed_actions(&project, session),"generatedAt":iso(clock_now())?,
        });
        fields.extend(extra.as_object().ok_or(ProjectsError::Internal)?.clone());
        Ok(Wire::value(result))
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
    ) -> Result<Wire, ProjectsError> {
        let project = self.require_project(id).await?;
        if let Some(expected) = input.expected_version
            && i64::from(project.row_version) != expected
        {
            return Err(ProjectsError::Conflict(format!(
                "project version {expected} does not match current version {}",
                project.row_version
            )));
        }
        if !editable(&project) {
            return Err(ProjectsError::BadRequest(format!(
                "Project {id} cannot reassign owner in status {}",
                project.status
            )));
        }
        let target = self.require_user(&input.owner_user_id, session).await?;
        if !target.is_active {
            return Err(ProjectsError::BadRequest(format!(
                "Platform user {} is not active",
                input.owner_user_id
            )));
        }
        let next_org = match input.owner_org_id {
            Field::Missing => target.primary_org_unit_id.map(|value| value.to_string()),
            Field::Null => None,
            Field::Value(value) => Some(value),
        };
        if let Some(id) = next_org.as_ref() {
            let key = id.clone();
            let org = self
                .database
                .with_connection(move |connection| {
                    Box::pin(async move { crate::org_units::store::find(connection, &key).await })
                })
                .await?
                .ok_or_else(|| ProjectsError::NotFound(format!("Org unit {id} not found")))?;
            if !org.is_active {
                return Err(ProjectsError::BadRequest(format!(
                    "Org unit {id} is not active"
                )));
            }
        }
        // Keep original strict string identity, including valid uppercase input.
        let previous_user = project.owner_user_id.map(|value| value.to_string());
        let previous_org = project.owner_org_id.map(|value| value.to_string());
        if previous_user.as_deref() == Some(input.owner_user_id.as_str())
            && previous_org == next_org
        {
            return Err(ProjectsError::BadRequest(format!(
                "Project {id} already has the requested owner"
            )));
        }
        let owner_id =
            Uuid::parse_str(&input.owner_user_id).map_err(|_| ProjectsError::Internal)?;
        let org_id = next_org
            .as_ref()
            .map(|value| Uuid::parse_str(value))
            .transpose()
            .map_err(|_| ProjectsError::Internal)?;
        let record_id = random_uuid()?;
        let record = store::OwnerReassignmentRecord {
            id: record_id,
            project_id: project.id,
            previous_owner_org_id: project.owner_org_id,
            previous_owner_user_id: project.owner_user_id,
            new_owner_org_id: org_id,
            new_owner_user_id: owner_id,
            reason: trim_js(input.reason).to_utf8_lossy(),
            at: clock_now(),
            operator_id: session.user.user_id,
        };
        let mut changes = store::ProjectUpdate::default();
        if previous_user.as_deref() != Some(input.owner_user_id.as_str()) {
            changes.owner_user_id = Some(Some(owner_id));
        }
        if previous_org != next_org {
            changes.owner_org_id = Some(org_id);
        }
        if project.updated_by != Some(session.user.user_id) {
            changes.updated_by = Some(Some(session.user.user_id));
        }
        let pending = session.pending_flush.clone();
        let project_id = project.id;
        let version = project.row_version;
        let at = clock_now();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(), sqlx::Error> = async {
                        // Native witness01: CREATE(history), UPDATE(managed session),
                        // UPDATE(project CAS), COMMIT. A CAS miss rolls all three back.
                        store::insert_reassignment(&mut transaction, &record).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if store::update(&mut transaction, project_id, version, &changes, at)
                            .await?
                            .is_none()
                        {
                            return Err(sqlx::Error::Protocol(
                                "project managed version conflict".into(),
                            ));
                        }
                        Ok(())
                    }
                    .await;
                    match result {
                        Ok(()) => {
                            transaction.commit().await?;
                            Ok(())
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        Ok(Wire::value(json!({
            "targetId":project.id,"projectOwnerReassignmentRecordId":record_id,
            "previousOwnerUserId":project.owner_user_id,"previousOwnerOrgId":project.owner_org_id,
            "newOwnerUserId":input.owner_user_id,"newOwnerOrgId":next_org,"businessStatusAfter":project.status,
        })))
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
