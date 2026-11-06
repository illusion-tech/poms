import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const commit=process.argv[2],previous='42b6fc3451eb31042bef80f995c4023eeb6c736b',primary='E:/projects/poms';assert(/^[0-9a-f]{40}$/.test(commit));
const out='tmp/rust-r4ghi/root/userfix-seal-main01.json';assert(!fs.existsSync(out));
function run(exe,args,cwd=process.cwd()){const r=spawnSync(exe,args,{cwd,encoding:'utf8',windowsHide:true,timeout:140000,maxBuffer:10000000});assert.equal(r.status,0,'Inspect actual refs before resuming failed Seal publication');return r.stdout.trim();}
assert.equal(run('git',['rev-parse','HEAD']),commit);assert.equal(run('git',['diff','--name-only',previous,commit,'--','apps','libs']),'');assert.equal(run('git',['branch','--show-current'],primary),'main');assert.equal(run('git',['status','--porcelain=v1'],primary),'');
const ref=name=>run('gh',['api','repos/illusion-tech/poms/git/ref/heads/'+name,'--jq','.object.sha']);
assert([previous,commit].includes(ref('main')));assert([previous,commit].includes(ref('codex/poms-r4ghi-next25')));assert([previous,commit].includes(run('git',['rev-parse','HEAD'],primary)));
if(ref('codex/poms-r4ghi-next25')!==commit)run('git',['-c','pack.useSparse=false','push','--porcelain','origin',commit+':refs/heads/codex/poms-r4ghi-next25']);
if(run('git',['rev-parse','HEAD'],primary)!==commit)run('git',['merge','--ff-only','--quiet',commit],primary);
if(ref('main')!==commit)run('git',['-c','pack.useSparse=false','push','--porcelain','origin',commit+':refs/heads/main']);
assert.equal(ref('main'),commit);assert.equal(ref('codex/poms-r4ghi-next25'),commit);assert.equal(run('git',['status','--porcelain=v1'],primary),'');
const receipt={kind:'actual-userfix-G4-Seal-main-publication',capturedAt:new Date().toISOString(),commit,previous,remoteMain:commit,remoteFeature:commit,primaryClean:true,metadataOnly:true,G4Certified:JSON.parse(fs.readFileSync('docs/design/rust-r4ghi-delivery-status.json')).independentUserFix.G4Certified};
assert.equal(receipt.G4Certified,true);fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
