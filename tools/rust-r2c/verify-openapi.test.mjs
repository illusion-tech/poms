import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reachableSchemas } from './export-org-units.mjs';
import { verifyDocument } from './verify-openapi.mjs';

const original = JSON.parse(readFileSync(new URL('../../libs/shared/api-spec/openapi.json', import.meta.url), 'utf8'));
function sourceSubsetFixture() {
    // This is a verifier test fixture, never runtime Rust OpenAPI evidence.
    const routes = Object.keys(original.paths).filter(
        (route) =>
            ['/api', '/api/health', '/api/health/readiness', '/api/auth/sessions', '/api/auth/session', '/api/auth/csrf-token', '/api/auth/session:logout', '/api/me/navigation', '/api/platform/navigation', '/api/platform/navigation:sync'].includes(
                route
            ) || /^\/api\/platform\/(?:permissions$|roles(?:\/|$)|org-unit-tree$|org-units(?:\/|$))/.test(route)
    );
    const schemas = reachableSchemas(original, routes);
    return {
        ...structuredClone(original),
        paths: Object.fromEntries(routes.map((route) => [route, structuredClone(original.paths[route])])),
        components: { securitySchemes: structuredClone(original.components.securitySchemes), schemas: Object.fromEntries([...schemas].map((name) => [name, structuredClone(original.components.schemas[name])])) }
    };
}
test('recursive verifier admits the unchanged synthetic26-operation source fixture', () => {
    const result = verifyDocument(sourceSubsetFixture(), original);
    assert.equal(result.operations, 26);
    assert.equal(result.inheritedOperations, 18);
    assert.equal(result.runtimeBehaviorClaim, false);
});
test('recursive verifier rejects own metadata, recursive child schema, invented status and schema additions', () => {
    for (const mutate of [
        (value) => {
            value.paths['/api/platform/org-units'].post.operationId = 'invented';
        },
        (value) => {
            value.components.schemas.OrgUnitTreeNode.properties.children.items.$ref = '#/components/schemas/Missing';
        },
        (value) => {
            value.paths['/api/platform/org-units'].post.responses['201'] = value.paths['/api/platform/org-units'].post.responses['200'];
            delete value.paths['/api/platform/org-units'].post.responses['200'];
        },
        (value) => {
            value.components.schemas.UnreachableExtra = { type: 'object' };
        },
        (value) => {
            value.components.schemas.PlatformOrgUnitSummary.properties.displayOrder.minimum = 0;
        }
    ]) {
        const candidate = sourceSubsetFixture();
        mutate(candidate);
        assert.throws(() => verifyDocument(candidate, original));
    }
});
test('recursive verifier delegates inherited roles and auth rather than accepting their metadata by count', () => {
    const candidate = sourceSubsetFixture();
    candidate.paths['/api/platform/roles'].post.operationId = 'inventedInheritedRole';
    assert.throws(() => verifyDocument(candidate, original));
    const auth = sourceSubsetFixture();
    auth.paths['/api/auth/sessions'].post.operationId = 'inventedInheritedAuth';
    assert.throws(() => verifyDocument(auth, original));
});
