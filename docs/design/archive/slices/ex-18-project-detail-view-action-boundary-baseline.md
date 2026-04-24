# EX-18 项目详情视图与对象动作边界纠偏实施基线包

- Gate Status: `Pass`
- Parent: `FE-16B`
- Owner: `Codex`
- Slice Type: `api / query`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-18`

## 1. 范围

- 本次目标:
  1. 将现有 `GET /projects/{id}` 的响应契约从 `ProjectSummary` 收口为正式 `ProjectDetailView`。
  2. 在后端 query 层输出项目详情页所需主体字段、阶段摘要、当前合同摘要、当前审批摘要、当前确认摘要、摘要快照元数据和 `allowedActions`。
  3. 回写 shared contract、API DTO、OpenAPI、generated client 与后端测试，为 `FE-16B` 前端详情页实现解阻。
- 本次明确不做:
  1. 不新增项目详情 URL，也不把 `/detail` 页面后缀写入 API。
  2. 不新增持久化表、migration 或项目生命周期状态。
  3. 不实现完整 `BidProcessDetailView`、合同详情页、移交详情页或提成详情页。
  4. 不在本片修改前端详情页；`FE-16B` 后续只消费本片输出。
- 下游可依赖的交付边界:
  1. `GET /projects/{id}` 返回 `ProjectDetailView`。
  2. `ProjectDetailView.allowedActions` 至少按当前用户权限与项目状态给出详情页可用动作边界。
  3. `ProjectDetailView.currentContractSummary` 来自真实合同事实，不由前端用列表字段推导。
- 不允许下游依赖的留白:
  1. `BidProcess` 尚未形成正式当前投标详情事实源时，本片只返回空投标摘要，不模拟投标流程。
  2. 若没有项目级审批摘要快照，本片返回 `summarySnapshotId / projectionLevel / exportPolicy = null`，`currentApprovalSummary` 返回内部字段为 `null` 的空摘要对象，不自动创建快照。
  3. 对象级组织数据范围授权仍沿用当前平台权限边界；更细粒度数据范围收口留给后续授权切片。

## 2. 正式输入

| Input Type                | Document / Source                                                          | Section / Anchor          | Status | Notes                                                |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------- | ------ | ---------------------------------------------------- |
| Business design           | `docs/design/project-lifecycle-design.md`                                  | `§5`、`§6`                | active | 项目详情必须沿正式主阶段链表达                       |
| Query boundary            | `docs/design/query-view-boundary-design.md`                                | `§5.1 ProjectDetailView`  | active | 冻结详情视图最小字段组                               |
| Authorization             | `docs/design/business-authorization-matrix.md`                             | `§5.1`、`§5.2`            | active | 查看、编辑和推进项目属于对象动作授权                 |
| Frontend blocker          | `docs/design/fe-16b-project-detail-business-actions-readiness-baseline.md` | `G1 Readiness = Block`    | active | 本片解除 `FE-16B` 前端阻断                           |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                             | `project / getProject`    | active | `GET /projects/{id}` 保持 resource identity route    |
| Runtime fact              | `apps/poms-api/src/app/features/project/project.controller.ts`             | `getById`                 | fact   | 当前返回 `ProjectSummary`                            |
| Runtime fact              | `apps/poms-api/src/app/features/project/project-query.service.ts`          | `listProjects`            | fact   | 已有列表 query 聚合 owner / org / contract milestone |
| Runtime fact              | `apps/poms-api/src/app/features/contract/contract.entity.ts`               | `Contract`                | fact   | 可作为当前合同摘要事实源                             |
| Runtime fact              | `apps/poms-api/src/app/features/approval-summary/*`                        | `ApprovalSummarySnapshot` | fact   | 可作为项目详情摘要快照元数据来源                     |

## 3. 本次 SSOT

| Concern                     | SSOT                                                      | Implementation Rule                                                              |
| --------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Public route canonical path | `GET /projects/{id}`                                      | 不新增 `/detail` 或 `/current` 后缀                                              |
| Response contract           | `ProjectDetailView`                                       | `GET /projects/{id}` 不再返回 `ProjectSummary`                                   |
| Detail query source         | `ProjectQueryService.getProjectDetail`                    | controller 不直接拼详情字段                                                      |
| Contract summary            | `Contract` by `projectId`                                 | 当前合同摘要按真实合同记录聚合                                                   |
| Approval summary metadata   | `ApprovalSummarySnapshot`                                 | 若项目级详情摘要快照存在则返回元数据；不存在则返回内部字段为 `null` 的空摘要对象 |
| Allowed actions             | `UserPayload.permissions` + `Project.status/currentStage` | 后端输出可用动作，前端只投影                                                     |
| Date / time semantics       | ISO datetime / ISO date                                   | 延续 shared contract 现有时间格式                                                |
| Identifier semantics        | Internal UUID                                             | 项目、用户、组织、合同与快照 ID 均保持 UUID                                      |

## 4. 命令与接口边界

| Route / Controller                                 | Command / Service                      | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source                   | Result |
| -------------------------------------------------- | -------------------------------------- | ---------------------- | ----------------------- | ------------------ | ------------------------------- | ------ |
| `GET /projects/{id}` / `ProjectController.getById` | `ProjectQueryService.getProjectDetail` | path `id`              | `ProjectDetailView`     | `project:read`     | `query-view-boundary-design.md` | `done` |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{id}`
- Current implemented route(s): `GET /projects/:id`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-18`
- Blocker / exception: 无 route path blocker；本片只改响应契约。

## 5. 读侧边界

| Query / View        | Consumer                   | Fields                                                                                                                         | Filter / Sort | Permission Boundary                       | Design Source                   | Result |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------- | ------------------------------- | ------ |
| `ProjectDetailView` | `/projects/:id` 项目详情页 | 主体字段、owner / org 名称、阶段摘要、当前投标摘要、当前合同摘要、当前审批摘要、当前确认摘要、摘要快照元数据、`allowedActions` | N/A           | `project:read` + action-level permissions | `query-view-boundary-design.md` | `done` |

## 6. 持久化边界

| Table | Migration | Entity / Repository                                     | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------------------------------------------- | ------------------- | ------------ |
| `N/A` | `N/A`     | 复用 `project`、`contract`、`approval_summary_snapshot` | `N/A`               | 本片不改 DDL |

| Field               | Design Type / Meaning | Migration / DDL          | Entity                                    | Shared Contract / OpenAPI | Result |
| ------------------- | --------------------- | ------------------------ | ----------------------------------------- | ------------------------- | ------ |
| `summarySnapshotId` | 项目详情摘要快照 ID   | existing nullable source | `ApprovalSummarySnapshot.id`              | `uuid or null`            | `done` |
| `projectionLevel`   | 摘要投影级别          | existing nullable source | `ApprovalSummarySnapshot.projectionLevel` | `string or null`          | `done` |
| `exportPolicy`      | 导出策略              | existing nullable source | `ApprovalSummarySnapshot.exportPolicy`    | `string or null`          | `done` |
| `allowedActions`    | 后端动作边界          | computed                 | `N/A`                                     | `string[]`                | `done` |

## 7. 一致性结论

- Document -> code: `ProjectDetailView` 已落到 shared contract、DTO、OpenAPI 与 generated client。
- ADR-015 inventory -> route: `GET /projects/{id}` path 保持 aligned，capability row 与 response contract 已补齐。
- Migration -> entity: `N/A`。
- Entity -> contract: 新增 shared `ProjectDetailViewSchema`，不新增实体。
- Route -> command: 详情 route 已切到 `ProjectQueryService.getProjectDetail`。
- Query -> view: `FE-16B` 后续可消费 generated `ProjectDetailView`。
- Guard / permission: controller 保持 `project:read`；`allowedActions` 按当前用户权限与状态生成。
- OpenAPI / generated client: 已回写并通过同步校验。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result         | Gap / Reason                                                 |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| Lint                             | `yes`    | `corepack pnpm nx lint poms-api`                                                                                                           | `pass`         | 无新增 lint warning                                          |
| Build                            | `yes`    | `corepack pnpm nx build poms-api`                                                                                                          | `pass`         | API build 通过                                               |
| Unit tests                       | `yes`    | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project`、`corepack pnpm nx test poms-api --runInBand`                      | `pass`         | 覆盖 query / controller；全量 API unit tests 通过            |
| API / integration tests          | `no`     | N/A                                                                                                                                        | `not-required` | 本片改详情 query，先以单测 + OpenAPI 兜底                    |
| E2E                              | `no`     | N/A                                                                                                                                        | `not-required` | 浏览器级详情页验证归属 `FE-16B / FE-16D`                     |
| Generated client consumer checks | `yes`    | `corepack pnpm nx lint poms-admin`、`corepack pnpm nx build poms-admin`、`corepack pnpm nx test poms-admin --runInBand`                    | `pass`         | generated `ProjectDetailView` 不破坏当前前端编译 / 测试      |
| OpenAPI generation / client diff | `yes`    | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | `pass`         | response contract 已回写；生成物末尾空白归一化已纳入工具脚本 |
| Migration / schema check         | `no`     | N/A                                                                                                                                        | `not-required` | 不改 DDL                                                     |
| Diff hygiene                     | `yes`    | `git diff --check`                                                                                                                         | `pass`         | 仅有 Windows 行尾提示，无 whitespace error                   |

## 9. 例外与风险

| Exception ID          | Level | Scope        | Approved By | Cleanup Owner                                  | Cleanup Due                      | Notes                                                               |
| --------------------- | ----- | ------------ | ----------- | ---------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `EX18-E1-BID-SUMMARY` | `low` | 当前投标摘要 | `Codex`     | `EX-18 follow-up / presigning workspace owner` | 后续 `BidProcessDetailView` 切片 | 当前无正式 `BidProcess` query，详情只返回空投标摘要，不伪造投标状态 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  1. 本片可进入实现。
  2. 不新增 route path，不新增 DDL。
  3. 若实现中发现必须新增表或新业务动作，应停止并刷新 G1。

## 11. G4 关闭结论

- Gate Status: `Done`
- Closed By: `Codex`
- Closed At: `2026-04-21`
- Delivered:
  1. `GET /projects/{id}` 已返回 `ProjectDetailView`，并由 `ProjectQueryService.getProjectDetail` 统一聚合详情事实。
  2. 已补 shared contract、API DTO、OpenAPI 与 generated client；`currentApprovalSummary/currentConfirmationSummary` 使用非 null 摘要对象，避免 generated client 丢失 nullable `$ref` 语义。
  3. `allowedActions` 已从当前用户权限与项目状态计算，前端后续不需要本地推导对象动作边界。
  4. `currentContractSummary` 已来自真实合同记录；`currentBidSummary` 仍按 `EX18-E1-BID-SUMMARY` 返回空摘要。
- Drift classification:
  1. `new-real-drift` 已修复：nullable `$ref` 在 generated client 中会被生成为非 null 类型；本片已把 `currentApprovalSummary/currentConfirmationSummary` 调整为非 null 摘要对象，并将对象内部字段设为 nullable。
  2. `tool-noise` 已处理：OpenAPI generator 会在少量生成文件末尾输出多余空白行，已将归一化脚本收口为 LF + 单一最终换行，避免 `shared-api-client:check` 与 `git diff --check` 冲突。
  3. 无 route drift；`GET /projects/{id}` path 未变。
  4. 无 DDL / migration drift。
- Downstream:
  1. `FE-16B` 可回到 G1 refresh，开始详情页前端实现。
  2. 完整浏览器级动作守卫验证仍归属 `FE-16D`。

## 12. Post-G4 Exception Closure

- 2026-04-25: `EX18-E1-BID-SUMMARY` 已由 `EX-29` 关闭。
- Closure evidence: `docs/design/archive/slices/ex-29-project-detail-bid-summary-source-g3-g4-closeout.md`
- Runtime commit: `b9057e7 fix(project): 用当前投标事实源修正项目详情投标摘要`
