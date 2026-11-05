//! The 67 frozen operations share one authorization and outer transaction adapter.
use super::{Actor, Error};
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
use std::{collections::BTreeSet, sync::OnceLock};
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
}
#[derive(Deserialize)]
struct Inventory {
    operations: Vec<Operation>,
}
fn operations() -> &'static [Operation] {
    static OPS: OnceLock<Vec<Operation>> = OnceLock::new();
    OPS.get_or_init(|| {
        serde_json::from_str::<Inventory>(include_str!(
            "../../../../tools/rust-r4def/combined-operation-map16.json"
        ))
        .unwrap_or_else(|_| panic!("invalid frozen R4 operation map"))
        .operations
    })
}

struct Matched {
    id: Option<String>,
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
    template
        .split('/')
        .map(|part| if part.starts_with('{') { "{id}" } else { part })
        .collect::<Vec<_>>()
        .join("/")
}
pub fn router(auth: AuthHttpState, database: Database) -> Router {
    let mut router = Router::new();
    let paths = operations()
        .iter()
        .map(|op| collapsed(&op.path))
        .collect::<BTreeSet<_>>();
    for path in paths {
        router = router.route(&path, any(dispatch));
    }
    router.layer(Extension(database)).with_state(auth)
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
        if let Some(id) = &matched.id
            && decode_uri_component(id).is_err()
        {
            return ApiError::message(
                StatusCode::BAD_REQUEST,
                format!("Failed to decode param '{id}'"),
            )
            .into_response();
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
    let id = match matched.id {
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
    let query = match super::validation::validate_query(&op.operation_id, parts.uri.query()) {
        Ok(query) => query,
        Err(error) => return error.into_response(),
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let body = match super::validation::validate_body(&op.operation_id, parsed.raw()) {
        Ok(body) => body,
        Err(error) => return error.into_response(),
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
                        _ => Err(Error::Internal),
                    };
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
    fn all_sixty_seven_operations_have_effective_permission() {
        assert_eq!(operations().len(), 67);
        assert!(operations().iter().all(|o| !o.permissions.is_empty()));
        assert!(
            operations()
                .iter()
                .filter(|o| o.group == "C")
                .all(|o| o.permissions == ["contract:finance:manage"])
        );
    }
}
