import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildS5Manifest, IDENTITY_PATH, REGISTRY_PATH } from './full-build.mjs';
import { createSnapshotSourceAccess, S5_PHYSICAL_SOURCE_SCOPE } from './source-access.mjs';
import { S5_REVIEW } from './review.mjs';

const norm = (text) => text.replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const read = (root, path) => norm(readFileSync(resolve(root, path), 'utf8'));
export const S5_GENERATOR_PATHS = Object.freeze([
    'tools/rust-r1b/export-shared.mjs',
    'tools/rust-r1b/s5/export-s5.mjs',
    'tools/rust-r1b/s5/full-build.mjs',
    'tools/rust-r1b/s5/registered-module-graph.mjs',
    'tools/rust-r1b/s5/static-data-oracle.mjs',
    'tools/rust-r1b/s5/source-access.mjs',
    'tools/rust-r1b/s5/review.mjs',
]);
export const S5_ARTIFACT_PATHS = Object.freeze([
    'tools/rust-r1b/shared-manifest.json',
    'apps/poms-api-rust/src/shared/generated.rs',
    'apps/poms-api-rust/tests/shared_generated.rs',
]);

export function assertPinnedReview(registryText, identityText, review = S5_REVIEW) {
    if (!/^[0-9a-f]{40}$/.test(review.sourceHead ?? '')
        || !/^[0-9a-f]{64}$/.test(review.registryNormalizedTextSha256 ?? '')
        || !/^[0-9a-f]{64}$/.test(review.identityNormalizedTextSha256 ?? '')
        || !/^[0-9a-f]{64}$/.test(review.snapshotManifestRawSha256 ?? '')) {
        throw new Error('S5 review is not frozen: Root must review the registry and deliberately set a fixed source head plus exact metadata hashes');
    }
    assert.equal(sha(norm(registryText)), review.registryNormalizedTextSha256, 'S5 registry bytes differ from Root-reviewed generator pin');
    assert.equal(sha(norm(identityText)), review.identityNormalizedTextSha256, 'S5 historical identity bytes differ from Root-reviewed generator pin');
    const registry = JSON.parse(registryText);
    const identity = JSON.parse(identityText);
    assert.equal(registry.reviewStatus, 'Root-reviewed-S5-registration', 'S5 registration has not been reviewed');
    assert.equal(registry.sourceHead, review.sourceHead, 'S5 registry/source reference mismatch');
    assert.equal(identity.role, 'Historical nominal/source identities only; no current wire-value authority', 'S5 nominal identity role changed');
    return { registry, identity };
}

export function assertGuardReport({ changed, staged, untracked }, reference) {
    if ([changed, staged, untracked].some((value) => typeof value !== 'string')) throw new Error('Invalid S5 source guard result');
    if (changed.trim() || staged.trim() || untracked.trim()) {
        throw new Error('S5 source inputs differ from reviewed reference ' + reference + '; review and advance the fixed reference deliberately.\n'
            + [changed, staged, untracked].filter((value) => value.trim()).join('\n'));
    }
}

export function assertCommittedSnapshotPaths(actualPaths, requiredPaths) {
    const actual = new Set(actualPaths);
    for (const path of requiredPaths) if (!actual.has(path)) throw new Error('S5 physical source is absent from reviewed A tree: ' + path);
}

export function assertReviewedBlobBatch(batch, expected) {
    if (!Buffer.isBuffer(batch)) throw new Error('Invalid binary Git source response');
    let cursor = 0;
    for (const record of expected) {
        const end = batch.indexOf(10, cursor);
        if (end < 0) throw new Error('Incomplete S5 committed source header');
        const header = batch.subarray(cursor, end).toString('ascii');
        const match = /^[0-9a-f]{40,64} blob ([0-9]+)$/.exec(header);
        if (!match) throw new Error('S5 committed source is missing or is not a blob: ' + record.physicalPath);
        const size = Number(match[1]);
        if (!Number.isSafeInteger(size) || size !== record.rawUtf8Bytes || end + 1 + size >= batch.length) throw new Error('S5 committed source byte length differs: ' + record.physicalPath);
        const raw = batch.subarray(end + 1, end + 1 + size);
        assert.equal(sha(raw), record.rawBytesSha256, 'S5 committed A blob raw bytes differ from consumed source: ' + record.physicalPath);
        cursor = end + 1 + size;
        if (batch[cursor] !== 10) throw new Error('Malformed S5 committed source response separator');
        cursor++;
    }
    if (cursor !== batch.length) throw new Error('Unexpected S5 committed source response data');
}

export function assertS5SourceGuard(root, reference, sourceAccess) {
    if (!/^[0-9a-f]{40}$/.test(reference ?? '')) throw new Error('Missing fixed S5 source reference');
    const options = { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 };
    const committed = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', '--full-tree', reference, '--', ...S5_PHYSICAL_SOURCE_SCOPE], options);
    assertCommittedSnapshotPaths(committed.split('\0').filter(Boolean), sourceAccess.requiredCommittedPhysicalPaths);
    const expectedBlobs = sourceAccess.committedBlobFingerprints();
    const batch = execFileSync('git', ['cat-file', '--batch'], { ...options, encoding: null,
        input: expectedBlobs.map((record) => reference + ':' + record.physicalPath + '\n').join('') });
    assertReviewedBlobBatch(batch, expectedBlobs);
    const changed = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', reference, '--', ...S5_PHYSICAL_SOURCE_SCOPE], options);
    const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--no-ext-diff', reference, '--', ...S5_PHYSICAL_SOURCE_SCOPE], options);
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...S5_PHYSICAL_SOURCE_SCOPE], options);
    assertGuardReport({ changed, staged, untracked }, reference);
}

export function assertArtifactSet(outputs) {
    if (!(outputs instanceof Map)) throw new Error('Invalid S5 renderer artifact set');
    assert.deepEqual([...outputs.keys()], S5_ARTIFACT_PATHS, 'S5 renderer paths changed');
    for (const [path, text] of outputs) if (typeof text !== 'string') throw new Error('Invalid S5 artifact text ' + path);
}

export function applyArtifactMode(mode, outputs, root) {
    if (!['--write', '--check'].includes(mode)) throw new Error('Invalid S5 artifact mode');
    assertArtifactSet(outputs);
    if (mode === '--check') {
        for (const [path, expected] of outputs) {
            let actual;
            try { actual = read(root, path); } catch { throw new Error('Missing S5 generated artifact: ' + path + '; run --s5 --write explicitly'); }
            if (actual !== expected) throw new Error('Stale or modified S5 generated artifact: ' + path + '; edit TS authority and regenerate explicitly');
        }
    } else {
        for (const [path, text] of outputs) {
            mkdirSync(dirname(resolve(root, path)), { recursive: true });
            writeFileSync(resolve(root, path), text, 'utf8');
        }
    }
}

function generatorFingerprints(root) {
    return S5_GENERATOR_PATHS.map((path) => ({ path, normalizedTextSha256: sha(read(root, path)) }));
}
function assertGeneratorPins(root) {
    const expectedPaths = S5_GENERATOR_PATHS.filter((path) => path !== 'tools/rust-r1b/s5/review.mjs');
    const pins = S5_REVIEW.generatorNormalizedTextSha256;
    if (!pins || typeof pins !== 'object' || Array.isArray(pins)) throw new Error('S5 reviewed generator hashes are not frozen');
    assert.deepEqual(Object.keys(pins), expectedPaths, 'S5 reviewed generator file set changed');
    for (const path of expectedPaths) assert.equal(sha(read(root, path)), pins[path], 'S5 generator bytes differ from independent B review: ' + path);
}
export function assertS5MetadataGuard(root) {
    // A is the fixed consumed source reference. B metadata/code is required to
    // be tracked and clean at the runtime checkout, with independent exact pins.
    // HEAD is only a cleanliness baseline here; it never becomes sourceHead.
    const scope = ['tools/rust-r1b/s5', IDENTITY_PATH, REGISTRY_PATH, 'tools/rust-r1b/export-shared.mjs'];
    const files = [...S5_GENERATOR_PATHS, IDENTITY_PATH, REGISTRY_PATH];
    const options = { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 };
    execFileSync('git', ['ls-files', '--error-unmatch', '--', ...files], options);
    const changed = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', 'HEAD', '--', ...scope], options);
    const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--no-ext-diff', 'HEAD', '--', ...scope], options);
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...scope], options);
    assertGuardReport({ changed, staged, untracked }, 'committed B generator and registration metadata');
}
function metadataFingerprints(root) {
    return [IDENTITY_PATH, REGISTRY_PATH].map((path) => {
        const raw = readFileSync(resolve(root, path));
        return { path, rawBytesSha256: sha(raw), normalizedTextSha256: sha(norm(raw.toString('utf8'))) };
    });
}
export function mainS5(args, root, legacy) {
    if (args.length !== 1 || !['--write', '--check'].includes(args[0])) throw new Error('Usage: node tools/rust-r1b/export-shared.mjs --s5 --write|--check');
    if (typeof legacy?.artifacts !== 'function') throw new Error('S5 requires the retained legacy renderer');
    const pinned = assertPinnedReview(read(root, REGISTRY_PATH), read(root, IDENTITY_PATH));
    assertGeneratorPins(root);
    assertS5MetadataGuard(root);
    const sourceAccess = createSnapshotSourceAccess(root, S5_REVIEW.snapshotManifestRawSha256);
    assertS5SourceGuard(root, pinned.registry.sourceHead, sourceAccess);
    const before = sourceAccess.inputFingerprints();
    const metadataBefore = metadataFingerprints(root);
    const generatorsBefore = generatorFingerprints(root);
    sourceAccess.assertLiveMatchesSnapshots();
    // No candidate mode, source text override, guard=false, or HEAD-derived A.
    const manifest = buildS5Manifest(root, pinned.registry, pinned.identity, { sourceAccess });
    manifest.authority.sourceInputs = before;
    manifest.authority.generators = generatorsBefore;
    manifest.authority.reviewMetadata = { relationship: 'independent B tool/identity/registration review, separate from consumed A source', files: metadataBefore };
    const outputs = legacy.artifacts(manifest);
    assertArtifactSet(outputs);
    const assertStable = () => {
        sourceAccess.assertLiveMatchesSnapshots();
        assert.deepEqual(sourceAccess.inputFingerprints(), before, 'S5 consumed source changed during construction');
        assert.deepEqual(metadataFingerprints(root), metadataBefore, 'S5 B metadata changed during construction');
        assert.deepEqual(generatorFingerprints(root), generatorsBefore, 'S5 B generator changed during construction');
        assertGeneratorPins(root);
        assertS5MetadataGuard(root);
        assertS5SourceGuard(root, pinned.registry.sourceHead, sourceAccess);
    };
    assertStable();
    applyArtifactMode(args[0], outputs, root);
    assertStable();
    console.log(JSON.stringify({ mode: '--s5 ' + args[0], sourceHead: pinned.registry.sourceHead, actualNodeVersion: process.versions.node,
        sourceAccess: sourceAccess.provenance, coverage: manifest.coverage, sourceStable: true,
        artifacts: [...outputs].map(([path, text]) => ({ path, normalizedTextSha256: sha(text) })) }, null, 2));
    return manifest;
}
