# EX-43 Lead Source And Profile Enrichment G1 Baseline

- Task ID: `EX-43`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-43`
- Public route surface: yes
- Status: `G1`

## 1. Scope

本片把当前最小线索事实源推进为可上线的第一批线索治理能力:

1. 新增 `LeadSource` 来源字典，提供来源列表、创建和停用/启用维护 API。
2. 将 `Lead.sourceChannel` 从自由输入收敛为来源字典快照，新增 `Lead.sourceId` 绑定当前来源主数据。
3. 扩充线索核心字段: 需求描述、预算状态、预计金额、紧迫程度、预计决策日期。
4. 登记线索时必须选择来源并填写需求描述、预算状态、紧迫程度。
5. 确认有效和转项目前执行基础硬闸口: 来源、需求、预算、预计金额、负责人必须满足最低条件。
6. 前端线索登记表单改为来源下拉和核心字段输入，并提供最小来源维护入口。

## 2. Out Of Scope

1. 不实现公共池、申领、主管分配或释放回池。
2. 不实现跟进记录时间线；后续用 `LeadFollowUpRecord` 独立切片承接。
3. 不实现评分评级或 BANT checklist；本片只落基础字段和硬闸口。
4. 不实现来源物理删除 API；已引用来源只能停用，未引用来源也先通过状态治理。
5. 不改变 `Lead -> Project` 的路由形态和状态机，仍保持 `registered -> qualified -> converted/closed`。

## 3. SSOT

| Concern              | Source Of Truth               | Rule                                                   |
| -------------------- | ----------------------------- | ------------------------------------------------------ |
| Lead source identity | `lead_source.id`              | 新建线索必须绑定有效来源 ID。                          |
| Lead source display  | `lead.source_channel`         | 线索保存来源名称快照，来源后续改名不改写历史线索。     |
| Source lifecycle     | `lead_source.status`          | `active` 可用于新线索，`inactive` 仅保留历史引用。     |
| Demand description   | `lead.demand_description`     | 记录客户需求摘要，是确认有效和转项目前置条件。         |
| Budget status        | `lead.budget_status`          | `unknown` / `no-budget` 不得确认有效和转项目。         |
| Estimated amount     | `lead.estimated_amount`       | 金额用 `numeric(18,2)` 存储，contract 用 string 表达。 |
| Urgency              | `lead.urgency`                | 固定枚举 `low / normal / high / critical`。            |
| Date semantics       | `lead.expected_decision_date` | 业务日期，不含时间和时区。                             |

## 4. API Boundary

| Capability             | Route                               | Request                       | Response            | Guard                        |
| ---------------------- | ----------------------------------- | ----------------------------- | ------------------- | ---------------------------- |
| `listLeadSources`      | `GET /lead-sources`                 | `LeadSourceListQuery`         | `LeadSourceList`    | `lead:read`                  |
| `createLeadSource`     | `POST /lead-sources`                | `CreateLeadSourceRequest`     | `LeadSourceSummary` | `lead:source:manage`         |
| `updateLeadSource`     | `PATCH /lead-sources/{id}`          | `UpdateLeadSourceRequest`     | `LeadSourceSummary` | `lead:source:manage`         |
| `createLead`           | `POST /leads`                       | `CreateLeadRequest`           | `LeadSummary`       | `lead:write`                 |
| `updateLead`           | `PATCH /leads/{id}`                 | `UpdateLeadRequest`           | `LeadSummary`       | `lead:write`                 |
| `qualifyLead`          | `POST /leads/{id}:qualify`          | `QualifyLeadRequest`          | `LeadSummary`       | `lead:write`                 |
| `convertLeadToProject` | `POST /leads/{id}:convertToProject` | `ConvertLeadToProjectRequest` | `ProjectSummary`    | `lead:write + project:write` |

## 5. Persistence Boundary

### New Table

`poms.lead_source`

- `id`
- `code`
- `name`
- `description`
- `status`
- `sort_order`
- `row_version`
- `created_at / created_by / updated_at / updated_by`

### Existing Table

`poms.lead`

- add `source_id` FK to `lead_source`
- keep `source_channel` as source name snapshot
- add `demand_description`
- add `budget_status`
- add `estimated_amount`
- add `urgency`
- add `expected_decision_date`

## 6. Seed Data

本片在 migration 中初始化以下来源:

- `customer-visit` / 客户拜访
- `customer-referral` / 老客户转介绍
- `website-inquiry` / 官网/线上咨询
- `event` / 展会/活动
- `partner` / 合作伙伴
- `bid-notice` / 招投标公告
- `existing-customer-expansion` / 存量客户增购
- `other` / 其他

## 7. Frontend Boundary

1. 线索登记弹窗新增来源、需求描述、预算状态、预计金额、紧迫程度和预计决策日期。
2. 线索表格展示来源、预算状态、预计金额、紧迫程度。
3. 线索详情展示核心字段和基础硬闸口事实。
4. 具备 `lead:source:manage` 的用户可在来源维护弹窗新增来源或切换启停状态。

## 8. Tests And Checks

Required:

- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead`
- `corepack pnpm nx e2e poms-api-e2e --testPathPattern=lead-workflow`
- `corepack pnpm nx run poms-api:openapi`
- `corepack pnpm nx run shared-api-client:generate`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm nx run poms-api:migration-check`

## 9. Exceptions

| ID                             | Level | Area                    | Owner | Cleanup Due            | Decision                                                   |
| ------------------------------ | ----- | ----------------------- | ----- | ---------------------- | ---------------------------------------------------------- |
| `EX43-E1-LEAD-SCORE-DEFERRED`  | `E1`  | Lead scoring            | Codex | Future scoring slice   | 本片只做基础硬闸口，不做评分评级和 component score。       |
| `EX43-E2-PUBLIC-POOL-DEFERRED` | `E2`  | Lead ownership workflow | Codex | Future lead pool slice | 公共池、申领和主管分配需要权限和审计单独建模，本片不混入。 |

## 10. G1 Decision

`EX-43` 可以进入实现。实现顺序为 migration/entity -> shared contract/API DTO -> controller/service/query -> generated client -> admin UI -> focused tests。
