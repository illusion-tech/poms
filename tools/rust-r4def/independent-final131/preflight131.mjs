// Independent, offline review only. No child processes, HTTP, DB, or private reads.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = 'tools/rust-r4def/independent-final131';
assert.equal(path.resolve(process.cwd()).toLowerCase(), path.resolve(root).toLowerCase());
const sha = b => createHash('sha256').update(b).digest('hex');
const cache = new Map();
const expected = {
  'tmp/rust-r4def/independent/g3-stable-preflight89.json': '87ebe6673fbf574164a658f42762910aa0324e03ec1311b0cf06004a1188cc99',
  'tmp/rust-r4def/independent/k98-runtime-preflight114.json': '78a2de714bbbb22c872af887d69737c89acba61497991fc71302de3229664edb',
  'tmp/rust-r4def/independent/K-evidence-review124.json': 'b3c7ee972b3cc9c095bdfecc260a683731e1f71b55f0bb4d0daff0ffc4e2224e',
  'tmp/rust-r4def/root/final-source126/manifest126.json': '891a98bcaec490cf5ce9d65cf74064a449064e89593fdba2fe848a42d83ffaf0',
};
function local(file) {
  assert.equal(typeof file, 'string');
  let f = file.replaceAll('\\', '/');
  for (const prefix of ['/home/wangzishi/projects/poms-rust-r4def/', '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/']) {
    if (f.startsWith(prefix)) f = f.slice(prefix.length);
  }
  assert(!f.toLowerCase().includes('/private/'), 'private-read-forbidden');
  const abs = path.resolve(root, f);
  assert(abs.toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep), 'read-outside-root:' + f);
  assert(!fs.lstatSync(abs).isSymbolicLink(), 'symlink:' + f);
  return abs;
}
function bytes(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(local(file)));
  return cache.get(file);
}
const json = file => JSON.parse(bytes(file));
function pin(file) { const b = bytes(file); return { file, bytes: b.length, sha256: sha(b) }; }
function check(p, field = 'file') {
  const b = bytes(p[field]);
  assert.equal(sha(b), p.sha256 ?? p.rawBytesSha256, 'hash-mismatch:' + p[field]);
  if (p.bytes !== undefined) assert.equal(b.length, p.bytes, 'size-mismatch:' + p[field]);
}
function checkSnapshots(pins) {
  for (const p of pins) { assert(p.snapshot); check(p, 'snapshot'); }
  return { records: pins.length, uniqueFileHashVersions: new Set(pins.map(p => p.file + '@' + (p.sha256 ?? p.rawBytesSha256))).size, allSnapshotsMatch: true };
}
function compareCurrent(pins) {
  const delta = [];
  let matches = 0;
  for (const p of pins) {
    const actual = pin(p.file);
    if (actual.sha256 === (p.sha256 ?? p.rawBytesSha256) && (p.bytes === undefined || actual.bytes === p.bytes)) matches++;
    else delta.push({ file: p.file, priorSha256: p.sha256 ?? p.rawBytesSha256, currentSha256: actual.sha256, category: p.category });
  }
  return { records: pins.length, matches, delta };
}
function walk(dir) {
  return fs.readdirSync(local(dir), { withFileTypes: true }).flatMap(e => {
    assert(!e.isSymbolicLink());
    const f = dir + '/' + e.name;
    return e.isDirectory() ? walk(f) : [f];
  });
}
function snapshot(file) {
  const target = path.resolve(root, out, 'inputs', file.replaceAll(':', '_') + '.bin');
  assert(target.toLowerCase().startsWith(path.resolve(root, out).toLowerCase() + path.sep));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes(file), { flag: 'wx' });
  return { ...pin(file), snapshot: path.relative(root, target).replaceAll('\\', '/') };
}
for (const [file, hash] of Object.entries(expected)) assert.equal(pin(file).sha256, hash);
const r89 = json('tmp/rust-r4def/independent/g3-stable-preflight89.json');
for (const p of Object.values(r89.inputManifests)) check(p);
const m89 = json(r89.inputManifests.initial.file);
const facts89 = json(r89.inputManifests.publicFacts.file);
const back89 = json(r89.inputManifests.correctedReadback.file);
const race89 = json(r89.inputManifests.effectiveRaces.file);
const stablePins = [...m89.pins, ...facts89.extraPins, ...back89.extraPins, ...race89.pins];
const stableSnapshots = checkSnapshots(stablePins);
assert.equal(stableSnapshots.uniqueFileHashVersions, 2216);
const sourceCategories = new Set(['Rust-current-candidate', 'K56-not-final-K86', 'D18-current', 'ORM-current', 'generated-client-current']);
const stableCurrent = compareCurrent(m89.pins.filter(p => sourceCategories.has(p.category)));
const expectedK = new Set(['apps/poms-api-rust/src/attachments/service.rs', 'apps/poms-api-rust/src/attachments/store.rs', 'apps/poms-api-rust/src/attachment_storage/registry.rs']);
assert(stableCurrent.delta.every(p => expectedK.has(p.file)), 'unreviewed-stable-product-change');
const r114 = json('tmp/rust-r4def/independent/k98-runtime-preflight114.json');
const r124 = json('tmp/rust-r4def/independent/K-evidence-review124.json');
const runtimeSnapshots = checkSnapshots(r114.inputPins);
const latestKSnapshots = checkSnapshots(r124.inputPins);
const latestKCurrent = compareCurrent(r124.inputPins);
assert.equal(latestKCurrent.delta.length, 0, 'K124-input-changed');
const m126 = json('tmp/rust-r4def/root/final-source126/manifest126.json');
const categories126 = {};
for (const field of ['product', 'client', 'formal', 'runtimeInputs', 'sixS4ProtectedSources', 'evidence']) {
  for (const p of m126[field]) check(p);
  categories126[field] = { records: m126[field].length, allCurrentFilesMatch: true };
}
check(m126.baseline);
const clientFiles = walk('libs/shared/api-client');
assert.deepEqual(clientFiles.sort(), m126.client.map(p => p.file).sort());
assert.equal(clientFiles.length, 616);
const protection = json('tools/openapi/shared-api-client-baseline.json');
for (const p of protection.protectedSources) {
  check(p);
  const frozen = m126.sixS4ProtectedSources.find(x => x.file === p.file);
  assert.equal(frozen.rawBytesSha256, p.sha256);
  assert.equal(frozen.literalS4BlobSha256, p.sha256);
}
const runtime = json('tmp/rust-r4def/root/final-runtime110.json');
for (const p of runtime.productSources) check(p);
const rustChecks = [];
for (const p of runtime.checks) {
  check(p);
  const receipt = json(p.file);
  for (const input of receipt.inputs) check(input);
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.sourceStable, true);
  rustChecks.push({ receipt: pin(p.file), inputCount: receipt.inputs.length, allCurrentFilesMatch: true, exitCode: receipt.exitCode });
}
const stopped = json('tmp/rust-r4def/root/stopped128.json');
assert(stopped.allOwnedAPIsStopped && stopped.noAppPGConnections && stopped.ownedPG15RetainedForControlledCleanup);
assert(stopped.records.every(r => r.originalProcessGone));
assert(stopped.databases.every(db => db.originalImmutableTriggers.length === 5));
const windows = json('tmp/rust-r4def/root/windows-ui-port129.json');
assert(windows.actuallyBoundAndReleased);
const report = {
  kind: 'independent-R4DEF-final131-preflight-only', reviewedAtUtc: new Date().toISOString(),
  status: 'Existing immutable pins and final candidate verified; terminal cleanup and actual G4 remain pending',
  acceptedReviewChain: Object.keys(expected).map(snapshot), stableSnapshots, stableCurrent,
  runtimeSnapshots, latestKSnapshots, latestKCurrent: { records: latestKCurrent.records, matches: latestKCurrent.matches, delta: latestKCurrent.delta },
  final126: { literalHead: m126.literalHead, mainBase: m126.mainBase, permanentS4: m126.permanentS4, categories: categories126, baseline: pin(m126.baseline.file), surface: m126.surface, checks: m126.checks },
  rustChecks, binarySha256: runtime.binarySha256,
  reusable: { stableNonK: true, finalK: true, currentCandidateOnly: true, literalHEADWasNotIndependentlyQueried: true, permanentS4BlobReadNotRepeated: true, sixCurrentSourcesAndPriorPinnedLiteralComparisonVerified: true },
  stoppedEvidence: ['tmp/rust-r4def/root/stopped128.json', 'tmp/rust-r4def/root/windows-ui-port129.json'].map(snapshot),
  pending: { ownedPGStillRetainedAt128: true, terminalCleanup: true, exactApprovedPlan: true, publicPerPKProducerLedger: true, actualCommitAndDoubleFreshNoops: true, objectBackupAndUnlink: true, ownedPGStop: true, actualCommittedOrMainIntegrationAndGovernanceG4: true },
  reviewer: { privateRead: false, DBHTTPGitGHOSMutation: false, productOrOldEvidenceModified: false, writesOnly: out + '/**' },
  newProductFindingsP0P1P2: [], G3Pass: false, G4Pass: false, issueClosure: false,
};
const resultPath = path.resolve(root, out, 'preflight131.json');
fs.writeFileSync(resultPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ file: path.relative(root, resultPath).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(resultPath)), stableSnapshots, stableCurrentDelta: stableCurrent.delta, runtimePins: runtimeSnapshots.records, latestKPins: latestKSnapshots.records, final126: categories126, rustChecks: rustChecks.map(r => ({ inputs: r.inputCount, exitCode: r.exitCode })), G3Pass: false, G4Pass: false }) + '\n');
