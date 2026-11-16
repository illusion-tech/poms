import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createObservationController118,createPhaseMetrics118} from './model01/tools/rust-r4ghi/performance118/observation118.mjs';
const work='E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-review01',run=fs.realpathSync(fs.mkdtempSync(work+'/candidate02-dir-pressure-')),metrics=createPhaseMetrics118(),warm=createObservationController118({metrics,maxCacheBytes:32});
const sha=b=>createHash('sha256').update(b).digest('hex'),bytes=Buffer.from('{"n":0}');assert.equal(bytes.length,7);
for(let i=0;i<3;i++){const file=path.join(run,'prior-'+i+'.json');fs.writeFileSync(file,bytes,{flag:'wx'});const pin={file,bytes:bytes.length,rawBytesSha256:sha(bytes)};warm.run('previous-scope',()=>assert.deepEqual(warm.json(pin),{n:0}));}
const folder=path.join(run,'directory');fs.mkdirSync(folder);const name='abcdefghijklmnopqrstuvwxyz';fs.writeFileSync(path.join(folder,name),'x',{flag:'wx'});
let warmError;try{warm.run('valid-directory',()=>warm.directory(folder));}catch(e){warmError=e;}
const cold=createObservationController118({maxCacheBytes:32});let names;cold.run('same-directory-cold',()=>{names=cold.directory(folder);});
assert.match(warmError?.message??'',/Combined directory cache byte limit/);assert.deepEqual(names,[name]);
const result={kind:'independent-candidate02-decoded-directory-pressure',reviewerIsAuthor:false,reviewInputSHA256:'42afdb5f347d4918299d18981eb826ab16aea4a244c0ae1cc3e49a81892b456d',ownedRun:run,maxCacheBytes:32,previousDecodedInputs:3,eachDecodedCharge:7,decodedChargeBeforeDirectory:21,directoryNameBytes:26,coldSameDirectoryPassed:true,warmSameDirectoryRejected:true,error:warmError.message,actualNativeFixedFlowReproduced:false,actualPrivateImpact:'UNKNOWN',scope:'Configured-capacity component only; not a genuine constructor or runtime rejection claim'};
const file=path.join(run,'results.json');fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,result}));
