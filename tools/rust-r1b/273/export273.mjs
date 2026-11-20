// Independent whole-exporter entry. The old --s5 entry and review stay untouched.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createSourceAccess273, strictBytes273,assertSnapshotSourceAccess } from './source-access273.mjs';
import { assertCodeMetadataGit273, assertSourceGit273, loadPinnedReview273, CODE273 } from './guard273.mjs';
export const ROOT273 = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const ARTIFACTS273 = Object.freeze(['tools/rust-r1b/shared-manifest.json', 'apps/poms-api-rust/src/shared/generated.rs', 'apps/poms-api-rust/tests/shared_generated.rs']);
const sha = raw => createHash('sha256').update(raw).digest('hex');
const normalized = raw => raw.toString('utf8').replace(/\r\n/g, '\n');
export function parse273(args) {
    if (args.length === 1 && args[0] === '--help') return null;
    assert(args.length === 3 && ['--write','--check'].includes(args[0]) && args[1] === '--review-sha' && /^[0-9a-f]{64}$/.test(args[2]), 'Usage: node tools/rust-r1b/273/export273.mjs --write|--check --review-sha <Root-approved-review-raw-SHA>');
    return { mode: args[0], reviewSHA256: args[2] };
}
export async function main273(args, root = ROOT273) {
    const parsed = parse273(args); if (!parsed) { console.log('Independent273 whole exporter; formal Source A + reviewed B required. --write|--check --review-sha <64hex>'); return; }
    assert.equal(process.versions.node.split('.')[0], '24', 'Formal273 tools require Node24');
    const binding = loadPinnedReview273(root, parsed.reviewSHA256);
    assertCodeMetadataGit273(root);
    const access = createSourceAccess273(root, binding.review.checkpoint);
    assertSourceGit273(root, binding.review, access);
    const before = access.inputFingerprints(), codeBefore = CODE273.map(file => ({ file, rawBytesSha256: sha(strictBytes273(root, file)) }));
    // No whole-engine/render imports occur until their exact reviewed bytes and B
    // cleanliness have passed. No candidate/dirty mode is exposed by this CLI.
    const engine = await import(pathToFileURL(resolve(root, 'tools/rust-r1b/273/full-build273.mjs')));
    const renderer = await import(pathToFileURL(resolve(root, 'tools/rust-r1b/export-shared.mjs')));
    const manifest = engine.build273Manifest(root, binding.registry, binding.identity, { sourceAccess: access });
    const outputs = renderer.artifacts(manifest);
    assert(outputs instanceof Map); assert.deepEqual([...outputs.keys()], ARTIFACTS273);
    for (const [file, value] of outputs) { assert(typeof value === 'string'); assert(!access.sourceScope.includes(file), '273 outputs cannot also be Source A inputs'); strictBytes273(root, file); }
    const pinnedAgain = loadPinnedReview273(root, parsed.reviewSHA256);
    assert.deepEqual(pinnedAgain, binding); assertCodeMetadataGit273(root); assertSourceGit273(root, binding.review, access);
    assert.deepEqual(access.inputFingerprints(), before);
    const report = [];
    assertSnapshotSourceAccess(access,root);
    for (const [file, value] of outputs) {
        const current = strictBytes273(root, file);
        if (parsed.mode === '--check') assert.equal(normalized(current), value, 'Stale273 whole artifact: ' + file);
        else writeFileSync(resolve(root, file), value, 'utf8');
        report.push({ file, rawBytesSha256: sha(strictBytes273(root, file)), generatedTextSha256: sha(value) });
    }
    assert.deepEqual(CODE273.map(file => ({ file, rawBytesSha256: sha(strictBytes273(root, file)) })), codeBefore);
    access.assertLiveMatchesSnapshots(); assertSourceGit273(root, binding.review, access); loadPinnedReview273(root, parsed.reviewSHA256); assertCodeMetadataGit273(root);
    console.log(JSON.stringify({ kind: 'actual273-guarded-whole-exporter', mode: parsed.mode, sourceHead: binding.review.sourceHead, approvedReviewSHA256: parsed.reviewSHA256, sourceAccess: access.provenance, nodeVersion: process.versions.node, coverage: manifest.coverage, artifacts: report, oldS5Repointed: false, G3Certified: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main273(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
