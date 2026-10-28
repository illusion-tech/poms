//! Startup configuration compatible with the existing Nest environment schema.
//!
//! `from_map` is pure; only `load` inspects the process environment or selects an
//! env file. Values from files are merged into a map, never installed globally.

use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;
const RUNTIME_TIMEOUT_MAX_MS: u64 = 300_000;
const KNOWN_ENVIRONMENT_KEYS: &[&str] = &[
    "NODE_ENV",
    "HOST",
    "PORT",
    "CORS_ORIGIN",
    "JWT_SECRET",
    "POMS_SECRET_KEY",
    "POMS_ENV_FILE",
    "IDENTITY_PROVIDER_SECRET_KEY",
    "IDENTITY_PROVIDER_STATE_KEY",
    "FEISHU_OPEN_API_BASE_URL",
    "FEISHU_OAUTH_AUTHORIZE_URL",
    "FEISHU_OAUTH_TOKEN_URL",
    "FEISHU_USER_INFO_URL",
    "FEISHU_USER_SEARCH_URL",
    "FEISHU_USER_BATCH_URL",
    "FEISHU_DEPARTMENT_BATCH_URL",
    "FEISHU_TENANT_ACCESS_TOKEN_URL",
    "FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE",
    "FEISHU_API_TIMEOUT_MS",
    "FEISHU_ORG_DEPARTMENT_PAGE_SIZE",
    "HTTP_PROXY",
    "http_proxy",
    "HTTPS_PROXY",
    "https_proxy",
    "ALL_PROXY",
    "all_proxy",
    "NO_PROXY",
    "no_proxy",
    "npm_config_http_proxy",
    "NPM_CONFIG_HTTP_PROXY",
    "npm_config_https_proxy",
    "NPM_CONFIG_HTTPS_PROXY",
    "npm_config_proxy",
    "NPM_CONFIG_PROXY",
    "npm_config_no_proxy",
    "NPM_CONFIG_NO_PROXY",
    "NODE_EXTRA_CA_CERTS",
    "NODE_TLS_REJECT_UNAUTHORIZED",
    "AUTH_SESSION_IDLE_TIMEOUT_SECONDS",
    "AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS",
    "AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS",
    "AUTH_COOKIE_PATH",
    "AUTH_COOKIE_SECURE",
    "DB_CONNECT",
    "DATABASE_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_DATABASE",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_SCHEMA",
    "DB_DEBUG",
    "MIGRATIONS_TABLE_NAME",
    "DB_MAX_CONNECTIONS",
    "DB_ACQUIRE_TIMEOUT_MS",
    "DB_QUERY_TIMEOUT_MS",
    "DB_STATEMENT_TIMEOUT_MS",
    "SHUTDOWN_TIMEOUT_MS",
];

#[derive(Clone)]
pub struct Config {
    pub environment: String,
    pub host: String,
    pub port: u16,
    pub cors_origins: Vec<String>,
    pub auth: AuthConfig,
    pub providers: crate::provider_support::ProviderSettings,
    pub database: DatabaseConfig,
    pub shutdown_timeout: Duration,
}

#[derive(Clone)]
pub struct AuthConfig {
    pub cookie_path: String,
    pub cookie_secure: bool,
    pub session_idle_timeout: Duration,
    pub session_absolute_timeout: Duration,
    pub session_last_seen_throttle: Duration,
    pub jwt_secret: String,
    pub secret_key: Option<String>,
}

#[derive(Clone)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
    /// Kept as input metadata. Effective discrete fields, including defaults,
    /// have precedence over corresponding URL fields in the existing MikroORM.
    pub url: Option<String>,
    pub connect: bool,
    pub max_connections: u32,
    pub acquire_timeout: Duration,
    pub query_timeout: Duration,
    pub statement_timeout: Duration,
}

// Even host/origin/database names may contain user-supplied sensitive text.
// Debug prints only validated finite choices, numbers, counts and presence.
impl fmt::Debug for Config {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("Config")
            .field("environment", &self.environment)
            .field("host", &"[redacted]")
            .field("port", &self.port)
            .field("cors_origins_count", &self.cors_origins.len())
            .field("auth", &self.auth)
            .field("providers", &self.providers)
            .field("database", &self.database)
            .field("shutdown_timeout", &self.shutdown_timeout)
            .finish()
    }
}

impl fmt::Debug for AuthConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AuthConfig")
            .field("cookie_path", &"[redacted]")
            .field("cookie_secure", &self.cookie_secure)
            .field("session_idle_timeout", &self.session_idle_timeout)
            .field("session_absolute_timeout", &self.session_absolute_timeout)
            .field(
                "session_last_seen_throttle",
                &self.session_last_seen_throttle,
            )
            .field("jwt_secret", &"[redacted]")
            .field("secret_key_present", &self.secret_key.is_some())
            .finish()
    }
}

impl fmt::Debug for DatabaseConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("DatabaseConfig")
            .field("host", &"[redacted]")
            .field("port", &self.port)
            .field("username", &"[redacted]")
            .field("password", &"[redacted]")
            .field("database", &"[redacted]")
            .field("url_present", &self.url.is_some())
            .field("connect", &self.connect)
            .field("max_connections", &self.max_connections)
            .field("acquire_timeout", &self.acquire_timeout)
            .field("query_timeout", &self.query_timeout)
            .field("statement_timeout", &self.statement_timeout)
            .finish()
    }
}

/// Only static field names and static reasons are retained. In particular, no
/// I/O/parse error carrying a path, env value or connection string is attached.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ConfigError {
    pub field: &'static str,
    pub reason: &'static str,
}

impl ConfigError {
    const fn new(field: &'static str, reason: &'static str) -> Self {
        Self { field, reason }
    }
}

impl fmt::Display for ConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "Invalid configuration for {}: {}",
            self.field, self.reason
        )
    }
}

impl Error for ConfigError {}

impl Config {
    pub fn load() -> Result<Self, ConfigError> {
        let mut values = HashMap::new();
        for (name, value) in env::vars_os() {
            let Some(name) = name.to_str() else {
                continue;
            };
            let Some(&field) = KNOWN_ENVIRONMENT_KEYS.iter().find(|&&field| field == name) else {
                continue;
            };
            let value = value
                .into_string()
                .map_err(|_| ConfigError::new(field, "must be valid UTF-8"))?;
            values.insert(name.to_owned(), value);
        }
        let cwd = env::current_dir().map_err(|_| {
            ConfigError::new("POMS_ENV_FILE", "cannot resolve the working directory")
        })?;
        Self::from_sources(values, &cwd)
    }

    /// Parse only the supplied map. This does not read process env or env files.
    pub fn from_map(values: &HashMap<String, String>) -> Result<Self, ConfigError> {
        let environment = value_or(values, "NODE_ENV", "development");
        if !matches!(environment, "development" | "production" | "test") {
            return Err(ConfigError::new(
                "NODE_ENV",
                "must be development, production or test",
            ));
        }
        let cors_origins = value_or(values, "CORS_ORIGIN", "http://localhost:4200")
            .split(',')
            .map(trim_js)
            .filter(|origin| !origin.is_empty())
            .map(str::to_owned)
            .collect::<Vec<_>>();
        if cors_origins.is_empty() || cors_origins.iter().any(|origin| origin == "*") {
            return Err(ConfigError::new(
                "CORS_ORIGIN",
                "requires explicit non-wildcard origins",
            ));
        }
        if cors_origins.iter().any(|origin| {
            origin
                .bytes()
                .any(|byte| byte == 0x7f || (byte < 0x20 && byte != b'\t'))
        }) {
            return Err(ConfigError::new(
                "CORS_ORIGIN",
                "must be a valid HTTP header value",
            ));
        }
        if value_or(values, "DB_SCHEMA", "poms") != "poms" {
            return Err(ConfigError::new(
                "DB_SCHEMA",
                "only the frozen poms schema is supported",
            ));
        }

        let database = DatabaseConfig {
            host: value_or(values, "DB_HOST", "127.0.0.1").to_owned(),
            port: port(values, "DB_PORT", 5432)?,
            username: value_or(values, "DB_USER", "postgres").to_owned(),
            password: value_or(values, "DB_PASSWORD", "postgres").to_owned(),
            database: optional_string(values, "DB_DATABASE")
                .or_else(|| optional_string(values, "DB_NAME"))
                .unwrap_or("poms")
                .to_owned(),
            url: optional_string(values, "DATABASE_URL").map(str::to_owned),
            connect: boolean(values, "DB_CONNECT", false),
            max_connections: u32::try_from(integer(values, "DB_MAX_CONNECTIONS", 5, 1, 1024)?)
                .map_err(|_| {
                    ConfigError::new("DB_MAX_CONNECTIONS", "is outside the supported range")
                })?,
            acquire_timeout: runtime_timeout(values, "DB_ACQUIRE_TIMEOUT_MS", 5000)?,
            query_timeout: runtime_timeout(values, "DB_QUERY_TIMEOUT_MS", 5000)?,
            statement_timeout: runtime_timeout(values, "DB_STATEMENT_TIMEOUT_MS", 5000)?,
        };
        let auth = AuthConfig {
            cookie_path: value_or(values, "AUTH_COOKIE_PATH", "/api").to_owned(),
            cookie_secure: boolean(values, "AUTH_COOKIE_SECURE", environment == "production"),
            session_idle_timeout: seconds(values, "AUTH_SESSION_IDLE_TIMEOUT_SECONDS", 900, 1)?,
            session_absolute_timeout: seconds(
                values,
                "AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS",
                28800,
                1,
            )?,
            session_last_seen_throttle: seconds(
                values,
                "AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS",
                60,
                0,
            )?,
            jwt_secret: value_or(values, "JWT_SECRET", "poms-dev-secret-change-in-production")
                .to_owned(),
            secret_key: values
                .get("POMS_SECRET_KEY")
                .filter(|value| !value.is_empty())
                .cloned(),
        };
        Ok(Self {
            environment: environment.to_owned(),
            host: value_or(values, "HOST", "127.0.0.1").to_owned(),
            port: port(values, "PORT", 3333)?,
            cors_origins,
            auth,
            providers: crate::provider_support::ProviderSettings::from_map(values),
            database,
            shutdown_timeout: runtime_timeout(values, "SHUTDOWN_TIMEOUT_MS", 10000)?,
        })
    }

    fn from_sources(mut values: HashMap<String, String>, cwd: &Path) -> Result<Self, ConfigError> {
        let explicit = values
            .get("POMS_ENV_FILE")
            .map(|value| trim_js(value))
            .filter(|value| !value.is_empty());
        let (selected, override_existing) = if let Some(explicit) = explicit {
            let path = PathBuf::from(explicit);
            let path = if path.is_absolute() {
                path
            } else {
                cwd.join(path)
            };
            if !path.exists() {
                return Err(ConfigError::new(
                    "POMS_ENV_FILE",
                    "the explicit env file does not exist",
                ));
            }
            (Some(path), true)
        } else {
            (
                [cwd.join(".env"), cwd.join("apps/poms-api/.env")]
                    .into_iter()
                    .find(|path| path.exists()),
                false,
            )
        };
        if let Some(selected) = selected {
            let text = fs::read_to_string(selected).map_err(|_| {
                ConfigError::new("POMS_ENV_FILE", "cannot read the selected UTF-8 env file")
            })?;
            for (name, value) in parse_env_file(&text) {
                if override_existing {
                    values.insert(name, value);
                } else {
                    values.entry(name).or_insert(value);
                }
            }
        }
        Self::from_map(&values)
    }
}

fn value_or<'a>(values: &'a HashMap<String, String>, name: &str, default: &'a str) -> &'a str {
    values.get(name).map_or(default, String::as_str)
}

fn optional_string<'a>(values: &'a HashMap<String, String>, name: &str) -> Option<&'a str> {
    values
        .get(name)
        .map(String::as_str)
        .filter(|value| !trim_js(value).is_empty())
}

fn boolean(values: &HashMap<String, String>, name: &str, default: bool) -> bool {
    // Node process.env values are strings. Boolean("false") and Boolean("0")
    // are true; only an explicitly empty string is false.
    values.get(name).map_or(default, |value| !value.is_empty())
}

fn port(
    values: &HashMap<String, String>,
    name: &'static str,
    default: u16,
) -> Result<u16, ConfigError> {
    u16::try_from(integer(
        values,
        name,
        u64::from(default),
        1,
        u64::from(u16::MAX),
    )?)
    .map_err(|_| ConfigError::new(name, "must be in the range 1 through 65535"))
}

fn seconds(
    values: &HashMap<String, String>,
    name: &'static str,
    default: u64,
    min: u64,
) -> Result<Duration, ConfigError> {
    Ok(Duration::from_secs(integer(
        values,
        name,
        default,
        min,
        MAX_SAFE_INTEGER as u64,
    )?))
}

fn runtime_timeout(
    values: &HashMap<String, String>,
    name: &'static str,
    default: u64,
) -> Result<Duration, ConfigError> {
    Ok(Duration::from_millis(integer(
        values,
        name,
        default,
        1,
        RUNTIME_TIMEOUT_MAX_MS,
    )?))
}

fn integer(
    values: &HashMap<String, String>,
    name: &'static str,
    default: u64,
    min: u64,
    max: u64,
) -> Result<u64, ConfigError> {
    let Some(value) = values.get(name) else {
        return Ok(default);
    };
    let parsed =
        js_number(value).ok_or_else(|| ConfigError::new(name, "must be a finite safe integer"))?;
    if !parsed.is_finite() || parsed.fract() != 0.0 || parsed.abs() > MAX_SAFE_INTEGER {
        return Err(ConfigError::new(name, "must be a finite safe integer"));
    }
    if parsed < min as f64 || parsed > max as f64 {
        return Err(ConfigError::new(name, "is outside the supported range"));
    }
    Ok(parsed as u64)
}

fn js_number(value: &str) -> Option<f64> {
    let value = trim_js(value);
    if value.is_empty() {
        return Some(0.0);
    }
    for (prefixes, radix) in [(["0x", "0X"], 16), (["0b", "0B"], 2), (["0o", "0O"], 8)] {
        if let Some(digits) = prefixes
            .iter()
            .find_map(|prefix| value.strip_prefix(prefix))
        {
            if digits.is_empty() || !digits.chars().all(|character| character.is_digit(radix)) {
                return None;
            }
            return u64::from_str_radix(digits, radix)
                .ok()
                .map(|value| value as f64);
        }
    }
    value.parse().ok()
}

fn is_js_whitespace(character: char) -> bool {
    matches!(character, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

fn trim_js(value: &str) -> &str {
    value.trim_matches(is_js_whitespace)
}

fn skip_whitespace(text: &str, position: usize) -> usize {
    position
        + text[position..]
            .chars()
            .take_while(|character| is_js_whitespace(*character))
            .map(char::len_utf8)
            .sum::<usize>()
}

fn line_end(text: &str, position: usize) -> usize {
    text[position..]
        .find(['\n', '\u{2028}', '\u{2029}'])
        .map_or(text.len(), |index| position + index)
}

fn after_line_end(text: &str, position: usize) -> usize {
    text[position..]
        .chars()
        .next()
        .map_or(text.len(), |character| position + character.len_utf8())
}

fn quote_can_end(text: &str, position: usize) -> bool {
    let tail = trim_js(&text[position..line_end(text, position)]);
    tail.is_empty() || tail.starts_with('#')
}

// Node applies /^(['"`])([\s\S]*)\1$/mg after trimming: the captured body is
// greedy across lines, and quotes may start at an internal JS multiline anchor.
fn strip_node_quotes(value: &str) -> String {
    let mut output = String::new();
    let mut copied = 0;
    let mut cursor = 0;
    while cursor < value.len() {
        if let Some(&quote @ (b'\'' | b'"' | b'`')) = value.as_bytes().get(cursor) {
            let closing = value.char_indices().rev().find(|(position, character)| {
                *position > cursor
                    && *character == char::from(quote)
                    && (*position + 1 == value.len()
                        || value[*position + 1..].chars().next().is_some_and(|next| {
                            matches!(next, '\n' | '\r' | '\u{2028}' | '\u{2029}')
                        }))
            });
            if let Some((closing, _)) = closing {
                output.push_str(&value[copied..cursor]);
                output.push_str(&value[cursor + 1..closing]);
                copied = closing + 1;
                cursor = copied;
            }
        }
        cursor = after_line_end(value, line_end(value, cursor));
    }
    output.push_str(&value[copied..]);
    output
}

/// Node dotenv 17.4.2 parse semantics (not dotenv-expand). This scanner does not
/// consult the process environment; `$NAME`/`${NAME}` are literal file values.
/// Its fixed cases below were captured by invoking the installed Node parser.
fn parse_env_file(source: &str) -> HashMap<String, String> {
    let text = source.replace("\r\n", "\n").replace('\r', "\n");
    let bytes = text.as_bytes();
    let mut parsed = HashMap::new();
    let mut cursor = 0;
    while cursor < text.len() {
        cursor = skip_whitespace(&text, cursor);
        if cursor == text.len() {
            break;
        }
        let line_start = cursor;
        if text[cursor..].starts_with("export") {
            let after_export = cursor + "export".len();
            if text[after_export..]
                .chars()
                .next()
                .is_some_and(is_js_whitespace)
            {
                cursor = skip_whitespace(&text, after_export);
            }
        }
        let key_start = cursor;
        while cursor < bytes.len()
            && (bytes[cursor].is_ascii_alphanumeric()
                || matches!(bytes[cursor], b'_' | b'.' | b'-'))
        {
            cursor += 1;
        }
        let key_end = cursor;
        cursor = skip_whitespace(&text, cursor);
        let delimiter = bytes.get(cursor).copied();
        let colon_space = delimiter == Some(b':')
            && text
                .get(cursor + 1..)
                .and_then(|tail| tail.chars().next())
                .is_some_and(is_js_whitespace);
        if key_end == key_start || (delimiter != Some(b'=') && !colon_space) {
            cursor = after_line_end(&text, line_end(&text, line_start));
            continue;
        }
        // Node's colon branch is :\s+? (at least one character), whereas its
        // equals branch is \s*=\s*? and may consume no post-delimiter space.
        let value_start = if colon_space {
            let after_colon = cursor + 1;
            after_colon + text[after_colon..].chars().next().map_or(0, char::len_utf8)
        } else {
            cursor + 1
        };
        let quote_start = skip_whitespace(&text, value_start);
        let mut quoted_end = None;
        if let Some(&quote @ (b'\'' | b'"' | b'`')) = bytes.get(quote_start) {
            let mut backtrack_end = None;
            let mut index = quote_start + 1;
            while index < bytes.len() {
                if bytes[index] == b'\\' && bytes.get(index + 1) == Some(&quote) {
                    // The Node regex first consumes an escaped quote greedily,
                    // but can backtrack and use that quote as the terminator.
                    if quote_can_end(&text, index + 2) {
                        backtrack_end = Some(index + 2);
                    }
                    index += 2;
                } else if bytes[index] == quote {
                    if quote_can_end(&text, index + 1) {
                        quoted_end = Some(index + 1);
                    }
                    break;
                } else {
                    index += 1;
                }
            }
            quoted_end = quoted_end.or(backtrack_end);
        }
        // Unlike JS multiline anchors/comment '.', the unquoted value class
        // [^#\r\n]+ includes Unicode line/paragraph separators as value data.
        let unquoted_line_end = text[value_start..]
            .find('\n')
            .map_or(text.len(), |index| value_start + index);
        let end = quoted_end.unwrap_or_else(|| {
            text[value_start..unquoted_line_end]
                .find('#')
                .map_or(unquoted_line_end, |index| value_start + index)
        });
        let consumed_line_end = if let Some(quoted_end) = quoted_end {
            line_end(&text, quoted_end)
        } else if bytes.get(end) == Some(&b'#') {
            line_end(&text, end)
        } else {
            unquoted_line_end
        };
        let raw = trim_js(&text[value_start..end]);
        let quote = raw.as_bytes().first().copied();
        let value = strip_node_quotes(raw);
        let value = if quote == Some(b'"') {
            value.replace("\\n", "\n").replace("\\r", "\r")
        } else {
            value
        };
        parsed.insert(text[key_start..key_end].to_owned(), value);
        cursor = after_line_end(&text, consumed_line_end);
    }
    parsed
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    fn map(entries: &[(&str, &str)]) -> HashMap<String, String> {
        entries
            .iter()
            .map(|(key, value)| ((*key).to_owned(), (*value).to_owned()))
            .collect()
    }

    struct TempRoot(PathBuf);

    impl TempRoot {
        fn new() -> Self {
            static NEXT: AtomicU64 = AtomicU64::new(0);
            let nanos = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let root = env::temp_dir().join(format!(
                "poms-r1a-config-{}-{nanos}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&root).unwrap();
            Self(root)
        }

        fn write(&self, relative: &str, text: &str) {
            let path = self.0.join(relative);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, text).unwrap();
        }
    }

    impl Drop for TempRoot {
        fn drop(&mut self) {
            // Every test owns a uniquely created temporary root, never a repo,
            // real env file, database directory, or user-supplied target.
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn defaults_match_the_existing_schema_and_frozen_runtime_parameters() {
        let config = Config::from_map(&HashMap::new()).unwrap();
        assert_eq!(config.environment, "development");
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3333);
        assert_eq!(config.cors_origins, ["http://localhost:4200"]);
        assert_eq!(config.auth.cookie_path, "/api");
        assert!(!config.auth.cookie_secure);
        assert_eq!(config.auth.session_idle_timeout, Duration::from_secs(900));
        assert_eq!(
            config.auth.session_absolute_timeout,
            Duration::from_secs(28800)
        );
        assert_eq!(
            config.auth.session_last_seen_throttle,
            Duration::from_secs(60)
        );
        assert!(!config.database.connect);
        assert_eq!(config.database.host, "127.0.0.1");
        assert_eq!(config.database.port, 5432);
        assert_eq!(config.database.database, "poms");
        assert_eq!(config.database.username, "postgres");
        assert_eq!(config.database.max_connections, 5);
        assert_eq!(config.database.acquire_timeout, Duration::from_millis(5000));
        assert_eq!(config.database.query_timeout, Duration::from_millis(5000));
        assert_eq!(
            config.database.statement_timeout,
            Duration::from_millis(5000)
        );
        assert_eq!(config.shutdown_timeout, Duration::from_millis(10000));
    }

    #[test]
    fn booleans_preserve_nonempty_string_truthiness() {
        for value in ["false", "0", "no", "off", " ", "true"] {
            let config = Config::from_map(&map(&[
                ("DB_CONNECT", value),
                ("AUTH_COOKIE_SECURE", value),
            ]))
            .unwrap();
            assert!(config.database.connect, "{value:?}");
            assert!(config.auth.cookie_secure, "{value:?}");
        }
        let empty = Config::from_map(&map(&[
            ("NODE_ENV", "production"),
            ("DB_CONNECT", ""),
            ("AUTH_COOKIE_SECURE", ""),
        ]))
        .unwrap();
        assert!(!empty.database.connect);
        assert!(!empty.auth.cookie_secure);
        let production = Config::from_map(&map(&[("NODE_ENV", "production")])).unwrap();
        assert!(production.auth.cookie_secure);
    }

    #[test]
    fn discrete_database_fields_and_defaults_take_precedence_over_url_metadata() {
        let url = "postgres://url-user:public-url-password@192.0.2.1:25432/url_database";
        let defaults = Config::from_map(&map(&[("DATABASE_URL", url)])).unwrap();
        assert_eq!(defaults.database.host, "127.0.0.1");
        assert_eq!(defaults.database.port, 5432);
        assert_eq!(defaults.database.database, "poms");
        assert_eq!(defaults.database.username, "postgres");
        assert_eq!(defaults.database.url.as_deref(), Some(url));
        let explicit = Config::from_map(&map(&[
            ("DATABASE_URL", url),
            ("DB_HOST", "127.0.0.1"),
            ("DB_PORT", "15432"),
            ("DB_DATABASE", "poms_r0e_rust"),
            ("DB_USER", "poms_r0e_app"),
            ("DB_PASSWORD", "public-synthetic"),
        ]))
        .unwrap();
        assert_eq!(explicit.database.port, 15432);
        assert_eq!(explicit.database.database, "poms_r0e_rust");
        assert_eq!(explicit.database.username, "poms_r0e_app");
        assert_eq!(explicit.database.password, "public-synthetic");
    }

    #[test]
    fn optional_strings_fall_back_without_trimming_nonempty_values() {
        let fallback =
            Config::from_map(&map(&[("DB_DATABASE", " \t "), ("DB_NAME", "alternative")])).unwrap();
        assert_eq!(fallback.database.database, "alternative");
        let preserved = Config::from_map(&map(&[
            ("DB_DATABASE", " surrounding "),
            ("DB_NAME", "ignored"),
        ]))
        .unwrap();
        assert_eq!(preserved.database.database, " surrounding ");
        let defaults = Config::from_map(&map(&[
            ("DB_DATABASE", ""),
            ("DB_NAME", "\u{feff}"),
            ("DATABASE_URL", " "),
        ]))
        .unwrap();
        assert_eq!(defaults.database.database, "poms");
        assert!(defaults.database.url.is_none());
    }

    #[test]
    fn number_coercion_and_port_boundaries_are_explicit() {
        for (raw, expected) in [
            ("3333", 3333),
            (" 3333 ", 3333),
            ("0xD05", 3333),
            ("0b10", 2),
            ("0o10", 8),
            ("1e3", 1000),
            ("65535.0", 65535),
        ] {
            assert_eq!(
                Config::from_map(&map(&[("PORT", raw)])).unwrap().port,
                expected
            );
        }
        for raw in [
            "",
            " ",
            "0",
            "-1",
            "65536",
            "1.5",
            "NaN",
            "Infinity",
            "9007199254740992",
            "0x+10",
            "\u{0085}1",
        ] {
            assert!(Config::from_map(&map(&[("PORT", raw)])).is_err(), "{raw:?}");
        }
        assert!(Config::from_map(&map(&[("DB_PORT", "65536")])).is_err());
        assert_eq!(
            Config::from_map(&map(&[("DB_PORT", "65535")]))
                .unwrap()
                .database
                .port,
            65535
        );
    }

    #[test]
    fn auth_seconds_keep_safe_integer_and_throttle_zero_semantics() {
        let zero =
            Config::from_map(&map(&[("AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS", "")])).unwrap();
        assert_eq!(zero.auth.session_last_seen_throttle, Duration::ZERO);
        let maximum = Config::from_map(&map(&[(
            "AUTH_SESSION_IDLE_TIMEOUT_SECONDS",
            "9007199254740991",
        )]))
        .unwrap();
        assert_eq!(
            maximum.auth.session_idle_timeout.as_secs(),
            9_007_199_254_740_991
        );
        for (field, value) in [
            ("AUTH_SESSION_IDLE_TIMEOUT_SECONDS", "0"),
            ("AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS", "-1"),
            ("AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS", "-1"),
            ("AUTH_SESSION_IDLE_TIMEOUT_SECONDS", "9007199254740992"),
            ("AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS", "1.25"),
        ] {
            assert_eq!(
                Config::from_map(&map(&[(field, value)])).unwrap_err().field,
                field
            );
        }
    }

    #[test]
    fn runtime_timeouts_and_pool_limits_are_bounded() {
        for field in [
            "DB_ACQUIRE_TIMEOUT_MS",
            "DB_QUERY_TIMEOUT_MS",
            "DB_STATEMENT_TIMEOUT_MS",
            "SHUTDOWN_TIMEOUT_MS",
        ] {
            for value in ["1", "300000"] {
                assert!(Config::from_map(&map(&[(field, value)])).is_ok());
            }
            for value in ["0", "-1", "300001", "1.5"] {
                assert_eq!(
                    Config::from_map(&map(&[(field, value)])).unwrap_err().field,
                    field
                );
            }
        }
        for value in ["1", "1024"] {
            assert!(Config::from_map(&map(&[("DB_MAX_CONNECTIONS", value)])).is_ok());
        }
        for value in ["0", "1025"] {
            assert!(Config::from_map(&map(&[("DB_MAX_CONNECTIONS", value)])).is_err());
        }
    }

    #[test]
    fn cors_is_trimmed_explicit_and_safe_to_put_in_a_header() {
        let config = Config::from_map(&map(&[(
            "CORS_ORIGIN",
            " http://localhost:4200, ,https://example.invalid ",
        )]))
        .unwrap();
        assert_eq!(
            config.cors_origins,
            ["http://localhost:4200", "https://example.invalid"]
        );
        for origin in [
            "",
            " , ",
            "*",
            "http://localhost:4200,*",
            "http://one.invalid\r\nInjected: yes",
            "http://one.invalid\0bad",
        ] {
            assert_eq!(
                Config::from_map(&map(&[("CORS_ORIGIN", origin)]))
                    .unwrap_err()
                    .field,
                "CORS_ORIGIN"
            );
        }
    }

    #[test]
    fn schema_and_environment_are_validated_without_echoing_input() {
        assert_eq!(
            Config::from_map(&map(&[("DB_SCHEMA", "other-schema")]))
                .unwrap_err()
                .field,
            "DB_SCHEMA"
        );
        let error =
            Config::from_map(&map(&[("NODE_ENV", "private-value-do-not-print")])).unwrap_err();
        assert_eq!(error.field, "NODE_ENV");
        assert!(!format!("{error} {error:?}").contains("private-value-do-not-print"));
    }

    #[test]
    fn debug_redacts_all_arbitrary_strings_and_secrets() {
        let config = Config::from_map(&map(&[
            ("HOST", "private-host"),
            ("CORS_ORIGIN", "https://private-origin.invalid"),
            ("AUTH_COOKIE_PATH", "/private-path"),
            ("JWT_SECRET", "private-jwt"),
            ("POMS_SECRET_KEY", "private-cipher-key"),
            ("DB_HOST", "private-db-host"),
            ("DB_USER", "private-user"),
            ("DB_PASSWORD", "private-password"),
            ("DB_DATABASE", "private-database"),
            ("DATABASE_URL", "postgres://private-url"),
        ]))
        .unwrap();
        for rendered in [
            format!("{config:?}"),
            format!("{:?}", config.auth),
            format!("{:?}", config.database),
        ] {
            assert!(!rendered.contains("private-"), "{rendered}");
        }
    }

    #[test]
    fn from_map_never_loads_the_env_path() {
        let config = Config::from_map(&map(&[(
            "POMS_ENV_FILE",
            "/nonexistent/synthetic-env-file",
        )]))
        .unwrap();
        assert_eq!(config.port, 3333);
    }

    #[test]
    fn implicit_root_env_wins_app_env_and_does_not_override_supplied_process_values() {
        let temp = TempRoot::new();
        temp.write(".env", "PORT=4444\nDB_DATABASE=root_synthetic\n");
        temp.write(
            "apps/poms-api/.env",
            "PORT=5555\nDB_DATABASE=app_synthetic\n",
        );
        let config = Config::from_sources(map(&[("PORT", "3334")]), &temp.0).unwrap();
        assert_eq!(config.port, 3334);
        assert_eq!(config.database.database, "root_synthetic");
    }

    #[test]
    fn implicit_app_env_is_used_only_when_root_env_is_absent() {
        let temp = TempRoot::new();
        temp.write("apps/poms-api/.env", "PORT=5555\n");
        assert_eq!(
            Config::from_sources(HashMap::new(), &temp.0).unwrap().port,
            5555
        );
        assert_eq!(
            Config::from_sources(map(&[("POMS_ENV_FILE", "  ")]), &temp.0)
                .unwrap()
                .port,
            5555
        );
    }

    #[test]
    fn explicit_relative_or_absolute_env_overrides_process_values() {
        let temp = TempRoot::new();
        temp.write(".env", "PORT=4444\n");
        temp.write(
            "config/synthetic.env",
            "PORT=5555\nDB_PASSWORD=$R0F_LITERAL\n",
        );
        let relative = Config::from_sources(
            map(&[
                ("PORT", "3334"),
                ("POMS_ENV_FILE", " config/synthetic.env "),
            ]),
            &temp.0,
        )
        .unwrap();
        assert_eq!(relative.port, 5555);
        assert_eq!(relative.database.password, "$R0F_LITERAL");
        let absolute = temp
            .0
            .join("config/synthetic.env")
            .to_string_lossy()
            .into_owned();
        assert_eq!(
            Config::from_sources(map(&[("POMS_ENV_FILE", &absolute)]), &temp.0)
                .unwrap()
                .port,
            5555
        );
    }

    #[test]
    fn missing_explicit_env_does_not_fall_back_and_error_does_not_include_path() {
        let temp = TempRoot::new();
        temp.write(".env", "PORT=4444\n");
        let error = Config::from_sources(
            map(&[("POMS_ENV_FILE", "private-synthetic-missing.env")]),
            &temp.0,
        )
        .unwrap_err();
        assert_eq!(error.field, "POMS_ENV_FILE");
        assert!(!format!("{error} {error:?}").contains("private-synthetic"));
    }

    #[test]
    fn unreadable_selected_env_fails_with_a_sanitized_error() {
        let temp = TempRoot::new();
        fs::create_dir(temp.0.join(".env")).unwrap();
        let error = Config::from_sources(HashMap::new(), &temp.0).unwrap_err();
        assert_eq!(error.field, "POMS_ENV_FILE");
        assert!(!format!("{error} {error:?}").contains(temp.0.to_str().unwrap()));
    }

    #[test]
    fn js_whitespace_is_not_rusts_broader_unicode_whitespace_set() {
        assert_eq!(trim_js("\u{feff}\u{00a0}value\u{202f}"), "value");
        assert_eq!(trim_js("\u{0085}value\u{0085}"), "\u{0085}value\u{0085}");
    }

    // Captured on 2026-10-26 by calling installed dotenv.parse(input), not by
    // reimplementing expected behavior. The input and expected map are retained
    // together so the fixture can be replayed directly through Node dotenv.
    const NODE_DOTENV_ORACLE: &str = r####"{
  "oracle": {
    "node": "v24.19.0",
    "package": "dotenv",
    "version": "17.4.2",
    "normalizedMainSha256": "46c50c6399a53bde79a1f85e720a80a073cb959b21072fad44a98b1bde72c3c2"
  },
  "cases": [
    {
      "name": "basics",
      "input": "A=one\r\nB = two # comment\r\nEMPTY=\r\nexport C=three\r\nD: four\r\nNO_DELIMITER\n",
      "expected": {
        "A": "one",
        "B": "two",
        "EMPTY": "",
        "C": "three",
        "D": "four"
      }
    },
    {
      "name": "quotes",
      "input": "S='single # quoted'\nD=\"double # quoted\"\nB=`back # tick`\nN=\"a\\nb\\rc\"\n",
      "expected": {
        "S": "single # quoted",
        "D": "double # quoted",
        "B": "back # tick",
        "N": "a\nb\rc"
      }
    },
    {
      "name": "literal-expansion",
      "input": "A=$HOME\nB=${TOKEN}\nC=\"$HOME/${TOKEN}\"\nD='$HOME'\n",
      "expected": {
        "A": "$HOME",
        "B": "${TOKEN}",
        "C": "$HOME/${TOKEN}",
        "D": "$HOME"
      }
    },
    {
      "name": "backslashes",
      "input": "A=path\\to\\file\nB=\"path\\to\\file\"\nC='path\\to\\file'\nD=\"quote\\\"inside\"\nE='quote\\'inside'\n",
      "expected": {
        "A": "path\\to\\file",
        "B": "path\\to\\file",
        "C": "path\\to\\file",
        "D": "quote\\\"inside",
        "E": "quote\\'inside"
      }
    },
    {
      "name": "unclosed",
      "input": "A=\"unclosed\nB=next\nC='unclosed\nD=last\n",
      "expected": {
        "A": "\"unclosed",
        "B": "next",
        "C": "'unclosed",
        "D": "last"
      }
    },
    {
      "name": "nested-and-tail",
      "input": "A=\"outer 'inner' end\"\nB='outer \"inner\" end'\nC=\"closed\" garbage\nD='one' 'two'\nE=\"closed\" # tail\n",
      "expected": {
        "A": "outer 'inner' end",
        "B": "outer \"inner\" end",
        "C": "\"closed\" garbage",
        "D": "one' 'two",
        "E": "closed"
      }
    },
    {
      "name": "multiline",
      "input": "A=\"first\nsecond\"\nB='first\nsecond'\nC=`first\nsecond`\nD=tail\n",
      "expected": {
        "A": "first\nsecond",
        "B": "first\nsecond",
        "C": "first\nsecond",
        "D": "tail"
      }
    },
    {
      "name": "spacing-comments",
      "input": "A=one#comment\nB=one two  # tail\nC=  \t  \nD = # empty\nE=\"a#b\"\n",
      "expected": {
        "A": "one",
        "B": "one two",
        "C": "",
        "D": "",
        "E": "a#b"
      }
    },
    {
      "name": "keys-export-duplicate",
      "input": "export A=first\nA=second\nexport=literal\n1.odd-key=ok\nB:no-space-ignored\nC: spaced\n",
      "expected": {
        "A": "second",
        "export": "literal",
        "1.odd-key": "ok",
        "C": "spaced"
      }
    },
    {
      "name": "empty-nextline",
      "input": "A=\nB=next\nC=  \nD=\"value\"\n",
      "expected": {
        "A": "",
        "B": "next",
        "C": "",
        "D": "value"
      }
    },
    {
      "name": "crossline-quote",
      "input": "A=\n\"multi start\nend\"\nB=next\n",
      "expected": {
        "A": "multi start\nend",
        "B": "next"
      }
    },
    {
      "name": "escaped-newlines",
      "input": "A=\"\\\\n\"\nB=\"\\r\\n\"\nC='\\n\\r'\nD=`\\n`\n",
      "expected": {
        "A": "\\\n",
        "B": "\r\n",
        "C": "\\n\\r",
        "D": "\\n"
      }
    },
    {
      "name": "unclosed-hash",
      "input": "A=\"open#comment\nB=next\nC='open#tail\n",
      "expected": {
        "A": "\"open",
        "B": "next",
        "C": "'open"
      }
    },
    {
      "name": "invalid-lines",
      "input": "# comment\n!BAD=x\nVALID=yes\nX Y=z\n : x\nQ=\n",
      "expected": {
        "VALID": "yes",
        "Q": ""
      }
    },
    {
      "name": "bom-unicode-space",
      "input": "﻿A=one\nB= two \nC=x\n",
      "expected": {
        "A": "one",
        "B": "two",
        "C": "x"
      }
    },
    {
      "name": "escaped-close-hash",
      "input": "DB_PASSWORD=\"a#\\\"\n",
      "expected": {
        "DB_PASSWORD": "a#\\"
      }
    },
    {
      "name": "comment-unicode-line-separator",
      "input": "# comment PORT=4444\n",
      "expected": {
        "PORT": "4444"
      }
    },
    {
      "name": "comment-unicode-paragraph-separator",
      "input": "# comment PORT=4444\n",
      "expected": {
        "PORT": "4444"
      }
    },
    {
      "name": "unquoted-unicode-separator-is-value-data",
      "input": "DB_PASSWORD=one PORT=4444\n",
      "expected": {
        "DB_PASSWORD": "one PORT=4444"
      }
    },
    {
      "name": "escaped-quote-before-later-close",
      "input": "DB_PASSWORD=\"first\\\"\nB=middle\"\nPORT=4444\n",
      "expected": {
        "DB_PASSWORD": "first\\\"\nB=middle",
        "PORT": "4444"
      }
    },
    {
      "name": "unquoted-inner-ls-single-quotes",
      "input": "DB_PASSWORD=first 'second'\n",
      "expected": {
        "DB_PASSWORD": "first second"
      }
    },
    {
      "name": "unquoted-inner-ps-backticks",
      "input": "DB_PASSWORD=first `second`\n",
      "expected": {
        "DB_PASSWORD": "first second"
      }
    },
    {
      "name": "unquoted-inner-double-keeps-literal-escape",
      "input": "DB_PASSWORD=first \"second\\nline\"\n",
      "expected": {
        "DB_PASSWORD": "first second\\nline"
      }
    },
    {
      "name": "inner-quote-strip-greedy-across-lines",
      "input": "DB_PASSWORD=prefix 'one' 'two' tail\n",
      "expected": {
        "DB_PASSWORD": "prefix one' 'two tail"
      }
    },
    {
      "name": "colon-required-newline-whitespace",
      "input": "PORT:\n4444\n",
      "expected": {
        "PORT": "4444"
      }
    },
    {
      "name": "colon-newline-consumes-following-assignment-as-value",
      "input": "DB_PASSWORD:\nPORT=4444\n",
      "expected": {
        "DB_PASSWORD": "PORT=4444"
      }
    }
  ]
}"####;

    #[test]
    fn dotenv_scanner_matches_twenty_six_actual_node_dotenv_vectors() {
        let fixture: serde_json::Value = serde_json::from_str(NODE_DOTENV_ORACLE).unwrap();
        assert_eq!(fixture["oracle"]["version"], "17.4.2");
        let cases = fixture["cases"].as_array().unwrap();
        assert_eq!(cases.len(), 26);
        for case in cases {
            let input = case["input"].as_str().unwrap();
            let expected: HashMap<String, String> =
                serde_json::from_value(case["expected"].clone()).unwrap();
            assert_eq!(
                parse_env_file(input),
                expected,
                "Node dotenv fixture: {}",
                case["name"]
            );
        }
    }
}
