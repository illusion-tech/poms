//! The R1A HTTP surface is the three existing public GET operations only.
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
    info(title = "POMS API (R1A subset)", version = "0.1.0"),
    paths(root, liveness, readiness),
    components(schemas(HealthCheckDto, HealthChecksDto, HealthDependencyCheckDto))
)]
struct ApplicationApi;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApplicationApi::openapi()
}

pub fn router(state: AppState, cors_origins: &[String]) -> Router {
    let policy = CorsPolicy {
        origins: cors_origins
            .iter()
            .map(|origin| HeaderValue::from_str(origin))
            .collect::<Result<Vec<_>, _>>()
            .ok(),
    };
    let application = Router::new()
        .route("/api", get(root))
        .route("/api/health", get(liveness))
        .route("/api/health/readiness", get(readiness))
        // Nest reports an unmatched method as 404, not Axum's default 405.
        .method_not_allowed_fallback(not_found)
        .fallback(not_found)
        .with_state(state);
    // MethodRouter adds Allow after its route-level layers finish. Enclose the
    // complete router so the Nest 404 normalization runs after that final step.
    Router::new()
        .fallback_service(application)
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

async fn not_found(method: Method, OriginalUri(uri): OriginalUri) -> ApiError {
    ApiError::not_found(&method, &uri)
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
