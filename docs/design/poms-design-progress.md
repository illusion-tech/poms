# POMS 设计进度跟踪

**文档状态**: Active
**最后更新**: 2026-04-04
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

| 文档                                                                      | 当前状态         | 作用                                                                                                         | 是否可作为下游输入 |
| ------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------ |
| `docs/design/poms-requirements-spec.md`                                   | Accepted         | 制度到系统能力映射、范围、状态机、权限矩阵、规则边界                                                         | 是                 |
| `docs/design/poms-hld.md`                                                 | Accepted         | 领域蓝图、模块边界、数据可信源、版本化约束                                                                   | 是                 |
| `docs/design/poms-design-progress.md`                                     | Active           | 当前设计进度跟踪与治理看板，负责维护整体成熟度与依赖关系                                                     | 是                 |
| `docs/design/phase2-user-task-map.md`                                     | Ready for Review | 第二阶段范围规划前置分析，负责沉淀用户画像、生命周期任务链与体验断点                                         | 是                 |
| `docs/design/phase2-experience-gap-priority-matrix.md`                    | Ready for Review | 第二阶段体验断点优先级矩阵，负责收敛 `P0/P1` 主断点与优化顺序                                                | 是                 |
| `docs/design/phase2-lifecycle-experience-blueprint.md`                    | Ready for Review | 第二阶段项目全生命周期体验蓝图，负责明确四条主体验主线、阶段承接点与连续工作方式                             | 是                 |
| `docs/design/phase2-experience-optimization-roadmap.md`                   | Active           | 第二阶段体验优化路线图，负责维护主体验主线、统一切片顺序与开发前后状态回写                                   | 是                 |
| `docs/design/phase2-presigning-workspace-information-architecture.md`     | Ready for Review | 第二阶段签约前统一工作区信息架构草案，负责细化 `L1-S1 ~ L1-S3` 的顶层入口、工作区结构与承接关系              | 是                 |
| `docs/design/phase2-presigning-project-overview-workspace.md`             | Ready for Review | 第二阶段签约前项目总览工作区草案，负责细化签约前驾驶舱的摘要、阻断、行动与协作结构                           | 是                 |
| `docs/design/phase2-presigning-technical-cost-workspace.md`               | Ready for Review | 第二阶段签约前技术与成本工作区草案，负责细化技术判断、范围快照、风险和前期成本估算结构                       | 是                 |
| `docs/design/phase2-presigning-bid-commercial-workspace.md`               | Ready for Review | 第二阶段签约前招投标与商务竞标工作区草案，负责细化多形态竞标的统一骨架、协作过程、版本与结果流转             | 是                 |
| `docs/design/phase2-presigning-pricing-margin-workspace.md`               | Ready for Review | 第二阶段签约前报价与毛利评审工作区草案，负责细化报价、成本、税务成本、回款条件与放行结论的统一判断           | 是                 |
| `docs/design/phase2-presigning-contract-readiness-workspace.md`           | Ready for Review | 第二阶段签约前签约就绪工作区草案，负责细化签约前置项检查、可复用事实与进入合同主链前的最终收口判断           | 是                 |
| `docs/design/phase2-presigning-workspace-handoff-map.md`                  | Ready for Review | 第二阶段签约前六工作区承接关系图，负责统一输入输出、阻断规则、直接商务路径与合同前收口口径                   | 是                 |
| `docs/design/phase2-presigning-workspace-templates.md`                    | Ready for Review | 第二阶段签约前主线模板类文档，负责统一前期成本清单、税务成本表达、风险分类、阻断项分类与关键结论摘要模板     | 是                 |
| `docs/design/phase2-execution-cost-workspace-information-architecture.md` | Ready for Review | 第二阶段执行期成本归集工作区信息架构草案，负责细化项目级成本归集总览、统一入口、状态语义与偏差提示结构       | 是                 |
| `docs/design/phase2-project-actual-cost-records.md`                       | Ready for Review | 第二阶段项目级实际成本记录草案，负责细化统一成本记录对象、成本类型、状态模型以及人力成本汇总归集口径         | 是                 |
| `docs/design/phase2-cost-source-to-project-record-mapping.md`             | Ready for Review | 第二阶段项目成本来源映射口径草案，负责明确采购合同、采购发票、费用与必要付款事实如何映射进统一项目成本记录层 | 是                 |
| `docs/design/phase2-actual-cost-accumulation-stage-view.md`               | Ready for Review | 第二阶段实际成本累计与阶段视图草案，负责细化三层累计口径、周/月与执行阶段视图、成本类型拆解与风险缺口解释    | 是                 |
| `docs/design/phase2-estimated-to-actual-cost-bridge.md`                   | Ready for Review | 第二阶段估算成本到实际成本承接口径草案，负责明确基线估算版本、估算项到实际成本类型映射与偏差解释规则         | 是                 |
| `docs/design/phase2-contract-to-handover-workspace.md`                    | Ready for Review | 第二阶段合同到移交承接工作区草案，负责细化合同生效后到正式移交前的承接状态、前置项、可复用事实与阻断规则     | 是                 |
| `docs/design/phase2-project-handover-gate-workspace.md`                   | Ready for Review | 第二阶段项目移交强节点草案，负责细化移交完成状态、多方确认、交接事实清单、执行责任边界与进入执行态的强 gate  | 是                 |
| `docs/design/phase2-commission-freeze-at-handover.md`                     | Ready for Review | 第二阶段提成角色与权重冻结绑定移交草案，负责细化冻结时点、版本语义、前置条件以及与移交完成 gate 的一致性要求 | 是                 |
| `docs/design/phase2-handover-closure-rules.md`                            | Ready for Review | 第二阶段移交收口口径草案，负责统一合同生效承接、项目移交强节点与提成冻结三层同时成立的最终收口规则           | 是                 |
| `docs/design/phase2-project-business-outcome-overview.md`                 | Ready for Review | 第二阶段项目经营结果总览草案，负责把合同、回款、成本、毛利和当前经营状态收成同一项目级经营入口               | 是                 |
| `docs/design/phase2-project-unified-accounting-view-caliber.md`           | Ready for Review | 第二阶段项目统一核算视图口径草案，负责固定收入、成本、毛利、毛利率、税务影响与状态分层的统一经营核算口径     | 是                 |
| `docs/design/phase2-project-variance-risk-explanation.md`                 | Ready for Review | 第二阶段项目偏差与风险解释草案，负责把经营偏差、风险类型、数据成熟度与下一步动作收成统一解释结构             | 是                 |
| `docs/design/phase2-business-accounting-feedback-rules.md`                | Ready for Review | 第二阶段经营核算反哺规则草案，负责固定经营结果如何反哺项目执行、提成判断、管理关注与项目复盘                 | 是                 |
| `docs/design/phase2-commission-stage-gate-overview-workspace.md`          | Ready for Review | 第二阶段提成阶段总览与 gate 解释草案，负责把提成阶段、门槛、阻断原因、经营依据和下一步动作收成统一工作区     | 是                 |
| `docs/design/phase2-commission-staged-payout-adjustment-paths.md`         | Ready for Review | 第二阶段提成分阶段发放与异常调整路径草案，负责把阶段发放、暂停、扣回、冲销、补发和重算串成连续操作链         | 是                 |
| `docs/design/phase2-commission-retention-final-settlement.md`             | Ready for Review | 第二阶段提成质保金与最终结算收口草案，负责区分非质保部分结清、质保金待结算与项目提成全部结清的最终路径       | 是                 |
| `docs/design/phase2-commission-rule-explanation-language.md`              | Ready for Review | 第二阶段提成规则可解释表达草案，负责统一阶段、gate、阻断、动作和特例的对用户表达规则                         | 是                 |
| `docs/design/phase2-detailed-design-index-map.md`                         | Active           | 第二阶段详细设计索引与主线地图，负责维护当前正式阅读路径、主线地图与归档入口                                 | 是                 |

### 4.3 业务域设计

| 文档                                               | 当前状态         | 作用                                                                                                             | 是否可作为下游输入 |
| -------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| `docs/design/project-lifecycle-design.md`          | Draft (Baseline) | 项目生命周期、状态机、阻断规则、阶段矩阵，已按 `BidProcess` 口径回写                                             | 是                 |
| `docs/design/contract-finance-design.md`           | Draft (Baseline) | 合同、回款、成本、发票的详细设计，已形成合同资金域对象与生效口径基线                                             | 是                 |
| `docs/design/commission-settlement-design.md`      | Active           | 提成计算、发放、异常调整与重算设计，已补第一阶段实现缺口、接口建议与切片映射                                     | 是                 |
| `docs/design/workflow-and-approval-design.md`      | Draft (Baseline) | 审批流、待办聚合、风控闸口设计，已形成统一审批模型与公共能力基线                                                 | 是                 |
| `docs/design/interface-command-design.md`          | Active           | 接口命令设计，已补平台治理域命令集合、提成治理域补齐切片映射，并回写第二阶段第一批、第二批命令补点               | 是                 |
| `docs/design/interface-openapi-dto-design.md`      | Active           | 接口 OpenAPI 与 DTO 边界设计，已补平台治理域 DTO 边界、提成治理域切片映射，并回写第二阶段第一批、第二批 DTO 补点 | 是                 |
| `docs/design/query-view-boundary-design.md`        | Active           | 查询视图边界设计，已补平台治理域管理查询视图、提成治理域读侧闭环要求，并回写第二阶段第一批、第二批查询补点       | 是                 |
| `docs/design/phase2-mainline-delivery-plan.md`     | Active           | 第二阶段主线交付计划的当前精简入口，统一说明主线目标、当前阶段状态、默认阅读路径与工程进入顺序                    | 是                 |
| `docs/design/data-model-prerequisites.md`          | Active           | 数据模型冻结前提，已补平台治理域主数据对象、关系对象与提成治理域补齐前提，并回写第二阶段第二批对象链             | 是                 |
| `docs/design/table-structure-freeze-design.md`     | Active           | 表结构冻结设计，已补平台治理域与提成治理域逻辑表、关系表与关键字段组，并回写第二阶段第二批逻辑表补点             | 是                 |
| `docs/design/schema-ddl-design.md`                 | Active           | Schema 与 DDL 细化设计，已补平台治理域与提成治理域核心表、约束与索引基线，并回写第二阶段第二批 DDL 补点          | 是                 |

### 4.4 治理与横切设计

| 文档                                                                    | 当前状态         | 作用                                                                                           | 是否可作为下游输入 |
| ----------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| `docs/design/business-authorization-matrix.md`                          | Active           | 业务对象动作授权矩阵，已补平台治理域动作矩阵并可直接指导第一阶段补齐实施                       | 是                 |
| `docs/design/phase2-data-permission-and-sensitive-visibility-design.md` | Ready for Review | 第二阶段业务数据权限与敏感信息可见性设计，负责补齐数据范围权限、敏感字段控制与提成敏感信息约束 | 是                 |
| `docs/design/platform-governance/README.md`                             | Active           | 平台治理域设计目录入口，负责聚合总设计、子设计与配套输出物                                     | 是                 |
| `docs/design/platform-governance/platform-governance-design.md`         | Active           | 平台治理域详细设计总入口，已补第一阶段正式承诺、缺口判断与最小落地要求                         | 是                 |
| `docs/design/platform-governance/user-management-design.md`             | Active           | 用户管理详细设计，已补第一阶段最小落地要求、接口建议与补齐顺序                                 | 是                 |
| `docs/design/platform-governance/role-permission-design.md`             | Active           | 角色与权限详细设计，已补正式缺口、最小落地要求与接口建议                                       | 是                 |
| `docs/design/platform-governance/org-unit-design.md`                    | Active           | 组织单元详细设计，已补真实组织树能力、接口建议与补齐顺序                                       | 是                 |
| `docs/design/platform-governance/navigation-design.md`                  | Active           | 导航菜单详细设计，已补导航治理缺口与第一阶段补齐口径                                           | 是                 |
| `docs/design/platform-governance/navigation-route-mapping.md`           | Active           | 导航-路由对照表，已回写当前真实页面状态与补齐切片衔接                                          | 是                 |

### 4.5 当前控制与实施入口

| 文档                                                                      | 当前状态 | 作用                                                                           | 是否可作为下游输入 |
| ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ | ------------------ |
| `docs/design/phase2-mainline-delivery-plan.md`                            | Active   | 第二阶段主线交付计划的当前精简入口，统一说明主线目标、当前阶段状态与当前实施入口 | 是                 |
| `docs/design/phase2-lx-t04-full-mainline-development-decision.md`         | Active   | 第二阶段 `LX-T04` 统一开发判断的当前精简入口，负责给出 Go 结论、统一范围、顺序与约束 | 是                 |
| `docs/design/implementation-delivery-guide.md`                            | Active   | 实施启动与交付流程说明，统一实施入口、切片流程、DoD 与回写规则                 | 是                 |
| `docs/design/phase2-development-execution-tracker.md`                     | Active   | 第二阶段开发执行追踪板，负责当前任务拆解、状态跟踪与执行回写                   | 是                 |

### 4.6 已归档过程资产

| 文档                                                                                                            | 当前状态 | 作用                                                                    | 是否可作为下游输入 |
| --------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- | ------------------ |
| `docs/design/archive/README.md`                                                                                 | Active   | 归档入口，负责区分当前正式输入与历史过程资产                            | 否                 |
| `docs/design/archive/phase1-closure/README.md`                                                                  | Active   | 第一阶段收口归档入口，负责聚合第一阶段历史路线、验收与探活材料          | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-delivery-roadmap.md`                                           | Archived | 第一阶段交付路线图，保留阶段路线、切片规划与收口过程留痕                | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-gap-closure-plan.md`                                           | Archived | 第一阶段缺口补齐计划，保留补齐顺序、通过条件与回写要求                  | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-gap-closure-checklist.md`                                      | Archived | 第一阶段缺口补齐验收清单，保留硬门槛、验收证据与签收口径                | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-acceptance-gap-matrix.md`                                      | Archived | 第一阶段承诺-实现-验证缺口矩阵，保留阶段验收证据与缺口判断              | 否                 |
| `docs/design/archive/phase1-closure/poms-phase1-final-acceptance-snapshot.md`                                  | Archived | 第一阶段最终验收快照，保留最终探活命令、结果与通过结论                  | 否                 |
| `docs/design/archive/mainline-closure/phase2-mainline-task-tracker.md`                                          | Archived | 第二阶段主线任务收口记录，保留 `L1 ~ L5` 与 `LX-01 / LX-T04` 的完成轨迹 | 否                 |
| `docs/design/archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`                          | Archived | 第二阶段主线实现设计证明矩阵，保留主线完整实现路径与阻断判断的证明材料  | 否                 |
| `docs/design/archive/reviews/platform-governance-review-checklist.md`                                           | Archived | 平台治理域评审清单，保留历史评审门槛、阻塞项与通过标准                  | 否                 |
| `docs/design/archive/reviews/platform-governance-review-summary.md`                                             | Archived | 平台治理域评审结论摘要，保留历史评审结论、已关闭阻塞项与后续动作        | 否                 |
| `docs/design/archive/control-history/phase2-mainline-delivery-plan.md`                                           | Archived | 第二阶段主线交付计划长文版，保留治理论证、阶段分层与历史过程叙事        | 否                 |
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

| ADR                                           | 当前状态          | 结论摘要                                                                    |
| --------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| `ADR-001` 平台权限模型与授权边界              | 已接受 (Accepted) | 第一版以平台级 RBAC 为主，后端为授权单一可信源                              |
| `ADR-002` 组织单元建模与授权关系              | 已接受 (Accepted) | 第一版组织单元采用树结构，授权仍以平台级 RBAC 为主                          |
| `ADR-003` 导航菜单单一可信源策略              | 已接受 (Accepted) | 后端导航为单一可信源，前端忠实渲染                                          |
| `ADR-004` 合同资金域后端模块边界              | 已接受 (Accepted) | 后端一期独立拆出 `contract-finance` 模块                                    |
| `ADR-005` 一期审批流实现策略                  | 已接受 (Accepted) | 模块内审批流 + 统一待办聚合                                                 |
| `ADR-006` 第一阶段主对象正式命名为 Project    | 已接受 (Accepted) | 主对象统一命名为 `Project`                                                  |
| `ADR-007` 第一期财务联动与业务登记边界        | 已接受 (Accepted) | 一期只做业务登记与确认，不做强财务联动                                      |
| `ADR-008` 当前用户资料输出契约                | 已接受 (Accepted) | 当前用户资料保留 `orgUnits[]`，并采用专用关系化轻量类型表达组织归属         |
| `ADR-009` 平台导航父组可见性规则              | 已接受 (Accepted) | `group` 类型父组默认由可见子项派生可见性，平台父组不再要求独立导航权限      |
| `ADR-010` 平台用户管理路由桥接状态            | 已接受 (Accepted) | `platform.users` 在真实页面承载未就位前维持 `planned`，不提前记为 `bridged` |
| `ADR-011` 招投标与 Project 生命周期的建模关系 | 已接受 (Accepted) | 采用 `Project` 主生命周期 + `BidProcess` 第一类受控子流程的分层建模口径     |
| `ADR-012` 数据持久层技术选型                  | 已接受 (Accepted) | 第一阶段采用 `PostgreSQL + SQL-first migration + MikroORM` 作为持久层路线   |
| `ADR-013` 平台治理域物理 Schema 边界          | 已接受 (Accepted) | 第一阶段平台治理域继续使用 `poms` schema，不单独拆出 `core` schema          |

---

## 5. 各业务域进度

| 业务域     | 需求边界   | HLD 边界   | 关键决策                             | 详细设计 | 当前判断                                                                                |
| ---------- | ---------- | ---------- | ------------------------------------ | -------- | --------------------------------------------------------------------------------------- |
| 平台治理域 | 已基本明确 | 已基本明确 | ADR-001、ADR-002、ADR-003 已固定     | Review   | 总文档与四个子设计已进入 Review，阻塞项已由 ADR-008/009/010 收口                        |
| 销售流程域 | 已基本明确 | 已基本明确 | `Project` 主对象命名、ADR-011 已固定 | Draft    | 生命周期主链路已稳定，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认           |
| 合同资金域 | 已基本明确 | 已基本明确 | ADR-004、ADR-007 已固定              | Draft    | 对象边界与生效口径已稳定，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认       |
| 提成治理域 | 已基本明确 | 已基本明确 | ADR-005、ADR-006、ADR-007 已固定     | Draft    | 计算、发放、异常调整基线已形成，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认 |
| 横切支撑域 | 已基本明确 | 已基本明确 | 审批、审计、附件、通知方向已稳定     | Draft    | 已有统一审批与待办基线，已补齐查询视图与表结构冻结首版边界，准备进入 DDL 前确认         |

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
- 已形成 `implementation-delivery-guide.md`，开始把“能实施”进一步收敛为“如何按统一切片流程交付”
- 已完成第五轮目录治理：第一阶段收口与验收包已统一转入 `archive/phase1-closure/`，平台治理域评审清单与评审摘要已统一转入 `archive/reviews/`，当前正式输入进一步收敛到第二阶段主线控制与实施入口
- 已形成 `archive/reviews/phase2-review-comprehensive-assessment.md`，把第二阶段四轮正式审阅的 22 个问题收敛为多维度评估、依赖链与实施批次判断；第二轮目录治理后已转入归档，当前正式结论以主线控制文档与 `LX-T04` 判断为准
- 已形成 `archive/reviews/phase2-review-follow-up-plan.md` 与 `archive/phase2-batches/phase2-first-batch-scope.md`，开始把第二阶段 `P0 / P1` 问题转为正式 follow-up 专题与第一批范围说明；其中正式审阅 follow-up 清单已在第二轮目录治理后转入归档
- 已完成设计目录第一轮归档治理：已建立 `docs/design/archive/`，并把分轮审阅记录、旧的首批排期判断、第一批 / 第二批 / 第三批范围与桥接文档移出根目录，降低当前正式输入噪声
- 已完成设计目录第三轮归档治理：已建立 `docs/design/archive/mainline-closure/`，并把 `phase2-mainline-task-tracker.md` 转为主线收口历史轨迹文档，根目录当前输入不再把已完成任务跟踪视作默认入口
- 已完成设计目录第四轮归档治理：已把 `phase2-mainline-implementation-design-matrix.md` 转为主线证明历史材料，根目录当前输入不再把主线完整性证明文档视作默认入口
- 已完成设计目录第六轮归档治理：已建立 `docs/design/archive/control-history/`，并把两份 phase2 当前控制文档的长篇论证版本转入归档；根目录同名文档当前只保留正式入口、正式结论与当前执行口径
- 已形成 `phase2-development-execution-tracker.md`，开始把第二阶段统一开发范围进一步拆成可分配、可追踪、可回写的执行层任务板
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

