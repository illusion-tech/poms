# EX-38 敏感字段投影审计事件批量降噪 G1 Baseline

- Task ID: `EX-38`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend internal audit behavior / refactor-with-behavior-change
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-38`
- Formal Inputs:
  - `docs/design/phase2-data-permission-and-sensitive-visibility-design.md`
  - `docs/design/archive/slices/ex-37b-contract-finance-sensitive-projection-g4-closeout.md`
  - `docs/design/archive/slices/ex-37c2-l5-commission-sensitive-projection-g4-closeout.md`
  - `docs/design/archive/slices/ex-39-sensitive-field-granularity-g4-closeout.md`

---

## 1. Scope

`EX-38` closes the remaining sensitive projection audit event volume exceptions:

1. `EX37B-R3-SECURITY-EVENT-VOLUME`
2. `EX37C2-R2-EVENT-VOLUME`

The slice reduces noisy repeated `sensitive_field.masked` / `sensitive_field.denied` events produced by multi-field projection fan-out while keeping enough audit evidence for governance review.

---

## 2. Current Problem

`SensitiveFieldProjectionService.projectStringField()` currently records one security event for each non-null field when the caller lacks the sensitive package read permission.

This is correct for a single field, but noisy for these existing grouped reads:

| Caller / View                        | Current Fan-out                                                                                  | Issue                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `ContractTermSnapshotSummary`        | up to 6 `contract-finance` fields for one `ContractSnapshot`                                     | one snapshot detail read can produce 6 similar events |
| `ProjectBusinessOutcomeOverviewView` | up to 7 `operating-finance` fields for one `Project`                                             | one L4 overview read can produce 7 similar events     |
| `ProjectUnifiedAccountingView`       | up to 6 `operating-finance` fields for one `Project`                                             | one L4 accounting read can produce 6 similar events   |
| `ProjectVarianceRiskExplanationView` | up to 2 `operating-finance` fields for one `Project`                                             | small fan-out, still same pattern                     |
| `BusinessAccountingFeedbackView`     | up to 3 `operating-finance` fields for one `Project`                                             | same grouped read semantics                           |
| `CommissionCalculationSummary`       | 4 `operating-finance` fields + 1 `commission-compensation` field for one `CommissionCalculation` | one row can produce several similar events            |
| `CommissionPayoutSummary`            | up to 3 `commission-compensation` fields for one `CommissionPayout`                              | payout list can multiply per row                      |
| `CommissionAdjustmentSummary`        | up to 2 `commission-compensation` fields for one `CommissionAdjustment`                          | adjustment list can multiply per row                  |
| `CommissionSharedEvidencePackage`    | up to 2 `operating-finance` fields for one `Project`                                             | final settlement / rule explanation duplicate pattern |

---

## 3. Decision

Add an internal batch projection API to `SensitiveFieldProjectionService`:

- Keep `projectStringField()` for single-field call sites and backwards-internal simplicity.
- Add `projectStringFields()` for grouped projection within one package, target type, request context, and user.
- Return one projection per field, preserving existing response DTO semantics.
- Record at most one security event for one unauthorized grouped call and one `fieldPackageKey` / `targetType` / `projectionMode`.
- Do not record an event when every grouped field has `rawValue = null`, matching current not-applicable behavior.
- Do not record events for full reads.

Event details must preserve audit evidence:

| Detail Key             | Required Semantics                                                          |
| ---------------------- | --------------------------------------------------------------------------- |
| `fieldPackageKey`      | sensitive package that required permission                                  |
| `projectionMode`       | `masked` or `denied`                                                        |
| `targetType`           | business target type                                                        |
| `targetId`             | single target id when all fields share one target; otherwise summary marker |
| `targetCount`          | number of distinct non-null targets hidden                                  |
| `sampleTargetIds`      | bounded list of target ids for traceability                                 |
| `fieldKeys`            | stable internal field keys included in the batch                            |
| `hiddenFieldCount`     | number of non-null fields hidden                                            |
| `reasonCode`           | `missing-sensitive-read-permission`                                         |
| `requiredPermission`   | package read permission                                                     |
| `auditAggregationMode` | `sensitive-field-batch`                                                     |

---

## 4. Implementation Boundaries

### In Scope

1. `SensitiveFieldProjectionService`
   - Add strict typed batch input.
   - Reuse the same permission policy as `projectStringField()`.
   - Make `projectStringField()` delegate through the batch path for consistent event payloads.
2. `ContractController`
   - Batch `ContractTermSnapshotSummary` projections for `ContractSnapshot`.
3. `ProjectCostService`
   - Batch grouped `operating-finance` projections in L4 read views.
4. `CommissionService`
   - Batch grouped `operating-finance` and `commission-compensation` projections where a row or shared evidence package currently calls `#projectCommissionSensitiveField()` multiple times.
5. Tests
   - Update projection service unit tests for grouped masked / denied event counts and details.
   - Update existing backend tests that assert `projectStringField()` call counts or event payloads.

### Out of Scope

1. No public API route changes.
2. No response DTO / OpenAPI / generated client changes.
3. No permission key changes.
4. No DDL, entity, migration, repository, or query route changes.
5. No frontend behavior change.
6. No audit log query UI changes.

---

## 5. Public Route / Contract Decision

| Surface             | Decision                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| Public API route    | No change                                                               |
| Shared contract DTO | No change                                                               |
| OpenAPI             | No generation required unless type imports unexpectedly affect metadata |
| Generated client    | No change expected                                                      |
| Persistence         | No change                                                               |
| Permission model    | No change; keep existing `*:sensitive:read` package permission mapping  |

---

## 6. SSOT

| Concern                    | Source of Truth                                                                 |
| -------------------------- | ------------------------------------------------------------------------------- |
| Field package keys         | `SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS` in shared contracts              |
| Permission decision        | `canReadFullSensitiveFieldPackage()`                                            |
| Required permission        | `requiredPermissionForSensitiveFieldPackage()`                                  |
| Projection response shape  | `SensitiveStringFieldProjectionSchema`                                          |
| Security event persistence | `RuntimeAuditService.recordSecurityEvent()` and existing `SecurityEvent` entity |
| Batch audit detail shape   | This baseline and `SensitiveFieldProjectionService` tests                       |

---

## 7. Tests And Checks

| Check                      | Required     | Command / Evidence                                                                                                                                       |
| -------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projection service unit    | Yes          | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts --runInBand` |
| Backend focused specs      | Yes          | affected `contract.controller.spec.ts`, `project-cost.service.spec.ts`, `commission.service.spec.ts`                                                     |
| `poms-api` lint            | Yes          | `corepack pnpm nx lint poms-api`                                                                                                                         |
| `poms-api` build           | Yes          | `corepack pnpm nx build poms-api`                                                                                                                        |
| OpenAPI / generated client | Not expected | Run `corepack pnpm nx run shared-api-client:check` if any contract metadata changes appear.                                                              |
| Frontend lint / build      | Not required | No frontend files expected.                                                                                                                              |
| Markdown check             | Yes          | `corepack pnpm run format:md:check`                                                                                                                      |
| Whitespace                 | Yes          | `git diff --check`                                                                                                                                       |

---

## 8. G1 Decision

`EX-38` can enter implementation.

The implementation must reduce repeated sensitive projection audit events through explicit internal batching, not by suppressing events silently. Each batched event must retain package, permission, mode, target count, field count and sample target evidence.
