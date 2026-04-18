# FE-06 Final Settlement / Rule Explanation Local G3 Checkpoint

Local Gate Checkpoint

- Slice: `FE-06`
- Tracker Row: `FE-06`
- Slice Type: `frontend-only`
- Gate: `G3 = Block`
- Formal Inputs:
  - `docs/design/fe-06-final-settlement-rule-explanation-frontend-baseline.md`
  - `docs/design/ex-14b1-final-settlement-and-rule-explanation-query-baseline.md`
  - `docs/design/phase2-commission-retention-final-settlement.md`
  - `docs/design/phase2-commission-rule-explanation-language.md`
- This change explicitly does not cover:
- 任何新的后端 public route surface、OpenAPI 或 generated client
- retention / departure exception 写侧动作
- `poms-api` departure-exception command 的历史 drift 修复本身

Evidence:

- Scope:
  - 已落地 `/projects/:id/commission/final-settlement` 与 `/projects/:id/commission/rule-explanation` 两个读取页，补齐 `ProjectWorkspaceStore` 对 `CommissionFinalSettlementView` / `CommissionRuleExplanationView` 的读取、错误态与空态投影；同时把项目工作区首页、项目工作区壳层、提成工作区壳层与对应 Playwright 入口链更新到新页面。
- Document -> code:
  - 已按 `FE-06` 基线把最终结算与规则解释落实为独立读取页，不再停留在工作区首页占位文案或临时跳转。
- ADR-015 inventory / route surface:
  - 前端只消费 `EX-14B1` 已实现的两条 project-scoped query route；无新增 public route surface。
- Route -> command:
  - 本轮无新增 command；`final-settlement` / `rule-explanation` 继续保持只读解释职责。
- Migration -> entity:
  - `N/A`，未触达 persistence。
- Entity -> contract / OpenAPI:
  - `N/A`，未改 shared contract / OpenAPI / generated client。
- Query / view:
  - `ProjectWorkspaceStore` 现统一消费 `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView`，并在 admin data-access 层集中处理 loading / 404 / 403 / fallback message。
- Guard / permission:
  - 新页路由、项目工作区入口和提成工作区 tab 均按已冻结的 `project:read + commission:payouts:manage` 显式控制；viewer 的直接路由拒绝已补入 Playwright 断言。

Commands:

- `git diff --check`: ran and passed
- Lint:
  - `corepack pnpm nx lint poms-admin`: ran and passed
  - `corepack pnpm nx lint admin-data-access`: ran and passed
- Build:
  - `corepack pnpm nx build poms-admin`: ran and passed
  - 当前 production build initial total `922.02 kB`，无新的 bundle warning。
- Unit / API tests:
  - `corepack pnpm nx test poms-admin --runInBand`: ran and passed
  - 覆盖 `ProjectWorkspaceStore` 对 `CommissionFinalSettlementView` / `CommissionRuleExplanationView` 的读侧分支。
- E2E:
  - `corepack pnpm nx run poms-api:seeder-run`: ran and passed
  - `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`: ran and failed
  - 当时阻断原因不是 FE-06 页面代码，而是 Playwright `webServer` 启动 `poms-api` 时失败；后续已由 `EX-14B3B` 补齐 `CommissionService.createDepartureExceptionDecision`、controller / route / contract 链并恢复 `corepack pnpm nx build poms-api` 通过，但 FE-06 侧尚未在该修复后重跑 Playwright。
- OpenAPI / generated client:
  - not required
- Migration / schema check:
  - not required

Drift:

- Classification:
  - `existing-baseline-drift`
- Existing baseline drift:
  - 原 `poms-api` departure-exception controller / service 不一致 drift 已由 `EX-14B3B` 修复；当前 `FE-06` 仍保持 `G3 = Block`，仅因为修复后的浏览器级验证尚未重跑确认。
- New drift introduced:
  - none proven in `FE-06` scope；`poms-admin` 与 `admin-data-access` lint、`poms-admin` unit test、`poms-admin` production build 全部通过。

Exceptions:

- Exception ID: `FE-06-E2E-BLOCKED-BY-POMS-API`
- Status: `Open`
- Cleanup owner: `Codex`
- Cleanup due: `FE-06` 进入 `G4` 前
- Notes:
  - `poms-api` build drift 已解除；下一步是重跑两条 workspace Playwright 用例，之后才能决定 `FE-06` 是否进入 `G3 = Pass` / `G4 = Pass`。

Decision:

- Can commit to main: no
- Can mark tracker Done: no
  - 当前 `FE-06` 应维持 `Doing`；待 `poms-api` build drift 解除并重跑 Playwright 成功后，再回写 `Done`。
