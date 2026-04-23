# FE-07 合同到移交承接工作区前端实现基线包

- Gate Status: `Pass`
- Parent: Phase 2 frontend workspace / L3
- Owner: `Codex`
- Slice Type: `frontend + query-projection`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-23`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-07`

## 1. 范围

- 本次目标:
  - 新增 `/projects/:id/workspace/contract-handover` 只读页，展示合同生效后到正式移交前的承接状态、合同集合、承接基线、再基线化摘要、回款计划初始化和移交确认状态。
  - 在 `ProjectWorkspaceStore` 中接入既有 `ProjectHandoverApi` 读接口：`GET /projects/{projectId}/contract-handover` 与 `GET /projects/{projectId}/project-handover`。
  - 将现有 workspace guidance 中 `handover-workspace` 占位入口改为可进入的新前端路由，确保用户可从工作区导航进入，而不是只能直输 URL。
  - 复用 `ProjectContextHeader`、`WorkspaceCommandPanel`、`WorkspaceFactGrid`、`WorkspaceFeedback`、`WorkspaceLoading`、`WorkspaceActionLink` 等既有 Poseidon / PrimeNG 组件基线。
- 本次明确不做:
  - 不新增、删除或变更公共 API route surface。
  - 不新增 DTO / OpenAPI schema，不重新生成 generated client。
  - 不实现 `POST /project-handovers/{handoverId}:confirm` 或 `POST /contract-handover-rebaselines` 写动作。
  - 不新增结构化再基线化影响项、风险摘要、范围快照、回款节点、成本估算基线等后端字段。
  - 不新增权限键，继续沿用 `project:read` / `project:write` 与后端 `allowedActions`。
- 下游可依赖的交付边界:
  - 项目工作区可从导航进入合同承接只读页。
  - 页面只展示已存在 generated client DTO 字段，不创造或伪造承接事实。
- 不允许下游依赖的留白:
  - 本页不能被视为正式移交确认操作页。
  - 结构化影响项、执行负责人候选、风险 / 范围 / 成本明细仍需后续 query / 后端治理切片。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor       | Status     | Notes                                                        |
| ------------------------- | --------------------------------------------------- | ---------------------- | ---------- | ------------------------------------------------------------ |
| Business design           | `phase2-contract-to-handover-workspace.md`          | L3-T01                 | `Accepted` | 冻结合同到移交承接工作区的信息架构和回答问题。               |
| Business design           | `phase2-handover-closure-rules.md`                  | L3-T04                 | `Accepted` | 冻结合同生效、移交强节点和提成冻结的统一收口口径。           |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                  | `project-handover`     | `aligned`  | 本片只消费既有 aligned route。                               |
| Query boundary            | `ContractHandoverSummaryView`                       | generated client DTO   | `Accepted` | 合同承接摘要的当前权威读侧。                                 |
| Query boundary            | `ProjectHandoverDetailView`                         | generated client DTO   | `Accepted` | 项目移交详情的当前权威读侧。                                 |
| UI baseline               | `FE-18` / `FE-20` / `FE-21` G4 artifacts            | shared workspace UI    | `Accepted` | 继续复用共享项目上下文、事实栅格、反馈、loading 与动作链接。 |
| Permission boundary       | `business-authorization-matrix.md` / current guards | project workspace read | `Accepted` | 本片前端路由使用 `project:read`；写动作不纳入。              |

## 3. 本次 SSOT

| Concern                     | SSOT                                                      | Implementation Rule                                        |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Business semantics          | `phase2-contract-to-handover-workspace.md`                | 页面回答承接状态和阻断原因，不替代移交确认。               |
| Public route canonical path | `api-route-canonical-inventory.md`                        | 不改 public API；只消费 existing aligned routes。          |
| Route / command naming      | Angular route `/projects/:id/workspace/contract-handover` | 前端页面 route 与 backend `contract-handover` noun 对齐。  |
| DTO / contract naming       | `@poms/shared-api-client` generated DTO                   | 不新增 wire contract；data-access 只做类型导出和读取封装。 |
| Table / column naming       | N/A                                                       | 不触发表格和持久化。                                       |
| Date / time semantics       | Existing ISO datetime DTO fields                          | 只格式化展示，不改变时间语义。                             |
| Identifier semantics        | Existing DTO ids / snapshot ids                           | ID 仅作为追溯文本展示或链接输入，不生成新 ID。             |
| Money / decimal semantics   | `formatAmount` helper                                     | 金额只展示，保持现有字符串 decimal 语义。                  |
| Status machine              | Existing DTO status enums                                 | 使用 presentation helper 映射中文 label / severity。       |

## 4. 命令与接口边界

| Route / Controller                             | Command / Service | Request DTO / Contract | Response DTO / Contract        | Guard / Permission | Design Source  | Result                    |
| ---------------------------------------------- | ----------------- | ---------------------- | ------------------------------ | ------------------ | -------------- | ------------------------- |
| `GET /projects/{projectId}/contract-handover`  | Existing query    | N/A                    | `ContractHandoverSummaryView`  | `project:read`     | EX-08 / FE-07  | Read-only projection only |
| `GET /projects/{projectId}/project-handover`   | Existing query    | N/A                    | `ProjectHandoverDetailView`    | `project:read`     | EX-08 / FE-07  | Read-only projection only |
| `GET /projects/{projectId}/workspace-guidance` | Existing query    | N/A                    | `ProjectWorkspaceGuidanceView` | `project:read`     | FE-16C / FE-07 | Entry route projection    |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing `project-handover` rows only
- Current implemented route(s): existing generated client methods only
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-08`
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                   | Consumer                      | Fields                                                                                               | Filter / Sort | Permission Boundary | Design Source  | Result                  |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------- | ------------------- | -------------- | ----------------------- |
| `ContractHandoverSummaryView`  | `ProjectContractHandover`     | effective contract set, baseline validation, current baseline, rebaseline, receivable plan, blockers | N/A           | `project:read`      | L3-T01 / EX-08 | Existing                |
| `ProjectHandoverDetailView`    | `ProjectContractHandover`     | handover status, participant confirmation, receipt judgment, summary package, blockers               | N/A           | `project:read`      | L3-T04 / EX-08 | Existing                |
| `ProjectWorkspaceGuidanceView` | `ProjectWorkspaceShell` / nav | `handover-workspace` route / enabled / disabled reason                                               | N/A           | `project:read`      | FE-16C / FE-07 | Query projection update |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | Not touched  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Not touched |

## 7. 一致性结论

- Document -> code: `Pass`，冻结为只读承接页和 guidance entry 投影。
- ADR-015 inventory -> route: `Pass`，不新增 public API，只消费 existing aligned routes。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: `N/A`，本片不触发写命令。
- Query -> view: `Pass`，页面只展示 `ContractHandoverSummaryView` 与 `ProjectHandoverDetailView`。
- Guard / permission: `Pass`，Angular route 使用 `project:read`，写动作不暴露。
- OpenAPI / generated client: `N/A`，不改契约。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                            | Result         | Gap / Reason                    |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------- | -------------- | ------------------------------- |
| Diff check                       | Yes      | `git diff --check`                                                                            | `Pending`      | G3 执行                         |
| Backend unit tests               | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts` | `Pending`      | guidance entry 投影小改         |
| Backend lint                     | Yes      | `corepack pnpm nx lint poms-api`                                                              | `Pending`      | 触及 backend query              |
| Admin data-access lint           | Yes      | `corepack pnpm nx lint admin-data-access`                                                     | `Pending`      | 触及 store / exports            |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin`                                                            | `Pending`      | 新增页面和路由                  |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin`                                                           | `Pending`      | PrimeNG / Angular template 编译 |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand`                                                | `Pending`      | store / route / page tests      |
| E2E                              | Yes      | project workspace smoke / journey 或 focused Playwright                                       | `Pending`      | 覆盖从工作区导航进入承接页      |
| OpenAPI generation / client diff | No       | N/A                                                                                           | `Not required` | No API / contract change        |
| Migration / schema check         | No       | N/A                                                                                           | `Not required` | No persistence change           |

## 9. 例外与风险

| Exception ID                     | Level | Scope                                         | Approved By | Cleanup Owner | Cleanup Due           | Notes                              |
| -------------------------------- | ----- | --------------------------------------------- | ----------- | ------------- | --------------------- | ---------------------------------- |
| `FE07-E1-READ-ONLY-SCOPE`        | Low   | 不实现确认移交或再基线化写动作                | Codex       | Codex         | 后续 L3 写侧切片      | 避免把读取体验和写命令混在同一刀。 |
| `FE07-E2-PROJECTION-GRANULARITY` | Low   | 风险 / 范围 / 成本 / 影响项仅展示现有摘要字段 | Codex       | Codex         | 后续 query governance | 当前 DTO 未提供完整结构化明细。    |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-23`
- Conditions:
  - 本片可进入实现，但只允许 read page + guidance entry projection。
  - 如需写动作、结构化影响项或新增权限键，立即停止并拆后端治理切片。
