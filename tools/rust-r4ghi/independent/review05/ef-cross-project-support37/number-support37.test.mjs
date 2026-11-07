// Synthetic negative probes only; no PG/HTTP/producer acceptance is claimed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const helperFile = new URL('./candidate/tools/rust-r4ghi/business/restatement-labor-number.mjs', import.meta.url);
const pureFile = new URL('../../../business/pure.mjs', import.meta.url);
let source = fs.readFileSync(helperFile, 'utf8');
assert.equal(source.split("'./pure.mjs'").length, 2);
source = source.replace("'./pure.mjs'", JSON.stringify(pureFile.href));
const { assertRestatementLaborNumberBinding: preflight, resolveRestatementLaborNumber: resolve } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const sha = x => createHash('sha256').update(x).digest('hex');
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const row = (value, xmin = '100') => { const raw = JSON.stringify(value); return { key: [value.id], raw, sha256: sha(raw), xmin }; };
const OP = 'ProjectCostController_createOperatingRestatement';
function fixture() {
  const actor = id(1), project = id(2), oldId = id(3), newId = id(4), root = id(5), snapshot = id(6);
  const old = row({ id: oldId, project_id: project, row_version: 2, cost_type: 'labor', currency: 'CNY', record_status: 'confirmed' });
  const replacement = row({ id: newId, project_id: project, row_version: 2, cost_type: 'labor', source_type: 'labor', basis_origin: 'captured',
    supersedes_record_id: oldId, registered_by: actor, currency: 'CNY', calculation_basis: { realProducer: true }, record_no: 'AC-LBR-2026-000005' }, '200');
  const c0 = row({ id: id(7), scope: 'cost-labor', period: '2026', next_value: 5, prefix: 'AC-LBR', padding: 6, description: '人力实际成本编号' });
  const c1 = row({ ...JSON.parse(c0.raw), next_value: 6 }, '200');
  const audit = (n, target) => row({ id: id(n), request_id: 'actual-test-request', event_type: OP, target_type: 'ProjectActualCostRecord',
    target_id: target, operator_id: actor, result: 'success' }, '200');
  const shape = tables => ({ databases: { db: { tables } } });
  return {
    ctx: { database: 'db', state: { owned: { [JSON.stringify(['db', 'project_actual_cost_record', [oldId]])]: {
      latestSha256: old.sha256, latestXmin: old.xmin, proof: { transport: 'HTTP' } } } } },
    before: shape({ project_actual_cost_record: [old], audit_log: [], business_number_sequence: [c0] }),
    after: shape({ project_actual_cost_record: [row({ ...JSON.parse(old.raw), row_version: 3, record_status: 'replaced' }, '200'), replacement],
      audit_log: [audit(8, oldId), audit(9, newId)], business_number_sequence: [c1] }),
    attempt: { operationId: OP, actorId: actor, status: 201, requestId: 'actual-test-request',
      requestValue: { laborCorrections: [{ supersededCostRef: { kind: 'ProjectActualCostRecord', id: oldId, expectedVersion: 2, payloadHash: 'a'.repeat(64) } }] },
      body: { targetId: root, snapshotId: snapshot } },
    binding: { restatementLaborCounter: 'one-owned-labor-replacement-v1' },
    anchors: [{ table: 'operating_restatement_record', id: root, xmin: '200' }, { table: 'project_operating_snapshot', id: snapshot, xmin: '200' }],
    readRows: x => x, specs: { 'cost-labor': { prefix: 'AC-LBR', padding: 6, description: '人力实际成本编号' } },
  };
}
const edit = (f, table, index, delta, xmin) => {
  const previous = f.after.databases.db.tables[table][index];
  f.after.databases.db.tables[table][index] = row({ ...JSON.parse(previous.raw), ...delta }, xmin ?? previous.xmin);
};
test('one exact new E successor, both E audits and one same-transaction official increment are required', () => {
  const f = fixture(), proof = resolve(f);
  assert.equal(proof.actualBody.recordNo, 'AC-LBR-2026-000005');
  assert.equal(proof.storedNumberProof.locallyMintedBusinessNumber, false);
  assert.equal(proof.storedNumberProof.independentTransactionAllowed, false);
});
test('ordinary requests keep the old proof path, and failed attempts receive no success proof', () => {
  const f = fixture(); assert.equal(resolve({ ...f, binding: {} }), null);
  f.attempt.status = 500; assert.equal(resolve(f), null);
});
test('unknown modes, multiple replacements, and a simultaneous response-number binding fail closed', () => {
  for (const change of [f => { f.binding.restatementLaborCounter = 'approved'; },
    f => f.attempt.requestValue.laborCorrections.push(f.attempt.requestValue.laborCorrections[0]),
    f => { f.binding.number = { scope: 'cost-labor', pointer: '/recordNo' }; }]) {
    const f = fixture(); change(f); assert.throws(() => resolve(f));
  }
});
test('original/non-HTTP/stale predecessor cannot acquire an internal producer proof', () => {
  for (const change of [f => { f.ctx.state.owned = {}; },
    f => { Object.values(f.ctx.state.owned)[0].proof.transport = 'SQL'; },
    f => { Object.values(f.ctx.state.owned)[0].latestXmin = 'different'; },
    f => { f.attempt.requestValue.laborCorrections[0].supersededCostRef.expectedVersion = 1; }]) {
    const f = fixture(); change(f); assert.throws(() => resolve(f));
  }
});
test('foreign project, fabricated predecessor or different actor successor is rejected', () => {
  for (const delta of [{ project_id: id(90) }, { supersedes_record_id: id(91) }, { registered_by: id(92) }, { currency: 'USD' }]) {
    const f = fixture(); edit(f, 'project_actual_cost_record', 1, delta); assert.throws(() => resolve(f));
  }
});
test('both actual response birth anchors and the shared physical transaction are required', () => {
  for (const change of [f => { f.anchors = f.anchors.slice(1); },
    f => { f.anchors[1].xmin = '201'; },
    f => edit(f, 'project_actual_cost_record', 1, {}, '201'),
    f => edit(f, 'business_number_sequence', 0, {}, '201')]) {
    const f = fixture(); change(f); assert.throws(() => resolve(f));
  }
});
test('a reused existing successor or an extra hidden E replacement is rejected', () => {
  const f = fixture(); f.before.databases.db.tables.project_actual_cost_record.push(f.after.databases.db.tables.project_actual_cost_record[1]);
  assert.throws(() => resolve(f));
  const extra = fixture(); extra.after.databases.db.tables.project_actual_cost_record.push(row({ id: id(99) }, '200'));
  assert.throws(() => resolve(extra));
});
test('both exact operation/actor/request E audits are required, independent of generic audit anchors', () => {
  for (const delta of [{ request_id: 'other' }, { event_type: 'ProjectCostController_replaceLaborCostRecord' },
    { operator_id: id(80) }, { result: 'failure' }]) {
    const f = fixture(); edit(f, 'audit_log', 0, delta); assert.throws(() => resolve(f));
  }
});
test('stored number, prefix/config and one exact counter step are conserved', () => {
  for (const change of [f => edit(f, 'project_actual_cost_record', 1, { record_no: 'AC-LBR-2026-000006' }),
    f => edit(f, 'business_number_sequence', 0, { next_value: 7 }),
    f => edit(f, 'business_number_sequence', 0, { prefix: 'FAKE' }),
    f => edit(f, 'business_number_sequence', 0, { period: '2025' })]) {
    const f = fixture(); change(f); assert.throws(() => resolve(f));
  }
});
test('preflight cannot admit an unrelated operation with the flag', () => {
  const f = fixture(); assert.throws(() => preflight(f.ctx, 'ProjectController_create', f.attempt.requestValue, f.binding));
});
