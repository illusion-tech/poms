use axum::{
    extract::ConnectInfo,
    http::{HeaderMap, HeaderValue, Request},
};
use poms_api_rust::{
    auth::{
        cookie::trim_js,
        guards::{
            RequestMetadata, RouteMetadata, RoutePolicy, combined_header, double_submit_failure,
        },
    },
    compat::permissions::{PermissionDecision, PermissionRequirements, RawPermission, decide},
    shared::generated::PermissionKey,
};

#[test]
fn omitted_metadata_defaults_to_deny_and_handler_overrides_each_class_key() {
    let all = vec![PermissionKey::ProjectRead];
    let class = RouteMetadata {
        public: Some(true),
        authenticated: Some(true),
        all: Some(all),
        any: Some(vec![PermissionKey::ProjectWrite]),
    };
    let handler = RouteMetadata {
        public: Some(false),
        all: Some(vec![]),
        ..Default::default()
    };
    let policy = RoutePolicy::from_metadata(&class, &handler);
    assert!(!policy.public);
    assert!(policy.authenticated);
    assert!(policy.all.is_empty());
    assert_eq!(policy.any, vec![PermissionKey::ProjectWrite]);
    let absent = RoutePolicy::from_metadata(&RouteMetadata::default(), &RouteMetadata::default());
    let decision = decide(
        PermissionRequirements {
            public_route: absent.public,
            authenticated_route: absent.authenticated,
            all: &absent.all,
            any: &absent.any,
        },
        &[],
    );
    assert_eq!(decision, PermissionDecision::MissingDeclaration);
    let raw = vec![
        RawPermission::new("project:read"),
        RawPermission::new("future:raw"),
    ];
    let both = PermissionRequirements {
        public_route: false,
        authenticated_route: false,
        all: &[PermissionKey::ProjectRead],
        any: &[PermissionKey::ProjectWrite, PermissionKey::ProjectRead],
    };
    assert_eq!(decide(both, &raw), PermissionDecision::Allow);
    let missing_any = PermissionRequirements {
        any: &[PermissionKey::ProjectWrite],
        ..both
    };
    assert_eq!(
        decide(missing_any, &raw),
        PermissionDecision::InsufficientPermissions
    );
    assert_eq!(raw[1].as_str(), "future:raw");
}

#[test]
fn csrf_double_submit_reasons_and_native_duplicate_header_behavior_match_source() {
    assert_eq!(double_submit_failure(None, None), Some("missing_header"));
    assert_eq!(
        double_submit_failure(Some(""), Some("x")),
        Some("missing_header")
    );
    assert_eq!(
        double_submit_failure(Some("x"), None),
        Some("missing_cookie")
    );
    assert_eq!(
        double_submit_failure(Some("x"), Some("y")),
        Some("mismatch")
    );
    assert_eq!(double_submit_failure(Some("x"), Some("x")), None);
    let mut headers = HeaderMap::new();
    headers.append("x-csrf-token", HeaderValue::from_static(" x "));
    headers.append("x-csrf-token", HeaderValue::from_static("x"));
    assert_eq!(
        combined_header(&headers, "x-csrf-token"),
        Some(" x , x".into())
    );
    assert_eq!(trim_js("\u{feff}\u{00a0}x\u{202f}"), "x");
    assert_ne!(
        trim_js(&combined_header(&headers, "x-csrf-token").unwrap_or_default()),
        "x"
    );
}

#[test]
fn request_metadata_preserves_original_url_first_forwarded_ip_and_empty_request_id()
-> Result<(), Box<dyn std::error::Error>> {
    let mut request = Request::builder()
        .method("POST")
        .uri("/api/auth/sessions?synthetic=1")
        .header("x-request-id", "")
        .header("x-correlation-id", "not-selected")
        .header("x-forwarded-for", " 192.0.2.9 , 192.0.2.10")
        .header("user-agent", "synthetic-agent")
        .body(())?;
    request.extensions_mut().insert(ConnectInfo(
        "127.0.0.1:54321".parse::<std::net::SocketAddr>()?,
    ));
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    assert_eq!(metadata.request_id.as_deref(), Some(""));
    assert_eq!(metadata.path, "/api/auth/sessions?synthetic=1");
    assert_eq!(metadata.method.as_deref(), Some("POST"));
    assert_eq!(metadata.info.ip.as_deref(), Some("192.0.2.9"));
    assert_eq!(metadata.info.user_agent.as_deref(), Some("synthetic-agent"));
    Ok(())
}

#[tokio::test]
async fn real_permission_stage_returns_default_403_without_audit_and_combines_all_any()
-> Result<(), Box<dyn std::error::Error>> {
    use poms_api_rust::{
        auth::{
            guards::authorize_permissions,
            model::{AuthUser, RequestInfo},
            service::AuthService,
        },
        config::Config,
        database::Database,
    };
    let config = Config::from_map(&std::collections::HashMap::new())?;
    let database = Database::new(&config.database).await?;
    database.close(std::time::Duration::from_secs(1)).await?;
    let service = AuthService::new(database, config.auth);
    let metadata = RequestMetadata {
        request_id: None,
        path: "/synthetic-permission-stage".into(),
        method: Some("GET".into()),
        info: RequestInfo {
            ip: None,
            user_agent: None,
        },
    };
    // A closed pool guarantees an accidental audit write cannot pass as 403.
    let response =
        match authorize_permissions(&service, &RoutePolicy::default(), None, &metadata).await {
            Err(response) => response,
            Ok(()) => return Err("missing declaration incorrectly allowed".into()),
        };
    assert_eq!(response.status(), axum::http::StatusCode::FORBIDDEN);
    let body: serde_json::Value =
        serde_json::from_slice(&axum::body::to_bytes(response.into_body(), 65536).await?)?;
    assert_eq!(
        body,
        serde_json::json!({"message":"Route must be decorated with @Authenticated() or @HasPermissions()","error":"Forbidden","statusCode":403})
    );
    let user = AuthUser {
        user_id: uuid::Uuid::nil(),
        username: "synthetic".into(),
        permissions: vec![
            RawPermission::new("project:read"),
            RawPermission::new("future:raw"),
        ],
    };
    let policy = RoutePolicy {
        all: vec![PermissionKey::ProjectRead],
        any: vec![PermissionKey::ProjectWrite, PermissionKey::ProjectRead],
        ..Default::default()
    };
    assert!(
        authorize_permissions(&service, &policy, Some(&user), &metadata)
            .await
            .is_ok()
    );
    Ok(())
}
