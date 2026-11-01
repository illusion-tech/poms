// Pure regression inputs only: no fixture/environment/HTTP resources are opened.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { actualSourceCase, preflightProbeScopes, restoreRetainedExpiredCookieSnapshot, uriProbeRequiresAnonymousScope } from './acceptance-runtime.mjs';
import { runProbeMatrix } from './acceptance.mjs';
import { sourceCapDigest } from './acceptance-source.mjs';
import { buildUriProbes } from './scenario-input.mjs';

const input=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'../../docs/design/rust-r2m/acceptance-input.json'),'utf8'));
const userId='10000000-0000-4000-8000-000000000001',runId='20000000-0000-4000-8000-000000000002',h='a'.repeat(64),candidate='b'.repeat(40);
const files=[{file:'source.txt',bytes:1,rawBytesSha256:h}],cap={kind:'r2m-source-cap',id:'pure-uri-regression',candidate,complete:true,privateCopied:false,files,manifestSha256:sourceCapDigest(files),artifacts:[{kind:'native-main',bytes:1,rawBytesSha256:h}]};
const frame=()=>({readOnly:true,complete:true,catalogDigest:h,columns:{role:['id']},primaryKeys:{role:['id']},rows:{role:[]},outsideScope:{complete:true,tablesScanned:107,unexpectedChanges:[]}});
function pureDependencies(request,facts=async()=>frame()){
    return{prepare:async({caseId})=>({caseId:actualSourceCase(caseId),requestId:'pure-only',sourceCapId:cap.id,businessProducerRequests:0,businessRowsInserted:0}),request,facts,certify:async({caseId})=>({complete:true,traceComplete:true,caseId,runId,sourceCapId:cap.id,unknownCreates:[],unknownMutations:[],registeredRows:[],ledgerDigest:h})};
}
const response=complete=>({status:400,body:{message:'synthetic-only'},bodyBytesSha256:h,bodyBytesLength:1,headers:{},executionBackend:'nest',transportComplete:complete});
const run=deps=>runProbeMatrix({kind:'uri',backend:'nest',candidate,sourceCap:cap,input,fixture:{runId},bindings:{actors:{viewer:userId},probeTables:['role']},deps,retain:async()=>({file:'pure-memory-only',rawBytesSha256:h})});

test('the actual URI scope constructor accepts all27 labels without modifying literal request inputs',()=>{
    const cells=buildUriProbes({userId}),original=structuredClone(cells),labels=cells.map(cell=>actualSourceCase('m0.'+cell.id));
    assert.equal(new Set(labels).size,27);assert(labels.every(label=>/^[a-z][a-z0-9_.-]{0,79}$/.test(label)));
    assert.deepEqual(cells,original);assert(cells.some(cell=>cell.path.endsWith('%FF')));assert(cells.some(cell=>cell.path.endsWith('%')));
    assert.equal(actualSourceCase('M0.uri.get.absent.invalid-UTF8'),'m0.uri.get.absent.invalid-utf8');
    assert.deepEqual(preflightProbeScopes(input),{surfaceBindingsChecked:115,uriScopesChecked:27});
    assert(cells.every(cell=>uriProbeRequiresAnonymousScope({caseId:'m0.'+cell.id,purpose:cell.purpose})));
    assert.equal(uriProbeRequiresAnonymousScope({caseId:'m1.1',purpose:'uri-order'}),false);assert.equal(uriProbeRequiresAnonymousScope({caseId:'m0.uri.get.retained-expired.valid-percent-owned-UUID',purpose:'business'}),false);
    assert.throws(()=>actualSourceCase('m0./not-a-label'));
});

test('27 attempted cells cannot become27 actual responses when18 requests fail before a response receipt',async()=>{
    const observed=await run(pureDependencies(async request=>{if(!request.path.endsWith('/%'))throw new Error('pure-before-transport-label-failure');return response(true)}));
    assert.equal(observed.report.result,'fail');assert.equal(observed.report.attempted,27);assert.equal(observed.report.actual,9);assert.equal(observed.report.transportCompleted,9);
    assert.equal(observed.report.cells.filter(cell=>!cell.transport.responseObserved).length,18);
    assert.equal(observed.report.cells.filter(cell=>cell.result==='fail').length,18);
});

test('actual response accounting survives a later facts failure and marks an interrupted response separately',async()=>{
    let requests=0;
    const observed=await run(pureDependencies(async()=>response(++requests!==1),async({phase})=>{if(phase==='after')throw new Error('pure-after-response-proof-failure');return frame()}));
    assert.equal(observed.report.result,'fail');assert.equal(observed.report.attempted,27);assert.equal(observed.report.actual,27);assert.equal(observed.report.transportCompleted,26);
    assert(observed.report.cells.every(cell=>cell.transport.responseObserved));assert.equal(observed.report.cells[0].transport.complete,false);
});

test('each expired cell reuses its issued cookie after a prior clearing response without resetting the session row',()=>{
    const token='pure-issued-token',tokenHash=createHash('sha256').update(token).digest('hex'),snapshot={kind:'r2m-owned-backend-issued-expired-cookie-snapshot',rowId:runId,userId,tokenHash,creationProofSha256:h,issuedBackend:'nest',sourceCapId:cap.id,cookies:[['poms_session',token],['poms_csrf','pure-issued-csrf']]};
    const handle={cookies:new Map()},row={id:runId,user_id:userId,token_hash:tokenHash,status:'active',revoked_reason:null,idle_expires_at:'2026-01-01T00:00:00.000Z',absolute_expires_at:'2027-01-01T00:00:00.000Z'},now=Date.parse('2026-10-31T00:00:00.000Z');
    for(let cell=0;cell<9;cell++){
        const before=structuredClone(row),condition=restoreRetainedExpiredCookieSnapshot(handle,snapshot,row,{now});assert.equal(handle.cookies.get('poms_session'),token);assert.equal(condition.tokenHash,tokenHash);assert.equal(condition.databaseStateReset,false);assert.deepEqual(row,before);
        // Model the previous real response's cookie-clearing effect. The next
        // cell must restore the same issued value even after active->expired.
        handle.cookies.clear();row.status='expired';
    }
    assert.throws(()=>restoreRetainedExpiredCookieSnapshot(handle,snapshot,{...row,status:'revoked'},{now}));
    assert.throws(()=>restoreRetainedExpiredCookieSnapshot(handle,snapshot,{...row,token_hash:'c'.repeat(64)},{now}));
    assert.throws(()=>restoreRetainedExpiredCookieSnapshot(handle,snapshot,{...row,idle_expires_at:'2027-01-01T00:00:00.000Z'},{now}));
});
