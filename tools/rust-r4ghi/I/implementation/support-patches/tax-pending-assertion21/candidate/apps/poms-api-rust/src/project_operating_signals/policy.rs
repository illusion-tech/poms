//! The frozen eleven rules. No database or caller-controlled risk thresholds.
use crate::{
    contract_support::Error,
    project_operating_common::{hash, model::*},
};
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};

pub const POLICY_VERSION: &str = "r4h-operating-v1";
pub const POLICY_HASH: &str = "7e9cfcedc496bd5d4ffd6fc158371e3db069110798926c63a5156ee4614a1aec";
pub const STAGES: [OperatingGateStage; 4] = [
    OperatingGateStage::First,
    OperatingGateStage::Second,
    OperatingGateStage::Final,
    OperatingGateStage::Retention,
];

fn domain(message: impl Into<String>) -> Error {
    Error::Unprocessable(message.into())
}
pub(crate) fn wire<T: Serialize>(value: &T) -> Result<String, Error> {
    serde_json::to_value(value)
        .map_err(|_| Error::Internal)?
        .as_str()
        .map(str::to_owned)
        .ok_or(Error::Internal)
}
fn named<T: Serialize>(value: &T, expected: &str) -> bool {
    serde_json::to_value(value).is_ok_and(|v| v == expected)
}
pub(crate) fn rank(action: &OperatingSnapshotActionLevel) -> u8 {
    match action {
        OperatingSnapshotActionLevel::Prompt => 0,
        OperatingSnapshotActionLevel::Review => 1,
        OperatingSnapshotActionLevel::Block => 2,
    }
}
pub(crate) fn max_action<'a>(
    actions: impl IntoIterator<Item = &'a OperatingSnapshotActionLevel>,
) -> OperatingSnapshotActionLevel {
    actions
        .into_iter()
        .max_by_key(|a| rank(a))
        .copied()
        .unwrap_or(OperatingSnapshotActionLevel::Prompt)
}
fn actions(
    first: OperatingSnapshotActionLevel,
    later: OperatingSnapshotActionLevel,
) -> BTreeMap<OperatingGateStage, OperatingSnapshotActionLevel> {
    [
        (OperatingGateStage::First, first),
        (OperatingGateStage::Second, later),
        (OperatingGateStage::Final, later),
        (OperatingGateStage::Retention, later),
    ]
    .into_iter()
    .collect()
}

/// Policy rows are deliberately explicit: project severity never populates all
/// gates, and H09/H10 retain their independent first-stage mapping.
type RuleRow = (
    &'static str,
    &'static str,
    OperatingSnapshotActionLevel,
    BTreeMap<OperatingGateStage, OperatingSnapshotActionLevel>,
);
fn row(id: &str) -> Result<RuleRow, Error> {
    use OperatingSnapshotActionLevel::{Block, Prompt, Review};
    Ok(match id {
        "H01" => (
            "missing-hard-evidence",
            "evidence",
            Review,
            actions(Prompt, Block),
        ),
        "H02" => (
            "pending-optional-facts",
            "maturity",
            Review,
            actions(Prompt, Review),
        ),
        "H03" => (
            "low-receipt-ratio",
            "receipt",
            Prompt,
            actions(Prompt, Prompt),
        ),
        "H04" => ("risk-attention", "risk", Review, actions(Prompt, Review)),
        "H05" => ("risk-confirmed", "risk", Block, actions(Review, Block)),
        "H06" => (
            "restatement-pending",
            "restatement",
            Review,
            actions(Review, Block),
        ),
        "H07" => (
            "extreme-ratio",
            "formula",
            Review,
            [
                (OperatingGateStage::First, Review),
                (OperatingGateStage::Second, Review),
                (OperatingGateStage::Final, Block),
                (OperatingGateStage::Retention, Block),
            ]
            .into_iter()
            .collect(),
        ),
        "H08" => (
            "qualitative-materiality-unassessed",
            "manual",
            Review,
            actions(Review, Review),
        ),
        "H09" => (
            "authoritative-cost-block",
            "cost",
            Block,
            actions(Review, Block),
        ),
        "H10" => (
            "authoritative-cost-review",
            "cost",
            Review,
            actions(Prompt, Review),
        ),
        "H11" => ("normal-complete", "risk", Prompt, actions(Prompt, Prompt)),
        _ => return Err(Error::Internal),
    })
}
fn sorted_refs(mut refs: Vec<SourceRef>) -> Vec<SourceRef> {
    refs.sort_by(|a, b| {
        (&a.kind, a.id, a.row_version, &a.payload_hash).cmp(&(
            &b.kind,
            b.id,
            b.row_version,
            &b.payload_hash,
        ))
    });
    refs.dedup_by(|a, b| {
        a.kind == b.kind
            && a.id == b.id
            && a.row_version == b.row_version
            && a.payload_hash == b.payload_hash
    });
    refs
}
fn reason(
    id: &str,
    detail: impl Into<String>,
    refs: Vec<SourceRef>,
) -> Result<OperatingReasonInternal, Error> {
    let (code, category, project_action, stage_actions) = row(id)?;
    let evidence_refs = sorted_refs(refs);
    let detail = detail.into();
    let category = serde_json::from_value(json!(category)).map_err(|_| Error::Internal)?;
    let reason_id = hash::canonical_hash(
        &json!({"policyVersion":POLICY_VERSION,"policyHash":POLICY_HASH,"ruleId":id,"code":code,"evidenceRefs":evidence_refs,"detail":detail}),
    )?;
    Ok(OperatingReasonInternal {
        reason_id,
        code: code.into(),
        category,
        rule_id: id.into(),
        project_action,
        stage_actions,
        is_primary_project_reason: false,
        primary_stages: vec![],
        detail,
        evidence_refs,
    })
}

fn all_refs(context: &OperatingSourceContext) -> Result<Vec<SourceRef>, Error> {
    // Only exact typed SourceRef-shaped members of the frozen context qualify.
    // Never resolve arbitrary user kinds/tables or accept an invented evidence ID.
    fn walk(value: &Value, output: &mut Vec<SourceRef>) -> Result<(), Error> {
        match value {
            Value::Object(fields)
                if fields.len() == 4
                    && ["kind", "id", "rowVersion", "payloadHash"]
                        .iter()
                        .all(|key| fields.contains_key(*key)) =>
            {
                output.push(serde_json::from_value(value.clone()).map_err(|_| Error::Internal)?);
            }
            Value::Object(fields) => {
                for child in fields.values() {
                    walk(child, output)?;
                }
            }
            Value::Array(values) => {
                for child in values {
                    walk(child, output)?;
                }
            }
            _ => {}
        }
        Ok(())
    }
    let mut refs = vec![];
    walk(
        &serde_json::to_value(context).map_err(|_| Error::Internal)?,
        &mut refs,
    )?;
    Ok(sorted_refs(refs))
}
pub(crate) fn frozen_source_refs(
    context: &OperatingSourceContext,
) -> Result<Vec<SourceRef>, Error> {
    all_refs(context)
}

fn amount(value: &Amount, field: &str) -> Result<Option<i128>, Error> {
    if named(&value.knowledge, "unknown") {
        if value.value.is_some()
            || value
                .unknown_reason_code
                .as_deref()
                .is_none_or(str::is_empty)
            || value.zero_proof.is_some()
        {
            return Err(domain("Invalid unknown monetary assertion"));
        }
        return Ok(None);
    }
    if !named(&value.knowledge, "known") || value.unknown_reason_code.is_some() {
        return Err(domain("Invalid monetary knowledge assertion"));
    }
    let text = value
        .value
        .as_deref()
        .ok_or_else(|| domain("Known amount requires an exact value"))?;
    let parsed = OperatingMoneyCents::parse_exact(text, field)?;
    if parsed.decimal_string() != text {
        return Err(domain(
            "Frozen monetary values require canonical exact cents",
        ));
    }
    let cents = parsed.cents();
    if cents == 0 && value.zero_proof.is_none() {
        return Err(domain("Known zero requires factual zero proof"));
    }
    Ok(Some(cents))
}
fn bounded(value: i128, field: &str) -> Result<i128, Error> {
    Ok(OperatingMoneyCents::from_cents(value, field)?.cents())
}
fn sum<'a>(
    values: impl IntoIterator<Item = &'a Amount>,
    field: &str,
) -> Result<Option<i128>, Error> {
    let mut total = 0_i128;
    let mut known = true;
    for value in values {
        match amount(value, field)? {
            Some(v) => {
                total = total.checked_add(v).ok_or_else(|| {
                    crate::project_operating_common::scalars::capacity_error(field)
                })?
            }
            None => known = false,
        }
    }
    if known {
        Ok(Some(bounded(total, field)?))
    } else {
        Ok(None)
    }
}
fn difference(a: Option<i128>, b: Option<i128>, field: &str) -> Result<Option<i128>, Error> {
    match (a, b) {
        (Some(a), Some(b)) => Ok(Some(bounded(
            a.checked_sub(b)
                .ok_or_else(|| crate::project_operating_common::scalars::capacity_error(field))?,
            field,
        )?)),
        _ => Ok(None),
    }
}
fn assert_amount(actual: &Amount, expected: Option<i128>, field: &str) -> Result<(), Error> {
    if amount(actual, field)? != expected {
        return Err(domain(format!(
            "Frozen metric assertion differs from source facts: {field}"
        )));
    }
    Ok(())
}
fn assert_ratio(
    actual: &Ratio,
    numerator: Option<i128>,
    denominator: Option<i128>,
    field: &str,
) -> Result<(), Error> {
    let expected = match (numerator, denominator) {
        (Some(n), Some(d)) if d != 0 => Some(ratio6(n, d)?),
        _ => None,
    };
    if actual.value != expected || named(&actual.knowledge, "known") != expected.is_some() {
        return Err(domain(format!(
            "Frozen metric assertion differs from exact source ratio: {field}"
        )));
    }
    if denominator == Some(0) && actual.reason_code.as_deref() != Some("zero-denominator") {
        return Err(domain("Zero denominator requires explicit reason"));
    }
    if (numerator.is_none() || denominator.is_none())
        && actual.reason_code.as_deref() != Some("missing-evidence")
    {
        return Err(domain("Unknown ratio requires missing-evidence reason"));
    }
    Ok(())
}

/// Exact unrounded integers determine every boundary. Six-place rounding is
/// for display only and is half away from zero, including very large ratios.
pub(crate) fn ratio6(numerator: i128, denominator: i128) -> Result<String, Error> {
    if denominator == 0 {
        return Err(domain("Ratio denominator is zero"));
    }
    let scaled = numerator
        .checked_mul(1_000_000)
        .ok_or_else(|| crate::project_operating_common::scalars::capacity_error("ratio"))?;
    let mut q = scaled / denominator;
    let r = scaled % denominator;
    if r.unsigned_abs()
        .checked_mul(2)
        .ok_or_else(|| crate::project_operating_common::scalars::capacity_error("ratio"))?
        >= denominator.unsigned_abs()
    {
        q = q
            .checked_add(if (numerator < 0) ^ (denominator < 0) {
                -1
            } else {
                1
            })
            .ok_or_else(|| crate::project_operating_common::scalars::capacity_error("ratio"))?;
    }
    let sign = if q < 0 { "-" } else { "" };
    let value = q.unsigned_abs();
    Ok(format!(
        "{sign}{}.{:06}",
        value / 1_000_000,
        value % 1_000_000
    ))
}

/// Independent assertion verification consumes only G's frozen source model.
/// It never recollects live SQL sources or invents another accounting model.
pub(crate) fn assert_metrics(context: &OperatingSourceContext) -> Result<(), Error> {
    fn component(triple: &Triple, index: u8) -> &Amount {
        match index {
            0 => &triple.net,
            1 => &triple.tax,
            _ => &triple.gross,
        }
    }
    if context
        .contracts
        .iter()
        .map(|c| c.contract_ref.id)
        .collect::<BTreeSet<_>>()
        .len()
        != context.contracts.len()
        || context
            .receipts
            .iter()
            .map(|r| r.receipt_ref.id)
            .collect::<BTreeSet<_>>()
            .len()
            != context.receipts.len()
    {
        return Err(domain("Duplicate immutable contract or receipt member"));
    }
    let included_keys = context
        .costs
        .iter()
        .filter(|c| c.classification.decision.as_str() == "include")
        .map(|c| c.canonical_accumulation_key.as_str())
        .collect::<Vec<_>>();
    if included_keys.iter().copied().collect::<BTreeSet<_>>().len() != included_keys.len() {
        return Err(domain(
            "A primary economic unit cannot be accumulated twice",
        ));
    }
    for receipt in &context.receipts {
        if amount(&receipt.cash_gross, "receiptCashGross")?
            != amount(&receipt.amounts.gross, "receiptAccountingGross")?
        {
            return Err(domain(
                "Receipt progress must use the exact confirmed gross cash layer",
            ));
        }
    }
    for cost in context
        .costs
        .iter()
        .filter(|c| c.recognition_role.as_str() == "allocation-share")
    {
        let result = cost
            .allocation_result_ref
            .as_ref()
            .ok_or_else(|| domain("Allocation share requires its actual frozen result"))?;
        let actual = context
            .allocations
            .iter()
            .find(|a| {
                a.result_ref.id == result.id
                    && a.result_ref.row_version == result.row_version
                    && a.result_ref.payload_hash == result.payload_hash
            })
            .ok_or_else(|| domain("Allocation result is not a member of the frozen context"))?;
        for index in 0..3 {
            if amount(component(&cost.amounts, index), "allocationShare")?
                != amount(
                    component(&actual.allocated_amounts, index),
                    "allocationResult",
                )?
            {
                return Err(domain(
                    "Allocation share differs from actual F frozen cents",
                ));
            }
        }
    }
    for triple in context
        .contracts
        .iter()
        .map(|c| &c.amounts)
        .chain(context.receipts.iter().map(|r| &r.amounts))
        .chain(context.costs.iter().map(|c| &c.amounts))
        .chain(context.allocations.iter().map(|a| &a.allocated_amounts))
    {
        let net = amount(&triple.net, "source.net")?;
        let tax = amount(&triple.tax, "source.tax")?;
        let gross = amount(&triple.gross, "source.gross")?;
        if let (Some(net), Some(tax), Some(gross)) = (net, tax, gross) {
            if net.checked_add(tax) != Some(gross) {
                return Err(domain("Source gross must equal exact net plus tax"));
            }
            if net < 0 || tax < 0 || gross < 0 {
                return Err(domain("Source economic totals must be nonnegative"));
            }
        }
    }
    let m = &context.metrics;
    if context.currency.is_none() {
        for triple in [
            &m.effective_contract_amounts,
            &m.confirmed_receipt_amounts,
            &m.included_cost_amounts,
            &m.excluded_cost_amounts,
        ] {
            if triple.currency.is_some() {
                return Err(domain(
                    "Unproven or multiple currency cannot label an aggregate with one currency",
                ));
            }
            for index in 0..3 {
                assert_amount(
                    component(triple, index),
                    None,
                    "currencyUnavailableAggregate",
                )?;
            }
        }
        for value in [
            &m.tax_pending_amount,
            &m.cost_variance_net,
            &m.gross_margin_net,
        ] {
            assert_amount(value, None, "currencyUnavailableMetric")?;
        }
        assert_ratio(&m.gross_margin_rate, None, None, "grossMarginRate")?;
        assert_ratio(&m.receipt_ratio, None, None, "receiptRatio")?;
        return Ok(());
    }
    let expected_currency = context.currency.as_deref().ok_or(Error::Internal)?;
    if context
        .contracts
        .iter()
        .map(|c| &c.amounts)
        .chain(context.receipts.iter().map(|r| &r.amounts))
        .chain(
            context
                .costs
                .iter()
                .filter(|c| c.classification.decision.as_str() == "include")
                .map(|c| &c.amounts),
        )
        .any(|amounts| {
            amounts
                .currency
                .as_deref()
                .is_some_and(|currency| currency != expected_currency)
        })
    {
        return Err(domain(
            "Operating metrics cannot combine different source currencies",
        ));
    }
    for (label, index) in [("net", 0), ("tax", 1), ("gross", 2)] {
        let contracts = if context.contracts.is_empty() {
            None
        } else {
            sum(
                context
                    .contracts
                    .iter()
                    .map(|c| component(&c.amounts, index)),
                &format!("effectiveContractAmounts.{label}"),
            )?
        };
        let closed = named(&context.scope.collection_status, "closed");
        let receipts = if context.receipts.is_empty() && !closed {
            None
        } else {
            sum(
                context
                    .receipts
                    .iter()
                    .map(|r| component(&r.amounts, index)),
                &format!("confirmedReceiptAmounts.{label}"),
            )?
        };
        let included = if context.costs.is_empty() && !closed {
            None
        } else {
            sum(
                context
                    .costs
                    .iter()
                    .filter(|c| named(&c.classification.decision, "include"))
                    .map(|c| component(&c.amounts, index)),
                &format!("includedCostAmounts.{label}"),
            )?
        };
        let excluded = if context.costs.is_empty() && !closed {
            None
        } else {
            sum(
                context
                    .costs
                    .iter()
                    .filter(|c| named(&c.classification.decision, "exclude"))
                    .map(|c| component(&c.amounts, index)),
                &format!("excludedCostAmounts.{label}"),
            )?
        };
        // A recognized nondeductible adjustment is separate only when the real
        // F overlap key proves it is absent from every included principal.
        let adjustments = if index == 0 || index == 2 {
            sum(
                context
                    .tax_treatments
                    .iter()
                    .map(|t| &t.recognized_adjustment_net),
                "recognizedAdjustmentNet",
            )?
        } else {
            Some(0)
        };
        let included = match (included, adjustments) {
            (Some(a), Some(b)) => Some(bounded(
                a.checked_add(b).ok_or_else(|| {
                    crate::project_operating_common::scalars::capacity_error("includedCostAmounts")
                })?,
                "includedCostAmounts",
            )?),
            _ => None,
        };
        assert_amount(
            component(&m.effective_contract_amounts, index),
            contracts,
            &format!("effectiveContractAmounts.{label}"),
        )?;
        assert_amount(
            component(&m.confirmed_receipt_amounts, index),
            receipts,
            &format!("confirmedReceiptAmounts.{label}"),
        )?;
        assert_amount(
            component(&m.included_cost_amounts, index),
            included,
            &format!("includedCostAmounts.{label}"),
        )?;
        assert_amount(
            component(&m.excluded_cost_amounts, index),
            excluded,
            &format!("excludedCostAmounts.{label}"),
        )?;
    }
    // No assessed tax member does not prove zero when a frozen cost carries
    // nonzero or unknown tax. Replay G's source-knowledge distinction, rather
    // than turning an empty assessment sum into an invented known zero.
    let mut tax_assessment_missing = false;
    if context.tax_treatments.is_empty() {
        for cost in &context.costs {
            if amount(&cost.amounts.tax, "source.cost.tax")?.is_none_or(|tax| tax != 0) {
                tax_assessment_missing = true;
            }
        }
    }
    let expected_pending_tax = if tax_assessment_missing {
        None
    } else {
        sum(
            context.tax_treatments.iter().map(|t| &t.pending_amount),
            "taxPendingAmount",
        )?
    };
    assert_amount(
        &m.tax_pending_amount,
        expected_pending_tax,
        "taxPendingAmount",
    )?;
    if tax_assessment_missing
        && m.tax_pending_amount.unknown_reason_code.as_deref() != Some("tax-assessment-missing")
    {
        return Err(domain(
            "Unassessed source tax requires the tax-assessment-missing reason",
        ));
    }
    let receipts = amount(&m.confirmed_receipt_amounts.net, "confirmedReceiptNet")?;
    let included = amount(&m.included_cost_amounts.net, "includedCostNet")?;
    let baseline = amount(
        &context.baseline.current_effective_net_cost,
        "currentEffectiveNetCost",
    )?;
    assert_amount(
        &m.gross_margin_net,
        difference(receipts, included, "grossMarginNet")?,
        "grossMarginNet",
    )?;
    assert_amount(
        &m.cost_variance_net,
        difference(included, baseline, "costVarianceNet")?,
        "costVarianceNet",
    )?;
    assert_ratio(
        &m.gross_margin_rate,
        amount(&m.gross_margin_net, "grossMarginNet")?,
        receipts,
        "grossMarginRate",
    )?;
    assert_ratio(
        &m.receipt_ratio,
        amount(&m.confirmed_receipt_amounts.gross, "confirmedReceiptGross")?,
        amount(
            &m.effective_contract_amounts.gross,
            "effectiveContractGross",
        )?,
        "receiptRatio",
    )?;
    Ok(())
}

fn hard_missing(context: &OperatingSourceContext) -> bool {
    !named(&context.formal_eligibility.status, "eligible")
        || context.contracts.is_empty()
        || context.receipts.is_empty()
        || context.baseline.baseline_package_ref.is_none()
        || context.baseline.original_technical_package_ref.is_none()
        || !context.scope.has_explicit_cost_scope_evidence
        || context.scope.unclassified_cost_count > 0
        || [
            &context.baseline.original_net_cost,
            &context.baseline.current_effective_net_cost,
            &context.metrics.effective_contract_amounts.net,
            &context.metrics.effective_contract_amounts.gross,
            &context.metrics.confirmed_receipt_amounts.gross,
            &context.metrics.included_cost_amounts.gross,
        ]
        .iter()
        .any(|a| a.knowledge != Knowledge::Known)
        || context
            .costs
            .iter()
            .filter(|c| c.classification.decision.as_str() == "include")
            .any(|c| {
                c.stage_evidence_state.as_str() != "verified"
                    || (c.recognition_role.as_str() == "direct-source"
                        && (c.cost_ref.is_none()
                            || c.stage_attribution_ref.is_none()
                            || c.attributed_stage.is_none()
                            || !c
                                .record_status
                                .as_ref()
                                .is_some_and(|s| ["confirmed", "included"].contains(&s.as_str()))))
                    || (c.recognition_role.as_str() == "allocation-share"
                        && (c.allocation_result_ref.is_none()
                            || c.allocation_source_members.is_empty()
                            || c.allocation_source_members.iter().any(|m| {
                                m.stage_attribution_ref.is_none() || m.attributed_stage.is_none()
                            })))
                    || ["tax-support", "evidence-only"].contains(&c.recognition_role.as_str())
            })
        || context.receipts.iter().any(|r| {
            r.accounting_basis_ref.is_none()
                || r.contract_term_snapshot_ref.is_none()
                || named(&r.basis_origin, "missing")
        })
        || context
            .pending_facts
            .iter()
            .any(|p| p.required_for_formal_accounting)
        || !context.unclassified_source_refs.is_empty()
        || !named(
            &context.metrics.confirmed_receipt_amounts.net.knowledge,
            "known",
        )
        || !named(
            &context.metrics.included_cost_amounts.net.knowledge,
            "known",
        )
}
fn optional_pending(context: &OperatingSourceContext) -> bool {
    !named(&context.scope.collection_status, "closed")
        || !named(&context.metrics.tax_pending_amount.knowledge, "known")
        || !context.pending_facts.is_empty()
        || context.scope.unmapped_cost_count > 0
        || context.scope.pending_cost_count > 0
        || context.scope.unclassified_cost_count > 0
        || context
            .allocations
            .iter()
            .any(|a| !named(&a.status, "frozen"))
        || context.tax_treatments.iter().any(|t| {
            named(&t.deductibility, "pending")
                || !named(&t.pending_amount.knowledge, "known")
                || t.pending_amount.value.as_deref() != Some("0.00")
        })
        || !named(&context.snapshot.restatement_status, "not-applicable")
            && !named(&context.snapshot.restatement_status, "confirmed")
}
fn low_receipts(context: &OperatingSourceContext) -> Result<bool, Error> {
    match (
        amount(
            &context.metrics.confirmed_receipt_amounts.gross,
            "confirmedReceiptGross",
        )?,
        amount(
            &context.metrics.effective_contract_amounts.gross,
            "effectiveContractGross",
        )?,
    ) {
        (Some(receipts), Some(contract)) if contract > 0 => {
            Ok(receipts.checked_mul(5).ok_or_else(|| {
                crate::project_operating_common::scalars::capacity_error("receiptRatio")
            })? < contract)
        }
        _ => Ok(false),
    }
}
fn metric_knowledge(
    context: &OperatingSourceContext,
    maturity: &OperatingDataMaturityLevel,
) -> Result<OperatingMetricKnowledge, Error> {
    let m = &context.metrics;
    let low = low_receipts(context)?;
    let stable = named(maturity, "mature") && !low;
    let rate_known = named(&m.gross_margin_rate.knowledge, "known");
    let reason = if !rate_known {
        m.gross_margin_rate.reason_code.clone()
    } else if low {
        Some("low-receipt-ratio".into())
    } else if !stable {
        Some("unstable".into())
    } else {
        None
    };
    serde_json::from_value(json!({"confirmedReceipts":m.confirmed_receipt_amounts.net.knowledge,"includedCost":m.included_cost_amounts.net.knowledge,"taxPending":m.tax_pending_amount.knowledge,"grossMargin":m.gross_margin_net.knowledge,"grossMarginRate":m.gross_margin_rate.knowledge,"grossMarginRateReason":reason,"ratiosStable":stable,"grossMarginRateUse":if !rate_known {"unavailable"} else if stable {"business-judgment"}else{"observation-only"}})).map_err(|_|Error::Internal)
}

pub fn derive_cost_readiness(context: &OperatingSourceContext) -> Result<CostReadiness, Error> {
    assert_metrics(context)?;
    let mut reasons = vec![];
    let maturity = if hard_missing(context) {
        OperatingDataMaturityLevel::Insufficient
    } else if optional_pending(context) {
        OperatingDataMaturityLevel::Preliminary
    } else {
        OperatingDataMaturityLevel::Mature
    };
    if named(&maturity, "insufficient") {
        reasons.push(reason(
            "H01",
            "必要合同、回款依据或显式成本范围证据缺失",
            context.formal_eligibility.missing_evidence_refs.clone(),
        )?);
    }
    if optional_pending(context) {
        reasons.push(reason(
            "H02",
            "待确认、未映射、分摊或税务事实尚未闭合",
            context
                .pending_facts
                .iter()
                .map(|p| p.source_ref.clone())
                .collect(),
        )?);
    }
    for constraint in &context.upstream_cost_constraints {
        if named(&constraint.action, "block") {
            reasons.push(reason(
                "H09",
                format!("{}:{}", constraint.rule_id, constraint.reason_code),
                constraint.basis_refs.clone(),
            )?);
        }
        if named(&constraint.action, "review") {
            reasons.push(reason(
                "H10",
                format!("{}:{}", constraint.rule_id, constraint.reason_code),
                constraint.basis_refs.clone(),
            )?);
        }
    }
    let cost_action_recommendation = max_action(reasons.iter().map(|r| &r.project_action));
    Ok(CostReadiness {
        known_metric_states: metric_knowledge(context, &maturity)?,
        data_maturity_level: maturity,
        cost_action_recommendation,
        reason_items: reasons,
        formal_eligibility: context.formal_eligibility.clone(),
    })
}

pub fn derive_operating_evaluation(
    context: &OperatingSourceContext,
    review: Option<&VerifiedMaterialityReview>,
) -> Result<OperatingEvaluationDraft, Error> {
    if wire(&context.policy_version)? != POLICY_VERSION
        || context.policy_hash.as_str() != POLICY_HASH
        || hash::source_hash(context)?.as_str() != context.source_hash
    {
        return Err(domain("Frozen source or policy hash mismatch"));
    }
    let readiness = derive_cost_readiness(context)?;
    let mut reasons = readiness.reason_items.clone();
    let refs = all_refs(context)?;
    let low = low_receipts(context)?;
    let margin = amount(&context.metrics.gross_margin_net, "grossMarginNet")?;
    let receipt_net = amount(
        &context.metrics.confirmed_receipt_amounts.net,
        "confirmedReceiptNet",
    )?;
    let variance = amount(&context.metrics.cost_variance_net, "costVarianceNet")?;
    let mature = named(&readiness.data_maturity_level, "mature");
    let auto_risk = matches!((margin,receipt_net),(Some(m),Some(r)) if m<0&&r>0) && mature && !low;
    let qualitative_negative = margin.is_some_and(|m| m < 0) && !auto_risk;
    let qualitative_pending = context
        .pending_facts
        .iter()
        .any(|p| !p.required_for_formal_accounting)
        || context
            .tax_treatments
            .iter()
            .any(|t| named(&t.deductibility, "pending"));
    let qualitative =
        qualitative_negative || variance.is_some_and(|v| v > 0) || qualitative_pending;
    let system_risk = if auto_risk {
        OperatingRiskLevel::Risk
    } else if qualitative || !mature || margin.is_none() {
        OperatingRiskLevel::Unknown
    } else {
        OperatingRiskLevel::Normal
    };
    let system_signal = match system_risk {
        OperatingRiskLevel::Risk => OperatingSignalLevel::Alert,
        OperatingRiskLevel::Attention => OperatingSignalLevel::Attention,
        OperatingRiskLevel::Unknown => OperatingSignalLevel::Unknown,
        OperatingRiskLevel::Normal => OperatingSignalLevel::Normal,
    };
    if low {
        reasons.push(reason(
            "H03",
            "确认含税回款占有效含税合同额严格低于20%；毛利比例仅作观察",
            context
                .receipts
                .iter()
                .map(|r| r.receipt_ref.clone())
                .chain(context.contracts.iter().map(|c| c.contract_ref.clone()))
                .collect(),
        )?);
    }
    if auto_risk {
        reasons.push(reason(
            "H05",
            "已知成熟口径且回款比例至少20%时确认负毛利",
            refs.clone(),
        )?);
    }
    if named(&context.snapshot.restatement_status, "pending")
        || context
            .pending_facts
            .iter()
            .any(|p| named(&p.kind, "restatement"))
    {
        reasons.push(reason(
            "H06",
            "重述事项尚未完成",
            context
                .pending_facts
                .iter()
                .filter(|p| named(&p.kind, "restatement"))
                .map(|p| p.source_ref.clone())
                .collect(),
        )?);
    }
    if matches!((margin,receipt_net),(Some(m),Some(r)) if r>0&&(m < -r || m>r)) {
        reasons.push(reason(
            "H07",
            "精确毛利比例严格小于-1或大于1",
            refs.clone(),
        )?);
    }
    let mut effective_risk = system_risk;
    if qualitative {
        if let Some(overlay) = review {
            let overlay_hash = hash::canonical_hash(
                &json!({"sourceHash":overlay.source_hash,"evaluationHashBefore":overlay.evaluation_hash_before,"policyHash":overlay.policy_hash,"actorId":overlay.actor_id,"riskDecision":overlay.risk_decision,"issueCodes":overlay.issue_codes,"evidenceRefs":overlay.evidence_refs,"rationale":overlay.rationale}),
            )?;
            if overlay.source_hash.as_str() != context.source_hash
                || overlay.policy_hash.as_str() != POLICY_HASH
                || overlay.risk_decision == OperatingRiskLevel::Unknown
                || overlay.issue_codes != vec!["qualitative-materiality-unassessed".to_owned()]
                || overlay.rationale.trim().is_empty()
                || overlay.evidence_refs.is_empty()
                || overlay.evidence_refs.iter().any(|r| {
                    !refs.iter().any(|f| {
                        f.kind == r.kind
                            && f.id == r.id
                            && f.row_version == r.row_version
                            && f.payload_hash == r.payload_hash
                    })
                })
                || overlay_hash != overlay.overlay_hash
            {
                return Err(domain(
                    "Materiality overlay is not verified for this exact source",
                ));
            }
            if !auto_risk {
                effective_risk = overlay.risk_decision;
            }
            match effective_risk {
                OperatingRiskLevel::Attention => reasons.push(reason(
                    "H04",
                    "人工根据冻结证据确认质性关注事项",
                    overlay.evidence_refs.clone(),
                )?),
                OperatingRiskLevel::Risk if !auto_risk => reasons.push(reason(
                    "H05",
                    "人工根据冻结证据确认质性风险事项",
                    overlay.evidence_refs.clone(),
                )?),
                _ => {}
            }
        } else {
            reasons.push(reason(
                "H08",
                "观察负毛利、不利成本偏差或待确认影响的重大性尚待人工质性判断",
                refs.clone(),
            )?);
        }
    } else if review.is_some() {
        return Err(domain(
            "No current qualitative issue is available for manual override",
        ));
    }
    if effective_risk == OperatingRiskLevel::Normal && !mature {
        effective_risk = OperatingRiskLevel::Unknown;
    }
    let effective_signal = match effective_risk {
        OperatingRiskLevel::Risk => OperatingSignalLevel::Alert,
        OperatingRiskLevel::Attention => OperatingSignalLevel::Attention,
        OperatingRiskLevel::Unknown => OperatingSignalLevel::Unknown,
        OperatingRiskLevel::Normal => OperatingSignalLevel::Normal,
    };
    if reasons.is_empty() && effective_risk == OperatingRiskLevel::Normal {
        reasons.push(reason(
            "H11",
            "当前显式口径事实完整且没有未解决的风险或质性事项",
            refs,
        )?);
    }
    let current_action_level = max_action(
        reasons
            .iter()
            .map(|r| &r.project_action)
            .chain([&readiness.cost_action_recommendation]),
    );
    let mut stage_drafts = BTreeMap::new();
    let system_drafts = if review.is_some() {
        Some(derive_operating_evaluation(context, None)?.four_stage_drafts)
    } else {
        None
    };
    for stage in STAGES {
        let action = max_action(reasons.iter().filter_map(|r| r.stage_actions.get(&stage)));
        let system_action = system_drafts
            .as_ref()
            .and_then(|drafts| drafts.get(&stage))
            .map(|d| d.system_action)
            .unwrap_or(action);
        stage_drafts.insert(
            stage,
            OperatingGateDraft {
                stage,
                system_action,
                effective_action: action,
                reason_ids: vec![],
                primary_reason_ids: vec![],
            },
        );
    }
    for item in &mut reasons {
        item.is_primary_project_reason = rank(&item.project_action) == rank(&current_action_level);
        item.primary_stages = STAGES
            .into_iter()
            .filter(|s| {
                item.stage_actions
                    .get(s)
                    .zip(stage_drafts.get(s))
                    .is_some_and(|(a, d)| rank(a) == rank(&d.effective_action))
            })
            .collect();
    }
    let mut ordered = reasons
        .into_iter()
        .map(|reason| {
            Ok((
                reason.code.clone(),
                hash::canonical_hash(&reason.evidence_refs)?,
                reason,
            ))
        })
        .collect::<Result<Vec<_>, Error>>()?;
    ordered.sort_by(|a, b| (&a.0, &a.1).cmp(&(&b.0, &b.1)));
    let reasons = ordered
        .into_iter()
        .map(|(_, _, reason)| reason)
        .collect::<Vec<_>>();
    for (stage, draft) in &mut stage_drafts {
        draft.reason_ids = reasons.iter().map(|r| r.reason_id.clone()).collect();
        draft.primary_reason_ids = reasons
            .iter()
            .filter(|r| r.primary_stages.contains(stage))
            .map(|r| r.reason_id.clone())
            .collect();
    }
    let certification = if named(&context.formal_eligibility.status, "eligible") {
        OperatingEvaluationCertification::Verified
    } else {
        OperatingEvaluationCertification::MissingEvidence
    };
    let evaluation_status = if certification != OperatingEvaluationCertification::Verified {
        OperatingEvaluationStatus::MissingEvidence
    } else if effective_risk == OperatingRiskLevel::Unknown
        || reasons.iter().any(|r| r.rule_id == "H08")
    {
        OperatingEvaluationStatus::ManualReviewRequired
    } else {
        OperatingEvaluationStatus::Complete
    };
    let ratio_use = readiness.known_metric_states.gross_margin_rate_use;
    let normalized = json!({"costReadiness":readiness,"systemSignalLevel":system_signal,"systemRiskLevel":system_risk,"effectiveSignalLevel":effective_signal,"effectiveRiskLevel":effective_risk,"currentActionLevel":current_action_level,"fourStageDrafts":stage_drafts,"allReasons":reasons,"ratioUse":ratio_use,"evaluationStatus":evaluation_status,"certification":certification});
    let evaluation_hash = hash::canonical_hash(
        &json!({"sourceHash":context.source_hash,"policyVersion":POLICY_VERSION,"policyHash":POLICY_HASH,"normalizedDerivedOutput":normalized,"verifiedReviewOverlayHash":review.map(|r|&r.overlay_hash)}),
    )?;
    Ok(OperatingEvaluationDraft {
        cost_readiness: readiness,
        system_signal_level: system_signal,
        system_risk_level: system_risk,
        effective_signal_level: effective_signal,
        effective_risk_level: effective_risk,
        current_action_level,
        four_stage_drafts: stage_drafts,
        all_reasons: reasons,
        ratio_use,
        evaluation_status,
        certification,
        evaluation_hash,
    })
}
