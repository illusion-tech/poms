use std::{
    collections::{HashMap, HashSet},
    error::Error,
    fmt,
};

use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    core,
    directory::{DirectoryAdapter, DirectoryError, root_id},
    model::{self, Diff, Mapping, Meta, Org, ReviewContext, Run, Source},
    store::{self, Change, Changes, RawJsonColumn},
};
use crate::{
    auth::{
        audit::{AuditLogInput, AuditResult},
        model::{SessionFlush, clock_now},
    },
    database::{Database, DbError},
    provider_support::{ProviderRuntimeConfig, ProviderSupport, read_provider_runtime_config},
};

#[derive(Debug)]
pub enum ExternalOrgSyncError {
    BadRequest(String),
    Conflict(String),
    NotFound(String),
    Directory(DirectoryError),
    Database(DbError),
    Internal,
}
impl fmt::Display for ExternalOrgSyncError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::BadRequest(value) | Self::Conflict(value) | Self::NotFound(value) => value,
            Self::Directory(value) => &value.message,
            Self::Database(_) => "External org sync persistence failed.",
            Self::Internal => "External org sync operation failed.",
        })
    }
}
impl Error for ExternalOrgSyncError {}
impl From<DbError> for ExternalOrgSyncError {
    fn from(value: DbError) -> Self {
        Self::Database(value)
    }
}
impl From<DirectoryError> for ExternalOrgSyncError {
    fn from(value: DirectoryError) -> Self {
        Self::Directory(value)
    }
}
type Result<T> = std::result::Result<T, ExternalOrgSyncError>;
type E = ExternalOrgSyncError;

#[derive(Clone)]
pub struct ExternalOrgSyncService {
    database: Database,
    support: ProviderSupport,
    directory: DirectoryAdapter,
}
impl ExternalOrgSyncService {
    pub fn new(database: Database, support: ProviderSupport) -> Self {
        let directory = DirectoryAdapter::new(support.clone());
        Self {
            database,
            support,
            directory,
        }
    }
    pub async fn list_sources(&self, query: Value) -> Result<Value> {
        Ok(json!(
            store::sources(&self.database, query)
                .await?
                .iter()
                .map(Source::detail)
                .collect::<Vec<_>>()
        ))
    }
    pub async fn get_source(&self, id: &str) -> Result<Value> {
        Ok(self.require_source(id).await?.detail())
    }
    pub async fn create_source(
        &self,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let provider = string(&request, "provider");
        let tenant = optional(&request, "externalTenantId");
        if store::source_by_tenant(&self.database, &provider, tenant.as_deref())
            .await?
            .is_some()
        {
            return Err(E::Conflict(format!(
                "External org source already exists for provider {provider} and tenant {}",
                tenant.as_deref().unwrap_or("<default>")
            )));
        }
        let config = self
            .optional_config(optional(&request, "providerConfigId").as_deref())
            .await?;
        matches_config(&provider, config.as_ref())?;
        let root = self
            .optional_org(optional(&request, "authoritativeOrgUnitId").as_deref())
            .await?;
        let source = Source {
            meta: Meta::new(actor),
            provider,
            external_tenant_id: tenant,
            display_name: string(&request, "displayName"),
            status: "draft".into(),
            provider_config_id: config.map(|config| config.id),
            authoritative_org_unit_id: root.map(|org| org.meta.id),
            external_root_department_id: optional(&request, "externalRootDepartmentId"),
            sync_scopes: request
                .get("syncScopes")
                .cloned()
                .unwrap_or_else(|| json!([])),
        };
        let changes = self
            .flush(
                Changes {
                    sources: vec![Change::new(source)],
                    raw_json_columns: raw_column(
                        &request,
                        "syncScopes",
                        "external_org_source",
                        0,
                        "sync_scopes_json",
                    ),
                    ..Default::default()
                },
                pending,
            )
            .await?;
        let source = &changes.sources[0].after;
        self.audit_source("external-org-source.created", source, &request, actor, None)
            .await?;
        Ok(source.detail())
    }
    pub async fn update_source(
        &self,
        id: &str,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let mut source = self.require_source(id).await?;
        editable(&source)?;
        version(
            "External org source",
            request.get("expectedVersion"),
            source.meta.row_version,
        )?;
        let before = source.clone();
        let snapshot = source.audit();
        if request.get("displayName").is_some() {
            source.display_name = string(&request, "displayName");
        }
        let mut config = None;
        if request.get("providerConfigId").is_some() {
            config = self
                .optional_config(optional(&request, "providerConfigId").as_deref())
                .await?;
            matches_config(&source.provider, config.as_ref())?;
            source.provider_config_id = config.as_ref().map(|config| config.id);
        }
        if request.get("authoritativeOrgUnitId").is_some() {
            source.authoritative_org_unit_id = self
                .optional_org(optional(&request, "authoritativeOrgUnitId").as_deref())
                .await?
                .map(|org| org.meta.id);
        }
        if request.get("externalRootDepartmentId").is_some() {
            source.external_root_department_id = optional(&request, "externalRootDepartmentId");
        }
        if let Some(scopes) = request.get("syncScopes") {
            source.sync_scopes = scopes.clone();
        }
        source.meta.updated_by = actor;
        if source.status == "active" && request.get("providerConfigId").is_none() {
            config = self
                .optional_config(
                    source
                        .provider_config_id
                        .map(|id| id.to_string())
                        .as_deref(),
                )
                .await?;
        }
        source_state(&source, config.as_ref())?;
        let changes = self
            .flush(
                Changes {
                    sources: vec![Change {
                        before: Some(before),
                        after: source,
                    }],
                    raw_json_columns: raw_column(
                        &request,
                        "syncScopes",
                        "external_org_source",
                        0,
                        "sync_scopes_json",
                    ),
                    ..Default::default()
                },
                pending,
            )
            .await?;
        let source = &changes.sources[0].after;
        self.audit_source(
            "external-org-source.updated",
            source,
            &request,
            actor,
            Some(snapshot),
        )
        .await?;
        Ok(source.detail())
    }
    pub async fn source_command(
        &self,
        id: &str,
        command: &str,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let mut source = self.require_source(id).await?;
        version(
            "External org source",
            request.get("expectedVersion"),
            source.meta.row_version,
        )?;
        let before = source.clone();
        let snapshot = source.audit();
        let event = match command {
            "activate" => {
                if source.status == "archived" {
                    return Err(E::BadRequest(
                        "Archived external org sources cannot be activated.".into(),
                    ));
                }
                let config = self
                    .optional_config(
                        source
                            .provider_config_id
                            .map(|id| id.to_string())
                            .as_deref(),
                    )
                    .await?;
                source.status = "active".into();
                source.meta.updated_by = actor;
                source_state(&source, config.as_ref())?;
                "external-org-source.activated"
            }
            "pause" => {
                if source.status != "active" {
                    return Err(E::BadRequest(
                        "Only active external org sources can be paused.".into(),
                    ));
                }
                source.status = "paused".into();
                "external-org-source.paused"
            }
            "archive" => {
                if source.status == "active" {
                    return Err(E::BadRequest(
                        "Active external org sources must be paused before archiving.".into(),
                    ));
                }
                if source.status == "archived" {
                    return Ok(source.detail());
                }
                source.status = "archived".into();
                "external-org-source.archived"
            }
            _ => return Err(E::Internal),
        };
        source.meta.updated_by = actor;
        let changes = self
            .flush(
                Changes {
                    sources: vec![Change {
                        before: Some(before),
                        after: source,
                    }],
                    ..Default::default()
                },
                pending,
            )
            .await?;
        let source = &changes.sources[0].after;
        self.write_audit(
            AuditLogInput {
                event_type: event.into(),
                target_type: "ExternalOrgSource".into(),
                target_id: source.meta.id.to_string(),
                operator_id: actor,
                before_snapshot: Some(snapshot),
                after_snapshot: Some(source.audit()),
                ..Default::default()
            },
            None,
        )
        .await?;
        Ok(source.detail())
    }
    pub async fn list_mappings(&self, source_id: &str, query: Value) -> Result<Value> {
        self.require_source(source_id).await?;
        let mappings = store::mappings(&self.database, source_id, query.clone()).await?;
        let contexts = if mappings.is_empty() {
            Vec::new()
        } else {
            store::review_contexts(
                &self.database,
                source_id,
                mappings
                    .iter()
                    .map(|mapping| mapping.external_department_id.clone())
                    .collect(),
            )
            .await?
        };
        let mut latest = HashMap::<String, &ReviewContext>::new();
        for context in &contexts {
            latest
                .entry(context.item.external_department_id.clone())
                .or_insert(context);
        }
        let search =
            optional(&query, "search").map(|value| lower(crate::auth::cookie::trim_js(&value)));
        let review = optional(&query, "reviewState");
        let values = mappings
            .iter()
            .map(|mapping| mapping.summary(latest.get(&mapping.external_department_id).copied()))
            .filter(|summary| {
                if review
                    .as_ref()
                    .is_some_and(|review| summary["reviewState"].as_str() != Some(review))
                {
                    return false;
                }
                let Some(search) = &search else {
                    return true;
                };
                [
                    "externalDepartmentName",
                    "externalDepartmentId",
                    "externalParentDepartmentId",
                    "conflictReason",
                    "orgUnitId",
                ]
                .iter()
                .filter_map(|key| summary[*key].as_str())
                .filter(|value| !crate::auth::cookie::trim_js(value).is_empty())
                .any(|value| lower(value).contains(search))
            })
            .collect::<Vec<_>>();
        Ok(json!(values))
    }
    pub async fn replace_mappings(
        &self,
        source_id: &str,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let source = self.require_source(source_id).await?;
        editable(&source)?;
        version(
            "External org source",
            request.get("expectedSourceVersion"),
            source.meta.row_version,
        )?;
        let items = request["items"].as_array().ok_or(E::Internal)?;
        let mut seen = HashSet::new();
        for item in items {
            let external = string(item, "externalDepartmentId");
            if !seen.insert(external.clone()) {
                return Err(E::Conflict(format!(
                    "Duplicate external department id: {external}"
                )));
            }
            if optional(item, "status").as_deref() == Some("mapped")
                && optional(item, "orgUnitId").is_none()
            {
                return Err(E::BadRequest(format!(
                    "Mapped external department {external} requires orgUnitId."
                )));
            }
        }
        let mut ids = Vec::new();
        for item in items {
            if let Some(id) = optional(item, "orgUnitId")
                && !ids.contains(&id)
            {
                ids.push(id);
            }
        }
        let orgs = store::orgs_by_ids(&self.database, ids.clone()).await?;
        let found: HashSet<_> = orgs.iter().map(|org| org.meta.id.to_string()).collect();
        let missing: Vec<_> = ids
            .iter()
            .filter(|id| !found.contains(*id))
            .cloned()
            .collect();
        if !missing.is_empty() {
            return Err(E::BadRequest(format!(
                "OrgUnit not found: {}",
                missing.join(", ")
            )));
        }
        let existing = store::mappings(&self.database, source_id, json!({})).await?;
        let before = json!({"sourceId":source_id,"itemCount":existing.len(),"items":existing.iter().map(Mapping::audit).collect::<Vec<_>>()});
        let now = clock_now();
        let next = items
            .iter()
            .map(|item| {
                let org = optional(item, "orgUnitId").and_then(|id| id.parse().ok());
                Mapping {
                    meta: Meta::new(actor),
                    source_id: source.meta.id,
                    external_department_id: string(item, "externalDepartmentId"),
                    external_parent_department_id: optional(item, "externalParentDepartmentId"),
                    external_department_name: string(item, "externalDepartmentName"),
                    org_unit_id: org,
                    status: optional(item, "status").unwrap_or_else(|| {
                        if org.is_some() { "mapped" } else { "unmapped" }.into()
                    }),
                    external_snapshot: item
                        .get("externalSnapshot")
                        .cloned()
                        .unwrap_or_else(|| json!({})),
                    last_seen_at: Some(now),
                }
            })
            .collect::<Vec<_>>();
        let changes = self
            .flush(
                Changes {
                    delete_mapping_ids: existing.iter().map(|mapping| mapping.meta.id).collect(),
                    early_delete_mapping_ids: existing
                        .iter()
                        .filter(|mapping| {
                            items.iter().any(|item| {
                                item["externalDepartmentId"].as_str()
                                    == Some(&mapping.external_department_id)
                            })
                        })
                        .map(|mapping| mapping.meta.id)
                        .collect(),
                    mappings: next.into_iter().map(Change::new).collect(),
                    raw_json_columns: items
                        .iter()
                        .enumerate()
                        .filter_map(|(index, _)| {
                            request
                                .raw_item_field(index, "externalSnapshot")
                                .map(|raw| RawJsonColumn {
                                    table: "external_department_mapping",
                                    index,
                                    column: "external_snapshot_json",
                                    raw,
                                })
                        })
                        .collect(),
                    ..Default::default()
                },
                pending,
            )
            .await?;
        let after = json!({"sourceId":source_id,"itemCount":changes.mappings.len(),"items":changes.mappings.iter().map(|mapping|mapping.after.audit()).collect::<Vec<_>>()});
        let raw_items = changes
            .mappings
            .iter()
            .enumerate()
            .map(|(index, mapping)| {
                let overrides = [
                    "externalDepartmentId",
                    "externalParentDepartmentId",
                    "externalDepartmentName",
                ]
                .into_iter()
                .filter_map(|key| {
                    request
                        .raw_item_field(index, key)
                        .map(|raw| (key.to_owned(), raw))
                })
                .collect::<Vec<_>>();
                super::validation::object_raw(&mapping.after.audit(), &overrides)
            })
            .collect::<Vec<_>>();
        let raw_after = super::validation::object_raw(
            &after,
            &[("items".into(), format!("[{}]", raw_items.join(",")))],
        );
        self.write_audit(
            AuditLogInput {
                event_type: "external-department-mapping.replaced".into(),
                target_type: "ExternalOrgSource".into(),
                target_id: source.meta.id.to_string(),
                operator_id: actor,
                before_snapshot: Some(before),
                after_snapshot: Some(after),
                ..Default::default()
            },
            Some(raw_after),
        )
        .await?;
        Ok(json!(
            changes
                .mappings
                .iter()
                .map(|mapping| mapping.after.summary(None))
                .collect::<Vec<_>>()
        ))
    }
    pub async fn mapping_command(
        &self,
        id: &str,
        command: &str,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let mut mapping = store::mapping(&self.database, id)
            .await?
            .ok_or_else(|| E::NotFound(format!("External department mapping {id} not found")))?;
        version(
            "External department mapping",
            request.get("expectedVersion"),
            mapping.meta.row_version,
        )?;
        let source = self.require_source(&mapping.source_id.to_string()).await?;
        editable(&source)?;
        let before = mapping.clone();
        let snapshot = mapping.audit();
        let event = match command {
            "map" => {
                let id = string(&request, "orgUnitId");
                let org = self.optional_org(Some(&id)).await?.ok_or(E::Internal)?;
                if !org.is_active {
                    return Err(E::BadRequest(format!(
                        "OrgUnit {id} is inactive and cannot be mapped."
                    )));
                }
                if let Some(existing) =
                    store::mapped_org(&self.database, source.meta.id, org.meta.id).await?
                    && existing.meta.id != mapping.meta.id
                {
                    return Err(E::Conflict(format!(
                        "OrgUnit {} is already mapped to external department {}.",
                        org.meta.id, existing.external_department_id
                    )));
                }
                mapping.org_unit_id = Some(org.meta.id);
                mapping.status = "mapped".into();
                "external-department-mapping.mapped"
            }
            "unmap" => {
                if mapping.status == "ignored" {
                    return Err(E::BadRequest("Ignored external department mappings must be restored or remapped before unmapping.".into()));
                }
                mapping.org_unit_id = None;
                mapping.status = "unmapped".into();
                "external-department-mapping.unmapped"
            }
            "ignore" => {
                mapping.org_unit_id = None;
                mapping.status = "ignored".into();
                "external-department-mapping.ignored"
            }
            "restore" => {
                if mapping.status != "ignored" {
                    return Err(E::BadRequest(
                        "Only ignored external department mappings can be restored.".into(),
                    ));
                }
                mapping.org_unit_id = None;
                mapping.status = "unmapped".into();
                "external-department-mapping.restored"
            }
            _ => return Err(E::Internal),
        };
        mapping.meta.updated_by = actor;
        let changes = self
            .flush(
                Changes {
                    mappings: vec![Change {
                        before: Some(before),
                        after: mapping,
                    }],
                    ..Default::default()
                },
                pending,
            )
            .await?;
        let mapping = &changes.mappings[0].after;
        self.write_audit(
            AuditLogInput {
                event_type: event.into(),
                target_type: "ExternalDepartmentMapping".into(),
                target_id: mapping.meta.id.to_string(),
                operator_id: actor,
                before_snapshot: Some(snapshot),
                after_snapshot: Some(mapping.audit()),
                ..Default::default()
            },
            None,
        )
        .await?;
        Ok(mapping.summary(None))
    }
    pub async fn create_run(
        &self,
        source_id: &str,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let source = self.require_source(source_id).await?;
        version(
            "External org source",
            request.get("expectedSourceVersion"),
            source.meta.row_version,
        )?;
        if source.status != "active" {
            return Err(E::BadRequest(
                "Only active external org sources can create sync runs.".into(),
            ));
        }
        let config = self.sync_config(&source).await?;
        let mut request_snapshot = request
            .get("requestSnapshot")
            .cloned()
            .unwrap_or_else(|| json!({}));
        request_snapshot["provider"] = json!(source.provider);
        request_snapshot["providerConfigId"] = json!(config.id);
        request_snapshot["externalRootDepartmentId"] =
            json!(root_id(source.external_root_department_id.as_deref()));
        request_snapshot["adapterStatus"] = json!("previewing");
        let run = Run {
            meta: Meta::new(actor),
            source_id: source.meta.id,
            status: "previewing".into(),
            requested_by: actor,
            started_at: clock_now(),
            finished_at: None,
            total_item_count: 0,
            approved_item_count: 0,
            skipped_item_count: 0,
            failed_item_count: 0,
            error_summary: None,
            request_snapshot: request_snapshot.clone(),
            result_summary: json!({}),
        };
        let changes = self
            .flush(
                Changes {
                    runs: vec![Change::new(run)],
                    raw_json_columns: request
                        .raw_field("requestSnapshot")
                        .map(|raw| {
                            let object = crate::auth::js_json::JsObject::parse(&raw).ok();
                            let overrides = object
                                .as_ref()
                                .into_iter()
                                .flat_map(|object| object.entries())
                                .filter(|(key, _)| {
                                    ![
                                        "provider",
                                        "providerConfigId",
                                        "externalRootDepartmentId",
                                        "adapterStatus",
                                    ]
                                    .iter()
                                    .any(|name| key.eq_ascii(name))
                                })
                                .map(|(key, value)| (key.to_utf8_lossy(), value.get().to_owned()))
                                .collect::<Vec<_>>();
                            vec![RawJsonColumn {
                                table: "org_sync_run",
                                index: 0,
                                column: "request_snapshot_json",
                                raw: super::validation::object_raw(&request_snapshot, &overrides),
                            }]
                        })
                        .unwrap_or_default(),
                    ..Default::default()
                },
                pending,
            )
            .await?;
        let mut run = changes.runs[0].after.clone();
        // Deliberately outside the caught preview phase.
        self.write_audit(
            AuditLogInput {
                event_type: "org-sync-run.preview-started".into(),
                target_type: "OrgSyncRun".into(),
                target_id: run.meta.id.to_string(),
                operator_id: actor,
                after_snapshot: Some(run.audit()),
                ..Default::default()
            },
            None,
        )
        .await?;
        let mut unflushed = None;
        let result = self
            .preview_phase(&source, &config, &mut run, actor, &mut unflushed)
            .await;
        match result {
            Ok(()) => Ok(run.detail()),
            Err(error) => {
                let before = run.clone();
                let message = model::redact(&error.to_string());
                run.status = "failed".into();
                run.finished_at = Some(clock_now());
                run.error_summary = Some(message.clone());
                let adapter = match &error {
                    E::Directory(error) => Some(error),
                    _ => None,
                };
                let actions = adapter
                    .filter(|error| !error.next_actions.is_empty())
                    .map(|error| model::normalize_actions(&error.next_actions))
                    .unwrap_or_else(model::default_actions);
                let diagnostic = json!({"message":model::normalized(Some(&message)).unwrap_or_else(||"外部组织同步预览失败，请检查企业协同接入配置、外部平台权限和根部门配置。".into()),"adapterStatus":if adapter.is_some(){"adapter_failed"}else{"preview_failed"},"providerCode":adapter.and_then(|error|error.provider_code.clone()),"httpStatus":adapter.and_then(|error|error.http_status),"providerMessage":model::normalized(adapter.and_then(|error|error.provider_message.as_deref())),"nextActions":actions,"generatedAt":model::nullable_iso(run.finished_at)});
                run.request_snapshot["adapterStatus"] = json!(if adapter.is_some() {
                    "adapter_failed"
                } else {
                    "preview_failed"
                });
                run.result_summary = json!({"failedAt":model::nullable_iso(run.finished_at),"diagnosticSummary":diagnostic});
                run.meta.updated_by = actor;
                // persist([run]) does not detach the other managed entities
                // registered by a failed result flush in the original EM.
                let mut failed_changes = unflushed.unwrap_or_default();
                let persisted_before = failed_changes
                    .runs
                    .first()
                    .and_then(|change| change.before.clone())
                    .unwrap_or(before);
                failed_changes.runs = vec![Change {
                    before: Some(persisted_before),
                    after: run,
                }];
                let changes = self.flush(failed_changes, None).await?;
                let run = &changes.runs[0].after;
                self.write_audit(
                    AuditLogInput {
                        event_type: "org-sync-run.preview.failed".into(),
                        target_type: "OrgSyncRun".into(),
                        target_id: run.meta.id.to_string(),
                        operator_id: actor,
                        result: AuditResult::Failed,
                        reason: Some(message),
                        after_snapshot: Some(run.audit()),
                        ..Default::default()
                    },
                    None,
                )
                .await?;
                Ok(run.detail())
            }
        }
    }
    async fn preview_phase(
        &self,
        source: &Source,
        config: &ProviderRuntimeConfig,
        run: &mut Run,
        actor: Option<Uuid>,
        unflushed: &mut Option<Changes>,
    ) -> Result<()> {
        let encrypted = config
            .encrypted_client_secret
            .as_deref()
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                E::BadRequest(
                    "Identity provider client secret is required before external org sync.".into(),
                )
            })?;
        let secret = self
            .support
            .cipher
            .decrypt(encrypted)
            .map_err(|error| E::BadRequest(error.to_string()))?;
        let departments = self
            .directory
            .fetch_department_tree(
                source.external_root_department_id.as_deref(),
                config,
                &secret,
            )
            .await?;
        let mappings =
            store::mappings(&self.database, &source.meta.id.to_string(), json!({})).await?;
        let orgs = store::all_orgs(&self.database).await?;
        let preview = core::preview(source, run, &departments, &mappings, &orgs, actor);
        let before = run.clone();
        run.status = "previewed".into();
        run.finished_at = Some(clock_now());
        run.total_item_count = preview.diff_items.len() as i32;
        run.approved_item_count = 0;
        run.skipped_item_count = preview
            .diff_items
            .iter()
            .filter(|item| item.status == "skipped")
            .count() as i32;
        run.failed_item_count = 0;
        run.error_summary = None;
        run.request_snapshot["adapterStatus"] = json!("previewed");
        run.request_snapshot["externalDepartmentCount"] = json!(departments.len());
        run.result_summary = preview.summary;
        run.meta.updated_by = actor;
        let mut saved_mapping_ids = HashSet::new();
        let mut next = Changes {
            runs: vec![Change {
                before: Some(before),
                after: run.clone(),
            }],
            mappings: preview
                .mappings
                .into_iter()
                .filter(|mapping| {
                    mapping.meta.id.is_nil() || saved_mapping_ids.insert(mapping.meta.id)
                })
                .map(|after| Change {
                    before: mappings
                        .iter()
                        .find(|mapping| !after.meta.id.is_nil() && mapping.meta.id == after.meta.id)
                        .cloned(),
                    after,
                })
                .collect(),
            diffs: preview.diff_items.into_iter().map(Change::new).collect(),
            ..Default::default()
        };
        next.raw_json_columns = preview_raw_columns(&next, &departments);
        *unflushed = Some(next.clone());
        let changes = self.flush(next, None).await?;
        *unflushed = None;
        *run = changes.runs[0].after.clone();
        self.write_audit(
            AuditLogInput {
                event_type: "org-sync-run.previewed".into(),
                target_type: "OrgSyncRun".into(),
                target_id: run.meta.id.to_string(),
                operator_id: actor,
                after_snapshot: Some(run.audit()),
                ..Default::default()
            },
            None,
        )
        .await
    }
    pub async fn list_runs(&self, source_id: &str, query: Value) -> Result<Value> {
        self.require_source(source_id).await?;
        Ok(json!(
            store::runs(&self.database, source_id, query)
                .await?
                .iter()
                .map(Run::detail)
                .collect::<Vec<_>>()
        ))
    }
    pub async fn get_run(&self, id: &str) -> Result<Value> {
        Ok(self.require_run(id).await?.detail())
    }
    pub async fn list_diffs(&self, run_id: &str, query: Value) -> Result<Value> {
        self.require_run(run_id).await?;
        Ok(json!(
            store::diffs(&self.database, run_id, query)
                .await?
                .iter()
                .map(Diff::summary)
                .collect::<Vec<_>>()
        ))
    }
    pub async fn apply_run(
        &self,
        id: &str,
        request: super::validation::RequestInput,
        actor: Option<Uuid>,
        pending: Option<&SessionFlush>,
    ) -> Result<Value> {
        let mut run = self.require_run(id).await?;
        version(
            "Org sync run",
            request.get("expectedVersion"),
            run.meta.row_version,
        )?;
        if run.status != "previewed" {
            return Err(E::BadRequest(
                "Only previewed org sync runs can be applied.".into(),
            ));
        }
        let before_snapshot = run.audit();
        let source = self.require_source(&run.source_id.to_string()).await?;
        let original_mappings =
            store::mappings(&self.database, &source.meta.id.to_string(), json!({})).await?;
        let original_orgs = store::all_orgs(&self.database).await?;
        let mut diffs = store::diffs(&self.database, &run.meta.id.to_string(), json!({})).await?;
        let skipped = string_set(&request, "skippedDiffItemIds");
        let approved = string_set(&request, "approvedDiffItemIds");
        let selected = diffs
            .iter()
            .filter(|item| core::selected(item, &skipped, &approved))
            .cloned()
            .collect::<Vec<_>>();
        let selected_ids: HashSet<_> = selected.iter().map(|item| item.meta.id).collect();
        core::parent_dependencies(&selected, &original_mappings)?;
        let order = core::apply_order(&diffs, &selected)?;
        let before = run.clone();
        run.status = "applying".into();
        run.meta.updated_by = actor;
        let changes = self
            .flush(
                Changes {
                    runs: vec![Change {
                        before: Some(before),
                        after: run,
                    }],
                    ..Default::default()
                },
                pending,
            )
            .await?;
        run = changes.runs[0].after.clone();
        let applying = run.clone();
        let mut mappings = original_mappings.clone();
        let mut orgs = original_orgs.clone();
        let original_diffs = diffs.clone();
        let mut created = HashMap::new();
        let (mut applied_count, mut skipped_count, mut failed_count) = (0, 0, 0);
        for index in order {
            let item = &mut diffs[index];
            if !selected_ids.contains(&item.meta.id) {
                item.status = "skipped".into();
                item.meta.updated_by = actor;
                skipped_count += 1;
                continue;
            }
            match core::apply_item(item, &mut mappings, &mut orgs, &mut created, actor) {
                Ok(()) => {
                    item.status = "applied".into();
                    item.applied_at = Some(clock_now());
                    item.error_message = None;
                    item.meta.updated_by = actor;
                    applied_count += 1;
                }
                Err(error) => {
                    item.status = "failed".into();
                    item.error_message = Some(model::redact(&error.to_string()));
                    item.meta.updated_by = actor;
                    failed_count += 1;
                }
            }
        }
        run.status = if failed_count > 0 {
            "failed"
        } else {
            "applied"
        }
        .into();
        run.finished_at = Some(clock_now());
        run.approved_item_count = applied_count;
        run.skipped_item_count = skipped_count;
        run.failed_item_count = failed_count;
        run.error_summary =
            (failed_count > 0).then(|| format!("{failed_count} org sync diff item(s) failed."));
        run.result_summary = json!({"appliedItemCount":applied_count,"skippedItemCount":skipped_count,"failedItemCount":failed_count,"explicitApproval":!approved.is_empty()});
        run.meta.updated_by = actor;
        let next = Changes {
            runs: vec![Change {
                before: Some(applying),
                after: run,
            }],
            mappings: mappings
                .into_iter()
                .filter_map(|after| {
                    let before = original_mappings
                        .iter()
                        .find(|mapping| mapping.meta.id == after.meta.id)
                        .cloned();
                    (before.as_ref() != Some(&after)).then_some(Change { before, after })
                })
                .collect(),
            orgs: orgs
                .into_iter()
                .filter_map(|after| {
                    let before = original_orgs
                        .iter()
                        .find(|org| !after.meta.id.is_nil() && org.meta.id == after.meta.id)
                        .cloned();
                    (before.as_ref() != Some(&after)).then_some(Change { before, after })
                })
                .collect(),
            diffs: diffs
                .into_iter()
                .map(|after| Change {
                    before: original_diffs
                        .iter()
                        .find(|item| item.meta.id == after.meta.id)
                        .cloned(),
                    after,
                })
                .collect(),
            ..Default::default()
        };
        let changes = self.flush(next, None).await?;
        let run = &changes.runs[0].after;
        let metadata = json!({"approvedDiffItemIds":request.get("approvedDiffItemIds").cloned().unwrap_or_else(||json!([])),"skippedDiffItemIds":request.get("skippedDiffItemIds").cloned().unwrap_or_else(||json!([]))});
        self.write_audit(
            AuditLogInput {
                event_type: if failed_count > 0 {
                    "org-sync-run.apply.failed"
                } else {
                    "org-sync-run.applied"
                }
                .into(),
                target_type: "OrgSyncRun".into(),
                target_id: run.meta.id.to_string(),
                operator_id: actor,
                result: if failed_count > 0 {
                    AuditResult::Failed
                } else {
                    AuditResult::Success
                },
                before_snapshot: Some(before_snapshot),
                after_snapshot: Some(run.audit()),
                metadata: Some(metadata),
                ..Default::default()
            },
            None,
        )
        .await?;
        Ok(run.detail())
    }

    async fn require_source(&self, id: &str) -> Result<Source> {
        store::source(&self.database, id)
            .await?
            .ok_or_else(|| E::NotFound(format!("External org source {id} not found")))
    }
    async fn require_run(&self, id: &str) -> Result<Run> {
        store::run(&self.database, id)
            .await?
            .ok_or_else(|| E::NotFound(format!("Org sync run {id} not found")))
    }
    async fn optional_config(&self, id: Option<&str>) -> Result<Option<ProviderRuntimeConfig>> {
        match id {
            None | Some("") => Ok(None),
            Some(id) => read_provider_runtime_config(&self.database, id)
                .await?
                .map(Some)
                .ok_or_else(|| E::BadRequest(format!("Identity provider config {id} not found"))),
        }
    }
    async fn optional_org(&self, id: Option<&str>) -> Result<Option<Org>> {
        match id {
            None | Some("") => Ok(None),
            Some(id) => store::org(&self.database, id)
                .await?
                .map(Some)
                .ok_or_else(|| E::BadRequest(format!("OrgUnit {id} not found"))),
        }
    }
    async fn sync_config(&self, source: &Source) -> Result<ProviderRuntimeConfig> {
        if source.provider != "feishu" {
            return Err(E::BadRequest(format!(
                "External org sync is not supported for provider {} yet.",
                source.provider
            )));
        }
        let id = source.provider_config_id.ok_or_else(|| {
            E::BadRequest(
                "Active external org source requires a provider config before creating sync runs."
                    .into(),
            )
        })?;
        let config = self
            .optional_config(Some(&id.to_string()))
            .await?
            .ok_or(E::Internal)?;
        matches_config(&source.provider, Some(&config))?;
        ready(&config)?;
        Ok(config)
    }
    async fn flush(&self, changes: Changes, pending: Option<&SessionFlush>) -> Result<Changes> {
        Ok(store::flush(&self.database, changes, pending).await?)
    }
    async fn audit_source(
        &self,
        event: &str,
        source: &Source,
        request: &super::validation::RequestInput,
        actor: Option<Uuid>,
        before: Option<Value>,
    ) -> Result<()> {
        let after = source.audit();
        let overrides = [
            "externalTenantId",
            "displayName",
            "externalRootDepartmentId",
            "syncScopes",
        ]
        .into_iter()
        .filter_map(|key| request.raw_field(key).map(|raw| (key.to_owned(), raw)))
        .collect::<Vec<_>>();
        let raw = super::validation::object_raw(&after, &overrides);
        let input = AuditLogInput {
            event_type: event.into(),
            target_type: "ExternalOrgSource".into(),
            target_id: source.meta.id.to_string(),
            operator_id: actor,
            before_snapshot: before,
            after_snapshot: Some(after),
            ..Default::default()
        };
        self.write_audit(input, Some(raw)).await
    }
    async fn write_audit(&self, input: AuditLogInput, raw_after: Option<String>) -> Result<()> {
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result = match raw_after.as_deref() {
                        Some(raw) => store::insert_audit_raw(&mut transaction, &input, raw).await,
                        None => {
                            crate::auth::audit::insert_audit_log(&mut transaction, &input).await
                        }
                    };
                    match result {
                        Ok(()) => transaction.commit().await,
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        Ok(())
    }
}
fn raw_column(
    request: &super::validation::RequestInput,
    key: &str,
    table: &'static str,
    index: usize,
    column: &'static str,
) -> Vec<RawJsonColumn> {
    request
        .raw_field(key)
        .map(|raw| {
            vec![RawJsonColumn {
                table,
                index,
                column,
                raw,
            }]
        })
        .unwrap_or_default()
}
fn preview_raw_columns(
    changes: &Changes,
    departments: &[super::directory::ExternalDepartmentSnapshot],
) -> Vec<RawJsonColumn> {
    let mut columns = Vec::new();
    for (index, change) in changes.mappings.iter().enumerate() {
        if let Some(raw) = departments
            .iter()
            .rev()
            .find(|department| {
                department.external_department_id == change.after.external_department_id
            })
            .and_then(|department| department.raw_json.as_deref())
        {
            columns.push(RawJsonColumn {
                table: "external_department_mapping",
                index,
                column: "external_snapshot_json",
                raw: raw.to_owned(),
            });
        }
    }
    for (index, change) in changes.diffs.iter().enumerate() {
        let candidate = &change.after.candidate_snapshot;
        if candidate.get("externalSnapshot").is_some()
            && let Some(raw) = departments
                .iter()
                .find(|department| {
                    department.external_department_id == change.after.external_department_id
                        && department.raw == candidate["externalSnapshot"]
                })
                .and_then(|department| department.raw_json.as_deref())
        {
            let normalized = serde_json::value::to_raw_value(candidate)
                .ok()
                .and_then(|raw| super::validation::node_value(&raw).ok())
                .unwrap_or_else(|| candidate.clone());
            columns.push(RawJsonColumn {
                table: "org_sync_diff_item",
                index,
                column: "candidate_snapshot_json",
                raw: super::validation::object_raw(
                    &normalized,
                    &[("externalSnapshot".into(), raw.to_owned())],
                ),
            });
        }
    }
    columns
}
fn string(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}
fn optional(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}
fn string_set(value: &Value, key: &str) -> HashSet<String> {
    value[key]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::to_owned)
        .collect()
}
fn lower(value: &str) -> String {
    icu_casemap::CaseMapper::new()
        .lowercase_to_string(value, &icu_locale_core::langid!("en-US"))
        .into_owned()
}
fn editable(source: &Source) -> Result<()> {
    if source.status == "archived" {
        Err(E::BadRequest(
            "Archived external org sources are read-only.".into(),
        ))
    } else {
        Ok(())
    }
}
fn version(entity: &str, expected: Option<&Value>, actual: i32) -> Result<()> {
    if let Some(expected) = expected.and_then(Value::as_i64)
        && expected != i64::from(actual)
    {
        Err(E::Conflict(format!(
            "{entity} version conflict: expected {expected}, actual {actual}"
        )))
    } else {
        Ok(())
    }
}
fn matches_config(provider: &str, config: Option<&ProviderRuntimeConfig>) -> Result<()> {
    if let Some(config) = config
        && config.provider != provider
    {
        Err(E::BadRequest(format!(
            "Identity provider config provider {} does not match external org source provider {provider}",
            config.provider
        )))
    } else {
        Ok(())
    }
}
fn source_state(source: &Source, config: Option<&ProviderRuntimeConfig>) -> Result<()> {
    if source.status != "active" {
        return Ok(());
    }
    if source.provider != "feishu" {
        return Err(E::BadRequest(
            "当前外部平台尚未支持组织同步，请先保持为草稿。".into(),
        ));
    }
    if source.provider_config_id.is_none() || config.is_none() {
        return Err(E::BadRequest(
            "启用外部组织同步源前，请先选择已启用且已配置 Client Secret 的企业协同接入。".into(),
        ));
    }
    matches_config(&source.provider, config)?;
    ready(config.ok_or(E::Internal)?)
}
fn ready(config: &ProviderRuntimeConfig) -> Result<()> {
    if !config.enabled {
        return Err(E::BadRequest(
            "所选企业协同接入总开关未启用，不能用于外部组织同步。".into(),
        ));
    }
    if config
        .encrypted_client_secret
        .as_ref()
        .is_none_or(String::is_empty)
    {
        return Err(E::BadRequest(
            "所选企业协同接入缺少 Client Secret，不能用于外部组织同步。".into(),
        ));
    }
    if config.status != "active" {
        let status = match config.status.as_str() {
            "draft" => "草稿",
            "active" => "启用",
            "disabled" => "停用",
            "misconfigured" => "配置异常",
            value => value,
        };
        return Err(E::BadRequest(format!(
            "所选企业协同接入状态为「{status}」，尚未就绪，不能用于外部组织同步。"
        )));
    }
    Ok(())
}
