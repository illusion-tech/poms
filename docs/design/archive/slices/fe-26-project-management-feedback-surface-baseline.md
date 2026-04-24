# FE-26 项目管理反馈态组件化收口实施基线包

- Gate Status: `G1 = Pass`
- Parent: `FE-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-26`

## 1. 范围

- 本次目标:
  1. 关闭 `FE17-E1-FEEDBACK-COMPONENT-SCOPE`。
  2. 把项目管理范围内仍由手写 warning/error/not-found block 表达的反馈态迁移到共享 `WorkspaceFeedback`。
  3. 保留 PrimeNG Toast、PrimeNG table emptymessage/loadingbody 与字段级 inline validation 的现有职责，不混成页面级反馈组件。
- 本次明确不做:
  1. 不新增或修改 API、DTO、generated client、DDL、route 或权限 guard。
  2. 不重做项目详情全部业务事实卡片；普通 fact card 不是本片的 feedback surface。
  3. 不重做合同、平台、个人中心等非项目管理范围页面。
  4. 不改变提成操作、项目创建或项目编辑的业务行为。

## 2. 正式输入

| Input Type   | Document / Source                                                                             | Status        | Notes                                                                     |
| ------------ | --------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| UI review    | `FE-17` review findings                                                                       | `active`      | 原 finding 要求 loading / feedback states 使用 PrimeNG / shared wrapper。 |
| Baseline     | `fe-17-project-management-primeng-table-baseline.md`                                          | `accepted`    | `FE17-E1` 明确保留为后续 UI baseline 治理。                               |
| Shared UI    | `WorkspaceFeedback`                                                                           | `implemented` | 基于 PrimeNG `p-message`，已被工作区读取页消费。                          |
| Runtime fact | `project-list.ts`、`project-detail.ts`、`project-workspace-shell.ts`、`project-commission.ts` | `fact`        | 仍存在少量手写错误 / 未找到 / 阻断提示。                                  |

## 3. 本次 SSOT

| Concern            | SSOT                                       | Implementation Rule                                           |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------- |
| Feedback component | `WorkspaceFeedback`                        | 页面级错误、未找到、阻断、空事实提示优先使用 shared wrapper。 |
| Business fact card | Existing page layout + `WorkspaceFactGrid` | 普通事实卡片保留，不强行 Message 化。                         |
| Form validation    | PrimeNG input + inline validation          | 字段必填提示仍贴近输入，不提升为页面级反馈。                  |
| Toast              | PrimeNG `MessageService` / `ToastModule`   | 操作结果 toast 不迁移到 `WorkspaceFeedback`。                 |

## 4. 实施边界

| File                         | Required Change                                                                                      | Out Of Scope                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `project-list.ts`            | 新建项目失败态迁移到 `WorkspaceFeedback`。                                                           | 不改 table filtering、创建命令字段或权限。 |
| `project-detail.ts`          | 阻断原因、无阻断、关闭原因、审批摘要状态、投标空态、编辑失败与项目未找到迁移到 `WorkspaceFeedback`。 | 不重做详情 fact card 布局。                |
| `project-workspace-shell.ts` | 项目未找到迁移到 `WorkspaceFeedback`。                                                               | 不改 guidance query、nav 或 route。        |
| `project-commission.ts`      | 提成操作页项目未找到迁移到 `WorkspaceFeedback`。                                                     | 不改提成表格、行操作或 toast。             |

## 5. 测试计划

| Check              | Required       | Command / Evidence                                                                                                                                                                  |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused unit tests | `yes`          | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-list.spec.ts --testPathPatterns=project-detail.spec.ts --testPathPatterns=project-workspace-shell.spec.ts` |
| Lint               | `yes`          | `corepack pnpm nx lint poms-admin`                                                                                                                                                  |
| Build              | `yes`          | `corepack pnpm nx build poms-admin`                                                                                                                                                 |
| Markdown format    | `yes`          | `corepack pnpm run format:md:check`                                                                                                                                                 |
| Diff hygiene       | `yes`          | `git diff --check`                                                                                                                                                                  |
| E2E                | `not required` | 本片不改路由、入口链、权限或用户流程，只改反馈组件呈现。                                                                                                                            |

## 6. 例外与风险

| Exception ID                       | Level | Scope                        | Decision                                       |
| ---------------------------------- | ----- | ---------------------------- | ---------------------------------------------- |
| `FE17-E1-FEEDBACK-COMPONENT-SCOPE` | `low` | `FE-17` 未全量替换业务提示框 | 本片完成项目管理 feedback surface 收口后关闭。 |

## 7. G1 结论

- Gate Status: `Pass`
- 本片可以进入实现。
- 下游不得把本片解释为“所有详情 fact card 都必须改为 Message”；事实呈现与反馈态仍应分工。
