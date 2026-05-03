# EX-58C 配置型枚举字典化治理与运行时落地收口

- Task ID: `EX-58C`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58C`
- Public route surface: added `GET /dictionaries`, `POST /dictionaries`, `PATCH /dictionaries/{id}`.
- Status: `G4`
- G4 Date: 2026-05-03

## 1. Delivered Scope

本片完成配置型枚举从硬编码 enum 到运行时字典的 direct cutover：

1. 新增 `dictionary_item` 通用字典表、实体、仓储、服务、控制器和模块，覆盖 `attachment-category`、`sales-follow-up-type`、`expense-category`。
2. 新增 shared contracts、API DTO、OpenAPI 和 generated client 的 dictionary query / create / update contract。
3. 将附件分类、销售跟进类型、费用分类改为字典 code 字符串，并在 API 写入 / 更新时校验 active dictionary item。
4. 移除对应 DB enum check constraint，保留业务字段为稳定 code；新增默认 seed、排序、启停和 usageCount 查询。
5. Admin 附件面板和销售跟进面板改为从后端字典读取选项，不再本地维护附件分类和跟进方式 enum / label 集合。
6. 已执行本地开发库 `migration-up`，并通过 `migration-check`。

本片不提供物理删除 API，不做旧值兼容映射、双写、运行时 fallback，也不把开放文本字段误纳入字典。

## 2. Drift Handling

| Drift                                                                               | Classification            | Resolution                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Admin parent component specs override child providers and missed `DictionaryStore`. | `new-real-drift`          | Added root test doubles for `DictionaryStore` in host specs while keeping component-level providers. |
| API service unit specs missed new dictionary validation dependency.                 | `new-real-drift`          | Added `DictionaryService.requireActiveItem` mocks to affected service specs.                         |
| Lead conversion attachment exclusion expected old snake_case category.              | `new-real-drift`          | Updated expectation to canonical `internal-assessment` code.                                         |
| Admin build reports initial bundle budget warning.                                  | `existing-baseline-drift` | Build passes; warning predates this slice and is outside EX-58C scope.                               |

## 3. Validation Evidence

| Check                                             | Result                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| `corepack pnpm nx build shared-contracts`         | Passed                                              |
| `corepack pnpm nx run poms-api:openapi`           | Passed                                              |
| `corepack pnpm nx run shared-api-client:generate` | Passed                                              |
| `corepack pnpm nx run shared-api-client:check`    | Passed                                              |
| `corepack pnpm nx build poms-api`                 | Passed                                              |
| `corepack pnpm nx build poms-admin`               | Passed, with existing initial bundle budget warning |
| `corepack pnpm nx lint poms-api`                  | Passed                                              |
| `corepack pnpm nx lint poms-admin`                | Passed                                              |
| `corepack pnpm nx test poms-api`                  | Passed, 46 suites / 561 tests                       |
| `corepack pnpm nx test poms-admin --watch=false`  | Passed, 29 suites / 164 tests                       |
| `corepack pnpm nx run poms-api:migration-up`      | Passed on local development database                |
| `corepack pnpm nx run poms-api:migration-check`   | Passed                                              |

## 4. G4 Conclusion

- Gate Status: `Pass`
- Delivered boundary matches the `EX-58C` baseline.
- Runtime dictionary values are authoritative for new attachment category, sales follow-up type and expense category writes.
- This slice is safe as an input for `FE-53` dictionary management UI and `EX-59` enum regression scanning.
- Parent `EX-58` remains open until `EX-58D` core status history governance is completed.
