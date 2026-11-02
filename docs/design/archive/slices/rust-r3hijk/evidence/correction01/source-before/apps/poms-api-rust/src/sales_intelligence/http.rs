//! The existing ten intelligence routes and their OR permission policies.
use super::{Service, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    opportunity_context::transport::{not_found, response, rewrite, validate_path_parameter},
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{Request, State},
    http::{Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, patch},
};
use std::sync::Arc;
#[derive(Clone, Copy)]
enum Resource {
    Stakeholder,
    Competitor,
    Discovery,
    Gaps,
}
#[derive(Clone, Copy)]
enum Kind {
    List,
    Create,
    Update,
}
fn resource(name: &str) -> Option<Resource> {
    match name {
        "opportunity-stakeholders" => Some(Resource::Stakeholder),
        "competitor-intelligence-records" => Some(Resource::Competitor),
        "sales-discovery-records" => Some(Resource::Discovery),
        "sales-intelligence-gaps" => Some(Resource::Gaps),
        _ => None,
    }
}
fn operation(method: &Method, path: &str) -> Option<(Resource, Kind)> {
    let p = path.split('/').collect::<Vec<_>>();
    match p.as_slice() {
        ["", "api", name] => {
            let r = resource(name)?;
            if matches!(*method, Method::GET | Method::HEAD) {
                Some((r, Kind::List))
            } else if *method == Method::POST && !matches!(r, Resource::Gaps) {
                Some((r, Kind::Create))
            } else {
                None
            }
        }
        ["", "api", name, id] if !id.is_empty() && *method == Method::PATCH => {
            let r = resource(name)?;
            (!matches!(r, Resource::Gaps)).then_some((r, Kind::Update))
        }
        _ => None,
    }
}
pub async fn normalize_uri(request: Request, next: Next) -> Response {
    let p = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path())
        .split('/')
        .collect::<Vec<_>>();
    if (p.len() == 3 || p.len() == 4) && p[0].is_empty() && p[1].eq_ignore_ascii_case("api") {
        let name = p[2].to_ascii_lowercase();
        if let Some(r) = resource(&name)
            && !(matches!(r, Resource::Gaps) && p.len() == 4)
        {
            if p.len() == 4
                && let Err(error) = validate_path_parameter(p[3])
            {
                return error.into_response();
            }
            let path = if p.len() == 3 {
                format!("/api/{name}")
            } else {
                format!("/api/{name}/{}", p[3])
            };
            if operation(request.method(), &path).is_some() {
                return match rewrite(request, path) {
                    Ok(request) => next.run(request).await,
                    Err(error) => error.into_response(),
                };
            }
        }
    }
    next.run(request).await
}
pub fn router(auth: AuthHttpState, service: Arc<Service>) -> Router {
    Router::new()
        .route(
            "/api/opportunity-stakeholders",
            get(dispatch).post(dispatch),
        )
        .route("/api/opportunity-stakeholders/{id}", patch(dispatch))
        .route(
            "/api/competitor-intelligence-records",
            get(dispatch).post(dispatch),
        )
        .route("/api/competitor-intelligence-records/{id}", patch(dispatch))
        .route("/api/sales-discovery-records", get(dispatch).post(dispatch))
        .route("/api/sales-discovery-records/{id}", patch(dispatch))
        .route("/api/sales-intelligence-gaps", get(dispatch))
        .layer(Extension(service))
        .with_state(auth)
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<Service>>,
    request: Request,
) -> Response {
    let Some((resource, kind)) = operation(request.method(), request.uri().path()) else {
        return not_found(&request);
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let any = if matches!(kind, Kind::List) {
        vec![PermissionKey::LeadRead, PermissionKey::ProjectRead]
    } else {
        vec![PermissionKey::LeadWrite, PermissionKey::ProjectWrite]
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
    let raw = parts.uri.path().split('/').nth(3).unwrap_or("");
    let id = match decode_uri_component(raw) {
        Ok(id) => id,
        Err(_) => return ApiError::internal().into_response(),
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
    let result = match (resource, kind) {
        (Resource::Stakeholder, Kind::List) => {
            service
                .list_stakeholders(valid!(validation::validate_query(Some(&query))))
                .await
        }
        (Resource::Competitor, Kind::List) => {
            service
                .list_competitors(valid!(validation::validate_query(Some(&query))))
                .await
        }
        (Resource::Discovery, Kind::List) => {
            service
                .list_discovery(valid!(validation::validate_query(Some(&query))))
                .await
        }
        (Resource::Gaps, Kind::List) => {
            service
                .gaps(valid!(validation::validate_query(Some(&query))))
                .await
        }
        (Resource::Stakeholder, Kind::Create) => {
            service
                .create_stakeholder(
                    valid!(validation::validate_create_stakeholder(parsed.raw())),
                    &session,
                )
                .await
        }
        (Resource::Competitor, Kind::Create) => {
            service
                .create_competitor(
                    valid!(validation::validate_create_competitor(parsed.raw())),
                    &session,
                )
                .await
        }
        (Resource::Discovery, Kind::Create) => {
            service
                .create_discovery(
                    valid!(validation::validate_create_discovery(parsed.raw())),
                    &session,
                )
                .await
        }
        (Resource::Stakeholder, Kind::Update) => {
            service
                .update_stakeholder(
                    &id,
                    valid!(validation::validate_update_stakeholder(parsed.raw())),
                    &session,
                    &metadata,
                )
                .await
        }
        (Resource::Competitor, Kind::Update) => {
            service
                .update_competitor(
                    &id,
                    valid!(validation::validate_update_competitor(parsed.raw())),
                    &session,
                    &metadata,
                )
                .await
        }
        (Resource::Discovery, Kind::Update) => {
            service
                .update_discovery(
                    &id,
                    valid!(validation::validate_update_discovery(parsed.raw())),
                    &session,
                    &metadata,
                )
                .await
        }
        _ => return ApiError::internal().into_response(),
    };
    match result {
        Ok(value) => response(
            if matches!(kind, Kind::Create) {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            value,
        ),
        Err(error) => error.into_api_error().into_response(),
    }
}
