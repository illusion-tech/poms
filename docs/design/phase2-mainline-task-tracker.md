# POMS 第二阶段主线剩余任务跟踪

**文档状态**: Active
**最后更新**: 2026-04-03
**适用范围**: `POMS` 第二阶段 `L1 ~ L5` 主线维度的剩余实现设计任务跟踪、完成标准与推进日志
**关联文档**:

- 主线控制:
  - `phase2-mainline-delivery-plan.md`
  - `phase2-mainline-implementation-design-matrix.md`
  - `poms-design-progress.md`
  - `phase2-lx-t04-full-mainline-development-decision.md`
- 实现设计总文档:
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `schema-ddl-design.md`

---

## 1. 文档目标

本文档只按 `L1 ~ L5` 主线维度跟踪“还剩什么没做”。

本文档不再按第一批 / 第二批 / 第三批组织任务，而是直接回答：

1. 每条主线当前范围内还剩哪些实现设计任务。
2. 每个任务应回写到哪些正式文档。
3. 每个任务何时可以视为完成。
4. 本轮实际推进了哪些主线任务。

---

## 2. 完成定义

只有同时满足以下条件，才可视为“`L1 ~ L5` 全主线在当前范围内完成实现设计”：

1. 每条主线都已从业务基线继续下钻到 `command / query / DTO / data model / table freeze / schema / DDL / guard` 的当前范围闭环。
2. 主线间承接关系已经完成跨文档一致性复核，不再出现各页各自重组事实或二次推断结论。
3. 剩余未做项只剩显式后置的范围限制，不再包含会改变主对象、可信源、主链路或关键权限边界的未决项。
4. 完成后可直接进入 `phase2-lx-t04-full-mainline-development-decision.md` 的统一开发判断。

---

## 3. 当前判断

- `L1 ~ L5` 的第一轮业务基线已经完成。
- 当前未完成的部分，不是“还要不要设计”，而是“各主线还没全部走完当前范围内的实现设计闭环”。
- 本清单从现在开始作为主线剩余任务的唯一跟踪入口；批次文档继续保留，但不再承担主线任务拆解职责。

---

## 4. 主线剩余任务清单

| ID      | 主线     | 剩余任务                                                                                                                              | 主要回写文档                                                                                      | 完成标准                                                                     | 当前状态 |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| `L1-01` | `L1`     | 把签约前六工作区到 `ContractReadinessPackage / CommercialReleaseBaseline` 的承接链补齐到 `data model / table freeze / schema / guard` | `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`         | `L1` 不再只停留在 `command / query / DTO`，签约就绪对象链具备实现层冻结入口  | 待开始   |
| `L1-02` | `L1`     | 把受控回退结果链与审批摘要快照补齐到 `command / query / DTO / guard` 的正式接口边界                                                   | `interface-command-design.md`、`interface-openapi-dto-design.md`、`query-view-boundary-design.md` | 回退 / 重开 / 摘要快照不再只存在于业务主文档                                 | 待开始   |
| `L2-01` | `L2`     | 把税务影响摘要、成本数据成熟度状态、成本侧动作建议与引用基线 / 快照版本固定到 `data model / table freeze / schema / DDL`              | `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`         | `L2` 的稳定输出包可以在实现层被 `L4 / L5` 直接引用，而不是只在业务文档中描述 | 已完成   |
| `L2-02` | `L2`     | 把 `L2` 稳定输出包继续补齐到 `command / query / DTO / guard` 边界                                                                     | `interface-command-design.md`、`interface-openapi-dto-design.md`、`query-view-boundary-design.md` | `L2` 输出包具备读写边界与守卫入口，不再只是下游解释口径                      | 已完成   |
| `L2-03` | `L2`     | 固化实时快照、期末快照、重述记录与再基线衔接的实现层选择规则                                                                          | `query-view-boundary-design.md`、`schema-ddl-design.md`                                           | 历史回看与重述链可稳定落到查询与约束层                                       | 待开始   |
| `L3-01` | `L3`     | 把“合同承接摘要 -> 移交确认摘要 -> 冻结版本”统一收口链补齐到 `query / DTO / data model / table / schema / guard`                      | 六份实现设计总文档                                                                                | `L3` 收口链不仅在业务文档成立，也在实现层具备稳定引用入口                    | 待开始   |
| `L3-02` | `L3`     | 把签后再基线化、替代冻结版本与联合追溯规则继续落到实现层                                                                              | `interface-command-design.md`、`data-model-prerequisites.md`、`schema-ddl-design.md`              | 再基线化与争议替代链具备明确命令、对象链与约束                               | 待开始   |
| `L4-01` | `L4`     | 把 `L2` 正式输入包继续补齐到 `T01 / T02 / T03 / T04` 的 `command / query / DTO / guard` 边界                                          | `interface-command-design.md`、`interface-openapi-dto-design.md`、`query-view-boundary-design.md` | `L4` 四个工作区不再只在业务文档里消费 `L2` 输出                              | 待开始   |
| `L4-02` | `L4`     | 固化经营核算、历史回看、信号评价与反馈规则的实现层承接对象                                                                            | `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`         | `L4` 公式、信号、反馈与快照链具备稳定落表与 DDL 入口                         | 待开始   |
| `L5-01` | `L5`     | 把阶段 gate、分阶段发放、最终结算 / 质保金结算、规则解释四层链继续补齐到 `command / query / DTO / guard`                              | `interface-command-design.md`、`interface-openapi-dto-design.md`、`query-view-boundary-design.md` | `L5` 四层链具备实现层读写与守卫闭环                                          | 待开始   |
| `L5-02` | `L5`     | 把审批摘要、例外授权、冻结争议公共链继续固化到 `L5` 的实现层对象与约束                                                                | `data-model-prerequisites.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`         | `L5` 不再只在业务页消费公共链，而是具备实现层固定入口                        | 待开始   |
| `LX-01` | `全主线` | 完成 `L1 ~ L5` 与六份实现设计总文档、关键业务主文档、关键联动文档的最终一致性复核                                                     | `phase2-mainline-delivery-plan.md`、`poms-design-progress.md` 等控制文档                          | 全主线只剩显式后置项，可进入 `LX-T04` 统一判断                               | 待开始   |

---

## 5. 推进日志

### 2026-04-03

- 新建本清单，开始按主线而非批次跟踪剩余实现设计任务。
- 已完成 `L2-01`：把 `L2 -> L4 / L5` 的稳定输出包继续写入 `data-model-prerequisites.md`、`table-structure-freeze-design.md` 与 `schema-ddl-design.md`，明确固定税务影响摘要、成本数据成熟度状态、成本侧动作建议与引用基线 / 快照版本的实现层承载位置。
- 已完成 `L2-02`：把 `L2` 稳定输出包继续写入 `interface-command-design.md`、`interface-openapi-dto-design.md` 与 `query-view-boundary-design.md`，明确税务影响摘要、成本侧动作建议与引用基线 / 快照版本在命令、DTO、查询与守卫边界中的承接方式。

---

## 6. 使用规则

1. 以后讨论“主线还剩什么没做”时，统一以本清单为准。
2. 若某任务只属于显式后置范围，不放入本清单的“当前范围剩余任务”。
3. 每完成一项任务，必须同步回写 `phase2-mainline-delivery-plan.md` 与 `poms-design-progress.md` 的状态口径。
4. 若某任务被拆成更细的实现层动作，应继续挂在原主线任务下，不再退回批次维度追踪。
