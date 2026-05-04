# EX-62 Customer Contact Gender G1 Baseline

- Gate Status: `Pass`
- Parent: Sales intelligence contact enrichment
- Owner: `Codex`
- Slice Type: `cross-layer`
- G1 Reviewer: User request in current workspace thread
- G1 Date: 2026-05-04
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-62`

## 1. Scope

本片在 `CustomerContact` 补充联系人性别字段，用于销售电话沟通时的基础称呼判断。

Included:

1. 新增 `CustomerContactGender` shared enum，值限定为 `unknown` / `male` / `female`。
2. `customer_contact` 新增 `gender` 字段，默认 `unknown`，非空并带 DB check constraint。
3. 扩展 `CustomerContactSummary`、`CreateCustomerContactRequest`、`UpdateCustomerContactRequest`。
4. 后端 create / update / list 映射 `gender`。
5. OpenAPI / generated client / admin-data-access 同步。
6. Admin 销售情报联系人表单新增性别选择，并在联系人卡片展示。
7. 回写 focused 后端 / 前端测试。

Out of scope:

1. 不采集年龄、婚姻、籍贯、家庭、爱好、个人习惯等画像字段。
2. 不把性别纳入销售情报缺口、评分、胜率、提醒或强制推进规则。
3. 不改变客户联系人、机会关系人或业务讨论的 public route path。
4. 不新增联系人批量维护或删除能力。

## 2. Privacy Boundary

- `gender` 属于联系人个人信息，应仅用于业务沟通称呼辅助。
- 字段可选；创建时未选择则写入 `unknown`。
- 前端展示为业务标签，不做私人画像或自动决策输入。
- 历史数据迁移默认 `unknown`，不推断、不回填。

## 3. SSOT

| Concern             | Source Of Truth                     | Rule                                           |
| ------------------- | ----------------------------------- | ---------------------------------------------- |
| Enum values         | `CustomerContactGender` definitions | `unknown` / `male` / `female` only.            |
| DB value constraint | Migration + entity check            | `gender` non-null default `unknown`.           |
| Contract            | Shared contracts                    | Summary required; create / update optional.    |
| UI labels / options | Shared enum metadata                | Admin consumes generated enum + shared labels. |
| Route surface       | Existing EX-61 inventory rows       | No new or changed public route path.           |

## 4. Interface Boundary

Existing routes remain unchanged:

- `GET /customer-contacts`
- `POST /customer-contacts`
- `PATCH /customer-contacts/{id}`

Contract changes:

- `CustomerContactSummary.gender: CustomerContactGender`
- `CreateCustomerContactRequest.gender?: CustomerContactGender`
- `UpdateCustomerContactRequest.gender?: CustomerContactGender`

## 5. Persistence Boundary

Migration:

- Add `poms.customer_contact.gender varchar(32) not null default 'unknown'`.
- Add `chk_customer_contact_gender`.
- Add column comment `联系人性别，用于业务称呼辅助`.

Entity:

- `CustomerContact.gender: CustomerContactGender`
- default `CustomerContactGenderValue.Unknown`

## 6. Admin UI Boundary

`SalesIntelligencePanel`:

- 新增联系人表单增加性别下拉。
- 联系人卡片在姓名 / 状态旁展示性别标签。
- 默认值为 `unknown`。
- 不在联系人列表空态、关系人选择文案或缺口计算中推断性别。

## 7. Required Checks

- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx build poms-api`
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-intelligence.service`
- `corepack pnpm nx run poms-api:migration-up`
- `corepack pnpm nx run poms-api:migration-check`
- `corepack pnpm nx run shared-api-client:generate`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md:check`
- `git diff --check`

## 8. G1 Decision

`EX-62` 可以进入实现。实施顺序为 shared enum / contracts -> migration / entity -> service mapping -> OpenAPI / client -> admin data-access export -> Admin UI -> focused tests -> validation -> G4 closeout。

## 9. G4 Closeout

Gate Status: `Pass`

Delivered:

1. Shared contracts 新增 `CustomerContactGender` metadata SSOT，`CustomerContactSummary` 必填返回 `gender`，create / update request 可选提交。
2. `customer_contact.gender` 已通过 migration、entity default 和 `chk_customer_contact_gender` 固定为 `unknown` / `male` / `female`。
3. `SalesIntelligenceService` create / update / summary 映射已支持 `gender`，历史数据默认 `unknown`。
4. OpenAPI 与 generated client 已同步，Admin data-access 已 re-export generated `CustomerContactGender`。
5. Admin 销售情报联系人表单新增性别下拉，联系人卡片展示性别标签；不改变缺口计算、评分或私人画像边界。
6. 已补 focused API / Admin tests 覆盖性别写入与展示。

Validation:

- `corepack pnpm nx run shared-api-client:generate`
- `corepack pnpm nx run shared-api-client:check`
- `corepack pnpm nx test poms-api --runInBand --testPathPatterns=sales-intelligence.service`
- `corepack pnpm nx lint poms-api`
- `corepack pnpm nx build poms-api`
- `corepack pnpm nx run poms-api:migration-up`
- `corepack pnpm nx run poms-api:migration-check`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run check:enum-like-strings`

Known note:

- `poms-admin` build 仍有既有 initial bundle budget warning，本片未扩大 budget 配置。
