# EX-58D 核心对象状态历史模型治理基线

- Gate Status: `Pass`
- Parent: `EX-58`
- Owner: `Codex`
- Slice Type: `docs-only / governance`
- G1 Reviewer: `Codex`
- G1 Date: 2026-05-03
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-58D`

## 1. 范围

- 本次目标:
  1. 冻结 Lead / Project / Contract 核心对象的状态历史建模原则。
  2. 明确 current state、transition fact、command result、runtime audit log 的职责边界。
  3. 固定状态历史行必须具备的 `from` / `to`、actor、reason、source command、source record、occurredAt 和 requestId 字段。
  4. 为后续运行时切片提供统一设计输入，避免各模块继续用散落字段或通用审计日志替代业务状态历史。
- 本次明确不做:
  1. 不新增数据库表、迁移、API、generated client 或 Admin 页面。
  2. 不把系统改成通用事件溯源框架。
  3. 不把所有财务台账、附件、跟进记录强行接入统一状态历史。
  4. 不重写现有 Lead / Project / Contract 命令行为。
- 下游可依赖的交付边界:
  - 后续需要补状态历史 runtime 时，必须按本基线建模。
  - 业务状态历史是业务事实查询面，不用 runtime audit log 反推。
- 不允许下游依赖的留白:
  - 不能认为当前代码已经具备完整状态历史表。
  - 不能把 `updatedAt`、`rowVersion` 或 audit log 当作完整业务状态历史。

## 2. 当前状态盘点

| Object   | Current state field                       | Existing source facts                                                                                                                                          | Gap                                                                                                     |
| -------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Lead     | `lead.status`                             | `qualifiedAt/qualifiedBy/qualificationSummary`、`closedAt/closedBy/closedReason`、`convertedAt/convertedBy/convertedProjectId`、`lead_owner_assignment_record` | 有终态事实字段，但没有标准 transition row；owner 变更已有动作记录，不属于 status history。              |
| Project  | `project.status` + `project.currentStage` | `project_owner_reassignment_record`、`acceptance_record`、`project_completion_record`、`project_archive_record`、各 presigning current/superseded package      | 项目完成会改主状态和阶段，但缺少统一 from/to lifecycle transition；归档是独立归档事实，不等同状态流转。 |
| Contract | `contract.status`                         | `approval_record`、`contract_readiness_package`、`contract_term_snapshot`、`commercial_release_baseline`                                                       | `draft -> pending-review -> active` 的来源事实存在，但没有标准 contract status transition row。         |

## 3. 建模原则

1. **当前状态仍在主表。** `lead.status`、`project.status/currentStage`、`contract.status` 是读模型和写前置校验的 current state。
2. **状态历史是 append-only transition fact。** 运行时切片不得通过覆盖旧行、删除旧行或只记录审计日志来表达业务状态变化。
3. **按聚合建表，不做万能事件表。** 推荐 `lead_status_transition`、`project_lifecycle_transition`、`contract_status_transition` 三类专表，保持外键、状态类型和业务字段清晰。
4. **source command 必填。** 每条历史必须能说明由哪个 command 产生，例如 `lead.qualify`、`lead.close`、`lead.convert-to-project`、`project.complete`、`contract.submit-review`、`contract.activate`。
5. **source record 能填则填。** 当状态变化由审批、完成记录、合同条款快照等事实触发时，必须记录 `sourceRecordType/sourceRecordId`。
6. **runtime audit log 只做操作审计。** 它可以记录请求、IP、userAgent 和敏感操作结果，但不能替代业务状态历史查询面。
7. **CommandResult 只返回本次命令结果。** `businessStatusAfter` 是命令输出摘要，不是历史存储。
8. **理由和上下文必须结构化。** 人工关闭、作废、退回等命令必须写 `reason`；系统自动流转必须写 `transitionSummary` 或 source record。
9. **并发前置继续使用 rowVersion。** 命令提交仍必须带当前对象或源事实的 `expectedVersion`；history row 不替代乐观锁。
10. **不做旧值兼容。** 状态和阶段 code 只接受 shared contracts 当前 code value。

## 4. 目标表模型

### 4.1 LeadStatusTransition

| Field               | Type / Meaning       | Required | Notes                                                                  |                                                                  |
| ------------------- | -------------------- | -------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `id`                | uuid                 | Yes      | transition row id                                                      |                                                                  |
| `leadId`            | uuid FK -> `lead.id` | Yes      | 线索                                                                   |                                                                  |
| `fromStatus`        | `LeadStatus \        | null`    | Yes                                                                    | 创建初始状态时可为 null；状态变化必须有值                        |
| `toStatus`          | `LeadStatus`         | Yes      | `registered/qualified/converted/closed`                                |                                                                  |
| `sourceCommand`     | string code          | Yes      | `lead.create`、`lead.qualify`、`lead.close`、`lead.convert-to-project` |                                                                  |
| `sourceRecordType`  | string \             | null     | No                                                                     | 例如 `project`                                                   |
| `sourceRecordId`    | uuid \               | null     | No                                                                     | 转项目时填 project id                                            |
| `reason`            | text \               | null     | Conditional                                                            | `closed` 必填；`qualified/converted` 可为空但要有 source context |
| `transitionSummary` | text \               | null     | No                                                                     | 业务摘要                                                         |
| `occurredAt`        | datetime             | Yes      | 业务发生时间                                                           |                                                                  |
| `actorUserId`       | uuid \               | null     | Yes                                                                    | 系统动作可为空，但必须有 sourceCommand                           |
| `requestId`         | string \             | null     | No                                                                     | HTTP request / command trace id                                  |
| `createdAt`         | datetime             | Yes      | 写入时间                                                               |                                                                  |

### 4.2 ProjectLifecycleTransition

| Field               | Type / Meaning          | Required | Notes                                                                                                             |                                                          |
| ------------------- | ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `id`                | uuid                    | Yes      | transition row id                                                                                                 |                                                          |
| `projectId`         | uuid FK -> `project.id` | Yes      | 项目                                                                                                              |                                                          |
| `fromStatus`        | `ProjectStatus \        | null`    | Yes                                                                                                               | 初始创建可为 null                                        |
| `toStatus`          | `ProjectStatus`         | Yes      | `active/pending-approval/blocked/on-hold/completed/closed`                                                        |                                                          |
| `fromStage`         | `ProjectStage \         | null`    | Yes                                                                                                               | 初始创建可为 null                                        |
| `toStage`           | `ProjectStage`          | Yes      | `assessment` 到 `closed-terminated`                                                                               |                                                          |
| `sourceCommand`     | string code             | Yes      | `project.create`、`project.advance-stage`、`project.block`、`project.complete`、`project.close`、`project.reopen` |                                                          |
| `sourceRecordType`  | string \                | null     | Conditional                                                                                                       | 完成时填 `project-completion-record`；关闭可填 `project` |
| `sourceRecordId`    | uuid \                  | null     | Conditional                                                                                                       | 与 sourceRecordType 配套                                 |
| `reason`            | text \                  | null     | Conditional                                                                                                       | close / block / hold / reopen 必填                       |
| `transitionSummary` | text \                  | null     | No                                                                                                                | 说明阶段或状态变化依据                                   |
| `occurredAt`        | datetime                | Yes      | 业务发生时间                                                                                                      |                                                          |
| `actorUserId`       | uuid \                  | null     | Yes                                                                                                               | 操作人                                                   |
| `requestId`         | string \                | null     | No                                                                                                                | command trace id                                         |
| `createdAt`         | datetime                | Yes      | 写入时间                                                                                                          |                                                          |

规则:

- `fromStatus/toStatus` 和 `fromStage/toStage` 不允许同时无变化。
- 当前 presigning package 的 `effective/superseded` 版本链不是项目阶段历史；只有真正改变 `project.status/currentStage` 的 command 才写该表。
- `project_archive_record` 是归档事实，不是 lifecycle transition；归档页面可以联合展示，但不能把归档记录当作项目状态历史行。

### 4.3 ContractStatusTransition

| Field               | Type / Meaning           | Required | Notes                                                                                                                                   |                                                                                    |
| ------------------- | ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `id`                | uuid                     | Yes      | transition row id                                                                                                                       |                                                                                    |
| `contractId`        | uuid FK -> `contract.id` | Yes      | 合同                                                                                                                                    |                                                                                    |
| `fromStatus`        | `ContractStatus \        | null`    | Yes                                                                                                                                     | 创建初始状态可为 null                                                              |
| `toStatus`          | `ContractStatus`         | Yes      | `draft/pending-review/active/terminated/completed`                                                                                      |                                                                                    |
| `sourceCommand`     | string code              | Yes      | `contract.create`、`contract.submit-review`、`contract.review-rejected`、`contract.activate`、`contract.terminate`、`contract.complete` |                                                                                    |
| `sourceRecordType`  | string \                 | null     | Conditional                                                                                                                             | 审核相关填 `approval-record`；激活填 `contract-term-snapshot` 或 readiness package |
| `sourceRecordId`    | uuid \                   | null     | Conditional                                                                                                                             | 与 sourceRecordType 配套                                                           |
| `reason`            | text \                   | null     | Conditional                                                                                                                             | reject / terminate / complete 必填                                                 |
| `transitionSummary` | text \                   | null     | No                                                                                                                                      | 审批意见或激活摘要                                                                 |
| `occurredAt`        | datetime                 | Yes      | 业务发生时间                                                                                                                            |                                                                                    |
| `actorUserId`       | uuid \                   | null     | Yes                                                                                                                                     | 操作人                                                                             |
| `requestId`         | string \                 | null     | No                                                                                                                                      | command trace id                                                                   |
| `createdAt`         | datetime                 | Yes      | 写入时间                                                                                                                                |                                                                                    |

## 5. 命令接入边界

| Command                        | Current state write                          | Required future transition write             | Source record                  |
| ------------------------------ | -------------------------------------------- | -------------------------------------------- | ------------------------------ |
| `lead.create`                  | `lead.status = registered`                   | `null -> registered`                         | N/A                            |
| `lead.qualify`                 | `registered -> qualified`                    | `registered -> qualified`                    | lead qualification fields      |
| `lead.close`                   | `registered/qualified -> closed`             | previous status -> `closed`                  | close reason on lead           |
| `lead.convert-to-project`      | `qualified -> converted`                     | `qualified -> converted`                     | created project                |
| `project.create`               | `status=active`, `currentStage=assessment`   | `null/null -> active/assessment`             | N/A                            |
| `project.complete`             | `status=completed`, `currentStage=completed` | previous status/stage -> completed/completed | `project-completion-record`    |
| future `project.advance-stage` | changes `currentStage`                       | previous stage -> next stage                 | stage command / source package |
| future `project.close`         | `status=closed`, terminal close stage        | previous status/stage -> closed/closed-*     | close command                  |
| `contract.create`              | `status=draft` or explicit initial status    | `null -> initial status`                     | N/A                            |
| `contract.submit-review`       | `draft -> pending-review`                    | `draft -> pending-review`                    | `approval-record`              |
| `contract.review-rejected`     | `pending-review -> draft`                    | `pending-review -> draft`                    | `approval-record`              |
| `contract.activate`            | `pending-review -> active`                   | `pending-review -> active`                   | `contract-term-snapshot`       |

## 6. 查询边界

| Query                   | Consumer                                            | Required fields                                     | Notes                                       |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- |
| Lead status history     | Lead detail / audit tab                             | transition rows sorted by `occurredAt, createdAt`   | 不从 runtime audit log 拼接。               |
| Project lifecycle       | Project detail / workspace header / archive context | status + stage transitions                          | 可与 archive records 并列展示，但语义分开。 |
| Contract status history | Contract detail / approval context                  | status transitions + source approval/snapshot links | 可跳转到审批记录或条款快照。                |

## 7. 实施顺序建议

1. `EX-58D-RT1`: Lead status transition runtime table and write hooks.
2. `EX-58D-RT2`: Contract status transition runtime table and write hooks.
3. `EX-58D-RT3`: Project lifecycle transition runtime table and write hooks.
4. `FE-Status-History`: Admin detail tabs consume the three query surfaces.

这些是后续运行时切片建议，不属于 EX-58D 本次交付边界。

## 8. 校验要求

| Future runtime check                          | Required                  |
| --------------------------------------------- | ------------------------- |
| Migration / entity DDL parity                 | Yes                       |
| Command unit tests for each transition        | Yes                       |
| Query tests sorted by `occurredAt, createdAt` | Yes                       |
| OpenAPI + generated client                    | Yes                       |
| Admin detail rendering tests                  | Yes, once FE slice starts |

## 9. G1 / G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-05-03
- This docs-only slice freezes the model; no runtime exception is introduced.
- Parent `EX-58` can close after this baseline and the EX-58D closeout are recorded.
