# FE-34 招投标 / 商务竞标写入体验产品化实施基线包

- Gate Status: `G1 = Frozen`
- Task ID: `FE-34`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Baseline Date: `2026-04-27`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-34`

## 1. Problem Statement

`FE-11` 已交付签约前招投标 / 商务竞标与报价 / 毛利评审两个读取型工作区，`FE-30` 已在读侧展示 `tenderNo` 与 `bidPackageNo`。当前缺口是用户仍不能在前端维护招投标过程、商务竞标关键状态、招标编号、标段 / 包件编号以及报价 / 毛利评审结论。

本片将该缺口从 `FE30-E1-BID-WRITE-ENTRY-DEFERRED` 转为正式前端实现范围。实现必须基于现有 generated client 和后端版本化写入语义，不新增后端 API，不把前端“编辑”误实现为未存在的 PATCH / PUT。

## 2. Scope

本片交付:

1. 在 `/projects/:id/workspace/bid-commercial` 增加招投标 / 商务竞标过程创建入口。
2. 在 `/projects/:id/workspace/bid-commercial` 增加当前过程的编辑入口；编辑语义为以当前记录预填表单并提交新的 current version。
3. 表单覆盖至少以下字段:
   - `tenderNo`
   - `bidPackageNo`
   - `bidMode`
   - `currentStage`
   - `decision`
   - `resultStatus`
   - `processSummary`
   - `decisionSummary`
   - `resultSummary`
   - `ownerRole`
   - `materialItems`
   - `timelineItems`
4. 在 `/projects/:id/workspace/pricing-margin` 增加报价 / 毛利评审创建入口。
5. 在 `/projects/:id/workspace/pricing-margin` 增加当前评审的编辑入口；编辑语义同样为提交新的 current version。
6. 报价 / 毛利评审表单基于现有 `CreateProjectPricingMarginReviewRequest`，覆盖报价版本、金额、税率、税务成本、回款条件、毛利率、结论和条件项等关键字段。
7. `ProjectWorkspaceStore` 补齐 create command wrapper，并在提交成功后刷新对应 workspace projection。
8. 入口显隐必须消费 workspace `allowedActions`，不能只用前端本地 stage 判断。
9. 补 store / page focused tests 与登录后入口链验证。

本片不交付:

1. 不新增后端 API、OpenAPI、DTO、generated client 或 DDL。
2. 不实现 in-place update、PATCH、PUT 或删除历史版本。
3. 不新增附件上传、标书文件库或商务文件归档能力。
4. 不新增审批流、报价放行流程或合同生成流程。
5. 不改变项目生命周期状态机、提成规则或合同签约规则。
6. 不重做 `FE-11` 已交付的读取型工作区信息架构。

## 3. Formal Inputs

| Input Type           | Document / Source                                                                          | Section / Anchor                                                | Status      | Notes                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Upstream exception   | `docs/design/archive/slices/fe-30-business-number-frontend-g3-g4-closeout.md`              | `FE30-E1-BID-WRITE-ENTRY-DEFERRED`                              | Accepted    | 招投标 / 商务竞标完整写入体验由 FE-34 承接。                                                        |
| Read workspace       | `docs/design/archive/slices/fe-11-bid-pricing-workspace-frontend-g3-g4-closeout.md`        | bid-commercial / pricing-margin frontend delivery               | Accepted    | FE-34 在既有读取页上补写入入口，不重建工作区。                                                      |
| Backend fact source  | `docs/design/archive/slices/ex-27-presigning-bid-commercial-fact-source-g3-g4-closeout.md` | bid-commercial process command / workspace projection           | Accepted    | 已交付 bid-commercial create/list/workspace route。                                                 |
| Backend fact source  | `docs/design/archive/slices/ex-28-presigning-pricing-margin-fact-source-g3-g4-closeout.md` | pricing-margin review command / workspace projection            | Accepted    | 已交付 pricing-margin create/list/workspace route。                                                 |
| Generated client     | `libs/shared/api-client/api/project.service.ts`                                            | `projectControllerCreateProjectBidCommercialProcess`            | Implemented | Existing POST route is sufficient for create and edit-as-new-version.                               |
| Generated client     | `libs/shared/api-client/api/project.service.ts`                                            | `projectControllerCreateProjectPricingMarginReview`             | Implemented | Existing POST route is sufficient for create and edit-as-new-version.                               |
| Request DTO          | `libs/shared/api-client/model/create-project-bid-commercial-process-request.ts`            | request fields                                                  | Implemented | Includes tender/package numbers, process state, summaries, owner role, material and timeline items. |
| Request DTO          | `libs/shared/api-client/model/create-project-pricing-margin-review-request.ts`             | request fields                                                  | Implemented | Includes pricing path, amounts, tax, payment condition, margin, decision and condition items.       |
| Backend command rule | `apps/poms-api/src/app/features/project/project.service.ts`                                | `createProjectBidCommercialProcess` / `createProjectPricing...` | Implemented | POST creates a new current version and supersedes previous current record.                          |
| Permission signal    | `apps/poms-api/src/app/features/project/project-query.service.ts`                          | `allowedActions` builders                                       | Implemented | Workspaces expose `create-bid-commercial-process` / `create-pricing-margin-review`.                 |

## 4. SSOT

| Concern                     | SSOT                                        | Implementation Rule                                                                                        |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Business semantics          | `EX-27` / `EX-28` backend command semantics | Frontend create and edit both submit existing POST command; backend owns versioning and supersession.      |
| Public route canonical path | Existing route inventory                    | No public route change.                                                                                    |
| DTO / wire contract         | Generated shared API client                 | Frontend derives form view model from generated DTOs; no parallel wire contract.                           |
| Permission / visibility     | Workspace `allowedActions`                  | Show write CTAs only when action is present; otherwise keep read-only page with explanation where needed.  |
| Current version             | Workspace projection                        | Current record displayed after command must come from refreshed workspace projection, not optimistic copy. |
| External identifiers        | `tenderNo` / `bidPackageNo`                 | Optional external numbers are user-maintained fields, not POMS system identifiers.                         |
| Pricing prerequisites       | Pricing workspace upstream facts            | Pricing review form requires existing current technical cost package and compatible current facts.         |

## 5. Command And Interface Boundary

| Route                                                 | Generated Client Method                              | Request DTO                                | Response DTO                        | Result               |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ | ----------------------------------- | -------------------- |
| `POST /projects/{projectId}/bid-commercial-processes` | `projectControllerCreateProjectBidCommercialProcess` | `CreateProjectBidCommercialProcessRequest` | bid-commercial process view         | Existing; consumed.  |
| `GET /projects/{projectId}/bid-commercial-workspace`  | `projectControllerGetProjectBidCommercialWorkspace`  | N/A                                        | bid-commercial workspace view       | Existing; consumed.  |
| `POST /projects/{projectId}/pricing-margin-reviews`   | `projectControllerCreateProjectPricingMarginReview`  | `CreateProjectPricingMarginReviewRequest`  | pricing-margin review view          | Existing; consumed.  |
| `GET /projects/{projectId}/pricing-margin-workspace`  | `projectControllerGetProjectPricingMarginWorkspace`  | N/A                                        | pricing-margin workspace view       | Existing; consumed.  |
| `GET /projects/{projectId}/bid-commercial-processes`  | `projectControllerListProjectBidCommercialProcesses` | N/A                                        | bid-commercial process history list | Optional; read only. |
| `GET /projects/{projectId}/pricing-margin-reviews`    | `projectControllerListProjectPricingMarginReviews`   | N/A                                        | pricing-margin review history list  | Optional; read only. |

### 5.1 Route Governance

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing bid-commercial / pricing-margin workspace and create routes.
- Inventory status: `aligned`
- ADR source: `ADR-015`
- Blocker / exception: none; FE-34 does not change public route surface.

## 6. Frontend Implementation Boundary

| Area                | Decision                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bid-commercial page | Extend `apps/poms-admin/src/app/features/project/project-bid-commercial-workspace.ts` with create/edit entry and PrimeNG form dialog or equivalent Poseidon pattern. |
| Pricing-margin page | Extend `apps/poms-admin/src/app/features/project/project-pricing-margin-workspace.ts` with create/edit entry and PrimeNG form dialog or equivalent Poseidon pattern. |
| Data access         | Add create wrappers in `libs/admin/data-access/src/lib/project/project-workspace.store.ts`; export required generated DTO types from admin data-access as needed.    |
| Form model          | Use a typed frontend form model derived from generated request DTOs.                                                                                                 |
| Empty arrays        | Send `materialItems`, `timelineItems` and `conditionItems` as explicit arrays, including empty arrays, to avoid relying on backend default hydration.                |
| UI system           | Use PrimeNG / Poseidon form, dialog, message, button and table patterns. Avoid new Tailwind-only ad hoc controls.                                                    |
| Refresh behavior    | After successful create/edit-as-new-version, reload the corresponding workspace projection and close/reset the form.                                                 |
| Error handling      | Surface backend validation errors through existing admin feedback patterns; do not silently coerce invalid state combinations.                                       |
| E2E path            | Verify login -> menu/project entry -> workspace -> write CTA path, not direct URL only.                                                                              |

## 7. Versioned Edit Semantics

`FE-34` freezes the following wording for implementation and user-facing copy:

1. Create: submit a new bid-commercial process or pricing-margin review.
2. Edit current: prefill from the current workspace record and submit a replacement version through the existing POST command.
3. Backend result: previous current record becomes `superseded`; the newly submitted record becomes current.
4. Frontend must not expose this as a destructive overwrite.
5. Frontend must not invent partial patch semantics. If the user opens edit mode, the submitted payload must be complete enough for the existing create request DTO.

## 8. Permissions And Disabled States

| Action                         | Required `allowedActions` Key   | Required Handling                                                                                      |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Create bid-commercial process  | `create-bid-commercial-process` | Show enabled create CTA only when present.                                                             |
| Edit current bid process       | `create-bid-commercial-process` | Show edit CTA only when action is present and current process exists.                                  |
| Create pricing-margin review   | `create-pricing-margin-review`  | Show enabled create CTA only when present and required upstream facts exist.                           |
| Edit current pricing review    | `create-pricing-margin-review`  | Show edit CTA only when action is present, current review exists and pricing prerequisites are usable. |
| Read-only users / closed stage | Action absent                   | Keep workspace readable; show no write CTA or show disabled explanation using existing feedback style. |

## 9. Test And Validation Plan

Required:

1. Focused store tests for bid-commercial create wrapper, pricing-margin create wrapper and workspace refresh behavior.
2. Focused page tests for:
   - write CTA visibility from `allowedActions`
   - create form request shape
   - edit-as-new-version prefill
   - disabled / read-only state
   - validation or backend error feedback
3. Browser or Playwright journey covering login -> project entry -> bid-commercial workspace -> create/edit CTA.
4. Browser or Playwright journey covering login -> project entry -> pricing-margin workspace -> create/edit CTA when seeded prerequisites exist.
5. `corepack pnpm nx lint poms-admin`
6. `corepack pnpm nx build poms-admin`
7. Focused `poms-admin` unit tests for changed pages.
8. `corepack pnpm run format:md:check`
9. `git diff --check`

Conditionally required:

1. `corepack pnpm nx run shared-api-client:check` only if implementation changes generated client or OpenAPI artifacts; current G1 says it should not.
2. API tests only if implementation discovers existing generated client is insufficient and a backend governance slice is opened first.

## 10. Exceptions And Risks

| Exception ID                         | Level  | Scope                        | Approved By | Cleanup Owner | Cleanup Due                      | Notes                                                                                                         |
| ------------------------------------ | ------ | ---------------------------- | ----------- | ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `FE34-E1-APPEND-ONLY-EDIT-SEMANTICS` | Medium | Bid / pricing edit UX        | Codex       | Codex         | Before FE-34 G4 wording review   | Edit is implemented as replacement version via existing POST. UX copy must not imply in-place overwrite.      |
| `FE34-E2-PRICING-UPSTREAM-FACTS`     | Medium | Pricing-margin review form   | Codex       | Codex         | FE-34 implementation checkpoint  | Pricing review requires current technical cost and matching upstream facts; absent prerequisites disable CTA. |
| `FE34-E3-HISTORY-LIST-NOT-PRIMARY`   | Low    | Version history presentation | Codex       | Codex         | Future audit/history enhancement | FE-34 may consume list routes for context, but primary closure is current write entry and refreshed current.  |

## 11. G1 Decision

`FE-34` can enter frontend implementation.

Conditions:

1. No backend slice is required before implementation because existing generated client and backend POST commands are sufficient.
2. Frontend “edit” must use the append-only replacement semantics frozen above.
3. Write CTAs must be permission-gated by workspace `allowedActions`.
4. Forms must remain DTO-derived and must not create a new wire contract.
5. `FE30-E1-BID-WRITE-ENTRY-DEFERRED` remains open until FE-34 reaches G3/G4 with working write entry evidence.
