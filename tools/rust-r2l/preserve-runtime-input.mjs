// Immutable byte capture, called by Root before an owner run. No database,
// environment loader, process startup or runtime-success assertion.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { portableName } from './preserve-evidence.mjs';
import { assertFrozenSources } from '../openapi/shared-api-client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNTIME_ROOT = '/home/wangzishi/projects/poms-rust-r2l';
const S3 = '1a941e8047c6269b52ef4ae8174e5f450f1db2f6';
const MODULES = '/home/wangzishi/projects/poms-rust-r2d/node_modules';
const STATE_TARGET = '/home/wangzishi/.local/share/poms-r2l/target';
const NODE_SHA = 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12';
const require = createRequire(import.meta.url);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const forbidden = /(?:^|\/)(?:private|secrets|\.git|\.ssh|\.aws|[^/]*\.env(?:\.[^/]*)?|credentials(?:\.[^/]*)?|ROOT-CHECKPOINT(?:-[0-9]+)?\.md|[^/]*-password|id_rsa|id_ed25519|[^/]*\.(?:key|p12|pfx)|\.npmrc)(?:\/|$)/i;

function publicName(relative) {
    portableName(relative);
    assert(!forbidden.test(relative), 'Private/environment/internal-checkpoint input rejected');
    return relative;
}
function noLinks(file) {
    const parsed = path.parse(file); let current = parsed.root;
    for (const component of file.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
        current = path.join(current, component);
        assert(!fs.lstatSync(current).isSymbolicLink(), `Link/junction rejected: ${current}`);
    }
}
function regular(file, hashPinned = false) {
    noLinks(file); const stat = fs.lstatSync(file, { bigint: true });
    assert(stat.isFile() && !stat.isSymbolicLink(), 'Only regular files are captured');
    if (!hashPinned) assert.equal(stat.nlink, 1n, 'Unpinned hard-linked source rejected');
    return stat;
}
function sameStat(a, b) {
    return ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every((key) => a[key] === b[key]);
}
function readStable(file, hashPinned = false) {
    const before = regular(file, hashPinned), fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
        assert(sameStat(fs.fstatSync(fd, { bigint: true }), before));
        const bytes = fs.readFileSync(fd);
        assert.equal(BigInt(bytes.length), before.size);
        assert(sameStat(fs.fstatSync(fd, { bigint: true }), before));
        assert(sameStat(regular(file, hashPinned), before), 'Input changed while reading');
        return { bytes, stat: before };
    } finally { fs.closeSync(fd); }
}
function fingerprints(bytes) {
    const rawBytesSha256 = sha(bytes);
    if (!bytes.includes(0)) {
        try {
            const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
            return { rawBytesSha256, normalizedLfSha256: sha(Buffer.from(text.replace(/\r\n/g, '\n'))), lfRule: 'UTF8 CRLF-to-LF only' };
        } catch { /* Binary bytes retain their raw fingerprint. */ }
    }
    return { rawBytesSha256, normalizedLfSha256: rawBytesSha256, lfRule: 'binary unchanged' };
}
function git(args) {
    return execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
}
function directoryFiles(relative, optional = false) {
    publicName(relative); assert(!relative.split('/').includes('node_modules'));
    const absolute = path.join(ROOT, relative);
    if (optional && !fs.existsSync(absolute)) return [];
    noLinks(absolute); const stat = fs.lstatSync(absolute);
    if (stat.isFile()) return [relative];
    assert(stat.isDirectory());
    return fs.readdirSync(absolute).sort(compare).flatMap((name) => directoryFiles(`${relative}/${name}`));
}
function resolveRelativeModule(from, specifier) {
    if (!specifier.startsWith('.')) return null;
    const absolute = path.resolve(path.dirname(path.join(ROOT, from)), specifier);
    assert(inside(ROOT, absolute), 'Static module reference escaped source root');
    const candidates = [absolute, ...['.mjs', '.cjs', '.js', '.ts', '.json'].map((suffix) => absolute + suffix),
        ...['index.mjs', 'index.cjs', 'index.js', 'index.ts'].map((name) => path.join(absolute, name))];
    const found = candidates.find((file) => fs.existsSync(file) && fs.lstatSync(file).isFile());
    assert(found, `Unresolved static source dependency ${from} -> ${specifier}`);
    return publicName(path.relative(ROOT, found).split(path.sep).join('/'));
}
function staticToolClosure(initial) {
    const ts = require('typescript'), seen = new Set(), queue = [...initial];
    while (queue.length) {
        const file = queue.shift(); if (seen.has(file)) continue; seen.add(file);
        if (!/\.[cm]?[jt]s$/.test(file)) continue;
        const text = readStable(path.join(ROOT, file)).bytes.toString('utf8');
        const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        const visit = (node) => {
            let value;
            if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) value = node.moduleSpecifier.text;
            if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
                && node.arguments.length && ts.isStringLiteral(node.arguments[0])) value = node.arguments[0].text;
            if (value?.startsWith('.')) {
                const dependency = resolveRelativeModule(file, value);
                assert(!dependency.split('/').includes('node_modules')); queue.push(dependency);
            }
            ts.forEachChild(node, visit);
        };
        visit(ast);
    }
    return [...seen].sort(compare);
}

// Every literal Rust include is an input even when its target is outside the
// crate. Keep the whole byte target and recursively follow included Rust files.
// The actual all-target cargo run independently verifies this finite syntax.
function rustLiteralClosure(initial) {
    const seen = new Set(), queue = initial.filter((file) => file.endsWith('.rs')), targets = new Set();
    while (queue.length) {
        const file = queue.shift(); if (seen.has(file)) continue; seen.add(file);
        const source = readStable(path.join(ROOT, file)).bytes.toString('utf8');
        for (const match of source.matchAll(/\binclude(?:_str|_bytes)?!\s*\(\s*"([^"\r\n]+)"\s*\)/g)) {
            assert(!match[1].includes('\\'), 'Escaped Rust include needs explicit decoding');
            const absolute = path.resolve(ROOT, path.dirname(file), match[1]);
            assert(inside(ROOT, absolute), 'Rust include escaped repository');
            const target = publicName(path.relative(ROOT, absolute).split(path.sep).join('/'));
            regular(absolute); targets.add(target);
            if (target.endsWith('.rs')) queue.push(target);
        }
    }
    return [...targets].sort(compare);
}

/**
 * extraFiles: repo-relative file strings, or explicit objects
 * {file:absolutePath,snapshot:'artifacts/...|sdk/...',expectedSha256:64hex}.
 * External objects are limited to this batch's public target artifacts or
 * individually named old dependency source files, never directories.
 */
export async function captureRuntimeInput(tag, { extraFiles = [] } = {}) {
    assert.equal(process.platform, 'linux'); assert.equal(ROOT, RUNTIME_ROOT);
    assert(/^[a-z0-9-]{1,45}$/.test(tag)); assert(Array.isArray(extraFiles));
    assert.equal(process.version, 'v24.19.0');
    const nodeRead = readStable(process.execPath, true);
    assert.equal(sha(nodeRead.bytes), NODE_SHA);
    const currentHead = git(['rev-parse', 'HEAD']).toString().trim();
    git(['merge-base', '--is-ancestor', S3, currentHead]);
    const relativeOutput = `tmp/rust-r2l/runtime-input/${tag}`, output = path.join(ROOT, relativeOutput);
    assert(!fs.existsSync(output), 'Runtime-input tag already exists; keep old/partial evidence');
    const selected = new Map(), aliases = new Set();
    function add(file, snapshot, kind, expectedSha256) {
        file = path.resolve(file); publicName(path.relative(path.parse(file).root, file).split(path.sep).join('/'));
        publicName(snapshot); const alias = snapshot.normalize('NFC').toLowerCase();
        if (selected.has(snapshot)) {
            assert.equal(selected.get(snapshot).file, file, 'Snapshot identity collision');
            if (expectedSha256) {
                assert.equal(selected.get(snapshot).expectedSha256 ?? expectedSha256, expectedSha256);
                selected.get(snapshot).expectedSha256 = expectedSha256;
            }
            return;
        }
        assert(!aliases.has(alias), 'Case/Unicode snapshot alias rejected'); aliases.add(alias);
        regular(file, !!expectedSha256); selected.set(snapshot, { file, snapshot, kind, expectedSha256 });
    }
    const defaults = [
        'apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'libs/vendor/nestjs-zod/src',
        'apps/poms-api-rust/src', 'apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'apps/poms-api-rust/rust-toolchain.toml', 'apps/poms-api-rust/.gitignore', 'apps/poms-api-rust/README.md',
        'dist/apps/poms-api', 'tools/rust-r2l', 'tools/rust-r1b/shared-manifest.json',
        'libs/shared/api-spec/openapi.json', 'libs/shared/api-client', 'tools/openapi/shared-api-client.mjs',
        'tools/openapi/shared-api-client-baseline.json', 'tools/openapi/typescript-angular.config.json',
        'openapitools.json', 'package.json', 'pnpm-lock.yaml', '.gitattributes', 'nx.json', 'tsconfig.base.json',
        'apps/poms-api/project.json', 'apps/poms-api/webpack.config.js', 'apps/poms-api/tsconfig.json',
        'apps/poms-api/tsconfig.app.json', 'apps/poms-api/tsconfig.spec.json',
        'libs/shared/contracts/project.json', 'libs/shared/contracts/tsconfig.json', 'libs/shared/contracts/tsconfig.lib.json',
        'libs/api/contracts/project.json', 'libs/api/contracts/tsconfig.json', 'libs/api/contracts/tsconfig.lib.json',
        'libs/vendor/nestjs-zod/project.json', 'libs/vendor/nestjs-zod/tsconfig.json', 'libs/vendor/nestjs-zod/tsconfig.lib.json'
    ].flatMap((relative) => directoryFiles(relative));
    const optional = ['apps/poms-api-rust/tests', 'apps/poms-api-rust/examples', 'apps/poms-api-e2e/src', 'dist/tools/rust-r2l-ui-ui02-production',
        'dist/out-tsc/libs/shared/contracts', 'dist/libs/vendor/nestjs-zod'].flatMap((relative) => directoryFiles(relative, true));
    const rustIncludes = rustLiteralClosure([...defaults, ...optional]);
    optional.push(...rustIncludes);
    const localDistDependencies = [], checkedPackages = new Set();
    function localDistribution(packageDirectory) {
        const packageFile = path.join(ROOT, packageDirectory, 'package.json');
        if (!fs.existsSync(packageFile) || checkedPackages.has(packageFile)) return;
        checkedPackages.add(packageFile);
        const metadata = JSON.parse(readStable(packageFile).bytes);
        for (const [name, version] of Object.entries({ ...metadata.dependencies, ...metadata.optionalDependencies })) {
            if (typeof version !== 'string' || !version.startsWith('file:')) continue;
            const dependency = path.resolve(path.dirname(packageFile), version.slice(5));
            assert(inside(ROOT, dependency), 'Local Native dist dependency escaped repo');
            const relative = publicName(path.relative(ROOT, dependency).split(path.sep).join('/'));
            assert(!relative.split('/').includes('node_modules'), 'Whole installed package capture forbidden');
            localDistDependencies.push({ package: packageDirectory, dependency: name, source: relative });
            optional.push(...directoryFiles(relative)); localDistribution(relative);
        }
    }
    localDistribution('dist/apps/poms-api');
    for (const file of [...defaults, ...optional]) add(path.join(ROOT, file), `sources/${file}`, 'repo-input');
    const toolFiles = [...new Set([...defaults, ...optional].filter((file) => file.startsWith('tools/')))];
    for (const file of staticToolClosure(toolFiles)) add(path.join(ROOT, file), `sources/${file}`, 'tool-source-closure');

    // Calls only the existing read-only SDK source reporter, never the witness
    // constructor, Native app, managed environment or fixture implementation.
    const { sdkSourceReport } = await import('./k-native-write-witness.mjs');
    const sdk = sdkSourceReport();
    for (const item of sdk.files) {
        const resolved = fs.realpathSync(item.absolutePath);
        assert(inside(MODULES, resolved), 'SDK source must be an explicit dependency-cache file');
        add(resolved, `sdk/${item.file}`, 'locked-MikroORM-witness-source', item.rawBytesSha256);
    }
    const pgRequire = createRequire(require.resolve('@mikro-orm/postgresql'));
    for (const [name, entry] of [['@mikro-orm/core', require.resolve('@mikro-orm/core')], ['@mikro-orm/sql', pgRequire.resolve('@mikro-orm/sql')]]) {
        const file = fs.realpathSync(path.join(path.dirname(entry), 'package.json'));
        assert(inside(MODULES, file)); add(file, `sdk/${name}/package.json`, 'locked-MikroORM-package-metadata', sha(readStable(file, true).bytes));
    }
    const tsEntry = require.resolve('typescript'), tsPackage = require.resolve('typescript/package.json');
    for (const [file, snapshot] of [[tsEntry, 'sdk/typescript/typescript.js'], [tsPackage, 'sdk/typescript/package.json']]) {
        const resolved = fs.realpathSync(file); assert(inside(MODULES, resolved));
        add(resolved, snapshot, 'TypeScript-source-extraction-dependency', sha(readStable(resolved, true).bytes));
    }
    for (const entry of extraFiles) {
        if (typeof entry === 'string') {
            publicName(entry); assert(!path.isAbsolute(entry) && !entry.split('/').includes('node_modules'));
            add(path.join(ROOT, entry), `sources/${entry}`, 'explicit-repo-input');
        } else {
            assert(entry && typeof entry === 'object' && typeof entry.file === 'string');
            assert(path.isAbsolute(entry.file) && /^[0-9a-f]{64}$/.test(entry.expectedSha256 ?? ''));
            assert(/^(?:artifacts|sdk)\//.test(entry.snapshot));
            const absolute = path.resolve(entry.file);
            assert(inside(ROOT, absolute) || inside(STATE_TARGET, absolute) || inside(MODULES, absolute), 'Explicit input is outside the public source/artifact roots');
            add(absolute, entry.snapshot, 'explicit-hash-pinned-artifact', entry.expectedSha256);
        }
    }
    const entries = [...selected.values()].sort((a, b) => compare(a.snapshot, b.snapshot));
    const repoFiles = [...new Set(entries.filter((entry) => inside(ROOT, entry.file)).map((entry) => path.relative(ROOT, entry.file).split(path.sep).join('/')))].sort(compare);
    const baselineBytes = readStable(path.join(ROOT, 'tools/openapi/shared-api-client-baseline.json')).bytes;
    const baseline = JSON.parse(baselineBytes);
    assert.equal(baseline.sourceHead, S3); assert.equal(baseline.protectedSources.length, 6);
    assertFrozenSources(ROOT, baseline);
    const sixInputs = baseline.protectedSources.map((item) => {
        publicName(item.file); const bytes = readStable(path.join(ROOT, item.file)).bytes, hashes = fingerprints(bytes);
        assert.equal(hashes.normalizedLfSha256, item.sha256);
        return { file: item.file, bytes: bytes.length, ...hashes };
    });
    const gitCommands = {
        'git-status.bin': ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...repoFiles],
        'git-working.patch': ['diff', '--binary', '--no-ext-diff', '--no-textconv', S3, '--', ...repoFiles],
        'git-index.patch': ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv', S3, '--', ...repoFiles]
    };
    const gitArtifacts = Object.fromEntries(Object.entries(gitCommands).map(([name, args]) => [name, git(args)]));
    const parent = path.dirname(output); fs.mkdirSync(parent, { recursive: true, mode: 0o700 }); noLinks(parent);
    fs.mkdirSync(output, { mode: 0o700 });
    const rows = [];
    for (const entry of entries) {
        const before = readStable(entry.file, !!entry.expectedSha256), hashes = fingerprints(before.bytes);
        if (entry.expectedSha256) assert.equal(hashes.rawBytesSha256, entry.expectedSha256);
        const target = path.join(output, entry.snapshot);
        assert(inside(output, target)); fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 }); noLinks(path.dirname(target));
        fs.writeFileSync(target, before.bytes, { flag: 'wx', mode: 0o600 });
        assert.equal(sha(readStable(target).bytes), hashes.rawBytesSha256, 'Snapshot fingerprint differs');
        const after = readStable(entry.file, !!entry.expectedSha256); assert(sameStat(before.stat, after.stat)); assert.equal(sha(after.bytes), hashes.rawBytesSha256);
        rows.push({ source: inside(ROOT, entry.file) ? path.relative(ROOT, entry.file).split(path.sep).join('/') : entry.file,
            originalAbsolutePath: entry.file, snapshot: `${relativeOutput}/${entry.snapshot}`, target: entry.snapshot,
            kind: entry.kind, sourceHashPinned: !!entry.expectedSha256, sourceLinkCount: Number(before.stat.nlink), bytes: before.bytes.length, ...hashes });
    }
    const dirtyArtifacts = Object.entries(gitArtifacts).map(([file, bytes]) => {
        fs.writeFileSync(path.join(output, file), bytes, { flag: 'wx', mode: 0o600 });
        return { file: `${relativeOutput}/${file}`, bytes: bytes.length, ...fingerprints(bytes) };
    });
    for (const row of rows) {
        assert.equal(sha(readStable(path.join(ROOT, row.snapshot)).bytes), row.rawBytesSha256);
        assert.equal(sha(readStable(row.originalAbsolutePath, row.sourceHashPinned).bytes), row.rawBytesSha256, 'Source changed before capture completion');
    }
    assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), currentHead);
    for (const [name, args] of Object.entries(gitCommands)) assert.deepEqual(git(args), gitArtifacts[name], 'Git state changed during capture');
    assertFrozenSources(ROOT, baseline);
    const report = { formatVersion: 1, kind: 'pre-owner-immutable-runtime-input-bytes', result: 'pass', tag,
        capturedAt: new Date().toISOString(), sourceCheckpoint: S3, currentHead, sourceCheckpointActualAncestor: true,
        files: rows, filesManifestSha256: sha(Buffer.from(JSON.stringify(rows))), gitArtifacts: dirtyArtifacts,
        generator: { baseline: { file: 'tools/openapi/shared-api-client-baseline.json', rawBytesSha256: sha(baselineBytes) }, sourceHead: baseline.sourceHead, protectedInputs: sixInputs },
        sdk: { packages: sdk.packages, scope: 'Explicit witness-source selection only; not the entire installed dependency tree' },
        nativeDistribution: { directory: 'dist/apps/poms-api', completeDirectoryCopied: true, localFileDependencies: localDistDependencies,
            installedThirdPartyTreesCopied: false },
        node: { version: process.version, executable: process.execPath, bytes: nodeRead.bytes.length, rawBytesSha256: sha(nodeRead.bytes), binaryCopied: false },
        rustLiteralIncludes: rustIncludes.map((file) => ({ file, rawBytesSha256: sha(readStable(path.join(ROOT, file)).bytes) })),
        rustBinaryCopied: entries.some((entry) => entry.kind === 'explicit-hash-pinned-artifact' && path.basename(entry.file) === 'poms-api-rust'),
        privateEnvironmentCopied: false, wholeNodeModulesCopied: false, internalCheckpointCopied: false,
        runtimeExecution: 'not-performed-by-capture', runtimeSuccessCertified: false };
    fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8')), report);
    return { ...report, manifest: `${relativeOutput}/manifest.json`, manifestRawBytesSha256: sha(fs.readFileSync(path.join(output, 'manifest.json'))) };
}
