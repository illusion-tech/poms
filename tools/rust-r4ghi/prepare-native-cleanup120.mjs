import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', rel = 'tools/rust-r4ghi/I/implementation/native-targeted-cleanup92-02';
const author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms/' + rel, sha = b => createHash('sha256').update(b).digest('hex');
const dir = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/native-reference92/source12-native01', ld = dir.replace('//wsl.localhost/Debian', '');
const raw = fs.readFileSync(author + '/manifest92-02.json'); assert.equal(sha(raw), '7a7bc5641b2378869f10de21cedfd5416e9dc26e9975a817489e11de16b157ae'); const m = JSON.parse(raw);
for (const p of m.files) assert.equal(sha(fs.readFileSync(author + '/' + p.file)), p.rawBytesSha256);
assert.equal(m.product.beforeSHA256, null); assert(!fs.existsSync(root + '/' + m.product.file)); assert.equal(sha(fs.readFileSync(author + '/' + m.product.candidate)), m.product.afterSHA256);
assert(!fs.existsSync(dir + '/driver.lock')); assert(!fs.existsSync(dir + '/cleanup92-02'));
const stateBytes = fs.readFileSync(dir + '/state.json'); assert.equal(sha(stateBytes), 'f103aab760cd393c9350ce617cddfc9410db158db2ee2fe7328930e2d986b343');
for (const p of [...m.files, { file: 'manifest92-02.json' }]) { const dest = root + '/' + rel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(author + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
fs.copyFileSync(author + '/' + m.product.candidate, root + '/' + m.product.file, fs.constants.COPYFILE_EXCL);
const graph = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(f => /\.(mjs|json)$/.test(f)).sort().map(f => ({ file: 'tools/rust-r4ghi/business/' + f, rawBytesSha256: sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/' + f)) })); assert.equal(graph.length, 165);
const graphBytes = Buffer.from(JSON.stringify(graph, null, 2) + '\n'), graphLeaf = '/cleanup-current-graph92-02.json'; fs.writeFileSync(dir + graphLeaf, graphBytes, { flag: 'wx', mode: 0o600 });
const plan = JSON.parse(fs.readFileSync(author + '/plan-template92-02.json')); plan.currentGraph = { file: ld + graphLeaf, rawBytesSha256: sha(graphBytes) };
assert.equal(plan.originalState.rawBytesSha256, sha(stateBytes)); const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n'), leaf = '/cleanup-plan92-02.json'; fs.writeFileSync(dir + leaf, bytes, { flag: 'wx', mode: 0o600 });
fs.writeFileSync(root + '/docs/design/rust-r4ghi/native-cleanup120-tool-promotion.json', JSON.stringify({ kind: 'Root-exact-cookie-born-Native-cleanup92-02-tool-promotion', manifest: { file: rel + '/manifest92-02.json', rawBytesSha256: sha(raw) }, product: m.product,
  cleanupPlan: { file: ld + leaf, rawBytesSha256: sha(bytes) }, exactNewSessionOnly: plan.target.id, priorNative17NotRelabelled: true, JSONSessionIDClaimed: false, DELETEExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ newHelper: m.product.file, currentGraphMembers: graph.length, plan: { file: ld + leaf, rawBytesSha256: sha(bytes) }, DELETEExecuted: false, G3Certified: false }));
