use std::sync::Arc;

use axum::{
    Extension, Json, Router,
    extract::{FromRequestParts, OriginalUri, Path, Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, put},
};
use serde_json::Value;

use super::{RolesError, RolesService, permission_dictionary, validation};
use crate::{
    auth::{
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody, guarded_route},
        js_json::JsString,
        model::ResolvedSession,
    },
    error::ApiError,
    shared::generated::PermissionKey,
};

pub fn router(state: AuthHttpState, service: Arc<RolesService>) -> Router {
    let policy = RoutePolicy {
        all: vec![PermissionKey::PlatformRolesManage],
        ..RoutePolicy::default()
    };
    Router::new()
        .route(
            "/api/platform/permissions",
            guarded_route(get(permissions), state.clone(), policy.clone()),
        )
        .route(
            "/api/platform/roles",
            guarded_route(get(list).post(create), state.clone(), policy.clone()),
        )
        .route(
            "/api/platform/roles/{id}",
            guarded_route(get(detail).patch(update), state.clone(), policy.clone()).post(command),
        )
        .route(
            "/api/platform/roles/{id}/permissions",
            guarded_route(put(assign), state.clone(), policy),
        )
        .layer(Extension(service))
        .with_state(state)
}

fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    // Original Nest accepts one optional trailing slash, not two or embedded
    // empty segments. Never decode a literal static segment or command colon.
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
            if endpoint.eq_ignore_ascii_case("permissions")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            "/api/platform/permissions".to_owned()
        }
        ["", _, _, endpoint]
            if endpoint.eq_ignore_ascii_case("roles")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            "/api/platform/roles".to_owned()
        }
        ["", _, _, endpoint, id]
            if endpoint.eq_ignore_ascii_case("roles")
                && !id.is_empty()
                && (matches!(*method, Method::GET | Method::HEAD | Method::PATCH)
                    || method == Method::POST && command_target(id).is_some()) =>
        {
            format!("/api/platform/roles/{id}")
        }
        ["", _, _, endpoint, id, permissions]
            if endpoint.eq_ignore_ascii_case("roles")
                && !id.is_empty()
                && permissions.eq_ignore_ascii_case("permissions")
                && method == Method::PUT =>
        {
            format!("/api/platform/roles/{id}/permissions")
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

/// Only the eight R2B operations and their implicit HEAD forms receive the
/// original Nest spelling policy.
/// Keep the whole original URI for guards/security events and fallback bodies.
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

fn command_target(value: &str) -> Option<(&str, bool)> {
    for (suffix, active) in [(":activate", true), (":deactivate", false)] {
        if let Some((id, tail)) = value
            .len()
            .checked_sub(suffix.len())
            .and_then(|index| value.get(..index).zip(value.get(index..)))
            && !id.is_empty()
            && tail.eq_ignore_ascii_case(suffix)
        {
            return Some((id, active));
        }
    }
    None
}

// Matchit cannot place a capture and a static suffix in one segment. Dispatch
// only the two existing commands before guarding; other POST paths remain 404.
async fn command(
    State(state): State<AuthHttpState>,
    Extension(service): Extension<Arc<RolesService>>,
    request: Request,
) -> Response {
    // Express matches the literal suffix before decoding the path parameter;
    // an encoded colon must not turn an unmatched POST into a command.
    let Some((_, active)) = request
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
    let policy = RoutePolicy {
        all: vec![PermissionKey::PlatformRolesManage],
        ..RoutePolicy::default()
    };
    let session = match guards::authorize(
        &state.service,
        &state.cookies,
        &policy,
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(Some(value)) => Arc::new(value),
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    if active {
        activate(
            Path(id),
            Extension(service),
            Extension(session),
            Extension(body),
        )
        .await
    } else {
        deactivate(
            Path(id),
            Extension(service),
            Extension(session),
            Extension(body),
        )
        .await
    }
}

pub fn openapi() -> Value {
    serde_json::from_str(include_str!(
        "../../../../tools/rust-r2b/roles-openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid generated role OpenAPI subset"))
}

async fn permissions() -> impl IntoResponse {
    Json(permission_dictionary())
}

async fn list(
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    let service = service.for_session(&session);
    match service.list().await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

async fn detail(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    let service = service.for_session(&session);
    match service.get(&id).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

async fn create(
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let service = service.for_session(&session);
    let request = match validation::validate_create(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .create(
            request,
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
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let service = service.for_session(&session);
    let request = match validation::validate_update(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .update(
            &id,
            request,
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
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let service = service.for_session(&session);
    let request = match validation::validate_activation(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .activate(
            &id,
            request,
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
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let service = service.for_session(&session);
    let request = match validation::validate_activation(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .deactivate(
            &id,
            request,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

async fn assign(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<RolesService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let service = service.for_session(&session);
    let request = match validation::validate_permissions(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .assign_permissions(
            &id,
            request,
            Some(session.user.user_id),
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

fn domain_error(error: RolesError) -> Response {
    match error {
        RolesError::NotFound(message) => {
            ApiError::message(StatusCode::NOT_FOUND, message).into_response()
        }
        RolesError::DuplicateKey(key) => {
            let mut message = "Role key ".encode_utf16().collect::<Vec<_>>();
            message.extend_from_slice(key.as_code_units());
            message.extend(" already exists".encode_utf16());
            let json = format!(
                "{{\"statusCode\":409,\"message\":{},\"error\":\"Conflict\"}}",
                JsString::from_code_units(message).json()
            );
            let mut response = (StatusCode::CONFLICT, json).into_response();
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/json; charset=utf-8"),
            );
            response
        }
        RolesError::Baseline { role_key, missing } => ApiError::message(
            StatusCode::CONFLICT,
            format!(
                "System role {role_key} must retain baseline permissions: {}",
                missing
                    .iter()
                    .map(|key| key.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        )
        .into_response(),
        RolesError::Database(_) | RolesError::Internal => ApiError::internal().into_response(),
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
    fn only_supported_role_static_segments_and_one_trailing_slash_are_normalized() {
        for (method, input, expected) in [
            (
                Method::GET,
                "/API/PLATFORM/PERMISSIONS/",
                "/api/platform/permissions",
            ),
            (Method::POST, "/API/PLATFORM/ROLES/", "/api/platform/roles"),
            (
                Method::PATCH,
                "/API/PLATFORM/ROLES/ABCDEF/?raw=1",
                "/api/platform/roles/ABCDEF?raw=1",
            ),
            (
                Method::PUT,
                "/API/PLATFORM/ROLES/ABCDEF/PERMISSIONS/",
                "/api/platform/roles/ABCDEF/permissions",
            ),
            (
                Method::POST,
                "/API/PLATFORM/ROLES/ABCDEF:ACTIVATE/",
                "/api/platform/roles/ABCDEF:ACTIVATE",
            ),
        ] {
            let uri: Uri = input.parse().unwrap_or_else(|_| panic!("URI"));
            assert_eq!(
                normalized_uri(&method, &uri)
                    .map(|value| value.to_string())
                    .as_deref(),
                Some(expected)
            );
        }
        for (method, input) in [
            (Method::GET, "/API/AUTH/SESSION/"),
            (Method::GET, "/API/PLATFORM/NAVIGATION/"),
            (Method::GET, "/API/PLATFORM/ROLES//"),
            (Method::GET, "/API/PLATFORM/ROLES/id/unknown?raw=1"),
            (Method::GET, "/%61pi/platform/roles"),
            (Method::PUT, "/API/PLATFORM/ROLES/id/%70ermissions"),
            (Method::POST, "/API/PLATFORM/ROLES/id%3Aactivate"),
            (Method::DELETE, "/API/PLATFORM/ROLES/id/"),
        ] {
            let uri: Uri = input.parse().unwrap_or_else(|_| panic!("URI"));
            assert!(normalized_uri(&method, &uri).is_none(), "{method} {input}");
        }
    }

    #[tokio::test]
    async fn head_uses_only_existing_get_shapes_and_retains_the_original_uri() {
        async fn original_uri(request: axum::extract::Request) -> Response {
            let (parts, _) = request.into_parts();
            let metadata = RequestMetadata::from_parts(&parts);
            let mut response = "GET representation".into_response();
            response.headers_mut().insert(
                "x-original-uri",
                HeaderValue::from_str(&metadata.path).unwrap_or_else(|_| panic!("original URI")),
            );
            response
        }
        let inner = Router::new()
            .route("/api/platform/permissions", get(original_uri))
            .route("/api/platform/roles", get(original_uri))
            .route("/api/platform/roles/{id}", get(original_uri));
        let app = Router::new()
            .fallback_service(inner)
            .layer(axum::middleware::from_fn(normalize_uri));
        for input in [
            "/API/PLATFORM/PERMISSIONS/?raw=1",
            "/API/PLATFORM/ROLES/?raw=1",
            "/API/PLATFORM/ROLES/ABCDEF/?raw=1",
        ] {
            assert!(
                normalized_uri(
                    &Method::HEAD,
                    &input.parse().unwrap_or_else(|_| panic!("URI"))
                )
                .is_some()
            );
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(Method::HEAD)
                        .uri(input)
                        .body(Body::empty())
                        .unwrap_or_else(|_| panic!("request")),
                )
                .await
                .unwrap_or_else(|_| panic!("router"));
            assert_eq!(response.status(), StatusCode::OK);
            assert_eq!(response.headers()["x-original-uri"], input);
            assert!(
                to_bytes(response.into_body(), 10000)
                    .await
                    .unwrap_or_else(|_| panic!("body"))
                    .is_empty()
            );
        }
        for input in [
            "/API/AUTH/SESSION/",
            "/API/PLATFORM/NAVIGATION/",
            "/API/PLATFORM/ROLES/id/PERMISSIONS/",
            "/API/PLATFORM/ROLES//",
            "/%61pi/platform/roles",
            "/api/platform/%72oles/id",
        ] {
            assert!(
                normalized_uri(
                    &Method::HEAD,
                    &input.parse().unwrap_or_else(|_| panic!("URI"))
                )
                .is_none(),
                "{input}"
            );
        }
    }

    #[tokio::test]
    async fn role_uri_rewrite_retains_original_guard_path_query_and_uuid_spelling() {
        let inner = Router::new().route("/api/platform/roles/{id}", get(|Path(id): Path<String>, request: axum::extract::Request| async move {
            let (parts, _) = request.into_parts();
            let metadata = RequestMetadata::from_parts(&parts);
            Json(serde_json::json!({"id":id,"path":parts.uri.to_string(),"guardPath":metadata.path}))
        }));
        let app = Router::new()
            .fallback_service(inner)
            .layer(axum::middleware::from_fn(normalize_uri));
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/API/PLATFORM/ROLES/ABCDEF/?raw=1")
                    .body(Body::empty())
                    .unwrap_or_else(|_| panic!("request")),
            )
            .await
            .unwrap_or_else(|_| panic!("router"));
        assert_eq!(response.status(), StatusCode::OK);
        let body = to_bytes(response.into_body(), 10000)
            .await
            .unwrap_or_else(|_| panic!("body"));
        let value: Value = serde_json::from_slice(&body).unwrap_or_else(|_| panic!("JSON"));
        assert_eq!(
            value,
            serde_json::json!({"id":"ABCDEF","path":"/api/platform/roles/ABCDEF?raw=1","guardPath":"/API/PLATFORM/ROLES/ABCDEF/?raw=1"})
        );
    }

    #[tokio::test]
    async fn duplicate_error_preserves_original_lone_surrogate() {
        let response = domain_error(RolesError::DuplicateKey(JsString::from_code_units(vec![
            0xd800,
        ])));
        let body = to_bytes(response.into_body(), 10000)
            .await
            .unwrap_or_else(|_| panic!("error bytes"));
        assert!(String::from_utf8_lossy(&body).contains("\\ud800"));
        assert!(!String::from_utf8_lossy(&body).contains('\u{fffd}'));
    }

    #[tokio::test]
    async fn suffix_routes_construct_and_match_without_losing_the_identifier() {
        use crate::{
            auth::{cookie::AuthCookieService, service::AuthService},
            config::Config,
            database::Database,
        };
        use std::collections::HashMap;
        let config = Config::from_map(&HashMap::from([
            ("DB_CONNECT".into(), "".into()),
            ("DB_PORT".into(), "1".into()),
            ("DB_PASSWORD".into(), "public-unused".into()),
        ]))
        .unwrap_or_else(|_| panic!("config"));
        let database = Database::new(&config.database)
            .await
            .unwrap_or_else(|_| panic!("lazy database"));
        database
            .close(std::time::Duration::from_secs(1))
            .await
            .unwrap_or_else(|_| panic!("close"));
        let state = AuthHttpState {
            service: Arc::new(AuthService::new(database.clone(), config.auth.clone())),
            cookies: AuthCookieService::from_auth_config(&config.auth),
        };
        let app = router(state, Arc::new(RolesService::new(database)));
        for (method, suffix) in [
            ("GET", ""),
            ("POST", ":activate"),
            ("POST", ":deactivate"),
            ("POST", ":ACTIVATE"),
            ("PUT", "/permissions"),
        ] {
            let request = Request::builder()
                .method(method)
                .uri(format!("/api/platform/roles/UPPER-UUID{suffix}"))
                .body(Body::empty())
                .unwrap_or_else(|_| panic!("request"));
            let response = app
                .clone()
                .oneshot(request)
                .await
                .unwrap_or_else(|_| panic!("router"));
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        }
        for suffix in [":unknown", "%3Aactivate", "/activate", "/deactivate"] {
            let request = Request::builder()
                .method("POST")
                .uri(format!("/api/platform/roles/id{suffix}"))
                .body(Body::empty())
                .unwrap_or_else(|_| panic!("request"));
            assert_eq!(
                app.clone()
                    .oneshot(request)
                    .await
                    .unwrap_or_else(|_| panic!("route"))
                    .status(),
                StatusCode::NOT_FOUND
            );
        }
        assert_eq!(
            command_target("UPPER-UUID:activate"),
            Some(("UPPER-UUID", true))
        );
        assert_eq!(
            command_target("UPPER-UUID:deactivate"),
            Some(("UPPER-UUID", false))
        );
    }
}
