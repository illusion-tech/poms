# FE-19 项目管理共享体验组件铺开实施基线包

- Gate Status: `Pass`
- Parent: `FE-18`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-23
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-19`

## 1. 范围

- 本次目标:
  - 将 `FE-18` 建立的共享项目上下文、工作指令与反馈组件继续铺到提成工作区壳层和项目工作区首页。
  - 让项目工作区、提成工作区、工作区首页在标题区、阶段 / 状态标签、返回动作、当前阶段 / 下一步 / 缺口 / 责任归口、反馈提示上使用统一组件。
  - 关闭 `FE18-E1-PARTIAL-PAGE-COVERAGE` 中最靠近项目管理主链的留白。
- 本次明确不做:
  - 不修改后端 API、OpenAPI、generated client、DTO、权限 guard 或 route surface。
  - 不迁移 `ProjectCommissionShell` 当前本地 `projectWorkspaceGuide` 事实来源；该事实源纠偏如需推进，另开数据 / query 治理切片。
  - 不重构提成操作表格；该部分已由 `FE-17` 关闭。
  - 不一次性重构合同详情、签约前工作区或所有历史提示框。
- 下游可依赖的交付边界:
  - 项目管理主链页面可以继续复用 `ProjectContextHeader`、`WorkspaceCommandPanel`、`WorkspaceFeedback`。
  - 提成工作区壳层不再自写标题 / 标签 / 返回动作结构。
- 不允许下游依赖的留白:
  - 提成壳层的正式工作区引导事实源仍未迁移到后端 guidance。
  - 合同详情与更广范围项目管理页面仍需后续组件化切片。

## 2. 正式输入

| Input Type          | Document / Source                                       | Section / Anchor                    | Status     | Notes                                  |
| ------------------- | ------------------------------------------------------- | ----------------------------------- | ---------- | -------------------------------------- |
| UI baseline         | `fe-18-project-context-workspace-component-baseline.md` | Shared project context components   | `Accepted` | 本片复用已通过 G4 的共享组件。         |
| UI review input     | `fe-17-project-management-primeng-table-baseline.md`    | PrimeNG / UIKit review findings     | `Accepted` | 继续执行 PrimeNG / Poseidon 优先模式。 |
| Business design     | `phase2-commission-stage-gate-overview-workspace.md`    | L5 gate explanation workspace       | `Accepted` | 提成工作区保持解释 / 操作分工。        |
| Query boundary      | `query-view-boundary-design.md`                         | Project detail / workspace guidance | `Accepted` | 本片不新增 query contract。            |
| Permission boundary | `business-authorization-matrix.md`                      | Commission permissions              | `Accepted` | 沿用当前本地 permission checks。       |

## 3. 本次 SSOT

| Concern                     | SSOT                                        | Implementation Rule           |
| --------------------------- | ------------------------------------------- | ----------------------------- |
| Business semantics          | Existing `ProjectDetailView` and page state | 组件只承载展示，不创造事实。  |
| Public route canonical path | N/A                                         | 不触及 public route surface。 |
| Route / command naming      | Existing Angular routes                     | 不改路由结构。                |
| DTO / contract naming       | `@poms/admin-data-access` exports           | 不新增 wire contract。        |
| Table / column naming       | N/A                                         | 不触发表格。                  |
| Date / time semantics       | Existing workspace home formatter           | 保持现有格式。                |
| Identifier semantics        | Existing views                              | 不改变标识展示。              |
| Money / decimal semantics   | N/A                                         | 不触及金额逻辑。              |
| Status machine              | Existing presentation helpers               | 阶段 / 状态只展示既有状态。   |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract        | Guard / Permission                                | Design Source       | Result                    |
| ------------------ | ----------------- | ---------------------- | ------------------------------ | ------------------------------------------------- | ------------------- | ------------------------- |
| N/A                | N/A               | N/A                    | `ProjectDetailView`            | Existing route guard + local permission checks    | `FE-16B` / `FE-16D` | Read-only projection only |
| N/A                | N/A               | N/A                    | `ProjectWorkspaceGuidanceView` | Existing route guard + backend entry availability | `FE-16C`            | Read-only projection only |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: `aligned`
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                   | Consumer                             | Fields                                                                        | Filter / Sort | Permission Boundary                            | Design Source | Result   |
| ------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------- | ------------- | ---------------------------------------------- | ------------- | -------- |
| `ProjectDetailView`            | `/projects/:id/commission/...` shell | project code/name/stage/status                                                | N/A           | Existing route guard + local permission checks | `FE-16B`      | Existing |
| `ProjectWorkspaceGuidanceView` | `/projects/:id/workspace` home       | headline/currentFocus/currentGap/nextStep/ownerLabel/basis/recommendedEntries | N/A           | Existing entry availability                    | `FE-16C`      | Existing |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | Not touched  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Not touched |

## 7. 一致性结论

- Document -> code: `Pass`，本片只做共享组件铺开。
- ADR-015 inventory -> route: `N/A`。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: `N/A`。
- Query -> view: `Pass`，不新增或改变 query。
- Guard / permission: `Pass`，不改变权限判定。
- OpenAPI / generated client: `N/A`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                             | Result         | Gap / Reason                                                       |
| -------------------------------- | -------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| Diff check                       | Yes      | `git diff --check`                             | `Pass`         | 见 `fe-19-project-management-component-adoption-g3-g4-closeout.md` |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`             | `Pass`         | 见 `fe-19-project-management-component-adoption-g3-g4-closeout.md` |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`            | `Pass`         | initial total `931.61 kB`，无新 bundle warning                     |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand` | `Pass`         | 12 suites / 38 tests                                               |
| E2E                              | Yes      | project workspace smoke / journey              | `Pass`         | 7 passed                                                           |
| OpenAPI generation / client diff | No       | N/A                                            | `Not required` | No API / contract change                                           |
| Migration / schema check         | No       | N/A                                            | `Not required` | No persistence change                                              |

## 9. 例外与风险

| Exception ID                         | Level | Scope                                           | Approved By | Cleanup Owner | Cleanup Due               | Notes                          |
| ------------------------------------ | ----- | ----------------------------------------------- | ----------- | ------------- | ------------------------- | ------------------------------ |
| `FE19-E1-COMMISSION-GUIDANCE-SOURCE` | Low   | 提成壳层仍使用本地 `projectWorkspaceGuide` 摘要 | Codex       | Codex         | 后续数据 / query 治理切片 | 本片只做组件化，不改变事实源。 |
| `FE19-E2-BROADER-PAGE-ADOPTION`      | Low   | 合同详情、签约前页面未纳入本片                  | Codex       | Codex         | 后续 UI baseline 切片     | 避免一次性重构过大。           |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-23
- Conditions:
  - 只做 frontend-only 组件铺开。
  - 不改后端接口、权限、路由、DTO 或 generated client。
  - 若需要新增正式提成工作区 guidance 字段，停止本片并开后端治理切片。
