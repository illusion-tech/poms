# FE-42 前端权限与敏感字段可见性回归矩阵实施基线包

- Task ID: `FE-42`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-42`
- Upstream: `FE-39`、`FE-40`、`FE-41`

---

## 1. 背景

`FE-39` 到 `FE-41` 已分别完成工作台待办入口、提成待办深链和合同列表 TableDemo 基线。当前还缺一片横向回归，确认正式前端入口在不同身份下的可见性没有漂移：

1. admin 可以通过菜单进入正式业务入口。
2. viewer 只能看到只读业务入口，不能看到线索和平台管理入口。
3. anonymous 访问受保护 route 时必须保留 returnUrl。
4. 经营金额、合同金额和提成金额等敏感值不能因为 `project:read` 或 `nav:contracts:view` 而直接暴露在前端页面。

---

## 2. G1 范围

### In Scope

1. 建立 frontend permission / visibility Playwright matrix，覆盖：
   - 工作台；
   - 项目；
   - 合同；
   - 线索；
   - 提成 operations / L4 finance route。
2. 校验 admin / viewer / anonymous 三类身份：
   - admin 能看到并进入关键正式入口；
   - viewer 只能看到工作台、项目、合同和个人入口，不能看到线索 / 平台管理入口；
   - viewer direct URL 进入受限页面时跳到 `/auth/access`；
   - anonymous direct URL 进入受保护页面时跳到 `/auth/login` 并保留 returnUrl。
3. 前端 UI 对经营金额类敏感值增加统一可见性 helper：
   - 使用现有 `contract:finance:manage` 作为当前前端字段可见性开关；
   - 无该权限时展示统一遮罩文案；
   - 有该权限时展示原金额。
4. 至少覆盖合同列表和项目详情里的签约金额展示；若同一入口链还有合同承接页金额摘要，应同步遮罩。
5. 修复现有 E2E spec 中会阻断本矩阵补跑的项目编号 helper 命名漂移。
6. 补 focused component tests 和 targeted Playwright E2E。

### Out Of Scope

1. 不新增后端 API、DTO、generated client、permission key 或 DDL。
2. 不实现完整后端字段级脱敏投影；后端仍是最终可信授权源，字段级后端投影另需独立治理切片。
3. 不改变 `/contracts` 的 route guard；本片只让合同入口可读、金额不可越权展示。
4. 不改变提成 operations 业务命令、待办深链 query params 或行级上下文。
5. 不改变数据范围权限、组织范围过滤或导出审计模型。

---

## 3. 正式输入

| 输入             | 文件 / 证据                                                 | 当前事实                                                                                                  | FE-42 使用方式                          |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Tracker          | `phase2-development-execution-tracker.md`                   | `FE-42` 已由 `FE-38` 创建为 `Todo / G0`。                                                                 | 本基线通过后转为 `Doing / G1`。         |
| Route tree       | `apps/poms-admin/src/app.routes.ts`                         | 工作台仅需登录；项目 / 合同 route 当前用 `project:read`；线索用 `lead:read`；L4 / L5 敏感页使用组合权限。 | 固定浏览器矩阵的 route 期望。           |
| Dynamic nav      | `navigation.constants.ts`、`dev-platform.fixtures.ts`       | viewer 具备 `nav:dashboard:view`、`nav:projects:view`、`nav:contracts:view`，不具备 `nav:leads:view`。    | 校验菜单可见性。                        |
| Permission guard | `permission.guard.ts`、`app.routes.spec.ts`                 | `requiredPermissionsMode = all` 已支持组合权限。                                                          | 校验 direct URL 拒绝行为。              |
| FE-39 / FE-40    | `workbench-todo-entry.journey.spec.ts`                      | 提成待办可从工作台 / 顶栏进入 operations 并携带行级上下文。                                               | FE-42 只补权限拒绝和 anonymous return。 |
| FE-41            | `contract-list.ts`、`contract-management.journey.spec.ts`   | 合同列表是正式菜单入口，当前显示签约金额。                                                                | 增加金额可见性遮罩和回归。              |
| Data permission  | `phase2-data-permission-and-sensitive-visibility-design.md` | 合同金额、经营金额、提成金额默认属于敏感字段控制范围。                                                    | 当前用前端 UI 遮罩作为 FE-42 最小闭环。 |

---

## 4. 当前权限与敏感字段判定

| Surface                             | Admin                                                         | Viewer                                                           | Anonymous          |
| ----------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------ |
| `/dashboard`                        | 可进入                                                        | 可进入                                                           | 登录页 + returnUrl |
| `/projects` / `/projects/:id`       | 可进入                                                        | 可进入；经营金额类字段应遮罩                                     | 登录页 + returnUrl |
| `/contracts`                        | 可进入；签约金额可见                                          | 可进入；签约金额遮罩；新建合同入口隐藏                           | 登录页 + returnUrl |
| `/leads`                            | 可进入                                                        | 菜单不可见；direct URL 到 `/auth/access`                         | 登录页 + returnUrl |
| L4 finance pages                    | 可进入                                                        | direct URL 到 `/auth/access`                                     | 登录页 + returnUrl |
| `/projects/:id/commission/*` 操作页 | 具备完整提成权限时可进入 operations；提成金额和行级上下文可见 | 缺提成组合权限时 operations / final-settlement / rule 被拒绝访问 | 登录页 + returnUrl |

---

## 5. UI 与交互边界

1. 遮罩文案统一为 `经营敏感字段已隐藏`。
2. 遮罩不是删除字段；字段存在但不可见，避免用户误判为数据缺失。
3. 可见性 helper 只放在 admin 前端共享 UI 层，不新造 wire contract。
4. admin 与具备 `contract:finance:manage` 的用户继续看到原金额。
5. viewer 可以进入合同列表用于协作锚点，但不能看到签约金额或新建合同入口。

---

## 6. 文件影响范围

Expected runtime files:

1. `apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts`
2. `apps/poms-admin/src/app/features/contract/contract-list.ts`
3. `apps/poms-admin/src/app/features/contract/contract-detail.ts`
4. `apps/poms-admin/src/app/features/project/project-detail.ts`
5. `apps/poms-admin/src/app/features/project/project-contract-handover.ts`
6. Focused component specs for touched components
7. `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`
8. `apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`

Expected docs:

1. `docs/design/archive/slices/fe-41-contract-list-tabledemo-g3-g4-closeout.md`
2. `docs/design/archive/slices/fe-42-frontend-permission-visibility-baseline.md`
3. `docs/design/archive/slices/fe-42-frontend-permission-visibility-g3-checkpoint.md`
4. `docs/design/phase2-development-execution-tracker.md`
5. `docs/design/poms-design-progress.md`

---

## 7. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. Focused component tests for touched sensitive field visibility.
4. `corepack pnpm nx lint poms-admin`
5. `corepack pnpm nx build poms-admin`
6. Targeted Playwright E2E covering:
   - viewer 菜单只显示允许入口；
   - admin / viewer 合同列表金额可见性差异；
   - viewer direct URL 对线索、经营页、提成 operations 的拒绝；
   - anonymous direct URL 对合同、提成 operations 的 returnUrl。

Not required unless implementation touches the corresponding layer:

1. `shared-api-client:check`：不改 API / generated client。
2. `poms-api` lint / build / test：不改后端。
3. `migration-check`：不改 DDL。

---

## 8. 例外与风险

| ID                                  | Level  | Scope                  | Owner | Cleanup Due              | Decision                                                                                    |
| ----------------------------------- | ------ | ---------------------- | ----- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `FE42-R1-FRONTEND-MASKING-LIMITED`  | Medium | Sensitive field source | Codex | 后端字段级投影治理切片   | Accepted for FE-42：本片只保证前端可见面不越权展示；后端 DTO 仍可能返回原始字段。           |
| `FE42-R2-CONTRACT-ROUTE-READ-SCOPE` | Low    | Contract route guard   | Codex | 合同读侧权限模型演进切片 | Accepted for FE-42：`/contracts` 继续用 `project:read` 作为协作入口，金额用字段可见性遮罩。 |

---

## 9. G1 结论

`FE-42` 可以进入 frontend implementation。

冻结条件：

1. 不新增后端接口、DTO、generated client、permission key 或 DDL。
2. 经营金额字段用统一 helper 和 `contract:finance:manage` 控制前端可见性。
3. 浏览器矩阵必须覆盖 admin / viewer / anonymous，而不只测 direct URL。
4. 后端字段级脱敏缺口必须作为 accepted boundary 留痕，不在本片中伪装为已完成。
