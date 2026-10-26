// Read-only comparison against the original full specification. Document
// preservation is separate from real HTTP and database behavior acceptance.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 3, 'Usage: verify-openapi.mjs <generated-r1-subset.json>');
const generated = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const existing = JSON.parse(readFileSync(path.join(root, 'libs/shared/api-spec/openapi.json'), 'utf8'));
const health = ['/api', '/api/health', '/api/health/readiness'];
const auth = ['/api/auth/sessions', '/api/auth/session', '/api/auth/csrf-token', '/api/auth/session:logout'];
assert.deepEqual(Object.keys(generated.paths).sort(), [...health, ...auth].sort());
assert.equal(generated.openapi, existing.openapi);
for (const route of auth) assert.deepEqual(generated.paths[route], existing.paths[route], `Auth metadata: ${route}`);
assert.deepEqual(generated.components.securitySchemes, existing.components.securitySchemes);
assert.deepEqual(generated.security ?? [], existing.security ?? []);
const reachable = new Set();
function inspect(value) {
    if (Array.isArray(value)) value.forEach(inspect);
    else if (value && typeof value === 'object') {
        if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
            const name = value.$ref.slice('#/components/schemas/'.length);
            if (!reachable.has(name)) {
                reachable.add(name);
                assert.deepEqual(generated.components.schemas[name], existing.components.schemas[name], `Auth schema: ${name}`);
                inspect(generated.components.schemas[name]);
            }
        }
        Object.values(value).forEach(inspect);
    }
}
for (const route of auth) inspect(generated.paths[route]);
assert.deepEqual(Object.keys(generated.components.schemas).sort(), [...reachable, 'HealthCheckDto', 'HealthChecksDto', 'HealthDependencyCheckDto'].sort());
const directory = mkdtempSync(path.join(tmpdir(), 'poms-r1c-health-document-'));
const file = path.join(directory, 'health.json');
try {
    writeFileSync(file, JSON.stringify({ ...generated, paths: Object.fromEntries(health.map((route) => [route, generated.paths[route]])) }));
    const result = execFileSync(process.execPath, [path.join(root, 'tools/rust-r1a/verify-openapi.mjs'), file], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(JSON.parse(result).status, 'ok');
} finally {
    unlinkSync(file);
    rmdirSync(directory);
}
console.log(JSON.stringify({ result: 'pass', operations: 7, healthSchemas: 3, authReachableSchemas: reachable.size, source: 'existing full OpenAPI', fullSpecChanged: false, runtimeBehaviorClaim: false }));
