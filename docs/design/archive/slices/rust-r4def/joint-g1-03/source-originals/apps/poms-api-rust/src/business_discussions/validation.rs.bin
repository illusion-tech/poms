//! Existing request fields and code-point limits. Persisted body text must also
//! round-trip through the database without NUL failures or Unicode replacement.

use serde_json::{Value, json};

use super::model::{Create, Query};
use crate::{
    auth::js_json::JsObject,
    compat::json::Field,
    customer_contacts::validation::{enumeration, uuid},
    dictionary::validation::{failure, invalid_type, json_type, object, text},
    error::ApiError,
    opportunity_context::validation::storable_text_error,
};

const TARGET_TYPES: &[&str] = &["customer", "lead", "project"];
const DISCUSSION_TYPES: &[&str] = &[
    "intelligence-supplement",
    "decision-chain",
    "competition",
    "strategy",
    "risk",
    "general",
];

fn optional(field: Field<String>) -> Option<String> {
    match field {
        Field::Value(value) => Some(value),
        Field::Missing | Field::Null => None,
    }
}

fn boolean(object: &JsObject<'_>, key: &str, errors: &mut Vec<Value>) -> Option<bool> {
    let raw = object.get(key)?;
    match raw.get() {
        "true" => Some(true),
        "false" => Some(false),
        _ => {
            errors.push(invalid_type(
                "boolean",
                json_type(Some(raw)),
                vec![json!(key)],
            ));
            None
        }
    }
}

pub fn validate_query(raw: Option<&str>) -> Result<Query, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let customer_id = optional(uuid(&object, "customerId", false, false, &mut errors));
    let lead_id = optional(uuid(&object, "leadId", false, false, &mut errors));
    let project_id = optional(uuid(&object, "projectId", false, false, &mut errors));
    if errors.is_empty() && customer_id.is_none() && lead_id.is_none() && project_id.is_none() {
        errors.push(json!({"code":"custom","path":[],"message":"At least one discussion target anchor is required"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Query {
        customer_id,
        lead_id,
        project_id,
    })
}

pub fn validate_create(raw: Option<&str>) -> Result<Create, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let target_object_type =
        enumeration(&object, "targetObjectType", true, TARGET_TYPES, &mut errors);
    let target_object_id = uuid(&object, "targetObjectId", true, false, &mut errors);
    let discussion_type = enumeration(
        &object,
        "discussionType",
        true,
        DISCUSSION_TYPES,
        &mut errors,
    );
    let body = text(&object, "body", true, true, 1, 8000, &mut errors)?;
    if let Some(value) = body.as_ref()
        && let Some(error) = storable_text_error(value, vec![json!("body")])
    {
        errors.push(error);
    }
    let related_contact_id = uuid(&object, "relatedContactId", false, true, &mut errors);
    let related_competitor_record_id = uuid(
        &object,
        "relatedCompetitorRecordId",
        false,
        true,
        &mut errors,
    );
    let related_follow_up_record_id =
        uuid(&object, "relatedFollowUpRecordId", false, true, &mut errors);
    let is_pinned = boolean(&object, "isPinned", &mut errors);
    let is_key_conclusion = boolean(&object, "isKeyConclusion", &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (target_object_type, target_object_id, discussion_type, body) {
        (
            Some(target_object_type),
            Field::Value(target_object_id),
            Some(discussion_type),
            Some(body),
        ) => Ok(Create {
            target_object_type,
            target_object_id,
            discussion_type,
            body,
            related_contact_id,
            related_competitor_record_id,
            related_follow_up_record_id,
            is_pinned,
            is_key_conclusion,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{http::StatusCode, response::IntoResponse};

    const ID: &str = "A1000000-0000-4000-8000-000000000001";

    fn request(body: &str) -> String {
        json!({"targetObjectType":"customer","targetObjectId":ID,"discussionType":"general","body":body}).to_string()
    }

    #[test]
    fn valid_body_keeps_code_point_limit_and_original_uuid_spelling() {
        let accepted = validate_create(Some(&request(&"😀".repeat(8000))))
            .unwrap_or_else(|_| panic!("8000 valid astral characters are within the contract"));
        assert_eq!(accepted.body.as_code_units().len(), 16000);
        assert_eq!(accepted.body.to_utf8_lossy(), "😀".repeat(8000));
        assert_eq!(accepted.target_object_id, ID);
        assert!(validate_create(Some(&request(&"😀".repeat(8001)))).is_err());
    }

    #[test]
    fn unrepresentable_body_is_rejected_before_persistence() {
        for body in [r"\u0000", r"A\ud800B", r"A\udfffB"] {
            let raw = format!(
                r#"{{"targetObjectType":"customer","targetObjectId":"{ID}","discussionType":"general","body":"{body}"}}"#
            );
            let Err(error) = validate_create(Some(&raw)) else {
                panic!("unrepresentable persistent body must not reach storage");
            };
            assert_eq!(error.into_response().status(), StatusCode::BAD_REQUEST);
        }
    }

    #[test]
    fn stripped_unknown_text_does_not_change_a_valid_body() {
        let raw = format!(
            r#"{{"targetObjectType":"customer","targetObjectId":"{ID}","discussionType":"general","body":"有效正文😀","unknown":"\u0000\ud800"}}"#
        );
        let accepted = validate_create(Some(&raw))
            .unwrap_or_else(|_| panic!("only declared persistent text fields are validated"));
        assert_eq!(accepted.body.to_utf8_lossy(), "有效正文😀");
    }

    #[test]
    fn trim_nullable_links_and_boolean_types_match_the_source_contract() {
        for body in ["\u{85}a\u{85}", "\u{200b}a\u{200b}"] {
            let value = validate_create(Some(&request(body)))
                .unwrap_or_else(|_| panic!("schema accepts text"));
            assert_eq!(value.body.to_utf8_lossy(), body);
        }
        let mut raw: Value =
            serde_json::from_str(&request(" body ")).unwrap_or_else(|_| panic!("test JSON"));
        raw["relatedContactId"] = Value::Null;
        raw["isPinned"] = json!(false);
        let input =
            validate_create(Some(&raw.to_string())).unwrap_or_else(|_| panic!("nullable link"));
        assert!(input.related_contact_id.is_null());
        assert!(input.related_competitor_record_id.is_missing());
        assert_eq!(input.body.to_utf8_lossy(), "body");
        for flag in [Value::Null, json!("true"), json!(1)] {
            raw["isPinned"] = flag;
            assert!(validate_create(Some(&raw.to_string())).is_err());
        }
    }

    #[test]
    fn query_allows_multiple_anchors_but_requires_one_and_rejects_repeated_values() {
        let raw = json!({"customerId":ID,"leadId":ID,"projectId":ID,"extra":1}).to_string();
        let value = validate_query(Some(&raw)).unwrap_or_else(|_| panic!("multiple anchors"));
        assert_eq!(value.customer_id.as_deref(), Some(ID));
        assert!(value.lead_id.is_some() && value.project_id.is_some());
        assert!(validate_query(Some("{}")).is_err());
        assert!(validate_query(Some(r#"{"customerId":null}"#)).is_err());
        assert!(
            validate_query(Some(&query_raw(Some(&format!("leadId={ID}&leadId={ID}"))))).is_err()
        );
    }
}
