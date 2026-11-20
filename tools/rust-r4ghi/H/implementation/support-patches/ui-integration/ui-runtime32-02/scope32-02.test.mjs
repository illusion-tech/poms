// Execute the actual tool failure branch in a VM with no browser/network/filesystem.
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import vm from'node:vm';import{createHash}from'node:crypto';
const file='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/browser-cases14.mjs';
async function failedBeforeNavigation(source){
 const records=[];let closed=false,settled=false,observed=false;
 const context={addCookies:async()=>{throw new Error('pure-stop-before-any-navigation');},newPage:async()=>({setDefaultTimeout(){},on(){},content:async()=>'<html>pure failure branch</html>',screenshot:async()=>{}}),close:async()=>{closed=true;}};
 const box={assert,path,Buffer,createHash,fs:{writeFileSync(name,bytes){records.push({name,bytes});},chmodSync(){}},performWriteAction14(){throw new Error('No business behavior allowed in this test');},executeCreatorReadback29(){throw new Error('Not this branch');},observeFontBoundary32(){observed=true;return{snapshot:()=>({pureObserved:true})};},extracted:null};
 const code=source.replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'')+'\nextracted=executeCase;';vm.runInNewContext(code,box,{timeout:1000});
 const result=await box.extracted({newContext:async()=>context},null,{kind:'own-condition',actor:{cookies:{synthetic:'unit-only'}},forbiddenTexts:[]},'/private/pure-only',{exchanges:[],settle:async()=>{settled=true;}});
 return{result,records,closed,settled,observed};
}
test('sealed32 reproduces the out-of-scope finally failure without sending any HTTP',async()=>{const old=fs.readFileSync(new URL('../ui-runtime32/proposed/'+file,import.meta.url),'utf8');await assert.rejects(()=>failedBeforeNavigation(old),{name:'ReferenceError'});});
test('32-02 retains original failed status and still captures metadata/closes after early failure',async()=>{const current=fs.readFileSync(new URL('./proposed/'+file,import.meta.url),'utf8'),r=await failedBeforeNavigation(current);assert.equal(r.result.status,'failed');assert.equal(r.result.businessWritePerformed,false);assert(r.observed&&r.closed&&r.settled);assert(r.records.some(x=>path.basename(x.name)==='font-boundary32.json'));assert(r.records.some(x=>path.basename(x.name)==='failure.log'));});
