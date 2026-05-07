# FE-59A1 Provider 配置卡片化组件抽象实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59A1`

## 1. 范围

本片负责把 `FE-59A` 已完成的 provider 配置表格视图调整为卡片式体验，并抽象可复用的 provider card 组件。

Included:

1. 新增 `IdentityProviderCard` standalone 组件，用于渲染单个 provider config。
2. `IdentityProviderList` 由表格主体调整为 responsive card grid。
3. 卡片展示 provider 名称、租户、状态、能力开关、secret 配置态、client id、redirect URI、scope、搜索授权模式、版本和最近测试结果。
4. 卡片保留编辑和测试连接操作，继续使用当前 `rowVersion` 作为测试连接 `expectedVersion`。
5. 保留 provider / status 筛选、刷新、新增配置、创建 / 编辑弹窗和 secret 写入态。
6. 参考 demo 中 `listdemo` grid card、`blocks` 信息编辑卡片和平台页现有统计卡片的视觉语言。
7. 补充 card 组件 focused tests，并更新配置页测试断言。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider migration、entity、DTO、OpenAPI 或 generated client。
3. 不改变 provider 配置创建、编辑、测试连接的业务语义。
4. 不实现用户详情绑定弹窗或登录 callback；这些仍由 `FE-59B` / `FE-59C` 承接。
5. 不做 provider marketplace 或动态插件渲染；未来 provider 扩展仍通过 generated enum 和配置数据驱动卡片。

## 2. 正式输入

| Input Type       | Document / Source                                                     | Status | Notes                          |
| ---------------- | --------------------------------------------------------------------- | ------ | ------------------------------ |
| Previous slice   | `fe-59a-provider-system-config-frontend-closeout.md`                  | G4     | provider 配置页已可用          |
| User feedback    | Current thread                                                        | Active | 有限固定 provider 更适合卡片式 |
| Demo reference   | `apps/poms-admin/src/app/demo/uikit/listdemo.ts`                      | Active | grid card 结构参考             |
| Demo reference   | `apps/poms-admin/src/app/demo/blocks/blocks.ts`                       | Active | 信息编辑卡片 / actions 参考    |
| Existing page    | `apps/poms-admin/src/app/features/platform/identity-provider-list.ts` | Active | 保留 store / dialog / actions  |
| Generated client | `libs/shared/api-client/api/identity-provider.service.ts`             | Stable | 不改 generated surface         |

## 3. SSOT

| Concern           | SSOT                                             | Implementation Rule                                 |
| ----------------- | ------------------------------------------------ | --------------------------------------------------- |
| Provider data     | `IdentityProviderConfigSummary`                  | Card 只消费 summary 数据，不自行组合后端字段        |
| Provider identity | generated `IdentityProvider`                     | provider label 从 enum 映射派生                     |
| Config status     | generated `IdentityProviderConfigStatus`         | status 标签沿用 FE-59A 映射                         |
| Secret visibility | `IdentityProviderConfigSummary.secretConfigured` | Card 只展示是否配置，不显示 raw secret              |
| Version semantics | `rowVersion`                                     | testConnection / update 仍传 expectedVersion        |
| Card actions      | `IdentityProviderList`                           | Card 通过 output 交回 edit / test，不直接调用 store |
| Layout reference  | PrimeNG demo card patterns                       | 卡片不嵌套卡片，保持后台配置页信息密度              |

## 4. 路由与权限边界

No Admin route or public API route is added or changed in this slice.

Existing route `/platform/identity-providers` and permission `platform:identity-providers:manage` remain unchanged.

## 5. 读写边界

| Operation       | Boundary                                   | UI Behavior                                      | Result    |
| --------------- | ------------------------------------------ | ------------------------------------------------ | --------- |
| List            | Existing `IdentityProviderStore`           | Card grid renders `store.configs()`              | G1 frozen |
| Filter          | Existing `providerFilter` / `statusFilter` | Filters keep calling existing `loadConfigs`      | G1 frozen |
| Edit            | Existing dialog                            | Card emits edit action to parent                 | G1 frozen |
| Test connection | Existing `testConnection`                  | Card emits test action and displays last result  | G1 frozen |
| Create / update | Existing dialogs and store methods         | Secret write-state and expectedVersion unchanged | G1 frozen |

## 6. 持久化边界

N/A. 本片不触及 migration、entity、DDL 或 seed。

## 7. 测试与校验

| Check               | Required | Command / Evidence                                                                       | Result     |
| ------------------- | -------- | ---------------------------------------------------------------------------------------- | ---------- |
| Card focused tests  | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-card` | Pending G3 |
| Page focused tests  | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list` | Pending G3 |
| Admin lint          | Yes      | `corepack pnpm nx lint poms-admin`                                                       | Pending G3 |
| Admin build         | Yes      | `corepack pnpm nx build poms-admin`                                                      | Pending G3 |
| Markdown            | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                  | Pending G3 |
| API lint / build    | No       | N/A                                                                                      | N/A        |
| OpenAPI / migration | No       | N/A                                                                                      | N/A        |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - 只调整 UI 形态和组件边界，不改变 provider 配置行为。
  - Card 组件不得直接依赖 store，避免把页面 orchestration 藏入展示组件。
  - `FE-59C` 登录入口仍暂停，待本片 G4 后继续。
