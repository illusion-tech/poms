//! Existing Native transport, preserving raw path spelling and guard/DTO order.
use super::{Service, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    projects::model::Wire,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{OriginalUri, Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};
use std::sync::Arc;
fn response(status: StatusCode, value: Wire) -> Response {
    let mut response = (status, value.0).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    response
}
fn original_not_found(request: &Request) -> Response {
    let uri = request
        .extensions()
        .get::<OriginalUri>()
        .map_or_else(|| request.uri().clone(), |x| x.0.clone());
    ApiError::not_found(request.method(), &uri).into_response()
}
fn rewrite(mut request: Request, path: String) -> Result<Request, ApiError> {
    if request.uri().path() != path {
        if request.extensions().get::<OriginalUri>().is_none() {
            let original = request.uri().clone();
            request.extensions_mut().insert(OriginalUri(original));
        }
        let mut parts = request.uri().clone().into_parts();
        let path = match request.uri().query() {
            Some(query) => format!("{path}?{query}"),
            None => path,
        };
        parts.path_and_query = Some(path.parse().map_err(|_| ApiError::internal())?);
        *request.uri_mut() = Uri::from_parts(parts).map_err(|_| ApiError::internal())?;
    }
    Ok(request)
}

#[derive(Clone, Copy)]
enum Operation {
    List,
    Create,
    Workspace,
}
fn operation(method: &Method, path: &str) -> Option<Operation> {
    let parts = path.split('/').collect::<Vec<_>>();
    let ["", "api", "projects", id, tail] = parts.as_slice() else {
        return None;
    };
    if id.is_empty() {
        return None;
    }
    match (*tail, method) {
        ("bid-commercial-processes", &Method::GET | &Method::HEAD) => Some(Operation::List),
        ("bid-commercial-processes", &Method::POST) => Some(Operation::Create),
        ("bid-commercial-workspace", &Method::GET | &Method::HEAD) => Some(Operation::Workspace),
        _ => None,
    }
}
pub async fn normalize_uri(request: Request, next: Next) -> Response {
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    let parts = path.split('/').collect::<Vec<_>>();
    if let ["", api, projects, id, tail] = parts.as_slice()
        && api.eq_ignore_ascii_case("api")
        && projects.eq_ignore_ascii_case("projects")
        && !id.is_empty()
    {
        let tail = if tail.eq_ignore_ascii_case("bid-commercial-processes") {
            "bid-commercial-processes"
        } else if tail.eq_ignore_ascii_case("bid-commercial-workspace") {
            "bid-commercial-workspace"
        } else {
            return next.run(request).await;
        };
        let path = format!("/api/projects/{id}/{tail}");
        if operation(request.method(), &path).is_some() {
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
        .route(
            "/api/projects/{id}/bid-commercial-processes",
            get(dispatch).post(dispatch),
        )
        .route("/api/projects/{id}/bid-commercial-workspace", get(dispatch))
        .layer(Extension(service))
        .with_state(auth)
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<Service>>,
    request: Request,
) -> Response {
    let Some(op) = operation(request.method(), request.uri().path()) else {
        return original_not_found(&request);
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let permission = if matches!(op, Operation::Create) {
        PermissionKey::ProjectWrite
    } else {
        PermissionKey::ProjectRead
    };
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &RoutePolicy {
            all: vec![permission],
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
    let raw_id = parts.uri.path().split('/').nth(3).unwrap_or("");
    let id = match decode_uri_component(raw_id) {
        Ok(id) => id,
        Err(_) => return ApiError::internal().into_response(),
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let result = match op {
        Operation::List => service.list(&id).await,
        Operation::Workspace => service.workspace(&id, &session).await,
        Operation::Create => {
            let input = match validation::validate_create(parsed.raw()) {
                Ok(input) => input,
                Err(error) => return error.into_response(),
            };
            service.create(&id, input, &session).await
        }
    };
    match result {
        Ok(value) => response(
            if matches!(op, Operation::Create) {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            value,
        ),
        Err(error) => {
            use super::Error;
            match error {
                Error::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
                Error::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
                Error::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
                Error::Database(_) | Error::Internal => ApiError::internal(),
            }
            .into_response()
        }
    }
}
