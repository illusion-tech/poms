//! Original Zod request behavior; database/output rows are never validated here.

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json, value::RawValue};

use super::model::{CreateRequest, MaterialInput, TimelineInput};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    dictionary::validation::{failure, integer, invalid_type, json_type, object, text},
    error::ApiError,
    shared::generated::{
        BidCommercialDecision, BidCommercialMaterialStatus, BidCommercialMode,
        BidCommercialResultStatus, BidCommercialStage, BidCommercialTimelineStatus,
    },
};

const DATETIME_PATTERN: &str = r"/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/";

fn enumeration<E: AsRef<str>>(
    object: &JsObject<'_>,
    key: &str,
    members: &[E],
    errors: &mut Vec<Value>,
) -> Option<String> {
    let values = members
        .iter()
        .map(|member| member.as_ref())
        .collect::<Vec<_>>();
    if let Some(value) = object
        .get(key)
        .and_then(|raw| decode_string(raw.get()).ok())
        && values.iter().any(|candidate| value.eq_ascii(candidate))
    {
        return Some(value.to_utf8_lossy());
    }
    let allowed = values
        .iter()
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    errors.push(json!({
        "code":"invalid_value","values":values,"path":[key],
        "message":format!("Invalid option: expected one of {allowed}")
    }));
    None
}

fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ApiError> {
    match object.get(key) {
        None => Ok(None),
        Some(raw) if raw.get() == "null" => Ok(None),
        Some(_) => text(object, key, false, true, 1, max, errors),
    }
}

fn boolean(object: &JsObject<'_>, key: &str, errors: &mut Vec<Value>) -> bool {
    match object.get(key) {
        None => false,
        Some(raw) if raw.get() == "true" => true,
        Some(raw) if raw.get() == "false" => false,
        Some(raw) => {
            errors.push(invalid_type(
                "boolean",
                json_type(Some(raw)),
                vec![json!(key)],
            ));
            false
        }
    }
}

// Original z.iso.datetime(): seconds, uppercase T/Z, Gregorian year0000,
// arbitrary fractional precision. JavaScript Date truncates fractions to ms.
fn datetime_value(value: &str) -> Option<DateTime<Utc>> {
    if !value.is_ascii() || value.len() < 20 {
        return None;
    }
    let bytes = value.as_bytes();
    if bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes.last() != Some(&b'Z')
    {
        return None;
    }
    for range in [0..4, 5..7, 8..10, 11..13, 14..16, 17..19] {
        if !bytes[range].iter().all(u8::is_ascii_digit) {
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

fn datetime(object: &JsObject<'_>, key: &str, errors: &mut Vec<Value>) -> Option<DateTime<Utc>> {
    let raw = object.get(key)?;
    if raw.get() == "null" {
        return None;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!(key)],
        ));
        return None;
    };
    if let Some(value) = datetime_value(&value.to_utf8_lossy()) {
        return Some(value);
    }
    errors.push(json!({
        "origin":"string","code":"invalid_format","format":"datetime",
        "pattern":DATETIME_PATTERN,"path":[key],"message":"Invalid ISO datetime"
    }));
    None
}

fn child_errors(parent: &str, index: usize, errors: Vec<Value>, output: &mut Vec<Value>) {
    for mut error in errors {
        let mut path = vec![json!(parent), json!(index)];
        if let Some(existing) = error.get("path").and_then(Value::as_array) {
            path.extend(existing.iter().cloned());
        }
        error["path"] = Value::Array(path);
        output.push(error);
    }
}

fn array<'a>(
    object: &JsObject<'a>,
    key: &str,
    errors: &mut Vec<Value>,
) -> Result<Vec<&'a RawValue>, ApiError> {
    let Some(raw) = object.get(key) else {
        return Ok(Vec::new());
    };
    if json_type(Some(raw)) != "array" {
        errors.push(invalid_type(
            "array",
            json_type(Some(raw)),
            vec![json!(key)],
        ));
        return Ok(Vec::new());
    }
    serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())
}

fn material_items(
    object: &JsObject<'_>,
    errors: &mut Vec<Value>,
) -> Result<Vec<MaterialInput>, ApiError> {
    let mut output = Vec::new();
    for (index, raw) in array(object, "materialItems", errors)?
        .into_iter()
        .enumerate()
    {
        let Ok(item) = JsObject::parse(raw.get()) else {
            errors.push(invalid_type(
                "object",
                json_type(Some(raw)),
                vec![json!("materialItems"), json!(index)],
            ));
            continue;
        };
        let mut item_errors = Vec::new();
        let material_key = text(&item, "materialKey", true, true, 1, 128, &mut item_errors)?;
        let label = text(&item, "label", true, true, 1, 255, &mut item_errors)?;
        let material_status = enumeration(
            &item,
            "materialStatus",
            BidCommercialMaterialStatus::ALL,
            &mut item_errors,
        );
        let responsible_role = nullable_text(&item, "responsibleRole", 128, &mut item_errors)?;
        let due_at = datetime(&item, "dueAt", &mut item_errors);
        let blocks_next_step = boolean(&item, "blocksNextStep", &mut item_errors);
        let navigation_hint = nullable_text(&item, "navigationHint", 255, &mut item_errors)?;
        let sort_order = integer(&item, "sortOrder", Some(0), &mut item_errors);
        child_errors("materialItems", index, item_errors, errors);
        if let (Some(material_key), Some(label), Some(material_status)) =
            (material_key, label, material_status)
        {
            output.push(MaterialInput {
                material_key,
                label,
                material_status,
                responsible_role,
                due_at,
                blocks_next_step,
                navigation_hint,
                sort_order,
            });
        }
    }
    Ok(output)
}

fn timeline_items(
    object: &JsObject<'_>,
    errors: &mut Vec<Value>,
) -> Result<Vec<TimelineInput>, ApiError> {
    let mut output = Vec::new();
    for (index, raw) in array(object, "timelineItems", errors)?
        .into_iter()
        .enumerate()
    {
        let Ok(item) = JsObject::parse(raw.get()) else {
            errors.push(invalid_type(
                "object",
                json_type(Some(raw)),
                vec![json!("timelineItems"), json!(index)],
            ));
            continue;
        };
        let mut item_errors = Vec::new();
        let event_key = text(&item, "eventKey", true, true, 1, 128, &mut item_errors)?;
        let label = text(&item, "label", true, true, 1, 255, &mut item_errors)?;
        let summary = nullable_text(&item, "summary", 1000, &mut item_errors)?;
        let timeline_status = enumeration(
            &item,
            "timelineStatus",
            BidCommercialTimelineStatus::ALL,
            &mut item_errors,
        );
        let occurred_at = datetime(&item, "occurredAt", &mut item_errors);
        let due_at = datetime(&item, "dueAt", &mut item_errors);
        let responsible_role = nullable_text(&item, "responsibleRole", 128, &mut item_errors)?;
        let sort_order = integer(&item, "sortOrder", Some(0), &mut item_errors);
        child_errors("timelineItems", index, item_errors, errors);
        if let (Some(event_key), Some(label), Some(timeline_status)) =
            (event_key, label, timeline_status)
        {
            output.push(TimelineInput {
                event_key,
                label,
                summary,
                timeline_status,
                occurred_at,
                due_at,
                responsible_role,
                sort_order,
            });
        }
    }
    Ok(output)
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateRequest, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let bid_mode = enumeration(&object, "bidMode", BidCommercialMode::ALL, &mut errors);
    let current_stage = enumeration(
        &object,
        "currentStage",
        BidCommercialStage::ALL,
        &mut errors,
    );
    let decision = enumeration(&object, "decision", BidCommercialDecision::ALL, &mut errors);
    let result_status = enumeration(
        &object,
        "resultStatus",
        BidCommercialResultStatus::ALL,
        &mut errors,
    );
    let process_summary = text(&object, "processSummary", true, true, 1, 2000, &mut errors)?;
    let decision_summary = nullable_text(&object, "decisionSummary", 1000, &mut errors)?;
    let result_summary = nullable_text(&object, "resultSummary", 1000, &mut errors)?;
    let tender_no = nullable_text(&object, "tenderNo", 128, &mut errors)?;
    let bid_package_no = nullable_text(&object, "bidPackageNo", 128, &mut errors)?;
    let owner_role = nullable_text(&object, "ownerRole", 128, &mut errors)?;
    let material_items = material_items(&object, &mut errors)?;
    let timeline_items = timeline_items(&object, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (
        bid_mode,
        current_stage,
        decision,
        result_status,
        process_summary,
    ) {
        (
            Some(bid_mode),
            Some(current_stage),
            Some(decision),
            Some(result_status),
            Some(process_summary),
        ) => Ok(CreateRequest {
            bid_mode,
            current_stage,
            decision,
            result_status,
            process_summary,
            decision_summary,
            result_summary,
            tender_no,
            bid_package_no,
            owner_role,
            material_items,
            timeline_items,
        }),
        _ => Err(ApiError::internal()),
    }
}
