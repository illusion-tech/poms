use std::{collections::HashMap, error::Error, sync::Arc};

use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode, header},
    middleware,
};
use base64::{Engine, engine::general_purpose::STANDARD};
use poms_api_rust::{
    auth::{
        cookie::AuthCookieService,
        http::{AuthHttpState, body_parser, router},
        js_json::{JsObject, JsString},
        service::AuthService,
    },
    config::Config,
    database::Database,
};
use serde_json::{Value, value::RawValue};
use tower::ServiceExt;

fn js_semantic(raw: &str) -> Result<Value, Box<dyn Error>> {
    let value: &RawValue = serde_json::from_str(raw)?;
    match value.get().as_bytes().first() {
        Some(b'"') => {
            let text = value.get().parse::<JsString>().map_err(|_| "JSON string")?;
            Ok(serde_json::json!({"$utf16":text.as_code_units()}))
        }
        Some(b'[') => {
            let values: Vec<&RawValue> = serde_json::from_str(value.get())?;
            Ok(Value::Array(
                values
                    .into_iter()
                    .map(|value| js_semantic(value.get()))
                    .collect::<Result<Vec<_>, _>>()?,
            ))
        }
        Some(b'{') => {
            let object = JsObject::parse(value.get()).map_err(|_| "JSON object")?;
            let mut pairs = object
                .entries()
                .map(|(key, value)| Ok((key.as_code_units().to_vec(), js_semantic(value.get())?)))
                .collect::<Result<Vec<_>, Box<dyn Error>>>()?;
            pairs.sort_by(|a, b| a.0.cmp(&b.0));
            Ok(serde_json::json!({"$object":pairs}))
        }
        _ => Ok(serde_json::from_str(value.get())?),
    }
}

async fn application() -> Result<axum::Router, Box<dyn Error>> {
    let config = Config::from_map(&HashMap::from([
        ("DB_CONNECT".into(), "".into()),
        ("DB_HOST".into(), "127.0.0.1".into()),
        ("DB_PORT".into(), "1".into()),
        ("DB_DATABASE".into(), "poms_r1c_rust".into()),
        ("DB_USER".into(), "poms_r1c_app".into()),
        ("DB_PASSWORD".into(), "public-unused".into()),
    ]))?;
    let database = Database::new(&config.database).await?;
    database.close(std::time::Duration::from_secs(1)).await?;
    let state = AuthHttpState {
        service: Arc::new(AuthService::new(database, config.auth.clone())),
        cookies: AuthCookieService::from_auth_config(&config.auth),
    };
    Ok(router(state).layer(middleware::from_fn(body_parser)))
}

#[test]
fn javascript_strings_keep_surrogates_escaped_keys_duplicate_keys_and_unknown_values()
-> Result<(), Box<dyn Error>> {
    let raw = r#"{"username":"synthetic","\u0070assword":"first","password":"\ud800","\udc00":{"nested":["\udfff",1e999]}}"#;
    let object = JsObject::parse(raw).map_err(|_| "valid JS JSON rejected")?;
    let password = object
        .get("password")
        .ok_or("missing password")?
        .get()
        .parse::<JsString>()
        .map_err(|_| "surrogate rejected")?;
    assert_eq!(password.as_code_units(), &[0xd800]);
    assert_eq!(password.to_utf8_lossy(), "\u{fffd}");
    assert_eq!(password.json(), r#""\ud800""#);
    assert_eq!(object.keys().len(), 3);
    assert_eq!(object.keys()[2].as_code_units(), &[0xdc00]);
    assert!(serde_json::from_str::<Value>(raw).is_err());
    assert!(!format!("{password:?}").contains("d800"));
    Ok(())
}

#[tokio::test]
async fn public_anonymous_session_and_csrf_do_not_require_database_io() -> Result<(), Box<dyn Error>>
{
    let app = application().await?;
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/session")
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get(header::SET_COOKIE).is_none());
    let body: Value = serde_json::from_slice(&to_bytes(response.into_body(), 65536).await?)?;
    assert_eq!(
        body,
        serde_json::json!({"authenticated":false,"status":null,"user":null,"permissions":[],"expiresAt":null,"csrf":{"cookieName":"poms_csrf","headerName":"X-CSRF-Token"}})
    );
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/auth/csrf-token")
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    let cookie = response
        .headers()
        .get(header::SET_COOKIE)
        .ok_or("missing csrf cookie")?
        .to_str()?
        .to_owned();
    assert!(cookie.starts_with("poms_csrf="));
    assert!(!cookie.contains("HttpOnly"));
    let body: Value = serde_json::from_slice(&to_bytes(response.into_body(), 65536).await?)?;
    assert_eq!(body["token"].as_str().ok_or("missing token")?.len(), 43);
    Ok(())
}

#[tokio::test]
async fn parser_before_auth_and_auth_before_dto_are_exercised_without_database_io()
-> Result<(), Box<dyn Error>> {
    for (body, expected, code) in [
        ("{", StatusCode::BAD_REQUEST, None),
        ("{}", StatusCode::UNAUTHORIZED, Some("session_missing")),
    ] {
        let response = application()
            .await?
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/auth/session:logout")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header(header::CONTENT_LENGTH, body.len())
                    .body(Body::from(body))?,
            )
            .await?;
        assert_eq!(response.status(), expected);
        let value: Value = serde_json::from_slice(&to_bytes(response.into_body(), 65536).await?)?;
        if let Some(code) = code {
            assert_eq!(value["code"], code);
        }
    }
    Ok(())
}

#[tokio::test]
async fn native_http_dto_and_parser_negative_cases_match_original_pipeline()
-> Result<(), Box<dyn Error>> {
    let fixture = JsObject::parse(include_str!("../../../tools/rust-r1c/http-golden.json"))
        .map_err(|_| "invalid golden")?;
    let cases: Vec<&RawValue> =
        serde_json::from_str(fixture.get("cases").ok_or("missing cases")?.get())?;
    let selected = [
        "login-both-empty",
        "login-missing-password",
        "login-malformed-before-csrf",
        "login-json-empty-body",
        "login-json-whitespace",
        "login-json-null-strict",
        "login-json-array",
        "login-no-content-type",
        "login-text-ignored",
        "login-unsupported-charset",
        "login-json-over-100kb",
        "known-get-malformed-body",
        "unknown-path-json-before-404",
        "login-urlencoded-duplicate-user",
        "login-urlencoded-nested-user",
        "login-leading-whitespace-array",
        "login-urlencoded-multiple-object-fields",
        "login-utf16le-invalid-surrogate-escape",
        "login-invalid-gzip",
        "login-unsupported-encoding",
        "login-gzip-inflates-over-100kb",
    ];
    let mut count = 0;
    for raw_case in cases {
        let case = JsObject::parse(raw_case.get()).map_err(|_| "case object")?;
        let input =
            JsObject::parse(case.get("input").ok_or("input")?.get()).map_err(|_| "input object")?;
        let id: String = serde_json::from_str(input.get("id").ok_or("id")?.get())?;
        if !selected.contains(&id.as_str())
            && ![
                "login-json-unclosed-string",
                "login-json-missing-colon",
                "login-json-trailing-comma",
                "login-json-unquoted-key",
                "login-json-after-value",
                "login-json-invalid-escape",
                "login-json-invalid-unicode-escape",
                "login-json-control-char",
                "login-json-trailing-garbage",
                "login-json-unknown-token",
                "login-json-unclosed-object",
                "login-json-array-missing-comma",
                "login-json-bad-exponent",
                "login-json-leading-zero",
                "login-json-fraction",
                "login-json-truncated-true",
            ]
            .contains(&id.as_str())
        {
            continue;
        }
        count += 1;
        let input: Value = serde_json::from_str(case.get("input").ok_or("input")?.get())?;
        let expected = JsObject::parse(case.get("observed").ok_or("observed")?.get())
            .map_err(|_| "observed object")?;
        let expected_status: u16 =
            serde_json::from_str(expected.get("status").ok_or("status")?.get())?;
        let body = if let Some(bytes) = input["bodyBytesBase64"].as_str() {
            STANDARD.decode(bytes)?
        } else {
            input["body"].as_str().unwrap_or("").as_bytes().to_vec()
        };
        let mut builder = Request::builder()
            .method(input["method"].as_str().unwrap_or("POST"))
            .uri(input["path"].as_str().unwrap_or("/api/auth/sessions"));
        let mut content_type = "application/json";
        if let Some(headers) = input["headers"].as_object() {
            for (key, value) in headers {
                if key == "content-type" {
                    content_type = value.as_str().unwrap_or("");
                } else if let Some(value) = value.as_str() {
                    builder = builder.header(key.as_str(), value);
                }
            }
        }
        if !content_type.is_empty() {
            builder = builder.header(header::CONTENT_TYPE, content_type);
        }
        builder = builder.header(header::CONTENT_LENGTH, body.len().to_string());
        let response = application()
            .await?
            .oneshot(builder.body(Body::from(body))?)
            .await?;
        assert_eq!(response.status().as_u16(), expected_status, "{id}");
        let actual = String::from_utf8(to_bytes(response.into_body(), 200000).await?.to_vec())?;
        assert_eq!(
            js_semantic(&actual)?,
            js_semantic(expected.get("body").ok_or("body")?.get())?,
            "{id}"
        );
    }
    assert_eq!(count, selected.len() + 16);
    Ok(())
}
