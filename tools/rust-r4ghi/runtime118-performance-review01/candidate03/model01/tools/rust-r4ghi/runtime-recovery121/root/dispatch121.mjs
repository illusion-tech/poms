// Root-only single dispatch, after exact non-author review; no generic entry input.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { C, assertOperatorHost121, directory121, folder, json, local, mainGuard, pin, read, reviewBody, samePin, sha, shape, verifySources, verifyStates, writeWx } from './facts121.mjs';

export async function dispatch121(args=process.argv.slice(2)) {
  assertOperatorHost121();assert.equal(args.length,9);assert.deepEqual([args[0],args[2],args[4],args[6],args[8]],['--request','--request-sha','--independent-review','--independent-review-sha','--execute']);
  const requestPin=pin(args[1]);assert.equal(requestPin.rawBytesSha256,args[3]);const q=json(requestPin);assert.equal(q.kind,'Root-runtime121-A-exact-G2-request');
  const independent=pin(args[5]);assert.equal(independent.rawBytesSha256,args[7]);const g=json(independent);assert.equal(g.kind,'non-author-runtime121-A-exact-G2');assert.equal(g.reviewerIsAuthor,false);assert(g.verdict.startsWith('approved-'));assert.equal(g.mode,q.mode);assert.deepEqual(g.approvedInput,q.input);assert.deepEqual(g.expectedRootReview,q.expectedRootReview);
  const p=shape(json(q.input));assert.equal(p.mode,q.mode);verifySources(p);verifyStates(p);assert.deepEqual(q.expectedRootReviewBody,reviewBody(p,q.input));
  const parent=q.input.file.slice(0,q.input.file.lastIndexOf('/'));assert.equal(q.expectedRootReview.file,parent+'/Root-review.json');const body=Buffer.from(JSON.stringify(q.expectedRootReviewBody,null,2)+'\n');assert.equal(body.length,q.expectedRootReview.bytes);assert.equal(sha(body),q.expectedRootReview.rawBytesSha256);
  assert(!fs.existsSync(local(q.expectedRootReview.file)));assert(!fs.existsSync(local(p.outputDirectory)));
  if(p.mode==='holder-start'){assert.equal(process.platform,'win32');assert.equal(sha(fs.readFileSync(C.pwsh)),C.pwshSHA);}else assert.equal(process.platform,'linux');
  directory121(p.outputDirectory,{exclusive:true});const rootReview=writeWx(parent,'Root-review.json',q.expectedRootReviewBody);samePin(rootReview,q.expectedRootReview);
  const childEntry=folder+'/'+(p.mode==='holder-start'?'start-holder121.ps1':p.mode==='pg-start'?'resume-original-pg121.mjs':'observe-conservation121.mjs'),entry=p.executionSources.find(x=>x.file===childEntry);assert(entry);read(entry);
  const inputArgs=['--input',q.input.file,'--input-sha',q.input.rawBytesSha256,'--review',rootReview.file,'--review-sha',rootReview.rawBytesSha256,'--execute'];
  const executable=p.mode==='holder-start'?C.pwsh:C.node,argv=p.mode==='holder-start'?['-NoLogo','-NoProfile','-NonInteractive','-File',local(childEntry),'-InputFile',q.input.file,'-InputSha',q.input.rawBytesSha256,'-ReviewFile',rootReview.file,'-ReviewSha',rootReview.rawBytesSha256,'-Execute']:[childEntry,...inputArgs];
  const stdout=p.outputDirectory+'/stdout-original.log',stderr=p.outputDirectory+'/stderr-original.log',out=fs.openSync(local(stdout),'wx',0o600),err=fs.openSync(local(stderr),'wx',0o600),began=new Date().toISOString();
  const dispatch=writeWx(p.outputDirectory,'dispatch.json',{kind:'actual-runtime121-A-single-dispatch',began,mode:p.mode,pid:process.pid,input:q.input,RootReview:rootReview,independentReview:independent,request:requestPin,entry,executable,argv,originalStdout:stdout,originalStderr:stderr,APIStart:false,businessDML:false});
  const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;let result;const start=performance.now();
  try{read(entry);result=spawnSync(executable,argv,{cwd:process.platform==='win32'?C.winRoot:C.root,env,windowsHide:true,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
  const receipt=writeWx(p.outputDirectory,'command-receipt.json',{kind:'actual-runtime121-A-command',dispatch,mode:p.mode,began,ended:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,exitCode:result.status,signal:result.signal,processError:result.error?{name:result.error.name,message:result.error.message}:null,stdout:pin(stdout),stderr:pin(stderr),blindRetryForbidden:true});
  console.log(JSON.stringify({receipt,exitCode:result.status,APIStart:false,businessDML:false}));if(result.status!==0)process.exitCode=1;
}
mainGuard(import.meta.url,dispatch121);
