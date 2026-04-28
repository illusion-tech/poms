# EX-39 剩余敏感字段分级与摘要粒度治理 G4 Close-out

- Task ID: `EX-39`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: cross-layer-high-risk contract / backend projection / frontend consumption
- Baseline: `docs/design/archive/slices/ex-39-sensitive-field-granularity-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-39-sensitive-field-granularity-g3-checkpoint.md`
- Implementation Commit: `ed0302b feat(project-cost): 完成 EX-39 敏感字段粒度收敛闭环`

---

## 1. G4 结论

`EX-39` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `ContractTermSnapshotSummary` 清退剩余合同条款 scalar response 字段。
2. 合同快照税率、首付款比例、质保金比例、付款条款改为 `contract-finance` projection-only 字段。
3. `ProjectBusinessOutcomeOverviewView` 删除混合 `grossMarginSummaryProjection`。
4. L4 毛利摘要拆成 `grossMarginAmountProjection` 与 `grossMarginRateProjection`。
5. 合同详情、L4 经营总览、store fixture、targeted browser matrix 已同步 generated DTO。
6. 本片不新增 public API route、permission key、DDL、entity 或 migration。

---

## 2. 提交证据

| Evidence              | Result                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Implementation commit | `ed0302b feat(project-cost): 完成 EX-39 敏感字段粒度收敛闭环`                                   |
| Baseline              | `docs/design/archive/slices/ex-39-sensitive-field-granularity-baseline.md`                      |
| G3 checkpoint         | `docs/design/archive/slices/ex-39-sensitive-field-granularity-g3-checkpoint.md`                 |
| Shared contracts      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                             |
| OpenAPI / client      | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*`                           |
| Backend runtime       | `apps/poms-api/src/app/features/contract/contract.controller.ts`、`project-cost` service        |
| Frontend consumption  | `apps/poms-admin/src/app/features/contract/contract-detail.ts`、`project-operating-overview.ts` |
| Tracker / progress    | `docs/design/phase2-development-execution-tracker.md`、`docs/design/poms-design-progress.md`    |

---

## 3. G3 验证回放

| Check                        | Command                                                                                                                                                                             | Result                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| shared contracts build       | `corepack pnpm nx build shared-contracts`                                                                                                                                           | Pass                                                                                                    |
| API contract / service tests | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`                                                         | Pass, poms-api suite completed                                                                          |
| API project-cost tests       | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts --runInBand`                                                    | Pass, poms-api suite completed                                                                          |
| admin contract detail tests  | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts --runInBand`                                                         | Pass                                                                                                    |
| admin workspace store tests  | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`                                                  | Pass                                                                                                    |
| poms-api lint                | `corepack pnpm nx lint poms-api`                                                                                                                                                    | Pass                                                                                                    |
| poms-api build               | `corepack pnpm nx build poms-api`                                                                                                                                                   | Pass                                                                                                    |
| OpenAPI generation           | `corepack pnpm nx run poms-api:openapi`                                                                                                                                             | Pass                                                                                                    |
| generated client check       | `corepack pnpm nx run shared-api-client:check`                                                                                                                                      | Pass, with existing OpenAPI generator `propertyNames` warnings classified as `existing-baseline-drift`. |
| poms-admin lint              | `corepack pnpm nx lint poms-admin`                                                                                                                                                  | Pass                                                                                                    |
| poms-admin build             | `corepack pnpm nx build poms-admin`                                                                                                                                                 | Pass                                                                                                    |
| targeted browser matrix      | `POMS_E2E_PORT_SEED=539 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts` | Pass, 7 tests                                                                                           |
| Markdown check               | `corepack pnpm run format:md:check`                                                                                                                                                 | Pass                                                                                                    |
| Diff whitespace              | `git diff --check`                                                                                                                                                                  | Pass                                                                                                    |

---

## 4. Drift 与例外

| Item                                    | Status         | Decision                                                                                |
| --------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `FE43-R2-NON-PROJECTED-TERM-FIELDS`     | Closed at G4   | 合同条款剩余经营字段已切为后端 projection-only，前端不再用本地权限推断完整值。          |
| `EX37C1-R3-SUMMARY-STRING-GRANULARITY`  | Closed at G4   | L4 毛利摘要已拆成金额 / 比例 projection，清退混合字符串 projection。                    |
| OpenAPI generator `propertyNames` noise | Existing drift | 生成检查通过；`CreateCommissionRuleVersionRequest` / `AuditSnapshot` 警告不是本片新增。 |
| Playwright inspector port noise         | Tool noise     | WebServer 输出的 inspector 端口占用不影响 targeted browser matrix 结果。                |
| Public route surface                    | No change      | 未新增或修改 public route；本片仅改变既有 response contract 字段。                      |
| Persistence / migration                 | No change      | 未改 DDL、entity、repository 或 migration。                                             |
| Compatibility strategy                  | Not applicable | 当前仍处开发期，按用户确认直接清退旧字段，不保留兼容字段、不做 fallback。               |

---

## 5. 下游承接

`EX-39` 关闭后，敏感投影链路剩余治理项只保留审计事件量优化：

1. `EX37B-R3`：合同 / 项目经营金额列表或摘要 projection 的 masked / denied 事件批量降噪。
2. `EX37C2-R2`：L5 提成 projection 的 masked / denied 事件批量降噪。

二者均由 `EX-38` 承接。
