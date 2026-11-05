// Authorized G3 Issue progress only; all six Issues remain open.
import fs from'node:fs';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';
const out='tmp/rust-r4def/root/github-g3-174',commit='d6c3cff84dd96c981bab075d3f4aca3e98c76c4b';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});const main=JSON.parse(fs.readFileSync('tmp/rust-r4def/root/main168/receipt168.json'));assert(main.mainIntegrated&&main.remoteMain===commit);const body=`G3 已独立通过，固定实现已集成 main；G4 归档与线上收口继续进行。

- 实现：[${commit.slice(0,8)}](https://github.com/illusion-tech/poms/commit/${commit})；[独立 G3 原件](https://github.com/illusion-tech/poms/blob/${commit}/tools/rust-r4def/independent-final131/g3-final131.json)。永久 S4 4f0ad88e 保留。
- 限定 D7/E11/F12 共30 HTTP（28既有＋2新增）；分摊按用户所选金额层优先，policy v2。移交本人职责确认与受控合同变更闭环完成，执行准入仍受 R5 有效角色冻结约束。
- 实际30入口正例、94拒绝、必要写故障/并发/原UI有效证据已独立核对。Rust 416 passed / 54 ignored（ignored不当DB验收）；Native863、Admin417；当前Native lint仅2既有警告、0新增，tsc通过。完整spec293/626、client616。
- 精确清理已实际提交：Rust仅删除2673个已证明新增PK并恢复3处原件；两库各两次新连接核对原120表/532行。62对象先保全校验后逐项unlink；自有PG15/端口停止，container/volume/private保留。
- 当前技术Rust240；本批正式交付计数仍待G4，不提前关闭Issue。完整R4、后续经营17/验收完工归档8、R5–R7及部署切流未完成；#101/#57保持Open。历史Failed/Partial/ignored及Native ORM exit1分类均保留。

<!-- poms-r4def-g3-d6c3cff8 -->
`;fs.writeFileSync(out+'/comment.md',body,{flag:'wx'});const records=[];
for(const n of[106,107,108,109,101,57]){const beforeRaw=execFileSync('gh',['issue','view',String(n),'--json','number,state,body,comments'],{encoding:'utf8',maxBuffer:8000000}),before=JSON.parse(beforeRaw);assert.equal(before.state,'OPEN');fs.writeFileSync(out+'/'+n+'-before.json',beforeRaw,{flag:'wx'});const prior=before.comments.filter(c=>c.body.includes('<!-- poms-r4def-g3-d6c3cff8 -->'));assert(prior.length<2);let url=prior[0]?.url;if(prior.length)assert.equal(prior[0].body,body.trimEnd());else url=execFileSync('gh',['issue','comment',String(n),'--body-file',out+'/comment.md'],{encoding:'utf8'}).trim();const afterRaw=execFileSync('gh',['issue','view',String(n),'--json','number,state,body,comments'],{encoding:'utf8',maxBuffer:8000000}),after=JSON.parse(afterRaw);assert.equal(after.state,'OPEN');assert.equal(after.body,before.body);assert(after.comments.some(c=>c.body.trimEnd()===body.trimEnd()));fs.writeFileSync(out+'/'+n+'-after.json',afterRaw,{flag:'wx'});records.push({issue:n,state:after.state,comment:url,readback:true});console.log(JSON.stringify(records.at(-1)));}
fs.writeFileSync(out+'/receipt174.json',JSON.stringify({kind:'actual-G3-Issue-progress174',capturedAt:new Date().toISOString(),implementationCommit:commit,issues:records,allSixRemainOpen:true,G4Certified:false},null,2)+'\n',{flag:'wx'});
