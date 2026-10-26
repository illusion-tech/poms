//! Controlled persistent DML in the dedicated, historically migrated PG15
//! acceptance database. The launcher checks the owner-only r1c_control marker
//! before invoking these tests. App-side guards run before fixture writes.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::{
    env,
    future::Future,
    io::Write,
    process::{Command, Stdio},
    time::{Duration, Instant},
};

use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
    routing::get,
};
use chrono::{DateTime, TimeDelta, Utc};
use poms_api_rust::{
    auth::{
        audit::{self, AuditLogInput, AuditResult, SecurityEventInput, SecurityResult},
        cookie::AuthCookieService,
        crypto::hash_token,
        guards::{RouteMetadata, RoutePolicy},
        http::{AuthHttpState, guarded_route},
        model::{AuthErrorKind, RequestInfo},
        service::AuthService,
        store,
    },
    config::AuthConfig,
    database::Database,
    shared::generated::{
        AuthSessionErrorCode as Code, AuthSessionRevokedReason as Reason,
        AuthSessionStatus as Status, PermissionKey,
    },
};
use serde_json::{Value, json};
use sqlx::Row;
use tower::ServiceExt;
use uuid::Uuid;

#[path = "support/r1c_guard.rs"]
mod r1c_guard;
use r1c_guard::guarded_options;
const PASSWORD_HASH: &str = "$2b$04$abcdefghijklmnopqrstuu2hW.5IQMgCN5GJ/kWuiJRu21zBv6Iry";
const PASSWORD: &str = "synthetic password";

fn auth_config(idle: u64, absolute: u64, throttle: u64) -> AuthConfig {
    AuthConfig {
        cookie_path: "/api".into(),
        cookie_secure: false,
        session_idle_timeout: Duration::from_secs(idle),
        session_absolute_timeout: Duration::from_secs(absolute),
        session_last_seen_throttle: Duration::from_secs(throttle),
        jwt_secret: "public-acceptance-only-key-material".into(),
        secret_key: None,
    }
}

fn at(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .expect("fixed ISO clock")
        .with_timezone(&Utc)
}
fn now() -> DateTime<Utc> {
    at("2026-05-13T01:00:00.000Z")
}

#[derive(Clone)]
struct Harness {
    database: Database,
    run_id: Uuid,
    user: Uuid,
    second_user: Uuid,
    roles: Vec<Uuid>,
    orgs: Vec<Uuid>,
}

impl Harness {
    async fn new() -> Self {
        let config = r1c_guard::target_config()
            .await
            .expect("R1C guard rejected input before writes");
        let database = Database::new(&config).await.expect("guarded pool");
        let ids: Vec<Uuid> =
            sqlx::query_scalar("SELECT gen_random_uuid() FROM generate_series(1,9)")
                .fetch_all(database.pool())
                .await
                .expect("synthetic IDs");
        let harness = Self {
            database,
            run_id: ids[0],
            user: ids[1],
            second_user: ids[2],
            roles: ids[3..6].to_vec(),
            orgs: ids[6..9].to_vec(),
        };
        for (id, active) in [(harness.user, true), (harness.second_user, true)] {
            sqlx::query("INSERT INTO poms.platform_user(id,username,display_name,is_active) VALUES($1,$2,$3,$4)")
                .bind(id).bind(harness.username(id)).bind(format!("R1C synthetic {}",id)).bind(active)
                .execute(harness.database.pool()).await.expect("synthetic account");
        }
        sqlx::query("INSERT INTO poms.local_credential(user_id,password_hash) VALUES($1,$2)")
            .bind(harness.user)
            .bind(PASSWORD_HASH)
            .execute(harness.database.pool())
            .await
            .expect("public synthetic bcrypt fixture");
        harness
    }

    fn username(&self, id: Uuid) -> String {
        format!("r1c_{id}")
    }
    fn service(&self) -> AuthService {
        AuthService::new(self.database.clone(), auth_config(900, 28800, 60))
    }

    async fn cleanup(&self) {
        let request_id = self.run_id.to_string();
        sqlx::query("DELETE FROM poms.security_event WHERE request_id=$1")
            .bind(&request_id)
            .execute(self.database.pool())
            .await
            .expect("owned security cleanup");
        sqlx::query("DELETE FROM poms.audit_log WHERE request_id=$1")
            .bind(&request_id)
            .execute(self.database.pool())
            .await
            .expect("owned audit cleanup");
        sqlx::query("DELETE FROM poms.platform_user WHERE id=ANY($1)")
            .bind([self.user, self.second_user].as_slice())
            .execute(self.database.pool())
            .await
            .expect("owned users cascade cleanup");
        sqlx::query("DELETE FROM poms.role WHERE id=ANY($1)")
            .bind(&self.roles)
            .execute(self.database.pool())
            .await
            .expect("owned role cleanup");
        sqlx::query("DELETE FROM poms.org_unit WHERE id=ANY($1)")
            .bind(&self.orgs)
            .execute(self.database.pool())
            .await
            .expect("owned organization cleanup");
        self.database
            .close(Duration::from_secs(5))
            .await
            .expect("test pool closed");
    }
}

async fn run_case<F, Fut>(case: F)
where
    F: FnOnce(Harness) -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    let harness = Harness::new().await;
    let isolated = harness.clone();
    let result = tokio::spawn(async move { case(isolated).await }).await;
    harness.cleanup().await;
    result.expect("acceptance case failed; this run's fixture cleanup completed");
}

#[test]
fn acceptance_target_rejects_unmarked_implicit_or_elevated_inputs_before_io() {
    let password = "a".repeat(64);
    let url = format!("postgres://poms_r1c_app:{password}@127.0.0.1:15432/poms_r1c_rust");
    assert!(guarded_options(&url, false).is_ok());
    for bad in [
        url.replace("15432", "5432"),
        url.replace("poms_r1c_rust", "poms"),
        url.replace("poms_r1c_app", "poms_r0e_owner"),
        format!("{url}?options=-crole=owner"),
        format!("{url}#fragment"),
        url.replace(&password, ""),
    ] {
        assert!(guarded_options(&bad, false).is_err());
    }
    assert!(guarded_options(&url, true).is_err());
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn credentials_profile_permissions_and_memberships_use_real_rows() {
    run_case(|h| async move {
        for (index,role) in h.roles.iter().enumerate() {
            sqlx::query("INSERT INTO poms.role(id,role_key,name,is_active) VALUES($1,$2,$3,$4)")
                .bind(role).bind(role.to_string()).bind("same display name").bind(index!=2).execute(h.database.pool()).await.unwrap();
            sqlx::query("INSERT INTO poms.user_role_assignment(user_id,role_id) VALUES($1,$2)")
                .bind(h.user).bind(role).execute(h.database.pool()).await.unwrap();
            for permission in ["project:read","future:raw:permission"] {
                sqlx::query("INSERT INTO poms.role_permission_assignment(role_id,permission_key) VALUES($1,$2)")
                    .bind(role).bind(permission).execute(h.database.pool()).await.unwrap();
            }
        }
        for (index,org) in h.orgs.iter().enumerate() {
            sqlx::query("INSERT INTO poms.org_unit(id,name,code,is_active) VALUES($1,$2,$3,$4)")
                .bind(org).bind(org.to_string()).bind(org.to_string()).bind(index!=1).execute(h.database.pool()).await.unwrap();
            sqlx::query("INSERT INTO poms.user_org_membership(user_id,org_unit_id,membership_type) VALUES($1,$2,$3)")
                .bind(h.user).bind(org).bind(["primary","secondary","future-membership"][index])
                .execute(h.database.pool()).await.unwrap();
        }
        let service=h.service();
        let password:Vec<u16>=PASSWORD.encode_utf16().collect();
        let user=service.verify_credentials(&h.username(h.user),&password).await.unwrap().unwrap();
        assert_eq!(user.permissions.len(),2);
        assert!(user.permissions.iter().any(|key|key.as_str()=="future:raw:permission"));
        assert!(service.verify_credentials(&format!(" {}",h.username(h.user)),&password).await.unwrap().is_none());
        assert!(service.verify_credentials(&h.username(h.user),&[1,2]).await.unwrap().is_none());
        assert!(service.verify_credentials(&h.username(h.second_user),&password).await.unwrap().is_none());
        let profile=service.profile(&user).await.unwrap().unwrap();
        assert_eq!(profile["roles"].as_array().unwrap().len(),2); // equal role names are not deduplicated
        assert_eq!(profile["orgUnits"].as_array().unwrap().len(),3); // includes inactive org
        assert!(profile["orgUnits"].as_array().unwrap().iter().any(|org|org["membershipType"]=="future-membership"));
        assert_eq!(profile["lastLoginAt"],Value::Null); // successful login does not update last_login_at
        assert!(!profile.to_string().contains(PASSWORD_HASH));
        let original=original_service(json!({"action":"profile","userId":h.user,
            "fallback":{"username":user.username,"permissions":user.permissions}})).await;
        assert_eq!(original["value"],profile); // real TS multi-org/raw-membership projection
        sqlx::query("UPDATE poms.platform_user SET is_active=false WHERE id=$1").bind(h.user).execute(h.database.pool()).await.unwrap();
        assert!(service.verify_credentials(&h.username(h.user),&password).await.unwrap().is_none());
    }).await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn create_session_defaults_hashes_caps_and_timestamp_precision() {
    run_case(|h| async move {
        let service = AuthService::new(h.database.clone(), auth_config(900, 30, 60));
        let created = service
            .create_session_at(
                h.user,
                &RequestInfo {
                    ip: Some("192.0.2.1".into()),
                    user_agent: Some("r1c synthetic".into()),
                },
                now(),
            )
            .await
            .unwrap();
        assert_eq!(created.session_token.len(), 43);
        assert_eq!(created.csrf_token.len(), 43);
        assert_ne!(created.session_token, created.csrf_token);
        assert_eq!(
            created.session.token_hash,
            hash_token(&created.session_token)
        );
        assert_eq!(
            created.session.csrf_token_hash,
            Some(hash_token(&created.csrf_token))
        );
        assert_eq!(created.session.row_version, 1);
        assert_eq!(created.session.status, Status::Active);
        assert_eq!(
            created.session.idle_expires_at,
            now() + TimeDelta::seconds(30)
        );
        assert_eq!(
            created.session.idle_expires_at,
            created.session.absolute_expires_at
        );
        assert_eq!(created.session.created_ip, created.session.last_ip);
        assert_eq!(created.session.revoked_at, None);
        assert_eq!(created.session.revoked_reason, None);
        assert!(!format!("{created:?}").contains(&created.session_token));
        assert!(!format!("{created:?}").contains(&created.session.token_hash));
        let date = at("2026-05-13T01:00:00.123456Z");
        sqlx::query("UPDATE poms.auth_session SET last_seen_at=$1 WHERE id=$2")
            .bind(date)
            .bind(created.session.id)
            .execute(h.database.pool())
            .await
            .unwrap();
        let mut connection = h.database.pool().acquire().await.unwrap();
        let reread = store::find_by_token_hash(&mut connection, &created.session.token_hash)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(reread.last_seen_at.timestamp_subsec_micros(), 123000);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn exact_expiry_disabled_and_missing_errors_preserve_source_write_order() {
    run_case(|h| async move {
        let service=h.service();
        assert_eq!(service.resolve_session_token_at("missing",&RequestInfo::default(),now()).await.unwrap_err().code(),Some(Code::SessionMissing));
        let created=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let before=service.resolve_session_token_at(&created.session_token,&RequestInfo::default(),created.session.idle_expires_at-TimeDelta::milliseconds(1)).await.unwrap();
        assert_eq!(before.session.status,Status::Active);
        // Restore the original boundary after the preceding legitimate touch.
        sqlx::query("UPDATE poms.auth_session SET idle_expires_at=$1 WHERE id=$2").bind(created.session.idle_expires_at).bind(created.session.id).execute(h.database.pool()).await.unwrap();
        assert_eq!(service.resolve_session_token_at(&created.session_token,&RequestInfo::default(),created.session.idle_expires_at).await.unwrap_err().code(),Some(Code::SessionExpired));
        let row=sqlx::query("SELECT status,revoked_reason,revoked_at,row_version FROM poms.auth_session WHERE id=$1").bind(created.session.id).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(row.get::<String,_>("status"),"expired");
        assert_eq!(row.get::<Option<String>,_>("revoked_reason"),None);
        let version:i32=row.get("row_version");
        assert_eq!(service.resolve_session_token_at(&created.session_token,&RequestInfo::default(),now()).await.unwrap_err().code(),Some(Code::SessionExpired));
        assert_eq!(sqlx::query_scalar::<_,i32>("SELECT row_version FROM poms.auth_session WHERE id=$1").bind(created.session.id).fetch_one(h.database.pool()).await.unwrap(),version);
        let disabled=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        sqlx::query("UPDATE poms.platform_user SET is_active=false WHERE id=$1").bind(h.user).execute(h.database.pool()).await.unwrap();
        assert_eq!(service.resolve_session_token_at(&disabled.session_token,&RequestInfo::default(),now()).await.unwrap_err().code(),Some(Code::AccountDisabled));
        assert_eq!(service.resolve_session_token_at(&disabled.session_token,&RequestInfo::default(),now()).await.unwrap_err().code(),Some(Code::SessionRevoked));
        let reason:String=sqlx::query_scalar("SELECT revoked_reason FROM poms.auth_session WHERE id=$1").bind(disabled.session.id).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(reason,"account-disabled");
    }).await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn throttle_exact_boundary_coalesces_ip_and_caps_renewal() {
    run_case(|h| async move {
        let service = AuthService::new(h.database.clone(), auth_config(900, 950, 60));
        let created = service
            .create_session_at(
                h.user,
                &RequestInfo {
                    ip: Some("192.0.2.1".into()),
                    ..Default::default()
                },
                now(),
            )
            .await
            .unwrap();
        let before = service
            .resolve_session_token_at(
                &created.session_token,
                &RequestInfo::default(),
                now() + TimeDelta::milliseconds(59999),
            )
            .await
            .unwrap();
        assert_eq!(before.session.row_version, 1);
        let touched = service
            .resolve_session_token_at(
                &created.session_token,
                &RequestInfo::default(),
                now() + TimeDelta::seconds(60),
            )
            .await
            .unwrap();
        assert_eq!(touched.session.row_version, 2);
        assert_eq!(touched.session.last_ip.as_deref(), Some("192.0.2.1"));
        assert_eq!(touched.session.last_seen_at, now() + TimeDelta::seconds(60));
        assert_eq!(
            touched.session.idle_expires_at,
            created.session.absolute_expires_at
        );
        let same = service
            .resolve_session_token_at(
                &created.session_token,
                &RequestInfo {
                    ip: Some("192.0.2.2".into()),
                    ..Default::default()
                },
                now() + TimeDelta::seconds(60),
            )
            .await
            .unwrap();
        assert_eq!(same.session.row_version, 2);
        assert_eq!(same.session.last_ip, touched.session.last_ip);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn csrf_rotation_and_anonymous_expiry_are_distinct_from_session_caps() {
    run_case(|h| async move {
        let service = AuthService::new(h.database.clone(), auth_config(900, 30, 60));
        let anonymous = service
            .refresh_csrf_token_at(None, &RequestInfo::default(), now())
            .await
            .unwrap();
        assert!(anonymous.session.is_none());
        assert!(anonymous.user.is_none());
        assert_eq!(anonymous.expires_at, now() + TimeDelta::seconds(900));
        let created = service
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let rotated = service
            .refresh_csrf_token_at(Some(&created.session_token), &RequestInfo::default(), now())
            .await
            .unwrap();
        let session = rotated.session.unwrap();
        assert_eq!(session.row_version, 2);
        assert!(service.verify_csrf_token(&session, &rotated.csrf_token));
        assert!(!service.verify_csrf_token(&session, &created.csrf_token));
        assert_eq!(rotated.expires_at, created.session.absolute_expires_at);
        assert_eq!(
            service
                .refresh_csrf_token_at(
                    Some(&created.session_token),
                    &RequestInfo::default(),
                    created.session.absolute_expires_at
                )
                .await
                .unwrap_err()
                .code(),
            Some(Code::SessionExpired)
        );
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn atomic_concurrent_touch_rotate_revoke_keep_legacy_guards() {
    run_case(|h| async move {
        let created = h
            .service()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let mut first = h.database.pool().acquire().await.unwrap();
        let mut second = h.database.pool().acquire().await.unwrap();
        let due = now() + TimeDelta::seconds(60);
        let (one, two) = tokio::join!(
            store::touch_last_seen_if_due(
                &mut first,
                created.session.id,
                due,
                Some("192.0.2.1"),
                due + TimeDelta::seconds(900),
                now()
            ),
            store::touch_last_seen_if_due(
                &mut second,
                created.session.id,
                due,
                Some("192.0.2.2"),
                due + TimeDelta::seconds(900),
                now()
            )
        );
        assert_eq!(
            usize::from(one.unwrap().is_some()) + usize::from(two.unwrap().is_some()),
            1
        );
        let first_hash = hash_token("public rotation A");
        let second_hash = hash_token("public rotation B");
        let (one, two) = tokio::join!(
            store::rotate_csrf_token_for_active_session(
                &mut first,
                created.session.id,
                &first_hash,
                due
            ),
            store::rotate_csrf_token_for_active_session(
                &mut second,
                created.session.id,
                &second_hash,
                due
            )
        );
        assert!(one.unwrap().is_some());
        assert!(two.unwrap().is_some()); // no invented old-hash CAS
        let current = store::find_write_snapshot_by_id(&mut first, created.session.id)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(current.row_version, 4);
        assert!([Some(first_hash), Some(second_hash)].contains(&current.csrf_token_hash));
        let (one, two) = tokio::join!(
            store::revoke_active_session(&mut first, created.session.id, Reason::Logout, due),
            store::revoke_active_session(
                &mut second,
                created.session.id,
                Reason::AdminRevoked,
                due
            )
        );
        assert_eq!(
            usize::from(one.unwrap().is_some()) + usize::from(two.unwrap().is_some()),
            1
        );
        assert!(
            store::rotate_csrf_token_for_active_session(
                &mut first,
                created.session.id,
                &hash_token("late"),
                due
            )
            .await
            .unwrap()
            .is_none()
        );
        assert!(
            store::touch_last_seen_if_due(
                &mut first,
                created.session.id,
                due,
                None,
                due + TimeDelta::seconds(900),
                due
            )
            .await
            .unwrap()
            .is_none()
        );
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn logout_and_batch_revoke_count_only_status_active_even_if_time_expired() {
    run_case(|h| async move {
        let service = h.service();
        assert!(
            !service
                .revoke_session_token_at("missing", Reason::Logout, now())
                .await
                .unwrap()
        );
        let first = service
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        assert!(
            service
                .revoke_session_token_at(&first.session_token, Reason::Logout, now())
                .await
                .unwrap()
        );
        assert!(
            !service
                .revoke_session_token_at(&first.session_token, Reason::Logout, now())
                .await
                .unwrap()
        );
        let _second = service
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let _third = service
            .create_session_at(h.user, &RequestInfo::default(), now() - TimeDelta::days(2))
            .await
            .unwrap();
        let other = service
            .create_session_at(h.second_user, &RequestInfo::default(), now())
            .await
            .unwrap();
        assert_eq!(
            service
                .revoke_active_user_sessions_at(h.user, Reason::PasswordReset, now())
                .await
                .unwrap(),
            2
        );
        assert_eq!(
            service
                .revoke_active_user_sessions_at(h.user, Reason::PasswordReset, now())
                .await
                .unwrap(),
            0
        );
        assert!(
            service
                .resolve_session_token_at(&other.session_token, &RequestInfo::default(), now())
                .await
                .is_ok()
        );
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit controlled PG15: no silent skip without R1C opt-in"]
async fn independent_audit_failure_does_not_rollback_session_and_explicit_audit_tx_can_rollback() {
    run_case(|h| async move {
        let service=h.service();
        let created=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let failed=service.record_security_event(SecurityEventInput {event_type:"auth.synthetic".into(),
            path:"x".repeat(256),request_id:Some(h.run_id.to_string()),result:SecurityResult::Failed,..Default::default()}).await.unwrap_err();
        assert_eq!(failed.kind(),AuthErrorKind::Database);
        assert_eq!(failed.database_error().unwrap().sqlstate(),Some("22001"));
        assert!(service.resolve_session_token_at(&created.session_token,&RequestInfo::default(),now()).await.is_ok());
        service.record_security_event(SecurityEventInput {event_type:"auth.synthetic".into(),path:"/synthetic".into(),
            request_id:Some(h.run_id.to_string()),actor_id:Some(h.user),details:Some(json!({"reason":"public fixture"})),
            occurred_at:Some(at("2026-05-13T01:00:00.123456Z")),result:SecurityResult::Failed,..Default::default()}).await.unwrap();
        let security_time:DateTime<Utc>=sqlx::query_scalar("SELECT occurred_at FROM poms.security_event WHERE request_id=$1")
            .bind(h.run_id.to_string()).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(security_time.timestamp_subsec_micros(),123000);
        let input=AuditLogInput {event_type:"auth.synthetic".into(),target_type:"ExternalSynthetic".into(),target_id:"non-uuid/external".into(),
            request_id:Some(h.run_id.to_string()),occurred_at:Some(at("2026-05-13T01:00:00.123456Z")),result:AuditResult::Success,..Default::default()};
        let mut tx=h.database.pool().begin().await.unwrap();
        audit::insert_audit_log(&mut tx,&input).await.unwrap();
        tx.rollback().await.unwrap();
        let count:i64=sqlx::query_scalar("SELECT count(*) FROM poms.audit_log WHERE request_id=$1").bind(h.run_id.to_string()).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(count,0);
        service.record_audit_log(input).await.unwrap();
        let row=sqlx::query("SELECT target_id,before_snapshot,after_snapshot,metadata,occurred_at FROM poms.audit_log WHERE request_id=$1")
            .bind(h.run_id.to_string()).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(row.get::<String,_>("target_id"),"non-uuid/external");
        assert_eq!(row.get::<Option<Value>,_>("before_snapshot"),None);
        assert_eq!(row.get::<Option<Value>,_>("after_snapshot"),None);
        assert_eq!(row.get::<Option<Value>,_>("metadata"),None);
        assert_eq!(row.get::<DateTime<Utc>,_>("occurred_at").timestamp_subsec_micros(),123000);
    }).await;
}

async fn original_service(input: Value) -> Value {
    tokio::task::spawn_blocking(move || {
        let bridge = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tools/rust-r1c/session-bridge.mjs");
        let url = env::var("POMS_R1C_DATABASE_TEST_URL").expect("explicit controlled bridge URL");
        let mut command = Command::new("node");
        command.arg(bridge).arg("--execute").env_clear();
        for key in [
            "PATH",
            "Path",
            "SystemRoot",
            "SYSTEMROOT",
            "TEMP",
            "TMP",
            "TMPDIR",
        ] {
            if let Some(value) = env::var_os(key) {
                command.env(key, value);
            }
        }
        command
            .env("POMS_R1C_DATABASE_TEST", "1")
            .env("POMS_R1C_DATABASE_TEST_URL", url)
            .env("TZ", "UTC")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let mut child = command.spawn().expect("start exact original TS bridge");
        child
            .stdin
            .take()
            .expect("bridge stdin")
            .write_all(input.to_string().as_bytes())
            .expect("write public synthetic action");
        let started = Instant::now();
        loop {
            if child.try_wait().expect("bridge status").is_some() {
                break;
            }
            if started.elapsed() > Duration::from_secs(30) {
                let _ = child.kill();
                let _ = child.wait();
                panic!("original TS bridge deadline exceeded");
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        let output = child.wait_with_output().expect("original TS bridge output");
        assert!(
            output.status.success(),
            "original TS bridge rejected controlled action: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        serde_json::from_slice(&output.stdout).expect("sanitized original TS bridge JSON")
    })
    .await
    .expect("original service bridge worker")
}

#[tokio::test]
#[ignore = "explicit controlled PG15 and Node24: no silent skip without R1C opt-in"]
async fn real_original_mikroorm_writer_and_sqlx_writer_interoperate_bidirectionally() {
    run_case(|h| async move {
        let service=h.service();
        let base="2026-05-13T01:00:00.000Z";
        let created=original_service(json!({"action":"create","userId":h.user,"now":base,"info":{"ip":"192.0.2.1","userAgent":"original-ORM"}})).await;
        assert_eq!(created["result"],"pass");
        let node_token=created["value"]["sessionToken"].as_str().unwrap();
        let node_id:Uuid=created["value"]["session"]["id"].as_str().unwrap().parse().unwrap();
        let resolved=service.resolve_session_token_at(node_token,&RequestInfo::default(),now()).await.unwrap();
        assert_eq!(resolved.session.id,node_id);
        assert_eq!(resolved.session.row_version,1);
        assert_eq!(resolved.session.last_ip.as_deref(),Some("192.0.2.1"));
        assert_eq!(resolved.session.created_user_agent.as_deref(),Some("original-ORM"));
        let rotated=service.refresh_csrf_token_at(Some(node_token),&RequestInfo::default(),now()).await.unwrap();
        let after_rotate=original_service(json!({"action":"resolve","token":node_token,"now":base})).await;
        assert_eq!(after_rotate["value"]["session"]["rowVersion"],2);
        assert!(!after_rotate.to_string().contains("csrfTokenHash"));
        assert!(service.verify_csrf_token(rotated.session.as_ref().unwrap(),&rotated.csrf_token));
        let revoked=original_service(json!({"action":"revoke","token":node_token,"now":base})).await;
        assert_eq!(revoked["value"]["revoked"],true);
        assert_eq!(service.resolve_session_token_at(node_token,&RequestInfo::default(),now()).await.unwrap_err().code(),Some(Code::SessionRevoked));

        let rust=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let node_resolved=original_service(json!({"action":"resolve","token":rust.session_token,"now":"2026-05-13T01:01:00.000Z","info":{"ip":"192.0.2.2"}})).await;
        assert_eq!(node_resolved["value"]["session"]["id"],rust.session.id.to_string());
        assert_eq!(node_resolved["value"]["session"]["rowVersion"],2);
        assert_eq!(node_resolved["value"]["session"]["lastIp"],"192.0.2.2");
        let node_rotated=original_service(json!({"action":"rotate","token":rust.session_token,"now":"2026-05-13T01:01:00.000Z"})).await;
        let csrf=node_rotated["value"]["csrfToken"].as_str().unwrap();
        let rust_resolved=service.resolve_session_token_at(&rust.session_token,&RequestInfo::default(),now()+TimeDelta::seconds(60)).await.unwrap();
        assert_eq!(rust_resolved.session.row_version,3);
        assert!(service.verify_csrf_token(&rust_resolved.session,csrf));
        assert!(service.revoke_session_token_at(&rust.session_token,Reason::Logout,now()+TimeDelta::seconds(60)).await.unwrap());
        let node_rejected=original_service(json!({"action":"resolve","token":rust.session_token,"now":"2026-05-13T01:01:00.000Z"})).await;
        assert_eq!(node_rejected,json!({"result":"domain-error","code":"session_revoked"}));

        let node_verified=original_service(json!({"action":"verify","username":h.username(h.user),"passwordUnits":PASSWORD.encode_utf16().collect::<Vec<_>>()})).await;
        assert_eq!(node_verified["value"]["userId"],h.user.to_string());
        let profile=original_service(json!({"action":"profile","userId":h.user,"fallback":{"username":h.username(h.user),"permissions":["future:raw:permission"]}})).await;
        assert_eq!(profile["value"]["permissions"],json!(["future:raw:permission"]));
        assert_eq!(profile["value"]["lastLoginAt"],Value::Null);
    }).await;
}

fn guarded_test_router(service: AuthService, policy: RoutePolicy) -> Router {
    let state = AuthHttpState {
        service: std::sync::Arc::new(service),
        cookies: AuthCookieService::from_auth_config(&auth_config(900, 28800, 60)),
    };
    Router::new()
        .route(
            "/synthetic-guard",
            guarded_route(get(|| async { StatusCode::OK }), state.clone(), policy),
        )
        .with_state(state)
        .method_not_allowed_fallback(|| async { StatusCode::NOT_FOUND })
}

async fn guard_response(
    service: AuthService,
    policy: RoutePolicy,
    token: &str,
    request_id: Uuid,
    method: &str,
) -> axum::response::Response {
    guarded_test_router(service, policy)
        .oneshot(
            Request::builder()
                .method(method)
                .uri("/synthetic-guard")
                .header("cookie", format!("poms_session={token}"))
                .header("x-request-id", request_id.to_string())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap()
}

#[tokio::test]
#[ignore = "explicit controlled PG15: actual session to guarded MethodRouter and audit"]
async fn actual_session_guard_default_deny_all_any_override_and_wrong_method_effects() {
    run_case(|h| async move {
        let role=h.roles[0];
        sqlx::query("INSERT INTO poms.role(id,role_key,name) VALUES($1,$2,$3)").bind(role).bind(role.to_string()).bind("guard synthetic role").execute(h.database.pool()).await.unwrap();
        sqlx::query("INSERT INTO poms.user_role_assignment(user_id,role_id) VALUES($1,$2)").bind(h.user).bind(role).execute(h.database.pool()).await.unwrap();
        sqlx::query("INSERT INTO poms.role_permission_assignment(role_id,permission_key) VALUES($1,'project:read')").bind(role).execute(h.database.pool()).await.unwrap();
        let service=h.service();
        // The real guarded adapter uses the real wall clock; do not inject the
        // historical fixture clock or add a product test-clock switch.
        let session=service.create_session(h.user,&RequestInfo::default()).await.unwrap();
        let response=guard_response(service.clone(),RoutePolicy::default(),&session.session_token,h.run_id,"GET").await;
        assert_eq!(response.status(),StatusCode::FORBIDDEN);
        let body:Value=serde_json::from_slice(&to_bytes(response.into_body(),65536).await.unwrap()).unwrap();
        assert_eq!(body["message"],"Route must be decorated with @Authenticated() or @HasPermissions()");
        let count:i64=sqlx::query_scalar("SELECT count(*) FROM poms.security_event WHERE request_id=$1").bind(h.run_id.to_string()).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(count,0); // original missing-declaration branch does not audit
        let all_any=RoutePolicy {all:vec![PermissionKey::ProjectRead],any:vec![PermissionKey::CustomerRead],..Default::default()};
        let response=guard_response(service.clone(),all_any,&session.session_token,h.run_id,"GET").await;
        assert_eq!(response.status(),StatusCode::FORBIDDEN);
        let body:Value=serde_json::from_slice(&to_bytes(response.into_body(),65536).await.unwrap()).unwrap();
        assert_eq!(body["code"],"permission_denied");
        let all=RoutePolicy {all:vec![PermissionKey::ProjectRead,PermissionKey::CustomerRead],..Default::default()};
        assert_eq!(guard_response(service.clone(),all,&session.session_token,h.run_id,"GET").await.status(),StatusCode::FORBIDDEN);
        let allowed=RoutePolicy {all:vec![PermissionKey::ProjectRead],any:vec![PermissionKey::CustomerRead,PermissionKey::ProjectRead],..Default::default()};
        assert_eq!(guard_response(service.clone(),allowed,&session.session_token,h.run_id,"GET").await.status(),StatusCode::OK);
        let overridden=RoutePolicy::from_metadata(&RouteMetadata { public:Some(true),authenticated:Some(false),all:Some(vec![PermissionKey::CustomerRead]),any:None },
            &RouteMetadata { public:Some(false),authenticated:Some(true),all:Some(vec![]),any:Some(vec![PermissionKey::ProjectRead]) });
        assert_eq!(guard_response(service.clone(),overridden,&session.session_token,h.run_id,"GET").await.status(),StatusCode::OK);
        let events=sqlx::query("SELECT event_type,actor_id,principal,permission_key,result,details FROM poms.security_event WHERE request_id=$1")
            .bind(h.run_id.to_string()).fetch_all(h.database.pool()).await.unwrap();
        assert_eq!(events.len(),2);
        for event in &events {
            assert_eq!(event.get::<String,_>("event_type"),"authz.permission.denied");
            assert_eq!(event.get::<Option<Uuid>,_>("actor_id"),Some(h.user));
            assert_eq!(event.get::<Option<String>,_>("principal"),Some(h.username(h.user)));
            assert_eq!(event.get::<Option<String>,_>("permission_key").as_deref(),Some("project:read"));
            assert_eq!(event.get::<String,_>("result"),"blocked");
            assert_eq!(event.get::<Value,_>("details")["userPermissions"],json!(["project:read"]));
        }
        assert!(events.iter().any(|event|event.get::<Value,_>("details")["requiredAnyPermissions"]==json!(["customer:read"])));
        sqlx::query("UPDATE poms.auth_session SET last_seen_at=now()-interval '61 seconds' WHERE id=$1").bind(session.session.id).execute(h.database.pool()).await.unwrap();
        let before=sqlx::query("SELECT row_version,last_seen_at FROM poms.auth_session WHERE id=$1").bind(session.session.id).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(guard_response(service,RoutePolicy::authenticated(),&session.session_token,h.run_id,"POST").await.status(),StatusCode::NOT_FOUND);
        let after=sqlx::query("SELECT row_version,last_seen_at FROM poms.auth_session WHERE id=$1").bind(session.session.id).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(before.get::<i32,_>("row_version"),after.get::<i32,_>("row_version"));
        assert_eq!(before.get::<DateTime<Utc>,_>("last_seen_at"),after.get::<DateTime<Utc>,_>("last_seen_at"));
    }).await;
}

fn flush_event(h: &Harness, event_type: &str) -> SecurityEventInput {
    SecurityEventInput {
        event_type: event_type.into(),
        path: "/synthetic/session-flush".into(),
        request_id: Some(h.run_id.to_string()),
        result: SecurityResult::Failed,
        ..Default::default()
    }
}

async fn session_version(h: &Harness, id: Uuid) -> i32 {
    sqlx::query_scalar("SELECT row_version FROM poms.auth_session WHERE id=$1")
        .bind(id)
        .fetch_one(h.database.pool())
        .await
        .unwrap()
}

#[tokio::test]
#[ignore = "explicit controlled PG15: original managed snapshot plus audit flush transaction"]
async fn managed_session_audit_flush_is_local_optimistic_and_atomic_after_raw_commit() {
    run_case(|h|async move {
        let service=h.service();
        let public=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let error=service.resolve_session_token_at(&public.session_token,&RequestInfo::default(),public.session.idle_expires_at).await.unwrap_err();
        assert_eq!(error.code(),Some(Code::SessionExpired));
        let pending=error.pending_flush().expect("successful raw expiry made a managed entity dirty");
        assert_eq!(pending.expected_version(),2);
        assert_eq!(session_version(&h,public.session.id).await,2); // public domain error alone does not flush
        service.record_security_event_with_session(flush_event(&h,"flush.success"),Some(pending)).await.unwrap();
        assert_eq!(session_version(&h,public.session.id).await,3);

        let failure=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let error=service.resolve_session_token_at(&failure.session_token,&RequestInfo::default(),failure.session.idle_expires_at).await.unwrap_err();
        let mut input=flush_event(&h,"flush.insert-failed");input.path="x".repeat(256);
        let failed=service.record_security_event_with_session(input,error.pending_flush()).await.unwrap_err();
        assert_eq!(failed.database_error().unwrap().sqlstate(),Some("22001"));
        let row=sqlx::query("SELECT row_version,status,updated_at FROM poms.auth_session WHERE id=$1")
            .bind(failure.session.id).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(row.get::<i32,_>("row_version"),2);
        assert_eq!(row.get::<String,_>("status"),"expired");
        assert_eq!(row.get::<DateTime<Utc>,_>("updated_at"),failure.session.idle_expires_at); // raw commit survives, onUpdate flush did not

        let race=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let touched=service.resolve_session_token_at(&race.session_token,&RequestInfo {ip:Some("192.0.2.2".into()),..Default::default()},now()+TimeDelta::seconds(60)).await.unwrap();
        assert_eq!(touched.pending_flush.as_ref().unwrap().expected_version(),2);
        assert!(service.revoke_session_token_at(&race.session_token,Reason::AdminRevoked,now()+TimeDelta::seconds(61)).await.unwrap());
        let failed=service.record_security_event_with_session(flush_event(&h,"flush.cas-failed"),touched.pending_flush.as_ref()).await.unwrap_err();
        assert_eq!(failed.kind(),AuthErrorKind::Database);
        let row=sqlx::query("SELECT row_version,status,revoked_reason FROM poms.auth_session WHERE id=$1")
            .bind(race.session.id).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(row.get::<i32,_>("row_version"),3);
        assert_eq!(row.get::<String,_>("status"),"revoked");
        assert_eq!(row.get::<String,_>("revoked_reason"),"admin-revoked");
        let failed_events:i64=sqlx::query_scalar("SELECT count(*) FROM poms.security_event WHERE request_id=$1 AND event_type IN ('flush.insert-failed','flush.cas-failed')")
            .bind(h.run_id.to_string()).fetch_one(h.database.pool()).await.unwrap();
        assert_eq!(failed_events,0); // CAS failure rolls back its already inserted event too

        let touched=service.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let resolved=service.resolve_session_token_at(&touched.session_token,&RequestInfo::default(),now()+TimeDelta::seconds(60)).await.unwrap();
        service.record_security_event_with_session(flush_event(&h,"flush.touch-success"),resolved.pending_flush.as_ref()).await.unwrap();
        assert_eq!(session_version(&h,touched.session.id).await,3);

        // The original comparator excludes version itself. With throttle=0
        // and otherwise identical data, a raw version bump alone is not dirty.
        let zero=AuthService::new(h.database.clone(),auth_config(900,28800,0));
        let unchanged=zero.create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        sqlx::query("UPDATE poms.auth_session SET updated_at=$1 WHERE id=$2").bind(now()).bind(unchanged.session.id).execute(h.database.pool()).await.unwrap();
        let resolved=zero.resolve_session_token_at(&unchanged.session_token,&RequestInfo::default(),now()).await.unwrap();
        assert_eq!(resolved.session.row_version,2);
        assert!(resolved.pending_flush.is_none());
        zero.record_security_event_with_session(flush_event(&h,"flush.version-only"),resolved.pending_flush.as_ref()).await.unwrap();
        assert_eq!(session_version(&h,unchanged.session.id).await,2);
    }).await;
}
