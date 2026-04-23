# EX-14D Retention Due Fact Source 实施基线包

- Gate Status: `Pass`
- Parent: `EX-14`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-19`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14D`

---

## 1. 范围

- 本次目标:
  1. 关闭 `EX-14C-E1`，为“质保期届满 / retention due”建立正式 fact source，而不是继续停留在文案约束或 accepted exception。
  2. 在不新增 public route surface 的前提下，为现有合同链补齐 `retentionDueDate` 输入与冻结来源。
  3. 让 retention settlement / rule explanation 写侧与 query 读侧正式消费当前冻结版本引用的合同条款快照事实。
- 本次明确不做:
  1. 不新增任何 public route；继续沿用既有 `Contract` 与 commission payout canonical route。
  2. 不在本片实现独立的合同条款 amendment / rebaseline command。
  3. 不在本片引入定时任务、GET side effect 或自动刷新 current snapshot 的后台补偿机制。
- 下游可依赖的交付边界:
  1. `Contract` 现有 create / update / activate 链可形成 retention due 的正式输入与冻结快照。
  2. retention payout submit / approve / register 与 current rule explanation 不再忽略“质保期届满”条件。
  3. `CommissionFinalSettlementView` 可返回当前 retention due date / status，供前端与人工审计直接读取。
- 不允许下游依赖的留白:
  1. 不接受继续以备注文本、页面勾选或硬编码日期推断 retention due。
  2. 不接受绕开 `freezeVersion.effectiveHandoverBaselineSnapshotId`，从任意合同或页面临时状态拼装 retention due 事实。
  3. 不接受把 date 语义偷偷实现成 datetime 比较而不声明边界。

---

## 2. 正式输入

| Input Type                | Document / Source                                                                              | Section / Anchor                    | Status | Notes                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Business design           | `docs/design/phase2-commission-retention-final-settlement.md`                                  | `5.2`, `6.1`, `6.2`, `7`            | Review | retention gate 必须显式表达“待质保期届满”且逐项展示条件                                       |
| Rule explanation design   | `docs/design/phase2-commission-rule-explanation-language.md`                                   | `6`, `11.3`                         | Review | “当前质保期尚未届满”是正式解释文案，不得脱离事实源独立存在                                    |
| Command design            | `docs/design/interface-command-design.md`                                                      | `4.6A`, `220` ~ `230`               | Active | `stage=retention` submit / register 必须直接校验质保期、到账、争议与离职 / 特例结论           |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                                    | `150`, `151`, `155`, `156`          | Active | final settlement / rule explanation query 只能消费正式 evidence chain                         |
| Data model / table freeze | `docs/design/data-model-prerequisites.md`                                                      | `315`, `316`, `325`, `327`, `359`   | Active | `ContractTermSnapshot` 与 commission final / rule explanation 现有链路是本片正式承接点        |
| Schema / DDL              | `docs/design/schema-ddl-design.md`                                                             | `163`, `294`, `799`, `800`, `802`   | Active | `contract_term_snapshot` 是正式合同条款快照；retention guard 仍需消费 current freeze evidence |
| Previous slice baseline   | `docs/design/ex-08-contract-handover-gate-baseline.md`                                         | `98`, `134`, `145`, `194`, `221`    | Active | `contract_term_snapshot` 已是正式快照来源，适合作为 retention due frozen source               |
| Previous slice baseline   | `docs/design/ex-14b3c-retention-rule-explanation-write-baseline.md`                            | `1`, `2`, `3`, `6`, `9`, `10`       | Active | 本片专门关闭其中保留的 `EX-14B3C-E1 / EX-14C-E1`                                              |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md` + `docs/adr/015-api-route-canonical-grammar.md` | contract / commission existing rows | Active | 本片不新增 route，仅在既有 aligned surface 上扩充字段语义                                     |

---

## 3. 本次 SSOT

| Concern                     | SSOT                                                                                                  | Implementation Rule                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Business semantics          | `phase2-commission-retention-final-settlement` + `phase2-commission-rule-explanation-language`        | retention due 是 retention gate 正式前提，不再允许作为 accepted exception 长期悬空        |
| Public route canonical path | 既有 contract route + payout route inventory 行                                                       | 只扩字段，不扩 route surface                                                              |
| Route / command naming      | existing `create/update/activate Contract` + existing commission payout lifecycle                     | 不发明新的 command 名称                                                                   |
| DTO / contract naming       | `retentionDueDate`                                                                                    | 使用 ISO `date`，不使用 datetime                                                          |
| Table / column naming       | `contract.retention_due_date`、`contract_term_snapshot.retention_due_date`                            | draft 输入落 `contract`，冻结来源落 `contract_term_snapshot`                              |
| Identifier semantics        | current `Contract.currentSnapshotId` + `CommissionRoleAssignment.effectiveHandoverBaselineSnapshotId` | retention write/query 统一沿 freeze baseline 指到当前有效合同条款快照                     |
| Date / time semantics       | `retentionDueDate` = contractually due business date                                                  | 以 `YYYY-MM-DD` 存储 / 传输 / 比较；比较逻辑按现有服务 date-only 约定执行                 |
| Money / decimal semantics   | `N/A`                                                                                                 | 本片不改金额口径                                                                          |
| Status machine              | existing `CommissionFinalSettlementSnapshot` / `CommissionRuleExplanationSnapshot`                    | 在既有 blocked / ready / settled 状态机内补足 due condition，不新增 payout lifecycle 状态 |

---

## 4. 命令与接口边界

| Route / Controller                                        | Command / Service                                               | Request DTO / Contract                            | Response DTO / Contract   | Guard / Permission          | Design Source                                              | Result                                                                             |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- | ------------------------- | --------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `POST /contracts`                                         | `create Contract`                                               | `CreateContractRequest.retentionDueDate`          | `ContractSummary`         | existing `project:write`    | contract existing baseline + current slice                 | draft contract 可登记 retention due date                                           |
| `PATCH /contracts/{id}`                                   | `update Contract basic info`                                    | `UpdateContractBasicInfoRequest.retentionDueDate` | `ContractSummary`         | existing `project:write`    | contract existing baseline + current slice                 | draft contract 可更新 retention due date                                           |
| `POST /contracts/{id}:activate`                           | `activate Contract`                                             | existing request body                             | `CommandResult`           | existing `project:write`    | `EX-08B3C` + current slice                                 | activation 时把 current draft retention due date 冻结进 `contract_term_snapshot`   |
| existing retention payout lifecycle routes                | `submit/approve/register CommissionPayout`                      | existing request DTOs                             | existing payout summaries | `commission:payouts:manage` | `interface-command-design.md` + `EX-14B3C` + current slice | retention write-side 正式消费 freeze baseline snapshot 的 retention due fact       |
| existing final settlement / rule explanation query routes | `getCommissionFinalSettlement` / `getCommissionRuleExplanation` | existing query contracts (扩字段)                 | existing view contracts   | `commission:payouts:manage` | `EX-14B1` + current slice                                  | query 可返回 retention due date / status，并把 rule explanation 与 due reason 对齐 |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s):
  1. `POST /contracts`
  2. `PATCH /contracts/{id}`
  3. `POST /contracts/{id}:activate`
  4. `GET /projects/{projectId}/commission-final-settlement`
  5. `GET /projects/{projectId}/commission-rule-explanation`
  6. existing payout lifecycle routes
- Current implemented route(s): same as canonical
- Inventory status: `aligned`
- Route governance source: `docs/adr/015-api-route-canonical-grammar.md`
- Blocker / exception:
  1. 本片不新增 public route；若后续需要 active contract amendment command，必须另起治理子片。

---

## 5. 读侧边界

| Query / View                    | Consumer           | Fields                                                                         | Filter / Sort        | Permission Boundary         | Design Source                             | Result                                                                                            |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------ | -------------------- | --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ContractSummary`               | contract consumer  | `retentionDueDate`                                                             | existing             | existing                    | contract existing surface + current slice | 当前合同可直接暴露 retention due 输入值                                                           |
| `CommissionFinalSettlementView` | `EX-14B1` consumer | existing fields + `retentionDueDate`、`retentionDueStatus`                     | project current only | `commission:payouts:manage` | retention final settlement design         | 可直接显示当前 due fact，不必再从其它页面或备注拼装                                               |
| `CommissionRuleExplanationView` | `EX-14B1` consumer | existing reason fields；当 due 未满足时返回正式 blocking reason code / summary | project current only | `commission:payouts:manage` | rule explanation language + current slice | rule explanation 对“质保期尚未届满 / 缺少届满日期”有正式 reason code，不再依赖 accepted exception |

---

## 6. 持久化边界

| Table                                  | Migration                                                    | Entity / Repository                                       | DDL / Freeze Source                      | Check Result                                                                            |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `contract`                             | `Migration20260419120000_ex14d_retention_due_fact_source.ts` | `Contract` / `ContractService`                            | existing contract ledger + current slice | 新增 draft-visible `retention_due_date`，作为 activation 前正式输入                     |
| `contract_term_snapshot`               | same                                                         | `ContractTermSnapshot` / `ContractTermSnapshotRepository` | `EX-08B3C` + current slice               | 新增 frozen `retention_due_date`，作为 downstream commission retention fact source      |
| `commission_final_settlement_snapshot` | `N/A`                                                        | existing                                                  | `EX-14A`                                 | 不增列；继续通过 `freezeVersionId -> effectiveHandoverBaselineSnapshotId` 回放 due fact |
| `commission_rule_explanation_snapshot` | `N/A`                                                        | existing                                                  | `EX-14A`                                 | 不增列；只补正式 reason code / summary                                                  |

| Field / Concern                                      | Design Type / Meaning                   | Migration / DDL | Entity / Contract               | Result                                                    |
| ---------------------------------------------------- | --------------------------------------- | --------------- | ------------------------------- | --------------------------------------------------------- |
| `contract.retention_due_date`                        | draft / current contract due date input | New             | `Contract` + contract DTO       | 仅承载正式输入，不直接替代 freeze baseline                |
| `contract_term_snapshot.retention_due_date`          | frozen retention due fact               | New             | `ContractTermSnapshot`          | retention guard / query 通过 current freeze baseline 消费 |
| `freezeVersion.effectiveHandoverBaselineSnapshotId`  | current commission baseline anchor      | Existing        | `CommissionRoleAssignment`      | retention due 事实定位统一走这条链                        |
| `retentionDueStatus`                                 | derived `missing / pending / due`       | `N/A`           | query / write-side draft helper | 只由服务端根据 frozen date 计算，不允许前端自算覆盖       |
| `RETENTION_DUE_FACT_MISSING / RETENTION_DUE_PENDING` | rule explanation reason code            | `N/A`           | write-side / query contract     | rule explanation 可正式表达 due 缺口与未届满状态          |

---

## 7. 一致性结论

- Document -> code: retention due 必须从 contract frozen source 进入 payout guard / final settlement query / rule explanation 三条链。
- ADR-015 inventory -> route: route surface 不变，仅扩字段与守卫语义。
- Migration -> entity: `contract` 与 `contract_term_snapshot` 的 date 列、entity 与 service 映射必须同轮对齐。
- Entity -> contract: `retentionDueDate` 作为 ISO date 进入 `ContractSummary` / create / update；`retentionDueStatus` 进入 final-settlement query。
- Route -> command: retention submit / approve / register 不得再忽略 due fact。
- Query -> view: final settlement query 可直接返回 due fact；rule explanation 通过正式 reason code 与 summary 消费它。
- Guard / permission: permission 不变，仅在现有 payout / contract permission 下收紧语义。
- OpenAPI / generated client: contract DTO 与 final-settlement view 一旦扩字段，必须同轮回写 OpenAPI / client。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                           | Result | Gap / Reason                                                                                               |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                                                                             | Pass   | `All files pass linting`                                                                                   |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                                            | Pass   | `webpack compiled successfully`                                                                            |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                                 | Pass   | `33 suites / 387 tests`；已覆盖 contract activate copy、retention due guard、query mapping                 |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPatterns=commission-workflow.e2e-spec.ts`                                       | Pass   | `1 suite / 19 tests`；managed harness 先执行 migration-up + seeder-run                                     |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:generate` + `corepack pnpm nx run shared-api-client:check` | Pass   | generated client 与 OpenAPI 已同步                                                                         |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check`                                                                                              | Pass   | `No changes required, schema is up-to-date`                                                                |
| Seeder validation                | Yes      | `corepack pnpm nx run poms-api:seeder-run`                                                                                                   | Pass   | `DatabaseSeeder` 已写入 retention due fixture，并成功 seeded `2 projects / 2 contracts / 2 platform users` |
| Diff / whitespace check          | Yes      | `git diff --check`                                                                                                                           | Pass   | 已清理 generated client EOF 空行；仅剩 Git CRLF warning，不构成 whitespace error                           |

---

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | -------------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 本片目标就是关闭 `EX-14C-E1`，不再延续该例外 |

风险提示:

1. 若 contract draft 与 frozen snapshot 的 `retentionDueDate` 拷贝链未对齐，会形成“页面看得到、retention guard 却读不到”的新 drift。
2. 若 retention query 仍不返回 due fact，前端和审计会继续把“待质保期届满”当黑盒结论。
3. 若 approve / register 只看 current final snapshot，而不回查 current freeze baseline，则 due date 变化会再次被写侧遗漏。

---

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-19`
- Conditions:
  1. 不新增 route surface；只在既有 contract / commission routes 上扩字段与 guard。
  2. migration、entity、shared contract、OpenAPI、generated client 与 e2e 必须同轮闭环。
  3. retention due 的正式消费必须统一锚到 current freeze baseline snapshot，不得绕开既有 evidence chain。
