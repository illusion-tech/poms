// Pure Node promise scheduling only. No browser, DB, HTTP, or private files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {observeUiPending} from './acceptance-ui-browser.mjs';

test('observing a pending UI wait returns its original promise and preserves the exact later rejection',async()=>{
    const original=new Error('synthetic-original-response-timeout');let reject;
    const promise=new Promise((_,failed)=>{reject=failed});assert.strictEqual(observeUiPending(promise),promise);
    reject(original);await new Promise(resolve=>setTimeout(resolve,20));await assert.rejects(promise,error=>error===original);
});

test('strict Node does not terminate when HTTP and download waits reject before a slow click is awaited',()=>{
    const moduleUrl=new URL('./acceptance-ui-browser.mjs',import.meta.url).href;
    const source=`import assert from 'node:assert/strict';import {observeUiPending} from ${JSON.stringify(moduleUrl)};
        const errors=[new Error('synthetic-http-timeout'),new Error('synthetic-download-timeout')];
        const waits=errors.map(error=>observeUiPending(new Promise((_,reject)=>setTimeout(()=>reject(error),1))));
        await new Promise(resolve=>setTimeout(resolve,30));
        for(let at=0;at<waits.length;at++)await assert.rejects(waits[at],error=>error===errors[at]);
        assert.equal(await observeUiPending(Promise.resolve('actual-value-preserved')),'actual-value-preserved');`;
    const result=spawnSync(process.execPath,['--unhandled-rejections=strict','--input-type=module','-e',source],{encoding:'utf8',timeout:5000});
    assert.equal(result.status,0,result.stderr);assert.equal(result.signal,null);assert.equal(result.stdout,'');
});
