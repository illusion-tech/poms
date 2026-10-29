//! Root-run JSONL acceptance driver, restricted to the new IJ database and OBS
//! fixtures. Config/credentials stay on stdin/environment; no product API added.
use std::io::{self, BufRead, Read, Write};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use chrono::{DateTime, Utc};
use futures_util::StreamExt;
use poms_api_rust::{
    attachment_storage::{AttachmentStorage, ObjectLocation, StorageFailure},
    auth::js_json::JsString,
    config::Config,
    database::Database,
};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::Row;

const MAX_LINE: usize = 32 * 1024 * 1024;
const MAX_BODY: usize = 16 * 1024 * 1024;
const MAX_READ: usize = 64 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LocationInput {
    storage_provider: String,
    storage_bucket: Option<String>,
    storage_key: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    op: String,
    run_id: String,
    location: LocationInput,
    // Only used for admission and output redaction. Actual provider selection,
    // credentials and operations are exclusively the existing DB-backed facade.
    config: Value,
    body_base64: Option<String>,
    content_type: Option<String>,
    checksum_sha256: Option<String>,
    expires_at: Option<String>,
    #[serde(default)]
    include_body: bool,
}
fn rejected(message: &str) -> StorageFailure {
    StorageFailure::unexpected(message)
}
fn hash(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}
fn endpoint_allowed(
    endpoint: &str,
    bucket: &str,
    force_path_style: bool,
) -> Result<(), StorageFailure> {
    let url = url::Url::parse(endpoint).map_err(|_| rejected("Probe rejected endpoint URL"))?;
    if !url.username().is_empty() || url.password().is_some() {
        return Err(rejected("Probe rejected endpoint credentials"));
    }
    match url.origin().ascii_serialization().as_str() {
        "http://127.0.0.1:6900" if force_path_style => Ok(()),
        "http://r2ij-obs.local:6900" if bucket == "ijvirtual" => Ok(()),
        _ => Err(rejected(
            "Probe rejected non-fixture endpoint origin or style",
        )),
    }
}
fn admit(input: &Input) -> Result<ObjectLocation, StorageFailure> {
    if !matches!(
        input.op.as_str(),
        "head" | "read" | "put" | "remove" | "presign" | "read-first-drop"
    ) {
        return Err(rejected("Probe rejected operation"));
    }
    if uuid::Uuid::parse_str(&input.run_id)
        .ok()
        .is_none_or(|id| id.to_string() != input.run_id)
    {
        return Err(rejected("Probe rejected run ID"));
    }
    let bucket = input
        .location
        .storage_bucket
        .as_deref()
        .filter(|v| !v.is_empty())
        .ok_or_else(|| rejected("Probe rejected bucket"))?;
    if input.location.storage_provider != "huawei-obs-s3"
        || !input
            .location
            .storage_key
            .starts_with(&format!("ij-{}/", input.run_id))
    {
        return Err(rejected("Probe rejected object namespace"));
    }
    let config = &input.config;
    if config["providerType"] != "huawei-obs-s3"
        || config["bucket"].as_str() != Some(bucket)
        || !config["accessKeyId"].is_string()
        || !config["secretAccessKey"].is_string()
    {
        return Err(rejected("Probe requires synthetic matching runtime config"));
    }
    endpoint_allowed(
        config["endpoint"]
            .as_str()
            .ok_or_else(|| rejected("Probe requires endpoint"))?,
        bucket,
        config["forcePathStyle"].as_bool().unwrap_or(false),
    )?;
    if input.op == "put" {
        decode_body(input)?;
    }
    if input.op == "presign" {
        expiry(input)?;
    }
    Ok(ObjectLocation {
        storage_provider: input.location.storage_provider.clone(),
        storage_bucket: Some(bucket.into()),
        storage_key: input.location.storage_key.clone(),
    })
}
fn decode_body(input: &Input) -> Result<Vec<u8>, StorageFailure> {
    let raw = input
        .body_base64
        .as_deref()
        .ok_or_else(|| rejected("Probe put requires base64"))?;
    let body = STANDARD
        .decode(raw)
        .map_err(|_| rejected("Probe rejected noncanonical or excessive body"))?;
    if body.len() > MAX_BODY || STANDARD.encode(&body) != raw {
        return Err(rejected("Probe rejected noncanonical or excessive body"));
    }
    Ok(body)
}
fn expiry(input: &Input) -> Result<DateTime<Utc>, StorageFailure> {
    input
        .expires_at
        .as_deref()
        .and_then(|v| v.parse().ok())
        .ok_or_else(|| rejected("Probe presign requires an ISO expiry"))
}
fn secret_units(input: &Input) -> Vec<Vec<u16>> {
    ["accessKeyId", "secretAccessKey"]
        .into_iter()
        .filter_map(|key| input.config[key].as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.encode_utf16().collect())
        .collect()
}
fn redact_units(units: &[u16], secrets: &[Vec<u16>]) -> Vec<u16> {
    let marker: Vec<u16> = "[redacted]".encode_utf16().collect();
    let mut value = units.to_vec();
    for secret in secrets {
        if secret.is_empty() {
            continue;
        }
        let mut result = Vec::new();
        let mut at = 0;
        while at < value.len() {
            if value[at..].starts_with(secret) {
                result.extend_from_slice(&marker);
                at += secret.len();
            } else {
                result.push(value[at]);
                at += 1;
            }
        }
        value = result;
    }
    value
}
fn redact_value(value: &mut Value, secrets: &[Vec<u16>]) {
    match value {
        Value::String(text) => {
            *text = String::from_utf16_lossy(&redact_units(
                &text.encode_utf16().collect::<Vec<_>>(),
                secrets,
            ))
        }
        Value::Array(values) => {
            for value in values {
                redact_value(value, secrets);
            }
        }
        Value::Object(values) => {
            for (key, value) in values {
                if !matches!(key.as_str(), "url" | "sha256" | "originalUrlSha256") {
                    redact_value(value, secrets);
                }
            }
        }
        _ => {}
    }
}
fn failure(op: &str, error: StorageFailure, input: Option<&Input>) -> String {
    let op = if matches!(
        op,
        "head" | "read" | "put" | "remove" | "presign" | "read-first-drop"
    ) {
        op
    } else {
        "rejected"
    };
    let original = error.message.as_code_units();
    let mut original_bytes = Vec::with_capacity(original.len() * 2);
    for unit in original {
        original_bytes.extend_from_slice(&unit.to_le_bytes());
    }
    let units = redact_units(original, &input.map(secret_units).unwrap_or_default());
    let changed = units.as_slice() != original;
    let message = JsString::from_code_units(units.clone());
    let status = error.status.map(|s| s.as_u16());
    format!(
        "{{\"success\":false,\"op\":{},\"status\":{},\"error\":{{\"status\":{},\"message\":{},\"messageUnits\":{},\"messageRedacted\":{},\"originalMessageUtf16LeSha256\":{}}}}}",
        json!(op),
        json!(status),
        json!(status),
        message.json(),
        json!(units),
        changed,
        json!(hash(&original_bytes))
    )
}
fn body_result(bytes: &[u8], include: bool) -> Value {
    let mut result = json!({"bytes":bytes.len(),"sha256":hash(bytes)});
    if include && bytes.len() <= 1024 * 1024 {
        result["bodyBase64"] = json!(STANDARD.encode(bytes));
    }
    result
}
async fn preflight(database: &Database, location: &ObjectLocation) -> Result<(), StorageFailure> {
    let bucket = location.storage_bucket.clone();
    let endpoints = database.with_connection(move |connection| Box::pin(async move {
        let identity = sqlx::query("SELECT current_database()::text AS database,current_user::text AS username").fetch_one(&mut *connection).await?;
        let name: String = identity.try_get("database")?; let username: String = identity.try_get("username")?;
        if name != "poms_r2ij_rust" || username != "poms_r2ij_app" { return Err(sqlx::Error::Protocol("probe database identity rejected".into())); }
        let rows = sqlx::query("SELECT endpoint,force_path_style FROM poms.attachment_storage_provider_config WHERE provider_type='huawei-obs-s3' AND bucket IS NOT DISTINCT FROM $1").bind(bucket).fetch_all(connection).await?;
        rows.into_iter().map(|row| Ok((row.try_get::<Option<String>,_>("endpoint")?,row.try_get::<bool,_>("force_path_style")?))).collect::<Result<Vec<_>,sqlx::Error>>()
    })).await.map_err(|_| rejected("Probe database preflight failed"))?;
    if endpoints.is_empty() {
        return Err(rejected(
            "Probe requires existing IJ fixture provider config",
        ));
    }
    // Conservative admission only. Do not implement prefix/default selection;
    // the existing facade remains the sole provider-authority implementation.
    for (endpoint, style) in endpoints {
        endpoint_allowed(
            endpoint
                .as_deref()
                .ok_or_else(|| rejected("Probe requires endpoint"))?,
            location.storage_bucket.as_deref().unwrap_or_default(),
            style,
        )?;
    }
    Ok(())
}
async fn run(
    storage: &AttachmentStorage,
    input: &Input,
    location: &ObjectLocation,
) -> Result<Value, StorageFailure> {
    match input.op.as_str() {
        "head" => {
            let v = storage.head_object(location).await?;
            Ok(
                json!({"sizeBytes":v.size_bytes,"eTag":v.e_tag,"lastModified":v.last_modified,"contentType":v.content_type,"checksumSha256":v.checksum_sha256}),
            )
        }
        "put" => serde_json::to_value(
            storage
                .save_upload_session_object(
                    location,
                    &decode_body(input)?,
                    input.content_type.as_deref(),
                )
                .await?,
        )
        .map_err(|_| rejected("Probe result encoding failed")),
        "remove" => {
            storage.remove(location).await;
            Ok(json!({"completed":true,"bestEffort":true}))
        }
        "presign" => {
            let target = storage
                .create_presigned_put_target(
                    location,
                    input.content_type.as_deref(),
                    input.checksum_sha256.as_deref(),
                    expiry(input)?,
                )
                .await?;
            let original_hash = hash(target.url.as_bytes());
            let mut url =
                url::Url::parse(&target.url).map_err(|_| rejected("Probe presign URL rejected"))?;
            let credential = url
                .query_pairs()
                .find(|(k, _)| k == "X-Amz-Credential")
                .map(|(_, v)| v.into_owned());
            let ak = input.config["accessKeyId"].as_str().unwrap_or_default();
            let mut redacted = false;
            if let Some(credential) = credential {
                let replaced = if let Some(scope) = credential.strip_prefix(&format!("{ak}/")) {
                    format!("[redacted]/{scope}")
                } else {
                    String::from_utf16_lossy(&redact_units(
                        &credential.encode_utf16().collect::<Vec<_>>(),
                        &[ak.encode_utf16().collect()],
                    ))
                };
                redacted = replaced != credential;
                let mut pairs = url
                    .query_pairs()
                    .map(|(k, v)| (k.into_owned(), v.into_owned()))
                    .collect::<Vec<_>>();
                for (key, value) in &mut pairs {
                    if key == "X-Amz-Credential" {
                        *value = replaced.clone();
                    }
                }
                url.set_query(Some(
                    &url::form_urlencoded::Serializer::new(String::new())
                        .extend_pairs(&pairs)
                        .finish(),
                ));
            }
            Ok(
                json!({"method":target.method,"url":url.to_string(),"headers":target.headers,"expiresAt":target.expires_at,"originalUrlSha256":original_hash,"credentialRedacted":redacted}),
            )
        }
        "read" | "read-first-drop" => {
            let mut stream = storage.open_read_stream(location).await?.into_data_stream();
            let mut bytes = Vec::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|error| {
                    let inner = error.into_inner();
                    inner
                        .downcast_ref::<StorageFailure>()
                        .cloned()
                        .unwrap_or_else(|| StorageFailure::unexpected(inner.to_string()))
                })?;
                if chunk.is_empty() {
                    continue;
                }
                if bytes.len() + chunk.len() > MAX_READ {
                    return Err(rejected("Probe read limit exceeded"));
                }
                bytes.extend_from_slice(&chunk);
                if input.op == "read-first-drop" {
                    break;
                }
            }
            drop(stream);
            let mut result = body_result(&bytes, input.include_body);
            if input.op == "read-first-drop" {
                result["droppedAfterFirstChunk"] = json!(!bytes.is_empty());
            }
            Ok(result)
        }
        _ => Err(rejected("Probe rejected operation")),
    }
}
fn output(line: &str) -> io::Result<()> {
    let mut stdout = io::stdout().lock();
    writeln!(stdout, "{line}")?;
    stdout.flush()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args_os().count() != 1 {
        return Err("Probe accepts inputs only over stdin".into());
    }
    let env_path = std::env::var("POMS_ENV_FILE").unwrap_or_default();
    if !matches!(
        env_path.as_str(),
        "/home/wangzishi/.local/share/poms-r2ij/private/rust.env" | "/r2ij-private/rust.env"
    ) {
        return Err("Probe requires the explicit new IJ Rust environment".into());
    }
    let config = Config::load().map_err(|_| "Probe config rejected")?;
    let db = &config.database;
    if db.host != "127.0.0.1"
        || db.port != 16432
        || db.database != "poms_r2ij_rust"
        || db.username != "poms_r2ij_app"
        || !db.connect
        || db.url.is_some()
    {
        return Err("Probe rejected database before I/O".into());
    }
    let mut database = None;
    let mut storage = None;
    let mut stdin = io::BufReader::new(io::stdin());
    loop {
        let mut line = Vec::new();
        let count = (&mut stdin)
            .take((MAX_LINE + 1) as u64)
            .read_until(b'\n', &mut line)?;
        if count == 0 {
            break;
        }
        if line.len() > MAX_LINE {
            return Err("Probe input exceeds limit".into());
        }
        let input: Input = match serde_json::from_slice(&line) {
            Ok(value) => value,
            Err(_) => {
                output(&failure("rejected", rejected("Probe rejected JSON"), None))?;
                continue;
            }
        };
        let location = match admit(&input) {
            Ok(value) => value,
            Err(error) => {
                output(&failure(&input.op, error, Some(&input)))?;
                continue;
            }
        };
        if database.is_none() {
            let db = Database::new(&config.database)
                .await
                .map_err(|_| "Probe database unavailable")?;
            storage = Some(AttachmentStorage::new(
                db.clone(),
                config.attachment_storage.clone(),
            ));
            database = Some(db);
        }
        let db = database.as_ref().ok_or("Probe database unavailable")?;
        let service = storage.as_ref().ok_or("Probe storage unavailable")?;
        let result = match preflight(db, &location).await {
            Ok(()) => run(service, &input, &location).await,
            Err(error) => Err(error),
        };
        match result {
            Ok(mut value) => {
                redact_value(&mut value, &secret_units(&input));
                output(
                    &json!({"success":true,"op":input.op,"status":null,"result":value}).to_string(),
                )?;
            }
            Err(error) => output(&failure(&input.op, error, Some(&input)))?,
        }
    }
    if let Some(database) = database {
        let _ = database.close(std::time::Duration::from_secs(5)).await;
    }
    Ok(())
}
