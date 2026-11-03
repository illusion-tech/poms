//! Original discussion list/create transport with any-of opportunity policies.
use super::{Service, validation};
use crate::{
    auth::{
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    opportunity_context::transport::{not_found, response, rewrite},
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
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    if path.eq_ignore_ascii_case("/api/business-discussions")
        && matches!(*request.method(), Method::GET | Method::HEAD | Method::POST)
    {
        return match rewrite(request, "/api/business-discussions".to_owned()) {
            Ok(request) => next.run(request).await,
            Err(error) => error.into_response(),
        };
    }
    next.run(request).await
}
pub fn router(auth: AuthHttpState, service: Arc<Service>) -> Router {
    Router::new()
        .route("/api/business-discussions", get(dispatch).post(dispatch))
        .layer(Extension(service))
        .with_state(auth)
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<Service>>,
    request: Request,
) -> Response {
    if !matches!(*request.method(), Method::GET | Method::HEAD | Method::POST) {
        return not_found(&request);
    }
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let create = parts.method == Method::POST;
    let any = if create {
        vec![
            PermissionKey::CustomerWrite,
            PermissionKey::LeadWrite,
            PermissionKey::ProjectWrite,
        ]
    } else {
        vec![
            PermissionKey::CustomerRead,
            PermissionKey::LeadRead,
            PermissionKey::ProjectRead,
        ]
    };
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &RoutePolicy {
            any,
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
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let query = validation::query_raw(parts.uri.query());
    macro_rules! valid {
        ($e:expr) => {
            match $e {
                Ok(v) => v,
                Err(e) => return e.into_response(),
            }
        };
    }
    let result = if create {
        service
            .create(valid!(validation::validate_create(parsed.raw())), &session)
            .await
    } else {
        service
            .list(valid!(validation::validate_query(Some(&query))))
            .await
    };
    match result {
        Ok(value) => response(
            if create {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            value,
        ),
        Err(error) => error.into_api_error().into_response(),
    }
}
