# EX-55A 销售活跃度与结构化事实评分 v2 治理基线

- Gate Status: `Pass`
- Owner: `Codex`
- Slice Type: `governance / docs-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-55A`

## 1. 目标

`EX-55A` 冻结 `lead-score-v2` 可以使用的 deterministic 增强信号边界, 不写运行时代码。

本片只回答:

1. 哪些结构化销售事实、跟进活跃度、附件元数据可作为未来评分 v2 候选输入。
2. 这些输入如何保持可解释、可审计、可回溯来源。
3. 未来运行时切片必须如何接入 `EX-54` 评分历史 / 人工覆盖治理。

## 2. 正式输入

| Input Type                | Document / Source                                                             | Status | Notes                                                     |
| ------------------------- | ----------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| Smart scoring evaluation  | `ex-55-intelligent-scoring-attachment-followup-enhancement-baseline.md`       | Pass   | 明确不做 AI 自动改分, 只允许结构化事实进入评分 v2 候选。  |
| Smart scoring closeout    | `ex-55-intelligent-scoring-attachment-followup-enhancement-closeout.md`       | Pass   | 后续拆片入口为 `EX-55A` / `EX-55B` / `EX-55C` / `FE-58`。 |
| Score history / override  | `ex-54-lead-scoring-history-override-governance-baseline.md`                  | Pass   | 任何评分公式变化必须进入 history snapshot 和 override。   |
| Deterministic base score  | `ex-47-lead-scoring-and-gate-explanation-baseline.md`                         | Pass   | 当前确认有效 / 转项目闸口不因评分 v2 改变。               |
| Sales follow-up facts     | `ex-44-sales-follow-up-record-baseline.md`, `EX-48A`, `EX-49A` closeouts      | Pass   | 可使用跟进时间、提醒逾期、跟进频次, 不使用文本情绪。      |
| Sales intelligence facts  | `EX-61A`, `EX-61B`, `EX-63B` tracker rows                                     | Pass   | 可使用结构化缺口与事实完整度, 不使用私人画像。            |
| Attachment evidence facts | `ex-45-attachment-evidence-repository-baseline.md`, `EX-51`, `EX-52A` outputs | Pass   | 只使用附件元数据和业务类型, 不读 OCR / 原文内容。         |

## 3. 候选输入边界

| Dimension      | Candidate Signals                                                                              | Accept? | Rules                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| 销售情报完整度 | 决策人已知、技术把关人已知、采购流程已知、预算来源已知、竞争对手已知、痛点明确、下一步对象明确 | Yes     | 只按结构化字段或缺口状态计算, 不读取私人画像和自由文本情绪。          |
| 跟进活跃度     | `lastFollowUpAt`、`daysSinceLastFollowUp`、`followUpCount30d`、`nextFollowUpOverdue`           | Yes     | 只使用时间、次数、逾期状态；不基于通话内容、主观评价或销售个人风格。  |
| 附件元数据     | 是否存在方案、报价、预算证明、合同草案、客户确认材料；附件 final/latest 状态和来源对象         | Limited | 只用附件类型、状态、归属和人工登记信息；不读取附件原文、OCR 或全文。  |
| 基础商务事实   | 预算状态、预计金额、紧迫度、客户来源、有效确认状态                                             | Yes     | 可沿用既有 deterministic 输入, 但不得改变硬闸口含义。                 |
| 私人画像       | 婚姻、籍贯、爱好、私人偏好、非业务必要外部资料                                                 | No      | 禁止进入评分输入、历史快照、审计日志和模型 prompt。                   |
| AI / OCR 输出  | LLM 建议、OCR 摘要、附件抽取事实                                                               | No      | 本片不接受；必须等待 `EX-55B` / `EX-55C` 冻结人工确认和治理边界之后。 |

## 4. 公式与历史治理

未来运行时若落地 `lead-score-v2`, 必须满足:

1. 使用显式 `formulaVersion = lead-score-v2`, 不静默替换当前 `lead-score-v1`。
2. 评分结果必须写入 `lead_score_snapshot`, 保留公式版本、输入摘要、触发来源和生成时间。
3. 当前有效评分仍按 `EX-54` 的系统评分 / 人工覆盖投影规则计算。
4. 人工覆盖仍通过 `lead_score_override`, 不能被结构化事实评分 v2 绕过。
5. UI 必须展示评分组成说明, 至少能区分基础商务事实、销售情报完整度、跟进活跃度和附件元数据。
6. 评分 v2 不改变确认有效和转项目硬闸口；缺口仍作为缺口提示和操作阻断。

## 5. 数据最小化

评分历史只允许保存输入摘要, 不保存原始文本或附件内容。

允许的摘要示例:

- `decisionMakerKnown: true`
- `procurementProcessKnown: false`
- `daysSinceLastFollowUp: 12`
- `nextFollowUpOverdue: true`
- `hasProposalAttachment: true`
- `hasBudgetEvidenceAttachment: false`

每个摘要项必须能追溯到业务对象来源, 例如 lead、sales-intelligence fact、follow-up、attachment metadata。

## 6. 非目标

- 不实现评分 v2 运行时代码。
- 不新增 public API route、DTO、migration、OpenAPI 或 generated client。
- 不接入 OCR、LLM 或附件内容抽取。
- 不改变当前线索确认有效 / 转项目硬闸口。
- 不改变 `EX-54` 人工覆盖、审批、撤销或有效评分投影规则。

## 7. 后续运行时切片建议

| Slice ID   | 建议名称                     | Slice Type | 目标                                                                |
| ---------- | ---------------------------- | ---------- | ------------------------------------------------------------------- |
| `EX-55A-R` | 结构化事实评分 v2 后端运行时 | BE         | 实现 `lead-score-v2` 快照生成、输入摘要、公式版本和 focused tests。 |
| `FE-58`    | 智能评分解释与建议前端占位   | FE         | 展示评分 v2 组成说明、输入来源和人工覆盖关系。                      |
| `EX-55B`   | 附件内容抽取与 OCR 治理基线  | GOV        | 冻结 OCR / 抽取事实进入评分候选前的人工确认、脱敏和保留期限。       |
| `EX-55C`   | AI 评分建议实验基线          | GOV        | 冻结 LLM 建议的输入输出、解释、人工确认、A/B 和回滚边界。           |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Decision:
  - `EX-55A` 只冻结 deterministic 结构化增强信号, 不写运行时代码。
  - `lead-score-v2` 未来必须显式进入评分历史快照, 不静默覆盖现有系统评分。
  - 附件内容、OCR、LLM 和私人画像不属于本片输入。
  - 下一步可在 tracker 中拆出 `EX-55A-R` 后端运行时或先推进 `FE-58` 展示占位。
