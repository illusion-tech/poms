import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, keyOf, uuid } from './pure.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { assertSweepRollback } from './fault-sweep.mjs';

const operationId = 'CommissionController_createRoleAssignment';
const participantTable = 'commission_role_assignment_participant';
const assignmentTable = 'commission_role_assignment';

function pinned58(ctx, pin) {
  assert(pin && typeof pin.file === 'string' && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const relative = path.relative(fs.realpathSync(ctx.priv), fs.realpathSync(pin.file));
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes);
}

export function buildFrozenProbes58(frozen, draft, participants) {
  assert.equal(frozen.status, 'frozen'); assert.equal(frozen.producer_version, 1);
  assert.equal(draft.status, 'draft'); assert.equal(draft.producer_version, 1); assert.equal(draft.is_current, true);
  assert.notEqual(frozen.id, draft.id); assert.notEqual(frozen.project_id, draft.project_id);
  const own = participants.filter(row => row.assignment_id === frozen.id), zero = own.find(row => row.weight_units === 0 && typeof row.zero_weight_reason === 'string' && row.zero_weight_reason.trim());
  assert(zero, 'Main must contain a genuine frozen zero-weight participant; never manufacture one');
  const positive = own.find(row => row.weight_units > 0); assert(positive);
  const otherUser = own.find(row => row.user_id !== zero.user_id); assert(otherUser);
  const otherRole = own.find(row => row.role_type !== zero.role_type && !own.some(item => item.user_id === zero.user_id && item.role_type === row.role_type));
  assert(otherRole, 'Use an actual distinct role already produced in this assignment');
  return [
    { key: 'zero-reparent-to-draft', participantId: zero.id, field: 'assignment_id', beforeValue: frozen.id, afterValue: draft.id, expectedMessage: 'assignment participant cannot be reparented' },
    { key: 'positive-reparent-to-draft', participantId: positive.id, field: 'assignment_id', beforeValue: frozen.id, afterValue: draft.id, expectedMessage: 'assignment participant cannot be reparented' },
    { key: 'frozen-user-identity', participantId: zero.id, field: 'user_id', beforeValue: zero.user_id, afterValue: otherUser.user_id, expectedMessage: 'frozen assignment participants immutable' },
    { key: 'frozen-role-identity', participantId: zero.id, field: 'role_type', beforeValue: zero.role_type, afterValue: otherRole.role_type, expectedMessage: 'frozen assignment participants immutable' },
    { key: 'frozen-zero-weight', participantId: zero.id, field: 'weight_units', beforeValue: 0, afterValue: 1, expectedMessage: 'frozen assignment participants immutable' },
  ];
}

export function exactFrozenFailure58(failure, expectedMessage) {
  assert(failure, 'Controlled DML must be rejected, not merely rolled back by the test');
  assert.equal(failure.code, '23514'); assert.equal(failure.message, expectedMessage);
}

export function frozenProbeLabel58(index, phase) {
  assert(Number.isInteger(index) && index >= 0 && index < 5); assert(['before', 'after'].includes(phase));
  return `f58-c${index + 1}-${phase}`;
}
export function assertFrozenResumeCases58(record, completedFirstCase) {
  assert(!record.proof); assert.deepEqual(Object.keys(record.cases), ['zero-reparent-to-draft']);
  assert.equal(completedFirstCase.phase, 'verified'); assert.equal(completedFirstCase.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true); assert.equal(completedFirstCase.rollback.catalogSequencesAndObjectsUnchanged, true);
  assert.deepEqual(record.cases['zero-reparent-to-draft'], completedFirstCase, 'The original completed case1 is immutable; no clearing or replay');
}

// Called serially by the real Linux UI observer after canonical create200 and its ledger,
// before forwarding that actual response to Chrome. No HTTP or new driver here.
export async function probeFrozenReparent58(ctx, { draftAssignmentId, projectId, createReceipt, createLedger }) {
  return runFrozenReparent58(ctx, { draftAssignmentId, projectId, createReceipt, createLedger }, null);
}
export async function continueFrozenReparent58(ctx, args, continuation) {
  assert.equal(args.draftAssignmentId, '1817b9ae-ec3a-4910-aebd-07a2b6963975'); assert.equal(args.projectId, '389793fb-0f5b-48ea-a5f1-8515ee572d7f');
  assert.equal(continuation.kind, 'exact-case1-preserving-frozen58-continuation03'); assert(continuation.initial?.manifest); assert(/^[a-f0-9]{64}$/.test(continuation.approvedPlanSHA256));
  return runFrozenReparent58(ctx, args, continuation);
}
async function runFrozenReparent58(ctx, { draftAssignmentId, projectId, createReceipt, createLedger }, continuation) {
  assert.equal(process.platform, 'linux'); uuid(draftAssignmentId); uuid(projectId);
  const lock = JSON.parse(fs.readFileSync(`${ctx.priv}/driver.lock`)); assert.equal(lock.pid, process.pid, 'Run inside the actual serial UI observer, not another driver');
  assert(ctx.state.baseline && !ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned);
  const sources = JSON.parse(fs.readFileSync(new URL('./frozen-reparent-sources58.json', import.meta.url)));
  for (const source of sources) assert.equal(ctx.pins.find(pin => pin.file === source.file)?.sha256, source.sha256, `Frozen-role source changed: ${source.file}`);
  const original = pinned58(ctx, createReceipt), ledger = pinned58(ctx, createLedger), attempt = original.attempt;
  assert.equal(attempt.operationId, operationId); assert.equal(attempt.status, 200); assert.equal(attempt.expectedStatus, 200);
  assert.equal(attempt.responseComplete, true); assert.equal(attempt.transportFailure, false); assert.equal(attempt.transport, 'actual-owned-Windows-browser-Linux-proxy');
  assert.equal(attempt.pathParams.projectId, projectId); assert.equal(attempt.body.id, draftAssignmentId);
  assert.deepEqual(JSON.parse(Buffer.from(original.bodyBase64, 'base64')), attempt.body);
  assert.equal(ledger.operationId, operationId); assert.equal(ledger.requestId, attempt.requestId); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
  const mainAssignmentId = uuid(ctx.state.fixtures.roleAssignment.id), mainProjectId = uuid(ctx.state.fixtures.project.id);
  assert.notEqual(projectId, mainProjectId);
  ctx.state.consumerChecks ??= {}; ctx.state.consumerChecks.frozenReparent58 ??= {};
  const store = ctx.state.consumerChecks.frozenReparent58, existing = store[draftAssignmentId];
  if (!continuation && existing?.proof) { assert.deepEqual(existing.createReceipt, createReceipt); assert.deepEqual(existing.createLedger, createLedger); return existing.proof; }
  if (continuation) { assert(existing); assertFrozenResumeCases58(existing, continuation.completedFirstCase); assert.deepEqual(existing, continuation.originalRecord); }
  else assert(!existing, 'An interrupted probe requires exact original reconciliation, never blind rerun');
  const record = continuation ? existing : (store[draftAssignmentId] = { kind: 'actual-controlled-frozen-role-negative-probes', projectId, draftAssignmentId, mainProjectId, mainAssignmentId, createReceipt, createLedger, cases: {} }); ctx.persist();
  const initial = continuation ? continuation.initial : await capture(ctx, ctx.next('frozen58-initial')); assertRecorded(ctx, initial);
  const normative = initial.databases[ctx.database].meta.normative;
  const guard = normative.functions.find(raw => JSON.parse(raw).proname === 'jghi_assignment_participant_guard'); assert(guard);
  const trigger = normative.triggers.find(raw => { const value = JSON.parse(raw); return value.table_name === participantTable && value.tgname === 'jghi_frozen_participant' && value.tgenabled === 'O'; }); assert(trigger);
  if (continuation) { assert.equal(record.actualGuard.functionSHA256, sha(guard)); assert.equal(record.actualGuard.triggerSHA256, sha(trigger)); }
  else { record.actualGuard = { initial: initial.manifest, functionSHA256: sha(guard), triggerSHA256: sha(trigger) }; ctx.persist(); }
  const rows = table => readRows(initial.databases[ctx.database].tables[table]);
  const actualRow = (table, id) => { const row = rows(table).find(item => item.key.length === 1 && item.key[0] === id); assert(row); const owned = ctx.state.owned[keyOf(ctx.database, table, [id])]; assert(owned && !owned.deleted && owned.latestSha256 === row.sha256 && owned.latestXmin === row.xmin, 'Probe may only address exact realOwned rows'); return row; };
  const frozenRow = actualRow(assignmentTable, mainAssignmentId), draftRow = actualRow(assignmentTable, draftAssignmentId);
  const frozen = JSON.parse(frozenRow.raw), draft = JSON.parse(draftRow.raw);
  assert.equal(frozen.project_id, mainProjectId); assert.equal(draft.project_id, projectId);
  const birth = ctx.state.owned[keyOf(ctx.database, assignmentTable, [draftAssignmentId])];
  assert.equal(birth.proof.requestId, attempt.requestId); assert.equal(birth.proof.operationId, operationId); assert.equal(birth.proof.beforeAbsent, true);
  assert.equal(birth.firstSha256, draftRow.sha256); assert.equal(birth.latestProof.requestId, attempt.requestId);
  const freezePayload = actualRow('commission_role_assignment_freeze_payload', mainAssignmentId);
  assert.equal(frozen.freeze_payload_id, mainAssignmentId); assert.equal(JSON.parse(freezePayload.raw).project_id, mainProjectId);
  const participants = rows(participantTable).map(row => JSON.parse(row.raw)), probes = buildFrozenProbes58(frozen, draft, participants);
  assert(participants.some(row => row.assignment_id === draftAssignmentId), 'Destination draft must have its real UI-created participant set');
  for (const probe of probes) actualRow(participantTable, probe.participantId);
  const fields = { assignment_id: 'uuid', user_id: 'uuid', role_type: 'text', weight_units: 'integer' };
  for (const [index, probe] of probes.entries()) {
    if (continuation && index === 0) { assert.deepEqual(record.cases[probe.key], continuation.completedFirstCase); continue; }
    assert(!record.cases[probe.key], 'Never replay an already starting/pending/verified remaining case');
    const before = await capture(ctx, ctx.next(frozenProbeLabel58(index, 'before'))); assertRecorded(ctx, before);
    const intent = ctx.artifact(`${ctx.next('frozen58-intent')}.json`, { probe, frozen: { id: mainAssignmentId, projectId: mainProjectId }, draft: { id: draftAssignmentId, projectId }, before: before.manifest, createReceipt, createLedger, onlyControlledDMLAndRollback: true });
    record.cases[probe.key] = { phase: 'DML-starting', intent }; ctx.persist();
    let failure = null, infrastructureFailure = null, control;
    try {
      control = await ctx.client(); await control.query('BEGIN');
      const parents = (await control.query('SELECT id::text,status,producer_version FROM poms.commission_role_assignment WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[mainAssignmentId, draftAssignmentId]])).rows;
      assert.equal(parents.length, 2); assert.equal(parents.find(row => row.id === mainAssignmentId).status, 'frozen'); assert.equal(parents.find(row => row.id === draftAssignmentId).status, 'draft');
      const live = (await control.query('SELECT row_to_json(p)::text AS raw,p.xmin::text AS xmin FROM poms.commission_role_assignment_participant p WHERE p.id=$1::uuid AND p.assignment_id=$2::uuid FOR UPDATE', [probe.participantId, mainAssignmentId])).rows;
      assert.equal(live.length, 1); const captured = readRows(before.databases[ctx.database].tables[participantTable]).find(row => row.key[0] === probe.participantId);
      assert.equal(sha(live[0].raw), captured.sha256); assert.equal(live[0].xmin, captured.xmin);
      const field = probe.field; assert(Object.hasOwn(fields, field));
      try { await control.query(`UPDATE poms.commission_role_assignment_participant SET ${field}=$1::${fields[field]} WHERE id=$2::uuid AND assignment_id=$3::uuid`, [probe.afterValue, probe.participantId, mainAssignmentId]); }
      catch (error) { failure = { code: error.code, message: error.message, severity: error.severity, routine: error.routine, where: error.where }; }
    } catch (error) { infrastructureFailure = { name: error.name, code: error.code, message: error.message }; }
    finally {
      if (control) {
        try { await control.query('ROLLBACK'); } catch (error) { infrastructureFailure ??= { name: error.name, code: error.code, message: error.message }; }
        try { await control.end(); } catch (error) { infrastructureFailure ??= { name: error.name, code: error.code, message: error.message }; }
      }
    }
    const after = await capture(ctx, ctx.next(frozenProbeLabel58(index, 'after')));
    const observation = ctx.artifact(`${ctx.next('frozen58-observation')}.json`, { intent, before: before.manifest, after: after.manifest, failure, infrastructureFailure, commitAttempted: false });
    record.cases[probe.key] = { phase: 'proof-pending', intent, observation }; ctx.persist();
    try {
      assert.equal(infrastructureFailure, null); exactFrozenFailure58(failure, probe.expectedMessage);
      const rollback = assertSweepRollback(ctx, before, after, { sessionId: null }, null); assertRecorded(ctx, after);
      record.cases[probe.key] = { phase: 'verified', intent, observation, rollback }; ctx.persist();
    } catch (error) { ctx.state.blockedObservation = observation; ctx.persist(); throw error; }
  }
  record.proof = ctx.artifact(`${ctx.next('frozen58-proof')}.json`, { kind: 'actual-frozen-zero-and-positive-reparent-to-real-draft-and-identity-weight-23514', mainProjectId, mainAssignmentId, projectId, draftAssignmentId,
    cases: record.cases, createReceipt, createLedger, actualCaseCount: probes.length, actualGuard: record.actualGuard, sourcePins: sources,
    ...(continuation ? { resume58_03: { approvedPlanSHA256: continuation.approvedPlanSHA256, reconciliation: continuation.reconciliation, originalCompletedCasePreserved: true, remainingActualCaseCount: 4 } } : {}),
    SQLFixtureOrCommittedDML: false, allRowsAndXminUnchangedAfterEachRollback: true, oldProducerRecordWritten: false, G3Certified: false, G4Certified: false });
  ctx.persist(); return record.proof;
}
