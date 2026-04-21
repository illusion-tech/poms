# FE-16A 项目列表入口与创建体验纠偏实施基线包

- Gate Status: `Pass`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-21`
- Refresh Basis: `EX-17 G4 close-out 2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-16A`

## 1. 范围

- 本次目标:
  1. 冻结 `/projects` 作为项目主入口的正式职责，确保它优先服务销售、商务行政、财务与管理层的日常推进，而不是继续停留在 legacy CRUD 表格页。
  2. 明确项目列表必须先回答“项目属于谁、现在到哪一步、最近关键节点是什么、从哪里继续处理”，并对齐正式 `ProjectListView`。
  3. 冻结“新建项目”入口语义，禁止继续把旧销售 pipeline 阶段选择直接暴露给用户。
  4. 明确前端入口、权限、文案与数据来源边界，判定哪些缺口必须先由后端治理切片补齐。
- 本次明确不做:
  1. 不在前端本地拼接 `customerName`、`ownerName`、`ownerOrgName`、`latestMilestoneAt` 或“下一步动作”等业务事实。
  2. 不继续沿用当前 `CreateProjectRequest.currentStage` 作为面向用户的项目创建主语义。
  3. 不在本片直接改 `poms-api` controller、shared contract、OpenAPI 或 generated client。
  4. 不把项目详情页、项目工作区首页或浏览器级验证混入本片。
  5. 不在本片行内本地生成“为什么停在这里 / 下一步做什么 / 谁来处理”的业务引导摘要；该连续工作引导留给 `FE-16C` 的稳定 query 输入。
- 下游可依赖的交付边界:
  1. `FE-16A` 已形成正式 `G1` 结论，后续不会再以口头审阅代替基线输入。
  2. `/projects` 的产品职责、入口权限、业务文案与创建入口语义已冻结为后续实现输入。
  3. `EX-17` 已补齐 `ProjectListView`、正式项目创建命令语义与 generated client，`FE-16A` 可据此进入编码。
- 不允许下游依赖的留白:
  1. 列表页不得把“下一步动作”继续当成本地推导字段或静态文案强行塞回列表行内。
  2. 当前 `GET /projects -> ProjectListView[]` 是正式列表输入，前端不得再退回 `ProjectSummary[]` 或自建并行 view model。
  3. 当前 `POST /projects` 已收口为正式项目创建语义，前端不得重新暴露 `currentStage / status / owner*` 旧 body 字段。
  4. 当前无 route guard 的 `/projects` 入口和无按钮守卫的“新建项目”按钮不能被视为已对齐权限基线。

## 2. 正式输入

| Input Type                | Document / Source                                                                                        | Section / Anchor                                      | Status     | Notes                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| Business design           | `phase2-user-task-map.md`                                                                                | `4.1`、`5`、`6`                                       | `active`   | 销售、商务、管理层都需要快速看到项目进展、阻断与下一步                            |
| Business design           | `phase2-lifecycle-experience-blueprint.md`                                                               | `2`、`3`、`5`                                         | `active`   | 项目主入口必须服务连续业务推进，而不是实现态展示                                  |
| Business design           | `project-lifecycle-design.md`                                                                            | `4`、`5`、`6.1`                                       | `draft`    | 项目正式生命周期与创建起点，不接受继续暴露旧线索阶段                              |
| Query boundary            | `query-view-boundary-design.md`                                                                          | `ProjectListView`                                     | `active`   | 正式列表读侧需要 `customerName`、负责人、组织、最近里程碑等字段                   |
| Business authorization    | `business-authorization-matrix.md`                                                                       | `5.10`、`5.13`                                        | `active`   | 菜单入口、详情可见性、按钮显隐必须同时受平台导航和业务授权约束                    |
| Route inventory / ADR-015 | `ex-15e4-platform-contract-finance-project-route-baseline.md`                                            | 项目查询与创建 route baseline                         | `pass`     | `GET /projects`、`POST /projects` 路径已冻结，无需重开 route grammar              |
| Runtime fact              | `apps/poms-api/src/app/features/project/project.controller.ts`                                           | `list`、`create`                                      | `fact`     | 当前已由 `EX-17` 输出正式 `ProjectListView[]` 与收口后的 `CreateProjectRequest`   |
| Runtime fact              | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                      | `ProjectListViewSchema`、`CreateProjectRequestSchema` | `fact`     | shared contract 已与列表 / 创建正式语义对齐                                       |
| Runtime fact              | `apps/poms-admin/src/app/features/project/project-list.ts`                                               | 列表页与创建弹窗实现                                  | `fact`     | 当前前端已切到 `ProjectListView` 并移除旧阶段下拉，但信息架构仍未完成业务化重做   |
| Runtime fact              | `libs/admin/data-access/src/lib/project/project.store.ts`                                                | 项目列表 store                                        | `fact`     | 当前列表 store 已消费 `ProjectListView[]` 并在 create/update 后回刷列表           |
| Runtime fact              | `apps/poms-admin/src/app.routes.ts`、`apps/poms-api/src/app/features/navigation/navigation.constants.ts` | `/projects` route 与菜单权限                          | `fact`     | 菜单声明有 `nav:projects:view`，但前端直接路由缺少对应 guard；该收口留给 `FE-16D` |
| ADR                       | `adr/015-api-route-canonical-grammar.md`                                                                 | 全文                                                  | `accepted` | 说明当前阻断点是 contract / command 语义，不是 route grammar                      |

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                                      | Implementation Rule                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Business semantics          | `phase2-user-task-map.md` + `query-view-boundary-design.md`                                               | 项目列表是业务推进入口，不是纯台账导出页                                                      |
| Public route canonical path | `ex-15e4-platform-contract-finance-project-route-baseline.md`                                             | 继续使用 `GET /projects`、`POST /projects`，本片不改公开路径                                  |
| Route / command naming      | `project-lifecycle-design.md`                                                                             | `createProject` 必须表达正式项目创建，不再暴露旧销售 pipeline 阶段选择                        |
| DTO / contract naming       | `query-view-boundary-design.md` + `shared-contracts.ts`                                                   | 前端必须直接消费 `ProjectListView`，详情仍继续消费正式 `ProjectSummary`                       |
| Table / column naming       | `N/A`                                                                                                     | 本片不涉及持久化改动                                                                          |
| Date / time semantics       | `query-view-boundary-design.md`                                                                           | 列表优先消费业务关键节点时间，如 `latestMilestoneAt`，不能退化成 `createdAt` 充数             |
| Identifier semantics        | `business-authorization-matrix.md`                                                                        | 用户先看客户名、负责人名、组织名等业务标识，不看 UUID                                         |
| Money / decimal semantics   | `N/A`                                                                                                     | 本片不触达金额规则                                                                            |
| Status machine              | `project-lifecycle-design.md`                                                                             | 项目阶段必须对齐正式生命周期，不继续沿用 `lead / opportunity / proposal / negotiation` 旧阶段 |
| Work guidance semantics     | `fe-16-project-management-frontend-corrective-checkpoint.md` + `phase2-lifecycle-experience-blueprint.md` | 列表负责定位与进入处理上下文，不在本片本地生成“下一步动作”业务摘要；连续工作引导留给 `FE-16C` |

## 4. 命令与接口边界

| Route / Controller                            | Command / Service                  | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source                                             | Result    |
| --------------------------------------------- | ---------------------------------- | ---------------------- | ----------------------- | ------------------ | --------------------------------------------------------- | --------- |
| `GET /projects` / `ProjectController.list`    | `ProjectQueryService.listProjects` | `ProjectListQuery`     | `ProjectListView[]`     | `project:read`     | `query-view-boundary-design.md`                           | `aligned` |
| `POST /projects` / `ProjectController.create` | `ProjectService.createAndSave`     | `CreateProjectRequest` | `ProjectSummary`        | `project:write`    | `project-lifecycle-design.md` + `phase2-user-task-map.md` | `aligned` |

当前解释:

1. `EX-17` 已关闭本片原先的后端前置阻塞：列表 contract 与项目创建命令语义现已可直接作为前端正式输入。
2. 本片剩余工作已收敛为前端信息架构、业务中文表达、入口组织与局部交互设计，不再受 query / command 契约缺口阻断。

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects`、`POST /projects`
- Current implemented route(s): `GET /projects`、`POST /projects`
- Inventory status: `aligned`
- Route governance source: `EX-15E4`
- Blocker / exception: 无 public route blocker；`/projects` 直接路由守卫与跨页按钮守卫收口留给 `FE-16D`，不阻断本片编码。

## 5. 读侧边界

| Query / View      | Consumer                                          | Fields                                                                                                         | Filter / Sort                                              | Permission Boundary                                        | Design Source                                                                                                                         | Result    |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `ProjectListView` | `/projects` 项目主入口                            | `projectCode`、`projectName`、`customerName`、`currentStage`、`ownerOrgName`、`ownerName`、`latestMilestoneAt` | 当前状态、阶段、负责人组织、关键词；排序应服务最近推进优先 | `nav:projects:view` + `project:read`，必要时再叠加对象授权 | `query-view-boundary-design.md` + `business-authorization-matrix.md`                                                                  | `aligned` |
| 创建入口上下文    | 列表页“新建项目”按钮、创建弹窗或页面              | 用户是否有权限创建、默认创建语义、创建后回到哪类业务入口                                                       | 不适用                                                     | `nav:projects:view` + `project:write`                      | `project-lifecycle-design.md` + `business-authorization-matrix.md`                                                                    | `aligned` |
| 继续处理入口      | 列表页首屏提示、行级 CTA、进入详情 / 工作区的承接 | “从哪里继续处理当前项目”，不在本片内本地生成“下一步动作”摘要                                                   | 应以业务优先级排序                                         | 仅向有权查看项目的角色展示                                 | `phase2-user-task-map.md` + `phase2-lifecycle-experience-blueprint.md` + `fe-16-project-management-frontend-corrective-checkpoint.md` | `aligned` |

读侧规则:

1. 列表页不承载完整合同、审批、提成等重对象明细，只承接“该点哪个项目继续做事”的决策信息。
2. “下一步”或“卡点”不能由前端基于 `stage / status` 本地猜测，必须消费稳定 query 或稳定规则输出。
3. `FE-16A` 可通过列表信息架构与明确入口动作把用户送入详情 / 工作区继续处理，但不在本片新增“下一步动作”读侧字段。

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| `N/A` | `N/A`     | `N/A`               | `frontend-only`     | `not-applicable` |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI                | Result           |
| ----- | --------------------- | --------------- | ------ | ---------------------------------------- | ---------------- |
| `N/A` | 本片不直接落库        | `N/A`           | `N/A`  | `EX-17` 可能补 shared contract / OpenAPI | `not-applicable` |

## 7. 一致性结论

- Document -> code: `EX-17` 已补齐 `ProjectListView` 与项目创建命令正式输入；当前剩余 drift 主要在前端信息架构、路由入口组织与业务中文表达。
- ADR-015 inventory -> route: 当前 `GET /projects`、`POST /projects` 路径与 canonical inventory 一致。
- Migration -> entity: `N/A`，本片不触达持久化。
- Entity -> contract: `N/A`，本片直接消费 `EX-17` 已冻结的正式 contract。
- Route -> command: `createProject` 已收口为正式项目创建命令；本片不得重新引回旧阶段输入。
- Query -> view: 当前 `ProjectListView` 足以支撑列表 / 创建体验；连续工作引导摘要仍不属于本片列表 query 责任。
- Guard / permission: 菜单有 `nav:projects:view` 限制，但 `/projects` 直接路由与跨页按钮守卫仍未收口；该问题已明确归属 `FE-16D`，不阻断本片编码。
- OpenAPI / generated client: 已由 `EX-17` 回写完成，可直接作为本片输入。

## 8. 测试与校验

| Check                            | Required | Command / Evidence   | Result         | Gap / Reason                                          |
| -------------------------------- | -------- | -------------------- | -------------- | ----------------------------------------------------- |
| Lint                             | `no`     | docs-only G1 refresh | `not-required` | 本次仅刷新治理输入，复用 `EX-17` 的 upstream 验证证据 |
| Build                            | `no`     | docs-only G1 refresh | `not-required` | 本次未进入前端编码                                    |
| Unit tests                       | `no`     | docs-only G1 refresh | `not-required` | 本次未进入前端编码                                    |
| API / integration tests          | `no`     | docs-only G1 refresh | `not-required` | 本次未触达运行时代码                                  |
| E2E                              | `no`     | docs-only G1 refresh | `not-required` | 本次只刷新输入冻结，不新增浏览器行为                  |
| OpenAPI generation / client diff | `no`     | 复用 `EX-17` G4 证据 | `not-required` | upstream 已完成并可作为本片正式输入                   |
| Migration / schema check         | `no`     | `frontend-only`      | `not-required` | 本片不触达持久化                                      |
| Diff hygiene                     | `yes`    | `git diff --check`   | `pass`         | 已通过；当前仅剩 Git 的 CRLF 预警，不构成 diff 错误   |

## 9. 例外与风险

| Exception ID | Level | Scope          | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                        |
| ------------ | ----- | -------------- | ----------- | ------------- | ----------- | ---------------------------------------------------------------------------- |
| `N/A`        | `N/A` | 本片无新增例外 | `N/A`       | `N/A`         | `N/A`       | `EX-17` 的 `EX17-E2-LEAD-BOOTSTRAP` 不扩散为本片例外；本片直接消费其既有边界 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-21`
- Conditions:
  1. `EX-17` 当前输出已足够作为本片正式输入，`FE-16A` 可进入 `Doing`。
  2. 本片不得在列表页本地生成“下一步动作 / 阻断原因”摘要；列表只负责定位项目、展示稳定列表事实并把用户送入详情 / 工作区继续处理。
  3. `/projects` 直接路由守卫与统一按钮守卫收口继续留给 `FE-16D`，但本片不得新增更宽松的入口或动作可见性漂移。
  4. 用户可见内容继续执行“只说业务中文”的表达约束，不得回流英文术语与内部实现词。
