// Read immutable actual originals only. Do not copy private state/rows/payloads.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const unix=file=>'\\\\wsl.localhost\\Debian'+file.replaceAll('/','\\');
const read=file=>fs.readFileSync(unix(file));
const statePath='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business10/main01/state.json';
const state=JSON.parse(read(statePath)),prepared=state.fixtures.efCrossProject40?.prepared;assert(prepared);
const raw=read(prepared.artifact.file);assert.equal(sha(raw),prepared.artifact.rawBytesSha256);const original=JSON.parse(raw);assert.deepEqual(original.body,prepared.body);
const pin=original.lastObservation,bytes=read(pin.file);assert.equal(sha(bytes),pin.rawBytesSha256);const snapshot=JSON.parse(bytes);
let source=fs.readFileSync(new URL('./candidate/tools/rust-r4ghi/business/ef-write-inventory40.mjs',import.meta.url),'utf8');
source=source.replace("'./pure.mjs'",JSON.stringify(new URL('../../../../business/pure.mjs',import.meta.url).href));
const {EF40_OPERATION:op,deriveEFCorrectionFacts40:derive,efCorrectionWriteInventory40:inventory,efSelectorSql40:selector}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const manager=state.actors.manager;const ctx={database:'poms_r4ghi_rust',state:{owned:state.owned,actors:{manager:{id:manager.id,permissions:manager.permissions}},fixtures:{efCrossProject40:{prepared:{body:prepared.body},projectIds:state.fixtures.efCrossProject40.projectIds}}}};
const scope={operationId:op,projectId:prepared.body.projectId,actorId:manager.id,actorKey:'manager',params:{},body:prepared.body};
const readRows=meta=>{const b=read(meta.file);assert.equal(sha(b),meta.rawBytesSha256);return b.toString().split('\n').filter(Boolean).map(JSON.parse);};
scope.efFacts=derive(ctx,snapshot,scope,readRows);const descriptors=inventory(op,scope);
for(const descriptor of descriptors)assert(selector(descriptor,{requestId:'read-only-not-executed40',sessionId:'77777777-7777-4777-8777-777777777777'}).length>10);
const summary={kind:'actual-original-observation-derived-live40-inventory-preflight-not-FI',preparedOriginal:{file:prepared.artifact.file,sha256:prepared.artifact.rawBytesSha256},snapshotOriginal:pin,
 productSourcesCount:state.sourcePins.length,productSourcesJSONSHA256:sha(JSON.stringify(state.sourcePins)),projects:scope.efFacts.projects.length,terminals:scope.efFacts.targets.length,
 mandatoryFamilies:descriptors.length,immediateFamilies:descriptors.filter(d=>!d.deferred).length,deferredSummaryFamilies:descriptors.filter(d=>d.deferred).length,
 insertedThenUpdatedFamilies:descriptors.filter(d=>d.insertedThenUpdated).length,inventoryObjectSHA256:sha(JSON.stringify(descriptors)),
 fullPrivateRowsCopied:false,HTTPRequestsSent:0,SQLSent:0,actualFIExecuted:false,authorPreflightNotIndependentToolCertificate:true,G3Certified:false,G4Certified:false};
fs.writeFileSync(new URL('./actual-fixture-preflight40.json',import.meta.url),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify(summary)+'\n');
