//! The original guard decides the expected result; no session/HTTP/DB runs.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use poms_api_rust::{
    compat::permissions::{PermissionRequirements, RawPermission, decide},
    shared::generated::PermissionKey,
};
use serde_json::Value;

fn golden() -> Value {
    serde_json::from_str(include_str!(
        "../../../tools/rust-r1b/json-compat-golden.json"
    ))
    .unwrap()
}

fn requirements(value: &Value) -> Vec<PermissionKey> {
    value
        .as_array()
        .unwrap()
        .iter()
        .map(|key| {
            key.as_str()
                .unwrap()
                .parse()
                .expect("original known permission requirement")
        })
        .collect()
}

#[test]
fn pure_decisions_match_the_original_guard_for_resolved_metadata() {
    let golden = golden();
    let cases = golden["permissionResults"].as_array().unwrap();
    assert!(!cases.is_empty());
    for case in cases {
        let input = &case["input"];
        let all = requirements(&input["all"]);
        let any = requirements(&input["any"]);
        let raw = input["userPermissions"]
            .as_array()
            .unwrap()
            .iter()
            .map(|key| RawPermission::new(key.as_str().unwrap()))
            .collect::<Vec<_>>();
        let actual = decide(
            PermissionRequirements {
                public_route: input["publicRoute"].as_bool().unwrap(),
                authenticated_route: input["authenticatedRoute"].as_bool().unwrap(),
                all: &all,
                any: &any,
            },
            &raw,
        );
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            case["result"]["decision"],
            "{}",
            case["id"]
        );
    }
}

#[test]
fn persisted_raw_permission_bridge_does_not_filter_unknown_values() {
    let golden = golden();
    for case in golden["rawPermissionResults"].as_array().unwrap() {
        let source = &case["permissions"];
        let raw: Vec<RawPermission> = serde_json::from_value(source.clone()).unwrap();
        assert_eq!(serde_json::to_value(&raw).unwrap(), *source);
        assert!(
            raw.iter().any(|value| value.try_known().is_err()),
            "fixture must retain an unknown persisted value"
        );
        assert!(raw.iter().any(|value| value.try_known().is_ok()));
        for value in raw {
            if let Ok(known) = value.try_known() {
                assert_eq!(known.as_str(), value.as_str());
            }
        }
    }
}

#[test]
fn raw_bridge_preserves_case_empty_strings_and_duplicates() {
    let source: Value = serde_json::json!([
        "project:read",
        "PROJECT:READ",
        "",
        "legacy:unknown",
        "legacy:unknown"
    ]);
    let raw: Vec<RawPermission> = serde_json::from_value(source.clone()).unwrap();
    assert_eq!(serde_json::to_value(&raw).unwrap(), source);
    assert!(raw[0].try_known().is_ok());
    assert!(raw[1].try_known().is_err());
    assert!(raw[2].try_known().is_err());
}
