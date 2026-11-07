import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha, keyOf, data } from './business/pure.mjs';
import { capture, loadSnapshot, readRows, difference } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { deriveGHWriteFacts } from './business/gh-write-facts.mjs';
import { requiredWriteInventory, requireOwnedScope } from './business/required-write-inventory.mjs';
import { verifyFinalWrites } from './business/fault-sweep.mjs';

const ctx = createContext({ epoch: 'g2-business10', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'metadata-only-gate-success-reconciliation41' }) + '\n', { flag: 'wx', mode: 0o600 });
const op = 'ProjectCostController_reviewCommissionGateBinding';
const originals = {
  '001047-http-request.json': '753776ea76241275e5d8cdf04c538db52d071e6ecb9c3e3823ca115cceec4dc1',
  '001047-http-request-body.bin': 'd5a7a1fddb5c82fbd51197630d5834d8cbabac2dfecbd1f2a8dfe8d8dfbd5b7a',
  '001047-http-response-body.bin': 'a597b2b66fdd1dd687dbf61b24963f1437828e63cd5b5bfe5e6db42856cb89f5',
  '001047-http-response-headers.json': '0fbd66e5c132c233f6952d4ae9fd25d5367d44403ea0b5095990a16799715308',
  '001048-ledger.json': '92979378ff376c7d78e3d8d688f1d037e98f18f1b50fc4e91b152ce342dcc62a',
};
const read = name => { const bytes = fs.readFileSync(`${ctx.priv}/${name}`); assert.equal(sha(bytes), originals[name]); return bytes; };
try {
  assert(!ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
  assert.equal(ctx.state.blockedObservation?.file, `${ctx.priv}/001048-ledger.json`);
  assert.equal(ctx.state.blockedObservation.rawBytesSha256, originals['001048-ledger.json']);
  const previous = JSON.parse(read('001048-ledger.json'));
  assert.equal(previous.operationId, op); assert.equal(previous.ownershipComplete, false);
  assert.deepEqual(previous.blockers, [{ kind: 'expected-real-response-ID-missing', table: 'commission_gate_review_record', pointer: '/reviewRecordId' }]);
  const request = JSON.parse(read('001047-http-request.json'));
  const requestBodyBytes = read('001047-http-request-body.bin'), body = JSON.parse(requestBodyBytes);
  const response = JSON.parse(read('001047-http-response-body.bin'));
  assert.equal(JSON.parse(read('001047-http-response-headers.json')).status, 200);
  const value = data({ body: response });
  assert.equal(request.operationId, op); assert.equal(request.requestId, previous.requestId);
  assert.equal(request.method, 'POST');
  const id = ctx.state.fixtures.gateViews.first.bindingId;
  assert.equal(request.url, `http://127.0.0.1:31441/api/commission-gate-bindings/${id}:review`);
  assert.equal(value.targetId, id); assert.equal(value.bindingResultId, id);
  assert(!Object.hasOwn(value, 'reviewRecordId'));
  const before = loadSnapshot(ctx, previous.before), after = loadSnapshot(ctx, previous.after);
  const newReviews = difference(before, after).filter(change => change.database === ctx.database && change.table === 'commission_gate_review_record').flatMap(change => change.added);
  assert.equal(newReviews.length, 1); assert.equal(newReviews[0].key[0], value.gateReviewRecordId);
  const owned = ctx.state.owned[keyOf(ctx.database, 'commission_gate_review_record', newReviews[0].key)];
  assert(owned && owned.latestSha256 === newReviews[0].sha256 && owned.latestXmin === newReviews[0].xmin);
  assert.equal(owned.proof.requestId, request.requestId); assert.equal(owned.proof.operationId, op); assert.equal(owned.proof.transport, 'HTTP');
  const publicFile = `${ctx.out}/001047-http-http.json`, publicBytes = fs.readFileSync(publicFile);
  assert.equal(sha(publicBytes), 'e6e599cc0933e12f35a0305d030f6ee064348e1bdea058afe909a62b180c3092');
  const publicAttempt = JSON.parse(publicBytes);
  assert.equal(publicAttempt.status, 200); assert.equal(publicAttempt.expectedStatus, 200); assert(publicAttempt.responseComplete && !publicAttempt.transportFailure);
  assert.equal(publicAttempt.requestId, request.requestId);
  const bodySHA256 = sha(requestBodyBytes); assert.equal(sha(JSON.stringify(body)), bodySHA256);
  const sweeps = Object.values(ctx.state.requiredWriteSweeps).filter(item => item.operationId === op && item.bodySHA256 === bodySHA256);
  assert.equal(sweeps.length, 1); const sweep = sweeps[0]; assert.equal(sweep.finalSuccess, null);
  const scope = { projectId: ctx.state.fixtures.project.id, actorId: ctx.state.actors.manager.id, actorKey: 'manager', params: { id }, body };
  scope.ghFacts = deriveGHWriteFacts(ctx, before, op, scope, readRows);
  assert.deepEqual(requiredWriteInventory(op, scope), sweep.inventory);
  assert.equal(sweep.inventory.length, 9); assert.equal(sweep.failures.length, 9);
  assert(!ctx.state.fixtures.gateReview);
  assert(ctx.state.fixtures.ghRequiredWriteSweepReceipts && typeof ctx.state.fixtures.ghRequiredWriteSweepReceipts === 'object');
  assert.deepEqual(sweep.failures.map(item => item.key).sort(), sweep.inventory.map(item => item.key).sort());
  for (const item of sweep.failures) {
    const bytes = fs.readFileSync(item.observation.file); assert.equal(sha(bytes), item.observation.rawBytesSha256);
    const proof = JSON.parse(bytes); assert.equal(proof.bodySHA256, bodySHA256);
    assert.deepEqual(proof.descriptor, sweep.inventory.find(descriptor => descriptor.key === item.key));
    assert.equal(proof.failed.fault.hitCount, 1); assert.equal(proof.failed.fault.fallbackHitCount, 0);
    assert.equal(proof.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true);
  }
  const actualSuccesses = fs.readdirSync(ctx.out).filter(name => /-http-http\.json$/.test(name)).map(name => JSON.parse(fs.readFileSync(`${ctx.out}/${name}`)))
    .filter(item => item.operationId === op && item.status === 200 && item.originals.requestBody.rawBytesSha256 === bodySHA256);
  assert.equal(actualSuccesses.length, 1); assert.equal(actualSuccesses[0].requestId, request.requestId);
  const scopeSession = requireOwnedScope(ctx, before, scope);
  const successful = { operationId: op, requestId: request.requestId, status: 200, expectedStatus: 200, actorKey: 'manager', actorId: scope.actorId,
    pathParams: { id }, requestValue: body, requestBodySha256: bodySHA256, responseComplete: true, transportFailure: false, body: response,
    receiptId: publicFile, before: previous.before, after: previous.after, ledger: ctx.state.blockedObservation };
  const transaction = verifyFinalWrites(ctx, before, after, successful, sweep.inventory, scopeSession);
  const fresh = await capture(ctx, ctx.next('gate-reconcile41-current'));
  assertRecorded(ctx, fresh); assert.equal(difference(after, fresh).length, 0);
  for (const database of ctx.databases) {
    assert.deepEqual(Object.keys(after.databases[database].tables), Object.keys(fresh.databases[database].tables));
    for (const table of Object.keys(after.databases[database].tables)) {
      const identities = input => readRows(input).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }))
        .sort((left, right) => JSON.stringify(left.key).localeCompare(JSON.stringify(right.key)));
      assert.deepEqual(identities(after.databases[database].tables[table]), identities(fresh.databases[database].tables[table]),
        `Original committed rows/xmin changed: ${database}.${table}`);
    }
    assert.deepEqual(after.databases[database].meta, fresh.databases[database].meta);
    assert.deepEqual(after.objects[database], fresh.objects[database]);
  }
  const recovery = ctx.artifact(`${ctx.next('gate-success-reconciliation41')}.json`, { kind: 'metadata-only-reconciliation-of-already-committed-gate-review',
    originals, originalFailedOwnershipLedger: ctx.state.blockedObservation, canonicalResponsePointer: '/gateReviewRecordId',
    originalHTTPReceipt: publicFile, originalTransaction: transaction, freshObservation: fresh.manifest,
    allRowsAndXminCatalogSequencesObjectsMatchOriginalAfter: true, businessSQLWrites: 0, HTTPRequestsSent: 0, originalFailureRewritten: false,
    G3Certified: false, G4Certified: false }, { kind: 'actual-metadata-only-gate-success-reconciled', originalFailurePreserved: true, businessSQLWrites: 0, HTTPRequestsSent: 0 });
  sweep.finalSuccess = { receipt: publicFile, requestId: request.requestId, status: 200, postconditions: 'verified', transaction,
    metadataOnlyRecovery: recovery, originalSuccessfulRequestReplayed: false };
  const receipt = ctx.artifact(`${ctx.next('gate-sweep-reconciled41')}.json`, { ...sweep, successfulRequestsInThisSweep: 1, sameBodyAcrossEveryAttempt: true,
    source: 'original-001047-HTTP200-with-metadata-only-reconciliation', originalFailurePreserved: true },
  { kind: 'actual-gate-required-write-sweep-reconciled', requiredWriteFamilies: 9, actualOneHitFailures: 9, successfulRequests: 1, businessRequestsReplayed: 0 });
  ctx.state.fixtures.gateReview = value;
  ctx.state.fixtures.ghRequiredWriteSweepReceipts[`${op}:${id}`] = receipt;
  ctx.state.gateSuccessRecovery41 = recovery;
  delete ctx.state.blockedObservation; ctx.persist();
  console.log(JSON.stringify({ status: 'reconciled', HTTPRequestsSent: 0, businessSQLWrites: 0, originalFailedLedgerPreserved: true, exactNecessaryFamilies: 9, G3Certified: false }));
} catch (error) {
  const failure = ctx.artifact(`${ctx.next('gate-reconciliation41-failed')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed', originalFailurePreserved: true, privateOriginal: failure })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
