# FE-73 poms-admin initial bundle budget 告警收敛实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `frontend-only`
- G1 Reviewer: Codex
- G1 Date: 2026-06-20
- GitHub Issue: `#22`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-73`

## 1. 范围

- 本次目标:
  - 收敛 `poms-admin` production initial bundle budget warning。
  - 优先治理首屏 eager 路径中的 generated client / admin data-access barrel import，形成可复查的 build stats 证据。
  - 保持业务功能、路由、权限、API 契约和页面视觉行为不变。
- 本次明确不做:
  - 不新增或修改 public API route、OpenAPI、generated client、后端、数据库、权限 key。
  - 不做业务页面视觉重构。
  - 不把单纯调高 `maximumWarning` 作为第一选择。
  - 不在同一切片内重构 Tailwind / PrimeNG / Poseidon 全局主题体系；CSS 侧仅记录为后续候选方向。
- 下游可依赖的交付边界:
  - `poms-admin` production build 不再出现 initial budget warning，或在完成首选优化后给出明确剩余差距和预算调整依据。
  - 首屏 eager import 边界更窄，避免 root store 因 barrel import 把不必要 generated client surface 拉入 initial。
- 不允许下游依赖的留白:
  - 不承诺完成全局 CSS 体积治理。
  - 不承诺改变所有 feature lazy chunk 体积。

## 2. 正式输入

| Input Type          | Document / Source                                                | Section / Anchor       | Status | Notes                                                                         |
| ------------------- | ---------------------------------------------------------------- | ---------------------- | ------ | ----------------------------------------------------------------------------- |
| Business design     | GitHub issue `#22`                                               | 背景 / 目标 / 验收标准 | Pass   | 冻结 initial bundle warning 收敛目标和非目标。                                |
| Command design      | N/A                                                              | N/A                    | N/A    | 本片不新增写命令。                                                            |
| DTO / OpenAPI       | N/A                                                              | N/A                    | N/A    | 本片不改 API 契约。                                                           |
| Route inventory     | N/A                                                              | N/A                    | N/A    | 本片不触及 public route surface。                                             |
| Query boundary      | `apps/poms-admin/src/app.config.ts`                              | eager providers        | Pass   | `AuthStore` initializer 和 `PlatformStore` provider 属于首屏 eager 注入边界。 |
| Build configuration | `apps/poms-admin/project.json`                                   | production budgets     | Pass   | initial `maximumWarning` 当前为 `1050kb`，`maximumError` 为 `5mb`。           |
| Build evidence      | `corepack pnpm nx build poms-admin --skip-nx-cache --stats-json` | 2026-06-20 baseline    | Pass   | 构建通过但 warning 复现：initial total `1.06 MB`，超出 `9.51 kB`。            |

## 3. 本次 SSOT

| Concern                     | SSOT                                | Implementation Rule                                                    |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Business semantics          | GitHub issue `#22`                  | 收敛构建 warning，不改变业务行为。                                     |
| Public route canonical path | N/A                                 | 不触及 public route。                                                  |
| Route / command naming      | N/A                                 | 不新增 route / command。                                               |
| DTO / contract naming       | Existing generated client           | 只调整 import 边界，不修改 generated client 输出。                     |
| Table / column naming       | N/A                                 | 不触及数据库。                                                         |
| Date / time semantics       | N/A                                 | 不触及日期语义。                                                       |
| Identifier semantics        | N/A                                 | 不触及标识符语义。                                                     |
| Money / decimal semantics   | N/A                                 | 不触及金额语义。                                                       |
| Status machine              | Existing app runtime behavior       | provider / store 初始化行为必须保持等价。                              |
| Bundle evidence             | `poms-admin` production build stats | 以 `--stats-json` 构建输出和 CLI warning 状态作为 G2/G3 体积判断依据。 |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result                     |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ------------- | -------------------------- |
| N/A                | N/A               | N/A                    | N/A                     | N/A                | `#22`         | 本片不触及 API / command。 |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: N/A
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View                  | Consumer                    | Fields                             | Filter / Sort | Permission Boundary          | Design Source | Result                                          |
| ----------------------------- | --------------------------- | ---------------------------------- | ------------- | ---------------------------- | ------------- | ----------------------------------------------- |
| `AuthStore.initialize()`      | `app.config.ts` initializer | current session, navigation, todos | N/A           | existing auth/session guards | `#22`         | 保持首屏 bootstrap 行为，允许收窄 imports。     |
| `PlatformStore` root provider | platform/user/org pages     | platform admin data                | N/A           | existing route/page guards   | `#22`         | 评估是否仍需全局 provider；不得破坏已注入页面。 |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result           |
| ----- | --------- | ------------------- | ------------------- | ---------------------- |
| N/A   | N/A       | N/A                 | N/A                 | 本片不改 persistence。 |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result         |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | 本片不改字段。 |

## 7. 一致性结论

- Document -> code: `#22` 明确首选治理 eager generated client import；G2 从 `AuthStore` / `PlatformStore` / `app.config.ts` 开始。
- ADR-015 inventory -> route: N/A，不触及 public route。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: `AuthStore.initialize()` 与平台 store 注入行为必须保持等价。
- Guard / permission: 不改 guard / permission key。
- OpenAPI / generated client: 不重新生成；只允许改手写 import 边界。

## 8. 体积基线

2026-06-20 执行：

```bash
corepack pnpm nx build poms-admin --skip-nx-cache --stats-json
```

结果：

- Build: Pass
- Warning: `bundle initial exceeded maximum budget. Budget 1.05 MB was not met by 9.51 kB with a total of 1.06 MB.`
- Initial total raw: `1.06 MB`
- Initial estimated transfer: `161.23 kB`
- Initial notable chunks:
  - `chunk-I6A6HXAV.js`: `324.09 kB`
  - `styles-3QW2P5FR.css`: `232.77 kB`
  - `chunk-73TKXDIY.js`: `184.02 kB`
  - `main-2QY5CB4S.js`: `123.24 kB`
  - `chunk-PKF5V6G4.js`: `96.16 kB`
- Lazy confirmation:
  - `org-unit-list` 为 lazy chunk `chunk-CWJLJUEZ.js`，`104.07 kB`，不计入 initial。
- Stats heuristic:
  - `apps/poms-admin/src/assets/tailwind.css` 贡献约 `186342` bytes。
  - `libs/shared/contracts/src/lib/shared-contracts.ts` 在输出中合计约 `193524` bytes。
  - 首屏 root store 当前存在 `@poms/shared-api-client` barrel runtime import，需要优先验证能否 tree-shake / split。

## 9. 测试与校验

| Check                   | Required   | Command / Evidence                                               | Result  | Gap / Reason                                      |
| ----------------------- | ---------- | ---------------------------------------------------------------- | ------- | ------------------------------------------------- |
| Admin lint              | Yes        | `corepack pnpm nx lint poms-admin --skip-nx-cache`               | Pass    | G3 已通过。                                       |
| Admin data-access lint  | If touched | `corepack pnpm nx lint admin-data-access --skip-nx-cache`        | Pass    | 改动触及 data-access imports，已通过。            |
| Build / bundle evidence | Yes        | `corepack pnpm nx build poms-admin --skip-nx-cache --stats-json` | Pass    | G3 已通过，initial warning 已消除。               |
| Focused tests           | Focused    | `auth.store` / `platform.store` focused tests                    | Pass    | Store provider / import 行为保持。                |
| API / integration tests | No         | N/A                                                              | N/A     | 本片不改 API。                                    |
| E2E                     | No         | N/A                                                              | N/A     | 仅构建 import 边界；如 bootstrap 行为受影响再补。 |
| OpenAPI / client        | No         | N/A                                                              | N/A     | 不改 generated client。                           |
| Migration / schema      | No         | N/A                                                              | N/A     | 不改 persistence。                                |
| Markdown / diff         | Yes        | `corepack pnpm run format:md:check`; `git diff --check`          | Pending | 本片新增 baseline / tracker。                     |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes         |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | G1 暂无例外。 |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: Codex
- Approved At: 2026-06-20
- Conditions:
  - G2 先验证 eager generated client import 收窄，不直接调高 budget。
  - 如首选优化不足以消除 warning，必须记录剩余 bytes 和调高预算依据，再决定是否进入 CSS 侧后续切片。

## 12. G3 结果

G2/G3 实现只收窄 root/eager 运行时 import，不改变生成客户端内容：

- `AuthStore` 的 `ApprovalApi` / `AuthApi` / `NavigationApi` 和 `NavigationItemType` / `TodoStatus` 从 `@poms/shared-api-client` barrel 改为具体 `api/*` / `model/*` 路径。
- `PlatformStore` 的 `PlatformApi` 从 barrel 改为 `api/platform.service`。
- `providePomsApiClient()` 的 `PomsApiConfiguration` / `BASE_PATH` 从 barrel 改为 `configuration` / `variables`。

2026-06-20 G3 build 结果：

- Build: Pass
- Warning: none
- Initial total raw: `789.25 kB`
- Initial estimated transfer: `151.31 kB`
- Raw delta: from `1.06 MB` to `789.25 kB`，减少约 `270 kB`，已低于 `1050kb` warning budget。
- `org-unit-list` 仍为 lazy chunk，说明 FE-72 组织树页面没有进入 initial。
