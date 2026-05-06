# FE-46 Attachment Panel Business Object Entry Baseline

- Gate Status: `Pass`
- Parent: `EX-45` Attachment Evidence Repository
- Owner: Codex
- Slice Type: `frontend-only`
- G1 Reviewer: User-approved continuation after EX-45 commit
- G1 Date: 2026-04-30
- G4 Date: 2026-04-30
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-46`

## 1. Scope

- This slice delivers:
  1. Reuse the EX-45 `AttachmentPanel` in Customer detail, Project detail and Contract detail.
  2. Keep attachment upload/list/download/void behavior backed by the existing `/attachments` APIs.
  3. Use the correct `AttachmentTargetType` for each business object: `customer`, `project`, `contract`.
  4. Keep write affordances aligned with existing frontend permissions: customer uses `customer:write`, project/contract uses `project:write` because EX-45 contract attachment access is project-scoped.
- This slice does not deliver:
  1. No new API routes, DTOs, generated client changes or migrations.
  2. No preview, OCR, full-text search, version workflow or final-file approval.
  3. No global file center or directory tree.
  4. No business rule change to project, contract or customer detail commands.

## 2. Formal Inputs

| Input Type           | Document / Source                                              | Section / Anchor                 | Status | Notes                                             |
| -------------------- | -------------------------------------------------------------- | -------------------------------- | ------ | ------------------------------------------------- |
| Parent capability    | `docs/design/ex-45-attachment-evidence-repository-baseline.md` | `G4` delivered boundary          | Frozen | Reusable panel and `/attachments` APIs are ready. |
| Existing UI patterns | Current Customer / Project / Contract detail components        | Details and card sections        | Frozen | Embed as a normal business-evidence section.      |
| Permissions          | EX-45 service-level permission rules                           | Attachment target permission map | Frozen | Contract target is guarded by project permission. |

## 3. SSOT

| Concern      | SSOT              | Implementation Rule                                                             |
| ------------ | ----------------- | ------------------------------------------------------------------------------- |
| API surface  | EX-45             | Consume existing generated attachment client through `AttachmentStore`.         |
| Target type  | Shared API client | Use `AttachmentTargetType.Customer`, `Project`, `Contract`.                     |
| Write access | Auth permissions  | Customer: `customer:write`; Project/Contract: `project:write`.                  |
| UI behavior  | `AttachmentPanel` | Parent pages only pass target and copy; no page-specific upload implementation. |

## 4. Route / API Boundary

| Area           | Change                      | Result |
| -------------- | --------------------------- | ------ |
| Public API     | No new or changed API route | `N/A`  |
| OpenAPI/client | No regeneration required    | `N/A`  |
| Persistence    | No migration                | `N/A`  |

## 5. UI Boundary

| Page / Component             | Target Type | Write Gate       | Placement                       | Result |
| ---------------------------- | ----------- | ---------------- | ------------------------------- | ------ |
| `CustomerList` detail dialog | `customer`  | `customer:write` | Below customer aliases          | Pass   |
| `ProjectDetail`              | `project`   | `project:write`  | Project evidence / summary area | Pass   |
| `ContractDetail`             | `contract`  | `project:write`  | Contract evidence section       | Pass   |

## 6. Validation Plan

| Check      | Required | Command / Evidence                                                                                                            | Result |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| Lint       | Yes      | `corepack pnpm nx lint poms-admin`                                                                                            | Pass   |
| Build      | Yes      | `corepack pnpm nx build poms-admin`                                                                                           | Pass   |
| Unit tests | Yes      | `customer-list.spec.ts`, `project-detail.spec.ts`, `contract-detail.spec.ts`, `attachment-panel.spec.ts` focused test runs    | Pass   |
| API checks | No       | No API surface change                                                                                                         | N/A    |
| Migration  | No       | No persistence change                                                                                                         | N/A    |
| Markdown   | Yes      | Targeted table formatting / check for touched docs; full check retains known old `EX-42` / `EX-44` docs table-formatting debt | Pass   |

## 7. G1 Conclusion

- Gate Status: `Pass`
- Approved By: User continuation request
- Approved At: 2026-04-30
- Conditions: keep the slice frontend-only and reuse EX-45 without expanding attachment workflow semantics.

## 8. G4 Conclusion

- Gate Status: `Pass`
- Completed At: 2026-04-30
- Delivered Boundary: Customer, Project and Contract detail pages now reuse `AttachmentPanel` with object-specific target types and existing permission gates.
- Explicitly Not Delivered: no API, DTO, generated client, migration, preview, version workflow, global file center or business command changes.
- Known Exceptions: no FE-46-specific exception. Full `format:md:check` still reports pre-existing table-formatting debt in older `EX-42` / `EX-44` design docs.
