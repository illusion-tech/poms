import{assertGHCurrentSource121}from'./runtime-admission121.mjs';
import{assertGHCurrentSource15}from'./source15-admission.mjs';
import{publicSelection273,adoptedChainFacts273,observedPublicPeriodRefs273,observedCurrentCostUnits273}from'./period-historical-facts273.mjs';
// Instrumentation inventory from actual owned rows, never an authorization or money calculator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readPin54 } from './consumer-admission54.mjs';
import { keyOf, uuid, sha } from './pure.mjs';

export const ghWriteOperations = Object.freeze([
  'ProjectCostController_activateOperatingBaselinePackage', 'ProjectCostController_createProjectOperatingSnapshot',
  'ProjectCostController_createPeriodClosingSnapshot', 'ProjectCostController_createOperatingRestatement',
  'ProjectCostController_reviewOperatingSignalEvaluation', 'ProjectCostController_reviewCommissionGateBinding',
]);
export const isGHWrite = operation => ghWriteOperations.includes(operation);
const sorted = values => [...new Set(values)].sort();
const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
function unchangedDecision(input, prior) {
  const previous = prior?.frozen_payload?.input;
  if (!previous || prior.source_row_version !== input.target.expectedVersion) return false;
  if (['decision', 'recognitionRole', 'reasonCode', 'reasonText', 'primaryCostRef'].some(k => stable(input[k]) !== stable(previous[k]))) return false;
  return ['supportingSourceRefs', 'evidenceRefs'].every(k => Array.isArray(input[k]) && Array.isArray(previous[k]) && stable(input[k].map(stable).sort()) === stable(previous[k].map(stable).sort()));
}

function periodPreparation205(ctx, scope, currentSnapshotId) {
  const { body, projectId } = scope;
  assert(typeof body.expectedInputHash === 'string' && /^[a-f0-9]{64}$/.test(body.expectedInputHash));
  assert(Number.isSafeInteger(body.expectedProjectVersion) && body.expectedProjectVersion > 0);
  assert(typeof body.baselinePackageRef?.payloadHash === 'string' && /^[a-f0-9]{64}$/.test(body.baselinePackageRef.payloadHash));
  assert(Array.isArray(body.costDecisions) && body.costDecisions.length === 0, 'This reviewed period fixture is already classified; do not introduce new decisions');
  const pin = scope.periodPreparation; assert(pin, 'An actual period preparation HTTP receipt is mandatory before FI');
  const within = (root, file) => { const rel = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'Period proof escaped its actual current run'); };
  within(ctx.out, pin.file); const http = JSON.parse(readPin54(pin));
  assert.equal(http.kind, 'actual-business-HTTP-attempt'); assert.equal(http.operationId, 'ProjectCostController_getProjectUnifiedAccounting');
  assert.equal(http.method, 'GET'); assert.equal(http.canonicalTemplate, '/api/projects/{projectId}/unified-accounting');
  assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
  for (const key of ['requestConfig', 'requestBody', 'responseBody']) within(ctx.priv, http.originals[key].file);
  const request = JSON.parse(readPin54(http.originals.requestConfig)); assert.equal(readPin54(http.originals.requestBody).length, 0);
  assert(typeof ctx.state.prefix === 'string' && /^bg[a-f0-9]{10}$/.test(ctx.state.prefix));
  assert(typeof http.requestId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(http.requestId) && http.requestId.startsWith(ctx.state.prefix + '-'));
  assert.equal(request.headers?.['X-Request-Id'], http.requestId, 'The actual harness request nonce must bind both original records');
  assert.equal(request.operationId, http.operationId); assert.equal(request.requestId, http.requestId); assert.equal(request.method, 'GET');
  const url = new URL(request.url); assert.equal(url.origin, ctx.api); assert.equal(url.pathname, '/api/projects/' + projectId + '/unified-accounting');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['intent', 'periodKey', 'view']); assert.equal(sha(url.search), http.querySha256);
  assert.equal(url.searchParams.get('view'), 'preparation'); assert.equal(url.searchParams.get('intent'), 'period-close'); assert.equal(url.searchParams.get('periodKey'), body.periodKey);
  within(ctx.priv, request.before.file); const before = JSON.parse(readPin54(request.before));
  assert.equal(before.epoch, ctx.epoch); assert.equal(before.run, ctx.run); assert.equal(before.marker, ctx.state.marker);
  const value = JSON.parse(readPin54(http.originals.responseBody)), p = (value.data ?? value).preparation;
  assert.equal(p?.kind, 'preparation-only'); assert.equal(p.intent, 'period-close'); assert.equal(p.projectId, projectId); assert.equal(p.periodKey, body.periodKey);
  assert.equal(p.headVersion, body.expectedVersion); assert.equal(p.projectVersion, body.expectedProjectVersion); assert.equal(p.expectedInputHash, body.expectedInputHash);
  assert.equal(p.formalEligibility?.status, 'eligible'); assert.deepEqual(p.formalEligibility.blockingReasonCodes, []); assert.deepEqual(p.blockingReasonCodes, []);
  assert(p.allowedCommandCodes.includes('period-close')); assert.equal(body.expectedPeriodSnapshotRef, null);
  const baseline = p.selectedBaselinePackageRef; assert.equal(baseline.kind, 'OperatingBaselinePackage');
  assert.deepEqual(body.baselinePackageRef, { kind: baseline.kind, id: baseline.id, expectedVersion: baseline.rowVersion, payloadHash: baseline.payloadHash });
  assert.equal(p.officialSnapshotRef?.id, currentSnapshotId, 'The real preparation must use this selected live capture');
  const inputs = p.sourceRows.filter(row => ['direct-cost', 'allocation-share'].includes(row.rowKind));
  assert(inputs.length); const units = inputs.map(row => {
    const kind = row.rowKind === 'direct-cost' ? 'ProjectActualCostRecord' : 'SharedCostAllocationResult';
    assert.equal(row.sourceRef.kind, kind); uuid(row.sourceRef.id); assert.equal(row.state, 'ready'); assert.deepEqual(row.blockingReasonCodes, []);
    return { unit: (kind === 'ProjectActualCostRecord' ? 'cost:' : 'allocation:') + row.sourceRef.id, row };
  });
  assert.equal(new Set(units.map(value => value.unit)).size, units.length);
  return { preparation: p, units };
}

function periodPreparation273(ctx, scope, currentSnapshotId, operationId) {
  assert(['ProjectCostController_createPeriodClosingSnapshot','ProjectCostController_createProjectOperatingSnapshot'].includes(operationId));
  const generic=operationId==='ProjectCostController_createProjectOperatingSnapshot', intent=generic?'snapshot-create':'period-close';
  if(generic){assert.equal(scope.body.snapshotMode,'period-end');assert(!Object.hasOwn(scope.body,'expectedPeriodSnapshotRef'));}
  const { body, projectId } = scope;
  assert(typeof body.expectedInputHash === 'string' && /^[a-f0-9]{64}$/.test(body.expectedInputHash));
  assert(Number.isSafeInteger(body.expectedProjectVersion) && body.expectedProjectVersion > 0);
  assert(Object.hasOwn(body,'baselinePackageRef'));assert.equal(body.baselinePackageRef,null);
  assert(Array.isArray(body.costDecisions) && body.costDecisions.length === 0, 'This reviewed period fixture is already classified; do not introduce new decisions');
  const pin = scope.periodPreparation; assert(pin, 'An actual period preparation HTTP receipt is mandatory before FI');
  const within = (root, file) => { const rel = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'Period proof escaped its actual current run'); };
  within(ctx.out, pin.file); const http = JSON.parse(readPin54(pin));
  assert.equal(http.kind, 'actual-business-HTTP-attempt'); assert.equal(http.operationId, 'ProjectCostController_getProjectUnifiedAccounting');
  assert.equal(http.method, 'GET'); assert.equal(http.canonicalTemplate, '/api/projects/{projectId}/unified-accounting');
  assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
  for (const key of ['requestConfig', 'requestBody', 'responseHeaders', 'responseBody']) within(ctx.priv, http.originals[key].file);
  assert.equal(JSON.parse(readPin54(http.originals.responseHeaders)).status,200,'Actual retained GET header status must agree');
  const request = JSON.parse(readPin54(http.originals.requestConfig)); assert.equal(readPin54(http.originals.requestBody).length, 0);
  assert(typeof ctx.state.prefix === 'string' && /^bg[a-f0-9]{10}$/.test(ctx.state.prefix));
  assert(typeof http.requestId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(http.requestId) && http.requestId.startsWith(ctx.state.prefix + '-'));
  assert.equal(request.headers?.['X-Request-Id'], http.requestId, 'The actual harness request nonce must bind both original records');
  assert.equal(request.operationId, http.operationId); assert.equal(request.requestId, http.requestId); assert.equal(request.method, 'GET');
  const url = new URL(request.url); assert.equal(url.origin, ctx.api); assert.equal(url.pathname, '/api/projects/' + projectId + '/unified-accounting');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['intent', 'periodKey', 'view',...(generic?['snapshotMode']:[])].sort());if(generic)assert.equal(url.searchParams.get('snapshotMode'),'period-end'); assert.equal(sha(url.search), http.querySha256);
  assert.equal(url.searchParams.get('view'), 'preparation'); assert.equal(url.searchParams.get('intent'), intent); assert.equal(url.searchParams.get('periodKey'), body.periodKey);
  within(ctx.priv, request.before.file); const before = JSON.parse(readPin54(request.before));
  assert.equal(before.schemaVersion,1); assert.equal(before.epoch, ctx.epoch); assert.equal(before.run, ctx.run); assert.equal(before.marker, ctx.state.marker);
  const value = JSON.parse(readPin54(http.originals.responseBody)), p = (value.data ?? value).preparation;
  assert.equal(p?.kind, 'preparation-only'); assert.equal(p.intent, intent); assert.equal(p.projectId, projectId); assert.equal(p.periodKey, body.periodKey);
  assert.equal(p.headVersion, body.expectedVersion); assert.equal(p.projectVersion, body.expectedProjectVersion); assert.equal(p.expectedInputHash, body.expectedInputHash);
  assert.equal(p.formalEligibility?.status, 'eligible'); assert.deepEqual(p.formalEligibility.blockingReasonCodes, []); assert.deepEqual(p.blockingReasonCodes, []);
  assert(p.allowedCommandCodes.includes(intent)); if(!generic)assert.equal(body.expectedPeriodSnapshotRef, null);
  const selection=publicSelection273(p);if(currentSnapshotId)assert.equal(p.officialSnapshotRef?.id,currentSnapshotId);else assert.equal(p.officialSnapshotRef,null);
  const inputs = p.sourceRows.filter(row => ['direct-cost', 'allocation-share'].includes(row.rowKind));
  assert(inputs.length); const units = inputs.map(row => {
    const kind = row.rowKind === 'direct-cost' ? 'ProjectActualCostRecord' : 'SharedCostAllocationResult';
    assert.equal(row.sourceRef.kind, kind); uuid(row.sourceRef.id); assert.equal(row.state, 'ready'); assert.deepEqual(row.blockingReasonCodes, []);
    return { unit: (kind === 'ProjectActualCostRecord' ? 'cost:' : 'allocation:') + row.sourceRef.id, row };
  });
  assert.equal(new Set(units.map(value => value.unit)).size, units.length);
  return { preparation:p, units, selection };
}

export function deriveGHWriteFacts(ctx, snapshot, operationId, scope, readRows) {
  if(Object.hasOwn(ctx.state,'runtimeAdmission121'))assertGHCurrentSource121(ctx,operationId);
  else if(ctx.epoch==='g2-business15')assertGHCurrentSource15(ctx,operationId);
  assert(isGHWrite(operationId)); const { projectId, actorId, actorKey, params, body } = scope;
  const actor = ctx.state.actors[actorKey]; assert.equal(actor.id, actorId);
  for (const permission of ['operating:finance:sensitive:read', 'labor-cost-rate:sensitive:read']) assert(actor.permissions.includes(permission), 'This positive inventory requires the real source-sensitive actor; masked/denied-event paths need their own inventory');
  const rows = table => readRows(snapshot.databases[ctx.database].tables[table]).map(r => ({ row: r, value: JSON.parse(r.raw) }));
  const values = table => rows(table).map(r => r.value);
  const owned = (table, id) => { uuid(id); const row = rows(table).find(r => r.row.key.length === 1 && r.row.key[0] === id); assert(row, `Missing actual ${table} row`); const proof = ctx.state.owned[keyOf(ctx.database, table, row.row.key)]; assert(proof && !proof.deleted, 'Never arm FI on an original or foreign source'); return row.value; };
  owned('project', projectId); owned('platform_user', actorId);
  const head = values('project_operating_head').find(r => r.project_id === projectId) ?? null;
  const result = { version: 1, projectId, headPresent: Boolean(head), baselineId: head?.baseline_package_id ?? null,
    currentSnapshotId: head?.current_snapshot_id ?? null, captureCount: 0, snapshotMode: null, terminalIds: [], costUnits: [], costUpdates: [],
    decisionInserts: [], oldBindingIds: [], oldGateReviewIds: [], oldSignalReviewId: null, oldSummaryId: null, targetSignalId: null, targetBindingId: null, selectedGateStage: null };
  const currentGateRows = () => values('operating_signal_gate_binding').filter(r => r.project_id === projectId && r.status === 'active');
  const oldGates = () => {
    result.oldBindingIds = sorted(currentGateRows().map(r => owned('operating_signal_gate_binding', r.id).id));
    result.oldGateReviewIds = sorted(values('commission_gate_review_record').filter(r => result.oldBindingIds.includes(r.binding_id) && r.status === 'active').map(r => owned('commission_gate_review_record', r.id).id));
  };
  if (operationId.endsWith('reviewOperatingSignalEvaluation')) {
    const signal = owned('operating_signal_evaluation_result', params.id); assert.equal(signal.project_id, projectId); result.targetSignalId = signal.id;
    const previous = values('operating_signal_review_record').filter(r => r.signal_evaluation_id === signal.id && r.status === 'active'); assert(previous.length <= 1);
    result.oldSignalReviewId = previous[0] ? owned('operating_signal_review_record', previous[0].id).id : null;
    assert.equal(head?.current_snapshot_id, signal.referenced_snapshot_id, 'Positive review needs the actual current source'); oldGates(); return result;
  }
  if (operationId.endsWith('reviewCommissionGateBinding')) {
    const binding = owned('operating_signal_gate_binding', params.id); assert.equal(binding.project_id, projectId);
    const signal = owned('operating_signal_evaluation_result', binding.signal_evaluation_id); assert.equal(head?.current_snapshot_id, signal.referenced_snapshot_id);
    result.targetSignalId = signal.id; result.targetBindingId = binding.id; result.selectedGateStage = binding.gate_stage_type;
    result.oldSummaryId = owned('approval_summary_snapshot', binding.current_summary_id).id;
    result.oldGateReviewIds = values('commission_gate_review_record').filter(r => r.binding_id === binding.id && r.status === 'active').map(r => owned('commission_gate_review_record', r.id).id); assert(result.oldGateReviewIds.length <= 1); return result;
  }
  assert.equal(body.projectId, projectId); assert.equal(body.expectedVersion, head?.row_version ?? 0, 'Body must use the actual observed G head before arming');
  if (operationId.endsWith('activateOperatingBaselinePackage')) {
    result.oldBaselineId = body.expectedCurrentPackageRef ? owned('operating_baseline_package', body.expectedCurrentPackageRef.id).id : null;
    assert.equal(result.oldBaselineId, result.baselineId);
    result.changePackageIds = (body.approvedChangeRefs ?? []).map(r => owned('project_technical_cost_package', r.id).id); return result;
  }
  const historical273=(ctx.epoch==='g2-business14'||ctx.epoch==='g2-business15')&&(operationId.endsWith('createPeriodClosingSnapshot')||operationId.endsWith('createProjectOperatingSnapshot')&&body.snapshotMode==='period-end');if(!historical273){assert(result.baselineId);owned('operating_baseline_package',result.baselineId);}
  let decisionInputs = body.costDecisions ?? [];
  if (operationId.endsWith('createOperatingRestatement')) {
    for (const key of ['laborCorrections', 'allocationCorrections', 'stageCorrections', 'taxCorrections']) assert.equal(body[key]?.length, 0, 'Actual E/F correction branches need their producer-specific inventory; never infer them from the historical late-expense case');
    assert.equal(body.scope, 'live'); assert.equal(body.periodEndSnapshotRef, null);
    const targets = [{ projectId, restatesSnapshotRef: body.restatesSnapshotRef, periodEndSnapshotRef: null }, ...(body.affectedTargets ?? [])];
    assert(targets.every(t => t.projectId === projectId && t.periodEndSnapshotRef === null), 'This source-bound late-expense inventory is one-project/live; do not truncate multi-project/period targets');
    result.terminalIds = sorted(targets.map(t => { const s = owned('project_operating_snapshot', t.restatesSnapshotRef.id); assert.equal(s.project_id, projectId); assert.equal(s.status, 'active'); return s.id; }));
    assert.equal(result.terminalIds.length, targets.length); result.captureCount = targets.length; result.snapshotMode = 'restated';
    decisionInputs = [...decisionInputs, ...(body.affectedTargets ?? []).flatMap(t => t.costDecisions)];
    if (result.terminalIds.includes(result.currentSnapshotId)) oldGates();
  } else {
    result.captureCount = 1; result.snapshotMode = operationId.endsWith('createPeriodClosingSnapshot') ? 'period-end' : body.snapshotMode;
    assert(['realtime', 'period-end'].includes(result.snapshotMode));
    // Current source explicitly leaves ordinary paired period captures unselected.
    // The runtime wrapper blocks period writes while decision7 is pending.
    if (result.snapshotMode === 'realtime') oldGates();
  }
  const periodProof = result.snapshotMode === 'period-end' ? (historical273?periodPreparation273(ctx,scope,result.currentSnapshotId,operationId):periodPreparation205(ctx,scope,result.currentSnapshotId)) : null;if(historical273){result.periodHistorical273=adoptedChainFacts273(ctx,snapshot,periodProof.selection,projectId,readRows);result.periodHistorical273.observedPublicSourceRefs=observedPublicPeriodRefs273(ctx,snapshot,periodProof.preparation,readRows);assert.deepEqual(observedCurrentCostUnits273(ctx,snapshot,projectId,readRows),periodProof.units.map(x=>x.unit).sort(),'All actual current direct/share units must be explicitly prepared; no head does not permit truncation');}
  if (periodProof) {
    if(!historical273)assert.equal(periodProof.preparation.selectedBaselinePackageRef.id,result.baselineId);
    assert.equal(periodProof.preparation.projectVersion, owned('project', projectId).row_version);
  }
  const seen = new Map();
  for (const input of decisionInputs) {
    assert.equal(input.target.kind, 'ProjectActualCostRecord', 'Shared allocation correction/consumption is not silently covered by an expense fixture');
    const cost = owned('project_actual_cost_record', input.target.id); assert.equal(cost.project_id, projectId);
    const unit = `cost:${cost.id}`; result.costUnits.push(unit);
    const priorInput = seen.get(unit); if (priorInput) { assert.equal(stable(priorInput), stable(input), 'Same root cannot supply conflicting repeated cost decisions'); continue; } seen.set(unit, input);
    const hRow = rows('project_cost_inclusion_head').find(r => r.value.project_id === projectId && r.value.unit_key === unit);
    if (hRow) assert(ctx.state.owned[keyOf(ctx.database, 'project_cost_inclusion_head', hRow.row.key)], 'Existing composite classification head must also be this run owned');
    const h = hRow?.value;
    const prior = h ? owned('project_cost_inclusion_decision', h.decision_id) : null;
    if (prior && unchangedDecision(input, prior)) continue;
    result.decisionInserts.push({ unit, headEvent: h ? 'UPDATE' : 'INSERT' });
    if (input.decision === 'include' && cost.is_included_in_project_cost !== true) {
      assert.equal(input.recognitionRole, 'direct-source'); assert.equal(cost.record_status, 'confirmed'); result.costUpdates.push(cost.id);
    }
  }
  if(historical273&&!result.costUnits.length){
    assert.equal(owned('project',projectId).row_version,body.expectedProjectVersion,'Actual project CAS cannot be stale');if(head)assert(ctx.state.owned[keyOf(ctx.database,'project_operating_head',[projectId])]);
    const selectedMembers=result.currentSnapshotId?rows('operating_snapshot_cost_member').filter(r=>r.value.snapshot_id===result.currentSnapshotId):null;if(selectedMembers){const selected=owned('project_operating_snapshot',result.currentSnapshotId);assert.equal(selected.project_id,projectId);assert.equal(selected.status,'active');assert.equal(selected.producer_version,1);assert.equal(selected.period_end_snapshot_id,null);assert.equal(periodProof.preparation.officialSnapshotRef.rowVersion,selected.row_version);assert(selectedMembers.length>0);assert.equal(new Set(selectedMembers.map(r=>r.value.unit_key)).size,selectedMembers.length);for(const member of selectedMembers)assert.equal(member.value.project_id,projectId);assert.deepEqual(sorted(selectedMembers.map(r=>r.value.unit_key)),sorted(periodProof.units.map(x=>x.unit)),'Complete real period/current unit sets must match; never trim');}
    for(const input of periodProof.units){const ref=input.row.sourceRef,allocation=ref.kind==='SharedCostAllocationResult',source=owned(allocation?'shared_cost_allocation_result':'project_actual_cost_record',ref.id);assert.equal(source.project_id,projectId);assert.equal(source.row_version,ref.rowVersion);const heads=rows('project_cost_inclusion_head').filter(r=>r.value.project_id===projectId&&r.value.unit_key===input.unit);assert.equal(heads.length,1);assert(ctx.state.owned[keyOf(ctx.database,'project_cost_inclusion_head',heads[0].row.key)]);const decision=owned('project_cost_inclusion_decision',heads[0].value.decision_id);assert.equal(decision.project_id,projectId);assert.equal(decision.unit_key,input.unit);assert.equal(decision.source_row_version,ref.rowVersion);assert.equal(decision.cost_record_id,allocation?null:ref.id);assert.equal(decision.allocation_result_id,allocation?ref.id:null);assert.deepEqual(decision.frozen_payload.sourceRef,ref);assert.equal(input.row.currentDecisionRef?.id,decision.id);assert.equal(input.row.currentDecisionRef.rowVersion,decision.row_version);if(selectedMembers){const member=selectedMembers.find(r=>r.value.unit_key===input.unit);assert(ctx.state.owned[keyOf(ctx.database,'operating_snapshot_cost_member',member.row.key)]);assert.equal(member.value.decision_id,decision.id);assert.equal(member.value.captured_source_version,ref.rowVersion);assert.equal(member.value.captured_payload_hash,ref.payloadHash);}result.costUnits.push(input.unit);}
  }
  if (!historical273&&!result.costUnits.length && result.snapshotMode === 'period-end') {
    // A preclassified period does not consume every historical inclusion head.
    // Use the actual selected live capture, and require every selected unit's
    // current source/version/decision to be unchanged. The external period
    // preflight also compares this whole set to the actual period preparation.
    assert(result.currentSnapshotId, 'This bounded positive period fixture requires a real selected live capture');
    const selected = owned('project_operating_snapshot', result.currentSnapshotId);
    assert.equal(selected.project_id, projectId); assert.equal(selected.status, 'active');
    assert.equal(selected.producer_version, 1); assert.equal(selected.period_end_snapshot_id, null);
    assert.equal(periodProof.preparation.officialSnapshotRef.rowVersion, selected.row_version);
    const members = rows('operating_snapshot_cost_member').filter(r => r.value.snapshot_id === selected.id);
    assert(members.length, 'An empty current capture cannot certify cost membership FI');
    assert.equal(new Set(members.map(r => r.value.unit_key)).size, members.length);
    for (const member of members) {
      assert(ctx.state.owned[keyOf(ctx.database, 'operating_snapshot_cost_member', member.row.key)]);
      const value = member.value; assert.equal(value.project_id, projectId);
      const match = /^(cost|allocation):([0-9a-f-]{36})$/.exec(value.unit_key); assert(match); uuid(match[2]);
      const source = owned(match[1] === 'cost' ? 'project_actual_cost_record' : 'shared_cost_allocation_result', match[2]);
      assert.equal(source.project_id, projectId); assert.equal(source.row_version, value.captured_source_version);
      const heads = rows('project_cost_inclusion_head').filter(r => r.value.project_id === projectId && r.value.unit_key === value.unit_key);
      assert.equal(heads.length, 1); assert(ctx.state.owned[keyOf(ctx.database, 'project_cost_inclusion_head', heads[0].row.key)]);
      assert.equal(heads[0].value.decision_id, value.decision_id, 'Current classification changed after the selected capture');
      const decision = owned('project_cost_inclusion_decision', value.decision_id); assert.equal(decision.project_id, projectId);
      assert.equal(decision.unit_key, value.unit_key); assert.equal(decision.source_row_version, value.captured_source_version);
      assert.equal(decision.cost_record_id, match[1] === 'cost' ? match[2] : null); assert.equal(decision.allocation_result_id, match[1] === 'allocation' ? match[2] : null);
      const frozen = decision.frozen_payload?.sourceRef; assert.equal(frozen?.id, match[2]);
      assert.equal(frozen.kind, match[1] === 'cost' ? 'ProjectActualCostRecord' : 'SharedCostAllocationResult');
      assert.equal(frozen.rowVersion, value.captured_source_version); assert.equal(frozen.payloadHash, value.captured_payload_hash);
      const prepared = periodProof.units.find(item => item.unit === value.unit_key); assert(prepared, 'Period preparation omitted an actual selected cost unit');
      assert.deepEqual(prepared.row.sourceRef, frozen); assert.equal(prepared.row.currentDecisionRef?.id, decision.id);
      assert.equal(prepared.row.currentDecisionRef.rowVersion, decision.row_version);
      result.costUnits.push(value.unit_key);
    }
  }
  if (!result.costUnits.length) result.costUnits = values('project_cost_inclusion_head').filter(r => r.project_id === projectId).map(r => r.unit_key);
  result.costUnits = sorted(result.costUnits); assert(result.costUnits.length, 'Do not claim cost membership FI for an empty/unproven cost-scope case');
  if (periodProof) assert.deepEqual(result.costUnits, sorted(periodProof.units.map(value => value.unit)), 'The complete period preparation and current membership must have exactly the same units');
  result.costUpdates = sorted(result.costUpdates); result.decisionInserts.sort((a, b) => a.unit.localeCompare(b.unit)); return result;
}
