import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { proposeS5, buildS5Manifest } from './full-build09.candidate.mjs';
import { createSnapshotSourceAccess, CHECKPOINT_MANIFEST_PATH } from './source-access09.candidate.mjs';

const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = dirname(fileURLToPath(import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const legacy = await import(pathToFileURL(resolve(root, 'tools/rust-r1b/export-shared.mjs')).href);
const prior = JSON.parse(readFileSync(resolve(root, 'tools/rust-r1b/shared-manifest.json'), 'utf8'));
// Candidate capture only. This does not freeze a production review or A ref.
const checkpointManifestRawSha256 = hash(readFileSync(resolve(root, CHECKPOINT_MANIFEST_PATH)));
const access = createSnapshotSourceAccess(root, checkpointManifestRawSha256);
const before = access.inputFingerprints();
const proposed = proposeS5(root, prior, access);
const manifest = buildS5Manifest(root, proposed.registry, proposed.identity, { candidate: true, sourceAccess: access });
access.assertLiveMatchesSnapshots();
assert.deepEqual(access.inputFingerprints(), before, 'Source changed during pure snapshot generation');
for (const [name, value] of [['s3-nominal-identity09.json', proposed.identity], ['s5-registry09.candidate.json', proposed.registry],
    ['registrations09.json', proposed.registration], ['manifest09.candidate.json', manifest]]) {
    writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + '\n');
}
const rendered = legacy.artifacts(manifest);
for (const [path, text] of rendered) {
    const destination = resolve(out, 'proposal-poms', path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, text);
}
const oldProposal = resolve(out, '../shared-enum-exporter08/proposal-poms/apps/poms-api-rust');
for (const path of ['Cargo.toml', 'Cargo.lock', 'src/lib.rs']) {
    const destination = resolve(out, 'proposal-poms/apps/poms-api-rust', path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(oldProposal, path), destination);
}
const report = { kind: 'S5-snapshot-pure-build09', checkpointManifestRawSha256, sourceStable: true,
    inputsBefore: before, inputsAfter: access.inputFingerprints(), coverage: manifest.coverage,
    files: [...rendered].map(([path, text]) => ({ path, sha256: hash(text) })),
    sourceHead: manifest.authority.sourceHead, status: manifest.authority.mode,
    limitations: ['A Git reference is not frozen by this candidate', 'No Git command or Root artifact write/check executed', 'Final production requires independent Root B review pins and committed clean metadata'] };
writeFileSync(resolve(out, 'snapshot-build09.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ coverage: report.coverage, checkpointManifestRawSha256, sourceStable: true, status: report.status }, null, 2));
