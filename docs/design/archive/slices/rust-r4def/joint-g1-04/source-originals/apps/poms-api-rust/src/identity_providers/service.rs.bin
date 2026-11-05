//! Original identity decisions, independent business/audit flushes and auth composition.
use super::{
    adapter::{AdapterError, FeishuAdapter},
    model::RequestData,
    state,
    store::{self, Entity, Table},
    validation::trim,
};
use crate::{
    auth::{
        audit::{AuditLogInput, AuditResult},
        crypto,
        js_json::JsString,
        model::{ResolvedSession, SessionFlush, clock_now},
    },
    compat::scalars::js_iso_string,
    database::Database,
    error::ApiError,
    external_org_sync::DirectoryAdapter,
    provider_support::{ProviderRuntimeConfig, ProviderSupport},
};
use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use std::collections::HashSet;
use uuid::Uuid;

pub struct CallContext {
    pub operator: Option<Uuid>,
    pub pending: Option<SessionFlush>,
    user_snapshot: Option<(Uuid, bool)>,
}
struct AuditSpec<'a> {
    event: &'a str,
    operator: Option<Uuid>,
    before: Option<Value>,
    after: Option<Value>,
    metadata: Option<Value>,
    result: AuditResult,
    reason: Option<String>,
}
fn identity_audit_input(entity: &Entity, spec: AuditSpec<'_>) -> AuditLogInput {
    let AuditSpec {
        event,
        operator,
        before,
        after,
        metadata,
        result,
        reason,
    } = spec;
    AuditLogInput {
        event_type: event.into(),
        target_type: match entity.table {
            Table::Config => "IdentityProviderConfig",
            Table::Binding => "ExternalIdentity",
            Table::Grant => "IdentityProviderOAuthGrant",
            Table::Ticket => "ExternalLoginTicket",
        }
        .into(),
        target_id: entity.id(),
        operator_id: operator,
        // Original IdentityProviderService never passes a requestId. Guard and
        // security metadata retain their separate transport behavior.
        request_id: None,
        result,
        reason,
        before_snapshot: before,
        after_snapshot: after,
        metadata,
        ..AuditLogInput::default()
    }
}
impl CallContext {
    pub fn new(session: Option<&ResolvedSession>) -> Self {
        Self {
            operator: session.map(|v| v.user.user_id),
            pending: session.and_then(|v| v.pending_flush.clone()),
            user_snapshot: session.map(|v| (v.user_snapshot.id, v.user_snapshot.is_active)),
        }
    }
}
#[derive(Clone)]
pub struct IdentityProvidersService {
    database: Database,
    support: ProviderSupport,
    directory: DirectoryAdapter,
    adapter: FeishuAdapter,
}
const REQUIRED: [&str; 6] = [
    "contact:user:search",
    "contact:contact.base:readonly",
    "contact:user.department:readonly",
    "contact:department.base:readonly",
    "contact:user.email:readonly",
    "contact:user.phone:readonly",
];
fn bad(message: impl Into<String>) -> ApiError {
    ApiError::message(StatusCode::BAD_REQUEST, message)
}
fn conflict(message: impl Into<String>) -> ApiError {
    ApiError::message(StatusCode::CONFLICT, message)
}
fn unauthorized(message: impl Into<String>) -> ApiError {
    ApiError::message(StatusCode::UNAUTHORIZED, message)
}
fn unique(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .map(|v| trim(&v))
        .filter(|v| !v.is_empty() && seen.insert(v.clone()))
        .collect()
}
fn nonempty(entity: &Entity, key: &str) -> bool {
    !entity.str(key).is_empty()
}
fn iso(value: DateTime<Utc>) -> Result<String, ApiError> {
    js_iso_string(value).map_err(|_| ApiError::internal())
}
fn time(entity: &Entity, key: &str) -> Value {
    entity
        .time(key)
        .and_then(|v| js_iso_string(v).ok())
        .map(Value::String)
        .unwrap_or(Value::Null)
}
fn required(config: &Entity) -> Vec<String> {
    if config.boolean("search_enabled") && config.str("provider") == "feishu" {
        REQUIRED.iter().map(|v| (*v).into()).collect()
    } else {
        vec![]
    }
}
fn missing(required: &[String], granted: &[String]) -> Vec<String> {
    let set = granted.iter().map(|v| trim(v)).collect::<HashSet<_>>();
    required
        .iter()
        .filter(|v| !set.contains(v.as_str()))
        .cloned()
        .collect()
}
fn normalize_additional(config: &Entity, values: Vec<String>) -> Vec<String> {
    let required = required(config);
    unique(values)
        .into_iter()
        .filter(|v| !required.contains(v))
        .collect()
}
fn supported(mode: &str) -> Result<(), ApiError> {
    if mode != "per-admin" {
        return Err(bad(
            "Only per-admin provider search grants are supported in the first version.",
        ));
    }
    Ok(())
}
fn validate_scopes(config: &Entity, values: Vec<String>) -> Result<Vec<String>, ApiError> {
    let required = required(config);
    let scopes = unique(
        required
            .iter()
            .cloned()
            .chain(normalize_additional(config, values))
            .collect(),
    );
    if scopes.len() > 32 {
        let hint = if required.is_empty() {
            "请减少额外 Search scopes。".into()
        } else {
            format!(
                "POMS 会自动请求 {}，请减少额外 Search scopes。",
                required.join(", ")
            )
        };
        return Err(ApiError::object(
            StatusCode::BAD_REQUEST,
            json!({"statusCode":400,"code":"identity_provider_search_scope_capacity_exceeded","message":format!("用户搜索最终授权范围最多支持 32 项。{hint}"),"maxScopes":32,"requiredScopes":required,"effectiveScopeCount":scopes.len(),"maxAdditionalScopes":32-required.len()}),
        ));
    }
    if scopes.iter().any(|v| v.encode_utf16().count() > 128) {
        return Err(ApiError::object(
            StatusCode::BAD_REQUEST,
            json!({"statusCode":400,"code":"identity_provider_search_scope_invalid","message":"用户搜索授权范围单项不能超过 128 个字符。","maxScopeLength":128}),
        ));
    }
    Ok(scopes)
}
fn grant_scope_snapshot(grant: &Entity) -> Result<(Vec<String>, bool), ApiError> {
    let value = &grant.data["scopes_json"];
    let values = if value.is_null() {
        vec![]
    } else {
        value
            .as_array()
            .ok_or_else(ApiError::internal)?
            .iter()
            .map(|v| v.as_str().map(str::to_owned).ok_or_else(ApiError::internal))
            .collect::<Result<Vec<_>, _>>()?
    };
    let scopes = unique(values);
    let valid = scopes.len() <= 32 && scopes.iter().all(|v| v.encode_utf16().count() <= 128);
    Ok((scopes, valid))
}
fn grant_status(grant: &Entity) -> &str {
    if grant.str("status") == "revoked" {
        "revoked"
    } else if grant.time("expires_at").is_some_and(|v| v <= clock_now()) {
        "expired"
    } else {
        grant.str("status")
    }
}
fn normalize_status(config: &mut Entity, previous: &str) {
    config.data["status"] = json!(if !config.boolean("enabled") {
        if previous == "draft" {
            "draft"
        } else {
            "disabled"
        }
    } else if minimum(config) {
        "active"
    } else {
        "misconfigured"
    });
}
fn minimum(config: &Entity) -> bool {
    nonempty(config, "client_id")
        && nonempty(config, "encrypted_client_secret")
        && (!config.boolean("login_enabled") || nonempty(config, "redirect_uri"))
        && (!config.boolean("search_enabled") || nonempty(config, "search_redirect_uri"))
}
fn assert_config(config: &Entity) -> Result<(), ApiError> {
    if config.str("status") == "active" {
        if !config.boolean("enabled") {
            return Err(bad("Active identity provider config must be enabled."));
        }
        if !minimum(config) {
            return Err(bad(
                "Active identity provider config requires complete client credentials and enabled capability redirect URIs.",
            ));
        }
    }
    Ok(())
}
fn assert_binding(config: &Entity) -> Result<(), ApiError> {
    if !config.boolean("enabled") || config.str("status") != "active" {
        return Err(bad(
            "Active and enabled identity provider config is required before binding external identities.",
        ));
    }
    if !config.boolean("binding_enabled") {
        return Err(bad("Identity provider config does not allow binding."));
    }
    Ok(())
}
fn assert_login(config: &Entity) -> Result<(), ApiError> {
    if !config.boolean("enabled") || config.str("status") != "active" {
        return Err(bad(
            "Active and enabled identity provider config is required before external login.",
        ));
    }
    if !config.boolean("login_enabled") {
        return Err(bad(
            "Identity provider config does not allow external login.",
        ));
    }
    if !nonempty(config, "encrypted_client_secret") {
        return Err(bad(
            "Identity provider client secret is required before external login.",
        ));
    }
    if !nonempty(config, "redirect_uri") {
        return Err(bad(
            "Identity provider redirect URI is required before external login.",
        ));
    }
    Ok(())
}
fn assert_search(config: &Entity) -> Result<(), ApiError> {
    if !config.boolean("enabled") || config.str("status") != "active" {
        return Err(bad(
            "Active and enabled identity provider config is required before searching external users.",
        ));
    }
    if !config.boolean("search_enabled") {
        return Err(bad(
            "Identity provider config does not allow external user search.",
        ));
    }
    if config.str("search_grant_mode") != "per-admin" {
        return Err(bad(
            "Only per-admin external user search grants are supported.",
        ));
    }
    validate_scopes(config, config.strings("search_scopes_json"))?;
    if !nonempty(config, "encrypted_client_secret") {
        return Err(bad(
            "Identity provider client secret is required before starting provider authorization.",
        ));
    }
    if !nonempty(config, "search_redirect_uri") {
        return Err(bad(
            "Identity provider search redirect URI is required before starting provider authorization.",
        ));
    }
    Ok(())
}

impl IdentityProvidersService {
    pub fn new(database: Database, support: ProviderSupport, directory: DirectoryAdapter) -> Self {
        let adapter = FeishuAdapter::new(support.clone());
        Self {
            database,
            support,
            directory,
            adapter,
        }
    }
    async fn config(&self, id: &str) -> Result<Entity, ApiError> {
        store::find(&self.database, Table::Config, id)
            .await
            .map_err(|_| ApiError::internal())?
            .ok_or_else(|| {
                ApiError::message(
                    StatusCode::NOT_FOUND,
                    format!("Identity provider config {id} not found"),
                )
            })
    }
    async fn user(&self, id: &str) -> Result<bool, ApiError> {
        store::user_active(&self.database, id)
            .await
            .map_err(|_| ApiError::internal())?
            .ok_or_else(|| {
                ApiError::message(
                    StatusCode::NOT_FOUND,
                    format!("Platform user {id} not found"),
                )
            })
    }
    async fn managed_user(&self, id: &str, context: &CallContext) -> Result<bool, ApiError> {
        if let Some((user_id, active)) = context.user_snapshot
            && Uuid::parse_str(id).ok() == Some(user_id)
        {
            return Ok(active);
        }
        self.user(id).await
    }
    async fn one(
        &self,
        table: Table,
        conditions: Vec<(&'static str, Value)>,
        order: Option<&'static str>,
    ) -> Result<Option<Entity>, ApiError> {
        Ok(
            store::select(&self.database, table, conditions, order, true)
                .await
                .map_err(|_| ApiError::internal())?
                .into_iter()
                .next(),
        )
    }
    async fn save(&self, entity: &mut Entity, context: &mut CallContext) -> Result<(), ApiError> {
        store::save(&self.database, entity, &mut context.pending)
            .await
            .map_err(|_| ApiError::internal())
    }
    async fn audit(
        &self,
        entity: &Entity,
        spec: AuditSpec<'_>,
        context: &mut CallContext,
    ) -> Result<(), ApiError> {
        let raw_after = spec
            .after
            .as_ref()
            .and_then(|snapshot| raw_snapshot(entity, snapshot));
        let raw_metadata = spec
            .metadata
            .as_ref()
            .and_then(|snapshot| raw_snapshot(entity, snapshot));
        let input = identity_audit_input(entity, spec);
        store::audit(
            &self.database,
            input,
            raw_after,
            raw_metadata,
            &mut context.pending,
        )
        .await
        .map_err(|_| ApiError::internal())
    }
    async fn config_audit(
        &self,
        event: &str,
        entity: &Entity,
        before: Option<Value>,
        after: Value,
        context: &mut CallContext,
    ) -> Result<(), ApiError> {
        self.audit(
            entity,
            AuditSpec {
                event,
                operator: context.operator,
                before,
                after: Some(after),
                metadata: Some(json!({"secretRedacted":true})),
                result: AuditResult::Success,
                reason: None,
            },
            context,
        )
        .await
    }
    async fn grant_audit(
        &self,
        event: &str,
        entity: &Entity,
        operator: Option<Uuid>,
        before: Option<Value>,
        after: Value,
        context: &mut CallContext,
    ) -> Result<(), ApiError> {
        self.audit(entity,AuditSpec{event,operator,before,after:Some(after),metadata:Some(json!({"identityProviderConfigId":entity.data["identity_provider_config_id"],"provider":entity.data["provider"],"tenantId":entity.data["tenant_id"],"tokenRedacted":true})),result:AuditResult::Success,reason:None},context).await
    }
    fn encrypt(&self, value: &str) -> Result<String, ApiError> {
        self.support
            .cipher
            .encrypt(&value.encode_utf16().collect::<Vec<_>>())
            .map_err(|_| ApiError::internal())
    }
    fn decrypt(&self, value: &str) -> Result<String, ApiError> {
        self.support
            .cipher
            .decrypt(value)
            .map_err(|error| match error.kind() {
                crypto::CryptoErrorKind::SecretUnreadable => bad(error.to_string()),
                _ => ApiError::internal(),
            })
    }
    pub async fn list(&self, query: RequestData) -> Result<Value, ApiError> {
        let mut conditions = Vec::new();
        for key in ["provider", "status"] {
            if let Some(value) = query.text(key) {
                conditions.push((key, json!(value)));
            }
        }
        Ok(Value::Array(
            store::select(
                &self.database,
                Table::Config,
                conditions,
                Some("created_at DESC"),
                false,
            )
            .await
            .map_err(|_| ApiError::internal())?
            .iter()
            .map(detail)
            .collect(),
        ))
    }
    pub async fn get(&self, id: &str) -> Result<Value, ApiError> {
        Ok(detail(&self.config(id).await?))
    }
    pub async fn test_connection(&self, id: &str, request: RequestData) -> Result<Value, ApiError> {
        let config = self.config(id).await?;
        check_version(&config, &request, "Identity provider config")?;
        if request.text("capability").as_deref() == Some("external-org-sync") {
            return self.org_readiness(&config, &request).await;
        }
        let mut checks = Vec::new();
        let enabled = config.boolean("enabled") && config.str("status") != "disabled";
        checks.push(check(
            "enabled",
            "总开关",
            enabled,
            if enabled {
                "企业协同接入总开关已启用。"
            } else {
                "企业协同接入已停用。"
            },
        ));
        let credentials =
            nonempty(&config, "client_id") && nonempty(&config, "encrypted_client_secret");
        checks.push(check(
            "clientCredentials",
            "Client ID / Secret",
            credentials,
            if credentials {
                "Client ID 和 Client Secret 已配置。"
            } else {
                "Client ID 和 Client Secret 不能为空。"
            },
        ));
        for (enabled, uri, key, label, passed, failed, skipped) in [
            (
                "login_enabled",
                "redirect_uri",
                "loginRedirectUri",
                "登录 Redirect URI",
                "登录 Redirect URI 已配置。",
                "启用登录能力时必须配置登录 Redirect URI。",
                "登录能力未启用。",
            ),
            (
                "search_enabled",
                "search_redirect_uri",
                "searchRedirectUri",
                "搜索 Redirect URI",
                "搜索 Redirect URI 已配置。",
                "启用搜索能力时必须配置 Search Redirect URI。",
                "搜索能力未启用。",
            ),
        ] {
            checks.push(if config.boolean(enabled) {
                check(
                    key,
                    label,
                    nonempty(&config, uri),
                    if nonempty(&config, uri) {
                        passed
                    } else {
                        failed
                    },
                )
            } else {
                diagnostic(key, label, "skipped", skipped)
            });
        }
        let message = if failed(&checks).is_none() {
            "本地配置检查通过。服务商网络连通性由对应适配器能力检查。".into()
        } else {
            failed(&checks)
                .map(|v| v["message"].as_str().unwrap_or("").to_owned())
                .unwrap_or_else(|| "企业协同接入配置未就绪。".into())
        };
        connection_result("basic", checks, message, vec![])
    }
    async fn org_readiness(
        &self,
        config: &Entity,
        request: &RequestData,
    ) -> Result<Value, ApiError> {
        let (secret, credential_failure) =
            if !nonempty(config, "client_id") || !nonempty(config, "encrypted_client_secret") {
                (None, None)
            } else {
                match self.decrypt(config.str("encrypted_client_secret")) {
                    Ok(secret) if !secret.is_empty() => (Some(secret), None),
                    Ok(_) => (None, Some("Client Secret 已保存但为空，请重新填写并保存。")),
                    Err(_) => (
                        None,
                        Some("Client Secret 已保存但无法读取，请重新填写并保存。"),
                    ),
                }
            };
        let provider = config.str("provider") == "feishu";
        let active = config.str("status") == "active";
        let enabled = config.boolean("enabled");
        let readable = nonempty(config, "client_id")
            && nonempty(config, "encrypted_client_secret")
            && credential_failure.is_none();
        let label = match config.str("status") {
            "draft" => "草稿",
            "active" => "已激活",
            "disabled" => "已停用",
            "misconfigured" => "配置异常",
            _ => "undefined",
        };
        let mut checks = vec![
            check(
                "provider",
                "外部平台",
                provider,
                if provider {
                    "当前接入配置为飞书，可用于外部组织同步诊断。"
                } else {
                    "当前仅支持飞书组织同步诊断。"
                },
            ),
            check(
                "enabled",
                "总开关",
                enabled,
                if enabled {
                    "企业协同接入总开关已启用。"
                } else {
                    "企业协同接入总开关未启用。"
                },
            ),
            check(
                "configStatus",
                "接入状态",
                active,
                &if active {
                    "接入配置状态已激活。".into()
                } else {
                    format!("接入配置状态为「{label}」，尚未就绪。")
                },
            ),
            check(
                "clientCredentials",
                "Client ID / Secret",
                readable,
                if readable {
                    "Client ID 和 Client Secret 已配置且可读取。"
                } else {
                    credential_failure.unwrap_or("组织同步需要完整的 Client ID 和 Client Secret。")
                },
            ),
        ];
        if failed(&checks).is_some() {
            checks.push(diagnostic(
                "tenantAccessToken",
                "飞书 tenant_access_token",
                "skipped",
                "本地接入配置未就绪，暂不请求飞书 tenant_access_token。",
            ));
            checks.push(diagnostic(
                "departmentReadAccess",
                "飞书部门读取",
                "skipped",
                "本地接入配置未就绪，暂不读取飞书部门。",
            ));
            let message = connection_failure(&checks);
            let actions = next_actions(&checks);
            return connection_result("external-org-sync", checks, message, actions);
        }
        let runtime = ProviderRuntimeConfig {
            id: config.uuid("id").ok_or_else(ApiError::internal)?,
            provider: config.str("provider").into(),
            client_id: config.str("client_id").into(),
            enabled: config.boolean("enabled"),
            encrypted_client_secret: config.text("encrypted_client_secret"),
            status: config.str("status").into(),
        };
        let root = request.text("externalRootDepartmentId");
        match self
            .directory
            .test_department_read_access(&runtime, secret.as_deref().unwrap_or(""), root.as_deref())
            .await
        {
            Ok(result) => {
                checks.push(diagnostic(
                    "tenantAccessToken",
                    "飞书 tenant_access_token",
                    "passed",
                    "已使用应用凭证获取飞书 tenant_access_token。",
                ));
                checks.push(diagnostic(
                    "departmentReadAccess",
                    "飞书部门读取",
                    "passed",
                    &format!(
                        "根部门 {} 可访问，已完成单页读取探测（返回 {} 个子部门样本）。",
                        result.root_department_id, result.child_department_count
                    ),
                ));
            }
            Err(error) => {
                let message = redact_diagnostic(&trim(&error.message));
                let message = if message.is_empty() {
                    "飞书组织同步只读探测失败。".into()
                } else {
                    message
                };
                if message.contains("tenant access token") || message.contains("访问令牌") {
                    checks.push(diagnostic(
                        "tenantAccessToken",
                        "飞书 tenant_access_token",
                        "failed",
                        &message,
                    ));
                    checks.push(diagnostic(
                        "departmentReadAccess",
                        "飞书部门读取",
                        "skipped",
                        "tenant_access_token 获取失败，暂不读取飞书部门。",
                    ));
                } else {
                    checks.push(diagnostic(
                        "tenantAccessToken",
                        "飞书 tenant_access_token",
                        "passed",
                        "已使用应用凭证获取飞书 tenant_access_token。",
                    ));
                    checks.push(diagnostic(
                        "departmentReadAccess",
                        "飞书部门读取",
                        "failed",
                        &message,
                    ));
                }
            }
        }
        let message = if failed(&checks).is_none() {
            "组织同步可用性检查通过，飞书通讯录读取正常。".into()
        } else {
            connection_failure(&checks)
        };
        let actions = next_actions(&checks);
        connection_result("external-org-sync", checks, message, actions)
    }
    pub async fn create(
        &self,
        request: RequestData,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        let provider = request.text("provider").unwrap_or_default();
        let tenant = request.value("tenantId").unwrap_or(Value::Null);
        if self
            .one(
                Table::Config,
                vec![("provider", json!(provider)), ("tenant_id", tenant.clone())],
                None,
            )
            .await?
            .is_some()
        {
            let mut message = format!("Identity provider config already exists: {provider}/")
                .encode_utf16()
                .collect::<Vec<_>>();
            message.extend(
                request
                    .string("tenantId")
                    .map(|v| v.as_code_units().to_vec())
                    .unwrap_or_else(|| "default".encode_utf16().collect()),
            );
            return Err(js_message(
                StatusCode::CONFLICT,
                JsString::from_code_units(message),
            ));
        }
        let mode = request
            .text("searchGrantMode")
            .unwrap_or_else(|| "per-admin".into());
        supported(&mode)?;
        let scope_config = Entity {
            table: Table::Config,
            data: json!({"provider":provider,"search_enabled":request.boolean("searchEnabled").unwrap_or(false)}),
            original: None,
            raw_fields: Default::default(),
        };
        validate_raw_search_scopes(&scope_config, &request)?;
        let search_scopes = normalize_additional(&scope_config, request.strings("searchScopes"));
        validate_scopes(&scope_config, search_scopes.clone())?;
        let secret = request
            .text("clientSecret")
            .map(|v| self.encrypt(&v))
            .transpose()?;
        let mut config = Entity::new(
            Table::Config,
            json!({"provider":provider,"tenant_id":tenant,"display_name":request.text("displayName").unwrap_or_default(),"status":"draft","enabled":request.boolean("enabled").unwrap_or(false),"login_enabled":request.boolean("loginEnabled").unwrap_or(false),"binding_enabled":request.boolean("bindingEnabled").unwrap_or(false),"search_enabled":request.boolean("searchEnabled").unwrap_or(false),"client_id":request.text("clientId").unwrap_or_default(),"encrypted_client_secret":secret,"secret_updated_at":secret.as_ref().map(|_|clock_now()),"redirect_uri":request.value("redirectUri").unwrap_or(Value::Null),"search_redirect_uri":request.value("searchRedirectUri").unwrap_or(Value::Null),"login_scopes_json":unique(request.strings("loginScopes")),"search_scopes_json":[],"tenant_allowlist_json":request.strings("tenantAllowlist"),"search_grant_mode":mode,"created_by":context.operator,"updated_by":context.operator}),
        );
        config.data["search_scopes_json"] = json!(search_scopes);
        capture_config_raw(&mut config, &request);
        normalize_status(&mut config, "draft");
        assert_config(&config)?;
        self.save(&mut config, &mut context).await?;
        self.config_audit(
            "identity-provider.config.created",
            &config,
            None,
            config_snapshot(&config),
            &mut context,
        )
        .await?;
        Ok(detail(&config))
    }
    pub async fn update(
        &self,
        id: &str,
        request: RequestData,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        let mut config = self.config(id).await?;
        check_version(&config, &request, "Identity provider config")?;
        let mut scope_config = config.clone();
        if let Some(enabled) = request.boolean("searchEnabled") {
            scope_config.data["search_enabled"] = json!(enabled);
        }
        let scopes = normalize_additional(
            &scope_config,
            if request.has("searchScopes") {
                request.strings("searchScopes")
            } else {
                config.strings("search_scopes_json")
            },
        );
        validate_raw_search_scopes(&scope_config, &request)?;
        validate_scopes(&scope_config, scopes.clone())?;
        let before = config_snapshot(&config);
        let previous = config.str("status").to_owned();
        for (field, column) in [
            ("displayName", "display_name"),
            ("enabled", "enabled"),
            ("loginEnabled", "login_enabled"),
            ("bindingEnabled", "binding_enabled"),
            ("searchEnabled", "search_enabled"),
            ("clientId", "client_id"),
            ("redirectUri", "redirect_uri"),
            ("searchRedirectUri", "search_redirect_uri"),
            ("tenantAllowlist", "tenant_allowlist_json"),
        ] {
            if let Some(value) = request.value(field) {
                config.data[column] = value;
            }
        }
        if let Some(secret) = request.text("clientSecret") {
            config.data["encrypted_client_secret"] = json!(self.encrypt(&secret)?);
            config.data["secret_updated_at"] = json!(clock_now());
        }
        if request.has("loginScopes") {
            config.data["login_scopes_json"] = json!(unique(request.strings("loginScopes")));
        }
        config.data["search_scopes_json"] = json!(scopes);
        if let Some(mode) = request.text("searchGrantMode") {
            supported(&mode)?;
            config.data["search_grant_mode"] = json!(mode);
        }
        normalize_status(&mut config, &previous);
        config.data["updated_by"] = json!(context.operator);
        capture_config_raw(&mut config, &request);
        assert_config(&config)?;
        self.save(&mut config, &mut context).await?;
        self.config_audit(
            "identity-provider.config.updated",
            &config,
            Some(before),
            config_snapshot(&config),
            &mut context,
        )
        .await?;
        Ok(detail(&config))
    }
    pub async fn enabled_login_providers(&self) -> Result<Value, ApiError> {
        Ok(Value::Array(store::select(&self.database,Table::Config,vec![("enabled",json!(true)),("login_enabled",json!(true)),("status",json!("active"))],Some("created_at DESC"),false).await.map_err(|_|ApiError::internal())?.iter().map(|v|json!({"id":v.id(),"provider":v.data["provider"],"tenantId":v.data["tenant_id"],"displayName":v.data["display_name"],"loginScopes":v.data["login_scopes_json"]})).collect()))
    }
    pub async fn authorize_login(
        &self,
        id: &str,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        let config = self.config(id).await?;
        assert_login(&config)?;
        let (state, expires) =
            state::create(&self.support.state_signer, &config.id(), None, clock_now())?;
        let url = self.adapter.build_authorize_url(
            config.str("client_id"),
            config.str("redirect_uri"),
            &state,
            &config.strings("login_scopes_json"),
        )?;
        let expires = iso(expires)?;
        self.audit(&config,AuditSpec{event:"identity-provider.external-login.authorize-started",operator:None,before:None,after:Some(json!({"identityProviderConfigId":config.id(),"provider":config.data["provider"],"tenantId":config.data["tenant_id"],"stateExpiresAt":expires})),metadata:Some(json!({"secretRedacted":true})),result:AuditResult::Success,reason:None},&mut context).await?;
        Ok(json!({"authorizeUrl":url,"stateExpiresAt":expires}))
    }
    pub async fn login_callback(
        &self,
        query: RequestData,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        callback_code(&query, false)?;
        let state = state::verify(
            &self.support.state_signer,
            &query.text("state").unwrap_or_default(),
            false,
            clock_now().timestamp_millis(),
        )?;
        let config = self.config(&state.config_id).await?;
        assert_login(&config)?;
        let secret = self.decrypt(config.str("encrypted_client_secret"))?;
        let token = self
            .adapter
            .exchange_code(
                config.str("client_id"),
                config.str("redirect_uri"),
                &secret,
                &query.text("code").unwrap_or_default(),
            )
            .await
            .map_err(|e| adapter_message(StatusCode::UNAUTHORIZED, &e))?;
        let subject_js = self
            .adapter
            .login_identity(&token.access_token)
            .await
            .map_err(|e| adapter_message(StatusCode::UNAUTHORIZED, &e))?;
        let subject = subject_js.to_utf8_lossy();
        let binding = self
            .one(
                Table::Binding,
                vec![
                    ("identity_provider_config_id", json!(config.id())),
                    ("tenant_id", config.data["tenant_id"].clone()),
                    ("subject_id", json!(subject)),
                    ("status", json!("active")),
                ],
                None,
            )
            .await?;
        let Some(binding) = binding else {
            self.login_failure(
                &config,
                &subject_js,
                "external_identity_not_bound",
                &mut context,
            )
            .await?;
            return Err(unauthorized(
                "External identity is not bound to a POMS user.",
            ));
        };
        if !store::user_active(&self.database, binding.str("poms_user_id"))
            .await
            .map_err(|_| ApiError::internal())?
            .unwrap_or(false)
        {
            self.login_failure(&config, &subject_js, "poms_user_inactive", &mut context)
                .await?;
            return Err(unauthorized("Bound POMS user is inactive or missing."));
        }
        let ticket = crypto::create_opaque_token().map_err(|_| ApiError::internal())?;
        let expires = DateTime::from_timestamp_millis(clock_now().timestamp_millis() + 120_000)
            .ok_or_else(ApiError::internal)?;
        let mut entity = Entity::new(
            Table::Ticket,
            json!({"ticket_hash":crypto::hash_token(&ticket),"identity_provider_config_id":config.id(),"external_identity_id":binding.id(),"poms_user_id":binding.data["poms_user_id"],"provider":config.data["provider"],"tenant_id":config.data["tenant_id"],"subject_id":subject,"status":"issued","expires_at":expires,"consumed_at":null}),
        );
        if has_lone(&subject_js) {
            entity
                .raw_fields
                .insert("subject_id".into(), subject_js.json());
        }
        self.save(&mut entity, &mut context).await?;
        self.audit(
            &entity,
            AuditSpec {
                event: "identity-provider.external-login.ticket-issued",
                operator: binding.uuid("poms_user_id"),
                before: None,
                after: Some(ticket_snapshot(&entity, false)),
                metadata: None,
                result: AuditResult::Success,
                reason: None,
            },
            &mut context,
        )
        .await?;
        Ok(
            json!({"ticket":ticket,"expiresAt":iso(expires)?,"provider":config.data["provider"],"identityProviderConfigId":config.id(),"pomsUserId":binding.data["poms_user_id"]}),
        )
    }
    async fn login_failure(
        &self,
        config: &Entity,
        subject: &JsString,
        reason: &str,
        context: &mut CallContext,
    ) -> Result<(), ApiError> {
        let mut target = config.clone();
        if has_lone(subject) {
            target
                .raw_fields
                .insert("subject_id".into(), subject.json());
        }
        self.audit(&target,AuditSpec{event:"identity-provider.external-login.failed",operator:None,before:None,after:None,metadata:Some(json!({"provider":config.data["provider"],"tenantId":config.data["tenant_id"],"subjectId":subject.to_utf8_lossy()})),result:AuditResult::Failed,reason:Some(reason.into())},context).await
    }
    pub async fn consume_ticket(
        &self,
        ticket: &str,
        mut context: CallContext,
    ) -> Result<Uuid, ApiError> {
        let mut entity = self
            .one(
                Table::Ticket,
                vec![("ticket_hash", json!(crypto::hash_token(ticket)))],
                None,
            )
            .await?
            .ok_or_else(|| unauthorized("External login ticket is invalid."))?;
        if entity.str("status") != "issued" {
            return Err(unauthorized(
                "External login ticket has already been consumed.",
            ));
        }
        if entity.time("expires_at").is_some_and(|v| v <= clock_now()) {
            entity.data["status"] = json!("expired");
            self.save(&mut entity, &mut context).await?;
            return Err(unauthorized("External login ticket has expired."));
        }
        entity.data["status"] = json!("consumed");
        entity.data["consumed_at"] = json!(clock_now());
        self.save(&mut entity, &mut context).await?;
        self.audit(
            &entity,
            AuditSpec {
                event: "identity-provider.external-login.ticket-consumed",
                operator: entity.uuid("poms_user_id"),
                before: None,
                after: Some(ticket_snapshot(&entity, true)),
                metadata: None,
                result: AuditResult::Success,
                reason: None,
            },
            &mut context,
        )
        .await?;
        entity.uuid("poms_user_id").ok_or_else(ApiError::internal)
    }
    pub async fn list_bindings(
        &self,
        user_id: &str,
        context: CallContext,
    ) -> Result<Value, ApiError> {
        self.managed_user(user_id, &context).await?;
        Ok(Value::Array(
            store::select(
                &self.database,
                Table::Binding,
                vec![("poms_user_id", json!(user_id))],
                Some("created_at DESC"),
                false,
            )
            .await
            .map_err(|_| ApiError::internal())?
            .iter()
            .map(binding_summary)
            .collect(),
        ))
    }
    pub async fn bind(
        &self,
        user_id: &str,
        request: RequestData,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        self.managed_user(user_id, &context).await?;
        let config = self
            .config(&request.text("identityProviderConfigId").unwrap_or_default())
            .await?;
        assert_binding(&config)?;
        let tenant = request
            .value("tenantId")
            .filter(|v| !v.is_null())
            .unwrap_or_else(|| config.data["tenant_id"].clone());
        let subject = request.text("subjectId").unwrap_or_default();
        if self
            .one(
                Table::Binding,
                vec![
                    ("identity_provider_config_id", json!(config.id())),
                    ("tenant_id", tenant.clone()),
                    ("subject_id", json!(subject)),
                    ("status", json!("active")),
                ],
                None,
            )
            .await?
            .is_some()
        {
            let mut units = format!(
                "External subject is already bound: {}/",
                config.str("provider")
            )
            .encode_utf16()
            .collect::<Vec<_>>();
            units.extend(
                request
                    .string("tenantId")
                    .map(|v| v.as_code_units().to_vec())
                    .unwrap_or_else(|| {
                        tenant
                            .as_str()
                            .unwrap_or("default")
                            .encode_utf16()
                            .collect()
                    }),
            );
            units.push(b'/' as u16);
            units.extend(
                request
                    .string("subjectId")
                    .map(|v| v.as_code_units().to_vec())
                    .unwrap_or_else(|| subject.encode_utf16().collect()),
            );
            return Err(js_message(
                StatusCode::CONFLICT,
                JsString::from_code_units(units),
            ));
        }
        if self
            .one(
                Table::Binding,
                vec![
                    ("poms_user_id", json!(user_id)),
                    ("identity_provider_config_id", json!(config.id())),
                    ("status", json!("active")),
                ],
                None,
            )
            .await?
            .is_some()
        {
            return Err(conflict(format!(
                "POMS user {user_id} already has an active binding for identity provider config {}",
                config.id()
            )));
        }
        let mut binding = Entity::new(
            Table::Binding,
            json!({"identity_provider_config_id":config.id(),"provider":config.data["provider"],"tenant_id":tenant,"poms_user_id":user_id,"subject_id":subject,"union_id":request.value("unionId").unwrap_or(Value::Null),"subject_display_name":request.value("subjectDisplayName").unwrap_or(Value::Null),"avatar_url":request.value("avatarUrl").unwrap_or(Value::Null),"email":request.value("email").unwrap_or(Value::Null),"mobile":request.value("mobile").unwrap_or(Value::Null),"status":"active","bound_at":clock_now(),"bound_by":context.operator,"revoked_at":null,"revoked_by":null,"created_by":context.operator,"updated_by":context.operator}),
        );
        capture_binding_raw(&mut binding, &request);
        self.save(&mut binding, &mut context).await?;
        self.binding_audit("external-identity.bound", &binding, None, &mut context)
            .await?;
        Ok(binding_summary(&binding))
    }
    pub async fn unbind(
        &self,
        id: &str,
        request: RequestData,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        let mut binding = store::find(&self.database, Table::Binding, id)
            .await
            .map_err(|_| ApiError::internal())?
            .ok_or_else(|| {
                ApiError::message(
                    StatusCode::NOT_FOUND,
                    format!("External identity binding {id} not found"),
                )
            })?;
        check_version(&binding, &request, "External identity binding")?;
        if binding.str("status") != "active" {
            return Err(conflict(format!(
                "External identity binding {id} is not active"
            )));
        }
        let before = binding_snapshot(&binding);
        binding.data["status"] = json!("revoked");
        binding.data["revoked_at"] = json!(clock_now());
        binding.data["revoked_by"] = json!(context.operator);
        binding.data["updated_by"] = json!(context.operator);
        self.save(&mut binding, &mut context).await?;
        self.binding_audit(
            "external-identity.unbound",
            &binding,
            Some(before),
            &mut context,
        )
        .await?;
        Ok(binding_summary(&binding))
    }
    async fn binding_audit(
        &self,
        event: &str,
        binding: &Entity,
        before: Option<Value>,
        context: &mut CallContext,
    ) -> Result<(), ApiError> {
        self.audit(binding,AuditSpec{event,operator:context.operator,before,after:Some(binding_snapshot(binding)),metadata:Some(json!({"identityProviderConfigId":binding.data["identity_provider_config_id"],"provider":binding.data["provider"],"tenantId":binding.data["tenant_id"]})),result:AuditResult::Success,reason:None},context).await
    }
    async fn find_grant(&self, config_id: &str, user_id: &str) -> Result<Option<Entity>, ApiError> {
        self.one(
            Table::Grant,
            vec![
                ("identity_provider_config_id", json!(config_id)),
                ("poms_user_id", json!(user_id)),
            ],
            Some("updated_at DESC"),
        )
        .await
    }
    pub async fn get_grant(&self, id: &str, context: CallContext) -> Result<Value, ApiError> {
        let operator = context.operator.ok_or_else(ApiError::internal)?.to_string();
        self.managed_user(&operator, &context).await?;
        let config = self.config(id).await?;
        let grant = self.find_grant(&config.id(), &operator).await?;
        grant_summary(&config, &operator, grant.as_ref())
    }
    pub async fn authorize_grant(
        &self,
        id: &str,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        let operator = context.operator.ok_or_else(ApiError::internal)?.to_string();
        self.managed_user(&operator, &context).await?;
        let config = self.config(id).await?;
        assert_search(&config)?;
        let (state, expires) = state::create(
            &self.support.state_signer,
            &config.id(),
            Some(&operator),
            clock_now(),
        )?;
        let scopes = validate_scopes(&config, config.strings("search_scopes_json"))?;
        let url = self.adapter.build_authorize_url(
            config.str("client_id"),
            config.str("search_redirect_uri"),
            &state,
            &scopes,
        )?;
        let expires = iso(expires)?;
        self.config_audit("identity-provider.oauth-grant.authorize-started",&config,None,json!({"identityProviderConfigId":config.id(),"provider":config.data["provider"],"tenantId":config.data["tenant_id"],"stateExpiresAt":expires,"scopes":scopes}),&mut context).await?;
        Ok(json!({"authorizeUrl":url,"stateExpiresAt":expires}))
    }
    pub async fn grant_callback(
        &self,
        query: RequestData,
        mut context: CallContext,
    ) -> Result<Value, ApiError> {
        callback_code(&query, true)?;
        let state = state::verify(
            &self.support.state_signer,
            &query.text("state").unwrap_or_default(),
            true,
            clock_now().timestamp_millis(),
        )?;
        let operator = state.operator_id.unwrap_or_default();
        self.managed_user(&operator, &context).await?;
        let config = self.config(&state.config_id).await?;
        assert_search(&config)?;
        let secret = self.decrypt(config.str("encrypted_client_secret"))?;
        let token = self
            .adapter
            .exchange_code(
                config.str("client_id"),
                config.str("search_redirect_uri"),
                &secret,
                &query.text("code").unwrap_or_default(),
            )
            .await
            .map_err(|error| adapter_message(StatusCode::BAD_REQUEST, &error))?;
        let normalized = js_unique(token.scopes);
        let scopes = if normalized.is_empty() {
            validate_scopes(&config, config.strings("search_scopes_json"))?
                .into_iter()
                .map(|scope| JsString::from_code_units(scope.encode_utf16().collect()))
                .collect::<Vec<_>>()
        } else {
            if normalized.len() > 32 || normalized.iter().any(|s| s.as_code_units().len() > 128) {
                return Err(ApiError::object(
                    StatusCode::BAD_REQUEST,
                    json!({"statusCode":400,"code":"identity_provider_grant_scope_list_invalid","message":"飞书返回的授权范围超出 POMS 支持范围，无法安全保存授权结果，请调整飞书应用授权范围后重新授权。","maxScopes":32,"maxScopeLength":128}),
                ));
            }
            normalized
        };
        let existing = self.find_grant(&config.id(), &operator).await?;
        let before = existing.as_ref().map(grant_snapshot);
        let now = clock_now();
        let mut grant=existing.unwrap_or_else(||Entity::new(Table::Grant,json!({"identity_provider_config_id":config.id(),"provider":config.data["provider"],"tenant_id":config.data["tenant_id"],"poms_user_id":operator,"encrypted_access_token":"","encrypted_refresh_token":null,"scopes_json":[],"status":"active","granted_at":now,"expires_at":null,"refresh_expires_at":null,"last_used_at":null,"revoked_at":null,"last_error":null,"created_by":operator,"updated_by":operator})));
        grant.data["provider"] = config.data["provider"].clone();
        grant.data["tenant_id"] = config.data["tenant_id"].clone();
        grant.data["encrypted_access_token"] = json!(self.encrypt(&token.access_token)?);
        grant.data["encrypted_refresh_token"] = json!(
            token
                .refresh_token
                .filter(|v| !v.is_empty())
                .map(|v| self.encrypt(&v))
                .transpose()?
        );
        grant.data["scopes_json"] = json!(
            scopes
                .iter()
                .map(JsString::to_utf8_lossy)
                .collect::<Vec<_>>()
        );
        if scopes.iter().any(has_lone) {
            grant.raw_fields.insert(
                "scopes_json".into(),
                format!(
                    "[{}]",
                    scopes
                        .iter()
                        .map(JsString::json)
                        .collect::<Vec<_>>()
                        .join(",")
                ),
            );
        }
        grant.data["status"] = json!("active");
        grant.data["granted_at"] = json!(now);
        grant.data["expires_at"] = expiry(token.expires_in)?;
        grant.data["refresh_expires_at"] = expiry(token.refresh_expires_in)?;
        grant.data["revoked_at"] = Value::Null;
        grant.data["last_error"] = Value::Null;
        grant.data["updated_by"] = json!(operator);
        self.save(&mut grant, &mut context).await?;
        self.grant_audit(
            "identity-provider.oauth-grant.updated",
            &grant,
            Uuid::parse_str(&operator).ok(),
            before,
            grant_snapshot(&grant),
            &mut context,
        )
        .await?;
        grant_summary(&config, &operator, Some(&grant))
    }
    pub async fn search(
        &self,
        id: &str,
        query: RequestData,
        mut context: CallContext,
    ) -> Result<String, ApiError> {
        let operator = context.operator.ok_or_else(ApiError::internal)?.to_string();
        self.managed_user(&operator, &context).await?;
        let config = self.config(id).await?;
        assert_search(&config)?;
        let mut grant=self.find_grant(&config.id(),&operator).await?.filter(|g|grant_status(g)=="active").ok_or_else(||bad("Current admin must authorize this identity provider before searching external users."))?;
        let (scopes, valid) = grant_scope_snapshot(&grant)?;
        if !valid {
            grant.data["last_error"] = json!(INVALID_SCOPE_MESSAGE);
            grant.data["updated_by"] = json!(operator);
            self.save(&mut grant, &mut context).await?;
            return Err(ApiError::object(
                StatusCode::BAD_REQUEST,
                json!({"statusCode":400,"code":"identity_provider_grant_scope_snapshot_invalid","message":INVALID_SCOPE_MESSAGE,"provider":config.data["provider"],"identityProviderConfigId":config.id(),"requiredScopes":required(&config),"maxScopes":32,"maxScopeLength":128,"nextActions":["回到 POMS 重新发起当前管理员授权。"]}),
            ));
        }
        let required_scopes = required(&config);
        let missing_scopes = missing(&required_scopes, &scopes);
        if !missing_scopes.is_empty() {
            let message = format!(
                "当前飞书授权缺少绑定候选资料读取所需权限（{}），请在飞书开放平台开通并发布应用后重新授权。",
                missing_scopes.join(", ")
            );
            grant.data["last_error"] = json!(message);
            grant.data["updated_by"] = json!(operator);
            self.save(&mut grant, &mut context).await?;
            return Err(ApiError::object(
                StatusCode::BAD_REQUEST,
                json!({"statusCode":400,"code":"identity_provider_missing_required_scopes","message":message,"provider":config.data["provider"],"identityProviderConfigId":config.id(),"grantedScopes":scopes,"requiredScopes":required_scopes,"missingRequiredScopes":missing_scopes,"nextActions":["在飞书开放平台为当前应用开通用户搜索、通讯录基础资料、部门、邮箱和手机号读取权限。","发布飞书应用权限变更后，回到 POMS 重新发起当前管理员授权。"]}),
            ));
        }
        let q = query.text("q").unwrap_or_default();
        let access = self.decrypt(grant.str("encrypted_access_token"));
        let access = match access {
            Ok(v) => v,
            Err(error) => {
                self.search_failure(&mut grant, &operator, None, &mut context)
                    .await?;
                return Err(error);
            }
        };
        let candidates = match self
            .adapter
            .search(&access, &q, query.number("limit").unwrap_or(20.0))
            .await
        {
            Ok(v) => v,
            Err(error) => {
                self.search_failure(&mut grant, &operator, Some(&error), &mut context)
                    .await?;
                return Err(search_exception(&config, &error));
            }
        };
        let result=async{grant.data["last_used_at"]=json!(clock_now());grant.data["last_error"]=Value::Null;grant.data["updated_by"]=json!(operator);self.save(&mut grant,&mut context).await?;self.grant_audit("identity-provider.external-users.searched",&grant,Uuid::parse_str(&operator).ok(),None,json!({"identityProviderConfigId":config.id(),"provider":config.data["provider"],"tenantId":config.data["tenant_id"],"queryLength":q.encode_utf16().count(),"itemCount":candidates.len()}),&mut context).await?;
            let items=candidates.into_iter().map(|candidate|format!("{{\"identityProviderConfigId\":{},\"provider\":{},\"tenantId\":{},{} }}",json!(config.id()),config.data["provider"],config.data["tenant_id"],candidate.raw.strip_prefix('{').and_then(|v|v.strip_suffix('}')).unwrap_or(""))).collect::<Vec<_>>();let query_raw=query.string("q").map(|v|v.json()).unwrap_or_else(||json!(q).to_string());Ok::<String,ApiError>(format!("{{\"identityProviderConfigId\":{},\"provider\":{},\"tenantId\":{},\"query\":{},\"items\":[{}],\"searchedAt\":{}}}",json!(config.id()),config.data["provider"],config.data["tenant_id"],query_raw,items.join(","),json!(iso(clock_now())?)))}.await;
        match result {
            Ok(value) => Ok(value),
            Err(error) => {
                self.search_failure(&mut grant, &operator, None, &mut context)
                    .await?;
                Err(error)
            }
        }
    }
    async fn search_failure(
        &self,
        grant: &mut Entity,
        operator: &str,
        error: Option<&AdapterError>,
        context: &mut CallContext,
    ) -> Result<(), ApiError> {
        grant.data["last_error"] = json!(search_failure_message(error));
        grant.data["updated_by"] = json!(operator);
        self.save(grant, context).await
    }
}

const INVALID_SCOPE_MESSAGE: &str = "当前飞书授权范围快照异常，请重新授权后再搜索用户。";
fn callback_code(query: &RequestData, admin: bool) -> Result<(), ApiError> {
    let failure = |message: String| {
        if admin {
            bad(message)
        } else {
            unauthorized(message)
        }
    };
    if let Some(error) = query.string("error") {
        let mut units = error.as_code_units().to_vec();
        if let Some(description) = query.string("error_description") {
            units.extend(": ".encode_utf16());
            units.extend_from_slice(description.as_code_units());
        }
        return Err(js_message(
            if admin {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::UNAUTHORIZED
            },
            JsString::from_code_units(units),
        ));
    }
    if query.text("code").is_none() {
        return Err(failure(
            "Provider OAuth callback requires an authorization code.".into(),
        ));
    }
    Ok(())
}
fn js_message(status: StatusCode, message: JsString) -> ApiError {
    ApiError::raw_json(
        status,
        format!(
            "{{\"statusCode\":{},\"message\":{},\"error\":{}}}",
            status.as_u16(),
            message.json(),
            json!(status.canonical_reason().unwrap_or("Error"))
        ),
    )
}
fn adapter_message(status: StatusCode, error: &AdapterError) -> ApiError {
    error.message_raw.clone().map_or_else(
        || ApiError::message(status, error.message.clone()),
        |message| js_message(status, *message),
    )
}
fn expiry(seconds: Option<f64>) -> Result<Value, ApiError> {
    let Some(seconds) = seconds.filter(|v| *v > 0.0) else {
        return Ok(Value::Null);
    };
    let ms = clock_now().timestamp_millis() as f64 + seconds * 1000.0;
    if !ms.is_finite() || ms.abs() > 8_640_000_000_000_000.0 {
        return Err(ApiError::internal());
    }
    let date = DateTime::from_timestamp_millis(ms.trunc() as i64).ok_or_else(ApiError::internal)?;
    Ok(json!(date))
}
fn ticket_snapshot(entity: &Entity, consumed: bool) -> Value {
    let mut value = projection(
        entity,
        &[
            ("identityProviderConfigId", "identity_provider_config_id"),
            ("provider", "provider"),
            ("tenantId", "tenant_id"),
            ("externalIdentityId", "external_identity_id"),
            ("pomsUserId", "poms_user_id"),
            ("subjectId", "subject_id"),
        ],
    );
    value[if consumed { "consumedAt" } else { "expiresAt" }] = time(
        entity,
        if consumed {
            "consumed_at"
        } else {
            "expires_at"
        },
    );
    value["ticketRedacted"] = json!(true);
    value
}
fn binding_snapshot(entity: &Entity) -> Value {
    projection(
        entity,
        &[
            ("identityProviderConfigId", "identity_provider_config_id"),
            ("provider", "provider"),
            ("tenantId", "tenant_id"),
            ("pomsUserId", "poms_user_id"),
            ("subjectId", "subject_id"),
            ("unionId", "union_id"),
            ("subjectDisplayName", "subject_display_name"),
            ("email", "email"),
            ("mobile", "mobile"),
            ("status", "status"),
            ("boundAt", "bound_at"),
            ("boundBy", "bound_by"),
            ("revokedAt", "revoked_at"),
            ("revokedBy", "revoked_by"),
            ("rowVersion", "row_version"),
        ],
    )
}
fn binding_summary(entity: &Entity) -> Value {
    let mut value = binding_snapshot(entity);
    for (key, column) in [
        ("id", "id"),
        ("avatarUrl", "avatar_url"),
        ("createdBy", "created_by"),
        ("updatedBy", "updated_by"),
    ] {
        value[key] = entity.data[column].clone();
    }
    value["createdAt"] = time(entity, "created_at");
    value["updatedAt"] = time(entity, "updated_at");
    value
}
fn grant_snapshot(entity: &Entity) -> Value {
    let mut value = projection(
        entity,
        &[
            ("identityProviderConfigId", "identity_provider_config_id"),
            ("provider", "provider"),
            ("tenantId", "tenant_id"),
            ("pomsUserId", "poms_user_id"),
            ("scopes", "scopes_json"),
            ("grantedAt", "granted_at"),
            ("expiresAt", "expires_at"),
            ("refreshExpiresAt", "refresh_expires_at"),
            ("lastUsedAt", "last_used_at"),
            ("lastError", "last_error"),
            ("rowVersion", "row_version"),
        ],
    );
    value["status"] = json!(grant_status(entity));
    value["tokenRedacted"] = json!(true);
    value
}
fn grant_summary(
    config: &Entity,
    operator: &str,
    grant: Option<&Entity>,
) -> Result<Value, ApiError> {
    let (scopes, valid) = grant
        .map(grant_scope_snapshot)
        .transpose()?
        .unwrap_or((vec![], true));
    let scopes = if valid { scopes } else { vec![] };
    let required = required(config);
    let mut value = json!({"id":grant.map(Entity::id),"identityProviderConfigId":config.id(),"provider":config.data["provider"],"tenantId":config.data["tenant_id"],"pomsUserId":operator,"status":grant.map(grant_status).unwrap_or("missing"),"scopes":scopes,"requiredScopes":required,"missingRequiredScopes":missing(&required,&scopes),"rowVersion":grant.map(Entity::version),"lastError":if !valid{json!(INVALID_SCOPE_MESSAGE)}else{grant.map(|v|v.data["last_error"].clone()).unwrap_or(Value::Null)}});
    for (key, column) in [
        ("grantedAt", "granted_at"),
        ("expiresAt", "expires_at"),
        ("refreshExpiresAt", "refresh_expires_at"),
        ("lastUsedAt", "last_used_at"),
        ("updatedAt", "updated_at"),
    ] {
        value[key] = grant.map(|g| time(g, column)).unwrap_or(Value::Null);
    }
    Ok(value)
}
fn denied(error: &AdapterError) -> bool {
    error.provider_code == Some(99991679.0)
        || error
            .provider_message
            .as_ref()
            .is_some_and(|s| s.to_lowercase() == "unauthorized")
}
fn search_failure_message(error: Option<&AdapterError>) -> String {
    if let Some(error) = error {
        if denied(error) {
            return "飞书拒绝了用户搜索或候选资料读取请求，请确认已开通并发布所需权限后重新授权。"
                .into();
        }
        if let Some(log) = &error.provider_log_id {
            return format!(
                "飞书用户搜索或候选资料补全失败，请稍后重试；如持续失败，请使用飞书 log_id {log} 在开放平台排查。"
            );
        }
    }
    "飞书用户搜索或候选资料补全失败，请稍后重试或检查企业协同接入配置。".into()
}
fn search_exception(config: &Entity, error: &AdapterError) -> ApiError {
    let next = if denied(error) {
        vec![
            "在飞书开放平台确认已开通用户搜索、通讯录基础资料、部门、邮箱和手机号读取权限。",
            "发布飞书应用权限变更后，回到 POMS 重新授权当前管理员。",
            "如仍失败，可使用飞书 log_id 在开放平台排查。",
        ]
    } else if error.provider_log_id.is_some() {
        vec![
            "稍后重试；如持续失败，请检查企业协同接入配置。",
            "可使用飞书 log_id 在开放平台排查。",
        ]
    } else {
        vec!["稍后重试；如持续失败，请检查企业协同接入配置。"]
    };
    let value = json!({"statusCode":400,"code":if denied(error){"identity_provider_search_permission_denied"}else{"identity_provider_external_user_search_failed"},"message":search_failure_message(Some(error)),"provider":config.data["provider"],"identityProviderConfigId":config.id(),"providerCode":error.provider_code,"providerMessage":error.provider_message,"providerLogId":error.provider_log_id,"requiredScopes":required(config),"nextActions":next});
    let mut raw = std::collections::BTreeMap::new();
    if let Some(message) = &error.provider_message_raw {
        raw.insert("providerMessage".into(), message.json());
    }
    if let Some(log) = &error.provider_log_id_raw {
        raw.insert("providerLogId".into(), log.json());
        if !denied(error) {
            let mut units =
                "飞书用户搜索或候选资料补全失败，请稍后重试；如持续失败，请使用飞书 log_id "
                    .encode_utf16()
                    .collect::<Vec<_>>();
            units.extend_from_slice(log.as_code_units());
            units.extend(" 在开放平台排查。".encode_utf16());
            raw.insert("message".into(), JsString::from_code_units(units).json());
        }
    }
    if raw.is_empty() {
        ApiError::object(StatusCode::BAD_REQUEST, value)
    } else {
        ApiError::raw_json(
            StatusCode::BAD_REQUEST,
            super::adapter::render(&value, &raw),
        )
    }
}

fn check_version(entity: &Entity, request: &RequestData, label: &str) -> Result<(), ApiError> {
    if let Some(expected) = request.number("expectedVersion")
        && expected != entity.version() as f64
    {
        return Err(conflict(format!(
            "{label} version conflict: expected {}, actual {}",
            crate::compat::scalars::js_number_string(expected),
            entity.version()
        )));
    }
    Ok(())
}
fn projection(entity: &Entity, fields: &[(&str, &str)]) -> Value {
    let mut result = serde_json::Map::new();
    for (key, column) in fields {
        result.insert(
            (*key).into(),
            if column.ends_with("_at") {
                time(entity, column)
            } else {
                entity.data[*column].clone()
            },
        );
    }
    Value::Object(result)
}
fn config_snapshot(entity: &Entity) -> Value {
    let mut result = projection(
        entity,
        &[
            ("provider", "provider"),
            ("tenantId", "tenant_id"),
            ("displayName", "display_name"),
            ("status", "status"),
            ("enabled", "enabled"),
            ("loginEnabled", "login_enabled"),
            ("bindingEnabled", "binding_enabled"),
            ("searchEnabled", "search_enabled"),
            ("clientId", "client_id"),
            ("redirectUri", "redirect_uri"),
            ("searchRedirectUri", "search_redirect_uri"),
            ("loginScopes", "login_scopes_json"),
            ("searchScopes", "search_scopes_json"),
            ("tenantAllowlist", "tenant_allowlist_json"),
            ("searchGrantMode", "search_grant_mode"),
            ("rowVersion", "row_version"),
        ],
    );
    result["secretConfigured"] = json!(nonempty(entity, "encrypted_client_secret"));
    result
}
fn detail(entity: &Entity) -> Value {
    let mut value = config_snapshot(entity);
    for (key, column) in [
        ("id", "id"),
        ("createdBy", "created_by"),
        ("updatedBy", "updated_by"),
    ] {
        value[key] = entity.data[column].clone();
    }
    value["createdAt"] = time(entity, "created_at");
    value["updatedAt"] = time(entity, "updated_at");
    value
}
fn diagnostic(key: &str, label: &str, status: &str, message: &str) -> Value {
    json!({"key":key,"label":label,"status":status,"message":message})
}
fn check(key: &str, label: &str, passed: bool, message: &str) -> Value {
    diagnostic(
        key,
        label,
        if passed { "passed" } else { "failed" },
        message,
    )
}
fn failed(checks: &[Value]) -> Option<&Value> {
    checks.iter().find(|v| v["status"] == "failed")
}
fn connection_failure(checks: &[Value]) -> String {
    failed(checks).map_or_else(
        || "组织同步可用性检查未通过。".into(),
        |v| {
            format!(
                "组织同步可用性检查未通过：{}",
                v["message"].as_str().unwrap_or("")
            )
        },
    )
}
fn connection_result(
    capability: &str,
    checks: Vec<Value>,
    message: String,
    actions: Vec<String>,
) -> Result<Value, ApiError> {
    Ok(
        json!({"status":if failed(&checks).is_some(){"failed"}else{"success"},"capability":capability,"message":message,"checkedAt":iso(clock_now())?,"checks":checks,"nextActions":actions}),
    )
}
fn next_actions(checks: &[Value]) -> Vec<String> {
    let keys = checks
        .iter()
        .filter(|v| v["status"] == "failed")
        .filter_map(|v| v["key"].as_str())
        .collect::<HashSet<_>>();
    [
        ("enabled", "在企业协同接入中启用总开关并保存。"),
        (
            "configStatus",
            "完善 Client Secret 或已启用能力的回调地址，使接入状态恢复为已激活。",
        ),
        (
            "clientCredentials",
            "填写或重新填写飞书应用的 Client ID 和 Client Secret 后保存。",
        ),
        (
            "tenantAccessToken",
            "检查飞书应用凭证是否正确，并确认应用已发布。",
        ),
        (
            "departmentReadAccess",
            "在飞书开放平台开通应用身份通讯录部门读取权限，并发布应用后重试。",
        ),
        ("provider", "当前组织同步诊断仅支持飞书接入配置。"),
    ]
    .into_iter()
    .filter(|(key, _)| keys.contains(key))
    .map(|(_, text)| text.into())
    .collect()
}
fn redact_diagnostic(message: &str) -> String {
    let keys = [
        "tenant_access_token",
        "app_secret",
        "client_secret",
        "access_token",
        "refresh_token",
    ];
    let mut output = String::new();
    let chars = message.chars().collect::<Vec<_>>();
    let mut index = 0;
    while index < chars.len() {
        let start = index;
        let quote = if matches!(chars[index], '\'' | '"') {
            let q = Some(chars[index]);
            index += 1;
            q
        } else {
            None
        };
        let mut replaced = false;
        for key in keys {
            let end = index + key.len();
            if end > chars.len()
                || !chars[index..end]
                    .iter()
                    .collect::<String>()
                    .eq_ignore_ascii_case(key)
            {
                continue;
            }
            let mut cursor = end;
            if let Some(q) = quote {
                if chars.get(cursor) != Some(&q) {
                    continue;
                }
                cursor += 1;
            }
            while chars.get(cursor).is_some_and(|c| js_whitespace(*c)) {
                cursor += 1;
            }
            let Some(separator) = chars
                .get(cursor)
                .copied()
                .filter(|c| matches!(c, ':' | '='))
            else {
                continue;
            };
            cursor += 1;
            while chars.get(cursor).is_some_and(|c| js_whitespace(*c)) {
                cursor += 1;
            }
            let value_quote = chars
                .get(cursor)
                .copied()
                .filter(|c| matches!(c, '\'' | '"'));
            if value_quote.is_some() {
                cursor += 1;
            }
            let value_start = cursor;
            while chars.get(cursor).is_some_and(|c| {
                !js_whitespace(*c) && !matches!(c, '\'' | '"' | ',' | '，' | ')' | '}' | ']')
            }) {
                cursor += 1;
            }
            if cursor == value_start {
                continue;
            }
            if let Some(q) = value_quote {
                if chars.get(cursor) != Some(&q) {
                    continue;
                }
                cursor += 1;
            }
            output.extend(chars[start..end + usize::from(quote.is_some())].iter());
            output.push(separator);
            if let Some(q) = value_quote {
                output.push(q);
            }
            output.push_str("<redacted>");
            if let Some(q) = value_quote {
                output.push(q);
            }
            index = cursor;
            replaced = true;
            break;
        }
        if replaced {
            continue;
        }
        index = start;
        let tail = chars[index..].iter().collect::<String>();
        if tail.len() >= 6
            && tail
                .get(..6)
                .is_some_and(|v| v.eq_ignore_ascii_case("Bearer"))
            && (index == 0 || !chars[index - 1].is_ascii_alphanumeric() && chars[index - 1] != '_')
        {
            let mut cursor = index + 6;
            let first = cursor;
            while chars.get(cursor).is_some_and(|c| js_whitespace(*c)) {
                cursor += 1;
            }
            if cursor > first && chars.get(cursor).is_some_and(|c| !js_whitespace(*c)) {
                while chars.get(cursor).is_some_and(|c| !js_whitespace(*c)) {
                    cursor += 1;
                }
                output.push_str("Bearer <redacted>");
                index = cursor;
                continue;
            }
        }
        output.push(chars[index]);
        index += 1;
    }
    output
}
fn js_whitespace(c: char) -> bool {
    matches!(c as u32,0x0009..=0x000d|0x0020|0x00a0|0x1680|0x2000..=0x200a|0x2028|0x2029|0x202f|0x205f|0x3000|0xfeff)
}
fn has_lone(value: &JsString) -> bool {
    char::decode_utf16(value.as_code_units().iter().copied()).any(|v| v.is_err())
}
fn js_unique(values: Vec<JsString>) -> Vec<JsString> {
    let mut output = Vec::new();
    for value in values {
        let value = super::validation::trim_js(value);
        if !value.is_empty() && !output.contains(&value) {
            output.push(value);
        }
    }
    output
}
fn preserve_text(entity: &mut Entity, request: &RequestData, field: &str, column: &str) {
    if let Some(value) = request.string(field)
        && has_lone(&value)
    {
        entity.raw_fields.insert(column.into(), value.json());
    }
}
fn preserve_array(
    entity: &mut Entity,
    request: &RequestData,
    field: &str,
    column: &str,
    dedupe: bool,
    remove_required: bool,
) {
    let values = request.js_strings(field);
    let mut values = if dedupe { js_unique(values) } else { values };
    if remove_required {
        values.retain(|v| !REQUIRED.iter().any(|required| v.eq_ascii(required)));
    }
    if values.iter().any(has_lone) {
        entity.raw_fields.insert(
            column.into(),
            format!(
                "[{}]",
                values
                    .iter()
                    .map(JsString::json)
                    .collect::<Vec<_>>()
                    .join(",")
            ),
        );
    }
}
fn capture_config_raw(entity: &mut Entity, request: &RequestData) {
    for (field, column) in [
        ("tenantId", "tenant_id"),
        ("displayName", "display_name"),
        ("clientId", "client_id"),
        ("redirectUri", "redirect_uri"),
        ("searchRedirectUri", "search_redirect_uri"),
    ] {
        preserve_text(entity, request, field, column);
    }
    let remove_required = entity.boolean("search_enabled") && entity.str("provider") == "feishu";
    preserve_array(
        entity,
        request,
        "loginScopes",
        "login_scopes_json",
        true,
        false,
    );
    preserve_array(
        entity,
        request,
        "searchScopes",
        "search_scopes_json",
        true,
        remove_required,
    );
    preserve_array(
        entity,
        request,
        "tenantAllowlist",
        "tenant_allowlist_json",
        false,
        false,
    );
}
fn capture_binding_raw(entity: &mut Entity, request: &RequestData) {
    for (field, column) in [
        ("tenantId", "tenant_id"),
        ("subjectId", "subject_id"),
        ("unionId", "union_id"),
        ("subjectDisplayName", "subject_display_name"),
        ("avatarUrl", "avatar_url"),
        ("email", "email"),
        ("mobile", "mobile"),
    ] {
        preserve_text(entity, request, field, column);
    }
}
fn raw_snapshot(entity: &Entity, snapshot: &Value) -> Option<String> {
    if entity.raw_fields.is_empty() {
        return None;
    }
    let object = snapshot.as_object()?;
    let mut changed = false;
    let mut fields = Vec::new();
    for (key, value) in object {
        let mut column = String::new();
        for c in key.chars() {
            if c.is_ascii_uppercase() {
                column.push('_');
                column.push(c.to_ascii_lowercase());
            } else {
                column.push(c);
            }
        }
        if [
            "login_scopes",
            "search_scopes",
            "tenant_allowlist",
            "scopes",
        ]
        .contains(&column.as_str())
        {
            column.push_str("_json");
        }
        let raw = if let Some(raw) = entity.raw_fields.get(&column) {
            changed = true;
            raw.clone()
        } else {
            value.to_string()
        };
        fields.push(format!("{}:{raw}", json!(key)));
    }
    changed.then(|| format!("{{{}}}", fields.join(",")))
}
fn validate_raw_search_scopes(config: &Entity, request: &RequestData) -> Result<(), ApiError> {
    let values = request.js_strings("searchScopes");
    if !values.iter().any(has_lone) {
        return Ok(());
    }
    let mut effective = required(config)
        .iter()
        .map(|v| JsString::from_code_units(v.encode_utf16().collect()))
        .collect::<Vec<_>>();
    effective.extend(values);
    let effective = js_unique(effective);
    let required = required(config);
    if effective.len() > 32 {
        let hint = if required.is_empty() {
            "请减少额外 Search scopes。".into()
        } else {
            format!(
                "POMS 会自动请求 {}，请减少额外 Search scopes。",
                required.join(", ")
            )
        };
        return Err(ApiError::object(
            StatusCode::BAD_REQUEST,
            json!({"statusCode":400,"code":"identity_provider_search_scope_capacity_exceeded","message":format!("用户搜索最终授权范围最多支持 32 项。{hint}"),"maxScopes":32,"requiredScopes":required,"effectiveScopeCount":effective.len(),"maxAdditionalScopes":32-required.len()}),
        ));
    }
    if effective.iter().any(|v| v.as_code_units().len() > 128) {
        return Err(ApiError::object(
            StatusCode::BAD_REQUEST,
            json!({"statusCode":400,"code":"identity_provider_search_scope_invalid","message":"用户搜索授权范围单项不能超过 128 个字符。","maxScopeLength":128}),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_identity_domain_audits_keep_original_null_request_id() {
        for table in [Table::Config, Table::Binding, Table::Grant, Table::Ticket] {
            let entity = Entity::new(table, json!({"id":"synthetic-domain-target"}));
            let input = identity_audit_input(
                &entity,
                AuditSpec {
                    event: "synthetic-domain-event",
                    operator: None,
                    before: None,
                    after: None,
                    metadata: None,
                    result: AuditResult::Success,
                    reason: None,
                },
            );
            assert!(input.request_id.is_none());
        }
    }
    use axum::response::IntoResponse;
    fn entity(config: &Value) -> Entity {
        let mut data = serde_json::Map::new();
        for (key, value) in config.as_object().into_iter().flatten() {
            let mut column = String::new();
            for c in key.chars() {
                if c.is_ascii_uppercase() {
                    column.push('_');
                    column.push(c.to_ascii_lowercase());
                } else {
                    column.push(c);
                }
            }
            if ["login_scopes", "search_scopes", "tenant_allowlist"].contains(&column.as_str()) {
                column.push_str("_json");
            }
            data.insert(column, value.clone());
        }
        Entity {
            table: Table::Config,
            data: Value::Object(data),
            original: None,
            raw_fields: Default::default(),
        }
    }
    #[tokio::test]
    async fn source_bound_status_projection_scope_and_diagnostic_helpers() {
        let corpus: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/g-behavior.json"))
                .unwrap_or(Value::Null);
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let method = case["method"].as_str().unwrap_or("");
            let args = case["args"].as_array().map(Vec::as_slice).unwrap_or(&[]);
            let result: Result<Value, ApiError> = match method {
                "hasMinimumActiveConfig" => Ok(json!(minimum(&entity(&args[0])))),
                "normalizeConfigStatus" => {
                    let mut config = entity(&args[0]);
                    let previous = config.str("status").to_owned();
                    normalize_status(&mut config, &previous);
                    assert_eq!(
                        config.data["status"], case["expected"]["mutated"]["status"],
                        "{}",
                        case["name"]
                    );
                    continue;
                }
                "toDetail" => Ok(detail(&entity(&args[0]))),
                "auditSnapshot" => Ok(config_snapshot(&entity(&args[0]))),
                "assertBindingAllowed" => assert_binding(&entity(&args[0])).map(|_| Value::Null),
                "assertLoginAllowed" => assert_login(&entity(&args[0])).map(|_| Value::Null),
                "assertSearchGrantAllowed" => assert_search(&entity(&args[0])).map(|_| Value::Null),
                "validateSearchGrantScopes" => {
                    let config = Entity::new(
                        Table::Config,
                        json!({"provider":args[0],"search_enabled":args[1]}),
                    );
                    let values = args[2]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(|v| v.as_str().map(str::to_owned))
                        .collect();
                    validate_scopes(&config, values).map(|v| json!(v))
                }
                "normalizeOAuthGrantScopeSnapshot" => {
                    if args[0].is_null() {
                        Err(ApiError::internal())
                    } else {
                        let grant = Entity::new(Table::Grant, json!({"scopes_json":args[0]}));
                        grant_scope_snapshot(&grant)
                            .map(|(scopes, is_valid)| json!({"scopes":scopes,"isValid":is_valid}))
                    }
                }
                "redactDiagnosticSecrets" => {
                    Ok(json!(redact_diagnostic(args[0].as_str().unwrap_or(""))))
                }
                "toOAuthGrantSummary" => {
                    grant_summary(&entity(&args[0]), args[1].as_str().unwrap_or(""), None)
                }
                _ => continue,
            };
            if case["expected"]["success"] == true {
                let value = result.unwrap_or_else(|_| {
                    panic!("source helper {} {}", case["method"], case["name"])
                });
                if let Some(expected) = case["expected"].get("result") {
                    assert_eq!(&value, expected, "{} {}", case["method"], case["name"]);
                }
            } else {
                let response = result
                    .err()
                    .unwrap_or_else(|| {
                        panic!("helper must reject {} {}", case["method"], case["name"])
                    })
                    .into_response();
                assert_eq!(
                    response.status().as_u16() as u64,
                    case["expected"]["status"].as_u64().unwrap_or(500)
                );
                if case["expected"]["status"].is_number() {
                    let bytes = axum::body::to_bytes(response.into_body(), 100000)
                        .await
                        .unwrap_or_default();
                    let actual: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                    let expected = &case["expected"]["response"];
                    if expected.is_object() {
                        assert_eq!(&actual, expected, "{} {}", case["method"], case["name"]);
                    } else {
                        assert_eq!(&actual["message"], expected);
                    }
                }
            }
        }
    }
}
