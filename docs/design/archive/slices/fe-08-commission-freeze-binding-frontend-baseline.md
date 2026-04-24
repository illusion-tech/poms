# FE-08 `L3-S2` 提成冻结与责任边界绑定前端实现基线包

- Gate Status: `Pass`
- Parent: Phase 2 frontend workspace / `L3`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-08`

## 1. 范围

- 本次目标:
  1. 在提成工作区新增独立的“冻结与责任边界”读取页，承接 `L3-T03` 冻结绑定移交语义。
  2. 前端显式表达当前冻结状态、参与人 / 权重、责任边界、回款判断模式、移交收口引用链以及当前下一步。
  3. 将冻结读取页与现有 `gate-overview` / `rule-explanation` / `operations` 串成连续体验，而不是继续把冻结信息散落在下游解释页里。
  4. 保持第一页为读取 / 解释型体验，先不把冻结写动作、争议仲裁、替代版本链操作混进同一片。
- 本次明确不做:
  1. 不新增或修改 public API route surface、OpenAPI、generated client、DTO 或权限键。
  2. 不在本片实现冻结写动作、争议提交、仲裁、替代冻结版本或任何 form dialog。
  3. 不把冻结页并回 `project-contract-handover` 或 `project-commission` operations；保持独立路由和独立解释职责。
  4. 不因为前端想展示更多信息而本地放宽读取权限；若现有后端读取边界不足，必须回到后端治理切片。
- 下游可依赖的交付边界:
  1. `/projects/:id/commission/freeze-binding` 成为稳定的冻结绑定读取入口。
  2. 现有提成工作区导航有统一入口，能从壳层进入该页。
  3. `FE-08` 交付后，`L3` 冻结与责任边界不再只在 `L5` 规则解释页被动出现，而有独立上游解释页。

## 2. 正式输入

| Input Type              | Document / Source                                                                        | Section / Anchor                                            | Status  | Notes                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Prior frontend closeout | `docs/design/archive/slices/fe-07-contract-to-handover-read-workspace-g3-g4-closeout.md` | 全文                                                        | G4      | `FE-08` 继续承接 L3 工作区、shared UI 与 E2E 入口模式。                                       |
| Business design         | `docs/design/phase2-commission-freeze-at-handover.md`                                    | `§2`、`§3`、`§4`、`§6`                                      | Review  | 冻结必须绑定移交，且应有独立冻结页与明确前置条件 / 结果说明。                                 |
| Business design         | `docs/design/phase2-handover-closure-rules.md`                                           | `§3.3`、`§4`、`§5`、`§6`                                    | Review  | 冻结与移交、生效合同、基线快照一起构成统一收口链。                                            |
| Runtime route fact      | `apps/poms-admin/src/app.routes.ts`                                                      | `projects/:id/commission/*`                                 | Fact    | 当前提成工作区已有 `gate-overview` / `final-settlement` / `rule-explanation` / `operations`。 |
| Runtime shell fact      | `apps/poms-admin/src/app/features/commission/project-commission-shell.ts`                | `tabs()`                                                    | Fact    | 壳层已具备统一 nav，可承接新读取页 tab。                                                      |
| Existing read pages     | `apps/poms-admin/src/app/features/commission/project-commission-gate-overview.ts`        | 全文                                                        | Fact    | 当前 `L5` 页已零散消费 freeze version 摘要，但不承担 `L3` 冻结解释职责。                      |
| Existing read pages     | `apps/poms-admin/src/app/features/commission/project-commission-rule-explanation.ts`     | 全文                                                        | Fact    | 当前规则解释页展示 freeze version 摘要与参与人，但缺移交绑定解释链。                          |
| Existing client query   | `libs/shared/api-client/api/commission.service.ts`                                       | `commissionControllerGetCurrentRoleAssignment`              | aligned | 已存在 `GET /api/projects/{projectId}/commission-role-assignment`。                           |
| Existing client query   | `libs/shared/api-client/api/commission-role-assignments.service.ts`                      | `commissionRoleAssignmentControllerGetRoleAssignmentDetail` | aligned | 已存在 `GET /api/commission-role-assignments/{id}`。                                          |
| Existing client query   | `libs/admin/data-access/src/lib/project/project-workspace.store.ts`                      | `loadContractHandover`                                      | Fact    | 已有 `ProjectHandoverDetailView` 读取能力，可与冻结详情联合展示。                             |

## 3. 本次 SSOT

| Concern    | SSOT                                                                | Implementation Rule                                                                                      |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 冻结语义   | `phase2-commission-freeze-at-handover.md`                           | 冻结结果是绑定移交的正式版本，不是普通保存结果。                                                         |
| 收口链语义 | `phase2-handover-closure-rules.md`                                  | 页面必须能解释冻结与移交、移交前有效基线、回款判断模式之间的联合追溯关系。                               |
| 读侧来源   | 现有 generated client                                               | 只消费当前角色分配 summary、冻结详情、移交详情；不本地拼 contract / gate / rule explanation 的替代来源。 |
| 前端路由   | 本基线包                                                            | 新页内部路由固定为 `/projects/:id/commission/freeze-binding`。                                           |
| 页面职责   | 本基线包                                                            | 该页负责“当前冻结状态 / 责任边界 / 前置条件 / 下一步 / 对 L5 影响”的解释，不承担发起冻结或争议处理动作。 |
| 权限边界   | 现有后端读取边界 + commission shell `project:read`                  | 前端不得本地放宽权限；若现有后端读取权限不足以支撑此页，需拆后端治理切片。                               |
| 组件模式   | `SectionCard` + `WorkspaceFactGrid` + `WorkspaceFeedback` + PrimeNG | 延续 Poseidon / PrimeNG 读取型页面模式，不回退到手写区块。                                               |

## 4. 页面与组件边界

| Surface                                                                            | Change Type               | Data Source                                          | Result  |
| ---------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------- | ------- |
| `apps/poms-admin/src/app.routes.ts`                                                | internal route addition   | existing commission shell                            | planned |
| `apps/poms-admin/src/app/features/commission/project-commission-shell.ts`          | nav extension             | existing shell                                       | planned |
| `apps/poms-admin/src/app/features/commission/project-commission-freeze-binding.ts` | new read page             | role assignment + handover detail                    | planned |
| `libs/admin/data-access/src/lib/project/project-workspace.store.ts`                | read-side extension       | commission / role-assignment / project-handover APIs | planned |
| `apps/poms-admin/src/app/features/commission/*.spec.ts`                            | focused unit verification | shell / page / store                                 | planned |

### 4.1 路由冻结

- 候选内部路由固定为:
  - `/projects/:id/commission/freeze-binding`
- 提成工作区导航新增标签:
  - `冻结与责任边界`

### 4.2 页面信息框架

冻结读取页默认分 4 个区块：

1. 当前冻结状态
   - 当前状态
   - 冻结版本号
   - 冻结时间
   - 冻结确认人 / 当前依据摘要
2. 责任边界与回款判断模式
   - 参与人 / 角色 / 权重
   - 项目级回款判断模式
   - 关键责任边界说明
3. 收口链引用
   - source handover
   - handover summary snapshot
   - effective handover baseline
   - projection / export policy
4. 下一步与对 L5 的影响
   - 当前是否已可作为 `L5` 稳定输入
   - 若未冻结或冻结失效，指出为什么仍不能直接进入后续提成主线

### 4.3 缺口表达规则

1. 若没有当前角色分配 summary：
   - 显示“尚未形成当前冻结版本”
   - 不伪造冻结时间、移交引用或责任边界
2. 若有 current summary 但 status 不是 `frozen`：
   - 明确显示“当前仍未完成正式冻结”
   - 页面继续展示参与人与前置条件缺口，不假装已经绑定移交
3. 若存在 frozen detail：
   - 展示绑定移交链、基线链和 receipt judgment mode
4. 若后续争议 / 变更链缺少 project-scope 当前摘要：
   - 页面只提示“后续争议 / 替代版本链需到操作链或后续切片查看”
   - 不用前端遍历全量调整 / 发放记录去反推争议状态

## 5. 读侧映射规则

| Source                                                     | UI Meaning                     | Notes                                                               |
| ---------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `GET /api/projects/{projectId}/commission-role-assignment` | 当前版本摘要入口               | 用于判断是否存在 current assignment，以及当前 status / version。    |
| `GET /api/commission-role-assignments/{id}`                | 冻结绑定详情                   | 用于展示 source handover、baseline summary、receipt judgment mode。 |
| `GET /projects/{projectId}/project-handover-detail`        | 移交上下文与执行责任           | 与冻结详情联合展示，不重复造一套移交摘要。                          |
| Existing shell/project context                             | 项目名称、阶段、状态、返回动作 | 继续复用 shared context header。                                    |

Fallback rules:

- 不从 `final-settlement` / `rule-explanation` 页字段回推冻结详情。
- 不从 `allowedActions.length` 推断冻结是否有效。
- 不从 operations 页的计算 / 发放 / 调整结果反推“已冻结”。

## 6. 测试与校验

| Check                  | Required   | Command / Evidence                                                                          | Result       |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------- | ------------ |
| Diff hygiene           | Yes        | `git diff --check`                                                                          | Pending      |
| Admin data-access lint | If touched | `corepack pnpm nx lint admin-data-access`                                                   | Pending      |
| Admin lint             | Yes        | `corepack pnpm nx lint poms-admin`                                                          | Pending      |
| Admin build            | Yes        | `corepack pnpm nx build poms-admin`                                                         | Pending      |
| Focused unit tests     | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-freeze` | Pending      |
| Shell / route tests    | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-commission-shell`  | Pending      |
| Store tests            | If touched | `corepack pnpm nx test admin-data-access --runInBand --testPathPatterns=project-workspace`  | Pending      |
| E2E                    | Yes        | 登录后从项目列表 / 提成工作区入口进入冻结页；直接路由访问；权限拒绝与 tab 可见性验证        | Pending      |
| OpenAPI / client diff  | No         | 本片默认只消费既有 aligned routes                                                           | Not required |

## 7. 例外与风险

| Exception ID                              | Level | Scope                     | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                         |
| ----------------------------------------- | ----- | ------------------------- | ----------- | ------------- | ----------- | ----------------------------------------------------------------------------- |
| `FE08-E1-DISPUTE-CHAIN-QUERY-SCOPE`       | Low   | 冻结后争议 / 替代版本展示 | Codex       | `FE-08`       | `FE-08 G4`  | 若缺 project-scope 当前争议摘要，则本片先不硬拼仲裁链，必要时拆后端治理切片。 |
| `FE08-E2-PERMISSION-BOUNDARY-NO-WIDENING` | Low   | 读取权限边界              | Codex       | `FE-08`       | `FE-08 G4`  | 现有读取边界不足时必须回后端治理，不接受前端本地兜底放宽。                    |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions:
  1. `FE-08` 先做独立冻结读取页，不与 operations 写动作混片。
  2. 路由固定为 `/projects/:id/commission/freeze-binding`。
  3. 当前冻结页的唯一权威来源是 current role assignment summary/detail 与 project handover detail。
  4. 若要补 project-scope 的当前争议 / 替代冻结链摘要，必须先确认现有后端是否已有稳定 query；没有就另开治理切片。
