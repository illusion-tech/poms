//! Pure source-defined checks/mutations. They neither persist nor decide
//! transaction/CAS SQL, and they do not implement any business domain handler.

use super::{CommonFailure, JsField, Text, model::*};
use axum::http::StatusCode;

fn message(parts: &[Text]) -> Text {
    Text::from_code_units(
        parts
            .iter()
            .flat_map(|part| part.as_code_units().iter().copied())
            .collect(),
    )
}

pub fn assert_expected_version(
    actual: i32,
    expected: &JsField<f64>,
    resource: &str,
) -> Result<(), CommonFailure> {
    let expected_text = match expected {
        JsField::Undefined => return Ok(()),
        JsField::Value(value) if *value == f64::from(actual) => return Ok(()),
        JsField::Null => Text::from("null"),
        JsField::Value(value) => Text::from(ryu_js::Buffer::new().format(*value)),
    };
    Err(CommonFailure::http(
        StatusCode::CONFLICT,
        message(&[
            Text::from(resource),
            Text::from(" version "),
            expected_text,
            Text::from(" does not match current version "),
            Text::from(actual.to_string()),
        ]),
    ))
}

pub fn assert_participants(input: &[ConfirmationParticipantInput]) -> Result<(), CommonFailure> {
    if input.is_empty() {
        return Err(CommonFailure::http(
            StatusCode::BAD_REQUEST,
            "ConfirmationRecord requires at least one participant",
        ));
    }
    for (index, participant) in input.iter().enumerate() {
        if input[..index]
            .iter()
            .any(|previous| previous.participant_id == participant.participant_id)
        {
            return Err(CommonFailure::http(
                StatusCode::BAD_REQUEST,
                message(&[
                    Text::from("Duplicate confirmation participant "),
                    participant.participant_id.clone(),
                ]),
            ));
        }
    }
    Ok(())
}

pub fn validate_approval<'a>(
    id: &Text,
    record: Option<&'a ApprovalRecord>,
    actor: &Text,
    expected: &JsField<f64>,
) -> Result<&'a ApprovalRecord, CommonFailure> {
    let record = record.ok_or_else(|| {
        CommonFailure::http(
            StatusCode::NOT_FOUND,
            message(&[
                Text::from("ApprovalRecord "),
                id.clone(),
                Text::from(" not found"),
            ]),
        )
    })?;
    assert_expected_version(record.row_version, expected, "approval-record")?;
    if !record.current_status.eq_ascii("pending") {
        return Err(CommonFailure::http(
            StatusCode::BAD_REQUEST,
            message(&[
                Text::from("ApprovalRecord "),
                id.clone(),
                Text::from(" cannot be processed in status "),
                record.current_status.clone(),
            ]),
        ));
    }
    if record.current_approver_user_id.as_ref() != Some(actor) {
        return Err(CommonFailure::http(
            StatusCode::FORBIDDEN,
            message(&[
                Text::from("ApprovalRecord "),
                id.clone(),
                Text::from(" is not assigned to current user"),
            ]),
        ));
    }
    Ok(record)
}

pub fn validate_confirmation<'a>(
    id: &Text,
    record: Option<&'a ConfirmationRecord>,
    expected: &JsField<f64>,
    closing: bool,
) -> Result<&'a ConfirmationRecord, CommonFailure> {
    let record = record.ok_or_else(|| {
        CommonFailure::http(
            StatusCode::NOT_FOUND,
            message(&[
                Text::from("ConfirmationRecord "),
                id.clone(),
                Text::from(" not found"),
            ]),
        )
    })?;
    assert_expected_version(record.row_version, expected, "confirmation-record")?;
    if !record.status.eq_ascii("pending") {
        return Err(CommonFailure::http(
            StatusCode::BAD_REQUEST,
            message(&[
                Text::from("ConfirmationRecord "),
                id.clone(),
                Text::from(if closing {
                    " cannot be closed in status "
                } else {
                    " cannot be confirmed in status "
                }),
                record.status.clone(),
            ]),
        ));
    }
    Ok(record)
}

pub fn validate_participant<'a>(
    record_id: &Text,
    actor_id: &Text,
    participant: Option<&'a ConfirmationParticipant>,
) -> Result<&'a ConfirmationParticipant, CommonFailure> {
    let participant = participant.ok_or_else(|| {
        CommonFailure::http(
            StatusCode::FORBIDDEN,
            message(&[
                Text::from("ConfirmationRecord "),
                record_id.clone(),
                Text::from(" is not assigned to current user"),
            ]),
        )
    })?;
    if !participant.participant_status.eq_ascii("pending") {
        return Err(CommonFailure::http(
            StatusCode::CONFLICT,
            message(&[
                Text::from("Confirmation participant "),
                actor_id.clone(),
                Text::from(" is already "),
                participant.participant_status.clone(),
            ]),
        ));
    }
    Ok(participant)
}

pub fn apply_approval(
    record: &mut ApprovalRecord,
    todo: Option<&mut TodoItem>,
    decision: ApprovalDecision,
    comment: Option<Text>,
    now: Timestamp,
) {
    record.current_status = decision.text();
    record.decision = Some(decision.text());
    record.decision_comment = comment;
    record.decided_at = Some(now);
    record.closed_at = Some(now);
    record.current_approver_user_id = None;
    if let Some(todo) = todo {
        todo.status = Text::from(match decision {
            ApprovalDecision::Approved => "completed",
            ApprovalDecision::Rejected => "canceled",
        });
        todo.completed_at = Some(now);
    }
}

pub fn apply_confirmation(
    record: &mut ConfirmationRecord,
    participant: &mut ConfirmationParticipant,
    todo: Option<&mut TodoItem>,
    actor: &Text,
    comment: Option<Text>,
    now: Timestamp,
) {
    participant.participant_status = Text::from("confirmed");
    participant.confirmed_at = Some(now);
    participant.confirmed_comment = comment;
    participant.updated_by = Some(actor.clone());
    record.confirmed_count += 1;
    record.updated_by = Some(actor.clone());
    if record.confirmed_count >= record.required_count {
        record.status = Text::from("confirmed");
        record.confirmed_at = Some(now);
    }
    if let Some(todo) = todo {
        todo.status = Text::from("completed");
        todo.completed_at = Some(now);
    }
}

/// The caller supplies exactly the pending participants and open/processing
/// todos returned by the original close query; already-confirmed rows stay out.
pub fn apply_close(
    record: &mut ConfirmationRecord,
    participants: &mut [ConfirmationParticipant],
    todos: &mut [TodoItem],
    actor: &Text,
    reason: Text,
    now: Timestamp,
) {
    record.status = Text::from("closed");
    record.closed_at = Some(now);
    record.closed_by = Some(actor.clone());
    record.close_reason = Some(reason);
    record.updated_by = Some(actor.clone());
    for participant in participants {
        participant.participant_status = Text::from("closed");
        participant.updated_by = Some(actor.clone());
    }
    for todo in todos {
        todo.status = Text::from("canceled");
        todo.completed_at = Some(now);
    }
}

pub fn confirmation_progress(
    record: &ConfirmationRecord,
    participants: &[ConfirmationParticipant],
) -> ConfirmationProgress {
    ConfirmationProgress {
        id: record.id.clone(),
        confirmation_type: record.confirmation_type.clone(),
        business_domain: record.business_domain.clone(),
        target_type: record.target_type.clone(),
        target_id: record.target_id.clone(),
        project_id: record.project_id.clone(),
        status: record.status.clone(),
        required_count: record.required_count,
        confirmed_count: record.confirmed_count,
        submitted_at: record.submitted_at,
        confirmed_at: record.confirmed_at,
        closed_at: record.closed_at,
        row_version: record.row_version,
        participants: participants
            .iter()
            .map(|participant| ConfirmationProgressParticipant {
                participant_id: participant.participant_id.clone(),
                participant_role_key: participant.participant_role_key.clone(),
                participant_display_name: participant.participant_display_name.clone(),
                participant_status: participant.participant_status.clone(),
                confirmed_at: participant.confirmed_at,
                confirmed_comment: participant.confirmed_comment.clone(),
            })
            .collect(),
    }
}

pub fn original_combination_supported(approval_type: &Text, target_type: &Text) -> bool {
    (approval_type.eq_ascii("contract-review") && target_type.eq_ascii("contract"))
        || (approval_type.eq_ascii("commission-payout-approval")
            && target_type.eq_ascii("commission-payout"))
        || (approval_type.eq_ascii("commission-adjustment-approval")
            && target_type.eq_ascii("commission-adjustment"))
}

pub fn node_name(key: &Text) -> Option<Text> {
    if key.eq_ascii("contract-review") {
        Some(Text::from("合同审核"))
    } else if key.eq_ascii("commission-payout-approval") {
        Some(Text::from("提成发放审批"))
    } else if key.eq_ascii("commission-adjustment-approval") {
        Some(Text::from("提成调整审批"))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::{assert_expected_version, original_combination_supported};
    use crate::approval_common::{JsField, Text};

    #[test]
    fn explicit_null_is_not_an_omitted_expected_version() {
        assert!(assert_expected_version(1, &JsField::Undefined, "confirmation-record").is_ok());
        assert!(assert_expected_version(1, &JsField::Value(1.0), "confirmation-record").is_ok());
        let failure = assert_expected_version(1, &JsField::Null, "confirmation-record")
            .err()
            .unwrap_or_else(|| panic!("explicit null must conflict"));
        assert_eq!(failure.status, Some(409));
        assert!(
            failure
                .message
                .eq_ascii("confirmation-record version null does not match current version 1")
        );
    }

    #[test]
    fn supported_domain_pairs_cannot_be_treated_as_unsupported() {
        assert!(original_combination_supported(
            &Text::from("contract-review"),
            &Text::from("contract")
        ));
        assert!(!original_combination_supported(
            &Text::from("contract-review"),
            &Text::from("project")
        ));
        assert!(!original_combination_supported(
            &Text::from("contract-review"),
            &Text::from("Contract")
        ));
    }
}
