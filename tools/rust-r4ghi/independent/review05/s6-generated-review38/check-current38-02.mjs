import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd(), out = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.resolve(root, file));
const json = file => JSON.parse(read(file));
const norm = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 25 * 1024 * 1024 });
const A = '2cd1be6029cf1b14ebfb1fc4530af894507a4c5a', B = '8c6e98db9cae598787da095084965c434ee1105a';
const S4 = '4f0ad88e78622a75b88b4e3cc72aded9da67458a';
const pins = new Map();
const pin = file => { const bytes = read(file); pins.set(file, sha(bytes)); return bytes; };
const proposalFile = 'tools/openapi/checkpoints/r4ghi-s6-tooling/proposal02.json';
const proposal = JSON.parse(pin(proposalFile));
const changes = git(['diff-tree', '--no-commit-id', '--name-only', '-r', B]).toString().trim().split(/\r?\n/).sort();
const expected = [...proposal.files.map(f => f.file ?? f.path), ...Array.from({ length: 9 }, (_, i) => `tools/openapi/checkpoints/r4ghi-s6-tooling/before/${String(i + 1).padStart(2, '0')}.bin`),
  'tools/openapi/checkpoints/r4ghi-s6-tooling/.gitattributes', proposalFile].sort();
assert.deepEqual(changes, expected); assert.equal(changes.length, 20);
for (const file of changes) assert.equal(sha(git(['show', `${B}:${file}`])), sha(pin(file)), `B2 committed blob differs ${file}`);
git(['merge-base', '--is-ancestor', S4, A]); git(['merge-base', '--is-ancestor', A, B]);

const baseline = JSON.parse(pin('tools/openapi/shared-api-client-baseline.json'));
assert.equal(baseline.sourceHead, A);
for (const value of baseline.protectedSources) {
  const file = value.file ?? value.path;
  assert.equal(sha(norm(pin(file))), sha(norm(git(['show', `${A}:${file}`]))), `Protected input differs from A2: ${file}`);
}
const manifestPath = 'tools/openapi/checkpoints/r4ghi-s6/input-manifest01.json';
assert.equal(sha(pin(manifestPath)), 'ddb2d8e44ed6897d75d0181093b49b3a27540560d2df73f789fd476bf1d91b35');
assert.equal(json(manifestPath).inputs.length, 420);
const spec = JSON.parse(pin('libs/shared/api-spec/openapi.json'));
assert.equal(sha(read('libs/shared/api-spec/openapi.json')), '942661f06947136bbdaf5621bdef9e531a7ab3fe350271f6ca054e01b495a19c');
assert.equal(Object.keys(spec.paths).length, 242); assert.equal(Object.keys(spec.components.schemas).length, 690);
assert.deepEqual(spec.components.schemas.ProjectInitialOwnership.enum, ['creator', 'organization']);

const registryFile = 'tools/rust-r1b/s5-reviewed-registry.json', identityFile = 'tools/rust-r1b/history/s3-nominal-identity.json';
const registry = JSON.parse(pin(registryFile)), identity = JSON.parse(pin(identityFile));
assert.equal(registry.sourceHead, A); assert.equal(sha(read(identityFile)), '9f5f1e044f0e5ea57023238cd5d6e2d2f5caf1b58f1977add5faaeb713daa335');
const beforeRegistry = JSON.parse(pin('tools/openapi/checkpoints/r4ghi-s6-tooling/before/06.bin'));
const byKey = new Map(registry.registrations.allCurrentEnumSources.map(value => [value.key, value]));
assert.equal(beforeRegistry.registrations.allCurrentEnumSources.length, 338);
for (const previous of beforeRegistry.registrations.allCurrentEnumSources) {
  const value = byKey.get(previous.key); assert(value); assert.equal(value.valuesSha256, previous.valuesSha256); assert.equal(value.family, previous.family);
}
const newOccurrences = registry.registrations.allCurrentEnumSources.filter(value => !beforeRegistry.registrations.allCurrentEnumSources.some(old => old.key === value.key));
assert.equal(newOccurrences.length, 1); assert.equal(newOccurrences[0].family, 'ProjectInitialOwnership');
for (const file of ['tools/rust-r1b/export-shared.mjs', 'tools/rust-r1b/s5/export-s5.mjs', 'tools/rust-r1b/s5/full-build.mjs',
  'tools/rust-r1b/s5/registered-module-graph.mjs', 'tools/rust-r1b/s5/static-data-oracle.mjs', 'tools/rust-r1b/s5/source-access.mjs', 'tools/rust-r1b/s5/review.mjs']) {
  assert.equal(sha(norm(pin(file))), sha(norm(git(['show', `${B}:${file}`]))), `Reviewed tooling source changed ${file}`);
}
const { createSnapshotSourceAccess } = await import(pathToFileURL(path.resolve(root, 'tools/rust-r1b/s5/source-access.mjs')));
const { buildS5Manifest } = await import(pathToFileURL(path.resolve(root, 'tools/rust-r1b/s5/full-build.mjs')));
const access = createSnapshotSourceAccess(root, sha(read(manifestPath)));
const sourceBefore = access.inputFingerprints();
const { main } = await import(pathToFileURL(path.resolve(root, 'tools/rust-r1b/export-shared.mjs')));
// The full published entry point adds its separately guarded generator/review attestations.
const rebuilt = await main(['--s5', '--check'], root);
const current = JSON.parse(pin('tools/rust-r1b/shared-manifest.json'));
assert.deepEqual(rebuilt, current, 'Pure actual fixed-source reconstruction differs from generated manifest');
assert.deepEqual(access.inputFingerprints(), sourceBefore);
assert.equal(current.enums.length, 331); assert.equal(current.enumOccurrences.length, 339);
assert.equal(current.enums.reduce((sum, value) => sum + value.values.length, 0), 1161);
const oldCandidateFile = 'tools/rust-r4ghi/G/implementation/support-patches/shared-enum-exporter09/manifest09.candidate.json';
const oldCandidate = JSON.parse(pin(oldCandidateFile)); assert.equal(oldCandidate.enums.length, 330);
const families = new Map(current.enums.map(value => [value.name, value]));
for (const previous of oldCandidate.enums) {
  const value = families.get(previous.name); assert(value); assert.deepEqual(value.values, previous.values); assert.deepEqual(value.aliases, previous.aliases);
}
assert.deepEqual(families.get('ProjectInitialOwnership').values, ['creator', 'organization']);
const whole = JSON.parse(pin('tmp/rust-r4ghi/root/whole-s6-check05/receipt.json'));
assert.equal(whole.exitCode, 0); assert.equal(whole.toolingCommit, B); assert.equal(whole.sourceHead, A);
assert.deepEqual(whole.before, whole.after);
for (const value of whole.after) assert.equal(sha(norm(pin(value.file))), value.sha256);
for (const value of [whole.stdout, whole.stderr]) assert.equal(sha(pin(value.file)), value.sha256);

const sdkReceiptFile = 'tmp/rust-r4ghi/root/client-generation06/receipt.json';
const sdkReceipt = JSON.parse(pin(sdkReceiptFile)); assert.equal(sdkReceipt.sourceHead, A);
for (const command of sdkReceipt.commands) {
  assert.equal(command.exitCode, 0);
  for (const value of [command.stdout, command.stderr]) { const raw = pin(value.file); assert.equal(raw.length, value.bytes); assert.equal(sha(raw), value.sha256); }
}
const check = json('tmp/rust-r4ghi/root/client-generation06/check-stdout.json');
assert.equal(check.result, 'pass'); assert.equal(check.mode, '--check'); assert.equal(check.clientWritten, false); assert.equal(check.metadataPreserved, true);
assert.deepEqual(check.differences, []); assert.equal(check.clientFiles, 683); assert.equal(check.spec.schemas, 690);
assert.equal(check.generator.version, '7.20.0'); assert.equal(check.generator.directJar, true); assert.equal(check.generator.javaVersion, '17.0.12');
assert.equal(sha(fs.readFileSync(sdkReceipt.fixedJar.file)), '871e0155287a87b579ff31096b2d45b1f95a115edfe631411ec6cff4848d0f03');
const directory = baseline.client.directory;
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.isFile() ? [path.join(dir, entry.name)] : []);
const actualFiles = walk(path.resolve(root, directory)).map(file => ({ file: path.relative(path.resolve(root, directory), file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) })).sort((a,b) => a.file.localeCompare(b.file));
const targetBefore = JSON.parse(pin('tmp/rust-r4ghi/root/client-generation06/target-before.json'));
const targetAfter = JSON.parse(pin('tmp/rust-r4ghi/root/client-generation06/target-after.json'));
const projectedAfter = targetAfter.map(({ file, sha256 }) => ({ file, sha256 })).sort((a,b) => a.file.localeCompare(b.file));
assert.equal(actualFiles.length, 683); assert.deepEqual(actualFiles, projectedAfter, 'Current SDK bytes differ from actual generation/check receipt');
for (const file of baseline.client.metadata) {
  assert.equal(targetBefore.find(v => v.file === file).sha256, targetAfter.find(v => v.file === file).sha256);
  assert.equal(targetBefore.find(v => v.file === file).mtimeNs, targetAfter.find(v => v.file === file).mtimeNs);
}
const addedFiles = targetAfter.filter(value => !targetBefore.some(old => old.file === value.file)).map(value => value.file);
assert.deepEqual(addedFiles, ['model/project-initial-ownership.ts']);
const model = pin(directory + '/model/project-initial-ownership.ts').toString(); assert(model.includes("'creator'")); assert(model.includes("'organization'"));
const request = pin(directory + '/model/create-project-request.ts').toString(); assert(request.includes('initialOwnership?: ProjectInitialOwnership;'));
for (const [file, hash] of pins) assert.equal(sha(read(file)), hash, `Input changed during review: ${file}`);
const report = { kind: 'independent-S6-generated-output-and-actual-receipt-review', at: new Date().toISOString(),
  sourceHead: A, toolingCommit: B, toolingCommittedFiles: changes, permanentS4Ancestor: true,
  pureReconstruction: { mode: 'published --s5 --check with all source/metadata guards and current renderer; memory construction plus read-only artifact comparisons', manifestDeepEqual: true, sourceStable: true, independentlyRanFullGuardedWholeCheck: true,
    families: 331, occurrences: 339, values: 1161, original338OccurrenceFamilyAndValueHashesExact: true,
    old330FamiliesValuesAndAliasesExact: true, oldFamilyComparisonProvenance: 'pinned G09 candidate selected by the earlier reviewed S5 tooling; this comparison is not recast as an old runtime run',
    unchangedHistoricalIdentityRawSha256: sha(read(identityFile)), newFamily: 'ProjectInitialOwnership' },
  rootActualWholeCheck: { receipt: 'tmp/rust-r4ghi/root/whole-s6-check05/receipt.json', logsAndThreeCurrentOutputsExact: true, noWriteClaim: true },
  sdk: { actualRootWriteAndCheckLogsExact: true, actualRootDirectFixedJar: true, independentlyReranJar: false,
    current683RawFileHashesEqualActualAfterReceipt: true, metadata3RawHashesAndMtimsPreservedInRootRun: true, addedFiles,
    canonicalWireUnchangedByRepair: true, sourceSpecSha256: check.spec.sha256 },
  sourcePins: [...pins].map(([file, sha256]) => ({ file, sha256 })),
  rootProductsWrittenByThisReview: false, DBOrHTTPSent: false, certifiesBusinessAcceptance: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(path.join(out, 'review38-02.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ result: 'pass', report: path.join(out, 'review38-02.json'), families: 331, occurrences: 339, values: 1161, SDKFiles: 683 }) + '\n');
