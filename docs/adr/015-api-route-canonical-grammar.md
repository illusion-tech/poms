# ADR-015: API 资源标识、查询投影与命令路径 canonical grammar

**状态**: 已接受 (Accepted)
**日期**: 2026-04-16

---

## 1. 背景 (Context)

随着 `EX-07`、`EX-08`、`EX-09` 持续推进，仓库中的 API 设计与实现已经暴露出一类跨文档、跨模块的共性问题：

- 资源型路径、`colon-action`、`slash-action` 同时存在
- 部分设计文档把 `/api` 部署前缀写入正式路径
- 部分查询接口把页面投影名写进 URI，例如 `/detail`、`/summary`、`/current`
- 同一资源同时存在顶层 canonical identity 和父资源嵌套 identity
- OpenAPI 草案、Nest controller 实现、generated client 与切片 baseline 之间开始出现风格漂移

当前已经可以看到的典型例子包括：

- `POST /project-handovers/{id}:confirm` 与 `POST /project-handovers/:handoverId/confirm`
- `POST /commission-role-assignments/{id}:freeze` 与 `POST /commission-role-assignments/:id/freeze`
- `GET /commission-role-assignments/:id/detail`
- `GET /projects/:projectId/contract-handover-summary`
- `GET /projects/:projectId/project-handover-detail`
- `POST /platform/navigation/{id}:govern`
- `POST /project-actual-cost-records:registerLabor`

如果这个问题继续停留在“各切片按最近实现惯例各自选择”的状态，将直接带来：

- 设计文档无法形成单一 SSOT
- 新切片无法判断应该建资源、子资源还是 action endpoint
- OpenAPI / generated client 的 canonical route 无法稳定
- 后续评审难以区分“业务需要特殊命令”与“历史路径风格残留”

因此，需要一个正式 ADR，固定 `POMS` 后续 API 设计应遵循的 canonical grammar，而不是继续依赖局部习惯。

---

## 2. 决策驱动因素 (Decision Drivers)

- **正式最佳实践对齐 (Best-Practice Alignment)**: 希望后续 API 设计更接近成熟的 resource-first 约束，而不是延续项目内历史样式。
- **单一可信源 (Single Source of Truth)**: 设计文档、OpenAPI、控制器和 generated client 需要有共同的 canonical route 表达。
- **资源标识清晰度 (Resource Identity Clarity)**: 每个一等资源应有稳定、唯一、可引用的 canonical identity。
- **查询投影可解释性 (Projection Clarity)**: 页面投影、摘要投影、稳定聚合对象必须有明确建模边界，避免把页面概念直接写进资源路径。
- **命令建模一致性 (Command Consistency)**: 需要明确什么情况下用普通资源更新，什么情况下用 custom method，什么情况下应提升为独立资源。
- **迁移可执行性 (Migration Practicality)**: 决策必须允许按受控顺序实施，但默认目标应是单次收口，而不是先引入长期过渡层。
- **收敛时效性 (Convergence Timeliness)**: 渐进实施只是一种工程顺序，不是产品策略；正式目标应是尽快完成全仓 canonical 收敛。
- **开发期清晰度 (Development Clarity)**: 开发过程中应尽量避免双路由、双文档、双契约并存，因为这会明显放大认知成本与误用风险。
- **兼容成本控制 (Compatibility Cost Control)**: 既有 `slash-action` 或旧式嵌套路径在必要时可保留兼容层，但不能继续污染正式规范。

---

## 3. 候选方案 (Considered Options)

### 方案 A: 维持当前混合风格，按切片各自选择

- **描述**: 不形成统一 grammar。后续设计继续允许 `colon-action`、`slash-action`、`/detail`、`/summary`、`/api` 前缀和多种 identity 并存。
- **优点**:
  - 当前改动成本最低
  - 不需要立即调整已有文档或实现表达
- **缺点**:
  - 继续扩大设计与实现漂移
  - 无法作为仓库级正式规范
  - 每个切片都要重新争论路径风格
  - OpenAPI 与 generated client 长期不稳定

### 方案 B: 统一到仓库当前实现习惯，即 `slash-action + page-suffix query style`

- **描述**: 承认当前 Nest 控制器的主流写法就是正式规范，后续统一采用：
  - `POST /resources/:id/action`
  - `GET /resources/:id/detail`
  - `GET /projects/:id/xxx-summary`
- **优点**:
  - 与当前大量实现最接近
  - 迁移成本低
  - Nest controller 编写直观
- **缺点**:
  - 与更正式的 custom method 设计方法不一致
  - 把页面投影概念固化进 URI
  - 仍然不能很好地区分“资源 identity”和“表现层投影”
  - 设计文档会继续偏离更通行的 resource-first 约束

### 方案 C: 统一到 `resource-first + colon-action`，所有查询投影都用 `?view=`

- **描述**:
  - 所有 canonical item path 统一为 `/resources/{id}`
  - 自定义命令统一为 `POST /resources/{id}:verb`
  - 所有摘要/详情差异一律通过 `?view=summary`、`?view=detail` 表达
- **优点**:
  - 资源 identity 最统一
  - custom method 风格清晰
  - 不再把页面后缀写进路径
- **缺点**:
  - 对稳定聚合对象和项目级当前单例的表达不够自然
  - `view` 参数容易被滥用成“隐藏资源类型”
  - OpenAPI、缓存、权限与字段裁剪语义会集中压到 query parameter 上

### 方案 D: 统一到 `resource-first + colon-action`，允许少量稳定名词型子资源，`?view=` 只用于表现差异

- **描述**:
  - 资源与 item 维持 resource-first 语义
  - 命令统一采用 `colon-action`
  - 对稳定聚合对象或父资源下稳定单例，允许使用名词型子资源
  - `?view=` 只用于同一资源的表示差异，不用于承载新的资源边界
- **优点**:
  - 同时兼顾正式最佳实践与业务聚合表达
  - 能清楚区分资源 identity、稳定子资源与页面投影
  - 适合 `EX-08` 这类“项目当前单例聚合”场景
  - 允许按受控顺序实施，但不要求把过渡方案上升为长期结构
- **缺点**:
  - 规则比“全部都用 `?view=`”更需要明确判定标准
  - 设计评审时必须额外判断某个接口到底是稳定子资源还是只是页面投影

---

## 4. 决策 (Decision)

**推荐选择：方案 D。**

`POMS` 后续 API 设计的 canonical grammar 建议正式固定为：

- **resource-first**
- **colon-action as exception**
- **stable noun subresource for stable aggregates / singletons**
- **`?view=` only for representation variants**

进一步约束如下。

### 4.1 资源 canonical identity

1. 一等资源的 canonical collection path 使用复数名词 + kebab-case，例如：
   - `/commission-role-assignments`
   - `/commission-payouts`
   - `/project-handovers`
2. 一等资源的 canonical item path 统一为：
   - `/resources/{id}`
3. 如果对象已有全局稳定主键，则不得长期同时把父资源嵌套路径作为正式 item identity。
4. 父资源嵌套路径只用于：
   - 在父对象下创建天然依附的子对象
   - 表达父对象下天然存在的集合或稳定单例子资源

### 4.2 查询路径与投影表达

1. 标准详情查询统一使用：
   - `GET /resources/{id}`
2. 不再为新的 canonical path 使用以下页面后缀：
   - `/detail`
   - `/summary`
   - `/list`
   - `/current`
3. 如果某查询表达的是父资源下稳定存在的单例聚合对象，可使用名词型子资源，例如：
   - `GET /projects/{projectId}/contract-handover`
   - `GET /projects/{projectId}/project-handover`
4. `?view=` 仅用于同一资源或同一稳定子资源的表示差异，例如：
   - `GET /commission-role-assignments/{id}?view=summary`
5. `?view=` 不得用于暗中承载不同资源边界；如果字段集合、权限边界、生命周期或引用语义已经显著不同，应提升为稳定子资源或独立资源。

### 4.3 命令接口建模

1. 普通字段维护优先使用标准资源语义：
   - `PATCH /resources/{id}`
2. 替换受控成员集合或子资源内容时，优先使用：
   - `PUT /resources/{id}/subresource`
3. 只有当操作不能自然表达为普通 create / update / replace / delete 时，才使用 custom method。
4. custom method 统一采用 `colon-action`：
   - item command: `POST /resources/{id}:verb`
   - collection command: `POST /resources:verb`
5. 新的 canonical 设计不再使用 `slash-action` 作为正式路径风格。
6. 如果一个动作本质上会生成稳定存在的“申请 / 复核 / 争议 / 变更请求 / 替代请求”对象，应优先评估是否提升为独立资源，而不是继续在主资源上堆叠 action suffix。
7. 对已经明确会形成独立审批链、状态机、审计链与后续查询需求的动作，不再停留在“评估是否提升”；应直接按独立资源设计。

### 4.4 设计文档与部署前缀

1. 设计文档、OpenAPI 草案和 baseline 中不写 `/api` 部署前缀。
2. `/api`、网关 rewrite、版本前缀等属于部署与接入层问题，不属于资源 canonical grammar。

### 4.5 兼容策略

1. 默认策略是**直接切换到 canonical route**，而不是先引入过渡方案。
2. 仓库内可同时修改的 OpenAPI、generated client、controller、service、E2E 与调用方，不构成保留 legacy route 的充分理由。
3. 只有在存在不可控外部调用方、无法同步发布的接入方，或明确的发布时序阻塞时，才允许保留临时兼容 alias。
4. 兼容 alias 不应继续写入正式设计文档作为 canonical route。
5. OpenAPI 与 generated client 应优先且尽量只暴露 canonical route；如因例外必须保留兼容路由，应明确标记为 legacy / deprecated。
6. 每个保留的 legacy route 都必须有单独例外记录，包含理由、责任人、退出条件和清理目标切片；不接受“无限期兼容”。

---

## 5. 选择该方案的原因

### 5.1 它比 `slash-action` 更接近正式最佳实践

`resource-first + colon-action` 更符合成熟 API 设计里“资源优先、custom method 作为例外”的约束。与其继续把历史实现习惯上升为正式规范，不如把正式规范定清楚，再决定兼容策略。

### 5.2 它比“全部交给 `?view=`”更适合 `POMS` 的稳定聚合查询

`POMS` 中存在大量项目级当前单例、稳定摘要聚合和 gate 页面依赖对象。如果强行把这些都压成 `?view=`，会让很多“本来就是稳定名词对象”的查询语义变得模糊。

### 5.3 它能把资源边界、投影边界和页面边界分开

当前的问题之一是把页面用语直接写进路径。方案 D 明确区分：

- 资源 identity
- 稳定子资源 / 聚合对象
- 表现差异

这能显著降低后续 query / view 设计的混乱度。

### 5.4 它允许受控实施顺序，但默认应直接切换

当前仓库已经有大量 `slash-action` 控制器与已生成客户端。方案 D 允许：

- 先修正文档 canonical route
- 再在同一轮或紧邻切片中完成 controller、OpenAPI、generated client 与调用方切换
- 只在存在明确阻塞时才暂留 legacy alias

这里的“逐步”只描述工程顺序，不意味着接受“先上双轨，未来再收”的默认策略。对仓库内可控接口，推荐直接切换；过渡方案只能作为少数例外。

---

## 6. 对现有设计与实现的影响 (Consequences)

若本 ADR 被接受，以下路径与文档将需要逐步收敛。

### 6.1 对现有设计文档的影响

- `interface-openapi-dto-design.md` 需要补清：
  - 何时用 `PATCH`
  - 何时用 `PUT`
  - 何时用 `POST /collection`
  - 何时用 `POST ...:verb`
  - 何时必须提升为独立资源
- `commission-settlement-design.md` 中旧式 `slash-action` 与 project-scoped item path 需要收敛
- `ex-08-contract-handover-gate-baseline.md` 中 `/api`、`/detail`、`/summary` 与 `slash-action` 表达需调整为 canonical route
- `ex-09b-commission-freeze-command-query-baseline.md` 中需明确 slash-action 只是实现兼容，而不是正式规范

### 6.2 对 EX-08 的影响

建议目标形态：

- `POST /project-handovers/{id}:confirm`
- `POST /contract-handover-rebaselines`
- `GET /project-handovers/{id}`
- `GET /projects/{projectId}/project-handover`
- `GET /projects/{projectId}/contract-handover`

### 6.3 对 EX-09 的影响

建议目标形态：

- `GET /commission-role-assignments/{id}`
- `POST /commission-role-assignments/{id}:freeze`
- `POST /commission-freeze-disputes`
- `GET /commission-freeze-disputes/{id}`
- `POST /commission-freeze-disputes/{id}:arbitrate`
- `GET /commission-freeze-change-requests/{id}`

`submitCommissionRoleChange` 不再建议作为长期 canonical 的 `POST /commission-role-assignments/{id}:submitChange` 保留。`ADR-015` 保留“应提升为独立资源”的原则，但 `EX-09D` 已进一步基于 `phase2-commission-freeze-at-handover.md`、`table-structure-freeze-design.md` 与 `schema-ddl-design.md` 裁决：`EX-09` 的正式资源拆分不是 direct `CommissionRoleChangeRequest`，而是 `CommissionFreezeDisputeRecord -> CommissionFreezeChangeRequest` 的 dispute-first 链。

### 6.4 对实现层的影响

- 不要求在同一次设计收口中立即重写所有 controller
- 但新切片和被触达旧切片应优先在同一轮完成 canonical route 切换
- 对仓库内可控调用方，默认不保留双路由
- legacy route 是否短期保留，只由不可控外部依赖或明确发布阻塞决定
- 一旦例外条件消失，必须立即清退 legacy route

---

## 7. 落地约束 (Implementation Constraints)

1. 新增设计文档不得再把 `slash-action` 写成 canonical route。
2. 新增设计文档不得再用 `/detail`、`/summary`、`/current` 作为新的 canonical query path。
3. 如果一个 query 明显表达稳定单例聚合，应优先命名为名词型子资源，而不是页面后缀。
4. 如果一个命令生成稳定审计对象或审批对象，必须显式评估是否应提升为资源。
5. 既有实现若因兼容要求暂时保留 legacy route，必须在 baseline、checkpoint 或 close-out 记录中标识为 legacy / compatibility，而不是继续当作“正式命名”。
6. 新增切片不得再以“先继续沿用旧路由，未来再说”为默认策略。
7. 对仓库内可控接口，设计文档、OpenAPI、generated client、controller 与调用方应尽量在同一切片内完成切换。
8. “generated client 已存在”“测试较多”“改动面较大”本身都不是接受过渡方案的充分理由；必须存在更强的不可规避约束。

---

## 8. 后续动作 (Next Steps)

若本 ADR 进入评审并被接受，建议按以下顺序推进：

1. 先修订 `interface-openapi-dto-design.md`，把 canonical grammar 写成统一规则。
2. 形成 legacy route inventory，默认按“可直接切换”处理，只单独标出确有充分理由的例外接口。
3. 再批量修订受影响设计文档：
   - `commission-settlement-design.md`
   - `ex-08-contract-handover-gate-baseline.md`
   - `ex-09b-commission-freeze-command-query-baseline.md`
   - 其他仍保留 `/api`、`slash-action`、页面后缀路径的 baseline
4. 对实现补 canonical route，并默认在同一轮完成调用方切换。
5. 只有例外接口才允许临时保留带退出计划的 legacy alias。
6. 让 OpenAPI / generated client 以 canonical route 为主，并尽快清理 legacy 暴露。

---

## 9. 当前提议结论

`POMS` 后续 API 设计建议正式采用以下 canonical grammar：

- **canonical style** = `resource-first + colon-action as exception`
- **query style** = `GET /resource/{id}` + 少量稳定名词型子资源
- **projection style** = `?view=` 仅用于同一资源的表现差异
- **legacy handling** = 默认直接切换；`slash-action` 只在极少数不可规避免外下短期保留

该提议如果被接受，将成为后续 `interface-openapi-dto-design.md`、Phase 2 设计切片和 OpenAPI 收敛的共同上游约束。
