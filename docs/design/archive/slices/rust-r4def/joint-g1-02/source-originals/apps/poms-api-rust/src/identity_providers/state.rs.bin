//! Signed original state: nonce is payload entropy, without server-side consumption.
use crate::{
    auth::{
        crypto::node_base64,
        js_json::{JsObject, decode_string},
    },
    error::ApiError,
    provider_support::StateSigner,
};
use axum::http::StatusCode;
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
use serde_json::{json, value::RawValue};

#[derive(Clone)]
pub struct StatePayload {
    pub config_id: String,
    pub operator_id: Option<String>,
}
pub fn create(
    signer: &StateSigner,
    config_id: &str,
    operator_id: Option<&str>,
    now: DateTime<Utc>,
) -> Result<(String, DateTime<Utc>), ApiError> {
    let expires = DateTime::from_timestamp_millis(now.timestamp_millis() + 600_000)
        .ok_or_else(ApiError::internal)?;
    let mut nonce = [0_u8; 16];
    getrandom::fill(&mut nonce).map_err(|_| ApiError::internal())?;
    // Keep original JSON key insertion order before signing.
    let payload = if let Some(operator) = operator_id {
        format!(
            "{{\"purpose\":\"identity-provider-admin-grant\",\"identityProviderConfigId\":{},\"operatorId\":{},\"nonce\":{},\"exp\":{}}}",
            json!(config_id),
            json!(operator),
            json!(URL_SAFE_NO_PAD.encode(nonce)),
            expires.timestamp_millis()
        )
    } else {
        format!(
            "{{\"purpose\":\"identity-provider-login\",\"identityProviderConfigId\":{},\"nonce\":{},\"exp\":{}}}",
            json!(config_id),
            json!(URL_SAFE_NO_PAD.encode(nonce)),
            expires.timestamp_millis()
        )
    };
    let encoded = URL_SAFE_NO_PAD.encode(payload.as_bytes());
    let signature = signer.sign(&encoded).map_err(|_| ApiError::internal())?;
    Ok((format!("{encoded}.{signature}"), expires))
}
pub fn verify(
    signer: &StateSigner,
    value: &str,
    admin: bool,
    now_ms: i64,
) -> Result<StatePayload, ApiError> {
    let failure = |message: &str| {
        ApiError::message(
            if admin {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::UNAUTHORIZED
            },
            message,
        )
    };
    let parts = value.split('.').collect::<Vec<_>>();
    if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
        return Err(failure("Invalid provider OAuth state."));
    }
    if !signer
        .verify_signature(parts[0], parts[1])
        .map_err(|_| ApiError::internal())?
    {
        return Err(failure("Invalid provider OAuth state signature."));
    }
    let decoded = String::from_utf8_lossy(&node_base64(parts[0])).into_owned();
    let raw = serde_json::from_str::<&RawValue>(&decoded)
        .map_err(|_| failure("Invalid provider OAuth state payload."))?;
    if raw.get() == "null" {
        return Err(ApiError::internal());
    }
    let payload =
        JsObject::parse(raw.get()).map_err(|_| failure("Invalid provider OAuth state payload."))?;
    let text = |key: &str| {
        payload
            .get(key)
            .and_then(|raw| decode_string(raw.get()).ok())
            .map(|v| v.to_utf8_lossy())
    };
    let purpose = text("purpose");
    let config_id = text("identityProviderConfigId");
    let operator_id = text("operatorId");
    let exp = payload
        .get("exp")
        .filter(|v| matches!(v.get().as_bytes().first(), Some(b'-' | b'0'..=b'9')))
        .and_then(|v| v.get().parse::<f64>().ok());
    if purpose.as_deref()
        != Some(if admin {
            "identity-provider-admin-grant"
        } else {
            "identity-provider-login"
        })
        || config_id.is_none()
        || admin && operator_id.is_none()
        || exp.is_none()
    {
        return Err(failure("Invalid provider OAuth state payload."));
    }
    if exp.is_some_and(|exp| exp <= now_ms as f64) {
        return Err(failure("Provider OAuth state has expired."));
    }
    Ok(StatePayload {
        config_id: config_id.unwrap_or_default(),
        operator_id,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::provider_support::ProviderSettings;
    use axum::response::IntoResponse;
    use serde_json::Value;
    use std::collections::HashMap;
    #[tokio::test]
    async fn original_state_methods_match_node_buffer_and_number_cases() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2gh/g-state-golden.json"
        ))
        .unwrap_or(Value::Null);
        let mut env = HashMap::new();
        env.insert(
            "IDENTITY_PROVIDER_STATE_KEY".into(),
            "g-synthetic-state-key".into(),
        );
        let signer = StateSigner::new(&ProviderSettings::from_map(&env));
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let result = verify(
                &signer,
                case["state"].as_str().unwrap_or(""),
                case["method"] == "verifyOAuthState",
                corpus["nowMs"].as_i64().unwrap_or(0),
            );
            if case["expected"]["success"] == true {
                let value =
                    result.unwrap_or_else(|_| panic!("state {} {}", case["method"], case["name"]));
                assert_eq!(
                    value.config_id,
                    case["expected"]["data"]["identityProviderConfigId"]
                        .as_str()
                        .unwrap_or("")
                );
            } else {
                let response = result
                    .err()
                    .unwrap_or_else(|| panic!("state must reject"))
                    .into_response();
                let expected = case["expected"]["status"].as_u64().unwrap_or(500);
                assert_eq!(
                    response.status().as_u16() as u64,
                    expected,
                    "state {} {}",
                    case["method"],
                    case["name"]
                );
            }
        }
    }
}
