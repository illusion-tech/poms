// Root authorized Issue/Gate maintenance; all six Issues remain open.
import fs from'node:fs';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';
const out='tmp/rust-r4def/root/github-progress90';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),link=p=>`https://github.com/illusion-tech/poms/blob/${head}/${p}`;
const text='G2 联合验收增量（当前仍 Doing；不是 G3/G4 或正式交付）。\n\n'+
'- 所选金额层优先已实际验证：含税0.12按1:1为0.06/0.06；整批替代、未知层保留null及numeric(18,2)上限精确字符串均已覆盖，旧证据不重算。\n'+
'- D：真实多合同连续变更、逐项差异复核、审批、生效、再基线化、三人各自重新确认及R5阻断，API和Linux/Windows原生产界面均通过。\n'+
'- E/F：实际来源与精度、必要写故障、敏感读失败关闭、真实自然throttle后的pending-auth回滚/重试已补证。10项受控PG并发的有效场景均通过，包括交叉来源占用、真实费率族反序和三项目一分钱确定性分配。错误测试门控及原ACK如实保留。\n'+
'- K：真实附件续跑7阶段、60HTTP及13份独立PG证明通过；旧过期会话正式中止，新对象final与staging分离，最终材料变化使旧本人确认失效。独立源码预审另发现重复link/inactive unlink漏锁内复核P2，已冻结[K86两文件纠偏]('+link('docs/design/rust-r4def/g2-K86-correction.json')+')，修复及最终二进制复验进行中。\n'+
'- 当前候选检查：Rust405 passed/54历史ignored（不作DB验收）、Native863、Angular417、原Nx foundation13；ignored、旧Node协议参考、失败及partial保持原标签。\n\n'+
'尚待K86最终候选的字节/幂等/必要写与并发复验、精确自有数据清理、独立G3/G4及main实际集成。正式main仍210，本批正式新增交付0。只在全部条件满足后收口#107/#108/#109/#106；#101/#57保持Open，R4经营17、验收完工归档8及R5–R7持续后续。\n';
for(const n of [106,107,108,109,101,57]){
 const raw=execFileSync('gh',['issue','view',String(n),'--json','number,title,state,body,comments'],{encoding:'utf8',maxBuffer:4000000}),before=JSON.parse(raw);assert.equal(before.state,'OPEN');fs.writeFileSync(out+'/'+n+'-before.json',raw,{flag:'wx'});
 const file=out+'/'+n+'-comment.md';fs.writeFileSync(file,text,{flag:'wx'});const url=execFileSync('gh',['issue','comment',String(n),'--body-file',file],{encoding:'utf8'}).trim();
 const afterRaw=execFileSync('gh',['issue','view',String(n),'--json','number,state,body,comments'],{encoding:'utf8',maxBuffer:4000000}),after=JSON.parse(afterRaw);assert.equal(after.state,'OPEN');assert.equal(after.body,before.body);assert(after.comments.some(c=>c.body===text));fs.writeFileSync(out+'/'+n+'-after.json',afterRaw,{flag:'wx'});console.log(JSON.stringify({issue:n,state:after.state,comment:url,bodyUnchanged:true,readback:true}));
}
