# FE-34 招投标 / 商务竞标写入体验产品化 G3/G4 Close-out

- Gate Status: `G3 = Pass`, `G4 = Pass`
- Task ID: `FE-34`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G4 Reviewer: `Codex`
- Close-out Date: `2026-04-27`
- Runtime Commit: `86c9ca1 feat(project): 完成 FE-34 投标商业写入前端闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-34`

## 1. Delivered Boundary

本片已交付:

1. 招投标 / 商务竞标工作区新增 `allowedActions` 控制的创建与编辑入口。
2. 招投标 / 商务竞标编辑语义落为 edit-as-new-version：预填当前过程，通过既有 `POST /projects/{projectId}/bid-commercial-processes` 提交新的 current version。
3. 招投标 / 商务竞标表单覆盖:
   - `tenderNo`
   - `bidPackageNo`
   - `bidMode`
   - `currentStage`
   - `decision`
   - `resultStatus`
   - `processSummary`
   - `decisionSummary`
   - `resultSummary`
   - `ownerRole`
   - `materialItems`
   - `timelineItems`
4. 报价 / 毛利评审工作区新增 `allowedActions` 与技术成本前置事实控制的创建与编辑入口。
5. 报价 / 毛利评审编辑语义落为 edit-as-new-version：预填当前评审，通过既有 `POST /projects/{projectId}/pricing-margin-reviews` 提交新的 current version。
6. 报价 / 毛利评审表单覆盖报价路径、报价版本、金额、税率、税务条件、回款条件、毛利率、毛利区间、评审结论、责任角色和条件项。
7. `ProjectWorkspaceStore` 新增 bid-commercial / pricing-margin create command wrapper 与 saving 状态，提交成功后刷新对应 workspace projection。
8. Summary enum -> create request enum 使用显式转换函数，不放宽成 plain string。
9. 登录后入口链验证覆盖从项目详情按钮进入工作区，再进入 bid / pricing 写入弹窗并提交。

本片未交付:

1. 不新增后端 API、OpenAPI、DTO、generated client 或 DDL。
2. 不实现 in-place update、PATCH、PUT 或删除历史版本。
3. 不新增附件上传、标书文件库、商务文件归档、审批流、报价放行流程或合同生成流程。
4. 不新增版本历史列表主体验；当前版本历史展示仍作为 future audit/history enhancement。

## 2. Validation Evidence

| Check             | Command / Evidence                                                                                                                                                       | Result                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Bid page unit     | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-bid-commercial-workspace`                                                                       | Passed                  |
| Pricing page unit | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-pricing-margin-workspace`                                                                       | Passed                  |
| Store unit        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`                                                                                | Passed                  |
| Admin lint        | `corepack pnpm nx lint poms-admin`                                                                                                                                       | Passed                  |
| Data-access lint  | `corepack pnpm nx lint admin-data-access`                                                                                                                                | Passed                  |
| Admin build       | `corepack pnpm nx build poms-admin`                                                                                                                                      | Passed                  |
| Targeted E2E      | `POMS_E2E_PORT_SEED=434 POMS_E2E_LOOPBACK_HOST=127.0.0.1 playwright ... project-workspace.journey.spec.ts -g "admin can open bid and pricing write dialogs" --workers=1` | Passed                  |
| Markdown check    | `corepack pnpm run format:md:check`                                                                                                                                      | Pending final doc check |
| Diff hygiene      | `git diff --check`                                                                                                                                                       | Pending final doc check |

Full admin E2E was not rerun for G4 because this frontend slice already has focused page/store coverage, build/lint, and a targeted login-to-write-entry journey. No public API or generated-client change was made.

## 3. Exception Closure

| Exception ID                         | Status                | Resolution                                                                                                                 |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `FE30-E1-BID-WRITE-ENTRY-DEFERRED`   | Closed                | FE-34 delivered bid-commercial and pricing-margin write entries, edit prefill, submit and workspace refresh.               |
| `FE34-E1-APPEND-ONLY-EDIT-SEMANTICS` | Closed                | UI copy and implementation use replacement-version semantics through existing POST; no in-place overwrite is exposed.      |
| `FE34-E2-PRICING-UPSTREAM-FACTS`     | Closed                | Pricing write entry requires `technicalCostPackage`; absent prerequisite leaves the workspace read-only with explanation.  |
| `FE34-E3-HISTORY-LIST-NOT-PRIMARY`   | Accepted future scope | Version history list is not required for FE-34 closure; future audit/history enhancement may consume existing list routes. |

## 4. Alignment Result

| Edge                         | Result  | Notes                                                                               |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------- |
| Document -> code             | Aligned | Implementation follows FE-34 G1 baseline and G3 checkpoint.                         |
| Public route surface         | Aligned | No new route surface; existing generated client POST/workspace routes are consumed. |
| DTO / contract -> view model | Aligned | Forms derive request shape from generated DTOs and exported generated enum types.   |
| Query -> view                | Aligned | Submit success reloads authoritative workspace projection.                          |
| Guard / permission           | Aligned | Write entry visibility consumes workspace `allowedActions`.                         |
| Version semantics            | Aligned | Edit submits a complete replacement version through existing POST.                  |

## 5. G4 Decision

`FE-34` is `Done`.

Downstream work can rely on:

1. Bid-commercial and pricing-margin workspaces now have productized frontend write entries.
2. Edit-as-new-version semantics are the frontend baseline for these two workspaces.
3. `ProjectWorkspaceStore` is the admin data-access boundary for bid-commercial / pricing-margin create commands.
4. `FE30-E1-BID-WRITE-ENTRY-DEFERRED` is closed.

Remaining future scope:

1. Version history / audit list productization, if needed.
2. Rich date controls and file attachments, if those become formal requirements in a future slice.
