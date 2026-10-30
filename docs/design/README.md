# 系统设计文档

本目录用于沉淀 `POMS` 的系统设计资产，重点回答以下问题：

- 业务制度如何翻译为系统能力与系统规则
- 核心领域、核心流程、核心状态如何划分
- 平台治理能力与业务域能力如何协同
- 各模块之间的数据边界、职责边界和依赖关系如何稳定下来

本目录中的文档以“主题分类”和“稳定命名”为主，不采用类似 `ADR-001` 的全局顺序编号。

原因是：

- `ADR` 本质上是时间序列的决策记录，编号用于表达决策演进与引用关系
- 设计文档本质上是持续演进的说明书，核心诉求是按主题被查找、按职责被维护，而不是按时间顺序阅读
- 对设计文档使用全局流水号，通常会弱化目录结构，放大时间顺序，反而不利于后续扩展

因此，`POMS` 当前采用：

- `docs/adr/` 保持编号治理
- `docs/design/` 保持分类治理
- 仅当某个分类后续文档数量很多、确实需要固定评审顺序时，再在该分类内部局部编号

## 设计文档分类约定

当前 `docs/design/` 目录建议按以下四类理解和维护。

### 1. 基线设计（Foundation）

用于承载系统级、跨域、长期有效的设计基线，回答“整体怎么做”。

当前文档包括：

- `poms-requirements-spec.md`：系统需求说明，负责把制度条款翻译成系统规则
- `poms-hld.md`：高层设计，负责给出系统蓝图、模块关系和核心边界
- `poms-design-progress.md`：设计进度跟踪，负责管理设计资产状态、依赖关系和下一步产出
- `phase2-user-task-map.md`：第二阶段用户画像与任务地图，负责把范围规划拉回真实用户、真实任务与生命周期体验断点
- `phase2-experience-gap-priority-matrix.md`：第二阶段体验断点与优先级矩阵，负责明确先优化什么、为什么
- `phase2-lifecycle-experience-blueprint.md`：第二阶段项目全生命周期体验蓝图，负责明确主体验主线、阶段承接点与系统连续工作方式
- `phase2-experience-optimization-roadmap.md`：第二阶段体验优化路线图，负责把主体验主线拆成切片、推进顺序与完成标准
- `phase2-presigning-workspace-information-architecture.md`：第二阶段签约前统一工作区信息架构草案，负责细化 `L1-S1 ~ L1-S3` 的顶层入口、工作区结构与承接关系；其中当前也承接 `立项与推进` 章节的细化说明
- `phase2-presigning-project-overview-workspace.md`：第二阶段签约前项目总览工作区草案，负责细化签约前驾驶舱的摘要、阻断、行动与协作结构
- `phase2-presigning-technical-cost-workspace.md`：第二阶段签约前技术与成本工作区草案，负责细化技术判断、范围快照、风险和前期成本估算结构
- `phase2-presigning-bid-commercial-workspace.md`：第二阶段签约前招投标与商务竞标工作区草案，负责细化多形态竞标的统一骨架、协作过程、版本与结果流转
- `phase2-presigning-pricing-margin-workspace.md`：第二阶段签约前报价与毛利评审工作区草案，负责细化报价、成本、税务成本、回款条件与放行结论的统一判断
- `phase2-presigning-contract-readiness-workspace.md`：第二阶段签约前签约就绪工作区草案，负责细化签约前置项检查、可复用事实与进入合同主链前的最终收口判断
- `phase2-presigning-workspace-handoff-map.md`：第二阶段签约前六工作区承接关系图，负责统一输入输出、阻断规则、直接商务路径与合同前收口口径
- `phase2-presigning-workspace-templates.md`：第二阶段签约前主线模板类文档，负责统一前期成本清单、税务成本表达、风险分类、阻断项分类与关键结论摘要模板
- `phase2-execution-cost-workspace-information-architecture.md`：第二阶段执行期成本归集工作区信息架构草案，负责细化项目级成本归集总览、统一入口、状态语义与偏差提示结构
- `phase2-project-actual-cost-records.md`：第二阶段项目级实际成本记录草案，负责细化统一成本记录对象、成本类型、状态模型以及人力成本按人员/角色 + 项目 + 周/月的汇总归集口径
- `phase2-cost-source-to-project-record-mapping.md`：第二阶段项目成本来源映射口径草案，负责明确采购合同、采购发票、费用与必要付款事实如何映射进统一项目成本记录层
- `phase2-actual-cost-accumulation-stage-view.md`：第二阶段实际成本累计与阶段视图草案，负责细化三层累计口径、周/月与执行阶段视图、成本类型拆解与风险缺口解释
- `phase2-estimated-to-actual-cost-bridge.md`：第二阶段估算成本到实际成本承接口径草案，负责明确基线估算版本、估算项到实际成本类型映射与偏差解释规则
- `phase2-contract-to-handover-workspace.md`：第二阶段合同到移交承接工作区草案，负责细化合同生效后到正式移交前的承接状态、前置项、可复用事实与阻断规则
- `phase2-project-handover-gate-workspace.md`：第二阶段项目移交强节点草案，负责细化移交完成状态、多方确认、交接事实清单、执行责任边界与进入执行态的强 gate
- `phase2-commission-freeze-at-handover.md`：第二阶段提成角色与权重冻结绑定移交草案，负责细化冻结时点、版本语义、前置条件以及与移交完成 gate 的一致性要求
- `phase2-handover-closure-rules.md`：第二阶段移交收口口径草案，负责统一合同生效承接、项目移交强节点与提成冻结三层同时成立的最终收口规则
- `phase2-project-business-outcome-overview.md`：第二阶段项目经营结果总览草案，负责把合同、回款、成本、毛利和当前经营状态收成同一项目级经营入口
- `phase2-project-unified-accounting-view-caliber.md`：第二阶段项目统一核算视图口径草案，负责固定收入、成本、毛利、毛利率、税务影响与状态分层的统一经营核算口径
- `phase2-project-variance-risk-explanation.md`：第二阶段项目偏差与风险解释草案，负责把经营偏差、风险类型、数据成熟度与下一步动作收成统一解释结构
- `phase2-business-accounting-feedback-rules.md`：第二阶段经营核算反哺规则草案，负责固定经营结果如何反哺项目执行、提成判断、管理关注与项目复盘
- `phase2-commission-stage-gate-overview-workspace.md`：第二阶段提成阶段总览与 gate 解释草案，负责把提成阶段、门槛、阻断原因、经营依据和下一步动作收成统一工作区
- `phase2-commission-staged-payout-adjustment-paths.md`：第二阶段提成分阶段发放与异常调整路径草案，负责把阶段发放、暂停、扣回、冲销、补发和重算串成连续操作链
- `phase2-commission-retention-final-settlement.md`：第二阶段提成质保金与最终结算收口草案，负责区分非质保部分结清、质保金待结算与项目提成全部结清的最终路径
- `phase2-commission-rule-explanation-language.md`：第二阶段提成规则可解释表达草案，负责统一阶段、gate、阻断、动作和特例的对用户表达规则
- `phase2-detailed-design-index-map.md`：第二阶段详细设计索引与主线地图，负责把 `L1 ~ L5` 的已形成基线收成统一导航入口

### 2. 业务域设计（Domains）

用于承载围绕具体业务域展开的详细设计，回答“这个业务域怎么落地”。

当前文档包括：

- `project-lifecycle-design.md`：项目生命周期设计，聚焦 `Project` 主链路、阶段闸口与里程碑
- `contract-finance-design.md`：合同资金域设计，聚焦合同、回款、成本和发票台账
- `commission-settlement-design.md`：提成结算设计，聚焦提成计算、发放、异常调整与重算
- `workflow-and-approval-design.md`：审批流与风控闸口设计，聚焦审批模型、统一待办与通知审计
- `interface-command-design.md`：接口命令设计，聚焦普通更新、命令型动作与系统派生接口的边界
- `interface-openapi-dto-design.md`：接口 OpenAPI 与 DTO 边界设计，聚焦请求/响应模型与接口合同边界
- `query-view-boundary-design.md`：查询视图边界设计，聚焦列表、详情、经营看板、统一待办与历史追溯的读侧边界
- `data-model-prerequisites.md`：数据模型冻结前提，聚焦主表、版本表、快照表与动作记录表的分类边界
- `table-structure-freeze-design.md`：表结构冻结设计，聚焦逻辑表职责、关键关系与字段组冻结边界
- `schema-ddl-design.md`：Schema 与 DDL 细化设计，聚焦命名规则、公共字段模板、主外键、唯一约束与高频索引基线

### 3. 治理与横切设计（Governance）

用于承载平台治理、授权、导航、组织、横切约束等设计，回答“平台级规则如何统一约束各业务域”。

当前文档包括：

- `business-authorization-matrix.md`：业务对象动作授权矩阵，用于沉淀跨域授权基线
- `phase2-data-permission-and-sensitive-visibility-design.md`：第二阶段业务数据权限与敏感信息可见性设计，用于补齐数据范围权限、敏感字段控制与提成敏感信息约束
- `api-route-canonical-inventory.md`：API 路由 canonical inventory，用于固定 canonical route、盘点 drift 并驱动批量整改执行
- `current-drift-inventory.md`：当前实现 / 测试 / 文档生命周期漂移盘点，用于记录仍影响工程判断或归档判断的 drift
- `runtime-audit-and-security-event-design.md`：统一运行时审计与安全事件设计，用于冻结第一阶段最小审计落库与安全事件结构化留痕基线
- `platform-governance/README.md`：平台治理域设计入口，聚合总设计、子设计与配套输出物
- `platform-governance/` 子目录下的用户、角色权限、组织、导航等详细设计

### 4. 评审与治理文档（Reviews）

用于承载当前主线控制、统一开发判断，以及已完成评审治理结果的索引入口，回答“当前设计成熟度如何、工程应从哪里进入”。

当前文档包括：

- `phase2-mainline-delivery-plan.md`：第二阶段主线交付计划的当前精简入口，负责统一主线目标、当前阶段状态、默认阅读路径与工程进入顺序
- `phase2-lx-t04-full-mainline-development-decision.md`：第二阶段 `LX-T04` 统一开发判断的当前精简入口，负责固定是否进入开发、统一开发范围、切片顺序与启动约束
- `implementation-delivery-guide.md`：实施启动与交付流程说明，聚焦实施入口、切片流程、完成定义与文档回写约束
- [backend-rust-migration-plan.md](backend-rust-migration-plan.md)：后端 Rust 重构计划，明确 WSL Debian 环境、兼容边界、分阶段实现、统一切换和回滚；不以性能实测作为立项前置条件
- [rust-r2-scope-and-dependencies.md](rust-r2-scope-and-dependencies.md)：R2 #67 的 108 操作互斥拆片、依赖和待决路由；[机器映射](rust-r2-operation-slices.json)，首片 [R2A 导航基线](archive/slices/rust-r2a-navigation-baseline.md)，R2B按[角色权限基线](archive/slices/rust-r2b-role-permissions-baseline.md)交付八操作 / G4，R2C按[组织基线](archive/slices/rust-r2c-org-units-baseline.md)交付八操作 / G4，当前R2A–J已交付，K/L/M按各自依赖继续推进
- [R2A 收口记录](archive/slices/rust-r2a-closeout.md)：三操作导航与真实同步审计已交付；[纠偏记录](archive/slices/rust-r2a-corrective-checkpoint.md)、[机器验收](rust-r2a-validation.json)。本条保留R2A收口时点；当前R2父任务继续Doing，累计状态见最新I/J联合收口。
- [R2D 收口记录](archive/slices/rust-r2d-closeout.md)：11个用户/owner-reference/profile操作；实现`9302fd7149257aa40584fc500fd76dd0c766b80d`已集成推送，归档前8步/26项/1747来源静态检查通过；[基线](archive/slices/rust-r2d-users-profile-baseline.md)、[纠偏](archive/slices/rust-r2d-corrective-checkpoint.md)、[机器验收](rust-r2d-validation.json)。G4随归档提交推送与Issue同步生效；R2累计30/108、剩余78及R2M，父#67/#57 Open，E–M与#61不变，PG17保留。
- [R2C 收口记录](archive/slices/rust-r2c-closeout.md)：八操作组织树与命令已交付；[纠偏记录](archive/slices/rust-r2c-corrective-checkpoint.md)、[机器验收](rust-r2c-validation.json)。R2A/B/C累计19/108，余89操作及R2M阶段验收；G4随归档推送和Issue同步生效。
- [R2B 收口记录](archive/slices/rust-r2b-closeout.md)：八操作角色与权限已交付；[纠偏记录](archive/slices/rust-r2b-corrective-checkpoint.md)、[机器验收](rust-r2b-validation.json)。G4随本归档提交推送及Issue同步生效。
- [rust-migration-execution-tracker.md](rust-migration-execution-tracker.md)：Rust 迁移任务、代理分工、依赖与 gate 状态；R0/R1A–E 已交付，父 R1 G4 随本归档提交及 Issue 同步生效；总体 #57 与 R2–R7 未完成
- [rust-r0-baseline.md](archive/slices/rust-r0-baseline.md)：R0 盘点、架构和环境基线，链接完整 API、数据库及工具链证据
- [rust-r0e-environment-baseline.md](archive/slices/rust-r0e-environment-baseline.md)：TEST 兼容构建、隔离 PostgreSQL 15、固定依赖与验收记录；日常开发仍可用既有 PG17
- [rust-r0f-compatibility-baseline.md](archive/slices/rust-r0f-compatibility-baseline.md)：路由差异裁决、现行认证/数据样本及 R1 输入冻结；不代表 Rust 产品实现通过
- [rust-r1-foundation-baseline.md](archive/slices/rust-r1-foundation-baseline.md)：R1 七操作、认证与基础的冻结输入及总体 G4 归档；R1A–E 已交付，工程状态见 Issue #60
- [rust-r1a-application-baseline.md](archive/slices/rust-r1a-application-baseline.md)：R1A #62 已交付的工程、SQLx、三路由与启停基线及 G3/G4 记录
- [rust-r1b-shared-types-baseline.md](archive/slices/rust-r1b-shared-types-baseline.md)：R1B #63 单向共享类型生成与基础兼容边界及 G3/G4 记录；[机器验收证据](rust-r1b-validation.json)
- [rust-r1c-auth-session-baseline.md](archive/slices/rust-r1c-auth-session-baseline.md)：R1C #64 认证/会话/Cookie/CSRF/权限与密文兼容及 G3/G4；[纠偏记录](archive/slices/rust-r1c-corrective-checkpoint.md)、[机器验收证据](rust-r1c-validation.json)
- [rust-r1d-e2e-client-baseline.md](archive/slices/rust-r1d-e2e-client-baseline.md)：R1D #65 通用双后端E2E、跨平台浏览器启动与完整客户端生成；G3/G4完成；[纠偏](archive/slices/rust-r1d-corrective-checkpoint.md)、[机器证据](rust-r1d-validation.json)
- [rust-r1e-stage-acceptance-baseline.md](archive/slices/rust-r1e-stage-acceptance-baseline.md)：R1E #66 原 Angular 认证壳、权限回退与阶段验收归档，afbf4ee5 已推送；64 stage、36 legacy（11 mock）、80 run 清理及集成后19项通过；G4 随本归档提交及 Issue 同步生效；[纠偏记录](archive/slices/rust-r1e-corrective-checkpoint.md)、[机器证据](rust-r1e-validation.json)
- `implementation-governance-gates.md`：设计到实现治理闸口，聚焦冻结闸口、合并闸口、子切片治理、例外留痕、风险分层证据、GitHub issue-first 迁移与过渡规则
- `phase2-development-execution-tracker.md`：第二阶段开发执行追踪板；在 GitHub issue-first Phase 1 中作为 transitional index 镜像 issue 状态、任务拆解与执行回写
- `archive/README.md`：历史过程资产归档入口，负责区分当前正式输入与归档过程文档
- `archive/slices/README.md`：已完成切片生命周期产物归档入口，负责索引 `G4` 后迁移的 baseline / checkpoint / closeout

第二阶段正式审阅三件套 `archive/reviews/phase2-review-checklist.md`、`archive/reviews/phase2-review-comprehensive-assessment.md`、`archive/reviews/phase2-review-follow-up-plan.md` 已在第二轮治理中转入归档，作为历史审阅依据保留，不再作为当前默认开发入口。

第二阶段主线任务收口记录 `archive/mainline-closure/phase2-mainline-task-tracker.md` 已在第三轮治理中转入归档，作为历史完成轨迹保留，不再作为当前默认开发入口。

第二阶段主线实现设计证明矩阵 `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md` 已在第四轮治理中转入归档，作为历史证明材料保留，不再作为当前默认开发入口。

第一阶段收口与验收包 `archive/phase1-closure/README.md`、`archive/phase1-closure/poms-phase1-delivery-roadmap.md`、`archive/phase1-closure/poms-phase1-gap-closure-plan.md`、`archive/phase1-closure/poms-phase1-gap-closure-checklist.md`、`archive/phase1-closure/poms-phase1-acceptance-gap-matrix.md`、`archive/phase1-closure/poms-phase1-final-acceptance-snapshot.md` 已在第五轮治理中转入归档，作为第一阶段历史收口与验收留痕保留，不再作为当前默认入口。

平台治理域评审清单与评审摘要 `archive/reviews/platform-governance-review-checklist.md`、`archive/reviews/platform-governance-review-summary.md` 已在第五轮治理中转入归档，作为平台治理域历史评审资产保留，不再作为当前默认设计输入。

第二阶段两份当前控制文档的长篇论证版本 `archive/control-history/phase2-mainline-delivery-plan.md` 与 `archive/control-history/phase2-lx-t04-full-mainline-development-decision.md` 已在第六轮治理中转入归档；根目录同名文档当前仅保留正式入口、正式结论与当前执行口径。

## 命名规则

设计文档默认不使用全局编号，优先使用“主题 + 文档类型”的稳定命名方式。

推荐命名模式如下：

- `xxx-requirements-spec.md`：需求说明或规则映射文档
- `xxx-hld.md`：高层设计文档
- `xxx-design.md`：某个领域或专题的详细设计文档
- `xxx-matrix.md`：矩阵类文档，如对象动作、角色权限、字段授权矩阵
- `xxx-mapping.md`：映射类文档，如导航-路由映射、状态映射、对象映射
- `xxx-checklist.md`：检查单、评审前清单、收口清单
- `xxx-summary.md`：评审摘要、结论摘要、阶段性总结
- `README.md`：目录入口文档，只负责索引与阅读路径说明

命名时应优先体现“主题稳定性”，避免使用过强的阶段性词汇，除非文档本身就是过程产物。

## 页头元信息约定

除目录入口型 `README.md` 外，`docs/design/` 下的正式设计文档建议在标题后统一补充以下页头元信息：

- `文档状态`
- `最后更新`
- `适用范围`
- `关联文档`

推荐格式如下：

```md
# 文档标题

**文档状态**: Draft
**最后更新**: 2026-03-16
**适用范围**: `POMS` 第一阶段某业务域或某治理专题
**关联文档**:

- `上游设计文档或相关 ADR`
- `同域关联设计文档`
```

其中：

- `文档状态` 使用本 README 约定的标准状态体系
- `最后更新` 使用 `YYYY-MM-DD` 格式
- `适用范围` 用于明确当前结论在哪个阶段、哪个域或哪个专题内成立
- `关联文档` 用于建立与上游设计、同级设计和相关 ADR 的追溯关系

推荐把 `关联文档` 进一步拆成以下三组，以减少不同文档之间的口径漂移：

- `上游设计`：需求说明、HLD、域总设计、进度板等上游输入
- `同级设计`：同一业务域或同一治理域内互相依赖的专题设计
- `相关 ADR`：直接约束当前文档结论的 ADR

推荐格式如下：

```md
**关联文档**:

- 上游设计:
  - `../poms-requirements-spec.md`
  - `../poms-hld.md`
- 同级设计:
  - `platform-governance-design.md`
  - `user-management-design.md`
- 相关 ADR:
  - `../../adr/001-platform-permission-model.md`
```

如果某一组当前为空，可以省略该组，而不是人为补齐无意义引用。

如果文档属于评审清单、评审摘要或进度板，仍建议保留相同页头结构，以便统一检索和状态治理。

## 状态规则

设计文档与 `ADR` 使用不同状态体系。

### ADR 状态

- `Proposed`
- `Accepted`
- `Deprecated`
- `Superseded`

### 设计文档状态

- `Draft`：草稿中，方向已开始成形
- `Review`：已形成可审阅基线，或已进入评审 / 评审前收口阶段
- `Accepted`：已作为当前阶段正式设计依据
- `Active`：持续维护中的治理性文档或状态性文档
- `Archived`：历史保留，不再作为当前设计输入

其中：

- 进度板、清单、评审摘要这类治理性文档，通常使用 `Active`
- 能直接作为实现或下游详细设计输入的文档，通常应逐步从 `Draft` 演进到 `Review` 或 `Accepted`
- `Draft (Baseline)`、`Ready for Review` 不再作为独立正式状态；如需表达“已形成首版基线”或“准备进入评审”，应写入说明、备注或限定语，而不是扩展状态集合

如有必要，可在标准状态后追加范围或阶段限定，以表达“该状态在什么边界内成立”，例如：

- `Accepted (Phase 1 Baseline)`
- `Draft (Discovery)`

追加限定时，应满足两个原则：

- 基础状态仍然必须可归入上述标准状态之一
- 限定语只用于补充适用范围或阶段边界，不应创造新的状态体系

### 任务状态

- `Todo`：尚未开工
- `Doing`：正在实施
- `Blocked`：存在明确阻塞
- `Done`：已完成代码、测试与文档回写

### 治理闸口状态

- `Pending`：尚未评估
- `Pass`：已通过
- `Block`：阻断推进
- `Waived`：已按例外流程显式豁免

说明：

- 任务状态只用于执行任务、追踪板或项目看板。
- 治理闸口状态只用于实施基线包、PR checklist / local checkpoint、例外记录或未来结构化门禁。
- `Frozen for Build` 是 `G1 = Pass` 的展示语义，不是新的设计文档状态。

## 阅读顺序建议

对第一次进入 `POMS` 设计体系的读者，建议按以下顺序阅读：

1. 业务制度源文档
2. `poms-requirements-spec.md`
3. `docs/adr/` 下已接受的 ADR
4. `poms-hld.md`
5. `poms-design-progress.md`
6. 具体业务域设计文档
7. 平台治理域设计文档
8. 评审与治理文档
9. 仅在需要第一阶段收口与验收回溯时，再进入 `archive/phase1-closure/README.md`

如果读者的目标是参与某一专项设计评审，则建议改为：

1. 先读对应业务域设计或治理设计主文档
2. 再回看相关 ADR
3. 最后结合评审清单与授权矩阵进行收口检查

如果读者的目标是参与当前第二阶段工程实现，则建议改为：

1. 先读 `README.md`
2. 再读 `poms-design-progress.md`
3. 再读 `phase2-lx-t04-full-mainline-development-decision.md`
4. 再读 `phase2-mainline-delivery-plan.md`
5. 再读 `phase2-detailed-design-index-map.md`
6. 再读 `implementation-delivery-guide.md`
7. 再读 `implementation-governance-gates.md`
8. 再读 `phase2-development-execution-tracker.md`
9. 再读 `../reference/implementation-baseline-package-template.md`、`../reference/implementation-corrective-checkpoint-template.md`、`../reference/implementation-governance-checks.md` 与 `../reference/solo-worktree-governance.md`
10. 最后按业务域主文档与六份实现设计总文档进入具体实现
11. 仅在需要过程回溯时，再进入 `archive/README.md`

## 当前目录索引

当前目录已经按“当前正式输入优先、历史过程资产归档”完成多轮整理。

### 当前正式输入

#### 基线与导航入口

- `poms-requirements-spec.md`
- `poms-hld.md`
- `poms-design-progress.md`
- `phase2-experience-optimization-roadmap.md`
- `phase2-detailed-design-index-map.md`

#### 业务域与实现设计

- `project-lifecycle-design.md`
- `contract-finance-design.md`
- `commission-settlement-design.md`
- `workflow-and-approval-design.md`
- `interface-command-design.md`
- `interface-openapi-dto-design.md`
- `query-view-boundary-design.md`
- `data-model-prerequisites.md`
- `table-structure-freeze-design.md`
- `schema-ddl-design.md`

#### 治理与横切

- `business-authorization-matrix.md`
- `phase2-data-permission-and-sensitive-visibility-design.md`
- `current-drift-inventory.md`
- `runtime-audit-and-security-event-design.md`
- `platform-governance/README.md`

#### 控制与实施入口

- `phase2-mainline-delivery-plan.md`
- `phase2-lx-t04-full-mainline-development-decision.md`
- `implementation-delivery-guide.md`
- `implementation-governance-gates.md`
- `phase2-development-execution-tracker.md`

### 已归档过程资产

- `archive/README.md`
- `archive/slices/`：所有已完成（G4）切片的生命周期产物（`ex-*`、`fe-*` 系列 baseline / closeout / checkpoint）
- `archive/phase1-closure/`：第一阶段收口摘要、路线图、补齐计划、验收清单、缺口矩阵与最终验收快照
- `archive/reviews/`：已完成使命的正式审阅清单、综合评估、follow-up 清单、评审摘要、分轮审阅记录与已撤销历史判断
- `archive/mainline-closure/`：已完成使命的主线任务收口记录与完成轨迹文档
- `archive/control-history/`：当前仍在根目录保留的 phase2 控制文档之历史长文版本
- `archive/phase2-batches/`：第一批、第二批、第三批范围说明与实现映射桥接文档

## 后续演进建议

当前阶段已经建立 `archive/` 子目录，把高噪声过程文档移出根目录。

后续若文档继续扩张，可按需要逐步演进为显式子目录，例如：

- `foundation/`
- `domains/`
- `governance/`
- `controls/`

但在目录迁移之前，应先保证：

- 当前正式输入集合已经稳定
- 归档与当前输入的边界已经清楚
- README 与进度板都能承担稳定索引作用

## 维护约定

- 新增设计文档时，优先判断其属于基线、业务域、治理还是评审类资产
- 新增设计文档时，优先使用稳定主题命名，不默认引入编号
- 若新增内容属于”高影响、难回退、需要记录为什么这样定”的结论，应优先考虑补 ADR，而不是直接塞进设计文档
- 若某类文档后续数量明显增多，再考虑在该类内部增加子目录或局部编号
- 每次新增、归档或调整设计资产时，应同步更新本 README 与 `poms-design-progress.md`
- **G4 归档规则**：切片 `*-g3-g4-closeout.md` 写完并 commit 后，该切片所有 `*-baseline.md`、`*-closeout.md`、`*-corrective-checkpoint.md` 须在同一 commit 或紧跟 commit 中迁移至 `archive/slices/`

- [R2E/F 联合收口](archive/slices/rust-r2ef-closeout.md)：实现`9b3086f6957dfed318a7a53d10cf245394d5282f`已推送，G3独审无未关闭P0/P1/P2；[机器验收](rust-r2ef-validation.json)、[独审原件](rust-r2ef-review.json)、[归档基线](archive/slices/rust-r2ef-foundation-audit-baseline.md)。G4随归档推送与Issue核对生效；R2A–F累计40/108、余68及R2M，父#67/#57 Open，G–M及#61不变，PG17保留。上方各旧切片计数保留其收口时点含义。

- [R2G/H 联合收口](archive/slices/rust-r2gh-closeout.md)：34个既有操作，实现91cda75f已推送main，G3最终P0–P3未关闭0，独立集成核验Pass；[原件](rust-r2gh-validation.json)/[初审Block](rust-r2gh-review.json)/[增量02](rust-r2gh-g3-delta02.json)/[最终独审](rust-r2gh-review02.json)分列，受审全量清单保留；[G4来源快照](rust-r2gh-g4-source-manifest.json)分列归档时点。G4随归档推送与Issue回写生效，累计74/108、余34＋R2M，仅#74/#75完成，父#67/#57与I–M/#61保留。

- [R2I/J 联合收口](archive/slices/rust-r2ij-closeout.md)：25个既有操作，实现568c0ba3已推送，联合G3及独立集成核验Pass；[初始验收](rust-r2ij-validation.json)/[纠偏增量](rust-r2ij-g3-delta01.json)/[最终独审](rust-r2ij-review01.json)/[完整来源](rust-r2ij-source-manifest.json)/[保全锚点](rust-r2ij-preservation.json)分列。G4随归档推送与Issue回写生效，累计99/108，余K5/L4共9操作＋R2M；父#67/#57、K/L/M及#61保留。

### 2026-10-29 L1 与 K5 参数子片 G0

- [联合G1候选](rust-r2l1-k-route-baseline.md)：L1#81内部公共引擎与#82五项参数裁决/契约同步，当前Todo/G1Pending，0新增已交付公共操作；L4/K5与R3–R5真实域条件保留，计数99/108。

- [L1/K5 子片冻结验收](rust-r2l1-validation.json)、[独立G3](rust-r2l1-g3-review01.json)与[证据归档](rust-r2l1-preservation.json)：G3 Pass，提交集成/G4待完成，0新增公共操作。

- [L1/K5 子片G4收口](rust-r2l1-g4-closeout.md)：#81/#82已关闭，0新增公共操作、R2仍99/108，父项及领域业务保持未完成。

- [K业务与R4两参数联合基线](archive/slices/rust-r2k-r4-route-baseline.md)：#78/#83，G4 Pass，当前104/108；L四操作及R2M待验。

- [K与R4两参数联合G3](rust-r2k-g3-review01.json)：实际验收、主区保全与固定提交已核；G4完成，见归档收口。

- [K与R4两参数G4收口](archive/slices/rust-r2k-closeout.md)：#78/#83已关闭，104/108；[证据索引](rust-r2k-evidence-index.json)保留原始与增量路径。

- [L四操作与两业务号lookup联合基线候选](archive/slices/rust-r2l-lookup-baseline.md)：#79/#84，联合G1 Pass，实施/验收/G3/G4待完成，仍104/108。


### 2026-10-30 L 与两业务号 lookup 联合 G3

RUST-R2L-LOOKUP 联合 G3 已通过，[非作者决定](rust-r2l-g3-review01.json)绑定[冻结验收](rust-r2l-validation.json)与[完整保全](rust-r2l-preservation.json)。原失败、四项 SQL wire 覆盖边界、54 ignored 与 source07 的有限路径复用均保留；不认领整个 R3–R5、部署或性能。当前仍 Doing、104/108，固定提交、main 集成、归档及在线 G4 待完成；只有实际 L G4 后可108/108，R2M及父#67/#57继续Open，#61按自身全部条件收口。
