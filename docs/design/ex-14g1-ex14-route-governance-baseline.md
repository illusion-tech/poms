# EX-14G1 EX-14 route governance authoritative baseline

- Gate Status: `Pass`
- Parent: `EX-14`
- Owner: `Codex`
- Slice Type: `process-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-14G1`

## 1. 范围

- 本次目标:
  - 把 `EX-14` 已进入 executable slice 的 public query surface 正式补录到 `ADR-015` authoritative inventory。
  - 在 `EX-14B` 进入 `G1 / G2` 前，冻结 `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 的 canonical route 输入。
  - 明确记录当前 runtime 尚未落地对应 controller route，防止再次出现“先写 controller / DTO / OpenAPI，后补 authoritative inventory”的顺序漂移。
- 本次覆盖:
  - `GET /projects/{projectId}/commission-final-settlement`
  - `GET /projects/{projectId}/commission-rule-explanation`
- 本次明确不做:
  - 不实现 `EX-14A / EX-14B` 的 controller、service、DTO、OpenAPI、generated client 或 E2E。
  - 不为尚未进入 executable slice 的 `CommissionStageGateView` 猜测 canonical route。
  - 不在本片补录未被 tracker 分配的 future surface。

## 2. 正式输入

| Input Type              | Document / Source                                             | Section / Anchor | Status   | Notes                                                                     |
| ----------------------- | ------------------------------------------------------------- | ---------------- | -------- | ------------------------------------------------------------------------- |
| ADR                     | `docs/adr/015-api-route-canonical-grammar.md`                 | `Decision`       | Accepted | route grammar 统一以 `resource-first + stable noun subresource` 为准      |
| Authoritative inventory | `docs/design/api-route-canonical-inventory.md`                | 全文             | Active   | authoritative inventory 必须覆盖所有 active / planned public surface      |
| Governance sweep        | `docs/design/ex-15h-in-flight-route-governance-sweep.md`      | §4 ~ §6          | Accepted | 已把 `EX-14G1` 定位为 `EX-14B` 的前置治理子片                             |
| Query boundary          | `docs/design/query-view-boundary-design.md`                   | `§5.3B`          | Active   | 已冻结 `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` |
| Business design         | `docs/design/phase2-commission-retention-final-settlement.md` | 全文             | Review   | 提供业务语义背景，但本片不依赖其单独定义 canonical route                  |
| Business design         | `docs/design/phase2-commission-rule-explanation-language.md`  | 全文             | Review   | 提供解释页目标与表达边界，但本片 route authority 仍以 ADR + baseline 为准 |
| Runtime fact            | `apps/poms-api/src/app/features/**`                           | `2026-04-18`     | Fact     | 当前无对应 controller route 落地                                          |

## 3. 本次 SSOT

| Concern                | SSOT                                       | Implementation Rule                                                                                                    |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Canonical route style  | `ADR-015`                                  | `EX-14` query route 统一按 `project-scoped stable noun subresource` 冻结，不使用 `/detail`、`/summary` 后缀            |
| Route authority        | `ADR-015` + `query-view-boundary` + 本基线 | 上游业务设计文档仍处于 `Review` 时，本片以已冻结 query boundary 与 route governance baseline 形成 authoritative input  |
| Planned vs implemented | `api-route-canonical-inventory.md`         | runtime 未落地前，`Current Implemented Route` 必须明确写为 `Not implemented`，不得伪造已实现状态                       |
| Slice boundary         | tracker `EX-14G1` / `EX-14B`               | 仅冻结 `CommissionFinalSettlementView`、`CommissionRuleExplanationView`；`CommissionStageGateView` 保持 future surface |

## 4. 裁决结论

| Capability                     | Canonical Route                                         | Current Implemented Route | Current Design Route                                    | Decision |
| ------------------------------ | ------------------------------------------------------- | ------------------------- | ------------------------------------------------------- | -------- |
| `getCommissionFinalSettlement` | `GET /projects/{projectId}/commission-final-settlement` | `Not implemented`         | `GET /projects/{projectId}/commission-final-settlement` | 冻结     |
| `getCommissionRuleExplanation` | `GET /projects/{projectId}/commission-rule-explanation` | `Not implemented`         | `GET /projects/{projectId}/commission-rule-explanation` | 冻结     |

### 4.1 命名说明

- `commission-final-settlement`:
  - 对应 `CommissionFinalSettlementView`
  - 以 `Project` 为主对象，沿用 `EX-13` 的 project-scoped stable noun subresource 规则
  - 显式表达“最终结算 / 质保金结算收口”，不退化为页面后缀式 `/summary` 或 `/detail`
- `commission-rule-explanation`:
  - 对应 `CommissionRuleExplanationView`
  - 保持 query-view 名称与 public route noun 的一一映射
  - 明确其为项目级统一解释入口，而不是某个 payout 或 gate item 的附属 detail

## 5. 一致性结论

- Document -> code: 当前 runtime 尚未实现对应 route，本片先冻结 authority，避免 `EX-14B` 先写 controller 再补 route。
- ADR-015 inventory -> route: 两条 canonical route 都满足 `resource-first + stable noun subresource`，与 `EX-13` 项目级 query surface 保持同构。
- Query -> view: `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 保持 project-scoped query，不回退到 item detail、页面后缀或混入 `CommissionStageGateView` future surface。
- Tracker -> execution: `EX-14G1` 完成后，`EX-14B` 的 route-governance 前置阻断解除；但 `EX-14A / EX-14B / EX-14C` 仍未开工。

## 6. 测试与校验

| Check              | Required | Command / Evidence   | Result | Gap / Reason                                        |
| ------------------ | -------- | -------------------- | ------ | --------------------------------------------------- |
| `git diff --check` | Yes      | docs-only 回写后执行 | Passed | 本片是 docs / process-only，最低要求是 diff hygiene |
| Runtime build/test | No       | `N/A`                | `N/A`  | 本片不改业务代码                                    |
| OpenAPI / client   | No       | `N/A`                | `N/A`  | 本片不新增 runtime contract，仅冻结 route 输入      |

## 7. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 不接受把 `CommissionStageGateView` 一并补录为 canonical route 的猜测性例外。 |

## 8. G1 / G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-18`
- Close-Out Scope:
  - `EX-14` 已分配 executable slice 的 public route surface 已进入 authoritative inventory。
  - `EX-14B` 不再受 route-governance 缺口阻断，可在 `EX-14A` 之后按本基线继续进入 `G1 / G2`。
  - `CommissionStageGateView` 仍保持未分配 future surface，不在本片越界冻结。
- Close-Out Conditions:
  - `EX-14B` 后续只能沿本基线的 canonical route 落 controller / DTO / OpenAPI。
  - 若 `EX-14` 后续新增 public capability，必须在同轮同步更新 authoritative inventory，不得事后补录。
