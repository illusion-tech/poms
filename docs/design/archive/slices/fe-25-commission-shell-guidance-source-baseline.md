# FE-25 提成工作区壳层 guidance 事实源纠偏实施基线包

- Gate Status: `Pass`
- Parent: `FE-19`
- Owner: `Codex`
- Slice Type: `query-behavior + frontend-only consumer`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-25`

## 1. 范围

- 本次目标:
  1. 关闭 `FE19-E1-COMMISSION-GUIDANCE-SOURCE`：提成工作区壳层不再用前端本地 `projectWorkspaceGuide` 生成当前阶段 / 下一步 / 缺口 / 责任归口。
  2. 复用既有 `GET /projects/{projectId}/workspace-guidance` 与 `ProjectWorkspaceGuidanceView`，让提成壳层消费同一后端 guidance。
  3. 在既有 `recommendedEntries` 中补齐 `commission-freeze-binding` 入口行为，使提成壳层 nav 的冻结入口也能来自 guidance，而不是继续本地拼权限。
  4. 保持提成壳层的 route guard、页面结构和已有子页行为不变。
- 本次明确不做:
  1. 不新增 public API route、DTO 字段、OpenAPI schema、generated client 或 DDL。
  2. 不新增独立 commission guidance query；如果后续需要更细的提成专用引导，再开后端 query 切片。
  3. 不改提成计算 / 发放 / 调整业务逻辑。
  4. 不重做提成操作页表格体验，`FE20-E1` 仍另行处理。
- 下游可依赖的交付边界:
  1. 提成工作区壳层的 summary 和 nav 可依赖 `ProjectWorkspaceGuidanceView`。
  2. `FE19-E1` 可在 G4 关闭。
  3. 后续前端切片不应再从 `projectWorkspaceGuide` 推导提成壳层业务结论。
- 不允许下游依赖的留白:
  1. 本片不表示 commission 子页已有独立后端 guidance。
  2. 本片不改变用户进入受限页面时的 route guard 结果。

## 2. 正式输入

| Input Type       | Document / Source                                               | Section / Anchor               | Status | Notes                                             |
| ---------------- | --------------------------------------------------------------- | ------------------------------ | ------ | ------------------------------------------------- |
| Open exception   | `fe-19-project-management-component-adoption-g3-g4-closeout.md` | `FE19-E1`                      | Open   | 提成壳层仍用本地 `projectWorkspaceGuide`          |
| Query baseline   | `ex-19-project-workspace-guidance-baseline.md`                  | `ProjectWorkspaceGuidanceView` | Done   | 已有 workspace guidance route / contract / client |
| Runtime frontend | `project-workspace-shell.ts`                                    | guidance consumption           | Fact   | 项目工作区壳层已按后端 guidance 渲染摘要和 nav    |
| Runtime frontend | `project-commission-shell.ts`                                   | current shell                  | Fact   | 当前仍用本地 helper 和本地 permission checks      |
| Route matrix     | `app.routes.ts`                                                 | commission children            | Fact   | route guard 不在本片变更                          |

## 3. 本次 SSOT

| Concern                     | SSOT                                                                     | Implementation Rule                                 |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| Public route canonical path | `GET /projects/{projectId}/workspace-guidance`                           | 复用既有 route，不新增 route surface                |
| Response contract           | `ProjectWorkspaceGuidanceView`                                           | 不新增 DTO 字段，不改 generated client              |
| Commission shell summary    | `guidance.currentStageLabel/currentFocus/currentGap/nextStep/ownerLabel` | 不再调用 `projectWorkspaceGuide`                    |
| Commission shell nav        | `guidance.recommendedEntries`                                            | 使用 `commission-*` entries 生成 nav                |
| Freeze binding entry        | `ProjectQueryService.buildWorkspaceEntries`                              | 新增 `commission-freeze-binding` entry，不改 schema |
| Guard / permission          | `app.routes.ts` + backend entry availability                             | 前端只投影 enabled / disabledReason，不重算权限     |

## 4. 命令与接口边界

| Route / Controller                             | Command / Service                                 | Request DTO / Contract    | Response DTO / Contract                 | Guard / Permission | Design Source | Result |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------- | --------------------------------------- | ------------------ | ------------- | ------ |
| `GET /projects/{projectId}/workspace-guidance` | `ProjectQueryService.getProjectWorkspaceGuidance` | existing path `projectId` | existing `ProjectWorkspaceGuidanceView` | `project:read`     | `EX-19`       | Reused |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/workspace-guidance`
- Current implemented route(s): `GET /projects/{projectId}/workspace-guidance`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-19`
- Blocker / exception: none. 本片只调整 existing query 的 entry 行为，不新增 route surface。

## 5. 读侧边界

| Query / View                   | Consumer                 | Fields / Entries                                                                                                                               | Filter / Sort  | Permission Boundary                  | Design Source     | Result |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------ | ----------------- | ------ |
| `ProjectWorkspaceGuidanceView` | `ProjectCommissionShell` | headline/currentFocus/currentGap/nextStep/ownerLabel/recommendedEntries                                                                        | single project | `project:read` + entry-level enabled | `EX-19` / `FE-19` | Frozen |
| `ProjectWorkspaceEntryView`    | `ProjectCommissionShell` | `commission-freeze-binding`, `commission-gate-overview`, `commission-final-settlement`, `commission-rule-explanation`, `commission-operations` | N/A            | route guard still enforced           | `FE-08` / `FE-12` | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source  | Check Result |
| ----- | --------- | ------------------- | -------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不改 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: 本片直接关闭 `FE19-E1`，不扩大为 commission 专用 query。
- ADR-015 inventory -> route: 复用 aligned route，无新增 route。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: `commission-freeze-binding` entry 必须由后端 guidance 输出，前端只投影。
- Guard / permission: route guard 不改；nav disabled reason 来自 guidance。
- OpenAPI / generated client: schema 不变，不需要 generate；若实现中需要新字段则停止并改走 contract slice。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                 | Result  | Gap / Reason            |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ------- | ----------------------- |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`      | Pending | guidance entry 行为变更 |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-shell.spec.ts` | Pending | shell 消费 guidance     |
| Admin lint                       | Yes      | `corepack pnpm nx lint poms-admin`                                                                 | Pending | frontend change         |
| API lint                         | Yes      | `corepack pnpm nx lint poms-api`                                                                   | Pending | query behavior change   |
| Admin build                      | Yes      | `corepack pnpm nx build poms-admin`                                                                | Pending | template compile        |
| OpenAPI / generated client check | No       | N/A                                                                                                | N/A     | 不改 schema / route     |
| Migration / schema check         | No       | N/A                                                                                                | N/A     | 不改 persistence        |
| E2E                              | Yes      | project workspace smoke / journey focused suite                                                    | Pending | 提成壳层真实入口链回归  |
| Diff hygiene                     | Yes      | `git diff --check`                                                                                 | Pending | G3 必跑                 |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 本片不保留新例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-25`
- Conditions:
  1. 可以进入实现。
  2. 不新增 public route / DTO / generated client / DDL。
  3. 若 `ProjectWorkspaceGuidanceView` 现有字段不能表达提成壳层需求，停止本片并新增后端 query / contract 切片。
