import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SourceReader} from './acceptance-source.mjs';
import {originalRequestIdResolver,settingHeaderRecipe,resolveSettingHeaderIdentity,settingHeaderLeaseCase} from './acceptance-api-request-identity.mjs';
const files=['tools/rust-r2ef/e-http-plan.mjs','apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts','apps/poms-api/src/app/features/system-setting/system-setting.controller.ts'],root=path.resolve(import.meta.dirname,'../..'),sha=value=>createHash('sha256').update(value).digest('hex');
const reader=()=>new SourceReader({root,sourceEpoch:'pure-only',pins:files.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return{file,bytes:bytes.length,rawBytesSha256:sha(bytes)}})});
const runId='10000000-0000-4000-8000-000000000001',cid='m-20000000-0000-4000-8000-000000000002',ownershipRequestId='r2m:'+runId+':123456789abc';

test('the actual protected TS resolver preserves empty strings and only falls back for missing/null request IDs',()=>{
    const resolve=originalRequestIdResolver(reader());assert.equal(resolve({headers:{'x-request-id':'','x-correlation-id':'fallback'}}),'');assert.equal(resolve({headers:{'x-correlation-id':'fallback'}}),'fallback');assert.equal(resolve({headers:{'x-request-id':null,'x-correlation-id':'fallback'}}),'fallback');assert.equal(resolve({headers:{}}),null);
});
test('both original E cells retain exact headers and create only a source descriptor, never an ownership waiver',()=>{
    for(const[index,stepId]of['E-settings-update','E-settings-update-noop'].entries()){
        const sourceReader=reader(),recipe=settingHeaderRecipe(sourceReader,stepId),step={stepId,method:recipe.method,path:recipe.path,body:recipe.body,headers:recipe.headers},result=resolveSettingHeaderIdentity({sourceReader,sourceCapId:'pure-only',backend:'nest',step,context:{runId,caseId:settingHeaderLeaseCase,index,op:'m.http'},ownershipRequestId,generatedCorrelationId:cid});
        assert.equal(result.ownershipRequestId,ownershipRequestId);assert.equal(result.actualRequestId,index?'':'e-explicit-request');assert.equal(result.actualCorrelationId,index?cid:'e-ignored-correlation');assert.equal(result.fixtureOwnershipGranted,false);assert.equal(result.ordinaryScopeRequestIdChanged,false);
        assert.throws(()=>resolveSettingHeaderIdentity({sourceReader,sourceCapId:'pure-only',backend:'nest',step:{...step,headers:{}},context:{runId,caseId:settingHeaderLeaseCase,index,op:'m.http'},ownershipRequestId,generatedCorrelationId:cid}));
    }
});
