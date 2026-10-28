//! Four frozen runtime-audit routes, using the existing parser and auth guards.

use std::sync::Arc;

use axum::{
    Extension, Json, Router,
    extract::{OriginalUri, Path, RawQuery, Request, State},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde_json::{Value, json};

use super::{
    model::{QueryKind, RecordRouteDenied},
    query,
    service::{RuntimeAuditError, RuntimeAuditService},
    validation,
};
use crate::{
    auth::{
        audit::{SecurityEventInput, SecurityResult, SecuritySeverity},
        cookie::decode_uri_component,
        guards::{RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody, guarded_route},
        model::{AuthUser, ResolvedSession},
    },
    error::ApiError,
    shared::generated::PermissionKey,
};

fn global_policy() -> RoutePolicy {
    RoutePolicy {
        all: vec![PermissionKey::PlatformUsersManage],
        ..RoutePolicy::default()
    }
}
fn entity_policy() -> RoutePolicy {
    RoutePolicy {
        any: vec![
            PermissionKey::CustomerRead,
            PermissionKey::LeadRead,
            PermissionKey::ProjectRead,
        ],
        ..RoutePolicy::default()
    }
}

pub fn router(auth: AuthHttpState, service: Arc<RuntimeAuditService>) -> Router {
    Router::new()
        .route(
            "/api/audit-logs",
            guarded_route(get(list_audit_logs), auth.clone(), global_policy()),
        )
        .route(
            "/api/audit-logs/targets/{targetType}/{targetId}",
            guarded_route(get(list_entity_audit_logs), auth.clone(), entity_policy()),
        )
        .route(
            "/api/security-events",
            guarded_route(get(list_security_events), auth.clone(), global_policy()),
        )
        .route(
            "/api/security-events:recordRouteDenied",
            guarded_route(
                post(record_route_denied),
                auth.clone(),
                RoutePolicy::authenticated(),
            ),
        )
        .layer(Extension(service))
        .with_state(auth)
}

fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let parts = path.split('/').collect::<Vec<_>>();
    if parts.len() < 3 || !parts[0].is_empty() || !parts[1].eq_ignore_ascii_case("api") {
        return None;
    }
    let canonical = match parts.as_slice() {
        ["", _, endpoint]
            if endpoint.eq_ignore_ascii_case("audit-logs")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            "/api/audit-logs".to_owned()
        }
        ["", _, endpoint]
            if endpoint.eq_ignore_ascii_case("security-events")
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            "/api/security-events".to_owned()
        }
        ["", _, endpoint]
            if endpoint.eq_ignore_ascii_case("security-events:recordRouteDenied")
                && *method == Method::POST =>
        {
            "/api/security-events:recordRouteDenied".to_owned()
        }
        ["", _, endpoint, targets, target_type, target_id]
            if endpoint.eq_ignore_ascii_case("audit-logs")
                && targets.eq_ignore_ascii_case("targets")
                && !target_type.is_empty()
                && !target_id.is_empty()
                && matches!(*method, Method::GET | Method::HEAD) =>
        {
            format!("/api/audit-logs/targets/{target_type}/{target_id}")
        }
        _ => return None,
    };
    if canonical == uri.path() {
        return None;
    }
    let mut result = uri.clone().into_parts();
    result.path_and_query = Some(
        match uri.query() {
            Some(query) => format!("{canonical}?{query}"),
            None => canonical,
        }
        .parse()
        .ok()?,
    );
    Uri::from_parts(result).ok()
}

/// Only these existing operation shapes get Express case/single-slash behavior.
/// Keep dynamic spelling and the raw original URI for guards and error events.
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    // Express's route matcher decodes captures before checking the method and
    // invoking Nest guards. Its URIError is mapped to BadRequestException by
    // the existing Express adapter; Axum's Path extractor would run too late.
    let path = request
        .uri()
        .path()
        .strip_suffix('/')
        .unwrap_or(request.uri().path());
    let parts = path.split('/').collect::<Vec<_>>();
    if let ["", api, endpoint, targets, target_type, target_id] = parts.as_slice()
        && api.eq_ignore_ascii_case("api")
        && endpoint.eq_ignore_ascii_case("audit-logs")
        && targets.eq_ignore_ascii_case("targets")
        && !target_type.is_empty()
        && !target_id.is_empty()
    {
        for value in [target_type, target_id] {
            if decode_uri_component(value).is_err() {
                return ApiError::message(
                    StatusCode::BAD_REQUEST,
                    format!("Failed to decode param '{value}'"),
                )
                .into_response();
            }
        }
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

pub fn openapi() -> Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-openapi.json"))
        .unwrap_or_else(|_| panic!("invalid original runtime-audit OpenAPI subset"))
}

async fn list_audit_logs(
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<RuntimeAuditService>>,
) -> Response {
    let raw = query::parse(raw.as_deref());
    let query = match validation::validate_query(QueryKind::Audit, Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.list_audit_logs(query).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

async fn list_entity_audit_logs(
    Path((target_type, target_id)): Path<(String, String)>,
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<RuntimeAuditService>>,
    Extension(session): Extension<Arc<ResolvedSession>>,
) -> Response {
    let raw = query::parse(raw.as_deref());
    let query = match validation::validate_query(QueryKind::Entity, Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service
        .list_entity_audit_logs(&target_type, &target_id, query, &session.user)
        .await
    {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

async fn list_security_events(
    RawQuery(raw): RawQuery,
    Extension(service): Extension<Arc<RuntimeAuditService>>,
) -> Response {
    let raw = query::parse(raw.as_deref());
    let query = match validation::validate_query(QueryKind::Security, Some(&raw)) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match service.list_security_events(query).await {
        Ok(value) => Json(value).into_response(),
        Err(error) => domain_error(error),
    }
}

fn route_denied_event(
    input: &RecordRouteDenied,
    user: &AuthUser,
    metadata: &RequestMetadata,
) -> Result<SecurityEventInput, RuntimeAuditError> {
    // pg encodes a scalar UTF-16 string through Buffer (replacement), while
    // JSON.stringify escapes lone surrogates inside details and PG rejects it.
    let return_url = input
        .return_url
        .as_ref()
        .map(|value| {
            serde_json::from_str::<Value>(&value.json()).map_err(|_| RuntimeAuditError::Internal)
        })
        .transpose()?
        .unwrap_or(Value::Null);
    Ok(SecurityEventInput {
        event_type: "authz.route.denied".into(),
        severity: SecuritySeverity::Warning,
        result: SecurityResult::Blocked,
        actor_id: Some(user.user_id),
        principal: Some(user.username.clone()),
        request_id: metadata.request_id.clone(),
        path: input.path.to_utf8_lossy(),
        method: Some("ROUTE".into()),
        permission_key: input
            .required_permissions
            .first()
            .map(|key| key.as_str().to_owned()),
        ip: metadata.info.ip.clone(),
        user_agent: metadata.info.user_agent.clone(),
        details: Some(
            json!({"requiredPermissions":input.required_permissions,"returnUrl":return_url}),
        ),
        occurred_at: None,
    })
}

async fn record_route_denied(
    State(auth): State<AuthHttpState>,
    Extension(session): Extension<Arc<ResolvedSession>>,
    Extension(body): Extension<ParsedBody>,
    request: Request,
) -> Response {
    let input = match validation::validate_route_denied(body.raw()) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let (parts, _) = request.into_parts();
    let event =
        match route_denied_event(&input, &session.user, &RequestMetadata::from_parts(&parts)) {
            Ok(value) => value,
            Err(error) => return domain_error(error),
        };
    match auth
        .service
        .record_security_event_with_session(event, session.pending_flush.as_ref())
        .await
    {
        Ok(()) => StatusCode::ACCEPTED.into_response(),
        Err(_) => ApiError::internal().into_response(),
    }
}

fn domain_error(error: RuntimeAuditError) -> Response {
    match error {
        RuntimeAuditError::BadRequest(message) => {
            ApiError::message(StatusCode::BAD_REQUEST, message).into_response()
        }
        RuntimeAuditError::Forbidden(message) => {
            ApiError::message(StatusCode::FORBIDDEN, message).into_response()
        }
        RuntimeAuditError::Database(_) | RuntimeAuditError::Internal => {
            ApiError::internal().into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{Body, to_bytes},
        http::{Request, header},
        middleware,
    };
    use tower::ServiceExt;
    use uuid::Uuid;

    #[test]
    fn normalization_only_covers_frozen_methods_paths_and_single_trailing_slash() {
        for (method, raw, expected) in [
            (
                Method::GET,
                "/API/AUDIT-LOGS/?limit=2",
                "/api/audit-logs?limit=2",
            ),
            (
                Method::HEAD,
                "/API/SECURITY-EVENTS/",
                "/api/security-events",
            ),
            (
                Method::POST,
                "/API/SECURITY-EVENTS:RECORDROUTEDENIED/",
                "/api/security-events:recordRouteDenied",
            ),
            (
                Method::GET,
                "/API/AUDIT-LOGS/TARGETS/LEAD/ABC%44/",
                "/api/audit-logs/targets/LEAD/ABC%44",
            ),
        ] {
            assert_eq!(
                normalized_uri(&method, &raw.parse().unwrap_or_else(|_| panic!("URI")))
                    .map(|uri| uri.to_string())
                    .as_deref(),
                Some(expected)
            );
        }
        for (method, raw) in [
            (Method::POST, "/API/AUDIT-LOGS/"),
            (Method::GET, "/API/SECURITY-EVENTS:RECORDROUTEDENIED/"),
            (Method::GET, "/API/AUDIT-LOGS//"),
            (Method::GET, "/api/%61udit-logs"),
            (Method::POST, "/api/security-events%3ArecordRouteDenied"),
            (Method::GET, "/API/AUDIT-LOGS/TARGETS//id/"),
            (Method::GET, "/API/DICTIONARIES/"),
        ] {
            assert!(
                normalized_uri(&method, &raw.parse().unwrap_or_else(|_| panic!("URI"))).is_none()
            );
        }
    }

    #[tokio::test]
    async fn normalization_preserves_decoded_target_and_raw_metadata_and_implicit_head() {
        let inner = Router::new().route("/api/audit-logs/targets/{targetType}/{targetId}", get(|Path((kind, id)): Path<(String, String)>, request: axum::extract::Request| async move {
            let (parts, _) = request.into_parts();
            Json(json!({"targetType":kind,"targetId":id,"rawPath":RequestMetadata::from_parts(&parts).path}))
        }));
        let app = Router::new()
            .fallback_service(inner)
            .layer(middleware::from_fn(normalize_uri));
        let request = |method: &str| {
            Request::builder()
                .method(method)
                .uri("/API/AUDIT-LOGS/TARGETS/lead/AB%2fCD/?x=1")
                .body(Body::empty())
                .unwrap_or_else(|_| panic!("request"))
        };
        let response = app
            .clone()
            .oneshot(request("GET"))
            .await
            .unwrap_or_else(|_| panic!("response"));
        assert_eq!(response.status(), StatusCode::OK);
        let length = response.headers().get(header::CONTENT_LENGTH).cloned();
        let bytes = to_bytes(response.into_body(), 10000)
            .await
            .unwrap_or_else(|_| panic!("body"));
        let value: Value = serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("JSON"));
        assert_eq!(
            value,
            json!({"targetType":"lead","targetId":"AB/CD","rawPath":"/API/AUDIT-LOGS/TARGETS/lead/AB%2fCD/?x=1"})
        );
        let head = app
            .oneshot(request("HEAD"))
            .await
            .unwrap_or_else(|_| panic!("HEAD"));
        assert_eq!(head.status(), StatusCode::OK);
        assert_eq!(head.headers().get(header::CONTENT_LENGTH), length.as_ref());
        assert!(
            to_bytes(head.into_body(), 10000)
                .await
                .unwrap_or_else(|_| panic!("HEAD body"))
                .is_empty()
        );
    }

    #[tokio::test]
    async fn dynamic_uri_decode_errors_precede_the_guard_and_method_stage() {
        let app = Router::new()
            .fallback(|| async { StatusCode::UNAUTHORIZED })
            .layer(middleware::from_fn(normalize_uri));
        for (method, path, bad) in [
            ("GET", "/api/audit-logs/targets/lead/%FF", "%FF"),
            ("POST", "/API/AUDIT-LOGS/TARGETS/%E0%A4%A/id/", "%E0%A4%A"),
            ("GET", "/api/audit-logs/targets/%FF/%AA", "%FF"),
        ] {
            let request = Request::builder()
                .method(method)
                .uri(path)
                .body(Body::empty())
                .unwrap_or_else(|_| panic!("request"));
            let response = app
                .clone()
                .oneshot(request)
                .await
                .unwrap_or_else(|_| panic!("response"));
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            let bytes = to_bytes(response.into_body(), 10000)
                .await
                .unwrap_or_else(|_| panic!("body"));
            let actual: Value = serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("JSON"));
            assert_eq!(
                actual,
                json!({"statusCode":400,"message":format!("Failed to decode param '{bad}'"),"error":"Bad Request"})
            );
        }
    }

    #[test]
    fn route_denied_context_uses_session_and_body_projection_without_permission_deduplication() {
        let input = validation::validate_route_denied(Some("{\"path\":\" /any?raw=1 \",\"requiredPermissions\":[\"project:read\",\"lead:read\",\"project:read\"],\"actorId\":\"spoof\",\"unknown\":true}")).unwrap_or_else(|_| panic!("input"));
        let request = Request::builder()
            .uri("/api/security-events:recordRouteDenied")
            .header("x-request-id", "")
            .header("x-correlation-id", "fallback")
            .header("x-forwarded-for", " 192.0.2.1 , 198.51.100.1")
            .header("user-agent", "fixture-agent")
            .body(())
            .unwrap_or_else(|_| panic!("request"));
        let (parts, _) = request.into_parts();
        let user = AuthUser {
            user_id: Uuid::nil(),
            username: "viewer".into(),
            permissions: vec![],
        };
        let event = route_denied_event(&input, &user, &RequestMetadata::from_parts(&parts))
            .unwrap_or_else(|_| panic!("event"));
        assert_eq!(event.event_type, "authz.route.denied");
        assert_eq!(event.actor_id, Some(user.user_id));
        assert_eq!(event.principal.as_deref(), Some("viewer"));
        assert_eq!(event.path, " /any?raw=1 ");
        assert_eq!(event.method.as_deref(), Some("ROUTE"));
        assert_eq!(event.request_id.as_deref(), Some(""));
        assert_eq!(event.ip.as_deref(), Some("192.0.2.1"));
        assert_eq!(event.user_agent.as_deref(), Some("fixture-agent"));
        assert_eq!(event.permission_key.as_deref(), Some("project:read"));
        assert_eq!(
            event.details,
            Some(
                json!({"requiredPermissions":["project:read","lead:read","project:read"],"returnUrl":null})
            )
        );
    }
}
