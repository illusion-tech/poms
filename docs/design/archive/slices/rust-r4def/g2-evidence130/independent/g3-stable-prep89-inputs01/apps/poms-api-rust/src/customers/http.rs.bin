//! Original customer transport and authorization; no new public API shape.

use super::{service::CustomersService, validation};
use crate::{
    auth::{
        guards::{RequestMetadata, RoutePolicy},
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
    routing::{delete, get, patch, post},
};
use std::sync::Arc;

fn read_policy() -> RoutePolicy {
    RoutePolicy {
        all: vec![PermissionKey::CustomerRead],
        ..RoutePolicy::default()
    }
}
fn write_policy() -> RoutePolicy {
    RoutePolicy {
        all: vec![PermissionKey::CustomerWrite],
        ..RoutePolicy::default()
    }
}
pub fn openapi() -> serde_json::Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r3ab/a-openapi.json"))
        .unwrap_or_else(|_| panic!("invalid source-bound customer OpenAPI subset"))
}
pub fn router(state: AuthHttpState, service: Arc<CustomersService>) -> Router {
    Router::new()
        .route(
            "/api/customers",
            guarded_route(get(list), state.clone(), read_policy()).merge(guarded_route(
                post(create),
                state.clone(),
                write_policy(),
            )),
        )
        .route(
            "/api/customers/{id}",
            guarded_route(get(detail), state.clone(), read_policy()).merge(guarded_route(
                patch(update),
                state.clone(),
                write_policy(),
            )),
        )
        .route(
            "/api/customers/{id}/aliases",
            guarded_route(get(aliases), state.clone(), read_policy()).merge(guarded_route(
                post(create_alias),
                state.clone(),
                write_policy(),
            )),
        )
        .route(
            "/api/customers/{id}/workspace-overview",
            guarded_route(get(workspace), state.clone(), read_policy()),
        )
        .route(
            "/api/customer-aliases/{id}",
            guarded_route(delete(delete_alias), state.clone(), write_policy()),
        )
        .layer(Extension(service))
        .with_state(state)
}

fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let parts = path.split('/').collect::<Vec<_>>();
    let canonical = match parts.as_slice() {
        ["", api, collection]
            if api.eq_ignore_ascii_case("api")
                && collection.eq_ignore_ascii_case("customers")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            "/api/customers".to_owned()
        }
        ["", api, collection, id]
            if api.eq_ignore_ascii_case("api")
                && collection.eq_ignore_ascii_case("customers")
                && !id.is_empty()
                && matches!(*method, Method::GET | Method::HEAD | Method::PATCH) =>
        {
            format!("/api/customers/{id}")
        }
        ["", api, collection, id, child]
            if api.eq_ignore_ascii_case("api")
                && collection.eq_ignore_ascii_case("customers")
                && !id.is_empty()
                && child.eq_ignore_ascii_case("aliases")
                && matches!(*method, Method::GET | Method::HEAD | Method::POST) =>
        {
            format!("/api/customers/{id}/aliases")
        }
        ["", api, collection, id, child]
            if api.eq_ignore_ascii_case("api")
                && collection.eq_ignore_ascii_case("customers")
                && !id.is_empty()
                && child.eq_ignore_ascii_case("workspace-overview")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            format!("/api/customers/{id}/workspace-overview")
        }
        ["", api, collection, id]
            if api.eq_ignore_ascii_case("api")
                && collection.eq_ignore_ascii_case("customer-aliases")
                && !id.is_empty()
                && *method == Method::DELETE =>
        {
            format!("/api/customer-aliases/{id}")
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
/// Root installs this before dispatch, retaining the raw URI used by guards.
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
async fn list(
    Extension(service): Extension<Arc<CustomersService>>,
    RawQuery(query): RawQuery,
) -> Response {
    let query = match validation::validate_list(query.as_deref()) {
        Ok(query) => query,
        Err(error) => return error.into_response(),
    };
    match service.list(query).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn detail(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<CustomersService>>,
) -> Response {
    match service.get(&id).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn aliases(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<CustomersService>>,
) -> Response {
    match service.list_aliases(&id).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn workspace(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<CustomersService>>,
) -> Response {
    match service.workspace_overview(&id).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn create(
    Extension(service): Extension<Arc<CustomersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_create(body.raw()) {
        Ok(input) => input,
        Err(error) => return error.into_response(),
    };
    match service
        .create(
            input,
            &session.user_snapshot,
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => (StatusCode::CREATED, Json(value)).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn update(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<CustomersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_update(body.raw()) {
        Ok(input) => input,
        Err(error) => return error.into_response(),
    };
    match service
        .update(
            &id,
            input,
            &session.user_snapshot,
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn create_alias(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<CustomersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
) -> Response {
    let input = match validation::validate_alias(body.raw()) {
        Ok(input) => input,
        Err(error) => return error.into_response(),
    };
    match service
        .create_alias(
            &id,
            input,
            session.user.user_id,
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(value) => (StatusCode::CREATED, Json(value)).into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
async fn delete_alias(
    Path(id): Path<String>,
    Extension(service): Extension<Arc<CustomersService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    request: Request,
) -> Response {
    if let Err(error) = uuid_pipe(&id) {
        return error.into_response();
    }
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    match service
        .delete_alias(
            &id,
            session.user.user_id,
            metadata.request_id,
            session.pending_flush.as_ref(),
        )
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}
fn uuid_pipe(id: &str) -> Result<(), ApiError> {
    let bytes = id.as_bytes();
    if bytes.len() == 36
        && bytes.iter().enumerate().all(|(index, byte)| {
            if [8, 13, 18, 23].contains(&index) {
                *byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
    {
        Ok(())
    } else {
        Err(ApiError::message(
            StatusCode::BAD_REQUEST,
            "Validation failed (uuid is expected)",
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn customer_rewrite_retains_parameter_spelling_and_query_and_known_methods() {
        let uri: Uri = "/API/Customers/ABCD/Aliases/?x=1"
            .parse()
            .unwrap_or_else(|_| panic!("uri"));
        assert_eq!(
            normalized_uri(&Method::GET, &uri).map(|uri| uri.to_string()),
            Some("/api/customers/ABCD/aliases?x=1".to_owned())
        );
        assert!(normalized_uri(&Method::DELETE, &uri).is_none());
        assert!(
            normalized_uri(
                &Method::GET,
                &"/api/customers//".parse().unwrap_or_else(|_| panic!("uri"))
            )
            .is_none()
        );
    }
}
