# FE-05 前端工作区 E2E 与权限可见性验证实施基线包

- Gate Status: `Pass`
- Parent: `FE-00`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-05`

## 1. 范围

- 本次目标:
  1. 为前端工作区主入口、`L4` 读取页、`L5` 闸口解释页和提成操作页建立 E2E 与 guard 证据。
  2. 验证 viewer / admin 在工作区中的真实可见性边界。
  3. 留痕“哪些页面只能读、哪些页面可操作、哪些页面应被拦住”。
  4. 把工作区验证分成 `smoke` 与 `journey` 两层，避免只剩 URL 直达证明。
- 本次明确不做:
  1. 不扩大为全站 E2E 重跑计划。
  2. 不把后端业务 E2E 重复写一遍。
  3. 不在本片新增新的权限模型或角色。
- 下游可依赖的交付边界:
  1. 工作区主入口、项目列表行菜单 / 项目详情按钮入口、直接路由访问、权限拒绝与关键文本链路有浏览器级证据。
  2. `permissionGuard` 的 all-mode 行为有单测证据。
  3. viewer / admin 对应边界与工作区内部真实跳转链可用于后续评审。
- 不允许下游依赖的留白:
  1. 不允许只凭 UI 隐藏按钮而没有真实路由 guard。
  2. 不允许只凭 guard 而没有浏览器级可见性证据。

## 2. 正式输入

| Input Type          | Document / Source                                              | Section / Anchor | Status   | Notes                                                 |
| ------------------- | -------------------------------------------------------------- | ---------------- | -------- | ----------------------------------------------------- |
| Permission design   | `phase2-data-permission-and-sensitive-visibility-design.md`    | 全文             | Accepted | 冻结页面与字段的可见边界                              |
| Business design     | `phase2-lifecycle-experience-blueprint.md`                     | 项目主上下文     | Accepted | 确认工作区主入口必须可从项目页进入                    |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`       | 全文             | Pass     | 本片承接 `G3` 前的可见性验证                          |
| Governance baseline | `fe-01-project-workspace-shell-routing-baseline.md`            | 全文             | Pass     | 验证内部路由骨架                                      |
| Governance baseline | `fe-02-l4-operating-overview-variance-baseline.md`             | 全文             | Pass     | 验证 `L4` 读取链路                                    |
| Governance baseline | `fe-03-l5-commission-gate-overview-baseline.md`                | 全文             | Pass     | 验证 `L5` 闸口解释链路                                |
| Runtime fact        | `apps/poms-admin-e2e/src/support/auth.ts`、DatabaseSeeder 夹具 | 2026-04-18       | Fact     | 已有 `admin` / `viewer` 用户和 `EX-13` 项目夹具可复用 |

## 3. 本次 SSOT

| Concern        | SSOT                                         | Implementation Rule                           |
| -------------- | -------------------------------------------- | --------------------------------------------- |
| 工作区入口     | 项目列表行菜单 / 项目详情按钮 + 直接路由进入 | 三种入口都必须验证                            |
| 财务读取页权限 | `project:read + contract:finance:manage`     | viewer 不得直接进入 `L4` 读取页与 gate 解释页 |
| 提成操作页权限 | `project:read + commission:*:manage`         | 没有完整 manage 权限时必须被 guard 拦住       |
| 可见性证据     | unit + Playwright smoke + Playwright journey | 仅 UI 隐藏或仅单测都不够                      |
| 敏感字段边界   | 权限设计文档 + 实际页面表现                  | 需验证受限用户看不到受限页面                  |

## 4. 命令与接口边界

| Route / Controller                           | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission                       | Design Source | Result |
| -------------------------------------------- | ----------------- | ---------------------- | ----------------------- | ---------------------------------------- | ------------- | ------ |
| `/projects/:id/workspace`                    | `permissionGuard` | `N/A`                  | `N/A`                   | `project:read`                           | `FE-01`       | Frozen |
| `/projects/:id/workspace/operating-overview` | `permissionGuard` | `N/A`                  | `N/A`                   | `project:read + contract:finance:manage` | `FE-02`       | Frozen |
| `/projects/:id/workspace/variance-risk`      | `permissionGuard` | `N/A`                  | `N/A`                   | `project:read + contract:finance:manage` | `FE-02`       | Frozen |
| `/projects/:id/commission/gate-overview`     | `permissionGuard` | `N/A`                  | `N/A`                   | `project:read + contract:finance:manage` | `FE-03`       | Frozen |
| `/projects/:id/commission/operations`        | `permissionGuard` | `N/A`                  | `N/A`                   | `project:read + commission:*:manage`     | `FE-01`       | Frozen |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `N/A`
- Canonical route(s): `N/A`
- Current implemented route(s): `N/A`
- Inventory status: `N/A`
- Route governance source: `N/A`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View                | Consumer          | Fields                                                        | Filter / Sort    | Permission Boundary                | Design Source                                               | Result |
| --------------------------- | ----------------- | ------------------------------------------------------------- | ---------------- | ---------------------------------- | ----------------------------------------------------------- | ------ |
| `permission.guard` all-mode | 路由 guard        | 所有 requiredPermissions 必须同时满足                         | `N/A`            | 真实路由边界                       | `phase2-data-permission-and-sensitive-visibility-design.md` | Frozen |
| 工作区 smoke E2E            | admin / anonymous | 项目详情按钮入口、直接路由、关键解释文本、returnUrl           | 固定 seeded 项目 | admin 全可见 / anonymous returnUrl | `FE-01`、`FE-02`、`FE-03`                                   | Frozen |
| 工作区 journey E2E          | admin             | 左侧菜单 -> 项目列表行菜单 -> 工作区 -> 内部链接 / 按钮跳转链 | 固定 seeded 项目 | admin 全可见                       | `FE-01`、`FE-02`、`FE-03`                                   | Frozen |
| 受限访问 E2E                | viewer            | 项目列表入口、主壳层可见、财务读取页 / 操作页受限             | 固定 seeded 项目 | viewer 仅 `project:read`           | 权限设计文档                                                | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source  | Check Result |
| ----- | --------- | ------------------- | -------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不改 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: 权限边界已转为明确的路由与验证矩阵，不再停留在口头约束。
- ADR-015 inventory -> route: `N/A`，只验证前端内部路由。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: 不涉及 command。
- Query -> view: 本片只验证 UI 链路，不新增查询协议。
- Guard / permission: `requiredPermissionsMode = all` 是本片的真边界，必须有单测与 E2E 双证据。
- OpenAPI / generated client: 不改。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                 | Result  | Gap / Reason                |
| -------------------------------- | -------- | -------------------------------------------------- | ------- | --------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`                 | Pending | `G3` 统一执行               |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                | Pending | `G3` 统一执行               |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand`     | Pending | 至少覆盖 `permission.guard` |
| API / integration tests          | No       | `N/A`                                              | N/A     | 不改 API                    |
| E2E                              | Yes      | `poms-admin-e2e` 工作区 smoke + journey + 权限拒绝 | Pending | 本片核心证据                |
| OpenAPI generation / client diff | No       | `N/A`                                              | N/A     | 未改 contract               |
| Migration / schema check         | No       | `N/A`                                              | N/A     | 未改 persistence            |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                 |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | --------------------------------------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 若 E2E 依赖 fixture 不稳定，应先固化 seeder，不允许降级为手工截图证明 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `permission.guard` 的 all-mode 与页面真实表现必须一致。
  2. 工作区主入口、项目列表 / 项目详情真实入口、直接路由和权限拒绝四条链都要有证据。
  3. 本片未通过前，`FE-01 ~ FE-03` 都不能标记 `Done`。
