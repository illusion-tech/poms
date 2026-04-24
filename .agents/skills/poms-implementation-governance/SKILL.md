---
name: poms-implementation-governance
description: Guide POMS design-to-implementation governance for new slices, ongoing implementation, review, and closure. Use when Codex works on this repository and needs to classify a slice, prepare a G1 baseline package, handle a G3 corrective checkpoint, choose PR mode versus solo worktree mode, classify drift, decide required validation, or determine whether a task can move to Doing or Done.
---

# POMS Implementation Governance

Use this skill to keep work in `POMS` aligned with the repository's formal gate model. Treat the design and reference documents as the source of truth. Use this skill to decide what to read, what evidence to produce, and when to block work instead of coding ahead.

## Quick Start

1. Identify the slice name, `Task ID` or `Subtask ID`, owner, and tracker row before coding.
2. Classify the slice as `docs-only`, `process-only`, `refactor-only`, `query-only`, `frontend-only`, `api / command`, `persistence`, or `cross-layer-high-risk`.
3. Choose the correct governance artifact:
   - Create a baseline package for a new frozen slice entering `G1`.
   - Create a corrective checkpoint when drift is discovered after implementation has started.
   - Use a PR checklist or a local checkpoint as the evidence carrier for `G3`.
4. If the slice adds, changes, or removes public API route surface, confirm the canonical row already exists in `docs/design/api-route-canonical-inventory.md`. If it does not, block coding and create or consume a route-governance sub-slice first.
5. Read [references/governance-summary.md](./references/governance-summary.md) first.
6. Read [references/source-map.md](./references/source-map.md) when the task needs the full source document rather than the summary.

## Run The Gate Sequence

### G0

Establish the slice before coding.

- Name the smallest deliverable boundary.
- Confirm the direct formal inputs.
- State whether the slice changes public API route surface.
- Confirm the authoritative inventory row and canonical grammar first when public routes are touched.
- State what this slice explicitly does not cover.
- Update the tracker first if the parent task must be split into a new executable sub-slice.

Block implementation if the work item still depends on guessed scope, mixed inputs from multiple documents, or an unfrozen public route surface.

### G1

Freeze the implementation input before entering `Doing`.

- Prepare a baseline package.
- Record the business, command, DTO, query, persistence, guard, and test boundaries.
- Record current implemented route, canonical route, and inventory status when public API routes are involved.
- Mark the single source of truth for naming, types, dates, identifiers, money semantics, and state transitions.
- Keep `N/A` sections with reasons instead of deleting them.

Do not start a new engineering slice without a usable `G1` baseline unless an explicit exception is accepted.

### G2

Start implementation only after the frozen inputs are clear.

- Read the baseline package.
- Fix naming and type semantics before writing controllers, entities, or pages.
- Write migration SQL before ORM mapping when persistence changes are involved.
- Freeze DTO and contract semantics before wiring controller or service logic.
- Do not write controllers, DTOs, OpenAPI changes, or generated-client changes for new or changed public routes until the authoritative inventory row and route baseline are frozen.

### G3

Decide whether the change can merge or commit.

- Attach common evidence: slice type, scope, formal inputs, out-of-scope items, lint status, test coverage, and known exceptions.
- Add risk-scaled evidence by slice type.
- Record drift classification whenever migration checks, OpenAPI diffs, or contract alignment reveal differences.
- Use a corrective checkpoint instead of rewriting history when the slice has already started and real drift is discovered.

### G4

Mark the task `Done` only when downstream work can rely on it.

- Ensure code is merged or committed through the chosen workflow.
- Write back the relevant docs and tracker state.
- Confirm the delivered boundary matches the slice definition.
- Keep the parent task open when only a sub-slice is complete.

## Choose The Correct Artifact

### Use A Baseline Package

Use `docs/reference/implementation-baseline-package-template.md` when:

- the slice is new,
- the work is entering `G1`,
- the formal inputs are stable enough to freeze,
- the deliverable boundary is clear.

### Use A Corrective Checkpoint

Use `docs/reference/implementation-corrective-checkpoint-template.md` when:

- coding has already started,
- `G3` or a local checkpoint finds real drift,
- the slice needs a remediation record,
- the parent task cannot yet be closed.

Do not use a corrective checkpoint as a substitute for a missing baseline package on a new slice.

### Use PR Mode Or Solo Worktree Mode

- Use PR mode when review threads, CI evidence, or long-lived comparison are valuable.
- Use solo worktree mode when working alone on `main` or a local worktree.
- Keep the gate standard the same in both modes; only the evidence carrier changes.

For solo worktree mode, use `docs/reference/solo-worktree-governance.md` and ensure the commit message or local checkpoint captures the `G3` conclusion.

## Apply Risk-Scaled Validation

Follow the minimum matrix in [references/governance-summary.md](./references/governance-summary.md).

Use these commands when the slice type requires them:

- `git diff --check`
- `pnpm run format:md:check` when the slice touches any Markdown file under `docs/`
- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx lint <project-name>` for affected lint-enabled libraries
- `corepack pnpm nx build poms-api`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm nx test poms-api`
- `corepack pnpm nx test poms-admin`
- `corepack pnpm nx e2e poms-api-e2e`
- `corepack pnpm nx run poms-api:openapi`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx run poms-api:migration-check`

Always state one of these outcomes for each expected check:

- ran and passed,
- ran and failed,
- not required,
- temporarily blocked with reason and follow-up.

When a touched project has a `lint target`, do not omit lint. State whether the change introduced new lint warnings. Treat lint as additive evidence, not as a substitute for build or test.

## Enforce Alignment Rules

Inspect these edges whenever the slice touches them:

- document -> code
- authoritative route inventory -> route -> command
- route -> command
- DTO / contract -> controller input or output
- migration -> entity -> DDL
- entity -> shared contract / OpenAPI
- query -> view
- guard / permission -> actual behavior

Treat these as high-risk mismatch points:

- `date` versus `datetime`
- internal UUID versus external source identifier
- money precision and rounding semantics
- version chain fields such as `version`, `status`, `is_current`, `supersedes_id`
- source mapping fields such as `source_type`, `source_id`, `source_record_id`
- design state machine versus enum or persisted state

## Classify Drift Explicitly

When checks reveal differences, classify them explicitly as one of:

- `new-real-drift`
- `existing-baseline-drift`
- `accepted-db-specific-difference`
- `tool-noise`
- `design-change-required`

Do not use vague statements such as "tests pass" or "frontend does not use it yet" as drift handling.

## Handle Exceptions Deliberately

Use explicit exception records with scope, approver, cleanup owner, and cleanup due date.

- Use lightweight exceptions for low-risk evidence substitutions.
- Use medium exceptions when some validation or input freeze is temporarily incomplete.
- Use major exceptions only for rare cases that bypass normal gate expectations.

Do not silently accept:

- key naming drift,
- migration or contract semantic mismatch,
- public route surface missing from `ADR-015` authoritative inventory,
- partial delivery under a parent task title,
- undocumented baseline drift,
- "merge now, fix later" on mainline behavior.

## Read The Full Sources Only When Needed

Start with the summary reference files in this skill. Then open the repository sources that match the question:

- gate model and state rules,
- implementation order and completion rules,
- baseline package template,
- corrective checkpoint template,
- validation matrix,
- solo worktree governance.

Use [references/source-map.md](./references/source-map.md) to jump to the correct document quickly.
