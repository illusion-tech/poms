# EX-37B1 合同经营金额 projection-only 清退 G1 Baseline

- Task ID: `EX-37B1`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend fixture cleanup
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37B1`
- Parent: `EX-37`
- Upstream: `EX-37A`、`EX-37B`、`FE-43`、`EX-37C1`

---

## 1. 背景

`EX-37B` 已把第一批 `contract-finance` 字段接入后端 sensitive projection，但当时为了过渡兼容保留了 legacy scalar 字段，并在无敏感读权限时返回 `null`。`FE-43` 已完成前端消费后端 projection，`EX-37C1` 进一步确认当前系统仍处开发期、未上线，后续方案不需要兼容历史 response。

因此本片作为 `EX-37B` 后续 cleanup，直接清退第一批合同经营金额 response 中的 legacy scalar 字段，使 `contract-finance` 与 `operating-finance` 一样进入 projection-only 口径。

---

## 2. G1 范围

### In Scope

1. 移除 `ContractSummary.signedAmount`，保留 `signedAmountProjection`。
2. 移除 `ContractTermSnapshotSummary.amountTaxInclusive` / `amountTaxExclusive`，保留对应 projection 字段。
3. 移除 `ProjectDetailContractSummary.signedAmount`，保留 `signedAmountProjection`。
4. 移除 `ContractHandoverContractItemSummary.signedAmount`，保留 `signedAmountProjection`。
5. 移除 `ContractHandoverEffectiveContractSetSummary.totalSignedAmount`，保留 `totalSignedAmountProjection`。
6. 同步 API mapper / tests，不再返回或断言上述 legacy scalar。
7. 同步 OpenAPI、generated client 和前端 fixtures / specs。
8. 更新 `EX-37B` 的历史例外状态，关闭 legacy scalar 兼容边界。

### Out Of Scope

1. 不改 create / update command DTO 中的合同金额输入字段。
2. 不改 persistence entity / repository / migration；数据库仍保存原始业务金额。
3. 不改 `CommercialReleaseBaselineSummary`、`ProjectOperatingSnapshotSummary`、`PeriodClosingSnapshotSummary` 等非 `EX-37B` 第一批字段。
4. 不改 `L4 / L5` projection 队列；`EX-37C1` 已完成 L4，`EX-37C2` 后续处理 L5。
5. 不新增 route path / method、不新增权限 key。
6. 不补浏览器矩阵；前端已消费 projection，本片是 contract cleanup，浏览器矩阵仍按 `FE-43` / 后续权限治理承接。

---

## 3. 正式输入

| 输入                 | 文件 / 证据                                                                    | EX-37B1 使用方式                                                        |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Sensitive primitive  | `ex-37a-sensitive-projection-primitive-g4-closeout.md`                         | 复用既有 `contract-finance` 字段包和 `SensitiveStringFieldProjection`。 |
| EX-37B baseline / G4 | `ex-37b-contract-finance-sensitive-projection-*.md`                            | 标记 legacy scalar 兼容边界已过时并进入 cleanup。                       |
| FE-43 G4             | `fe-43-frontend-sensitive-projection-consumption-g4-closeout.md`               | 前端展示已以 projection 为事实源，可安全移除 scalar fixtures。          |
| Shared contracts     | `libs/shared/contracts/src/lib/shared-contracts.ts`                            | 移除第一批 `contract-finance` legacy scalar response 字段。             |
| API runtime          | `apps/poms-api/src/app/features/contract/*`、`project/*`、`project-handover/*` | mapper 不再输出 legacy scalar。                                         |
| Frontend consumers   | `apps/poms-admin/src/app/features/contract/*`、`project/*`                     | 测试 fixture 只提供 projection 字段，确保页面不依赖 legacy scalar。     |

---

## 4. Contract 冻结

字段包统一为：

```ts
fieldPackageKey: 'contract-finance'
```

projection-only 替换规则：

| DTO / View                                    | Removed Scalar       | Projection Field               |
| --------------------------------------------- | -------------------- | ------------------------------ |
| `ContractSummary`                             | `signedAmount`       | `signedAmountProjection`       |
| `ContractTermSnapshotSummary`                 | `amountTaxInclusive` | `amountTaxInclusiveProjection` |
| `ContractTermSnapshotSummary`                 | `amountTaxExclusive` | `amountTaxExclusiveProjection` |
| `ProjectDetailContractSummary`                | `signedAmount`       | `signedAmountProjection`       |
| `ContractHandoverContractItemSummary`         | `signedAmount`       | `signedAmountProjection`       |
| `ContractHandoverEffectiveContractSetSummary` | `totalSignedAmount`  | `totalSignedAmountProjection`  |

正式 response 不再携带上述 scalar 字段。完整值只允许出现在 projection 的 `value` / `displayText` 中。

---

## 5. Public Interface 与 Route 判断

| 项目                 | G1 判断                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| Public route surface | 不新增、不删除、不改 path / method。                                                  |
| Route inventory      | 不需要更新 authoritative inventory。                                                  |
| Shared contract      | 删除既有 response DTO 字段，是开发期 direct cutover，不保留兼容层。                   |
| Generated client     | 必须运行 `poms-api:openapi` 与 `shared-api-client:check`，提交 generated model diff。 |
| Frontend build       | 必须同步 fixture / type usage，避免 generated DTO 删除字段后页面测试漂移。            |
| Runtime persistence  | 不改 DDL / entity / repository。                                                      |

---

## 6. 预期文件范围

Expected runtime / contract files:

1. `libs/shared/contracts/src/lib/shared-contracts.ts`
2. `apps/poms-api/src/app/features/contract/contract.controller.ts`
3. `apps/poms-api/src/app/features/contract/contract.controller.spec.ts`
4. `apps/poms-api/src/app/features/project/project-query.service.ts`
5. `apps/poms-api/src/app/features/project/project-query.service.spec.ts`
6. `apps/poms-api/src/app/features/project-handover/project-handover-query.service.ts`
7. `apps/poms-api/src/app/features/project-handover/project-handover-query.service.spec.ts`

Expected frontend files:

1. `apps/poms-admin/src/app/features/contract/contract-list.spec.ts`
2. `apps/poms-admin/src/app/features/contract/contract-detail.spec.ts`
3. `apps/poms-admin/src/app/features/project/project-detail.spec.ts`
4. `apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts`
5. `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`

Expected generated / docs:

1. `libs/shared/api-spec/openapi.json`
2. `libs/shared/api-client/model/*`
3. This baseline.
4. `EX-37B1` G3 checkpoint.
5. `phase2-development-execution-tracker.md`
6. `poms-design-progress.md`

---

## 7. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx build shared-contracts`
4. `corepack pnpm nx lint poms-api`
5. `corepack pnpm nx build poms-api`
6. Focused backend tests:
   - `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`
   - `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project/project-query.service.spec.ts --runInBand`
   - `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project-handover/project-handover-query.service.spec.ts --runInBand`
7. `corepack pnpm nx run poms-api:openapi`
8. `corepack pnpm nx run shared-api-client:check`
9. `corepack pnpm nx lint poms-admin`
10. `corepack pnpm nx build poms-admin`
11. Focused frontend specs for contract / project projection fixtures.

Not required:

1. `migration-check`，因为不改 DDL。
2. Playwright E2E，本片不新增导航、权限入口或 UI 行为；只删除已不用的 scalar response fields。

---

## 8. 例外与风险

| ID                                   | Level  | Scope       | Owner | Cleanup Due | Decision                                                         |
| ------------------------------------ | ------ | ----------- | ----- | ----------- | ---------------------------------------------------------------- |
| `EX37B1-R1-NON-EX37B-FINANCE-FIELDS` | Medium | Scope guard | Codex | 后续治理    | 本片只清退 `EX-37B` 第一批 response 字段，不扩展到其他金额 DTO。 |

---

## 9. G1 结论

`EX-37B1` 可以进入 implementation。

冻结条件：

1. 第一批 `contract-finance` response 正式进入 projection-only。
2. 不保留 legacy scalar 兼容层，不新增替代 scalar 字段。
3. 不改 route path / method，不改 DDL，不改命令输入语义。
4. `EX-37C2` 不混入本片。
