
import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { frozenGolden,dtoCases,schemaCoverageManifest,operationCases,uriCases,headCases,assertRejectedDtoCoverage,rejectedDtoHttpExpectation,sequentialCases,completeHttpCasePlan } from './http-compat-cases.mjs';
const binding={userId:'a0000000-0000-4000-8000-000000000001',roleId:'b0000000-0000-4000-8000-000000000001',orgId:'c0000000-0000-4000-8000-000000000001',username:'owned-username',displayName:'Owned name'};
test('HTTP rejected DTO selection preserves every raw source byte and explicitly separates accepted/nonwire cases',()=>{
    const golden=frozenGolden(),manifest=schemaCoverageManifest(golden),rows=dtoCases(golden,binding.userId);
    assert.equal(rows.length,manifest.declaredRejectedDtoWireCases);
    assert.equal(manifest.schemaCases,759);assert.equal(manifest.schemaWireCandidates,753);assert.equal(manifest.nonWire,6);
    for(const row of rows){
        const source=golden.cases.find(entry=>'dto:'+entry.schema+':'+entry.name===row.id);
        assert(source&&!source.nonWireOwnUndefined&&!source.expected.success);
        assert.equal(row.options?.body??null,source.inputRaw);
    }
    assert(rows.some(row=>row.schema==='UpdateCurrentUserProfileRequest'));
    assert(!rows.some(row=>row.id.includes('all-own-undefined')));
    assert.equal(manifest.declaredRejectedDtoWireCases,375);
    assert.equal(manifest.httpEntryLayers.jsonParserStrictRootCases,18);assert.equal(manifest.httpEntryLayers.zodDtoCases,357);
    assert.deepEqual(manifest.httpEntryLayers.strictRootRawBodies,['null','"x"','1']);
    for(const schema of new Set(rows.map(row=>row.schema)))assert.equal(rows.filter(row=>row.schema===schema&&row.httpEntry==='json-parser-strict-root').length,3);
});
test('the finite eighteen primitive-root wire cases preserve original body-parser strict errors before DTO entry',async()=>{
    const require=createRequire(import.meta.url),nested=createRequire(require.resolve('@nestjs/platform-express')),express=createRequire(nested.resolve('express'));
    const bodyParser=express('body-parser');assert.equal(express('body-parser/package.json').version,'2.2.2');
    const rows=dtoCases(frozenGolden(),binding.userId),roots=rows.filter(row=>row.httpEntry==='json-parser-strict-root');
    assert.equal(roots.length,18);
    for(const raw of ['null','"x"','1']){
        const row=roots.find(value=>value.options.body===raw),request=Readable.from([Buffer.from(raw)]);
        request.headers={'content-type':'application/json','content-length':String(Buffer.byteLength(raw))};request.method='POST';request.url='/api/platform/users';
        const error=await new Promise(resolve=>bodyParser.json()(request,{},resolve));
        assert.equal(error.type,'entity.parse.failed');assert.equal(error.body,raw);assert.equal(request.body,undefined);
        assert.deepEqual(rejectedDtoHttpExpectation(row),{entry:'json-parser-strict-root',status:error.status,response:{message:error.message,error:'Bad Request',statusCode:error.status}});
    }
    for(const name of ['missing','array','empty']){
        const row=rows.find(value=>value.schema==='CreatePlatformUserRequest'&&value.id.endsWith(':'+name));
        assert.equal(row.httpEntry,'zod-dto');assert.equal(rejectedDtoHttpExpectation(row).response.message,'Validation failed');
    }
    for(const raw of ['true','false','2','"different"'])assert.throws(()=>rejectedDtoHttpExpectation({...roots[0],options:{body:raw,contentType:'application/json'}}),/Unclassified primitive/);
});
test('operation and URI plans retain eleven source shapes without external identity or implicit HEAD counting',()=>{
    const operations=operationCases(binding);
    assert.equal(operations.length,11);assert.equal(new Set(operations.map(row=>row.operation)).size,11);
    const uri=uriCases(binding),heads=headCases(binding);
    assert.equal(uri.length,59);assert.equal(heads.length,20);
    assert(uri.some(row=>row.route.includes('%3A')&&!row.matched));
    assert(!uri.some(row=>row.route.includes('external-identities')));
    assert(heads.every(row=>row.method==='HEAD'&&row.group==='head'));
});
test('the ignored safe-method body keeps its original raw request and observes the actual user-list projection',()=>{
    const row=sequentialCases(binding).find(value=>value.id==='parser:safe-ignored');
    assert.equal(row.operation,'list');assert.equal(row.method,'GET');assert.equal(row.route,'/api/platform/users');
    assert.deepEqual(row.options,{body:'{"ignored":true}',contentType:'application/json'});
    assert.equal(completeHttpCasePlan().length,566);
    assert.equal(sequentialCases(binding).find(value=>value.id==='parser:safe-malformed').operation,'profile');
});
test('matching prefix, omitted, reordered, duplicate and failed DTO observations do not prove completeness',()=>{
    const complete=dtoCases(frozenGolden(),binding.userId).map(({id,group,operation,method})=>({id,group,operation,method,result:'observed'}));
    assert.equal(assertRejectedDtoCoverage(complete).cases,complete.length);
    for(const rows of [complete.slice(0,-1),[...complete].reverse(),[...complete,complete[0]],complete.map((row,index)=>index?row:{...row,result:'planned'})])
        assert.throws(()=>assertRejectedDtoCoverage(rows));
});
