# EX-14C Test / Documentation Close-out Baseline

- Gate Status: `Pass`
- Parent: `EX-14`
- Owner: `Codex`
- Slice Type: `close-out`
- Reviewer: `Solo worktree checkpoint`
- Review Date: `2026-04-19`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14C`
- Execution Status: `Done 2026-04-19`

---

## 1. 范围

- 本次目标:
  1. 为 `EX-14` 补齐基于 `DatabaseSeeder` 固定夹具的后端 HTTP E2E，覆盖 `reviewOperatingSignalEvaluation -> reviewCommissionGateBinding -> final payout approve/register -> retention receipt / departure decision -> retention submit/approve/register` 全链路。
  2. 关闭 `FE-06` 在 `G3` 阶段被 `poms-api` 阻断的浏览器级验证缺口，重跑最终结算 / 规则解释两页对应的 workspace Playwright。
  3. 把 close-out 过程中暴露的运行时 / seeder 顺序缺陷一并修复，并完成 tracker / progress / checkpoint 回写。
- 本次明确不做:
  1. 不新增 public route、OpenAPI surface 或 generated client 变更。
  2. 不把“质保期届满”伪装成已模型化事实；当前 close-out 只收口已正式存在的 gate / receipt / departure / dispute / snapshot 证据链。

---

## 2. 正式输入

| Input Type          | Document / Source                                                      | Status | Notes                                             |
| ------------------- | ---------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| Previous slice      | `docs/design/ex-14b3c-retention-rule-explanation-write-baseline.md`    | Active | retention 与 rule explanation 写侧已在此冻结      |
| Frontend checkpoint | `docs/design/fe-06-final-settlement-rule-explanation-g3-checkpoint.md` | Active | `FE-06` 的唯一剩余阻塞来自 Playwright 未重跑      |
| Tracker             | `docs/design/phase2-development-execution-tracker.md`                  | Active | `EX-14C` 与 `FE-06` 状态需在 close-out 后统一回写 |
| Progress board      | `docs/design/poms-design-progress.md`                                  | Active | 需要把 `EX-14` 父任务完成结论回灌到总进度板       |

---

## 3. Close-out 证据

- 后端 seeded E2E:
  - `commission-main` 现复用正式 `project_handover` 夹具并挂接一条 `gate_stage_type = final` 的经营信号 / gate review 证据链。
  - `commission-workflow.e2e-spec.ts` 新增固定夹具测试，验证 current `CommissionFinalSettlementSnapshot` 与 current `CommissionRuleExplanationSnapshot` 在 final / retention 全链路中的运行期 supersede 行为。
- 运行时修正:
  - `ApprovalService` 与 `CommissionService` 对 current `CommissionFinalSettlementSnapshot` / `CommissionRuleExplanationSnapshot` 的 supersede 顺序改为先 flush 旧 current，再写入新 current，避免 DB 级 partial unique index 冲突。
  - `DatabaseSeeder` 清理顺序新增 `commission_rule_explanation_snapshot`、`commission_final_settlement_snapshot`、`commission_departure_exception_decision`，避免 rerun 时被新的 FK 链阻断。
- 前端 blocker close-out:
  - `FE-06` 当时失败的两条 workspace Playwright 已在本轮 backend 修正后重跑通过，说明阻断已解除，不再是前端页面或导航链本身的问题。

---

## 4. 校验结果

| Check                   | Command / Evidence                                                                                                                                                                                       | Result            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Seeder rerun            | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                                                               | Pass              |
| Backend unit tests      | `corepack pnpm nx test poms-api --runInBand`                                                                                                                                                             | Pass              |
| Backend lint            | `corepack pnpm nx lint poms-api`                                                                                                                                                                         | Pass              |
| Backend build           | `corepack pnpm nx build poms-api`                                                                                                                                                                        | Pass              |
| Backend seeded HTTP E2E | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=commission-workflow.e2e-spec.ts`                                                                                                    | Pass              |
| FE-06 blocker rerun     | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` | Pass              |
| Diff / whitespace       | `git diff --check`                                                                                                                                                                                       | Pending close-out |

---

## 5. 例外与残余风险

| Exception ID | Level | Scope                                                | Status          | Notes                                                                                                                                                           |
| ------------ | ----- | ---------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-14C-E1`  | `E2`  | 仓库仍无“质保期届满 / retention due”正式 fact source | Accepted / Open | 继承 `EX-14B3C-E1`。当前运行时只能正式校验 `final gate + confirmed receipt + departure exception decision + dispute status`，不能宣称已自动校验 warranty expiry |

---

## 6. 决策

- `EX-14C` 可以关闭。
- `EX-14B3`、`EX-14B` 与父任务 `EX-14` 可以随 close-out 一并转为 `Done`，但必须在 tracker 中显式保留 `EX-14C-E1` 残余限制。
- `FE-06` 可从 `Doing / G3 Block` 转为 `Done / G3 Pass`；其原 exception `FE-06-E2E-BLOCKED-BY-POMS-API` 可以关闭。
