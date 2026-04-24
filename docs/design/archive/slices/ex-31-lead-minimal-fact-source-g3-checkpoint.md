# EX-31 Lead 最小事实源、读写 API 与 generated client G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- Date: `2026-04-25`
- Baseline: `docs/design/archive/slices/ex-31-lead-minimal-fact-source-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-31`

## 1. Delivered Scope

- 新增 `Lead` shared contract:
  - `LeadStatus`
  - `LeadSummary`
  - `LeadListView`
  - `LeadDetailView`
  - `CreateLeadRequest`
  - `UpdateLeadRequest`
  - `QualifyLeadRequest`
  - `CloseLeadRequest`
  - `LeadListQuery`
- 新增 `lead:read` / `lead:write` permission dictionary entries，并把 dev seed 中销售人员 / 销售负责人 / 销售助理的线索权限补齐。
- 新增 `poms.lead` migration / entity / repository / service / query service / controller。
- 新增公开 API:
  - `POST /leads`
  - `GET /leads`
  - `GET /leads/{id}`
  - `PATCH /leads/{id}`
  - `POST /leads/{id}:qualify`
  - `POST /leads/{id}:close`
- 已生成 OpenAPI 与 shared Angular client，`admin-data-access` 已导出 `LeadApi` 与 Lead types。
- 已补 focused backend tests:
  - `lead.service.spec.ts`
  - `lead-query.service.spec.ts`
  - `lead.controller.spec.ts`

## 2. Out Of Scope

- 未创建 `Project`。
- 未实现 `POST /leads/{id}:convertToProject`。
- 未修改当前 `POST /projects` 行为。
- 未实现前端线索页面、菜单入口或浏览器 E2E。
- 未关闭 `EX17-E2-LEAD-BOOTSTRAP`；该例外继续等待 `EX-32` 与 `FE-27~29`。

## 3. Drift 判断

| Area                           | Result                         | Notes                                                                                                        |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Document -> code               | `Pass`                         | 本片实际交付与 G1 范围一致。                                                                                 |
| Inventory -> route             | `Pass`                         | `EX-30` planned routes 已落地到 controller / OpenAPI；convert route 仍未实现，符合本片范围。                 |
| Route -> command / query       | `Pass`                         | collection / item routes 分别映射到 `LeadService` 与 `LeadQueryService`。                                    |
| DTO / contract -> controller   | `Pass`                         | controller 使用 `@poms/api-contracts` DTO，返回 shared contract view。                                       |
| Migration -> entity            | `Pass`                         | `poms.lead` DDL、entity 字段、index、check constraint 对齐。                                                 |
| Entity -> shared contract      | `Pass`                         | 状态、datetime、UUID 与 nullable 字段口径一致。                                                              |
| Guard / permission             | `Pass`                         | read 使用 `lead:read`；create/update/qualify/close 使用 `lead:write`。                                       |
| OpenAPI / generated client     | `expected-change`              | 新增 `LeadApi`、Lead models，并同步到 `admin-data-access` 导出。                                             |
| Migration check first run      | `tool-ordering / local-db-gap` | 首次失败原因是本地 DB 未应用新迁移；`migration-up` 后 `migration-check` 通过。                               |
| Focused test command first run | `tool-noise`                   | `--runTestsByPath` 使用 workspace-relative path 被 Nx/Jest 重复拼接；改用 `--testPathPatterns=lead` 后通过。 |

## 4. Validation

| Check                      | Result | Evidence                                                                                     |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Focused Lead tests         | `Pass` | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`，`3 passed / 14 passed` |
| API unit tests full suite  | `Pass` | `corepack pnpm nx test poms-api --runInBand`，`39 passed / 480 passed`                       |
| API lint                   | `Pass` | `corepack pnpm nx lint poms-api`                                                             |
| API build                  | `Pass` | `corepack pnpm nx build poms-api`                                                            |
| OpenAPI generation         | `Pass` | `corepack pnpm nx run poms-api:openapi`                                                      |
| Shared API client generate | `Pass` | `corepack pnpm nx run shared-api-client:generate`                                            |
| Shared API client check    | `Pass` | `corepack pnpm nx run shared-api-client:check`                                               |
| Admin data-access lint     | `Pass` | `corepack pnpm nx lint admin-data-access`                                                    |
| Admin build                | `Pass` | `corepack pnpm nx build poms-admin`                                                          |
| Migration up               | `Pass` | `corepack pnpm nx run poms-api:migration-up`                                                 |
| Migration check            | `Pass` | `corepack pnpm nx run poms-api:migration-check`                                              |
| Markdown format            | `Pass` | `corepack pnpm run format:md:check`                                                          |
| Diff hygiene               | `Pass` | `git diff --check`                                                                           |

## 5. Exceptions

| Exception ID             | Level | Scope                                                    | Status | Cleanup Owner | Cleanup Due |
| ------------------------ | ----- | -------------------------------------------------------- | ------ | ------------- | ----------- |
| `EX17-E2-LEAD-BOOTSTRAP` | `E2`  | `POST /projects` 仍可无 Lead bootstrap Project           | `open` | `Codex`       | `FE-29` G4  |
| `EX31-E1-NO-CONVERT`     | `E1`  | 本片只定义 `convertedProjectSummary`，不产生非空转换结果 | `open` | `Codex`       | `EX-32` G4  |

## 6. G3 Conclusion

- `G3 = Pass`
- 本地验证已满足 `EX-31` 风险级别。
- 本片尚未进入 `G4`，因为当前改动还未提交；提交后可做 G4 close-out，并进入 `EX-32`。
