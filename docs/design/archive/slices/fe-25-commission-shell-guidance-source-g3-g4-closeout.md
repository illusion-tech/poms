# FE-25 提成工作区壳层 guidance 事实源纠偏 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `FE-19`
- Owner: `Codex`
- Slice Type: `query-behavior + frontend-only consumer`
- Date: `2026-04-25`
- Baseline: `docs/design/archive/slices/fe-25-commission-shell-guidance-source-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-25-commission-shell-guidance-source-g3-checkpoint.md`
- Runtime Commit: `9f85604 feat(commission): 收敛提成壳层到 workspace guidance 事实源`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `FE-25`

## 1. Delivered Scope

- 提成工作区壳层已从本地事实推导切换到后端 workspace guidance:
  - `ProjectCommissionShell` 不再注入 `AuthStore`。
  - 不再调用 `projectWorkspaceGuide` 生成当前阶段、下一步、当前缺口、责任归口或提成 nav。
  - 壳层复用 `ProjectWorkspaceStore.loadGuidance(projectId)` 与 `ProjectWorkspaceGuidanceView`。
- 后端 guidance 已补齐提成冻结入口:
  - `ProjectQueryService.buildWorkspaceEntries` 新增 `commission-freeze-binding` entry。
  - entry 由后端按项目阶段、关闭状态和 `project:read` + `commission:assignments:manage` 权限输出 `enabled` / `disabledReason`。
- 前端 nav 已收敛到 guidance 投影:
  - 提成壳层按 `commission-freeze-binding`、`commission-gate-overview`、`commission-final-settlement`、`commission-rule-explanation`、`commission-operations` 顺序投影 `recommendedEntries`。
  - route guard 不变，前端不重算权限。
- E2E 已按 guidance availability 更新:
  - 执行阶段的 `最终结算` 由后端禁用，journey 验证 disabled reason。
  - 同一 journey 继续通过真实 link 进入 `规则解释`。

## 2. Out Of Scope

- 未新增 public API route、DTO 字段、OpenAPI schema、generated client 或 DDL。
- 未新增 commission 专用 guidance query。
- 未修改提成计算、发放、调整、冻结绑定子页业务逻辑。
- 未改变现有路由 guard 或权限配置。
- 未处理 `FE20-E1-OPERATION-PAGE-SCOPE`、`FE18-E1-PARTIAL-PAGE-COVERAGE`、`FE17-E1-FEEDBACK-COMPONENT-SCOPE` 等其他历史例外。

## 3. Alignment

| Area                       | Result         | Notes                                                                                    |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| Document -> code           | `Pass`         | Delivered scope matches `FE-25` G1 baseline.                                             |
| Route inventory -> route   | `Pass`         | Reused `GET /projects/{projectId}/workspace-guidance`; no new route surface.             |
| Query -> view              | `Pass`         | Backend emits `commission-freeze-binding`; frontend only projects guidance entries.      |
| Guard / permission         | `Pass`         | Route guard unchanged; nav availability comes from backend `enabled` / `disabledReason`. |
| OpenAPI / generated client | `Not required` | No schema or route change.                                                               |
| Persistence                | `Not required` | No migration, entity, repository, or DDL change.                                         |

## 4. Validation

| Check              | Result           | Evidence                                                                                                                                                                                                               |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime commit     | `Pass`           | `9f85604 feat(commission): 收敛提成壳层到 workspace guidance 事实源`                                                                                                                                                   |
| Admin focused test | `Pass`           | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-shell.spec.ts` (`1 suite / 3 tests`)                                                                                               |
| API focused test   | `Pass`           | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts` (`1 suite / 23 tests`)                                                                                                   |
| Admin lint         | `Pass`           | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                     |
| API lint           | `Pass`           | `corepack pnpm nx lint poms-api`                                                                                                                                                                                       |
| Admin build        | `Pass`           | `corepack pnpm nx build poms-admin`; initial total `957.54 kB`; no new bundle warning                                                                                                                                  |
| Focused E2E        | `Pass`           | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` (`10 passed`) |
| E2E lint           | `Not configured` | `corepack pnpm nx lint poms-admin-e2e` reports `Cannot find configuration for task poms-admin-e2e:lint`                                                                                                                |
| Markdown format    | `Pass`           | `corepack pnpm run format:md:check`                                                                                                                                                                                    |
| Diff hygiene       | `Pass`           | `git diff --check`                                                                                                                                                                                                     |

## 5. Drift 与例外

- Drift classification: `existing-baseline-drift`
- Drift detail: 旧 E2E journey 假设执行阶段 `最终结算` 在提成壳层 nav 中总是可点击；FE-25 切到 backend guidance 后，该 entry 被后端按阶段禁用。
- Remediation: E2E 已改为验证 disabled reason，并继续点击可用的 `规则解释` entry。
- New drift introduced: `none`

| Exception ID                         | Previous Status | G4 Status | Closure Evidence                                                                                |
| ------------------------------------ | --------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `FE19-E1-COMMISSION-GUIDANCE-SOURCE` | Open            | Closed    | `ProjectCommissionShell` now consumes `ProjectWorkspaceGuidanceView`; runtime commit `9f85604`. |

## 6. G4 Conclusion

- `FE-25` delivered boundary matches the frozen baseline and G3 checkpoint.
- Runtime changes are committed in `9f85604`.
- `FE19-E1-COMMISSION-GUIDANCE-SOURCE` is closed.
- Tracker can mark `FE-25` as `Done / G4 04-25`.
