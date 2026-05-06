# EX-64B Provider 配置持久化、后端 API 与密钥治理 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-07`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api + persistence + generated client`
- Tracker Row: `EX-64B`
- Baseline: `docs/design/ex-64a-external-identity-provider-governance-baseline.md`

## 1. 交付范围

1. 新增 `identity_provider_config` 表、MikroORM entity、repository、service、controller 和 module。
2. 新增 provider-neutral shared contracts、API DTO、OpenAPI schema 和 generated shared API client。
3. 新增 `platform:identity-providers:manage` 权限，并在 migration 中给 `platform-admin` 角色补齐权限。
4. 管理 API 已落地：
   - `GET /platform/identity-providers`
   - `POST /platform/identity-providers`
   - `GET /platform/identity-providers/{id}`
   - `PATCH /platform/identity-providers/{id}`
   - `POST /platform/identity-providers/{id}:testConnection`
5. Provider secret 只写不读，API 只返回 `secretConfigured`；audit snapshot 不记录明文 secret 或加密 secret。
6. 第一版仅允许 `searchGrantMode = per-admin`；`service-account` 保留为 future enum 但运行时拒绝启用。
7. Route inventory 中 `EX-64B` 五条 route 已由 `planned` 切为 `aligned`。

本片不实现 external identity 绑定、飞书姓名模糊搜索、per-admin grant 存储、外部登录会话桥接或前端页面；这些分别由 `EX-64C`、`EX-64D`、`EX-64E` 和 `FE-59` 承接。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                       |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Route inventory -> route    | Pass   | 五条 provider config route 已使用 `EX-64A` canonical route 并切为 `aligned`。                                  |
| DTO -> controller / service | Pass   | Shared contracts -> API DTO -> controller input / output -> OpenAPI -> generated client 已贯通。               |
| Migration -> entity -> DDL  | Pass   | `identity_provider_config` 的默认值、check、表达式唯一索引和 table / column comment 已与 Mikro metadata 对齐。 |
| Guard / permission          | Pass   | Provider config API 统一使用 `platform:identity-providers:manage`。                                            |
| Secret handling             | Pass   | Secret 进入 DB 前 AES-GCM 加密；响应与 audit snapshot 均只暴露 `secretConfigured`。                            |

## 3. Drift 处理

| Drift ID                        | Classification            | Resolution                                                                                                                       |
| ------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `EX64B-D1-PROVIDER-DEFAULT`     | `new-real-drift`          | `migration-check` 发现 entity 期望 `provider` 默认值；已补入 migration / entity，并用 `schema:update --run --safe` 同步本地库。  |
| `EX64B-D2-ORM-METADATA-CHECKS`  | `new-real-drift`          | 手写 migration 已有 check / comment / 表达式唯一索引但 entity metadata 缺失；已补齐 entity checks、index expression 和 comment。 |
| `EX64B-D3-OPENAPI-GEN-WARNINGS` | `existing-baseline-drift` | OpenAPI generator 仍提示既有 `propertyNames` warning；client generate / check 均通过，本片不改既有 schema。                      |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                        | Result |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                               | Pass   |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/identity-provider/identity-provider.service.spec.ts src/app/features/identity-provider/identity-provider.controller.spec.ts --skip-nx-cache` | Pass   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                               | Pass   |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                              | Pass   |
| OpenAPI                | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`                                                                                                                                                        | Pass   |
| Generated client       | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`                                                                                                                                              | Pass   |
| Generated client check | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                 | Pass   |
| Migration apply        | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`                                                                                                                                                   | Pass   |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                | Pass   |

## 5. G4 结论

- `EX-64B`: `Done / G4`
- `EX-64` parent remains `Doing`.
- `EX-64C` is the next backend slice and may consume the provider config table, permission, OpenAPI and generated client delivered here.
