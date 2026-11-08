import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', sha = b => createHash('sha256').update(b).digest('hex');
const iRel = 'tools/rust-r4ghi/I/implementation/business-frozen-reparent58-03', hRel = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/role-draft36';
const configurations = [{ rel: iRel, author: 'E:/projects/worktrees/poms-r4i-lifecycle/poms', leaf: 'manifest58-03.json', expected: 'ba3bbe79af2d305dba036c353071811f0c3210d406470cc508492e187b1204b9', type: 'I' },
  { rel: hRel, author: 'E:/projects/worktrees/poms-r4h-signals/poms', leaf: 'manifest36.json', expected: 'd72736c95ff2e515563c0a45388baad9cfcaf2df7737302f148eed48f0d1e86e', type: 'H' }];
const stateDir = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01', uiDir = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
assert(!fs.existsSync(stateDir + '/driver.lock')); assert.equal(sha(fs.readFileSync(stateDir + '/state.json')), '6aff8ae1bc2dc2b2ec69e52b42862cf3e20b732982ffa952f53f5049969c1915');
const packages = configurations.map(c => { const dir = c.author + '/' + c.rel, raw = fs.readFileSync(dir + '/' + c.leaf); assert.equal(sha(raw), c.expected); const m = JSON.parse(raw);
  const list = c.type === 'I' ? m.candidates.map(p => ({ file: p.target, candidate: p.candidate, beforeSHA256: p.beforeSHA256, afterSHA256: p.afterSHA256 })) : m.products;
  const pins = c.type === 'I' ? [...m.sidecars, ...m.candidates.flatMap(p => [{ file: p.candidate, rawBytesSha256: p.afterSHA256 }, ...(p.before ? [{ file: p.before, rawBytesSha256: p.beforeSHA256 }] : [])])] : m.files;
  for (const p of pins) assert.equal(sha(fs.readFileSync(dir + '/' + p.file)), p.rawBytesSha256);
  for (const p of list) { if (p.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + p.file)); else assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); }
  return { ...c, dir, raw, m, list, pins }; });
const backup = root + '/tools/rust-r4ghi/checkpoints/resume141'; fs.mkdirSync(backup, { recursive: true });
for (const x of packages) { for (const p of x.list.filter(p => p.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + p.file, backup + '/' + path.basename(p.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
  for (const p of [...x.pins, { file: x.leaf }]) { const dest = root + '/' + x.rel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(x.dir + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
  for (const p of x.list) fs.copyFileSync(x.dir + '/' + p.candidate, root + '/' + p.file); }
const helperPins = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(f => /\.(mjs|json)$/.test(f)).sort().map(f => ({ file: 'tools/rust-r4ghi/business/' + f, sha256: sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/' + f)) })); assert.equal(helperPins.length, 170);
const graphBytes = Buffer.from(JSON.stringify(helperPins, null, 2) + '\n'), graphLeaf = 'role02-resume58-03-helper141.json'; fs.writeFileSync(uiDir + '/' + graphLeaf, graphBytes, { flag: 'wx', mode: 0o600 });
const lp = uiDir.replace('//wsl.localhost/Debian', ''), plan = JSON.parse(fs.readFileSync(root + '/' + iRel + '/plan-template58-03.json')); plan.currentHelperGraph = { file: lp + '/' + graphLeaf, rawBytesSha256: sha(graphBytes) };
const planBytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n'), planLeaf = 'role02-resume58-03-plan141.json'; fs.writeFileSync(uiDir + '/' + planLeaf, planBytes, { flag: 'wx', mode: 0o600 });
const receiptPath = 'docs/design/rust-r4ghi/resume141-tool-promotion.json', receipt = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-Role02-case1-preserving-probe-and-draft-freeze-continuation141',
  manifests: packages.map(x => ({ file: x.rel + '/' + x.leaf, rawBytesSha256: x.expected })), products: packages.flatMap(x => x.list), newBusinessHelpers: helperPins.length,
  stateBeforeUnchangedSHA256: '6aff8ae1bc2dc2b2ec69e52b42862cf3e20b732982ffa952f53f5049969c1915', resumePlan: { file: lp + '/' + planLeaf, rawBytesSha256: sha(planBytes) },
  committedCreateReplayed: false, originalCompletedCase1Replayed: false, SQLOrHTTPExecutedByPromotion: false, originalRole02StillFailed: true, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(root + '/' + receiptPath, receipt, { flag: 'wx' });
const oldLeaf = 'consumer12-promoted20-ui137-01.json', oldBytes = fs.readFileSync(uiDir + '/' + oldLeaf); assert.equal(sha(oldBytes), '2be57ae2ff83f61972ea530dfa3c6e04a21a4525e5e8f3e76482e1ea8311f114'); const closure = JSON.parse(oldBytes), prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
for (const e of closure.files) assert.equal(sha(fs.readFileSync(root + '/' + prefix + e.relativeFile)), e.rawBytesSha256);
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifests = packages.map(x => ({ file: lr + '/' + x.rel + '/' + x.leaf, rawBytesSha256: x.expected })); closure.promotionReceipt = { file: lr + '/' + receiptPath, rawBytesSha256: sha(receipt) };
const cb = Buffer.from(JSON.stringify(closure, null, 2) + '\n'), closureLeaf = 'consumer12-promoted20-resume141-01.json'; fs.writeFileSync(uiDir + '/' + closureLeaf, cb, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ products: packages.flatMap(x => x.list).length, helperCount: helperPins.length, plan: { file: lp + '/' + planLeaf, rawBytesSha256: sha(planBytes) }, closure: { file: lp + '/' + closureLeaf, rawBytesSha256: sha(cb) }, resumedOrSQLExecuted: false }));
