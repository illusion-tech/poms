# FE-60A 附件存储 Provider 配置卡片页 G3 / G4 Closeout

- Baseline: `docs/design/fe-60a-attachment-storage-provider-config-frontend-baseline.md`
- Parent: `FE-60`
- Owner: `Codex`
- Closeout Date: `2026-05-11`
- Gate Status: `G4 / Done`

## 1. 交付摘要

1. 新增 `AttachmentStorageProviderStore`，消费 `AttachmentStorageProviderApi` 的 list / create / update / testConnection / set-default generated client。
2. 新增 `/platform/attachment-storage-providers` route 和平台配置菜单入口，使用 `platform:attachment-storage-providers:manage` guard。
3. 新增附件存储 provider 展示映射、固定卡片组件和配置页面；页面固定展示 `local` 与 `huawei-obs-s3` 两张卡片，不提供任意新增 provider 入口。
4. 卡片复用现有 demo card 风格：实线边框、tag 状态、紧凑 action button；未配置卡片不使用 dashed border。
5. 表单支持 local / Huawei OBS S3-compatible 配置、启停、状态更新、keyPrefix、forcePathStyle、write-only AK / SK、测试连接和设默认。
6. 编辑 OBS 凭据时 AK / SK 留空不会覆盖已有密文；页面不回显 secret 明文、storage key 或永久对象 URL。

## 2. 文件范围

| Area        | Files                                                                                                                                                                                                                                             | Notes                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Data access | `libs/admin/data-access/src/lib/attachment-storage-provider/attachment-storage-provider.store.ts`, `libs/admin/data-access/src/index.ts`                                                                                                          | 新增 provider config store 与 re-export。   |
| UI          | `apps/poms-admin/src/app/features/platform/attachment-storage-provider-list.ts`, `apps/poms-admin/src/app/features/platform/attachment-storage-provider-card.ts`, `apps/poms-admin/src/app/shared/ui/attachment-storage-provider-presentation.ts` | 固定卡片页、表单 dialog、展示映射。         |
| Navigation  | `apps/poms-admin/src/app.routes.ts`, `apps/poms-admin/src/app/layout/components/app.menu.ts`                                                                                                                                                      | 新 route、permission guard、fallback menu。 |
| Tests       | `attachment-storage-provider-list.spec.ts`, `attachment-storage-provider-card.spec.ts`, `app.routes.spec.ts`                                                                                                                                      | 覆盖固定卡片、write-only secret、route。    |
| Governance  | 本 closeout、baseline、tracker、progress                                                                                                                                                                                                          | FE-60A 推进到 `Done / G4`。                 |

## 3. 验证结果

| Check                  | Command                                                                                                                                                                                                                                                                          | Result                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Page focused tests     | `corepack pnpm nx test poms-admin --runTestsByPath apps/poms-admin/src/app/features/platform/attachment-storage-provider-list.spec.ts apps/poms-admin/src/app/features/platform/attachment-storage-provider-card.spec.ts apps/poms-admin/src/app.routes.spec.ts --skip-nx-cache` | Pass, 1 suite / 8 tests。Nx/Jest 实际只选择到 list spec。             |
| Admin test sweep       | `corepack pnpm nx test poms-admin --runTestsByPath apps/poms-admin/src/app/features/platform/attachment-storage-provider-card.spec.ts --skip-nx-cache`                                                                                                                           | Pass, 42 suites / 237 tests；当前 Jest path 传参会退化为 admin 全量。 |
| Route test sweep       | `corepack pnpm nx test poms-admin --runTestsByPath apps/poms-admin/src/app.routes.spec.ts --skip-nx-cache`                                                                                                                                                                       | Pass, 42 suites / 237 tests；包含新增 route guard 断言。              |
| Admin lint             | `corepack pnpm nx lint poms-admin --skip-nx-cache`                                                                                                                                                                                                                               | Pass                                                                  |
| Data-access lint       | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                                                                                                                                                                                        | Pass                                                                  |
| Admin production build | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                                                                                                                              | Pass                                                                  |
| Markdown format        | `corepack pnpm run format:md` / `corepack pnpm run format:md:check`                                                                                                                                                                                                              | Pass                                                                  |
| Diff sanity            | `git diff --check`                                                                                                                                                                                                                                                               | Pass                                                                  |

## 4. 例外与后续

| Exception ID                          | Status      | Notes                                                                                          |
| ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `FE60A-E1-REAL-OBS-TENANT-NOT-RUN`    | accepted    | 本地无真实 OBS 租户凭据；生产启用前仍需运维执行真实 `testConnection` 和上传下载 smoke。        |
| `FE60A-E2-UPLOAD-SESSION-UX-DEFERRED` | transferred | 本片不改附件面板上传体验；完整 create session -> upload -> complete / abort 由 `FE-60B` 承接。 |

## 5. G4 结论

- `FE-60A` 已完成 `G4 / Done`。
- `FE-60` parent 继续保持 `Doing`，下一顺序为 `FE-60B` 附件面板 upload session 上传体验改造。
- 未新增后端 route、OpenAPI schema、generated client 或 migration；API route inventory 无需变更。
