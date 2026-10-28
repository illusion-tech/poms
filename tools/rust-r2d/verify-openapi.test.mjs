import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { USER_PATHS, reachableSchemas } from './export-users.mjs';
import { verifyDocument } from './verify-openapi.mjs';

const original=JSON.parse(readFileSync(new URL('../../libs/shared/api-spec/openapi.json',import.meta.url),'utf8'));
function sourceSubsetFixture(){
    const routes=Object.keys(original.paths).filter(route=>USER_PATHS.includes(route)||
        ['/api','/api/health','/api/health/readiness','/api/auth/sessions','/api/auth/session','/api/auth/csrf-token','/api/auth/session:logout','/api/me/navigation','/api/platform/navigation','/api/platform/navigation:sync'].includes(route)||
        /^\/api\/platform\/(?:permissions$|roles(?:\/|$)|org-unit-tree$|org-units(?:\/|$))/.test(route));
    const schemas=reachableSchemas(original,routes);
    return {...structuredClone(original),paths:Object.fromEntries(routes.map(route=>[route,structuredClone(original.paths[route])])),
        components:{securitySchemes:structuredClone(original.components.securitySchemes),schemas:Object.fromEntries([...schemas].map(name=>[name,structuredClone(original.components.schemas[name])]))}};
}
test('recursive verifier accepts only the unchanged synthetic37-operation source fixture',()=>{
    const result=verifyDocument(sourceSubsetFixture(),original);
    assert.equal(result.operations,37);
    assert.equal(result.inheritedOperations,26);
    assert.equal(result.runtimeBehaviorClaim,false);
});
test('recursive verifier rejects changed own contracts, statuses and schema widening',()=>{
    for(const mutate of [
        value=>{value.paths['/api/auth/profile'].patch.operationId='invented';},
        value=>{value.paths['/api/platform/users'].post.responses['201']=value.paths['/api/platform/users'].post.responses['200'];delete value.paths['/api/platform/users'].post.responses['200'];},
        value=>{value.components.schemas.AssignUserOrgMembershipsRequest.properties.primaryOrgUnitId.nullable=true;},
        value=>{value.components.schemas.CreatePlatformUserRequest.properties.avatarUrl={type:'string'};},
        value=>{value.components.schemas.OwnerReferenceUser.properties.passwordHash={type:'string'};},
        value=>{value.components.schemas.UnreachableExtra={type:'object'};},
        value=>{value.paths['/api/platform/users/{id}/external-identities']=structuredClone(original.paths['/api/platform/users/{id}/external-identities']);}
    ]) {const candidate=sourceSubsetFixture();mutate(candidate);assert.throws(()=>verifyDocument(candidate,original));}
});
test('recursive verifier still proves inherited org, role and auth metadata',()=>{
    for(const path of ['/api/platform/org-units','/api/platform/roles','/api/auth/sessions']){
        const candidate=sourceSubsetFixture();
        const method=Object.keys(candidate.paths[path]).find(key=>candidate.paths[path][key].operationId);
        candidate.paths[path][method].operationId='inventedInherited';
        assert.throws(()=>verifyDocument(candidate,original));
    }
});
