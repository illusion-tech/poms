# 平台治理域设计文档

本目录用于集中存放 `POMS` 平台治理域的详细设计文档和配套输出物，作为 `docs/design/` 下“治理与横切设计”分类的一个子目录入口。

本目录重点回答：

- 平台治理域的边界是什么
- 用户、角色权限、组织、导航如何协同
- 哪些规则由平台治理域统一约束，哪些规则应下沉到业务域执行
- 当前平台治理域设计推进到什么程度，还差哪些评审与收口动作

## 子目录定位

相对于其他文档层级，本目录的定位如下：

- 上承 `poms-requirements-spec.md` 与 `poms-hld.md` 的全局基线
- 落实 `ADR-001`、`ADR-002`、`ADR-003`、`ADR-008`、`ADR-009`、`ADR-010` 的决策约束
- 下接用户、角色权限、组织、导航等平台治理子专题设计
- 配套维护本域评审清单与评审结论摘要

因此，本目录不是新的总纲文档目录，也不是实现层文档目录，而是“平台治理域详细设计”的聚合入口。

## 文档分类

本目录下的文档建议按以下三类理解：

### 1. 域总设计

- `platform-governance-design.md`：平台治理域详细设计总入口，负责收敛用户、角色权限、组织单元和导航菜单的模块边界与总体规则

### 2. 子专题设计

- `user-management-design.md`：用户管理详细设计，负责收敛用户模型、账户状态、角色组织关系和认证衔接规则
- `role-permission-design.md`：角色与权限详细设计，负责收敛权限字典、角色模型、关系建模和授权计算规则
- `org-unit-design.md`：组织单元详细设计，负责收敛组织树模型、启停移动规则以及与用户归属的衔接
- `navigation-design.md`：导航菜单详细设计，负责收敛导航契约、权限过滤、前端适配和路由对照规则
- `navigation-route-mapping.md`：导航-路由对照表，负责收敛导航启用、路由迁移和前端收敛基线

### 3. 评审与治理文档

- `platform-governance-review-checklist.md`：平台治理域评审清单，负责收敛评审门槛、阻塞项、非阻塞后续项和通过标准
- `platform-governance-review-summary.md`：平台治理域评审结论摘要，负责记录本轮评审结论、已关闭阻塞项和后续动作

## 上游输入

本目录的上游基线包括：

- `../poms-requirements-spec.md`
- `../poms-hld.md`
- `../poms-design-progress.md`
- `../../adr/001-platform-permission-model.md`
- `../../adr/002-org-unit-model-and-assignment.md`
- `../../adr/003-navigation-single-source-of-truth.md`
- `../../adr/008-current-user-profile-output-contract.md`
- `../../adr/009-platform-navigation-group-visibility-rule.md`
- `../../adr/010-platform-user-management-route-bridging-status.md`

## 阅读顺序建议

建议按以下顺序阅读本目录：

1. `platform-governance-design.md`
2. `user-management-design.md`
3. `role-permission-design.md`
4. `org-unit-design.md`
5. `navigation-design.md`
6. `navigation-route-mapping.md`
7. `platform-governance-review-checklist.md`
8. `platform-governance-review-summary.md`

如果读者只关心导航或路由收敛，可直接从 `navigation-design.md` 和 `navigation-route-mapping.md` 进入，但仍建议回看域总设计与相关 ADR。

## 命名与状态约定

本目录延续 `docs/design/` 的治理规则：

- 默认不使用全局编号
- 使用“主题 + 文档类型”的稳定命名方式
- 设计主文档通常采用 `xxx-design.md`
- 对照表采用 `xxx-mapping.md`
- 评审材料采用 `xxx-checklist.md` 和 `xxx-summary.md`

状态建议与 `docs/design/README.md` 保持一致：

- `Draft`
- `Draft (Baseline)`
- `Review`
- `Accepted`
- `Active`
- `Archived`

## 维护约定

- 新增平台治理子专题文档时，应优先挂靠到本目录，而不是直接散落到 `docs/design/` 根目录
- 若某项内容属于高影响、难回退的决策变更，应先考虑新增 ADR，再回写本目录设计文档
- 每次本目录新增、归档或调整文档时，应同步检查 `../README.md` 和 `../poms-design-progress.md` 是否需要更新
