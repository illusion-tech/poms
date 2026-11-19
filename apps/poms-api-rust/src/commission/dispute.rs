use super::{
    model::{ArbitrateDispute, DepartureDecision, Request, SubmitDispute},
    service::check_version,
    settlement,
};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error, new_uuid},
    project_lifecycle::facts::{self, id, instant, next_version, text, version},
    project_operating_common::ResourceKeys,
};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use uuid::Uuid;

pub(super) async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    keys: &ResourceKeys,
    request: &Request,
    actor: &Actor,
) -> Result<Value, Error> {
    match (operation, request) {
        (
            "CommissionFreezeDisputeController_submitCommissionFreezeDispute",
            Request::SubmitDispute(input),
        ) => submit(session, input, actor).await,
        ("CommissionFreezeDisputeController_getCommissionFreezeDispute", Request::None) => {
            detail(session, keys.id()?).await
        }
        (
            "CommissionFreezeDisputeController_arbitrateCommissionFreezeDispute",
            Request::ArbitrateDispute(input),
        ) => arbitrate(session, keys.id()?, input, actor).await,
        (
            "CommissionFreezeChangeRequestController_getCommissionFreezeChangeRequest",
            Request::None,
        ) => change_detail(session, keys.id()?).await,
        (
            "CommissionDepartureExceptionDecisionController_createDepartureExceptionDecision",
            Request::DepartureDecision(input),
        ) => departure(session, keys.project_id()?, input, actor).await,
        _ => Err(Error::Internal),
    }
}

async fn assignment(session: &mut CommonSession<'_, '_>, freeze: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.commission_role_assignment a WHERE id=$1")
        .bind(freeze)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("角色冻结版本不存在。".into()))
}
async fn freeze_context(
    session: &mut CommonSession<'_, '_>,
    freeze: Uuid,
    expected: Option<i32>,
) -> Result<(Value, Value), Error> {
    let before = assignment(session, freeze).await?;
    let project = id(&before, "project_id")?;
    facts::project(session, project, true).await?;
    let row = assignment(session, freeze).await?;
    check_version(&row, expected)?;
    if row["is_current"] != true || row["status"] != "frozen" {
        return Err(Error::Unprocessable(
            "必须引用当前已冻结的角色版本。".into(),
        ));
    }
    if row["producer_version"] == 1 {
        crate::commission_assignment::require_current_frozen(session, project, freeze, None)
            .await?;
    }
    let summary_id = id(&row, "handover_summary_snapshot_id")
        .map_err(|_| Error::Conflict("冻结版本缺少实际移交摘要。".into()))?;
    let summary:Value=sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.approval_summary_snapshot s JOIN poms.project_handover h ON h.id=s.target_id AND h.summary_snapshot_id=s.id WHERE s.id=$1 AND s.status='active' AND s.target_type='project-handover' AND h.id=$2 AND h.project_id=$3 AND h.status='confirmed' AND h.is_current FOR SHARE OF s,h")
        .bind(summary_id).bind(id(&row,"source_handover_id")?).bind(project).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::Conflict("冻结版本没有匹配的当前已确认移交摘要。".into()))?;
    Ok((row, summary))
}

struct Impact {
    calculation: Option<String>,
    payout: Option<String>,
    risk: String,
    assessment: String,
}
async fn impact(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    mode: &str,
) -> Result<Impact, Error> {
    let calculation: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT id,status FROM poms.commission_calculation WHERE project_id=$1 AND is_current",
    )
    .bind(project)
    .fetch_optional(&mut *session.connection)
    .await?;
    let statuses: Vec<String> = sqlx::query_scalar(
        "SELECT status FROM poms.commission_payout WHERE project_id=$1 ORDER BY created_at,id",
    )
    .bind(project)
    .fetch_all(&mut *session.connection)
    .await?;
    let mut risks = Vec::new();
    if calculation.as_ref().is_some_and(|(_, s)| s == "effective") {
        risks.push("effective-calculation-present");
    }
    if statuses
        .iter()
        .any(|s| matches!(s.as_str(), "approved" | "paid" | "suspended"))
    {
        risks.push("downstream-payout-chain-present");
    }
    if statuses.iter().any(|s| s == "paid") {
        risks.push("paid-payout-requires-controlled-follow-up");
    }
    let risk = if risks.is_empty() {
        "no-downstream-risk-detected".into()
    } else {
        risks.join(", ")
    };
    let calculation = calculation
        .map(|(id, status)| format!("Current calculation {id} ({status}) may require {mode}"));
    let payout = (!statuses.is_empty()).then(|| {
        format!(
            "Payout count={}; statuses={}",
            statuses.len(),
            statuses.join(",")
        )
    });
    let assessment = format!(
        "recalculationImpactMode={mode}; {}; {}; riskFlags={risk}",
        calculation.as_deref().unwrap_or("no-current-calculation"),
        payout.as_deref().unwrap_or("no-payout-records")
    );
    Ok(Impact {
        calculation,
        payout,
        risk,
        assessment,
    })
}

async fn submit(
    session: &mut CommonSession<'_, '_>,
    input: &SubmitDispute,
    actor: &Actor,
) -> Result<Value, Error> {
    let (freeze, summary) =
        freeze_context(session, input.freeze_version_id, input.expected_version).await?;
    let project = id(&freeze, "project_id")?;
    let open:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_freeze_dispute_record WHERE freeze_version_id=$1 AND status='submitted')")
        .bind(input.freeze_version_id).fetch_one(&mut *session.connection).await?;
    if open {
        return Err(Error::Conflict("本冻结版本已有未收口争议。".into()));
    }
    let requested = input
        .affected_assignment_ids
        .iter()
        .copied()
        .collect::<BTreeSet<_>>();
    let people = freeze["participants_json"]
        .as_array()
        .ok_or_else(|| Error::Conflict("冻结参与者资料未知。".into()))?;
    let mut matched = BTreeSet::new();
    let mut affected = Vec::new();
    for p in people {
        let user =
            id(p, "userId").map_err(|_| Error::Conflict("历史冻结参与者标识无效。".into()))?;
        if requested.contains(&user) {
            matched.insert(user);
            // Display names are read from the frozen version, never from the request.
            affected.push(format!(
                "{}({})",
                p["displayName"].as_str().unwrap_or("历史参与者"),
                text(p, "roleType")?
            ));
        }
    }
    if matched != requested {
        return Err(Error::BadRequest(
            "受影响参与者必须全部属于指定冻结版本。".into(),
        ));
    }
    let impact = impact(session, project, input.recalculation_impact_mode.trim()).await?;
    let dispute = new_uuid()?;
    sqlx::query("INSERT INTO poms.commission_freeze_dispute_record(id,project_id,freeze_version_id,summary_package_key,summary_snapshot_id,projection_level,export_policy,dispute_reason,affected_assignment_summary,recalculation_impact_mode,impact_assessment_summary,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)")
        .bind(dispute).bind(project).bind(input.freeze_version_id).bind(text(&summary,"summary_package_key")?).bind(id(&summary,"id")?).bind(text(&summary,"projection_level")?).bind(text(&summary,"export_policy")?)
        .bind(input.dispute_reason.trim()).bind(affected.join("; ")).bind(input.recalculation_impact_mode.trim()).bind(impact.assessment).bind(actor.id).execute(&mut *session.connection).await?;
    facts::record(session,actor,"CommissionFreezeDisputeController_submitCommissionFreezeDispute","commission-freeze-dispute",dispute,project,None,json!({"freezeVersionId":input.freeze_version_id,"summarySnapshotId":summary["id"],"status":"submitted","comment":input.comment.as_deref().map(str::trim)})).await?;
    Ok(
        json!({"targetId":dispute,"disputeRecordId":dispute,"freezeVersionId":input.freeze_version_id,"summarySnapshotId":summary["id"],"projectionLevel":summary["projection_level"],"exportPolicy":summary["export_policy"],"businessStatusAfter":"dispute-submitted"}),
    )
}

async fn dispute(session: &mut CommonSession<'_, '_>, dispute: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar(
        "SELECT to_jsonb(d) FROM poms.commission_freeze_dispute_record d WHERE id=$1",
    )
    .bind(dispute)
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::NotFound("冻结争议不存在。".into()))
}
async fn detail(session: &mut CommonSession<'_, '_>, record: Uuid) -> Result<Value, Error> {
    let d = dispute(session, record).await?;
    Ok(
        json!({"disputeRecordId":d["id"],"projectId":d["project_id"],"freezeVersionId":d["freeze_version_id"],"rowVersion":d["row_version"],"disputeReason":d["dispute_reason"],"affectedAssignmentSummary":d["affected_assignment_summary"],"arbitrationStatus":d["arbitration_status"],"recalculationImpactMode":d["recalculation_impact_mode"],"impactAssessmentSummary":d["impact_assessment_summary"],"summaryPackageKey":d["summary_package_key"],"summarySnapshotId":d["summary_snapshot_id"],"projectionLevel":d["projection_level"],"exportPolicy":d["export_policy"],"status":d["status"],"handledAt":instant(&d["handled_at"]),"allowedActions":if d["status"]=="submitted"&&d["arbitration_status"]=="pending"{vec!["arbitrate-commission-freeze-dispute"]}else{vec![]},"generatedAt":crate::auth::model::clock_now()}),
    )
}

async fn arbitrate(
    session: &mut CommonSession<'_, '_>,
    record: Uuid,
    input: &ArbitrateDispute,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = id(&dispute(session, record).await?, "project_id")?;
    facts::project(session, project, true).await?;
    let before: Value = sqlx::query_scalar(
        "SELECT to_jsonb(d) FROM poms.commission_freeze_dispute_record d WHERE id=$1 FOR UPDATE",
    )
    .bind(record)
    .fetch_one(&mut *session.connection)
    .await?;
    check_version(&before, input.expected_version)?;
    next_version(version(&before)?)?;
    if before["status"] != "submitted" || before["arbitration_status"] != "pending" {
        return Err(Error::Conflict("争议已处理，不能重复仲裁。".into()));
    }
    let freeze_id = id(&before, "freeze_version_id")?;
    let replacement = if let Some(replacement) = &input.replacement_assignment_payload {
        let (freeze, summary) = freeze_context(session, freeze_id, None).await?;
        if before["summary_snapshot_id"] != summary["id"] {
            return Err(Error::Conflict("争议依据摘要已变化。".into()));
        }
        Some(
            crate::commission_assignment::replace_frozen_with_session(
                session,
                &freeze,
                &replacement.participants,
                actor,
            )
            .await?,
        )
    } else {
        None
    };
    let impact = impact(session, project, input.recalculation_impact_mode.trim()).await?;
    let change = new_uuid()?;
    let now = crate::auth::model::clock_now();
    sqlx::query("UPDATE poms.commission_freeze_dispute_record SET arbitration_status='arbitrated',status='closed',recalculation_impact_mode=$1,impact_assessment_summary=$2,handled_at=$3,row_version=row_version+1,updated_at=$3,updated_by=$4 WHERE id=$5")
        .bind(input.recalculation_impact_mode.trim()).bind(&impact.assessment).bind(now).bind(actor.id).bind(record).execute(&mut *session.connection).await?;
    sqlx::query("INSERT INTO poms.commission_freeze_change_request(id,dispute_record_id,superseded_freeze_version_id,replacement_freeze_version_id,summary_package_key,summary_snapshot_id,projection_level,export_policy,arbitration_decision,recalculation_impact_mode,affected_calculation_summary,affected_payout_summary,risk_flag_summary,status,handled_at,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)")
        .bind(change).bind(record).bind(freeze_id).bind(replacement).bind(text(&before,"summary_package_key")?).bind(id(&before,"summary_snapshot_id")?).bind(text(&before,"projection_level")?).bind(text(&before,"export_policy")?)
        .bind(input.arbitration_decision.trim()).bind(input.recalculation_impact_mode.trim()).bind(&impact.calculation).bind(&impact.payout).bind(&impact.risk).bind(if replacement.is_some(){"effective"}else{"closed"}).bind(now).bind(actor.id).execute(&mut *session.connection).await?;
    let result = json!({"targetId":record,"disputeRecordId":record,"changeRequestId":change,"supersededFreezeVersionId":freeze_id,"replacementFreezeVersionId":replacement,"affectedCalculationSummary":impact.calculation,"affectedPayoutSummary":impact.payout,"riskFlagSummary":impact.risk,"resultStatus":if replacement.is_some(){"replacement-created"}else{"resolved-without-replacement"}});
    facts::record(
        session,
        actor,
        "CommissionFreezeDisputeController_arbitrateCommissionFreezeDispute",
        "commission-freeze-dispute",
        record,
        project,
        Some(before),
        json!({"result":result,"comment":input.comment.as_deref().map(str::trim)}),
    )
    .await?;
    Ok(result)
}

async fn change_detail(session: &mut CommonSession<'_, '_>, record: Uuid) -> Result<Value, Error> {
    let d: Value = sqlx::query_scalar(
        "SELECT to_jsonb(c) FROM poms.commission_freeze_change_request c WHERE id=$1",
    )
    .bind(record)
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::NotFound("受控冻结变更不存在。".into()))?;
    Ok(
        json!({"changeRequestId":d["id"],"disputeRecordId":d["dispute_record_id"],"supersededFreezeVersionId":d["superseded_freeze_version_id"],"replacementFreezeVersionId":d["replacement_freeze_version_id"],"arbitrationDecision":d["arbitration_decision"],"recalculationImpactMode":d["recalculation_impact_mode"],"affectedCalculationSummary":d["affected_calculation_summary"],"affectedPayoutSummary":d["affected_payout_summary"],"riskFlagSummary":d["risk_flag_summary"],"summaryPackageKey":d["summary_package_key"],"summarySnapshotId":d["summary_snapshot_id"],"projectionLevel":d["projection_level"],"exportPolicy":d["export_policy"],"status":d["status"],"handledAt":instant(&d["handled_at"]),"generatedAt":crate::auth::model::clock_now()}),
    )
}

async fn departure(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    input: &DepartureDecision,
    actor: &Actor,
) -> Result<Value, Error> {
    facts::project(session, project, true).await?;
    let anchor = assignment(session, input.freeze_version_id).await?;
    if id(&anchor, "project_id")? != project {
        return Err(Error::BadRequest("离职结论的冻结版本不属于本项目。".into()));
    }
    let (freeze, summary) = freeze_context(session, input.freeze_version_id, None).await?;
    if id(&summary, "id")? != input.summary_snapshot_id {
        return Err(Error::BadRequest(
            "离职结论摘要必须匹配冻结版本的实际移交摘要。".into(),
        ));
    }
    let previous:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(d) FROM poms.commission_departure_exception_decision d WHERE project_id=$1 AND is_current FOR UPDATE")
        .bind(project).fetch_optional(&mut *session.connection).await?;
    let maximum:i32=sqlx::query_scalar("SELECT COALESCE(MAX(version),0) FROM poms.commission_departure_exception_decision WHERE project_id=$1")
        .bind(project).fetch_one(&mut *session.connection).await?;
    let logical = next_version(maximum)?;
    let now = crate::auth::model::clock_now();
    if let Some(previous) = &previous {
        next_version(version(previous)?)?;
        sqlx::query("UPDATE poms.commission_departure_exception_decision SET is_current=false,status='superseded',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
            .bind(now).bind(actor.id).bind(id(previous,"id")?).execute(&mut *session.connection).await?;
    }
    let decision = new_uuid()?;
    let row:Value=sqlx::query_scalar("INSERT INTO poms.commission_departure_exception_decision AS d(id,project_id,freeze_version_id,version,departure_scenario_code,decision_code,decision_summary,confirmation_requirement_summary,summary_package_key,summary_snapshot_id,projection_level,export_policy,handled_at,handled_by,supersedes_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$14,$14) RETURNING to_jsonb(d)")
        .bind(decision).bind(project).bind(input.freeze_version_id).bind(logical).bind(input.departure_scenario_code.trim()).bind(input.decision_code.trim()).bind(input.decision_summary.trim()).bind(input.confirmation_requirement_summary.as_deref().map(str::trim))
        .bind(text(&summary,"summary_package_key")?).bind(input.summary_snapshot_id).bind(text(&summary,"projection_level")?).bind(text(&summary,"export_policy")?).bind(now).bind(actor.id).bind(previous.as_ref().map(|p|id(p,"id")).transpose()?).fetch_one(&mut *session.connection).await?;
    if let Some(snapshot) = settlement::current(session, project).await?
        && snapshot["freeze_version_id"] == freeze["id"]
        && snapshot["final_settlement_status"] != "settled-all"
    {
        settlement::refresh(session, project, actor.id).await?;
    }
    facts::record(
        session,
        actor,
        "CommissionDepartureExceptionDecisionController_createDepartureExceptionDecision",
        "commission-departure-exception-decision",
        decision,
        project,
        previous,
        row.clone(),
    )
    .await?;
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"freezeVersionId":row["freeze_version_id"],"version":row["version"],"rowVersion":row["row_version"],"isCurrent":row["is_current"],"departureScenarioCode":row["departure_scenario_code"],"decisionCode":row["decision_code"],"decisionSummary":row["decision_summary"],"confirmationRequirementSummary":row["confirmation_requirement_summary"],"summaryPackageKey":row["summary_package_key"],"summarySnapshotId":row["summary_snapshot_id"],"projectionLevel":row["projection_level"],"exportPolicy":row["export_policy"],"status":row["status"],"handledAt":instant(&row["handled_at"]),"createdAt":instant(&row["created_at"]),"updatedAt":instant(&row["updated_at"])}),
    )
}
