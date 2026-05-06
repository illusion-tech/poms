# EX-55A 销售活跃度与结构化事实评分 v2 治理收口

- Task ID: `EX-55A`
- Slice type: `governance / docs-only`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-55A`
- Baseline: `docs/design/ex-55a-lead-score-v2-structured-facts-governance-baseline.md`
- Status: `G4`
- Closed At: 2026-05-07

## 1. Delivered

1. 冻结 `lead-score-v2` 的 deterministic 增强信号边界。
2. 明确可接受输入只包括结构化销售事实、跟进活跃度和附件元数据。
3. 明确 OCR、LLM、附件全文、自由文本情绪和私人画像不得进入本片评分输入。
4. 明确未来运行时必须使用显式 `formulaVersion = lead-score-v2`, 并写入 `lead_score_snapshot`。
5. 明确当前有效评分和人工覆盖继续遵循 `EX-54` 投影与审批规则。

## 2. Validation

| Check                                  | Result | Notes                                 |
| -------------------------------------- | ------ | ------------------------------------- |
| Runtime code change                    | N/A    | 本片为治理基线, 不修改运行时代码。    |
| Migration / OpenAPI / generated client | N/A    | 后续由 `EX-55A-R` 运行时切片决定。    |
| Markdown format check                  | Pass   | `corepack pnpm run format:md:check`。 |
| `git diff --check`                     | Pass   | `git diff --check`。                  |

## 3. Follow-up

| Slice      | Purpose                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| `EX-55A-R` | 落地 `lead-score-v2` 后端运行时, 生成结构化事实输入摘要、系统评分和评分历史快照。 |
| `FE-58`    | 在评分历史 / 评分解释区域展示评分 v2 组成、来源和人工覆盖关系。                   |
| `EX-55B`   | 冻结附件内容抽取 / OCR 的人工确认、脱敏、权限、保留期限和成本边界。               |
| `EX-55C`   | 冻结 AI 评分建议实验的模型输入、输出、解释、人工确认、A/B 和回滚边界。            |

## 4. Remaining Risks

- 若运行时直接修改 `lead.score/rating` 但不写 `lead_score_snapshot`, 会失去评分变更解释。
- 若评分 v2 把附件内容、跟进详情或销售发现自由文本原文复制进快照, 会扩大敏感信息范围。
- 若前端只展示增强后的高分而隐藏硬闸口缺口, 会误导用户以为评分可以替代确认有效 / 转项目条件。
