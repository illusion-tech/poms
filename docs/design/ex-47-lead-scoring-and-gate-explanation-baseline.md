# EX-47 Lead Scoring And Gate Explanation G1 Baseline

- Task ID: `EX-47`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-47`
- Public route surface: no new route; existing Lead response/query DTOs change.
- Status: `G1`
- G1 Date: 2026-04-30

## 1. Scope

本片承接 `EX-43` / `EX-46` 延后的线索评分评级与转项目硬闸口解释:

1. 新增线索评分 `lead.score`，范围 0-100，表达当前线索完整度和推进优先级。
2. 新增线索评级 `lead.rating`，固定为 `A` / `B` / `C` / `D`。
3. 新增评分说明 `lead.score_reason` 和评分更新时间 `lead.score_updated_at`，用于列表、详情和调试解释。
4. 在 `LeadSummary` / `LeadListView` / `LeadDetailView` 暴露评分、评级和 gate 解释摘要。
5. `LeadListQuery` 支持按评级筛选。
6. `qualifyLead` 和 `convertLeadToProject` 继续使用硬闸口校验，但错误和读侧说明必须共享同一套缺口定义。
7. 前端线索列表和详情展示评分、评级、硬闸口状态和缺口说明。

## 2. Out Of Scope

1. 不新增 `POST /leads/{id}:score` 或异步重算任务；评分随线索事实变更同步重算。
2. 不引入 AI 评分、外部画像、OCR、附件内容解析或全文检索。
3. 不把评分阈值作为转项目硬闸口；第一版评分只做优先级和经营判断辅助。
4. 不新增评分人工覆盖、评分审批、评分历史表或版本链。
5. 不改变 `registered -> qualified -> converted / closed` 状态机。
6. 不改变公共池、申领或主管分配命令语义。

## 3. SSOT

| Concern            | Source Of Truth                       | Rule                                                                 |
| ------------------ | ------------------------------------- | -------------------------------------------------------------------- |
| Score value        | `lead.score`                          | 当前线索评分，0-100，随核心事实同步重算。                            |
| Rating             | `lead.rating`                         | `A >= 80`，`B >= 60`，`C >= 40`，`D < 40`。                          |
| Score explanation  | `lead.score_reason`                   | 存储当前评分构成的短文本说明，不作为硬闸口事实源。                   |
| Score timestamp    | `lead.score_updated_at`               | 最近一次评分重算时间，datetime。                                     |
| Qualification gate | Shared gate helper                    | 确认有效必须满足来源、需求、预算、金额、紧迫程度、负责人和主责组织。 |
| Conversion gate    | Shared gate helper                    | 转项目必须先是 `qualified`，且满足同一套事实缺口。                   |
| Gate explanation   | `LeadGateSummary` response projection | 读侧返回是否可确认有效 / 可转项目、缺口枚举和中文说明。              |
| Score is advisory  | This baseline                         | 评分评级不阻断确认有效或转项目；硬闸口只看事实项和状态机。           |

## 4. Scoring Model

第一版采用 deterministic rule，不依赖外部模型:

| Component              | Points | Rule                                                                      |
| ---------------------- | ------ | ------------------------------------------------------------------------- |
| Source                 | 10     | 有有效 `sourceId` 得 10 分。                                              |
| Demand                 | 15     | `demandDescription` 非空得 10 分，长度达到 30 字符以上再加 5 分。         |
| Budget                 | 25     | `rough-budget` 得 15，`budget-confirmed` 得 20，`budget-approved` 得 25。 |
| Estimated amount       | 15     | `estimatedAmount > 0` 得 15。                                             |
| Urgency                | 15     | `low` 得 5，`normal` 得 10，`high` / `critical` 得 15。                   |
| Expected decision date | 10     | 有预计决策日期得 10。                                                     |
| Owner                  | 10     | 同时有 `ownerUserId` 和 `ownerOrgId` 得 10。                              |

评分上限固定为 100。`unknown` / `no-budget` 不贡献预算分。

## 5. Gate Missing Items

Gate 缺口使用稳定枚举，避免前端根据错误字符串推断:

| Missing Item         | Applies To                 | Meaning                             |
| -------------------- | -------------------------- | ----------------------------------- |
| `source`             | qualification / conversion | 缺少线索来源。                      |
| `demand-description` | qualification / conversion | 缺少需求描述。                      |
| `budget`             | qualification / conversion | 预算仍是 `unknown` 或 `no-budget`。 |
| `estimated-amount`   | qualification / conversion | 缺少有效预计金额。                  |
| `urgency`            | qualification / conversion | 缺少紧迫程度。                      |
| `owner`              | qualification / conversion | 缺少销售主责人。                    |
| `owner-org`          | qualification / conversion | 缺少销售主责组织。                  |
| `registered-status`  | qualification only         | 线索不是待确认状态，不能确认有效。  |
| `qualified-status`   | conversion only            | 线索尚未确认有效，不能转项目。      |
| `not-converted`      | conversion only            | 线索已转项目，不能重复转项目。      |
| `not-closed`         | qualification / conversion | 线索已关闭，不能继续确认或转项目。  |

## 6. API / DTO Boundary

不新增 public route。以下既有 route 的 response / query DTO 会扩展:

| Capability             | Route                               | Change                                                                | Guard                        |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| `listLeads`            | `GET /leads`                        | `LeadListQuery.rating?`; `LeadListView.score/rating/gateSummary`      | `lead:read`                  |
| `getLead`              | `GET /leads/{id}`                   | `LeadDetailView.score/rating/gateSummary`                             | `lead:read`                  |
| `createLead`           | `POST /leads`                       | Response returns initial score/rating derived from submitted facts.   | `lead:write`                 |
| `updateLead`           | `PATCH /leads/{id}`                 | Any scoring component change recomputes score/rating.                 | `lead:write`                 |
| `claimLeadOwner`       | `POST /leads/{id}:claim`            | Owner change recomputes score/rating and gate summary on later reads. | `lead:write`                 |
| `assignLeadOwner`      | `POST /leads/{id}:assignOwner`      | Owner change recomputes score/rating and gate summary on later reads. | `lead:assign`                |
| `qualifyLead`          | `POST /leads/{id}:qualify`          | Uses shared gate helper; score does not replace hard gate.            | `lead:write`                 |
| `convertLeadToProject` | `POST /leads/{id}:convertToProject` | Uses shared gate helper; score does not replace hard gate.            | `lead:write + project:write` |

### DTO Additions

- `LeadRating`: `A` / `B` / `C` / `D`
- `LeadGateMissingItem`
- `LeadGateCheck`
  - `status`: `ready` / `blocked`
  - `missingItems`: `LeadGateMissingItem[]`
  - `explanation`: `string`
- `LeadGateSummary`
  - `qualification`: `LeadGateCheck`
  - `conversion`: `LeadGateCheck`
- `LeadSummary` / `LeadListView` / `LeadDetailView`
  - `score: number`
  - `rating: LeadRating`
  - `scoreReason: string`
  - `scoreUpdatedAt: datetime`
  - `gateSummary: LeadGateSummary`

## 7. Persistence Boundary

### Existing Table

`poms.lead`

| Field              | Type / Rule                | Notes                              |
| ------------------ | -------------------------- | ---------------------------------- |
| `score`            | integer not null default 0 | check `0 <= score <= 100`          |
| `rating`           | varchar(8) not null        | check in `A` / `B` / `C` / `D`     |
| `score_reason`     | text not null              | current score explanation          |
| `score_updated_at` | timestamptz not null       | latest deterministic recalculation |

Existing rows are backfilled by migration using the same scoring rule.

## 8. Frontend Boundary

1. 线索统计 / 列表展示评分和评级，支持按评级筛选。
2. 线索详情展示评分构成说明。
3. 确认有效和转项目弹窗展示 gate summary，不再只给通用错误文案。
4. 公共池线索可展示低评分或 gate blocked，但评分不影响是否能申领。
5. 前端不得自行重算评分或硬闸口；只消费后端返回的 `score`、`rating`、`gateSummary`。

## 9. Tests And Checks

Required:

- `corepack pnpm nx run poms-api:migration-up`
- `corepack pnpm nx run poms-api:migration-check`
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`
- `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=lead-workflow`
- `corepack pnpm nx run poms-api:openapi`
- `corepack pnpm nx run shared-api-client:generate`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`
- `corepack pnpm nx build poms-api`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md:check`
- `git diff --check`

## 10. Exceptions

| ID                         | Level | Area                   | Owner | Cleanup Due                 | Decision                                              |
| -------------------------- | ----- | ---------------------- | ----- | --------------------------- | ----------------------------------------------------- |
| `EX47-E1-NO-AI-SCORING`    | `E1`  | Lead scoring           | Codex | Future intelligence slice   | 第一版使用 deterministic rule，不引入 AI 或外部画像。 |
| `EX47-E2-NO-SCORE-HISTORY` | `E1`  | Lead score audit       | Codex | Future score audit slice    | 本片只存当前评分，不建评分历史版本链。                |
| `EX47-E3-SCORE-NOT-A-GATE` | `E1`  | Lead conversion policy | Codex | Future scoring policy slice | 评分不作为转项目硬闸口，只做优先级参考。              |

## 11. G1 Decision

`EX-47` 可以进入实现。实施顺序为 migration/entity -> scoring/gate helper -> shared contracts/API DTO -> mapper/query/service -> OpenAPI/generated client -> admin UI -> focused tests。

## 12. G4 Closeout

Status: `Done`

Delivered:

1. `poms.lead` 新增 deterministic `score` / `rating` / `score_reason` / `score_updated_at`，迁移对既有数据完成回填，并通过实体一致性校验。
2. 后端统一 `lead-scoring` helper，评分评级、确认有效 gate、转项目 gate 使用同一套事实缺口定义。
3. `LeadSummary` / `LeadListView` / `LeadDetailView` 暴露评分、评级、评分说明、评分更新时间和 `LeadGateSummary`，`GET /leads` 支持 `rating` 筛选。
4. Admin 线索列表支持评级筛选与评分列，详情和确认 / 转项目弹窗展示后端返回的 gate 解释。
5. OpenAPI 和 `libs/shared/api-client` 已重新生成并校验同步。

Validation evidence:

- `corepack pnpm nx run poms-api:migration-up` passed; migration applied to local development database.
- `corepack pnpm nx run poms-api:migration-check` passed.
- `corepack pnpm nx lint poms-api` passed.
- `corepack pnpm nx lint poms-admin` passed.
- `corepack pnpm nx build poms-api` passed.
- `corepack pnpm nx build poms-admin` passed with existing initial bundle budget warning.
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead` passed, 3 suites / 29 tests.
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list` passed, 1 suite / 14 tests.
- `corepack pnpm nx run shared-api-client:check` passed; OpenAPI generator `propertyNames` warnings are existing tool noise and produced no client diff.
- `corepack pnpm nx e2e poms-api-e2e --testPathPatterns=lead-workflow` passed, 1 suite / 2 tests.
- `corepack pnpm run format:md:check` passed.
- `git diff --check` passed.

Known notes:

1. A first e2e attempt used singular `testPathPattern` and timed out at 240 seconds; rerun with `testPathPatterns=lead-workflow` passed.
2. Scoring remains advisory by design; hard gates remain status and required fact completeness.
