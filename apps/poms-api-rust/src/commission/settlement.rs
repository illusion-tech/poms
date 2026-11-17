use super::payout_context::{self as context, Source};
use super::{cash_allocation as cash, contract_scope};
use crate::{
    approval::{
        model::{
            DepartureDecisionSummary, RetentionDueEvaluation, RetentionEvaluationInput,
            RetentionSettlementDraft, SettlementReceiptSummary,
        },
        settlement as rules,
    },
    approval_common::{CommonSession, Text, Timestamp, js::Value as JsValue},
    contract_support::{Error, new_uuid},
    project_lifecycle::facts::{id, next_version, text},
};
use rust_decimal::Decimal;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

pub(super) struct Evaluation {
    pub draft: RetentionSettlementDraft,
    pub receipt: Option<Uuid>,
    pub departure: Option<Uuid>,
    pub receipt_ids: Vec<Uuid>,
}

fn optional_text(row: &Value, key: &str) -> Option<Text> {
    row[key].as_str().map(Text::from)
}

pub(super) async fn evaluate(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    source: &Source,
    receipt: Option<Uuid>,
    departure: Option<Uuid>,
    settled: bool,
) -> Result<Evaluation, Error> {
    let mut retention_terms = Vec::new();
    for term in &source.terms {
        if term
            .amount
            .checked_mul(term.retention)
            .map(context::rounded)
            .ok_or(Error::Internal)?
            > Decimal::ZERO
        {
            retention_terms.push(term);
        }
    }
    let due_date = if retention_terms.iter().any(|t| t.due.is_none()) {
        None
    } else {
        retention_terms
            .iter()
            .filter_map(|t| t.due.as_deref())
            .max()
    };
    let due: RetentionDueEvaluation = rules::evaluate_retention_due_date(
        &due_date.map_or(JsValue::Null, JsValue::text),
        Timestamp(crate::auth::model::clock_now()),
    )?;
    let freeze = id(&source.freeze, "id")?;
    let decision: Option<Value> = sqlx::query_scalar("SELECT to_jsonb(d) FROM poms.commission_departure_exception_decision d WHERE project_id=$1 AND freeze_version_id=$2 AND is_current AND status='active' AND ($3::uuid IS NULL OR id=$3) FOR SHARE")
        .bind(project).bind(freeze).bind(departure).fetch_optional(&mut *session.connection).await?;
    if departure.is_some() && decision.is_none() {
        return Err(Error::Conflict(
            "离职/特例结论不是当前冻结版本的有效结论。".into(),
        ));
    }
    let receipt_contracts = retention_terms
        .iter()
        .map(|t| t.contract)
        .collect::<Vec<_>>();
    let receipt_rows =
        contract_scope::qualified_receipts(session, project, Some(&receipt_contracts), true)
            .await?;
    if receipt.is_some_and(|requested| {
        !receipt_rows
            .iter()
            .any(|r| r["id"] == requested.to_string())
    }) {
        return Err(Error::Conflict(
            "质保金引用必须属于冻结合同集合且已确认到账。".into(),
        ));
    }
    let mut received = BTreeMap::new();
    for row in &receipt_rows {
        let entry = received
            .entry(id(row, "contract_id")?)
            .or_insert(Decimal::ZERO);
        *entry = entry
            .checked_add(context::money(row, "amount_excluding_tax")?)
            .ok_or(Error::Internal)?;
    }
    let mut qualified = !retention_terms.is_empty();
    for term in &retention_terms {
        let required = term
            .amount
            .checked_mul(term.retention)
            .map(context::rounded)
            .ok_or(Error::Internal)?;
        if received
            .get(&term.contract)
            .copied()
            .unwrap_or(Decimal::ZERO)
            < required
        {
            qualified = false;
        }
    }
    if receipt.is_some() && !qualified {
        return Err(Error::Unprocessable(
            "冻结合同集合的质保金尚未全部到账。".into(),
        ));
    }
    let decision_summary = decision.as_ref().map(|row| DepartureDecisionSummary {
        decision_summary: Text::from(row["decision_summary"].as_str().unwrap_or("")),
        confirmation_requirement_summary: optional_text(row, "confirmation_requirement_summary"),
    });
    let receipt_summary = if qualified {
        receipt_rows.first()
    } else {
        None
    }
    .map(|row| -> Result<SettlementReceiptSummary, Error> {
        let date = chrono::DateTime::parse_from_rfc3339(text(row, "receipt_date")?)
            .map_err(|_| Error::Internal)?
            .with_timezone(&chrono::Utc);
        Ok(SettlementReceiptSummary {
            amount: JsValue::text(contract_scope::sum(received.values().copied())?.to_string()),
            date: Timestamp(date),
        })
    })
    .transpose()?;
    let open: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_freeze_dispute_record WHERE freeze_version_id=$1 AND status='submitted')")
        .bind(freeze).fetch_one(&mut *session.connection).await?;
    let binding = source.binding.as_ref();
    let review = source.review.as_ref();
    let binding_action = binding.and_then(|v| optional_text(v, "binding_action"));
    let gate_decision = review.and_then(|v| optional_text(v, "gate_review_decision"));
    let blocking_reason = review.and_then(|v| optional_text(v, "blocking_reason_code"));
    let next_action = review.and_then(|v| optional_text(v, "next_action_summary"));
    let draft = rules::retention_settlement_draft(&RetentionEvaluationInput {
        open_freeze_dispute: open,
        retention_due: &due,
        departure_decision: decision_summary.as_ref(),
        retention_receipt: receipt_summary.as_ref(),
        gate_binding_action: binding_action.as_ref(),
        gate_review_decision: gate_decision.as_ref(),
        gate_review_blocking_reason_code: blocking_reason.as_ref(),
        gate_next_action_summary: next_action.as_ref(),
        mark_as_settled: settled,
    })?;
    Ok(Evaluation {
        draft,
        receipt: if qualified {
            receipt.or(receipt_rows.first().map(|r| id(r, "id")).transpose()?)
        } else {
            None
        },
        departure: decision.as_ref().map(|v| id(v, "id")).transpose()?,
        receipt_ids: if qualified {
            receipt_rows
                .iter()
                .map(|r| id(r, "id"))
                .collect::<Result<Vec<_>, _>>()?
        } else {
            Vec::new()
        },
    })
}

pub(super) async fn current(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
) -> Result<Option<Value>, Error> {
    Ok(sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.commission_final_settlement_snapshot s WHERE project_id=$1 AND is_current FOR UPDATE")
        .bind(project).fetch_optional(&mut *session.connection).await?)
}

pub(super) fn references(snapshot: &Value, source: &Source) -> Result<(), Error> {
    let review = source.review.as_ref().ok_or(Error::Internal)?;
    if snapshot["status"] != "active"
        || snapshot["freeze_version_id"] != source.freeze["id"]
        || snapshot["gate_review_record_id"] != review["id"]
        || snapshot["summary_snapshot_id"] != review["summary_snapshot_id"]
    {
        return Err(Error::Conflict(
            "结算材料已变化，须重新取得匹配的业务批准。".into(),
        ));
    }
    if snapshot["source_contract_scope"].is_null() {
        if source.terms.len() > 1 {
            return Err(Error::Conflict(
                "历史结算缺少多合同依据，须先形成真实的新结算批准。".into(),
            ));
        }
    } else if snapshot["source_contract_scope"] != cash::scope(source) {
        return Err(Error::Conflict("结算引用的冻结合同集合已变化。".into()));
    }
    Ok(())
}

pub(super) async fn write(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    actor: Uuid,
    source: &Source,
    evaluation: &Evaluation,
) -> Result<(), Error> {
    let review = source.review.as_ref().ok_or(Error::Internal)?;
    let binding = source.binding.as_ref().ok_or(Error::Internal)?;
    let previous = current(session, project).await?;
    let previous_id = previous.as_ref().map(|v| id(v, "id")).transpose()?;
    let version = previous
        .as_ref()
        .and_then(|v| v["version"].as_i64())
        .map(|v| i32::try_from(v).map_err(|_| Error::Internal))
        .transpose()?
        .unwrap_or(0);
    let now = crate::auth::model::clock_now();
    if let Some(previous) = previous_id {
        sqlx::query("UPDATE poms.commission_final_settlement_snapshot SET is_current=false,status='superseded',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
            .bind(now).bind(actor).bind(previous).execute(&mut *session.connection).await?;
    }
    let snapshot = new_uuid()?;
    let d = &evaluation.draft;
    sqlx::query("INSERT INTO poms.commission_final_settlement_snapshot(id,project_id,freeze_version_id,gate_review_record_id,retention_receipt_record_id,departure_exception_decision_id,version,is_current,final_settlement_status,non_retention_settlement_status,retention_settlement_status,retention_requirement_summary,retention_receipt_summary,departure_exception_summary,baseline_selection_source,tax_impact_summary,tax_impact_pending_amount,data_maturity_level,cost_action_recommendation,current_action_level,referenced_baseline_version,referenced_snapshot_version,summary_package_key,summary_snapshot_id,projection_level,export_policy,generated_at,status,supersedes_id,created_by,updated_by,source_contract_scope,retention_receipt_ids) SELECT $1,$2,$3,r.id,$5,$6,$7,true,$8,$9,$10,$11,$12,$13,b.baseline_selection_source,b.tax_impact_summary,b.tax_impact_pending_amount,b.data_maturity_level,b.cost_action_recommendation,b.current_action_level,b.referenced_baseline_version,b.referenced_snapshot_version,r.summary_package_key,r.summary_snapshot_id,r.projection_level,r.export_policy,$14,'active',$15,$16,$16,$18,$19 FROM poms.operating_signal_gate_binding b JOIN poms.commission_gate_review_record r ON r.binding_id=b.id AND r.id=$4 WHERE b.id=$17")
        .bind(snapshot).bind(project).bind(id(&source.freeze,"id")?).bind(id(review,"id")?).bind(evaluation.receipt).bind(evaluation.departure).bind(next_version(version)?)
        .bind(d.final_settlement_status).bind(d.non_retention_settlement_status).bind(d.retention_settlement_status)
        .bind(d.retention_requirement_summary.as_ref().map(|v|v.to_utf8_lossy())).bind(d.retention_receipt_summary.as_ref().map(|v|v.to_utf8_lossy())).bind(d.departure_exception_summary.as_ref().map(|v|v.to_utf8_lossy()))
        .bind(now).bind(previous_id).bind(actor).bind(id(binding,"id")?).bind(cash::scope(source)).bind(json!(evaluation.receipt_ids)).execute(&mut *session.connection).await?;
    let explanation: Option<(Uuid,i32)>=sqlx::query_as("SELECT id,version FROM poms.commission_rule_explanation_snapshot WHERE project_id=$1 AND is_current FOR UPDATE")
        .bind(project).fetch_optional(&mut *session.connection).await?;
    if let Some((id, _)) = explanation {
        sqlx::query("UPDATE poms.commission_rule_explanation_snapshot SET is_current=false,status='superseded',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
        .bind(now).bind(actor).bind(id).execute(&mut *session.connection).await?;
    }
    let e = &d.rule_explanation;
    sqlx::query("INSERT INTO poms.commission_rule_explanation_snapshot(id,project_id,final_settlement_snapshot_id,version,is_current,current_stage_status,gate_decision_code,blocking_reason_category,blocking_reason_code,blocking_reason_summary,gate_decision_summary,next_action_summary,generated_at,status,supersedes_id,created_by,updated_by) VALUES($1,$2,$3,$4,true,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13,$14,$14)")
        .bind(new_uuid()?).bind(project).bind(snapshot).bind(next_version(explanation.map_or(0,|(_,v)|v))?).bind(e.current_stage_status).bind(e.gate_decision_code).bind(e.blocking_reason_category)
        .bind(e.blocking_reason_code.as_ref().map(|v|v.to_utf8_lossy())).bind(e.blocking_reason_summary.as_ref().map(|v|v.to_utf8_lossy())).bind(e.gate_decision_summary.to_utf8_lossy()).bind(e.next_action_summary.as_ref().map(|v|v.to_utf8_lossy()))
        .bind(now).bind(explanation.map(|(id,_)|id)).bind(actor).execute(&mut *session.connection).await?;
    Ok(())
}

pub(super) async fn refresh(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    actor: Uuid,
) -> Result<(), Error> {
    let Some(snapshot) = current(session, project).await? else {
        return Ok(());
    };
    let source = context::settlement_source(session, project).await?;
    references(&snapshot, &source)?;
    let evaluation = state(session, project, &source).await?;
    write(session, project, actor, &source, &evaluation).await
}

pub(super) async fn state(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    source: &Source,
) -> Result<Evaluation, Error> {
    let pool: Option<String>=sqlx::query_scalar("SELECT commission_pool::text FROM poms.commission_calculation WHERE project_id=$1 AND is_current AND status='effective'")
        .bind(project).fetch_optional(&mut *session.connection).await?;
    let pool = pool.ok_or_else(|| Error::Conflict("当前提成计算尚未确认生效。".into()))?;
    let pool = super::model::amount(&pool)?;
    let balances = cash::balances(session, project, source).await?;
    let nonretention = contract_scope::sum(balances.nonretention.values().copied())?;
    let limit = cash::nonretention_limit(pool, source)?;
    let mut evaluation =
        evaluate(session, project, source, None, None, balances.total >= pool).await?;
    if nonretention < limit {
        evaluation.draft.final_settlement_status = "pending-final-settlement";
        evaluation.draft.non_retention_settlement_status = "pending-non-retention";
        evaluation.draft.retention_settlement_status = "waiting-retention";
        evaluation.draft.rule_explanation = rules::pending_final_rule_explanation();
    }
    Ok(evaluation)
}
