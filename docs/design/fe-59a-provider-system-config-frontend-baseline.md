# FE-59A Provider 系统配置页面实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59A`

## 1. 范围

本片负责把 `EX-64B` 已落地的外部身份提供商配置能力接入 Admin 前端。

Included:

1. 新增 Admin 路由 `/platform/identity-providers`，受 `platform:identity-providers:manage` 权限保护。
2. 新增平台配置菜单入口“外部身份提供商”，并保持动态导航 SSOT 与前端 route 对齐。
3. 新增 provider 配置管理页，第一版覆盖 Feishu provider。
4. 支持展示 provider、租户、状态、启用能力、client id、secret 配置态、redirect URI、scope、搜索授权模式和版本。
5. 支持创建 provider 配置，填写 display name、tenant id、client id、client secret、redirect URI、login / search scopes、tenant allowlist、能力开关和 search grant mode。
6. 支持编辑配置，client secret 使用写入态；空值不覆盖既有 secret。
7. 支持测试连接，使用 generated `identityProviderControllerTestIdentityProviderConnection` 并展示 success / failed 结果。
8. 补 Admin route / component / navigation focused tests。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider migration、entity、DTO、OpenAPI 或 generated client。
3. 不实现用户详情绑定弹窗、飞书姓名模糊搜索或解绑体验；这些由 `FE-59B` 承接。
4. 不实现登录页外部 provider 入口或 callback 页面；这些由 `FE-59C` 承接。
5. 不在前端保存、显示或回读 raw client secret。
6. 不实现多 provider 插件化 UI marketplace；本片只按 generated enum 呈现当前 provider 集合。

## 2. 正式输入

| Input Type           | Document / Source                                                         | Status | Notes                                     |
| -------------------- | ------------------------------------------------------------------------- | ------ | ----------------------------------------- |
| Runtime API          | `ex-64b-provider-config-runtime-closeout.md`                              | G4     | provider config API、secret 脱敏已完成    |
| Search/login runtime | `ex-64d-feishu-adapter-search-grant-runtime-closeout.md`、`ex-64e-*.md`   | G4     | 配置页只消费配置 API，不消费登录 / 搜索流 |
| Tracker              | `phase2-development-execution-tracker.md` / `FE-59A`                      | Active | `EX-64B` generated client 已稳定          |
| Generated client     | `libs/shared/api-client/api/identity-provider.service.ts`                 | Stable | list/create/update/testConnection 已生成  |
| Existing UI pattern  | `dictionary-list`、`navigation-governance`、`PlatformStore` / store style | Active | standalone component + signal data-access |

## 3. SSOT

| Concern           | SSOT                                             | Implementation Rule                                         |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Provider identity | generated `IdentityProvider`                     | 前端只消费 generated enum，不手写 provider 运行时 code 集合 |
| Config status     | generated `IdentityProviderConfigStatus`         | 状态标签和筛选从 generated enum 派生                        |
| Search grant mode | generated `IdentityProviderSearchGrantMode`      | 表单只提交 generated enum 值                                |
| Secret visibility | `IdentityProviderConfigSummary.secretConfigured` | UI 只展示是否配置，不显示 secret 明文                       |
| Version semantics | `rowVersion`                                     | update / testConnection 必须传 `expectedVersion`            |
| Admin route       | `app.routes.ts`                                  | `/platform/identity-providers` guarded by manage permission |
| Menu route        | navigation SSOT + static fallback                | 动态菜单和 fallback 菜单保持同一 link                       |

## 4. 路由与权限边界

| Route / Surface                | Permission                           | Source        | Result    |
| ------------------------------ | ------------------------------------ | ------------- | --------- |
| `/platform/identity-providers` | `platform:identity-providers:manage` | This baseline | G1 frozen |

No public API route is added or changed in this slice.

## 5. 读写边界

| Operation       | Generated API                                              | UI Behavior                                                       | Result    |
| --------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| List            | `identityProviderControllerListIdentityProviderConfigs`    | provider / status filters, refresh action                         | G1 frozen |
| Create          | `identityProviderControllerCreateIdentityProviderConfig`   | create dialog; requires display name, client id and client secret | G1 frozen |
| Update          | `identityProviderControllerUpdateIdentityProviderConfig`   | edit config with expectedVersion; blank secret means no change    | G1 frozen |
| Test connection | `identityProviderControllerTestIdentityProviderConnection` | sends expectedVersion and displays provider-local result          | G1 frozen |

## 6. 持久化边界

N/A. 本片不触及 migration、entity、DDL 或 seed。

## 7. 测试与校验

| Check               | Required            | Command / Evidence                                                                       | Result     |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| Admin focused tests | Yes                 | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list` | Pending G3 |
| Route tests         | Yes                 | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=app.routes`             | Pending G3 |
| API navigation test | Yes                 | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=navigation.service`       | Pending G3 |
| Admin data lint     | Yes                 | `corepack pnpm nx lint admin-data-access`                                                | Pending G3 |
| Admin lint          | Yes                 | `corepack pnpm nx lint poms-admin`                                                       | Pending G3 |
| Admin build         | Yes                 | `corepack pnpm nx build poms-admin`                                                      | Pending G3 |
| API lint / build    | If nav SSOT touched | `corepack pnpm nx lint poms-api`; `corepack pnpm nx build poms-api`                      | Pending G3 |
| Markdown            | Yes                 | `corepack pnpm run format:md:check`; `git diff --check`                                  | Pending G3 |
| OpenAPI / migration | No                  | N/A                                                                                      | N/A        |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - 只消费 `EX-64B` 既有 provider config API，不修改后端契约。
  - Secret 必须保持写入态；前端不得展示或缓存 raw secret。
  - `FE-59B` 和 `FE-59C` 不在本片内混入。
