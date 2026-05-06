# FE-56 线索评分历史与人工覆盖前端入口实施基线包

- Gate Status: `Pass`
- Parent: `EX-54`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: 2026-05-06
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-56`

## 1. 范围

- 本次目标: 在线索列表 / 详情中接入当前有效评分、系统评分标识、评分历史视图、人工覆盖提交、审批 / 驳回 / 撤销入口和硬闸口缺口提示。
- 本次明确不做: 新增后端 route、OpenAPI / generated client、migration、AI 评分、OCR、附件内容解析、外部画像、通用审批流、消息推送或转项目硬闸口策略变更。
- 下游可依赖的交付边界: 用户能从线索列表和详情看清“当前有效评分来自系统还是人工覆盖”, 并在有权限时完成覆盖申请与审批处置。
- 不允许下游依赖的留白: 前端不自行计算评分、评级或闸口; 不能把人工覆盖当作补齐转项目缺口的方式。

## 2. 正式输入

| Input Type                | Document / Source                                                        | Section / Anchor      | Status   | Notes                                                     |
| ------------------------- | ------------------------------------------------------------------------ | --------------------- | -------- | --------------------------------------------------------- |
| Business design           | `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md` | `4` / `6` / `11`      | Frozen   | 三类评分、覆盖生命周期、前端体验边界和硬闸口不变已冻结。  |
| Command design            | `docs/design/ex-54a-lead-scoring-history-override-runtime-baseline.md`   | `4`                   | Frozen   | submit / approve / reject / revoke 命令已由 EX-54A 落地。 |
| DTO / OpenAPI design      | `libs/shared/api-client/model/*score*`                                   | generated client      | Aligned  | FE-56 直接消费 generated client, 不修改 DTO。             |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                           | `6.17`                | Aligned  | 路由由 EX-54A 对齐, FE-56 不新增 public route surface。   |
| Query boundary            | `libs/shared/api-client/api/lead.service.ts`                             | score history methods | Aligned  | 前端通过 `LeadStore` 包装 generated client。              |
| Data model / table freeze | `docs/design/ex-54a-lead-scoring-history-override-runtime-baseline.md`   | `6`                   | Aligned  | 前端只显示读侧投影和 command 返回值, 不依赖数据库结构。   |
| Schema / DDL              | N/A                                                                      | N/A                   | N/A      | 本片不触及持久化。                                        |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                            | route grammar         | Accepted | 本片不修改 route grammar。                                |

## 3. 本次 SSOT

| Concern                     | SSOT                     | Implementation Rule                                                                        |
| --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| Business semantics          | EX-54 baseline           | `score/rating` 是系统评分, `effectiveScore/effectiveRating` 是当前有效评分。               |
| Public route canonical path | API route inventory      | 不新增、改名或别名化 route。                                                               |
| Route / command naming      | generated `LeadApi`      | 使用 EX-54A 生成的方法名, 通过 `LeadStore` 暴露前端用例方法。                              |
| DTO / contract naming       | generated models         | UI 直接引用 `LeadScoreHistoryView`、`LeadScoreOverrideSummary` 和 request DTO。            |
| Table / column naming       | N/A                      | 本片不触及表或列。                                                                         |
| Date / time semantics       | generated datetime       | 只按 existing Angular date pipe 展示, 不在前端改写时区语义。                               |
| Identifier semantics        | generated UUID strings   | override 操作使用 returned override `id` 和 `rowVersion`。                                 |
| Money / decimal semantics   | N/A                      | 本片不新增金额字段。                                                                       |
| Status machine              | EX-54 override lifecycle | 只根据 `pending/approved/rejected/revoked/superseded` 展示动作, 不在前端推导后端状态迁移。 |

## 4. 命令与接口边界

| Route / Controller                        | Command / Service          | Request DTO / Contract            | Response DTO / Contract    | Guard / Permission    | Design Source | Result  |
| ----------------------------------------- | -------------------------- | --------------------------------- | -------------------------- | --------------------- | ------------- | ------- |
| `GET /leads/{id}/score-history`           | `loadLeadScoreHistory`     | path `id`                         | `LeadScoreHistoryView`     | `lead:read`           | EX-54A        | Consume |
| `POST /leads/{id}/score-overrides`        | `submitLeadScoreOverride`  | `SubmitLeadScoreOverrideRequest`  | `LeadScoreOverrideSummary` | `lead:write`          | EX-54A        | Consume |
| `POST /lead-score-overrides/{id}:approve` | `approveLeadScoreOverride` | `ApproveLeadScoreOverrideRequest` | `LeadScoreOverrideSummary` | `lead:score:override` | EX-54A        | Consume |
| `POST /lead-score-overrides/{id}:reject`  | `rejectLeadScoreOverride`  | `RejectLeadScoreOverrideRequest`  | `LeadScoreOverrideSummary` | `lead:score:override` | EX-54A        | Consume |
| `POST /lead-score-overrides/{id}:revoke`  | `revokeLeadScoreOverride`  | `RevokeLeadScoreOverrideRequest`  | `LeadScoreOverrideSummary` | `lead:score:override` | EX-54A        | Consume |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): EX-54A 已对齐的五条评分历史 / 覆盖 route。
- Current implemented route(s): same as canonical.
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-54A`
- Blocker / exception: N/A。

## 5. 读侧边界

| Query / View               | Consumer      | Fields                                                           | Filter / Sort                         | Permission Boundary                | Design Source | Result  |
| -------------------------- | ------------- | ---------------------------------------------------------------- | ------------------------------------- | ---------------------------------- | ------------- | ------- |
| `LeadListView`             | lead list     | system score + effective score + active override marker          | existing rating filter remains system | `lead:read`                        | EX-54A        | Consume |
| `LeadDetailView`           | lead detail   | same as list plus detail context                                 | by lead id                            | `lead:read`                        | EX-54A        | Consume |
| `LeadScoreHistoryView`     | score dialog  | current system/effective score, active/pending override, history | server returned order                 | `lead:read`                        | EX-54A        | Consume |
| `LeadScoreOverrideSummary` | override card | request score/rating, status, reasons, actors, rowVersion        | server returned order                 | `lead:write` / override permission | EX-54A        | Consume |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result       |
| ----- | --------- | ------------------- | ------------------- | ------------------ |
| N/A   | N/A       | N/A                 | N/A                 | 本片不触及持久化。 |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | N/A    |

## 7. 一致性结论

- Document -> code: FE-56 按 EX-54 / EX-54A 消费已生成契约, 不改业务语义。
- ADR-015 inventory -> route: 本片不新增 route, 只消费已 aligned route。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: `LeadStore` 方法与 generated `LeadApi` 一一对应。
- Query -> view: 列表 / 详情显示当前有效评分, 评分历史对话框展示系统和覆盖历史。
- Guard / permission: 提交沿用 `lead:write`; 审批 / 驳回 / 撤销只在 `lead:score:override` 权限下显示。
- OpenAPI / generated client: 消费 EX-54A 已生成 client, 本片不重新生成。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                          | Result | Gap / Reason                          |
| -------------------------------- | -------- | --------------------------------------------------------------------------- | ------ | ------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin`                                          | Pass   |                                       |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                                         | Pass   |                                       |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` | Pass   |                                       |
| API / integration tests          | No       | N/A                                                                         | N/A    | 后端已由 EX-54A 覆盖。                |
| E2E                              | No       | N/A                                                                         | N/A    | 本片用 focused component tests 覆盖。 |
| OpenAPI generation / client diff | No       | N/A                                                                         | N/A    | 不修改 API surface。                  |
| Migration / schema check         | No       | N/A                                                                         | N/A    | 不触及持久化。                        |
| Markdown / whitespace            | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                     | Pass   |                                       |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 当前无例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-05-06
- Conditions:
  1. 列表和详情必须把当前有效评分与系统评分区分展示。
  2. 人工覆盖入口必须提示不会补齐确认有效 / 转项目硬闸口缺口。
  3. 评分覆盖审批动作必须使用后端返回的 override `rowVersion`, 不在前端跳过并发控制。
