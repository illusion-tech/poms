# API 路由治理纠偏讨论稿

## 1. 文档定位

- 状态: `discussion-draft`
- 目的: 为 `docs/design` 下后续 API 设计文档提供单一的路由与接口建模规则，修复当前“同仓库多种风格并存”的问题。
- 本稿覆盖: `interface-openapi-dto-design.md`、`commission-settlement-design.md`、`ex-08-contract-handover-gate-baseline.md`、`ex-09b-commission-freeze-command-query-baseline.md`，以及后续 Phase 2 新增 API 设计切片。
- 本稿不覆盖: 业务状态机、字段取值、权限矩阵、金额语义本身是否正确；这里只讨论接口风格与资源建模。
- 当前结论类型: `design-change-required`。这不是在否定 EX-07 / EX-08 / EX-09 已完成的业务实现，而是在记录“设计文档层面的规范仍未统一”。

## 2. 审阅结论

当前最大的设计问题，不是某一条路由单独写错，而是缺少一套全仓统一的 canonical API grammar。

现状同时存在以下风格：

- 资源型接口: `PATCH /commission-role-assignments/{id}`
- `colon-action`: `POST /project-handovers/{id}:confirm`
- `slash-action`: `POST /project-handovers/:handoverId/confirm`
- 带部署前缀的设计写法: `POST /api/...`
- 把页面投影名写进路径: `/detail`、`/summary`、`/current`
- 同一资源同时存在顶层 identity 和父资源嵌套路由 identity

这会直接带来四类问题：

1. 设计文档无法作为单一 SSOT，后续 slice 只能“沿用最近一个样子”而不是“遵守同一规则”。
2. OpenAPI、generated client、Nest controller 与讨论文档之间容易持续发生样式漂移。
3. 新人无法判断“某个操作应该建资源、建子资源，还是写 action endpoint”。
4. 评审时很难区分“业务需要特殊命令”与“只是历史风格延续”。

## 3. 建议采用的目标规范

本仓库如果要向更正式的最佳实践靠拢，建议采用下面这套规则：

### 3.1 总原则

- 资源优先，命令例外。
- 设计文档中的路径不写 `/api` 部署前缀。
- 一个资源只保留一个 canonical identity。
- 普通字段维护使用标准 HTTP 语义；只有无法表达为 create / update / replace / delete 时，才使用 custom method。

### 3.2 资源路径规则

- collection: `/resources`
- item: `/resources/{id}`
- 顶层资源段使用复数名词 + kebab-case，例如 `/commission-role-assignments`
- 如果对象已有全局主键，则 item canonical path 必须是顶层路径，不再同时把父资源路径作为正式 item identity
- 父资源嵌套路由只用于两类场景:
  - 表达“在父对象下创建子对象”
  - 表达“该子集合天然依附父对象，没有独立顶层 identity”

### 3.3 普通更新与子资源规则

- 草稿态普通维护: `PATCH /resources/{id}`
- 明确替换某个成员集合或受控子资源: `PUT /resources/{id}/subresource`
- 不要把普通字段维护伪装成 action endpoint

适用示例：

- `PATCH /platform/navigation/{id}` 优于 `POST /platform/navigation/{id}:govern`
- `PUT /platform/users/{id}/roles` 优于 `POST /platform/users/{id}/roles`

### 3.4 命令接口规则

只有当一个动作同时满足下列条件时，才使用 custom method：

- 它不是普通字段更新
- 它不是简单创建一个新资源
- 它确实表达业务动作或状态推进

命令接口统一采用 `colon-action`：

- item command: `POST /resources/{id}:verb`
- collection command: `POST /resources:verb`

不再在新的设计文档中使用 `slash-action` 作为正式写法。

动作命名规则：

- 优先使用单个简短动词，如 `:confirm`、`:activate`、`:freeze`
- 多词动作只在确实无法避免时使用 lowerCamel，例如 `:submitChange`
- 如果动作本质上会创建一个持久化的“申请 / 复核 / 争议 / 替代”对象，优先把该对象提升为资源，而不是继续堆叠 action suffix

### 3.5 查询接口规则

- `GET /resources/{id}` 就是标准详情接口，不再使用 `/detail`
- 不要把 `summary`、`detail`、`list`、`view` 当作路径后缀，仅仅用于表示页面投影
- 如果同一资源需要不同投影，优先考虑:
  - `GET /resources/{id}?view=summary`
  - 或一个稳定的名词型子资源，例如 `/projects/{id}/contract-handover`
- `current` 不应作为默认查询路径后缀；如果返回的本来就是“当前有效单例”，就让 canonical path 直接返回当前对象；如果是从历史集合中筛当前项，则优先使用查询条件或单独的单例子资源

### 3.6 路径参数规则

- 资源 identity 已明确时统一使用 `{id}`
- 只有父资源路径中，才使用 `{projectId}`、`{contractId}` 这类具名参数
- 避免在正式 API 设计中滥用 `{targetId}`，除非该资源本身就是 polymorphic target wrapper

## 4. 当前设计文档的事实性问题

### 4.1 `interface-openapi-dto-design.md`

问题不是“完全错误”，而是“顶部规则与后文示例未保持一致”。

已有正确原则：

- 普通更新使用资源语义
- 命令使用动作语义

但后续条目存在下列偏差：

- `updateNavigationItemGovernance` 使用 `POST /platform/navigation/{id}:govern`，其入参本质仍是普通治理字段，应该归入 `PATCH`
- `registerLaborCostRecord` 使用 action 风格创建资源，偏离“创建资源应使用 `POST /collection`”原则
- `reviewApprovalSummaryProjection` 直接对 `approval-summary-packages/{targetId}` 做动作，但 review 很可能是独立审计对象，资源建模尚不清晰
- 同一文档同时允许 `PATCH`、`PUT`、`colon-action`，但没有说明“什么情况下必须升级为独立资源”

### 4.2 `commission-settlement-design.md`

该文档保留了大量旧式 `slash-action` 与 project-scoped item 路径，和当前想走的正式规范不一致。

典型问题：

- `POST /commission/projects/:projectId/role-assignment/:id/freeze`
- `POST /commission/projects/:projectId/payouts/:id/submit-approval`
- `POST /commission/projects/:projectId/calculations/:id/recalculate`

这些接口至少有三层问题：

- action style 仍是 slash-action
- 路径仍把 `CommissionRoleAssignment` 等对象绑定在 `project` 的旧式 singular 嵌套下
- 同一资源后续已经在其他文档中引入顶层 plural resource，identity 出现双轨

### 4.3 `ex-08-contract-handover-gate-baseline.md`

该基线记录了真实实现结果，但从正式接口规范角度看，包含多类风格混用：

- 把 `/api` 写进设计路径
- `confirmProjectHandover` 已按实现回写为 slash-action
- 查询接口使用 `/contract-handover-summary`、`/project-handover-detail`、`/detail`
- 同一表述区间内还出现 `POST /api/approval-summary-packages/:targetId:review` 这种半路由、半 custom method 的混合写法

该文档的问题不在于业务边界，而在于“为贴合现状实现，把规范层写乱了”。

### 4.4 `ex-09b-commission-freeze-command-query-baseline.md`

该基线已明确记录：

- 设计草案是 `POST /commission-role-assignments/{id}:freeze`
- 实现落地是 `POST /commission-role-assignments/:id/freeze`

这份记录本身是事实正确的，但也说明当前仓库已经承认“正式设计路径”和“实际控制器路径”存在风格漂移。

如果后续仓库决定采用正式 `colon-action` 规范，则这类条目应归入“兼容实现例外”或补开纠偏 slice，而不是继续在后续设计里复制 slash-action。

## 5. 建议的批量替换规则

| 当前模式                                          | 建议目标模式                                                          | 说明                                   |
| ------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `POST /resources/{id}/confirm`                    | `POST /resources/{id}:confirm`                                        | 统一 custom method 风格                |
| `POST /resources/{id}/freeze`                     | `POST /resources/{id}:freeze`                                         | 统一 custom method 风格                |
| `GET /resources/{id}/detail`                      | `GET /resources/{id}`                                                 | `/detail` 不应作为 canonical item path |
| `GET /projects/{id}/xxx-summary`                  | `GET /projects/{id}/xxx` 或 `GET /projects/{id}/xxx?view=summary`     | summary 是投影，不应天然写入路径       |
| `GET /projects/{id}/xxx-detail`                   | `GET /projects/{id}/xxx` 或 `GET /resources/{id}`                     | detail 是页面概念，不是资源 identity   |
| `POST /platform/navigation/{id}:govern`           | `PATCH /platform/navigation/{id}`                                     | 普通治理字段归入资源更新               |
| `POST /project-actual-cost-records:registerLabor` | `POST /project-actual-cost-records` 或单独 `POST /labor-cost-records` | 创建资源不宜建模为 action              |
| `POST /users/{id}/roles`                          | `PUT /users/{id}/roles`                                               | 角色集合替换更接近子资源管理           |
| 带 `/api` 的设计路径                              | 不带 `/api` 的资源路径                                                | 部署前缀不应进入设计 SSOT              |

## 6. 对 EX-07 / EX-08 / EX-09 的直接影响

### 6.1 EX-07

EX-07 主要是持久化与读侧设计，接口风格问题相对次要；但凡是仍然写成 `/api/project-cost/...` 的路径，后续都应纳入统一修订。

这意味着：

- EX-07 的业务实现不需要因本讨论稿而重做
- EX-07 的接口设计文档仍有样式纠偏空间

### 6.2 EX-08

EX-08 是当前最明显暴露“查询路径包含页面投影名”和“confirm 命令写成 slash-action”的切片。

建议目标形态：

- `POST /project-handovers/{id}:confirm`
- `POST /contract-handover-rebaselines`
- `GET /project-handovers/{id}`
- `GET /projects/{projectId}/project-handover`
- `GET /projects/{projectId}/contract-handover`

这里的关键不是机械改名，而是先确认两个 read model 是否分别代表稳定单例子资源：

- 项目当前移交对象
- 项目当前合同承接摘要对象

如果答案是“是”，就不应继续保留 `-summary` / `-detail` 路径。

### 6.3 EX-09

EX-09 已经把 `CommissionRoleAssignment` 顶层化，这是正确方向；但仍保留了两个待纠偏点：

- `GET /commission-role-assignments/{id}/detail` 应收敛为 `GET /commission-role-assignments/{id}`
- `POST /commission-role-assignments/{id}/freeze` 若作为正式规范，应收敛为 `POST /commission-role-assignments/{id}:freeze`

更进一步，`submitCommissionRoleChange` 不建议继续作为长期 canonical 的 `:submitChange` 保留。

后续正式裁决已进一步确认：`EX-09` 不应落 direct `CommissionRoleChangeRequest`，而应按 dispute-first 拆为两个稳定资源：

- `POST /commission-freeze-disputes`
- `GET /commission-freeze-disputes/{id}`
- `POST /commission-freeze-disputes/{id}:arbitrate`
- `GET /commission-freeze-change-requests/{id}`

也就是先形成 `CommissionFreezeDisputeRecord`，再由仲裁产出 `CommissionFreezeChangeRequest`，而不是继续在 assignment 上叠加更多动作后缀。

## 7. 建议的实施顺序

建议分三层推进，而不是一次性重写所有已实现控制器：

1. 先修正规范层
   - 先在 `interface-openapi-dto-design.md` 固定 canonical 规则
   - 明确什么时候用 `PATCH` / `PUT` / `POST /collection` / `POST ...:verb`

2. 再修正文档层
   - `commission-settlement-design.md`
   - `ex-08-contract-handover-gate-baseline.md`
   - `ex-09b-commission-freeze-command-query-baseline.md`
   - 其他仍保留 `/api` 与 slash-action 的 baseline

3. 最后修正实现层
   - 对被触达的 controller 增加 canonical route
   - 如确有存量调用方，再保留 legacy alias 与 deprecation 标记
   - OpenAPI 与 generated client 只应以 canonical route 为主

如果没有真实外部调用方依赖 legacy route，则不建议长期双轨并存；否则文档漂移会再次出现。

## 8. 待讨论问题

下面几项需要在正式定稿前明确：

1. 查询投影统一采用 `?view=`，还是允许少量稳定名词型子资源。
2. `review`、`submitChange`、`submitApproval`、`recalculate` 这类动作中，哪些应升级为独立资源。
3. 现有 slash-action 是否只保留网关兼容，还是在 Nest controller 中保留双路由。
4. `roles`、`org-memberships`、类似成员集合接口是否统一改为 `PUT` 语义。
5. 是否接受“先定文档 canonical，历史 slice 在被触及时再纠偏实现”的渐进策略。

## 9. 参考基线

本稿建议主要参考两类成熟约束：

- 资源优先、custom method 作为例外的 API 设计方法
- custom method 使用 `colon-action` 的显式建模方式

外部可参考：

- Google AIP-136: [Custom methods](https://google.aip.dev/136)
- Swiss API Guidelines: [Swiss API Guidelines](https://github.com/swiss/api-guidelines)

## 10. 当前建议结论

如果目标是“更接近正式最佳实践”，本仓库后续应明确选择：

- canonical style = `resource-first + colon-action as exception`

不建议继续把 `slash-action` 作为正式设计风格保留下来；它可以作为历史兼容实现存在，但不应再作为后续设计文档的默认模板。
