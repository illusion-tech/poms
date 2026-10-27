use std::{
    collections::HashMap,
    error::Error,
    time::{Duration, Instant},
};

use axum::{
    Router,
    body::{Body, to_bytes},
    http::{HeaderMap, Method, Request, StatusCode, header},
    response::{IntoResponse, Response},
};
use poms_api_rust::{
    config::Config,
    database::Database,
    error::ApiError,
    http::{self, AppState, HealthCheckDto, HealthDependencyCheckDto},
};
use serde_json::{Value, json};
use tower::ServiceExt;

type TestResult<T = ()> = Result<T, Box<dyn Error>>;

const GOLDEN: &str =
    include_str!("../../../tools/rust-r0f-auth-compat/fixtures/auth-compat.v1.json");
const EXISTING_OPENAPI: &str = include_str!("../../../libs/shared/api-spec/openapi.json");

fn frozen_case(id: &str) -> TestResult<Value> {
    let fixture: Value = serde_json::from_str(GOLDEN)?;
    fixture["cases"]
        .as_array()
        .ok_or("golden has no cases")?
        .iter()
        .find(|case| case["id"] == id)
        .cloned()
        .ok_or_else(|| format!("missing frozen case {id}").into())
}

async fn closed_database() -> TestResult<Database> {
    // Pure configuration plus connect_lazy_with; close before any request. A
    // readiness 503 must therefore perform no network or database activity.
    let values = HashMap::from([
        ("DB_HOST".to_owned(), "127.0.0.1".to_owned()),
        ("DB_PORT".to_owned(), "15432".to_owned()),
        ("DB_DATABASE".to_owned(), "poms_r0e_rust".to_owned()),
        ("DB_USER".to_owned(), "poms_r0e_app".to_owned()),
        (
            "DB_PASSWORD".to_owned(),
            "public-synthetic-http-test".to_owned(),
        ),
    ]);
    let config = Config::from_map(&values)?;
    assert!(!config.database.connect);
    let database = Database::new(&config.database).await?;
    database.close(Duration::from_secs(1)).await?;
    Ok(database)
}

async fn application(origins: &[&str]) -> TestResult<Router> {
    let origins = origins
        .iter()
        .map(|origin| (*origin).to_owned())
        .collect::<Vec<_>>();
    Ok(http::router(
        AppState {
            database: closed_database().await?,
            started_at: Instant::now(),
        },
        &origins,
    ))
}

async fn json_response(response: Response) -> TestResult<(StatusCode, HeaderMap, Value)> {
    let (parts, body) = response.into_parts();
    let bytes = to_bytes(body, 1024 * 1024).await?;
    Ok((parts.status, parts.headers, serde_json::from_slice(&bytes)?))
}

fn normalize_schema(value: &mut Value) {
    let Value::Object(fields) = value else {
        return;
    };
    // This function is entered at a schema node, never at a property-name map
    // or arbitrary literal data such as examples/default/enum object values.
    fields.remove("description");
    fields.remove("title");
    for (key, value) in fields.iter_mut() {
        match key.as_str() {
            "properties" | "patternProperties" | "$defs" | "definitions" => {
                if let Value::Object(properties) = value {
                    properties.values_mut().for_each(normalize_schema);
                }
            }
            "allOf" | "anyOf" | "oneOf" | "prefixItems" => {
                if let Value::Array(schemas) = value {
                    schemas.iter_mut().for_each(normalize_schema);
                }
            }
            "items"
            | "additionalProperties"
            | "propertyNames"
            | "contains"
            | "not"
            | "if"
            | "then"
            | "else" => normalize_schema(value),
            "required" | "enum" => {
                if let Value::Array(values) = value {
                    values.sort_by_key(Value::to_string);
                }
            }
            _ => {}
        }
    }
}

fn normalize_responses(value: &mut Value) {
    let Value::Object(responses) = value else {
        return;
    };
    for response in responses.values_mut() {
        let Value::Object(response) = response else {
            continue;
        };
        response.remove("description");
        if let Some(Value::Object(media_types)) = response.get_mut("content") {
            for media_type in media_types.values_mut() {
                if let Some(schema) = media_type.get_mut("schema") {
                    normalize_schema(schema);
                }
            }
        }
    }
}

fn effective_security(document: &Value, operation: &Value) -> Value {
    operation
        .get("security")
        .or_else(|| document.get("security"))
        .cloned()
        .unwrap_or_else(|| json!([]))
}

fn public_security_matches(document: &Value, frozen: &Value) -> bool {
    ["/api", "/api/health", "/api/health/readiness"]
        .iter()
        .all(|path| {
            effective_security(document, &document["paths"][path]["get"])
                == effective_security(frozen, &frozen["paths"][path]["get"])
        })
}

#[tokio::test]
async fn root_preserves_existing_body_without_a_database() -> TestResult {
    let response = application(&["http://localhost:4200"])
        .await?
        .oneshot(Request::builder().uri("/api").body(Body::empty())?)
        .await?;
    let (status, headers, body) = json_response(response).await?;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, json!({"message": "Hello API"}));
    assert_eq!(
        headers[header::CONTENT_TYPE],
        "application/json; charset=utf-8"
    );
    assert!(headers["x-request-id"].to_str()?.starts_with("r1a-"));
    Ok(())
}

#[tokio::test]
async fn liveness_is_process_only_and_keeps_dynamic_field_types() -> TestResult {
    let response = application(&["http://localhost:4200"])
        .await?
        .oneshot(Request::builder().uri("/api/health").body(Body::empty())?)
        .await?;
    let (status, _, body) = json_response(response).await?;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["service"], "poms-api");
    assert_eq!(body["status"], "live");
    assert_eq!(
        body["checks"]["process"],
        frozen_case("health-live")?["observed"]["output"]["checks"]["process"]
    );
    assert!(body["checks"].get("database").is_none());
    let checked_at = body["checkedAt"].as_str().ok_or("missing checkedAt")?;
    assert_eq!(checked_at.len(), 24);
    assert!(checked_at.ends_with('Z'));
    chrono::DateTime::parse_from_rfc3339(checked_at)?;
    assert!(body["uptimeSeconds"].as_u64().is_some());
    Ok(())
}

#[tokio::test]
async fn readiness_on_a_closed_pool_is_503_and_never_exposes_driver_details() -> TestResult {
    let response = application(&["http://localhost:4200"])
        .await?
        .oneshot(
            Request::builder()
                .uri("/api/health/readiness")
                .body(Body::empty())?,
        )
        .await?;
    let (status, _, body) = json_response(response).await?;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["status"], "not_ready");
    assert_eq!(body["service"], "poms-api");
    assert_eq!(body["checks"]["database"]["status"], "fail");
    assert_eq!(
        body["checks"]["database"]["message"],
        http::DATABASE_UNAVAILABLE_MESSAGE
    );
    assert!(body["checks"]["database"]["durationMs"].as_u64().is_some());
    assert!(body.get("statusCode").is_none());
    let text = body.to_string();
    for private in [
        "public-synthetic-http-test",
        "poms_r0e_rust",
        "127.0.0.1",
        "PoolClosed",
        "postgres://",
    ] {
        assert!(!text.contains(private));
    }
    Ok(())
}

#[test]
fn controlled_health_views_match_the_existing_typescript_goldens() -> TestResult {
    let timestamp = "2026-05-13T01:00:00.000Z".to_owned();
    assert_eq!(
        serde_json::to_value(HealthCheckDto::liveness(timestamp.clone(), 123))?,
        frozen_case("health-live")?["observed"]["output"]
    );
    assert_eq!(
        serde_json::to_value(HealthCheckDto::readiness(
            timestamp.clone(),
            123,
            HealthDependencyCheckDto::passed(0)
        ))?,
        frozen_case("health-ready")?["observed"]["output"]
    );
    let mut failed = frozen_case("health-not-ready")?["observed"]["output"].clone();
    // The G1 explicitly permits a stable, non-secret SQLx error description.
    failed["checks"]["database"]["message"] = json!(http::DATABASE_UNAVAILABLE_MESSAGE);
    assert_eq!(
        serde_json::to_value(HealthCheckDto::readiness(
            timestamp,
            123,
            HealthDependencyCheckDto::unavailable(0)
        ))?,
        failed
    );
    Ok(())
}

#[tokio::test]
async fn unsupported_methods_and_unimplemented_routes_keep_actual_express_404_shape() -> TestResult
{
    let app = application(&["http://localhost:4200"]).await?;
    let golden: HashMap<String, Box<serde_json::value::RawValue>> =
        serde_json::from_str(include_str!("../../../tools/rust-r1c/http-golden.json"))?;
    let cases: Vec<Box<serde_json::value::RawValue>> = serde_json::from_str(golden["cases"].get())?;
    let case = cases
        .iter()
        .find(|case| case.get().contains("\"unknown-get-valid-body\""))
        .ok_or("missing 404 oracle")?;
    let case: Value = serde_json::from_str(case.get())?;
    let observed = &case["observed"];
    let template = observed["body"]["rawText"]
        .as_str()
        .ok_or("missing actual 404 HTML")?;
    for (method, uri) in [
        (Method::POST, "/api"),
        (Method::DELETE, "/api/health"),
        (Method::GET, "/api/auth/session?token=not-reflected"),
        (Method::GET, "/api/not$implemented"),
        (Method::GET, "/api/not^implemented"),
        (Method::GET, "/api/not|implemented"),
        (Method::GET, r"/api/not\implemented"),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method.clone())
                    .uri(uri)
                    .body(Body::empty())?,
            )
            .await?;
        let (parts, body) = response.into_parts();
        let bytes = to_bytes(body, 1024 * 1024).await?;
        assert_eq!(parts.status, StatusCode::NOT_FOUND);
        assert_eq!(
            std::str::from_utf8(&bytes)?,
            template.replace(
                "GET /api/auth/not-implemented",
                &format!("{method} {}", uri.split('?').next().ok_or("path")?)
            )
        );
        for name in [
            "content-type",
            "content-security-policy",
            "x-content-type-options",
        ] {
            assert_eq!(
                parts.headers[name].to_str()?,
                observed["headers"][name].as_str().ok_or("oracle header")?
            );
        }
        assert!(!parts.headers.contains_key(header::ALLOW));
    }
    Ok(())
}

#[tokio::test]
async fn head_uses_the_existing_get_route_but_returns_no_body() -> TestResult {
    let response = application(&["http://localhost:4200"])
        .await?
        .oneshot(
            Request::builder()
                .method(Method::HEAD)
                .uri("/api")
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    assert!(to_bytes(response.into_body(), 1024).await?.is_empty());
    Ok(())
}

#[tokio::test]
async fn cors_single_origin_is_fixed_even_for_a_different_request_origin() -> TestResult {
    let response = application(&["http://localhost:4200"])
        .await?
        .oneshot(
            Request::builder()
                .uri("/api")
                .header(header::ORIGIN, "https://other.example")
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_ORIGIN],
        "http://localhost:4200"
    );
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_CREDENTIALS],
        "true"
    );
    assert_eq!(response.headers()[header::VARY], "Origin");
    Ok(())
}

#[tokio::test]
async fn cors_multiple_origins_only_reflect_an_exact_match() -> TestResult {
    let app = application(&["https://one.example", "https://two.example"]).await?;
    for origin in ["https://two.example", "https://other.example"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api")
                    .header(header::ORIGIN, origin)
                    .body(Body::empty())?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::OK);
        if origin == "https://two.example" {
            assert_eq!(
                response.headers()[header::ACCESS_CONTROL_ALLOW_ORIGIN],
                origin
            );
        } else {
            assert!(
                !response
                    .headers()
                    .contains_key(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            );
        }
    }
    Ok(())
}

#[tokio::test]
async fn cors_preflight_is_global_middleware_without_an_extra_registered_path() -> TestResult {
    let response = application(&["http://localhost:4200"])
        .await?
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/api/auth/session")
                .header(header::ORIGIN, "http://localhost:4200")
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_METHODS],
        "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_HEADERS],
        "Accept,Content-Type,X-CSRF-Token"
    );
    assert!(to_bytes(response.into_body(), 1024).await?.is_empty());
    Ok(())
}

#[tokio::test]
async fn request_ids_are_generated_and_do_not_echo_untrusted_headers() -> TestResult {
    let app = application(&["http://localhost:4200"]).await?;
    let mut ids = Vec::new();
    for _ in 0..2 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api")
                    .header("x-request-id", "do-not-echo-this")
                    .body(Body::empty())?,
            )
            .await?;
        let id = response.headers()["x-request-id"].to_str()?.to_owned();
        assert!(id.starts_with("r1a-"));
        assert!(!id.contains("do-not-echo-this"));
        ids.push(id);
    }
    assert_ne!(ids[0], ids[1]);
    Ok(())
}

#[tokio::test]
async fn basic_error_variants_consume_the_frozen_nest_filter_outputs() -> TestResult {
    for (id, error) in [
        (
            "nest-string-bad-request",
            ApiError::message(StatusCode::BAD_REQUEST, "synthetic bad input"),
        ),
        (
            "nest-string-forbidden",
            ApiError::message(StatusCode::FORBIDDEN, "synthetic forbidden"),
        ),
        ("nest-unknown-error", ApiError::internal()),
        (
            "nest-http-error-shape",
            ApiError::http_like(StatusCode::CONFLICT, "synthetic conflict"),
        ),
    ] {
        let expected = frozen_case(id)?;
        let (status, _, body) = json_response(error.into_response()).await?;
        assert_eq!(
            status.as_u16(),
            expected["observed"]["status"]
                .as_u64()
                .ok_or("missing frozen status")? as u16
        );
        assert_eq!(body, expected["observed"]["body"]);
    }
    let explicit =
        json!({"statusCode":403,"code":"permission_denied","message":"Insufficient permissions"});
    let (_, _, body) =
        json_response(ApiError::object(StatusCode::FORBIDDEN, explicit).into_response()).await?;
    assert_eq!(
        body,
        frozen_case("permission-all-fail")?["observed"]["output"]["error"]["body"]
    );
    // This is transport object preservation, not a Rust permission guard.
    Ok(())
}

#[test]
fn openapi_has_twenty_six_operations_and_preserves_existing_health_schemas() -> TestResult {
    let document = serde_json::to_value(http::openapi())?;
    let existing: Value = serde_json::from_str(EXISTING_OPENAPI)?;
    let paths = document["paths"].as_object().ok_or("missing paths")?;
    assert_eq!(paths.len(), 22);
    assert_eq!(
        paths
            .values()
            .map(|path| path.as_object().map_or(0, |item| item
                .keys()
                .filter(|method| [
                    "get", "post", "put", "patch", "delete", "head", "options", "trace"
                ]
                .contains(&method.as_str()))
                .count()))
            .sum::<usize>(),
        26
    );
    assert!(public_security_matches(&document, &existing));
    for path in ["/api", "/api/health", "/api/health/readiness"] {
        let operation = &document["paths"][path]["get"];
        let frozen = &existing["paths"][path]["get"];
        assert_eq!(operation["operationId"], frozen["operationId"]);
        let mut actual_responses = operation["responses"].clone();
        let mut frozen_responses = frozen["responses"].clone();
        // Description/title are metadata, normalized on both sides as in the
        // independent verifier. Status/content/schema references remain exact.
        normalize_responses(&mut actual_responses);
        normalize_responses(&mut frozen_responses);
        assert_eq!(actual_responses, frozen_responses);
        assert!(
            operation
                .get("parameters")
                .is_none_or(|p| p.as_array().is_some_and(Vec::is_empty))
        );
        for method in ["post", "put", "patch", "delete", "head", "options"] {
            assert!(document["paths"][path].get(method).is_none());
        }
    }
    let schemas = document["components"]["schemas"]
        .as_object()
        .ok_or("missing schemas")?;
    for name in [
        "HealthCheckDto",
        "HealthChecksDto",
        "HealthDependencyCheckDto",
    ] {
        let mut actual = schemas[name].clone();
        let mut expected = existing["components"]["schemas"][name].clone();
        normalize_schema(&mut actual);
        normalize_schema(&mut expected);
        assert_eq!(actual, expected, "schema {name}");
    }
    Ok(())
}

#[test]
fn auth_documentation_preserves_original_paths_recursive_schemas_and_security() -> TestResult {
    let document = http::openapi();
    let existing: Value = serde_json::from_str(EXISTING_OPENAPI)?;
    assert_eq!(document["openapi"], existing["openapi"]);
    for path in [
        "/api/auth/sessions",
        "/api/auth/session",
        "/api/auth/csrf-token",
        "/api/auth/session:logout",
    ] {
        assert_eq!(
            document["paths"][path], existing["paths"][path],
            "documented auth path {path}"
        );
    }
    let schemas = document["components"]["schemas"]
        .as_object()
        .ok_or("missing schemas")?;
    for (name, schema) in schemas {
        if ![
            "HealthCheckDto",
            "HealthChecksDto",
            "HealthDependencyCheckDto",
        ]
        .contains(&name.as_str())
        {
            assert_eq!(
                schema, &existing["components"]["schemas"][name],
                "auth metadata {name}"
            );
        }
    }
    assert_eq!(
        document["components"]["securitySchemes"],
        existing["components"]["securitySchemes"]
    );
    // These assertions certify document preservation only. Runtime transport
    // and persistence are exercised by independent HTTP and PG15 tests.
    Ok(())
}

#[test]
fn schema_normalization_preserves_real_field_names_and_literal_values() {
    let mut schema = json!({
        "type": "object", "title": "metadata", "description": "metadata",
        "properties": {
            "title": {"type": "string", "description": "metadata"},
            "description": {"type": "string", "title": "metadata"}
        },
        "example": {"title": "literal title", "description": "literal description"},
        "enum": [{"title": "literal enum title"}]
    });
    normalize_schema(&mut schema);
    assert!(schema.get("title").is_none());
    assert!(schema.get("description").is_none());
    assert_eq!(schema["properties"]["title"], json!({"type": "string"}));
    assert_eq!(
        schema["properties"]["description"],
        json!({"type": "string"})
    );
    assert_eq!(
        schema["example"],
        json!({"title": "literal title", "description": "literal description"})
    );
    assert_eq!(schema["enum"], json!([{"title": "literal enum title"}]));

    let mut responses = json!({"200": {"description": "metadata", "content": {
        "application/json": {"schema": {"type": "object", "properties": {
            "description": {"type": "string"}
        }}}
    }}});
    normalize_responses(&mut responses);
    assert!(responses["200"].get("description").is_none());
    assert_eq!(
        responses["200"]["content"]["application/json"]["schema"]["properties"]["description"],
        json!({"type": "string"})
    );
}

#[test]
fn public_operation_comparison_rejects_inherited_authentication() -> TestResult {
    let existing: Value = serde_json::from_str(EXISTING_OPENAPI)?;
    let mut document = serde_json::to_value(http::openapi())?;
    document["security"] = json!([{"Bearer": []}]);
    for path in ["/api", "/api/health", "/api/health/readiness"] {
        document["paths"][path]["get"]
            .as_object_mut()
            .ok_or("missing operation")?
            .remove("security");
    }
    assert!(!public_security_matches(&document, &existing));
    for path in ["/api", "/api/health", "/api/health/readiness"] {
        // An explicit empty operation requirement legitimately overrides global
        // security; the comparison must implement OpenAPI inheritance semantics.
        document["paths"][path]["get"]["security"] = json!([]);
    }
    assert!(public_security_matches(&document, &existing));
    Ok(())
}
