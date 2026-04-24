# FE-25 提成工作区壳层 guidance 事实源纠偏 Local G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `FE-19`
- Owner: `Codex`
- Slice Type: `query-behavior + frontend-only consumer`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-25`
- Baseline: `docs/design/archive/slices/fe-25-commission-shell-guidance-source-baseline.md`

## 1. 范围

- 本次完成:
  1. `ProjectCommissionShell` 不再注入 `AuthStore`，不再调用前端本地 `projectWorkspaceGuide` 推导提成壳层摘要或 nav。
  2. 提成壳层复用 `ProjectWorkspaceStore.loadGuidance(projectId)` 与 `ProjectWorkspaceGuidanceView` 渲染当前阶段、下一步、当前缺口、责任归口和提成 nav。
  3. `ProjectQueryService.buildWorkspaceEntries` 补齐 `commission-freeze-binding` guidance entry，并按阶段与权限输出 `enabled` / `disabledReason`。
  4. E2E journey 按后端 guidance 的 entry availability 更新：执行阶段不把最终结算作为可点击 link，而是验证 disabled reason 后继续走可用的规则解释入口。
- 本次明确不做:
  1. 不新增 public API route、DTO 字段、OpenAPI schema、generated client 或 DDL。
  2. 不新增 commission 专用 guidance query。
  3. 不修改提成计算、发放、调整、冻结绑定子页业务逻辑。
  4. 不关闭 `FE-19` 历史 close-out 文档中的例外；该动作留到 `FE-25 G4`。

## 2. 正式输入

| Input Type        | Document / Source                                                         | Section / Anchor                     | Status | Notes                                      |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------ | ------ | ------------------------------------------ |
| Frontend baseline | `fe-25-commission-shell-guidance-source-baseline.md`                      | 全文                                 | Pass   | 本片 `G1` 输入冻结。                       |
| Open exception    | `fe-19-project-management-component-adoption-g3-g4-closeout.md`           | `FE19-E1-COMMISSION-GUIDANCE-SOURCE` | Open   | 本片专门修正该例外。                       |
| Query baseline    | `ex-19-project-workspace-guidance-baseline.md`                            | `ProjectWorkspaceGuidanceView`       | Done   | 复用既有 workspace guidance route/contract |
| Runtime query     | `apps/poms-api/src/app/features/project/project-query.service.ts`         | `buildWorkspaceEntries`              | Fact   | 新增 freeze binding entry                  |
| Runtime frontend  | `apps/poms-admin/src/app/features/commission/project-commission-shell.ts` | guidance consumption                 | Fact   | 提成壳层改为 guidance 驱动                 |

## 3. 一致性结论

| Concern                    | Conclusion                                                                  | Result       |
| -------------------------- | --------------------------------------------------------------------------- | ------------ |
| Document -> code           | 实现范围与 `FE-25` G1 一致，专注关闭提成壳层 guidance 事实源例外。          | Pass         |
| ADR-015 inventory -> route | 复用 `GET /projects/{projectId}/workspace-guidance`，无新增 route surface。 | Pass         |
| Query -> view              | 后端输出 `commission-freeze-binding`；前端只投影 guidance entries。         | Pass         |
| DTO / contract             | 未新增或变更 `ProjectWorkspaceGuidanceView` 字段。                          | Pass         |
| Guard / permission         | Route guard 不变；nav 可用性来自 backend `enabled` / `disabledReason`。     | Pass         |
| OpenAPI / generated client | Contract 未变，未运行 generate/check。                                      | Not required |
| Persistence                | 未改 DDL、migration、entity 或 repository。                                 | Not required |

## 4. 测试与校验

| Check              | Required         | Command / Evidence                                                                                                                                                                                       | Result         | Gap / Reason                                    |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------- |
| Admin focused test | Yes              | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-shell.spec.ts`                                                                                                       | Pass           | `1 suite / 3 tests`                             |
| API focused test   | Yes              | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`                                                                                                            | Pass           | `1 suite / 23 tests`                            |
| Admin lint         | Yes              | `corepack pnpm nx lint poms-admin`                                                                                                                                                                       | Pass           |                                                 |
| API lint           | Yes              | `corepack pnpm nx lint poms-api`                                                                                                                                                                         | Pass           |                                                 |
| Admin build        | Yes              | `corepack pnpm nx build poms-admin`                                                                                                                                                                      | Pass           | initial total `957.54 kB`，无新 bundle warning  |
| Focused E2E        | Yes              | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` | Pass           | `10 passed`                                     |
| E2E lint           | If target exists | `corepack pnpm nx lint poms-admin-e2e`                                                                                                                                                                   | Not configured | Nx reports `Cannot find configuration for task` |
| OpenAPI check      | No               | N/A                                                                                                                                                                                                      | Not required   | No schema / route change                        |
| API client check   | No               | N/A                                                                                                                                                                                                      | Not required   | No generated client change                      |
| Migration check    | No               | N/A                                                                                                                                                                                                      | Not required   | No persistence change                           |
| Diff hygiene       | Yes              | `git diff --check`                                                                                                                                                                                       | Pass           |                                                 |
| Markdown format    | Yes              | `corepack pnpm run format:md:check`                                                                                                                                                                      | Pass           | Docs touched                                    |

## 5. Drift 与例外

- Drift classification: `existing-baseline-drift`
- Drift detail: 旧 E2E journey 假设执行阶段 `最终结算` 在提成壳层 nav 中总是可点击；FE-25 改为 backend guidance 后，该 entry 由后端按阶段禁用。
- Remediation: E2E 已更新为验证 disabled reason，并继续点击同一壳层中可用的 `规则解释` entry。
- New drift introduced: `none`

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes            |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 本片不新增例外。 |

## 6. 决策

- Can commit to main: `yes`.
- Can mark tracker `Done`: `no`, 需要用户提交后进入 `G4`。
- Can close `FE19-E1-COMMISSION-GUIDANCE-SOURCE`: `yes`, at `FE-25 G4` after commit evidence exists.
