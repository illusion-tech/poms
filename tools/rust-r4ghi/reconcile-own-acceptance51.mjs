import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha, keyOf, operationMap, exactPath } from './business/pure.mjs';
import { capture, loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
const ctx = createContext({ epoch: 'g2-business10', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'reconcile-owned-acceptance-project-CAS51' }) + '\n', { flag: 'wx', mode: 0o600 });
const pins = {
  '002032-http-request.json': 'b10b325c15e350ea19bd0fa466a2a3f6e27a2f191cc3759d260bc8beaf68a5e3',
  '002032-http-request-body.bin': 'b81a25fb0b19f7576373d8b3d3ad931321b63ac26c9328d9d85d97591ed85ae7',
  '002032-http-response-body.bin': '329b3591b44778defa904d3885d3f41a4e77847992c1827b9a533286687e3acd',
  '002032-http-response-headers.json': 'd6512b59e21a2898bd1f5bcd12381432f910257714d06594b22a5f3b31aec6d6',
  '002033-ledger.json': '860fb6856215aed1e04bb3f4816966594485a01734636b99528445d84f3e8ecd',
};
const read = name => { const bytes = fs.readFileSync(`${ctx.priv}/${name}`); assert.equal(sha(bytes), pins[name]); return JSON.parse(bytes); };
try {
  assert(!ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
  assert.equal(ctx.state.blockedObservation?.file, `${ctx.priv}/002033-ledger.json`);
  assert.equal(ctx.state.blockedObservation.rawBytesSha256, pins['002033-ledger.json']);
  const record = ctx.state.fixtures.uiFixtureViews23.own, f = record.fixtures;
  assert(!record.acceptanceRecovery51 && !f.finalAcceptance && !f.completion && !f.lifecycleComplete);
  assert.equal(record.stages['conditional-completion-before-own-list']?.phase, 'running');
  const previous = read('002033-ledger.json'), request = read('002032-http-request.json'), body = read('002032-http-request-body.bin');
  const response = read('002032-http-response-body.bin');
  const op = 'ProjectController_createAcceptanceRecord', actor = ctx.state.actors.execution;
  assert.equal(previous.operationId, op); assert.equal(previous.requestId, request.requestId);
  assert.equal(request.operationId, op); assert.equal(read('002032-http-response-headers.json').status, 201);
  const apiOperation = operationMap(JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`))).get(op);
  assert.equal(request.url, ctx.api + exactPath(apiOperation.template, { projectId: f.project.id }));
  assert.notEqual(f.project.id, ctx.state.fixtures.project.id);
  assert.deepEqual(previous.blockers, [{ kind: 'owned-mutation-not-in-command-allowlist', table: 'project', key: [f.project.id] }]);
  assert.equal(response.projectId, f.project.id); assert.equal(response.acceptanceType, 'final-acceptance'); assert.equal(response.acceptanceResult, 'conditional');
  assert.equal(response.sourceStageRecordId, f.acceptanceEntry.projectStageRecordId); assert.equal(response.createdBy, actor.id);
  const before = loadSnapshot(ctx, previous.before), after = loadSnapshot(ctx, previous.after);
  const old = readRows(before.databases[ctx.database].tables.project).find(row => row.key[0] === f.project.id);
  const current = readRows(after.databases[ctx.database].tables.project).find(row => row.key[0] === f.project.id);
  assert(old && current); const a = JSON.parse(old.raw), b = JSON.parse(current.raw);
  assert.equal(body.expectedProjectVersion, a.row_version); assert.equal(b.row_version, a.row_version + 1); assert.equal(b.updated_by, actor.id);
  assert(Date.parse(b.updated_at) > Date.parse(a.updated_at));
  const stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['row_version', 'updated_at', 'updated_by'].includes(key)));
  assert.deepEqual(stable(a), stable(b), 'Acceptance may change only its exact project CAS metadata');
  const ownership = ctx.state.owned[keyOf(ctx.database, 'project', [f.project.id])];
  assert(ownership && ownership.latestSha256 === old.sha256 && ownership.latestXmin === old.xmin);
  const accepted = readRows(after.databases[ctx.database].tables.acceptance_record).find(row => row.key[0] === response.id); assert(accepted);
  assert.equal(accepted.xmin, current.xmin); assert(!readRows(before.databases[ctx.database].tables.acceptance_record).some(row => row.key[0] === response.id));
  const audits = readRows(after.databases[ctx.database].tables.audit_log).filter(row => {
    const value = JSON.parse(row.raw); return value.request_id === request.requestId && value.event_type === op && value.operator_id === actor.id && value.result === 'success';
  });
  assert.equal(audits.length, 1); assert.equal(audits[0].xmin, current.xmin);
  const fresh = await capture(ctx, ctx.next('own-acceptance51-current'));
  const identities = input => readRows(input).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
  for (const database of ctx.databases) {
    for (const table of Object.keys(after.databases[database].tables)) assert.deepEqual(identities(after.databases[database].tables[table]), identities(fresh.databases[database].tables[table]));
    assert.deepEqual(after.databases[database].meta, fresh.databases[database].meta); assert.deepEqual(after.objects[database], fresh.objects[database]);
  }
  const originalStage = structuredClone(record.stages['conditional-completion-before-own-list']);
  const recovery = ctx.artifact(`${ctx.next('own-acceptance51-proof')}.json`, { kind: 'metadata-only-already-committed-own-spare-acceptance-reconciliation', pins,
    originalBlockedLedger: ctx.state.blockedObservation, originalStage, freshObservation: fresh.manifest, exactProjectCASOnly: true,
    sameActualAcceptanceAuditProjectXmin: current.xmin, HTTPRequestsSent: 0, businessSQLWrites: 0, acceptanceMustNotReplay: true, G3Certified: false },
  { kind: 'actual-committed-own-spare-acceptance-proved', projectCASOnly: true, HTTPRequestsSent: 0, businessSQLWrites: 0, originalFailurePreserved: true });
  ctx.own(ctx.database, 'project', current, { kind: 'HTTP-owned-row-update-reconciled', transport: 'HTTP', requestId: request.requestId, operationId: op,
    beforeSha256: old.sha256, beforeSnapshot: previous.before, afterSnapshot: previous.after, exactRequestBinding: 'path:projectId', metadataOnlyRecovery: recovery });
  assertRecorded(ctx, fresh);
  const resolved = ctx.artifact(`${ctx.next('ledger')}.json`, { ...previous, originalBlockedLedger: ctx.state.blockedObservation,
    recorded: [...previous.recorded, { kind: 'owned-update', table: 'project', key: current.key, metadataOnlyRecovery: recovery }],
    blockers: [], ownershipComplete: true, metadataOnlyRecovery: recovery, originalFailureRewritten: false },
  { kind: 'exact-owned-command-observation-reconciled', operationId: op, ownershipComplete: true, businessRequestsReplayed: 0 });
  record.acceptanceRecovery51 = { proof: recovery, resolvedLedger: resolved };
  f.finalAcceptance = response;
  delete record.stages['conditional-completion-before-own-list'];
  delete ctx.state.blockedObservation; ctx.persist();
  console.log(JSON.stringify({ status: 'reconciled', HTTPRequestsSent: 0, businessSQLWrites: 0, exactProjectCASOnly: true, acceptanceMustNotReplay: true }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('own-acceptance51-failed')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed', privateOriginal: original })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
