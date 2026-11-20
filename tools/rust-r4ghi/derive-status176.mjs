import fs from 'node:fs';
import assert from 'node:assert/strict';
let code = fs.readFileSync('tools/rust-r4ghi/update-g2-status09.mjs', 'utf8');
const commit = 'd90811f2e422d8037699058452d42cfbbd020345', base = 'https://github.com/illusion-tech/poms/blob/' + commit + '/';
const common = `状态：**Doing / OPEN；联合G1仍为32项，G2继续，G3 Pending / G4 false**。2026-11-08（Asia/Tokyo）。

正式Rust **240**，R4正式 **67/95**、余28，本批新增认证 **0**。Runtime272与canonical296 operations／242 paths／690 schemas保持各自口径。

[本轮真实表单与保全检查点](${base}docs/design/rust-r4ghi/source12-tail170-actual.json)已发布至工作分支d90811f2；main仍d5c79b26，没有合并、部署或切流。产品仍Source12/406份输入/M97/每库139表。原135进程退出后的同源1351经过[原卷守恒及显式进程准入](${base}docs/design/rust-r4ghi/process1351-recovery161-actual.json)，旧135证据保持原标签。1351现已精确停止、原卷保留，Source13/M98尚未应用。

本轮新增事实：

- Own真实界面关闭条件A、随后同任务两会话CAS 200/409，全部必要写入和聚合状态均核；旧失败及已上传但未消费的证据仍保留。Creator已提交首次指派另做真实只读读回，未重发消费命令；Legacy、MAX、MASK按各自受审边界完成真实界面。
- 角色原create200不重发，五项父锁保护负控全部23514/整体回滚；真实UI freeze200与同用户独立会话合法revised-create409形成真实锁等待链。另以新1351绑定冷开current/detail，业务version=1、rowVersion=2、四人及零权重原因准确显示；没有创建或再次冻结入口。
- Expense四个真实表单完成；生命周期真实上传三份独立材料并完成进入验收、最终验收通过、完工、归档，E仅project read/write。原startExecution不重放，业务时间取实际后端Date。
- GH03真实采用基线201后精确续验，GH04只提交成本分类与经营快照201、真实H08质性复核200、首阶段闸门收紧200，没有重发基线。GH02/GH03/Life01及其它旧失败不改passed；各subset的原A08 aggregate标记不改。
- [独立原件复核](${base}tools/rust-r4ghi/independent/final-gates13/addendum162.md)已核8轮192份代理raw及关联ledger/case原件。它是已完成事实审计，G3/G4明确未审未签。
- [Source12保全](${base}docs/design/rust-r4ghi/retained-source12-before-source13-139.json)包含406成员代码ZIP逐一读回、双库custom archive及TOC、40对象、新旧进程/候选/准入链和工具原件；备份前后全部raw/xmin/catalog/sequence/objects守恒。不声称实际restore或portable xmin恢复认证。

此前Stage87全87必要写入FI及共享201/capture409、Native17参考及单会话清理S0守恒、API134的102/45/34与金额边界、API135同值编辑/审计回滚/C条款锁等原件保持原标签。

仍待完成：四项Source13产品纠偏及最终H0/G2冻结、正常双库M98与显式schema3准入；fresh Main G与TaxRef-only完整目标/原子性、完整H规则边界、传递Labor遮罩及必要权限；自然期末和统一候选独立G3/G4。组合106的535纯测/编译只是未应用提案，不能作Source13实际候选。新的schema准入、无state after观察及真实正常UP捕获工具已复核，但尚未执行M98。

历史首次补关选包策略仍待用户裁决；当前不批准自动历史选包。按用户决定保留真实来源，最早**香港2026-11-09 00:00／日本01:00**自然跨期后再验本周期末，不调时钟、不伪造来源。

#115保持独立CLOSED；#57/#101/#110及未完成子项、#116继续OPEN。本轮不增加正式交付，不将部分成功、编译或独立事实审计替代Gate。
`;
const checks = {
  57: '- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：剩余联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出',
  101: '- [x] 已有R4正式交付67项，原G4保持\n- [x] 剩余28项与最小R5四项联合G1，共32项\n- [x] 本轮Source12真实表单及原候选保全已发布\n- [ ] Source13纠偏/正常M98/schema3与完整影响面验收\n- [ ] 自然期末、独立G3/G4及完整R4收口',
  110: '- [x] 联合G1精确32项冻结\n- [x] Source10/11/12保真留存及显式消费准入\n- [x] 原102/45/34、Stage87、Native17及敏感审计回滚\n- [x] Own/Role/Expense/GH/Lifecycle真实界面与精确续验\n- [x] 1351新进程真实绑定与冷读、原候选406代码/双库/对象保全\n- [ ] Source13产品纠偏及M98/schema3、Tax完整闭包与权限\n- [ ] H完整边界、Labor遮罩、自然期末、独立G3/G4',
  111: '- [x] G9与联合G1、原API134完整102FI\n- [x] 金额/重述、Stage87共享全批FI及capture竞态\n- [x] 真实采用基线及已提交基线的快照分类续验\n- [ ] fresh Main G与Tax-only完整闭包/原子性\n- [ ] 新候选自然期末与独立G3/G4',
  112: '- [x] H8与联合G1、原金额和四阶段输出\n- [x] 敏感GET必要审计失败整体回滚\n- [x] 真实H08质性复核与首阶段闸门收紧UI\n- [ ] 完整H规则边界、传递Labor遮罩及必要权限\n- [ ] 新候选联合验收与独立G3/G4',
  113: '- [x] I11/R5最小依赖联合G1、原生命周期45FI/8成功\n- [x] 归属/首派/编辑、跨父子/证据/责任人拒绝\n- [x] 本人真实关闭、同任务及不同任务CAS\n- [x] 三材料真实上传及进入验收/最终验收/完工/归档UI\n- [ ] 冻结参与人父锁M98正式前向迁移及新候选schema准入\n- [ ] 新候选联合验收与独立G3/G4',
  114: '- [x] 联合G1、隔离M97/139环境及原候选保全\n- [x] Stage87共享竞态、Native17与清理守恒\n- [x] 真实表单精确续验和独立raw/ledger事实审计\n- [ ] Tax完整目标/原子性、H边界/Labor/权限\n- [ ] 正常M98、schema3、自然期末\n- [ ] 统一候选独立G3/G4、留存清理与线上读回',
  117: '- [x] 最小角色四项与联合G1冻结\n- [x] 真实create/freeze UI及公开freeze-revised-create竞态\n- [x] 零/正权重父锁五项安全负控与冻结冷读\n- [ ] 父锁M98正式前向迁移与schema3\n- [ ] 新候选联合验收与独立G3/G4',
};
code = code.replaceAll('g2-online-status09', 'g2-online-status10').replaceAll('poms-r4ghi-g2-current09', 'poms-r4ghi-g2-current10').replaceAll('actual-online-source12-progress09', 'actual-online-source12-progress10').replace("const commit = '6ca4f722cbbdea4fb3d8043712b827e5ad18be6b'", "const commit = '" + commit + "'");
const start = code.indexOf('const common = `'), end = code.indexOf('const targets =', start); assert(start > 0 && end > start);
code = code.slice(0, start) + 'const common = ' + JSON.stringify(common) + ';\nconst checks = ' + JSON.stringify(checks, null, 2) + ';\n' + code.slice(end);
code = code.replace('const targets = [57, 110, 111, 112, 113, 114, 117];', 'const targets = [57, 101, 110, 111, 112, 113, 114, 117];');
assert(code.includes(commit) && code.includes('g2-online-status10')); fs.writeFileSync('tools/rust-r4ghi/update-g2-status10.mjs', code, { flag: 'wx' });
console.log(JSON.stringify({ script: 'tools/rust-r4ghi/update-g2-status10.mjs', targets: Object.keys(checks).map(Number), GitHubMutated: false }));
