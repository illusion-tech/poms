use super::{SystemSettingsError, SystemSettingsService, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody, guarded_route},
        model::ResolvedSession,
    },
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Json, Router,
    extract::{OriginalUri, Path, Request, State},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};
use std::sync::Arc;
pub fn router(state: AuthHttpState, service: Arc<SystemSettingsService>) -> Router {
    let policy = RoutePolicy {
        all: vec![PermissionKey::PlatformSystemSettingsManage],
        ..Default::default()
    };
    Router::new()
        .route(
            "/api/platform/system-settings",
            guarded_route(get(list), state.clone(), policy.clone()),
        )
        .route(
            "/api/platform/system-settings/{key}",
            guarded_route(get(detail).patch(update), state.clone(), policy),
        )
        .layer(Extension(service))
        .with_state(state)
}
pub fn openapi() -> serde_json::Value {
    serde_json::from_str(include_str!(
        "../../../../tools/rust-r2ef/e-settings-openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid generated settings OpenAPI"))
}
fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let segments = path.split('/').collect::<Vec<_>>();
    let canonical = match segments.as_slice() {
        ["", api, platform, endpoint]
            if api.eq_ignore_ascii_case("api")
                && platform.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("system-settings")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            "/api/platform/system-settings".to_owned()
        }
        ["", api, platform, endpoint, key]
            if api.eq_ignore_ascii_case("api")
                && platform.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("system-settings")
                && !key.is_empty()
                && matches!(*method, Method::GET | Method::HEAD | Method::PATCH) =>
        {
            format!("/api/platform/system-settings/{key}")
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
    // Validate this existing capture at the same pre-method/pre-guard stage
    // as the original Express matcher; leave successful spelling untouched.
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    let parts = path.split('/').collect::<Vec<_>>();
    if let ["", api, platform, endpoint, key] = parts.as_slice()
        && api.eq_ignore_ascii_case("api")
        && platform.eq_ignore_ascii_case("platform")
        && endpoint.eq_ignore_ascii_case("system-settings")
        && !key.is_empty()
        && decode_uri_component(key).is_err()
    {
        return ApiError::message(
            StatusCode::BAD_REQUEST,
            format!("Failed to decode param '{key}'"),
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
async fn list(Extension(service): Extension<Arc<SystemSettingsService>>) -> Response {
    match service.list().await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn detail(
    Path(key): Path<String>,
    Extension(service): Extension<Arc<SystemSettingsService>>,
) -> Response {
    match service.get(&key).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn update(
    State(state): State<AuthHttpState>,
    Path(key): Path<String>,
    Extension(service): Extension<Arc<SystemSettingsService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
    request: Request,
) -> Response {
    let body = match validation::validate_update(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    match service
        .update(
            &key,
            body,
            Some(session.user.user_id),
            metadata.request_id,
            session.pending_flush.as_ref(),
            &state.service,
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
fn domain_error(error: SystemSettingsError) -> Response {
    match error {
        SystemSettingsError::NotFound(message) => {
            ApiError::message(StatusCode::NOT_FOUND, message).into_response()
        }
        SystemSettingsError::BadRequest(message) => {
            ApiError::message(StatusCode::BAD_REQUEST, message).into_response()
        }
        SystemSettingsError::Conflict(message) => {
            ApiError::message(StatusCode::CONFLICT, message).into_response()
        }
        SystemSettingsError::Database(_) | SystemSettingsError::Internal => {
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
        middleware,
    };
    use tower::ServiceExt;
    #[test]
    fn normalization_preserves_key_case_and_rejects_other_shapes() {
        assert_eq!(
            normalized_uri(
                &Method::PATCH,
                &"/API/PLATFORM/SYSTEM-SETTINGS/Attachment.KEY/?x=1"
                    .parse()
                    .unwrap_or_else(|_| panic!("uri"))
            )
            .map(|uri| uri.to_string())
            .as_deref(),
            Some("/api/platform/system-settings/Attachment.KEY?x=1")
        );
        for (method, path) in [
            (Method::POST, "/API/PLATFORM/SYSTEM-SETTINGS/key"),
            (Method::PATCH, "/API/PLATFORM/SYSTEM-SETTINGS/"),
            (Method::GET, "/API/PLATFORM/SYSTEM-SETTINGS//"),
            (Method::GET, "/api/platform/%73ystem-settings/key"),
        ] {
            assert!(
                normalized_uri(&method, &path.parse().unwrap_or_else(|_| panic!("uri"))).is_none()
            );
        }
    }

    #[tokio::test]
    async fn malformed_setting_capture_precedes_authentication_and_method_selection() {
        let app = Router::new()
            .fallback(|| async { StatusCode::UNAUTHORIZED })
            .layer(middleware::from_fn(normalize_uri));
        for method in ["GET", "PATCH", "POST"] {
            for bad in ["%FF", "%ZZ", "%E0%A4%A"] {
                for cookie in [None, Some("poms_session=synthetic-session")] {
                    let mut request = Request::builder()
                        .method(method)
                        .uri(format!("/API/PLATFORM/SYSTEM-SETTINGS/{bad}/?raw=1"));
                    if let Some(cookie) = cookie {
                        request = request.header("cookie", cookie);
                    }
                    let response = app
                        .clone()
                        .oneshot(
                            request
                                .body(Body::empty())
                                .unwrap_or_else(|_| panic!("request")),
                        )
                        .await
                        .unwrap_or_else(|_| panic!("response"));
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
                    let bytes = to_bytes(response.into_body(), 10000)
                        .await
                        .unwrap_or_else(|_| panic!("body"));
                    let body: serde_json::Value =
                        serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("JSON"));
                    assert_eq!(
                        body,
                        serde_json::json!({"statusCode":400,"message":format!("Failed to decode param '{bad}'"),"error":"Bad Request"})
                    );
                }
            }
        }
        for path in [
            "/api/platform/system-settings/%25ZZ",
            "/api/platform/system-settings/%E4%B8%AD",
            "/api/platform/system-settings/%FF//",
            "/api/platform/system-settings/%FF/extra",
            "/api/platform/%73ystem-settings/%FF",
            "/%61pi/platform/system-settings/%FF",
        ] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri(path)
                        .body(Body::empty())
                        .unwrap_or_else(|_| panic!("request")),
                )
                .await
                .unwrap_or_else(|_| panic!("response"));
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED, "{path}");
        }
    }
}
