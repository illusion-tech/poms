# EX-33 API E2E 基线漂移收口 G3 Checkpoint

- Gate Status: `G3 = Pass`
- Parent: `EX-32`
- Owner: `Codex`
- Slice Type: `test-governance / e2e-baseline`
- Date: `2026-04-25`
- Baseline: `docs/design/archive/slices/ex-33-api-e2e-baseline-drift-closure-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-33`

## 1. Delivered Boundary

- `apps/poms-api-e2e/project.json` 增加 `scope:api` / `type:app` tags，使 e2e app 在现有 Nx module-boundary 规则下可合法依赖 `scope:api` 与 `scope:shared` contracts。
- `apps/poms-api-e2e/src/support/test-data.ts` 的 `buildCommercialReleaseBaselineInput` 补齐合同激活所需核心商业基线条款:
  - `amountTaxInclusive`
  - `amountTaxExclusive`
  - `taxRate`
  - `downPaymentRate`
  - `retentionRate`
  - `paymentTerms`
- 未修改 production backend runtime、public API、shared contract、OpenAPI、generated client、migration 或 admin frontend。

## 2. Validation Evidence

| Check                | Result | Evidence                                                                 |
| -------------------- | ------ | ------------------------------------------------------------------------ |
| Full API E2E lint    | `Pass` | `corepack pnpm nx run poms-api-e2e:eslint:lint`                          |
| Focused contract E2E | `Pass` | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=contract-workflow` |
| Full API E2E         | `Pass` | `corepack pnpm nx e2e poms-api-e2e`，`12 suites / 69 tests`              |

## 3. Drift / Exception Decision

| Drift ID                                    | Previous Classification      | G3 Decision       | Evidence                                                                                       |
| ------------------------------------------- | ---------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS`  | `existing-baseline-drift`    | Ready to close    | 合同 workflow fixture 已补核心商业基线条款，focused contract workflow 与 full API E2E 均通过。 |
| `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE` | `existing-baseline-drift`    | Ready to close    | full API E2E lint 已无 module-boundary errors，命令退出码为 0。                                |
| Existing e2e lint warnings                  | `existing non-blocking debt` | Not in this slice | full lint 仍输出既有 non-null assertion / unused disable warnings，但不再失败。                |

## 4. G3 Conclusion

- `EX-33` runtime/test boundary matches its G1 baseline.
- `EX32-D1` and `EX32-D2` are ready to close at G4 after this change is committed.
- `EX-32` exception column can be cleared during `EX-33` G4 close-out after commit evidence exists.
