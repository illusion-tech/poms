import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(git(['rev-parse', 'HEAD']).trim(), 'c4192c4842f40ec1d4667d7189863f7093f37975');
assert.equal(git(['branch', '--show-current']).trim(), 'codex/poms-r4ghi-next25');
assert.equal(git(['diff', '--cached', '--name-only']).trim(), '', 'Preserve any existing staged work');
const changed = git(['diff', '--name-only', '-z']).split('\0').filter(Boolean);
const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const permitted = file => /^(?:apps\/poms-api-rust\/src\/projects\/(?:service|store)\.rs|docs\/design\/rust-r4ghi-delivery-status\.json)$/.test(file)
  || file === 'tools/rust-r4ghi/.gitignore'
  || file.startsWith('docs/design/rust-r4ghi/')
  || /^tools\/rust-r4ghi\/[^/]+\.(?:mjs|json|ps1)$/.test(file)
  || file.startsWith('tools/rust-r4ghi/business/')
  || /^tools\/rust-r4ghi\/H\/implementation\/support-patches\/ui-integration\/(?:expense18-04|gh18-06|handoff16|handoff16-03|handoff19|lifecycle18-03|role18-05|role18-05b|role18-05c|runtime14|windows-preflight22|windows-preflight22-02)\//.test(file)
  || /^tools\/rust-r4ghi\/I\/implementation\/(?:business-a05-overflow59|business-consumer-admission62|business-frozen-reparent58|business-frozen-reparent58-02|business-lifecycle-races57|business-lifecycle-races57-02|business-receipt-terms-race66|support-patches\/project-metadata-noop61)\//.test(file)
  || /^tools\/rust-r4ghi\/checkpoints\/(?:a05-overflow59|consumer62|project-noop72|ui-actors16-03)\//.test(file)
  || /^tools\/rust-r4ghi\/independent\/review05\/(?:static-validation-readback64|restatement-readback-fix78)\//.test(file);
const intentionalExclusion = file => /^tools\/rust-r4ghi\/independent\/review05\/(?:shared-source-followup58|frozen-parent-lock-review79)\//.test(file);
for (const file of changed) assert(permitted(file), 'Unexpected tracked modification: ' + file);
const rejected = untracked.filter(file => !permitted(file) && !intentionalExclusion(file));
assert.deepEqual(rejected, [], 'Unclassified new files must be reviewed before staging');
const paths = [...new Set([...changed, ...untracked.filter(permitted)])].sort();
const files = paths.map(file => {
  assert(!/(?:^|\/)(?:proposal-target|target|node_modules|\.cache|sandbox)(?:\/|$)|\.(?:exe|pdb|rlib|rmeta|dll|o|so|a)$/i.test(file), 'Build/cache files are excluded: ' + file);
  const stat = fs.lstatSync(root + '/' + file); assert(stat.isFile() && !stat.isSymbolicLink());
  const fd = fs.openSync(root + '/' + file, 'r'); const header = Buffer.alloc(4);
  try { fs.readSync(fd, header, 0, 4, 0); } finally { fs.closeSync(fd); }
  assert(!(header[0] === 0x7f && header.subarray(1).toString() === 'ELF') && header.subarray(0, 2).toString() !== 'MZ', 'Compiled validation binaries stay local: ' + file);
  assert(stat.size < 4_000_000, 'Review any unexpectedly large file: ' + file);
  const bytes = fs.readFileSync(root + '/' + file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) };
});
const output = root + '/tmp/rust-r4ghi/root/implementation-checkpoint87'; fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(output + '/stage-paths.nul', Buffer.from(paths.join('\0') + '\0'), { flag: 'wx' });
fs.writeFileSync(output + '/stage-plan.json', JSON.stringify({ kind: 'explicit-Root-G2-checkpoint87-stage-plan', baseHead: git(['rev-parse', 'HEAD']).trim(), files,
  excludedUnsealedOrPending: untracked.filter(intentionalExclusion), G3Certified: false, G4Certified: false, mainMergeAuthorizedByThisRecord: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ plannedFiles: files.length, bytes: files.reduce((total, item) => total + item.bytes, 0), intentionallyExcludedFiles: untracked.filter(intentionalExclusion).length,
  stagePathspec: output + '/stage-paths.nul', notYetStaged: true, G3Certified: false }));
