# EX-40 Phase 2 归档例外复扫与当前 Backlog 收口 G1 Baseline

- Task ID: `EX-40`
- Date: 2026-04-29
- Owner: Codex
- Slice Type: process-only / governance reconciliation
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-40`
- Formal Inputs:
  - `docs/design/phase2-development-execution-tracker.md`
  - `docs/design/poms-design-progress.md`
  - `docs/design/archive/slices/*`

---

## 1. Scope

`EX-40` verifies whether the Phase 2 execution board still has actionable open tasks or exceptions after `EX-38` / `EX-39` G4.

This slice must distinguish:

1. current tracker rows that are actually `Todo` / `Doing` / `Blocked`;
2. current tracker exception cells that still contain open exception IDs;
3. archived baseline / checkpoint / close-out documents that preserve historical `Open downstream` wording but were closed by later slices;
4. accepted future boundaries that should not automatically become current executable tasks.

---

## 2. Out Of Scope

1. No runtime code changes.
2. No frontend changes.
3. No API, DTO, OpenAPI, generated client, permission, DDL, migration, or test fixture changes.
4. No rewrite of historical archived slice documents; archive files keep the state known at the time of that slice.
5. No creation of new implementation tasks unless a still-open, current, executable blocker is found.

---

## 3. Reconciliation Rules

| Signal                                | Treatment                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Current tracker row status is open    | Must be treated as actionable current backlog.                             |
| Current tracker exception cell has ID | Must be treated as actionable unless explicitly closed in a later row.     |
| Archived baseline says `Open`         | Historical input only; verify later G4 records before treating as current. |
| Archived G4 says `Open downstream`    | Candidate only; verify whether later tracker / progress records close it.  |
| Archived G4 says `Accepted boundary`  | Not a current task unless product / governance priority reopens it.        |
| Current progress note says closed     | Use as close-out evidence when supported by tracker and G4 artifacts.      |

---

## 4. Expected Evidence

| Evidence                          | Required |
| --------------------------------- | -------- |
| Current tracker open row scan     | Yes      |
| Current tracker exception scan    | Yes      |
| Archive stale-open classification | Yes      |
| Progress update                   | Yes      |
| Markdown check                    | Yes      |
| `git diff --check`                | Yes      |

---

## 5. G1 Decision

`EX-40` can enter process-only implementation.

If no actionable open task remains, close `EX-40` as `Done / G4` and record that the next step must be a new product/design priority decision rather than continuing an existing Phase 2 execution item.
