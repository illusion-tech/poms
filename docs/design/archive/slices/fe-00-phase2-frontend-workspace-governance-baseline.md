# FE-00 Phase 2 前端工作区治理与 G1 冻结基线包

- Gate Status: `Pass`
- Parent: `L4/L5`
- Owner: `Codex`
- Slice Type: `process-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-00`

## 1. 范围

- 本次目标:
  1. 把 Phase 2 前端执行线正式拆成 `FE-00 ~ FE-05` 六个可执行切片，并先写入 tracker。
  2. 固定“`B5 ~ B30` 已完成设计评审，但它们是正式设计输入，不直接等于可编码输入”的治理口径。
  3. 对项目主上下文、导航组织、`L4 / L5` 解释职责、现有可消费接口、权限边界与 E2E 入口完成一次定向复审。
  4. 为后续 `FE-01 ~ FE-05` 提供统一的 `G1` 入口和 `G3 / G4` 留痕边界。
- 本次明确不做:
  1. 不新增或变更任何后端 public route surface。
  2. 不把 `L1` / `L3` 的完整工作区混入本轮第一批前端实现。
  3. 不把当前本地前端 WIP 直接标记为 `Done` 或绕过 `G3 / G4`。
- 下游可依赖的交付边界:
  1. `FE-01 ~ FE-05` 已具备 tracker 行、owner、依赖、完成定义与基线包路径。
  2. 第一批项目级工作区候选内部路由与权限边界已冻结。
  3. 第一批前端只允许消费 `EX-13` 已实现的读接口与既有 `commission operations` 页面，不再口头继承范围。
- 不允许下游依赖的留白:
  1. 不允许把“设计已评审”直接视作“页面可开工”。
  2. 不允许为 `CommissionStageGateView` 猜测未冻结的后端 route。
  3. 不允许在没有 `G3` 校验前把本轮前端代码当作稳定基线。

## 2. 正式输入

| Input Type                | Document / Source                                                                | Section / Anchor                                                                            | Status            | Notes                                                       |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| Business design           | `phase2-lifecycle-experience-blueprint.md`                                       | 项目级连续工作区主线                                                                        | Accepted          | 冻结“项目主上下文优先于对象详情页”的体验主线                |
| Business design           | `phase2-user-task-map.md`                                                        | §6, §7                                                                                      | Accepted          | 固定“提成治理有基础能力但体验未制度化”的断点判断            |
| Business design           | `phase2-project-business-outcome-overview.md`                                    | `L4-T01`                                                                                    | Accepted          | 冻结项目经营总览的解释职责与动作等级语义                    |
| Business design           | `phase2-project-unified-accounting-view-caliber.md`                              | `L4-T02`                                                                                    | Accepted          | 冻结统一核算口径及对 `L5` 的共享输入                        |
| Business design           | `phase2-project-variance-risk-explanation.md`                                    | `L4-T03`                                                                                    | Accepted          | 冻结偏差 / 风险解释页的职责                                 |
| Business design           | `phase2-business-accounting-feedback-rules.md`                                   | `L4-T04`                                                                                    | Accepted          | 冻结 `L4 -> L5 gate` 绑定与统一动作语义                     |
| Business design           | `phase2-commission-stage-gate-overview-workspace.md`                             | 全文                                                                                        | Accepted          | 冻结 `L5` 阶段闸口总览页的解释职责                          |
| Business design           | `phase2-commission-rule-explanation-language.md`                                 | `L5-T04`                                                                                    | Accepted          | 作为后续表达链输入，本轮不直接实施                          |
| Query boundary            | `query-view-boundary-design.md`                                                  | `CommissionStageGateView`、`CommissionFinalSettlementView`、`CommissionRuleExplanationView` | Accepted          | 确认本轮只消费已实现读侧，不提前猜测 future surface         |
| Permission design         | `phase2-data-permission-and-sensitive-visibility-design.md`                      | 全文                                                                                        | Accepted          | 冻结财务敏感字段、角色可见性与页面边界                      |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`、`../adr/015-api-route-canonical-grammar.md`  | `EX-13` / `EX-14G1` rows                                                                    | Active / Accepted | 确认本轮前端消费的后端 route 已进入 authoritative inventory |
| Governance                | `implementation-governance-gates.md`、`../reference/solo-worktree-governance.md` | `G0 ~ G4`                                                                                   | Active            | 冻结 solo worktree 留痕方式                                 |
| Runtime fact              | `libs/shared/api-client`、`apps/poms-admin/src/app.routes.ts`、当前工作树        | 2026-04-18                                                                                  | Fact              | 当前已有 `EX-13` 读接口与 commission operations 页面可消费  |

## 3. 本次 SSOT

| Concern                    | SSOT                                                                  | Implementation Rule                                                        |
| -------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 设计评审输入 vs 可编码输入 | `B5 ~ B30` 工作区 / 体验设计结论 + 本组基线包                         | 已评审设计是上游输入；前端编码必须继续落到 `FE-01 ~ FE-05` 的 `G1` 包上    |
| 前端主上下文               | `/projects/:id/...` 项目级工作区                                      | 新页面默认挂在项目上下文，不再以对象详情页充当连续工作区                   |
| 第一批范围                 | `FE-01 ~ FE-05`                                                       | 先做工作区壳层、`L4` 读取型页面、`L5` gate 解释页、data-access、权限 / E2E |
| 后端接口来源               | `EX-13` 已实现并已入 inventory 的读接口                               | 本轮只能消费既有 generated client，不新增 wire contract                    |
| 权限边界                   | `project:read`、`contract:finance:manage`、各项 `commission:*:manage` | 工作区入口、财务读取页、提成操作页必须分层鉴权                             |
| 证据载体                   | tracker + 基线包 + 本地 `G3` checkpoint                               | 没有 PR 时也必须留痕，不得口头放行                                         |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source                                   | Result |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ----------------------------------------------- | ------ |
| `N/A`              | `N/A`             | `N/A`                  | `N/A`                   | `N/A`              | 本片为前端治理切片，不新增 public route surface | Pass   |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `N/A`
- Canonical route(s): `N/A`
- Current implemented route(s): `N/A`
- Inventory status: `N/A`
- Route governance source: `N/A`
- Blocker / exception: `N/A`

## 5. 读侧边界

| Query / View              | Consumer | Fields                                          | Filter / Sort              | Permission Boundary                      | Design Source                                                                                | Result |
| ------------------------- | -------- | ----------------------------------------------- | -------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| 项目工作区壳层            | `FE-01`  | 当前阶段、下一步、缺口、责任人、内部导航上下文  | 固定项目级上下文           | `project:read`                           | `phase2-lifecycle-experience-blueprint.md`                                                   | Frozen |
| `L4` 经营总览 / 偏差解释  | `FE-02`  | 动作等级、成熟度、税务影响、引用版本、缺口解释  | 项目级只读                 | `project:read + contract:finance:manage` | `phase2-project-business-outcome-overview.md`、`phase2-project-variance-risk-explanation.md` | Frozen |
| `L5` 阶段闸口解释         | `FE-03`  | 为什么可发 / 不可发、下一步、下游影响、跳转入口 | 项目级只读                 | `project:read + contract:finance:manage` | `phase2-commission-stage-gate-overview-workspace.md`                                         | Frozen |
| 前端派生 store / selector | `FE-04`  | 只允许基于 generated client DTO 做前端投影      | 不建立第二套 wire contract | 与页面一致                               | `phase2-business-accounting-feedback-rules.md`                                               | Frozen |
| 工作区入口与权限 E2E      | `FE-05`  | 项目页进入、直接路由、viewer/admin 可见性       | 关键入口链路               | 与路由 guard 一致                        | `phase2-data-permission-and-sensitive-visibility-design.md`                                  | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source    | Check Result |
| ----- | --------- | ------------------- | ---------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | 本片不触达 persistence | N/A          |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | N/A    |

## 7. 一致性结论

- Document -> code: `B5 ~ B30` 已视为正式设计评审输入，但本轮新增 `FE-00 ~ FE-05` 作为可编码切片，不再直接从设计大文档跨跳到页面实现。
- ADR-015 inventory -> route: 本轮前端不新增后端 route，只消费 `EX-13` 已实现 canonical route；`EX-14G1` 仍保持 future surface 冻结态。
- Migration -> entity: `N/A`，本片不触达 persistence。
- Entity -> contract: `N/A`，本片不触达 shared contract。
- Route -> command: `N/A`，本片不新增 public command。
- Query -> view: 第一批前端页只消费 `EX-13` 的项目级读取接口与既有 commission operations 页面。
- Guard / permission: 已冻结“壳层入口可读、财务读取页受 finance 权限限制、操作页受 commission manage 权限限制”的分层边界。
- OpenAPI / generated client: 本片只消费现有 generated client；若后续发现 `L4 / L5` 缺接口，必须先开后端治理切片。
- 定向复审结论:
  1. 项目主上下文连续性: Pass
  2. 导航按任务组织而非对象表结构: Pass
  3. `L4 / L5` 页承担解释原因与阻塞职责: Pass
  4. 前端可消费接口真实存在且稳定: Pass
  5. 敏感字段与权限边界明确: Pass
  6. E2E 入口与关键解释链路已列为强制验证项: Pass

## 8. 测试与校验

| Check                            | Required | Command / Evidence | Result | Gap / Reason         |
| -------------------------------- | -------- | ------------------ | ------ | -------------------- |
| Lint                             | No       | `N/A`              | N/A    | 本片为 process-only  |
| Build                            | No       | `N/A`              | N/A    | 本片为 process-only  |
| Unit tests                       | No       | `N/A`              | N/A    | 本片为 process-only  |
| API / integration tests          | No       | `N/A`              | N/A    | 本片不触达 API       |
| E2E                              | No       | `N/A`              | N/A    | 由 `FE-05` 承担      |
| OpenAPI generation / client diff | No       | `N/A`              | N/A    | 未改 public contract |
| Migration / schema check         | No       | `N/A`              | N/A    | 未改 persistence     |

## 9. 例外与风险

| Exception ID      | Level    | Scope                          | Approved By | Cleanup Owner | Cleanup Due  | Notes                                                                                          |
| ----------------- | -------- | ------------------------------ | ----------- | ------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `FE-WIP-20260418` | `medium` | `FE-01 ~ FE-05` 当前本地工作树 | `Codex`     | `Codex`       | `2026-04-18` | 在 tracker / 基线补齐前已存在前端本地 WIP；允许保留，但不得跳过 `G3 / G4`，也不得误记为 `Done` |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-18`
- Conditions:
  1. `FE-01 ~ FE-05` 进入编码或继续保留 WIP 前，必须分别绑定本片拆出的子基线包。
  2. 若发现 `L4 / L5` 缺失后端读取接口，不得在前端页面临时拼装；必须回退到后端治理切片。
  3. 当前所有前端 WIP 只能保持 `Doing`，直到 `G3` 校验与 `G4` close-out 完成。
