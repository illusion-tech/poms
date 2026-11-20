import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', A = 'E:/projects/worktrees/poms-r4h-signals/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/', sha = value => createHash('sha256').update(value).digest('hex');
const specs = [['labor-masking47', 'manifest47.json', '18e76c900d7471dd0113c4d6814dd82272e74b61ad8b3cb1104b3631a6571ba7'], ['labor-masking47-02', 'manifest47-02.json', '2856011e1d23eb863574a11d4f7677fbd398bf35ee59cf155063ef6f2cd5ddcb'], ['labor-masking47-03', 'manifest47-03.json', '86d7aa3f315c68a4297010cac6f949310803b6042f5f561b7cba9a4fa1536704']];
const packs = specs.map(([name, leaf, digest]) => { const rel = prefix + name, dir = A + '/' + rel, raw = fs.readFileSync(dir + '/' + leaf); assert.equal(sha(raw), digest); const m = JSON.parse(raw); for (const p of m.files) assert.equal(sha(fs.readFileSync(dir + '/' + p.file)), p.rawBytesSha256); return { rel, dir, leaf, digest, m }; });
const final = new Map();
for (const pack of packs) for (const p of pack.m.products) { const previous = final.get(p.file); if (previous) assert.equal(previous.p.afterSHA256, p.beforeSHA256); else assert.equal(p.beforeSHA256, null); assert.equal(sha(fs.readFileSync(pack.dir + '/' + p.candidate)), p.afterSHA256); final.set(p.file, { pack, p }); }
assert.equal(final.size, 2); for (const [file] of final) assert(!fs.existsSync(R + '/' + file));
for (const pack of packs) for (const p of [...pack.m.files, { file: pack.leaf }]) { const file = R + '/' + pack.rel + '/' + p.file, raw = fs.readFileSync(pack.dir + '/' + p.file); fs.mkdirSync(path.dirname(file), { recursive: true }); if (fs.existsSync(file)) assert.deepEqual(fs.readFileSync(file), raw); else fs.writeFileSync(file, raw, { flag: 'wx' }); }
for (const [file, { pack, p }] of final) fs.copyFileSync(pack.dir + '/' + p.candidate, R + '/' + file, fs.constants.COPYFILE_EXCL);
const products = [...final].map(([file, { p }]) => ({ file, beforeSHA256: null, afterSHA256: p.afterSHA256 })), output = { kind: 'Root-final-two-product-Labor47-through03-union184', manifests: packs.map(pack => ({ file: pack.rel + '/' + pack.leaf, rawBytesSha256: pack.digest })), products,
  P2OriginalsPreserved: true, Source13StateMinted: false, M98Executed: false, runtimeTemplateFilled: false, rolePermissionsGranted: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false };
const file = R + '/docs/design/rust-r4ghi/labor184-final-union.json', raw = Buffer.from(JSON.stringify(output, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx' }); console.log(JSON.stringify({ products, union: { file, rawBytesSha256: sha(raw) }, helperCount: fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length }));
