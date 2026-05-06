# EX-55 线索智能评分与附件 / 跟进画像增强评估基线

- Gate Status: `Pass`
- Owner: `Codex`
- Slice Type: `docs-only / evaluation`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-55`

## 1. 目标

EX-55 只做评估和治理边界冻结, 不交付运行时代码。

本片回答三个问题:

1. AI 评分、OCR、附件内容解析、销售跟进画像是否可以成为线索评分增强输入。
2. 如果可以, 哪些输入必须先结构化、脱敏、授权、解释和审计。
3. 后续应该拆成哪些可验证切片, 避免绕过 `EX-54` 的评分历史 / 人工覆盖治理。

## 2. 正式输入

| Input Type               | Document / Source                                                                                        | Status | Notes                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| Deterministic scoring    | `ex-47-lead-scoring-and-gate-explanation-baseline.md`                                                    | Pass   | 当前评分是 deterministic rule, 不依赖 AI。                     |
| Score history / override | `ex-54-lead-scoring-history-override-governance-baseline.md`                                             | Pass   | 任何智能评分增强不得绕过历史、override、权限和审计。           |
| Attachment evidence      | `ex-45-attachment-evidence-repository-baseline.md`, `ex-50-attachment-preview-version-final-baseline.md` | Pass   | 附件是业务证据库, 当前不做 OCR、全文检索或内容抽取。           |
| Sales follow-up facts    | `ex-44-sales-follow-up-record-baseline.md`, `EX-48A`, `EX-49A` closeouts                                 | Pass   | 销售跟进已有事实源、替代/作废 lifecycle 和提醒待办派生。       |
| Sales intelligence facts | `EX-61A`, `EX-61B`, `EX-63B` tracker rows                                                                | Pass   | 联系人、关系人、竞争态势、销售发现已有结构化事实与字段级审计。 |

## 3. 核心结论

第一阶段不建议直接引入“AI 自动改分”。原因:

- 当前 `lead.score/rating` 已明确是系统 deterministic 评分, 且 `EX-54` 已建立人工覆盖与有效评分投影。
- AI/OCR/附件解析输出存在不稳定性、可解释性、权限、成本和敏感信息复制风险。
- 评分会影响销售优先级和主管判断, 但不能影响确认有效 / 转项目硬闸口。

推荐路径是:

1. 先做结构化、可解释、可审计的增强信号。
2. 再做“评分建议 / 风险提示”, 不直接写当前系统评分。
3. 如果未来确需进入评分公式, 必须作为 `lead-score-v2` 公式版本, 写入评分历史快照, 并保留人工覆盖治理。

## 4. 输入评估

| Candidate Input           | 第一阶段结论         | 可接受用途                                     | 禁止用途                                     | 必要前置                   |
| ------------------------- | -------------------- | ---------------------------------------------- | -------------------------------------------- | -------------------------- |
| 销售情报结构化缺口        | Accept deterministic | 作为完整度提示、销售推进建议、评分 v2 候选因子 | 直接用私人画像或自由文本情绪打分             | `EX-61B`, `EX-63B`         |
| 销售跟进频率 / 最近跟进   | Accept deterministic | 作为活跃度、逾期待办和推进停滞风险信号         | 用通话内容或主观评价自动降分                 | `EX-44`, `EX-49A`          |
| 附件元数据                | Accept limited       | 识别是否有方案、报价、合同草案等证据类别       | 读取附件原文后直接打分                       | `EX-45`, `EX-51`           |
| OCR / 附件内容解析        | Defer                | 后续作为人工确认后的结构化证据摘要             | 自动抽取敏感信息、永久保存全文、绕过附件权限 | 新增 extraction governance |
| LLM 评分建议              | Defer                | 后续作为“建议”和解释草稿, 需要人工确认         | 直接覆盖系统评分、隐藏硬闸口缺口             | 新增 model governance      |
| 私人画像字段              | Reject               | N/A                                            | 婚姻、籍贯、个人爱好、私人偏好等自动评分输入 | N/A                        |
| 外部第三方画像 / 爬取信息 | Reject for now       | N/A                                            | 未授权采集、不可解释外部评分、黑盒风险因子   | 法务/合规另行评估          |

## 5. 数据与隐私边界

- 不保存附件 OCR 全文作为评分事实。
- 不把联系人个人偏好、婚姻、籍贯、爱好等私人画像纳入评分。
- 不把自由文本原文复制进评分历史、审计日志或模型 prompt 归档。
- 可保存的只是业务必要摘要, 例如:
  - `hasProposalAttachment`
  - `hasBudgetEvidence`
  - `lastFollowUpAt`
  - `nextFollowUpOverdue`
  - `decisionMakerKnown`
  - `procurementProcessKnown`
- 所有可保存摘要必须有来源对象、来源时间、操作者或系统任务、权限边界和审计记录。

## 6. 评分治理边界

后续任何智能增强都必须满足:

1. 不改变确认有效 / 转项目硬闸口。
2. 不静默改变 `lead.score/rating` 的语义。
3. 如果进入系统评分, 必须显式升级 `formulaVersion`, 例如 `lead-score-v2`。
4. 每次智能评分结果必须进入 `lead_score_snapshot`, 能解释输入摘要、公式版本和模型/规则版本。
5. 人工覆盖仍通过 `lead_score_override`, 不能被 AI 输出绕过。
6. UI 必须区分“系统评分”“人工覆盖”“AI 建议 / 风险提示”。

## 7. 后续拆片建议

| Slice ID | 建议名称                           | Slice Type | 目标                                                                     | 不做               |
| -------- | ---------------------------------- | ---------- | ------------------------------------------------------------------------ | ------------------ |
| `EX-55A` | 销售活跃度与结构化事实评分 v2 治理 | GOV        | 冻结 follow-up recency、销售情报缺口、附件元数据如何进入 `lead-score-v2` | 不接 LLM / OCR     |
| `EX-55B` | 附件内容抽取与 OCR 治理基线        | GOV        | 冻结异步抽取、人工确认、脱敏、保留期限、权限和成本边界                   | 不直接改评分       |
| `EX-55C` | AI 评分建议实验基线                | GOV        | 冻结模型输入、输出、解释、人工确认、A/B 和回滚边界                       | 不自动覆盖系统评分 |
| `FE-58`  | 智能评分解释与建议前端占位         | FE         | 在评分历史中展示“建议/风险提示”来源和人工确认状态                        | 不隐藏硬闸口缺口   |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Decision:
  - `EX-55` 不进入运行时代码。
  - 第一阶段只允许结构化事实和销售活跃度作为后续评分 v2 候选。
  - OCR / LLM 必须先通过独立治理切片, 不得直接写入当前评分。
  - 私人画像和未经授权外部画像不进入 POMS 评分体系。

## 9. G4 收口

- Gate Status: `Done`
- Closed By: `Codex local`
- Closed At: `2026-05-07`
- Evidence:
  - 本片保持 docs-only / evaluation, 未修改运行时代码、migration、OpenAPI 或 generated client。
  - 后续工程入口拆为 `EX-55A`、`EX-55B`、`EX-55C` 和 `FE-58`。
  - 本片结论可作为 `lead-score-v2`、附件抽取治理和智能评分建议实验的前置约束。
