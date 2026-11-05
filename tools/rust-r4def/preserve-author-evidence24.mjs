// Preserve bounded author-owned pure-check originals, including failed attempts.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sources = [
    ['E:/projects/worktrees/poms-r4e-cost-base/poms', 'tools/rust-r4def/E/evidence'],
    ['E:/projects/worktrees/poms-r4f-cost-governance/poms', 'tools/rust-r4def/F/build'],
];
const files = [];
for (const [root, folder] of sources) {
    if (!fs.existsSync(root + '/' + folder)) continue;
    function walk(relative) {
        for (const entry of fs.readdirSync(root + '/' + relative, { withFileTypes: true })) {
            const file = relative + '/' + entry.name; assert(!entry.isSymbolicLink(), 'No cross-scope evidence link');
            if (entry.isDirectory()) walk(file); else if (entry.isFile()) files.push({ root, file, bytes: fs.statSync(root + '/' + file).size });
        }
    } walk(folder);
}
assert(files.reduce((n, p) => n + p.bytes, 0) < 128 * 1024 * 1024, 'Review unexpected evidence size before copying');
for (const p of files) {
    const raw = fs.readFileSync(p.root + '/' + p.file), sha256 = createHash('sha256').update(raw).digest('hex');
    fs.mkdirSync(path.dirname(p.file), { recursive: true });
    if (fs.existsSync(p.file)) assert(fs.readFileSync(p.file).equals(raw), `Do not overwrite evidence ${p.file}`); else fs.writeFileSync(p.file, raw, { flag: 'wx' });
    p.rawBytesSha256 = sha256;
}
fs.mkdirSync('tmp/rust-r4def/root/author-evidence24', { recursive: true });
fs.writeFileSync('tmp/rust-r4def/root/author-evidence24/receipt24.json', JSON.stringify({ files, preservedFailures: true, runtimeAccepted: false }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, bytes: files.reduce((n, p) => n + p.bytes, 0), runtimeAccepted: false }));
