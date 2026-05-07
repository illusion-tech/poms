# FE-59A2 Provider 固定卡片入口实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59A2`

## 1. 范围

本片负责把 `FE-59A1` 卡片化后的 provider 配置入口从“新增 Provider”调整为“固定 provider 卡片列表”。

Included:

1. 移除配置页顶部的任意“新增 Provider”入口。
2. `IdentityProviderCard` 支持未配置 provider 状态，展示固定 provider 槽位和“配置”操作。
3. `IdentityProviderList` 按 generated `IdentityProvider` enum 生成固定 provider 槽位；已有配置继续逐张展示，未配置 provider 补一张待配置卡片。
4. 从待配置卡片打开创建弹窗时预选并锁定 provider，避免管理员在创建时再选择 provider。
5. 保留 provider / status 筛选、刷新、编辑、测试连接、secret 写入态和现有 store 调用。
6. 补充 focused tests 覆盖待配置卡片和 provider 锁定创建入口。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider migration、entity、DTO、OpenAPI 或 generated client。
3. 不改变 provider 配置创建、编辑、测试连接的业务语义。
4. 不实现钉钉、企业微信等新 provider enum；未来 provider 仍由 generated enum 扩展后自动进入固定卡片列表。
5. 不实现 `FE-59C` 登录页外部 provider 入口或 callback 体验。

## 2. 正式输入

| Input Type     | Document / Source                                                     | Status | Notes                               |
| -------------- | --------------------------------------------------------------------- | ------ | ----------------------------------- |
| Previous slice | `fe-59a1-provider-card-config-frontend-closeout.md`                   | G4     | provider 配置页已卡片化             |
| User feedback  | Current thread                                                        | Active | 不要新增入口，直接罗列固定 provider |
| Existing page  | `apps/poms-admin/src/app/features/platform/identity-provider-list.ts` | Active | 保留 store / dialog / filters       |
| Card component | `apps/poms-admin/src/app/features/platform/identity-provider-card.ts` | Active | 扩展未配置状态                      |
| Generated enum | `IdentityProvider` from `@poms/admin-data-access`                     | Stable | 当前只有 `Feishu`                   |

## 3. SSOT

| Concern           | SSOT                                      | Implementation Rule                            |
| ----------------- | ----------------------------------------- | ---------------------------------------------- |
| Supported slots   | generated `IdentityProvider` enum         | 固定 provider 卡片从 enum 派生，不使用自由新增 |
| Configured cards  | `IdentityProviderConfigSummary[]`         | 已有配置继续逐张展示，保留多租户可见性         |
| Missing provider  | `IdentityProvider` without visible config | 渲染一张待配置卡片，配置动作打开 create dialog |
| Provider locking  | `IdentityProviderList.showCreateDialog`   | 待配置卡片打开时预选 provider 并禁用选择       |
| Secret visibility | `secretConfigured`                        | 不展示 raw secret                              |
| Version semantics | `rowVersion`                              | testConnection / update 仍传 expectedVersion   |

## 4. 路由与权限边界

No Admin route or public API route is added or changed in this slice.

Existing route `/platform/identity-providers` and permission `platform:identity-providers:manage` remain unchanged.

## 5. 读写边界

| Operation       | Boundary                         | UI Behavior                                           | Result    |
| --------------- | -------------------------------- | ----------------------------------------------------- | --------- |
| List            | Existing `IdentityProviderStore` | Card grid renders existing configs plus missing slots | G1 frozen |
| Configure       | Existing create dialog           | Missing slot opens create dialog with provider locked | G1 frozen |
| Filter          | Existing filters                 | Filters still call `loadConfigs`                      | G1 frozen |
| Edit            | Existing dialog                  | Configured card emits edit action to parent           | G1 frozen |
| Test connection | Existing `testConnection`        | Configured card emits test action                     | G1 frozen |

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
  - 只调整 Admin UI 入口心智，不改变后端契约。
  - 固定 provider 槽位必须从 generated enum 派生，避免手写新增路径。
  - `FE-59C` 登录入口仍暂停，待本片 G4 后继续。
