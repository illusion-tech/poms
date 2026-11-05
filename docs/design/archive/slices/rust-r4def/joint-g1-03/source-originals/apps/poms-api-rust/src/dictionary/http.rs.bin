use super::{DictionaryError, DictionaryService, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::RoutePolicy,
        http::{AuthHttpState, ParsedBody, guarded_route},
        model::ResolvedSession,
    },
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Json, Router,
    extract::{OriginalUri, Path, RawQuery, Request},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, patch, post},
};
use std::sync::Arc;
pub fn router(state: AuthHttpState, service: Arc<DictionaryService>) -> Router {
    let write = RoutePolicy {
        all: vec![PermissionKey::PlatformDictionariesManage],
        ..Default::default()
    };
    let read = RoutePolicy {
        any: vec![
            PermissionKey::LeadRead,
            PermissionKey::CustomerRead,
            PermissionKey::ProjectRead,
            PermissionKey::ContractFinanceManage,
            PermissionKey::PlatformDictionariesManage,
        ],
        ..Default::default()
    };
    Router::new()
        .route(
            "/api/dictionaries",
            guarded_route(get(list), state.clone(), read).merge(guarded_route(
                post(create),
                state.clone(),
                write.clone(),
            )),
        )
        .route(
            "/api/dictionaries/{id}",
            guarded_route(patch(update), state.clone(), write),
        )
        .layer(Extension(service))
        .with_state(state)
}
pub fn openapi() -> serde_json::Value {
    serde_json::from_str(include_str!(
        "../../../../tools/rust-r2ef/e-dictionary-openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid generated dictionary OpenAPI"))
}
fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let segments = path.split('/').collect::<Vec<_>>();
    let canonical = match segments.as_slice() {
        ["", api, endpoint]
            if api.eq_ignore_ascii_case("api")
                && endpoint.eq_ignore_ascii_case("dictionaries")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            "/api/dictionaries".to_owned()
        }
        ["", api, endpoint, id]
            if api.eq_ignore_ascii_case("api")
                && endpoint.eq_ignore_ascii_case("dictionaries")
                && !id.is_empty()
                && *method == Method::PATCH =>
        {
            format!("/api/dictionaries/{id}")
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
    // Like the already-witnessed audit route matcher, Express decodes a
    // matched capture before method selection and before the Nest guards.
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    let parts = path.split('/').collect::<Vec<_>>();
    if let ["", api, endpoint, id] = parts.as_slice()
        && api.eq_ignore_ascii_case("api")
        && endpoint.eq_ignore_ascii_case("dictionaries")
        && !id.is_empty()
        && decode_uri_component(id).is_err()
    {
        return ApiError::message(
            StatusCode::BAD_REQUEST,
            format!("Failed to decode param '{id}'"),
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
async fn list(
    Extension(service): Extension<Arc<DictionaryService>>,
    RawQuery(query): RawQuery,
) -> Response {
    let request = match validation::validate_query(Some(&validation::query_raw(query.as_deref()))) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.list(request).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}
async fn create(
    Extension(service): Extension<Arc<DictionaryService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
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
    Extension(service): Extension<Arc<DictionaryService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
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
fn domain_error(error: DictionaryError) -> Response {
    match error {
        DictionaryError::NotFound(message) => {
            ApiError::message(StatusCode::NOT_FOUND, message).into_response()
        }
        DictionaryError::BadRequest(message) => {
            ApiError::message(StatusCode::BAD_REQUEST, message).into_response()
        }
        DictionaryError::Conflict(message) => {
            ApiError::message(StatusCode::CONFLICT, message).into_response()
        }
        DictionaryError::Database(_) | DictionaryError::Internal => {
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
    fn normalization_is_limited_to_the_three_existing_operation_shapes() {
        for (method, path, expected) in [
            (
                Method::GET,
                "/API/DICTIONARIES/?raw=1",
                "/api/dictionaries?raw=1",
            ),
            (Method::HEAD, "/API/DICTIONARIES/", "/api/dictionaries"),
            (
                Method::PATCH,
                "/API/DICTIONARIES/ABC%44/",
                "/api/dictionaries/ABC%44",
            ),
        ] {
            assert_eq!(
                normalized_uri(&method, &path.parse().unwrap_or_else(|_| panic!("uri")))
                    .map(|uri| uri.to_string())
                    .as_deref(),
                Some(expected)
            );
        }
        for (method, path) in [
            (Method::GET, "/API/DICTIONARIES/id"),
            (Method::DELETE, "/API/DICTIONARIES/id"),
            (Method::POST, "/API/DICTIONARIES/id"),
            (Method::GET, "/API/DICTIONARIES//"),
            (Method::GET, "/%61pi/dictionaries"),
        ] {
            assert!(
                normalized_uri(&method, &path.parse().unwrap_or_else(|_| panic!("uri"))).is_none()
            );
        }
    }

    #[tokio::test]
    async fn malformed_dictionary_capture_precedes_authentication_and_method_selection() {
        let app = Router::new()
            .fallback(|| async { StatusCode::UNAUTHORIZED })
            .layer(middleware::from_fn(normalize_uri));
        for method in ["GET", "PATCH", "POST"] {
            for bad in ["%FF", "%ZZ", "%E0%A4%A"] {
                for cookie in [None, Some("poms_session=synthetic-session")] {
                    let mut request = Request::builder()
                        .method(method)
                        .uri(format!("/API/DICTIONARIES/{bad}/?raw=1"));
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
            "/api/dictionaries/%25FF",
            "/api/dictionaries/%E4%B8%AD",
            "/api/dictionaries/%FF//",
            "/api/dictionaries/%FF/extra",
            "/%61pi/dictionaries/%FF",
            "/api/%64ictionaries/%FF",
            "/api/dictionaries?keyword=%FF",
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
