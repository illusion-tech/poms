// Narrow original-E header source projection. This module grants no fixture
// admission and reads no private/environment/DB state. Root/A issue the actual
// case+index-bound admission before any write can use the returned descriptor.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {eHttpCases} from '../rust-r2ef/e-http-plan.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=value=>createHash('sha256').update(value).digest('hex');
const sourceFile='tools/rust-r2ef/e-http-plan.mjs',sourceSha='0759bb059d41fd6383b2d60bc53856bb2b765273bcc259c7f1e101a7f9acb3bd';
const resolverFile='apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts',resolverSha='c6db32b268247deb198a0763c2330a8c341f7ec55c40ca271b84e84da13ca3ed';
const controllerFile='apps/poms-api/src/app/features/system-setting/system-setting.controller.ts',controllerSha='70992f07703aa56d1026e701ddbca388a0b11f94550489efc31ba21feac1cb75';
export const settingHeaderLeaseCase='m2-ui2.attachment-max-upload-size';
export const settingHeaderSteps=Object.freeze(['E-settings-update','E-settings-update-noop']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function exactSource(reader,file,expected){const raw=reader.read(file);assert.equal(sha(raw),expected,'Protected original E/controller/resolver source changed');return raw.toString('utf8')}
export function originalRequestIdResolver(sourceReader){
    const source=exactSource(sourceReader,resolverFile,resolverSha),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:resolverFile,reportDiagnostics:true});assert(!compiled.diagnostics?.some(item=>item.category===ts.DiagnosticCategory.Error));
    const exports={};vm.runInNewContext(compiled.outputText,{exports,module:{exports}},{filename:resolverFile,timeout:1000});assert.equal(typeof exports.getRequestId,'function');return exports.getRequestId;
}

export function settingHeaderRecipe(sourceReader,stepId){
    assert(settingHeaderSteps.includes(stepId),'Only two named original E header cells');exactSource(sourceReader,sourceFile,sourceSha);exactSource(sourceReader,controllerFile,controllerSha);
    const name=stepId.slice(2),found=eHttpCases({dictionaryId:'10000000-0000-4000-8000-000000000001',missingId:'20000000-0000-4000-8000-000000000002',createCode:'m-header-source'}).find(row=>row.id==='e:'+name);assert(found&&found.method==='PATCH'&&found.route==='/api/platform/system-settings/attachment.max-upload-size-mb');
    const parameters={method:found.method,path:found.route,body:found.json,headers:found.headers};return{stepId,sourceCase:found.id,...structuredClone(parameters),parametersSha256:sha(JSON.stringify(parameters)),sources:[{file:sourceFile,rawBytesSha256:sourceSha},{file:resolverFile,rawBytesSha256:resolverSha},{file:controllerFile,rawBytesSha256:controllerSha}]};
}

export function resolveSettingHeaderIdentity({sourceReader,sourceCapId,backend,step,context,ownershipRequestId,generatedCorrelationId}){
    assert(['nest','rust'].includes(backend)&&typeof sourceCapId==='string'&&sourceCapId.length>0);assert(context&&context.caseId===settingHeaderLeaseCase&&uuid.test(context.runId)&&Number.isSafeInteger(context.index)&&context.index>=0&&['m.http','m.producer'].includes(context.op));
    assert(typeof ownershipRequestId==='string'&&ownershipRequestId.startsWith('r2m:'+context.runId+':'));assert(typeof generatedCorrelationId==='string'&&generatedCorrelationId.startsWith('m-')&&uuid.test(generatedCorrelationId.slice(2)));
    const recipe=settingHeaderRecipe(sourceReader,step.stepId??step.id);assert.equal(step.method,recipe.method);assert.equal(step.path,recipe.path);assert.deepEqual(step.body,recipe.body);assert.deepEqual(step.headers,recipe.headers,'Original E request headers cannot be silently changed');
    const actualHeaders={'x-request-id':ownershipRequestId,'x-correlation-id':generatedCorrelationId,...recipe.headers},actualRequestId=originalRequestIdResolver(sourceReader)({headers:actualHeaders}),actualCorrelationId=actualHeaders['x-correlation-id'];
    assert.equal(actualRequestId,recipe.stepId==='E-settings-update'?'e-explicit-request':'');assert.equal(actualCorrelationId,recipe.stepId==='E-settings-update'?'e-ignored-correlation':generatedCorrelationId);
    sourceReader.assertUnchanged();return{kind:'R2M-original-E-setting-header-source-identity',namespace:'poms-r2m',marker:'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',sourceCapId,backend,runId:context.runId,caseId:context.caseId,index:context.index,stepId:recipe.stepId,sourceCase:recipe.sourceCase,method:recipe.method,path:recipe.path,body:recipe.body,sourceHeaders:recipe.headers,parametersSha256:recipe.parametersSha256,sources:recipe.sources,ownershipRequestId,actualRequestId,actualCorrelationId,generatedCorrelationId,ordinaryScopeRequestIdChanged:false,fixtureOwnershipGranted:false};
}
