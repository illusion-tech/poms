import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { data, sha } from './business/pure.mjs';
import { capture, loadSnapshot } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { assertSweepRollback } from './business/fault-sweep.mjs';
import { requireOwnedScope } from './business/required-write-inventory.mjs';
import { assertSameRetained54 } from './business/retained-admission54.mjs';
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }), lock = ctx.priv + '/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'metadata-only-known-Tax-fixture-409-reconciliation96' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  assert(!ctx.state.activeFault && !ctx.state.blockedObservation);
  const failureFile = ctx.priv + '/006185-shared-tax-fixture82-01-partial.json', failureBytes = fs.readFileSync(failureFile);
  assert.equal(sha(failureBytes), 'e6ae5532d0ab49e889cf3fda89c72dea83820944ac5debb7988f3897623359b9');
  const receiptFile = ctx.out + '/006224-http-http.json', httpBytes = fs.readFileSync(receiptFile), http = JSON.parse(httpBytes);
  assert.equal(http.operationId, 'ProjectCostController_createProjectOperatingSnapshot'); assert.equal(http.status, 409); assert.equal(http.expectedStatus, 201);
  assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
  const responseBytes = fs.readFileSync(http.originals.responseBody.file); assert.equal(sha(responseBytes), http.originals.responseBody.rawBytesSha256);
  assert.equal(data({ body: JSON.parse(responseBytes) }).code, 'operating_cost_source_missing');
  const ledgerFile = ctx.priv + '/006225-ledger.json', ledgerBytes = fs.readFileSync(ledgerFile), ledgerPin = { file: ledgerFile, rawBytesSha256: sha(ledgerBytes) };
  const ledger = JSON.parse(ledgerBytes); assert.equal(ledger.requestId, http.requestId); assert.equal(ledger.operationId, http.operationId); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []); assert.deepEqual(ledger.recorded, []);
  const state = ctx.state.fixtures.sharedSourceFollowup58.tax, pending = state.pending;
  assert(pending && pending.key === 'snapshot:' + ctx.state.fixtures.project.id); assert.equal(state.producerComplete, undefined); assert.equal(state.prepared, undefined);
  const requestBytes = fs.readFileSync(http.originals.requestBody.file); assert.equal(sha(requestBytes), http.originals.requestBody.rawBytesSha256); assert.equal(pending.bodySHA256, sha(requestBytes));
  const before = loadSnapshot(ctx, ledger.before), after = loadSnapshot(ctx, ledger.after);
  const sessionId = requireOwnedScope(ctx, before, { projectId: ctx.state.fixtures.project.id, actorId: ctx.state.actors.manager.id, actorKey: 'manager' });
  const rollback = assertSweepRollback(ctx, before, after, { sessionId }, ctx.state.actors.manager.id); assertRecorded(ctx, after);
  const current = await capture(ctx, ctx.next('tax97-fresh-known409')); assertSameRetained54(after, current, ctx.databases); assertRecorded(ctx, current);
  const receiverId = ctx.state.fixtures.efReceiver40.fixtures.project.id;
  const committed = state['snapshot:' + receiverId]; assert.equal(committed.phase, 'actual-success');
  const originalBytes = fs.readFileSync(committed.original.file); assert.equal(sha(originalBytes), committed.original.rawBytesSha256);
  const reconciliation = ctx.artifact(ctx.next('tax97-known409-reconciliation') + '.json', { kind: 'exact-metadata-only-known-Main-409-after-real-Tax-producer',
    oldPartial: { file: failureFile, rawBytesSha256: sha(failureBytes) }, failedHTTP: { file: receiptFile, rawBytesSha256: sha(httpBytes) }, ledger: ledgerPin,
    originalPending: pending, rollback, failedBefore: before.manifest, failedAfter: after.manifest, freshEquivalentSnapshot: current.manifest,
    successfulReceiverSnapshot: committed.original, failedMainSnapshotPublished: false, producerComplete: false,
    noExpenseEFTaxAllocationOrSuccessfulSnapshotReplay: true, correctionPOSTExecuted: false, G3Certified: false });
  assert(!state.knownFailureReconciliation97); state.knownFailureReconciliation97 = reconciliation;
  state.failedMainSnapshot97 = { pending, actualStatus: 409, actualCode: 'operating_cost_source_missing', originalFailure: reconciliation };
  delete state.pending; ctx.persist();
  console.log(JSON.stringify({ status: 'metadata-only-reconciled', actualFailureStatus: 409, actualCode: 'operating_cost_source_missing',
    successfulReceiverSnapshotPreserved: true, failedMainDomainWrites: 0, currentSnapshotExactlyMatchesFailedAfter: true,
    producerComplete: false, failedOrSuccessfulPOSTReplayed: false, reconciliation, G3Certified: false }));
} catch (error) {
  const original = ctx.artifact(ctx.next('tax97-reconciliation-partial') + '.json', { name: error.name, message: error.message, stack: error.stack }); ctx.persist();
  console.error(JSON.stringify({ status: 'failed-or-partial', privateOriginal: original })); process.exitCode = 1;
} finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
