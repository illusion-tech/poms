# EX-36 项目归档记录对象动作授权与前端显隐治理 G3 检查点

- Gate Status: `G3 = Pass / G4 Pending Commit`
- Parent: `FE-31`
- Owner: `Codex`
- Slice Type: `api / contract / frontend`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-36`

## 1. 交付范围

本地已完成:

1. `ProjectArchiveRecordSummary` 增加 `allowedActions: string[]`，OpenAPI 与 generated client 已同步。
2. `GET /projects/{projectId}/archive-records` 读取当前用户权限，并按每条归档记录投影 dedicated actions。
3. 归档记录 action keys 冻结为 `replace-project-archive-record` 与 `void-project-archive-record`。
4. 只有 current `recorded` 记录、项目处于终态、且用户具备 `project:write` 时返回 replace / void actions。
5. 项目详情页归档按钮显隐改为消费 `record.allowedActions`，不再从项目详情 `edit-project-basic-info` 或前端 `AuthStore.hasAnyPermission()` 推断。
6. admin e2e mock 数据补齐 per-record actions，继续验证登录后从项目列表进入项目详情的归档审计入口链。

本地未做:

1. 未新增 public route、permission key 或 DDL。
2. 未修改 replace / void command guard；后端 `project:write` 仍是最终保护。
3. 未实现首次归档创建入口；该方向由 `FE-32` 承接。

## 2. 一致性检查

| Edge                       | Result | Evidence                                                                                                      |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 实现遵循 `EX-36` G1 baseline：只扩展 archive record summary action projection。                               |
| API inventory -> route     | Pass   | route surface 不变，`api-route-canonical-inventory.md` 中 archive routes 仍为 `aligned`。                     |
| DTO / contract -> frontend | Pass   | shared contract、OpenAPI、generated client 与 admin consumer 均包含 `allowedActions`。                        |
| Query -> view              | Pass   | `ProjectQueryService.listProjectArchiveRecords(projectId, user)` 投影 per-record actions。                    |
| Guard / permission         | Pass   | UI action projection 依据 `project:write`；command route guard 仍由 `@HasPermissions('project:write')` 兜底。 |
| State transition           | Pass   | 不改归档状态机；replace / void command 行为保持 `EX-34A` 语义。                                               |

## 3. 验证结果

| Check                  | Required | Result | Evidence                                                                                                                                     |
| ---------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI generation     | Yes      | Pass   | `corepack pnpm nx run poms-api:openapi`                                                                                                      |
| Generated client check | Yes      | Pass   | `corepack pnpm nx run shared-api-client:check`                                                                                               |
| API query tests        | Yes      | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query`，25 tests passed                                               |
| API controller tests   | Yes      | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.controller`，15 tests passed                                          |
| Admin detail tests     | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，17 tests passed                                            |
| Admin store tests      | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store`，5 tests passed                                              |
| API lint               | Yes      | Pass   | `corepack pnpm nx lint poms-api`                                                                                                             |
| Admin lint             | Yes      | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                           |
| API build              | Yes      | Pass   | `corepack pnpm nx build poms-api`                                                                                                            |
| Admin build            | Yes      | Pass   | `corepack pnpm nx build poms-admin`                                                                                                          |
| Admin E2E              | Yes      | Pass   | `POMS_E2E_PORT_SEED=746 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts -g "archive audit" --workers=1` |
| Seeder / local DB      | Yes      | Pass   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                   |
| Migration check        | No       | N/A    | 本片无 DDL / migration 变更。                                                                                                                |

备注:

- OpenAPI Generator 仍输出既有 `propertyNames` warning；`shared-api-client:check` 已通过，归类为既有 tool-noise。
- Admin E2E webserver 输出 `Starting inspector on localhost:9229 failed: address already in use`，测试通过，归类为本地环境提示。

## 4. Drift 判断

- `new-real-drift`: none.
- `existing-baseline-drift`: none.
- `tool-noise`: OpenAPI Generator `propertyNames` warning 仍存在，但生成与 check 均通过。
- `validation-environment-note`: Playwright webserver inspector 端口占用提示不影响测试结果。

## 5. 例外状态

| Exception ID                      | Status               | Notes                                                                     |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `FE31-E1-DETAIL-ACTION-PROXY`     | Ready to close at G4 | 项目详情归档按钮已改为消费 `ProjectArchiveRecordSummary.allowedActions`。 |
| `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` | Unchanged            | 首次归档创建入口仍由 `FE-32` 承接，本片不扩展范围。                       |

## 6. G3 结论

- `EX-36` 本地实现已满足 G3。
- 提交后可创建 G3/G4 close-out，将 `EX-36` 标记 `Done`，并关闭 `FE31-E1-DETAIL-ACTION-PROXY`。
- `FE-32` 可在 `EX-36` G4 后继续进入首次归档创建入口产品化，不应再复用泛化项目写动作推断归档按钮。
