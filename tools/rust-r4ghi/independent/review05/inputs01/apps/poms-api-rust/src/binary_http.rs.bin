//! Nest StreamableFile compatibility after the attachment service has opened
//! its provider stream and completed its independent success-audit flush.

use std::{collections::BTreeMap, convert::Infallible, error::Error, future::poll_fn, pin::Pin};

use axum::{
    body::{Body, Bytes, HttpBody, to_bytes},
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    response::{IntoResponse, Response},
};
use base64::{Engine, engine::general_purpose::STANDARD};
use futures_util::{StreamExt, stream};

use crate::{
    auth::js_json::{JsObject, JsString},
    error::ApiError,
};

/// Nest applies the controller's @Header after guards, before invoking the
/// binary service. Its JSON exception still goes through Express res.send,
/// which assigns a weak validator to the exact ordered JSON bytes.
pub async fn controller_error(error: ApiError) -> Response {
    let mut response = error.into_response();
    let body = std::mem::replace(response.body_mut(), Body::empty());
    let bytes = to_bytes(body, usize::MAX).await.unwrap_or_default();
    let mut bytes = bytes.to_vec();
    if let Ok(raw) = std::str::from_utf8(&bytes)
        && let Ok(object) = JsObject::parse(raw)
        && let (Some(message), Some(description), Some(status)) = (
            object.get("message"),
            object.get("error"),
            object.get("statusCode"),
        )
    {
        bytes = format!(
            "{{\"message\":{},\"error\":{},\"statusCode\":{}}}",
            message.get(),
            description.get(),
            status.get()
        )
        .into_bytes();
    } else if let Ok(raw) = std::str::from_utf8(&bytes)
        && let Ok(object) = JsObject::parse(raw)
        && object.get("error").is_none()
        && let (Some(status), Some(message)) = (object.get("statusCode"), object.get("message"))
    {
        bytes = format!(
            "{{\"statusCode\":{},\"message\":{}}}",
            status.get(),
            message.get()
        )
        .into_bytes();
    }
    let digest = STANDARD.encode(openssl::sha::sha1(&bytes));
    let etag = format!("W/\"{:x}-{}\"", bytes.len(), digest.trim_end_matches('='));
    let headers = response.headers_mut();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    if let Ok(value) = HeaderValue::from_str(&etag) {
        headers.insert(header::ETAG, value);
    }
    if let Ok(value) = HeaderValue::from_str(&bytes.len().to_string()) {
        headers.insert(header::CONTENT_LENGTH, value);
    }
    *response.body_mut() = Body::from(bytes);
    response
}

pub struct BinaryPayload {
    pub body: Body,
    pub mime: JsString,
    pub filename: JsString,
    pub inline: bool,
}

#[derive(Debug)]
pub struct BodyReadFailure {
    pub message: JsString,
}

/// Raw octet-stream never enters the JSON/form parser's 100 KiB limit. The
/// caller passes the body remaining after that parser and the existing guards.
pub async fn read_unparsed_body(mut body: Body) -> Result<Vec<u8>, BodyReadFailure> {
    let mut bytes = Vec::new();
    while let Some(frame) = poll_fn(|cx| Pin::new(&mut body).poll_frame(cx)).await {
        let frame = frame.map_err(|error| BodyReadFailure {
            message: failure_message(&error),
        })?;
        if let Ok(data) = frame.into_data() {
            bytes.extend_from_slice(&data);
        }
    }
    Ok(bytes)
}

fn js(value: &str) -> JsString {
    JsString::from_code_units(value.encode_utf16().collect())
}

fn failure_message(error: &(dyn Error + 'static)) -> JsString {
    let mut current = error;
    for _ in 0..64 {
        if let Some(storage) = current.downcast_ref::<crate::attachment_storage::StorageFailure>() {
            return storage.message.clone();
        }
        match current.source() {
            Some(next) => current = next,
            None => break,
        }
    }
    js(&error.to_string())
}

fn component(value: &JsString) -> Result<String, ApiError> {
    let mut result = String::new();
    for character in char::decode_utf16(value.as_code_units().iter().copied()) {
        let character = character.map_err(|_| ApiError::internal())?;
        let mut encoded = [0; 4];
        for &byte in character.encode_utf8(&mut encoded).as_bytes() {
            if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
                result.push(char::from(byte));
            } else {
                use std::fmt::Write;
                let _ = write!(result, "%{byte:02X}");
            }
        }
    }
    Ok(result)
}

fn latin1_header(value: &JsString) -> Result<HeaderValue, ApiError> {
    let bytes = value
        .as_code_units()
        .iter()
        .map(|&unit| {
            if unit == 9 || (32..=126).contains(&unit) || (128..=255).contains(&unit) {
                Ok(unit as u8)
            } else {
                Err(ApiError::internal())
            }
        })
        .collect::<Result<Vec<_>, _>>()?;
    HeaderValue::from_bytes(&bytes).map_err(|_| ApiError::internal())
}

fn native_stream_headers(
    mime: &JsString,
    filename: &JsString,
    inline: bool,
) -> Result<HeaderMap, ApiError> {
    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, latin1_header(mime)?);
    let disposition = format!(
        "{}; filename*=UTF-8''{}",
        if inline { "inline" } else { "attachment" },
        component(filename)?
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&disposition).map_err(|_| ApiError::internal())?,
    );
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    Ok(headers)
}

fn token(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || b"!#$%&'*+-.^_`|~".contains(&byte)
}

/// The early-error res.send path uses content-type 1.0.5 parse/format. Success
/// streaming preserves the original MIME bytes without parsing or a charset.
fn utf8_charset(value: &[u8]) -> Result<HeaderValue, ApiError> {
    let end = value
        .iter()
        .position(|byte| *byte == b';')
        .unwrap_or(value.len());
    let mut media = &value[..end];
    let trim = |byte: &u8| matches!(*byte, 9..=13 | 32 | 160);
    while media.first().is_some_and(trim) {
        media = &media[1..];
    }
    while media.last().is_some_and(trim) {
        media = &media[..media.len() - 1];
    }
    let slash = media
        .iter()
        .position(|byte| *byte == b'/')
        .ok_or_else(ApiError::internal)?;
    if slash == 0
        || slash + 1 == media.len()
        || !media[..slash].iter().all(|byte| token(*byte))
        || !media[slash + 1..].iter().all(|byte| token(*byte))
    {
        return Err(ApiError::internal());
    }
    let mut parameters = BTreeMap::<Vec<u8>, Vec<u8>>::new();
    let mut index = end;
    while index < value.len() {
        if value[index] != b';' {
            return Err(ApiError::internal());
        }
        index += 1;
        while value.get(index) == Some(&b' ') {
            index += 1;
        }
        let start = index;
        while value.get(index).is_some_and(|byte| token(*byte)) {
            index += 1;
        }
        if start == index {
            return Err(ApiError::internal());
        }
        let name = value[start..index]
            .iter()
            .map(u8::to_ascii_lowercase)
            .collect::<Vec<_>>();
        while value.get(index) == Some(&b' ') {
            index += 1;
        }
        if value.get(index) != Some(&b'=') {
            return Err(ApiError::internal());
        }
        index += 1;
        while value.get(index) == Some(&b' ') {
            index += 1;
        }
        let mut parameter = Vec::new();
        if value.get(index) == Some(&b'"') {
            index += 1;
            loop {
                let byte = *value.get(index).ok_or_else(ApiError::internal)?;
                index += 1;
                if byte == b'"' {
                    break;
                }
                if byte == b'\\' {
                    let escaped = *value.get(index).ok_or_else(ApiError::internal)?;
                    index += 1;
                    if escaped != 11 && !(32..=255).contains(&escaped) {
                        return Err(ApiError::internal());
                    }
                    parameter.push(escaped);
                } else if byte == 11
                    || byte == 32
                    || byte == 33
                    || (35..=91).contains(&byte)
                    || (93..=126).contains(&byte)
                    || byte >= 128
                {
                    parameter.push(byte);
                } else {
                    return Err(ApiError::internal());
                }
            }
        } else {
            let start = index;
            while value.get(index).is_some_and(|byte| token(*byte)) {
                index += 1;
            }
            if start == index {
                return Err(ApiError::internal());
            }
            parameter.extend_from_slice(&value[start..index]);
        }
        while value.get(index) == Some(&b' ') {
            index += 1;
        }
        parameters.insert(name, parameter);
    }
    parameters.insert(b"charset".to_vec(), b"utf-8".to_vec());
    let mut output = media.iter().map(u8::to_ascii_lowercase).collect::<Vec<_>>();
    for (name, parameter) in parameters {
        output.extend_from_slice(b"; ");
        output.extend_from_slice(&name);
        output.push(b'=');
        if !parameter.is_empty() && parameter.iter().all(|byte| token(*byte)) {
            output.extend_from_slice(&parameter);
        } else {
            output.push(b'"');
            for byte in parameter {
                if matches!(byte, b'\\' | b'"') {
                    output.push(b'\\');
                }
                output.push(byte);
            }
            output.push(b'"');
        }
    }
    HeaderValue::from_bytes(&output).map_err(|_| ApiError::internal())
}

fn native_stream_start_failure(
    mut headers: HeaderMap,
    message: &JsString,
    is_head: bool,
) -> Result<Response, ApiError> {
    let mime = utf8_charset(
        headers
            .get(header::CONTENT_TYPE)
            .ok_or_else(ApiError::internal)?
            .as_bytes(),
    )?;
    headers.insert(header::CONTENT_TYPE, mime);
    let bytes = message.to_utf8_lossy().into_bytes();
    let hash = STANDARD.encode(openssl::sha::sha1(&bytes));
    let etag = format!("W/\"{:x}-{}\"", bytes.len(), hash.trim_end_matches('='));
    headers.insert(
        header::ETAG,
        HeaderValue::from_str(&etag).map_err(|_| ApiError::internal())?,
    );
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&bytes.len().to_string()).map_err(|_| ApiError::internal())?,
    );
    let mut response = Response::new(if is_head {
        Body::empty()
    } else {
        Body::from(bytes)
    });
    *response.status_mut() = StatusCode::BAD_REQUEST;
    *response.headers_mut() = headers;
    Ok(response)
}

#[derive(Clone)]
struct BinaryHead;

fn unknown_empty() -> Body {
    Body::from_stream(stream::empty::<Result<Bytes, Infallible>>())
}

/// The outer router may observe an already stripped HEAD body. Preserve the
/// original stream's unknown length instead of synthesizing Content-Length:0.
pub(crate) fn normalize_head_response(method: &Method, response: &mut Response) {
    if *method == Method::HEAD && response.extensions().get::<BinaryHead>().is_some() {
        response.headers_mut().remove(header::CONTENT_LENGTH);
        *response.body_mut() = unknown_empty();
    }
}

pub async fn respond(
    payload: BinaryPayload,
    request_method: &Method,
) -> Result<Response, ApiError> {
    let headers = native_stream_headers(&payload.mime, &payload.filename, payload.inline)?;
    let mut data = payload.body.into_data_stream();
    let is_head = *request_method == Method::HEAD;
    if is_head {
        let mut started = false;
        while let Some(chunk) = data.next().await {
            match chunk {
                Ok(bytes) => started |= !bytes.is_empty(),
                Err(error) if !started => {
                    return native_stream_start_failure(headers, &failure_message(&error), true);
                }
                Err(_) => break,
            }
        }
        let mut response = Response::new(unknown_empty());
        *response.headers_mut() = headers;
        response.extensions_mut().insert(BinaryHead);
        return Ok(response);
    }
    let first = loop {
        match data.next().await {
            Some(Ok(bytes)) if bytes.is_empty() => continue,
            Some(Ok(bytes)) => break Some(bytes),
            Some(Err(error)) => {
                return native_stream_start_failure(headers, &failure_message(&error), false);
            }
            None => break None,
        }
    };
    let replay = stream::unfold((first, data), |(first, mut tail)| async move {
        if let Some(bytes) = first {
            return Some((Ok::<_, Infallible>(bytes), (None, tail)));
        }
        loop {
            match tail.next().await {
                Some(Ok(bytes)) if bytes.is_empty() => continue,
                Some(Ok(bytes)) => return Some((Ok(bytes), (None, tail))),
                Some(Err(_)) | None => return None,
            }
        }
    });
    let mut response = Response::new(Body::from_stream(replay));
    *response.headers_mut() = headers;
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(body: Body) -> BinaryPayload {
        BinaryPayload {
            body,
            mime: js("image/png"),
            filename: js("图 '!().png"),
            inline: true,
        }
    }

    #[tokio::test]
    async fn controller_exception_retains_native_json_order_utf16_and_validator() {
        let response = controller_error(ApiError::raw_json(
            StatusCode::NOT_FOUND,
            "{\"statusCode\":404,\"message\":\"missing \\ud800\",\"error\":\"Not Found\"}".into(),
        ))
        .await;
        assert_eq!(
            response.headers()[header::CACHE_CONTROL],
            "private, no-store"
        );
        let expected =
            b"{\"message\":\"missing \\ud800\",\"error\":\"Not Found\",\"statusCode\":404}";
        let validator = format!(
            "W/\"{:x}-{}\"",
            expected.len(),
            STANDARD
                .encode(openssl::sha::sha1(expected))
                .trim_end_matches('=')
        );
        assert_eq!(response.headers()[header::ETAG], validator);
        assert_eq!(
            read_unparsed_body(response.into_body())
                .await
                .unwrap_or_else(|_| panic!("body")),
            expected
        );
        let internal = controller_error(ApiError::internal()).await;
        assert_eq!(
            read_unparsed_body(internal.into_body())
                .await
                .unwrap_or_else(|_| panic!("body")),
            b"{\"statusCode\":500,\"message\":\"Internal server error\"}"
        );
    }

    #[tokio::test]
    async fn first_error_is_unquoted_text_with_native_send_headers() {
        let body = Body::from_stream(stream::iter([Err::<Bytes, _>(std::io::Error::other(
            "read failed",
        ))]));
        let response = respond(payload(body), &Method::GET)
            .await
            .unwrap_or_else(|_| panic!("response"));
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(
            response.headers()[header::CONTENT_TYPE],
            "image/png; charset=utf-8"
        );
        assert_eq!(
            response.headers()[header::CONTENT_DISPOSITION],
            "inline; filename*=UTF-8''%E5%9B%BE%20'!().png"
        );
        assert_eq!(response.headers()[header::CONTENT_LENGTH], "11");
        assert!(
            response.headers()[header::ETAG]
                .as_bytes()
                .starts_with(b"W/\"b-")
        );
        assert_eq!(
            read_unparsed_body(response.into_body())
                .await
                .unwrap_or_else(|_| panic!("body")),
            b"read failed"
        );
    }

    #[tokio::test]
    async fn late_error_ends_the_partial_stream_without_turning_it_into_a_body_error() {
        let body = Body::from_stream(stream::iter([
            Ok(Bytes::from_static(b"prefix")),
            Err(std::io::Error::other("late failure")),
        ]));
        let response = respond(payload(body), &Method::GET)
            .await
            .unwrap_or_else(|_| panic!("response"));
        assert_eq!(response.status(), StatusCode::OK);
        assert!(!response.headers().contains_key(header::CONTENT_LENGTH));
        assert!(!response.headers().contains_key(header::ETAG));
        assert_eq!(
            read_unparsed_body(response.into_body())
                .await
                .unwrap_or_else(|_| panic!("body")),
            b"prefix"
        );
    }

    #[tokio::test]
    async fn head_drains_and_retains_the_first_data_error_boundary() {
        let early = Body::from_stream(stream::iter([Err::<Bytes, _>(std::io::Error::other(
            "early",
        ))]));
        let response = respond(payload(early), &Method::HEAD)
            .await
            .unwrap_or_else(|_| panic!("response"));
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(response.headers()[header::CONTENT_LENGTH], "5");
        let late = Body::from_stream(stream::iter([
            Ok(Bytes::from_static(b"prefix")),
            Err(std::io::Error::other("late")),
        ]));
        let mut response = respond(payload(late), &Method::HEAD)
            .await
            .unwrap_or_else(|_| panic!("response"));
        response
            .headers_mut()
            .insert(header::CONTENT_LENGTH, HeaderValue::from_static("0"));
        normalize_head_response(&Method::HEAD, &mut response);
        assert_eq!(response.status(), StatusCode::OK);
        assert!(!response.headers().contains_key(header::CONTENT_LENGTH));
        assert_eq!(response.body().size_hint().exact(), None);
    }

    #[test]
    fn charset_override_parses_case_duplicates_and_quoted_values() {
        let actual = utf8_charset(b"IMAGE/PNG; z=\"a b\"; Charset=latin1; a=\"x\\\"y\"; z=token")
            .unwrap_or_else(|_| panic!("mime"));
        assert_eq!(actual, "image/png; a=\"x\\\"y\"; charset=utf-8; z=token");
        assert!(utf8_charset(b"image/png; invalid").is_err());
        assert!(component(&JsString::from_code_units(vec![0xd800])).is_err());
        assert!(latin1_header(&js("image/png\r\nx: y")).is_err());
    }
}
