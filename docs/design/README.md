# 系统设计文档

本目录用于存放 `POMS` 的跨模块系统设计文档，重点回答：

- 业务制度如何映射为系统能力
- 核心领域、核心流程、核心状态如何划分
- 权限、组织、审批、审计、结算等横切能力如何协同
- 各模块之间的数据与职责边界是什么

## 当前文档

- `poms-requirements-spec.md`: 系统需求说明，负责把制度条款翻译成系统规则
- `poms-hld.md`: 高层设计，负责给出系统蓝图和模块关系
- `poms-design-progress.md`: 设计进度跟踪，负责管理当前设计资产状态、依赖关系和下一步产出
- `business-authorization-matrix.md`: 业务对象动作授权矩阵，当前已形成平台权限与业务动作授权的边界基线
- `project-lifecycle-design.md`: 项目生命周期设计，当前已形成 `Project` 主链路、关键闸口和里程碑基线
- `contract-finance-design.md`: 合同资金域设计，当前已形成合同、回款、成本和发票台账基线
- `commission-settlement-design.md`: 提成结算设计，当前已形成提成计算、发放、异常调整与重算基线
- `workflow-and-approval-design.md`: 审批流与风控闸口设计，当前已形成审批模型、统一待办与通知审计基线

## 已展开子目录

- `platform-governance/README.md`: 平台治理域设计入口，集中管理平台治理域总设计、子模块设计和配套输出物

## 后续可补充文档

- 后续如需新增专项设计，可继续补充
