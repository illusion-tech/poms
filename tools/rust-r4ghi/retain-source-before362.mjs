// Retain exact Source361 preimages before any corrective362 production write.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,pin,read,json,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
const priorSource=pin(C.private+'/runtime121-corrective361-source/a3d3040f-54ce-4f37-85ea-1aaacb18fe0d/complete.json');
assert.equal(priorSource.bytes,4303);assert.equal(priorSource.rawBytesSha256,'cf1cb797274fa45a7e08795782d32a888e362ec5720c922321d34a48a17d0a87');
const source=json(priorSource),graph=json(source.executionSources);assert.equal(graph.length,284);assert.equal(new Set(graph.map(q=>q.file)).size,284);
const six=[
 ['tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs',59431,'5acf886f286e1844a8078bb0dffb3797384c211511d40eba3570024a458bcf8b'],
 ['tools/rust-r4ghi/tax15-invocation118/tax15-once-wire.mjs',21877,'b3bf45a8227c2c661c7853b6687bab456fcc8120a7e66681bdb667f90f79cebc'],
 ['tools/rust-r4ghi/tax15-invocation118/tax15-once-effects.mjs',19541,'559ce23d665d4f0e2aec13ead55ac57af0265559a80a5c958965f5301efbfafc'],
 ['tools/rust-r4ghi/business/runtime-admission121.mjs',123267,'ba6f97749d35904a4071ef1914ca51a6e2f563ecfd426013b449d12c05162957'],
 ['tools/rust-r4ghi/business/runtime-admission-core121.mjs',33196,'ff4052b563f5ff359385a81c1cb71cc06c4aa9e0017886a997c797d1c0ba4559'],
 ['tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs',36826,'a8f28d8a16daca2853f966bd30157f2c228ee7ec0a04b277831e0cd469d7fa24'],
];
for(const q of graph)read(q);
const loaded=six.map(([relative,bytes,digest])=>{const original=pin(C.root+'/'+relative);assert.equal(original.bytes,bytes);assert.equal(original.rawBytesSha256,digest);assert.equal(graph.find(q=>q.file===original.file)?.rawBytesSha256,digest);return{relative,original,raw:read(original)};});
const D=C.private+'/runtime121-corrective362-predecessor-source01';directory121(D,{exclusive:true});
const mappings=loaded.map((q,i)=>({relative:q.relative,original:q.original,retainedCopy:writeWx(D,(i+1)+'-'+path.basename(q.relative)+'.bin',q.raw)}));
for(const q of mappings)assert(read(q.original).equals(read(q.retainedCopy)));
const manifest=writeWx(D,'manifest.json',{kind:'Root-fixed-six-predecessor-source-retained362',recordedAt:new Date().toISOString(),priorSourceComplete:priorSource,oldGraph:source.executionSources,oldExecutionCount:284,mappings,remainingUnchangedMembers:278,allPrior284CurrentlyRawMatched:true,priorSource361AndM06Unmodified:true,newSourceOrGraphCreated:false,productionWritten:false,canonicalStateWritten:false,modeExecuted:false,actualG2Granted:false});
console.log(JSON.stringify({manifest,retainedProductionPreimages:mappings.length,productionWritten:false,canonicalStateWritten:false,modeExecuted:false}));
