# FE-16D 项目页路由守卫与浏览器权限矩阵收口实施基线

- Gate Status: `Pass`
- Parent: `FE-16`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-22`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-16D`

## 1. 范围

- 本次目标:
  1. 为 `/projects` 与 `/projects/:id` 补齐显式 `project:read` 路由守卫，避免只依赖菜单可见性或后端接口 403。
  2. 保持 `/projects/:id/workspace`、`/projects/:id/commission` 及其子路由现有业务权限矩阵，并补充静态路由断言。
  3. 将拒绝访问页改为业务中文，用户只看到“无权访问、怎么回去、找谁处理”，不显示英文或技术术语。
  4. 更新项目工作区 Playwright 用例，使列表入口、详情入口、工作区入口、直接 URL 和 viewer/admin 权限矩阵与 `FE-16A/B/C` 当前实现一致。
  5. 对项目列表、详情、工作区、提成入口的浏览器级权限结果形成验证证据。
- 本次明确不做:
  1. 不新增、修改或删除 public API route、shared contract、OpenAPI schema 或 generated client。
  2. 不改后端权限模型、角色种子或组织授权。
  3. 不重做项目列表、项目详情、工作区首页或提成子页信息架构；这些分别由 `FE-16A/B/C` 和后续提成壳层纠偏负责。
  4. 不把 navigation permission 当作业务路由权限；`nav:*` 只控制菜单可见性，页面进入仍使用业务权限。
- 下游可依赖的交付边界:
  1. `/projects`、`/projects/:id`、`/projects/:id/workspace`、`/projects/:id/commission` 均有明确前端 route guard。
  2. admin/full 权限可通过真实入口串起项目列表、详情、工作区、经营页和提成页。
  3. viewer/project-read 权限可进入项目列表、详情与工作区总览，但不能进入经营财务页和提成治理页。
  4. 未登录用户直接访问项目页会保留 returnUrl 并跳转登录。

## 2. 正式输入

| Input Type        | Document / Source                                                         | Status | Notes                                                            |
| ----------------- | ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Corrective source | `docs/design/fe-16-project-management-frontend-corrective-checkpoint.md`  | active | 项目主入口必须完成菜单、直接 URL、按钮守卫和业务中文收口         |
| Business auth     | `docs/design/business-authorization-matrix.md`                            | active | 项目读取、合同资金、提成治理权限边界                             |
| Permission rules  | `docs/reference/permission-catalog.md`                                    | active | `nav:*` 只控制菜单可见性，不替代 route/action 权限               |
| Data visibility   | `docs/design/phase2-data-permission-and-sensitive-visibility-design.md`   | active | viewer/admin 可见性与敏感动作边界                                |
| FE baseline       | `docs/design/fe-16a-project-list-entry-create-frontend-baseline.md`       | done   | 列表入口和创建体验已重做                                         |
| FE baseline       | `docs/design/fe-16b-project-detail-business-actions-frontend-baseline.md` | done   | 详情页和对象动作已按 `allowedActions` 收口                       |
| FE baseline       | `docs/design/fe-16c-project-workspace-home-guidance-frontend-baseline.md` | done   | 工作区首页已消费 `ProjectWorkspaceGuidanceView`                  |
| Runtime fact      | `apps/poms-admin/src/app.routes.ts`                                       | fact   | `/projects` 与 `/projects/:id` 当前缺少显式 `project:read` guard |
| Runtime fact      | `apps/poms-admin/src/app/features/auth/access.ts`                         | fact   | 当前拒绝访问页仍为英文                                           |
| Runtime fact      | `apps/poms-admin-e2e/src/project-workspace.*.spec.ts`                     | fact   | 当前浏览器用例仍引用旧菜单和旧禁用原因                           |

## 3. 本次 SSOT

| Concern            | SSOT                                              | Implementation Rule                                                |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------ |
| 菜单可见性         | 后端 navigation seed / `nav:projects:view`        | 只决定侧边栏是否展示“项目管理”                                     |
| 项目页 route guard | `project:read`                                    | `/projects`、`/projects/:id`、工作区壳层、提成壳层统一要求项目读取 |
| 财务经营子页       | `project:read + contract:finance:manage`          | 经营总览、偏差与风险必须 all-mode 守卫                             |
| 提成读取 / 发放页  | `project:read + commission:payouts:manage`        | 最终结算、规则解释必须 all-mode 守卫                               |
| 提成操作页         | `project:read + commission:*:manage`              | 操作页保留完整治理权限 all-mode 守卫                               |
| 详情按钮显隐       | `ProjectDetailView.allowedActions`                | 不用前端本地 permissions 推导对象动作                              |
| 工作区入口可用性   | `ProjectWorkspaceGuidanceView.recommendedEntries` | 禁用原因以后端 guidance 为准                                       |
| 拒绝访问文案       | FE-16 corrective checkpoint                       | 用户可见内容使用中文业务表达，不出现英文标题                       |

## 4. 命令与接口边界

| Route                                        | Required Permission                           | Mode  | Expected Result                        |
| -------------------------------------------- | --------------------------------------------- | ----- | -------------------------------------- |
| `/projects`                                  | `project:read`                                | `all` | 已登录且有项目读取权限可进入项目列表   |
| `/projects/:id`                              | `project:read`                                | `all` | 已登录且有项目读取权限可进入项目详情   |
| `/projects/:id/workspace`                    | `project:read`                                | `all` | 已登录且有项目读取权限可进入工作区总览 |
| `/projects/:id/workspace/operating-overview` | `project:read + contract:finance:manage`      | `all` | viewer 被拒绝，admin 可进入            |
| `/projects/:id/workspace/variance-risk`      | `project:read + contract:finance:manage`      | `all` | viewer 被拒绝，admin 可进入            |
| `/projects/:id/commission/gate-overview`     | `project:read + contract:finance:manage`      | `all` | viewer 被拒绝，admin 可进入            |
| `/projects/:id/commission/final-settlement`  | `project:read + commission:payouts:manage`    | `all` | viewer 被拒绝，admin 可进入            |
| `/projects/:id/commission/rule-explanation`  | `project:read + commission:payouts:manage`    | `all` | viewer 被拒绝，admin 可进入            |
| `/projects/:id/commission/operations`        | `project:read + commission governance manage` | `all` | viewer 被拒绝，admin 可进入            |

## 5. 一致性结论

- Document -> code:
  - `FE-16A/B/C` 已完成列表、详情和工作区首页实现；`FE-16D` 只补最终路由 / 浏览器矩阵闭环。
- Route -> guard:
  - `/projects` 与 `/projects/:id` 当前缺少显式 `project:read` guard，必须修复。
  - 工作区和提成子路由已有 guard，需用静态单测和 Playwright 重新锁定。
- Navigation -> route:
  - `nav:projects:view` 不能替代 `project:read`；菜单显示和页面进入是两层授权。
- Action -> button:
  - 详情页动作按钮继续依赖 `allowedActions`，本片只验证浏览器结果，不重写对象授权算法。
- User language:
  - 拒绝访问页英文属于 user-facing drift，必须关闭。

## 6. 测试与校验要求

| Check            | Required Command                               | Notes                                                   |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Admin unit tests | `corepack pnpm nx test poms-admin --runInBand` | 覆盖 route config、拒绝访问中文、既有项目页单测         |
| Admin lint       | `corepack pnpm nx lint poms-admin`             | Angular / template / style 检查                         |
| Admin build      | `corepack pnpm nx build poms-admin`            | 校验 route data 与 template 编译                        |
| Browser E2E      | `corepack pnpm nx e2e poms-admin-e2e`          | 项目列表、详情、工作区、直接 URL、viewer/admin 权限矩阵 |
| Diff hygiene     | `git diff --check`                             | 收口前必跑                                              |

## 7. 新增 / 调整测试点

| Test Target                         | Required Assertion                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `app.routes.spec.ts`                | `/projects` 和 `/projects/:id` 使用 `permissionGuard` + `project:read` + all-mode |
| `app.routes.spec.ts`                | 工作区和提成子路由保留 all-mode 组合权限                                          |
| `access.spec.ts`                    | 拒绝访问页显示“无权访问 / 返回工作台”，不显示英文标题                             |
| `project-workspace.smoke.spec.ts`   | anonymous 直接访问 `/projects` 和工作区保留 returnUrl                             |
| `project-workspace.smoke.spec.ts`   | viewer 可进入项目列表 / 详情 / 工作区总览，但被财务和提成治理页拒绝               |
| `project-workspace.journey.spec.ts` | admin 通过当前列表按钮进入工作区，不再依赖旧菜单                                  |

## 8. 例外与风险

| Exception ID                      | Level | Scope                                             | Cleanup Owner                  | Notes                                                |
| --------------------------------- | ----- | ------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `FE16D-E1-COMMISSION-SHELL-GUIDE` | `low` | `ProjectCommissionShell` 仍可能存在旧壳层说明方式 | 后续 commission shell 纠偏切片 | 本片验证其路由与入口链，不在本片重写提成壳层信息架构 |

- 风险:
  1. 如果只补菜单权限而不补 route guard，直接 URL 仍会漂移。
  2. 如果 route guard 使用 `nav:projects:view`，会把菜单权限误当业务访问权限。
  3. 如果 Playwright 继续使用旧菜单或旧禁用原因，会给已失效交互留下假阳性。

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-22`
- Conditions:
  1. 本片可以直接进入前端实现，不需要后端 API 或 contract 变更。
  2. `/projects` 与 `/projects/:id` 必须补 `project:read` all-mode route guard。
  3. 拒绝访问页必须业务中文化。
  4. E2E 必须更新到当前 `FE-16A/B/C` 的真实入口和禁用原因。
  5. 若发现角色种子或后端权限模型缺口，停止前端兜底并派生后端治理切片。

## 10. G3 / G4 收口

- Gate Status: `Pass`
- Closed By: `Codex`
- Closed At: `2026-04-22`

### 10.1 实现结果

- `/projects` 与 `/projects/:id` 已补齐 `permissionGuard`，统一要求 `project:read` + `requiredPermissionsMode = all`。
- 工作区壳层、提成壳层和子路由的组合权限保持 all-mode，并新增静态 route spec 锁定当前矩阵。
- 拒绝访问页已从英文改为业务中文：“无权访问 / 当前账号不能打开这个页面 / 返回工作台”。
- 提成壳层的用户可见标题、阶段标签和权限提示已改为更直接的业务中文；事实源迁移仍按 `FE16D-E1-COMMISSION-SHELL-GUIDE` 留给后续独立切片。
- 项目工作区 Playwright 已从旧操作菜单改为当前“详情 / 工作区”按钮路径，并按 `ProjectWorkspaceGuidanceView` 的当前禁用原因更新断言。
- seeded `E2E-OSG-FXT-MAIN` 项目处于“正式执行”，因此“最终结算”在工作区首页应显示“项目进入验收或完成阶段后再查看最终结算。”，不再被测试当作可点击入口。

### 10.2 验证证据

| Check                 | Command                                                             | Result | Evidence                                    |
| --------------------- | ------------------------------------------------------------------- | ------ | ------------------------------------------- |
| Admin unit tests      | `corepack pnpm nx test poms-admin --runInBand`                      | `pass` | 11 suites / 35 tests                        |
| Admin lint            | `corepack pnpm nx lint poms-admin`                                  | `pass` | All files pass linting                      |
| Admin build           | `corepack pnpm nx build poms-admin`                                 | `pass` | production build completed                  |
| Project workspace E2E | `corepack pnpm nx e2e poms-admin-e2e -- --grep "project workspace"` | `pass` | 7 passed                                    |
| Full admin E2E        | `corepack pnpm nx e2e poms-admin-e2e`                               | `pass` | 15 passed                                   |
| Diff hygiene          | `git diff --check`                                                  | `pass` | 2026-04-22 通过；命令输出保留既有 CRLF 提示 |

### 10.3 新增 / 调整测试覆盖

| Test Target                                                 | Coverage                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/poms-admin/src/app.routes.spec.ts`                    | 项目列表、详情、工作区、提成壳层和子路由权限矩阵                                   |
| `apps/poms-admin/src/app/features/auth/access.spec.ts`      | 拒绝访问页中文文案与英文文案清理                                                   |
| `apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`   | viewer 项目列表 / 详情 / 工作区访问，治理子页拒绝，anonymous `/projects` returnUrl |
| `apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` | admin 当前列表按钮进入工作区，最终结算按当前阶段禁用，viewer 当前禁用原因          |
| `apps/poms-admin-e2e/src/platform-governance.smoke.spec.ts` | 平台路由拒绝访问页中文断言                                                         |

### 10.4 G4 结论

- `FE-16D` 可标记为 `Done`。
- 下游可依赖项目列表 / 详情 / 工作区 / 提成壳层的前端 route guard 已按 `project:read` 与组合业务权限收口。
- 下游可依赖 admin、viewer、anonymous 三类浏览器路径已有 Playwright 证据。
- 仍不得把本片视为 `ProjectCommissionShell` 事实源彻底迁移；该壳层仍需后续独立纠偏以移除旧 helper 和本地权限推导。
