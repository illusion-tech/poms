# POMS 第二阶段主线交付计划

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段主线目标、当前阶段口径、默认阅读路径与工程进入顺序
**关联文档**:

- 上游设计:
  - `phase2-user-task-map.md`
  - `phase2-lifecycle-experience-blueprint.md`
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-detailed-design-index-map.md`
  - `poms-design-progress.md`
- 当前控制:
  - `phase2-lx-t04-full-mainline-development-decision.md`
  - `implementation-delivery-guide.md`
- 历史长文:
  - `archive/control-history/phase2-mainline-delivery-plan.md`
  - `archive/mainline-closure/phase2-mainline-task-tracker.md`
  - `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`
  - `archive/reviews/phase2-review-comprehensive-assessment.md`
  - `archive/reviews/phase2-review-follow-up-plan.md`

---

## 1. 文档目标

本文档只保留第二阶段当前仍有效的主线口径，回答四个问题：

- 第二阶段主线到底是什么
- 当前正式阶段已经推进到哪一步
- 当前默认阅读路径是什么
- 工程实现应按什么顺序进入

如需查看完整治理论证、阶段分层、批次与主线关系的长文版本，统一回看 `archive/control-history/phase2-mainline-delivery-plan.md`。

---

## 2. 第二阶段主线定义

第二阶段当前的业务主线固定为：

1. `L1` 签约前统一工作区
2. `L2` 执行期成本归集主线
3. `L3` 签约与移交强节点
4. `L4` 项目经营核算视图
5. `L5` 提成制度化操作体验

这里继续保留两个基本区分：

1. `L1 ~ L5` 是业务分解轴，回答“第二阶段要做什么”。
2. 第一批到第四批专题是历史风险收口轴，回答“这些内容当时按什么顺序收口和下钻”。

当前默认工程入口已经不再把批次过程文档作为主入口，而是直接以五条主线、统一开发范围和统一切片顺序为准。

---

## 3. 当前正式阶段口径

截至 2026-04-04，第二阶段当前正式口径固定为：

1. `L1 ~ L5` 当前范围内的实现设计已完成下钻，覆盖 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard`。
2. `LX-01` 最终一致性复核已完成，未发现阻断当前范围进入统一开发判断的跨文档冲突。
3. `LX-T04` 已完成统一开发判断，并已给出 Go 结论。
4. 当前阶段不再是“继续收口是否能进入开发”，而是“按统一范围与切片顺序进入工程实现，并持续回写文档与进度板”。

因此，第二阶段当前的主任务已经从“解释审阅问题”切换为：

- 按统一范围推进工程切片
- 按统一顺序落实实现
- 按统一回写规则维护设计与进度板

---

## 4. 当前默认阅读路径

如果是当前要参与第二阶段判断或工程实现，阅读顺序固定为：

1. `README.md`
2. `poms-design-progress.md`
3. `phase2-lx-t04-full-mainline-development-decision.md`
4. `phase2-mainline-delivery-plan.md`
5. `phase2-detailed-design-index-map.md`
6. `implementation-delivery-guide.md`
7. 当前切片直接涉及的业务主文档、治理文档与实现设计总文档

如果只是需要回溯历史论证，再进入：

1. `archive/control-history/phase2-mainline-delivery-plan.md`
2. `archive/mainline-closure/phase2-mainline-task-tracker.md`
3. `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`
4. `archive/reviews/phase2-review-comprehensive-assessment.md`
5. `archive/reviews/phase2-review-follow-up-plan.md`

---

## 5. 当前工程进入顺序

工程切片继续按以下顺序进入：

1. 平台治理补齐切片：`OrgUnit -> Role -> User -> 授权关系 -> 导航治理闭环`
2. `L1 + L2` 可信源与快照基础切片
3. `L3` 收口链切片
4. 提成治理主机制切片：`CommissionRuleVersion -> CommissionRoleAssignment -> CommissionCalculation -> CommissionPayout -> CommissionAdjustment`
5. `L4 + L5` 联动切片
6. 已显式后置的表达增强与未来扩展，待主链稳定后再独立排期

当前工程管理不再使用“首批局部受控排期”作为有效叙事，也不再把历史批次文档当作实施入口。

---

## 6. 当前结论

第二阶段当前的官方主线口径是：

1. 五条主线是当前唯一有效的业务主轴。
2. `LX-T04` Go 结论已经给出，当前正式进入统一开发。
3. 根目录控制文档只保留当前入口、当前结论和当前顺序。
4. 完整历史论证、批次细节和过程叙事统一下沉到 `archive/control-history/phase2-mainline-delivery-plan.md` 及相关归档文档。
