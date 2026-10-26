import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sourceHead, validateSource } from './fixture-guard.mjs';
assert.equal(process.argv.length, 4);
const [kind, backend] = process.argv.slice(2);
assert(['http', 'concurrency', 'system'].includes(kind));
assert(['nest', 'rust'].includes(backend));
assert.equal(process.platform, 'linux');
const root = path.resolve(import.meta.dirname, '../..');
const artifact = kind === 'http' ? `http-linux-${backend}.json` : `${kind}-${backend}.json`;
const runner = { http: 'http-scenarios', concurrency: 'http-concurrency', system: 'system-role-scenarios' }[kind];
const output = path.join(root, 'tmp/rust-r2b/' + artifact.replace('.json', '-receipt.json'));
assert(!existsSync(output) && !existsSync(path.join(root, 'tmp/rust-r2b/' + artifact)));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
function files(directory) {
    return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? files(directory + '/' + entry.name) : entry.isFile() ? [directory + '/' + entry.name] : (assert.fail('Source links are not accepted'), [])
    );
}
const inputFiles = () =>
    files('apps/poms-api-rust/src')
        .concat(['apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock'])
        .sort()
        .map((file) => ({ file, sha256: digest(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')) }));
const binary = backend === 'rust' ? '/r2b-bin/poms-api-rust' : null;
if (binary) assert.equal(process.env.POMS_RUST_API_BINARY, binary);
validateSource();
const report = { formatVersion: 1, result: 'pending', backend, kind, sourceHead, startedAt: new Date().toISOString(), rustSources: inputFiles(), binarySha256: binary ? digest(readFileSync(binary)) : null };
try {
    const child = spawnSync(process.execPath, [path.join(root, `tools/rust-r2b/${runner}.mjs`), backend], { cwd: root, env: process.env, shell: false, windowsHide: true, stdio: 'inherit' });
    report.exitCode = child.status;
    assert.equal(child.status, 0);
    assert.deepEqual(inputFiles(), report.rustSources, 'Product sources changed during execution');
    if (binary) assert.equal(digest(readFileSync(binary)), report.binarySha256, 'Executable changed during execution');
    validateSource();
    const bytes = readFileSync(path.join(root, 'tmp/rust-r2b/' + artifact));
    report.artifact = { file: 'tmp/rust-r2b/' + artifact, sha256: digest(bytes) };
    report.result = 'pass';
} catch (error) {
    report.result = 'fail';
    report.failureReason = error.name;
    process.exitCode = 1;
} finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ receipt: report.result, kind, backend, binarySha256: report.binarySha256 }));
