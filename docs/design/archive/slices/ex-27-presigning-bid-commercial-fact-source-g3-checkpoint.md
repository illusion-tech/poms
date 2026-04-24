# EX-27 签约前招投标 / 商务竞标事实源 G3 检查点

* Gate Status: `Review`
* Parent: Phase 2 frontend workspace / `L1`
* Owner: `Codex`
* Slice Type: `api / command + persistence + query projection`
* G3 Reviewer: `Codex`
* G3 Date: `2026-04-24`
* Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-27`
* Baseline Package: `docs/design/archive/slices/ex-27-presigning-bid-commercial-fact-source-baseline.md`

## 1. Delivered Scope

已完成：

1. 新增 `ProjectBidCommercialProcess` 及 material / timeline 子表，支持 current version、supersedes chain 和显式 direct-commercial / not-required 路径。
2. 新增 shared contract / API DTO：
   * `CreateProjectBidCommercialProcessRequest`
   * `ProjectBidCommercialProcessSummary`
   * `ProjectBidCommercialMaterialItemView`
   * `ProjectBidCommercialTimelineItemView`
   * `ProjectBidCommercialWorkspaceView`
3. 新增 public routes：
   * `POST /projects/{projectId}/bid-commercial-processes`
   * `GET /projects/{projectId}/bid-commercial-processes`
   * `GET /projects/{projectId}/bid-commercial-workspace`
4. 新增 service / repository / query projection / controller wiring。
5. 项目工作区 guidance 增加 `bid-commercial-workspace` recommended entry。
6. 同步 OpenAPI 与 generated shared API client。

未纳入：

1. `FE-11` 前端页面。
2. 报价 / 毛利评审事实源，该部分仍归属 `EX-28`。
3. 投标文件库、附件上传、外部招标平台同步。
4. 项目详情 `currentBidSummary` 纠偏；本片先交付项目级 workspace 投影。

## 2. Route Governance

| Capability                          | Canonical Route                                       | Implemented Route                                     | Inventory Status |
| ----------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| `createProjectBidCommercialProcess` | `POST /projects/{projectId}/bid-commercial-processes` | `POST /projects/{projectId}/bid-commercial-processes` | `aligned`        |
| `listProjectBidCommercialProcesses` | `GET /projects/{projectId}/bid-commercial-processes`  | `GET /projects/{projectId}/bid-commercial-processes`  | `aligned`        |
| `getProjectBidCommercialWorkspace`  | `GET /projects/{projectId}/bid-commercial-workspace`  | `GET /projects/{projectId}/bid-commercial-workspace`  | `aligned`        |

Inventory row: `docs/design/api-route-canonical-inventory.md` / B3 project rows.

## 3. Validation Evidence

| Check                      | Command / Evidence                                                                                   | Result |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                     | pass   |
| API build                  | `corepack pnpm nx build poms-api`                                                                    | pass   |
| Service unit test          | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`              | pass   |
| Query unit test            | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`        | pass   |
| Admin data-access lint     | `corepack pnpm nx lint admin-data-access`                                                            | pass   |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                  | pass   |
| OpenAPI / generated client | `corepack pnpm nx run shared-api-client:generate` and `corepack pnpm nx run shared-api-client:check` | pass   |
| Migration apply            | `corepack pnpm nx run poms-api:migration-up`                                                         | pass   |
| Migration check            | `corepack pnpm nx run poms-api:migration-check`                                                      | pass   |
| Diff whitespace            | `git diff --check`                                                                                   | pass   |
| Markdown formatting        | `corepack pnpm run format:md:check`                                                                  | pass   |

Known validation notes:

* OpenAPI generator still reports existing `propertyNames` warnings for older schemas; this was pre-existing generator noise and did not block `shared-api-client:check`.
* `migration-check` initially reported pending changes before local `migration-up`; after applying `Migration20260424190000_ex27_project_bid_commercial_process`, check passed with no schema drift.

## 4. Drift Assessment

| Area                      | Result     | Notes                                                                 |
| ------------------------- | ---------- | --------------------------------------------------------------------- |
| Route inventory -> code   | aligned    | Implemented routes match canonical rows.                              |
| DTO / shared contract     | aligned    | DTO wrappers are schema-first from shared contracts.                  |
| Migration -> entity       | aligned    | `migration-check` passes after applying the new migration.            |
| Query -> view             | aligned    | Empty workspace returns business gap rather than 404.                 |
| Guard / permission        | aligned    | Read uses `project:read`; create uses `project:write`.                |
| Frontend FE-11 dependency | still open | FE-11 remains blocked until `EX-28` pricing-margin fact source lands. |

No unresolved drift remains for `EX-27`.

## 5. G3 Decision

* Gate Status: `Review`
* Can move to G4: `no`, because current batch is intentionally being held for combined user commit.
* Can downstream depend on this slice after commit: `yes`, for bid-commercial backend fact source and generated client.
* Tracker action:
  1. Move `EX-27` from `Doing / G1 04-24` to `Review / G3 04-24`.
  2. Keep `FE-11` as `Blocked` until `EX-28` is completed.
