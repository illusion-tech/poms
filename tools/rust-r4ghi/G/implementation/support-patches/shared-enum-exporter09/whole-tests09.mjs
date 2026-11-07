import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createSnapshotSourceAccess, assertSnapshotSourceAccess, CHECKPOINT_MANIFEST_PATH } from './source-access09.candidate.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildS5Manifest } from './full-build09.candidate.mjs';
import { assertModuleText, CLOSED_MODULES } from './registered-module-graph09.candidate.mjs';
import { assertPinnedReview, assertGuardReport, applyArtifactMode, assertArtifactSet, assertReviewedBlobBatch, assertCommittedSnapshotPaths } from './s5-entry09.candidate.mjs';

const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(out, path), 'utf8');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
const registry = JSON.parse(read('s5-registry09.candidate.json'));
const identity = JSON.parse(read('s3-nominal-identity09.json'));
const sourceAccess=createSnapshotSourceAccess(root,registry.sourceAccess.manifestRawBytesSha256);
const legacy = await import(pathToFileURL(resolve(root, 'tools/rust-r1b/export-shared.mjs')).href);
const startedAt = new Date().toISOString();
const inputsBefore = registry.modules.closedModules.map(({ path }) => ({ path, rawSha256: hash(readFileSync(resolve(root, path))) }));
const results = [];
function test(name, body) {
    try { body(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: String(error) }); }
}
function rejection(name, body, message) { test(name, () => assert.throws(body, message)); }

test('candidate builds all semantic occurrences and retains historical names', () => {
    const manifest = buildS5Manifest(root, registry, identity, { candidate: true, sourceAccess });
    assert.equal(manifest.enumOccurrences.length, 338);
    assert.equal(manifest.enums.length, 330);
    assert.equal(manifest.r0Witness.declaredS5Registrations.enumOccurrences.length, 224);
    assert.equal(manifest.r0Witness.declaredS5Registrations.constants.length, 455);
    assert.equal(manifest.r0Witness.declaredS5Registrations.constants.filter((r) => r.disposition === 'explicit-value-replacement').length, 9);
    const names = new Set(manifest.enums.flatMap((f) => [f.name, ...f.aliases]));
    for (const old of identity.families) for (const name of [old.name, ...old.aliases]) assert(names.has(name));
});
rejection('production builder refuses candidate registry', () => buildS5Manifest(root, registry, identity), /Root-reviewed registry/);
rejection('unfrozen review does not authorize metadata', () => assertPinnedReview(JSON.stringify(registry), JSON.stringify(identity)), /not frozen/);
const reviewedRegistry = { ...registry, reviewStatus: 'Root-reviewed-S5-registration', sourceHead: '1'.repeat(40) };
const registryText = JSON.stringify(reviewedRegistry);
const identityText = JSON.stringify(identity);
const reviewFixture = { sourceHead: reviewedRegistry.sourceHead, registryNormalizedTextSha256: hash(registryText), identityNormalizedTextSha256: hash(identityText), snapshotManifestRawSha256: registry.sourceAccess.manifestRawBytesSha256 };
test('pure review matcher accepts only exact reviewed metadata', () => assert.equal(assertPinnedReview(registryText, identityText, reviewFixture).registry.sourceHead, reviewedRegistry.sourceHead));
rejection('changed metadata cannot self-authorize by reviewStatus', () => assertPinnedReview(registryText + ' ', identityText, reviewFixture), /registry bytes/);
rejection('changed identity bytes cannot keep a reviewed pin', () => assertPinnedReview(registryText, identityText + ' ', reviewFixture), /identity bytes/);
rejection('registry source head must match independently pinned review', () => assertPinnedReview(registryText, identityText, { ...reviewFixture, sourceHead: '2'.repeat(40) }), /source reference mismatch/);

rejection('missing current enum registration is rejected', () => { const r = clone(registry); r.registrations.allCurrentEnumSources.pop(); buildS5Manifest(root, r, identity, { candidate: true, sourceAccess }); }, /disposition change/);
rejection('unreviewed historical migration is rejected', () => { const r = clone(registry); r.registrations.enumOccurrences[0].propertyPath = ['other']; buildS5Manifest(root, r, identity, { candidate: true, sourceAccess }); }, /disposition change/);
rejection('unreviewed historical value replacement is rejected', () => { const r = clone(registry); r.registrations.constants.find((row) => row.disposition === 'explicit-value-replacement').disposition = 'retained-value'; buildS5Manifest(root, r, identity, { candidate: true, sourceAccess }); }, /disposition change/);
rejection('coverage cannot be silently lowered', () => { const r = clone(registry); r.expectedCoverage.zEnumOccurrences--; buildS5Manifest(root, r, identity, { candidate: true, sourceAccess }); }, /coverage change/);
rejection('historical consumer type alias cannot be replaced', () => { const i = clone(identity); i.families[0].name += 'Changed'; buildS5Manifest(root, registry, i, { candidate: true, sourceAccess }); }, /historical nominal identities/);

const shared = CLOSED_MODULES[1];
const pin = registry.modules.closedModules.find((m) => m.path === shared);
const sharedText = readFileSync(resolve(root, shared), 'utf8');
rejection('unknown module import remains closed', () => assertModuleText(root, shared, sharedText + '\nimport { opaque } from "./unregistered";\n', pin), /Unregistered module edge/);
rejection('opaque top-level construct is rejected before repinning', () => assertModuleText(root, shared, sharedText + '\nclass OpaqueConstruction {}\n', pin), /unregistered top-level construct/);
rejection('computed Zod enum construction cannot evade semantic inventory', () => assertModuleText(root, shared, sharedText + '\nconst HiddenSchema = z["enum"](["x"]);\n', pin), /unregistered computed Zod member/);
rejection('unknown Zod factory remains rejected even before repinning', () => assertModuleText(root, shared, sharedText + '\nconst UnknownSchema = z.nativeEnum({ X: "x" });\n', pin), /unregistered Zod root factory/);
rejection('enum cannot hide in a helper body', () => assertModuleText(root, shared, sharedText + '\nfunction hidden() { return z\n.enum(["x"]); }\n', pin), /enum hidden in a function/);
rejection('new helper declaration needs independent registration', () => assertModuleText(root, shared, sharedText + '\nfunction unknownHelper(x: unknown) { return x; }\n', pin), /unreviewed module bytes/);
test('equivalent CRLF normalization retains exact reviewed source', () => assertModuleText(root, shared, sharedText.replace(/\r?\n/g, '\r\n'), pin));

test('empty working/staged/untracked source guard reports pass', () => assertGuardReport({ changed: '', staged: '\n', untracked: ' ' }, reviewFixture.sourceHead));
for (const key of ['changed', 'staged', 'untracked']) rejection('source guard rejects ' + key + ' input', () => assertGuardReport({ changed: '', staged: '', untracked: '', [key]: shared }, reviewFixture.sourceHead), /differ from reviewed reference/);

const outputs = legacy.artifacts(buildS5Manifest(root, registry, identity, { candidate: true, sourceAccess }));
const destination = resolve(out, 'artifact-mode-fixture');
test('pure artifact write/check roundtrip produces every expected file', () => { applyArtifactMode('--write', outputs, destination); applyArtifactMode('--check', outputs, destination); });
rejection('unexpected artifact target is rejected', () => assertArtifactSet(new Map([...outputs, ['other.rs', 'x']])), /renderer paths changed/);
test('stale artifact is rejected without automatic repair', () => {
    const path = resolve(destination, 'apps/poms-api-rust/src/shared/generated.rs');
    const original = readFileSync(path, 'utf8');
    writeFileSync(path, original + '\n// modified\n');
    assert.throws(() => applyArtifactMode('--check', outputs, destination), /Stale or modified/);
    assert.equal(readFileSync(path, 'utf8'), original + '\n// modified\n');
    writeFileSync(path, original);
    applyArtifactMode('--check', outputs, destination);
});

rejection('forged source reader cannot reach whole builder', () => buildS5Manifest(root, registry, identity, { candidate: true, sourceAccess: { ...sourceAccess } }), /sealed checkpoint reader/);
rejection('unregistered logical source cannot be consumed', () => sourceAccess.readText('libs/shared/contracts/src/lib/unknown.ts'), /Unregistered S5 logical source read/);
rejection('wrong checkpoint manifest hash is rejected', () => createSnapshotSourceAccess(root, '0'.repeat(64)), /checkpoint manifest raw bytes/);
test('all checkpoint physical files must exist in committed A tree', () => assertCommittedSnapshotPaths(sourceAccess.requiredCommittedPhysicalPaths, sourceAccess.requiredCommittedPhysicalPaths));
rejection('ignored or absent committed physical input cannot be consumed', () => assertCommittedSnapshotPaths(sourceAccess.requiredCommittedPhysicalPaths.slice(1), sourceAccess.requiredCommittedPhysicalPaths), /absent from reviewed A tree/);
const expectedBlobs=sourceAccess.committedBlobFingerprints();
const blobBatch=Buffer.concat(expectedBlobs.flatMap((record)=>[
    Buffer.from('3'.repeat(40)+' blob '+record.rawUtf8Bytes+'\n'),readFileSync(resolve(root,record.physicalPath)),Buffer.from('\n'),
]));
test('binary committed-source parser checks all consumed raw blobs',()=>assertReviewedBlobBatch(blobBatch,expectedBlobs));
test('Git normalization cannot substitute different committed raw bytes',()=>{
    const altered=Buffer.from(blobBatch);const at=altered.indexOf(10)+1;altered[at]=altered[at]===88?89:88;
    assert.throws(()=>assertReviewedBlobBatch(altered,expectedBlobs),/committed A blob raw bytes differ/);
});
rejection('missing committed blob is rejected',()=>assertReviewedBlobBatch(Buffer.from('1'.repeat(40)+':missing.bin missing\n'),expectedBlobs),/missing or is not a blob/);
rejection('extra committed-source response bytes are rejected',()=>assertReviewedBlobBatch(Buffer.concat([blobBatch,Buffer.from('x')]),expectedBlobs),/Unexpected S5 committed source/);
const fixture=resolve(out,'snapshot-source-fixture');
const copyFile=(path)=>{const destination=resolve(fixture,path);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,readFileSync(resolve(root,path)));};
copyFile(CHECKPOINT_MANIFEST_PATH);
for(const item of sourceAccess.inputFingerprints()){copyFile(item.physicalPath);if(item.physicalPath!==item.logicalPath)copyFile(item.logicalPath);}
const fixtureAccess=()=>createSnapshotSourceAccess(fixture,registry.sourceAccess.manifestRawBytesSha256);
test('actual checkpoint source reads identical raw snapshots in isolated fixture',()=>{const a=fixtureAccess();assertSnapshotSourceAccess(a);assert.deepEqual(a.inputFingerprints(),sourceAccess.inputFingerprints());});
test('normalized-equivalent dirty live source is rejected by raw equality',()=>{
 const path=resolve(fixture,'libs/shared/contracts/src/index.ts');const original=readFileSync(path);const changed=original.toString('utf8').replace(/\r?\n/,'\r\n');
 assert.notDeepEqual(Buffer.from(changed),original);assert.equal(changed.replace(/\r\n/g,'\n'),original.toString('utf8').replace(/\r\n/g,'\n'));
 writeFileSync(path,changed);assert.throws(fixtureAccess,/byte-for-byte/);writeFileSync(path,original);fixtureAccess();
});
test('normalized-equivalent dirty physical snapshot is rejected by raw hash',()=>{
 const item=sourceAccess.inputFingerprints().find((row)=>row.logicalPath.endsWith('/index.ts'));const path=resolve(fixture,item.physicalPath);const original=readFileSync(path);
 writeFileSync(path,original.toString('utf8').replace(/\r?\n/,'\r\n'));assert.throws(fixtureAccess,/raw byte count changed|raw bytes changed/);writeFileSync(path,original);fixtureAccess();
});
test('unknown checkpoint traversal is rejected even in a newly hashed proposal',()=>{
 const path=resolve(fixture,CHECKPOINT_MANIFEST_PATH);const original=readFileSync(path);const m=JSON.parse(original);m.inputs[0].snapshot='../escape.bin';const changed=JSON.stringify(m);writeFileSync(path,changed);
 assert.throws(()=>createSnapshotSourceAccess(fixture,hash(changed)),/repository-relative source path/);writeFileSync(path,original);
});
test('duplicate checkpoint logical identity is rejected',()=>{
 const path=resolve(fixture,CHECKPOINT_MANIFEST_PATH);const original=readFileSync(path);const m=JSON.parse(original);m.inputs[1].file=m.inputs[0].file;const changed=JSON.stringify(m);writeFileSync(path,changed);
 assert.throws(()=>createSnapshotSourceAccess(fixture,hash(changed)),/Duplicate S5 checkpoint source identity/);writeFileSync(path,original);
});
test('immutable R0 hash remains enforced through snapshot reader',()=>{
 const path=resolve(fixture,'docs/design/rust-r0-api-operations.json');const original=readFileSync(path);writeFileSync(path,original.toString('utf8')+' ');
 assert.throws(()=>buildS5Manifest(root,registry,identity,{candidate:true,sourceAccess:fixtureAccess()}),/Historical R0 must remain immutable/);writeFileSync(path,original);
});
test('public OpenAPI drift remains rejected through physical A source',()=>{
 const path=resolve(fixture,'libs/shared/api-spec/openapi.json');const original=readFileSync(path);const spec=JSON.parse(original);spec.components.schemas.ProjectStage.enum.pop();writeFileSync(path,JSON.stringify(spec));
 assert.throws(()=>buildS5Manifest(root,registry,identity,{candidate:true,sourceAccess:fixtureAccess()}),/public enum\/OpenAPI drift/);writeFileSync(path,original);
});

const inputsAfter = inputsBefore.map(({ path }) => ({ path, rawSha256: hash(readFileSync(resolve(root, path))) }));
test('actual Root source bytes remained stable during pure probes', () => assert.deepEqual(inputsAfter, inputsBefore));
const report = { kind: 'S5-pure-proposal-probes09', startedAt, finishedAt: new Date().toISOString(), results,
    passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length, inputsBefore, inputsAfter,
    limitations: ['No Git source guard command executed by this author', 'No Root --s5 --write or --check executed', 'The non-null source head in review matcher is a pure fixture, never an authorized Git reference', 'Root must freeze final canonical130 physical-source registry, A reference and independent B metadata after review'] };
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'pure-probes09.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, failures: results.filter((r) => !r.passed), sourceStable: JSON.stringify(inputsAfter) === JSON.stringify(inputsBefore) }, null, 2));
if (report.failed) process.exitCode = 1;
