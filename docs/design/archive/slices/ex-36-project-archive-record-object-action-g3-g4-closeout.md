# EX-36 项目归档记录对象动作授权与前端显隐治理 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Slice Type: `api / command` + `frontend-only`
- Owner: `Codex`
- G4 Reviewer: `Codex`
- G4 Date: `2026-04-26`
- Runtime Commit: `4cb8ef5 feat(project): 完成 EX-36 项目归档记录对象动作闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-36`

## 1. 交付边界确认

已交付:

1. `ProjectArchiveRecordSummary` 已新增 `allowedActions: string[]`，并同步 shared contract、OpenAPI 与 generated Angular client。
2. `GET /projects/{projectId}/archive-records` 已按单条归档记录投影 replace / void actions。
3. 后端 action projection 仅在 current `recorded` 归档记录、终态项目和当前用户具备 `project:write` 时返回 `replace-project-archive-record` / `void-project-archive-record`。
4. 项目详情页归档按钮已改为消费 `ProjectArchiveRecordSummary.allowedActions`，不再从项目详情页泛化写动作 gate 推断归档记录按钮显隐。
5. command routes 仍由既有 `project:write` guard 和 service precondition 兜底；本片不新增 permission key、public route 或 DDL。

未纳入本片:

1. 不新增首次创建项目归档入口；该产品化缺口继续由 `FE-32` 承接。
2. 不新增独立 archive permission key；本片只把当前 `project:write` 能力投影到 record-level action visibility。
3. 不改变归档记录 replace / void command semantics、版本链或 `expectedVersion` 规则。

## 2. 一致性检查

| Edge                       | Result | Evidence                                                                                                           |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Document -> code           | Pass   | 实现遵循 `EX-36` G1 baseline：只补归档记录对象动作 projection 与前端消费，不扩大归档业务范围。                     |
| API inventory -> route     | Pass   | 未新增或修改 public route；只扩展既有 `GET /projects/{projectId}/archive-records` response projection。            |
| DTO / contract -> code     | Pass   | `ProjectArchiveRecordSummary.allowedActions` 已进入 shared contract、OpenAPI 与 generated client。                 |
| Query -> view              | Pass   | 项目详情页归档 replace / void 按每条记录的 `allowedActions` 显隐。                                                 |
| Guard / permission         | Pass   | list query 只投影 action；replace / void 命令仍由后端 `project:write` guard 与 service precondition 执行最终授权。 |
| State transition           | Pass   | 本片不本地改写归档状态；replace / void 成功后沿用 FE-31 已交付刷新 detail / timeline / archive records 的行为。    |
| Downstream exception close | Pass   | `FE31-E1-DETAIL-ACTION-PROXY` 已关闭；前端不再使用详情页泛化写动作 gate 代理归档记录对象动作。                     |

## 3. 验证证据

| Check                  | Required | Result | Evidence                                                                                                                                     |
| ---------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI generation     | Yes      | Pass   | `corepack pnpm nx run poms-api:openapi`                                                                                                      |
| Generated client       | Yes      | Pass   | `corepack pnpm nx run shared-api-client:generate`                                                                                            |
| Generated client check | Yes      | Pass   | `corepack pnpm nx run shared-api-client:check`                                                                                               |
| API query tests        | Yes      | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query`，25 tests passed                                               |
| API controller tests   | Yes      | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.controller`，15 tests passed                                          |
| Admin detail tests     | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，17 tests passed                                            |
| Admin store tests      | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store`，5 tests passed                                              |
| API lint               | Yes      | Pass   | `corepack pnpm nx lint poms-api`                                                                                                             |
| Admin lint             | Yes      | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                           |
| API build              | Yes      | Pass   | `corepack pnpm nx build poms-api`                                                                                                            |
| Admin build            | Yes      | Pass   | `corepack pnpm nx build poms-admin`                                                                                                          |
| Seeder                 | Yes      | Pass   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                   |
| Admin E2E              | Yes      | Pass   | `POMS_E2E_PORT_SEED=746 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts -g "archive audit" --workers=1` |
| Markdown format        | Yes      | Pass   | `corepack pnpm run format:md` and `corepack pnpm run format:md:check`                                                                        |
| Diff whitespace        | Yes      | Pass   | Touched-file `git diff --check`; full-repo `git diff --check` timed out locally without returning concrete whitespace findings.              |

G4 文档收口后补充执行:

- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`

## 4. Drift 判断

| Item                           | Classification | Result                                                                                          |
| ------------------------------ | -------------- | ----------------------------------------------------------------------------------------------- |
| OpenAPI generator warning      | `tool-noise`   | generated client 仍输出既有 `propertyNames` warning；`shared-api-client:check` 确认完全同步。   |
| Playwright inspector port note | `tool-noise`   | E2E webServer 输出本地 inspector `9229` 端口占用提示，但目标 journey 通过，不影响产品行为。     |
| Full `git diff --check`        | `tool-noise`   | 全仓检查在本地超时；本片触达文件定向 whitespace 检查通过，未发现可归属本片的 whitespace drift。 |

## 5. 例外关闭与转交

| Exception ID                      | Status      | Close-out                                                                                                     |
| --------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `FE31-E1-DETAIL-ACTION-PROXY`     | Closed      | `ProjectArchiveRecordSummary.allowedActions` 已由后端按 record-level action projection 输出，前端已直接消费。 |
| `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` | Transferred | 首次创建归档入口不属于对象动作显隐治理；继续由 `FE-32` 冻结并产品化。                                         |

## 6. G4 结论

- `EX-36` 可标记 `Done`。
- 下游前端可依赖 `ProjectArchiveRecordSummary.allowedActions` 判断每条归档记录的 replace / void 可见性。
- `FE31-E1-DETAIL-ACTION-PROXY` 已正式关闭。
- `FE-32` 是下一步归档体验切片；不得回退为用项目详情页泛化写动作推断首次归档或归档记录操作能力。
