import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const planFile='tmp/rust-r4ghi/root/userfix-close-plan01/plan.json',planBytes=fs.readFileSync(planFile);assert.equal(sha(planBytes),'1d3ca1d09a62410f5329d7fd771e4438e26eedd0a838cb6638e5aa8163ac3b7f');
assert.equal(sha(fs.readFileSync('tools/rust-r4ghi/independent/userfix-final/g4-preclose-review01.json')),'ff21f1e621cc436ad517cb58e0f87a73d2f18a3ac8510c226eeb15c7acdd26bd');
const plan=JSON.parse(planBytes),out='tmp/rust-r4ghi/root/userfix-online01';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});let seq=0;const calls=[];
function api(label,endpoint,method='GET',body){const prefix=out+'/'+String(++seq).padStart(2,'0')+'-'+label,args=['api',endpoint,'--method',method];if(body!==undefined){fs.writeFileSync(prefix+'-input.json',JSON.stringify(body,null,2)+'\n',{flag:'wx'});args.push('--input',prefix+'-input.json');}const r=spawnSync('gh',args,{encoding:null,windowsHide:true,timeout:55000,maxBuffer:10000000});fs.writeFileSync(prefix+'-stdout.json',r.stdout??Buffer.alloc(0),{flag:'wx'});fs.writeFileSync(prefix+'-stderr.bin',r.stderr??Buffer.alloc(0),{flag:'wx'});calls.push({label,method,endpoint,exitCode:r.status,stdout:prefix+'-stdout.json',rawBytesSha256:sha(r.stdout??Buffer.alloc(0))});fs.writeFileSync(out+'/progress.json',JSON.stringify(calls,null,2)+'\n');assert.equal(r.status,0,'Inspect saved partial online state before retrying');return JSON.parse(r.stdout);}
const repo='repos/illusion-tech/poms';assert.equal(api('main-before',repo+'/git/ref/heads/main').object.sha,plan.mainCommit);
for(const n of [115,...plan.keepOpen])assert.equal(api('state-before-'+n,repo+'/issues/'+n).state,'open');
for(const update of plan.updates){const current=api('cas-'+update.number,repo+'/issues/'+update.number);assert.equal(sha(Buffer.from(current.body)),plan.before[update.number].bodySHA256);assert.equal(current.state,'open');}
const comments=[];
for(const update of plan.updates){
 const payload=update.number===115?{body:update.body,state:'closed',state_reason:'completed'}:{body:update.body};
 const result=api('update-'+update.number,repo+'/issues/'+update.number,'PATCH',payload);assert.equal(result.body,update.body);assert.equal(result.state,update.state);
 const comment=api('comment-'+update.number,repo+'/issues/'+update.number+'/comments','POST',{body:update.comment});comments.push({number:update.number,id:comment.id,url:comment.html_url});
 const actual=api('readback-'+update.number,repo+'/issues/'+update.number);assert.equal(actual.body,update.body);assert.equal(actual.state,update.state);if(update.number===115)assert.equal(actual.state_reason,'completed');
 assert.equal(api('comment-readback-'+update.number,repo+'/issues/comments/'+comment.id).body,update.comment);
}
for(const n of plan.keepOpen)assert.equal(api('state-after-'+n,repo+'/issues/'+n).state,'open');
assert(api('parent-tree',repo+'/issues/57/sub_issues?per_page=100').some(x=>x.number===115&&x.state==='closed'));
const receipt={kind:'actual-userfix-only-G4-online-update',capturedAt:new Date().toISOString(),plan:{file:planFile,rawBytesSha256:sha(planBytes)},mainCommit:plan.mainCommit,closed:[115],keptOpen:plan.keepOpen,comments,exactBodiesAndCommentsReadBack:true,nativeParent57ReadBack:true,allProtectedIssuesOpen:true,actualG4FinalReviewPending:true,calls};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({closed:[115],keptOpen:plan.keepOpen,exactBodiesCommentsNativeParentReadBack:true}));
