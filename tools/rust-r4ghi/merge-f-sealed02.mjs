// Two independent reviewed diffs append helpers at the same old EOF. Apply the
// unchanged allocation-body hunks, then append its pure new helpers after the
// already-applied stage/tax helpers; preserve both input diffs unchanged.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
process.chdir('E:/projects/worktrees/poms-r3hijk-next28/poms');
const source = 'apps/poms-api-rust/src/project_cost_governance/service.rs';
const patchPath = 'tools/rust-r4ghi/G/implementation/support-patches/F-allocation-sealed01.patch';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(fs.readFileSync(source)), '625d71aa11f251cf364de4b32a77d6ed0dd3b995019899f30eee8a527fde6786');
const patch = fs.readFileSync(patchPath, 'utf8').replaceAll('\r\n', '\n');
const starts = [...patch.matchAll(/^@@ /gm)].map(match => match.index);
const last = starts.at(-1); assert(last > 0);
const tail = patch.slice(last).split('\n');
assert(tail[0].startsWith('@@ -1132,3 '));
assert(!tail.slice(1).some(line => line.startsWith('-')));
const appended = tail.slice(1).filter(line => line.startsWith('+')).map(line => line.slice(1)).join('\n') + '\n';
assert(appended.includes('fn restatement_successor_cost(') && appended.includes('async fn validate_restatement_allocation_source('));
const out = 'tmp/rust-r4ghi/root/f-sealed-merge02'; assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/allocation-body.patch', patch.slice(0, last), { flag: 'wx' });
const result = spawnSync('git', ['apply', out + '/allocation-body.patch'], { encoding: null, windowsHide: true });
fs.writeFileSync(out + '/stdout.bin', result.stdout ?? Buffer.alloc(0), { flag: 'wx' });
fs.writeFileSync(out + '/stderr.bin', result.stderr ?? Buffer.alloc(0), { flag: 'wx' });
assert.equal(result.status, 0);
fs.appendFileSync(source, appended);
const receipt = { kind: 'actual-Root-independent-F-sealed-diff-composition', beforeSHA256: '625d71aa11f251cf364de4b32a77d6ed0dd3b995019899f30eee8a527fde6786', originalAllocationPatchSHA256: sha(fs.readFileSync(patchPath)), bodyPatchSHA256: sha(fs.readFileSync(out + '/allocation-body.patch')), appendedHelpersSHA256: sha(Buffer.from(appended)), afterSHA256: sha(fs.readFileSync(source)), originalInputsChanged: false, compiled: false, databaseRun: false };
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
