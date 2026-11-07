# RUST-R4-GHI / R5-P1 联合实施基线

- Gate Status: **Pending**；本业务批未准入 G2。
- Parent: R4 #101 → #110 → G #111 / H #112 / I #113 / 阶段验收 #114；R5 #116 → 最小角色 #117；总体 #57。
- Owner: Root 与 G/H/I 独立作者；G1 Reviewer: `r4ghi_g1_review`。
- Date: 2026-11-06（Asia/Tokyo）；Type: `cross-layer-high-risk`；solo worktree checkpoint，独立 G3/固定提交/main/实际 G4。

## 1. 范围与不做内容

32 个唯一 HTTP：G9、H8、I既有8加stage2/condition1共11、R5最小角色4；29既有、3新增。R4本批28，规划总量92→95；Rust目标272是预测，当前正式240、R4已交付67，本批新增正式交付0。完整R4还需全部内部/审批消费与真实阶段验收，不能以路由数直接关闭#101。

必要支持变化不重复计HTTP：C回款确认、B条款币种、E/F已消费来源保护及受控纠正、D授权/阶段、Project创建/改派/详情/时间线、Lead转换初始责任、公共摘要/审计/敏感投影与最小UI。完整R5/R6/R7、历史重新认证/导入、无真实上游的付款/发票冲正、部署切流/性能、S3 WORM及真实lost COMMIT ACK不在本批。

## 2. 正式输入与唯一SSOT

| Concern                   | Source                                                                       | Rule                                                      |
| ------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 五项业务裁决              | `rust-r4ghi/user-decisions02.json`                                           | 最小R5/阶段、含税回款、显式成本、零权重、有条件完工       |
| 第六项权限裁决            | `rust-r4ghi/user-decision-scope03.json`                                      | 真创建人首次指派，此后真实责任链                          |
| 有效机器蓝图/精确DTO/规则 | `tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json`及其指定schema/policy | 修正首轮独审后唯一可执行输入；v1与各作者草案只保留历史    |
| migration/entity目标      | effective-v2唯一`migration.sql`及ORM映射                                     | 94→95、120→139表是规划；无SQL执行不称迁移通过             |
| Decimal容量               | `joint-g1/capacity-delta02`                                                  | 20旧聚合列与新金额18,2，0扩列；MAX/零/负/aggregate422边界 |
| canonical                 | `api-route-canonical-inventory.md`、ADR-015                                  | 既有29逐行核，新3下节准确命名                             |
| 来源与固定产物            | 活动联合manifest、当前main和蓝图hash                                         | raw bytes/Git输入绑定，不把不同捕获时点拼成有效基线       |

正式操作表为 `rust-r4ghi/operation-map01.json`，原字节输入清单为 `rust-r4ghi/g1-source-manifest01.json`。具体真实链路、负向场景与证据分级见 `rust-r4ghi/acceptance-plan01.json`；这些均为验收要求，不能视为已通过结果。

角色/DTO/状态/查询/表字段以蓝图和schema为精确SSOT，不保留空白命名。原Node行为只作受控参考；业务正确性优先。历史候选、失败、partial、ignored、首轮P1/P2证据不改写；正式独立G1及线上冻结读回另签，本文件Pending不自证通过。

## 3. 接口、类型与读侧

新canonical不含`/api`：`POST /projects/{id}:startExecution`、`POST /projects/{id}:startAcceptance`、`POST /project-completion-records/{completionRecordId}/conditions/{id}:close`。named keys保存两个UUID，核父子/项目一致；旧ABCDEF single-id显式兼容。完整32方法/DTO/权限/状态/归属见活动operation-map。

本批16现代写DTO及C新basis协议required `inputVersion=server-derived-v1`。Rust缺tag/legacy422，现代shape错误400；Native冻结旧schema参考，现代显式422，不靠字段存在性误落旧producer、不用any/as-cast降低保护。既有E/F未消费正常协议不无故加tag；sealed permit不是客户端布尔值。

UUID类型化；新row_version expectedVersion与positive int4闭合。金额精确整数分/decimal，两位与numeric(18,2)语义容量，算术/持久化前超限422 `operating_money_capacity_exceeded`，不靠DB22003。已知零须封闭真实依据；未知为null+knowledge/reasons，不能填0。G两快照及H评价/绑定的待确认税额均须表达未知。比例38,6，规则按未显示舍入的精确原量比较。权重原始JSON token先转millionths，不先f64，≤6有效小数、合计1000000，0须非空原因。历史非精确两位经济值不自动round/回写；date/datetime保持各自类型，操作者/确认时间服务器生成。

无角色分配时current GET明确200/null。本人条件任务和创建人首派使用精确最小DTO分支，不能复用full required字段填空；本人列表/关闭响应不泄父验收/完成证据，全体conditionStatus服务器聚合。任务UI不依赖先取得full ProjectDetail。敏感raw键所有调用者literal null，值仅授权projection；labor/unknown可逆字段组最严，敏感GET必要事件失败不吐载荷。

## 4. producer、持久化、事务与锁

G唯一collector，H唯一policy，Root统一context/model/hash/loader。G核pre-effect expectedInputHash，实际inclusion/CAS后形成finalSourceHash；本次生成self/result refs为null且不进sourceHash，不后填immutable capture。H纯derive→G一次INSERT最终capture action/v1→同outer TX H按id/v1/hash重载重算→DMER/OSER/四stage binding/全原因/生产摘要→必要audit/auth/security flush→一次COMMIT。manual只追加overlay和新有效binding，G原snapshot不改。

回款为gross并冻结真实合同净税/币种依据；历史confirmed缺basis只受控`certify-existing-basis`，CAS追加依据，不改现金/状态/confirmedAt/旧snapshot。项目技术估算只用一次，不按多合同重复。完整成本范围include/exclude+reason、真直接成本/真shared result消费，按来源链去重，不造receiver cost行或猜invoice-payment关系。

已消费来源普通变更拒绝；同一重述通过封闭typed permit调用真实labor/allocation/stage/tax producer，核完整影响项目权限与稳定UUID锁集，重述全部适用live/period终端。缺真实上游的其他纠正明确阻断。旧current baseline/frozen period/frozen角色不得因只查新head/producer1而绕过；无本批真admission的历史fail-closed，不用23505代替语义。period窗口不改，live periodRef=null；frozen participant不可重挂parent/改冻结集合。

组织首派依真实新ownership-origin、verified creator、never-personal/未consumed、有效membership、ProjectWrite及CAS；direct Create初始personal所以立即consumed，Lead转换记录实际operator/继承owner，首派永久消费。旧未知不回填，回org不复活creator权限。reassign/Dprepare先核旧关系再生产授权，不能自造scope；同组织/ancestor/roleKey/system-role/裸write/finance不是scope。G/H finance还须OwnerWrite或真confirmed finance/business-admin职责；最小首派/本人任务proof不扩全项目经营范围。

新project只assessment；D真准备进入handover不虚构前史，execution须真frozen角色与同链移交本人确认；acceptance须真执行/交付证据。仅final验收completed/conditional-completed；条件负责人/期限/证据、本人逐项双CAS、immutable closure，最后全closed服务器聚合，原conditional结论不改、pending阻archive。归档为终态附属事实，替代/撤销不重开阶段。

## 5. 归属、校验与Gate

Root单写Cargo/lib/http/named keys/validation、shared/OpenAPI/client、一向生成、迁移/ORM、共用model/hash/scope及既有关键producer/中央UI、Git/GitHub/环境；G/H/I独立Rust业务目录与UI子件按蓝图owner表，支撑patch交Root复核单写。独立worktree/构建/数据边界，子代理显式gpt-6.1-sol/max，Fast未核实；作者不代非作者G3/G4。

必须适用Rust fmt/clippy/build/full regression、TS/Native/shared/admin lint/build/test、完整OpenAPI/client和迁移实体DDL对齐；ORM既有差异分型，不执行生成DDL。真实PG/HTTP/UI核32入口及支持producer、所有scope/最小DTO/六用户裁决、MAX/零/未知/负/11规则与独立四stage、迟到事实/纠正、全部必要写FI与同body重试、锁/CAS/双首派/父子/分摊影响集、敏感JSON/DOM/audit。

统一候选走真实R3客户/项目→签约资金→移交/角色冻结→执行→成本经营→final验收/完工/条件关闭/归档。数据/对象只按已证PK与允许原件条件恢复，两fresh noop、自有资源停止、volume/private保留，G4原字节归档。旧参考/mock/partial/ignored不升格。无Gate例外；修首轮2P1/1P2后追加独审G1及线上冻结，之前仍Pending。

仅各自通过后收口111/112/113/117和本批110/114；完整R4阶段实际验收及独立G3/G4后才关101，R5父116/总体57保持Open。#115已独立收口，不重复计本批交付；无部署或切流授权。
