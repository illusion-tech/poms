# FE-31 项目归档撤销 / 替代前端入口与审计呈现基线

- Gate Status: `G1 = Pass`
- Parent: `EX-34A`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-31`

## 1. 范围

本次目标:

1. 在项目详情页的项目归档区域加载 `GET /projects/{projectId}/archive-records`，展示 current 与非 current 归档记录。
2. 对 current `recorded` 归档记录提供“替代归档”和“撤销归档”入口。
3. 替代 / 撤销命令必须带上归档记录 `rowVersion` 作为 `expectedVersion`，不得前端绕过并发保护。
4. 非 current 记录必须展示 `voided` / `superseded` 状态、替代原因、撤销原因和审计时间 / 操作人。
5. 补充前端 store、详情页单测和目标浏览器验证，确认登录后从项目详情可看到归档审计区域和动作入口。

本次明确不做:

1. 不新增后端 API、OpenAPI、generated client 或 public route inventory。
2. 不新增归档附件、审批复核、多级撤销确认或归档创建入口。
3. 不改变归档仍是终态附属 milestone 的语义，不新增生命周期 stage。
4. 不在前端伪造归档状态，不从 timeline event 推导全量归档历史。
5. 不处理历史兼容；当前系统处于开发期，直接消费 `EX-34A` 已生成的 DTO。

下游可依赖的交付边界:

1. 项目详情页能展示归档记录版本链和撤销 / 替代审计信息。
2. 项目详情页能对 current `recorded` 记录触发 replace / void 命令。
3. 命令成功后会刷新项目详情、生命周期 timeline 和归档记录列表。
4. `EX34A-E1-NO-FRONTEND-ENTRY` 与 `EX34-E2-FRONTEND-DEFERRED` 可在本片 G4 关闭。

## 2. 正式输入

| Input Type        | Document / Source                                                                                  | Section / Anchor                             | Status | Notes                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------ | ----------------------------------------------------------- |
| Backend runtime   | `docs/design/archive/slices/ex-34a-project-archive-reversal-replacement-runtime-g3-g4-closeout.md` | delivered scope / transferred exception      | G4     | replace / void / list route 和 generated client 已完成。    |
| Backend baseline  | `docs/design/archive/slices/ex-34a-project-archive-reversal-replacement-runtime-baseline.md`       | command / query / status machine             | G4     | 冻结 `recorded` / `voided` / `superseded` 与 current 语义。 |
| Frontend baseline | `docs/design/archive/slices/fe-24-project-archive-milestone-frontend-baseline.md`                  | archive panel rendering rules                | G4     | 项目详情已存在终态 archive panel。                          |
| Generated client  | `libs/shared/api-client/api/project.service.ts`                                                    | archive record list / replace / void methods | Fact   | 本片只消费已有生成客户端。                                  |
| Current UI        | `apps/poms-admin/src/app/features/project/project-detail.ts`                                       | project archive section                      | Fact   | 当前只消费 timeline milestone，无历史和动作入口。           |
| Current store     | `libs/admin/data-access/src/lib/project/project.store.ts`                                          | selected project / timeline state            | Fact   | 需要补归档记录 state 和命令方法。                           |

## 3. 本次 SSOT

| Concern             | SSOT                                         | Implementation Rule                                                                         |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Archive status      | `ProjectArchiveRecordSummary.status`         | `recorded` 是 current；`voided` / `superseded` 只能作为审计历史展示。                       |
| Command identity    | archive record `id`                          | replace / void path id 指向被替代或被撤销的归档记录。                                       |
| Concurrency         | archive record `rowVersion`                  | 前端提交 `expectedVersion: record.rowVersion`，不手填、不省略。                             |
| Date / time         | generated client ISO datetime strings        | 表单输入转为 ISO datetime；展示用本地详情页既有 `yyyy-MM-dd HH:mm` 口径。                   |
| Permission boundary | backend `project:write` + detail action gate | UI 只做显隐和防误点；后端 guard 与 command precondition 是最终授权边界。                    |
| User-facing copy    | product Chinese copy                         | 不展示 `recorded`、`voided`、`superseded`、`expectedVersion` 等内部 key。                   |
| Visual pattern      | existing project detail + PrimeNG            | 继续使用 `SectionCard`、`WorkspaceFeedback`、`p-tag`、`p-button`、`p-dialog`、`pTextarea`。 |

## 4. 页面与组件边界

| Surface                                                           | Change Type        | Data Source / Action                                                | Result  |
| ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- | ------- |
| `libs/admin/data-access/src/lib/project/project.store.ts`         | data-access state  | generated client list / replace / void                              | Planned |
| `apps/poms-admin/src/app/features/project/project-detail.ts`      | UI / interaction   | archive records, command dialogs, permission visibility, feedback   | Planned |
| `apps/poms-admin/src/app/features/project/project-detail.spec.ts` | unit verification  | archive history rendering, action visibility, expectedVersion calls | Planned |
| `apps/poms-admin/src/app/features/project/project-store.spec.ts`  | store verification | generated client method mapping and refresh behavior                | Planned |

### 4.1 呈现规则

1. 终态项目继续显示项目归档区域；非终态项目不新增归档动作入口。
2. 若 `archiveRecords` 中存在 current `recorded` 记录，归档结论优先来自该记录；timeline milestone 继续作为生命周期投影，不负责全量历史。
3. 若无 current `recorded` 记录但存在 `voided` / `superseded` 记录，显示“当前没有有效归档记录”，同时保留历史列表。
4. 历史列表按后端返回顺序展示，不在前端重新排序或改写状态。
5. `voided` 记录展示撤销原因、撤销时间和撤销人；`superseded` 记录展示被替代状态；replacement 记录展示替代原因。

### 4.2 交互规则

1. 仅 current `recorded` 记录展示“替代归档”和“撤销归档”。
2. 替代表单需要填写归档时间、归档结论、证据摘要和替代原因。
3. 撤销表单需要填写撤销原因，可填写补充说明。
4. 表单校验失败只停留在前端，不发送命令。
5. 命令失败时显示非破坏性错误反馈；成功后关闭弹窗并刷新 detail / timeline / archive records。

## 5. 接口与读侧边界

| Route / Method                               | Consumer                      | Request Mapping                                                                                      | Response / State                  | Result |
| -------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------- | ------ |
| `GET /projects/{projectId}/archive-records`  | `ProjectStore`                | `projectId` from route                                                                               | `ProjectArchiveRecordSummary[]`   | Frozen |
| `POST /project-archive-records/{id}:replace` | replace dialog                | `archivedAt`、`archiveSummary`、`evidenceSummary`、`replacementReason`、`expectedVersion=rowVersion` | `ProjectArchiveRecordSummary`     | Frozen |
| `POST /project-archive-records/{id}:void`    | void dialog                   | `reason`、`comment?`、`expectedVersion=rowVersion`                                                   | `ProjectArchiveRecordSummary`     | Frozen |
| `GET /projects/{projectId}/timeline`         | lifecycle / archive milestone | existing call                                                                                        | current `recorded` milestone only | Frozen |

Public API route surface: no changes.

## 6. 权限与可见性

| Boundary       | Rule                                                      | Notes                              |
| -------------- | --------------------------------------------------------- | ---------------------------------- |
| Route guard    | 继续沿用项目详情既有 `project:read` 入口。                | 本片不改 routing。                 |
| Command guard  | 后端 `project:write` 是 replace / void 的最终守卫。       | 前端不能视为授权来源。             |
| UI visibility  | 需要同时满足 current `recorded` 记录和现有详情动作 gate。 | 见 `FE31-E1-DETAIL-ACTION-PROXY`。 |
| Error handling | 后端拒绝或版本冲突时显示错误反馈，不本地改状态。          | 不做乐观更新。                     |

## 7. 测试与校验

| Check                  | Required | Command / Evidence                                                         | Result  | Gap / Reason                  |
| ---------------------- | -------- | -------------------------------------------------------------------------- | ------- | ----------------------------- |
| Diff whitespace        | Yes      | `git diff --check`                                                         | Pending |                               |
| Markdown check         | Yes      | `corepack pnpm run format:md:check`                                        | Pending | docs touched                  |
| Admin data-access lint | Yes      | `corepack pnpm nx lint admin-data-access`                                  | Pending | store touched                 |
| Admin lint             | Yes      | `corepack pnpm nx lint poms-admin`                                         | Pending | page touched                  |
| Admin build            | Yes      | `corepack pnpm nx build poms-admin`                                        | Pending | page touched                  |
| Focused unit tests     | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-` | Pending | detail + store                |
| E2E                    | Yes      | focused admin browser journey or targeted local browser validation         | Pending | entry visibility / audit area |
| OpenAPI / client check | No       | no generated client changes                                                | N/A     |                               |

## 8. 例外与风险

| Exception ID                      | Level | Scope                      | Approved By | Cleanup Owner              | Cleanup Due                             | Notes                                                                                                                                                                                        |
| --------------------------------- | ----- | -------------------------- | ----------- | -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE31-E1-DETAIL-ACTION-PROXY`     | E1    | archive command visibility | Codex       | future object-action slice | Before dedicated archive action rollout | `ProjectDetailView.allowedActions` 目前没有专门的 archive replace / void action key；本片 UI 使用现有详情写动作 gate 做保守显隐，后端 `project:write` 与 command precondition 仍是最终保护。 |
| `FE31-E2-NO-ARCHIVE-CREATE-ENTRY` | E1    | create archive UI          | Codex       | future archive creation UX | When archive creation is productized    | 本片只承接撤销 / 替代和审计呈现，不新增首次创建归档入口。                                                                                                                                    |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. 实现时不得新增 API / DTO / generated client。
  2. replace / void 必须携带 `expectedVersion`。
  3. 命令成功后必须刷新 detail、timeline 和 archive records。
  4. G4 需要明确 `FE31-E1` 是否关闭、转交或保留。
