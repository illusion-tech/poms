import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import{createHash}from'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',D=R+'/tools/rust-r4ghi/I/implementation/mixed-period-allocation219',OUT=R+'/tools/rust-r4ghi/independent/review05/mixed219-review126';
const hash=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,rawBytesSha256:hash(b)};};
const manifest=pin(D+'/manifest219.json');assert.equal(manifest.rawBytesSha256,'1bfab12235131b15ec4e2b26dd84c9ff9e7f65a02dd0005a8e286f06be814ca6');
const runtime=pin(D+'/runtime219.mjs');assert.equal(runtime.rawBytesSha256,'d323778ed9d91c35e17e206ce6514250dc97a9f4038330e301287b701d6103c4');
const {readPreparation219}=await import('file://'+runtime.file);
const rootPrivate='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01',rootOut=R+'/tmp/rust-r4ghi/business/g2-business13/main01';
const ctx={priv:rootPrivate,out:rootOut,api:'http://127.0.0.1:24680',epoch:'g2-business13',run:'main01',state:{marker:'synthetic-review126-marker',prefix:'bg383435b83c'}};
const target={projectId:'4d9e57ad-4890-4f53-80da-c6d224ce576b',expectedVersion:1,restatesSnapshotRef:{id:'11111111-1111-4111-8111-111111111111'},periodEndSnapshotRef:null};
const roots=[{kind:'SharedCostAllocationBasis',id:'22222222-2222-4222-8222-222222222222',expectedVersion:1,payloadHash:'a'.repeat(64)}];
const originals={read:fs.readFileSync,lstat:fs.lstatSync,real:fs.realpathSync};const observations=[];
function run(name,{httpNonce,configNonce,headerNonce,innerBlocks=[]}){
 const files=new Map(),put=(file,value)=>{const b=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));files.set(file,b);return{file,rawBytesSha256:hash(b)};};
 const before=put(rootPrivate+'/review126-before.json',{epoch:ctx.epoch,run:ctx.run,marker:ctx.state.marker});
 const url=new URL(ctx.api+'/api/projects/'+target.projectId+'/unified-accounting');for(const[k,v]of Object.entries({view:'preparation',intent:'restatement',restatesSnapshotId:target.restatesSnapshotRef.id,correctionSourceRefs:JSON.stringify(roots)}))url.searchParams.set(k,v);
 const preparation={kind:'preparation-only',intent:'restatement',projectId:target.projectId,headVersion:1,formalEligibility:{status:'eligible',blockingReasonCodes:innerBlocks},blockingReasonCodes:[],allowedCommandCodes:['restatement']};
 const config={operationId:'ProjectCostController_getProjectUnifiedAccounting',method:'GET',url:url.href,headers:headerNonce===undefined?{}:{'X-Request-Id':headerNonce},before,...(configNonce===undefined?{}:{requestId:configNonce})};
 const http={kind:'actual-business-HTTP-attempt',operationId:config.operationId,method:'GET',status:200,expectedStatus:200,responseComplete:true,transportFailure:false,querySha256:hash(url.search),...(httpNonce===undefined?{}:{requestId:httpNonce}),originals:{requestConfig:put(rootPrivate+'/review126-config.json',config),requestBody:put(rootPrivate+'/review126-body.bin',Buffer.alloc(0)),responseBody:put(rootPrivate+'/review126-response.json',{data:{preparation}})}};
 const receipt=put(rootOut+'/review126-http.json',http);
 fs.readFileSync=function(file,...args){return files.has(String(file))?Buffer.from(files.get(String(file))):originals.read.call(fs,file,...args);};
 fs.lstatSync=function(file,...args){return files.has(String(file))?{isFile:()=>true,isSymbolicLink:()=>false,nlink:1}:originals.lstat.call(fs,file,...args);};
 fs.realpathSync=function(file,...args){return files.has(String(file))||[rootPrivate,rootOut].includes(String(file))?path.resolve(String(file)):originals.real.call(fs,file,...args);};
 let accepted=false;try{assert.deepEqual(readPreparation219(ctx,receipt,target,roots),preparation);accepted=true;}finally{fs.readFileSync=originals.read;fs.lstatSync=originals.lstat;fs.realpathSync=originals.real;}
 observations.push({name,httpNonce:httpNonce??null,configNonce:configNonce??null,headerNonce:headerNonce??null,innerBlocks,accepted});return accepted;
}
const nonce='bg383435b83c-review126-01234567';assert(run('valid-control',{httpNonce:nonce,configNonce:nonce,headerNonce:nonce}));
assert(run('both-requestIds-absent',{}));
assert(run('empty-requestIds',{httpNonce:'',configNonce:'',headerNonce:''}));
assert(run('wrong-header',{httpNonce:nonce,configNonce:nonce,headerNonce:'bg383435b83c-other-00000000'}));
assert(run('wrong-consumer-prefix',{httpNonce:'bg0000000000-wrong-01234567',configNonce:'bg0000000000-wrong-01234567',headerNonce:'bg0000000000-wrong-01234567'}));
assert(run('contradictory-inner-block',{httpNonce:nonce,configNonce:nonce,headerNonce:nonce,innerBlocks:['baseline-missing']}));
assert.deepEqual(pin(runtime.file),runtime);assert.deepEqual(pin(manifest.file),manifest);
const result={kind:'independent-synthetic-FS-counterexample-not-an-HTTP-observation',finding:'IR126-01',severity:'P2',manifest,runtime,observations,meaning:'The mandatory actual-public-preparation proof accepts absent/empty nonce pairs, a different actual X-Request-Id, a foreign consumer prefix, and contradictory inner eligibility blockers. The same absent-pair issue was already closed for period205 in IR119-03; this new external reader currently lacks the equivalent checks.',minimumFix:'Require nonempty <=100 exact nonce string, retained ctx.state.prefix, and exact HTTP/config/header equality; require formalEligibility.blockingReasonCodes empty. Keep all original path/query/snapshot/CAS and full-target checks.',limits:{productionFSReaderInjected:false,reviewWorkerFSWasTemporarilyVirtualized:true,realRootPathWritten:false,SQL:0,HTTP:0,contextCreated:false,liveStateRead:false,actual219:false,G3:false,G4:false}};
fs.writeFileSync(OUT+'/nonce-probe126.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'counterexample-confirmed',output:pin(OUT+'/nonce-probe126.json')}));
