// Real caller/callee/decoder functions over Fake HTTP only. No Native factory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {WindowsNativeUiHttpSession} from './windows-ui-http-session.mjs';
import {createDispatch} from './acceptance-dispatch.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=b=>createHash('sha256').update(b).digest('hex');
const runId='10000000-0000-4000-8000-000000000001',correlationId='m-ui-source-20000000-0000-4000-8000-000000000001';
const context={runId,caseId:'m.ui3.integration',index:1,op:'m.producer'};
function original(name){return fs.readFileSync(new URL('./'+name,import.meta.url),'utf8')}
function select(text,predicate){const tree=ts.createSourceFile('source.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),found=[];function visit(n){if(predicate(n))found.push(n);ts.forEachChild(n,visit)}visit(tree);assert.equal(found.length,1);return found[0].getText(tree)}
const server=original('windows-native-server.mjs'),app=original('windows-native-app.mjs');
const requestSource=select(server,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='request');
const validationSource=select(server,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='validateNativeContext');
const uuidSource=select(server,n=>ts.isVariableDeclaration(n)&&n.name.getText()==='uuid');
const idSource=select(server,n=>ts.isVariableDeclaration(n)&&n.name.getText()==='nativeRequestId');
const routesSource=select(server,n=>ts.isVariableDeclaration(n)&&n.name.getText()==='nativeProducerRoutes');
const decoderSource=select(app,n=>ts.isMethodDeclaration(n)&&n.name.getText()==='request');
const validate=new Function('assert','const '+uuidSource+';'+validationSource.replace(/^export /,'')+';return validateNativeContext;')(assert);
const requestId=new Function('sha','const '+idSource+';return nativeRequestId;')(sha);
const nativeOnly=new Function('const '+routesSource+';return nativeProducerRoutes;')();
function model({corruptResponse=false}={}){
    const contexts=new Map([[correlationId,{...context}]]),admittedContexts=new Map(),calls=[],wire=[],rpcPayloads=[];
    const dispatch=createDispatch({surface:JSON.parse(fs.readFileSync('docs/design/rust-r2m/acceptance-input.json')).sourceProtection.currentSurface,nativeOnly});
    const fakeHttp={validateHeaderName:http.validateHeaderName,validateHeaderValue:http.validateHeaderValue,request(options,callback){const outgoing=new EventEmitter();outgoing.setTimeout=ms=>{assert.equal(ms,25000);return outgoing};outgoing.destroy=()=>{};outgoing.end=payload=>{wire.push({options:structuredClone(options),payload:payload===undefined?undefined:Buffer.from(payload)});queueMicrotask(()=>{const incoming=new EventEmitter();incoming.statusCode=200;incoming.headers={'content-type':'application/json','set-cookie':['poms_session=synthetic-session; Path=/api; HttpOnly','poms_csrf=synthetic-csrf; Path=/api']};callback(incoming);incoming.emit('data',Buffer.from('{"ok":true}'));incoming.emit('end')})};return outgoing}};
    const actualCallee=new Function('assert','http','dispatch','admittedContexts','runId','nativeRequestId','sha',requestSource+';return request;')(assert,fakeHttp,dispatch,admittedContexts,runId,requestId,sha);
    const rpc=async(name,payload,timeout)=>{calls.push('request');assert.equal(name,'request');assert.equal(timeout,35000);rpcPayloads.push(payload);const response=await actualCallee(payload);if(corruptResponse)response.bodyBytesSha256='0'.repeat(64);return response};
    const decodedRequest=new Function('assert','rpc','admittedContexts','nativeRequestId','sha','return new(class{'+decoderSource+'})().request;')(assert,rpc,admittedContexts,requestId,sha);
    const native={async admitContext(id,value){calls.push('admit');const exact=validate(id,value,runId);admittedContexts.set(id,exact);return{admitted:true,platform:'win32',windowsPid:190001}},request:decodedRequest};
    const session=new WindowsNativeUiHttpSession({runId,userId:'30000000-0000-4000-8000-000000000001',native,contexts});
    const input={executionBackend:'nest',method:'GET',path:'/api/auth/csrf-token',requestId:requestId(context),correlationId};
    return{session,input,native,contexts,admittedContexts,actualCallee,calls,wire,rpcPayloads};
}
test('the actual caller crosses the original server guard and decoder: reserved transport headers are injected only by the real callee',async()=>{
    const m=model(),response=await m.session.request(m.input);assert.deepEqual(m.calls,['admit','request']);assert.equal(response.status,200);assert.deepEqual(response.body,{ok:true});assert.equal(response.bodyBytesSha256,sha(response.bodyBytes));assert.equal(response.bodyBytesLength,response.bodyBytes.length);
    const sent=m.rpcPayloads[0],wire=m.wire[0].options;for(const name of['host','connection','user-agent','x-request-id','x-correlation-id','content-length'])assert(!Object.hasOwn(sent.headers,name));assert.equal(sent.requestId,m.input.requestId);assert.equal(sent.correlationId,correlationId);assert.equal(wire.headers.host,'127.0.0.1:10070');assert.equal(wire.headers.connection,'close');assert.equal(wire.headers['user-agent'],'poms-r2m-fixture/'+runId);assert.equal(wire.headers['x-request-id'],m.input.requestId);assert.equal(wire.headers['x-correlation-id'],correlationId);assert.equal(wire.headers['x-forwarded-for'],'192.0.2.25');assert.equal(wire.hostname,'127.0.0.1');assert.equal(wire.port,10070);
});
test('real JSON UTF8, binary and empty-body bytes retain SHA/content-type/byte-length while the callee alone computes content-length',async()=>{
    for(const body of[{expectedVersion:1,note:'中文💾'},Buffer.from([0,255,0,65]),Buffer.alloc(0)]){const m=model();await m.session.request(m.input);const input={...m.input,method:'POST',path:'/api/contracts/40000000-0000-4000-8000-000000000001:submitReview',body},expected=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));await m.session.request(input);const rpc=m.rpcPayloads.at(-1),wire=m.wire.at(-1);assert(!Object.hasOwn(rpc.headers,'content-length'));assert.equal(sha(Buffer.from(rpc.bodyBase64,'base64')),sha(expected));assert.equal(sha(wire.payload),sha(expected));assert.equal(wire.options.headers['content-length'],String(expected.length));assert.equal(wire.options.headers['content-type'],Buffer.isBuffer(body)?'application/octet-stream':'application/json');assert(wire.options.headers.cookie.includes('poms_session=synthetic-session'));assert.equal(wire.options.headers['x-csrf-token'],'synthetic-csrf')}
});
test('cookie jar, explicit CSRF disable/value and explicit content-type/custom headers keep their original request semantics',async()=>{
    const m=model();await m.session.request(m.input);const input={...m.input,method:'POST',path:'/api/contracts/40000000-0000-4000-8000-000000000001:submitReview',body:{expectedVersion:1},csrf:false,contentType:'application/vnd.synthetic+json',headers:{'x-synthetic-input':'exact'}};await m.session.request(input);let headers=m.wire.at(-1).options.headers;assert(headers.cookie.includes('poms_csrf=synthetic-csrf'));assert(!Object.hasOwn(headers,'x-csrf-token'));assert.equal(headers['content-type'],input.contentType);assert.equal(headers['x-synthetic-input'],'exact');await m.session.request({...input,csrf:'explicit-synthetic-csrf'});assert.equal(m.wire.at(-1).options.headers['x-csrf-token'],'explicit-synthetic-csrf');
});
test('caller does not silently strip supplied reserved headers; all case variants reject before the HTTP RPC',async()=>{
    for(const name of['host','connection','content-length','x-request-id','x-correlation-id','user-agent','Host','X-Request-Id','USER-AGENT','cookie','set-cookie','authorization']){const m=model();await assert.rejects(()=>m.session.request({...m.input,headers:{[name]:'synthetic'}}));assert.equal(m.wire.length,0);assert.equal(m.rpcPayloads.length,0)}
});
test('the unchanged real server guard still rejects direct reserved-header injection, wrong request identity and a missing admitted context',async()=>{
    for(const name of['host','connection','content-length','x-request-id','x-correlation-id','user-agent']){const m=model();await m.native.admitContext(correlationId,context);await assert.rejects(()=>m.actualCallee({method:m.input.method,path:m.input.path,correlationId,requestId:m.input.requestId,purpose:'producer',headers:{[name]:'synthetic'}}));assert.equal(m.wire.length,0)}
    const m=model();await assert.rejects(()=>m.session.request({...m.input,requestId:'foreign-synthetic-id'}));assert.equal(m.wire.length,0);const other=model();await assert.rejects(()=>other.actualCallee({method:other.input.method,path:other.input.path,correlationId,requestId:other.input.requestId,purpose:'producer'}));assert.equal(other.wire.length,0);
});
test('the actual decoder/response SHA check still rejects corrupt bytes and never invents a successful HTTP result',async()=>{const m=model({corruptResponse:true});await assert.rejects(()=>m.session.request(m.input));assert.equal(m.wire.length,1);assert.equal(m.session.cookies.size,0)});
