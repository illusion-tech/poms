# EX-65E 附件存储 Provider 收口验证、存量读取与回滚 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `integration closeout + regression evidence`
- Tracker Row: `EX-65E`
- Baseline: `docs/design/ex-65e-attachment-storage-provider-integration-closeout-baseline.md`
- Upstream Slices: `EX-65A` ~ `EX-65D`

## 1. 交付范围

1. 补齐读侧 focused regression:
   - legacy local attachment download 仍通过 `AttachmentStorageService.openReadStream` 读取。
   - 图片 thumbnail 仍通过同一受控 storage location 读取。
   - ready 项目移交下载包仍通过 `storageLocationForDownloadPackage` 读取并记录下载审计。
2. 复核既有 evidence:
   - local provider `put/head/read/delete/test`。
   - registry legacy local fallback、disabled provider historical read 和 upload plan provider snapshot。
   - OBS S3-compatible SigV4 PUT、HEAD、bucket testConnection 和 presigned PUT target。
   - upload session local proxy / OBS presigned target / complete 校验。
3. 复核 public route inventory：`B14` provider config / upload session routes 已 `aligned`，旧 multipart upload routes 已由 `EX-65D` 记录 direct cutover。
4. 固化回滚策略和生产前 OBS 启用检查。
5. 回写 `phase2-development-execution-tracker.md`、`poms-design-progress.md` 和 `current-drift-inventory.md`。

本片不新增 route、DTO、OpenAPI schema、generated client、migration 或前端页面。

## 2. 一致性结论

| Edge                       | Result | Evidence                                                                                                                |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Document -> tests          | Pass   | `EX-65E` 要求的历史 local read 和 package read 已补 focused regression。                                                |
| Route inventory -> runtime | Pass   | 本片无 route surface 变化；`api-route-canonical-inventory.md` 中 EX-65 rows 仍为 `aligned`。                            |
| Provider registry -> reads | Pass   | `AttachmentStorageProviderRegistry` 覆盖 implicit local fallback、disabled provider historical read 和 keyPrefix 匹配。 |
| Upload session -> writes   | Pass   | `EX-65D` tests 覆盖 create session 不提前建附件、proxy upload、complete 校验后创建附件。                                |
| OBS evidence substitution  | Pass   | Huawei provider tests 覆盖 signed PUT/head/testConnection/presigned PUT；真实 OBS 租户作为生产启用前验证项。            |
| OpenAPI / generated client | Pass   | `openapi` 与 `shared-api-client:check` 通过；本片未引入新的 contract drift。                                            |
| Migration -> entity -> DDL | Pass   | `migration-check` 通过；`EX-65D` 新表已经和 Mikro metadata 对齐。                                                       |
| Secret / URL exposure      | Pass   | API response 不暴露 provider secret、AK / SK、bucket 写权限或永久 public URL；presigned PUT 只短期授予对象写入。        |

## 3. 回滚策略

1. Provider 层回滚: 在附件存储 provider 配置中禁用 OBS 或把默认 provider 切回 local；新 upload session 会停止选择被禁用 provider。
2. 读侧回滚: 已有附件行保留 `storageProvider` / `storageBucket` / `storageKey` snapshot；禁用 provider 不阻断历史对象读取，local 无匹配配置时使用 implicit local fallback。
3. 上传会话回滚: 若需要回滚 `EX-65D` 代码，先暂停新上传入口，再执行 `poms-api:migration-down` 移除 `attachment_upload_session` 表；已 completed 的附件行仍按 existing attachment read path 读取。
4. OBS 配置回滚: AK / SK 只写不读；轮换或撤销凭据时在配置页重新写入 secret，旧 secret 不回显。
5. 生产启用检查: 启用 OBS default 前必须运行 provider `testConnection`、一次 presigned PUT 上传、complete 校验和受控下载烟测。

## 4. Drift / Exception 处理

| ID                                       | Handling                             | Resolution                                                                                                            |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `EX65A-E1-REAL-OBS-INTEGRATION-DEFERRED` | `accepted-exception`                 | 本地无真实 OBS 租户；以 SigV4 provider tests 和生产启用 checklist 关闭代码侧阻塞，真实环境验证转交 deployment / ops。 |
| `EX65B-D2-REAL-OBS-NETWORK-TEST`         | `accepted-exception`                 | `testConnection` 已走 runtime provider test；本地以 mocked signed bucket HEAD 覆盖，生产启用前必须用真实凭据复测。    |
| `EX65C-D3-REAL-OBS-TENANT-OPTIONAL`      | `accepted-exception`                 | OBS put/head/read/delete/test 签名路径已有 mock evidence；真实租户不作为本地 G4 blocker。                             |
| `EX65D-E2-REAL-OBS-INTEGRATION`          | `accepted-exception`                 | Presigned PUT URL / query / header shape 已由 focused test 覆盖；真实上传下载烟测进入生产启用 checklist。             |
| `EX65D-E3-MULTIPART-TARGET-DEFERRED`     | `reclassified-to-future-enhancement` | 当前默认上传上限为 50MB，presigned PUT 可支撑第一版直传；multipart 作为未来大文件上传增强，不阻塞 `EX-65` 最小闭环。  |
| `EX65E-D1-OPENAPI-GEN-WARNINGS`          | `existing-baseline-drift`            | OpenAPI generator 继续提示既有 `propertyNames` warning；generate / check 通过，本片不改既有 `z.record` schema 形态。  |

当前无新增 public route、contract、migration 或 storage location drift。

## 5. 验证结果

| Check                      | Command / Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Result                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| API focused read tests     | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/attachment/attachment.service.spec.ts src/app/features/attachment/attachment-handover.service.spec.ts --runInBand`                                                                                                                                                                                                                                                                                                                            | Pass, 2 suites / 17 tests                    |
| API focused provider tests | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/attachment/attachment-storage-provider-registry.service.spec.ts src/app/features/attachment/local-attachment-object-storage.provider.spec.ts src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.spec.ts src/app/features/attachment/attachment-storage-provider.service.spec.ts src/app/features/attachment/attachment.service.spec.ts src/app/features/attachment/attachment-handover.service.spec.ts --runInBand` | Pass, 6 suites / 35 tests                    |
| API full tests             | `corepack pnpm nx test poms-api --runInBand`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass, 62 suites / 668 tests                  |
| API lint                   | `corepack pnpm nx lint poms-api`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Pass                                         |
| API build                  | `corepack pnpm nx build poms-api`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Pass                                         |
| Admin build                | `corepack pnpm nx build poms-admin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Pass                                         |
| OpenAPI                    | `corepack pnpm nx run poms-api:openapi`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Pass                                         |
| Generated client           | `corepack pnpm nx run shared-api-client:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Pass; existing `propertyNames` warnings only |
| Migration drift            | `corepack pnpm nx run poms-api:migration-check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Pass, schema is up-to-date                   |
| Markdown / diff sanity     | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                                                                                                                                                                                                          | Pass                                         |

## 6. G4 结论

- `EX-65E`: `Done / G4`.
- `EX-65`: `Done / G4`.
- First-version attachment storage provider minimum loop is closed: provider config, provider runtime, local proxy upload, OBS presigned PUT upload, upload session complete validation, historical local reads and rollback guidance are now covered.
- `FE-60A` and `FE-60B` are the next ordered frontend slices.
