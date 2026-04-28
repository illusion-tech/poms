# EX-39 剩余敏感字段分级与摘要粒度治理 G1 Baseline

- Task ID: `EX-39`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-39`
- Parent: sensitive projection downstream governance
- Upstream: `FE-43`、`EX-37C`、`EX-37C1`、`FE-44`

---

## 1. 背景

`EX-37B1`、`EX-37C1`、`EX-37C2` 与 `FE-44` 已完成第一批 `contract-finance`、`operating-finance`、`commission-compensation` 的 projection-only 切换。剩余两个开放项仍需要收口：

1. `FE43-R2-NON-PROJECTED-TERM-FIELDS`: 合同条款快照中的税率、首付款比例、质保金比例、付款条款仍是 scalar response 字段，前端用 `contract:finance:manage` 本地判断展示。
2. `EX37C1-R3-SUMMARY-STRING-GRANULARITY`: L4 `grossMarginSummaryProjection` 是金额与比例拼接字符串，粒度不够清晰；其他 L4 叙事字段需要逐项确认是否继续 projection 或保留 scalar。

当前系统仍在开发中，未上线。本片按 direct cutover 处理，不做兼容字段、不做前端临时遮罩、不保留双字段过渡。

---

## 2. G1 范围

### In Scope

1. 合同条款快照 response 字段切为 `contract-finance` sensitive projection：
   - `taxRate` -> `taxRateProjection`
   - `downPaymentRate` -> `downPaymentRateProjection`
   - `retentionRate` -> `retentionRateProjection`
   - `paymentTerms` -> `paymentTermsProjection`
2. `ContractTermSnapshotSummary` 不再向读取响应暴露上述 scalar 字段。
3. `ContractController.mapSnapshotToSummary` 和 `ContractTermSnapshotController` 统一复用后端 projection，完整值读取只看 `contract:finance:sensitive:read`。
4. 合同详情前端只消费 generated projection 字段；比例展示通过 projection value 格式化，masked / denied 展示 `displayText`。
5. L4 毛利摘要从混合字符串拆成两个 projection 字段：
   - `grossMarginAmountProjection`
   - `grossMarginRateProjection`
6. `ProjectBusinessOutcomeOverviewView` 不再暴露 `grossMarginSummaryProjection`。
7. L4 前端经营总览用金额 projection 和比例 projection 组合展示毛利。
8. 更新 shared contracts、OpenAPI、generated client、focused backend tests、focused frontend tests 与治理文档。

### Out Of Scope

1. 不新增、删除或改名 public route path / method。
2. 不新增权限 key；继续使用既有字段包：
   - `contract-finance` -> `contract:finance:sensitive:read`
   - `operating-finance` -> `operating:finance:sensitive:read`
3. 不改 DDL、entity、repository、migration 或持久化字段。
4. 不改变合同创建 / 更新 / 生效命令输入字段；本片只治理读取响应。
5. 不拆 `taxImpactSummaryProjection`、`varianceSourceSummaryProjection`、`nextActionSummaryProjection`、`downstreamConsumerSummaryProjection` 的持久化模型；本片只冻结它们的字段分级结论。
6. 不处理 `EX-38` 的 masked / denied security event 批量降噪。

---

## 3. 字段分级结论

| Field / View                                                                                                               | Current State                          | EX-39 Decision                           | Reason                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `ContractTermSnapshotSummary.taxRate`                                                                                      | scalar + frontend local permission     | replace with `taxRateProjection`         | 税率属于合同与回款经营包，可能反推税务与合同商业条件，必须由后端投影控制。             |
| `ContractTermSnapshotSummary.downPaymentRate`                                                                              | scalar + frontend local permission     | replace with `downPaymentRateProjection` | 首付款比例属于回款条件，属于合同经营敏感字段。                                         |
| `ContractTermSnapshotSummary.retentionRate`                                                                                | scalar + frontend local permission     | replace with `retentionRateProjection`   | 质保金比例属于合同经营与回款条件，属于敏感字段。                                       |
| `ContractTermSnapshotSummary.paymentTerms`                                                                                 | scalar + frontend local permission     | replace with `paymentTermsProjection`    | 付款条款可能暴露回款节奏、比例与商务条件，必须后端投影。                               |
| `ProjectBusinessOutcomeOverviewView.grossMarginSummaryProjection`                                                          | projection over mixed amount/rate text | replace with amount/rate projections     | 毛利金额和毛利率是不同语义，应结构化拆分，避免前端解析混合字符串。                     |
| `ProjectBusinessOutcomeOverviewView.taxImpactSummaryProjection`                                                            | projection                             | keep projection                          | 税务影响摘要属于毛利与税务影响包，叙述文本也可能包含敏感原因或金额判断。               |
| `ProjectVarianceRiskExplanationView.varianceSourceSummaryProjection`                                                       | projection                             | keep projection                          | 偏差来源可能暴露成本、回款、毛利或税务异常原因，继续归入 `operating-finance`。         |
| `ProjectVarianceRiskExplanationView.taxImpactSummaryProjection`                                                            | projection                             | keep projection                          | 税务影响摘要继续归入 `operating-finance`。                                             |
| `BusinessAccountingFeedbackView.nextActionSummaryProjection`                                                               | projection                             | keep projection                          | 下一步动作来自经营信号与提成 gate 绑定，可能含税务 / 经营阻断原因，不能退回 scalar。   |
| `BusinessAccountingFeedbackView.downstreamConsumerSummaryProjection`                                                       | projection                             | keep projection                          | 下游影响可能暴露提成 gate、经营核算或管理关注原因，继续作为 `operating-finance` 叙事。 |
| `allocationStabilitySummary`、`unmappedCostSummary`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel` | scalar                                 | keep scalar                              | 属于数据成熟度 / 分摊稳定性 / 操作建议，不直接携带金额、税率、毛利率或提成金额。       |

---

## 4. Contract 冻结

### 4.1 合同条款快照

新增 projection 字段统一使用：

```ts
SensitiveStringFieldProjectionSchema
```

字段包统一为：

```ts
fieldPackageKey: 'contract-finance'
```

字段替换规则：

| DTO / View                    | Removed Scalar    | Projection Field            | Raw Value Surface |
| ----------------------------- | ----------------- | --------------------------- | ----------------- |
| `ContractTermSnapshotSummary` | `taxRate`         | `taxRateProjection`         | projection only   |
| `ContractTermSnapshotSummary` | `downPaymentRate` | `downPaymentRateProjection` | projection only   |
| `ContractTermSnapshotSummary` | `retentionRate`   | `retentionRateProjection`   | projection only   |
| `ContractTermSnapshotSummary` | `paymentTerms`    | `paymentTermsProjection`    | projection only   |

### 4.2 L4 毛利摘要

字段包统一为：

```ts
fieldPackageKey: 'operating-finance'
```

字段替换规则：

| DTO / View                           | Removed Projection             | Projection Field              | Raw Value Source                             |
| ------------------------------------ | ------------------------------ | ----------------------------- | -------------------------------------------- |
| `ProjectBusinessOutcomeOverviewView` | `grossMarginSummaryProjection` | `grossMarginAmountProjection` | `ProjectOperatingSnapshot.grossMarginAmount` |
| `ProjectBusinessOutcomeOverviewView` | `grossMarginSummaryProjection` | `grossMarginRateProjection`   | `ProjectOperatingSnapshot.grossMarginRate`   |

`grossMarginRateProjection` 在无比例值时允许 `value = null`，不要求前端伪造 `0` 或 `-`；展示 fallback 由前端 projection helper 处理。

---

## 5. 权限与审计边界

### Authorized

当用户具备对应字段包敏感读权限：

1. projection `mode = 'full'`。
2. projection `value = 原始字符串`。
3. projection `displayText = 原始字符串` 或后端指定完整展示文本。
4. 不记录 masked / denied security event。

### Unauthorized

当用户缺少对应字段包敏感读权限：

1. projection `mode = 'masked'`。
2. projection `value = null`。
3. projection `displayText = 敏感字段已隐藏` 或后端统一遮罩文案。
4. 响应不包含被替换的 scalar 字段。
5. 记录既有 `sensitive_field.masked` security event；事件量优化不在本片处理，交给 `EX-38`。

`targetType` / `targetId`：

| View Family            | targetType         | targetId      |
| ---------------------- | ------------------ | ------------- |
| Contract term snapshot | `ContractSnapshot` | `snapshot.id` |
| L4 operating overview  | `Project`          | `projectId`   |

---

## 6. Public Interface 与 Route 判断

| 项目                 | G1 判断                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Public route surface | 不新增、不删除、不改 path / method。                                                     |
| Route inventory      | 本片只改既有 response DTO 字段，不更新 ADR-015 route inventory。                         |
| Shared contract      | 会修改 `ContractTermSnapshotSummary` 与 `ProjectBusinessOutcomeOverviewView` response。  |
| Generated client     | 必须运行 `poms-api:openapi` 与 `shared-api-client:check`，并提交 generated client diff。 |
| Frontend             | 合同详情与 L4 经营总览必须同步切换 generated 字段；不允许本地权限遮罩兼容旧字段。        |
| Runtime persistence  | 不改 DDL / entity / repository / migration。                                             |

---

## 7. 预期文件范围

Expected runtime / contract files:

1. `libs/shared/contracts/src/lib/shared-contracts.ts`
2. `apps/poms-api/src/app/features/contract/contract.controller.ts`
3. `apps/poms-api/src/app/features/project-cost/project-cost.service.ts`
4. `apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts`
5. `apps/poms-admin/src/app/features/contract/contract-detail.ts`
6. `apps/poms-admin/src/app/features/project/project-operating-overview.ts`

Expected tests:

1. `apps/poms-api/src/app/features/contract/contract.controller.spec.ts`
2. `apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts`
3. `apps/poms-admin/src/app/features/contract/contract-detail.spec.ts`
4. `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`
5. `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`

Expected generated outputs:

1. `libs/shared/api-spec/openapi.json`
2. `libs/shared/api-client/**`

Expected docs:

1. This baseline.
2. `EX-39` G3 checkpoint.
3. `phase2-development-execution-tracker.md`
4. `poms-design-progress.md`

---

## 8. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx build shared-contracts`
4. `corepack pnpm nx lint poms-api`
5. `corepack pnpm nx build poms-api`
6. Focused backend tests:
   - contract snapshot projection test for authorized / unauthorized term fields
   - project cost overview projection test for split gross margin fields
7. `corepack pnpm nx run poms-api:openapi`
8. `corepack pnpm nx run shared-api-client:check`
9. `corepack pnpm nx lint poms-admin`
10. Focused frontend tests:
    - `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts --runInBand`
    - `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`
11. `corepack pnpm nx build poms-admin`
12. Targeted browser matrix if frontend display assertions change:
    - `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`

Not required:

1. `migration-check`，因为不改 DDL。
2. Full Playwright suite，除非 targeted matrix 暴露入口或权限回归。

---

## 9. 例外与风险

| Exception ID | Level | Scope | Owner | Cleanup Due | Decision                                                      |
| ------------ | ----- | ----- | ----- | ----------- | ------------------------------------------------------------- |
| N/A          | N/A   | N/A   | N/A   | N/A         | 本片直接关闭 `FE43-R2` 与 `EX37C1-R3`，不新增兼容或延期例外。 |

---

## 10. G1 结论

`EX-39` 可以进入 implementation。

冻结条件：

1. 合同条款快照剩余经营字段必须改为后端 projection-only。
2. L4 毛利摘要必须从混合字符串拆成金额 / 比例两个 projection 字段。
3. L4 税务、偏差、下一步、下游影响叙事字段继续保持 projection，不回退 scalar。
4. 不改 public route path / method，不改 DDL，不新增权限 key。
5. 不保留旧 scalar 兼容字段，不做前端临时遮罩。
