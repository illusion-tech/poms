// Fixed-image source/config-before-I/O check only, not storage acceptance.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {container,node,binary,root,preflight} from './obs-container.mjs';
process.chdir(root);const [tag]=process.argv.slice(2);assert(process.argv.length===3&&/^[a-z0-9-]{1,30}$/.test(tag));
const report={kind:'Actual fixed-image Node source and Rust rejected-input admission; no product operation or DB/network call by either probe',tag,at:new Date().toISOString(),result:'pending'};
try{report.profile=await preflight();report.nodeSourceCheck=await container(node,['tools/rust-r2ij/i-transport-oracle.mjs','--check']);assert(report.nodeSourceCheck.sourceCheck);report.rustPreIoRejected=await container(binary,[],JSON.stringify({op:'rejected'})+'\n');assert.equal(report.rustPreIoRejected.success,false);assert.equal(report.rustPreIoRejected.op,'rejected');report.result='pass';}
catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
writeFileSync(`tmp/rust-r2ij/obs-container-witness-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
