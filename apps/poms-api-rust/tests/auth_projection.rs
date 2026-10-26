use poms_api_rust::{
    auth::projection::{self, ProjectionInput},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};

#[test]
fn original_typescript_projection_and_recorded_audit_match()
-> Result<(), Box<dyn std::error::Error>> {
    let golden: Value = serde_json::from_str(include_str!(
        "../../../tools/rust-r1c/projection-golden.json"
    ))?;
    let observations = golden["observations"]
        .as_array()
        .ok_or("missing observations")?;
    assert_eq!(observations.len(), 19);
    for sample in observations {
        let input: ProjectionInput = serde_json::from_value(sample["input"].clone())?;
        let result = projection::plan(&input).map_err(|error| format!("{error:?}"))?;
        assert_eq!(
            serde_json::to_value(result.fields)?,
            sample["output"],
            "projection {}",
            sample["id"]
        );
        let events: Vec<Value> = result
            .event
            .map(|event| {
                json!({
                    "eventType": event.event_type, "severity": event.severity,
                    "actorId": event.actor_id, "principal": event.principal,
                    "requestId": event.request_id, "path": event.path, "method": event.method,
                    "permissionKey": event.permission_key, "result": event.result,
                    "ip": event.ip, "userAgent": event.user_agent, "details": event.details
                })
            })
            .into_iter()
            .collect();
        assert_eq!(
            serde_json::to_value(events)?,
            sample["events"],
            "audit {}",
            sample["id"]
        );
    }
    assert_eq!(golden["auditFailurePropagated"], true);
    Ok(())
}

#[test]
fn every_generated_sensitive_package_has_its_generated_permission() {
    for package in SensitiveFieldPackageKey::ALL {
        assert!(projection::required_permission(*package).is_ok());
    }
}
