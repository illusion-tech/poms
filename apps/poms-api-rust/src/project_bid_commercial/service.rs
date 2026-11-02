//! Native command/query semantics, including its observed INSERT-before-update
//! second-version failure. Guards and HTTP transport remain Root-owned.

use std::{collections::BTreeMap, error::Error as StdError, fmt};

use axum::http::StatusCode;
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    model::CreateRequest,
    store::{self, MaterialRow, Row, TimelineRow},
};
use crate::{
    auth::{
        js_json::JsString,
        model::{ResolvedSession, clock_now},
        store::flush_managed_session_at,
    },
    database::{Database, DbError},
    error::ApiError,
    projects::{
        model::{Wire, js, trim_js},
        store::{self as project_store, ProjectRow},
    },
};

#[derive(Debug)]
pub enum Error {
    NotFound(String),
    BadRequest(String),
    Database(DbError),
    Internal,
}

impl Error {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
}

impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("bid commercial operation failed")
    }
}

impl StdError for Error {}

impl From<DbError> for Error {
    fn from(value: DbError) -> Self {
        Self::Database(value)
    }
}

#[derive(Clone)]
pub struct Service {
    database: Database,
}

impl Service {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self, project_id: &str) -> Result<Wire, Error> {
        let key = project_id.to_owned();
        let rows = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = project_store::find(connection, &key).await? else {
                        return Ok(None);
                    };
                    store::list(connection, &project.id.to_string())
                        .await
                        .map(Some)
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;
        Ok(Wire::value(Value::Array(
            rows.iter().map(store::summary).collect(),
        )))
    }

    pub async fn workspace(
        &self,
        project_id: &str,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let key = project_id.to_owned();
        let facts = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = project_store::find(connection, &key).await? else {
                        return Ok(None);
                    };
                    let owner_name = if let Some(id) = project.owner_user_id {
                        project_store::user_names(connection, &[id])
                            .await?
                            .get(&id)
                            .cloned()
                    } else {
                        None
                    };
                    let owner_org_name = if let Some(id) = project.owner_org_id {
                        project_store::org_names(connection, &[id])
                            .await?
                            .get(&id)
                            .cloned()
                    } else {
                        None
                    };
                    let current = store::current(connection, &project.id.to_string()).await?;
                    let (materials, timelines) = if let Some(current) = current.as_ref() {
                        (
                            store::materials(connection, current.id).await?,
                            store::timelines(connection, current.id).await?,
                        )
                    } else {
                        (Vec::new(), Vec::new())
                    };
                    Ok(Some(WorkspaceFacts {
                        project,
                        current,
                        materials,
                        timelines,
                        owner_name,
                        owner_org_name,
                    }))
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;

        let WorkspaceFacts {
            project,
            current,
            materials,
            timelines,
            owner_name,
            owner_org_name,
        } = facts;
        let allowed_actions = allowed_actions(&project, session);
        let (current_process, reasons, next_step, fallback) = match current.as_ref() {
            Some(current) => (
                store::summary(current),
                blocking_reasons(current, &materials),
                next_step(current, &materials),
                current.owner_role.as_deref().unwrap_or("销售 / 商务"),
            ),
            None => (
                Value::Null,
                vec!["尚未形成招投标 / 商务竞标过程记录。".to_owned()],
                "明确是否需要投标、邀标、比选、商务竞标或直接商务报价路径。",
                "销售 / 商务",
            ),
        };
        Ok(Wire::value(json!({
            "projectId":project.id,"currentStage":project.current_stage,"status":project.status,
            "currentProcess":current_process,
            "materialItems":materials.iter().map(store::material_summary).collect::<Vec<_>>(),
            "timelineItems":timelines.iter().map(store::timeline_summary).collect::<Vec<_>>(),
            "blockingReasons":reasons,"nextStep":next_step,
            "ownerLabel":owner_label(owner_name,owner_org_name,fallback),
            "allowedActions":allowed_actions,"generatedAt":store::iso(clock_now())
        })))
    }

    pub async fn create(
        &self,
        project_id: &str,
        mut input: CreateRequest,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let key = project_id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = project_store::find(connection, &key).await? else {
                        return Ok(Err(Error::NotFound(format!("Project {key} not found"))));
                    };
                    if project.status == "closed" || !presigning_stage(&project.current_stage) {
                        return Ok(Err(Error::BadRequest(format!(
                            "Project {key} cannot record bid commercial process in stage {}",
                            project.current_stage
                        ))));
                    }
                    if let Some(message) = path_error(&input) {
                        return Ok(Err(Error::BadRequest(message.to_owned())));
                    }

                    let previous = store::current(connection, &key).await?;
                    input.tender_no = input
                        .tender_no
                        .map(trim_js)
                        .filter(|value| !value.is_empty());
                    input.bid_package_no = input
                        .bid_package_no
                        .map(trim_js)
                        .filter(|value| !value.is_empty());
                    let id = random_uuid()?;
                    let effective_at = clock_now();
                    let created_at = clock_now();
                    let updated_at = clock_now();
                    // UoW onUpdate hooks are sampled during flush preparation,
                    // before SQL groups; all entity INSERTs precede managed UPDATEs.
                    let flush_at = clock_now();
                    let version = previous
                        .as_ref()
                        .map_or(1, |row| i64::from(row.version) + 1);
                    let supersedes_id = previous.as_ref().map(|row| row.id);
                    let blocker_count = blocker_count(&input);
                    let mut original_text = original_text(&input);
                    // The newly created Native entity retains the route's UUID
                    // spelling until a later repository read canonicalizes it.
                    original_text.insert("projectId".to_owned(), js(&key));
                    let mut transaction = connection.begin().await?;
                    let result: Result<Row, sqlx::Error> = async {
                        // Actual Native D first-write order is parent, timeline,
                        // material. With an existing current the first INSERT
                        // hits its original partial unique and no UPDATE occurs.
                        let current = store::insert_parent(
                            &mut transaction,
                            &store::NewProcess {
                                id,
                                project_id: project.id,
                                version,
                                supersedes_id,
                                input: &input,
                                blocker_count,
                                effective_at,
                                created_at,
                                updated_at,
                                operator,
                            },
                        )
                        .await?;
                        store::insert_timelines(&mut transaction, id, &input.timeline_items)
                            .await?;
                        store::insert_materials(&mut transaction, id, &input.material_items)
                            .await?;
                        // D force-due placement is derived from the original UoW
                        // and the frozen C inserts-before-session witness. Root's
                        // D-specific runtime acceptance remains required.
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session_at(&mut transaction, pending, flush_at).await?;
                        }
                        if let Some(previous) = previous.as_ref() {
                            store::supersede(&mut transaction, previous, operator, flush_at)
                                .await?;
                        }
                        Ok(current)
                    }
                    .await;
                    match result {
                        Ok(current) => {
                            transaction.commit().await?;
                            Ok(Ok(Wire::object(store::summary(&current), &original_text)))
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?
    }
}

struct WorkspaceFacts {
    project: ProjectRow,
    current: Option<Row>,
    materials: Vec<MaterialRow>,
    timelines: Vec<TimelineRow>,
    owner_name: Option<String>,
    owner_org_name: Option<String>,
}

fn presigning_stage(value: &str) -> bool {
    matches!(
        value,
        "assessment" | "scope-confirmation" | "commercial-closure" | "contracting"
    )
}

fn allowed_actions(project: &ProjectRow, session: &ResolvedSession) -> Vec<&'static str> {
    let mut actions = vec!["view-bid-commercial-workspace"];
    let closed = project.status == "closed"
        || matches!(
            project.current_stage.as_str(),
            "closed-lost" | "closed-terminated"
        );
    if !closed
        && presigning_stage(&project.current_stage)
        && session
            .user
            .permissions
            .iter()
            .any(|value| value.as_ref() == "project:write")
    {
        actions.push("create-bid-commercial-process");
    }
    actions
}

fn owner_label(
    owner_name: Option<String>,
    owner_org_name: Option<String>,
    fallback: &str,
) -> String {
    if let (Some(name), Some(org)) = (&owner_name, &owner_org_name)
        && !name.is_empty()
        && !org.is_empty()
    {
        return format!("{name} / {org}");
    }
    owner_name
        .or(owner_org_name)
        .unwrap_or_else(|| fallback.to_owned())
}

fn path_error(input: &CreateRequest) -> Option<&'static str> {
    if input.bid_mode == "not-required" {
        return (input.decision != "not-required" || input.result_status != "not-applicable")
            .then_some("not-required bidMode must use not-required decision and not-applicable resultStatus");
    }
    if input.decision == "not-required" {
        return Some("not-required decision requires not-required bidMode");
    }
    if input.result_status == "not-applicable" {
        return Some("not-applicable resultStatus requires not-required bidMode");
    }
    None
}

fn blocker_count(input: &CreateRequest) -> i64 {
    let materials = input
        .material_items
        .iter()
        .filter(|item| {
            item.blocks_next_step
                && !matches!(item.material_status.as_str(), "ready" | "not-required")
        })
        .count() as i64;
    materials
        + i64::from(matches!(input.decision.as_str(), "pending" | "no-bid"))
        + i64::from(matches!(input.result_status.as_str(), "lost" | "cancelled"))
}

fn blocking_reasons(current: &Row, materials: &[MaterialRow]) -> Vec<String> {
    let mut reasons = Vec::new();
    if current.decision == "pending" {
        reasons.push("尚未完成是否参与竞标 / 商务竞标的决策。".to_owned());
    }
    if current.decision == "no-bid" {
        reasons
            .push("当前已决策不参与本次竞标，需要明确是否转入直接商务路径或关闭推进。".to_owned());
    }
    if matches!(current.result_status.as_str(), "lost" | "cancelled") {
        reasons.push("当前竞标结果不能直接进入报价与签约承接。".to_owned());
    }
    for material in materials {
        if material.blocks_next_step
            && !matches!(material.material_status.as_str(), "ready" | "not-required")
        {
            let state = if material.material_status == "missing" {
                "材料缺失"
            } else {
                "材料仍在处理中"
            };
            reasons.push(format!("{}：{state}", material.label));
        }
    }
    reasons
}

fn next_step(current: &Row, materials: &[MaterialRow]) -> &'static str {
    if !blocking_reasons(current, materials).is_empty() {
        return "先处理竞标决策、结果或材料阻断，再进入报价与毛利评审。";
    }
    if current.bid_mode == "not-required" {
        return "投标路径不适用，可以直接进入报价与毛利评审。";
    }
    if current.bid_mode == "direct-commercial" {
        return "沿直接商务路径进入报价与毛利评审，并保留本过程作为商务依据。";
    }
    if current.result_status == "won" {
        return "将中标 / 竞标结果带入报价与毛利评审或签约就绪判断。";
    }
    "补齐竞标过程依据，准备进入报价与毛利评审。"
}

fn original_text(input: &CreateRequest) -> BTreeMap<String, JsString> {
    let mut text = BTreeMap::from([("processSummary".to_owned(), input.process_summary.clone())]);
    for (key, value) in [
        ("decisionSummary", &input.decision_summary),
        ("resultSummary", &input.result_summary),
        ("tenderNo", &input.tender_no),
        ("bidPackageNo", &input.bid_package_no),
        ("ownerRole", &input.owner_role),
    ] {
        if let Some(value) = value {
            text.insert(key.to_owned(), value.clone());
        }
    }
    text
}

fn random_uuid() -> Result<Uuid, sqlx::Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes)
        .map_err(|_| sqlx::Error::Protocol("bid commercial UUID generation failed".into()))?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}
