import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = 'tools/rust-r4ghi/I/implementation/support-patches';
const manifest = base + '/support-integration06-manifest.json';
const bytes = fs.readFileSync(manifest), data = JSON.parse(bytes);
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(data.files.length, 8);
for (const item of data.dependencies) assert.equal(sha(fs.readFileSync(item.path)), item.sha256, 'Dependency changed: ' + item.path);
const changes = data.files.map(item => {
    assert(/^apps\/poms-api-rust\/src\/(project_handover|projects|leads)\/[a-z_]+\.rs$/.test(item.path));
    assert.equal(sha(fs.readFileSync(item.path)), item.baseSha256, 'Root base changed: ' + item.path);
    const value = fs.readFileSync(base + '/support-integration06/candidate/' + item.path);
    assert.equal(sha(value), item.candidateSha256);
    return { item, value };
});
const receipt = 'docs/design/rust-r4ghi/i-support-promotion06.json';
assert(!fs.existsSync(receipt));
for (const { item, value } of changes) { fs.mkdirSync(path.dirname(item.path), { recursive: true }); fs.writeFileSync(item.path, value); }
fs.writeFileSync(receipt, JSON.stringify({ kind: 'Root-reviewed-exact-I-support-promotion', capturedAt: new Date().toISOString(), manifest, manifestSHA256: sha(bytes), inputs: data.files, dependencies: data.dependencies, compilePassed: false, HTTPPassed: false, G3: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: changes.length, originalHashesChecked: true, receipt }));
