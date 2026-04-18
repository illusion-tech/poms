# FE-03 `L5` 提成阶段闸口解释页实施基线包

- Gate Status: `Pass`
- Parent: `FE-00`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-03`

## 1. 范围

- 本次目标:
  1. 落地 `/projects/:id/commission/gate-overview`，把“为什么可发 / 不可发 / 下一步做什么”从操作页拆出来。
  2. 建立 `L5` 闸口解释页到 `L4` 经营页与既有提成操作页的连续跳转。
  3. 明确第一批 `L5` 解释页只消费已实现的项目级反馈接口，不提前抢跑 `EX-14`。
- 本次明确不做:
  1. 不实现 `CommissionFinalSettlementView` 或 `CommissionRuleExplanationView`。
  2. 不猜测 `CommissionStageGateView` 的未冻结后端 route。
  3. 不替代既有 `commission operations` 的操作职责。
- 下游可依赖的交付边界:
  1. 闸口解释页成为 `L5` 的统一读取入口。
  2. 提成操作页不再同时承接解释职责。
  3. 当前已实现接口不足以覆盖的 future capability 被显式记录，而不是静默补猜。
- 不允许下游依赖的留白:
  1. 不允许继续把“能发 / 不能发”的解释散落在按钮状态和 toast 中。
  2. 不允许把 `L4` 的项目级动作类直接显示成阶段 gate 的唯一依据。

## 2. 正式输入

| Input Type          | Document / Source                                                   | Section / Anchor                                           | Status   | Notes                                          |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- | -------- | ---------------------------------------------- |
| Business design     | `phase2-commission-stage-gate-overview-workspace.md`                | 全文                                                       | Accepted | 冻结阶段闸口总览页职责                         |
| Business design     | `phase2-business-accounting-feedback-rules.md`                      | §8.5, §11.1                                                | Accepted | 固定 `L4 -> L5 gate` 绑定与下一步动作          |
| Business design     | `phase2-project-variance-risk-explanation.md`                       | §12.2                                                      | Accepted | `L5` 应回跳复用 `L4` 风险解释                  |
| Permission design   | `phase2-data-permission-and-sensitive-visibility-design.md`         | 全文                                                       | Accepted | 冻结财务读取和敏感字段边界                     |
| Query boundary      | `query-view-boundary-design.md`                                     | `CommissionStageGateView`、`CommissionRuleExplanationView` | Accepted | 本轮只消费已实现接口，不抢 future surface      |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`            | 全文                                                       | Pass     | 本片属于前端工作区第一批 `L5` 解释切片         |
| Runtime fact        | `ProjectCostApi.projectCostControllerGetBusinessAccountingFeedback` | `EX-13` generated client                                   | Fact     | 当前已有 `BusinessAccountingFeedbackView` 可用 |

## 3. 本次 SSOT

| Concern           | SSOT                                                  | Implementation Rule                                                               |
| ----------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| 解释页职责        | `phase2-commission-stage-gate-overview-workspace.md`  | 页面必须讲清楚原因、阻塞、下一步和责任边界                                        |
| 下游事实来源      | `BusinessAccountingFeedbackView`                      | 第一批解释页以已实现项目级反馈接口为准                                            |
| future route 边界 | `EX-14G1` + `query-view-boundary-design.md`           | 未实现的 `CommissionStageGateView / FinalSettlement / RuleExplanation` 不提前抢跑 |
| 操作与解释分离    | `commission/gate-overview` vs `commission/operations` | 页面职责必须分离                                                                  |
| 权限边界          | `project:read + contract:finance:manage`              | 解释页是财务读取能力，不等于提成操作能力                                          |

## 4. 命令与接口边界

| Route / Controller                                       | Command / Service                                                   | Request DTO / Contract | Response DTO / Contract          | Guard / Permission                       | Design Source                                  | Result          |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- | -------------------------------- | ---------------------------------------- | ---------------------------------------------- | --------------- |
| `GET /projects/{projectId}/business-accounting-feedback` | `ProjectCostApi.projectCostControllerGetBusinessAccountingFeedback` | `projectId` path param | `BusinessAccountingFeedbackView` | `project:read + contract:finance:manage` | `phase2-business-accounting-feedback-rules.md` | Frozen existing |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/business-accounting-feedback`
- Current implemented route(s): 同 canonical route
- Inventory status: `aligned`
- Route governance source: `EX-15G` + `EX-13B`
- Blocker / exception:
  - `CommissionStageGateView` 尚未分配独立 implemented route，本片不得猜测新的 project route。
  - `CommissionFinalSettlementView` 与 `CommissionRuleExplanationView` 已由 `EX-14G1` 冻结为 planned route，但本片不触达。

## 5. 读侧边界

| Query / View                     | Consumer                        | Fields                                                                      | Filter / Sort  | Permission Boundary                      | Design Source                                        | Result |
| -------------------------------- | ------------------------------- | --------------------------------------------------------------------------- | -------------- | ---------------------------------------- | ---------------------------------------------------- | ------ |
| `BusinessAccountingFeedbackView` | 阶段闸口解释页                  | gate 结果、税务影响、成熟度、成本侧动作建议、下一步动作、下游影响、引用版本 | 单项目只读     | `project:read + contract:finance:manage` | `L4-T04`                                             | Frozen |
| 跳转链路                         | 闸口解释页 -> `L4` / operations | 经营总览、偏差风险、提成操作入口                                            | 固定项目上下文 | 与目标页一致                             | `phase2-commission-stage-gate-overview-workspace.md` | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source  | Check Result |
| ----- | --------- | ------------------- | -------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不改 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: `L5` 第一批解释页现在有明确基线，不再继续依附于既有操作页。
- ADR-015 inventory -> route: 本片只消费已实现的 `business-accounting-feedback` route；future route 仍保持冻结。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: 无新增 command。
- Query -> view: 第一批 `L5` 解释页以项目级反馈页作为读取载体，直到专用 `CommissionStageGateView` 进入实现切片。
- Guard / permission: 解释页必须按 finance 可见性控制；操作页另行按 commission manage 控制。
- OpenAPI / generated client: 只消费既有 generated client DTO，不新增 wire contract。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                        | Result  | Gap / Reason                 |
| -------------------------------- | -------- | --------------------------------------------------------- | ------- | ---------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`                        | Pending | `G3` 统一执行                |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                       | Pending | `G3` 统一执行                |
| Unit tests                       | No       | `N/A`                                                     | N/A     | 页面解释页不单列组件单测要求 |
| API / integration tests          | No       | `N/A`                                                     | N/A     | 不改 API                     |
| E2E                              | Yes      | admin 可见解释链、viewer 受限、可跳转到 `L4` / operations | Pending | 由 `FE-05` 承担              |
| OpenAPI generation / client diff | No       | `N/A`                                                     | N/A     | 未改 contract                |
| Migration / schema check         | No       | `N/A`                                                     | N/A     | 未改 persistence             |

## 9. 例外与风险

| Exception ID              | Level | Scope                                    | Approved By | Cleanup Owner | Cleanup Due         | Notes                                                                                                     |
| ------------------------- | ----- | ---------------------------------------- | ----------- | ------------- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| `FE-03-FUTURE-STAGE-GATE` | `low` | `CommissionStageGateView` future surface | `Codex`     | `Codex`       | `进入 EX-14B G1 时` | 当前解释页先消费 `BusinessAccountingFeedbackView`，不视为替代 future `CommissionStageGateView` 的永久设计 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 解释页必须清楚区分“项目级统一动作类”与“阶段 gate 结果”。
  2. 页面必须能跳回 `L4` 经营视图，不接受孤立解释页。
  3. 若后续进入 `EX-14` 的专用解释链实现，必须重新审视本片是否需要升级或让位。
