import fs from 'node:fs';
import assert from 'node:assert/strict';
let code = fs.readFileSync('tools/rust-r4ghi/update-g2-status10.mjs', 'utf8');
const commit = '0b82739a5c194f9185a7cbbed8fe05e74b202241';
const base = 'https://github.com/illusion-tech/poms/blob/' + commit + '/';
const common = `状态：**Doing / OPEN；联合G1仍为32项，G2继续，G3 Pending / G4 false**。2026-11-09（Asia/Tokyo）。

正式Rust **240**，R4正式 **67/95**、余28，本批新增认证 **0**。Runtime272与canonical296 operations／242 paths／690 schemas保持各自口径。

[Source13实际技术检查点](${base}docs/design/rust-r4ghi/source13-actual208.json)已发布工作分支0b82739a；main仍d5c79b26，无合并、部署或切流。原Source12/135/1351保全和成功、失败、partial标签均留。当前为Source13/API136、416份输入、原H0 195文件、M98、每库139表。

已完成并有实际原件：

- 修正TaxRef根发现、跨项目财务父来源闭包、真实历史期末来源资格以及冻结参与人父锁。Rust实际镜像四条命令exit0，535通过、54历史忽略；Root是实际盘点和复制，未冒称Root编译。H0 26个Node文件共211通过、0失败，原416/195字节不变。Native lint/build通过，2839输入仅新增M98，原两条警告保留。
- 双库分别通过正常MikroORM forward M98。独立复核5份sealed snapshot及1112唯一row文件：旧97迁移行、138业务表及raw/xmin保留，仅批准的函数body、M98行和对应sequence前进。原M97业务基线未重置，不声称跨数据库原子提交或实际restore。
- API136实际readiness200；B0→final plan/R3→B1无回写环，R3永远指原B0。显式schema3单独核准M98规范变化。双真实父行先锁定的五项冻结参与人负控均23514并整体回滚，旧M97原件不改标。
- [独立技术事实审计](${base}tools/rust-r4ghi/independent/final-gates13/actual13-facts01.md)核完构建、迁移、原业务基线、进程及准入固定原件；它没有授予业务验收、G3或G4认证。
- 已自然跨过香港11月9日零点。真实2026-W45准备：Receiver GET200且eligible；Main GET200仅缺成本分类；MAX夹具准备实际422容量超限，原partial保留且不作为期末正向。尚无期末POST。

当前补缺和后续：

- Tax203在任何Tax HTTP前被exact共享资源58准入漏项挡住。记录真实producer为12、两项目HTTP真实诞生10；不能盲加JSON、借别的path或重标来源。正准备经独立复核的119/H1工具及资源sidecar、新B2；原G2/H0/R3/B0/B1和API136原构建身份保留，尚未宣称H1已准入。
- 此后继续fresh Main G、Tax-only完整目标FI及同body原子提交；再完成H01/20%/H04规则边界、真实EO最小权限及传递Labor遮罩/必要敏感审计。
- Tax完成后，使用真实合格来源验证期末创建、读取、期间目标遮罩及实时current/闸门不回退。期末工具正在补强实际准备原件、全成本单位及分类来源绑定，未审准前不执行。
- 统一候选补齐影响面和阶段验收、独立G3/G4及精确保全清理后，才增加正式交付和收口满足条件的子项。

[此前真实表单验收](${base}docs/design/rust-r4ghi/source12-tail170-actual.json)与Stage87全87必要写入FI/共享201-capture409、Native17、API134的102/45/34、金额边界及敏感审计回滚，继续保持各自真实候选及原标签。

历史首次补关选包策略仍待用户裁决；目前只核真实来源并在不能证明时阻断，没有批准自动重选历史预算。用户已明确保留真实来源、自然跨期续验；不调时钟、不回填来源。

#115保持独立CLOSED；#57/#101/#110及未完成子项、#116继续OPEN。部分成功、编译或事实审计均不替代Gate。
`;
const checks = {
  57: '- [x] R0–R3按各阶段G4收口\n- [ ] R4 #101：剩余联合验收与完整阶段收口\n- [ ] R5 #116：最小依赖不代表完整提成链\n- [ ] R6迁移发布与回滚演练\n- [ ] R7正式切换及旧后端退出',
  101: '- [x] R4正式交付67项及剩余28项联合最小R5四项G1\n- [x] Source12真实表单及原候选保全\n- [x] Source13实际构建、正常双库M98与schema3\n- [ ] 119/H1资源补录及Tax、H、Labor完整影响面\n- [ ] 期末真实创建/读取、独立G3/G4及完整R4收口',
  110: '- [x] 联合G1精确32项冻结\n- [x] 历史候选保真与真实表单精确续验\n- [x] Source13实际535/211、Native检查、双库正常M98\n- [x] 原M97基线保留、schema3/B0/R3/B1及五项冻结负控\n- [ ] 119/H1/B2显式工具与资源准入\n- [ ] Tax完整闭包/原子性、H边界/Labor/权限\n- [ ] 自然期末实际写入、统一独立G3/G4',
  111: '- [x] G9联合G1、原API134完整102FI\n- [x] 真实金额/重述、Stage87共享全批FI与capture竞态\n- [x] Source13真实历史来源/TAX根/跨项目父闭包纠偏及构建\n- [ ] exact58工具资源准入、fresh Main G与Tax-only完整闭包/原子性\n- [ ] 真实合格期末创建/读取、独立G3/G4',
  112: '- [x] H8联合G1、原金额和四阶段输出\n- [x] 敏感GET必要审计失败整体回滚\n- [x] 真实H08质性复核及首阶段闸门收紧UI\n- [ ] 完整H01/20%/H04规则边界\n- [ ] EO真实最小权限、传递Labor及期间目标遮罩\n- [ ] 新候选联合验收与独立G3/G4',
  113: '- [x] I11/R5最小依赖G1、原生命周期45FI/8成功\n- [x] 归属/首派/编辑、本人关闭/同任务与不同任务CAS\n- [x] 三材料真实上传及验收/完工/归档UI\n- [x] 冻结父锁M98正常双库前向迁移及五项安全回滚负控\n- [x] Source13真实构建及原基线保留的schema3\n- [ ] 新候选影响面联合验收与独立G3/G4',
  114: '- [x] 联合G1与历次候选保全\n- [x] Stage87共享竞态、Native17与原生会话清理守恒\n- [x] Source12真实表单精确续验及独立raw/ledger审计\n- [x] Source13实际构建/M98/schema3独立技术事实审计\n- [ ] 119/H1/B2、Tax、H边界/Labor/权限\n- [ ] 真实期末及统一独立G3/G4、留存清理与线上读回',
  117: '- [x] 最小角色四项联合G1\n- [x] 真实create/freeze UI及公开freeze-revised-create竞态\n- [x] 冻结冷读、零权重职责及五项父锁负控\n- [x] M98正常双库前向迁移、Source13/schema3\n- [ ] 新候选影响面联合验收与独立G3/G4',
};
code = code.replaceAll('g2-online-status10', 'g2-online-status11').replaceAll('poms-r4ghi-g2-current10', 'poms-r4ghi-g2-current11')
  .replaceAll('actual-online-source12-progress10', 'actual-online-source13-progress11')
  .replace("const commit = 'd90811f2e422d8037699058452d42cfbbd020345'", "const commit = '" + commit + "'");
const start = code.indexOf('const common = '), end = code.indexOf('const targets =', start); assert(start > 0 && end > start);
code = code.slice(0, start) + 'const common = ' + JSON.stringify(common) + ';\nconst checks = ' + JSON.stringify(checks, null, 2) + ';\n' + code.slice(end);
code = code.replace('/business/g2-business12/main01/004534-candidate-source-binding12.json', '/business/g2-business13/main01/B1-Source13-admitted.json');
assert(code.includes(commit)); assert(code.includes('B1-Source13-admitted.json')); assert(!code.includes('004534-candidate-source-binding12.json'));
fs.writeFileSync('tools/rust-r4ghi/update-g2-status11.mjs', code, { flag: 'wx' });
console.log(JSON.stringify({ script: 'tools/rust-r4ghi/update-g2-status11.mjs', targets: Object.keys(checks).map(Number), GitHubMutated: false }));
