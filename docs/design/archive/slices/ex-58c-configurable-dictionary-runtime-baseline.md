# EX-58C 配置型枚举字典化治理与运行时落地基线

- Gate Status: `Pass`
- Parent: `EX-58`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-05-03
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-58C`

## 1. 范围

- 本次目标:
  1. 新增通用业务字典事实源 `dictionary_item`，覆盖 `attachment-category`、`sales-follow-up-type`、`expense-category` 三类可运营维护选项。
  2. 提供 `GET /dictionaries`、`POST /dictionaries`、`PATCH /dictionaries/{id}` 三个公共 API；不提供物理删除，删除需求以停用表达。
  3. 将附件分类、销售跟进类型、费用分类从硬 enum contract / DB check 改为字典 code 字符串，并在写入 / 更新时校验 active dictionary item。
  4. 初始化当前高频默认字典项，保留引用中的旧 code 为稳定业务事实；已被引用的停用项仍可读，不可作为新写入选项。
  5. Admin 只做必要字典选项消费，避免继续本地伪造附件分类和跟进类型选项；完整字典管理页由 `FE-53` 承接。
- 本次明确不做:
  1. 不把开放文本字段如项目技术成本 `costCategory`、付款 / 应付 `costCategory` 硬纳入字典。
  2. 不合并 `lead_source`；线索来源已是独立字典事实源，继续保持当前模型。
  3. 不提供物理删除 API；引用保护以 `status=inactive` + 新写入禁止表达。
  4. 不新增目录树、层级字典、外部编码映射或多语言能力。
- 下游可依赖的交付边界:
  - 业务配置型选项有统一 `domain + code` 字典表、查询 API、管理 API、seed、排序、停用和新写入校验。
  - 附件、销售跟进、费用登记的持久化值只依赖字典 code，不再依赖 shared enum 常量集合。
- 不允许下游依赖的留白:
  - 不能依赖 Admin 已有完整字典管理页面；该入口由 `FE-53` 承接。
  - 不能依赖字典项被物理删除。

## 2. 正式输入

| Input Type                | Document / Source                         | Section / Anchor                   | Status   | Notes                                               |
| ------------------------- | ----------------------------------------- | ---------------------------------- | -------- | --------------------------------------------------- |
| Business design           | `phase2-development-execution-tracker.md` | `EX-58C`                           | Active   | 配置型枚举字典化、seed、排序、停用、引用保护        |
| Command design            | This baseline                             | `4. 命令与接口边界`                | Frozen   | 新增通用 dictionary list/create/update              |
| DTO / OpenAPI design      | This baseline                             | `3. 本次 SSOT`                     | Frozen   | 字典 code 为 string；domain/status 为闭合治理枚举   |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`        | `EX-58C Configurable Dictionaries` | Frozen   | `resource-first`，不使用 slash action               |
| Query boundary            | This baseline                             | `5. 读侧边界`                      | Frozen   | domain 必填或可选查询；默认按 domain/sort/code 排序 |
| Data model / table freeze | This baseline                             | `6. 持久化边界`                    | Frozen   | `dictionary_item`                                   |
| Schema / DDL              | This baseline                             | `6. 持久化边界`                    | Frozen   | 唯一约束、check、索引、seed                         |
| ADR                       | `ADR-014` / `ADR-015`                     | gate model / route grammar         | Accepted | direct cutover，不引入兼容层                        |

## 3. 本次 SSOT

| Concern                     | SSOT                               | Implementation Rule                                                                      |
| --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Business semantics          | `dictionary_item`                  | 配置型选项用 `domain + code` 表达；名称、排序、启停由字典项维护                          |
| Public route canonical path | `api-route-canonical-inventory.md` | `GET /dictionaries`、`POST /dictionaries`、`PATCH /dictionaries/{id}`                    |
| Route / command naming      | This baseline                      | `listDictionaryItems`、`createDictionaryItem`、`updateDictionaryItem`                    |
| DTO / contract naming       | shared contracts                   | `DictionaryItemSummary`、`DictionaryItemListQuery`、`Create/UpdateDictionaryItemRequest` |
| Table / column naming       | migration                          | `dictionary_item.domain/code/name/description/status/sort_order/is_system`               |
| Date / time semantics       | existing timestamp convention      | `createdAt` / `updatedAt` are `datetime`; no business date fields                        |
| Identifier semantics        | internal UUID                      | `id` is system UUID; `code` is stable business option identity inside a domain           |
| Money / decimal semantics   | N/A                                | This slice does not change money fields                                                  |
| Status machine              | `active/inactive`                  | Active can be used for new writes; inactive remains readable for historical references   |

## 4. 命令与接口边界

| Route / Controller         | Command / Service      | Request DTO / Contract        | Response DTO / Contract | Guard / Permission                                                                                          | Design Source | Result    |
| -------------------------- | ---------------------- | ----------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------- | --------- |
| `GET /dictionaries`        | `listDictionaryItems`  | `DictionaryItemListQuery`     | `DictionaryItemList`    | `lead:read` / `customer:read` / `project:read` / `contract:finance:manage` / `platform:dictionaries:manage` | This baseline | G1 frozen |
| `POST /dictionaries`       | `createDictionaryItem` | `CreateDictionaryItemRequest` | `DictionaryItemSummary` | `platform:dictionaries:manage`                                                                              | This baseline | G1 frozen |
| `PATCH /dictionaries/{id}` | `updateDictionaryItem` | `UpdateDictionaryItemRequest` | `DictionaryItemSummary` | `platform:dictionaries:manage`                                                                              | This baseline | G1 frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /dictionaries`、`POST /dictionaries`、`PATCH /dictionaries/{id}`
- Current implemented route(s): same as canonical after implementation
- Inventory status: `aligned`
- Route governance source: `ADR-015` + this baseline
- Blocker / exception: none

## 5. 读侧边界

| Query / View         | Consumer                                      | Fields                                                                            | Filter / Sort                                                  | Permission Boundary      | Design Source | Result    |
| -------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------ | ------------- | --------- |
| `DictionaryItemList` | Admin form options / later dictionary manager | `id/domain/code/name/description/status/sortOrder/isSystem/usageCount/rowVersion` | `domain`、`status`、`keyword`; sort by domain, sortOrder, code | Same as list route guard | This baseline | G1 frozen |

## 6. 持久化边界

| Table                    | Migration            | Entity / Repository                       | DDL / Freeze Source | Check Result                                       |
| ------------------------ | -------------------- | ----------------------------------------- | ------------------- | -------------------------------------------------- |
| `dictionary_item`        | new EX-58C migration | `DictionaryItem` / `DictionaryRepository` | This baseline       | create table + seed                                |
| `attachment`             | new EX-58C migration | `Attachment`                              | This baseline       | drop category enum check, keep indexed string code |
| `sales_follow_up_record` | new EX-58C migration | `SalesFollowUpRecord`                     | This baseline       | drop follow_up_type enum check                     |
| `expense_record`         | new EX-58C migration | `ExpenseRecord`                           | This baseline       | drop expense_category enum check                   |

| Field                                   | Design Type / Meaning                     | Migration / DDL                      | Entity | Shared Contract / OpenAPI   | Result    |
| --------------------------------------- | ----------------------------------------- | ------------------------------------ | ------ | --------------------------- | --------- |
| `dictionary_item.domain`                | closed dictionary domain                  | varchar(64) + check                  | typed  | `DictionaryDomain`          | G1 frozen |
| `dictionary_item.code`                  | stable option code inside domain          | varchar(64), unique with domain      | string | string                      | G1 frozen |
| `dictionary_item.status`                | `active/inactive`                         | varchar(32) + check + default active | typed  | `DictionaryItemStatus`      | G1 frozen |
| `attachment.category`                   | dictionary code in `attachment-category`  | varchar(64), no enum check           | string | `AttachmentCategory` string | G1 frozen |
| `sales_follow_up_record.follow_up_type` | dictionary code in `sales-follow-up-type` | varchar(32), no enum check           | string | `SalesFollowUpType` string  | G1 frozen |
| `expense_record.expense_category`       | dictionary code in `expense-category`     | varchar(32), no enum check           | string | `ExpenseCategory` string    | G1 frozen |

## 7. 一致性结论

- Document -> code: this baseline is the executable input for EX-58C.
- ADR-015 inventory -> route: dictionary routes are added before implementation.
- Migration -> entity: new dictionary table and removed enum checks must match entity metadata.
- Entity -> contract: configurable category/type fields become string code schemas.
- Route -> command: controller delegates to dictionary service only.
- Query -> view: list returns `usageCount` for reference protection hints.
- Guard / permission: management requires `platform:dictionaries:manage`.
- OpenAPI / generated client: must be regenerated; Admin minimal consumers must compile without generated enum imports for dictionaryized fields.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                            | Result  | Gap / Reason                            |
| -------------------------------- | -------- | ------------------------------------------------------------- | ------- | --------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api` / `poms-admin`               | Pending |                                         |
| Build                            | Yes      | `corepack pnpm nx build poms-api` / `poms-admin`              | Pending |                                         |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api` / `poms-admin --watch=false` | Pending |                                         |
| API / integration tests          | No       | Focused unit + schema checks                                  | Pending | No new complex workflow                 |
| E2E                              | No       | Not required for dictionary backend slice                     | Pending | Existing e2e fixtures updated as needed |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi` + `shared-api-client:generate/check`       | Pending |                                         |
| Migration / schema check         | Yes      | `poms-api:migration-up` + `poms-api:migration-check`          | Pending | local dev DB allowed                    |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-05-03
- Conditions:
  - 不加入旧值兼容 / fallback / 双写。
  - 不保留配置型硬 enum 作为写入校验事实源。
  - 不把开放文本字段误纳入字典。
