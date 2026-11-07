//! The six frozen project paths. Decode errors precede guards just as the
//! original Express registered path layers do, including wrong-method requests.

use std::sync::Arc;

use axum::{
    Extension, Router,
    extract::{OriginalUri, Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};

use super::{ProjectsService, model::Wire, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    shared::generated::PermissionKey,
};

pub fn openapi() -> serde_json::Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r3ab/b-openapi.json"))
        .unwrap_or_else(|_| panic!("invalid original project OpenAPI subset"))
}

#[derive(Clone, Copy)]
enum Operation {
    List,
    Create,
    Get,
    Update,
    Reassign,
    Lookup,
}

fn command(value: &str) -> Option<&str> {
    let suffix = ":reassignOwner";
    let start = value.len().checked_sub(suffix.len())?;
    let (id, tail) = value.get(..start).zip(value.get(start..))?;
    (!id.is_empty() && tail.eq_ignore_ascii_case(suffix)).then_some(id)
}

fn operation(method: &Method, path: &str) -> Option<Operation> {
    let safe = matches!(*method, Method::GET | Method::HEAD);
    let parts = path.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        ["", "api", "projects"] if safe => Some(Operation::List),
        ["", "api", "projects"] if *method == Method::POST => Some(Operation::Create),
        ["", "api", "projects:lookup"] if safe => Some(Operation::Lookup),
        ["", "api", "projects", id] if !id.is_empty() && safe => Some(Operation::Get),
        ["", "api", "projects", id] if !id.is_empty() && *method == Method::PATCH => {
            Some(Operation::Update)
        }
        ["", "api", "projects", id] if *method == Method::POST && command(id).is_some() => {
            Some(Operation::Reassign)
        }
        _ => None,
    }
}

fn canonical(path: &str) -> Option<String> {
    let path = path.strip_suffix('/').unwrap_or(path);
    if path.ends_with('/') {
        return None;
    }
    let mut parts = path.split('/').map(str::to_owned).collect::<Vec<_>>();
    if !(parts.len() == 3 || parts.len() == 4)
        || !parts[0].is_empty()
        || !parts[1].eq_ignore_ascii_case("api")
        || !(parts[2].eq_ignore_ascii_case("projects")
            || parts.len() == 3 && parts[2].eq_ignore_ascii_case("projects:lookup"))
    {
        return None;
    }
    parts[1].make_ascii_lowercase();
    parts[2].make_ascii_lowercase();
    Some(parts.join("/"))
}

pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    if let Some(path) = canonical(request.uri().path()) {
        let parts = path.split('/').collect::<Vec<_>>();
        if let ["", "api", "projects", id] = parts.as_slice()
            && decode_uri_component(id).is_err()
        {
            return ApiError::message(
                StatusCode::BAD_REQUEST,
                format!("Failed to decode param '{id}'"),
            )
            .into_response();
        }
        if operation(request.method(), &path).is_some() && path != request.uri().path() {
            if request.extensions().get::<OriginalUri>().is_none() {
                let original = request.uri().clone();
                request.extensions_mut().insert(OriginalUri(original));
            }
            let mut uri = request.uri().clone().into_parts();
            let value = match request.uri().query() {
                Some(query) => format!("{path}?{query}"),
                None => path,
            };
            let Ok(path_and_query) = value.parse() else {
                return ApiError::internal().into_response();
            };
            uri.path_and_query = Some(path_and_query);
            let Ok(uri) = Uri::from_parts(uri) else {
                return ApiError::internal().into_response();
            };
            *request.uri_mut() = uri;
        }
    }
    next.run(request).await
}

pub fn router(auth: AuthHttpState, service: Arc<ProjectsService>) -> Router {
    Router::new()
        .route("/api/projects", get(dispatch).post(dispatch))
        .route("/api/projects:lookup", get(dispatch))
        // Literal command suffixes share one matchit segment with UUID paths.
        // dispatch rejects wrong operations before authorization, preserving404.
        .route(
            "/api/projects/{id}",
            get(dispatch).patch(dispatch).post(dispatch),
        )
        .layer(Extension(service))
        .with_state(auth)
}

fn success_status(operation: Operation) -> StatusCode {
    if matches!(operation, Operation::Create) {
        StatusCode::CREATED
    } else {
        StatusCode::OK
    }
}

fn response(status: StatusCode, value: Wire) -> Response {
    let mut response = (status, value.0).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    response
}

async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<ProjectsService>>,
    request: Request,
) -> Response {
    let Some(op) = operation(request.method(), request.uri().path()) else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |value| value.0.clone());
        return ApiError::not_found(request.method(), &uri).into_response();
    };
    let (mut parts, _body) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let permission = if matches!(
        op,
        Operation::Create | Operation::Update | Operation::Reassign
    ) {
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
    let raw_id = if matches!(op, Operation::Reassign) {
        command(raw_id).unwrap_or(raw_id)
    } else {
        raw_id
    };
    let id = match decode_uri_component(raw_id) {
        Ok(value) => value,
        Err(_) => return ApiError::internal().into_response(),
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let query = validation::query_raw(parts.uri.query());
    macro_rules! validate {
        ($value:expr) => {
            match $value {
                Ok(value) => value,
                Err(error) => return error.into_response(),
            }
        };
    }
    let result = match op {
        Operation::List => {
            service
                .list(validate!(validation::validate_query(Some(&query))))
                .await
        }
        Operation::Lookup => {
            service
                .lookup(validate!(validation::validate_lookup(Some(&query))))
                .await
        }
        Operation::Get => service.get(&id, &session, &metadata).await,
        Operation::Create => {
            service
                .create(
                    validate!(validation::validate_create(parsed.raw())),
                    &session,
                )
                .await
        }
        Operation::Update => {
            service
                .update(
                    &id,
                    validate!(validation::validate_update(parsed.raw())),
                    &session,
                    &metadata,
                )
                .await
        }
        Operation::Reassign => {
            return reassign(
                &service,
                &id,
                validate!(validation::validate_reassign(parsed.raw())),
                &session,
                &metadata,
            )
            .await;
        }
    };
    match result {
        Ok(value) => response(success_status(op), value),
        Err(error) => error.into_api_error().into_response(),
    }
}

async fn reassign(
    service: &ProjectsService,
    id: &str,
    input: super::model::ReassignProjectOwner,
    session: &crate::auth::model::ResolvedSession,
    metadata: &crate::auth::guards::RequestMetadata,
) -> Response {
    match service.reassign(id, input, session, metadata).await {
        // The canonical contract has only 200. Preserve old Native/MASK09 201
        // as failed-contract evidence; a committed reassignment is not retried.
        Ok(value) => response(success_status(Operation::Reassign), value),
        Err(error) => error.into_api_error().into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_success_status_distinguishes_creation_from_updates_and_reassignment() {
        assert_eq!(success_status(Operation::Create), StatusCode::CREATED);
        for operation in [
            Operation::List,
            Operation::Get,
            Operation::Lookup,
            Operation::Update,
            Operation::Reassign,
        ] {
            assert_eq!(success_status(operation), StatusCode::OK);
        }
    }
    #[test]
    fn only_six_original_operation_shapes_are_dispatched() {
        for (method, path) in [
            (Method::GET, "/api/projects"),
            (Method::HEAD, "/api/projects"),
            (Method::POST, "/api/projects"),
            (Method::GET, "/api/projects:lookup"),
            (Method::GET, "/api/projects/id"),
            (Method::PATCH, "/api/projects/id"),
            (Method::POST, "/api/projects/id:reassignOwner"),
        ] {
            assert!(operation(&method, path).is_some());
        }
        for (method, path) in [
            (Method::DELETE, "/api/projects/id"),
            (Method::POST, "/api/projects/id"),
            (Method::POST, "/api/projects/id%3AreassignOwner"),
            (Method::GET, "/api/projects/code/P"),
            (Method::GET, "/api/projects:lookupExtra"),
            (Method::GET, "/api/projects/id/timeline"),
            (Method::GET, "/api/projects/id/workspace-guidance"),
        ] {
            assert!(operation(&method, path).is_none());
        }
        assert_eq!(command("AbC:REASSIGNOWNER"), Some("AbC"));
        assert_eq!(
            canonical("/API/PROJECTS/AbC/"),
            Some("/api/projects/AbC".into())
        );
        assert!(canonical("/api/projects//").is_none());
    }
}
