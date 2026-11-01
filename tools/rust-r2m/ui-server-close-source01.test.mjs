// The real production factory executes in a VM with in-memory HTTP objects.
// No port, HTTP request, browser, DB, private file or container is opened.
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {startManagedUiServer} from './ui-runtime-server.mjs';
import {originalBrowserCacheConditions} from './ui-runtime-cache.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});void promise.catch(()=>{});return{promise,resolve,reject}}
class Response extends EventEmitter{constructor(){super();this.headersSent=false;this.writableEnded=false}writeHead(status){this.status=status;this.headersSent=true}end(){this.writableEnded=true}destroy(){this.destroyed=true;this.emit('close')}}
async function harness(){
    const before=deferred(),raw=deferred(),after=deferred(),errorEvidence=deferred(),timers=new Map(),records=[],network=[];let listener,closeCalls=0,timerId=0,afterCalls=0;
    const server=new EventEmitter();server.listen=(port,host,done)=>{assert.equal(port,10080);assert.equal(host,'127.0.0.1');done()};server.close=done=>{closeCalls++;done()};server.closeIdleConnections=()=>{};
    const http={createServer(callback){listener=callback;return server},request(options,callback){const upstream=new EventEmitter();upstream.end=bytes=>{upstream.sent=Buffer.from(bytes)};upstream.destroy=()=>{upstream.emit('error',new Error('controlled owned upstream abort'));upstream.emit('close')};network.push({options,callback,upstream});return upstream}};
    const factory=vm.runInNewContext('('+startManagedUiServer.toString()+')',{assert,http,Buffer,Date,Promise,Set,MAX_BYTES:32*1024*1024,mime:{},sha,originalBrowserCacheConditions,nativeProducerRoutes:[],verifyUiBuild:()=>({root:'/controlled-public-build',pins:new Map(),manifestSha256:'b'.repeat(64)}),createDispatch:()=>({resolve:()=>({executionBackend:'rust',routeTemplate:'/api/me/todos'})}),setTimeout(fn,ms){assert.equal(ms,10000);const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}});
    const proxy=await factory({backend:'rust',input:{sourceProtection:{currentSurface:[]}},sourceCapId:'controlled-only',buildDirectory:'/controlled-public-build',buildFiles:[],onBeforeExchange:()=>before.promise,onAfterExchange:()=>{afterCalls++;return after.promise},async retain(value){records.push(value);if(value.kind==='actual-browser-proxy-raw-HTTP')await raw.promise;else if(value.kind==='actual-browser-proxy-private-original-failure')await errorEvidence.promise;return{file:'/home/wangzishi/.local/share/poms-r2m/private/pure-close/'+records.length+'.json',bytes:1,rawBytesSha256:'a'.repeat(64),private:true}}});
    const request={url:'/api/me/todos',method:'GET',headers:{},rawHeaders:[],async *[Symbol.asyncIterator](){yield Buffer.from('controlled-request-bytes')}},response=new Response();
    const handler=listener(request,response);void handler.catch(()=>{});
    const accept=()=>before.resolve({requestId:'controlled-owned-request',correlationId:'controlled-owned-context',userAgent:'controlled-agent',caseId:'m.ui3.integration',index:17});
    function completeUpstream(){assert.equal(network.length,1);const n=network[0],actual=new EventEmitter();actual.statusCode=200;actual.headers={'content-type':'application/json'};actual.rawHeaders=['Content-Type','application/json'];actual.pipe=target=>{actual.once('end',()=>target.end());return target};n.callback(actual);actual.emit('data',Buffer.from('{"controlled":true}'));actual.emit('end');n.upstream.emit('close')}
    return{proxy,before,raw,after,errorEvidence,records,network,response,handler,accept,completeUpstream,closeCalls:()=>closeCalls,afterCalls:()=>afterCalls,fireDeadline(){assert.equal(timers.size,1);for(const fn of [...timers.values()])fn()}};
}

test('socket closure cannot finish close before a queued before-hook, its later upstream, raw retainer and after-certificate all settle',async()=>{
    const h=await harness();await flush();let returned=false;const close=h.proxy.close().then(()=>{returned=true});assert.strictEqual(h.proxy.close(),h.proxy.close());await flush();assert.equal(h.closeCalls(),1);assert.equal(returned,false);assert.equal(h.proxy.report.closed,false);
    h.accept();await flush();assert.equal(h.network.length,1);assert.equal(returned,false);h.completeUpstream();await flush();assert(h.records.some(x=>x.kind==='actual-browser-proxy-raw-HTTP'));assert.equal(returned,false);
    h.raw.resolve();await flush();assert.equal(returned,false);h.after.resolve();await close;
    assert.equal(h.proxy.report.closed,true);assert.equal(h.proxy.report.ownedWorkSettled,true);for(const n of Object.values(h.proxy.report.closeCounts))assert.equal(n,0);assert.equal(h.network[0].upstream.sent.toString(),'controlled-request-bytes');assert.equal(h.records.find(x=>x.kind==='actual-browser-proxy-raw-HTTP').record.response.bodyBase64,Buffer.from('{"controlled":true}').toString('base64'));
});

test('the original after-hook error remains private and close rejects that same error only after its retention settles',async()=>{
    const h=await harness(),original=Object.assign(new Error('controlled-private-original-certificate-error'),{code:'PURE_CERT'});h.accept();await flush();h.completeUpstream();h.raw.resolve();await flush();let settled=false;const close=h.proxy.close();void close.then(()=>{settled=true},()=>{settled=true});h.after.reject(original);await flush();assert.equal(settled,false);const record=h.records.find(x=>x.kind==='actual-browser-proxy-private-original-failure');assert.equal(record.record.error.message,original.message);assert.equal(record.record.error.stack,original.stack);
    h.errorEvidence.resolve();await assert.rejects(()=>close,error=>error===original);assert.equal(h.proxy.report.closed,false);assert.equal(h.proxy.report.ownedWorkSettled,true);for(const n of Object.values(h.proxy.report.closeCounts))assert.equal(n,0);assert(!JSON.stringify(h.proxy.report).includes(original.message));assert(h.proxy.report.failureEvidence.some(x=>x.privateEvidence));
});

test('an original queued admission failure cannot become zero pending evidence while its handler and final raw record are still live',async()=>{
    const h=await harness(),original=new Error('controlled-original-before-hook-error');let settled=false;const close=h.proxy.close();void close.then(()=>{settled=true},()=>{settled=true});h.before.reject(original);await flush();assert.equal(settled,false);assert.equal(h.network.length,0);assert.equal(h.proxy.report.closed,false);
    h.errorEvidence.resolve();await flush();assert.equal(h.response.status,502);assert.equal(settled,false);h.raw.resolve();await flush();assert.equal(settled,false);h.after.resolve();await assert.rejects(()=>close,error=>error===original);assert.equal(h.proxy.report.ownedWorkSettled,true);assert.equal(h.proxy.report.closeCounts.ownedWork,0);
});

test('the existing close bound records real outstanding handlers and never turns a timed-out close into a later success',async()=>{
    const h=await harness(),close=h.proxy.close();await flush();h.fireDeadline();await assert.rejects(()=>close,error=>error.code==='R2M_UI_SERVER_WORK_UNSETTLED');assert.equal(h.proxy.report.closeTimedOut,true);assert.equal(h.proxy.report.closed,false);assert(h.proxy.report.unsettledAtTimeout.handlers>0);assert(h.proxy.report.unsettledAtTimeout.ownedWork>0);assert.equal(h.proxy.report.forcedOwnedSocketClose,undefined);
    h.accept();await flush();h.completeUpstream();h.raw.resolve();h.after.resolve();h.errorEvidence.resolve();await h.handler;await flush();assert.equal(h.proxy.report.closed,false);await assert.rejects(()=>h.proxy.close(),error=>error.code==='R2M_UI_SERVER_WORK_UNSETTLED');assert.equal(h.closeCalls(),1);
});

test('a failed original raw retainer cannot run a false after-certificate or hide its original error at close',async()=>{
    const h=await harness(),original=new Error('controlled-private-original-raw-retention-error');h.accept();await flush();h.completeUpstream();const close=h.proxy.close();void close.catch(()=>{});h.raw.reject(original);await flush();assert.equal(h.afterCalls(),0);assert.equal(h.proxy.report.closed,false);assert(h.records.some(x=>x.kind==='actual-browser-proxy-private-original-failure'&&x.record.error.message===original.message));h.errorEvidence.resolve();await assert.rejects(()=>close,error=>error===original);assert.equal(h.proxy.report.ownedWorkSettled,true);assert.equal(h.proxy.report.closeCounts.ownedWork,0);assert.equal(h.proxy.report.closed,false);assert(!JSON.stringify(h.proxy.report).includes(original.message));
});
