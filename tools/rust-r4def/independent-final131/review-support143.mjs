// Public-only archive/writeback/object-runner preparation review. No entry runs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = 'tools/rust-r4def/independent-final131';
const pkg = 'tools/rust-r4def/F/closeout130';
assert.equal(path.resolve(process.cwd()).toLowerCase(), path.resolve(root).toLowerCase());
const sha = b => createHash('sha256').update(b).digest('hex');
function bytes(f) {
  assert(!path.isAbsolute(f) && !f.includes('..') && !f.includes('/private/'), 'outside-or-private-read');
  const abs = path.join(root, f); assert(!fs.lstatSync(abs).isSymbolicLink()); return fs.readFileSync(abs);
}
const json = f => JSON.parse(bytes(f));
const pin = f => { const b = bytes(f); return { file: f, bytes: b.length, sha256: sha(b) }; };
const check = p => { const a = pin(p.file ?? p.logicalOrigin); assert.equal(a.bytes, p.bytes); assert.equal(a.sha256, p.rawBytesSha256 ?? p.sha256); return a; };
const manifestFile = pkg + '/manifest130.json';
assert.equal(pin(manifestFile).sha256, '372044e8bb8910c1716d8237ecb0525b3d8dcd0620aa37817a6d0cfdc9374746');
const manifest = json(manifestFile), packagePins = manifest.files.map(p => check({ ...p, file: pkg + '/' + p.file }));
assert.equal(packagePins.length, 41); assert.equal(manifest.status, 'PreparedNoRootMutation');
assert(Object.values(manifest.actualGateFacts).every(v => v === null));
assert(Object.values(manifest.execution).every(v => v === false));
const planFile = pkg + '/archive-plan130b.json', plan = json(planFile), policy = json(pkg + '/policy130.json');
assert.equal(pin(planFile).sha256, manifest.archivePlan.rawBytesSha256);
assert.equal(pin(pkg + '/policy130.json').sha256, plan.policyRawBytesSha256);
assert.deepEqual(plan.blockedLifecycle, []);
assert.equal(plan.entries.length, 9079);
assert.equal(plan.entries.reduce((n, p) => n + p.bytes, 0), 178735821);
assert.equal(plan.entries.filter(p => p.operation === 'move').length, 1432);
assert.equal(plan.entries.filter(p => p.operation === 'copy').length, 7647);
assert.equal(plan.exclusions.length, 1335);
const origins = new Set(), destinations = new Set();
function destination(origin) {
  if (origin === 'docs/design/rust-r4def-next30-baseline.md') return 'docs/design/archive/slices/rust-r4def-next30-baseline.md.bin';
  let target;
  for (const [a, b] of [
    ['docs/design/rust-r4def/', 'docs/design/archive/slices/rust-r4def/'],
    ['tmp/rust-r4def/root/', 'docs/design/archive/slices/rust-r4def/g2-evidence130/root/'],
    ['tmp/rust-r4def/independent/', 'docs/design/archive/slices/rust-r4def/g2-evidence130/independent/'],
  ]) if (origin.startsWith(a)) target = b + origin.slice(a.length);
  assert(target, 'unexpected-archive-origin');
  return /\.(bin|png)$/.test(target) ? target : target + '.bin';
}
for (const p of plan.entries) {
  assert.equal(p.storedAt, destination(p.logicalOrigin));
  assert(!origins.has(p.logicalOrigin.toLowerCase())); origins.add(p.logicalOrigin.toLowerCase());
  assert(!destinations.has(p.storedAt.toLowerCase())); destinations.add(p.storedAt.toLowerCase());
  assert.equal(p.operation, p.logicalOrigin.startsWith('docs/design/') ? 'move' : 'copy');
  assert(!p.logicalOrigin.toLowerCase().split('/').some(c => policy.deniedDirectoryComponents.includes(c)));
  assert.equal(p.certification, 'original-labels-retained-no-upgrade');
  assert(!fs.existsSync(path.join(root, p.storedAt)), 'archive-already-applied-or-conflict');
  check({ ...p, file: p.logicalOrigin });
}
const source126File = 'tmp/rust-r4def/root/final-source126/manifest126.json', source126 = json(source126File);
assert.equal(pin(source126File).sha256, '891a98bcaec490cf5ce9d65cf74064a449064e89593fdba2fe848a42d83ffaf0');
const movePins = plan.entries.filter(p => p.operation === 'move');
const formalPins = [...source126.formal, source126.baseline];
assert.equal(movePins.length, formalPins.length);
for (const p of formalPins) {
  const planned = movePins.find(e => e.logicalOrigin === p.file);
  assert(planned && planned.bytes === p.bytes && planned.rawBytesSha256 === p.rawBytesSha256);
}
for (const p of [...source126.product, ...source126.client, ...source126.sixS4ProtectedSources]) check(p);
const guards = json(pkg + '/source-guards130.json'); assert.equal(guards.files.length, 8);
for (const g of guards.files) { check({ ...g, file: g.logicalOrigin }); check({ ...g, file: pkg + '/' + g.snapshot }); }
for (const stage of ['ready', 'final']) {
  const rendered = json(pkg + '/' + stage + '-template/writeback130.json');
  assert(rendered.templateOnly); assert.equal(rendered.files.length, 8);
  assert.deepEqual(rendered.files.map(p => p.logicalOrigin).sort(), guards.files.map(p => p.logicalOrigin).sort());
  for (const p of rendered.files) assert.equal(pin(pkg + '/' + p.candidate).sha256, p.afterRawBytesSha256);
  const status = json(pkg + '/' + stage + '-template/docs/design/rust-r4def-delivery-status.json');
  assert.equal(status.G3Certified, null); assert.equal(status.G4Certified, null); assert.equal(status.cleanupCertified, null);
  assert.equal(status.fullR4Complete, false); assert(status.finalIndependentActualReviewPending);
  assert.equal(status.issues['57'], 'OPEN'); assert.equal(status.issues['101'], 'OPEN');
  assert.equal(status.officialRustOperations, stage === 'ready' ? 210 : 240);
}
const attrs = bytes('tools/rust-r4def/.gitattributes').toString().split(/\r?\n/).filter(l => l && !l.startsWith('#'));
assert.deepEqual(attrs, ['* -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol', '*.bin binary', '*.patch binary']);
const archiveAttrs = bytes('docs/design/archive/slices/.gitattributes').toString().split(/\r?\n/).filter(l => l && !l.startsWith('#'));
assert.deepEqual(archiveAttrs, ['rust-r4def-next30-baseline.md.bin binary']);
const docsCheckFile = 'tmp/rust-r4def/root/docs-check142/receipt.json', docsCheck = json(docsCheckFile);
assert.equal(docsCheck.exitCode, 0); assert.equal(docsCheck.sourceMutation, false);
for (const p of docsCheck.pins) check(p);
const objectsSourceFile = 'tools/rust-r4def/objects141.mjs', objectsSource = bytes(objectsSourceFile).toString();
for (const marker of [
  "assert.equal(application.mode,'apply')", 'r?.outerCommitAcknowledged', 'r.actualTwoNoOps.length,2',
  'actualTwoNoOps', "a.appConnections.length,0", "a.otherWriters.length,0", 'p.baselineGraphHash',
  "['dev','ino','nlink','bytes','sha256']", 'fs.constants.COPYFILE_EXCL', 'actual-exclusive-copies141.json',
  'sameInventory(liveFiles())', 'assertObjectUnlinkAdmission70', 'fs.unlinkSync(intent.source)', 'assertOwnedObjectsCleared70',
]) assert(objectsSource.includes(marker), 'missing-object-guard:' + marker);
assert(objectsSource.indexOf("const copies=[],unlinkReceipts=[];for(const intent of intents)") < objectsSource.indexOf('for(let i=0;i<intents.length;i++)'));
assert(objectsSource.indexOf('actual-exclusive-copies141.json') < objectsSource.indexOf('fs.unlinkSync(intent.source)'));
assert(!/rmSync|rmdirSync|unlinkSync\([^i]|TRUNCATE|DISABLE TRIGGER|DROP DATABASE/.test(objectsSource));
const inputs = [manifestFile, planFile, pkg + '/policy130.json', pkg + '/source-guards130.json', pkg + '/Common130.ps1', pkg + '/Invoke-Archive130.ps1', pkg + '/Invoke-Writeback130.ps1', pkg + '/prepare130.py', pkg + '/root-facts130.template.json', objectsSourceFile, 'tools/rust-r4def/.gitattributes', 'docs/design/archive/slices/.gitattributes', docsCheckFile, ...docsCheck.pins.map(p => p.file), source126File, ...source126.sixS4ProtectedSources.map(p => p.file)];
const inputPins = [...new Set(inputs)].map(f => {
  const p = pin(f), target = path.join(root, out, 'support143-inputs', f + '.bin');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes(f), { flag: 'wx' });
  return { ...p, snapshot: path.relative(root, target).replaceAll('\\', '/') };
});
const report = {
  kind: 'independent-R4DEF-final131-support130-attributes142-objects141-preparation-review', reviewedAtUtc: new Date().toISOString(),
  status: 'Prepared support scoped and pinned; execution remains blocked by unresolved ownership and final terminal evidence',
  package130: { manifest: pin(manifestFile), files: 41, allBytesMatch: true, sourceGuards: 8, allCurrentAndSnapshotMatch: true, archivePlan: pin(planFile), entries: 9079, bytes: 178735821, moves: 1432, copies: 7647, exclusions: 1335, allCurrentOriginalPinsMatch: true, all126FormalAndBaselineMovesCovered: true, currentDestinationConflicts: 0, templatesAreConditionalNotApplied: true, originalFailed130Retained: true, lateEvidenceRequiresSeparateImmutableAddendum: true },
  stageRules: { Ready: 'Requires actual terminal cleanup, independentG3, fixed commit review; formal210/batch0 and four issuesOpen', Final: 'Requires actual main/archive identity, independent preclose and six-issue readback; formal240/67of92, fourClosed and101/57Open; actualG4stillpending', Seal: 'Requires independently observed actualG4Pass and existing finalMetadataCommit', realProofChecksMustBeReviewed: 'Helpers validate exact JSON pointer/value supplied by Root; the final Root facts must select substantive Pass/terminal assertions, not arbitrary matching false/null fields' },
  attributes: { toolsScopedOnly: true, baselineArchiveScopedOnly: true, rootProtectedAttributesUnchanged: true, allSixProtectedCurrentHashesMatch126AndPriorLiteralS4: true, literalGitReadNotRepeated: true, archiveMapAndJournalCommittedBytesStillRequirePostCommitVerification: true },
  docsCheck142: { receipt: pin(docsCheckFile), originalDenoFormatCheckExit: 0, currentCheckOnly: true, finalWritebackRequiresOwnChecks: true },
  objects141: { source: pin(objectsSourceFile), RootEntrypointNotRunByReviewer: true, allBackupsBeforeFirstUnlink: true, exactInventoryStatSHAAndBackupSHAAdmission: true, currentDBGraphCatalogGuardsAndNoWritersRequired: true, actualApplyCOMMITAndDoubleNoopsRequired: true, ledgerCoversAllBoundParentsRequired: true, conditionalSourceReviewPass: true, applicationAndPlanArgumentsMustBindTheSeparatelyReviewedExactFinalBundle: true },
  inputPins, packageFilePins: packagePins,
  pending: ['125a actual full provenance ledger/plan;14039unclaimedstillblocksapply', 'Actual DB commit+doublefresh noops+objects+ownedPG stopped', 'Final independent G3 and fixed implementation review', 'Actual archive/writeback/main/preclose/online state and actualG4'],
  newFindingsP0P1P2: [], supportPreparationReviewPass: true, G3Pass: false, G4Pass: false, issueClosure: false,
  reviewer: { privateRead: false, DBHTTPGitGHOrForeignEntryExecuted: false, productOrOldEvidenceModified: false, writesOnly: out + '/**' },
};
fs.writeFileSync(path.join(root, out, 'support143-review131.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ report: pin(out + '/support143-review131.json'), archiveOriginsVerified: 9079, archiveBytes: 178735821, packageFiles: 41, sixGuards: 6, supportPreparationReviewPass: true, G3Pass: false }) + '\n');
