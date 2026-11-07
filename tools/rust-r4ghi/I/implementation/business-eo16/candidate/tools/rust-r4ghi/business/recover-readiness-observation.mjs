// Root-only metadata reconciliation of one already committed, fully captured
// request. No business request, fixture SQL, cleanup or original rewrite.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha, keyOf } from './pure.mjs';
import { ownedFile } from './context.mjs';
import { capture, loadSnapshot, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { readinessDiffReviewMutationProof } from './readiness-bindings.mjs';

function original(ctx, descriptor) {
  assert(descriptor.file.startsWith(ctx.priv + '/'), 'Only this run immutable private originals');
  const bytes = ownedFile(descriptor.file);
  assert.equal(sha(bytes), descriptor.sha256);
  return bytes;
}
function jsonOriginal(ctx, plan, name) { return JSON.parse(original(ctx, plan.originals[name])); }
function noDrift(ctx, observed, current) {
  for (const database of ctx.databases) {
    assert.deepEqual(current.databases[database].meta, observed.databases[database].meta, 'Catalog/sequence identity drift after blocked observation');
    assert.deepEqual(current.objects[database], observed.objects[database], 'Object drift after blocked observation');
    const before = observed.databases[database].tables, after = current.databases[database].tables;
    assert.deepEqual(Object.keys(after), Object.keys(before));
    for (const table of Object.keys(before)) {
      assert.deepEqual(readRows(after[table]).map(row => [row.key, row.sha256, row.xmin]),
        readRows(before[table]).map(row => [row.key, row.sha256, row.xmin]), 'Any intervening row or xmin change blocks metadata recovery');
    }
  }
}

export async function recoverReadinessObservation(ctx, { planFile, approvedPlanSHA256 }) {
  assert.equal(process.platform, 'linux', 'Only Root executes this after reviewing the exact plan');
  assert(/^[a-f0-9]{64}$/.test(approvedPlanSHA256));
  const bytes = ownedFile(planFile); assert.equal(sha(bytes), approvedPlanSHA256, 'Exact Root-reviewed plan SHA required');
  const plan = JSON.parse(bytes);
  assert.equal(plan.kind, 'proposed exact blocked observation reconciliation; not executed');
  assert.equal(plan.epoch, ctx.epoch); assert.equal(plan.run, ctx.run); assert.equal(plan.marker, ctx.state.marker);
  assert(!ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.activeFault);
  assert.deepEqual(ctx.state.blockedObservation, plan.blockedObservation, 'Only the pinned incomplete observation is eligible');
  const lock = `${ctx.priv}/driver.lock`;
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'exact-readiness-observation-recovery', approvedPlanSHA256 }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const ledger = JSON.parse(original(ctx, { file: plan.blockedObservation.file, sha256: plan.blockedObservation.rawBytesSha256 }));
    assert.equal(ledger.ownershipComplete, false); assert.equal(ledger.blockers.length, 1);
    assert.deepEqual(ledger.before, plan.before); assert.deepEqual(ledger.after, plan.after);
    const before = loadSnapshot(ctx, plan.before), after = loadSnapshot(ctx, plan.after);
    const request = jsonOriginal(ctx, plan, '000124-http-request.json');
    const body = jsonOriginal(ctx, plan, '000124-http-request-body.bin');
    const response = jsonOriginal(ctx, plan, '000124-http-response-body.bin');
    const responseHeaders = jsonOriginal(ctx, plan, '000124-http-response-headers.json');
    assert(plan.httpReceipt.file.startsWith(ctx.out + '/'));
    const httpBytes = ownedFile(plan.httpReceipt.file); assert.equal(sha(httpBytes), plan.httpReceipt.sha256);
    const http = JSON.parse(httpBytes);
    assert.equal(http.requestId, plan.requestId); assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200);
    assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
    for (const descriptor of Object.values(http.originals)) {
      if (descriptor?.file && descriptor.rawBytesSha256) original(ctx, { file: descriptor.file, sha256: descriptor.rawBytesSha256 });
    }
    assert.equal(request.method, 'POST'); assert.equal(responseHeaders.status, http.status);
    assert.equal(request.operationId, plan.operationId); assert.equal(request.requestId, plan.requestId);
    assert.equal(request.headers['X-Request-Id'], plan.requestId);
    const url = new URL(request.url); assert.equal(url.origin, ctx.api);
    const match = /^\/api\/commercial-release-baselines\/([a-f0-9-]+):reviewDiff$/.exec(url.pathname); assert(match && !url.search);
    const cookies = Object.fromEntries(request.headers.Cookie.split(';').map(part => {
      const value = part.trim(), at = value.indexOf('='); return [value.slice(0, at), value.slice(at + 1)];
    }));
    const sessions = readRows(before.databases[ctx.database].tables.auth_session).map(row => JSON.parse(row.raw));
    const session = sessions.find(row => row.token_hash === sha(decodeURIComponent(cookies.poms_session)));
    assert(session && session.user_id === plan.proof.actorId, 'Actual original authenticated cookie must bind the observed audit actor');
    const attempt = { operationId: request.operationId, requestId: request.requestId, actorId: session.user_id, pathParams: { id: match[1] },
      requestValue: body, body: response, status: http.status, expectedStatus: http.expectedStatus, responseComplete: http.responseComplete, transportFailure: http.transportFailure };
    const blocker = ledger.blockers[0];
    assert.equal(blocker.kind, 'owned-mutation-not-in-command-allowlist'); assert.equal(blocker.table, 'contract_readiness_package_item');
    const find = snapshot => readRows(snapshot.databases[ctx.database].tables[blocker.table]).find(row => JSON.stringify(row.key) === JSON.stringify(blocker.key));
    const beforeRow = find(before), afterRow = find(after); assert(beforeRow && afterRow);
    const proof = readinessDiffReviewMutationProof({ database: ctx.database, table: blocker.table, beforeRow, afterRow, attempt, before, after, readRows });
    assert(proof); assert.deepEqual(proof, plan.proof, 'Re-evaluated producer/PK/audit/xmin proof must equal the exact reviewed plan');
    assert(!readRows(loadSnapshot(ctx).databases[ctx.database].tables[blocker.table]).some(row => JSON.stringify(row.key) === JSON.stringify(blocker.key)), 'This PK must not be a borrowed original');
    const ownershipKey = keyOf(ctx.database, blocker.table, blocker.key), owned = ctx.state.owned[ownershipKey]; assert(owned && !owned.deleted);
    const alreadyRecorded = owned.latestSha256 === afterRow.sha256 && owned.latestXmin === afterRow.xmin
      && owned.latestProof?.recoveryPlanSHA256 === approvedPlanSHA256 && owned.latestProof?.requestId === plan.requestId;
    assert(alreadyRecorded || (owned.latestSha256 === beforeRow.sha256 && owned.latestXmin === beforeRow.xmin), 'Do not rebase over another ownership observation');
    const slot = ctx.state.fixtures.contractRuns.find(item => item.contract.id === proof.contractId);
    assert(slot && slot.readiness.id === proof.packageId && !slot.preparation);
    if (slot.diffReview) assert.deepEqual(slot.diffReview, response);
    const current = await capture(ctx, ctx.next('recovery-current'));
    noDrift(ctx, after, current);
    const prospective = structuredClone(ctx.state);
    Object.assign(prospective.owned[ownershipKey], { latestSha256: afterRow.sha256, latestXmin: afterRow.xmin });
    assertRecorded({ ...ctx, state: prospective }, current);
    const intent = ctx.artifact(`${ctx.next('recovery-proof')}.json`, { kind: 'Root-reviewed-exact-readiness-observation-reconciliation', approvedPlanSHA256,
      originalIncompleteLedger: plan.blockedObservation, proof, actualCompleteHTTP: plan.httpReceipt, freshCurrent: current.manifest,
      oldOriginalsUnchanged: true, businessDatabaseWrites: 0, newBusinessRequests: 0 },
    { kind: 'exact-source-proven-observation-reconciliation', changedOwnedRows: 1, businessDatabaseWrites: 0, originalIncompleteLedgerPreserved: true, G3Certified: false, G4Certified: false });
    if (!alreadyRecorded) ctx.own(ctx.database, blocker.table, afterRow, { kind: 'Root-reviewed-exact-readiness-owned-status-update', recoveryPlanSHA256: approvedPlanSHA256,
      exactReadinessReview: proof, requestId: plan.requestId, operationId: plan.operationId, beforeSnapshot: plan.before, afterSnapshot: plan.after, reconciliation: intent });
    slot.diffReview = response;
    ctx.state.observationReconciliations ??= [];
    ctx.state.observationReconciliations.push({ originalIncomplete: plan.blockedObservation, completed: intent, recoveryPlanSHA256: approvedPlanSHA256 });
    delete ctx.state.blockedObservation;
    ctx.persist();
    return { kind: 'completed-exact-readiness-observation-reconciliation', receipt: intent, metadataOnly: true, originalLedgerStillIncompleteAndPreserved: true,
      stateDiffReviewBoundToActualResponse: true, businessRequestsSent: 0, businessDatabaseWrites: 0, G3Certified: false, G4Certified: false };
  } finally {
    const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); fs.unlinkSync(lock);
  }
}
