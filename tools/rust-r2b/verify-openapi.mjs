// Extend the one-way document check; the original full spec/client stay owned by TS.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const sourceHead = '9734515f84ebe1a4833d207124adbfbe378f691f';
assert.equal(process.argv.length, 3, 'Usage: verify-openapi.mjs <generated-r2b-subset.json>');
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const operationCount = (paths) => Object.values(paths).reduce((count, item) => count + Object.keys(item).filter((method) => methods.has(method)).length, 0);
function sourceGuard() {
    const scope = ['libs/shared/api-spec/openapi.json', 'libs/shared/api-client'];
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    for (const args of [
        ['diff', '--name-only', '-z', sourceHead, '--', ...scope],
        ['diff', '--cached', '--name-only', '-z', sourceHead, '--', ...scope],
        ['ls-files', '--others', '--exclude-standard', '-z', '--', ...scope]
    ])
        assert.equal(git(args), '', 'Original full OpenAPI/client working tree, index and untracked authority must remain unchanged');
    const clientFiles = git(['ls-files', '-z', '--', 'libs/shared/api-client']).split('\0').filter(Boolean);
    assert.equal(clientFiles.length, 579, 'Preserve all original generated client files');
    return clientFiles.length;
}
const clientFiles = sourceGuard();
const generatedBytes = readFileSync(process.argv[2]);
const generated = JSON.parse(generatedBytes);
const existingBytes = readFileSync(path.join(root, 'libs/shared/api-spec/openapi.json'));
const existing = JSON.parse(existingBytes);
const roles = Object.keys(existing.paths)
    .filter((route) => /^\/api\/platform\/(permissions$|roles(?:\/|$))/.test(route))
    .sort();
assert.equal(roles.length, 6);
assert.equal(operationCount(Object.fromEntries(roles.map((route) => [route, existing.paths[route]]))), 8);
assert.equal(Object.keys(generated.paths).length, 16);
assert.equal(operationCount(generated.paths), 18);
assert.equal(generated.openapi, existing.openapi);
assert.deepEqual(generated.components.securitySchemes, existing.components.securitySchemes);
assert.deepEqual(generated.security ?? [], existing.security ?? []);
for (const route of roles) assert.deepEqual(generated.paths[route], existing.paths[route], `Complete role metadata: ${route}`);

function reachable(routes) {
    const names = new Set();
    function inspect(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
            const name = value.$ref.slice('#/components/schemas/'.length);
            assert(Object.hasOwn(generated.components.schemas, name), `Missing reachable schema ${name}`);
            if (!names.has(name)) {
                names.add(name);
                inspect(generated.components.schemas[name]);
            }
        }
        Object.values(value).forEach(inspect);
    }
    routes.forEach((route) => inspect(generated.paths[route]));
    return names;
}
const roleSchemas = reachable(roles);
for (const name of roleSchemas) assert.deepEqual(generated.components.schemas[name], existing.components.schemas[name], `Complete role reachable schema: ${name}`);
const inherited = Object.keys(generated.paths).filter((route) => !roles.includes(route));
assert.equal(inherited.length, 10);
const inheritedSchemas = reachable(inherited);
assert.deepEqual(Object.keys(generated.components.schemas).sort(), [...new Set([...roleSchemas, ...inheritedSchemas])].sort(), 'No missing or unreferenced schema additions');
const directory = mkdtempSync(path.join(tmpdir(), 'poms-r2b-inherited-document-'));
const file = path.join(directory, 'inherited.json');
let inheritedResult;
try {
    const previous = structuredClone(generated);
    previous.paths = Object.fromEntries(inherited.map((route) => [route, generated.paths[route]]));
    previous.components.schemas = Object.fromEntries([...inheritedSchemas].map((name) => [name, generated.components.schemas[name]]));
    writeFileSync(file, JSON.stringify(previous));
    inheritedResult = JSON.parse(execFileSync(process.execPath, [path.join(root, 'tools/rust-r2a/verify-openapi.mjs'), file], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }));
    assert.equal(inheritedResult.result, 'pass');
    assert.equal(inheritedResult.operations, 10);
} finally {
    unlinkSync(file);
    rmdirSync(directory);
}
sourceGuard();
console.log(
    JSON.stringify({
        result: 'pass',
        paths: 16,
        operations: 18,
        rolePaths: roles.length,
        roleOperations: 8,
        roleReachableSchemas: roleSchemas.size,
        inheritedOperations: inheritedResult.operations,
        source: 'unchanged original full OpenAPI; inherited R2A verifier recursively delegates R1C/R1A',
        generatedSha256: createHash('sha256').update(generatedBytes).digest('hex'),
        fullSpecNormalizedSha256: createHash('sha256').update(existingBytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex'),
        originalClientFiles: clientFiles,
        fullSpecChanged: false,
        fullClientChanged: false,
        runtimeBehaviorClaim: false
    })
);
