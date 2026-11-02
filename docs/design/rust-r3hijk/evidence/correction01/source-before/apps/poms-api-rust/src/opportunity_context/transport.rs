//! Shared transport mechanics; each domain retains its original route policy.
use crate::{auth::cookie::decode_uri_component, error::ApiError, projects::model::Wire};
use axum::{
    extract::{OriginalUri, Request},
    http::{HeaderValue, StatusCode, Uri, header},
    response::{IntoResponse, Response},
};

pub fn response(status: StatusCode, value: Wire) -> Response {
    let mut response = (status, value.0).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    response
}

pub fn not_found(request: &Request) -> Response {
    let uri = request
        .extensions()
        .get::<OriginalUri>()
        .map_or_else(|| request.uri().clone(), |u| u.0.clone());
    ApiError::not_found(request.method(), &uri).into_response()
}

pub fn rewrite(mut request: Request, path: String) -> Result<Request, ApiError> {
    if request.uri().path() != path {
        if request.extensions().get::<OriginalUri>().is_none() {
            let original = request.uri().clone();
            request.extensions_mut().insert(OriginalUri(original));
        }
        let mut parts = request.uri().clone().into_parts();
        let path = match request.uri().query() {
            Some(q) => format!("{path}?{q}"),
            None => path,
        };
        parts.path_and_query = Some(path.parse().map_err(|_| ApiError::internal())?);
        *request.uri_mut() = Uri::from_parts(parts).map_err(|_| ApiError::internal())?;
    }
    Ok(request)
}

pub fn validate_path_parameter(raw: &str) -> Result<(), ApiError> {
    decode_uri_component(raw).map(|_| ()).map_err(|_| {
        ApiError::message(
            StatusCode::BAD_REQUEST,
            format!("Failed to decode param '{raw}'"),
        )
    })
}
