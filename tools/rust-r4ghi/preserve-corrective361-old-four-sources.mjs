// Preserve exact predecessor source bytes. No production/state edits or transition grant.
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,s)=>s.map(v=>({file:v.getFileName(),function:v.getFunctionName(),line:v.getLineNumber(),column:v.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');
  const compositionComplete=pin(C.private+'/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json');assert.equal(compositionComplete.rawBytesSha256,'9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a');
  const complete=json(compositionComplete),oldGraph=complete.actualGraphs.execution;assert.equal(oldGraph.bytes,66309);assert.equal(oldGraph.rawBytesSha256,'b196532840eaac9501b90032477ba74a3ee5810f1b32e010f6099b46ba4fc1c3');
  const sources=json(oldGraph);assert.equal(sources.length,284);assert.equal(new Set(sources.map(p=>p.file)).size,284);for(const p of sources)read(p);
  const requested=[['tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs','774eb76ed16eb1b6395e829b0087cf06a1f8e8f2ccf6d9b8df0609f139c034a8'],['tools/rust-r4ghi/business/runtime-admission-core121.mjs','58fea2219a71af3b643e932f440339f330d5f4223567e4a3bcb7b2d84221dd43'],['tools/rust-r4ghi/business/runtime-admission121.mjs','ef958a654e517cf417fe39c21f4deaadcb942aab69bf3a51602e6aed92636f38'],['tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs','b85d0d4904d682dad322ec9ea2a48efbaec3950b825fa34cfcf42a9255ef8924']];
  const measured=requested.map(([relative,hash])=>{const original=pin(C.root+'/'+relative);assert.equal(original.rawBytesSha256,hash);const old=sources.find(p=>p.file===original.file);assert(old);assert.equal(old.rawBytesSha256,hash);return{relative,original};});
  const out=C.private+'/runtime121-corrective361-predecessor-source01';directory121(out,{exclusive:true});
  const mappings=measured.map(({relative,original},i)=>({relative,original,retainedCopy:writeWx(out,String(i+1)+'-'+relative.slice(relative.lastIndexOf('/')+1)+'.bin',read(original))}));
  for(const p of sources)read(p);for(const m of mappings)assert(read(m.original).equals(read(m.retainedCopy)));
  const manifest=writeWx(out,'manifest.json',{kind:'Root-fixed-four-predecessor-source-retained361',recordedAt:new Date().toISOString(),compositionComplete,oldGraph,oldExecutionCount:284,mappings,remainingUnchangedMembers:280,allOld284CurrentlyRawMatched:true,oldM06AndReviewsUnmodified:true,newSourceOrGraphCreated:false,productionWritten:false,canonicalStateWritten:false,modeExecuted:false,actualG2Granted:false});
  console.log(JSON.stringify({manifest,retainedSourceFiles:4,oldExecutionCount:284,productionWritten:false,canonicalStateWritten:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-old-four-source-preservation-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,productionWritten:false,canonicalStateWritten:false}));process.exitCode=1;});
