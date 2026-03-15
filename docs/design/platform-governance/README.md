# 平台治理域设计文档

本目录用于集中存放 `POMS` 平台治理域的详细设计文档和配套输出物，避免与全局基线文档、其他业务域设计文档继续混放。

## 当前文档

- `platform-governance-design.md`: 平台治理域详细设计总入口，负责收敛用户、角色权限、组织单元和导航菜单的模块边界与总体规则
- `user-management-design.md`: 用户管理详细设计，负责收敛用户模型、账户状态、角色组织关系和认证衔接规则
- `role-permission-design.md`: 角色与权限详细设计，负责收敛权限字典、角色模型、关系建模和授权计算规则
- `org-unit-design.md`: 组织单元详细设计，负责收敛组织树模型、启停移动规则以及与用户归属的衔接
- `navigation-design.md`: 导航菜单详细设计，负责收敛导航契约、权限过滤、前端适配和路由对照规则
- `navigation-route-mapping.md`: 导航-路由对照表，负责收敛导航启用、路由迁移和前端收敛基线
- `platform-governance-review-checklist.md`: 平台治理域评审清单，负责收敛评审门槛、阻塞项、非阻塞后续项和通过标准
- `platform-governance-review-summary.md`: 平台治理域评审结论摘要，负责记录本轮评审结论、已关闭阻塞项和后续动作

## 上游基线

- `../poms-requirements-spec.md`
- `../poms-hld.md`
- `../poms-design-progress.md`
- `../../adr/001-platform-permission-model.md`
- `../../adr/002-org-unit-model-and-assignment.md`
- `../../adr/003-navigation-single-source-of-truth.md`
