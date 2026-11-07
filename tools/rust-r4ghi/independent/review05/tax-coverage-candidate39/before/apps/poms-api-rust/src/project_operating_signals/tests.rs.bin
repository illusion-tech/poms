//! Synthetic pure-policy regression fixtures. These do not certify PG/HTTP.
#![allow(clippy::expect_used)]
use super::policy::*;
use crate::{
    contract_support::Error,
    project_operating_common::{hash, model::*},
};
use serde_json::{Value, json};

fn source(kind: &str, n: u128) -> Value {
    json!({"kind":kind,"id":uuid::Uuid::from_u128(n),"rowVersion":1,"payloadHash":"1".repeat(64)})
}
fn money(n: i128) -> String {
    OperatingMoneyCents::from_cents(n, "fixture")
        .expect("bounded fixture")
        .decimal_string()
}
fn amount(n: i128) -> Value {
    json!({"knowledge":"known","value":money(n),"unknownReasonCode":null,"basisRefs":[source("FixtureFact",99)],"zeroProof":if n==0 {Some("sum-known-members-zero")}else{None}})
}
fn unknown() -> Value {
    json!({"knowledge":"unknown","value":null,"unknownReasonCode":"pending-evidence","basisRefs":[source("TaxTreatment",77)],"zeroProof":null})
}
fn triple(n: i128) -> Value {
    json!({"currency":"CNY","gross":amount(n),"net":amount(n),"tax":amount(0)})
}
fn ratio(n: i128, d: i128) -> Value {
    if d == 0 {
        json!({"knowledge":"unknown","value":null,"reasonCode":"zero-denominator"})
    } else {
        json!({"knowledge":"known","value":ratio6(n,d).expect("fixture ratio"),"reasonCode":null})
    }
}
fn refresh(context: &mut OperatingSourceContext) {
    context.source_hash = hash::source_hash(context)
        .expect("factual hash")
        .as_str()
        .into();
}
fn fixture(contract: i128, receipt: i128, cost: i128, baseline: i128) -> OperatingSourceContext {
    let mut context:OperatingSourceContext=serde_json::from_value(json!({
        "schemaVersion":1,"producerVersion":1,"policyVersion":POLICY_VERSION,"policyHash":POLICY_HASH,
        "contextId":uuid::Uuid::from_u128(100),"projectId":uuid::Uuid::from_u128(101),"currency":"CNY","sourceHash":"0".repeat(64),"scopeHash":"2".repeat(64),
        "formalEligibility":{"status":"eligible","blockingReasonCodes":[],"missingEvidenceRefs":[]},
        "snapshot":{"id":uuid::Uuid::from_u128(102),"rowVersion":1,"version":"1","mode":"realtime","snapshotAt":"2026-11-06T00:00:00Z","knowledgeCutoff":"2026-11-06T00:00:00Z","sourceWindowStart":null,"sourceWindowEnd":null,"periodKey":null,"businessTimezone":"Asia/Hong_Kong","supersedesSnapshotId":null,"periodEndSnapshotRef":null,"restatementRef":null,"restatesSnapshotRef":null,"restatedSnapshotRef":null,"restatementStatus":"not-applicable"},
        "baseline":{"baselinePackageRef":source("OperatingBaselinePackage",1),"selectionSource":"original","originalTechnicalPackageRef":source("ProjectTechnicalCostPackage",2),"handoverRef":null,"handoverRebaselineRef":null,"approvedChangeRefs":[],"referencedBaselineVersion":"1","originalNetCost":amount(baseline),"currentEffectiveNetCost":amount(baseline)},
        "contracts":[{"contractRef":source("Contract",3),"effectiveTermSnapshotRef":source("ContractTermSnapshot",4),"preparationRef":source("ContractTermPreparation",5),"approvalBindingRef":source("CommercialReleaseBaseline",6),"amounts":triple(contract),"originalEstimatePackageRef":source("ProjectTechnicalCostPackage",2),"memberRole":"main"}],
        "receipts":[{"receiptRef":source("ReceiptRecord",7),"contractId":uuid::Uuid::from_u128(3),"status":"confirmed","confirmedAt":"2026-11-05T00:00:00Z","cashGross":amount(receipt),"accountingBasisRef":source("ReceiptAccountingBasis",8),"contractTermSnapshotRef":source("ContractTermSnapshot",4),"basisOrigin":"confirmation","legacyCorrectionRef":null,"amounts":triple(receipt)}],
        "costs":[{"costRef":source("ProjectActualCostRecord",9),"sourceRef":source("ExpenseRecord",10),"sourceType":"expense-record","canonicalAccumulationKey":"expense:10","costType":"expense","recognitionRole":"direct-source","classification":{"decisionId":uuid::Uuid::from_u128(11),"rowVersion":1,"decision":"include","reasonCode":"actual-economic-cost","reasonText":"actual classified source","decidedBy":uuid::Uuid::from_u128(12),"decidedAt":"2026-11-05T00:00:00Z","evidenceHash":"3".repeat(64)},"stageAttributionRef":source("ProjectCostStageAttribution",13),"attributedStage":"execution","businessDate":"2026-11-05","amounts":triple(cost),"allocationResultRef":null,"taxTreatmentRefs":[],"governanceEvidenceRefs":[source("CostGovernanceEvidence",14)],"containsLabor":"no","recordStatus":"included","stageEvidenceState":"verified","sourceChainKey":"expense:10","primaryCostRef":null,"allocationSourceSetHash":null,"sourceLifecycleStatus":"confirmed","allocationSourceMembers":[]}],
        "allocations":[],"taxTreatments":[],"pendingFacts":[],"unclassifiedSourceRefs":[],"upstreamCostConstraints":[],
        "scope":{"collectionStatus":"closed","collectionQueryVersion":"r4g-operating-v1","scopeInventoryHash":"4".repeat(64),"registeredReceiptCount":1,"confirmedReceiptCount":1,"registeredCostCount":1,"includedCostCount":1,"excludedCostCount":0,"unclassifiedCostCount":0,"pendingCostCount":0,"unmappedCostCount":0,"hasExplicitCostScopeEvidence":true,"closureEvidenceRefs":[source("OperatingSourceScope",15)]},
        "laborLineage":{"containsLabor":"no","basisRefs":[source("ExpenseRecord",10)],"lineageHash":"5".repeat(64)},
        "metrics":{"effectiveContractAmounts":triple(contract),"confirmedReceiptAmounts":triple(receipt),"includedCostAmounts":triple(cost),"excludedCostAmounts":triple(0),"taxPendingAmount":amount(0),"costVarianceNet":amount(cost-baseline),"grossMarginNet":amount(receipt-cost),"grossMarginRate":ratio(receipt-cost,receipt),"receiptRatio":ratio(receipt,contract)}
    })).expect("complete exact source fixture");
    refresh(&mut context);
    context
}
fn derive(context: &OperatingSourceContext) -> OperatingEvaluationDraft {
    derive_operating_evaluation(context, None).expect("valid fixture evaluation")
}
fn with_constraint(context: &mut OperatingSourceContext, action: &str) {
    context.upstream_cost_constraints.push(serde_json::from_value(json!({"ruleId":"actual-cost-policy","ruleVersion":"1","action":action,"reasonCode":"frozen-upstream-condition","basisRefs":[source("CostGovernanceEvidence",14)]})).expect("constraint"));
    refresh(context);
}
fn manual(
    context: &OperatingSourceContext,
    before: &OperatingEvaluationDraft,
    risk: OperatingRiskLevel,
) -> VerifiedMaterialityReview {
    let evidence_refs = before
        .all_reasons
        .iter()
        .find(|r| r.rule_id == "H08")
        .expect("qualitative issue")
        .evidence_refs
        .clone();
    let actor_id = uuid::Uuid::from_u128(12);
    let source_hash = context.source_hash.clone().try_into().expect("hash");
    let evaluation_hash_before = before.evaluation_hash.clone();
    let policy_hash = POLICY_HASH.to_owned().try_into().expect("policy hash");
    let issue_codes = vec!["qualitative-materiality-unassessed".to_owned()];
    let rationale = "按冻结证据判断当前质性事项".to_owned();
    let overlay_hash=hash::canonical_hash(&json!({"sourceHash":source_hash,"evaluationHashBefore":evaluation_hash_before,"policyHash":policy_hash,"actorId":actor_id,"riskDecision":risk,"issueCodes":issue_codes,"evidenceRefs":evidence_refs,"rationale":rationale})).expect("overlay hash");
    VerifiedMaterialityReview {
        source_hash,
        evaluation_hash_before,
        policy_hash,
        actor_id,
        risk_decision: risk,
        issue_codes,
        evidence_refs,
        rationale,
        overlay_hash,
    }
}

#[test]
fn normal_complete_keeps_known_zero_margin_and_four_prompt_gates() {
    let result = derive(&fixture(10_000, 10_000, 10_000, 10_000));
    assert_eq!(result.effective_risk_level, OperatingRiskLevel::Normal);
    assert_eq!(
        result
            .all_reasons
            .iter()
            .map(|r| r.rule_id.as_str())
            .collect::<Vec<_>>(),
        vec!["H11"]
    );
    assert_eq!(
        result.cost_readiness.known_metric_states.gross_margin,
        Knowledge::Known
    );
    assert_eq!(result.four_stage_drafts.len(), 4);
    assert!(
        result
            .four_stage_drafts
            .values()
            .all(|d| d.effective_action == OperatingSnapshotActionLevel::Prompt)
    );
}
#[test]
fn negative_margin_uses_exact_twenty_percent_boundary_not_display_rounding() {
    let below = derive(&fixture(3_000_001, 600_000, 600_001, 600_001));
    assert_eq!(below.effective_risk_level, OperatingRiskLevel::Unknown);
    assert!(below.all_reasons.iter().any(|r| r.rule_id == "H03"));
    assert!(below.all_reasons.iter().any(|r| r.rule_id == "H08"));
    assert_eq!(below.ratio_use, GrossMarginRateUse::ObservationOnly);
    let exact = derive(&fixture(10_000, 2_000, 2_001, 2_001));
    assert_eq!(exact.system_risk_level, OperatingRiskLevel::Risk);
    assert_eq!(exact.system_signal_level, OperatingSignalLevel::Alert);
    assert!(!exact.all_reasons.iter().any(|r| r.rule_id == "H03"));
}
#[test]
fn independent_authoritative_cost_floors_survive_low_receipts() {
    let mut block = fixture(10_000, 100, 101, 101);
    with_constraint(&mut block, "block");
    let result = derive(&block);
    assert_eq!(
        result.current_action_level,
        OperatingSnapshotActionLevel::Block
    );
    assert_eq!(
        result.four_stage_drafts[&OperatingGateStage::First].effective_action,
        OperatingSnapshotActionLevel::Review
    );
    for stage in [
        OperatingGateStage::Second,
        OperatingGateStage::Final,
        OperatingGateStage::Retention,
    ] {
        assert_eq!(
            result.four_stage_drafts[&stage].effective_action,
            OperatingSnapshotActionLevel::Block
        );
    }
    let mut review = fixture(10_000, 10_000, 100, 100);
    with_constraint(&mut review, "review");
    let result = derive(&review);
    assert_eq!(
        result.four_stage_drafts[&OperatingGateStage::First].effective_action,
        OperatingSnapshotActionLevel::Prompt
    );
    assert_eq!(
        result.four_stage_drafts[&OperatingGateStage::Second].effective_action,
        OperatingSnapshotActionLevel::Review
    );
}
#[test]
fn source_hash_cannot_hide_forged_metric_assertions() {
    let mut context = fixture(10_000, 10_000, 100, 100);
    context.metrics.gross_margin_net.value = Some("999.00".into());
    assert!(derive_operating_evaluation(&context, None).is_err());
    let mut context = fixture(10_000, 10_000, 100, 100);
    context.receipts[0].amounts.net.value = Some("99.99".into());
    assert!(derive_operating_evaluation(&context, None).is_err());
}
#[test]
fn zero_receipts_keep_known_negative_margin_but_unknown_rate_and_risk() {
    let result = derive(&fixture(10_000, 0, 100, 100));
    assert_eq!(result.effective_risk_level, OperatingRiskLevel::Unknown);
    assert_eq!(
        result.cost_readiness.known_metric_states.gross_margin,
        Knowledge::Known
    );
    assert_eq!(
        result.cost_readiness.known_metric_states.gross_margin_rate,
        Knowledge::Unknown
    );
    assert_eq!(result.ratio_use, GrossMarginRateUse::Unavailable);
}
#[test]
fn optional_unknown_pending_tax_is_distinct_from_known_zero_and_cannot_be_reviewed_mature() {
    let mut context = fixture(10_000, 10_000, 100, 100);
    context.tax_treatments.push(serde_json::from_value(json!({"taxTreatmentRef":source("TaxTreatment",77),"evidenceRefs":[source("TaxEvidence",78)],"deductibility":"pending","pendingAmount":unknown(),"recognizedAdjustmentNet":amount(0),"adjustmentOverlapKey":"tax:77","containsLabor":"unknown"})).expect("tax"));
    context.metrics.tax_pending_amount = serde_json::from_value(unknown()).expect("unknown amount");
    refresh(&mut context);
    let before = derive(&context);
    assert_eq!(
        before.cost_readiness.data_maturity_level,
        OperatingDataMaturityLevel::Preliminary
    );
    assert_eq!(
        before.cost_readiness.known_metric_states.tax_pending,
        Knowledge::Unknown
    );
    let overlay = manual(&context, &before, OperatingRiskLevel::Normal);
    let after = derive_operating_evaluation(&context, Some(&overlay)).expect("review");
    assert_eq!(
        after.cost_readiness.data_maturity_level,
        OperatingDataMaturityLevel::Preliminary
    );
    assert_eq!(after.effective_risk_level, OperatingRiskLevel::Unknown);
    assert_eq!(
        after.cost_readiness.known_metric_states.tax_pending,
        Knowledge::Unknown
    );
}

fn unassessed_taxed_expense_fixture() -> OperatingSourceContext {
    let mut context = fixture(10_000_000, 10_000_000, 500_000, 500_000);
    let tax: Amount = serde_json::from_value(amount(65_000)).expect("exact source tax650.00");
    let gross: Amount = serde_json::from_value(amount(565_000)).expect("exact source gross5650.00");
    context.costs[0].amounts.tax = tax.clone();
    context.costs[0].amounts.gross = gross.clone();
    context.metrics.included_cost_amounts.tax = tax;
    context.metrics.included_cost_amounts.gross = gross;
    context.metrics.tax_pending_amount = serde_json::from_value(json!({
        "knowledge":"unknown","value":null,"unknownReasonCode":"tax-assessment-missing",
        "basisRefs":[],"zeroProof":null
    }))
    .expect("G unassessed-tax knowledge shape");
    refresh(&mut context);
    context
}

#[test]
fn taxed_expense_without_assessment_replays_g_unknown_instead_of_empty_sum_zero() {
    let context = unassessed_taxed_expense_fixture();
    assert!(context.tax_treatments.is_empty());
    assert_eq!(
        context.costs[0].amounts.tax.value.as_deref(),
        Some("650.00")
    );
    assert_metrics(&context).expect("actual G unknown rule remains valid");
    let evaluation = derive(&context);
    assert_eq!(
        evaluation.cost_readiness.known_metric_states.tax_pending,
        Knowledge::Unknown
    );
    assert_eq!(
        evaluation.cost_readiness.data_maturity_level,
        OperatingDataMaturityLevel::Preliminary
    );
    assert!(context.metrics.tax_pending_amount.value.is_none());
    assert_eq!(evaluation.effective_risk_level, OperatingRiskLevel::Unknown);
    assert!(
        evaluation
            .all_reasons
            .iter()
            .any(|reason| reason.rule_id == "H02")
    );
    assert!(
        !evaluation
            .all_reasons
            .iter()
            .any(|reason| reason.rule_id == "H11")
    );
}

#[test]
fn unassessed_tax_cannot_be_forged_into_a_known_zero_even_with_a_valid_context_hash() {
    let mut context = unassessed_taxed_expense_fixture();
    context.metrics.tax_pending_amount = serde_json::from_value(amount(0)).expect("zero");
    refresh(&mut context);
    assert!(assert_metrics(&context).is_err());
    assert!(derive_operating_evaluation(&context, None).is_err());
}

#[test]
fn unassessed_tax_keeps_null_and_the_actual_missing_assessment_reason() {
    let mut context = unassessed_taxed_expense_fixture();
    context.metrics.tax_pending_amount.value = Some("650.00".into());
    refresh(&mut context);
    assert!(assert_metrics(&context).is_err());
    context.metrics.tax_pending_amount.value = None;
    context.metrics.tax_pending_amount.unknown_reason_code = Some("scope-not-closed".into());
    refresh(&mut context);
    assert!(assert_metrics(&context).is_err());
}

#[test]
fn zero_tax_source_without_assessment_still_has_factual_known_zero_pending_tax() {
    let mut context = fixture(10_000, 10_000, 100, 100);
    assert!(context.tax_treatments.is_empty());
    assert_metrics(&context).expect("real zero-tax source proves this empty assessment sum zero");
    context.metrics.tax_pending_amount = unassessed_taxed_expense_fixture()
        .metrics
        .tax_pending_amount;
    refresh(&mut context);
    assert!(assert_metrics(&context).is_err());
}

#[test]
fn real_assessment_pending_amount_is_still_replayed_and_not_replaced_by_cost_tax() {
    let mut context = unassessed_taxed_expense_fixture();
    context.tax_treatments.push(
        serde_json::from_value(json!({
            "taxTreatmentRef":source("AccountingTaxTreatmentSnapshot",77),
            "evidenceRefs":[source("CostGovernanceEvidence",78)],"deductibility":"pending",
            "pendingAmount":amount(12_345),"recognizedAdjustmentNet":amount(0),
            "adjustmentOverlapKey":"tax:77","containsLabor":"no"
        }))
        .expect("actual assessed pending123.45 fixture"),
    );
    context.metrics.tax_pending_amount = serde_json::from_value(amount(12_345)).expect("pending");
    refresh(&mut context);
    assert_metrics(&context).expect("actual pending assessment is123.45, not source tax650");
    context.metrics.tax_pending_amount = serde_json::from_value(amount(0)).expect("forged zero");
    refresh(&mut context);
    assert!(assert_metrics(&context).is_err());
}

#[test]
fn unknown_source_tax_without_assessment_also_requires_unknown_pending_tax() {
    let mut context = unassessed_taxed_expense_fixture();
    let tax: Amount = serde_json::from_value(json!({
        "knowledge":"unknown","value":null,"unknownReasonCode":"source-monetary-layer-missing",
        "basisRefs":[source("ProjectActualCostRecord",9)],"zeroProof":null
    }))
    .expect("unknown source tax");
    context.costs[0].amounts.tax = tax.clone();
    context.metrics.included_cost_amounts.tax = tax;
    refresh(&mut context);
    assert_metrics(&context).expect("unknown source tax is not assumed zero");
    context.metrics.tax_pending_amount = serde_json::from_value(amount(0)).expect("forged zero");
    refresh(&mut context);
    assert!(assert_metrics(&context).is_err());
}
#[test]
fn materiality_review_keeps_source_block_and_immutable_system_unknown() {
    let mut context = fixture(10_000, 100, 101, 101);
    with_constraint(&mut context, "block");
    let before = derive(&context);
    let overlay = manual(&context, &before, OperatingRiskLevel::Normal);
    let after = derive_operating_evaluation(&context, Some(&overlay)).expect("review");
    assert_eq!(after.system_risk_level, OperatingRiskLevel::Unknown);
    assert_eq!(after.effective_risk_level, OperatingRiskLevel::Normal);
    assert_eq!(
        after.current_action_level,
        OperatingSnapshotActionLevel::Block
    );
    assert_eq!(
        after.four_stage_drafts[&OperatingGateStage::Final].effective_action,
        OperatingSnapshotActionLevel::Block
    );
    assert_ne!(
        before.evaluation_hash.as_str(),
        after.evaluation_hash.as_str()
    );
    let mut tampered = overlay;
    tampered.rationale = "tampered".into();
    assert!(derive_operating_evaluation(&context, Some(&tampered)).is_err());
}
#[test]
fn extreme_minus_one_is_strict_and_multiple_primary_reasons_are_retained() {
    assert!(
        !derive(&fixture(1000, 1000, 2000, 2000))
            .all_reasons
            .iter()
            .any(|r| r.rule_id == "H07")
    );
    let mut context = fixture(1000, 1000, 2001, 2001);
    with_constraint(&mut context, "block");
    let result = derive(&context);
    assert!(result.all_reasons.iter().any(|r| r.rule_id == "H07"));
    assert!(
        result
            .all_reasons
            .iter()
            .filter(|r| r.is_primary_project_reason)
            .count()
            >= 2
    );
    assert!(
        result.four_stage_drafts[&OperatingGateStage::Final]
            .primary_reason_ids
            .len()
            >= 3
    );
}
#[test]
fn missing_hard_evidence_and_restatement_cannot_be_erased_by_normal_observation() {
    let mut context = fixture(1000, 1000, 10, 10);
    context.scope.has_explicit_cost_scope_evidence = false;
    context.formal_eligibility.status = FormalEligibilityStatus::MissingEvidence;
    context.formal_eligibility.blocking_reason_codes = vec!["explicit-cost-scope-missing".into()];
    refresh(&mut context);
    let result = derive(&context);
    assert_eq!(
        result.certification,
        OperatingEvaluationCertification::MissingEvidence
    );
    assert_eq!(
        result.cost_readiness.data_maturity_level,
        OperatingDataMaturityLevel::Insufficient
    );
    assert_eq!(
        result.four_stage_drafts[&OperatingGateStage::First].effective_action,
        OperatingSnapshotActionLevel::Prompt
    );
    assert_eq!(
        result.four_stage_drafts[&OperatingGateStage::Final].effective_action,
        OperatingSnapshotActionLevel::Block
    );
    let mut context = fixture(1000, 1000, 10, 10);
    context.snapshot.restatement_status = serde_json::from_value(json!("pending")).expect("status");
    refresh(&mut context);
    let result = derive(&context);
    assert!(result.all_reasons.iter().any(|r| r.rule_id == "H06"));
    assert_eq!(
        result.four_stage_drafts[&OperatingGateStage::First].effective_action,
        OperatingSnapshotActionLevel::Review
    );
}
#[test]
fn maxima_do_not_overflow_from_summing_receipt_and_cost_before_subtraction() {
    let max = 999_999_999_999_999_999;
    let zero = derive(&fixture(max, max, max, max));
    assert_eq!(zero.effective_risk_level, OperatingRiskLevel::Normal);
    let negative = derive(&fixture(max, 1, max, max));
    assert_eq!(negative.effective_risk_level, OperatingRiskLevel::Unknown);
    assert_eq!(
        ratio6(1 - max, 1).expect("large ratio"),
        "-999999999999999998.000000"
    );
    assert_eq!(ratio6(1, 128).expect("half"), "0.007813");
    assert_eq!(ratio6(-1, 128).expect("negative half"), "-0.007813");
}
#[test]
fn aggregate_capacity_rejection_occurs_before_persistence() {
    let max = 999_999_999_999_999_999;
    let mut context = fixture(max, max, max, max);
    let mut second = context.costs[0].clone();
    second.amounts = serde_json::from_value(triple(1)).expect("one cent");
    second.canonical_accumulation_key = "expense:second".into();
    context.costs.push(second);
    refresh(&mut context);
    let result = derive_operating_evaluation(&context, None);
    assert!(matches!(
        result,
        Err(Error::CodedUnprocessable {
            code: "operating_money_capacity_exceeded",
            ..
        })
    ));
}

#[test]
fn exhaustive_empty_cost_scope_can_be_known_zero_without_mature_business_data() {
    let mut context = fixture(10_000, 10_000, 0, 100);
    context.costs.clear();
    context.scope.registered_cost_count = 0;
    context.scope.included_cost_count = 0;
    context.scope.has_explicit_cost_scope_evidence = false;
    refresh(&mut context);
    let result = derive(&context);
    assert_eq!(
        result.cost_readiness.known_metric_states.included_cost,
        Knowledge::Known
    );
    assert_eq!(
        result.cost_readiness.data_maturity_level,
        OperatingDataMaturityLevel::Insufficient
    );
    assert_eq!(result.effective_risk_level, OperatingRiskLevel::Unknown);
}

#[test]
fn unproven_currency_preparation_keeps_source_amounts_and_unknown_aggregates_separate() {
    let mut context = fixture(10_000, 10_000, 100, 100);
    context.currency = None;
    context.receipts[0].amounts.currency = Some("USD".into());
    context.formal_eligibility.status = FormalEligibilityStatus::MissingEvidence;
    context.formal_eligibility.blocking_reason_codes = vec!["currency-unproven-or-multiple".into()];
    let u: Amount = serde_json::from_value(unknown()).expect("unknown currency amount");
    for triple in [
        &mut context.metrics.effective_contract_amounts,
        &mut context.metrics.confirmed_receipt_amounts,
        &mut context.metrics.included_cost_amounts,
        &mut context.metrics.excluded_cost_amounts,
    ] {
        triple.currency = None;
        triple.net = u.clone();
        triple.tax = u.clone();
        triple.gross = u.clone();
    }
    context.metrics.tax_pending_amount = u.clone();
    context.metrics.cost_variance_net = u.clone();
    context.metrics.gross_margin_net = u;
    context.metrics.receipt_ratio = Ratio {
        knowledge: Knowledge::Unknown,
        value: None,
        reason_code: Some("missing-evidence".into()),
    };
    context.metrics.gross_margin_rate = context.metrics.receipt_ratio.clone();
    refresh(&mut context);
    let result = derive(&context);
    assert_eq!(
        result.cost_readiness.known_metric_states.included_cost,
        Knowledge::Unknown
    );
    assert_eq!(result.ratio_use, GrossMarginRateUse::Unavailable);
    assert_eq!(
        result.certification,
        OperatingEvaluationCertification::MissingEvidence
    );
}
