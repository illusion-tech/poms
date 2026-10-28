use std::{
    collections::{HashSet, VecDeque},
    error::Error,
    fmt,
};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json, value::RawValue};

use crate::{
    auth::cookie::trim_js,
    compat::scalars::{NumberInput, js_number_string, legacy_number},
    provider_support::{
        ProviderRuntimeConfig, ProviderSupport, QueryEncoding, UpstreamError, UpstreamRequest,
        UpstreamResponse,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalDepartmentSnapshot {
    pub external_department_id: String,
    pub external_parent_department_id: Option<String>,
    pub external_department_name: String,
    pub is_active: bool,
    pub display_order: Option<f64>,
    pub raw: Value,
    /// Internal Node JSON.stringify text. It preserves UTF-16 escapes that
    /// serde Value cannot hold; it is never added to the public projection.
    #[serde(skip)]
    pub(crate) raw_json: Option<String>,
}

#[derive(Clone, Debug)]
pub struct DepartmentReadAccess {
    pub root_department_id: String,
    pub child_department_count: usize,
}

#[derive(Clone, Debug)]
pub struct DirectoryError {
    pub message: String,
    pub provider_code: Option<String>,
    pub http_status: Option<u16>,
    pub provider_message: Option<String>,
    pub next_actions: Vec<String>,
}
impl fmt::Display for DirectoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}
impl Error for DirectoryError {}
impl DirectoryError {
    pub fn message(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            provider_code: None,
            http_status: None,
            provider_message: None,
            next_actions: Vec::new(),
        }
    }
}

#[derive(Clone)]
pub struct DirectoryAdapter {
    support: ProviderSupport,
}
struct Page {
    items: Vec<ExternalDepartmentSnapshot>,
    has_more: bool,
    page_token: Option<String>,
}

impl DirectoryAdapter {
    pub fn new(support: ProviderSupport) -> Self {
        Self { support }
    }

    fn require_provider(&self, config: &ProviderRuntimeConfig) -> Result<(), DirectoryError> {
        if config.provider == "feishu" {
            Ok(())
        } else {
            Err(DirectoryError::message(format!(
                "External org directory adapter is not supported for provider {}.",
                config.provider
            )))
        }
    }

    pub async fn fetch_department_tree(
        &self,
        root: Option<&str>,
        config: &ProviderRuntimeConfig,
        secret: &str,
    ) -> Result<Vec<ExternalDepartmentSnapshot>, DirectoryError> {
        self.require_provider(config)?;
        let token = self.tenant_token(&config.client_id, secret).await?;
        let mut queue = VecDeque::from([root_id(root)]);
        let mut visited = HashSet::new();
        let mut snapshots = Vec::new();
        while let Some(parent) = queue.pop_front() {
            if parent.is_empty() || !visited.insert(parent.clone()) {
                continue;
            }
            let mut page_token = None;
            loop {
                let page = self
                    .children_page(
                        &token,
                        &parent,
                        self.support.settings.department_page_size(),
                        page_token.as_deref(),
                    )
                    .await?;
                for child in page.items {
                    if child.is_active {
                        queue.push_back(child.external_department_id.clone());
                    }
                    snapshots.push(child);
                }
                page_token = if page.has_more { page.page_token } else { None };
                if page_token.is_none() {
                    break;
                }
            }
        }
        Ok(snapshots)
    }

    pub async fn test_department_read_access(
        &self,
        config: &ProviderRuntimeConfig,
        secret: &str,
        root: Option<&str>,
    ) -> Result<DepartmentReadAccess, DirectoryError> {
        self.require_provider(config)?;
        let token = self.tenant_token(&config.client_id, secret).await?;
        let root_department_id = root_id(root);
        let page = self
            .children_page(&token, &root_department_id, 1.0, None)
            .await?;
        Ok(DepartmentReadAccess {
            root_department_id,
            child_department_count: page.items.len(),
        })
    }

    async fn tenant_token(&self, app_id: &str, secret: &str) -> Result<String, DirectoryError> {
        const FALLBACK: &str = "Feishu tenant access token request failed";
        let endpoint = self
            .support
            .settings
            .get("FEISHU_TENANT_ACCESS_TOKEN_URL")
            .map(str::to_owned)
            .unwrap_or_else(|| {
                format!(
                    "{}/open-apis/auth/v3/tenant_access_token/internal",
                    self.support.settings.open_api_base_url()
                )
            });
        let response = self
            .support
            .http
            .execute(UpstreamRequest {
                method: "POST".into(),
                url: endpoint,
                headers: vec![(
                    "Content-Type".into(),
                    "application/json; charset=utf-8".into(),
                )],
                query: Vec::new(),
                query_encoding: QueryEncoding::AxiosObject,
                json: Some(json!({"app_id":app_id,"app_secret":secret})),
                timeout_ms: self.support.settings.timeout_ms(),
            })
            .await
            .map_err(|error| normalize_error(error, FALLBACK))?;
        let payload = unwrap_payload(response_data(response), FALLBACK, false)?;
        read_string(&payload, &["tenant_access_token"]).ok_or_else(|| {
            DirectoryError::message("Feishu tenant access token response did not include a token.")
        })
    }

    async fn children_page(
        &self,
        token: &str,
        department: &str,
        size: f64,
        page_token: Option<&str>,
    ) -> Result<Page, DirectoryError> {
        const FALLBACK: &str = "Feishu department children request failed";
        let encoded = encode_component(department);
        let url = self
            .support
            .settings
            .get("FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE")
            .filter(|value| !value.is_empty())
            .map(|template| template.replacen("{departmentId}", &encoded, 1))
            .unwrap_or_else(|| {
                format!(
                    "{}/open-apis/contact/v3/departments/{encoded}/children",
                    self.support.settings.open_api_base_url()
                )
            });
        let mut query = vec![
            ("department_id_type".into(), "open_department_id".into()),
            ("user_id_type".into(), "open_id".into()),
            ("fetch_child".into(), "false".into()),
            ("page_size".into(), js_number_string(size)),
        ];
        if let Some(value) = page_token.filter(|value| !value.is_empty()) {
            query.push(("page_token".into(), value.into()));
        }
        let response = self
            .support
            .http
            .execute(UpstreamRequest {
                method: "GET".into(),
                url,
                headers: vec![("Authorization".into(), format!("Bearer {token}"))],
                query,
                query_encoding: QueryEncoding::AxiosObject,
                json: None,
                timeout_ms: self.support.settings.timeout_ms(),
            })
            .await
            .map_err(|error| normalize_error(error, FALLBACK))?;
        let raw_items = raw_department_records(&response.raw_data)?;
        let payload = unwrap_payload(response_data(response), FALLBACK, true)?;
        let items = ["items", "departments"]
            .into_iter()
            .find_map(|key| payload.get(key).and_then(Value::as_array))
            .map(|items| {
                items
                    .iter()
                    .enumerate()
                    .filter_map(|(index, item)| {
                        let mut snapshot = department_snapshot(item, department)?;
                        snapshot.raw_json = raw_items.get(index).cloned();
                        Some(snapshot)
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(Page {
            items,
            has_more: read_boolean(&payload, &["has_more"]).unwrap_or(false),
            page_token: read_string(&payload, &["page_token"]),
        })
    }
}

pub(crate) fn root_id(value: Option<&str>) -> String {
    value
        .map(trim_js)
        .filter(|value| !value.is_empty())
        .unwrap_or("0")
        .to_owned()
}
fn encode_component(value: &str) -> String {
    let mut output = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            output.push(char::from(byte));
        } else {
            use std::fmt::Write;
            let _ = write!(output, "%{byte:02X}");
        }
    }
    output
}
pub(crate) fn read_string(record: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        record
            .get(*key)
            .and_then(Value::as_str)
            .filter(|value| !trim_js(value).is_empty())
            .map(str::to_owned)
    })
}
pub(crate) fn read_number(record: &Value, keys: &[&str]) -> Option<f64> {
    keys.iter().find_map(|key| {
        let raw = record.get(*key)?;
        let value = match raw {
            Value::Number(number) => number.as_f64()?,
            Value::String(text) if !trim_js(text).is_empty() => {
                legacy_number(NumberInput::Text(text))
            }
            _ => return None,
        };
        value.is_finite().then_some(value)
    })
}
fn read_boolean(record: &Value, keys: &[&str]) -> Option<bool> {
    keys.iter().find_map(|key| match record.get(*key) {
        Some(Value::Bool(value)) => Some(*value),
        Some(Value::String(value)) if value == "true" => Some(true),
        Some(Value::String(value)) if value == "false" => Some(false),
        _ => None,
    })
}
pub(crate) fn department_snapshot(
    raw: &Value,
    fallback: &str,
) -> Option<ExternalDepartmentSnapshot> {
    let raw = if raw.is_object() {
        raw.clone()
    } else {
        json!({})
    };
    Some(ExternalDepartmentSnapshot {
        external_department_id: read_string(&raw, &["open_department_id", "department_id", "id"])?,
        external_department_name: read_string(&raw, &["name", "department_name"])?,
        external_parent_department_id: Some(
            read_string(
                &raw,
                &[
                    "parent_department_id",
                    "parent_open_department_id",
                    "parent_id",
                ],
            )
            .unwrap_or_else(|| fallback.into()),
        ),
        is_active: !read_boolean(&raw["status"], &["is_deleted", "deleted"]).unwrap_or(false),
        display_order: read_number(&raw, &["order", "department_order", "display_order"]),
        raw,
        raw_json: None,
    })
}
pub(crate) fn unwrap_payload(
    raw: Value,
    fallback: &str,
    expect_data: bool,
) -> Result<Value, DirectoryError> {
    let root = if raw.is_object() { raw } else { json!({}) };
    if let Some(code) = read_number(&root, &["code"])
        && code != 0.0
    {
        return Err(provider_error(
            fallback,
            Some(code),
            read_string(&root, &["msg", "message"]),
            None,
        ));
    }
    if !expect_data {
        return Ok(root);
    }
    Ok(root
        .get("data")
        .filter(|value| !value.is_null())
        .unwrap_or(&root)
        .as_object()
        .map(|value| Value::Object(value.clone()))
        .unwrap_or_else(|| json!({})))
}
fn response_data(response: UpstreamResponse) -> Value {
    serde_json::from_str::<&RawValue>(&response.raw_data)
        .ok()
        .and_then(|raw| super::validation::node_value(raw).ok())
        .unwrap_or(response.data)
}
fn raw_department_records(raw: &str) -> Result<Vec<String>, DirectoryError> {
    let Some(root) = crate::auth::js_json::JsObject::parse(raw).ok() else {
        return Ok(Vec::new());
    };
    let payload = root
        .get("data")
        .filter(|value| value.get() != "null")
        .map_or(raw, RawValue::get);
    let Some(payload) = crate::auth::js_json::JsObject::parse(payload).ok() else {
        return Ok(Vec::new());
    };
    for key in ["items", "departments"] {
        let Some(items) = payload
            .get(key)
            .filter(|value| value.get().starts_with('['))
        else {
            continue;
        };
        let items = serde_json::from_str::<Vec<&RawValue>>(items.get()).map_err(|_| {
            DirectoryError::message("Feishu department response could not be normalized.")
        })?;
        return items
            .into_iter()
            .map(|item| {
                super::validation::node_raw(item).map_err(|_| {
                    DirectoryError::message("Feishu department response could not be normalized.")
                })
            })
            .collect();
    }
    Ok(Vec::new())
}
fn normalize_error(error: UpstreamError, fallback: &str) -> DirectoryError {
    if let Some(response) = error.response {
        let status = response.status;
        let data = response_data(*response);
        return provider_error(
            fallback,
            read_number(&data, &["code"]),
            read_string(&data, &["msg", "message"]),
            Some(status),
        );
    }
    let detail = trim_js(&error.message);
    let mut result = DirectoryError::message(if detail.is_empty() {
        fallback.to_owned()
    } else {
        format!("{fallback}: {detail}")
    });
    result.next_actions =
        vec!["请检查飞书开放平台接口可用性、网络连通性和企业协同接入配置。".into()];
    result
}
pub(crate) fn provider_error(
    fallback: &str,
    code: Option<f64>,
    provider_message: Option<String>,
    status: Option<u16>,
) -> DirectoryError {
    let normalized = provider_message.as_deref().unwrap_or("").to_lowercase();
    let diagnosis = if code == Some(40011.0) || normalized.contains("page size") {
        Some((
            "飞书部门分页大小超过限制，请将 page_size 调整为 50 或更小。",
            vec!["请确认 POMS 飞书部门读取参数使用 page_size <= 50 后重试。".into()],
        ))
    } else if normalized.contains("permission") || normalized.contains("scope") {
        Some((
            "飞书应用身份通讯录权限未开通或未生效，请在飞书开放平台检查应用身份权限并发布应用。",
            vec![
                "请在飞书开放平台开通应用身份通讯录部门读取权限。".into(),
                "权限变更后请发布应用，再回到 POMS 重新测试组织同步可用性。".into(),
            ],
        ))
    } else if normalized.contains("access token") {
        Some((
            "飞书访问令牌无效或已过期，请检查企业协同接入的 Client ID / Secret。",
            vec![
                "请重新保存企业协同接入的 Client Secret。".into(),
                "保存后先运行企业协同接入测试，再重新生成组织同步预览。".into(),
            ],
        ))
    } else {
        None
    };
    let mut details = Vec::new();
    if diagnosis.is_some()
        && let Some(message) = &provider_message
    {
        details.push(format!("飞书返回：{message}"));
    }
    if let Some(code) = code {
        details.push(format!("code {}", js_number_string(code)));
    }
    if let Some(status) = status.filter(|value| *value != 0) {
        details.push(format!("HTTP {status}"));
    }
    let (base, next_actions) = if let Some((message, actions)) = diagnosis {
        (message.to_owned(), actions)
    } else {
        (
            provider_message
                .as_ref()
                .filter(|message| message.as_str() != fallback)
                .map_or_else(
                    || fallback.to_owned(),
                    |message| format!("{fallback}: {message}"),
                ),
            vec!["请结合飞书开放平台错误码、应用权限状态和应用发布状态排查。".into()],
        )
    };
    DirectoryError {
        message: if details.is_empty() {
            base
        } else {
            format!("{base}（{}）", details.join("，"))
        },
        provider_code: code.map(js_number_string),
        http_status: status,
        provider_message,
        next_actions,
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    #[test]
    fn upstream_raw_json_retains_utf16_and_node_numbers() {
        let records = raw_department_records(r#"{"code":0,"data":{"items":[{}, {"id":"B","name":"B","extra":"\ud800","unsafe":9007199254740993,"overflow":1e999}]}}"#).unwrap();
        assert_eq!(records.len(), 2);
        let record = crate::auth::js_json::JsObject::parse(&records[1]).unwrap();
        let extra =
            crate::auth::js_json::decode_string(record.get("extra").unwrap().get()).unwrap();
        assert_eq!(extra.as_code_units(), &[0xd800]);
        assert_eq!(record.get("unsafe").unwrap().get(), "9007199254740992");
        assert_eq!(record.get("overflow").unwrap().get(), "null");
        let raw: &RawValue = serde_json::from_str(&records[1]).unwrap();
        let mut snapshot =
            department_snapshot(&super::super::validation::node_value(raw).unwrap(), "0").unwrap();
        snapshot.raw_json = Some(records[1].clone());
        assert!(
            serde_json::to_value(snapshot)
                .unwrap()
                .get("rawJson")
                .is_none()
        );
    }
    #[test]
    fn original_adapter_fallback_and_payload_goldens() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-behavior.json"))
                .unwrap();
        for case in source["directorySnapshots"].as_array().unwrap() {
            let actual = serde_json::value::to_raw_value(&department_snapshot(
                &case["raw"],
                "fallback-parent",
            ))
            .unwrap();
            assert_eq!(
                super::super::validation::node_value(&actual).unwrap(),
                case["expected"]
            );
        }
        for case in source["pages"].as_array().unwrap() {
            match unwrap_payload(case["raw"].clone(), "request failed", true) {
                Ok(value) => assert_eq!(value, case["result"]),
                Err(error) => assert_eq!(
                    json!({"message":error.message,"providerCode":error.provider_code,"httpStatus":error.http_status,"providerMessage":error.provider_message,"nextActions":error.next_actions}),
                    case["error"]
                ),
            }
        }
    }
}
