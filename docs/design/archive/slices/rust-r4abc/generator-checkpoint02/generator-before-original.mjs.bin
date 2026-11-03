// One implementation for Windows/Linux generation and the legacy PS adapters.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselinePath = 'tools/openapi/shared-api-client-baseline.json';
const configurationPath = 'tools/openapi/typescript-angular.config.json';
const specificationPath = 'libs/shared/api-spec/openapi.json';
const clientPath = 'libs/shared/api-client';
const generatorVersion = '7.20.0';
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);
const compareNames = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readText = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

export function loadBaseline(root = workspaceRoot) {
    const baseline = JSON.parse(readText(safeChild(root, baselinePath)));
    assert.equal(baseline.formatVersion, 1, 'Unknown client baseline format');
    assert.equal(baseline.generator.version, generatorVersion, 'Generator version is frozen');
    assert.match(baseline.generator.jarSha256, /^[0-9a-f]{64}$/, 'The reviewed JAR fingerprint is required');
    assert.equal(baseline.spec.file, specificationPath, 'Only the full specification may generate the client');
    assert.equal(baseline.client.directory, clientPath, 'Client output directory is fixed');
    assert.deepEqual(baseline.client.metadata, ['project.json', 'tsconfig.json', 'tsconfig.lib.json']);
    assert.equal(baseline.spec.operations.length, 291, 'Full operation protection must not become a Rust subset');
    assert.equal(baseline.spec.schemas.length, 585, 'Full schema protection must not become a Rust subset');
    return baseline;
}

export function safeChild(root, relative, { allowMissing = false } = {}) {
    assert(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative), 'A nonempty relative path is required');
    assert(!relative.includes('\\') && !relative.includes(':') && relative.split('/').every((part) => part !== '' && part !== '.' && part !== '..'), 'Unsafe relative path');
    const absoluteRoot = path.resolve(root);
    const absolute = path.resolve(absoluteRoot, ...relative.split('/'));
    assert(absolute.startsWith(`${absoluteRoot}${path.sep}`), 'Path must remain below its owned root');
    let current = absoluteRoot;
    for (const part of relative.split('/')) {
        current = path.join(current, part);
        let info;
        try {
            info = lstatSync(current);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            if (allowMissing) break;
            throw new Error('Required path is missing', { cause: error });
        }
        assert(!info.isSymbolicLink(), 'Symbolic links and directory junctions are not allowed in generated trees');
    }
    return absolute;
}

export function walkTree(directory) {
    assert(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), 'Expected a regular owned directory');
    const files = [];
    function walk(current, prefix) {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
            const file = safeChild(directory, relative);
            const info = lstatSync(file);
            if (info.isDirectory()) walk(file, relative);
            else {
                assert(info.isFile(), 'Only regular generated files are allowed');
                files.push(relative);
            }
        }
    }
    walk(directory, '');
    files.sort(compareNames);
    assert.equal(new Set(files.map((file) => file.toLowerCase())).size, files.length, 'Case-colliding output paths are not portable');
    return files;
}

// File.ReadAllText detects BOMs; unchanged files retain their original bytes.
// The old script skips NUL bytes before decoding, including most UTF16 files.
export function normalizeBytes(bytes) {
    if (bytes.includes(0)) return { bytes, changed: false, binary: true };
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
    const original = new TextDecoder(encoding).decode(bytes);
    const normalized = original
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n+(?![\s\S])/g, '\n');
    return { bytes: normalized === original ? bytes : Buffer.from(normalized, 'utf8'), changed: normalized !== original, binary: false };
}

export function normalizePath(input) {
    const absolute = path.resolve(input);
    const info = lstatSync(absolute);
    assert(!info.isSymbolicLink(), 'Normalization does not follow symbolic links');
    const files = info.isDirectory() ? walkTree(absolute).map((file) => safeChild(absolute, file)) : [absolute];
    let changed = 0;
    for (const file of files) {
        assert(lstatSync(file).isFile(), 'Normalization requires regular files');
        const normalized = normalizeBytes(readFileSync(file));
        if (normalized.changed) {
            writeFileSync(file, normalized.bytes);
            changed += 1;
        }
    }
    return { files: files.length, changed };
}

export function treeManifest(directory, { normalized = false, timestamps = false } = {}) {
    return walkTree(directory).map((file) => {
        const absolute = safeChild(directory, file);
        const bytes = readFileSync(absolute);
        return { file, sha256: sha256(normalized ? normalizeBytes(bytes).bytes : bytes), ...(timestamps ? { mtimeNs: statSync(absolute, { bigint: true }).mtimeNs.toString() } : {}) };
    });
}

export function treeDifferences(expected, actual) {
    const reference = new Map(expected.map((entry) => [entry.file, entry.sha256]));
    const current = new Map(actual.map((entry) => [entry.file, entry.sha256]));
    const names = [...new Set([...reference.keys(), ...current.keys()])].sort(compareNames);
    return names.flatMap((file) => (reference.get(file) === current.get(file) ? [] : [{ file, kind: !reference.has(file) ? 'extra' : !current.has(file) ? 'missing' : 'content' }]));
}

export function validateFullSpecification(document, baseline) {
    assert.equal(document.openapi, baseline.spec.openapi, 'OpenAPI version differs from the full frozen document');
    assert.deepEqual(Object.keys(document.paths ?? {}).sort(compareNames), baseline.spec.paths, 'Full path coverage is required');
    const operations = Object.entries(document.paths).flatMap(([route, item]) =>
        Object.entries(item)
            .filter(([method]) => methods.has(method))
            .map(([method, operation]) => ({ method, path: route, operationId: operation.operationId }))
    );
    assert(
        operations.every((operation) => typeof operation.operationId === 'string' && operation.operationId.length > 0),
        'Every operation needs its original operationId'
    );
    assert.equal(new Set(operations.map((operation) => operation.operationId)).size, operations.length, 'Duplicate operationIds are rejected');
    const sortOperations = (values) => [...values].sort((left, right) => compareNames(JSON.stringify(left), JSON.stringify(right)));
    assert.deepEqual(sortOperations(operations), sortOperations(baseline.spec.operations), 'Full method/path/operationId coverage is required');
    assert.deepEqual(Object.keys(document.components?.schemas ?? {}).sort(compareNames), baseline.spec.schemas, 'Full schema coverage is required');
    function inspect(value) {
        if (Array.isArray(value)) value.forEach(inspect);
        else if (value && typeof value === 'object') {
            if (Object.hasOwn(value, '$ref')) assert(typeof value.$ref === 'string' && value.$ref.startsWith('#/'), 'Only local references are allowed; generation must not fetch outside documents');
            Object.values(value).forEach(inspect);
        }
    }
    inspect(document);
}

export function assertFrozenSources(root, baseline) {
    const files = baseline.protectedSources.map((entry) => entry.file);
    for (const args of [
        ['diff', '--name-only', '--no-ext-diff', '--no-textconv', baseline.sourceHead],
        ['diff', '--cached', '--name-only', '--no-ext-diff', '--no-textconv', baseline.sourceHead],
        ['ls-files', '--others', '--exclude-standard']
    ]) {
        const changed = execFileSync('git', [...args, '--', ...files], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        assert.equal(changed, '', 'Frozen generator input differs in the working tree, index or untracked sources');
    }
    for (const entry of baseline.protectedSources) assert.equal(sha256(readText(safeChild(root, entry.file))), entry.sha256, `Frozen input fingerprint differs: ${entry.file}`);
    const configuration = JSON.parse(readText(safeChild(root, configurationPath)));
    assert.equal(configuration.generatorName, 'typescript-angular');
    assert.equal(configuration.inputSpec, specificationPath, 'Input overrides are forbidden');
    assert.equal(configuration.outputDir, clientPath, 'Output overrides are forbidden');
    assert.equal(configuration.additionalProperties.ngVersion, '21.0.0');
    assert.equal(JSON.parse(readText(safeChild(root, 'openapitools.json')))['generator-cli'].version, generatorVersion);
    validateFullSpecification(JSON.parse(readText(safeChild(root, specificationPath))), baseline);
}

function javaEnvironment(env) {
    const result = { ...env };
    for (const name of ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'JAVA_OPTS', 'CLASSPATH']) delete result[name];
    return result;
}

export function resolveJava({ executable, env = process.env } = {}) {
    let java = executable ?? env.POMS_OPENAPI_JAVA;
    if (java) assert(path.isAbsolute(java), 'An explicit Java executable must be an absolute path');
    else if (env.JAVA_HOME) java = path.join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    else {
        java = (env.PATH ?? env.Path ?? '')
            .split(path.delimiter)
            .map((directory) => path.join(directory, process.platform === 'win32' ? 'java.exe' : 'java'))
            .find((file) => existsSync(file) && statSync(file).isFile());
    }
    assert(java && existsSync(java) && statSync(java).isFile(), 'Java 17+ is required; set JAVA_HOME or POMS_OPENAPI_JAVA');
    const result = spawnSync(java, ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 10000, env: javaEnvironment(env) });
    assert(!result.error && result.status === 0, 'Java version probe failed');
    const match = /(?:openjdk|java) version "([^"]+)"/.exec(`${result.stdout}\n${result.stderr}`);
    assert(match, 'Java version could not be identified');
    const major = Number(match[1].startsWith('1.') ? match[1].split('.')[1] : match[1].split(/[.+-]/)[0]);
    assert(major >= 17, 'The R1 client workflow requires Java 17+');
    return { executable: realpathSync(java), javaHome: path.dirname(path.dirname(realpathSync(java))), version: match[1], major };
}

export function resolveJar(root, baseline, { jar, env = process.env } = {}) {
    let candidate = jar ?? env.POMS_OPENAPI_GENERATOR_JAR;
    if (!candidate) {
        const local = path.join(root, 'tmp/rust-r1d/generator/7.20.0.jar');
        if (existsSync(local)) candidate = local;
        else {
            try {
                const require = createRequire(path.join(root, 'package.json'));
                candidate = path.join(path.dirname(require.resolve('@openapitools/openapi-generator-cli/package.json')), 'versions/7.20.0.jar');
            } catch {
                throw new Error('The reviewed 7.20.0 JAR is missing; supply POMS_OPENAPI_GENERATOR_JAR explicitly');
            }
        }
    }
    const absolute = path.resolve(root, candidate);
    assert(existsSync(absolute) && statSync(absolute).isFile(), 'The reviewed 7.20.0 JAR is missing; no automatic download is performed');
    assert.equal(sha256(readFileSync(absolute)), baseline.generator.jarSha256, 'Generator JAR fingerprint differs from the reviewed official artifact');
    return realpathSync(absolute);
}

function sourceSnapshot(root, baseline) {
    return [...baseline.protectedSources.map((entry) => entry.file), ...baseline.client.metadata.map((file) => `${clientPath}/${file}`)].map((file) => ({ file, sha256: sha256(readFileSync(safeChild(root, file))) }));
}

function validateGeneratedTree(directory, baseline) {
    const files = walkTree(directory);
    assert.equal(readText(safeChild(directory, '.openapi-generator/VERSION')).trim(), generatorVersion, 'Generated version marker differs');
    const listed = readText(safeChild(directory, '.openapi-generator/FILES')).trim().split('\n');
    for (const file of listed) safeChild(directory, file);
    assert.equal(new Set(listed).size, listed.length, 'Duplicate generated file paths');
    assert(!baseline.client.metadata.some((file) => files.includes(file)), 'Generator must not overwrite hand-maintained project metadata');
    assert.deepEqual(files, [...listed, '.openapi-generator/FILES', '.openapi-generator/VERSION'].sort(compareNames), 'Generated file list must describe the complete tree');
}

function invokeGenerator({ root, directory, java, jar, env }) {
    const args = ['-jar', jar, 'generate', '-c', configurationPath, '-o', directory, '--skip-validate-spec'];
    const result = spawnSync(java.executable, args, { cwd: root, env: javaEnvironment(env), encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
    assert(!result.error && result.status === 0, 'OpenAPI Generator failed; the client has not been synchronized');
    return { stdoutSha256: sha256(result.stdout ?? ''), stderrSha256: sha256(result.stderr ?? '') };
}

export function runClient({ root = workspaceRoot, mode = '--check', jar, java, env = process.env, generate = invokeGenerator, baseline = loadBaseline(root), temporaryRoot = tmpdir() } = {}) {
    assert(['--check', '--write'].includes(mode), 'Unknown client mode');
    assertFrozenSources(root, baseline);
    const target = safeChild(root, clientPath);
    const initialTarget = treeManifest(target, { timestamps: true });
    const inputSnapshot = sourceSnapshot(root, baseline);
    const javaInfo = resolveJava({ executable: java, env });
    const jarFile = resolveJar(root, baseline, { jar, env });
    const directory = mkdtempSync(path.join(temporaryRoot, 'poms-shared-api-client-'));
    try {
        const generatorOutput = generate({ root, directory, java: javaInfo, jar: jarFile, env });
        validateGeneratedTree(directory, baseline);
        for (const file of baseline.client.metadata) copyFileSync(safeChild(target, file), path.join(directory, file));
        normalizePath(directory);
        const expected = treeManifest(directory, { normalized: true });
        const actual = treeManifest(target, { normalized: true });
        const differences = treeDifferences(expected, actual);
        assertFrozenSources(root, baseline);
        assert.deepEqual(sourceSnapshot(root, baseline), inputSnapshot, 'Generator input or project metadata changed during generation');
        assert.deepEqual(treeManifest(target, { timestamps: true }), initialTarget, 'Generation must not write the repository client');
        if (mode === '--write') {
            for (const file of walkTree(directory)) {
                if (baseline.client.metadata.includes(file)) continue;
                const destination = safeChild(target, file, { allowMissing: true });
                const bytes = readFileSync(safeChild(directory, file));
                if (!existsSync(destination) || !readFileSync(destination).equals(bytes)) {
                    mkdirSync(path.dirname(destination), { recursive: true });
                    safeChild(target, file, { allowMissing: true });
                    writeFileSync(destination, bytes);
                }
            }
            const generatedNames = new Set(expected.map((entry) => entry.file));
            for (const file of walkTree(target)) if (!generatedNames.has(file) && !baseline.client.metadata.includes(file)) unlinkSync(safeChild(target, file));
            assert.deepEqual(treeDifferences(expected, treeManifest(target, { normalized: true })), [], 'Synchronization did not produce the complete expected client');
            assert.deepEqual(sourceSnapshot(root, baseline), inputSnapshot, 'Synchronization changed protected input or project metadata');
        }
        return {
            result: mode === '--check' && differences.length ? 'different' : 'pass',
            mode,
            sourceHead: baseline.sourceHead,
            nodeVersion: process.versions.node,
            toolSha256: sha256(readText(fileURLToPath(import.meta.url))),
            parsedBaselineSha256: sha256(JSON.stringify(baseline)),
            sourceManifest: baseline.protectedSources,
            spec: {
                file: specificationPath,
                sha256: baseline.protectedSources.find((entry) => entry.file === specificationPath).sha256,
                paths: baseline.spec.paths.length,
                operations: baseline.spec.operations.length,
                schemas: baseline.spec.schemas.length
            },
            generator: { version: generatorVersion, jarSha256: baseline.generator.jarSha256, javaVersion: javaInfo.version, directJar: true, ...generatorOutput },
            clientFiles: expected.length,
            manifestSha256: sha256(JSON.stringify(expected)),
            files: expected,
            differences,
            clientWritten: mode === '--write',
            metadataPreserved: true,
            temporaryDirectory: directory
        };
    } finally {
        const parent = path.resolve(temporaryRoot);
        assert(path.dirname(directory) === parent && path.basename(directory).startsWith('poms-shared-api-client-'), 'Unexpected temporary cleanup target');
        assert(!lstatSync(directory).isSymbolicLink(), 'Temporary cleanup must not follow a replaced link');
        rmSync(directory, { recursive: true });
    }
}

export function parseArguments(args) {
    const parsed = { mode: '--check' };
    let hasMode = false;
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (['--check', '--write', '--java-info', '--normalize'].includes(arg)) {
            assert(!hasMode, 'Choose exactly one mode');
            hasMode = true;
            parsed.mode = arg;
            if (arg === '--normalize') {
                assert(args[index + 1] && !args[index + 1].startsWith('--'), 'Normalization requires an explicit path');
                parsed.normalize = args[++index];
            }
        } else if (['--jar', '--java'].includes(arg)) {
            const key = arg.slice(2);
            assert(!Object.hasOwn(parsed, key), 'Duplicate option');
            assert(args[index + 1] && !args[index + 1].startsWith('--'), 'Option value is required');
            parsed[key] = args[++index];
        } else throw new Error('Unknown option; input specification and output overrides are forbidden');
    }
    assert(!(parsed.mode === '--normalize' && (parsed.jar || parsed.java)), 'Normalization does not accept generator options');
    assert(!(parsed.mode === '--java-info' && parsed.jar), 'Java info does not accept a generator JAR');
    return parsed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = parseArguments(process.argv.slice(2));
        if (args.mode === '--normalize') console.log(JSON.stringify({ result: 'pass', mode: args.mode, ...normalizePath(args.normalize) }));
        else if (args.mode === '--java-info') console.log(JSON.stringify(resolveJava({ executable: args.java })));
        else {
            const result = runClient(args);
            console.log(JSON.stringify(result));
            if (result.result !== 'pass') process.exitCode = 1;
        }
    } catch (error) {
        console.error(JSON.stringify({ result: 'failed', category: error?.constructor?.name ?? 'Error', message: error.message }));
        process.exitCode = 1;
    }
}
