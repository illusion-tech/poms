# EX-55A-R 结构化事实评分 v2 后端运行时基线

- Gate Status: `Pass`
- Owner: `Codex`
- Slice Type: `backend / runtime`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-55A-R`

## 1. 目标

`EX-55A-R` 落地 `lead-score-v2` 的后端运行时。它在既有线索评分、评分历史和人工覆盖框架内, 增加结构化销售事实、跟进活跃度和附件元数据三类 deterministic 输入。

本片不新增 public route。评分历史仍通过既有 `GET /leads/{id}/score-history` 读取。

## 2. 正式输入

| Input Type              | Document / Source                                              | Status | Notes                                                           |
| ----------------------- | -------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| Score v2 governance     | `ex-55a-lead-score-v2-structured-facts-governance-baseline.md` | Pass   | 冻结可接受输入和禁止输入。                                      |
| Score v2 closeout       | `ex-55a-lead-score-v2-structured-facts-governance-closeout.md` | Pass   | 确认本片由 `EX-55A-R` 承接运行时。                              |
| Score history runtime   | `EX-54A` closeout / current `LeadScoreService`                 | Pass   | 现有 `lead_score_snapshot` 支持 `formulaVersion` 和 breakdown。 |
| Lead scoring runtime    | `apps/poms-api/src/app/features/lead/lead-scoring.ts`          | Pass   | 当前 `lead-score-v1` 只使用基础商务事实。                       |
| Sales intelligence gaps | `SalesIntelligenceService.getSalesIntelligenceGaps`            | Pass   | 已有决策人、技术把关人、采购流程、预算来源、竞争对手等缺口。    |
| Follow-up facts         | `SalesFollowUpRecord`                                          | Pass   | 可从 active 记录聚合最近跟进、30 天次数、下一次跟进逾期。       |
| Attachment metadata     | `Attachment` / `AttachmentLink`                                | Pass   | 只读取 lead 挂载附件的类别、状态、latest/final, 不读文件内容。  |

## 3. 范围

### 3.1 Included

- 新增或扩展后端 scoring fact collector, 为单条 Lead 聚合:
  - 销售情报缺口摘要。
  - 最近跟进时间、30 天有效跟进次数、下一次跟进是否逾期。
  - lead 关联附件元数据摘要, 包括是否有方案 / 报价 / 预算证明类附件。
- 扩展评分计算为 `lead-score-v2`, 继续输出 `score`、`rating`、`scoreReason`。
- 扩展 `componentBreakdown`, 保留基础商务分、销售情报完整度、跟进活跃度、附件证据摘要。
- 继续通过 `LeadScoreService.recordSystemSnapshot` 写入 `lead_score_snapshot`, 使用 `formulaVersion = lead-score-v2`。
- 保持人工覆盖和当前有效评分投影不变。
- 补充后端 focused tests。

### 3.2 Excluded

- 不新增 public API route。
- 不新增 migration 或持久化字段；复用 `lead_score_snapshot.component_breakdown` JSONB 和 `formula_version`。
- 不修改 `lead_score_override` lifecycle。
- 不接入 OCR、LLM、附件全文、通话转写、销售发现自由文本情绪或私人画像。
- 不改变确认有效 / 转项目硬闸口。
- 不做前端展示优化；由 `FE-58` 承接。

## 4. 评分输入与分值上限

评分 v2 继续限制总分 100。为了保持与 v1 可解释兼容, 基础商务事实仍是主权重, 增强信号只作为补充。

| Component      | Max Points | Inputs                                                             | Notes                                    |
| -------------- | ---------- | ------------------------------------------------------------------ | ---------------------------------------- |
| 基础商务事实   | 65         | 来源、需求、预算、金额、紧迫度、决策日期、主责                     | 来自现有 `lead-score-v1`, 适当下调上限。 |
| 销售情报完整度 | 20         | 决策人、技术把关人、采购流程、预算来源、竞争对手、痛点、下一步对象 | 只看结构化缺口是否补齐。                 |
| 跟进活跃度     | 10         | 30 天有效跟进次数、最近跟进距离当前天数、下一次跟进是否逾期        | 只看时间 / 次数 / 逾期, 不看文本内容。   |
| 附件元数据证据 | 5          | 是否有方案 / 报价 / 预算证明类 active latest/final 附件            | 只看元数据和人工分类。                   |

第一版可接受轻量权重, 但必须在 `scoreReason` 中清晰展示各类加分, 并在 focused tests 中覆盖上限、缺口和去重。

## 5. 实现边界

建议实现路径:

1. 在 lead feature 内新增评分事实聚合 helper / service, 避免在 `calculateLeadScore` 内直接访问数据库。
2. `calculateLeadScore` 保持纯函数, 输入扩展为基础 Lead facts + optional `LeadScoreV2FactSummary`。
3. 在 `LeadService.create/update/assign/qualify/convert/close` 等现有重算路径中加载评分事实后刷新系统评分。
4. `LeadScoreService.buildSnapshotInput` 使用同一 breakdown, 写入 `formulaVersion = lead-score-v2`。
5. 对旧快照保持只读兼容, 不回填历史。

若运行时发现同步聚合会明显放大写路径查询成本, 允许在本片内改为轻量事实聚合并将批量重算 / 异步重算拆为后续切片。

## 6. Route / Contract / Persistence

| Area            | Decision                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------ |
| Public route    | 不新增；沿用线索创建 / 更新 / 改派等写路径和 `GET /leads/{id}/score-history`。             |
| Shared contract | 不新增必需字段；`LeadScoreHistoryItem.componentBreakdown` 已是 `Record<string, unknown>`。 |
| OpenAPI/client  | 预计不需要 regeneration；若实际实现改 DTO, 必须同步 OpenAPI 与 generated client。          |
| Migration       | 不新增；`lead_score_snapshot.formula_version` 和 `component_breakdown` 已能承载 v2。       |
| Permission      | 不新增；系统评分仍由原写命令触发, 覆盖审批仍用 `lead:score:override`。                     |

## 7. 测试要求

- `lead-scoring` pure function tests:
  - v1 基础事实兼容。
  - v2 增强信号加分和 100 分封顶。
  - 私人画像 / 自由文本不参与计算。
- `lead.service` / `lead-score.service` focused tests:
  - 创建 / 更新 / 改派后写入 `lead-score-v2` 快照。
  - `componentBreakdown` 包含基础商务、销售情报、跟进活跃度、附件元数据摘要。
  - active override 存在时有效评分仍取人工覆盖, 系统评分仍更新为 v2。
- Validation:
  - `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`
  - `corepack pnpm nx lint poms-api`
  - `corepack pnpm nx build poms-api`
  - `git diff --check`
  - 若契约变更, 追加 OpenAPI / shared-api-client check。

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Decision:
  - 可以进入后端运行时实现。
  - 本片不新增 public route、migration、OCR / LLM 或前端入口。
  - 若实现中发现需要新增 DTO 或 route, 必须先回到 route / contract governance。
