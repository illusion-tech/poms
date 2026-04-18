# EX-13B1 Commission Gate Review Summary Anchor 实施基线包

- Gate Status: `Pass`
- Parent: `EX-13`
- Owner: `Codex`
- Slice Type: `persistence`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-13B1`
- Execution Status: `Done 2026-04-18`
- Execution Note: `EX-13B` 恢复实现时发现 `reviewCommissionGateBinding` 所需场景摘要快照字段未落到 EX-13A 正式表链；本切片先补齐 persistence SSOT，再恢复 command/query。`

---

## 1. 范围

- 本次目标:
  1. 为 `CommissionGateReviewRecord` 正式补齐 `summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` 四个场景摘要快照锚点字段。
  2. 让 `summarySnapshotId` 强关联 `ApprovalSummarySnapshot.id`，关闭“请求回声 / 页面临时裁剪字段包”这类非正式来源。
  3. 回写第二阶段对象链、table freeze、DDL 补点与 EX-13 执行板，确保 `EX-13B` 后续直接消费同一份 persistence SSOT。
- 本次明确不做:
  1. 不在本切片实现 `reviewCommissionGateBinding` controller / service / DTO / OpenAPI。
  2. 不把摘要快照字段错误地下沉到页面本地状态、generated client 或 `commission` 域发放链。
  3. 不重命名已冻结 canonical route，也不新增过渡 route。

---

## 2. 正式输入

| Input Type                 | Document / Source                                                                                     | Section / Anchor | Status   | Notes                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Command design             | `interface-command-design.md`                                                                         | `4.5A`, `4.6A`   | Accepted | `reviewCommissionGateBinding -> CommissionGateReviewRecord`；必须锁定场景摘要快照                                        |
| DTO / OpenAPI design       | `interface-openapi-dto-design.md`                                                                     | `5.4B`, `5.5AA`  | Accepted | `reviewCommissionGateBinding` 请求 / 响应明确要求 `summarySnapshotId` 等稳定引用                                         |
| Query boundary             | `query-view-boundary-design.md`                                                                       | `5.3B`           | Accepted | `CommissionGateBindingHistoryView` 必须继续绑定 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` |
| Data model / prerequisites | `data-model-prerequisites.md`                                                                         | `7.7`            | Accepted | `L4 -> L5` gate 绑定链应与审批摘要公共链共同形成稳定依据                                                                 |
| Table freeze               | `table-structure-freeze-design.md`                                                                    | `8.8.4`          | Accepted | `commission_gate_review_record` 需要稳定列落点，而不是查询层拼装                                                         |
| Schema / DDL               | `schema-ddl-design.md`                                                                                | `8.8.4`, `8.9`   | Accepted | gate review 必须带正式摘要快照引用进入 `L5`                                                                              |
| Baseline / corrective      | `ex-13b-operating-signal-command-query-baseline.md`、`ex-13b-summary-anchor-corrective-checkpoint.md` | `§5`, `§4-§7`    | Accepted | 先修 persistence gap，再恢复 `EX-13B` command/query                                                                      |

---

## 3. 本次 SSOT

| Concern              | SSOT                                                                            | Implementation Rule                                                                    |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Summary anchor owner | `CommissionGateReviewRecord`                                                    | 场景摘要快照属于 gate review 行为锁定结果，不回写页面状态，也不要求 binding 行临时回声 |
| Snapshot identity    | `summarySnapshotId -> ApprovalSummarySnapshot.id`                               | 必须是正式外键；`summaryPackageKey / projectionLevel / exportPolicy` 与快照同链保存    |
| Downstream reuse     | `CommissionGateBindingHistoryView`、`L5` payout / settlement / rule explanation | 后续只能沿用同一份场景摘要快照，不得在下游重建另一套摘要口径                           |
| Scope boundary       | 仅修持久化与设计冻结                                                            | command / query / contract 留给 `EX-13B`                                               |

---

## 4. 实施边界

| Area                  | Expected Files                                                                                                                                                                     | Result  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Migration / entity    | `apps/poms-api/src/migrations/Migration20260418183000_ex13b1_gate_review_summary_anchor.ts`、`apps/poms-api/src/app/features/project-cost/commission-gate-review-record.entity.ts` | Done    |
| Design freeze         | `docs/design/data-model-prerequisites.md`、`docs/design/table-structure-freeze-design.md`、`docs/design/schema-ddl-design.md`                                                      | Done    |
| Governance write-back | `docs/design/ex-13b-summary-anchor-corrective-checkpoint.md`、`docs/design/phase2-development-execution-tracker.md`                                                                | Done    |
| API / contract        | `project-cost.controller.ts`、`project-cost.service.ts`、shared contract / OpenAPI / generated client                                                                              | Pending |

---

## 5. 风险与约束

- 不接受把 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` 仅作为 `reviewCommissionGateBinding` 请求回声返回；这不构成正式来源链。
- 不接受继续沿用 EX-13A 当前的无摘要快照 review record 进入 `L5`；否则 gate、发放、最终结算与规则解释会重新各自拼装摘要。
- 若数据库中已存在 `commission_gate_review_record` 历史数据，则迁移必须显式阻断，而不是默默为新列填默认值。

---

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `EX-13B` 恢复实现时，只能消费本切片补齐后的 `CommissionGateReviewRecord` 正式字段，不得再把该 gap 当作“查询层再补”。
  2. 后续 command 实现必须校验 `summarySnapshotId` 与其 `summaryPackageKey / projectionLevel / exportPolicy` 一致，而不是只信任 body 文本。
  3. close-out 最低要求 `poms-api` lint/build、`migration-check` 与 `git diff --check`。
