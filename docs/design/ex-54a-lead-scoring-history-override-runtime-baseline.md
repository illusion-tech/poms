# EX-54A 线索评分历史与人工覆盖后端运行时实施基线包

- Gate Status: `Pass`
- Parent: `EX-54`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-05-06
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-54A`

## 1. 范围

- 本次目标: 落地线索评分历史快照、人工覆盖提交 / 审批 / 驳回 / 撤销、当前有效评分读侧投影、权限、审计、migration、OpenAPI / generated client 和后端 focused tests。
- 本次明确不做: AI 评分、OCR、附件内容解析、外部画像、前端入口、通用审批流、消息推送、转项目硬闸口策略变更。
- 下游可依赖的交付边界: `FE-56` 可以消费 generated client 展示有效评分、评分历史和人工覆盖操作; `EX-55` 可以基于历史 / override 约束评估智能评分输入。
- 不允许下游依赖的留白: 不能把 `lead.score/rating` 理解为人工覆盖后的有效评分; 不能认为高有效评分可以补齐确认有效 / 转项目缺口。

## 2. 正式输入

| Input Type                | Document / Source                                                                   | Section / Anchor                                  | Status   | Notes                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| Business design           | `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md`            | `4` / `5` / `6` / `10`                            | Frozen   | 三类评分、快照、覆盖生命周期、权限审计和硬闸口不变式已冻结。                      |
| Command design            | `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md`            | `6` / `7`                                         | Frozen   | submit / approve / reject / revoke route 与并发规则已冻结。                       |
| DTO / OpenAPI design      | `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md`            | `8`                                               | Frozen   | 需要新增 history view、override request DTO 和 Lead 有效评分字段。                |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                      | `6.17 EX-54 Lead Score History / Manual Override` | Planned  | 五条 route 已是 authoritative planned rows; 本片实现后切为 `aligned`。            |
| Query boundary            | `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md`            | `7` / `8` / `11`                                  | Frozen   | 读取历史为 Lead 子资源; Lead list/detail 只新增显式有效评分投影。                 |
| Data model / table freeze | `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md`            | `9`                                               | Frozen   | 需要 `lead_score_snapshot` 和 `lead_score_override`。                             |
| Schema / DDL              | `apps/poms-api/src/app/features/lead/lead.entity.ts` / current EX-47 scoring fields | current implementation                            | Review   | 现有 `lead.score/rating` 继续表示系统评分; 不新增 `lead.effective_*` 列。         |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                                       | route grammar                                     | Accepted | history 使用 Lead child resource, override action 使用 stable override identity。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                  | Implementation Rule                                                                                            |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Business semantics          | EX-54 baseline                        | 系统评分、人工覆盖评分、当前有效评分必须显式区分。                                                             |
| Public route canonical path | Route inventory `6.17`                | 只实现已登记 planned routes, 不新增替代 alias。                                                                |
| Route / command naming      | EX-54 planned API                     | 使用 `listLeadScoreHistory`、`submitLeadScoreOverride`、`approve/reject/revokeLeadScoreOverride`。             |
| DTO / contract naming       | EX-54 planned contracts               | 新增 `LeadScoreHistoryView`、`LeadScoreHistoryItem`、`Submit/Approve/Reject/RevokeLeadScoreOverrideRequest`。  |
| Table / column naming       | EX-54 planned persistence             | 使用 `lead_score_snapshot` 和 `lead_score_override`, snake_case column 与 shared contract camelCase 一一映射。 |
| Date / time semantics       | Existing POMS datetime contract style | 审批、撤销、快照时间均为 `timestamptz` / `z.iso.datetime()`。                                                  |
| Identifier semantics        | Internal UUID                         | `leadId`、`overrideId`、`snapshotId`、actor IDs 均使用系统 UUID。                                              |
| Money / decimal semantics   | N/A                                   | 本片不新增金额字段。                                                                                           |
| Status machine              | EX-54 lifecycle                       | override status 固定为 `pending/approved/rejected/revoked/superseded`; snapshot kind 固定三值。                |

## 4. 命令与接口边界

| Route / Controller                       | Command / Service          | Request DTO / Contract            | Response DTO / Contract    | Guard / Permission    | Design Source | Result  |
| ---------------------------------------- | -------------------------- | --------------------------------- | -------------------------- | --------------------- | ------------- | ------- |
| `GET /leads/:id/score-history`           | `listLeadScoreHistory`     | path `id`                         | `LeadScoreHistoryView`     | `lead:read`           | EX-54 `7`     | Planned |
| `POST /leads/:id/score-overrides`        | `submitLeadScoreOverride`  | `SubmitLeadScoreOverrideRequest`  | `LeadScoreOverrideSummary` | `lead:write`          | EX-54 `7`     | Planned |
| `POST /lead-score-overrides/:id:approve` | `approveLeadScoreOverride` | `ApproveLeadScoreOverrideRequest` | `LeadScoreOverrideSummary` | `lead:score:override` | EX-54 `7`     | Planned |
| `POST /lead-score-overrides/:id:reject`  | `rejectLeadScoreOverride`  | `RejectLeadScoreOverrideRequest`  | `LeadScoreOverrideSummary` | `lead:score:override` | EX-54 `7`     | Planned |
| `POST /lead-score-overrides/:id:revoke`  | `revokeLeadScoreOverride`  | `RevokeLeadScoreOverrideRequest`  | `LeadScoreOverrideSummary` | `lead:score:override` | EX-54 `7`     | Planned |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /leads/{id}/score-history`, `POST /leads/{id}/score-overrides`, `POST /lead-score-overrides/{id}:approve`, `POST /lead-score-overrides/{id}:reject`, `POST /lead-score-overrides/{id}:revoke`
- Current implemented route(s): `N/A`
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-54`
- Blocker / exception: coding may start after this G1 baseline; implementation must flip inventory rows to `aligned` after routes exist.

## 5. 读侧边界

| Query / View                   | Consumer          | Fields                                                                                                    | Filter / Sort                           | Permission Boundary | Design Source | Result  |
| ------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------- | ------------- | ------- |
| `LeadSummary` / `LeadListView` | Admin lead list   | existing system score fields + `effectiveScore/effectiveRating/effectiveScoreReason/effectiveScoreSource` | existing `rating` remains system rating | `lead:read`         | EX-54 `8`     | Planned |
| `LeadDetailView`               | Admin lead detail | same as summary plus `activeScoreOverrideId`                                                              | by lead id                              | `lead:read`         | EX-54 `8`     | Planned |
| `LeadScoreHistoryView`         | FE-56             | current system score, current effective score, active / pending override, timeline                        | by lead id; timeline desc               | `lead:read`         | EX-54 `7`     | Planned |

## 6. 持久化边界

| Table                 | Migration | Entity / Repository | DDL / Freeze Source | Check Result                           |
| --------------------- | --------- | ------------------- | ------------------- | -------------------------------------- |
| `lead_score_snapshot` | New       | New                 | EX-54 `9.1`         | Required                               |
| `lead_score_override` | New       | New                 | EX-54 `9.2`         | Required                               |
| `lead`                | Existing  | Existing            | EX-47               | Do not change `score/rating` semantics |

| Field / Group                               | Design Type / Meaning         | Migration / DDL               | Entity                    | Shared Contract / OpenAPI                | Result  |
| ------------------------------------------- | ----------------------------- | ----------------------------- | ------------------------- | ---------------------------------------- | ------- |
| `snapshot_kind`                             | `LeadScoreSnapshotKind`       | varchar check                 | typed string              | enum schema                              | Planned |
| `formula_version`                           | first version `lead-score-v1` | varchar                       | string                    | string                                   | Planned |
| `system_score/effective_score`              | integer 0-100                 | integer range checks          | integer                   | int 0-100                                | Planned |
| `system_rating/effective_rating`            | `LeadRating`                  | varchar check                 | `LeadRating`              | `LeadRatingSchema`                       | Planned |
| `component_breakdown/gate_summary_snapshot` | JSONB explanation snapshots   | jsonb not null default object | `Record<string, unknown>` | `z.record(z.string(), z.unknown())`      | Planned |
| `override.status`                           | `LeadScoreOverrideStatus`     | varchar check                 | typed string              | enum schema                              | Planned |
| `override.row_version`                      | optimistic concurrency        | integer version               | MikroORM version          | positive integer in command expectations | Planned |

## 7. 一致性结论

- Document -> code: EX-54A 尚未写代码, 本基线冻结后进入 G2。
- ADR-015 inventory -> route: 五条 route 已登记为 `planned`, 实现后必须切为 `aligned`。
- Migration -> entity: 必须新增 migration 和 entity, 并通过 migration-check。
- Entity -> contract: snapshot / override status、rating、score range 必须与 shared contract / OpenAPI 对齐。
- Route -> command: controller 只薄映射到 service; 普通 `PATCH /leads/{id}` 不得写 override。
- Query -> view: Lead list/detail 显式区分 system score 与 effective score。
- Guard / permission: `lead:write` 只允许提交, `lead:score:override` 才允许批准 / 驳回 / 撤销。
- OpenAPI / generated client: 需要生成并校验同步。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                            | Result  | Gap / Reason |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------- | ------- | ------------ |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                              | Pending |              |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                             | Pending |              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`                          | Pending |              |
| API / integration tests          | Yes      | `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=lead-workflow`                          | Pending |              |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`; `corepack pnpm nx run shared-api-client:check`       | Pending |              |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check` | Pending |              |
| Markdown / whitespace            | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                       | Pending |              |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 当前无例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-05-06
- Conditions:
  1. 实现必须保留 `lead.score/rating` 为系统评分语义。
  2. 实现后必须把 route inventory `6.17` planned rows 切为 `aligned`。
  3. 未完成 EX-54A 前不得开始 FE-56 前端入口。
