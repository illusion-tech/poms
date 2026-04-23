# EX-15G EX-13 route governance authoritative baseline

- Gate Status: `Pass`
- Parent: `EX-15`
- Owner: `Codex`
- Slice Type: `process-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15G`

## 1. 范围

- 本次目标:
  - 把 `EX-13` 新增的 `project-cost` route surface 正式补录到 `ADR-015` authoritative inventory。
  - 在恢复 `EX-13B` 业务实现前，冻结 `review command + L4 query` 的 canonical route 输入。
  - 明确记录 `EX-13B` 暂停事实，并确认当前 runtime 不保留未分类 route drift。
- 本次覆盖:
  - `POST /operating-signal-evaluations/{id}:review`
  - `GET /operating-signal-evaluations/{id}`
  - `POST /commission-gate-bindings/{id}:review`
  - `GET /commission-gate-bindings/{id}`
  - `GET /projects/{projectId}/business-outcome-overview`
  - `GET /projects/{projectId}/unified-accounting`
  - `GET /projects/{projectId}/variance-risk-explanation`
  - `GET /projects/{projectId}/business-accounting-feedback`
- 本次明确不做:
  - 不继续推进 `EX-13B` 的 shared contract、controller、service、repository、OpenAPI、generated client 或 E2E 实现。
  - 不把未闭环的 EX-13B WIP 继续保留在工作树。
  - 不重开 `EX-15A ~ EX-15F` 已完成的历史 runtime cutover。

## 2. 正式输入

| Input Type           | Document / Source                                                                        | Section / Anchor | Status   | Notes                                                                |
| -------------------- | ---------------------------------------------------------------------------------------- | ---------------- | -------- | -------------------------------------------------------------------- |
| ADR                  | `docs/adr/015-api-route-canonical-grammar.md`                                            | §4.1 ~ §4.5      | Accepted | route grammar 统一以 `resource-first + colon-action` 为 SSOT         |
| Inventory            | `docs/design/api-route-canonical-inventory.md`                                           | 全文             | Active   | authoritative inventory 必须覆盖所有已知 active / planned capability |
| EX-13 baseline       | `docs/design/ex-13b-operating-signal-command-query-baseline.md`                          | §2, §3           | Accepted | 冻结 EX-13B 的命令 / 查询边界，但暂停业务实现                        |
| Query boundary       | `docs/design/query-view-boundary-design.md`                                              | §5.9             | Accepted | 冻结 `L4-T01 ~ L4-T04` 查询视图边界                                  |
| DTO / command design | `docs/design/interface-openapi-dto-design.md`、`docs/design/interface-command-design.md` | EX-13 段         | Accepted | 命令 route 与字段边界已有正式输入                                    |
| Runtime fact         | 当前 `main` worktree                                                                     | 2026-04-18       | Fact     | EX-13B 未闭环 WIP 已回退；当前 controller runtime 不新增漂移         |

## 3. 本次 SSOT

| Concern                | SSOT                                   | Implementation Rule                                                                                |
| ---------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Canonical route style  | `ADR-015`                              | 所有 EX-13 新 route 一律按 `resource-first + colon-action / stable noun subresource` 记录          |
| Planned vs implemented | `api-route-canonical-inventory.md`     | 未恢复实现前，`Current Implemented Route` 必须明确为 `Not implemented`，不伪造 runtime 完成态      |
| Resume gate            | `EX-13B` 基线 + 本基线                 | `EX-13B` 恢复前必须先消费本基线中的 canonical route，不得再先写 controller 后补 authoritative docs |
| Historical closure     | `EX-15A ~ EX-15F` 已交付文档与验证结论 | 本片只补新 surface，不回滚历史完成态                                                               |

## 4. 裁决结论

| Capability                          | Canonical Route                                          | Current Implemented Route | Current Design Route                                     | Decision |
| ----------------------------------- | -------------------------------------------------------- | ------------------------- | -------------------------------------------------------- | -------- |
| `reviewOperatingSignalEvaluation`   | `POST /operating-signal-evaluations/{id}:review`         | `Not implemented`         | `POST /operating-signal-evaluations/{id}:review`         | 冻结     |
| `getOperatingSignalEvaluation`      | `GET /operating-signal-evaluations/{id}`                 | `Not implemented`         | `GET /operating-signal-evaluations/{id}`                 | 冻结     |
| `reviewCommissionGateBinding`       | `POST /commission-gate-bindings/{id}:review`             | `Not implemented`         | `POST /commission-gate-bindings/{id}:review`             | 冻结     |
| `getCommissionGateBinding`          | `GET /commission-gate-bindings/{id}`                     | `Not implemented`         | `GET /commission-gate-bindings/{id}`                     | 冻结     |
| `getProjectBusinessOutcomeOverview` | `GET /projects/{projectId}/business-outcome-overview`    | `Not implemented`         | `GET /projects/{projectId}/business-outcome-overview`    | 冻结     |
| `getProjectUnifiedAccounting`       | `GET /projects/{projectId}/unified-accounting`           | `Not implemented`         | `GET /projects/{projectId}/unified-accounting`           | 冻结     |
| `getProjectVarianceRiskExplanation` | `GET /projects/{projectId}/variance-risk-explanation`    | `Not implemented`         | `GET /projects/{projectId}/variance-risk-explanation`    | 冻结     |
| `getBusinessAccountingFeedback`     | `GET /projects/{projectId}/business-accounting-feedback` | `Not implemented`         | `GET /projects/{projectId}/business-accounting-feedback` | 冻结     |

## 5. 一致性结论

- Document -> code: 当前 runtime 无需修复的 EX-13 route drift，因为未闭环实现已回退；新增 surface 先以设计 / inventory 进入 authoritative 状态。
- Route -> command: 两个 write capability 均固定为 item `colon-action`，不允许回退到 slash-action 或 project-scoped item identity。
- Query -> view: 四个 project-scoped 查询统一按稳定名词型子资源处理，不使用 `/detail`、`/summary`、`/current` 等页面后缀。
- Tracker -> execution: `EX-13B` 当前不是“继续 Doing”，而是“暂停且无残留 WIP”；恢复实现需显式重启。

## 6. 测试与校验

| Check              | Required | Command / Evidence   | Result  | Gap / Reason                                        |
| ------------------ | -------- | -------------------- | ------- | --------------------------------------------------- |
| `git diff --check` | Yes      | docs-only 回写后执行 | Pending | 本片是 docs / process-only，最低要求是 diff hygiene |
| Build              | No       | `N/A`                | N/A     | 本片不保留代码实现变更                              |
| Test / E2E         | No       | `N/A`                | N/A     | 本片不触达 runtime 行为                             |
| OpenAPI / client   | No       | `N/A`                | N/A     | 本片只冻结恢复前 route 输入                         |

## 7. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                            |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 不接受“先恢复 EX-13B 实现、后补 authoritative inventory”的例外。 |

## 8. G1 / G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-18`
- Close-Out Scope:
  - `EX-13` 新 route surface 已进入 authoritative inventory。
  - `EX-13B` 暂停事实与恢复前提已回写到 baseline / tracker。
  - 当前 runtime 维持 `EX-15` 历史完成态，不把未闭环本地 WIP 误记为已实现。
- Close-Out Conditions:
  - 下一次恢复 `EX-13B` 时，只能沿本基线的 canonical route 继续实现。
  - 若恢复实现后新增 route surface，必须同轮更新 authoritative inventory，不再事后补录。
