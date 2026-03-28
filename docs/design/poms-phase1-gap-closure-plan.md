# POMS 第一阶段缺口补齐计划

**文档状态**: Active
**最后更新**: 2026-03-25
**适用范围**: `POMS` 第一阶段未完成承诺项的补齐计划、切片拆解、验收标准与文档回写要求
**关联文档**:

- 上游设计:
  - `poms-design-progress.md`
  - `poms-phase1-delivery-roadmap.md`
  - `implementation-delivery-guide.md`
- 业务域设计:
  - `platform-governance/platform-governance-design.md`
  - `platform-governance/navigation-design.md`
  - `commission-settlement-design.md`
- 相关 ADR:
  - `../adr/003-navigation-single-source-of-truth.md`
  - `../adr/012-data-persistence-technology-selection.md`

---

## 1. 文档目标

本文档用于把“第一阶段尚未通过验收”的判断转换为明确、可执行、可验收的补齐计划。

本文档重点回答：

- 第一阶段当前到底还缺什么
- 这些缺口应按什么顺序补齐
- 每个补齐切片的最小输出是什么
- 什么条件下才能再次发起第一阶段收口评估
- 需要同步补哪些文档，避免代码与设计再次漂移

本文档不是替代业务详细设计，而是面向实施与验收的补齐执行入口。

---

## 2. 当前判断

截至当前，`POMS` 第一阶段**不能判定为已完成**。

原因不是主干链路没有价值，而是第一阶段原始承诺中的两类关键能力尚未真实落地：

1. **平台治理域未完整实现**
   - 当前只有登录、当前用户资料、当前用户导航等最小能力接入真实 API
   - `User`、`Role`、`OrgUnit` 仍未形成真实持久化模型、后端治理模块和管理接口
   - `Navigation` 虽有只读真实接口，但底层仍依赖常量树与开发期平台 fixture，不是完整治理能力
2. **提成治理域未启动真实实现**
   - 目前仅有详细设计与相关规则文档
   - 代码层尚无模块、实体、migration、API、前端页面与测试

因此，当前阶段应从“第一阶段正式收口”调整为：

**“第一阶段主干链路已完成，但平台治理域与提成治理域仍需补齐，阶段状态为未通过、待补齐。”**

---

## 3. 补齐范围

### 3.1 必须补齐的范围

#### 平台治理域

- 用户管理
- 角色与权限
- 组织单元
- 菜单导航

#### 提成治理域

- `CommissionRuleVersion`
- `CommissionRoleAssignment`
- `CommissionCalculation`
- `CommissionPayout`
- `CommissionAdjustment`

### 3.2 本次补齐不额外扩张的范围

- 完整可视化导航编排器
- 任意未知路由自由新增
- 完整 SSO / LDAP / AD 同步
- 复杂数据范围权限
- 真实财务付款联动
- 工资系统或银行代发集成
- 完整通用审批中心

---

## 4. 平台治理域补齐策略

### 4.1 总体策略

平台治理域补齐应优先解决“平台主数据缺失”问题，而不是先扩大导航管理复杂度。

推荐顺序：

1. `OrgUnit`
2. `Role`
3. `User`
4. `UserRole` / `UserOrgUnit` 关系
5. `Navigation` 与真实角色/权限联动

其中权限字典第一轮继续保留共享常量单一事实源，不强制数据库化。

### 4.2 导航纳入原则

菜单导航**必须纳入平台治理域补齐范围**，但第一轮只补到“正式治理闭环”，不要求一步到位做成完整可视化管理后台。

第一轮必需项：

- 导航继续作为后端单一事实源
- 导航按真实用户有效权限过滤
- 导航与真实前端路由保持一致
- 前端继续忠实消费后端导航树
- 导航变更具备受控维护机制
- 导航事实源同步到运行时后写入统一 `audit_log`

第一轮可后置项：

- 拖拽式导航编排
- 任意节点自由新增
- 多端差异化导航
- 高级个性化推荐

### 4.3 平台治理域切片定义

#### `P1-S08` 平台主数据与权限治理最小闭环

目标：

- 把 `User`、`Role`、`OrgUnit` 从开发期 fixture 提升为真实持久化对象与管理接口。

最小输出：

- migration SQL
- 实体 / 映射定义
- 列表 / 详情 / 新增 / 更新 / 启停基础接口
- 用户-角色、用户-组织关系维护能力
- 最小 seed 与基础自动化测试

DoD：

- 登录后当前用户资料来自真实平台主数据
- 后端不再依赖 `dev-platform.fixtures.ts` 作为正式用户、组织、角色来源
- `/platform/users` 页面改为真实 API 驱动
- 至少覆盖用户查询、角色分配、组织归属、状态切换等关键成功/失败路径

#### `P1-S09` 平台导航治理闭环

目标：

- 把现有导航能力从“常量树 + 迁移期壳层能力”补齐为“受平台治理约束的正式入口能力”。

最小输出：

- 导航与真实权限/角色模型完成联动
- `/platform/roles`、`/platform/org-units`、`/platform/navigation` 路由落点补齐
- 导航契约、路由对照与权限可见性规则完成一次回查
- 最小审计与变更维护机制

DoD：

- 不同角色用户能稳定看到不同导航树
- 导航 `link` 与真实路由一致，不返回空入口
- 前端不依赖长期静态 fallback 菜单
- 导航管理即使暂不提供完整 CRUD 页面，也必须具备清晰、受控且可写入统一审计的维护路径

#### `P1-S13` 统一运行时审计与安全事件基线

目标：

- 把平台治理高敏动作和关键安全闸口从“代码逻辑存在”补齐为“系统内可查询的结构化事实”。

最小输出：

- `audit_log` 与 `security_event` 持久化模型
- 平台治理高敏写侧命令的统一审计写入
- 登录失败、无效令牌、权限拒绝、路由拒绝的安全事件写入
- 最小只读查询接口与自动化验证

DoD：

- `audit_log` 与 `security_event` 已真实落库
- 平台治理高敏动作至少覆盖用户、角色、组织和导航事实源同步
- 关键安全事件至少覆盖登录失败、接口拒绝、路由拒绝和无效令牌访问
- 最小查询出口与自动化验证已补齐

---

## 5. 提成治理域补齐策略

### 5.1 总体策略

提成治理域当前几乎是零实现，应严格按设计文档定义的对象顺序建设，避免直接从发放页或审批页倒推。

推荐顺序：

1. `CommissionRuleVersion`
2. `CommissionRoleAssignment`
3. `CommissionCalculation`
4. `CommissionPayout`
5. `CommissionAdjustment`

### 5.2 提成治理域切片定义

#### `P1-S10` 提成规则与角色分配基线

目标：

- 建立提成治理的规则事实源与角色冻结前提。

最小输出：

- `CommissionRuleVersion` 持久化模型与基础接口
- `CommissionRoleAssignment` 持久化模型与基础接口
- 项目移交前可编辑、冻结后版本化替代的规则
- 最小 seed、OpenAPI、测试

DoD：

- 规则版本不可静默改写
- 角色分配冻结后不可直接覆盖，只能新版本替代
- 至少覆盖版本生效、冻结、替代等关键失败路径

#### `P1-S11` 提成计算与发放最小闭环

目标：

- 基于已生效规则和业务事实，形成第一阶段最小提成计算与业务发放闭环。

最小输出：

- `CommissionCalculation` 持久化模型与计算接口
- `CommissionPayout` 持久化模型与审批/发放登记接口
- 最小读侧列表 / 详情接口
- 前端至少一个可演示页面
- 最小自动化测试

DoD：

- 计算结果有版本与替代关系
- 发放记录不可直接删除，异常通过业务动作处理
- 审批、发放登记与状态迁移保持一致

#### `P1-S12` 提成异常调整与重算闭环

目标：

- 让退款、坏账、违规、合同变化等异常能够通过显式调整对象进入审计闭环。

最小输出：

- `CommissionAdjustment` 持久化模型与基础接口
- 调整触发重算的替代链路
- 审批/待办接入规则
- 最小异常路径测试

DoD：

- 已执行调整不可直接删除
- 重算不覆盖原结果，而是生成新版本替代旧版本
- 审计链可回溯到规则版本、原计算结果与调整原因

---

## 6. 建议实施顺序

为控制风险，补齐顺序固定为：

1. `P1-S08` 平台主数据与权限治理最小闭环
2. `P1-S09` 平台导航治理闭环
3. `P1-S13` 统一运行时审计与安全事件基线
4. `P1-S10` 提成规则与角色分配基线
5. `P1-S11` 提成计算与发放最小闭环
6. `P1-S12` 提成异常调整与重算闭环
7. 重新发起第一阶段收口评估

原因：

- 平台主数据是登录、授权、导航、审批责任人和后续提成参与人的正式基础
- 导航应依附真实角色/权限事实源，不宜先于平台主数据单独扩大实现
- 统一运行时审计应在正式验收前补齐，否则高敏动作与安全拒绝缺少系统内统一证据
- 提成治理应从规则与角色冻结前提开始，而不是先做发放壳页面

---

## 7. 第一阶段重新收口的通过条件

只有同时满足以下条件，才允许再次判定第一阶段通过：

1. 平台治理域四个子模块已真实落地：
   - `User`
   - `Role / Permission`
   - `OrgUnit`
   - `Navigation`
2. 提成治理域最小闭环已完成：
   - 规则版本
   - 角色分配
   - 计算
   - 发放
   - 调整 / 重算
3. 平台正式能力不再依赖开发期 fixture 充当长期事实源
4. 导航、权限、路由、接口鉴权之间无明显漂移
5. 至少存在覆盖关键成功路径与关键失败路径的自动化验证
6. 相关设计、路线图、OpenAPI、migration、实体和前端页面之间不存在明显文档漂移

---

## 8. 文档回写要求

本次补齐不是只补代码，必须同步补文档。

### 8.1 必须同步更新的文档

- `docs/design/poms-design-progress.md`
- `docs/design/poms-phase1-delivery-roadmap.md`
- `docs/design/implementation-delivery-guide.md`

### 8.2 按切片同步更新的文档

#### 平台治理域

- `docs/design/platform-governance/platform-governance-design.md`
- `docs/design/platform-governance/user-management-design.md`
- `docs/design/platform-governance/role-permission-design.md`
- `docs/design/platform-governance/org-unit-design.md`
- `docs/design/platform-governance/navigation-design.md`
- `docs/design/platform-governance/navigation-route-mapping.md`

#### 提成治理域

- `docs/design/commission-settlement-design.md`
- `docs/design/workflow-and-approval-design.md`
- `docs/design/business-authorization-matrix.md`
- 如涉及数据结构变化，同步回写：
  - `docs/design/data-model-prerequisites.md`
  - `docs/design/table-structure-freeze-design.md`
  - `docs/design/schema-ddl-design.md`

### 8.3 回写原则

- 若只是把既有设计落实为代码，更新状态、实现证据和下一步即可
- 若实现推翻现有高影响边界，必须补 ADR 或评审摘要，不允许静默改写旧结论
- 每个切片完成后，至少补：当前状态、实现证据、DoD 满足情况、遗留问题

---

## 9. 当前建议的直接下一步

立即启动以下动作：

1. 把第一阶段状态从“已收口”改回“待补齐”
2. 在路线图中新增 `P1-S08` ~ `P1-S12`
3. 先启动 `P1-S08`：平台主数据与权限治理最小闭环
4. 同步回写进度板，明确“平台治理域与提成治理域仍属于第一阶段未完成承诺”

---

## 10. 当前结论

`POMS` 第一阶段当前不是“技术债收尾”，而是“关键承诺项未完成”。

因此后续推进原则应明确为：

- 先补齐平台治理域与提成治理域
- 再重新发起第一阶段收口评估
- 未完成前，不应继续沿用“第一阶段已正式关闭”的口径

只有这样，第一阶段的通过判断才与最初路线图承诺一致。
