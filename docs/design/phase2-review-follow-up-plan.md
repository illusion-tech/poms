# POMS 第二阶段正式审阅 follow-up 清单

**文档状态**: Active
**最后更新**: 2026-04-03
**适用范围**: `POMS` 第二阶段 `LX-T03` 四轮正式审阅后的 follow-up 归并、专题拆分与进入统一开发判断前的收口跟踪
**关联文档**:

- `phase2-review-checklist.md`
- `phase2-review-comprehensive-assessment.md`
- `phase2-first-batch-scope.md`
- `phase2-first-batch-implementation-mapping.md`
- `phase2-second-batch-scope.md`
- `phase2-second-batch-implementation-mapping.md`
- `phase2-third-batch-scope.md`
- `phase2-third-batch-implementation-mapping.md`
- `phase2-lx-t04-full-mainline-development-decision.md`
- `contract-finance-design.md`
- `phase2-project-unified-accounting-view-caliber.md`
- `phase2-commission-stage-gate-overview-workspace.md`
- `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于把四轮正式审阅的 22 个问题，从“已完成综合评估”继续推进到“已拆成可执行的 follow-up 专题”。

本文档重点回答以下问题：

- 哪些问题必须作为进入统一开发判断前的前置收口项
- 哪些问题可在主链稳定后并行细化
- 哪些问题当前应明确写入范围限制，而不是继续占用主线资源
- 各批次问题应优先回写到哪些正式设计文档

本文档不是替代 `phase2-review-checklist.md` 或 `phase2-review-comprehensive-assessment.md`，而是承接二者之间的执行层输出。

---

## 2. 当前 follow-up 基线

当前 follow-up 清单以以下已确认结论为前提：

1. 多币种与汇率支持暂列未来扩展，不作为当前阶段主线约束。
2. 一个 `Project` 必须支持多份同时履约的有效销售合同。
3. 项目级交易链条最小覆盖范围包括销售合同、应收计划、回款、销项发票、成本、付款、进项发票。
4. 回款判断模式采用项目级冻结策略，允许“项目汇总判断”与“按合同判断”两种模式，但冻结后不得随意改写。
5. 原始问题级别 `R1 / R2 / R3` 反映的是审阅严重度，不等同于当前实施批次。

---

## 3. follow-up 分组口径

当前 follow-up 统一按四个批次推进：

1. 第一批：主对象与主事实前置
   解决继续推进全主线实现设计时最容易导致方向级返工的问题。

2. 第二批：经营与成本可信源前置
   建立稳定经营核算、历史回看和提成判断所需的可信口径。

3. 第三批：流程健壮性与审批增强
   在前两批主规则稳定后并行细化，补强负路径、例外查看和争议处理。

4. 第四批：受控后置或范围限制
   当前阶段明确不纳入首批主线，但必须在范围说明中显式记录。

这里必须明确：

- 四个批次只服务于 22 个审阅问题的收口管理
- 它们不是 `L1 ~ L5` 主线实现设计完成度的唯一量尺
- 它们也不是“第二阶段能否继续推进”的唯一判断依据

---

## 4. 第一批 follow-up 专题

第一批是继续推进全主线实现设计前最需要先冻结的主对象与主事实前置专题。

| 专题                                                           | 覆盖问题 | 主要回写文档                                                                                                                                                                                                                       | 当前收口目标                                             |
| -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 多合同项目主假设与冻结模式                                     | `R4-005` | `contract-finance-design.md`、`phase2-contract-to-handover-workspace.md`、`phase2-project-business-outcome-overview.md`、`phase2-project-unified-accounting-view-caliber.md`、`phase2-commission-stage-gate-overview-workspace.md` | 已完成主规则回写、一轮跨文档一致性复核与七层实现映射回写 |
| `签约就绪 -> ContractTermSnapshot / ReceivablePlan` 结构化承接 | `R2-001` | `phase2-presigning-contract-readiness-workspace.md`、`contract-finance-design.md`                                                                                                                                                  | 已完成主规则回写、一轮跨文档一致性复核与七层实现映射回写 |
| 商业放行基线与最终合同差异校验                                 | `R4-001` | `phase2-presigning-pricing-margin-workspace.md`、`phase2-presigning-contract-readiness-workspace.md`、`contract-finance-design.md`                                                                                                 | 已完成主规则回写、一轮跨文档一致性复核与七层实现映射回写 |
| 第二阶段验收 / 阶段成果确认对象与证据链                        | `R2-004` | `phase2-commission-stage-gate-overview-workspace.md`、`phase2-commission-staged-payout-adjustment-paths.md`                                                                                                                        | 已完成主规则回写、一轮跨文档一致性复核与七层实现映射回写 |
| `internalCostRate` 治理基线                                    | `R3-002` | `phase2-project-actual-cost-records.md`、`phase2-cost-source-to-project-record-mapping.md`                                                                                                                                         | 已完成主规则回写、一轮跨文档一致性复核与七层实现映射回写 |
| 敏感数据主边界与最小可见集                                     | `R1-006` | `phase2-data-permission-and-sensitive-visibility-design.md`                                                                                                                                                                        | 已完成主规则回写、一轮跨文档一致性复核与七层实现映射回写 |

第一批当前判断：

- 若第一批未完成正式回写，不应继续推进全主线实现设计
- 第一批的目标不是一次性写完全部规则，而是先冻结主事实和主边界
- 截至 2026-04-01，`R4-005`、`R2-001`、`R4-001`、`R2-004`、`R3-002`、`R1-006` 已完成首轮主规则回写、一轮跨文档一致性复核，以及 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard` 七层实现映射回写；当前应作为全主线实现设计的先行输入
- 第一批进入后续全主线实现设计前的实现映射桥接入口，统一见 `phase2-first-batch-implementation-mapping.md`
- 第一批范围与出入场条件，统一见 `phase2-first-batch-scope.md`

---

## 5. 第二批 follow-up 专题

第二批建立在第一批主事实稳定之后，主要负责经营与成本可信源收口。

---

## 正确推进顺序说明

为避免把“第二阶段主线基线已形成”误读为“第二阶段整体已可直接实现”，follow-up 推进顺序统一固定为：

1. 先完成 `L1 ~ L5` 主线基线与 `LX-T03` 正式审阅。
2. 再完成 22 个正式问题的综合评估、批次划分与第一批范围锁定。
3. 第一批 6 个专题先做主规则回写与交叉复核。
4. 第一批 6 个专题再做实现映射回写，且顺序固定为：`command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard`。
5. 第一批实现映射稳定后，再推动第二批专题进入与其同等深度的实现设计。
6. `L1 ~ L5` 全主线在当前范围内的实现设计已完成，并已正式进入 `LX-T04` 的统一开发判断。

当前已完成到全主线实现设计收口、最终一致性复核与 `LX-T04` 统一开发判断阶段：

- 已完成第一批 6 个专题的七层实现映射回写
- 已完成第二批 7 个专题、当前范围内第三批专题以及六份实现设计总文档的正式写回与关键联动文档补点
- 已完成 `L1 ~ L5` 全主线最终一致性复核，当前范围内未发现阻断统一开发判断的跨文档冲突
- `LX-T04` 当前正式口径统一见 `phase2-lx-t04-full-mainline-development-decision.md`，本轮已正式给出 Go 结论，并明确统一开发范围与工程切片顺序

| 专题                               | 覆盖问题 | 主要回写文档                                                                                                                                                                                                                                                     | 当前收口目标                                                                                                                 |
| ---------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 分摊成本与项目共享事实             | `R1-002` | `phase2-cost-source-to-project-record-mapping.md`、`phase2-estimated-to-actual-cost-bridge.md`                                                                                                                                                                   | 固定分摊依据、共享事实与项目级聚合规则                                                                                       |
| 执行阶段归属与历史稳定派生         | `R2-002` | `phase2-project-actual-cost-records.md`、`phase2-actual-cost-accumulation-stage-view.md`                                                                                                                                                                         | 固定阶段归属字段或派生规则，避免历史解释漂移                                                                                 |
| 税务影响与财务核算口径             | `R1-004` | `phase2-project-unified-accounting-view-caliber.md`                                                                                                                                                                                                              | 固定进项税等税务影响在经营口径中的处理方式                                                                                   |
| 执行中合同变更基线与变更包基线     | `R4-002` | `phase2-estimated-to-actual-cost-bridge.md`、`phase2-project-unified-accounting-view-caliber.md`                                                                                                                                                                 | 区分原始基线与变更包基线，并定义汇总与重算规则                                                                               |
| 时点快照、期末冻结与补录重述       | `R2-003` | `phase2-project-unified-accounting-view-caliber.md`                                                                                                                                                                                                              | 固定月末、关账、补录后的历史回看口径                                                                                         |
| 经营公式边界与数据成熟度联动       | `R3-004` | `phase2-project-unified-accounting-view-caliber.md`、`phase2-business-accounting-feedback-rules.md`                                                                                                                                                              | 统一低回款比例、极端值和成熟度解释规则                                                                                       |
| `L4` 经营信号到 `L5 gate` 绑定矩阵 | `R4-003` | `phase2-business-accounting-feedback-rules.md`、`phase2-commission-stage-gate-overview-workspace.md`、`phase2-commission-staged-payout-adjustment-paths.md`、`phase2-commission-retention-final-settlement.md`、`phase2-commission-rule-explanation-language.md` | 固定税务影响摘要、成本数据成熟度状态、成本侧动作建议、动作等级与审批留痕口径，并统一 `L5` 的 gate / 发放 / 结算 / 解释消费链 |

第二批当前判断：

- 第二批不应先于第一批单独推进
- 第一批完成后，第二批现已完成成体系规则回写、桥接映射与六份实现设计总文档首轮写回；其中 `L2` 输出的税务影响摘要、成本数据成熟度状态、成本侧动作建议与引用基线 / 快照版本，当前已被 `L4-T01 / T02 / T03 / T04` 固定为正式输入，并进一步贯穿到 `L5` 的阶段 gate、分阶段发放、最终结算与统一规则表达；但在完成全主线一致性复核前，仍应以当前范围和主线完整性为上边界，不自动转化为任何开发承诺

---

## 6. 第三批 follow-up 专题

第三批用于补齐流程健壮性与审批增强，允许在前两批基本稳定后并行推进。

| 专题                     | 覆盖问题 | 主要回写文档                                                                                   | 当前收口目标                                                 |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 合同变更再基线化         | `R1-003` | `phase2-contract-to-handover-workspace.md`                                                     | 固定合同生效后到移交前的再基线化触发、待切换生效状态与结果链 |
| 签约前受控回退与负路径   | `R3-001` | `phase2-presigning-workspace-handoff-map.md`                                                   | 固定否决、重估、范围变更等负路径处理与受控回退结果链         |
| 例外查看与短时揭示       | `R2-005` | `phase2-data-permission-and-sensitive-visibility-design.md`、`workflow-and-approval-design.md` | 固定申请、审批、揭示、到期失效、审计留痕与短时授权链         |
| 审批摘要字段包           | `R4-004` | `phase2-data-permission-and-sensitive-visibility-design.md`、`workflow-and-approval-design.md` | 固定审批场景最小字段集、投影级别、导出策略与摘要快照口径     |
| 冻结后受控变更与争议处理 | `R3-006` | `phase2-commission-freeze-at-handover.md`、`workflow-and-approval-design.md`                   | 固定发起条件、审批角色、争议仲裁、替代冻结版本与重算影响链   |

第三批当前判断：

- 第三批可并行，但不应反向改写第一批和第二批已冻结的主事实
- 截至 2026-04-02，第三批已完成正式范围锁定、实现映射桥接、六份实现设计总文档的首轮写回、关键业务主文档的首轮写回，以及剩余关键联动文档的必要补点，统一见 `phase2-third-batch-scope.md` 与 `phase2-third-batch-implementation-mapping.md`
- 截至当前，`L1` 受控回退结果链、`L3` 再基线化结果链，以及审批摘要 / 例外授权 / 冻结争议公共链已分别补入对应主文档与 `workflow-and-approval-design.md`，第三批跨文档一致性复核与全主线最终一致性复核也已完成，当前进入 `LX-T04` 的统一开发判断与工程启动准备

---

## 7. 第四批受控后置专题

第四批不是“忽略不做”，而是当前明确通过范围限制后置。

| 专题                 | 覆盖问题 | 当前范围限制               | 后续处理要求                   |
| -------------------- | -------- | -------------------------- | ------------------------------ |
| 多币种与汇率扩展     | `R1-001` | 当前仅覆盖单币种主链       | 保留扩展缝，后续独立成专题     |
| 分期移交             | `R3-003` | 当前仅支持整体移交         | 在 `L3` 文档显式记录已知限制   |
| 异常调整摘要展示     | `R1-005` | 当前不作为首批必需体验     | 待 `L5` 主机制稳定后再增强     |
| 通知与协作触发精细化 | `R3-005` | 当前不做细粒度主动通知编排 | 待权限与审批字段包稳定后再展开 |

---

## 8. 推进顺序与必要回写

当前更稳妥的推进顺序如下：

1. 先以 `phase2-second-batch-implementation-mapping.md` 为桥接入口完成六份实现设计总文档写回；当前该步已完成，下一步转入一致性校验并打开第三批专题实现设计。
2. 再以 `phase2-third-batch-implementation-mapping.md` 为桥接入口，在六份实现设计总文档、关键业务主文档与剩余关键联动文档补点已落地的基础上，继续推进第三批跨文档一致性复核。
3. 第四批始终以范围限制或 follow-up 方式显式记录，不得默默丢失。
4. 当前已完成 `L1 ~ L5` 全主线在当前范围内的实现设计与统一开发判断，后续转入按统一范围与切片顺序推进工程实现。

本清单推进期间，至少应同步回写以下文档：

- `phase2-review-checklist.md`
- `phase2-review-comprehensive-assessment.md`
- `phase2-first-batch-scope.md`
- `poms-design-progress.md`
- `phase2-experience-optimization-roadmap.md`
- `phase2-detailed-design-index-map.md`

---

## 8.1 第二阶段实现设计层的进入方式

第二阶段的实现设计层，不应理解为“等 22 个问题全部收口后，再统一写一轮 command / query / DTO / 表结构 / 守卫设计”。

更准确的进入方式是：

1. 先完成全部 22 个问题的综合评估与批次划分。
2. 先选出会直接决定主对象、主事实和实现方向的第一批专题。
3. 仅对第一批专题先行下钻到实现设计层。
4. 第一批完成 `command -> query -> DTO -> data model -> table freeze -> schema / DDL -> guard` 后，再判断是否具备继续扩展第二批实现设计的条件。
5. 第一批稳定后，再对第二批专题重复同样的实现设计下钻。
6. 第三批、第四批只有在前置主事实稳定且范围未变化时，才继续进入对应深度的实现设计。

换句话说：

- 第二阶段的实现设计层是“按批次滚动进入”的
- 不是“等所有专题都设计完再一次性全量展开”的
- 也不是“第一批只做评审，整个实现设计留到后面某个统一时点再做”的

当前之所以先做第一批 6 个专题的实现映射，是因为这 6 个专题会直接决定：

- 合同主链与移交链如何落地
- 第二阶段发放前提如何落地
- 成本可信源如何落地
- 敏感字段边界如何进入真实接口与查询

如果这些主事实和主边界还未下钻，就提前对第二批、第三批甚至全部 22 个问题做全量实现设计，后续返工概率会显著升高。

还必须进一步说明：

1. follow-up 批次的完成，不等于第二阶段主线自动完成实现设计。
2. follow-up 批次的作用，只是保证各主线在进入实现设计时，关键阻断项已被处理或显式隔离。
3. 因此，第二阶段后续是否继续推进，判断重点不是“第四批做没做”，而是“当前要推进的主线内容是否还存在阻断性未决项”。
4. 第四批若属于明确范围限制或未来扩展，可以不做而不阻断当前第二阶段继续进入实现设计。

---

## 9. 当前结论

第二阶段正式审阅后的后续工作，当前已经不能再用“继续看文档、继续找问题”的方式推进。

更准确的执行方式是：

- 先按第一批和第二批专题完成主规则回写
- 再把第三批作为并行增强项推进
- 明确把第四批写成范围限制和后续专题

这样才能把正式审阅从“问题列表”真正转成“统一开发判断前的可执行输入”。
