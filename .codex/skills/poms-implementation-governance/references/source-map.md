# POMS Governance Source Map

Use this file to jump from the condensed skill guidance to the authoritative repository document.

## Primary Governance Sources

### Gate model and state rules

- `docs/design/implementation-governance-gates.md`

Open this when you need:

- exact `G0` to `G4` responsibilities,
- formal task, gate, and document state rules,
- blocker and exception policy,
- sub-slice governance,
- grandfathering rules.

### Implementation order and completion rules

- `docs/design/implementation-delivery-guide.md`

Open this when you need:

- reading order for a new implementer,
- standard engineering sequence,
- completion definition,
- E2E decision rules,
- SQL-first migration handling.

## Templates and reference helpers

### Baseline package template

- `docs/reference/implementation-baseline-package-template.md`

Open this when the slice is entering `G1` and you need the actual structure for freezing scope and SSOT.

### Corrective checkpoint template

- `docs/reference/implementation-corrective-checkpoint-template.md`

Open this when implementation already started and you need to record why `G3` is blocked and what the correction covers.

### Validation matrix

- `docs/reference/implementation-governance-checks.md`

Open this when you need:

- slice type to evidence mapping,
- current commands,
- drift categories,
- default blockers.

### Solo worktree governance

- `docs/reference/solo-worktree-governance.md`

Open this when the work is done without a PR and you need:

- local checkpoint structure,
- commit-message governance expectations,
- main-only versus worktree checkpoint flow.

## Supporting Context

These files are not the first stop for gate execution, but they matter when a slice needs broader context:

- `README.md`
- `docs/design/poms-design-progress.md`
- `docs/design/phase2-mainline-delivery-plan.md`
- `docs/design/phase2-lx-t04-full-mainline-development-decision.md`
- `docs/design/phase2-detailed-design-index-map.md`

Use them to understand the current official entry set, current delivery order, and where the slice belongs in the mainline.
