//! The fourteen frozen Lead operations, including original command suffixes.
use super::{LeadsService, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    opportunity_context::transport::{
        not_found, response, rewrite, validate_path_parameter, validate_uuid_parameter,
    },
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{Request, State},
    http::{Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use std::sync::Arc;

#[derive(Clone, Copy)]
enum Operation {
    List,
    Create,
    Get,
    Update,
    Claim,
    Assign,
    Qualify,
    Close,
    Convert,
    History,
    Submit,
    Approve,
    Reject,
    Revoke,
}

fn command<'a>(value: &'a str, suffix: &str) -> Option<&'a str> {
    let index = value.len().checked_sub(suffix.len())?;
    let (id, tail) = value.get(..index).zip(value.get(index..))?;
    (!id.is_empty() && tail.eq_ignore_ascii_case(suffix)).then_some(id)
}
fn lead_command(value: &str) -> Option<(Operation, &str, &str)> {
    [
        (Operation::Claim, ":claim"),
        (Operation::Assign, ":assignOwner"),
        (Operation::Qualify, ":qualify"),
        (Operation::Close, ":close"),
        (Operation::Convert, ":convertToProject"),
    ]
    .into_iter()
    .find_map(|(op, suffix)| command(value, suffix).map(|id| (op, id, suffix)))
}
fn override_command(value: &str) -> Option<(Operation, &str, &str)> {
    [
        (Operation::Approve, ":approve"),
        (Operation::Reject, ":reject"),
        (Operation::Revoke, ":revoke"),
    ]
    .into_iter()
    .find_map(|(op, suffix)| command(value, suffix).map(|id| (op, id, suffix)))
}
fn operation(method: &Method, path: &str) -> Option<Operation> {
    let p = path.split('/').collect::<Vec<_>>();
    let safe = matches!(*method, Method::GET | Method::HEAD);
    match p.as_slice() {
        ["", "api", "leads"] if safe => Some(Operation::List),
        ["", "api", "leads"] if *method == Method::POST => Some(Operation::Create),
        ["", "api", "leads", id] if !id.is_empty() && safe => Some(Operation::Get),
        ["", "api", "leads", id] if !id.is_empty() && *method == Method::PATCH => {
            Some(Operation::Update)
        }
        ["", "api", "leads", id] if *method == Method::POST => lead_command(id).map(|x| x.0),
        ["", "api", "leads", id, "score-history"] if !id.is_empty() && safe => {
            Some(Operation::History)
        }
        ["", "api", "leads", id, "score-overrides"]
            if !id.is_empty() && *method == Method::POST =>
        {
            Some(Operation::Submit)
        }
        ["", "api", "lead-score-overrides", id] if *method == Method::POST => {
            override_command(id).map(|x| x.0)
        }
        _ => None,
    }
}
fn canonical(path: &str) -> Option<(String, Option<String>)> {
    let p = path
        .strip_suffix('/')
        .unwrap_or(path)
        .split('/')
        .collect::<Vec<_>>();
    if p.first() != Some(&"") || !p.get(1)?.eq_ignore_ascii_case("api") {
        return None;
    }
    if p.get(2)?.eq_ignore_ascii_case("leads") {
        match p.as_slice() {
            [_, _, _] => Some(("/api/leads".to_owned(), None)),
            [_, _, _, id] if !id.is_empty() => {
                let (id, suffix) = lead_command(id).map_or((*id, ""), |(_, id, s)| (id, s));
                Some((format!("/api/leads/{id}{suffix}"), Some(id.to_owned())))
            }
            [_, _, _, id, tail]
                if !id.is_empty()
                    && (tail.eq_ignore_ascii_case("score-history")
                        || tail.eq_ignore_ascii_case("score-overrides")) =>
            {
                Some((
                    format!("/api/leads/{id}/{}", tail.to_ascii_lowercase()),
                    Some((*id).to_owned()),
                ))
            }
            _ => None,
        }
    } else if p.get(2)?.eq_ignore_ascii_case("lead-score-overrides") {
        match p.as_slice() {
            [_, _, _, raw] => override_command(raw).map(|(_, id, suffix)| {
                (
                    format!("/api/lead-score-overrides/{id}{suffix}"),
                    Some(id.to_owned()),
                )
            }),
            _ => None,
        }
    } else {
        None
    }
}
pub async fn normalize_uri(request: Request, next: Next) -> Response {
    if let Some((path, id)) = canonical(request.uri().path()) {
        if let Some(id) = id
            && let Err(error) = validate_path_parameter(&id)
        {
            return error.into_response();
        }
        if operation(request.method(), &path).is_some() {
            return match rewrite(request, path) {
                Ok(request) => next.run(request).await,
                Err(error) => error.into_response(),
            };
        }
    }
    next.run(request).await
}
pub fn router(auth: AuthHttpState, service: Arc<LeadsService>) -> Router {
    Router::new()
        .route("/api/leads", get(dispatch).post(dispatch))
        .route(
            "/api/leads/{id}",
            get(dispatch).patch(dispatch).post(dispatch),
        )
        .route("/api/leads/{id}/score-history", get(dispatch))
        .route("/api/leads/{id}/score-overrides", post(dispatch))
        .route("/api/lead-score-overrides/{id}", post(dispatch))
        .layer(Extension(service))
        .with_state(auth)
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<LeadsService>>,
    request: Request,
) -> Response {
    let Some(op) = operation(request.method(), request.uri().path()) else {
        return not_found(&request);
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let all = match op {
        Operation::List | Operation::Get | Operation::History => vec![PermissionKey::LeadRead],
        Operation::Assign => vec![PermissionKey::LeadAssign],
        Operation::Convert => vec![PermissionKey::LeadWrite, PermissionKey::ProjectWrite],
        Operation::Approve | Operation::Reject | Operation::Revoke => {
            vec![PermissionKey::LeadScoreOverride]
        }
        _ => vec![PermissionKey::LeadWrite],
    };
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &RoutePolicy {
            all,
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
    let raw = match op {
        Operation::Claim
        | Operation::Assign
        | Operation::Qualify
        | Operation::Close
        | Operation::Convert => lead_command(raw).map_or(raw, |x| x.1),
        Operation::Approve | Operation::Reject | Operation::Revoke => {
            override_command(raw).map_or(raw, |x| x.1)
        }
        _ => raw,
    };
    let id = match decode_uri_component(raw) {
        Ok(id) => id,
        Err(_) => return ApiError::internal().into_response(),
    };
    if !matches!(op, Operation::List | Operation::Create)
        && let Err(error) = validate_uuid_parameter(&id, "id")
    {
        return error.into_response();
    }
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
    let result = match op {
        Operation::List => {
            service
                .list(valid!(validation::validate_query(Some(&query))), &session)
                .await
        }
        Operation::Create => {
            service
                .create(valid!(validation::validate_create(parsed.raw())), &session)
                .await
        }
        Operation::Get => service.get(&id, &session).await,
        Operation::Update => {
            service
                .update(
                    &id,
                    valid!(validation::validate_update(parsed.raw())),
                    &session,
                    metadata.request_id.as_deref(),
                )
                .await
        }
        Operation::Claim => {
            service
                .claim(
                    &id,
                    valid!(validation::validate_claim(parsed.raw())),
                    &session,
                )
                .await
        }
        Operation::Assign => {
            service
                .assign(
                    &id,
                    valid!(validation::validate_assign(parsed.raw())),
                    &session,
                )
                .await
        }
        Operation::Qualify => {
            service
                .qualify(
                    &id,
                    valid!(validation::validate_qualify(parsed.raw())),
                    &session,
                )
                .await
        }
        Operation::Close => {
            service
                .close(
                    &id,
                    valid!(validation::validate_close(parsed.raw())),
                    &session,
                )
                .await
        }
        Operation::Convert => {
            service
                .convert(
                    &id,
                    valid!(validation::validate_convert(parsed.raw())),
                    &session,
                )
                .await
        }
        Operation::History => service.score_history(&id).await,
        Operation::Submit => {
            service
                .submit_override(
                    &id,
                    valid!(validation::validate_submit_override(parsed.raw())),
                    &session,
                    metadata.request_id.as_deref(),
                )
                .await
        }
        Operation::Approve => {
            service
                .approve_override(
                    &id,
                    valid!(validation::validate_approve_override(parsed.raw())),
                    &session,
                    metadata.request_id.as_deref(),
                )
                .await
        }
        Operation::Reject => {
            service
                .reject_override(
                    &id,
                    valid!(validation::validate_reject_override(parsed.raw())),
                    &session,
                    metadata.request_id.as_deref(),
                )
                .await
        }
        Operation::Revoke => {
            service
                .revoke_override(
                    &id,
                    valid!(validation::validate_revoke_override(parsed.raw())),
                    &session,
                    metadata.request_id.as_deref(),
                )
                .await
        }
    };
    match result {
        Ok(value) => response(
            if matches!(op, Operation::Create | Operation::Submit) {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            value,
        ),
        Err(error) => error.into_api_error().into_response(),
    }
}
