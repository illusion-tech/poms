import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha, keyOf } from './business/pure.mjs';
import { capture, loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
const ctx = createContext({ epoch: 'g2-business10', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'reconcile-known-receiver-auth-stop43' }) + '\n', { flag: 'wx', mode: 0o600 });
const pins = {
  '001094-http-request.json': 'ae3b2d165d0b67bee1125d5b14050dfa3858c2e98d0e3e4f86ea8e86af2a719c',
  '001094-http-response-body.bin': '3c4d142fcef103f51df4d9ae58d71c74eb050732c865443c9cfc558d1d764ecf',
  '001096-http-response-headers.json': 'd654c58dc6d06b52f6abad08316ddd6678ff4a8a234f6b4e834daad9ffe042fc',
  '001097-ledger.json': 'b3c9f9419a8fc70e1c6af41c855dd00fd5777d058bcd46b2397fa35724cd8b77',
};
const read = name => { const bytes = fs.readFileSync(`${ctx.priv}/${name}`); assert.equal(sha(bytes), pins[name]); return JSON.parse(bytes); };
try {
  assert(!ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
  const record = ctx.state.fixtures.efReceiver40, f = record?.fixtures;
  assert(record && f && Object.keys(record.stages).length === 1 && record.stages['project-sources']?.phase === 'running');
  assert(!record.authStopReconciliation43 && !f.projectSourcesComplete && !f.cost && !f.bid && !f.contract && !f.summary);
  const sourceRequest = read('001094-http-request.json'), created = read('001094-http-response-body.bin');
  assert.equal(sourceRequest.operationId, 'ProjectController_create');
  assert.equal(created.id, f.project.id); assert.notEqual(f.project.id, ctx.state.fixtures.project.id);
  assert.equal(created.ownerUserId, ctx.state.actors.manager.id); assert.equal(created.currentStage, 'assessment');
  const ledger = read('001097-ledger.json');
  assert.equal(read('001096-http-response-headers.json').status, 401);
  assert.equal(ledger.operationId, 'ProjectController_getById'); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
  const publicFailure = JSON.parse(fs.readFileSync(`${ctx.out}/001096-http-http.json`));
  assert.equal(publicFailure.actorKey, 'unrelated'); assert.equal(publicFailure.status, 401); assert.equal(publicFailure.expectedStatus, 404);
  assert(publicFailure.responseComplete && !publicFailure.transportFailure); assert.equal(publicFailure.requestId, ledger.requestId);
  const priorAfter = loadSnapshot(ctx, ledger.after), fresh = await capture(ctx, ctx.next('receiver43-current'));
  assertRecorded(ctx, fresh);
  const identity = rows => readRows(rows).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
  for (const database of ctx.databases) {
    for (const table of Object.keys(priorAfter.databases[database].tables)) assert.deepEqual(identity(priorAfter.databases[database].tables[table]), identity(fresh.databases[database].tables[table]));
    assert.deepEqual(priorAfter.databases[database].meta, fresh.databases[database].meta);
    assert.deepEqual(priorAfter.objects[database], fresh.objects[database]);
  }
  const projectRow = readRows(fresh.databases[ctx.database].tables.project).find(row => row.key[0] === f.project.id); assert(projectRow);
  const proof = ctx.state.owned[keyOf(ctx.database, 'project', [f.project.id])];
  assert(proof && proof.latestSha256 === projectRow.sha256 && proof.latestXmin === projectRow.xmin);
  assert.equal(proof.proof.operationId, 'ProjectController_create'); assert.equal(proof.proof.requestId, sourceRequest.requestId);
  assert.equal(JSON.parse(projectRow.raw).row_version, 1);
  const originalStage = structuredClone(record.stages['project-sources']);
  const receipt = ctx.artifact(`${ctx.next('receiver-auth-stop43-reconciled')}.json`, { kind: 'metadata-only-known-authentication-negative-stop-reconciliation', pins,
    originalStage, immutableFailedStatus: 401, expectedPermissionNegative404NotYetProven: true, freshObservation: fresh.manifest,
    persistedProjectCreationAlreadyCommittedAndMustNotReplay: true, remainingProjectSourcesStillRequired: true,
    allRowsXminCatalogSequencesObjectsMatchLastAfter: true, HTTPRequestsSent: 0, businessSQLWrites: 0, G3Certified: false },
  { kind: 'known-receiver-authentication-stop-reconciled', original401Preserved: true, businessRequestsReplayed: 0, onlyStageCheckpointMetadataChanged: true });
  record.authStopReconciliation43 = receipt;
  delete record.stages['project-sources']; ctx.persist();
  console.log(JSON.stringify({ status: 'reconciled', HTTPRequestsSent: 0, businessSQLWrites: 0, original401Preserved: true, projectCreationMustNotReplay: true }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('receiver-auth-stop43-failed')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed', privateOriginal: original })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
