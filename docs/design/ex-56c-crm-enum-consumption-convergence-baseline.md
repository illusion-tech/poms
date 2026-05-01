# EX-56C CRM Enum Consumption Convergence 实施基线包

- Gate Status: `Pass`
- Parent: `EX-56`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-01`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-56C`

## 1. 范围

- 本次目标:
  - 将客户、线索、附件、销售跟进域已有 enum 的运行时使用收口到 `shared-contracts` value object 或 generated client enum。
  - 为当前缺少 value object 的 CRM 枚举补齐 `*Value` 常量，作为后端写入、比较和 entity check 的单一事实源。
  - 替换客户、线索、附件、销售跟进服务和 repository 中关键状态 / 类型 / 分类裸字符串。
  - 替换 Admin 客户 / 线索 / 附件 / 销售跟进入口中的 `as Type` 默认值、状态比较和 generated enum 可消费导出。
  - 确认现有 DB check、entity check、OpenAPI enum 和 generated client enum 一致。
- 本次明确不做:
  - 不新增、删除或改名 public API route。
  - 不改变 `Customer`、`Lead`、`Attachment`、`SalesFollowUpRecord` 的业务状态机。
  - 不收窄开放文本字段，例如 `sourceChannel`、`description`、`remark`、`summary`。
  - 不治理财务、提成、合同、项目成本等状态字段，这些继续由 `EX-56D` 和后续 FE 切片承接。
  - 不把测试 fixture 中全部业务状态样例强制替换为 enum；只处理会影响生产代码一致性的断言和 helper。
- 下游可依赖的交付边界:
  - CRM 域状态 / 类型 / 分类从 shared contract 到 entity / DB check / OpenAPI / generated client / Admin 基础消费一致。
  - 后端关键写入路径不再手写 CRM enum-like 字符串。
  - Admin data-access 为 CRM generated enum 提供统一 value export。

## 2. 正式输入

| Input Type                | Document / Source                                               | Section / Anchor                     | Status | Notes                                                                  |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------ | ------ | ---------------------------------------------------------------------- |
| Business design           | `docs/design/ex-56-domain-enum-literal-governance-baseline.md`  | Downstream slicing / `EX-56C`        | Active | 冻结客户、线索、附件、销售跟进为 CRM enum 使用收口域。                 |
| Customer implementation   | `apps/poms-api/src/app/features/customer`                       | service / entity                     | Active | 已有 CustomerStatus / CustomerAliasType schema，运行时代码仍有字面量。 |
| Lead implementation       | `apps/poms-api/src/app/features/lead`                           | service / query / scoring / entity   | Active | 已有 LeadStatus / LeadBudgetStatus / LeadUrgency / LeadRating 等。     |
| Attachment implementation | `apps/poms-api/src/app/features/attachment`                     | service / repository / entity        | Active | 已有 AttachmentCategory / Security / Status / Target / Relation。      |
| Follow-up implementation  | `apps/poms-api/src/app/features/sales-follow-up`                | service / repository / entity        | Active | 已有跟进类型、结果、状态和 lifecycle scope。                           |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`             | Customer / Lead / Attachment / Sales | Active | enum schema 已存在，本片补 value object 并复用到实现。                 |
| Frontend consumption      | `libs/admin/data-access` and `apps/poms-admin/src/app/features` | CRM stores / pages / shared panels   | Active | 前端应消费 generated enum，而不是本地 `as Type` 字面量。               |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                  | CRM routes                           | N/A    | route surface 不变。                                                   |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                   | route grammar                        | Active | route surface 不变。                                                   |

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                    | Implementation Rule                                                            |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Customer state            | `CustomerStatusValue` / `CustomerAliasTypeValue`                                        | 后端写入和比较使用 value object；前端消费 generated `CustomerStatus` 等 enum。 |
| Lead state and gates      | `LeadStatusValue`、`LeadBudgetStatusValue`、`LeadUrgencyValue`、`LeadRatingValue`       | 后端状态机比较和评分规则使用 value object。                                    |
| Lead source and ownership | `LeadSourceStatusValue`、`LeadOwnershipScopeValue`、`LeadOwnerAssignmentTypeValue`      | 查询和负责人变更动作使用 value object / generated enum。                       |
| Attachment registry       | `AttachmentCategoryValue`、`AttachmentStatusValue`、`AttachmentTargetTypeValue` 等      | entity check、repository filter、service defaults 使用同一常量。               |
| Sales follow-up lifecycle | `SalesFollowUpTypeValue`、`SalesFollowUpOutcomeValue`、`SalesFollowUpRecordStatusValue` | 记录创建、替代、作废和默认查询使用 value object。                              |
| Public route surface      | ADR-015 / route inventory                                                               | 本片不改 route。                                                               |
| Open text fields          | existing schemas                                                                        | 继续保持 string，不枚举化。                                                    |

## 4. 命令与接口边界

| Route / Controller                   | Command / Service                          | Request / Response Contract | Guard / Permission | Result                  |
| ------------------------------------ | ------------------------------------------ | --------------------------- | ------------------ | ----------------------- |
| existing customer routes             | `CustomerService`                          | Customer schemas            | existing guards    | route unchanged         |
| existing lead and lead-source routes | `LeadService` / `LeadQueryService`         | Lead schemas                | existing guards    | route unchanged         |
| existing attachment routes           | `AttachmentService`                        | Attachment schemas          | existing guards    | route unchanged         |
| existing sales follow-up routes      | `SalesFollowUpService` / repository sync   | Sales follow-up schemas     | existing guards    | route unchanged         |
| Admin customer / lead pages          | generated client through admin-data-access | generated enum exports      | frontend only      | enum consumption update |
| shared attachment / follow-up panels | generated client through admin-data-access | generated enum exports      | frontend only      | enum consumption update |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing customer, lead, attachment and sales-follow-up routes only.
- Current implemented route(s): existing routes only.
- Inventory status: unchanged.
- Blocker / exception: N/A; no route surface change.

## 5. 持久化边界

| Table                               | Entity                      | Enum Fields                                    | Expected Result                |
| ----------------------------------- | --------------------------- | ---------------------------------------------- | ------------------------------ |
| `poms.customer`                     | `Customer`                  | `status`                                       | use shared value object checks |
| `poms.customer_alias`               | `CustomerAlias`             | `alias_type`                                   | type/default use value object  |
| `poms.lead_source`                  | `LeadSource`                | `status`                                       | use shared value object checks |
| `poms.lead`                         | `Lead`                      | `status`, `budget_status`, `urgency`, `rating` | use shared value object checks |
| `poms.lead_owner_assignment_record` | `LeadOwnerAssignmentRecord` | `assignment_type`                              | use shared value object checks |
| `poms.attachment`                   | `Attachment`                | `category`, `security_level`, `status`         | use shared value object checks |
| `poms.attachment_link`              | `AttachmentLink`            | `target_type`, `relation_type`, `status`       | use shared value object checks |
| `poms.sales_follow_up_record`       | `SalesFollowUpRecord`       | `follow_up_type`, `outcome`, `status`          | use shared value object checks |

### 5.1 开发库取值证据

`2026-05-01` 用 `D:\Program Files\PostgreSQL\17\bin\psql.exe` 只读查询开发库:

- `customer.status`: `active=70`
- `customer_alias.alias_type`: `alias=70`
- `lead_source.status`: `active=8`
- `lead.status`: `registered=22`, `qualified=1`, `converted=45`, `closed=1`
- `lead.budget_status`: `unknown=17`, `rough-budget=11`, `budget-confirmed=41`
- `lead.urgency`: `normal=28`, `high=41`
- `lead.rating`: `A=41`, `B=11`, `D=17`
- `lead_owner_assignment_record.assignment_type`: `claimed=11`, `assigned=10`
- `sales_follow_up_record.follow_up_type`: `meeting=13`, `email=7`
- `sales_follow_up_record.outcome`: `progress=20`
- `sales_follow_up_record.status`: `active=8`, `superseded=7`, `voided=5`
- `attachment` / `attachment_link`: 当前无数据行；以 entity / migration 既有 check 和代码候选值为准。

## 6. 一致性结论

- Document -> code: `EX-56` 要求 CRM 域 enum 使用收敛；本片范围与 tracker 一致。
- ADR-015 inventory -> route: 不变更 route，无 route governance blocker。
- Entity -> contract: 需要把 entity check 字符串替换为 shared const array 生成的 SQL 表达式。
- Service -> entity: 创建、更新、状态机比较必须使用 shared value object。
- OpenAPI / generated client: enum schema 本身不改语义；若生成文件无差异，记录为 expected no-op。
- Admin consumption: data-access re-export generated enum values，页面和 shared panels 消费 generated enum。

## 7. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                              | Result | Gap / Reason                                                                                                                     |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`                                                 | Passed |                                                                                                                                  |
| Build                            | Yes      | `corepack pnpm nx build shared-contracts`; `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                               | Passed | Admin build reports existing bundle budget warning: initial total 1.01 MB, over 1.00 MB by 12.72 kB.                             |
| Focused backend tests            | Yes      | `corepack pnpm nx test poms-api --runInBand --runTestsByPath src/app/features/customer/customer.service.spec.ts src/app/features/lead/lead.service.spec.ts ...` | Passed | 6 suites / 47 tests.                                                                                                             |
| Focused frontend tests           | Yes      | customer list, lead list, attachment panel, sales-follow-up panel specs                                                                                         | Passed | Multi-path command executed `lead-list` only; single-path retries exercised the full Admin suite under current Jest/Nx behavior. |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`; `corepack pnpm nx test poms-admin --runInBand`                                                                    | Passed | API: 46 suites / 561 tests. Admin: 28 suites / 161 tests.                                                                        |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`                                                               | Passed | Generated client check reports fully synchronized.                                                                               |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`; psql constraint/default verification                             | Passed | Added `chk_customer_alias_type`; added attachment / attachment_link status defaults; schema check has no diff.                   |
| Markdown                         | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`                                                                                              | Passed |                                                                                                                                  |
| Whitespace                       | Yes      | `git diff --check`                                                                                                                                              | Passed |                                                                                                                                  |

## 8. 例外与风险

| Exception ID                       | Level | Scope                               | Approved By | Cleanup Owner | Cleanup Due | Notes                                              |
| ---------------------------------- | ----- | ----------------------------------- | ----------- | ------------- | ----------- | -------------------------------------------------- |
| `EX56C-E1-FIXTURE-LITERALS`        | Low   | test fixture enum literals          | Codex       | `EX-57`       | G1          | 测试样例保留部分字面量，生产代码优先收口。         |
| `EX56C-E2-OPEN-TEXT-FIELDS`        | Low   | `sourceChannel`, text descriptions  | Codex       | N/A           | N/A         | 属于开放文本，不纳入枚举治理。                     |
| `EX56C-E3-ADMIN-BROAD-SWEEP-DEFER` | Low   | non-CRM Admin enum-like display map | Codex       | `FE-52`       | Future      | 本片只处理客户、线索、附件和销售跟进相关前端消费。 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-01`
- Conditions:
  - 不新增 public route。
  - 不改变现有 enum 值集合和业务状态机。
  - 生产代码中的 CRM 状态 / 类型 / 分类比较应使用 shared value object 或 generated enum。
  - generated client 如有变化必须由 OpenAPI 生成，不手工编辑。

## 10. G3 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-01`
- Drift Classification:
  - `new-real-drift`: `attachment.status` 与 `attachment_link.status` entity defaults 已存在但 DB 无默认值；通过 `Migration20260501170000_ex56c_attachment_status_defaults` 修复。
  - `expected-alignment`: `customer_alias.alias_type` 由本片补充 `chk_customer_alias_type`，与 shared enum / entity check 对齐。
  - `tool-noise`: OpenAPI generator 仍提示既有 `propertyNames` warning；client check 通过，无 generated drift。
- Completion Boundary:
  - CRM production code enum consumption has moved to shared value objects on API side and generated enums on Admin side.
  - No public route surface changed.
  - No CRM business state machine changed.
  - G4 remains blocked only on code commit.
