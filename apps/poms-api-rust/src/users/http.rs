//! Eleven original user/profile/owner-reference routes and their implicit GET/HEAD transport.

use super::{
    service::{UsersError, UsersService},
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
        all: vec![PermissionKey::PlatformUsersManage],
        ..RoutePolicy::default()
    }
}
fn owner_policy() -> RoutePolicy {
    RoutePolicy {
        any: vec![
            PermissionKey::LeadWrite,
            PermissionKey::LeadAssign,
            PermissionKey::ProjectWrite,
            PermissionKey::PlatformUsersManage,
            PermissionKey::PlatformOrgUnitsManage,
        ],
        ..RoutePolicy::default()
    }
}
#[derive(Clone, Copy)]
struct CreateStatus(StatusCode);
/// The caller supplies the source-bound Nest status; there is no speculative default.
pub fn router(
    state: AuthHttpState,
    service: Arc<UsersService>,
    create_success_status: StatusCode,
) -> Router {
    Router::new()
        .route(
            "/api/auth/profile",
            guarded_route(
                get(profile).patch(update_profile),
                state.clone(),
                RoutePolicy::authenticated(),
            ),
        )
        .route(
            "/api/platform/owner-reference",
            guarded_route(get(owner_reference), state.clone(), owner_policy()),
        )
        .route(
            "/api/platform/users",
            guarded_route(get(list).post(create), state.clone(), policy()),
        )
        .route(
            "/api/platform/users/{id}",
            guarded_route(get(detail).patch(update), state.clone(), policy()).post(command),
        )
        .route(
            "/api/platform/users/{id}/roles",
            guarded_route(axum::routing::put(assign_roles), state.clone(), policy()),
        )
        .route(
            "/api/platform/users/{id}/org-memberships",
            guarded_route(
                axum::routing::put(assign_org_memberships),
                state.clone(),
                policy(),
            ),
        )
        .layer(Extension(service))
        .layer(Extension(CreateStatus(create_success_status)))
        .with_state(state)
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Command {
    Activate,
    Deactivate,
}
fn command_target(value: &str) -> Option<(&str, Command)> {
    for (suffix, command) in [
        (":activate", Command::Activate),
        (":deactivate", Command::Deactivate),
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
    let canonical = match parts.as_slice() {
        ["", api, auth, endpoint]
            if api.eq_ignore_ascii_case("api")
                && auth.eq_ignore_ascii_case("auth")
                && endpoint.eq_ignore_ascii_case("profile")
                && matches!(*method, Method::GET | Method::HEAD | Method::PATCH) =>
        {
            "/api/auth/profile".to_owned()
        }
        ["", api, platform, endpoint]
            if api.eq_ignore_ascii_case("api")
                && platform.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("owner-reference")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            "/api/platform/owner-reference".to_owned()
        }
        ["", api, platform, endpoint]
            if api.eq_ignore_ascii_case("api")
                && platform.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("users")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            "/api/platform/users".to_owned()
        }
        ["", api, platform, endpoint, id]
            if api.eq_ignore_ascii_case("api")
                && platform.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("users")
                && !id.is_empty()
                && (matches!(*method, Method::GET | Method::HEAD | Method::PATCH)
                    || *method == Method::POST && command_target(id).is_some()) =>
        {
            format!("/api/platform/users/{id}")
        }
        ["", api, platform, endpoint, id, child]
            if api.eq_ignore_ascii_case("api")
                && platform.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("users")
                && !id.is_empty()
                && *method == Method::PUT
                && (child.eq_ignore_ascii_case("roles")
                    || child.eq_ignore_ascii_case("org-memberships")) =>
        {
            format!("/api/platform/users/{id}/{}", child.to_ascii_lowercase())
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
/// Only the eleven frozen operation shapes receive Express spelling behavior.
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
    Extension(service): Extension<Arc<UsersService>>,
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
    }
}
pub fn openapi() -> Value {
    serde_json::from_str(include_str!(
        "../../../../tools/rust-r2d/users-openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid generated user OpenAPI subset"))
}

async fn list(
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    match service.list(&session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn owner_reference(
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    match service.owner_reference(&session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn detail(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    match service.get(&id, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn profile(
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    match service.profile(&session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn create(
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
    Extension(status): Extension<CreateStatus>,
) -> Response {
    let input = match validation::validate_create(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.create(input, &session).await {
        Ok(value) => (status.0, Json(value)).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn update(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_update(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.update(&id, input, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn update_profile(
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_profile(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.update_profile(input, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn activate(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_activation(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.activate(&id, input, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn deactivate(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_activation(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.deactivate(&id, input, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn assign_roles(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_roles(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.assign_roles(&id, input, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn assign_org_memberships(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<UsersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_org_memberships(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.assign_org_memberships(&id, input, &session).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
fn domain_error(error: UsersError) -> Response {
    match error {
        UsersError::NotFound(message) => {
            ApiError::message(StatusCode::NOT_FOUND, message).into_response()
        }
        UsersError::Conflict(message) => {
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
        UsersError::Database(_) | UsersError::Internal => ApiError::internal().into_response(),
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
    fn only_original_method_and_static_path_spellings_are_normalized() {
        for (method, input, expected) in [
            (Method::GET, "/API/AUTH/PROFILE/", "/api/auth/profile"),
            (
                Method::PATCH,
                "/API/AUTH/PROFILE/?q=1",
                "/api/auth/profile?q=1",
            ),
            (
                Method::HEAD,
                "/API/PLATFORM/OWNER-REFERENCE/",
                "/api/platform/owner-reference",
            ),
            (Method::POST, "/API/PLATFORM/USERS/", "/api/platform/users"),
            (
                Method::GET,
                "/API/PLATFORM/USERS/ABC%44/",
                "/api/platform/users/ABC%44",
            ),
            (
                Method::POST,
                "/API/PLATFORM/USERS/ABC:ACTIVATE/",
                "/api/platform/users/ABC:ACTIVATE",
            ),
            (
                Method::POST,
                "/API/PLATFORM/USERS/ABC:DEACTIVATE/",
                "/api/platform/users/ABC:DEACTIVATE",
            ),
            (
                Method::PUT,
                "/API/PLATFORM/USERS/ABC/ORG-MEMBERSHIPS/",
                "/api/platform/users/ABC/org-memberships",
            ),
            (
                Method::PUT,
                "/API/PLATFORM/USERS/ABC/ROLES/",
                "/api/platform/users/ABC/roles",
            ),
        ] {
            assert_eq!(
                normalized_uri(&method, &input.parse().unwrap_or_else(|_| panic!("URI")))
                    .map(|uri| uri.to_string())
                    .as_deref(),
                Some(expected)
            );
        }
        for (method, input) in [
            (Method::GET, "/API/PLATFORM/USERS//"),
            (Method::GET, "/%61pi/platform/users"),
            (Method::GET, "/api/%70latform/users"),
            (Method::GET, "/api/platform/%75sers"),
            (Method::GET, "/api/platform/users/id/external-identities"),
            (Method::POST, "/api/platform/users/id%3Aactivate"),
            (Method::POST, "/api/platform/users/id:unknown"),
            (Method::DELETE, "/api/platform/users/id"),
            (Method::POST, "/api/auth/profile"),
            (Method::POST, "/api/platform/owner-reference"),
            (Method::GET, "/api/platform/users/id/roles"),
            (Method::PUT, "/api/platform/users/id"),
        ] {
            assert!(
                normalized_uri(&method, &input.parse().unwrap_or_else(|_| panic!("URI"))).is_none(),
                "{input}"
            );
        }
        assert_eq!(
            command_target("ID:ACTIVATE"),
            Some(("ID", Command::Activate))
        );
        assert_eq!(
            command_target("ID:other:deactivate"),
            Some(("ID:other", Command::Deactivate))
        );
        assert!(command_target("ID%3Aactivate").is_none());
        assert!(command_target(":activate").is_none());
    }

    #[tokio::test]
    async fn original_guard_uri_and_uuid_spelling_survive_rewrite_and_head() {
        let inner=Router::new().route("/api/platform/users/{id}",get(|Path(id):Path<String>,request:axum::extract::Request|async move{
            let (parts,_)=request.into_parts();
            Json(serde_json::json!({"id":id,"guardPath":RequestMetadata::from_parts(&parts).path}))
        }));
        let app = Router::new()
            .fallback_service(inner)
            .layer(axum::middleware::from_fn(normalize_uri));
        let make = |method: &str| {
            Request::builder()
                .method(method)
                .uri("/API/PLATFORM/USERS/ABC%44/?raw=1")
                .body(Body::empty())
                .unwrap_or_else(|_| panic!("request"))
        };
        let response = app
            .clone()
            .oneshot(make("GET"))
            .await
            .unwrap_or_else(|_| panic!("route"));
        let length = response.headers().get(header::CONTENT_LENGTH).cloned();
        let bytes = to_bytes(response.into_body(), 10000)
            .await
            .unwrap_or_else(|_| panic!("body"));
        let value: Value = serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("JSON"));
        assert_eq!(
            value,
            serde_json::json!({"id":"ABCD","guardPath":"/API/PLATFORM/USERS/ABC%44/?raw=1"})
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
    async fn username_conflict_retains_original_lone_surrogate() {
        let response = domain_error(UsersError::Conflict(
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
