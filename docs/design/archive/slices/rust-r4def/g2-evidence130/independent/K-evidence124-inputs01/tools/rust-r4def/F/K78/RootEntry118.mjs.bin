// Only Root invokes --root-execute. Import has no private/DB/HTTP/object effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRootRunner78} from './RootRunner118.mjs';
import {contextFromPublic71} from './request-driver118.mjs';
export async function runRootEntry78({runtimeEdition,apiEdition,tag,selection='critical16',rootToolsUrl=new URL('../../',import.meta.url),withActualReadFault}={}) {
 assert.equal(process.platform,'linux');assert(/^\d+$/.test(runtimeEdition??''));assert(/^\d+$/.test(apiEdition??''));assert.match(tag??'',/^[a-z0-9_-]{1,12}$/);
 const {createApiHarness}=await import(new URL('api-harness32.mjs',rootToolsUrl));
 const {connect}=await import(new URL('db33.mjs',rootToolsUrl));
 const {createFaultHarness47}=await import(new URL('fault-core47.mjs',rootToolsUrl));
 const h=createApiHarness({tag,edition:apiEdition});
 const actors=JSON.parse(fs.readFileSync(path.join(h.priv,'actors33.json'))).actors;
 await h.login(actors.full);
 const before=JSON.parse(fs.readFileSync(path.join(h.win,'tmp/rust-r4def/root/K71/before71.json')));
 const context=contextFromPublic71(before,{author:h.actor('full'),tag});
 const fault=await createFaultHarness47(h,apiEdition);let runner;
 try {
  runner=await createRootRunner78({h,db:connect,fault,context,runtimeEdition,selection,withActualReadFault});
  const result=await runner.runAll();
  console.log(JSON.stringify({completed:result.completed,completeAll16Core:result.completeAll16Core,stages:result.stages,scopedFaults:result.scopedFaultResults.length,unarmedRetriesAcknowledged:result.unarmedRetriesAcknowledged,actualCompleteReadFaultCovered:result.actualCompleteReadFaultCovered,S3Accepted:false,G3Certified:false,G4Certified:false}));
  if(!result.completed)process.exitCode=1;return result;
 } finally {try{if(runner)await runner.close();}finally{await fault.close();}}
}
const isMain=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(isMain){
 assert.equal(process.argv[2],'--root-execute','No author execution. Root must explicitly opt in and provide exact current runtime/unique API edition/tag.');
 await runRootEntry78({runtimeEdition:process.argv[3],apiEdition:process.argv[4],tag:process.argv[5],selection:process.argv[6]??'critical16'});
}
