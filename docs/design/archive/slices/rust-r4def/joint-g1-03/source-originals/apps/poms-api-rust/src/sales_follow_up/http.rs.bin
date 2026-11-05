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
async fn original_not_found(request: Request) -> Response {
    let uri = request
        .extensions()
        .get::<OriginalUri>()
        .map_or_else(|| request.uri().clone(), |x| x.0.clone());
    crate::http::not_found(request.method().clone(), OriginalUri(uri)).await
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
    Replace,
    Void,
}
fn command(value: &str, suffix: &str) -> Option<String> {
    let start = value.len().checked_sub(suffix.len())?;
    let (id, tail) = value.get(..start).zip(value.get(start..))?;
    (!id.is_empty() && tail.eq_ignore_ascii_case(suffix)).then(|| id.to_owned())
}
fn operation(method: &Method, path: &str) -> Option<Operation> {
    let p = path.split('/').collect::<Vec<_>>();
    match p.as_slice() {
        ["", "api", "sales-follow-up-records"] if matches!(*method, Method::GET | Method::HEAD) => {
            Some(Operation::List)
        }
        ["", "api", "sales-follow-up-records"] if *method == Method::POST => {
            Some(Operation::Create)
        }
        ["", "api", "sales-follow-up-records", id]
            if *method == Method::POST && command(id, ":replace").is_some() =>
        {
            Some(Operation::Replace)
        }
        ["", "api", "sales-follow-up-records", id]
            if *method == Method::POST && command(id, ":void").is_some() =>
        {
            Some(Operation::Void)
        }
        _ => None,
    }
}
pub async fn normalize_uri(request: Request, next: Next) -> Response {
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    let p = path.split('/').collect::<Vec<_>>();
    if (p.len() == 3 || p.len() == 4)
        && p[0].is_empty()
        && p[1].eq_ignore_ascii_case("api")
        && p[2].eq_ignore_ascii_case("sales-follow-up-records")
    {
        let path = if p.len() == 3 {
            "/api/sales-follow-up-records".to_owned()
        } else {
            format!("/api/sales-follow-up-records/{}", p[3])
        };
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
        .route("/api/sales-follow-up-records", get(dispatch).post(dispatch))
        .route(
            "/api/sales-follow-up-records/{id}",
            axum::routing::post(dispatch),
        )
        .layer(Extension(service))
        .with_state(auth)
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<Service>>,
    request: Request,
) -> Response {
    let Some(op) = operation(request.method(), request.uri().path()) else {
        return original_not_found(request).await;
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let permissions = if matches!(op, Operation::List) {
        vec![
            PermissionKey::CustomerRead,
            PermissionKey::LeadRead,
            PermissionKey::ProjectRead,
        ]
    } else {
        vec![
            PermissionKey::CustomerWrite,
            PermissionKey::LeadWrite,
            PermissionKey::ProjectWrite,
        ]
    };
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &RoutePolicy {
            any: permissions,
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
    let raw_id = parts.uri.path().split('/').nth(3).unwrap_or("");
    let raw_id = if matches!(op, Operation::Replace) {
        command(raw_id, ":replace").unwrap_or_default()
    } else if matches!(op, Operation::Void) {
        command(raw_id, ":void").unwrap_or_default()
    } else {
        raw_id.to_owned()
    };
    let id = match decode_uri_component(&raw_id) {
        Ok(id) => id,
        Err(_) => return ApiError::internal().into_response(),
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let query = validation::query_raw(parts.uri.query());
    macro_rules! valid {
        ($input:expr) => {
            match $input {
                Ok(input) => input,
                Err(error) => return error.into_response(),
            }
        };
    }
    let result = match op {
        Operation::List => {
            service
                .list(valid!(validation::validate_query(Some(&query))))
                .await
        }
        Operation::Create => {
            service
                .create(valid!(validation::validate_create(parsed.raw())), &session)
                .await
        }
        Operation::Replace => {
            service
                .replace(
                    &id,
                    valid!(validation::validate_replace(parsed.raw())),
                    &session,
                    &metadata,
                )
                .await
        }
        Operation::Void => {
            service
                .void(
                    &id,
                    valid!(validation::validate_void(parsed.raw())),
                    &session,
                    &metadata,
                )
                .await
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
        Err(error) => error.into_api_error().into_response(),
    }
}
