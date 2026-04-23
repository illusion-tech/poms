# EX-13 Upstream Phase-2 Action Semantics 纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-13`
- Owner: `Codex`
- Slice Type: `docs-only`
- G3 Reviewer: `Solo worktree checkpoint`
- Checkpoint Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-13`, `EX-13D1`, `EX-13B`

---

## 1. 触发背景与范围

- 触发原因: 在恢复 `EX-13B` 前进行上游设计审阅时，发现 `EX-13` 依赖的四份 `phase2-*` 文档对 `currentActionLevel` 与 stage-specific gate 之间的关系、`L2 costActionRecommendation` 与 `L4` 信号的优先级、以及 `final` / `retention` 阶段拆分未形成可执行的单一语义；若直接恢复 command/query，实现者可能在同一事实输入上得出不同的 `bindingAction` / gate 结论。
- 本次目标:
  1. 把 `currentActionLevel` 冻结为项目级统一经营动作类，并明确它不等同于任一 payout stage 的 gate 结果。
  2. 冻结 `L2 costActionRecommendation`、经营风险、低回款、极端值、历史补录 / 重述待确认等信号的统一优先级与多信号组合规则。
  3. 将 `最终结算（非质保部分）` 与 `质保金结算` 明确为两个独立 downstream stage，并把该语义回写到上游设计与 `EX-13B` baseline。
- 本次明确不做:
  1. 不在本 checkpoint 中直接实现 `EX-13B` controller / service / query / shared contract / OpenAPI / generated client。
  2. 不在本次文档纠偏中新增 public route、状态枚举或新的业务对象。
  3. 不改变既有 `L2` 金额、基线、快照 / 重述链与摘要快照锚点的 SSOT。
- 本次纠偏后可恢复的可信边界:
  1. `EX-13B` 可直接按修正后的 phase-2 语义实现 `reviewOperatingSignalEvaluation`、`reviewCommissionGateBinding` 与 `L4` 最小查询闭环。
  2. `currentActionLevel`、`bindingAction`、`allowedActions` 与 `L5` summary snapshot reuse 的语义有了同一份上游来源，不再依赖实现者自行补规则。
- 仍不允许下游依赖的留白:
  1. `EX-13B` 的 command/query/runtime contract/OpenAPI/E2E 仍未实现。
  2. `EX-13C` 的自动化测试与 close-out 文档回写仍未完成。

---

## 2. 正式输入

| Input Type            | Document / Source                                                                                     | Section / Anchor               | Status   | Notes                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ | -------- | ---------------------------------------------------------------------------------- |
| Business design       | `phase2-project-business-outcome-overview.md`                                                         | `9.4`, `11.3`                  | Accepted | 原文已冻结项目级动作等级与 `L5` 消费边界，但缺统一优先级与 stage 分工              |
| Business design       | `phase2-project-unified-accounting-view-caliber.md`                                                   | `6.6`, `7.1`, `12.2`, `12.3`   | Accepted | 原文已冻结极端值、`L2` 正式输入与 downstream 承接，但缺显式 stage 语义             |
| Business design       | `phase2-project-variance-risk-explanation.md`                                                         | `7.4`, `12.1`, `12.2`          | Accepted | 原文要求输出动作等级与快照版本，但未冻结解释页与 stage gate 的职责边界             |
| Business design       | `phase2-business-accounting-feedback-rules.md`                                                        | `8.2`, `8.4`, `8.5`, `11.1`    | Accepted | 原文已有 `L4 -> L5` 绑定矩阵，但把 `final` / `retention` 合并且未冻结组合规则      |
| Command / DTO design  | `interface-command-design.md`、`interface-openapi-dto-design.md`                                      | `4.6A`, `5.5AA`                | Accepted | 下游 command / DTO 已把 `final` 与 `retention` 作为独立 stage，对上游形成反证      |
| Query boundary        | `query-view-boundary-design.md`                                                                       | `146`, `150`, `180-200`, `241` | Accepted | 下游 view 已要求区分 `finalSettlementStatus` / `retentionSettlementStatus`         |
| Baseline / corrective | `ex-13b-operating-signal-command-query-baseline.md`、`ex-13b-summary-anchor-corrective-checkpoint.md` | `2`, `3`, `4-9`                | Accepted | `EX-13B` 恢复实现前需要同时消费修正后的 phase-2 语义与 persistence SSOT            |
| ADR / governance      | `../adr/014-design-execution-state-model-and-governance-gates.md`                                     | `gates`                        | Accepted | 本次属于已开工切片的 `design-change-required` corrective，而不是新的 `G1` baseline |

---

## 3. Drift 清单与本次 SSOT

| Concern                    | Drift / SSOT                                                                                                                | Corrective Rule                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics         | 上游 phase-2 文档要求输出统一 `currentActionLevel`，但未冻结它与 stage-specific gate 结果之间的关系                         | `currentActionLevel` 固定为项目级统一经营动作类；`first / second / final / retention` 的 gate 结果必须继续由 `L4-T04` 阶段矩阵计算       |
| Signal precedence          | `L2 costActionRecommendation`、经营风险、低回款、极端值、历史补录 / 重述待确认同时命中时，文档缺少统一优先级                | 先把 `L2 costActionRecommendation` 视为不可降级下限，再按 `BLOCK > REVIEW > PROMPT` 收敛全部有效 `L4` 信号                               |
| Multi-signal binding       | 同一阶段同时命中多条信号时，矩阵没有冻结如何得到单一 stage gate 结果                                                        | 先逐信号得到该阶段候选 gate 结果，再按 `BLOCK > REVIEW > PROMPT` 收敛；若并列，必须在摘要与留痕中同时保留并列主因                        |
| Status machine             | `phase2-business-accounting-feedback-rules.md` 把 `最终阶段 / 质保金结算` 合并成一列，但下游 command / query 已拆为不同阶段 | `最终结算（非质保部分）` 与 `质保金结算` 固定为两个独立 downstream stage；retention 专属前置条件只能在矩阵结果基础上维持或收紧，不得放宽 |
| Query / contract alignment | `allowedActions` 与 `summarySnapshot` 复用约束是行为契约，但 `EX-13B` baseline 原先未把这些补充约束与上游业务规则一起冻结   | `EX-13B` baseline 必须同时挂上 `query-view-boundary` 的补充约束与修正后的 phase-2 业务规则，避免实现阶段只消费字段清单而忽略动作语义     |
| Money / snapshot semantics | 金额、基线、快照 / 重述链本身未发现新的设计缺陷                                                                             | 维持既有 SSOT，不借本次纠偏顺手改写金额口径或历史回看模型                                                                                |

---

## 4. 当前阻断结论

- Current Gate: `G3 = Pass`
- Blocking Findings:
  1. 已解除。原阻断是上游 phase-2 文档未冻结 `currentActionLevel` 优先级与 stage-specific gate 关系，属于 `design-change-required`。
  2. 已解除。原阻断是 `final` / `retention` 阶段在上游矩阵中被压平，导致下游实现无法无歧义承接。
- Why parent task cannot be closed:
  1. 本 checkpoint 只关闭了上游设计语义 drift；`EX-13B` 与 `EX-13C` 的实现、测试和 close-out 仍未完成。

---

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 回写四份上游 `phase2-*` 文档，冻结 `currentActionLevel` 优先级、stage gate 组合规则与 `final` / `retention` 拆分。
  2. 回写 `ex-13b-operating-signal-command-query-baseline.md`，把修正后的业务规则显式纳入 `EX-13B` 正式输入与 SSOT。
- 本批未修复范围:
  1. `EX-13B` runtime command/query/controller/service/shared contract/OpenAPI/generated client。
  2. `EX-13C` 自动化测试与文档 close-out。

| Concern                        | Before                                                              | After                                                                                                 | Result |
| ------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| `currentActionLevel` 优先级    | 只要求输出统一动作等级，但未冻结 `L2` floor + `L4` 信号的组合优先级 | `phase2-business-accounting-feedback-rules.md` 已新增 `8.4A`，其余三份 phase-2 文档已回写同一语义     | Done   |
| 多信号阶段 gate 组合           | 同一阶段多信号同时命中时没有确定性组合规则                          | `L4 -> L5 gate` 矩阵已明确“先逐信号、后按 `BLOCK > REVIEW > PROMPT` 收敛，并保留并列主因”             | Done   |
| `final` / `retention` 阶段模型 | 上游矩阵把二者压成同一列，下游 command/query 已拆分                 | 上游矩阵已拆成 `最终结算（非质保部分）` 与 `质保金结算` 两列，并补 retention 专属前置条件说明         | Done   |
| `EX-13B` 设计输入可追溯性      | baseline 仅挂字段与 persistence 事实，未显式挂上补充动作语义        | `EX-13B` baseline 已补 `phase2-*` 业务规则输入、`query-view-boundary` 补充约束与 contract freeze 扩展 | Done   |

---

## 6. 测试与校验

| Check                            | Required | Command / Evidence | Result | Gap / Reason                                                         |
| -------------------------------- | -------- | ------------------ | ------ | -------------------------------------------------------------------- |
| Lint                             | No       | N/A                | N/A    | `docs-only` corrective，不涉及 lint-enabled runtime project 行为变更 |
| Build                            | No       | N/A                | N/A    | 同上                                                                 |
| Unit tests                       | No       | N/A                | N/A    | 同上                                                                 |
| API / integration tests          | No       | N/A                | N/A    | 同上                                                                 |
| E2E                              | No       | N/A                | N/A    | 同上                                                                 |
| OpenAPI generation / client diff | No       | N/A                | N/A    | 同上                                                                 |
| Migration / schema check         | No       | N/A                | N/A    | 本次未改 persistence SSOT                                            |
| Diff / whitespace check          | Yes      | `git diff --check` | Pass   | 2026-04-18 已执行                                                    |

---

## 7. 残余阻断与后续切片

- 已解除的阻断:
  1. `EX-13` 上游 phase-2 文档已能为 `currentActionLevel`、stage-specific gate 结果与 `final` / `retention` 提供单一可执行语义。
  2. `EX-13B` 恢复实现时，不再需要实现者自行猜测 `L2` floor、并列信号组合或 retention 与 final 的分工。
- 仍存在的阻断:
  1. `EX-13B` 仍未完成 controller / service / query / shared contract / OpenAPI / generated client / E2E。
  2. `EX-13C` 仍未完成测试与文档 close-out。
- 后续子切片:
  1. `EX-13B`：直接在修正后的 upstream semantics + persistence SSOT 上实现 command/query 最小闭环。
  2. `EX-13C`：完成自动化测试、文档回写与 close-out。

---

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                               |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | --------------------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 本次不接受“实现时再决定优先级 / 阶段语义”的隐式例外 |

---

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `EX-13B` 恢复实现时必须直接消费本 checkpoint 修正后的 phase-2 语义，不得再把 `currentActionLevel` 直接映射成 stage gate 结果。
  2. `EX-13B` 的命令 / 查询实现必须同时遵守 `L2` floor、阶段矩阵组合规则、`final` / `retention` split 与 `summarySnapshot` 复用约束。
  3. 未完成 `EX-13B` / `EX-13C` 前，`EX-13` 仍维持 `Doing`。
