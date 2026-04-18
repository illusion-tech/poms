# EX-13B Operating Signal / Gate Binding Command & Query 实施基线包

- Gate Status: `Pass`
- Parent: `EX-13`
- Owner: `Codex`
- Slice Type: `command-query`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-13B`

---

## 1. 范围

- 本次目标:
  1. 在 `project-cost` 模块落地 `reviewOperatingSignalEvaluation` 与 `reviewCommissionGateBinding` 两个正式命令。
  2. 基于 `EX-13A` 的正式持久化模型补齐 `L4` 最小查询闭环，至少覆盖 `OperatingSignalEvaluationView`、`CommissionGateBindingHistoryView`、`ProjectBusinessOutcomeOverviewView`、`ProjectUnifiedAccountingView`、`ProjectVarianceRiskExplanationView` 与 `BusinessAccountingFeedbackView` 的正式实现来源。
  3. 同步 shared contract、OpenAPI / api-contracts、controller、service、spec 与最小 HTTP E2E。
- 本次明确不做:
  1. 不把 `commission` 模块改造成 `operating_signal_gate_binding` 的写侧 owner。
  2. 不在本切片提前实现 `L5` 发放审批 / guard 真正消费 gate review 的联动，该部分仍属于后续提成切片。
  3. 不新增过渡 route、临时 DTO 或页面拼装字段。

---

## 2. 正式输入

| Input Type           | Document / Source                                          | Section / Anchor     | Status   | Notes                                                     |
| -------------------- | ---------------------------------------------------------- | -------------------- | -------- | --------------------------------------------------------- |
| Command design       | `interface-command-design.md`                              | `200-214`            | Accepted | 冻结两个 review 命令                                      |
| DTO / OpenAPI design | `interface-openapi-dto-design.md`                          | `261-275`            | Accepted | 冻结 review 请求 / 响应最小字段                           |
| Query boundary       | `query-view-boundary-design.md`                            | `180-185`            | Accepted | 冻结 `L4-T01 ~ T04` 视图字段                              |
| Persistence baseline | `ex-13a-operating-signal-model-baseline.md`                | `6`, `10`, `11`      | Accepted | 必须直接消费 EX-13A 正式表链                              |
| DDL / freeze         | `table-structure-freeze-design.md`、`schema-ddl-design.md` | `294-296`, `598-649` | Accepted | 查询 / 命令只允许消费正式列，不得回退页面聚合             |
| ADR                  | `../adr/015-api-route-canonical-grammar.md`                | `Decision`           | Accepted | route 继续使用 canonical slash-action / collection create |

---

## 3. 本次 SSOT

| Concern               | SSOT                                                                                                                                                                                                      | Implementation Rule                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Write owner           | `reviewOperatingSignalEvaluation`、`reviewCommissionGateBinding` 先由 `project-cost` controller / service 承载                                                                                            | 持久化 owner 与 command owner 同域，避免把 `commission` 过早拉成写侧 owner |
| Route grammar         | `POST /operating-signal-evaluations/{id}:review`、`POST /commission-gate-bindings/{id}:review`                                                                                                            | 不引入非 canonical 临时 route                                              |
| Query source          | `ProjectOperatingSnapshot` + `DataMaturityEvaluationResult` + `OperatingSignalEvaluationResult` + `OperatingSignalReviewRecord` + `OperatingSignalToCommissionGateBinding` + `CommissionGateReviewRecord` | 所有 `L4` 视图直接消费正式表链，不得再从页面层补推导                       |
| Cross-module boundary | `commission` 当前不拥有 gate binding 写侧；后续 `L5` 只读消费 `project-cost` 结果                                                                                                                         | 本切片优先收口 `project-cost` 内的命令 / 查询闭环                          |
| Contract freeze       | 请求 / 响应必须承接 `taxImpactSummary`、`taxImpactPendingAmount`、`dataMaturityLevel`、`costActionRecommendation`、`currentActionLevel`、`referencedBaselineVersion`、`referencedSnapshotVersion`         | 不允许只返回 `resultStatus` 再让前端拼解释                                 |

---

## 4. 实施边界

| Area                             | Expected Files                                                                                             | Result  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- |
| Shared contract / OpenAPI        | `libs/shared/contracts/src/lib/shared-contracts.ts`、`libs/shared/api-spec/openapi.json`、generated client | Pending |
| API DTO / route                  | `apps/poms-api/src/app/features/project-cost/project-cost.controller.ts`、api-contracts DTO                | Pending |
| Service / repository composition | `apps/poms-api/src/app/features/project-cost/project-cost.service.ts`、`project-cost.repository.ts`        | Pending |
| Tests                            | `project-cost.service.spec.ts`、HTTP E2E                                                                   | Pending |

---

## 5. 风险与约束

- 不接受把 `reviewCommissionGateBinding` 放进 `commission` controller，但真实写侧仍落在 `project-cost` repository 的分裂实现。
- 不接受只补命令、不补 `L4` 查询视图；这会继续让页面依赖临时拼装。
- `reviewCommissionGateBinding` 的响应里若需要 `summaryPackageKey / summarySnapshotId / projectionLevel / exportPolicy`，必须先在正式模型上找到可追溯来源；若当前上游模型未提供，需明确记录为 EX-13B 阻塞项，而不是临时硬编码。

---

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 先在 `project-cost` 完成命令 / 查询 / contract 最小闭环，再评估是否需要把 gate 结果读侧下沉到 `commission`。
  2. 所有视图与命令必须直接消费 `EX-13A` 表链，不得重新引入临时聚合 SSOT。
  3. close-out 至少要求 `poms-api` lint/test/build、OpenAPI / generated client、相关 HTTP E2E 与 tracker 回写。
