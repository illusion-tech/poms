# FE-61 业务字典卡片化维护界面 G3/G4 Closeout

- Gate Status: `G4 = Done`
- Parent: `FE-53`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Closed By: `Codex local`
- Closed At: `2026-05-13`
- Implementation Commit: `f9b0be1`
- Baseline: `docs/design/archive/slices/fe-61-dictionary-card-list-frontend-baseline.md`

## 1. Delivered Scope

- `/platform/dictionaries` 默认主视图由宽表格改为按字典域分组的三张卡片。
- 每张字典域卡片展示启用数、停用数、系统项数量、域描述和稳定 domain code。
- 域内字典项改为紧凑列表行，左侧展示名称、code、排序、引用数和版本，右侧提供图标按钮编辑 / 启停。
- 停用项默认隐藏，并支持按字典域单独展开。
- 卡片内新增入口会预选当前字典域。
- 既有 `DictionaryStore.loadItems/createItem/updateItem` 调用、后端 API、OpenAPI、generated client、权限和数据模型均未改变。

## 2. Validation

| Check              | Result | Evidence                                                                                                                                                    |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused spec       | Pass   | `corepack pnpm jest --config apps/poms-admin/jest.config.ts --runTestsByPath apps/poms-admin/src/app/features/platform/dictionary-list.spec.ts --runInBand` |
| Admin lint         | Pass   | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                          |
| Admin build        | Pass   | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                         |
| Markdown formatter | Pass   | `corepack pnpm run format:md`                                                                                                                               |
| Markdown check     | Pass   | `corepack pnpm run format:md:check`                                                                                                                         |
| Whitespace check   | Pass   | `git diff --check`; pre-commit `git diff --cached --check`                                                                                                  |

## 3. Drift Classification

- Classification: none.
- Existing baseline drift: none observed for this slice.
- New drift introduced: none.
- Public route surface: unchanged.
- OpenAPI / generated client: unchanged.
- Persistence / migration: unchanged.

## 4. Exceptions

| Exception ID | Level | Scope | Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A   | N/A         | No exception. |

## 5. G4 Decision

- Can downstream rely on this slice: yes.
- Can mark tracker `Done / G4`: yes, after this closeout and archive move are committed.
- Follow-up slices:
  - Optional future slice for drag / up-down ordering if administrators need direct visual sorting.
  - Optional future slice for browser smoke coverage if business dictionary UI becomes a high-risk admin journey.
