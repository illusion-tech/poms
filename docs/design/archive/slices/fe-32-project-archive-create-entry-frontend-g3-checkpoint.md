# FE-32 项目归档首次创建入口产品化 G3 检查点

- Gate Status: `G3 = Pass / G4 Pending Commit`
- Parent: `FE-31`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-32`

## 1. 交付边界

已完成:

1. 项目详情终态归档区域已提供首次创建归档记录入口。
2. 创建表单使用 PrimeNG Dialog、Button、InputText、Textarea 与既有 `WorkspaceFeedback`。
3. `ProjectStore.createProjectArchiveRecord(projectId, request)` 已消费 generated `projectControllerCreateProjectArchiveRecord`。
4. 创建成功后刷新 project detail、project timeline、archive records 三块上下文。
5. focused unit tests 覆盖创建入口显隐、提交 payload 和 store 刷新。
6. targeted Playwright 覆盖登录后从项目列表进入详情页并创建首次归档记录。

未纳入:

1. 未新增 public API、OpenAPI、generated client、DTO、permission key 或 DDL。
2. 未新增归档附件、审批流或多级复核。
3. 未改变 replace / void 的对象动作投影与 `expectedVersion` 规则。

## 2. 一致性检查

| Edge                       | Result | Evidence                                                                                                 |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 实现遵循 FE-32 G1 baseline，只关闭首次创建入口缺口。                                                     |
| ADR-015 inventory -> route | Pass   | `POST /projects/{projectId}/archive-records` 已在 authoritative inventory 中 `aligned`，本片未改 route。 |
| DTO / contract -> frontend | Pass   | 只消费既有 `CreateProjectArchiveRecordRequest`：`archivedAt`、`archiveSummary`、`evidenceSummary`。      |
| Query -> view              | Pass   | create 成功后刷新 detail / timeline / archive records，并由 archive records 重新驱动当前归档呈现。       |
| Guard / permission         | Pass   | UI 用当前用户 `project:write` + 终态 + 无 current record 做显隐；后端 `project:write` guard 是最终授权。 |
| State transition           | Pass   | 前端不设置归档状态；服务端决定 `recorded`、锚点和无效状态拒绝。                                          |
| E2E entry chain            | Pass   | Playwright 从“项目管理”列表进入项目详情后创建首次归档，不只验证直接 URL。                                |

## 3. 验证证据

| Check                  | Required | Result | Evidence                                                                                                                                                     |
| ---------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin detail tests     | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，20 tests passed                                                            |
| Admin store tests      | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store`，6 tests passed                                                              |
| Admin data-access lint | Yes      | Pass   | `corepack pnpm nx lint admin-data-access`                                                                                                                    |
| Admin lint             | Yes      | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                                           |
| Admin build            | Yes      | Pass   | `corepack pnpm nx build poms-admin`                                                                                                                          |
| Seeder                 | Yes      | Pass   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                   |
| Admin E2E              | Yes      | Pass   | `POMS_E2E_PORT_SEED=755 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts -g "archive audit" --workers=1`，2 tests passed |
| OpenAPI / client check | No       | N/A    | 本片没有 OpenAPI 或 generated client 变更。                                                                                                                  |
| Migration check        | No       | N/A    | Frontend-only；无 DDL。                                                                                                                                      |

G3 文档收口后补充执行:

- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`

## 4. Drift 判断

| Item                           | Classification | Result                                                                                    |
| ------------------------------ | -------------- | ----------------------------------------------------------------------------------------- |
| OpenAPI / generated client     | `N/A`          | 本片只消费 existing generated client，没有 contract drift。                               |
| Playwright inspector port note | `tool-noise`   | E2E webServer 输出本地 inspector `9229` 端口占用提示；目标 journey 通过，不影响产品行为。 |
| Bundle warning                 | `N/A`          | `poms-admin` build 通过，未出现新增 bundle warning。                                      |

## 5. 例外处理

| Exception ID                  | G1 Status | G3 Status                        | Notes                                                                                                                                       |
| ----------------------------- | --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE32-E1-CREATE-ACTION-PROXY` | Low       | Close at G4 / accepted-by-design | 首次创建没有既有 archive record 可承载 object action；本片显隐与 command guard 同源于 `project:write`，并叠加终态和无 current record 条件。 |

## 6. G3 结论

- `FE-32` 本地实现已满足 G3。
- 提交后可创建 G3/G4 close-out，将 `FE-32` 标记 `Done`。
- `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` 可由本片在 G4 正式关闭。
