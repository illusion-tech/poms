import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha } from './business/pure.mjs';
const ctx=createContext({epoch:'g2-business11',run:'main01'});assert(ctx.state.consumerAdmission54&&!ctx.state.activeFault&&!ctx.state.blockedObservation);
const out=ctx.win+'/tools/rust-r4ghi/checkpoints/consumer11-source-refreeze56';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const path19='tools/rust-r4ghi/business/required-write-sources19.json',path40='tools/rust-r4ghi/business/required-write-sources40.json';
const old19=fs.readFileSync(ctx.win+'/'+path19),old40=fs.readFileSync(ctx.win+'/'+path40);
const next19=JSON.parse(old19).map(pin=>({...pin,sha256:sha(fs.readFileSync(ctx.win+'/'+pin.file))}));
const changes=next19.filter((pin,i)=>pin.sha256!==JSON.parse(old19)[i].sha256);assert.deepEqual(changes.map(p=>p.file).sort(),[
 'apps/poms-api-rust/src/project_operating/collector.rs','apps/poms-api-rust/src/project_operating/inclusion.rs','apps/poms-api-rust/src/project_operating/sources.rs'].sort());
fs.writeFileSync(out+'/source19-before.json.bin',old19,{flag:'wx'});fs.writeFileSync(out+'/source40-before.json.bin',old40,{flag:'wx'});
fs.writeFileSync(ctx.win+'/'+path19,JSON.stringify(next19,null,2)+'\n');
const helperMap=new Map(JSON.parse(old40).helperSources.map(p=>[p.file,{...p,sha256:sha(fs.readFileSync(ctx.win+'/'+p.file))}]));
for(const p of ctx.helperPins)if(p.file!==path40)helperMap.set(p.file,{file:p.file,sha256:sha(fs.readFileSync(ctx.win+'/'+p.file))});
const next40={kind:'exact-product-and-helper-source-closure-live40',version:40,productSources:ctx.pins,helperSources:[...helperMap.values()].sort((a,b)=>a.file.localeCompare(b.file)),
 explicitConsumerRefreeze:{producerEpoch:'g2-business10',consumerEpoch:ctx.epoch,oldPartialFailuresRetainedButNotCarried:true,sourceCount:ctx.pins.length,admission:ctx.state.consumerAdmission54.registry}};
fs.writeFileSync(ctx.win+'/'+path40,JSON.stringify(next40,null,2)+'\n');
for(const pin of [...next40.productSources,...next40.helperSources])assert.equal(sha(fs.readFileSync(ctx.win+'/'+pin.file)),pin.sha256);
const result={kind:'Root-explicit-consumer11-fault-source-refreeze56',sourcePinsSHA256:sha(JSON.stringify(ctx.pins)),sourceCount:ctx.pins.length,
 files:[{file:path19,beforeSHA256:sha(old19),afterSHA256:sha(fs.readFileSync(ctx.win+'/'+path19)),changedProductPins:changes},{file:path40,beforeSHA256:sha(old40),afterSHA256:sha(fs.readFileSync(ctx.win+'/'+path40)),helpers:next40.helperSources.length}],
 inventoryFamiliesUnchanged:true,oldPartial21NotCertifiedForNewConsumer:true,actualFIExecuted:false,G3Certified:false};
fs.writeFileSync(ctx.win+'/docs/design/rust-r4ghi/consumer11-fault-source-refreeze56.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({sourceCount:ctx.pins.length,helpers:next40.helperSources.length,refrozen:2,FIExecuted:false}));
