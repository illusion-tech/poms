import assert from 'node:assert/strict';
import test from 'node:test';
import { captureHttpObservation, validateServerReceipt, sanitizedResponse, readResponseFacts, sourceFiles, baselineSourceFile, validateHeadReference } from './http-compat.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseHttpOptions } from './run-http.mjs';
import { headCases } from './http-compat-cases.mjs';
import { createRequire } from 'node:module';

const sourceHead='a22cba7360346242cb7709740b7eb954b92d1fd4';
const receipt={backend:'nest',origin:'http://127.0.0.1:5500',sourceHead,pid:123,aliveBefore:true,binarySha256:'1'.repeat(64),processIdentity:{pid:123,startTicks:'42'},sourceFiles:[{file:'apps/poms-api/src/main.ts',sha256:'2'.repeat(64)}]};

test('only eight declared unmatched HEAD probes use the original method-specific finalhandler HTML length',async()=>{
    const require=createRequire(import.meta.url),nested=createRequire(require.resolve('@nestjs/platform-express')),express=createRequire(nested.resolve('express')),finalhandler=express('finalhandler');
    assert.equal(express('finalhandler/package.json').version,'2.1.1');
    const original=(method,route)=>new Promise(resolve=>{
        const headers={},request={method,url:route,headers:{},complete:true,readable:false};
        const response={headersSent:false,setHeader:(key,value)=>headers[key.toLowerCase()]=String(value),getHeader:key=>headers[key.toLowerCase()],getHeaderNames:()=>Object.keys(headers),removeHeader:key=>delete headers[key.toLowerCase()],
            end(body){resolve({status:response.statusCode,body:body??null,contentType:headers['content-type'],bodyByteLength:body===undefined?0:Buffer.byteLength(body),headers,setCookieCount:0});}};
        finalhandler(request,response)();
    });
    const binding={userId:'a0000000-0000-4000-8000-000000000001',roleId:'b0000000-0000-4000-8000-000000000001',orgId:'c0000000-0000-4000-8000-000000000001',username:'owned',displayName:'Owned'};
    const entries=headCases(binding).filter(entry=>!entry.matched);assert.equal(entries.length,8);
    for(const entry of entries){
        const reference=await original('GET',entry.route),wire=await original('HEAD',entry.route),row={...entry,status:404,response:null,wire,headReference:reference};
        assert.equal(validateHeadReference(row),'finalhandler-not-found');assert.equal(Number(wire.headers['content-length']),reference.bodyByteLength+1);
        for(const mutate of [
            value=>{value.wire.headers['content-length']=value.headReference.headers['content-length'];},
            value=>{value.wire.headers['content-length']=String(Number(value.wire.headers['content-length'])+1);},
            value=>{value.headReference.body+=' ';},
            value=>{value.headReference.headers['content-length']='0';},
            value=>{value.wire.bodyByteLength=1;},
            value=>{value.response='unexpected';},
            value=>{value.status=405;},
            value=>{value.route+='?not-declared=1';},
            value=>{value.wire.headers['content-security-policy']="default-src *";}
        ]){const changed=structuredClone(row);mutate(changed);assert.throws(()=>validateHeadReference(changed));}
    }
});
test('source manifest selects the actual live or archived baseline without inventing a missing live path',()=>{
    const live='docs/design/rust-r2d-users-profile-baseline.md',archived='docs/design/archive/slices/rust-r2d-users-profile-baseline.md';
    for(const present of [[live],[archived],[live,archived]]){
        const chosen=baselineSourceFile(file=>present.includes(file));
        assert.equal(chosen,present.includes(live)?live:archived);
    }
    assert.throws(()=>baselineSourceFile(()=>false),/requires the live or archived baseline/);
    const chosen=baselineSourceFile(),manifest=sourceFiles();
    assert.equal(manifest.filter(value=>value.file===live||value.file===archived).length,1);
    assert.equal(manifest.find(value=>value.file===chosen).normalizedLfSha256,createHash('sha256').update(readFileSync(new URL('../../'+chosen,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex'));
});
test('HTTP source epoch binds every executed R2D shell wrapper including the fixture environment guards',()=>{
    const manifest=new Map(sourceFiles().map(value=>[value.file,value.normalizedLfSha256]));
    for(const file of ['fixture.sh','environment.sh']){
        const relative='tools/rust-r2d/'+file;
        const expected=createHash('sha256').update(readFileSync(new URL('./'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
        assert.equal(manifest.get(relative),expected,'Actual shell guard contents must be bound before/after HTTP');
    }
});
test('owner receipt is identity-bound and rejects changed target, process or source fields',()=>{
    assert.deepEqual(validateServerReceipt(receipt,'nest',receipt.origin),receipt);
    for(const patch of [{backend:'rust'},{origin:'http://localhost:5500'},{sourceHead:'0'.repeat(40)},{pid:0},{aliveBefore:false},{processIdentity:{pid:124,startTicks:'42'}},{processIdentity:{pid:123,startTicks:'0'}},{sourceFiles:[{file:'../secret',sha256:'2'.repeat(64)}]},{sourceFiles:[]}]){
        assert.throws(()=>validateServerReceipt({...receipt,...patch},'nest',receipt.origin));
    }
    assert(!Object.hasOwn(validateServerReceipt({...receipt,secret:'not-retained'},'nest',receipt.origin),'secret'));
});
test('run CLI is explicit and limited to fixed evidence namespace',()=>{
    assert.deepEqual(parseHttpOptions(['--plan']),{mode:'plan'});
    assert.equal(parseHttpOptions(['nest','tmp/rust-r2d/synthetic-receipt.json','candidate01']).backend,'nest');
    for(const args of [[],['--run'],['external','tmp/rust-r2d/a.json'],['nest','../secret.json'],['nest','tmp/rust-r2d/a.json','../bad']])assert.throws(()=>parseHttpOptions(args));
});
test('HTTP outcome is preserved if adoption/fact capture fails and later independent capture still runs',async()=>{
    const row={},calls=[],failure=new Error('private detail must not be recorded');
    await assert.rejects(captureHttpObservation({row,send:async()=>({status:500,body:{statusCode:500,message:'Internal server error'},setCookie:[],headers:{},contentType:'application/json'}),
        afterResponse:async()=>{throw failure;},captureAfter:async()=>{calls.push('after');return {};},captureResponseFacts:async()=>{calls.push('response');return {};}
    }),(error)=>error===failure);
    assert.equal(row.status,500);assert.deepEqual(row.response,{statusCode:500,message:'Internal server error'});
    assert.equal(row.result,'capture-incomplete');assert.deepEqual(calls,['after','response']);assert(!JSON.stringify(row).includes('private detail'));
});
test('HTTP capture failures cannot acquire observed label and cookie values never enter response records',async()=>{
    const row={},failure=new Error('facts');
    await assert.rejects(captureHttpObservation({row,send:async()=>({status:200,body:{ok:true},setCookie:['poms_session=synthetic-secret'],headers:{},contentType:'application/json'}),
        captureAfter:async()=>{throw failure;},captureResponseFacts:async()=>({readOnly:true})}));
    assert.equal(row.result,'capture-incomplete');assert.equal(row.wire.setCookieCount,1);assert(!JSON.stringify(row).includes('synthetic-secret'));
    assert(!Object.hasOwn(sanitizedResponse({status:200,body:{},setCookie:['private']}),'setCookie'));
});
test('response observer validates the fixed new low-privilege target before creating a connection',async()=>{
    const managed={childEnv:{DB_HOST:'127.0.0.1',DB_PORT:'15432',DB_DATABASE:'poms_r2d_nest',DB_USER:'poms_r2d_app',DB_SCHEMA:'poms',DB_CONNECT:'true',DB_PASSWORD:'a'.repeat(64)}};
    let created=false;const makeClient=()=>{created=true;throw new Error('must not connect');};
    await assert.rejects(readResponseFacts({...managed,childEnv:{...managed.childEnv,DB_DATABASE:'another'}},'nest',{},'profile',200,'GET',makeClient));
    assert.equal(created,false);
    const empty=await readResponseFacts(managed,'nest',{statusCode:400},'update',400,'PATCH',makeClient);
    assert.deepEqual(empty.users,[]);assert.equal(empty.readOnly,true);assert.equal(created,false);
});
