# FE-59B 用户详情外部身份绑定与飞书姓名模糊搜索弹窗实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59B`

## 1. 范围

本片负责把 `EX-64C` / `EX-64D` 已落地的外部身份绑定、当前管理员搜索授权和 Feishu 姓名模糊搜索能力接入 Admin 用户详情。

Included:

1. 在用户详情弹窗展示该 POMS 用户的外部身份绑定状态。
2. 支持按 provider config 选择可绑定的 Feishu 配置；候选配置必须是 active、enabled、bindingEnabled、searchEnabled。
3. 展示当前管理员对该 provider config 的搜索授权状态。
4. 支持发起当前管理员 Feishu 搜索授权，并提供授权状态刷新。
5. 支持按姓名关键字调用 generated `identityProviderControllerSearchExternalUsers` 进行模糊搜索。
6. 支持展示候选人的姓名、部门、邮箱、手机号、subjectId，并从候选人确认绑定到当前 POMS 用户。
7. 支持对 active 外部身份绑定执行解绑，使用 `rowVersion` 作为 `expectedVersion`。
8. 补用户外部身份面板 focused component tests，并覆盖 store 调用边界。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider migration、entity、DTO、OpenAPI 或 generated client。
3. 不实现登录页 provider 入口、登录 callback、POMS JWT 会话交换或 AuthStore 会话落地；这些由 `FE-59C` 承接。
4. 不实现通讯录同步、后台定时导入、组织映射或全量外部用户缓存。
5. 不允许管理员手填手机号 / 邮箱完成首绑；本片以 provider 姓名模糊搜索候选人为第一版绑定入口。
6. 不处理多 provider 专属 UI 插件 marketplace；本片按 generated provider enum 和当前 Feishu 配置实现模块化边界。

## 2. 正式输入

| Input Type       | Document / Source                                               | Status | Notes                                         |
| ---------------- | --------------------------------------------------------------- | ------ | --------------------------------------------- |
| Binding runtime  | `ex-64c-external-identity-binding-runtime-closeout.md`          | G4     | external identity list / bind / unbind 已完成 |
| Search runtime   | `ex-64d-feishu-adapter-search-grant-runtime-closeout.md`        | G4     | per-admin grant 和 Feishu search 已完成       |
| Provider config  | `fe-59a-provider-system-config-frontend-closeout.md`            | G4     | provider config 页面和 store 已完成           |
| Tracker          | `phase2-development-execution-tracker.md` / `FE-59B`            | Active | 本片为 `FE-59` 第二个前端子切片               |
| Generated client | `libs/shared/api-client/api/external-identity.service.ts`       | Stable | list / bind / unbind 已生成                   |
| Generated client | `libs/shared/api-client/api/identity-provider.service.ts`       | Stable | config list / external user search 已生成     |
| Generated client | `libs/shared/api-client/api/identity-provider-o-auth-*.ts`      | Stable | current-admin grant get / authorize 已生成    |
| Existing UI      | `apps/poms-admin/src/app/features/user-management/user-list.ts` | Active | 用户详情弹窗是绑定入口                        |

## 3. SSOT

| Concern              | SSOT                                         | Implementation Rule                                                     |
| -------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| Provider identity    | generated `IdentityProvider`                 | 前端只消费 generated enum；Feishu 只是当前可用配置                      |
| Config eligibility   | `IdentityProviderConfigSummary`              | 仅 active + enabled + bindingEnabled + searchEnabled 配置可用于搜索绑定 |
| Grant status         | generated `IdentityProviderOAuthGrantStatus` | 搜索前必须有 active grant；missing / expired / revoked 走授权入口       |
| Search candidates    | generated `ExternalUserCandidate`            | 候选字段直接映射到 bind request，不要求手机号或邮箱                     |
| Binding status       | generated `ExternalIdentityBindingStatus`    | active 可解绑；revoked 只展示历史状态                                   |
| Version semantics    | `ExternalIdentityBindingSummary.rowVersion`  | unbind 必须传 `expectedVersion`                                         |
| User detail location | `UserList` detail dialog                     | 不新增 Admin route；在详情弹窗嵌入绑定面板                              |
| Permission boundary  | backend generated API guards                 | 前端不新增本地权限分叉；继续依赖 `/platform/users` route guard          |

## 4. 路由与权限边界

No Admin route or public API route is added or changed in this slice.

Existing consumed API surfaces:

| Surface                                                           | Permission              | Source | Result   |
| ----------------------------------------------------------------- | ----------------------- | ------ | -------- |
| `GET /api/platform/users/{id}/external-identities`                | `platform:users:manage` | EX-64C | Consumed |
| `POST /api/platform/users/{id}/external-identities`               | `platform:users:manage` | EX-64C | Consumed |
| `POST /api/platform/external-identities/{id}:unbind`              | `platform:users:manage` | EX-64C | Consumed |
| `GET /api/platform/identity-provider-oauth-grants/{id}`           | `platform:users:manage` | EX-64D | Consumed |
| `GET /api/platform/identity-provider-oauth-grants/{id}:authorize` | `platform:users:manage` | EX-64D | Consumed |
| `GET /api/platform/identity-providers/{id}/external-users`        | `platform:users:manage` | EX-64D | Consumed |

## 5. 读写边界

| Operation        | Generated API                                                            | UI Behavior                                    | Result    |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------- | --------- |
| List bindings    | `externalIdentityControllerListUserExternalIdentities`                   | 用户详情展示绑定状态和解绑入口                 | G1 frozen |
| List configs     | `identityProviderControllerListIdentityProviderConfigs`                  | 绑定弹窗选择可绑定 / 可搜索 provider config    | G1 frozen |
| Load grant       | `identityProviderOAuthGrantControllerGetCurrentAdminProviderGrant`       | 展示当前管理员授权状态                         | G1 frozen |
| Authorize grant  | `identityProviderOAuthGrantControllerAuthorizeCurrentAdminProviderGrant` | 打开 provider 授权 URL，并允许刷新授权状态     | G1 frozen |
| Search candidate | `identityProviderControllerSearchExternalUsers`                          | 按姓名模糊搜索候选人                           | G1 frozen |
| Bind candidate   | `externalIdentityControllerBindUserExternalIdentity`                     | 从候选人字段生成 bind request                  | G1 frozen |
| Unbind           | `externalIdentityControllerUnbindExternalIdentity`                       | 使用 binding `rowVersion` 作为 expectedVersion | G1 frozen |

## 6. 持久化边界

N/A. 本片不触及 migration、entity、DDL 或 seed。

## 7. 测试与校验

| Check               | Required   | Command / Evidence                                                                       | Result     |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------- | ---------- |
| Admin focused tests | Yes        | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-external-identity` | Pending G3 |
| User list test      | If touched | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=user-list`              | Pending G3 |
| Admin data lint     | Yes        | `corepack pnpm nx lint admin-data-access`                                                | Pending G3 |
| Admin lint          | Yes        | `corepack pnpm nx lint poms-admin`                                                       | Pending G3 |
| Admin build         | Yes        | `corepack pnpm nx build poms-admin`                                                      | Pending G3 |
| Markdown            | Yes        | `corepack pnpm run format:md:check`; `git diff --check`                                  | Pending G3 |
| API lint / build    | No         | N/A                                                                                      | N/A        |
| OpenAPI / migration | No         | N/A                                                                                      | N/A        |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - 只消费 `EX-64C` / `EX-64D` 既有 generated client，不修改后端契约。
  - 首绑入口必须通过 Feishu 姓名模糊搜索候选确认，不要求管理员提前掌握手机号或邮箱。
  - `FE-59C` 登录页和登录 callback 体验不在本片内混入。
