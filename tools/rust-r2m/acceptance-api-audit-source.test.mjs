import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SourceReader} from './acceptance-source.mjs';
import {platformBusinessAuditProfile} from './acceptance-api-audit-source.mjs';
const files=['apps/poms-api/src/app/features/platform/platform.service.ts','apps/poms-api/src/app/features/platform/platform.controller.ts','apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts'],root=path.resolve(import.meta.dirname,'../..'),runId='10000000-0000-4000-8000-000000000001',actorId='20000000-0000-4000-8000-000000000002',role='30000000-0000-4000-8000-000000000003';
const reader=()=>new SourceReader({root,sourceEpoch:'pure',pins:files.map(file=>{const raw=fs.readFileSync(path.join(root,file));return{file,bytes:raw.length,rawBytesSha256:createHash('sha256').update(raw).digest('hex')}})});
test('actual original permissions audit has null request metadata and an exact already-owned typed target',()=>{
    const profile=platformBusinessAuditProfile({sourceReader:reader(),sourceCapId:'pure',context:{runId,caseId:'m1.2',index:5},request:{method:'PUT',path:'/api/platform/roles/'+role+'/permissions',stepId:'replace-permissions'},actorId});assert.equal(profile.expectedAuditRequestId,null);assert.deepEqual(profile.auditSelector,{event_type:'platform.role.permissions.replaced',target_type:'PlatformRole',operator_id:actorId,request_id:null,target_id:role});assert.equal(profile.expectedParent.id,role);assert.equal(profile.fixtureOwnershipGranted,false);
});
test('a generated user audit target requires same-index actual parent proof and cannot be taken from a response/query ID',()=>{
    const profile=platformBusinessAuditProfile({sourceReader:reader(),sourceCapId:'pure',context:{runId,caseId:'m2.3',index:6},request:{method:'POST',path:'/api/platform/users',stepId:'audit-user-empty-relations',body:{username:'m_user_'+runId.replaceAll('-',''),primaryOrgUnitId:null,initialRoleIds:[]}},actorId});assert(!Object.hasOwn(profile.auditSelector,'target_id'));assert.equal(profile.expectedParent.kind,'same-case-index-actual-committed-create');assert.equal(profile.expectedParent.table,'platform_user');assert.equal(profile.expectedParent.responseOrQueryIdPermitted,false);
    assert.equal(platformBusinessAuditProfile({sourceReader:reader(),sourceCapId:'pure',context:{runId,caseId:'m2.3',index:7},request:{method:'POST',path:'/api/platform/navigation:sync',stepId:'sync'},actorId}),null);
});
test('the corrective role command and ignored request-version update have only their exact source-defined null audit profiles',()=>{
    for(const[stepId,method,suffix,event]of[['assign-new-user-roles','PUT','/roles','platform.user.roles.replaced'],['ignored-request-version','PATCH','','platform.user.updated']]){
        const profile=platformBusinessAuditProfile({sourceReader:reader(),sourceCapId:'pure',context:{runId,caseId:'m2.1',index:8},request:{method,path:'/api/platform/users/'+role+suffix,stepId},actorId});assert.equal(profile.auditSelector.event_type,event);assert.equal(profile.auditSelector.target_id,role);assert.equal(profile.auditSelector.request_id,null);assert.equal(profile.expectedParent.table,'platform_user');
        assert.equal(platformBusinessAuditProfile({sourceReader:reader(),sourceCapId:'pure',context:{runId,caseId:'m1.4',index:9},request:{method,path:'/api/platform/users/'+role+suffix,stepId},actorId}),null);
    }
});
