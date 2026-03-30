# POMS 第二阶段正式审阅清单

**文档状态**: Active
**最后更新**: 2026-03-30
**适用范围**: `POMS` 第二阶段正式审阅执行入口，聚焦审阅范围、审阅维度、问题记录、结论回写与后续跟踪
**关联文档**:

- 上游设计:
  - `phase2-user-task-map.md`
  - `phase2-experience-gap-priority-matrix.md`
  - `phase2-lifecycle-experience-blueprint.md`
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-detailed-design-index-map.md`
  - `poms-design-progress.md`
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
- 尚未执行一轮完整、留痕的正式审阅
- 因此当前不存在正式审阅结论、问题清单摘要或通过结论

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

| 编号 | 级别 | 所属文档 / 主线 | 问题描述         | 影响范围 | 建议动作 | 当前状态      |
| ---- | ---- | --------------- | ---------------- | -------- | -------- | ------------- |
| 待补 | 待补 | 待补            | 待正式审阅后回写 | 待补     | 待补     | `Not Started` |

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

必要时再新增：

- 第二阶段审阅总结文档
- 第二阶段 follow-up 清单
- 进入实现排期的第一批范围说明

---

## 9. 当前下一步

当前唯一正确的下一步是：

1. 以本清单为入口执行 `LX-T03`
2. 形成正式问题清单
3. 回写审阅结论
4. 再进入 `LX-T04`
