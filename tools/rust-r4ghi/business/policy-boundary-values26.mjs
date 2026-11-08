// Assertion/request helpers for one real normal-business project. No context mint.
import assert from 'node:assert/strict';
export const POLICY26 = '7e9cfcedc496bd5d4ffd6fc158371e3db069110798926c63a5156ee4614a1aec';
export const FACTS26 = Object.freeze({ currency: 'CNY', contract: '100.00', adoptedBudget: '30.00', expense: '25.00', tax: '0.00', taxRate: '0.0000' });
export const CASH_STEPS26 = Object.freeze([
  Object.freeze({ name: 'below', increment: '19.99', total: '19.99', margin: '-5.01', low: true }),
  Object.freeze({ name: 'equal', increment: '0.01', total: '20.00', margin: '-5.00', low: false }),
  Object.freeze({ name: 'above', increment: '0.01', total: '20.01', margin: '-4.99', low: false }),
]);
export function cents26(value) { assert(typeof value === 'string' && /^-?(?:0|[1-9][0-9]*)\.[0-9]{2}$/.test(value)); const negative = value.startsWith('-'); const [integer, fraction] = (negative ? value.slice(1) : value).split('.'); const cents = BigInt(integer) * 100n + BigInt(fraction); return negative ? -cents : cents; }
export const canonical26 = value => Array.isArray(value) ? value.map(canonical26) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical26(value[key])])) : value;
export function assertSchedule26(steps = CASH_STEPS26) {
  assert.equal(steps.length, 3); let total = 0n;
  for (const [index, step] of steps.entries()) { total += cents26(step.increment); assert.equal(total, cents26(step.total)); assert.equal(total - cents26(FACTS26.expense), cents26(step.margin)); assert.equal(total * 5n < cents26(FACTS26.contract), step.low); assert.equal(step.name, ['below', 'equal', 'above'][index]); }
  assert.equal(cents26(steps[1].total) * 5n, cents26(FACTS26.contract)); return true;
}
export function configureSourceRequest26(operationId, body) {
  const value = structuredClone(body);
  if (operationId === 'ProjectController_createProjectTechnicalCostPackage') {
    assert.equal(value.costItems.length, 1); Object.assign(value.costItems[0], { amountExcludingTax: FACTS26.adoptedBudget, taxCostAmount: FACTS26.tax, amountIncludingTax: FACTS26.adoptedBudget,
      costDescription: '本独立正常项目实施估算30元', estimationBasis: '本项目明确采用CNY未税/含税均30.00，税0.00的实施估算。' });
    value.taxAssumptionSummary = 'CNY零税估算：含税30.00=未税30.00+税0.00。';
  } else if (operationId === 'ContractReadinessController_createCommercialReleaseBaseline') {
    assert.equal(value.contractTerms.length, 1); Object.assign(value, { amountTaxInclusive: FACTS26.contract, amountTaxExclusive: FACTS26.contract, taxRate: FACTS26.taxRate });
    value.contractTerms[0].taxRate = FACTS26.taxRate;
  } else if (operationId === 'ProjectController_createProjectPricingMarginReview') {
    Object.assign(value, { quoteAmountTaxInclusive: FACTS26.contract, quoteAmountTaxExclusive: FACTS26.contract, taxRate: FACTS26.taxRate,
      grossMarginRate: '0.70000000', grossMarginBand: 'target', grossMarginSummary: '真实报价100与估算30形成项目商业参考，不是H阈值或回款毛利。', taxConditionSummary: '本项目明确CNY、税率0.0000。' });
  } else if (operationId === 'ContractReadinessController_createContractReadinessPackage') {
    Object.assign(value.candidateTerms, { amountTaxInclusive: FACTS26.contract, amountTaxExclusive: FACTS26.contract, taxRate: FACTS26.taxRate });
    assert.equal(value.candidateTerms.receivablePlanSeeds.length, 1); value.candidateTerms.receivablePlanSeeds[0].plannedAmount = FACTS26.contract;
  }
  return value;
}
export function assertKnown26(amount, value, name) { assert.equal(amount?.knowledge, 'known', `${name} must be server-known`); assert.equal(amount.value, value, name); }
export function assertFrozenCase26(context, signal, name) {
  assert.equal(context.policyHash, POLICY26); assert.equal(context.formalEligibility.status, 'eligible'); assert.equal(context.currency, 'CNY'); assert.equal(context.contracts.length, 1);
  for (const layer of ['net', 'gross']) assertKnown26(context.metrics.effectiveContractAmounts[layer], '100.00', 'effective contract ' + layer);
  assertKnown26(context.metrics.effectiveContractAmounts.tax, '0.00', 'effective contract tax');
  assertKnown26(context.baseline.originalNetCost, '30.00', 'adopted original estimate'); assertKnown26(context.baseline.currentEffectiveNetCost, '30.00', 'effective estimate');
  assert.equal(signal.evaluationContext.sourceHash, context.sourceHash); const rules = new Set(signal.reasonItems.map(reason => reason.ruleId));
  assert(!rules.has('H06') && !rules.has('H09') && !rules.has('H10'), 'Do not fabricate a pending restatement or authoritative constraint for coverage');
  if (name === 'h01') {
    assert.equal(context.receipts.length, 0); assert.equal(context.costs.length, 0); assert.equal(context.scope.collectionStatus, 'closed'); assert.equal(context.scope.hasExplicitCostScopeEvidence, false);
    for (const triple of [context.metrics.confirmedReceiptAmounts, context.metrics.includedCostAmounts]) for (const layer of ['net', 'tax', 'gross']) { assertKnown26(triple[layer], '0.00', 'actual closed empty scope'); assert(triple[layer].zeroProof, 'Known empty zero needs the actual collector proof'); }
    assert.equal(signal.dataMaturityLevel, 'insufficient'); assert.equal(signal.riskLevel, 'unknown'); assert.equal(signal.systemRiskLevel, 'unknown');
    assert(rules.has('H01') && rules.has('H03')); assert(!rules.has('H05') && !rules.has('H11')); assert.equal(signal.metricKnowledge.grossMarginRateUse, 'unavailable');
  } else {
    const step = CASH_STEPS26.find(step => step.name === name); assert(step); assert.equal(context.scope.hasExplicitCostScopeEvidence, true); assert.equal(context.scope.collectionStatus, 'closed');
    assert.equal(context.receipts.length, CASH_STEPS26.indexOf(step) + 1); assert.equal(context.costs.filter(cost => cost.classification.decision === 'include').length, 1);
    for (const layer of ['net', 'gross']) { assertKnown26(context.metrics.confirmedReceiptAmounts[layer], step.total, 'confirmed cash ' + layer); assertKnown26(context.metrics.includedCostAmounts[layer], '25.00', 'included cost ' + layer); }
    assertKnown26(context.metrics.confirmedReceiptAmounts.tax, '0.00', 'cash tax'); assertKnown26(context.metrics.includedCostAmounts.tax, '0.00', 'cost tax');
    assertKnown26(context.metrics.grossMarginNet, step.margin, 'observed margin'); assertKnown26(context.metrics.costVarianceNet, '-5.00', 'variance to adopted estimate'); assertKnown26(context.metrics.taxPendingAmount, '0.00', 'actual closed tax assessment');
    assert.equal(context.taxTreatments.length, 1); assert.equal(context.taxTreatments[0].deductibility, 'non-deductible'); assert.equal(context.pendingFacts.length, 0);
    assert.equal(signal.dataMaturityLevel, 'mature'); assert(!rules.has('H01') && !rules.has('H02') && !rules.has('H07') && !rules.has('H11'));
    assert.equal(rules.has('H03'), step.low); assert.equal(rules.has('H08'), step.low); assert.equal(rules.has('H05'), !step.low); assert(!rules.has('H04'));
    assert.equal(signal.riskLevel, step.low ? 'unknown' : 'risk'); assert.equal(signal.systemRiskLevel, step.low ? 'unknown' : 'risk');
    assert.equal(signal.metricKnowledge.grossMarginRateUse, step.low ? 'observation-only' : 'business-judgment'); assert.equal(signal.metricKnowledge.ratiosStable, !step.low);
    assert.equal(cents26(step.total) * 5n < cents26(FACTS26.contract), step.low);
  }
}
export function materialityBody26(signal, rationale, requestKey) {
  const issue = signal.reasonItems.find(reason => reason.ruleId === 'H08' && reason.code === 'qualitative-materiality-unassessed');
  assert(issue?.evidenceProjection?.mode === 'full' && issue.evidenceProjection.value); assert(typeof rationale === 'string' && rationale.trim().length > 0);
  const evidence = JSON.parse(issue.evidenceProjection.value); assert(Array.isArray(evidence) && evidence.length > 0);
  for (const ref of evidence) { assert.deepEqual(Object.keys(ref).sort(), ['id', 'kind', 'payloadHash', 'rowVersion']); assert(typeof ref.kind === 'string' && /^[a-f0-9]{64}$/.test(ref.payloadHash) && Number.isInteger(ref.rowVersion) && ref.rowVersion > 0); }
  return { inputVersion: 'server-derived-v1', reviewDecision: 'manual-confirmed', resolvedDataMaturityLevel: signal.dataMaturityLevel, costActionRecommendation: signal.costActionRecommendation,
    referencedBaselineVersion: signal.referencedBaselineVersion, referencedSnapshotVersion: signal.referencedSnapshotVersion, expectedSourceHash: signal.evaluationContext.sourceHash,
    expectedEvaluationHash: signal.evaluationContext.evaluationHash, expectedVersion: signal.rowVersion, requestKey, manualMaterialityReview: { policyVersion: 'r4h-operating-v1', issueCodes: [issue.code], riskDecision: 'attention', evidenceRefs: [structuredClone(evidence[0])], rationale } };
}
