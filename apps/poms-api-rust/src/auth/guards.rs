//! Compose the original global guard order without declaring new public routes.
//! Missing declarations, missing sessions and failed policies remain distinct.

use std::net::SocketAddr;

use axum::{
    extract::{ConnectInfo, OriginalUri},
    http::{HeaderMap, Method, StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use serde_json::json;

use super::{
    audit::{SecurityEventInput, SecurityResult, SecuritySeverity},
    cookie::{AuthCookieService, header_text, trim_js},
    model::{AuthError, AuthUser, RequestInfo, ResolvedSession, SessionFlush},
    service::AuthService,
};
use crate::{
    compat::permissions::{PermissionDecision, PermissionRequirements, decide},
    error::ApiError,
    shared::generated::{AuthSessionErrorCode, PermissionKey},
};

#[derive(Clone, Default)]
pub struct RouteMetadata {
    pub public: Option<bool>,
    pub authenticated: Option<bool>,
    pub all: Option<Vec<PermissionKey>>,
    pub any: Option<Vec<PermissionKey>>,
}

#[derive(Clone, Default)]
pub struct RoutePolicy {
    pub public: bool,
    pub authenticated: bool,
    pub all: Vec<PermissionKey>,
    pub any: Vec<PermissionKey>,
}

impl RoutePolicy {
    pub fn public() -> Self {
        Self {
            public: true,
            ..Self::default()
        }
    }
    pub fn authenticated() -> Self {
        Self {
            authenticated: true,
            ..Self::default()
        }
    }
    pub fn from_metadata(class: &RouteMetadata, handler: &RouteMetadata) -> Self {
        Self {
            public: handler.public.or(class.public).unwrap_or(false),
            authenticated: handler
                .authenticated
                .or(class.authenticated)
                .unwrap_or(false),
            all: handler
                .all
                .as_ref()
                .or(class.all.as_ref())
                .cloned()
                .unwrap_or_default(),
            any: handler
                .any
                .as_ref()
                .or(class.any.as_ref())
                .cloned()
                .unwrap_or_default(),
        }
    }
}

#[derive(Clone)]
pub struct RequestMetadata {
    pub request_id: Option<String>,
    pub path: String,
    pub method: Option<String>,
    pub info: RequestInfo,
}

impl RequestMetadata {
    pub fn from_parts(parts: &Parts) -> Self {
        let forwarded = combined_header(&parts.headers, "x-forwarded-for");
        let ip = if let Some(forwarded) = forwarded.filter(|value| !value.is_empty()) {
            Some(trim_js(forwarded.split(',').next().unwrap_or("")).to_owned())
        } else {
            parts
                .extensions
                .get::<ConnectInfo<SocketAddr>>()
                .map(|info| info.0.ip().to_string())
        };
        Self {
            request_id: combined_header(&parts.headers, "x-request-id")
                .or_else(|| combined_header(&parts.headers, "x-correlation-id")),
            path: parts
                .extensions
                .get::<OriginalUri>()
                .map_or_else(|| parts.uri.to_string(), |uri| uri.0.to_string()),
            method: Some(parts.method.as_str().to_ascii_uppercase()),
            info: RequestInfo {
                ip,
                user_agent: parts.headers.get("user-agent").map(header_text),
            },
        }
    }
    pub fn event(
        &self,
        event_type: &str,
        severity: SecuritySeverity,
        result: SecurityResult,
    ) -> SecurityEventInput {
        SecurityEventInput {
            event_type: event_type.to_owned(),
            severity,
            request_id: self.request_id.clone(),
            path: self.path.clone(),
            method: self.method.clone(),
            result,
            ip: self.info.ip.clone(),
            user_agent: self.info.user_agent.clone(),
            ..Default::default()
        }
    }
}

/// Native Node IncomingMessage combines duplicate custom header lines with
/// comma-space. This differs from synthetic guard inputs containing arrays.
pub fn combined_header(headers: &HeaderMap, name: &str) -> Option<String> {
    let values = headers
        .get_all(name)
        .iter()
        .map(header_text)
        .collect::<Vec<_>>();
    (!values.is_empty()).then(|| values.join(", "))
}

pub fn unauthorized(code: AuthSessionErrorCode) -> Response {
    ApiError::object(
        StatusCode::UNAUTHORIZED,
        json!({"statusCode":401,"code":code.as_str(),"message":"Authentication required"}),
    )
    .into_response()
}

pub fn domain_or_internal(error: &AuthError) -> Response {
    error
        .code()
        .map_or_else(|| ApiError::internal().into_response(), unauthorized)
}

#[expect(
    clippy::result_large_err,
    reason = "Guard errors carry the original HTTP response, including exact error JSON and headers."
)]
pub async fn authorize(
    service: &AuthService,
    cookies: &AuthCookieService,
    policy: &RoutePolicy,
    method: &Method,
    headers: &HeaderMap,
    metadata: &RequestMetadata,
) -> Result<Option<ResolvedSession>, Response> {
    let resolved = if policy.public {
        None
    } else {
        let token = cookies
            .session_token(headers)
            .map_err(|_| ApiError::internal().into_response())?
            .ok_or_else(|| unauthorized(AuthSessionErrorCode::SessionMissing))?;
        match service.resolve_session_token(&token, &metadata.info).await {
            Ok(resolved) => Some(resolved),
            Err(error) => {
                if let Some(code) = error.code() {
                    let mut event = metadata.event(
                        "auth.session.invalid",
                        if code == AuthSessionErrorCode::AccountDisabled {
                            SecuritySeverity::High
                        } else {
                            SecuritySeverity::Warning
                        },
                        if code == AuthSessionErrorCode::SessionExpired {
                            SecurityResult::Expired
                        } else {
                            SecurityResult::Failed
                        },
                    );
                    event.details = Some(json!({"reason":code.as_str()}));
                    service
                        .record_security_event_with_session(event, error.pending_flush())
                        .await
                        .map_err(|_| ApiError::internal().into_response())?;
                }
                return Err(domain_or_internal(&error));
            }
        }
    };
    if matches!(
        method.as_str().to_ascii_uppercase().as_str(),
        "POST" | "PUT" | "PATCH" | "DELETE"
    ) {
        let supplied = combined_header(headers, "x-csrf-token")
            .map(|value| trim_js(&value).to_owned())
            .filter(|value| !value.is_empty());
        let cookie = cookies
            .csrf_token(headers)
            .map_err(|_| ApiError::internal().into_response())?;
        let failure = double_submit_failure(supplied.as_deref(), cookie.as_deref()).or_else(|| {
            if policy.public {
                None
            } else if let Some(resolved) = resolved.as_ref() {
                if supplied
                    .as_deref()
                    .is_some_and(|token| service.verify_csrf_token(&resolved.session, token))
                {
                    None
                } else {
                    Some("invalid_token")
                }
            } else {
                Some("session_not_resolved")
            }
        });
        if let Some(reason) = failure {
            let mut event = metadata.event(
                "auth.csrf.failed",
                SecuritySeverity::Warning,
                SecurityResult::Blocked,
            );
            event.actor_id = resolved.as_ref().map(|resolved| resolved.user.user_id);
            event.principal = resolved
                .as_ref()
                .map(|resolved| resolved.user.username.clone());
            event.details = Some(json!({"reason":reason}));
            service
                .record_security_event_with_session(
                    event,
                    resolved
                        .as_ref()
                        .and_then(|resolved| resolved.pending_flush.as_ref()),
                )
                .await
                .map_err(|_| ApiError::internal().into_response())?;
            return Err(ApiError::object(StatusCode::FORBIDDEN, json!({"statusCode":403,"code":"csrf_failed","message":"CSRF token validation failed"})).into_response());
        }
    }
    authorize_permissions_with_pending(
        service,
        policy,
        resolved.as_ref().map(|resolved| &resolved.user),
        metadata,
        resolved
            .as_ref()
            .and_then(|resolved| resolved.pending_flush.as_ref()),
    )
    .await?;
    Ok(resolved)
}

/// Permission-stage equivalent only. Session resolution and CSRF must already
/// have run in authorize(); Authenticated metadata alone is not authentication.
#[expect(
    clippy::result_large_err,
    reason = "Permission errors carry the original HTTP response and audit failure mapping."
)]
pub async fn authorize_permissions(
    service: &AuthService,
    policy: &RoutePolicy,
    user: Option<&AuthUser>,
    metadata: &RequestMetadata,
) -> Result<(), Response> {
    authorize_permissions_with_pending(service, policy, user, metadata, None).await
}

#[expect(
    clippy::result_large_err,
    reason = "Permission errors carry the original HTTP response and audit failure mapping."
)]
async fn authorize_permissions_with_pending(
    service: &AuthService,
    policy: &RoutePolicy,
    user: Option<&AuthUser>,
    metadata: &RequestMetadata,
    pending: Option<&SessionFlush>,
) -> Result<(), Response> {
    let empty = Vec::new();
    let user_permissions = user.map_or(empty.as_slice(), |user| user.permissions.as_slice());
    match decide(
        PermissionRequirements {
            public_route: policy.public,
            authenticated_route: policy.authenticated,
            all: &policy.all,
            any: &policy.any,
        },
        user_permissions,
    ) {
        PermissionDecision::Allow => Ok(()),
        PermissionDecision::MissingDeclaration => Err(ApiError::message(
            StatusCode::FORBIDDEN,
            "Route must be decorated with @Authenticated() or @HasPermissions()",
        )
        .into_response()),
        PermissionDecision::InsufficientPermissions => {
            let mut event = metadata.event(
                "authz.permission.denied",
                SecuritySeverity::Warning,
                SecurityResult::Blocked,
            );
            event.actor_id = user.map(|user| user.user_id);
            event.principal = user.map(|user| user.username.clone());
            event.permission_key = policy
                .all
                .first()
                .or(policy.any.first())
                .map(|key| key.as_str().to_owned());
            event.details = Some(if policy.any.is_empty() {
                json!({"requiredPermissions":policy.all,"userPermissions":user_permissions})
            } else {
                json!({"requiredPermissions":policy.all,"requiredAnyPermissions":policy.any,"userPermissions":user_permissions})
            });
            service
                .record_security_event_with_session(event, pending)
                .await
                .map_err(|_| ApiError::internal().into_response())?;
            Err(ApiError::object(StatusCode::FORBIDDEN, json!({"statusCode":403,"code":"permission_denied","message":"Insufficient permissions"})).into_response())
        }
    }
}

pub fn double_submit_failure(header: Option<&str>, cookie: Option<&str>) -> Option<&'static str> {
    if header.is_none_or(str::is_empty) {
        Some("missing_header")
    } else if cookie.is_none_or(str::is_empty) {
        Some("missing_cookie")
    } else if header != cookie {
        Some("mismatch")
    } else {
        None
    }
}
