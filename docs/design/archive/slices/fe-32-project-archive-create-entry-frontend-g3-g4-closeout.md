# FE-32 项目归档首次创建入口产品化 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `FE-31`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G4 Reviewer: `Codex`
- G4 Date: `2026-04-26`
- Runtime Commit: `3f912de feat(project): 完成 FE-32 项目前端归档录入闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-32`

## 1. 交付边界确认

已交付:

1. 项目详情终态归档区域提供首次创建归档记录入口。
2. 创建表单使用 PrimeNG Dialog、Button、InputText、Textarea 与既有 `WorkspaceFeedback`。
3. `ProjectStore.createProjectArchiveRecord(projectId, request)` 消费 existing generated `projectControllerCreateProjectArchiveRecord`。
4. 创建成功后刷新 project detail、project timeline 和 archive records。
5. 项目详情可在创建成功后立即展示当前有效归档事实和归档历史。
6. 浏览器验证覆盖登录后从“项目管理”列表进入项目详情并创建首次归档，不只验证直接 URL。

未纳入本片:

1. 不新增或修改后端 API、OpenAPI、generated client、DTO、permission key 或 DDL。
2. 不新增 dedicated `create-project-archive-record` action projection。
3. 不新增归档附件、审批流或多级复核。
4. 不改变 replace / void 的对象动作投影、版本链或 `expectedVersion` 规则。

## 2. 一致性检查

| Edge                       | Result | Evidence                                                                                                 |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 实现遵循 `FE-32` G1 baseline：frontend-only、消费既有 create archive generated client。                  |
| API inventory -> route     | Pass   | `POST /projects/{projectId}/archive-records` 已在 authoritative inventory 中 `aligned`，本片未改 route。 |
| DTO / contract -> frontend | Pass   | 只提交 `CreateProjectArchiveRecordRequest.archivedAt/archiveSummary/evidenceSummary`。                   |
| Query -> view              | Pass   | create 成功后刷新 detail / timeline / archive records，再由 archive records 驱动当前归档呈现。           |
| Guard / permission         | Pass   | UI 用 `project:write` + 终态 + 无 current record 做保守显隐；后端 `project:write` guard 是最终授权。     |
| State transition           | Pass   | 前端不设置归档状态或锚点；后端创建 `recorded` 或拒绝无效终态。                                           |
| E2E entry chain            | Pass   | Playwright 从项目列表进入项目详情后完成首次归档创建链路。                                                |

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
| Markdown format        | Yes      | Pass   | `corepack pnpm run format:md` and `corepack pnpm run format:md:check`                                                                                        |
| Diff whitespace        | Yes      | Pass   | `git diff --check`                                                                                                                                           |
| OpenAPI / client check | No       | N/A    | 本片没有 OpenAPI 或 generated client 变更。                                                                                                                  |
| Migration check        | No       | N/A    | Frontend-only；无 DDL。                                                                                                                                      |

## 4. Drift 判断

| Item                           | Classification | Result                                                                                    |
| ------------------------------ | -------------- | ----------------------------------------------------------------------------------------- |
| OpenAPI / generated client     | `N/A`          | 本片只消费 existing generated client，没有 contract drift。                               |
| Playwright inspector port note | `tool-noise`   | E2E webServer 输出本地 inspector `9229` 端口占用提示；目标 journey 通过，不影响产品行为。 |
| Bundle warning                 | `N/A`          | `poms-admin` build 通过，未出现新增 bundle warning。                                      |

## 5. 例外关闭

| Exception ID                      | Status                      | Close-out                                                                                                                                   |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` | Closed                      | 项目详情已提供首次创建归档入口、表单、成功刷新和登录后入口链 E2E。                                                                          |
| `FE32-E1-CREATE-ACTION-PROXY`     | Closed / accepted-by-design | 首次创建没有既有 archive record 可承载 object action；本片显隐与 command guard 同源于 `project:write`，并叠加终态和无 current record 条件。 |

## 6. G4 结论

- `FE-32` 可标记 `Done`。
- 下游可以依赖项目详情页完成首次归档创建、归档记录刷新和归档历史呈现。
- `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` 已正式关闭。
- 当前归档体验主链路已具备首次创建、替代、撤销、审计历史和 per-record replace / void 显隐。
