import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const cleanup=JSON.parse(fs.readFileSync('tmp/rust-r4ghi/business/g2-business09/main01/000277-cleanup-apply01-complete.json.receipt.json'));assert.equal(cleanup.mode,'apply-cleanup');assert.equal(cleanup.status,'completed');
const spec=JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json')),operation=spec.paths['/api/projects/{id}'].patch.operationId;assert.equal(operation,'ProjectController_updateBasicInfo');
const file='apps/poms-api-rust/src/projects/service.rs',before=fs.readFileSync(file);assert.equal(sha(before),'66dc2a2b26e710fb8217e77193c5590cdb8a9dac25fd0afb1d0870849762cdc4');
const old='operation_id: "ProjectController_update".into()',next='operation_id: "'+operation+'".into()';assert.equal(before.toString().split(old).length,2);
const after=Buffer.from(before.toString().replace(old,next)),out='tools/rust-r4ghi/checkpoints/project-audit32';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/service-before.rs.bin',before,{flag:'wx'});fs.writeFileSync(file,after);
const doc='docs/design/rust-r4ghi/g2-corrective01.md',text=fs.readFileSync(doc,'utf8');assert.equal(text.split('\n共享 TS/DTO').length,2);assert(!text.includes('\n31. 用户已经裁决'));
const note='\n31. 用户已经裁决实时快照维护当前、期末独立保留历史，见 user-decision-period05.json；原第6、11项的待裁决状态已解除。补关及期间终端不提升为实时current；完整实际纠正闭包如同时含live终端，仍按各自当前关系处理。新source epoch的验收准入绑定实际裁决固定SHA，不接受请求中的approved布尔值。真实已完成期间及有效来源条件继续执行；用户另批准保留最终合格来源和隔离候选跨期验收，见 user-decision-period-retention06.json，未通过项及父批次保持开放。\n32. 真实Legacy权限负例暴露支持工具使用了未登记的ProjectController_update；完整契约PATCH操作实际为ProjectController_updateBasicInfo。工具在任何新ownership HTTP前核全部固定operationId，时区证明按精确offset与纳秒比较原PG时间，不重放已提交201。产品新增编辑审计同步使用正式updateBasicInfo事件名，修复前候选API132/epoch09的原件、208个owned PK精确清理及双fresh noop保留；修复后API133必须用新epoch重验。公共路由/DTO、授权、CAS与写入边界不变。\n';
fs.writeFileSync(doc,text.replace('\n共享 TS/DTO',note+'\n共享 TS/DTO'));
const receipt={kind:'Root-canonical-project-metadata-audit-operation-correction',file,beforeSHA256:sha(before),afterSHA256:sha(after),canonicalOperationId:operation,
  productChange:'one audit event literal only',oldEpochCleaned:true,oldCleanup:cleanup.original,newCandidate:'API133/new10',publicContractChanged:false,actualPGRegressionPending:true,G3Certified:false};
fs.writeFileSync('docs/design/rust-r4ghi/project-audit-operation-correction32.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
