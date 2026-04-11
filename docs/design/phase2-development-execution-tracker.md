# POMS 第二阶段开发执行追踪板

**文档状态**: Active
**最后更新**: 2026-04-12
**适用范围**: `POMS` 第二阶段当前统一开发范围下的工程任务拆解、状态跟踪与执行回写
**关联文档**:

- 上游设计:
  - `poms-design-progress.md`
  - `phase2-mainline-delivery-plan.md`
  - `phase2-lx-t04-full-mainline-development-decision.md`
  - `phase2-detailed-design-index-map.md`
  - `implementation-delivery-guide.md`
  - `implementation-governance-gates.md`
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

- `Todo`：尚未开工
- `Doing`：正在实施
- `Blocked`：存在明确阻塞
- `Done`：已完成代码、测试与文档回写

### 2.2 维护规则

1. 每个任务只对应当前统一开发范围内的一段明确实现责任。
2. 若实施基线包把父任务进一步收敛为新的可执行子切片，必须先在本板新增对应 `Task ID / Subtask ID`、owner、依赖和完成定义，再开始编码；未进入本板的切片不得直接进入 `Doing`。
3. 若任务跨越多个主边界，应先拆分，而不是在一个任务里混做。
4. 进入 `Done` 前，必须同时满足实现、测试与文档回写。
5. 测试完成不仅指“跑过单测”；进入 `Done` 前必须按 `implementation-delivery-guide.md` 完成测试分层评估，并在触发条件时补齐对应 E2E 或明确记录不补理由。
6. 若任务涉及持久化结构，进入 `Done` 前还必须完成 SQL migration 与 ORM metadata 的一致性校验；若 `migration-check` 仍受全局历史 drift 影响，应在备注中明确说明“本切片是否引入新增 drift”与“失败是否属于既有基线问题”。
7. 若任务执行中发现范围变化，应先回写上位控制文档，再调整本板。
8. 子任务进入 `Done` 不等于父任务自动 `Done`；父任务仍需在全部子任务完成且完成定义满足后再关闭。
9. 若任务适用 `implementation-governance-gates.md`，则 `G1` 通过结论、`G3` 关键证据、例外项与 grandfathering 结果应至少在实施基线包、PR checklist 或本板 `备注 / 阻塞` 中留痕。

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

| Task ID | 主线    | 任务                                                                        | 状态    | 负责人    | 前置依赖                  | 输入文档                                                                                                                                           | 完成定义                                                     | 备注 / 阻塞                                                                                                                                                                                                                                                                                    |
| ------- | ------- | --------------------------------------------------------------------------- | ------- | --------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-01` | `GOV`   | `OrgUnit` 持久化、命令、查询与最小管理闭环                                  | `Done`  | `Copilot` | 无                        | `platform-governance/org-unit-design.md`                                                                                                           | migration、entity、query、command、guard、测试、文档回写完成 | API / Admin E2E 已通过；`migration-check` 仍有全局历史漂移待另案处理                                                                                                                                                                                                                           |
| `EX-02` | `GOV`   | `Role` / `Permission` 关系闭环与授权计算落地                                | `Done`  | `Copilot` | `EX-01`                   | `platform-governance/role-permission-design.md`                                                                                                    | 角色、授权关系、权限计算、API、测试与文档回写完成            | API / Admin E2E 已通过；系统角色基线拒绝路径已补写审计日志                                                                                                                                                                                                                                     |
| `EX-03` | `GOV`   | `User`、用户-角色、用户-组织关系与管理闭环                                  | `Done`  | `Copilot` | `EX-01`、`EX-02`          | `platform-governance/user-management-design.md`                                                                                                    | 用户主数据、关系表、API、guard、测试与文档回写完成           | API 侧已完成（LocalCredential 抽离、emailVerified/phoneVerified 落地、orgUnits 含 membershipType）；前端补全任务见 EX-03D                                                                                                                                                                      |
| `EX-04` | `GOV`   | 导航治理闭环与授权关系收口                                                  | `Done`  | `Claude`  | `EX-02`、`EX-03`          | `platform-governance/navigation-design.md`、`platform-governance/navigation-route-mapping.md`                                                      | 导航事实源、权限过滤、路由收口、测试与文档回写完成           | NAVIGATION_TREE SSOT；getNavigationForUser 权限过滤；审计快照 SHA256；导航相关 15 个单测已通过，平台治理 API E2E / Admin smoke 已覆盖                                                                                                                                                          |
| `EX-05` | `L1/L2` | `ContractReadinessPackage / CommercialReleaseBaseline` 与签约就绪承接链落地 | `Done`  | `Cursor`  | `EX-04`                   | `phase2-presigning-contract-readiness-workspace.md`、`phase2-presigning-workspace-handoff-map.md`                                                  | 相关主表、命令、查询、DTO、guard、测试与文档回写完成         | 已落地承接包 / 商业放行基线 / 差异复核 / 初始化命令与合同激活 guard；`poms-api` build 通过，API 单测 23 套 / E2E 44 条通过                                                                                                                                                                     |
| `EX-06` | `L1/L2` | 执行期成本记录对象与来源映射落地                                            | `Doing` | `Codex`   | `EX-05`                   | `phase2-project-actual-cost-records.md`、`phase2-cost-source-to-project-record-mapping.md`                                                         | 成本记录、来源映射、最小命令读写链、测试与文档回写完成       | `G3 = Block`：见 `ex-06-implementation-baseline.md`；第一批修复 checkpoint 已完成 `migration-check`、API 单测、API / Admin build、OpenAPI / client 与 `poms-api-e2e` 校验；下一可编码子切片见 `ex-06-payment-fact-and-read-side-baseline.md`，仅冻结 `PAYMENT_FACT` 映射 + finance-scoped 读侧 |
| `EX-07` | `L1/L2` | 分摊、税务影响、实时 / 期末快照、重述记录与再基线选择链落地                 | `Todo`  | `TBD`     | `EX-06`                   | `phase2-actual-cost-accumulation-stage-view.md`、`phase2-estimated-to-actual-cost-bridge.md`                                                       | 快照、重述、桥接规则、query、DDL、测试与文档回写完成         | `L2` 第二阶段基础包                                                                                                                                                                                                                                                                            |
| `EX-08` | `L3`    | 合同承接摘要、移交确认摘要与移交 gate 落地                                  | `Todo`  | `TBD`     | `EX-05`、`EX-07`          | `phase2-contract-to-handover-workspace.md`、`phase2-project-handover-gate-workspace.md`                                                            | 收口链主表、命令、查询、guard、测试与文档回写完成            | `L3` 第一切片                                                                                                                                                                                                                                                                                  |
| `EX-09` | `L3`    | 提成冻结版本、再基线化与替代冻结版本链落地                                  | `Todo`  | `TBD`     | `EX-08`                   | `phase2-commission-freeze-at-handover.md`、`phase2-handover-closure-rules.md`                                                                      | 冻结链、再基线链、引用约束、测试与文档回写完成               | `L3` 收口完成定义                                                                                                                                                                                                                                                                              |
| `EX-10` | `L5`    | `CommissionRuleVersion` 与 `CommissionRoleAssignment` 落地                  | `Todo`  | `TBD`     | `EX-09`                   | `commission-settlement-design.md`、`phase2-commission-stage-gate-overview-workspace.md`                                                            | 规则版本、角色分配、命令、查询、测试与文档回写完成           | 提成治理主机制起点                                                                                                                                                                                                                                                                             |
| `EX-11` | `L5`    | `CommissionCalculation` 与 `CommissionPayout` 落地                          | `Todo`  | `TBD`     | `EX-10`                   | `commission-settlement-design.md`、`phase2-commission-staged-payout-adjustment-paths.md`                                                           | 计算、发放、query、guard、测试与文档回写完成                 | 不混入后置财务联动                                                                                                                                                                                                                                                                             |
| `EX-12` | `L5`    | `CommissionAdjustment`、争议链与审批摘要公共链落地                          | `Todo`  | `TBD`     | `EX-11`                   | `commission-settlement-design.md`、`phase2-commission-rule-explanation-language.md`                                                                | 调整链、争议链、审批摘要链、测试与文档回写完成               | 保持敏感揭示受控                                                                                                                                                                                                                                                                               |
| `EX-13` | `L4/L5` | 经营快照、信号评价与 `L4 -> L5 gate` 绑定落地                               | `Todo`  | `TBD`     | `EX-07`、`EX-09`、`EX-12` | `phase2-project-business-outcome-overview.md`、`phase2-project-unified-accounting-view-caliber.md`、`phase2-business-accounting-feedback-rules.md` | 经营快照、评价、绑定链、测试与文档回写完成                   | `L4/L5` 联动起点                                                                                                                                                                                                                                                                               |
| `EX-14` | `L4/L5` | 偏差解释、最终结算 / 质保金结算与规则表达落地                               | `Todo`  | `TBD`     | `EX-13`                   | `phase2-project-variance-risk-explanation.md`、`phase2-commission-retention-final-settlement.md`、`phase2-commission-rule-explanation-language.md` | 解释链、结算链、表达链、测试与文档回写完成                   | 当前统一开发范围尾段                                                                                                                                                                                                                                                                           |

---

## 5. 当前建议的跟踪方式

推荐每周至少更新一次以下内容：

1. 将 `状态` 从 `Todo` / `Doing` / `Blocked` / `Done` 中选择其一。
2. 在 `负责人` 填当前 owner；若多人协作，填主 owner。
3. 在 `备注 / 阻塞` 填最短必要信息，不写成长篇会议纪要。
4. 任务进入 `Done` 时，同步回写相关设计文档与 `poms-design-progress.md`。

---

## 6. 子任务拆解

下表用于把当前主任务进一步拆成可直接分派的工程子任务。

| Subtask ID | Parent   | 子任务                                                                     | 状态      | 负责人    | 前置依赖                  | 完成定义                                                      | 备注                                                                                                                                                                   |
| ---------- | -------- | -------------------------------------------------------------------------- | --------- | --------- | ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-01A`   | `EX-01`  | 建立 `OrgUnit` 相关 migration、表结构与索引                                | `Done`    | `Copilot` | 无                        | 表结构、索引、约束落地并可执行 migration                      | 约束与索引已补齐                                                                                                                                                       |
| `EX-01B`   | `EX-01`  | 实现 `OrgUnit` entity、repository、query API                               | `Done`    | `Copilot` | `EX-01A`                  | 列表、树查询、详情查询可用                                    | 树查询与详情已接通                                                                                                                                                     |
| `EX-01C`   | `EX-01`  | 实现 `OrgUnit` command、guard、测试与文档回写                              | `Done`    | `Copilot` | `EX-01B`                  | 创建、更新、启停、测试、文档回写完成                          | 启停 / 移动 / E2E 已完成                                                                                                                                               |
| `EX-02A`   | `EX-02`  | 建立 `Role`、权限关系表与索引                                              | `Done`    | `Copilot` | `EX-01`                   | 角色与关系模型 migration 完成                                 | 既有 migration 已回看并与实体/DDL 对齐                                                                                                                                 |
| `EX-02B`   | `EX-02`  | 实现角色管理与权限绑定 command / query                                     | `Done`    | `Copilot` | `EX-02A`                  | 角色列表、详情、绑定接口可用                                  | 列表 / 详情 / 启停 / 绑定 / 管理页已闭环                                                                                                                               |
| `EX-02C`   | `EX-02`  | 实现授权计算、guard 测试与文档回写                                         | `Done`    | `Copilot` | `EX-02B`                  | 有效权限计算、guard、测试、文档回写完成                       | 真实权限收敛与 API/Admin E2E 已完成                                                                                                                                    |
| `EX-03A`   | `EX-03`  | 建立 `User`、用户-角色、用户-组织关系表                                    | `Done`    | `Copilot` | `EX-01`、`EX-02`          | 用户主数据与关系模型 migration 完成                           | LocalCredential 独立表；email_verified / phone_verified 已落地；migration 含历史数据迁移                                                                               |
| `EX-03B`   | `EX-03`  | 实现用户管理 query / command 与关系维护                                    | `Done`    | `Copilot` | `EX-03A`                  | 用户列表、详情、创建、更新、启停与关系维护可用                | GET /users/:id、PATCH /users/:id 已实现；PlatformUserDetail 契约已定义                                                                                                 |
| `EX-03C`   | `EX-03`  | 接通 `profile` 聚合、guard、测试与文档回写                                 | `Done`    | `Copilot` | `EX-03B`                  | 当前用户聚合输出、测试、文档回写完成                          | orgUnits 含 membershipType（ADR-008 已满足）；verifyCredentials 走 LocalCredential；50 个单测通过                                                                      |
| `EX-03D`   | `EX-03`  | poms-admin 用户管理前端补全                                                | `Done`    | `Claude`  | `EX-03B`                  | 用户详情页、用户信息编辑、secondary org 展示完成              | 用户详情弹窗对接 GET /users/:id；编辑信息弹窗对接 PATCH /users/:id；分配组织弹窗支持主/副组织；PlatformStore 补 loadUserDetail/updateUser；构建通过                    |
| `EX-04A`   | `EX-04`  | 固定导航事实源与导航同步入口                                               | `Done`    | `Claude`  | `EX-02`、`EX-03`          | 导航事实源、同步命令与最小管理边界可用                        | NAVIGATION_TREE 常量固化；POST /platform/navigation/sync 同步入口；isHidden/isDisabled/requiredPermissions 字段落地                                                    |
| `EX-04B`   | `EX-04`  | 接通权限过滤、路由对照与导航 query                                         | `Done`    | `Claude`  | `EX-04A`                  | 不同角色看到不同导航且路由映射一致                            | getNavigationForUser AND 逻辑过滤；GET /me/navigation + GET /platform/navigation；AuthStore.menuModel 计算信号接通                                                     |
| `EX-04C`   | `EX-04`  | 完成导航治理测试、审计与文档回写                                           | `Done`    | `Claude`  | `EX-04B`                  | 审计、测试、路由文档、设计回写完成                            | getNavigationAuditSnapshot SHA256；visibility spec（isHidden/isDisabled）；viewer 初始导航 E2E；导航相关 15 个单测已通过，平台治理 API E2E / Admin smoke 已覆盖        |
| `EX-05A`   | `EX-05`  | 建立 `ContractReadinessPackage / CommercialReleaseBaseline` 主表与引用关系 | `Done`    | `Cursor`  | `EX-04`                   | migration、关系、约束完成                                     | 已新增 `commercial_release_baseline`、`commercial_baseline_diff_*`、`contract_readiness_package*` migration / entity / repository                                      |
| `EX-05B`   | `EX-05`  | 实现签约就绪承接链 command / query / DTO                                   | `Done`    | `Cursor`  | `EX-05A`                  | 承接链最小命令读写链完成                                      | 已接通商业放行基线创建、差异复核、承接包创建、当前承接查询、初始化合同快照 / 应收计划命令与共享契约 DTO                                                                |
| `EX-05C`   | `EX-05`  | 实现 guard、测试与 `L1` 文档回写                                           | `Done`    | `Cursor`  | `EX-05B`                  | guard、测试、文档回写完成                                     | `activateContract` 已消费当前承接包与差异复核结果；`poms-api` build 通过，API 单测 23 套 / E2E 44 条通过，种子凭据与 E2E Jest 配置已校准                               |
| `EX-06A`   | `EX-06`  | 建立统一成本记录对象与来源映射表结构                                       | `Doing`   | `Codex`   | `EX-05`                   | 成本记录与映射 migration 完成                                 | 第一批 corrective slice 已收口，`internal_cost_rate_version` 的 `rate_key` / `version` / `status` / 当前有效约束已对齐；来源映射专表或命令仍需后续收口                 |
| `EX-06B`   | `EX-06`  | 实现成本记录命令链与来源映射规则                                           | `Doing`   | `Codex`   | `EX-06A`                  | 写侧链路与最小读侧链路完成                                    | 第一批已修 LABOR 成本率覆盖校验、金额计算与替代链；当前已拆为 `EX-06B1 ~ EX-06B4`，仅 `EX-06B1` 具备直接编码前提，`PROCUREMENT / INVOICE / EXPENSE` 仍因缺上游对象阻断 |
| `EX-06C`   | `EX-06`  | 完成成本记录测试与文档回写                                                 | `Doing`   | `Codex`   | `EX-06B`                  | 测试、设计回写完成                                            | 第一批修复已完成测试与文档回写，并通过 `poms-api-e2e`；后续先按 `ex-06-payment-fact-and-read-side-baseline.md` 补付款事实映射和 finance-scoped 读侧，再继续收口父任务  |
| `EX-06B1`  | `EX-06B` | 落地 `PAYMENT_FACT <- PaymentRecord` 映射与 finance-scoped 实际成本读侧    | `Todo`    | `Codex`   | `EX-06A`                  | 付款事实映射命令、actual cost list/detail、测试与文档回写完成 | 当前唯一具备直接编码前提的来源映射切片；基线见 `ex-06-payment-fact-and-read-side-baseline.md`                                                                          |
| `EX-06B2`  | `EX-06B` | 落地成本发票事实与 `INVOICE` 映射                                          | `Blocked` | `TBD`     | `EX-06B1`                 | 发票事实主对象、映射命令、读侧、测试与文档回写完成            | 阻塞：当前仓库尚无可直接消费的成本发票上游事实对象 / API / migration 基线                                                                                              |
| `EX-06B3`  | `EX-06B` | 落地费用事实与 `EXPENSE` 映射                                              | `Blocked` | `TBD`     | `EX-06B2`                 | 费用事实主对象、映射命令、读侧、测试与文档回写完成            | 阻塞：当前仓库尚无可直接消费的费用事实上游对象 / API / migration 基线                                                                                                  |
| `EX-06B4`  | `EX-06B` | 落地采购承诺事实与 `PROCUREMENT` 映射                                      | `Blocked` | `TBD`     | `EX-06B3`                 | 采购 / 应付事实主对象、映射命令、去重口径、测试与文档回写完成 | 阻塞：当前仓库尚无采购承诺 / 应付事实主对象，且需与 `PAYMENT_FACT / INVOICE` 一并收口去重纳入口径                                                                      |
| `EX-07A`   | `EX-07`  | 建立分摊、税务影响、实时 / 期末快照模型                                    | `Todo`    | `TBD`     | `EX-06`                   | 快照与税务相关表结构完成                                      | `L2` 第二层数据结构                                                                                                                                                    |
| `EX-07B`   | `EX-07`  | 实现重述记录与再基线选择链                                                 | `Todo`    | `TBD`     | `EX-07A`                  | 重述、再基线选择命令与查询链完成                              | 桥接稳定输出                                                                                                                                                           |
| `EX-07C`   | `EX-07`  | 完成 query、DDL 约束、测试与文档回写                                       | `Todo`    | `TBD`     | `EX-07B`                  | 查询、DDL、测试、回写完成                                     | `EX-07` 收口                                                                                                                                                           |
| `EX-08A`   | `EX-08`  | 建立合同承接摘要与移交摘要表结构                                           | `Todo`    | `TBD`     | `EX-05`、`EX-07`          | 收口链主表与引用关系完成                                      | `L3` 开始                                                                                                                                                              |
| `EX-08B`   | `EX-08`  | 实现移交 gate command / query / guard                                      | `Todo`    | `TBD`     | `EX-08A`                  | 移交 gate 最小命令读写链完成                                  | 准入边界                                                                                                                                                               |
| `EX-08C`   | `EX-08`  | 完成测试与 `L3` 文档回写                                                   | `Todo`    | `TBD`     | `EX-08B`                  | 测试、回写完成                                                | `EX-08` 收口                                                                                                                                                           |
| `EX-09A`   | `EX-09`  | 建立冻结版本、再基线化、替代冻结版本模型                                   | `Todo`    | `TBD`     | `EX-08`                   | 冻结链主表与引用字段完成                                      | `L3` 第二层结构                                                                                                                                                        |
| `EX-09B`   | `EX-09`  | 实现冻结链命令、查询与引用约束                                             | `Todo`    | `TBD`     | `EX-09A`                  | 冻结链与替代链可追溯                                          | 收口定义核心                                                                                                                                                           |
| `EX-09C`   | `EX-09`  | 完成测试与文档回写                                                         | `Todo`    | `TBD`     | `EX-09B`                  | 测试、回写完成                                                | `EX-09` 收口                                                                                                                                                           |
| `EX-10A`   | `EX-10`  | 建立 `CommissionRuleVersion` 与 `CommissionRoleAssignment` 表结构          | `Todo`    | `TBD`     | `EX-09`                   | migration 与主外键完成                                        | 提成治理第一步                                                                                                                                                         |
| `EX-10B`   | `EX-10`  | 实现规则版本与角色分配 command / query                                     | `Todo`    | `TBD`     | `EX-10A`                  | 基础命令读写链完成                                            | 不混入发放逻辑                                                                                                                                                         |
| `EX-10C`   | `EX-10`  | 完成测试与文档回写                                                         | `Todo`    | `TBD`     | `EX-10B`                  | 测试、回写完成                                                | `EX-10` 收口                                                                                                                                                           |
| `EX-11A`   | `EX-11`  | 建立 `CommissionCalculation` 与 `CommissionPayout` 表结构                  | `Todo`    | `TBD`     | `EX-10`                   | 计算与发放模型 migration 完成                                 | 提成治理第二步                                                                                                                                                         |
| `EX-11B`   | `EX-11`  | 实现计算、发放 command / query / guard                                     | `Todo`    | `TBD`     | `EX-11A`                  | 计算与发放链完成                                              | 不引入后置财务联动                                                                                                                                                     |
| `EX-11C`   | `EX-11`  | 完成测试与文档回写                                                         | `Todo`    | `TBD`     | `EX-11B`                  | 测试、回写完成                                                | `EX-11` 收口                                                                                                                                                           |
| `EX-12A`   | `EX-12`  | 建立调整链、争议链与审批摘要公共链模型                                     | `Todo`    | `TBD`     | `EX-11`                   | 相关表结构与引用关系完成                                      | 公共链基础                                                                                                                                                             |
| `EX-12B`   | `EX-12`  | 实现调整、争议与审批摘要命令读写链                                         | `Todo`    | `TBD`     | `EX-12A`                  | 调整与争议链、公共链可用                                      | 敏感揭示受控                                                                                                                                                           |
| `EX-12C`   | `EX-12`  | 完成测试与文档回写                                                         | `Todo`    | `TBD`     | `EX-12B`                  | 测试、回写完成                                                | `EX-12` 收口                                                                                                                                                           |
| `EX-13A`   | `EX-13`  | 建立经营快照、信号评价与 gate 绑定模型                                     | `Todo`    | `TBD`     | `EX-07`、`EX-09`、`EX-12` | 经营快照与绑定表结构完成                                      | `L4/L5` 联动基础                                                                                                                                                       |
| `EX-13B`   | `EX-13`  | 实现经营评价、绑定链 query / command                                       | `Todo`    | `TBD`     | `EX-13A`                  | 评价、绑定链最小闭环完成                                      | 经营信号进入提成                                                                                                                                                       |
| `EX-13C`   | `EX-13`  | 完成测试与文档回写                                                         | `Todo`    | `TBD`     | `EX-13B`                  | 测试、回写完成                                                | `EX-13` 收口                                                                                                                                                           |
| `EX-14A`   | `EX-14`  | 建立偏差解释、最终结算 / 质保金结算与规则表达模型                          | `Todo`    | `TBD`     | `EX-13`                   | 结算与解释相关结构完成                                        | 当前范围尾段结构                                                                                                                                                       |
| `EX-14B`   | `EX-14`  | 实现解释链、结算链与规则表达 query / command                               | `Todo`    | `TBD`     | `EX-14A`                  | 最终解释与结算链完成                                          | `L4/L5` 尾段闭环                                                                                                                                                       |
| `EX-14C`   | `EX-14`  | 完成测试与文档回写                                                         | `Todo`    | `TBD`     | `EX-14B`                  | 测试、回写完成                                                | `EX-14` 收口                                                                                                                                                           |

## 7. 当前结论

第二阶段当前已经具备进入实现的正式口径，因此需要一份执行板来承接工程推进。

本板当前定位是：

1. 当前统一开发范围下的任务拆解入口。
2. 当前工程顺序下的状态追踪板。
3. 当前实现反馈回写的执行层锚点。

历史主线任务收口记录继续保留在 `archive/mainline-closure/phase2-mainline-task-tracker.md`；但当前工程进度不再回到那份历史文档维护。
