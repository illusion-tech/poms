//! The 67 frozen operations share one authorization and outer transaction adapter.
use super::{Actor, Error};
pub use crate::project_operating_common::ResourceKeys;
use crate::{
    approval::context::PendingAuthentication,
    approval_common::{CommonSession, CommonState, store},
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
        projection::ProjectionRequestContext,
    },
    database::Database,
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{OriginalUri, Request, State},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::any,
};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::Connection;
use std::{collections::{BTreeMap, BTreeSet}, sync::OnceLock};
use uuid::Uuid;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Operation {
    group: String,
    method: String,
    path: String,
    operation_id: String,
    permissions: Vec<String>,
    success_status: u16,
    #[serde(default)]
    response_dto: Option<String>,
}
#[derive(Deserialize)]
struct Inventory {
    operations: Vec<Operation>,
}
fn operations() -> &'static [Operation] {
    static OPS: OnceLock<Vec<Operation>> = OnceLock::new();
    OPS.get_or_init(|| {
        serde_json::from_str::<Inventory>(include_str!(
            "../../../../tools/rust-r4ghi/combined-operation-map02.json"
        ))
        .unwrap_or_else(|_| panic!("invalid frozen R4 operation map"))
        .operations
    })
}

struct Matched {
    id: Option<String>,
    keys: BTreeMap<String, String>,
    canonical: String,
}
fn matched(template: &str, path: &str) -> Option<Matched> {
    let path = path.strip_suffix('/').unwrap_or(path);
    if path.ends_with('/') {
        return None;
    }
    let expected = template.split('/').collect::<Vec<_>>();
    let actual = path.split('/').collect::<Vec<_>>();
    if expected.len() != actual.len() {
        return None;
    }
    let mut canonical = Vec::new();
    let mut id = None;
    let mut keys = BTreeMap::new();
    for (pattern, part) in expected.iter().zip(actual) {
        if pattern.starts_with('{') {
            let close = pattern.find('}')?;
            let suffix = &pattern[close + 1..];
            let end = part.len().checked_sub(suffix.len())?;
            let (identity, tail) = part.get(..end).zip(part.get(end..))?;
            if identity.is_empty() || !tail.eq_ignore_ascii_case(suffix) {
                return None;
            }
            id = Some(identity.to_owned());
            let name = pattern.get(1..close)?;
            if keys.insert(name.to_owned(), identity.to_owned()).is_some() { return None; }
            canonical.push(format!("{identity}{suffix}"));
        } else {
            if !pattern.eq_ignore_ascii_case(part) {
                return None;
            }
            canonical.push((*pattern).into());
        }
    }
    Some(Matched {
        id,
        keys,
        canonical: canonical.join("/"),
    })
}
fn operation(method: &Method, path: &str) -> Option<(Operation, Matched)> {
    operations()
        .iter()
        .filter(|op| {
            op.method == method.as_str() || (*method == Method::HEAD && op.method == "GET")
        })
        .find_map(|op| matched(&op.path, path).map(|m| (op.clone(), m)))
}
fn collapsed(template: &str) -> String {
    let mut resource = 0;
    template
        .split('/')
        .map(|part| if part.starts_with('{') {
            let key = if resource == 0 { "{id}".to_owned() } else { format!("{{resource{resource}}}") };
            resource += 1;
            key
        } else { part.to_owned() })
        .collect::<Vec<_>>()
        .join("/")
}
pub fn router(auth: AuthHttpState, database: Database) -> Router {
    let mut router = Router::new();
    let paths = operations()
        .iter()
        // These colon commands share Project's item path shape. The one outer
        // command bridge dispatches them before the existing Project router.
        .filter(|op| !matches!(op.operation_id.as_str(), "ProjectController_startExecution" | "ProjectController_startAcceptance"))
        .map(|op| collapsed(&op.path))
        .collect::<BTreeSet<_>>();
    for path in paths {
        router = router.route(&path, any(dispatch));
    }
    router.layer(Extension(database)).with_state(auth)
}

#[derive(Clone)]
pub(crate) struct ProjectCommandState {
    pub auth: AuthHttpState,
    pub database: Database,
}
pub(crate) async fn project_command_bridge(
    State(state): State<ProjectCommandState>, request: Request, next: Next,
) -> Response {
    let command_path = operations().iter().any(|op| matches!(op.operation_id.as_str(), "ProjectController_startExecution" | "ProjectController_startAcceptance") && matched(&op.path, request.uri().path()).is_some());
    if command_path { dispatch(State(state.auth), Extension(state.database), request).await }
    else { next.run(request).await }
}

fn modern_query(query: Option<&str>) -> Result<Value, Error> {
    let mut values = serde_json::Map::new();
    for (key, value) in url::form_urlencoded::parse(query.unwrap_or("").as_bytes()) {
        if !matches!(key.as_ref(), "view" | "intent" | "snapshotMode" | "periodKey" | "restatesSnapshotId" | "periodEndSnapshotId" | "receiptId" | "correctionSourceRefs") || values.contains_key(key.as_ref()) {
            return Err(Error::BadRequest("Unknown or repeated operating query parameter".into()));
        }
        values.insert(key.into_owned(), Value::String(value.into_owned()));
    }
    Ok(Value::Object(values))
}
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    let selected = operation(request.method(), request.uri().path())
        .map(|(_, m)| m)
        .or_else(|| {
            operations()
                .iter()
                .find_map(|op| matched(&op.path, request.uri().path()))
        });
    if let Some(matched) = selected {
        for id in matched.keys.values() {
            if decode_uri_component(id).is_err() {
                return ApiError::message(StatusCode::BAD_REQUEST, format!("Failed to decode param '{id}'")).into_response();
            }
        }
        if matched.canonical != request.uri().path() {
            if request.extensions().get::<OriginalUri>().is_none() {
                let original = request.uri().clone();
                request.extensions_mut().insert(OriginalUri(original));
            }
            let mut parts = request.uri().clone().into_parts();
            let path = match request.uri().query() {
                Some(query) => format!("{}?{query}", matched.canonical),
                None => matched.canonical,
            };
            parts.path_and_query = path.parse().ok();
            match Uri::from_parts(parts) {
                Ok(uri) => *request.uri_mut() = uri,
                Err(_) => return ApiError::internal().into_response(),
            }
        }
    }
    next.run(request).await
}

async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(database): Extension<Database>,
    request: Request,
) -> Response {
    let Some((op, matched)) = operation(request.method(), request.uri().path()) else {
        let original = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |u| u.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(original)).await;
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let all = match op
        .permissions
        .iter()
        .map(|value| value.parse::<PermissionKey>())
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(all) => all,
        Err(_) => return ApiError::internal().into_response(),
    };
    let resolved = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &RoutePolicy {
            all,
            ..RoutePolicy::default()
        },
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(Some(session)) => session,
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let named = match ResourceKeys::from_raw(&matched.keys) {
        Ok(keys) => keys,
        Err(error) => return error.into_api_error().into_response(),
    };
    let modern_group = matches!(op.group.as_str(), "G" | "H" | "I" | "R5-min");
    let id = match if modern_group { None } else { matched.id } {
        None => None,
        Some(raw) => match decode_uri_component(&raw)
            .ok()
            .and_then(|id| Uuid::parse_str(&id).ok())
        {
            Some(id) => Some(id),
            None => {
                return ApiError::message(StatusCode::BAD_REQUEST, "Invalid resource UUID")
                    .into_response();
            }
        },
    };
    let query_result = if modern_group { modern_query(parts.uri.query()).map_err(Error::into_api_error) } else { super::validation::validate_query(&op.operation_id, parts.uri.query()) };
    let query = match query_result {
        Ok(query) => query,
        Err(error) => return error.into_response(),
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let typed = if crate::project_operating_common::request::request_name(&op.operation_id).is_some() {
        match crate::project_operating_common::TypedRequest::parse(&op.operation_id, parsed.raw()) {
            Ok(body) => body,
            Err(error) => return error.into_api_error().into_response(),
        }
    } else { crate::project_operating_common::TypedRequest::None };
    let body = if !matches!(typed, crate::project_operating_common::TypedRequest::None) {
        match typed.value() { Ok(value) => value, Err(error) => return error.into_api_error().into_response() }
    } else if modern_group { Value::Null }
    else {
        match super::validation::validate_body(&op.operation_id, parsed.raw()) {
            Ok(body) => body,
            Err(error) => return error.into_response(),
        }
    };
    let actor = Actor {
        id: resolved.user.user_id,
        request_id: metadata.request_id.clone(),
        session: resolved,
        request_context: ProjectionRequestContext {
            request_id: metadata.request_id,
            path: metadata.path,
            method: metadata.method,
            ip: metadata.info.ip,
            user_agent: metadata.info.user_agent,
        },
    };
    let status = StatusCode::from_u16(op.success_status).unwrap_or(StatusCode::OK);
    let result = database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut tx = connection.begin().await?;
                let mut state = CommonState::default();
                state.trace.begin(true);
                let mut participant = PendingAuthentication::from_resolved(&actor.session);
                let outcome = {
                    let mut session = CommonSession::borrow_with_participant(
                        &mut tx,
                        &mut state,
                        &mut participant,
                    );
                    session.request_id = actor.request_id.clone();
                    let result = match op.group.as_str() {
                        "A" => {
                            crate::contract_readiness::execute(
                                &mut session,
                                &op.operation_id,
                                id,
                                &query,
                                &body,
                                &actor,
                            )
                            .await
                        }
                        "B" => {
                            crate::contracts::execute(
                                &mut session,
                                &op.operation_id,
                                id,
                                &query,
                                &body,
                                &actor,
                            )
                            .await
                        }
                        "C" => {
                            crate::contract_finance::execute(
                                &mut session,
                                &op.operation_id,
                                id,
                                &query,
                                &body,
                                &actor,
                            )
                            .await
                        }
                        "D" => {
                            crate::project_handover::execute(
                                &mut session,
                                &op.operation_id,
                                id,
                                &query,
                                &body,
                                &actor,
                            )
                            .await
                        }
                        "E" => {
                            crate::project_actual_cost::execute(
                                &mut session,
                                &op.operation_id,
                                id,
                                &query,
                                &body,
                                &actor,
                            )
                            .await
                        }
                        "F" => {
                            crate::project_cost_governance::execute(
                                &mut session,
                                &op.operation_id,
                                id,
                                &query,
                                &body,
                                &actor,
                            )
                            .await
                        }
                        "G" => crate::project_operating::execute_with_session(&mut session, &op.operation_id, &named, &query, &typed, &actor).await,
                        "H" => crate::project_operating_signals::execute_with_session(&mut session, &op.operation_id, &named, &query, &typed, &actor).await,
                        "I" => crate::project_lifecycle::execute_with_session(&mut session, &op.operation_id, &named, &query, &typed, &actor).await,
                        "R5-min" => crate::commission_assignment::execute_with_session(&mut session, &op.operation_id, &named, &query, &typed, &actor).await,
                        _ => Err(Error::Internal),
                    };
                    let result = result.and_then(|value| {
                        if modern_group {
                            let schema_name = op.response_dto.as_deref().ok_or(Error::Internal)?;
                            crate::project_operating_common::schema::validate_public_value(schema_name, &value)?;
                        }
                        Ok(value)
                    });
                    match result {
                        Ok(value) => store::flush(&mut session)
                            .await
                            .map_err(Error::from)
                            .map(|()| value),
                        Err(error) => Err(error),
                    }
                };
                match outcome {
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
        .await;
    match result {
        Ok(Ok(value)) => match serde_json::to_string(&value) {
            Ok(raw) => ApiError::raw_json(status, raw).into_response(),
            Err(_) => ApiError::internal().into_response(),
        },
        Ok(Err(error)) => error.into_api_error().into_response(),
        Err(_) => ApiError::internal().into_response(),
    }
}
pub fn openapi() -> Value {
    let full: Value = serde_json::from_str(include_str!(
        "../../../../libs/shared/api-spec/openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid current full contract"));
    let mut output = json!({"openapi":full["openapi"],"paths":{},"components":full["components"]});
    for op in operations() {
        output["paths"][&op.path][op.method.to_ascii_lowercase()] =
            full["paths"][&op.path][op.method.to_ascii_lowercase()].clone();
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_route_identity_and_command_colon() {
        let r = matched(
            "/api/contracts/{id}:activate",
            "/API/CONTRACTS/ABC:AcTiVaTe/",
        )
        .unwrap_or_else(|| panic!("match"));
        assert_eq!(r.id.as_deref(), Some("ABC"));
        assert_eq!(r.canonical, "/api/contracts/ABC:activate");
        assert!(
            matched(
                "/api/contracts/{id}:activate",
                "/api/contracts/ABC/activate"
            )
            .is_none()
        );
    }
    #[test]
    fn all_ninety_nine_operations_have_effective_permission() {
        assert_eq!(operations().len(), 99);
        assert!(operations().iter().all(|o| !o.permissions.is_empty()));
        assert!(
            operations()
                .iter()
                .filter(|o| o.group == "C")
                .all(|o| o.permissions == ["contract:finance:manage"])
        );
    }
    #[test]
    fn dual_uuid_and_project_colon_routes_preserve_unique_resource_identity() {
        let result = matched("/api/project-completion-records/{completionRecordId}/conditions/{id}:close", "/api/project-completion-records/parent/conditions/child:close").unwrap_or_else(|| panic!("route"));
        assert_eq!(result.keys.get("completionRecordId").map(String::as_str), Some("parent"));
        assert_eq!(result.keys.get("id").map(String::as_str), Some("child"));
        assert_eq!(collapsed("/api/project-completion-records/{completionRecordId}/conditions/{id}:close"), "/api/project-completion-records/{id}/conditions/{resource1}");
        assert!(operations().iter().any(|op| op.operation_id == "ProjectController_startExecution"));
    }
}
