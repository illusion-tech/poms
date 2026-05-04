# FE-53 Admin 字典选项接入与管理入口基线

- Gate Status: `Pass`
- Parent: `EX-58`
- Owner: `Codex`
- Slice Type: `frontend-focused`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-04`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-53`

## 1. 范围

本片负责把 `EX-58C` 已落地的运行时字典能力完整接入 Admin 前端。

Included:

1. 新增 Admin 路由 `/platform/dictionaries`，受 `platform:dictionaries:manage` 权限保护。
2. 新增平台配置菜单入口“业务字典”，并保持动态导航 SSOT 与前端 route 对齐。
3. 新增字典管理页，覆盖 `attachment-category`、`sales-follow-up-type`、`expense-category` 三个字典域。
4. 支持按字典域、状态、关键字筛选，展示 code、名称、说明、状态、排序、系统项、引用数和版本号。
5. 支持创建非系统字典项，支持编辑名称、说明、排序和启停状态。
6. 保持现有附件面板、销售跟进面板继续从 `DictionaryStore` 读取后端字典选项。
7. 补 route / component / navigation focused tests。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 `dictionary_item` DDL、seed、DB check 或 usageCount 计算。
3. 不实现物理删除、批量导入、层级字典、多语言、外部编码映射。
4. 不把线索来源合并进通用字典；线索来源继续使用独立事实源。
5. 不把开放文本字段误纳入字典。
6. 不新增附件版本、预览、OCR 或评分智能化能力。

## 2. 正式输入

| Input Type           | Document / Source                                               | Status | Notes                                               |
| -------------------- | --------------------------------------------------------------- | ------ | --------------------------------------------------- |
| Dictionary runtime   | `ex-58c-configurable-dictionary-runtime-closeout.md`            | G4     | `dictionary_item`、API、seed、active 写入校验已完成 |
| Code value cutover   | `ex-58b-enum-code-value-direct-cutover-closeout.md`             | G4     | 字典 code 已统一为 kebab-case                       |
| FE enum governance   | `fe-52-admin-enum-consumption-baseline.md`                      | G4     | Admin 不再伪造 closed enum / dictionary             |
| Tracker              | `phase2-development-execution-tracker.md` / `FE-53`             | Active | 后端 generated client 和 dictionary 查询已稳定      |
| Generated client     | `libs/shared/api-client/api/dictionary.service.ts`              | Stable | `list/create/update` 已生成                         |
| Existing data access | `libs/admin/data-access/src/lib/dictionary/dictionary.store.ts` | Active | 当前最小 store 已支持 load/create/update            |

## 3. SSOT

| Concern                | SSOT                               | Implementation Rule                                                |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Dictionary domains     | generated `DictionaryDomain`       | 前端只消费 generated enum，不手写 domain code 集合作为运行时事实源 |
| Dictionary item status | generated `ActiveInactiveStatus`   | 启停只通过 `PATCH /dictionaries/{id}` 更新 status                  |
| Option labels          | `DictionaryItemSummary.name`       | 表单选项、列表显示均从后端返回 name 派生                           |
| Option code            | `DictionaryItemSummary.code`       | code 是稳定业务身份；创建后不在前端编辑                            |
| Usage hints            | `DictionaryItemSummary.usageCount` | 引用数仅提示影响，不作为前端删除能力                               |
| Admin route            | `app.routes.ts`                    | `/platform/dictionaries` guarded by `platform:dictionaries:manage` |
| Menu route             | navigation SSOT + static fallback  | 动态菜单和 fallback 菜单保持同一 link                              |

## 4. 路由与权限边界

| Route / Surface          | Permission                     | Source        | Result    |
| ------------------------ | ------------------------------ | ------------- | --------- |
| `/platform/dictionaries` | `platform:dictionaries:manage` | This baseline | G1 frozen |

No public API route is added or changed in this slice.

## 5. 读写边界

| Operation | Generated API                | UI Behavior                                            | Result    |
| --------- | ---------------------------- | ------------------------------------------------------ | --------- |
| List      | `dictionaryControllerList`   | domain / status / keyword filters, refresh action      | G1 frozen |
| Create    | `dictionaryControllerCreate` | create dialog; requires domain, code, name             | G1 frozen |
| Update    | `dictionaryControllerUpdate` | edit name, description, sortOrder, status with version | G1 frozen |

## 6. 持久化边界

N/A. 本片不触及 migration、entity、DDL 或 seed。

## 7. 测试与校验

| Check               | Required            | Command / Evidence                                                                 | Result |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------- | ------ |
| Admin focused tests | Yes                 | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=dictionary-list`  | Pass   |
| Route tests         | Yes                 | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`       | Pass   |
| API navigation test | Yes                 | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation.service` | Pass   |
| Admin lint          | Yes                 | `corepack pnpm nx lint poms-admin`                                                 | Pass   |
| Admin build         | Yes                 | `corepack pnpm nx build poms-admin`                                                | Pass   |
| API lint            | If nav SSOT touched | `corepack pnpm nx lint poms-api`                                                   | Pass   |
| API build           | If nav SSOT touched | `corepack pnpm nx build poms-api`                                                  | Pass   |
| Enum-like scan      | Yes                 | `corepack pnpm run check:enum-like-strings`                                        | Pass   |
| Markdown            | Yes                 | `corepack pnpm run format:md:check`; `git diff --check`                            | Pass   |
| OpenAPI / migration | No                  | N/A                                                                                | N/A    |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-04`
- Conditions:
  - 只消费 `EX-58C` 既有 dictionary API，不修改后端契约。
  - 前端不得用本地 fallback 伪造可写字典项。
  - 字典项不提供删除；停用是唯一退场表达。

## 10. G4 Closeout

- Gate Status: `Pass`
- Closed By: `Codex`
- Closed At: `2026-05-04`
- Delivered:
  - 新增 `/platform/dictionaries` Admin 路由，使用 `platform:dictionaries:manage` 权限保护。
  - 新增业务字典管理页，支持三个运行时字典域的查询、筛选、创建、编辑和启停。
  - 动态导航 SSOT 与 Admin fallback 菜单均补齐“业务字典”入口。
  - `NavigationItem.type` 新增项消费 shared contract 的 `NavigationItemTypeValue.Basic`，未扩大 enum-like allowlist。
- Validation:
  - `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=dictionary-list`
  - `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`
  - `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation.service`
  - `corepack pnpm nx lint poms-admin`
  - `corepack pnpm nx build poms-admin`
  - `corepack pnpm nx lint poms-api`
  - `corepack pnpm nx build poms-api`
  - `corepack pnpm run check:enum-like-strings`
- No API, OpenAPI, generated client, migration, seed or dictionary runtime change was introduced by FE-53.
