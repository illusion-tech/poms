# FE-61 业务字典卡片化维护界面实施基线包

- Gate Status: `Pass`
- Parent: `FE-53`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-61`

## 1. 范围

- 本次目标:
  - 将 `/platform/dictionaries` 默认维护界面从宽表格改为按字典域分组的卡片式维护界面。
  - 每个字典域卡片展示启用 / 停用数量、域内字典项列表、域内新增入口、停用项展开控制和行级编辑 / 启停动作。
  - 保留现有字典项创建、编辑、状态切换、关键字搜索、刷新和 focused component tests。
- 本次明确不做:
  - 不改后端 `Dictionary` API、OpenAPI、generated client、权限或数据模型。
  - 不新增拖拽排序、批量导入、删除字典项或跨域移动。
  - 不改变 code 校验、usageCount 语义或系统项保护规则。
- 下游可依赖的交付边界:
  - 管理员默认按业务域维护少量配置项，不再以全量宽表作为主交互。
  - 既有新增 / 编辑 / 启停 command 调用不变。
- 不允许下游依赖的留白:
  - 本片不提供可拖拽排序；排序仍通过编辑弹窗中的数字字段维护。

## 2. 正式输入

| Input Type                | Document / Source                                                       | Section / Anchor | Status | Notes                                            |
| ------------------------- | ----------------------------------------------------------------------- | ---------------- | ------ | ------------------------------------------------ |
| Business design           | `docs/design/archive/slices/fe-53-admin-dictionary-options-baseline.md` | Scope            | Pass   | FE-53 已交付业务字典入口和 CRUD 能力。           |
| UI reference              | `apps/poms-admin/src/app/demo/uikit/listdemo.ts`                        | DataView / list  | Pass   | 使用分组卡片和列表行，不沿用宽表主视图。         |
| Existing implementation   | `apps/poms-admin/src/app/features/platform/dictionary-list.ts`          | Component        | Pass   | 本片只调整默认展示和交互组织。                   |
| Component tests           | `apps/poms-admin/src/app/features/platform/dictionary-list.spec.ts`     | Focused specs    | Pass   | 需要更新断言覆盖卡片分组和域内新增入口。         |
| Route inventory / ADR-015 | N/A                                                                     | N/A              | Pass   | 不新增、变更或删除 public API route surface。    |
| Data model / table freeze | N/A                                                                     | N/A              | Pass   | 不改持久化、migration、entity 或 shared schema。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                                  | Implementation Rule                                      |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Business semantics          | FE-53 baseline + generated `DictionaryDomain`         | 只展示三个固定字典域，不在前端伪造新 domain。            |
| Public route canonical path | N/A                                                   | 本片不触及 public API route surface。                    |
| Route / command naming      | generated `DictionaryApi` via `DictionaryStore`       | `loadItems` / `createItem` / `updateItem` 调用保持不变。 |
| DTO / contract naming       | `@poms/shared-api-client` generated models            | 不新增本地 DTO 替代 generated type。                     |
| Table / column naming       | N/A                                                   | 不改表结构。                                             |
| Date / time semantics       | generated `DictionaryItemSummary.createdAt/updatedAt` | 不新增时间语义。                                         |
| Identifier semantics        | generated `DictionaryItemSummary.id`                  | 继续使用后端返回的 item id。                             |
| Money / decimal semantics   | N/A                                                   | 不涉及。                                                 |
| Status machine              | generated `ActiveInactiveStatus`                      | 卡片内只切换 active / inactive。                         |

## 4. 命令与接口边界

| Route / Controller | Command / Service            | Request DTO / Contract        | Response DTO / Contract | Guard / Permission | Design Source | Result    |
| ------------------ | ---------------------------- | ----------------------------- | ----------------------- | ------------------ | ------------- | --------- |
| N/A                | `DictionaryStore.loadItems`  | generated query params        | `DictionaryItemSummary` | existing           | FE-53         | unchanged |
| N/A                | `DictionaryStore.createItem` | `CreateDictionaryItemRequest` | `DictionaryItemSummary` | existing           | FE-53         | unchanged |
| N/A                | `DictionaryStore.updateItem` | `UpdateDictionaryItemRequest` | `DictionaryItemSummary` | existing           | FE-53         | unchanged |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): unchanged generated dictionary routes
- Inventory status: `aligned`
- Route governance source: FE-53 baseline
- Blocker / exception: none

## 5. 读侧边界

| Query / View                | Consumer                      | Fields                                  | Filter / Sort                     | Permission Boundary  | Design Source | Result    |
| --------------------------- | ----------------------------- | --------------------------------------- | --------------------------------- | -------------------- | ------------- | --------- |
| `DictionaryStore.items()`   | `DictionaryList` domain cards | domain, code, name, description, status | client group by domain; sortOrder | existing route guard | FE-53         | card list |
| `DictionaryStore.loadItems` | search toolbar                | keyword                                 | server keyword filter             | existing route guard | FE-53         | unchanged |

## 6. 持久化边界

N/A. This frontend-only slice does not modify schema, migration, entity, repository, OpenAPI or generated client.

## 7. 一致性结论

- Document -> code: FE-53 runtime capability remains unchanged; FE-61 changes default interaction shape only.
- ADR-015 inventory -> route: N/A, no public route change.
- Migration -> entity: N/A.
- Entity -> contract: N/A.
- Route -> command: unchanged generated dictionary commands.
- Query -> view: dictionary items are grouped by generated `DictionaryDomain`.
- Guard / permission: unchanged route/menu permission.
- OpenAPI / generated client: unchanged.

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                          | Result | Gap / Reason                                                           |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                          | Pass   | No new lint warnings.                                                  |
| Build                            | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                         | Pass   | Production build passed.                                               |
| Unit tests                       | Yes      | `corepack pnpm jest --config apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/features/platform/dictionary-list.spec.ts --runInBand` | Pass   | 6 tests passed.                                                        |
| API / integration tests          | No       | N/A                                                                                                                                                         | N/A    | Frontend-only.                                                         |
| E2E                              | No       | N/A                                                                                                                                                         | N/A    | Focused component coverage is sufficient for this low-risk UI reshape. |
| OpenAPI generation / client diff | No       | N/A                                                                                                                                                         | N/A    | No contract change.                                                    |
| Migration / schema check         | No       | N/A                                                                                                                                                         | N/A    | No persistence change.                                                 |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-13`
- Conditions:
  - Implement as frontend-only.
  - Do not change dictionary API/client/schema.
  - G3 must include focused component test, `poms-admin` lint/build, `git diff --check`, and `format:md:check` because docs are touched.

## 11. G3 本地检查点

- Gate Status: `Pass`
- Checked By: `Codex local`
- Checked At: `2026-05-13`
- Slice Type: `frontend-only`
- Scope:
  - `/platform/dictionaries` 默认主视图已从宽表格改为按字典域分组的卡片列表。
  - 每个域卡片支持域内新增、停用项展开、行级编辑和启停。
  - 既有新增 / 编辑 / 启停 store command 保持不变。
- Document -> code: Pass. FE-61 baseline 与 `DictionaryList` 实现边界一致。
- ADR-015 inventory / route surface: N/A. No public route surface changed.
- Route -> command: unchanged generated dictionary commands through `DictionaryStore`.
- Migration -> entity: N/A.
- Entity -> contract / OpenAPI: unchanged.
- Query / view: Pass. Generated `DictionaryDomain` drives domain card grouping.
- Guard / permission: unchanged route and menu guard.

Commands:

- `corepack pnpm jest --config apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/features/platform/dictionary-list.spec.ts --runInBand`: Pass, 6 tests.
- `corepack pnpm nx lint poms-admin --skip-nx-cache`: Pass, no new warnings.
- `corepack pnpm nx build poms-admin --skip-nx-cache`: Pass.
- `corepack pnpm run format:md`: Pass, formatted this baseline and tracker.
- `corepack pnpm run format:md:check`: Pass.
- `git diff --check`: Pass.

Drift:

- Classification: none.
- Existing baseline drift: none observed for this slice.
- New drift introduced: none.

Decision:

- Can commit to main: yes, after user requests commit.
- Can mark tracker Done: no, not until the implementation is committed and lifecycle artifacts are archived under G4.
