//! Original Feishu OAuth, user search and candidate enrichment protocol.
use super::validation::trim;
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::scalars::{NumberInput, js_number_string, legacy_number},
    error::ApiError,
    provider_support::{
        ProviderSupport, QueryEncoding, UpstreamError, UpstreamRequest, UpstreamResponse,
    },
};
use serde_json::{Value, json, value::RawValue};
use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Clone)]
pub struct FeishuAdapter {
    support: ProviderSupport,
}
#[derive(Clone)]
pub struct TokenSet {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<f64>,
    pub refresh_expires_in: Option<f64>,
    pub scopes: Vec<JsString>,
}
#[derive(Clone)]
pub struct AdapterError {
    pub message: String,
    pub provider_code: Option<f64>,
    pub provider_message: Option<String>,
    pub provider_log_id: Option<String>,
    pub message_raw: Option<Box<JsString>>,
    pub provider_message_raw: Option<Box<JsString>>,
    pub provider_log_id_raw: Option<Box<JsString>>,
}
impl AdapterError {
    fn message(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            provider_code: None,
            provider_message: None,
            provider_log_id: None,
            message_raw: None,
            provider_message_raw: None,
            provider_log_id_raw: None,
        }
    }
}
impl std::fmt::Debug for AdapterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("IdentityProviderAdapterError([redacted])")
    }
}
#[derive(Clone)]
struct Node(String);
impl Node {
    fn from_response(response: &UpstreamResponse) -> Self {
        if serde_json::from_str::<&RawValue>(&response.raw_data).is_ok() {
            Self(response.raw_data.clone())
        } else {
            Self(response.data.to_string())
        }
    }
    fn get(&self, key: &str) -> Option<Self> {
        JsObject::parse(&self.0)
            .ok()?
            .get(key)
            .map(|v| Self(v.get().to_owned()))
    }
    fn text(&self) -> Option<String> {
        decode_string(&self.0).ok().map(|v| v.to_utf8_lossy())
    }
    fn array(&self) -> Option<Vec<Self>> {
        if !self.0.starts_with('[') {
            return None;
        }
        serde_json::from_str::<Vec<&RawValue>>(&self.0)
            .ok()
            .map(|v| v.into_iter().map(|v| Self(v.get().into())).collect())
    }
    fn read_string(&self, keys: &[&str]) -> Option<String> {
        keys.iter()
            .find_map(|k| self.get(k)?.text().filter(|s| !trim(s).is_empty()))
    }
    fn read_js_string(&self, keys: &[&str]) -> Option<JsString> {
        keys.iter().find_map(|key| {
            decode_string(&self.get(key)?.0)
                .ok()
                .filter(|v| !trim(&v.to_utf8_lossy()).is_empty())
        })
    }
    fn read_array(&self, keys: &[&str]) -> Vec<Self> {
        keys.iter()
            .find_map(|k| self.get(k)?.array())
            .unwrap_or_default()
    }
    fn read_strings(&self, keys: &[&str]) -> Vec<String> {
        unique(
            self.read_array(keys)
                .into_iter()
                .filter_map(|v| v.text())
                .filter(|v| !trim(v).is_empty())
                .collect(),
        )
    }
    fn read_js_strings(&self, keys: &[&str]) -> Vec<JsString> {
        let mut result = Vec::new();
        for value in self.read_array(keys) {
            if let Ok(value) = decode_string(&value.0) {
                let value = super::validation::trim_js(value);
                if !value.is_empty() && !result.contains(&value) {
                    result.push(value);
                }
            }
        }
        result
    }
    fn number(&self, keys: &[&str]) -> Option<f64> {
        keys.iter().find_map(|k| {
            let raw = self.get(k)?;
            let value = if let Some(s) = raw.text() {
                if trim(&s).is_empty() {
                    return None;
                }
                legacy_number(NumberInput::Text(&s))
            } else {
                raw.0.parse().ok()?
            };
            value.is_finite().then_some(value)
        })
    }
}
fn unique(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .map(|v| trim(&v))
        .filter(|v| !v.is_empty() && seen.insert(v.clone()))
        .collect()
}
fn provider_error(raw: &Node, fallback: &str, status: Option<u16>) -> AdapterError {
    let code = raw.number(&["code"]);
    let message = raw.read_string(&["msg", "message"]);
    let log = raw
        .get("error")
        .and_then(|v| v.read_string(&["log_id", "logId"]));
    let mut details = Vec::new();
    if let Some(code) = code {
        details.push(format!("code {}", js_number_string(code)));
    }
    if let Some(status) = status.filter(|v| *v != 0) {
        details.push(format!("HTTP {status}"));
    }
    if let Some(log) = &log {
        details.push(format!("log_id {log}"));
    }
    let suffix = if details.is_empty() {
        String::new()
    } else {
        format!(" ({})", details.join(", "))
    };
    let message_js = raw.read_js_string(&["msg", "message"]);
    let log_js = raw
        .get("error")
        .and_then(|v| v.read_js_string(&["log_id", "logId"]));
    let mut units = fallback.encode_utf16().collect::<Vec<_>>();
    if let Some(message) = &message_js {
        units.extend(": ".encode_utf16());
        units.extend_from_slice(message.as_code_units());
    }
    let mut raw_details = Vec::<JsString>::new();
    if let Some(code) = code {
        raw_details.push(JsString::from_code_units(
            format!("code {}", js_number_string(code))
                .encode_utf16()
                .collect(),
        ));
    }
    if let Some(status) = status.filter(|v| *v != 0) {
        raw_details.push(JsString::from_code_units(
            format!("HTTP {status}").encode_utf16().collect(),
        ));
    }
    if let Some(log) = &log_js {
        let mut value = "log_id ".encode_utf16().collect::<Vec<_>>();
        value.extend_from_slice(log.as_code_units());
        raw_details.push(JsString::from_code_units(value));
    }
    if !raw_details.is_empty() {
        units.extend(" (".encode_utf16());
        for (index, detail) in raw_details.iter().enumerate() {
            if index > 0 {
                units.extend(", ".encode_utf16());
            }
            units.extend_from_slice(detail.as_code_units());
        }
        units.push(b')' as u16);
    }
    let raw_message = JsString::from_code_units(units);
    let lone =
        |v: &JsString| char::decode_utf16(v.as_code_units().iter().copied()).any(|v| v.is_err());
    AdapterError {
        message: message.as_ref().map_or_else(
            || format!("{fallback}{suffix}"),
            |m| format!("{fallback}: {m}{suffix}"),
        ),
        provider_code: code,
        provider_message: message,
        provider_log_id: log,
        message_raw: lone(&raw_message).then(|| Box::new(raw_message)),
        provider_message_raw: message_js.filter(lone).map(Box::new),
        provider_log_id_raw: log_js.filter(lone).map(Box::new),
    }
}
fn normalize_http(error: UpstreamError, fallback: &str) -> AdapterError {
    if error.is_axios_error {
        if let Some(response) = &error.response {
            return provider_error(
                &Node::from_response(response),
                fallback,
                Some(response.status),
            );
        }
        let code = error
            .code
            .as_ref()
            .map(|v| trim(v))
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| "network_error".into());
        return AdapterError::message(format!("{fallback}: {code}"));
    }
    AdapterError::message(fallback)
}
fn unwrap(response: &UpstreamResponse, fallback: &str) -> Result<Node, AdapterError> {
    let root = Node::from_response(response);
    if root.number(&["code"]).is_some_and(|v| v != 0.0) {
        return Err(provider_error(&root, fallback, None));
    }
    Ok(root.get("data").filter(|v| v.0 != "null").unwrap_or(root))
}
#[derive(Clone)]
struct Hit {
    subject: String,
    union: Option<String>,
    display: String,
    avatar: Option<String>,
    raw: BTreeMap<String, String>,
}
pub struct Candidate {
    pub raw: String,
}
#[derive(Clone)]
struct DepartmentName {
    text: String,
    raw: Option<String>,
}
type RequestQuery = (Vec<(String, String)>, QueryEncoding);
type DepartmentBatch = Vec<(String, DepartmentName)>;
type DepartmentTask = (usize, Result<DepartmentBatch, AdapterError>);
fn raw_text(fields: &mut BTreeMap<String, String>, key: &str, value: Option<JsString>) {
    if let Some(value) = value {
        if char::decode_utf16(value.as_code_units().iter().copied()).any(|v| v.is_err()) {
            fields.insert(key.into(), value.json());
        } else {
            fields.remove(key);
        }
    }
}
pub(crate) fn render(value: &Value, raw: &BTreeMap<String, String>) -> String {
    format!(
        "{{{}}}",
        value
            .as_object()
            .into_iter()
            .flatten()
            .map(|(key, value)| format!(
                "{}:{}",
                json!(key),
                raw.get(key).cloned().unwrap_or_else(|| value.to_string())
            ))
            .collect::<Vec<_>>()
            .join(",")
    )
}
impl FeishuAdapter {
    pub fn new(support: ProviderSupport) -> Self {
        Self { support }
    }
    fn endpoint(&self, key: &str, fallback: &str) -> String {
        self.support.settings.get(key).unwrap_or(fallback).into()
    }
    pub fn build_authorize_url(
        &self,
        client_id: &str,
        redirect_uri: &str,
        state: &str,
        scopes: &[String],
    ) -> Result<String, ApiError> {
        let mut url = url::Url::parse(&self.endpoint(
            "FEISHU_OAUTH_AUTHORIZE_URL",
            "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
        ))
        .map_err(|_| ApiError::internal())?;
        let mut query = url
            .query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect::<Vec<_>>();
        fn set(query: &mut Vec<(String, String)>, key: &str, value: &str) {
            if let Some(first) = query.iter().position(|(k, _)| k == key) {
                query[first].1 = value.into();
                let mut index = 0;
                query.retain(|(k, _)| {
                    let keep = k != key || index == first;
                    index += 1;
                    keep
                });
            } else {
                query.push((key.into(), value.into()));
            }
        }
        for (key, value) in [
            ("client_id", client_id),
            ("redirect_uri", redirect_uri),
            ("response_type", "code"),
            ("state", state),
        ] {
            set(&mut query, key, value);
        }
        if !scopes.is_empty() {
            set(&mut query, "scope", &scopes.join(" "));
        }
        url.query_pairs_mut().clear().extend_pairs(query);
        Ok(url.to_string())
    }
    async fn request(
        &self,
        url: String,
        method: &str,
        token: Option<&str>,
        query: RequestQuery,
        body: Option<Value>,
        fallback: &str,
    ) -> Result<Node, AdapterError> {
        let (query, query_encoding) = query;
        let response = self
            .support
            .http
            .execute(UpstreamRequest {
                method: method.into(),
                url,
                headers: token
                    .map(|v| vec![("Authorization".into(), format!("Bearer {v}"))])
                    .unwrap_or_default(),
                query,
                query_encoding,
                json: body,
                timeout_ms: self.support.settings.timeout_ms(),
            })
            .await
            .map_err(|e| normalize_http(e, fallback))?;
        unwrap(&response, fallback)
    }
    pub async fn exchange_code(
        &self,
        client_id: &str,
        redirect_uri: &str,
        secret: &str,
        code: &str,
    ) -> Result<TokenSet, AdapterError> {
        if redirect_uri.is_empty() {
            return Err(AdapterError::message(
                "Feishu redirect URI is required before exchanging provider authorization code.",
            ));
        }
        let payload=self.request(self.endpoint("FEISHU_OAUTH_TOKEN_URL","https://open.feishu.cn/open-apis/authen/v2/oauth/token"),"POST",None,(vec![],QueryEncoding::AxiosObject),Some(json!({"grant_type":"authorization_code","client_id":client_id,"client_secret":secret,"code":code,"redirect_uri":redirect_uri})),"Feishu OAuth token exchange failed").await?;
        let access_token = payload
            .read_string(&["access_token", "user_access_token"])
            .ok_or_else(|| {
                AdapterError::message(
                    "Feishu OAuth token response did not include an access token.",
                )
            })?;
        let mut scopes = payload.read_js_strings(&["scopes", "scope_list"]);
        if scopes.is_empty()
            && let Some(raw) = payload.read_js_string(&["scope"])
        {
            scopes=raw.as_code_units().split(|unit|matches!(*unit,0x002c|0x0009..=0x000d|0x0020|0x00a0|0x1680|0x2000..=0x200a|0x2028|0x2029|0x202f|0x205f|0x3000|0xfeff)).filter(|part|!part.is_empty()).map(|part|JsString::from_code_units(part.to_vec())).collect();
        }
        Ok(TokenSet {
            access_token,
            refresh_token: payload.read_string(&["refresh_token"]),
            expires_in: payload.number(&["expires_in", "expire"]),
            refresh_expires_in: payload.number(&["refresh_expires_in"]),
            scopes,
        })
    }
    pub async fn login_identity(&self, token: &str) -> Result<JsString, AdapterError> {
        let payload = self
            .request(
                self.endpoint(
                    "FEISHU_USER_INFO_URL",
                    "https://open.feishu.cn/open-apis/authen/v1/user_info",
                ),
                "GET",
                Some(token),
                (vec![], QueryEncoding::AxiosObject),
                None,
                "Feishu user info failed",
            )
            .await?;
        let subject = payload.read_js_string(&["open_id", "user_id", "sub"]);
        let display = payload.read_string(&["name", "display_name", "en_name"]);
        if subject.is_none() || display.is_none() {
            return Err(AdapterError::message(
                "Feishu user info response did not include a subject id and display name.",
            ));
        }
        subject.ok_or_else(|| {
            AdapterError::message(
                "Feishu user info response did not include a subject id and display name.",
            )
        })
    }
    pub async fn search(
        &self,
        token: &str,
        query: &str,
        limit: f64,
    ) -> Result<Vec<Candidate>, AdapterError> {
        let payload = self
            .request(
                self.endpoint(
                    "FEISHU_USER_SEARCH_URL",
                    "https://open.feishu.cn/open-apis/search/v1/user",
                ),
                "GET",
                Some(token),
                (
                    vec![
                        ("query".into(), query.into()),
                        ("page_size".into(), js_number_string(limit)),
                    ],
                    QueryEncoding::AxiosObject,
                ),
                None,
                "Feishu user search failed",
            )
            .await?;
        let hits = payload
            .read_array(&["users", "items", "user_list"])
            .into_iter()
            .filter_map(|v| {
                let subject = v.read_string(&["open_id"])?;
                let display = v.read_string(&["name", "display_name", "en_name"])?;
                let avatar = v
                    .read_string(&["avatar_url", "avatar_thumb", "avatar_middle", "avatar_big"])
                    .or_else(|| {
                        v.get("avatar").and_then(|v| {
                            v.read_string(&[
                                "avatar_240",
                                "avatar_72",
                                "avatar_640",
                                "avatar_origin",
                            ])
                        })
                    });
                let mut raw = BTreeMap::new();
                raw_text(&mut raw, "subjectId", v.read_js_string(&["open_id"]));
                raw_text(
                    &mut raw,
                    "displayName",
                    v.read_js_string(&["name", "display_name", "en_name"]),
                );
                raw_text(&mut raw, "unionId", v.read_js_string(&["union_id"]));
                raw_text(
                    &mut raw,
                    "avatarUrl",
                    v.read_js_string(&[
                        "avatar_url",
                        "avatar_thumb",
                        "avatar_middle",
                        "avatar_big",
                    ])
                    .or_else(|| {
                        v.get("avatar").and_then(|v| {
                            v.read_js_string(&[
                                "avatar_240",
                                "avatar_72",
                                "avatar_640",
                                "avatar_origin",
                            ])
                        })
                    }),
                );
                Some(Hit {
                    subject,
                    display,
                    avatar,
                    union: v.read_string(&["union_id"]),
                    raw,
                })
            })
            .collect::<Vec<_>>();
        if hits.is_empty() {
            return Ok(vec![]);
        }
        let ids = unique(hits.iter().map(|h| h.subject.clone()).collect());
        let fallback = format!(
            "{}/open-apis/contact/v3/users/batch",
            self.support.settings.open_api_base_url()
        );
        let mut params = vec![
            ("user_id_type".into(), "open_id".into()),
            ("department_id_type".into(), "open_department_id".into()),
        ];
        params.extend(ids.into_iter().map(|id| ("user_ids".into(), id)));
        let users = self
            .request(
                self.endpoint("FEISHU_USER_BATCH_URL", &fallback),
                "GET",
                Some(token),
                (params, QueryEncoding::UrlSearchParams),
                None,
                "Feishu user profile enrichment failed",
            )
            .await?;
        // Preserve original Map insertion order, including last duplicate value.
        let mut details: Vec<(String, Node)> = Vec::new();
        for user in users.read_array(&["items", "users", "user_list"]) {
            if let Some(id) = user.read_string(&["open_id"]) {
                if let Some((_, value)) = details.iter_mut().find(|(key, _)| key == &id) {
                    *value = user;
                } else {
                    details.push((id, user));
                }
            }
        }
        let department_ids = unique(
            details
                .iter()
                .flat_map(|(_, v)| v.read_strings(&["department_ids"]).into_iter().take(16))
                .collect(),
        );
        let departments = self.departments(token, &department_ids).await?;
        Ok(hits
            .into_iter()
            .map(|hit| {
                let detail = details
                    .iter()
                    .find(|(id, _)| id == &hit.subject)
                    .map(|(_, v)| v);
                candidate(hit, detail, &departments)
            })
            .collect())
    }
    async fn departments(
        &self,
        token: &str,
        ids: &[String],
    ) -> Result<HashMap<String, DepartmentName>, AdapterError> {
        let batches = ids.chunks(50).map(|v| v.to_vec()).collect::<Vec<_>>();
        let mut set = tokio::task::JoinSet::new();
        let mut next = 0;
        let mut results = vec![Vec::new(); batches.len()];
        fn spawn(
            set: &mut tokio::task::JoinSet<DepartmentTask>,
            adapter: FeishuAdapter,
            token: String,
            index: usize,
            batch: Vec<String>,
        ) {
            set.spawn(async move { (index, adapter.department_batch(&token, &batch).await) });
        }
        while next < batches.len() && next < 4 {
            spawn(
                &mut set,
                self.clone(),
                token.into(),
                next,
                batches[next].clone(),
            );
            next += 1;
        }
        while let Some(result) = set.join_next().await {
            let (index, result) =
                result.map_err(|_| AdapterError::message("Feishu department enrichment failed"))?;
            match result {
                Ok(value) => results[index] = value,
                Err(error) => {
                    set.detach_all();
                    return Err(error);
                }
            }
            if next < batches.len() {
                spawn(
                    &mut set,
                    self.clone(),
                    token.into(),
                    next,
                    batches[next].clone(),
                );
                next += 1;
            }
        }
        Ok(results.into_iter().flatten().collect())
    }
    async fn department_batch(
        &self,
        token: &str,
        ids: &[String],
    ) -> Result<DepartmentBatch, AdapterError> {
        let fallback = format!(
            "{}/open-apis/contact/v3/departments/batch",
            self.support.settings.open_api_base_url()
        );
        let mut params = vec![("department_id_type".into(), "open_department_id".into())];
        params.extend(ids.iter().cloned().map(|id| ("department_ids".into(), id)));
        let payload = self
            .request(
                self.endpoint("FEISHU_DEPARTMENT_BATCH_URL", &fallback),
                "GET",
                Some(token),
                (params, QueryEncoding::UrlSearchParams),
                None,
                "Feishu department enrichment failed",
            )
            .await?;
        Ok(payload
            .read_array(&["items", "departments"])
            .into_iter()
            .filter_map(|v| {
                Some((v.read_string(&["open_department_id"])?, {
                    let name = v.read_js_string(&["name"])?;
                    let raw = char::decode_utf16(name.as_code_units().iter().copied())
                        .any(|v| v.is_err())
                        .then(|| name.json());
                    DepartmentName {
                        text: name.to_utf8_lossy(),
                        raw,
                    }
                }))
            })
            .collect())
    }
}
fn field(detail: Option<&Node>, key: &str) -> (Option<String>, &'static str) {
    let Some(value) = detail.and_then(|v| v.get(key)) else {
        return (None, "not-returned");
    };
    let text = value.text().filter(|v| !trim(v).is_empty());
    let availability = if text.is_some() {
        "available"
    } else {
        "not-provided"
    };
    (text, availability)
}
fn candidate(
    hit: Hit,
    detail: Option<&Node>,
    departments: &HashMap<String, DepartmentName>,
) -> Candidate {
    let (email, email_availability) = field(detail, "email");
    let (mobile, mobile_availability) = field(detail, "mobile");
    let (names, department_availability) = if let Some(detail) = detail {
        if detail.get("department_ids").is_none() {
            (vec![], "not-returned")
        } else {
            let ids = detail.read_strings(&["department_ids"]);
            if ids.is_empty() {
                (vec![], "not-provided")
            } else {
                let ids = unique(ids.into_iter().take(16).collect());
                let names = ids
                    .iter()
                    .filter_map(|id| departments.get(id).cloned())
                    .collect::<Vec<_>>();
                if names.len() != ids.len() {
                    (vec![], "not-returned")
                } else {
                    (names, "available")
                }
            }
        }
    } else {
        (vec![], "not-returned")
    };
    let mut raw = hit.raw;
    for (key, source) in [
        ("unionId", "union_id"),
        ("email", "email"),
        ("mobile", "mobile"),
    ] {
        raw_text(
            &mut raw,
            key,
            detail.and_then(|v| v.read_js_string(&[source])),
        );
    }
    if names.iter().any(|v| v.raw.is_some()) {
        raw.insert(
            "departmentNames".into(),
            format!(
                "[{}]",
                names
                    .iter()
                    .map(|v| v.raw.clone().unwrap_or_else(|| json!(v.text).to_string()))
                    .collect::<Vec<_>>()
                    .join(",")
            ),
        );
    }
    let value = json!({"subjectId":hit.subject,"unionId":detail.and_then(|v|v.read_string(&["union_id"])).or(hit.union),"displayName":hit.display,"avatarUrl":hit.avatar,"email":email,"mobile":mobile,"departmentNames":names.iter().map(|v|v.text.clone()).collect::<Vec<_>>(),"fieldAvailability":{"department":department_availability,"email":email_availability,"mobile":mobile_availability}});
    Candidate {
        raw: render(&value, &raw),
    }
}
