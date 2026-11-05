import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=[
 'apps/poms-api-rust/src/users/service.rs','apps/poms-api-rust/src/users/store.rs',
 'apps/poms-api-rust/src/users/model.rs','apps/poms-api-rust/src/users/validation.rs',
 'apps/poms-api-rust/src/users/http.rs','apps/poms-api-rust/src/database.rs',
 'apps/poms-api-rust/src/auth/store.rs','apps/poms-api-rust/tests/users_database.rs',
 'apps/poms-api/src/app/features/platform/platform.service.ts',
 'apps/poms-api/src/app/features/platform/platform.controller.ts',
 'apps/poms-api/src/migrations/Migration20260325153000_init_platform_governance_core.ts',
 'libs/shared/contracts/src/lib/shared-contracts.ts','libs/shared/api-spec/openapi.json',
 'docs/design/api-route-canonical-inventory.md',
];
const baseline='docs/design/rust-r4ghi-user-create-fix-baseline.md';
const pin=file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,rawBytesSha256:sha(b)};};
if(process.argv.includes('--refresh-formatted-baseline')){
 const target='docs/design/rust-r4ghi/user-fix-g1-sources01.json';
 const previous=JSON.parse(fs.readFileSync(target,'utf8'));
 assert.equal(previous.implementationStarted,false);
 for(const item of previous.sources)assert.deepEqual(pin(item.file),item);
 previous.baseline=pin(baseline);
 fs.writeFileSync(target,JSON.stringify(previous,null,2)+'\n');
 console.log(JSON.stringify({refreshedFormattedBaseline:true,sourcesUnchanged:previous.sources.length}));
 process.exit(0);
}
const manifest={kind:'user-create-fix-G1-source-freeze',sourceCommit:'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee',issue:115,scope:'POST /api/platform/users only',baseline:pin(baseline),sources:sources.map(pin),G1Certified:true,implementationStarted:false,publicRouteDelta:0,schemaDelta:0,sourceOnlyNotAcceptance:true};
fs.writeFileSync('docs/design/rust-r4ghi/user-fix-g1-sources01.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const note='\n\n<!-- poms-r4ghi-g0 -->\n\n### 2026-11-06 R4 第三批立项与联合 G1 输入审计\n\n已按用户授权建立 [本批 #110](https://github.com/illusion-tech/poms/issues/110) → G#111/H#112/I#113/阶段验收#114；[用户创建关联补缺 #115](https://github.com/illusion-tech/poms/issues/115) 为 #57 独立子项。G9/H8/I8共25既有入口及内部机制正在审计，角色冻结最小依赖、受控阶段推进、回款净税依据、成本纳入口径尚待联合冻结。当前 `G1Pending`、本批产品实现未准入，正式Rust240、R4累计67/92、余25。\n\n[#115 基线](rust-r4ghi-user-create-fix-baseline.md)仅冻结用户创建必要写同事务及真实关联修复，可独立推进；不计入R4新入口。三作者显式gpt-6.1-sol/max，Fast未核实；Root独占公共契约/迁移/路由/生成物/Git及统一环境。完整阶段验收及独立G3/G4通过后才可收口#101，#57保持Open。\n\n[当前状态](rust-r4ghi-delivery-status.json)与[实际G0读回](rust-r4ghi/g0-registration01.json)保留真实Gate；历史已归档交付不重写。\n\n<!-- /poms-r4ghi-g0 -->\n';
for(const file of ['docs/design/backend-rust-migration-plan.md','docs/design/rust-migration-execution-tracker.md','docs/design/rust-r4-scope-and-dependencies.md','docs/design/phase2-development-execution-tracker.md']){
 const old=fs.readFileSync(file,'utf8');assert(!old.includes('<!-- poms-r4ghi-g0 -->'));
 fs.writeFileSync(file,old+note);
}
console.log(JSON.stringify({frozenUserFixSources:manifest.sources.length,R4G1Certified:false,issue:115}));
