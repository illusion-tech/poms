# POMS 第二阶段 LX-T04 全主线实现设计完成后的统一开发判断

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段在 `L1 ~ L5` 全部主线完成当前范围内实现设计后，对是否进入统一开发排期、开发范围和切片顺序进行一次性正式判断
**关联文档**:

- `phase2-mainline-delivery-plan.md`
- `phase2-mainline-implementation-design-matrix.md`
- `archive/mainline-closure/phase2-mainline-task-tracker.md`
- `archive/reviews/phase2-review-comprehensive-assessment.md`
- `archive/reviews/phase2-review-follow-up-plan.md`
- `archive/phase2-batches/phase2-first-batch-scope.md`
- `archive/phase2-batches/phase2-first-batch-implementation-mapping.md`
- `phase2-detailed-design-index-map.md`
- `poms-design-progress.md`

---

## 1. 文档目标

本文档用于把 `LX-T04` 的官方口径固定为：

**先完成第二阶段 `L1 ~ L5` 全主线在当前范围内的实现设计，再一次性判断是否进入开发。**

本文档重点回答以下问题：

- `LX-T04` 现在到底判断什么
- 第一批、第二批、第三批、第四批专题在当前治理下分别扮演什么角色
- 什么时候才算具备统一开发判断条件
- 当前阶段是否已经具备直接进入工程开发排期的条件

---

## 2. 治理口径重置

当前正式采用以下治理口径：

1. 第一批六个前置专题的价值，是降低全主线实现设计返工，而不是提前授权首批工程切片启动。
2. 第二批、第三批、第四批专题的作用，是继续把第二阶段主线设计补齐到可统一开发判断的深度，而不是作为局部开发承诺的替代物。
3. `LX-T04` 不再作为“第一批做实后先决定要不要开发首批切片”的闸口，而是作为“全主线实现设计完成后再统一判断要不要开发”的最终闸口。
4. 此前围绕“受控实现排期”“首批工程切片 `IX-01 ~ IX-04`”形成的表述，全部转为历史归档，不再作为当前设计输入。

---

## 3. 进入 `LX-T04` 的前置条件

只有在以下条件同时满足时，才进入 `LX-T04` 的统一开发判断：

1. `L1 ~ L5` 当前范围内的主线能力已完成实现设计下钻，覆盖 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard`。
2. 第一批、第二批及仍属于当前范围的第三批专题，已经完成与其所在主线相匹配的实现设计收口，不再留下会反向改写主对象、主事实、可信源或敏感边界的未决项。
3. 第四批专题若继续后置，必须已经被明确写成范围限制或未来扩展，且不会反向阻断当前主线进入开发判断。
4. `phase2-mainline-delivery-plan.md`、`phase2-detailed-design-index-map.md` 与 `poms-design-progress.md` 的当前阶段状态口径一致，且 `archive/reviews/phase2-review-follow-up-plan.md`、`archive/reviews/phase2-review-comprehensive-assessment.md` 的结论已被这些当前控制文档吸收。

---

## 4. 当前阶段判断

截至 2026-04-04，当前阶段判断应固定为：

**已进入 `LX-T04` 的统一开发判断，并给出 go 判断。**

支撑依据如下：

1. `L1 ~ L5` 当前范围内主线能力已完成实现设计下钻，覆盖 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard`，且历史完成记录 `archive/mainline-closure/phase2-mainline-task-tracker.md` 已完成到 `LX-01`。
2. 第一批、第二批与当前范围内第三批专题，已经完成与所在主线匹配的实现设计收口；`LX-01` 最终一致性复核已确认未发现阻断统一开发判断的跨文档冲突。
3. 第四批剩余项已被明确写成范围限制、表达增强或未来扩展，不反向改变当前主对象、主事实、可信源、主链路或关键敏感边界。
4. `phase2-mainline-delivery-plan.md`、`phase2-mainline-implementation-design-matrix.md`、`phase2-detailed-design-index-map.md` 与 `poms-design-progress.md` 已吸收 `archive/reviews/phase2-review-follow-up-plan.md`、`archive/reviews/phase2-review-comprehensive-assessment.md` 的收口结论，当前主线完成口径现已可以统一收敛到 `LX-T04` 的开发判断。

因此，当前可以把第二阶段表述为：

- 已完成全主线当前范围内的实现设计收口
- 已具备进入统一开发判断的条件
- 当前正式进入统一开发范围、统一切片顺序与工程启动方式的判断阶段

---

## 5. `LX-T04` 正式判断结果

本轮统一判断结果固定为：

### 5.1 Go / No-Go

**Go。第二阶段当前范围可以进入统一开发。**

### 5.2 进入开发的统一范围

本次统一开发范围限定为以下主链，不包含已显式后置的未来扩展：

1. `L1`：签约前六工作区、`ContractReadinessPackage / CommercialReleaseBaseline`、受控回退结果链与审批摘要快照。
2. `L2`：执行期成本可信源、分摊结果、税务影响、实时 / 期末快照、重述记录与再基线选择链。
3. `L3`：合同承接摘要、移交确认摘要、冻结版本统一收口链、再基线化结果链、替代冻结版本链与联合追溯约束。
4. `L4`：经营核算总览、统一核算口径、偏差 / 风险解释、经营信号复核、`L4 -> L5 gate` 反馈链。
5. `L5`：阶段 gate、分阶段发放、最终结算 / 质保金结算、规则解释、审批摘要公共链、短时揭示链、冻结争议与受控变更链。

### 5.3 当前明确不进入本次统一开发范围的内容

以下方向继续作为范围限制、未来扩展或表达增强后置，不纳入本轮统一开发承诺：

1. 多币种与汇率扩展。
2. 分期移交。
3. 异常调整摘要展示增强。
4. 通知与协作触发精细化。
5. 完整供应商管理、完整采购审批 / 付款审批系统、完整总账 / 凭证体系、通用工作流引擎替换、全量 BI / 驾驶舱专题。

### 5.4 统一工程切片顺序

工程切片顺序应遵守“先可信源与主链、再提成治理动作、最后横切增强”的原则：

1. 平台治理补齐切片：`OrgUnit -> Role -> User -> 授权关系 -> 导航治理闭环`。
2. `L1 + L2` 可信源与快照基础切片：签约就绪承接链、执行期成本 / 税务 / 快照 / 重述主表与最小命令读写链。
3. `L3` 收口链切片：合同承接、移交确认、冻结版本、再基线化与替代冻结版本链。
4. 提成治理主机制切片：`CommissionRuleVersion -> CommissionRoleAssignment -> CommissionCalculation -> CommissionPayout -> CommissionAdjustment`。
5. `L4 + L5` 联动切片：经营信号复核、`L4 -> L5 gate` 绑定、审批摘要快照、短时揭示、冻结争议 / 仲裁 / 替代版本链。
6. 已显式后置的表达增强与未来扩展，待主链稳定后再独立排期。

### 5.5 工程启动约束

虽然本轮结论为 Go，但工程启动必须继续遵守以下约束：

1. 不在单个切片内静默改写多个域的主边界。
2. 不把后置范围混入当前开发承诺。
3. 每个切片都必须按 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard -> tests -> docs writeback` 的闭环推进。
4. 一旦实现反馈动摇了当前已冻结的可信源、主对象或敏感边界，必须先回写设计，再继续开发。

---

## 6. `LX-T04` 已输出内容

本次统一判断已形成以下正式输出：

1. 第二阶段当前范围是否进入开发。
2. 若进入开发，统一开发范围是什么。
3. 若进入开发，工程切片顺序如何安排。
4. 若暂不进入开发，还缺哪些最终阻断项。
5. 哪些专题继续保留为后续范围限制或下一阶段候选。

本轮对应结论为：

- 是否进入开发：进入。
- 最终阻断项：未发现阻断本轮统一开发判断的当前范围内阻断项。
- 后续候选：维持第四批和明确范围外主题的后置口径。

---

## 7. 当前结论

`LX-T04` 的当前官方口径调整为：

1. 第二阶段当前范围已完成 `L1 ~ L5` 全主线实现设计收口，并已通过 `LX-01` 最终一致性复核。
2. 本轮统一开发判断结论为 Go，可以进入第二阶段当前范围的工程实现。
3. 开发必须按照统一范围和统一切片顺序推进，不得回退到旧的“局部首批排期”叙事。
4. 旧的 `IX-01 ~ IX-04` 首批受控实现排期文档继续保留为历史归档，不再作为当前工程启动依据。
5. 当前有效路径已从“继续判断是否能进入开发”切换为“按统一范围与切片顺序进入开发，并持续回写文档与进度板”。
