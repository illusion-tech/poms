//! Explicit R2EF PG15 acceptance. Root owns the private fixture, owner-marker
//! admission, intents, adoption and cleanup. Tests never provision or clean.
#![allow(clippy::unwrap_used, clippy::expect_used)]
use chrono::{DateTime, TimeZone, Utc};
use poms_api_rust::{
    auth::service::AuthService,
    business_numbers::{BusinessNumberScope, BusinessNumberService},
    compat::json::Field,
    config::Config,
    database::Database,
    dictionary::{
        DictionaryError, DictionaryService,
        model::{DictionaryQuery, UpdateDictionaryItem, js_string},
    },
    system_settings::{SystemSettingsError, SystemSettingsService, model::UpdateSystemSetting},
};
use serde::Deserialize;
use serde_json::Value;
use sqlx::{ConnectOptions, Connection, PgConnection, Row, postgres::PgConnectOptions};
use std::{
    collections::HashSet,
    env, fs,
    path::{Path, PathBuf},
    time::Duration,
};
use uuid::Uuid;
const SOURCE: &str = "7a343c543fe0031d7d6b42c1f7e18a7e861c72b7";
const MARKER: &str = "a3580e72-e812-47b3-b41f-5066343f5c37";
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    format_version: u32,
    source_head: String,
    database: String,
    marker: String,
    actor_id: Uuid,
    dictionary_update_id: Uuid,
    dictionary_noop_id: Uuid,
    dictionary_inactive_id: Uuid,
    usage_cases: Vec<UsageCase>,
    setting: SettingCase,
    number_cases: Vec<NumberCase>,
    number_concurrency: ConcurrentNumberCase,
    number_standalone: NumberCase,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UsageCase {
    id: Uuid,
    domain: String,
    code: String,
    usage_count: i64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingCase {
    key: String,
    request_id: String,
    snapshot_id: String,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumberCase {
    scope: String,
    utc_year: i32,
    initial_next_value: Option<i32>,
    row_version: Option<i32>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConcurrentNumberCase {
    scope: String,
    utc_year: i32,
    initial_next_value: i32,
    row_version: i32,
    count: usize,
}
fn normalized(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
fn private_file(path: &Path, env_file: bool) -> PathBuf {
    let requested = normalized(path);
    let actual = fs::canonicalize(path).expect("fixed R2EF private file must exist");
    let canonical = normalized(&actual);
    let admitted = |value: &str| {
        if env_file {
            matches!(
                value,
                "/r2ef-private/rust.env"
                    | "/home/wangzishi/.local/share/poms-r2ef/private/rust.env"
            ) || value.eq_ignore_ascii_case(
                "//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r2ef/private/rust.env",
            )
        } else {
            value.starts_with("/r2ef-private/")
                || value.starts_with("/home/wangzishi/.local/share/poms-r2ef/private/")
                || value.to_ascii_lowercase().starts_with(
                    "//wsl.localhost/debian/home/wangzishi/.local/share/poms-r2ef/private/",
                )
        }
    };
    assert!(
        admitted(&requested) && admitted(&canonical),
        "R2EF private target differs from the frozen boundary"
    );
    let metadata = fs::metadata(&actual).expect("private metadata");
    assert!(metadata.is_file(), "private target must be a file");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            metadata.permissions().mode() & 0o077,
            0,
            "private file must not grant group/other access"
        );
    }
    actual
}
fn load_fixture() -> (Config, Fixture) {
    assert_eq!(
        env::var("POMS_R2EF_DATABASE_TEST").as_deref(),
        Ok("1"),
        "explicit R2EF PG opt-in required"
    );
    assert!(
        !env::vars_os().any(|(key, _)| {
            let key = key.to_string_lossy().to_ascii_uppercase();
            key.starts_with("PG")
                || key.starts_with("DB_")
                || key.starts_with("MIKRO_")
                || matches!(key.as_str(), "DATABASE_URL" | "JWT_SECRET" | "NODE_OPTIONS")
        }),
        "ambient DB/process overrides are forbidden"
    );
    let env_path = env::var("POMS_ENV_FILE").expect("fixed R2EF private env file required");
    private_file(Path::new(&env_path), true);
    let fixture_path =
        env::var("POMS_R2EF_PG_FIXTURE_FILE").expect("root-issued R2EF fixture required");
    let fixture_path = private_file(Path::new(&fixture_path), false);
    let fixture: Fixture =
        serde_json::from_slice(&fs::read(fixture_path).expect("private fixture read"))
            .expect("root fixture schema");
    assert_eq!(fixture.format_version, 1);
    assert_eq!(fixture.source_head, SOURCE);
    assert_eq!(fixture.database, "poms_r2ef_rust");
    assert_eq!(fixture.marker, MARKER);
    assert!(!fixture.actor_id.is_nil());
    assert!(!fixture.setting.snapshot_id.is_empty());
    assert!(
        !fixture.setting.request_id.is_empty()
            && fixture.setting.request_id.is_ascii()
            && fixture.setting.request_id.len() <= 55
    );
    assert_eq!(fixture.usage_cases.len(), 4);
    assert_eq!(
        fixture
            .usage_cases
            .iter()
            .map(|row| row.domain.as_str())
            .collect::<HashSet<_>>()
            .len(),
        4
    );
    for row in &fixture.usage_cases {
        assert!(!row.id.is_nil());
        assert!(row.usage_count >= 2);
        assert!(!row.code.is_empty());
    }
    assert_eq!(fixture.number_cases.len(), 9);
    assert_eq!(
        fixture
            .number_cases
            .iter()
            .map(|row| row.scope.as_str())
            .collect::<HashSet<_>>()
            .len(),
        9
    );
    let config = Config::load().expect("fixed private configuration");
    assert_eq!(config.environment, "test");
    assert_eq!(config.host, "127.0.0.1");
    assert_eq!(config.port, 5501);
    assert_eq!(config.database.host, "127.0.0.1");
    assert_eq!(config.database.port, 15432);
    assert_eq!(config.database.username, "poms_r2ef_app");
    assert_eq!(config.database.database, "poms_r2ef_rust");
    assert!(config.database.connect);
    assert!(config.database.url.is_none());
    assert_eq!(config.database.password.len(), 64);
    assert!(
        config
            .database
            .password
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    );
    let mut keys = HashSet::new();
    for row in fixture
        .number_cases
        .iter()
        .chain(std::iter::once(&fixture.number_standalone))
    {
        scope(&row.scope);
        assert!((1000..=9998).contains(&row.utc_year) && row.utc_year != 2026);
        assert!(
            keys.insert((row.scope.as_str(), row.utc_year)),
            "number period must have a unique journal intent"
        );
    }
    assert!((2..=32).contains(&fixture.number_concurrency.count));
    scope(&fixture.number_concurrency.scope);
    assert!(fixture.number_concurrency.utc_year != 2026);
    assert!(keys.insert((
        &fixture.number_concurrency.scope,
        fixture.number_concurrency.utc_year
    )));
    (config, fixture)
}
async fn target() -> (Config, Fixture, Database) {
    let (config, fixture) = load_fixture();
    let options = PgConnectOptions::new()
        .host(&config.database.host)
        .port(config.database.port)
        .username(&config.database.username)
        .password(&config.database.password)
        .database(&config.database.database)
        .disable_statement_logging();
    let mut connection =
        tokio::time::timeout(Duration::from_secs(5), PgConnection::connect_with(&options))
            .await
            .expect("metadata connect deadline")
            .expect("metadata connect");
    // No product pool SET/flush precedes this read-only identity/privilege check.
    // The inaccessible owner-only marker is checked by root before fixture issuance.
    let row=tokio::time::timeout(Duration::from_secs(5),sqlx::query("SELECT current_database()::text AS database,session_user::text AS session_name,current_user::text AS current_name,current_setting('server_version_num') AS version,current_setting('port') AS port,current_setting('poms.r0e_isolated',true) AS isolated,pg_get_userbyid(d.datdba)::text AS owner,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,(SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS memberships,has_database_privilege(current_user,current_database(),'CREATE') AS database_create,has_schema_privilege(current_user,'poms','CREATE') AS schema_create,has_schema_privilege(current_user,'public','CREATE') AS public_create,has_schema_privilege(current_user,'r2ef_control','USAGE') AS marker_access FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user").fetch_one(&mut connection)).await.expect("metadata deadline").expect("metadata read");
    for (key, expected) in [
        ("database", "poms_r2ef_rust"),
        ("session_name", "poms_r2ef_app"),
        ("current_name", "poms_r2ef_app"),
        ("version", "150012"),
        ("port", "15432"),
        ("owner", "poms_r0e_owner"),
        ("isolated", "on"),
    ] {
        assert_eq!(
            row.try_get::<String, _>(key).expect("identity metadata"),
            expected
        );
    }
    for key in [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolbypassrls",
        "rolreplication",
        "database_create",
        "schema_create",
        "public_create",
        "marker_access",
    ] {
        assert!(!row.try_get::<bool, _>(key).expect("privilege metadata"));
    }
    assert_eq!(
        row.try_get::<i32, _>("memberships").expect("memberships"),
        0
    );
    connection.close().await.expect("metadata close");
    let database = Database::new(&config.database)
        .await
        .expect("verified R2EF pool");
    (config, fixture, database)
}
fn scope(value: &str) -> BusinessNumberScope {
    match value {
        "customer" => BusinessNumberScope::Customer,
        "lead" => BusinessNumberScope::Lead,
        "project" => BusinessNumberScope::Project,
        "contract" => BusinessNumberScope::Contract,
        "cost-payment-fact" => BusinessNumberScope::CostPaymentFact,
        "cost-invoice" => BusinessNumberScope::CostInvoice,
        "cost-expense" => BusinessNumberScope::CostExpense,
        "cost-procurement" => BusinessNumberScope::CostProcurement,
        "cost-labor" => BusinessNumberScope::CostLabor,
        _ => panic!("unknown journalled number scope"),
    }
}
fn at(year: i32) -> DateTime<Utc> {
    Utc.with_ymd_and_hms(year, 6, 1, 0, 0, 0)
        .single()
        .expect("reserved UTC year")
}
fn expected(scope: BusinessNumberScope, year: i32, value: i32) -> String {
    let authority: Value =
        serde_json::from_str(include_str!("../../../tools/rust-r2ef/e-authority.json"))
            .expect("original number authority");
    let spec = &authority["businessNumbers"][scope.as_str()];
    BusinessNumberService::format(
        spec["prefix"].as_str().expect("prefix"),
        &year.to_string(),
        value,
        spec["padding"].as_u64().expect("padding") as usize,
    )
}
async fn number_state(connection: &mut PgConnection, scope: &str, year: i32) -> Option<(i32, i32)> {
    sqlx::query("SELECT next_value,row_version FROM poms.business_number_sequence WHERE scope=$1 AND period=$2").bind(scope).bind(year.to_string()).fetch_optional(connection).await.expect("owned sequence read").map(|row|(row.get("next_value"),row.get("row_version")))
}

#[tokio::test]
#[ignore = "explicit root-owned R2EF PG15 fixture only"]
async fn four_real_usage_tables_dirty_noop_and_active_item_semantics() {
    let (_, fixture, database) = target().await;
    let service = DictionaryService::new(database.clone());
    for case in &fixture.usage_cases {
        let rows = service
            .list(DictionaryQuery {
                domain: Some(case.domain.clone()),
                keyword: Some(js_string(&case.code)),
                ..Default::default()
            })
            .await
            .expect("real dictionary list");
        let row = rows
            .iter()
            .find(|row| row.id == case.id.to_string())
            .expect("owned usage item");
        assert_eq!(row.usage_count, case.usage_count);
    }
    let rows = service
        .list(DictionaryQuery::default())
        .await
        .expect("original sorted dictionary list");
    let before = rows
        .iter()
        .find(|row| row.id == fixture.dictionary_update_id.to_string())
        .expect("owned update row");
    let updated = service
        .update(
            &before.id,
            UpdateDictionaryItem {
                name: Some(js_string("E PG Updated")),
                description: Field::Null,
                status: Some("inactive".into()),
                sort_order: Some(0),
                expected_version: Some(i64::from(before.row_version)),
            },
            Some(fixture.actor_id),
            None,
        )
        .await
        .expect("dirty update");
    assert_eq!(updated.row_version, before.row_version + 1);
    assert!(updated.description.is_none());
    assert_eq!(updated.is_system, before.is_system);
    assert_eq!(updated.code, before.code);
    assert_eq!(updated.domain, before.domain);
    let noop = service
        .update(
            &updated.id,
            UpdateDictionaryItem {
                name: Some(js_string("E PG Updated")),
                description: Field::Null,
                status: Some("inactive".into()),
                sort_order: Some(0),
                ..Default::default()
            },
            Some(fixture.actor_id),
            None,
        )
        .await
        .expect("same actor same values");
    assert_eq!(noop.row_version, updated.row_version);
    assert_eq!(noop.updated_at, updated.updated_at);
    assert!(matches!(
        service
            .update(
                &updated.id,
                UpdateDictionaryItem {
                    name: Some(js_string("stale")),
                    expected_version: Some(i64::from(before.row_version)),
                    ..Default::default()
                },
                Some(fixture.actor_id),
                None
            )
            .await,
        Err(DictionaryError::Conflict(_))
    ));
    assert!(matches!(
        service
            .require_active_item(&updated.domain, &updated.code.to_utf8_lossy())
            .await,
        Err(DictionaryError::BadRequest(_))
    ));
    let noop_before = rows
        .iter()
        .find(|row| row.id == fixture.dictionary_noop_id.to_string())
        .expect("owned clean row");
    assert_eq!(
        noop_before.updated_by.as_deref(),
        Some(fixture.actor_id.to_string().as_str())
    );
    let noop_after = service
        .update(
            &noop_before.id,
            UpdateDictionaryItem {
                name: Some(noop_before.name.clone()),
                ..Default::default()
            },
            Some(fixture.actor_id),
            None,
        )
        .await
        .expect("dedicated clean row");
    assert_eq!(noop_after.row_version, noop_before.row_version);
    assert_eq!(noop_after.updated_at, noop_before.updated_at);
    let inactive = rows
        .iter()
        .find(|row| row.id == fixture.dictionary_inactive_id.to_string())
        .expect("owned inactive row");
    assert_eq!(inactive.status, "inactive");
    assert!(
        service
            .require_active_item(&inactive.domain, &inactive.code.to_utf8_lossy())
            .await
            .is_err()
    );
    database.close(Duration::from_secs(5)).await.expect("close");
}

#[tokio::test]
#[ignore = "explicit root-owned R2EF PG15 fixture only"]
async fn registered_setting_noop_audit_and_separate_audit_failure_commit() {
    let (config, fixture, database) = target().await;
    let auth = AuthService::new(database.clone(), config.auth);
    let service = SystemSettingsService::new(database.clone());
    let before = service
        .get(&fixture.setting.key)
        .await
        .expect("registered original");
    let value = if before.value == 128 { 129 } else { 128 };
    let updated = service
        .update(
            &fixture.setting.key,
            UpdateSystemSetting {
                value,
                expected_version: Some(i64::from(before.row_version)),
            },
            Some(fixture.actor_id),
            Some(fixture.setting.request_id.clone()),
            None,
            &auth,
        )
        .await
        .expect("setting update");
    assert_eq!(updated.value, value);
    assert_eq!(updated.row_version, before.row_version + 1);
    let noop_id = format!("{}-noop", fixture.setting.request_id);
    let noop = service
        .update(
            &fixture.setting.key,
            UpdateSystemSetting {
                value,
                expected_version: Some(i64::from(updated.row_version)),
            },
            Some(fixture.actor_id),
            Some(noop_id.clone()),
            None,
            &auth,
        )
        .await
        .expect("setting no-op still audits");
    assert_eq!(noop.row_version, updated.row_version);
    assert_eq!(noop.updated_at, updated.updated_at);
    let mut connection = database
        .pool()
        .acquire()
        .await
        .expect("verified pool connection");
    let audits=sqlx::query("SELECT target_type,target_id,result,before_snapshot,after_snapshot,request_id FROM poms.audit_log WHERE operator_id=$1 AND request_id=ANY($2::text[]) ORDER BY request_id").bind(fixture.actor_id).bind(vec![fixture.setting.request_id.clone(),noop_id]).fetch_all(&mut *connection).await.expect("owned audit read");
    assert_eq!(audits.len(), 2);
    for row in &audits {
        assert_eq!(row.get::<String, _>("target_type"), "SystemSetting");
        assert_eq!(row.get::<String, _>("target_id"), fixture.setting.key);
        assert_eq!(row.get::<String, _>("result"), "success");
        let after: Value = row.get("after_snapshot");
        assert_eq!(after["value"], value);
        assert_eq!(after["updatedBy"], fixture.actor_id.to_string());
    }
    let initial = audits
        .iter()
        .find(|row| row.get::<String, _>("request_id") == fixture.setting.request_id)
        .expect("first audit");
    let snapshot: Option<Value> = initial.get("before_snapshot");
    if before.row_version == 0 {
        assert!(snapshot.is_none());
    } else {
        assert_eq!(snapshot.expect("full before")["value"], before.value);
    }
    // Only root's already snapshotted registered setting is mutated. A legal
    // 65-character requestId reaches the independent audit varchar boundary.
    let failure = service
        .update(
            &fixture.setting.key,
            UpdateSystemSetting {
                value: value + 1,
                expected_version: None,
            },
            Some(fixture.actor_id),
            Some("x".repeat(65)),
            None,
            &auth,
        )
        .await;
    assert!(matches!(failure, Err(SystemSettingsError::Internal)));
    let committed = service
        .get(&fixture.setting.key)
        .await
        .expect("business survives audit failure");
    assert_eq!(committed.value, value + 1);
    assert_eq!(committed.row_version, updated.row_version + 1);
    for raw in [
        "\"50\"", "null", "false", "1.5", "0", "501", "1e1000", "1e-1000",
    ] {
        sqlx::query("UPDATE poms.system_setting SET value_json=$1::text::jsonb WHERE key=$2")
            .bind(raw)
            .bind(&fixture.setting.key)
            .execute(&mut *connection)
            .await
            .expect("root-owned corrupt JSON fixture");
        assert!(matches!(
            service.get(&fixture.setting.key).await,
            Err(SystemSettingsError::BadRequest(_))
        ));
    }
    sqlx::query("UPDATE poms.system_setting SET value_json=$1::text::jsonb WHERE key=$2")
        .bind((value + 1).to_string())
        .bind(&fixture.setting.key)
        .execute(&mut *connection)
        .await
        .expect("restore controlled valid value before root exact cleanup");
    assert!(service.get("unknown.setting").await.is_err());
    drop(connection);
    database.close(Duration::from_secs(5)).await.expect("close");
}

#[tokio::test]
#[ignore = "explicit root-owned R2EF PG15 fixture only"]
async fn nine_scopes_borrowed_rollback_utc_and_int4_overflow() {
    let (_, fixture, database) = target().await;
    let mut connection = database
        .pool()
        .acquire()
        .await
        .expect("verified pool connection");
    for case in &fixture.number_cases {
        let before = number_state(&mut connection, &case.scope, case.utc_year).await;
        assert_eq!(before, case.initial_next_value.zip(case.row_version));
        let mut transaction = connection
            .begin()
            .await
            .expect("borrowed outer transaction");
        let scope = scope(&case.scope);
        let instant =
            DateTime::parse_from_rfc3339(&format!("{}-01-01T00:30:00+09:00", case.utc_year + 1))
                .expect("timezone boundary")
                .with_timezone(&Utc);
        let first = BusinessNumberService::next_with_connection(&mut transaction, scope, instant)
            .await
            .expect("same borrowed transaction");
        let value = case.initial_next_value.unwrap_or(1);
        assert_eq!(first, expected(scope, case.utc_year, value));
        let second =
            BusinessNumberService::next_with_connection(&mut transaction, scope, at(case.utc_year))
                .await
                .expect("second borrowed allocation");
        assert_eq!(second, expected(scope, case.utc_year, value + 1));
        assert_eq!(
            number_state(&mut transaction, &case.scope, case.utc_year).await,
            Some((value + 2, case.row_version.unwrap_or(1)))
        );
        transaction.rollback().await.expect("caller rollback");
        assert_eq!(
            number_state(&mut connection, &case.scope, case.utc_year).await,
            before
        );
    }
    let case = fixture
        .number_cases
        .iter()
        .find(|case| case.initial_next_value.is_some())
        .expect("one registered existing row required for overflow");
    let before = number_state(&mut connection, &case.scope, case.utc_year).await;
    let mut transaction = connection
        .begin()
        .await
        .expect("overflow outer transaction");
    assert_eq!(sqlx::query("UPDATE poms.business_number_sequence SET next_value=2147483647 WHERE scope=$1 AND period=$2").bind(&case.scope).bind(case.utc_year.to_string()).execute(&mut *transaction).await.expect("owned overflow fixture").rows_affected(),1);
    let error = BusinessNumberService::next_with_connection(
        &mut transaction,
        scope(&case.scope),
        at(case.utc_year),
    )
    .await
    .expect_err("int4 overflow remains a database failure");
    assert_eq!(
        error
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("22003")
    );
    transaction
        .rollback()
        .await
        .expect("failed caller transaction rollback");
    assert_eq!(
        number_state(&mut connection, &case.scope, case.utc_year).await,
        before
    );
    drop(connection);
    database.close(Duration::from_secs(5)).await.expect("close");
}

#[tokio::test]
#[ignore = "explicit root-owned R2EF PG15 fixture only"]
async fn journalled_concurrency_and_default_connection_consumption() {
    let (_, fixture, database) = target().await;
    let service = BusinessNumberService::new(database.clone());
    let case = &fixture.number_concurrency;
    let mut connection = database
        .pool()
        .acquire()
        .await
        .expect("verified connection");
    assert_eq!(
        number_state(&mut connection, &case.scope, case.utc_year).await,
        Some((case.initial_next_value, case.row_version))
    );
    let mut tasks = Vec::new();
    for _ in 0..case.count {
        let service = service.clone();
        let scope = scope(&case.scope);
        let instant = at(case.utc_year);
        tasks.push(tokio::spawn(async move {
            service.next(scope, Some(instant)).await
        }));
    }
    let mut values = HashSet::new();
    for task in tasks {
        assert!(
            values.insert(
                task.await
                    .expect("allocation task")
                    .expect("committed allocation")
            )
        );
    }
    assert_eq!(values.len(), case.count);
    for offset in 0..case.count {
        assert!(values.contains(&expected(
            scope(&case.scope),
            case.utc_year,
            case.initial_next_value + offset as i32
        )));
    }
    assert_eq!(
        number_state(&mut connection, &case.scope, case.utc_year).await,
        Some((
            case.initial_next_value + case.count as i32,
            case.row_version
        ))
    );
    let standalone = &fixture.number_standalone;
    assert_eq!(
        number_state(&mut connection, &standalone.scope, standalone.utc_year).await,
        standalone.initial_next_value.zip(standalone.row_version)
    );
    let mut caller = connection
        .begin()
        .await
        .expect("separate caller transaction");
    let value = standalone.initial_next_value.unwrap_or(1);
    assert_eq!(
        service
            .next(scope(&standalone.scope), Some(at(standalone.utc_year)))
            .await
            .expect("independent connection allocation"),
        expected(scope(&standalone.scope), standalone.utc_year, value)
    );
    assert!(
        sqlx::query("SELECT 1/0")
            .execute(&mut *caller)
            .await
            .is_err()
    );
    caller
        .rollback()
        .await
        .expect("failed unrelated caller rollback");
    assert_eq!(
        number_state(&mut connection, &standalone.scope, standalone.utc_year).await,
        Some((value + 1, standalone.row_version.unwrap_or(1)))
    );
    drop(connection);
    database.close(Duration::from_secs(5)).await.expect("close");
}
