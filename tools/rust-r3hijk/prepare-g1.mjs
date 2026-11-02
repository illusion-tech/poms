// Root prepares the bounded joint G1 package; this script never certifies a gate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '../..');
const tmp = 'tmp/rust-r3hijk', formal = 'docs/design/rust-r3hijk';
const base = '7f970c992291c61477eb9bd83a48cec19a769d88';
const read = p => fs.readFileSync(path.join(root, p));
const json = p => JSON.parse(read(p));
const sha = b => createHash('sha256').update(b).digest('hex');
const pin = p => { const b = read(p); return { file: p, bytes: b.length, rawBytesSha256: sha(b) }; };
const walk = p => fs.readdirSync(path.join(root, p), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(p + '/' + e.name) : [p + '/' + e.name]).sort();
function write(p, bytes) { const target = path.join(root, p); fs.mkdirSync(path.dirname(target), { recursive: true }); if (fs.existsSync(target)) assert(read(p).equals(Buffer.from(bytes)), 'Existing original differs: ' + p); else fs.writeFileSync(target, bytes, { flag: 'wx' }); }
function writeJSON(p, value) { write(p, JSON.stringify(value, null, 2) + '\n'); }
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), base);
const admission = json(tmp + '/root/preflight-source-manifest02.json');
for (const p of [...admission.nativeFiles, ...admission.rustBaseFiles]) assert.deepEqual(pin(p.file), p, 'Pre-G1 source guard: ' + p.file);
const registration = json(tmp + '/root/g0-issue-registration.json');
assert.deepEqual(registration.entries.map(x => x.number), [93, 94, 95, 96]);
const terminal = json(tmp + '/native-cohort-terminal01.json');
assert(terminal.ownedRuntimeStopped && terminal.port12400Free && terminal.all107SeedRawJSONRowsExact && terminal.allPrivilegesRestored);
assert.equal(terminal.removedRows, 382);
const phaseNumbers = ['02', '03', '06', '08', '09', '10'];
const nativeIndex = json(tmp + '/native-authority03/observed-summary01.json');
assert.equal(nativeIndex.actualCompletedCaseGroups, 54); assert.equal(nativeIndex.actualHTTPEvents, 193);
const origin = [];
for (const source of walk(tmp).filter(p => !p.startsWith(tmp + '/root/public-sync'))) {
  const target = formal + '/originals/' + source.slice(tmp.length + 1);
  write(target, read(source)); origin.push({ logicalOriginal: source, ...pin(target) });
}
writeJSON(formal + '/g1-original-origin-map01.json', { kind: 'R3HIJK-G1-original-admission-map', base, rawByteCopies: origin, privateOriginalsCopied: false, previousBatchPrivateTouched: false });
const interfaces = {
  kind: 'R3HIJK-joint-G1-shared-boundaries', base, status: 'Root-final-proposal-await-independent-joint-G1',
  ownership: { A: ['apps/poms-api-rust/src/leads/** except http.rs'], B: ['apps/poms-api-rust/src/sales_intelligence/** except http.rs'], D: ['apps/poms-api-rust/src/business_discussions/** except http.rs', 'apps/poms-api-rust/src/project_workspace/** except http.rs'], Root: ['all http.rs', 'Cargo and lock', 'lib and global dispatch', 'old modules and common bridges', 'all install/build/test/lint/DB/HTTP/browser execution', 'formal governance, Git/GitHub and evidence'], C: ['non-author independent G1/G3/fixed-commit/G4 review'] },
  functions: [
    { owner: 'A', signature: 'leads::store::by_id(&mut PgConnection,&str)->Result<Option<LeadRef>,sqlx::Error>', type: 'LeadRef { id:Uuid, customer_id:Uuid, lead_name:String }', rule: 'id only, no status/owner/active filter, no independent transaction/session/audit flush' },
    { owner: 'A', signature: 'leads::store::by_ids(&mut PgConnection,&[Uuid])->Result<Vec<LeadRef>,sqlx::Error>', rule: 'id set only; no added order guarantee or eligibility filter' },
    { owner: 'B', signature: 'sales_intelligence::store::collect_lead_score_facts(&mut PgConnection,&str)->Result<sales_intelligence::model::SalesIntelligenceFacts,sqlx::Error>', type: 'pub SalesIntelligenceFacts { pub decision_maker_known:bool, pub technical_evaluator_known:bool, pub procurement_process_known:bool, pub budget_source_known:bool, pub competitor_known:bool, pub pain_point_known:bool, pub next_contact_known:bool }', rule: 'exact lead_id; score latest discovery ORDER updated_at DESC ONLY; no status/project/customer predicates or independent transaction/session/audit flush; I writes do not automatically recompute H stored score' },
    { owner: 'B', signature: 'sales_intelligence::store::competitor_by_id(&mut PgConnection,&str)->Result<Option<sales_intelligence::model::CompetitorRef>,sqlx::Error>', type: 'pub CompetitorRef { pub id:Uuid, pub customer_id:Uuid, pub lead_id:Option<Uuid>, pub project_id:Option<Uuid> }', rule: 'id only; D applies original nullable anchor comparisons' },
    { owner: 'Root', signature: 'opportunity_context::store::contact_by_id(&mut PgConnection,&str)->Result<Option<ContactRef>,sqlx::Error>', type: 'pub ContactRef { pub id:Uuid, pub customer_id:Uuid, pub name:String, pub department:Option<String>, pub title:Option<String> }', rule: 'existence only including inactive; no phone/mobile/wechat/email/remark exposed' },
    { owner: 'Root', signature: 'opportunity_context::store::follow_up_by_id(&mut PgConnection,&str)->Result<Option<FollowUpRef>,sqlx::Error>', type: 'pub FollowUpRef { pub id:Uuid, pub customer_id:Uuid, pub lead_id:Option<Uuid>, pub project_id:Option<Uuid> }', rule: 'existence only, including voided and superseded; D applies original anchors' },
    { owner: 'existing', signature: 'customers::store::find_customer(&mut PgConnection,&str)', rule: 'reuse existence/name lookup without require_active_customer for I/J' },
    { owner: 'existing', signature: 'projects::store::find(&mut PgConnection,&str)', rule: 'reuse id/customer_id nullable/source_lead_id/project_name; no new status/stage gate' }
  ],
  privateDomainQueries: { H: 'A may implement only Native-equivalent attachment metadata read/copy SQL inside leads/store with caller transaction; preserve original autoflush graph; never alter old public attachment API', D: 'D owns read-only user/org/snapshot/workspace projections in its own stores; preserve original fields/order and missing values, no R4 mutation' },
  wire: { root: 'Root owns all HTTP validation/permissions/CSRF/error/wire dispatch. Domain services return source-equivalent errors and raw JS text where required; retain presence Missing/Null/Value.', strings: 'Zod4.6.1 min/max counts Unicode code points (lone surrogate one); explicit source business .length remains UTF16 code units. No global Unicode normalization; PostgreSQL replacement vs immediate response remains separate.', identifiers: 'Original request UUID spelling retained for JS strict comparisons; raw non-validated path id reaches PostgreSQL, preserving original 500 rather than extra 400.', datesMoney: 'Original source date/datetime, JS number and decimal conversions control; no added rounding/clock calls.' },
  consumerPrerequisites: { H: 'real delivered Customer, dictionary and identity producers; R2 business numbers use independent pool allocation, not caller transaction', I: 'real H HTTP Lead producer and delivered Project/Contact/Customer producers', J: 'real H Lead/conversion and I competitor producer plus delivered FollowUp/Contact', K: 'real Project and H conversion; R4 snapshot history may be explicitly SQL-prepared projection only' },
  runtimeExpectation: { beforeOperations: 145, beforePaths: 116, afterOperations: 173, afterPaths: 138, schemas: 585, nativePaths: 237, nativeOperations: 291, generatedClient: 579, migrations: 92 },
  stageBoundary: 'Only #93-96 scoped children may close after independent G4. #85/#57 remain OPEN even when HTTP58/58; full non-HTTP, approval and stage integration remain separate.'
};
writeJSON(formal + '/shared-boundaries01.json', interfaces);
const decisions = {
  kind: 'R3HIJK-original-Native-G1-decisions', base, cohortRun: terminal.runId,
  actualScope: { completedCaseGroups: 54, actualHTTPEvents: 193, completedPhases: phaseNumbers, schemaOracleVectors: 18, rustOrFullUIAcceptance: false },
  authorities: ['originals/native-authority03/SQL-authority01.json', 'originals/native-authority03/bulk-original-SQL-timewindow01.json', 'originals/native-authority03/observed-summary01.json', 'originals/native-cohort-terminal01.json'],
  H: [
    'Lead creation/conversion independent business-number transaction survives business rollback; counter gap is Native behavior.',
    'Single lead and single override stale version:409; held-row two-reader native CAS race:200/500, one commit/rollback.',
    'Existing approved + pending approval uses one CASE bulk update WHERE id IN, no row_version predicate. True two-waiter Native race both200, +2 snapshots, one audit each; existing approved version2→4 superseded and pending1→3 approved. Do not strengthen bulk CAS.',
    'Claim/assign/qualify/close may commit main state before denied snapshot reports500; override commands may commit business before denied audit reports500. Preserve each source flush boundary.',
    'Stored score is read-only on GET/list/history. I writes do not refresh it; changed H update/qualify records source score/snapshot; no-op comparison follows original JSON.stringify including key order.',
    'Convert returns200. Latest active attachments exclude finance/internal-assessment. Copy is same transaction, preserves source links and exact Native link/project/session/lead/audit/snapshot autoflush order, including single-link special graph; denial rolls back business but counter survives.',
    'Attachment cut witnesses use explicitly prepared metadata, not actual upload acceptance; G3 must use real delivered attachment producer.'
  ],
  I: [
    'Three creates preserve missing-both-anchors custom400. Context lookup checks lead then project, fallback customerId from input/project/lead, exact original string comparison; dual anchors list by OR and no invented conversion relation.',
    'Inactive customer/contact, closed/converted lead and existing project eligibility are not strengthened beyond original existence checks.',
    'Changed PATCH business/session/audit is one transaction; denied audit or requestId65 storage error rolls back business. No-op with requestId65 may200, creates non-audit may201.',
    'Discovery update held-row race200/500. Gaps preserve seven-item fixed order and newest discovery updated_at DESC,created_at DESC; score facts use updated_at DESC only. No UUID tie-breaker.',
    'Original text audit .length is UTF16. JSONB null/object/array probes are controlled prepared rows, not DDL or real producer evidence.'
  ],
  JK: [
    'Discussion max8000 is Zod Unicode code points: emoji8000 accepted201, emoji8001 rejected400; BMP8000/8001 likewise.',
    'FEFF trims; NEL and zero-width do not. NUL passes schema then PostgreSQL500. Lone surrogate POST201 preserves unit; actual storage/GET replaces with U+FFFD, kept as distinct observations.',
    'Guidance and timeline raw malformed path reaches PostgreSQL500; real project responses200. Thread conflict and full read projections remain required G2 comparison.'
  ],
  correctedToolNoise: { SQL: 'Old authority01/02 marked RETURNING row_version as WHERE CAS in27 records. authority03 limits predicate to real WHERE before RETURNING; originals remain unchanged.', bulkMarker: 'Phase10 async PostgreSQL logging reload omitted its begin marker. Supplement binds126 actual app SQL to original recorded case timestamps and observed end marker, one isolated case; no marker invented.', catalog: 'Initial catalog incorrectly used previous scoped16 OpenAPI. Active02 uses complete prior Rust runtime145/116 and expects173/138; original forecast retained as tool error.' },
  incompleteHistoricalAttempts: [
    { phase: '01', label: 'partial-tool-error', actualEvents: 5, reason: 'Observer guessed counter year column instead of period; foundation calls actually succeeded and real IDs reused in02.' },
    { phase: '04', label: 'partial-uncertified-exchange', actualEvents: 36, reason: 'Repeated actual requestId65 caused capture prefix EEXIST after an actual call. Filename nonce fixed without changing request headers.' },
    { phase: '05', label: 'partial-test-assumption', actualEvents: 11, reason: 'Earlier repeated request IDs made full audit query multiple rows;06 fresh real references reran all groups, no filtering to hide rows.' },
    { phase: '07', label: 'partial-tool-expectation-error', actualEvents: 3, reason: 'Convert actually200; runner incorrectly expected201. Full08 uses original source200.' }
  ],
  terminal: { removedOwnedRows: 382, exactSeedTables: 107, restoredPrivileges: 428, runtimeStopped: true, ownPG15AvailableForG2: true, privateAndVolumeRetained: true },
  G1Certified: false, G3Certified: false, G4Certified: false
};
writeJSON(formal + '/native-decisions01.json', decisions);
writeJSON('docs/design/rust-r3hijk-delivery-status.json', {
  kind: 'R3HIJK-current-scoped-delivery-status', base, phase: 'G1Preparation', G1Certified: false, G3Certified: false, G4Certified: false, implementation: null, parent85Open: true, overall57Open: true,
  operations: registration.entries.flatMap(e => e.operations.map(o => ({ operationId: o.operationId, issue: e.number, slice: e.slice, nativeStatusSourceExpectation: o.nativeStatusSourceExpectation, rustDelivered: false }))),
  currentFormalR3Delivered: 30, currentRustOperations: 145, authorized: 28, sharedBoundaries: formal + '/shared-boundaries01.json', stageIntegrationComplete: false
});
write('docs/design/rust-r3hijk-scope-and-dependencies.md', `# R3H–K 最后28项范围与依赖\n\n用户授权本批完成联合G1、三线实现、实际验收及独立G3/G4。父[#85](https://github.com/illusion-tech/poms/issues/85)和总体[#57](https://github.com/illusion-tech/poms/issues/57)保持Open。\n\n- A：[#93](https://github.com/illusion-tech/poms/issues/93)，线索管理/评分14项。\n- B：[#94](https://github.com/illusion-tech/poms/issues/94)，销售情报10项，联系人3已在#90交付，不重复计数。\n- D：[#95](https://github.com/illusion-tech/poms/issues/95)讨论2项及[#96](https://github.com/illusion-tech/poms/issues/96)项目综合工作区2项。\n\n三线只在联合G1独审Pass及线上冻结后实现。A/B互用只读事实接口，D消费A/B真实产物；实现可并行，集成验收必须按客户→Lead/情报→转换/讨论/项目工作区的真实生产者顺序。Root独占公共HTTP/桥和全部实际运行，C保持非作者审查，独审占用空闲并发席位。\n\n当前已交付30/58，本批28待交付。现有Rust145操作/116路径；本批预期173操作/138路径/585schemas。原Native237路径/291操作、client579、migrations92不变。即使本批四子项G4后HTTP58/58，完整非HTTP/审批/阶段集成验收仍未完成，不关闭#85/#57。\n\n冻结输入见[联合基线](rust-r3hijk-next28-baseline.md)、[原字节映射](rust-r3hijk/g1-original-origin-map01.json)、[共享边界](rust-r3hijk/shared-boundaries01.json)和[当前交付状态](rust-r3hijk-delivery-status.json)。\n`);
write('docs/design/rust-r3hijk-next28-baseline.md', `# RUST-R3H/I/J/K 联合实施基线\n\n- Gate Status：Pending，等待非作者C联合G1签署及线上冻结；不能据本包开始产品实现。\n- Parent：#85；总体#57。子项#93/#94/#95/#96，14+10+2+2=28。\n- Base：\`${base}\`；分支\`codex/poms-r3hijk-next28\`。\n- 类型：cross-layer-high-risk；solo worktree，独立G1/G3/fixed-commit/G4，不降低标准。\n- Owner：Root公共集成/实际执行/治理；A Lead14；B情报10；D讨论2+工作区2；C非作者审查。子代理显式gpt-6.1-sol/max，Fast无独立控制证据，未核实。\n\n## 范围与正式输入\n\n完整范围、三线依赖及留白见[范围](rust-r3hijk-scope-and-dependencies.md)。当前已交付30/58，本批G4前不计入新增交付，#85/#57保持Open。新增生产者和读取机制仅服务本批28个现有原生操作，不实施R4审批/完成/归档写侧或完整阶段验收。\n\n[正式输入清单](rust-r3hijk/g1-input-manifest01.json)及[原字节映射](rust-r3hijk/g1-original-origin-map01.json)绑定A/B/D原始审阅、验收定义、递归source pin、原Native/Zod实际观察、失败/partial原件、生产器源码和本批E1复审。D02替代有缺陷的D01长度结论；D01继续原字节保存。A44/B89/D56需求为定义，不能宣称全部实际执行。\n\n## SSOT 与路由/命令/DTO\n\n1373份原Native/UI/contracts/client文件及206份既有Rust源/Cargo输入由[admission](rust-r3hijk/preflight-native-source-manifest01.json)逐个原字节复核；G1前不得修改产品。命令、DTO、guard、query、响应字段及类型使用当前原controller/service/repository/entity及锁定Zod4.6.1契约；详细28行及权限、canonical行号、OpenAPI请求/响应映射保存在originals/root/g0-issue-registration.json。全部route inventory为aligned，不新造公共路径。历史R0路径不覆盖当前canonical。\n\n原Native237路径/291操作/585schemas、client579、migrations92不变；既有Rust145操作/116路径，本批完整实施后应173操作/138路径/585schemas。新增OpenAPI仅投影既有28项；完整原contract/client/migrations不重生成改义。\n\n日期date/datetime、金额number/decimal、nullable UUID和Missing/Null/Value、状态/版本链逐项依A/B/D source矩阵。UUID输入原拼写用于原JS严格比较，不能先canonicalize。原路径未经UUID pipe校验者保留数据库错误500。Zod长度按Unicode code points；显式业务JS.length/audit字段保持UTF16，wire和数据库替换分开，无全局Unicode规范化。\n\n## 共享架构与持久化\n\n[共享边界](rust-r3hijk/shared-boundaries01.json)为跨作者接口SSOT，明确LeadRef/CompetitorRef、销售事实七bool、Root Contact/FollowUp桥、既有Customer/Project读取；所有只读桥借用调用连接，不另开事务、flush或加资格过滤。D本域保留user/org/snapshot投影。附件转换内部最小SQL归A的leads/store，禁止改旧附件API。\n\n既有92个migration、entity/DDL及107张seed表不变，不新增migration；schema diff须证明两个自有PG15库与原Native相容。表/字段映射直接由三作者source-manifest及其完整需求矩阵约束，Lead/override/snapshot/assignment、三类情报、讨论thread/comment及project只使用现有列/约束。并发、审计、session和中途flush严格按[实际Native裁决](rust-r3hijk/native-decisions01.json)与SQL authority03/时间窗补证，不把bulk更新强化为CAS、不将分段提交包成新大事务。\n\n## 原Native实际观察与校验要求\n\nRoot已重建原Native，artifact SHA256 0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4；54组/193次HTTP和18项独立schema向量仅用于G1风险裁决。失败01/04/05/07及authority01/02误分类均保留真实标签；phase10缺begin明确注明，126条原SQL时间窗补证不伪造marker。附件cut仅prepared metadata，不能冒充实际upload生产者。\n\nG2/G3必须完成：Rust fmt/clippy/build/有效单测及真实DB/HTTP；原Native与Rust同义比较全部28操作并回归旧30；原始错误/状态、permission/CSRF/validation、钱/日期/UUID/Unicode、单CAS和weak bulk并发、故障注入下计数器/审计/主状态/快照/附件完整终态；真实Customer→Lead/I情报/Contact/FollowUp/attachment upload→转换→J/K生产链；Linux/Windows Native与Rust四组合UI关键业务路径；OpenAPI/客户端原字节和现有migration/schema、Native保护源复核；受影响lint/构建/测试及docs格式/diff检查。预期检查须记录实际通过、失败、N/A理由或明确阻塞，不用定义/继承预览替代执行。\n\n## 漂移、例外与资源\n\n已识别tool-noise：早期counter列名/HTTP201误期望、capture碰撞、旧RETURNING误判CAS及错误全runtime来源；新版本纠正且不改原件。lone-surrogate数据库替换等是原Native可接受DB行为；不能据此修原合同或正则化业务。其余真实行为漂移阻断G3。\n\n本批C已明确复审既有五机器输入兼容副本E1：5文件419264B、22个直接消费者仍依赖，Root负责，清理期限2026-11-09不延长；下一后续R3 G1或原期限较早者复核，不能继承旧批准。详见originals/c-review/e1-compatibility-rereview01.json。不镜像旧大树，不批量改写历史消费工具。\n\n环境独占poms-r3hijk：PG15 22433、Native12400/Rust12500/WindowsNative12410/UI12600；双库poms_r3hijk_nest/rust。已清理G1自有382行，107seed表原JSON精确、428权限还原，Native已停止、12400释放，自有PG15和private/volume保留供G2；不触旧PG17或旧批private。密钥/原cookies只在本批private，不进入仓库。\n\n## G1 结论\n\nPending。只有C对本包、共享语义及原件签署Pass，并将同一freeze发布到#93–96后，Root才启动三线G2。G3及G4须独立审查；最终仅关闭本批四子项，#85/#57始终保留Open。\n`);
const note = `\n\n### 2026-11-02 R3H–K 最后28项 G0 / 联合G1准备\n\n用户已授权本批完整G0–G4：[联合基线](rust-r3hijk-next28-baseline.md)覆盖线索#93十四项、情报#94十项、讨论#95两项及工作区#96两项。三作者在共享边界和独立联合G1线上冻结后并行实现，Root集中公共接线与实际验收，C保持非作者。当前已交付仍30/58、Rust145操作；本批28待交付，原Native风险54组/193HTTP不等于Rust/完整UI验收。全部HTTP完成后完整非HTTP/审批/阶段Gate仍未完成，#85/#57保持Open。\n`;
for (const p of ['docs/design/backend-rust-migration-plan.md', 'docs/design/phase2-development-execution-tracker.md']) { const old = read(p).toString('utf8'); if (!old.includes('R3H–K 最后28项 G0 / 联合G1准备')) fs.appendFileSync(path.join(root, p), note); }
const attrs = '.gitattributes', extra = '\n# R3HIJK admitted input and actual public observations retain original raw bytes.\ndocs/design/rust-r3hijk/** -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\ndocs/design/archive/slices/rust-r3hijk/** -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\ntools/rust-r3hijk/** -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\ndocs/design/rust-r3hijk/**/*.log whitespace=-blank-at-eol,-blank-at-eof,-space-before-tab,cr-at-eol\ndocs/design/archive/slices/rust-r3hijk/**/*.log whitespace=-blank-at-eol,-blank-at-eof,-space-before-tab,cr-at-eol\n';
if (!read(attrs).toString('utf8').includes('# R3HIJK admitted input')) fs.appendFileSync(path.join(root, attrs), extra);
const entries = [...walk(formal), 'docs/design/rust-r3hijk-next28-baseline.md', 'docs/design/rust-r3hijk-scope-and-dependencies.md', ...walk('tools/rust-r3hijk')].filter(p => !p.endsWith('/g1-input-manifest01.json')).map(pin);
writeJSON(formal + '/g1-input-manifest01.json', { kind: 'R3HIJK-joint-G1-input-manifest', base, entries, actualNativeCaseGroups: 54, actualNativeHTTP: 193, sourceAdmission: { native: 1373, rustBase: 206 }, scopedChildren: [93, 94, 95, 96], G1Certified: false, G3Certified: false, G4Certified: false, reason: 'Input manifest is not a gate signature; C must sign exact bytes independently.' });
console.log(JSON.stringify({ copiedOriginals: origin.length, formalInputs: entries.length, protectedNative: 1373, protectedRust: 206, G1Certified: false }));
