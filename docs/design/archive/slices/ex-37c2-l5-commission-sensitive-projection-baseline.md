# EX-37C2 L5 提成敏感金额后端投影切换 G1 Baseline

- Task ID: `EX-37C2`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37C2`
- Parent: `EX-37C`
- Upstream: `EX-37A`、`EX-37B1`、`EX-37C1`、`FE-43`

---

## 1. 背景

`EX-37A` 已提供 sensitive projection primitive、字段包权限映射与安全事件 helper。`EX-37B1` 已把第一批 `contract-finance` response 清退为 projection-only，`EX-37C1` 已把 `L4` 经营读取视图切到 `operating-finance` projection-only。

`EX-37C2` 承接 `L5` 提成工作区的剩余敏感读取响应。当前系统仍处开发期、未上线，本片不保留 legacy scalar 兼容层；凡进入本片字段清单的 response 字段，都直接删除 scalar 并以 `SensitiveStringFieldProjection` 作为唯一事实源。

事实审查发现 `L5` 提成页面不只暴露 `commission-compensation` 字段，也在 `CommissionCalculationSummary` 和结算解释视图中暴露经营收入、成本、毛利和税务影响字符串。因此本片按业务语义同时使用两个既有字段包：

1. `commission-compensation`：提成池、发放上限、批准金额、实发金额、调整金额和调整影响说明。
2. `operating-finance`：提成计算中引用的经营收入 / 成本 / 毛利 / 毛利率，以及结算解释中的税务影响摘要。

---

## 2. G1 范围

### In Scope

1. `GET /projects/:projectId/commission-calculations`
2. `POST /projects/:projectId/commission-calculations`
3. `POST /commission-calculations/:id:approve`
4. `POST /commission-calculations/:id:recalculate`
5. `GET /projects/:projectId/commission-payouts`
6. `POST /projects/:projectId/commission-payouts`
7. `POST /commission-payouts/:id:submitApproval`
8. `POST /commission-payouts/:id:approve`
9. `POST /commission-payouts/:id:registerPayout`
10. `GET /projects/:projectId/commission-adjustments`
11. `POST /projects/:projectId/commission-adjustments`
12. `POST /commission-adjustments/:id:submitApproval`
13. `POST /commission-adjustments/:id:execute`
14. `GET /projects/:projectId/commission-final-settlement`
15. `GET /projects/:projectId/commission-rule-explanation`
16. 为上述 route 的 response summary / view 字段新增 projection 字段，并移除对应 legacy scalar。
17. Controller read / write-return endpoints 传递 `UserPayload` 与 request context，service mapper 在 response 阶段生成后端 projection。
18. 同步 L5 前端 operations / final settlement / rule explanation 页面直接消费 generated projection 字段。
19. 更新 shared contracts、OpenAPI、generated client、focused backend tests 和 focused frontend tests。

### Out Of Scope

1. 不改 create / approve / register command DTO 的金额输入字段；命令输入仍是业务写入原始值，不属于读取投影。
2. 不改 DDL、entity、repository 或 migration；数据库继续保存原始业务金额 / 文案。
3. 不新增字段包 key 或权限 key，只复用 `commission-compensation` 与 `operating-finance`。
4. 不改 public route path / method。
5. 不处理导出、短时揭示、审批详情脱敏或安全事件批量降噪。
6. 不扩大到 `period-closing`、`operating-signal`、`project-actual-cost-record` 等非 L5 提成读取响应。
7. 不把 `retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary` 等非金额叙述纳入本片；如后续数据权限设计把它们归类为敏感个人 / 结算叙述，另开切片。

---

## 3. 正式输入

| 输入                        | 文件 / 证据                                                                        | EX-37C2 使用方式                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sensitive primitive         | `ex-37a-sensitive-projection-primitive-g4-closeout.md`                             | 复用 `SensitiveFieldProjectionService`、projection schema、request context helper。 |
| Field package governance    | `ex-37-sensitive-field-projection-audit-governance-baseline.md`                    | `commission-compensation` 覆盖提成池 / 发放金额 / 调整金额与影响说明。              |
| L4 projection precedent     | `ex-37c1-l4-operating-finance-sensitive-projection-baseline.md`                    | 复用 `operating-finance` 对收入、成本、毛利、税务影响的分类口径。                   |
| Shared contracts            | `libs/shared/contracts/src/lib/shared-contracts.ts`                                | 修改 `Commission*Summary` 与 L5 view response schema。                              |
| Commission controller       | `apps/poms-api/src/app/features/commission/commission.controller.ts`               | 为受影响 endpoints 接入 request user / request context。                            |
| Commission service          | `apps/poms-api/src/app/features/commission/commission.service.ts`                  | 在 mapper 阶段生成 projection，列表 response 使用 `Promise.all`。                   |
| Frontend operations page    | `apps/poms-admin/src/app/features/commission/project-commission.ts`                | 提成计算、发放和调整表格直接消费 projection。                                       |
| Frontend settlement / rules | `project-commission-final-settlement.ts`、`project-commission-rule-explanation.ts` | 结算 / 规则解释页直接消费 projection。                                              |

---

## 4. Contract 冻结

新增 projection 字段统一使用：

```ts
SensitiveStringFieldProjectionSchema
```

字段替换规则：

| DTO / View                      | Removed Scalar                  | Projection Field                          | Field Package             | Raw Value Surface |
| ------------------------------- | ------------------------------- | ----------------------------------------- | ------------------------- | ----------------- |
| `CommissionCalculationSummary`  | `recognizedRevenueTaxExclusive` | `recognizedRevenueTaxExclusiveProjection` | `operating-finance`       | projection only   |
| `CommissionCalculationSummary`  | `recognizedCostTaxExclusive`    | `recognizedCostTaxExclusiveProjection`    | `operating-finance`       | projection only   |
| `CommissionCalculationSummary`  | `contributionMargin`            | `contributionMarginProjection`            | `operating-finance`       | projection only   |
| `CommissionCalculationSummary`  | `contributionMarginRate`        | `contributionMarginRateProjection`        | `operating-finance`       | projection only   |
| `CommissionCalculationSummary`  | `commissionPool`                | `commissionPoolProjection`                | `commission-compensation` | projection only   |
| `CommissionPayoutSummary`       | `theoreticalCapAmount`          | `theoreticalCapAmountProjection`          | `commission-compensation` | projection only   |
| `CommissionPayoutSummary`       | `approvedAmount`                | `approvedAmountProjection`                | `commission-compensation` | projection only   |
| `CommissionPayoutSummary`       | `paidRecordAmount`              | `paidRecordAmountProjection`              | `commission-compensation` | projection only   |
| `CommissionAdjustmentSummary`   | `amount`                        | `amountProjection`                        | `commission-compensation` | projection only   |
| `CommissionAdjustmentSummary`   | `reason`                        | `reasonProjection`                        | `commission-compensation` | projection only   |
| `CommissionFinalSettlementView` | `taxImpactSummary`              | `taxImpactSummaryProjection`              | `operating-finance`       | projection only   |
| `CommissionFinalSettlementView` | `taxImpactPendingAmount`        | `taxImpactPendingAmountProjection`        | `operating-finance`       | projection only   |
| `CommissionRuleExplanationView` | `nextActionSummary`             | `nextActionSummaryProjection`             | `commission-compensation` | projection only   |
| `CommissionRuleExplanationView` | `taxImpactSummary`              | `taxImpactSummaryProjection`              | `operating-finance`       | projection only   |
| `CommissionRuleExplanationView` | `taxImpactPendingAmount`        | `taxImpactPendingAmountProjection`        | `operating-finance`       | projection only   |

以下字段不是本片金额 / 敏感叙述字段，保持 scalar：

1. `status`、`stageType`、`payoutKind`、`selectedTier`、`version`、`rowVersion`、`isCurrent`。
2. `approvedAt`、`handledAt`、`createdAt`、`updatedAt`、`retentionDueDate`。
3. `currentStageStatus`、`gateDecisionCode`、`blockingReasonCategory`、`blockingReasonCode`、`gateDecisionSummary`、`allowedActions`。
4. `freezeVersionSummary`、`baselineSelectionSource`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`。

---

## 5. Query / Audit 边界

### Authorized

当用户具备字段包对应敏感读权限：

1. `commission-compensation` 使用 `commission:amount:sensitive:read`。
2. `operating-finance` 使用 `operating:finance:sensitive:read`。
3. projection `mode = 'full'`。
4. projection `value = 原始字符串或 nullable 原始字符串`。
5. response 不包含本片移除的 legacy scalar。
6. 不记录 masked security event。

### Unauthorized

当用户缺少字段包对应敏感读权限：

1. projection `mode = 'masked'`。
2. projection `value = null`。
3. projection `displayText = 敏感字段已隐藏` 或后端统一遮罩文案。
4. response 不包含本片移除的 legacy scalar。
5. 记录 `sensitive_field.masked` security event。

`targetType` / `targetId` 统一为：

| View Family                       | targetType   | targetId    |
| --------------------------------- | ------------ | ----------- |
| L5 commission project-level views | `Project`    | `projectId` |
| Calculation / payout / adjustment | 业务实体类型 | 业务实体 id |

---

## 6. Public Interface 与 Route 判断

| 项目                 | G1 判断                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| Public route surface | 不新增、不删除、不改 path / method。                                                   |
| Route inventory      | 受影响 route 已存在于当前实现；本片不更新 canonical inventory。                        |
| Shared contract      | 修改既有 response DTO schema，新增 projection 字段并移除对应 legacy scalar。           |
| Generated client     | 必须运行 `poms-api:openapi` 与 `shared-api-client:check`，提交 generated client diff。 |
| Frontend build       | 本片同步 L5 前端消费切换，避免 generated DTO 删除字段后产生断裂。                      |
| Runtime persistence  | 不改 DDL / entity / repository。                                                       |

---

## 7. 预期文件范围

Expected runtime / contract files:

1. `libs/shared/contracts/src/lib/shared-contracts.ts`
2. `apps/poms-api/src/app/features/commission/commission.controller.ts`
3. `apps/poms-api/src/app/features/commission/commission.service.ts`
4. `apps/poms-api/src/app/features/commission/commission.service.spec.ts`
5. `apps/poms-api/src/app/features/commission/commission.controller.spec.ts`

Expected generated files:

1. `libs/shared/api-spec/openapi.json`
2. `libs/shared/api-client/model/*`

Expected frontend consumers:

1. `apps/poms-admin/src/app/features/commission/project-commission.ts`
2. `apps/poms-admin/src/app/features/commission/project-commission-final-settlement.ts`
3. `apps/poms-admin/src/app/features/commission/project-commission-rule-explanation.ts`
4. Focused specs / fixtures touching the above generated DTO fields.

Expected docs:

1. This baseline.
2. `EX-37C2` G3 checkpoint.
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
6. Focused backend tests for authorized / unauthorized projection:
   - commission calculation list / create / approve / recalculate
   - commission payout list / create / submit / approve / register
   - commission adjustment list / create / submit / execute
   - commission final settlement
   - commission rule explanation
7. `corepack pnpm nx run poms-api:openapi`
8. `corepack pnpm nx run shared-api-client:check`
9. `corepack pnpm nx lint poms-admin`
10. `corepack pnpm nx build poms-admin`
11. Focused frontend specs for L5 projection DTO fixtures and display helpers.

Not required:

1. `migration-check`，因为不改 DDL。
2. Browser E2E，本片不新增导航入口；浏览器权限矩阵和跨 L4 / L5 页面验证仍由 `FE-44` 收口。

---

## 9. 例外与风险

| ID                                     | Level  | Scope                    | Owner | Cleanup Due | Decision                                                                                       |
| -------------------------------------- | ------ | ------------------------ | ----- | ----------- | ---------------------------------------------------------------------------------------------- |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE` | Medium | Sensitive classification | Codex | 后续治理    | 本片不处理非金额结算叙述字段；如数据权限设计将其归入敏感字段包，另开切片而不是在本片临时扩张。 |
| `EX37C2-R2-EVENT-VOLUME`               | Medium | Security event volume    | Codex | 后续治理    | 列表 projection 可能产生多条 masked event；本片保持逐字段审计，批量降噪由后续审计优化承接。    |

---

## 10. G1 结论

`EX-37C2` 可以进入 implementation。

冻结条件：

1. 本片列出的 L5 response 字段正式进入 projection-only。
2. 不保留 legacy scalar 兼容层，不新增替代 scalar 字段。
3. 不改 route path / method，不改 DDL，不改命令输入语义。
4. 同片同步 L5 前端消费，避免 generated client 断裂留到后续片。
5. `FE-44` 缩小为 residual sensitive field review 与 browser permission matrix，不再承担本片列出的 projection consumption。
