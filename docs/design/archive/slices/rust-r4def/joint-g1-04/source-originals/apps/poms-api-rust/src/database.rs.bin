//! SQLx pool and bounded connection operations. Transaction owners commit or
//! roll back explicitly; this module never opens or commits a transaction.

use std::{error::Error, fmt, future::Future, pin::Pin, str::FromStr, time::Duration};

use sqlx::{
    ConnectOptions, Connection, PgConnection, PgPool, Postgres, Row,
    pool::PoolConnection,
    postgres::{PgConnectOptions, PgPoolOptions},
};
use tokio::time::timeout;
use url::Url;

use crate::config::DatabaseConfig;

const SESSION_TIME_ZONE: &str = "Etc/GMT-8";
const SESSION_SEARCH_PATH: &str = "poms, public";

/// A borrowed operation may explicitly create a SQLx Transaction, but must
/// commit, roll back or drop it before successfully returning.
pub type ConnectionOperation<'c, T> =
    Pin<Box<dyn Future<Output = Result<T, sqlx::Error>> + Send + 'c>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DbErrorKind {
    InvalidConfiguration,
    Unavailable,
    AcquireTimeout,
    QueryTimeout,
    QueryFailed,
    OpenTransaction,
    CloseTimeout,
}

/// Only a stable category and SQLSTATE are retained. SQLx source messages can
/// contain server/configuration details and must not reach health or logs.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DbError {
    kind: DbErrorKind,
    sqlstate: Option<String>,
}

impl DbError {
    fn new(kind: DbErrorKind) -> Self {
        Self {
            kind,
            sqlstate: None,
        }
    }

    fn acquire(error: sqlx::Error) -> Self {
        let kind = if matches!(&error, sqlx::Error::PoolTimedOut) {
            DbErrorKind::AcquireTimeout
        } else {
            DbErrorKind::Unavailable
        };
        Self::from_sqlx(kind, error)
    }

    fn from_sqlx(kind: DbErrorKind, error: sqlx::Error) -> Self {
        let sqlstate = error
            .as_database_error()
            .and_then(|database_error| database_error.code())
            .map(|code| code.into_owned())
            .filter(|code| {
                code.len() == 5
                    && code
                        .bytes()
                        .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit())
            });
        Self { kind, sqlstate }
    }

    pub fn kind(&self) -> DbErrorKind {
        self.kind
    }

    pub fn sqlstate(&self) -> Option<&str> {
        self.sqlstate.as_deref()
    }
}

impl fmt::Display for DbError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self.kind {
            DbErrorKind::InvalidConfiguration => "database configuration is invalid",
            DbErrorKind::Unavailable => "database is unavailable",
            DbErrorKind::AcquireTimeout => "database connection acquisition timed out",
            DbErrorKind::QueryTimeout => "database operation timed out",
            DbErrorKind::QueryFailed => "database operation failed",
            DbErrorKind::OpenTransaction => "database operation left an open transaction",
            DbErrorKind::CloseTimeout => "database shutdown timed out",
        })
    }
}

impl Error for DbError {}

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
    query_timeout: Duration,
}

impl fmt::Debug for Database {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("Database")
            .field("query_timeout", &self.query_timeout)
            .field("closed", &self.pool.is_closed())
            .finish_non_exhaustive()
    }
}

impl Database {
    /// Eagerly establishes one initialized connection when `connect` is true.
    /// Lazy mode performs no network I/O until acquire/readiness is requested.
    pub async fn new(config: &DatabaseConfig) -> Result<Self, DbError> {
        if config.max_connections == 0
            || config.acquire_timeout.is_zero()
            || config.query_timeout.is_zero()
            || config.statement_timeout.as_millis() == 0
            || config.statement_timeout.as_millis() > i32::MAX as u128
        {
            return Err(DbError::new(DbErrorKind::InvalidConfiguration));
        }

        let options = connection_options(config)?;

        let statement_timeout = format!("{}ms", config.statement_timeout.as_millis());
        let pool_options = PgPoolOptions::new()
            .min_connections(0)
            .max_connections(config.max_connections)
            .acquire_timeout(config.acquire_timeout)
            .after_connect(move |connection, _| {
                let statement_timeout = statement_timeout.clone();
                Box::pin(async move { initialize_connection(connection, &statement_timeout).await })
            });

        let pool = if config.connect {
            pool_options
                .connect_with(options)
                .await
                .map_err(DbError::acquire)?
        } else {
            pool_options.connect_lazy_with(options)
        };

        Ok(Self {
            pool,
            query_timeout: config.query_timeout,
        })
    }

    /// Explicit transactions use `pool().begin()` and borrowed `&mut *tx`.
    /// This is a low-level boundary: callers own transaction/session state,
    /// operation timeouts and cleanup when accessing the raw pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Runs one caller-defined operation with acquire and execution bounds.
    /// Transactions must use SQLx Transaction; operations must not issue raw
    /// BEGIN/SAVEPOINT/COMMIT/ROLLBACK. `is_in_transaction` checks SQLx's tracked
    /// transaction depth, not PostgreSQL's ReadyForQuery transaction status.
    /// Errors, timeouts and external future cancellation quarantine the checked
    /// out connection. A graceful close is scheduled instead of pool reuse.
    /// This does not claim the server has immediately stopped its query:
    /// `statement_timeout` bounds that work independently.
    pub async fn with_connection<T, F>(&self, operation: F) -> Result<T, DbError>
    where
        T: Send,
        F: for<'c> FnOnce(&'c mut PgConnection) -> ConnectionOperation<'c, T> + Send,
    {
        let connection = self.pool.acquire().await.map_err(DbError::acquire)?;
        let mut guard = OperationConnection {
            connection,
            reusable: false,
        };

        match timeout(self.query_timeout, operation(&mut guard.connection)).await {
            Ok(Ok(value)) => {
                if guard.connection.is_in_transaction() {
                    return Err(DbError::new(DbErrorKind::OpenTransaction));
                }
                guard.reusable = true;
                Ok(value)
            }
            Ok(Err(error)) => Err(DbError::from_sqlx(DbErrorKind::QueryFailed, error)),
            Err(_) => Err(DbError::new(DbErrorKind::QueryTimeout)),
        }
    }

    pub async fn probe_readiness(&self) -> Result<(), DbError> {
        self.with_connection(|connection| {
            Box::pin(async move {
                let _: i32 = sqlx::query_scalar("SELECT 1").fetch_one(connection).await?;
                Ok(())
            })
        })
        .await
    }

    /// Closing prevents new borrows even if the shutdown deadline expires.
    /// The process lifecycle owns its final failure/exit policy.
    pub async fn close(&self, grace: Duration) -> Result<(), DbError> {
        timeout(grace, self.pool.close())
            .await
            .map_err(|_| DbError::new(DbErrorKind::CloseTimeout))
    }
}

struct OperationConnection {
    connection: PoolConnection<Postgres>,
    reusable: bool,
}

impl Drop for OperationConnection {
    fn drop(&mut self) {
        if !self.reusable {
            self.connection.close_on_drop();
        }
    }
}

async fn initialize_connection(
    connection: &mut PgConnection,
    statement_timeout: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "SELECT set_config('TimeZone', $1, false), \
         set_config('search_path', $2, false), \
         set_config('statement_timeout', $3, false)",
    )
    .bind(SESSION_TIME_ZONE)
    .bind(SESSION_SEARCH_PATH)
    .bind(statement_timeout)
    .execute(&mut *connection)
    .await?;

    let row = sqlx::query(
        "SELECT current_setting('TimeZone') AS timezone, \
         current_setting('search_path') AS search_path",
    )
    .fetch_one(connection)
    .await?;
    let timezone: String = row.try_get("timezone")?;
    let search_path: String = row.try_get("search_path")?;
    if timezone != SESSION_TIME_ZONE || search_path != SESSION_SEARCH_PATH {
        return Err(sqlx::Error::Protocol(
            "database session initialization failed".into(),
        ));
    }
    Ok(())
}

fn connection_options(config: &DatabaseConfig) -> Result<PgConnectOptions, DbError> {
    let options = match &config.url {
        Some(raw_url) => {
            let mut url = Url::from_str(raw_url)
                .map_err(|_| DbError::new(DbErrorKind::InvalidConfiguration))?;
            // SQLx applies .pgpass during URL parsing when the URL lacks a
            // password. A placeholder prevents that implicit filesystem read;
            // the already-resolved discrete password replaces it below.
            if url.password().is_none() {
                url.set_password(Some("explicit-config-password"))
                    .map_err(|_| DbError::new(DbErrorKind::InvalidConfiguration))?;
            }
            PgConnectOptions::from_url(&url)
                .map_err(|_| DbError::new(DbErrorKind::InvalidConfiguration))?
        }
        None => PgConnectOptions::new_without_pgpass(),
    };
    Ok(options
        .host(&config.host)
        .port(config.port)
        .username(&config.username)
        .password(&config.password)
        .database(&config.database)
        .application_name("poms-api-rust")
        .disable_statement_logging())
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use super::{DbError, DbErrorKind, connection_options};
    use crate::config::DatabaseConfig;
    use sqlx::{ConnectOptions, postgres::PgSslMode};
    use std::time::Duration;

    #[test]
    fn errors_do_not_expose_sqlx_source_text() {
        let error = DbError::from_sqlx(
            DbErrorKind::QueryFailed,
            sqlx::Error::Protocol("secret-password-and-private-url".into()),
        );
        assert_eq!(error.to_string(), "database operation failed");
        assert!(!format!("{error:?}").contains("secret-password"));
        assert_eq!(error.sqlstate(), None);
    }

    #[test]
    fn resolved_discrete_fields_override_url_without_losing_its_tls_policy() {
        let config = DatabaseConfig {
            host: "discrete-host".into(),
            port: 1234,
            username: "discrete-user".into(),
            password: "syntheticpassword".into(),
            database: "discrete-database".into(),
            url: Some("postgres://url-user@url-host:9999/url-database?sslmode=require".into()),
            connect: false,
            max_connections: 2,
            acquire_timeout: Duration::from_secs(1),
            query_timeout: Duration::from_secs(1),
            statement_timeout: Duration::from_secs(1),
        };
        let options = connection_options(&config).expect("synthetic options should parse");
        assert_eq!(options.get_host(), "discrete-host");
        assert_eq!(options.get_port(), 1234);
        assert_eq!(options.get_username(), "discrete-user");
        assert_eq!(options.get_database(), Some("discrete-database"));
        assert_eq!(options.to_url_lossy().password(), Some("syntheticpassword"));
        assert!(matches!(options.get_ssl_mode(), PgSslMode::Require));
    }
}
