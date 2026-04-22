# FE-18 项目上下文与工作区体验组件化实施基线包

- Gate Status: `Pass`
- Parent: `FE-16` / `FE-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-23
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-18`

## 1. 范围

- 本次目标:
  - 把项目详情、项目工作区壳层中重复的项目标题区、阶段 / 状态标识、页面动作区、工作区当前重点 / 下一步 / 缺口 / 责任归口收成共享前端组件。
  - 按 Poseidon 模板 demo 已有模式建立项目管理视觉基线：`p-toolbar` 用于页面上下文与动作区，`p-timeline` 用于项目生命周期表达，`p-message` 用于反馈提示，`p-button` / `p-tag` 继续承担动作与状态语义。
  - 降低页面内手写边框、状态色、标题区和提示区的复制，后续项目管理页面优先复用这些组件。
- 本次明确不做:
  - 不新增或修改后端 API、OpenAPI、generated client、DTO、权限 guard 或 route surface。
  - 不改变 `ProjectDetailView`、`ProjectWorkspaceGuidanceView` 的字段语义。
  - 不重做项目列表表格；`FE-17` 已完成该部分。
  - 不把全部项目管理页面一次性改完；本次先收口项目详情与项目工作区壳层这两个最高复用入口。
- 下游可依赖的交付边界:
  - 项目管理页面可复用共享项目上下文头部、生命周期、工作区概览和反馈组件。
  - 页面用户可见文案继续保持业务中文，不暴露内部 key。
- 不允许下游依赖的留白:
  - 合同、提成、签约前工作区的完整视觉重构尚未完成。
  - 非 loading 的所有历史提示框不会在本片内全部迁移。

## 2. 正式输入

| Input Type          | Document / Source                                    | Section / Anchor                    | Status     | Notes                                              |
| ------------------- | ---------------------------------------------------- | ----------------------------------- | ---------- | -------------------------------------------------- |
| Business design     | `phase2-lifecycle-experience-blueprint.md`           | 项目级连续工作区                    | `Accepted` | 工作区需要优先解释当前阶段、下一步、缺口与责任人。 |
| Business design     | `phase2-user-task-map.md`                            | 项目管理任务入口                    | `Accepted` | 项目详情负责对象事实，工作区负责连续任务推进。     |
| Query boundary      | `query-view-boundary-design.md`                      | Project detail / workspace guidance | `Accepted` | 本片只投影既有 view，不派生 wire contract。        |
| Permission boundary | `business-authorization-matrix.md`                   | project / commission action         | `Accepted` | 继续沿用既有 `allowedActions` 与 route guard。     |
| UI review input     | `fe-17-project-management-primeng-table-baseline.md` | PrimeNG / UIKit review findings     | `Accepted` | 继续执行“组件优先、不要各处硬拼”的纠偏口径。       |
| Poseidon demo       | `apps/poms-admin/src/app/demo/uikit/panelsdemo.ts`   | Toolbar / Tabs / Panel              | `Accepted` | 采用 `p-toolbar` 作为项目上下文动作区模式。        |
| Poseidon demo       | `apps/poms-admin/src/app/demo/uikit/timelinedemo.ts` | Timeline                            | `Accepted` | 采用 `p-timeline` 表达生命周期。                   |
| Poseidon demo       | `apps/poms-admin/src/app/demo/uikit/messagesdemo.ts` | Message                             | `Accepted` | 采用 `p-message` 表达错误 / 提示反馈。             |

## 3. 本次 SSOT

| Concern                     | SSOT                                                 | Implementation Rule                  |
| --------------------------- | ---------------------------------------------------- | ------------------------------------ |
| Business semantics          | `ProjectDetailView` / `ProjectWorkspaceGuidanceView` | 组件只负责展示，不本地创造业务事实。 |
| Public route canonical path | N/A                                                  | 不触及 public route surface。        |
| Route / command naming      | Existing Angular routes                              | 不改路由结构。                       |
| DTO / contract naming       | generated client / `@poms/admin-data-access` exports | 不新增 wire contract。               |
| Table / column naming       | N/A                                                  | 不触及表格结构。                     |
| Date / time semantics       | Existing page formatting                             | 继续使用当前页面已有日期展示。       |
| Identifier semantics        | Existing page helpers                                | 不改变 ID 缩写规则。                 |
| Money / decimal semantics   | Existing page helpers                                | 不改变金额格式化。                   |
| Status machine              | Existing presentation helpers and page maps          | 阶段 / 状态 label 只展示既有状态。   |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract        | Guard / Permission                                | Design Source      | Result                    |
| ------------------ | ----------------- | ---------------------- | ------------------------------ | ------------------------------------------------- | ------------------ | ------------------------- |
| N/A                | N/A               | N/A                    | `ProjectDetailView`            | Existing route guard + `allowedActions`           | `EX-18` / `FE-16B` | Read-only projection only |
| N/A                | N/A               | N/A                    | `ProjectWorkspaceGuidanceView` | Existing route guard + backend entry availability | `EX-19` / `FE-16C` | Read-only projection only |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: `aligned`
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                   | Consumer                  | Fields                                                                               | Filter / Sort | Permission Boundary                             | Design Source | Result   |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------- | ------------- | -------- |
| `ProjectDetailView`            | `/projects/:id`           | project code/name/customer/stage/status/owner/contract/approval/confirmation/actions | N/A           | `project:read` route guard + `allowedActions`   | `FE-16B`      | Existing |
| `ProjectWorkspaceGuidanceView` | `/projects/:id/workspace` | headline/currentFocus/currentGap/nextStep/ownerLabel/basis/recommendedEntries        | N/A           | `project:read` route guard + entry availability | `FE-16C`      | Existing |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | Not touched  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Not touched |

## 7. 一致性结论

- Document -> code: `Pass`，本片只把已实现页面共性抽成组件。
- ADR-015 inventory -> route: `N/A`，不改 public route surface。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: `N/A`。
- Query -> view: `Pass`，继续消费既有 data-access view。
- Guard / permission: `Pass`，不改变 guard 和动作显隐判定。
- OpenAPI / generated client: `N/A`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                             | Result         | Gap / Reason                                                     |
| -------------------------------- | -------- | ---------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| Diff check                       | Yes      | `git diff --check`                             | `Pass`         | 见 `fe-18-project-context-workspace-component-g3-g4-closeout.md` |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`             | `Pass`         | 见 `fe-18-project-context-workspace-component-g3-g4-closeout.md` |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`            | `Pass`         | initial total `931.90 kB`，无新 bundle warning                   |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand` | `Pass`         | 11 suites / 35 tests                                             |
| E2E                              | Yes      | project workspace smoke / journey              | `Pass`         | 7 passed                                                         |
| OpenAPI generation / client diff | No       | N/A                                            | `Not required` | No API / contract change                                         |
| Migration / schema check         | No       | N/A                                            | `Not required` | No persistence change                                            |

## 9. 例外与风险

| Exception ID                    | Level | Scope                                      | Approved By | Cleanup Owner | Cleanup Due                   | Notes                                                          |
| ------------------------------- | ----- | ------------------------------------------ | ----------- | ------------- | ----------------------------- | -------------------------------------------------------------- |
| `FE18-E1-PARTIAL-PAGE-COVERAGE` | Low   | 合同 / 提成 / 签约前页面未在本片内全部重构 | Codex       | Codex         | 后续项目管理 UI baseline 切片 | 本片先固化项目详情与项目工作区最高频入口，避免一次性重构过大。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-23
- Conditions:
  - 只做 frontend-only 组件化与页面消费改造。
  - PrimeNG / Poseidon 模式优先；Tailwind 只用于布局与间距。
  - 若实现中发现需要新增 view 字段或 route，停止本片并转后端治理切片。
