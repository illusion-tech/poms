# EX-35A 业务编号系统生成后端 / 契约 / migration G3/G4 Close-out

- Gate Status: `G3 = Pass`, `G4 = Pass`
- Parent: `EX-35`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Codex`
- G4 Reviewer: `Codex`
- Close-out Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-35A`

## 1. 交付边界

本片已交付:

1. 新增 `business_number_sequence` 与 `BusinessNumberService`，按 `scope + period` 原子递增生成业务编号。
2. `Lead.leadCode` 收敛为后端生成 `Lead.leadNo = LD-{YYYY}-{000000}`。
3. `Project.projectCode` 收敛为后端生成 `Project.projectNo = PRJ-{YYYY}-{000000}`，并新增 optional `customerProjectNo`。
4. `Contract.contractNo` 保留为 POMS 内部合同号，但由后端生成 `CT-{YYYY}-{000000}`，并新增 optional `customerContractNo`。
5. `ProjectActualCostRecord.recordNo` 改为正式后端编号，覆盖 payment / invoice / expense / procurement / labor 五类来源。
6. `ProjectBidCommercialProcess` 新增 optional `tenderNo` / `bidPackageNo`。
7. shared contracts、API DTO、OpenAPI spec、generated Angular client、seed / e2e fixtures 已同步。
8. 为避免 generated client 直接打断前端构建，本片额外完成了 admin 最小兼容: 展示字段切到 `leadNo` / `projectNo`，线索 / 项目创建与线索转项目不再提交 POMS 内部编号。

本片未交付:

1. 编号管理后台、sequence 重置、人工补号、跳号审计视图。
2. 产品级前端 UX / 表单完整收口；仍由 `FE-30` 进入自己的 `G1`。
3. public route path 改名；`/projects/code/:projectNo` 暂保留，后续如要改 path 必须另开 route governance slice。

## 2. Drift 与纠偏记录

| Drift ID                                | Classification   | Finding                                                                                                   | Resolution                                                                                                           | Result             |
| --------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `EX35A-D1-COLUMN-COMMENT-DRIFT`         | `new-real-drift` | `migration-check` 检出 `lead_no` / `project_no` / `contract_no` column comment 与 entity comment 不一致。 | 修正 EX-35A migration comment，并用 `schema:update --run` 同步本地库。                                               | Resolved           |
| `EX35A-D2-E2E-TODO-TITLE-DRIFT`         | `new-real-drift` | 合同审批待办标题已从调用方传入编号变为系统生成 `contract.contractNo`，E2E 仍断言旧 `E2E-HT-*`。           | E2E 改为断言返回合同的 `contractNo`，并移除 e2e request helper 对 `projectNo` / `contractNo` / `leadNo` 输入的依赖。 | Resolved           |
| `EX35A-D3-ADMIN-GENERATED-CLIENT-DRIFT` | `new-real-drift` | generated client 移除旧字段后，admin 构建中旧 `leadCode` / `projectCode` 引用失败。                       | 做最小兼容改造，构建与单测恢复；产品级 UX 仍交给 `FE-30`。                                                           | Resolved for build |

## 3. 验证结果

| Check              | Required | Command / Evidence                                                                                | Result       | Notes                                                                  |                                                |        |                                                     |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- | ---------------------------------------------- | ------ | --------------------------------------------------- |
| API lint           | Yes      | `corepack pnpm nx lint poms-api`                                                                  | Passed       | All files pass linting.                                                |                                                |        |                                                     |
| API build          | Yes      | `corepack pnpm nx build poms-api`                                                                 | Passed       | Includes `shared-contracts:build`.                                     |                                                |        |                                                     |
| API unit tests     | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                      | Passed       | `39` suites / `493` tests.                                             |                                                |        |                                                     |
| API E2E            | Yes      | `corepack pnpm nx e2e poms-api-e2e`                                                               | Passed       | `12` suites / `69` tests after e2e expectation drift fix.              |                                                |        |                                                     |
| Admin lint         | Yes      | `corepack pnpm nx lint poms-admin`                                                                | Passed       | Needed because generated client touched admin compile surface.         |                                                |        |                                                     |
| Admin build        | Yes      | `corepack pnpm nx build poms-admin`                                                               | Passed       | Minimal compatibility only; not FE-30 UX closure.                      |                                                |        |                                                     |
| Admin unit tests   | Yes      | `corepack pnpm nx test poms-admin --runInBand`                                                    | Passed       | `20` suites / `90` tests.                                              |                                                |        |                                                     |
| OpenAPI generation | Yes      | `corepack pnpm nx run poms-api:openapi`                                                           | Passed       | Request / response schema updated.                                     |                                                |        |                                                     |
| Generated client   | Yes      | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check` | Passed       | Existing generator warnings for `propertyNames` remain tool noise.     |                                                |        |                                                     |
| Migration apply    | Yes      | `corepack pnpm exec mikro-orm migration:up --config apps/poms-api/src/mikro-orm.config.ts`        | Passed       | First attempt hit transient `ENOBUFS`; retry applied EX-35A migration. |                                                |        |                                                     |
| Migration check    | Yes      | `corepack pnpm nx run poms-api:migration-check`                                                   | Passed       | `No changes required, schema is up-to-date`.                           |                                                |        |                                                     |
| Legacy naming scan | Yes      | `rg "leadCode\                                                                                    | projectCode\ | findByCode\                                                            | findProjectByCode" ... -g "!**/migrations/**"` | Passed | No residual old API / UI naming outside migrations. |
| Diff hygiene       | Yes      | `git diff --check`                                                                                | Passed       | Only CRLF normalization warnings; no whitespace errors.                |                                                |        |                                                     |

## 4. 例外处理

| Exception ID                    | Status      | Scope                                | Resolution                                                                                           |
| ------------------------------- | ----------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `EX35-E1-DEV-NO-HISTORY-COMPAT` | Closed      | 开发期不保留旧编号 DTO / UI 兼容层。 | EX-35A 已 direct cutover；old request fields removed from backend contracts and e2e helpers.         |
| `EX35A-E1-FRONTEND-DEFERRED`    | Transferred | 产品级前端表单 / 展示完整收口。      | Admin build blocker 已最小修复；`FE-30` 仍负责 UX、入口链、浏览器验证和合同 / 投标外部编号表单体验。 |

## 5. G4 结论

- `EX-35A` 可标记 `Done`。
- 下游后端、OpenAPI、generated client 与 e2e 可依赖系统生成编号语义。
- `FE-30` 继续保持 `Todo / G0`，但其输入已从“generated client 后修 build”收敛为“产品级前端编号体验 G1 与实现”。
