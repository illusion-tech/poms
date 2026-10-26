//! Acceptance-only target guard, shared by the auth and projection DB suites.
//! The launcher independently checks the owner-only persistent instance marker.

use std::{env, str::FromStr, time::Duration};

use poms_api_rust::config::DatabaseConfig;
use sqlx::{ConnectOptions, Connection, PgConnection, Row, postgres::PgConnectOptions};
use tokio::time::timeout;

const DATABASE: &str = "poms_r1c_rust";
const ROLE: &str = "poms_r1c_app";

pub fn guarded_options(
    url: &str,
    pgoptions: bool,
) -> Result<(PgConnectOptions, String), &'static str> {
    if pgoptions {
        return Err("R1C acceptance refuses inherited PGOPTIONS");
    }
    let password = url
        .strip_prefix("postgres://poms_r1c_app:")
        .and_then(|raw| raw.strip_suffix("@127.0.0.1:15432/poms_r1c_rust"))
        .filter(|raw| raw.len() == 64 && raw.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .ok_or("R1C acceptance requires its exact app URL and explicit synthetic secret")?;
    let options = PgConnectOptions::from_str(url).map_err(|_| "invalid controlled URL")?;
    if options.get_host() != "127.0.0.1"
        || options.get_port() != 15432
        || options.get_database() != Some(DATABASE)
        || options.get_username() != ROLE
        || options.get_socket().is_some()
        || options.get_options().is_some()
    {
        return Err("R1C acceptance target does not match the frozen isolation boundary");
    }
    Ok((options.disable_statement_logging(), password.to_owned()))
}

/// No pool after_connect/SET, TEMP, fixture or product query precedes this
/// read-only system metadata check. Errors contain static categories only.
pub async fn target_config() -> Result<DatabaseConfig, &'static str> {
    if env::var("POMS_R1C_DATABASE_TEST").as_deref() != Ok("1") {
        return Err("set explicit POMS_R1C_DATABASE_TEST=1");
    }
    let url =
        env::var("POMS_R1C_DATABASE_TEST_URL").map_err(|_| "explicit isolated URL is required")?;
    let (options, password) = guarded_options(&url, env::var_os("PGOPTIONS").is_some())?;
    let mut connection = timeout(Duration::from_secs(5), PgConnection::connect_with(&options))
        .await
        .map_err(|_| "metadata connection deadline")?
        .map_err(|_| "metadata connection failed")?;
    let row = timeout(Duration::from_secs(5), sqlx::query("SELECT current_database() AS database_name,current_setting('server_version_num') AS version,\
        current_setting('port') AS port,current_setting('poms.r0e_isolated',true) AS isolated,\
        session_user::text AS session_name,current_user::text AS current_name,\
        r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,\
        (SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS role_memberships,\
        pg_has_role(current_user,'poms_r0e_owner','MEMBER') AS owner_member,\
        has_schema_privilege(current_user,'poms','CREATE') AS schema_create \
        FROM pg_roles r WHERE r.rolname=current_user").fetch_one(&mut connection)).await
        .map_err(|_| "metadata guard deadline")?.map_err(|_| "metadata guard query failed")?;
    let text = |column| {
        row.try_get::<String, _>(column)
            .map_err(|_| "invalid guard metadata")
    };
    if text("database_name")? != DATABASE
        || text("version")? != "150012"
        || text("port")? != "15432"
        || text("session_name")? != ROLE
        || text("current_name")? != ROLE
        || row
            .try_get::<Option<String>, _>("isolated")
            .map_err(|_| "invalid marker GUC metadata")?
            .as_deref()
            != Some("on")
    {
        return Err("server identity does not match controlled R1C PG15");
    }
    for flag in [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolbypassrls",
        "rolreplication",
        "owner_member",
        "schema_create",
    ] {
        if row
            .try_get::<bool, _>(flag)
            .map_err(|_| "invalid role flag metadata")?
        {
            return Err("runtime role has elevated privileges");
        }
    }
    if row
        .try_get::<i32, _>("role_memberships")
        .map_err(|_| "invalid role membership metadata")?
        != 0
    {
        return Err("runtime role must not SET ROLE through membership");
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
        max_connections: 8,
        acquire_timeout: Duration::from_secs(5),
        query_timeout: Duration::from_secs(5),
        statement_timeout: Duration::from_secs(4),
    })
}
