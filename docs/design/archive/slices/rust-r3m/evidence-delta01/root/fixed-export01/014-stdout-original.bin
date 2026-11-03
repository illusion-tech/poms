//! Controlled loopback-only acceptance driver, never an HTTP API endpoint.
use std::{
    collections::HashMap,
    io::{self, BufRead, Write},
};

use poms_api_rust::provider_support::{
    ProviderSettings, QueryEncoding, UpstreamHttpClient, UpstreamRequest, UpstreamResponse,
};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Input {
    method: String,
    url: String,
    #[serde(default)]
    headers: Vec<(String, String)>,
    #[serde(default)]
    query: Vec<(String, String)>,
    query_encoding: String,
    json: Option<Value>,
    timeout_ms: f64,
    #[serde(default)]
    settings: HashMap<String, String>,
}

fn response(value: UpstreamResponse) -> Value {
    json!({"status":value.status,"data":value.data,"rawData":value.raw_data})
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    for line in io::stdin().lock().lines() {
        let input: Input = serde_json::from_str(&line?)?;
        let url = url::Url::parse(&input.url)?;
        if !matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]")) {
            return Err("Probe only accepts a loopback protocol fixture".into());
        }
        for (key, value) in &input.settings {
            if key.to_lowercase().contains("proxy")
                && !value.is_empty()
                && !key.to_lowercase().contains("no_proxy")
            {
                let proxy = url::Url::parse(value)?;
                if !matches!(proxy.host_str(), Some("localhost" | "127.0.0.1" | "[::1]")) {
                    return Err("Probe proxy must be loopback".into());
                }
            }
        }
        let client = UpstreamHttpClient::new(std::sync::Arc::new(ProviderSettings::from_map(
            &input.settings,
        )));
        let request = UpstreamRequest {
            method: input.method,
            url: input.url,
            headers: input.headers,
            query: input.query,
            query_encoding: match input.query_encoding.as_str() {
                "axios-object" => QueryEncoding::AxiosObject,
                "url-search-params" => QueryEncoding::UrlSearchParams,
                _ => return Err("Unknown query encoder".into()),
            },
            json: input.json,
            timeout_ms: input.timeout_ms,
        };
        let output = match client.execute(request).await {
            Ok(value) => json!({"success":true,"response":response(value)}),
            Err(error) => {
                json!({"success":false,"isAxiosError":error.is_axios_error,"code":error.code,"message":error.message,"response":error.response.map(|value| response(*value))})
            }
        };
        println!("{}", serde_json::to_string(&output)?);
        io::stdout().flush()?;
    }
    Ok(())
}
