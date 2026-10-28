//! Sixteen original operation routes, original guard order and callback protocol.
use super::{
    service::{CallContext, IdentityProvidersService},
    validation,
};
use crate::{
    auth::{
        guards::{self, RequestMetadata, RoutePolicy},
        http::{AuthHttpState, ParsedBody},
    },
    error::ApiError,
    shared::generated::{AuthSessionErrorCode, PermissionKey},
};
use axum::{
    Extension, Router,
    extract::{FromRequestParts, OriginalUri, Path, Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Copy)]
enum Op {
    List,
    Create,
    Get,
    Update,
    Test,
    Search,
    Bindings,
    Bind,
    Unbind,
    Grant,
    GrantAuthorize,
    GrantCallback,
    PublicList,
    LoginAuthorize,
    LoginCallback,
    Consume,
}
fn policy(op: Op) -> RoutePolicy {
    match op {
        Op::PublicList
        | Op::LoginAuthorize
        | Op::LoginCallback
        | Op::Consume
        | Op::GrantCallback => RoutePolicy::public(),
        Op::List | Op::Create | Op::Get | Op::Update | Op::Test => RoutePolicy {
            all: vec![PermissionKey::PlatformIdentityProvidersManage],
            ..RoutePolicy::default()
        },
        _ => RoutePolicy {
            all: vec![PermissionKey::PlatformUsersManage],
            ..RoutePolicy::default()
        },
    }
}
pub fn router(auth: AuthHttpState, service: Arc<IdentityProvidersService>) -> Router {
    Router::new()
        .route("/api/auth/external-login-sessions", post(dispatch))
        .route("/api/auth/identity-providers", get(dispatch))
        .route("/api/auth/identity-providers:callback", get(dispatch))
        .route("/api/auth/identity-providers/{id}", get(dispatch))
        .route(
            "/api/platform/identity-provider-oauth-grants:callback",
            get(dispatch),
        )
        .route(
            "/api/platform/identity-provider-oauth-grants/{id}",
            get(dispatch),
        )
        .route(
            "/api/platform/identity-providers",
            get(dispatch).post(dispatch),
        )
        .route(
            "/api/platform/identity-providers/{id}",
            get(dispatch).patch(dispatch).post(dispatch),
        )
        .route(
            "/api/platform/identity-providers/{id}/external-users",
            get(dispatch),
        )
        .route(
            "/api/platform/users/{id}/external-identities",
            get(dispatch).post(dispatch),
        )
        .route("/api/platform/external-identities/{id}", post(dispatch))
        .layer(Extension(service))
        .with_state(auth)
}
pub fn openapi() -> Value {
    serde_json::from_str(include_str!("../../../../tools/rust-r2gh/g-openapi.json"))
        .unwrap_or_else(|_| panic!("original G OpenAPI subset"))
}
fn suffix<'a>(id: &'a str, suffix: &str) -> Option<&'a str> {
    let cut = id.len().checked_sub(suffix.len())?;
    let (prefix, tail) = id.get(..cut).zip(id.get(cut..))?;
    (!prefix.is_empty() && tail.eq_ignore_ascii_case(suffix)).then_some(prefix)
}
fn operation(method: &Method, path: &str) -> Option<(Op, Option<&'static str>)> {
    let pieces = path.split('/').collect::<Vec<_>>();
    let safe = matches!(*method, Method::GET | Method::HEAD);
    match pieces.as_slice() {
        ["", "api", "auth", "external-login-sessions"] if *method == Method::POST => {
            Some((Op::Consume, None))
        }
        ["", "api", "auth", "identity-providers"] if safe => Some((Op::PublicList, None)),
        ["", "api", "auth", "identity-providers:callback"] if safe => {
            Some((Op::LoginCallback, None))
        }
        ["", "api", "auth", "identity-providers", id]
            if safe && suffix(id, ":authorize").is_some() =>
        {
            Some((Op::LoginAuthorize, Some(":authorize")))
        }
        [
            "",
            "api",
            "platform",
            "identity-provider-oauth-grants:callback",
        ] if safe => Some((Op::GrantCallback, None)),
        ["", "api", "platform", "identity-provider-oauth-grants", id] if safe => {
            Some(if suffix(id, ":authorize").is_some() {
                (Op::GrantAuthorize, Some(":authorize"))
            } else {
                (Op::Grant, None)
            })
        }
        ["", "api", "platform", "identity-providers"] if safe => Some((Op::List, None)),
        ["", "api", "platform", "identity-providers"] if *method == Method::POST => {
            Some((Op::Create, None))
        }
        ["", "api", "platform", "identity-providers", _] if safe => Some((Op::Get, None)),
        ["", "api", "platform", "identity-providers", _] if *method == Method::PATCH => {
            Some((Op::Update, None))
        }
        ["", "api", "platform", "identity-providers", id]
            if *method == Method::POST && suffix(id, ":testConnection").is_some() =>
        {
            Some((Op::Test, Some(":testConnection")))
        }
        [
            "",
            "api",
            "platform",
            "identity-providers",
            _,
            "external-users",
        ] if safe => Some((Op::Search, None)),
        ["", "api", "platform", "users", _, "external-identities"] if safe => {
            Some((Op::Bindings, None))
        }
        ["", "api", "platform", "users", _, "external-identities"] if *method == Method::POST => {
            Some((Op::Bind, None))
        }
        ["", "api", "platform", "external-identities", id]
            if *method == Method::POST && suffix(id, ":unbind").is_some() =>
        {
            Some((Op::Unbind, Some(":unbind")))
        }
        _ => None,
    }
}
fn normalized_uri(method: &Method, uri: &Uri) -> Option<Uri> {
    let path = uri.path().strip_suffix('/').unwrap_or(uri.path());
    if path.ends_with('/') {
        return None;
    }
    let mut pieces = path.split('/').map(str::to_owned).collect::<Vec<_>>();
    if pieces.len() < 4 {
        return None;
    }
    pieces[1] = pieces[1].to_ascii_lowercase();
    pieces[2] = pieces[2].to_ascii_lowercase();
    pieces[3] = pieces[3].to_ascii_lowercase();
    if pieces.len() == 6 {
        pieces[5] = pieces[5].to_ascii_lowercase();
    }
    let canonical = pieces.join("/");
    operation(method, &canonical)?;
    if canonical == uri.path() {
        return None;
    }
    let mut parts = uri.clone().into_parts();
    parts.path_and_query = Some(
        match uri.query() {
            Some(query) => format!("{canonical}?{query}"),
            None => canonical,
        }
        .parse()
        .ok()?,
    );
    Uri::from_parts(parts).ok()
}
pub async fn normalize_uri(mut request: Request, next: Next) -> Response {
    if let Some(capture) = matched_capture(request.uri().path())
        && crate::auth::cookie::decode_uri_component(capture).is_err()
    {
        return ApiError::message(
            StatusCode::BAD_REQUEST,
            format!("Failed to decode param '{capture}'"),
        )
        .into_response();
    }
    if let Some(uri) = normalized_uri(request.method(), request.uri()) {
        if request.extensions().get::<OriginalUri>().is_none() {
            let original = request.uri().clone();
            request.extensions_mut().insert(OriginalUri(original));
        }
        *request.uri_mut() = uri;
    }
    next.run(request).await
}
fn matched_capture(path: &str) -> Option<&str> {
    let path = path.strip_suffix('/').unwrap_or(path);
    if path.ends_with('/') {
        return None;
    }
    let parts = path.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        ["", api, area, endpoint, id]
            if api.eq_ignore_ascii_case("api")
                && area.eq_ignore_ascii_case("auth")
                && endpoint.eq_ignore_ascii_case("identity-providers")
                && !id.is_empty() =>
        {
            // compat03 original wire decodes malformed captures even when
            // the literal authorize suffix is absent and routing later fails.
            Some(suffix(id, ":authorize").unwrap_or(id))
        }
        ["", api, area, endpoint, id]
            if api.eq_ignore_ascii_case("api")
                && area.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("identity-providers")
                && !id.is_empty() =>
        {
            Some(id)
        }
        ["", api, area, endpoint, id]
            if api.eq_ignore_ascii_case("api")
                && area.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("identity-provider-oauth-grants")
                && !id.is_empty() =>
        {
            Some(suffix(id, ":authorize").unwrap_or(id))
        }
        ["", api, area, endpoint, id]
            if api.eq_ignore_ascii_case("api")
                && area.eq_ignore_ascii_case("platform")
                && endpoint.eq_ignore_ascii_case("external-identities") =>
        {
            suffix(id, ":unbind")
        }
        ["", api, area, endpoint, id, child]
            if api.eq_ignore_ascii_case("api")
                && area.eq_ignore_ascii_case("platform")
                && !id.is_empty()
                && (endpoint.eq_ignore_ascii_case("identity-providers")
                    && child.eq_ignore_ascii_case("external-users")
                    || endpoint.eq_ignore_ascii_case("users")
                        && child.eq_ignore_ascii_case("external-identities")) =>
        {
            Some(id)
        }
        _ => None,
    }
}
fn uuid_pipe(id: &str) -> Result<(), ApiError> {
    let bytes = id.as_bytes();
    if bytes.len() == 36
        && bytes.iter().enumerate().all(|(i, b)| {
            if [8, 13, 18, 23].contains(&i) {
                *b == b'-'
            } else {
                b.is_ascii_hexdigit()
            }
        })
    {
        Ok(())
    } else {
        Err(ApiError::message(
            StatusCode::BAD_REQUEST,
            "Validation failed (uuid is expected)",
        ))
    }
}
async fn dispatch(
    State(auth): State<AuthHttpState>,
    Extension(service): Extension<Arc<IdentityProvidersService>>,
    request: Request,
) -> Response {
    let Some((operation, command_suffix)) = operation(request.method(), request.uri().path())
    else {
        let uri = request
            .extensions()
            .get::<OriginalUri>()
            .map_or_else(|| request.uri().clone(), |v| v.0.clone());
        return crate::http::not_found(request.method().clone(), OriginalUri(uri)).await;
    };
    let (mut parts, _) = request.into_parts();
    let metadata = RequestMetadata::from_parts(&parts);
    let session = match guards::authorize(
        &auth.service,
        &auth.cookies,
        &policy(operation),
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
    let needs_id = matches!(
        operation,
        Op::Get
            | Op::Update
            | Op::Test
            | Op::Search
            | Op::Bindings
            | Op::Bind
            | Op::Unbind
            | Op::Grant
            | Op::GrantAuthorize
            | Op::LoginAuthorize
    );
    let id = if needs_id {
        match Path::<String>::from_request_parts(&mut parts, &auth).await {
            Ok(Path(value)) => {
                if let Some(command_suffix) = command_suffix {
                    match suffix(&value, command_suffix) {
                        Some(value) => value.into(),
                        None => return ApiError::internal().into_response(),
                    }
                } else {
                    value
                }
            }
            Err(error) => return error.into_response(),
        }
    } else {
        String::new()
    };
    if matches!(operation, Op::Grant | Op::GrantAuthorize)
        && let Err(error) = uuid_pipe(&id)
    {
        return error.into_response();
    }
    let body = parts
        .extensions
        .get::<ParsedBody>()
        .cloned()
        .unwrap_or_default();
    let query = validation::query_raw(parts.uri.query());
    let schema = match operation {
        Op::List => Some(("IdentityProviderConfigListQuery", Some(query.as_str()))),
        Op::Create => Some(("CreateIdentityProviderConfigRequest", body.raw())),
        Op::Update => Some(("UpdateIdentityProviderConfigRequest", body.raw())),
        Op::Test => Some(("TestIdentityProviderConnectionRequest", body.raw())),
        Op::Bind => Some(("BindUserExternalIdentityRequest", body.raw())),
        Op::Unbind => Some(("UnbindExternalIdentityRequest", body.raw())),
        Op::Search => Some(("ExternalUserSearchQuery", Some(query.as_str()))),
        Op::GrantCallback => Some(("IdentityProviderOAuthCallbackQuery", Some(query.as_str()))),
        Op::LoginCallback => Some(("ExternalLoginCallbackQuery", Some(query.as_str()))),
        Op::Consume => Some(("CreateExternalLoginSessionRequest", body.raw())),
        _ => None,
    };
    let input = match schema
        .map(|(schema, raw)| validation::validate(schema, raw))
        .transpose()
    {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    if matches!(operation, Op::Consume) {
        let ticket = input
            .as_ref()
            .and_then(|v| v.text("ticket"))
            .unwrap_or_default();
        let user_id = match service.consume_ticket(&ticket, context).await {
            Ok(value) => value,
            Err(error) => return error.into_response(),
        };
        let user = match auth.service.resolve_active_auth_user(user_id).await {
            Ok(Some(user)) => user,
            Ok(None) => return guards::unauthorized(AuthSessionErrorCode::AccountDisabled),
            Err(error) => return guards::domain_or_internal(&error),
        };
        let created = match auth
            .service
            .create_session(user.user_id, &metadata.info)
            .await
        {
            Ok(value) => value,
            Err(error) => return guards::domain_or_internal(&error),
        };
        let cookies = match crate::auth::http::cookie_values([
            auth.cookies.session_header(
                &created.session_token,
                created.session.absolute_expires_at,
                Utc::now(),
            ),
            auth.cookies.csrf_header(
                &created.csrf_token,
                created.session.absolute_expires_at,
                Utc::now(),
            ),
        ]) {
            Ok(value) => value,
            Err(response) => return response,
        };
        let response = match crate::auth::http::session_view(&auth, &created.session, &user).await {
            Ok(value) => ApiError::object(StatusCode::OK, value).into_response(),
            Err(error) => guards::domain_or_internal(&error),
        };
        return crate::auth::http::attach_cookies(response, cookies);
    }
    let input = input.unwrap_or_else(|| super::model::RequestData { raw: "{}".into() });
    if matches!(operation, Op::Search) {
        return match service.search(&id, input, context).await {
            Ok(raw) => ApiError::raw_json(StatusCode::OK, raw).into_response(),
            Err(error) => error.into_response(),
        };
    }
    let result = match operation {
        Op::List => service.list(input).await,
        Op::Create => service.create(input, context).await,
        Op::Get => service.get(&id).await,
        Op::Update => service.update(&id, input, context).await,
        Op::Test => service.test_connection(&id, input).await,
        Op::Search => return ApiError::internal().into_response(),
        Op::Bindings => service.list_bindings(&id, context).await,
        Op::Bind => service.bind(&id, input, context).await,
        Op::Unbind => service.unbind(&id, input, context).await,
        Op::Grant => service.get_grant(&id, context).await,
        Op::GrantAuthorize => service.authorize_grant(&id, context).await,
        Op::GrantCallback => service.grant_callback(input, context).await,
        Op::PublicList => service.enabled_login_providers().await,
        Op::LoginAuthorize => service.authorize_login(&id, context).await,
        Op::LoginCallback => service.login_callback(input, context).await,
        Op::Consume => return ApiError::internal().into_response(),
    };
    if matches!(operation, Op::GrantCallback) {
        let accept = parts
            .headers
            .get(header::ACCEPT)
            .map(crate::auth::cookie::header_text)
            .unwrap_or_default()
            .to_lowercase();
        if accept.contains("text/html") && !accept.contains("application/json") {
            let location = match &result {
                Ok(summary) => {
                    let mut query = url::form_urlencoded::Serializer::new(String::new());
                    query
                        .append_pair("identityProviderGrant", "success")
                        .append_pair("provider", summary["provider"].as_str().unwrap_or(""))
                        .append_pair(
                            "identityProviderConfigId",
                            summary["identityProviderConfigId"].as_str().unwrap_or(""),
                        );
                    format!("/platform/users?{}", query.finish())
                }
                Err(_) => {
                    "/platform/users?identityProviderGrant=failed&reason=oauth_callback_failed"
                        .into()
                }
            };
            return redirect(&location, &accept);
        }
    }
    match result {
        Ok(value) => ApiError::object(
            if matches!(operation, Op::Create | Op::Bind) {
                StatusCode::CREATED
            } else {
                StatusCode::OK
            },
            value,
        )
        .into_response(),
        Err(error) => error.into_response(),
    }
}
use chrono::Utc;
fn redirect_preference(accept: &str) -> Option<bool> {
    let accepted = accept
        .split(',')
        .enumerate()
        .filter_map(|(order, part)| {
            let mut pieces = part.trim().split(';');
            let media = pieces.next()?.trim().to_ascii_lowercase();
            let (kind, subtype) = media.split_once('/')?;
            let mut q = 1.0;
            let mut extra = 0;
            for parameter in pieces {
                let Some((key, value)) = parameter.trim().split_once('=') else {
                    continue;
                };
                if key.trim().eq_ignore_ascii_case("q") {
                    let value = value.trim().trim_matches('"');
                    let end = value
                        .char_indices()
                        .find(|(_, c)| !matches!(c, '0'..='9' | '.' | 'e' | 'E' | '+' | '-'))
                        .map_or(value.len(), |(index, _)| index);
                    q = value[..end].parse::<f64>().unwrap_or(f64::NAN);
                    break;
                } else {
                    extra += 1;
                }
            }
            Some((order, kind.to_owned(), subtype.to_owned(), q, extra))
        })
        .collect::<Vec<_>>();
    let mut priorities = Vec::new();
    for (offer, subtype) in [(0, "plain"), (1, "html")] {
        let mut best: Option<(u8, f64, usize)> = None;
        for (order, kind, sub, q, extra) in &accepted {
            if *extra != 0 || kind != "text" && kind != "*" || sub != subtype && sub != "*" {
                continue;
            }
            let specificity = u8::from(kind == "text") * 2 + u8::from(sub == subtype);
            if best.is_none_or(|(s, prior_q, o)| {
                specificity > s || specificity == s && (*q > prior_q || *q == prior_q && *order < o)
            }) {
                best = Some((specificity, *q, *order));
            }
        }
        if let Some((specificity, q, order)) = best
            && q > 0.0
        {
            priorities.push((q, specificity, order, offer));
        }
    }
    priorities.sort_by(|a, b| {
        b.0.total_cmp(&a.0)
            .then(b.1.cmp(&a.1))
            .then(a.2.cmp(&b.2))
            .then(a.3.cmp(&b.3))
    });
    priorities.first().map(|v| v.3 == 1)
}
fn redirect(location: &str, accept: &str) -> Response {
    let preference = redirect_preference(accept);
    let body = match preference {
        Some(true) => {
            let escaped = location
                .replace('&', "&amp;")
                .replace('<', "&lt;")
                .replace('>', "&gt;")
                .replace('"', "&quot;")
                .replace('\'', "&#39;");
            format!("<p>Found. Redirecting to {escaped}</p>")
        }
        Some(false) => format!("Found. Redirecting to {location}"),
        None => String::new(),
    };
    let length = body.len();
    let mut response = Response::new(axum::body::Body::from(body));
    *response.status_mut() = StatusCode::FOUND;
    let Ok(location) = HeaderValue::from_str(location) else {
        return ApiError::internal().into_response();
    };
    response.headers_mut().insert(header::LOCATION, location);
    response
        .headers_mut()
        .insert(header::VARY, HeaderValue::from_static("Accept"));
    if let Ok(length) = HeaderValue::from_str(&length.to_string()) {
        response
            .headers_mut()
            .insert(header::CONTENT_LENGTH, length);
    }
    if let Some(html) = preference {
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static(if html {
                "text/html; charset=utf-8"
            } else {
                "text/plain; charset=utf-8"
            }),
        );
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn original_route_capture_decode_precedes_guard_and_method_selection() {
        use tower::ServiceExt;
        let app = Router::new()
            .fallback(|| async { StatusCode::IM_A_TEAPOT })
            .layer(axum::middleware::from_fn(normalize_uri));
        for (path, capture) in [
            ("/api/platform/identity-providers/%FF", Some("%FF")),
            (
                "/api/platform/identity-providers/%FF:testConnection",
                Some("%FF:testConnection"),
            ),
            ("/api/auth/identity-providers/%FF:authorize", Some("%FF")),
            (
                "/api/platform/identity-provider-oauth-grants/%FF:authorize",
                Some("%FF"),
            ),
            ("/api/platform/external-identities/%FF:unbind", Some("%FF")),
            ("/api/platform/users/%FF/external-identities", Some("%FF")),
            (
                "/api/platform/identity-providers/%FF/external-users",
                Some("%FF"),
            ),
            ("/api/auth/identity-providers/%FF", Some("%FF")),
            ("/api/platform/external-identities/%FF", None),
        ] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(Method::DELETE)
                        .uri(path)
                        .body(axum::body::Body::empty())
                        .unwrap_or_else(|_| panic!("request")),
                )
                .await
                .unwrap_or_else(|_| panic!("route"));
            if let Some(capture) = capture {
                assert_eq!(response.status(), StatusCode::BAD_REQUEST);
                let bytes = axum::body::to_bytes(response.into_body(), 10000)
                    .await
                    .unwrap_or_default();
                let body: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                assert_eq!(
                    body["message"],
                    format!("Failed to decode param '{capture}'")
                );
            } else {
                assert_eq!(response.status(), StatusCode::IM_A_TEAPOT);
            }
        }
    }
    #[tokio::test]
    async fn original_express_redirect_negotiation_matches_body_and_headers() {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2gh/g-redirect-golden.json"
        ))
        .unwrap_or(Value::Null);
        for case in golden["cases"]
            .as_array()
            .into_iter()
            .flatten()
            .filter(|v| v["browser"] == true)
        {
            let response = redirect(
                golden["location"].as_str().unwrap_or(""),
                case["accept"].as_str().unwrap_or(""),
            );
            assert_eq!(response.status().as_u16(), 302);
            for (key, value) in case["headers"].as_object().into_iter().flatten() {
                assert_eq!(
                    response.headers().get(key).and_then(|v| v.to_str().ok()),
                    value.as_str(),
                    "{} {key}",
                    case["accept"]
                );
            }
            if case["headers"].get("content-type").is_none() {
                assert!(!response.headers().contains_key(header::CONTENT_TYPE));
            }
            let bytes = axum::body::to_bytes(response.into_body(), 10000)
                .await
                .unwrap_or_default();
            assert_eq!(
                String::from_utf8_lossy(&bytes),
                case["body"].as_str().unwrap_or(""),
                "{}",
                case["accept"]
            );
        }
    }
}
