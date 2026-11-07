import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const base = 'tools/rust-r4ghi/G/implementation/support-patches/shared-enum-exporter09';
const review = 'tools/rust-r4ghi/independent/review05';
const out = 'tmp/rust-r4ghi/root/whole-exporter16';
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const normalized = (file) => hash(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
const proposals = JSON.parse(fs.readFileSync(base + '/proposal-files09.json'));
const overrides = new Map([
    ['tools/rust-r1b/s5/full-build.mjs', review + '/C15/root-proposal/tools/rust-r1b/s5/full-build.mjs'],
    ['tools/rust-r1b/s5/registered-module-graph.mjs', review + '/C15/root-proposal/tools/rust-r1b/s5/registered-module-graph.mjs'],
    ['tools/rust-r1b/s5/review.mjs', review + '/C15/reviewed-C15/review.mjs'],
    ['tools/rust-r1b/s5-reviewed-registry.json', review + '/reviewed-C12/s5-reviewed-registry.json'],
]);
const { S5_REVIEW: pins } = await import(pathToFileURL(path.resolve(overrides.get('tools/rust-r1b/s5/review.mjs'))));
assert.equal(pins.sourceHead, '883f88fdf4fd609bb8b0725b28bda011d408d6ee');
const changes = proposals.map((item) => {
    const original = base + '/root-proposal/' + item.path;
    assert.equal(normalized(original), item.candidateNormalizedSha256);
    if (item.baseNormalizedSha256) assert.equal(normalized(item.path), item.baseNormalizedSha256);
    else assert(!fs.existsSync(item.path), 'A new exporter path already exists');
    const selected = overrides.get(item.path) ?? original;
    const expected = pins.generatorNormalizedTextSha256[item.path]
        ?? (item.path.endsWith('s5-reviewed-registry.json') ? pins.registryNormalizedTextSha256 : item.path.endsWith('s3-nominal-identity.json') ? pins.identityNormalizedTextSha256 : item.candidateNormalizedSha256);
    if (!item.path.endsWith('/review.mjs')) assert.equal(normalized(selected), expected);
    if (item.path.endsWith('/review.mjs')) assert.equal(normalized(selected), 'f7fa0d173770e70260e450d181d742810170575a0c3eb0596b5199c76fe35625');
    return { ...item, selected, selectedSha256: normalized(selected) };
});
const runtime = review + '/C15/runtime';
const { proposeRegistry, CLOSED_MODULES } = await import(pathToFileURL(path.resolve(runtime + '/registered-module-graph.mjs')));
const { createSnapshotSourceAccess } = await import(pathToFileURL(path.resolve(runtime + '/source-access.mjs')));
const { buildS5Manifest } = await import(pathToFileURL(path.resolve(runtime + '/full-build.mjs')));
const { assertS5SourceGuard } = await import(pathToFileURL(path.resolve(runtime + '/export-s5.mjs')));
const source = createSnapshotSourceAccess(process.cwd(), pins.snapshotManifestRawSha256);
const shared = CLOSED_MODULES[1], text = source.readText(shared);
for (const specifier of ['../../../../../foreign/libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated', '../../../../../../../libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated']) {
    const reader = { readText: (file) => file === shared ? text + `\nimport { ExecutionAdmissionContextViewSchema as ForeignAlias } from '${specifier}';\n` : source.readText(file) };
    assert.throws(() => proposeRegistry(process.cwd(), reader), /Unregistered module edge/);
}
const manifest = buildS5Manifest(process.cwd(), JSON.parse(fs.readFileSync(overrides.get('tools/rust-r1b/s5-reviewed-registry.json'))), JSON.parse(fs.readFileSync(base + '/s3-nominal-identity09.json')), { sourceAccess: source });
assert.equal(manifest.authority.sourceHead, pins.sourceHead);
assertS5SourceGuard(process.cwd(), pins.sourceHead, source);
for (const item of changes) {
    if (fs.existsSync(item.path)) fs.copyFileSync(item.path, out + '/' + path.basename(item.path) + '.before.bin');
    fs.mkdirSync(path.dirname(item.path), { recursive: true }); fs.copyFileSync(item.selected, item.path);
    assert.equal(normalized(item.path), item.selectedSha256);
}
const receipt = { kind: 'Root-reviewed-S5-whole-exporter-tooling-C', capturedAt: new Date().toISOString(), rootReviewedTwoFilePatch: true, foreignPrefixAndUnderflowNegativeRegressions: true, sourceGuardPassed: true, changes, coverage: manifest.coverage, pins, productG3: false, productG4: false };
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ applied: changes.length, input: pins.sourceHead, productG3: false, receipt: out + '/receipt.json' }));
