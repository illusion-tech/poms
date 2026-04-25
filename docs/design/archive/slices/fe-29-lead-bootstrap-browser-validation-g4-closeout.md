# FE-29 EX17-E2 浏览器验证与 G4 收口 G4 Close-out

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-e2e / validation`
- G4 Date: `2026-04-25`
- Runtime Commit: `ff81c11 feat(lead): 完善线索转项目前端闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-29`

## 1. Delivered Boundary

- 新增 `apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts`。
- 浏览器验证 admin 从菜单进入“线索管理”。
- 浏览器验证 admin 从项目列表点击“从线索创建项目”进入线索链路。
- 浏览器验证 UI 登记线索、确认有效、转入项目、跳转项目详情。
- 浏览器验证项目详情展示来源线索摘要和“已转项目”状态。
- 浏览器验证 viewer 无法看到线索菜单，直接访问 `/leads` 被拒绝。
- 浏览器验证 anonymous 直接访问 `/leads` 保留 returnUrl，并在登录后回到 `/leads`。

## 2. Validation Evidence

| Check               | Evidence                                                                                                                                                             | Result             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Runtime commit      | `ff81c11`                                                                                                                                                            | Pass               |
| E2E lint            | `corepack pnpm nx run poms-admin-e2e:eslint:lint`                                                                                                                    | Pass               |
| Seeder refresh      | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                           | Pass               |
| Focused browser E2E | `POMS_E2E_PORT_SEED=530 corepack pnpm exec playwright test apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass, `3 tests`    |
| Markdown hygiene    | `corepack pnpm run format:md:check`                                                                                                                                  | Pass after G4 docs |
| Diff hygiene        | `git diff --check`                                                                                                                                                   | Pass after G4 docs |

## 3. Exceptions

| ID                                    | G4 Decision                        | Notes                                                                                                              |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `FE29-D1-SEED-PREREQUISITE`           | Closed                             | First focused attempt failed before seeder refresh; retry after seeder passed.                                     |
| `FE29-E1-BROWSER-SCOPE-FOCUSED`       | Accepted and closed for this slice | Focused Lead bootstrap browser suite is sufficient because other workspace E2E remains covered by existing suites. |
| `FE28-E2-BROWSER-JOURNEY-DEFERRED`    | Closed                             | This slice provides the deferred browser journey evidence.                                                         |
| `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE` | Closed for frontend UX             | Backend route remains as legacy/dev/test compatibility; formal user journey no longer depends on it.               |
| `EX17-E2-LEAD-BOOTSTRAP`              | Closed                             | Browser evidence proves formal frontend path now uses Lead -> Project.                                             |

## 4. G4 Decision

- `FE-29` delivered boundary matches its G1 baseline.
- `EX17-E2-LEAD-BOOTSTRAP` can be closed from the frontend perspective.
- `FE-29` may be marked `Done`.
