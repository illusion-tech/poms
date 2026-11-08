// Exclude the reviewer temporary shadow graph; preserve sealed source/log bytes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const git = args => execFileSync('git', args, { cwd: R, windowsHide: true, maxBuffer: 30000000 });
const sha = value => createHash('sha256').update(value).digest('hex');
const prior = JSON.parse(fs.readFileSync(R + '/tmp/rust-r4ghi/root/implementation-checkpoint209/stage-plan.json'));
const removed = prior.files.filter(p => p.file.includes('/shadow-business/'));
assert.equal(removed.length, 196); //195 historical helper leaves plus proposed sources13.
git(['restore', '--staged', '--', 'tools/rust-r4ghi/independent/review05/period205-review119/shadow-business']);
const extras = ['tools/rust-r4ghi/.gitattributes', 'tools/rust-r4ghi/check-planned-secrets210.mjs', 'tools/rust-r4ghi/check-staged-boundary211.mjs',
  'tools/rust-r4ghi/finalize-stage212.mjs', 'tools/rust-r4ghi/check-staged-boundary213.mjs'];
git(['add', '--', ...extras]);
const expected = [...prior.files.filter(p => !p.file.includes('/shadow-business/')).map(p => p.file), ...extras].sort();
const files = [...new Set(expected)].map(file => { const raw = fs.readFileSync(R + '/' + file), old = prior.files.find(p => p.file === file); if (old) assert.equal(sha(raw), old.rawBytesSha256); return { file, bytes: raw.length, rawBytesSha256: sha(raw) }; });
assert.deepEqual(git(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort(), files.map(p => p.file));
const out = R + '/tmp/rust-r4ghi/root/implementation-checkpoint212'; fs.mkdirSync(out, { mode: 0o700 });
fs.writeFileSync(out + '/stage-plan.json', JSON.stringify({ ...prior, kind: 'Root-explicit-actual-Source13-final-staging212', files,
  previousStaging209Kept: true, excludedTemporaryShadowFiles: removed, rawSealedLogsUnchanged: true }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ stagedFiles: files.length, excludedTemporaryShadowFiles: removed.length, originalFilesAndLogsUnchanged: true }));
