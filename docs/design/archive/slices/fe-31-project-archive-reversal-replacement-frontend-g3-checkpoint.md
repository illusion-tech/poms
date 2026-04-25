# FE-31 项目归档撤销 / 替代前端入口与审计呈现 G3 检查点

- Gate Status: `G3 = Pass / G4 Pending Commit`
- Parent: `EX-34A`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-31`

## 1. 交付范围

本地已完成:

1. `ProjectStore` 新增归档记录读取 state、loading/error state，以及 replace / void command 方法。
2. 项目详情页新增归档记录历史展示，区分 current `recorded` 与历史 `superseded` / `voided`。
3. 项目详情页新增 current 归档记录的“替代归档”和“撤销归档”弹窗入口。
4. replace / void 提交时固定携带 `expectedVersion: record.rowVersion`，不允许前端手填或省略。
5. 命令成功后刷新项目详情、生命周期 timeline 和归档记录列表。
6. 增加详情页、store 单测和 focused Playwright journey，覆盖登录后从项目列表进入详情页看到归档审计区和动作入口。

本地未做:

1. 未新增后端 API、OpenAPI、generated client 或 public route inventory。
2. 未新增首次创建归档入口。
3. 未新增专门的 archive object-action key；按钮显隐暂用详情页既有写动作 gate，后端 guard 仍是最终保护。

## 2. 一致性检查

| Edge                       | Result              | Evidence                                                                                                        |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass                | 实现遵循 `FE-31` G1 baseline：frontend-only、消费 `EX-34A` generated client。                                   |
| API inventory -> route     | N/A                 | 本片不新增或修改 public API route。                                                                             |
| DTO / contract -> frontend | Pass                | 只消费 `ProjectArchiveRecordSummary`、`ReplaceProjectArchiveRecordRequest`、`VoidProjectArchiveRecordRequest`。 |
| Query -> view              | Pass                | 项目详情页以 `GET /projects/{projectId}/archive-records` 展示归档状态和审计字段。                               |
| Guard / permission         | Pass with exception | UI 用详情页已有写动作 gate 做保守显隐；后端 `project:write` 和 command precondition 仍是最终授权。              |
| State transition           | Pass                | 前端不本地改状态；命令成功后重新读取 detail / timeline / archive records。                                      |

## 3. 验证结果

| Check                  | Required  | Result | Evidence                                                                                                                                     |
| ---------------------- | --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Diff whitespace        | Yes       | Pass   | `git diff --check`                                                                                                                           |
| Markdown check         | Yes       | Pass   | `corepack pnpm run format:md:check`                                                                                                          |
| Admin data-access lint | Yes       | Pass   | `corepack pnpm nx lint admin-data-access`                                                                                                    |
| Admin lint             | Yes       | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                           |
| Admin build            | Yes       | Pass   | `corepack pnpm nx build poms-admin`                                                                                                          |
| Focused detail tests   | Yes       | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`，17 tests passed                                            |
| Focused store tests    | Yes       | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store`，5 tests passed                                              |
| Admin E2E              | Yes       | Pass   | `POMS_E2E_PORT_SEED=732 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts -g "archive audit" --workers=1` |
| E2E lint               | No target | N/A    | `poms-admin-e2e` 没有 lint target；已记录为不可用检查。                                                                                      |
| OpenAPI / client check | No        | N/A    | 本片没有 generated client 变更。                                                                                                             |

备注:

- Targeted Playwright 首次运行因 locator strict mode 命中当前区和历史区两处同名归档结论失败，已改为 `.first()` 后重跑通过。
- Playwright journey 使用前端 route mock 注入归档审计记录，验证登录后从“项目管理”列表进入详情页的 UI 链路；后端 replace / void runtime 由 `EX-34A` 测试负责。

## 4. Drift 判断

- `new-real-drift`: none.
- `existing-baseline-drift`: none.
- `tool-noise`: none.
- `validation-environment-note`: `poms-admin-e2e` 无 lint target，不作为产品缺口。

## 5. 例外状态

| Exception ID                      | Status               | Notes                                                                                                        |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `EX34-E2-FRONTEND-DEFERRED`       | Ready to close at G4 | FE-31 已补前端入口和审计呈现；待本地改动提交后关闭。                                                         |
| `EX34A-E1-NO-FRONTEND-ENTRY`      | Ready to close at G4 | Runtime 前端入口已在本片完成；待本地改动提交后关闭。                                                         |
| `FE31-E1-DETAIL-ACTION-PROXY`     | Open / accepted      | 当前没有 dedicated archive action key；UI 使用详情页既有写动作 gate 做保守显隐，后续对象动作治理可单独拆片。 |
| `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` | Transferred          | 首次创建归档入口不属于撤销 / 替代闭环；如需产品化归档创建入口，应另开前端切片。                              |

## 6. G3 结论

- `FE-31` 本地实现已满足 G3。
- G4 仍等待本地改动被用户提交。
- 提交后可创建 G3/G4 close-out，将 `FE-31` 标记 `Done`，并关闭 `EX34-E2-FRONTEND-DEFERRED` / `EX34A-E1-NO-FRONTEND-ENTRY`。
