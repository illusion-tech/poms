# EX-70A 线索来源并入业务字典 Direct Cutover 实施基线包

- Gate Status: `G3 Pass / Doing`
- Parent: `EX-58C` / `EX-43`
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: User-approved direct cutover plan
- G1 Date: 2026-05-29
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-70A`

## 1. 范围

- 本次目标: 将线索来源从独立 `lead_source` 资源并入通用 `dictionary_item`，新增 `lead-source` 字典域，并一次性清退旧 API、旧实体、旧字段、旧权限和旧 generated client。
- 本次明确不做: 不保留 `/lead-sources` alias，不做双写，不保留 `LeadSource` DTO / API，不保留 `lead:source:manage`，不保留 `lead.source_id` 或线索域 `source_channel` 快照。
- 下游可依赖的交付边界: `sourceCode` 是 Lead 的唯一来源身份，来源名称来自 `dictionary_item(domain='lead-source', code=sourceCode).name`。
- 不允许下游依赖的留白: 不允许继续依赖 `LeadSourceApi`、`sourceId`、`sourceChannel` 或 `/lead-sources`。

## 2. 正式输入

| Input Type                | Document / Source                                   | Section / Anchor                    | Status  | Notes                                                  |
| ------------------------- | --------------------------------------------------- | ----------------------------------- | ------- | ------------------------------------------------------ |
| Business design           | User-approved implementation plan                   | 线索来源并入业务字典 Direct Cutover | frozen  | 不考虑兼容性，不产生历史包袱                           |
| Command design            | `docs/design/api-route-canonical-inventory.md`      | `dictionary` / removed routes       | updated | `/dictionaries` 是唯一维护入口                         |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts` | Lead + Dictionary contracts         | frozen  | `sourceCode` 替代 `sourceId`                           |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`      | EX-43 / EX-58C rows                 | updated | `/lead-sources` 直接清退                               |
| Query boundary            | Lead query + Dictionary query                       | list / detail / dictionary list     | frozen  | Lead 读侧按 `sourceCode` 关联字典项                    |
| Data model / table freeze | `lead` + `dictionary_item`                          | migration                           | frozen  | `lead.source_code` + `dictionary_item.lead-source`     |
| Schema / DDL              | New migration                                       | EX-70A                              | frozen  | 清退 `lead_source` 表和 `lead.source_id`               |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`       | Resource-first route grammar        | pass    | 线索来源作为 dictionary item，不再有独立 route surface |

## 3. 本次 SSOT

| Concern                     | SSOT                                     | Implementation Rule                                                  |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Business semantics          | `dictionary_item` domain `lead-source`   | 线索来源是运行时字典项，不再是独立主数据表                           |
| Public route canonical path | `/dictionaries`                          | 只使用 existing dictionary list/create/update routes                 |
| Route / command naming      | `DictionaryController`                   | 不新增 lead-source controller                                        |
| DTO / contract naming       | `sourceCode`                             | Lead request / response / query 使用 code，不暴露 dictionary item id |
| Table / column naming       | `lead.source_code`                       | varchar(64), not null                                                |
| Date / time semantics       | Existing dictionary / lead timestamps    | 不新增时间语义                                                       |
| Identifier semantics        | `domain + code`                          | `lead-source` code 是稳定业务身份                                    |
| Money / decimal semantics   | N/A                                      | 不触碰金额                                                           |
| Status machine              | `DictionaryItemStatus` active / inactive | 线索来源启停复用字典项状态                                           |

## 4. 命令与接口边界

| Route / Controller         | Command / Service              | Request DTO / Contract        | Response DTO / Contract   | Guard / Permission                     | Design Source | Result  |
| -------------------------- | ------------------------------ | ----------------------------- | ------------------------- | -------------------------------------- | ------------- | ------- |
| `GET /dictionaries`        | `DictionaryService.listItems`  | `DictionaryItemListQuery`     | `DictionaryItemSummary[]` | read permissions including `lead:read` | EX-70A        | reused  |
| `POST /dictionaries`       | `DictionaryService.createItem` | `CreateDictionaryItemRequest` | `DictionaryItemSummary`   | `platform:dictionaries:manage`         | EX-70A        | reused  |
| `PATCH /dictionaries/{id}` | `DictionaryService.updateItem` | `UpdateDictionaryItemRequest` | `DictionaryItemSummary`   | `platform:dictionaries:manage`         | EX-70A        | reused  |
| `/lead-sources`            | N/A                            | N/A                           | N/A                       | N/A                                    | EX-70A        | removed |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /dictionaries`, `POST /dictionaries`, `PATCH /dictionaries/{id}`
- Current implemented route(s): `/lead-sources` removed by this slice
- Inventory status: `aligned` after direct removal
- Route governance source: `ADR-015` + `EX-58C` + `EX-70A`
- Blocker / exception: none; compatibility explicitly out of scope

## 5. 读侧边界

| Query / View         | Consumer              | Fields                     | Filter / Sort                  | Permission Boundary   | Design Source | Result  |
| -------------------- | --------------------- | -------------------------- | ------------------------------ | --------------------- | ------------- | ------- |
| `LeadListView`       | Admin lead list       | `sourceCode`, `sourceName` | `sourceCode`, existing filters | existing lead read    | EX-70A        | replace |
| `LeadDetailView`     | Admin lead detail     | `sourceCode`, `sourceName` | by lead id                     | existing lead read    | EX-70A        | replace |
| `DictionaryItemList` | Admin dictionary page | `domain='lead-source'`     | domain / status / keyword      | dictionary read/write | EX-70A        | extend  |

## 6. 持久化边界

| Table             | Migration | Entity / Repository                       | DDL / Freeze Source                             | Check Result |
| ----------------- | --------- | ----------------------------------------- | ----------------------------------------------- | ------------ |
| `dictionary_item` | EX-70A    | `DictionaryItem` / `DictionaryRepository` | add `lead-source` domain and seed/migrate items | required     |
| `lead`            | EX-70A    | `Lead` / `LeadRepository`                 | replace `source_id` with `source_code`          | required     |
| `lead_source`     | EX-70A    | removed                                   | drop table                                      | required     |

| Field / Object           | Design Type / Meaning    | Migration / DDL          | Entity | Shared Contract / OpenAPI    | Result  |
| ------------------------ | ------------------------ | ------------------------ | ------ | ---------------------------- | ------- |
| `lead.source_code`       | dictionary code          | varchar(64) not null     | string | `sourceCode: DictionaryCode` | replace |
| `lead.source_id`         | old LeadSource id        | drop                     | remove | remove                       | removed |
| `lead.source_channel`    | old source name snapshot | drop for lead domain     | remove | remove                       | removed |
| `dictionary_item.domain` | includes `lead-source`   | check constraint updated | enum   | `DictionaryDomain`           | extend  |

## 7. 一致性结论

- Document -> code: G1 requires all code follow this baseline.
- ADR-015 inventory -> route: `/lead-sources` removed, `/dictionaries` remains canonical.
- Migration -> entity: migration must precede entity changes.
- Entity -> contract: `sourceCode` must align across entity, contracts, OpenAPI and generated client.
- Route -> command: dictionary commands reused.
- Query -> view: Lead mapper resolves source name from dictionary item.
- Guard / permission: write uses `platform:dictionaries:manage`; `lead:source:manage` removed.
- OpenAPI / generated client: expected breaking diff; `LeadSourceApi` must disappear.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                     | Result | Gap / Reason           |
| -------------------------------- | -------- | ---------------------------------------------------------------------- | ------ | ---------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`   | Pass   | no new warnings        |
| Build                            | Yes      | `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin` | Pass   | cross-layer build pass |
| Unit tests                       | Yes      | lead/dictionary focused API and Admin specs                            | Pass   | see G3 evidence        |
| API / integration tests          | Yes      | lead focused E2E                                                       | Pass   | see G3 evidence        |
| E2E                              | Yes      | `poms-api-e2e` lead workflow                                           | Pass   | source contract change |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi`, `shared-api-client:generate/check`                 | Pass   | breaking diff expected |
| Migration / schema check         | Yes      | `poms-api:migration-up`, `poms-api:migration-check`                    | Pass   | schema up-to-date      |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | --------------------------------------------------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No compatibility exception; direct cutover is intentional |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: User direct request
- Approved At: 2026-05-29
- Conditions: Implement as one direct cutover; do not leave compatibility aliases, old fields, old permissions, or old generated client surface.

## 11. G3 结论

- Gate Status: `Pass`
- Reviewed At: 2026-05-29
- Scope Delivered: `lead_source` / `/lead-sources` / `LeadSourceApi` / `lead:source:manage` 清退；Lead 使用 `sourceCode`；线索来源由 `dictionary_item(domain='lead-source')` 维护和展示。
- Drift Classification: `new-real-drift` not found. Final scan residuals are expected: EX-70A governance notes and route inventory removal rows, non-lead generic `sourceId`, customer `source_channel`, historical archived slice references, and required `DictionaryDomain.LeadSource` enum member.
- Validation Evidence:
  - `corepack pnpm nx test poms-api --runInBand --testPathPatterns=lead` -> Pass, 5 suites / 40 tests.
  - `corepack pnpm nx test poms-api --runInBand --testPathPatterns=dictionary` -> Pass, no matching tests.
  - `corepack pnpm nx e2e poms-api-e2e --runInBand --testPathPatterns=lead-workflow` -> Pass, 1 suite / 2 tests; dependency migration-up applied EX-70A.
  - `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list --testPathPatterns=dictionary-list` -> Pass, 2 suites / 27 tests.
  - `corepack pnpm nx run poms-api:openapi` -> Pass.
  - `corepack pnpm nx run shared-api-client:generate` -> Pass.
  - `corepack pnpm nx run shared-api-client:check` -> Pass; generated client synchronized.
  - `corepack pnpm nx run poms-api:migration-up` -> Pass; latest version.
  - `corepack pnpm nx run poms-api:migration-check` -> Pass; schema up-to-date.
  - `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin` -> Pass.
  - `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin` -> Pass.
  - `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check` -> Pass.
