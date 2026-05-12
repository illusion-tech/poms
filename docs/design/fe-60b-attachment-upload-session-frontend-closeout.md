# FE-60B 附件面板 Upload Session 上传体验 G3 / G4 Closeout

- Baseline: `docs/design/fe-60b-attachment-upload-session-frontend-baseline.md`
- Parent: `FE-60`
- Owner: `Codex`
- Closeout Date: `2026-05-12`
- Gate Status: `G4 / Done`

## 1. 交付摘要

1. `AttachmentStore` 暴露 `uploadProgress` 前端状态，上传附件 / 新版本统一走 create session -> upload target -> upload object -> complete。
2. local provider 使用 POMS proxy upload target；Huawei OBS S3-compatible 使用 presigned PUT，二者都通过 `HttpClient` upload events 更新进度。
3. 上传中支持用户主动中止；若用户在 session 创建早期点击中止，store 会记录中止意图，并在 session 创建成功后立即 abort 后端会话。
4. 上传失败后保留当前文件、分类、安全级别、显示名和说明，用户可直接重试并创建新的 upload session。
5. `AttachmentPanel` 的上传附件和上传新版本 dialog 均展示阶段、上传模式、进度、失败信息和中止按钮，保存中禁止关闭 dialog。
6. 各业务页面中嵌入附件面板的测试 mock 已补齐 `uploadProgress` / `clearUploadProgress` / `abortCurrentUpload` 最小契约。

## 2. 文件范围

| Area        | Files                                                                                                                                                           | Notes                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Data access | `libs/admin/data-access/src/lib/attachment/attachment.store.ts`, `libs/admin/data-access/src/index.ts`                                                          | upload session 进度状态、proxy / presigned PUT、abort。 |
| UI          | `apps/poms-admin/src/app/shared/ui/attachment-panel.ts`                                                                                                         | 上传 / 新版本 dialog 进度、失败重试和中止体验。         |
| Tests       | `apps/poms-admin/src/app/shared/ui/attachment-panel.spec.ts`, `customer-list.spec.ts`, `contract-detail.spec.ts`, `lead-list.spec.ts`, `project-detail.spec.ts` | 覆盖面板行为，并补嵌入页 mock 契约。                    |
| Governance  | 本 closeout、baseline、tracker、progress                                                                                                                        | FE-60B 和 FE-60 推进到 `Done / G4`。                    |

## 3. 验证结果

| Check                  | Command                                                             | Result                        |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------- |
| Admin test sweep       | `corepack pnpm nx test poms-admin --skip-nx-cache`                  | Pass, 42 suites / 240 tests。 |
| Admin lint             | `corepack pnpm nx lint poms-admin --skip-nx-cache`                  | Pass                          |
| Data-access lint       | `corepack pnpm nx lint admin-data-access --skip-nx-cache`           | Pass                          |
| Admin production build | `corepack pnpm nx build poms-admin --skip-nx-cache`                 | Pass                          |
| Markdown format        | `corepack pnpm run format:md` / `corepack pnpm run format:md:check` | Pass                          |
| Diff sanity            | `git diff --check`                                                  | Pass                          |

## 4. 例外与后续

| Exception ID                            | Status   | Notes                                                                                            |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `FE60B-E1-REAL-OBS-TENANT-NOT-RUN`      | accepted | 本地没有真实 OBS 租户凭据；生产启用前仍需验证 presigned PUT 的 CORS、headers、下载和预览 smoke。 |
| `FE60B-E2-MULTIPART-UI-DEFERRED`        | accepted | 第一版仅支持 local proxy 与 presigned PUT；multipart UI 留给后续大文件上传增强。                 |
| `FE60B-E3-BROWSER-UPLOAD-SMOKE-NOT-RUN` | accepted | 当前验证使用单测、lint 和 production build；真实文件上传 smoke 需要后端、登录态和测试数据配合。  |

## 5. G4 结论

- `FE-60B` 已完成 `G4 / Done`。
- `FE-60A` 和 `FE-60B` 均已完成，`FE-60` parent 可关闭为 `G4 / Done`。
- 本片未新增后端 route、DTO、OpenAPI schema、generated client 或 migration；API route inventory 无需变更。
