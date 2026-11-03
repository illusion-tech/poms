//! The two unchanged request-only Zod objects. Responses never validate here.
use crate::{
    approval_common::{
        Text,
        js::{Data, Value},
    },
    dictionary::validation::{failure, integer, object, text},
    error::ApiError,
};

pub(super) fn validate(raw: Option<&str>, reject: bool) -> Result<Data, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let reason = if reject {
        text(&object, "reason", true, true, 1, 255, &mut errors)?
    } else {
        None
    };
    let comment = text(&object, "comment", false, true, 1, 1000, &mut errors)?;
    let version_issue_start = errors.len();
    let expected = integer(&object, "expectedVersion", Some(1), &mut errors);
    // The shared helper's historical non-finite issue loses the negative sign.
    // The unchanged L Zod schema retains it in both received and message.
    if object
        .get("expectedVersion")
        .is_some_and(|raw| raw.get().parse::<f64>().ok() == Some(f64::NEG_INFINITY))
    {
        for issue in &mut errors[version_issue_start..] {
            if issue["code"] == "invalid_type" && issue["received"] == "Infinity" {
                issue["received"] = serde_json::json!("-Infinity");
                issue["message"] =
                    serde_json::json!("Invalid input: expected number, received -Infinity");
            }
        }
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    let mut output = Data::new();
    if let Some(reason) = reason {
        output.insert("reason".into(), Value::Text(Text::from_js(reason)));
    }
    if let Some(comment) = comment {
        output.insert("comment".into(), Value::Text(Text::from_js(comment)));
    }
    if let Some(expected) = expected {
        output.insert("expectedVersion".into(), Value::Number(expected as f64));
    }
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    use serde_json::Value as JsonValue;

    #[tokio::test]
    async fn complete_original_two_schema_corpus() {
        let oracle: JsonValue = serde_json::from_str(include_str!("request_original.json"))
            .unwrap_or_else(|error| panic!("original request corpus: {error}"));
        let cases = oracle["cases"]
            .as_array()
            .unwrap_or_else(|| panic!("original cases"));
        assert_eq!(cases.len(), 86);
        for case in cases {
            let result = validate(
                case["inputRaw"].as_str(),
                case["schema"] == "RejectApprovalRecordRequest",
            );
            if case["expected"]["success"] == true {
                let output = result.unwrap_or_else(|error| {
                    panic!("{} {}: {error:?}", case["schema"], case["name"])
                });
                let expected = Value::parse(case["expected"]["dataRaw"].as_str().unwrap_or("null"))
                    .unwrap_or_else(|error| panic!("{error}"));
                assert_eq!(
                    Value::Object(output),
                    expected,
                    "{} {}",
                    case["schema"],
                    case["name"]
                );
            } else {
                let response = result
                    .err()
                    .unwrap_or_else(|| panic!("expected original request failure"))
                    .into_response();
                assert_eq!(response.status().as_u16(), 400);
                let bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
                    .await
                    .unwrap_or_else(|error| panic!("{error}"));
                let body: JsonValue =
                    serde_json::from_slice(&bytes).unwrap_or_else(|error| panic!("{error}"));
                assert_eq!(
                    body, case["expected"]["response"],
                    "{} {}",
                    case["schema"], case["name"]
                );
            }
        }
    }
}
