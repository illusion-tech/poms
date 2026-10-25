// Compare only R1A's frozen operations and reachable health schemas. The full
// Nest spec/client remain authoritative and are never overwritten by this tool.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = process.argv[2];
assert.ok(target, 'Usage: node tools/rust-r1a/verify-openapi.mjs <generated-subset.json>');
const existing = JSON.parse(fs.readFileSync(path.join(repo, 'libs/shared/api-spec/openapi.json'), 'utf8'));
const generated = JSON.parse(fs.readFileSync(target, 'utf8'));
const routes = ['/api', '/api/health', '/api/health/readiness'];
assert.deepEqual(Object.keys(generated.paths).sort(), routes.toSorted());

function schemaSemantics(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const result = structuredClone(value);
    for (const key of ['description', 'title']) delete result[key];
    for (const key of ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas']) {
        if (result[key]) result[key] = Object.fromEntries(Object.entries(result[key]).map(([name, schema]) => [name, schemaSemantics(schema)]));
    }
    for (const key of ['items', 'additionalProperties', 'not', 'if', 'then', 'else', 'contains', 'propertyNames']) {
        if (key in result) result[key] = schemaSemantics(result[key]);
    }
    for (const key of ['oneOf', 'allOf', 'anyOf', 'prefixItems']) {
        if (Array.isArray(result[key])) result[key] = result[key].map(schemaSemantics);
    }
    for (const key of ['required', 'enum']) {
        if (Array.isArray(result[key])) result[key].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return result;
}
function responseSemantics(responses) {
    return Object.fromEntries(
        Object.entries(responses).map(([status, original]) => {
            const response = structuredClone(original);
            delete response.description;
            for (const media of Object.values(response.content ?? {})) {
                if (media.schema) media.schema = schemaSemantics(media.schema);
            }
            return [status, response];
        })
    );
}
for (const route of routes) {
    assert.deepEqual(Object.keys(generated.paths[route]), ['get']);
    const expected = existing.paths[route].get;
    const actual = generated.paths[route].get;
    assert.equal(actual.operationId, expected.operationId, route);
    assert.deepEqual(actual.parameters ?? [], expected.parameters ?? [], route);
    assert.equal(actual.requestBody, undefined, route);
    assert.deepEqual(actual.security ?? generated.security ?? [], expected.security ?? existing.security ?? [], route);
    assert.deepEqual(responseSemantics(actual.responses), responseSemantics(expected.responses), route);
}
for (const schema of ['HealthCheckDto', 'HealthChecksDto', 'HealthDependencyCheckDto']) {
    assert.deepEqual(schemaSemantics(generated.components.schemas[schema]), schemaSemantics(existing.components.schemas[schema]), schema);
}
console.log(JSON.stringify({ status: 'ok', operations: routes.length, healthSchemas: 3, fullSpecChanged: false }));
