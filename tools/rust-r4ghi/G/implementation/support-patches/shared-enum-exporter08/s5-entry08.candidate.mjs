import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildS5Manifest, IDENTITY_PATH, REGISTRY_PATH, S5_SCOPE, S5_INPUTS } from './full-build08.candidate.mjs';
import { S5_REVIEW } from './s5-review08.candidate.mjs';

const norm = (text) => text.replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const read = (root, path) => norm(readFileSync(resolve(root, path), 'utf8'));
export const S5_GENERATOR_PATHS = Object.freeze([
    'tools/rust-r1b/export-shared.mjs',
    'tools/rust-r1b/s5/export-s5.mjs',
    'tools/rust-r1b/s5/full-build.mjs',
    'tools/rust-r1b/s5/registered-module-graph.mjs',
    'tools/rust-r1b/s5/static-data-oracle.mjs',
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
        || !/^[0-9a-f]{64}$/.test(review.identityNormalizedTextSha256 ?? '')) {
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

export function assertS5SourceGuard(root, reference) {
    if (!/^[0-9a-f]{40}$/.test(reference ?? '')) throw new Error('Missing fixed S5 source reference');
    const options = { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 };
    const changed = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', reference, '--', ...S5_SCOPE], options);
    const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--no-ext-diff', reference, '--', ...S5_SCOPE], options);
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...S5_SCOPE], options);
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

function inputFingerprints(root) {
    return S5_INPUTS.map((path) => {
        const text = read(root, path);
        return { path, normalizedUtf8Bytes: Buffer.byteLength(text), normalizedTextSha256: sha(text) };
    });
}

export function mainS5(args, root, legacy) {
    if (args.length !== 1 || !['--write', '--check'].includes(args[0])) throw new Error('Usage: node tools/rust-r1b/export-shared.mjs --s5 --write|--check');
    if (typeof legacy?.artifacts !== 'function') throw new Error('S5 requires the retained legacy renderer');
    const pinned = assertPinnedReview(read(root, REGISTRY_PATH), read(root, IDENTITY_PATH));
    assertS5SourceGuard(root, pinned.registry.sourceHead);
    const before = inputFingerprints(root);
    // No candidate mode, source text override, guard=false, or HEAD-derived pin.
    const manifest = buildS5Manifest(root, pinned.registry, pinned.identity);
    manifest.authority.sourceInputs = before;
    manifest.authority.generators = S5_GENERATOR_PATHS.map((path) => ({ path, normalizedTextSha256: sha(read(root, path)) }));
    const outputs = legacy.artifacts(manifest);
    assertArtifactSet(outputs);
    const after = inputFingerprints(root);
    assert.deepEqual(after, before, 'S5 source changed during construction');
    assertS5SourceGuard(root, pinned.registry.sourceHead);
    applyArtifactMode(args[0], outputs, root);
    assert.deepEqual(inputFingerprints(root), before, 'S5 source changed during artifact operation');
    assertS5SourceGuard(root, pinned.registry.sourceHead);
    console.log(JSON.stringify({ mode: '--s5 ' + args[0], sourceHead: pinned.registry.sourceHead, actualNodeVersion: process.versions.node,
        coverage: manifest.coverage, sourceStable: true,
        artifacts: [...outputs].map(([path, text]) => ({ path, normalizedTextSha256: sha(text) })) }, null, 2));
    return manifest;
}
