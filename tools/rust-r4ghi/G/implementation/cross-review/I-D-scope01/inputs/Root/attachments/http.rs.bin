//! The original J19/K5 routes. Shared binary transport runs after service audit.
use super::{
    model::{RequestData, Wire},
    service::{AttachmentsService, CallContext},
    validation,
};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    binary_http,
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{OriginalUri, Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
};
use serde_json::Value;
use std::sync::Arc;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Op {
    Center,
    CreateSession,
    GetSession,
    Target,
    Proxy,
    Complete,
    Abort,
    List,
    Get,
    Update,
    Mark,
    Clear,
    Void,
    Download,
    Preview,
    Thumbnail,
    History,
    Link,
    Unlink,
    HandoverChecklist,
    RefreshHandoverChecklist,
    CreateHandoverPackage,
    GetPackage,
    DownloadPackage,
}
impl Op {
    fn writing(self) -> bool {
        matches!(
            self,
            Self::CreateSession
                | Self::Target
                | Self::Proxy
                | Self::Complete
                | Self::Abort
                | Self::Update
                | Self::Mark
                | Self::Clear
                | Self::Void
                | Self::Link
                | Self::Unlink
        )
    }
}
fn policy(op: Op) -> RoutePolicy {
    if matches!(
        op,
        Op::HandoverChecklist
            | Op::RefreshHandoverChecklist
            | Op::CreateHandoverPackage
            | Op::GetPackage
            | Op::DownloadPackage
    ) {
        return RoutePolicy {
            all: vec![if op == Op::RefreshHandoverChecklist {
                PermissionKey::ProjectWrite
            } else {
                PermissionKey::ProjectRead
            }],
            ..RoutePolicy::default()
        };
    }
    RoutePolicy {
        any: if op.writing() {
            vec![
                PermissionKey::CustomerWrite,
                PermissionKey::LeadWrite,
                PermissionKey::ProjectWrite,
            ]
        } else {
            vec![
                PermissionKey::CustomerRead,
                PermissionKey::LeadRead,
                PermissionKey::ProjectRead,
            ]
        },
        ..RoutePolicy::default()
    }
}
pub fn router(auth: AuthHttpState, service: Arc<AttachmentsService>) -> Router {
    Router::new()
        .route("/api/attachment-center-records", get(dispatch))
        .route("/api/attachment-upload-sessions", post(dispatch))
        .route(
            "/api/attachment-upload-sessions/{id}",
            get(dispatch).post(dispatch),
        )
        .route(
            "/api/attachment-upload-sessions/{id}/upload-targets",
            post(dispatch),
        )
        .route("/api/attachment-upload-sessions/{id}/object", put(dispatch))
        .route("/api/attachments", get(dispatch))
        .route(
            "/api/attachments/{id}",
            get(dispatch).patch(dispatch).post(dispatch),
        )
        .route("/api/attachments/{id}/preview", get(dispatch))
        .route("/api/attachments/{id}/thumbnail", get(dispatch))
        .route("/api/attachments/{id}/download", get(dispatch))
        .route("/api/attachments/{id}/versions", get(dispatch))
        .route("/api/attachments/{id}/links", post(dispatch))
        .route("/api/attachments/{id}/links/{linkId}", delete(dispatch))
        .route(
            "/api/project-handovers/{id}/attachment-checklist",
            get(dispatch),
        )
        .route(
            "/api/project-handovers/{id}/attachment-checklist:refresh",
            post(dispatch),
        )
        .route(
            "/api/project-handovers/{id}/attachment-download-packages",
            post(dispatch),
        )
        .route("/api/attachment-download-packages/{id}", get(dispatch))
        .route(
            "/api/attachment-download-packages/{id}/download",
            get(dispatch),
        )
        .layer(Extension(service))
        .with_state(auth)
}
pub fn openapi() -> Value {
    let mut output: Value =
        serde_json::from_str(include_str!("../../../../tools/rust-r2ij/j-openapi.json"))
            .unwrap_or_else(|_| panic!("original J19 OpenAPI"));
    let k: Value = serde_json::from_str(include_str!("../../../../tools/rust-r2k/k-openapi.json"))
        .unwrap_or_else(|_| panic!("original K5 OpenAPI"));
    for (path, operation) in k["paths"].as_object().into_iter().flatten() {
        output["paths"][path] = operation.clone();
    }
    for (name, schema) in k["components"]["schemas"].as_object().into_iter().flatten() {
        output["components"]["schemas"][name] = schema.clone();
    }
    output
}
fn command<'a>(value: &'a str, suffix: &str) -> Option<&'a str> {
    let at = value.len().checked_sub(suffix.len())?;
    let (prefix, tail) = value.get(..at).zip(value.get(at..))?;
    (!prefix.is_empty() && tail.eq_ignore_ascii_case(suffix)).then_some(prefix)
}
fn operation(method: &Method, path: &str) -> Option<Op> {
    let parts = path.split('/').collect::<Vec<_>>();
    let safe = matches!(*method, Method::GET | Method::HEAD);
    Some(match parts.as_slice() {
        ["", "api", "attachment-center-records"] if safe => Op::Center,
        ["", "api", "attachment-upload-sessions"] if *method == Method::POST => Op::CreateSession,
        ["", "api", "attachment-upload-sessions", _] if safe => Op::GetSession,
        ["", "api", "attachment-upload-sessions", id]
            if *method == Method::POST && command(id, ":complete").is_some() =>
        {
            Op::Complete
        }
        ["", "api", "attachment-upload-sessions", id]
            if *method == Method::POST && command(id, ":abort").is_some() =>
        {
            Op::Abort
        }
        ["", "api", "attachment-upload-sessions", _, "upload-targets"]
            if *method == Method::POST =>
        {
            Op::Target
        }
        ["", "api", "attachment-upload-sessions", _, "object"] if *method == Method::PUT => {
            Op::Proxy
        }
        ["", "api", "attachments"] if safe => Op::List,
        ["", "api", "attachments", _] if safe => Op::Get,
        ["", "api", "attachments", _] if *method == Method::PATCH => Op::Update,
        ["", "api", "attachments", id]
            if *method == Method::POST && command(id, ":void").is_some() =>
        {
            Op::Void
        }
        ["", "api", "attachments", id]
            if *method == Method::POST && command(id, ":mark-final").is_some() =>
        {
            Op::Mark
        }
        ["", "api", "attachments", id]
            if *method == Method::POST && command(id, ":clear-final").is_some() =>
        {
            Op::Clear
        }
        ["", "api", "attachments", _, "download"] if safe => Op::Download,
        ["", "api", "attachments", _, "preview"] if safe => Op::Preview,
        ["", "api", "attachments", _, "thumbnail"] if safe => Op::Thumbnail,
        ["", "api", "attachments", _, "versions"] if safe => Op::History,
        ["", "api", "attachments", _, "links"] if *method == Method::POST => Op::Link,
        ["", "api", "attachments", _, "links", _] if *method == Method::DELETE => Op::Unlink,
        ["", "api", "project-handovers", _, "attachment-checklist"] if safe => {
            Op::HandoverChecklist
        }
        [
            "",
            "api",
            "project-handovers",
            _,
            "attachment-checklist:refresh",
        ] if *method == Method::POST => Op::RefreshHandoverChecklist,
        [
            "",
            "api",
            "project-handovers",
            _,
            "attachment-download-packages",
        ] if *method == Method::POST => Op::CreateHandoverPackage,
        ["", "api", "attachment-download-packages", _] if safe => Op::GetPackage,
        ["", "api", "attachment-download-packages", _, "download"] if safe => Op::DownloadPackage,
        _ => return None,
    })
}
fn suffix(op: Op) -> Option<&'static str> {
    match op {
        Op::Complete => Some(":complete"),
        Op::Abort => Some(":abort"),
        Op::Void => Some(":void"),
        Op::Mark => Some(":mark-final"),
        Op::Clear => Some(":clear-final"),
        _ => None,
    }
}
fn canonical_path(path: &str) -> Option<String> {
    let path = path.strip_suffix('/').unwrap_or(path);
    if path.ends_with('/') {
        return None;
    }
    let mut parts = path.split('/').map(str::to_owned).collect::<Vec<_>>();
    if parts.len() < 3
        || !parts[1].eq_ignore_ascii_case("api")
        || ![
            "attachments",
            "attachment-upload-sessions",
            "attachment-center-records",
            "project-handovers",
            "attachment-download-packages",
        ]
        .iter()
        .any(|v| parts[2].eq_ignore_ascii_case(v))
    {
        return None;
    }
    parts[1].make_ascii_lowercase();
    parts[2].make_ascii_lowercase();
    if parts.len() > 4 {
        parts[4].make_ascii_lowercase();
    }
    Some(parts.join("/"))
}
fn invalid_registered_capture(path: &str) -> Option<&str> {
    let pieces = path.split('/').collect::<Vec<_>>();
    // Express decodes parameters while matching every registered layer, even
    // when that layer's HTTP method does not dispatch. Preserve the entire raw
    // capture (including a command suffix) in its pre-guard decode error.
    let indices: &[usize] = match pieces.as_slice() {
        ["", "api", "attachments", _] | ["", "api", "attachment-upload-sessions", _] => &[3],
        [
            "",
            "api",
            "attachments",
            _,
            "preview" | "thumbnail" | "download" | "versions" | "links",
        ]
        | [
            "",
            "api",
            "attachment-upload-sessions",
            _,
            "object" | "upload-targets",
        ] => &[3],
        ["", "api", "attachments", _, "links", _] => &[3, 5],
        [
            "",
            "api",
            "project-handovers",
            _,
            "attachment-checklist"
            | "attachment-checklist:refresh"
            | "attachment-download-packages",
        ]
        | ["", "api", "attachment-download-packages", _]
        | ["", "api", "attachment-download-packages", _, "download"] => &[3],
        _ => &[],
    };
    indices.iter().find_map(|&index| {
        pieces
            .get(index)
            .filter(|capture| decode_uri_component(capture).is_err())
            .copied()
    })
}
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    if let Some(path) = canonical_path(request.uri().path()) {
        if let Some(capture) = invalid_registered_capture(&path) {
            return ApiError::message(
                StatusCode::BAD_REQUEST,
                format!("Failed to decode param '{capture}'"),
            )
            .into_response();
        }
        if operation(request.method(), &path).is_some() && path != request.uri().path() {
            let mut uri_parts = request.uri().clone().into_parts();
            uri_parts.path_and_query = match request.uri().query() {
                Some(query) => format!("{path}?{query}"),
                None => path,
            }
            .parse()
            .ok();
            if let Ok(uri) = Uri::from_parts(uri_parts) {
                if request.extensions().get::<OriginalUri>().is_none() {
                    let original = request.uri().clone();
                    request.extensions_mut().insert(OriginalUri(original));
                }
                *request.uri_mut() = uri;
            }
        }
    }
    next.run(request).await
}

fn json_response(output: Wire, status: StatusCode) -> Response {
    let mut response = (status, output.0).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    response
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<AttachmentsService>>,
    request: Request,
) -> Response {
    let Some(op) = operation(request.method(), request.uri().path()) else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |v| v.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(uri)).await;
    };
    let (mut parts, body) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let resolved = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &policy(op),
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(Some(session)) => session,
        Ok(None) => return ApiError::internal().into_response(),
        Err(response) => return response,
    };
    let path = parts.uri.path().to_owned();
    let captures = path.split('/').collect::<Vec<_>>();
    let id = if let Some(raw) = captures.get(3) {
        let raw = suffix(op).and_then(|s| command(raw, s)).unwrap_or(raw);
        match decode_uri_component(raw) {
            Ok(id) => id,
            Err(_) => return ApiError::internal().into_response(),
        }
    } else {
        String::new()
    };
    let link_id = if let Some(raw) = captures.get(5) {
        match decode_uri_component(raw) {
            Ok(id) => id,
            Err(_) => return ApiError::internal().into_response(),
        }
    } else {
        String::new()
    };
    let parsed = parts.extensions.remove::<ParsedBody>().unwrap_or_default();
    let query = validation::query_raw(parts.uri.query());
    let schema = match op {
        Op::CreateSession => Some(("CreateAttachmentUploadSessionRequest", parsed.raw())),
        Op::Target => Some(("CreateAttachmentUploadTargetRequest", parsed.raw())),
        Op::Complete => Some(("CompleteAttachmentUploadSessionRequest", parsed.raw())),
        Op::Abort => Some(("AbortAttachmentUploadSessionRequest", parsed.raw())),
        Op::Update => Some(("UpdateAttachmentRequest", parsed.raw())),
        Op::Mark => Some(("MarkAttachmentFinalRequest", parsed.raw())),
        Op::Clear => Some(("ClearAttachmentFinalRequest", parsed.raw())),
        Op::Void => Some(("VoidAttachmentRequest", parsed.raw())),
        Op::Link => Some(("CreateAttachmentLinkRequest", parsed.raw())),
        Op::List => Some(("AttachmentListQuery", Some(query.as_str()))),
        Op::RefreshHandoverChecklist => Some((
            "RefreshProjectHandoverAttachmentChecklistRequest",
            parsed.raw(),
        )),
        Op::CreateHandoverPackage => Some((
            "CreateProjectHandoverAttachmentDownloadPackageRequest",
            parsed.raw(),
        )),
        _ => None,
    };
    let input = match schema
        .map(|(name, raw)| validation::validate(name, raw))
        .transpose()
    {
        Ok(value) => value.unwrap_or(RequestData { raw: "{}".into() }),
        Err(error) => return error.into_response(),
    };
    let mut ctx = CallContext::new(&resolved);
    let request_id = metadata.request_id.as_deref();
    if matches!(
        op,
        Op::Download | Op::Preview | Op::Thumbnail | Op::DownloadPackage
    ) {
        let kind = match op {
            Op::Preview => "preview",
            Op::Thumbnail => "thumbnail",
            _ => "download",
        };
        let payload = if op == Op::DownloadPackage {
            service.download_package(&id, request_id, &mut ctx).await
        } else {
            service.binary(&id, kind, request_id, &mut ctx).await
        };
        return match payload {
            Ok(payload) => match binary_http::respond(payload, &parts.method).await {
                Ok(response) => response,
                Err(error) => binary_http::controller_error(error).await,
            },
            Err(error) => binary_http::controller_error(error.into_api_error()).await,
        };
    }
    let result = match op {
        Op::Center => service.center(&mut ctx).await,
        Op::CreateSession => service.create_session(&input, request_id, &mut ctx).await,
        Op::GetSession => service.get_session(&id, &mut ctx).await,
        Op::Target => service.upload_target(&id, &input, &mut ctx).await,
        Op::Proxy => {
            let bytes = match binary_http::read_unparsed_body(body).await {
                Ok(bytes) => bytes,
                Err(_) => return ApiError::internal().into_response(),
            };
            service.proxy_object(&id, &bytes, &mut ctx).await
        }
        Op::Complete => service.complete(&id, &input, request_id, &mut ctx).await,
        Op::Abort => service.abort(&id, &input, request_id, &mut ctx).await,
        Op::List => service.list(&input, &mut ctx).await,
        Op::Get => service.get(&id, &mut ctx).await,
        Op::Update => service.update(&id, &input, request_id, &mut ctx).await,
        Op::Mark => service.mark_final(&id, &input, request_id, &mut ctx).await,
        Op::Clear => service.clear_final(&id, &input, request_id, &mut ctx).await,
        Op::Void => service.void(&id, &input, request_id, &mut ctx).await,
        Op::History => service.history(&id, &mut ctx).await,
        Op::Link => service.link(&id, &input, request_id, &mut ctx).await,
        Op::Unlink => service.unlink(&id, &link_id, request_id, &mut ctx).await,
        Op::HandoverChecklist => service.handover_checklist(&id, request_id, &mut ctx).await,
        Op::RefreshHandoverChecklist => {
            service
                .refresh_handover_checklist(&id, &input, request_id, &mut ctx)
                .await
        }
        Op::CreateHandoverPackage => {
            service
                .create_handover_download_package(&id, &input, request_id, &mut ctx)
                .await
        }
        Op::GetPackage => service.get_download_package(&id, &mut ctx).await,
        _ => return ApiError::internal().into_response(),
    };
    match result {
        Ok(output) => json_response(
            output,
            if op == Op::CreateSession {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
        ),
        Err(error) => error.into_api_error().into_response(),
    }
}

#[cfg(test)]
mod route_decode_tests {
    use super::{canonical_path, invalid_registered_capture};

    #[test]
    fn native_registered_layer_decodes_whole_capture_before_method_and_guard() {
        // Frozen original HTTP authority: route-nest-route15.json. No database
        // or guard is involved in this route-layer-only decision.
        for (raw, expected) in [
            ("/api/attachments/%GG:unknown", Some("%GG:unknown")),
            ("/api/attachments/%GG:mark-final", Some("%GG:mark-final")),
            ("/api/attachments/%GG", Some("%GG")),
            ("/api/attachments/%GG/preview", Some("%GG")),
            ("/api/attachments/%GG/thumbnail", Some("%GG")),
            ("/api/attachments/%GG/download", Some("%GG")),
            ("/api/attachments/%GG/versions", Some("%GG")),
            ("/api/attachments/%GG/links", Some("%GG")),
            ("/api/attachments/%GG/links/%HH", Some("%GG")),
            ("/api/attachments/valid/links/%HH", Some("%HH")),
            (
                "/api/attachment-upload-sessions/%GG:unknown",
                Some("%GG:unknown"),
            ),
            (
                "/api/attachment-upload-sessions/%GG:complete",
                Some("%GG:complete"),
            ),
            ("/api/attachment-upload-sessions/%GG/object", Some("%GG")),
            (
                "/api/attachment-upload-sessions/%GG/upload-targets",
                Some("%GG"),
            ),
            ("/api/attachments/%GG/not-registered", None),
            ("/api/attachment-upload-sessions/%GG/not-registered", None),
            ("/api/attachment-center-records/%GG", None),
        ] {
            let path = canonical_path(raw).unwrap_or_else(|| panic!("J static prefix: {raw}"));
            assert_eq!(invalid_registered_capture(&path), expected, "{raw}");
        }
    }
}
