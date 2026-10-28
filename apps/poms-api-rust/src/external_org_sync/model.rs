use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{auth::model::clock_now, compat::scalars::js_iso_string};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Meta {
    pub id: Uuid,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}
impl Meta {
    pub fn new(actor: Option<Uuid>) -> Self {
        let now = clock_now();
        Self {
            id: Uuid::nil(),
            row_version: 1,
            created_at: now,
            created_by: actor,
            updated_at: now,
            updated_by: actor,
        }
    }
    pub fn attach(&self, value: &mut Value) {
        value["id"] = json!(self.id);
        value["rowVersion"] = json!(self.row_version);
        value["createdAt"] = json!(iso(self.created_at));
        value["createdBy"] = json!(self.created_by);
        value["updatedAt"] = json!(iso(self.updated_at));
        value["updatedBy"] = json!(self.updated_by);
    }
}
pub fn iso(value: DateTime<Utc>) -> String {
    js_iso_string(value).unwrap_or_default()
}
pub fn nullable_iso(value: Option<DateTime<Utc>>) -> Value {
    value.map_or(Value::Null, |value| json!(iso(value)))
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Source {
    #[serde(flatten)]
    pub meta: Meta,
    pub provider: String,
    pub external_tenant_id: Option<String>,
    pub display_name: String,
    pub status: String,
    pub provider_config_id: Option<Uuid>,
    pub authoritative_org_unit_id: Option<Uuid>,
    pub external_root_department_id: Option<String>,
    #[serde(rename = "sync_scopes_json")]
    pub sync_scopes: Value,
}
impl Source {
    pub fn audit(&self) -> Value {
        json!({"provider":self.provider,"externalTenantId":self.external_tenant_id,"displayName":self.display_name,"status":self.status,"providerConfigId":self.provider_config_id,"authoritativeOrgUnitId":self.authoritative_org_unit_id,"externalRootDepartmentId":self.external_root_department_id,"syncScopes":self.sync_scopes,"rowVersion":self.meta.row_version})
    }
    pub fn detail(&self) -> Value {
        let mut value = self.audit();
        self.meta.attach(&mut value);
        value
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Mapping {
    #[serde(flatten)]
    pub meta: Meta,
    pub source_id: Uuid,
    pub external_department_id: String,
    pub external_parent_department_id: Option<String>,
    pub external_department_name: String,
    pub org_unit_id: Option<Uuid>,
    pub status: String,
    #[serde(rename = "external_snapshot_json")]
    pub external_snapshot: Value,
    pub last_seen_at: Option<DateTime<Utc>>,
}
impl Mapping {
    pub fn audit(&self) -> Value {
        json!({"id":self.meta.id,"externalDepartmentId":self.external_department_id,"externalParentDepartmentId":self.external_parent_department_id,"externalDepartmentName":self.external_department_name,"orgUnitId":self.org_unit_id,"status":self.status,"lastSeenAt":nullable_iso(self.last_seen_at),"rowVersion":self.meta.row_version})
    }
    pub fn summary(&self, context: Option<&ReviewContext>) -> Value {
        let (state, reason, context) = if self.status == "ignored" {
            ("ignored", None, None)
        } else if let Some(context) = context {
            if context.item.action == "conflict" {
                (
                    "conflict",
                    Some(conflict_reason(
                        &context.item,
                        "当前映射存在冲突，请重新映射、解除映射或忽略。",
                    )),
                    Some(context),
                )
            } else {
                (
                    "stale",
                    Some(conflict_reason(
                        &context.item,
                        "外部部门最近未在同步源中发现，请确认是否保留 POMS 组织。",
                    )),
                    Some(context),
                )
            }
        } else if self.status == "conflict" {
            (
                "conflict",
                Some("当前映射需要人工处理，请重新映射、解除映射或忽略。".into()),
                None,
            )
        } else if self.status == "mapped" {
            ("mapped", None, None)
        } else {
            ("unmapped", None, None)
        };
        let mut value = self.audit();
        self.meta.attach(&mut value);
        value["sourceId"] = json!(self.source_id);
        value["externalSnapshot"] = self.external_snapshot.clone();
        value["reviewState"] = json!(state);
        value["conflictReason"] = json!(reason.map(|value| utf16_slice(&value, 500)));
        value["lastConflictRunId"] = json!(context.map(|value| value.run.meta.id));
        value["lastConflictDiffItemId"] = json!(context.map(|value| value.item.meta.id));
        value
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Run {
    #[serde(flatten)]
    pub meta: Meta,
    pub source_id: Uuid,
    pub status: String,
    pub requested_by: Option<Uuid>,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub total_item_count: i32,
    pub approved_item_count: i32,
    pub skipped_item_count: i32,
    pub failed_item_count: i32,
    pub error_summary: Option<String>,
    #[serde(rename = "request_snapshot_json")]
    pub request_snapshot: Value,
    #[serde(rename = "result_summary_json")]
    pub result_summary: Value,
}
impl Run {
    pub fn audit(&self) -> Value {
        json!({"sourceId":self.source_id,"status":self.status,"requestedBy":self.requested_by,"startedAt":iso(self.started_at),"finishedAt":nullable_iso(self.finished_at),"totalItemCount":self.total_item_count,"approvedItemCount":self.approved_item_count,"skippedItemCount":self.skipped_item_count,"failedItemCount":self.failed_item_count,"errorSummary":self.error_summary,"rowVersion":self.meta.row_version})
    }
    pub fn detail(&self) -> Value {
        let mut value = self.audit();
        self.meta.attach(&mut value);
        value["requestSnapshot"] = self.request_snapshot.clone();
        value["resultSummary"] = self.result_summary.clone();
        value["errorSummary"] = json!(
            self.error_summary
                .as_ref()
                .filter(|value| !value.is_empty())
                .map(|value| redact(value))
        );
        value["diagnosticSummary"] = self.diagnostic();
        value
    }
    fn diagnostic(&self) -> Value {
        let persisted = &self.result_summary["diagnosticSummary"];
        let Some(message) = normalized(
            text(persisted, "message")
                .or_else(|| self.error_summary.clone())
                .as_deref(),
        ) else {
            return Value::Null;
        };
        let generated = text(persisted, "generatedAt")
            .filter(|value| crate::compat::scalars::parse_legacy_timestamp_utc(value).is_ok())
            .unwrap_or_else(|| iso(self.finished_at.unwrap_or(self.meta.updated_at)));
        let actions = persisted["nextActions"]
            .as_array()
            .map(|values| {
                values
                    .iter()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let actions = normalize_actions(&actions);
        json!({"message":message,"adapterStatus":text(persisted,"adapterStatus").or_else(||text(&self.request_snapshot,"adapterStatus")),"providerCode":text(persisted,"providerCode"),"httpStatus":persisted["httpStatus"].as_i64().filter(|value|(100..=599).contains(value)),"providerMessage":normalized(text(persisted,"providerMessage").as_deref()),"nextActions":if actions.is_empty(){default_actions()}else{actions},"generatedAt":generated})
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Diff {
    #[serde(flatten)]
    pub meta: Meta,
    pub run_id: Uuid,
    pub external_department_id: String,
    pub action: String,
    pub status: String,
    pub org_unit_id: Option<Uuid>,
    #[serde(rename = "before_snapshot_json")]
    pub before_snapshot: Option<Value>,
    #[serde(rename = "candidate_snapshot_json")]
    pub candidate_snapshot: Value,
    pub error_message: Option<String>,
    pub applied_at: Option<DateTime<Utc>>,
}
impl Diff {
    pub fn summary(&self) -> Value {
        let mut value = json!({"runId":self.run_id,"externalDepartmentId":self.external_department_id,"action":self.action,"status":self.status,"orgUnitId":self.org_unit_id,"beforeSnapshot":self.before_snapshot,"candidateSnapshot":self.candidate_snapshot,"errorMessage":self.error_message,"appliedAt":nullable_iso(self.applied_at)});
        self.meta.attach(&mut value);
        value
    }
}
#[derive(Clone, Debug)]
pub struct ReviewContext {
    pub run: Run,
    pub item: Diff,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Org {
    #[serde(flatten)]
    pub meta: Meta,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub is_active: bool,
    pub display_order: f64,
}
impl Org {
    pub fn snapshot(&self) -> Value {
        json!({"id":self.meta.id,"name":self.name,"code":self.code,"parentId":self.parent_id,"isActive":self.is_active,"displayOrder":self.display_order,"rowVersion":self.meta.row_version})
    }
}

pub fn text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(crate::auth::cookie::trim_js)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}
pub fn utf16_slice(value: &str, max: usize) -> String {
    String::from_utf16_lossy(&value.encode_utf16().take(max).collect::<Vec<_>>())
}
pub fn default_actions() -> Vec<String> {
    vec!["请检查企业协同接入配置、外部平台权限和根部门配置后重新生成预览。".into()]
}
pub fn normalized(value: Option<&str>) -> Option<String> {
    value
        .map(crate::auth::cookie::trim_js)
        .map(redact)
        .map(|value| crate::auth::cookie::trim_js(&value).to_owned())
        .filter(|value| !value.is_empty())
        .map(|value| utf16_slice(&value, 1000))
}
pub fn normalize_actions(actions: &[String]) -> Vec<String> {
    actions
        .iter()
        .map(|action| utf16_slice(&redact(crate::auth::cookie::trim_js(action)), 300))
        .filter(|action| !action.is_empty())
        .take(8)
        .collect()
}

// Same two narrow source regexes; no global snapshot/key filtering.
pub fn redact(value: &str) -> String {
    let mut result = String::new();
    let mut offset = 0;
    while offset < value.len() {
        let tail = &value[offset..];
        let mut matched = None;
        for quote in ["", "\"", "'"] {
            for key in [
                "tenant_access_token",
                "app_secret",
                "client_secret",
                "access_token",
                "refresh_token",
            ] {
                let prefix = format!("{quote}{key}{quote}");
                if !tail
                    .get(..prefix.len())
                    .is_some_and(|value| value.eq_ignore_ascii_case(&prefix))
                {
                    continue;
                }
                let rest = &tail[prefix.len()..];
                let skipped = rest.len() - rest.trim_start_matches(char::is_whitespace).len();
                let rest = &rest[skipped..];
                let Some(separator) = rest
                    .chars()
                    .next()
                    .filter(|value| matches!(value, ':' | '='))
                else {
                    continue;
                };
                let after = &rest[separator.len_utf8()..];
                let spaces = after.len() - after.trim_start_matches(char::is_whitespace).len();
                let after = &after[spaces..];
                let value_quote = after
                    .chars()
                    .next()
                    .filter(|value| matches!(value, '\'' | '"'));
                let start = value_quote.map_or(0, char::len_utf8);
                let end = after[start..]
                    .find(|character: char| {
                        character.is_whitespace() || "\"',，)}]".contains(character)
                    })
                    .map_or(after.len(), |index| start + index);
                if end == start {
                    continue;
                }
                let close =
                    value_quote.map_or(0, |quote| usize::from(after[end..].starts_with(quote)));
                if value_quote.is_some() && close == 0 {
                    continue;
                }
                let actual_key = &tail[quote.len()..quote.len() + key.len()];
                let q = value_quote
                    .map(|value| value.to_string())
                    .unwrap_or_default();
                matched = Some((
                    prefix.len() + skipped + separator.len_utf8() + spaces + end + close,
                    format!("{quote}{actual_key}{quote}{separator}{q}<redacted>{q}"),
                ));
                break;
            }
            if matched.is_some() {
                break;
            }
        }
        if let Some((length, replacement)) = matched {
            result.push_str(&replacement);
            offset += length;
        } else {
            let character = tail.chars().next().unwrap_or(' ');
            result.push(character);
            offset += character.len_utf8();
        }
    }
    let value = result;
    let mut result = String::new();
    let mut offset = 0;
    while offset < value.len() {
        let tail = &value[offset..];
        let before = value[..offset].chars().next_back();
        let boundary =
            before.is_none_or(|character| !character.is_ascii_alphanumeric() && character != '_');
        if boundary
            && tail
                .get(..6)
                .is_some_and(|value| value.eq_ignore_ascii_case("Bearer"))
        {
            let rest = &tail[6..];
            let spaces = rest.len() - rest.trim_start_matches(char::is_whitespace).len();
            if spaces > 0 {
                let rest = &rest[spaces..];
                let length = rest.find(char::is_whitespace).unwrap_or(rest.len());
                if length > 0 {
                    result.push_str("Bearer <redacted>");
                    offset += 6 + spaces + length;
                    continue;
                }
            }
        }
        let character = tail.chars().next().unwrap_or(' ');
        result.push(character);
        offset += character.len_utf8();
    }
    result
}
fn conflict_reason(item: &Diff, fallback: &str) -> String {
    match text(&item.candidate_snapshot, "reason").as_deref() {
        Some("external_department_missing") => {
            return "外部部门最近未在同步源中发现，请确认是否停用、忽略或重新生成预览。".into();
        }
        Some("external_department_inactive") => {
            return "外部部门在同步源中已停用，请确认是否停用 POMS 组织或忽略该部门。".into();
        }
        Some("mapped_org_unit_missing") => {
            return "已映射的 POMS 组织不存在，请重新映射、解除映射或忽略该外部部门。".into();
        }
        _ => {}
    }
    let message = item
        .error_message
        .as_deref()
        .map(crate::auth::cookie::trim_js)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback);
    if message.contains("Mapped OrgUnit was not found") {
        "已映射的 POMS 组织不存在，请重新映射、解除映射或忽略该外部部门。"
    } else if message.contains("Mapped OrgUnit is inactive") {
        "已映射的 POMS 组织已停用，请重新映射到启用组织、解除映射或忽略。"
    } else if message.contains("Mapped parent OrgUnit") && message.contains("was not found") {
        "已映射的上级 POMS 组织不存在，请先处理上级部门映射。"
    } else if message.contains("Mapped parent OrgUnit") && message.contains("inactive") {
        "已映射的上级 POMS 组织已停用，请先处理上级部门映射。"
    } else if message.contains("External parent department") {
        "外部上级部门尚未映射或不在当前预览中，请先处理上级部门映射。"
    } else {
        message
    }
    .into()
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    #[test]
    fn original_narrow_diagnostic_redaction() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-behavior.json"))
                .unwrap();
        for case in source["diagnostics"].as_array().unwrap() {
            let message = case["message"].as_str().unwrap();
            assert_eq!(redact(message), case["redacted"].as_str().unwrap());
            assert_eq!(json!(normalized(Some(message))), case["normalized"]);
        }
    }
}
