//! Eighteen original routes, all requiring both original permissions.
use std::sync::Arc;

use axum::{
    Extension, Json, Router,
    extract::{FromRequestParts, OriginalUri, Path, RawQuery, Request, State},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde_json::Value;

use super::{
    service::{ExternalOrgSyncError as E, ExternalOrgSyncService},
    validation,
};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody, guarded_route},
        model::ResolvedSession,
    },
    error::ApiError,
    shared::generated::PermissionKey,
};

fn policy() -> RoutePolicy {
    RoutePolicy {
        all: vec![
            PermissionKey::PlatformOrgUnitsManage,
            PermissionKey::PlatformOrgSyncManage,
        ],
        ..Default::default()
    }
}
pub fn router(auth: AuthHttpState, service: Arc<ExternalOrgSyncService>) -> Router {
    Router::new()
        .route(
            "/api/platform/external-org-sources",
            guarded_route(
                get(list_sources).post(create_source),
                auth.clone(),
                policy(),
            ),
        )
        .route(
            "/api/platform/external-org-sources/{id}",
            guarded_route(get(get_source).patch(update_source), auth.clone(), policy())
                .post(source_action),
        )
        .route(
            "/api/platform/external-org-sources/{sourceId}/department-mappings",
            guarded_route(
                get(list_mappings).put(replace_mappings),
                auth.clone(),
                policy(),
            ),
        )
        .route(
            "/api/platform/external-org-sources/{sourceId}/org-sync-runs",
            guarded_route(get(list_runs).post(create_run), auth.clone(), policy()),
        )
        .route(
            "/api/platform/external-department-mappings/{id}",
            post(mapping_action),
        )
        .route(
            "/api/platform/org-sync-runs/{id}",
            guarded_route(get(get_run), auth.clone(), policy()).post(run_action),
        )
        .route(
            "/api/platform/org-sync-runs/{id}/diff-items",
            guarded_route(get(list_diffs), auth.clone(), policy()),
        )
        .layer(Extension(service))
        .with_state(auth)
}
pub fn openapi() -> Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-openapi.json"))
        .unwrap_or_else(|_| panic!("invalid original H OpenAPI"))
}

fn action<'a>(segment: &'a str, actions: &[&'static str]) -> Option<(&'a str, &'static str)> {
    for action in actions {
        let suffix = format!(":{action}");
        if let Some(index) = segment.len().checked_sub(suffix.len())
            && let Some((id, tail)) = segment.get(..index).zip(segment.get(index..))
            && !id.is_empty()
            && tail.eq_ignore_ascii_case(&suffix)
        {
            return Some((id, *action));
        }
    }
    None
}
fn commands(endpoint: &str) -> &'static [&'static str] {
    match endpoint {
        "external-org-sources" => &["activate", "pause", "archive"],
        "external-department-mappings" => &["map", "unmap", "ignore", "restore"],
        "org-sync-runs" => &["apply"],
        _ => &[],
    }
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
    let endpoint = [
        "external-org-sources",
        "external-department-mappings",
        "org-sync-runs",
    ]
    .into_iter()
    .find(|value| parts[3].eq_ignore_ascii_case(value))?;
    let canonical = match parts.as_slice() {
        ["", _, _, _]
            if endpoint == "external-org-sources"
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            format!("/api/platform/{endpoint}")
        }
        ["", _, _, _, id]
            if !id.is_empty()
                && ((endpoint == "external-org-sources"
                    && matches!(*method, Method::GET | Method::HEAD | Method::PATCH))
                    || (endpoint == "org-sync-runs"
                        && matches!(*method, Method::GET | Method::HEAD))
                    || (*method == Method::POST && action(id, commands(endpoint)).is_some())) =>
        {
            format!("/api/platform/{endpoint}/{id}")
        }
        ["", _, _, _, id, tail]
            if endpoint == "external-org-sources"
                && !id.is_empty()
                && tail.eq_ignore_ascii_case("department-mappings")
                && matches!(*method, Method::GET | Method::HEAD | Method::PUT) =>
        {
            format!("/api/platform/{endpoint}/{id}/department-mappings")
        }
        ["", _, _, _, id, tail]
            if endpoint == "external-org-sources"
                && !id.is_empty()
                && tail.eq_ignore_ascii_case("org-sync-runs")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            format!("/api/platform/{endpoint}/{id}/org-sync-runs")
        }
        ["", _, _, _, id, tail]
            if endpoint == "org-sync-runs"
                && !id.is_empty()
                && tail.eq_ignore_ascii_case("diff-items")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            format!("/api/platform/{endpoint}/{id}/diff-items")
        }
        _ => return None,
    };
    if canonical == uri.path() {
        return None;
    }
    let mut parts = uri.clone().into_parts();
    parts.path_and_query = Some(
        match uri.query() {
            Some(query) => format!("{canonical}?{query}"),
            None => canonical,
        }
        .parse()
        .ok()?,
    );
    Uri::from_parts(parts).ok()
}
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    let parts = path.split('/').collect::<Vec<_>>();
    if parts.len() >= 5
        && parts[0].is_empty()
        && parts[1].eq_ignore_ascii_case("api")
        && parts[2].eq_ignore_ascii_case("platform")
        && [
            "external-org-sources",
            "external-department-mappings",
            "org-sync-runs",
        ]
        .iter()
        .any(|endpoint| parts[3].eq_ignore_ascii_case(endpoint))
        && decode_uri_component(parts[4]).is_err()
    {
        return ApiError::message(
            StatusCode::BAD_REQUEST,
            format!("Failed to decode param '{}'", parts[4]),
        )
        .into_response();
    }
    if let Some(uri) = normalized_uri(request.method(), request.uri()) {
        if request.extensions().get::<OriginalUri>().is_none() {
            let original = request.uri().clone();
            request.extensions_mut().insert(OriginalUri(original));
        }
        *request.uri_mut() = uri;
    }
    next.run(request).await
}
async fn command(
    state: AuthHttpState,
    service: Arc<ExternalOrgSyncService>,
    request: Request,
    endpoint: &str,
) -> Response {
    let Some((_, kind)) = request
        .uri()
        .path()
        .rsplit('/')
        .next()
        .and_then(|value| action(value, commands(endpoint)))
    else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |uri| uri.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(uri)).await;
    };
    let (mut parts, _) = request.into_parts();
    let Path(value) = match Path::<String>::from_request_parts(&mut parts, &state).await {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let Some((id, _)) = action(&value, commands(endpoint)) else {
        return ApiError::internal().into_response();
    };
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
        Ok(Some(session)) => session,
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    let schema = match kind {
        "activate" => "ActivateExternalOrgSourceRequest",
        "pause" => "PauseExternalOrgSourceRequest",
        "archive" => "ArchiveExternalOrgSourceRequest",
        "map" => "MapExternalDepartmentMappingRequest",
        "unmap" => "UnmapExternalDepartmentMappingRequest",
        "ignore" => "IgnoreExternalDepartmentMappingRequest",
        "restore" => "RestoreExternalDepartmentMappingRequest",
        "apply" => "ApplyOrgSyncRunRequest",
        _ => return ApiError::internal().into_response(),
    };
    let request = match validation::validate_request(schema, body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let result = match endpoint {
        "external-org-sources" => {
            service
                .source_command(
                    id,
                    kind,
                    request,
                    Some(session.user.user_id),
                    session.pending_flush.as_ref(),
                )
                .await
        }
        "external-department-mappings" => {
            service
                .mapping_command(
                    id,
                    kind,
                    request,
                    Some(session.user.user_id),
                    session.pending_flush.as_ref(),
                )
                .await
        }
        _ => {
            service
                .apply_run(
                    id,
                    request,
                    Some(session.user.user_id),
                    session.pending_flush.as_ref(),
                )
                .await
        }
    };
    respond(result, StatusCode::OK)
}
async fn source_action(
    State(state): State<AuthHttpState>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    request: Request,
) -> Response {
    command(state, service, request, "external-org-sources").await
}
async fn mapping_action(
    State(state): State<AuthHttpState>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    request: Request,
) -> Response {
    command(state, service, request, "external-department-mappings").await
}
async fn run_action(
    State(state): State<AuthHttpState>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    request: Request,
) -> Response {
    command(state, service, request, "org-sync-runs").await
}
fn respond(result: Result<Value, E>, status: StatusCode) -> Response {
    match result {
        Ok(value) => (status, Json(value)).into_response(),
        Err(error) => domain_error(error),
    }
}
fn domain_error(error: E) -> Response {
    match error {
        E::BadRequest(message) => {
            ApiError::message(StatusCode::BAD_REQUEST, message).into_response()
        }
        E::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message).into_response(),
        E::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message).into_response(),
        _ => ApiError::internal().into_response(),
    }
}
async fn list_sources(
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
) -> Response {
    let raw = validation::query(raw.as_deref());
    let query = match validation::validate("ExternalOrgSourceListQuery", Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(service.list_sources(query).await, StatusCode::OK)
}
async fn get_source(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
) -> Response {
    respond(service.get_source(&id).await, StatusCode::OK)
}
async fn create_source(
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let request = match validation::validate_request("CreateExternalOrgSourceRequest", body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(
        service
            .create_source(
                request,
                Some(session.user.user_id),
                session.pending_flush.as_ref(),
            )
            .await,
        StatusCode::CREATED,
    )
}
async fn update_source(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let request = match validation::validate_request("UpdateExternalOrgSourceRequest", body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(
        service
            .update_source(
                &id,
                request,
                Some(session.user.user_id),
                session.pending_flush.as_ref(),
            )
            .await,
        StatusCode::OK,
    )
}
async fn list_mappings(
    Path(id): Path<String>,
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
) -> Response {
    let raw = validation::query(raw.as_deref());
    let query = match validation::validate("ExternalDepartmentMappingListQuery", Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(service.list_mappings(&id, query).await, StatusCode::OK)
}
async fn replace_mappings(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let request = match validation::validate_request(
        "ReplaceExternalDepartmentMappingsRequest",
        body.raw(),
    ) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(
        service
            .replace_mappings(
                &id,
                request,
                Some(session.user.user_id),
                session.pending_flush.as_ref(),
            )
            .await,
        StatusCode::OK,
    )
}
async fn list_runs(
    Path(id): Path<String>,
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
) -> Response {
    let raw = validation::query(raw.as_deref());
    let query = match validation::validate("OrgSyncRunListQuery", Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(service.list_runs(&id, query).await, StatusCode::OK)
}
async fn get_run(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
) -> Response {
    respond(service.get_run(&id).await, StatusCode::OK)
}
async fn list_diffs(
    Path(id): Path<String>,
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
) -> Response {
    let raw = validation::query(raw.as_deref());
    let query = match validation::validate("OrgSyncDiffItemListQuery", Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(service.list_diffs(&id, query).await, StatusCode::OK)
}
async fn create_run(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<ExternalOrgSyncService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let request = match validation::validate_request("CreateOrgSyncRunRequest", body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    respond(
        service
            .create_run(
                &id,
                request,
                Some(session.user.user_id),
                session.pending_flush.as_ref(),
            )
            .await,
        StatusCode::CREATED,
    )
}
