# EX-37C1 L4 经营金额后端投影切换 G1 Baseline

- Task ID: `EX-37C1`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37C1`
- Parent: `EX-37C`
- Upstream: `EX-37A`、`EX-37B`、`FE-43`

---

## 1. 背景

`EX-37A` 已提供 sensitive projection primitive、字段包权限映射和后端投影 helper。`EX-37B` 已将第一批 `contract-finance` 金额切到后端投影，`FE-43` 已让前端消费后端 projection。

剩余 `EX-37C` 同时覆盖 `L4` 经营视图与 `L5` 提成金额，运行时代码和前端影响面较大。为保持最小可交付边界，本轮将 `EX-37C` 拆分为：

1. `EX-37C1`：`L4` operating-finance 后端投影与 L4 前端直接消费切换。
2. `EX-37C2`：`L5` commission-compensation 后端投影。
3. `FE-44`：前端消费后续 `EX-37C2` 的 `L5` projection 字段，并补充跨 L4 / L5 的浏览器验证。

`EX-37C1` 只处理 `project-cost` 下的 `L4` 经营读取视图，不进入提成操作页和提成列表。

---

## 2. G1 范围

### In Scope

1. `GET /projects/:projectId/business-outcome-overview`
   - `effectiveContractSetSummary`
   - `receivableConfirmedAmountSummary`
   - `includedCostTotalSummary`
   - `currentEffectiveBaselineCostSummary`
   - `grossMarginSummary`
   - `taxImpactSummary`
2. `GET /projects/:projectId/unified-accounting`
   - `originalBaselineCostSummary`
   - `currentEffectiveBaselineCostSummary`
   - `includedCostTotalSummary`
   - `receivableConfirmedAmountSummary`
   - `taxImpactSummary`
   - `taxImpactPendingAmount`
3. `GET /projects/:projectId/variance-risk-explanation`
   - `varianceSourceSummary`
   - `taxImpactSummary`
4. `GET /projects/:projectId/business-accounting-feedback`
   - `taxImpactSummary`
   - `nextActionSummary`
   - `downstreamConsumerSummary`
5. 为上述字段新增 `SensitiveStringFieldProjectionSchema` projection 字段。
6. 移除上述字段对应的 legacy scalar，projection 是唯一事实源。
7. 同步 L4 前端读取页与提成 gate 解释页，直接消费 projection 字段。
8. 无敏感读权限时记录 `sensitive_field.masked` security event。
9. 更新 shared contracts、OpenAPI、generated client、focused backend tests 和 focused frontend tests。

### Out Of Scope

1. 不处理 `CommissionCalculationSummary`、`CommissionPayoutSummary`、`CommissionAdjustmentSummary`、`CommissionFinalSettlementView`、`CommissionRuleExplanationView`；这些属于 `EX-37C2`。
2. 不改 public route path / method。
3. 不新增后端命令、权限 key、DDL、entity、repository 或 migration。
4. 不处理 `L5` 前端页面消费；后续由 `EX-37C2` / `FE-44` 承接。
5. 不处理 labor cost rate 字段包。
6. 不处理导出申请、短时揭示或审批摘要裁剪。

---

## 3. 正式输入

| 输入                    | 文件 / 证据                                                                 | EX-37C1 使用方式                                                               |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Sensitive primitive     | `ex-37a-sensitive-projection-primitive-g4-closeout.md`                      | 复用 `SensitiveFieldProjectionService` 和 `operating-finance` 字段包权限映射。 |
| L4 route inventory      | `docs/design/api-route-canonical-inventory.md` rows `project-cost` B3       | 确认四个 L4 route 已 aligned，本片不改 route surface。                         |
| Shared contracts        | `libs/shared/contracts/src/lib/shared-contracts.ts`                         | 修改 L4 response schema，新增 projection 字段并移除对应 legacy scalar。        |
| Project cost controller | `apps/poms-api/src/app/features/project-cost/project-cost.controller.ts`    | L4 read endpoints 接收 request 并传递用户 / request context。                  |
| Project cost service    | `apps/poms-api/src/app/features/project-cost/project-cost.service.ts`       | 在 L4 query mapper 阶段生成 `operating-finance` projection。                   |
| Request context helper  | `apps/poms-api/src/app/core/sensitive-field-projection/*request-context.ts` | 从 request 提取 path / method / requestId / ip / userAgent。                   |
| Frontend consumers      | `poms-admin` L4 workspace pages                                             | 开发期不保留兼容层，本片同步切换 L4 页面读取 projection。                      |

---

## 4. Contract 冻结

新增 projection 字段统一使用：

```ts
SensitiveStringFieldProjectionSchema
```

字段包统一为：

```ts
fieldPackageKey: 'operating-finance'
```

字段替换规则：

| DTO / View                           | Removed Scalar                        | Projection Field                                | Raw Value Surface |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------- | ----------------- |
| `ProjectBusinessOutcomeOverviewView` | `effectiveContractSetSummary`         | `effectiveContractSetSummaryProjection`         | projection only   |
| `ProjectBusinessOutcomeOverviewView` | `receivableConfirmedAmountSummary`    | `receivableConfirmedAmountSummaryProjection`    | projection only   |
| `ProjectBusinessOutcomeOverviewView` | `includedCostTotalSummary`            | `includedCostTotalSummaryProjection`            | projection only   |
| `ProjectBusinessOutcomeOverviewView` | `currentEffectiveBaselineCostSummary` | `currentEffectiveBaselineCostSummaryProjection` | projection only   |
| `ProjectBusinessOutcomeOverviewView` | `grossMarginSummary`                  | `grossMarginSummaryProjection`                  | projection only   |
| `ProjectBusinessOutcomeOverviewView` | `taxImpactSummary`                    | `taxImpactSummaryProjection`                    | projection only   |
| `ProjectUnifiedAccountingView`       | `originalBaselineCostSummary`         | `originalBaselineCostSummaryProjection`         | projection only   |
| `ProjectUnifiedAccountingView`       | `currentEffectiveBaselineCostSummary` | `currentEffectiveBaselineCostSummaryProjection` | projection only   |
| `ProjectUnifiedAccountingView`       | `includedCostTotalSummary`            | `includedCostTotalSummaryProjection`            | projection only   |
| `ProjectUnifiedAccountingView`       | `receivableConfirmedAmountSummary`    | `receivableConfirmedAmountSummaryProjection`    | projection only   |
| `ProjectUnifiedAccountingView`       | `taxImpactSummary`                    | `taxImpactSummaryProjection`                    | projection only   |
| `ProjectUnifiedAccountingView`       | `taxImpactPendingAmount`              | `taxImpactPendingAmountProjection`              | projection only   |
| `ProjectVarianceRiskExplanationView` | `varianceSourceSummary`               | `varianceSourceSummaryProjection`               | projection only   |
| `ProjectVarianceRiskExplanationView` | `taxImpactSummary`                    | `taxImpactSummaryProjection`                    | projection only   |
| `BusinessAccountingFeedbackView`     | `taxImpactSummary`                    | `taxImpactSummaryProjection`                    | projection only   |
| `BusinessAccountingFeedbackView`     | `nextActionSummary`                   | `nextActionSummaryProjection`                   | projection only   |
| `BusinessAccountingFeedbackView`     | `downstreamConsumerSummary`           | `downstreamConsumerSummaryProjection`           | projection only   |

`dataMaturityLevel`、`currentActionLevel`、`riskLevel`、`referenced*Version`、`allowedActions` 不是本片敏感金额字段，保持原样。

---

## 5. Query / Audit 边界

### Authorized

当用户权限包含 `operating:finance:sensitive:read`：

1. projection `mode = 'full'`。
2. projection `value = 原始字符串`。
3. 响应不包含 legacy scalar 原始字段。
4. 不记录 security event。

### Unauthorized

当用户权限不包含 `operating:finance:sensitive:read`：

1. projection `mode = 'masked'`。
2. projection `value = null`。
3. projection `displayText = 敏感字段已隐藏` 或后端统一遮罩文案。
4. 响应不包含 legacy scalar 原始字段。
5. 记录 `sensitive_field.masked` security event。

`targetType` / `targetId` 统一为：

| View Family                | targetType | targetId    |
| -------------------------- | ---------- | ----------- |
| L4 project operating views | `Project`  | `projectId` |

---

## 6. Public Interface 与 Route 判断

| 项目                 | G1 判断                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Public route surface | 不新增、不删除、不改 path / method。                                                        |
| Route inventory      | 四个 L4 route 已在 `api-route-canonical-inventory.md` aligned；不更新 canonical inventory。 |
| Shared contract      | 会修改既有 response DTO schema，新增 projection 字段并移除对应 legacy scalar。              |
| Generated client     | 必须运行 `poms-api:openapi` 与 `shared-api-client:check`，并提交 generated client diff。    |
| Frontend build       | 本片同步 L4 前端消费切换，避免 generated type drift 被兼容层掩盖。                          |
| Runtime persistence  | 不改 DDL / entity / repository。                                                            |

---

## 7. 预期文件范围

Expected runtime / contract files:

1. `libs/shared/contracts/src/lib/shared-contracts.ts`
2. `apps/poms-api/src/app/features/project-cost/project-cost.controller.ts`
3. `apps/poms-api/src/app/features/project-cost/project-cost.service.ts`
4. `apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts`

Expected generated / check outputs:

1. `libs/shared/api-spec/openapi.json`
2. `libs/shared/api-client/**`

Expected docs:

1. This baseline.
2. `EX-37C1` G3 checkpoint.
3. `phase2-development-execution-tracker.md`
4. `poms-design-progress.md`

Expected frontend consumers:

1. `apps/poms-admin/src/app/features/project/project-operating-overview.ts`
2. `apps/poms-admin/src/app/features/project/project-variance-risk.ts`
3. `apps/poms-admin/src/app/features/commission/project-commission-gate-overview.ts`
4. `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`

---

## 8. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx build shared-contracts`
4. `corepack pnpm nx lint poms-api`
5. `corepack pnpm nx build poms-api`
6. Focused backend tests for authorized / unauthorized projection:
   - `getProjectBusinessOutcomeOverview`
   - `getProjectUnifiedAccounting`
   - `getProjectVarianceRiskExplanation`
   - `getBusinessAccountingFeedback`
7. `corepack pnpm nx run poms-api:openapi`
8. `corepack pnpm nx run shared-api-client:check`
9. `corepack pnpm nx lint poms-admin`
10. `corepack pnpm nx build poms-admin`
11. Focused frontend store test for L4 generated DTO fixtures:
    - `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`

Not required:

1. `migration-check`，因为不改 DDL。
2. Playwright E2E，当前改动不新增导航或权限入口；跨 L4 / L5 浏览器矩阵仍由 `FE-44` 收口。

---

## 9. 例外与风险

| ID                                     | Level  | Scope                | Owner | Cleanup Due | Decision                                                                 |
| -------------------------------------- | ------ | -------------------- | ----- | ----------- | ------------------------------------------------------------------------ |
| `EX37C1-R3-SUMMARY-STRING-GRANULARITY` | Medium | Field classification | Codex | 后续治理    | 部分 L4 字段是摘要字符串而非纯金额；本片按字段包整体遮罩，不做摘要裁剪。 |

---

## 10. G1 结论

`EX-37C1` 可以进入 implementation。

冻结条件：

1. 后端响应不得再向无 `operating:finance:sensitive:read` 的用户返回本片列出的 L4 经营金额 / 税务 / 毛利 / 下游影响字符串。
2. 正式消费入口是新增 projection 字段；本片不保留 legacy scalar 兼容层。
3. 不改 public route path / method，不改 DDL，不改命令语义。
4. `EX-37C2` 不混入本片；`FE-44` 保留 L5 consumption 与浏览器矩阵收口。
