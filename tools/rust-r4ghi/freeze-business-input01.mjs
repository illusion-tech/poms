// Capture the Root-owned G1 candidate. This never grants G1 or G2 on its own.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

process.chdir('E:/projects/worktrees/poms-r3hijk-next28/poms');
const base = 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5';
const dir = 'tools/rust-r4ghi/joint-g1/effective-v2';
const manifestPath = 'docs/design/rust-r4ghi/g1-source-manifest01.json';
const mapPath = 'docs/design/rust-r4ghi/operation-map01.json';
assert(!fs.existsSync(manifestPath), 'immutable candidate exists; use a new capture version');
assert(!fs.existsSync(mapPath), 'operation candidate already exists; inspect before recapture');
const sha = value => createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = args => {
  const result = spawnSync('git', args, { encoding: null, windowsHide: true, maxBuffer: 30_000_000 });
  assert.equal(result.status, 0, `git ${args[0]} failed`);
  return result.stdout;
};
assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), base);
const blueprint = json(`${dir}/blueprint.json`);
const ops = blueprint.operationMap;
assert.equal(ops.length, 32);
assert.equal(new Set(ops.map(op => op.operationId)).size, 32);
assert.equal(new Set(ops.map(op => op.canonical)).size, 32);
assert.equal(ops.filter(op => op.newPublicOperation).length, 3);
assert.equal(ops.filter(op => op.method === 'POST').length, 16);
const inventory = fs.readFileSync('docs/design/api-route-canonical-inventory.md', 'utf8').split(/\r?\n/);
const operations = ops.map(op => {
  const matches = inventory.flatMap((row, index) => {
    if (!row.startsWith('|')) return [];
    const columns = row.split('|').map(part => part.trim());
    return columns[3]?.replaceAll('`', '') === op.canonical ? [{ line: index + 1, row }] : [];
  });
  assert.equal(matches.length, 1, `canonical must have exactly one authoritative row: ${op.canonical}`);
  if (op.newPublicOperation) assert(matches[0].row.includes('`planned`'));
  return { ...op, observedRows: matches, inventoryStatus: op.newPublicOperation ? 'new-planned-canonical-decided' : 'existing-aligned' };
});
const mapBytes = Buffer.from(JSON.stringify({
  kind: 'Root-frozen-32-operation-joint-G1-candidate',
  status: 'Pending independent review and online freeze',
  productBase: base,
  blueprint: `${dir}/blueprint.json`,
  blueprintSHA256: sha(fs.readFileSync(`${dir}/blueprint.json`)),
  operations,
}, null, 2) + '\n');

const files = new Set([
  'docs/design/rust-r4ghi-next32-baseline.md',
  'docs/design/api-route-canonical-inventory.md',
  'docs/design/README.md',
  'docs/adr/015-api-route-canonical-grammar.md',
  'docs/design/backend-rust-migration-plan.md',
  'docs/design/rust-migration-execution-tracker.md',
  'docs/design/rust-r4-scope-and-dependencies.md',
  'docs/design/phase2-development-execution-tracker.md',
  'docs/design/rust-r4ghi-delivery-status.json',
  'docs/design/rust-r4ghi/user-decisions02.json',
  'docs/design/rust-r4ghi/user-decision-scope03.json',
  'docs/design/rust-r4ghi/acceptance-plan01.json',
  'tools/rust-r4ghi/freeze-business-input01.mjs',
  'tools/rust-r4ghi/freeze-business-online01.mjs',
  'tools/rust-r4ghi/prepare-business-g1-docs01.mjs',
  'tools/rust-r4ghi/business-g1-preflight01.mjs',
  mapPath,
]);
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.posix.join(directory, item.name);
    if (item.isDirectory()) walk(file);
    else if (!file.includes('/__pycache__/') && !file.endsWith('.pyc')) files.add(file);
  }
}
walk(dir);
walk('tools/rust-r4ghi/joint-g1/capacity-delta02');
for (const old of [...json('tools/rust-r4ghi/joint-g1/sources.json').entries, ...json(`${dir}/sources.json`).entries]) {
  let file = old.path;
  if (file === 'docs/design/rust-r4ghi-user-create-fix-baseline.md') file = 'docs/design/archive/slices/rust-r2-user-create-fix115/baseline.md.bin';
  assert(fs.existsSync(file), `source moved without explicit provenance: ${file}`);
  files.add(file);
}
// Drafts remain auditable but do not compete with the effective-v2 authority.
for (const directory of ['tools/rust-r4ghi/G/final-g1', 'tools/rust-r4ghi/H/final-g1', 'tools/rust-r4ghi/I/final-g1']) walk(directory);
const entries = [...files].sort().map(file => {
  const raw = file === mapPath ? mapBytes : fs.readFileSync(file);
  const product = /^(apps|libs)\//.test(file);
  const record = { path: file, bytes: raw.length, sha256: sha(raw), role: product ? 'unchanged-product-source' : file.startsWith(dir + '/') ? 'effective-v2-formal-target' : 'formal-input-or-preserved-reference' };
  if (product) {
    const original = git(['show', `${base}:${file}`]);
    assert.equal(sha(original), record.sha256, `G2 product mutation before G1: ${file}`);
    record.gitBase = base;
    record.gitBlob = git(['rev-parse', `${base}:${file}`]).toString().trim();
  }
  return record;
});
fs.writeFileSync(mapPath, mapBytes, { flag: 'wx' });
fs.writeFileSync(manifestPath, JSON.stringify({
  kind: 'Root-joint-G1-raw-byte-input-manifest',
  version: 1,
  capturedAt: new Date().toISOString(),
  productBase: base,
  status: 'Pending non-author independent G1 and actual online freeze; not G2 permission',
  normativeBaseline: 'docs/design/rust-r4ghi-next32-baseline.md',
  effectiveBlueprint: `${dir}/blueprint.json`,
  effectiveMigration: `${dir}/migration.sql`,
  authority: 'Root baseline plus effective-v2 and capacity-delta02; author proposals and v1 are historical references only',
  counts: { G: 9, H: 8, I: 11, R5Minimum: 4, total: 32, newPublic: 3, existing: 29, officialRust: 240, targetRust: 272, R4Delivered: 67, R4Planned: 95 },
  rawByteHash: 'sha256; no normalization; manifest excludes itself and future independent certificates/online receipts',
  entries,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ kind: 'G1-candidate-captured', fileCount: entries.length, unchangedProductSources: entries.filter(entry => entry.role === 'unchanged-product-source').length, manifestPath, sha256: sha(fs.readFileSync(manifestPath)), G1Certified: false, G2Authorized: false }));
