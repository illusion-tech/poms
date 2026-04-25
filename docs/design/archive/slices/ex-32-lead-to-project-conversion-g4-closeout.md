# EX-32 Lead -> Project 转化命令与直接创建 Project 收口 G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- Date: `2026-04-25`
- Commit: `e705355 feat(lead): 增加 lead 转项目命令并建立来源映射`
- Baseline: `docs/design/archive/slices/ex-32-lead-to-project-conversion-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-32-lead-to-project-conversion-g3-checkpoint.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-32`

## 1. Closure Evidence

- Runtime implementation has been committed in `e705355`.
- The committed boundary matches `EX-32`:
  - `project.source_lead_id` persistence, FK, index and entity mapping.
  - `POST /leads/{id}:convertToProject` command route.
  - `qualified -> converted` Lead state transition and one-time conversion guard.
  - Project creation from Lead customer, owner org and owner user.
  - Lead / Project bidirectional read summaries.
  - shared contracts, API DTO, OpenAPI, generated client and `admin-data-access` exports.
  - focused backend, generated-client, admin fixture and API E2E validation.
- Authoritative route inventory records `convertLeadToProject` as `aligned`.
- `POST /projects` remains intentionally available as legacy/dev/test bootstrap until `FE-29`.

## 2. Validation Evidence

| Check                  | Result                           | Evidence                                                                                                                                         |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused Lead tests     | `Pass`                           | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`，`3 suites / 19 tests`                                                      |
| Focused Project tests  | `Pass`                           | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts project.service.spec.ts project.controller.spec.ts` |
| Full API tests         | `Pass`                           | `corepack pnpm nx test poms-api --runInBand`，`39 suites / 485 tests`                                                                            |
| API lint               | `Pass`                           | `corepack pnpm nx lint poms-api`                                                                                                                 |
| API build              | `Pass`                           | `corepack pnpm nx build poms-api`                                                                                                                |
| OpenAPI generation     | `Pass`                           | `corepack pnpm nx run poms-api:openapi`                                                                                                          |
| Shared API client      | `Pass`                           | `corepack pnpm nx run shared-api-client:generate` + `corepack pnpm nx run shared-api-client:check`                                               |
| Migration up           | `Pass`                           | `corepack pnpm nx run poms-api:migration-up`                                                                                                     |
| Migration check        | `Pass`                           | `corepack pnpm nx run poms-api:migration-check`                                                                                                  |
| Focused API E2E        | `Pass`                           | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=lead-workflow`                                                                             |
| Full API E2E           | `Fail / existing-baseline-drift` | `corepack pnpm nx e2e poms-api-e2e` failed in existing contract activation workflows, outside EX-32 touched surface.                             |
| Focused API E2E lint   | `Pass`                           | `corepack pnpm exec eslint apps/poms-api-e2e/src/poms-api/lead-workflow.e2e-spec.ts apps/poms-api-e2e/src/support/lead-api.ts`                   |
| Full API E2E lint      | `Fail / existing-baseline-drift` | `corepack pnpm nx run poms-api-e2e:eslint:lint` hit existing e2e module-boundary / legacy warnings.                                              |
| Admin data-access lint | `Pass`                           | `corepack pnpm nx lint admin-data-access`                                                                                                        |
| Admin lint             | `Pass`                           | `corepack pnpm nx lint poms-admin`                                                                                                               |
| Admin focused test     | `Pass`                           | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-store.spec.ts`                                                          |
| Admin build            | `Pass`                           | `corepack pnpm nx build poms-admin`                                                                                                              |
| Markdown format        | `Pass`                           | `corepack pnpm run format:md:check`                                                                                                              |
| Diff hygiene           | `Pass`                           | `git diff --check`                                                                                                                               |

## 3. Drift / Exception Decision

| Item                                        | Decision                  | Notes                                                                                                 |
| ------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS`  | `existing-baseline-drift` | Not caused by EX-32; focused Lead workflow E2E passed.                                                |
| `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE` | `existing-baseline-drift` | Not caused by EX-32; focused EX-32 E2E lint passed.                                                   |
| `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE`       | `open accepted exception` | Runtime route remains for existing seed/dev/test compatibility; formal frontend path must move away.  |
| `EX17-E2-LEAD-BOOTSTRAP`                    | `open accepted exception` | Parent exception remains until `FE-27~29` prove the browser path and remove direct Project create UX. |
| OpenAPI / generated client expected changes | `closed`                  | New convert request, generated method and source Lead summary models are committed.                   |
| Persistence / migration / entity alignment  | `closed`                  | `project.source_lead_id` migration, FK, index, entity mapping and read projection are aligned.        |

## 4. G4 Conclusion

- `EX-32` is `Done`.
- Downstream frontend slices can now rely on:
  - `POST /leads/{id}:convertToProject`
  - `ConvertLeadToProjectRequest`
  - `ProjectSummary.sourceLeadId`
  - `ProjectDetailView.sourceLeadSummary`
  - `LeadDetailView.convertedProjectSummary`
- `EX17-E2-LEAD-BOOTSTRAP` remains open because browser entry, menu flow and direct Project create UX closure belong to `FE-27 ~ FE-29`.
- Next implementation slice is `FE-27`: 线索登记与线索列表前端入口。
