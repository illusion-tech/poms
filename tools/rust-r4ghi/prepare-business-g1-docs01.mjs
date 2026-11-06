import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const repository = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
process.chdir(repository);
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true });
assert.equal(head.status, 0);
assert.equal(head.stdout.trim(), 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5');
const marker = '<!-- poms-r4ghi-next32-input -->';
const section = `

${marker}

### 2026-11-06 R4 GHI 与最小 R5 的 32 项联合输入

按六项用户裁决形成 [联合基线](rust-r4ghi-next32-baseline.md)：G9、H8、I11、最小角色4，共32项；其中29既有、3新增。新canonical已在 authoritative inventory 6.25 登记，R4规划总数95、本批剩余28；正式交付仍67、Rust仍240，272仅为验收后的目标。联合G1独立复核及线上冻结尚待完成，当前不准入G2。

回款含税额须有可追溯净税依据；成本显式分类由服务端核算；零分成角色须说明原因；最终验收与有条件完工须真实闭环。创建人仅有可证、未消费的首次个人主责指派权，此后按真实责任链授权。首轮独审的两项P1/一项P2保留失败记录，有效v2及正式字节manifest另行复核。

三业务作者从同一冻结输入独立工作，Root统一共享契约、迁移/实体、真实producer支撑、接线、生成物与环境。完整R4阶段验收及独立G3/G4通过后才可关闭#101；本批只能在各自通过后关闭#111/#112/#113/#117/#114/#110，完整R5父#116和总体#57保持Open。#115已独立G4并Closed，不重复计本批新增。

<!-- /poms-r4ghi-next32-input -->
`;
const indexPaths = [
  'docs/design/backend-rust-migration-plan.md',
  'docs/design/rust-migration-execution-tracker.md',
  'docs/design/rust-r4-scope-and-dependencies.md',
  'docs/design/phase2-development-execution-tracker.md',
];
for (const path of indexPaths) {
  let value = fs.readFileSync(path, 'utf8');
  assert(!value.includes(marker), `already prepared: ${path}`);
  value = value.replaceAll('(rust-r4ghi-user-create-fix-baseline.md)', '(archive/slices/rust-r2-user-create-fix115/baseline.md.bin)');
  fs.writeFileSync(path, (value.trimEnd() + section).trimEnd() + '\n');
}
const statusPath = 'docs/design/rust-r4ghi-delivery-status.json';
const state = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
assert.equal(state.G1Certified, false);
assert.equal(state.G2Authorized, false);
assert.equal(state.independentUserFix.G4Certified, true);
state.stage = 'G1ReviewInput';
state.r4Progress = { delivered: 67, total: 95, remaining: 28, denominatorMeaning: 'planned canonical including 3 new R4 routes; no new delivery certified' };
state.candidateScope.exactContractFreezePending = true;
state.forecast = { RustOperationsAfterAcceptance: 272, R4DeliveredAfterAcceptance: 95, notDeliveryEvidence: true };
state.businessBaseline = 'rust-r4ghi-next32-baseline.md';
state.operationMap = 'rust-r4ghi/operation-map01.json';
state.formalInputManifest = 'rust-r4ghi/g1-source-manifest01.json';
state.effectiveTechnicalInput = '../../tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json';
state.userDecisionSources = ['rust-r4ghi/user-decisions02.json', 'rust-r4ghi/user-decision-scope03.json'];
state.independentUserFix.sealCommit = head.stdout.trim();
state.independentUserFix.finalIssueLinksVerified = true;
fs.writeFileSync(statusPath, JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify({ kind: 'business-G1-doc-index-preparation', status: 'Pending independent G1 and online freeze', changed: [...indexPaths, statusPath], productChanges: 0 }));
