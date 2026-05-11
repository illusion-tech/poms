# EX-65D Upload Session API、OBS 签名上传与旧上传入口 Direct Cutover G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `public api + persistence + upload runtime`
- Tracker Row: `EX-65D`
- Baseline: `docs/design/ex-65d-attachment-upload-session-runtime-baseline.md`
- Upstream Slices: `EX-65A` ~ `EX-65C`

## 1. 交付范围

1. 新增 `attachment_upload_session` 表、MikroORM entity、repository 能力和 migration，保存 upload session operation、status、provider snapshot、storage key、file metadata、target、TTL 和 row version。
2. 新增 upload session shared contracts、API DTO、controller 和 service:
   - `POST /attachment-upload-sessions`
   - `GET /attachment-upload-sessions/{id}`
   - `POST /attachment-upload-sessions/{id}/upload-targets`
   - `PUT /attachment-upload-sessions/{id}/object`
   - `POST /attachment-upload-sessions/{id}:complete`
   - `POST /attachment-upload-sessions/{id}:abort`
3. Local provider 上传改为后端 proxy target；对象写入发生在 `PUT /attachment-upload-sessions/{id}/object`，complete 前不创建 active attachment row。
4. Huawei OBS S3-compatible provider 支持短期 SigV4 query presigned PUT target；前端只拿 upload URL、method、headers 和 expiry，不拿 AK / SK、bucket 写权限或永久对象 URL。
5. `complete` 由后端执行 `headObject`、size 校验和 checksum 校验，通过后才创建新附件首版或新版本，并写入既有 link / version / latest 语义。
6. 移除旧 public multipart upload routes:
   - `POST /attachments`
   - `POST /attachments/{id}/versions`
7. 重新生成 OpenAPI 和 shared API client，新增 `AttachmentUploadSessionApi`，移除旧 upload operation。
8. `AttachmentStore` 增加最小 adapter：既有前端调用点内部切换为 create session -> upload target -> proxy / direct PUT -> complete，保证 `poms-admin` build 在 `FE-60B` 前不被旧 client 删除打断。

本片不完成完整附件面板上传 UX、上传进度、失败重试、用户主动 abort 入口、真实 Huawei OBS 租户联调或历史 local 文件迁移；这些由 `FE-60B` 和 `EX-65E` 承接。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                                    |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Route inventory -> route    | Pass   | `api-route-canonical-inventory.md` 已把六条 upload session routes 切为 `aligned`，旧 multipart routes 记录 direct cutover。 |
| DTO -> controller / service | Pass   | Shared contracts、API DTO、controller、OpenAPI 和 generated client 均使用 `AttachmentUploadSession*` 命名。                 |
| Migration -> entity -> DDL  | Pass   | `attachment_upload_session` migration 经 `migration-up`、`migration-down`、再次 `migration-up` 与 `migration-check` 验证。  |
| Provider target selection   | Pass   | Session 创建时冻结 provider / bucket / storage key；local 返回 proxy，OBS 返回 presigned PUT。                              |
| Complete validation         | Pass   | Complete 读取 provider head，校验 size，并读取对象计算 sha256 后再创建 active attachment / version。                        |
| Frontend build impact       | Pass   | Admin `AttachmentStore` 已转用 generated upload session client 和 raw `HttpClient` presigned PUT。                          |
| Secret handling             | Pass   | API response 不暴露 secret、access key、secret key、bucket 写凭据或永久 public URL。                                        |

## 3. Drift / Exception 处理

| ID                                   | Classification            | Resolution                                                                                                                                             |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EX65D-E1-FE60B-FRONTEND-CUTOVER`    | `closed-exception`        | 已在本片补最小 `AttachmentStore` adapter，旧 upload generated client 删除后 `poms-admin` build 仍通过；完整 UX 仍由 `FE-60B` 承接。                    |
| `EX65D-E2-REAL-OBS-INTEGRATION`      | `accepted-exception`      | 本地使用 SigV4 presigned PUT 单测覆盖 URL / query / header shape；真实 OBS 租户证据由 `EX-65E` 收口。                                                  |
| `EX65D-E3-MULTIPART-TARGET-DEFERRED` | `accepted-exception`      | 当前 OBS runtime 先交付 presigned PUT；multipart initiation / part targets / complete-multipart 不在本片落地，需由 `EX-65E` 判定保留为后续增强或另拆。 |
| `EX65D-D1-OPENAPI-GEN-WARNINGS`      | `existing-baseline-drift` | OpenAPI generator 继续提示既有 `propertyNames` warning；generate / check 均通过，本片不改既有 `z.record` schema 形态。                                 |

## 4. 验证结果

| Check                   | Command / Evidence                                                                                                                                                                                                                                                                         | Result                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| API build               | `corepack pnpm nx build poms-api`                                                                                                                                                                                                                                                          | Pass                        |
| Admin build             | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                                                                        | Pass                        |
| API lint                | `corepack pnpm nx lint poms-api`                                                                                                                                                                                                                                                           | Pass                        |
| Admin lint              | `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`                                                                                                                                                                                                              | Pass                        |
| API focused tests       | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/attachment/attachment.service.spec.ts src/app/features/attachment/attachment-storage-provider-registry.service.spec.ts src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.spec.ts --runInBand` | Pass, 3 suites / 21 tests   |
| API full tests          | `corepack pnpm nx test poms-api --runInBand`                                                                                                                                                                                                                                               | Pass, 62 suites / 665 tests |
| Admin full tests        | `corepack pnpm nx test poms-admin --runInBand`                                                                                                                                                                                                                                             | Pass, 40 suites / 223 tests |
| OpenAPI generation      | `corepack pnpm nx run poms-api:openapi`                                                                                                                                                                                                                                                    | Pass                        |
| Generated client        | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`                                                                                                                                                                                          | Pass                        |
| Migration apply / drift | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-down`; `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                                                                                                | Pass, schema is up-to-date  |
| Diff sanity             | `git diff --check`                                                                                                                                                                                                                                                                         | Pass                        |

`shared-contracts` 和 `api-contracts` 当前无 lint target；本片用 API/Admin lint、build、OpenAPI/client check 和 full tests 覆盖可执行验证面。

## 5. G4 结论

- `EX-65D`: `Done / G4`
- `EX-65` parent remains `Doing`; `EX-65E` 是下一后端收口切片。
- `FE-60A` 可开始 provider 配置卡片页。
- `FE-60B` 可基于 generated upload session client 和当前 store adapter 补齐真实上传 UX。
- `EX65D-E3-MULTIPART-TARGET-DEFERRED` 仍为开放例外；`EX-65E` 需要决定继续作为后续增强保留，或拆出明确 multipart upload target slice。
