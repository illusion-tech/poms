// Exact metadata-only recovery of the already committed09 omitted-creator slot.
// No HTTP, business SQL, ownership SHA rebasing, original rewrite or blocked reset.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ownedFile } from './context.mjs';
import { sha, data, keyOf } from './pure.mjs';
import { capture, loadSnapshot, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { creationProof } from './creator-ownership.mjs';

function original(ctx, pin, publicReceipt = false) {
  assert(pin.file.startsWith((publicReceipt ? ctx.out : ctx.priv) + '/'));
  const bytes = ownedFile(pin.file); assert.equal(sha(bytes), pin.sha256); return bytes;
}
function oneRow(ctx, snapshot, table, id) {
  const rows = readRows(snapshot.databases[ctx.database].tables[table]).filter(row => row.key.length === 1 && row.key[0] === id);
  assert.equal(rows.length, 1); return rows[0];
}
export async function recoverCreatorSlot24(ctx, { planFile, approvedPlanSHA256 }) {
  assert.equal(process.platform, 'linux', 'Only Root executes reviewed metadata recovery');
  assert(/^[a-f0-9]{64}$/.test(approvedPlanSHA256));
  const bytes = ownedFile(planFile); assert.equal(sha(bytes), approvedPlanSHA256);
  const plan = JSON.parse(bytes);
  assert.equal(plan.kind, 'exact-default-creator-proof-metadata-recovery24-prepared-unrun');
  assert.equal(plan.epoch, ctx.epoch); assert.equal(plan.run, ctx.run); assert.equal(plan.marker, ctx.state.marker);
  assert.equal(plan.sourcePinsSHA256, sha(JSON.stringify(ctx.pins))); assert.equal(plan.sourcePinsCount, ctx.pins.length);
  assert.equal(plan.slotName, 'default'); assert.equal(plan.initialOwnershipMode, 'omitted-creator');
  assert(!ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.activeFault && !ctx.state.blockedObservation);
  const lock = `${ctx.priv}/driver.lock`;
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'exact-creator-slot-metadata-recovery24', approvedPlanSHA256 }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const slot = ctx.state.fixtures.creatorOwnership23.projects.default;
    assert.equal(sha(JSON.stringify(slot)), plan.slotBeforeSHA256); assert.equal(slot.project.id, plan.projectId);
    assert.equal(slot.proofPending, true); assert(!slot.proof); assert.equal(slot.createReceipt, plan.httpReceipt.file);
    assert.equal(ctx.state.actors.manager.id, plan.actorId); assert.equal(ctx.state.fixtures.org.id, plan.orgId);
    const http = JSON.parse(original(ctx, plan.httpReceipt, true));
    assert.equal(http.operationId, 'ProjectController_create'); assert.equal(http.requestId, plan.requestId);
    assert.equal(http.status, 201); assert.equal(http.expectedStatus, 201); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
    for (const [name, pin] of Object.entries(plan.originals)) {
      assert.deepEqual({ file: http.originals[name].file, sha256: http.originals[name].rawBytesSha256 }, pin); original(ctx, pin);
    }
    const request = JSON.parse(original(ctx, plan.originals.requestConfig)), requestBytes = original(ctx, plan.originals.requestBody);
    const body = JSON.parse(requestBytes), response = JSON.parse(original(ctx, plan.originals.responseBody)), headers = JSON.parse(original(ctx, plan.originals.responseHeaders));
    assert.equal(request.operationId, http.operationId); assert.equal(request.method, 'POST'); assert.equal(request.requestId, http.requestId);
    assert.equal(request.headers['X-Request-Id'], http.requestId); assert.equal(headers.status, 201);
    const url = new URL(request.url); assert.equal(url.origin, ctx.api); assert.equal(url.pathname, '/api/projects'); assert.equal(url.search, '');
    assert(!Object.hasOwn(body, 'initialOwnership')); assert.equal(body.currentStage, 'assessment');
    assert.equal(body.customerId, ctx.state.fixtures.customer.id); assert.deepEqual(data({ body: response }), slot.project);
    const partial = JSON.parse(original(ctx, plan.partial)); assert.equal(partial.message, 'Actual UTC producer timestamp required');
    const ledger = JSON.parse(original(ctx, plan.ledger));
    assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []); assert.equal(ledger.requestId, http.requestId); assert.equal(ledger.operationId, http.operationId);
    assert.deepEqual(request.before, plan.before); assert.deepEqual(ledger.before, plan.before); assert.deepEqual(ledger.after, plan.after);
    const before = loadSnapshot(ctx, plan.before), after = loadSnapshot(ctx, plan.after);
    const cookies = Object.fromEntries(request.headers.Cookie.split(';').map(part => { const text = part.trim(), at = text.indexOf('='); return [text.slice(0, at), text.slice(at + 1)]; }));
    const session = readRows(before.databases[ctx.database].tables.auth_session).map(row => JSON.parse(row.raw)).find(row => row.token_hash === sha(decodeURIComponent(cookies.poms_session)));
    assert(session && session.user_id === plan.actorId && session.status === 'active', 'Original actual cookie must bind the real creating actor');
    const proof = creationProof(ctx, { body: response, before: plan.before, after: plan.after }, false, false);
    assert.deepEqual(proof, plan.expectedProof, 'Recomputed same producer proof must match the reviewed exact original');
    assert.equal(proof.projectId, plan.projectId); assert.equal(proof.actualCommonXmin, plan.actualCommonXmin);
    const target = (table, row) => ({ table, id: row.key[0], sha256: row.sha256, xmin: row.xmin });
    assert.deepEqual(plan.targets, [target('project', proof.project), target('project_ownership_origin', proof.origin), ...proof.creationAudit.map(row => target('audit_log', row))]);
    const current = await capture(ctx, ctx.next('creator-recovery24-current'));
    // Other legitimate run-owned activity (e.g. Legacy/login) may advance. The
    // existing ledger must explain all of it; no new drift exception is added.
    assertRecorded(ctx, current);
    for (const target of plan.targets) {
      const historical = oneRow(ctx, after, target.table, target.id), live = oneRow(ctx, current, target.table, target.id);
      assert.equal(historical.sha256, target.sha256); assert.equal(historical.xmin, target.xmin);
      assert.equal(live.sha256, target.sha256); assert.equal(live.xmin, target.xmin, 'The already committed target changed before proof recovery');
      const owned = ctx.state.owned[keyOf(ctx.database, target.table, [target.id])];
      assert(owned && !owned.deleted && owned.latestSha256 === target.sha256 && owned.latestXmin === target.xmin);
    }
    const ownedBefore = sha(JSON.stringify(ctx.state.owned)), borrowedBefore = sha(JSON.stringify(ctx.state.borrowed));
    const receipt = ctx.artifact(`${ctx.next('creator-slot-recovery24-proof')}.json`, { kind: 'exact-default-creator-proof-metadata-recovery24', approvedPlanSHA256,
      originalHTTP: plan.httpReceipt, originalCompleteLedger: plan.ledger, originalPartial: plan.partial, before: plan.before, after: plan.after, freshCurrent: current.manifest,
      proof, projectId: plan.projectId, originalProducerReevaluated: true, originalBytesPreserved: true, allOtherCurrentChangesRequireExistingLedger: true,
      businessRequestsSent: 0, businessDatabaseWrites: 0, ownershipHashesRebased: 0, blockedObservationCleared: false },
    { kind: 'actual-metadata-only-creator-proof-reconciliation24', projectId: plan.projectId, actualCommonXmin: proof.actualCommonXmin,
      businessRequestsSent: 0, businessDatabaseWrites: 0, ownershipHashesRebased: 0, G3Certified: false, G4Certified: false });
    slot.proof = receipt; slot.proofPending = false; slot.metadataRecovery24 = { approvedPlanSHA256, receipt, originalHTTP: plan.httpReceipt };
    ctx.state.metadataReconciliations ??= []; ctx.state.metadataReconciliations.push({ kind: 'creator-slot24', projectId: plan.projectId, receipt, approvedPlanSHA256 });
    assert.equal(sha(JSON.stringify(ctx.state.owned)), ownedBefore); assert.equal(sha(JSON.stringify(ctx.state.borrowed)), borrowedBefore); assert(!ctx.state.blockedObservation);
    ctx.persist();
    return { kind: 'completed-exact-default-creator-slot-metadata-recovery24', receipt, businessRequestsSent: 0, businessDatabaseWrites: 0,
      originalCompleteLedgerUnchanged: true, ownershipHashesRebased: 0, blockedObservationCleared: false, G3Certified: false, G4Certified: false };
  } finally {
    const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); fs.unlinkSync(lock);
  }
}
