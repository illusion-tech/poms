# EX-55A-R 结构化事实评分 v2 后端运行时 G3 Checkpoint

- Gate Status: `Pass with Existing Non-Slice Test Failure`
- Owner: `Codex`
- Slice Type: `backend / runtime`
- Checkpoint Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-55A-R`

## 1. 实现摘要

`EX-55A-R` 已完成后端运行时实现, 将线索系统评分从纯基础商务事实扩展为 `lead-score-v2`:

- 新增 `LeadScoreFactsService`, 从已有结构化数据聚合三类评分事实:
  - 销售情报完整度: 决策人、技术把关人、采购流程、预算来源、竞争对手、痛点、下一步对象。
  - 跟进活跃度: 最近跟进时间、30 天 active 跟进次数、下一次跟进及逾期状态。
  - 附件元数据证据: lead active latest/final 附件中是否存在方案、报价、预算证明类分类。
- `calculateLeadScore` 保持纯函数, 接收基础 lead facts 和 `LeadScoreV2FactSummary`。
- `LeadService` 在创建、更新、确认有效、关闭、转项目、认领 / 改派等既有重算路径中加载评分事实并刷新系统评分。
- `LeadScoreService.recordSystemSnapshot` 使用同一事实摘要写入 `lead_score_snapshot.componentBreakdown`, 并标记 `formulaVersion = lead-score-v2`。
- 人工覆盖投影保持不变: 有 active override 时有效评分仍取人工覆盖, 系统评分和 v2 breakdown 继续记录为历史证据。

## 2. 边界确认

| Area          | Result                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| Public route  | 未新增 / 修改 public route。                                              |
| DTO / OpenAPI | 未新增 / 修改 DTO；不需要 OpenAPI 或 generated client 更新。              |
| Persistence   | 未新增 migration 或字段；复用 `formula_version` 和 `componentBreakdown`。 |
| Privacy       | 快照仅保存布尔值、计数和时间摘要；不保存联系人姓名、沟通备注或附件内容。  |
| OCR / LLM     | 未接入 OCR、LLM、附件全文或外部画像。                                     |
| Frontend      | 未做前端入口；由 `FE-58` 继续承接评分解释体验。                           |

## 3. 验证

| Check                 | Result | Notes                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lead focused tests    | Passed | `corepack pnpm exec jest apps/poms-api/src/app/features/lead/lead.service.spec.ts apps/poms-api/src/app/features/lead/lead.controller.spec.ts apps/poms-api/src/app/features/lead/lead-scoring.spec.ts apps/poms-api/src/app/features/lead/lead-score.service.spec.ts apps/poms-api/src/app/features/lead/lead-query.service.spec.ts --runInBand` -> 5 suites / 41 tests passed. |
| poms-api lint         | Passed | `corepack pnpm nx lint poms-api`。                                                                                                                                                                                                                                                                                                                                               |
| poms-api build        | Passed | `corepack pnpm nx build poms-api`。                                                                                                                                                                                                                                                                                                                                              |
| diff whitespace check | Passed | `git diff --check`。                                                                                                                                                                                                                                                                                                                                                             |
| poms-api full Jest    | Failed | `corepack pnpm exec jest --runInBand` from `apps/poms-api` -> 50 / 51 suites passed; remaining failure is existing non-slice expectation drift in `sales-follow-up.repository.spec.ts` where reminder priority is expected `normal` but runtime returns `high`.                                                                                                                  |

## 4. G3 结论

- `EX-55A-R` 运行时代码满足 G1 冻结边界, 可进入提交前复核。
- 当前未推进到 G4, 因为本片实现尚未形成 commit。
- 全量 Jest 的唯一失败不在本片 touched files 或评分运行时范围内, 作为 existing non-slice test failure 记录; 不在本片修改销售跟进提醒优先级。
