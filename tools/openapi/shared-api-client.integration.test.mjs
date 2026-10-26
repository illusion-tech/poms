// Real fixed-JAR checks. These tests never invoke --write on the repository.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadBaseline, resolveJar, resolveJava, treeManifest, workspaceRoot } from './shared-api-client.mjs';

const baseline = loadBaseline();
const java = resolveJava();
const jar = resolveJar(workspaceRoot, baseline);
const target = path.join(workspaceRoot, baseline.client.directory);
const entry = path.join(workspaceRoot, 'tools/openapi/shared-api-client.mjs');
function command(executable, args) {
    return new Promise((resolve) => {
        execFile(executable, args, { cwd: workspaceRoot, env: process.env, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }));
    });
}

test('two concurrent actual 7.20.0 checks agree on all files and preserve the target', async (context) => {
    const before = treeManifest(target, { timestamps: true });
    const args = [entry, '--check', '--java', java.executable, '--jar', jar];
    const executions = await Promise.all([command(process.execPath, args), command(process.execPath, args)]);
    for (const execution of executions) assert.equal(execution.code, 0, execution.stderr);
    const results = executions.map((execution) => JSON.parse(execution.stdout));
    for (const result of results) {
        assert.equal(result.result, 'pass');
        assert.equal(result.clientFiles, 579);
        assert.equal(result.spec.operations, 291);
        assert.equal(result.spec.schemas, 585);
        assert.equal(result.generator.jarSha256, baseline.generator.jarSha256);
        assert.equal(result.clientWritten, false);
        assert.deepEqual(result.differences, []);
        assert(!existsSync(result.temporaryDirectory));
    }
    assert.notEqual(results[0].temporaryDirectory, results[1].temporaryDirectory);
    assert.deepEqual(results[0].files, results[1].files);
    assert.deepEqual(treeManifest(target, { timestamps: true }), before);
    context.diagnostic(
        JSON.stringify({
            platform: process.platform,
            node: process.versions.node,
            java: java.version,
            generator: baseline.generator.version,
            files: results[0].clientFiles,
            manifestSha256: results[0].manifestSha256,
            clientWritten: false,
            concurrentUniqueDirectories: true
        })
    );
});

test('actual CLI rejects arbitrary Rust subset/output overrides before any client write', async () => {
    const before = treeManifest(target, { timestamps: true });
    for (const args of [
        ['--input-spec', 'tools/rust-r1c/http-openapi.json'],
        ['--write', '--input-spec', 'tools/rust-r1c/http-openapi.json'],
        ['--output', '../outside']
    ]) {
        const result = await command(process.execPath, [entry, ...args]);
        assert.notEqual(result.code, 0);
        assert.equal(JSON.parse(result.stderr).result, 'failed');
        assert.match(JSON.parse(result.stderr).message, /overrides are forbidden/);
    }
    assert.deepEqual(treeManifest(target, { timestamps: true }), before);
});

// Windows compatibility adapters are intentionally not part of Linux's matrix.
// Linux executes the same Node core and consumes the recorded old PS byte oracle.
if (process.platform === 'win32') {
    const powershell = path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
    test('old PowerShell check entry delegates to the same full-client implementation', async () => {
        const before = treeManifest(target, { timestamps: true });
        const result = await command(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(workspaceRoot, 'tools/openapi/check-shared-api-client.ps1'), '--java', java.executable, '--jar', jar]);
        assert.equal(result.code, 0, result.stderr);
        const report = JSON.parse(result.stdout);
        assert.equal(report.clientFiles, 579);
        assert.equal(report.clientWritten, false);
        assert.deepEqual(report.differences, []);
        assert.deepEqual(treeManifest(target, { timestamps: true }), before);
    });
    test('old PowerShell normalization entry delegates without changing BOM compatibility', async () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'poms-client-ps-adapter-'));
        try {
            const file = path.join(directory, 'space 中文.txt');
            writeFileSync(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('中文 \r\n\r\n')]));
            const result = await command(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(workspaceRoot, 'tools/openapi/normalize-line-endings.ps1'), '-Path', file]);
            assert.equal(result.code, 0, result.stderr);
            assert.equal(readFileSync(file, 'utf8'), '中文\n');
        } finally {
            assert(path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith('poms-client-ps-adapter-'));
            rmSync(directory, { recursive: true });
        }
    });
}
