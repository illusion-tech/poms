//! Project attachment authority uses the existing project Scope calculator.
//! These helpers lend the actual source/commit transaction to CommonSession.
use super::store::{Entity, Table};
use crate::{
    approval_common::{CommonSession, CommonState},
    attachment_storage::StorageFailure,
    auth::{model::ResolvedSession, projection::ProjectionRequestContext},
    contract_support::{Actor, Error, canonical_hash},
    database::Database,
    project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},
};
use axum::http::StatusCode;
use serde_json::{Value, json};
use sqlx::{Connection, PgConnection};
use std::{collections::BTreeSet, future::Future, pin::Pin};
use uuid::Uuid;

type Result<T> = std::result::Result<T, StorageFailure>;
type FutureResult<'a, T> = Pin<Box<dyn Future<Output = Result<T>> + Send + 'a>>;

#[derive(Clone)]
pub(super) enum Intent {
    Package {
        id: String,
    },
    Target {
        kind: String,
        id: String,
        write: bool,
    },
    Session {
        row: Value,
    },
    Attachment {
        id: String,
        mutation: bool,
        allow_own: bool,
    },
}

pub(super) struct Readable {
    pub attachment: Entity,
    pub links: Vec<Entity>,
    pub all_links: Vec<Entity>,
    pub own_only: bool,
}

fn actor(session: &ResolvedSession) -> Actor {
    Actor {
        id: session.user.user_id,
        request_id: None,
        session: session.clone(),
        request_context: ProjectionRequestContext {
            request_id: None,
            path: "/api/attachments".into(),
            method: None,
            ip: None,
            user_agent: None,
        },
    }
}
fn http(status: StatusCode, message: &str) -> StorageFailure {
    StorageFailure::http(status, message)
}
fn absent() -> StorageFailure {
    http(StatusCode::NOT_FOUND, "Attachment scope is unavailable")
}
fn denied() -> StorageFailure {
    http(
        StatusCode::FORBIDDEN,
        "Attachment action is outside the authorized scope",
    )
}
fn changed() -> StorageFailure {
    http(
        StatusCode::CONFLICT,
        "Attachment authorization or source changed",
    )
}
pub(super) fn sql_error(_: sqlx::Error) -> StorageFailure {
    StorageFailure::internal()
}
fn scope_error(error: Error) -> StorageFailure {
    match error {
        Error::NotFound(message) => StorageFailure::http(StatusCode::NOT_FOUND, message),
        Error::Forbidden(message) => StorageFailure::http(StatusCode::FORBIDDEN, message),
        Error::Conflict(message) | Error::CodedConflict { message, .. } => {
            StorageFailure::http(StatusCode::CONFLICT, message)
        }
        Error::BadRequest(message) => StorageFailure::http(StatusCode::BAD_REQUEST, message),
        Error::Unprocessable(message) | Error::CodedUnprocessable { message, .. } => {
            StorageFailure::http(StatusCode::UNPROCESSABLE_ENTITY, message)
        }
        _ => StorageFailure::internal(),
    }
}
pub(super) fn authorization_denied(error: &StorageFailure) -> bool {
    matches!(
        error.status,
        Some(StatusCode::NOT_FOUND | StatusCode::FORBIDDEN)
    )
}
fn uid(value: &Value, key: &str) -> Result<Uuid> {
    value[key]
        .as_str()
        .and_then(|s| s.parse().ok())
        .ok_or_else(changed)
}
fn parse_id(id: &str) -> Result<Uuid> {
    id.parse().map_err(|_| absent())
}
fn permission(actor: &Actor, key: &str) -> bool {
    actor
        .session
        .user
        .permissions
        .iter()
        .any(|p| p.as_str() == key)
}
fn target_permission(actor: &Actor, kind: &str, write: bool) -> bool {
    let mode = if write { "write" } else { "read" };
    match kind {
        "project" | "contract" | "project-handover" => {
            permission(actor, &format!("project:{mode}"))
        }
        "customer" | "lead" => permission(actor, &format!("{kind}:{mode}")),
        "sales-follow-up" => ["customer", "lead", "project"]
            .iter()
            .any(|kind| permission(actor, &format!("{kind}:{mode}"))),
        _ => false,
    }
}
fn security(actor: &Actor, level: Option<&str>) -> bool {
    match level {
        Some("normal" | "internal" | "sensitive") => true,
        Some("confidential" | "restricted") => [
            "contract:finance:sensitive:read",
            "operating:finance:sensitive:read",
            "commission:amount:sensitive:read",
            "platform:roles:manage",
        ]
        .iter()
        .any(|key| permission(actor, key)),
        _ => false,
    }
}
pub(super) fn project_kind(kind: &str) -> bool {
    matches!(kind, "project" | "contract" | "project-handover")
}

async fn run<T: Send + 'static>(
    database: &Database,
    operation: impl for<'c> FnOnce(&'c mut PgConnection) -> FutureResult<'c, T> + Send + 'static,
) -> Result<T> {
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut transaction = connection.begin().await?;
                let result = operation(&mut transaction).await;
                match result {
                    Ok(value) => {
                        transaction.commit().await?;
                        Ok(Ok(value))
                    }
                    Err(error) => {
                        transaction.rollback().await?;
                        Ok(Err(error))
                    }
                }
            })
        })
        .await
        .map_err(|_| StorageFailure::internal())?
}

async fn require(
    connection: &mut PgConnection,
    actor: &Actor,
    action: ProjectAction,
    target: ProjectActionTarget,
) -> Result<()> {
    let mut state = CommonState::default();
    let mut session = CommonSession::borrow(connection, &mut state);
    let proof = scope::require(&mut session, actor, action, target)
        .await
        .map_err(scope_error)?;
    if action == ProjectAction::ReadProjectAnchorOrIList && proof.scope_kind() != "full-project" {
        return Err(denied());
    }
    Ok(())
}

async fn prelock_projects(connection: &mut PgConnection, keys: &[(String, String)]) -> Result<()> {
    let mut projects = BTreeSet::new();
    for (kind, id) in keys {
        let id = parse_id(id)?;
        match kind.as_str() {
            "project" => {
                projects.insert(id);
            }
            "contract" | "project-handover" => {
                let sql = if kind == "contract" {
                    "SELECT project_id FROM poms.contract WHERE id=$1"
                } else {
                    "SELECT project_id FROM poms.project_handover WHERE id=$1"
                };
                if let Some(project) = sqlx::query_scalar::<_, Uuid>(sql)
                    .bind(id)
                    .fetch_optional(&mut *connection)
                    .await
                    .map_err(sql_error)?
                {
                    projects.insert(project);
                }
            }
            _ => {}
        }
    }
    if !projects.is_empty() {
        sqlx::query("SELECT id FROM poms.project WHERE id=ANY($1) ORDER BY id FOR UPDATE")
            .bind(projects.into_iter().collect::<Vec<_>>())
            .fetch_all(&mut *connection)
            .await
            .map_err(sql_error)?;
    }
    Ok(())
}

async fn target(
    connection: &mut PgConnection,
    actor: &Actor,
    kind: &str,
    id: &str,
    write: bool,
) -> Result<()> {
    if !target_permission(actor, kind, write) {
        return Err(denied());
    }
    let id = parse_id(id)?;
    let project: Option<Uuid> = match kind {
        "project" => Some(id),
        "contract" => sqlx::query_scalar("SELECT project_id FROM poms.contract WHERE id=$1")
            .bind(id)
            .fetch_optional(&mut *connection)
            .await
            .map_err(sql_error)?,
        "project-handover" => {
            sqlx::query_scalar("SELECT project_id FROM poms.project_handover WHERE id=$1")
                .bind(id)
                .fetch_optional(&mut *connection)
                .await
                .map_err(sql_error)?
        }
        _ => None,
    };
    if project_kind(kind) {
        let project = project.ok_or_else(absent)?;
        require(
            connection,
            actor,
            ProjectAction::ReadProjectAnchorOrIList,
            ProjectActionTarget::Project { id: project },
        )
        .await?;
        if kind != "project" {
            let sql = if kind == "contract" {
                "SELECT project_id FROM poms.contract WHERE id=$1 FOR SHARE"
            } else {
                "SELECT project_id FROM poms.project_handover WHERE id=$1 FOR SHARE"
            };
            let locked: Option<Uuid> = sqlx::query_scalar(sql)
                .bind(id)
                .fetch_optional(&mut *connection)
                .await
                .map_err(sql_error)?;
            if locked != Some(project) {
                return Err(changed());
            }
        }
        return Ok(());
    }
    // Keep non-project target semantics. Closed SQL literals never interpolate input.
    let sql = match kind {
        "customer" => "SELECT EXISTS(SELECT 1 FROM poms.customer WHERE id=$1)",
        "lead" => "SELECT EXISTS(SELECT 1 FROM poms.lead WHERE id=$1)",
        "sales-follow-up" => "SELECT EXISTS(SELECT 1 FROM poms.sales_follow_up_record WHERE id=$1)",
        _ => return Err(denied()),
    };
    if !sqlx::query_scalar::<_, bool>(sql)
        .bind(id)
        .fetch_one(&mut *connection)
        .await
        .map_err(sql_error)?
    {
        return Err(absent());
    }
    Ok(())
}

pub(super) async fn target_access(
    database: &Database,
    session: &ResolvedSession,
    kind: &str,
    id: &str,
    write: bool,
) -> Result<()> {
    let actor = actor(session);
    let kind = kind.to_owned();
    let id = id.to_owned();
    run(database, move |connection| {
        Box::pin(async move { target(connection, &actor, &kind, &id, write).await })
    })
    .await
}

async fn condition(
    connection: &mut PgConnection,
    actor: &Actor,
    project: Uuid,
    parent: Uuid,
    child: Uuid,
    pending: bool,
) -> Result<()> {
    require(
        connection,
        actor,
        if pending {
            ProjectAction::CloseCompletionCondition
        } else {
            ProjectAction::ReadOwnCompletionTask
        },
        ProjectActionTarget::Condition {
            completion_record_id: parent,
            condition_id: child,
        },
    )
    .await?;
    let row: Option<(Uuid, Uuid, Uuid, String)> = sqlx::query_as("SELECT project_id,completion_record_id,responsible_user_id,status FROM poms.project_completion_condition WHERE id=$1 FOR SHARE")
        .bind(child).fetch_optional(&mut *connection).await.map_err(sql_error)?;
    let (actual_project, actual_parent, owner, status) = row.ok_or_else(absent)?;
    if actual_project != project || actual_parent != parent || owner != actor.id {
        return Err(absent());
    }
    if pending && status != "pending" {
        return Err(changed());
    }
    Ok(())
}

async fn session_scope(connection: &mut PgConnection, actor: &Actor, row: &Value) -> Result<()> {
    if row["project_scope_context_version"] == 1 {
        if row["operation_type"] != "create-attachment"
            || row["target_type"] != "project"
            || row["created_by"] != actor.id.to_string()
            || !row["base_attachment_id"].is_null()
        {
            return Err(denied());
        }
        condition(
            connection,
            actor,
            uid(row, "target_id")?,
            uid(row, "completion_record_id")?,
            uid(row, "completion_condition_id")?,
            true,
        )
        .await
    } else if row["project_scope_context_version"] == 0
        && row["completion_record_id"].is_null()
        && row["completion_condition_id"].is_null()
    {
        if let (Some(kind), Some(id)) = (row["target_type"].as_str(), row["target_id"].as_str()) {
            target(connection, actor, kind, id, true).await
        } else if let Some(id) = row["base_attachment_id"].as_str() {
            mutation(connection, actor, id).await
        } else {
            Ok(())
        }
    } else {
        Err(changed())
    }
}

pub(super) async fn upload_session(
    database: &Database,
    session: &ResolvedSession,
    row: &Value,
) -> Result<()> {
    let actor = actor(session);
    let row = row.clone();
    run(database,move|connection|Box::pin(async move {
        if let Some(id)=row["id"].as_str() {
            let actual:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.attachment_upload_session s WHERE id=$1")
                .bind(parse_id(id)?).fetch_optional(&mut *connection).await.map_err(sql_error)?;
            let actual=actual.ok_or_else(absent)?;
            if actual!=row {return Err(changed());}
            session_scope(connection,&actor,&actual).await?;
            let locked:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.attachment_upload_session s WHERE id=$1 FOR SHARE")
                .bind(parse_id(id)?).fetch_optional(&mut *connection).await.map_err(sql_error)?;
            if locked.as_ref()!=Some(&actual) {return Err(changed());}
            Ok(())
        } else {session_scope(connection,&actor,&row).await}
    })).await
}

async fn own_link(
    connection: &mut PgConnection,
    actor: &Actor,
    attachment: &Value,
    link: &Value,
) -> Result<bool> {
    if link["target_type"] != "project" || !permission(actor, "project:read") {
        return Ok(false);
    }
    let project = uid(link, "target_id")?;
    let attachment_id = uid(attachment, "id")?;
    let link_id = uid(link, "id")?;
    // Exact reference discovery returns only parent/child IDs and this file's frozen fact.
    let refs: Vec<Value> = sqlx::query_scalar(r#"SELECT jsonb_build_object('parent',c.completion_record_id,'child',c.id,'payload',e.source_payload,'hash',e.source_payload_hash)
      FROM poms.project_lifecycle_evidence_ref e
      LEFT JOIN poms.project_completion_condition_closure closure ON closure.id=e.condition_closure_id AND closure.project_id=e.project_id
      JOIN poms.project_completion_condition c ON c.id=COALESCE(e.completion_condition_id,closure.condition_id) AND c.project_id=e.project_id
      WHERE e.project_id=$1 AND e.attachment_link_id=$2 AND e.attachment_id=$3 AND c.responsible_user_id=$4
      ORDER BY c.id,e.id"#).bind(project).bind(link_id).bind(attachment_id).bind(actor.id).fetch_all(&mut *connection).await.map_err(sql_error)?;
    for reference in refs {
        let frozen = &reference["payload"]["source"];
        if canonical_hash(&reference["payload"])
            .map_err(scope_error)?
            .as_str()
            != reference["hash"].as_str().unwrap_or("")
        {
            return Err(changed());
        }
        if frozen["attachmentId"] != attachment["id"]
            || frozen["attachmentLinkId"] != link["id"]
            || frozen["attachmentRowVersion"] != attachment["row_version"]
            || frozen["checksumSha256"] != attachment["checksum_sha256"]
        {
            return Err(changed());
        }
        if !security(actor, frozen["securityLevel"].as_str()) {
            return Err(denied());
        }
        condition(
            connection,
            actor,
            project,
            uid(&reference, "parent")?,
            uid(&reference, "child")?,
            false,
        )
        .await?;
        return Ok(true);
    }
    if attachment["uploaded_by"] != actor.id.to_string() {
        return Ok(false);
    }
    let sessions: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.attachment_upload_session s WHERE completed_attachment_id=$1 AND target_type='project' AND target_id=$2 AND created_by=$3 AND project_scope_context_version=1 AND operation_type='create-attachment' AND status='completed' ORDER BY id")
        .bind(attachment_id).bind(project).bind(actor.id).fetch_all(&mut *connection).await.map_err(sql_error)?;
    for session in sessions {
        if !security(actor, session["security_level"].as_str()) {
            return Err(denied());
        }
        if attachment["version_no"] != 1
            || !attachment["previous_attachment_id"].is_null()
            || link["linked_by"] != actor.id.to_string()
            || link["relation_type"] != session["relation_type"]
            || session["checksum_sha256"] != attachment["checksum_sha256"]
            || session["completed_at"].is_null()
        {
            return Err(changed());
        }
        session_scope(connection, actor, &session).await?;
        return Ok(true);
    }
    Ok(false)
}

async fn exact(
    connection: &mut PgConnection,
    actor: &Actor,
    id: &str,
    allow_own: bool,
    required: Option<(&str, &str)>,
    active_required: bool,
) -> Result<Readable> {
    let attachment: Value =
        sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.attachment a WHERE id=$1")
            .bind(parse_id(id)?)
            .fetch_optional(&mut *connection)
            .await
            .map_err(sql_error)?
            .ok_or_else(absent)?;
    if active_required && attachment["status"] != "active" {
        return Err(absent());
    }
    if !security(actor, attachment["security_level"].as_str()) {
        return Err(denied());
    }
    let links: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(l) FROM poms.attachment_link l WHERE attachment_id=$1 AND status='active' ORDER BY target_type,target_id,id")
        .bind(parse_id(id)?).fetch_all(&mut *connection).await.map_err(sql_error)?;
    let mut project_keys = links
        .iter()
        .filter_map(|link| {
            Some((
                link["target_type"].as_str()?.to_owned(),
                link["target_id"].as_str()?.to_owned(),
            ))
        })
        .collect::<Vec<_>>();
    if let Some((kind, id)) = required {
        project_keys.push((kind.into(), id.into()));
    }
    prelock_projects(connection, &project_keys).await?;
    if let Some((kind, id)) = required {
        target(connection, actor, kind, id, false).await?;
    }
    let mut visible = Vec::new();
    let mut own_only = true;
    for link in &links {
        let kind = link["target_type"].as_str().ok_or_else(changed)?;
        let target_id = link["target_id"].as_str().ok_or_else(changed)?;
        match target(connection, actor, kind, target_id, false).await {
            Ok(()) => {
                own_only = false;
                visible.push(Entity::loaded(Table::Link, link.clone()));
            }
            Err(error) if authorization_denied(&error) => {
                if allow_own && own_link(connection, actor, &attachment, &link).await? {
                    visible.push(Entity::loaded(Table::Link, link.clone()));
                }
            }
            Err(error) => return Err(error),
        }
    }
    if let Some((kind, id)) = required
        && !visible
            .iter()
            .any(|link| link.str("target_type") == kind && link.str("target_id") == id)
    {
        return Err(absent());
    }
    if visible.is_empty() {
        return Err(absent());
    }
    // Scope/security locks precede exact attachment/link locks. Recheck the
    // discovery bytes after locking instead of retaining a pool precheck proof.
    let locked: Option<Value> =
        sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.attachment a WHERE id=$1 FOR SHARE")
            .bind(parse_id(id)?)
            .fetch_optional(&mut *connection)
            .await
            .map_err(sql_error)?;
    let locked_links: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(l) FROM poms.attachment_link l WHERE attachment_id=$1 AND status='active' ORDER BY target_type,target_id,id FOR SHARE")
        .bind(parse_id(id)?).fetch_all(&mut *connection).await.map_err(sql_error)?;
    if locked.as_ref() != Some(&attachment) || locked_links != links {
        return Err(changed());
    }
    Ok(Readable {
        attachment: Entity::loaded(Table::Attachment, attachment),
        links: visible,
        all_links: links
            .into_iter()
            .map(|row| Entity::loaded(Table::Link, row))
            .collect(),
        own_only,
    })
}

pub(super) async fn read(
    database: &Database,
    session: &ResolvedSession,
    id: &str,
    allow_own: bool,
    required: Option<(String, String)>,
) -> Result<Readable> {
    let actor = actor(session);
    let id = id.to_owned();
    run(database, move |connection| {
        Box::pin(async move {
            exact(
                connection,
                &actor,
                &id,
                allow_own,
                required.as_ref().map(|(k, i)| (k.as_str(), i.as_str())),
                true,
            )
            .await
        })
    })
    .await
}

pub(super) async fn read_row(
    database: &Database,
    session: &ResolvedSession,
    id: &str,
    allow_own: bool,
    active_required: bool,
    required: Option<(String, String)>,
) -> Result<Readable> {
    let actor = actor(session);
    let id = id.to_owned();
    run(database, move |connection| {
        Box::pin(async move {
            exact(
                connection,
                &actor,
                &id,
                allow_own,
                required.as_ref().map(|(k, i)| (k.as_str(), i.as_str())),
                active_required,
            )
            .await
        })
    })
    .await
}

async fn package(
    connection: &mut PgConnection,
    actor: &Actor,
    id: &str,
    expected: Option<&Value>,
) -> Result<()> {
    let row: Value = sqlx::query_scalar(
        "SELECT to_jsonb(p) FROM poms.attachment_download_package p WHERE id=$1",
    )
    .bind(parse_id(id)?)
    .fetch_optional(&mut *connection)
    .await
    .map_err(sql_error)?
    .ok_or_else(absent)?;
    target(
        connection,
        actor,
        "project-handover",
        row["handover_id"].as_str().ok_or_else(changed)?,
        false,
    )
    .await?;
    let project: Option<Uuid> =
        sqlx::query_scalar("SELECT project_id FROM poms.project_handover WHERE id=$1 FOR SHARE")
            .bind(uid(&row, "handover_id")?)
            .fetch_optional(&mut *connection)
            .await
            .map_err(sql_error)?;
    if project != Some(uid(&row, "project_id")?) {
        return Err(changed());
    }
    let current: Option<Value> = sqlx::query_scalar(
        "SELECT to_jsonb(p) FROM poms.attachment_download_package p WHERE id=$1 FOR SHARE",
    )
    .bind(parse_id(id)?)
    .fetch_optional(&mut *connection)
    .await
    .map_err(sql_error)?;
    if current.as_ref() != Some(&row) || expected.is_some_and(|value| value != &row) {
        return Err(changed());
    }
    let items:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(i) FROM poms.attachment_download_package_item i WHERE package_id=$1 ORDER BY attachment_id,id FOR SHARE")
        .bind(parse_id(id)?).fetch_all(&mut *connection).await.map_err(sql_error)?;
    let mut included = BTreeSet::new();
    for item in items {
        if item["handover_id"] != row["handover_id"] {
            return Err(changed());
        }
        if item["status"] == "included" {
            included.insert(uid(&item, "attachment_id")?);
        }
    }
    if included.is_empty() && row["status"] == "ready" {
        return Err(changed());
    }
    if row["status"] == "ready" {
        let declared = row["manifest_summary"]["includedAttachmentIds"]
            .as_array()
            .ok_or_else(changed)?
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .and_then(|v| v.parse::<Uuid>().ok())
                    .ok_or_else(changed)
            })
            .collect::<Result<BTreeSet<_>>>()?;
        if declared != included {
            return Err(changed());
        }
    }
    let attachments: Vec<Value> = sqlx::query_scalar(
        "SELECT to_jsonb(a) FROM poms.attachment a WHERE id=ANY($1) ORDER BY id FOR SHARE",
    )
    .bind(included.iter().copied().collect::<Vec<_>>())
    .fetch_all(&mut *connection)
    .await
    .map_err(sql_error)?;
    if attachments.len() != included.len() {
        return Err(changed());
    }
    for attachment in attachments {
        // K's frozen ordinary-batch policy permits only normal/internal. Do not
        // re-certify old ZIP row versions/hashes that its schema never captured.
        if attachment["status"] != "active"
            || !matches!(
                attachment["security_level"].as_str(),
                Some("normal" | "internal")
            )
        {
            return Err(denied());
        }
    }
    Ok(())
}
pub(super) async fn read_package(
    database: &Database,
    session: &ResolvedSession,
    row: &Value,
) -> Result<()> {
    let actor = actor(session);
    let row = row.clone();
    let id = uid(&row, "id")?.to_string();
    run(database, move |connection| {
        Box::pin(async move { package(connection, &actor, &id, Some(&row)).await })
    })
    .await
}

async fn mutation(connection: &mut PgConnection, actor: &Actor, id: &str) -> Result<()> {
    let links: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(l) FROM poms.attachment_link l WHERE attachment_id=$1 AND status='active' ORDER BY target_type,target_id,id")
        .bind(parse_id(id)?).fetch_all(&mut *connection).await.map_err(sql_error)?;
    let purposes:Vec<Uuid>=sqlx::query_scalar("SELECT target_id FROM poms.attachment_upload_session WHERE completed_attachment_id=$1 AND project_scope_context_version=1 ORDER BY target_id")
        .bind(parse_id(id)?).fetch_all(&mut *connection).await.map_err(sql_error)?;
    let mut keys = links
        .iter()
        .filter_map(|link| {
            Some((
                link["target_type"].as_str()?.to_owned(),
                link["target_id"].as_str()?.to_owned(),
            ))
        })
        .collect::<Vec<_>>();
    keys.extend(purposes.iter().map(|id| ("project".into(), id.to_string())));
    prelock_projects(connection, &keys).await?;
    for project in purposes {
        target(connection, actor, "project", &project.to_string(), true).await?;
    }
    for link in links
        .iter()
        .filter(|link| project_kind(link["target_type"].as_str().unwrap_or("")))
    {
        target(
            connection,
            actor,
            link["target_type"].as_str().ok_or_else(changed)?,
            link["target_id"].as_str().ok_or_else(changed)?,
            true,
        )
        .await?;
    }
    Ok(())
}
pub(super) async fn authorize_mutation(
    database: &Database,
    session: &ResolvedSession,
    id: &str,
) -> Result<()> {
    let actor = actor(session);
    let id = id.to_owned();
    run(database, move |connection| {
        Box::pin(async move { mutation(connection, &actor, &id).await })
    })
    .await
}

pub(super) async fn center_links(
    database: &Database,
    session: &ResolvedSession,
) -> Result<Vec<Entity>> {
    let actor = actor(session);
    run(database,move|connection|Box::pin(async move {
        let keys:Vec<(String,Uuid)>=sqlx::query_as("SELECT DISTINCT target_type,target_id FROM poms.attachment_link WHERE status='active' AND target_type IN ('customer','lead','project','contract') ORDER BY target_type,target_id")
            .fetch_all(&mut *connection).await.map_err(sql_error)?;
        prelock_projects(connection,&keys.iter().map(|(kind,id)|(kind.clone(),id.to_string())).collect::<Vec<_>>()).await?;
        let mut result=Vec::new();
        for (kind,id) in keys {
            match target(connection,&actor,&kind,&id.to_string(),false).await {
                Ok(())=>{}, Err(error) if authorization_denied(&error)=>continue, Err(error)=>return Err(error),
            }
            let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(l) FROM poms.attachment_link l WHERE target_type=$1 AND target_id=$2 AND status='active' ORDER BY linked_at DESC")
                .bind(&kind).bind(id).fetch_all(&mut *connection).await.map_err(sql_error)?;
            result.extend(rows.into_iter().map(|row|Entity::loaded(Table::Link,row)));
        }
        Ok(result)
    })).await
}

/// Runs inside the existing attachment flush transaction, before any write.
pub(super) async fn recheck(
    connection: &mut PgConnection,
    session: &ResolvedSession,
    intents: &[Intent],
    entities: &[Entity],
) -> Result<()> {
    let actor = actor(session);
    let mut lock_keys = Vec::new();
    let mut source_ids = BTreeSet::new();
    for entity in entities {
        if matches!(entity.table, Table::Session | Table::Link) {
            if let (Some(kind), Some(id)) = (
                entity.data["target_type"].as_str(),
                entity.data["target_id"].as_str(),
            ) {
                lock_keys.push((kind.to_owned(), id.to_owned()));
            }
        }
        if entity.table == Table::Attachment && entity.original.is_some() {
            source_ids.insert(parse_id(&entity.id())?);
        }
    }
    for intent in intents {
        match intent {
            Intent::Target { kind, id, .. } => lock_keys.push((kind.clone(), id.clone())),
            Intent::Session { row } => {
                if let (Some(kind), Some(id)) =
                    (row["target_type"].as_str(), row["target_id"].as_str())
                {
                    lock_keys.push((kind.to_owned(), id.to_owned()));
                }
            }
            Intent::Attachment { id, .. } => {
                source_ids.insert(parse_id(id)?);
            }
            Intent::Package { id } => {
                let project: Option<Uuid> = sqlx::query_scalar(
                    "SELECT project_id FROM poms.attachment_download_package WHERE id=$1",
                )
                .bind(parse_id(id)?)
                .fetch_optional(&mut *connection)
                .await
                .map_err(sql_error)?;
                if let Some(project) = project {
                    lock_keys.push(("project".into(), project.to_string()));
                }
            }
        }
    }
    if !source_ids.is_empty() {
        let ids = source_ids.into_iter().collect::<Vec<_>>();
        let actual:Vec<(String,Uuid)>=sqlx::query_as("SELECT target_type,target_id FROM poms.attachment_link WHERE attachment_id=ANY($1) AND status='active' UNION SELECT 'project',target_id FROM poms.attachment_upload_session WHERE completed_attachment_id=ANY($1) AND project_scope_context_version=1")
            .bind(ids).fetch_all(&mut *connection).await.map_err(sql_error)?;
        lock_keys.extend(actual.into_iter().map(|(kind, id)| (kind, id.to_string())));
    }
    prelock_projects(connection, &lock_keys).await?;
    let mut purpose_ids = BTreeSet::new();
    for session in entities
        .iter()
        .filter(|e| e.table == Table::Session && e.data["project_scope_context_version"] == 1)
    {
        session_scope(connection, &actor, &session.data).await?;
        if session.str("status") == "completed" && !session.dirty().is_empty() {
            let id = session.data["completed_attachment_id"]
                .as_str()
                .ok_or_else(changed)?;
            let attachment = entities
                .iter()
                .find(|e| e.table == Table::Attachment && e.id() == id && e.original.is_none())
                .ok_or_else(changed)?;
            if attachment.str("uploaded_by") != actor.id.to_string()
                || attachment.data["version_no"] != 1
                || !attachment.data["previous_attachment_id"].is_null()
            {
                return Err(denied());
            }
            let links = entities
                .iter()
                .filter(|e| {
                    e.table == Table::Link && e.str("attachment_id") == id && e.original.is_none()
                })
                .collect::<Vec<_>>();
            if links.len() != 1
                || links[0].str("target_type") != "project"
                || links[0].data["target_id"] != session.data["target_id"]
                || links[0].str("linked_by") != actor.id.to_string()
                || links[0].data["relation_type"] != session.data["relation_type"]
            {
                return Err(denied());
            }
            purpose_ids.insert(id.to_owned());
        }
    }
    for entity in entities {
        if entity.table == Table::Attachment
            && entity.original.is_some()
            && !entity.dirty().is_empty()
        {
            mutation(connection, &actor, &entity.id()).await?;
        }
        if entity.table == Table::Link
            && (entity.original.is_none() || !entity.dirty().is_empty())
            && project_kind(entity.str("target_type"))
            && !purpose_ids.contains(entity.str("attachment_id"))
        {
            target(
                connection,
                &actor,
                entity.str("target_type"),
                entity.str("target_id"),
                true,
            )
            .await?;
        }
    }
    // The real Scope owns project/security locking. No HTTP-created proof is trusted.
    let mut targets = BTreeSet::new();
    for intent in intents {
        if let Intent::Target { kind, id, write } = intent {
            targets.insert((kind.clone(), id.clone(), *write));
        }
    }
    for (kind, id, write) in targets {
        target(connection, &actor, &kind, &id, write).await?;
    }
    for intent in intents {
        match intent {
            Intent::Package { id } => package(connection, &actor, id, None).await?,
            Intent::Target { .. } => {}
            Intent::Session { row } => {
                // Existing row remains authoritative; proposed data is only used for a new INSERT.
                let actual: Option<Value> = sqlx::query_scalar(
                    "SELECT to_jsonb(s) FROM poms.attachment_upload_session s WHERE id=$1",
                )
                .bind(uid(row, "id")?)
                .fetch_optional(&mut *connection)
                .await
                .map_err(sql_error)?;
                let actual = actual.as_ref().unwrap_or(row);
                if actual["project_scope_context_version"] != row["project_scope_context_version"]
                    || actual["completion_record_id"] != row["completion_record_id"]
                    || actual["completion_condition_id"] != row["completion_condition_id"]
                    || actual["target_id"] != row["target_id"]
                    || actual["created_by"] != row["created_by"]
                {
                    return Err(changed());
                }
                session_scope(connection, &actor, actual).await?;
            }
            Intent::Attachment {
                id, mutation: true, ..
            } => mutation(connection, &actor, id).await?,
            Intent::Attachment { id, allow_own, .. } => {
                exact(connection, &actor, id, *allow_own, None, true).await?;
            }
        }
    }
    Ok(())
}
