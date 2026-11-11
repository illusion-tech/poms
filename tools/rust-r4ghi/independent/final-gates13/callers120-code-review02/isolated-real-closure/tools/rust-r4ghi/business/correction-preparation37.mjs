// Candidate read-only HTTP/observation planner; deliberately sends no business POST.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { data, keyOf, sha, uuid } from './pure.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';

const POLICY = 'docs/design/rust-r4ghi/user-decision-period05.json';
const POLICY_SHA = 'bd1a7556d369c67e8dd13b53882c6c1248318b1d163363827f761213462c90ec';
const text = value => { assert(typeof value === 'string' && value.trim()); return value; };
const rv = value => { assert(Number.isInteger(value) && value > 0 && value <= 2147483647); return value; };
export function exactExpectedRef(reference) {
  assert(reference && typeof reference === 'object'); uuid(reference.id); text(reference.kind);
  assert(/^[a-f0-9]{64}$/.test(reference.payloadHash));
  if (reference.expectedVersion !== undefined && reference.rowVersion !== undefined) assert.equal(reference.expectedVersion, reference.rowVersion);
  return { kind: reference.kind, id: reference.id, expectedVersion: rv(reference.expectedVersion ?? reference.rowVersion), payloadHash: reference.payloadHash };
}
const ordered = values => values.map(value => ({ projectId: value.projectId, expectedVersion: value.expectedVersion,
  restatesSnapshotRef: exactExpectedRef(value.restatesSnapshotRef), periodEndSnapshotRef: value.periodEndSnapshotRef ? exactExpectedRef(value.periodEndSnapshotRef) : null }))
  .sort((a, b) => a.projectId.localeCompare(b.projectId) || a.restatesSnapshotRef.id.localeCompare(b.restatesSnapshotRef.id));
export function assertSameCompleteTargets(primary, each) {
  assert(primary.length > 0); assert.equal(new Set(primary.map(t => t.projectId + ':' + t.restatesSnapshotRef.id)).size, primary.length);
  for (const value of each) assert.deepEqual(ordered(primary), ordered(value), 'A target-specific preparation discovered another terminal: stop, never truncate');
}
export function composeNonemptyRestatement(primaryPreparation, targets, corrections, primarySnapshotId, { reason, summary, requirePeriod = false } = {}) {
  assert.equal(primaryPreparation.kind, 'preparation-only'); assert.equal(primaryPreparation.intent, 'restatement');
  assert(/^[a-f0-9]{64}$/.test(primaryPreparation.expectedInputHash));
  assert.equal(primaryPreparation.formalEligibility.status, 'eligible'); assert.deepEqual(primaryPreparation.blockingReasonCodes, []);
  assertSameCompleteTargets(primaryPreparation.proposedAffectedTargets, [targets]);
  const primary = targets.find(t => t.projectId === primaryPreparation.projectId && t.restatesSnapshotRef.id === primarySnapshotId); assert(primary);
  assert.equal(primary.expectedVersion, primaryPreparation.headVersion); rv(primaryPreparation.projectVersion);
  assert(new Set(targets.map(t => t.projectId)).size >= 2, 'This scenario must contain actual cross-project impact');
  if (requirePeriod) assert(targets.some(t => t.periodEndSnapshotRef), 'Cross-period acceptance cannot be satisfied by live-only roots');
  assert.deepEqual(Object.keys(corrections).sort(), ['laborCorrections', 'allocationCorrections', 'stageCorrections', 'taxCorrections'].sort());
  for (const key of ['laborCorrections', 'allocationCorrections', 'stageCorrections', 'taxCorrections']) assert.equal(corrections[key]?.length, 1, `Actual ${key} producer must be nonempty`);
  const labor = corrections.laborCorrections[0], stage = corrections.stageCorrections[0];
  assert.notEqual(labor.supersededCostRef.id, stage.costRef.id, 'Labor replacement and stage correction cannot target the same cost');
  const body = { inputVersion: 'server-derived-v1', projectId: primaryPreparation.projectId, expectedVersion: primaryPreparation.headVersion,
    expectedProjectVersion: primaryPreparation.projectVersion, expectedInputHash: primaryPreparation.expectedInputHash, assertions: null,
    scope: primary.periodEndSnapshotRef ? 'period' : 'live', periodEndSnapshotRef: primary.periodEndSnapshotRef ? exactExpectedRef(primary.periodEndSnapshotRef) : null,
    restatesSnapshotRef: exactExpectedRef(primary.restatesSnapshotRef), restatementReason: text(reason), restatementSummary: text(summary), costDecisions: [],
    ...corrections, affectedTargets: targets.filter(t => t !== primary).map(t => ({ ...ordered([t])[0], costDecisions: [] })), acknowledgedChangedSourceRefs: [] };
  // Existing classifications are carried only by the server's verified producer
  // transitions. This planner does not silently change include/exclude policy.
  return body;
}

export async function prepareNonemptyCrossProjectRestatement37(ctx, api, scenario) {
  assert.equal(ctx.pins.find(pin => pin.file === POLICY)?.sha256, POLICY_SHA);
  assert.equal(sha(fs.readFileSync(`${ctx.win}/${POLICY}`)), POLICY_SHA);
  text(scenario.reason); text(scenario.summary); uuid(scenario.primaryProjectId); uuid(scenario.primarySnapshotId);
  assert(Array.isArray(scenario.projectIds) && new Set(scenario.projectIds).size === scenario.projectIds.length && scenario.projectIds.length >= 2);
  const observed = await capture(ctx, ctx.next('ef-correction-input')); assertRecorded(ctx, observed);
  const rows = table => readRows(observed.databases[ctx.database].tables[table]);
  const owned = (table, id) => {
    uuid(id); const matches = rows(table).filter(row => row.key.length === 1 && row.key[0] === id); assert.equal(matches.length, 1);
    const row = matches[0], proof = ctx.state.owned[keyOf(ctx.database, table, [id])];
    assert(proof && !proof.deleted && proof.proof?.transport === 'HTTP', `Actual owned HTTP ${table} required`);
    assert.equal(proof.latestSha256, row.sha256); assert.equal(proof.latestXmin, row.xmin); return JSON.parse(row.raw);
  };
  for (const id of scenario.projectIds) owned('project', id);
  const rootSnapshot = owned('project_operating_snapshot', scenario.primarySnapshotId);
  assert.equal(rootSnapshot.project_id, scenario.primaryProjectId); assert.equal(rootSnapshot.producer_version, 1); assert.equal(rootSnapshot.status, 'active');
  const rootContext = owned('operating_source_context', rootSnapshot.source_context_id);
  const frozenMembers = rows('operating_source_member').map(row => JSON.parse(row.raw)).filter(row => row.context_id === rootContext.id);
  const frozenRef = (kind, id) => {
    const matches = frozenMembers.filter(row => row.source_kind === kind && row.source_id === id); assert.equal(matches.length, 1, 'An actual frozen server reference is required');
    const row = matches[0]; return exactExpectedRef({ kind, id, rowVersion: row.source_row_version, payloadHash: row.source_payload_hash });
  };
  const callPreparation = async (projectId, snapshotId, correctionSourceRefs = null) => {
    const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId }, null, 'manager', {
      query: { view: 'preparation', intent: 'restatement', restatesSnapshotId: snapshotId,
        ...(correctionSourceRefs ? { correctionSourceRefs: JSON.stringify(correctionSourceRefs) } : {}) } });
    const preparation = data(response).preparation; assert.equal(preparation?.kind, 'preparation-only');
    return { preparation, receiptId: response.receiptId };
  };
  const initial = await callPreparation(scenario.primaryProjectId, scenario.primarySnapshotId);
  const sourceRefs = new Map(initial.preparation.sourceRows.map(row => [row.sourceRef.kind + ':' + row.sourceRef.id, exactExpectedRef(row.sourceRef)]));
  const currentRef = (kind, id) => { const ref = sourceRefs.get(kind + ':' + id); assert(ref, `Exact current preparation reference missing for ${kind}`); return ref; };
  const labor = owned('project_actual_cost_record', scenario.labor.costId), stageCost = owned('project_actual_cost_record', scenario.stage.costId);
  assert.equal(labor.cost_type, 'labor'); assert.equal(labor.project_id, scenario.primaryProjectId); assert.equal(stageCost.project_id, scenario.primaryProjectId);
  assert.notEqual(labor.id, stageCost.id); assert.equal(labor.rate_version_id, scenario.labor.rateId);
  const rate = owned('internal_cost_rate_version', scenario.labor.rateId), basis = owned('shared_cost_allocation_basis', scenario.allocation.basisId);
  const rateRef = frozenRef('InternalCostRateVersion', rate.id), basisRef = frozenRef('SharedCostAllocationBasis', basis.id);
  assert.equal(rateRef.expectedVersion, rate.row_version); assert.equal(basisRef.expectedVersion, basis.row_version); assert.equal(basis.status, 'active');
  const oldStage = owned('cost_stage_attribution_snapshot', labor.stage_derived_from_id);
  assert.equal(oldStage.status, 'active'); assert.equal(oldStage.governance_schema_version, 1);
  const projectStage = owned('project_stage_record', scenario.stage.projectStageRecordId);
  assert.equal(projectStage.project_id, stageCost.project_id); assert.equal(projectStage.producer_version, 1);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(projectStage.entered_at));
  assert.equal(day, stageCost.occurred_on, 'A real milestone proves only the same actual business day');
  assert.equal(projectStage.to_stage, scenario.stage.newAttributedStage);
  const attributionRef = currentRef('CostStageAttributionSnapshot', stageCost.stage_derived_from_id);
  const tax = owned('accounting_tax_treatment_snapshot', scenario.tax.taxTreatmentId); assert.equal(tax.project_id, stageCost.project_id);
  const corrections = {
    laborCorrections: [{ supersededCostRef: currentRef('ProjectActualCostRecord', labor.id), rateRef,
      laborPeriodStart: labor.labor_period_start, laborPeriodEnd: labor.labor_period_end,
      actualHours: scenario.labor.actualHours, actualPersonDays: scenario.labor.actualPersonDays,
      workSummary: text(scenario.labor.workSummary), attachmentRefs: [], stageEvidenceRefs: [currentRef('CostStageAttributionSnapshot', oldStage.id)], reason: text(scenario.labor.reason) }],
    allocationCorrections: [{ basisRef, sourceCostRefs: [], projectShareItems: [], reason: text(scenario.allocation.reason) }],
    stageCorrections: [{ correctionKind: 'stage-reclassification', stageAttributionRef: attributionRef, costRef: currentRef('ProjectActualCostRecord', stageCost.id),
      request: { newAttributedStage: projectStage.to_stage, lockedBySnapshotId: null, reclassifyReason: text(scenario.stage.reason), expectedVersion: attributionRef.expectedVersion,
        attributionEvidence: { kind: 'source', sourceType: 'project-stage-record', sourceId: projectStage.id, sourceVersion: rv(projectStage.sequence_no), businessDate: day, reason: text(scenario.stage.reason) } } }],
    taxCorrections: [{ correctionKind: 'tax-treatment-replacement', taxTreatmentRef: currentRef('AccountingTaxTreatmentSnapshot', tax.id),
      expectedSourceRefs: [currentRef('ProjectActualCostRecord', stageCost.id)], request: { ...scenario.tax.request, expectedVersion: rv(tax.row_version), currency: stageCost.currency,
        sourceReferences: [{ kind: 'source', sourceType: 'project-actual-cost-record', sourceId: stageCost.id, sourceVersion: rv(stageCost.row_version), businessDate: stageCost.occurred_on,
          reason: text(scenario.tax.request.replacementReason) }] } }],
  };
  const roots = [corrections.laborCorrections[0].supersededCostRef, basisRef, corrections.stageCorrections[0].costRef, attributionRef, corrections.taxCorrections[0].taxTreatmentRef]
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const primary = await callPreparation(scenario.primaryProjectId, scenario.primarySnapshotId, roots);
  const targets = primary.preparation.proposedAffectedTargets; assert(targets.length > 0);
  assert.deepEqual([...new Set(targets.map(t => t.projectId))].sort(), [...scenario.projectIds].sort(), 'Review any larger actual project closure before proceeding');
  const targetPreparations = [];
  for (const target of targets) {
    owned('project_operating_snapshot', target.restatesSnapshotRef.id);
    if (target.periodEndSnapshotRef) owned('period_closing_snapshot', target.periodEndSnapshotRef.id);
    const result = await callPreparation(target.projectId, target.restatesSnapshotRef.id, roots); targetPreparations.push(result);
    assert.equal(result.preparation.formalEligibility.status, 'eligible'); assert.deepEqual(result.preparation.blockingReasonCodes, []);
    for (const row of result.preparation.sourceRows) sourceRefs.set(row.sourceRef.kind + ':' + row.sourceRef.id, exactExpectedRef(row.sourceRef));
  }
  assertSameCompleteTargets(targets, targetPreparations.map(t => t.preparation.proposedAffectedTargets));
  const batchSources = rows('shared_cost_allocation_source_snapshot').map(row => JSON.parse(row.raw)).filter(row => row.basis_id === basis.id && row.is_current === true);
  const batchResults = rows('shared_cost_allocation_result').map(row => JSON.parse(row.raw)).filter(row => row.basis_id === basis.id && row.status === 'active');
  assert(batchSources.length > 0); assert.equal(batchResults.length, scenario.projectIds.length);
  corrections.allocationCorrections[0].sourceCostRefs = batchSources.map(source => {
    owned('project_actual_cost_record', source.cost_record_id); return currentRef('ProjectActualCostRecord', source.cost_record_id);
  });
  assert.equal(new Set(scenario.allocation.shares.map(s => s.projectId)).size, batchResults.length);
  assert.deepEqual(scenario.allocation.shares.map(s => s.projectId).sort(), batchResults.map(r => r.project_id).sort());
  corrections.allocationCorrections[0].projectShareItems = batchResults.map(result => {
    owned('shared_cost_allocation_result', result.id); const share = scenario.allocation.shares.find(s => s.projectId === result.project_id); assert(share);
    assert(typeof share.allocationWeight === 'string' && /^[0-9]{1,16}(?:\.[0-9]{1,6})?$/.test(share.allocationWeight));
    return { projectId: result.project_id, allocationWeight: share.allocationWeight, expectedCurrentResultRef: currentRef('SharedCostAllocationResult', result.id), reason: text(share.reason) };
  });
  assert(corrections.allocationCorrections[0].projectShareItems.some(share => /[1-9]/.test(share.allocationWeight)), 'A complete actual batch cannot have all zero weights');
  const body = composeNonemptyRestatement(primary.preparation, targets, corrections, scenario.primarySnapshotId, scenario);
  const beforePost = await capture(ctx, ctx.next('ef-prepared-no-post')); assertRecorded(ctx, beforePost);
  const artifact = ctx.artifact(`${ctx.next('ef-correction-body')}.json`, { scenario, body, preparationReceipts: [initial.receiptId, primary.receiptId, ...targetPreparations.map(p => p.receiptId)],
    inputObservation: observed.manifest, lastObservation: beforePost.manifest, expectedSourceAuthority: 'actual server preparation refs and persisted frozen G member refs',
    locallyMintedBusinessHashes: false, executedBusinessPOST: false,
    requiredBeforeExecution: ['independent review/promote37 one-labor-number binding', 'source-specific nonempty E/F and all-target FI inventory; existing18/19 inventory must remain fail-closed'],
  }, { kind: 'actual-read-only-nonempty-E-F-cross-project-preparation-candidate', actualBusinessWrite: false, candidateOnly: true, G3Certified: false, G4Certified: false });
  return { artifact, body, binding: { restatementLaborCounter: 'one-owned-labor-replacement-v1', responseBirths: [
    { table: 'operating_restatement_record', pointer: '/targetId' }, { table: 'project_operating_snapshot', pointer: '/snapshotId' }],
    mutableTables: ['project_actual_cost_record', 'cost_stage_attribution_snapshot', 'accounting_tax_treatment_snapshot', 'shared_cost_allocation_basis',
      'shared_cost_allocation_result', 'shared_cost_allocation_source_snapshot', 'project_operating_head', 'project_operating_snapshot', 'project_cost_inclusion_head',
      'operating_signal_gate_binding', 'commission_gate_review_record'] }, executableByThisPlanner: false };
}
