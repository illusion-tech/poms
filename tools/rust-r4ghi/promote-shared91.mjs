import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/independent/review05/shared-source-followup58';
const base = root + '/' + relative;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(base + '/edition12-81/manifest81.json');
assert.equal(sha(bytes), '7982f478f7bf30cd66006981e2f5b1d5d0a15a9b89abd34b2e7af89e77e8dcbd');
const manifest = JSON.parse(bytes);
assert.equal(sha(fs.readFileSync(base + '/edition12-80/manifest80.json')), manifest.applyAfter80.sha256);
const source = JSON.parse(fs.readFileSync(base + '/edition12-81/candidate/tools/rust-r4ghi/business/required-write-sources58.json'));
assert.equal(source.productSources.length, 406); assert.equal(source.helperSources.length, 155);
assert.equal(fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length, 141);
const files = manifest.effectiveFiles;
for (const entry of files) {
  assert.equal(entry.candidateBase, relative); assert(entry.file.startsWith('tools/rust-r4ghi/business/') && !entry.candidate.includes('..'));
  assert.equal(sha(fs.readFileSync(base + '/' + entry.candidate)), entry.afterSHA256);
  if (entry.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + entry.file));
  else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
}
for (const pin of [...source.productSources, ...source.helperSources]) {
  const candidate = files.find(entry => entry.file === pin.file);
  assert.equal(candidate ? candidate.afterSHA256 : sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256, 'Final overlay pin mismatch: ' + pin.file);
}
const backup = root + '/tools/rust-r4ghi/checkpoints/shared91'; fs.mkdirSync(backup, { recursive: true });
for (const entry of files.filter(entry => entry.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + entry.file, backup + '/' + path.basename(entry.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const entry of files) fs.copyFileSync(base + '/' + entry.candidate, root + '/' + entry.file);
assert.equal(fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length, 152);
for (const pin of [...source.productSources, ...source.helperSources]) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256);
const node = 'C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe';
const tests = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => file.endsWith('.test.mjs')).map(file => 'tools/rust-r4ghi/business/' + file);
const result = spawnSync(node, ['--test', ...tests], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 3000000 });
const output = root + '/tmp/rust-r4ghi/root/shared91-promotion'; fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(output + '/stdout.log', result.stdout ?? '', { flag: 'wx' }); fs.writeFileSync(output + '/stderr.log', result.stderr ?? '', { flag: 'wx' }); assert.equal(result.status, 0);
const receipt = { kind: 'Root-nonauthor-effective-edition80-plus81-source12-shared-stage-tax-race-tool-promotion',
  manifest: { file: relative + '/edition12-81/manifest81.json', rawBytesSha256: sha(bytes) }, files,
  source58SHA256: manifest.source58SHA256, actualProductInputs: 406, actualBusinessHelpers: 152, registeredNonselfHelperPins: 155,
  pure: { node: 'v24.19.0', passed: 128, exitCode: result.status, stdoutSHA256: sha(Buffer.from(result.stdout)), stderrSHA256: sha(Buffer.from(result.stderr)) },
  old80AndOtherDraftsPreserved: true, SQLExecutedByPromotion: false, HTTPExecutedByPromotion: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(root + '/docs/design/rust-r4ghi/shared91-tool-promotion.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promotedFiles: 13, currentBusinessHelpers: 152, productInputs: 406, purePassed: 128, pureExitCode: result.status, HTTPExecuted: false, SQLExecuted: false }));
