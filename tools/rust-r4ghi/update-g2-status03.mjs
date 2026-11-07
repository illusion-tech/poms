import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const out = 'tmp/rust-r4ghi/root/g2-online-status03';
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const marker = '<!-- poms-r4ghi-g2-current03 -->';
const repo = 'repos/illusion-tech/poms';
function api(name, endpoint, body) {
    const args = ['api', endpoint];
    if (body) {
        const input = `${out}/${name}-input.json`; fs.writeFileSync(input, JSON.stringify(body) + '\n', { flag: 'wx' });
        args.push('--method', 'PATCH', '--input', input);
    }
    const result = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    fs.writeFileSync(`${out}/${name}-stdout.json`, result.stdout ?? '', { flag: 'wx' });
    fs.writeFileSync(`${out}/${name}-stderr.log`, result.stderr ?? '', { flag: 'wx' });
    assert.equal(result.status, 0, `GitHub ${name} failed`);
    return JSON.parse(result.stdout);
}
const children = api('native-children110', `${repo}/issues/110/sub_issues`);
for (const number of [111,112,113,114]) assert(children.some((x) => x.number === number));
const common = `状态：**Doing / OPEN，联合 G1 已冻结，G2 实现及联合验收进行中**。2026-11-07（Asia/Tokyo）。

正式 Rust 仍为 **240**；R4 已交付 **67**、规划 **95**，余 **28**。本批 G9 / H8 / I11，另含 #117 的 R5 最小角色4，共 **32** 项（29既有、3新增）。272 是通过验收后的目标，当前新增正式交付0。

六项已采纳业务裁决继续生效：零权重必须有原因；只有最终验收能完工并提供本人条件闭合；创建人仅负责真实组织项目首次主责指派，之后按真实责任链授权。补关历史期间是否替换当前经营及提成依据仍待用户裁决，对应部分未认证。

G2 已完成的单项检查：两库 M96 追加迁移与原有数据保留核验；完整共享 S5 候选 242 paths / 296 operations / 689 schemas；完整 SDK 682 文件实际 write/check、并发一致性和 Windows 兼容入口通过；完整 Rust 枚举导出 write/check 通过。上述为限定证据，完整真实业务 HTTP、故障/并发、原 UI、精确清理及独立 G3/G4 仍须完成。最新修正后的统一 Rust 严格检查正在复跑。

已提交工具与输入：[S5 输入 A](https://github.com/illusion-tech/poms/commit/883f88fdf4fd609bb8b0725b28bda011d408d6ee)、[SDK 工具 B](https://github.com/illusion-tech/poms/commit/f072f7d58fa3ef551d7194f8305f176678aedb79)、[完整枚举导出工具 C](https://github.com/illusion-tech/poms/commit/2fd1db7d)。实现候选尚未计入 main 正式交付。#115 已独立 CLOSED，不重复验收；#57/#101/#110/#116/#117 保持 OPEN。无部署、切流或性能认证。
`;
const checklists = {
    57: `- [x] R0–R3：已按各阶段 G4 收口\n- [ ] R4 #101：本批 #110 / #111 / #112 / #113 / #114 及完整阶段验收\n- [ ] R5 #116：本批仅推进最小依赖 #117，完整提成链仍开放\n- [ ] R6：迁移发布接管与回滚演练\n- [ ] R7：正式切换、观察及旧后端退出`,
    110: `- [x] G0 / 联合 G1：精确 32 项与 canonical / DTO / DDL / producer 冻结\n- [ ] G2：限定实现及全部文件交付\n- [ ] 统一候选真实 HTTP / PG / 权限 / 故障 / 并发 / 原 UI\n- [ ] 独立 G3、固定提交及 main 集成\n- [ ] 精确清理、归档、独立 G4 与线上读回`,
    114: `- [x] 联合 G1 验收输入与范围冻结\n- [x] 隔离 PG15、M95/M96、TEMP 清理可行性探针\n- [ ] 首批37、第二批30、本批28及 R5 最小4的真实联合链路\n- [ ] 必要写故障、跨项目并发、JSON / DOM 敏感投影及本人任务\n- [ ] 精确清理与两次全量 noop\n- [ ] 独立 G3 / G4 与最终实际读回`,
};
const receipts = [];
for (const number of [57,110,114]) {
    const prior = api(`before-${number}`, `${repo}/issues/${number}`);
    assert.equal(prior.state, 'open'); assert(!prior.body.includes(marker));
    api(`comments-${number}`, `${repo}/issues/${number}/comments?per_page=100`);
    const body = `${marker}\n\n${common}\n${checklists[number]}\n\n<!-- /poms-r4ghi-g2-current03 -->\n\n<details><summary>历史冻结与验收记录（原文保留，以顶部当前状态为准）</summary>\n\n${prior.body.trim()}\n\n</details>\n`;
    const fresh = api(`prewrite-${number}`, `${repo}/issues/${number}`); assert.equal(fresh.body, prior.body, 'Issue changed during preparation');
    api(`patch-${number}`, `${repo}/issues/${number}`, { body });
    const after = api(`after-${number}`, `${repo}/issues/${number}`); assert.equal(after.body, body); assert.equal(after.state, 'open');
    receipts.push({ number, url: after.html_url, bodySHA256: createHash('sha256').update(body).digest('hex'), state: after.state });
}
fs.writeFileSync(out+'/receipt.json', JSON.stringify({ kind:'actual-GitHub-G2-status-refresh', capturedAt:new Date().toISOString(), receipts, productG3:false, productG4:false, officialNewDelivered:0 },null,2)+'\n',{flag:'wx'});
const file='docs/design/rust-r4ghi-delivery-status.json', index=JSON.parse(fs.readFileSync(file));
index.date='2026-11-07'; index.pendingBusinessDecisions=[{ key:'period-closing-current-head-policy',status:'awaiting-user',question:'补关历史期间是否替换项目当前经营及提成闸门依据',dependentCertification:false }];
index.G3Certified=false;index.G4Certified=false;index.g2CurrentOnline='../../'+out+'/receipt.json';
fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({updated:receipts.map(x=>x.number),allOpen:true,formalRust:240,productG3:false,productG4:false}));
