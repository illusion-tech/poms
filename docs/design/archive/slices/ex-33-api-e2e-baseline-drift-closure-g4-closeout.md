# EX-33 API E2E 基线漂移收口 G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `EX-32`
- Owner: `Codex`
- Slice Type: `test-governance / e2e-baseline`
- G4 Date: `2026-04-25`
- Runtime Commit: `f33c98d test(e2e): 收敛 API E2E 基线漂移并修复合同 workflow 失败`
- Baseline: `docs/design/archive/slices/ex-33-api-e2e-baseline-drift-closure-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-33-api-e2e-baseline-drift-closure-g3-checkpoint.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-33`

## 1. Delivered Boundary

- `poms-api-e2e` project metadata now has `scope:api` / `type:app` tags, so its support helpers can legally depend on `@poms/shared-contracts` and `@poms/api-contracts` under the repository Nx module-boundary rules.
- Contract workflow e2e commercial baseline fixtures now include:
  - `amountTaxInclusive`
  - `amountTaxExclusive`
  - `taxRate`
  - `downPaymentRate`
  - `retentionRate`
  - `paymentTerms`
- No production backend runtime, public API route, shared contract, OpenAPI, generated client, migration or admin frontend behavior was changed.

## 2. Validation Evidence

| Check                | Result | Evidence                                                                            |
| -------------------- | ------ | ----------------------------------------------------------------------------------- |
| Runtime commit       | `Pass` | `f33c98d`                                                                           |
| Full API E2E lint    | `Pass` | `corepack pnpm nx run poms-api-e2e:eslint:lint`                                     |
| Focused contract E2E | `Pass` | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=contract-workflow`，`7 tests` |
| Full API E2E         | `Pass` | `corepack pnpm nx e2e poms-api-e2e`，`12 suites / 69 tests`                         |
| Markdown hygiene     | `Pass` | `corepack pnpm run format:md:check`                                                 |
| Diff hygiene         | `Pass` | `git diff --check`                                                                  |

## 3. Exception Closure

| Exception ID                                | G4 Decision | Closure Evidence                                                                                      |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS`  | Closed      | Contract workflow and full API E2E now pass with complete commercial baseline terms in test fixtures. |
| `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE` | Closed      | Full API E2E lint exits successfully after `poms-api-e2e` project tags were aligned.                  |

## 4. Remaining Notes

- `poms-api-e2e:eslint:lint` still reports existing warnings for non-null assertions and unused eslint-disable comments, but no lint errors remain.
- These warnings are not part of `EX-32` / `EX-33` blocker closure and should be handled by a separate low-risk cleanup only if the team wants a warning-free e2e lint target.

## 5. G4 Conclusion

- `EX-33` delivered boundary matches its G1 baseline and G3 checkpoint.
- `EX32-D1` and `EX32-D2` are closed.
- `EX-32` no longer carries open tracker exceptions.
