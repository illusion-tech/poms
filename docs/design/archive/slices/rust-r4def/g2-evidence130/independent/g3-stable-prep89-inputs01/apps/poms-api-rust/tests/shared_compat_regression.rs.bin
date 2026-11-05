//! Frozen R0F schema cases spanning generic JSON presence and generated enums.
use std::error::Error;

use poms_api_rust::{
    compat::json::{Field, required_nullable},
    shared::generated::UserOrgUnitMembershipType,
};
use serde_json::Value;

fn frozen() -> Result<Value, serde_json::Error> {
    serde_json::from_str(include_str!(
        "../../../tools/rust-r0f/data-compat/golden.json"
    ))
}

#[test]
fn frozen_nullable_org_field_is_required_even_when_null_is_valid() -> Result<(), Box<dyn Error>> {
    let golden = frozen()?;
    let cases = golden["schemaResults"].as_array().ok_or("schema cases")?;
    let mut compared = 0;
    for case in cases.iter().filter(|case| {
        case["input"]["schema"] == "PlatformUserSummarySchema"
            && case["input"]["field"] == "primaryOrgUnitId"
    }) {
        let input = &case["input"]["value"];
        let presence: Field<Value> = if input.is_null() {
            Field::Null
        } else if input["$type"] == "undefined" {
            Field::Missing
        } else {
            return Err("new scalar-bearing fixture requires explicit UUID adapter review".into());
        };
        let actual = required_nullable(presence);
        assert_eq!(
            actual.is_ok(),
            case["result"]["success"].as_bool().ok_or("success flag")?,
            "{}",
            case["id"]
        );
        if let Ok(value) = actual {
            assert_eq!(serde_json::to_value(value)?, case["result"]["data"]);
        }
        compared += 1;
    }
    assert_eq!(compared, 2);
    Ok(())
}

#[test]
fn frozen_membership_schema_uses_generated_case_sensitive_wire_values() -> Result<(), Box<dyn Error>>
{
    let golden = frozen()?;
    let cases = golden["schemaResults"].as_array().ok_or("schema cases")?;
    let mut compared = 0;
    for case in cases
        .iter()
        .filter(|case| case["input"]["schema"] == "UserOrgUnitMembershipTypeSchema")
    {
        let actual =
            serde_json::from_value::<UserOrgUnitMembershipType>(case["input"]["value"].clone());
        assert_eq!(
            actual.is_ok(),
            case["result"]["success"].as_bool().ok_or("success flag")?,
            "{}",
            case["id"]
        );
        if let Ok(value) = actual {
            assert_eq!(serde_json::to_value(value)?, case["result"]["data"]);
        }
        compared += 1;
    }
    assert_eq!(compared, 3);
    Ok(())
}
