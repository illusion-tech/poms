// This verifier extends the existing recursive R2B/R2A/R1C document proof.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, assertSourceGuard, operationCount, orgRoutes, reachableSchemas } from './export-org-units.mjs';

export function verifyDocument(generated, original) {
    assertSourceGuard();
    const routes = orgRoutes(original);
    assert.equal(routes.length, 6);
    assert.equal(Object.keys(generated.paths).length, 22);
    assert.equal(operationCount(generated.paths), 26);
    assert.equal(generated.openapi, original.openapi);
    assert.deepEqual(generated.components.securitySchemes, original.components.securitySchemes);
    assert.deepEqual(generated.security ?? [], original.security ?? []);
    for (const route of routes) assert.deepEqual(generated.paths[route], original.paths[route], `Complete organization metadata: ${route}`);
    const ownSchemas = reachableSchemas(generated, routes);
    for (const name of ownSchemas) assert.deepEqual(generated.components.schemas[name], original.components.schemas[name], `Complete organization reachable schema: ${name}`);
    const inherited = Object.keys(generated.paths).filter((route) => !routes.includes(route));
    assert.equal(inherited.length, 16);
    const inheritedSchemas = reachableSchemas(generated, inherited);
    assert.deepEqual(Object.keys(generated.components.schemas).sort(), [...new Set([...ownSchemas, ...inheritedSchemas])].sort(), 'No unreferenced or missing schema additions');
    const directory = mkdtempSync(path.join(tmpdir(), 'poms-r2c-inherited-document-'));
    const file = path.join(directory, 'inherited.json');
    let result;
    try {
        const previous = structuredClone(generated);
        previous.paths = Object.fromEntries(inherited.map((route) => [route, generated.paths[route]]));
        previous.components.schemas = Object.fromEntries([...inheritedSchemas].map((name) => [name, generated.components.schemas[name]]));
        writeFileSync(file, JSON.stringify(previous));
        result = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'tools/rust-r2b/verify-openapi.mjs'), file], { cwd: ROOT, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }));
        assert.equal(result.result, 'pass');
        assert.equal(result.operations, 18);
    } finally {
        unlinkSync(file);
        rmdirSync(directory);
    }
    assertSourceGuard();
    return {
        result: 'pass',
        paths: 22,
        operations: 26,
        orgPaths: routes.length,
        orgOperations: 8,
        orgReachableSchemas: ownSchemas.size,
        inheritedOperations: result.operations,
        source: 'Unchanged original full OpenAPI; recursive R2B to R2A to R1C/R1A verification',
        fullSpecChanged: false,
        fullClientChanged: false,
        runtimeBehaviorClaim: false
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    assert.equal(process.argv.length, 3, 'Usage: verify-openapi.mjs <generated-r2c-subset.json>');
    const bytes = readFileSync(process.argv[2]);
    const original = JSON.parse(readFileSync(path.join(ROOT, 'libs/shared/api-spec/openapi.json'), 'utf8'));
    const result = verifyDocument(JSON.parse(bytes), original);
    console.log(JSON.stringify({ ...result, generatedSha256: createHash('sha256').update(bytes).digest('hex') }));
}
