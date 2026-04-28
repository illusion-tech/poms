# EX-39 剩余敏感字段分级与摘要粒度治理 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: sensitive projection downstream governance
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Gate: `G3`
- Checkpoint Date: 2026-04-28
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-39`
- Baseline: `docs/design/archive/slices/ex-39-sensitive-field-granularity-baseline.md`

---

## 1. 范围结论

本次实现按 `EX-39` G1 基线完成：

1. `ContractTermSnapshotSummary` 已删除剩余合同条款 scalar response 字段：
   - `taxRate`
   - `downPaymentRate`
   - `retentionRate`
   - `paymentTerms`
2. 合同条款读取响应新增并只暴露 `contract-finance` projection 字段：
   - `taxRateProjection`
   - `downPaymentRateProjection`
   - `retentionRateProjection`
   - `paymentTermsProjection`
3. 合同详情前端已改为只消费 generated projection 字段；比例字段通过 projection value 格式化，masked / denied / null 由 projection display text 决定。
4. `ProjectBusinessOutcomeOverviewView` 已删除混合字符串 `grossMarginSummaryProjection`。
5. L4 经营总览新增并消费结构化 projection：
   - `grossMarginAmountProjection`
   - `grossMarginRateProjection`
6. `taxImpactSummaryProjection`、`varianceSourceSummaryProjection`、`nextActionSummaryProjection`、`downstreamConsumerSummaryProjection` 继续保持 `operating-finance` projection，不回退 scalar。
7. OpenAPI、shared generated client、后端 tests、前端 component / store tests、targeted browser matrix 与治理文档已同步。

本次明确不做：

1. 不新增 public route、不改 route path / method。
2. 不新增权限 key。
3. 不改 DDL、entity、repository 或 migration。
4. 不处理 `EX-38` 审计事件批量降噪。
5. 不保留旧 scalar 兼容字段，不做前端临时遮罩。

---

## 2. 一致性检查

| Concern                             | G3 判断 | 证据                                                                                                            |
| ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| Document -> code                    | Pass    | 实现范围与 `EX-39` G1 baseline 字段清单一致。                                                                   |
| ADR-015 / route inventory           | Pass    | 本片未新增、删除或改名 public route surface。                                                                   |
| DTO / contract -> controller output | Pass    | shared contract、OpenAPI、generated client 均移除旧 scalar / 旧 mixed gross margin projection 字段。            |
| Query / view                        | Pass    | 合同 snapshot mapper 和 L4 business outcome mapper 统一生成 projection 字段。                                   |
| Guard / permission                  | Pass    | 完整值读取继续由字段包敏感读权限控制：`contract:finance:sensitive:read` 与 `operating:finance:sensitive:read`。 |
| Migration / entity                  | N/A     | 本片不改 DDL / entity / repository。                                                                            |
| Frontend consumer                   | Pass    | 合同详情、L4 经营总览、store fixtures 与浏览器矩阵均已同步 generated 字段。                                     |

---

## 3. 测试与校验

| Check                      | Required | Command / Evidence                                                                                                                                                                  | Result | Notes                                          |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| Shared contracts build     | Yes      | `corepack pnpm nx build shared-contracts`                                                                                                                                           | Pass   | DTO schema 类型通过。                          |
| Backend contract tests     | Yes      | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`                                                         | Pass   | Jest 实际运行 `40` suites / `505` tests。      |
| Backend project-cost tests | Yes      | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts --runInBand`                                                    | Pass   | Jest 实际运行 `40` suites / `505` tests。      |
| Backend lint               | Yes      | `corepack pnpm nx lint poms-api`                                                                                                                                                    | Pass   | 无新增 lint warning。                          |
| Backend build              | Yes      | `corepack pnpm nx build poms-api`                                                                                                                                                   | Pass   | API 编译通过。                                 |
| OpenAPI generation         | Yes      | `corepack pnpm nx run poms-api:openapi`                                                                                                                                             | Pass   | 生成 `libs/shared/api-spec/openapi.json`。     |
| Generated client           | Yes      | `corepack pnpm nx run shared-api-client:generate`                                                                                                                                   | Pass   | 更新 shared API client model。                 |
| Generated client check     | Yes      | `corepack pnpm nx run shared-api-client:check`                                                                                                                                      | Pass   | 与 OpenAPI 完全同步。                          |
| Frontend contract test     | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts --runInBand`                                                         | Pass   | 1 suite / 4 tests。                            |
| Frontend store test        | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`                                                  | Pass   | 1 suite / 26 tests。                           |
| Frontend lint              | Yes      | `corepack pnpm nx lint poms-admin`                                                                                                                                                  | Pass   | 无新增 lint warning。                          |
| Frontend build             | Yes      | `corepack pnpm nx build poms-admin`                                                                                                                                                 | Pass   | Production build 通过，无新增 bundle warning。 |
| Targeted browser matrix    | Yes      | `POMS_E2E_PORT_SEED=539 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts` | Pass   | 7 tests passed。                               |
| Markdown format            | Yes      | `corepack pnpm run format:md:check`                                                                                                                                                 | Pass   | Markdown table format 通过。                   |
| Diff whitespace            | Yes      | `git diff --check`                                                                                                                                                                  | Pass   | 无 whitespace error。                          |
| Migration check            | No       | N/A                                                                                                                                                                                 | N/A    | 不改 DDL。                                     |

---

## 4. Drift 判断

| Drift                                                                                                             | Classification          | Decision                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| OpenAPI generator 输出 `CreateCommissionRuleVersionRequest.propertyNames` / `AuditSnapshot.propertyNames` warning | existing-baseline-drift | 非本片新增；`shared-api-client:check` 最终通过，不阻断。 |
| `ContractTermSnapshotSummary` 剩余条款字段从 scalar direct cutover 到 projection-only                             | design-change-required  | 当前仍处开发期、未上线；不保留兼容字段。                 |
| L4 `grossMarginSummaryProjection` 拆为 amount / rate projection                                                   | design-change-required  | 关闭混合摘要粒度问题，避免前端解析拼接字符串。           |
| Playwright WebServer 输出 NX daemon / inspector port 信息                                                         | tool-noise              | 本地执行环境噪声；7 条 targeted browser tests 已通过。   |

---

## 5. 例外与风险

| Exception ID | Status             | Scope                  | Owner | Cleanup Due | Notes                                            |
| ------------ | ------------------ | ---------------------- | ----- | ----------- | ------------------------------------------------ |
| `FE43-R2`    | Closed at local G3 | Contract term fields   | Codex | N/A         | 合同条款剩余经营字段已切为后端 projection-only。 |
| `EX37C1-R3`  | Closed at local G3 | L4 summary granularity | Codex | N/A         | L4 毛利摘要已拆成金额 / 比例 projection。        |

---

## 6. G3 结论

`EX-39` 本地实现可进入提交前收口。

在当前变更提交前，tracker 保持 `Doing / G3`；提交落地后再执行 `G4` close-out，并判断是否进入 `EX-38` 审计事件批量降噪。
