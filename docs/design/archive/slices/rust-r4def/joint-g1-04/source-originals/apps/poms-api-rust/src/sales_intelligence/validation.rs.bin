//! Request limits and local business text validity. Persisted rows are never
//! revalidated against write-side enums, lengths or the array max12 cap.

use serde_json::{Value, json, value::RawValue};

use super::model::{
    CreateCompetitor, CreateDiscovery, CreateStakeholder, Query, UpdateCompetitor, UpdateDiscovery,
    UpdateStakeholder,
};
use crate::{
    auth::js_json::{JsObject, JsString},
    compat::json::Field,
    customer_contacts::validation::{enumeration, nullable_text as schema_nullable_text, uuid},
    dictionary::validation::{failure, invalid_type, json_type, object, text as schema_text},
    error::ApiError,
    opportunity_context::validation::storable_text_error,
    shared::generated::{
        CompetitorPosition, CustomerPreference, OpportunityStakeholderAccessLevel,
        OpportunityStakeholderAttitude, OpportunityStakeholderInfluenceLevel,
        OpportunityStakeholderRole, WinProbabilityLevel,
    },
};

pub type ValidationError = ApiError;

fn text(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    trim: bool,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ApiError> {
    let value = schema_text(object, key, required, trim, min, max, errors)?;
    if let Some(value) = value.as_ref()
        && let Some(issue) = storable_text_error(value, vec![json!(key)])
    {
        errors.push(issue);
    }
    Ok(value)
}

fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ApiError> {
    let value = schema_nullable_text(object, key, min, max, errors)?;
    if let Field::Value(value) = &value
        && let Some(issue) = storable_text_error(value, vec![json!(key)])
    {
        errors.push(issue);
    }
    Ok(value)
}

fn choice<T: Copy + AsRef<str>>(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    allowed: &[T],
    errors: &mut Vec<Value>,
) -> Option<String> {
    let values = allowed.iter().map(AsRef::as_ref).collect::<Vec<_>>();
    enumeration(object, key, required, &values, errors)
}

fn optional_id(value: Field<String>) -> Option<String> {
    match value {
        Field::Value(value) => Some(value),
        _ => None,
    }
}

fn anchors(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Query {
    Query {
        lead_id: optional_id(uuid(object, "leadId", false, false, errors)),
        project_id: optional_id(uuid(object, "projectId", false, false, errors)),
    }
}

fn anchor_refinement(object: &JsObject<'_>, errors: &mut Vec<Value>) {
    // Zod refinements run after non-aborting format/length issues, and skip
    // aborted types/enums. Unknown object keys have already stripped.
    let aborted = errors.iter().any(|error| {
        matches!(
            error.get("code").and_then(Value::as_str),
            Some("invalid_type" | "invalid_value")
        )
    });
    if !aborted && object.get("leadId").is_none() && object.get("projectId").is_none() {
        errors.push(json!({"code":"custom","path":[],"message":"At least one opportunity anchor is required"}));
    }
}

fn update_refinement(object: &JsObject<'_>, keys: &[&str], errors: &mut Vec<Value>) {
    if errors.is_empty() && keys.iter().all(|key| object.get(key).is_none()) {
        errors.push(json!({"code":"custom","path":[],"message":"At least one field is required for update"}));
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

fn focus_areas(
    object: &JsObject<'_>,
    errors: &mut Vec<Value>,
) -> Result<Option<Vec<JsString>>, ApiError> {
    let Some(raw) = object.get("focusAreas") else {
        return Ok(None);
    };
    if json_type(Some(raw)) != "array" {
        errors.push(invalid_type(
            "array",
            json_type(Some(raw)),
            vec![json!("focusAreas")],
        ));
        return Ok(None);
    }
    let items: Vec<&RawValue> =
        serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())?;
    let mut values = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        // Reuse the existing exact Zod string checks (including invalid-type
        // length issues) and replace only the nested source issue path.
        let raw_item = format!("{{\"item\":{}}}", item.get());
        let item_object = JsObject::parse(&raw_item).map_err(|_| ApiError::internal())?;
        let mut item_errors = Vec::new();
        if let Some(value) = text(&item_object, "item", true, true, 1, 64, &mut item_errors)? {
            values.push(value);
        }
        for mut error in item_errors {
            error["path"] = json!(["focusAreas", index]);
            errors.push(error);
        }
    }
    if items.len() > 12 {
        errors.push(json!({"origin":"array","code":"too_big","maximum":12,"inclusive":true,"path":["focusAreas"],"message":"Too big: expected array to have <=12 items"}));
    }
    Ok(Some(values))
}

pub fn validate_query(raw: Option<&str>) -> Result<Query, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let input = anchors(&object, &mut errors);
    anchor_refinement(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(input)
}

pub fn validate_create_stakeholder(
    raw: Option<&str>,
) -> Result<CreateStakeholder, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let query = anchors(&object, &mut errors);
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    let contact_id = uuid(&object, "contactId", true, false, &mut errors);
    let role = choice(
        &object,
        "role",
        true,
        OpportunityStakeholderRole::ALL,
        &mut errors,
    );
    let attitude = choice(
        &object,
        "attitude",
        false,
        OpportunityStakeholderAttitude::ALL,
        &mut errors,
    );
    let influence_level = choice(
        &object,
        "influenceLevel",
        false,
        OpportunityStakeholderInfluenceLevel::ALL,
        &mut errors,
    );
    let access_level = choice(
        &object,
        "accessLevel",
        false,
        OpportunityStakeholderAccessLevel::ALL,
        &mut errors,
    );
    let focus_areas = focus_areas(&object, &mut errors)?;
    let communication_notes = nullable_text(&object, "communicationNotes", 1, 2000, &mut errors)?;
    let is_primary = boolean(&object, "isPrimary", &mut errors);
    anchor_refinement(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (customer_id, contact_id, role) {
        (Field::Value(customer_id), Field::Value(contact_id), Some(role)) => {
            Ok(CreateStakeholder {
                customer_id,
                lead_id: query.lead_id,
                project_id: query.project_id,
                contact_id,
                role,
                attitude,
                influence_level,
                access_level,
                focus_areas,
                communication_notes,
                is_primary,
            })
        }
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update_stakeholder(
    raw: Option<&str>,
) -> Result<UpdateStakeholder, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let role = choice(
        &object,
        "role",
        false,
        OpportunityStakeholderRole::ALL,
        &mut errors,
    );
    let attitude = choice(
        &object,
        "attitude",
        false,
        OpportunityStakeholderAttitude::ALL,
        &mut errors,
    );
    let influence_level = choice(
        &object,
        "influenceLevel",
        false,
        OpportunityStakeholderInfluenceLevel::ALL,
        &mut errors,
    );
    let access_level = choice(
        &object,
        "accessLevel",
        false,
        OpportunityStakeholderAccessLevel::ALL,
        &mut errors,
    );
    let focus_areas = focus_areas(&object, &mut errors)?;
    let communication_notes = nullable_text(&object, "communicationNotes", 1, 2000, &mut errors)?;
    let is_primary = boolean(&object, "isPrimary", &mut errors);
    update_refinement(&object, &super::store::STAKEHOLDER_FIELDS, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateStakeholder {
        role,
        attitude,
        influence_level,
        access_level,
        focus_areas,
        communication_notes,
        is_primary,
    })
}

pub fn validate_create_competitor(raw: Option<&str>) -> Result<CreateCompetitor, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let query = anchors(&object, &mut errors);
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    let competitor_name = text(&object, "competitorName", true, true, 1, 255, &mut errors)?;
    let position = choice(
        &object,
        "position",
        false,
        CompetitorPosition::ALL,
        &mut errors,
    );
    let customer_preference = choice(
        &object,
        "customerPreference",
        false,
        CustomerPreference::ALL,
        &mut errors,
    );
    let competitor_strengths = nullable_text(&object, "competitorStrengths", 1, 2000, &mut errors)?;
    let competitor_weaknesses =
        nullable_text(&object, "competitorWeaknesses", 1, 2000, &mut errors)?;
    let our_advantages = nullable_text(&object, "ourAdvantages", 1, 2000, &mut errors)?;
    let our_risks = nullable_text(&object, "ourRisks", 1, 2000, &mut errors)?;
    let win_probability = choice(
        &object,
        "winProbability",
        false,
        WinProbabilityLevel::ALL,
        &mut errors,
    );
    let evidence = nullable_text(&object, "evidence", 1, 2000, &mut errors)?;
    anchor_refinement(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (customer_id, competitor_name) {
        (Field::Value(customer_id), Some(competitor_name)) => Ok(CreateCompetitor {
            customer_id,
            lead_id: query.lead_id,
            project_id: query.project_id,
            competitor_name,
            position,
            customer_preference,
            competitor_strengths,
            competitor_weaknesses,
            our_advantages,
            our_risks,
            win_probability,
            evidence,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update_competitor(raw: Option<&str>) -> Result<UpdateCompetitor, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let competitor_name = text(&object, "competitorName", false, true, 1, 255, &mut errors)?;
    let position = choice(
        &object,
        "position",
        false,
        CompetitorPosition::ALL,
        &mut errors,
    );
    let customer_preference = choice(
        &object,
        "customerPreference",
        false,
        CustomerPreference::ALL,
        &mut errors,
    );
    let competitor_strengths = nullable_text(&object, "competitorStrengths", 1, 2000, &mut errors)?;
    let competitor_weaknesses =
        nullable_text(&object, "competitorWeaknesses", 1, 2000, &mut errors)?;
    let our_advantages = nullable_text(&object, "ourAdvantages", 1, 2000, &mut errors)?;
    let our_risks = nullable_text(&object, "ourRisks", 1, 2000, &mut errors)?;
    let win_probability = choice(
        &object,
        "winProbability",
        false,
        WinProbabilityLevel::ALL,
        &mut errors,
    );
    let evidence = nullable_text(&object, "evidence", 1, 2000, &mut errors)?;
    update_refinement(&object, &super::store::COMPETITOR_FIELDS, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateCompetitor {
        competitor_name,
        position,
        customer_preference,
        competitor_strengths,
        competitor_weaknesses,
        our_advantages,
        our_risks,
        win_probability,
        evidence,
    })
}

pub fn validate_create_discovery(raw: Option<&str>) -> Result<CreateDiscovery, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let query = anchors(&object, &mut errors);
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    let procurement_process = nullable_text(&object, "procurementProcess", 1, 2000, &mut errors)?;
    let budget_source = nullable_text(&object, "budgetSource", 1, 1000, &mut errors)?;
    let customer_pain_points = nullable_text(&object, "customerPainPoints", 1, 2000, &mut errors)?;
    let decision_cycle = nullable_text(&object, "decisionCycle", 1, 1000, &mut errors)?;
    let next_contact_plan = nullable_text(&object, "nextContactPlan", 1, 1000, &mut errors)?;
    let remark = nullable_text(&object, "remark", 1, 2000, &mut errors)?;
    anchor_refinement(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match customer_id {
        Field::Value(customer_id) => Ok(CreateDiscovery {
            customer_id,
            lead_id: query.lead_id,
            project_id: query.project_id,
            procurement_process,
            budget_source,
            customer_pain_points,
            decision_cycle,
            next_contact_plan,
            remark,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update_discovery(raw: Option<&str>) -> Result<UpdateDiscovery, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let procurement_process = nullable_text(&object, "procurementProcess", 1, 2000, &mut errors)?;
    let budget_source = nullable_text(&object, "budgetSource", 1, 1000, &mut errors)?;
    let customer_pain_points = nullable_text(&object, "customerPainPoints", 1, 2000, &mut errors)?;
    let decision_cycle = nullable_text(&object, "decisionCycle", 1, 1000, &mut errors)?;
    let next_contact_plan = nullable_text(&object, "nextContactPlan", 1, 1000, &mut errors)?;
    let remark = nullable_text(&object, "remark", 1, 2000, &mut errors)?;
    update_refinement(&object, &super::store::DISCOVERY_FIELDS, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateDiscovery {
        procurement_process,
        budget_source,
        customer_pain_points,
        decision_cycle,
        next_contact_plan,
        remark,
    })
}

pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "123e4567-e89b-42d3-a456-426614174000";

    #[test]
    fn required_anchors_and_unknown_only_updates_use_the_source_refinement() {
        assert!(validate_query(Some("{}")).is_err());
        assert!(
            validate_create_stakeholder(Some(&format!(
                "{{\"customerId\":\"{ID}\",\"contactId\":\"{ID}\",\"role\":\"unknown\"}}"
            )))
            .is_err()
        );
        assert!(
            validate_create_competitor(Some(&format!(
                "{{\"customerId\":\"{ID}\",\"competitorName\":\"x\"}}"
            )))
            .is_err()
        );
        assert!(validate_create_discovery(Some(&format!("{{\"customerId\":\"{ID}\"}}"))).is_err());
        for raw in [
            "{}",
            "{\"rowVersion\":1,\"expectedVersion\":1}",
            "{\"customerId\":null}",
        ] {
            assert!(validate_update_stakeholder(Some(raw)).is_err());
            assert!(validate_update_competitor(Some(raw)).is_err());
            assert!(validate_update_discovery(Some(raw)).is_err());
        }
    }

    #[test]
    fn null_false_and_empty_arrays_keep_their_distinct_patch_presence() {
        let input = validate_update_stakeholder(Some(
            "{\"communicationNotes\":null,\"isPrimary\":false,\"focusAreas\":[]}",
        ))
        .unwrap_or_else(|_| panic!("original valid PATCH"));
        assert!(input.communication_notes.is_null());
        assert_eq!(input.is_primary, Some(false));
        assert_eq!(input.focus_areas, Some(vec![]));
        assert!(validate_update_stakeholder(Some("{\"focusAreas\":null}")).is_err());
        assert!(validate_update_stakeholder(Some("{\"role\":null}")).is_err());
        assert!(validate_update_stakeholder(Some("{\"isPrimary\":\"false\"}")).is_err());
    }

    #[test]
    fn all_identified_persisted_texts_reject_nul_and_unpaired_surrogates() {
        for bad in [r#""\u0000""#, r#""\ud800""#, r#""\udc00""#] {
            let create = format!(
                "{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"contactId\":\"{ID}\",\"role\":\"unknown\",\"communicationNotes\":{bad}}}"
            );
            assert!(validate_create_stakeholder(Some(&create)).is_err());
            assert!(
                validate_update_stakeholder(Some(&format!("{{\"communicationNotes\":{bad}}}")))
                    .is_err()
            );

            let patch = format!("{{\"focusAreas\":[{bad}]}}");
            let object = JsObject::parse(&patch)
                .unwrap_or_else(|_| panic!("known invalid storage-text JSON"));
            let mut issues = Vec::new();
            let _ = focus_areas(&object, &mut issues)
                .unwrap_or_else(|_| panic!("invalid text yields ordinary validation issues"));
            assert!(issues.iter().any(
                |issue| issue["code"] == "custom" && issue["path"] == json!(["focusAreas", 0])
            ));
            assert!(validate_update_stakeholder(Some(&patch)).is_err());
            let create = format!(
                "{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"contactId\":\"{ID}\",\"role\":\"unknown\",\"focusAreas\":[{bad}]}}"
            );
            assert!(validate_create_stakeholder(Some(&create)).is_err());

            for key in [
                "competitorName",
                "competitorStrengths",
                "competitorWeaknesses",
                "ourAdvantages",
                "ourRisks",
                "evidence",
            ] {
                let name = if key == "competitorName" {
                    bad
                } else {
                    "\"valid competitor\""
                };
                let extra = if key == "competitorName" {
                    String::new()
                } else {
                    format!(",\"{key}\":{bad}")
                };
                let create = format!(
                    "{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"competitorName\":{name}{extra}}}"
                );
                assert!(validate_create_competitor(Some(&create)).is_err());
                assert!(validate_update_competitor(Some(&format!("{{\"{key}\":{bad}}}"))).is_err());
            }
            for key in [
                "procurementProcess",
                "budgetSource",
                "customerPainPoints",
                "decisionCycle",
                "nextContactPlan",
                "remark",
            ] {
                let create =
                    format!("{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"{key}\":{bad}}}");
                assert!(validate_create_discovery(Some(&create)).is_err());
                assert!(validate_update_discovery(Some(&format!("{{\"{key}\":{bad}}}"))).is_err());
            }
        }
    }

    #[test]
    fn valid_unicode_and_stripped_unknown_fields_are_not_rejected() {
        for unknown in [r#""\u0000""#, r#""\ud800""#] {
            let stakeholder = format!(
                "{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"contactId\":\"{ID}\",\"role\":\"unknown\",\"communicationNotes\":\"\\ud83d\\ude42\",\"focusAreas\":[\"\\ud83d\\ude42\"],\"unknown\":{unknown}}}"
            );
            assert!(validate_create_stakeholder(Some(&stakeholder)).is_ok());
            assert!(
                validate_update_stakeholder(Some(&format!(
                    "{{\"communicationNotes\":\"\\ud83d\\ude42\",\"unknown\":{unknown}}}"
                )))
                .is_ok()
            );
            let competitor = format!(
                "{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"competitorName\":\"\\ud83d\\ude42\",\"unknown\":{unknown}}}"
            );
            assert!(validate_create_competitor(Some(&competitor)).is_ok());
            assert!(
                validate_update_competitor(Some(&format!(
                    "{{\"competitorName\":\"\\ud83d\\ude42\",\"unknown\":{unknown}}}"
                )))
                .is_ok()
            );
            let discovery = format!(
                "{{\"customerId\":\"{ID}\",\"leadId\":\"{ID}\",\"remark\":\"\\ud83d\\ude42\",\"unknown\":{unknown}}}"
            );
            assert!(validate_create_discovery(Some(&discovery)).is_ok());
            assert!(
                validate_update_discovery(Some(&format!(
                    "{{\"remark\":\"\\ud83d\\ude42\",\"unknown\":{unknown}}}"
                )))
                .is_ok()
            );
        }
    }

    #[test]
    fn focus_write_caps_and_element_codepoint_limits_remain_in_force() {
        let twelve = json!({"focusAreas": vec!["🙂".repeat(64); 12]}).to_string();
        assert!(validate_update_stakeholder(Some(&twelve)).is_ok());
        let thirteen = json!({"focusAreas": vec!["tag"; 13]}).to_string();
        assert!(validate_update_stakeholder(Some(&thirteen)).is_err());
        let long_item = json!({"focusAreas": ["🙂".repeat(65)]}).to_string();
        assert!(validate_update_stakeholder(Some(&long_item)).is_err());
        for raw in [
            "{\"focusAreas\":{\"length\":13}}",
            "{\"focusAreas\":\"not an array\"}",
            "{\"focusAreas\":[1]}",
        ] {
            assert!(validate_update_stakeholder(Some(raw)).is_err());
        }
    }

    #[test]
    fn codepoint_limits_trim_and_original_uuid_spelling_survive_validation() {
        let accepted = format!("{{\"communicationNotes\":{}}}", json!("🙂".repeat(2000)));
        assert!(validate_update_stakeholder(Some(&accepted)).is_ok());
        let rejected = format!("{{\"communicationNotes\":{}}}", json!("🙂".repeat(2001)));
        assert!(validate_update_stakeholder(Some(&rejected)).is_err());
        let upper = ID.to_uppercase();
        let query = validate_query(Some(&format!("{{\"leadId\":\"{upper}\"}}")))
            .unwrap_or_else(|_| panic!("original valid upper UUID"));
        assert_eq!(query.lead_id, Some(upper));
        let input = validate_update_discovery(Some("{\"remark\":\"\\ufeff retained \\ufeff\"}"))
            .unwrap_or_else(|_| panic!("original valid trimmed text"));
        assert!(matches!(input.remark, Field::Value(value) if value.eq_ascii("retained")));
        let input = validate_update_discovery(Some("{\"remark\":\"\\u0085\"}"))
            .unwrap_or_else(|_| panic!("NEL is not ECMAScript trim whitespace"));
        assert!(matches!(input.remark, Field::Value(value) if value.as_code_units() == [0x85]));
    }
}
