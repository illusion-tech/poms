# FE-02 `L4` 经营总览 / 偏差风险读取页实施基线包

- Gate Status: `Pass`
- Parent: `FE-00`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-02`

## 1. 范围

- 本次目标:
  1. 落地 `/projects/:id/workspace/operating-overview` 与 `/projects/:id/workspace/variance-risk` 两个项目级读取页。
  2. 让 `L4` 页面承担“当前状态 / 缺口 / 下一步 / 阻塞解释”职责，而不是仅展示数字。
  3. 让 `L5` 后续页面可回跳到经营读取链，而不是在提成页再造一套经营解释。
- 本次明确不做:
  1. 不新增后端 `L4` 接口。
  2. 不在前端重算 `L4 -> L5` 的阶段 gate。
  3. 不扩展到 `EX-14` 的最终结算 / 规则解释页。
- 下游可依赖的交付边界:
  1. `L4-T01 / T02 / T03` 第一批项目级页面有稳定入口与字段投影。
  2. `L5` 可直接跳转到 `L4` 总览与风险解释页查看原因链。
  3. 页面层不会自行改写 `currentActionLevel` 与引用版本语义。
- 不允许下游依赖的留白:
  1. 不允许只展示金额，不展示动作等级 / 成熟度 / 引用版本。
  2. 不允许把 `L4` 的项目级动作等级直接投射成 `L5` 的阶段结论。

## 2. 正式输入

| Input Type          | Document / Source                                           | Section / Anchor         | Status   | Notes                                                                                                            |
| ------------------- | ----------------------------------------------------------- | ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| Business design     | `phase2-project-business-outcome-overview.md`               | `L4-T01`                 | Accepted | 冻结经营总览页目标与核心解释问题                                                                                 |
| Business design     | `phase2-project-unified-accounting-view-caliber.md`         | `L4-T02`                 | Accepted | 冻结统一核算口径与引用版本语义                                                                                   |
| Business design     | `phase2-project-variance-risk-explanation.md`               | `L4-T03`                 | Accepted | 冻结偏差来源、建议动作与解释职责                                                                                 |
| Business design     | `phase2-business-accounting-feedback-rules.md`              | `L4-T04`                 | Accepted | 固定 `currentActionLevel` 与 `L5` 关系                                                                           |
| Permission design   | `phase2-data-permission-and-sensitive-visibility-design.md` | 全文                     | Accepted | 冻结财务读取边界                                                                                                 |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`    | 全文                     | Pass     | 本片为前端工作区第一批读取页                                                                                     |
| Runtime fact        | `libs/shared/api-client/api/project-cost.service.ts`        | `EX-13` generated client | Fact     | 当前已有 `getProjectBusinessOutcomeOverview`、`getProjectUnifiedAccounting`、`getProjectVarianceRiskExplanation` |

## 3. 本次 SSOT

| Concern        | SSOT                                           | Implementation Rule                                    |
| -------------- | ---------------------------------------------- | ------------------------------------------------------ |
| 经营总览页职责 | `L4-T01`                                       | 不只是“看数”，必须解释当前经营状态与下一步             |
| 统一核算口径   | `L4-T02`                                       | 不重新生成第二套收入 / 成本口径                        |
| 风险解释职责   | `L4-T03`                                       | 风险页必须负责解释偏差来源和阻塞原因                   |
| 动作等级语义   | `phase2-business-accounting-feedback-rules.md` | `currentActionLevel` 是项目级统一动作类，不是阶段 gate |
| 权限边界       | `project:read + contract:finance:manage`       | viewer 可见壳层，不等于可见财务页                      |

## 4. 命令与接口边界

| Route / Controller                                    | Command / Service                                                       | Request DTO / Contract | Response DTO / Contract              | Guard / Permission                       | Design Source                                       | Result          |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- | ------------------------------------ | ---------------------------------------- | --------------------------------------------------- | --------------- |
| `GET /projects/{projectId}/business-outcome-overview` | `ProjectCostApi.projectCostControllerGetProjectBusinessOutcomeOverview` | `projectId` path param | `ProjectBusinessOutcomeOverviewView` | `project:read + contract:finance:manage` | `phase2-project-business-outcome-overview.md`       | Frozen existing |
| `GET /projects/{projectId}/unified-accounting`        | `ProjectCostApi.projectCostControllerGetProjectUnifiedAccounting`       | `projectId` path param | `ProjectUnifiedAccountingView`       | `project:read + contract:finance:manage` | `phase2-project-unified-accounting-view-caliber.md` | Frozen existing |
| `GET /projects/{projectId}/variance-risk-explanation` | `ProjectCostApi.projectCostControllerGetProjectVarianceRiskExplanation` | `projectId` path param | `ProjectVarianceRiskExplanationView` | `project:read + contract:finance:manage` | `phase2-project-variance-risk-explanation.md`       | Frozen existing |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/business-outcome-overview`、`GET /projects/{projectId}/unified-accounting`、`GET /projects/{projectId}/variance-risk-explanation`
- Current implemented route(s): 同 canonical route
- Inventory status: `aligned`
- Route governance source: `EX-15G` + `EX-13B`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View                         | Consumer     | Fields                                                                       | Filter / Sort | Permission Boundary                      | Design Source | Result |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------- | ------------- | ---------------------------------------- | ------------- | ------ |
| `ProjectBusinessOutcomeOverviewView` | 经营总览页   | 当前动作等级、税务影响摘要、数据成熟度、毛利结果、引用版本                   | 单项目只读    | `project:read + contract:finance:manage` | `L4-T01`      | Frozen |
| `ProjectUnifiedAccountingView`       | 经营总览页   | 合同金额、回款、基线成本、实际成本、偏差金额 / 比例                          | 单项目只读    | `project:read + contract:finance:manage` | `L4-T02`      | Frozen |
| `ProjectVarianceRiskExplanationView` | 偏差与风险页 | 风险等级、偏差来源、建议动作、税务影响、分摊稳定性、未映射成本提示、引用版本 | 单项目只读    | `project:read + contract:finance:manage` | `L4-T03`      | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source                | Check Result |
| ----- | --------- | ------------------- | ---------------------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不改 persistence，只消费读接口 | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: `L4-T01 / T02 / T03` 的解释职责已被明确绑定到前端页面，不再只是金额卡片。
- ADR-015 inventory -> route: 本片消费的三个后端 route 已在 inventory 中对齐。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`，只消费现有生成契约。
- Route -> command: 无新增 command；前端只读取。
- Query -> view: 三个 query 各司其职，总览页可聚合展示，但不得改写原始语义。
- Guard / permission: 财务读取页统一要求 `contract:finance:manage`。
- OpenAPI / generated client: 只允许从 generated client DTO 派生前端 view model，不另造 wire contract。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                  | Result  | Gap / Reason          |
| -------------------------------- | -------- | ----------------------------------- | ------- | --------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`  | Pending | `G3` 统一执行         |
| Build                            | Yes      | `corepack pnpm nx build poms-admin` | Pending | `G3` 统一执行         |
| Unit tests                       | Yes      | 对 store / selector 派生逻辑补单测  | Pending | 由 `FE-04` 承担       |
| API / integration tests          | No       | `N/A`                               | N/A     | 不改 API              |
| E2E                              | Yes      | 经营总览 / 偏差解释入口与文本链路   | Pending | 由 `FE-05` 承担       |
| OpenAPI generation / client diff | No       | `N/A`                               | N/A     | 未改 generated client |
| Migration / schema check         | No       | `N/A`                               | N/A     | 未改 persistence      |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------------------------------------------------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 若实际缺字段，应先开后端治理切片，不在前端补猜测逻辑 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 前端必须同时展示动作等级、成熟度、税务影响和引用版本，不接受只显示金额。
  2. `L5` 跳转回 `L4` 的入口必须是稳定链路。
  3. 页面进入 `Done` 前，store / selector 的聚合逻辑需要单测与 E2E 双留痕。
