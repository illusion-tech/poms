// Formal273 SDK successor. Full JAR/repair/normalize engine is reused unchanged.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createSourceAccess273, strictBytes273 } from '../rust-r1b/273/source-access273.mjs';
import { loadPinnedReview273, assertCodeMetadataGit273, assertSourceGit273 } from '../rust-r1b/273/guard273.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const protectedFiles = ['libs/shared/api-spec/openapi.json', 'tools/openapi/typescript-angular.config.json', 'openapitools.json', 'package.json', 'pnpm-lock.yaml', '.gitattributes'];
const sha = raw => createHash('sha256').update(raw).digest('hex');
export async function mainSdk273(args, workspace = root) {
    if (args.length === 1 && args[0] === '--help') { console.log('Formal273 full SDK: --write|--check --review-sha <Root-approved-review-raw-SHA>'); return; }
    assert(args.length === 3 && ['--write','--check'].includes(args[0]) && args[1] === '--review-sha' && /^[0-9a-f]{64}$/.test(args[2]), 'Formal273 SDK requires exact mode and approved review SHA');
    assert.equal(process.versions.node.split('.')[0], '24', 'Formal273 tools require Node24');
    const require = createRequire(resolve(workspace, 'package.json'));
    assert.equal(require('typescript/package.json').version, '6.0.3'); assert.equal(require('zod/package.json').version, '4.6.1');
    const binding = loadPinnedReview273(workspace, args[2]); assertCodeMetadataGit273(workspace);
    const access = createSourceAccess273(workspace, binding.review.checkpoint); assertSourceGit273(workspace, binding.review, access);
    const baseline = JSON.parse(strictBytes273(workspace, binding.review.sdkBaseline.file));
    const oldS6 = JSON.parse(strictBytes273(workspace, binding.review.previousS6Baseline.file));
    assert.equal(oldS6.sourceHead, '2cd1be6029cf1b14ebfb1fc4530af894507a4c5a');
    assert.equal(baseline.formatVersion, 1); assert.equal(baseline.sourceHead, binding.review.sourceHead);
    assert.equal(baseline.generator.version, '7.20.0'); assert(/^[0-9a-f]{64}$/.test(baseline.generator.jarSha256));
    assert.deepEqual(baseline.generator, oldS6.generator, '273 reuses the exact reviewed S6 JAR identity');
    assert.equal(baseline.spec.file, 'libs/shared/api-spec/openapi.json'); assert.equal(baseline.client.directory, 'libs/shared/api-client');
    assert.deepEqual(baseline.protectedSources.map(row => row.file), protectedFiles);
    assert.deepEqual(baseline.client.metadata, ['project.json','tsconfig.json','tsconfig.lib.json']);
    assert.equal(baseline.spec.operations.length, 296); assert.equal(baseline.spec.paths.length, 242); assert.equal(baseline.spec.schemas.length, 691);
    assert.equal(baseline.featureRegistration, 'tools/rust-r4ghi/contracts273/registration.json');
    const feature = JSON.parse(strictBytes273(workspace, baseline.featureRegistration));
    assert.equal(feature.kind, 'historical-public273-explicit-source-registration'); assert.equal(feature.publicSchemaCount, 132);
    assert.equal(sha(strictBytes273(workspace, feature.canonical.file)), feature.canonical.rawBytesSha256);
    // The named273 engine requires this actual full-source capability and
    // rechecks it after JAR/repair/normalize, before its first SDK write/delete.
    // Original JAR/repair/normalization utilities and old690 entry stay intact.
    const engine = await import(pathToFileURL(resolve(workspace, 'tools/openapi/sdk-engine273.mjs')));
    const result = engine.runClient273({ root: workspace, mode: args[0], baseline, sourceAccess: access });
    assert.equal(result.result, 'pass', '273 full SDK check differs from generated output');
    access.assertLiveMatchesSnapshots(); assertSourceGit273(workspace, binding.review, access); loadPinnedReview273(workspace, args[2]); assertCodeMetadataGit273(workspace);
    console.log(JSON.stringify({ kind: 'actual273-full-SDK-guarded', reviewedSourceHead: binding.review.sourceHead, approvedReviewSHA256: args[2], result, oldS6BaselineRewritten: false, G3Certified: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) mainSdk273(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
