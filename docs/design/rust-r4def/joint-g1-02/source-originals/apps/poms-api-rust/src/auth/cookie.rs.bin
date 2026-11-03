//! Existing Nest cookie wire format and JavaScript URI-component semantics.
//! Cookie parsing intentionally takes the first matching pair, even if empty.

use axum::http::{HeaderMap, HeaderValue, header};
use chrono::{DateTime, Datelike, Timelike, Utc};

use crate::config::AuthConfig;

pub const SESSION_COOKIE_NAME: &str = "poms_session";
pub const CSRF_COOKIE_NAME: &str = "poms_csrf";
pub const CSRF_HEADER_NAME: &str = "X-CSRF-Token";

#[derive(Clone)]
pub struct AuthCookieService {
    path: String,
    secure: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CookieError {
    InvalidUriEncoding,
    InvalidHeaderValue,
}

impl AuthCookieService {
    pub fn new(path: String, secure: bool) -> Self {
        Self { path, secure }
    }

    pub fn from_auth_config(config: &AuthConfig) -> Self {
        Self::new(config.cookie_path.clone(), config.cookie_secure)
    }

    pub fn session_token(&self, headers: &HeaderMap) -> Result<Option<String>, CookieError> {
        cookie_from_headers(headers, SESSION_COOKIE_NAME)
    }

    pub fn csrf_token(&self, headers: &HeaderMap) -> Result<Option<String>, CookieError> {
        cookie_from_headers(headers, CSRF_COOKIE_NAME)
    }

    pub fn session_header(
        &self,
        token: &str,
        expires_at: DateTime<Utc>,
        now: DateTime<Utc>,
    ) -> String {
        self.create(SESSION_COOKIE_NAME, token, expires_at, now, true)
    }

    pub fn csrf_header(
        &self,
        token: &str,
        expires_at: DateTime<Utc>,
        now: DateTime<Utc>,
    ) -> String {
        self.create(CSRF_COOKIE_NAME, token, expires_at, now, false)
    }

    pub fn clear_headers(&self) -> [String; 2] {
        [
            self.clear(SESSION_COOKIE_NAME, true),
            self.clear(CSRF_COOKIE_NAME, false),
        ]
    }

    fn create(
        &self,
        name: &str,
        token: &str,
        expires_at: DateTime<Utc>,
        now: DateTime<Utc>,
        http_only: bool,
    ) -> String {
        let max_age = (expires_at.timestamp_millis() - now.timestamp_millis())
            .div_euclid(1000)
            .max(0);
        format!(
            "{name}={}; Max-Age={max_age}; Expires={}; Path={}; SameSite=Lax{}{}",
            encode_uri_component(token),
            utc_cookie_date(expires_at),
            self.path,
            if http_only { "; HttpOnly" } else { "" },
            if self.secure { "; Secure" } else { "" }
        )
    }

    fn clear(&self, name: &str, http_only: bool) -> String {
        format!(
            "{name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path={}; SameSite=Lax{}{}",
            self.path,
            if http_only { "; HttpOnly" } else { "" },
            if self.secure { "; Secure" } else { "" }
        )
    }
}

fn utc_cookie_date(value: DateTime<Utc>) -> String {
    const DAYS: [&str; 7] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const MONTHS: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let year = value.year();
    let year = if year < 0 {
        format!("-{:04}", -year)
    } else {
        format!("{year:04}")
    };
    format!(
        "{}, {:02} {} {year} {:02}:{:02}:{:02} GMT",
        DAYS[value.weekday().num_days_from_monday() as usize],
        value.day(),
        MONTHS[value.month0() as usize],
        value.hour(),
        value.minute(),
        value.second()
    )
}

/// Node HTTP header strings use Latin-1. Do not lose an obs-text cookie by
/// calling HeaderValue::to_str, and do not reinterpret raw bytes as UTF-8.
pub fn header_text(value: &HeaderValue) -> String {
    value
        .as_bytes()
        .iter()
        .map(|byte| char::from(*byte))
        .collect()
}

pub fn cookie_from_headers(headers: &HeaderMap, name: &str) -> Result<Option<String>, CookieError> {
    let text = headers
        .get_all(header::COOKIE)
        .iter()
        .map(header_text)
        .collect::<Vec<_>>()
        .join("; ");
    parse_cookie_header(Some(&text), name)
}

pub fn parse_cookie_header(
    header: Option<&str>,
    name: &str,
) -> Result<Option<String>, CookieError> {
    let prefix = format!("{name}=");
    let Some(pair) = header.and_then(|header| {
        header
            .split(';')
            .map(trim_js)
            .find(|pair| pair.starts_with(&prefix))
    }) else {
        return Ok(None);
    };
    let raw = &pair[prefix.len()..];
    if raw.is_empty() {
        return Ok(None);
    }
    decode_uri_component(raw).map(Some)
}

pub fn encode_uri_component(value: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut result = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            result.push(char::from(byte));
        } else {
            result.push('%');
            result.push(char::from(HEX[(byte >> 4) as usize]));
            result.push(char::from(HEX[(byte & 15) as usize]));
        }
    }
    result
}

pub fn decode_uri_component(value: &str) -> Result<String, CookieError> {
    let mut decoded = Vec::with_capacity(value.len());
    let mut bytes = value.bytes();
    while let Some(byte) = bytes.next() {
        if byte != b'%' {
            decoded.push(byte);
            continue;
        }
        let high = bytes
            .next()
            .and_then(hex)
            .ok_or(CookieError::InvalidUriEncoding)?;
        let low = bytes
            .next()
            .and_then(hex)
            .ok_or(CookieError::InvalidUriEncoding)?;
        decoded.push((high << 4) | low);
    }
    String::from_utf8(decoded).map_err(|_| CookieError::InvalidUriEncoding)
}

fn hex(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

pub fn trim_js(value: &str) -> &str {
    value.trim_matches(|character| matches!(character, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}'))
}

/// Match Node setHeader's Latin-1 validation. Invalid configured cookie header
/// values become the existing generic 500; they are never written to the wire.
pub fn cookie_header_value(value: &str) -> Result<HeaderValue, CookieError> {
    let bytes = value
        .chars()
        .map(|character| {
            u8::try_from(u32::from(character)).map_err(|_| CookieError::InvalidHeaderValue)
        })
        .collect::<Result<Vec<_>, _>>()?;
    HeaderValue::from_bytes(&bytes).map_err(|_| CookieError::InvalidHeaderValue)
}
