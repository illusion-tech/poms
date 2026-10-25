//! Explicit isolated-PG15 acceptance only. No product table/migration/seed.
//! `cargo test --test database -- --ignored` without both opt-in variables fails.
//! The launcher separately checks the persistent marker UUID as owner in a
//! read-only transaction. App tests verify the operator GUC; it is not a claim
//! that the app can read the owner-only r0e_control.marker table.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::{
    env,
    str::FromStr,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};

use poms_api_rust::{
    config::DatabaseConfig,
    database::{Database, DbErrorKind},
};
use sqlx::{
    ConnectOptions, Connection, PgConnection, Row,
    postgres::{PgConnectOptions, PgPoolOptions},
};
use tokio::time::{Instant, sleep, timeout};

const EXPECTED_DATABASE: &str = "poms_r0e_rust";
const EXPECTED_ROLE: &str = "poms_r0e_app";

struct Target {
    config: DatabaseConfig,
    options: PgConnectOptions,
    observer: PgConnection,
}

/// This narrow harness accepts the existing R0E 64-hex private secret only.
/// It does not redefine the product's general URL/password parsing semantics.
fn guarded_options(
    url: &str,
    pgoptions_present: bool,
) -> Result<(PgConnectOptions, String), &'static str> {
    if pgoptions_present {
        return Err("acceptance refuses inherited PGOPTIONS, including an empty value");
    }
    if url.contains('?') || url.contains('#') {
        return Err("acceptance URL must not contain startup options or fragments");
    }
    // Require an explicit R0E secret before asking SQLx to parse: a URL without
    // a password could otherwise trigger its implicit .pgpass file lookup.
    let password = url
        .strip_prefix("postgres://poms_r0e_app:")
        .and_then(|value| value.strip_suffix("@127.0.0.1:15432/poms_r0e_rust"))
        .filter(|value| value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .ok_or("acceptance URL must use the existing R0E hex secret and exact target")?;
    let options =
        PgConnectOptions::from_str(url).map_err(|_| "acceptance URL could not be parsed")?;
    if options.get_host() != "127.0.0.1"
        || options.get_port() != 15432
        || options.get_database() != Some(EXPECTED_DATABASE)
        || options.get_username() != EXPECTED_ROLE
        || options.get_socket().is_some()
        || options.get_options().is_some()
    {
        return Err("acceptance URL does not identify the dedicated app/PG15 target");
    }
    Ok((options.disable_statement_logging(), password.to_owned()))
}

async fn target() -> Target {
    assert_eq!(
        env::var("POMS_R1A_DATABASE_TEST").as_deref(),
        Ok("1"),
        "explicit isolated acceptance requires POMS_R1A_DATABASE_TEST=1"
    );
    let url = env::var("POMS_R1A_DATABASE_TEST_URL")
        .expect("explicit isolated acceptance requires POMS_R1A_DATABASE_TEST_URL");
    let (options, password) = guarded_options(&url, env::var_os("PGOPTIONS").is_some())
        .expect("isolated target guard rejected input");
    let mut observer = timeout(Duration::from_secs(5), PgConnection::connect_with(&options))
        .await
        .expect("isolated metadata connection deadline exceeded")
        .expect("isolated metadata connection failed");

    // Only system metadata is read before the server/identity guard passes.
    // No SET, TEMP or application query precedes this check.
    let metadata = timeout(
        Duration::from_secs(5),
        sqlx::query(
            "SELECT current_database() AS database_name, \
             current_setting('server_version_num') AS version, \
             current_setting('port') AS port, \
             current_setting('poms.r0e_isolated', true) AS isolated, \
             session_user::text AS session_name, current_user::text AS current_name, \
             r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls, \
             has_database_privilege(current_user, current_database(), 'TEMP') AS can_temp, \
             pg_has_role(current_user, 'poms_r0e_owner', 'MEMBER') AS owner_member, \
             EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n \
                     WHERE n.nspname IN ('public', 'poms') \
                     AND has_schema_privilege(current_user, n.oid, 'CREATE')) AS can_create \
             FROM pg_catalog.pg_roles r WHERE r.rolname = current_user",
        )
        .fetch_one(&mut observer),
    )
    .await
    .expect("isolated metadata guard deadline exceeded")
    .expect("isolated metadata guard query failed");
    assert_eq!(
        metadata.get::<String, _>("database_name"),
        EXPECTED_DATABASE
    );
    assert_eq!(metadata.get::<String, _>("version"), "150012");
    assert_eq!(metadata.get::<String, _>("port"), "15432");
    assert_eq!(
        metadata.get::<Option<String>, _>("isolated").as_deref(),
        Some("on")
    );
    assert_eq!(metadata.get::<String, _>("session_name"), EXPECTED_ROLE);
    assert_eq!(metadata.get::<String, _>("current_name"), EXPECTED_ROLE);
    for flag in [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolbypassrls",
        "owner_member",
        "can_create",
    ] {
        assert!(
            !metadata.get::<bool, _>(flag),
            "runtime role has elevated privileges"
        );
    }
    assert!(metadata.get::<bool, _>("can_temp"));

    sqlx::query("SET statement_timeout = '5s'")
        .execute(&mut observer)
        .await
        .expect("observer statement timeout failed");
    Target {
        config: DatabaseConfig {
            host: "127.0.0.1".into(),
            port: 15432,
            username: EXPECTED_ROLE.into(),
            password,
            database: EXPECTED_DATABASE.into(),
            url: Some(url),
            connect: true,
            max_connections: 2,
            acquire_timeout: Duration::from_secs(2),
            query_timeout: Duration::from_secs(2),
            statement_timeout: Duration::from_secs(1),
        },
        options,
        observer,
    }
}

async fn pid(connection: &mut PgConnection) -> i32 {
    sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(connection)
        .await
        .expect("backend PID query failed")
}

async fn pool_pid(database: &Database) -> i32 {
    database
        .with_connection(|connection| {
            Box::pin(async move {
                sqlx::query_scalar("SELECT pg_backend_pid()")
                    .fetch_one(connection)
                    .await
            })
        })
        .await
        .expect("pool PID operation failed")
}

async fn assert_initialized(connection: &mut PgConnection) {
    let row = sqlx::query(
        "SELECT current_setting('TimeZone') AS timezone, \
         current_setting('search_path') AS search_path, \
         session_user::text AS session_name, current_user::text AS current_name, \
         r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls \
         FROM pg_catalog.pg_roles r WHERE r.rolname = current_user",
    )
    .fetch_one(connection)
    .await
    .expect("initialized connection metadata failed");
    assert_eq!(row.get::<String, _>("timezone"), "Etc/GMT-8");
    assert_eq!(row.get::<String, _>("search_path"), "poms, public");
    assert_eq!(row.get::<String, _>("session_name"), EXPECTED_ROLE);
    assert_eq!(row.get::<String, _>("current_name"), EXPECTED_ROLE);
    for flag in ["rolsuper", "rolcreatedb", "rolcreaterole", "rolbypassrls"] {
        assert!(!row.get::<bool, _>(flag));
    }
}

/// Observe only a PID obtained from this test, owned by the dedicated app role.
async fn backend_state(
    observer: &mut PgConnection,
    backend_pid: i32,
) -> Option<(String, bool, String)> {
    let row = sqlx::query(
        "SELECT state, xact_start IS NULL AS no_transaction, query \
         FROM pg_catalog.pg_stat_activity \
         WHERE pid = $1 AND datname = $2 AND usename = $3",
    )
    .bind(backend_pid)
    .bind(EXPECTED_DATABASE)
    .bind(EXPECTED_ROLE)
    .fetch_optional(observer)
    .await
    .expect("own-PID activity observation failed");
    row.map(|row| {
        (
            row.get("state"),
            row.get("no_transaction"),
            row.get("query"),
        )
    })
}

async fn wait_clean(observer: &mut PgConnection, backend_pid: i32, must_disappear: bool) {
    let deadline = Instant::now() + Duration::from_secs(4);
    loop {
        match backend_state(observer, backend_pid).await {
            None => return,
            Some((state, no_transaction, _))
                if !must_disappear && state == "idle" && no_transaction =>
            {
                return;
            }
            _ => {}
        }
        assert!(
            Instant::now() < deadline,
            "test backend retained work/transaction after cleanup"
        );
        sleep(Duration::from_millis(20)).await;
    }
}

#[test]
fn dedicated_target_guard_rejects_other_ports_roles_databases_and_options() {
    let secret = "0".repeat(64);
    let valid = format!("postgres://poms_r0e_app:{secret}@127.0.0.1:15432/poms_r0e_rust");
    assert!(guarded_options(&valid, true).is_err());
    for invalid in [
        valid.replace(":15432/", ":5432/"),
        valid.replace("/poms_r0e_rust", "/poms"),
        valid.replace("poms_r0e_app:", "poms_r0e_owner:"),
        format!("{valid}?options=-c%20role=poms_r0e_owner"),
        format!("{valid}#fragment"),
        valid.replace("127.0.0.1", "localhost"),
    ] {
        assert!(guarded_options(&invalid, false).is_err());
    }
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn every_connection_and_replacement_has_timezone_schema_and_runtime_identity() {
    let target = target().await;
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let mut first = database
        .pool()
        .acquire()
        .await
        .expect("first acquire failed");
    let mut second = database
        .pool()
        .acquire()
        .await
        .expect("second acquire failed");
    let first_pid = pid(&mut first).await;
    let second_pid = pid(&mut second).await;
    assert_ne!(first_pid, second_pid);
    assert_initialized(&mut first).await;
    assert_initialized(&mut second).await;
    first
        .close()
        .await
        .expect("explicit connection close failed");
    let mut replacement = database
        .pool()
        .acquire()
        .await
        .expect("replacement acquire failed");
    let replacement_pid = pid(&mut replacement).await;
    assert_ne!(replacement_pid, first_pid);
    assert_ne!(replacement_pid, second_pid);
    assert_initialized(&mut replacement).await;
    drop(second);
    drop(replacement);
    database
        .close(Duration::from_secs(3))
        .await
        .expect("pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn exhausted_pool_times_out_and_recovers_after_release() {
    let mut target = target().await;
    target.config.max_connections = 1;
    target.config.acquire_timeout = Duration::from_millis(250);
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let connection = database
        .pool()
        .acquire()
        .await
        .expect("holding acquire failed");
    let started = Instant::now();
    let error = database
        .probe_readiness()
        .await
        .expect_err("pool should be exhausted");
    assert_eq!(error.kind(), DbErrorKind::AcquireTimeout);
    assert!(started.elapsed() < Duration::from_secs(3));
    drop(connection);
    database
        .probe_readiness()
        .await
        .expect("pool did not recover");
    database
        .close(Duration::from_secs(3))
        .await
        .expect("pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn explicit_error_and_drop_rollbacks_leave_no_rows_or_transaction() {
    let mut target = target().await;
    target.config.max_connections = 1;
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let mut connection = database.pool().acquire().await.expect("acquire failed");
    let backend_pid = pid(&mut connection).await;
    sqlx::query("CREATE TEMP TABLE r1a_transaction_probe (id integer PRIMARY KEY)")
        .execute(&mut *connection)
        .await
        .expect("TEMP creation failed");

    let mut transaction = connection.begin().await.expect("begin failed");
    sqlx::query("INSERT INTO pg_temp.r1a_transaction_probe VALUES (1)")
        .execute(&mut *transaction)
        .await
        .expect("synthetic insert failed");
    transaction
        .rollback()
        .await
        .expect("explicit rollback failed");

    let mut transaction = connection.begin().await.expect("begin failed");
    sqlx::query("INSERT INTO pg_temp.r1a_transaction_probe VALUES (2)")
        .execute(&mut *transaction)
        .await
        .expect("synthetic insert failed");
    let error = sqlx::query("INSERT INTO pg_temp.r1a_transaction_probe VALUES (2)")
        .execute(&mut *transaction)
        .await
        .expect_err("duplicate should fail");
    assert_eq!(
        error
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23505")
    );
    transaction.rollback().await.expect("error rollback failed");

    let mut transaction = connection.begin().await.expect("begin failed");
    sqlx::query("INSERT INTO pg_temp.r1a_transaction_probe VALUES (3)")
        .execute(&mut *transaction)
        .await
        .expect("synthetic insert failed");
    drop(transaction);
    drop(connection);

    // SQLx queues rollback on Transaction::drop; the pool flushes it before
    // reusing this connection. Verify server state, not only Rust drop completion.
    let mut reused = database.pool().acquire().await.expect("reacquire failed");
    assert_eq!(pid(&mut reused).await, backend_pid);
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM pg_temp.r1a_transaction_probe")
        .fetch_one(&mut *reused)
        .await
        .expect("TEMP verification failed");
    assert_eq!(count, 0);
    assert!(!reused.is_in_transaction());
    assert_initialized(&mut reused).await;
    drop(reused);
    wait_clean(&mut target.observer, backend_pid, false).await;
    database
        .probe_readiness()
        .await
        .expect("readiness after rollback failed");
    database
        .close(Duration::from_secs(3))
        .await
        .expect("pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn server_statement_timeout_returns_57014_and_discards_connection() {
    let mut target = target().await;
    target.config.max_connections = 1;
    target.config.statement_timeout = Duration::from_millis(100);
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let backend_pid = pool_pid(&database).await;
    let error = database
        .with_connection(|connection| {
            Box::pin(async move {
                sqlx::query("SELECT pg_sleep(5)")
                    .execute(connection)
                    .await
                    .map(|_| ())
            })
        })
        .await
        .expect_err("server statement timeout should fail");
    assert_eq!(error.kind(), DbErrorKind::QueryFailed);
    assert_eq!(error.sqlstate(), Some("57014"));
    wait_clean(&mut target.observer, backend_pid, true).await;
    assert_ne!(pool_pid(&database).await, backend_pid);
    database
        .probe_readiness()
        .await
        .expect("replacement readiness failed");
    database
        .close(Duration::from_secs(3))
        .await
        .expect("pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn client_deadline_quarantines_connection_and_server_work_is_bounded() {
    let mut target = target().await;
    target.config.max_connections = 1;
    target.config.query_timeout = Duration::from_millis(80);
    target.config.statement_timeout = Duration::from_millis(300);
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let backend_pid = pool_pid(&database).await;
    let error = database
        .with_connection(|connection| {
            Box::pin(async move {
                sqlx::query("SELECT pg_sleep(5)")
                    .execute(connection)
                    .await
                    .map(|_| ())
            })
        })
        .await
        .expect_err("client deadline should fail");
    assert_eq!(error.kind(), DbErrorKind::QueryTimeout);
    assert_eq!(error.sqlstate(), None);
    // A dropped future is not proof the server stopped immediately. Observe the
    // retired backend until graceful close/statement_timeout removes it.
    wait_clean(&mut target.observer, backend_pid, true).await;
    assert_ne!(pool_pid(&database).await, backend_pid);
    database
        .probe_readiness()
        .await
        .expect("replacement readiness failed");
    database
        .close(Duration::from_secs(3))
        .await
        .expect("pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn externally_cancelled_future_cannot_return_its_connection_to_pool() {
    let mut target = target().await;
    target.config.max_connections = 1;
    target.config.query_timeout = Duration::from_secs(3);
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let backend_pid = pool_pid(&database).await;
    let worker_database = database.clone();
    let worker = tokio::spawn(async move {
        worker_database
            .with_connection(|connection| {
                Box::pin(async move {
                    sqlx::query("SELECT pg_sleep(5)")
                        .execute(connection)
                        .await
                        .map(|_| ())
                })
            })
            .await
    });
    let deadline = Instant::now() + Duration::from_millis(800);
    loop {
        if backend_state(&mut target.observer, backend_pid)
            .await
            .is_some_and(|(state, _, query)| state == "active" && query.contains("pg_sleep"))
        {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "worker did not start its synthetic query"
        );
        sleep(Duration::from_millis(10)).await;
    }
    worker.abort();
    assert!(
        worker
            .await
            .expect_err("worker should be cancelled")
            .is_cancelled()
    );
    wait_clean(&mut target.observer, backend_pid, true).await;
    assert_ne!(pool_pid(&database).await, backend_pid);
    database
        .close(Duration::from_secs(3))
        .await
        .expect("pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn failed_initializer_never_borrows_an_uninitialized_connection() {
    let target = target().await;
    let calls = Arc::new(AtomicUsize::new(0));
    let recorded_calls = Arc::clone(&calls);
    // Fault injection in the real SQLx callback checks its bounded retry policy;
    // successful product initialization is covered by the dual-PID case above.
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(300))
        .after_connect(move |_, _| {
            recorded_calls.fetch_add(1, Ordering::SeqCst);
            Box::pin(async {
                Err(sqlx::Error::Protocol(
                    "synthetic initializer failure".into(),
                ))
            })
        })
        .connect_lazy_with(target.options);
    let result = timeout(Duration::from_secs(2), pool.acquire())
        .await
        .expect("initializer retry exceeded acquisition bound");
    assert!(matches!(result, Err(sqlx::Error::PoolTimedOut)));
    assert!(calls.load(Ordering::SeqCst) > 0);
    timeout(Duration::from_secs(3), pool.close())
        .await
        .expect("fault pool close failed");
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}

#[tokio::test]
#[ignore = "isolated PG15: explicit POMS_R1A_DATABASE_TEST=1 and guarded URL required"]
async fn bounded_close_prevents_new_borrows_and_releases_existing_backend() {
    let mut target = target().await;
    target.config.max_connections = 1;
    let database = Database::new(&target.config)
        .await
        .expect("pool creation failed");
    let mut held = database
        .pool()
        .acquire()
        .await
        .expect("holding acquire failed");
    let backend_pid = pid(&mut held).await;
    let error = database
        .close(Duration::from_millis(50))
        .await
        .expect_err("close must time out while a borrower is held");
    assert_eq!(error.kind(), DbErrorKind::CloseTimeout);
    assert!(database.pool().is_closed());
    assert!(database.probe_readiness().await.is_err());
    drop(held);
    database
        .close(Duration::from_secs(3))
        .await
        .expect("released pool close failed");
    wait_clean(&mut target.observer, backend_pid, true).await;
    target
        .observer
        .close()
        .await
        .expect("observer close failed");
}
