//! Existing J19 service decisions. Each persist/audit is a separate request UoW flush.
use super::{
    model::{RequestData, Wire, js, trim_js},
    store::{self, AuditWrite, Entity, Table},
};
#[path = "handover.rs"]
mod handover;
#[path = "zip.rs"]
pub(super) mod zip;
use crate::{
    attachment_storage::{AttachmentStorage, ObjectLocation, StorageFailure},
    auth::{
        js_json::JsString,
        model::{ResolvedSession, SessionFlush, clock_now},
    },
    binary_http::BinaryPayload,
    database::Database,
    dictionary::service::{DictionaryError, DictionaryService},
    handover_facts::HandoverFacts,
    system_settings::service::{SystemSettingsError, SystemSettingsService},
};
use axum::{body::Body, http::StatusCode};
use chrono::Duration;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, HashMap, HashSet},
    sync::Arc,
};
type Result<T> = std::result::Result<T, StorageFailure>;
fn bad(message: impl AsRef<str>) -> StorageFailure {
    StorageFailure::http(StatusCode::BAD_REQUEST, message)
}
fn conflict(message: impl AsRef<str>) -> StorageFailure {
    StorageFailure::http(StatusCode::CONFLICT, message)
}
fn forbidden(message: impl AsRef<str>) -> StorageFailure {
    StorageFailure::http(StatusCode::FORBIDDEN, message)
}
fn missing(message: impl AsRef<str>) -> StorageFailure {
    StorageFailure::http(StatusCode::NOT_FOUND, message)
}
fn dictionary_error(e: DictionaryError) -> StorageFailure {
    match e {
        DictionaryError::BadRequest(v) => bad(v),
        DictionaryError::NotFound(v) => missing(v),
        DictionaryError::Conflict(v) => conflict(v),
        _ => StorageFailure::unexpected("Internal server error"),
    }
}
fn settings_error(e: SystemSettingsError) -> StorageFailure {
    match e {
        SystemSettingsError::BadRequest(v) => bad(v),
        SystemSettingsError::NotFound(v) => missing(v),
        SystemSettingsError::Conflict(v) => conflict(v),
        _ => StorageFailure::unexpected("Internal server error"),
    }
}
fn uuid() -> Result<String> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| StorageFailure::unexpected("Internal server error"))?;
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    Ok(uuid::Uuid::from_bytes(bytes).to_string())
}
fn sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}
fn date(entity: &Entity, key: &str) -> Value {
    entity
        .time(key)
        .and_then(|v| crate::compat::scalars::js_iso_string(v).ok())
        .map(Value::String)
        .unwrap_or(Value::Null)
}
fn group_id(entity: &Entity) -> String {
    entity
        .text("version_group_id")
        .unwrap_or_else(|| entity.id())
}
fn location(entity: &Entity) -> ObjectLocation {
    ObjectLocation {
        storage_provider: entity
            .str(if entity.table == Table::Session {
                "provider_type"
            } else {
                "storage_provider"
            })
            .into(),
        storage_bucket: entity.text("storage_bucket"),
        storage_key: entity.str("storage_key").into(),
    }
}
fn default_security(category: &str) -> &'static str {
    if ["quotation", "contract", "finance", "internal-assessment"].contains(&category) {
        "sensitive"
    } else {
        "internal"
    }
}
fn original_name(value: JsString) -> Result<JsString> {
    let units = value.as_code_units();
    let start = units
        .iter()
        .rposition(|v| *v == b'/' as u16 || *v == b'\\' as u16)
        .map_or(0, |v| v + 1);
    let trimmed = trim_js(JsString::from_code_units(units[start..].to_vec()));
    if trimmed.is_empty() {
        return Err(bad("Attachment original filename is required"));
    }
    Ok(JsString::from_code_units(
        trimmed.as_code_units()[..trimmed.as_code_units().len().min(255)].to_vec(),
    ))
}
fn lower_units(text: &[u16]) -> JsString {
    let mapper = icu_casemap::CaseMapper::new();
    let language = icu_locale_core::langid!("und");
    let mut output = Vec::new();
    let mut chunk = String::new();
    let flush = |chunk: &mut String, output: &mut Vec<u16>| {
        output.extend(mapper.lowercase_to_string(chunk, &language).encode_utf16());
        chunk.clear();
    };
    for value in char::decode_utf16(text.iter().copied()) {
        match value {
            Ok(value) => chunk.push(value),
            Err(error) => {
                flush(&mut chunk, &mut output);
                output.push(error.unpaired_surrogate());
            }
        }
    }
    flush(&mut chunk, &mut output);
    JsString::from_code_units(output)
}
fn extension(name: &JsString) -> JsString {
    let units = name.as_code_units();
    let start = units
        .iter()
        .rposition(|v| *v == b'/' as u16 || *v == b'\\' as u16)
        .map_or(0, |v| v + 1);
    let base = &units[start..];
    let Some(dot) = base.iter().rposition(|v| *v == b'.' as u16) else {
        return js("");
    };
    if dot == 0 || base == [b'.' as u16, b'.' as u16] {
        return js("");
    }
    lower_units(&base[dot + 1..])
}
fn check_extension(extension: &JsString) -> Result<()> {
    if [
        "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "png", "jpg", "jpeg", "webp",
        "txt", "md", "zip",
    ]
    .iter()
    .any(|v| extension.eq_ascii(v))
    {
        return Ok(());
    }
    let mut units = "Unsupported attachment extension "
        .encode_utf16()
        .collect::<Vec<_>>();
    units.extend_from_slice(extension.as_code_units());
    Err(StorageFailure::from_js(
        Some(StatusCode::BAD_REQUEST),
        JsString::from_code_units(units),
    ))
}
pub fn preview_kind(entity: &Entity) -> &'static str {
    let extension = entity.str("extension").to_lowercase();
    let mime = entity.str("mime_type").to_lowercase();
    if mime.starts_with("image/") && ["png", "jpg", "jpeg", "webp"].contains(&extension.as_str()) {
        "image"
    } else if mime == "application/pdf" || extension == "pdf" {
        "pdf"
    } else {
        "unsupported"
    }
}

/// Request-local managed entities and the full authenticated snapshot, never a shared cache.
pub struct CallContext {
    pub session: ResolvedSession,
    pub pending: Option<SessionFlush>,
    pub entities: Vec<Entity>,
    target_cache: std::sync::Mutex<HashSet<String>>,
}
impl CallContext {
    pub fn new(session: &ResolvedSession) -> Self {
        Self {
            session: session.clone(),
            pending: session.pending_flush.clone(),
            entities: Vec::new(),
            target_cache: std::sync::Mutex::new(HashSet::new()),
        }
    }
    fn track(&mut self, row: Entity) -> usize {
        if let Some(i) = self
            .entities
            .iter()
            .position(|e| e.table == row.table && e.id() == row.id())
        {
            self.entities[i].refresh(row);
            i
        } else {
            self.entities.push(row);
            self.entities.len() - 1
        }
    }
    fn user_id(&self) -> String {
        self.session.user.user_id.to_string()
    }
    fn permission(&self, permission: &str) -> bool {
        self.session
            .user
            .permissions
            .iter()
            .any(|v| v.as_str() == permission)
    }
    fn target_permission(&self, kind: &str, mode: &str) -> bool {
        match kind {
            "customer" => self.permission(&format!("customer:{mode}")),
            "lead" => self.permission(&format!("lead:{mode}")),
            "project" | "contract" | "project-handover" => {
                self.permission(&format!("project:{mode}"))
            }
            "sales-follow-up" => ["customer", "lead", "project"]
                .iter()
                .any(|v| self.permission(&format!("{v}:{mode}"))),
            _ => false,
        }
    }
    fn can_read_security(&self, attachment: &Entity) -> bool {
        !["confidential", "restricted"].contains(&attachment.str("security_level"))
            || [
                "contract:finance:sensitive:read",
                "operating:finance:sensitive:read",
                "commission:amount:sensitive:read",
                "platform:roles:manage",
            ]
            .iter()
            .any(|v| self.permission(v))
    }
}
#[derive(Clone)]
pub struct AttachmentsService {
    database: Database,
    storage: Arc<AttachmentStorage>,
    dictionary: DictionaryService,
    settings: SystemSettingsService,
    facts: HandoverFacts,
}
impl AttachmentsService {
    pub fn new(database: Database, storage: Arc<AttachmentStorage>) -> Self {
        Self {
            dictionary: DictionaryService::new(database.clone()),
            settings: SystemSettingsService::new(database.clone()),
            facts: HandoverFacts::new(database.clone()),
            database,
            storage,
        }
    }
    async fn load(&self, table: Table, id: &str, ctx: &mut CallContext) -> Result<usize> {
        if let Some(index) = ctx
            .entities
            .iter()
            .position(|e| e.table == table && e.id() == id)
        {
            return Ok(index);
        }
        let row = store::find(&self.database, table, id)
            .await?
            .ok_or_else(|| {
                missing(match table {
                    Table::Attachment => format!("Attachment {id} not found"),
                    Table::Link => format!("Attachment link {id} not found"),
                    Table::Session => format!("Attachment upload session {id} not found"),
                    Table::HandoverSelection => format!("Attachment selection {id} not found"),
                    Table::DownloadPackage => format!("Attachment download package {id} not found"),
                    Table::DownloadPackageItem => {
                        format!("Attachment download package item {id} not found")
                    }
                })
            })?;
        Ok(ctx.track(row))
    }
    async fn links(&self, id: &str, ctx: &mut CallContext) -> Result<Vec<Entity>> {
        let rows = store::links(&self.database, id).await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let i = ctx.track(r);
                ctx.entities[i].clone()
            })
            .collect())
    }
    async fn versions(&self, id: &str, ctx: &mut CallContext) -> Result<Vec<usize>> {
        Ok(store::group(&self.database, id)
            .await?
            .into_iter()
            .map(|r| ctx.track(r))
            .collect())
    }
    async fn latest(&self, base: usize, ctx: &mut CallContext) -> Result<usize> {
        let group = group_id(&ctx.entities[base]);
        Ok(match store::latest(&self.database, &group).await? {
            Some(row) => ctx.track(row),
            None => base,
        })
    }
    async fn save(&self, ctx: &mut CallContext) -> Result<()> {
        store::flush(&self.database, &mut ctx.entities, &mut ctx.pending, None).await
    }
    async fn audit(
        &self,
        event: &str,
        target: &str,
        metadata: Wire,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<()> {
        let audit = AuditWrite {
            event: event.into(),
            target: target.into(),
            operator: ctx.session.user.user_id,
            request_id: request_id.map(str::to_owned),
            metadata,
            result: "success".into(),
        };
        store::flush(
            &self.database,
            &mut ctx.entities,
            &mut ctx.pending,
            Some(audit),
        )
        .await
    }
    async fn category(&self, value: &str) -> Result<()> {
        self.dictionary
            .require_active_item("attachment-category", value)
            .await
            .map_err(dictionary_error)?;
        Ok(())
    }
    async fn target_access(
        &self,
        kind: &str,
        id: &str,
        mode: &str,
        ctx: &CallContext,
    ) -> Result<()> {
        if !ctx.target_permission(kind, mode) {
            return Err(forbidden(format!("Missing {kind} {mode} permission")));
        }
        let cache_key = format!("{kind}:{id}");
        if ctx
            .target_cache
            .lock()
            .is_ok_and(|cache| cache.contains(&cache_key))
        {
            return Ok(());
        }
        let targets = store::targets(&self.database, kind, vec![id.into()]).await?;
        if targets.is_empty() {
            return Err(missing(match kind {
                "customer" => format!("Customer {id} not found"),
                "lead" => format!("Lead {id} not found"),
                "project" => format!("Project {id} not found"),
                "contract" => format!("Contract {id} not found"),
                "sales-follow-up" => format!("Sales follow-up record {id} not found"),
                _ => format!("Project handover {id} not found"),
            }));
        }
        if let Some(canonical) = targets.first().and_then(|v| v["id"].as_str())
            && let Ok(mut cache) = ctx.target_cache.lock()
        {
            cache.insert(format!("{kind}:{canonical}"));
        }
        Ok(())
    }
    fn mutate(&self, attachment: &Entity, links: &[Entity], ctx: &CallContext) -> Result<()> {
        if attachment.str("uploaded_by") == ctx.user_id()
            || links
                .iter()
                .any(|l| ctx.target_permission(l.str("target_type"), "write"))
        {
            Ok(())
        } else {
            Err(forbidden("Insufficient attachment mutation permission"))
        }
    }
    async fn any_link(&self, links: &[Entity], mode: &str, ctx: &CallContext) -> bool {
        for link in links {
            if self
                .target_access(link.str("target_type"), link.str("target_id"), mode, ctx)
                .await
                .is_ok()
            {
                return true;
            }
        }
        false
    }
    async fn readable(&self, id: &str, ctx: &mut CallContext) -> Result<(usize, Vec<Entity>)> {
        let i = self.load(Table::Attachment, id, ctx).await?;
        let links = self.links(id, ctx).await?;
        let attachment = &ctx.entities[i];
        if attachment.str("status") != "active" {
            return Err(missing(format!("Attachment {id} not found")));
        }
        if !ctx.can_read_security(attachment) {
            return Err(forbidden("Insufficient attachment security permission"));
        }
        if !self.any_link(&links, "read", ctx).await {
            return Err(forbidden("Insufficient attachment target permission"));
        }
        Ok((i, links))
    }
    async fn session_access(&self, i: usize, mode: &str, ctx: &mut CallContext) -> Result<()> {
        let session = ctx.entities[i].clone();
        if session
            .text("created_by")
            .is_some_and(|v| v != ctx.user_id())
        {
            return Err(forbidden(
                "Attachment upload session belongs to another user",
            ));
        }
        if let (Some(kind), Some(id)) = (session.text("target_type"), session.text("target_id")) {
            return self.target_access(&kind, &id, mode, ctx).await;
        }
        let Some(base) = session.text("base_attachment_id") else {
            return Ok(());
        };
        let attachment = self.load(Table::Attachment, &base, ctx).await?;
        let links = self.links(&base, ctx).await?;
        if mode == "write" {
            return self.mutate(&ctx.entities[attachment], &links, ctx);
        }
        if !ctx.can_read_security(&ctx.entities[attachment]) {
            return Err(forbidden("Insufficient attachment security permission"));
        }
        if ctx.entities[attachment].str("uploaded_by") != ctx.user_id()
            && !self.any_link(&links, "read", ctx).await
        {
            return Err(forbidden("Insufficient attachment target permission"));
        }
        Ok(())
    }
    fn expected(&self, i: usize, input: &RequestData, ctx: &CallContext) -> Result<()> {
        if input
            .number("expectedVersion")
            .is_some_and(|v| v != ctx.entities[i].version() as f64)
        {
            return Err(conflict(format!(
                "Attachment upload session {} version mismatch",
                ctx.entities[i].id()
            )));
        }
        Ok(())
    }
    fn terminal(status: &str) -> bool {
        ["completed", "failed", "expired", "aborted"].contains(&status)
    }
    fn not_terminal(&self, i: usize, ctx: &CallContext) -> Result<()> {
        let e = &ctx.entities[i];
        if Self::terminal(e.str("status")) {
            Err(conflict(format!(
                "Attachment upload session {} is already {}",
                e.id(),
                e.str("status")
            )))
        } else {
            Ok(())
        }
    }
    async fn not_expired(&self, i: usize, ctx: &mut CallContext) -> Result<()> {
        if ctx.entities[i]
            .time("expires_at")
            .is_some_and(|v| v > clock_now())
        {
            return Ok(());
        }
        let id = ctx.entities[i].id();
        ctx.entities[i].set("status", json!("expired"));
        ctx.entities[i].set("failed_reason", json!("Attachment upload session expired"));
        self.save(ctx).await?;
        Err(conflict(format!(
            "Attachment upload session {id} has expired"
        )))
    }
    async fn can_receive(&self, i: usize, ctx: &mut CallContext) -> Result<()> {
        self.not_terminal(i, ctx)?;
        self.not_expired(i, ctx).await?;
        let e = &ctx.entities[i];
        if !["pending", "uploading"].contains(&e.str("status")) {
            return Err(conflict(format!(
                "Attachment upload session {} cannot receive another object in status {}",
                e.id(),
                e.str("status")
            )));
        }
        Ok(())
    }

    pub async fn create_session(
        &self,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let max = self
            .settings
            .get_attachment_max_upload_size_bytes()
            .await
            .map_err(settings_error)?;
        let size = input.number("sizeBytes").unwrap_or(0.0);
        if size > max as f64 {
            return Err(bad("Attachment file exceeds size limit"));
        }
        let now = clock_now();
        let name = original_name(input.string("originalName").unwrap_or_else(|| js("")))?;
        let ext = extension(&name);
        check_extension(&ext)?;
        let mode = input.text("operationType").unwrap_or_default();
        let (target_kind, target_id, base, category, security, relation, change) = if mode
            == "create-attachment"
        {
            let kind = input.text("targetType").unwrap_or_default();
            let id = input.text("targetId").unwrap_or_default();
            let category = input.text("category").unwrap_or_default();
            if kind.is_empty() || id.is_empty() || category.is_empty() {
                return Err(bad(
                    "Attachment upload session target and category are required",
                ));
            }
            self.category(&category).await?;
            self.target_access(&kind, &id, "write", ctx).await?;
            let security = input
                .text("securityLevel")
                .unwrap_or_else(|| default_security(&category).into());
            (
                Some(kind),
                Some(id),
                None,
                category,
                security,
                Some(
                    input
                        .text("relationType")
                        .unwrap_or_else(|| "normal".into()),
                ),
                None,
            )
        } else {
            let base = input.text("baseAttachmentId").unwrap_or_default();
            let change=input.string("changeNote").filter(|v|!v.is_empty()).ok_or_else(||bad("Attachment version upload session requires baseAttachmentId and changeNote"))?;
            if base.is_empty() {
                return Err(bad(
                    "Attachment version upload session requires baseAttachmentId and changeNote",
                ));
            }
            let base_index = self.load(Table::Attachment, &base, ctx).await?;
            let latest = self.latest(base_index, ctx).await?;
            let latest_id = ctx.entities[latest].id();
            let links = self.links(&latest_id, ctx).await?;
            self.mutate(&ctx.entities[latest], &links, ctx)?;
            if ctx.entities[latest].str("status") != "active" {
                return Err(conflict(format!("Attachment {latest_id} is not active")));
            }
            let category = if let Some(v) = input.text("category") {
                self.category(&v).await?;
                v
            } else {
                ctx.entities[latest].str("category").into()
            };
            (
                links.first().and_then(|l| l.text("target_type")),
                links.first().and_then(|l| l.text("target_id")),
                Some(base),
                category,
                input
                    .text("securityLevel")
                    .unwrap_or_else(|| ctx.entities[latest].str("security_level").into()),
                None,
                Some(change),
            )
        };
        let id = uuid()?;
        let plan = self
            .storage
            .create_original_upload_plan(&id, &name.to_utf8_lossy(), size, Some(now))
            .await?;
        let mut entity = Entity::new(
            Table::Session,
            json!({"id":id,"operation_type":mode,"status":"pending","upload_mode":plan.upload_mode,"provider_type":plan.location.storage_provider,"storage_bucket":plan.location.storage_bucket,"storage_key":plan.location.storage_key,"target_type":target_kind,"target_id":target_id,"base_attachment_id":base,"completed_attachment_id":null,"original_name":name.to_utf8_lossy(),"display_name":"","extension":ext.to_utf8_lossy(),"mime_type":"","size_bytes":size as i64,"max_size_bytes":max,"checksum_sha256":input.text("checksumSha256"),"category":category,"security_level":security,"relation_type":relation,"description":null,"change_note":null,"expires_at":now+Duration::hours(1),"uploaded_at":null,"completed_at":null,"aborted_at":null,"failed_reason":null,"created_at":now,"created_by":ctx.user_id(),"updated_at":now}),
        );
        entity.set_text(
            "checksum_sha256",
            input.string("checksumSha256").filter(|v| !v.is_empty()),
        );
        entity.set_text("original_name", Some(name.clone()));
        entity.set_text(
            "display_name",
            Some(
                input
                    .string("displayName")
                    .filter(|v| !v.is_empty())
                    .unwrap_or(name),
            ),
        );
        entity.set_text(
            "mime_type",
            Some(
                input
                    .string("mimeType")
                    .filter(|v| !v.is_empty())
                    .unwrap_or_else(|| js("application/octet-stream")),
            ),
        );
        entity.set_text(
            "description",
            input.string("description").filter(|v| !v.is_empty()),
        );
        entity.set_text("change_note", change);
        let i = ctx.track(entity);
        self.save(ctx).await?;
        let e = &ctx.entities[i];
        let metadata = Wire::value(
            json!({"operationType":e.data["operation_type"],"uploadMode":e.data["upload_mode"],"providerType":e.data["provider_type"],"targetType":e.data["target_type"],"targetId":e.data["target_id"],"baseAttachmentId":e.data["base_attachment_id"],"sizeBytes":e.data["size_bytes"],"maxSizeBytes":e.data["max_size_bytes"]}),
        );
        self.audit(
            "attachment_upload_session.created",
            &id,
            metadata,
            request_id,
            ctx,
        )
        .await?;
        Ok(session_summary(&ctx.entities[i]))
    }
    pub async fn get_session(&self, id: &str, ctx: &mut CallContext) -> Result<Wire> {
        let i = self.load(Table::Session, id, ctx).await?;
        self.session_access(i, "read", ctx).await?;
        Ok(session_summary(&ctx.entities[i]))
    }
    pub async fn upload_target(
        &self,
        id: &str,
        input: &RequestData,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Session, id, ctx).await?;
        self.session_access(i, "write", ctx).await?;
        self.expected(i, input, ctx)?;
        self.can_receive(i, ctx).await?;
        if ctx.entities[i].str("status") == "pending" {
            ctx.entities[i].set("status", json!("uploading"));
            self.save(ctx).await?;
        }
        let e = ctx.entities[i].clone();
        let expires = e
            .time("expires_at")
            .ok_or_else(|| StorageFailure::unexpected("Invalid time value"))?;
        let (method, url, headers, expiry) = if e.str("upload_mode") == "proxy" {
            (
                "PUT".into(),
                format!("/api/attachment-upload-sessions/{}/object", e.id()),
                json!({"content-type":e.str("mime_type")}),
                date(&e, "expires_at"),
            )
        } else {
            let target = self
                .storage
                .create_presigned_put_target(
                    &location(&e),
                    Some(e.str("mime_type")),
                    e.data["checksum_sha256"].as_str(),
                    expires,
                )
                .await?;
            (
                target.method,
                target.url,
                json!(target.headers),
                json!(target.expires_at),
            )
        };
        Ok(Wire::value(
            json!({"sessionId":e.id(),"uploadMode":e.data["upload_mode"],"method":method,"url":url,"headers":headers,"expiresAt":expiry,"providerType":e.data["provider_type"],"maxSizeBytes":e.data["max_size_bytes"]}),
        ))
    }
    pub async fn proxy_object(
        &self,
        id: &str,
        bytes: &[u8],
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Session, id, ctx).await?;
        self.session_access(i, "write", ctx).await?;
        self.can_receive(i, ctx).await?;
        let e = ctx.entities[i].clone();
        if e.str("upload_mode") != "proxy" {
            return Err(bad(
                "Attachment upload session does not use backend proxy upload mode",
            ));
        }
        if bytes.len() as i64 != e.integer("size_bytes") {
            return Err(bad(
                "Attachment upload object size does not match the declared session size",
            ));
        }
        let checksum = sha256(bytes);
        if let Some(declared) = e.string("checksum_sha256").filter(|v| !v.is_empty()) {
            if js(&checksum) != declared {
                return Err(bad(
                    "Attachment upload object checksum does not match the declared session checksum",
                ));
            }
        } else {
            ctx.entities[i].set("checksum_sha256", json!(checksum));
        }
        self.storage
            .save_upload_session_object(&location(&e), bytes, Some(e.str("mime_type")))
            .await?;
        ctx.entities[i].set("status", json!("uploaded"));
        ctx.entities[i].set("uploaded_at", json!(clock_now()));
        self.save(ctx).await?;
        let e = &ctx.entities[i];
        Ok(Wire::value(
            json!({"sessionId":e.id(),"status":e.data["status"],"uploadedAt":date(e,"uploaded_at"),"rowVersion":e.version()}),
        ))
    }
    pub async fn complete(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Session, id, ctx).await?;
        self.session_access(i, "write", ctx).await?;
        self.expected(i, input, ctx)?;
        self.not_terminal(i, ctx)?;
        self.not_expired(i, ctx).await?;
        if let (Some(a), Some(b)) = (
            input.string("checksumSha256").filter(|v| !v.is_empty()),
            ctx.entities[i]
                .string("checksum_sha256")
                .filter(|v| !v.is_empty()),
        ) && a != b
        {
            return Err(bad(
                "Attachment upload completion checksum does not match the session checksum",
            ));
        }
        ctx.entities[i].set("status", json!("validating"));
        self.save(ctx).await?;
        let completed:Result<Wire>=async{
            let e=ctx.entities[i].clone();let metadata=self.storage.head_object(&location(&e)).await?;if metadata.size_bytes!=e.integer("size_bytes") as f64{return Err(conflict("Attachment upload object size does not match the declared session size"));}
            let checksum=if let Some(declared)=input.string("checksumSha256").or_else(||e.string("checksum_sha256")).filter(|v|!v.is_empty()){if metadata.checksum_sha256.as_ref().map(|s|trim_js(js(s))).filter(|v|!v.is_empty()).is_some_and(|v|v!=declared){return Err(bad("Attachment upload object checksum does not match the declared session checksum"));}declared}else{js(&sha256(&self.storage.read_buffer(&location(&e)).await?))};
            ctx.entities[i].set_text("checksum_sha256",Some(checksum));if ctx.entities[i].data["uploaded_at"].is_null(){ctx.entities[i].set("uploaded_at",json!(clock_now()));}
            let(output,attachment_id)=self.create_from_session(i,request_id,ctx).await?;
            ctx.entities[i].set("status",json!("completed"));ctx.entities[i].set("completed_attachment_id",json!(attachment_id));ctx.entities[i].set("completed_at",json!(clock_now()));ctx.entities[i].set("failed_reason",Value::Null);self.save(ctx).await?;Ok(output)
        }.await;
        match completed {
            Ok(output) => Ok(output),
            Err(error) => {
                ctx.entities[i].set("status", json!("failed"));
                ctx.entities[i].set_text("failed_reason", Some(error.message.clone()));
                self.save(ctx).await?;
                Err(error)
            }
        }
    }
    pub async fn abort(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Session, id, ctx).await?;
        self.session_access(i, "write", ctx).await?;
        self.expected(i, input, ctx)?;
        if ctx.entities[i].str("status") == "completed" {
            return Err(conflict(format!(
                "Attachment upload session {id} is already completed"
            )));
        }
        if !Self::terminal(ctx.entities[i].str("status")) {
            self.storage.remove(&location(&ctx.entities[i])).await;
            ctx.entities[i].set("status", json!("aborted"));
            ctx.entities[i].set("aborted_at", json!(clock_now()));
            ctx.entities[i].set_text(
                "failed_reason",
                input.string("reason").filter(|v| !v.is_empty()),
            );
            self.save(ctx).await?;
            let e = &ctx.entities[i];
            let mut raw = BTreeMap::new();
            if let Some(reason) = e.raw.get("failed_reason") {
                raw.insert("reason".into(), reason.clone());
            }
            let meta = Wire::object(
                json!({"reason":e.data["failed_reason"],"operationType":e.data["operation_type"]}),
                &raw,
            );
            let target = e.id();
            self.audit(
                "attachment_upload_session.aborted",
                &target,
                meta,
                request_id,
                ctx,
            )
            .await?;
        }
        Ok(session_summary(&ctx.entities[i]))
    }

    async fn create_from_session(
        &self,
        i: usize,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<(Wire, String)> {
        let session = ctx.entities[i].clone();
        let is_version = session.str("operation_type") == "create-version";
        if session
            .string("checksum_sha256")
            .is_none_or(|v| v.is_empty())
        {
            return Err(bad(
                "Attachment upload session is missing checksum metadata",
            ));
        }
        let (latest, links) = if is_version {
            let base = session.text("base_attachment_id").ok_or_else(|| {
                bad("Attachment upload session is missing create-version metadata")
            })?;
            if session
                .string("change_note")
                .is_none_or(|v| trim_js(v).is_empty())
            {
                return Err(bad(
                    "Attachment upload session is missing create-version metadata",
                ));
            }
            let base = self.load(Table::Attachment, &base, ctx).await?;
            let latest = self.latest(base, ctx).await?;
            let latest_id = ctx.entities[latest].id();
            let links = self.links(&latest_id, ctx).await?;
            self.mutate(&ctx.entities[latest], &links, ctx)?;
            if ctx.entities[latest].str("status") != "active" {
                return Err(conflict(format!("Attachment {latest_id} is not active")));
            }
            (Some(latest), links)
        } else {
            let kind = session.text("target_type").ok_or_else(|| {
                bad("Attachment upload session is missing create-attachment metadata")
            })?;
            let target = session.text("target_id").ok_or_else(|| {
                bad("Attachment upload session is missing create-attachment metadata")
            })?;
            if ["category", "security_level", "relation_type"]
                .iter()
                .any(|key| session.text(key).is_none_or(|v| v.is_empty()))
            {
                return Err(bad(
                    "Attachment upload session is missing create-attachment metadata",
                ));
            }
            self.target_access(&kind, &target, "write", ctx).await?;
            (None, Vec::new())
        };
        let id = uuid()?;
        let uploaded = session.time("uploaded_at").unwrap_or_else(clock_now);
        let previous = latest.map(|n| ctx.entities[n].clone());
        let version_group = previous
            .as_ref()
            .map(group_id)
            .unwrap_or_else(|| id.clone());
        let version = previous.as_ref().map_or(1, |e| e.integer("version_no") + 1);
        if let Some(n) = latest {
            ctx.entities[n].set("version_group_id", json!(version_group));
            ctx.entities[n].set("is_latest", json!(false));
        }
        let category = session
            .text("category")
            .or_else(|| previous.as_ref().and_then(|e| e.text("category")));
        let security = session
            .text("security_level")
            .or_else(|| previous.as_ref().and_then(|e| e.text("security_level")));
        let mut attachment = Entity::new(
            Table::Attachment,
            json!({"id":id,"original_name":session.data["original_name"],"display_name":session.data["display_name"],"extension":session.data["extension"],"mime_type":session.data["mime_type"],"size_bytes":session.data["size_bytes"],"checksum_sha256":session.data["checksum_sha256"],"category":category,"security_level":security,"storage_provider":session.data["provider_type"],"storage_bucket":session.data["storage_bucket"],"storage_key":session.data["storage_key"],"status":"active","description":null,"version_group_id":version_group,"version_no":version,"is_latest":true,"is_final":false,"previous_attachment_id":previous.as_ref().map(Entity::id),"change_note":session.data["change_note"],"uploaded_by":ctx.user_id(),"uploaded_at":uploaded,"deleted_by":null,"deleted_at":null,"created_at":uploaded,"updated_at":uploaded}),
        );
        for key in [
            "original_name",
            "display_name",
            "mime_type",
            "change_note",
            "checksum_sha256",
        ] {
            if let Some(raw) = session.raw.get(key) {
                attachment.raw.insert(key.into(), raw.clone());
            }
        }
        if is_version {
            attachment.set_text("change_note", session.string("change_note").map(trim_js));
        }
        attachment.set_text(
            "description",
            session
                .string("description")
                .or_else(|| previous.as_ref().and_then(|e| e.string("description"))),
        );
        let attachment_index = ctx.track(attachment);
        let copy = if is_version {
            links
                .into_iter()
                .map(|l| {
                    (
                        l.str("target_type").to_owned(),
                        l.str("target_id").to_owned(),
                        l.str("relation_type").to_owned(),
                    )
                })
                .collect::<Vec<_>>()
        } else {
            vec![(
                session.str("target_type").into(),
                session.str("target_id").into(),
                session.str("relation_type").into(),
            )]
        };
        let mut created = Vec::new();
        for (kind, target, relation) in copy {
            let link = Entity::new(
                Table::Link,
                json!({"id":uuid()?,"attachment_id":id,"target_type":kind,"target_id":target,"relation_type":relation,"status":"active","linked_by":ctx.user_id(),"linked_at":uploaded,"unlinked_by":null,"unlinked_at":null}),
            );
            let n = ctx.track(link);
            created.push(n);
        }
        self.save(ctx).await?;
        let attachment = ctx.entities[attachment_index].clone();
        let mut raw = BTreeMap::new();
        if let Some(name) = attachment.raw.get("original_name") {
            raw.insert("fileName".into(), name.clone());
        }
        let metadata = if is_version {
            if let Some(note) = attachment.raw.get("change_note") {
                raw.insert("changeNote".into(), note.clone());
            }
            json!({"previousAttachmentId":attachment.data["previous_attachment_id"],"versionGroupId":version_group,"versionNo":version,"category":attachment.data["category"],"securityLevel":attachment.data["security_level"],"fileName":attachment.data["original_name"],"sizeBytes":attachment.data["size_bytes"],"changeNote":attachment.data["change_note"],"uploadSessionId":session.id()})
        } else {
            json!({"targetType":session.data["target_type"],"targetId":session.data["target_id"],"category":attachment.data["category"],"securityLevel":attachment.data["security_level"],"relationType":session.data["relation_type"],"fileName":attachment.data["original_name"],"sizeBytes":attachment.data["size_bytes"],"uploadSessionId":session.id()})
        };
        self.audit(
            if is_version {
                "attachment.version_created"
            } else {
                "attachment.uploaded"
            },
            &id,
            Wire::object(metadata, &raw),
            request_id,
            ctx,
        )
        .await?;
        let links = created
            .into_iter()
            .map(|n| ctx.entities[n].clone())
            .collect::<Vec<_>>();
        Ok((
            attachment_summary(&ctx.entities[attachment_index], &links, None),
            id,
        ))
    }

    async fn summary(&self, i: usize, links: &[Entity], ctx: &CallContext) -> Result<Wire> {
        let e = &ctx.entities[i];
        let ids = e.text("uploaded_by").into_iter().collect();
        let users = store::uploaders(&self.database, ids).await?;
        Ok(attachment_summary(e, links, users.first()))
    }
    pub async fn get(&self, id: &str, ctx: &mut CallContext) -> Result<Wire> {
        let (i, links) = self.readable(id, ctx).await?;
        self.summary(i, &links, ctx).await
    }
    pub async fn list(&self, input: &RequestData, ctx: &mut CallContext) -> Result<Wire> {
        let kind = input.text("targetType").unwrap_or_default();
        let id = input.text("targetId").unwrap_or_default();
        self.target_access(&kind, &id, "read", ctx).await?;
        let links = store::rows(
            &self.database,
            Table::Link,
            store::ReadFilter::LinksByTarget,
            vec![kind, id],
        )
        .await?;
        let ids = unique(
            links
                .iter()
                .map(|e| e.str("attachment_id").into())
                .collect(),
        );
        let attachments = store::attachments(
            &self.database,
            ids,
            input.text("category"),
            input.text("status").unwrap_or_else(|| "active".into()),
        )
        .await?;
        let visible = attachments
            .into_iter()
            .filter(|e| ctx.can_read_security(e))
            .collect::<Vec<_>>();
        self.list_summaries(visible, ctx).await
    }
    async fn list_summaries(
        &self,
        attachments: Vec<Entity>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let links =
            store::all_active_links(&self.database, attachments.iter().map(Entity::id).collect())
                .await?;
        let uploaders = store::uploaders(
            &self.database,
            unique(
                attachments
                    .iter()
                    .filter_map(|e| e.text("uploaded_by"))
                    .collect(),
            ),
        )
        .await?;
        let users = uploaders
            .into_iter()
            .map(|v| (v["id"].as_str().unwrap_or("").to_owned(), v))
            .collect::<HashMap<_, _>>();
        let mut result = Vec::new();
        for row in attachments {
            let n = ctx.track(row);
            let e = &ctx.entities[n];
            let own = links
                .iter()
                .filter(|l| l.str("attachment_id") == e.id())
                .cloned()
                .collect::<Vec<_>>();
            result.push(attachment_summary(
                e,
                &own,
                e.text("uploaded_by").as_ref().and_then(|id| users.get(id)),
            ));
        }
        Ok(Wire::array(result))
    }
    pub async fn history(&self, id: &str, ctx: &mut CallContext) -> Result<Wire> {
        let (i, _) = self.readable(id, ctx).await?;
        let group = group_id(&ctx.entities[i]);
        let mut indices = self.versions(&group, ctx).await?;
        if indices.is_empty() {
            indices.push(i);
        }
        indices.retain(|n| ctx.can_read_security(&ctx.entities[*n]));
        let users = store::uploaders(
            &self.database,
            unique(
                indices
                    .iter()
                    .filter_map(|n| ctx.entities[*n].text("uploaded_by"))
                    .collect(),
            ),
        )
        .await?
        .into_iter()
        .map(|v| (v["id"].as_str().unwrap_or("").to_owned(), v))
        .collect::<HashMap<_, _>>();
        let links = futures_util::future::try_join_all(indices.iter().map(|n| {
            let id = ctx.entities[*n].id();
            async move { store::links(&self.database, &id).await }
        }))
        .await?;
        let mut output = Vec::new();
        for (n, links) in indices.into_iter().zip(links) {
            let mut managed = Vec::new();
            for row in links {
                let p = ctx.track(row);
                managed.push(ctx.entities[p].clone());
            }
            let entity = &ctx.entities[n];
            output.push(attachment_summary(
                entity,
                &managed,
                entity
                    .text("uploaded_by")
                    .as_ref()
                    .and_then(|id| users.get(id)),
            ));
        }
        Ok(Wire::array(output))
    }
    pub async fn binary(
        &self,
        id: &str,
        kind: &str,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<BinaryPayload> {
        let (i, _) = self.readable(id, ctx).await?;
        let e = ctx.entities[i].clone();
        let preview = preview_kind(&e);
        if kind == "preview" && preview == "unsupported" {
            return Err(StorageFailure::http(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                format!("Attachment {id} does not support preview"),
            ));
        }
        if kind == "thumbnail" && preview != "image" {
            return Err(StorageFailure::http(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                format!("Attachment {id} does not have an available thumbnail"),
            ));
        }
        let body: Body = self.storage.open_read_stream(&location(&e)).await?;
        let mut meta = json!({"fileName":e.data["original_name"],"category":e.data["category"],"securityLevel":e.data["security_level"]});
        if kind != "download" {
            meta["versionGroupId"] = json!(group_id(&e));
            meta["versionNo"] = e.data["version_no"].clone();
        }
        if kind == "preview" {
            meta["previewKind"] = json!(preview);
        }
        let mut raw = BTreeMap::new();
        if let Some(name) = e.raw.get("original_name") {
            raw.insert("fileName".into(), name.clone());
        }
        let event = match kind {
            "preview" => "attachment.previewed",
            "thumbnail" => "attachment.thumbnail_viewed",
            _ => "attachment.downloaded",
        };
        self.audit(event, &e.id(), Wire::object(meta, &raw), request_id, ctx)
            .await?;
        Ok(BinaryPayload {
            body,
            mime: e
                .string("mime_type")
                .unwrap_or_else(|| js("application/octet-stream")),
            filename: e.string("original_name").unwrap_or_else(|| js("")),
            inline: kind != "download",
        })
    }

    pub async fn update(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Attachment, id, ctx).await?;
        let links = self.links(id, ctx).await?;
        self.mutate(&ctx.entities[i], &links, ctx)?;
        let before = audit_snapshot(&ctx.entities[i]);
        if input.has("displayName") {
            ctx.entities[i].set_text("display_name", input.string("displayName"));
        }
        if let Some(category) = input.text("category") {
            self.category(&category).await?;
            ctx.entities[i].set("category", json!(category));
        }
        if let Some(security) = input.text("securityLevel") {
            ctx.entities[i].set("security_level", json!(security));
        }
        if input.has("description") {
            ctx.entities[i].set_text(
                "description",
                input.string("description").filter(|s| !s.is_empty()),
            );
        }
        self.save(ctx).await?;
        let after = audit_snapshot(&ctx.entities[i]);
        let meta = Wire(format!("{{\"before\":{},\"after\":{}}}", before.0, after.0));
        self.audit(
            "attachment.metadata_updated",
            &ctx.entities[i].id(),
            meta,
            request_id,
            ctx,
        )
        .await?;
        self.get(id, ctx).await
    }
    pub async fn mark_final(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Attachment, id, ctx).await?;
        let links = self.links(id, ctx).await?;
        self.mutate(&ctx.entities[i], &links, ctx)?;
        if ctx.entities[i].str("status") != "active" {
            return Err(conflict(format!("Attachment {id} is not active")));
        }
        let group = group_id(&ctx.entities[i]);
        let rows = self.versions(&group, ctx).await?;
        ctx.entities[i].set("version_group_id", json!(group));
        ctx.entities[i].set("is_final", json!(true));
        for n in rows {
            if n != i && ctx.entities[n].boolean("is_final") {
                ctx.entities[n].set("is_final", json!(false));
            }
        }
        self.save(ctx).await?;
        let mut raw = BTreeMap::new();
        let note = input.string("note").filter(|s| !s.is_empty());
        if let Some(note) = note.as_ref() {
            raw.insert("note".into(), note.clone());
        }
        let meta = Wire::object(
            json!({"versionGroupId":group,"versionNo":ctx.entities[i].data["version_no"],"note":note.map(|s|s.to_utf8_lossy())}),
            &raw,
        );
        let target = ctx.entities[i].id();
        self.audit("attachment.final_marked", &target, meta, request_id, ctx)
            .await?;
        self.get(id, ctx).await
    }
    pub async fn clear_final(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Attachment, id, ctx).await?;
        let links = self.links(id, ctx).await?;
        self.mutate(&ctx.entities[i], &links, ctx)?;
        if ctx.entities[i].str("status") != "active" {
            return Err(conflict(format!("Attachment {id} is not active")));
        }
        let group = group_id(&ctx.entities[i]);
        let mut rows = self.versions(&group, ctx).await?;
        if !rows.contains(&i) {
            rows.push(i);
        }
        let mut changed = false;
        for n in rows {
            if ctx.entities[n].boolean("is_final") {
                ctx.entities[n].set("is_final", json!(false));
                changed = true;
            }
        }
        if changed {
            self.save(ctx).await?;
        }
        let mut raw = BTreeMap::new();
        if let Some(reason) = input.string("reason") {
            raw.insert("reason".into(), reason);
        }
        let meta = Wire::object(
            json!({"versionGroupId":group,"versionNo":ctx.entities[i].data["version_no"],"reason":input.text("reason")}),
            &raw,
        );
        let target = ctx.entities[i].id();
        self.audit("attachment.final_cleared", &target, meta, request_id, ctx)
            .await?;
        self.get(id, ctx).await
    }
    pub async fn void(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Attachment, id, ctx).await?;
        let links = self.links(id, ctx).await?;
        self.mutate(&ctx.entities[i], &links, ctx)?;
        if ctx.entities[i].str("status") != "active" {
            return Err(conflict(format!("Attachment {id} is not active")));
        }
        ctx.entities[i].set("status", json!("voided"));
        let operator = ctx.user_id();
        ctx.entities[i].set("deleted_by", json!(operator));
        ctx.entities[i].set("deleted_at", json!(clock_now()));
        ctx.entities[i].set("is_final", json!(false));
        if ctx.entities[i].boolean("is_latest") {
            ctx.entities[i].set("is_latest", json!(false));
            let group = group_id(&ctx.entities[i]);
            for n in self.versions(&group, ctx).await? {
                if n != i && ctx.entities[n].str("status") == "active" {
                    ctx.entities[n].set("is_latest", json!(true));
                    break;
                }
            }
        }
        self.save(ctx).await?;
        let mut raw = BTreeMap::new();
        if let Some(reason) = input.string("reason") {
            raw.insert("reason".into(), reason);
        }
        let meta = Wire::object(
            json!({"reason":input.text("reason"),"category":ctx.entities[i].data["category"],"securityLevel":ctx.entities[i].data["security_level"]}),
            &raw,
        );
        let target = ctx.entities[i].id();
        self.audit("attachment.voided", &target, meta, request_id, ctx)
            .await?;
        self.summary(i, &links, ctx).await
    }
    pub async fn link(
        &self,
        id: &str,
        input: &RequestData,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let (i, _) = self.readable(id, ctx).await?;
        let kind = input.text("targetType").unwrap_or_default();
        let target = input.text("targetId").unwrap_or_default();
        let relation = input
            .text("relationType")
            .unwrap_or_else(|| "normal".into());
        self.target_access(&kind, &target, "write", ctx).await?;
        let existing = store::rows(
            &self.database,
            Table::Link,
            store::ReadFilter::ExistingLink,
            vec![
                ctx.entities[i].id(),
                kind.clone(),
                target.clone(),
                relation.clone(),
            ],
        )
        .await?;
        if !existing.is_empty() {
            return self.get(id, ctx).await;
        }
        ctx.track(Entity::new(Table::Link,json!({"id":uuid()?,"attachment_id":ctx.entities[i].id(),"target_type":kind,"target_id":target,"relation_type":relation,"status":"active","linked_by":ctx.user_id(),"linked_at":clock_now(),"unlinked_by":null,"unlinked_at":null})));
        self.save(ctx).await?;
        self.audit(
            "attachment.linked",
            &ctx.entities[i].id(),
            Wire::value(json!({"targetType":kind,"targetId":target,"relationType":relation})),
            request_id,
            ctx,
        )
        .await?;
        let links = self.links(id, ctx).await?;
        self.summary(i, &links, ctx).await
    }
    pub async fn unlink(
        &self,
        id: &str,
        link_id: &str,
        request_id: Option<&str>,
        ctx: &mut CallContext,
    ) -> Result<Wire> {
        let i = self.load(Table::Attachment, id, ctx).await?;
        let row = store::find(&self.database, Table::Link, link_id).await?;
        let row = row
            .filter(|l| l.str("attachment_id") == ctx.entities[i].id())
            .ok_or_else(|| missing(format!("Attachment link {link_id} not found")))?;
        let n = ctx.track(row);
        let link = ctx.entities[n].clone();
        self.target_access(link.str("target_type"), link.str("target_id"), "write", ctx)
            .await?;
        if link.str("status") == "active" {
            ctx.entities[n].set("status", json!("unlinked"));
            let operator = ctx.user_id();
            ctx.entities[n].set("unlinked_by", json!(operator));
            ctx.entities[n].set("unlinked_at", json!(clock_now()));
            self.save(ctx).await?;
            self.audit("attachment.unlinked",&ctx.entities[i].id(),Wire::value(json!({"targetType":link.data["target_type"],"targetId":link.data["target_id"],"relationType":link.data["relation_type"]})),request_id,ctx).await?;
        }
        self.get(id, ctx).await
    }

    pub async fn center(&self, ctx: &mut CallContext) -> Result<Wire> {
        let types = [
            ("customer", "customer:read"),
            ("lead", "lead:read"),
            ("project", "project:read"),
            ("contract", "project:read"),
        ]
        .iter()
        .filter(|(_, p)| ctx.permission(p))
        .map(|(t, _)| *t)
        .collect::<Vec<_>>();
        if types.is_empty() {
            return Ok(Wire::array(Vec::new()));
        }
        // The closed target-type literals are source enums, never request interpolation.
        let target_links = store::rows(
            &self.database,
            Table::Link,
            store::ReadFilter::Center(types.clone()),
            Vec::new(),
        )
        .await?;
        let ids = unique(
            target_links
                .iter()
                .map(|e| e.str("attachment_id").into())
                .collect(),
        );
        let rows = store::attachments(&self.database, ids, None, "active".into())
            .await?
            .into_iter()
            .filter(|e| ctx.can_read_security(e))
            .collect::<Vec<_>>();
        let attachments = rows
            .iter()
            .map(|e| (e.id(), e.clone()))
            .collect::<HashMap<_, _>>();
        let visible_links = target_links
            .iter()
            .filter(|l| attachments.contains_key(l.str("attachment_id")))
            .cloned()
            .collect::<Vec<_>>();
        let links =
            store::all_active_links(&self.database, rows.iter().map(Entity::id).collect()).await?;
        let mut lookup = HashMap::new();
        let mut contracts = Vec::new();
        let mut project_ids = Vec::new();
        for kind in ["customer", "lead", "contract"] {
            let ids = unique(
                visible_links
                    .iter()
                    .filter(|l| l.str("target_type") == kind)
                    .map(|l| l.str("target_id").into())
                    .collect(),
            );
            let targets = store::targets(&self.database, kind, ids).await?;
            for row in targets {
                if kind == "contract" {
                    if let Some(id) = row["projectId"].as_str() {
                        project_ids.push(id.into());
                    }
                    contracts.push(row);
                } else {
                    lookup.insert(format!("{kind}:{}",row["id"].as_str().unwrap_or("")),json!({"targetType":kind,"targetId":row["id"],"targetNo":row["number"],"targetName":row["name"],"targetOwnerName":null}));
                }
            }
        }
        project_ids.extend(
            visible_links
                .iter()
                .filter(|l| l.str("target_type") == "project")
                .map(|l| l.str("target_id").to_owned()),
        );
        let projects = store::targets(&self.database, "project", unique(project_ids)).await?;
        for row in &projects {
            if visible_links.iter().any(|l| {
                l.str("target_type") == "project"
                    && l.str("target_id") == row["id"].as_str().unwrap_or("")
            }) {
                lookup.insert(format!("project:{}",row["id"].as_str().unwrap_or("")),json!({"targetType":"project","targetId":row["id"],"targetNo":row["number"],"targetName":row["name"],"targetOwnerName":null}));
            }
        }
        for row in contracts {
            let name = projects
                .iter()
                .find(|p| p["id"] == row["projectId"])
                .map(|p| p["name"].clone())
                .unwrap_or_else(|| row["number"].clone());
            lookup.insert(format!("contract:{}",row["id"].as_str().unwrap_or("")),json!({"targetType":"contract","targetId":row["id"],"targetNo":row["number"],"targetName":name,"targetOwnerName":null}));
        }
        let users = store::uploaders(
            &self.database,
            unique(rows.iter().filter_map(|e| e.text("uploaded_by")).collect()),
        )
        .await?
        .into_iter()
        .map(|v| (v["id"].as_str().unwrap_or("").to_owned(), v))
        .collect::<HashMap<_, _>>();
        let mut seen = HashSet::new();
        let mut selected = Vec::new();
        for link in target_links {
            let Some(attachment) = attachments.get(link.str("attachment_id")) else {
                continue;
            };
            let key = format!(
                "{}:{}:{}",
                link.str("target_type"),
                link.str("target_id"),
                attachment.id()
            );
            if !seen.insert(key) {
                continue;
            }
            let Some(target) = lookup.get(&format!(
                "{}:{}",
                link.str("target_type"),
                link.str("target_id")
            )) else {
                continue;
            };
            let own = links
                .iter()
                .filter(|l| l.str("attachment_id") == attachment.id())
                .cloned()
                .collect::<Vec<_>>();
            selected.push((
                attachment.time("uploaded_at"),
                Wire::nested(
                    target.clone(),
                    "attachment",
                    attachment_summary(
                        attachment,
                        &own,
                        attachment
                            .text("uploaded_by")
                            .as_ref()
                            .and_then(|id| users.get(id)),
                    ),
                ),
            ));
        }
        selected.sort_by_key(|entry| std::cmp::Reverse(entry.0));
        Ok(Wire::array(selected.into_iter().map(|(_, w)| w).collect()))
    }
}
fn unique(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter(|v| seen.insert(v.clone()))
        .collect()
}
fn link_summary(e: &Entity) -> Value {
    json!({"id":e.data["id"],"attachmentId":e.data["attachment_id"],"targetType":e.data["target_type"],"targetId":e.data["target_id"],"relationType":e.data["relation_type"],"status":e.data["status"],"linkedBy":e.data["linked_by"],"linkedAt":date(e,"linked_at"),"unlinkedBy":e.data["unlinked_by"],"unlinkedAt":date(e,"unlinked_at")})
}
fn raw_mapping(e: &Entity, mapping: &[(&str, &str)]) -> BTreeMap<String, JsString> {
    mapping
        .iter()
        .filter_map(|(column, key)| e.raw.get(*column).cloned().map(|v| ((*key).into(), v)))
        .collect()
}
fn attachment_summary(e: &Entity, links: &[Entity], uploader: Option<&Value>) -> Wire {
    let preview = preview_kind(e) != "unsupported";
    let thumbnail = preview_kind(e) == "image";
    let value = json!({"id":e.data["id"],"originalName":e.data["original_name"],"displayName":e.data["display_name"],"extension":e.data["extension"],"mimeType":e.data["mime_type"],"sizeBytes":e.data["size_bytes"],"checksumSha256":e.data["checksum_sha256"],"category":e.data["category"],"securityLevel":e.data["security_level"],"status":e.data["status"],"description":e.data["description"],"previousAttachmentId":e.data["previous_attachment_id"],"changeNote":e.data["change_note"],"versionGroupId":group_id(e),"versionNo":e.data["version_no"],"isLatest":e.data["is_latest"],"isFinal":e.data["is_final"],"previewSupported":preview,"previewMimeType":if preview{e.data["mime_type"].clone()}else{Value::Null},"previewUrl":if preview{Some(format!("/api/attachments/{}/preview",e.id()))}else{None},"thumbnailAvailable":thumbnail,"thumbnailUrl":if thumbnail{Some(format!("/api/attachments/{}/thumbnail",e.id()))}else{None},"uploadedBy":e.data["uploaded_by"],"uploadedByName":uploader.map(|u|if !u["displayName"].is_null(){u["displayName"].clone()}else{u["username"].clone()}).unwrap_or(Value::Null),"uploadedAt":date(e,"uploaded_at"),"updatedAt":date(e,"updated_at"),"deletedAt":date(e,"deleted_at"),"links":links.iter().map(link_summary).collect::<Vec<_>>()});
    let mut raw = raw_mapping(
        e,
        &[
            ("original_name", "originalName"),
            ("display_name", "displayName"),
            ("mime_type", "mimeType"),
            ("checksum_sha256", "checksumSha256"),
            ("description", "description"),
            ("change_note", "changeNote"),
        ],
    );
    if preview && let Some(mime) = e.raw.get("mime_type") {
        raw.insert("previewMimeType".into(), mime.clone());
    }
    Wire::object(value, &raw)
}
fn session_summary(e: &Entity) -> Wire {
    let mut value = json!({"id":e.data["id"],"operationType":e.data["operation_type"],"status":e.data["status"],"uploadMode":e.data["upload_mode"],"providerType":e.data["provider_type"],"targetType":e.data["target_type"],"targetId":e.data["target_id"],"baseAttachmentId":e.data["base_attachment_id"],"completedAttachmentId":e.data["completed_attachment_id"],"originalName":e.data["original_name"],"displayName":e.data["display_name"],"extension":e.data["extension"],"mimeType":e.data["mime_type"],"sizeBytes":e.data["size_bytes"],"maxSizeBytes":e.data["max_size_bytes"],"checksumSha256":e.data["checksum_sha256"],"category":e.data["category"],"securityLevel":e.data["security_level"],"relationType":e.data["relation_type"],"description":e.data["description"],"changeNote":e.data["change_note"],"failedReason":e.data["failed_reason"],"rowVersion":e.version(),"createdBy":e.data["created_by"]});
    for (column, key) in [
        ("expires_at", "expiresAt"),
        ("uploaded_at", "uploadedAt"),
        ("completed_at", "completedAt"),
        ("aborted_at", "abortedAt"),
        ("created_at", "createdAt"),
        ("updated_at", "updatedAt"),
    ] {
        value[key] = date(e, column);
    }
    Wire::object(
        value,
        &raw_mapping(
            e,
            &[
                ("original_name", "originalName"),
                ("display_name", "displayName"),
                ("mime_type", "mimeType"),
                ("description", "description"),
                ("change_note", "changeNote"),
                ("failed_reason", "failedReason"),
            ],
        ),
    )
}
fn audit_snapshot(e: &Entity) -> Wire {
    Wire::object(
        json!({"displayName":e.data["display_name"],"category":e.data["category"],"securityLevel":e.data["security_level"],"description":e.data["description"],"status":e.data["status"],"versionGroupId":group_id(e),"versionNo":e.data["version_no"],"isLatest":e.data["is_latest"],"isFinal":e.data["is_final"]}),
        &raw_mapping(
            e,
            &[
                ("display_name", "displayName"),
                ("description", "description"),
            ],
        ),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::js_json::decode_string;
    use serde_json::value::RawValue;
    fn canonical(raw: &str) -> String {
        if raw.starts_with('"') {
            decode_string(raw)
                .unwrap_or_else(|_| panic!("original helper string"))
                .json()
        } else {
            serde_json::from_str::<Value>(raw)
                .unwrap_or_else(|_| panic!("original helper JSON"))
                .to_string()
        }
    }
    #[test]
    fn original_private_helpers_match_seventy_source_cases() {
        let corpus: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ij/j-behavior.json"))
                .unwrap_or_else(|_| panic!("J pure helper corpus"));
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let args: Vec<&RawValue> =
                serde_json::from_str(case["argsRaw"].as_str().unwrap_or("[]")).unwrap_or_default();
            let text = || {
                args.first()
                    .and_then(|v| decode_string(v.get()).ok())
                    .unwrap_or_else(|| js(""))
            };
            let result: Result<Wire> = match case["method"].as_str().unwrap_or("") {
                "sanitizeOriginalName" => original_name(text()).map(|v| Wire(v.json())),
                "extractExtension" => Ok(Wire(extension(&text()).json())),
                "assertAllowedExtension" => {
                    check_extension(&text()).map(|_| Wire::value(Value::Null))
                }
                "defaultSecurityLevel" => Ok(Wire::value(json!(default_security(
                    &text().to_utf8_lossy()
                )))),
                "previewKind" => {
                    let value: Value = serde_json::from_str(args[0].get()).unwrap_or(Value::Null);
                    let entity = Entity::new(
                        Table::Attachment,
                        json!({"extension":value["extension"],"mime_type":value["mimeType"]}),
                    );
                    Ok(Wire::value(json!(preview_kind(&entity))))
                }
                _ => panic!("unknown original helper"),
            };
            if case["expected"]["success"] == true {
                let output = result.unwrap_or_else(|_| panic!("helper {}", case["name"]));
                assert_eq!(
                    canonical(&output.0),
                    canonical(case["expected"]["resultRaw"].as_str().unwrap_or("null")),
                    "{}",
                    case["name"]
                );
            } else {
                let error = result
                    .err()
                    .unwrap_or_else(|| panic!("must reject {}", case["name"]));
                assert_eq!(
                    error.status.map(|v| v.as_u16()),
                    case["expected"]["status"].as_u64().map(|v| v as u16)
                );
                assert_eq!(
                    error.message.to_utf8_lossy(),
                    case["expected"]["message"].as_str().unwrap_or(""),
                    "{}",
                    case["name"]
                );
            }
        }
    }
}
