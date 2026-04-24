# EX-27 签约前招投标 / 商务竞标事实源 G3/G4 Close-out

* Close-out Status: `Pass`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `api / command + persistence + query projection`
* G4 Reviewer: `Codex`
* Close-out Date: `2026-04-25`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-27`
* Runtime Commit: `a0e9de1 feat(project): 接入签约前项目三类工作区与事实源能力`

## 1. Delivered Scope

已交付：

1. `ProjectBidCommercialProcess` 及 material / timeline 子表。
2. `POST /projects/{projectId}/bid-commercial-processes`、`GET /projects/{projectId}/bid-commercial-processes`、`GET /projects/{projectId}/bid-commercial-workspace`。
3. shared contract、API DTO、OpenAPI、generated client、entity、migration、service、repository、query projection、controller wiring。
4. 项目工作区 guidance 输出 `bid-commercial-workspace` 真实入口，供 `FE-11` 消费。

明确未交付：

1. 报价与毛利评审事实源，已由 `EX-28` 交付。
2. 前端读取页，已由 `FE-11` 交付。
3. 投标附件库、外部招标平台同步、复杂竞标协同流程。

## 2. Alignment

| Concern                         | Conclusion                                                                           | Result |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| Route inventory -> route        | 三个 bid-commercial public routes 均与 authoritative inventory 对齐                  | Pass   |
| Migration -> entity             | bid process、material、timeline 表与 entity 对齐，`migration-check` 已在 G3 通过     | Pass   |
| Entity -> shared contract       | `ProjectBidCommercialWorkspaceView` 等类型已进入 shared contract 与 generated client | Pass   |
| Query -> frontend               | `FE-11` 已真实消费 bid-commercial workspace，不再依赖项目详情 `not_configured` 占位  | Pass   |
| Guard / permission              | read 使用 `project:read`，create 使用 `project:write`                                | Pass   |
| Downstream same-batch exception | `FE11-E3-SAME-BATCH-UPSTREAM-G3` 随本批提交关闭                                      | Pass   |

## 3. Validation Evidence

`EX-27` 的 G3 checkpoint 已记录并通过：

1. `corepack pnpm nx lint poms-api`
2. `corepack pnpm nx build poms-api`
3. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`
4. `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`
5. `corepack pnpm nx lint admin-data-access`
6. `corepack pnpm nx build poms-admin`
7. `corepack pnpm nx run shared-api-client:generate`
8. `corepack pnpm nx run shared-api-client:check`
9. `corepack pnpm nx run poms-api:migration-up`
10. `corepack pnpm nx run poms-api:migration-check`
11. `git diff --check`
12. `corepack pnpm run format:md:check`

提交后复核：

1. `git log -1 --oneline --decorate` 确认运行提交为 `a0e9de1`。
2. `git status --short` 在 G4 文档变更前为空。

## 4. Drift And Exceptions

| Item                | Status | Close-out                                                                |
| ------------------- | ------ | ------------------------------------------------------------------------ |
| `EX27-E1`           | Closed | direct-commercial / not-required 路径已作为显式事实进入 workspace view。 |
| `EX27-E2`           | Closed | 项目详情摘要 defer 不阻断本片；`FE-11` 已消费正式项目级 workspace 投影。 |
| Frontend dependency | Closed | `FE-11` 已完成 bid-commercial 读取页与 E2E 入口链验证。                  |

## 5. G4 Decision

* Can mark tracker `Done`: `yes`
* Can downstream depend on this slice: `yes`
* Next dependency status: `FE-11` 已完成本片前端消费，`FE-12` 可把 bid-commercial route 纳入跨工作区 E2E baseline。
