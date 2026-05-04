# FE-48 / FE-49 附件前端体验 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-05`
- Owner: `Codex`
- Slice Type: `frontend-only` with navigation / permission SSOT update
- Tracker Rows: `FE-48`, `FE-49`

## 1. 交付范围

### FE-48

- `AttachmentPanel` 已接入受鉴权 blob 预览。
- 支持图片内嵌预览和 PDF iframe 预览。
- 支持版本历史查看。
- 支持上传新版本并填写版本说明。
- 支持标记最终版和撤销最终版。
- 附件列表展示版本号、latest、final、预览支持和版本说明。
- 作废原因从线索专用文案收口为通用附件面板文案。

### FE-49

- 新增 `/attachments` 正式业务路由。
- 新增“附件中心”只读页面。
- 新增 `AttachmentCenterStore`, 基于当前用户可读客户、线索、项目、合同聚合 latest 附件。
- 支持按关键字、业务对象、附件分类、上传人和上传日期过滤。
- 支持从附件行跳回来源业务对象。
- 新增动态导航项和静态 fallback 菜单项。
- 新增 `nav:attachments:view` 菜单可见性权限, 并同步 OpenAPI / generated client。

## 2. 明确不做

- 不新增后端全局附件检索 API。
- 不做网盘式目录树。
- 不做外链分享、批量下载或附件跨对象移动。
- 不做 Office 在线预览、OCR 或全文检索。
- 不改变 EX-51 后端版本链和最终版语义。

## 3. 关键一致性结论

| Edge                         | Result | Evidence                                                                                                     |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Document -> code             | Pass   | FE-48 / FE-49 baseline 与实现范围一致。                                                                      |
| Route -> component           | Pass   | `/attachments` route lazy-loads `AttachmentCenter`; existing attachment entries still use `AttachmentPanel`. |
| Navigation SSOT -> menu      | Pass   | `NAVIGATION_TREE` 新增 `attachments`; static fallback 同步。                                                 |
| Permission SSOT -> generated | Pass   | `nav:attachments:view` 已进入 shared contracts、OpenAPI 和 generated client。                                |
| API surface                  | Pass   | 本轮只消费 EX-51 attachment routes, 未新增后端 public route。                                                |
| Query -> view                | Pass   | FE-49 前端聚合现有业务 list API 和 attachment list API, 单目标失败降级为 warning。                           |

## 4. 验证结果

| Check                  | Command                                                                                                                                                                 | Result | Notes                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| Generated client sync  | `corepack pnpm nx run shared-api-client:generate`                                                                                                                       | Pass   | `nav:attachments:view` 已生成。                 |
| Admin focused tests    | `corepack pnpm nx test poms-admin --runInBand --runTestsByPath apps/poms-admin/src/app/features/attachment/attachment-center.spec.ts`                                   | Pass   | 新增附件中心测试通过。                          |
| Admin full tests       | `corepack pnpm nx test poms-admin --runInBand`                                                                                                                          | Pass   | 33 suites / 180 tests。                         |
| API focused tests      | `corepack pnpm nx test poms-api --runInBand --runTestsByPath src/app/features/navigation/navigation.service.spec.ts src/app/features/platform/platform.service.spec.ts` | Pass   | 2 suites / 68 tests。                           |
| Admin lint             | `corepack pnpm nx lint poms-admin`                                                                                                                                      | Pass   | No lint errors.                                 |
| API lint               | `corepack pnpm nx lint poms-api`                                                                                                                                        | Pass   | No lint errors.                                 |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                                                                                                     | Pass   | Existing initial bundle budget warning remains. |
| API build              | `corepack pnpm nx build poms-api --skip-nx-cache`                                                                                                                       | Pass   | Webpack build passed.                           |
| Generated client check | `corepack pnpm nx run shared-api-client:check`                                                                                                                          | Pass   | Client matches OpenAPI.                         |
| Markdown format check  | `corepack pnpm run format:md:check`                                                                                                                                     | Pass   | Touched docs formatted.                         |
| Diff check             | `git diff --check`                                                                                                                                                      | Pass   | Git reports LF normalization warning only.      |

## 5. 风险与留白

| Risk ID                | Status   | Scope            | Notes                                                                                          |
| ---------------------- | -------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `FE49-R1-FRONTEND-AGG` | Accepted | 附件中心只读检索 | 当前无后端全局附件检索 API, 前端按可读业务对象聚合; 大数据量需后续后端切片。                   |
| `FE48-R1-BLOB-PREVIEW` | Accepted | 图片 / PDF 预览  | 预览通过 HttpClient blob object URL 承载, 避免 bearer token 下直接 iframe 访问受鉴权路由失败。 |

## 6. G4 结论

- `FE-48`: `Done / G4`
- `FE-49`: `Done / G4`
- `EX-53`: 已在此前完成 `Done / G4`, 本轮未重开。
