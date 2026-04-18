# POMS Governance Summary

Use this file as the compact operating guide. Open the full source documents only when the task needs exact wording or a complete template.

## Core Principles

1. Use one formal input set for one slice.
2. Freeze the slice before coding.
3. Split large work into independently verifiable sub-slices.
4. Block merge or commit when design, DDL, entity, contract, API, required lint, or tests drift in a material way.
5. Freeze every new or changed public API route in `docs/design/api-route-canonical-inventory.md` before writing controller, DTO, OpenAPI, or client code.
6. Record every exception with scope, risk, cleanup owner, and cleanup due date.
7. Keep `Done` reserved for work that downstream slices can actually rely on.

## Gate Cheat Sheet

### G0

- Confirm slice identity and tracker row.
- Confirm the smallest deliverable boundary.
- Confirm direct formal inputs.
- Confirm whether the slice changes public API route surface and, if yes, which authoritative inventory row governs it.
- Confirm out-of-scope items.

### G1

- Create the implementation baseline package.
- Freeze SSOT for naming, types, dates, IDs, money, and state machine.
- Confirm command, query, DTO, persistence, and guard boundaries.
- Record canonical route, current implemented route, and inventory status when public routes are touched.

### G2

- Read the baseline package before coding.
- Write migration SQL before entity mapping for persistence work.
- Freeze DTO semantics before controller or service wiring.
- Do not start controller, DTO, OpenAPI, or generated-client edits for a new public route before the authoritative inventory row is frozen.

### G3

- Provide common evidence plus slice-type-specific evidence.
- Run or explicitly waive the required checks.
- Include lint results for every touched project that has a `lint target`.
- Classify drift.
- Use a corrective checkpoint if the slice had already started.

### G4

- Ensure code plus docs plus tracker are all updated.
- Confirm the delivered boundary matches the slice definition.
- Keep parent tasks open if only a child slice is complete.

## Artifact Selection

### Baseline Package

Use for new slices entering `G1`.

Required ideas:

- slice scope,
- formal inputs,
- SSOT table,
- route or command boundaries,
- public route inventory status when public routes are touched,
- query boundaries,
- persistence boundaries,
- tests and checks,
- exceptions and risk.

### Corrective Checkpoint

Use after implementation has started and real drift is found.

Required ideas:

- why `G3` is blocked,
- what this correction fixes,
- what remains blocked,
- what follow-up slices are still needed.

### Local Checkpoint

Use when working without PRs.

Keep at least:

- slice type,
- scope summary,
- command results,
- drift statement,
- decision on whether commit to `main` is allowed,
- decision on whether tracker `Done` is allowed.

## Slice Type To Evidence

| Slice Type | Required Evidence | Usually Not Required |
| --- | --- | --- |
| `docs-only` / `process-only` | `git diff --check`, scope summary, no behavior change statement | build, lint, API tests, migration check, OpenAPI generation |
| `refactor-only` | external behavior unchanged statement, relevant lint for touched lint-enabled projects, relevant tests or build, regression path | migration check unless mapping changed |
| `query-only` | query or view mapping, relevant lint for touched lint-enabled projects, API or service tests, permission boundary | migration check unless schema changed |
| `frontend-only` | frontend lint, build, key interaction verification, generated client impact statement | migration check |
| `api / command` | authoritative inventory row or explicit legacy exception, route-command-DTO alignment, backend lint, API or service tests, OpenAPI generation and diff review | migration check unless persistence changed too |
| `persistence` | migration-entity-DDL-contract alignment, backend lint, migration check, drift classification | frontend E2E unless a user path changed |
| `cross-layer-high-risk` | all relevant items above plus lint for every touched lint-enabled project and an explicit E2E decision | no default waiver |

## Current Command Set

| Purpose | Command |
| --- | --- |
| whitespace and markdown sanity | `git diff --check` |
| API lint | `corepack pnpm nx lint poms-api` |
| admin lint | `corepack pnpm nx lint poms-admin` |
| library lint | `corepack pnpm nx lint <project-name>` |
| API build | `corepack pnpm nx build poms-api` |
| admin build | `corepack pnpm nx build poms-admin` |
| API tests | `corepack pnpm nx test poms-api` |
| admin tests | `corepack pnpm nx test poms-admin` |
| API E2E | `corepack pnpm nx e2e poms-api-e2e` |
| OpenAPI generation | `corepack pnpm nx run poms-api:openapi` |
| generated client check | `corepack pnpm nx run shared-api-client:check` |
| migration or ORM drift check | `corepack pnpm nx run poms-api:migration-check` |

## Drift Classes

Use only these labels:

1. `new-real-drift`
2. `existing-baseline-drift`
3. `accepted-db-specific-difference`
4. `tool-noise`
5. `design-change-required`

## Default G3 Blockers

Block `G3 = Pass` when any of these is true:

1. A persistence slice has no migration-entity-DDL-contract alignment.
2. An API or command slice has no route-command-DTO alignment.
3. A new or changed public route surface has no authoritative inventory row, route baseline, or explicit legacy exception.
4. OpenAPI or generated client changed and nobody explained whether that was expected.
5. Migration check failed and the drift was not classified.
6. Field naming, date types, identifier types, money precision, or version-chain semantics drift without a fix.
7. The change claims the parent task is complete while the evidence covers only a child slice.
8. An exception lacks approver, cleanup owner, or cleanup due date.
9. A touched lint-enabled project has no lint result, no warning statement, and no accepted exception.
10. Required lint failed or the change introduced new lint warnings without an explicit exception record.

## High-Risk Alignment Points

Inspect these explicitly:

- date versus datetime semantics,
- public route canonical grammar and authoritative inventory status,
- UUID versus external identifier semantics,
- decimal precision and rounding,
- version chain and current-record semantics,
- source mapping and traceability semantics,
- state machine naming and enum alignment.

## Exception Levels

- `E1`: lightweight exception for low-risk evidence substitutions.
- `E2`: medium exception for temporarily incomplete validation or partially frozen inputs.
- `E3`: major exception for bypassing normal gates on risky work.

Treat `E3` as rare and avoid using it to normalize unfinished design or real implementation drift.
