# FE-37 Admin 模板 / Demo Severity 字面量清理 G3 检查点

- Gate Status: `G3 = Pass`
- Task ID: `FE-37`
- Owner: `Codex`
- Slice Type: `process-only / docs-only`
- Checkpoint Date: `2026-04-27`
- Baseline: `docs/design/archive/slices/fe-37-admin-template-demo-severity-literals-baseline.md`

## 1. Scope Summary

本地复核结论:

1. `FE35-E1-DEMO-SEVERITY-LITERALS` 不应通过批量代码迁移关闭。Poseidon demo / uikit 页保留 PrimeNG 原始 severity literal 是合理的，因为这些页面承担模板 / 示例职责。
2. `FE35-E2-NON-POMS-TEMPLATE-PAGES` 不应在没有产品化基线的情况下清理。`cms`、`files`、`tasklist`、dashboard template widgets 等页面尚未冻结为 POMS 主业务页面，当前批量替换只会制造无业务语义的 churn。
3. POMS 主业务状态映射仍按 `FE-35` 输出治理: 已知状态使用严格字面量 union helper；DTO plain string 字段必须显式使用 fallback helper。
4. 本片不修改 runtime code，因此不改变 UI 行为、权限、store、route、generated client 或 API。

## 2. Search Evidence

剩余 severity literal 主要分布在以下范围:

| Area                                | Evidence                                                                                | G3 Classification                               |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Poseidon / PrimeNG demo             | `apps/poms-admin/src/app/demo/**`，包括 uikit table/button/message/panel/overlay demo   | Accepted retention                              |
| Non-POMS template pages             | `features/cms`、`features/files`、`features/tasklist`                                   | Accepted retention until productization/removal |
| Dashboard / layout template widgets | dashboard ecommerce / banking / marketing widgets、`layout/components/app.rightmenu.ts` | Keep unless carrying POMS domain status         |
| POMS business status mapping        | 已由 `FE-35` 主业务页面迁移到 `status-presentation.ts` / feature helper                 | Controlled by existing helper                   |

## 3. Alignment

| Edge                            | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| Document -> code                | Pass. 本片只归档范围判断，不要求运行时代码变更。      |
| Public route inventory -> route | N/A. 不触及 public route surface。                    |
| Route -> command                | N/A. 不改 command。                                   |
| DTO / contract -> view          | N/A. 不改 DTO、generated client 或 view consumption。 |
| Query -> view                   | N/A. 不改 query 或 store。                            |
| Guard / permission              | N/A. 不改权限。                                       |
| Runtime behavior                | Unchanged.                                            |

## 4. Validation

| Check                               | Required | Result       | Notes                                          |
| ----------------------------------- | -------- | ------------ | ---------------------------------------------- |
| `corepack pnpm run format:md:check` | Yes      | Pass         | Markdown table formatting check passed.        |
| `git diff --check`                  | Yes      | Pass         | No whitespace errors.                          |
| `corepack pnpm nx lint poms-admin`  | No       | Not required | 本片不改 TypeScript / Angular template / CSS。 |
| `corepack pnpm nx build poms-admin` | No       | Not required | 本片不改 runtime code。                        |
| E2E                                 | No       | Not required | 没有 UI 行为变化。                             |
| `shared-api-client:check`           | No       | Not required | 不改 OpenAPI / generated client。              |
| `migration-check`                   | No       | Not required | 不改 persistence。                             |

## 5. Drift And Exceptions

| Item                                     | Classification            | Decision                                                             |
| ---------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| Demo / uikit severity literals           | `existing-baseline-drift` | Accepted for closure; demo preserves PrimeNG literal API examples.   |
| Non-POMS template page severity literals | `existing-baseline-drift` | Accepted for closure; handle only if page is productized or removed. |
| Business status mapping literals         | Controlled                | Governed by `FE-35`; new business mappings must use strict helper.   |
| New drift introduced                     | None                      | Docs/process-only change.                                            |

## 6. Decision

- Can commit to main: yes.
- Can mark tracker `Done`: no, not until this checkpoint and tracker/progress updates are committed.
- Can close `FE35-E1` / `FE35-E2` at G4: yes, after commit.
