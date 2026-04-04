# POMS 第二阶段开发执行追踪板

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段当前统一开发范围下的工程任务拆解、状态跟踪与执行回写
**关联文档**:

- 上游设计:
  - `poms-design-progress.md`
  - `phase2-mainline-delivery-plan.md`
  - `phase2-lx-t04-full-mainline-development-decision.md`
  - `phase2-detailed-design-index-map.md`
  - `implementation-delivery-guide.md`
- 同级设计:
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `schema-ddl-design.md`
- 历史回溯:
  - `archive/control-history/phase2-mainline-delivery-plan.md`
  - `archive/control-history/phase2-lx-t04-full-mainline-development-decision.md`
  - `archive/mainline-closure/phase2-mainline-task-tracker.md`

---

## 1. 文档目标

本文档是第二阶段当前统一开发范围下的执行板，不承担历史论证职责。

它只回答这些问题：

- 当前应该做哪些工程任务
- 这些任务属于哪条主线
- 推荐顺序和依赖关系是什么
- 每个任务的完成定义是什么
- 当前状态、负责人和阻塞项如何维护

如果范围、顺序或开发约束发生变化，应先更新 `phase2-lx-t04-full-mainline-development-decision.md`、`phase2-mainline-delivery-plan.md` 或 `implementation-delivery-guide.md`，而不是直接在本追踪板里改写上位口径。

---

## 2. 使用规则

### 2.1 状态定义

- `Not Started`：尚未开工
- `In Progress`：正在实施
- `Blocked`：存在明确阻塞
- `Done`：已完成代码、测试与文档回写

### 2.2 维护规则

1. 每个任务只对应当前统一开发范围内的一段明确实现责任。
2. 若任务跨越多个主边界，应先拆分，而不是在一个任务里混做。
3. 进入 `Done` 前，必须同时满足实现、测试与文档回写。
4. 测试完成不仅指“跑过单测”；进入 `Done` 前必须按 `implementation-delivery-guide.md` 完成测试分层评估，并在触发条件时补齐对应 E2E 或明确记录不补理由。
5. 若任务涉及持久化结构，进入 `Done` 前还必须完成 SQL migration 与 ORM metadata 的一致性校验；若 `migration-check` 仍受全局历史 drift 影响，应在备注中明确说明“本切片是否引入新增 drift”与“失败是否属于既有基线问题”。
6. 若任务执行中发现范围变化，应先回写上位控制文档，再调整本板。
7. 子任务进入 `Done` 不等于父任务自动 `Done`；父任务仍需在全部子任务完成且完成定义满足后再关闭。

### 2.3 推荐字段

当前追踪字段固定为：

- `Task ID`
- `主线`
- `任务`
- `状态`
- `负责人`
- `前置依赖`
- `输入文档`
- `完成定义`
- `备注 / 阻塞`

---

## 3. 当前统一工程顺序

当前执行顺序固定为：

1. 平台治理补齐切片
2. `L1 + L2` 可信源与快照基础切片
3. `L3` 收口链切片
4. 提成治理主机制切片
5. `L4 + L5` 联动切片

本板中的任务顺序按这个口径排列。

---

## 4. 当前执行任务

| Task ID | 主线    | 任务                                                                        | 状态          | 负责人    | 前置依赖                  | 输入文档                                                                                                                                           | 完成定义                                                     | 备注 / 阻塞                                                          |
| ------- | ------- | --------------------------------------------------------------------------- | ------------- | --------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `EX-01` | `GOV`   | `OrgUnit` 持久化、命令、查询与最小管理闭环                                  | `Done`        | `Copilot` | 无                        | `platform-governance/org-unit-design.md`                                                                                                           | migration、entity、query、command、guard、测试、文档回写完成 | API / Admin E2E 已通过；`migration-check` 仍有全局历史漂移待另案处理 |
| `EX-02` | `GOV`   | `Role` / `Permission` 关系闭环与授权计算落地                                | `Not Started` | `TBD`     | `EX-01`                   | `platform-governance/role-permission-design.md`                                                                                                    | 角色、授权关系、权限计算、API、测试与文档回写完成            | 需保持平台 RBAC 单一可信源                                           |
| `EX-03` | `GOV`   | `User`、用户-角色、用户-组织关系与管理闭环                                  | `Not Started` | `TBD`     | `EX-01`、`EX-02`          | `platform-governance/user-management-design.md`                                                                                                    | 用户主数据、关系表、API、guard、测试与文档回写完成           | 不静默改写 profile 契约                                              |
| `EX-04` | `GOV`   | 导航治理闭环与授权关系收口                                                  | `Not Started` | `TBD`     | `EX-02`、`EX-03`          | `platform-governance/navigation-design.md`、`platform-governance/navigation-route-mapping.md`                                                      | 导航事实源、权限过滤、路由收口、测试与文档回写完成           | 平台治理补齐收口项                                                   |
| `EX-05` | `L1/L2` | `ContractReadinessPackage / CommercialReleaseBaseline` 与签约就绪承接链落地 | `Not Started` | `TBD`     | `EX-04`                   | `phase2-presigning-contract-readiness-workspace.md`、`phase2-presigning-workspace-handoff-map.md`                                                  | 相关主表、命令、查询、DTO、guard、测试与文档回写完成         | `L1` 起点切片                                                        |
| `EX-06` | `L1/L2` | 执行期成本记录对象与来源映射落地                                            | `Not Started` | `TBD`     | `EX-05`                   | `phase2-project-actual-cost-records.md`、`phase2-cost-source-to-project-record-mapping.md`                                                         | 成本记录、来源映射、最小命令读写链、测试与文档回写完成       | `L2` 可信源基础                                                      |
| `EX-07` | `L1/L2` | 分摊、税务影响、实时 / 期末快照、重述记录与再基线选择链落地                 | `Not Started` | `TBD`     | `EX-06`                   | `phase2-actual-cost-accumulation-stage-view.md`、`phase2-estimated-to-actual-cost-bridge.md`                                                       | 快照、重述、桥接规则、query、DDL、测试与文档回写完成         | `L2` 第二阶段基础包                                                  |
| `EX-08` | `L3`    | 合同承接摘要、移交确认摘要与移交 gate 落地                                  | `Not Started` | `TBD`     | `EX-05`、`EX-07`          | `phase2-contract-to-handover-workspace.md`、`phase2-project-handover-gate-workspace.md`                                                            | 收口链主表、命令、查询、guard、测试与文档回写完成            | `L3` 第一切片                                                        |
| `EX-09` | `L3`    | 提成冻结版本、再基线化与替代冻结版本链落地                                  | `Not Started` | `TBD`     | `EX-08`                   | `phase2-commission-freeze-at-handover.md`、`phase2-handover-closure-rules.md`                                                                      | 冻结链、再基线链、引用约束、测试与文档回写完成               | `L3` 收口完成定义                                                    |
| `EX-10` | `L5`    | `CommissionRuleVersion` 与 `CommissionRoleAssignment` 落地                  | `Not Started` | `TBD`     | `EX-09`                   | `commission-settlement-design.md`、`phase2-commission-stage-gate-overview-workspace.md`                                                            | 规则版本、角色分配、命令、查询、测试与文档回写完成           | 提成治理主机制起点                                                   |
| `EX-11` | `L5`    | `CommissionCalculation` 与 `CommissionPayout` 落地                          | `Not Started` | `TBD`     | `EX-10`                   | `commission-settlement-design.md`、`phase2-commission-staged-payout-adjustment-paths.md`                                                           | 计算、发放、query、guard、测试与文档回写完成                 | 不混入后置财务联动                                                   |
| `EX-12` | `L5`    | `CommissionAdjustment`、争议链与审批摘要公共链落地                          | `Not Started` | `TBD`     | `EX-11`                   | `commission-settlement-design.md`、`phase2-commission-rule-explanation-language.md`                                                                | 调整链、争议链、审批摘要链、测试与文档回写完成               | 保持敏感揭示受控                                                     |
| `EX-13` | `L4/L5` | 经营快照、信号评价与 `L4 -> L5 gate` 绑定落地                               | `Not Started` | `TBD`     | `EX-07`、`EX-09`、`EX-12` | `phase2-project-business-outcome-overview.md`、`phase2-project-unified-accounting-view-caliber.md`、`phase2-business-accounting-feedback-rules.md` | 经营快照、评价、绑定链、测试与文档回写完成                   | `L4/L5` 联动起点                                                     |
| `EX-14` | `L4/L5` | 偏差解释、最终结算 / 质保金结算与规则表达落地                               | `Not Started` | `TBD`     | `EX-13`                   | `phase2-project-variance-risk-explanation.md`、`phase2-commission-retention-final-settlement.md`、`phase2-commission-rule-explanation-language.md` | 解释链、结算链、表达链、测试与文档回写完成                   | 当前统一开发范围尾段                                                 |

---

## 5. 当前建议的跟踪方式

推荐每周至少更新一次以下内容：

1. 将 `状态` 从 `Not Started` / `In Progress` / `Blocked` / `Done` 中选择其一。
2. 在 `负责人` 填当前 owner；若多人协作，填主 owner。
3. 在 `备注 / 阻塞` 填最短必要信息，不写成长篇会议纪要。
4. 任务进入 `Done` 时，同步回写相关设计文档与 `poms-design-progress.md`。

---

## 6. 子任务拆解

下表用于把当前主任务进一步拆成可直接分派的工程子任务。

| Subtask ID | Parent  | 子任务                                                                     | 状态          | 负责人    | 前置依赖                  | 完成定义                                       | 备注                     |
| ---------- | ------- | -------------------------------------------------------------------------- | ------------- | --------- | ------------------------- | ---------------------------------------------- | ------------------------ |
| `EX-01A`   | `EX-01` | 建立 `OrgUnit` 相关 migration、表结构与索引                                | `Done`        | `Copilot` | 无                        | 表结构、索引、约束落地并可执行 migration       | 约束与索引已补齐         |
| `EX-01B`   | `EX-01` | 实现 `OrgUnit` entity、repository、query API                               | `Done`        | `Copilot` | `EX-01A`                  | 列表、树查询、详情查询可用                     | 树查询与详情已接通       |
| `EX-01C`   | `EX-01` | 实现 `OrgUnit` command、guard、测试与文档回写                              | `Done`        | `Copilot` | `EX-01B`                  | 创建、更新、启停、测试、文档回写完成           | 启停 / 移动 / E2E 已完成 |
| `EX-02A`   | `EX-02` | 建立 `Role`、权限关系表与索引                                              | `Not Started` | `TBD`     | `EX-01`                   | 角色与关系模型 migration 完成                  | 角色主数据基础           |
| `EX-02B`   | `EX-02` | 实现角色管理与权限绑定 command / query                                     | `Not Started` | `TBD`     | `EX-02A`                  | 角色列表、详情、绑定接口可用                   | 保持角色为权限聚合器     |
| `EX-02C`   | `EX-02` | 实现授权计算、guard 测试与文档回写                                         | `Not Started` | `TBD`     | `EX-02B`                  | 有效权限计算、guard、测试、文档回写完成        | `EX-02` 收口             |
| `EX-03A`   | `EX-03` | 建立 `User`、用户-角色、用户-组织关系表                                    | `Not Started` | `TBD`     | `EX-01`、`EX-02`          | 用户主数据与关系模型 migration 完成            | 用户关系主链             |
| `EX-03B`   | `EX-03` | 实现用户管理 query / command 与关系维护                                    | `Not Started` | `TBD`     | `EX-03A`                  | 用户列表、详情、创建、更新、启停与关系维护可用 | 不静默改 profile 契约    |
| `EX-03C`   | `EX-03` | 接通 `profile` 聚合、guard、测试与文档回写                                 | `Not Started` | `TBD`     | `EX-03B`                  | 当前用户聚合输出、测试、文档回写完成           | `EX-03` 收口             |
| `EX-04A`   | `EX-04` | 固定导航事实源与导航同步入口                                               | `Not Started` | `TBD`     | `EX-02`、`EX-03`          | 导航事实源、同步命令与最小管理边界可用         | 导航不数据库化扩张       |
| `EX-04B`   | `EX-04` | 接通权限过滤、路由对照与导航 query                                         | `Not Started` | `TBD`     | `EX-04A`                  | 不同角色看到不同导航且路由映射一致             | 导航治理核心             |
| `EX-04C`   | `EX-04` | 完成导航治理测试、审计与文档回写                                           | `Not Started` | `TBD`     | `EX-04B`                  | 审计、测试、路由文档、设计回写完成             | `EX-04` 收口             |
| `EX-05A`   | `EX-05` | 建立 `ContractReadinessPackage / CommercialReleaseBaseline` 主表与引用关系 | `Not Started` | `TBD`     | `EX-04`                   | migration、关系、约束完成                      | `L1` 起点数据结构        |
| `EX-05B`   | `EX-05` | 实现签约就绪承接链 command / query / DTO                                   | `Not Started` | `TBD`     | `EX-05A`                  | 承接链最小命令读写链完成                       | `L1` 最小业务闭环        |
| `EX-05C`   | `EX-05` | 实现 guard、测试与 `L1` 文档回写                                           | `Not Started` | `TBD`     | `EX-05B`                  | guard、测试、文档回写完成                      | `EX-05` 收口             |
| `EX-06A`   | `EX-06` | 建立统一成本记录对象与来源映射表结构                                       | `Not Started` | `TBD`     | `EX-05`                   | 成本记录与映射 migration 完成                  | `L2` 基础数据结构        |
| `EX-06B`   | `EX-06` | 实现成本记录命令链与来源映射规则                                           | `Not Started` | `TBD`     | `EX-06A`                  | 写侧链路与最小读侧链路完成                     | 成本可信源落地           |
| `EX-06C`   | `EX-06` | 完成成本记录测试与文档回写                                                 | `Not Started` | `TBD`     | `EX-06B`                  | 测试、设计回写完成                             | `EX-06` 收口             |
| `EX-07A`   | `EX-07` | 建立分摊、税务影响、实时 / 期末快照模型                                    | `Not Started` | `TBD`     | `EX-06`                   | 快照与税务相关表结构完成                       | `L2` 第二层数据结构      |
| `EX-07B`   | `EX-07` | 实现重述记录与再基线选择链                                                 | `Not Started` | `TBD`     | `EX-07A`                  | 重述、再基线选择命令与查询链完成               | 桥接稳定输出             |
| `EX-07C`   | `EX-07` | 完成 query、DDL 约束、测试与文档回写                                       | `Not Started` | `TBD`     | `EX-07B`                  | 查询、DDL、测试、回写完成                      | `EX-07` 收口             |
| `EX-08A`   | `EX-08` | 建立合同承接摘要与移交摘要表结构                                           | `Not Started` | `TBD`     | `EX-05`、`EX-07`          | 收口链主表与引用关系完成                       | `L3` 开始                |
| `EX-08B`   | `EX-08` | 实现移交 gate command / query / guard                                      | `Not Started` | `TBD`     | `EX-08A`                  | 移交 gate 最小命令读写链完成                   | 准入边界                 |
| `EX-08C`   | `EX-08` | 完成测试与 `L3` 文档回写                                                   | `Not Started` | `TBD`     | `EX-08B`                  | 测试、回写完成                                 | `EX-08` 收口             |
| `EX-09A`   | `EX-09` | 建立冻结版本、再基线化、替代冻结版本模型                                   | `Not Started` | `TBD`     | `EX-08`                   | 冻结链主表与引用字段完成                       | `L3` 第二层结构          |
| `EX-09B`   | `EX-09` | 实现冻结链命令、查询与引用约束                                             | `Not Started` | `TBD`     | `EX-09A`                  | 冻结链与替代链可追溯                           | 收口定义核心             |
| `EX-09C`   | `EX-09` | 完成测试与文档回写                                                         | `Not Started` | `TBD`     | `EX-09B`                  | 测试、回写完成                                 | `EX-09` 收口             |
| `EX-10A`   | `EX-10` | 建立 `CommissionRuleVersion` 与 `CommissionRoleAssignment` 表结构          | `Not Started` | `TBD`     | `EX-09`                   | migration 与主外键完成                         | 提成治理第一步           |
| `EX-10B`   | `EX-10` | 实现规则版本与角色分配 command / query                                     | `Not Started` | `TBD`     | `EX-10A`                  | 基础命令读写链完成                             | 不混入发放逻辑           |
| `EX-10C`   | `EX-10` | 完成测试与文档回写                                                         | `Not Started` | `TBD`     | `EX-10B`                  | 测试、回写完成                                 | `EX-10` 收口             |
| `EX-11A`   | `EX-11` | 建立 `CommissionCalculation` 与 `CommissionPayout` 表结构                  | `Not Started` | `TBD`     | `EX-10`                   | 计算与发放模型 migration 完成                  | 提成治理第二步           |
| `EX-11B`   | `EX-11` | 实现计算、发放 command / query / guard                                     | `Not Started` | `TBD`     | `EX-11A`                  | 计算与发放链完成                               | 不引入后置财务联动       |
| `EX-11C`   | `EX-11` | 完成测试与文档回写                                                         | `Not Started` | `TBD`     | `EX-11B`                  | 测试、回写完成                                 | `EX-11` 收口             |
| `EX-12A`   | `EX-12` | 建立调整链、争议链与审批摘要公共链模型                                     | `Not Started` | `TBD`     | `EX-11`                   | 相关表结构与引用关系完成                       | 公共链基础               |
| `EX-12B`   | `EX-12` | 实现调整、争议与审批摘要命令读写链                                         | `Not Started` | `TBD`     | `EX-12A`                  | 调整与争议链、公共链可用                       | 敏感揭示受控             |
| `EX-12C`   | `EX-12` | 完成测试与文档回写                                                         | `Not Started` | `TBD`     | `EX-12B`                  | 测试、回写完成                                 | `EX-12` 收口             |
| `EX-13A`   | `EX-13` | 建立经营快照、信号评价与 gate 绑定模型                                     | `Not Started` | `TBD`     | `EX-07`、`EX-09`、`EX-12` | 经营快照与绑定表结构完成                       | `L4/L5` 联动基础         |
| `EX-13B`   | `EX-13` | 实现经营评价、绑定链 query / command                                       | `Not Started` | `TBD`     | `EX-13A`                  | 评价、绑定链最小闭环完成                       | 经营信号进入提成         |
| `EX-13C`   | `EX-13` | 完成测试与文档回写                                                         | `Not Started` | `TBD`     | `EX-13B`                  | 测试、回写完成                                 | `EX-13` 收口             |
| `EX-14A`   | `EX-14` | 建立偏差解释、最终结算 / 质保金结算与规则表达模型                          | `Not Started` | `TBD`     | `EX-13`                   | 结算与解释相关结构完成                         | 当前范围尾段结构         |
| `EX-14B`   | `EX-14` | 实现解释链、结算链与规则表达 query / command                               | `Not Started` | `TBD`     | `EX-14A`                  | 最终解释与结算链完成                           | `L4/L5` 尾段闭环         |
| `EX-14C`   | `EX-14` | 完成测试与文档回写                                                         | `Not Started` | `TBD`     | `EX-14B`                  | 测试、回写完成                                 | `EX-14` 收口             |

---

## 7. 首批建议开工包

如果现在要从执行板直接下发任务，建议先只开以下 6 个子任务：

1. `EX-01A`
2. `EX-01B`
3. `EX-02A`
4. `EX-02B`
5. `EX-03A`
6. `EX-04A`

原因：

- 它们都属于当前统一工程顺序中的平台治理补齐起始段
- 写入面相对集中，适合先把主数据与关系链打稳
- 后续 `L1 / L2` 切片会直接依赖这组结果

若需要继续细分到个人周计划，建议以“每人 1-2 个子任务”为上限，不要跨多个主链混排。

---

## 8. 首批开工包详细拆解

下表把首批 6 个子任务继续细化到“可直接安排到个人周计划”的工作项。

| Work Item ID | 归属子任务 | 工作项                                       | 建议类型        | 状态          | 前置依赖                 | 交付物                  | 完成标准                                                                                       |
| ------------ | ---------- | -------------------------------------------- | --------------- | ------------- | ------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `EX-01A-01`  | `EX-01A`   | 明确 `OrgUnit` 逻辑表、字段组、主外键与索引  | `Design Freeze` | `Done`        | 无                       | 表结构清单              | 已回看 `org-unit-design.md`、`data-model-prerequisites.md`、`table-structure-freeze-design.md` |
| `EX-01A-02`  | `EX-01A`   | 编写 `OrgUnit` migration SQL                 | `Migration`     | `Done`        | `EX-01A-01`              | migration 文件          | 本地可执行，表、索引、约束完整                                                                 |
| `EX-01A-03`  | `EX-01A`   | 回写 `schema-ddl-design.md` 与执行板         | `Docs`          | `Done`        | `EX-01A-02`              | 文档回写                | DDL 文档与 tracker 状态同步                                                                    |
| `EX-01B-01`  | `EX-01B`   | 建立 `OrgUnit` entity / mapping              | `Backend`       | `Done`        | `EX-01A-02`              | entity / mapping 代码   | 字段与 migration 对齐，无隐式漂移                                                              |
| `EX-01B-02`  | `EX-01B`   | 实现 `OrgUnit` repository 与树查询           | `Backend`       | `Done`        | `EX-01B-01`              | repository / query 代码 | 列表、详情、树查询闭环可用                                                                     |
| `EX-01B-03`  | `EX-01B`   | 补 `OrgUnit` 查询测试                        | `Test`          | `Done`        | `EX-01B-02`              | 单测 / e2e              | 覆盖树查询与关键失败路径                                                                       |
| `EX-02A-01`  | `EX-02A`   | 明确 `Role` 与权限关系表职责边界             | `Design Freeze` | `Not Started` | `EX-01A-01`              | 表结构清单              | 已回看 `role-permission-design.md` 与冻结文档                                                  |
| `EX-02A-02`  | `EX-02A`   | 编写 `Role`、权限关系 migration SQL          | `Migration`     | `Not Started` | `EX-02A-01`              | migration 文件          | 角色主表、关系表、索引、唯一约束完整                                                           |
| `EX-02A-03`  | `EX-02A`   | 回写 DDL / 执行板                            | `Docs`          | `Not Started` | `EX-02A-02`              | 文档回写                | 结构文档与 tracker 同步                                                                        |
| `EX-02B-01`  | `EX-02B`   | 建立 `Role`、权限关系 entity / mapping       | `Backend`       | `Not Started` | `EX-02A-02`              | entity / mapping 代码   | 与 migration 一致                                                                              |
| `EX-02B-02`  | `EX-02B`   | 实现角色列表、详情、权限绑定 command / query | `Backend`       | `Not Started` | `EX-02B-01`              | command / query 代码    | 最小管理闭环可用                                                                               |
| `EX-02B-03`  | `EX-02B`   | 补角色绑定与授权收敛测试                     | `Test`          | `Not Started` | `EX-02B-02`              | 单测 / e2e              | 覆盖绑定后权限变化                                                                             |
| `EX-03A-01`  | `EX-03A`   | 明确 `User`、用户-角色、用户-组织关系表边界  | `Design Freeze` | `Not Started` | `EX-01A-01`、`EX-02A-01` | 表结构清单              | 已回看 `user-management-design.md` 与冻结文档                                                  |
| `EX-03A-02`  | `EX-03A`   | 编写用户与关系表 migration SQL               | `Migration`     | `Not Started` | `EX-03A-01`              | migration 文件          | 用户主表、关系表、索引与约束完整                                                               |
| `EX-03A-03`  | `EX-03A`   | 回写 DDL / 执行板                            | `Docs`          | `Not Started` | `EX-03A-02`              | 文档回写                | 文档与 tracker 同步                                                                            |
| `EX-04A-01`  | `EX-04A`   | 固定导航事实源维护边界与同步命令范围         | `Design Freeze` | `Not Started` | `EX-02B-02`、`EX-03A-02` | 范围清单                | 已回看 `navigation-design.md` 与路由对照文档                                                   |
| `EX-04A-02`  | `EX-04A`   | 实现导航同步入口与事实源装载代码             | `Backend`       | `Not Started` | `EX-04A-01`              | 同步命令 / service 代码 | 同步入口可用，不扩张为完整编排器                                                               |
| `EX-04A-03`  | `EX-04A`   | 补导航同步审计与最小测试                     | `Test`          | `Not Started` | `EX-04A-02`              | 测试 / 审计回写         | 审计留痕、测试与文档同步完成                                                                   |

建议的首批个人周计划分配方式：

1. 一人优先拿一个 `Migration` 项 + 一个对应 `Docs` 项。
2. 一人优先拿一个 `Backend` 项 + 一个对应 `Test` 项。
3. `Design Freeze` 项应在对应 migration 开始前先完成，不建议与编码并行拖太久。

---

## 9. 建议并行分工表

下表给出首批开工包的建议并行切法。目标不是把人全部铺满，而是把写入面、依赖链和同步点控制在可收敛范围内。

| 并行组 | 建议角色 / 人数                | 负责范围                      | 建议工作项                                   | 启动条件                        | 关键同步点                                       | 备注                                       |
| ------ | ------------------------------ | ----------------------------- | -------------------------------------------- | ------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `G1`   | 数据建模 / migration `1 人`    | `OrgUnit` 主数据结构          | `EX-01A-01`、`EX-01A-02`、`EX-01A-03`        | 无                              | `EX-01A-02` 完成后同步给 `G3`、`G5`              | 第一优先级，不要并行插入其他主链写入       |
| `G2`   | 数据建模 / migration `1 人`    | `Role` 与权限关系结构         | `EX-02A-01`、`EX-02A-02`、`EX-02A-03`        | `EX-01A-01` 完成                | `EX-02A-02` 完成后同步给 `G4`、`G5`              | 可与 `G1` 交错推进，但冻结口径必须一致     |
| `G3`   | 后端读写 / 测试 `1 人`         | `OrgUnit` entity、query、测试 | `EX-01B-01`、`EX-01B-02`、`EX-01B-03`        | `EX-01A-02` 完成                | `EX-01B-02` 完成后回看树查询口径是否影响 `User`  | 不提前假设字段，严格跟随 migration         |
| `G4`   | 后端读写 / 测试 `1 人`         | `Role` 读写链、绑定链、测试   | `EX-02B-01`、`EX-02B-02`、`EX-02B-03`        | `EX-02A-02` 完成                | `EX-02B-02` 完成后给 `G6` 导航治理线作为输入     | 权限绑定边界要与冻结文档和导航治理保持一致 |
| `G5`   | 数据建模 / migration `1 人`    | `User` 及用户关系结构         | `EX-03A-01`、`EX-03A-02`、`EX-03A-03`        | `EX-01A-01`、`EX-02A-01` 已冻结 | `EX-03A-02` 完成后同步给 `G6`                    | 组织、角色关系不要二次发明中间抽象         |
| `G6`   | 平台治理后端 / 测试 `1 人`     | 导航事实源与同步入口          | `EX-04A-01`、`EX-04A-02`、`EX-04A-03`        | `EX-02B-02`、`EX-03A-02` 完成   | `EX-04A-02` 完成后统一回看导航与授权关系         | 这是首批尾段，不建议抢跑                   |
| `PM`   | 技术负责人 / 文档维护 `0.5 人` | 冻结口径、状态维护、冲突仲裁  | 每日更新 tracker、DDL 文档、阻塞项与完成定义 | 首批开工即启动                  | 每个 migration 完成、每个 backend 闭环完成时更新 | 不承担主编码，负责收口和变更控制           |

建议的并行规则：

1. `G1 / G2 / G5` 属于结构写入线，优先级高于所有消费这些结构的后端组。
2. `G3 / G4` 只能在对应 migration 落地后启动，不要并行猜字段。
3. `G6` 必须等 `Role` 与 `User` 关系链都稳定后再进入，否则导航事实源会反复返工。
4. `PM` 每天至少做一次状态回写，防止 tracker、DDL 文档与代码实际状态脱节。

建议的首批排班口径：

1. 如果只有 `3 人`，优先保留 `G1 + G3`、`G2 + G4`、`G5 + PM`，`G6` 顺延到第二周。
2. 如果有 `4 人`，按 `G1`、`G2`、`G3`、`G4` 开，`G5` 由 `G1/G2` 收尾后接手。
3. 如果有 `5-6 人`，可直接按 `G1 ~ G6` 铺开，但仍要求 `G6` 等待前置同步点，不是名义并行。

---

## 10. 当前结论

第二阶段当前已经具备进入实现的正式口径，因此需要一份执行板来承接工程推进。

本板当前定位是：

1. 当前统一开发范围下的任务拆解入口。
2. 当前工程顺序下的状态追踪板。
3. 当前实现反馈回写的执行层锚点。

历史主线任务收口记录继续保留在 `archive/mainline-closure/phase2-mainline-task-tracker.md`；但当前工程进度不再回到那份历史文档维护。
