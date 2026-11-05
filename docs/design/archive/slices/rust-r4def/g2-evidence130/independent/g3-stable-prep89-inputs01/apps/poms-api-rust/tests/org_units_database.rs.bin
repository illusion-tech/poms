//! Explicit R2C PG15 service/store acceptance. All fixture identities are run-owned.
//! Marker preflight is performed by the fixed fixture before writes; PG17 and old databases are refused.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use chrono::{DateTime, TimeDelta, Utc};
use poms_api_rust::{
    auth::{
        js_json::JsString,
        model::{RequestInfo, ResolvedSession, SessionFlush},
        service::AuthService,
        store::flush_managed_session,
    },
    compat::json::Field,
    config::{AuthConfig, DatabaseConfig},
    database::Database,
    org_units::{
        model::{
            CreateOrgUnit, MoveOrgUnit, OrgUnitActivation, OrgUnitSummary, UpdateOrgUnit, js_string,
        },
        service::{OrgUnitsError, OrgUnitsService},
        store::{self, Deactivation},
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

const ROLE: &str = "poms_r2c_app";
const DATABASE: &str = "poms_r2c_rust";
fn guarded_options(
    url: &str,
    ambient_override: bool,
) -> Result<(PgConnectOptions, String), &'static str> {
    if ambient_override {
        return Err("R2C refuses ambient PostgreSQL or database overrides");
    }
    let password = url
        .strip_prefix("postgres://poms_r2c_app:")
        .and_then(|value| value.strip_suffix("@127.0.0.1:15432/poms_r2c_rust"))
        .filter(|value| {
            value.len() == 64
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        })
        .ok_or("R2C requires its exact new Rust database URL and explicit synthetic secret")?;
    let options = PgConnectOptions::from_str(url).map_err(|_| "invalid controlled R2C URL")?;
    if options.get_host() != "127.0.0.1"
        || options.get_port() != 15432
        || options.get_database() != Some(DATABASE)
        || options.get_username() != ROLE
        || options.get_socket().is_some()
        || options.get_options().is_some()
    {
        return Err("R2C target differs from its frozen isolation boundary");
    }
    Ok((options.disable_statement_logging(), password.to_owned()))
}

async fn target_config() -> Result<DatabaseConfig, &'static str> {
    if env::var("POMS_R2C_DATABASE_TEST").as_deref() != Ok("1") {
        return Err("set explicit POMS_R2C_DATABASE_TEST=1");
    }
    let url = env::var("POMS_R2C_DATABASE_TEST_URL").map_err(|_| "explicit R2C URL is required")?;
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
        .map_err(|_| "R2C metadata connection deadline")?
        .map_err(|_| "R2C metadata connection failed")?;
    // No pool after_connect/SET, fixture or product operation precedes this
    // read-only metadata query. The fixture separately reads marker bdbf...ca24
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
        has_schema_privilege(current_user,'r2c_control','USAGE') AS marker_access \
        FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user")
        .fetch_one(&mut connection)).await.map_err(|_| "R2C metadata guard deadline")?
        .map_err(|_| "R2C metadata guard failed")?;
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
            .map_err(|_| "invalid R2C metadata")?
            != expected
        {
            return Err("R2C PostgreSQL identity mismatch");
        }
    }
    if row
        .try_get::<Option<String>, _>("isolated")
        .map_err(|_| "invalid R2C isolation metadata")?
        .as_deref()
        != Some("on")
    {
        return Err("R2C isolation marker GUC mismatch");
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
            .map_err(|_| "invalid R2C privilege metadata")?
        {
            return Err("R2C runtime role has elevated privileges");
        }
    }
    if row
        .try_get::<i32, _>("role_memberships")
        .map_err(|_| "invalid R2C memberships")?
        != 0
    {
        return Err("R2C runtime role has memberships");
    }
    timeout(Duration::from_secs(5), connection.close())
        .await
        .map_err(|_| "R2C metadata close deadline")?
        .map_err(|_| "R2C metadata close failed")?;
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

fn fixture(run_id: Uuid, action: &str, slot: Option<&str>, parent: Option<&str>) -> Value {
    assert!(matches!(
        action,
        "prepare"
            | "cleanup"
            | "org-plan"
            | "org-adopt"
            | "org-bump-version"
            | "org-null-description"
    ));
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap();
    let mut command = Command::new("node");
    command
        .arg(root.join("tools/rust-r2c/fixture-cli.mjs"))
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
    let mut child = command.spawn().expect("fixed guarded R2C fixture");
    let mut request =
        json!({"formatVersion":1,"runId":run_id,"backend":"rust","action":action,"account":"none"});
    if let Some(slot) = slot {
        request["orgSlot"] = slot.into();
    }
    if let Some(parent) = parent {
        request["parentSlot"] = parent.into();
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
        "R2C fixture refused run {run_id}; retain its recovery journal"
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

fn now() -> DateTime<Utc> {
    DateTime::parse_from_rfc3339("2026-10-27T00:00:00.000Z")
        .unwrap()
        .with_timezone(&Utc)
}
fn surrogate(text: &str) -> JsString {
    JsString::from_code_units(text.encode_utf16().chain([0xd800]).collect())
}
fn activation() -> OrgUnitActivation {
    OrgUnitActivation {
        reason: Some(js_string("request retained when applicable")),
        comment: Some(js_string("comment")),
        expected_version: Some(9_007_199_254_740_991),
    }
}
fn unchanged() -> UpdateOrgUnit {
    UpdateOrgUnit {
        name: None,
        code: None,
        description: Field::Missing,
        display_order: None,
    }
}
fn sqlstate(error: &OrgUnitsError) -> Option<&str> {
    match error {
        OrgUnitsError::Database(error) => error.sqlstate(),
        _ => None,
    }
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
            .expect("R2C target guard refused before fixture writes");
        let options = guarded_options(config.url.as_ref().unwrap(), false)
            .unwrap()
            .0;
        let mut identity = PgConnection::connect_with(&options).await.unwrap();
        let run_id = sqlx::query_scalar("SELECT gen_random_uuid()")
            .fetch_one(&mut identity)
            .await
            .unwrap();
        identity.close().await.unwrap();
        fixture(run_id, "prepare", None, None); // Its owner-only marker is verified before DML.
        println!(
            "{}",
            json!({"kind":"r2c-service-pg-run","runId":run_id,"state":"prepared"})
        );
        let database = Database::new(&config).await.unwrap();
        let user = sqlx::query_scalar("SELECT id FROM poms.platform_user WHERE username=$1")
            .bind(format!("r2c_admin_{}", run_id.simple()))
            .fetch_one(database.pool())
            .await
            .unwrap();
        Self {
            database,
            run_id,
            user,
        }
    }
    fn service(&self) -> OrgUnitsService {
        OrgUnitsService::new(self.database.clone())
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
                jwt_secret: "public-r2c-pg-acceptance-only".into(),
                secret_key: None,
            },
        )
    }
    fn input(&self, slot: &str, parent: Option<Uuid>) -> CreateOrgUnit {
        let code = format!("r2c_{}_{}", self.run_id.simple(), slot);
        let name = format!("R2C {slot} {}", &self.run_id.to_string()[..8]);
        CreateOrgUnit {
            code: if slot == "utf16-code" {
                surrogate(&code)
            } else {
                js_string(&code)
            },
            name: if slot == "utf16-name" {
                surrogate(&name)
            } else {
                js_string(&name)
            },
            description: if slot == "utf16-description" {
                Field::Value(surrogate(""))
            } else if slot == "nullable" {
                Field::Value(js_string("initial non-null description"))
            } else {
                Field::Null
            },
            parent_id: parent.map_or(Field::Missing, |id| Field::Value(id.to_string())),
            display_order: Some(if slot == "order-overflow" {
                2_147_483_648
            } else if slot == "max-order" {
                2_147_483_647
            } else {
                0
            }),
        }
    }
    async fn create(
        &self,
        slot: &str,
        parent: Option<(&str, Uuid)>,
        pending: Option<&SessionFlush>,
    ) -> Result<OrgUnitSummary, OrgUnitsError> {
        fixture(
            self.run_id,
            "org-plan",
            Some(slot),
            parent.map(|(slot, _)| slot),
        );
        let result = self
            .service()
            .create(
                self.input(slot, parent.map(|(_, id)| id)),
                Some(self.user),
                pending,
            )
            .await;
        // Even a failed second audit flush can leave a first-flush row to adopt.
        fixture(self.run_id, "org-adopt", Some(slot), None);
        result
    }
    async fn id(&self, slot: &str) -> Option<Uuid> {
        sqlx::query_scalar("SELECT id FROM poms.org_unit WHERE code=$1")
            .bind(self.input(slot, None).code.to_utf8_lossy())
            .fetch_optional(self.database.pool())
            .await
            .unwrap()
    }
    async fn row(&self, id: Uuid) -> Value {
        sqlx::query_scalar("SELECT to_jsonb(o) FROM poms.org_unit o WHERE id=$1")
            .bind(id)
            .fetch_one(self.database.pool())
            .await
            .unwrap()
    }
    async fn session(&self, id: Uuid) -> Value {
        sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.auth_session s WHERE id=$1")
            .bind(id)
            .fetch_one(self.database.pool())
            .await
            .unwrap()
    }
    async fn audits(&self) -> Vec<Value> {
        sqlx::query_scalar(
            "SELECT to_jsonb(a) FROM poms.audit_log a WHERE operator_id=$1 ORDER BY occurred_at,id",
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
        fixture(self.run_id, "cleanup", None, None);
        let zero = fixture(self.run_id, "cleanup", None, None);
        assert_eq!(
            [zero["matched"].as_u64(), zero["changed"].as_u64()],
            [Some(0), Some(0)]
        );
        println!(
            "{}",
            json!({"kind":"r2c-service-pg-run","runId":self.run_id,"state":"cleaned","matched":0,"changed":0})
        );
        self.database.close(Duration::from_secs(5)).await.unwrap();
    }
}

async fn run_case<F, Fut>(case: F)
where
    F: FnOnce(Harness) -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    let harness = Harness::new().await;
    let owned = harness.clone();
    let result = tokio::spawn(async move { case(owned).await }).await;
    harness.cleanup().await;
    result.expect("R2C case failed; run cleanup and second-zero verification finished");
}

#[test]
fn r2c_target_guard_refuses_pg17_old_databases_owner_and_ambient_before_io() {
    let password = "a".repeat(64);
    let valid = format!("postgres://poms_r2c_app:{password}@127.0.0.1:15432/poms_r2c_rust");
    assert!(guarded_options(&valid, false).is_ok());
    assert!(guarded_options(&valid, true).is_err());
    for bad in [
        valid.replace(":15432/", ":5432/"),
        valid.replace("poms_r2c_rust", "poms_r2c_nest"),
        valid.replace("poms_r2c_rust", "poms_r2b_rust"),
        valid.replace("poms_r2c_rust", "poms_r2a_rust"),
        valid.replace("poms_r2c_app:", "poms_r0e_owner:"),
        valid.replace("127.0.0.1", "localhost"),
        format!("{valid}?options=-crole%3Downer"),
        format!("{valid}#fragment"),
        valid.replace(&password, "implicit"),
    ] {
        assert!(guarded_options(&bad, false).is_err());
    }
}

#[tokio::test]
#[ignore = "explicit R2C PG15: business/audit, no-op session, strict IDs and mutable code"]
async fn organization_defaults_noops_ids_and_mutable_code_are_persisted() {
    run_case(|h| async move {
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let due = h.resolve(&created.session_token, 60).await;
        let summary = h
            .create("main", None, due.pending_flush.as_ref())
            .await
            .unwrap();
        let id = Uuid::parse_str(&summary.id).unwrap();
        let original = h.row(id).await;
        assert_eq!(original["row_version"], 1);
        assert_eq!(original["is_active"], true);
        for field in ["description", "parent_id", "created_by", "updated_by"] {
            assert_eq!(original[field], Value::Null);
        }
        assert_eq!(h.session(created.session.id).await["row_version"], 3);
        let due = h.resolve(&created.session_token, 120).await;
        h.service()
            .update(
                &summary.id,
                unchanged(),
                Some(h.user),
                due.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        assert_eq!(h.row(id).await, original);
        assert_eq!(h.session(created.session.id).await["row_version"], 5);
        h.service()
            .activate(&summary.id, activation(), Some(h.user), None)
            .await
            .unwrap();
        assert_eq!(h.row(id).await, original);
        assert_eq!(h.audits().await.len(), 3);
        let alias = summary.id.replace('-', "");
        let changed_code = format!("r2c_changed_{}", h.run_id.simple());
        assert!(matches!(
            h.service().get(&alias).await,
            Err(OrgUnitsError::NotFound(_))
        ));
        let updated = h
            .service()
            .update(
                &alias,
                UpdateOrgUnit {
                    code: Some(js_string(&changed_code)),
                    ..unchanged()
                },
                Some(h.user),
                None,
            )
            .await
            .unwrap();
        assert_eq!(updated.id, summary.id);
        assert_eq!(h.row(id).await["row_version"], 2);
        assert!(matches!(
            h.service().get("not-a-uuid").await,
            Err(OrgUnitsError::NotFound(_))
        ));
        let invalid = h
            .service()
            .update("not-a-uuid", unchanged(), Some(h.user), None)
            .await
            .unwrap_err();
        assert_eq!(sqlstate(&invalid), Some("22P02"));
        let audit = h.audits().await.pop().unwrap();
        assert_eq!(audit.as_object().unwrap().len(), 12);
        assert_eq!(audit["target_type"], "OrgUnit");
        assert_eq!(audit["target_id"], summary.id);
        assert_eq!(audit["after_snapshot"]["code"], changed_code);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2C PG15: mixed cascade, inactive descendants, hierarchy and audit arrays"]
async fn mixed_cascade_changes_only_dirty_rows_and_audits_all_affected_in_list_order() {
    run_case(|h| async move {
        let root = h.create("cascade-root", None, None).await.unwrap();
        let root_id = Uuid::parse_str(&root.id).unwrap();
        let mut ids = vec![root_id];
        for slot in [
            "cascade-a",
            "cascade-b",
            "cascade-c",
            "cascade-d",
            "cascade-e",
        ] {
            let created = h
                .create(slot, Some(("cascade-root", root_id)), None)
                .await
                .unwrap();
            ids.push(Uuid::parse_str(&created.id).unwrap());
        }
        for id in &ids[4..] {
            h.service()
                .deactivate(&id.to_string(), activation(), Some(h.user), None)
                .await
                .unwrap();
        }
        h.service()
            .update(
                &root.id,
                UpdateOrgUnit {
                    display_order: Some(50),
                    ..unchanged()
                },
                Some(h.user),
                None,
            )
            .await
            .unwrap();
        let before: Vec<_> = futures_rows(&h, &ids).await;
        let list = h.service().list().await.unwrap();
        let expected_order: Vec<_> = list
            .iter()
            .filter(|row| ids.iter().any(|id| id.to_string() == row.id))
            .map(|row| row.id.clone())
            .collect();
        h.service()
            .deactivate(&root.id, activation(), Some(h.user), None)
            .await
            .unwrap();
        let after = futures_rows(&h, &ids).await;
        for (index, (before, after)) in before.iter().zip(&after).enumerate() {
            assert_eq!(after["is_active"], false);
            if index < 4 {
                assert_eq!(
                    after["row_version"].as_i64().unwrap(),
                    before["row_version"].as_i64().unwrap() + 1
                );
            } else {
                assert_eq!(after, before);
            }
        }
        let audit = h.audits().await.pop().unwrap();
        assert_eq!(audit["metadata"]["cascadedCount"], 5);
        let array = audit["after_snapshot"]["orgUnits"].as_array().unwrap();
        assert_eq!(
            array
                .iter()
                .map(|row| row["id"].as_str().unwrap().to_owned())
                .collect::<Vec<_>>(),
            expected_order
        );
        assert!(array.iter().all(|row| row["isActive"] == false));
        let child = ids[1].to_string();
        let rejected = h
            .service()
            .activate(&child, activation(), Some(h.user), None)
            .await
            .unwrap_err();
        assert!(matches!(rejected, OrgUnitsError::Conflict(_)));
        assert_eq!(
            h.audits().await.last().unwrap()["reason"],
            "inactive-parent"
        );
        let count = h.audits().await.len();
        let request = MoveOrgUnit {
            parent_id: Field::Value(root.id.clone()),
            display_order: Some(3),
            reason: None,
            expected_version: Some(999),
        };
        assert!(
            h.service()
                .move_org_unit(&child, request, Some(h.user), None)
                .await
                .is_err()
        );
        assert_eq!(h.audits().await.len(), count);
        h.service()
            .activate(&root.id, activation(), Some(h.user), None)
            .await
            .unwrap();
        h.service()
            .activate(&child, activation(), Some(h.user), None)
            .await
            .unwrap();
        let self_move = MoveOrgUnit {
            parent_id: Field::Value(root.id.clone()),
            display_order: None,
            reason: None,
            expected_version: None,
        };
        assert_eq!(
            sqlstate(
                &h.service()
                    .move_org_unit(&root.id, self_move, Some(h.user), None)
                    .await
                    .unwrap_err()
            ),
            Some("23514")
        );
        let cycle = MoveOrgUnit {
            parent_id: Field::Value(child),
            display_order: None,
            reason: Some(js_string("cycle")),
            expected_version: None,
        };
        assert!(matches!(
            h.service()
                .move_org_unit(&root.id, cycle, Some(h.user), None)
                .await,
            Err(OrgUnitsError::Conflict(_))
        ));
        assert_eq!(h.audits().await.last().unwrap()["reason"], "cycle-detected");
        assert_eq!(h.service().get(&root.id).await.unwrap().child_count, 5);
    })
    .await;
}

async fn futures_rows(h: &Harness, ids: &[Uuid]) -> Vec<Value> {
    let mut rows = Vec::new();
    for id in ids {
        rows.push(h.row(*id).await);
    }
    rows
}

#[tokio::test]
#[ignore = "explicit R2C PG15: UTF16 response versus PG text and separate audit failure"]
async fn surrogate_storage_audit_and_repeated_dirty_updates_keep_their_boundaries() {
    run_case(|h| async move {
        for slot in ["utf16-name", "utf16-code"] {
            let error = h.create(slot, None, None).await.unwrap_err();
            assert_eq!(sqlstate(&error), Some("22P02"));
            let row = h.row(h.id(slot).await.unwrap()).await;
            assert_eq!(row["name"], h.input(slot, None).name.to_utf8_lossy());
            assert_eq!(row["code"], h.input(slot, None).code.to_utf8_lossy());
            assert_eq!(row["row_version"], 1);
        }
        assert!(h.audits().await.is_empty());
        let summary = h.create("utf16-description", None, None).await.unwrap();
        let id = Uuid::parse_str(&summary.id).unwrap();
        assert_eq!(
            summary.description.as_ref().unwrap().as_code_units(),
            &[0xd800]
        );
        assert!(serde_json::to_string(&summary).unwrap().contains("\\ud800"));
        assert_eq!(h.row(id).await["description"], "\u{fffd}");
        for expected in [2, 3] {
            let request = UpdateOrgUnit {
                description: Field::Value(surrogate("")),
                ..unchanged()
            };
            assert_eq!(
                sqlstate(
                    &h.service()
                        .update(&summary.id, request, Some(h.user), None)
                        .await
                        .unwrap_err()
                ),
                Some("22P02")
            );
            assert_eq!(h.row(id).await["row_version"], expected);
        }
        assert_eq!(h.audits().await.len(), 1);
        let before = h.row(id).await;
        let request = UpdateOrgUnit {
            description: Field::Value(js_string("\0")),
            ..unchanged()
        };
        assert_eq!(
            sqlstate(
                &h.service()
                    .update(&summary.id, request, Some(h.user), None)
                    .await
                    .unwrap_err()
            ),
            Some("22021")
        );
        assert_eq!(h.row(id).await, before);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2C PG15: stale batch precheck rolls back the same session transaction"]
async fn stale_batch_version_preflight_rolls_back_all_dirty_orgs_and_pending_session() {
    run_case(|h| async move {
        let root = h.create("cascade-root", None, None).await.unwrap();
        let root_id = Uuid::parse_str(&root.id).unwrap();
        let child = h
            .create("cascade-a", Some(("cascade-root", root_id)), None)
            .await
            .unwrap();
        let child_id = Uuid::parse_str(&child.id).unwrap();
        let before = futures_rows(&h, &[root_id, child_id]).await;
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let resolved = h.resolve(&created.session_token, 60).await;
        let raw_session = h.session(created.session.id).await;
        fixture(h.run_id, "org-bump-version", Some("cascade-a"), None);
        let pending = resolved.pending_flush.unwrap();
        let inputs = vec![
            Deactivation {
                id: root_id,
                expected_version: before[0]["row_version"].as_i64().unwrap() as i32,
                updated_at: now(),
            },
            Deactivation {
                id: child_id,
                expected_version: before[1]["row_version"].as_i64().unwrap() as i32,
                updated_at: now(),
            },
        ];
        let result = h
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result = async {
                        flush_managed_session(&mut transaction, &pending).await?;
                        store::deactivate_many(&mut transaction, &inputs).await
                    }
                    .await;
                    transaction.rollback().await?;
                    result
                })
            })
            .await;
        assert!(result.is_err());
        assert_eq!(h.row(root_id).await, before[0]);
        let child = h.row(child_id).await;
        assert_eq!(child["is_active"], true);
        assert_eq!(
            child["row_version"].as_i64().unwrap(),
            before[1]["row_version"].as_i64().unwrap() + 1
        );
        assert_eq!(h.session(created.session.id).await, raw_session);
        assert_eq!(h.audits().await.len(), 2);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2C PG15: stale managed-session CAS prevents the later organization write"]
async fn stale_pending_session_stops_the_business_flush_before_org_update() {
    run_case(|h| async move {
        let org = h.create("session-cas", None, None).await.unwrap();
        let id = Uuid::parse_str(&org.id).unwrap();
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let resolved = h.resolve(&created.session_token, 60).await;
        h.service()
            .activate(
                &org.id,
                activation(),
                Some(h.user),
                resolved.pending_flush.as_ref(),
            )
            .await
            .unwrap();
        let before = h.row(id).await;
        let session = h.session(created.session.id).await;
        let count = h.audits().await.len();
        let request = UpdateOrgUnit {
            name: Some(js_string("must roll back")),
            ..unchanged()
        };
        assert!(matches!(
            h.service()
                .update(
                    &org.id,
                    request,
                    Some(h.user),
                    resolved.pending_flush.as_ref()
                )
                .await,
            Err(OrgUnitsError::Database(_))
        ));
        assert_eq!(h.row(id).await, before);
        assert_eq!(h.session(created.session.id).await, session);
        assert_eq!(h.audits().await.len(), count);
    })
    .await;
}

#[tokio::test]
#[ignore = "explicit R2C PG15: explicit and default int4 overflows preserve raw session touch"]
async fn explicit_and_default_display_order_overflow_are_storage_failures() {
    run_case(|h| async move {
        let created = h
            .auth()
            .create_session_at(h.user, &RequestInfo::default(), now())
            .await
            .unwrap();
        let due = h.resolve(&created.session_token, 60).await;
        let raw = h.session(created.session.id).await;
        assert_eq!(
            sqlstate(
                &h.create("order-overflow", None, due.pending_flush.as_ref())
                    .await
                    .unwrap_err()
            ),
            Some("22003")
        );
        assert!(h.id("order-overflow").await.is_none());
        assert_eq!(h.session(created.session.id).await, raw);
        let parent = h.create("second", None, None).await.unwrap();
        let parent_id = Uuid::parse_str(&parent.id).unwrap();
        h.create("max-order", Some(("second", parent_id)), None)
            .await
            .unwrap();
        fixture(h.run_id, "org-plan", Some("negative-order"), Some("second"));
        let mut request = h.input("negative-order", Some(parent_id));
        request.display_order = None;
        assert_eq!(
            sqlstate(
                &h.service()
                    .create(request, Some(h.user), None)
                    .await
                    .unwrap_err()
            ),
            Some("22003")
        );
        fixture(h.run_id, "org-adopt", Some("negative-order"), None);
        assert!(h.id("negative-order").await.is_none());
        assert_eq!(h.audits().await.len(), 2);
    })
    .await;
}

async fn pg_find(h: &Harness, lookup: String) -> store::OrgUnitRow {
    h.database
        .with_connection(move |connection| {
            Box::pin(async move { store::find(connection, &lookup).await })
        })
        .await
        .unwrap()
        .unwrap()
}

#[tokio::test]
#[ignore = "explicit R2C PG15: real reads/shared hydration; not an HTTP two-SELECT barrier"]
async fn alias_hydration_preserves_cached_nullable_fields_and_fresh_versions() {
    run_case(|h| async move {
        let main = h.create("main", None, None).await.unwrap();
        let main_id = Uuid::parse_str(&main.id).unwrap();
        let child = h.create("nullable", Some(("main", main_id)), None).await.unwrap();
        let id = Uuid::parse_str(&child.id).unwrap();
        let rows = h.database.with_connection(|connection| Box::pin(store::list(connection))).await.unwrap();
        let cached = rows.iter().find(|row| row.id == id).unwrap().clone();
        assert_eq!(cached.description.as_deref(), Some("initial non-null description"));
        assert_eq!(cached.parent_id, Some(main_id));
        let before_audits = h.audits().await;
        fixture(h.run_id, "org-null-description", Some("nullable"), None);
        let null_description = h.row(id).await;
        assert_eq!(null_description["description"], Value::Null);
        assert_eq!(null_description["row_version"], 2);

        for alias in [child.id.to_uppercase(), child.id.replace('-', "")] {
            // Exact text remains the canonical cache key. UUID parsing here
            // would incorrectly reuse a noncanonical alias's old version.
            assert_eq!(rows.iter().any(|row| row.id.to_string() == alias), alias == child.id);
            let fresh = pg_find(&h, alias).await;
            assert_eq!(fresh.description, None);
            assert_eq!(fresh.row_version, 2);
            let hydrated = store::merge_find_one(fresh, Some(&cached));
            assert_eq!(hydrated.description, cached.description);
            assert_eq!(hydrated.parent_id, Some(main_id));
            assert_eq!(hydrated.row_version, 2);
        }
        assert_eq!(h.row(id).await, null_description);
        assert_eq!(h.audits().await, before_audits);

        // A canonical request keeps the earlier entity/version; a later
        // single UPDATE must fail instead of refreshing that version.
        let stale_version = cached.row_version;
        let stale = h.database.with_connection(move |connection| Box::pin(async move {
            let mut transaction = connection.begin().await?;
            let changes = store::OrgUnitUpdate { name: Some("must not commit".into()), ..Default::default() };
            let result = store::update(&mut transaction, id, stale_version, &changes, now()).await;
            transaction.rollback().await?;
            result
        })).await;
        assert!(stale.is_err());
        assert_eq!(h.row(id).await, null_description);
        assert_eq!(h.audits().await, before_audits);

        let rows = h.database.with_connection(|connection| Box::pin(store::list(connection))).await.unwrap();
        let parent_cached = rows.iter().find(|row| row.id == id).unwrap().clone();
        let detached = h.service().move_org_unit(&child.id, MoveOrgUnit {
            parent_id: Field::Null, display_order: None, reason: Some(js_string("controlled parent clear")), expected_version: None,
        }, Some(h.user), None).await.unwrap();
        assert_eq!(detached.parent_id, None);
        let null_parent = h.row(id).await;
        assert_eq!(null_parent["parent_id"], Value::Null);
        assert_eq!(null_parent["row_version"], 3);
        let after_move_audits = h.audits().await;
        assert_eq!(after_move_audits.len(), before_audits.len() + 1);
        let moved_audit = after_move_audits.last().unwrap();
        assert_eq!(moved_audit["event_type"], "platform.org-unit.moved");
        assert_eq!(moved_audit["before_snapshot"]["parentId"], main.id);
        assert_eq!(moved_audit["after_snapshot"]["parentId"], Value::Null);
        for alias in [child.id.to_uppercase(), child.id.replace('-', "")] {
            let fresh = pg_find(&h, alias).await;
            assert_eq!(fresh.parent_id, None);
            let hydrated = store::merge_find_one(fresh, Some(&parent_cached));
            assert_eq!(hydrated.parent_id, Some(main_id));
            assert_eq!(hydrated.description, None);
            assert_eq!(hydrated.row_version, 3);
        }
        assert_eq!(h.row(id).await, null_parent);
        assert_eq!(h.audits().await, after_move_audits);
        println!("{}", json!({"kind":"r2c-pg-hydration-facts","runId":h.run_id,
            "scope":"real list/find and shared production hydration; no HTTP timing hook",
            "canonicalStaleVersion":cached.row_version,"descriptionFreshVersion":2,"parentFreshVersion":3,
            "databaseNullableValuesRemainNull":true,"cachedNullableValuesRemainNonNull":true,
            "auditCountBefore":before_audits.len(),"auditCountAfterParentMove":after_move_audits.len()}));
    }).await;
}
