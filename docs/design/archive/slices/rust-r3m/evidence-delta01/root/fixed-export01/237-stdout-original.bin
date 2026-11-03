//! Explicit R2A PG15 acceptance. The runner checks the owner-only persistent
//! marker first. The fixed Node fixture repeats that preflight and journals
//! every run; all product DML and SQLx assertions use poms_r2a_app.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::{
    env,
    future::Future,
    io::Write,
    path::Path,
    process::{Command, Stdio},
    str::FromStr,
    time::Duration,
};

use chrono::{DateTime, TimeDelta, Utc};
use poms_api_rust::{
    auth::{
        audit::AuditLogInput,
        model::{AuthErrorKind, RequestInfo},
        service::AuthService,
    },
    config::{AuthConfig, DatabaseConfig},
    database::Database,
    navigation::navigation_snapshot,
    shared::generated::AuthSessionRevokedReason,
};
use serde_json::{Value, json};
use sqlx::{ConnectOptions, Connection, PgConnection, Row, postgres::PgConnectOptions};
use tokio::time::timeout;
use uuid::Uuid;

const ROLE: &str = "poms_r2a_app";
const DATABASE: &str = "poms_r2a_rust";

fn guarded_options(url: &str, pgoptions: bool) -> Result<(PgConnectOptions, String), &'static str> {
    if pgoptions {
        return Err("R2A refuses inherited PGOPTIONS");
    }
    let password = url
        .strip_prefix("postgres://poms_r2a_app:")
        .and_then(|value| value.strip_suffix("@127.0.0.1:15432/poms_r2a_rust"))
        .filter(|value| {
            value.len() == 64
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        })
        .ok_or("R2A requires its exact isolated URL and explicit synthetic secret")?;
    let options = PgConnectOptions::from_str(url).map_err(|_| "invalid controlled URL")?;
    if options.get_host() != "127.0.0.1"
        || options.get_port() != 15432
        || options.get_database() != Some(DATABASE)
        || options.get_username() != ROLE
        || options.get_socket().is_some()
        || options.get_options().is_some()
    {
        return Err("R2A target does not match the frozen boundary");
    }
    Ok((options.disable_statement_logging(), password.to_owned()))
}

async fn target_config() -> Result<DatabaseConfig, &'static str> {
    if env::var("POMS_R2A_DATABASE_TEST").as_deref() != Ok("1") {
        return Err("set explicit POMS_R2A_DATABASE_TEST=1");
    }
    let url =
        env::var("POMS_R2A_DATABASE_TEST_URL").map_err(|_| "explicit isolated URL is required")?;
    let (options, password) = guarded_options(&url, env::var_os("PGOPTIONS").is_some())?;
    let mut connection = timeout(Duration::from_secs(5), PgConnection::connect_with(&options))
        .await
        .map_err(|_| "metadata connect deadline")?
        .map_err(|_| "metadata connect failed")?;
    // System metadata SELECT only, before pool after_connect or fixture writes.
    let row = timeout(Duration::from_secs(5), sqlx::query("SELECT current_database() AS database_name,\
        session_user::text AS session_name,current_user::text AS current_name,\
        current_setting('server_version_num') AS version,current_setting('port') AS port,\
        current_setting('poms.r0e_isolated',true) AS isolated,pg_get_userbyid(d.datdba) AS database_owner,\
        r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,\
        (SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS role_memberships,\
        has_database_privilege(current_user,current_database(),'CREATE') AS database_create,\
        has_schema_privilege(current_user,'poms','CREATE') AS schema_create,\
        has_schema_privilege(current_user,'public','CREATE') AS public_schema_create,\
        has_schema_privilege(current_user,'r2a_control','USAGE') AS marker_access \
        FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user")
        .fetch_one(&mut connection)).await.map_err(|_| "metadata guard deadline")?.map_err(|_| "metadata guard failed")?;
    for (column, expected) in [
        ("database_name", DATABASE),
        ("session_name", ROLE),
        ("current_name", ROLE),
        ("version", "150012"),
        ("port", "15432"),
        ("database_owner", "poms_r0e_owner"),
    ] {
        if row
            .try_get::<String, _>(column)
            .map_err(|_| "invalid metadata")?
            != expected
        {
            return Err("R2A server identity mismatch");
        }
    }
    if row
        .try_get::<Option<String>, _>("isolated")
        .map_err(|_| "invalid isolation metadata")?
        .as_deref()
        != Some("on")
    {
        return Err("R2A isolation marker GUC mismatch");
    }
    for flag in [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolbypassrls",
        "rolreplication",
        "database_create",
        "schema_create",
        "public_schema_create",
        "marker_access",
    ] {
        if row
            .try_get::<bool, _>(flag)
            .map_err(|_| "invalid privilege metadata")?
        {
            return Err("R2A runtime privileges are elevated");
        }
    }
    if row
        .try_get::<i32, _>("role_memberships")
        .map_err(|_| "invalid membership metadata")?
        != 0
    {
        return Err("R2A runtime role has memberships");
    }
    timeout(Duration::from_secs(5), connection.close())
        .await
        .map_err(|_| "metadata close deadline")?
        .map_err(|_| "metadata close failed")?;
    Ok(DatabaseConfig {
        host: "127.0.0.1".into(),
        port: 15432,
        username: ROLE.into(),
        password,
        database: DATABASE.into(),
        url: Some(url),
        connect: true,
        max_connections: 4,
        acquire_timeout: Duration::from_secs(5),
        query_timeout: Duration::from_secs(5),
        statement_timeout: Duration::from_secs(4),
    })
}

// Only prepare/cleanup use this subprocess. No URL, credential or token is sent
// to its argv/environment; the reviewed CLI reads fixed mounted secret paths.
fn fixture(run_id: Uuid, action: &str) -> Value {
    assert!(matches!(action, "prepare" | "cleanup"));
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("workspace root");
    let mut command = Command::new("node");
    command
        .arg(root.join("tools/rust-r2a/fixture-cli.mjs"))
        .current_dir(&root)
        .env_clear()
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    for key in ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR"] {
        if let Some(value) = env::var_os(key) {
            command.env(key, value);
        }
    }
    let mut child = command.spawn().expect("fixed fixture child");
    child.stdin.take().expect("fixture stdin").write_all(
        json!({"formatVersion":1,"runId":run_id,"backend":"rust","action":action,"account":"none"}).to_string().as_bytes()
    ).expect("fixture stdin write");
    let output = child.wait_with_output().expect("fixture child completion");
    assert!(
        output.status.success(),
        "fixture failed for run {run_id}; journal requires explicit recovery"
    );
    let value: Value = serde_json::from_slice(&output.stdout).expect("fixed fixture response JSON");
    let object = value.as_object().expect("fixture response object");
    assert_eq!(object.len(), 7);
    for key in [
        "formatVersion",
        "runId",
        "backend",
        "action",
        "matched",
        "changed",
        "state",
    ] {
        assert!(object.contains_key(key));
    }
    assert_eq!(value["formatVersion"].as_u64(), Some(1));
    assert_eq!(value["runId"], run_id.to_string());
    assert_eq!(value["backend"], "rust");
    assert_eq!(value["action"], action);
    assert!(value["matched"].as_u64().is_some() && value["changed"].as_u64().is_some());
    assert_eq!(
        value["state"],
        if action == "prepare" {
            "prepared"
        } else {
            "cleaned"
        }
    );
    value
}

fn at(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .expect("fixed ISO timestamp")
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
}
impl Harness {
    async fn new() -> Self {
        let config = target_config()
            .await
            .expect("R2A target guard rejected before writes");
        let database = Database::new(&config).await.expect("guarded R2A pool");
        let run_id = sqlx::query_scalar("SELECT gen_random_uuid()")
            .fetch_one(database.pool())
            .await
            .expect("synthetic run UUID");
        fixture(run_id, "prepare");
        println!(
            "{}",
            json!({"kind":"r2a-rust-db-fixture","runId":run_id,"backend":"rust","state":"prepared"})
        );
        let username = format!("r2a_admin_{}", run_id.simple());
        let result = sqlx::query_scalar("SELECT id FROM poms.platform_user WHERE username=$1")
            .bind(username)
            .fetch_one(database.pool())
            .await;
        let user = match result {
            Ok(user) => user,
            Err(_) => {
                fixture(run_id, "cleanup");
                panic!("prepared synthetic account missing; cleanup completed");
            }
        };
        Self {
            database,
            run_id,
            user,
        }
    }
    fn service(&self) -> AuthService {
        AuthService::new(
            self.database.clone(),
            AuthConfig {
                cookie_path: "/api".into(),
                cookie_secure: false,
                session_idle_timeout: Duration::from_secs(900),
                session_absolute_timeout: Duration::from_secs(28800),
                session_last_seen_throttle: Duration::from_secs(60),
                jwt_secret: "public-r2a-acceptance-only-key-material".into(),
                secret_key: None,
            },
        )
    }
    fn input(&self, request_id: Option<String>) -> AuditLogInput {
        AuditLogInput {
            event_type: "platform.navigation.synced".into(),
            target_type: "NavigationTree".into(),
            target_id: "platform-navigation".into(),
            operator_id: Some(self.user),
            request_id,
            after_snapshot: Some(
                serde_json::to_value(navigation_snapshot().expect("actual navigation SSOT"))
                    .expect("summary wire JSON"),
            ),
            metadata: Some(json!({"source":"static-navigation-ssot"})),
            occurred_at: Some(at("2026-05-13T01:00:00.123456Z")),
            ..Default::default()
        }
    }
    async fn cleanup(&self) {
        fixture(self.run_id, "cleanup");
        let zero = fixture(self.run_id, "cleanup");
        assert_eq!(zero["matched"].as_u64(), Some(0));
        assert_eq!(zero["changed"].as_u64(), Some(0));
        println!(
            "{}",
            json!({"kind":"r2a-rust-db-fixture","runId":self.run_id,"backend":"rust","state":"cleaned","matched":0,"changed":0})
        );
        self.database
            .close(Duration::from_secs(5))
            .await
            .expect("R2A pool closed");
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
    result.expect("R2A case failed; this run cleanup and zero-residual check completed");
}
#[derive(Debug, PartialEq, Eq)]
struct SessionRow {
    version: i32,
    status: String,
    last_seen: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
async fn state(h: &Harness, id: Uuid) -> SessionRow {
    let row = sqlx::query(
        "SELECT row_version,status,last_seen_at,updated_at FROM poms.auth_session WHERE id=$1",
    )
    .bind(id)
    .fetch_one(h.database.pool())
    .await
    .unwrap();
    SessionRow {
        version: row.get("row_version"),
        status: row.get("status"),
        last_seen: row.get("last_seen_at"),
        updated_at: row.get("updated_at"),
    }
}
async fn audit_count(h: &Harness) -> i64 {
    sqlx::query_scalar("SELECT count(*) FROM poms.audit_log WHERE operator_id=$1")
        .bind(h.user)
        .fetch_one(h.database.pool())
        .await
        .unwrap()
}

#[test]
fn r2a_guard_refuses_other_instances_and_override_urls_before_io() {
    let password = "a".repeat(64);
    let valid = format!("postgres://poms_r2a_app:{password}@127.0.0.1:15432/poms_r2a_rust");
    assert!(guarded_options(&valid, false).is_ok());
    assert!(guarded_options(&valid, true).is_err());
    for invalid in [
        valid.replace(":15432/", ":5432/"),
        valid.replace("poms_r2a_rust", "poms_r1e_rust"),
        valid.replace("poms_r2a_rust", "poms"),
        valid.replace("poms_r2a_app:", "poms_r0e_owner:"),
        format!("{valid}?options=-crole%3Dpoms_r0e_owner"),
        format!("{valid}#ignored"),
        valid.replace("127.0.0.1", "localhost"),
        valid.replace(&password, "implicit"),
    ] {
        assert!(guarded_options(&invalid, false).is_err());
    }
}

#[tokio::test]
#[ignore = "explicit R2A PG15: real audit insert, full wire snapshot and non-due session"]
async fn navigation_audit_without_pending_preserves_session_and_all_twelve_columns() {
    run_case(|h| async move {
        let service = h.service();
        let created = service.create_session_at(h.user, &RequestInfo::default(), now()).await.unwrap();
        let resolved = service.resolve_session_token_at(&created.session_token, &RequestInfo::default(), now()+TimeDelta::seconds(1)).await.unwrap();
        assert!(resolved.pending_flush.is_none());
        let before = state(&h, created.session.id).await;
        for request_id in [None, Some(String::new())] {
            service.record_audit_log_with_session(h.input(request_id), resolved.pending_flush.as_ref()).await.unwrap();
        }
        assert_eq!(state(&h, created.session.id).await, before);
        let rows = sqlx::query("SELECT id,event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at FROM poms.audit_log WHERE operator_id=$1")
            .bind(h.user).fetch_all(h.database.pool()).await.unwrap();
        assert_eq!(rows.len(), 2);
        assert_ne!(rows[0].get::<Uuid,_>("id"), rows[1].get::<Uuid,_>("id"));
        let requests:Vec<Option<String>>=rows.iter().map(|row|row.get("request_id")).collect();
        assert!(requests.contains(&None) && requests.contains(&Some(String::new())));
        for row in rows {
            assert_eq!(row.columns().len(), 12);
            assert_eq!(row.get::<String,_>("event_type"), "platform.navigation.synced");
            assert_eq!(row.get::<String,_>("target_type"), "NavigationTree");
            assert_eq!(row.get::<String,_>("target_id"), "platform-navigation");
            assert_eq!(row.get::<Option<Uuid>,_>("operator_id"), Some(h.user));
            assert_eq!(row.get::<String,_>("result"), "success");
            assert_eq!(row.get::<Option<String>,_>("reason"), None);
            assert_eq!(row.get::<Option<Value>,_>("before_snapshot"), None);
            assert_eq!(row.get::<Option<Value>,_>("after_snapshot"), h.input(None).after_snapshot);
            assert_eq!(row.get::<Option<Value>,_>("metadata"), Some(json!({"source":"static-navigation-ssot"})));
            assert_eq!(row.get::<DateTime<Utc>,_>("occurred_at"), at("2026-05-13T01:00:00.123Z"));
        }
    }).await;
}

#[tokio::test]
#[ignore = "explicit R2A PG15: raw due touch then business audit plus managed CAS commit"]
async fn navigation_audit_commits_due_flush_once_after_raw_touch() {
    run_case(|h| async move {
        let service = h.service();
        let created = service
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let touched = service
            .resolve_session_token_at(
                &created.session_token,
                &RequestInfo::default(),
                now() + TimeDelta::seconds(60),
            )
            .await
            .unwrap();
        let pending = touched
            .pending_flush
            .as_ref()
            .expect("due touch has managed changes");
        assert_eq!(pending.expected_version(), 2);
        let raw = state(&h, created.session.id).await;
        assert_eq!(raw.version, 2);
        service
            .record_audit_log_with_session(h.input(Some(h.run_id.to_string())), Some(pending))
            .await
            .unwrap();
        let committed = state(&h, created.session.id).await;
        assert_eq!(committed.version, 3);
        assert_eq!(committed.status, "active");
        assert_eq!(committed.last_seen, raw.last_seen);
        assert!(committed.updated_at >= raw.updated_at);
        assert_eq!(audit_count(&h).await, 1);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2A PG15: 22001 and late CAS failure roll back audit flush only"]
async fn navigation_audit_failures_preserve_raw_commit_and_rollback_the_insert() {
    run_case(|h| async move {
        let service = h.service();
        let created = service
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let touched = service
            .resolve_session_token_at(
                &created.session_token,
                &RequestInfo::default(),
                now() + TimeDelta::seconds(60),
            )
            .await
            .unwrap();
        let raw = state(&h, created.session.id).await;
        assert_eq!(raw.version, 2);
        let failure = service
            .record_audit_log_with_session(
                h.input(Some("r".repeat(65))),
                touched.pending_flush.as_ref(),
            )
            .await
            .unwrap_err();
        assert_eq!(failure.database_error().unwrap().sqlstate(), Some("22001"));
        assert_eq!(state(&h, created.session.id).await, raw);
        assert_eq!(audit_count(&h).await, 0);

        let raced = service
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let touched = service
            .resolve_session_token_at(
                &raced.session_token,
                &RequestInfo::default(),
                now() + TimeDelta::seconds(60),
            )
            .await
            .unwrap();
        assert_eq!(
            touched.pending_flush.as_ref().unwrap().expected_version(),
            2
        );
        assert!(
            service
                .revoke_session_token_at(
                    &raced.session_token,
                    AuthSessionRevokedReason::AdminRevoked,
                    now() + TimeDelta::seconds(61)
                )
                .await
                .unwrap()
        );
        let independent = state(&h, raced.session.id).await;
        assert_eq!(independent.version, 3);
        assert_eq!(independent.status, "revoked");
        let failure = service
            .record_audit_log_with_session(
                h.input(Some(h.run_id.to_string())),
                touched.pending_flush.as_ref(),
            )
            .await
            .unwrap_err();
        assert_eq!(failure.kind(), AuthErrorKind::Database);
        assert_eq!(state(&h, raced.session.id).await, independent);
        assert_eq!(audit_count(&h).await, 0);
    })
    .await;
}
