import assert from 'node:assert/strict';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { data, uuid } from './pure.mjs';
import { expectedRef } from './handover.mjs';
import { deriveGHWriteFacts } from './gh-write-facts.mjs';

const operationId = 'ProjectCostController_createOperatingRestatement';
export async function prepareLiveRestatementBody(ctx, api, body) {
  assert.equal(body.scope, 'live'); assert.equal(body.periodEndSnapshotRef, null);
  const scope = { projectId: uuid(body.projectId), actorId: uuid(ctx.state.actors.manager.id), actorKey: 'manager', params: {}, body };
  const before = await capture(ctx, ctx.next('restatement-branch-facts')); assertRecorded(ctx, before);
  const facts = deriveGHWriteFacts(ctx, before, operationId, scope, readRows);
  const query = { view: 'preparation', intent: 'restatement', restatesSnapshotId: body.restatesSnapshotRef.id };
  const firstResponse = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: body.projectId }, null, 'manager', { query });
  const first = data(firstResponse).preparation;
  const changedUnits = new Set(facts.decisionInserts.filter(d => d.headEvent === 'UPDATE').map(d => d.unit));
  const refs = [];
  for (const row of first.sourceRows) if (row.rowKind === 'direct-cost' && changedUnits.has(`cost:${row.sourceRef.id}`)) {
    const ref = row.currentDecisionRef; assert(ref?.kind === 'ProjectCostInclusionDecision', 'Use actual server-provided prior decision factual hash, never hash a SQL row'); refs.push(expectedRef(ref));
  }
  assert.equal(refs.length, changedUnits.size, 'Every changed existing classification needs its real current DecisionRef');
  refs.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const response = refs.length ? await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: body.projectId }, null, 'manager', { query: { ...query, correctionSourceRefs: JSON.stringify(refs) } }) : firstResponse;
  const preparation = data(response).preparation;
  assert.equal(preparation.intent, 'restatement'); assert.equal(preparation.kind, 'preparation-only');
  assert.equal(preparation.headVersion, body.expectedVersion); assert.equal(preparation.projectVersion, body.expectedProjectVersion);
  const supplied = [{ projectId: body.projectId, restatesSnapshotRef: body.restatesSnapshotRef, periodEndSnapshotRef: body.periodEndSnapshotRef }, ...(body.affectedTargets ?? [])];
  const shape = target => ({ projectId: target.projectId, restatesSnapshotRef: target.restatesSnapshotRef, periodEndSnapshotRef: target.periodEndSnapshotRef });
  const ordered = values => values.map(shape).sort((a, b) => a.projectId.localeCompare(b.projectId) || a.restatesSnapshotRef.id.localeCompare(b.restatesSnapshotRef.id));
  assert.deepEqual(ordered(preparation.proposedAffectedTargets), ordered(supplied), 'Complete reverse-discovered targets changed: stop and build all real target decisions; never drop them');
  assert(/^[a-f0-9]{64}$/.test(preparation.expectedInputHash));
  // Mutate this one real request object before the sweep begins. The18 caller
  // checkpoints this actual body afterwards, including the real corrected hash.
  body.expectedInputHash = preparation.expectedInputHash;
  return ctx.artifact(`${ctx.next('restatement-pre-effect-preparation')}.json`, { actualPreparationReceipt: response.receiptId,
    changedPriorDecisionRefs: refs, actualBranchObservation: before.manifest, expectedInputHash: preparation.expectedInputHash,
    completeTargetSetPreserved: true, localBusinessHashMinted: false }, { kind: 'actual-server-preparation-for-changed-classification-roots', sourceRefsAreServerProduced: true, completeTargetSetPreserved: true });
}
