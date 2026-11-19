import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha, operationMap, exactPath } from './business/pure.mjs';
import { capture, loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
const ctx = createContext({ epoch: 'g2-business10', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'reconcile-rejected-a05-difference-review52' }) + '\n', { flag: 'wx', mode: 0o600 });
const pins = {
  '002178-http-request.json': '3fd8891f0fee3c9245425760c89aaf2077ce2b3bf17bcde9e8a492eb803ce12a',
  '002178-http-request-body.bin': 'bfa95a996378c6fe39b90e998744ce2bc151452d97ae33f94c56219667a2b231',
  '002178-http-response-headers.json': '760e5d66ed7a0511096c6401d6b9dfd2296c6116a74e8eb46a2939c0cfcc5547',
  '002179-ledger.json': '0858927eb0815c7dfe428d4b897211c029aa0137658e09021675d7afb9b674aa',
};
const read = name => { const bytes = fs.readFileSync(`${ctx.priv}/${name}`); assert.equal(sha(bytes), pins[name]); return JSON.parse(bytes); };
try {
  assert(!ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
  const record = ctx.state.fixtures.a05Boundaries26.views['max-zero'], f = record.fixtures;
  assert(!record.rejectedDifferenceReview52 && record.stages['sources'].phase === 'verified' && record.stages['summary'].phase === 'verified');
  assert.equal(record.stages['contract-prepare'].phase, 'running'); assert(!f.contractPrepareComplete);
  assert.equal(f.contractRuns.length, 1); const slot = f.contractRuns[0]; assert(slot.readiness && slot.diffHistory && !slot.diffReview && !slot.submitted);
  const request = read('002178-http-request.json'), ledger = read('002179-ledger.json'), op = 'ContractReadinessController_reviewDiff';
  read('002178-http-request-body.bin');
  assert.equal(request.operationId, op); assert.equal(ledger.operationId, op); assert.equal(ledger.requestId, request.requestId);
  assert(ledger.ownershipComplete); assert.deepEqual(ledger.blockers, []); assert.equal(read('002178-http-response-headers.json').status, 400);
  const apiOperation = operationMap(JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`))).get(op);
  assert.equal(request.url, ctx.api + exactPath(apiOperation.template, { id: f.baseline.id }));
  const before = loadSnapshot(ctx, ledger.before), after = loadSnapshot(ctx, ledger.after), fresh = await capture(ctx, ctx.next('a05-review52-current'));
  assertRecorded(ctx, fresh);
  const identity = input => readRows(input).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
  for (const database of ctx.databases) {
    for (const table of Object.keys(after.databases[database].tables)) {
      assert.deepEqual(identity(after.databases[database].tables[table]), identity(fresh.databases[database].tables[table]));
      if (!(database === ctx.database && ['auth_session', 'audit_log', 'security_event'].includes(table))) assert.deepEqual(identity(before.databases[database].tables[table]), identity(after.databases[database].tables[table]));
    }
    assert.deepEqual(after.databases[database].meta, fresh.databases[database].meta); assert.deepEqual(after.objects[database], fresh.objects[database]);
  }
  const originalStage = structuredClone(record.stages['contract-prepare']);
  const receipt = ctx.artifact(`${ctx.next('a05-review52-reconciled')}.json`, { kind: 'metadata-only-known-rejected-A05-review-checkpoint', pins, originalStage,
    original400Preserved: true, actualRejectedReviewChangedNoBusinessRowsOrXmin: true, freshObservation: fresh.manifest,
    actualR3SummaryPricingAndReadinessRetained: true, realDifferenceReviewStillRequired: true, rootCauseDisposition: 'separate-request-contract-investigation',
    HTTPRequestsSent: 0, businessSQLWrites: 0, G3Certified: false },
  { kind: 'rejected-A05-review-checkpoint-reconciled', original400Preserved: true, existingReadinessMustNotRecreate: true, realReviewStillRequired: true });
  record.rejectedDifferenceReview52 = receipt;
  delete record.stages['contract-prepare']; ctx.persist();
  console.log(JSON.stringify({ status: 'reconciled', HTTPRequestsSent: 0, businessSQLWrites: 0, original400Preserved: true, realReviewStillRequired: true }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('a05-review52-failed')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed', privateOriginal: original })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
