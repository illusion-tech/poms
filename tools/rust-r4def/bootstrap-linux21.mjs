// New public acceptance checkout; borrow only an unchanged public Linux dependency cache.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const root = '/home/wangzishi/projects/poms-rust-r4def';
const dependencyRoot = '/home/wangzishi/projects/poms-rust-r4abc';
const base = '756d813c9578090fcf8e56821acce01b46b40420';
const gate = JSON.parse(fs.readFileSync(win + '/docs/design/rust-r4def/g1-gate-authority07.json')); assert(gate.G1Certified && gate.G2Authorized);
const edition = process.argv[2] ?? '21'; assert(/^\d+$/.test(edition));
const out = win + '/tmp/rust-r4def/root/linux-bootstrap' + edition; fs.mkdirSync(out, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
for (const file of ['package.json', 'pnpm-lock.yaml']) assert.equal(hash(fs.readFileSync(win + '/' + file)), hash(fs.readFileSync(dependencyRoot + '/' + file)), 'Only identical public dependency inputs may be reused');
function run(name, args, cwd) {
    const r = spawnSync('git', args, { cwd, encoding: null, timeout: 120000, maxBuffer: 16000000 });
    fs.writeFileSync(`${out}/${name}-stdout-original.bin`, r.stdout ?? Buffer.alloc(0)); fs.writeFileSync(`${out}/${name}-stderr-original.bin`, r.stderr ?? Buffer.alloc(0)); assert.equal(r.status, 0, name);
}
if (!fs.existsSync(root)) {
    run('clone', ['clone', '--shared', '--no-checkout', '/mnt/e/projects/poms', root], '/home/wangzishi/projects');
    run('lf', ['config', 'core.autocrlf', 'false'], root); run('checkout', ['checkout', '--detach', base], root);
    run('remote', ['remote', 'set-url', 'origin', 'https://github.com/illusion-tech/poms.git'], root);
    fs.symlinkSync(dependencyRoot + '/node_modules', root + '/node_modules', 'dir');
    fs.writeFileSync(root + '/poms-r4def-public-checkout.json', JSON.stringify({ kind: 'R4-DEF-public-acceptance-checkout', base, nodeModules: dependencyRoot + '/node_modules', oldPrivateRead: false }) + '\n');
} else {
    const marker = JSON.parse(fs.readFileSync(root + '/poms-r4def-public-checkout.json')); assert.equal(marker.base, base); assert.equal(marker.kind, 'R4-DEF-public-acceptance-checkout');
}
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), base);
// Windows worktree .git pointers contain drive paths; enumerate with native Git
// before crossing into WSL rather than asking Linux Git to reinterpret them.
const transfer = JSON.parse(fs.readFileSync(win + '/tmp/rust-r4def/root/linux-source-list' + edition + '.json', 'utf8'));
assert.equal(transfer.base, base);
const prefixes = ['apps/poms-api/', 'apps/poms-api-rust/', 'apps/poms-admin/', 'libs/admin/', 'libs/api/contracts/', 'libs/shared/contracts/', 'libs/shared/api-spec/', 'libs/shared/api-client/', 'tools/openapi/', 'tools/rust-r4def/', 'docs/design/rust-r4def/'];
const files = transfer.files.filter(file => prefixes.some(prefix => file.startsWith(prefix)));
const sources = [];
for (const file of files) {
    assert(!path.isAbsolute(file) && !file.split('/').includes('..')); const from = win + '/' + file; assert(fs.lstatSync(from).isFile());
    const bytes = fs.readFileSync(from), sha256 = hash(bytes), to = root + '/' + file; fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, bytes);
    assert.equal(hash(fs.readFileSync(to)), sha256); assert.equal(hash(fs.readFileSync(from)), sha256, 'Source changed during copy'); sources.push({ file, bytes: bytes.length, rawBytesSha256: sha256 });
}
fs.writeFileSync(out + '/receipt21.json', JSON.stringify({ kind: 'R4-DEF-public-acceptance-copy', base, root, sources, oldPrivateRead: false, dependencyLockUnchanged: true, runtimeAccepted: false }, null, 2) + '\n');
console.log(JSON.stringify({ root, copied: sources.length, oldPrivateRead: false, dependencyCacheOnly: true }));
