//! The three existing navigation routes. Body/query values are not DTO inputs.

use std::sync::Arc;

use axum::{
    Extension, Json, Router,
    extract::{Request, State},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde_json::{Value, json};

use super::{all_navigation, navigation_for_user, navigation_snapshot};
use crate::{
    auth::{
        audit::AuditLogInput,
        guards::{RequestMetadata, RoutePolicy, domain_or_internal},
        http::{AuthHttpState, guarded_route},
        model::ResolvedSession,
    },
    error::ApiError,
    shared::generated::PermissionKey,
};

pub fn router(state: AuthHttpState) -> Router {
    let management = RoutePolicy {
        all: vec![PermissionKey::PlatformNavigationManage],
        ..RoutePolicy::default()
    };
    Router::new()
        .route(
            "/api/me/navigation",
            guarded_route(
                get(current_navigation),
                state.clone(),
                RoutePolicy::authenticated(),
            ),
        )
        .route(
            "/api/platform/navigation",
            guarded_route(get(complete_navigation), state.clone(), management.clone()),
        )
        .route(
            "/api/platform/navigation:sync",
            guarded_route(post(sync_navigation), state.clone(), management),
        )
        .with_state(state)
}

pub fn openapi() -> Value {
    serde_json::from_str(include_str!(
        "../../../../tools/rust-r2a/navigation-openapi.json"
    ))
    .unwrap_or_else(|_| panic!("invalid generated navigation OpenAPI metadata"))
}

async fn current_navigation(
    Extension(resolved): Extension<Arc<ResolvedSession>>,
) -> Json<Vec<super::NavigationItem>> {
    Json(navigation_for_user(&resolved.user.permissions))
}

async fn complete_navigation() -> Json<Vec<super::NavigationItem>> {
    Json(all_navigation().to_vec())
}

async fn sync_navigation(
    State(state): State<AuthHttpState>,
    Extension(resolved): Extension<Arc<ResolvedSession>>,
    request: Request,
) -> Response {
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let Ok(summary) = navigation_snapshot() else {
        return ApiError::internal().into_response();
    };
    let Ok(snapshot) = serde_json::to_value(&summary) else {
        return ApiError::internal().into_response();
    };
    let input = AuditLogInput {
        event_type: "platform.navigation.synced".into(),
        target_type: "NavigationTree".into(),
        target_id: summary.target_id.clone(),
        operator_id: Some(resolved.user.user_id),
        request_id: metadata.request_id,
        after_snapshot: Some(snapshot),
        metadata: Some(json!({ "source": "static-navigation-ssot" })),
        ..AuditLogInput::default()
    };
    match state
        .service
        .record_audit_log_with_session(input, resolved.pending_flush.as_ref())
        .await
    {
        Ok(()) => Json(summary).into_response(),
        Err(error) => domain_or_internal(&error),
    }
}
