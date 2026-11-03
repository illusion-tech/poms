// Root-only export/protection check draft. No runtime start, DB or generation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { guardCandidate, guardNative, pin } from '../../../tools/rust-r3m/source-guard.mjs';
const self = 'tmp/rust-r3m/guard-contract-draft/integrity-run01.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m'; assert.equal(process.cwd(), root);
const [attempt] = process.argv.slice(2); assert.match(attempt, /^\d{2}$/);
const out = 'tmp/rust-r3m/integrity' + attempt; assert(!fs.existsSync(out)); fs.mkdirSync(out);
const candidate = guardCandidate(), protectedCount = guardNative();
assert.equal(candidate.label, 'final01'); assert.deepEqual(pin(candidate.artifact.file), candidate.artifact);
const capsuleFile = 'tmp/rust-r3m/root/candidate-' + candidate.label + '.json';
const sourceFiles = [self, capsuleFile, 'docs/design/rust-r3m/g1-input-manifest01.json', 'docs/design/rust-r3-operation-slices.json', 'docs/design/api-route-canonical-inventory.md', 'libs/shared/api-spec/openapi.json', 'docs/design/archive/slices/rust-r3hijk/evidence/final-integrity04/rust-openapi-original.json'];
const sources = sourceFiles.map(pin), canonical = fs.readFileSync('docs/design/api-route-canonical-inventory.md', 'utf8');
const result = spawnSync(candidate.artifact.file, ['--openapi'], { cwd: root, env: { PATH: '/usr/bin:/bin' }, encoding: null, maxBuffer: 16000000, timeout: 20000 });
for (const key of ['stdout', 'stderr']) fs.writeFileSync(out + '/rust-openapi-' + key + '-original.bin', result[key] || Buffer.alloc(0), { flag: 'wx' });
assert.equal(result.status, 0); assert(!result.error && !result.signal);
const spec = JSON.parse(result.stdout), native = JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json'));
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const operations = s => Object.entries(s.paths).flatMap(([path, item]) => Object.entries(item).filter(([m]) => methods.has(m)).map(([method, operation]) => ({ path, method, operation })));
assert.equal(operations(spec).length, 173); assert.equal(Object.keys(spec.paths).length, 138);
assert.equal(Object.keys(spec.components.schemas).length, 585); assert.deepEqual(spec.components.schemas, native.components.schemas);
assert.equal(operations(native).length, 291); assert.equal(Object.keys(native.paths).length, 237);
assert.equal(new Set(operations(spec).map(x => x.operation.operationId)).size, 173);
// Product changes are service/store/UI only; the full exported Rust document,
// including inherited 115 operations, must be unchanged from the accepted input.
const previous = JSON.parse(fs.readFileSync('docs/design/archive/slices/rust-r3hijk/evidence/final-integrity04/rust-openapi-original.json'));
assert.deepEqual(spec, previous, 'No public contract delta is authorized in this closeout');
const inventory = JSON.parse(fs.readFileSync('docs/design/rust-r3-operation-slices.json')); assert.equal(inventory.operations.length, 58);
const canonicalRows = canonical.split(/\r?\n/).filter(x => x.startsWith('|')).map(x => x.split('|').slice(1, -1).map(y => y.trim().replaceAll('`', '')));
const grammar = x => x.replace(/\{[^}]+\}/g, '{uuid}');
const join = [];
for (const o of inventory.operations) {
  const method = o.method.toLowerCase();
  assert.equal(o.canonical.status, 'aligned');
  assert.equal(spec.paths[o.path]?.[method]?.operationId, o.operationId);
  assert.deepEqual(spec.paths[o.path][method], native.paths[o.path][method], o.operationId + ' complete original operation');
  const rows = canonicalRows.filter(row => row[0] === o.canonical.domain && row[1] === o.canonical.capability);
  assert.equal(rows.length, 1, 'Unique canonical ownership: ' + o.operationId);
  assert.equal(grammar(rows[0][2]), grammar(o.method + ' ' + o.path.replace(/^\/api(?=\/)/, '')));
  assert.equal(rows[0].at(-1), 'aligned');
  join.push({ operationId: o.operationId, method: o.method, path: o.path, canonical: rows[0], fullOperationEqual: true });
}
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => { const p = dir + '/' + e.name; assert(!fs.lstatSync(p).isSymbolicLink()); return e.isDirectory() ? walk(p) : [p]; }).sort(); }
const clients = walk('libs/shared/api-client').map(pin), migrations = walk('apps/poms-api/src/migrations').filter(f => /\/Migration.*\.ts$/.test(f)).map(pin);
assert.equal(clients.length, 579); assert.equal(migrations.length, 92);
const admission = JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-input-manifest01.json'));
for (const p of [...clients, ...migrations]) { const frozen = admission.protectedFiles.find(x => x.file === p.file); assert(frozen, 'Full frozen membership ' + p.file); assert.deepEqual(p, frozen); }
assert.deepEqual(sources.map(p => pin(p.file)), sources); guardCandidate(); guardNative();
const report = { kind: 'R3M-same-candidate-executable-complete-contract-protection', createdAt: new Date().toISOString(), completed: true, sources, artifact: candidate.artifact, protectedCount, export: { stdout: pin(out + '/rust-openapi-stdout-original.bin'), stderr: pin(out + '/rust-openapi-stderr-original.bin'), exitCode: result.status }, rust: { operations: 173, paths: 138, schemas: 585 }, native: { operations: 291, paths: 237, schemas: 585 }, all173ExportedOperationsAndSchemasUnchanged: true, current58NativeCanonicalJoins: join, clients, migrations, clientGenerationPerformed: false, clientRegenerationClaim: false, noProductWrites: true, G3Certified: false, G4Certified: false };
fs.writeFileSync(out + '/report01.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ completed: true, rust: report.rust, native: report.native, canonicalJoins: join.length, clientFiles: clients.length, migrations: migrations.length, noProductWrites: true }));
