# EX-17 项目列表视图与项目创建命令语义实施基线包

- Gate Status: `Pass`
- Parent: `FE-16A`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-17`

## 1. 范围

- 本次目标:
  1. 把 `GET /projects` 从旧 `ProjectSummary[]` 收口为正式 `ProjectListView`，至少稳定提供项目名称、客户名称、当前阶段、负责人名称、归属组织与最近关键节点时间。
  2. 把 `POST /projects` 从 legacy pipeline 创建语义收口为“创建正式 `Project`”命令，不再允许客户端继续提交旧 `lead / opportunity / proposal / negotiation` 阶段和值守字段。
  3. 明确项目读侧与创建命令的字段来源、默认值、守卫边界、shared contract、OpenAPI 与 generated client 输出。
  4. 为 `FE-16A` 提供可直接消费的正式后端输入，避免前端继续本地拼业务事实。
- 本次明确不做:
  1. 不在本片补 `Lead` 主对象、`ProjectAssessment` 命令链、`ProjectDetailView` 或项目工作区摘要 query。
  2. 不在本片一次性补齐所有生命周期里程碑事实，只收口列表页当前能稳定消费的关键字段。
  3. 不在本片实现对象级业务授权、详情按钮守卫或完整浏览器体验，这些留给 `FE-16A/16B/16D`。
  4. 不在本片补客户主数据模块；若当前阶段需要客户名称，先以 `Project.customerName` 固化业务事实。
- 下游可依赖的交付边界:
  1. `GET /projects` 的正式公共 contract 已从 `ProjectSummary[]` 切换到 `ProjectListView[]`。
  2. `POST /projects` 的公共 request 已不再暴露 legacy pipeline 阶段、状态、owner / audit 覆盖字段。
  3. `Project` 已具备 `customerName` 这一当前阶段可直接对用户展示的稳定字段来源。
  4. shared contract、OpenAPI、generated client、backend tests 与必要的 frontend 编译适配一起回写。
- 不允许下游依赖的留白:
  1. 前端不得继续把 `ProjectSummary` 当作项目列表正式读侧。
  2. 前端不得继续把 `createdBy / updatedBy / ownerUserId / ownerOrgId / status` 当作项目创建表单输入。
  3. `latestMilestoneAt` 不得用 `createdAt`、前端本地推断或其它技术字段冒充。

## 2. 正式输入

| Input Type                | Document / Source                                                                                  | Section / Anchor                         | Status     | Notes                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| Business design           | `phase2-user-task-map.md`                                                                          | `4.1`、`5.2`                             | `active`   | 销售要先看到当前结论、阻断与下一步                                                               |
| Business design           | `phase2-lifecycle-experience-blueprint.md`                                                         | `3`、`4.1`                               | `active`   | 项目入口必须承接签约前连续工作链                                                                 |
| Business design           | `project-lifecycle-design.md`                                                                      | `3`、`5.1`、`6`、`11`                    | `draft`    | `Project` 创建后默认进入正式生命周期，不再暴露旧销售 pipeline                                    |
| Business authorization    | `business-authorization-matrix.md`                                                                 | `销售流程域创建`、`5.10`                 | `active`   | 项目创建、基础信息普通维护与按钮守卫已冻结                                                       |
| Query boundary            | `query-view-boundary-design.md`                                                                    | `ProjectListView`                        | `active`   | 列表正式最小字段组已冻结                                                                         |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md` + `ex-15e4-platform-contract-finance-project-route-baseline.md` | `GET /projects`、`POST /projects`        | `aligned`  | 本片不改 public route grammar，只改 contract / command semantics                                 |
| Runtime fact              | `project.controller.ts` + `project.service.ts` + `project.repository.ts`                           | 当前 list / create 实现                  | `fact`     | 当前 list 返回 `ProjectSummary[]`，create 允许客户端提交 legacy 阶段 / 状态 / owner / audit 字段 |
| Runtime fact              | `shared-contracts.ts` + `project.dto.ts`                                                           | `ProjectSummary`、`CreateProjectRequest` | `fact`     | 当前 shared contract 与设计不一致                                                                |
| Runtime fact              | `project-list.ts` + `project.store.ts`                                                             | 当前 `/projects` 页与 admin store        | `fact`     | 当前前端列表与创建体验直接跟随旧 contract                                                        |
| ADR                       | `adr/015-api-route-canonical-grammar.md`                                                           | 全文                                     | `accepted` | 说明当前不是 route grammar 问题                                                                  |

## 3. 本次 SSOT

| Concern                     | SSOT                                                      | Implementation Rule                                                                                              |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Business semantics          | `project-lifecycle-design.md` + `phase2-user-task-map.md` | `Project` 是正式主对象，列表服务推进决策而不是台账堆砌                                                           |
| Public route canonical path | `api-route-canonical-inventory.md`                        | 保持 `GET /projects`、`POST /projects`                                                                           |
| Route / command naming      | `project-lifecycle-design.md`                             | `createProject` 表达正式项目创建，不再表达旧线索阶段切换                                                         |
| DTO / contract naming       | `query-view-boundary-design.md`                           | 列表必须使用 `ProjectListView`，详情仍暂留 `ProjectSummary`                                                      |
| Table / column naming       | `project-lifecycle-design.md` §11                         | 当前阶段先补 `customerName`，保留 `customerId` 作为 legacy 占位引用                                              |
| Date / time semantics       | `query-view-boundary-design.md`                           | `latestMilestoneAt` 只返回真实业务关键节点时间，不得回退为 `createdAt`                                           |
| Identifier semantics        | `business-authorization-matrix.md`                        | 对用户显示客户名、负责人名、组织名；不把 UUID 当业务文案                                                         |
| Money / decimal semantics   | `N/A`                                                     | 本片不触达金额口径                                                                                               |
| Status machine              | `project-lifecycle-design.md` §5、§7                      | 创建命令只允许正式 `Project.stage/status` 口径；旧 `lead/opportunity/proposal/negotiation` 不再进入公共 contract |

## 4. 命令与接口边界

| Route / Controller                                           | Command / Service                  | Request DTO / Contract          | Response DTO / Contract | Guard / Permission | Design Source                                                      | Result    |
| ------------------------------------------------------------ | ---------------------------------- | ------------------------------- | ----------------------- | ------------------ | ------------------------------------------------------------------ | --------- |
| `GET /projects` / `ProjectController.list`                   | `ProjectQueryService.listProjects` | `ProjectListQuery`              | `ProjectListView[]`     | `project:read`     | `query-view-boundary-design.md`                                    | `aligned` |
| `POST /projects` / `ProjectController.create`                | `ProjectService.createAndSave`     | `CreateProjectRequest`          | `ProjectSummary`        | `project:write`    | `project-lifecycle-design.md` + `business-authorization-matrix.md` | `aligned` |
| `PATCH /projects/{id}` / `ProjectController.updateBasicInfo` | `ProjectService.updateBasicInfo`   | `UpdateProjectBasicInfoRequest` | `ProjectSummary`        | `project:write`    | `business-authorization-matrix.md`                                 | `aligned` |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects`、`POST /projects`、`PATCH /projects/{id}`
- Current implemented route(s): `GET /projects`、`POST /projects`、`PATCH /projects/:id`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-15E4`
- Blocker / exception: 无 route blocker；本片的主要风险在 query / command / persistence / generated client 对齐

## 5. 读侧边界

| Query / View      | Consumer                    | Fields                                                                                                                                      | Filter / Sort                                                                         | Permission Boundary                  | Design Source                                               | Result    |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------- | --------- |
| `ProjectListView` | `/projects`、工作台近期项目 | `id`、`projectCode`、`projectName`、`customerName`、`currentStage`、`status`、`ownerOrgName`、`ownerName`、`latestMilestoneAt`、`createdAt` | `status`、`currentStage`、`ownerOrgId`、`keyword`；排序先按最近关键节点，其次更新时间 | `nav:projects:view` + `project:read` | `query-view-boundary-design.md` + `phase2-user-task-map.md` | `aligned` |

## 6. 持久化边界

| Table          | Migration                                                           | Entity / Repository | DDL / Freeze Source               | Check Result |
| -------------- | ------------------------------------------------------------------- | ------------------- | --------------------------------- | ------------ |
| `poms.project` | `Migration20260421110000_ex17_project_list_and_create_semantics.ts` | `Project`           | `project-lifecycle-design.md` §11 | `passed`     |

| Field          | Design Type / Meaning      | Migration / DDL                                | Entity                 | Shared Contract / OpenAPI                                                                                                                        | Result    |
| -------------- | -------------------------- | ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `customerName` | 面向业务展示的客户名称事实 | 新增 `project.customer_name varchar(255) null` | `Project.customerName` | `ProjectSummary.customerName`、`ProjectListView.customerName`、`CreateProjectRequest.customerName`、`UpdateProjectBasicInfoRequest.customerName` | `aligned` |
| `currentStage` | 正式生命周期阶段           | 保持现有列                                     | `Project.currentStage` | `CreateProjectRequest.currentStage?` 仅允许正式阶段枚举                                                                                          | `aligned` |
| `status`       | 正式推进状态               | 保持现有列                                     | `Project.status`       | 创建命令不再允许客户端提交；服务端默认 `active`                                                                                                  | `aligned` |

## 7. 一致性结论

- Document -> code: 当前 `ProjectListView`、项目创建命令与现有实现存在实质漂移。
- ADR-015 inventory -> route: 对齐，无新增 route surface。
- Migration -> entity: 当前缺 `customerName`，需补 migration 与 entity。
- Entity -> contract: 当前 `ProjectSummary` / `ProjectList` 仍暴露旧语义，需切换。
- Route -> command: `POST /projects` 当前把 legacy pipeline 与 owner / audit 直通服务端，需收口。
- Query -> view: 当前 `/projects` 不能回答客户、负责人、最近节点等关键信息。
- Guard / permission: 本片只收口后端 permission 与 contract；前端 route/button guard 留给 `FE-16D`。
- OpenAPI / generated client: 预期发生变化，属于本片目标输出。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                           | Result | Gap / Reason                                                                       |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Lint                             | `yes`    | `corepack pnpm nx lint poms-api`、`corepack pnpm nx lint admin-data-access`、`corepack pnpm nx lint poms-admin`                              | `pass` | 已通过                                                                             |
| Build                            | `yes`    | `corepack pnpm nx build poms-api`、`corepack pnpm nx build poms-admin`                                                                       | `pass` | 已通过                                                                             |
| Unit tests                       | `yes`    | `corepack pnpm nx test poms-api --runInBand`、`corepack pnpm nx test poms-admin --runInBand`                                                 | `pass` | 已覆盖 project controller / service / query service 与 admin 现有 consumer         |
| API / integration tests          | `yes`    | `project.controller.spec.ts`、`project.service.spec.ts`、`project-query.service.spec.ts` 均纳入 `corepack pnpm nx test poms-api --runInBand` | `pass` | 已通过                                                                             |
| E2E                              | `yes`    | `$env:PORT='3345'; corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=authorization.e2e-spec.ts`                            | `pass` | 本地端口冲突下显式改用 `3345`；Jest 实际执行全量 `11 suites / 68 tests` 并全部通过 |
| OpenAPI generation / client diff | `yes`    | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check`   | `pass` | 已通过                                                                             |
| Migration / schema check         | `yes`    | `corepack pnpm nx run poms-api:migration-up`、`corepack pnpm nx run poms-api:migration-check`、`corepack pnpm nx run poms-api:seeder-run`    | `pass` | migration 与 dev seed 已同步                                                       |
| Diff hygiene                     | `yes`    | `git diff --check`                                                                                                                           | `pass` | 通过；当前仅剩 Git 的 CRLF 预警，不构成 diff 错误                                  |

## 9. 例外与风险

| Exception ID             | Level | Scope                                                 | Approved By                | Cleanup Owner | Cleanup Due       | Notes                                                                                                                            |
| ------------------------ | ----- | ----------------------------------------------------- | -------------------------- | ------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `EX17-E2-LEAD-BOOTSTRAP` | `E2`  | 当前阶段仍缺正式 `Lead` 对象与 `Project` 创建前置校验 | `Solo worktree checkpoint` | `Codex`       | `Lead` 切片启动时 | 本片只把 `POST /projects` 收口为“默认进入 `assessment` 的正式项目 bootstrap create”，不宣称它已替代 `Lead -> Project` 正式转化链 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-21`
- Conditions:
  1. 必须同时回写 shared contract、OpenAPI、generated client、migration、seed 数据和相关测试。
  2. `latestMilestoneAt` 只能消费真实关键节点事实；若没有稳定来源可返回 `null`，不得伪造。
  3. `Lead` 前置缺口通过 `EX17-E2-LEAD-BOOTSTRAP` 显式记录，不得在代码或文档中静默忽略。

## 11. G4 Close-out

- Close-out Date: `2026-04-21`
- Result: `Pass`
- Delivered:
  1. `GET /projects` 已正式切换为 `ProjectListView[]`，并由独立 `ProjectQueryService` 组装客户、负责人、组织与最近关键节点事实。
  2. `POST /projects` / `PATCH /projects/{id}` 已收口为正式项目创建 / 基础信息维护语义，不再接受 `status / owner* / createdBy / updatedBy` 等 body 覆盖字段。
  3. `Project.customerName`、migration、seed、shared contract、OpenAPI、generated client、admin consumer 与 e2e bootstrap helper 已全部同步。
  4. `FE-16A` 的后端前置阻塞已关闭，但 `Lead -> Project` 正式转化链仍保留在 `EX17-E2-LEAD-BOOTSTRAP`。
