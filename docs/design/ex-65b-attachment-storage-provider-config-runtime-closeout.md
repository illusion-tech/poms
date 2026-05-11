# EX-65B 附件存储 Provider 配置持久化、密钥治理与测试连接 API G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `api + persistence + generated client`
- Tracker Row: `EX-65B`
- Baseline: `docs/design/ex-65b-attachment-storage-provider-config-runtime-baseline.md`
- Upstream Baseline: `docs/design/ex-65a-attachment-storage-provider-upload-session-baseline.md`

## 1. 交付范围

1. 新增 `attachment_storage_provider_config` 表、MikroORM entity、repository、service、controller 和 module wiring。
2. 新增 `local` / `huawei-obs-s3` provider config shared contracts、API DTO、OpenAPI schema 和 generated shared API client。
3. 新增 `platform:attachment-storage-providers:manage` 权限，并在 migration 中给 `platform-admin` 角色补齐权限。
4. Provider 配置 API 已落地：
   - `GET /platform/attachment-storage-providers`
   - `POST /platform/attachment-storage-providers`
   - `GET /platform/attachment-storage-providers/{id}`
   - `PATCH /platform/attachment-storage-providers/{id}`
   - `POST /platform/attachment-storage-providers/{id}:testConnection`
   - `POST /platform/attachment-storage-providers/{id}:set-default`
5. 抽象 `SecretCipherService`，外部身份 provider 与附件存储 provider 共享 AES-GCM 密钥加密能力；外部身份 provider 保持既有 env key 优先级。
6. AK / SK 只写不读，API 只返回 configured booleans；audit snapshot 不记录 secret 明文或加密密文。
7. 本片完成 local / OBS 配置完整性校验、active / default 约束和乐观版本检查；真实 OBS 网络连通性由 `EX-65C` / `EX-65E` 补证据。
8. Route inventory 中 `EX-65B` 六条 provider config route 已由 `planned` 切为 `aligned`。

本片不实现 provider registry、OBS SDK / S3 client、对象读写、presigned URL、multipart 上传、upload session 表或前端配置页；这些由 `EX-65C`、`EX-65D` 和 `FE-60A` 承接。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                                |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Route inventory -> route    | Pass   | 六条 provider config route 已使用 `EX-65A` canonical route，并切为 `aligned`。                                          |
| DTO -> controller / service | Pass   | Shared contracts -> API DTO -> controller input / output -> OpenAPI -> generated client 已贯通。                        |
| Migration -> entity -> DDL  | Pass   | `attachment_storage_provider_config` 的默认值、check、表达式唯一索引、table / column comment 已与 Mikro metadata 对齐。 |
| Guard / permission          | Pass   | Provider config API 统一使用 `platform:attachment-storage-providers:manage`。                                           |
| Secret handling             | Pass   | Secret 进入 DB 前 AES-GCM 加密；响应与 audit snapshot 均只暴露 configured booleans。                                    |

## 3. Drift 处理

| Drift ID                             | Classification            | Resolution                                                                                                            |
| ------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `EX65B-D1-SECRET-CIPHER-ABSTRACTION` | `expected-design-drift`   | `EX-65A` 要求 provider secret 能模块化复用；已抽象 `SecretCipherService`，并让 identity provider 改为消费该服务。     |
| `EX65B-D2-REAL-OBS-NETWORK-TEST`     | `accepted-exception`      | `testConnection` 只做本地配置完整性校验；真实 OBS network test 留给 `EX-65C` provider registry 或 `EX-65E` closeout。 |
| `EX65B-D3-OPENAPI-GEN-WARNINGS`      | `existing-baseline-drift` | OpenAPI generator 仍提示既有 `propertyNames` warning；client generate / check 均通过，本片不改既有 schema。           |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                                                                                                                                                     | Result                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                            | Pass                        |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/core/secret/secret-cipher.service.spec.ts src/app/features/attachment/attachment-storage-provider.service.spec.ts src/app/features/attachment/attachment-storage-provider.controller.spec.ts src/app/features/identity-provider/identity-provider.service.spec.ts --skip-nx-cache` | Pass, 4 suites / 36 tests   |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                            | Pass, 59 suites / 650 tests |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                           | Pass                        |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                                                                                                         | Pass                        |
| OpenAPI                | `corepack pnpm nx run poms-api:openapi --skip-nx-cache`                                                                                                                                                                                                                                                                                     | Pass                        |
| Generated client       | `corepack pnpm nx run shared-api-client:generate --skip-nx-cache`                                                                                                                                                                                                                                                                           | Pass                        |
| Generated client check | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                                                                                                                                                                                                                                              | Pass                        |
| Migration apply        | `corepack pnpm nx run poms-api:migration-up --skip-nx-cache`                                                                                                                                                                                                                                                                                | Pass                        |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                                                                                                             | Pass, schema is up-to-date  |
| Markdown / diff sanity | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                                      | Pass                        |

## 5. G4 结论

- `EX-65B`: `Done / G4`
- `EX-65` parent remains `Doing`.
- `EX-65C` is the next backend slice and may consume the provider config table, default provider semantics, secret decrypt utility, OpenAPI and generated client delivered here.
