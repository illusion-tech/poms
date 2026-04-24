# EX-28 签约前报价与毛利评审事实源 G3/G4 Close-out

* Close-out Status: `Pass`
* Parent: `FE-11`
* Owner: `Codex`
* Slice Type: `cross-layer-high-risk`
* G4 Reviewer: `Codex`
* Close-out Date: `2026-04-25`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-28`
* Runtime Commit: `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力`

## 1. Delivered Scope

已交付：

1. `ProjectPricingMarginReview` 与 `ProjectPricingMarginConditionItem` 版本事实源。
2. `POST /projects/{projectId}/pricing-margin-reviews`、`GET /projects/{projectId}/pricing-margin-reviews`、`GET /projects/{projectId}/pricing-margin-workspace`。
3. shared contract、API DTO、OpenAPI、generated client、entity、migration、service、repository、query projection、controller wiring。
4. 项目工作区 guidance 输出 `pricing-margin-workspace` 真实入口，供 `FE-11` 消费。
5. 当前报价评审 query 显式返回技术成本版本引用、竞标 / 直接商务路径、税务条件、回款条件、毛利判断、审批摘要引用、商业放行基线引用和签约承接判断。

明确未交付：

1. 商业放行基线本体生成。
2. 审批引擎、合同差异重审链。
3. 前端读取页，已由 `FE-11` 交付。

## 2. Alignment

| Concern                   | Conclusion                                                                                  | Result |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| Route inventory -> route  | 三个 pricing-margin public routes 均与 authoritative inventory 对齐                         | Pass   |
| Migration -> entity       | 主表、条件项子表和显式 FK 名称与实际 DDL 对齐，`migration-check` 已在 G3 通过               | Pass   |
| Entity -> shared contract | `ProjectPricingMarginWorkspaceView` 等类型已进入 shared contract 与 generated client        | Pass   |
| Command -> service        | create 命令校验当前成本包、竞标路径、放行引用、金额、版本 supersede                         | Pass   |
| Query -> frontend         | `FE-11` 已真实消费 pricing-margin workspace，不从 readiness 或技术成本页反推报价 / 毛利结论 | Pass   |
| Guard / permission        | read 使用 `project:read`，create 使用 `project:write`                                       | Pass   |

## 3. Validation Evidence

`EX-28` 的 G3 checkpoint 已记录并通过：

1. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`
2. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`
3. `corepack pnpm nx lint poms-api`
4. `corepack pnpm nx build poms-api`
5. `corepack pnpm nx run shared-api-client:generate`
6. `corepack pnpm nx run shared-api-client:check`
7. `corepack pnpm nx run poms-api:migration-up`
8. `corepack pnpm nx run poms-api:migration-check`
9. `corepack pnpm nx lint admin-data-access`
10. `corepack pnpm nx lint poms-admin`
11. `corepack pnpm nx build poms-admin`
12. `corepack pnpm run format:md:check`
13. `git diff --check`

提交后复核：

1. `git log -1 --oneline --decorate` 确认运行提交为 `a0e9de1`。
2. `git status --short` 在 G4 文档变更前为空。

## 4. Drift And Exceptions

| Item                  | Status | Close-out                                                                             |
| --------------------- | ------ | ------------------------------------------------------------------------------------- |
| `EX28-D1-FK-NAME`     | Closed | FK 名称截断 drift 已按 `new-real-drift` 修复，entity / migration 显式对齐实际约束名。 |
| `FE11-E2` dependency  | Closed | `FE-11` 已完成 pricing-margin 读取页与 E2E 入口链验证。                               |
| Same-batch dependency | Closed | `EX-27`、`EX-28`、`FE-11` 已进入同一运行提交 `a0e9de1`。                              |

## 5. G4 Decision

* Can mark tracker `Done`: `yes`
* Can downstream depend on this slice: `yes`
* Next dependency status: `FE-11` 已完成报价 / 毛利前端消费，`FE-12` 可纳入跨工作区入口链和权限回归。
