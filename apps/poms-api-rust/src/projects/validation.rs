//! Five finite original request contracts. Shared scalar helpers preserve the
//! pinned Zod issue shapes; the joint original oracle governs code-point length.

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};

use super::model::{
    CreateProject, ProjectInitialOwnership, ProjectListQuery, ReassignProjectOwner, UpdateProject,
};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::json::Field,
    dictionary::validation::{failure, integer, invalid_type, json_type, object, text},
    error::ApiError,
    project_operating_common::model::ProjectStage as QueryProjectStage,
    shared::generated::{ProjectStage, ProjectStatus},
};

const UUID_PATTERN: &str = "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/";
const DATETIME_PATTERN: &str = r"/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/";

fn valid_uuid(value: &str) -> bool {
    if value == "00000000-0000-0000-0000-000000000000"
        || value == "ffffffff-ffff-ffff-ffff-ffffffffffff"
    {
        return true;
    }
    let bytes = value.as_bytes();
    bytes.len() == 36
        && bytes.iter().enumerate().all(|(index, byte)| {
            if [8, 13, 18, 23].contains(&index) {
                *byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
        && matches!(bytes[14], b'1'..=b'8')
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'A' | b'b' | b'B')
}

fn uuid(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    nullable: bool,
    errors: &mut Vec<Value>,
) -> Field<String> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return Field::Missing;
    }
    if nullable && raw.is_some_and(|value| value.get() == "null") {
        return Field::Null;
    }
    let Some(value) = raw.and_then(|value| decode_string(value.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), vec![json!(key)]));
        return Field::Missing;
    };
    let value = value.to_utf8_lossy();
    if !valid_uuid(&value) {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":UUID_PATTERN,"path":[key],"message":"Invalid UUID"}));
    }
    Field::Value(value)
}

fn optional_uuid(object: &JsObject<'_>, key: &str, errors: &mut Vec<Value>) -> Option<String> {
    match uuid(object, key, false, false, errors) {
        Field::Value(value) => Some(value),
        _ => None,
    }
}

fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ApiError> {
    match object.get(key) {
        None => Ok(Field::Missing),
        Some(value) if value.get() == "null" => Ok(Field::Null),
        Some(_) => Ok(
            text(object, key, false, true, 1, 128, errors)?.map_or(Field::Missing, Field::Value)
        ),
    }
}

fn enumeration(
    object: &JsObject<'_>,
    key: &str,
    values: &[&str],
    errors: &mut Vec<Value>,
) -> Option<String> {
    let raw = object.get(key)?;
    if let Some(value) = decode_string(raw.get())
        .ok()
        .map(|value| value.to_utf8_lossy())
        && values.contains(&value.as_str())
    {
        return Some(value);
    }
    let allowed = values
        .iter()
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    errors.push(json!({"code":"invalid_value","values":values,"path":[key],"message":format!("Invalid option: expected one of {allowed}")}));
    None
}

fn stage(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Option<ProjectStage> {
    enumeration(object, "currentStage", &["assessment"], errors)
        .and_then(|value| value.parse().ok())
}

/// Original z.iso.datetime() requires seconds and uppercase T/Z, accepts any
/// fractional precision and Gregorian year 0000. new Date truncates to millis.
fn datetime_value(value: &str) -> Option<DateTime<Utc>> {
    if !value.is_ascii() || value.len() < 20 {
        return None;
    }
    let b = value.as_bytes();
    if b[4] != b'-'
        || b[7] != b'-'
        || b[10] != b'T'
        || b[13] != b':'
        || b[16] != b':'
        || b.last() != Some(&b'Z')
    {
        return None;
    }
    for range in [0..4, 5..7, 8..10, 11..13, 14..16, 17..19] {
        if !b[range].iter().all(u8::is_ascii_digit) {
            return None;
        }
    }
    let fraction = &value[19..value.len() - 1];
    let millis = if fraction.is_empty() {
        0
    } else {
        let digits = fraction.strip_prefix('.')?;
        if digits.is_empty() || !digits.bytes().all(|byte| byte.is_ascii_digit()) {
            return None;
        }
        digits
            .bytes()
            .take(3)
            .enumerate()
            .map(|(index, byte)| u32::from(byte - b'0') * [100, 10, 1][index])
            .sum()
    };
    NaiveDate::from_ymd_opt(
        value[..4].parse().ok()?,
        value[5..7].parse().ok()?,
        value[8..10].parse().ok()?,
    )?
    .and_hms_milli_opt(
        value[11..13].parse().ok()?,
        value[14..16].parse().ok()?,
        value[17..19].parse().ok()?,
        millis,
    )
    .map(|value| value.and_utc())
}

fn datetime(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Field<DateTime<Utc>> {
    let Some(raw) = object.get("plannedSignAt") else {
        return Field::Missing;
    };
    if raw.get() == "null" {
        return Field::Null;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!("plannedSignAt")],
        ));
        return Field::Missing;
    };
    if let Some(value) = datetime_value(&value.to_utf8_lossy()) {
        return Field::Value(value);
    }
    errors.push(json!({"origin":"string","code":"invalid_format","format":"datetime","pattern":DATETIME_PATTERN,"path":["plannedSignAt"],"message":"Invalid ISO datetime"}));
    Field::Missing
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateProject, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let project_name = text(&object, "projectName", true, true, 1, 255, &mut errors)?;
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    let customer_project_no = nullable_text(&object, "customerProjectNo", &mut errors)?;
    let current_stage = stage(&object, &mut errors);
    let ownership_values = ProjectInitialOwnership::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let initial_ownership =
        match enumeration(&object, "initialOwnership", &ownership_values, &mut errors) {
            Some(value) => value.parse().map_err(|_| ApiError::internal())?,
            None => ProjectInitialOwnership::Creator,
        };
    let planned_sign_at = datetime(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (project_name, customer_id) {
        (Some(project_name), Field::Value(customer_id)) => Ok(CreateProject {
            project_name,
            customer_id,
            customer_project_no,
            current_stage,
            initial_ownership,
            planned_sign_at,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update(raw: Option<&str>) -> Result<UpdateProject, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let project_name = text(&object, "projectName", false, true, 1, 255, &mut errors)?;
    let customer_id = optional_uuid(&object, "customerId", &mut errors);
    let customer_project_no = nullable_text(&object, "customerProjectNo", &mut errors)?;
    let planned_sign_at = datetime(&object, &mut errors);
    if errors.is_empty()
        && project_name.is_none()
        && customer_id.is_none()
        && customer_project_no.is_missing()
        && planned_sign_at.is_missing()
    {
        errors.push(json!({"code":"custom","path":[],"message":"At least one field is required for update"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateProject {
        project_name,
        customer_id,
        customer_project_no,
        planned_sign_at,
    })
}

pub fn validate_reassign(raw: Option<&str>) -> Result<ReassignProjectOwner, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let owner_user_id = uuid(&object, "ownerUserId", true, false, &mut errors);
    let owner_org_id = uuid(&object, "ownerOrgId", false, true, &mut errors);
    let reason = text(&object, "reason", true, true, 1, 1000, &mut errors)?;
    let expected_version = integer(&object, "expectedVersion", Some(1), &mut errors);
    if object.get("expectedVersion").is_none() {
        errors.push(invalid_type(
            "number",
            "undefined",
            vec![json!("expectedVersion")],
        ));
    }
    if expected_version.is_some_and(|version| version > i64::from(i32::MAX)) {
        errors.push(json!({"origin":"number","code":"too_big","maximum":i32::MAX,"inclusive":true,"path":["expectedVersion"],"message":"expectedVersion must fit positive int4"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (owner_user_id, reason) {
        (Field::Value(owner_user_id), Some(reason)) => Ok(ReassignProjectOwner {
            owner_user_id,
            owner_org_id,
            reason,
            expected_version,
        }),
        _ => Err(ApiError::internal()),
    }
}

/// Query consumes the versioned public enum generated from the current TS
/// canonical contract; create independently remains assessment-only.
fn query_stage(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Option<QueryProjectStage> {
    let raw = object.get("currentStage")?;
    if let Some(value) = decode_string(raw.get())
        .ok()
        .map(|value| value.to_utf8_lossy())
        && let Ok(stage) = serde_json::from_value::<QueryProjectStage>(Value::String(value))
    {
        return Some(stage);
    }
    // Error metadata comes from the same certified schema, never a parallel
    // handwritten list. A model/registry mismatch fails closed, never unfilters.
    let values = crate::project_operating_common::schema::public_registry()["components"]["schemas"]["ProjectStage"]["enum"]
        .as_array().cloned().unwrap_or_default();
    let allowed = values
        .iter()
        .filter_map(Value::as_str)
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    errors.push(json!({"code":"invalid_value","values":values,"path":["currentStage"],"message":format!("Invalid option: expected one of {allowed}")}));
    None
}

pub fn validate_query(raw: Option<&str>) -> Result<ProjectListQuery, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let values = ProjectStatus::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let status =
        enumeration(&object, "status", &values, &mut errors).and_then(|value| value.parse().ok());
    let current_stage = query_stage(&object, &mut errors);
    let owner_org_id = optional_uuid(&object, "ownerOrgId", &mut errors);
    let keyword = text(&object, "keyword", false, true, 1, 128, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(ProjectListQuery {
        status,
        current_stage,
        owner_org_id,
        keyword,
    })
}

pub fn validate_lookup(raw: Option<&str>) -> Result<JsString, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let project_no = text(
        &object,
        "projectNo",
        true,
        false,
        1,
        usize::MAX,
        &mut errors,
    )?;
    // This original schema has a minimum only. The shared bounded-string
    // helper's pathological non-number length maximum issue does not apply.
    errors.retain(|issue| issue["code"] != "too_big");
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    project_no.ok_or_else(ApiError::internal)
}

pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::projects::model::js;

    const CUSTOMER: &str = "11000000-0000-4000-8000-000000000001";

    #[test]
    fn omitted_and_explicit_creator_modes_keep_the_original_creator_default() {
        for ownership in [None, Some(json!("creator"))] {
            let mut body = json!({"projectName":"真实默认创建人主责回归","customerId":CUSTOMER});
            if let Some(ownership) = ownership {
                body["initialOwnership"] = ownership;
            }
            let parsed = validate_create(Some(&body.to_string()))
                .unwrap_or_else(|_| panic!("valid default/creator request"));
            assert_eq!(parsed.initial_ownership, ProjectInitialOwnership::Creator);
            assert!(parsed.current_stage.is_none());
        }
    }

    #[test]
    fn organization_mode_is_an_explicit_optional_nonnullable_enum() {
        let body = json!({"projectName":"真实组织承接回归","customerId":CUSTOMER,"initialOwnership":"organization"});
        let parsed = validate_create(Some(&body.to_string()))
            .unwrap_or_else(|_| panic!("valid organization request"));
        assert_eq!(
            parsed.initial_ownership,
            ProjectInitialOwnership::Organization
        );
        for invalid in [
            Value::Null,
            json!("org-owned"),
            json!("Organization"),
            json!(" organization"),
            json!(""),
            json!(true),
            json!(1),
            json!({}),
        ] {
            let body = json!({"projectName":"非法承接模式","customerId":CUSTOMER,"initialOwnership":invalid});
            assert!(validate_create(Some(&body.to_string())).is_err());
        }
    }

    #[test]
    fn ownership_choice_cannot_create_an_advanced_stage() {
        for ownership in ["creator", "organization"] {
            let body = json!({"projectName":"不能伪造执行准入","customerId":CUSTOMER,"initialOwnership":ownership,"currentStage":"execution"});
            assert!(validate_create(Some(&body.to_string())).is_err());
        }
    }

    #[test]
    fn list_stage_uses_current_public_enum_without_expanding_create() {
        let registry = crate::project_operating_common::schema::public_registry();
        let values = registry["components"]["schemas"]["ProjectStage"]["enum"]
            .as_array()
            .expect("registered public project stage");
        for stage in values.iter().filter_map(Value::as_str) {
            let raw = json!({"currentStage":stage}).to_string();
            let parsed = validate_query(Some(&raw))
                .unwrap_or_else(|_| panic!("registered query stage {stage}"));
            assert_eq!(
                parsed.current_stage.map(|value| value.as_str()),
                Some(stage)
            );
        }
        for value in [
            json!("unknown-stage"),
            json!("ConditionalCompleted"),
            json!(1),
            Value::Null,
        ] {
            assert!(validate_query(Some(&json!({"currentStage":value}).to_string())).is_err());
        }
        let create = json!({"projectName":"Project","customerId":CUSTOMER,"currentStage":"conditional-completed"}).to_string();
        assert!(validate_create(Some(&create)).is_err());
        let create =
            json!({"projectName":"Project","customerId":CUSTOMER,"currentStage":"assessment"})
                .to_string();
        assert!(validate_create(Some(&create)).is_ok());
    }

    #[test]
    fn project_strings_use_joint_oracle_code_points_after_js_trim() {
        for count in [128, 255] {
            let raw = json!({"projectName":format!("\u{feff}{}\u{3000}", "😀".repeat(count)),"customerId":CUSTOMER}).to_string();
            let value = validate_create(Some(&raw))
                .unwrap_or_else(|_| panic!("original accepts astral boundary"));
            assert_eq!(value.project_name, js(&"😀".repeat(count)));
        }
        let raw = json!({"projectName":"😀".repeat(256),"customerId":CUSTOMER}).to_string();
        assert!(validate_create(Some(&raw)).is_err());
    }

    #[test]
    fn missing_null_and_unknown_project_fields_stay_distinct() {
        assert!(validate_update(Some(r#"{"ownerUserId":"ignored","expectedVersion":1}"#)).is_err());
        let value = validate_update(Some(
            r#"{"plannedSignAt":null,"customerProjectNo":null,"status":"closed"}"#,
        ))
        .unwrap_or_else(|_| panic!("original explicit nullable update"));
        assert!(value.planned_sign_at.is_null());
        assert!(value.customer_project_no.is_null());
        assert!(value.customer_id.is_none());
        assert!(validate_update(Some(r#"{"customerId":null}"#)).is_err());
        assert!(validate_update(Some(r#"{"projectName":42}"#)).is_err());
    }

    #[test]
    fn dates_require_original_utc_z_schema_and_use_js_milliseconds() {
        assert_eq!(
            datetime_value("2026-01-02T03:04:05.123999999999Z")
                .map(|value| value.timestamp_subsec_millis()),
            Some(123)
        );
        assert!(datetime_value("0000-02-29T00:00:00Z").is_some());
        for invalid in [
            "2026-02-29T00:00:00Z",
            "2026-01-02",
            "2026-01-02T03:04Z",
            "2026-01-02T03:04:05+00:00",
            "2026-01-02t03:04:05z",
            "2026-01-02T24:00:00Z",
        ] {
            assert!(datetime_value(invalid).is_none());
        }
    }

    #[test]
    fn lookup_retains_business_number_and_simple_query_parser() {
        for number in [
            " ".to_owned(),
            " 123 ".to_owned(),
            "项目/一:二+ß".to_owned(),
            "P".repeat(1000),
        ] {
            let raw = json!({"projectNo":number,"extra":"ignored"}).to_string();
            assert_eq!(
                validate_lookup(Some(&raw)).unwrap_or_else(|_| panic!("original lookup scalar")),
                js(&number)
            );
        }
        let raw = query_raw(Some("projectNo=+A%2B%2F%3A&projectNo[]=ignored"));
        assert_eq!(
            validate_lookup(Some(&raw)).unwrap_or_else(|_| panic!("simple parser")),
            js(" A+/:")
        );
        let repeated = query_raw(Some("projectNo=A&projectNo=A"));
        assert!(validate_lookup(Some(&repeated)).is_err());
        assert!(validate_lookup(Some("{}")).is_err());
    }

    #[test]
    fn owner_version_does_not_coerce_and_org_has_three_states() {
        for version in [json!("1"), json!(0), json!(-1), json!(1.5), Value::Null] {
            let raw = json!({"ownerUserId":CUSTOMER,"reason":"调整","expectedVersion":version})
                .to_string();
            assert!(validate_reassign(Some(&raw)).is_err());
        }
        let raw =
            json!({"ownerUserId":CUSTOMER,"reason":" 调整 ","ownerOrgId":null,"expectedVersion":1})
                .to_string();
        let value = validate_reassign(Some(&raw)).unwrap_or_else(|_| panic!("explicit null org"));
        assert!(value.owner_org_id.is_null());
        assert_eq!(value.reason, js("调整"));
    }
}
