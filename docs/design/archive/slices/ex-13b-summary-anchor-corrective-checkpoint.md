# EX-13B Summary Anchor 纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-13B`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Solo worktree checkpoint`
- Checkpoint Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-13B`, `EX-13B1`

---

## 1. 触发背景与范围

- 触发原因: `EX-13B` 在恢复实现时，基于事实核对发现 `reviewCommissionGateBinding` 与 `CommissionGateBindingHistoryView` 要求的 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` 未落到 `EX-13A` 正式表链；若继续直接写 command/query，只能回退到请求回声或页面临时拼装。
- 本次目标: 记录真实 drift、明确字段归属 SSOT、拆出 `EX-13B1` 并补齐 `CommissionGateReviewRecord` 的正式摘要快照锚点。
- 本次明确不做: 不在本 checkpoint 中直接完成 `EX-13B` controller / service / contract / OpenAPI；不接受以 nullable 默认值、请求回声或页面本地状态代替正式来源。
- 本次纠偏后可恢复的可信边界: `reviewCommissionGateBinding` 及 `CommissionGateBindingHistoryView` 后续可直接在 `CommissionGateReviewRecord -> ApprovalSummarySnapshot` 链上消费稳定摘要快照引用。
- 仍不允许下游依赖的留白: `EX-13B` 的 command/query、shared contract、OpenAPI、generated client 与 HTTP E2E 仍未实现，`EX-13` 父任务不能提前关闭。

---

## 2. 正式输入

| Input Type                | Document / Source                                                                                              | Section / Anchor    | Status   | Notes                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ----------------------------------------------------------------- |
| Command design            | `interface-command-design.md`                                                                                  | `4.5A`, `4.6A`      | Accepted | `CommissionGateReviewRecord` 明确承接 gate review 与场景摘要快照  |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                                                              | `5.4B`, `5.5AA`     | Accepted | `reviewCommissionGateBinding` 请求 / 响应都要求稳定摘要快照字段   |
| Query boundary            | `query-view-boundary-design.md`                                                                                | `5.3B`              | Accepted | `CommissionGateBindingHistoryView` 必须输出同一份摘要快照引用     |
| Data model / table freeze | `data-model-prerequisites.md`、`table-structure-freeze-design.md`                                              | `7.7`, `8.8.4`      | Accepted | 原冻结文本未给 `commission_gate_review_record` 提供稳定列落点     |
| Schema / DDL              | `schema-ddl-design.md`                                                                                         | `8.8.4`, `8.9`      | Accepted | `L5` 只能消费正式依据链，不得追加另一套场景摘要                   |
| Runtime fact              | `Migration20260418170000_ex13a_operating_signal_model.ts`、`commission-gate-review-record.entity.ts`           | 2026-04-18          | Fact     | EX-13A 实际建表时未包含上述四个字段                               |
| ADR / governance          | `../adr/014-design-execution-state-model-and-governance-gates.md`、`../adr/015-api-route-canonical-grammar.md` | `gates`, `Decision` | Accepted | 本次 drift 属于已开工切片 corrective，不涉及 route grammar 重命名 |

---

## 3. Drift 清单与本次 SSOT

| Concern               | Drift / SSOT                                                                                                                                      | Corrective Rule                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Business semantics    | `reviewCommissionGateBinding` 设计上锁定的是 gate review 行为使用的场景摘要快照，但 EX-13A 只落了 review decision / blocking reason / next action | 场景摘要快照锚点归属 `CommissionGateReviewRecord`，不归属页面状态，也不要求查询层从请求体回声补齐 |
| Table / column naming | `commission_gate_review_record` 缺失 `summary_package_key / summary_snapshot_id / projection_level / export_policy`                               | 通过 `EX-13B1` 补齐四列，并让 `summary_snapshot_id` FK 到 `approval_summary_snapshot.id`          |
| Identifier semantics  | 当前 runtime 无法证明响应中的 `summarySnapshotId` 来自正式对象，只能依赖 body 传参                                                                | `summarySnapshotId` 必须是正式外键；其他三个字段与该快照同链固化                                  |
| Query boundary        | `CommissionGateBindingHistoryView` 需要继续输出同一份场景摘要快照引用，但 EX-13A 表链没有对应稳定列                                               | 后续查询实现只能从 `CommissionGateReviewRecord -> ApprovalSummarySnapshot` 读取，不允许页面推导   |
| Contract alignment    | `EX-13B` 请求 / 响应 DTO 已冻结要求这组字段                                                                                                       | 在 command/query 实现前先修 persistence gap；不允许先写 DTO/controller 再补表                     |

---

## 4. 当前阻断结论

- Current Gate: `G3 = Pass`
- Blocking Findings:
  1. 已解除。原阻断是 `EX-13A` 未为 gate review 提供正式摘要快照锚点，导致 `EX-13B` 不能按正式模型实现。
- Why parent task cannot be closed:
  1. `EX-13B` 的 command/query/contract/OpenAPI/E2E 尚未实现完成，当前 checkpoint 只关闭了 persistence drift。

---

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 新增 `EX-13B1` baseline，冻结 `CommissionGateReviewRecord` 的摘要快照锚点归属与实现边界。
  2. 在 migration、entity、对象链和 DDL / freeze 文档中正式补齐四个字段与 `ApprovalSummarySnapshot` 外键。
- 本批未修复范围:
  1. `EX-13B` command/query/service/controller/shared contract/OpenAPI/generated client。
  2. `EX-13C` 自动化测试与 close-out 文档回写。

| Concern                  | Before                                                                                                      | After                                                                                                                     | Result |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| gate review 摘要快照锚点 | `commission_gate_review_record` 无 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy` | `EX-13B1` 已为 `commission_gate_review_record` 补齐四列，并将 `summary_snapshot_id` 强关联 `approval_summary_snapshot.id` | Done   |
| 冻结文档与 DDL 对齐      | `data-model-prerequisites`、table freeze、schema DDL 均未把上述字段列为 gate review 正式列落点              | 三份文档已同步回写，明确 `CommissionGateReviewRecord` 为 gate review 场景摘要快照锚点的正式承载对象                       | Done   |
| EX-13B 执行板真实状态    | tracker 只记录 route-governance 已就绪，未记录 persistence drift                                            | tracker 已新增 `EX-13B1`，并把 `EX-13B` 依赖更新为 `EX-13B1` 后再继续 command/query                                       | Done   |

---

## 6. 测试与校验

| Check                            | Required | Command / Evidence                              | Result | Gap / Reason                                       |
| -------------------------------- | -------- | ----------------------------------------------- | ------ | -------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                | Pass   | 2026-04-18 已执行                                  |
| Build                            | Yes      | `corepack pnpm nx build poms-api`               | Pass   | 2026-04-18 已执行                                  |
| Unit tests                       | No       | N/A                                             | N/A    | 本批只改 migration / entity / 文档，无行为逻辑变更 |
| API / integration tests          | No       | N/A                                             | N/A    | 同上                                               |
| E2E                              | No       | N/A                                             | N/A    | 同上                                               |
| OpenAPI generation / client diff | No       | N/A                                             | N/A    | 本批不涉及 public contract                         |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check` | Pass   | 2026-04-18 已执行                                  |
| Diff / whitespace check          | Yes      | `git diff --check`                              | Pass   | 2026-04-18 已执行                                  |

---

## 7. 残余阻断与后续切片

- 已解除的阻断:
  1. `reviewCommissionGateBinding` 所需摘要快照字段已获得正式 persistence 锚点，不再依赖请求回声或页面拼装。
- 仍存在的阻断:
  1. `EX-13B` 尚未实现 controller / service / shared contract / OpenAPI / generated client / E2E。
- 后续子切片:
  1. `EX-13B`：继续实现 `reviewOperatingSignalEvaluation`、`reviewCommissionGateBinding` 与 `L4` 最小查询闭环。
  2. `EX-13C`：完成自动化测试和文档 close-out。

---

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------------------------ |
| 无           | -     | -     | -           | -             | -           | 不接受临时默认值或请求回声类过渡方案 |

---

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `EX-13B` 继续实现时必须直接消费 `CommissionGateReviewRecord -> ApprovalSummarySnapshot` 的正式链路。
  2. 后续 command 实现必须校验 `summarySnapshotId` 与 `summaryPackageKey / projectionLevel / exportPolicy` 一致，不能只信任 request 文本。
  3. 未完成 `EX-13B` / `EX-13C` 前，`EX-13` 仍维持 `Doing`。
