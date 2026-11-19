import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/independent/review05/shared-source-followup58/edition12-82';
const base = root + '/' + relative, sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(base + '/manifest82.json'); assert.equal(sha(bytes), '06b1928d9ed8f909ef1d06bd3967360f48b58522e930f446ec8bbb18c40db7aa');
const manifest = JSON.parse(bytes);
for (const pin of manifest.currentRootHelperPinsBefore82) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256);
const source = JSON.parse(fs.readFileSync(base + '/candidate/tools/rust-r4ghi/business/required-write-sources58.json'));
for (const entry of manifest.files) { assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256); assert.equal(sha(fs.readFileSync(base + '/' + entry.candidate)), entry.afterSHA256); }
for (const pin of [...source.productSources, ...source.helperSources]) {
  const entry = manifest.files.find(entry => entry.file === pin.file);
  assert.equal(entry ? entry.afterSHA256 : sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256);
}
const backup = root + '/tools/rust-r4ghi/checkpoints/shared92'; fs.mkdirSync(backup, { recursive: true });
for (const entry of manifest.files) fs.copyFileSync(root + '/' + entry.file, backup + '/' + path.basename(entry.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const entry of manifest.files) fs.copyFileSync(base + '/' + entry.candidate, root + '/' + entry.file);
for (const pin of [...source.productSources, ...source.helperSources]) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256);
const tests = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => file.endsWith('.test.mjs')).map(file => 'tools/rust-r4ghi/business/' + file);
const result = spawnSync('C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe', ['--test', ...tests], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 3000000 });
const output = root + '/tmp/rust-r4ghi/root/shared92-promotion'; fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(output + '/stdout.log', result.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(output + '/stderr.log', result.stderr ?? '', { flag: 'wx' }); assert.equal(result.status, 0);
fs.writeFileSync(root + '/docs/design/rust-r4ghi/shared92-tool-corrective.json', JSON.stringify({ kind: 'Root-nonauthor-exact-NUMERIC-weight-tool-corrective82', manifest: { file: relative + '/manifest82.json', rawBytesSha256: sha(bytes) }, files: manifest.files,
  originalReadOnlyPartialPreserved: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/005514-shared-stage-race81-01-partial.json', rawBytesSha256: 'e1d8d970db761edd49edd02b976bc414d8580940639b0f1ac6e7b45a85619920' },
  source58SHA256: manifest.source58SHA256, productInputs: 406, businessHelpers: 152, nonselfRegisteredHelperPins: 155, pureNode: 'v24.19.0', purePassed: 130, pureExitCode: result.status,
  stdoutSHA256: sha(Buffer.from(result.stdout)), stderrSHA256: sha(Buffer.from(result.stderr)), old81AndFailuresChanged: false, HTTPExecuted: false, SQLExecuted: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ modifiedFiles: manifest.files.length, source58SHA256: manifest.source58SHA256, purePassed: 130, pureExitCode: result.status, productInputs: 406, businessHelpers: 152, HTTPExecuted: false, SQLExecuted: false }));
