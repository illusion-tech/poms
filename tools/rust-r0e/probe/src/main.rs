//! Isolated R0E dependency probe. No product routes, migrations, or application tables.
//! Full mode requires the dedicated loopback PG15 container and operator isolation marker.
//! `--http-only` explicitly reports a partial result with database checks not run.

use std::{env, error::Error, io, str::FromStr, time::Duration};

use axum::{
    Json, Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
    routing::get,
};
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::{
    Connection, PgConnection, Row,
    postgres::{PgConnectOptions, PgSslMode},
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::oneshot,
    time::timeout,
};
use tower::ServiceExt;
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

type ProbeResult<T> = Result<T, Box<dyn Error + Send + Sync>>;
const HEALTH_PATH: &str = "/__r0e_probe/health";
const DB_PORT: u16 = 15432;
const EXPECTED_PG_VERSION: i32 = 150012;

fn require(condition: bool, message: &str) -> ProbeResult<()> {
    if condition {
        Ok(())
    } else {
        Err(io::Error::other(message).into())
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
struct Health {
    scope: String,
    status: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
struct TypedSample {
    #[serde(with = "rust_decimal::serde::str")]
    amount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    ratio: Decimal,
    business_date: NaiveDate,
    occurred_at: DateTime<Utc>,
    #[serde(with = "rust_decimal::serde::str_option")]
    optional_amount: Option<Decimal>,
    sample_id: Uuid,
}

#[utoipa::path(
    get,
    path = "/__r0e_probe/health",
    operation_id = "r0eProbeHealth",
    responses((status = 200, description = "Standalone probe liveness only", body = Health))
)]
async fn health() -> Json<Health> {
    Json(Health {
        scope: "r0e-dependency-probe".into(),
        status: "ok".into(),
    })
}

#[derive(OpenApi)]
#[openapi(paths(health), components(schemas(Health, TypedSample)))]
struct ProbeApi;

fn typed_sample() -> ProbeResult<TypedSample> {
    Ok(TypedSample {
        amount: Decimal::from_str("12345.67")?,
        ratio: Decimal::from_str("0.12345678")?,
        business_date: NaiveDate::from_ymd_opt(2024, 2, 29)
            .ok_or_else(|| io::Error::other("Invalid fixed date sample"))?,
        occurred_at: DateTime::parse_from_rfc3339("2026-10-26T00:00:00.123Z")?.with_timezone(&Utc),
        optional_amount: None,
        sample_id: Uuid::parse_str("00000000-0000-4000-8000-000000000001")?,
    })
}

async fn http_and_types_probe() -> ProbeResult<Value> {
    let app = Router::new().route(HEALTH_PATH, get(health));
    let response = app
        .clone()
        .oneshot(Request::builder().uri(HEALTH_PATH).body(Body::empty())?)
        .await?;
    require(
        response.status() == StatusCode::OK,
        "Tower health status mismatch",
    )?;
    let body = to_bytes(response.into_body(), 4096).await?;
    let parsed: Health = serde_json::from_slice(&body)?;
    require(parsed.status == "ok", "Tower health JSON mismatch")?;

    let listener = TcpListener::bind(("127.0.0.1", 0)).await?;
    let address = listener.local_addr()?;
    let (stop_tx, stop_rx) = oneshot::channel::<()>();
    let server = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                let _ = stop_rx.await;
            })
            .await
    });
    let request_result: ProbeResult<()> = async {
        let mut stream = TcpStream::connect(address).await?;
        stream
            .write_all(
                format!(
                    "GET {HEALTH_PATH} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"
                )
                .as_bytes(),
            )
            .await?;
        let mut raw = Vec::new();
        stream.take(8192).read_to_end(&mut raw).await?;
        let raw = String::from_utf8(raw)?;
        require(
            raw.starts_with("HTTP/1.1 200 "),
            "Loopback HTTP status mismatch",
        )?;
        let (_, body) = raw
            .split_once("\r\n\r\n")
            .ok_or_else(|| io::Error::other("Loopback HTTP response has no body"))?;
        let health: Health = serde_json::from_str(body)?;
        require(
            health.scope == "r0e-dependency-probe",
            "Loopback HTTP body mismatch",
        )?;
        Ok(())
    }
    .await;
    let _ = stop_tx.send(());
    timeout(Duration::from_secs(5), server).await???;
    request_result?;

    let sample = typed_sample()?;
    let wire = serde_json::to_value(&sample)?;
    require(
        wire["amount"] == "12345.67",
        "Decimal JSON must remain a string",
    )?;
    require(
        wire["ratio"] == "0.12345678",
        "Ratio JSON must remain a string",
    )?;
    require(
        wire["business_date"] == "2024-02-29",
        "Business date JSON mismatch",
    )?;
    require(
        wire["optional_amount"].is_null(),
        "Nullable decimal JSON mismatch",
    )?;
    require(
        serde_json::from_value::<TypedSample>(wire)? == sample,
        "Serde round trip mismatch",
    )?;

    let openapi = serde_json::to_value(ProbeApi::openapi())?;
    require(
        openapi.pointer("/components/schemas/TypedSample/properties/amount/type")
            == Some(&Value::String("string".into())),
        "Probe OpenAPI decimal must be a string",
    )?;
    require(
        openapi.pointer("/components/schemas/TypedSample/properties/business_date/format")
            == Some(&Value::String("date".into())),
        "Probe OpenAPI business date format mismatch",
    )?;
    Ok(json!({
        "tower_router": "ok",
        "loopback_http": "ok",
        "serde_decimal_date_uuid_round_trip": "ok",
        "probe_openapi_version": openapi["openapi"],
        "product_openapi_generation": "not-run; existing TS OpenAPI remains authoritative"
    }))
}

async fn database_probe() -> ProbeResult<Value> {
    let database_url = env::var("R0E_DATABASE_URL").map_err(|_| {
        io::Error::other("R0E_DATABASE_URL is required; private URL is never printed")
    })?;
    let expected_database = env::var("R0E_EXPECT_DATABASE")
        .map_err(|_| io::Error::other("R0E_EXPECT_DATABASE is required"))?;
    require(
        ["poms_r0e_rust", "poms_r0e_nest"].contains(&expected_database.as_str()),
        "Only the two dedicated R0E database names are allowed",
    )?;
    require(
        !database_url.contains('?') && !database_url.contains('#'),
        "Probe URL must not contain query/startup overrides or fragments",
    )?;
    let options = PgConnectOptions::from_str(&database_url)
        .map_err(|_| io::Error::other("R0E_DATABASE_URL could not be parsed"))?;
    require(
        options.get_host() == "127.0.0.1",
        "Probe database host must be 127.0.0.1",
    )?;
    require(
        options.get_port() == DB_PORT,
        "Probe database port must be 15432",
    )?;
    require(
        options.get_username() == "poms_r0e_app",
        "Probe database username must be the dedicated runtime role",
    )?;
    require(
        options.get_socket().is_none(),
        "Probe must not use an inherited or configured Unix socket",
    )?;
    require(
        options.get_options().is_none(),
        "Probe refuses inherited PGOPTIONS or other startup option overrides",
    )?;
    require(
        options.get_database() == Some(expected_database.as_str()),
        "Probe URL database must match the dedicated expected database",
    )?;
    let options = options
        .application_name("poms-r0e-dependency-probe")
        .ssl_mode(PgSslMode::Disable);
    let mut connection = timeout(Duration::from_secs(5), PgConnection::connect_with(&options))
        .await
        .map_err(|_| io::Error::other("Isolated SQLx connection timed out"))?
        .map_err(|_| {
            io::Error::other("Isolated SQLx connection failed; check private local configuration")
        })?;

    // Only catalog/current-setting reads precede the server-side isolation checks.
    let metadata = sqlx::query(
        "SELECT current_database() AS database_name, \
         current_setting('server_version_num')::integer AS server_version_num, \
         current_setting('poms.r0e_isolated', true) AS isolation_marker, \
         current_setting('server_encoding') AS encoding, \
         current_setting('TimeZone') AS session_timezone, \
         session_user::text AS session_username, current_user::text AS current_username, \
         r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls, \
         d.datcollate, d.datctype, d.datcollversion, d.datlocprovider::text AS locale_provider \
         FROM pg_catalog.pg_database d \
         JOIN pg_catalog.pg_roles r ON r.rolname = current_user \
         WHERE d.datname = current_database()",
    )
    .fetch_one(&mut connection)
    .await?;
    let database: String = metadata.try_get("database_name")?;
    let version: i32 = metadata.try_get("server_version_num")?;
    let marker: Option<String> = metadata.try_get("isolation_marker")?;
    require(
        database == expected_database,
        "Server reported a different database",
    )?;
    require(
        version == EXPECTED_PG_VERSION,
        "Server must be PostgreSQL 15.12 (150012)",
    )?;
    require(
        marker.as_deref() == Some("on"),
        "Server isolation marker poms.r0e_isolated=on is required",
    )?;
    let session_username: String = metadata.try_get("session_username")?;
    let current_username: String = metadata.try_get("current_username")?;
    let role_superuser: bool = metadata.try_get("rolsuper")?;
    let role_createdb: bool = metadata.try_get("rolcreatedb")?;
    let role_createrole: bool = metadata.try_get("rolcreaterole")?;
    let role_bypassrls: bool = metadata.try_get("rolbypassrls")?;
    require(
        session_username == "poms_r0e_app" && current_username == "poms_r0e_app",
        "Server session/current identities must both be the dedicated runtime role",
    )?;
    require(
        !role_superuser && !role_createdb && !role_createrole && !role_bypassrls,
        "Probe runtime role must not have elevated database or RLS privileges",
    )?;
    // SQLx 0.9 sends TimeZone=UTC at startup, independently of the server default.
    // Initialize the migration's chosen session contract only after isolation is proven.
    let driver_startup_session_timezone: String = metadata.try_get("session_timezone")?;
    sqlx::query("SET TIME ZONE 'Etc/GMT-8'")
        .execute(&mut connection)
        .await?;
    let session_timezone: String = sqlx::query_scalar("SELECT current_setting('TimeZone')")
        .fetch_one(&mut connection)
        .await?;
    let encoding: String = metadata.try_get("encoding")?;
    let locale: String = metadata.try_get("datcollate")?;
    let ctype: String = metadata.try_get("datctype")?;
    let provider: String = metadata.try_get("locale_provider")?;
    let collation_version: Option<String> = metadata.try_get("datcollversion")?;
    require(encoding == "UTF8", "Isolated database must use UTF8")?;
    require(
        locale == "en_US.UTF-8" && ctype == "en_US.UTF-8" && provider == "c",
        "Isolated database locale/provider differs from TEST",
    )?;
    require(
        session_timezone == "Etc/GMT-8",
        "Isolated session TimeZone differs from TEST",
    )?;

    let extensions = sqlx::query("SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'btree_gist') ORDER BY extname")
        .fetch_all(&mut connection)
        .await?;
    let extension_versions = extensions
        .iter()
        .map(|row| {
            Ok((
                row.try_get::<String, _>("extname")?,
                row.try_get::<String, _>("extversion")?,
            ))
        })
        .collect::<Result<std::collections::BTreeMap<_, _>, sqlx::Error>>()?;
    require(
        extension_versions.get("pgcrypto").map(String::as_str) == Some("1.3"),
        "Isolated pgcrypto version differs from TEST",
    )?;
    require(
        extension_versions.get("btree_gist").map(String::as_str) == Some("1.7"),
        "Isolated btree_gist version differs from TEST",
    )?;

    sqlx::query("SET statement_timeout = '10s'")
        .execute(&mut connection)
        .await?;
    sqlx::query("SET lock_timeout = '5s'")
        .execute(&mut connection)
        .await?;
    let before: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('pg_temp.r0e_probe_tx')::text")
            .fetch_one(&mut connection)
            .await?;
    require(
        before.is_none(),
        "Unexpected pre-existing probe temporary table",
    )?;

    let sample = typed_sample()?;
    let payload = json!({"scope": "r0e-probe", "null_value": null, "empty_array": []});
    let mut transaction = connection.begin().await?;
    sqlx::query("CREATE TEMP TABLE r0e_probe_tx (amount numeric(18,2) NOT NULL, ratio numeric(18,8) NOT NULL, business_date date NOT NULL, occurred_at timestamptz NOT NULL, optional_amount numeric(18,2), sample_id uuid NOT NULL, payload jsonb NOT NULL) ON COMMIT DROP")
        .execute(&mut *transaction).await?;
    sqlx::query("INSERT INTO pg_temp.r0e_probe_tx (amount, ratio, business_date, occurred_at, optional_amount, sample_id, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)")
        .bind(sample.amount).bind(sample.ratio).bind(sample.business_date).bind(sample.occurred_at)
        .bind(sample.optional_amount).bind(sample.sample_id).bind(sqlx::types::Json(payload.clone()))
        .execute(&mut *transaction).await?;
    let row = sqlx::query("SELECT amount, ratio, business_date, occurred_at, optional_amount, sample_id, payload FROM pg_temp.r0e_probe_tx")
        .fetch_one(&mut *transaction).await?;
    let decoded = TypedSample {
        amount: row.try_get("amount")?,
        ratio: row.try_get("ratio")?,
        business_date: row.try_get("business_date")?,
        occurred_at: row.try_get("occurred_at")?,
        optional_amount: row.try_get("optional_amount")?,
        sample_id: row.try_get("sample_id")?,
    };
    require(
        decoded == sample,
        "SQLx decimal/date/timestamp/nullable/UUID mapping mismatch",
    )?;
    require(
        serde_json::to_value(&decoded)? == serde_json::to_value(&sample)?,
        "SQLx to Serde string/scale/date projection mismatch",
    )?;
    require(
        row.try_get::<sqlx::types::Json<Value>, _>("payload")?.0 == payload,
        "SQLx JSONB mapping mismatch",
    )?;
    transaction.rollback().await?;
    let after: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('pg_temp.r0e_probe_tx')::text")
            .fetch_one(&mut connection)
            .await?;
    require(
        after.is_none(),
        "Explicit rollback did not remove the temporary table",
    )?;
    connection.close().await?;

    Ok(json!({
        "status": "ok",
        "database_name": database,
        "server_version_num": version,
        "isolation_marker": "on",
        "session_user": session_username,
        "current_user": current_username,
        "runtime_role_attributes": {
            "superuser": role_superuser,
            "createdb": role_createdb,
            "createrole": role_createrole,
            "bypassrls": role_bypassrls
        },
        "encoding": encoding,
        "locale_provider": provider,
        "collation": locale,
        "ctype": ctype,
        "recorded_collation_version": collation_version,
        "recorded_collation_version_matches_test_2_34": collation_version.as_deref() == Some("2.34"),
        "driver_startup_session_timezone": driver_startup_session_timezone,
        "session_timezone_explicitly_initialized": true,
        "session_timezone": session_timezone,
        "extensions": extension_versions,
        "temporary_table_only": true,
        "typed_mapping": "ok",
        "explicit_rollback_removed_temporary_table": true,
        "tls_handshake_verified": false,
        "tls_mode": "disabled only for dedicated loopback probe",
        "full_schema_or_business_compatibility_certified": false
    }))
}

async fn run() -> ProbeResult<Value> {
    let args: Vec<_> = env::args().skip(1).collect();
    let http_only = match args.as_slice() {
        [] => false,
        [flag] if flag == "--http-only" => true,
        _ => return Err(io::Error::other("Usage: probe [--http-only]").into()),
    };
    let http = timeout(Duration::from_secs(10), http_and_types_probe()).await??;
    let database = if http_only {
        json!({"status": "not-run", "reason": "explicit --http-only mode"})
    } else {
        timeout(Duration::from_secs(30), database_probe()).await??
    };
    Ok(json!({
        "scope": "R0E dependency probe; not the R1 application",
        "status": if http_only { "partial" } else { "ok" },
        "declared_rust_version": env!("CARGO_PKG_RUST_VERSION"),
        "http_and_types": http,
        "database": database,
        "product_api_or_migration_ownership_changed": false,
        "performance_measured": false
    }))
}

#[tokio::main]
async fn main() {
    match run().await {
        Ok(report) => println!("{report}"),
        Err(error) => {
            eprintln!("R0E probe failed: {error}");
            std::process::exit(1);
        }
    }
}
