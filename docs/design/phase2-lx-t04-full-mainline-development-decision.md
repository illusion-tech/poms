# POMS 第二阶段 LX-T04 全主线实现设计完成后的统一开发判断

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段统一开发判断、统一开发范围、工程切片顺序与启动约束
**关联文档**:

- 当前控制:
  - `phase2-mainline-delivery-plan.md`
  - `phase2-detailed-design-index-map.md`
  - `poms-design-progress.md`
  - `implementation-delivery-guide.md`
- 历史依据:
  - `archive/control-history/phase2-lx-t04-full-mainline-development-decision.md`
  - `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`
  - `archive/mainline-closure/phase2-mainline-task-tracker.md`
  - `archive/reviews/phase2-review-comprehensive-assessment.md`
  - `archive/reviews/phase2-review-follow-up-plan.md`
  - `archive/phase2-batches/phase2-first-batch-scope.md`
  - `archive/phase2-batches/phase2-first-batch-implementation-mapping.md`

---

## 1. 文档目标

本文档只保留 `LX-T04` 当前仍有效的正式判断，回答五个问题：

- 当前是否进入统一开发
- 进入开发的统一范围是什么
- 明确不纳入本轮承诺的内容是什么
- 工程切片顺序是什么
- 工程启动必须遵守哪些约束

如需回溯完整论证、前置条件展开和历史治理上下文，统一见 `archive/control-history/phase2-lx-t04-full-mainline-development-decision.md`。

---

## 2. 当前官方判断

截至 2026-04-04，`LX-T04` 的当前官方判断固定为：

**Go。第二阶段当前范围可以进入统一开发。**

这一定义同时包含以下含义：

1. `L1 ~ L5` 当前范围内的实现设计已经完成下钻。
2. `LX-01` 最终一致性复核已完成。
3. 未发现阻断当前范围进入开发的最终阻断项。
4. 当前阶段已经从“是否进入开发的判断阶段”切换为“按统一范围与切片顺序进入实现阶段”。

---

## 3. 进入开发的统一范围

本轮统一开发范围限定为以下主链：

1. `L1`：签约前六工作区、`ContractReadinessPackage / CommercialReleaseBaseline`、受控回退结果链与审批摘要快照。
2. `L2`：执行期成本可信源、分摊结果、税务影响、实时 / 期末快照、重述记录与再基线选择链。
3. `L3`：合同承接摘要、移交确认摘要、冻结版本统一收口链、再基线化结果链、替代冻结版本链与联合追溯约束。
4. `L4`：经营核算总览、统一核算口径、偏差 / 风险解释、经营信号复核、`L4 -> L5 gate` 反馈链。
5. `L5`：阶段 gate、分阶段发放、最终结算 / 质保金结算、规则解释、审批摘要公共链、短时揭示链、冻结争议与受控变更链。

---

## 4. 当前明确不纳入本轮统一开发范围的内容

以下内容继续作为范围限制、未来扩展或表达增强后置：

1. 多币种与汇率扩展。
2. 分期移交。
3. 异常调整摘要展示增强。
4. 通知与协作触发精细化。
5. 完整供应商管理、完整采购审批 / 付款审批系统、完整总账 / 凭证体系、通用工作流引擎替换、全量 BI / 驾驶舱专题。

这些方向不能静默混入当前开发承诺。

---

## 5. 统一工程切片顺序

工程切片顺序固定为：

1. 平台治理补齐切片：`OrgUnit -> Role -> User -> 授权关系 -> 导航治理闭环`
2. `L1 + L2` 可信源与快照基础切片
3. `L3` 收口链切片
4. 提成治理主机制切片：`CommissionRuleVersion -> CommissionRoleAssignment -> CommissionCalculation -> CommissionPayout -> CommissionAdjustment`
5. `L4 + L5` 联动切片
6. 已显式后置的表达增强与未来扩展，待主链稳定后再独立排期

---

## 6. 工程启动约束

虽然本轮判断结果为 Go，但工程启动必须继续遵守以下约束：

1. 不在单个切片内静默改写多个域的主边界。
2. 不把后置范围混入当前开发承诺。
3. 每个切片都必须按 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard -> tests -> docs writeback` 的闭环推进。
4. 一旦实现反馈动摇了当前已冻结的可信源、主对象或敏感边界，必须先回写设计，再继续开发。

---

## 7. 历史回溯入口

如果需要回答“为什么形成这个判断、当时吸收了哪些历史材料、旧口径是如何被替换掉的”，统一回看：

1. `archive/control-history/phase2-lx-t04-full-mainline-development-decision.md`
2. `archive/mainline-closure/phase2-mainline-implementation-design-matrix.md`
3. `archive/mainline-closure/phase2-mainline-task-tracker.md`
4. `archive/reviews/phase2-review-comprehensive-assessment.md`
5. `archive/reviews/phase2-review-follow-up-plan.md`
6. `archive/phase2-batches/phase2-first-batch-scope.md`
7. `archive/phase2-batches/phase2-first-batch-implementation-mapping.md`

---

## 8. 当前结论

`LX-T04` 当前只保留以下正式结论：

1. 第二阶段当前范围已完成 `L1 ~ L5` 全主线实现设计收口，并已通过 `LX-01` 最终一致性复核。
2. 本轮统一开发判断结论为 Go。
3. 开发必须按统一范围和统一切片顺序推进。
4. 历史长篇论证与旧的局部首批排期叙事统一下沉到归档，不再作为当前工程启动依据。
