// Controlled CDP acknowledgements and raw-header records. No browser or HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {installUncachedUiInput,originalBrowserCacheConditions} from './ui-runtime-cache.mjs';
const receipt={file:'/home/wangzishi/.local/share/poms-r2m/private/pure-cache/input.json',bytes:10,rawBytesSha256:'a'.repeat(64)};

test('a real attached-session command sequence must acknowledge disabled cache before the first navigation can continue',async()=>{
    const events=[],records=[];let acknowledge;
    const page={url:()=> 'about:blank'},session={async send(method,params){events.push({method,params});if(method==='Network.setCacheDisabled')await new Promise(resolve=>acknowledge=resolve);return{}},detach(){assert.fail('Cache session must remain attached until owned context close')}};
    const context={async newCDPSession(actual){assert.strictEqual(actual,page);events.push('attach-original-page');return session}};
    let navigated=false;const run=async()=>{const input=await installUncachedUiInput({context,page,sourceCapId:'controlled-source',async retain(value){records.push(value);return receipt}});navigated=true;return input};
    const pending=run();await new Promise(resolve=>setImmediate(resolve));assert.equal(navigated,false);acknowledge();const input=await pending;
    assert.deepEqual(events,['attach-original-page',{method:'Network.enable',params:{}},{method:'Network.setCacheDisabled',params:{cacheDisabled:true}}]);assert.equal(navigated,true);
    assert.equal(records[0].kind,'actual-browser-controlled-uncached-input');assert.equal(records[0].record.pageUrlBeforeFirstNavigation,'about:blank');assert.equal(records[0].record.commands.length,2);assert.equal(input.appliedBeforeFirstNavigation,true);assert.deepEqual(input.actualCDPAcknowledged[1],{method:'Network.setCacheDisabled',params:{cacheDisabled:true},ack:{}});assert.equal(input.privateEvidence.rawBytesSha256,receipt.rawBytesSha256);assert.equal(input.sessionCloseOwner,'same-owned-browser-context');
});

test('an already navigated page, a failed real command or failed private retention cannot certify a cache input',async()=>{
    let attached=0;await assert.rejects(()=>installUncachedUiInput({context:{async newCDPSession(){attached++}},page:{url:()=> 'http://127.0.0.1:10080/dashboard'},sourceCapId:'pure',retain:async()=>receipt}));assert.equal(attached,0);
    const original=new Error('controlled original CDP failure');let retained=0;
    await assert.rejects(()=>installUncachedUiInput({context:{async newCDPSession(){return{async send(){throw original}}}},page:{url:()=> 'about:blank'},sourceCapId:'pure',retain:async()=>{retained++;return receipt}}),error=>error===original);assert.equal(retained,0);
    const retention=new Error('controlled original private retention failure');await assert.rejects(()=>installUncachedUiInput({context:{async newCDPSession(){return{async send(){return{}}}}},page:{url:()=> 'about:blank'},sourceCapId:'pure',async retain(){throw retention}}),error=>error===retention);
});

test('the original actual conditional headers are measured with their real spelling/value and are never stripped or changed',()=>{
    const request={headers:{'if-none-match':'real-etag','if-modified-since':'real-time','if-match':'business-version'},rawHeaders:['Host','127.0.0.1:10080','If-None-Match','real-etag','IF-MODIFIED-SINCE','real-time','If-Match','business-version']},before=structuredClone(request);
    const evidence=originalBrowserCacheConditions(request);assert.deepEqual(evidence.names,['if-none-match','if-modified-since']);assert.equal(evidence.count,2);assert.equal(evidence.absent,false);assert.equal(evidence.conditionalValuesSha256,createHash('sha256').update(JSON.stringify([{name:'if-none-match',value:'real-etag'},{name:'if-modified-since',value:'real-time'}])).digest('hex'));assert.deepEqual(request,before);assert.equal(evidence.headersChanged,false);assert(!JSON.stringify(evidence).includes('real-etag'));
    assert.deepEqual(originalBrowserCacheConditions({rawHeaders:['Host','127.0.0.1:10080','If-Match','business-version']}).names,[]);
});

test('both Linux owners and the true Windows owner apply the same new source-bound input before invoking any UI navigation',()=>{
    for(const file of['tools/rust-r2m/ui-runtime-full.mjs','tools/rust-r2m/ui-runtime.mjs','tools/rust-r2m/windows-ui-driver.mjs']){
        const body=fs.readFileSync(file,'utf8');assert(body.includes("from './ui-runtime-cache.mjs'"));assert(body.includes("'tools/rust-r2m/ui-runtime-cache.mjs'"));const command=body.indexOf('await installUncachedUiInput('),journey=body.indexOf('await runUiJourneys(');assert(command>0&&journey>command,file);assert(body.indexOf('await context.newPage()')<command);
    }
    const server=fs.readFileSync('tools/rust-r2m/ui-runtime-server.mjs','utf8');assert(server.includes('row.originalBrowserCacheConditions=originalBrowserCacheConditions(requestRecord)'));assert(server.includes('const headers={...request.headers,'));assert(!server.includes("delete headers['if-none-match']"));
});
