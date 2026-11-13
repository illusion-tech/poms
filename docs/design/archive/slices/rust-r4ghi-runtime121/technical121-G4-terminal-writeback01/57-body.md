<!-- POMS-RUNTIME121-ACTUAL-G4-FINAL-362 -->
### 最新状态：#121实际技术G4非作者终审通过

[非作者实际终审证书](https://github.com/illusion-tech/poms/blob/4779c4264600d16466b3343c86c89cab201607ca/docs/design/archive/slices/rust-r4ghi-runtime121/technical121-G4-actual-independent01/review-actual-technical121-G4.json)6093B / 5cee4e0c…和[最终技术收口记录](https://github.com/illusion-tech/poms/blob/4779c4264600d16466b3343c86c89cab201607ca/docs/design/archive/slices/rust-r4ghi-runtime121/technical121-G4.json)已提交。#121保持CLOSED/completed（2026-11-13T03:12:49Z），只认证运行恢复、原数据守恒与真实prepare/K完整交付；终审核固定e5199、15次实时GET、原件/归档/镜像/依赖/归属一致，actual技术G3/G4均通过。较早pending/失败等标签保留为各自as-of，终审不改原件或重跑模式。

#114/#118/#120/#57/#116保持OPEN，#119历史技术G4/CLOSED保留。原私有和活跃输入仍由Root在父#114下负责，按已记录消费者/due清理。全67FI预算UNKNOWN、直接CP样本0；不授FIG2/正常Tax/Main，不认证完整父批、生产部署或main集成。Rust正式240、R4 67/95、本批32candidate、新增业务认证0、业务G3/G4未通过。
<!-- /POMS-RUNTIME121-ACTUAL-G4-FINAL-362 -->

<!-- POMS-RUNTIME121-TECHNICAL-CLOSED-362 -->
### 当前状态：技术恢复#121已线上收口，R4业务验收继续

[技术G4线上记录](https://github.com/illusion-tech/poms/issues/121#issuecomment-6842682830)只覆盖运行恢复和本次真实prepare/K/67清单，非作者实际终审随后补充。仅本技术子片：原卷/两库守恒、同字节API/运行准入、真实Native构造与私有cap、entry/exit/closed及fresh prepare/K/完整67清单的独立读回。真实6458 prepare-only始终唯一退出0，耗时4941.4120591秒；62 prepared产物672398B/b7ed0b…包含body/facts/inventory，bodySHA0f9291…单独核验，domain POST为0。

Rust正式240、R4 67/95、本批32 candidate、新增业务认证0，业务G3/G4未通过。#114/#118/#120/#57/#116保持OPEN，#119保留历史技术G4/CLOSED。完整67 FI预算UNKNOWN、直接CP样本0，未授FIG2、正常Tax或Main；不删除原生依赖边。

#118已获得本技术恢复交付，仍待真实预算取证、完整67项实际FI和单独唯一正常Tax提交；#120后继真实调用方继续等待#118。当前没有完整R4/R5或部署切换认证。
<!-- /POMS-RUNTIME121-TECHNICAL-CLOSED-362 -->

<!-- POMS-RUNTIME121-PREPARE6458-ACCEPTED-362 -->
### 当前状态：R4本批真实准备通过，完整业务验收继续

本条为最新状态；下方较早“当前”称谓及其失败/未执行标签均保留为原记录时点，不改写历史。Rust正式 **240**、R4 **67/95**、本批 **32 candidate / 新增业务认证0**，业务G3/G4未通过。#57及完整R5 #116保持OPEN；#119保留历史技术G4/CLOSED。

[实际准备及完整验收](https://github.com/illusion-tech/poms/blob/33646ef44f1b884cd59ec3e4b85a19193eea9eb4/docs/design/rust-r4ghi/runtime121-prepare362-actual.md)已固定在提交 33646ef44f1b884cd59ec3e4b85a19193eea9eb4。同一6458 prepare-only于2026-11-12 23:29:17—2026-11-13 00:51:38 UTC唯一执行退出0，总耗时4941.4120591秒；[非作者原闭8键读回](https://github.com/illusion-tech/poms/blob/33646ef44f1b884cd59ec3e4b85a19193eea9eb4/docs/design/archive/slices/rust-r4ghi-runtime121/prepare362-actual-readback01/review-actual-prepare-continuation362.json)1334B/565740aa…及6bdf9acd…封件通过。真实构造/私有capability、entry/exit/closed与K均已闭合，prepare不重放。

完整278表4938行重建1个Tax根、2个targets、全部peer/CAS、body/facts/ordered67；本次新61完整清单fdb957…和62 prepared产物b7ed0b…均与正式历史依据全等，bodySHA仍0f9291…。Auth3＋准备GET4的14份双库捕获各278表，唯一数据库变化为同一新owned auth_session创建1次、更新5次；完整37权限、14actors其余字段、旧owned/823/1899/26/13/14/Main13及其他所有状态均保全。最终8/284与Root+固定mirror各420/528、sequence39→65、所有原件/锁/canonical 6c1f/ownership1da8均独立复核。

[安全原件、工具停止及修正](https://github.com/illusion-tech/poms/tree/33646ef44f1b884cd59ec3e4b85a19193eea9eb4/docs/design/archive/slices/rust-r4ghi-runtime121)保真归档；所有私有原件及活跃运行输入保留原路径，继续由Root在#114下负责。旧失败仍保失败，读回工具纠正不改真实数据、不增加应用执行次数。

[计时判断](https://github.com/illusion-tech/poms/blob/33646ef44f1b884cd59ec3e4b85a19193eea9eb4/docs/design/archive/slices/rust-r4ghi-runtime121/prepare362-actual-readback01/judgment-E1-actual-prepare362.json)明确直接单CP样本0，不能从本次准备推出618个checkpoint和DDL/capture/rollback/reproof/close的全67 FI预算。idle900/absolute28800/throttle60保持；当前预算仍UNKNOWN，不授FI、Tax正常命令或Main，不延TTL、不加重登录策略、不新增PG/迁移。

#121真实运行恢复与准备已有完整实证，技术G3/G4收口待审。#118仍待完整FI预算、全67实际故障注入及单独唯一Tax正常提交；#120后继真实调用方继续等待#118。
<!-- /POMS-RUNTIME121-PREPARE6458-ACCEPTED-362 -->

<!-- POMS-RUNTIME121-PREPARE1899-FAILED-362 -->
### 当前状态 362：真实准入路径已完成，prepare 因会话余量不足停止

本条取代下文较早状态的“当前”称谓；历史原文及其 as-of 证据保留。Rust 正式 **240**、R4 **67/95**、本批 **32 candidate / 新增业务认证0**，业务 G3/G4 未通过。#57 与完整 R5 #116 保持 OPEN；#119 历史技术 G4/CLOSED 保留。

[实际失败检查点](https://github.com/illusion-tech/poms/blob/ef6d460d/docs/design/rust-r4ghi/runtime121-real-prepare-G3-checkpoint362.md)与[无凭据原始元数据及独立读回](https://github.com/illusion-tech/poms/tree/ef6d460d/tools/rust-r4ghi/runtime-recovery121/prepare361-failure-actual01)已提交。nonce1899 单次 prepare-only 于 18:06:06—19:26:22 UTC 退出1，真实 Native constructor、私有 capability、entry 均完成；exit 通过失败校验，journal 已 closed-failed。只产生 CSRF、登录、当前会话三个200；首个业务 GET 未发出，fresh prepared/K/全67、FI、Tax正常命令均未产生，Main13未重放。#121/#118 继续开放。

错误为 Real session expired or too close to deadline。首个业务 GET 的 before snapshot 完成后 idle deadline 仅余7.952秒；之后重复完整校验消耗了余量。发包前 guard 的位置来自源码和原件顺序，原日志没有实际 stack 或 SQL observation time。完整历史证明已有缓存；51次Native fresh及15次Tax扫描为限定源码模型，不冒实测阶段耗时。安全检查与两秒阈值保持。

失败 state14666792/e0d9、ownership7456/eb4a、sequence39已逐字私有保留。真实认证引起 manager cookies/37权限缓存及owned auth_session变化，完整37权限等于预期；原ownership前缀、13/14、旧823/26、旧prepared/full67及Main13原201保全。独立34项只读关系通过证明失败与保全，不能当prepare通过。

下一步是具名技术G3纠正：消除数据accessor和同checkpoint内的重复全检，保留全部源/FD/Facts6/进程/状态谓词；最终真实权限及会话SQL紧贴dispatch并保守核验单调时间余量。设计独审后冻结有限代码输入，再经源和lease续接、真实耗时预算及新nonce具体G2继续；不延长TTL、不清记录、不重试1899。

<!-- /POMS-RUNTIME121-PREPARE1899-FAILED-362 -->

<!-- poms-r4ghi-g2-current19 -->
### 当前复核状态（346，候选补缺与新15代码实施）

- 当前 **Doing**：[固定状态346](https://github.com/illusion-tech/poms/blob/38b631a095dd2174a35ae412a6589c867ea440aa/docs/design/rust-r4ghi/continuation-status346.json)。Rust正式240，R4已交付67/95，本批新增认证0，业务G3/G4未签。
- 原Tax14 prepare341失败完整保留：服务端5/helper2、seq24固定after及10次HTTP原件；唯一POST为登录，无FI、Tax正常命令或Main重放。原339技术G2和输入保全是其真实历史结果，不等于业务验收。
- [两Rust叶code02独审](https://github.com/illusion-tech/poms/blob/38b631a095dd2174a35ae412a6589c867ea440aa/tools/rust-r4ghi/independent/final-gates13/tax-preparation344-code02-review01/review-code34402-01.json)已通过，作者真实133项默认回归/fmt/严格Clippy通过。修复peer-only假自动根及所有Restatement分摊的真实业务截止日分类，包括较早生成却属于未来业务的费用；完整批次、显式根、真实跨项目依赖、合法late及原子性保持。code01外层生成日门控遗漏保NOTREADY。当前仅候选代码，未Root推广、完整构建或实际新目标读回，不预断必为2。
- #119已原生挂#114、原生阻塞#118，[线上G1](https://github.com/illusion-tech/poms/issues/119#issuecomment-6775974346)固定14生产＋4验证叶并开始隔离实现。Reg5是工具格式，不是业务R5/M99；核心222不是最终H3，后继amendment须publish前统一冻结测量。Source15实际source/helper/build/API/Reg5/B1/state及实际准入G2仍为空。
- 旧14的746叶输入保全及非作者读回已完成，真实auth/ownership与13/M98谱系保留。retain14-only稳定单叶已通过[代码审](https://github.com/illusion-tech/poms/blob/38b631a095dd2174a35ae412a6589c867ea440aa/tools/rust-r4ghi/independent/final-gates13/retain14-only-code119-review01/review-retain14-code01.json)，实际defaultRO双139×2输入已备，exact G2另审；此状态尚未声称实际最终数据保留已完成。无普通context/state写入或HTTP/迁移许可。
- H15五H3＋两Role外置、五consumer native reader/118 sidecar契约仍为提案；#118旧14仅WIP5/6，不视为已交付。后续封最终14数据、推广并完整验证两叶、完成新15技术准入，再做真实Tax准备/完整FI/唯一正常提交、H46/角色/Main独立legacy/Receiver W45/完整期间及fresh矩阵和独立G3/G4。Main13原201不重放，13partial/14失败不补成完成。仅收口实际完成子片；#57和完整R5#116保持开放，未合并main或部署切换。

<!-- /poms-r4ghi-g2-current19 -->

<details><summary>历史冻结与验收记录（原文保留，以顶部当前状态为准）</summary>

状态：**Doing / OPEN**。R0–R3已完成；R4累计67/92，第三批#110正在G1输入审计；R5–R7尚未交付。最后核验2026-11-06（Asia/Tokyo）。

- [x] R0 #58：迁移基线、契约、数据和环境
- [x] R1 #60：应用、认证、SQLx与跨平台基础
- [x] R2 #67：108/108操作及R2M阶段验收；#61裁决已收口
- [x] R3 #85：58/58公共HTTP及#97非HTTP/审批/完整阶段集成G4
- [ ] R4 #101：累计67/92，#102/#106已收口；第三批#110经营与项目收尾25入口及阶段验收进行中
- [ ] R5：提成全链路，依赖完整R4
- [ ] R6：迁移/发布接管与回滚演练，依赖R5
- [ ] R7：统一切换、观察和旧后端退出，依赖R6与正式切换授权

当前Rust正式公开操作累计240；R4累计67/92，余25。完整共享契约293 operations/626 schemas、client616文件；真实producer与完整阶段验收分别认定。

实施提交 [a2995dfb](https://github.com/illusion-tech/poms/commit/a2995dfb187a70064d2e54ce336a72c24974721a)，归档候选提交 [17c71bac](https://github.com/illusion-tech/poms/commit/17c71bac90bbeb7686fbdee5c043e58684bcb6b7)；永久S3 4f78bd48保留。[实际验收](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/validation-checkpoint57.md)、[独立G3](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/g3-independent08.json.bin)、[固定提交](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/fixed-commit09.json.bin)、[main复核](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/main-integration10.json.bin)、[原字节归档](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/archive-origin-map63.json)。

验收：Rust310通过/54历史ignored，Native74套863项，Angular59套411项；必要写故障59项实命中并完整113表回滚/重试，6锁屏障及跨项目锁负例，Linux同构建续跑链/Windows完整原UI。163早期负例仅有界等价复用，原失败/partial/ignored/Native参考不升格。

清理：1004自有行精确清理，3借用原件恢复；两库113表/各529原seed及catalog/ACL精确恢复、两次noop，2对象86B原字节保留、运行副本0；自有API/浏览器/Native/PG停止，卷/private保留，3作者工作树可恢复归档。

后续仍为R4移交、实际成本40、经营核算/验收完工归档及完整阶段验收，再推进R5–R7。新Rust以业务语义、正确性和合理性为准，不追Node缺陷级对齐。无生产部署、切流或性能结论；总体Issue继续Open。


<!-- poms-r4def-g4-current-batch -->

R4DEF本批30入口已完成独立actual G4、线上收口及[Seal主线](https://github.com/illusion-tech/poms/commit/aaa4b16ac66092f0cb1dc6646a02cf14e80823ee)；[独立证书](https://github.com/illusion-tech/poms/blob/aaa4b16ac66092f0cb1dc6646a02cf14e80823ee/tools/rust-r4def/independent-final131/g4-final131.json)。只关闭107/108/109/106，101/57保持OPEN，原未完成清单保留。

当前正式Rust240，R4累计67/92、剩25（经营17＋验收/完工/归档8）；完整R4阶段验收、R5–R7、部署切流/性能及S3/真实lost-COMMIT-ACK未被本批认证。

- [x] 既有R2补缺：创建用户携带初始角色/主组织的500已由 [#115](https://github.com/illusion-tech/poms/issues/115) 修复；真实关联与必要写整体事务、19场景/11故障重试/4锁竞态通过，独立G3/main/归档已完成。

<!-- /poms-r4def-g4-current-batch -->


<!-- poms-r4ghi-current-batch -->

2026-11-06：用户授权启动#110，#111 G；#112 H；#113 I；#114 acceptance；并行R2补缺#115。当前仅G0及联合G1输入审计，G2尚未准入。正式Rust240、R4累计67/92，剩25（经营17＋验收/完工/归档8），本批新增正式交付0。完整R4通过阶段验收及独立G3/G4后才可关闭#101；#57保持OPEN。R5有效角色冻结最小依赖在G1按能力复核。

<!-- /poms-r4ghi-current-batch -->


<!-- poms-r4ghi-dependencies02 -->

2026-11-06：五项用户业务裁决已明确，见本批 `docs/design/rust-r4ghi/user-decisions02.json`。最小R5角色能力单列 #117（父#116），为#113真实execution准入和#114阶段验收提供producer；不等待完整R5，也不提前认领完整R5。R4候选为原25＋受控stage2＋条件关闭1，另有R5既有4，共32个唯一HTTP待最终canonical/DTO/DDL联合G1复核；既有回款确认语义增补单列受审，不重复计HTTP。正式Rust240、R4既有67/92保持原交付口径，当前新增正式交付0。

角色包允许零权重并说明原因；最终验收对应completed或具可关闭条件的conditional-completed，阶段验收不直接完成项目。当前仍G1准备，产品G2未准入；#101/#57保持Open。

<!-- /poms-r4ghi-dependencies02 -->


<details><summary>#115 原始缺陷观察（历史保留）</summary>

```text
- [ ] 既有R2补缺：`PlatformController_createUser` 带非空 `initialRoleIds` 实际返回500。本批已观察并保留原始 `tmp/rust-r4def/root/api32/00011-PlatformController_createUser.json`：POST `/api/platform/users`，request ID `r4def32-00011-423e6000`，状态500。固定实现[users/service.rs#L469](https://github.com/illusion-tech/poms/blob/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b/apps/poms-api-rust/src/users/service.rs#L469)的 `has_unbound_children` / intentional Protocol 分支在生成UUID后以 `original user relation has no pre-flush user id` 拒绝并回滚，保留了旧Node/MikroORM缺陷语义。此缺陷在本批不修、未验收修复，不得因R2历史阶段完成而遗漏；后续单独冻结G1，以业务语义、正确性和合理性修复，不追Nodebug等价。
```

</details>


#115限定补缺按独立G4许可收口；实现 [874e35fc](https://github.com/illusion-tech/poms/commit/874e35fc0af3b6cdf6f6461725eb1343152efbea)、[main与归档](https://github.com/illusion-tech/poms/commit/42b6fc3451eb31042bef80f995c4023eeb6c736b)；[独立G3](https://github.com/illusion-tech/poms/blob/42b6fc3451eb31042bef80f995c4023eeb6c736b/tools/rust-r4ghi/independent/userfix-final/g3-review01.json)、[固定提交复核](https://github.com/illusion-tech/poms/blob/42b6fc3451eb31042bef80f995c4023eeb6c736b/tools/rust-r4ghi/independent/userfix-final/fixed-review01.json)、[原件映射](https://github.com/illusion-tech/poms/blob/42b6fc3451eb31042bef80f995c4023eeb6c736b/docs/design/archive/slices/rust-r2-user-create-fix115/origin-map01.json)。 实际线上读回及最终Seal均已核。总体#57、R4#101及本批#110、R5#116/#117均保持OPEN，未交付清单保留。

<!-- userfix115-G4-online01 -->


#115 G4 已完成。实际线上关闭与独立G4终审已通过，[Seal主线](https://github.com/illusion-tech/poms/commit/d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5) 已发布；[独立实际证书](https://github.com/illusion-tech/poms/blob/d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5/tools/rust-r4ghi/independent/userfix-final/g4-actual-review01.json) SHA256 a3656dd231f41419be680bc5b8f163993ae70fc9c48025a78912c15767b1cd6f。实现874e35fc、归档42b6fc3及永久S4保留。仅#115 CLOSED/completed，#57和R4/R5相关Issue继续OPEN；新增HTTP为0，正式Rust240，R4联批32尚待联合G1/实现验收。

<!-- userfix115-final-seal -->

G1 已冻结。

- 联合范围：G9、H8、I11、R5最小角色4，共32项（29既有、3新增）；R4规划95、已交付67，Rust正式240，272仅为验收后的目标。
- 冻结输入提交：9e010077e3010ff09447e9d77cb1bf1f7adbf68d；[联合基线](https://github.com/illusion-tech/poms/blob/ba775dd291171bde361d8fc145ead9e5bb1887a5/docs/design/rust-r4ghi-next32-baseline.md)、[精确操作表](https://github.com/illusion-tech/poms/blob/ba775dd291171bde361d8fc145ead9e5bb1887a5/docs/design/rust-r4ghi/operation-map01.json)、[原字节manifest](https://github.com/illusion-tech/poms/blob/ba775dd291171bde361d8fc145ead9e5bb1887a5/docs/design/rust-r4ghi/g1-source-manifest01.json)，SHA256 89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9。
- [非作者G1复核](https://github.com/illusion-tech/poms/blob/ba775dd291171bde361d8fc145ead9e5bb1887a5/tools/rust-r4ghi/independent/business-g1/round02/g1-review02.json)；有效v2是唯一目标，首轮2P1/1P2与原草案保留。最小DTO、未知税额、冻结成员不可改挂、真实F纠正及完整影响集和第六项责任链裁决已纳冻结。
- Root统公共契约、迁移/ORM、既有关键producer、接线/生成、Git与统一环境；G/H/I从同一输入按模块并行。项目集成必须消费真实交付，不能用旧Node错误行为作正确性目标。
- 精确命名/类型/日期/UUID/金额/版本/状态/投影/事务/锁/真实UI及验收见基线与acceptance-plan01.json。新3canonical见inventory6.25；必要写整体回滚；无Gate例外。
- 仅实际通过后收口本批子片；完整R4阶段真实验收及独立G3/G4后才可关#101，#57/#116保持Open。#115已独立G4且Closed，不重复计交付。无部署切流、性能或外部存储认证。

<!-- poms-r4ghi-joint-g1-01 -->

</details>


<!-- POMS-R4GHI-CURRENT-359 -->
### 当前推进状态（359：A与API真实恢复已独审，Native/prepare前置待完成）

Rust正式 **240**，R4交付 **67/95**，本批32项仍为 **candidate、新增业务认证0、业务G3/G4未通过**。#57及完整R5 #116保持OPEN；#119历史技术G4/CLOSED保留。#121未收口，#118继续阻塞，#120后继条件未满足。

[固定状态359](https://github.com/illusion-tech/poms/blob/f8fdd07148d6359b734fe90b64b2e733f08b278a/docs/design/rust-r4ghi/continuation-status359.json)记录本次as-of边界。新holder双侧身份独审8d7d通过；原CID/同volume/PG15/OID的pg-start4334已实际完成，新PG PID72989。新RO ab8c与独立audit02（2ff9/22a2）通过：三套共834表文件、14808行，每套native542+rust4394，原raw/xmin/meta/sequence/objects三向相等；不主张跨库原子性或持续数据库状态。

Root同字节API唯一启动7fa5…已outer0：complete fac140、apiProcess f822ff、generic68e7、初始readiness200/64c9。独立当前OS身份/socket与原初始200读回308c通过；API PID109023及opaque env绑定只保该读回时点，不表示持续可用或业务认证。API/helper/current284/ELF不改，Source06 actual91a4/eb412、M06 actual9124/1798与Git8db源码继续保as-of证据。

fresh67 metadata helper31496/cad3已由Root交付dc9537be，独审c575和Tax8 carrier eab13为code-ready；仍须真实Native发布和既有immutable entry快照，才能形成具体metadata/prepare-only输入。Native数据plan只作数据准备；**Native FS publication、真实context/Ctor、actual prepare、Tax/FI/normal201均未发生。** 下一步只按既有G1逐真实Native FS G2、发布/构造守卫和fresh prepare67前置推进，不新增治理层。

历史失败不得改写：357 d963/ce0a始终无Root-review/output、从未执行恢复；旧boot holder51024/4802/PG6360和旧A/5fd27仍是历史。audit01 exit1保留，单次safe诊断定位旧verdict误配；source02仅改两处对照字面，实际独立file audit02 exit0，不改原G2/PG/RO结果。稳定G1Policy358仍只授代码，实际各mode各自G2；loss观察boot不冒未来authority。A15/Root12/bundle4/A7/Root8/Native/284不改，原8015 anchor保留。

之后仍需Native实际准入/真实Ctor、fresh prepare121完整物理根/allpeer/CAS/原body67同值及独立实际读回，才可新的FI和单独唯一normal201。old15/Reg5/B1/旧process、08e3/full67/body0f92、7f75失败journal、Main13原201与failed01/diag原件均不改写或重放。
<!-- /POMS-R4GHI-CURRENT-359 -->
