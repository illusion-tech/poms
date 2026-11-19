// Pure metadata glue for Root's separately verified process-only restart overlay.
// Does not create a registry/process/actor proof or grant backend authority.
import assert from 'node:assert/strict';
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function pin(p){assert(p&&typeof p.file==='string'&&p.file.startsWith('/')&&digest(p.rawBytesSha256));return p;}
export function sameProcessPin1351(a,b){pin(a);pin(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);}
export function currentRestartFields1351(state,apiProcess,registry){
 if(!state.processRestart1351)return null;
 const registryPin=pin(state.processRestart1351.registry);assert(registry);assert.equal(registry.kind,'verified-same-source-process-restart1351');for(const key of['namespace','epoch','run','marker'])assert.equal(registry[key],state[key]);sameProcessPin1351(registry.newApiProcess,apiProcess);sameProcessPin1351(state.apiProcess,apiProcess);assert(Number.isSafeInteger(registry.admittedSequence)&&registry.admittedSequence>=0);
 return{processRestart1351:registryPin,apiProcess:pin(apiProcess),admittedSequence:registry.admittedSequence};
}
export function assertReceiptProcess1351(receipt,httpReceipt,fields){
 if(!fields)return;
 const b=receipt.processBinding1351;assert(b,'A real AuthCurrent from the new process is mandatory');assert.deepEqual(Object.keys(b).sort(),['apiProcess','generation','registry']);assert.equal(b.generation,'API1351');sameProcessPin1351(b.registry,fields.processRestart1351);sameProcessPin1351(b.apiProcess,fields.apiProcess);
 const match=/\/(\d{6,})-[^/]+$/.exec(httpReceipt.file);assert(match&&Number.isSafeInteger(Number(match[1]))&&Number(match[1])>fields.admittedSequence,'Pre-admission AuthCurrent originals cannot bind API1351');
 assert.equal(receipt.operationId,'AuthController_getCurrentAuthSession');assert.equal(receipt.status,200);assert.equal(receipt.expectedStatus,200);assert.equal(receipt.responseComplete,true);assert.equal(receipt.transportFailure,false);
}
export function assertIndexProcess1351(index,fields){if(!fields)return;assert(index.processRestart1351&&index.apiProcess);sameProcessPin1351(index.processRestart1351,fields.processRestart1351);sameProcessPin1351(index.apiProcess,fields.apiProcess);}
export function actorRestartFields1351(fields,indexPin){if(!fields)return{};return{processRestart1351:fields.processRestart1351,apiProcess:fields.apiProcess,actualActorIndex:pin(indexPin)};}
