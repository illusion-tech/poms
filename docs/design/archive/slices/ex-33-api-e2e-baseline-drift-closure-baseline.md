# EX-33 API E2E 基线漂移收口实施基线

- Gate Status: `G1 = Pass`
- Parent: `EX-32`
- Owner: `Codex`
- Slice Type: `test-governance / e2e-baseline`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-33`

## 1. 范围

- 本次目标:
  1. 关闭 `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS`：修复 `poms-api-e2e` 合同 workflow fixture，使合同激活前的商业放行基线包含后端要求的核心合同条款。
  2. 关闭 `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE`：修复 `poms-api-e2e` 的 Nx project tag / module-boundary 基线，使 full e2e lint 不再因项目无 tag 失败。
  3. 保留 `EX-32` 已交付的 Lead -> Project runtime 语义，不重写或放宽后端业务规则。
- 本次明确不做:
  1. 不新增或修改 public API route。
  2. 不修改 shared contract、OpenAPI 或 generated client。
  3. 不修改生产后端服务、实体、migration 或前端页面。
  4. 不删除 legacy `POST /projects` compatibility route。
- 下游可依赖的交付边界:
  1. `poms-api-e2e:eslint:lint` 可作为有效全量 API E2E lint 证据。
  2. `contract-workflow` 不再因为过期 fixture 缺核心商业基线条款而失败。
  3. `EX-32` 的两个剩余 drift 例外可在本片 G4 后从 tracker 清空。

## 2. 当前事实

| Fact                         | Evidence                                                                                                                                                 | Result                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Full API E2E lint            | `corepack pnpm nx run poms-api-e2e:eslint:lint`                                                                                                          | Fail                           |
| Lint primary failure         | `apps/poms-api-e2e` project has no tags, but support helpers import `@poms/shared-contracts` and `@poms/api-contracts`                                   | `existing-baseline-drift`      |
| Contract workflow            | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=contract-workflow`                                                                                 | Fail, `1 failed / 6 passed`    |
| Contract activation failure  | `Commercial release baseline missing core contract terms: amountTaxInclusive, amountTaxExclusive, taxRate, downPaymentRate, retentionRate, paymentTerms` | `existing-baseline-drift`      |
| Focused Lead workflow status | `EX-32` G4 close-out                                                                                                                                     | Pass; not the failing surface. |

## 3. 正式输入

| Input Type         | Document / Source                                                              | Status      | Notes                                                                                  |
| ------------------ | ------------------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------- |
| Parent close-out   | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g4-closeout.md`   | `committed` | 记录 `EX32-D1` / `EX32-D2` 是既有基线漂移，不阻断 `EX-32` runtime。                    |
| Parent G3          | `docs/design/archive/slices/ex-32-lead-to-project-conversion-g3-checkpoint.md` | `committed` | 明确 full e2e / full e2e lint 的失败面与 Lead workflow 无关。                          |
| Nx boundary rules  | `eslint.config.mjs`                                                            | `active`    | `type:app` 可依赖 `type:contracts`；`scope:api` 可依赖 `scope:api` 和 `scope:shared`。 |
| API E2E project    | `apps/poms-api-e2e/project.json`                                               | `active`    | 当前缺少 tags，是 module-boundary failure 的直接原因。                                 |
| Contract fixture   | `apps/poms-api-e2e/src/support/test-data.ts`                                   | `active`    | `buildCommercialReleaseBaselineInput` 当前未填核心合同条款字段。                       |
| Runtime validation | `apps/poms-api/src/app/features/contract`                                      | `active`    | 激活合同时校验商业放行基线核心条款完整性；本片不得绕过该校验。                         |

## 4. 实施边界

| Area                    | Change                                                                                                                                 | Allowed |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `poms-api-e2e` metadata | 给 e2e project 增加符合现有 Nx 约束的 `scope:api` / `type:app` tags。                                                                  | Yes     |
| E2E fixture             | 给商业放行基线测试输入补齐 `amountTaxInclusive`、`amountTaxExclusive`、`taxRate`、`downPaymentRate`、`retentionRate`、`paymentTerms`。 | Yes     |
| E2E assertions          | 只在必要时收紧对激活成功和状态的断言，不改业务语义。                                                                                   | Yes     |
| Production runtime      | 后端服务、entity、migration、controller。                                                                                              | No      |
| Public contracts        | shared contract、API DTO、OpenAPI、generated client。                                                                                  | No      |
| Admin frontend          | `poms-admin` 页面、store、route、E2E。                                                                                                 | No      |

## 5. Drift 分类

| Drift ID                                    | Classification            | Closure Rule                                                                                   |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `EX32-D1-FULL-E2E-CONTRACT-BASELINE-TERMS`  | `existing-baseline-drift` | 合同 workflow fixture 补齐核心商业基线条款，并通过 focused contract workflow 与 full API E2E。 |
| `EX32-D2-E2E-LINT-MODULE-BOUNDARY-BASELINE` | `existing-baseline-drift` | e2e project tag 与 import 边界对齐后，full `poms-api-e2e:eslint:lint` 通过。                   |

## 6. 验证计划

| Check                | Required | Command                                                                  | Expected |
| -------------------- | -------- | ------------------------------------------------------------------------ | -------- |
| Full API E2E lint    | `yes`    | `corepack pnpm nx run poms-api-e2e:eslint:lint`                          | Pass     |
| Focused contract E2E | `yes`    | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=contract-workflow` | Pass     |
| Full API E2E         | `yes`    | `corepack pnpm nx e2e poms-api-e2e`                                      | Pass     |
| Markdown format      | `yes`    | `corepack pnpm run format:md:check`                                      | Pass     |
| Diff hygiene         | `yes`    | `git diff --check`                                                       | Pass     |

## 7. G1 结论

- Gate Status: `Pass`
- 本片可进入 `G2`。
- 若修复后 full API E2E 发现新的非合同 workflow failure，必须按实际失败面重分类；不得静默把新 drift 塞进本片。
