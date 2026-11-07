import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha, operationMap, exactPath } from './business/pure.mjs';
import { capture, loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
const ctx = createContext({ epoch: 'g2-business10', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'reconcile-known-approval-auth-stop45' }) + '\n', { flag: 'wx', mode: 0o600 });
const pins = {
  '001177-http-request.json': '0d46f09e8d57f6573763b4962ce4ed7d52fde8e5d5e7b2398e7c6c6cc36c082b',
  '001177-http-response-headers.json': '1ac85a85aeba57a9aba1ca1b035f9121d861063d4b4f6d7e926004464a2a920c',
  '001178-ledger.json': 'b47f8d646875c8823749919800cdd166fdda76bc969ba2150bb8e015f2622003',
};
const read = name => { const bytes = fs.readFileSync(`${ctx.priv}/${name}`); assert.equal(sha(bytes), pins[name]); return JSON.parse(bytes); };
try {
  assert(!ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
  const record = ctx.state.fixtures.efReceiver40, f = record?.fixtures;
  assert(record && f && !record.approvalAuthStopReconciliation45 && f.contractPrepareComplete && !f.contractFinishComplete);
  for (const key of ['project-sources', 'summary', 'contract-prepare']) assert.equal(record.stages[key]?.phase, 'verified');
  assert.equal(record.stages['contract-finish']?.phase, 'running');
  const request = read('001177-http-request.json'), ledger = read('001178-ledger.json');
  const op = 'ApprovalController_approveRecord';
  assert.equal(request.operationId, op); assert.equal(ledger.operationId, op);
  assert.equal(ledger.requestId, request.requestId); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
  assert.equal(read('001177-http-response-headers.json').status, 401);
  const pub = JSON.parse(fs.readFileSync(`${ctx.out}/001177-http-http.json`));
  assert.equal(pub.status, 401); assert.equal(pub.expectedStatus, 200); assert(pub.responseComplete && !pub.transportFailure);
  const actor = ctx.state.actors[pub.actorKey]; assert(actor?.borrowedSeedUser && actor.id);
  const apiOperation = operationMap(JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`))).get(op);
  const slots = f.contractRuns.filter(slot => slot.approval?.id && request.url === ctx.api + exactPath(apiOperation.template, { id: slot.approval.id }));
  assert.equal(slots.length, 1); const slot = slots[0];
  assert.equal(slot.approval.currentStatus, 'pending'); assert.equal(slot.approval.currentApproverUserId, actor.id);
  assert.equal(slot.submitted.approvalRecordId, slot.approval.id); assert(!slot.activated && !slot.plan);
  const before = loadSnapshot(ctx, ledger.before), after = loadSnapshot(ctx, ledger.after), fresh = await capture(ctx, ctx.next('approval45-current'));
  assertRecorded(ctx, fresh);
  const identity = input => readRows(input).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
  for (const database of ctx.databases) {
    for (const table of Object.keys(after.databases[database].tables)) {
      assert.deepEqual(identity(after.databases[database].tables[table]), identity(fresh.databases[database].tables[table]));
      if (!(database === ctx.database && ['auth_session', 'audit_log', 'security_event'].includes(table))) assert.deepEqual(identity(before.databases[database].tables[table]), identity(after.databases[database].tables[table]));
    }
    assert.deepEqual(after.databases[database].meta, fresh.databases[database].meta);
    assert.deepEqual(after.objects[database], fresh.objects[database]);
  }
  const originalStage = structuredClone(record.stages['contract-finish']);
  const receipt = ctx.artifact(`${ctx.next('approval-auth45-reconciled')}.json`, { kind: 'metadata-only-known-designated-approval-auth-stop', pins, originalStage,
    original401Preserved: true, actualPendingApprovalUnchanged: true, existingSubmissionRetained: true, newApprovalStillRequired: true,
    freshObservation: fresh.manifest, allCurrentRowsXminCatalogObjectsMatchLastAfter: true, HTTPRequestsSent: 0, businessSQLWrites: 0, G3Certified: false },
  { kind: 'known-designated-approval-auth-stop-reconciled', businessRequestsReplayed: 0, submissionMustNotReplay: true, original401Preserved: true });
  record.approvalAuthStopReconciliation45 = receipt;
  delete record.stages['contract-finish']; ctx.persist();
  console.log(JSON.stringify({ status: 'reconciled', HTTPRequestsSent: 0, businessSQLWrites: 0, existingSubmissionRetained: true }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('approval-auth45-failed')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed', privateOriginal: original })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
