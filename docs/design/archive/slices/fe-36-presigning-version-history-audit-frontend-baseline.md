# FE-36 签约前竞标 / 报价版本历史与审计呈现实施基线包

- Gate Status: `G1 = Frozen`
- Task ID: `FE-36`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Baseline Date: `2026-04-27`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-36`

## 1. Problem Statement

`FE-34` 已完成签约前招投标 / 商务竞标与报价 / 毛利评审的 create / edit-as-new-version 前端入口。当前工作区能够展示 current record，也能通过既有 POST command 形成新的 current version，但用户还无法在前端稳定查看历史版本、替代链、created / effective metadata 与审计入口。

`FE34-E3-HISTORY-LIST-NOT-PRIMARY` 已将该缺口显式后置。`FE-36` 将其转为独立前端实现切片，目标是在不新增后端 API 的前提下，把现有 list route 中已经存在的版本链字段呈现到签约前工作区。

## 2. Scope

本片交付:

1. 在 `/projects/:id/workspace/bid-commercial` 补充招投标 / 商务竞标过程的当前 / 历史版本列表。
2. 在 `/projects/:id/workspace/pricing-margin` 补充报价 / 毛利评审的当前 / 历史版本列表。
3. 两个列表均展示版本号、当前标记、状态、替代关系、created / effective metadata 与可用于审计追溯的 row version。
4. 在两个页面补充替代链摘要，例如当前版本、历史版本数、最近生效时间和上一版本引用。
5. `ProjectWorkspaceStore` 补齐 list route 的 read wrapper、loading state 与 error state，并由页面消费。
6. 使用 PrimeNG / Poseidon 表格与反馈模式，按 uikit table demo 的表格基线处理 paginator、row hover、scroll / min-width、empty 和 loading state。
7. 补 focused store / page tests 覆盖成功加载、空列表、错误态和当前 / 历史版本呈现。

本片不交付:

1. 不新增或修改后端 API、OpenAPI、generated client、DTO、数据库表或 DDL。
2. 不实现字段级 diff 对比。
3. 不实现恢复旧版本、回滚、删除历史版本或切换 current version。
4. 不新增独立审计中心或全局 audit timeline。
5. 不做操作人姓名 enrichment；现有 DTO 只提供 `createdBy` / `updatedBy` ID，前端首版只按 ID 或空值 fallback 呈现。
6. 不扩大签约前工作区的信息架构，不重做 `FE-11` / `FE-34` 已交付的读取和写入模式。

## 3. Formal Inputs

| Input Type              | Document / Source                                                                  | Section / Anchor                                     | Status      | Notes                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| Upstream frontend slice | `docs/design/archive/slices/fe-34-bid-commercial-write-frontend-g3-g4-closeout.md` | `FE34-E3-HISTORY-LIST-NOT-PRIMARY`                   | Accepted    | 历史列表与审计呈现由 FE-36 承接。                                                   |
| Tracker row             | `docs/design/phase2-development-execution-tracker.md`                              | `FE-36`                                              | Frozen      | 本片进入 `G1`，从 `Todo` 切换为 `Doing`。                                           |
| Route inventory         | `docs/design/api-route-canonical-inventory.md`                                     | `listProjectBidCommercialProcesses`                  | Aligned     | `GET /projects/{projectId}/bid-commercial-processes` 已存在且 aligned。             |
| Route inventory         | `docs/design/api-route-canonical-inventory.md`                                     | `listProjectPricingMarginReviews`                    | Aligned     | `GET /projects/{projectId}/pricing-margin-reviews` 已存在且 aligned。               |
| Generated client        | `libs/shared/api-client/api/project.service.ts`                                    | `projectControllerListProjectBidCommercialProcesses` | Implemented | 返回 `ProjectBidCommercialProcessSummary[]`。                                       |
| Generated client        | `libs/shared/api-client/api/project.service.ts`                                    | `projectControllerListProjectPricingMarginReviews`   | Implemented | 返回 `ProjectPricingMarginReviewSummary[]`。                                        |
| DTO                     | `libs/shared/api-client/model/project-bid-commercial-process-summary.ts`           | `ProjectBidCommercialProcessSummary`                 | Implemented | 已包含 `version`、`isCurrent`、`supersedesId`、`status`、metadata 和 `rowVersion`。 |
| DTO                     | `libs/shared/api-client/model/project-pricing-margin-review-summary.ts`            | `ProjectPricingMarginReviewSummary`                  | Implemented | 已包含 `version`、`isCurrent`、`supersedesId`、`status`、metadata 和 `rowVersion`。 |
| Existing pages          | `apps/poms-admin/src/app/features/project/project-bid-commercial-workspace.ts`     | bid-commercial workspace                             | Implemented | FE-36 在既有工作区补历史视图，不新建并行页面。                                      |
| Existing pages          | `apps/poms-admin/src/app/features/project/project-pricing-margin-workspace.ts`     | pricing-margin workspace                             | Implemented | FE-36 在既有工作区补历史视图，不新建并行页面。                                      |
| Data access             | `libs/admin/data-access/src/lib/project/project-workspace.store.ts`                | Project workspace store                              | Implemented | FE-36 补 read wrapper，不改变 create command semantics。                            |

## 4. SSOT

| Concern                     | SSOT                                             | Implementation Rule                                                                                |
| --------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Business semantics          | `EX-27` / `EX-28` fact source and FE-34 closeout | 历史版本来自后端事实源；前端不得推导或伪造版本链。                                                 |
| Public route canonical path | `api-route-canonical-inventory.md`               | 只消费已 aligned 的 list routes，不新增 public route surface。                                     |
| DTO / wire contract         | Generated shared API client                      | 前端 view model 只能从 generated DTO 派生，不新造 wire contract。                                  |
| Version chain               | DTO fields `version/isCurrent/supersedesId`      | 以 `isCurrent` 表示当前版本，以 `supersedesId` 表示替代关系；若为空则显示为无上一版本。            |
| Status machine              | Generated DTO status enum                        | `effective` 与 `superseded` 使用共享 status presentation / PrimeNG tag 显示，不本地散落 severity。 |
| Date / time semantics       | DTO `effectiveAt/createdAt/updatedAt`            | 前端只格式化显示，不改变时区或业务语义。                                                           |
| Actor semantics             | DTO `createdBy/updatedBy`                        | 首版只展示 ID 或空值 fallback；姓名 enrichment 不在本片。                                          |
| Audit reference             | DTO `rowVersion` and metadata                    | `rowVersion` 仅作为审计 metadata 呈现，不暴露为用户可编辑字段。                                    |

## 5. Public Interfaces / API

| Boundary          | Status   | Notes                                                                                                             |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| Public API route  | Existing | 消费 `GET /projects/{projectId}/bid-commercial-processes` 与 `GET /projects/{projectId}/pricing-margin-reviews`。 |
| OpenAPI / DTO     | Existing | 不改 generated client；如发现字段不足，先开后端治理切片，不在 FE-36 内直接扩契约。                                |
| Persistence / DDL | N/A      | 无数据库变化。                                                                                                    |
| Frontend API      | Frozen   | 新增 admin data-access store selectors / methods 与页面内部 view model。                                          |

### 5.1 Route Governance

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical routes:
  - `GET /projects/{projectId}/bid-commercial-processes`
  - `GET /projects/{projectId}/pricing-margin-reviews`
- Current implemented routes:
  - `GET /projects/:projectId/bid-commercial-processes`
  - `GET /projects/:projectId/pricing-margin-reviews`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + existing `EX-27` / `EX-28`
- Blocker / exception: none for first frontend implementation.

## 6. Frontend Implementation Boundary

| Area                         | Decision                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Bid-commercial workspace     | Extend existing page with a version history section backed by `ProjectBidCommercialProcessSummary[]`.                  |
| Pricing-margin workspace     | Extend existing page with a version history section backed by `ProjectPricingMarginReviewSummary[]`.                   |
| Data access                  | Add store read wrappers, loading states, errors and refresh hooks for both list routes.                                |
| Current / historical sorting | Prefer backend order when already stable; otherwise sort by `version` descending in frontend view model.               |
| Table interaction            | Use PrimeNG `p-table` with paginator when needed, rowHover, scrollable layout, min-width, empty state and loading row. |
| Summary cards                | Derive compact replacement-chain summary from list data; do not persist or call extra backend routes.                  |
| Metadata copy                | Label `createdBy` / `updatedBy` as operator ID to avoid implying user profile enrichment.                              |
| Permissions                  | History is read-only; reuse page-level access behavior. Do not add write actions or bypass existing guards.            |

## 7. Test And Validation Plan

Required during implementation:

1. Focused store tests for bid-commercial process history list load success and error state.
2. Focused store tests for pricing-margin review history list load success and error state.
3. Focused page tests for:
   - current version displayed separately from historical versions
   - superseded version rows display replacement metadata
   - empty / loading / error states
   - actor ID fallback when `createdBy` / `updatedBy` is absent
4. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial-workspace`
5. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin-workspace`
6. `corepack pnpm nx test admin-data-access --runInBand --testPathPatterns=project-workspace`
7. `corepack pnpm nx lint poms-admin`
8. `corepack pnpm nx build poms-admin`
9. `corepack pnpm run format:md:check`
10. `git diff --check`

Conditionally required:

1. `corepack pnpm nx run shared-api-client:check` only if implementation changes OpenAPI or generated client; current G1 says it should not.
2. Browser / Playwright login journey if page structure or route entry behavior changes beyond in-page read-only sections.
3. Backend tests only if FE-36 discovers a real route / DTO gap and opens a backend governance slice first.

## 8. Exceptions And Risks

| Exception ID                              | Level | Scope                    | Approved By | Cleanup Owner | Cleanup Due                                  | Notes                                                                                                                    |
| ----------------------------------------- | ----- | ------------------------ | ----------- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `FE36-E1-ACTOR-DISPLAY-NAME-OUT-OF-SCOPE` | Low   | Operator display         | Codex       | Codex         | Future actor projection slice if required    | DTO currently exposes `createdBy` / `updatedBy` IDs, not display names. First frontend slice must label them accurately. |
| `FE36-E2-NO-DIFF-COMPARISON`              | Low   | Version audit experience | Codex       | Codex         | Future audit enhancement if users require it | First slice shows version chain and metadata, not field-level before / after diff.                                       |
| `FE36-E3-NO-RESTORE-COMMAND`              | Low   | Version command behavior | Codex       | Codex         | Future backend command slice if required     | Existing backend supports append replacement through POST, not restore / revert / re-activate.                           |

## 9. G1 Decision

`FE-36` can enter frontend implementation.

Conditions:

1. No backend slice is required before implementation because existing list routes and summary DTOs contain the required version, current, supersedes, status, time and actor ID fields.
2. Implementation must stay read-only and must not invent restore, diff or audit-center behavior.
3. History presentation must use generated DTOs and admin data-access selectors only.
4. If G2 discovers that operator display names, field-level diffs or restore commands are mandatory, FE-36 must stop expanding scope and create a separate backend / product governance slice.
