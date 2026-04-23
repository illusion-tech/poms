# FE-04 前端 data-access / store 补齐实施基线包

- Gate Status: `Pass`
- Parent: `FE-00`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-04`

## 1. 范围

- 本次目标:
  1. 在 admin data-access 层新增工作区读取 store / selector。
  2. 只基于 generated client DTO 派生页面可消费的前端状态，不再造第二套 wire contract。
  3. 统一管理 `L4 / L5` 第一批读取页的加载、空态与错误态。
- 本次明确不做:
  1. 不新增后端 DTO 或 generated client。
  2. 不把页面专属表现逻辑下沉成新的共享协议。
  3. 不在 store 层重算领域语义或阶段 gate 结论。
- 下游可依赖的交付边界:
  1. 项目工作区读取页共享一个稳定的数据访问入口。
  2. 页面使用相同的 404 / 空态 /权限缺失错误投影规则。
  3. `L4` 与 `L5` 第一批读取页的字段映射不分散到多个组件内。
- 不允许下游依赖的留白:
  1. 不允许页面直接散读多个 generated client 方法并各自拼错误态。
  2. 不允许 store 层静默改写 generated client DTO 的业务语义。

## 2. 正式输入

| Input Type          | Document / Source                                           | Section / Anchor | Status   | Notes                                               |
| ------------------- | ----------------------------------------------------------- | ---------------- | -------- | --------------------------------------------------- |
| Business design     | `phase2-project-business-outcome-overview.md`               | `L4-T01`         | Accepted | 冻结经营总览页所需正式字段                          |
| Business design     | `phase2-project-unified-accounting-view-caliber.md`         | `L4-T02`         | Accepted | 冻结统一核算字段语义                                |
| Business design     | `phase2-project-variance-risk-explanation.md`               | `L4-T03`         | Accepted | 冻结偏差 / 风险解释字段                             |
| Business design     | `phase2-business-accounting-feedback-rules.md`              | `L4-T04`         | Accepted | 冻结反馈解释与下一步动作                            |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`    | 全文             | Pass     | 本片只为第一批读取页服务                            |
| Runtime fact        | `libs/shared/api-client`、`libs/admin/data-access` 现有模式 | 2026-04-18       | Fact     | 现有项目 / 平台 store 已提供 data-access 模式可复用 |

## 3. 本次 SSOT

| Concern  | SSOT                                   | Implementation Rule                          |
| -------- | -------------------------------------- | -------------------------------------------- |
| 数据来源 | generated client DTO                   | store 只消费现有 DTO，不重新定义接口         |
| 派生边界 | admin data-access 层                   | 页面所需的加载 / 空态 /错误态在 store 层统一 |
| 领域语义 | 上游 `L4 / L5` 设计文档 + DTO 字段语义 | store 不得重算阶段 gate 或改写动作等级       |
| 复用范围 | `FE-02` 与 `FE-03`                     | 第一批读取页共用同一 store                   |
| 测试责任 | 本片承担 selector / 派生状态单测       | 页面 E2E 由 `FE-05` 承接                     |

## 4. 命令与接口边界

| Route / Controller                                       | Command / Service                                                       | Request DTO / Contract | Response DTO / Contract              | Guard / Permission                       | Design Source | Result          |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- | ------------------------------------ | ---------------------------------------- | ------------- | --------------- |
| `GET /projects/{projectId}/business-outcome-overview`    | `ProjectCostApi.projectCostControllerGetProjectBusinessOutcomeOverview` | `projectId`            | `ProjectBusinessOutcomeOverviewView` | `project:read + contract:finance:manage` | `L4-T01`      | Frozen existing |
| `GET /projects/{projectId}/unified-accounting`           | `ProjectCostApi.projectCostControllerGetProjectUnifiedAccounting`       | `projectId`            | `ProjectUnifiedAccountingView`       | `project:read + contract:finance:manage` | `L4-T02`      | Frozen existing |
| `GET /projects/{projectId}/variance-risk-explanation`    | `ProjectCostApi.projectCostControllerGetProjectVarianceRiskExplanation` | `projectId`            | `ProjectVarianceRiskExplanationView` | `project:read + contract:finance:manage` | `L4-T03`      | Frozen existing |
| `GET /projects/{projectId}/business-accounting-feedback` | `ProjectCostApi.projectCostControllerGetBusinessAccountingFeedback`     | `projectId`            | `BusinessAccountingFeedbackView`     | `project:read + contract:finance:manage` | `L4-T04`      | Frozen existing |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): 沿用 `EX-13` 已实现四条 project-scoped 读取 route
- Current implemented route(s): 同 canonical route
- Inventory status: `aligned`
- Route governance source: `EX-15G` + `EX-13B`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View                                       | Consumer         | Fields                                                       | Filter / Sort | Permission Boundary | Design Source       | Result |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------- | ------------------- | ------------------- | ------ |
| `ProjectWorkspaceStore.loadOperatingOverview`      | `FE-02`          | 经营总览 + 统一核算组合读取、loading、error、404 empty state | 单项目只读    | 与页面一致          | `L4-T01` + `L4-T02` | Frozen |
| `ProjectWorkspaceStore.loadVarianceRisk`           | `FE-02`          | 偏差风险读取、loading、error、404 empty state                | 单项目只读    | 与页面一致          | `L4-T03`            | Frozen |
| `ProjectWorkspaceStore.loadCommissionGateOverview` | `FE-03`          | 阶段闸口解释读取、loading、error、404 empty state            | 单项目只读    | 与页面一致          | `L4-T04`            | Frozen |
| Store selector / signal                            | `FE-02`、`FE-03` | `has*`、error 文案、空态文案                                 | `N/A`         | 与页面一致          | `FE-00`             | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source           | Check Result |
| ----- | --------- | ------------------- | ----------------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 前端 store 不触达 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: store 只承接 `L4 / L5` 第一批读取页正式字段，不扩写新协议。
- ADR-015 inventory -> route: 所有后端读取接口均已在 inventory 对齐。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: 无新增 command。
- Query -> view: store 负责聚合读取与前端投影，不改写后端 query 语义。
- Guard / permission: store 不单独越权；路由和页面 guard 仍是权限真边界。
- OpenAPI / generated client: 明确禁止新建“前端专用 API contract”。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                  | Result  | Gap / Reason          |
| -------------------------------- | -------- | ----------------------------------- | ------- | --------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`  | Pending | `G3` 统一执行         |
| Build                            | Yes      | `corepack pnpm nx build poms-admin` | Pending | `G3` 统一执行         |
| Unit tests                       | Yes      | store / selector 派生逻辑单测       | Pending | 本片必须补            |
| API / integration tests          | No       | `N/A`                               | N/A     | 不改 API              |
| E2E                              | Indirect | 由页面链路覆盖                      | Pending | 由 `FE-05` 承担       |
| OpenAPI generation / client diff | No       | `N/A`                               | N/A     | 未改 generated client |
| Migration / schema check         | No       | `N/A`                               | N/A     | 未改 persistence      |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                    |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 无额外例外；如接口缺失应回到后端治理切片 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. store / selector 的派生逻辑必须补单测。
  2. 错误态与空态文案必须集中在 data-access 层，不在页面重复各写一套。
  3. 不得把本片扩写成新的跨项目状态容器；范围只限单项目工作区读取。
