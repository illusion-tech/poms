# EX-64C External identity 绑定模型与管理员绑定 API G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-07`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api + persistence + generated client`
- Tracker Row: `EX-64C`
- Baseline: `docs/design/ex-64a-external-identity-provider-governance-baseline.md`
- Upstream Runtime Slice: `EX-64B`

## 1. 交付范围

1. 新增 `external_identity` 表、MikroORM entity、repository 方法、service 命令和 controller。
2. 新增 provider-neutral shared contracts、API DTO、OpenAPI schema 和 generated shared API client。
3. 管理员绑定 API 已落地：
   - `GET /platform/users/{id}/external-identities`
   - `POST /platform/users/{id}/external-identities`
   - `POST /platform/external-identities/{id}:unbind`
4. 绑定 API 统一使用 `platform:users:manage`，继承既有 POMS 用户管理权限口径。
5. 绑定前校验 POMS 用户存在、provider config 存在且 enabled / active / bindingEnabled 为真。
6. 活跃绑定唯一性已落到 DB 与 service guard：
   - 同一 provider config + tenant + subject 只能有一个 active 绑定。
   - 同一 POMS user + provider config 只能有一个 active 绑定。
7. 解绑采用 status transition，不物理删除；支持 `expectedVersion` 乐观并发校验。
8. 绑定 / 解绑写入 runtime audit，记录 operator、POMS user、provider config、subject 与 tenant，保留 secret-free snapshot。
9. Route inventory 中 `EX-64C` 三条 route 已由 `planned` 切为 `aligned`。

本片不实现 Feishu adapter、per-admin OAuth grant、姓名模糊搜索、外部登录 callback / session 交换或前端绑定弹窗；这些分别由 `EX-64D`、`EX-64E` 和 `FE-59` 承接。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                             |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Route inventory -> route    | Pass   | 三条 external identity route 已使用 `EX-64A` canonical route 并切为 `aligned`。                      |
| DTO -> controller / service | Pass   | Shared contracts -> API DTO -> controller input / output -> OpenAPI -> generated client 已贯通。     |
| Migration -> entity -> DDL  | Pass   | `external_identity` 的 FK、check、表达式唯一索引和 table / column comment 已与 Mikro metadata 对齐。 |
| Guard / permission          | Pass   | 绑定列表、绑定和解绑 API 统一使用 `platform:users:manage`。                                          |
| Binding lifecycle           | Pass   | Active 绑定唯一性、解绑版本校验和 audit 记录均在 service / DB 层覆盖。                               |

## 3. Drift 处理

| Drift ID                        | Classification            | Resolution                                                                                                  |
| ------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EX64C-D1-ACTIVE-BINDING-UNIQ`  | `expected-implementation` | 基线要求同一外部 subject 与同一 POMS user 对 provider config 维持单 active 绑定；已用 partial unique 落库。 |
| `EX64C-D2-OPENAPI-GEN-WARNINGS` | `existing-baseline-drift` | OpenAPI generator 仍提示既有 `propertyNames` warning；client generate / check 均通过，本片不改既有 schema。 |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                                                                                                | Result |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Shared contracts build | `corepack pnpm nx build shared-contracts --skip-nx-cache`                                                                                                                                                                                                                              | Pass   |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/identity-provider/identity-provider.service.spec.ts src/app/features/identity-provider/identity-provider.controller.spec.ts src/app/features/identity-provider/external-identity.controller.spec.ts --skip-nx-cache` | Pass   |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                       | Pass   |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                      | Pass   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                       | Pass   |
| Generated client       | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`                                                                                                                                                                                                                      | Pass   |
| Generated client check | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                                                                                         | Pass   |
| Migration apply        | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`                                                                                                                                                                                                                           | Pass   |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                                                        | Pass   |

## 5. G4 结论

- `EX-64C`: `Done / G4`
- `EX-64` parent remains `Doing`.
- `EX-64D` is the next backend slice and may consume the provider config and external identity binding table, shared contracts, OpenAPI and generated client delivered by `EX-64B` / `EX-64C`.
