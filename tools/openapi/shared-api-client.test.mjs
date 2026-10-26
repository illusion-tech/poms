// Filesystem/tool tests use an explicitly injected generator double.
// Real 7.20.0 execution is separately covered by the integration test.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertFrozenSources, loadBaseline, normalizeBytes, normalizePath, parseArguments, resolveJar, resolveJava, runClient, safeChild, sha256, treeManifest, validateFullSpecification, walkTree, workspaceRoot } from './shared-api-client.mjs';

const baseline = loadBaseline();
const oracle = JSON.parse(readFileSync(path.join(workspaceRoot, 'tools/openapi/normalization-oracle.json'), 'utf8'));
assert.equal(oracle.provenance.sourceSha256, baseline.legacyNormalizer.sha256);
assert.equal(oracle.provenance.captureToolSha256, sha256(readFileSync(path.join(workspaceRoot, 'tools/openapi/capture-normalization-oracle.mjs'), 'utf8').replace(/\r\n/g, '\n')));
const java = resolveJava().executable;

for (const observation of oracle.cases) {
    test(`actual old PS oracle: ${observation.name}`, () => {
        const input = Buffer.from(observation.inputBase64, 'base64');
        const result = normalizeBytes(input);
        assert.equal(result.bytes.toString('base64'), observation.outputBase64);
        assert.equal(result.changed, observation.rewritten);
        assert.equal(input.toString('base64'), observation.inputBase64, 'Normalization must not mutate source bytes');
    });
}

const generated = {
    '.gitignore': 'node_modules \r\n',
    'api/service.ts': 'export const synthetic = true; \t\r\n\r\n',
    '.openapi-generator/FILES': '.gitignore\napi/service.ts\n',
    '.openapi-generator/VERSION': '7.20.0\n'
};

function write(root, relative, bytes) {
    const target = path.join(root, ...relative.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
}
function fakeGenerate({ directory }) {
    for (const [file, text] of Object.entries(generated)) write(directory, file, text);
    return { kind: 'explicit-unit-generator-double' };
}
function fixture() {
    const root = mkdtempSync(path.join(tmpdir(), 'poms-client-unit-空 格-'));
    for (const entry of baseline.protectedSources) {
        const target = path.join(root, entry.file);
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(path.join(workspaceRoot, entry.file), target);
    }
    const target = path.join(root, baseline.client.directory);
    mkdirSync(target, { recursive: true });
    for (const file of baseline.client.metadata) copyFileSync(path.join(workspaceRoot, baseline.client.directory, file), path.join(target, file));
    for (const [file, text] of Object.entries(generated)) write(target, file, normalizeBytes(Buffer.from(text)).bytes);
    const git = (args) => execFileSync('git', ['-c', 'core.hooksPath=disabled-hooks', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git(['init', '-q']);
    git(['add', '--', ...baseline.protectedSources.map((entry) => entry.file)]);
    git(['-c', 'user.name=Client tool fixture', '-c', 'user.email=client-fixture@example.invalid', 'commit', '-q', '--no-verify', '-m', 'Fixture baseline']);
    const input = structuredClone(baseline);
    input.sourceHead = git(['rev-parse', 'HEAD']);
    const jar = path.join(root, 'fixture.jar');
    writeFileSync(jar, 'Explicit unit fixture, not a Java generator');
    input.generator.jarSha256 = sha256(readFileSync(jar));
    return {
        root,
        target,
        jar,
        baseline: input,
        git,
        run: (options = {}) => runClient({ root, baseline: input, jar, java, generate: fakeGenerate, ...options }),
        close() {
            assert(path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith('poms-client-unit-'));
            rmSync(root, { recursive: true });
        }
    };
}
function usingFixture(action) {
    const value = fixture();
    try {
        return action(value);
    } finally {
        value.close();
    }
}

test('normalization writes only changed files, preserving byte and timestamp behavior', () =>
    usingFixture(({ root }) => {
        const directory = path.join(root, 'normalization');
        mkdirSync(directory);
        for (const observation of oracle.cases) {
            const file = path.join(directory, `${observation.name}.txt`);
            writeFileSync(file, Buffer.from(observation.inputBase64, 'base64'));
            utimesSync(file, 1514764800, 1514764800);
        }
        const before = treeManifest(directory, { timestamps: true });
        normalizePath(directory);
        for (const observation of oracle.cases) {
            const file = path.join(directory, `${observation.name}.txt`);
            assert.equal(readFileSync(file).toString('base64'), observation.outputBase64);
            assert.equal(statSync(file, { bigint: true }).mtimeNs.toString() !== before.find((entry) => entry.file === `${observation.name}.txt`).mtimeNs, observation.rewritten);
        }
    }));

test('full specification and fixed arguments accept only their reviewed surface', () => {
    const document = JSON.parse(readFileSync(path.join(workspaceRoot, baseline.spec.file), 'utf8'));
    validateFullSpecification(document, baseline);
    const subset = structuredClone(document);
    subset.paths = Object.fromEntries(Object.entries(document.paths).slice(0, 7));
    assert.throws(() => validateFullSpecification(subset, baseline), /Full path coverage/);
    const duplicate = structuredClone(document);
    const operations = Object.values(duplicate.paths).flatMap((entry) => Object.values(entry).filter((value) => value?.operationId));
    operations[1].operationId = operations[0].operationId;
    assert.throws(() => validateFullSpecification(duplicate, baseline), /Duplicate operationIds/);
    const remote = structuredClone(document);
    Object.values(remote.components.schemas)[0].$ref = 'https://example.invalid/schema';
    assert.throws(() => validateFullSpecification(remote, baseline), /Only local references/);
    for (const args of [['--input-spec', 'subset.json'], ['--output', '../outside'], ['--check', '--write'], ['--jar'], ['--normalize'], ['--normalize', '.', '--jar', 'file'], ['--java-info', '--jar', 'file']])
        assert.throws(() => parseArguments(args));
    assert.deepEqual(parseArguments([]), { mode: '--check' });
    assert.deepEqual(parseArguments(['--write', '--jar', 'a path.jar']), { mode: '--write', jar: 'a path.jar' });
});

test('check compares hidden files and preserves every target byte and mtime', () =>
    usingFixture((value) => {
        const before = treeManifest(value.target, { timestamps: true });
        const result = value.run();
        assert.equal(result.result, 'pass');
        assert.equal(result.clientWritten, false);
        assert(result.files.some((entry) => entry.file === '.gitignore'));
        assert.deepEqual(treeManifest(value.target, { timestamps: true }), before);
        assert(!existsSync(result.temporaryDirectory));
    }));

for (const kind of ['content', 'missing', 'extra', 'hidden-extra']) {
    test(`check fails without target writes for ${kind}`, () =>
        usingFixture((value) => {
            const file = path.join(value.target, 'api/service.ts');
            if (kind === 'content') writeFileSync(file, 'changed product content\n');
            if (kind === 'missing') unlinkSync(file);
            if (kind === 'extra') writeFileSync(path.join(value.target, 'extra.ts'), 'extra\n');
            if (kind === 'hidden-extra') writeFileSync(path.join(value.target, '.extra'), 'extra\n');
            const before = treeManifest(value.target, { timestamps: true });
            const result = value.run();
            assert.equal(result.result, 'different');
            assert.equal(result.differences.length, 1);
            assert.deepEqual(treeManifest(value.target, { timestamps: true }), before);
        }));
}

test('write mirrors validated output and preserves all metadata bytes', () =>
    usingFixture((value) => {
        writeFileSync(path.join(value.target, 'api/service.ts'), 'changed\n');
        writeFileSync(path.join(value.target, 'obsolete.ts'), 'obsolete\n');
        const metadata = value.baseline.client.metadata.map((file) => ({ file, bytes: readFileSync(path.join(value.target, file)) }));
        const result = value.run({ mode: '--write' });
        assert.equal(result.result, 'pass');
        assert(!existsSync(path.join(value.target, 'obsolete.ts')));
        for (const entry of metadata) assert(readFileSync(path.join(value.target, entry.file)).equals(entry.bytes));
        assert.equal(value.run().result, 'pass');
    }));

test('generator failure never synchronizes a partially generated tree', () =>
    usingFixture((value) => {
        const before = treeManifest(value.target, { timestamps: true });
        let directory;
        assert.throws(
            () =>
                value.run({
                    mode: '--write',
                    generate: (options) => {
                        directory = options.directory;
                        write(directory, 'partial.ts', 'partial');
                        throw new Error('Synthetic generator failure');
                    }
                }),
            /Synthetic generator failure/
        );
        assert.deepEqual(treeManifest(value.target, { timestamps: true }), before);
        assert(!existsSync(directory));
    }));

test('missing or wrong JAR is rejected before generator or target mutation', () =>
    usingFixture((value) => {
        let called = false;
        const generate = () => {
            called = true;
        };
        assert.throws(() => value.run({ jar: path.join(value.root, 'missing.jar'), generate }), /JAR is missing/);
        writeFileSync(value.jar, 'unreviewed jar');
        assert.throws(() => value.run({ generate }), /JAR fingerprint/);
        assert.equal(called, false);
    }));

test('source changes in worktree or during generation fail before synchronization', () =>
    usingFixture((value) => {
        const file = path.join(value.root, 'package.json');
        const original = readFileSync(file);
        const before = treeManifest(value.target, { timestamps: true });
        writeFileSync(file, Buffer.concat([original, Buffer.from('\n')]));
        assert.throws(() => value.run(), /Frozen generator input/);
        writeFileSync(file, original);
        assert.throws(
            () =>
                value.run({
                    mode: '--write',
                    generate: (options) => {
                        fakeGenerate(options);
                        writeFileSync(file, Buffer.concat([original, Buffer.from('\n')]));
                    }
                }),
            /Frozen generator input/
        );
        assert.deepEqual(treeManifest(value.target, { timestamps: true }), before);
    }));

test('index changes cannot be hidden by restoring the working tree to baseline', () =>
    usingFixture((value) => {
        const file = path.join(value.root, 'package.json');
        const original = readFileSync(file);
        writeFileSync(file, Buffer.concat([original, Buffer.from('\n')]));
        value.git(['add', '--', 'package.json']);
        writeFileSync(file, original);
        assert.equal(value.git(['diff', '--name-only', value.baseline.sourceHead, '--', 'package.json']), '');
        assert.equal(value.git(['diff', '--cached', '--name-only', value.baseline.sourceHead, '--', 'package.json']), 'package.json');
        assert.throws(() => assertFrozenSources(value.root, value.baseline), /Frozen generator input/);
    }));

test('untracked protected source is rejected even with a matching content hash', () =>
    usingFixture((value) => {
        writeFileSync(path.join(value.root, 'untracked-input.txt'), 'untracked');
        value.baseline.protectedSources.push({ file: 'untracked-input.txt', sha256: sha256('untracked') });
        assert.throws(() => assertFrozenSources(value.root, value.baseline), /Frozen generator input/);
    }));

test('metadata changes during generation fail before writing generated files', () =>
    usingFixture((value) => {
        const file = path.join(value.target, 'project.json');
        assert.throws(
            () =>
                value.run({
                    mode: '--write',
                    generate: (options) => {
                        fakeGenerate(options);
                        writeFileSync(file, 'changed concurrently');
                    }
                }),
            /metadata changed during generation/
        );
        assert.equal(readFileSync(path.join(value.target, 'api/service.ts'), 'utf8'), normalizeBytes(Buffer.from(generated['api/service.ts'])).bytes.toString('utf8'));
    }));

test('unsafe generated paths, file-list omissions and links are rejected', () =>
    usingFixture((value) => {
        for (const file of ['../outside', 'api/../../outside', '/outside', 'C:/outside', 'api\\outside', 'api//outside']) assert.throws(() => safeChild(value.target, file, { allowMissing: true }));
        assert.throws(
            () =>
                value.run({
                    generate: (options) => {
                        fakeGenerate(options);
                        write(options.directory, 'not-listed.ts', 'unlisted');
                    }
                }),
            /complete tree/
        );
        const marker = path.join(value.root, 'outside-marker');
        mkdirSync(marker);
        writeFileSync(path.join(marker, 'keep.txt'), 'keep');
        symlinkSync(marker, path.join(value.target, 'outside'), process.platform === 'win32' ? 'junction' : 'dir');
        assert.throws(() => walkTree(value.target), /Symbolic links/);
        assert.equal(readFileSync(path.join(marker, 'keep.txt'), 'utf8'), 'keep');
        symlinkSync(path.join(value.root, 'does-not-exist'), path.join(value.root, 'dangling'), process.platform === 'win32' ? 'junction' : 'dir');
        assert.throws(() => safeChild(value.root, 'dangling/file.txt', { allowMissing: true }), /Symbolic links/);
    }));

test('separate checks use unique temporary directories even under one temporary parent', () =>
    usingFixture((value) => {
        const directories = [];
        const generate = (options) => {
            directories.push(options.directory);
            return fakeGenerate(options);
        };
        value.run({ generate });
        value.run({ generate });
        assert.equal(new Set(directories).size, 2);
        assert(directories.every((directory) => !existsSync(directory)));
    }));

test('invalid explicit Java and missing JAVA_HOME cannot silently fall back', () => {
    assert.throws(() => resolveJava({ executable: 'relative-java' }), /absolute path/);
    assert.throws(() => resolveJava({ env: { JAVA_HOME: path.join(tmpdir(), 'poms-no-such-jdk') } }), /Java 17/);
    assert.throws(() => resolveJava({ executable: process.execPath }), /Java version probe/);
    assert.throws(() => resolveJar(workspaceRoot, baseline, { jar: 'missing.jar', env: {} }), /JAR is missing/);
});
