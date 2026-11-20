import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 20000000 }), sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(git(['rev-parse', 'HEAD']).trim(), '6ca4f722cbbdea4fb3d8043712b827e5ad18be6b'); assert.equal(git(['branch', '--show-current']).trim(), 'codex/poms-r4ghi-next25'); assert.equal(git(['diff', '--cached', '--name-only']).trim(), '');
const changed = git(['diff', '--name-only', '-z']).split('\0').filter(Boolean), fresh = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const forbidden = /(?:^|\/)(?:sandbox[^/]*|target|proposal-target|node_modules|\.angular|\.cache|jest[^/]*cache[^/]*|isolated[^/]*|pure-graph|checks[^/]*|synthetic[^/]*)(?:\/|$)|\.(?:exe|pdb|rlib|rmeta|dll|o|so|a)$/i;
const hPack = /^tools\/rust-r4ghi\/H\/implementation\/support-patches\/(?:independent-tax13-review40\/|ui-integration\/(?:role-plan31|ui-runtime32(?:-02)?|form-plans33|role-select34|expense-query35|role-draft36(?:-02)?|frozen-role38|restart-ui39(?:-alignment41)?|api1351-ui-input42|gh-reload43|lifecycle-read44|gh-baseline45)\/)/;
const iPack = /^tools\/rust-r4ghi\/I\/implementation\/(?:business-frozen-reparent58-03|process-restart1351(?:-02)?|retention1351-139-140(?:-02)?)\//;
const aPack = /^tools\/rust-r4ghi\/independent\/(?:final-gates13\/|review05\/(?:ui32-independent-review86b?|schema108-independent-review87|runner136-review88|schema108-02-independent-review89|role-continuation-review9[01]|role-actual-readback92|source13-bootstrap-contract93|process-restart-review9[45]|frozen-role-review96|source13-freeze-contract97|retention-review(?:98|100)|gh-browser-review99|lifecycle-browser-review101|source13-operation-bridge102|gh-continuation-review103|m98-after-adapter-review104|m98-wrapper-review105|shared-source-followup58\/tax-continuation13-draft85-(?:03|04))\/)/;
const allowed = file => !forbidden.test(file) && (['tools/rust-r4ghi/.gitattributes', 'docs/design/rust-r4ghi-delivery-status.json'].includes(file)
  || /^docs\/design\/rust-r4ghi\/[^/]+\.(?:json|md)$/.test(file) || /^docs\/design\/rust-r4ghi\/retention\/final12-source140\/[^/]+\.(?:json|zip|log)$/.test(file)
  || /^tools\/rust-r4ghi\/[^/]+\.(?:mjs|json|ps1|md)$/.test(file) || /^tools\/rust-r4ghi\/business\/[^/]+\.(?:mjs|json|cjs)$/.test(file)
  || /^tools\/rust-r4ghi\/checkpoints\/(?:ui128|ui137|resume141|role143|restart150|frozen154|gh160|reviewed162|capture164|retention167)\//.test(file)
  || /^tools\/rust-r4ghi\/H\/implementation\/support-patches\/ui-integration\/(?:runtime13|runtime14|handoff16)\//.test(file) || hPack.test(file) || iPack.test(file) || aPack.test(file));
for (const file of changed) assert(allowed(file), 'Unexpected tracked change: ' + file);
const paths = [...new Set([...changed, ...fresh.filter(allowed)])].sort(), files = paths.map(file => { const stat = fs.lstatSync(root + '/' + file); assert(stat.isFile() && !stat.isSymbolicLink()); const raw = fs.readFileSync(root + '/' + file);
  assert(!(raw[0] === 0x7f && raw.subarray(1, 4).toString() === 'ELF') && raw.subarray(0, 2).toString() !== 'MZ', 'Compiled binary stays local: ' + file); assert(raw.length < 5000000); return { file, bytes: raw.length, rawBytesSha256: sha(raw) }; });
const out = root + '/tmp/rust-r4ghi/root/implementation-checkpoint172'; fs.mkdirSync(out, { mode: 0o700 });
fs.writeFileSync(out + '/stage-plan.json', JSON.stringify({ kind: 'Root-explicit-Source12-tail-preservation-checkpoint172-stage-plan', baseHead: '6ca4f722cbbdea4fb3d8043712b827e5ad18be6b', files, intentionallyUnstaged: fresh.filter(file => !allowed(file)), productSourceChanged: false,
  originalSource12StoppedAndRetained: true, actualSource13OrM98Applied: false, formalRustDelivered: 240, newCertified: 0, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(out + '/stage-paths.nul', Buffer.from(paths.join('\0') + '\0'), { flag: 'wx' });
console.log(JSON.stringify({ plannedFiles: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), intentionallyUnstaged: fresh.filter(file => !allowed(file)).length, largest: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 3).map(file => ({ file: file.file, bytes: file.bytes })), staged: false }));
