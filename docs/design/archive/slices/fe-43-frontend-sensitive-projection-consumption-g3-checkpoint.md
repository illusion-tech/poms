# FE-43 前端消费后端敏感字段投影 G3 Checkpoint

- Task ID: `FE-43`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression
- Baseline: `docs/design/archive/slices/fe-43-frontend-sensitive-projection-consumption-baseline.md`

---

## 1. 本地交付

`FE-43` 已按 G1 基线完成本地实现：

1. 新增前端共享 projection 展示 helper：
   - `SENSITIVE_PROJECTION_MODE`
   - `isSensitiveProjectionFull`
   - `sensitiveProjectionDisplayText`
   - `formatSensitiveAmountProjection`
2. 合同列表签约金额改为消费 `ContractSummary.signedAmountProjection`。
3. 合同详情签约金额改为消费 `ContractDetailView.signedAmountProjection`。
4. 合同详情核心条款中的含税 / 未税金额改为消费 `ContractTermSnapshotSummary.amountTaxInclusiveProjection` / `amountTaxExclusiveProjection`。
5. 项目详情当前合同签约金额改为消费 `ProjectDetailContractSummary.signedAmountProjection`。
6. 合同承接页有效合同额和合同项签约金额改为消费 `ContractHandoverEffectiveContractSetSummary.totalSignedAmountProjection` / `ContractHandoverContractItemSummary.signedAmountProjection`。
7. 金额展示不再用 `contract:finance:manage` 推断完整值；命令入口仍保留既有操作权限判断。
8. Focused component specs 和浏览器权限矩阵已更新为 full / masked projection 输入。

---

## 2. 文件范围

| Area             | Files                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared UI helper | `apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts`                                                                                                 |
| Contract UI      | `apps/poms-admin/src/app/features/contract/contract-list.ts`、`apps/poms-admin/src/app/features/contract/contract-detail.ts`                                |
| Project UI       | `apps/poms-admin/src/app/features/project/project-detail.ts`、`apps/poms-admin/src/app/features/project/project-contract-handover.ts`                       |
| Component tests  | `apps/poms-admin/src/app/features/contract/contract-list.spec.ts`、`contract-detail.spec.ts`、`project-detail.spec.ts`、`project-contract-handover.spec.ts` |
| E2E              | `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`                                                                                     |
| Governance docs  | EX-37B G4 close-out、FE-43 baseline、本 checkpoint、tracker、progress                                                                                       |

---

## 3. 验证结果

| Check                                                                                                                                                        | Result | Notes                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| `corepack pnpm nx lint poms-admin`                                                                                                                           | Pass   | 前端 runtime、spec 与 shared UI helper 通过 lint。                                 |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts`                                                | Pass   | `1` suite / `7` tests passed。                                                     |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts`                                              | Pass   | `1` suite / `3` tests passed。                                                     |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-detail.spec.ts`                                                | Pass   | `1` suite / `21` tests passed。                                                    |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts`                                     | Pass   | `1` suite / `3` tests passed。                                                     |
| `corepack pnpm nx build poms-admin`                                                                                                                          | Pass   | production build passed。                                                          |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts` | Pass   | `5` tests passed；WebServer 输出 NX daemon / inspector port 本机噪声，不影响结果。 |
| `corepack pnpm run format:md:check`                                                                                                                          | Pass   | 文档表格格式化后通过。                                                             |
| `git diff --check`                                                                                                                                           | Pass   | 无空白与行尾漂移。                                                                 |
| API validation                                                                                                                                               | N/A    | 本片不改后端 API / generated client。                                              |
| `migration-check`                                                                                                                                            | N/A    | 本片不改 DDL、entity、repository 或 migration。                                    |

---

## 4. Drift 判断

| Edge                       | Result            | Notes                                                                                                 |
| -------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| FE-43 baseline -> code     | Pass              | G1 冻结的合同列表 / 详情、项目详情、合同承接金额展示均改为消费 projection。                           |
| Frontend display authority | Pass              | 金额展示不再用 `contract:finance:manage` 推断完整值；full / masked 由 response projection 决定。      |
| Command permission         | Pass              | 新建合同、编辑合同、提交 / 生效等命令入口仍按既有操作权限处理，不把 projection mode 当作命令授权。    |
| Public API / client        | No change         | 未新增 route，未重新生成 client。                                                                     |
| Non-projected term fields  | Accepted boundary | 合同详情税率、比例、付款条款仍沿用本地 command permission 可见性；后端 projection 扩展不在本片。      |
| Browser matrix             | Pass              | admin mock 使用 full projection，viewer mock 使用 masked projection；菜单入口和 direct URL 均已覆盖。 |

---

## 5. 例外与风险

| ID                                      | Status            | Decision                                                                                   |
| --------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `FE43-R1-LEGACY-SCALAR-STILL-PRESENT`   | Accepted boundary | legacy scalar 字段仍存在于 generated client，但前端金额展示不再依赖它。                    |
| `FE43-R2-NON-PROJECTED-TERM-FIELDS`     | Accepted boundary | 非投影条款字段仍是后续后端字段包扩展问题，不在本片扩大治理。                               |
| `FE43-R3-BROWSER-MATRIX-USES-DEV-ROLES` | Accepted boundary | 浏览器矩阵继续依赖 dev role fixture 区分 admin / viewer 敏感读权限；后续权限治理可再细化。 |

---

## 6. G3 结论

`FE-43` 满足本地 G3：第一批合同经营金额前端展示已经以后端 `SensitiveStringFieldProjection` 为正式事实源。

提交后可进入 `G4 close-out`，然后再按优先级进入 `EX-37C` 或下一片前端收口任务。
