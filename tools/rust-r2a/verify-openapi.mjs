// Preserve the original whole-document authority while extending the Rust subset.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
assert.equal(process.argv.length, 3, 'Usage: verify-openapi.mjs <generated-r2a-subset.json>');
const generated = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const existing = JSON.parse(readFileSync(path.join(root, 'libs/shared/api-spec/openapi.json'), 'utf8'));
const inherited = ['/api', '/api/health', '/api/health/readiness', '/api/auth/sessions', '/api/auth/session', '/api/auth/csrf-token', '/api/auth/session:logout'];
const navigation = ['/api/me/navigation', '/api/platform/navigation', '/api/platform/navigation:sync'];
assert.deepEqual(Object.keys(generated.paths).sort(), [...inherited, ...navigation].sort());
assert.equal(generated.openapi, existing.openapi);
assert.deepEqual(generated.components.securitySchemes, existing.components.securitySchemes);
assert.deepEqual(generated.security ?? [], existing.security ?? []);
for (const route of navigation) assert.deepEqual(generated.paths[route], existing.paths[route], `Navigation metadata: ${route}`);
function reachable(paths) {
    const names = new Set();
    function inspect(value) {
        if (Array.isArray(value)) value.forEach(inspect);
        else if (value && typeof value === 'object') {
            if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
                const name = value.$ref.slice('#/components/schemas/'.length);
                assert(generated.components.schemas[name], `Missing schema ${name}`);
                if (!names.has(name)) {
                    names.add(name);
                    inspect(generated.components.schemas[name]);
                }
            }
            Object.values(value).forEach(inspect);
        }
    }
    for (const route of paths) inspect(generated.paths[route]);
    return names;
}
const navigationSchemas = reachable(navigation);
for (const name of navigationSchemas) assert.deepEqual(generated.components.schemas[name], existing.components.schemas[name], `Navigation schema: ${name}`);
const previousSchemas = reachable(inherited);
assert.deepEqual(Object.keys(generated.components.schemas).sort(), [...new Set([...previousSchemas, ...navigationSchemas])].sort());
const directory = mkdtempSync(path.join(tmpdir(), 'poms-r2a-inherited-document-'));
const file = path.join(directory, 'inherited.json');
try {
    const previous = structuredClone(generated);
    previous.paths = Object.fromEntries(inherited.map((route) => [route, generated.paths[route]]));
    previous.components.schemas = Object.fromEntries([...previousSchemas].map((name) => [name, generated.components.schemas[name]]));
    writeFileSync(file, JSON.stringify(previous));
    const result = execFileSync(process.execPath, [path.join(root, 'tools/rust-r1c/verify-openapi.mjs'), file], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(JSON.parse(result).result, 'pass');
} finally {
    unlinkSync(file);
    rmdirSync(directory);
}
console.log(JSON.stringify({ result: 'pass', operations: 10, inheritedOperations: 7, navigationOperations: 3, navigationSchemas: navigationSchemas.size, source: 'existing full OpenAPI', fullSpecChanged: false, runtimeBehaviorClaim: false }));
