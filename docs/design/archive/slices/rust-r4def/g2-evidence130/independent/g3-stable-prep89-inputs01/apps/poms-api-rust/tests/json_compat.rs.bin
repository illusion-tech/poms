//! Generic presence/key-policy checks against source-Zod observations only.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use poms_api_rust::compat::json::{
    Field, JsonCompatError, UnknownKeyPolicy, apply_unknown_keys, object_field, required,
    required_nullable, validate_presence, with_default, write_field,
};
use serde_json::{Map, Value, json};

fn golden() -> Value {
    serde_json::from_str(include_str!(
        "../../../tools/rust-r1b/json-compat-golden.json"
    ))
    .unwrap()
}

fn field(value: &Value) -> Field<Value> {
    match value["presence"].as_str().unwrap() {
        "missing" => Field::Missing,
        "null" => Field::Null,
        "value" => Field::Value(value["value"].clone()),
        _ => panic!("unknown source fixture presence"),
    }
}

fn encoded(value: Field<Value>) -> Value {
    match value {
        Field::Missing => json!({"presence":"missing"}),
        Field::Null => json!({"presence":"null"}),
        Field::Value(value) => json!({"presence":"value","value":value}),
    }
}

#[test]
fn presence_roundtrip_keeps_missing_null_and_falsey_values_distinct() {
    let source = json!({"null":null,"false":false,"zero":0,"empty":"","array":[],"object":{}});
    let source = source.as_object().unwrap();
    assert_eq!(object_field(source, "absent"), Field::Missing);
    assert_eq!(object_field(source, "null"), Field::Null);
    for name in ["false", "zero", "empty", "array", "object"] {
        assert!(matches!(object_field(source, name), Field::Value(_)));
    }
    let mut output = Map::new();
    output.insert("absent".to_owned(), json!("previous-output"));
    for name in [
        "absent", "null", "false", "zero", "empty", "array", "object",
    ] {
        write_field(
            &mut output,
            name,
            object_field(source, name).map(Clone::clone),
        );
    }
    assert!(!output.contains_key("absent"));
    assert_eq!(Value::Object(output), Value::Object(source.clone()));
    let raw = Field::Value(String::from("kept"));
    assert_eq!(raw.as_ref(), Field::Value(&String::from("kept")));
}

#[test]
fn required_nullable_is_not_optional_and_defaults_do_not_consume_null() {
    assert_eq!(
        required_nullable::<Value>(Field::Missing),
        Err(JsonCompatError::MissingRequired)
    );
    assert_eq!(required_nullable::<Value>(Field::Null), Ok(None));
    assert_eq!(
        required::<Value>(Field::Null),
        Err(JsonCompatError::NullNotAllowed)
    );
    assert_eq!(
        with_default(Field::Missing, || json!([])),
        Field::Value(json!([]))
    );
    assert_eq!(
        with_default(Field::<Value>::Null, || panic!(
            "null must not select a default"
        )),
        Field::Null
    );
    assert_eq!(
        with_default(Field::Value(json!(0)), || panic!(
            "present value must not select a default"
        )),
        Field::Value(json!(0))
    );
}

#[test]
fn source_schema_field_instances_match_generic_presence_rules() {
    let golden = golden();
    let cases = golden["fieldResults"].as_array().unwrap();
    assert!(!cases.is_empty());
    for case in cases {
        let descriptor = golden["descriptors"]
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["key"] == case["descriptor"])
            .unwrap();
        let metadata = descriptor["fields"]
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["name"] == case["input"]["field"])
            .unwrap();
        let mut input = field(&case["input"]["input"]);
        if metadata["missing"]["success"] == true
            && metadata["missing"]["output"]["presence"] == "value"
        {
            input = with_default(input, || metadata["missing"]["output"]["value"].clone());
        }
        let actual = validate_presence(
            input,
            metadata["required"].as_bool().unwrap(),
            metadata["nullable"].as_bool().unwrap(),
        );
        assert_eq!(
            actual.is_ok(),
            case["result"]["success"].as_bool().unwrap(),
            "{}",
            case["id"]
        );
        if let Ok(actual) = actual {
            assert_eq!(encoded(actual), case["result"]["output"], "{}", case["id"]);
        }
    }
}

#[test]
fn source_object_scopes_match_strip_reject_and_preserve() {
    let golden = golden();
    let cases = golden["objectResults"].as_array().unwrap();
    assert!(!cases.is_empty());
    for case in cases {
        let descriptor = golden["descriptors"]
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["key"] == case["descriptor"])
            .unwrap();
        let keys = descriptor["fields"]
            .as_array()
            .unwrap()
            .iter()
            .map(|entry| entry["name"].as_str().unwrap())
            .collect::<Vec<_>>();
        let policy = match descriptor["unknownKeys"].as_str().unwrap() {
            "strip" => UnknownKeyPolicy::Strip,
            "reject" => UnknownKeyPolicy::Reject,
            "preserve" => UnknownKeyPolicy::Preserve,
            _ => panic!("unknown source object policy"),
        };
        let actual = apply_unknown_keys(&case["input"]["input"], &keys, policy);
        assert_eq!(
            actual.is_ok(),
            case["result"]["success"].as_bool().unwrap(),
            "{}",
            case["id"]
        );
        if let Ok(actual) = actual {
            assert_eq!(actual, case["result"]["output"]["value"], "{}", case["id"]);
        }
    }
}

#[test]
fn object_policy_does_not_guess_nested_schema_rules_or_mutate_input() {
    let original = json!({"known":{"extra":1},"extra":2});
    let stripped = apply_unknown_keys(&original, &["known"], UnknownKeyPolicy::Strip).unwrap();
    assert_eq!(stripped, json!({"known":{"extra":1}}));
    assert_eq!(original, json!({"known":{"extra":1},"extra":2}));
    assert_eq!(
        apply_unknown_keys(&original, &["known"], UnknownKeyPolicy::Reject),
        Err(JsonCompatError::UnknownKeys)
    );
    assert_eq!(
        apply_unknown_keys(&original, &[], UnknownKeyPolicy::Preserve).unwrap(),
        original
    );
    assert_eq!(
        apply_unknown_keys(&json!([]), &[], UnknownKeyPolicy::Preserve),
        Err(JsonCompatError::ExpectedObject)
    );
}
