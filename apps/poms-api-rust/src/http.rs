//! Existing public health, authentication and R2A navigation operations.
//! OpenAPI is returned to the CLI; it does not add a documentation HTTP route.

use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{Instant, SystemTime},
};

use axum::{
    Json, Router,
    extract::{OriginalUri, Request, State},
    http::{HeaderValue, Method, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::Serialize;
use serde_json::json;
use utoipa::{
    OpenApi, ToSchema,
    openapi::{Ref, schema::ObjectBuilder, schema::Type},
};

use crate::{database::Database, error::ApiError, logging};

pub const DATABASE_UNAVAILABLE_MESSAGE: &str = "Database connection is unavailable.";
static NEXT_REQUEST_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Clone)]
pub struct AppState {
    pub database: Database,
    pub started_at: Instant,
}

#[derive(Serialize)]
struct RootResponse {
    message: &'static str,
}

#[derive(Clone, Copy, Serialize, ToSchema)]
pub enum ServiceName {
    #[serde(rename = "poms-api")]
    PomsApi,
}

#[derive(Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum HealthOverallStatus {
    Live,
    Ready,
    NotReady,
}

#[derive(Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum HealthCheckStatus {
    Pass,
    Fail,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HealthDependencyCheckDto {
    #[schema(inline)]
    pub status: HealthCheckStatus,
    pub message: &'static str,
    // Swagger's Number is an unconstrained JSON number, not an integer schema.
    #[schema(schema_with = legacy_number_schema)]
    pub duration_ms: u64,
}

impl HealthDependencyCheckDto {
    pub fn passed(duration_ms: u64) -> Self {
        Self {
            status: HealthCheckStatus::Pass,
            message: "Database connection is healthy.",
            duration_ms,
        }
    }

    pub fn unavailable(duration_ms: u64) -> Self {
        Self {
            status: HealthCheckStatus::Fail,
            message: DATABASE_UNAVAILABLE_MESSAGE,
            duration_ms,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct HealthChecksDto {
    pub process: HealthDependencyCheckDto,
    // Optional does not mean nullable in the current Swagger schema.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(schema_with = dependency_reference)]
    pub database: Option<HealthDependencyCheckDto>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheckDto {
    #[schema(inline)]
    pub service: ServiceName,
    #[schema(inline)]
    pub status: HealthOverallStatus,
    #[schema(format = DateTime)]
    pub checked_at: String,
    #[schema(schema_with = legacy_number_schema)]
    pub uptime_seconds: u64,
    pub checks: HealthChecksDto,
}

impl HealthCheckDto {
    pub fn liveness(checked_at: String, uptime_seconds: u64) -> Self {
        Self::view(HealthOverallStatus::Live, checked_at, uptime_seconds, None)
    }

    pub fn readiness(
        checked_at: String,
        uptime_seconds: u64,
        database: HealthDependencyCheckDto,
    ) -> Self {
        let status = match database.status {
            HealthCheckStatus::Pass => HealthOverallStatus::Ready,
            HealthCheckStatus::Fail => HealthOverallStatus::NotReady,
        };
        Self::view(status, checked_at, uptime_seconds, Some(database))
    }

    fn view(
        status: HealthOverallStatus,
        checked_at: String,
        uptime_seconds: u64,
        database: Option<HealthDependencyCheckDto>,
    ) -> Self {
        Self {
            service: ServiceName::PomsApi,
            status,
            checked_at,
            uptime_seconds,
            checks: HealthChecksDto {
                process: HealthDependencyCheckDto {
                    status: HealthCheckStatus::Pass,
                    message: "API process is running.",
                    duration_ms: 0,
                },
                database,
            },
        }
    }
}

fn legacy_number_schema() -> utoipa::openapi::schema::Object {
    ObjectBuilder::new().schema_type(Type::Number).build()
}

fn dependency_reference() -> Ref {
    Ref::from_schema_name("HealthDependencyCheckDto")
}

#[derive(OpenApi)]
#[openapi(
    info(title = "POMS API (R2A subset)", version = "0.1.0"),
    paths(root, liveness, readiness),
    components(schemas(HealthCheckDto, HealthChecksDto, HealthDependencyCheckDto))
)]
struct ApplicationApi;

pub fn openapi() -> serde_json::Value {
    let mut document = serde_json::to_value(ApplicationApi::openapi())
        .unwrap_or_else(|_| panic!("invalid static health OpenAPI metadata"));
    let authentication = crate::auth::http::openapi();
    // Keep the TS-owned OpenAPI 3.0 schema vocabulary intact. Deserializing it
    // as Utoipa's OpenAPI 3.1 types would narrow or discard existing metadata.
    document["openapi"] = authentication["openapi"].clone();
    for subset in [authentication, crate::navigation::http::openapi()] {
        assert_eq!(document["openapi"], subset["openapi"]);
        for (path, operation) in subset["paths"].as_object().into_iter().flatten() {
            assert!(
                document["paths"][path].is_null(),
                "duplicate OpenAPI path {path}"
            );
            document["paths"][path] = operation.clone();
        }
        for (kind, entries) in subset["components"].as_object().into_iter().flatten() {
            for (name, value) in entries.as_object().into_iter().flatten() {
                if document["components"][kind].is_null() {
                    document["components"][kind] = json!({});
                }
                let existing = &document["components"][kind][name];
                assert!(
                    existing.is_null() || existing == value,
                    "conflicting OpenAPI component {kind}/{name}"
                );
                document["components"][kind][name] = value.clone();
            }
        }
    }
    document
}

pub fn router(state: AppState, cors_origins: &[String]) -> Router {
    wrap_router(health_routes(state), cors_origins)
}

pub fn router_with_auth(
    state: AppState,
    cors_origins: &[String],
    auth: crate::auth::http::AuthHttpState,
) -> Router {
    wrap_router(
        health_routes(state)
            .merge(crate::auth::http::router(auth.clone()))
            .merge(crate::navigation::http::router(auth)),
        cors_origins,
    )
}

fn health_routes(state: AppState) -> Router {
    Router::new()
        .route("/api", get(root))
        .route("/api/health", get(liveness))
        .route("/api/health/readiness", get(readiness))
        .with_state(state)
}

fn wrap_router(application: Router, cors_origins: &[String]) -> Router {
    let policy = CorsPolicy {
        origins: cors_origins
            .iter()
            .map(|origin| HeaderValue::from_str(origin))
            .collect::<Result<Vec<_>, _>>()
            .ok(),
    };
    let application = application
        // Nest reports an unmatched method as 404, not Axum's default 405.
        .method_not_allowed_fallback(not_found)
        .fallback(not_found);
    // MethodRouter adds Allow after its route-level layers finish. Enclose the
    // complete router so the Nest 404 normalization runs after that final step.
    Router::new()
        .fallback_service(application)
        .layer(middleware::from_fn(crate::auth::http::body_parser))
        .layer(middleware::from_fn_with_state(policy, observe_and_cors))
}

#[utoipa::path(
    get,
    path = "/api",
    operation_id = "AppController_getData",
    tag = "App",
    responses((status = 200, description = "OK"))
)]
async fn root() -> Json<RootResponse> {
    // The existing 200 OpenAPI response deliberately has no schema.
    Json(RootResponse {
        message: "Hello API",
    })
}

#[utoipa::path(
    get,
    path = "/api/health",
    operation_id = "HealthController_getLiveness",
    summary = "API liveness check",
    tag = "Health",
    responses((status = 200, description = "OK", body = HealthCheckDto))
)]
async fn liveness(State(state): State<AppState>) -> Json<HealthCheckDto> {
    Json(HealthCheckDto::liveness(
        checked_at(),
        state.started_at.elapsed().as_secs(),
    ))
}

#[utoipa::path(
    get,
    path = "/api/health/readiness",
    operation_id = "HealthController_getReadiness",
    summary = "API readiness check",
    tag = "Health",
    responses(
        (status = 200, description = "OK", body = HealthCheckDto),
        (status = 503, description = "Service Unavailable", body = HealthCheckDto)
    )
)]
async fn readiness(State(state): State<AppState>) -> Response {
    let started = Instant::now();
    let ready = state.database.probe_readiness().await.is_ok();
    let duration_ms = milliseconds(started);
    let (status, database) = if ready {
        (
            StatusCode::OK,
            HealthDependencyCheckDto::passed(duration_ms),
        )
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            HealthDependencyCheckDto::unavailable(duration_ms),
        )
    };
    (
        status,
        Json(HealthCheckDto::readiness(
            checked_at(),
            state.started_at.elapsed().as_secs(),
            database,
        )),
    )
        .into_response()
}

fn checked_at() -> String {
    DateTime::<Utc>::from(SystemTime::now()).to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn milliseconds(started: Instant) -> u64 {
    u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX)
}

async fn not_found(method: Method, OriginalUri(uri): OriginalUri) -> Response {
    // The actual Nest/Express bootstrap falls through to finalhandler. R1A's
    // JSON assumption was corrected using the R1C original HTTP oracle.
    let path = encode_resource_path(uri.path());
    let message = format!("Cannot {method} {path}")
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    let html = format!(
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>{message}</pre>\n</body>\n</html>\n"
    );
    (
        StatusCode::NOT_FOUND,
        [
            (header::CONTENT_TYPE, "text/html; charset=utf-8"),
            (header::CONTENT_SECURITY_POLICY, "default-src 'none'"),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        ],
        html,
    )
        .into_response()
}

fn encode_resource_path(path: &str) -> String {
    let mut encoded = String::new();
    let bytes = path.as_bytes();
    for (index, &byte) in bytes.iter().enumerate() {
        let safe = matches!(byte, b'!' | b'#'..=b'$' | b'&'..=b';' | b'=' | b'?'..=b'_' | b'a'..=b'z' | b'|' | b'~')
            || (byte == b'%'
                && bytes.get(index + 1).is_some_and(u8::is_ascii_hexdigit)
                && bytes.get(index + 2).is_none_or(u8::is_ascii_hexdigit));
        if safe {
            encoded.push(char::from(byte));
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

#[derive(Clone)]
struct CorsPolicy {
    // Config validation rejects invalid header bytes before listening. Retain a
    // fail-closed response if a caller bypasses that configuration boundary.
    origins: Option<Vec<HeaderValue>>,
}

async fn observe_and_cors(
    State(policy): State<CorsPolicy>,
    request: Request,
    next: Next,
) -> Response {
    let started = Instant::now();
    let request_id = format!(
        "r1a-{}-{}",
        std::process::id(),
        NEXT_REQUEST_ID.fetch_add(1, Ordering::Relaxed)
    );
    // Only these registered templates may reach the logger. A request's URI is
    // used for equality checks, never as the recorded value (including errors).
    let route = match request.uri().path() {
        "/api" => "/api",
        "/api/health" => "/api/health",
        "/api/health/readiness" => "/api/health/readiness",
        "/api/auth/sessions" => "/api/auth/sessions",
        "/api/auth/session" => "/api/auth/session",
        "/api/auth/session:logout" => "/api/auth/session:logout",
        "/api/auth/csrf-token" => "/api/auth/csrf-token",
        _ => "<unmatched>",
    };
    let preflight = request.method() == Method::OPTIONS;
    let origin = request.headers().get(header::ORIGIN).cloned();
    let mut response = if policy.origins.is_none() {
        ApiError::internal().into_response()
    } else if preflight {
        // Nest's global CORS middleware handles preflight without adding a route.
        StatusCode::NO_CONTENT.into_response()
    } else {
        next.run(request).await
    };

    let headers = response.headers_mut();
    if let Some(origins) = &policy.origins {
        let allowed_origin = match origins.as_slice() {
            [only] => Some(only.clone()),
            many => origin.filter(|value| many.contains(value)),
        };
        if let Some(origin) = allowed_origin {
            headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        }
        headers.append(header::VARY, HeaderValue::from_static("Origin"));
        headers.insert(
            header::ACCESS_CONTROL_ALLOW_CREDENTIALS,
            HeaderValue::from_static("true"),
        );
        if preflight {
            headers.insert(
                header::ACCESS_CONTROL_ALLOW_METHODS,
                HeaderValue::from_static("GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"),
            );
            headers.insert(
                header::ACCESS_CONTROL_ALLOW_HEADERS,
                HeaderValue::from_static("Accept,Content-Type,X-CSRF-Token"),
            );
            headers.insert(header::CONTENT_LENGTH, HeaderValue::from_static("0"));
        }
    }
    if headers
        .get(header::CONTENT_TYPE)
        .is_some_and(|value| value == "application/json")
    {
        headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json; charset=utf-8"),
        );
    }
    if response.status() == StatusCode::NOT_FOUND {
        response.headers_mut().remove(header::ALLOW);
    }
    if let Ok(value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert("x-request-id", value);
    }
    logging::event(
        "http_request",
        json!({
            "requestId": request_id,
            "route": route,
            "status": response.status().as_u16(),
            "durationMs": milliseconds(started)
        }),
    );
    response
}
