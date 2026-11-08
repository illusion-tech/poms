import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const git = args => execFileSync('git', args, { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 30000000 });
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(git(['rev-parse', 'HEAD']).trim(), 'd90811f2e422d8037699058452d42cfbbd020345');
assert.equal(git(['branch', '--show-current']).trim(), 'codex/poms-r4ghi-next25'); assert.equal(git(['diff', '--cached', '--name-only']).trim(), '');
const sources = JSON.parse(fs.readFileSync(P + '/source13-preparation193/sourcePins.json'));
const helpers = JSON.parse(fs.readFileSync(P + '/source13-preparation183/helperH0.json'));
assert.equal(sources.length, 416); assert.equal(helpers.length, 195);
for (const item of [...sources, ...helpers]) assert.equal(sha(fs.readFileSync(R + '/' + item.file)), item.sha256, 'Frozen actual input changed: ' + item.file);
const frozenFiles = new Set([...sources, ...helpers].map(p => p.file));
const forbidden = /(?:^|\/)(?:sandbox[^/]*|target|proposal-target|node_modules|\.angular|\.cache|jest[^/]*cache[^/]*|isolated[^/]*|pure-graph|checks[^/]*|[^/]*synthetic[^/]*)(?:\/|$)|\.(?:exe|pdb|rlib|rmeta|dll|o|so|a)$/i;
const hPack = /^tools\/rust-r4ghi\/H\/implementation\/support-patches\/(?:policy-source13-46|labor-masking47(?:-02|-03)?)\//;
const iPack = /^tools\/rust-r4ghi\/I\/implementation\/(?:schema-admission108(?:-02)?|source13-b0-plan-b1(?:-02|-03|-04)?|m98-frozen-negative-external(?:-02)?)\//;
const aPack = /^tools\/rust-r4ghi\/independent\/(?:final-gates13\/|review05\/(?:api-start-review111|build-input-corrective-review113|constructor04-review116|external-role49-review115|freeze-source13-review112|frozen-external-review108|labor-masking-review110|policy-source13-review106|protocol193-review117|refreeze189-review114|resource-admission-review118|source-build-review109|source13-constructor-review107|period205-review119)\/)/;
const allowed = file => !forbidden.test(file) && (frozenFiles.has(file) || file === 'docs/design/rust-r4ghi-delivery-status.json'
  || /^docs\/design\/rust-r4ghi\/[^/]+\.(?:json|md)$/.test(file)
  || /^tools\/rust-r4ghi\/[^/]+\.(?:mjs|json|ps1|md)$/.test(file)
  || /^tools\/rust-r4ghi\/checkpoints\/(?:source13-177|source-deps181|build180)\//.test(file)
  || /^tools\/rust-r4ghi\/period205(?:-02)?\//.test(file) || hPack.test(file) || iPack.test(file) || aPack.test(file));
const changed = git(['diff', '--name-only', '-z']).split('\0').filter(Boolean), fresh = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
for (const file of changed) assert(allowed(file), 'Unexpected tracked change: ' + file);
const paths = [...new Set([...changed, ...fresh.filter(allowed)])].sort();
const files = paths.map(file => { const stat = fs.lstatSync(R + '/' + file); assert(stat.isFile() && !stat.isSymbolicLink(), 'Not a regular source or evidence file: ' + file); const raw = fs.readFileSync(R + '/' + file);
  assert(raw.length < 5000000); assert(!(raw[0] === 0x7f && raw.subarray(1, 4).toString() === 'ELF') && raw.subarray(0, 2).toString() !== 'MZ');
  return { file, bytes: raw.length, rawBytesSha256: sha(raw) }; });
const out = R + '/tmp/rust-r4ghi/root/implementation-checkpoint209'; fs.mkdirSync(out, { mode: 0o700 });
fs.writeFileSync(out + '/stage-plan.json', JSON.stringify({ kind: 'Root-explicit-actual-Source13-M98-H0-checkpoint209-plan', baseHead: 'd90811f2e422d8037699058452d42cfbbd020345', files,
  intentionallyUnstaged: fresh.filter(file => !allowed(file)), productSourceChanged: true, Source13AndM98ActuallyApplied: true, originalM97BusinessBaselineRetained: true,
  H0Still195OriginalBytes: true, unapplied205And20502RetainProposalLabels: true, H1Admitted: false,
  formalRustDelivered: 240, newCertified: 0, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(out + '/stage-paths.nul', Buffer.from(paths.join('\0') + '\0'), { flag: 'wx' });
console.log(JSON.stringify({ plannedFiles: files.length, totalBytes: files.reduce((n, f) => n + f.bytes, 0), intentionallyUnstaged: fresh.filter(file => !allowed(file)).length, staged: false, H1Admitted: false }));
