import assert from 'node:assert/strict';

export function exactCents(value) {
  assert(typeof value === 'string' && /^-?(?:0|[1-9][0-9]*)\.[0-9]{2}$/.test(value), 'Use actual decimal SQL text or server string, never JSON float or a guessed zero');
  const negative = value.startsWith('-'), [units, cents] = (negative ? value.slice(1) : value).split('.');
  return (negative ? -1n : 1n) * (BigInt(units) * 100n + BigInt(cents));
}
export function assertFrozenPreserved(original, after) {
  assert.equal(after.snapshotId, original.snapshotId);
  for (const key of ['frozenSnapshotRaw', 'sourceContextRaw', 'sourceMemberRows', 'costMemberRows']) assert.deepEqual(after[key], original[key], `Original frozen ${key} changed`);
  assert.equal(after.sourceHash, original.sourceHash); assert.equal(after.sourcePayloadHash, original.sourcePayloadHash);
  // Status/current/rowVersion/updatedAt/by are allowed mutable selectors in the
  // real DB guard. They are deliberately outside frozenSnapshotRaw, not hidden
  // by comparing only some financial fields.
}
export function assertLateSource(original, source) {
  assert(source.businessDate <= original.sourceWindowEnd, 'A new future business date is not a late-arrival correction of this frozen window');
  assert(Date.parse(source.createdAt) > Date.parse(original.knowledgeCutoff), 'Producer must really execute after original knowledge cutoff; never backdate it');
  assert.equal(source.projectId, original.projectId); assert.equal(source.currency, original.currency);
  exactCents(source.amountExcludingTax); exactCents(source.taxCostAmount); exactCents(source.amountIncludingTax);
}
export function assertLateCostDelta(original, restated, lateCostId, lateSource) {
  const old = new Map(original.costAmounts.map(row => [row.unitKey, row]));
  const current = new Map(restated.costAmounts.map(row => [row.unitKey, row]));
  assert.equal(current.size, old.size + 1, 'This bounded fixture produces exactly one new real cost; do not silently absorb an unknown allocation/source');
  for (const [key, row] of old) assert.deepEqual(current.get(key), row, 'Previously captured cost amounts changed instead of appending the late source');
  const late = current.get(`cost:${lateCostId}`); assert(late && !old.has(late.unitKey)); assert.equal(late.netKnowledge, 'known');
  assert.equal(lateSource.id, lateCostId); assert.equal(late.net, lateSource.amountExcludingTax); assert.equal(late.tax, lateSource.taxCostAmount); assert.equal(late.gross, lateSource.amountIncludingTax);
  const delta = exactCents(late.net);
  assert.equal(exactCents(restated.metrics.includedCost) - exactCents(original.metrics.includedCost), delta);
  assert.equal(exactCents(restated.metrics.grossMargin) - exactCents(original.metrics.grossMargin), -delta);
  assert.equal(restated.metrics.effectiveContract, original.metrics.effectiveContract);
  assert.equal(restated.metrics.confirmedReceipt, original.metrics.confirmedReceipt);
  for (const state of [original, restated]) {
    if (state.metrics.taxPendingKnowledge === 'unknown') assert.equal(state.metrics.taxPending, null, 'Unknown tax must not become fabricated zero');
    else { assert.equal(state.metrics.taxPendingKnowledge, 'known'); exactCents(state.metrics.taxPending); }
  }
  if (original.metrics.taxPendingKnowledge === 'unknown') assert.equal(restated.metrics.taxPendingKnowledge, 'unknown', 'This case creates no tax certification/correction producer');
  return { lateUnitKey: late.unitKey, actualServerNetDeltaCents: delta.toString(), noMoneyFloatRoundTrip: true, unknownTaxPreserved: true };
}
export function completeLiveTargets(preparation, projectId, snapshotId) {
  assert(preparation.intent === 'restatement' && preparation.kind === 'preparation-only' && preparation.projectId === projectId);
  assert(/^[a-f0-9]{64}$/.test(preparation.expectedInputHash));
  assert(Number.isSafeInteger(preparation.headVersion) && preparation.headVersion >= 0);
  assert(Number.isSafeInteger(preparation.projectVersion) && preparation.projectVersion > 0);
  const targets = preparation.proposedAffectedTargets; assert(Array.isArray(targets) && targets.length);
  const keys = targets.map(t => `${t.projectId}:${t.restatesSnapshotRef.id}`); assert.equal(new Set(keys).size, keys.length);
  const primary = targets.filter(t => t.projectId === projectId && t.restatesSnapshotRef.id === snapshotId); assert.equal(primary.length, 1, 'Requested old snapshot must be an actual current terminal target, not a nominated stale ancestor');
  // This prepared producer is explicitly one-project/live. Refuse and report a
  // discovered extra scope, never omit it or invent its cost decisions.
  assert(targets.every(t => t.projectId === projectId && t.periodEndSnapshotRef === null), 'Server discovered another project/period; extend real producers and decisions before running this bounded case');
  return { primary: primary[0], others: targets.filter(t => t !== primary[0]) };
}
