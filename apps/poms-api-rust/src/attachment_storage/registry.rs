use super::{
    AttachmentStorage, ObjectLocation, ObjectMetadata, PresignedPutTarget, StorageFailure,
    UploadPlan, model::RuntimeConfig, store,
};
use axum::{body::Body, http::StatusCode};
use chrono::{DateTime, Datelike, Utc};
use futures_util::StreamExt;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

// These capabilities deliberately do not implement Debug/Serialize. In particular
// a failed PUT must not discard the captured runtime needed for safe compensation.
pub(crate) struct CompletionAttempt {
    source: ObjectLocation,
    final_location: ObjectLocation,
    runtime: RuntimeConfig,
    routing: Vec<Value>,
}

#[cfg(test)]
mod k56_snapshot_tests {
    use super::*;
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };
    const SHA_A: &str = "d53eda7a637c99cc7fb566d96e9fa109bf15c478410a3f5eb4d4c4e26cd081f6";
    const SHA_B: &str = "c422e7070cb1cb455b5de9afee0d975e303d0239c72030cd7414ab5c382d3ae8";

    #[tokio::test]
    async fn actual_buffer_is_hashed_even_with_declared_checksum() {
        let (bytes, hash) = bounded_snapshot(Body::from(vec![b'A'; 64]), 64, 64, &[SHA_A.into()])
            .await
            .unwrap_or_else(|_| panic!("valid actual body"));
        assert_eq!(bytes, vec![b'A'; 64]);
        assert_eq!(hash, SHA_A);
        let error = bounded_snapshot(Body::from(vec![b'B'; 64]), 64, 64, &[SHA_A.into()])
            .await
            .err()
            .unwrap_or_else(|| panic!("same size is not same content"));
        assert_eq!(error.status, Some(StatusCode::BAD_REQUEST));
    }
    #[tokio::test]
    async fn undeclared_checksum_is_actual_hash_not_head_or_etag() {
        let (bytes, hash) = bounded_snapshot(Body::from(vec![b'B'; 64]), 64, 64, &[])
            .await
            .unwrap_or_else(|_| panic!("actual body"));
        assert_eq!(bytes.len(), 64);
        assert_eq!(hash, SHA_B);
    }
    #[tokio::test]
    async fn both_nonempty_hash_expectations_are_required() {
        assert!(
            bounded_snapshot(
                Body::from(vec![b'A'; 64]),
                64,
                64,
                &[SHA_A.into(), SHA_B.into()]
            )
            .await
            .is_err()
        );
        assert!(
            bounded_snapshot(Body::from(vec![b'A'; 64]), 64, 64, &[SHA_A.to_uppercase()])
                .await
                .is_ok()
        );
    }
    #[tokio::test]
    async fn extra_byte_stops_stream_without_polling_remainder() {
        let observed = Arc::new(AtomicUsize::new(0));
        let counter = observed.clone();
        let chunks = vec![
            Ok::<_, std::io::Error>(vec![b'A'; 64]),
            Ok(vec![b'A'; 1]),
            Ok(vec![b'A'; 64]),
        ];
        let stream = futures_util::stream::iter(chunks).inspect(move |_| {
            counter.fetch_add(1, Ordering::SeqCst);
        });
        let error = bounded_snapshot(Body::from_stream(stream), 64, 64, &[])
            .await
            .err()
            .unwrap_or_else(|| panic!("overrun"));
        assert_eq!(error.status, Some(StatusCode::CONFLICT));
        assert_eq!(
            observed.load(Ordering::SeqCst),
            2,
            "must not read after overrun"
        );
    }
    #[tokio::test]
    async fn short_body_and_stream_error_never_produce_snapshot() {
        assert!(
            bounded_snapshot(Body::from(vec![b'A'; 63]), 64, 64, &[])
                .await
                .is_err()
        );
        let stream = futures_util::stream::iter(vec![
            Ok(vec![b'A'; 32]),
            Err(std::io::Error::other("controlled stream failure")),
        ]);
        assert!(
            bounded_snapshot(Body::from_stream(stream), 64, 64, &[])
                .await
                .is_err()
        );
    }
    #[tokio::test]
    async fn invalid_size_and_captured_max_rejected_before_allocation() {
        for (declared, max) in [
            (0, 64),
            (-1, 64),
            (65, 64),
            (i64::from(i32::MAX) + 1, i64::MAX),
        ] {
            assert!(
                bounded_snapshot(Body::empty(), declared, max, &[])
                    .await
                    .is_err()
            );
        }
    }
    #[test]
    fn final_namespace_preserves_original_prefix_and_attempt_identity() {
        let at = DateTime::parse_from_rfc3339("2026-11-04T00:00:00Z")
            .unwrap_or_else(|_| panic!("date"))
            .with_timezone(&Utc);
        let a = apply_prefix(
            Some("original/prefix"),
            &dated(
                "attachments/completed",
                "attachment/nonce-a",
                "original.pdf",
                at,
            ),
        );
        let b = apply_prefix(
            Some("original/prefix"),
            &dated(
                "attachments/completed",
                "attachment/nonce-b",
                "original.pdf",
                at,
            ),
        );
        assert_ne!(a, b);
        assert!(a.starts_with("original/prefix/attachments/completed/"));
        assert!(matches_prefix(&a, Some("original/prefix")));
        assert!(!matches_prefix(
            "original/prefix-sibling/object",
            Some("original/prefix")
        ));
    }
}
impl CompletionAttempt {
    pub(crate) fn location(&self) -> ObjectLocation {
        self.final_location.clone()
    }
    pub(crate) fn routing(&self) -> Vec<Value> {
        self.routing.clone()
    }
}
pub(crate) struct CompletionSnapshot {
    pub(crate) size_bytes: i64,
    pub(crate) checksum: String,
}
pub(crate) struct StagingCleanup {
    location: ObjectLocation,
    runtime: RuntimeConfig,
}

async fn bounded_snapshot(
    body: Body,
    declared: i64,
    maximum: i64,
    expected: &[String],
) -> Result<(Vec<u8>, String), StorageFailure> {
    if declared <= 0 || declared > maximum || i32::try_from(declared).is_err() {
        return Err(StorageFailure::http(
            StatusCode::BAD_REQUEST,
            "Invalid attachment snapshot size",
        ));
    }
    let limit = usize::try_from(declared).map_err(|_| StorageFailure::internal())?;
    let mut stream = body.into_data_stream();
    let mut buffer = Vec::new();
    let mut digest = Sha256::new();
    while let Some(chunk) = stream.next().await {
        let chunk =
            chunk.map_err(|_| StorageFailure::unexpected("Attachment object read failed"))?;
        if buffer
            .len()
            .checked_add(chunk.len())
            .is_none_or(|n| n > limit)
        {
            return Err(StorageFailure::http(
                StatusCode::CONFLICT,
                "Attachment upload object size does not match the declared session size",
            ));
        }
        digest.update(&chunk);
        buffer.extend_from_slice(&chunk);
    }
    if buffer.len() != limit {
        return Err(StorageFailure::http(
            StatusCode::CONFLICT,
            "Attachment upload object size does not match the declared session size",
        ));
    }
    let checksum = digest
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    if expected
        .iter()
        .filter(|s| !s.is_empty())
        .any(|s| !s.eq_ignore_ascii_case(&checksum))
    {
        return Err(StorageFailure::http(
            StatusCode::BAD_REQUEST,
            "Attachment upload object checksum does not match the declared session checksum",
        ));
    }
    Ok((buffer, checksum))
}

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
        self.location_runtime_proof(location)
            .await
            .map(|(runtime, _)| runtime)
    }
    async fn location_runtime_proof(
        &self,
        location: &ObjectLocation,
    ) -> Result<(RuntimeConfig, Value), StorageFailure> {
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
            Some(bucket.clone()),
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
        let stamp = |id: Option<&str>, version: Option<i32>| json!({"provider":location.storage_provider,"bucket":bucket,"key":location.storage_key,"configId":id,"configVersion":version});
        match configs.first() {
            Some(v) => Ok((
                self.runtime_config(v)?,
                stamp(Some(&v.id), Some(v.row_version)),
            )),
            None if local => Ok((RuntimeConfig::implicit_local(), stamp(None, None))),
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
    pub(crate) async fn completion_attempt(
        &self,
        source: &ObjectLocation,
        attachment_id: &str,
        nonce: &str,
        original_name: &str,
    ) -> Result<CompletionAttempt, StorageFailure> {
        uuid::Uuid::parse_str(attachment_id).map_err(|_| StorageFailure::internal())?;
        uuid::Uuid::parse_str(nonce).map_err(|_| StorageFailure::internal())?;
        let (runtime, source_proof) = self.location_runtime_proof(source).await?;
        let key = apply_prefix(
            runtime.key_prefix.as_deref(),
            &dated(
                "attachments/completed",
                &format!("{attachment_id}/{nonce}"),
                &format!("original{}", extension(original_name)),
                crate::auth::model::clock_now(),
            ),
        );
        if key.chars().count() > 1024 || key == source.storage_key {
            return Err(StorageFailure::http(
                StatusCode::BAD_REQUEST,
                "Invalid attachment final key",
            ));
        }
        let final_location = ObjectLocation {
            storage_provider: source.storage_provider.clone(),
            storage_bucket: source.storage_bucket.clone(),
            storage_key: key,
        };
        let (_, final_proof) = self.location_runtime_proof(&final_location).await?;
        if source_proof["configId"] != final_proof["configId"]
            || source_proof["configVersion"] != final_proof["configVersion"]
        {
            return Err(StorageFailure::http(
                StatusCode::CONFLICT,
                "Attachment final location routing changed",
            ));
        }
        Ok(CompletionAttempt {
            source: source.clone(),
            final_location,
            runtime,
            routing: vec![source_proof, final_proof],
        })
    }
    pub(crate) async fn prepare_completion_snapshot(
        &self,
        attempt: &CompletionAttempt,
        declared: i64,
        maximum: i64,
        expected: &[String],
        content_type: Option<&str>,
    ) -> Result<CompletionSnapshot, StorageFailure> {
        let body = match attempt.runtime.provider_type.as_str() {
            "local" => self.local_read(&attempt.source.storage_key).await?,
            "huawei-obs-s3" => {
                self.obs_read(&attempt.runtime, &attempt.source.storage_key)
                    .await?
            }
            _ => return Err(StorageFailure::internal()),
        };
        let (buffer, checksum) = bounded_snapshot(body, declared, maximum, expected).await?;
        let size_bytes = i64::try_from(buffer.len()).map_err(|_| StorageFailure::internal())?;
        self.put_runtime(
            &attempt.runtime,
            &attempt.final_location.storage_key,
            &buffer,
            content_type,
        )
        .await?;
        Ok(CompletionSnapshot {
            size_bytes,
            checksum,
        })
    }
    pub(crate) async fn discard_completion_attempt(
        &self,
        attempt: &CompletionAttempt,
    ) -> Result<(), StorageFailure> {
        self.delete_captured(&attempt.runtime, &attempt.final_location)
            .await
    }
    pub(crate) async fn capture_staging_cleanup(
        &self,
        location: &ObjectLocation,
    ) -> Result<StagingCleanup, StorageFailure> {
        let runtime = self.location_runtime(location).await?;
        Ok(StagingCleanup {
            location: location.clone(),
            runtime,
        })
    }
    pub(crate) async fn remove_captured_staging(
        &self,
        cleanup: &StagingCleanup,
    ) -> Result<(), StorageFailure> {
        self.delete_captured(&cleanup.runtime, &cleanup.location)
            .await
    }
    async fn delete_captured(
        &self,
        runtime: &RuntimeConfig,
        location: &ObjectLocation,
    ) -> Result<(), StorageFailure> {
        match runtime.provider_type.as_str() {
            "local" => self.local_delete(&location.storage_key).await,
            "huawei-obs-s3" => self.obs_delete(runtime, &location.storage_key).await,
            _ => Err(StorageFailure::internal()),
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
