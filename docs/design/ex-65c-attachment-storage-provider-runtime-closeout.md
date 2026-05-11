# EX-65C 附件存储 Provider Registry 与对象运行时 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk` / `backend runtime + provider abstraction`
- Tracker Row: `EX-65C`
- Baseline: `docs/design/ex-65c-attachment-storage-provider-runtime-baseline.md`
- Upstream Slices: `EX-65A`, `EX-65B`

## 1. 交付范围

1. 新增 `AttachmentObjectStorageProvider` runtime contract、`AttachmentStorageProviderRegistry`、local provider 和 `huawei-obs-s3` provider。
2. Registry 支持默认 provider 解析、legacy local fallback、read-time provider config 解析和 keyPrefix 最长匹配。
3. Local provider 支持本地 filesystem `put` / `head` / `read` / `delete` / `test`，保留 path traversal 防护。
4. Huawei OBS S3-compatible provider 支持 SigV4 header signing、path-style / virtual-hosted style URL、`put` / `head` / `read` / `delete` / bucket `HEAD` test 和错误映射。
5. 现有附件原始上传、新版本上传、下载、预览、缩略图、批量下载包生成 / 读取和 best-effort cleanup 已全部通过 registry。
6. Provider config `testConnection` 已升级为调用 runtime provider test；完整 OBS config 会触发 signed bucket `HEAD` 请求，失败时返回 failed test result。

本片不新增 public route、DTO、OpenAPI、generated client、migration、upload session、presigned URL、multipart 上传或前端页面。

## 2. 一致性结论

| Edge                        | Result | Evidence                                                                                                        |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Document -> code            | Pass   | 实现范围保持在 provider runtime 和现有读写路径接入；未新增 upload session route。                               |
| Public route surface        | Pass   | 未修改 controller route / DTO / OpenAPI；`EX-65B` provider config routes 保持 aligned。                         |
| Provider registry -> reads  | Pass   | download / preview / thumbnail / batch package read 均传入 provider + bucket + key location。                   |
| Provider registry -> writes | Pass   | existing multipart upload 和 package write 使用 enabled active default provider；无 default 时 fallback local。 |
| Secret handling             | Pass   | OBS AK / SK 只在 registry 构建 runtime config 时解密，不进入 response、audit snapshot 或 log。                  |
| Persistence                 | Pass   | 本片无 migration；`migration-check` 显示 schema is up-to-date。                                                 |

## 3. Drift / Exception 处理

| ID                                  | Classification          | Resolution                                                                                                                           |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `EX65C-D1-LEGACY-LOCAL-FALLBACK`    | `expected-design-drift` | `EX-65A` 要求历史 local 附件仍可读；registry 在无匹配 config 时对 local provider 使用 implicit local config。                        |
| `EX65C-D2-NO-PRESIGNED-UPLOAD`      | `accepted-exception`    | 本片只提供后端对象操作能力；前端直传、presigned put 和 multipart target 仍由 `EX-65D` 实现。                                         |
| `EX65C-D3-REAL-OBS-TENANT-OPTIONAL` | `accepted-exception`    | 本地验证使用 mocked fetch 覆盖 SigV4 header、URL、metadata 和 bucket HEAD；真实 Huawei OBS 租户证据由部署或 `EX-65E` closeout 补齐。 |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Result                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| API lint               | `corepack pnpm nx lint poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass, no warnings                       |
| API focused tests      | `corepack pnpm nx test poms-api --runTestsByPath src/app/features/attachment/attachment-storage-provider-registry.service.spec.ts src/app/features/attachment/local-attachment-object-storage.provider.spec.ts src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.spec.ts src/app/features/attachment/attachment-storage-provider.service.spec.ts src/app/features/attachment/attachment.service.spec.ts src/app/features/attachment/attachment-handover.service.spec.ts --skip-nx-cache` | Pass, 6 suites / 28 tests               |
| API full tests         | `corepack pnpm nx test poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass, 62 suites / 661 tests             |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pass                                    |
| Migration drift        | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Pass, schema is up-to-date              |
| OpenAPI / client       | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Not required; no public contract change |
| Markdown / diff sanity | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`; `git diff --check`                                                                                                                                                                                                                                                                                                                                                                                                                              | Pass                                    |

## 5. G4 结论

- `EX-65C`: `Done / G4`
- `EX-65` parent remains `Doing`.
- `EX-65D` is the next backend slice and may consume provider registry `put` / `head` / `read` / `delete` / `test` capabilities to implement upload sessions, local proxy upload targets, OBS presigned put / multipart and old multipart upload direct cutover.
