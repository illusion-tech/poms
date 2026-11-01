---
name: poms-github-task-governance
description: Sync POMS GitHub issues, pull requests, and local governance docs during the GitHub issue-first transition. Use when Codex is asked to update issue checklists, add G1/G3/G4 issue comments, close or reopen slice issues, migrate status ownership from local trackers to GitHub, or keep GitHub issues, PR evidence, baseline docs, trackers, and archived slice artifacts aligned.
---

# POMS GitHub Task Governance

Use this skill with `$poms-implementation-governance`. In Phase 1, GitHub owns task state. Local docs own frozen design inputs, long-lived architecture evidence, and archive hygiene.

## Phase 1 Rule

- Treat GitHub issues as the visible task tracker for parent issues, child slices, dependencies, checklist state, PR links, and closeout evidence.
- Keep local docs for `G1` baselines, route inventory, ADR/design references, validation matrices, and archived slice artifacts.
- Keep `docs/design/phase2-development-execution-tracker.md` as a transitional index only; update it when a slice gate changes until the tracker is formally retired.
- Do not let issue state, PR state, tracker status, progress notes, and archive location disagree.

## Workflow

1. Resolve the GitHub issue or PR.
   - Read issue body, comments, subissues, closing PRs, labels, and current state.
   - Read relevant local baseline, tracker, progress, and archive docs.
2. Classify the action.
   - New slice: create or update the issue body checklist, then create the `G1` baseline locally.
   - Active implementation: keep the PR body as `G3` evidence, with issue comments for gate transitions.
   - Merged slice: update issue checklist, add `G4` closeout evidence, update local tracker/progress, archive completed slice docs, and close only the child issue.
   - Parent issue: keep open until all child issues are closed and final smoke/closeout evidence exists.
3. Update GitHub first for task state.
   - Issue body should show current checklist and dependencies.
   - Comments should record `G1` freeze, `G3` ready-for-review, and `G4` closeout.
   - PR should use `Closes #child` only when the PR fully delivers that child slice; otherwise use `Refs #child`.
4. Update local docs second.
   - Baselines and route inventory remain canonical for design input.
   - Tracker rows must mirror GitHub state during Phase 1.
   - Completed slice lifecycle docs must move to `docs/design/archive/slices/`.
5. Verify alignment.
   - Check issue state and checklist.
   - Check PR merge/close references.
   - Check tracker row and progress note.
   - Check archive location.
   - Run docs validation when Markdown changed.

## Issue Comment Shapes

`G1` comment:

```md
G1 已冻结。

- Baseline: `docs/design/<file>.md`
- Slice type:
- Public route surface:
- Out of scope:
- Required validation:
```

`G3` comment:

```md
G3 Ready for Review。

- PR:
- Delivered boundary:
- Validation:
- Drift / exceptions:
```

`G4` comment:

```md
G4 已完成。

- PR:
- Merge commit:
- Delivered:
- Not included:
- Validation:
- Local docs:
- Downstream unblocked:
```

## Guardrails

- Do not close a parent issue when only a child slice is complete.
- Do not mark a child issue done if local tracker/progress says `Doing` or if completed lifecycle docs remain outside archive without an explicit exception.
- Do not update only local docs when the GitHub issue is the requested tracker.
- Do not use GitHub issue text as the frozen contract for public route or DTO changes; link to the local baseline and route inventory instead.
