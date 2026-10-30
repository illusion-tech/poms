//! The original three approval branches. All persistence is enlisted in the
//! borrowed CommonSession; the shared store owns flush SQL and transactions.
use super::{model::*, settlement::*};
use crate::approval_common::{
    ApprovalDecision, CommonFailure, CommonSession, DecisionContext, DomainDecisionOutcome,
    EntityHandle, Text, Timestamp,
    js::{Data, Value, get},
    schema::Table,
    service::object,
    session::{ApprovalDomainHandler, DomainDecisionFuture},
    store,
};
use axum::http::StatusCode;
use sqlx::PgConnection;

pub(super) struct OriginalApprovalDomain;

fn message(parts: &[Value]) -> Text {
    Text::from_code_units(
        parts
            .iter()
            .flat_map(|value| value.js_text().as_code_units().to_vec())
            .collect(),
    )
}
fn bad(parts: &[Value]) -> CommonFailure {
    CommonFailure::http(StatusCode::BAD_REQUEST, message(parts))
}
fn required(
    row: Option<EntityHandle>,
    kind: &str,
    id: &Value,
) -> Result<EntityHandle, CommonFailure> {
    row.ok_or_else(|| {
        CommonFailure::http(
            StatusCode::NOT_FOUND,
            message(&[
                Value::text(kind),
                Value::text(" "),
                id.clone(),
                Value::text(" not found"),
            ]),
        )
    })
}
async fn find_one(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    filters: &[(&str, Vec<Value>)],
    order: &[(&str, bool)],
) -> Result<Option<EntityHandle>, CommonFailure> {
    Ok(store::find(session, table, filters, order, true)
        .await?
        .first()
        .copied())
}
fn val(row: &Data, key: &str) -> Value {
    get(row, key).clone()
}
fn txt(row: &Data, key: &str) -> Option<Text> {
    get(row, key).as_text().cloned()
}
fn now() -> Value {
    Value::Date(Some(Timestamp::now()))
}
fn uuid() -> Result<Value, CommonFailure> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| CommonFailure::unexpected("UUID generation failed"))?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Value::text(uuid::Uuid::from_bytes(bytes).to_string()))
}

struct FinalContext {
    freeze: Data,
    binding: Data,
    gate: Data,
}
struct RetentionContext {
    final_context: FinalContext,
    due: RetentionDueEvaluation,
    receipt: Data,
    departure: Data,
}

async fn current_final_context(
    session: &mut CommonSession<'_, '_>,
    project: &Value,
) -> Result<FinalContext, CommonFailure> {
    let freeze=find_one(session,Table::RoleAssignment,&[("projectId",vec![project.clone()]),("isCurrent",vec![Value::Bool(true)]),("status",vec![Value::text("frozen")])],&[]).await?
        .ok_or_else(||bad(&[Value::text("Current frozen CommissionRoleAssignment is required before processing final payout approval for project "),project.clone()]))?;
    let binding=find_one(session,Table::GateBinding,&[("projectId",vec![project.clone()]),("gateStageType",vec![Value::text("final")]),("status",vec![Value::text("active")])],&[]).await?
        .ok_or_else(||bad(&[Value::text("Active final commission gate binding is required before processing final payout approval for project "),project.clone()]))?;
    let binding = store::data(session.state, binding)?;
    let gate=find_one(session,Table::GateReview,&[("bindingId",vec![val(&binding,"id")]),("status",vec![Value::text("active")])],&[("handledAt",true),("createdAt",true)]).await?
        .ok_or_else(||bad(&[Value::text("Active final commission gate review is required before processing final payout approval for project "),project.clone()]))?;
    Ok(FinalContext {
        freeze: store::data(session.state, freeze)?,
        binding,
        gate: store::data(session.state, gate)?,
    })
}
fn gate_blocked(payout: &Data) -> CommonFailure {
    bad(&[
        Value::text("CommissionPayout "),
        val(payout, "id"),
        Value::text(" is blocked by the current final commission gate review"),
    ])
}
async fn retention_due(
    session: &mut CommonSession<'_, '_>,
    freeze: &Data,
) -> Result<RetentionDueEvaluation, CommonFailure> {
    let baseline = if get(freeze, "effectiveHandoverBaselineSnapshotId").truthy() {
        find_one(
            session,
            Table::ContractTerm,
            &[(
                "id",
                vec![val(freeze, "effectiveHandoverBaselineSnapshotId")],
            )],
            &[],
        )
        .await?
    } else {
        None
    };
    let date = baseline
        .map(|row| store::data(session.state, row).map(|row| val(&row, "retentionDueDate")))
        .transpose()?
        .unwrap_or(Value::Null);
    evaluate_retention_due_date(&date, Timestamp::now())
}
fn assert_due(due: &RetentionDueEvaluation, payout: &Data) -> Result<(), CommonFailure> {
    match due.status {
        RetentionDueStatus::Missing => Err(bad(&[
            Value::text("CommissionPayout "),
            val(payout, "id"),
            Value::text(
                " cannot approve retention payout without a current retention due date fact",
            ),
        ])),
        RetentionDueStatus::Pending => Err(bad(&[
            Value::text("CommissionPayout "),
            val(payout, "id"),
            Value::text(" cannot approve retention payout before retention due date "),
            due.date.clone().map(Value::Text).unwrap_or(Value::Null),
        ])),
        RetentionDueStatus::Due => Ok(()),
    }
}
async fn retention_ready_context(
    session: &mut CommonSession<'_, '_>,
    payout: &Data,
) -> Result<RetentionContext, CommonFailure> {
    let project = val(payout, "projectId");
    let current = find_one(
        session,
        Table::FinalSettlement,
        &[
            ("projectId", vec![project.clone()]),
            ("isCurrent", vec![Value::Bool(true)]),
        ],
        &[],
    )
    .await?;
    let current = current
        .map(|row| store::data(session.state, row))
        .transpose()?;
    let current=current.filter(|row|get(row,"status")==&Value::text("active")).ok_or_else(||bad(&[Value::text("Current CommissionFinalSettlementSnapshot is required before approving retention payout for project "),project.clone()]))?;
    if get(&current, "finalSettlementStatus") != &Value::text("pending-retention-settlement")
        || get(&current, "retentionSettlementStatus") != &Value::text("ready-retention")
    {
        return Err(bad(&[
            Value::text("CommissionPayout "),
            val(payout, "id"),
            Value::text(" is not in a retention-ready settlement state"),
        ]));
    }
    if !get(&current, "retentionReceiptRecordId").truthy()
        || !get(&current, "departureExceptionDecisionId").truthy()
    {
        return Err(bad(&[
            Value::text("Current CommissionFinalSettlementSnapshot for project "),
            project.clone(),
            Value::text(" is missing retention receipt or departure decision references"),
        ]));
    }
    let context = current_final_context(session, &project).await?;
    if review_or_blocking_gate(
        txt(&context.binding, "bindingAction").as_ref(),
        txt(&context.gate, "gateReviewDecision").as_ref(),
    ) {
        return Err(gate_blocked(payout));
    }
    let due = retention_due(session, &context.freeze).await?;
    assert_due(&due, payout)?;
    let receipt = find_one(
        session,
        Table::Receipt,
        &[("id", vec![val(&current, "retentionReceiptRecordId")])],
        &[],
    )
    .await?
    .map(|row| store::data(session.state, row))
    .transpose()?;
    let receipt = receipt
        .filter(|row| {
            get(row, "projectId") == &project && get(row, "status") == &Value::text("confirmed")
        })
        .ok_or_else(|| {
            bad(&[
                Value::text("Current retention receipt "),
                val(&current, "retentionReceiptRecordId"),
                Value::text(" is invalid for project "),
                project.clone(),
            ])
        })?;
    let departure = find_one(
        session,
        Table::DepartureDecision,
        &[("id", vec![val(&current, "departureExceptionDecisionId")])],
        &[],
    )
    .await?
    .map(|row| store::data(session.state, row))
    .transpose()?;
    let departure = departure
        .filter(|row| {
            get(row, "projectId") == &project
                && get(row, "freezeVersionId") == get(&context.freeze, "id")
                && get(row, "isCurrent") == &Value::Bool(true)
                && get(row, "status") == &Value::text("active")
        })
        .ok_or_else(|| {
            bad(&[
                Value::text("Current departure / exception decision "),
                val(&current, "departureExceptionDecisionId"),
                Value::text(" is invalid for project "),
                project.clone(),
            ])
        })?;
    if txt(&departure, "confirmationRequirementSummary")
        .as_ref()
        .map(trim_text)
        .is_some_and(|value| value.is_truthy())
    {
        return Err(bad(&[Value::text(
            "The current departure / exception decision still requires successor confirmation before retention payout approval",
        )]));
    }
    if find_one(
        session,
        Table::FreezeDispute,
        &[
            ("freezeVersionId", vec![val(&context.freeze, "id")]),
            ("status", vec![Value::text("submitted")]),
        ],
        &[],
    )
    .await?
    .is_some()
    {
        return Err(bad(&[
            Value::text("CommissionPayout "),
            val(payout, "id"),
            Value::text(" is blocked by an open freeze dispute"),
        ]));
    }
    Ok(RetentionContext {
        final_context: context,
        due,
        receipt,
        departure,
    })
}

fn retention_draft(context: &RetentionContext) -> Result<RetentionSettlementDraft, CommonFailure> {
    let departure = DepartureDecisionSummary {
        decision_summary: get(&context.departure, "decisionSummary").js_text(),
        confirmation_requirement_summary: txt(&context.departure, "confirmationRequirementSummary"),
    };
    let receipt = SettlementReceiptSummary {
        amount: val(&context.receipt, "receiptAmount"),
        date: match get(&context.receipt, "receiptDate") {
            Value::Date(Some(value)) => *value,
            _ => return Err(CommonFailure::unexpected("Invalid internal receipt date")),
        },
    };
    retention_settlement_draft(&RetentionEvaluationInput {
        open_freeze_dispute: false,
        retention_due: &context.due,
        departure_decision: Some(&departure),
        retention_receipt: Some(&receipt),
        gate_binding_action: txt(&context.final_context.binding, "bindingAction").as_ref(),
        gate_review_decision: txt(&context.final_context.gate, "gateReviewDecision").as_ref(),
        gate_review_blocking_reason_code: txt(&context.final_context.gate, "blockingReasonCode")
            .as_ref(),
        gate_next_action_summary: txt(&context.final_context.gate, "nextActionSummary").as_ref(),
        mark_as_settled: false,
    })
}

fn explanation_data(explanation: &RuleExplanationDraft) -> Data {
    object([
        (
            "currentStageStatus",
            Value::text(explanation.current_stage_status),
        ),
        (
            "gateDecisionCode",
            Value::text(explanation.gate_decision_code),
        ),
        (
            "blockingReasonCategory",
            explanation
                .blocking_reason_category
                .map(Value::text)
                .unwrap_or(Value::Null),
        ),
        (
            "blockingReasonCode",
            explanation
                .blocking_reason_code
                .clone()
                .map(Value::Text)
                .unwrap_or(Value::Null),
        ),
        (
            "blockingReasonSummary",
            explanation
                .blocking_reason_summary
                .clone()
                .map(Value::Text)
                .unwrap_or(Value::Null),
        ),
        (
            "gateDecisionSummary",
            Value::Text(explanation.gate_decision_summary.clone()),
        ),
        (
            "nextActionSummary",
            explanation
                .next_action_summary
                .clone()
                .map(Value::Text)
                .unwrap_or(Value::Null),
        ),
    ])
}
async fn write_final(
    session: &mut CommonSession<'_, '_>,
    payout: &Data,
    actor: &Text,
    context: &FinalContext,
    mut patch: Data,
) -> Result<Value, CommonFailure> {
    let current = find_one(
        session,
        Table::FinalSettlement,
        &[
            ("projectId", vec![val(payout, "projectId")]),
            ("isCurrent", vec![Value::Bool(true)]),
        ],
        &[],
    )
    .await?;
    let previous = current
        .map(|row| store::data(session.state, row))
        .transpose()?;
    if let Some(current) = current {
        store::assign(
            session.state,
            current,
            object([
                ("isCurrent", Value::Bool(false)),
                ("status", Value::text("superseded")),
                ("updatedBy", Value::Text(actor.clone())),
            ]),
        )?;
        store::persist(session.state, current)?;
        // Source flush point. Group ordering is supplied by the common store
        // only after Root's actual Native calibration, not local raw SQL.
        store::flush(session).await?;
    }
    let id = uuid()?;
    patch.extend(object([
        ("id", id.clone()),
        ("projectId", val(payout, "projectId")),
        ("freezeVersionId", val(&context.freeze, "id")),
        ("gateReviewRecordId", val(&context.gate, "id")),
        (
            "version",
            Value::Number(previous.as_ref().map_or(1.0, |row| {
                get(row, "version").as_number().unwrap_or(f64::NAN) + 1.0
            })),
        ),
        ("isCurrent", Value::Bool(true)),
        ("generatedAt", now()),
        ("status", Value::text("active")),
        (
            "supersedesId",
            previous.as_ref().map_or(Value::Null, |row| val(row, "id")),
        ),
        ("createdBy", Value::Text(actor.clone())),
        ("updatedBy", Value::Text(actor.clone())),
    ]));
    for key in [
        "baselineSelectionSource",
        "taxImpactSummary",
        "taxImpactPendingAmount",
        "dataMaturityLevel",
        "costActionRecommendation",
        "currentActionLevel",
        "referencedBaselineVersion",
        "referencedSnapshotVersion",
    ] {
        patch.insert(key.into(), val(&context.binding, key));
    }
    for key in [
        "summaryPackageKey",
        "summarySnapshotId",
        "projectionLevel",
        "exportPolicy",
    ] {
        patch.insert(key.into(), val(&context.gate, key));
    }
    store::create(session.state, Table::FinalSettlement, patch);
    Ok(id)
}
async fn write_explanation(
    session: &mut CommonSession<'_, '_>,
    project: Value,
    final_id: Value,
    explanation: &RuleExplanationDraft,
    actor: &Text,
) -> Result<(), CommonFailure> {
    let current = find_one(
        session,
        Table::RuleExplanation,
        &[
            ("projectId", vec![project.clone()]),
            ("isCurrent", vec![Value::Bool(true)]),
        ],
        &[],
    )
    .await?;
    let previous = current
        .map(|row| store::data(session.state, row))
        .transpose()?;
    if let Some(current) = current {
        store::assign(
            session.state,
            current,
            object([
                ("isCurrent", Value::Bool(false)),
                ("status", Value::text("superseded")),
                ("updatedBy", Value::Text(actor.clone())),
            ]),
        )?;
        store::persist(session.state, current)?;
        store::flush(session).await?;
    }
    let mut data = explanation_data(explanation);
    data.extend(object([
        ("id", uuid()?),
        ("projectId", project),
        ("finalSettlementSnapshotId", final_id),
        (
            "version",
            Value::Number(previous.as_ref().map_or(1.0, |row| {
                get(row, "version").as_number().unwrap_or(f64::NAN) + 1.0
            })),
        ),
        ("isCurrent", Value::Bool(true)),
        ("generatedAt", now()),
        ("status", Value::text("active")),
        (
            "supersedesId",
            previous.as_ref().map_or(Value::Null, |row| val(row, "id")),
        ),
        ("createdBy", Value::Text(actor.clone())),
        ("updatedBy", Value::Text(actor.clone())),
    ]));
    store::create(session.state, Table::RuleExplanation, data);
    Ok(())
}

impl ApprovalDomainHandler for OriginalApprovalDomain {
    fn apply<'a>(
        &'a self,
        _context: &'a DecisionContext,
        _connection: &'a mut PgConnection,
    ) -> DomainDecisionFuture<'a> {
        Box::pin(async {
            Err(CommonFailure::unexpected(
                "Production approval domain requires the caller's CommonSession",
            ))
        })
    }
    fn apply_with_session<'a>(
        &'a self,
        context: &'a DecisionContext,
        session: &'a mut CommonSession<'_, '_>,
    ) -> DomainDecisionFuture<'a> {
        Box::pin(async move {
            let record = &context.record;
            let id = Value::Text(record.target_object_id.clone());
            let approved = context.decision == ApprovalDecision::Approved;
            let table = if record.target_object_type.eq_ascii("contract")
                && record.approval_type.eq_ascii("contract-review")
            {
                Table::Contract
            } else if record.target_object_type.eq_ascii("commission-payout")
                && record.approval_type.eq_ascii("commission-payout-approval")
            {
                Table::Payout
            } else if record.target_object_type.eq_ascii("commission-adjustment")
                && record
                    .approval_type
                    .eq_ascii("commission-adjustment-approval")
            {
                Table::Adjustment
            } else {
                return Err(bad(&[
                    Value::text("ApprovalRecord "),
                    Value::Text(record.id.clone()),
                    Value::text(" is not supported by the current approval slice"),
                ]));
            };
            let kind = match table {
                Table::Contract => "Contract",
                Table::Payout => "CommissionPayout",
                _ => "CommissionAdjustment",
            };
            let entity = required(
                find_one(session, table, &[("id", vec![id.clone()])], &[]).await?,
                kind,
                &id,
            )?;
            let mut row = store::data(session.state, entity)?;
            let mut snapshot_id = None;
            let status = match table {
                Table::Contract => {
                    if approved {
                        "pending-review"
                    } else {
                        "draft"
                    }
                }
                Table::Adjustment => {
                    if approved {
                        "approved"
                    } else {
                        "rejected"
                    }
                }
                _ => {
                    if approved {
                        "approved"
                    } else {
                        "draft"
                    }
                }
            };
            let mut patch = object([("status", Value::text(status))]);
            if table == Table::Payout {
                if approved {
                    patch.insert(
                        "approvedAmount".into(),
                        if get(&row, "approvedAmount").nullish() {
                            val(&row, "theoreticalCapAmount")
                        } else {
                            val(&row, "approvedAmount")
                        },
                    );
                    patch.insert("approvedAt".into(), now());
                    patch.insert("approvedBy".into(), Value::Text(context.actor_id.clone()));
                } else {
                    for key in ["approvedAmount", "approvedAt", "approvedBy"] {
                        patch.insert(key.into(), Value::Null);
                    }
                }
            }
            store::assign(session.state, entity, patch)?;
            row = store::data(session.state, entity)?;
            if table == Table::Payout && approved {
                if get(&row, "stageType") == &Value::text("retention") {
                    let ready = retention_ready_context(session, &row).await?;
                    let draft = retention_draft(&ready)?;
                    let patch = object([
                        (
                            "finalSettlementStatus",
                            Value::text(draft.final_settlement_status),
                        ),
                        (
                            "nonRetentionSettlementStatus",
                            Value::text(draft.non_retention_settlement_status),
                        ),
                        (
                            "retentionSettlementStatus",
                            Value::text(draft.retention_settlement_status),
                        ),
                        (
                            "retentionRequirementSummary",
                            draft
                                .retention_requirement_summary
                                .map(Value::Text)
                                .unwrap_or(Value::Null),
                        ),
                        (
                            "retentionReceiptSummary",
                            draft
                                .retention_receipt_summary
                                .map(Value::Text)
                                .unwrap_or(Value::Null),
                        ),
                        (
                            "departureExceptionSummary",
                            draft
                                .departure_exception_summary
                                .map(Value::Text)
                                .unwrap_or(Value::Null),
                        ),
                        ("retentionReceiptRecordId", val(&ready.receipt, "id")),
                        ("departureExceptionDecisionId", val(&ready.departure, "id")),
                    ]);
                    let snapshot = write_final(
                        session,
                        &row,
                        &context.actor_id,
                        &ready.final_context,
                        patch,
                    )
                    .await?;
                    write_explanation(
                        session,
                        val(&row, "projectId"),
                        snapshot.clone(),
                        &draft.rule_explanation,
                        &context.actor_id,
                    )
                    .await?;
                    snapshot_id = snapshot.as_text().cloned();
                } else if get(&row, "stageType") == &Value::text("final") {
                    let final_context =
                        current_final_context(session, get(&row, "projectId")).await?;
                    if blocking_gate(
                        txt(&final_context.binding, "bindingAction").as_ref(),
                        txt(&final_context.gate, "gateReviewDecision").as_ref(),
                    ) {
                        return Err(gate_blocked(&row));
                    }
                    let patch = object([
                        (
                            "finalSettlementStatus",
                            Value::text("pending-final-settlement"),
                        ),
                        (
                            "nonRetentionSettlementStatus",
                            Value::text("pending-non-retention"),
                        ),
                        (
                            "retentionSettlementStatus",
                            Value::text("waiting-retention"),
                        ),
                        (
                            "retentionRequirementSummary",
                            Value::text(DEFAULT_RETENTION_REQUIREMENT_SUMMARY),
                        ),
                        ("retentionReceiptSummary", Value::Null),
                        ("departureExceptionSummary", Value::Null),
                        ("retentionReceiptRecordId", Value::Null),
                        ("departureExceptionDecisionId", Value::Null),
                    ]);
                    let snapshot =
                        write_final(session, &row, &context.actor_id, &final_context, patch)
                            .await?;
                    write_explanation(
                        session,
                        val(&row, "projectId"),
                        snapshot.clone(),
                        &pending_final_rule_explanation(),
                        &context.actor_id,
                    )
                    .await?;
                    snapshot_id = snapshot.as_text().cloned();
                }
            }
            // Original em.persist([approvalRecord, target, todoItem]) controls
            // change-set insertion independently of SELECT/discovery order.
            // L Native first04 witnesses auth -> todo -> target -> approval.
            let approval = session
                .state
                .entities
                .iter()
                .position(|row| {
                    row.managed
                        && row.table == Table::Approval
                        && get(&row.data, "id") == &Value::Text(record.id.clone())
                })
                .ok_or_else(|| CommonFailure::unexpected("Approval identity is detached"))?;
            store::persist(session.state, EntityHandle(approval))?;
            store::persist(session.state, entity)?;
            if let Some(todo) = &context.todo {
                let handle = session
                    .state
                    .entities
                    .iter()
                    .position(|row| {
                        row.managed
                            && row.table == Table::Todo
                            && get(&row.data, "id") == &Value::Text(todo.id.clone())
                    })
                    .ok_or_else(|| {
                        CommonFailure::unexpected("Approval todo identity is detached")
                    })?;
                store::persist(session.state, EntityHandle(handle))?;
            }
            Ok(DomainDecisionOutcome {
                target_id: get(&row, "id").js_text(),
                target_type: record.target_object_type.clone(),
                business_status_after: Text::from(status),
                snapshot_id,
            })
        })
    }
}
