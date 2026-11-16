import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {__reviewCloseModel118} from './native-model01/tools/rust-r4ghi/business/runtime-admission121.mjs';
const work='E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-review01';
const run=fs.realpathSync(fs.mkdtempSync(work+'/native-model-'));
const pin=name=>({file:'/review-owned/'+name,bytes:0,rawBytesSha256:'a'.repeat(64)}),facts={exitGuard:pin('exit.json'),closedJournal:pin('closed.json'),result:null};
const results=[];
for(const variant of ['success','primary-close-failure','measurement-after-primary','measurement-after-success','profile-write-failure']){
 const dir=path.join(run,variant);fs.mkdirSync(dir);let proofCalls=0,bodyCompleted=false;
 if(variant==='profile-write-failure')fs.writeFileSync(path.join(dir,'performance-profile118.json'),'PRESERVE-EXISTING',{flag:'wx'});
 const proof=async()=>{proofCalls++;fs.writeFileSync(path.join(dir,'owned-proof-terminal.json'),JSON.stringify({owned:true,variant})+'\n',{flag:'wx'});bodyCompleted=true;if(['primary-close-failure','measurement-after-primary'].includes(variant)){const e=Error('OWNED_PRIMARY');Object.defineProperty(e,'budgetCloseFacts',{value:facts});throw e;}return facts;};
 const model=__reviewCloseModel118(proof,dir),original=process.memoryUsage;let memoryCalls=0,caught,value;
 if(variant.startsWith('measurement-'))process.memoryUsage=function(...args){if(++memoryCalls===2)throw Error('OWNED_MEASUREMENT_FAILURE');return original.apply(this,args);};
 try{value=await model.close();}catch(e){caught=e;}finally{process.memoryUsage=original;}
 let secondRefused=false;try{await model.close();}catch{secondRefused=true;}
 const state=model.state();
 const result={variant,scope:'Full 285-module own-I/O control-flow model; only liveness adapted, not real runtime acceptance',proofCalls,bodyCompleted,valueReturned:Boolean(value),surfacedError:Boolean(caught),surfacedCloseFacts: Boolean(caught?.budgetCloseFacts),nativeStoredCloseFacts:Boolean(state.closeFacts),nativeStoredResult:Boolean(state.closeResult),closed:state.closed,closeAttempted:state.closeAttempted,profileUnavailable:state.profileUnavailable,profileOpenPhases:state.profile?.openPhases??null,secondCloseRefused:secondRefused};
 if(variant==='success'){assert(value);assert.equal(state.closed,true);}
 if(variant==='primary-close-failure'){assert(caught?.budgetCloseFacts);assert(state.closeFacts);}
 if(variant==='measurement-after-primary'){assert(!caught?.budgetCloseFacts);assert(!state.closeFacts);result.confirmedDefect='Primary close facts lost because measurement error replaced primary';}
 if(variant==='measurement-after-success'){assert(!value&&!state.closeResult&&!state.closeFacts);result.confirmedDefect='Proof completed, metric fault prevented Native preserving its success facts';}
 if(variant==='profile-write-failure'){assert(value);assert.equal(state.profileUnavailable,true);assert.equal(fs.readFileSync(path.join(dir,'performance-profile118.json'),'utf8'),'PRESERVE-EXISTING');}
 assert.equal(proofCalls,1);assert(secondRefused);results.push(result);
}
const output={kind:'independent-runtime118-full-module-close-model',schemaVersion:1,reviewer:'/root/performance118_independent_review01',reviewerIsAuthor:false,reviewedCommit:'72275c80e92fad30bb736af3c5e5ee5a00731739',ownedRun:run,actualRuntimeAuthority:false,actualTaskEffects:{SQL:0,HTTP:0,Auth:0,newSnapshots:0,probes:0,WSLStarts:0},results};
const file=path.join(run,'results.json');fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,results}));
