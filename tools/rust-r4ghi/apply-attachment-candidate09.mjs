import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const directory = 'tools/rust-r4ghi/I/implementation/support-patches/attachment-scope08';
const edition = process.argv[2] ?? '09';
assert(['09','10'].includes(edition));
const manifest = directory + '/apply-manifest' + edition + '.json';
const raw = fs.readFileSync(manifest), data = JSON.parse(raw);
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(data.files.length, edition === '09' ? 9 : 5);
const changes = data.files.map(item => {
    assert(/^apps\/poms-api-rust\/src\/attachments\/[a-z_]+\.rs$/.test(item.path)
        || item.path === 'libs/shared/contracts/src/lib/shared-contracts.ts'
        || /^apps\/poms-api\/src\/app\/features\/attachment\/(attachment\.service|attachment-upload-session\.entity)\.ts$/.test(item.path));
    const original = fs.existsSync(item.path) ? sha(fs.readFileSync(item.path)) : null;
    assert.equal(original, item.baseSHA256, 'Root base changed: ' + item.path);
    const bytes = fs.readFileSync(directory + (edition === '09' ? '/candidate/' : '/candidate10/') + item.path);
    assert.equal(sha(bytes), item.candidateSHA256);
    assert.equal(bytes.length, item.candidateBytes);
    return { item, bytes };
});
const receipt = 'docs/design/rust-r4ghi/attachment-scope-promotion' + edition + '.json';
assert(!fs.existsSync(receipt));
for (const { item, bytes } of changes) { fs.mkdirSync(path.dirname(item.path), { recursive: true });fs.writeFileSync(item.path, bytes); }
fs.writeFileSync(receipt, JSON.stringify({ kind: 'Root-reviewed-exact-attachment-scope-promotion', capturedAt: new Date().toISOString(), manifest, manifestSHA256: sha(raw), files: data.files, compilePassed: false, SQLPassed: false, HTTPPassed: false, G3: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promoted: changes.length, allOriginalHashesChecked: true, receipt }));
