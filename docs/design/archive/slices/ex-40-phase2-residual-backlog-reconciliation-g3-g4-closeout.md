# EX-40 Phase 2 归档例外复扫与当前 Backlog 收口 G3 / G4 Close-out

- Task ID: `EX-40`
- Date: 2026-04-29
- Owner: Codex
- Slice Type: process-only / governance reconciliation
- Baseline: `docs/design/archive/slices/ex-40-phase2-residual-backlog-reconciliation-baseline.md`

---

## 1. G4 结论

`EX-40` 可以关闭为 `Done / G4`。

复扫结论：

1. 当前执行板没有 `Todo` / `Doing` / `Blocked` 的真实工程任务。
2. 当前执行板没有开放例外 ID。
3. 敏感字段投影链路的 `FE43-R2`、`EX37C1-R3`、`EX37B-R3`、`EX37C2-R2` 均已被后续 G4 关闭。
4. 归档文件中的旧 `Open downstream` 文案保留历史状态，不代表当前 tracker 仍有开放任务。
5. 剩余 `Accepted boundary` 属于未来产品 / 治理优先级候选，不应自动进入当前执行板。

---

## 2. 当前 Tracker 复扫

| Scan Target                               | Result                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| Current execution rows with open status   | None found outside `EX-40` during this reconciliation slice. |
| Current execution rows with exception IDs | None after `EX-38` G4 close-out.                             |
| Sensitive projection exception columns    | Cleared for `EX-37B`、`EX-37C`、`EX-37C2`、`EX-38`、`EX-39`. |
| Required new implementation task          | None identified from current board.                          |

---

## 3. Archive Stale-open Classification

| Historical Signal                        | Current Classification | Closing / Governing Evidence                                                             |
| ---------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `EX37-R1-MANAGE-AS-READ-SENSITIVE`       | Closed                 | `EX-37A` G4：专用敏感读权限与字段包映射已落地。                                          |
| `EX37A` business query projection        | Closed                 | `EX-37B` / `EX-37C1` / `EX-37C2` / `FE-44` / `EX-39` G4 已完成业务查询 projection 接入。 |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` | Closed                 | `FE-43` 与 `EX-37B1` G4 已关闭。                                                         |
| `FE43-R2-NON-PROJECTED-TERM-FIELDS`      | Closed                 | `EX-39` G4 已关闭。                                                                      |
| `EX37C1-R3-SUMMARY-STRING-GRANULARITY`   | Closed                 | `EX-39` G4 已关闭。                                                                      |
| `EX37C2-R1-NON-AMOUNT-NARRATIVE-SCOPE`   | Closed                 | `FE-44` G4 已关闭。                                                                      |
| `EX37B-R3-SECURITY-EVENT-VOLUME`         | Closed                 | `EX-38` G4 已关闭。                                                                      |
| `EX37C2-R2-EVENT-VOLUME`                 | Closed                 | `EX-38` G4 已关闭。                                                                      |

---

## 4. Accepted Future Boundaries

These are not current blockers. They can become new tasks only after a product / governance priority decision:

| Boundary                                  | Why It Is Not Current Backlog                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `EX37-R2-EXPORT-REVEAL-OUT-OF-SCOPE`      | 导出申请、短时揭示和审批摘要裁剪属于新的敏感数据使用场景，不是当前 projection 收口残留。        |
| `FE39-R1` / `FE40-R2` todo target strings | 当前前端已用显式白名单收敛；后端 target enum 治理可另行优先级决策。                             |
| `FE41-R1-CLIENT-SIDE-FILTERING-ONLY`      | 合同列表客户端筛选已满足本片 TableDemo 基线；服务端分页 / 筛选是未来数据量驱动的独立增强。      |
| `FE42-R2-CONTRACT-ROUTE-READ-SCOPE`       | `/contracts` 继续作为协作读入口，金额靠字段级 projection / masking 保护；不是当前阻塞。         |
| `FE43-R3-BROWSER-MATRIX-USES-DEV-ROLES`   | 浏览器矩阵使用 dev role fixture 是可接受测试边界；更细权限 fixture 治理可另开但不阻塞当前任务。 |

---

## 5. Validation

- Tracker open scan: ``rg -n '`Todo`|`Doing`|`Blocked`' docs/design/phase2-development-execution-tracker.md``
  - Result: only governance instructions before `EX-40`; no actionable open row.
- Archive scan: `rg -n "Open downstream|Open\s+\||后续治理|Accepted boundary" docs/design/archive/slices`
  - Result: classified above.
- Markdown check: `corepack pnpm run format:md:check`
  - Result: Pass.
- Diff whitespace: `git diff --check`
  - Result: Pass.

---

## 6. Next Decision

Current Phase 2 execution backlog is empty.

下一步不应继续从旧 tracker 自动挑任务，而应先做新的产品 / 体验优先级决策。推荐候选方向：

1. 启动新一轮前端体验审查，围绕项目管理、线索、合同、提成、工作台的视觉一致性和用户路径做 `FE-45+` 规划。
2. 启动敏感数据导出 / 短时揭示 / 审批摘要裁剪治理，作为新的后端 / 前端联合主线。
3. 启动服务端分页 / 筛选 / 大数据量表格体验治理，优先覆盖合同、项目、线索和提成列表。
