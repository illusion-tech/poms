//! Source-bound R2D PG15 acceptance. The fixed fixture owns every target.
//! No PG17, old database, ambient credentials or implicit test target is allowed.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use chrono::{DateTime, TimeDelta, Utc};
use poms_api_rust::{
    auth::{
        model::{RequestInfo, ResolvedSession},
        service::AuthService,
    },
    compat::json::Field,
    config::{AuthConfig, DatabaseConfig},
    database::Database,
    users::{
        model::{
            AssignUserOrgMemberships, AssignUserRoles, CreateUser, UpdateProfile, UpdateUser,
            UserActivation, js_string,
        },
        service::{UsersError, UsersService},
    },
};
use serde_json::{Value, json};
use sqlx::{ConnectOptions, Connection, PgConnection, Row, postgres::PgConnectOptions};
use std::{
    env,
    future::Future,
    io::Write,
    path::Path,
    process::{Command, Stdio},
    str::FromStr,
    time::Duration,
};
use tokio::time::timeout;
use uuid::Uuid;
const ROLE: &str = "poms_r2d_app";
const DATABASE: &str = "poms_r2d_rust";
fn guarded_options(
    url: &str,
    ambient_override: bool,
) -> Result<(PgConnectOptions, String), &'static str> {
    if ambient_override {
        return Err("R2D refuses ambient PostgreSQL or database overrides");
    }
    let password = url
        .strip_prefix("postgres://poms_r2d_app:")
        .and_then(|value| value.strip_suffix("@127.0.0.1:15432/poms_r2d_rust"))
        .filter(|value| {
            value.len() == 64
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        })
        .ok_or("R2D requires its exact new Rust database URL and explicit synthetic secret")?;
    let options = PgConnectOptions::from_str(url).map_err(|_| "invalid controlled R2D URL")?;
    if options.get_host() != "127.0.0.1"
        || options.get_port() != 15432
        || options.get_database() != Some(DATABASE)
        || options.get_username() != ROLE
        || options.get_socket().is_some()
        || options.get_options().is_some()
    {
        return Err("R2D target differs from its frozen isolation boundary");
    }
    Ok((options.disable_statement_logging(), password.to_owned()))
}

async fn target_config() -> Result<DatabaseConfig, &'static str> {
    if env::var("POMS_R2D_DATABASE_TEST").as_deref() != Ok("1") {
        return Err("set explicit POMS_R2D_DATABASE_TEST=1");
    }
    let url = env::var("POMS_R2D_DATABASE_TEST_URL").map_err(|_| "explicit R2D URL is required")?;
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
        .map_err(|_| "R2D metadata connection deadline")?
        .map_err(|_| "R2D metadata connection failed")?;
    // No pool after_connect/SET, fixture or product operation precedes this
    // read-only metadata query. The fixture separately reads marker ec5b...3dec
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
        has_schema_privilege(current_user,'r2d_control','USAGE') AS marker_access \
        FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user")
        .fetch_one(&mut connection)).await.map_err(|_| "R2D metadata guard deadline")?
        .map_err(|_| "R2D metadata guard failed")?;
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
            .map_err(|_| "invalid R2D metadata")?
            != expected
        {
            return Err("R2D PostgreSQL identity mismatch");
        }
    }
    if row
        .try_get::<Option<String>, _>("isolated")
        .map_err(|_| "invalid R2D isolation metadata")?
        .as_deref()
        != Some("on")
    {
        return Err("R2D isolation marker GUC mismatch");
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
            .map_err(|_| "invalid R2D privilege metadata")?
        {
            return Err("R2D runtime role has elevated privileges");
        }
    }
    if row
        .try_get::<i32, _>("role_memberships")
        .map_err(|_| "invalid R2D memberships")?
        != 0
    {
        return Err("R2D runtime role has memberships");
    }
    timeout(Duration::from_secs(5), connection.close())
        .await
        .map_err(|_| "R2D metadata close deadline")?
        .map_err(|_| "R2D metadata close failed")?;
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

fn fixture(run_id: Uuid, action: &str, user_slot: Option<&str>) -> Value {
    fixture_variant(run_id, action, user_slot, None, None)
}

fn fixture_variant(
    run_id: Uuid,
    action: &str,
    user_slot: Option<&str>,
    time_case: Option<&str>,
    role_slot: Option<&str>,
) -> Value {
    assert!(matches!(
        action,
        "prepare"
            | "cleanup"
            | "facts"
            | "user-plan"
            | "user-adopt"
            | "user-profile-null"
            | "user-profile-values"
            | "user-profile-verified"
            | "user-profile-unverified"
            | "user-nullable-null-no-version"
            | "user-nullable-values-no-version"
            | "user-role-matrix"
            | "user-membership-matrix"
            | "user-created-at"
            | "user-set-inactive"
            | "user-membership-without-active-primary"
            | "role-duplicate-names"
            | "role-set-inactive"
    ));
    if let Some(time_case) = time_case {
        assert_eq!(action, "user-created-at");
        assert!(matches!(
            time_case,
            "micro-low" | "micro-high" | "tie-first" | "tie-second"
        ));
    }
    if let Some(role_slot) = role_slot {
        assert!(matches!(
            action,
            "role-duplicate-names" | "role-set-inactive"
        ));
        assert_eq!(role_slot, "alpha");
    }
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap();
    let mut command = Command::new("node");
    command
        .arg(root.join("tools/rust-r2d/fixture-cli.mjs"))
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
    let mut child = command.spawn().expect("fixed guarded R2D fixture");
    let mut request =
        json!({"formatVersion":1,"runId":run_id,"backend":"rust","action":action,"account":"none"});
    if let Some(slot) = user_slot {
        request["userSlot"] = slot.into();
    }
    if let Some(value) = time_case {
        request["timeCase"] = value.into();
    }
    if let Some(value) = role_slot {
        request["roleSlot"] = value.into();
    }
    child
        .stdin
        .take()
        .unwrap()
        .write_all(request.to_string().as_bytes())
        .unwrap();
    let result = child.wait_with_output().unwrap();
    assert!(
        result.status.success(),
        "R2D fixture refused run {run_id}; retain recovery journal"
    );
    assert!(result.stdout.len() <= 2 * 1024 * 1024);
    let value: Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(value["formatVersion"], 1);
    assert_eq!(value["runId"], run_id.to_string());
    assert_eq!(value["backend"], "rust");
    assert_eq!(value["action"], action);
    assert!(value["matched"].as_u64().is_some() && value["changed"].as_u64().is_some());
    value
}

#[derive(Clone)]
struct Harness {
    database: Database,
    run_id: Uuid,
    at: DateTime<Utc>,
}
impl Harness {
    fn users(&self) -> UsersService {
        UsersService::new(self.database.clone())
    }
    fn facts(&self) -> Value {
        fixture(self.run_id, "facts", None)["facts"].clone()
    }
    fn account(&self, name: &str) -> Uuid {
        let username = format!("r2d_{name}_{}", self.run_id.simple());
        let facts = self.facts();
        Uuid::parse_str(
            facts["platform_user"]
                .as_array()
                .unwrap()
                .iter()
                .find(|row| row["username"] == username)
                .unwrap()["id"]
                .as_str()
                .unwrap(),
        )
        .unwrap()
    }
    fn role(&self, slot: &str) -> String {
        let key = format!("r2d_roles_{slot}_{}", self.run_id);
        let facts = self.facts();
        facts["role"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["role_key"] == key)
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .into()
    }
    fn org(&self, slot: &str) -> String {
        let code = format!("r2d_orgs_{slot}_{}", self.run_id);
        let facts = self.facts();
        facts["org_unit"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["code"] == code)
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .into()
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
                jwt_secret: "public-r2d-pg-acceptance-only".into(),
                secret_key: None,
            },
        )
    }
    async fn session(&self, due: bool) -> ResolvedSession {
        let auth = self.auth();
        let created = auth
            .create_session_at(self.account("admin"), &RequestInfo::default(), self.at)
            .await
            .unwrap();
        auth.resolve_session_token_at(
            &created.session_token,
            &RequestInfo::default(),
            self.at + TimeDelta::seconds(if due { 60 } else { 0 }),
        )
        .await
        .unwrap()
    }
    fn input(&self, slot: &str) -> CreateUser {
        CreateUser {
            username: js_string(&format!("r2d_{slot}_{}", self.run_id.simple())),
            display_name: js_string(&format!("R2D {slot} {}", &self.run_id.to_string()[..8])),
            email: Field::Missing,
            phone: Field::Missing,
            primary_org_unit_id: None,
            initial_role_ids: Vec::new(),
        }
    }
    async fn create(&self, slot: &str, session: &ResolvedSession) -> String {
        fixture(self.run_id, "user-plan", Some(slot));
        let result = self.users().create(self.input(slot), session).await;
        fixture(self.run_id, "user-adopt", Some(slot));
        let entity: Value = serde_json::from_str(result.unwrap().0.get()).unwrap();
        entity["id"].as_str().unwrap().into()
    }
    fn row(&self, id: &str) -> Value {
        self.facts()["platform_user"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["id"] == id)
            .unwrap()
            .clone()
    }
    fn audits(&self, id: &str) -> Vec<Value> {
        self.facts()["audit_log"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|row| row["target_id"] == id)
            .cloned()
            .collect()
    }
    fn relations(&self, table: &str, id: &str) -> Vec<Value> {
        self.facts()[table]
            .as_array()
            .unwrap()
            .iter()
            .filter(|row| row["user_id"] == id)
            .cloned()
            .collect()
    }
    fn session_row(&self, session: &ResolvedSession) -> Value {
        self.facts()["auth_session"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["id"] == session.session.id.to_string())
            .unwrap()
            .clone()
    }
}

async fn run_case<F, Fut>(case: F)
where
    F: FnOnce(Harness) -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    let config = target_config()
        .await
        .expect("R2D target guard refused before fixture writes");
    let database = Database::new(&config).await.unwrap();
    let run_id = sqlx::query_scalar("SELECT gen_random_uuid()")
        .fetch_one(database.pool())
        .await
        .unwrap();
    let h = Harness {
        database,
        run_id,
        at: DateTime::from_timestamp_millis(Utc::now().timestamp_millis()).unwrap(),
    };
    println!(
        "{}",
        json!({"kind":"r2d-service-pg-run","runId":run_id,"state":"preparing"})
    );
    let owned = h.clone();
    let result = tokio::spawn(async move {
        fixture(run_id, "prepare", None);
        case(owned).await;
    })
    .await;
    // Even an assertion or failed prepare attempts guarded recovery and a
    // second zero scan; no test-created relation bypasses the fixture journal.
    fixture(run_id, "cleanup", None);
    let zero = fixture(run_id, "cleanup", None);
    assert_eq!(
        [zero["matched"].as_u64(), zero["changed"].as_u64()],
        [Some(0), Some(0)]
    );
    h.database.close(Duration::from_secs(5)).await.unwrap();
    println!(
        "{}",
        json!({"kind":"r2d-service-pg-run","runId":run_id,"state":"cleaned","matched":0,"changed":0})
    );
    result.expect("R2D case failed after cleanup and independent second-zero check");
}

fn sqlstate(error: &UsersError) -> Option<&str> {
    match error {
        UsersError::Database(error) => error.sqlstate(),
        _ => None,
    }
}

async fn blocked_user_updates(database: &Database, holder: i32, expected: i64) -> bool {
    let wait = async {
        loop {
            let count: i64 = sqlx::query_scalar(
                "WITH RECURSIVE blocked(pid) AS (\
                 SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) \
                 UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid))) \
                 SELECT count(*) FROM blocked b JOIN pg_stat_activity a USING(pid) \
                 WHERE a.datname=current_database() AND a.usename=current_user AND a.state='active' \
                 AND a.wait_event_type='Lock' AND a.query LIKE 'UPDATE poms.platform_user SET%'",
            ).bind(holder).fetch_one(database.pool()).await?;
            if count == expected {
                return Ok::<_, sqlx::Error>(true);
            }
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    };
    timeout(Duration::from_secs(2), wait)
        .await
        .ok()
        .and_then(Result::ok)
        .unwrap_or(false)
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W14 dirty CAS and weak no-op/same-primary windows using owned test-only row locks"]
async fn concurrent_commands_keep_managed_cas_and_do_not_strengthen_noop_windows() {
    run_case(|h| async move {
        for (index, toggle) in [false, true].into_iter().enumerate() {
            let id = h.create(&format!("u{index:03}"), &h.session(false).await).await;
            let before = h.row(&id); let count = h.audits(&id).len();
            let first_session = h.session(false).await; let second_session = h.session(false).await;
            let mut held = h.database.pool().acquire().await.unwrap();
            let mut lock = held.begin().await.unwrap();
            let holder: i32 = sqlx::query_scalar("SELECT pg_backend_pid()").fetch_one(&mut *lock).await.unwrap();
            sqlx::query("SELECT id FROM poms.platform_user WHERE id=$1::text::uuid FOR NO KEY UPDATE").bind(&id).fetch_one(&mut *lock).await.unwrap();
            let first_service = h.users(); let first_id = id.clone();
            let first = tokio::spawn(async move { first_service.update(&first_id, UpdateUser { display_name: Some(js_string("first concurrent name")), ..UpdateUser::default() }, &first_session).await.map(|_| ()) });
            let second_service = h.users(); let second_id = id.clone();
            let second = tokio::spawn(async move {
                if toggle { second_service.deactivate(&second_id, UserActivation::default(), &second_session).await.map(|_| ()) }
                else { second_service.update(&second_id, UpdateUser { display_name: Some(js_string("second concurrent name")), ..UpdateUser::default() }, &second_session).await.map(|_| ()) }
            });
            let blocked = blocked_user_updates(&h.database, holder, 2).await;
            lock.rollback().await.unwrap(); drop(held);
            let results = [first.await.unwrap(), second.await.unwrap()];
            assert!(blocked, "Both real updates must wait on the exact owned lock dependency chain before release");
            assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
            let error = results.iter().find_map(|result| result.as_ref().err()).unwrap();
            assert!(matches!(error, UsersError::Database(_))); assert_eq!(sqlstate(error), None);
            assert_eq!(h.row(&id)["row_version"].as_i64().unwrap(), before["row_version"].as_i64().unwrap() + 1);
            assert_eq!(h.audits(&id).len(), count + 1);
        }
        for (index, memberships) in [false, true].into_iter().enumerate() {
            let id = h.create(&format!("u{:03}", index + 2), &h.session(false).await).await;
            let viewer = h.org("viewer"); let alpha = h.org("alpha");
            if memberships { h.users().assign_org_memberships(&id, AssignUserOrgMemberships { primary_org_unit_id: viewer.clone(), secondary_org_unit_ids: vec![], reason: None, expected_version: None }, &h.session(false).await).await.unwrap(); }
            let before = h.row(&id); let count = h.audits(&id).len();
            let dirty_session = h.session(false).await; let weak_session = h.session(false).await;
            let mut held = h.database.pool().acquire().await.unwrap();
            let mut lock = held.begin().await.unwrap();
            let holder: i32 = sqlx::query_scalar("SELECT pg_backend_pid()").fetch_one(&mut *lock).await.unwrap();
            sqlx::query("SELECT id FROM poms.platform_user WHERE id=$1::text::uuid FOR NO KEY UPDATE").bind(&id).fetch_one(&mut *lock).await.unwrap();
            let service = h.users(); let target = id.clone();
            let dirty = tokio::spawn(async move { service.update(&target, UpdateUser { display_name: Some(js_string("dirty update after weak command")), ..UpdateUser::default() }, &dirty_session).await });
            let blocked = blocked_user_updates(&h.database, holder, 1).await;
            let service = h.users(); let target = id.clone();
            let mut weak = tokio::spawn(async move {
                if memberships { service.assign_org_memberships(&target, AssignUserOrgMemberships { primary_org_unit_id: viewer, secondary_org_unit_ids: vec![alpha], reason: None, expected_version: None }, &weak_session).await.map(|_| ()) }
                else { service.update(&target, UpdateUser::default(), &weak_session).await.map(|_| ()) }
            });
            let early = timeout(Duration::from_secs(1), &mut weak).await;
            lock.rollback().await.unwrap(); drop(held);
            let completed_before_release = early.is_ok();
            match early { Ok(result) => result.unwrap().unwrap(), Err(_) => weak.await.unwrap().unwrap() };
            dirty.await.unwrap().unwrap();
            assert!(blocked && completed_before_release, "No-op and same-primary membership save must complete without waiting for a user CAS lock");
            assert_eq!(h.row(&id)["row_version"].as_i64().unwrap(), before["row_version"].as_i64().unwrap() + 1);
            assert_eq!(h.row(&id)["display_name"], "dirty update after weak command"); assert_eq!(h.audits(&id).len(), count + 2);
            if memberships { assert_eq!(h.relations("user_org_membership", &id).len(), 2); assert_eq!(h.row(&id)["primary_org_unit_id"], h.org("viewer")); }
        }
        // These are PostgreSQL lock-controlled Rust service checks. Original
        // Nest W14 used exact driver-call barriers; neither proves a universal
        // scheduler outcome for arbitrary traffic. Product SQL adds no locks.
    }).await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W15 microsecond sort keys, ties, inactive candidates and duplicate role names"]
async fn owner_and_user_projections_preserve_microseconds_fallback_and_unknown_memberships() {
    run_case(|h| async move {
        let mut ids = Vec::new();
        for (index, case) in ["micro-low", "micro-high", "tie-first", "tie-second"]
            .into_iter()
            .enumerate()
        {
            let slot = format!("u{index:03}");
            let id = h.create(&slot, &h.session(false).await).await;
            fixture_variant(h.run_id, "user-created-at", Some(&slot), Some(case), None);
            ids.push(id);
        }
        let list = h.users().list(&h.session(false).await).await.unwrap();
        let ordered = list
            .iter()
            .filter(|user| ids.contains(&user.id))
            .collect::<Vec<_>>();
        assert_eq!(ordered.len(), 4);
        assert_eq!(ordered[0].id, ids[1]);
        assert_eq!(ordered[3].id, ids[0]);
        let mut tied = [ordered[1].id.clone(), ordered[2].id.clone()];
        tied.sort();
        let mut expected = [ids[2].clone(), ids[3].clone()];
        expected.sort();
        assert_eq!(tied, expected);
        assert!(
            ordered
                .iter()
                .all(|user| user.created_at == "2020-01-02T00:00:00.123Z")
        );
        let id = h.create("u004", &h.session(false).await).await;
        for action in [
            "user-profile-values",
            "user-role-matrix",
            "user-membership-matrix",
        ] {
            fixture(h.run_id, action, Some("u004"));
        }
        fixture_variant(h.run_id, "role-duplicate-names", None, None, Some("alpha"));
        let detail = h.users().get(&id, &h.session(false).await).await.unwrap();
        assert_eq!(detail.summary.role_names.len(), 2);
        assert_eq!(detail.summary.role_names[0], detail.summary.role_names[1]);
        assert_eq!(detail.summary.primary_org_unit_id, Some(h.org("viewer")));
        assert_eq!(h.row(&id)["primary_org_unit_id"], h.org("alpha"));
        assert_eq!(detail.org_units.len(), 3);
        assert!(
            detail
                .org_units
                .iter()
                .any(|org| org.membership_type == "unexpected")
        );
        fixture(
            h.run_id,
            "user-membership-without-active-primary",
            Some("u004"),
        );
        fixture(h.run_id, "user-set-inactive", Some("u004"));
        fixture_variant(h.run_id, "role-set-inactive", None, None, Some("alpha"));
        let detail = h.users().get(&id, &h.session(false).await).await.unwrap();
        assert!(!detail.summary.is_active);
        assert_eq!(detail.summary.primary_org_unit_id, Some(h.org("alpha")));
        assert_eq!(detail.summary.role_names.len(), 1);
        assert_eq!(detail.org_units.len(), 2);
        assert!(
            detail
                .org_units
                .iter()
                .all(|org| org.membership_type != "primary")
        );
        assert!(
            detail
                .org_units
                .iter()
                .any(|org| org.id == h.org("inactive"))
        );
        let owner = h
            .users()
            .owner_reference(&h.session(false).await)
            .await
            .unwrap();
        let user = owner.users.iter().find(|user| user.id == id).unwrap();
        assert!(!user.is_active);
        assert_eq!(user.primary_org_unit_id, Some(h.org("alpha")));
        assert!(
            owner
                .org_units
                .iter()
                .any(|org| org.id == h.org("inactive") && !org.is_active)
        );
        let raw = serde_json::to_value(user).unwrap();
        assert_eq!(raw.as_object().unwrap().len(), 5);
        assert!(
            h.users()
                .list(&h.session(false).await)
                .await
                .unwrap()
                .iter()
                .any(|user| user.id == id && !user.is_active)
        );
        // Exact-time ties have no additional ID ordering rule. Relationship
        // sequence remains the original un-ordered SELECT result; no invented
        // cross-database universal order is asserted here.
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: complete W06 observations from retained failed remaining01 report"]
async fn encoding_failures_preserve_the_two_distinct_flush_boundaries() {
    run_case(|h| async move {
        for (index, due) in [false, true].into_iter().enumerate() {
            let id = h.create(&format!("u{index:03}"), &h.session(false).await).await;
            let before = h.row(&id);
            let session = h.session(due).await;
            let raw_session = h.session_row(&session);
            let count = h.audits(&id).len();
            let lone = poms_api_rust::auth::js_json::JsString::from_code_units("R2D lone ".encode_utf16().chain([0xd800]).collect());
            let error = h.users().update(&id, UpdateUser { display_name: Some(lone), ..UpdateUser::default() }, &session).await.unwrap_err();
            assert_eq!(sqlstate(&error), Some("22P02"));
            let persisted = h.row(&id);
            assert_eq!(persisted["display_name"], "R2D lone \u{fffd}");
            assert_eq!(persisted["row_version"].as_i64().unwrap(), before["row_version"].as_i64().unwrap() + 1);
            assert_eq!(h.audits(&id).len(), count);
            assert_eq!(h.session_row(&session)["row_version"].as_i64().unwrap(), raw_session["row_version"].as_i64().unwrap() + i64::from(due));
            let session = h.session(due).await;
            let raw_session = h.session_row(&session);
            let error = h.users().update(&id, UpdateUser { display_name: Some(js_string("R2D nul \0")), ..UpdateUser::default() }, &session).await.unwrap_err();
            assert!(matches!(&error, UsersError::Database(_)));
            assert_eq!(h.row(&id), persisted); assert_eq!(h.session_row(&session), raw_session);
            assert_eq!(h.audits(&id).len(), count);
            // The original pg driver emitted 08P01 on its first user UPDATE.
            // Record SQLx's actual internal code separately; the HTTP/error and
            // unchanged durable-state boundary are what this acceptance proves.
            println!("{}", json!({"kind":"r2d-nul-driver-boundary","runId":h.run_id,"originalSqlstate":"08P01","rustSqlstate":sqlstate(&error)}));
        }
    }).await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: complete W12 observations, pending session CAS rollback after split deletes"]
async fn pending_session_cas_rolls_back_business_but_does_not_restore_native_deleted_history() {
    run_case(|h| async move {
        let id = h.create("u000", &h.session(false).await).await;
        for shape in ["dirty", "noop", "roles-empty", "org"] {
            if shape == "roles-empty" {
                fixture(h.run_id, "user-role-matrix", Some("u000"));
            }
            if shape == "org" {
                h.users()
                    .assign_org_memberships(
                        &id,
                        AssignUserOrgMemberships {
                            primary_org_unit_id: h.org("viewer"),
                            secondary_org_unit_ids: vec![],
                            reason: None,
                            expected_version: None,
                        },
                        &h.session(false).await,
                    )
                    .await
                    .unwrap();
                fixture(h.run_id, "user-membership-matrix", Some("u000"));
            }
            let row = h.row(&id);
            let audits = h.audits(&id).len();
            let session = h.session(true).await;
            let affected = sqlx::query(
                "UPDATE poms.auth_session SET row_version=row_version+1 WHERE id=$1 AND user_id=$2",
            )
            .bind(session.session.id)
            .bind(h.account("admin"))
            .execute(h.database.pool())
            .await
            .unwrap()
            .rows_affected();
            assert_eq!(affected, 1);
            let session_before = h.session_row(&session);
            let result = match shape {
                "dirty" => h
                    .users()
                    .update(
                        &id,
                        UpdateUser {
                            display_name: Some(js_string("must roll back")),
                            ..UpdateUser::default()
                        },
                        &session,
                    )
                    .await
                    .map(|_| ()),
                "noop" => h
                    .users()
                    .update(&id, UpdateUser::default(), &session)
                    .await
                    .map(|_| ()),
                "roles-empty" => h
                    .users()
                    .assign_roles(&id, AssignUserRoles::default(), &session)
                    .await
                    .map(|_| ()),
                "org" => h
                    .users()
                    .assign_org_memberships(
                        &id,
                        AssignUserOrgMemberships {
                            primary_org_unit_id: h.org("alpha"),
                            secondary_org_unit_ids: vec![],
                            reason: None,
                            expected_version: None,
                        },
                        &session,
                    )
                    .await
                    .map(|_| ()),
                _ => unreachable!(),
            };
            let error = result.unwrap_err();
            assert!(matches!(&error, UsersError::Database(_)));
            assert_eq!(sqlstate(&error), None);
            assert_eq!(h.row(&id), row);
            assert_eq!(h.session_row(&session), session_before);
            assert_eq!(h.audits(&id).len(), audits);
            if shape == "roles-empty" {
                assert!(h.relations("user_role_assignment", &id).is_empty());
            }
            if shape == "org" {
                assert!(h.relations("user_org_membership", &id).is_empty());
            }
        }
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W10 PostgreSQL UUID aliases remain distinct from strict JS reference maps"]
async fn path_aliases_preserve_raw_audit_identity_and_body_aliases_fail_before_delete() {
    run_case(|h| async move {
        let id = h.create("u000", &h.session(false).await).await;
        fixture(h.run_id, "user-role-matrix", Some("u000"));
        let upper = id.to_uppercase();
        let role = h.role("alpha");
        let profile = h
            .users()
            .assign_roles(
                &upper,
                AssignUserRoles {
                    role_ids: vec![role.clone()],
                    ..AssignUserRoles::default()
                },
                &h.session(false).await,
            )
            .await
            .unwrap();
        assert_eq!(profile.id, id);
        let audit = h
            .audits(&upper)
            .into_iter()
            .find(|row| row["event_type"] == "platform.user.roles.replaced")
            .unwrap();
        assert_eq!(audit["before_snapshot"], json!({"roleIds":[]}));
        assert_eq!(audit["target_id"], upper);
        let rows = h.relations("user_role_assignment", &id);
        let error = h
            .users()
            .assign_roles(
                &id,
                AssignUserRoles {
                    role_ids: vec![role.to_uppercase()],
                    ..AssignUserRoles::default()
                },
                &h.session(false).await,
            )
            .await
            .unwrap_err();
        assert!(matches!(error, UsersError::NotFound(_)));
        assert_eq!(h.relations("user_role_assignment", &id), rows);
        fixture(h.run_id, "user-membership-matrix", Some("u000"));
        let compact = id.replace('-', "");
        let primary = h.org("alpha");
        h.users()
            .assign_org_memberships(
                &compact,
                AssignUserOrgMemberships {
                    primary_org_unit_id: primary.clone(),
                    secondary_org_unit_ids: vec![],
                    reason: None,
                    expected_version: None,
                },
                &h.session(false).await,
            )
            .await
            .unwrap();
        let audit = h
            .audits(&compact)
            .into_iter()
            .find(|row| row["event_type"] == "platform.user.org-memberships.replaced")
            .unwrap();
        assert_eq!(audit["before_snapshot"], json!({"memberships":[]}));
        let rows = h.relations("user_org_membership", &id);
        let error = h
            .users()
            .assign_org_memberships(
                &id,
                AssignUserOrgMemberships {
                    primary_org_unit_id: primary.to_uppercase(),
                    secondary_org_unit_ids: vec![],
                    reason: None,
                    expected_version: None,
                },
                &h.session(false).await,
            )
            .await
            .unwrap_err();
        assert!(matches!(error, UsersError::NotFound(_)));
        assert_eq!(h.relations("user_org_membership", &id), rows);
        let error = h
            .users()
            .update("not-a-uuid", UpdateUser::default(), &h.session(false).await)
            .await
            .unwrap_err();
        assert_eq!(sqlstate(&error), Some("22P02"));
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W11 two pre-existing sessions and permission refresh at next authorization"]
async fn reactivation_does_not_revive_used_revoked_session_and_roles_refresh_on_next_request() {
    run_case(|h| async move {
        let auth = h.auth();
        let viewer = h.account("viewer");
        let used = auth
            .create_session_at(viewer, &RequestInfo::default(), h.at)
            .await
            .unwrap();
        let unused = auth
            .create_session_at(viewer, &RequestInfo::default(), h.at)
            .await
            .unwrap();
        h.users()
            .deactivate(
                &viewer.to_string(),
                UserActivation::default(),
                &h.session(false).await,
            )
            .await
            .unwrap();
        let error = auth
            .resolve_session_token_at(
                &used.session_token,
                &RequestInfo::default(),
                h.at + TimeDelta::seconds(1),
            )
            .await
            .unwrap_err();
        assert_eq!(
            error.code(),
            Some(poms_api_rust::shared::generated::AuthSessionErrorCode::AccountDisabled)
        );
        h.users()
            .activate(
                &viewer.to_string(),
                UserActivation::default(),
                &h.session(false).await,
            )
            .await
            .unwrap();
        let untouched = auth
            .resolve_session_token_at(
                &unused.session_token,
                &RequestInfo::default(),
                h.at + TimeDelta::seconds(2),
            )
            .await
            .unwrap();
        assert_eq!(
            h.users().profile(&untouched).await.unwrap().id,
            viewer.to_string()
        );
        let error = auth
            .resolve_session_token_at(
                &used.session_token,
                &RequestInfo::default(),
                h.at + TimeDelta::seconds(3),
            )
            .await
            .unwrap_err();
        assert_eq!(
            error.code(),
            Some(poms_api_rust::shared::generated::AuthSessionErrorCode::SessionRevoked)
        );
        let actor = h.session(false).await;
        assert!(
            actor
                .user
                .permissions
                .iter()
                .any(|permission| permission.as_str() == "platform:users:manage")
        );
        let response = h
            .users()
            .assign_roles(
                &h.account("admin").to_string(),
                AssignUserRoles {
                    role_ids: vec![h.role("viewer")],
                    ..AssignUserRoles::default()
                },
                &actor,
            )
            .await
            .unwrap();
        assert!(response.permissions.is_empty());
        let next = h.session(false).await;
        assert!(
            !next
                .user
                .permissions
                .iter()
                .any(|permission| permission.as_str() == "platform:users:manage")
        );
        assert_eq!(
            h.users().profile(&next).await.unwrap().permissions,
            vec!["nav:dashboard:view"]
        );
        // HTTP 403/security-event behavior stays in the real handler matrix.
    })
    .await;
}

#[test]
fn r2d_target_guard_refuses_pg17_old_databases_owner_and_ambient_before_io() {
    let password = "a".repeat(64);
    let valid = format!("postgres://poms_r2d_app:{password}@127.0.0.1:15432/poms_r2d_rust");
    assert!(guarded_options(&valid, false).is_ok());
    assert!(guarded_options(&valid, true).is_err());
    for bad in [
        valid.replace(":15432/", ":5432/"),
        valid.replace("poms_r2d_rust", "poms_r2d_nest"),
        valid.replace("poms_r2d_rust", "poms_r2c_rust"),
        valid.replace("poms_r2d_rust", "poms_r2b_rust"),
        valid.replace("poms_r2d_rust", "poms_r2a_rust"),
        valid.replace("poms_r2d_app:", "poms_r0e_owner:"),
        valid.replace("127.0.0.1", "localhost"),
        format!("{valid}?options=-crole%3Downer"),
        format!("{valid}#fragment"),
        valid.replace(&password, "implicit"),
    ] {
        assert!(guarded_options(&bad, false).is_err());
    }
}

#[tokio::test]
#[ignore = "explicit R2D PG15: original W01 seven shapes, with non-due and due first flush"]
async fn create_preserves_generated_id_child_failure_and_session_flush_order() {
    run_case(|h| async move {
        let credentials = h.facts()["local_credential"].clone();
        for due in [false, true] {
            for shape in 0..7 {
                let slot = format!("u{:03}", shape + if due { 7 } else { 0 });
                fixture(h.run_id, "user-plan", Some(&slot));
                let session = h.session(due).await;
                let session_before = h.session_row(&session);
                let audits_before = h.facts()["audit_log"].as_array().unwrap().len();
                let mut input = h.input(&slot);
                if shape == 1 || shape == 3 {
                    input.primary_org_unit_id = Some(h.org("alpha"));
                }
                input.initial_role_ids = match shape {
                    2 | 3 => vec![h.role("alpha")],
                    4 => vec![h.role("inactive")],
                    5 => vec![Uuid::nil().to_string()],
                    6 => vec![h.role("alpha"), h.role("alpha")],
                    _ => vec![],
                };
                let result = h.users().create(input, &session).await;
                fixture(h.run_id, "user-adopt", Some(&slot));
                let facts = h.facts();
                let username = h.input(&slot).username.to_utf8_lossy();
                let row = facts["platform_user"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|row| row["username"] == username);
                if shape == 0 {
                    let raw: Value = serde_json::from_str(result.unwrap().0.get()).unwrap();
                    assert_eq!(raw.as_object().unwrap().len(), 16);
                    assert_eq!(raw["rowVersion"], 1);
                    assert_eq!(raw["isActive"], true);
                    assert_eq!(raw["emailVerified"], false);
                    assert_eq!(raw["phoneVerified"], false);
                    for field in [
                        "email",
                        "phone",
                        "avatarUrl",
                        "primaryOrgUnitId",
                        "lastLoginAt",
                        "createdBy",
                        "updatedBy",
                    ] {
                        assert!(raw[field].is_null());
                    }
                    let id = row.unwrap()["id"].as_str().unwrap();
                    assert_eq!(raw["id"], id);
                    assert!(h.relations("local_credential", id).is_empty());
                    assert!(h.relations("user_role_assignment", id).is_empty());
                    assert!(h.relations("user_org_membership", id).is_empty());
                    assert_eq!(h.audits(id).len(), 1);
                    assert_eq!(
                        h.session_row(&session)["row_version"].as_i64().unwrap(),
                        session_before["row_version"].as_i64().unwrap() + i64::from(due)
                    );
                    let duplicate_session = h.session(true).await;
                    assert!(matches!(
                        h.users().create(h.input(&slot), &duplicate_session).await,
                        Err(UsersError::Conflict(_))
                    ));
                } else {
                    let error = result.unwrap_err();
                    assert!(matches!(error, UsersError::Database(_)));
                    assert_eq!(sqlstate(&error), None);
                    assert!(row.is_none());
                    assert_eq!(h.session_row(&session), session_before);
                    assert_eq!(facts["audit_log"].as_array().unwrap().len(), audits_before);
                }
                assert_eq!(h.facts()["local_credential"], credentials);
            }
        }
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W02 dirty/no-op patches, contact verification and overflow rollback"]
async fn profile_patch_preserves_noops_verified_resets_audits_and_overflow() {
    run_case(|h| async move {
        let id = h.create("u000", &h.session(false).await).await;
        fixture(h.run_id, "user-profile-values", Some("u000"));
        fixture(h.run_id, "user-profile-verified", Some("u000"));
        let original = h.row(&id);
        let noop = h.session(true).await;
        h.users().update(&id, UpdateUser::default(), &noop).await.unwrap();
        assert_eq!(h.row(&id), original);
        assert_eq!(h.session_row(&noop)["row_version"].as_i64().unwrap(), noop.session.row_version as i64 + 1);
        let audit = h.audits(&id).into_iter().find(|row| row["event_type"] == "platform.user.updated").unwrap();
        assert_eq!(audit["metadata"], json!({"changedFields":[]})); assert_eq!(audit["before_snapshot"], audit["after_snapshot"]);
        let changed = h.session(true).await;
        h.users().update(&id, UpdateUser { display_name: Some(js_string("changed name")), email: Field::Value(js_string("new@example.test")),
            phone: Field::Value(js_string("999")), avatar_url: Field::Null }, &changed).await.unwrap();
        let row = h.row(&id);
        assert_eq!(row["row_version"].as_i64().unwrap(), original["row_version"].as_i64().unwrap() + 1);
        assert_eq!(row["email_verified"], false); assert_eq!(row["phone_verified"], false); assert!(row["avatar_url"].is_null());
        let audit = h.audits(&id).into_iter().find(|row| row["after_snapshot"]["displayName"] == "changed name").unwrap();
        assert_eq!(audit["metadata"], json!({"changedFields":["displayName","email","emailVerified","phone","phoneVerified","avatarUrl"]}));
        let failed = h.session(true).await;
        let session_before = h.session_row(&failed);
        let count = h.audits(&id).len();
        let error = h.users().update(&id, UpdateUser { avatar_url: Field::Value(js_string(&"a".repeat(2048))), ..UpdateUser::default() }, &failed).await.unwrap_err();
        assert_eq!(sqlstate(&error), Some("22001")); assert_eq!(h.row(&id), row);
        assert_eq!(h.session_row(&failed), session_before); assert_eq!(h.audits(&id).len(), count);
        let clear = h.session(false).await;
        let detail = h.users().update(&id, UpdateUser { email: Field::Null, phone: Field::Null, ..UpdateUser::default() }, &clear).await.unwrap();
        assert!(detail.summary.email.is_none() && detail.summary.phone.is_none());
        assert!(h.row(&id)["email"].is_null() && h.row(&id)["phone"].is_null());
    }).await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W04/W05 nativeDelete history and failed duplicate replacement"]
async fn replacements_preserve_history_delete_commits_and_membership_projection() {
    run_case(|h| async move {
        let id = h.create("u000", &h.session(false).await).await;
        fixture(h.run_id, "user-role-matrix", Some("u000"));
        let original = h.row(&id);
        let before = h.relations("user_role_assignment", &id);
        assert_eq!(before.len(), 4);
        let due = h.session(true).await;
        let session_before = h.session_row(&due);
        let count = h.audits(&id).len();
        let role_id = h.role("alpha");
        let error = h
            .users()
            .assign_roles(
                &id,
                AssignUserRoles {
                    role_ids: vec![role_id.clone(), role_id.clone()],
                    ..AssignUserRoles::default()
                },
                &due,
            )
            .await
            .unwrap_err();
        assert_eq!(sqlstate(&error), Some("23505"));
        assert!(h.relations("user_role_assignment", &id).is_empty());
        assert_eq!(h.row(&id), original);
        assert_eq!(h.session_row(&due), session_before);
        assert_eq!(h.audits(&id).len(), count);
        let profile = h
            .users()
            .assign_roles(
                &id,
                AssignUserRoles {
                    role_ids: vec![role_id.clone()],
                    ..AssignUserRoles::default()
                },
                &h.session(false).await,
            )
            .await
            .unwrap();
        assert!(profile.permissions.is_empty());
        assert_eq!(profile.roles.len(), 1);
        let relations = h.relations("user_role_assignment", &id);
        assert_eq!(relations.len(), 1);
        assert_eq!(relations[0]["role_id"], role_id);
        for field in [
            "assigned_by",
            "created_by",
            "revoked_at",
            "revoked_by",
            "change_reason",
        ] {
            assert!(relations[0][field].is_null());
        }
        fixture(h.run_id, "user-membership-matrix", Some("u000"));
        let detail = h.users().get(&id, &h.session(false).await).await.unwrap();
        assert_eq!(detail.org_units.len(), 3);
        assert!(
            detail
                .org_units
                .iter()
                .any(|org| org.membership_type == "unexpected")
        );
        assert!(
            detail
                .org_units
                .iter()
                .any(|org| org.id == h.org("inactive"))
        );
        let replaced = h
            .users()
            .assign_org_memberships(
                &id,
                AssignUserOrgMemberships {
                    primary_org_unit_id: h.org("alpha"),
                    secondary_org_unit_ids: vec![h.org("viewer")],
                    reason: None,
                    expected_version: Some(999999),
                },
                &h.session(true).await,
            )
            .await
            .unwrap();
        assert_eq!(replaced.org_units.len(), 2);
        assert!(replaced.permissions.is_empty());
        assert_eq!(h.row(&id)["primary_org_unit_id"], h.org("alpha"));
        assert_eq!(
            h.row(&id)["row_version"].as_i64().unwrap(),
            original["row_version"].as_i64().unwrap() + 1
        );
        assert_eq!(h.relations("user_org_membership", &id).len(), 2);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W07 self nullable identity-map and audit/response snapshots"]
async fn self_snapshot_retains_audit_values_while_nonnull_hydration_refreshes_response() {
    run_case(|h| async move {
        let actor = h.account("admin").to_string();
        fixture(h.run_id, "user-profile-null", Some("admin"));
        let early_null = h.session(true).await;
        fixture(h.run_id, "user-nullable-values-no-version", Some("admin"));
        let response = h
            .users()
            .update_profile(
                UpdateProfile {
                    display_name: Some(js_string("self null to value")),
                    ..UpdateProfile::default()
                },
                &early_null,
            )
            .await
            .unwrap();
        assert_eq!(response.email, Some(js_string("witness@example.test")));
        let audit = h
            .audits(&actor)
            .into_iter()
            .find(|row| row["after_snapshot"]["displayName"] == "self null to value")
            .unwrap();
        assert!(audit["before_snapshot"]["email"].is_null());
        assert!(audit["after_snapshot"]["email"].is_null());
        assert!(
            !audit["before_snapshot"]
                .as_object()
                .unwrap()
                .contains_key("avatarUrl")
        );
        let early_value = h.session(true).await;
        fixture(h.run_id, "user-nullable-null-no-version", Some("admin"));
        let response = h
            .users()
            .update_profile(
                UpdateProfile {
                    display_name: Some(js_string("self value to null")),
                    ..UpdateProfile::default()
                },
                &early_value,
            )
            .await
            .unwrap();
        assert_eq!(response.email, Some(js_string("witness@example.test")));
        assert_eq!(response.phone, Some(js_string("12345")));
        assert_eq!(
            response.avatar_url,
            Some(js_string("https://example.test/avatar.png"))
        );
        assert_eq!(
            response.last_login_at.as_deref(),
            Some("2020-02-03T04:05:06.123Z")
        );
        let row = h.row(&actor);
        assert!(row["email"].is_null() && row["phone"].is_null() && row["last_login_at"].is_null());
        let audits = h.audits(&actor);
        let audit = audits
            .iter()
            .find(|row| row["after_snapshot"]["displayName"] == "self value to null")
            .unwrap();
        assert_eq!(audit["before_snapshot"]["email"], "witness@example.test");
        assert_eq!(audit["after_snapshot"]["email"], "witness@example.test");
        assert_eq!(audit["metadata"], json!({"changedFields":["displayName"]}));
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2D PG15: W03 toggles/noops/raw entity and lazy current-session invalidation"]
async fn activation_ignores_command_fields_preserves_noops_and_defers_session_revoke() {
    run_case(|h| async move {
        let id = h.create("u000", &h.session(false).await).await;
        let command = || UserActivation {
            reason: Some(js_string("ignored")),
            comment: Some(js_string("ignored")),
            expected_version: Some(999999),
        };
        let original = h.row(&id);
        let active: Value = serde_json::from_str(
            h.users()
                .activate(&id, command(), &h.session(false).await)
                .await
                .unwrap()
                .0
                .get(),
        )
        .unwrap();
        assert_eq!(active.as_object().unwrap().len(), 16);
        assert_eq!(h.row(&id), original);
        let disabled: Value = serde_json::from_str(
            h.users()
                .deactivate(&id, command(), &h.session(false).await)
                .await
                .unwrap()
                .0
                .get(),
        )
        .unwrap();
        assert_eq!(disabled["isActive"], false);
        assert_eq!(
            disabled["rowVersion"].as_i64().unwrap(),
            original["row_version"].as_i64().unwrap() + 1
        );
        let inactive = h.row(&id);
        h.users()
            .deactivate(&id, command(), &h.session(false).await)
            .await
            .unwrap();
        assert_eq!(h.row(&id), inactive);
        h.users()
            .activate(&id, command(), &h.session(true).await)
            .await
            .unwrap();
        assert_eq!(
            h.row(&id)["row_version"].as_i64().unwrap(),
            inactive["row_version"].as_i64().unwrap() + 1
        );
        let audits = h.audits(&id);
        let toggles = audits
            .iter()
            .filter(|row| {
                row["event_type"] == "platform.user.activated"
                    || row["event_type"] == "platform.user.deactivated"
            })
            .collect::<Vec<_>>();
        assert_eq!(toggles.len(), 4);
        for audit in toggles {
            assert!(audit["reason"].is_null() && audit["metadata"].is_null());
        }
        let actor = h.account("admin");
        let auth = h.auth();
        let created = auth
            .create_session_at(actor, &RequestInfo::default(), h.at)
            .await
            .unwrap();
        let session = auth
            .resolve_session_token_at(&created.session_token, &RequestInfo::default(), h.at)
            .await
            .unwrap();
        h.users()
            .deactivate(&actor.to_string(), command(), &session)
            .await
            .unwrap();
        assert_eq!(h.session_row(&session)["status"], "active");
        let error = auth
            .resolve_session_token_at(
                &created.session_token,
                &RequestInfo::default(),
                h.at + TimeDelta::seconds(1),
            )
            .await
            .unwrap_err();
        assert_eq!(
            error.code(),
            Some(poms_api_rust::shared::generated::AuthSessionErrorCode::AccountDisabled)
        );
        assert_eq!(h.session_row(&session)["status"], "revoked");
        assert_eq!(
            h.session_row(&session)["revoked_reason"],
            "account-disabled"
        );
        // The HTTP guard's separate security-event flush is exercised by the
        // real HTTP matrix; direct AuthService acceptance stops at its boundary.
    })
    .await;
}
