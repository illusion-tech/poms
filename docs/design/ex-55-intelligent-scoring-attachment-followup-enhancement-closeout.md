# EX-55 线索智能评分与附件 / 跟进画像增强评估收口

- Task ID: `EX-55`
- Slice type: `governance / docs-only / evaluation`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-55`
- Baseline: `docs/design/ex-55-intelligent-scoring-attachment-followup-enhancement-baseline.md`
- Status: `G4`
- Closed At: 2026-05-07

## 1. Delivered

1. 冻结智能评分增强第一阶段边界: 不直接引入 AI 自动改分, 不改变当前 deterministic `lead.score/rating` 语义。
2. 明确结构化销售事实、跟进活跃度和附件元数据可作为后续 `lead-score-v2` 候选输入。
3. 明确 OCR / 附件内容解析、LLM 评分建议必须另拆治理切片, 先解决抽取、人工确认、脱敏、权限、成本和可解释性。
4. 明确私人画像、未经授权的外部画像、联系人个人偏好等信息不得进入 POMS 评分体系。
5. 将后续拆片建议归纳为 `EX-55A`、`EX-55B`、`EX-55C` 和 `FE-58`, 避免在评估片中混入运行时代码。

## 2. Validation

| Check                                  | Result | Notes                                 |
| -------------------------------------- | ------ | ------------------------------------- |
| Runtime code change                    | N/A    | 本片为评估治理, 不修改运行时代码。    |
| Migration / OpenAPI / generated client | N/A    | 后续运行时或前端切片另行冻结。        |
| Markdown format check                  | Pass   | `corepack pnpm run format:md:check`。 |
| `git diff --check`                     | Pass   | `git diff --check`。                  |

## 3. Follow-up

| Slice    | Purpose                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| `EX-55A` | 冻结销售活跃度、结构化销售事实和附件元数据进入 `lead-score-v2` 的 deterministic 规则、解释、历史快照和审计边界。 |
| `EX-55B` | 冻结附件内容抽取 / OCR 的异步任务、人工确认、脱敏、权限、保留期限和成本边界。                                    |
| `EX-55C` | 冻结 AI 评分建议实验的模型输入、输出、解释、人工确认、A/B 和回滚边界。                                           |
| `FE-58`  | 在评分历史或评分解释区域展示智能建议 / 风险提示来源和人工确认状态。                                              |

## 4. Remaining Risks

- 若后续直接把 AI / LLM 输出写入 `lead.score/rating`, 会破坏 `EX-47` 与 `EX-54` 已冻结的评分语义和历史治理。
- 若 OCR 全文、自由文本或私人画像被复制进评分事实、审计日志或模型 prompt 归档, 会扩大敏感信息暴露面。
- 若智能建议 UI 隐藏硬闸口缺口, 用户可能误以为评分建议可以替代确认有效或转项目条件。
