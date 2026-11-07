// Pure closure/DTO boundary probes only. Runtime PG/HTTP planner is not invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const file = new URL('./candidate/tools/rust-r4ghi/business/correction-preparation37.mjs', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
source = source.replace("'./pure.mjs'", JSON.stringify(new URL('../../../business/pure.mjs', import.meta.url).href));
for (const line of ["import { capture, readRows } from './snapshot.mjs';", "import { assertRecorded } from './ledger.mjs';"]) {
  assert(source.includes(line)); source = source.replace(line, '');
}
const { exactExpectedRef, assertSameCompleteTargets, composeNonemptyRestatement: compose } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const id = n => `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;
const ref = (n, kind = 'ProjectOperatingSnapshot') => ({ kind, id: id(n), expectedVersion: 1, payloadHash: 'b'.repeat(64) });
function fixture() {
  const targets = [
    { projectId: id(1), expectedVersion: 3, restatesSnapshotRef: ref(11), periodEndSnapshotRef: null },
    { projectId: id(2), expectedVersion: 4, restatesSnapshotRef: ref(12), periodEndSnapshotRef: null },
    { projectId: id(1), expectedVersion: 3, restatesSnapshotRef: ref(13), periodEndSnapshotRef: ref(21, 'PeriodClosingSnapshot') },
    { projectId: id(2), expectedVersion: 4, restatesSnapshotRef: ref(14), periodEndSnapshotRef: ref(22, 'PeriodClosingSnapshot') },
  ];
  return { p: { kind: 'preparation-only', intent: 'restatement', projectId: id(1), projectVersion: 2, headVersion: 3,
    expectedInputHash: 'c'.repeat(64), formalEligibility: { status: 'eligible' }, blockingReasonCodes: [], proposedAffectedTargets: targets },
    targets, corrections: { laborCorrections: [{ supersededCostRef: ref(31, 'ProjectActualCostRecord') }], allocationCorrections: [{}],
      stageCorrections: [{ costRef: ref(32, 'ProjectActualCostRecord') }], taxCorrections: [{}] },
    options: { reason: 'actual fixture correction', summary: 'actual same-transaction closure', requirePeriod: true } };
}
test('complete mixed live/period closure preserves every terminal and derives primary scope only from its own period ref', () => {
  const f = fixture(); const body = compose(f.p, f.targets, f.corrections, id(11), f.options);
  assert.equal(body.scope, 'live'); assert.equal(body.periodEndSnapshotRef, null); assert.equal(body.affectedTargets.length, 3);
  const period = compose(f.p, f.targets, f.corrections, id(13), f.options);
  assert.equal(period.scope, 'period'); assert.equal(period.affectedTargets.length, 3);
  assert(period.affectedTargets.some(t => t.restatesSnapshotRef.id === id(11) && t.periodEndSnapshotRef === null));
});
test('missing peer project or missing period terminal cannot be hidden by outer scope', () => {
  const f = fixture();
  assert.throws(() => compose(f.p, f.targets.slice(0, 3), f.corrections, id(11), f.options));
  assert.throws(() => compose(f.p, f.targets.filter(t => t.projectId === id(1)), f.corrections, id(13), f.options));
});
test('per-target preparation disagreement, duplicate terminal and changed head version fail closed', () => {
  const f = fixture(), other = structuredClone(f.targets); other[1].expectedVersion++;
  assert.throws(() => assertSameCompleteTargets(f.targets, [other]));
  assert.throws(() => assertSameCompleteTargets([...f.targets, f.targets[0]], []));
  f.p.headVersion++; assert.throws(() => compose(f.p, f.targets, f.corrections, id(11), f.options));
});
test('all four true correction arrays are required and labor/stage cannot conflict on one cost', () => {
  const f = fixture(); f.corrections.laborCorrections = []; assert.throws(() => compose(f.p, f.targets, f.corrections, id(11), f.options));
  const conflict = fixture(); conflict.corrections.stageCorrections[0].costRef = conflict.corrections.laborCorrections[0].supersededCostRef;
  assert.throws(() => compose(conflict.p, conflict.targets, conflict.corrections, id(11), conflict.options));
});
test('a decision flag or injected override cannot replace actual eligibility, hash or project scope', () => {
  const f = fixture(); f.p.formalEligibility.status = 'missing-evidence'; f.p.approved = true;
  assert.throws(() => compose(f.p, f.targets, f.corrections, id(11), f.options));
  const override = fixture(); override.corrections.projectId = id(99);
  assert.throws(() => compose(override.p, override.targets, override.corrections, id(11), override.options));
});
test('live-only targets cannot certify a cross-period scenario, and ambiguous reference versions are rejected', () => {
  const f = fixture(); f.targets.splice(2); assert.throws(() => compose(f.p, f.targets, f.corrections, id(11), f.options));
  assert.throws(() => exactExpectedRef({ ...ref(1), rowVersion: 2 }));
  assert.throws(() => exactExpectedRef({ ...ref(1), payloadHash: 'client-guessed' }));
});
