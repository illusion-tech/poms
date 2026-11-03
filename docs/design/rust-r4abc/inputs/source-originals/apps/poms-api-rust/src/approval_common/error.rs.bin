use super::Text;
use axum::http::StatusCode;
use serde::Serialize;
use std::fmt;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FailureKind {
    Http,
    Error,
    Database,
}

/// The original exception remains observable by an internal caller. L1 does
/// not publish an HTTP endpoint or change the application's global ApiError.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonFailure {
    pub kind: FailureKind,
    pub status: Option<u16>,
    pub message: Text,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sqlstate: Option<String>,
}

impl CommonFailure {
    pub fn http(status: StatusCode, message: impl Into<Text>) -> Self {
        Self {
            kind: FailureKind::Http,
            status: Some(status.as_u16()),
            message: message.into(),
            sqlstate: None,
        }
    }

    pub fn unexpected(message: impl Into<Text>) -> Self {
        Self {
            kind: FailureKind::Error,
            status: None,
            message: message.into(),
            sqlstate: None,
        }
    }

    pub fn database(sqlstate: Option<String>) -> Self {
        Self {
            kind: FailureKind::Database,
            status: None,
            message: Text::from("database operation failed"),
            sqlstate: sqlstate.filter(|code| {
                code.len() == 5
                    && code
                        .bytes()
                        .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit())
            }),
        }
    }
}

impl fmt::Debug for CommonFailure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("CommonFailure")
            .field("kind", &self.kind)
            .field("status", &self.status)
            .field("message", &"[redacted]")
            .field("sqlstate", &self.sqlstate)
            .finish()
    }
}

impl fmt::Display for CommonFailure {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("approval common operation failed")
    }
}

impl std::error::Error for CommonFailure {}

impl From<sqlx::Error> for CommonFailure {
    fn from(error: sqlx::Error) -> Self {
        if let sqlx::Error::Database(database) = &error {
            let mut message = database.message().to_owned();
            if let Some(detail) = database
                .try_downcast_ref::<sqlx::postgres::PgDatabaseError>()
                .and_then(|error| error.detail())
            {
                message.push_str("\n - detail: ");
                message.push_str(detail);
            }
            let mut failure = Self::database(database.code().map(|code| code.into_owned()));
            failure.message = Text::from(message);
            failure
        } else {
            Self::unexpected(error.to_string())
        }
    }
}
