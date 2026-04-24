# FE-12 前端跨工作区入口链、权限、E2E 与体验收口 G3/G4 Close-out

- Close-out Status: `Pass`
- Parent: Phase 2 frontend workspace
- Owner: `Codex`
- Slice Type: `frontend-only / governance validation`
- G4 Reviewer: `Codex`
- Close-out Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-12`
- Runtime Commit: `2d0082d test(governance): 增加 FE-12 跨工作区入口链的移动端 Journey 验证`

## 1. Delivered Scope

已交付：

1. `FE-12` G1 baseline 与 G3 checkpoint 已归档。
2. `project-workspace.journey.spec.ts` 新增 390x844 mobile viewport journey。
3. mobile journey 从项目详情“项目工作区”按钮进入项目工作区，再用真实 entry / action link 串起：
   - 签约前主线
   - 技术与成本
   - 提成阶段解释
   - `L5 -> L4` 经营总览
4. 既有 smoke / journey 继续覆盖 desktop admin 真实入口链、viewer 受限访问和 anonymous returnUrl。
5. 同批提交已包含 `EX-26` / `FE-10` G4 close-out 文档，`FE-12` 不再依赖未提交的上游治理记录。

明确未交付：

1. 未新增页面、UI 组件、路由配置或权限模型。
2. 未新增后端 API、OpenAPI、generated client、DDL 或 seeder 业务事实。
3. 未建立像素级截图回归；本片只关闭跨工作区入口链、权限和移动视口 smoke 的治理验证缺口。

## 2. Alignment

| Concern               | Conclusion                                                                                         | Result |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| Document -> code      | 实现边界与 `FE-12` baseline 一致，只补跨工作区 E2E / mobile smoke，不扩大为全站测试                | Pass   |
| Entry chain           | 运行提交包含项目详情按钮 -> 工作区 -> L1 / L5 / L4 的真实点击链                                    | Pass   |
| Permission matrix     | 既有 smoke / journey 保留 viewer 拒绝、anonymous returnUrl、admin 全链路验证                       | Pass   |
| Query -> view         | 断言来自真实页面文案、business gap 和 seeded facts，未使用测试专用假事实                           | Pass   |
| Responsive / a11y     | mobile journey 使用 role / heading / link / button locator，证明关键入口在窄屏可进入、可读、可返回 | Pass   |
| Public API / contract | 未触及 public API route、OpenAPI、generated client 或 persistence                                  | Pass   |

## 3. Validation Evidence

`FE-12` 的 G3 checkpoint 已记录并通过：

1. `corepack pnpm nx lint poms-admin`
2. `corepack pnpm nx run poms-admin-e2e:eslint:lint`
3. `corepack pnpm nx build poms-admin`
4. `POMS_E2E_PORT_SEED=462 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts apps/poms-admin-e2e/src/project-workspace.journey.spec.ts`，10 tests passed
5. `corepack pnpm run format:md:check`
6. `git diff --check`

提交后复核：

1. `git show --name-only --oneline --no-renames 2d0082d` 确认运行提交包含 `FE-12` baseline、G3 checkpoint、E2E 用例变更以及 `EX-26` / `FE-10` G4 close-out 文档。
2. `git status --short` 在本 G4 文档变更前为空。

## 4. Drift And Exceptions

| Item                         | Status | Close-out                                                                                            |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `FE12-E1-G4-DOCS-SAME-BATCH` | Closed | `EX-26` / `FE-10` G4 close-out、`FE-12` baseline、G3 checkpoint 和 E2E 变更已在 `2d0082d` 同批提交。 |
| Mobile viewport coverage     | Closed | 390x844 mobile viewport journey 已落地并通过 Playwright。                                            |
| Contract / API impact        | N/A    | 本片未改 generated client、public API 或 DDL，无需 `shared-api-client:check`。                       |

## 5. G4 Decision

- Can mark tracker `Done`: `yes`
- Can downstream depend on this slice: `yes`
- Downstream boundary:
  1. 可依赖项目工作区和提成工作区已有 desktop + mobile 关键入口链 E2E 证据。
  2. 可依赖 viewer / anonymous 的权限拒绝与 returnUrl 证据仍由既有 smoke / journey 保持。
  3. 不得把本片视为像素级视觉回归、全站 E2E 或新业务能力交付。
