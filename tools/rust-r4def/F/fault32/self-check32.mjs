// Pure rendering and source-pinning checks only; never invokes Root IO callbacks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildFaultPlan, gateSql, productionFamilyGateSql, validateScope } from './fault-plans32.mjs';
import { snapshotSql, ownershipSql, sessionSql, realPayableSql, sourceOccupancySql, snapshotStatement } from './read-only32.mjs';
import * as callbacks from './root-callback32.mjs';
const folder = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(folder, 'static-checks32.json');
assert(!fs.existsSync(output), 'Preserve any existing static check receipt');
const matrix = JSON.parse(fs.readFileSync(path.join(folder, 'matrix32.json'), 'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
const before = matrix.inputs.map(input => ({ ...input, observedRawSha256: sha(fs.readFileSync(input.file)) }));
for (const input of before) assert.equal(input.rawBytesSha256, input.observedRawSha256, input.file);
// Synthetic UUID literals below exercise only SQL string rendering. No business
// fixture, real HTTP result or production acceptance receipt is fabricated.
const synthetic = number => `00000000-0000-4000-8000-${number.toString().padStart(12, '0')}`;
const scope = {
  actorId: synthetic(1), sessionId: synthetic(2), projectIds: [synthetic(3), synthetic(4)],
  targetProjectIds: [synthetic(3), synthetic(4)], selectedProjectId: synthetic(4),
  costIds: [synthetic(5), synthetic(6)], selectedCostId: synthetic(6),
  expenseIds: [synthetic(7)], oldBasisId: synthetic(8), oldTaxId: synthetic(9),
  oldAttributionId: synthetic(10), requestId: 'r4f32_syntax_only_1234567890',
  expenseDescriptionMarker: 'r4f32_syntax_only_1234567890',
  operationId: 'ProjectCostController_confirmSharedCostAllocationBasis',
};
const checks = [];
const check = (name, fn) => { fn(); checks.push({ name, status: 'passed-pure-static' }); };
check('all-35-fault-plans-render-only-owned-predicates', () => {
  assert.equal(matrix.faults.length, 35);
  for (const scenario of matrix.faults) {
    const plan = buildFaultPlan({ ...scope, operationId: scenario.operation.operationId }, scenario.point);
    assert.equal(plan.install.length, 2); assert.equal(plan.cleanup.length, 2);
    assert(plan.install[0].text.includes('IF ') && plan.install[0].text.includes('P0032'));
    assert(plan.install[0].text.includes('END;\n$r4f32$'));
    assert.equal((plan.install[0].text.match(/\$r4f32\$/g) || []).length, 2);
    assert(!/\bINSERT\s+INTO|\bUPDATE\s+poms\.|\bDELETE\s+FROM|\bTRUNCATE\b|\bCOPY\b|\bDROP\s+TABLE/i.test(plan.install[0].text));
    assert(!/CASCADE/i.test(plan.cleanup.map(s => s.text).join('\n')));
    assert(plan.gate.namespace > 0 && plan.gate.namespace < 0x40000000);
    assert(plan.gate.key > 0 && plan.gate.key < 0x40000000);
  }
});
check('unique-technical-names-and-explicit-owned-row-scope', () => {
  const a = buildFaultPlan(scope, 'f-source-insert'), b = buildFaultPlan(scope, 'f-source-insert');
  assert.notEqual(a.tag, b.tag);
  assert(a.install[0].text.includes(scope.selectedCostId));
  assert(a.install[0].text.includes(scope.requestId));
  assert(a.install[0].text.includes(scope.actorId));
  assert(a.tag.length + 4 < 64);
});
check('invalid-or-unowned-sql-input-rejected', () => {
  assert.throws(() => validateScope({ ...scope, actorId: "' OR true --" }));
  assert.throws(() => validateScope({ ...scope, requestId: "r4f32_bad';drop table x;--" }));
  assert.throws(() => validateScope({ ...scope, selectedCostId: synthetic(500) }));
  assert.throws(() => buildFaultPlan(scope, 'arbitrary-table'));
  assert.throws(() => buildFaultPlan(scope, 'f-evidence', 'skip-success'));
});
check('pending-auth-targets-late-coflush-not-eager-touch', () => {
  const plan = buildFaultPlan(scope, 'pending-auth');
  assert.equal(plan.when, 'BEFORE'); assert.equal(plan.event, 'UPDATE');
  assert(plan.install[0].text.includes('NEW.id=') && plan.install[0].text.includes('poms.audit_log'));
  assert(plan.install[0].text.includes('poms.security_event') && plan.install[0].text.includes(scope.requestId));
});
check('barrier-is-visible-lock-state-not-notify-or-pg-sleep', () => {
  const plan = buildFaultPlan(scope, 'f-result-insert', 'pause');
  assert(plan.install[0].text.includes('pg_advisory_xact_lock'));
  assert(!plan.install[0].text.includes('RAISE EXCEPTION'));
  assert(!/pg_sleep|pg_notify/i.test(plan.install[0].text));
  assert(gateSql.observe(plan.gate).text.includes('NOT l.granted'));
  assert(gateSql.behind(100).text.includes('pg_blocking_pids'));
});
check('source-family-gate-matches-real-E-hash-protocol', () => {
  const gate = productionFamilyGateSql('poms:cost-rate:person:' + synthetic(1));
  assert(gate.hold.text.includes('hashtextextended($1,0)'));
  assert(gate.observe.text.includes('objsubid=1'));
  assert.throws(() => productionFamilyGateSql('arbitrary-scope'));
});
check('snapshot-is-one-read-only-statement-and-preserves-decimals', () => {
  assert(snapshotSql.trimStart().startsWith('WITH '));
  assert(!/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bTRUNCATE\b|\bCOPY\b|\bCREATE\b|\bDROP\b/i.test(snapshotSql));
  for (const column of ['amount_excluding_tax', 'tax_cost_amount', 'amount_including_tax', 'labor_amount', 'internal_cost_rate', 'actual_hours', 'actual_person_days', 'allocation_weight', 'allocation_ratio']) assert(snapshotSql.includes('t.' + column + '::text'));
  assert(snapshotSql.includes('business_number_sequence'));
  assert(snapshotSql.includes('ORDER BY t.basis_id,t.cost_record_id'));
});
check('credential-columns-never-read-by-candidate-SQL', () => {
  for (const sql of [snapshotSql, sessionSql, ownershipSql, realPayableSql, sourceOccupancySql]) assert(!/token_hash|csrf_token|password|credential/i.test(sql));
});
check('concrete-parameter-bindings-and-controlled-race-counts', () => {
  assert.equal(snapshotStatement(scope, [scope.requestId]).values.length, 7);
  assert.equal(matrix.races.length, 7);
  assert.equal(matrix.races.filter(r => r.kind === 'project-lock-contention').length, 6);
  assert.equal(matrix.races.filter(r => r.kind === 'production-family-lock-chain').length, 1);
  for (const name of ['runFault32', 'runContendedRace32', 'runSortedFamilyRace32']) assert.equal(typeof callbacks[name], 'function');
});
const statements = [
  ['owned_snapshot', snapshotSql, '$1 projects UUID[]; $2 requestIds text[]; $3 priorBasis UUID[]; $4 sessions UUID[]; $5 numberScopes text[]; $6 periods text[]; $7 actualRate UUID[]'],
  ['ownership_inventory', ownershipSql, '$1 owned projects UUID[]; counts do not prove ownership; combine actual producer receipts'],
  ['safe_session_snapshot', sessionSql, '$1 actual owned session UUID[]; never tokens/hashes'],
  ['real_payable_payment_progress', realPayableSql, '$1 actual payable UUID[]'],
  ['cost_current_occupancy', sourceOccupancySql, '$1 owned projects UUID[]'],
  ['trigger_gate_observation', gateSql.observe({ namespace: 1, key: 1 }).text, '$1 actual technical gate namespace integer; $2 key integer'],
  ['project_lock_waiter_observation', gateSql.behind(1).text, '$1 actual leader backend PID; require exactly one waiter and independent sessions'],
];
fs.writeFileSync(path.join(folder, 'READ-ONLY32.sql'), statements.map(([name, sql, parameters]) => `-- ${name}\n-- ${parameters}\n${sql.trim()};\n`).join('\n'));
const after = matrix.inputs.map(input => ({ file: input.file, rawBytesSha256: sha(fs.readFileSync(input.file)) }));
for (const input of before) assert.equal(after.find(a => a.file === input.file).rawBytesSha256, input.rawBytesSha256);
const result = {
  kind: 'R4EF-fault32-pure-rendering-and-source-checks', capturedAt: new Date().toISOString(), nodeVersion: process.version,
  passed: checks.length, failed: 0, checks, inputPinsBefore: before, inputPinsAfter: after,
  realHttpRequests: 0, realPgConnections: 0, ddlExecuted: false, credentialsRead: false,
  productionSuccessMocked: false, pgSyntaxPrepared: false,
  note: 'No Root callback invoked. This is static JS/rendering evidence, not PG/HTTP fault or concurrency acceptance.',
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passedPureStaticChecks: checks.length, realHttpRequests: 0, realPgConnections: 0, pgSyntaxPrepared: false }));
