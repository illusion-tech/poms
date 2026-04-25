# POMS 设计进度跟踪

**文档状态**: Active
**最后更新**: 2026-04-24
**适用范围**: `POMS` 设计治理与进度跟踪

---

## 1. 文档目标

本文档用于跟踪 `POMS` 当前设计工作的真实进度，统一回答以下问题：

- 当前设计处于哪个阶段
- 哪些文档已经产出，状态如何
- 哪些关键决策已经固定，哪些仍属于后续演进议题
- 哪些业务域已具备进入详细设计的前置条件
- 接下来最优先应该补哪些设计文档

本文档不是需求说明、HLD 或 ADR 的替代物，而是这些设计资产的治理看板。

---

## 2. 当前阶段判断

截至目前，`POMS` 整体处于：

**“第一阶段已完成正式收口并转入历史归档；第二阶段已完成 `LX-T04` 统一开发判断并进入按统一范围与切片顺序推进工程实现的阶段。”**

当前阶段特征：

- 制度源文档已明确
- 系统需求说明已形成 `Accepted`
- HLD 已形成 `Accepted`
- 多项高影响架构问题已通过 ADR 固化
- 第一阶段收口与验收包已转入 `archive/phase1-closure/`
- 平台治理域历史评审资产已转入 `archive/reviews/`
- 业务对象动作授权矩阵已形成首版基线
- 核心工程切片（`Project`、`Contract`、审批待办、平台壳层）已完成真实环境验证
- 第一阶段最终验收快照、缺口矩阵与补齐计划现仅保留为历史依据，不再作为当前默认入口
- 第二阶段 `L1 ~ L5` 当前范围内的实现设计已完成，`LX-01` 最终一致性复核已完成
- `LX-T04` 已给出 Go 结论，当前正式进入统一开发范围、统一工程切片顺序与持续文档回写阶段
- 当前默认入口已统一收敛到 `README.md`、本进度板、`phase2-lx-t04-full-mainline-development-decision.md`、`phase2-mainline-delivery-plan.md`、`phase2-detailed-design-index-map.md` 与 `implementation-delivery-guide.md`；两份 phase2 控制文档的长篇历史论证已下沉到 `archive/control-history/`

---

## 3. 里程碑总览

| 里程碑             | 当前状态 | 说明                                                                        |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| 业务制度源文档整理 | 已完成   | 两份制度文档已就位                                                          |
| 系统需求总纲收敛   | 已完成   | `poms-requirements-spec.md` 已形成 `Accepted`，可作为详细设计上游输入       |
| 高层设计收敛       | 已完成   | `poms-hld.md` 已形成 `Accepted`，主要领域边界已固定                         |
| 关键 ADR 固化      | 已完成   | `ADR-001` 到 `ADR-007` 已接受，可作为当前详细设计的关键决策依据             |
| 设计分类与域级拆分 | 已启动   | `platform-governance/` 已形成首个治理域子目录，其他设计资产已按主题逐步收敛 |
| 接口设计冻结       | 已启动   | 已形成接口命令与 OpenAPI / DTO 边界基线，待进入最终 schema 文件层细化       |
| 表结构冻结         | 已启动   | 已形成数据模型前提、查询视图边界、逻辑表结构与 schema / DDL 细化基线        |
| 开发排期承诺       | 未开始   | 在第一阶段缺口补齐前，不建议直接冻结后续阶段排期                            |

---

## 4. 设计资产清单

### 4.1 业务源文档

| 文档                               | 当前状态 | 作用               | 备注                           |
| ---------------------------------- | -------- | ------------------ | ------------------------------ |
| `docs/销售规范流程制度（试行）.md` | 已有     | 销售流程制度源文档 | 作为需求与规则映射上游依据     |
| `docs/销售提成方案制度（试行）.md` | 已有     | 提成制度源文档     | 作为提成计算和发放规则上游依据 |

### 4.2 基线设计

| 文档                                                                      | 当前状态 | 作用                                                                                                         | 是否可作为下游输入 |
| ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ | ------------------ |
| `docs/design/poms-requirements-spec.md`                                   | Accepted | 制度到系统能力映射、范围、状态机、权限矩阵、规则边界                                                         | 是                 |
| `docs/design/poms-hld.md`                                                 | Accepted | 领域蓝图、模块边界、数据可信源、版本化约束                                                                   | 是                 |
| `docs/design/poms-design-progress.md`                                     | Active   | 当前设计进度跟踪与治理看板，负责维护整体成熟度与依赖关系                                                     | 是                 |
| `docs/design/phase2-user-task-map.md`                                     | Review   | 第二阶段范围规划前置分析，负责沉淀用户画像、生命周期任务链与体验断点                                         | 是                 |
| `docs/design/phase2-experience-gap-priority-matrix.md`                    | Review   | 第二阶段体验断点优先级矩阵，负责收敛 `P0/P1` 主断点与优化顺序                                                | 是                 |
| `docs/design/phase2-lifecycle-experience-blueprint.md`                    | Review   | 第二阶段项目全生命周期体验蓝图，负责明确四条主体验主线、阶段承接点与连续工作方式                             | 是                 |
| `docs/design/phase2-experience-optimization-roadmap.md`                   | Active   | 第二阶段体验优化路线图，负责维护主体验主线、统一切片顺序与开发前后状态回写                                   | 是                 |
| `docs/design/phase2-presigning-workspace-information-architecture.md`     | Review   | 第二阶段签约前统一工作区信息架构草案，负责细化 `L1-S1 ~ L1-S3` 的顶层入口、工作区结构与承接关系              | 是                 |
| `docs/design/phase2-presigning-project-overview-workspace.md`             | Review   | 第二阶段签约前项目总览工作区草案，负责细化签约前驾驶舱的摘要、阻断、行动与协作结构                           | 是                 |
| `docs/design/phase2-presigning-technical-cost-workspace.md`               | Review   | 第二阶段签约前技术与成本工作区草案，负责细化技术判断、范围快照、风险和前期成本估算结构                       | 是                 |
| `docs/design/phase2-presigning-bid-commercial-workspace.md`               | Review   | 第二阶段签约前招投标与商务竞标工作区草案，负责细化多形态竞标的统一骨架、协作过程、版本与结果流转             | 是                 |
| `docs/design/phase2-presigning-pricing-margin-workspace.md`               | Review   | 第二阶段签约前报价与毛利评审工作区草案，负责细化报价、成本、税务成本、回款条件与放行结论的统一判断           | 是                 |
| `docs/design/phase2-presigning-contract-readiness-workspace.md`           | Review   | 第二阶段签约前签约就绪工作区草案，负责细化签约前置项检查、可复用事实与进入合同主链前的最终收口判断           | 是                 |
| `docs/design/phase2-presigning-workspace-handoff-map.md`                  | Review   | 第二阶段签约前六工作区承接关系图，负责统一输入输出、阻断规则、直接商务路径与合同前收口口径                   | 是                 |
| `docs/design/phase2-presigning-workspace-templates.md`                    | Review   | 第二阶段签约前主线模板类文档，负责统一前期成本清单、税务成本表达、风险分类、阻断项分类与关键结论摘要模板     | 是                 |
| `docs/design/phase2-execution-cost-workspace-information-architecture.md` | Review   | 第二阶段执行期成本归集工作区信息架构草案，负责细化项目级成本归集总览、统一入口、状态语义与偏差提示结构       | 是                 |
| `docs/design/phase2-project-actual-cost-records.md`                       | Review   | 第二阶段项目级实际成本记录草案，负责细化统一成本记录对象、成本类型、状态模型以及人力成本汇总归集口径         | 是                 |
| `docs/design/phase2-cost-source-to-project-record-mapping.md`             | Review   | 第二阶段项目成本来源映射口径草案，负责明确采购合同、采购发票、费用与必要付款事实如何映射进统一项目成本记录层 | 是                 |
| `docs/design/phase2-actual-cost-accumulation-stage-view.md`               | Review   | 第二阶段实际成本累计与阶段视图草案，负责细化三层累计口径、周/月与执行阶段视图、成本类型拆解与风险缺口解释    | 是                 |
| `docs/design/phase2-estimated-to-actual-cost-bridge.md`                   | Review   | 第二阶段估算成本到实际成本承接口径草案，负责明确基线估算版本、估算项到实际成本类型映射与偏差解释规则         | 是                 |
| `docs/design/phase2-contract-to-handover-workspace.md`                    | Review   | 第二阶段合同到移交承接工作区草案，负责细化合同生效后到正式移交前的承接状态、前置项、可复用事实与阻断规则     | 是                 |
| `docs/design/phase2-project-handover-gate-workspace.md`                   | Review   | 第二阶段项目移交强节点草案，负责细化移交完成状态、多方确认、交接事实清单、执行责任边界与进入执行态的强 gate  | 是                 |
| `docs/design/phase2-commission-freeze-at-handover.md`                     | Review   | 第二阶段提成角色与权重冻结绑定移交草案，负责细化冻结时点、版本语义、前置条件以及与移交完成 gate 的一致性要求 | 是                 |
| `docs/design/phase2-handover-closure-rules.md`                            | Review   | 第二阶段移交收口口径草案，负责统一合同生效承接、项目移交强节点与提成冻结三层同时成立的最终收口规则           | 是                 |
| `docs/design/phase2-project-business-outcome-overview.md`                 | Review   | 第二阶段项目经营结果总览草案，负责把合同、回款、成本、毛利和当前经营状态收成同一项目级经营入口               | 是                 |
| `docs/design/phase2-project-unified-accounting-view-caliber.md`           | Review   | 第二阶段项目统一核算视图口径草案，负责固定收入、成本、毛利、毛利率、税务影响与状态分层的统一经营核算口径     | 是                 |
| `docs/design/phase2-project-variance-risk-explanation.md`                 | Review   | 第二阶段项目偏差与风险解释草案，负责把经营偏差、风险类型、数据成熟度与下一步动作收成统一解释结构             | 是                 |
| `docs/design/phase2-business-accounting-feedback-rules.md`                | Review   | 第二阶段经营核算反哺规则草案，负责固定经营结果如何反哺项目执行、提成判断、管理关注与项目复盘                 | 是                 |
| `docs/design/phase2-commission-stage-gate-overview-workspace.md`          | Review   | 第二阶段提成阶段总览与 gate 解释草案，负责把提成阶段、门槛、阻断原因、经营依据和下一步动作收成统一工作区     | 是                 |
| `docs/design/phase2-commission-staged-payout-adjustment-paths.md`         | Review   | 第二阶段提成分阶段发放与异常调整路径草案，负责把阶段发放、暂停、扣回、冲销、补发和重算串成连续操作链         | 是                 |
| `docs/design/phase2-commission-retention-final-settlement.md`             | Review   | 第二阶段提成质保金与最终结算收口草案，负责区分非质保部分结清、质保金待结算与项目提成全部结清的最终路径       | 是                 |
| `docs/design/phase2-commission-rule-explanation-language.md`              | Review   | 第二阶段提成规则可解释表达草案，负责统一阶段、gate、阻断、动作和特例的对用户表达规则                         | 是                 |
| `docs/design/phase2-detailed-design-index-map.md`                         | Active   | 第二阶段详细设计索引与主线地图，负责维护当前正式阅读路径、主线地图与归档入口                                 | 是                 |

### 4.3 业务域设计

| 文档                                           | 当前状态 | 作用                                                                                                             | 是否可作为下游输入 |
| ---------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| `docs/design/project-lifecycle-design.md`      | Draft    | 项目生命周期、状态机、阻断规则、阶段矩阵，已按 `BidProcess` 口径回写                                             | 是                 |
| `docs/design/contract-finance-design.md`       | Draft    | 合同、回款、成本、发票的详细设计，已形成合同资金域对象与生效口径基线                                             | 是                 |
| `docs/design/commission-settlement-design.md`  | Active   | 提成计算、发放、异常调整与重算设计，已补第一阶段实现缺口、接口建议与切片映射                                     | 是                 |
| `docs/design/workflow-and-approval-design.md`  | Draft    | 审批流、待办聚合、风控闸口设计，已形成统一审批模型与公共能力基线                                                 | 是                 |
| `docs/design/interface-command-design.md`      | Active   | 接口命令设计，已补平台治理域命令集合、提成治理域补齐切片映射，并回写第二阶段第一批、第二批命令补点               | 是                 |
| `docs/design/interface-openapi-dto-design.md`  | Active   | 接口 OpenAPI 与 DTO 边界设计，已补平台治理域 DTO 边界、提成治理域切片映射，并回写第二阶段第一批、第二批 DTO 补点 | 是                 |
| `docs/design/query-view-boundary-design.md`    | Active   | 查询视图边界设计，已补平台治理域管理查询视图、提成治理域读侧闭环要求，并回写第二阶段第一批、第二批查询补点       | 是                 |
| `docs/design/phase2-mainline-delivery-plan.md` | Active   | 第二阶段主线交付计划的当前精简入口，统一说明主线目标、当前阶段状态、默认阅读路径与工程进入顺序                   | 是                 |
| `docs/design/data-model-prerequisites.md`      | Active   | 数据模型冻结前提，已补平台治理域主数据对象、关系对象与提成治理域补齐前提，并回写第二阶段第二批对象链             | 是                 |
| `docs/design/table-structure-freeze-design.md` | Active   | 表结构冻结设计，已补平台治理域与提成治理域逻辑表、关系表与关键字段组，并回写第二阶段第二批逻辑表补点             | 是                 |
| `docs/design/schema-ddl-design.md`             | Active   | Schema 与 DDL 细化设计，已补平台治理域与提成治理域核心表、约束与索引基线，并回写第二阶段第二批 DDL 补点          | 是                 |

### 4.4 治理与横切设计

| 文档                                                                    | 当前状态 | 作用                                                                                           | 是否可作为下游输入 |
| ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| `docs/design/business-authorization-matrix.md`                          | Active   | 业务对象动作授权矩阵，已补平台治理域动作矩阵并可直接指导第一阶段补齐实施                       | 是                 |
| `docs/design/phase2-data-permission-and-sensitive-visibility-design.md` | Review   | 第二阶段业务数据权限与敏感信息可见性设计，负责补齐数据范围权限、敏感字段控制与提成敏感信息约束 | 是                 |
| `docs/design/platform-governance/README.md`                             | Active   | 平台治理域设计目录入口，负责聚合总设计、子设计与配套输出物                                     | 是                 |
| `docs/design/platform-governance/platform-governance-design.md`         | Active   | 平台治理域详细设计总入口，已补第一阶段正式承诺、缺口判断与最小落地要求                         | 是                 |
| `docs/design/platform-governance/user-management-design.md`             | Active   | 用户管理详细设计，已补第一阶段最小落地要求、接口建议与补齐顺序                                 | 是                 |
| `docs/design/platform-governance/profile-self-service-design.md`        | Review   | 个人中心自助编辑资料设计，负责冻结当前用户自助编辑边界、route、DTO、审计与前端交互             | 是                 |
| `docs/design/platform-governance/role-permission-design.md`             | Active   | 角色与权限详细设计，已补正式缺口、最小落地要求与接口建议                                       | 是                 |
| `docs/design/platform-governance/org-unit-design.md`                    | Active   | 组织单元详细设计，已补真实组织树能力、接口建议与补齐顺序                                       | 是                 |
| `docs/design/platform-governance/navigation-design.md`                  | Active   | 导航菜单详细设计，已补导航治理缺口与第一阶段补齐口径                                           | 是                 |
| `docs/design/platform-governance/navigation-route-mapping.md`           | Active   | 导航-路由对照表，已回写当前真实页面状态与补齐切片衔接                                          | 是                 |

### 4.5 当前控制与实施入口

| 文档                                                              | 当前状态 | 作用                                                                                    | 是否可作为下游输入 |
| ----------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------ |
| `docs/design/phase2-mainline-delivery-plan.md`                    | Active   | 第二阶段主线交付计划的当前精简入口，统一说明主线目标、当前阶段状态与当前实施入口        | 是                 |
| `docs/design/phase2-lx-t04-full-mainline-development-decision.md` | Active   | 第二阶段 `LX-T04` 统一开发判断的当前精简入口，负责给出 Go 结论、统一范围、顺序与约束    | 是                 |
| `docs/design/implementation-delivery-guide.md`                    | Active   | 实施启动与交付流程说明，统一实施入口、切片流程、DoD 与回写规则                          | 是                 |
| `docs/design/implementation-governance-gates.md`                  | Active   | 设计到实现治理闸口，统一冻结闸口、风险分层证据、例外授权链与过渡规则                    | 是                 |
| `docs/reference/implementation-baseline-package-template.md`      | Active   | 实施基线包模板，统一 `G1` 前冻结输入、范围、SSOT 与一致性证据                           | 是                 |
| `docs/reference/implementation-corrective-checkpoint-template.md` | Active   | 实施纠偏 checkpoint 模板，统一已开工后 drift 修复的 `G3` 阻断、修复范围与剩余阻断留痕   | 是                 |
| `docs/reference/implementation-governance-checks.md`              | Active   | 实施治理最小校验矩阵，统一 PR / local checkpoint 按切片类型提交的自动化 / 半自动化证据  | 是                 |
| `docs/reference/solo-worktree-governance.md`                      | Active   | 个人开发与本地工作树治理方式，统一无 PR 时的 checkpoint、commit message 与 tracker 留痕 | 是                 |
| `docs/design/phase2-development-execution-tracker.md`             | Active   | 第二阶段开发执行追踪板，负责当前任务拆解、状态跟踪与执行回写                            | 是                 |

### 4.6 已归档过程资产

| 文档                                                                                                            | 当前状态 | 作用                                                                    | 是否可作为下游输入 |
| --------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- | ------------------ |
| `docs/design/archive/README.md`                                                                                 | Active   | 归档入口，负责区分当前正式输入与历史过程资产                            | 否                 |
| `docs/design/archive/phase1-closure/README.md`                                                                  | Active   | 第一阶段收口归档入口，负责聚合第一阶段历史路线、验收与探活材料          | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-delivery-roadmap.md`                                            | Archived | 第一阶段交付路线图，保留阶段路线、切片规划与收口过程留痕                | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-gap-closure-plan.md`                                            | Archived | 第一阶段缺口补齐计划，保留补齐顺序、通过条件与回写要求                  | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-gap-closure-checklist.md`                                       | Archived | 第一阶段缺口补齐验收清单，保留硬门槛、验收证据与签收口径                | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-acceptance-gap-matrix.md`                                       | Archived | 第一阶段承诺-实现-验证缺口矩阵，保留阶段验收证据与缺口判断              | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-final-acceptance-snapshot.md`                                   | Archived | 第一阶段最终验收快照，保留最终探活命令、结果与通过结论                  | 否                 |
| `docs/design/archive/mainline-closure/phase2-mainline-task-tracker.md`                                          | Archived | 第二阶段主线任务收口记录，保留 `L1 ~ L5` 与 `LX-01 / LX-T04` 的完成轨迹 | 否                 |
| `docs/design/archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`                          | Archived | 第二阶段主线实现设计证明矩阵，保留主线完整实现路径与阻断判断的证明材料  | 否                 |
| `docs/design/archive/reviews/platform-governance-review-checklist.md`                                           | Archived | 平台治理域评审清单，保留历史评审门槛、阻塞项与通过标准                  | 否                 |
| `docs/design/archive/reviews/platform-governance-review-summary.md`                                             | Archived | 平台治理域评审结论摘要，保留历史评审结论、已关闭阻塞项与后续动作        | 否                 |
| `docs/design/archive/control-history/phase2-mainline-delivery-plan.md`                                          | Archived | 第二阶段主线交付计划长文版，保留治理论证、阶段分层与历史过程叙事        | 否                 |
| `docs/design/archive/control-history/phase2-lx-t04-full-mainline-development-decision.md`                       | Archived | 第二阶段 `LX-T04` 判断长文版，保留判断依据、过程上下文与历史口径替换    | 否                 |
| `docs/design/archive/reviews/phase2-review-checklist.md`                                                        | Archived | 第二阶段正式审阅清单，保留审阅范围、维度、问题记录与结论回写留痕        | 否                 |
| `docs/design/archive/reviews/phase2-review-comprehensive-assessment.md`                                         | Archived | 第二阶段正式审阅综合评估，保留四轮问题优先级判断与统一结论留痕          | 否                 |
| `docs/design/archive/reviews/phase2-review-follow-up-plan.md`                                                   | Archived | 第二阶段正式审阅 follow-up 清单，保留分批收口、专题拆分与完成轨迹       | 否                 |
| `docs/design/archive/reviews/design-convergence-review-checklist.md`                                            | Archived | 设计收口与评审前一致性清单，保留过程回溯                                | 否                 |
| `docs/design/archive/reviews/design-review-execution-checklist.md`                                              | Archived | 详细设计评审执行清单，保留过程回溯                                      | 否                 |
| `docs/design/archive/reviews/design-review-follow-up-summary.md`                                                | Archived | 首轮正式评审后的 follow-up 归并，保留过程回溯                           | 否                 |
| `docs/design/archive/reviews/phase2-review-record-round1.md` ~ `archive/reviews/phase2-review-record-round4.md` | Archived | 第二阶段四轮正式审阅留痕                                                | 否                 |
| `docs/design/archive/reviews/phase2-lx-t04-implementation-scheduling-decision.md`                               | Archived | 已撤销的首批受控实现排期判断，保留历史留痕                              | 否                 |
| `docs/design/archive/phase2-batches/phase2-first-batch-*.md`                                                    | Archived | 第一批范围说明与实现映射桥接文档，结论已被当前控制文档与总设计吸收      | 否                 |
| `docs/design/archive/phase2-batches/phase2-second-batch-*.md`                                                   | Archived | 第二批范围说明与实现映射桥接文档，结论已被当前控制文档与总设计吸收      | 否                 |
| `docs/design/archive/phase2-batches/phase2-third-batch-*.md`                                                    | Archived | 第三批范围说明与实现映射桥接文档，结论已被当前控制文档与总设计吸收      | 否                 |

### 4.7 ADR 清单

| ADR                                            | 当前状态          | 结论摘要                                                                                |
| ---------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `ADR-001` 平台权限模型与授权边界               | 已接受 (Accepted) | 第一版以平台级 RBAC 为主，后端为授权单一可信源                                          |
| `ADR-002` 组织单元建模与授权关系               | 已接受 (Accepted) | 第一版组织单元采用树结构，授权仍以平台级 RBAC 为主                                      |
| `ADR-003` 导航菜单单一可信源策略               | 已接受 (Accepted) | 后端导航为单一可信源，前端忠实渲染                                                      |
| `ADR-004` 合同资金域后端模块边界               | 已接受 (Accepted) | 后端一期独立拆出 `contract-finance` 模块                                                |
| `ADR-005` 一期审批流实现策略                   | 已接受 (Accepted) | 模块内审批流 + 统一待办聚合                                                             |
| `ADR-006` 第一阶段主对象正式命名为 Project     | 已接受 (Accepted) | 主对象统一命名为 `Project`                                                              |
| `ADR-007` 第一期财务联动与业务登记边界         | 已接受 (Accepted) | 一期只做业务登记与确认，不做强财务联动                                                  |
| `ADR-008` 当前用户资料输出契约                 | 已接受 (Accepted) | 当前用户资料保留 `orgUnits[]`，并采用专用关系化轻量类型表达组织归属                     |
| `ADR-009` 平台导航父组可见性规则               | 已接受 (Accepted) | `group` 类型父组默认由可见子项派生可见性，平台父组不再要求独立导航权限                  |
| `ADR-010` 平台用户管理路由桥接状态             | 已接受 (Accepted) | `platform.users` 在真实页面承载未就位前维持 `planned`，不提前记为 `bridged`             |
| `ADR-011` 招投标与 Project 生命周期的建模关系  | 已接受 (Accepted) | 采用 `Project` 主生命周期 + `BidProcess` 第一类受控子流程的分层建模口径                 |
| `ADR-012` 数据持久层技术选型                   | 已接受 (Accepted) | 第一阶段采用 `PostgreSQL + SQL-first migration + MikroORM` 作为持久层路线               |
| `ADR-013` 平台治理域物理 Schema 边界           | 已接受 (Accepted) | 第一阶段平台治理域继续使用 `poms` schema，不单独拆出 `core` schema                      |
| `ADR-014` 设计-执行状态模型与治理闸口          | 已接受 (Accepted) | 统一文档状态、任务状态与 gate 状态三层模型，并以正式迁移替代长期映射                    |
| `ADR-015` API 路由 canonical grammar           | 已接受 (Accepted) | 已固定 `resource-first + colon-action`、稳定名词型子资源与“默认直接切换”原则            |
| `ADR-016` union request body schema-first 建模 | 已接受 (Accepted) | union body 正式采用 schema-first + `oneOf/discriminator`，不再长期保留大对象 workaround |

---

## 5. 各业务域进度

| 业务域     | 需求边界   | HLD 边界   | 关键决策                             | 详细设计 | 当前判断                                                                                                                                              |
| ---------- | ---------- | ---------- | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 平台治理域 | 已基本明确 | 已基本明确 | ADR-001、ADR-002、ADR-003 已固定     | Review   | 总文档与四个子设计已进入 Review，阻塞项已由 ADR-008/009/010 收口，`OrgUnit` 的 `EX-01` 与 `Role / Permission` 的 `EX-02` 已完成并通过 API / Admin E2E |
| 销售流程域 | 已基本明确 | 已基本明确 | `Project` 主对象命名、ADR-011 已固定 | Draft    | 生命周期主链路已稳定，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认                                                                         |
| 合同资金域 | 已基本明确 | 已基本明确 | ADR-004、ADR-007 已固定              | Draft    | 对象边界与生效口径已稳定，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认                                                                     |
| 提成治理域 | 已基本明确 | 已基本明确 | ADR-005、ADR-006、ADR-007 已固定     | Draft    | 计算、发放、异常调整基线已形成，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认                                                               |
| 横切支撑域 | 已基本明确 | 已基本明确 | 审批、审计、附件、通知方向已稳定     | Draft    | 已有统一审批与待办基线，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认                                                                       |

---

## 6. 已完成的关键收敛

截至当前，以下高影响问题已被明确收敛：

- 需求说明是上位依据，HLD 和后续详细设计据此展开
- 第一阶段主对象正式命名为 `Project`
- 招投标按 `Project` 主生命周期 + `BidProcess` 第一类受控子流程建模
- 合同资金域后端第一阶段独立拆为 `contract-finance`
- 第一期审批采用“模块内审批流 + 统一待办聚合”
- 第一期提成发放只做业务发放记录，不与真实财务付款动作强联动
- 第一期应付/付款只做基础台账
- 第一期发票只做台账与状态管理
- 第一期回款采用系统内录入并经财务确认生效，同时预留后续外部同步能力
- HLD 已补充关键数据可信源和版本化约束
- 审批 / 确认 / 复核口径已统一为 `放行方式`
- 规则对象命名已统一为 `CommissionRuleVersion`
- 业务授权矩阵已补字段敏感度、组织范围和关闭 / 作废 / 冲销类动作基线
- 设计收口清单中的剩余低风险项已关闭，详细设计当前结论已统一到正式评审前口径
- 已完成首轮正式评审执行，当前评审结论建议为 `Passed with follow-up`
- 已形成 `interface-command-design.md` 并补齐平台治理域命令集合与提成治理域补齐切片映射
- 已形成 `interface-openapi-dto-design.md` 并补齐平台治理域 DTO 边界与提成治理域补齐切片映射
- 已形成 `query-view-boundary-design.md` 并补齐平台治理域管理查询视图与提成治理域读侧闭环要求
- 已形成 `data-model-prerequisites.md` 并补齐平台治理域主数据 / 关系对象与提成治理域补齐前提
- 已形成 `table-structure-freeze-design.md` 并补齐平台治理域与提成治理域逻辑表冻结输入
- 已形成 `schema-ddl-design.md` 并补齐平台治理域与提成治理域核心表 DDL 输入，开始直接服务缺口补齐实现
- 已通过 `ADR-012` 固化第一阶段数据库产品、migration 路线与 `MikroORM` 应用层持久化方案
- 已完成提成治理域 `decimal` / 状态字段实体建模纠偏，并重新打通 OpenAPI 导出、共享 API Client 生成与前端平台管理页构建
- 已完成 `EX-10 ~ EX-12` corrective close-out：`ruleVersionId` 显式绑定、current single-effective DB 约束、`supplement` compensating payout 与 `clawback` source payout result-chain 已正式收口
- 已完成 `L4/L5` 经营快照、信号评价与 `L4 -> L5 gate` 绑定切片 `EX-13`：`EX-13A` 已建立数据成熟度 / 经营信号 / gate review 五张表与基础实体，`EX-13B1` 已补齐 `CommissionGateReviewRecord` 摘要快照锚点，`EX-13D1` 已回写上游 phase-2 动作语义与阶段 gate 边界；随后 `EX-13B` 已在 `project-cost` 落地 `reviewOperatingSignalEvaluation`、`reviewCommissionGateBinding` 与 `L4` 六个正式 query，补齐 shared contract、OpenAPI、generated client、service spec 与 seeded `poms-api-e2e`，并通过 `nx test poms-api --runInBand`、`nx run shared-api-client:check`、`nx run poms-api-e2e:e2e --runInBand --testPathPattern=operating-signal-workflow.e2e-spec.ts`（managed harness 实际跑全量 11 suites / 65 tests）、`nx lint poms-api`、`nx build poms-api` 与 `git diff --check`；当前 `EX-13` 已完成，可作为 `EX-14` 的稳定输入
- 已完成 `EX-14` 最终结算 / 质保金结算 / 规则解释主线全链收口：`EX-14B1` 已收口两条 project-scoped query，`EX-14B2` 已收口 final 非质保写侧，`EX-14B3A ~ EX-14B3C` 已完成 retention stage contract foundation、departure-exception command 与 retention / rule explanation 写侧闭环，`EX-14C` 已补齐基于 `DatabaseSeeder` 固定夹具的 final / retention HTTP E2E；随后 2026-04-19 corrective 子片 `EX-14D` 继续关闭此前保留的 `EX-14C-E1 / EX-14B3C-E1`，正式为“质保期届满 / retention due”补上 `Contract.retentionDueDate -> ContractTermSnapshot.retentionDueDate` 的事实链，并让 retention submit / approve / register 与 `CommissionFinalSettlementView` 统一沿 current `freezeVersion.effectiveHandoverBaselineSnapshotId` 消费该 due fact。当前 shared contract、OpenAPI、generated client、migration、DatabaseSeeder、unit / E2E 与治理文档已同步回写，并通过 `nx test poms-api --runInBand`（33 suites / 387 tests）、`nx lint poms-api`、`nx build poms-api`、`nx run poms-api:openapi`、`nx run shared-api-client:generate`、`nx run shared-api-client:check`、`nx run poms-api:migration-check`、`nx run poms-api:seeder-run`、`nx run poms-api-e2e:e2e --runInBand --testPathPatterns=commission-workflow.e2e-spec.ts` 与 `git diff --check`；`EX-14` 现已恢复为正式 `Done`。
- `FE-06` 浏览器级 close-out 已完成：`project-workspace.smoke.spec.ts` 与 `project-workspace.journey.spec.ts` 已在 `EX-14C` backend 修复后重跑通过（`6 passed`），原 `FE-06-E2E-BLOCKED-BY-POMS-API` 已关闭，最终结算 / 规则解释读取页可从 tracker 转入完成态。
- 已形成 `implementation-delivery-guide.md`，开始把“能实施”进一步收敛为“如何按统一切片流程交付”
- 已形成 `.github/pull_request_template.md`、`docs/reference/implementation-baseline-package-template.md`、`docs/reference/implementation-corrective-checkpoint-template.md`、`docs/reference/implementation-governance-checks.md` 与 `docs/reference/solo-worktree-governance.md`，把新切片 `G1` 输入冻结、已开工后纠偏 checkpoint、PR / local checkpoint 风险分层证据和最小校验矩阵落成可复用入口
- 已完成第五轮目录治理：第一阶段收口与验收包已统一转入 `archive/phase1-closure/`，平台治理域评审清单与评审摘要已统一转入 `archive/reviews/`，当前正式输入进一步收敛到第二阶段主线控制与实施入口
- 已形成 `archive/reviews/phase2-review-comprehensive-assessment.md`，把第二阶段四轮正式审阅的 22 个问题收敛为多维度评估、依赖链与实施批次判断；第二轮目录治理后已转入归档，当前正式结论以主线控制文档与 `LX-T04` 判断为准
- 已形成 `archive/reviews/phase2-review-follow-up-plan.md` 与 `archive/phase2-batches/phase2-first-batch-scope.md`，开始把第二阶段 `P0 / P1` 问题转为正式 follow-up 专题与第一批范围说明；其中正式审阅 follow-up 清单已在第二轮目录治理后转入归档
- 已完成设计目录第一轮归档治理：已建立 `docs/design/archive/`，并把分轮审阅记录、旧的首批排期判断、第一批 / 第二批 / 第三批范围与桥接文档移出根目录，降低当前正式输入噪声
- 已完成设计目录第三轮归档治理：已建立 `docs/design/archive/mainline-closure/`，并把 `phase2-mainline-task-tracker.md` 转为主线收口历史轨迹文档，根目录当前输入不再把已完成任务跟踪视作默认入口
- 已完成设计目录第四轮归档治理：已把 `phase2-mainline-implementation-design-matrix.md` 转为主线证明历史材料，根目录当前输入不再把主线完整性证明文档视作默认入口
- 已完成设计目录第六轮归档治理：已建立 `docs/design/archive/control-history/`，并把两份 phase2 当前控制文档的长篇论证版本转入归档；根目录同名文档当前只保留正式入口、正式结论与当前执行口径
- 已形成 `phase2-development-execution-tracker.md`，开始把第二阶段统一开发范围进一步拆成可分配、可追踪、可回写的执行层任务板
- 已完成平台治理域 `OrgUnit` 首个执行切片 `EX-01`：补齐 migration / 索引约束、树查询 / 详情 / 启停 / 移动 API、管理端最小闭环，并通过 API / Admin E2E 验证
- 已完成平台治理域 `Role / Permission` 执行切片 `EX-02`：回看既有 migration / DDL，补齐权限字典、角色列表 / 详情 / 启停 / 绑定接口、系统角色最小权限基线、停用角色后的授权收敛与管理端闭环，并通过 API / Admin E2E 验证
- 已完成 `L1/L2` 起点执行切片 `EX-05`：落地 `ContractReadinessPackage / CommercialReleaseBaseline`、差异复核、签约就绪初始化命令与合同激活 guard，并通过 `poms-api` build、API 单测与 44 条 API E2E 验证
- `L1/L2` 执行期成本归集切片 `EX-06`：已按 `ex-06-corrective-checkpoint.md` 收口第一批偏差修复 checkpoint（成本率版本链、共享契约 date / source ID / 替代链、LABOR 金额与期间校验），并把这类“已开工后发现 drift”的记录从 `baseline` 正式迁移为 corrective checkpoint；随后已按 `ex-06-payment-fact-and-read-side-baseline.md` 完成 `EX-06B1`，落地 `PAYMENT_FACT <- PaymentRecord` 映射命令、finance-scoped 项目实际成本 list/detail、来源映射唯一约束，并通过 `poms-api` test/build、OpenAPI / generated client、`migration-check` 与 `poms-api-e2e`；又按 `ex-06-invoice-fact-prerequisite-baseline.md` 完成 `EX-06B2A`，正式落地 `InvoiceRecord` 主对象、最小命令 / 查询链、共享契约、OpenAPI、generated client、migration 与 `poms-api-e2e` 闭环；再按 `ex-06-invoice-cost-mapping-baseline.md` 完成 `EX-06B2`，已落地 `InvoiceRecord -> INVOICE` 映射命令、当前有效唯一约束与统一成本详情来源回看，并通过 `poms-api` test/build/openapi/migration-check 与 `poms-api-e2e`；再按 `ex-06-expense-fact-prerequisite-baseline.md` 完成 `EX-06B3A`，正式落地 `ExpenseRecord` 主对象、最小命令 / 查询链、状态机、共享契约、OpenAPI、generated client、migration、`migration-check` 与 `poms-api-e2e` 闭环，并显式固定“默认不把费用事实继续塞进 `contract-finance`，而优先视为执行成本域对象”的最佳实践边界；随后已按 `ex-06-expense-cost-mapping-baseline.md` 完成 `EX-06B3`，正式落地 `ExpenseRecord -> EXPENSE` 映射命令、`EXPENSE_RECORD` 当前有效唯一约束、统一成本 list/detail 对费用来源的回看摘要，并通过 `poms-api` test/build/openapi、generated client、`migration-check` 与 `poms-api-e2e`；又按 `ex-06-procurement-fact-prerequisite-baseline.md` 完成 `EX-06B4A`，正式落地 `PayableRecord` 主对象、`payment_record.payable_record_id` 来源链、最小命令 / 查询链、共享契约、OpenAPI、generated client、migration、`migration-check` 与 `poms-api-e2e`；再按 `ex-06-procurement-cost-mapping-baseline.md` 完成 `EX-06B4`，已落地 `registerProcurementCostRecord`、`PAYABLE_RECORD` 当前有效唯一约束、统一成本 detail 对 `PayableRecord` 的来源回看，以及 `PROCUREMENT / PAYMENT_FACT / INVOICE` “可并存但默认不自动重复纳入”的最小链路口径，并通过 `poms-api` test/build/openapi、generated client、`migration-check` 与 `poms-api-e2e`；最后按 `ex-06d-payable-payment-tax-semantics-baseline.md` 完成 `EX-06D`，以方案 C 直接删除 `registeredAmount / paymentAmount / paidAmount` 历史字段，重建 procurement/payment 的显式未税 / 税额 / 含税金额模型，完成统一成本金额语义纠偏、OpenAPI / generated client 回写、真实数据库迁移与 `poms-api-e2e` 验证。当前 `EX-06` 已完成，`EX-07` 可在该冻结口径上继续推进累计、分摊、税务吸收与阶段视图。
- `L1/L2` 经营快照与重述链切片 `EX-07`：`EX-07A` 已建立分摊、税务影响、项目经营快照、期末冻结快照与经营基线包的基础持久化模型；`EX-07B` 已按 `ex-07b-operating-restatement-rebaseline-baseline.md` 完成经营基线包激活、项目经营快照、期末冻结快照、经营重述 append-only 替代链、最小查询接口、OpenAPI / generated client、migration-check、API 单测与 `poms-api-e2e`；`EX-07C` 已按 `ex-07c-allocation-tax-stage-query-baseline.md` 完成共享成本分摊依据 / 结果确认与替代、成本阶段归属确认 / 重分类、项目税务处理快照替代链、剩余 query / guard、OpenAPI / generated client、API 单测、`migration-check` 与 `poms-api-e2e`。2026-04-16 基于事实审阅发现的审后 drift 已通过 `ex-07-ex-08-review-corrective-checkpoint.md` 完成 close-out：`EX-07D1 ~ EX-07D3` 已补齐 `handover_rebaseline` 引用校验、共享契约约束、事务性聚合提交、税务 active 唯一约束与 duplicate guard，并通过 `test/build/migration-check/e2e/diff-check`；历史 `G4 = Pass 2026-04-14` 继续保留为历史留痕。
- `L3` 第一切片 `EX-08`：已完成 `EX-08A0` 实施准备、`EX-08A1` 核心 DDL、`EX-08A2` 摘要快照最小承接、`EX-08A3` 多方确认最小承接、`EX-08B1` 合同承接摘要 query、`EX-08B2` 移交详情 query、`EX-08B3A` 移交确认 command / guard、`EX-08B3B0` 合同变更最小持久化前置、`EX-08B3B1` 再基线化命令 / 项目级最近记录链、`EX-08B3C` 物理快照 / 回款冻结来源收口、`EX-08C1` OpenAPI / shared client 回写、`EX-08C2` 自动化测试补齐与 `EX-08C3` 文档 / 执行板最终回写；新增 `project_handover`、`contract_handover_rebaseline_record`、`handover_baseline_impact_item`、`approval_summary_package_definition`、`approval_summary_snapshot`、`approval_summary_field_projection`、`confirmation_record`、`confirmation_participant`、`contract_amendment`、`contract_term_snapshot` 与 `project_receipt_judgment_freeze` 的 migration / entity / service 承接，并新增 `contract_handover_rebaseline_record.project_id` 项目归属索引、`POST /contract-handover-rebaselines`、`ProjectHandoverApi` generated client 与共享 `ContractHandoverSummaryView` / `ProjectHandoverDetailView` / `ConfirmProjectHandoverRequest` / `ConfirmProjectHandoverResult` / `RebaselineContractHandoverRequest` / `RebaselineContractHandoverResult` 契约；`EX-08C2` 已补 `ProjectHandoverController` 单测与 seeded HTTP E2E，覆盖摘要缺失、主路径确认、并发版本错误、参与人缺失与再基线化处理中阻断。2026-04-16 审后 corrective slice 已完成 close-out：`EX-08D1` 已补齐项目级 effective 再基线 DB 唯一约束、命令 supersede 顺序与解释链，`EX-09A` 现可依赖 single-effective 语义继续推进；随后 `EX-15C` 已将当前 public route 收口为 `GET /projects/{projectId}/contract-handover`、`GET /projects/{projectId}/project-handover`、`GET /project-handovers/{id}` 与 `POST /project-handovers/{id}:confirm`，并完成 OpenAPI / generated client / build / test / e2e 回写。
- `L3` 第二切片 `EX-09`：`EX-09A` 已按 `ex-09a-commission-freeze-version-baseline.md` 完成冻结版本主表升级，把现有 `commission_role_assignment` 从第一阶段简化版本提升为 `L3` 冻结版本主表，补齐 `source_handover_id`、`source_handover_rebaseline_record_id`、`contract_summary_snapshot_id`、`handover_summary_snapshot_id`、`effective_handover_baseline_snapshot_id` 五个联合追溯引用字段及对应 FK / 索引，并通过 `poms-api` test/build、`migration-check` 与 `poms-api-e2e`。`EX-09B` / `EX-09C` 已于 2026-04-16 完成：新增 `ex-09b-commission-freeze-command-query-baseline.md`、`CommissionRoleAssignmentController`、联合追溯 guard、OpenAPI 与 shared generated client 回写，并通过 `poms-api` test/build、`migration-check`、`poms-api-e2e` 与 `git diff --check`；`EX-15D` 已进一步完成 `POST /commission-role-assignments/{id}:freeze` 与 `GET /commission-role-assignments/{id}` 的 canonical 收口、commission E2E fixture 迁移和旧 project-scoped freeze alias 清退。`EX-09D` 随后于 2026-04-16 完成两步收口：先冻结 `ex-09d-commission-freeze-dispute-change-baseline.md`，将旧 `CommissionRoleChangeRequest` direct-request 规划归类为 `design-change-required`，正式基线改为 `CommissionFreezeDisputeRecord -> CommissionFreezeChangeRequest` 的 dispute-first 链；同日再完成编码落地，新增争议 / 受控变更两张表、controller / service / repository、shared contract、OpenAPI、shared generated client 与定向 EX-09D e2e，并将 `CommissionRoleAssignmentDetailView.allowedActions` 收口为 `submit-commission-freeze-dispute`。同日随后已完成本地治理收口：通过追加 comment migration 清理 `migration-check` comment drift、把 `poms-api-e2e` 改为 managed server harness 并恢复全量 10 suites / 59 tests 通过、将 `shared-api-client:check` 切到临时目录比对并恢复完整 generated client，因此 `EX-09` 已完成。
- API route canonical governance：`ADR-015` 已于 2026-04-16 接受，正式固定 `resource-first + colon-action`、稳定名词型子资源与“默认直接切换”原则；`api-route-canonical-inventory.md` 已建立 authoritative inventory，并在执行板新增 `EX-15` 作为跨文档 / 实现整改锚点。当前 `EX-15A`、`EX-15B`、`EX-15C`、`EX-15D` 已完成：`EX-09` freeze route 的 canonical 切换与 legacy alias 清退已完成，`CommissionRoleChangeRequest` 资源化冲突也已通过 `EX-09D` G1 基线与编码落地收口。`EX-15E` 已进一步拆为可执行子片；其中 `EX-15E1` 已于 2026-04-16 完成 `approval + contract-readiness` 首轮 canonical 收口，`EX-15E2A` 也已于同日完成 `project-cost` 第一组资源创建类与明确 item-action route 收口：`ProjectCostController` 已切到 `POST /internal-cost-rate-versions`、`POST /operating-baseline-packages`、`GET /projects/{projectId}/operating-baseline-package`、`POST /project-operating-snapshots`、`POST /period-closing-snapshots`、`POST /operating-restatements` 与 `POST /expense-records/{id}:confirm|void`，并同步回写实施基线、inventory、OpenAPI、shared generated client 与 HTTP E2E；`EX-15E2B` 随后也已于 2026-04-16 完成 `ProjectActualCostRecord` 注册 / 替代链 canonical 收口：五个 register 命令统一切到 `POST /projects/{projectId}/actual-cost-records`，`replaceLaborCostRecord` 切到 `POST /project-actual-cost-records/{id}:replace`，并同步完成 shared contract、controller、OpenAPI、shared generated client、unit test、HTTP E2E 与 inventory / tracker 回写；`EX-15E2C` 已于 2026-04-17 完成 allocation / stage / tax 六个 capability 的 canonical 收口：`confirmSharedCostAllocationBasis` 切到 `POST /shared-cost-allocation-bases`，`confirmCostStageAttribution` 切到 `POST /project-actual-cost-records/{id}/stage-attributions`，`confirmAccountingTaxTreatment` 切到 `POST /projects/{projectId}/accounting-tax-treatments`，并新增独立 `POST /accounting-tax-treatments/{id}:replace`；对应 shared contract、controller、OpenAPI、shared generated client、unit test、HTTP E2E、inventory、baseline、tracker 与 progress 已同步回写，`poms-api` test/build、`poms-api:openapi`、`shared-api-client:generate`、`shared-api-client:check`、`poms-admin` build 与 `git diff --check` 均通过。`EX-15E3` 也已于 2026-04-17 完成 phase1 `commission` canonical route 收口：`CommissionController` 已切到 `GET/POST /commission-rule-versions`、`GET /projects/{projectId}/commission-role-assignment`、`POST /projects/{projectId}/commission-role-assignments`、`GET/POST /projects/{projectId}/commission-calculations`、`POST /commission-calculations/{id}:approve|recalculate`、`GET/POST /projects/{projectId}/commission-payouts`、`POST /commission-payouts/{id}:submitApproval|approve|registerPayout`、`GET/POST /projects/{projectId}/commission-adjustments` 与 `POST /commission-adjustments/{id}:submitApproval|execute`，并同步完成 `commission-settlement-design.md`、inventory、baseline、OpenAPI、shared generated client、admin consumer、unit test、HTTP E2E 回写。`EX-15E4` 已于 2026-04-17 完成 `platform / contract / contract-finance / project / runtime-audit` 余项 direct cutover：`PlatformController` 剩余 activate / deactivate / replace routes 已切到 canonical grammar，`ContractController` 已切到 `GET /contracts/{id}/approval-record`、`PATCH /contracts/{id}` 与 `POST /contracts/{id}:submitReview|activate`，`ProjectController` 已切到 `PATCH /projects/{id}`，`ContractFinanceController` 已全面清退 `contract-finance` public namespace 并收口为 `GET/POST /contracts/{contractId}/receipt-records`、`GET/POST /projects/{projectId}/payable-records|invoice-records|payment-records`、`GET /payable-records/{id}`、`GET /invoice-records/{id}`、`POST /receipt-records/{id}:confirm`、`POST /payment-records/{id}:confirm`、`POST /payable-records/{id}:close|void`、`POST /invoice-records/{id}:markException|resolveException|close`，`RuntimeAuditController` 已切到 `POST /security-events:recordRouteDenied`；对应 OpenAPI、shared generated client、admin consumer、HTTP E2E、inventory、baseline、tracker、`org-unit-design.md` 与 progress 已同步回写。至此 `EX-15A` ~ `EX-15F` 全部完成，验证结果：`poms-api` test/build、`poms-api:openapi`、`shared-api-client:generate`、`shared-api-client:check`、`poms-admin` build、`poms-api-e2e` 与 `git diff --check` 通过。
- `EX-15G / EX-15H` 后续治理补点也已继续推进到 `EX-14`：`EX-13` 八条 route surface 当前已从 inventory 的 `planned` 回写为已实现事实态；同时 `EX-14G1` 已新增 `docs/design/ex-14g1-ex14-route-governance-baseline.md`，冻结 `GET /projects/{projectId}/commission-final-settlement` 与 `GET /projects/{projectId}/commission-rule-explanation` 两条 canonical route。随后 `EX-14B1` 已沿该基线把两条 route 从 inventory 的 `planned` 回写为 `aligned` 实现态，并同步完成 shared contract、controller / service、OpenAPI 与 generated client；`CommissionStageGateView` 仍保持未分配 future surface，不在当前 executable slice 中猜测 route。
- `EX-14A` 已完成 `EX-14` 的 persistence 基线：新增 `docs/design/ex-14a-final-settlement-and-rule-explanation-model-baseline.md`，同步回写 `data-model-prerequisites.md`、`table-structure-freeze-design.md` 与 `schema-ddl-design.md`，把此前悬空的 `departureExceptionDecisionId` 正式收敛为 `CommissionDepartureExceptionDecision`，并在 `commission` 模块落地 `CommissionFinalSettlementSnapshot` / `CommissionRuleExplanationSnapshot` 两张 project-scoped current snapshot；对应 migration、entity、repository 与 module 注册已通过 `nx lint poms-api`、`nx build poms-api`、`nx run poms-api:migration-up`、`nx run poms-api:migration-check` 与 `git diff --check`。
- `EX-14B1` 已完成 `EX-14` 的 query-only 首个执行子片：新增 `docs/design/ex-14b1-final-settlement-and-rule-explanation-query-baseline.md`，在 `commission` 模块落地 `GET /projects/{projectId}/commission-final-settlement` 与 `GET /projects/{projectId}/commission-rule-explanation` 两条 project-scoped query，补齐 `CommissionFinalSettlementView` / `CommissionRuleExplanationView` shared contract、`api-contracts` DTO、OpenAPI、shared generated client 与 `commission` controller / service 单测；当前 `CommissionRuleExplanationView` 已按 `CommissionRuleExplanationSnapshot -> CommissionFinalSettlementSnapshot -> CommissionRoleAssignment` 读链装配共同依据包，验证结果：`nx test poms-api --runInBand`、`nx lint poms-api`、`nx build poms-api`、`nx run poms-api:openapi`、`nx run shared-api-client:generate`、`nx run shared-api-client:check` 与 `git diff --check`。
- `EX-14B2` 已完成 `EX-14` 的 final 非质保写侧收口：新增 `docs/design/ex-14b2-final-settlement-write-side-baseline.md`，在不改 public DTO / route 的前提下，把 `stage=final` 的 payout submit / approve / register 从 phase-1 最小状态推进提升为消费正式 `L4 -> L5` 输入链的实现。当前 `ApprovalService` 已在 submit 与 approve path 强制校验 current frozen assignment、active final gate binding / gate review，并对 `BLOCK` 结论直接阻断；approve path 会生成 / supersede current `CommissionFinalSettlementSnapshot`，register path 会继续 supersede current snapshot、推进 `nonRetentionSettlementStatus` 与 `finalSettlementStatus`，并补齐 actor 审计字段。为满足治理规范，本片额外完成 `copilot-skill-review.cmd --model claude-sonnet-4.6 --context-mode repo-read` review gate，并把 review 指出的 register-path audit trail 与 final gate 缺失分支测试在同轮关闭。验证结果：`nx test poms-api --runInBand`（32 suites / 370 tests）、`nx lint poms-api`、`nx build poms-api` 与 `git diff --check`。
- `EX-14B3A` 已完成 `EX-14B3` 的 contract foundation 首片：新增 `docs/design/ex-14b3a-retention-stage-contract-baseline.md`，并先按 route inventory 清点把 `EX-14B3` 拆成 `EX-14B3A / EX-14B3B / EX-14B3C`，明确 `CommissionDepartureExceptionDecision` 仍无已冻结 public route，不得与 retention contract 混片推进。当前 `CommissionPayoutStage` 已扩展为 `first / second / final / retention`，并同步回写 `shared-contracts`、`CommissionPayout` entity、OpenAPI、generated client 与 `poms-admin` 阶段标签映射；同时后端对 `stage=retention` 的 create / submit / approve / register 全链路显式阻断，避免在到账事实、离职 / 特例结论与 rule explanation 写侧未补齐前生成错误金额口径或半完成审批链。验证结果：`nx test poms-api --runInBand`、`nx lint poms-api`、`nx build poms-api`、`nx run poms-api:openapi`、`nx run shared-api-client:generate`、`nx run shared-api-client:check`、`nx lint poms-admin`、`nx build poms-admin` 与 `git diff --check`。
- `EX-14B3B` 已完成 `EX-14B3` 的离职 / 特例 command 收口：新增 `docs/design/ex-14b3b-departure-exception-command-baseline.md`，把 `CommissionDepartureExceptionDecision` 从 persistence-only 对象提升为正式 public command / current-version 输入链。当前 authoritative inventory 已补录 `POST /projects/{projectId}/commission-departure-exception-decisions`，`interface-command-design.md` 与 `interface-openapi-dto-design.md` 也已冻结该命令的 route / DTO 语义；runtime 同步新增 controller、`CommissionService.createDepartureExceptionDecision`、同项目 current unique implicit supersede 规则，以及 shared contract、OpenAPI、generated client 与 controller/service 单测。该命令现在强制校验同项目 current frozen assignment 与绑定 active summary snapshot，一切 `summaryPackageKey / projectionLevel / exportPolicy` 都从 `ApprovalSummarySnapshot` 服务端固化，不接受客户端重复提交。
- 2026-04-18 已补齐 Phase 2 前端工作区执行治理入口：新增 `FE-00 ~ FE-05` 六个前端执行切片与对应 `G1` 基线包，正式固定“`B5 ~ B30` 属于已评审设计输入，但每个前端实现切片仍需单独冻结可编码输入”的口径；第一批前端实现范围也已明确收敛为项目级工作区壳层、`L4` 读取页、`L5` 阶段闸口解释页、admin data-access/store 与 E2E / 权限验证，不再继续以零散后端任务的附属页面方式推进。
- 2026-04-18 已完成前端工作区首批实现切片 `FE-01 ~ FE-05` 的 `G4` close-out：本地 commit `737bded` 已形成交付载体，项目级工作区壳层、`L4` 经营总览 / 偏差风险、`L5` 阶段闸口解释页、`ProjectWorkspaceStore` 与工作区 smoke + journey E2E 已全部固化；同时通过将 `AppLayout` / `AuthLayout` 改为 route-level lazy component，把 `poms-admin` production initial bundle 从 `1.02 MB` 收口到 `919.73 kB`，关闭例外 `FE-BUNDLE-20260418`。
- 2026-04-18 已开启第二批前端切片治理冻结：新增 `FE-06` 与 `docs/design/fe-06-final-settlement-rule-explanation-frontend-baseline.md`，把 `L5` 最终结算 / 统一规则解释前端读取页正式收敛为下一可执行切片。当前已按事实冻结前端内部候选路由 `/projects/:id/commission/final-settlement`、`/projects/:id/commission/rule-explanation`，并明确页面只读消费 `EX-14B1` 既有 query 与 generated client、沿用 `FE-04` data-access 模式；同时也把当前权限边界锁定为后端已实现的 `project:read + commission:payouts:manage`，不再口头假设 finance 读取能力即可访问。
- 2026-04-18 已完成 `FE-06` 的前端实现主干：项目工作区首页、项目工作区壳层、提成工作区壳层、`ProjectWorkspaceStore`、`/projects/:id/commission/final-settlement`、`/projects/:id/commission/rule-explanation` 与对应 unit / Playwright 断言均已落地；其中 `git diff --check`、`nx lint poms-admin`、`nx lint admin-data-access`、`nx test poms-admin --runInBand`、`nx build poms-admin` 全部通过，且没有新增 bundle warning。
- 2026-04-21 已基于项目管理前端审阅结论新增 `FE-16` corrective checkpoint，并把后续整改拆为 `FE-16A ~ FE-16D`：当前 `/projects`、`/projects/:id` 与工作区首页不再被视为稳定产品体验，后续整改必须同时满足“用户画像驱动交互”“先讲当前结论 / 阻断原因 / 下一步 / 责任归口”“用户可见内容只说业务中文”三条硬约束；若整改触达 `ProjectListView / ProjectDetailView` 正式 query、contract 或 route surface，必须先补对应后端治理切片，不接受前端本地兜底。
- 2026-04-21 已完成 `FE-16A` 的 quick `G1` refresh 并判定 `Pass`：基于 `EX-17` 当前输出，项目列表与创建体验已具备正式输入，`GET /projects` 的 `ProjectListView[]`、收口后的 `CreateProjectRequest` / `UpdateProjectBasicInfoRequest` 与 generated client 可直接进入前端实现；同时明确职责边界为“列表负责定位与继续处理入口，不在列表本地生成‘下一步动作 / 阻断原因’摘要”，连续工作引导留给 `FE-16C`，路由 / 按钮守卫收口留给 `FE-16D`。
- 2026-04-21 已完成 `FE-16A` 实现：项目列表入口已按 `ProjectListView` 重做，展示客户、负责人、归属组织、阶段、状态和真实关键节点时间，支持项目 / 客户 / 负责人搜索及阶段 / 状态筛选；新建项目只提交项目编号、项目名称和客户名称，并按 `project:write` 做本地创建入口显隐。新增 `project-list.spec.ts` 覆盖正式列表事实展示、创建请求字段收口和只读账号创建入口隐藏；`poms-admin` lint/build/test 均通过。
- 2026-04-21 已完成 `FE-16B` 的 `G1 Readiness` 核查并判定 `Block`：当前 `GET /projects/:id` 仍返回 `ProjectSummary`，shared contract 与 generated client 均不存在正式 `ProjectDetailView`，不能支撑详情页的阶段摘要、当前合同 / 审批 / 确认摘要、摘要快照和对象级 `allowedActions`。执行板已派生 `EX-18`，先补项目详情视图与对象动作边界，再回到 `FE-16B` 前端实现。
- 2026-04-21 已完成 `EX-18`：`GET /projects/{id}` 已从 `ProjectSummary` 收口为正式 `ProjectDetailView`，后端 query 输出 owner / org、阶段摘要、当前合同摘要、项目级审批摘要快照元数据、确认摘要占位和 `allowedActions`，shared contract / API DTO / OpenAPI / generated client / route inventory 均已回写；`currentApprovalSummary/currentConfirmationSummary` 已改为非 null 摘要对象，避免 generated client 丢失 nullable `$ref` 语义；`FE-16B` 阻塞解除，可重新执行 G1 refresh 后进入详情页前端实现。低风险例外：当前仍无正式 `BidProcess` query，详情只返回空投标摘要，不伪造投标事实。
- 2026-04-21 已完成 `FE-16B` 的 `G1 refresh` 并判定 `Pass`：新增 `docs/design/fe-16b-project-detail-business-actions-frontend-baseline.md` 作为当前实施基线，原 `fe-16b-project-detail-business-actions-readiness-baseline.md` 保留为历史 Block 证据；本片现在可进入前端实现。实现必须把详情态收口到 `ProjectDetailView`，用 `allowedActions` 控制详情页动作入口，并在项目基本信息更新后重新加载详情，避免 `PATCH /projects/{id}` 的 `ProjectSummary` 响应降级详情态；投标摘要继续继承 `FE16B-E1-BID-SUMMARY` 空态限制，路由 guard 与浏览器权限矩阵仍归属 `FE-16D`。
- 2026-04-21 已完成 `FE-16B` 实现：`ProjectStore.selectedProject` 已收口为 `ProjectDetailView`，项目基本信息保存后会重新加载详情；`/projects/:id` 已重做为业务详情页，展示负责人、归属组织、阶段、阻断原因、合同情况、审批依据、确认情况和投标空态，并按 `allowedActions` 控制“项目工作区 / 提成操作 / 编辑基本信息”显隐。新增详情页和 store 单测覆盖内部 key 不外露、动作守卫、客户名称清空与更新后重拉详情；`poms-admin` lint/build/test 与 `admin-data-access` lint 均通过。`FE-16D` 仍负责后续浏览器级路由 guard、菜单入口、直接 URL 与权限矩阵验证。
- 2026-04-21 已完成 `FE-16C` 的 `G1 Readiness` 核查并判定 `Block`：当前 `ProjectDetailView` 只足够支撑项目详情主体事实和动作按钮，不足以支撑工作区首页承诺的“下一步做什么 / 谁来做 / 还缺什么”；现有壳层仍通过 `projectWorkspaceGuide(stage/status)` 本地拼当前步骤、下一步、缺口和责任归口，首页仍展示“已落地入口 / 本轮边界 / 暂不覆盖”等实现说明。执行板已派生 `EX-19`，先补项目工作区连续工作引导事实源，再回到 `FE-16C` 前端实现。
- 2026-04-21 已完成 `EX-19`：新增 `GET /projects/{projectId}/workspace-guidance` 与 `ProjectWorkspaceGuidanceView`，后端输出项目工作区首页可直接消费的阶段 / 状态中文标签、当前重点、当前缺口、下一步、责任归口、依据快照、推荐入口和禁用原因；OpenAPI / generated client 已同步，`admin-data-access` 已导出新 view 类型。签约前和移交工作区仍显式返回“尚未接入正式事实源”的禁用原因，不伪造 L1 / L3 事实。`FE-16C` blocker 已解除，下一步应刷新 G1 并改造工作区壳层 / 首页消费该 query。
- 2026-04-21 已完成 `FE-16C` 的 `G1 refresh` 并判定 `Pass`：新增 `docs/design/fe-16c-project-workspace-home-guidance-frontend-baseline.md` 作为当前实施基线，原 readiness baseline 保留为历史 Block 证据。本片现在可进入前端实现：`ProjectWorkspaceStore` 需要新增 guidance 状态与 `loadGuidance(projectId)`，工作区壳层和首页必须消费 `ProjectWorkspaceGuidanceView`，不再用 `projectWorkspaceGuide(stage/status)` 本地拼下一步、当前缺口、责任归口或入口可用性；用户可见内容只能显示业务中文和后端禁用原因。
- 2026-04-21 已完成 `FE-16C` 实现：`ProjectWorkspaceStore` 已新增 guidance 读取状态并通过 generated client 消费 `ProjectWorkspaceGuidanceView`；`/projects/:id/workspace` 壳层和首页已改为展示后端给出的阶段 / 状态中文、当前重点、当前缺口、下一步、责任归口、依据状态与推荐入口，不再用 `projectWorkspaceGuide(stage/status)` 或 `AuthStore.permissions` 本地拼入口可用性；首页已清理“已落地入口 / 本轮边界 / 暂不覆盖 / generated client”等实现说明，禁用入口只展示后端原因且不可点击。新增 store、shell、home 单测覆盖 guidance 读取、404 中文错误、entry route / enabled 投影和旧文案清理；`poms-admin` test/lint/build、`admin-data-access` lint 与 `git diff --check` 均通过。`FE-16D` 仍负责菜单入口、直接 URL、route guard 和浏览器权限矩阵验证。
- 2026-04-22 已完成 `FE-16D` 的 `G1` 并进入实现：新增 `docs/design/fe-16d-project-route-guard-browser-validation-baseline.md`，本片只收口项目列表 / 详情直达路由的 `project:read` 守卫、拒绝访问页业务中文、当前项目入口 E2E 与 viewer/admin/anonymous 浏览器权限矩阵；明确 `nav:*` 只控制菜单可见性，不能替代业务 route guard。
- 2026-04-22 已完成 `FE-16D` 实现与 `G4` 收口：`/projects`、`/projects/:id` 已补 `project:read` all-mode route guard，拒绝访问页已改为“无权访问 / 返回工作台”的中文表达，提成壳层可见标题和权限提示已做轻量业务中文收口；新增 `app.routes.spec.ts`、`access.spec.ts`，并更新工作区 / 平台治理 Playwright 到当前列表按钮、后端 guidance 禁用原因和中文拒绝访问页。验证通过 `nx test poms-admin --runInBand`、`nx lint poms-admin`、`nx build poms-admin`、`nx e2e poms-admin-e2e`（15 passed）；`ProjectCommissionShell` 旧 helper / 本地权限推导仍作为后续独立纠偏留白。
- 2026-04-22 已完成 `FE-17` 的 `G1 / G3 / G4` 收口：新增 `docs/design/fe-17-project-management-primeng-table-baseline.md` 与 `docs/design/fe-17-project-management-primeng-table-g3-g4-closeout.md`，统一关闭 8 条 PrimeNG / UIKit table demo 审查发现。项目列表已迁入 `p-table` caption、PrimeNG Select、clear / global / column filter；项目与提成壳层共用 `WorkspaceNav`；工作区动作入口和页面级 loading 迁移到 shared PrimeNG wrapper；提成计算 / 发放 / 调整三表补齐 paginator、rowHover、scroll/min-width、caption 搜索、loadingbody / emptymessage，并把发放 / 调整行操作改为 `p-menu`。验证通过 `git diff --check`、`nx lint poms-admin`、`nx build poms-admin`（无新 bundle warning）、`nx test poms-admin --runInBand`（11 suites / 35 tests）与项目工作区 Playwright smoke / journey（7 passed）。
- 2026-04-23 已完成 `FE-18` 的 `G1 / G3 / G4` 收口：新增 `docs/design/fe-18-project-context-workspace-component-baseline.md` 与 `docs/design/fe-18-project-context-workspace-component-g3-g4-closeout.md`，把项目详情和项目工作区壳层从各自手写标题 / 状态 / 动作 / 工作提示改为共享 `ProjectContextHeader`、`ProjectLifecycleTimeline`、`WorkspaceCommandPanel` 与 `WorkspaceFeedback`。本片按 Poseidon / PrimeNG 模式优先采用 `p-toolbar`、`p-timeline`、`p-message`、`p-button`、`p-tag`，不改 API、权限、DTO、generated client 或路由。验证通过 `git diff --check`、`nx lint poms-admin`、`nx build poms-admin`（initial total `931.90 kB`，无新 bundle warning）、`nx test poms-admin --runInBand`（11 suites / 35 tests）、`poms-api:seeder-run` 与项目工作区 smoke / journey Playwright（7 passed）。
- 2026-04-23 已完成 `FE-19` 的 `G1 / G3 / G4` 收口：新增 `docs/design/fe-19-project-management-component-adoption-baseline.md` 与 `docs/design/fe-19-project-management-component-adoption-g3-g4-closeout.md`，把 `FE-18` 共享体验组件继续铺到提成工作区壳层和项目工作区首页。提成壳层已使用 `ProjectContextHeader`、`WorkspaceCommandPanel`、`WorkspaceFeedback`，工作区首页已使用 `WorkspaceCommandPanel` / `WorkspaceFeedback` 展示当前阶段、缺口、下一步、责任归口、当前依据与阻断事项；新增 `project-commission-shell.spec.ts`。本片不改 API、权限、DTO、generated client 或路由，保留 `FE19-E1-COMMISSION-GUIDANCE-SOURCE`：提成壳层仍使用本地 `projectWorkspaceGuide`，后续若要正式化需另开 query / governance 切片。验证通过 `git diff --check`、`nx lint poms-admin`、`nx build poms-admin`（initial total `931.61 kB`，无新 bundle warning）、`nx test poms-admin --runInBand`（12 suites / 38 tests）、`poms-api:seeder-run` 与项目工作区 smoke / journey Playwright（7 passed）。
- 2026-04-23 已完成 `FE-20` 的 `G1 / G3 / G4` 收口：新增 `docs/design/fe-20-l4-l5-read-page-fact-grid-baseline.md` 与 `docs/design/fe-20-l4-l5-read-page-fact-grid-g3-g4-closeout.md`，新增共享 `WorkspaceFactGrid`，支持 label / value / detail / icon / severity / emphasis，并用 PrimeNG `p-tag` 统一状态标签表达。经营总览、偏差风险、提成阶段解释、最终结算、规则解释五个 L4/L5 读取 / 解释型页面的核心事实块已迁移到共享事实栅格，错误反馈迁移到 `WorkspaceFeedback`。本片不改 API、权限、DTO、generated client、route surface 或 store 读取语义。验证通过 `git diff --check`、`nx lint poms-admin`、`nx build poms-admin`（initial total `931.61 kB`，无新 bundle warning）、`nx test poms-admin --runInBand`（12 suites / 38 tests）、`poms-api:seeder-run` 与项目工作区 smoke / journey Playwright（7 passed）。
- 2026-04-23 已完成 `FE-21` 的 `G1 / G3 / G4` 收口：新增 `docs/design/fe-21-project-lifecycle-timeline-responsive-baseline.md` 与 `docs/design/fe-21-project-lifecycle-timeline-responsive-g3-g4-closeout.md`，把 `ProjectLifecycleTimeline` 调整为桌面横向、窄屏纵向；横向阶段线改为组件自有 rail，确保 marker / 标题 / 描述 / tag 位于同一阶段单元中心列，窄屏保留 PrimeNG `p-timeline`。新增 `detail / completedAtLabel / tooltip` 可选展示字段，已完成节点支持 PrimeNG Tooltip / aria label 细节提示。本片不改 API、权限、DTO、generated client、route surface 或 store 读取语义，不伪造阶段完成时间。验证通过 `git diff --check`、`nx lint poms-admin`、`nx build poms-admin`（initial total `930.67 kB`，无新 bundle warning）与 `nx test poms-admin --runInBand`（13 suites / 42 tests）。
- 2026-04-23 已完成 `EX-21` 的 `ContractTermSnapshot` 核心条款可信源纠偏：新增 `docs/design/ex-21-contract-term-snapshot-core-terms-corrective-checkpoint.md`，把税率、金额包、首付款比例、质保金比例、付款条款与质保期从商业放行基线 / 签约就绪初始化链冻结到当前有效 `ContractTermSnapshot`；`GET /contract-term-snapshots/{id}` 已作为独立 canonical route 对齐 inventory，`GET /contracts/{id}` 已升级为 `ContractDetailView.currentTermSnapshot`，前端合同详情页可展示核心条款。普通合同 create/update 不再接受 `currentSnapshotId`，激活时核心条款缺失会阻断而不是生成空快照；generated client nullable、migration-check 和 OpenAPI 生成环境漂移已关闭。验证通过 `git diff --check`、`shared-api-client:check`、`poms-api:migration-check` 与 `poms-api` contract service 单测。
- 2026-04-23 已完成 `EX-22` 的 `ProjectTimelineView` 阶段里程碑事实源：新增 `docs/design/ex-22-project-timeline-view-baseline.md` 与 `docs/design/ex-22-project-timeline-view-g3-g4-closeout.md`，route inventory 对齐 `GET /projects/{projectId}/timeline`；后端按真实动作事实输出项目创建、最早合同签约、最新移交确认和项目关闭事件，新增 shared contract / API DTO / OpenAPI / generated client / `admin-data-access` 类型导出。本片不新增 DDL，不伪造验收、完成或归档时间；前端真实展示仍归属后续 `FE-22`。验证通过 `poms-api` project tests、API lint/build、OpenAPI 生成、shared-api-client generate/check、admin-data-access lint、poms-admin lint/build 与 `git diff --check`。
- 2026-04-23 已完成 `FE-22` 的项目生命周期真实里程碑前端接入：新增 `docs/design/fe-22-project-lifecycle-real-milestone-frontend-baseline.md` 与 `docs/design/fe-22-project-lifecycle-real-milestone-frontend-g3-g4-closeout.md`；`ProjectStore` 新增 timeline state 与 `loadProjectTimeline(projectId)`，项目详情页并行读取 `ProjectDetailView` / `ProjectTimelineView`，并把 authoritative events 投影到 `ProjectLifecycleTimeline` 的 `completedAtLabel/detail/tooltip`。timeline 读取失败时只显示非阻塞反馈，不影响详情主体。验证通过 `admin-data-access` lint、`poms-admin` lint/build/test 与 `git diff --check`；缺失阶段时间继续留给后续事实源切片，不在 UI 推断。
- 2026-04-24 已完成项目生命周期后续事实源与前端收口链：`EX-23` 新增 `AcceptanceRecord` create/list route，并把最新有效验收记录投影为 `acceptance` 阶段完成事件；`EX-24` 新增 `ProjectCompletionRecord` create/list route，并把真实完成记录投影为 `completed` 阶段完成事件；`FE-23` 补充 completed 节点前端验证；`EX-25` 新增 `ProjectArchiveRecord` create/list route，并冻结 archive 为 terminal-state attached milestone；`FE-24` 最终在项目详情页生命周期线下方新增独立 archive panel，只消费 authoritative archive milestone，不新增第九个 lifecycle node，并显式区分“尚未形成归档记录”和“归档事实暂时不可用”。至此 `FE22-E1-PARTIAL-STAGE-COVERAGE` 已由 `EX-23~25` / `FE-23~24` 全部关闭。
- 2026-04-24 已完成 `FE-08` 的 `G4` 收口：新增 `/projects/:id/commission/freeze-binding` 冻结与责任边界读取页，提成工作区 shell 新增统一入口，`ProjectWorkspaceStore` 已集中读取 current role assignment summary/detail 与 project handover detail；页面用共享 workspace UI 与 PrimeNG table 展示冻结状态、参与人权重、回款判断口径、收口链引用、下一步和对 `L5` 的影响。前端权限已对齐后端真实边界 `project:read + commission:assignments:manage`；focused unit tests、`poms-admin` lint/build、`admin-data-access` lint 与 `project-workspace.journey` Playwright 均通过。下一片建议进入 `FE-09` 的 `G1`，`FE-12` 仍按依赖等待 `FE-09~11` 稳定。
- 2026-04-24 已完成 `FE-09` 的 `G4` 收口：`/projects/:id/workspace/pre-signing` 已成为签约前总入口，能从项目详情 / 工作区首页真实进入，展示当前阶段、阻断原因、下一步、责任归口、签约前候选工作区与签约就绪承接包摘要；current readiness 404 被投影为业务 gap。`FE09-E2` 已关闭，`FE09-E1` / `FE09-E3` 继续作为 `FE-10` / `FE-11` 的详细工作区输入边界。
- 2026-04-25 已完成 `FE-09` 的 post-G4 例外关闭：`FE09-E1-DETAIL-WORKSPACES-DEFERRED` 已由 `FE-10` / `FE-11` 关闭，`FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE` 已由 `EX-26` / `EX-27` / `EX-28` 与 `FE-10` / `FE-11` 关闭；签约前技术与成本、招投标 / 商务竞标、报价与毛利评审已有正式事实源、读取页、真实入口链与 E2E 证据。tracker 中 `FE-09` 的例外列已清空。
- 2026-04-25 已冻结 `EX-29` 的 `G1` 基线：本片专门关闭 `EX18-E1-BID-SUMMARY`，范围限定为复用 `EX-27` 已落地的当前有效 `ProjectBidCommercialProcess`，让 `GET /projects/{id}` 的 `currentBidSummary` 不再固定返回 `not_configured`；不新增 route、DTO 字段、generated client、DDL 或完整投标工作区。
- 2026-04-25 `EX-29` 已完成本地 `G3`：`ProjectQueryService.getProjectDetail` 已读取当前有效 `ProjectBidCommercialProcess` 并投影到 `currentBidSummary`；项目详情页单测已覆盖真实投标摘要展示。聚焦 API/Admin 单测、API/Admin lint 与 `poms-admin` build 均通过；`EX18-E1-BID-SUMMARY` 可在 `EX-29 G4` 随提交证据关闭。
- 2026-04-25 已完成 `EX-29` 的 `G4` 收口：运行提交 `b9057e7 fix(project): 用当前投标事实源修正项目详情投标摘要` 已包含项目详情投标摘要 query 纠偏、API/Admin focused tests 和 `EX-29` G1/G3 证据。`EX18-E1-BID-SUMMARY` 已正式关闭，tracker 中 `EX-18` 的例外列已清空。
- 2026-04-25 已完成 `FE-20` 的 post-G4 例外关闭：`FE20-E1-OPERATION-PAGE-SCOPE` 由 `FE-17` 的运行证据关闭，提成操作页三张表已具备 PrimeNG table demo 基线、分页、row hover、滚动宽度、稳定空态 / 加载态、表格搜索与行操作 overflow menu。tracker 中 `FE-20` 的例外列已清空。
- 2026-04-25 已完成 `FE-18` 的 post-G4 例外关闭：`FE18-E1-PARTIAL-PAGE-COVERAGE` 由后续 `FE-19`、`FE-20`、`FE-08~12` 与 `FE-25` 的运行证据关闭；共享 workspace UI 已覆盖提成壳层、工作区首页、L4/L5 读取页、签约前详细工作区、冻结绑定和跨工作区入口链。tracker 中 `FE-18` 的例外列已清空。
- 2026-04-25 已完成 `FE-26` 的 `G4` 收口：项目列表、项目详情、项目工作区壳层与提成操作页剩余页面级 error / warn / not-found / 空事实反馈态已迁移到共享 `WorkspaceFeedback`；普通业务事实卡片、字段级 validation、PrimeNG Toast 和 table emptymessage/loadingbody 保持原职责。聚焦项目管理单测、`poms-admin` lint/build 均通过；`FE17-E1-FEEDBACK-COMPONENT-SCOPE` 已关闭。
- 2026-04-25 已基于当前代码事实把 `EX17-E2-LEAD-BOOTSTRAP` 拆成 `EX-30 ~ EX-32` 与 `FE-27 ~ FE-29` 六个待实施切片：先冻结 `Lead` route governance 与转项目语义，再落地 `Lead` 最小事实源、`Lead -> Project` 转化命令、线索前端入口、转化体验和最终浏览器验证 / G4 收口。当前代码仍无 `Lead` entity / contract / route / admin 页面，且 `POST /projects` 仍直接 bootstrap Project，因此不得跳过 `EX-30` 直接编码。
- 2026-04-25 已完成 `EX-30` 的 `G4` 收口：新增 `Lead` route governance G1 baseline 与 G3/G4 close-out，并在 `api-route-canonical-inventory.md` 中冻结 `POST/GET /leads`、`GET/PATCH /leads/{id}`、`POST /leads/{id}:qualify`、`POST /leads/{id}:close`、`POST /leads/{id}:convertToProject`；当前 `POST /projects` 已记录为 `convertLeadToProject` 的 implementation drift，后续由 `EX-31/32` 和 `FE-27~29` 关闭 `EX17-E2`。
- 2026-04-25 已完成 `EX-31` 的 local `G3`：新增 `Lead` 最小事实源、`poms.lead` migration / entity / repository / service / query service / controller、shared contract、API DTO、OpenAPI、generated `LeadApi` 和 `admin-data-access` 导出；状态机覆盖 `registered -> qualified / closed`，`convertedProjectId` 与 `convertedProjectSummary` 仅作为 `EX-32` 输入预留。验证通过 `poms-api` lint/build/full test、focused Lead tests、`shared-api-client:generate/check`、`admin-data-access` lint、`poms-admin` build、`migration-up` 与 `migration-check`；本片等待提交后进入 `G4`。
- 2026-04-25 已完成 `EX-31` 的 `G4` 收口：runtime commit `c415a4c` 已提交，G4 close-out 已归档；`Lead` 最小事实源、读写 API、OpenAPI / generated client 和 `admin-data-access` 导出成为 `EX-32` 与 `FE-27` 的正式输入。`EX31-E1-NO-CONVERT` 已关闭，`EX17-E2-LEAD-BOOTSTRAP` 继续等待 `EX-32` 和 `FE-27~29`。
- 2026-04-25 已将 `EX-32` 推入 `G1`：新增 `ex-32-lead-to-project-conversion-baseline.md`，冻结 `POST /leads/{id}:convertToProject`、`project.source_lead_id`、Lead 转化状态回写、Project 来源线索摘要和 legacy `POST /projects` 兼容策略。`EX32-E1-LEGACY-PROJECT-CREATE-ROUTE` 作为轻量例外记录，清理截止为 `FE-29` G4。
- 2026-04-25 已完成 `EX-32` 的 local `G3`：新增 `project.source_lead_id` migration / entity / contract，新增 `POST /leads/{id}:convertToProject`，转化时创建 Project 并回写 Lead converted 字段；Lead detail 可回显 converted project，Project detail 可回显 source lead。OpenAPI、generated client、focused backend tests、full API tests、focused Lead API E2E、focused API E2E lint、admin-data-access lint、poms-admin lint/build 与 focused store test 均通过；完整 API E2E 的合同激活失败、完整 API E2E lint 的既有 module-boundary / legacy warnings 均已归类为既有基线 drift，不作为本片 regression。
- 2026-04-25 已完成 `EX-32` 的 `G4` 收口：runtime commit `e705355` 已提交，G4 close-out 已归档；`Lead -> Project` 转化命令、Project 来源线索映射、Lead / Project 双向摘要、OpenAPI / generated client 与 focused API E2E 均成为 `FE-28` 的正式输入。`EX32-E1-LEGACY-PROJECT-CREATE-ROUTE` 与父级 `EX17-E2-LEAD-BOOTSTRAP` 继续等待 `FE-27~29` 关闭。
- 2026-04-25 已将 `FE-27` 推入 `G1`：新增 `fe-27-lead-entry-list-frontend-baseline.md`，冻结 `/leads` 线索列表 / 登记入口、`LeadStore`、PrimeNG table/form 体验、`lead:read/write` route/action 权限、dynamic navigation `nav:leads:view` 和项目管理页线索入口；本片不实现 `Lead -> Project` 转化，完整浏览器菜单 journey 继续归属 `FE-29`。
- 2026-04-25 已完成 `FE-27` 的 local `G3`：新增 `/leads` 路由、线索列表 / 登记 / 有效化 / 关闭页面、`LeadStore`、dynamic navigation `nav:leads:view`、项目管理页“登记线索”入口，并同步 OpenAPI / generated client permission enum。验证通过 `poms-admin` full tests、focused lead/route tests、`poms-admin` lint/build、`admin-data-access` lint、`poms-api` lint/build、navigation focused tests 与 `shared-api-client:check`；转项目动作仍按 `FE27-E1` 留给 `FE-28`，完整浏览器 journey 按 `FE27-E2` 留给 `FE-29`。
- 2026-04-25 已将 `FE-28` 推入 `G1`：新增 `fe-28-lead-to-project-frontend-baseline.md`，冻结有效线索转项目的前端边界，消费 `EX-32` 的 `POST /leads/{id}:convertToProject` generated client，不新增后端 API；本片需要在线索列表 / 详情提供转化动作、成功后跳转项目详情、项目列表正式入口转向线索链路，并保留 `POST /projects` legacy route 到 `FE-29` G4。
- 2026-04-25 已完成 `FE-28` 的 local `G3`：新增有效线索转项目弹窗、`LeadStore.convertLeadToProject`、转化成功后项目详情跳转、项目列表“从线索创建项目”正式入口和项目详情来源线索摘要；focused lead/project/detail tests、`poms-admin` full tests、`poms-admin` lint/build 与 `admin-data-access` lint 均通过。`FE27-E1-NO-CONVERT-ACTION` 已由本片关闭；`FE28-E1` 与 `FE28-E2` 继续留给 `FE-29` 浏览器验证和 G4 收口。
- 2026-04-25 已将 `FE-29` 推入 `G1`：新增 `fe-29-lead-bootstrap-browser-validation-baseline.md`，冻结 `EX17-E2` 最终浏览器验证矩阵，要求覆盖登录后菜单进入 `/leads`、项目列表按钮进入线索链路、UI 创建 / 有效化 / 转项目、项目详情来源线索摘要、viewer 拒绝和 anonymous returnUrl；本片不新增业务能力，目标是形成 `EX17-E2-LEAD-BOOTSTRAP` 的关闭证据。
- 2026-04-25 已完成 `FE-29` 的 local `G3`：新增 `lead-bootstrap.journey.spec.ts`，浏览器验证 admin 从菜单进入线索、从项目列表“从线索创建项目”进入线索链路、UI 登记 / 有效化 / 转项目、项目详情来源线索摘要，以及 viewer 拒绝和 anonymous returnUrl；`poms-admin-e2e:eslint:lint`、`poms-api:seeder-run` 与 focused Playwright `3 tests` 均通过。第一次未跑 seeder 的 focused attempt 暴露旧 DB 导航权限前置，已记录为 `FE29-D1-SEED-PREREQUISITE` 并由 seeder refresh + retry 关闭。
- 2026-04-25 已完成 `FE-27`、`FE-28`、`FE-29` 的 `G4` 收口：runtime commit `ff81c11` 已提交，三个 close-out 文档均已归档。`FE-27` 现在提供稳定线索入口和 store；`FE-28` 提供正式 Lead -> Project 前端转化体验；`FE-29` 提供浏览器证据，证明菜单入口、项目入口、UI 转化、项目详情来源线索、viewer 拒绝和 anonymous returnUrl 均成立。
- 2026-04-25 已关闭父级例外 `EX17-E2-LEAD-BOOTSTRAP`：新增 `ex-17-lead-bootstrap-exception-g4-closeout.md`，确认 `EX-30~32` + `FE-27~29` 已补齐 Lead 事实源、转项目命令、前端入口、转化体验和浏览器验证；`POST /projects` 后端 route 仍保留为 legacy/dev/test 兼容面，但不再是正式前端用户入口。
- 2026-04-25 已将 `EX-33` 推入 `G1`：新增 `ex-33-api-e2e-baseline-drift-closure-baseline.md`，专门关闭 `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS` 与 `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE`。本片范围限定为 `poms-api-e2e` 项目 tags / module-boundary 基线和合同 workflow fixture，不改 public API、runtime 业务行为或前端页面。
- 2026-04-25 已完成 `EX-33` 的 local `G3`：`poms-api-e2e` 增加 `scope:api` / `type:app` tags，合同商业放行 fixture 补齐 `amountTaxInclusive`、`amountTaxExclusive`、`taxRate`、`downPaymentRate`、`retentionRate`、`paymentTerms`；full API E2E lint、focused contract workflow 与 full API E2E 均通过。`EX32-D1` / `EX32-D2` 可在本片提交后 G4 清空。
- 2026-04-25 已完成 `EX-33` 的 `G4` 收口：运行提交 `f33c98d` 已提交，G4 close-out 已归档；full API E2E lint、合同 workflow 与 full API E2E 均通过。`EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS` 与 `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE` 已关闭，`EX-32` 例外列已清空。
- 2026-04-25 已完成 archive 例外 / 阻塞复扫：`EX22`、`FE09`、`FE16C`、`EX25`、`EX26`、`FE27` 的精确 ID 关闭留痕已补齐；唯一仍需后续工程承接的是 `EX25-E3-ARCHIVE-REVERSAL-OUT-OF-SCOPE`，已新增 tracker 切片 `EX-34`，用于冻结项目归档记录撤销 / 替代版本链治理基线。
- 2026-04-25 已冻结 `EX-35` 业务编号系统生成治理基线：当前应系统生成的首批编号为 `Lead.leadNo`、`Project.projectNo`、POMS 内部 `Contract.contractNo` 与 `ProjectActualCostRecord.recordNo`；`leadCode` / `projectCode` 只作为当前实现命名，不作为最终目标命名保留。客户项目编号、招标编号和客户合同编号作为 optional 外部编号字段单独建模；`InvoiceRecord.invoiceNumber`、平台 / 权限 / 规则编码、`InternalCostRateVersion.rateKey` 与 `sourceRefNo` 不纳入系统流水号。当前系统处于开发期，后续实现不保留旧编号 DTO / UI 兼容层，建议拆为 `EX-35A` 后端 / 契约 / migration 与 `FE-30` 前端表单切片。
- 2026-04-24 已冻结 `FE-10` 的 `G1` 基线并确认原始前端片不能直接编码：仓内缺少技术确认、范围边界、风险 / 保留意见、前期成本清单、税务成本和成本估算版本的正式 query contract / generated client，因此新增前置后端切片 `EX-26`，禁止前端用静态文案、本地常量或执行期实际成本接口伪造签约前估算事实。
- 2026-04-24 `EX-26` 已完成 local `G3`：新增签约前技术与成本版本包事实源、`POST/GET /projects/{projectId}/technical-cost-packages` 与 `GET /projects/{projectId}/technical-cost-workspace`、shared contract / DTO / OpenAPI / generated client、migration、service/query 和 focused backend tests。迁移检查中发现的 child table column comment drift 已按 `new-real-drift` 记录并修复；本片暂不进 `G4`，等待与后续 `FE-10` 前端改动同批提交。
- 2026-04-24 `FE-10` 已完成 local `G3`：新增 `/projects/:id/workspace/technical-cost` 读取页、`ProjectWorkspaceStore.loadTechnicalCostWorkspace(projectId)`、签约前入口从占位切到真实 route，并覆盖页面、store、route、签约前入口与登录后真实入口链 E2E。验证通过 `poms-api` lint/build、`poms-admin` lint/build、`admin-data-access` lint、focused unit tests、`shared-api-client:check`、`migration-check` 与 `project-workspace.journey` 5 条 Playwright journey；本轮还修复了 `poms-api` build target 对 `webpack-cli 7.0.2` 的 `--config-node-env` 参数漂移。`FE-10` 暂不 G4，等待 `EX-26` + `FE-10` 同批提交后关闭。
- 2026-04-24 已冻结 `FE-11` 的 `G1` 基线并确认原始前端片不能直接编码：当前仓内只有 `ProjectDetailView.currentBidSummary` 的 `not_configured` 占位、`CommercialReleaseBaselineSummary` by-id 读取和 `ContractReadinessDetail` 末端承接包；缺少项目级 `bid-commercial` 与 `pricing-margin` 正式读取投影。因此新增前置切片 `EX-27`（签约前招投标 / 商务竞标事实源）与 `EX-28`（签约前报价与毛利评审事实源），`FE-11` 标记为 `Blocked / G1 04-24`，禁止前端用静态文案、技术成本事实或 readiness 反推竞标 / 报价结论。
- 2026-04-24 已冻结 `EX-27` 的 `G1` 基线：新增 planned canonical routes `POST/GET /projects/{projectId}/bid-commercial-processes` 与 `GET /projects/{projectId}/bid-commercial-workspace`，首版事实源命名为 `ProjectBidCommercialProcess`，明确覆盖竞标形态、阶段、决策、材料齐备度、结果、阻断项、责任归口和时间线摘要；不做投标文件库 / 附件上传，不混入报价 / 毛利评审，直接商务路径和不适用路径必须是显式事实而不是前端推断。
- 2026-04-24 `EX-27` 已完成 local `G3`：新增签约前招投标 / 商务竞标过程版本事实源、`POST/GET /projects/{projectId}/bid-commercial-processes` 与 `GET /projects/{projectId}/bid-commercial-workspace`、shared contract / DTO / OpenAPI / generated client、migration、service/query 和 focused backend tests。项目工作区 guidance 已新增 `bid-commercial-workspace` 入口；本片暂不进 `G4`，等待本批改动一起提交后关闭。`FE-11` 仍需 `EX-28` 报价与毛利评审事实源后才能解除阻塞。
- 2026-04-24 已冻结 `EX-28` 的 `G1` 基线：新增 planned canonical routes `POST/GET /projects/{projectId}/pricing-margin-reviews` 与 `GET /projects/{projectId}/pricing-margin-workspace`，首版事实源命名为 `ProjectPricingMarginReview`，明确覆盖报价、技术成本版本引用、竞标 / 直接商务路径、税务条件、回款条件、毛利判断、审批摘要引用、商业放行基线引用、签约就绪承接和阻断项；本片不生成商业放行基线本体、不实现审批引擎、不做前端页面。
- 2026-04-24 `EX-28` 已完成 local `G3`：新增签约前报价与毛利评审版本事实源、`POST/GET /projects/{projectId}/pricing-margin-reviews` 与 `GET /projects/{projectId}/pricing-margin-workspace`、shared contract / DTO / OpenAPI / generated client、migration、service/query 和 focused backend tests。迁移检查中发现的 `commercial_release_baseline_id` FK 名称截断 drift 已按 `new-real-drift` 修复；项目工作区 guidance 已新增 `pricing-margin-workspace` 入口。本片暂不进 `G4`，等待本批提交后关闭；`FE-11` 的报价 / 毛利正式输入已在本地具备，但仍需提交后解除阻塞。
- 2026-04-24 `FE-11` 已补充 same-batch `G1` 解锁记录：基于 `EX-27` / `EX-28` 本地 `G3` generated client 和项目级正式投影，进入招投标 / 商务竞标与报价 / 毛利评审读取型前端实现。范围限定为 route、store、入口链、解释页和 E2E；不新增写动作或 public API。`FE11-E1` / `FE11-E2` 由本地 `EX-27` / `EX-28` 输入解除，新增 `FE11-E3-SAME-BATCH-UPSTREAM-G3` 作为提交前例外，`G4` 等本批提交后统一关闭。
- 2026-04-24 `FE-11` 已完成 local `G3`：新增 `/projects/:id/workspace/bid-commercial` 与 `/projects/:id/workspace/pricing-margin` 两个读取页，`ProjectWorkspaceStore` 已接入 bid-commercial / pricing-margin workspace projection，签约前入口卡片已开放真实跳转，E2E 覆盖登录后从项目详情、工作区、签约前入口和 direct URL 进入。focused page/store/route tests、admin-data-access lint、poms-admin lint/build、shared-api-client check 与 `project-workspace.journey` E2E 均通过；`G4` 仍等待本批提交后关闭。
- 2026-04-25 已完成 `EX-27` / `EX-28` / `FE-11` 的 `G4` 收口：运行提交 `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力` 已包含招投标 / 商务竞标事实源、报价与毛利评审事实源、generated client、两个读取型前端页面、store、route、签约前入口链与 E2E。`EX27-E1` / `EX27-E2`、`EX28-D1-FK-NAME`、`FE11-E1` / `FE11-E2` / `FE11-E3-SAME-BATCH-UPSTREAM-G3` 均已关闭；`FE-12` 现在可以进入跨工作区入口链、权限、E2E 与体验收口的 `G1` 冻结。
- 2026-04-25 已补齐 `EX-26` / `FE-10` 的 `G4` 收口：同一运行提交 `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力` 已包含 technical-cost facts、generated client、`/projects/:id/workspace/technical-cost` 读取页、store、route、签约前入口链与 E2E。`EX26-D1-COMMENT-DRIFT` 已关闭，`EX26-E1` / `EX26-E2` 作为首版边界不再阻塞 G4；`FE10-D1-BUILD-ARG` / `FE10-D2-E2E-STRICTNESS` 已关闭。至此 `FE-12` 的 `FE-06~11` 依赖链在 tracker 上具备进入 `G1` 的条件。
- 2026-04-25 已冻结 `FE-12` 的 `G1` 基线：本片定位为 frontend-only / governance validation，不新增页面、后端 API、generated client 或 DDL；实施范围收敛到项目工作区与提成工作区的登录后真实入口链、viewer/admin/anonymous 权限矩阵、`L1/L3/L4/L5` 关键解释跳转和移动视口 smoke。`FE12-E1-G4-DOCS-SAME-BATCH` 记录为低风险同批提交例外，要求 `EX-26` / `FE-10` G4 close-out 与本基线先提交或同批提交后再进入 E2E 实现。
- 2026-04-25 `FE-12` 已完成 local `G3`：在 `project-workspace.journey.spec.ts` 增加 390x844 mobile viewport journey，登录后从项目详情“项目工作区”按钮进入工作区，并用真实 entry / action link 串起签约前主线、技术与成本、提成阶段解释和 L5 -> L4 经营总览；既有 smoke / journey 继续覆盖 desktop admin、viewer 受限访问和 anonymous returnUrl。验证通过 `poms-admin` lint/build、`poms-admin-e2e:eslint:lint` 与 `project-workspace.smoke + journey` Playwright 10 tests；本片暂不 G4，等待本批治理与 E2E 改动提交后关闭。
- 2026-04-25 已完成 `FE-12` 的 `G4` 收口：运行提交 `2d0082d test(governance): 增加 FE-12 跨工作区入口链的移动端 Journey 验证` 已包含 mobile viewport journey、`FE-12` baseline / G3 checkpoint、`EX-26` / `FE-10` G4 close-out 和 tracker/progress 回写。`FE12-E1-G4-DOCS-SAME-BATCH` 已关闭；前端工作区从 `FE-06~11` 到跨工作区 E2E / 权限 / 移动视口 smoke 的验证链可被后续体验收口工作依赖。
- 2026-04-25 已冻结 `FE-25` 的 `G1` 基线：本片专门关闭 `FE19-E1-COMMISSION-GUIDANCE-SOURCE`，范围限定为复用既有 `GET /projects/{projectId}/workspace-guidance`，在 `recommendedEntries` 中补齐 `commission-freeze-binding`，并让提成工作区壳层用 `ProjectWorkspaceGuidanceView` 渲染当前阶段、下一步、缺口、责任归口和提成 nav；不新增 API route、DTO 字段、generated client、DDL 或提成业务逻辑。
- 2026-04-25 `FE-25` 已完成本地 `G3`：提成工作区壳层已切换为后端 `ProjectWorkspaceGuidanceView` 事实源，后端 workspace guidance 已补齐 `commission-freeze-binding` entry；聚焦 API/Admin 单测、API/Admin lint、`poms-admin` build、workspace smoke/journey E2E 均通过。`poms-admin-e2e:lint` 当前没有 Nx target，记录为 not configured。`FE19-E1-COMMISSION-GUIDANCE-SOURCE` 可在 `FE-25 G4` 随提交证据关闭。
- 2026-04-25 已完成 `FE-25` 的 `G4` 收口：运行提交 `9f85604 feat(commission): 收敛提成壳层到 workspace guidance 事实源` 已包含提成壳层 guidance 消费、后端 `commission-freeze-binding` guidance entry、API/Admin focused tests、workspace smoke/journey E2E 修正和 `FE-25` G1/G3 证据。`FE19-E1-COMMISSION-GUIDANCE-SOURCE` 已正式关闭，tracker 中 `FE-19` 的例外列已清空。
- 2026-04-25 复核 `FE-06` 依赖状态：此前 `departure-exception` backend drift 已由后续 `EX-14C` / `FE-06` G3 checkpoint 关闭，`project-workspace` Playwright 已补跑通过，tracker 当前事实为 `Done / G4 04-19`。因此 `FE-12` 不再被 `FE-06` 阻断。
- Union request body schema-first governance：`ADR-016` 已于 2026-04-16 基于 `EX-15F / EX-15E2B` 真实 PoC 接受；`CreateProjectActualCostRecordRequest` 已从 workaround 切到 shared contract discriminated union、controller `ZodValidationPipe(schema)` 与 OpenAPI `title + oneOf + discriminator`，shared generated client 现产出同名 union type，无需再把正式业务 contract 压平成字段大并集 object。验证结果：`build` ✓ `test` ✓ `poms-api:openapi` ✓ `shared-api-client:generate` ✓ `shared-api-client:check` ✓ `poms-api-e2e` ✓ `git diff --check` ✓。
- **已完成第一阶段核心主干工程切片（项目、合同、审批、待办、平台壳层）的真实环境验证与前后端联调**

---

## 7. 当前未完成但已明确的输出物

当前已明确且仍需持续推进的输出物为：

1. 按 `phase2-lx-t04-full-mainline-development-decision.md` 固定的统一开发范围推进工程切片实施
2. 按 `phase2-mainline-delivery-plan.md` 与 `implementation-delivery-guide.md` 的要求，把实现结果持续回写到设计文档与进度板
3. 按 `phase2-development-execution-tracker.md` 维护当前任务状态、负责人、依赖与阻塞项
4. 将已显式后置的第四批未来扩展、表达增强与范围外主题继续维持为历史限制，不静默混入当前开发承诺
5. 若后续需要回溯第一阶段正式收口证据，统一回看 `archive/phase1-closure/README.md` 与同目录下的验收材料

---

## 8. 当前阻塞与风险

### 当前没有阻塞详细设计拆分的硬性未决策问题

但仍存在以下设计治理风险：

- 当前第二阶段主线已进入统一开发，但工程切片若偏离 `phase2-lx-t04-full-mainline-development-decision.md` 固定的统一范围，仍会重新引入范围漂移。
- 当前根目录控制文档已经瘦身，若后续把历史批次、历史长文和当前入口重新混写，文档层会再次退化为“当前口径与历史论证混放”。
- 业务权限矩阵与数据权限设计仍需在实现反馈中持续校准，避免字段级、敏感字段和组织范围约束在实现层静默漂移。
- 成本、应付、外部对账、多币种、分期移交等方向仍属于后置范围；若在实现中被顺手纳入，会直接破坏当前统一开发承诺。

---

## 9. 后续演进决策点

以下内容不阻塞当前第二阶段统一开发，但属于后续阶段需要重新决策的问题：

- `CommissionPayout` 是否需要在后续与真实财务付款、对账结果或银行流水强联动
- 应付与付款跟踪是否需要升级为完整审批闭环
- 发票管理是否需要升级为完整开票申请工作流
- 回款数据接入外部系统后，最终权威源是外部原始到账记录，还是 `POMS` 财务确认后的生效记录
- 是否引入完整工作流引擎
- 是否引入复杂数据范围权限

---

## 10. 下一步建议

如果按当前成熟度推进，下一步最合适的是：

1. 按 `phase2-lx-t04-full-mainline-development-decision.md` 固定的统一开发范围推进工程切片，不再回到历史批次文档中找当前指令。
2. 按 `phase2-mainline-delivery-plan.md`、`phase2-detailed-design-index-map.md` 与 `implementation-delivery-guide.md` 的分工进入实现，保持“控制入口、导航入口、实施入口”三层结构稳定。
3. 每个切片都按 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard -> tests -> docs writeback` 闭环推进，并把实现反馈回写到对应主线文档和本进度板。
4. 若需要回溯历史论证、批次收口和主线完成轨迹，统一进入 `archive/control-history/`、`archive/phase2-batches/` 与 `archive/mainline-closure/`，而不是重新把这些过程资产抬回根目录。

### 第二阶段受控待办

为避免后续讨论偏离，当前待办只固定三件事：

1. 当前统一工程顺序仍是：平台治理补齐切片 -> `L1 / L2` 可信源与快照基础切片 -> `L3` 收口链切片 -> 提成治理主机制切片 -> `L4 / L5` 联动链。
2. 当前历史回溯入口固定为：`archive/control-history/`、`archive/mainline-closure/`、`archive/phase2-batches/`。
3. 当前主线导航入口固定为：`phase2-mainline-delivery-plan.md`、`phase2-lx-t04-full-mainline-development-decision.md`、`phase2-detailed-design-index-map.md`、`implementation-delivery-guide.md` 与 `phase2-development-execution-tracker.md`。

---

## 11. 维护约定

- 每次新增或关闭一个高影响设计决策时，更新本文件
- 每次新增、归档或重分类设计文档时，更新“设计资产清单”和“各业务域进度”
- 每次某文档从 `Draft` 进入 `Review` 或 `Accepted` 时，更新状态
- 每次 `docs/design/README.md` 的分类或命名约定发生调整时，应回看本文件是否需要同步修正
- 若后续阶段推翻当前 ADR 结论，应新增后续 ADR，并同步更新本文件，而不是静默改写历史状态
