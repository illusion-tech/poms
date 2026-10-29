import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
import {NavigationHttpSession} from './http-client.mjs';
import {validationCases as iValidation} from './i-http-cases.mjs';
import {validationCases as jValidation,guardCases as jGuards} from './j-http-cases.mjs';
const [tag,nestTag,rustTag]=process.argv.slice(2);assert(process.argv.length===5&&[tag,nestTag,rustTag].every(x=>/^[a-z0-9-]{1,35}$/.test(x??'')));
const runId=randomUUID(),dummy='95000000-0000-4000-8000-0000000000ff';
const iSpec=JSON.parse(readFileSync(new URL('./i-openapi.json',import.meta.url)));
const iGuards=Object.entries(iSpec.paths).flatMap(([path,item])=>Object.entries(item).filter(([method])=>['get','post','patch','put','delete'].includes(method)).map(([method,operation])=>({name:'I guard '+operation.operationId,method:method.toUpperCase(),path:path.replaceAll('{id}',dummy),operationId:operation.operationId,access:method==='get'?'read':'write',...(method==='get'?{}:{rawBody:'{}',contentType:'application/json'})})));
const guards=[...iGuards,...jGuards()];assert.equal(guards.length,25);assert.equal(new Set(guards.map(c=>c.operationId)).size,25);
const iCases=iValidation().filter(c=>c.rawBody===undefined||/^[\s]*[\[{]/.test(c.rawBody));
const validations=[...iCases,...jValidation()];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function ordered(value){if(Array.isArray(value))return value.map(ordered);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));return value;}
const canonicalHash=value=>hash(ordered(value));
const report={formatVersion:1,tag,runId,at:new Date().toISOString(),result:'pending',scope:'Actual 25-operation route/session/CSRF/permission and source-expressible Zod HTTP surface; no mocks',counts:{operations:25,bodyAndQueryValidationCases:validations.length,iValidationCases:iCases.length,jValidationCases:jValidation().length},backends:[]};
async function pool(items,run,concurrency=4){let next=0;const values=new Array(items.length);await Promise.all(Array.from({length:concurrency},async()=>{for(;;){const at=next++;if(at>=items.length)return;values[at]=await run(items[at],at);}}));return values;}
for(const [backend,ownerTag] of [['nest',nestTag],['rust',rustTag]]){
    let fixture;const item={backend,ownerTag,result:'pending',cases:[],failures:[]};
    try{
        const owner=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`));assert.equal(owner.backend,backend);process.kill(owner.pid,0);item.binarySha256=owner.binarySha256;item.sourceHead=owner.sourceHead;
        fixture=await OwnedFixture.open(backend,runId);
        const admin=await fixture.login(owner.origin),viewer=await fixture.login(owner.origin,'viewer'),anonymous=new NavigationHttpSession(owner.origin,runId);
        const guardInputs=guards.flatMap(c=>[
            {...c,name:c.name+' anonymous',mode:'anonymous',expectedStatus:401},
            {...c,name:c.name+' viewer-denied',mode:'viewer',expectedStatus:403},
            ...(c.access==='write'?[{...c,name:c.name+' no-CSRF',mode:'no-csrf',expectedStatus:403},{...c,name:c.name+' bad-CSRF',mode:'bad-csrf',expectedStatus:403}]:[])
        ]);
        // Native Express exposes HEAD through existing GET operations. This
        // certifies an inherited method boundary, not new public inventory rows.
        for(const c of guards.filter(c=>c.method==='GET'))guardInputs.push({...c,name:c.name+' HEAD anonymous',method:'HEAD',mode:'anonymous',expectedStatus:401});
        const inputs=[...guardInputs,...validations.map(c=>({...c,mode:'dto',expectedStatus:400,expectedBody:c.body}))];
        item.guardCases=guardInputs.length;item.validationCases=validations.length;
        item.cases=await pool(inputs,async(c,index)=>{
            const session=c.mode==='anonymous'?anonymous:c.mode==='viewer'?viewer:admin;
            const options={requestId:`r2ij:${runId}:${index}`};
            if(c.rawBody!==undefined){options.body=Buffer.isBuffer(c.rawBody)?c.rawBody:Buffer.from(c.rawBody);options.contentType=c.contentType??'application/json';}
            if(c.mode==='no-csrf')options.csrf=false;if(c.mode==='bad-csrf')options.csrf='r2ij-deliberately-invalid-csrf';
            const result=await fixture.request(session,c.method,c.path,options);
            const entry={index,name:c.name,method:c.method,path:c.path,operationId:c.operationId??null,sourceCase:c.sourceCase??null,requestBodySha256:options.body?createHash('sha256').update(options.body).digest('hex'):null,status:result.status,expectedStatus:c.expectedStatus,response:result.body,responseCanonicalSha256:canonicalHash(result.body)};
            try{assert.equal(result.status,c.expectedStatus);if(c.expectedBody!==undefined)assert.deepEqual(result.body,c.expectedBody);entry.result='pass';}
            catch{entry.result='fail';entry.expectedBody=c.expectedBody??null;item.failures.push({index,name:c.name,status:result.status,expectedStatus:c.expectedStatus,response:result.body,expectedBody:c.expectedBody??null});}
            return entry;
        });
        assert.equal(item.failures.length,0,'HTTP surface mismatches');item.result='pass';
    }catch(error){item.result='fail';item.failure={name:error.name,message:error.message};process.exitCode=1;}
    finally{
        if(fixture){try{item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert.equal(item.cleanup2.changed,0);assert.equal(item.cleanup2.matched,0);assert(item.cleanup2.zero);}catch(error){item.result='fail';item.cleanupFailure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}await fixture.close();}
    }
    report.backends.push(item);
    // Validation mismatches do not authorize business writes; preserve any
    // unexpected unregistered row and stop before starting another backend.
    if(item.result!=='pass')break;
}
try{
    assert.equal(report.backends.length,2);assert(report.backends.every(item=>item.result==='pass'));
    const a=report.backends[0].cases,b=report.backends[1].cases;assert.equal(a.length,b.length);
    for(let i=0;i<a.length;i++)assert.deepEqual({name:b[i].name,status:b[i].status,response:b[i].response},{name:a[i].name,status:a[i].status,response:a[i].response});
    report.result='pass';
}catch(error){report.result='fail';report.comparisonFailure={name:error.name,message:error.message};process.exitCode=1;}
writeFileSync(`tmp/rust-r2ij/surface-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,counts:report.counts,backends:report.backends.map(item=>({backend:item.backend,result:item.result,cases:item.cases.length,guards:item.guardCases,validations:item.validationCases,failures:item.failures.slice(0,8),failure:item.failure,cleanupFailure:item.cleanupFailure,cleanup:item.cleanup2&&{matched:item.cleanup2.matched,changed:item.cleanup2.changed,zero:item.cleanup2.zero}})),comparisonFailure:report.comparisonFailure}));
