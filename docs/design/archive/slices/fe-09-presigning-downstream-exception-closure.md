# FE-09 签约前下游例外 Post-G4 Closure

- Closure Status: `Pass`
- Parent: `FE-09`
- Owner: `Codex`
- Slice Type: `process-only / docs-only exception closure`
- Closure Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-09`
- Original Close-out: `docs/design/archive/slices/fe-09-presigning-entry-workspace-frontend-g3-g4-closeout.md`

## 1. Closure Scope

- 本次关闭:
  1. `FE09-E1-DETAIL-WORKSPACES-DEFERRED`
  2. `FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE`
- 本次不做:
  1. 不修改运行时代码。
  2. 不新增 public API route、DTO、OpenAPI、generated client、migration 或 E2E。
  3. 不把 `FE-09` 重解释为写侧或完整 L1 业务闭环；本次只关闭 FE-09 G4 时保留的下游前端/事实源边界例外。

## 2. Closure Evidence

| Exception ID                               | Closure Evidence                                                                                                                                                                                                                                                         | Result |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `FE09-E1-DETAIL-WORKSPACES-DEFERRED`       | `FE-10` 已交付 `/projects/:id/workspace/technical-cost`；`FE-11` 已交付 `/projects/:id/workspace/bid-commercial` 与 `/projects/:id/workspace/pricing-margin`。三个详细工作区均已接入真实入口、store 读取、route guard、focused tests、lint/build 与 Playwright journey。 | Closed |
| `FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE` | `EX-26`、`EX-27`、`EX-28` 已分别提供技术与成本、招投标 / 商务竞标、报价与毛利评审的正式 project-scoped query view；`FE-10` / `FE-11` 已消费这些投影，不再从 `ContractReadinessDetail` 反推详细工作区事实。                                                               | Closed |

## 3. Supporting Runtime Commits

| Commit    | Scope                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a0e9de1` | `feat(project): 接入签约前项目三类工作区与事实源能力`，包含 `EX-26` / `EX-27` / `EX-28` / `FE-10` / `FE-11` 的事实源、页面、store、route 与 E2E。 |
| `2d0082d` | `test(governance): 增加 FE-12 跨工作区入口链的移动端 Journey 验证`，补齐跨工作区入口链、权限与移动视口验证。                                      |

## 4. Validation

| Check           | Result       | Evidence                                                                                |
| --------------- | ------------ | --------------------------------------------------------------------------------------- |
| Runtime tests   | Reused       | `FE-10` / `FE-11` / `FE-12` G3/G4 close-out 已记录对应 focused tests、lint/build、E2E。 |
| Runtime changes | Not required | 本次只关闭例外，不改运行时代码。                                                        |
| OpenAPI/client  | Not required | 本次不改 contract。                                                                     |
| Migration       | Not required | 本次不改 persistence。                                                                  |
| Markdown format | Pass         | `corepack pnpm run format:md:check`                                                     |
| Diff hygiene    | Pass         | `git diff --check`                                                                      |

## 5. Decision

- `FE09-E1-DETAIL-WORKSPACES-DEFERRED`: closed.
- `FE09-E3-READINESS-PARTIAL-STAGE-COVERAGE`: closed.
- `FE-09` tracker exception column can be cleared.
- Remaining risk: none introduced by this closure. Future L1 write-side or approval-side flows require separate executable slices.
