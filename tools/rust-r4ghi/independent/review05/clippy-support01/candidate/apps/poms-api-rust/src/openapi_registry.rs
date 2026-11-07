//! Runtime fragments register implemented operations. Their historical schemas
//! never become a second current wire authority beside the full shared spec.
use serde_json::Value;
use std::sync::OnceLock;

fn assert_refs(value: &Value, canonical: &Value) {
    match value {
        Value::Object(fields) => {
            if let Some(reference) = fields.get("$ref") {
                let Some(reference) = reference.as_str() else {
                    panic!("OpenAPI $ref must be a string");
                };
                let Some(pointer) = reference.strip_prefix('#').filter(|p| p.starts_with('/'))
                else {
                    panic!("external OpenAPI references are not registered");
                };
                assert!(
                    canonical.pointer(pointer).is_some(),
                    "unregistered OpenAPI reference {reference}"
                );
            }
            for child in fields.values() {
                assert_refs(child, canonical);
            }
        }
        Value::Array(values) => {
            for child in values {
                assert_refs(child, canonical);
            }
        }
        _ => {}
    }
}
fn canonical() -> &'static Value {
    static DOCUMENT: OnceLock<Value> = OnceLock::new();
    DOCUMENT.get_or_init(|| {
        let value: Value = match serde_json::from_str(include_str!(
            "../../../libs/shared/api-spec/openapi.json"
        )) {
            Ok(value) => value,
            Err(error) => panic!("invalid current full shared OpenAPI: {error:?}"),
        };
        assert_refs(&value, &value);
        value
    })
}
fn successes(operation: &Value) -> Vec<String> {
    operation["responses"]
        .as_object()
        .into_iter()
        .flatten()
        .filter(|(key, _)| {
            key.len() == 3 && key.starts_with('2') && key.bytes().all(|b| b.is_ascii_digit())
        })
        .map(|(key, _)| key.clone())
        .collect()
}
fn project(mut fragment: Value, source: &Value) -> Value {
    assert_eq!(
        fragment["openapi"], source["openapi"],
        "OpenAPI dialect drift"
    );
    for name in fragment["components"]["schemas"]
        .as_object()
        .into_iter()
        .flatten()
        .map(|(name, _)| name)
    {
        assert!(
            !source["components"]["schemas"][name].is_null(),
            "unregistered fragment schema {name}"
        );
    }
    assert_refs(&fragment, source);
    if let Some(schemas) = fragment["components"]["schemas"].as_object_mut() {
        for (name, schema) in schemas {
            *schema = source["components"]["schemas"][name].clone();
        }
    }
    for (path, item) in fragment["paths"].as_object_mut().into_iter().flatten() {
        for (method, operation) in item.as_object_mut().into_iter().flatten() {
            if ![
                "get", "post", "put", "patch", "delete", "options", "head", "trace",
            ]
            .contains(&method.as_str())
            {
                continue;
            }
            let current = &source["paths"][path][method];
            assert!(
                current.is_object(),
                "unregistered runtime operation {method} {path}"
            );
            assert_eq!(
                operation["operationId"], current["operationId"],
                "runtime operationId drift for {method} {path}"
            );
            assert_eq!(
                successes(operation),
                successes(current),
                "runtime documented success status drift for {method} {path}"
            );
            // Parameters, inline bodies, responses and security all consume the
            // same current operation. Only the fragment's registration survives.
            *operation = current.clone();
        }
    }
    fragment
}
pub(crate) fn fragment(value: Value) -> Value {
    project(value, canonical())
}

pub(crate) fn merge_components(document: &mut Value, subset: &Value) {
    for (kind, entries) in subset["components"].as_object().into_iter().flatten() {
        for (name, value) in entries.as_object().into_iter().flatten() {
            if document["components"][kind].is_null() {
                document["components"][kind] = serde_json::json!({});
            }
            let existing = &document["components"][kind][name];
            assert!(
                existing.is_null() || existing == value,
                "conflicting OpenAPI component {kind}/{name}"
            );
            document["components"][kind][name] = value.clone();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn source() -> Value {
        json!({"openapi":"3.0.0","paths":{"/api/example":{"get":{"operationId":"Example_read","responses":{"200":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/Example"}}}}}}}},"components":{"schemas":{"Example":{"type":"object","required":["version"],"properties":{"version":{"type":"integer"}}}}}})
    }
    #[test]
    fn only_registered_operations_consume_current_canonical_wire() {
        let source = source();
        let mut old = source.clone();
        old["components"]["schemas"]["Example"] = json!({"type":"string"});
        old["paths"]["/api/example"]["get"]["responses"]["200"]["content"]["application/json"]["schema"] =
            json!({"type":"string"});
        assert_eq!(project(old, &source), source);
    }
    #[test]
    fn unknown_schema_dangling_external_reference_and_operation_id_are_rejected() {
        let source = source();
        let mut unknown = source.clone();
        unknown["components"]["schemas"]["Foreign"] = json!({});
        assert!(std::panic::catch_unwind(|| project(unknown, &source)).is_err());
        for reference in [
            "#/components/schemas/Missing",
            "https://example.invalid/schema",
        ] {
            let mut bad = source.clone();
            bad["paths"]["/api/example"]["get"]["responses"]["200"]["content"]["application/json"]
                ["schema"]["$ref"] = json!(reference);
            assert!(std::panic::catch_unwind(|| project(bad, &source)).is_err());
        }
        let mut bad = source.clone();
        bad["paths"]["/api/example"]["get"]["operationId"] = json!("Wrong_read");
        assert!(std::panic::catch_unwind(|| project(bad, &source)).is_err());
        let mut status = source.clone();
        status["paths"]["/api/example"]["get"]["responses"]["201"] = json!({});
        assert!(std::panic::catch_unwind(|| project(status, &source)).is_err());
    }
    #[test]
    fn final_merge_still_rejects_component_conflicts() {
        let mut source = source();
        let mut bad = source.clone();
        bad["components"]["schemas"]["Example"] = json!({"type":"boolean"});
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| merge_components(
                &mut source,
                &bad
            )))
            .is_err()
        );
    }
}
