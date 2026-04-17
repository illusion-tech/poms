# EX-10 / EX-11 / EX-12 审阅后纠偏 Checkpoint

- Checkpoint Status: `Block`
- Parent: `EX-10`, `EX-11`, `EX-12`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Solo worktree checkpoint`
- Checkpoint Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-10`, `EX-11`, `EX-12`, `EX-10D1`, `EX-11D1 ~ EX-11D3`, `EX-12D1`

---

## 1. 触发背景与范围

- 触发原因: `EX-10 ~ EX-12` 的 migration、entity、controller、service、shared contract、unit test 与 commission workflow E2E 主路径已存在，但基于事实审阅发现若干真实 drift；当前不能把这些切片视为“已完成且可无条件供 EX-13 依赖”的稳定输入。
- 本次目标: 先把审阅结论、SSOT、阻断原因、优先级和验证例外冻结为 corrective checkpoint，再拆出可执行 remediation 子任务，随后按 `P1 -> P2` 顺序修复。
- 本次明确不做: 不在本 checkpoint 中直接扩展 `EX-13` 经营信号绑定；不借纠偏切片顺手改写 phase1 commission 的业务边界；不在没有正式决策前接受“继续沿用隐式 active rule 选择”的过渡方案。
- 本次纠偏后可恢复的可信边界: `CommissionRoleAssignment` 的 current/freeze 语义、`CommissionCalculation` 的事实 guard 与 rule identity、`CommissionAdjustment` 的异常执行链与 downstream 影响，将重新具备可供 `EX-13` 消费的稳定性。
- 仍不允许下游依赖的留白: 在 `EX-10D1`、`EX-11D1`、`EX-11D3`、`EX-12D1` 未完成前，不得把 `EX-10 ~ EX-12` 回写为 `Done`，也不得把其作为 `EX-13` 已闭合前置。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor     | Status   | Notes                                                                 |
| ------------------------- | ----------------------------------------------------------------- | -------------------- | -------- | --------------------------------------------------------------------- |
| Business design           | `commission-settlement-design.md`                                 | `4`, `6`, `7`, `8`   | Accepted | 固定规则版本、冻结版本、计算、发放、调整、重算的主语义                |
| Business design           | `phase2-commission-freeze-at-handover.md`                         | `5.3`, `5.5`         | Accepted | 固定“只读当前有效冻结版本”和冻结后争议 / 替代版本链                   |
| Business design           | `phase2-commission-staged-payout-adjustment-paths.md`             | `5`, `6`, `7`        | Accepted | 固定暂停、扣回、冲销、补发、重算的连续操作链与冻结后争议联动规则      |
| Command design            | `interface-command-design.md`                                     | `commission`         | Accepted | 以现有 commission command 边界为主；若 rule identity 需要改 contract，必须显式回写 |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | `commission`         | Accepted | 当前 public route 已由 `EX-15E3` canonical 收口；本次重点是 contract 语义而非 route 名称 |
| Query boundary            | `query-view-boundary-design.md`                                   | `commission`         | Accepted | 当前 detail / list view 已存在，但不能掩盖 current / status drift      |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `commission`         | Accepted | 版本链、status、`is_current`、替代关系与 adjustment 链仍以设计口径为准 |
| Schema / DDL              | `schema-ddl-design.md`                                            | `commission`         | Accepted | 条件唯一约束和 current 单有效语义需与实际 migration 对齐               |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | `gates`              | Accepted | 本次按 `G3 corrective checkpoint` 记录，不改写历史“主体实现已存在”的事实 |

---

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                                                                                                                                     | Corrective Rule                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics        | 旧的非 current draft `CommissionRoleAssignment` 仍可被直接冻结；`clawback / supplement` 执行后只把 adjustment 标记为 `executed`，没有形成受控 downstream 结果 | 冻结动作必须只允许当前有效 draft 版本进入；扣回 / 补发必须形成明确 downstream 影响，不接受“只记 adjustment 金额但不改变任何业务结果”的半闭环实现                 |
| Route / command naming    | 无新增 route grammar drift；`EX-15E3` canonical route 已完成                                                                                     | 本次 corrective 不重命名 public route，只修复 command 语义与 contract / persistence 一致性                                                                       |
| DTO / contract naming     | `CreateCommissionCalculationRequest` 未显式绑定 `ruleVersionId` 或等价 canonical identity，当前实现隐式选择“某个 active 规则版本”               | 在父任务关闭前，提成计算请求必须显式绑定规则 identity，或有同等强度的正式设计裁决；当前隐式 active-rule 选择判定为 `design-change-required`                      |
| Table / column naming     | `commission_role_assignment`、`commission_calculation` 仅有普通索引，没有 `project_id where is_current = true` 类条件唯一约束                   | current 版本链需要数据库级 single-current 约束；应用层切换仅作补充，不再视为充分条件                                                                              |
| Date / time semantics     | 无新增 drift                                                                                                                                     | 维持现有 `datetime` 语义                                                                                                                                            |
| Identifier semantics      | 计算触发没有绑定 rule identity，导致多 `ruleCode` 并存时可能静默选错规则                                                                        | 规则 identity 必须进入 request contract 和 service 选择链，不允许通过“从全部 active 里取第一个”来决定计算依据                                                   |
| Money / decimal semantics | `clawback / supplement` 调整虽然记录了金额，但未把金额作用到 payout / 补发链，导致金额语义无法闭环                                             | 扣回 / 补发必须与 payout 或 compensating record 形成可解释结果；至少要能稳定表达已扣回 / 已补发的业务后果                                                       |
| Status machine            | 重算链路没有复用初算的合同 / 回款 / 成本事实 guard；current 版本切换也缺少数据库级强约束                                                       | 重算必须和初算共享事实 guard；role assignment / calculation 的 current 状态链必须由 DB 条件唯一约束 + service guard 共同保证                                     |

---

## 4. 当前阻断结论

- Current Gate: `G3 = Block`
- Blocking Findings:
  1. 非 current draft 角色分配仍可冻结，违反“提成计算只读取当前有效冻结版本”的主线约束。
  2. 重算链路绕过初算时的合同 / 回款 / 成本事实校验，可生成不受已确认事实支撑的新计算版本。
  3. 计算请求 contract 未绑定规则 identity，当前实现存在多 active rule 并存时静默选错规则的风险。
  4. `commission_role_assignment` 与 `commission_calculation` 缺少数据库级 current 单有效约束，并发下可能出现双 current。
  5. `clawback / supplement` 的执行语义不闭环，当前只留下 adjustment 记录，未形成足够稳定的 downstream 业务结果。
- Why parent task cannot be closed:
  1. `EX-10 ~ EX-12` 虽已有主体实现，但当前状态机、contract identity 与 current 单有效约束仍不足以支撑下游 `EX-13` 依赖。
  2. 若在此时把父任务标为 `Done`，会误导后续切片把当前 commission 主链视为“治理已关闭”的稳定输入。

---

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. `EX-10D1`: 收紧 role assignment current-only freeze guard，并补 stale draft / stale version 自动化覆盖。
  2. `EX-11D1`: 让 recalculation 复用初算事实 guard，消除重算旁路。
  3. `EX-11D2`: 为 calculation request 建立显式 rule identity，并关闭隐式 active-rule 选择。
  4. `EX-11D3`: 为 role assignment / calculation 补齐 current 单有效 DB 约束与并发 guard。
  5. `EX-12D1`: 收紧 `clawback / supplement` 的执行语义，并补齐自动化覆盖。
- 本批未修复范围:
  1. 不扩展新的前端页面或经营工作区体验。
  2. 不新增真实财务付款联动。
  3. 不在本批改写 approval route grammar 或 shared client 生成链之外的横向能力。

| Concern | Before | After | Result |
| ------- | ------ | ----- | ------ |
| 审后 drift 记录 | `EX-10 ~ EX-12` 只有“主体实现存在”的事实，没有正式 corrective 留痕 | 新增本 checkpoint，冻结 findings、SSOT、验证例外与 remediation 顺序 | Done |
| 纠偏子切片拆分 | tracker 中只有 `EX-10A ~ EX-12C` 原始计划切片 | 新增 `EX-10D1`、`EX-11D1 ~ EX-11D3`、`EX-12D1` 作为 corrective remediation 入口 | Done |
| `EX-10D1` current-only freeze guard | 非 current draft 仍可调用 `:freeze` 进入冻结链 | service 已要求 `isCurrent = true`，并补充 stale draft unit / HTTP E2E 断言 | Done |
| `EX-11D1` recalculation fact guard parity | `recalculateCalculation` 可绕过初算的合同 / 回款 / 成本事实校验 | 重算已复用 `#assertEffectiveContractFacts`，并补充 unit / HTTP E2E 断言 | Done |
| `EX-11D2` calculation rule identity | create request 仍隐式选择“某个 active rule” | request contract、service、OpenAPI、generated client 与 admin consumer 已统一显式绑定 `ruleVersionId`，missing / inactive rule version 会被拒绝 | Done |
| 后续 corrective | `EX-11D3`、`EX-12D1` 仍未开始 | 保持 `Block`，继续按 `P2` 顺序推进 | In Progress |

---

## 6. 测试与校验

| Check                            | Required    | Command / Evidence                                                                | Result | Gap / Reason                                                                                |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Lint                             | Yes         | `corepack pnpm nx lint poms-api`                                                  | Pass   | 2026-04-18 已执行；`poms-api-e2e` 无 `lint` target，已显式记录                            |
| Build                            | Yes         | `corepack pnpm nx run poms-api:build`                                             | Pass   | 2026-04-18 已执行；`poms-api` build target 已从 `--config-node-env` 修正为 `--node-env` |
| Unit tests                       | Yes         | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=commission`        | Pass   | 2026-04-18 已执行，5 suites / 73 tests 通过                                               |
| API / integration tests          | Yes         | `commission.service.spec.ts` / controller specs                                   | Pass   | 新增 stale draft freeze 与 recalculation receipt guard 断言已进入 commission unit suites  |
| E2E                              | Yes         | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=commission-workflow.e2e-spec.ts` | Pass   | 2026-04-18 已执行，managed server harness 恢复后 10 suites / 61 tests 通过               |
| OpenAPI generation / client diff | Conditional | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | Pass | 2026-04-18 已执行；`EX-11D2` contract drift 已同步回写 |
| Migration / schema check         | Conditional | 尚未执行                                                                          | Pending | `EX-11D3` 若补条件唯一约束，必须补跑 `migration-check`                                    |
| Diff / whitespace check          | Yes         | `git diff --check`                                                                | Pass   | 2026-04-18 已执行                                                                          |

---

## 7. 残余阻断与后续切片

- 已解除的阻断:
  1. `EX-10D1` 已关闭：非 current draft 角色分配已不能再进入冻结链。
  2. `EX-11D1` 已关闭：重算已复用初算合同 / 回款 / 成本事实 guard，不再保留 recalculation 旁路。
  3. `EX-11D2` 已关闭：calculation create 已显式绑定 `ruleVersionId`，不再隐式选择 active rule。
- 仍存在的阻断:
  1. `EX-11D3` 未完成前，并发下 current 单有效性仍缺少数据库级保证。
  2. `EX-12D1` 未完成前，扣回 / 补发链仍不能视为语义闭环。
- 后续子切片:
  1. `EX-11D3`: current single-effective DB constraint + migration / guard。
  2. `EX-12D1`: clawback / supplement execution semantics + tests。

---

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
| 无           | -     | -     | -           | -             | -           | 2026-04-18 已修复 `poms-api` build target 的 `webpack-cli` 参数兼容性，原 E2E 环境例外关闭 |

---

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Block`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `EX-10 ~ EX-12` 暂不允许回写为 `Done`；tracker 必须先显式进入 corrective 状态并拆出 remediation 子任务。
  2. `EX-10D1` 与 `EX-11D1` 作为 `P1` 问题，必须优先于 `EX-13` 开工关闭。
  3. `EX-11D2` 涉及 request contract / OpenAPI / generated client，修复时必须同步完成 authoritative 文档和 client 回写。
  4. 当前不接受“继续沿用隐式 active-rule 选择，等以后再统一”的过渡方案。
