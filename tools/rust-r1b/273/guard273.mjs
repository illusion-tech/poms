import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { strictBytes273,assertSnapshotSourceAccess } from './source-access273.mjs';
import { resolve } from 'node:path';
const sha = raw => createHash('sha256').update(raw).digest('hex');
const norm = raw => raw.toString('utf8').replace(/\r\n/g, '\n');
export const REVIEW273 = 'tools/rust-r1b/273/review.json';
export const REGISTRY273 = 'tools/rust-r1b/273/registration.json';
export const IDENTITY273 = 'tools/rust-r1b/history/s3-nominal-identity.json';
export const CODE273 = Object.freeze([
    'tools/rust-r1b/273/source-access273.mjs', 'tools/rust-r1b/273/guard273.mjs',
    'tools/rust-r1b/273/capture-observation273.mjs',
    'tools/rust-r1b/273/full-build273.mjs', 'tools/rust-r1b/273/export273.mjs',
    'tools/rust-r1b/273/prepare273.mjs', 'tools/rust-r4ghi/capture-public273-input.mjs',
    'tools/openapi/shared-api-client273.mjs', 'tools/openapi/sdk-engine273.mjs', 'tools/openapi/shared-api-client.mjs',
    'tools/openapi/repair-generated-models.mjs', 'tools/rust-r1b/export-shared.mjs',
    'tools/rust-r1b/s5/registered-module-graph.mjs', 'tools/rust-r1b/s5/static-data-oracle.mjs'
]);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
export function assertReviewShape273(review) {
    assert(review && review.kind === 'Root-independently-reviewed-273-exporter-binding', '273 review must be an explicit independently approved binding');
    assert(/^[0-9a-f]{40}$/.test(review.sourceHead ?? ''), '273 fixed Source A commit is required');
    assert(review.checkpoint && hash(review.checkpoint.rawBytesSHA256) && Number.isSafeInteger(review.checkpoint.inputRecords) && review.checkpoint.inputRecords > 0 && Array.isArray(review.checkpoint.logicalSourcePaths), '273 full checkpoint binding is not frozen');
    assert(review.registration?.file === REGISTRY273 && hash(review.registration.rawBytesSha256) && hash(review.registration.normalizedTextSha256));
    assert(review.identity?.file === IDENTITY273 && hash(review.identity.rawBytesSha256) && hash(review.identity.normalizedTextSha256));
    assert.deepEqual(Object.keys(review.codePins ?? {}).sort(), [...CODE273].sort(), '273 execution closure must be exact');
    for (const file of CODE273) assert(hash(review.codePins[file]), '273 execution code hash missing');
    assert(review.sdkBaseline && review.sdkBaseline.file === 'tools/rust-r1b/273/sdk-baseline.json' && hash(review.sdkBaseline.rawBytesSha256));
    assert(review.previousS6Baseline?.file === 'tools/openapi/shared-api-client-baseline.json' && hash(review.previousS6Baseline.rawBytesSha256));
    assert.deepEqual(review.inventory, { paths: 242, operations: 296, schemas: 691, publicCanonicalSchemas: 132 });
    assert(review.formalAAndBReviewed === true && review.oldS5S6Retained === true, 'Pending author metadata cannot execute a formal exporter');
}
export function loadPinnedReview273(root, approvedReviewSha256) {
    assert(hash(approvedReviewSha256), '273 requires Root externally approved review raw SHA');
    const raw = strictBytes273(root, REVIEW273); assert.equal(sha(raw), approvedReviewSha256, '273 review differs from approved raw bytes');
    const review = JSON.parse(raw); assertReviewShape273(review);
    for (const file of CODE273) assert.equal(sha(strictBytes273(root, file)), review.codePins[file], '273 execution source differs: ' + file);
    const registryRaw = strictBytes273(root, REGISTRY273), identityRaw = strictBytes273(root, IDENTITY273);
    assert.equal(sha(registryRaw), review.registration.rawBytesSha256); assert.equal(sha(norm(registryRaw)), review.registration.normalizedTextSha256);
    assert.equal(sha(identityRaw), review.identity.rawBytesSha256); assert.equal(sha(norm(identityRaw)), review.identity.normalizedTextSha256);
    const registry = JSON.parse(registryRaw), identity = JSON.parse(identityRaw);
    assert.equal(registry.reviewStatus, 'Root-reviewed-273-registration'); assert.equal(registry.sourceHead, review.sourceHead);
    assert.equal(identity.role, 'Historical nominal/source identities only; no current wire-value authority');
    assert.equal(sha(strictBytes273(root, review.sdkBaseline.file)), review.sdkBaseline.rawBytesSha256);
    assert.equal(sha(strictBytes273(root, review.previousS6Baseline.file)), review.previousS6Baseline.rawBytesSha256);
    return { review, registry, identity };
}
export function assertCleanReport273({ changed, staged, untracked }) {
    assert([changed, staged, untracked].every(value => typeof value === 'string'));
    assert(!changed.trim() && !staged.trim() && !untracked.trim(), '273 source/metadata differs from its fixed reviewed tree');
}
export function assertCommittedPaths273(actual, expected) { const known = new Set(actual); for (const file of expected) assert(known.has(file), '273 Source A missing: ' + file); }
export function assertBlobBatch273(batch, expected) {
    assert(Buffer.isBuffer(batch)); let cursor = 0;
    for (const row of expected) {
        const end = batch.indexOf(10, cursor); assert(end >= 0, '273 incomplete committed blob header');
        const match = /^[0-9a-f]{40,64} blob ([0-9]+)$/.exec(batch.subarray(cursor, end).toString('ascii')); assert(match, '273 committed source is missing/nonblob');
        const size = Number(match[1]); assert(Number.isSafeInteger(size) && size === row.rawUtf8Bytes && end + size + 1 < batch.length);
        assert.equal(sha(batch.subarray(end + 1, end + 1 + size)), row.rawBytesSha256, '273 Source A blob bytes differ');
        cursor = end + size + 1; assert.equal(batch[cursor], 10); cursor++;
    }
    assert.equal(cursor, batch.length, '273 unexpected committed blob data');
}
const git = (root, args, extra = {}) => execFileSync('git', ['--literal-pathspecs', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true, ...extra });
function assertRepositoryRoot273(root) { assert.equal(resolve(git(root,['rev-parse','--show-toplevel']).trim()).toLowerCase(),resolve(root).toLowerCase(),'273 cannot inherit an ancestor checkout identity'); }
export function assertCodeMetadataGit273(root) {
    assertRepositoryRoot273(root);
    const scope = [...CODE273, REVIEW273, REGISTRY273, IDENTITY273, 'tools/rust-r1b/273/sdk-baseline.json', 'tools/openapi/shared-api-client-baseline.json'];
    git(root, ['ls-files', '--error-unmatch', '--', ...scope]);
    assertCleanReport273({ changed: git(root, ['diff', '--name-only', '--no-ext-diff', '--no-textconv', 'HEAD', '--', ...scope]), staged: git(root, ['diff', '--cached', '--name-only', '--no-ext-diff', '--no-textconv', 'HEAD', '--', ...scope]), untracked: git(root, ['ls-files', '--others', '--exclude-standard', '--', ...scope]) });
}
export function assertSourceTreeGit273(root, sourceHead, access) {
    assert(/^[0-9a-f]{40}$/.test(sourceHead ?? ''), 'An explicit Source A commit is required'); assertSnapshotSourceAccess(access,root);access.assertLiveMatchesSnapshots();
    assertRepositoryRoot273(root);
    git(root, ['merge-base', '--is-ancestor', '4f0ad88e78622a75b88b4e3cc72aded9da67458a', sourceHead]);
    const paths = git(root, ['ls-tree', '-r', '--name-only', '-z', '--full-tree', sourceHead, '--', ...access.sourceScope]).split('\0').filter(Boolean);
    assertCommittedPaths273(paths, access.requiredCommittedPhysicalPaths);
    const expected = access.committedBlobFingerprints();
    const batch = git(root, ['cat-file', '--batch'], { encoding: null, input: expected.map(row => sourceHead + ':' + row.physicalPath + '\n').join('') });
    assertBlobBatch273(batch, expected);
    assertCleanReport273({ changed: git(root, ['diff', '--name-only', '--no-ext-diff', '--no-textconv', sourceHead, '--', ...access.sourceScope]), staged: git(root, ['diff', '--cached', '--name-only', '--no-ext-diff', '--no-textconv', sourceHead, '--', ...access.sourceScope]), untracked: git(root, ['ls-files', '--others', '--exclude-standard', '--', ...access.sourceScope]) });
}
export function assertSourceGit273(root, review, access) {
    assertReviewShape273(review); assertSourceTreeGit273(root, review.sourceHead, access);
}
