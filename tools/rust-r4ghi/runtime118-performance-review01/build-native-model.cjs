'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',out=root+'/tools/rust-r4ghi/runtime118-performance-review01/native-model01';
assert(!fs.existsSync(out),'Preserve prior model; no overwrite');
const manifest=JSON.parse(fs.readFileSync(root+'/tools/rust-r4ghi/runtime118-performance-candidate01/execution-manifest.json'));
const sha=b=>createHash('sha256').update(b).digest('hex'),copies=[];
for(const p of manifest.graph){const b=fs.readFileSync(p.candidate.file);assert.equal(sha(b),p.candidate.rawBytesSha256);const file=out+'/'+p.relative;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,b,{flag:'wx'});copies.push({candidate:p.candidate,model:file});}
const native=out+'/tools/rust-r4ghi/business/runtime-admission121.mjs';
const adapter=`
// REVIEW-ONLY ADAPTER. Not an admitted runtime. The original full 285 modules
// remain above; only liveness input is replaced for owned control-flow models.
budgetLive118 = function(b){assert.equal(b.__reviewOnly,true);assert.equal(b.pid,process.pid);return b;};
export function __reviewCloseModel118(proof,dir){
 const state={},root={state};const methods={};for(const name of rootMethods121){root[name]=function(){throw Error('No actual Root method in independent code model');};methods[name]=root[name];}
 const brand={type:'root',purpose:'budget-probe',root,state,methods,facts:{plan:{protocolVersion:5}}};brands121.set(root,brand);
 const b={__reviewOnly:true,root,pid:process.pid,proof:{closeBudgetInvocation118:proof},dir,closed:false,closeAttempted:false,activeTicket:null,activeOperation:null,stage:'after',failed:false,port:null};
 return {close:()=>budgetClose118(b,null),state:()=>({closed:b.closed,closeAttempted:b.closeAttempted,closeFacts:b.closeFacts??null,closeResult:b.closeResult??null,profileUnavailable:b.performanceProfileUnavailable??false,profile:b.performanceProfile??null})};
}
`;
fs.appendFileSync(native,adapter);
const bytes=fs.readFileSync(native);fs.writeFileSync(out+'/review-model-manifest.json',JSON.stringify({kind:'independent-full-module-control-flow-model',reviewerIsAuthor:false,actualRuntimeAuthority:false,copyCount:copies.length,copies,onlyModifiedFile:native,adapterDescription:'Liveness replaced by explicit review-only b identity; private Root brand/ticket/dispatch/close/error projection remain original; proof callee writes owned fixtures only',modelNativeSHA256:sha(bytes),reviewAdapterSHA256:sha(Buffer.from(adapter)),realSQLHTTPAuthSnapshotEffects:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({model:out,copyCount:copies.length,adaptedNative:native}));
