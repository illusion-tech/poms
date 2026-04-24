# EX-31 Lead 最小事实源、读写 API 与 generated client G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- Date: `2026-04-25`
- Commit: `c415a4c feat(lead): 建立 lead 最小事实源并上线读写接口`
- Baseline: `docs/design/archive/slices/ex-31-lead-minimal-fact-source-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-31-lead-minimal-fact-source-g3-checkpoint.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-31`

## 1. Closure Evidence

- Runtime implementation has been committed in `c415a4c`.
- The committed boundary matches `EX-31`:
  - `Lead` persistence, entity, repository, service, query service, controller.
  - `Lead` shared contracts and API DTOs.
  - OpenAPI and generated `LeadApi`.
  - `admin-data-access` Lead API / type exports.
  - focused backend tests for service, query and controller behavior.
- `EX-31` remains intentionally read/write-only for `Lead` and does not create `Project`.

## 2. Validation Evidence

| Check                      | Result | Evidence                                                                                     |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Focused Lead tests         | `Pass` | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`，`3 passed / 14 passed` |
| API unit tests full suite  | `Pass` | `corepack pnpm nx test poms-api --runInBand`，`39 passed / 480 passed`                       |
| API lint                   | `Pass` | `corepack pnpm nx lint poms-api`                                                             |
| API build                  | `Pass` | `corepack pnpm nx build poms-api`                                                            |
| OpenAPI generation         | `Pass` | `corepack pnpm nx run poms-api:openapi`                                                      |
| Shared API client generate | `Pass` | `corepack pnpm nx run shared-api-client:generate`                                            |
| Shared API client check    | `Pass` | `corepack pnpm nx run shared-api-client:check`                                               |
| Admin data-access lint     | `Pass` | `corepack pnpm nx lint admin-data-access`                                                    |
| Admin build                | `Pass` | `corepack pnpm nx build poms-admin`                                                          |
| Migration up               | `Pass` | `corepack pnpm nx run poms-api:migration-up`                                                 |
| Migration check            | `Pass` | `corepack pnpm nx run poms-api:migration-check`                                              |
| Markdown format            | `Pass` | `corepack pnpm run format:md:check`                                                          |
| Diff hygiene               | `Pass` | `git diff --check`                                                                           |

## 3. Drift / Exception Decision

| Item                       | Decision | Notes                                                                     |
| -------------------------- | -------- | ------------------------------------------------------------------------- |
| `EX31-E1-NO-CONVERT`       | `closed` | `EX-31` delivered the intended non-convert scope; convert is now `EX-32`. |
| `EX17-E2-LEAD-BOOTSTRAP`   | `open`   | Parent bootstrap exception remains until `EX-32` and `FE-27~29` close.    |
| `POST /projects` drift     | `open`   | Still intentionally unchanged; `EX-32` owns runtime closure.              |
| OpenAPI / generated client | `closed` | Expected generated surface has been committed.                            |

## 4. G4 Conclusion

- `EX-31` is `Done`.
- Downstream slices can now rely on:
  - `poms.lead`
  - `LeadStatus`
  - `LeadSummary`
  - `LeadListView`
  - `LeadDetailView`
  - `LeadApi`
  - `lead:read` / `lead:write`
- Next implementation slice is `EX-32`: `Lead -> Project` 转化命令与直接创建 Project 收口。
