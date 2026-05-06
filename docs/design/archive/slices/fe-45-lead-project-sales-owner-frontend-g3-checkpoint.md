# FE-45 Lead / Project 销售主责前端收口 G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `EX-41`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Checkpoint Date: `2026-04-29`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-45`
- Baseline: `docs/design/fe-45-lead-project-sales-owner-frontend-baseline.md`

## 1. Scope Summary

本片已按 G1 基线完成前端收口:

1. 线索登记 dialog 新增销售主责和主责组织选择，默认当前登录用户与主组织，提交 `CreateLeadRequest.ownerUserId / ownerOrgId`。
2. 线索列表 / 详情将“负责人”文案收口为“销售主责”，确认有效和转项目 dialog 显示当前 / 继承的销售主责。
3. `ProjectStore` 新增 `reassignProjectOwner`，通过 generated client 调用 `projectControllerReassignOwner` 并刷新项目详情。
4. 项目详情在 `allowedActions` 含 `reassign-project-owner` 时显示“变更销售主责”入口，提交目标 owner、原因和 `rowVersion`。
5. Playwright lead bootstrap journey 扩展覆盖销售主责选择、继承展示和项目详情受控变更。

本片未修改 `ConvertLeadToProjectRequest`，转项目时仍只展示继承的销售主责；项目创建后的调整通过 `POST /projects/{id}:reassignOwner` 承接。

## 2. Alignment Evidence

| Boundary                   | Result | Evidence                                                                                                                        |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 交付范围与 `fe-45-lead-project-sales-owner-frontend-baseline.md` 一致。                                                         |
| ADR-015 inventory -> route | Pass   | 本片不新增 route；消费 `EX-41A` 已 aligned 的 `POST /projects/{id}:reassignOwner`。                                             |
| Route -> command           | Pass   | `ProjectDetail` 只通过 `ProjectStore.reassignProjectOwner` 调 generated client。                                                |
| DTO / contract -> UI       | Pass   | `CreateLeadRequest` 提交 owner 字段；`ReassignProjectOwnerRequest` 提交 `ownerUserId / ownerOrgId / reason / expectedVersion`。 |
| Query -> view              | Pass   | `Lead*View` 和 `ProjectDetailView` 的 `ownerName / ownerOrgName / allowedActions / rowVersion` 均由页面消费。                   |
| Guard / permission         | Pass   | 线索写入口沿用 `lead:write`；项目 owner 变更入口依赖 `allowedActions`，最终以后端 command guard 为准。                          |
| OpenAPI / generated client | Pass   | 仅消费 `EX-41A` 已生成 client；本片无 OpenAPI diff。                                                                            |

## 3. Validation

| Check                     | Result       | Command / Evidence                                                                                                                                                                     |
| ------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused lead tests        | Pass         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`，7 passed                                                                                                  |
| Focused project tests     | Pass         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，22 passed                                                                                            |
| Focused store tests       | Pass         | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store`，7 passed                                                                                              |
| Admin lint                | Pass         | `corepack pnpm nx lint poms-admin`                                                                                                                                                     |
| Data-access lint          | Pass         | `corepack pnpm nx lint admin-data-access`                                                                                                                                              |
| Admin build               | Pass         | `corepack pnpm nx build poms-admin`                                                                                                                                                    |
| Seeder / migration prep   | Pass         | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                                             |
| Targeted browser journey  | Pass         | `$env:POMS_E2E_PORT_SEED='547'; corepack pnpm exec playwright test apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts`，3 passed |
| Markdown format           | Pass         | `corepack pnpm run format:md:check`                                                                                                                                                    |
| Diff hygiene              | Pass         | `git diff --check`                                                                                                                                                                     |
| OpenAPI / generated check | Not required | 本片不改 API contract 或 generated client。                                                                                                                                            |
| Migration / schema check  | Not required | 本片不改 persistence。                                                                                                                                                                 |

## 4. Drift Classification

| Drift ID                       | Class            | Status   | Notes                                                                                                                       |
| ------------------------------ | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `FE45-D1-TEMPLATE-SHADOWING`   | `new-real-drift` | Fixed    | 新增 project owner dialog 初版在 Angular template 中遮蔽 `project()` signal，focused test 暴露后改为使用外层 project 变量。 |
| `FE45-D2-PLAYWRIGHT-LOCATOR`   | `tool-noise`     | Fixed    | PrimeNG `p-select` 不暴露 label 作为可点 locator，已改为 `combobox` locator 后重跑通过。                                    |
| `FE45-D3-PLAYWRIGHT-WEBSERVER` | `tool-noise`     | Accepted | Playwright webServer 输出 `NX Daemon is not running` 和 inspector `9229` 占用提示；目标 journey 通过。                      |

## 5. Exceptions

| Exception ID                                 | Level | Status | Notes                                                                                           |
| -------------------------------------------- | ----- | ------ | ----------------------------------------------------------------------------------------------- |
| `FE45-E1-CONVERSION-OWNER-OVERRIDE-DEFERRED` | `E1`  | Open   | 本片不改 `ConvertLeadToProjectRequest`，转项目仅展示继承 owner，后续是否当场覆盖仍需 DTO 决策。 |
| `FE45-E1-BROWSER-SCOPE`                      | `E1`  | Closed | 已用 targeted Playwright journey 覆盖本片关键入口，无需以 unit 替代浏览器证据。                 |

## 6. G3 Conclusion

- Gate Status: `Pass`
- Commit / G4 Status: `Pending`
- Conditions:
  1. 提交后可将 `FE-45` 从 `Doing / G3` 推进到 `Done / G4`。
  2. `EX41-E2-CONVERSION-OWNER-OVERRIDE` 继续作为后续 DTO 决策，不阻断本片前端闭环。
