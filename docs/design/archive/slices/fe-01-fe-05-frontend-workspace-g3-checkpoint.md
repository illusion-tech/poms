# FE-01 ~ FE-05 Frontend Workspace Local G3 Checkpoint

Local Gate Checkpoint

- Slice: `FE-01 ~ FE-05`
- Tracker Row: `FE-01`、`FE-02`、`FE-03`、`FE-04`、`FE-05`
- Slice Type: `frontend-only`
- Gate: `G3 = Pass`
- Formal Inputs:
  - `docs/design/fe-01-project-workspace-shell-routing-baseline.md`
  - `docs/design/fe-02-l4-operating-overview-variance-baseline.md`
  - `docs/design/fe-03-l5-commission-gate-overview-baseline.md`
  - `docs/design/fe-04-frontend-workspace-data-access-baseline.md`
  - `docs/design/fe-05-frontend-workspace-e2e-permission-baseline.md`
- This change explicitly does not cover:
  - `EX-14` 的最终结算 / 规则解释正式页
  - 任何新的后端 public route surface
  - `L1` / `L3` 的完整前端工作区

Evidence:

- Scope:
  - 已落地项目级工作区壳层、`L4` 经营总览、`L4` 偏差风险、`L5` 阶段闸口解释页、共享读取 store、工作区 smoke + journey E2E 与 all-mode 权限校验；journey 补测同时修复了 `project-commission` 在子路由下读取 `projectId` 失败、导致“阶段解释”按钮不跳转的问题；后续又通过把 `AppLayout` / `AuthLayout` 收口为 route-level lazy component 关闭了 Angular initial bundle budget warning。
- Document -> code:
  - 已按 `FE-01 ~ FE-05` 基线把壳层、读取页、解释页、data-access 与验证链拆开，不再把设计大文档直接当作编码输入。
- ADR-015 inventory / route surface:
  - 前端只消费 `EX-13` 已实现的四条 project-scoped 读取 route；无新增 public route surface。
- Route -> command:
  - 本轮无新增 command；`commission/operations` 与 `commission/gate-overview` 已职责分离。
- Migration -> entity:
  - `N/A`，未触达 persistence。
- Entity -> contract / OpenAPI:
  - `N/A`，未改 shared contract / OpenAPI / generated client。
- Query / view:
  - `ProjectWorkspaceStore` 统一消费 `business-outcome-overview`、`unified-accounting`、`variance-risk-explanation` 与 `business-accounting-feedback`，并把 loading / empty / error 投影统一到 admin data-access 层。
- Guard / permission:
  - `permission.guard` 已补 `requiredPermissionsMode = 'all'` 单测；Playwright 已验证 admin / viewer / anonymous 三类入口、项目列表 / 项目详情真实进入链和拒绝链路。

Commands:

- `git diff --check`: ran and passed
  - 仅出现 Git CRLF 提示，无 whitespace error。
- Lint:
  - `corepack pnpm nx lint poms-admin`: ran and passed
  - `corepack pnpm nx lint admin-data-access`: ran and passed
- Build:
  - `corepack pnpm nx build poms-admin`: ran and passed
  - 当前 production build initial total `919.73 kB`，已低于 `1.00 MB` warning budget；`FE-BUNDLE-20260418` 已关闭。
- Unit / API tests:
  - `corepack pnpm nx test poms-admin --runInBand`: ran and passed
  - 覆盖 `permission.guard` 与 `ProjectWorkspaceStore`。
- E2E:
  - `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`: ran and passed
  - `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`: ran and passed
  - `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`: ran and passed
- OpenAPI / generated client:
  - not required
- Migration / schema check:
  - not required

Drift:

- Classification:
  - `tool-noise`
- Existing baseline drift:
  - none proven in this slice
- New drift introduced:
  - none after remediation; 原 `FE-BUNDLE-20260418` 已通过 route-level lazy loading 消除。

Exceptions:

- Exception ID: `FE-BUNDLE-20260418`
- Status: `Closed`
- Cleanup owner: `Codex`
- Cleanup due: `2026-04-18`
- Notes:
  - 通过把 `AppLayout` / `AuthLayout` 改为 route-level lazy component 关闭；当前 build 已无 bundle budget warning。

Decision:

- Can commit to main: yes
- Can mark tracker Done: yes
  - 2026-04-18 已以本地 commit `737bded` 形成交付载体；`FE-01 ~ FE-05` 可进入 `G4 = Pass` close-out。
