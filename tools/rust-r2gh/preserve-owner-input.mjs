import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
const file = process.argv[2];
assert.equal(process.argv.length, 3);
assert.equal(process.platform, 'linux');
const raw = readFileSync(file),
    receipt = JSON.parse(raw),
    root = process.cwd(),
    sha = (value) => createHash('sha256').update(value).digest('hex');
assert(['nest', 'rust'].includes(receipt.backend));
assert(/^[a-z0-9-]{1,35}$/.test(receipt.tag));
process.kill(receipt.pid, 0);
const directory = path.resolve('tmp/rust-r2gh/runtime-input', receipt.backend + '-' + receipt.tag);
assert(!existsSync(directory));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const manifest = [];
for (const source of receipt.sourceFiles) {
    assert(typeof source.file === 'string' && !path.isAbsolute(source.file) && !source.file.split(/[\\/]/).includes('..'));
    const resolved = path.resolve(source.file);
    assert(resolved.startsWith(root + path.sep));
    assert(lstatSync(resolved).isFile() && !lstatSync(resolved).isSymbolicLink());
    const bytes = readFileSync(resolved);
    assert.equal(sha(bytes), source.sha256);
    const output = path.join(directory, 'sources', source.file);
    mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
    writeFileSync(output, bytes, { flag: 'wx', mode: 0o600 });
    manifest.push({ source: source.file, snapshot: path.relative(root, output), bytes: bytes.length, rawBytesSha256: sha(bytes) });
}
const binary = readFileSync(receipt.binary);
assert.equal(sha(binary), receipt.binarySha256);
const binaryPath = path.join(directory, receipt.backend === 'nest' ? 'original-nest-main.js' : 'poms-api-rust');
writeFileSync(binaryPath, binary, { flag: 'wx', mode: receipt.backend === 'nest' ? 0o600 : 0o700 });
const report = {
    formatVersion: 1,
    kind: 'immutable-runtime-owner-source-input',
    receiptFile: file,
    receiptSha256: sha(raw),
    backend: receipt.backend,
    tag: receipt.tag,
    capturedAt: new Date().toISOString(),
    manifest,
    manifestSha256: sha(JSON.stringify(manifest)),
    binary: { source: receipt.binary, snapshot: path.relative(root, binaryPath), bytes: binary.length, rawBytesSha256: sha(binary) },
    result: 'pass'
};
writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ result: report.result, backend: receipt.backend, files: manifest.length, binaryBytes: binary.length, manifest: path.relative(root, path.join(directory, 'manifest.json')) }));
