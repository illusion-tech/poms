# EX-55A-R 结构化事实评分 v2 后端运行时 G4 Closeout

- Gate Status: `G4 / Done`
- Owner: `Codex`
- Slice Type: `backend / runtime`
- G4 Date: `2026-05-07`
- Baseline: `ex-55a-r-lead-score-v2-runtime-baseline.md`
- G3 Checkpoint: `ex-55a-r-lead-score-v2-runtime-g3-checkpoint.md`
- Implementation Commit: `38e4e19`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-55A-R`

## 1. G4 结论

`EX-55A-R` 可以关闭为 `Done / G4`。

本片已在既有线索评分和评分历史框架内落地 `lead-score-v2`:

- `LeadScoreFactsService` 聚合销售情报完整度、跟进活跃度和线索附件元数据。
- `calculateLeadScore` 保持纯函数, 接收基础 lead facts 与 `LeadScoreV2FactSummary`。
- `LeadService` 在既有写路径中重算 v2 系统评分。
- `LeadScoreService` 使用同一事实摘要写入 `lead_score_snapshot.componentBreakdown`。
- 人工覆盖投影保持不变, active override 仍决定当前有效评分。

## 2. 范围确认

| Area          | Result    | Notes                                                                     |
| ------------- | --------- | ------------------------------------------------------------------------- |
| Public route  | No change | 未新增 / 修改 public route。                                              |
| DTO / OpenAPI | No change | 未新增 DTO, 不需要 OpenAPI / generated client 更新。                      |
| Persistence   | No change | 未新增 migration 或字段, 复用 `formula_version` 与 `componentBreakdown`。 |
| Privacy       | Closed    | 快照只存布尔、计数与时间摘要, 不存联系人姓名、沟通正文或附件内容。        |
| OCR / LLM     | Excluded  | 未接入 OCR、LLM、附件全文或外部画像。                                     |
| Frontend      | Deferred  | 评分解释入口由 `FE-58` 另行承接。                                         |

## 3. 验证回放

| Check              | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lead focused tests | Pass   | `corepack pnpm exec jest apps/poms-api/src/app/features/lead/lead.service.spec.ts apps/poms-api/src/app/features/lead/lead.controller.spec.ts apps/poms-api/src/app/features/lead/lead-scoring.spec.ts apps/poms-api/src/app/features/lead/lead-score.service.spec.ts apps/poms-api/src/app/features/lead/lead-query.service.spec.ts --runInBand` -> 5 suites / 41 tests passed. |
| poms-api lint      | Pass   | `corepack pnpm nx lint poms-api`。                                                                                                                                                                                                                                                                                                                                               |
| poms-api build     | Pass   | `corepack pnpm nx build poms-api`。                                                                                                                                                                                                                                                                                                                                              |
| Markdown check     | Pass   | `corepack pnpm run format:md:check`。                                                                                                                                                                                                                                                                                                                                            |
| cached diff check  | Pass   | `git diff --cached --check` before implementation commit。                                                                                                                                                                                                                                                                                                                       |

## 4. Drift 处置

| Drift ID               | Classification               | Status | Handling                                                                        |
| ---------------------- | ---------------------------- | ------ | ------------------------------------------------------------------------------- |
| `EX55AR-D1-POST-G3`    | `existing-baseline-drift`    | Closed | G3 checkpoint 曾因未提交保持 Doing；实现 commit `38e4e19` 后本 closeout 关闭。  |
| `EX55AR-D2-TEST-NOISE` | `existing non-slice drift`   | Closed | 全量 Jest 暴露的 sales-follow-up 日期敏感测试另由漂移盘点修复, 不属于本片实现。 |
| `EX55AR-D3-ARCHIVE`    | `governance-lifecycle-drift` | Closed | 本 closeout 后生命周期产物迁移至 `archive/slices/`。                            |

## 5. 下游

- `FE-58` 可消费 v2 `componentBreakdown` 做评分解释入口。
- `EX-55B` / `EX-55C` 仍需独立治理, 不得直接复用本片引入 OCR、LLM 或外部画像。
