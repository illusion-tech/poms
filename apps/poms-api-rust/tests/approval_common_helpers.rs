//! Finite differential checks against mechanically extracted original TS
//! helper outputs. No database or product-runtime evidence is claimed.

use poms_api_rust::{
    approval_common::{
        CommonFailure, ConfirmationParticipantInput, JsField, Text,
        js::reason_and_comment,
        projection::{adjustment_type_name, payout_stage_name},
        transition::{assert_expected_version, assert_participants, node_name},
    },
    auth::js_json::JsObject,
};
use serde::Deserialize;
use serde_json::value::RawValue;

#[derive(Deserialize)]
struct Golden {
    cases: Vec<Box<RawValue>>,
}

#[derive(Deserialize)]
struct OriginalError {
    status: u16,
    message: Text,
}

fn required<'a>(object: &'a JsObject<'a>, key: &str) -> &'a RawValue {
    object
        .get(key)
        .unwrap_or_else(|| panic!("missing golden field {key}"))
}

fn text(raw: &RawValue) -> Text {
    serde_json::from_str(raw.get()).unwrap_or_else(|_| panic!("golden text"))
}

fn error_equal(result: Result<(), CommonFailure>, expected: &RawValue) {
    let expected: Option<OriginalError> =
        serde_json::from_str(expected.get()).unwrap_or_else(|_| panic!("original error"));
    match (result, expected) {
        (Ok(()), None) => {}
        (Err(actual), Some(expected)) => {
            assert_eq!(actual.status, Some(expected.status));
            assert_eq!(actual.message, expected.message);
        }
        _ => panic!("original and Rust helper outcomes differ"),
    }
}

#[test]
fn original_ts_finite_helpers_match_without_database_mocks() {
    let golden: Golden = serde_json::from_str(include_str!(
        "../../../tools/rust-r2l1/l-helper-golden.json"
    ))
    .unwrap_or_else(|_| panic!("original helper golden"));
    assert_eq!(golden.cases.len(), 36);
    for case in &golden.cases {
        let case = JsObject::parse(case.get()).unwrap_or_else(|_| panic!("golden case"));
        let helper = text(required(&case, "helper"));
        let expected = required(&case, "expected");
        if helper.eq_ascii("expectedVersion") {
            let kind = text(required(&case, "expectedKind"));
            let value = if kind.eq_ascii("undefined") {
                JsField::Undefined
            } else if kind.eq_ascii("null") {
                JsField::Null
            } else if kind.eq_ascii("one") {
                JsField::Value(1.0)
            } else if kind.eq_ascii("fraction") {
                JsField::Value(1.5)
            } else if kind.eq_ascii("zero") {
                JsField::Value(0.0)
            } else if kind.eq_ascii("exponent") {
                JsField::Value(1e21)
            } else if kind.eq_ascii("nan") {
                JsField::Value(f64::NAN)
            } else if kind.eq_ascii("infinity") {
                JsField::Value(f64::INFINITY)
            } else {
                panic!("unknown golden numeric kind");
            };
            error_equal(
                assert_expected_version(1, &value, "confirmation-record"),
                expected,
            );
        } else if helper.eq_ascii("participants") {
            let ids: Vec<Text> = serde_json::from_str(required(&case, "input").get())
                .unwrap_or_else(|_| panic!("original participant IDs"));
            let participants: Vec<_> = ids
                .into_iter()
                .map(|participant_id| ConfirmationParticipantInput {
                    participant_id,
                    participant_role_key: Text::from(""),
                    participant_display_name: JsField::Undefined,
                    todo_title: JsField::Undefined,
                    todo_summary: JsField::Undefined,
                    due_at: JsField::Undefined,
                })
                .collect();
            error_equal(assert_participants(&participants), expected);
        } else if helper.eq_ascii("reason") {
            let reason = text(required(&case, "reason"));
            let comment = match case.get("comment") {
                None => JsField::Undefined,
                Some(raw) if raw.get() == "null" => JsField::Null,
                Some(raw) => JsField::Value(text(raw)),
            };
            assert_eq!(reason_and_comment(&reason, &comment), text(expected));
        } else {
            let input = text(required(&case, "input"));
            let expected: Option<Text> = serde_json::from_str(expected.get())
                .unwrap_or_else(|_| panic!("original mapping output"));
            let actual = if helper.eq_ascii("mapNodeName") {
                node_name(&input)
            } else if helper.eq_ascii("mapPayoutStageName") {
                Some(payout_stage_name(&input))
            } else if helper.eq_ascii("mapAdjustmentTypeName") {
                Some(adjustment_type_name(&input))
            } else {
                panic!("unknown original helper");
            };
            assert_eq!(actual, expected);
        }
    }
}

#[test]
fn clear_keeps_detached_binding_values_without_reattaching_or_reusing_identity() {
    use poms_api_rust::approval_common::{
        CommonState, EntityHandle, ServiceValue,
        js::{Data, Value, get},
        schema::Table,
        session::TrackedEntity,
        store,
    };
    let id = Value::text("00000000-0000-4000-8000-000000000081");
    let raw = Value::Text(Text::from_code_units(vec![0xd800]));
    let original: Data = [
        ("id".into(), id.clone()),
        ("businessStatusAtSnapshot".into(), raw.clone()),
    ]
    .into_iter()
    .collect();
    let mut state = CommonState::default();
    state.entities.push(TrackedEntity {
        table: Table::Snapshot,
        data: original.clone(),
        original: Some(original.clone()),
        queued: false,
        managed: true,
    });
    let old = ServiceValue::Entity(EntityHandle(0));
    state.clear();
    let Value::Object(snapshot) = old
        .snapshot(&state)
        .unwrap_or_else(|_| panic!("detached JS object is still readable"))
    else {
        panic!("entity binding is an object");
    };
    assert_eq!(get(&snapshot, "id"), &id);
    assert_eq!(get(&snapshot, "businessStatusAtSnapshot"), &raw);
    assert!(store::entity(&state, EntityHandle(0)).is_err());
    assert!(store::assign(&mut state, EntityHandle(0), Data::new()).is_err());

    // A later query owns a separate hydrated identity. The old JS object
    // remains a detached, raw-value snapshot rather than being rebound to it.
    let mut fresh = original;
    fresh.insert("businessStatusAtSnapshot".into(), Value::text("\u{fffd}"));
    state.entities.push(TrackedEntity {
        table: Table::Snapshot,
        data: fresh.clone(),
        original: Some(fresh),
        queued: false,
        managed: true,
    });
    assert_eq!(
        get(
            &store::data(&state, EntityHandle(1)).unwrap_or_else(|_| panic!("new identity")),
            "businessStatusAtSnapshot"
        ),
        &Value::text("\u{fffd}")
    );
    let Value::Object(old_snapshot) = old
        .snapshot(&state)
        .unwrap_or_else(|_| panic!("old binding"))
    else {
        panic!("old binding is an object");
    };
    assert_eq!(get(&old_snapshot, "businessStatusAtSnapshot"), &raw);
    assert!(!state.entities[0].managed);
}

#[test]
fn failed_fork_keeps_only_existing_shared_object_mutations_not_child_identities_or_receipts() {
    use poms_api_rust::approval_common::{
        CommonState,
        js::{Data, Value, get},
        schema::Table,
        session::TrackedEntity,
    };
    let initial: Data = [
        (
            "id".into(),
            Value::text("00000000-0000-4000-8000-000000000081"),
        ),
        ("currentStatus".into(), Value::text("pending")),
    ]
    .into_iter()
    .collect();
    let mut parent = CommonState::default();
    parent.entities.push(TrackedEntity {
        table: Table::Approval,
        data: initial.clone(),
        original: Some(initial.clone()),
        queued: false,
        managed: true,
    });
    let mut child = parent.clone();
    child.entities[0]
        .data
        .insert("currentStatus".into(), Value::text("approved"));
    child.entities.push(TrackedEntity {
        table: Table::Approval,
        data: Data::new(),
        original: None,
        queued: true,
        managed: true,
    });
    child.trace.begin(true);
    child
        .trace
        .inserted("approval_record", "00000000-0000-4000-8000-000000000082");
    parent.share_existing_after_failed_fork(&child);
    assert_eq!(parent.entities.len(), 1);
    assert_eq!(
        get(&parent.entities[0].data, "currentStatus"),
        &Value::text("approved")
    );
    assert_eq!(
        get(
            parent.entities[0]
                .original
                .as_ref()
                .unwrap_or_else(|| panic!("original snapshot")),
            "currentStatus"
        ),
        &Value::text("pending")
    );
    assert_eq!(parent.trace.depth(), 0);
    assert!(parent.trace.take_committed().is_empty());
}
