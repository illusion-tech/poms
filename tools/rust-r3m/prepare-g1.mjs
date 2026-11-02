// Root-only immutable input admission. Does not grant G1 or execute product code.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const base = '5041275d7ad82af4becbb4462e7213ffe465bc7a';
const tmp = 'tmp/rust-r3m', formal = 'docs/design/rust-r3m';
const sha = b => createHash('sha256').update(b).digest('hex');
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: sha(b) }; };
const read = file => JSON.parse(fs.readFileSync(file));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  assert(!e.isSymbolicLink(), dir + '/' + e.name);
  return e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name];
}).sort();
function copy(source, target) {
  const b = fs.readFileSync(source);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  assert(!fs.existsSync(target));
  fs.writeFileSync(target, b, { flag: 'wx' });
  return { logicalOriginal: source, ...pin(target) };
}
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), base);
assert(!fs.existsSync(formal + '/g1-input-manifest01.json'));
for (const key of ['a', 'b', 'd']) assert(fs.existsSync(`${tmp}/input-${key}/g1-input01.json`), 'Await input ' + key);
const old = read('docs/design/archive/slices/rust-r3hijk/preflight-native-source-manifest01.json');
for (const p of old.nativeFiles) assert.deepEqual(pin(p.file), p, 'Unexpected pre-G1 protected delta ' + p.file);
const rustFiles = execFileSync('git', ['ls-files', '-z', '--', 'apps/poms-api-rust'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort().map(pin);
assert(rustFiles.length >= 230 && rustFiles.every(x => !x.file.includes('/target/')));
const inventory = read('docs/design/rust-r3-operation-slices.json');
assert.equal(inventory.operations.length, 58);
assert.equal(new Set(inventory.operations.map(x => x.operationId)).size, 58);
assert(inventory.operations.every(x => x.rustDelivered && x.G4Certified && x.canonical.status === 'aligned'));
const registry = read(tmp + '/root/g0-issue-registration.json');
assert.deepEqual(registry.children.map(x => x.number), [98, 99, 100]);
const baselineFile = 'docs/design/rust-r3-closeout-baseline.md';
const dBaseline = read(tmp + '/input-d/g1-input01.json').formalInputs.find(x => x.file === baselineFile);
assert.equal(dBaseline.bytes, 14011);
assert.equal(dBaseline.rawBytesSha256, 'a4838996cf1aea0b91deafd1808b69486b64adc5ac381c7c54b7dcdfea16aa23');
const currentBaseline = pin(baselineFile);
let dBaselineBytes = fs.readFileSync(baselineFile, 'utf8');
for (const [actual, oldName] of [['project_technical_cost', 'project_costs'], ['project_bid_commercial', 'project_bids'], ['project_pricing_margin', 'project_pricing']]) dBaselineBytes = dBaselineBytes.replaceAll(actual, oldName);
assert.equal(Buffer.byteLength(dBaselineBytes), dBaseline.bytes);
assert.equal(sha(dBaselineBytes), dBaseline.rawBytesSha256);
const originals = [
  ...walk(tmp + '/root/g0-online01'), tmp + '/root/g0-issue-registration.json',
  ...['a', 'b', 'd'].flatMap(k => walk(`${tmp}/input-${k}`)),
].map(source => {
  // B sealed its prose before table formatting. Preserve that original as raw
  // bytes rather than rewriting a sealed input or exempting docs formatting.
  const rawSuffix = source === tmp + '/input-b/g1-input01.md' ? '.bin' : '';
  return copy(source, formal + '/originals/' + source.slice(tmp.length + 1) + rawSuffix);
});
const controls = [
  '.gitattributes', 'docs/design/rust-r3-closeout-baseline.md', 'docs/design/rust-r3-scope-and-dependencies.md',
  'docs/design/backend-rust-migration-plan.md', 'docs/design/rust-r3-operation-slices.json',
  'docs/design/archive/slices/rust-r3hijk-closeout.md',
  'docs/design/archive/slices/rust-r3hijk/C/g4-closeout-preflight01.json',
  'docs/adr/018-rust-backend-and-sqlx-persistence.md',
  ...walk('tools/rust-r3m'),
].map(pin);
const E1Inputs = ['g1-input-manifest02.json', 'preflight-native-source-manifest01.json', 'g1-operation-slices-original.json', 'input-a/native-fixture-draft01.mjs', 'input-b/native-fixture-draft01.mjs'].map(name => {
  const alias = 'docs/design/rust-r3cdefg/' + name, canonical = 'docs/design/archive/slices/rust-r3cdefg/' + name;
  const st = fs.lstatSync(alias);
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1);
  assert(fs.readFileSync(alias).equals(fs.readFileSync(canonical)));
  return { ...pin(alias), canonical: pin(canonical) };
});
assert.equal(E1Inputs.reduce((n, x) => n + x.bytes, 0), 419264);
const value = {
  kind: 'R3-closeout-joint-G1-input-manifest', base, createdAt: new Date().toISOString(),
  batchIssue: 97, childIssues: [98, 99, 100], stageIssue: 85, overallIssue: 57,
  publicSurface: { newOperations: 0, rustOperations: 173, rustPaths: 138, schemas: 585, nativeOperations: 291, nativePaths: 237, clientFiles: 579, migrations: 92 },
  protectedFiles: old.nativeFiles, rustFiles, controls, originals, E1Inputs,
  authorInputReconciliation: [{
    author: 'D', finding: 'Root corrected three B ownership directory names after D01 was sealed',
    originalPin: dBaseline, authoritativeCurrentPin: currentBaseline,
    exactDelta: '26 bytes; replace project_costs/project_bids/project_pricing with actual Rust directory names project_technical_cost/project_bid_commercial/project_pricing_margin; all other bytes match',
    policy: 'D01 remains original; current Root baseline and this manifest supersede only its old baseline pointer. No business scope changes.',
    independentPreflight: 'C independently reversed only these three names in memory and matched original D01 baseline bytes/hash',
  }],
  protectedAllowedG2Deltas: ['apps/poms-admin/src/app/features/lead/lead-list.ts', 'apps/poms-admin/src/app/features/lead/lead-list.spec.ts'],
  originalMapping: 'Exact bytes; historical raw paths retained in logicalOriginal; copied before independent review. B sealed unformatted Markdown is preserved as .md.bin, not edited or represented as formatted docs.',
  approvalOwnership: { R3: 'Lead manual score override; same transaction status/snapshot/required audit', R4: 'contract / contract-review', R5: 'commission-payout / commission-adjustment' },
  G1Certified: false, G3Certified: false, G4Certified: false, stageIntegrationComplete: false,
};
fs.writeFileSync(formal + '/g1-input-manifest01.json', JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin(formal + '/g1-input-manifest01.json'), protected: old.nativeFiles.length, rust: rustFiles.length, controls: controls.length, originals: originals.length, G1Certified: false }));
