//! Existing L4 HTTP surface. Body parsing/guards keep the shared transport;
//! each request lends exactly one connection to its common/domain service.
use super::{ApprovalService, context::PendingAuthentication, validation};
use crate::{
    approval_common::{
        CommonFailure, CommonSession, CommonState, FailureKind, Text, js::Value, service::object,
    },
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{OriginalUri, Request, State},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};
use serde_json::{Value as JsonValue, json};
use std::{collections::BTreeSet, sync::Arc};

#[derive(Clone, Copy)]
enum Op {
    Detail,
    Approve,
    Reject,
    Todos,
}

pub fn router(auth: AuthHttpState, service: ApprovalService) -> Router {
    Router::new()
        .route("/api/approval-records/{id}", get(dispatch).post(dispatch))
        .route("/api/me/todos", get(dispatch))
        .layer(Extension(Arc::new(service)))
        .with_state(auth)
}

fn command<'a>(value: &'a str, suffix: &str) -> Option<&'a str> {
    let at = value.len().checked_sub(suffix.len())?;
    let (id, tail) = value.get(..at).zip(value.get(at..))?;
    (!id.is_empty() && tail.eq_ignore_ascii_case(suffix)).then_some(id)
}
fn operation<'a>(method: &Method, path: &'a str) -> Option<(Op, Option<&'a str>)> {
    let safe = matches!(*method, Method::GET | Method::HEAD);
    let pieces = path.split('/').collect::<Vec<_>>();
    match pieces.as_slice() {
        ["", "api", "me", "todos"] if safe => Some((Op::Todos, None)),
        ["", "api", "approval-records", id] if !id.is_empty() && safe => {
            Some((Op::Detail, Some(id)))
        }
        ["", "api", "approval-records", id] if *method == Method::POST => command(id, ":approve")
            .map(|id| (Op::Approve, Some(id)))
            .or_else(|| command(id, ":reject").map(|id| (Op::Reject, Some(id)))),
        _ => None,
    }
}
fn canonical(path: &str) -> Option<String> {
    let path = path.strip_suffix('/').unwrap_or(path);
    if path.ends_with('/') {
        return None;
    }
    let mut pieces = path.split('/').map(str::to_owned).collect::<Vec<_>>();
    if pieces.len() != 4 || !pieces[0].is_empty() || !pieces[1].eq_ignore_ascii_case("api") {
        return None;
    }
    if pieces[2].eq_ignore_ascii_case("approval-records") {
        pieces[1] = "api".into();
        pieces[2] = "approval-records".into();
    } else if pieces[2].eq_ignore_ascii_case("me") && pieces[3].eq_ignore_ascii_case("todos") {
        pieces[1] = "api".into();
        pieces[2] = "me".into();
        pieces[3] = "todos".into();
    } else {
        return None;
    }
    Some(pieces.join("/"))
}

/// Original Express decodes a matched registered path capture even if that
/// layer's method does not dispatch. Keep the entire raw id/command capture.
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    if let Some(path) = canonical(request.uri().path()) {
        let pieces = path.split('/').collect::<Vec<_>>();
        if pieces[2] == "approval-records"
            && !pieces[3].is_empty()
            && decode_uri_component(pieces[3]).is_err()
        {
            return ApiError::message(
                StatusCode::BAD_REQUEST,
                format!("Failed to decode param '{}'", pieces[3]),
            )
            .into_response();
        }
        if operation(request.method(), &path).is_some() && path != request.uri().path() {
            let original = request.uri().clone();
            let mut parts = original.clone().into_parts();
            parts.path_and_query = match original.query() {
                Some(query) => format!("{path}?{query}"),
                None => path,
            }
            .parse()
            .ok();
            if let Ok(uri) = Uri::from_parts(parts) {
                if request.extensions().get::<OriginalUri>().is_none() {
                    request.extensions_mut().insert(OriginalUri(original));
                }
                *request.uri_mut() = uri;
            }
        }
    }
    next.run(request).await
}
fn policy(op: Op) -> RoutePolicy {
    match op {
        Op::Todos => RoutePolicy::authenticated(),
        Op::Detail => RoutePolicy {
            all: vec![PermissionKey::ProjectRead],
            ..RoutePolicy::default()
        },
        _ => RoutePolicy {
            all: vec![PermissionKey::ProjectWrite],
            ..RoutePolicy::default()
        },
    }
}
fn failure(error: CommonFailure) -> Response {
    if error.kind != FailureKind::Http {
        return ApiError::internal().into_response();
    }
    let Some(status) = error
        .status
        .and_then(|status| StatusCode::from_u16(status).ok())
    else {
        return ApiError::internal().into_response();
    };
    let body = Value::Object(object([
        ("statusCode", Value::Number(f64::from(status.as_u16()))),
        ("message", Value::Text(error.message)),
        (
            "error",
            Value::text(status.canonical_reason().unwrap_or("Error")),
        ),
    ]));
    ApiError::raw_json(status, body.json()).into_response()
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<ApprovalService>>,
    request: Request,
) -> Response {
    let Some((op, raw_id)) = operation(request.method(), request.uri().path()) else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |uri| uri.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(uri)).await;
    };
    let id = raw_id.map(str::to_owned);
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let resolved = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &policy(op),
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(Some(resolved)) => resolved,
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let id = match id.map(|id| decode_uri_component(&id)).transpose() {
        Ok(id) => Value::text(id.unwrap_or_default()),
        Err(_) => return ApiError::internal().into_response(),
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let input = if matches!(op, Op::Approve | Op::Reject) {
        match validation::validate(parsed.raw(), matches!(op, Op::Reject)) {
            Ok(input) => input,
            Err(error) => return error.into_response(),
        }
    } else {
        Default::default()
    };
    let actor = Value::Text(Text::from(resolved.user.user_id.to_string()));
    let database = service.database().clone();
    let result = database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut state = CommonState::default();
                let mut participant = PendingAuthentication::from_resolved(&resolved);
                let mut session = CommonSession::borrow_with_participant(
                    connection,
                    &mut state,
                    &mut participant,
                );
                let output = match op {
                    Op::Detail => service.get_record_with_session(&mut session, id).await,
                    Op::Todos => service.get_my_todos_with_session(&mut session, actor).await,
                    Op::Approve => {
                        service
                            .approve_with_session(&mut session, id, actor, input)
                            .await
                    }
                    Op::Reject => {
                        service
                            .reject_with_session(&mut session, id, actor, input)
                            .await
                    }
                };
                Ok(output)
            })
        })
        .await;
    match result {
        Ok(Ok(output)) => ApiError::raw_json(StatusCode::OK, output.json()).into_response(),
        Ok(Err(error)) => failure(error),
        Err(_) => ApiError::internal().into_response(),
    }
}

/// Clone precisely the four TS-owned operations and their recursive components.
/// This does not install a response parser or add any runtime validation.
pub fn openapi() -> JsonValue {
    let full: JsonValue = serde_json::from_str(include_str!(
        "../../../../libs/shared/api-spec/openapi.json"
    ))
    .unwrap_or_else(|_| panic!("original approval OpenAPI"));
    let mut output = json!({"openapi":full["openapi"],"paths":{},"components":{"schemas":{},"securitySchemes":full["components"]["securitySchemes"]}});
    for (path, method) in [
        ("/api/approval-records/{id}", "get"),
        ("/api/approval-records/{id}:approve", "post"),
        ("/api/approval-records/{id}:reject", "post"),
        ("/api/me/todos", "get"),
    ] {
        output["paths"][path] = json!({});
        output["paths"][path][method] = full["paths"][path][method].clone();
    }
    fn references(value: &JsonValue, names: &mut BTreeSet<String>, full: &JsonValue) {
        match value {
            JsonValue::Object(object) => {
                for (key, value) in object {
                    if key == "$ref" {
                        if let Some(name) = value
                            .as_str()
                            .and_then(|value| value.strip_prefix("#/components/schemas/"))
                            && names.insert(name.into())
                        {
                            references(&full["components"]["schemas"][name], names, full);
                        }
                    } else {
                        references(value, names, full);
                    }
                }
            }
            JsonValue::Array(values) => {
                for value in values {
                    references(value, names, full);
                }
            }
            _ => {}
        }
    }
    let mut names = BTreeSet::new();
    references(&output["paths"], &mut names, &full);
    for name in names {
        output["components"]["schemas"][&name] = full["components"]["schemas"][&name].clone();
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn canonical_commands_keep_literal_colon_and_item_identity() {
        let p = canonical("/API/APPROVAL-RECORDS/ABC:ApPrOvE/")
            .unwrap_or_else(|| panic!("original case-insensitive route"));
        assert!(matches!(
            operation(&Method::POST, &p),
            Some((Op::Approve, Some("ABC")))
        ));
        assert!(matches!(
            operation(&Method::GET, &p),
            Some((Op::Detail, Some("ABC:ApPrOvE")))
        ));
        assert!(operation(&Method::POST, "/api/approval-records/ABC%3Aapprove").is_none());
        assert!(operation(&Method::POST, "/api/approval-records/:approve").is_none());
        assert!(operation(&Method::PUT, "/api/approval-records/ABC:approve").is_none());
        assert!(canonical("/api/approval-records/ABC//").is_none());
    }
    #[test]
    fn four_original_openapi_operations_and_complete_recursive_components() {
        let output = openapi();
        let paths = output["paths"]
            .as_object()
            .unwrap_or_else(|| panic!("four paths"));
        assert_eq!(paths.len(), 4);
        assert_eq!(
            output["paths"]["/api/approval-records/{id}:approve"]["post"]["operationId"],
            "ApprovalController_approveRecord"
        );
        assert_eq!(
            output["components"]["schemas"]
                .as_object()
                .map(|schemas| schemas.len()),
            Some(15)
        );
    }
}
