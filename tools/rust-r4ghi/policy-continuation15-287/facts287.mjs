// Pure shapes, strict owned-file pins and a persisted current15 data view.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const ROOT287='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
export const PRIVATE287='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01';
export const PROJECT287='d30c0da1-692e-4e7e-ba2c-ad81ad8898f0';
export const PARTIAL287='97928d111fc5e510360edaf1f2ec38081cfb143f3f87ccfb57266f91a6345e00';
export const sha287=b=>createHash('sha256').update(b).digest('hex');
export const samePin287=(a,b)=>{assert.equal(a?.file,b?.file);assert.equal(a?.rawBytesSha256,b?.rawBytesSha256);};
export function shapePin287(p){assert(p&&path.isAbsolute(p.file)&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));return p;}
export function read287(p){shapePin287(p);const st=fs.lstatSync(p.file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync(p.file),path.resolve(p.file));const raw=fs.readFileSync(p.file);assert.equal(sha287(raw),p.rawBytesSha256);if(p.bytes!==undefined)assert.equal(raw.length,p.bytes);return raw;}
export const json287=p=>JSON.parse(read287(p));
export const pin287=file=>{const raw=fs.readFileSync(file),p={file,bytes:raw.length,rawBytesSha256:sha287(raw)};read287(p);return p;};
export function inside287(root,file){const rel=path.relative(fs.realpathSync(root),fs.realpathSync(file));assert(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel));}
export function assertInput287(p){
    assert.deepEqual(Object.keys(p).sort(),['kind','namespace','epoch','run','sourceGeneration','mode','taxExecution118Sidecar','tax118ConsumerRegistration','environmentBindings15','source13Partial287','taxCompletion15','independentReview','expectedEntryState','executionSources'].sort());
    assert.equal(p.kind,'Root-reviewed-Source15-H46-continuation287');assert.equal(p.namespace,'poms-r4ghi');assert.equal(p.epoch,'g2-business15');assert.equal(p.run,'main01');assert.equal(p.sourceGeneration,15);
    assert(['read-retained','equal','above','complete'].includes(p.mode));for(const k of ['environmentBindings15','source13Partial287','taxCompletion15','independentReview','expectedEntryState','taxExecution118Sidecar','tax118ConsumerRegistration'])shapePin287(p[k]);assert.equal(p.source13Partial287.rawBytesSha256,PARTIAL287);
    const names=['policy-continuation15-287/facts287.mjs','policy-continuation15-287/run287.mjs','policy-continuation15-287/input287.template.json','policy-replayless261-continuation03/cases261.mjs','policy-replayless261-continuation03/core261.mjs'].map(n=>ROOT287+'/tools/rust-r4ghi/'+n).sort();
    assert(Array.isArray(p.executionSources));assert.deepEqual(p.executionSources.map(x=>x.file).sort(),names);p.executionSources.forEach(shapePin287);return p;
}
export function assertPartial287(record,partial){
    assert.equal(partial.kind,'actual-Source13-H46-partial-after-runtime-loss287');assert.equal(partial.producerEpoch,'g2-business13');assert.equal(partial.sourceGeneration,13);assert.equal(partial.projectId,PROJECT287);
    assert.equal(partial.complete,false);assert.equal(partial.source13EffectReadmission,false);assert.equal(partial.newSource14Acceptance,false);assert.equal(partial.originalRecordUnchanged,true);assert.equal(partial.original317Replayed,false);
    assert.deepEqual(partial.completedCases,['H01','below-19.99','H04']);assert.deepEqual(partial.unexecutedCases,['equal-20.00','above-20.01']);assert(!record.result);assert.equal(record.producerEpoch,'g2-business13');assert.equal(record.fixtures.project.id,PROJECT287);
    assert.equal(sha287(JSON.stringify(record)),partial.resourceRecordSHA256);assert.equal(sha287(JSON.stringify(record.stages)),partial.originalStoppedStagesSHA256);
    assert.equal(record.stages['fresh-G-H-below'].phase,'stopped-reconcile-originals-no-replay');assert.equal(record.continuation261.steps.below.phase,'verified');assert.equal(record.continuation261.steps.h04.phase,'verified');
    assert(!record.fixtures.receipts26.equal&&!record.fixtures.receipts26.above);assert.deepEqual(partial.caseRefs,{h01:record.fixtures.h01Published26,below:record.fixtures.publishedCases26.below,H04:record.fixtures.attentionReview26});return record;
}
export function openConsumerView287(root,record,registry){
    assert.equal(root.epoch,'g2-business15');assert.equal(registry.schemaVersion,5);assert.equal(registry.consumer.epoch,root.epoch);assert.equal(record.fixtures.project.id,PROJECT287);
    const original=root.state.fixtures,reserved=new Set(registry.fixtureAdmissions.map(e=>{const parts=e.registryPath.split('/');assert.equal(parts[1],'fixtures');assert(parts[2]);return parts[2];}));
    for(const k of reserved)assert(!Object.hasOwn(record.fixtures,k),'Current working fixtures cannot shadow a retained resource group');
    for(const k of ['project','contractRuns','actualCost'])assert(!reserved.has(k));
    const cache=new WeakMap(),readonly=value=>{if(!value||typeof value!=='object')return value;if(cache.has(value))return cache.get(value);const proxy=new Proxy(value,{get:(t,k)=>readonly(Reflect.get(t,k)),getOwnPropertyDescriptor(t,k){const d=Reflect.getOwnPropertyDescriptor(t,k);if(!d)return d;assert(!d.get&&!d.set);if(d.value&&typeof d.value==='object'){assert(d.configurable||d.writable);return{...d,value:readonly(d.value)};}return d;},set(){throw Error('Retained producer facts are read-only');},deleteProperty(){throw Error('Retained producer facts are read-only');},defineProperty(){throw Error('Retained producer facts are read-only');},setPrototypeOf(){throw Error('Retained producer prototype is read-only');},preventExtensions(){throw Error('Retained producer extensibility is read-only');}});cache.set(value,proxy);return proxy;};
    const fixtures=new Proxy(record.fixtures,{get:(t,k)=>reserved.has(k)?readonly(original[k]):Reflect.get(t,k),has:(t,k)=>reserved.has(k)||Reflect.has(t,k),ownKeys:t=>[...new Set([...Reflect.ownKeys(t),...reserved])],getOwnPropertyDescriptor:(t,k)=>reserved.has(k)?{configurable:true,enumerable:true,writable:false,value:readonly(original[k])}:Reflect.getOwnPropertyDescriptor(t,k),set(t,k,v){assert(!reserved.has(k));return Reflect.set(t,k,v,t);},deleteProperty(t,k){assert(!reserved.has(k));return Reflect.deleteProperty(t,k);},defineProperty(t,k,d){assert(!reserved.has(k));return Reflect.defineProperty(t,k,d);}});
    const state=new Proxy(root.state,{get:(t,k)=>k==='fixtures'?fixtures:Reflect.get(t,k,t),getOwnPropertyDescriptor(t,k){const d=Reflect.getOwnPropertyDescriptor(t,k);return d&&k==='fixtures'?{...d,value:fixtures}:d;},set(t,k,v){assert.notEqual(k,'fixtures');return Reflect.set(t,k,v,t);},deleteProperty(t,k){assert.notEqual(k,'fixtures');return Reflect.deleteProperty(t,k);},defineProperty(t,k,d){assert.notEqual(k,'fixtures');return Reflect.defineProperty(t,k,d);},setPrototypeOf(){throw Error('Root state prototype cannot be replaced');},preventExtensions(){throw Error('Root state extensibility cannot be replaced');}});
    const delegatedMethods=new Set(['persist','next','artifact','public','client','db','instant','own']);return new Proxy(root,{get(t,k,receiver){if(k==='state')return state;if(k==='fixtureView287')return true;const value=Reflect.get(t,k,receiver);if(delegatedMethods.has(k)){assert(Object.hasOwn(t,k)&&typeof value==='function');return value.bind(t);}return value;},getOwnPropertyDescriptor(t,k){const d=Reflect.getOwnPropertyDescriptor(t,k);return d&&k==='state'?{...d,value:state}:d;},set(){throw Error('A data view cannot replace the real current context methods');},defineProperty(){throw Error('A data view cannot redefine real context methods');},deleteProperty(){throw Error('A data view cannot delete real context methods');},setPrototypeOf(){throw Error('A data view cannot replace the context prototype');},preventExtensions(){throw Error('A data view cannot freeze the context');}});
}
