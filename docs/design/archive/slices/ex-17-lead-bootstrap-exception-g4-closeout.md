# EX-17 EX17-E2 Lead Bootstrap Exception G4 Close-out

- Gate Status: `Pass`
- Parent Task: `EX-17`
- Exception ID: `EX17-E2-LEAD-BOOTSTRAP`
- Owner: `Codex`
- G4 Date: `2026-04-25`
- Closing Runtime Commits:
  - `c415a4c` `EX-31` Lead minimal fact source
  - `e705355` `EX-32` Lead -> Project conversion command
  - `ff81c11` `FE-27/28/29` frontend entry, conversion UX and browser validation
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-17`

## 1. Original Exception

`EX17-E2-LEAD-BOOTSTRAP` was opened because `POST /projects` still allowed direct project bootstrap while the formal Lead object, Lead -> Project command and frontend Lead bootstrap journey did not yet exist.

## 2. Closure Evidence

| Layer                   | Evidence                                                                                  | Result |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------ |
| Route governance        | `EX-30` froze Lead canonical routes and implementation sequence.                          | Pass   |
| Lead fact source        | `EX-31` delivered Lead persistence, read/write API and generated client.                  | Pass   |
| Lead -> Project command | `EX-32` delivered `POST /leads/{id}:convertToProject`, source mapping and dual summaries. | Pass   |
| Frontend Lead entry     | `FE-27` delivered `/leads`, LeadStore, navigation and project list Lead entry.            | Pass   |
| Frontend conversion UX  | `FE-28` delivered effective Lead conversion, project detail jump and source Lead summary. | Pass   |
| Browser journey         | `FE-29` delivered menu, project button, direct URL and permission browser evidence.       | Pass   |
| Runtime commit          | `ff81c11 feat(lead): 完善线索转项目前端闭环`                                              | Pass   |

## 3. Remaining Legacy Surface

- `POST /projects` remains available as a legacy/dev/test compatibility route.
- This is no longer a blocker for `EX17-E2` because:
  1. formal frontend users no longer receive direct Project create as the main project creation entry;
  2. browser evidence proves the UI chain creates projects from qualified Leads;
  3. Project detail now displays source Lead summary for converted projects.

## 4. G4 Decision

- `EX17-E2-LEAD-BOOTSTRAP` is closed.
- `EX-17` no longer carries a Lead bootstrap blocker.
- Any future removal or hard deprecation of `POST /projects` should be tracked as a separate compatibility cleanup, not as an open Phase 2 frontend blocker.
