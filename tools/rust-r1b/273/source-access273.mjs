// Explicit273 source capability. No top-level I/O and no S5 capability mutation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, posix, resolve, sep } from 'node:path';

const accesses = new WeakMap();
export function immutableCopy273(value) {
    const copied=structuredClone(value),seen=new WeakSet();
    const freeze=item=>{if(item&&typeof item==='object'&&!seen.has(item)){seen.add(item);for(const child of Object.values(item))freeze(child);Object.freeze(item);}return item;};
    return freeze(copied);
}
function canonicalRoot273(root) {
    assert(typeof root==='string','273 requires an explicit target root');
    const absolute=resolve(root),info=lstatSync(absolute,{bigint:true});assert(info.isDirectory()&&!info.isSymbolicLink(),'273 root must be a real owned directory');
    const real=realpathSync(absolute),same=process.platform==='win32'?real.toLowerCase()===absolute.toLowerCase():real===absolute;
    assert(same,'273 root must be canonical, not a filesystem alias');
    return Object.freeze({path:real,key:process.platform==='win32'?real.toLowerCase():real,device:info.dev.toString(),inode:info.ino.toString()});
}
function assertRootIdentity273(expected,actual) {assert(actual.key===expected.key&&actual.device===expected.device&&actual.inode===expected.inode,'273 source capability belongs to another actual root');}
const sha = raw => createHash('sha256').update(raw).digest('hex');
const norm = text => text.replace(/\r\n/g, '\n');
export const CHECKPOINT_DIRECTORY273 = 'tools/openapi/checkpoints/r4ghi-273-02';
export const CHECKPOINT_MANIFEST273 = CHECKPOINT_DIRECTORY273 + '/input-manifest01.json';
export const LOGICAL_SNAPSHOT_INPUTS273 = Object.freeze([
    '.gitattributes', 'libs/shared/contracts/src/index.ts',
    'libs/shared/contracts/src/lib/shared-contracts.ts',
    'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts',
    'apps/poms-api/src/app/core/auth/auth-session.entity.ts',
    'apps/poms-api/src/app/core/auth/auth-session.service.ts'
]);
export const DIRECT_INPUTS273 = Object.freeze(['libs/shared/api-spec/openapi.json', 'docs/design/rust-r0-api-operations.json']);
export function repoPath273(file) {
    assert(typeof file === 'string' && file.length > 0 && !/[\x00-\x1f]/.test(file) && !file.includes('\\') && !file.includes(':') && !file.startsWith('/') && posix.normalize(file) === file && file.split('/').every(part => part && part !== '.' && part !== '..'), 'Invalid273 repository-relative path');
    return file;
}
export function strictBytes273(root, relative) {
    const directory = resolve(root), file = resolve(directory, repoPath273(relative));
    assert(file.startsWith(directory + sep));
    let cursor = directory;
    for (const part of relative.split('/')) {
        cursor = resolve(cursor, part);
        const info = lstatSync(cursor); assert(!info.isSymbolicLink(), '273 source must not follow aliases');
        if (cursor !== file) assert(info.isDirectory());
    }
    const info = lstatSync(file); assert(info.isFile() && info.nlink === 1, '273 source leaf must be one regular file');
    assert.equal(realpathSync(file).toLowerCase(), file.toLowerCase(), '273 source realpath differs');
    return readFileSync(file);
}
const text = raw => { const value = raw.toString('utf8'); assert(Buffer.from(value, 'utf8').equals(raw), '273 source must be lossless UTF8'); return value; };
export function assertSemanticInputIdentity273(manifest) {
    const proof=manifest.semanticObservation;
    assert(proof?.kind==='exact-raw-semantic-observation273-v2','273 checkpoint lacks exact semantic observation identity');
    assert.deepEqual(proof.typescript,manifest.typescript,'Compiler proof must be the actual checkpoint proof');
    assert.equal(proof.typescript?.version,'6.0.3');assert.equal(proof.typescript.currentApiTypeErrors,0);
    assert(Array.isArray(proof.typescript.sourceFiles)&&proof.typescript.sourceFiles.length>0);
    assert(Array.isArray(proof.workspaceFiles)&&Array.isArray(proof.externalReads)&&Array.isArray(proof.semanticJSON)&&Array.isArray(proof.dependencyProbes));
    const inputs=new Map(manifest.inputs.map(row=>[row.file,row])),observed=new Map();
    for(const row of proof.workspaceFiles){assert(!observed.has(row.file),'Duplicate semantic workspace observation');observed.set(row.file,row);const input=inputs.get(row.file);assert(input&&input.bytes===row.bytes&&input.rawBytesSHA256===row.rawBytesSHA256,'Semantic read is not the frozen raw input');}
    assert.deepEqual([...observed.keys()].sort(),[...inputs.keys()].sort(),'Every published raw input must belong to the same observation');
    for(const file of ['tools/openapi/shared-api-client-baseline.json','tools/rust-r4ghi/contracts273/registration.json','tools/rust-r4ghi/contracts273/canonical.json','libs/shared/api-spec/openapi.json'])assert(proof.semanticJSON.includes(file)&&observed.has(file),'Missing early semantic JSON observation');
    const external=new Map(proof.externalReads.map(row=>[row.file,row]));
    for(const source of proof.typescript.sourceFiles){const row=source.kind==='workspace'?observed.get(source.file):external.get(source.file);assert(row&&row.bytes===source.bytes&&row.rawBytesSHA256===source.rawBytesSHA256&&source.textSHA256===source.rawBytesSHA256,'Compiler SourceFile text/raw dependency identity differs');}
    for(const source of proof.typescript.rootNames)assert(observed.has(source),'Compiler root outside full observed source closure');
}
export function createSourceAccess273(root, expected) {
    assert(expected && expected.file === CHECKPOINT_MANIFEST273 && /^[0-9a-f]{64}$/.test(expected.rawBytesSHA256 ?? '') && Number.isSafeInteger(expected.inputRecords) && expected.inputRecords > 0, '273 checkpoint needs an explicit reviewed raw pin and actual count');
    // Copy only the reviewed value data before retaining anything from caller.
    expected=immutableCopy273({file:expected.file,rawBytesSHA256:expected.rawBytesSHA256,inputRecords:expected.inputRecords,logicalSourcePaths:expected.logicalSourcePaths});
    const rootIdentity=canonicalRoot273(root);root=rootIdentity.path;
    const assertRootStable=()=>assertRootIdentity273(rootIdentity,canonicalRoot273(root));
    const manifestRaw = strictBytes273(root, CHECKPOINT_MANIFEST273); assert.equal(sha(manifestRaw), expected.rawBytesSHA256);
    const manifest = JSON.parse(text(manifestRaw));
    assert.equal(manifest.kind, 'G2-complete-273-input-not-product-G3');
    assertSemanticInputIdentity273(manifest);
    assert.equal(manifest.inputs.length, expected.inputRecords);
    const byLogical = new Map(), physical = new Set();
    for (const row of manifest.inputs) {
        const logical = repoPath273(row.file), snapshot = repoPath273(row.snapshot);
        assert(/^inputs\/[0-9]{4,}\.bin$/.test(snapshot) && Number.isSafeInteger(row.bytes) && row.bytes >= 0 && /^[0-9a-f]{64}$/.test(row.rawBytesSHA256 ?? '') && /^[0-9a-f]{64}$/.test(row.normalizedTextSHA256 ?? ''), 'Invalid273 snapshot record');
        assert(!byLogical.has(logical.toLowerCase()) && !physical.has(snapshot.toLowerCase()), '273 duplicate/case-colliding input');
        byLogical.set(logical.toLowerCase(), immutableCopy273(row)); physical.add(snapshot.toLowerCase());
    }
    const logicalNames = Object.freeze([...byLogical.values()].map(row => row.file).sort());
    assert.deepEqual(logicalNames, expected.logicalSourcePaths, '273 complete source closure differs from independent review');
    for (const file of [...LOGICAL_SNAPSHOT_INPUTS273, ...DIRECT_INPUTS273, 'tools/rust-r4ghi/contracts273/canonical.json', 'tools/rust-r4ghi/contracts273/registration.json']) assert(byLogical.has(file.toLowerCase()), 'Missing required273 source: ' + file);
    function snapshotRow(logical) {
        assertRootStable();
        const row = byLogical.get(logical.toLowerCase()); assert(row && row.file === logical);
        const physicalPath = posix.join(CHECKPOINT_DIRECTORY273, row.snapshot), raw = strictBytes273(root, physicalPath);
        assert.equal(raw.length, row.bytes); assert.equal(sha(raw), row.rawBytesSHA256); assert.equal(sha(norm(text(raw))), row.normalizedTextSHA256);
        return { raw, text: text(raw), record: { logicalPath: logical, physicalPath, rawUtf8Bytes: raw.length, rawBytesSha256: sha(raw), normalizedTextSha256: row.normalizedTextSHA256 } };
    }
    const consumed = Object.freeze([...LOGICAL_SNAPSHOT_INPUTS273, ...DIRECT_INPUTS273]);
    const readSource = logical => { assert(consumed.includes(logical), 'Unregistered273 logical module read'); return snapshotRow(logical); };
    const assertManifest = () => {assertRootStable();assert.equal(sha(strictBytes273(root, CHECKPOINT_MANIFEST273)), expected.rawBytesSHA256, '273 checkpoint moved');};
    const assertLiveMatchesSnapshots = () => {
        assertManifest();
        for (const logical of logicalNames) assert(strictBytes273(root, logical).equals(snapshotRow(logical).raw), '273 live input differs from frozen raw source: ' + logical);
    };
    const requiredCommittedPhysicalPaths = Object.freeze([CHECKPOINT_MANIFEST273, ...logicalNames.map(logical => posix.join(CHECKPOINT_DIRECTORY273, byLogical.get(logical.toLowerCase()).snapshot)), ...logicalNames]);
    const access = Object.freeze({
        readText: logical => readSource(logical).text,
        inputFingerprints: () => { assertManifest(); return immutableCopy273(consumed.map(logical => readSource(logical).record)); },
        committedBlobFingerprints: () => {
            assertManifest();
            return immutableCopy273([{ physicalPath: CHECKPOINT_MANIFEST273, rawUtf8Bytes: manifestRaw.length, rawBytesSha256: sha(manifestRaw) }, ...logicalNames.flatMap(logical => {
                const snap = snapshotRow(logical); return [{ physicalPath: snap.record.physicalPath, rawUtf8Bytes: snap.raw.length, rawBytesSha256: sha(snap.raw) }, { physicalPath: logical, rawUtf8Bytes: snap.raw.length, rawBytesSha256: sha(snap.raw) }];
            })]);
        },
        requiredCommittedPhysicalPaths:immutableCopy273(requiredCommittedPhysicalPaths), sourceScope: immutableCopy273([CHECKPOINT_DIRECTORY273, ...logicalNames]), assertManifest, assertLiveMatchesSnapshots,
        provenance: immutableCopy273({ kind: '273-new-reviewed-raw-checkpoint-source-reader', manifestPath: CHECKPOINT_MANIFEST273, manifestRawBytesSha256: expected.rawBytesSHA256, manifestInputRecords: expected.inputRecords, actualSnapshotLogicalInputs: [...LOGICAL_SNAPSHOT_INPUTS273], directReviewedAInputs: [...DIRECT_INPUTS273], completeLogicalSourcePaths: [...logicalNames], liveLogicalEquality: 'all explicit logical inputs byte-identical to raw snapshots before and after' })
    });
    assertLiveMatchesSnapshots(); accesses.set(access,Object.freeze({rootIdentity,expected})); return access;
}
export function assertSnapshotSourceAccess(access,root) { const identity=accesses.get(access);assert(identity,'273 requires its own verified source capability');assertRootIdentity273(identity.rootIdentity,canonicalRoot273(root)); }
