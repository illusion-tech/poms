//! Eight original organization routes and their implicit GET/HEAD transport.

use super::{
    service::{OrgUnitsError, OrgUnitsService},
    validation,
};
use crate::{
    auth::{
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody, guarded_route},
        model::ResolvedSession,
    },
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Json, Router,
    extract::{FromRequestParts, OriginalUri, Path, Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};
use serde_json::Value;
use std::sync::Arc;

fn policy() -> RoutePolicy {
    RoutePolicy {
        all: vec![PermissionKey::PlatformOrgUnitsManage],
        ..RoutePolicy::default()
    }
}
pub fn router(state: AuthHttpState, service: Arc<OrgUnitsService>) -> Router {
    Router::new()
        .route(
            "/api/platform/org-unit-tree",
            guarded_route(get(tree), state.clone(), policy()),
        )
        .route(
            "/api/platform/org-units",
            guarded_route(get(list).post(create), state.clone(), policy()),
        )
        .route(
            "/api/platform/org-units/{id}",
            guarded_route(get(detail).patch(update), state.clone(), policy()).post(command),
        )
        .layer(Extension(service))
        .with_state(state)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Command {
    Activate,
    Deactivate,
    Move,
}
fn command_target(value: &str) -> Option<(&str, Command)> {
    for (suffix, command) in [
        (":activate", Command::Activate),
        (":deactivate", Command::Deactivate),
        (":move", Command::Move),
    ] {
        if let Some((id, tail)) = value
            .len()
            .checked_sub(suffix.len())
            .and_then(|index| value.get(..index).zip(value.get(index..)))
            && !id.is_empty()
            && tail.eq_ignore_ascii_case(suffix)
        {
            return Some((id, command));
        }
    }
    None
}
fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let parts = path.split('/').collect::<Vec<_>>();
    if parts.len() < 4
        || !parts[0].is_empty()
        || !parts[1].eq_ignore_ascii_case("api")
        || !parts[2].eq_ignore_ascii_case("platform")
    {
        return None;
    }
    let canonical = match parts.as_slice() {
        ["", _, _, endpoint]
            if endpoint.eq_ignore_ascii_case("org-unit-tree")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            "/api/platform/org-unit-tree".to_owned()
        }
        ["", _, _, endpoint]
            if endpoint.eq_ignore_ascii_case("org-units")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            "/api/platform/org-units".to_owned()
        }
        ["", _, _, endpoint, id]
            if endpoint.eq_ignore_ascii_case("org-units")
                && !id.is_empty()
                && (matches!(*method, Method::GET | Method::HEAD | Method::PATCH)
                    || *method == Method::POST && command_target(id).is_some()) =>
        {
            format!("/api/platform/org-units/{id}")
        }
        _ => return None,
    };
    if canonical == uri.path() {
        return None;
    }
    let mut result = uri.clone().into_parts();
    result.path_and_query = Some(
        match uri.query() {
            Some(query) => format!("{canonical}?{query}"),
            None => canonical,
        }
        .parse()
        .ok()?,
    );
    Uri::from_parts(result).ok()
}
/// Only the eight frozen operation shapes receive Express spelling behavior.
/// The original raw URI remains available to guards, security events and 404s.
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    if let Some(uri) = normalized_uri(request.method(), request.uri()) {
        if request.extensions().get::<OriginalUri>().is_none() {
            let original = request.uri().clone();
            request.extensions_mut().insert(OriginalUri(original));
        }
        *request.uri_mut() = uri;
    }
    next.run(request).await
}

// Matchit cannot combine a capture and a literal command suffix in one segment.
// Match the raw literal suffix before decoding the ID and before authorization.
async fn command(
    State(state): State<AuthHttpState>,
    Extension(service): Extension<Arc<OrgUnitsService>>,
    request: Request,
) -> Response {
    let Some((_, kind)) = request
        .uri()
        .path()
        .rsplit('/')
        .next()
        .and_then(command_target)
    else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |value| value.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(uri)).await;
    };
    let (mut parts, _) = request.into_parts();
    let Path(target) = match Path::<String>::from_request_parts(&mut parts, &state).await {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let Some((id, _)) = command_target(&target) else {
        return ApiError::internal().into_response();
    };
    let id = id.to_owned();
    let metadata = RequestMetadata::from_parts(&parts);
    let session = match guards::authorize(
        &state.service,
        &state.cookies,
        &policy(),
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(Some(session)) => Arc::new(session),
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    match kind {
        Command::Activate => {
            activate(
                Path(id),
                Extension(service),
                Extension(session),
                Extension(body),
            )
            .await
        }
        Command::Deactivate => {
            deactivate(
                Path(id),
                Extension(service),
                Extension(session),
                Extension(body),
            )
            .await
        }
        Command::Move => {
            move_org_unit(
                Path(id),
                Extension(service),
                Extension(session),
                Extension(body),
            )
            .await
        }
    }
}
pub fn openapi() -> Value {
    serde_json::from_str(include_str!(
        "../../../../tools/rust-r2c/org-units-openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid generated organization OpenAPI subset"))
}
async fn list(Extension(service): Extension<Arc<OrgUnitsService>>) -> Response {
    match service.list().await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn tree(Extension(service): Extension<Arc<OrgUnitsService>>) -> Response {
    match service.tree().await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn detail(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<OrgUnitsService>>,
) -> Response {
    match service.get(&id).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn create(
    Extension(service): Extension<Arc<OrgUnitsService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_create(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .create(
            input,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => (StatusCode::CREATED, Json(value)).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn update(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<OrgUnitsService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_update(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .update(
            &id,
            input,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn activate(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<OrgUnitsService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_activation(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .activate(
            &id,
            input,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn deactivate(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<OrgUnitsService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_activation(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .deactivate(
            &id,
            input,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn move_org_unit(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<OrgUnitsService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_move(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .move_org_unit(
            &id,
            input,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
fn domain_error(error: OrgUnitsError) -> Response {
    match error {
        OrgUnitsError::NotFound(message) => {
            ApiError::message(StatusCode::NOT_FOUND, message).into_response()
        }
        OrgUnitsError::Conflict(message) => {
            let body = format!(
                "{{\"statusCode\":409,\"message\":{},\"error\":\"Conflict\"}}",
                message.json()
            );
            let mut response = (StatusCode::CONFLICT, body).into_response();
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            response
        }
        OrgUnitsError::Database(_) | OrgUnitsError::Internal => {
            ApiError::internal().into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{Body, to_bytes},
        http::Request,
    };
    use tower::ServiceExt;

    #[test]
    fn raw_uri_normalization_is_limited_to_the_frozen_shapes() {
        for (method, input, expected) in [
            (
                Method::GET,
                "/API/PLATFORM/ORG-UNIT-TREE/",
                "/api/platform/org-unit-tree",
            ),
            (
                Method::HEAD,
                "/API/PLATFORM/ORG-UNITS/",
                "/api/platform/org-units",
            ),
            (
                Method::GET,
                "/API/PLATFORM/ORG-UNITS/ABC%44/?x=1",
                "/api/platform/org-units/ABC%44?x=1",
            ),
            (
                Method::POST,
                "/API/PLATFORM/ORG-UNITS/id:MOVE/",
                "/api/platform/org-units/id:MOVE",
            ),
            (
                Method::POST,
                "/API/PLATFORM/ORG-UNITS/id:ACTIVATE/",
                "/api/platform/org-units/id:ACTIVATE",
            ),
            (
                Method::POST,
                "/API/PLATFORM/ORG-UNITS/id:DEACTIVATE/",
                "/api/platform/org-units/id:DEACTIVATE",
            ),
            (
                Method::PATCH,
                "/API/PLATFORM/ORG-UNITS/ID/",
                "/api/platform/org-units/ID",
            ),
        ] {
            let uri = normalized_uri(
                &method,
                &input.parse().unwrap_or_else(|_| panic!("input URI")),
            );
            assert_eq!(uri.map(|uri| uri.to_string()).as_deref(), Some(expected));
        }
        for (method, input) in [
            (Method::GET, "/API/PLATFORM/ORG-UNITS//"),
            (Method::GET, "/%61pi/platform/org-units"),
            (Method::GET, "/api/%70latform/org-units"),
            (Method::GET, "/api/platform/%6frg-units"),
            (Method::GET, "/api/platform/%6frg-unit-tree"),
            (Method::POST, "/API/PLATFORM/ORG-UNITS/id%3Amove/"),
            (Method::POST, "/API/PLATFORM/ORG-UNITS/id:unknown/"),
            (Method::DELETE, "/API/PLATFORM/ORG-UNITS/id/"),
            (Method::POST, "/API/PLATFORM/ORG-UNIT-TREE/"),
            (Method::GET, "/API/PLATFORM/ROLES/"),
        ] {
            assert!(
                normalized_uri(&method, &input.parse().unwrap_or_else(|_| panic!("URI"))).is_none(),
                "{input}"
            );
        }
    }
    #[tokio::test]
    async fn normalization_preserves_dynamic_id_and_raw_guard_uri_and_implicit_head() {
        let inner = Router::new().route(
            "/api/platform/org-units/{id}",
            get(
                |Path(id): Path<String>, request: axum::extract::Request| async move {
                    let (parts, _) = request.into_parts();
                    let metadata = RequestMetadata::from_parts(&parts);
                    Json(serde_json::json!({"id":id,"guardPath":metadata.path}))
                },
            ),
        );
        let app = Router::new()
            .fallback_service(inner)
            .layer(axum::middleware::from_fn(normalize_uri));
        let make = |method: &str| {
            Request::builder()
                .method(method)
                .uri("/API/PLATFORM/ORG-UNITS/ABC%44/?raw=1")
                .body(Body::empty())
                .unwrap_or_else(|_| panic!("request"))
        };
        let response = app
            .clone()
            .oneshot(make("GET"))
            .await
            .unwrap_or_else(|_| panic!("GET route"));
        assert_eq!(response.status(), StatusCode::OK);
        let length = response.headers().get(header::CONTENT_LENGTH).cloned();
        let bytes = to_bytes(response.into_body(), 10000)
            .await
            .unwrap_or_else(|_| panic!("GET body"));
        let value: Value = serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("JSON"));
        assert_eq!(
            value,
            serde_json::json!({"id":"ABCD","guardPath":"/API/PLATFORM/ORG-UNITS/ABC%44/?raw=1"})
        );
        let response = app
            .oneshot(make("HEAD"))
            .await
            .unwrap_or_else(|_| panic!("HEAD route"));
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.headers().get(header::CONTENT_LENGTH),
            length.as_ref()
        );
        assert!(
            to_bytes(response.into_body(), 10000)
                .await
                .unwrap_or_else(|_| panic!("HEAD body"))
                .is_empty()
        );
    }
    #[tokio::test]
    async fn explicit_conflict_message_preserves_original_utf16() {
        let response = domain_error(OrgUnitsError::Conflict(
            crate::auth::js_json::JsString::from_code_units(vec![0xd800]),
        ));
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let bytes = to_bytes(response.into_body(), 10000)
            .await
            .unwrap_or_else(|_| panic!("body"));
        assert!(String::from_utf8_lossy(&bytes).contains("\\ud800"));
        assert!(!String::from_utf8_lossy(&bytes).contains('\u{fffd}'));
    }
}
