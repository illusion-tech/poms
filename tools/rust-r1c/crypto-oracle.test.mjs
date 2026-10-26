import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tool = 'tools/rust-r1c/crypto-oracle.mjs';
const goldenPath = 'tools/rust-r1c/crypto-golden.json';
const golden = JSON.parse(fs.readFileSync(path.join(root, goldenPath), 'utf8'));
const env = Object.fromEntries(['PATH', 'SystemRoot', 'TEMP', 'TMP', 'HOME', 'USERPROFILE'].filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
const run = (cwd, args) => execFileSync(process.execPath, [tool, ...args], { cwd, env, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

test('check never refreshes golden; private paths and invalid modes are rejected', () => {
    const file = path.join(root, goldenPath),
        before = fs.readFileSync(file),
        mtime = fs.statSync(file).mtimeMs;
    assert.match(run(root, ['--check']), /"status":"ok"/);
    assert.deepEqual(fs.readFileSync(file), before);
    assert.equal(fs.statSync(file).mtimeMs, mtime);
    assert.throws(() => run(root, ['--invalid']), /Usage/);
    assert.throws(() => run(root, ['--verify-rust', path.join(root, 'deploy/private/synthetic-missing-file')]), /Protected path/);
    assert.throws(() => run(root, ['--verify-rust', path.join(root, '.env.synthetic-missing-file')]), /Protected path/);
    assert.deepEqual(fs.readFileSync(file), before);
    assert.equal(fs.statSync(file).mtimeMs, mtime);
});

test('actual CLI rejects both working drift and staged/working cancellation before check or write', (t) => {
    const temporary = fs.mkdtempSync(path.join(tmpdir(), 'poms-r1c-crypto-guard-'));
    assert(temporary.startsWith(path.resolve(tmpdir()) + path.sep));
    t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const git = (args, cwd = temporary) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init', '--quiet']);
    git(['config', 'core.autocrlf', 'false']);
    const common = git(['rev-parse', '--git-common-dir'], root).trim();
    fs.mkdirSync(path.join(temporary, '.git/objects/info'), { recursive: true });
    fs.writeFileSync(path.join(temporary, '.git/objects/info/alternates'), path.resolve(root, common, 'objects').replaceAll('\\', '/') + '\n');
    git(['read-tree', golden.provenance.sourceHead]);
    git(['update-ref', 'HEAD', golden.provenance.sourceHead]);
    for (const { file } of golden.provenance.sourceManifest) {
        fs.mkdirSync(path.dirname(path.join(temporary, file)), { recursive: true });
        fs.writeFileSync(path.join(temporary, file), git(['show', golden.provenance.sourceHead + ':' + file], root));
    }
    for (const file of [tool, goldenPath, 'tools/rust-r1c/crypto-cases.json']) {
        fs.mkdirSync(path.dirname(path.join(temporary, file)), { recursive: true });
        fs.copyFileSync(path.join(root, file), path.join(temporary, file));
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.match(run(temporary, ['--check']), /"status":"ok"/);
    const witness = path.join(temporary, goldenPath),
        before = fs.readFileSync(witness),
        mtime = fs.statSync(witness).mtimeMs;
    const input = golden.provenance.sourceManifest.find((x) => x.file.endsWith('secret-cipher.service.ts')).file;
    const source = path.join(temporary, input),
        original = fs.readFileSync(source, 'utf8');
    const refuse = () => {
        for (const mode of ['--check', '--write']) assert.throws(() => run(temporary, [mode]), /Frozen crypto source changed/);
        assert.deepEqual(fs.readFileSync(witness), before);
        assert.equal(fs.statSync(witness).mtimeMs, mtime);
    };
    fs.writeFileSync(source, original + '\n// public synthetic working drift\n');
    refuse();
    git(['add', '--', input]);
    fs.writeFileSync(source, original);
    assert.equal(git(['diff', '--name-only', golden.provenance.sourceHead, '--', input]).trim(), '');
    assert(git(['diff', '--cached', '--name-only', golden.provenance.sourceHead, '--', input]).includes(input));
    refuse();
});
