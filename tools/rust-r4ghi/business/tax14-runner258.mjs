#!/usr/bin/env node
// Source14-only driver. No Main creation mode exists. Help/import do no I/O.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {createContext,FIXED} from './context.mjs';
import {loadApprovedTax14Bindings,readRetainedTax14,verifyTax14Sources} from './tax14-provenance258.mjs';
export const TAX14_MODES=Object.freeze(['inspect','prepare-tax','fi-tax','commit-tax','verify-committed','disarm-fi']);
export function parseTax14Options(rest){const names={'--phase':'phase','--bindings':'bindingsFile','--approved-bindings-sha':'approvedBindingsSHA256'},options={};assert.equal(rest.length%2,0);for(let i=0;i<rest.length;i+=2){const key=names[rest[i]];assert(key&&rest[i+1]);assert(!Object.hasOwn(options,key),'Duplicate option');options[key]=rest[i+1];}assert(/^[A-Za-z0-9_-]{1,48}$/.test(options.phase??''));assert(typeof options.bindingsFile==='string'&&path.isAbsolute(options.bindingsFile));assert(/^[a-f0-9]{64}$/.test(options.approvedBindingsSHA256??''));return options;}
export async function withTax14Lock(privateDirectory,mode,action){
 assert(TAX14_MODES.includes(mode));assert.equal(fs.realpathSync(privateDirectory),path.resolve(privateDirectory));const file=path.join(privateDirectory,'driver.lock'),owner={pid:process.pid,nonce:randomUUID(),mode:'tax-continuation14:'+mode,at:new Date().toISOString()};let acquired=false;
 try{fs.writeFileSync(file,JSON.stringify(owner)+'\n',{flag:'wx',mode:0o600});acquired=true;return await action();}finally{if(acquired){const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);assert.deepEqual(JSON.parse(fs.readFileSync(file)),owner,'Never remove a replaced or foreign driver lock');fs.unlinkSync(file);}}
}
export async function mainTax14(argv=process.argv.slice(2)){
 const[mode,...rest]=argv;if(!mode||mode==='--help'){console.log('tax14-runner258.mjs inspect|prepare-tax|fi-tax|commit-tax|verify-committed|disarm-fi --phase UNIQUE_PHASE --bindings ABS_PRIVATE_JSON --approved-bindings-sha RAW_SHA; prepare and FI each STOP for Root review. Main13 is inherited and cannot be replayed.');return;}
 assert(TAX14_MODES.includes(mode),'Unsupported Tax14 mode; no Main POST entry');const options=parseTax14Options(rest),priv=FIXED.private+'/business/g2-business14/main01';let ctx,label;
 try{return await withTax14Lock(priv,mode,async()=>{
  const loaded=loadApprovedTax14Bindings({file:options.bindingsFile,rawBytesSha256:options.approvedBindingsSHA256},priv),manifest=loaded.manifest;
  const stateFile=priv+'/state.json';assert(fs.existsSync(stateFile),'Tax14 requires a previously minted schema4 state; the driver never bootstraps a data baseline');
  ctx=createContext({epoch:manifest.current.epoch,run:manifest.current.run,'api-process-record':manifest.current.apiProcess.file});label=ctx.next(options.phase);const legacy=readRetainedTax14(ctx,manifest);
  ctx.artifact(label+'-intent.json',{mode,approvedRuntimeBindings:loaded.pin,currentSource:manifest.current,legacySource:manifest.legacy,retainedMain13:legacy.retainedMain13,replayedProducerCommands:0,acceptanceClaim:false});let result;
  if(mode==='inspect')result={kind:'Source14-readonly-retained-tax-consumer-inspection',sourceProjectId:legacy.sourceProjectId,mainProjectId:legacy.mainProjectId,costId:legacy.costId,basisId:legacy.basisId,taxId:legacy.taxId,retainedMain13:legacy.retainedMain13,producerEpoch:'g2-business12',consumerEpoch:'g2-business14',normalCommandsSent:0,G3Certified:false};
  else if(mode==='disarm-fi'){const{removeTax14Fault}=await import('./tax14-sweep258.mjs');result=await removeTax14Fault(ctx);}
  else{assert(ctx.state.baseline&&!ctx.state.cleaned&&!ctx.state.cleanupPlan&&!ctx.state.blockedObservation&&!ctx.state.activeFault&&!ctx.state.admissionPending54);verifyTax14Sources(ctx,manifest);
   if(mode==='verify-committed'){const{verifyCommittedTax14}=await import('./tax14-sweep258.mjs');result=verifyCommittedTax14(ctx,manifest);}
   else{const{createApi}=await import('./http.mjs');const api=createApi(ctx);if(mode==='prepare-tax'){const{prepareTax14}=await import('./tax14-main258.mjs');result=await prepareTax14(ctx,api,manifest);}else if(mode==='fi-tax'){const{fiTax14}=await import('./tax14-sweep258.mjs');result=await fiTax14(ctx,api,manifest);}else{const{commitTax14}=await import('./tax14-sweep258.mjs');result=await commitTax14(ctx,api,manifest);}}
  }
  ctx.artifact(label+'-complete.json',result,{kind:'Source14-Tax-consumer-mode-complete',mode,producerEpoch:'g2-business12',consumerEpoch:'g2-business14',G3Certified:false,G4Certified:false});console.log(JSON.stringify({mode,label,status:'completed',oldProducerRecordsEdited:false,G3Certified:false,G4Certified:false}));return result;
 });}catch(error){let original=null;if(ctx&&label)original=ctx.artifact(label+'-partial.json',{name:error.name,message:error.message,stack:error.stack,mode,RootMustReconcileBeforeAnyReplay:true},{kind:'Source14-Tax-consumer-partial',mode,G3Certified:false,G4Certified:false});console.error(JSON.stringify({mode,status:'failed-or-partial',original,oldProducerLabelsChanged:false,G3Certified:false}));process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await mainTax14();
