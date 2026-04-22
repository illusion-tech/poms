# FE-20 L4/L5 读取页事实栅格组件化实施基线包

- Gate Status: `Pass`
- Parent: `FE-18` / `FE-19`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-23
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-20`

## 1. 范围

- 本次目标:
  - 新增共享 `WorkspaceFactGrid`，统一承载 L4/L5 读取页内反复出现的 label / value / status tag / detail 事实块。
  - 将经营总览、偏差与风险、提成阶段解释、最终结算、规则解释五个解释型页面的核心事实栅格迁移到共享组件。
  - 将这些页面的错误反馈迁移到 `WorkspaceFeedback`，减少页面内手写提示卡。
- 本次明确不做:
  - 不修改后端 API、OpenAPI、generated client、DTO、权限 guard 或 route surface。
  - 不改变 `ProjectWorkspaceStore` 的读取逻辑或 view model 字段语义。
  - 不重构提成操作表格；该部分已在 `FE-17` 完成。
  - 不改变页面跳转路径和动作权限判断。
- 下游可依赖的交付边界:
  - 后续读取页可优先使用 `WorkspaceFactGrid` 表达事实组。
  - L4/L5 解释型页面不再各自维护大量重复的 label/value 小框样式。
- 不允许下游依赖的留白:
  - 更复杂的 timeline / stepper 交互不在本片内引入。
  - 表单型页面和操作型页面的布局治理仍需后续切片。

## 2. 正式输入

| Input Type      | Document / Source                                         | Section / Anchor            | Status     | Notes                            |
| --------------- | --------------------------------------------------------- | --------------------------- | ---------- | -------------------------------- |
| UI baseline     | `fe-18-project-context-workspace-component-baseline.md`   | Shared workspace components | `Accepted` | 延续共享组件优先口径。           |
| UI adoption     | `fe-19-project-management-component-adoption-baseline.md` | Component adoption          | `Accepted` | 继续铺开项目管理组件化。         |
| Business design | `phase2-project-business-outcome-overview.md`             | L4 operating overview       | `Accepted` | 经营总览仍只读消费现有事实。     |
| Business design | `phase2-project-variance-risk-explanation.md`             | L4 variance risk            | `Accepted` | 偏差风险解释仍只读消费现有事实。 |
| Business design | `phase2-commission-stage-gate-overview-workspace.md`      | L5 gate overview            | `Accepted` | 提成阶段解释仍只读消费现有事实。 |
| Business design | `phase2-commission-retention-final-settlement.md`         | L5 final settlement         | `Accepted` | 最终结算仍只读消费现有事实。     |
| Business design | `phase2-commission-rule-explanation-language.md`          | L5 rule explanation         | `Accepted` | 规则解释仍只读消费现有事实。     |

## 3. 本次 SSOT

| Concern                     | SSOT                                                        | Implementation Rule                            |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Business semantics          | Existing generated client views via `ProjectWorkspaceStore` | 组件只展示页面已读取的字段，不派生业务事实。   |
| Public route canonical path | N/A                                                         | 不触及 public route surface。                  |
| Route / command naming      | Existing Angular routes                                     | 不改路由结构。                                 |
| DTO / contract naming       | Existing generated client / data-access exports             | 不新增 wire contract。                         |
| Table / column naming       | N/A                                                         | 不触发表格。                                   |
| Date / time semantics       | Existing page helpers                                       | 不改变日期语义。                               |
| Identifier semantics        | Existing page fields                                        | 不改变 ID 展示。                               |
| Money / decimal semantics   | `formatAmount` helper                                       | 不改变金额格式化。                             |
| Status machine              | Existing presentation helpers                               | status label / severity 仍由现有 helper 决定。 |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract   | Guard / Permission    | Design Source                            | Result                    |
| ------------------ | ----------------- | ---------------------- | ------------------------- | --------------------- | ---------------------------------------- | ------------------------- |
| N/A                | N/A               | N/A                    | Existing L4/L5 read views | Existing route guards | Existing FE-06 / FE-16 / FE-17 baselines | Read-only projection only |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: `aligned`
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                   | Consumer                           | Fields                                            | Filter / Sort | Permission Boundary | Design Source | Result   |
| ------------------------------ | ---------------------------------- | ------------------------------------------------- | ------------- | ------------------- | ------------- | -------- |
| Existing L4 operating views    | `ProjectOperatingOverview`         | operating state / accounting / gap fields         | N/A           | Existing            | FE-02 / FE-06 | Existing |
| Existing variance view         | `ProjectVarianceRisk`              | risk / explanation / gap fields                   | N/A           | Existing            | FE-02         | Existing |
| Existing commission gate view  | `ProjectCommissionGateOverview`    | gate / signal / gap / next action fields          | N/A           | Existing            | FE-03         | Existing |
| Existing final settlement view | `ProjectCommissionFinalSettlement` | settlement status / evidence / next action fields | N/A           | Existing            | FE-06         | Existing |
| Existing rule explanation view | `ProjectCommissionRuleExplanation` | rule / blocking / evidence / next action fields   | N/A           | Existing            | FE-06         | Existing |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | Not touched  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result      |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ----------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | Not touched |

## 7. 一致性结论

- Document -> code: `Pass`，本片只做展示组件抽取和页面消费改造。
- ADR-015 inventory -> route: `N/A`。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: `N/A`。
- Query -> view: `Pass`，不改 view 字段语义。
- Guard / permission: `Pass`，不改变权限判定。
- OpenAPI / generated client: `N/A`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                             | Result         | Gap / Reason                                           |
| -------------------------------- | -------- | ---------------------------------------------- | -------------- | ------------------------------------------------------ |
| Diff check                       | Yes      | `git diff --check`                             | `Pass`         | 见 `fe-20-l4-l5-read-page-fact-grid-g3-g4-closeout.md` |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`             | `Pass`         | 见 `fe-20-l4-l5-read-page-fact-grid-g3-g4-closeout.md` |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`            | `Pass`         | initial total `931.61 kB`，无新 bundle warning         |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand` | `Pass`         | 12 suites / 38 tests                                   |
| E2E                              | Yes      | project workspace smoke / journey              | `Pass`         | 7 passed                                               |
| OpenAPI generation / client diff | No       | N/A                                            | `Not required` | No API / contract change                               |
| Migration / schema check         | No       | N/A                                            | `Not required` | No persistence change                                  |

## 9. 例外与风险

| Exception ID                   | Level | Scope                            | Approved By | Cleanup Owner | Cleanup Due        | Notes                         |
| ------------------------------ | ----- | -------------------------------- | ----------- | ------------- | ------------------ | ----------------------------- |
| `FE20-E1-OPERATION-PAGE-SCOPE` | Low   | 提成操作页和表格型 UI 不在本片内 | Codex       | Codex         | 后续操作页体验切片 | 本片只覆盖读取 / 解释型页面。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-23
- Conditions:
  - 只做 frontend-only 展示组件化。
  - 不改 API、权限、路由、DTO、generated client 或 store 读取语义。
