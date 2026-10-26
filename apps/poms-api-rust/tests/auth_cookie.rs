use std::error::Error;

use axum::http::{HeaderMap, HeaderValue, header};
use chrono::{DateTime, Utc};
use poms_api_rust::auth::cookie::{
    AuthCookieService, CSRF_COOKIE_NAME, CookieError, SESSION_COOKIE_NAME, cookie_header_value,
    decode_uri_component, encode_uri_component, parse_cookie_header,
};
use serde_json::{Value, json};

#[test]
fn existing_fifteen_cookie_witnesses_keep_wire_and_first_match_semantics()
-> Result<(), Box<dyn Error>> {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../tools/rust-r0f-auth-compat/fixtures/auth-compat.v1.json"
    ))?;
    let now = "2026-05-13T01:00:00.000Z".parse::<DateTime<Utc>>()?;
    let expiry = "2026-05-13T01:15:00.000Z".parse::<DateTime<Utc>>()?;
    let mut count = 0;
    for case in fixture["cases"]
        .as_array()
        .ok_or("missing cases")?
        .iter()
        .filter(|case| case["group"] == "cookie")
    {
        count += 1;
        let id = case["id"].as_str().ok_or("missing id")?;
        let input = &case["input"];
        let observed = &case["observed"];
        if let Some(token) = input["token"].as_str() {
            let options = &input["options"];
            let service = AuthCookieService::new(
                options["path"].as_str().unwrap_or("/api").into(),
                options["secure"].as_bool().unwrap_or(false),
            );
            let expires = input["expiry"].as_str().ok_or("missing expiry")?.parse()?;
            let header = if id == "csrf-readable" {
                service.csrf_header(token, expires, now)
            } else {
                service.session_header(token, expires, now)
            };
            assert_eq!(header, observed["header"], "{id}");
        } else if id == "clear-both" {
            let headers = AuthCookieService::new("/api".into(), true).clear_headers();
            assert_eq!(headers[0], observed["session"]);
            assert_eq!(headers[1], observed["csrf"]);
        } else if input.get("nodeEnv").is_some() {
            let secure = input["secure"]
                .as_bool()
                .unwrap_or(input["nodeEnv"] == "production");
            assert_eq!(
                AuthCookieService::new("/api".into(), secure).session_header(
                    "synthetic",
                    expiry,
                    now
                ),
                observed["header"]
            );
        } else {
            let header = if let Some(values) = input["header"].as_array() {
                Some(
                    values
                        .iter()
                        .filter_map(Value::as_str)
                        .collect::<Vec<_>>()
                        .join("; "),
                )
            } else {
                input["header"].as_str().map(str::to_owned)
            };
            let session = parse_cookie_header(header.as_deref(), SESSION_COOKIE_NAME);
            if observed.get("error").is_some() {
                assert_eq!(session, Err(CookieError::InvalidUriEncoding));
                continue;
            }
            let csrf = parse_cookie_header(header.as_deref(), CSRF_COOKIE_NAME)
                .map_err(|_| "unexpected cookie error")?;
            assert_eq!(
                json!({"session":session.map_err(|_| "unexpected cookie error")?,"csrf":csrf}),
                observed["value"],
                "{id}"
            );
        }
    }
    assert_eq!(count, 15);
    Ok(())
}

#[test]
fn uri_component_encoding_and_header_latin1_match_node_boundaries() {
    assert_eq!(
        encode_uri_component("AZaz09-_.!~*'() /+中😀"),
        "AZaz09-_.!~*'()%20%2F%2B%E4%B8%AD%F0%9F%98%80"
    );
    assert_eq!(decode_uri_component("a+b%20c"), Ok("a+b c".into()));
    for invalid in ["%", "%1", "%xx", "%ED%A0%80", "%C0%80", "%E0%A4%A"] {
        assert_eq!(
            decode_uri_component(invalid),
            Err(CookieError::InvalidUriEncoding)
        );
    }
    assert_eq!(decode_uri_component("é%C3%A9"), Ok("éé".into()));
    assert!(cookie_header_value("poms_session=x; Path=/中").is_err());
    assert!(cookie_header_value("poms_session=x\r\nInjected: y").is_err());
    assert!(cookie_header_value("poms_session=x; Path=/é").is_ok());
}

#[test]
fn duplicate_http_cookie_fields_and_obs_text_are_preserved() -> Result<(), Box<dyn Error>> {
    let mut headers = HeaderMap::new();
    headers.append(
        header::COOKIE,
        HeaderValue::from_static("other=a; poms_session=first"),
    );
    headers.append(
        header::COOKIE,
        HeaderValue::from_static("poms_session=second; poms_csrf=x%2By"),
    );
    let service = AuthCookieService::new("/api".into(), false);
    assert_eq!(service.session_token(&headers), Ok(Some("first".into())));
    assert_eq!(service.csrf_token(&headers), Ok(Some("x+y".into())));
    headers.insert(
        header::COOKIE,
        HeaderValue::from_bytes(b"poms_session=\xe9")?,
    );
    assert_eq!(service.session_token(&headers), Ok(Some("é".into())));
    Ok(())
}
