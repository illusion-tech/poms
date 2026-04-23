# FE-01 项目级工作区壳层、导航与路由骨架实施基线包

- Gate Status: `Pass`
- Parent: `FE-00`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-01`

## 1. 范围

- 本次目标:
  1. 建立 `/projects/:id/...` 项目级连续工作区壳层。
  2. 把工作区主入口、`L4` 读取页与 `L5` 提成操作 / 闸口解释页接入统一导航骨架。
  3. 从项目列表页、项目详情页提供进入工作区的稳定入口。
- 本次明确不做:
  1. 不新增 `L1` / `L3` 工作区壳层。
  2. 不在本片实现最终结算页或规则解释页。
  3. 不改后端导航事实源或 public API route。
- 下游可依赖的交付边界:
  1. 工作区壳层、面包屑、标签、项目级导航标签页结构稳定。
  2. `L4` 与 `L5` 第一批读取 / 操作页有稳定内部路由归属。
  3. 项目页进入工作区的入口不再依赖手工拼 URL。
- 不允许下游依赖的留白:
  1. 不允许把现有 `commission` 操作页继续同时承担“阶段解释页”职责。
  2. 不允许把对象详情页继续当作连续工作区的唯一主入口。

## 2. 正式输入

| Input Type          | Document / Source                                           | Section / Anchor | Status   | Notes                                              |
| ------------------- | ----------------------------------------------------------- | ---------------- | -------- | -------------------------------------------------- |
| Business design     | `phase2-lifecycle-experience-blueprint.md`                  | 项目主体验链     | Accepted | 项目连续工作区为主上下文                           |
| Business design     | `phase2-user-task-map.md`                                   | §6, §7           | Accepted | 导航应围绕任务链而不是对象表结构                   |
| Business design     | `phase2-project-business-outcome-overview.md`               | §2, §3           | Accepted | `L4` 页默认回答“当前阶段 / 下一步 / 缺口 / 责任人” |
| Business design     | `phase2-commission-stage-gate-overview-workspace.md`        | §2, §3           | Accepted | `L5` 闸口解释页与操作页分离                        |
| Permission design   | `phase2-data-permission-and-sensitive-visibility-design.md` | 全文             | Accepted | 冻结内部路由的权限边界                             |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`    | 全文             | Pass     | 本片受 `FE-00` 统领                                |
| Runtime fact        | `apps/poms-admin/src/app.routes.ts`、项目列表 / 详情现状    | 2026-04-18       | Fact     | 当前工作树已具备可演进入口点                       |

## 3. 本次 SSOT

| Concern          | SSOT                                                       | Implementation Rule                              |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| 项目级主上下文   | `/projects/:id/workspace` 与 `/projects/:id/commission`    | 工作区从项目上下文展开，不再从对象详情页拼接体验 |
| 操作页 vs 解释页 | `commission/operations` 与 `commission/gate-overview` 分离 | 现有操作页不再兼任阶段解释总览                   |
| 默认信息框架     | 当前阶段 / 下一步 / 缺口 / 责任人                          | 壳层与入口页必须统一这一投影结构                 |
| 权限分层         | 壳层入口、财务读取、提成操作分别鉴权                       | UI 可见性与实际路由 guard 必须一致               |
| 内部路由冻结     | 本片所列工作区内部路径                                     | 后续页面只能落在已冻结的内部路由结构上继续扩展   |

## 4. 命令与接口边界

| Route / Controller                           | Command / Service  | Request DTO / Contract | Response DTO / Contract | Guard / Permission                       | Design Source                                        | Result |
| -------------------------------------------- | ------------------ | ---------------------- | ----------------------- | ---------------------------------------- | ---------------------------------------------------- | ------ |
| `/projects/:id/workspace`                    | 前端壳层路由       | `N/A`                  | `N/A`                   | `project:read`                           | `phase2-lifecycle-experience-blueprint.md`           | Frozen |
| `/projects/:id/workspace/operating-overview` | 前端读取页路由     | `N/A`                  | `N/A`                   | `project:read + contract:finance:manage` | `phase2-project-business-outcome-overview.md`        | Frozen |
| `/projects/:id/workspace/variance-risk`      | 前端读取页路由     | `N/A`                  | `N/A`                   | `project:read + contract:finance:manage` | `phase2-project-variance-risk-explanation.md`        | Frozen |
| `/projects/:id/commission/gate-overview`     | 前端解释页路由     | `N/A`                  | `N/A`                   | `project:read + contract:finance:manage` | `phase2-commission-stage-gate-overview-workspace.md` | Frozen |
| `/projects/:id/commission/operations`        | 既有提成操作页路由 | `N/A`                  | `N/A`                   | `project:read + commission:*:manage`     | `commission-settlement-design.md`                    | Frozen |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `N/A`
- Canonical route(s): `N/A`
- Current implemented route(s): `N/A`
- Inventory status: `N/A`
- Route governance source: `N/A`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View        | Consumer                           | Fields                                       | Filter / Sort | Permission Boundary            | Design Source                              | Result |
| ------------------- | ---------------------------------- | -------------------------------------------- | ------------- | ------------------------------ | ------------------------------------------ | ------ |
| 工作区壳层 header   | 项目负责人、项目状态标签、快速入口 | 项目名称、编码、当前阶段、状态、主要跳转按钮 | 单项目上下文  | `project:read`                 | `phase2-lifecycle-experience-blueprint.md` | Frozen |
| 工作区首页          | 进入各工作区的解释性入口           | 当前阶段、下一步、缺口、责任人、范围说明     | 单项目上下文  | `project:read`，按钮按权限降级 | `phase2-user-task-map.md`                  | Frozen |
| 项目列表 / 详情入口 | 项目页进入工作区                   | 显式工作区入口按钮或菜单项                   | 单项目上下文  | 与项目页一致                   | `FE-00`                                    | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source    | Check Result |
| ----- | --------- | ------------------- | ---------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不触达 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: 工作区壳层现在有明确 `G1` 载体，不再直接凭设计大文档开工。
- ADR-015 inventory -> route: 本片只涉及前端内部路由，不触达 public route surface。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: 仅冻结前端内部路由与页面归属，不新增后端 command。
- Query -> view: 本片为壳层 / 导航，不承载新的领域计算。
- Guard / permission: 壳层与子页权限边界已拆开；壳层入口不等于财务读取权或提成操作权。
- OpenAPI / generated client: 没有新增 contract 依赖。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                  | Result  | Gap / Reason           |
| -------------------------------- | -------- | ----------------------------------- | ------- | ---------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`  | Pending | `G3` 执行时统一校验    |
| Build                            | Yes      | `corepack pnpm nx build poms-admin` | Pending | `G3` 执行时统一校验    |
| Unit tests                       | No       | `N/A`                               | N/A     | 本片不单独要求组件单测 |
| API / integration tests          | No       | `N/A`                               | N/A     | 不触达 API             |
| E2E                              | Yes      | 项目页进入工作区、直接路由访问      | Pending | 由 `FE-05` 执行        |
| OpenAPI generation / client diff | No       | `N/A`                               | N/A     | 未改 public contract   |
| Migration / schema check         | No       | `N/A`                               | N/A     | 未改 persistence       |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                    |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 无额外例外；继承 `FE-00` 的本地 WIP 限制 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 工作区首页、壳层与项目页入口必须一起验证，不接受只落子页不落主入口。
  2. `commission/operations` 与 `commission/gate-overview` 的角色边界不得重新混合。
  3. 本片进入 `Done` 前必须完成路由与入口的 E2E 证明。
