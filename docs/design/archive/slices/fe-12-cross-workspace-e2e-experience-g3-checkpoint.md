# FE-12 前端跨工作区入口链、权限、E2E 与体验收口 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: Phase 2 frontend workspace
- Owner: `Codex`
- Slice Type: `frontend-only / governance validation`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-12`
- Baseline: `docs/design/archive/slices/fe-12-cross-workspace-e2e-experience-baseline.md`

## 1. Delivered Scope

已交付：

1. 在 `apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` 增加 mobile viewport journey。
2. 新用例用项目详情“项目工作区”按钮进入项目工作区，不依赖 URL 直达。
3. 新用例覆盖移动视口下的签约前主线、技术与成本、提成阶段解释和 `L5 -> L4` 经营总览跳转。
4. 保留既有 desktop journey / smoke 的 admin、viewer、anonymous 入口链和权限矩阵。

明确未交付：

1. 不新增页面、不改 UI 组件、不改路由配置。
2. 不新增后端 API、OpenAPI、generated client、DDL 或 seeder 业务事实。
3. 不做像素级视觉回归或截图基线；本片只证明关键链路在移动视口可进入、可读、可返回。

## 2. Alignment

| Concern               | Conclusion                                                                                  | Result |
| --------------------- | ------------------------------------------------------------------------------------------- | ------ |
| Document -> code      | 实现只补 `FE-12` baseline 要求的 mobile workspace journey，不扩大为全站 E2E                 | Pass   |
| Entry chain           | mobile 用例从项目详情按钮进入工作区，再用工作区 entry / 页面 action link 串起关键页面       | Pass   |
| Permission matrix     | 既有 smoke / journey 继续覆盖 viewer 受限页拒绝、anonymous returnUrl、admin 真实入口链      | Pass   |
| Query -> view         | 断言继续使用真实页面文案、business gap 和 seeded facts，未引入测试专用假事实                | Pass   |
| Responsive / a11y     | 移动视口用 role / heading / link / button locator 验证关键链路，不依赖布局 class 作为主断言 | Pass   |
| Public API / contract | 未触及 public API route、OpenAPI、generated client 或 persistence                           | Pass   |

## 3. Validation Evidence

| Check                | Command                                                                                                                                                                                                                         | Result         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Admin lint           | `corepack pnpm nx lint poms-admin`                                                                                                                                                                                              | Pass           |
| E2E lint             | `corepack pnpm nx run poms-admin-e2e:eslint:lint`                                                                                                                                                                               | Pass           |
| Admin build          | `corepack pnpm nx build poms-admin`                                                                                                                                                                                             | Pass           |
| Workspace Playwright | `POMS_E2E_PORT_SEED=462 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts` | Pass, 10 tests |

待 G4 前补充：

1. `corepack pnpm run format:md:check`
2. `git diff --check`
3. 提交后确认运行提交包含 `EX-26` / `FE-10` G4 close-out、`FE-12` baseline、`FE-12` G3 checkpoint 和 E2E 用例变更。

## 4. Drift And Exceptions

| Item                         | Status         | Close-out                                                                                 |
| ---------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `FE12-E1-G4-DOCS-SAME-BATCH` | Pending for G4 | `EX-26` / `FE-10` G4 close-out、本 `FE-12` baseline 和 E2E 变更将同批提交后关闭。         |
| Mobile viewport coverage     | Closed for G3  | 已新增 390x844 mobile viewport journey，覆盖项目详情 -> 工作区 -> L1 / L5 / L4 关键链路。 |
| Contract / API impact        | N/A            | 本片未改 generated client、public API 或 DDL，无需 `shared-api-client:check`。            |

## 5. G3 Decision

- Can move to G4 after commit: `yes`
- Can mark tracker `Done` now: `no`，G4 需要运行提交证据。
- Next step:
  1. 运行 docs / diff hygiene checks。
  2. 提交本批治理与 E2E 变更。
  3. 提交后补 `FE-12` G4 close-out，把 tracker 从 `Review / G3` 改为 `Done / G4`。
