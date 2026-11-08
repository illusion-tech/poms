import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', sha = value => createHash('sha256').update(value).digest('hex');
const files = ['tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/windows14.mjs', ...['role', 'expense', 'gh', 'lifecycle'].map(name => 'tools/rust-r4ghi/business/ui-' + name + '18-windows.mjs')], helper = 'tools/rust-r4ghi/business/ui-cookie-scope27.mjs', products = [];
for (const file of files) {
  const before = fs.readFileSync(root + '/' + file), from = '        return context;'; let after = before.toString('utf8'); assert.equal(after.split(from).length, 2);
  const imported = path.posix.relative(path.posix.dirname(file), helper), importPath = imported.startsWith('.') ? imported : './' + imported;
  after = `import { wrapCookieContext27 } from '${importPath}';\n` + after.replace(from, "        return wrapCookieContext27(context, { plan, binding, metadataFile: path.join(caseDirectory, 'cookie-metadata27.jsonl') });");
  const candidate = 'proposed/' + file; fs.mkdirSync(path.dirname(here + '/' + candidate), { recursive: true }); fs.writeFileSync(here + '/' + candidate, after, { flag: 'wx' });
  products.push({ file, beforeSHA256: sha(before), afterSHA256: sha(Buffer.from(after)), candidate });
}
for (const file of [helper, 'tools/rust-r4ghi/business/prepare-ui-cookie-scope27.mjs']) { assert(!fs.existsSync(root + '/' + file)); products.push({ file, beforeSHA256: null, afterSHA256: sha(fs.readFileSync(here + '/proposed/' + file)), candidate: 'proposed/' + file }); }
fs.writeFileSync(here + '/products27.json', JSON.stringify(products, null, 2) + '\n', { flag: 'wx' });
const receipts = ['006231', '006237', '006243', '006249'].map(id => { const file = root + '/tmp/rust-r4ghi/business/g2-business12/main01/' + id + '-http-http.json'; return { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms' + file.slice(root.length), rawBytesSha256: sha(fs.readFileSync(file)) }; });
const processFile = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/rust-api135-process.json';
fs.writeFileSync(here + '/cookie-source27-actual03-metadata-only.json', JSON.stringify({ apiProcess: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/rust-api135-process.json', rawBytesSha256: sha(fs.readFileSync(processFile)) }, authReceipts: receipts }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ products }));
