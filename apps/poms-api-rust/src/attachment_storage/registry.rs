use super::{
    AttachmentStorage, ObjectLocation, ObjectMetadata, PresignedPutTarget, StorageFailure,
    UploadPlan, model::RuntimeConfig, store,
};
use axum::{body::Body, http::StatusCode};
use chrono::{DateTime, Datelike, Utc};
use futures_util::StreamExt;

fn normalized(value: &str) -> String {
    value.replace('\\', "/").trim_matches('/').into()
}
fn apply_prefix(prefix: Option<&str>, key: &str) -> String {
    let key = normalized(key);
    let prefix = prefix.map(normalized).unwrap_or_default();
    if prefix.is_empty() {
        key
    } else {
        format!("{prefix}/{key}")
    }
}
fn matches_prefix(key: &str, prefix: Option<&str>) -> bool {
    let Some(prefix) = prefix.filter(|p| !p.is_empty()) else {
        return true;
    };
    let prefix = normalized(prefix);
    let key = normalized(key);
    key == prefix || key.starts_with(&format!("{prefix}/"))
}
fn extension(name: &str) -> String {
    // Node path.extname uses the basename, treats .name as no extension and . as empty.
    let base = name.rsplit('/').next().unwrap_or(name);
    if matches!(base, "." | "..") {
        return ".bin".into();
    }
    match base.rfind('.') {
        Some(at) if at > 0 => base[at..].to_lowercase(),
        _ => ".bin".into(),
    }
}
fn dated(prefix: &str, id: &str, name: &str, at: DateTime<Utc>) -> String {
    format!(
        "{prefix}/{:04}/{:02}/{:02}/{id}/{name}",
        at.year(),
        at.month(),
        at.day()
    )
}
impl AttachmentStorage {
    async fn default_runtime(&self) -> Result<RuntimeConfig, StorageFailure> {
        match self.default_config().await? {
            None => Ok(RuntimeConfig::implicit_local()),
            Some(config) => {
                if !config.enabled || config.status != "active" {
                    return Err(StorageFailure::http(
                        StatusCode::BAD_REQUEST,
                        "Default attachment storage provider is not active.",
                    ));
                }
                self.runtime_config(&config)
            }
        }
    }
    async fn location_runtime(
        &self,
        location: &ObjectLocation,
    ) -> Result<RuntimeConfig, StorageFailure> {
        let local = location.storage_provider == "local"
            && location
                .storage_bucket
                .as_ref()
                .is_none_or(|v| v.is_empty());
        let bucket = if local {
            None
        } else {
            location.storage_bucket.clone()
        };
        let mut configs = store::select(
            &self.database,
            Some(location.storage_provider.clone()),
            None,
            None,
            Some(bucket),
            None,
            false,
        )
        .await?;
        configs.retain(|v| matches_prefix(&location.storage_key, v.key_prefix.as_deref()));
        configs.sort_by_key(|v| {
            std::cmp::Reverse(
                v.key_prefix
                    .as_ref()
                    .map_or(0, |v| v.encode_utf16().count()),
            )
        });
        match configs.first() {
            Some(v) => self.runtime_config(v),
            None if local => Ok(RuntimeConfig::implicit_local()),
            None => Err(StorageFailure::http(
                StatusCode::NOT_FOUND,
                format!(
                    "Attachment storage provider config for {}/{} not found",
                    location.storage_provider,
                    location.storage_bucket.as_deref().unwrap_or("default")
                ),
            )),
        }
    }
    pub async fn create_original_upload_plan(
        &self,
        session_id: &str,
        original_name: &str,
        _size_bytes: f64,
        created_at: Option<DateTime<Utc>>,
    ) -> Result<UploadPlan, StorageFailure> {
        let config = self.default_runtime().await?;
        let key = dated(
            "attachments/uploads",
            session_id,
            &format!("original{}", extension(original_name)),
            created_at.unwrap_or_else(crate::auth::model::clock_now),
        );
        Ok(UploadPlan {
            location: ObjectLocation {
                storage_provider: config.provider_type.clone(),
                storage_bucket: config.bucket,
                storage_key: apply_prefix(config.key_prefix.as_deref(), &key),
            },
            upload_mode: if config.provider_type == "local" {
                "proxy"
            } else {
                "presigned-put"
            }
            .into(),
        })
    }
    pub async fn save_original(
        &self,
        attachment_id: &str,
        original_name: &str,
        body: &[u8],
        uploaded_at: Option<DateTime<Utc>>,
    ) -> Result<ObjectLocation, StorageFailure> {
        let config = self.default_runtime().await?;
        let key = apply_prefix(
            config.key_prefix.as_deref(),
            &dated(
                "attachments",
                attachment_id,
                &format!("original{}", extension(original_name)),
                uploaded_at.unwrap_or_else(crate::auth::model::clock_now),
            ),
        );
        self.put_runtime(&config, &key, body, None).await
    }
    pub async fn save_download_package(
        &self,
        package_id: &str,
        file_name: &str,
        body: &[u8],
        created_at: Option<DateTime<Utc>>,
    ) -> Result<ObjectLocation, StorageFailure> {
        let mut safe = String::new();
        let mut replaced = false;
        for c in file_name.chars() {
            if "\\/:*?\"<>|".contains(c) {
                if !replaced {
                    safe.push('_');
                }
                replaced = true;
            } else {
                safe.push(c);
                replaced = false;
            }
        }
        if safe.is_empty() {
            safe = format!("{package_id}.zip");
        }
        let config = self.default_runtime().await?;
        let key = apply_prefix(
            config.key_prefix.as_deref(),
            &dated(
                "attachment-download-packages",
                package_id,
                &safe,
                created_at.unwrap_or_else(crate::auth::model::clock_now),
            ),
        );
        self.put_runtime(&config, &key, body, Some("application/zip"))
            .await
    }
    async fn put_runtime(
        &self,
        config: &RuntimeConfig,
        key: &str,
        body: &[u8],
        content_type: Option<&str>,
    ) -> Result<ObjectLocation, StorageFailure> {
        match config.provider_type.as_str() {
            "local" => self.local_put(key, body).await,
            "huawei-obs-s3" => self.obs_put(config, key, body, content_type).await,
            _ => Err(StorageFailure::unexpected(
                "Cannot read properties of undefined (reading 'putObject')",
            )),
        }
    }
    pub async fn save_upload_session_object(
        &self,
        location: &ObjectLocation,
        body: &[u8],
        content_type: Option<&str>,
    ) -> Result<ObjectLocation, StorageFailure> {
        let config = self.location_runtime(location).await?;
        self.put_runtime(&config, &location.storage_key, body, content_type)
            .await
    }
    pub async fn create_presigned_put_target(
        &self,
        location: &ObjectLocation,
        content_type: Option<&str>,
        checksum_sha256: Option<&str>,
        expires_at: DateTime<Utc>,
    ) -> Result<PresignedPutTarget, StorageFailure> {
        let config = self.location_runtime(location).await?;
        if config.provider_type != "huawei-obs-s3" {
            return Err(StorageFailure::http(
                StatusCode::BAD_REQUEST,
                format!(
                    "Attachment storage provider {} does not support presigned uploads.",
                    location.storage_provider
                ),
            ));
        }
        super::obs_s3::presign(
            &config,
            &location.storage_key,
            content_type,
            checksum_sha256,
            expires_at,
            crate::auth::model::clock_now(),
        )
    }
    pub async fn head_object(
        &self,
        location: &ObjectLocation,
    ) -> Result<ObjectMetadata, StorageFailure> {
        let config = self.location_runtime(location).await?;
        match config.provider_type.as_str() {
            "local" => self.local_head(&location.storage_key).await,
            "huawei-obs-s3" => self.obs_head(&config, &location.storage_key).await,
            _ => Err(StorageFailure::internal()),
        }
    }
    pub async fn open_read_stream(
        &self,
        location: &ObjectLocation,
    ) -> Result<Body, StorageFailure> {
        let config = self.location_runtime(location).await?;
        match config.provider_type.as_str() {
            "local" => self.local_read(&location.storage_key).await,
            "huawei-obs-s3" => self.obs_read(&config, &location.storage_key).await,
            _ => Err(StorageFailure::internal()),
        }
    }
    pub async fn read_buffer(&self, location: &ObjectLocation) -> Result<Vec<u8>, StorageFailure> {
        let mut stream = self.open_read_stream(location).await?.into_data_stream();
        let mut result = Vec::new();
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(bytes) => result.extend_from_slice(&bytes),
                Err(error) => {
                    let inner = error.into_inner();
                    if let Some(error) = inner.downcast_ref::<StorageFailure>() {
                        return Err(error.clone());
                    }
                    return Err(StorageFailure::unexpected(inner.to_string()));
                }
            }
        }
        Ok(result)
    }
    pub async fn remove(&self, location: &ObjectLocation) {
        let _ = self.delete_object(location).await;
    }
    async fn delete_object(&self, location: &ObjectLocation) -> Result<(), StorageFailure> {
        let config = self.location_runtime(location).await?;
        match config.provider_type.as_str() {
            "local" => self.local_delete(&location.storage_key).await,
            "huawei-obs-s3" => self.obs_delete(&config, &location.storage_key).await,
            _ => Err(StorageFailure::internal()),
        }
    }
    pub(crate) async fn test_runtime(
        &self,
        config: &RuntimeConfig,
    ) -> Result<String, StorageFailure> {
        match config.provider_type.as_str() {
            "local" => self.local_test().await,
            "huawei-obs-s3" => {
                self.obs_request(config, reqwest::Method::HEAD, None, &[], None)
                    .await?;
                Ok(
                    "Huawei OBS S3-compatible bucket is reachable with the configured credentials."
                        .into(),
                )
            }
            _ => Err(StorageFailure::unexpected(
                "Attachment storage provider connection test failed.",
            )),
        }
    }
}
