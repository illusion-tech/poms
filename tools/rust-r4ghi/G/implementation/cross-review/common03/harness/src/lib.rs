//! Non-author pure review of actual Root sources. The Error adapter and Value
//! context carrier are test-only. No request DTO/loader/DB/HTTP certification.
#![allow(dead_code)]
mod contract_support {
    use serde_json::Value;
    use sha2::{Digest, Sha256};
    #[derive(Debug)]
    pub enum Error {
        BadRequest(String), Conflict(String), Internal,
        CodedUnprocessable { code: &'static str, message: String },
    }
    include!(concat!(env!("OUT_DIR"), "/actual_canonical.rs"));
}
include!(concat!(env!("OUT_DIR"), "/actual_sources.rs"));

#[cfg(test)]
mod acceptance {
    use super::project_operating_common::{hash, schema};
    use serde_json::{Value, json};

    fn execution(version: &str) -> String {
        format!(r#"{{"inputVersion":"server-derived-v1","expectedProjectVersion":{version},"expectedRoleAssignmentVersion":1,"handoverStageRecordId":"00000000-0000-0000-0000-000000000000","sourceHandoverId":"00000000-0000-0000-0000-000000000000","handoverSummarySnapshotId":"00000000-0000-0000-0000-000000000000","commissionRoleAssignmentId":"00000000-0000-0000-0000-000000000000","sourcePayloadHash":"{}","reason":" actual admission "}}"#, "a".repeat(64))
    }

    #[test]
    fn complete_request_accepts_exact_int4_tokens_and_rejects_rounding() {
        for version in ["1", "1e0", "2147483647.0000"] {
            assert!(schema::normalize_public_request("StartProjectExecutionRequest", &execution(version)).is_ok(), "{version}");
        }
        for version in ["0", "2147483648", "1.00000000000000001", "2147483647.00000000000001", "1e1000"] {
            assert!(schema::normalize_public_request("StartProjectExecutionRequest", &execution(version)).is_err(), "{version}");
        }
    }

    #[test]
    fn exact_weight_conditions_require_zero_reason_and_cannot_round() {
        let request = |weight: &str, reason: &str| format!(r#"{{"inputVersion":"server-derived-v1","expectedCurrentAssignmentId":null,"expectedCurrentRowVersion":null,"participants":[{{"userId":"00000000-0000-0000-0000-000000000000","roleType":" execution-owner ","responsibilitySummary":" actual duties ","weight":{weight}{reason}}}]}}"#);
        assert!(schema::normalize_public_request("CreateCommissionRoleAssignmentRequest", &request("1e-6", "")).is_ok());
        assert!(schema::normalize_public_request("CreateCommissionRoleAssignmentRequest", &request("0", ",\"zeroWeightReason\":\"actual zero allocation\"")).is_ok());
        for (weight, reason) in [("0", ""), ("0", ",\"zeroWeightReason\":\"   \""), ("0.1", ",\"zeroWeightReason\":\"should not be allowed\""), ("0.10000000000000001", ""), ("1e-7", "")] {
            assert!(schema::normalize_public_request("CreateCommissionRoleAssignmentRequest", &request(weight, reason)).is_err(), "{weight} {reason}");
        }
    }

    #[test]
    fn conditional_acceptance_summary_is_required_and_forbidden_elsewhere() {
        let input = json!({"inputVersion":"server-derived-v1","acceptanceType":"final-acceptance","acceptanceResult":"conditional","scopeSummary":"scope","evidenceSummary":"evidence","expectedProjectVersion":1,"acceptanceStageRecordId":"00000000-0000-0000-0000-000000000000","evidenceRefs":[{"attachmentLinkId":"00000000-0000-0000-0000-000000000000"}]});
        let check = |value: &Value| schema::normalize_public_request("CreateAcceptanceRecordRequest", &value.to_string());
        assert!(check(&input).is_err());
        let mut complete = input.clone(); complete["conditionalSummary"] = json!("actual condition");
        assert!(check(&complete).is_ok());
        complete["acceptanceResult"] = json!("accepted");
        assert!(check(&complete).is_err());
        complete.as_object_mut().unwrap().remove("conditionalSummary");
        assert!(check(&complete).is_ok());
    }

    #[test]
    fn actual_request_does_not_admit_a_client_actor_or_status() {
        let valid: Value = serde_json::from_str(&execution("1")).unwrap();
        for field in ["actorId", "producerVersion", "currentStage", "status"] {
            let mut changed = valid.clone(); changed[field] = json!("client supplied");
            assert!(schema::normalize_public_request("StartProjectExecutionRequest", &changed.to_string()).is_err());
        }
    }

    #[test]
    fn frozen_utc_datetime_pattern_rejects_space_lowercase_t_and_leap_seconds() {
        let input = json!({"inputVersion":"server-derived-v1","acceptanceRecordId":"00000000-0000-0000-0000-000000000000","completionResult":"completed","completedAt":"2026-11-06T12:00:00Z","completionSummary":"actual completion","evidenceSummary":"actual evidence","expectedProjectVersion":1,"expectedAcceptanceVersion":1,"evidenceRefs":[{"attachmentLinkId":"00000000-0000-0000-0000-000000000000"}]});
        assert!(schema::normalize_public_request("CreateProjectCompletionRecordRequest", &input.to_string()).is_ok());
        for timestamp in ["2026-11-06 12:00:00Z", "2026-11-06t12:00:00Z", "2026-11-06T12:00:60Z", "1900-02-29T12:00:00Z", "2026-11-06T12:00:00+00:00"] {
            let mut changed = input.clone(); changed["completedAt"] = json!(timestamp);
            assert!(schema::normalize_public_request("CreateProjectCompletionRecordRequest", &changed.to_string()).is_err(), "accepted outside frozen UTC regex: {timestamp}");
        }
    }

    fn serialized_context() -> Value {
        let mut value = json!({});
        for field in schema::context_registry()["x-sourceHashFactualWhitelist"]["top"].as_array().unwrap() {
            value[field.as_str().unwrap()] = Value::Null;
        }
        value["snapshot"] = json!({});
        for field in schema::context_registry()["x-sourceHashFactualWhitelist"]["snapshot"].as_array().unwrap() {
            value["snapshot"][field.as_str().unwrap()] = Value::Null;
        }
        value
    }

    #[test]
    fn source_hash_excludes_generated_results_but_binds_business_scope() {
        let original = serialized_context();
        let expected = hash::source_hash(&original).unwrap();
        let mut generated = original.clone();
        generated["contextId"] = json!("new context"); generated["sourceHash"] = json!("new output");
        generated["snapshot"]["id"] = json!("new snapshot"); generated["snapshot"]["rowVersion"] = json!(999);
        generated["snapshot"]["restatementRef"] = json!("new command result"); generated["snapshot"]["restatedSnapshotRef"] = json!("new paired result");
        generated["metrics"] = json!({"output":"new derivation"});
        assert_eq!(hash::source_hash(&generated).unwrap(), expected);
        generated["snapshot"]["sourceWindowEnd"] = json!("2026-10-31");
        assert_ne!(hash::source_hash(&generated).unwrap(), expected);
    }

    #[test]
    fn source_set_permutation_is_stable_but_approved_history_order_matters() {
        let a = json!({"kind":"Cost","id":"a","rowVersion":2,"payloadHash":"a"});
        let b = json!({"kind":"Cost","id":"a","rowVersion":10,"payloadHash":"b"});
        let mut original = serialized_context(); original["unclassifiedSourceRefs"] = json!([a.clone(), b.clone()]);
        let expected = hash::source_hash(&original).unwrap();
        let mut permutation = original.clone(); permutation["unclassifiedSourceRefs"] = json!([b.clone(), a.clone()]);
        assert_eq!(hash::source_hash(&permutation).unwrap(), expected);
        original["baseline"] = json!({"approvedChangeRefs":[a.clone(), b.clone()]});
        permutation["baseline"] = json!({"approvedChangeRefs":[b,a]});
        assert_ne!(hash::source_hash(&original).unwrap(), hash::source_hash(&permutation).unwrap());
    }
}
