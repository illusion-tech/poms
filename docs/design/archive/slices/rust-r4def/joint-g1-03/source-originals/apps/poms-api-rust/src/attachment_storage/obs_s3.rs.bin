use super::{
    AttachmentStorage, ObjectLocation, ObjectMetadata, PresignedPutTarget, StorageFailure,
    model::RuntimeConfig,
};
use axum::{
    body::{Body, Bytes},
    http::StatusCode,
};
use chrono::{DateTime, Utc};
use futures_util::stream;
use openssl::{hash::MessageDigest, pkey::PKey, sign::Signer};
use reqwest::{
    Client, Method, Response, Url,
    header::{HeaderMap, HeaderValue},
};
use sha2::{Digest, Sha256};
use std::{
    cmp::Ordering,
    collections::BTreeMap,
    io::{BufRead, Read},
    sync::OnceLock,
    time::Duration,
};

fn required<'a>(value: &'a Option<String>, field: &str) -> Result<&'a str, StorageFailure> {
    value.as_deref().filter(|v| !v.is_empty()).ok_or_else(|| {
        StorageFailure::http(
            StatusCode::BAD_GATEWAY,
            format!("Attachment storage provider {field} is not configured."),
        )
    })
}
fn encode(value: &str, query: bool) -> String {
    let mut out = String::new();
    for byte in value.as_bytes() {
        if byte.is_ascii_alphanumeric()
            || b"-_.~".contains(byte)
            || (!query && b"!'()*".contains(byte))
        {
            out.push(*byte as char);
        } else {
            use std::fmt::Write;
            let _ = write!(out, "%{byte:02X}");
        }
    }
    out
}
fn encode_path(value: &str) -> String {
    let parts = value.split('/').collect::<Vec<_>>();
    parts
        .iter()
        .enumerate()
        .filter(|(i, v)| !v.is_empty() || (*i == 0 && parts.len() == 1))
        .map(|(_, v)| encode(v, false))
        .collect::<Vec<_>>()
        .join("/")
}
fn object_url(config: &RuntimeConfig, key: Option<&str>) -> Result<Url, StorageFailure> {
    let endpoint = required(&config.endpoint, "endpoint")?;
    let bucket = required(&config.bucket, "bucket")?;
    let mut url = Url::parse(endpoint).map_err(|_| StorageFailure::unexpected("Invalid URL"))?;
    let base = url.path().trim_end_matches('/').to_owned();
    let key = key
        .filter(|v| !v.is_empty())
        .map(encode_path)
        .unwrap_or_default();
    if config.force_path_style {
        let path = [base, encode_path(bucket), key]
            .into_iter()
            .filter(|v| !v.is_empty())
            .collect::<Vec<_>>()
            .join("/");
        url.set_path(&path);
    } else {
        let host = format!("{bucket}.{}", url.host_str().unwrap_or_default());
        url.set_host(Some(&host))
            .map_err(|_| StorageFailure::unexpected("Invalid URL"))?;
        let path = [base, key]
            .into_iter()
            .filter(|v| !v.is_empty())
            .collect::<Vec<_>>()
            .join("/");
        url.set_path(if path.is_empty() { "/" } else { &path });
    }
    Ok(url)
}
fn host(url: &Url) -> String {
    let mut host = url.host_str().unwrap_or_default().to_owned();
    if let Some(port) = url.port() {
        host.push(':');
        host.push_str(&port.to_string());
    }
    host
}
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|v| format!("{v:02x}")).collect()
}
fn hmac(key: &[u8], value: &str) -> Result<Vec<u8>, StorageFailure> {
    let key = PKey::hmac(key).map_err(|_| StorageFailure::internal())?;
    let mut signer =
        Signer::new(MessageDigest::sha256(), &key).map_err(|_| StorageFailure::internal())?;
    signer
        .update(value.as_bytes())
        .map_err(|_| StorageFailure::internal())?;
    signer.sign_to_vec().map_err(|_| StorageFailure::internal())
}
fn signing_key(secret: &str, date: &str, region: &str) -> Result<Vec<u8>, StorageFailure> {
    let date = hmac(format!("AWS4{secret}").as_bytes(), date)?;
    let region = hmac(&date, region)?;
    let service = hmac(&region, "s3")?;
    hmac(&service, "aws4_request")
}
fn amz_date(now: DateTime<Utc>) -> String {
    now.format("%Y%m%dT%H%M%SZ").to_string()
}
fn locale_compare(left: &str, right: &str) -> Ordering {
    use icu_collator::{
        Collator, CollatorPreferences,
        options::{AlternateHandling, CaseLevel, CollatorOptions, Strength},
        preferences::{CollationCaseFirst, CollationNumericOrdering},
    };
    static COLLATOR: OnceLock<Collator> = OnceLock::new();
    COLLATOR
        .get_or_init(|| {
            let locale: icu_locale_core::Locale =
                "en-US".parse().unwrap_or_else(|_| panic!("fixed locale"));
            let mut pref: CollatorPreferences = locale.into();
            pref.case_first = Some(CollationCaseFirst::False);
            pref.numeric_ordering = Some(CollationNumericOrdering::False);
            let mut options = CollatorOptions::default();
            options.strength = Some(Strength::Tertiary);
            options.alternate_handling = Some(AlternateHandling::NonIgnorable);
            options.case_level = Some(CaseLevel::Off);
            Collator::try_new_unstable(&crate::roles::collation::NodeData, pref, options)
                .unwrap_or_else(|_| panic!("fixed source collation"))
        })
        .as_borrowed()
        .compare(left, right)
}
fn canonical_query(url: &Url) -> String {
    let mut pairs = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect::<Vec<_>>();
    pairs.sort_by(|(ak, av), (bk, bv)| locale_compare(ak, bk).then_with(|| locale_compare(av, bv)));
    pairs
        .into_iter()
        .map(|(k, v)| format!("{}={}", encode(&k, true), encode(&v, true)))
        .collect::<Vec<_>>()
        .join("&")
}
fn set_pair(pairs: &mut Vec<(String, String)>, key: &str, value: String) {
    if let Some(at) = pairs.iter().position(|(k, _)| k == key) {
        pairs[at].1 = value;
        for index in (at + 1..pairs.len()).rev() {
            if pairs[index].0 == key {
                pairs.remove(index);
            }
        }
    } else {
        pairs.push((key.into(), value));
    }
}
fn form_query(url: &Url) -> String {
    url::form_urlencoded::Serializer::new(String::new())
        .extend_pairs(url.query_pairs())
        .finish()
}
fn signed_headers(headers: &BTreeMap<String, String>) -> (String, String) {
    let names = headers.keys().cloned().collect::<Vec<_>>().join(";");
    let mut entries = headers.iter().collect::<Vec<_>>();
    entries.sort_by(|(a, _), (b, _)| locale_compare(a, b));
    let canonical = entries
        .into_iter()
        .map(|(k, v)| format!("{k}:{}\n", super::validation::trim(v)))
        .collect::<String>();
    (names, canonical)
}

// RequestInit's record<ByteString, ByteString> conversion happens before the
// Headers constructor normalizes/validates values. Keep both inside fetch's
// rejection boundary, including the Latin1 wire bytes (not UTF8 from_str).
fn byte_string(units: &[u16]) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::with_capacity(units.len());
    for (index, unit) in units.iter().copied().enumerate() {
        if unit > 255 {
            return Err(format!(
                "Cannot convert argument to a ByteString because the character at index {index} has a value of {unit} which is greater than 255."
            ));
        }
        bytes.push(unit as u8);
    }
    Ok(bytes)
}
fn normalized_header(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let white = |b: &u8| matches!(*b, 9 | 10 | 13 | 32);
    let first = bytes.iter().position(|b| !white(b)).unwrap_or(bytes.len());
    let last = bytes
        .iter()
        .rposition(|b| !white(b))
        .map_or(first, |at| at + 1);
    let value = &bytes[first..last];
    if value.iter().any(|b| matches!(*b, 0 | 10 | 13)) {
        let text = value.iter().map(|b| char::from(*b)).collect::<String>();
        return Err(format!(
            "Headers.append: \"{text}\" is an invalid header value."
        ));
    }
    Ok(value.to_vec())
}
fn fetch_headers(values: &BTreeMap<String, String>) -> Result<HeaderMap, String> {
    let order = [
        "host",
        "x-amz-content-sha256",
        "x-amz-date",
        "content-type",
        "authorization",
    ];
    let converted = order
        .iter()
        .filter_map(|key| values.get(*key).map(|value| (*key, value)))
        .map(|(key, value)| {
            byte_string(&value.encode_utf16().collect::<Vec<_>>()).map(|bytes| (key, bytes))
        })
        .collect::<Result<Vec<_>, _>>()?;
    // Normalize all Headers entries before undici's core validates the wire.
    let mut normalized = converted
        .into_iter()
        .map(|(key, bytes)| normalized_header(&bytes).map(|bytes| (key, bytes)))
        .collect::<Result<Vec<_>, _>>()?;
    normalized.sort_by_key(|(key, _)| *key);
    let mut headers = HeaderMap::new();
    for (key, bytes) in normalized {
        if key == "host" {
            continue;
        }
        let value = HeaderValue::from_bytes(&bytes)
            .map_err(|_| format!("fetch failed / UND_ERR_INVALID_ARG / invalid {key} header"))?;
        headers.insert(reqwest::header::HeaderName::from_static(key), value);
    }
    Ok(headers)
}

pub(crate) fn presign(
    config: &RuntimeConfig,
    key: &str,
    content_type: Option<&str>,
    checksum: Option<&str>,
    expires: DateTime<Utc>,
    now: DateTime<Utc>,
) -> Result<PresignedPutTarget, StorageFailure> {
    let mut url = object_url(config, Some(key))?;
    let date = amz_date(now);
    let stamp = &date[..8];
    let region = required(&config.region, "region")?;
    let scope = format!("{stamp}/{region}/s3/aws4_request");
    let mut headers = BTreeMap::from([("host".into(), host(&url))]);
    let mut upload = BTreeMap::new();
    for (key, value) in [
        ("content-type", content_type),
        ("x-amz-meta-sha256", checksum),
    ] {
        if let Some(value) = value.filter(|v| !v.is_empty()) {
            headers.insert(key.into(), value.into());
            upload.insert(key.into(), value.into());
        }
    }
    let (names, canonical) = signed_headers(&headers);
    let seconds = ((expires.timestamp_millis() - now.timestamp_millis()) as f64 / 1000.0)
        .floor()
        .clamp(1.0, 3600.0) as u64;
    let mut pairs = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect::<Vec<_>>();
    for (key, value) in [
        ("X-Amz-Algorithm", "AWS4-HMAC-SHA256".into()),
        (
            "X-Amz-Credential",
            format!("{}/{scope}", required(&config.access_key_id, "access key")?),
        ),
        ("X-Amz-Date", date.clone()),
        ("X-Amz-Expires", seconds.to_string()),
        ("X-Amz-SignedHeaders", names.clone()),
    ] {
        set_pair(&mut pairs, key, value);
    }
    url.set_query(Some(
        &url::form_urlencoded::Serializer::new(String::new())
            .extend_pairs(&pairs)
            .finish(),
    ));
    let request = format!(
        "PUT\n{}\n{}\n{}\n{}\nUNSIGNED-PAYLOAD",
        url.path(),
        canonical_query(&url),
        canonical,
        names
    );
    let string = format!(
        "AWS4-HMAC-SHA256\n{date}\n{scope}\n{}",
        hex(&Sha256::digest(request.as_bytes()))
    );
    let signature = hex(&hmac(
        &signing_key(
            required(&config.secret_access_key, "secret key")?,
            stamp,
            region,
        )?,
        &string,
    )?);
    set_pair(&mut pairs, "X-Amz-Signature", signature);
    url.set_query(Some(
        &url::form_urlencoded::Serializer::new(String::new())
            .extend_pairs(&pairs)
            .finish(),
    ));
    Ok(PresignedPutTarget {
        method: "PUT".into(),
        url: url.into(),
        headers: upload,
        expires_at: super::service::iso(expires),
    })
}
fn header(headers: &HeaderMap, key: &str) -> Option<String> {
    let values = headers
        .get_all(key)
        .iter()
        .map(|v| {
            v.as_bytes()
                .iter()
                .map(|b| char::from(*b))
                .collect::<String>()
        })
        .collect::<Vec<_>>();
    (!values.is_empty()).then(|| values.join(", "))
}
fn origin(url: &Url) -> (String, String, Option<u16>) {
    (
        url.scheme().into(),
        url.host_str().unwrap_or_default().into(),
        url.port_or_known_default(),
    )
}
fn reject_initial_url_credentials(url: &Url) -> Result<(), String> {
    if !url.username().is_empty() || url.password().is_some() {
        return Err(format!(
            "Request cannot be constructed from a URL that includes credentials: {url}"
        ));
    }
    Ok(())
}
fn fetch_failure(error: &reqwest::Error, url: &Url) -> String {
    if error.is_timeout() {
        return if error.is_connect() {
            "fetch failed / UND_ERR_CONNECT_TIMEOUT / Connect Timeout Error"
        } else {
            "fetch failed / UND_ERR_HEADERS_TIMEOUT / Headers Timeout Error"
        }
        .into();
    }
    let mut source = std::error::Error::source(error);
    let mut io = None;
    let mut closed_before_headers = false;
    while let Some(value) = source {
        // Calibrated only to the actual controlled peer EOF before headers;
        // do not invent an Undici cause for unrelated unknown failures.
        closed_before_headers |= value.to_string() == "connection closed before message completed";
        if let Some(value) = value.downcast_ref::<std::io::Error>() {
            io = Some(value.kind());
        }
        source = value.source();
    }
    match io {
        Some(std::io::ErrorKind::ConnectionRefused) => format!(
            "fetch failed / ECONNREFUSED / connect ECONNREFUSED {}:{}",
            url.host_str().unwrap_or_default(),
            url.port_or_known_default().unwrap_or(80)
        ),
        Some(std::io::ErrorKind::ConnectionReset) => {
            "fetch failed / ECONNRESET / read ECONNRESET".into()
        }
        _ if closed_before_headers => "fetch failed / UND_ERR_SOCKET / other side closed".into(),
        _ => "fetch failed".into(),
    }
}
impl AttachmentStorage {
    async fn obs_client(&self) -> Result<Client, StorageFailure> {
        let mut builder = Client::builder()
            .http1_only()
            .redirect(reqwest::redirect::Policy::none())
            .referer(false)
            .retry(reqwest::retry::never())
            .no_proxy()
            .no_gzip()
            .no_brotli()
            .no_deflate()
            .no_zstd()
            .connect_timeout(Duration::from_secs(10))
            .read_timeout(Duration::from_secs(300))
            .tls_backend_native();
        if self.settings.tls_insecure {
            builder = builder.tls_danger_accept_invalid_certs(true);
        }
        if let Some(path) = &self.settings.extra_ca
            && let Ok(bytes) = tokio::fs::read(path).await
            && let Ok(certs) = reqwest::Certificate::from_pem_bundle(&bytes)
        {
            builder = builder.tls_certs_merge(certs);
        }
        builder
            .build()
            .map_err(|_| StorageFailure::unexpected("fetch failed"))
    }
    async fn fetch_chain(
        &self,
        initial: &Url,
        method: &Method,
        values: &BTreeMap<String, String>,
        body: &[u8],
    ) -> Result<Response, String> {
        // Native Request rejects URL userinfo before Headers conversion. Keep
        // it in fetch's rejection/retry boundary, never in the DTO/presigner.
        reject_initial_url_credentials(initial)?;
        let mut headers = fetch_headers(values)?;
        let client = self.obs_client().await.map_err(|e| e.to_string())?;
        let mut url = initial.clone();
        let mut method = method.clone();
        let mut payload = body.to_vec();
        for redirects in 0..=20 {
            let mut request = client
                .request(method.clone(), url.clone())
                .headers(headers.clone())
                .header("accept", "*/*")
                .header("accept-language", "*")
                .header(
                    "connection",
                    if method == Method::HEAD {
                        "close"
                    } else {
                        "keep-alive"
                    },
                )
                .header(
                    "accept-encoding",
                    if url.scheme() == "https" {
                        "br, gzip, deflate"
                    } else {
                        "gzip, deflate"
                    },
                )
                .header("sec-fetch-mode", "cors")
                .header("user-agent", "node");
            if method == Method::PUT {
                request = request.body(payload.clone());
            }
            let response = request.send().await.map_err(|e| fetch_failure(&e, &url))?;
            let status = response.status().as_u16();
            if ![301, 302, 303, 307, 308].contains(&status)
                || !response.headers().contains_key("location")
            {
                let encoding = header(response.headers(), "content-encoding");
                if method != Method::HEAD
                    && ![101, 103, 204, 205, 304].contains(&status)
                    && encoding.as_ref().is_some_and(|v| v.split(',').count() > 5)
                {
                    return Err(format!(
                        "fetch failed / too many content-encodings in response: {}, maximum allowed is 5",
                        encoding.unwrap_or_default().split(',').count()
                    ));
                }
                return Ok(response);
            }
            if redirects == 20 {
                return Err("fetch failed / redirect count exceeded".into());
            }
            let location = header(response.headers(), "location").unwrap_or_default();
            let next = url
                .join(&location)
                .map_err(|_| "fetch failed / Invalid URL".to_owned())?;
            if !matches!(next.scheme(), "http" | "https") {
                return Err("fetch failed / URL scheme must be a HTTP(S) scheme".into());
            }
            if !next.username().is_empty() || next.password().is_some() {
                return Err(
                    "fetch failed / cross origin not allowed for request mode \"cors\"".into(),
                );
            }
            if origin(&next) != origin(&url) {
                for name in ["authorization", "proxy-authorization", "cookie", "host"] {
                    headers.remove(name);
                }
            }
            if ([301, 302].contains(&status) && method == Method::POST)
                || (status == 303 && method != Method::GET && method != Method::HEAD)
            {
                method = Method::GET;
                payload.clear();
                for key in [
                    "content-type",
                    "content-length",
                    "content-encoding",
                    "content-language",
                    "content-location",
                ] {
                    headers.remove(key);
                }
            }
            url = next;
        }
        Err("fetch failed / redirect count exceeded".into())
    }
    pub(crate) async fn obs_request(
        &self,
        config: &RuntimeConfig,
        method: Method,
        key: Option<&str>,
        body: &[u8],
        content_type: Option<&str>,
    ) -> Result<Response, StorageFailure> {
        let url = object_url(config, key)?;
        let date = amz_date(crate::auth::model::clock_now());
        let stamp = &date[..8];
        let payload = hex(&Sha256::digest(body));
        let mut values = BTreeMap::from([
            ("host".into(), host(&url)),
            ("x-amz-content-sha256".into(), payload.clone()),
            ("x-amz-date".into(), date.clone()),
        ]);
        if let Some(content_type) = content_type.filter(|v| !v.is_empty()) {
            values.insert("content-type".into(), content_type.into());
        }
        let (names, canonical) = signed_headers(&values);
        let request = format!(
            "{}\n{}\n{}\n{}\n{}\n{}",
            method,
            url.path(),
            form_query(&url),
            canonical,
            names,
            payload
        );
        let region = required(&config.region, "region")?;
        let scope = format!("{stamp}/{region}/s3/aws4_request");
        let string = format!(
            "AWS4-HMAC-SHA256\n{date}\n{scope}\n{}",
            hex(&Sha256::digest(request.as_bytes()))
        );
        let signature = hex(&hmac(
            &signing_key(
                required(&config.secret_access_key, "secret key")?,
                stamp,
                region,
            )?,
            &string,
        )?);
        let authorization = format!(
            "AWS4-HMAC-SHA256 Credential={}/{scope}, SignedHeaders={names}, Signature={signature}",
            required(&config.access_key_id, "access key")?
        );
        values.insert("authorization".into(), authorization);
        let mut response = None;
        let mut last = String::new();
        for attempt in 0..3 {
            match self.fetch_chain(&url, &method, &values, body).await {
                Ok(value) => {
                    response = Some(value);
                    break;
                }
                Err(error) => {
                    last = error;
                    if attempt < 2 {
                        tokio::time::sleep(Duration::from_millis(250 * (attempt + 1))).await;
                    }
                }
            }
        }
        let response=response.ok_or_else(||StorageFailure::http(StatusCode::BAD_GATEWAY,format!("Attachment storage provider request failed: {method} {} could not connect to endpoint: {last}",url.path())))?;
        if response.status() == StatusCode::NOT_FOUND {
            return Err(StorageFailure::http(
                StatusCode::NOT_FOUND,
                format!(
                    "Attachment storage object {} not found",
                    key.unwrap_or(required(&config.bucket, "bucket")?)
                ),
            ));
        }
        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = safe_error(response).await;
            let mut units = format!(
                "Attachment storage provider request failed: {method} {} returned {status}",
                url.path()
            )
            .encode_utf16()
            .collect::<Vec<_>>();
            if !message.is_empty() {
                units.push(32);
                units.extend_from_slice(message.as_code_units());
            }
            return Err(StorageFailure::from_js(
                Some(StatusCode::BAD_GATEWAY),
                crate::auth::js_json::JsString::from_code_units(units),
            ));
        }
        Ok(response)
    }
    pub(crate) async fn obs_put(
        &self,
        config: &RuntimeConfig,
        key: &str,
        body: &[u8],
        content_type: Option<&str>,
    ) -> Result<ObjectLocation, StorageFailure> {
        self.obs_request(
            config,
            Method::PUT,
            Some(key),
            body,
            Some(content_type.unwrap_or("application/octet-stream")),
        )
        .await?;
        Ok(ObjectLocation {
            storage_provider: "huawei-obs-s3".into(),
            storage_bucket: Some(required(&config.bucket, "bucket")?.into()),
            storage_key: key.into(),
        })
    }
    pub(crate) async fn obs_head(
        &self,
        config: &RuntimeConfig,
        key: &str,
    ) -> Result<ObjectMetadata, StorageFailure> {
        let response = self
            .obs_request(config, Method::HEAD, Some(key), &[], None)
            .await?;
        let headers = response.headers();
        let size =
            crate::compat::scalars::legacy_number(crate::compat::scalars::NumberInput::Text(
                &header(headers, "content-length").unwrap_or_else(|| "0".into()),
            ));
        Ok(ObjectMetadata {
            size_bytes: if size.is_finite() { size } else { 0.0 },
            e_tag: header(headers, "etag"),
            last_modified: header(headers, "last-modified"),
            content_type: header(headers, "content-type"),
            checksum_sha256: header(headers, "x-amz-meta-sha256")
                .or_else(|| header(headers, "x-obs-meta-sha256")),
        })
    }
    pub(crate) async fn obs_read(
        &self,
        config: &RuntimeConfig,
        key: &str,
    ) -> Result<Body, StorageFailure> {
        let response = self
            .obs_request(config, Method::GET, Some(key), &[], None)
            .await?;
        if [204, 205, 304].contains(&response.status().as_u16()) {
            return Err(StorageFailure::http(
                StatusCode::BAD_GATEWAY,
                "Attachment storage provider returned an empty object stream.",
            ));
        }
        Ok(response_body(response))
    }
    pub(crate) async fn obs_delete(
        &self,
        config: &RuntimeConfig,
        key: &str,
    ) -> Result<(), StorageFailure> {
        self.obs_request(config, Method::DELETE, Some(key), &[], None)
            .await?;
        Ok(())
    }
}

fn raw_body(response: Response) -> Body {
    Body::from_stream(stream::try_unfold(response, |mut response| async move {
        match response.chunk().await {
            Ok(Some(bytes)) => Ok(Some((bytes, response))),
            Ok(None) => Ok(None),
            Err(_) => Err(StorageFailure::unexpected("terminated")),
        }
    }))
}
struct ChannelRead {
    receiver: tokio::sync::mpsc::Receiver<Result<Bytes, StorageFailure>>,
    chunk: std::io::Cursor<Bytes>,
}
impl Read for ChannelRead {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        if out.is_empty() {
            return Ok(0);
        }
        loop {
            let n = self.chunk.read(out)?;
            if n > 0 {
                return Ok(n);
            }
            match self.receiver.blocking_recv() {
                Some(Ok(bytes)) => self.chunk = std::io::Cursor::new(bytes),
                Some(Err(error)) => return Err(std::io::Error::other(error)),
                None => return Ok(0),
            }
        }
    }
}
struct PumpCancellation(tokio::task::AbortHandle);
impl Drop for PumpCancellation {
    fn drop(&mut self) {
        self.0.abort();
    }
}
fn deflate_is_zlib(source: &mut dyn BufRead) -> Result<bool, StorageFailure> {
    match source.fill_buf() {
        Ok(bytes) => Ok(bytes.first().is_some_and(|b| b & 15 == 8)),
        Err(error) => {
            // io::Error::source can delegate to its inner error's source and
            // skip the inner value itself. Inspect get_ref first so a direct
            // StorageFailure and every marked codec input keep their JS units.
            let mut cause = error
                .get_ref()
                .map(|inner| inner as &(dyn std::error::Error + 'static));
            while let Some(value) = cause {
                if let Some(failure) = value.downcast_ref::<StorageFailure>() {
                    return Err(failure.clone());
                }
                if let Some(io) = value.downcast_ref::<std::io::Error>()
                    && let Some(inner) = io.get_ref()
                {
                    cause = Some(inner);
                    continue;
                }
                cause = value.source();
            }
            Err(StorageFailure::unexpected("terminated"))
        }
    }
}
#[derive(Debug)]
struct UpstreamDecoderError(std::io::Error);
impl std::fmt::Display for UpstreamDecoderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self.0, f)
    }
}
impl std::error::Error for UpstreamDecoderError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.0)
    }
}
struct DecoderInput(Box<dyn Read + Send>);
impl Read for DecoderInput {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        // An upstream transport/decoder error is not this codec's own finish.
        // Keep it Other so a later layer cannot suppress the original error.
        self.0
            .read(out)
            .map_err(|error| std::io::Error::other(UpstreamDecoderError(error)))
    }
}
struct GzipMagicRead {
    reader: Box<dyn Read + Send>,
    prefix: [u8; 2],
    seen: usize,
}
impl Read for GzipMagicRead {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        if out.is_empty() {
            return Ok(0);
        }
        let count = self.reader.read(out)?;
        for byte in out[..count].iter().take(2 - self.seen) {
            self.prefix[self.seen] = *byte;
            self.seen += 1;
        }
        // Node's inflate rejects a two-byte wrong magic immediately. flate2
        // waits for ten header bytes, whose EOF would otherwise look like an
        // accepted short gzip prefix. One byte alone is permissive in Node.
        if self.seen == 2 && self.prefix != [0x1f, 0x8b] {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "incorrect header check",
            ));
        }
        Ok(count)
    }
}
struct NativeDecoderFinish {
    reader: Box<dyn Read + Send>,
    finished: bool,
}
impl Read for NativeDecoderFinish {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        if out.is_empty() {
            return Ok(0);
        }
        if self.finished {
            return Ok(0);
        }
        match self.reader.read(out) {
            Ok(0) => {
                self.finished = true;
                Ok(0)
            }
            Err(error) if error.kind() == std::io::ErrorKind::UnexpectedEof => {
                self.finished = true;
                Ok(0)
            }
            result => result,
        }
    }
}
fn layered_decoder(
    mut source: Box<dyn Read + Send>,
    codings: &[String],
) -> Result<Box<dyn Read + Send>, StorageFailure> {
    for coding in codings.iter().rev() {
        let input = Box::new(DecoderInput(source));
        let decoder: Box<dyn Read + Send> = match coding.as_str() {
            "gzip" | "x-gzip" => Box::new(flate2::read::MultiGzDecoder::new(GzipMagicRead {
                reader: input,
                prefix: [0; 2],
                seen: 0,
            })),
            "br" => Box::new(brotli_decompressor::Decompressor::new(input, 4096)),
            "zstd" => Box::new(
                zstd::stream::read::Decoder::new(input)
                    .map_err(|_| StorageFailure::unexpected("terminated"))?,
            ),
            "deflate" => {
                let mut buffered = std::io::BufReader::new(input);
                if deflate_is_zlib(&mut buffered)? {
                    Box::new(flate2::read::ZlibDecoder::new(buffered))
                } else {
                    Box::new(flate2::read::DeflateDecoder::new(buffered))
                }
            }
            _ => return Err(StorageFailure::unexpected("terminated")),
        };
        // Actual Node 24.19 fetch accepts an incomplete final zstd frame too,
        // despite its ZSTD_e_end option (transport14 and codec02 witnesses).
        // Apply this only to each decoder's own EOF, never a marked upstream
        // failure, and retain bad-frame InvalidData errors.
        source = Box::new(NativeDecoderFinish {
            reader: decoder,
            finished: false,
        });
    }
    Ok(source)
}
fn response_body(response: Response) -> Body {
    let enc = header(response.headers(), "content-encoding")
        .unwrap_or_default()
        .to_ascii_lowercase();
    let codings = if enc.is_empty() {
        Vec::new()
    } else {
        enc.split(',')
            .map(str::trim)
            .map(str::to_owned)
            .collect::<Vec<_>>()
    };
    if codings.is_empty()
        || codings
            .iter()
            .any(|s| !matches!(s.as_str(), "gzip" | "x-gzip" | "deflate" | "br" | "zstd"))
    {
        return raw_body(response);
    }
    let (raw_tx, raw_rx) = tokio::sync::mpsc::channel(2);
    let (tx, rx) = tokio::sync::mpsc::channel(2);
    let pump = tokio::spawn(async move {
        let mut response = response;
        loop {
            match response.chunk().await {
                Ok(Some(bytes)) => {
                    if raw_tx.send(Ok(bytes)).await.is_err() {
                        break;
                    }
                }
                Ok(None) => break,
                Err(_) => {
                    let _ = raw_tx
                        .send(Err(StorageFailure::unexpected("terminated")))
                        .await;
                    break;
                }
            }
        }
    });
    let cancel = PumpCancellation(pump.abort_handle());
    tokio::task::spawn_blocking(move || {
        let source: Box<dyn Read + Send> = Box::new(ChannelRead {
            receiver: raw_rx,
            chunk: std::io::Cursor::new(Bytes::new()),
        });
        let mut source = match layered_decoder(source, &codings) {
            Ok(source) => source,
            Err(error) => {
                let _ = tx.blocking_send(Err(error));
                return;
            }
        };
        loop {
            let mut bytes = vec![0u8; 65_536];
            match source.read(&mut bytes) {
                Ok(0) => break,
                Ok(n) => {
                    bytes.truncate(n);
                    if tx.blocking_send(Ok(Bytes::from(bytes))).is_err() {
                        break;
                    }
                }
                Err(_) => {
                    let _ = tx.blocking_send(Err(StorageFailure::unexpected("terminated")));
                    break;
                }
            }
        }
    });
    // This guard is owned by the returned stream/future even before first poll.
    // Dropping a consumer aborts the network pump, drops raw_tx, and unblocks a
    // decoder waiting in blocking_recv rather than leaving it until timeout.
    Body::from_stream(stream::unfold(
        (rx, cancel),
        |(mut rx, cancel)| async move { rx.recv().await.map(|chunk| (chunk, (rx, cancel))) },
    ))
}
async fn safe_error(response: Response) -> crate::auth::js_json::JsString {
    use futures_util::StreamExt;
    let mut stream = response_body(response).into_data_stream();
    let mut bytes = Vec::new();
    while let Some(value) = stream.next().await {
        let Ok(value) = value else {
            return crate::auth::js_json::JsString::from_code_units(Vec::new());
        };
        bytes.extend_from_slice(&value);
    }
    let bytes = bytes.strip_prefix(&[239, 187, 191]).unwrap_or(&bytes);
    let text = String::from_utf8_lossy(bytes);
    let mut units = Vec::new();
    let mut whitespace = false;
    for unit in text.encode_utf16() {
        if super::validation::is_whitespace(unit) {
            if !units.is_empty() {
                whitespace = true;
            }
        } else {
            if whitespace {
                units.push(32);
            }
            whitespace = false;
            units.push(unit);
        }
    }
    units.truncate(300);
    crate::auth::js_json::JsString::from_code_units(units)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn actual_node_short_gzip_and_zstd_finish_vectors() {
        let corpus: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/obs-codec-golden.json"
        ))
        .unwrap_or_else(|_| panic!("actual Node codec corpus"));
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let name = case["name"].as_str().unwrap_or_default();
            let text = case["inputHex"].as_str().unwrap_or_default();
            let input = text
                .as_bytes()
                .as_chunks::<2>()
                .0
                .iter()
                .map(|pair| {
                    let pair = std::str::from_utf8(pair).unwrap_or_else(|_| panic!("hex text"));
                    u8::from_str_radix(pair, 16).unwrap_or_else(|_| panic!("hex byte"))
                })
                .collect::<Vec<_>>();
            assert_eq!(
                hex(&Sha256::digest(&input)),
                case["inputSha256"].as_str().unwrap_or_default()
            );
            let coding = if name.starts_with("gzip-") {
                "gzip"
            } else {
                "zstd"
            };
            let mut decoder =
                layered_decoder(Box::new(std::io::Cursor::new(input)), &[coding.into()])
                    .unwrap_or_else(|_| panic!("decoder {name}"));
            let mut output = Vec::new();
            let result = decoder.read_to_end(&mut output);
            assert_eq!(result.is_ok(), case["success"] == true, "{name}");
            assert_eq!(
                output.len() as u64,
                case["outputBytes"].as_u64().unwrap_or_default(),
                "{name}"
            );
            assert_eq!(
                hex(&Sha256::digest(output)),
                case["outputSha256"].as_str().unwrap_or_default(),
                "{name}"
            );
        }
    }
    #[test]
    fn complete_zstd_keeps_inner_gzip_sync_flush_and_native_incomplete_finish() {
        use std::io::Write;
        let payload = b"Original measured gzip,zstd per-layer EOF witness".repeat(1024);
        let mut gzip = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        gzip.write_all(&payload)
            .unwrap_or_else(|_| panic!("gzip input"));
        let mut gzip = gzip.finish().unwrap_or_else(|_| panic!("gzip frame"));
        gzip.truncate(gzip.len() - 8);
        let wire = zstd::stream::encode_all(std::io::Cursor::new(gzip), 0)
            .unwrap_or_else(|_| panic!("zstd frame"));
        let codings = vec!["gzip".to_owned(), "zstd".to_owned()];
        let mut decoder = layered_decoder(Box::new(std::io::Cursor::new(wire.clone())), &codings)
            .unwrap_or_else(|_| panic!("decoder"));
        let mut result = Vec::new();
        decoder
            .read_to_end(&mut result)
            .unwrap_or_else(|_| panic!("complete outer zstd must not tighten inner gzip finish"));
        assert_eq!(result, payload);
        let mut truncated = wire;
        truncated.pop();
        let mut decoder = layered_decoder(Box::new(std::io::Cursor::new(truncated)), &codings)
            .unwrap_or_else(|_| panic!("decoder"));
        decoder
            .read_to_end(&mut Vec::new())
            .unwrap_or_else(|_| panic!("actual Node accepts an incomplete final zstd frame"));
    }
    #[test]
    fn initial_fetch_url_credentials_reject_before_network_but_not_url_building() {
        let url = Url::parse("http://a:b@127.0.0.1:6900/b/key")
            .unwrap_or_else(|_| panic!("synthetic URL"));
        assert_eq!(
            reject_initial_url_credentials(&url).err().as_deref(),
            Some(
                "Request cannot be constructed from a URL that includes credentials: http://a:b@127.0.0.1:6900/b/key"
            )
        );
        let plain =
            Url::parse("http://127.0.0.1:6900/b/key").unwrap_or_else(|_| panic!("synthetic URL"));
        assert!(reject_initial_url_credentials(&plain).is_ok());
    }
    #[test]
    fn original_fixed_clock_url_and_presign_vectors() {
        let corpus: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/i-helper-golden.json"
        ))
        .unwrap_or_else(|_| panic!("I original helper corpus"));
        for case in corpus["transport"].as_array().into_iter().flatten() {
            let config: RuntimeConfig =
                serde_json::from_value(case["config"].clone()).unwrap_or_else(|_| panic!("config"));
            let key = case["key"].as_str().unwrap_or_default();
            assert_eq!(
                object_url(&config, Some(key))
                    .map(|u| u.to_string())
                    .unwrap_or_default(),
                case["objectUrl"].as_str().unwrap_or_default()
            );
            let now = DateTime::from_timestamp_millis(case["now"].as_i64().unwrap_or_default())
                .unwrap_or_else(|| panic!("clock"));
            let expires = case["expiresAt"]
                .as_str()
                .unwrap_or_default()
                .parse::<DateTime<Utc>>()
                .unwrap_or_else(|_| panic!("expiry"));
            let target = presign(
                &config,
                key,
                case["contentType"].as_str(),
                case["checksumSha256"].as_str(),
                expires,
                now,
            )
            .unwrap_or_else(|_| panic!("presign"));
            assert_eq!(
                target.url,
                case["expected"]["url"].as_str().unwrap_or_default()
            );
            assert_eq!(
                serde_json::json!(target.headers),
                case["expected"]["headers"]
            );
            assert_eq!(
                target.expires_at,
                case["expected"]["expiresAt"].as_str().unwrap_or_default()
            );
        }
    }
    #[test]
    fn native_header_byte_string_normalization_and_wire_grammar() {
        let corpus: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/i-header-golden.json"
        ))
        .unwrap_or_else(|_| panic!("I native header corpus"));
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let units = case["valueUnits"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|v| v.as_u64().unwrap_or_default() as u16)
                .collect::<Vec<_>>();
            let name = case["name"].as_str().unwrap_or_default();
            let result = byte_string(&units)
                .and_then(|bytes| normalized_header(&bytes))
                .and_then(|bytes| {
                    HeaderValue::from_bytes(&bytes).map(|_| bytes).map_err(|_| {
                        format!("fetch failed / UND_ERR_INVALID_ARG / invalid {name} header")
                    })
                });
            if case["expected"]["success"] == true {
                assert_eq!(
                    serde_json::json!(result.unwrap_or_else(|_| panic!("header must pass"))),
                    case["expected"]["bytes"]
                );
            } else {
                assert_eq!(
                    result.err().as_deref(),
                    case["expected"]["message"].as_str()
                );
            }
        }
        let values = BTreeMap::from([("authorization".into(), "café".into())]);
        let headers = fetch_headers(&values).unwrap_or_else(|_| panic!("Latin1 header"));
        assert_eq!(headers["authorization"].as_bytes(), &[99, 97, 102, 233]);
    }
    #[test]
    fn deflate_sniff_keeps_first_transport_error_instead_of_replacing_it_with_eof() {
        let original = StorageFailure::from_js(
            None,
            crate::auth::js_json::JsString::from_code_units(vec![116, 0xd800]),
        );
        for marked in [false, true] {
            let (tx, rx) = tokio::sync::mpsc::channel(2);
            tx.blocking_send(Err(original.clone()))
                .unwrap_or_else(|_| panic!("send"));
            drop(tx);
            let source: Box<dyn Read + Send> = Box::new(ChannelRead {
                receiver: rx,
                chunk: std::io::Cursor::new(Bytes::new()),
            });
            let source: Box<dyn Read + Send> = if marked {
                Box::new(DecoderInput(source))
            } else {
                source
            };
            let mut input = std::io::BufReader::new(source);
            let failure = deflate_is_zlib(&mut input)
                .err()
                .unwrap_or_else(|| panic!("must preserve failure"));
            assert_eq!(failure.message, original.message);
        }
    }
}
