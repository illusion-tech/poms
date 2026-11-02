//! Existing workspace projections preserve the unvalidated raw project ID.
use super::Service;
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::AuthHttpState,
    },
    error::ApiError,
    opportunity_context::transport::{not_found, response, rewrite, validate_path_parameter},
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{Request, State},
    http::{Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};
use std::sync::Arc;
pub async fn normalize_uri(request: Request, next: Next) -> Response {
    let p = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path())
        .split('/')
        .collect::<Vec<_>>();
    if let ["", api, projects, id, tail] = p.as_slice()
        && api.eq_ignore_ascii_case("api")
        && projects.eq_ignore_ascii_case("projects")
        && !id.is_empty()
        && (tail.eq_ignore_ascii_case("timeline")
            || tail.eq_ignore_ascii_case("workspace-guidance"))
    {
        if let Err(error) = validate_path_parameter(id) {
            return error.into_response();
        }
        if matches!(*request.method(), Method::GET | Method::HEAD) {
            let path = format!("/api/projects/{id}/{}", tail.to_ascii_lowercase());
            return match rewrite(request, path) {
                Ok(request) => next.run(request).await,
                Err(error) => error.into_response(),
            };
        }
    }
    next.run(request).await
}
pub fn router(auth: AuthHttpState, service: Arc<Service>) -> Router {
    Router::new()
        .route("/api/projects/{id}/timeline", get(dispatch))
        .route("/api/projects/{id}/workspace-guidance", get(dispatch))
        .layer(Extension(service))
        .with_state(auth)
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<Service>>,
    request: Request,
) -> Response {
    if !matches!(*request.method(), Method::GET | Method::HEAD) {
        return not_found(request).await;
    }
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &RoutePolicy {
            all: vec![PermissionKey::ProjectRead],
            ..RoutePolicy::default()
        },
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(Some(s)) => s,
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let raw = parts.uri.path().split('/').nth(3).unwrap_or("");
    let id = match decode_uri_component(raw) {
        Ok(id) => id,
        Err(_) => return ApiError::internal().into_response(),
    };
    let result = if parts.uri.path().ends_with("/workspace-guidance") {
        service.guidance(&id, &session).await
    } else {
        service.timeline(&id).await
    };
    match result {
        Ok(value) => response(StatusCode::OK, value),
        Err(error) => error.into_api_error().into_response(),
    }
}
