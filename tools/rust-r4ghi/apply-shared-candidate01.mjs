// Root reviews a bounded proposal and promotes exact pinned product bytes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const folder = 'tools/rust-r4ghi/H/implementation/support-patches/shared-g2';
const manifestFile = folder + '/shared-native-g2-manifest.json';
const manifestBytes = fs.readFileSync(manifestFile);
const manifest = JSON.parse(manifestBytes);
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(manifest.schemaCount, 129);
assert.equal(manifest.strictProjectDetailBranches, 3);
assert.equal(manifest.sealed128GeneratedArtifactPreserved, true);
const changes = manifest.files.map(item => {
    assert(/^(apps\/poms-api\/src\/app\/|libs\/(api|shared)\/contracts\/src\/)/.test(item.path));
    assert(!item.path.split('/').includes('..'));
    const bytes = fs.readFileSync(folder + '/proposed/' + item.path);
    assert.equal(sha(bytes), item.sha256, item.path + ' proposed bytes');
    assert.equal(bytes.length, item.bytes);
    const current = fs.existsSync(item.path) ? sha(fs.readFileSync(item.path)) : null;
    assert.equal(current, item.originalSHA256, item.path + ' Root base changed');
    return { item, bytes };
});
const receipt = 'docs/design/rust-r4ghi/shared-promotion01.json';
assert(!fs.existsSync(receipt));
for (const { item, bytes } of changes) {
    fs.mkdirSync(path.dirname(item.path), { recursive: true });
    fs.writeFileSync(item.path, bytes);
}
fs.writeFileSync(receipt, JSON.stringify({ kind: 'exact-shared-native-product-proposal-promotion', capturedAt: new Date().toISOString(), manifest: manifestFile, manifestSHA256: sha(manifestBytes), files: manifest.files, fullBuildPassed: false, actualHTTPPassed: false, OpenAPIGenerated: false, G3: false, G4: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: changes.length, allOriginalHashesChecked: true, receipt }));
