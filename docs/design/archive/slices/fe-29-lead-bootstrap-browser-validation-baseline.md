# FE-29 EX17-E2 浏览器验证与 G4 收口实施基线

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-e2e / validation`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-29`

## 1. 范围

- 本次目标:
  1. 用 Playwright 覆盖登录后从菜单进入 `/leads`。
  2. 用 Playwright 覆盖从项目列表按钮进入线索链路，而不是直接 Project create。
  3. 用 Playwright 覆盖 UI 创建线索、确认有效、转入项目、跳转项目详情和来源线索摘要。
  4. 覆盖 viewer 无权访问 `/leads`，anonymous 直接访问 `/leads` 保留 returnUrl。
  5. 形成 `EX17-E2-LEAD-BOOTSTRAP` 的最终关闭证据载体。
- 本次明确不做:
  1. 不新增业务 runtime 能力。
  2. 不删除后端 `POST /projects` legacy/dev/test route。
  3. 不扩大到全部项目工作区 E2E；只验证 Lead bootstrap 链路。
- 下游可依赖的交付边界:
  - 若 E2E 通过，前端正式用户路径可证明已从直接项目创建切到 Lead -> Project。
- 不允许下游依赖的留白:
  - 本片不证明所有角色矩阵，只证明 admin / viewer / anonymous 三类入口边界。

## 2. 正式输入

| Input Type          | Document / Source                                                                           | Section / Anchor                    | Status | Notes                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- | ------ | --------------------------------------------------------- |
| Parent exception    | `docs/design/archive/slices/ex-17-project-list-view-and-project-create-command-baseline.md` | `EX17-E2-LEAD-BOOTSTRAP`            | Open   | 本片目标是提供最终浏览器证据。                            |
| Backend runtime     | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g4-closeout.md`                | Delivered boundary                  | Pass   | Lead 转 Project API 已完成。                              |
| Frontend entry      | `docs/design/archive/slices/fe-27-lead-entry-list-frontend-g3-checkpoint.md`                | Local G3                            | Pass   | `/leads`、菜单和线索登记已完成。                          |
| Frontend conversion | `docs/design/archive/slices/fe-28-lead-to-project-frontend-g3-checkpoint.md`                | Local G3                            | Pass   | 转项目 UI、项目入口收口和来源线索摘要已完成。             |
| Browser E2E pattern | `apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`                                   | login / permission / direct URL     | Fact   | 复用登录和权限测试风格。                                  |
| Browser E2E pattern | `apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`                                 | menu / table / real-link navigation | Fact   | 复用从菜单和按钮进入的 journey 风格。                     |
| Auth account matrix | `apps/poms-admin-e2e/src/support/auth.ts`                                                   | admin / viewer                      | Fact   | `admin` 具备 Lead 权限；`viewer` 不具备 Lead route 权限。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                             | Implementation Rule                                             |
| --------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| Browser entry semantics     | `FE-27/28` G3                                    | 测试必须点击菜单或页面按钮，不只直接 URL。                      |
| Lead workflow semantics     | `EX-32`                                          | UI 链路必须走 create -> qualify -> convert。                    |
| Permission semantics        | `shared-contracts` permission keys + route guard | admin 可进入，viewer 到 `/auth/access`，anonymous 到 login。    |
| Project create UX closure   | `FE-28` G3                                       | 项目列表不得出现正式“新建项目”按钮。                            |
| Public route canonical path | `EX-30/32`                                       | 浏览器验证不新增 route，不绕过 `/leads/{id}:convertToProject`。 |

## 4. 命令与接口边界

| Route / Controller                      | Command / Service          | Request DTO / Contract        | Response DTO / Contract | Guard / Permission          | Design Source | Result |
| --------------------------------------- | -------------------------- | ----------------------------- | ----------------------- | --------------------------- | ------------- | ------ |
| `POST /api/leads`                       | UI create lead             | `CreateLeadRequest`           | `LeadSummary`           | `lead:write` UI + API guard | `FE-27`       | Pass   |
| `POST /api/leads/{id}:qualify`          | UI qualify lead            | `QualifyLeadRequest`          | `LeadSummary`           | `lead:write` UI + API guard | `FE-27`       | Pass   |
| `POST /api/leads/{id}:convertToProject` | UI convert lead to project | `ConvertLeadToProjectRequest` | `ProjectSummary`        | `lead:write` UI + API guard | `FE-28`       | Pass   |
| `GET /api/projects/{id}`                | project detail render      | `N/A`                         | `ProjectDetailView`     | `project:read` route guard  | `EX-32`       | Pass   |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing `Lead` and `Project` routes from `EX-30/32`
- Current implemented route(s): `/api/leads`, `/api/leads/{id}:qualify`, `/api/leads/{id}:convertToProject`, `/api/projects/{id}`
- Inventory status: `aligned`
- Route governance source: `EX-30` / `EX-32`
- Blocker / exception: none

## 5. 读侧边界

| Query / View        | Consumer                      | Fields                  | Filter / Sort | Permission Boundary | Design Source | Result |
| ------------------- | ----------------------------- | ----------------------- | ------------- | ------------------- | ------------- | ------ |
| `LeadListView[]`    | `/leads` table                | leadCode, status        | search table  | `lead:read`         | `FE-27`       | Pass   |
| `LeadDetailView`    | lead detail / converted state | convertedProjectSummary | by lead id    | `lead:read`         | `FE-28`       | Pass   |
| `ProjectDetailView` | project detail                | sourceLeadSummary       | by project id | `project:read`      | `EX-32`       | Pass   |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| `N/A` | `N/A`     | `N/A`               | `EX-31/32`          | 本片不改持久化。 |

## 7. 一致性结论

- Document -> code: `FE-29` 只补浏览器验证和治理收口。
- ADR-015 inventory -> route: 只使用已冻结 route。
- Route -> command: 由浏览器触发真实 UI，再经 generated client 调 API。
- Query -> view: 项目详情必须显示来源线索摘要。
- Guard / permission: admin / viewer / anonymous 三类路径必须有浏览器证据。
- OpenAPI / generated client: 不触碰。

## 8. 测试与校验

| Check                   | Required      | Command / Evidence                                                                                                                                                                        | Result       | Gap / Reason                               |
| ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------ |
| Admin E2E focused       | yes           | `corepack pnpm nx run poms-api:seeder-run`; `corepack pnpm exec playwright test apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | pending G3   | 本片核心证据，必须先刷新权限 / 导航 seed。 |
| E2E target smoke        | optional      | `corepack pnpm nx e2e poms-admin-e2e -- --grep "lead bootstrap"`                                                                                                                          | pending G3   | 若 focused 命令足够稳定可不跑全量。        |
| E2E lint                | if configured | `corepack pnpm nx run poms-admin-e2e:eslint:lint`                                                                                                                                         | pending G3   | 若 target 不存在，记录 Not configured。    |
| Admin lint / build      | no            | Existing `FE-28` evidence                                                                                                                                                                 | not required | 本片只加 E2E。                             |
| API E2E                 | no            | Existing `EX-32` evidence                                                                                                                                                                 | not required | 本片不改 API runtime。                     |
| Markdown / diff hygiene | yes           | `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                   | pending G3   | docs touched。                             |

## 9. 例外与风险

| Exception ID                          | Level | Scope                                                          | Approved By | Cleanup Owner | Cleanup Due | Notes                                                      |
| ------------------------------------- | ----- | -------------------------------------------------------------- | ----------- | ------------- | ----------- | ---------------------------------------------------------- |
| `FE29-E1-BROWSER-SCOPE-FOCUSED`       | E1    | 不跑全部浏览器套件，只新增并运行 Lead bootstrap focused spec。 | Codex       | Codex         | `FE-29` G3  | 现有工作区 E2E 已覆盖其他项目工作区。                      |
| `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE` | E1    | 后端 legacy route 仍存在。                                     | Codex       | Codex         | `FE-29` G4  | 关闭口径是“正式前端用户入口不再依赖”，不是删除后端 route。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-25`
- Conditions:
  1. 测试必须至少有一个路径从菜单进入 `/leads`。
  2. 测试必须至少有一个路径从项目列表按钮进入 `/leads`。
  3. 转项目必须走 UI 动作，并验证项目详情来源线索摘要。
  4. viewer 和 anonymous 权限边界必须有浏览器证据。
