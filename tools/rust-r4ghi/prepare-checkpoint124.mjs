import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 12000000 });
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(git(['rev-parse', 'HEAD']).trim(), 'd62e38b5c0705ac942ed5aea92a658dfabcc63fb'); assert.equal(git(['branch', '--show-current']).trim(), 'codex/poms-r4ghi-next25');
assert.equal(git(['diff', '--cached', '--name-only']).trim(), '', 'Preserve an existing index');
const changed = git(['diff', '--name-only', '-z']).split('\0').filter(Boolean), fresh = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const forbidden = /(?:^|\/)(?:sandbox|target|proposal-target|node_modules|\.angular|\.cache|jest-cache|jest-root-dependency-cache)(?:\/|$)|\.(?:exe|pdb|rlib|rmeta|dll|o|so|a)$/i;
const pack = /^tools\/rust-r4ghi\/H\/implementation\/support-patches\/(?:independent-native92-review\/|ui-integration\/(?:public-role-race23(?:-02)?|tcp-relay24|proxy-error27|creator-origin28|creator-readback29|ui05-input30)\/)/;
const iPack = /^tools\/rust-r4ghi\/I\/implementation\/(?:actual-operation-coverage67|native-modern-reference92|native-targeted-cleanup92-02)\//;
const aPack = /^tools\/rust-r4ghi\/independent\/review05\/(?:frozen-parent-lock-review79\/|shared-source-followup58\/(?:edition12-(?:80|81|82)|tax-dependency-proposal83|foreign-fiscal-source-proposal84(?:-02)?|tax-scope-review83|tax-continuation13-draft85(?:-02)?)\/)/;
const allowed = file => !forbidden.test(file) && (file === 'tools/rust-r4ghi/.gitignore' || file === 'docs/design/rust-r4ghi-delivery-status.json' || /^docs\/design\/rust-r4ghi\/[^/]+\.(?:json|md)$/.test(file)
  || /^tools\/rust-r4ghi\/[^/]+\.(?:mjs|json|ps1|md)$/.test(file) || /^tools\/rust-r4ghi\/business\/[^/]+\.(?:mjs|json|cjs)$/.test(file)
  || pack.test(file) || iPack.test(file) || aPack.test(file) || /^tools\/rust-r4ghi\/(?:corrective-composed106|evidence\/composed118)\//.test(file)
  || /^tools\/rust-r4ghi\/checkpoints\/(?:cookie104|shared91|shared92|ui98|origin109|readback119)\//.test(file)
  || /^tools\/rust-r4ghi\/H\/implementation\/support-patches\/ui-integration\/(?:runtime14|handoff16)\//.test(file));
for (const file of changed) assert(allowed(file), 'Unexpected tracked change: ' + file);
const paths = [...new Set([...changed, ...fresh.filter(allowed)])].sort();
const files = paths.map(file => { const stat = fs.lstatSync(root + '/' + file); assert(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(root + '/' + file);
  assert(!(bytes[0] === 0x7f && bytes.subarray(1, 4).toString() === 'ELF') && bytes.subarray(0, 2).toString() !== 'MZ', 'Compiled binary stays local: ' + file);
  assert(stat.size < 5000000, 'Large file requires exact review: ' + file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; });
const out = root + '/tmp/rust-r4ghi/root/implementation-checkpoint124-02'; fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/stage-plan.json', JSON.stringify({ kind: 'Root-explicit-G2-evidence-checkpoint124-stage-plan', baseHead: 'd62e38b5c0705ac942ed5aea92a658dfabcc63fb', files,
  intentionallyUnstaged: fresh.filter(f => !allowed(f)), productSourceChanged: false, actualRuntimeStillSource12: true, formalRustDelivered: 240, newBatchCertified: 0, G3Certified: false, G4Certified: false, mainMergeAuthorized: false }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(out + '/stage-paths.nul', Buffer.from(paths.join('\0') + '\0'), { flag: 'wx' });
console.log(JSON.stringify({ files: files.length, bytes: files.reduce((n, p) => n + p.bytes, 0), intentionallyUnstaged: fresh.filter(f => !allowed(f)).length, largest: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 4).map(p => ({ file: p.file, bytes: p.bytes })), notYetStaged: true }));
