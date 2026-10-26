//! Four existing authentication operations. Original TypeScript remains the DTO
//! documentation authority; transport behavior is checked by real HTTP oracles.

use std::{
    io::{self, Read},
    sync::Arc,
};

use axum::{
    Router,
    body::{Body, Bytes, HttpBody},
    extract::{Request, State},
    http::{HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{MethodRouter, get, post},
};
use chrono::Utc;
use serde_json::{Value, json, value::RawValue};
use tokio::sync::mpsc;

use super::{
    audit::{SecurityResult, SecuritySeverity},
    cookie::{
        AuthCookieService, CSRF_COOKIE_NAME, CSRF_HEADER_NAME, cookie_header_value,
        decode_uri_component, header_text,
    },
    guards::{self, RequestMetadata, RoutePolicy},
    js_json::{JsObject, JsString, decode_string},
    model::{AuthError, AuthErrorKind, AuthUser, Session},
    service::AuthService,
};
use crate::{compat::scalars::js_iso_string, error::ApiError};

#[derive(Clone)]
pub struct AuthHttpState {
    pub service: Arc<AuthService>,
    pub cookies: AuthCookieService,
}

pub fn router(state: AuthHttpState) -> Router {
    Router::new()
        .route(
            "/api/auth/sessions",
            guarded_route(post(login), state.clone(), RoutePolicy::public()),
        )
        .route(
            "/api/auth/session",
            guarded_route(get(current_session), state.clone(), RoutePolicy::public()),
        )
        .route(
            "/api/auth/csrf-token",
            guarded_route(get(csrf_token), state.clone(), RoutePolicy::public()),
        )
        .route(
            "/api/auth/session:logout",
            guarded_route(post(logout), state.clone(), RoutePolicy::authenticated()),
        )
        .with_state(state)
}

/// R2 registers methods through this boundary. RoutePolicy::default() preserves
/// missing-declaration denial. MethodRouter::route_layer wraps actual methods,
/// not its unmatched-method fallback; absent paths/methods retain the root 404.
pub fn guarded_route(
    route: MethodRouter<AuthHttpState>,
    state: AuthHttpState,
    policy: RoutePolicy,
) -> MethodRouter<AuthHttpState> {
    route.route_layer(middleware::from_fn_with_state((state, policy), route_guard))
}

async fn route_guard(
    State((state, policy)): State<(AuthHttpState, RoutePolicy)>,
    request: Request,
    next: Next,
) -> Response {
    let (parts, body) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    match guards::authorize(
        &state.service,
        &state.cookies,
        &policy,
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(resolved) => {
            let mut parts = parts;
            if let Some(resolved) = resolved {
                parts.extensions.insert(Arc::new(resolved));
            }
            next.run(Request::from_parts(parts, body)).await
        }
        Err(response) => response,
    }
}

/// Documentation metadata is mechanically exported from the existing TS-owned
/// complete specification. This does not install a response projection or prove
/// handler behavior. Runtime behavior has independent HTTP/Serde tests.
pub fn openapi() -> Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r1c/http-openapi.json"))
        .unwrap_or_else(|_| panic!("invalid generated R1C OpenAPI metadata"))
}

#[derive(Clone, Default)]
pub struct ParsedBody {
    raw: Option<Arc<str>>,
}

const BODY_LIMIT: usize = 100 * 1024;

struct ChunkReader {
    receiver: mpsc::Receiver<Result<Bytes, ()>>,
    current: Bytes,
    offset: usize,
}
impl Read for ChunkReader {
    fn read(&mut self, output: &mut [u8]) -> io::Result<usize> {
        if output.is_empty() {
            return Ok(0);
        }
        while self.offset == self.current.len() {
            match self.receiver.blocking_recv() {
                Some(Ok(chunk)) => {
                    self.current = chunk;
                    self.offset = 0;
                }
                Some(Err(())) => return Err(io::Error::other("request body read failed")),
                None => return Ok(0),
            }
        }
        let length = output.len().min(self.current.len() - self.offset);
        output[..length].copy_from_slice(&self.current[self.offset..self.offset + length]);
        self.offset += length;
        Ok(length)
    }
}

#[derive(Clone, Copy)]
enum BodyKind {
    Json,
    Form,
}

/// Nest's Express parsers execute before guards, including on unknown routes.
/// Compressed input is streamed through a bounded channel, then limited after
/// inflation; an encoded-body cap would reject valid Nest compressed requests.
pub async fn body_parser(mut request: Request, next: Next) -> Response {
    let has_body = request.headers().contains_key(header::CONTENT_LENGTH)
        || request.headers().contains_key(header::TRANSFER_ENCODING);
    if !has_body {
        request.extensions_mut().insert(ParsedBody::default());
        return next.run(request).await;
    }
    let content_type = request
        .headers()
        .get(header::CONTENT_TYPE)
        .map(header_text)
        .unwrap_or_default();
    let mut parameters = content_type.split(';');
    let kind = match parameters
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "application/json" => BodyKind::Json,
        "application/x-www-form-urlencoded" => BodyKind::Form,
        _ => {
            request.extensions_mut().insert(ParsedBody::default());
            return next.run(request).await;
        }
    };
    let charset = parameters
        .find_map(|part| {
            part.trim()
                .split_once('=')
                .filter(|(name, _)| name.trim().eq_ignore_ascii_case("charset"))
                .map(|(_, value)| value.trim().trim_matches('"').to_ascii_lowercase())
        })
        .unwrap_or_else(|| "utf-8".into());
    let valid_charset = match kind {
        BodyKind::Json => charset.starts_with("utf-"),
        BodyKind::Form => ["utf-8", "iso-8859-1"].contains(&charset.as_str()),
    };
    if !valid_charset {
        return parser_error(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            format!("unsupported charset \"{}\"", charset.to_uppercase()),
        );
    }
    let encoding = request
        .headers()
        .get(header::CONTENT_ENCODING)
        .map(header_text)
        .unwrap_or_else(|| "identity".into())
        .to_ascii_lowercase();
    if !["identity", "gzip", "deflate", "br"].contains(&encoding.as_str()) {
        return parser_error(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            format!("unsupported content encoding \"{encoding}\""),
        );
    }
    let (mut parts, mut body) = request.into_parts();
    let (sender, receiver) = mpsc::channel(2);
    let worker = tokio::task::spawn_blocking(move || {
        let reader = ChunkReader {
            receiver,
            current: Bytes::new(),
            offset: 0,
        };
        let decoder: Box<dyn Read> = match encoding.as_str() {
            "gzip" => Box::new(flate2::read::MultiGzDecoder::new(reader)),
            "deflate" => Box::new(flate2::read::ZlibDecoder::new(reader)),
            "br" => Box::new(brotli_decompressor::Decompressor::new(reader, 4096)),
            _ => Box::new(reader),
        };
        let mut decoded = Vec::new();
        match decoder
            .take((BODY_LIMIT + 1) as u64)
            .read_to_end(&mut decoded)
        {
            Ok(_) if decoded.len() > BODY_LIMIT => Err(StatusCode::PAYLOAD_TOO_LARGE),
            Ok(_) => Ok(decoded),
            Err(_) => Err(StatusCode::BAD_REQUEST),
        }
    });
    while let Some(frame) =
        std::future::poll_fn(|cx| std::pin::Pin::new(&mut body).poll_frame(cx)).await
    {
        match frame {
            Ok(frame) => {
                if let Ok(data) = frame.into_data()
                    && sender.send(Ok(data)).await.is_err()
                {
                    break;
                }
            }
            Err(_) => {
                let _ = sender.send(Err(())).await;
                break;
            }
        }
    }
    drop(sender);
    let bytes = match worker.await {
        Ok(Ok(bytes)) => bytes,
        Ok(Err(status)) => {
            return parser_error(
                status,
                if status == StatusCode::PAYLOAD_TOO_LARGE {
                    "request entity too large"
                } else {
                    "Bad Request"
                },
            );
        }
        Err(_) => return ApiError::internal().into_response(),
    };
    let text = match decode_body(&bytes, &charset) {
        Ok(text) => text,
        Err(BodyDecodeError::InvalidEscape { units, position }) => {
            return unexpected_token(&units, position);
        }
        Err(BodyDecodeError::UnsupportedCharset) => {
            return parser_error(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                format!("unsupported charset \"{}\"", charset.to_uppercase()),
            );
        }
    };
    let text = text.strip_prefix('\u{feff}').unwrap_or(&text);
    let raw = match kind {
        BodyKind::Json => {
            let raw = if text.is_empty() { "{}" } else { text };
            let first = raw
                .trim_start_matches([' ', '\t', '\r', '\n'])
                .chars()
                .next();
            if !matches!(first, Some('{' | '[')) {
                return json_syntax_error(raw, None);
            }
            if let Err(error) = serde_json::from_str::<&RawValue>(raw) {
                return json_syntax_error(raw, Some(&error));
            }
            raw.to_owned()
        }
        BodyKind::Form => match form_json(text, &charset) {
            Ok(raw) => raw,
            Err(response) => return response,
        },
    };
    parts.extensions.insert(ParsedBody {
        raw: Some(raw.into()),
    });
    next.run(Request::from_parts(parts, Body::empty())).await
}

fn parser_error(status: StatusCode, message: impl Into<String>) -> Response {
    ApiError::http_like(status, message).into_response()
}

enum BodyDecodeError {
    UnsupportedCharset,
    InvalidEscape { units: Vec<u16>, position: usize },
}

fn decode_body(bytes: &[u8], charset: &str) -> Result<String, BodyDecodeError> {
    match charset {
        "utf-8" => Ok(String::from_utf8_lossy(bytes).into_owned()),
        "iso-8859-1" => Ok(bytes.iter().copied().map(char::from).collect()),
        "utf-16le" | "utf-16be" | "utf-16" => {
            let be =
                charset == "utf-16be" || (charset == "utf-16" && bytes.starts_with(&[0xfe, 0xff]));
            let units = bytes
                .as_chunks::<2>()
                .0
                .iter()
                .map(|pair| {
                    if be {
                        u16::from_be_bytes([pair[0], pair[1]])
                    } else {
                        u16::from_le_bytes([pair[0], pair[1]])
                    }
                })
                .collect::<Vec<_>>();
            let mut quoted = false;
            let mut escaped = false;
            for (index, unit) in units.iter().copied().enumerate() {
                if escaped {
                    if (0xd800..=0xdfff).contains(&unit) {
                        return Err(BodyDecodeError::InvalidEscape {
                            units,
                            position: index,
                        });
                    }
                    escaped = false;
                    continue;
                }
                if unit == u16::from(b'"') {
                    quoted = !quoted;
                } else if quoted && unit == u16::from(b'\\') {
                    escaped = true;
                }
            }
            Ok(preserve_utf16(&units))
        }
        "utf-32le" | "utf-32be" | "utf-32" => {
            let be = charset == "utf-32be"
                || (charset == "utf-32" && bytes.starts_with(&[0, 0, 0xfe, 0xff]));
            Ok(bytes
                .as_chunks::<4>()
                .0
                .iter()
                .map(|part| {
                    let raw = [part[0], part[1], part[2], part[3]];
                    char::from_u32(if be {
                        u32::from_be_bytes(raw)
                    } else {
                        u32::from_le_bytes(raw)
                    })
                    .unwrap_or('\u{fffd}')
                })
                .collect())
        }
        _ => Err(BodyDecodeError::UnsupportedCharset),
    }
}

fn unexpected_token(units: &[u16], position: usize) -> Response {
    let mut message = "Unexpected token '".encode_utf16().collect::<Vec<_>>();
    message.push(units.get(position).copied().unwrap_or(u16::from(b' ')));
    message.extend("', ".encode_utf16());
    let (start, end) = if units.len() <= 20 {
        (0, units.len())
    } else {
        (
            position.saturating_sub(10),
            if position < 10 {
                20.min(units.len())
            } else {
                (position + 10).min(units.len())
            },
        )
    };
    if start > 0 {
        message.extend("...".encode_utf16());
    }
    message.push(u16::from(b'"'));
    message.extend_from_slice(&units[start..end]);
    message.push(u16::from(b'"'));
    if end < units.len() {
        message.extend("...".encode_utf16());
    }
    message.extend(" is not valid JSON".encode_utf16());
    raw_json(
        StatusCode::BAD_REQUEST,
        format!(
            "{{\"message\":{},\"error\":\"Bad Request\",\"statusCode\":400}}",
            JsString::from_code_units(message).json()
        ),
    )
}

fn preserve_utf16(units: &[u16]) -> String {
    let mut output = String::new();
    for character in char::decode_utf16(units.iter().copied()) {
        match character {
            Ok(character) => output.push(character),
            Err(error) => {
                use std::fmt::Write;
                let _ = write!(output, "\\u{:04x}", error.unpaired_surrogate());
            }
        }
    }
    output
}

fn positioned_json_error(units: &[u16], prefix: &str, position: usize) -> Response {
    let position = position.min(units.len());
    let line = units[..position].iter().filter(|unit| **unit == 10).count() + 1;
    let column = position
        - units[..position]
            .iter()
            .rposition(|unit| *unit == 10)
            .map_or(0, |index| index + 1)
        + 1;
    let context = if prefix.ends_with("JSON") {
        ""
    } else {
        " in JSON"
    };
    ApiError::message(
        StatusCode::BAD_REQUEST,
        format!("{prefix}{context} at position {position} (line {line} column {column})"),
    )
    .into_response()
}

fn lexical_json_error(units: &[u16]) -> Option<(&'static str, usize)> {
    let (mut quoted, mut index) = (false, 0);
    while index < units.len() {
        let unit = units[index];
        if !quoted {
            if unit == 34 {
                quoted = true;
            }
            index += 1;
            continue;
        }
        if unit == 34 {
            quoted = false;
            index += 1;
            continue;
        }
        if unit < 32 {
            return Some(("Bad control character in string literal", index));
        }
        if unit == 92 {
            index += 1;
            if index == units.len() {
                return Some(("Unterminated string", index));
            }
            match units[index] {
                34 | 92 | 47 | 98 | 102 | 110 | 114 | 116 => {}
                117 => {
                    for _ in 0..4 {
                        index += 1;
                        if index == units.len()
                            || !char::from_u32(u32::from(units[index]))
                                .is_some_and(|unit| unit.is_ascii_hexdigit())
                        {
                            return Some(("Bad Unicode escape", index));
                        }
                    }
                }
                _ => return Some(("Bad escaped character", index)),
            }
        }
        index += 1;
    }
    quoted.then_some(("Unterminated string", units.len()))
}

fn json_syntax_error(raw: &str, error: Option<&serde_json::Error>) -> Response {
    let units = raw.encode_utf16().collect::<Vec<_>>();
    let first = units
        .iter()
        .position(|unit| ![32, 9, 13, 10].contains(unit));
    let Some(first) = first else {
        return ApiError::message(StatusCode::BAD_REQUEST, "Unexpected end of JSON input")
            .into_response();
    };
    if ![123, 91].contains(&units[first]) {
        return unexpected_token(&units, first);
    }
    if let Some((prefix, position)) = lexical_json_error(&units) {
        return positioned_json_error(&units, prefix, position);
    }
    let Some(error) = error else {
        return ApiError::message(StatusCode::BAD_REQUEST, "Unexpected end of JSON input")
            .into_response();
    };
    let detail = error.to_string().replace(char::from(96), "'");
    let detail = detail.split(" at line ").next().unwrap_or("");
    let line_start = raw
        .split_inclusive('\n')
        .take(error.line().saturating_sub(1))
        .map(str::len)
        .sum::<usize>();
    let mut byte_position = (line_start + error.column().saturating_sub(1)).min(raw.len());
    while !raw.is_char_boundary(byte_position) {
        byte_position = byte_position.saturating_sub(1);
    }
    let position = if error.is_eof() {
        units.len()
    } else {
        raw[..byte_position].encode_utf16().count()
    };
    let previous = units[..position]
        .iter()
        .rev()
        .find(|unit| ![32, 9, 13, 10].contains(unit))
        .copied();
    let prefix = if detail.contains("key must be a string") || detail.contains("trailing comma") {
        Some(if previous == Some(44) {
            "Expected double-quoted property name"
        } else {
            "Expected property name or '}'"
        })
    } else if detail.contains("expected ':'") {
        Some("Expected ':' after property name")
    } else if detail.contains("expected ',' or '}'") {
        Some("Expected ',' or '}' after property value")
    } else if detail.contains("expected ',' or ']'") {
        Some("Expected ',' or ']' after array element")
    } else if detail.contains("trailing characters") {
        Some("Unexpected non-whitespace character after JSON")
    } else if detail.contains("EOF while parsing an object") {
        Some(if previous == Some(123) {
            "Expected property name or '}'"
        } else if previous == Some(44) {
            "Expected double-quoted property name"
        } else {
            "Expected ',' or '}' after property value"
        })
    } else if detail.contains("EOF while parsing a list") && previous != Some(91) {
        Some("Expected ',' or ']' after array element")
    } else if detail.contains("invalid number") {
        Some(if previous == Some(46) {
            "Unterminated fractional number"
        } else if matches!(previous, Some(101 | 69 | 43)) {
            "Exponent part is missing a number"
        } else if previous == Some(45) {
            "No number after minus sign"
        } else {
            "Unexpected number"
        })
    } else {
        None
    };
    if let Some(prefix) = prefix {
        positioned_json_error(&units, prefix, position)
    } else if error.is_eof() {
        ApiError::message(StatusCode::BAD_REQUEST, "Unexpected end of JSON input").into_response()
    } else {
        unexpected_token(&units, position)
    }
}

#[expect(
    clippy::result_large_err,
    reason = "Keep the native rejection response and its existing headers intact at the HTTP boundary."
)]
fn form_json(text: &str, charset: &str) -> Result<String, Response> {
    let fields = text
        .split('&')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if fields.len() > 1000 {
        return Err(parser_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "too many parameters",
        ));
    }
    let mut object = serde_json::Map::<String, Value>::new();
    for field in fields {
        let (key, value) = field.split_once('=').unwrap_or((field, ""));
        let decode = |value: &str| {
            let value = value.replace('+', " ");
            if charset == "iso-8859-1" {
                let mut bytes = value.bytes();
                let mut decoded = String::new();
                while let Some(byte) = bytes.next() {
                    if byte == b'%' {
                        let high = bytes.next();
                        let low = bytes.next();
                        if let (Some(high), Some(low)) = (high, low)
                            && let (Some(high), Some(low)) =
                                ((high as char).to_digit(16), (low as char).to_digit(16))
                        {
                            decoded.push(char::from((high * 16 + low) as u8));
                            continue;
                        }
                        decoded.push('%');
                        if let Some(high) = high {
                            decoded.push(char::from(high));
                        }
                        if let Some(low) = low {
                            decoded.push(char::from(low));
                        }
                    } else {
                        decoded.push(char::from(byte));
                    }
                }
                decoded
            } else {
                decode_uri_component(&value).unwrap_or(value)
            }
        };
        let key = decode(key);
        let value = decode(value);
        let (key, nested) = if let Some((base, rest)) = key.split_once('[') {
            if let Some(rest) = rest.strip_suffix(']') {
                (base.to_owned(), Some(rest.to_owned()))
            } else {
                (key, None)
            }
        } else {
            (key, None)
        };
        if key == "__proto__" {
            continue;
        }
        let value = match nested {
            Some(key) if key.is_empty() || key.bytes().all(|byte| byte.is_ascii_digit()) => {
                json!([value])
            }
            Some(key) => json!({key:value}),
            None => Value::String(value),
        };
        if let Some(previous) = object.get_mut(&key) {
            if let (Value::Object(previous), Value::Object(next)) = (&mut *previous, &value) {
                previous.extend(next.clone());
                continue;
            }
            if let Value::Array(values) = previous {
                values.push(value);
            } else {
                *previous = json!([previous.clone(), value]);
            }
        } else {
            object.insert(key, value);
        }
    }
    serde_json::to_string(&object).map_err(|_| ApiError::internal().into_response())
}

#[expect(
    clippy::result_large_err,
    reason = "Keep the native rejection response and its existing headers intact at the HTTP boundary."
)]
fn validate_object(body: &ParsedBody) -> Result<JsObject<'_>, Response> {
    let Some(raw) = body.raw.as_deref() else {
        return Err(validation_errors(vec![invalid_type(
            "object",
            "undefined",
            None,
        )]));
    };
    JsObject::parse(raw)
        .map_err(|_| validation_errors(vec![invalid_type("object", json_type(raw), None)]))
}

fn json_type(raw: &str) -> &'static str {
    match raw
        .trim_start_matches([' ', '\t', '\r', '\n'])
        .as_bytes()
        .first()
    {
        Some(b'"') => "string",
        Some(b'{') => "object",
        Some(b'[') => "array",
        Some(b'n') => "null",
        Some(b't' | b'f') => "boolean",
        _ => "number",
    }
}

fn invalid_type(expected: &str, received: &str, field: Option<&str>) -> Value {
    json!({"expected":expected,"code":"invalid_type","path":field.map_or_else(Vec::new,|field|vec![field]),"message":format!("Invalid input: expected {expected}, received {received}")})
}
fn validation_errors(errors: Vec<Value>) -> Response {
    ApiError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed","errors":errors}),
    )
    .into_response()
}

#[expect(
    clippy::result_large_err,
    reason = "Keep the native rejection response and its existing headers intact at the HTTP boundary."
)]
fn login_fields(body: &ParsedBody) -> Result<(JsString, JsString), Response> {
    let object = validate_object(body)?;
    let mut errors = Vec::new();
    let mut values = Vec::new();
    for field in ["username", "password"] {
        match object.get(field) {
            None => errors.push(invalid_type("string", "undefined", Some(field))),
            Some(raw) => match decode_string(raw.get()) {
                Ok(value) if !value.is_empty() => values.push(value),
                Ok(_) => errors.push(json!({"origin":"string","code":"too_small","minimum":1,"inclusive":true,"path":[field],"message":"Too small: expected string to have >=1 characters"})),
                Err(_) => errors.push(invalid_type("string", json_type(raw.get()), Some(field))),
            },
        }
    }
    if !errors.is_empty() {
        return Err(validation_errors(errors));
    }
    let mut values = values.into_iter();
    match (values.next(), values.next()) {
        (Some(username), Some(password)) => Ok((username, password)),
        _ => Err(ApiError::internal().into_response()),
    }
}

#[expect(
    clippy::result_large_err,
    reason = "Keep the native rejection response and its existing headers intact at the HTTP boundary."
)]
fn logout_fields(body: &ParsedBody) -> Result<(), Response> {
    let object = validate_object(body)?;
    let keys = object.keys();
    if keys.is_empty() {
        return Ok(());
    }
    let keys_json = format!(
        "[{}]",
        keys.iter()
            .map(|key| key.json())
            .collect::<Vec<_>>()
            .join(",")
    );
    // The message itself may contain lone UTF-16 surrogates, too. Build its
    // code units and serialize as JSON escapes instead of narrowing to String.
    let prefix = if keys.len() == 1 {
        "Unrecognized key: "
    } else {
        "Unrecognized keys: "
    };
    let mut message = prefix.encode_utf16().collect::<Vec<_>>();
    for (index, key) in keys.iter().enumerate() {
        if index > 0 {
            message.extend(", ".encode_utf16());
        }
        message.push(u16::from(b'"'));
        message.extend(key.as_code_units());
        message.push(u16::from(b'"'));
    }
    let message = JsString::from_code_units(message).json();
    let raw = format!(
        "{{\"statusCode\":400,\"message\":\"Validation failed\",\"errors\":[{{\"code\":\"unrecognized_keys\",\"keys\":{keys_json},\"path\":[],\"message\":{message}}}]}}"
    );
    Err(raw_json(StatusCode::BAD_REQUEST, raw))
}

fn raw_json(status: StatusCode, text: String) -> Response {
    let mut response = (status, text).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    response
}

fn json_response(value: Value) -> Response {
    ApiError::object(StatusCode::OK, value).into_response()
}
fn csrf_hint() -> Value {
    json!({"cookieName":CSRF_COOKIE_NAME,"headerName":CSRF_HEADER_NAME})
}
fn anonymous_view() -> Value {
    json!({"authenticated":false,"status":null,"user":null,"permissions":[],"expiresAt":null,"csrf":csrf_hint()})
}
#[expect(
    clippy::result_large_err,
    reason = "Keep the native rejection response and its existing headers intact at the HTTP boundary."
)]
fn cookie_values(values: impl IntoIterator<Item = String>) -> Result<Vec<HeaderValue>, Response> {
    values
        .into_iter()
        .map(|value| cookie_header_value(&value).map_err(|_| ApiError::internal().into_response()))
        .collect()
}
fn attach_cookies(mut response: Response, values: Vec<HeaderValue>) -> Response {
    for value in values {
        response.headers_mut().append(header::SET_COOKIE, value);
    }
    response
}
fn clear_or_error(state: &AuthHttpState, error: &AuthError) -> Response {
    if error.code().is_some() {
        match cookie_values(state.cookies.clear_headers()) {
            Ok(values) => attach_cookies(guards::domain_or_internal(error), values),
            Err(response) => response,
        }
    } else {
        guards::domain_or_internal(error)
    }
}

async fn session_view(
    state: &AuthHttpState,
    session: &Session,
    user: &AuthUser,
) -> Result<Value, AuthError> {
    let profile = state.service.profile(user).await?;
    let fallback = || {
        let document: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r1c/http-profile-fallback.json"
        ))
        .unwrap_or(Value::Null);
        let dev = document["profiles"].as_array().and_then(|users| {
            users
                .iter()
                .find(|dev| dev["id"] == user.user_id.to_string())
        });
        json!({"id":user.user_id.to_string(),"username":user.username,"displayName":dev.map_or_else(||Value::String(user.username.clone()),|dev|dev["displayName"].clone()),"roles":dev.map_or_else(||json!([]),|dev|dev["roles"].clone()),"permissions":user.permissions,"email":null,"avatarUrl":null,"isActive":true,"lastLoginAt":null,"emailVerified":false,"phoneVerified":false,"phone":null,"orgUnits":dev.map_or_else(||json!([]),|dev|dev["orgUnits"].clone())})
    };
    let expires = js_iso_string(session.idle_expires_at.min(session.absolute_expires_at))
        .map_err(|_| AuthError::internal(AuthErrorKind::InvalidState))?;
    Ok(
        json!({"authenticated":true,"status":"active","user":profile.unwrap_or_else(fallback),"permissions":user.permissions,"expiresAt":expires,"csrf":csrf_hint()}),
    )
}

async fn login(State(state): State<AuthHttpState>, request: Request) -> Response {
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    let (username, password) = match login_fields(&body) {
        Ok(values) => values,
        Err(response) => return response,
    };
    let username = username.to_utf8_lossy();
    let user = match state
        .service
        .verify_credentials(&username, password.as_code_units())
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            let mut event = metadata.event(
                "auth.login.failed",
                SecuritySeverity::Warning,
                SecurityResult::Failed,
            );
            event.principal = Some(username);
            event.details = Some(json!({"reason":"invalid_credentials"}));
            if state.service.record_security_event(event).await.is_err() {
                return ApiError::internal().into_response();
            }
            return ApiError::object(
                StatusCode::UNAUTHORIZED,
                json!({"statusCode":401,"code":"invalid_credentials","message":"用户名或密码错误"}),
            )
            .into_response();
        }
        Err(error) => return guards::domain_or_internal(&error),
    };
    let created = match state
        .service
        .create_session(user.user_id, &metadata.info)
        .await
    {
        Ok(created) => created,
        Err(error) => return guards::domain_or_internal(&error),
    };
    let headers = match cookie_values([
        state.cookies.session_header(
            &created.session_token,
            created.session.absolute_expires_at,
            Utc::now(),
        ),
        state.cookies.csrf_header(
            &created.csrf_token,
            created.session.absolute_expires_at,
            Utc::now(),
        ),
    ]) {
        Ok(values) => values,
        Err(response) => return response,
    };
    let response = match session_view(&state, &created.session, &user).await {
        Ok(value) => json_response(value),
        Err(error) => guards::domain_or_internal(&error),
    };
    attach_cookies(response, headers)
}

async fn current_session(State(state): State<AuthHttpState>, request: Request) -> Response {
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let token = match state.cookies.session_token(&parts.headers) {
        Ok(Some(token)) => token,
        Ok(None) => return json_response(anonymous_view()),
        Err(_) => return ApiError::internal().into_response(),
    };
    match state
        .service
        .resolve_session_token(&token, &metadata.info)
        .await
    {
        Ok(resolved) => match session_view(&state, &resolved.session, &resolved.user).await {
            Ok(value) => json_response(value),
            Err(error) => clear_or_error(&state, &error),
        },
        Err(error) => clear_or_error(&state, &error),
    }
}

async fn csrf_token(State(state): State<AuthHttpState>, request: Request) -> Response {
    let (parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let token = match state.cookies.session_token(&parts.headers) {
        Ok(token) => token,
        Err(_) => return ApiError::internal().into_response(),
    };
    match state
        .service
        .refresh_csrf_token(token.as_deref(), &metadata.info)
        .await
    {
        Ok(created) => {
            let expires = match js_iso_string(created.expires_at) {
                Ok(expires) => expires,
                Err(_) => return ApiError::internal().into_response(),
            };
            match cookie_values([state.cookies.csrf_header(
                &created.csrf_token,
                created.expires_at,
                Utc::now(),
            )]) {
                Ok(headers) => attach_cookies(
                    json_response(
                        json!({"token":created.csrf_token,"cookieName":CSRF_COOKIE_NAME,"headerName":CSRF_HEADER_NAME,"expiresAt":expires}),
                    ),
                    headers,
                ),
                Err(response) => response,
            }
        }
        Err(error) => clear_or_error(&state, &error),
    }
}

async fn logout(State(state): State<AuthHttpState>, request: Request) -> Response {
    let (parts, _) = request.into_parts();
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    if let Err(response) = logout_fields(&body) {
        return response;
    }
    let token = match state.cookies.session_token(&parts.headers) {
        Ok(token) => token,
        Err(_) => return ApiError::internal().into_response(),
    };
    let revoked = if let Some(token) = token {
        match state.service.revoke_session_token(&token).await {
            Ok(revoked) => revoked,
            Err(error) => return guards::domain_or_internal(&error),
        }
    } else {
        false
    };
    match cookie_values(state.cookies.clear_headers()) {
        Ok(headers) => attach_cookies(
            json_response(
                json!({"authenticated":false,"resultStatus":"logged-out","revoked":revoked}),
            ),
            headers,
        ),
        Err(response) => response,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn strict_logout_message_retains_original_surrogate_code_units()
    -> Result<(), Box<dyn std::error::Error>> {
        let fixture = JsObject::parse(include_str!("../../../../tools/rust-r1c/http-golden.json"))
            .map_err(|_| "golden object")?;
        let cases: Vec<&RawValue> =
            serde_json::from_str(fixture.get("cases").ok_or("cases")?.get())?;
        let mut matched = false;
        for case in cases {
            let case = JsObject::parse(case.get()).map_err(|_| "case object")?;
            let input = JsObject::parse(case.get("input").ok_or("input")?.get())
                .map_err(|_| "input object")?;
            let id: String = serde_json::from_str(input.get("id").ok_or("id")?.get())?;
            if id != "logout-strict-surrogate-key" {
                continue;
            }
            matched = true;
            let text: String = serde_json::from_str(input.get("body").ok_or("body")?.get())?;
            let body = ParsedBody {
                raw: Some(text.into()),
            };
            let response = logout_fields(&body)
                .err()
                .ok_or("strict DTO accepted unknown key")?;
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            let bytes = axum::body::to_bytes(response.into_body(), 65536).await?;
            let actual =
                JsObject::parse(std::str::from_utf8(&bytes)?).map_err(|_| "actual object")?;
            let observed = JsObject::parse(case.get("observed").ok_or("observed")?.get())
                .map_err(|_| "observed object")?;
            let expected = JsObject::parse(observed.get("body").ok_or("body")?.get())
                .map_err(|_| "expected object")?;
            let actual_issues: Vec<&RawValue> =
                serde_json::from_str(actual.get("errors").ok_or("errors")?.get())?;
            let expected_issues: Vec<&RawValue> =
                serde_json::from_str(expected.get("errors").ok_or("errors")?.get())?;
            assert_eq!(actual_issues.len(), expected_issues.len());
            for (actual, expected) in actual_issues.iter().zip(expected_issues.iter()) {
                let actual = JsObject::parse(actual.get()).map_err(|_| "actual issue")?;
                let expected = JsObject::parse(expected.get()).map_err(|_| "expected issue")?;
                assert_eq!(
                    actual
                        .get("message")
                        .ok_or("message")?
                        .get()
                        .parse::<JsString>()
                        .map_err(|_| "actual message")?,
                    expected
                        .get("message")
                        .ok_or("message")?
                        .get()
                        .parse::<JsString>()
                        .map_err(|_| "expected message")?
                );
                let actual_keys: Vec<&RawValue> =
                    serde_json::from_str(actual.get("keys").ok_or("keys")?.get())?;
                let expected_keys: Vec<&RawValue> =
                    serde_json::from_str(expected.get("keys").ok_or("keys")?.get())?;
                assert_eq!(actual_keys.len(), expected_keys.len());
                for (actual, expected) in actual_keys.iter().zip(expected_keys.iter()) {
                    assert_eq!(
                        actual.get().parse::<JsString>().map_err(|_| "actual key")?,
                        expected
                            .get()
                            .parse::<JsString>()
                            .map_err(|_| "expected key")?
                    );
                }
            }
        }
        assert!(matched, "missing original surrogate fixture");
        Ok(())
    }
}
