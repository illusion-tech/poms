// Metadata only. Every resulting mode still needs a concrete non-author exact G2.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { C, assertOperatorHost121, directory121, holderFacts, json, mainGuard, pin, reviewBody, sha, shape, stateFiles, stateSHAs, verifySources, verifyStates, writeWx } from './facts121.mjs';

export async function prepare121(args=process.argv.slice(2)) {
  assertOperatorHost121();assert.equal(process.platform,'linux');assert.equal(args.length%2,0);
  const allowed=new Set(['--mode','--code-review','--code-review-sha','--holder','--holder-sha','--pg-start','--pg-start-sha']),a={};
  for(let i=0;i<args.length;i+=2){assert(allowed.has(args[i])&&!Object.hasOwn(a,args[i]));assert(typeof args[i+1]==='string'&&!args[i+1].startsWith('--'));a[args[i]]=args[i+1];}
  const mode=a['--mode'];assert(['holder-start','pg-start','pg-observe'].includes(mode));
  const expected=mode==='holder-start'?['--mode','--code-review','--code-review-sha']:mode==='pg-start'?['--mode','--code-review','--code-review-sha','--holder','--holder-sha']:[...allowed];assert.deepEqual(Object.keys(a).sort(),expected.sort());
  const code=pin(a['--code-review']);assert.equal(code.rawBytesSha256,a['--code-review-sha']);const r=json(code);assert.equal(r.kind,'non-author-runtime121-A-code-review');assert.equal(r.verdict,'code-ready-for-exact-runtime121-A-input-review');assert.equal(r.reviewerIsAuthor,false);
  const retention=pin(C.retention);assert.equal(retention.rawBytesSha256,C.retentionSHA);const map=json(retention),state15=map.mappings.find(x=>x.original.file===stateFiles.state15).privateRetainedCopy,log=map.mappings.find(x=>x.original.file===stateFiles.ownership15).privateRetainedCopy;
  const nonce=randomUUID(),p={kind:'Root-runtime121-A-operation-input',schemaVersion:1,mode,namespace:C.namespace,nonce,G1:pin(C.G1),codeReview:code,executionSources:r.executionSources,expectedStates:{state13:pin(stateFiles.state13),state14:pin(stateFiles.state14),state15,ownership15:log},runtimeLossObservation:pin(C.loss),failedRetention:retention,holder:mode==='holder-start'?null:pin(a['--holder']),pgStart:mode==='pg-observe'?pin(a['--pg-start']):null,baseline:mode==='pg-observe'?pin(C.baseline):null,outputDirectory:C.private+'/runtime121-A/'+mode+'/'+nonce};
  if(p.holder)assert.equal(p.holder.rawBytesSha256,a['--holder-sha']);if(p.pgStart)assert.equal(p.pgStart.rawBytesSha256,a['--pg-start-sha']);shape(p);verifySources(p);verifyStates(p);
  if(p.holder)holderFacts(p);if(p.pgStart){const prior=json(p.pgStart);assert.equal(prior.kind,'actual-runtime121-A-original-PG-resumed');assert.equal(prior.after.id,C.container);assert.equal(prior.APIStarted,false);assert.equal(prior.businessDML,false);}
  assert(!fs.existsSync(p.outputDirectory));const dir=C.private+'/runtime121-A-inputs/'+mode+'/'+nonce;directory121(dir,{exclusive:true});
  const input=writeWx(dir,'input.json',p),body=reviewBody(p,input),b=Buffer.from(JSON.stringify(body,null,2)+'\n'),expectedRootReview={file:dir+'/Root-review.json',bytes:b.length,rawBytesSha256:sha(b)};
  const request=writeWx(dir,'request-exact-G2.json',{kind:'Root-runtime121-A-exact-G2-request',recordedAt:new Date().toISOString(),mode,input,expectedRootReview,expectedRootReviewBody:body,actualG2:false,RootReviewSigned:false,effectsExecuted:false});
  console.log(JSON.stringify({request,input,expectedRootReview,mode,effectsExecuted:false}));
}
mainGuard(import.meta.url,prepare121);
