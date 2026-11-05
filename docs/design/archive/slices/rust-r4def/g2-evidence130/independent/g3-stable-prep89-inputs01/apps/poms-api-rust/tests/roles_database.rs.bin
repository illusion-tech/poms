//! Explicit R2B PostgreSQL service acceptance. The fixed fixture rechecks the
//! owner-only marker before preparing any run-owned data. Runtime SQL and all
//! product calls use only poms_r2b_app on the new poms_r2b_rust database.
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
        js_json::JsString,
        model::{RequestInfo, ResolvedSession, SessionFlush},
        service::AuthService,
    },
    compat::{json::Field, scalars::js_iso_string},
    config::{AuthConfig, DatabaseConfig},
    database::Database,
    roles::{
        model::{
            AssignRolePermissions, CreateRole, RoleActivation, RoleSummary, UpdateRole, js_string,
        },
        service::{RolesError, RolesService},
    },
    shared::generated::PermissionKey,
};
use serde_json::{Value, json};
use sqlx::{ConnectOptions, Connection, PgConnection, Row, postgres::PgConnectOptions};
use tokio::time::timeout;
use uuid::Uuid;

const ROLE: &str = "poms_r2b_app";
const DATABASE: &str = "poms_r2b_rust";

fn guarded_options(
    url: &str,
    ambient_override: bool,
) -> Result<(PgConnectOptions, String), &'static str> {
    if ambient_override {
        return Err("R2B refuses ambient PostgreSQL or database overrides");
    }
    let password = url
        .strip_prefix("postgres://poms_r2b_app:")
        .and_then(|value| value.strip_suffix("@127.0.0.1:15432/poms_r2b_rust"))
        .filter(|value| {
            value.len() == 64
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        })
        .ok_or("R2B requires its exact new Rust database URL and explicit synthetic secret")?;
    let options = PgConnectOptions::from_str(url).map_err(|_| "invalid controlled R2B URL")?;
    if options.get_host() != "127.0.0.1"
        || options.get_port() != 15432
        || options.get_database() != Some(DATABASE)
        || options.get_username() != ROLE
        || options.get_socket().is_some()
        || options.get_options().is_some()
    {
        return Err("R2B target differs from its frozen isolation boundary");
    }
    Ok((options.disable_statement_logging(), password.to_owned()))
}

async fn target_config() -> Result<DatabaseConfig, &'static str> {
    if env::var("POMS_R2B_DATABASE_TEST").as_deref() != Ok("1") {
        return Err("set explicit POMS_R2B_DATABASE_TEST=1");
    }
    let url = env::var("POMS_R2B_DATABASE_TEST_URL").map_err(|_| "explicit R2B URL is required")?;
    let ambient_override = env::vars_os().any(|(key, _)| {
        let key = key.to_string_lossy().to_ascii_uppercase();
        key.starts_with("PG")
            || key.starts_with("DB_")
            || key.starts_with("MIKRO_")
            || key == "DATABASE_URL"
    });
    let (options, password) = guarded_options(&url, ambient_override)?;
    let mut connection = timeout(Duration::from_secs(5), PgConnection::connect_with(&options))
        .await
        .map_err(|_| "R2B metadata connection deadline")?
        .map_err(|_| "R2B metadata connection failed")?;
    // No pool after_connect/SET, fixture or product operation precedes this
    // read-only metadata query. The fixture separately reads marker 538b...ce
    // with the fixed owner-only connection before its first DML transaction.
    let row = timeout(Duration::from_secs(5), sqlx::query("SELECT current_database() AS database_name,\
        session_user::text AS session_name,current_user::text AS current_name,\
        current_setting('server_version_num') AS version,current_setting('port') AS port,\
        current_setting('poms.r0e_isolated',true) AS isolated,pg_get_userbyid(d.datdba) AS database_owner,\
        r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,\
        (SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS role_memberships,\
        has_database_privilege(current_user,current_database(),'CREATE') AS database_create,\
        has_schema_privilege(current_user,'poms','CREATE') AS schema_create,\
        has_schema_privilege(current_user,'public','CREATE') AS public_schema_create,\
        has_schema_privilege(current_user,'r2b_control','USAGE') AS marker_access \
        FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user")
        .fetch_one(&mut connection)).await.map_err(|_| "R2B metadata guard deadline")?
        .map_err(|_| "R2B metadata guard failed")?;
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
            .map_err(|_| "invalid R2B metadata")?
            != expected
        {
            return Err("R2B PostgreSQL identity mismatch");
        }
    }
    if row
        .try_get::<Option<String>, _>("isolated")
        .map_err(|_| "invalid R2B isolation metadata")?
        .as_deref()
        != Some("on")
    {
        return Err("R2B isolation marker GUC mismatch");
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
            .map_err(|_| "invalid R2B privilege metadata")?
        {
            return Err("R2B runtime role has elevated privileges");
        }
    }
    if row
        .try_get::<i32, _>("role_memberships")
        .map_err(|_| "invalid R2B memberships")?
        != 0
    {
        return Err("R2B runtime role has memberships");
    }
    timeout(Duration::from_secs(5), connection.close())
        .await
        .map_err(|_| "R2B metadata close deadline")?
        .map_err(|_| "R2B metadata close failed")?;
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

// The fixed child has its own 45-second deadline. It receives no credentials,
// token, raw SQL, role IDs or role keys through argv, environment or stdin.
fn fixture(run_id: Uuid, action: &str, slot: Option<&str>) -> Value {
    assert!(matches!(
        action,
        "prepare"
            | "cleanup"
            | "role-plan"
            | "role-adopt"
            | "role-bind-viewer"
            | "role-insert-historical"
            | "role-set-system"
    ));
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("workspace root");
    let mut command = Command::new("node");
    command
        .arg(root.join("tools/rust-r2b/fixture-cli.mjs"))
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
    let mut child = command.spawn().expect("fixed R2B fixture child");
    let mut input =
        json!({"formatVersion":1,"runId":run_id,"backend":"rust","action":action,"account":"none"});
    if let Some(slot) = slot {
        input["roleSlot"] = slot.into();
    }
    child
        .stdin
        .take()
        .expect("fixture stdin")
        .write_all(input.to_string().as_bytes())
        .expect("fixture stdin write");
    let output = child.wait_with_output().expect("fixture child completion");
    assert!(
        output.status.success(),
        "R2B fixture failed for run {run_id}; preserve its recovery journal"
    );
    assert!(
        output.stdout.len() <= 2 * 1024 * 1024,
        "bounded fixture output"
    );
    let value: Value = serde_json::from_slice(&output.stdout).expect("fixed fixture response JSON");
    assert_eq!(value["formatVersion"], 1);
    assert_eq!(value["runId"], run_id.to_string());
    assert_eq!(value["backend"], "rust");
    assert_eq!(value["action"], action);
    assert!(value["matched"].as_u64().is_some() && value["changed"].as_u64().is_some());
    assert!(value["state"].is_string());
    value
}

fn at(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .expect("fixed timestamp")
        .with_timezone(&Utc)
}
fn now() -> DateTime<Utc> {
    at("2026-10-26T00:00:00.000Z")
}
fn activation() -> RoleActivation {
    RoleActivation {
        reason: Some(js_string("ignored")),
        comment: Some(js_string("ignored")),
        expected_version: Some(9_007_199_254_740_991),
    }
}
fn no_update() -> UpdateRole {
    UpdateRole {
        name: None,
        description: Field::Missing,
        display_order: None,
    }
}
fn sqlstate(error: &RolesError) -> Option<&str> {
    match error {
        RolesError::Database(error) => error.sqlstate(),
        _ => None,
    }
}
fn surrogate(prefix: &str) -> JsString {
    let mut units: Vec<u16> = prefix.encode_utf16().collect();
    units.push(0xd800);
    JsString::from_code_units(units)
}

#[derive(Clone)]
struct Harness {
    database: Database,
    run_id: Uuid,
    user: Uuid,
    viewer: Uuid,
    actor_role: Uuid,
}
impl Harness {
    async fn new() -> Self {
        let config = target_config()
            .await
            .expect("R2B target guard refused before writes");
        // This read obtains no fixture ID from a credential or operator input.
        let options = guarded_options(config.url.as_ref().unwrap(), false)
            .unwrap()
            .0;
        let mut identity = PgConnection::connect_with(&options)
            .await
            .expect("guarded identity connection");
        let run_id = sqlx::query_scalar("SELECT gen_random_uuid()")
            .fetch_one(&mut identity)
            .await
            .expect("synthetic run UUID");
        identity.close().await.expect("identity connection close");
        fixture(run_id, "prepare", None); // Includes owner-only marker preflight.
        println!(
            "{}",
            json!({"kind":"r2b-service-db-fixture","runId":run_id,"backend":"rust","state":"prepared"})
        );
        let database = Database::new(&config)
            .await
            .expect("guarded R2B runtime pool");
        let users = sqlx::query(
            "SELECT id,username FROM poms.platform_user WHERE username=ANY($1::text[])",
        )
        .bind(
            [
                format!("r2b_admin_{}", run_id.simple()),
                format!("r2b_viewer_{}", run_id.simple()),
            ]
            .as_slice(),
        )
        .fetch_all(database.pool())
        .await
        .expect("prepared synthetic users");
        assert_eq!(users.len(), 2);
        let user = users
            .iter()
            .find(|row| row.get::<String, _>("username").starts_with("r2b_admin_"))
            .unwrap()
            .get("id");
        let viewer = users
            .iter()
            .find(|row| row.get::<String, _>("username").starts_with("r2b_viewer_"))
            .unwrap()
            .get("id");
        let actor_role = sqlx::query_scalar(
            "SELECT role_id FROM poms.user_role_assignment WHERE user_id=$1 AND status='active'",
        )
        .bind(user)
        .fetch_one(database.pool())
        .await
        .unwrap();
        Self {
            database,
            run_id,
            user,
            viewer,
            actor_role,
        }
    }
    fn auth(&self) -> AuthService {
        AuthService::new(
            self.database.clone(),
            AuthConfig {
                cookie_path: "/api".into(),
                cookie_secure: false,
                session_idle_timeout: Duration::from_secs(900),
                session_absolute_timeout: Duration::from_secs(28800),
                session_last_seen_throttle: Duration::from_secs(60),
                jwt_secret: "public-r2b-service-acceptance-only".into(),
                secret_key: None,
            },
        )
    }
    fn roles(&self) -> RolesService {
        RolesService::new(self.database.clone())
    }
    fn input(&self, slot: &str) -> CreateRole {
        let key = format!("r2b_{}_{}", self.run_id.simple(), slot);
        let name = format!("R2B {slot}");
        CreateRole {
            role_key: if slot == "utf16-key" {
                surrogate(&key)
            } else {
                js_string(&key)
            },
            name: if slot == "utf16-name" {
                surrogate(&name)
            } else {
                js_string(&name)
            },
            description: if slot == "utf16-description" {
                Field::Value(surrogate(""))
            } else {
                Field::Null
            },
            display_order: Some(if slot == "order-overflow" {
                2_147_483_648
            } else {
                0
            }),
        }
    }
    async fn create(
        &self,
        slot: &str,
        pending: Option<&SessionFlush>,
    ) -> Result<RoleSummary, RolesError> {
        fixture(self.run_id, "role-plan", Some(slot));
        let result = self
            .roles()
            .create(self.input(slot), Some(self.user), pending)
            .await;
        // Includes a failed second audit flush: first-flush rows are still owned.
        fixture(self.run_id, "role-adopt", Some(slot));
        result
    }
    async fn role_id(&self, slot: &str) -> Option<Uuid> {
        sqlx::query_scalar("SELECT id FROM poms.role WHERE role_key=$1")
            .bind(self.input(slot).role_key.to_utf8_lossy())
            .fetch_optional(self.database.pool())
            .await
            .unwrap()
    }
    async fn role(&self, id: Uuid) -> Value {
        sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.role r WHERE id=$1")
            .bind(id)
            .fetch_one(self.database.pool())
            .await
            .unwrap()
    }
    async fn permissions(&self, id: Uuid) -> Vec<Value> {
        sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.role_permission_assignment r WHERE role_id=$1 ORDER BY id")
            .bind(id).fetch_all(self.database.pool()).await.unwrap()
    }
    async fn session(&self, id: Uuid) -> Value {
        sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.auth_session r WHERE id=$1")
            .bind(id)
            .fetch_one(self.database.pool())
            .await
            .unwrap()
    }
    async fn audits(&self) -> Vec<Value> {
        sqlx::query_scalar(
            "SELECT to_jsonb(r) FROM poms.audit_log r WHERE operator_id=$1 ORDER BY occurred_at,id",
        )
        .bind(self.user)
        .fetch_all(self.database.pool())
        .await
        .unwrap()
    }
    async fn resolve(&self, token: &str, seconds: i64) -> ResolvedSession {
        self.auth()
            .resolve_session_token_at(
                token,
                &RequestInfo::default(),
                now() + TimeDelta::seconds(seconds),
            )
            .await
            .unwrap()
    }
    async fn cleanup(&self) {
        fixture(self.run_id, "cleanup", None);
        let zero = fixture(self.run_id, "cleanup", None);
        assert_eq!(zero["matched"], 0);
        assert_eq!(zero["changed"], 0);
        println!(
            "{}",
            json!({"kind":"r2b-service-db-fixture","runId":self.run_id,"backend":"rust","state":"cleaned","matched":0,"changed":0})
        );
        self.database
            .close(Duration::from_secs(5))
            .await
            .expect("R2B pool closed");
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
    result.expect("R2B service case failed; owned cleanup and zero-residual check completed");
}

#[test]
fn r2b_target_guard_rejects_old_databases_pg17_owner_and_ambient_overrides_before_io() {
    let password = "a".repeat(64);
    let valid = format!("postgres://poms_r2b_app:{password}@127.0.0.1:15432/poms_r2b_rust");
    assert!(guarded_options(&valid, false).is_ok());
    assert!(guarded_options(&valid, true).is_err());
    for bad in [
        valid.replace(":15432/", ":5432/"),
        valid.replace("poms_r2b_rust", "poms_r2b_nest"),
        valid.replace("poms_r2b_rust", "poms_r2a_rust"),
        valid.replace("poms_r2b_rust", "poms_r1c_rust"),
        valid.replace("poms_r2b_rust", "poms"),
        valid.replace("poms_r2b_app:", "poms_r0e_owner:"),
        valid.replace("127.0.0.1", "localhost"),
        format!("{valid}?options=-crole%3Downer"),
        format!("{valid}#fragment"),
        valid.replace(&password, "implicit"),
        valid.replace(&password, &password.to_uppercase()),
    ] {
        assert!(guarded_options(&bad, false).is_err());
    }
}

#[tokio::test]
#[ignore = "explicit R2B PG15: create, dirty/no-op role flushes and twelve audit columns"]
async fn role_business_and_audit_flushes_preserve_defaults_versions_and_noop_boundaries() {
    run_case(|h| async move {
        let created = h.auth().create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let due = h.resolve(&created.session_token,60).await;
        let summary = h.create("main",due.pending_flush.as_ref()).await.unwrap();
        let id = Uuid::parse_str(&summary.id).unwrap();
        let original = h.role(id).await;
        assert_eq!(original["row_version"],1); assert_eq!(original["is_active"],true); assert_eq!(original["is_system_role"],false);
        assert_eq!(original["description"],Value::Null); assert_eq!(original["created_by"],Value::Null); assert_eq!(original["updated_by"],Value::Null);
        assert_eq!(h.session(created.session.id).await["row_version"],3);
        let audits = h.audits().await; assert_eq!(audits.len(),1);
        let audit = &audits[0]; assert_eq!(audit.as_object().unwrap().len(),12);
        assert_eq!(audit["event_type"],"platform.role.created"); assert_eq!(audit["target_type"],"PlatformRole");
        assert_eq!(audit["target_id"],summary.id); assert_eq!(audit["operator_id"],h.user.to_string());
        for key in ["request_id","reason","before_snapshot","metadata"] { assert_eq!(audit[key],Value::Null); }
        assert_eq!(audit["result"],"success");
        assert_eq!(audit["after_snapshot"],json!({"roleKey":h.input("main").role_key.to_utf8_lossy(),"name":"R2B main","isActive":true,"isSystemRole":false,"displayOrder":0}));

        let due = h.resolve(&created.session_token,120).await;
        h.roles().update(&summary.id,no_update(),Some(h.user),due.pending_flush.as_ref()).await.unwrap();
        assert_eq!(h.role(id).await,original); assert_eq!(h.session(created.session.id).await["row_version"],5);
        let non_due = h.resolve(&created.session_token,121).await; assert!(non_due.pending_flush.is_none());
        let session = h.session(created.session.id).await;
        h.roles().activate(&summary.id,activation(),Some(h.user),None).await.unwrap();
        assert_eq!(h.role(id).await,original); assert_eq!(h.session(created.session.id).await,session);
        assert_eq!(h.audits().await.len(),3);

        let due = h.resolve(&created.session_token,180).await;
        h.roles().update(&summary.id,UpdateRole{name:Some(js_string("changed")),description:Field::Null,display_order:Some(7)},Some(h.user),due.pending_flush.as_ref()).await.unwrap();
        let updated = h.role(id).await;
        assert_eq!(updated["name"],"changed"); assert_eq!(updated["display_order"],7); assert_eq!(updated["row_version"],2);
        assert_eq!(updated["created_at"],original["created_at"]); assert_eq!(updated["created_by"],Value::Null); assert_eq!(updated["updated_by"],Value::Null);
        assert_eq!(h.session(created.session.id).await["row_version"],7); assert_eq!(h.audits().await.len(),4);
        let duplicate = h.roles().create(h.input("main"),Some(h.user),None).await.unwrap_err();
        assert!(matches!(duplicate,RolesError::DuplicateKey(_))); assert_eq!(h.audits().await.len(),4);
    }).await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: int4 overflow rolls back the first flush and preserves raw touch"]
async fn business_failure_keeps_only_the_preexisting_raw_session_touch() {
    run_case(|h| async move {
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let due = h.resolve(&created.session_token, 60).await;
        let raw = h.session(created.session.id).await;
        let error = h
            .create("order-overflow", due.pending_flush.as_ref())
            .await
            .unwrap_err();
        assert_eq!(sqlstate(&error), Some("22003"));
        assert!(h.role_id("order-overflow").await.is_none());
        assert_eq!(h.session(created.session.id).await, raw);
        assert_eq!(raw["row_version"], 2);
        assert!(h.audits().await.is_empty());
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: raw UTF16 create commits before separate JSONB audit failure"]
async fn name_and_key_surrogate_audit_failures_preserve_first_flush_rows() {
    run_case(|h| async move {
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        for (index, slot) in ["utf16-name", "utf16-key"].into_iter().enumerate() {
            let due = h
                .resolve(&created.session_token, 60 * (index as i64 + 1))
                .await;
            let error = h
                .create(slot, due.pending_flush.as_ref())
                .await
                .unwrap_err();
            assert_eq!(sqlstate(&error), Some("22P02"));
            let row = h.role(h.role_id(slot).await.unwrap()).await;
            assert_eq!(row["name"], h.input(slot).name.to_utf8_lossy());
            assert_eq!(row["role_key"], h.input(slot).role_key.to_utf8_lossy());
            assert_eq!(row["row_version"], 1);
            assert_eq!(
                h.session(created.session.id).await["row_version"],
                3 + 2 * index as i64
            );
            assert!(h.audits().await.is_empty());
        }
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: original surrogate response and repeated dirty update partial commits"]
async fn description_surrogate_returns_original_code_units_then_each_dirty_update_commits() {
    run_case(|h| async move {
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let due = h.resolve(&created.session_token, 60).await;
        let summary = h
            .create("utf16-description", due.pending_flush.as_ref())
            .await
            .unwrap();
        assert_eq!(summary.description, Some(surrogate("")));
        assert!(
            serde_json::to_string(&summary)
                .unwrap()
                .contains(r#""description":"\ud800""#)
        );
        let id = Uuid::parse_str(&summary.id).unwrap();
        assert_eq!(h.role(id).await["description"], "\u{fffd}");
        assert_eq!(h.audits().await.len(), 1);
        for index in 0..2 {
            let due = h.resolve(&created.session_token, 120 + 60 * index).await;
            let error = h
                .roles()
                .update(
                    &summary.id,
                    UpdateRole {
                        name: None,
                        description: Field::Value(surrogate("")),
                        display_order: None,
                    },
                    Some(h.user),
                    due.pending_flush.as_ref(),
                )
                .await
                .unwrap_err();
            assert_eq!(sqlstate(&error), Some("22P02"));
            let row = h.role(id).await;
            assert_eq!(row["description"], "\u{fffd}");
            assert_eq!(row["row_version"], 2 + index);
            assert_eq!(
                h.session(created.session.id).await["row_version"],
                5 + 2 * index
            );
            assert_eq!(h.audits().await.len(), 1);
        }
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: guard Role snapshot, list null hydration and stale role CAS rollback"]
async fn request_role_snapshot_preserves_early_detail_and_fresh_list_except_nullable_description() {
    run_case(|h| async move {
        sqlx::query("UPDATE poms.role SET description='earlier description' WHERE id=$1").bind(h.actor_role).execute(h.database.pool()).await.unwrap();
        let created = h.auth().create_session_at(h.user,&RequestInfo::default(),now()).await.unwrap();
        let due = h.resolve(&created.session_token,60).await;
        let snapshot = due.role_snapshots.iter().find(|row| row.id==h.actor_role).unwrap();
        let old_name = snapshot.name.clone(); let old_version = snapshot.row_version;
        let fresh_at = sqlx::query_scalar::<_,DateTime<Utc>>("UPDATE poms.role SET name='later committed name',description=NULL,row_version=row_version+1,updated_at=now() WHERE id=$1 RETURNING updated_at")
            .bind(h.actor_role).fetch_one(h.database.pool()).await.unwrap();
        let request = h.roles().for_session(&due);
        let detail = request.get(&h.actor_role.to_string()).await.unwrap();
        assert_eq!(detail.summary.name,js_string(&old_name)); assert_eq!(detail.summary.description,Some(js_string("earlier description")));
        let listed = request.list().await.unwrap().into_iter().find(|row| row.id==h.actor_role.to_string()).unwrap();
        assert_eq!(listed.name,js_string("later committed name")); assert_eq!(listed.description,Some(js_string("earlier description")));
        assert_eq!(listed.updated_at,js_iso_string(fresh_at).unwrap());
        let raw = h.session(created.session.id).await;
        let error = request.update(&h.actor_role.to_string(),UpdateRole{name:Some(js_string("stale overwrite")),description:Field::Missing,display_order:None},Some(h.user),due.pending_flush.as_ref()).await.unwrap_err();
        assert!(matches!(&error,RolesError::Database(_))); assert_eq!(sqlstate(&error),None);
        let current = h.role(h.actor_role).await;
        assert_eq!(current["name"],"later committed name"); assert_eq!(current["description"],Value::Null); assert_eq!(current["row_version"],old_version+1);
        assert_eq!(h.session(created.session.id).await,raw); assert!(h.audits().await.is_empty());
    }).await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: late managed session CAS rolls back a role inserted earlier in the transaction"]
async fn stale_session_flush_rolls_back_the_role_insert_and_skips_audit() {
    run_case(|h| async move {
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let due = h.resolve(&created.session_token, 60).await;
        sqlx::query(
            "UPDATE poms.auth_session SET row_version=row_version+1 WHERE id=$1 AND user_id=$2",
        )
        .bind(created.session.id)
        .bind(h.user)
        .execute(h.database.pool())
        .await
        .unwrap();
        let current = h.session(created.session.id).await;
        let error = h
            .create("session-cas", due.pending_flush.as_ref())
            .await
            .unwrap_err();
        assert!(matches!(&error, RolesError::Database(_)));
        assert_eq!(sqlstate(&error), None);
        assert!(h.role_id("session-cas").await.is_none());
        assert_eq!(h.session(created.session.id).await, current);
        assert!(h.audits().await.is_empty());
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: permission history, audit-only no-op and immediate existing-session permissions"]
async fn permission_replacement_preserves_history_and_changes_existing_sessions_immediately() {
    run_case(|h| async move {
        let summary = h.create("main", None).await.unwrap();
        let id = Uuid::parse_str(&summary.id).unwrap();
        fixture(h.run_id, "role-bind-viewer", Some("main"));
        let admin = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let viewer = h
            .auth()
            .create_session_at(h.viewer, &RequestInfo::default(), now())
            .await
            .unwrap();
        let original_role = h.role(id).await;
        let due = h.resolve(&admin.session_token, 60).await;
        h.roles()
            .assign_permissions(
                &summary.id,
                AssignRolePermissions {
                    permission_keys: vec![
                        PermissionKey::ProjectWrite,
                        PermissionKey::ProjectRead,
                        PermissionKey::ProjectWrite,
                    ],
                },
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        let original_rows = h.permissions(id).await;
        assert_eq!(original_rows.len(), 2);
        let old_write = original_rows
            .iter()
            .find(|row| row["permission_key"] == "project:write")
            .unwrap()
            .clone();
        for row in &original_rows {
            assert_eq!(row["status"], "active");
            assert_eq!(row["assigned_by"], h.user.to_string());
            assert_eq!(row["created_by"], h.user.to_string());
            for key in ["revoked_at", "revoked_by", "change_reason"] {
                assert_eq!(row[key], Value::Null);
            }
        }
        assert_eq!(h.role(id).await, original_role);
        assert_eq!(h.session(admin.session.id).await["row_version"], 3);
        assert_eq!(
            h.audits().await.last().unwrap()["after_snapshot"],
            json!({"permissionKeys":["project:write","project:read"]})
        );
        assert!(
            h.resolve(&viewer.session_token, 1)
                .await
                .user
                .permissions
                .iter()
                .any(|key| key.as_str() == "project:write")
        );

        let due = h.resolve(&admin.session_token, 120).await;
        h.roles()
            .assign_permissions(
                &summary.id,
                AssignRolePermissions {
                    permission_keys: vec![PermissionKey::ProjectRead],
                },
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        let revoked = h.permissions(id).await;
        let old = revoked
            .iter()
            .find(|row| row["id"] == old_write["id"])
            .unwrap();
        assert_eq!(old["status"], "revoked");
        assert_eq!(old["revoked_by"], h.user.to_string());
        for key in [
            "id",
            "assigned_at",
            "assigned_by",
            "created_at",
            "created_by",
            "change_reason",
        ] {
            assert_eq!(old[key], old_write[key]);
        }
        assert!(
            !h.resolve(&viewer.session_token, 2)
                .await
                .user
                .permissions
                .iter()
                .any(|key| key.as_str() == "project:write")
        );
        let due = h.resolve(&admin.session_token, 180).await;
        h.roles()
            .assign_permissions(
                &summary.id,
                AssignRolePermissions {
                    permission_keys: vec![PermissionKey::ProjectRead, PermissionKey::ProjectWrite],
                },
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        let readded = h.permissions(id).await;
        assert_eq!(readded.len(), 3);
        assert_eq!(
            readded
                .iter()
                .find(|row| row["id"] == old_write["id"])
                .unwrap(),
            old
        );
        let active_write = readded
            .iter()
            .find(|row| row["permission_key"] == "project:write" && row["status"] == "active")
            .unwrap();
        assert_ne!(active_write["id"], old_write["id"]);
        assert_eq!(active_write["assigned_by"], h.user.to_string());

        let audit_count = h.audits().await.len();
        let due = h.resolve(&admin.session_token, 240).await;
        h.roles()
            .assign_permissions(
                &summary.id,
                AssignRolePermissions {
                    permission_keys: vec![PermissionKey::ProjectRead, PermissionKey::ProjectWrite],
                },
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        assert_eq!(h.permissions(id).await, readded);
        assert_eq!(h.role(id).await, original_role);
        assert_eq!(h.audits().await.len(), audit_count + 1);
        assert_eq!(h.session(admin.session.id).await["row_version"], 9);
        let due = h.resolve(&admin.session_token, 300).await;
        h.roles()
            .deactivate(
                &summary.id,
                activation(),
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        assert!(
            !h.resolve(&viewer.session_token, 3)
                .await
                .user
                .permissions
                .iter()
                .any(|key| key.as_str() == "project:write")
        );
        let due = h.resolve(&admin.session_token, 360).await;
        h.roles()
            .activate(
                &summary.id,
                activation(),
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        assert!(
            h.resolve(&viewer.session_token, 4)
                .await
                .user
                .permissions
                .iter()
                .any(|key| key.as_str() == "project:write")
        );
        assert_eq!(h.permissions(id).await, readded);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2B PG15: historical raw keys, inactive-user counts and exact known-system minimum boundary"]
async fn historical_permissions_and_unknown_system_role_are_not_silently_filtered_or_protected() {
    run_case(|h| async move {
        let historical = h.create("unicode", None).await.unwrap();
        fixture(h.run_id, "role-insert-historical", Some("unicode"));
        fixture(h.run_id, "role-bind-viewer", Some("unicode"));
        sqlx::query("UPDATE poms.platform_user SET is_active=false WHERE id=$1")
            .bind(h.viewer)
            .execute(h.database.pool())
            .await
            .unwrap();
        let detail = h.roles().get(&historical.id).await.unwrap();
        assert_eq!(detail.assigned_user_count, 1);
        assert_eq!(detail.permission_keys.len(), 7);
        assert!(detail.permission_keys.contains(&"未知:中文".to_owned()));
        assert!(detail.permission_keys.contains(&"𠀀".to_owned()));
        assert!(!detail.permission_keys.contains(&"unknown:old".to_owned()));
        for path in [
            historical.id.clone(),
            historical.id.to_uppercase(),
            historical.id.replace('-', ""),
        ] {
            let alias_detail = h.roles().get(&path).await.unwrap();
            assert_eq!(alias_detail.summary.id, historical.id);
            assert_eq!(
                alias_detail.assigned_user_count,
                i64::from(path == historical.id)
            );
            let previous = h.audits().await;
            h.roles()
                .assign_permissions(
                    &path,
                    AssignRolePermissions {
                        permission_keys: vec![PermissionKey::ProjectRead],
                    },
                    Some(h.user),
                    None,
                )
                .await
                .unwrap();
            let current = h.audits().await;
            let added = current
                .iter()
                .filter(|row| !previous.iter().any(|old| old["id"] == row["id"]))
                .collect::<Vec<_>>();
            assert_eq!(added.len(), 1);
            assert_eq!(added[0]["target_id"], path);
            assert_eq!(added[0]["event_type"], "platform.role.permissions.replaced");
        }
        let unknown = h.create("unknown-system", None).await.unwrap();
        fixture(h.run_id, "role-set-system", Some("unknown-system"));
        let id = Uuid::parse_str(&unknown.id).unwrap();
        let before = h.role(id).await;
        h.roles()
            .assign_permissions(
                &unknown.id,
                AssignRolePermissions {
                    permission_keys: vec![],
                },
                Some(h.user),
                None,
            )
            .await
            .unwrap();
        assert_eq!(h.role(id).await, before);
        assert!(h.permissions(id).await.is_empty());
        h.roles()
            .deactivate(&unknown.id, activation(), Some(h.user), None)
            .await
            .unwrap();
        let after = h.role(id).await;
        assert_eq!(after["is_system_role"], true);
        assert_eq!(after["is_active"], false);
        assert_eq!(after["row_version"], 2);
        let missing = h
            .roles()
            .get("ffffffff-ffff-4fff-8fff-ffffffffffff")
            .await
            .unwrap_err();
        assert!(matches!(missing, RolesError::NotFound(_)));
        let invalid = h.roles().get("invalid-uuid").await.unwrap_err();
        assert_eq!(sqlstate(&invalid), Some("22P02"));
    })
    .await;
}
