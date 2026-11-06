import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const seal='d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5',out='tmp/rust-r4ghi/root/userfix-final-links01';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});let seq=0;const calls=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
function api(label,endpoint,method='GET',body){const p=out+'/'+String(++seq).padStart(2,'0')+'-'+label,args=['api',endpoint,'--method',method];if(body!==undefined){fs.writeFileSync(p+'-input.json',JSON.stringify(body,null,2)+'\n',{flag:'wx'});args.push('--input',p+'-input.json');}const r=spawnSync('gh',args,{encoding:null,windowsHide:true,timeout:55000,maxBuffer:10000000});fs.writeFileSync(p+'-stdout.json',r.stdout??Buffer.alloc(0),{flag:'wx'});assert.equal(r.status,0);calls.push({label,exitCode:r.status,file:p+'-stdout.json',rawBytesSha256:sha(r.stdout)});return JSON.parse(r.stdout);}
const blob=spawnSync('git',['show',seal+':tools/rust-r4ghi/independent/userfix-final/g4-actual-review01.json'],{encoding:null,windowsHide:true});assert.equal(blob.status,0);assert.equal(sha(blob.stdout),'a3656dd231f41419be680bc5b8f163993ae70fc9c48025a78912c15767b1cd6f');
const repo='repos/illusion-tech/poms';assert.equal(api('main',repo+'/git/ref/heads/main').object.sha,seal);
const note=`#115 G4 已完成。实际线上关闭与独立G4终审已通过，[Seal主线](https://github.com/illusion-tech/poms/commit/${seal}) 已发布；[独立实际证书](https://github.com/illusion-tech/poms/blob/${seal}/tools/rust-r4ghi/independent/userfix-final/g4-actual-review01.json) SHA256 a3656dd231f41419be680bc5b8f163993ae70fc9c48025a78912c15767b1cd6f。实现874e35fc、归档42b6fc3及永久S4保留。仅#115 CLOSED/completed，#57和R4/R5相关Issue继续OPEN；新增HTTP为0，正式Rust240，R4联批32尚待联合G1/实现验收。\n\n<!-- userfix115-final-seal -->`;
const comments=[];
for(const n of [115,57]){
 const before=api('before-'+n,repo+'/issues/'+n);assert.equal(before.state,n===115?'closed':'open');assert(!before.body.includes('<!-- userfix115-final-seal -->'));
 let body=before.body;
 if(n===115)body=body.replace(/^状态：[\s\S]*?\n\n/,'状态：Done / G4Certified。实现、验收、独立G3/G4、main/归档及Seal均已完成。\n\n');
 else {assert(body.includes('- [x] 既有R2补缺：'));body=body.replace('实际线上读回与最终Seal另记。','实际线上读回及最终Seal均已核。');}
 body+='\n\n'+note+'\n';api('update-'+n,repo+'/issues/'+n,'PATCH',{body});
 const comment=api('comment-'+n,repo+'/issues/'+n+'/comments','POST',{body:note});comments.push({number:n,id:comment.id,url:comment.html_url});
 const after=api('readback-'+n,repo+'/issues/'+n);assert.equal(after.body,body);assert.equal(after.state,n===115?'closed':'open');if(n===115)assert.equal(after.state_reason,'completed');assert.equal(api('comment-readback-'+n,repo+'/issues/comments/'+comment.id).body,note);
}
const protectedOpen=[57,101,110,111,112,113,114,116,117];for(const n of protectedOpen)assert.equal(api('protected-'+n,repo+'/issues/'+n).state,'open');assert(api('parent-tree',repo+'/issues/57/sub_issues?per_page=100').some(x=>x.number===115&&x.state==='closed'));
const receipt={kind:'actual-userfix-final-Seal-Issue-links-readback',capturedAt:new Date().toISOString(),seal,certificateSHA256:sha(blob.stdout),closed:[115],protectedOpen,comments,allScopedUserFixWorkComplete:true,protectedParentTreePreserved:true,calls};fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({userFix115Complete:true,seal,closed:[115],protectedOpen}));
