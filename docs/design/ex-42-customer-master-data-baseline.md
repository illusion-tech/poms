# EX-42 Customer Master Data G1 Baseline

- Task ID: `EX-42`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-42`
- Public route surface: yes
- Status: `G1`

## 1. Scope

本片把客户从 `Lead / Project / Contract` 上的自由文本字段提升为第一类主数据对象，并完成最小可上线闭环:

1. 新增 `Customer` 主档与 `CustomerAlias` 别名表。
2. 新增客户列表、详情、创建、基础更新、别名查询与别名创建 API。
3. 将 `Lead.customerId` 纳入正式链路，`Lead -> Project` 转化继承客户身份。
4. 将 `Project.customerId` 从预留业务引用升级为正式客户 FK。
5. 前端新增最小客户管理入口，并把线索登记、项目创建改为选择 / 创建客户后再提交。

## 2. Out Of Scope

1. 不实现客户联系人完整生命周期；联系人作为后续 `CustomerContact` 切片。
2. 不实现客户合并运行时命令；本片只冻结 future boundary，保留 `merged_into_customer_id`。
3. 不实现集团 / 子公司层级、付款方、最终用户等多 party 建模。
4. 不改变合同签约主体语义；合同继续默认读取项目客户，合同侧独立签约主体留给后续切片。
5. 不强制历史脏数据全自动归并；当前尚未上线，迁移按现有开发数据去重回填。

## 3. SSOT

| Concern | Source Of Truth | Rule |
| --- | --- | --- |
| Customer identity | `customer.id` | `customerId` 表示客户身份，不能由名称推断替代。 |
| Customer display name | `customer.display_name` | 新建业务对象时以当前客户展示名写入快照。 |
| Historical snapshot | `lead.customer_name` / `project.customer_name` | 表达业务发生时的客户名称快照，保留审计价值。 |
| Alias matching | `customer_alias.normalized_name` | 只作为搜索和去重辅助，不自动合并客户。 |
| Lead -> Project inheritance | `Lead.customerId` | 转项目时 Project 必须继承 Lead 的客户身份。 |
| Project bootstrap | `CreateProjectRequest.customerId` | 直接项目创建仅作为受控 bootstrap，仍必须绑定客户。 |

## 4. Persistence Boundary

### New Tables

`poms.customer`

- `id`
- `customer_no`
- `display_name`
- `legal_name`
- `short_name`
- `status`
- `owner_org_id`
- `owner_user_id`
- `source_channel`
- `remark`
- `merged_into_customer_id`
- `row_version`
- `created_at / created_by / updated_at / updated_by`

`poms.customer_alias`

- `id`
- `customer_id`
- `alias_name`
- `alias_type`
- `normalized_name`
- `is_primary`
- `created_at / created_by`

### Existing Tables

- `lead.customer_id` 新增并回填，后续新建必须非空。
- `project.customer_id` 加正式 FK，并回填现有开发数据。
- `lead.customer_name` 与 `project.customer_name` 保留为快照字段。

## 5. API Boundary

| Capability | Route | Request | Response | Guard |
| --- | --- | --- | --- | --- |
| `listCustomers` | `GET /customers` | `CustomerListQuery` | `CustomerList` | `customer:read` |
| `getCustomer` | `GET /customers/{id}` | path `id` | `CustomerDetailView` | `customer:read` |
| `createCustomer` | `POST /customers` | `CreateCustomerRequest` | `CustomerSummary` | `customer:write` |
| `updateCustomer` | `PATCH /customers/{id}` | `UpdateCustomerRequest` | `CustomerDetailView` | `customer:write` |
| `listCustomerAliases` | `GET /customers/{id}/aliases` | path `id` | `CustomerAliasList` | `customer:read` |
| `createCustomerAlias` | `POST /customers/{id}/aliases` | `CreateCustomerAliasRequest` | `CustomerAliasSummary` | `customer:write` |

Existing DTO changes:

- `CreateLeadRequest.customerId` required.
- `LeadSummary / LeadListView / LeadDetailView` include `customerId`.
- `CreateProjectRequest.customerId` required.
- `UpdateLeadRequest` may change `customerId` before conversion; service rewrites `customerName` snapshot from selected customer.
- `UpdateProjectBasicInfoRequest` no longer accepts arbitrary `customerName` as identity; it may carry `customerId` for active / blocked project bootstrap correction and rewrites snapshot.

## 6. Frontend Boundary

Minimum shipped UI:

1. `/customers` list with search, status filter, create dialog, and detail dialog.
2. Lead registration uses customer selector and inline customer create.
3. Project create dialog uses customer selector and inline customer create.
4. Lead / Project tables continue displaying snapshot `customerName`.

## 7. Tests And Checks

Required:

- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=customer|lead|project`
- `corepack pnpm nx run poms-api:openapi`
- `corepack pnpm nx run shared-api-client:generate`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- focused admin component tests for customer list / lead create / project create if current harness permits
- `corepack pnpm nx run poms-api:migration-check`

If full matrix is too slow locally, G3 may record an explicit `E1` for deferred broad E2E; API / contract / migration checks are not optional.

## 8. Exceptions

| ID | Level | Area | Owner | Cleanup Due | Decision |
| --- | --- | --- | --- | --- | --- |
| `EX42-E1-CONTRACT-PARTY-DEFERRED` | `E1` | Contract party modeling | Codex | Future contract party slice | 本片不建合同签约主体 / 付款方 / 最终用户多 party 模型；合同继续通过 Project 客户投影展示。 |
| `EX42-E2-MERGE-COMMAND-DEFERRED` | `E2` | Customer merge | Codex | Future customer dedupe slice | 本片保留 `merged_into_customer_id` 与 alias 基础能力，不提供客户合并命令。 |

## 9. G1 Decision

`EX-42` 可以进入实现。实现必须先落 migration / entity，再接 contracts / controller / generated client，最后接前端入口。任何新增 public route 必须保持 `api-route-canonical-inventory.md` 中的 canonical path。
