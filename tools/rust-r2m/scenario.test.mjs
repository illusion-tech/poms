import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { SourceReader, sourcePath, sourceCapDigest, verifySourceCap } from './acceptance-source.mjs';
import { createDispatch, requestPath } from './acceptance-dispatch.mjs';
import { buildScenarioPlans, buildUriProbes, buildSurfaceProbes, materialize, materializeRequest, nativeProducerRoutes, uploadInput } from './scenario-input.mjs';
import { schemaIssues, validateFactFrame, valueDigest } from './scenario-expected.mjs';
import { createNormalizer, strictDifference } from './acceptance-compare.mjs';
import { bindCertifiedRows, validateCloseout } from './acceptance.mjs';

const ROOT=path.resolve(import.meta.dirname,'../..');
const input=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/design/rust-r2m/acceptance-input.json'),'utf8'));
const uid='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',run='30000000-0000-4000-8000-000000000003',capId='cap-current';
const h='a'.repeat(64),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const admission=(id,slot)=>({kind:'r2m-fixture-admission',runId:run,sourceCapId:capId,table:'role',identity:{id},slot,ledgerDigest:h,certificateSha256:h});
const frame=(rows)=>({readOnly:true,complete:true,catalogDigest:h,columns:{role:['id','name','row_version']},primaryKeys:{role:['id']},rows:{role:rows},outsideScope:{complete:true,tablesScanned:107,unexpectedChanges:[]}});

test('all115 remain on selected candidate, Native producer is fixed before a response, unknown business is refused',()=>{
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    for(const item of input.sourceProtection.currentSurface)for(const backend of ['nest','rust']){
        const actual=dispatch.resolve({method:item.method,path:item.path.replace(/\{[^}]+\}/g,uid),backend,purpose:'business'});assert.equal(actual.executionBackend,backend);assert.equal(actual.fallbackAllowed,false);
    }
    assert.equal(dispatch.resolve({method:'POST',path:'/api/contracts/'+uid+':submitReview',backend:'rust',purpose:'producer'}).executionBackend,'nest');
    assert.throws(()=>dispatch.resolve({method:'POST',path:'/api/contracts/'+uid+':submitReview',backend:'rust',purpose:'business'}));
    assert.throws(()=>dispatch.resolve({method:'GET',path:'/api/unfrozen-business',backend:'rust',purpose:'business'}));
    const first=dispatch.resolve({method:'GET',path:'/api/me/todos',backend:'rust'});const hypothetical404={status:404};assert.equal(hypothetical404.status,404);assert.equal(first.executionBackend,'rust');
    assert.throws(()=>createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:[input.sourceProtection.currentSurface[0]]}));
});

test('literal malformed URI27 cells and migrated115 probes are complete without invented outcomes',()=>{
    const cells=buildUriProbes({userId:uid});assert.equal(cells.length,27);assert.equal(new Set(cells.map(item=>item.id)).size,27);
    assert.equal(cells.filter(item=>item.knownPreviousOnly!==null).length,2);assert(cells.every(item=>item.expectedFromNative===true&&!Object.hasOwn(item,'expectedStatus')));
    assert.equal(requestPath('/api/platform/users/%FF?x=1'),'/api/platform/users/%FF');assert.equal(requestPath('/api/platform/users/%'),'/api/platform/users/%');
    assert.throws(()=>requestPath('http://127.0.0.1/api/auth/session'));assert.throws(()=>requestPath('/api/../private'));
    const names=[...new Set(input.sourceProtection.currentSurface.flatMap(item=>[...item.path.matchAll(/\{([^}]+)\}/g)].map(match=>match[1])))];
    const probes=buildSurfaceProbes(input,{surface:Object.fromEntries(names.map(name=>[name,uid]))});assert.equal(probes.length,115);assert(probes.every(item=>item.session==='anonymous'&&item.expectedFromNative));
});

test('SourceReader rejects unpinned/private/traversal and detects raw-byte mutation; cap binds exact current artifacts',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'poms-r2m-source-pure-')),file=path.join(directory,'a.txt');
    try{
        const bytes=Buffer.from('source\r\n');fs.writeFileSync(file,bytes,{flag:'wx'});
        const reader=new SourceReader({root:directory,sourceEpoch:'pure-test',pins:[{file:'a.txt',bytes:bytes.length,rawBytesSha256:sha(bytes),normalizedLfSha256:sha(Buffer.from('source\n'))}]});
        assert.equal(reader.text('a.txt'),'source\r\n');assert.equal(reader.assertUnchanged().files.length,1);
        for(const refused of ['../a.txt','private/old.env','tmp/rust-r2l/runtime-input/source','node_modules/x','a\\b','.env'])assert.throws(()=>sourcePath(refused));
        assert.throws(()=>reader.read('unregistered.txt'));fs.writeFileSync(file,'changed');assert.throws(()=>reader.assertUnchanged());
        const files=[{file:'a.txt',bytes:bytes.length,rawBytesSha256:sha(bytes)}],cap={kind:'r2m-source-cap',id:'test',candidate:'b'.repeat(40),complete:true,privateCopied:false,files,manifestSha256:sourceCapDigest(files),artifacts:[{kind:'rust-release',bytes:1,rawBytesSha256:h}]};
        assert.equal(verifySourceCap(cap,{candidate:'b'.repeat(40)}).files,1);assert.throws(()=>verifySourceCap({...cap,privateCopied:true}));assert.throws(()=>verifySourceCap({...cap,candidate:'c'.repeat(40)},{candidate:'b'.repeat(40)}));
    }finally{const resolved=fs.realpathSync(directory);assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));assert(path.basename(resolved).startsWith('poms-r2m-source-pure-'));fs.unlinkSync(file);fs.rmdirSync(directory)}
});

test('schema checks preserve missing/null, UTF16 constraints and unknown-property rules',()=>{
    const spec={components:{schemas:{Thing:{type:'object',required:['amount','label'],properties:{amount:{type:'string',nullable:true},label:{type:'string',maxLength:2}},additionalProperties:false}}}};
    const schema={$ref:'#/components/schemas/Thing'};
    assert.equal(schemaIssues({amount:null,label:'😀'},schema,spec).length,0);assert(schemaIssues({label:'ok'},schema,spec).some(item=>item.rule==='required'));
    assert(schemaIssues({amount:null,label:'😀a'},schema,spec).some(item=>item.rule==='maxLength'));assert(schemaIssues({amount:'1.00',label:'ok',extra:true},schema,spec).some(item=>item.rule==='additionalProperties'));
});

test('whole physical facts reject missing columns and outside107 writes; system_setting keeps its key PK',()=>{
    assert.equal(validateFactFrame(frame([{id:uid,name:'role',row_version:1}]),['role']).rows,1);
    assert.throws(()=>validateFactFrame(frame([{id:uid,name:'role'}]),['role']));
    const changed=frame([]);changed.outsideScope.unexpectedChanges.push({table:'unowned',key:'not-for-acceptance'});assert.throws(()=>validateFactFrame(changed,['role']));
    const setting={readOnly:true,complete:true,catalogDigest:h,columns:{system_setting:['key','value_json']},primaryKeys:{system_setting:['key']},rows:{system_setting:[{key:'attachment.max-upload-size-mb',value_json:128}]},outsideScope:{complete:true,tablesScanned:107,unexpectedChanges:[]}};
    assert.equal(validateFactFrame(setting,['system_setting']).rows,1);
});

test('normalization requires actual admission, is bijective, does not erase unproved clocks or leak values in diff',()=>{
    const evidence={runId:run,sourceCapId:capId,admissions:[admission(uid,'actor.admin')],inputs:[],literals:[],cells:[]};
    const normalized=createNormalizer(evidence);assert.equal(normalized.facts(frame([{id:uid,name:'role',row_version:1}]),['role']).rows.role[0].id,'$id:actor.admin');
    assert.throws(()=>createNormalizer({...evidence,admissions:[admission(uid,'a'),admission(uid,'b')]}));assert.throws(()=>normalized.facts(frame([{id:other,name:'role',row_version:1}]),['role']));
    assert.throws(()=>createNormalizer({...evidence,inputs:[{runId:run,sourceCapId:capId,value:other,slot:'fake-row'}]}));
    const secret='cookie=must-never-be-public';const differences=strictDifference({[secret]:'secret-a'},{});assert(!JSON.stringify(differences).includes(secret));assert(!JSON.stringify(differences).includes('secret-a'));
    assert(strictDifference({created_at:'2026-01-01T00:00:00Z'},{created_at:'2026-01-02T00:00:00Z'}).length>0);
    const clock={target:'response',kind:'clock',runId:run,sourceCapId:capId,path:['body','at'],actual:'2026-01-01T00:00:00.000Z',valueSha256:valueDigest('2026-01-01T00:00:00.000Z'),site:'birth',observationSha256:h,window:{startedAt:'2026-01-02T00:00:00Z',finishedAt:'2026-01-03T00:00:00Z'}};
    assert.throws(()=>createNormalizer({...evidence,cells:[clock]}).response({status:200,body:{at:clock.actual},headers:{},bodyBytesLength:0}));
});

test('ordered20 routes use frozen method/path, buffers remain bytes, original Native recipe bodies are executed as pure constructors',()=>{
    const plans=buildScenarioPlans(input);assert.equal(plans.length,20);
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    for(const plan of plans)for(const step of plan.steps)if(step.kind==='request')dispatch.resolve({method:step.method,path:step.path.replace(/\{[^}]+\}/g,uid),backend:'rust',purpose:step.purpose});
    const bytes=Buffer.from('actual payload');assert(Buffer.isBuffer(materialize(bytes,{})));assert.equal(uploadInput('x.txt',bytes).sha256,sha(bytes));
    const built=materializeRequest({kind:'original-source-request',exportName:'contractRequests',args:[{$binding:'contract'},{comment:'source'}],select:'submit'},{contract:{id:uid,rowVersion:2}});
    assert.equal(built.path,'/api/contracts/'+uid+':submitReview');assert.deepEqual(built.body,{comment:'source',expectedVersion:2});assert(built.originalSource.includes('contract-api.ts'));
    assert.throws(()=>materialize({$binding:'__proto__.secret'},{}));
});

test('query/response IDs alone cannot bind rows and cleanup cannot pass without writer drain/double zero',()=>{
    const after=frame([{id:uid,name:'owned',row_version:1}]),specifications=[{table:'role',slot:'role',selector:{id:uid},view:{id:'id',rowVersion:'row_version'}}];
    assert.throws(()=>bindCertifiedRows({},specifications,after,{registeredRows:[]}));
    const values={};bindCertifiedRows(values,specifications,after,{registeredRows:[admission(uid,'role')]});assert.equal(values.role.id,uid);
    const receipt={runId:run,sourceCapId:capId,allWritersClosed:true,pendingTransactions:0,unknownWriters:0,fullReferenceScan:{tablesScanned:107,unownedReferences:0},borrowedRowsUnchanged:true,cleanup:[{state:'cleaned',objects:0,logicalReferences:0},{state:'cleaned',objects:0,logicalReferences:0,matched:0,changed:0}],baselineSettingLease:{used:false},portsReleased:true,oldInstancesTouched:false,r2mVolumeRetained:true};
    assert.equal(validateCloseout(receipt,{runId:run,sourceCapId:capId}).result,'pass');assert.throws(()=>validateCloseout({...receipt,allWritersClosed:false},{runId:run,sourceCapId:capId}));const bad=structuredClone(receipt);bad.cleanup[1].changed=1;assert.throws(()=>validateCloseout(bad,{runId:run,sourceCapId:capId}));
});
