# #119 Source15 技术准入实施基线

- Gate Status: `Pass`，仅冻结隔离代码实施范围；实际 G2 未授权。
- Task ID: `RUST-R4-ACCEPT-SOURCE15-119`。
- Parent: #114 / #110；#118 原生依赖 #119；生产纠偏属于 #111。
- Owner: Root；代码作者 I；非作者 G1 复核 Final。
- Slice Type: `process-only / refactor-only`，高风险准入和效果边界。
- G1 Date: 2026-11-11（Asia/Tokyo）。
- Tracker: `phase2-development-execution-tracker.md` 的 Source15 技术子片。

## 1. 范围与留白

只实现固定 `g2-business14/main01` 保留点到 `g2-business15/main01` 的技术准入。仍是原 M98、双库各139表；Reg5/schema5是工具格式，不是M99或业务R5。新增业务操作为0，不改变联合32项或Rust正式240项的统计。

精确生产14叶：H3贡献8叶（4 ADD、4 MOD）和外置6 ADD；另4个验证叶不进入H3或实际运行闭包。唯一文件表是 `exact-files02.json`。不授整目录或“必要工具”扩展；`context.mjs`、原108/119/252等14个保护参照保持原字节。核心贡献218＋4＝222，不代表最终H3；后续已知amendment必须在真实publish前统一冻结、测量，不能先发布再热添。

本片不实现 #118、Tax准备/FI/201、H15 policy/role/Labor或四caller。它们按 `deferred-ABI02.json` 另冻有限边界。当前还没有Source15状态、实际准入或业务交付；下游不能凭设计或代码测试认领这些结果。

## 2. 正式输入与SSOT

- proposal02：`42828152b2522604fde348783e5dbca99bd752c22c0807d7aa2541c8b7421619`，冻结副本见 `tools/rust-r4ghi/source15-admission119-g1/proposal02/`。
- 文件表：`e2f5c8854d1eda6ed9bc384befc9d0e690265f3437398993bc9c2bc58872fdb9`；ABI15-v1：`91f4fcf8a267a772f835de5c3ae03042a299341ed360c0606a0792f86e82c45b`；hash域：`4dd2f644065f7c655d6902f19e2dfe45764e71ed241af4e39282a78c1f5ca31b`。
- 非作者代码范围建议：`b404be2fe93ebdc553390749cc29cc25405afbf570af31e8b0f4fb6c73739133`。它不授权实际运行。
- 真实344保全receipt：`0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77`；独立输入保全读回：`6a0341fd2176e5d8d1625d3a2dde6ac3f083732edfc49f77b7f3818385781ef3`。746叶＝528编译输入＋218工具，420来源是其子集；只证明输入保全，不能替代最终双库retention。
- 业务语义、原子性、权限、金额及历史日期：原联合G1和用户272/298裁决。Rust按业务正确性执行，不追求Node缺陷对齐。
- 产品依赖仅为344的restatement/context两叶纠偏；code01已发现遗漏并保留，最终code02及独审尚待。其after和所有实际15输入仍为空。
- DTO / OpenAPI / route inventory：N/A，无公开surface改变；Schema / DDL：N/A，无迁移、restore或baseline重置。

## 3. 一致性边界

普通入口只增加严格schema5/epoch15分支；旧schema3/4与108/119/252的语义不放宽。新历史reader按344显式原路径到归档pin的映射核原件，不将`ctx.win`改成archive来伪装旧current guard，也不patch fs/crypto或注入假reader。

资源保留真实出生epoch、record proof及Reg4已准projectIds投影；不得将旧uiSpare子集扩为全部anchors。Main13桥必须绑定真实Source13 frozen state、HTTP201及ledger，并明确retainedThrough14，不能将14状态标成13或再次提交Main。14本轮登录是HTTP200，prepare失败和auth归属如实保留。

状态转移必须逐顶层字段白名单，未知字段拒绝。保留完整owned/borrowed/objects/fixture出生及latest证明；cookie、权限和旧候选等缓存进入具名14历史，15通过真实读取建立当前值。普通运行允许合法owned/actor前进，不能永久整份deepEqual旧14。活动15字段、UUID、版本、pin及命名以ABI15-v1为唯一来源；不重算或改变业务金额。

## 4. 工具命令与发布协议

外置六文件的职责严格限 `capture-source15`、`build-source15`、`api-runtime-source15`、`plan-source15`、`admit-source15`及空input template；具体mode和ABI见冻结提案。模板保持空值，实际绑定在私有新文件中生成，不热填已注册源码。

retain14与observe15使用default-RO双139×2观察，不createContext、不persist旧state。build区分真实Rust source/compile与后置Node helper绑定，使用独立ROOT15目标，不把Node当Cargo输入。退役14或启动15须各自独立exact审批及真实PID/start/boot/exe/cwd/stat；不自动kill、重启或接管端口。

approval scope对完整plan作canonical hash，仅将 `/consumer/bootstrapCandidate`、`/independentReview`、`/RootExecutionApproval` 三个具名槽置null；未知槽拒绝，其它输入不排除。历史source/helper数组digest仍用原算法。

真实API、readiness和state-free观察完成后，bootstrap-only exact G2才可wx生成并读回B0。最终独审和Root exact G2同时绑定scope与确切B0；槽排除不豁免读验，不允许调包。完整最终plan不包含自己的hash或未来Reg5/B1/state输出pin。

发布顺序为实际Reg5、实际B1、最后原子发布state15。state builder必须显式消费已写入并验证的B1 pin，可以通过verified facts传入，不能猜未来输出。state发布必须真正atomic no-replace，普通可覆盖的rename不合格；孤件、锁冲突或中断一律保留原件并停止，另审只读核对，不覆盖重发。B1 mode只验证已写原件，不另造候选。独立实际读回完成前没有业务G2。

## 5. 实际G2强前提

代码实施G1可先冻结，以下实际值仍必须为空并在真实前一步产生后填入：最终14双库retention及独审、产品最终after及独审、完整Source15 source/compile/helper/external组合、Root/mirror构建、真实API/Common/readiness、双库fresh观察、实际B0及最终准入审件。

旧14预期点为bd21/seq24；若变动必须具名封新点，不改344原封。保原13 AF、M97 baseline、108唯一M98谱系、Reg4/B0/B1/339/341及14真实auth/birth。不得以保全receipt替代最终数据证明，或把失败Tax14补成成功准备。

## 6. 验证与例外

4个具名验证叶须实际调用新生产pure/FS/dispatch函数。至少覆盖：旧/新epoch误用、缺件/篡改/alias、资源范围扩张、真实出生/归属遗漏、未知状态字段或旧缓存继承、合法current前进、partial伪complete、M98漂移、旧binary/PID误用、B0调包、三槽以外输入变化、publish已存在/中断孤件及无state不得ordinary准入。GH六操作的15分支不得fallback旧19，两个period入口均保历史273语义。

Node语法、相关单测、旧未改分支回归、原字节差分及完整closure核对必需。Rust产品的完整原G1回归和实际构建仍必需；未变Shared/OAS/SDK/Admin只做准确hash/ABI确认，不重复无关完整套件。实际准入及效果另按风险审，不把synthetic测试视为生产验收。

无放宽例外。既有失败、partial、ignored和未认证标签保留；修改ABI、增加文件或发现原范围不足时先报Root并冻结有限增量。

## 7. Root实施许可边界

只有配套Root冻结JSON、GitHub G1读回及Root明确指令共同许可I在独占proposal目录生成14生产叶和4验证叶，及隔离测试所需的非生产证据。不得直接写Root、已注册H2、真实state/ownership，不得创建实际上下文、访问两DB、控制API或运行真实工具mode；运行隔离Node语法/单测允许。

本基线不授权Root推广、Source15实际G2、效果、G3/G4、main合并、部署或切换。仅实际交付后可收口本技术子片；本批各业务Issue、#57和完整R5 #116保持原开放边界，新增认证仍为0。
