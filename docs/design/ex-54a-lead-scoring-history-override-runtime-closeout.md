# EX-54A 线索评分历史与人工覆盖后端运行时收口

- Task ID: `EX-54A`
- Parent: `EX-54`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-54A`
- Baseline: `docs/design/ex-54a-lead-scoring-history-override-runtime-baseline.md`
- Status: `G4`
- Closed At: 2026-05-06

## 1. Delivered

1. 新增 `lead_score_snapshot` 与 `lead_score_override` 持久化模型、MikroORM entity 和 migration, 覆盖系统评分快照、人工覆盖生命周期、range / enum check、pending / approved 唯一约束和乐观锁。
2. 新增评分历史和覆盖命令后端运行时: `GET /leads/{id}/score-history`、`POST /leads/{id}/score-overrides`、`POST /lead-score-overrides/{id}:approve|reject|revoke`。
3. `LeadSummary`、`LeadListView`、`LeadDetailView` 保留系统评分字段, 新增 `effectiveScore/effectiveRating/effectiveScoreReason/effectiveScoreSource/activeScoreOverrideId` 显式投影。
4. `lead.score/rating` 继续表示系统 deterministic 评分; 人工覆盖只通过有效评分投影生效, 不补齐确认有效 / 转项目硬闸口缺口。
5. 覆盖提交使用 `lead:write`; 批准 / 驳回 / 撤销使用 `lead:score:override`; 开发环境销售负责人角色已补齐审批权限。
6. 覆盖命令写入 runtime audit; 线索创建、更新、确认有效、关闭、转项目、申领 / 改派都会记录系统评分快照。
7. OpenAPI 与 generated shared API client 已更新, route inventory `6.17` 已从 `planned` 切为 `aligned`。

## 2. Validation

| Check              | Result | Evidence                                                             |
| ------------------ | ------ | -------------------------------------------------------------------- |
| API lint           | Pass   | `corepack pnpm nx lint poms-api`                                     |
| Lead focused tests | Pass   | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead` |
| API full tests     | Pass   | `corepack pnpm nx test poms-api --runInBand`                         |
| API build          | Pass   | `corepack pnpm nx build poms-api --configuration development`        |
| OpenAPI            | Pass   | `corepack pnpm nx run poms-api:openapi`                              |
| Generated client   | Pass   | `corepack pnpm nx run shared-api-client:generate`                    |
| Admin build        | Pass   | `corepack pnpm nx build poms-admin`                                  |
| Migration apply    | Pass   | `corepack pnpm nx run poms-api:migration-up`                         |
| Migration drift    | Pass   | `corepack pnpm nx run poms-api:migration-check`                      |
| Markdown format    | Pass   | `corepack pnpm run format:md:check`                                  |
| Whitespace         | Pass   | `git diff --check`                                                   |

## 3. Follow-up

| Slice   | Purpose                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `FE-56` | 在线索列表 / 详情接入有效评分、历史抽屉、覆盖提交与审批 / 驳回 / 撤销入口。                           |
| `EX-55` | 继续评估 AI / OCR / 附件内容解析 / 跟进画像是否可作为评分输入; 不绕过 EX-54A 的历史、权限和审计边界。 |

## 4. Remaining Risks

- 当前尚未做前端入口, 用户仍无法在 UI 中查看评分历史或发起覆盖申请; 由 `FE-56` 承接。
- 当前命令使用轻量自管审批状态机, 未接入通用审批流和待办; 若未来接入, 必须保留 override 状态、审计和 rowVersion 并发边界。
