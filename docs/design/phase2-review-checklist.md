# POMS 第二阶段正式审阅清单

**文档状态**: Active
**最后更新**: 2026-04-01
**适用范围**: `POMS` 第二阶段正式审阅执行入口，聚焦审阅范围、审阅维度、问题记录、结论回写与后续跟踪
**关联文档**:

- 上游设计:
   - `phase2-user-task-map.md`
   - `phase2-experience-gap-priority-matrix.md`
   - `phase2-lifecycle-experience-blueprint.md`
   - `phase2-experience-optimization-roadmap.md`
   - `phase2-detailed-design-index-map.md`
   - `poms-design-progress.md`
   - `phase2-review-comprehensive-assessment.md`
- 同级设计:
   - `phase2-presigning-workspace-information-architecture.md`
   - `phase2-execution-cost-workspace-information-architecture.md`
   - `phase2-contract-to-handover-workspace.md`
   - `phase2-project-business-outcome-overview.md`
   - `phase2-commission-stage-gate-overview-workspace.md`
   - `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 1. 文档目标

本文档用于把第二阶段从“基线已形成”推进到“正式审阅已执行”。

本文档重点回答以下问题：

- 第二阶段本轮正式审阅覆盖哪些文档
- 审阅时按哪些维度检查
- 审阅发现如何记录
- 何时可以给出本轮审阅结论
- 哪些问题会阻断进入实现排期

本文档不是评审总结本身，而是正式审阅的执行入口和跟踪清单。

---

## 2. 当前真实状态

截至当前：

- `L1 ~ L5` 五条主线的第一轮基线文档已形成
- 第二阶段相关基线文档当前状态统一为 `Ready for Review`
- 已完成四轮独立、留痕的正式审阅，并已产出 `phase2-review-record-round1.md`、`phase2-review-record-round2.md`、`phase2-review-record-round3.md` 与 `phase2-review-record-round4.md`
- 四轮累计已发现 22 个正式问题（10 个 `R1`、10 个 `R2`、2 个 `R3`），但尚未形成最终通过结论
- 已新增 `phase2-review-comprehensive-assessment.md`，用于承载四轮问题的多维度综合评估与当前优先级判断
- 已新增 `phase2-review-follow-up-plan.md` 与 `phase2-first-batch-scope.md`，分别承接正式 follow-up 清单与第一批硬前置专题范围说明

---

## 3. 审阅范围

本轮正式审阅最小覆盖范围如下：

### 3.1 上位基线

- `phase2-user-task-map.md`
- `phase2-experience-gap-priority-matrix.md`
- `phase2-lifecycle-experience-blueprint.md`
- `phase2-experience-optimization-roadmap.md`
- `phase2-detailed-design-index-map.md`

### 3.2 `L1` 签约前主线

- `phase2-presigning-workspace-information-architecture.md`
- `phase2-presigning-initiation-advancement-workspace.md`
- `phase2-presigning-project-overview-workspace.md`
- `phase2-presigning-technical-cost-workspace.md`
- `phase2-presigning-bid-commercial-workspace.md`
- `phase2-presigning-pricing-margin-workspace.md`
- `phase2-presigning-contract-readiness-workspace.md`
- `phase2-presigning-workspace-handoff-map.md`
- `phase2-presigning-workspace-templates.md`

### 3.3 `L2` 执行期成本归集主线

- `phase2-execution-cost-workspace-information-architecture.md`
- `phase2-project-actual-cost-records.md`
- `phase2-cost-source-to-project-record-mapping.md`
- `phase2-actual-cost-accumulation-stage-view.md`
- `phase2-estimated-to-actual-cost-bridge.md`

### 3.4 `L3` 签约与移交主线

- `phase2-contract-to-handover-workspace.md`
- `phase2-project-handover-gate-workspace.md`
- `phase2-commission-freeze-at-handover.md`
- `phase2-handover-closure-rules.md`

### 3.5 `L4` 项目经营核算主线

- `phase2-project-business-outcome-overview.md`
- `phase2-project-unified-accounting-view-caliber.md`
- `phase2-project-variance-risk-explanation.md`
- `phase2-business-accounting-feedback-rules.md`

### 3.6 `L5` 提成制度化操作主线

- `phase2-commission-stage-gate-overview-workspace.md`
- `phase2-commission-staged-payout-adjustment-paths.md`
- `phase2-commission-retention-final-settlement.md`
- `phase2-commission-rule-explanation-language.md`

### 3.7 横切数据权限与敏感信息

- `phase2-data-permission-and-sensitive-visibility-design.md`

---

## 4. 审阅维度

本轮正式审阅至少检查以下维度：

1. 生命周期连续性
   `Project` 是否始终作为主对象，跨阶段承接是否断裂。

2. 制度映射准确性
   是否忠实承接《销售规范流程制度》与《销售提成方案制度》的关键规则。

3. 用户任务完整性
   主用户是否真的能完成连续任务，而不是只得到更多页面和字段。

4. 跨文档一致性
   上位基线、主线文档、模板文档、索引文档之间是否存在口径冲突。

5. 经营口径可信性
   成本、回款、税务影响、经营核算与提成 gate 的衔接是否自洽。

6. 可实施性
   是否能明确切成实现批次，是否存在会导致大规模返工的设计空洞。

7. 数据权限与敏感信息控制
   数据范围、字段敏感度、提成敏感信息、导出与审批摘要等读侧出口是否统一受控。

---

## 5. 问题记录规则

审阅发现统一按以下分级记录：

- `R1`：关键口径错误，会直接影响实现方向或制度正确性
- `R2`：主线断裂或承接不清，会明显影响用户连续操作体验
- `R3`：表达、命名、模板或索引层不一致，不阻断总体方向

问题记录至少包含以下字段：

- 编号
- 级别
- 所属主线 / 文档
- 问题描述
- 影响范围
- 建议动作
- 当前状态

---

## 6. 审阅问题清单

| 编号     | 级别 | 所属文档 / 主线                                                                                                                                                     | 问题描述                                                                                                                                                                                                                                                                         | 影响范围                                                                                         | 建议动作                                                                                                 | 当前状态 |
| -------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------- |
| `R1-001` | `R2` | `L1` / `phase2-presigning-workspace-information-architecture.md`                                                                                                    | 签约前工作区缺少多币种与汇率支持的明确设计。                                                                                                                                                                                                                                     | 影响前期成本估算、报价评审的连续性                                                               | 补充多币种及汇率快照口径                                                                                 | `Open`   |
| `R1-002` | `R1` | `L2` / `phase2-cost-source-to-project-record-mapping.md`                                                                                                            | 跨项目分摊成本（如公共工具费用）归集与分摊口径未明确定义。                                                                                                                                                                                                                       | 导致实际成本累计不完整，经营核算失真                                                             | 补充“分摊类成本”映射规则                                                                                 | `Open`   |
| `R1-003` | `R2` | `L3` / `phase2-contract-to-handover-workspace.md`                                                                                                                   | 未明确在“合同生效后到移交前”期间发生合同变更时，如何重新生成基线并同步给移交强节点。                                                                                                                                                                                             | 影响移交时冻结的金额和范围准确性                                                                 | 增加“合同变更再基线化”处理路径                                                                           | `Open`   |
| `R1-004` | `R1` | `L4` / `phase2-project-unified-accounting-view-caliber.md`                                                                                                          | “已纳入口径实际成本”中关于税务影响（如可抵扣进项税）的具体计算与扣除规则缺失。                                                                                                                                                                                                   | 导致系统算出的毛利与财务真实核算毛利存在差异                                                     | 明确成本税务口径，补充进项税处理规则                                                                     | `Open`   |
| `R1-005` | `R3` | `L5` / `phase2-commission-stage-gate-overview-workspace.md`                                                                                                         | 异常调整的审批摘要及原因，未明确如何在提成阶段总览中直观展示。                                                                                                                                                                                                                   | 销售人员可能难以直接理解扣减原因                                                                 | 在提成总览增加“异常调整记录摘要”区块                                                                     | `Open`   |
| `R1-006` | `R1` | 横切 / `phase2-data-permission-and-sensitive-visibility-design.md`                                                                                                  | 对售前、交付等跨部门协作人员的敏感成本数据（如人工成本率）和项目毛利可见性边界缺乏基于角色的精细化控制。                                                                                                                                                                         | 导致敏感经营数据与人力成本外泄风险                                                               | 明确界定非财务/非销售负责人的数据掩码与隔离规则                                                          | `Open`   |
| `R2-001` | `R1` | `L1` / `phase2-presigning-contract-readiness-workspace.md`                                                                                                          | `签约就绪` 只输出“当前回款条件摘要”，但没有定义哪些结构化字段会直接初始化合同条款快照或应收计划节点。                                                                                                                                                                            | 影响合同条款快照初始化、回款节点一致性                                                           | 补充 `签约就绪 -> ContractTermSnapshot / ReceivablePlan` 输出口径                                        | `Open`   |
| `R2-002` | `R1` | `L2` / `phase2-project-actual-cost-records.md`、`phase2-actual-cost-accumulation-stage-view.md`                                                                     | 要做按执行阶段的实际成本视图，但缺执行阶段归属字段或固定派生规则。                                                                                                                                                                                                               | 导致阶段成本视图不稳定，历史解释可能漂移                                                         | 补执行阶段归属字段或派生规则，并固定历史保留口径                                                         | `Open`   |
| `R2-003` | `R2` | `L4` / `phase2-project-unified-accounting-view-caliber.md`                                                                                                          | 已要求同一时间点使用同一快照，但未定义月末 / 关账 / 补录后的历史回看口径。                                                                                                                                                                                                       | 影响月度复盘、审批回看与跨期对账                                                                 | 增补 `as-of` 时点、期末冻结与补录重述规则                                                                | `Open`   |
| `R2-004` | `R1` | `L5` / `phase2-commission-stage-gate-overview-workspace.md`                                                                                                         | 第二阶段提成 gate 依赖“验收或阶段成果确认”，但第二阶段尚未形成对应对象或专题承接文档。                                                                                                                                                                                           | 导致第二阶段发放判断缺少稳定数据源                                                               | 增补验收 / 阶段成果确认专题，或明确复用对象与证据链                                                      | `Open`   |
| `R2-005` | `R2` | 横切 / `phase2-data-permission-and-sensitive-visibility-design.md`                                                                                                  | 只定义了”可见 / 遮罩 / 不可见”的静态边界，未定义敏感字段例外查看与短时揭示机制。                                                                                                                                                                                                 | 影响协作效率与审计闭环                                                                           | 补充例外查看、短时揭示、审批留痕与到期失效路径                                                           | `Open`   |
| `R3-001` | `R1` | `L1` / `phase2-presigning-workspace-handoff-map.md`                                                                                                                 | 签约前承接关系图只定义正向推进路径，缺少回退 / 重估机制（如报价否决回退重估成本、招投标范围变更触发上游返工）。                                                                                                                                                                  | 导致签约前主链在异常场景下断裂，用户退回线下                                                     | 在承接关系图中补充”受控回退”路径规则，明确回退条件与上游状态处理                                         | `Open`   |
| `R3-002` | `R1` | `L2` / `phase2-project-actual-cost-records.md`                                                                                                                      | `LABOR` 成本依赖的 `internalCostRate` 缺来源、维护、版本化与变更影响规则，成本率调整后历史记录处理未定义。                                                                                                                                                                       | 人力成本缺可信计算基础，影响 L4/L5                                                               | 补充”内部成本率”治理专题：数据源、版本化、生效时间、在途项目影响                                         | `Open`   |
| `R3-003` | `R2` | `L3` / `phase2-project-handover-gate-workspace.md`                                                                                                                  | 移交设计假设一次性原子完成，未考虑大型项目或多期合同的分期移交需求。                                                                                                                                                                                                             | 影响大型项目执行启动时机与提成冻结时点                                                           | 评估是否支持分期移交，或在移交工作区明确标记为已知范围限制                                               | `Open`   |
| `R3-004` | `R2` | `L4` / `phase2-project-unified-accounting-view-caliber.md`                                                                                                          | 毛利率公式以已确认回款为分母，项目早期回款远低于成本时产生极端误导值，数据成熟度层未与公式边界行为联动。                                                                                                                                                                         | 导致早期项目经营总览产生误导性指标                                                               | 补充毛利率公式边界行为规则，定义回款比例阈值与数据成熟度联动                                             | `Open`   |
| `R3-005` | `R1` | 横切 / 全部主线                                                                                                                                                     | 所有主线强调”下一步动作”和”阻断原因”，但无跨角色主动通知与协作触发机制设计，用户不登录则无法感知待办。                                                                                                                                                                           | 跨角色协作仍依赖线下驱动，削弱连续任务链目标                                                     | 增加横切”通知与协作触发”专题，覆盖渠道、触发条件、脱敏与聚合策略                                         | `Open`   |
| `R3-006` | `R2` | `L5` / `phase2-commission-freeze-at-handover.md`                                                                                                                    | 提成冻结后”受控变更”仅提到可生成新版本，但未定义发起条件、审批流程、争议处理路径与回溯影响规则。                                                                                                                                                                                 | 影响提成分配公平性感知与争议可追溯性                                                             | 补充冻结后受控变更完整路径：发起条件、审批角色、回溯影响、争议仲裁                                       | `Open`   |
| `R4-001` | `R1` | `L1` / `phase2-presigning-pricing-margin-workspace.md`、`phase2-presigning-contract-readiness-workspace.md`                                                         | 报价与毛利评审已定义报价总额、回款条件、税务条件与放行结论进入 `签约就绪`，但未定义“已放行商业结论”与最终合同条款之间的偏差校验与重审规则。若合同草案在金额、首付款比例、回款节点、质保金或税务条款上偏离已审批方案，当前主链没有强制重新评审的闸口。                            | 可能出现“审批通过的是 A，最终签的是 B”，导致合同快照、应收计划、经营判断与提成输入失去制度一致性 | 增加“商业放行基线”与合同条款差异校验规则，明确偏离阈值、必比字段与重审触发条件                           | `Open`   |
| `R4-002` | `R1` | `L2/L4/L5` / `phase2-estimated-to-actual-cost-bridge.md`、`phase2-project-unified-accounting-view-caliber.md`                                                       | 执行期成本桥接与统一核算当前都固定只认“签约前最后被正式采用的有效估算版本”作为唯一基线，但合同资金域已允许 `ContractAmendment` 驱动新快照。若项目在执行中发生增补项或范围扩张，当前口径没有定义“补充估算基线 / 变更包基线”如何进入偏差对比与后续提成解释。                       | 会把原始范围与变更范围混在一组偏差和毛利结果里，导致经营核算、复盘与提成解释失真                 | 补充执行期合同变更的经营基线规则：区分原始基线、变更包基线及其在 `L4/L5` 中的汇总/拆分口径               | `Open`   |
| `R4-003` | `R2` | `L4/L5` / `phase2-project-unified-accounting-view-caliber.md`、`phase2-business-accounting-feedback-rules.md`、`phase2-commission-stage-gate-overview-workspace.md` | `L5` 已把“数据成熟度达到可用于经营判断”“是否存在重大未收口经营风险”列为 `gate` 检查项，但 `L4` 只定义了 `正常 / 关注 / 风险` 与 `数据不足 / 初步可看 / 可用于经营判断` 两层信号，没有固定这些信号何时只是解释、何时真正阻断某个提成阶段。                                        | 财务和管理层容易对同一项目得出不同的“能否发放”结论，审批留痕也难以解释为什么被阻断或放行         | 增加 `L4 -> L5` 绑定矩阵：明确每个经营风险层级、数据成熟度层级对各提成阶段的影响是“提示 / 需复核 / 阻断” | `Open`   |
| `R4-004` | `R2` | 横切 / `phase2-data-permission-and-sensitive-visibility-design.md`                                                                                                  | 权限设计已要求“审批摘要只展示审批所需最小信息”“导出能力单独受控”，但没有定义审批场景级的最小摘要结构。对于副总经理、管理层、财务等并非项目日常参与者的审批人，当前没有口径回答：他们在报价评审、移交确认、提成发放和异常调整审批时，究竟能看到哪些字段、哪些字段要摘要化或遮罩。 | 不是导致审批人看不到足够信息而退回线下，就是导致审批页为便于判断而越权暴露经营或提成敏感字段     | 为各审批场景补“审批摘要字段包”矩阵，并与导出/打印口径一起定义最小可见集、遮罩规则和审计要求              | `Open`   |
| `R4-005` | `R1` | `L3/L4/L5` / `phase2-contract-to-handover-workspace.md`、`phase2-project-business-outcome-overview.md`、`phase2-project-unified-accounting-view-caliber.md`         | 合同资金域仍把“一个 `Project` 是否允许并行存在多份同时履约的有效合同”列为待细化问题，但第二阶段文档已普遍按“当前有效合同”单数口径设计承接、经营总览和提成阶段判断。若真实业务允许一个项目并行履约多合同，当前 `L3/L4/L5` 的金额、回款比例、质保金和最终结算口径都会失效。        | 影响合同承接、经营核算和提成 gate 的基础可信源，属于实现方向级错误                               | 在第二阶段范围内二选一收口：要么明确禁止并行有效合同，要么补齐多合同项目的汇总、分摊和展示规则           | `Open`   |

### 6.1 综合评估入口

四轮审阅问题的业务价值、技术复杂度、紧迫性、影响面、返工风险与当前优先级，统一见：

- `phase2-review-comprehensive-assessment.md`

### 6.2 综合状态回写

上表中的“当前状态”保留原始审阅记录；正式审阅后的当前执行判断，统一按下表回写：

| 编号     | 综合状态           | 实施批次 | 当前执行判断                                                       |
| -------- | ------------------ | -------- | ------------------------------------------------------------------ |
| `R1-001` | `受控后置`         | `第四批` | 已明确为未来扩展；当前只要求保留单币种模型的扩展缝                 |
| `R1-002` | `规则待细化`       | `第二批` | 成本分摊与项目共享事实需在第一批后优先收口                         |
| `R1-003` | `规则待细化`       | `第三批` | 合同变更再基线化在合同主链稳定后并行细化                           |
| `R1-004` | `业务政策未定`     | `第二批` | 税务影响与财务核算口径需先拍板                                     |
| `R1-005` | `受控后置`         | `第四批` | 异常调整摘要不纳入第一批必需体验                                   |
| `R1-006` | `规则待细化`       | `第一批` | 已完成一轮交叉复核；当前进入实现映射准备                           |
| `R2-001` | `规则待细化`       | `第一批` | 已完成一轮交叉复核；当前进入实现映射准备                           |
| `R2-002` | `规则待细化`       | `第二批` | 执行阶段归属与稳定派生规则需先收口                                 |
| `R2-003` | `规则待细化`       | `第二批` | 需补 `as-of`、期末冻结与补录重述规则                               |
| `R2-004` | `规则待细化`       | `第一批` | 已完成一轮交叉复核；当前进入实现映射准备                           |
| `R2-005` | `规则待细化`       | `第三批` | 在权限主边界稳定后补例外查看与短时揭示                             |
| `R3-001` | `规则待细化`       | `第三批` | 与 `L1` 主链并行补受控回退与负路径                                 |
| `R3-002` | `规则待细化`       | `第一批` | 已完成一轮交叉复核；当前进入实现映射准备                           |
| `R3-003` | `受控后置`         | `第四批` | 当前先明确仅支持整体移交                                           |
| `R3-004` | `规则待细化`       | `第二批` | 经营公式边界与数据成熟度联动需统一                                 |
| `R3-005` | `方向已收口待细化` | `第四批` | 通知与协作触发暂列横切增强，不进入首批                             |
| `R3-006` | `规则待细化`       | `第三批` | 待 `gate` 主机制稳定后补冻结后受控变更与争议处理                   |
| `R4-001` | `规则待细化`       | `第一批` | 已完成一轮交叉复核；当前进入实现映射准备                           |
| `R4-002` | `规则待细化`       | `第二批` | 需定义执行中变更包基线、汇总口径与重算规则                         |
| `R4-003` | `规则待细化`       | `第二批` | 需形成 `L4` 经营信号到 `L5 gate` 的绑定矩阵                        |
| `R4-004` | `规则待细化`       | `第三批` | 在权限主链稳定后补审批摘要字段包与导出 / 打印口径                  |
| `R4-005` | `方向已收口待细化` | `第一批` | 已完成一轮交叉复核；当前进入实现映射准备                           |

补充说明：

- `R1 / R2 / R3` 是原始问题分级，不等同于当前实施批次
- 当前实施批次以 `phase2-review-comprehensive-assessment.md` 的依赖链与排序判断为准

### 6.3 follow-up 与第一批范围入口

为避免综合评估停留在分析层，正式 follow-up 清单与进入实现排期的第一批范围说明统一见：

- `phase2-review-follow-up-plan.md`
- `phase2-first-batch-scope.md`

---

## 7. 通过条件

本轮正式审阅只有在以下条件同时满足时才可视为完成：

1. 审阅范围内文档全部过一轮正式检查
2. `R1` 问题已明确结论并完成回写或明确阻断
3. `R2` 问题已进入受控待办，不存在未识别的主线断裂
4. 路线图已根据审阅结论更新 `LX-T03 / LX-T04`
5. 进度板已同步真实状态，不再把“可审阅”误写成“已审阅”

---

## 8. 审阅结论回写口径

本轮正式审阅完成后，至少需要同步回写：

- `phase2-experience-optimization-roadmap.md`
- `phase2-detailed-design-index-map.md`
- `poms-design-progress.md`
- `phase2-review-comprehensive-assessment.md`
- `phase2-review-follow-up-plan.md`
- `phase2-first-batch-scope.md`

必要时再新增：

- 第二阶段审阅总结文档
- `LX-T04` 统一开发判断文档

---

## 9. 当前下一步

当前更准确的下一步是：

1. 继续以 `phase2-review-follow-up-plan.md`、`phase2-first-batch-scope.md` 与 `phase2-first-batch-implementation-mapping.md` 为依据，扩展第二阶段全主线实现设计
2. 第二批和仍属于当前范围的第三批专题应继续下钻到与第一批同等深度的实现设计层
3. 第四批继续按增强项和范围限制口径推进，不反向混入当前范围
4. 待 `L1 ~ L5` 全主线在当前范围内完成实现设计后，再进入 `phase2-lx-t04-full-mainline-development-decision.md` 的统一开发判断
