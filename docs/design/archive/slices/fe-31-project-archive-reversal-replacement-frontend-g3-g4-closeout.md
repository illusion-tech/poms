# FE-31 项目归档撤销 / 替代前端入口与审计呈现 G3/G4 收口

- Gate Status: `G4 = Pass`
- Parent: `EX-34A`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G4 Reviewer: `Codex`
- G4 Date: `2026-04-26`
- Runtime Commit: `4099926 feat(project): 完成 FE-31 项目前端归档冲销替换闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-31`

## 1. 交付边界确认

已交付:

1. `ProjectStore` 已提供项目归档记录读取 state、loading / error state、replace / void command 方法。
2. 项目详情页已展示 current `recorded` 归档记录和完整归档历史，能区分 `recorded`、`superseded`、`voided`。
3. current `recorded` 归档记录已提供“替代归档”和“撤销归档”入口、弹窗、提交中反馈和失败反馈。
4. replace / void 命令固定使用 `expectedVersion: record.rowVersion`，前端不允许手填或绕过版本前置条件。
5. 命令成功后刷新项目详情、生命周期 timeline 和归档记录列表。
6. 浏览器验证覆盖登录后从“项目管理”列表进入项目详情，而不是只验证直接 URL 访问。

未纳入本片:

1. 不新增或修改后端 API、OpenAPI、generated client 或 public route inventory。
2. 不新增首次创建归档入口。
3. 不新增 dedicated archive object-action key；按钮显隐暂用项目详情既有写动作 gate，后端 `project:write` 和 command precondition 仍是最终保护。

## 2. 一致性检查

| Edge                       | Result              | Evidence                                                                                                        |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Document -> code           | Pass                | 实现遵循 `FE-31` G1 baseline：frontend-only、消费 `EX-34A` generated client。                                   |
| API inventory -> route     | N/A                 | 本片不新增或修改 public API route。                                                                             |
| DTO / contract -> frontend | Pass                | 只消费 `ProjectArchiveRecordSummary`、`ReplaceProjectArchiveRecordRequest`、`VoidProjectArchiveRecordRequest`。 |
| Query -> view              | Pass                | 项目详情页以 `GET /projects/{projectId}/archive-records` 展示归档状态和审计字段。                               |
| Guard / permission         | Pass with exception | UI 用详情页已有写动作 gate 做保守显隐；后端 `project:write` 和 command precondition 仍是最终授权。              |
| State transition           | Pass                | 前端不本地改状态；命令成功后重新读取 detail / timeline / archive records。                                      |

## 3. 验证证据

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

G4 文档收口后补充执行:

- `corepack pnpm run format:md:check`
- `git diff --check`

## 4. Drift 判断

- `new-real-drift`: none.
- `existing-baseline-drift`: none.
- `tool-noise`: none.
- `validation-environment-note`: `poms-admin-e2e` 无 lint target，不作为产品缺口。

## 5. 例外关闭与转交

| Exception ID                      | Status         | Notes                                                                                  |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| `EX34-E2-FRONTEND-DEFERRED`       | Closed         | FE-31 已补前端入口、审计呈现、权限显隐和浏览器入口验证。                               |
| `EX34A-E1-NO-FRONTEND-ENTRY`      | Closed         | EX-34A runtime 的前端入口已由 FE-31 交付。                                             |
| `FE31-E1-DETAIL-ACTION-PROXY`     | Closed post-G4 | 已由 `EX-36` 关闭；项目详情归档按钮消费 `ProjectArchiveRecordSummary.allowedActions`。 |
| `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` | Closed post-G4 | 已由 `FE-32` 关闭；项目详情已提供首次创建归档入口、表单、刷新和浏览器入口链验证。      |

## 6. G4 结论

- `FE-31` 可标记 `Done`。
- 下游可以依赖项目详情页的归档审计呈现、replace / void 前端入口和 `expectedVersion=rowVersion` 提交流程。
- `EX34-E2-FRONTEND-DEFERRED` 与 `EX34A-E1-NO-FRONTEND-ENTRY` 已由本片关闭。
- 后续 `EX-36` 与 `FE-32` 已分别关闭 object-action 细粒度授权治理和首次创建归档入口缺口。
