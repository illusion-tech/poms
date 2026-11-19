import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const rel = prefix + 'role-draft36-02', author = 'E:/projects/worktrees/poms-r4h-signals/poms/' + rel, sha = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(author + '/manifest36-02.json'); assert.equal(sha(raw), 'd5def5585ca48557b210d77e6f14664b4311f9af18db1ffbede7f02bfede931e'); const m = JSON.parse(raw);
for (const p of m.files) assert.equal(sha(fs.readFileSync(author + '/' + p.file)), p.rawBytesSha256);
for (const p of m.products) { assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); assert.equal(sha(fs.readFileSync(author + '/' + p.candidate)), p.afterSHA256); }
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', state = JSON.parse(fs.readFileSync(priv + '/business/g2-business12/main01/state.json'));
assert(!fs.existsSync(priv + '/business/g2-business12/main01/driver.lock')); assert(!state.activeFault && !state.blockedObservation);
const completed = state.consumerChecks.frozenReparent58['1817b9ae-ec3a-4910-aebd-07a2b6963975'].proof; assert.equal(completed.rawBytesSha256, '731fe01317142c9a788758ca5f2a94c3c2f91b4ce3cea847061264df1c00b0c1');
const backup = root + '/tools/rust-r4ghi/checkpoints/role143'; fs.mkdirSync(backup, { recursive: true });
for (const p of m.products) fs.copyFileSync(root + '/' + p.file, backup + '/' + path.basename(p.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const p of [...m.files, { file: 'manifest36-02.json' }]) { const dest = root + '/' + rel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(author + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
for (const p of m.products) fs.copyFileSync(author + '/' + p.candidate, root + '/' + p.file);
const receiptPath = 'docs/design/rust-r4ghi/role143-tool-promotion.json', rb = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-phase-specific-Role36-02-post-freeze-read-validation', manifest: { file: rel + '/manifest36-02.json', rawBytesSha256: sha(raw) }, products: m.products,
  originalRole02StillFailed: true, actualCompletedFiveProbes: completed, UIOrFreezeExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(root + '/' + receiptPath, rb, { flag: 'wx' });
const dir = priv + '/ui-config/runtime14', lp = dir.replace('//wsl.localhost/Debian', ''), oldLeaf = 'consumer12-promoted20-resume141-01.json', oldBytes = fs.readFileSync(dir + '/' + oldLeaf); assert.equal(sha(oldBytes), '45abf2ebc598e82856faf3bd3d29b75cf78d30afc4d3f7d1f308fb396b78ed96');
const closure = JSON.parse(oldBytes); for (const e of closure.files) assert.equal(sha(fs.readFileSync(root + '/' + prefix + e.relativeFile)), e.rawBytesSha256);
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifest = { file: lr + '/' + rel + '/manifest36-02.json', rawBytesSha256: sha(raw) }; closure.promotionReceipt = { file: lr + '/' + receiptPath, rawBytesSha256: sha(rb) };
const leaf = 'consumer12-promoted20-role143-01.json', cb = Buffer.from(JSON.stringify(closure, null, 2) + '\n'); fs.writeFileSync(dir + '/' + leaf, cb, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ products: 1, newClosure: { file: lp + '/' + leaf, rawBytesSha256: sha(cb) }, successfulCreateReplayed: false, UIExecuted: false }));
