//! Original six routes; guard and request parser stay in the shared R1 transport.
use super::{AttachmentStorage, CallContext, validation};
use crate::{
    auth::{
        cookie::decode_uri_component,
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    shared::generated::PermissionKey,
};
use axum::{
    Extension, Router,
    extract::{FromRequestParts, OriginalUri, Path, Request, State},
    http::{Method, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
};
use std::sync::Arc;
const BASE: &str = "/api/platform/attachment-storage-providers";
#[derive(Clone, Copy)]
enum Op {
    List,
    Create,
    Get,
    Update,
    Test,
    Default,
}
fn suffix<'a>(value: &'a str, tail: &str) -> Option<&'a str> {
    let at = value.len().checked_sub(tail.len())?;
    let (id, end) = value.get(..at).zip(value.get(at..))?;
    (!id.is_empty() && end.eq_ignore_ascii_case(tail)).then_some(id)
}
fn operation(method: &Method, path: &str) -> Option<(Op, Option<&'static str>)> {
    let safe = matches!(*method, Method::GET | Method::HEAD);
    if path == BASE {
        return if safe {
            Some((Op::List, None))
        } else if *method == Method::POST {
            Some((Op::Create, None))
        } else {
            None
        };
    }
    let id = path.strip_prefix(BASE)?.strip_prefix('/')?;
    if id.is_empty() || id.contains('/') {
        return None;
    }
    if safe {
        Some((Op::Get, None))
    } else if *method == Method::PATCH {
        Some((Op::Update, None))
    } else if *method == Method::POST && suffix(id, ":testConnection").is_some() {
        Some((Op::Test, Some(":testConnection")))
    } else if *method == Method::POST && suffix(id, ":set-default").is_some() {
        Some((Op::Default, Some(":set-default")))
    } else {
        None
    }
}
pub fn router(auth: AuthHttpState, storage: Arc<AttachmentStorage>) -> Router {
    Router::new()
        .route(BASE, get(dispatch).post(dispatch))
        .route(
            "/api/platform/attachment-storage-providers/{id}",
            get(dispatch).patch(dispatch).post(dispatch),
        )
        .layer(Extension(storage))
        .with_state(auth)
}
pub fn openapi() -> serde_json::Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r2ij/i-openapi.json"))
        .unwrap_or_else(|_| panic!("original I OpenAPI subset"))
}
fn shape(uri: &Uri) -> Option<Vec<&str>> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let pieces = path.split('/').collect::<Vec<_>>();
    if !(pieces.len() == 4 || pieces.len() == 5)
        || !pieces[1].eq_ignore_ascii_case("api")
        || !pieces[2].eq_ignore_ascii_case("platform")
        || !pieces[3].eq_ignore_ascii_case("attachment-storage-providers")
    {
        return None;
    }
    Some(pieces)
}
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    if let Some(parts) = shape(request.uri()) {
        let mut canonical = BASE.to_owned();
        if let Some(id) = parts.get(4) {
            canonical.push('/');
            canonical.push_str(id);
        }
        // Actual original Express route15: the generic /:id layer decodes the
        // complete parameter before method matching, including command tails.
        // Thus unknown methods/commands also return its raw decode error.
        if let Some(raw) = parts.get(4)
            && decode_uri_component(raw).is_err()
        {
            return ApiError::message(
                StatusCode::BAD_REQUEST,
                format!("Failed to decode param '{raw}'"),
            )
            .into_response();
        }
        if operation(request.method(), &canonical).is_some() && canonical != request.uri().path() {
            let original = request.uri().clone();
            let mut parts = original.clone().into_parts();
            parts.path_and_query = match original.query() {
                Some(query) => format!("{canonical}?{query}"),
                None => canonical,
            }
            .parse()
            .ok();
            if let Ok(uri) = Uri::from_parts(parts) {
                if request.extensions().get::<OriginalUri>().is_none() {
                    request.extensions_mut().insert(OriginalUri(original));
                }
                *request.uri_mut() = uri;
            }
        }
    }
    next.run(request).await
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(storage): Extension<Arc<AttachmentStorage>>,
    request: Request,
) -> Response {
    let Some((op, tail)) = operation(request.method(), request.uri().path()) else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |v| v.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(uri)).await;
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let policy = RoutePolicy {
        all: vec![PermissionKey::PlatformAttachmentStorageProvidersManage],
        ..Default::default()
    };
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &policy,
        &parts.method,
        &parts.headers,
        &metadata,
    )
    .await
    {
        Ok(value) => value,
        Err(response) => return response,
    };
    let context = CallContext::new(session.as_ref());
    let id = if matches!(op, Op::List | Op::Create) {
        String::new()
    } else {
        match Path::<String>::from_request_parts(&mut parts, &auth).await {
            Ok(Path(value)) => match tail {
                Some(tail) => suffix(&value, tail).unwrap_or_default().into(),
                None => value,
            },
            Err(error) => return error.into_response(),
        }
    };
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    let query = validation::query_raw(parts.uri.query());
    let schema = match op {
        Op::List => Some((
            "AttachmentStorageProviderConfigListQuery",
            Some(query.as_str()),
        )),
        Op::Create => Some(("CreateAttachmentStorageProviderConfigRequest", body.raw())),
        Op::Update => Some(("UpdateAttachmentStorageProviderConfigRequest", body.raw())),
        Op::Test => Some(("TestAttachmentStorageProviderConnectionRequest", body.raw())),
        Op::Default => Some(("SetDefaultAttachmentStorageProviderRequest", body.raw())),
        Op::Get => None,
    };
    let input = match schema
        .map(|(name, raw)| validation::validate(name, raw))
        .transpose()
    {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    if matches!(op, Op::Test) {
        return match storage
            .test_connection(
                &id,
                input.unwrap_or(validation::RequestData { raw: "{}".into() }),
            )
            .await
        {
            Ok(raw) => ApiError::raw_json(StatusCode::OK, raw).into_response(),
            Err(error) => error.into_api_error().into_response(),
        };
    }
    let input = input.unwrap_or(validation::RequestData { raw: "{}".into() });
    let result = match op {
        Op::List => storage.list(input).await,
        Op::Create => storage.create(input, context, &auth.service).await,
        Op::Get => storage.get(&id).await,
        Op::Update => storage.update(&id, input, context, &auth.service).await,
        Op::Default => {
            storage
                .set_default(&id, input, context, &auth.service)
                .await
        }
        Op::Test => unreachable!(),
    };
    match result {
        Ok(raw) => ApiError::raw_json(
            if matches!(op, Op::Create) {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            raw,
        )
        .into_response(),
        Err(error) => error.into_api_error().into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tower::ServiceExt;

    #[tokio::test]
    async fn actual_original_route15_decodes_the_complete_raw_id_before_method_match() {
        let corpus: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/obs-route-golden.json"
        ))
        .unwrap_or_else(|_| panic!("original route15 corpus"));
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let app = Router::new()
                .fallback(|| async { StatusCode::NOT_FOUND })
                .layer(axum::middleware::from_fn(normalize_uri));
            let request = Request::builder()
                .method(case["method"].as_str().unwrap_or_default())
                .uri(case["path"].as_str().unwrap_or_default())
                .body(axum::body::Body::empty())
                .unwrap_or_else(|_| panic!("original request"));
            let response = app
                .oneshot(request)
                .await
                .unwrap_or_else(|_| panic!("normalizer"));
            assert_eq!(
                response.status().as_u16() as u64,
                case["status"].as_u64().unwrap_or_default()
            );
            if case["method"] == "HEAD" {
                // Root's real HTTP route suite owns HEAD body suppression.
                continue;
            }
            let body = axum::body::to_bytes(response.into_body(), 4096)
                .await
                .unwrap_or_else(|_| panic!("decode response"));
            let body: serde_json::Value =
                serde_json::from_slice(&body).unwrap_or_else(|_| panic!("decode JSON"));
            assert_eq!(body, case["body"]);
        }
    }
}
