import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const commit='21e9124160f92dce38a5029786273fdb893759f0';
const out='tmp/rust-r4ghi/root/user-fix-g1-online01';
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const source='docs/design/rust-r4ghi/user-fix-g1-sources01.json';
const manifest=JSON.parse(fs.readFileSync(source,'utf8'));
for(const pin of [manifest.baseline,...manifest.sources])assert.equal(sha(fs.readFileSync(pin.file)),pin.rawBytesSha256);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
let count=0;const originals=[];
function api(label,path,method='GET',payload){
 const name=out+'/'+String(++count).padStart(2,'0')+'-'+label,args=['api',path,'--method',method];
 if(payload!==undefined){fs.writeFileSync(name+'-request.json',JSON.stringify(payload,null,2)+'\n',{flag:'wx'});args.push('--input',name+'-request.json');}
 const result=spawnSync('gh',args,{encoding:null,windowsHide:true,timeout:55000});
 fs.writeFileSync(name+'-stdout.json',result.stdout??Buffer.alloc(0),{flag:'wx'});fs.writeFileSync(name+'-stderr.bin',result.stderr??Buffer.alloc(0),{flag:'wx'});
 originals.push({label,exitCode:result.status,stdout:name+'-stdout.json',rawBytesSha256:sha(result.stdout??Buffer.alloc(0))});assert.equal(result.status,0);return JSON.parse(result.stdout);
}
const repo='repos/illusion-tech/poms';
assert.equal(api('remote-commit',repo+'/git/ref/heads/codex/poms-r4ghi-next25').object.sha,commit);
const before=api('issue-before',repo+'/issues/115');assert.equal(before.state,'open');
assert(!before.body.includes('user-create-G1-21e91241'));
const body=`G1 已冻结，仅限 #115 用户创建关联修复；R4 #110 的 G1 仍 Pending。\n\n- Input commit: [${commit}](https://github.com/illusion-tech/poms/commit/${commit})。\n- Baseline: [限定实施基线](https://github.com/illusion-tech/poms/blob/${commit}/docs/design/rust-r4ghi-user-create-fix-baseline.md)。\n- Source manifest: \`${source}\` SHA256 \`${sha(fs.readFileSync(source))}\`；14原始来源及基线已核，原产品source aaa4b16a。\n- 保留既有 POST /api/platform/users、请求/返回、权限/CSRF及成功状态；无新增route/DDL/生成契约。\n- UUID生成后写真实角色/主组织关联；引用在TX内锁定并复核，typed UUID去重、未知404/停用或重复409；用户名唯一竞态409。用户、关联、必要审计与待刷新认证会话整体提交或回滚。\n- 旧W01复制Node缺陷的500仅保留历史参考，已superseded，不纳入当前验收证书。真实成功/拒绝、due/non-due、逐必要写故障回滚与重试、受控并发及独立G3/G4均待执行。\n- 本读回允许 #115 限定G2；不代表实现/验收/G3/G4完成，不计R4新25；#57保持Open。\n\n<!-- user-create-G1-21e91241 -->`;
const comment=api('freeze-comment',repo+'/issues/115/comments','POST',{body});
const updated=before.body.replace(/^状态：[\s\S]*?\n\n/,'状态：#115 G1已冻结 / 限定G2准入，实现与验收尚未完成。\n\n').replace('- [ ] G1：canonical/DTO/DDL/真实producer/审批/事务/版本/金额精度/跨线依赖冻结','- [x] G1：#115创建关联、14来源、typed UUID、锁内校验及必要写整体事务冻结')+'\n\n'+body+'\n';
assert.notEqual(updated,before.body);api('issue-update',repo+'/issues/115','PATCH',{body:updated});
const actual=api('issue-readback',repo+'/issues/115');assert.equal(actual.body,updated);assert.equal(actual.state,'open');
const actualComment=api('comment-readback',repo+'/issues/comments/'+comment.id);assert.equal(actualComment.body,body);
assert(api('parent-readback',repo+'/issues/57/sub_issues?per_page=100').some(x=>x.number===115));
assert.equal(api('parent-state',repo+'/issues/57').state,'open');
const receipt={kind:'actual-user-create-fix-G1-online-freeze',capturedAt:new Date().toISOString(),issue:115,parent:57,inputCommit:commit,sourceManifest:{file:source,rawBytesSha256:sha(fs.readFileSync(source))},baseline:manifest.baseline,sourcesVerified:14,comment:{id:comment.id,url:comment.html_url,bodySHA256:sha(Buffer.from(body))},issueBodyReadbackSHA256:sha(Buffer.from(actual.body)),G1Certified:true,G2Authorized:true,implementationAccepted:false,G3Certified:false,G4Certified:false,R4G1Certified:false,originals};
fs.writeFileSync('docs/design/rust-r4ghi/user-fix-online01.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({issue:115,comment:comment.html_url,G1Certified:true,G2Authorized:true,R4G1Certified:false}));
