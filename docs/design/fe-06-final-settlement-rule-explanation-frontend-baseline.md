# FE-06 `L5` 最终结算 / 规则解释读取型体验实施基线包

- Gate Status: `Pass`
- Parent: `FE-00`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-06`

## 1. 范围

- 本次目标:
  1. 在既有项目级提成工作区下冻结第二批读取页候选路由：`/projects/:id/commission/final-settlement` 与 `/projects/:id/commission/rule-explanation`。
  2. 落地最终结算页，明确区分“非质保部分已结清”“质保金待结算 / 可结算”“全部提成已结清”，不再把结算状态压平成单一“已完成”。
  3. 落地统一规则解释页，把当前阶段、阻断原因、下一步动作、责任归口和共同依据包收成稳定表达，并与 `gate-overview`、`L4` 经营页、`operations` 建立连续跳转。
  4. 页面读取全部基于既有 generated client 与 admin data-access 模式，不新增前端私有 wire contract。
- 本次明确不做:
  1. 不实现任何最终结算、质保金结算、异常调整或审批写侧动作。
  2. 不扩大后端公共 API、OpenAPI 或 generated client；如发现接口缺口，回到后端治理切片处理。
  3. 不放宽当前权限边界；若业务希望 finance 读取角色可见，必须先走后端权限治理。
  4. 不把 `L5` 统一规则解释页退化为纯文案页或静态帮助页。
- 下游可依赖的交付边界:
  1. 第二批 `L5` 读取页有正式前端实现输入，不再继续停留在“工作区首页提示”。
  2. 前端内部路由、页面职责、权限边界与数据来源在进入编码前已冻结。
  3. `FE-01` 壳层、`FE-04` store 模式和 `EX-14B1` query contract 可以作为本片稳定输入复用。
- 不允许下游依赖的留白:
  1. 不允许在页面本地重新推断 `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus` 的业务含义。
  2. 不允许把 `CommissionRuleExplanationView` 的共同依据包拆散到多个组件里各自解释。
  3. 不允许在前端把需要 `commission:payouts:manage` 的读取页伪装成“finance 读取即可进入”的页面。

## 2. 正式输入

| Input Type          | Document / Source                                                 | Section / Anchor                                                 | Status   | Notes                                                                   |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| Business design     | `phase2-commission-retention-final-settlement.md`                 | `2` ~ `8`                                                        | Review   | 冻结最终结算 / 质保金结算页必须回答的问题、状态分层与结算 gate          |
| Business design     | `phase2-commission-rule-explanation-language.md`                  | `2` ~ `8`                                                        | Review   | 冻结统一表达规则、阻断原因句式、动作词与特例表达                        |
| Business design     | `phase2-lifecycle-experience-blueprint.md`                        | `L5` 主线                                                        | Accepted | 页面必须继续处于项目级连续工作区，而不是回退成对象详情页附属入口        |
| Permission design   | `phase2-data-permission-and-sensitive-visibility-design.md`       | 全文                                                             | Accepted | 敏感字段与页面可见性必须显式冻结                                        |
| Query boundary      | `query-view-boundary-design.md`                                   | `CommissionFinalSettlementView`、`CommissionRuleExplanationView` | Accepted | 冻结两个 view 的字段组、共同依据包与 `allowedActions`                   |
| Governance baseline | `fe-00-phase2-frontend-workspace-governance-baseline.md`          | 全文                                                             | Pass     | 第二批前端切片继续遵守“设计输入不直接等于可编码输入”的治理口径          |
| Backend baseline    | `ex-14b1-final-settlement-and-rule-explanation-query-baseline.md` | 全文                                                             | Pass     | 两条 project-scoped query、contract、OpenAPI 与 generated client 已稳定 |
| Runtime fact        | `CommissionApi.commissionControllerGetCommissionFinalSettlement`  | `libs/shared/api-client/api/commission.service.ts`               | Fact     | 现有 generated client 已可直接读取 `CommissionFinalSettlementView`      |
| Runtime fact        | `CommissionApi.commissionControllerGetCommissionRuleExplanation`  | `libs/shared/api-client/api/commission.service.ts`               | Fact     | 现有 generated client 已可直接读取 `CommissionRuleExplanationView`      |
| Runtime fact        | `FE-04` `ProjectWorkspaceStore` / admin data-access 现有模式      | `libs/admin/data-access`                                         | Fact     | 当前前端已有统一读取、空态、错误态投影模式可复用                        |

## 3. 本次 SSOT

| Concern        | SSOT                                                                                     | Implementation Rule                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 页面主上下文   | 项目级提成工作区                                                                         | 新页必须挂在 `/projects/:id/commission/...`，不回退到对象详情页按钮散跳                 |
| 前端内部路由   | `/projects/:id/commission/final-settlement`、`/projects/:id/commission/rule-explanation` | 两个路径在本片进入编码前先冻结，不在实现中临时改名或并页                                |
| 数据来源       | `CommissionFinalSettlementView`、`CommissionRuleExplanationView`                         | 页面只消费既有 query view，不新增前端私有协议                                           |
| 状态语义       | `phase2-commission-retention-final-settlement.md` + `query-view-boundary-design.md`      | 非质保结清、质保金待结算 / 可结算、全部结清必须分开表达                                 |
| 解释语义       | `phase2-commission-rule-explanation-language.md`                                         | 统一解释页只做中文表达与结构化展示，不改写同一依据链在 gate / 结算页的含义              |
| 权限边界       | 当前后端 query route + permission catalog                                                | 先按 `project:read + commission:payouts:manage` 冻结；前端不得声称 finance 读取即可访问 |
| 状态承载层     | `FE-04` admin data-access / store 模式                                                   | loading / empty / error / permission-denied 投影继续放在 data-access 层，而不是页面散写 |
| 操作与解释分离 | `commission/final-settlement`、`commission/rule-explanation` vs `commission/operations`  | 新页承担读取与解释职责；操作按钮仍以既有 operations 页为主                              |

## 4. 命令与接口边界

| Route / Controller                                      | Command / Service                                                | Request DTO / Contract | Response DTO / Contract         | Guard / Permission                         | Design Source                                                                      | Result          |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------- | ------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | --------------- |
| `GET /projects/{projectId}/commission-final-settlement` | `CommissionApi.commissionControllerGetCommissionFinalSettlement` | `projectId` path param | `CommissionFinalSettlementView` | `project:read + commission:payouts:manage` | `EX-14B1` + `query-view-boundary` + `phase2-commission-retention-final-settlement` | Frozen existing |
| `GET /projects/{projectId}/commission-rule-explanation` | `CommissionApi.commissionControllerGetCommissionRuleExplanation` | `projectId` path param | `CommissionRuleExplanationView` | `project:read + commission:payouts:manage` | `EX-14B1` + `query-view-boundary` + `phase2-commission-rule-explanation-language`  | Frozen existing |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /projects/{projectId}/commission-final-settlement`、`GET /projects/{projectId}/commission-rule-explanation`
- Current implemented route(s): 同 canonical route
- Inventory status: `aligned`
- Route governance source: `EX-14G1` + `EX-14B1`
- Blocker / exception:
  - 本片不改 public route surface，但前端必须按当前已实现权限边界消费；若要放宽查询 guard，必须先新增后端治理切片。

## 5. 读侧边界

| Query / View                    | Consumer                    | Fields                                                                                                                                                                                                     | Filter / Sort  | Permission Boundary                        | Design Source                                     | Result |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------ | ------------------------------------------------- | ------ |
| `CommissionFinalSettlementView` | 最终结算页                  | `finalSettlementStatus`、`nonRetentionSettlementStatus`、`retentionSettlementStatus`、`retentionRequirementSummary`、`retentionReceiptSummary`、`departureExceptionSummary`、共同依据包与 `allowedActions` | 单项目只读     | `project:read + commission:payouts:manage` | `phase2-commission-retention-final-settlement.md` | Frozen |
| `CommissionRuleExplanationView` | 统一规则解释页              | `currentStageStatus`、`blockingReasonCategory`、`blockingReasonSummary`、`gateDecisionSummary`、`nextActionSummary`、共同依据包与 `allowedActions`                                                         | 单项目只读     | `project:read + commission:payouts:manage` | `phase2-commission-rule-explanation-language.md`  | Frozen |
| data-access / store selector    | `FE-06` 两页                | loading、empty、error、permission-denied 文案；跨页跳转需要的 `projectId` 与最小页面状态投影                                                                                                               | `N/A`          | 与页面一致                                 | `FE-04`                                           | Frozen |
| 跳转链路                        | 最终结算页 / 规则解释页互跳 | `gate-overview`、`workspace/operating-overview`、`workspace/variance-risk`、`commission/operations`                                                                                                        | 固定项目上下文 | 与目标页一致                               | `phase2-lifecycle-experience-blueprint.md`        | Frozen |

补充规则:

1. 最终结算页必须优先表达当前结论、缺口、下一步与责任归口，再展开 retention 条件与共同依据包。
2. 统一规则解释页必须复用后端现成 `blockingReasonCategory` / `blockingReasonSummary`，不在前端发明第二套原因分类。
3. 页面若显示 `allowedActions`，只能作为去 `operations` 的导航提示，不直接在本片落写侧操作。

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source  | Check Result |
| ----- | --------- | ------------------- | -------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不改 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: 第二批前端页以 `EX-14B1` 已冻结 query contract 为基础，不再停留在工作区首页占位文案。
- ADR-015 inventory -> route: 本片只消费已对齐的 canonical query route，不新增或改写公共路由。
- Migration -> entity: `N/A`。
- Entity -> contract: `N/A`。
- Route -> command: 无新增 command；新页只承担读侧与解释职责。
- Query -> view: 最终结算页与规则解释页必须分别直连对应 shared view，不得页面本地拼接替代字段。
- Guard / permission: 页面访问边界先严格沿用后端 query guard；若体验希望更宽，需要单独治理。
- OpenAPI / generated client: 明确禁止新建前端专用 DTO 或跳过 generated client 直接手写请求。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                             | Result  | Gap / Reason                     |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | ------- | -------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`                                                             | Pending | `G3` 执行                        |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                                                            | Pending | `G3` 执行                        |
| Unit tests                       | Yes      | data-access / selector 派生状态单测                                                            | Pending | 页面读侧投影与权限态需要最小单测 |
| API / integration tests          | No       | `N/A`                                                                                          | N/A     | 不改 API                         |
| E2E                              | Yes      | 登录后从项目详情按钮或工作区入口进入两页；验证互跳、直接路由、权限拒绝与回到 operations / `L4` | Pending | 本片必须补，不能只做 URL 直达    |
| OpenAPI generation / client diff | No       | `N/A`                                                                                          | N/A     | 只消费现有 generated client      |
| Migration / schema check         | No       | `N/A`                                                                                          | N/A     | 不改 persistence                 |
| `git diff --check`               | Yes      | `git diff --check`                                                                             | Pending | `G3` 执行                        |

## 9. 例外与风险

| Exception ID               | Level    | Scope                              | Approved By | Cleanup Owner | Cleanup Due                      | Notes                                                                                                |
| -------------------------- | -------- | ---------------------------------- | ----------- | ------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `FE-06-PERMISSION-AS-IS`   | `medium` | 最终结算 / 规则解释页权限边界      | `Codex`     | `Codex`       | `若发起权限治理时`               | 当前后端 query 要求 `commission:payouts:manage`；前端本片按事实冻结，不把页面伪装成 finance 只读入口 |
| `FE-06-RETENTION-READONLY` | `low`    | retention 收口链在本片中的只读展示 | `Codex`     | `Codex`       | `EX-14 retention 写侧进入 G1 时` | 现阶段只读展示 retention 状态与阻塞，不在页面直接给 retention 写侧操作                               |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. 新页必须继续挂在项目级提成工作区内，不接受脱离项目上下文的新列表页或报告页。
  2. 最终结算页必须清楚区分非质保结清、质保金待结算 / 可结算与全部结清三类语义。
  3. 统一规则解释页必须承担“为什么当前不能继续、该去哪处理”的职责，而不是只展示状态码。
  4. 若实现中发现需要新增权限 key、改 query guard、改 public DTO / route，必须先停下并回到后端治理切片。
