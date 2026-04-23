# FE-07 合同到移交承接工作区前端实现 G3/G4 Close-out

- Checkpoint Status: `G4 = Pass`
- Parent: Phase 2 frontend workspace / L3
- Owner: `Codex`
- Slice Type: `frontend + query-projection`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-23`
- G4 Date: `2026-04-23`
- Implementation Commit: `16966da feat(project): 接入合同到移交承接工作区`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-07`

## 1. 范围

- 本次目标:
  - 新增 `/projects/:id/workspace/contract-handover` 只读页。
  - 在 admin data-access store 中接入既有 `ProjectHandoverApi` 读接口。
  - 将 backend workspace guidance 的 `handover-workspace` 入口指向前端新路由。
  - 补充从项目列表 / 工作区入口进入合同承接页的 Playwright 旅程。
  - 对 E2E harness 做最小稳定性修正，避免本地 Vite 首轮资源加载抖动阻断登录前置步骤。
- 本次明确不做:
  - 不新增、删除或变更公共 API route surface。
  - 不新增 DTO / OpenAPI schema，不重新生成 generated client。
  - 不实现移交确认或合同承接再基线化写动作。
  - 不新增权限键。

## 2. 正式输入

| Input Type      | Document / Source                                       | Section / Anchor                | Status     | Notes                                           |
| --------------- | ------------------------------------------------------- | ------------------------------- | ---------- | ----------------------------------------------- |
| G1 baseline     | `fe-07-contract-to-handover-read-workspace-baseline.md` | 全文                            | `Pass`     | 冻结只读页和 query projection 边界。            |
| Business design | `phase2-contract-to-handover-workspace.md`              | L3-T01                          | `Accepted` | 固定合同生效后到正式移交前的承接体验。          |
| Closure rule    | `phase2-handover-closure-rules.md`                      | L3-T04                          | `Accepted` | 合同承接不等同于移交确认。                      |
| Route inventory | `api-route-canonical-inventory.md`                      | `project-handover` rows         | `aligned`  | 本片只消费既有 aligned routes。                 |
| UI baseline     | FE workspace shared components                          | FE-18 / FE-20 / FE-21 artifacts | `Accepted` | 继续复用 Project workspace UI 与 PrimeNG 表格。 |

## 3. 一致性结论

- Document -> code: `Pass`。实现范围与 G1 baseline 对齐，为 L3 合同承接只读页。
- ADR-015 inventory / route surface: `Pass`。未新增或变更 public API route。
- Route -> command: `N/A`。本片不实现写命令。
- Migration -> entity: `N/A`。未触及持久化。
- Entity -> contract / OpenAPI: `N/A`。未触及 shared contract、OpenAPI 或 generated client。
- Query / view: `Pass`。前端只消费 `ContractHandoverSummaryView` 与 `ProjectHandoverDetailView`。
- Guard / permission: `Pass`。前端 route 与 workspace guidance 都沿用 `project:read`。
- UI / component baseline: `Pass`。页面复用 `ProjectContextHeader`、workspace shared UI、PrimeNG `p-table` / `p-tag`，未引入新的手写主结构模式。

## 4. 验证证据

| Check                      | Required | Command / Evidence                                                                                                                                                          | Result         | Gap / Reason                                                         |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| Diff check                 | Yes      | `git diff --check --no-ext-diff --no-textconv -- . ':!libs/shared/api-spec/openapi.json' ':!libs/shared/api-client'`                                                        | `Pass`         | 仅提示 `.gitattributes` 规范化 `playwright.config.ts` 为 LF。        |
| Backend unit tests         | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`                                                                               | `Pass`         | 覆盖 `handover-workspace` guidance entry。                           |
| Backend lint               | Yes      | `corepack pnpm nx lint poms-api`                                                                                                                                            | `Pass`         | 未引入新 warning。                                                   |
| Backend build              | Yes      | `corepack pnpm nx build poms-api`                                                                                                                                           | `Pass`         | 未触发 API contract 生成。                                           |
| Admin data-access lint     | Yes      | `corepack pnpm nx lint admin-data-access`                                                                                                                                   | `Pass`         | 覆盖 store / exports。                                               |
| Admin lint                 | Yes      | `corepack pnpm nx lint poms-admin`                                                                                                                                          | `Pass`         | 覆盖 route / page / specs。                                          |
| Admin build                | Yes      | `corepack pnpm nx build poms-admin`                                                                                                                                         | `Pass`         | Initial total `935.88 kB`，无新 bundle warning。                     |
| Admin focused tests        | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-contract-handover`                                                                                 | `Pass`         | 1 suite / 2 tests。                                                  |
| Admin focused tests        | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                                                   | `Pass`         | 1 suite / 9 tests。                                                  |
| Admin focused tests        | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`                                                                                                | `Pass`         | 1 suite / 3 tests。                                                  |
| Admin full tests           | Yes      | `corepack pnpm nx test poms-admin --runInBand`                                                                                                                              | `Pass`         | 14 suites / 49 tests。                                               |
| E2E lint                   | Yes      | `corepack pnpm nx run poms-admin-e2e:eslint:lint`                                                                                                                           | `Pass`         | `poms-admin-e2e` has inferred `eslint:lint` target。                 |
| E2E focused journey        | Yes      | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts --grep "contract handover"` | `Pass`         | 覆盖登录后从项目列表进入工作区，再从工作区入口和导航进入合同承接页。 |
| OpenAPI / generated client | No       | N/A                                                                                                                                                                         | `Not required` | No API / contract change。                                           |
| Migration / schema check   | No       | N/A                                                                                                                                                                         | `Not required` | No persistence change。                                              |

## 5. E2E Harness 处理

- 触发: focused E2E 初始运行多次停在 Poseidon bootstrap loader，trace 显示 HTML 已 200，但 Vite 本地依赖请求出现 `ERR_CONNECTION_FAILED` / `ERR_ADDRESS_IN_USE`。
- 处理:
  - `playwright.config.ts` 将本地默认 loopback host 从硬编码 `127.0.0.1` 改为可配置 `POMS_E2E_LOOPBACK_HOST`，默认 `localhost`。
  - `support/auth.ts` 只在登录页仍停留 bootstrap loader 时刷新一次；登录接口成功且 token 已写入但仍停留登录页时，直接进入 `/dashboard`。
  - `project-workspace.journey.spec.ts` 收紧重复文本 locator，避免 strict mode violation。
- 边界: 这些变更只服务 E2E harness 稳定性和定位精度，不改变产品代码、权限或业务路由。

## 6. Drift 与例外

- Drift Classification: `tool-noise` for local Vite loopback loading instability; resolved in E2E harness.
- New design / API drift introduced: `None`
- Existing baseline drift: `None`
- Exceptions: `None`

## 7. G3 / G4 结论

- Checkpoint Status: `Pass`
- Can commit to main: `Yes`
- Can mark tracker `Done`: `Yes`，实现已由 commit `16966da` 固化，baseline 与 close-out 已归档。
- Conditions:
  - `FE-07` 交付边界限定为合同到移交承接只读工作区与真实入口链路。
  - 写侧移交确认、合同承接再基线化操作、结构化影响项和新增权限键仍不属于本片。
  - 下游 `FE-08` 可依赖本片的新工作区壳层入口、store 读取边界和 E2E 入口验证方式。
