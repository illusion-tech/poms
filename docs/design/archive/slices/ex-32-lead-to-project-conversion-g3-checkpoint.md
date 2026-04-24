# EX-32 Lead -> Project 转化命令与直接创建 Project 收口 G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `EX-17`
- Slice Type: `cross-layer-high-risk`
- Owner: `Codex`
- Reviewer: `Solo worktree checkpoint`
- Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-32`
- G1 Baseline: `docs/design/archive/slices/ex-32-lead-to-project-conversion-baseline.md`

## 1. 本次交付边界

- 已新增 `project.source_lead_id` migration / entity mapping / index / FK。
- 已新增 `POST /leads/{id}:convertToProject`：
  - 只允许 `qualified` Lead 转 Project。
  - 重复转化返回 `409`。
  - Project 默认 `status = active`、`currentStage = assessment`。
  - Project 继承 Lead 的客户、主责组织和主责人。
  - 同一命令内回写 Lead `convertedProjectId`、`convertedAt`、`convertedBy`。
- 已扩展读侧摘要：
  - `LeadDetailView.convertedProjectSummary`
  - `ProjectSummary.sourceLeadId`
  - `ProjectDetailView.sourceLeadSummary`
- 已同步 shared contract、API DTO、OpenAPI、generated client、admin data-access 导出与 focused frontend store test fixture。
- 已更新 authoritative route inventory：`EX-31` Lead routes 与 `EX-32` convert route 均为 `aligned`。

## 2. 明确不做

- 不删除 `POST /projects` runtime route。
- 不修改正式前端用户入口；归属 `FE-27/28/29`。
- 不实现 CRM 商机金额、客户主数据、评分或完整销售过程。
- 不关闭 `EX17-E2-LEAD-BOOTSTRAP`；该例外继续等 `FE-29` G4。

## 3. 一致性检查

| Edge                       | Result | Evidence                                                                                                    |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Document -> code           | `Pass` | `EX-32` G1 冻结的 route、state、source mapping 均已落地。                                                   |
| ADR-015 inventory -> route | `Pass` | `POST /leads/{id}:convertToProject` 已实现；inventory row 已更新为 `aligned`。                              |
| Migration -> entity        | `Pass` | `Migration20260425113000_ex32_project_source_lead` 与 `Project.sourceLeadId` 对齐。                         |
| Entity -> contract         | `Pass` | `Project.sourceLeadId` 已进入 shared contract、OpenAPI 和 generated client。                                |
| Route -> command           | `Pass` | `LeadController.convertToProject` 调用 `LeadService.convertToProject`，不从 `POST /projects` 接收 Lead id。 |
| Query -> view              | `Pass` | Lead detail 和 Project detail 均能展示对端摘要。                                                            |
| Guard / permission         | `Pass` | convert route 使用 `lead:write + project:write`；legacy project create guard 不变。                         |
| OpenAPI / generated client | `Pass` | `shared-api-client:generate/check` 已通过，新增 `ConvertLeadToProjectRequest` 和 generated method。         |

## 4. 验证结果

| Check                  | Command                                                                                                                                          | Result                           | Notes                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Focused Lead tests     | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`                                                                             | `Pass`                           | `3 suites / 19 tests`。                                                                                                          |
| Focused Project tests  | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts project.service.spec.ts project.controller.spec.ts` | `Pass`                           | `3 suites / 62 tests`。                                                                                                          |
| Full API tests         | `corepack pnpm nx test poms-api --runInBand`                                                                                                     | `Pass`                           | `39 suites / 485 tests`。                                                                                                        |
| API lint               | `corepack pnpm nx lint poms-api`                                                                                                                 | `Pass`                           | No new lint warnings.                                                                                                            |
| API build              | `corepack pnpm nx build poms-api`                                                                                                                | `Pass`                           | Includes `shared-contracts:build` dependency.                                                                                    |
| OpenAPI generation     | `corepack pnpm nx run poms-api:openapi`                                                                                                          | `Pass`                           | Route and schema generation succeeded.                                                                                           |
| Generated client       | `corepack pnpm nx run shared-api-client:generate` + `corepack pnpm nx run shared-api-client:check`                                               | `Pass`                           | Check reported generated client fully synced with OpenAPI.                                                                       |
| Migration up           | `corepack pnpm nx run poms-api:migration-up`                                                                                                     | `Pass`                           | Applied `Migration20260425113000_ex32_project_source_lead`.                                                                      |
| Migration check        | `corepack pnpm nx run poms-api:migration-check`                                                                                                  | `Pass`                           | Schema is up-to-date.                                                                                                            |
| Focused API E2E        | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=lead-workflow`                                                                             | `Pass`                           | Covers create Lead -> qualify -> convert -> Lead detail summary -> Project detail source summary -> duplicate convert `409`.     |
| Full API E2E           | `corepack pnpm nx e2e poms-api-e2e`                                                                                                              | `Fail / existing-baseline-drift` | Fails in existing contract activation workflows due missing commercial baseline core terms; not caused by EX-32 touched surface. |
| Focused API E2E lint   | `corepack pnpm exec eslint apps/poms-api-e2e/src/poms-api/lead-workflow.e2e-spec.ts apps/poms-api-e2e/src/support/lead-api.ts`                   | `Pass`                           | New EX-32 e2e spec and helper introduce no local lint warning.                                                                   |
| Full API E2E lint      | `corepack pnpm nx run poms-api-e2e:eslint:lint`                                                                                                  | `Fail / existing-baseline-drift` | Existing e2e support module-boundary and legacy spec warnings remain; focused EX-32 e2e lint passed.                             |
| Admin data-access lint | `corepack pnpm nx lint admin-data-access`                                                                                                        | `Pass`                           | Generated type exports compile.                                                                                                  |
| Admin lint             | `corepack pnpm nx lint poms-admin`                                                                                                               | `Pass`                           | No new lint warnings.                                                                                                            |
| Admin focused test     | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store.spec.ts`                                                          | `Pass`                           | `1 suite / 2 tests`。                                                                                                            |
| Admin build            | `corepack pnpm nx build poms-admin`                                                                                                              | `Pass`                           | No EX-32 bundle warning introduced.                                                                                              |
| Markdown format        | `corepack pnpm run format:md:check`                                                                                                              | `Pass`                           | Documentation tables are formatted.                                                                                              |
| Diff hygiene           | `git diff --check`                                                                                                                               | `Pass`                           | No whitespace errors; Git reported CRLF normalization notice for `project.entity.ts`.                                            |

## 5. Drift 与例外

| ID                                          | Class                     | Scope                                                                                                | Decision                                                                                                                  | Cleanup Owner | Due                        |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------- |
| `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS`  | `existing-baseline-drift` | Full `poms-api-e2e` 中合同激活流程缺商业基线核心条款：`amountTaxInclusive` 等。                      | 不阻断 `EX-32`，因为 focused Lead route E2E 已通过，失败 surface 不在本片改动范围内。                                     | `Codex`       | 后续合同 e2e 维护切片      |
| `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE` | `existing-baseline-drift` | Full `poms-api-e2e:eslint:lint` 命中既有 support 类型桥接的 module-boundary 错误与旧 spec warnings。 | 不阻断 `EX-32`，因为新增 `lead-workflow` spec 与 `lead-api` helper focused eslint 已通过，且未新增 e2e 项目 import 边界。 | `Codex`       | 后续 e2e lint 基线治理切片 |
| `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE`       | `accepted exception`      | `POST /projects` runtime route 继续给既有数据、seed、dev 和 E2E helper 使用。                        | 允许本片 G3；正式前端用户入口必须在 `FE-28/29` 移除对直接 Project create 的依赖。                                         | `Codex`       | `FE-29` G4                 |
| `EX17-E2-LEAD-BOOTSTRAP`                    | `accepted exception`      | 端到端用户路径尚未证明 Lead bootstrap 完整替代直接项目创建。                                         | 继续打开；`EX-32` 只关闭后端命令和数据来源，前端与浏览器验证由 `FE-27~29` 完成。                                          | `Codex`       | `FE-29` G4                 |

## 6. G3 结论

- `EX-32` runtime boundary matches the G1 baseline.
- Required route, DTO, persistence, query, guard and generated-client evidence is present.
- Focused API E2E covers the new user-meaningful backend path.
- Full E2E failure is classified as `existing-baseline-drift`, not an EX-32 regression.
- Full API E2E lint failure is classified as `existing-baseline-drift`; focused EX-32 e2e lint passed.
- This slice can be committed.
- `EX-32` cannot move to `G4` until the runtime and G3 docs are committed.
