# FE-27 线索登记与线索列表前端入口 G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `EX-17`
- Slice Type: `frontend + navigation-config`
- Owner: `Codex`
- Reviewer: `Solo worktree checkpoint`
- Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-27`
- G1 Baseline: `docs/design/archive/slices/fe-27-lead-entry-list-frontend-baseline.md`

## 1. 本次交付边界

- 新增 `/leads` 前端路由，使用 `permissionGuard + lead:read`。
- 新增 `LeadStore`，消费 generated `LeadApi`，覆盖 list / detail / create / qualify / close。
- 新增 `LeadList` 页面：
  - PrimeNG `p-table` caption / global filter / column filter / clear / paginator / rowHover / scroll。
  - 线索登记 dialog。
  - 详情 dialog。
  - registered 线索确认有效。
  - registered / qualified 线索关闭。
- 新增 dynamic navigation 入口：
  - `nav:leads:view` permission key。
  - `NAVIGATION_TREE` 中“业务管理 / 线索管理”菜单。
  - dev role fixture 中具备 Lead 读写的角色获得 `nav:leads:view`。
- 项目管理页新增“登记线索”入口，但不替换“新建项目”的最终语义。
- 同步 OpenAPI 与 generated client 中的 permission enum。

## 2. 明确不做

- 不调用 `leadControllerConvertToProject`。
- 不实现线索转项目前端动作；归属 `FE-28`。
- 不把项目列表“新建项目”彻底改为线索引导；归属 `FE-28`。
- 不做完整登录后浏览器菜单 journey；归属 `FE-29`。
- 不修改 `Lead` 后端 API route surface、持久化结构或转化命令语义。

## 3. 一致性检查

| Edge                          | Result | Evidence                                                                                 |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| G1 baseline -> code           | `Pass` | `/leads`、LeadStore、PrimeNG table/form、dynamic nav 和项目页入口均已落地。              |
| Route guard -> permission     | `Pass` | `/leads` 使用 `lead:read`；写动作按钮使用 `lead:write`。                                 |
| Navigation SSOT -> menu       | `Pass` | `NAVIGATION_TREE` 新增 `leads`，required permissions 为 `nav:leads:view`。               |
| Permission SSOT -> generated  | `Pass` | `nav:leads:view` 已进入 shared contracts、OpenAPI 和 generated client permission enums。 |
| Store -> generated API        | `Pass` | `LeadStore` 只调用 generated `LeadApi`，没有自造 wire contract。                         |
| Table UX -> UIKit baseline    | `Pass` | 线索列表采用 `p-table` caption、filter、clear、paginator、rowHover、scroll/min-width。   |
| Product copy -> user language | `Pass` | 页面文案为业务中文；未暴露 API / DTO / bootstrap 等实现词。                              |
| FE-27 -> FE-28 boundary       | `Pass` | 页面展示 converted summary，但不提供转项目动作。                                         |

## 4. 验证结果

| Check                  | Command                                                                                                                     | Result | Notes                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Admin focused tests    | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list.spec.ts app.routes.spec.ts project-list.spec.ts` | `Pass` | Focused route / lead page coverage passed; command output included lead and route specs. |
| Admin full tests       | `corepack pnpm nx test poms-admin --runInBand`                                                                              | `Pass` | `20 suites / 85 tests`。                                                                 |
| API navigation tests   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation`                                                  | `Pass` | `3 suites / 16 tests`。                                                                  |
| Admin lint             | `corepack pnpm nx lint poms-admin`                                                                                          | `Pass` | No new lint warnings.                                                                    |
| Admin data-access lint | `corepack pnpm nx lint admin-data-access`                                                                                   | `Pass` | `LeadStore` passes lint.                                                                 |
| API lint               | `corepack pnpm nx lint poms-api`                                                                                            | `Pass` | Navigation config and fixtures pass lint.                                                |
| Admin build            | `corepack pnpm nx build poms-admin`                                                                                         | `Pass` | `lead-list` lazy chunk generated; no bundle warning emitted.                             |
| API build              | `corepack pnpm nx build poms-api`                                                                                           | `Pass` | Shared contracts and API compile.                                                        |
| OpenAPI generation     | `corepack pnpm nx run poms-api:openapi`                                                                                     | `Pass` | `nav:leads:view` enum propagated.                                                        |
| Generated client       | `corepack pnpm nx run shared-api-client:generate` + `corepack pnpm nx run shared-api-client:check`                          | `Pass` | Client is synced with OpenAPI.                                                           |

## 5. Drift 与例外

| ID                                             | Class                | Scope                                                                                                        | Decision                                                                       | Cleanup Owner | Due        |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------- | ---------- |
| `FE27-E1-NO-CONVERT-ACTION`                    | `accepted exception` | `FE-27` 不提供转项目按钮。                                                                                   | 不阻断本片；转项目体验由 `FE-28` 在 `EX-32` 输入上实现。                       | `Codex`       | `FE-28` G4 |
| `FE27-E2-BROWSER-JOURNEY-DEFERRED`             | `accepted exception` | 登录后从菜单 / 项目管理按钮 / 直接 URL 的完整浏览器矩阵未在本片收口。                                        | 不阻断本片；本片已有 route/unit/build 证据，完整 journey 由 `FE-29` 统一关闭。 | `Codex`       | `FE-29` G4 |
| `FE27-D1-OPENAPI-GENERATOR-PROPERTYNAMES-WARN` | `tool-noise`         | OpenAPI Generator 继续提示 `CreateCommissionRuleVersionRequest` / `AuditSnapshot` 的 propertyNames warning。 | 不阻断本片；生成与 check 均通过，该 warning 为既有 generator 输出。            | `Codex`       | N/A        |

## 6. G3 结论

- `FE-27` runtime boundary matches the G1 baseline.
- Required route, permission, navigation, store, page, generated-client and focused test evidence is present.
- Browser journey exception is explicitly deferred to `FE-29`, not silently waived.
- This slice can be committed.
- `FE-27` cannot move to `G4` until runtime and G3 docs are committed.
