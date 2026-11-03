# EX-15E1 Approval + ContractReadiness canonical route 收口实施基线包

- Gate Status: `Pass`
- Parent: `EX-15E`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15E1`

## 1. 范围

- 本次目标:
  - 把 `Approval` 与 `ContractReadiness` 当前仍保留的 slash-action / page-suffix query 收口到 `ADR-015` canonical route。
  - 同轮回写 inventory、controller、OpenAPI、generated client 与 HTTP E2E 支撑代码。
- 本次明确不做:
  - 不补做 `closeApprovalRecord`、`reassignApprovalRecord` 等尚未实现的审批公共命令。
  - 不处理 `project-cost`、`platform`、`commission` 其余 Batch 2+ 遗留路由。
  - 不引入兼容 alias；本轮默认直接切换。
- 下游可依赖的交付边界:
  - `Approval` 现有 approve / reject 命令以 `POST /approval-records/{id}:approve|reject` 为唯一正式入口。
  - `ContractReadiness` 当前单例 query 与两条 initialization 命令、差异复核命令均以 canonical route 暴露。
- 不允许下游依赖的留白:
  - 不得继续把 `/approval-records/{id}/approve`、`/reject`、`/projects/{projectId}/contract-readiness/current`、`/review-diff`、`/initialize-contract-snapshot`、`/initialize-receivable-plan` 当作正式入口。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor                                         | Status   | Notes                                                                                   |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Business design           | `workflow-and-approval-design.md`                   | §6, §7                                                   | Accepted | 冻结审批对象、待办与审批记录公共语义                                                    |
| Business design           | `phase2-presigning-contract-readiness-workspace.md` | 合同就绪承接主链                                         | Accepted | 冻结 `ContractReadinessPackage` / `CommercialReleaseBaseline` 业务边界                  |
| Command design            | `interface-command-design.md`                       | `CommercialReleaseBaseline` / `ContractReadinessPackage` | Accepted | 初始化与差异复核命令边界已冻结                                                          |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                   | §5.2, §5.4                                               | Accepted | 审批 approve / reject 与 contract-readiness 命令已写成 canonical route                  |
| Query boundary            | `query-view-boundary-design.md`                     | §5.2, §5.4                                               | Accepted | `ContractReadinessDetailView` 与 `TodoItemListView` / `ApprovalRecordDetailView` 已冻结 |
| Data model / table freeze | `EX-05` 已有持久化事实                              | N/A                                                      | N/A      | 本片不新增 persistence 变更                                                             |
| Schema / DDL              | `EX-05` 既有 migration / entity                     | N/A                                                      | N/A      | 本片不涉及 DDL                                                                          |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`       | §4, §6, §7                                               | Accepted | `resource-first + colon-action` 与稳定名词型子资源为 route SSOT                         |

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                    | Implementation Rule                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Business semantics        | `workflow-and-approval-design.md` + `phase2-presigning-contract-readiness-workspace.md` | 不改变审批 / 承接包 / 差异复核业务语义，只做 canonical route 收口                                                 |
| Route / command naming    | `ADR-015` + `interface-openapi-dto-design.md` + 本基线                                  | 多词动作统一切到 `:reviewDiff`、`:initializeContractSnapshot`、`:initializeReceivablePlan`、`:approve`、`:reject` |
| DTO / contract naming     | 现有 `ApproveRecordRequest`、`RejectApprovalRecordRequest`、初始化命令 DTO              | 不改 DTO 名称，不引入新 contract                                                                                  |
| Table / column naming     | N/A                                                                                     | 不改 persistence                                                                                                  |
| Date / time semantics     | 现有 shared contract                                                                    | 不改日期语义                                                                                                      |
| Identifier semantics      | 现有 `ApprovalRecord.id`、`CommercialReleaseBaseline.id`、`ContractReadinessPackage.id` | item route 继续使用稳定全局主键                                                                                   |
| Money / decimal semantics | N/A                                                                                     | 本片不触达金额语义                                                                                                |
| Status machine            | 现有审批 / 签约就绪状态机                                                               | 只改入口，不改状态推进规则                                                                                        |

## 4. 命令与接口边界

| Route / Controller                                                  | Command / Service                                              | Request DTO / Contract                                           | Response DTO / Contract              | Guard / Permission | Design Source                          | Result   |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ | ------------------ | -------------------------------------- | -------- |
| `POST /approval-records/{id}:approve`                               | `ApprovalService.approveRecord`                                | `ApproveRecordRequestDto` / `ApproveRecordRequest`               | `CommandResultDto` / `CommandResult` | `project:write`    | `interface-openapi-dto-design.md` §5.4 | 本轮切换 |
| `POST /approval-records/{id}:reject`                                | `ApprovalService.rejectRecord`                                 | `RejectApprovalRecordRequestDto` / `RejectApprovalRecordRequest` | `CommandResultDto` / `CommandResult` | `project:write`    | `interface-openapi-dto-design.md` §5.4 | 本轮切换 |
| `POST /commercial-release-baselines/{id}:reviewDiff`                | `ContractReadinessService.reviewCommercialReleaseBaselineDiff` | `ReviewCommercialReleaseBaselineDiffRequestDto`                  | `CommercialDiffReviewResultDto`      | `project:write`    | `interface-openapi-dto-design.md` §5.2 | 本轮切换 |
| `POST /contract-readiness-packages/{id}:initializeContractSnapshot` | `ContractReadinessService.initializeContractSnapshot`          | `InitializeContractSnapshotFromReadinessPackageRequestDto`       | `ReadinessInitializationResultDto`   | `project:write`    | `interface-openapi-dto-design.md` §5.2 | 本轮切换 |
| `POST /contract-readiness-packages/{id}:initializeReceivablePlan`   | `ContractReadinessService.initializeReceivablePlan`            | `InitializeReceivablePlanFromReadinessPackageRequestDto`         | `ReadinessInitializationResultDto`   | `project:write`    | `interface-openapi-dto-design.md` §5.2 | 本轮切换 |

## 5. 读侧边界

| Query / View                                                                            | Consumer                                 | Fields                                                                                             | Filter / Sort           | Permission Boundary | Design Source                                                       | Result   |
| --------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------- | ------------------- | ------------------------------------------------------------------- | -------- |
| `GET /approval-records/{id}` / `ApprovalRecordDetailView`                               | 审批追溯页、待办跳转入口                 | 当前状态、节点进度、处理历史、关联对象摘要、`summarySnapshotId`、`projectionLevel`、`exportPolicy` | by `approvalRecordId`   | `project:read`      | `query-view-boundary-design.md` §5.4                                | 保持     |
| `GET /me/todos` / `TodoItemListView`                                                    | 统一待办入口                             | `todoId`、`todoType`、`targetType`、`targetId`、`currentNodeName`、`allowedActions`                | current user open todos | authenticated       | `query-view-boundary-design.md` §5.4                                | 保持     |
| `GET /projects/{projectId}/contract-readiness` / `ContractReadinessDetailView`          | 签约就绪当前单例页、合同初始化前阻断解释 | 承接包摘要、差异等级、初始化状态、阻断原因、`currentEffectiveDecisionSummary`、`allowedActions`    | by `projectId`          | `project:read`      | `ADR-015` stable subresource + `query-view-boundary-design.md` §5.2 | 本轮切换 |
| `GET /commercial-release-baselines/{id}` / `CommercialReleaseBaselineDto`               | 商业放行基线详情                         | 基线摘要、最新差异等级、当前 review 状态                                                           | by `baselineId`         | `project:read`      | `EX-05` 既有设计                                                    | 保持     |
| `GET /commercial-release-baselines/{id}/diff-history` / `ContractDiffReviewHistoryView` | 差异复核历史                             | 差异字段摘要、差异等级、复核结论、处理人、处理时间                                                 | by `baselineId`         | `project:read`      | `query-view-boundary-design.md` §5.2                                | 保持     |
| `GET /contract-readiness-packages/{id}` / `ContractReadinessDetailView`                 | 承接包详情 / 初始化结果回看              | 承接包摘要、阻断原因、初始化状态、`allowedActions`                                                 | by `readinessPackageId` | `project:read`      | `query-view-boundary-design.md` §5.2                                | 保持     |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result           |
| ----- | --------- | ------------------- | ------------------- | ---------------------- |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片不涉及 persistence |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | 本片不新增字段        | `N/A`           | `N/A`  | `N/A`                     | 保持   |

## 7. 一致性结论

- Document -> code: `Approval` / `ContractReadiness` 当前 route drift 由本片统一按 canonical route 收口。
- Migration -> entity: N/A，本片不触达 persistence。
- Entity -> contract: N/A，本片不改实体 / contract 结构。
- Route -> command: approve / reject / reviewDiff / initialize* / current singleton query 全部对齐 `ADR-015`。
- Query -> view: `ContractReadinessDetailView` 以项目级稳定单例子资源暴露，不再保留 `/current` page suffix。
- Guard / permission: 保持现有 `project:read` / `project:write` 与 `Authenticated` 边界不变。
- OpenAPI / generated client: 必须同轮回写，不接受 runtime / OpenAPI / client 分叉。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                              | Result  | Gap / Reason        |
| -------------------------------- | -------- | ----------------------------------------------- | ------- | ------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`               | Pending | 实施后运行          |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`    | Pending | 实施后运行          |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api:openapi`         | Pending | 实施后运行          |
| E2E                              | Yes      | `corepack pnpm nx e2e poms-api-e2e --runInBand` | Pending | 实施后运行          |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:check`  | Pending | 实施后运行          |
| Migration / schema check         | No       | `N/A`                                           | N/A     | 无 persistence 变更 |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                          |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------------------ |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 默认直接切换，不保留过渡 alias |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-16`
- Conditions:
  - runtime route、OpenAPI、generated client、HTTP E2E 与 tracker / progress 必须在同一轮一起回写。
  - 若发现其他 `Approval` / `ContractReadiness` active 设计文档仍保留旧 route，需在本轮一并改正，而不是留给后续补丁。
