use std::{collections::BTreeMap, error::Error, fmt, io, sync::Arc, time::Duration};

use reqwest::{Client, Method, Proxy, Url, redirect::Policy};
use serde_json::Value;

use super::ProviderSettings;
use crate::compat::scalars::js_number_string;

#[derive(Clone, Copy, Debug)]
pub enum QueryEncoding {
    AxiosObject,
    UrlSearchParams,
}

#[derive(Clone)]
pub struct UpstreamRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub query: Vec<(String, String)>,
    pub query_encoding: QueryEncoding,
    pub json: Option<Value>,
    pub timeout_ms: f64,
}

#[derive(Clone)]
pub struct UpstreamResponse {
    pub status: u16,
    pub headers: BTreeMap<String, String>,
    pub data: Value,
    /// Axios JSON.parse accepts overflowing Number values and lone surrogates.
    /// Keep the original transformed text for those service-level JS adapters.
    pub raw_data: String,
}

#[derive(Clone)]
pub struct UpstreamError {
    pub is_axios_error: bool,
    pub code: Option<String>,
    pub message: String,
    pub response: Option<Box<UpstreamResponse>>,
}

impl fmt::Debug for UpstreamError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("UpstreamError")
            .field("is_axios_error", &self.is_axios_error)
            .field("code", &self.code)
            .field(
                "response_status",
                &self.response.as_ref().map(|response| response.status),
            )
            .finish_non_exhaustive()
    }
}

impl fmt::Display for UpstreamError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for UpstreamError {}

impl UpstreamError {
    fn new(code: Option<&str>, message: impl Into<String>) -> Self {
        Self {
            is_axios_error: true,
            code: code.map(str::to_owned),
            message: message.into(),
            response: None,
        }
    }
}

#[derive(Clone)]
pub struct UpstreamHttpClient {
    settings: Arc<ProviderSettings>,
}

impl UpstreamHttpClient {
    pub fn new(settings: Arc<ProviderSettings>) -> Self {
        Self { settings }
    }

    fn client(&self) -> Result<Client, UpstreamError> {
        let proxy_settings = self.settings.clone();
        let mut builder = Client::builder()
            .http1_only()
            .referer(false)
            .redirect(Policy::limited(21))
            .retry(reqwest::retry::never())
            .tls_backend_native()
            .no_proxy()
            .proxy(Proxy::custom(move |url| {
                proxy_for_url(&proxy_settings, url)
            }));
        if self.settings.get("NODE_TLS_REJECT_UNAUTHORIZED") == Some("0") {
            builder = builder.tls_danger_accept_invalid_certs(true);
        }
        if let Some(path) = self
            .settings
            .get("NODE_EXTRA_CA_CERTS")
            .filter(|path| !path.is_empty())
        {
            // Node ignores an unreadable/malformed extra CA file with a warning.
            // Keep default trust rather than introducing a startup failure.
            if let Ok(bytes) = std::fs::read(path)
                && let Ok(certificates) = reqwest::Certificate::from_pem_bundle(&bytes)
            {
                builder = builder.tls_certs_merge(certificates);
            }
        }
        builder.build().map_err(|_| {
            UpstreamError::new(
                Some("ERR_BAD_OPTION_VALUE"),
                "Invalid upstream configuration",
            )
        })
    }

    pub async fn execute(&self, input: UpstreamRequest) -> Result<UpstreamResponse, UpstreamError> {
        let target = request_url(&input)?;
        let method = Method::from_bytes(input.method.as_bytes()).map_err(|_| {
            UpstreamError::new(
                Some("ERR_INVALID_HTTP_TOKEN"),
                "Method must be a valid HTTP token",
            )
        })?;
        let client = self.client()?;
        let mut request = client
            .request(method, target.clone())
            .header("Accept", "application/json, text/plain, */*")
            .header("User-Agent", "axios/1.20.0")
            .header("Accept-Encoding", "gzip, compress, deflate, br");
        for (name, value) in &input.headers {
            request = request.header(name, value);
        }
        if let Some(body) = &input.json {
            request = request.json(body);
        }
        // Axios parses the timeout as an integer before installing its timer.
        if input.timeout_ms.is_finite() && input.timeout_ms.trunc() > 0.0 {
            request = request.timeout(Duration::from_secs_f64(
                (input.timeout_ms.trunc() / 1000.0).min(315_360_000.0),
            ));
        }
        let response = request
            .send()
            .await
            .map_err(|error| transport_error(error, &target, input.timeout_ms))?;
        let status = response.status().as_u16();
        let headers = response
            .headers()
            .iter()
            .filter_map(|(key, value)| {
                value
                    .to_str()
                    .ok()
                    .map(|value| (key.as_str().to_owned(), value.to_owned()))
            })
            .collect();
        let bytes = response
            .bytes()
            .await
            .map_err(|error| transport_error(error, &target, input.timeout_ms))?;
        let text = String::from_utf8_lossy(&bytes);
        let text = text.strip_prefix('\u{feff}').unwrap_or(&text);
        let data = if text.is_empty() {
            Value::String(String::new())
        } else {
            serde_json::from_str(text).unwrap_or_else(|_| Value::String(text.to_owned()))
        };
        let response = UpstreamResponse {
            status,
            headers,
            data,
            raw_data: text.to_owned(),
        };
        if (200..300).contains(&status) {
            return Ok(response);
        }
        let mut error = UpstreamError::new(
            if status >= 500 {
                Some("ERR_BAD_RESPONSE")
            } else if status >= 400 {
                Some("ERR_BAD_REQUEST")
            } else {
                None
            },
            format!("Request failed with status code {status}"),
        );
        error.response = Some(Box::new(response));
        Err(error)
    }
}

fn request_url(input: &UpstreamRequest) -> Result<Url, UpstreamError> {
    let mut url = Url::parse(&input.url).map_err(|_| UpstreamError {
        is_axios_error: false,
        code: Some("ERR_INVALID_URL".to_owned()),
        message: "Invalid URL".to_owned(),
        response: None,
    })?;
    // Match the locked Axios node platform's protocol allowlist before asking
    // reqwest to send; its unsupported-protocol error is an Axios bad request.
    if !matches!(url.scheme(), "http" | "https" | "file" | "data") {
        return Err(UpstreamError::new(
            Some("ERR_BAD_REQUEST"),
            format!("Unsupported protocol {}:", url.scheme()),
        ));
    }
    if !input.query.is_empty() {
        let query = match input.query_encoding {
            QueryEncoding::UrlSearchParams => url::form_urlencoded::Serializer::new(String::new())
                .extend_pairs(
                    input
                        .query
                        .iter()
                        .map(|(key, value)| (key.as_str(), value.as_str())),
                )
                .finish(),
            QueryEncoding::AxiosObject => input
                .query
                .iter()
                .map(|(key, value)| format!("{}={}", axios_encode(key), axios_encode(value)))
                .collect::<Vec<_>>()
                .join("&"),
        };
        let joined = match url.query() {
            Some(existing) if !existing.is_empty() => format!("{existing}&{query}"),
            _ => query,
        };
        url.set_query(Some(&joined));
    }
    url.set_fragment(None);
    Ok(url)
}

fn axios_encode(value: &str) -> String {
    let mut output = String::new();
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')'
            | b':'
            | b'$'
            | b','
            | b'['
            | b']' => output.push(char::from(byte)),
            b' ' => output.push('+'),
            _ => {
                use std::fmt::Write;
                let _ = write!(output, "%{byte:02X}");
            }
        }
    }
    output
}

fn env_case<'a>(settings: &'a ProviderSettings, key: &str) -> Option<&'a str> {
    settings
        .get(&key.to_lowercase())
        .filter(|value| !value.is_empty())
        .or_else(|| {
            settings
                .get(&key.to_uppercase())
                .filter(|value| !value.is_empty())
        })
}

fn proxy_for_url(settings: &ProviderSettings, url: &Url) -> Option<String> {
    let host = url.host_str()?;
    let port = url.port_or_known_default().unwrap_or(0);
    let no_proxy = env_case(settings, "npm_config_no_proxy")
        .or_else(|| env_case(settings, "no_proxy"))
        .unwrap_or("");
    for entry in no_proxy
        .split(|character: char| character == ',' || character.is_ascii_whitespace())
        .filter(|entry| !entry.is_empty())
    {
        if entry == "*" {
            return None;
        }
        let mut entry = entry.to_lowercase();
        if let Some((hostname, suffix)) = entry.rsplit_once(':')
            && let Ok(expected_port) = suffix.parse::<u16>()
        {
            if expected_port != port {
                continue;
            }
            entry = hostname.to_owned();
        }
        let hostname = host.to_lowercase();
        let matches = if entry.starts_with('.') || entry.starts_with('*') {
            hostname.ends_with(entry.trim_start_matches('*'))
        } else {
            hostname == entry
        };
        if matches {
            return None;
        }
    }
    let proxy = env_case(settings, &format!("npm_config_{}_proxy", url.scheme()))
        .or_else(|| env_case(settings, &format!("{}_proxy", url.scheme())))
        .or_else(|| env_case(settings, "npm_config_proxy"))
        .or_else(|| env_case(settings, "all_proxy"))?;
    Some(if proxy.contains("://") {
        proxy.to_owned()
    } else {
        format!("{}://{proxy}", url.scheme())
    })
}

fn transport_error(error: reqwest::Error, target: &Url, timeout_ms: f64) -> UpstreamError {
    if error.is_timeout() {
        return UpstreamError::new(
            Some("ECONNABORTED"),
            format!("timeout of {}ms exceeded", js_number_string(timeout_ms)),
        );
    }
    if error.is_redirect() {
        return UpstreamError::new(
            Some("ERR_FR_TOO_MANY_REDIRECTS"),
            "Maximum number of redirects exceeded",
        );
    }
    let mut source: Option<&(dyn Error + 'static)> = Some(&error);
    let mut chain = String::new();
    while let Some(current) = source {
        chain.push_str(&current.to_string().to_lowercase());
        chain.push('\n');
        if let Some(io) = current.downcast_ref::<io::Error>() {
            let endpoint = format!(
                "{}:{}",
                target.host_str().unwrap_or(""),
                target.port_or_known_default().unwrap_or(0)
            );
            return match io.kind() {
                io::ErrorKind::ConnectionRefused => UpstreamError::new(
                    Some("ECONNREFUSED"),
                    format!("connect ECONNREFUSED {endpoint}"),
                ),
                io::ErrorKind::ConnectionReset | io::ErrorKind::UnexpectedEof => {
                    UpstreamError::new(Some("ECONNRESET"), "socket hang up")
                }
                _ => {
                    source = current.source();
                    continue;
                }
            };
        }
        source = current.source();
    }
    if chain.contains("self-signed certificate") || chain.contains("self signed certificate") {
        return UpstreamError::new(
            Some("DEPTH_ZERO_SELF_SIGNED_CERT"),
            "self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca",
        );
    }
    if chain.contains("certificate") {
        return UpstreamError::new(
            Some("UNABLE_TO_VERIFY_LEAF_SIGNATURE"),
            "unable to verify the first certificate",
        );
    }
    let message = error.to_string();
    UpstreamError::new(Some("ERR_NETWORK"), message)
}
