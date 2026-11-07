// S5 consumes committed raw checkpoint sources under their original logical
// module identities. Live logical sources must remain byte-identical to them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const norm = (value) => value.replace(/\r\n/g, '\n');
const accesses = new WeakSet();
export const CHECKPOINT_MANIFEST_PATH = 'tools/openapi/checkpoints/r4ghi-s5/input-manifest02.json';
export const CHECKPOINT_DIRECTORY = 'tools/openapi/checkpoints/r4ghi-s5';
export const SNAPSHOT_LOGICAL_INPUTS = Object.freeze([
    '.gitattributes',
    'libs/shared/contracts/src/index.ts',
    'libs/shared/contracts/src/lib/shared-contracts.ts',
    'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts',
    'apps/poms-api/src/app/core/auth/auth-session.entity.ts',
    'apps/poms-api/src/app/core/auth/auth-session.service.ts',
]);
export const DIRECT_A_INPUTS = Object.freeze([
    'libs/shared/api-spec/openapi.json',
    'docs/design/rust-r0-api-operations.json',
]);
export const S5_PHYSICAL_SOURCE_SCOPE = Object.freeze([
    CHECKPOINT_DIRECTORY, ...DIRECT_A_INPUTS,
]);

function repoPath(value) {
    if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.includes(':')
        || value.startsWith('/') || value.split('/').some((part) => !part || part === '.' || part === '..')
        || posix.normalize(value) !== value) throw new Error('Invalid S5 repository-relative source path');
    return value;
}
function decoded(raw) {
    const text = raw.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(raw)) throw new Error('S5 source is not valid UTF-8');
    return text;
}
function rawRecord(root, logicalPath, physicalPath, expected = null) {
    const raw = readFileSync(resolve(root, repoPath(physicalPath)));
    const text = decoded(raw);
    const record = { logicalPath, physicalPath, rawUtf8Bytes: raw.length, rawBytesSha256: sha(raw), normalizedTextSha256: sha(norm(text)) };
    if (expected) {
        assert.equal(raw.length, expected.bytes, 'S5 snapshot raw byte count changed: ' + logicalPath);
        assert.equal(record.rawBytesSha256, expected.rawBytesSHA256, 'S5 snapshot raw bytes changed: ' + logicalPath);
        assert.equal(record.normalizedTextSha256, expected.normalizedTextSHA256, 'S5 snapshot normalized text changed: ' + logicalPath);
    }
    return { raw, text, record };
}

export function createSnapshotSourceAccess(root, expectedManifestRawSha256) {
    if (!/^[0-9a-f]{64}$/.test(expectedManifestRawSha256 ?? '')) throw new Error('S5 requires the independently pinned raw checkpoint manifest SHA');
    const manifestRaw = readFileSync(resolve(root, CHECKPOINT_MANIFEST_PATH));
    assert.equal(sha(manifestRaw), expectedManifestRawSha256, 'S5 checkpoint manifest raw bytes differ from reviewed pin');
    const manifest = JSON.parse(decoded(manifestRaw));
    if (!Array.isArray(manifest.inputs) || manifest.inputs.length !== 414) throw new Error('S5 checkpoint must retain all 414 explicit input records');
    const byLogical = new Map();
    const physicalNames = new Set();
    for (const row of manifest.inputs) {
        const logical = repoPath(row.file);
        const snapshot = repoPath(row.snapshot);
        if (!/^inputs(?:02)?\/.+\.bin$/.test(snapshot) || !Number.isSafeInteger(row.bytes) || row.bytes < 0
            || !/^[0-9a-f]{64}$/.test(row.rawBytesSHA256 ?? '') || !/^[0-9a-f]{64}$/.test(row.normalizedTextSHA256 ?? '')) {
            throw new Error('Invalid S5 checkpoint input record: ' + logical);
        }
        if (byLogical.has(logical.toLowerCase()) || physicalNames.has(snapshot.toLowerCase())) throw new Error('Duplicate S5 checkpoint source identity');
        byLogical.set(logical.toLowerCase(), row);
        physicalNames.add(snapshot.toLowerCase());
    }
    const mapping = SNAPSHOT_LOGICAL_INPUTS.map((logicalPath) => {
        const expected = byLogical.get(logicalPath.toLowerCase());
        if (!expected || expected.file !== logicalPath) throw new Error('Required exact S5 logical source is absent from checkpoint: ' + logicalPath);
        return { logicalPath, physicalPath: posix.join(dirname(CHECKPOINT_MANIFEST_PATH).replaceAll('\\', '/'), expected.snapshot), expected };
    });
    const direct = DIRECT_A_INPUTS.map((logicalPath) => ({ logicalPath, physicalPath: logicalPath, expected: null }));
    const sources = [...mapping, ...direct];
    const requiredCommittedPhysicalPaths = Object.freeze([CHECKPOINT_MANIFEST_PATH,
        ...manifest.inputs.map((row) => posix.join(CHECKPOINT_DIRECTORY, row.snapshot)), ...DIRECT_A_INPUTS]);
    const allowed = new Map(sources.map((item) => [item.logicalPath, item]));
    const readSource = (logicalPath) => {
        const item = allowed.get(logicalPath);
        if (!item) throw new Error('Unregistered S5 logical source read: ' + logicalPath);
        return rawRecord(root, item.logicalPath, item.physicalPath, item.expected);
    };
    const assertManifest = () => assert.equal(sha(readFileSync(resolve(root, CHECKPOINT_MANIFEST_PATH))), expectedManifestRawSha256, 'S5 checkpoint manifest changed during construction');
    const assertLiveMatchesSnapshots = () => {
        assertManifest();
        for (const item of mapping) {
            const snapshot = readSource(item.logicalPath);
            const live = readFileSync(resolve(root, item.logicalPath));
            if (!live.equals(snapshot.raw)) throw new Error('S5 live logical source differs byte-for-byte from committed snapshot: ' + item.logicalPath);
        }
    };
    const access = Object.freeze({
        readText: (logicalPath) => readSource(logicalPath).text,
        inputFingerprints: () => { assertManifest(); return sources.map((item) => readSource(item.logicalPath).record); },
        committedBlobFingerprints: () => { assertManifest(); return [
            { physicalPath: CHECKPOINT_MANIFEST_PATH, rawUtf8Bytes: manifestRaw.length, rawBytesSha256: expectedManifestRawSha256 },
            ...sources.map((item) => readSource(item.logicalPath).record),
        ]; },
        assertLiveMatchesSnapshots,
        requiredCommittedPhysicalPaths,
        provenance: Object.freeze({ kind: 'committed-raw-checkpoint-source-reader', manifestPath: CHECKPOINT_MANIFEST_PATH,
            manifestRawBytesSha256: expectedManifestRawSha256, manifestInputRecords: 414,
            actualSnapshotLogicalInputs: SNAPSHOT_LOGICAL_INPUTS, directReviewedAInputs: DIRECT_A_INPUTS,
            physicalSourceScope: S5_PHYSICAL_SOURCE_SCOPE, liveLogicalEquality: 'exact raw bytes before and after generation; no dirty-source override' }),
    });
    accesses.add(access);
    access.inputFingerprints();
    assertLiveMatchesSnapshots();
    return access;
}

export function assertSnapshotSourceAccess(access) {
    if (!access || !accesses.has(access)) throw new Error('S5 production source access must come from the sealed checkpoint reader');
}
