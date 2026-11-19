// FS-only successor proposal. The original205 and its independent hold remain.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), pack = R + '/tools/rust-r4ghi/period205-02';
const sha = value => createHash('sha256').update(value).digest('hex');
const oldRaw = fs.readFileSync(R + '/tools/rust-r4ghi/period205/manifest205.json');
assert.equal(sha(oldRaw), '95bed56cd870e5adaebd016ae7ed18e8da8a75e297ecf6cb46d8e95e722c03e9');
const old = JSON.parse(oldRaw), changes = [];
const write = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); return { file: path.relative(R, file).split(path.sep).join('/'), rawBytesSha256: sha(bytes) }; };
const replace = (text, a, b) => { assert.equal(text.split(a).length, 2, 'One exact replacement'); return text.replace(a, b); };
const guard = String.raw`
function periodPreparation205(ctx, scope, currentSnapshotId) {
  const { body, projectId } = scope;
  assert(Array.isArray(body.costDecisions) && body.costDecisions.length === 0, 'This reviewed period fixture is already classified; do not introduce new decisions');
  const pin = scope.periodPreparation; assert(pin, 'An actual period preparation HTTP receipt is mandatory before FI');
  const within = (root, file) => { const rel = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'Period proof escaped its actual current run'); };
  within(ctx.out, pin.file); const http = JSON.parse(readPin54(pin));
  assert.equal(http.kind, 'actual-business-HTTP-attempt'); assert.equal(http.operationId, 'ProjectCostController_getProjectUnifiedAccounting');
  assert.equal(http.method, 'GET'); assert.equal(http.canonicalTemplate, '/api/projects/{projectId}/unified-accounting');
  assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
  for (const key of ['requestConfig', 'requestBody', 'responseBody']) within(ctx.priv, http.originals[key].file);
  const request = JSON.parse(readPin54(http.originals.requestConfig)); assert.equal(readPin54(http.originals.requestBody).length, 0);
  assert.equal(request.operationId, http.operationId); assert.equal(request.requestId, http.requestId); assert.equal(request.method, 'GET');
  const url = new URL(request.url); assert.equal(url.origin, ctx.api); assert.equal(url.pathname, '/api/projects/' + projectId + '/unified-accounting');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['intent', 'periodKey', 'view']); assert.equal(sha(url.search), http.querySha256);
  assert.equal(url.searchParams.get('view'), 'preparation'); assert.equal(url.searchParams.get('intent'), 'period-close'); assert.equal(url.searchParams.get('periodKey'), body.periodKey);
  within(ctx.priv, request.before.file); const before = JSON.parse(readPin54(request.before));
  assert.equal(before.epoch, ctx.epoch); assert.equal(before.run, ctx.run); assert.equal(before.marker, ctx.state.marker);
  const value = JSON.parse(readPin54(http.originals.responseBody)), p = (value.data ?? value).preparation;
  assert.equal(p?.kind, 'preparation-only'); assert.equal(p.intent, 'period-close'); assert.equal(p.projectId, projectId); assert.equal(p.periodKey, body.periodKey);
  assert.equal(p.headVersion, body.expectedVersion); assert.equal(p.projectVersion, body.expectedProjectVersion); assert.equal(p.expectedInputHash, body.expectedInputHash);
  assert.equal(p.formalEligibility?.status, 'eligible'); assert.deepEqual(p.formalEligibility.blockingReasonCodes, []); assert.deepEqual(p.blockingReasonCodes, []);
  assert(p.allowedCommandCodes.includes('period-close')); assert.equal(body.expectedPeriodSnapshotRef, null);
  const baseline = p.selectedBaselinePackageRef; assert.equal(baseline.kind, 'OperatingBaselinePackage');
  assert.deepEqual(body.baselinePackageRef, { kind: baseline.kind, id: baseline.id, expectedVersion: baseline.rowVersion, payloadHash: baseline.payloadHash });
  assert.equal(p.officialSnapshotRef?.id, currentSnapshotId, 'The real preparation must use this selected live capture');
  const inputs = p.sourceRows.filter(row => ['direct-cost', 'allocation-share'].includes(row.rowKind));
  assert(inputs.length); const units = inputs.map(row => {
    const kind = row.rowKind === 'direct-cost' ? 'ProjectActualCostRecord' : 'SharedCostAllocationResult';
    assert.equal(row.sourceRef.kind, kind); uuid(row.sourceRef.id); assert.equal(row.state, 'ready'); assert.deepEqual(row.blockingReasonCodes, []);
    return { unit: (kind === 'ProjectActualCostRecord' ? 'cost:' : 'allocation:') + row.sourceRef.id, row };
  });
  assert.equal(new Set(units.map(value => value.unit)).size, units.length);
  return { preparation: p, units };
}
`;
for (const change of old.changes) {
  const source = fs.readFileSync(R + '/' + change.after.file); assert.equal(sha(source), change.after.rawBytesSha256);
  let output = source;
  if (change.file.endsWith('/gh-write-facts.mjs')) {
    let text = source.toString();
    text = replace(text, "import assert from 'node:assert/strict';", "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { readPin54 } from './consumer-admission54.mjs';");
    text = replace(text, "import { keyOf, uuid } from './pure.mjs';", "import { keyOf, uuid, sha } from './pure.mjs';");
    text = replace(text, 'export function deriveGHWriteFacts(ctx, snapshot, operationId, scope, readRows) {', guard + '\nexport function deriveGHWriteFacts(ctx, snapshot, operationId, scope, readRows) {');
    text = replace(text, '  const seen = new Map();', "  const periodProof = result.snapshotMode === 'period-end' ? periodPreparation205(ctx, scope, result.currentSnapshotId) : null;\n  if (periodProof) assert.equal(periodProof.preparation.selectedBaselinePackageRef.id, result.baselineId);\n  const seen = new Map();");
    text = replace(text, "      const decision = owned('project_cost_inclusion_decision', value.decision_id); assert.equal(decision.project_id, projectId);", String.raw`      const decision = owned('project_cost_inclusion_decision', value.decision_id); assert.equal(decision.project_id, projectId);
      assert.equal(decision.unit_key, value.unit_key); assert.equal(decision.source_row_version, value.captured_source_version);
      assert.equal(decision.cost_record_id, match[1] === 'cost' ? match[2] : null); assert.equal(decision.allocation_result_id, match[1] === 'allocation' ? match[2] : null);
      const frozen = decision.frozen_payload?.sourceRef; assert.equal(frozen?.id, match[2]);
      assert.equal(frozen.kind, match[1] === 'cost' ? 'ProjectActualCostRecord' : 'SharedCostAllocationResult');
      assert.equal(frozen.rowVersion, value.captured_source_version); assert.equal(frozen.payloadHash, value.captured_payload_hash);
      const prepared = periodProof.units.find(item => item.unit === value.unit_key); assert(prepared, 'Period preparation omitted an actual selected cost unit');
      assert.deepEqual(prepared.row.sourceRef, frozen); assert.equal(prepared.row.currentDecisionRef?.id, decision.id);
      assert.equal(prepared.row.currentDecisionRef.rowVersion, decision.row_version);`);
    text = replace(text, "  result.costUnits = sorted(result.costUnits); assert(result.costUnits.length, 'Do not claim cost membership FI for an empty/unproven cost-scope case');", "  result.costUnits = sorted(result.costUnits); assert(result.costUnits.length, 'Do not claim cost membership FI for an empty/unproven cost-scope case');\n  if (periodProof) assert.deepEqual(result.costUnits, sorted(periodProof.units.map(value => value.unit)), 'The complete period preparation and current membership must have exactly the same units');");
    output = Buffer.from(text);
  }
  changes.push({ ...change, after: write(pack + '/proposed/' + change.file, output) });
}
const testFile = 'tools/rust-r4ghi/business/gh-write-inventory.test.mjs', testBefore = fs.readFileSync(R + '/' + testFile);
let tests = testBefore.toString();
tests = replace(tests, "  const facts = f.derive(ghWriteOperations[2], s), inventory = ghWriteInventory(ghWriteOperations[2], { ...s, ghFacts: facts });", "  assert.throws(() => f.derive(ghWriteOperations[2], s), /already classified/);\n  const facts = { ...f.derive(ghWriteOperations[1], { ...s, body: { ...s.body, snapshotMode: 'realtime' } }), snapshotMode: 'period-end' };\n  const inventory = ghWriteInventory(ghWriteOperations[2], { ...s, ghFacts: facts });");
changes.push({ file: testFile, operation: 'update-pure-period-inventory-test-and-reject-unapproved-effect-path',
  before: write(pack + '/before/' + testFile, testBefore), after: write(pack + '/proposed/' + testFile, tests) });
const manifest = { ...old, kind: 'proposed-Source13-preclassified-period-FI-tool-correction205-02', supersedesProposal: { file: 'tools/rust-r4ghi/period205/manifest205.json', rawBytesSha256: sha(oldRaw) },
  independentHoldRetained: 'tools/rust-r4ghi/independent/review05/period205-review119/review119.json', changes,
  mandatoryInstallGuard: ['actual-current-run-period-preparation-HTTP-pin', 'canonical-request-and-raw-response-identity', 'eligible-and-exact-CAS-hash-baseline', 'empty-cost-decisions', 'all-and-only-preparation-units-equal-current-members', 'current-source-versions-and-decision-unit-and-typed-FK-and-frozen-ref-match'],
  RootApplied: false, H1Admitted: false, databaseOrHTTPExecuted: false, formalG3Certified: false, G4Certified: false };
const result = write(pack + '/manifest205-02.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ proposal: result, helpersChanged: changes.length, RootApplied: false, source416Changed: false, databaseOrHTTPExecuted: false }));
