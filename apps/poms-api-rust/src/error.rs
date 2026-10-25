//! Transport errors preserve Nest's string, explicit-object and unknown-error
//! shapes. Authentication, DTO validation and domain decisions remain in R1B/C.

use axum::{
    Json,
    http::{HeaderValue, Method, StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    body: Value,
}

impl ApiError {
    /// Nest's standard string HttpException includes the status description.
    pub fn message(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            body: json!({
                "statusCode": status.as_u16(),
                "message": message.into(),
                "error": status.canonical_reason().unwrap_or("Error")
            }),
        }
    }

    /// An explicit object is already the response body: do not wrap it, add an
    /// error field, or rewrite its code/message/errors members.
    pub fn object(status: StatusCode, body: Value) -> Self {
        Self { status, body }
    }

    /// Nest's BaseExceptionFilter accepts an HTTP-like status/message object.
    pub fn http_like(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            body: json!({ "statusCode": status.as_u16(), "message": message.into() }),
        }
    }

    pub fn internal() -> Self {
        Self::http_like(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
    }

    pub fn not_found(method: &Method, uri: &Uri) -> Self {
        Self::message(StatusCode::NOT_FOUND, format!("Cannot {method} {uri}"))
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let mut response = (self.status, Json(self.body)).into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json; charset=utf-8"),
        );
        response
    }
}
