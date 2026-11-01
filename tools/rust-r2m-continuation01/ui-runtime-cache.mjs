// Explicit browser input for a new UI epoch. No browser launch or I/O on import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function installUncachedUiInput({context,page,sourceCapId,retain}){
    assert.equal(page.url(),'about:blank','The real cache command must precede the first navigation');
    assert.equal(typeof context.newCDPSession,'function');assert.equal(typeof retain,'function');assert.equal(typeof sourceCapId,'string');
    const session=await context.newCDPSession(page),commands=[];
    for(const [method,params]of[['Network.enable',{}],['Network.setCacheDisabled',{cacheDisabled:true}]]){
        const window={startedAt:new Date().toISOString()},ack=await session.send(method,params);window.finishedAt=new Date().toISOString();
        assert.deepEqual(ack,{},'Real Chromium CDP command acknowledgement required');commands.push({method,params,ack,window});
    }
    assert.equal(page.url(),'about:blank');
    const receipt=await retain({kind:'actual-browser-controlled-uncached-input',record:{sourceCapId,pageUrlBeforeFirstNavigation:page.url(),commands,cacheDisabled:true,CDPSessionOwner:'same-owned-browser-context',detachBeforeJourney:false,headersRewritten:false,oldCachedRunsReclassified:false}});
    assert(typeof receipt?.file==='string'&&receipt.file.startsWith('/home/wangzishi/.local/share/poms-r2m-continuation01/private/')&&Number.isSafeInteger(receipt.bytes)&&/^[0-9a-f]{64}$/.test(receipt.rawBytesSha256));
    // Keep this real CDP session attached for the entire owned context lifetime.
    // The existing browser/context owner closes it; no separate process is started.
    return{kind:'R2M-controlled-uncached-browser-input',sourceCapId,cacheDisabled:true,appliedBeforeFirstNavigation:true,actualCDPAcknowledged:commands.map(({method,params,ack})=>({method,params,ack})),privateEvidence:{file:receipt.file,bytes:receipt.bytes,rawBytesSha256:receipt.rawBytesSha256,private:true},sessionCloseOwner:'same-owned-browser-context',conditionalHeaderEvidence:'per-actual-exchange-original-rawHeaders'};
}

export function originalBrowserCacheConditions(request){
    assert(Array.isArray(request.rawHeaders)&&request.rawHeaders.length%2===0&&request.rawHeaders.every(x=>typeof x==='string'));
    const values=[];for(let at=0;at<request.rawHeaders.length;at+=2){const name=request.rawHeaders[at].toLowerCase();if(['if-none-match','if-modified-since'].includes(name))values.push({name,value:request.rawHeaders[at+1]})}
    return{source:'actual-original-IncomingMessage.rawHeaders',names:values.map(x=>x.name),count:values.length,absent:values.length===0,conditionalValuesSha256:sha(JSON.stringify(values)),headersChanged:false,originalValuesRetainedInPrivateRawHTTP:true};
}
