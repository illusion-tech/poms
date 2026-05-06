# FE-48 附件预览、版本与最终版前端体验实施基线包

- Gate Status: `Pass`
- Parent: `EX-50`, `EX-51`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-05`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` -> `FE-48`

## 1. 范围

- 本次目标: 在复用 `AttachmentPanel` 中接入图片 / PDF 预览、版本历史、上传新版本、最终版标记 / 撤销和作废反馈。
- 本次明确不做: Office 在线预览、OCR、全文检索、外链分享、全局文件中心、批量下载或交接包。
- 下游可依赖的交付边界: 客户、线索、项目、合同既有附件入口共享同一套预览和版本体验。
- 不允许下游依赖的留白: 不承诺所有文件可预览; 不承诺缩略图必定存在; 不新增附件业务审批。

## 2. 正式输入

| Input Type             | Document / Source                                                | Status  | Notes                                                                                                |
| ---------------------- | ---------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| Business design        | `docs/design/ex-50-attachment-preview-version-final-baseline.md` | Frozen  | 图片 / PDF 预览、版本链、latest、final 和缩略图降级边界。                                            |
| Runtime implementation | `EX-51` 后端运行时                                               | Done    | 已提供 preview / thumbnail / versions / upload version / mark-final / clear-final generated client。 |
| Frontend foundation    | `FE-46` 复用 `AttachmentPanel`                                   | Done    | 已在客户、线索、项目、合同详情入口复用。                                                             |
| Query boundary         | `libs/admin/data-access/src/lib/attachment/attachment.store.ts`  | Current | 本片只扩展既有附件 store, 不新建后端接口。                                                           |
| Route inventory        | `docs/design/api-route-canonical-inventory.md`                   | Aligned | 本片只消费 EX-51 已落地 routes, 不改变 public API surface。                                          |

## 3. 本次 SSOT

| Concern           | SSOT                                      | Implementation Rule                                          |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Preview support   | `AttachmentSummary.previewSupported`      | 支持时走受鉴权 HttpClient blob 预览; 不支持时展示下载降级。  |
| Thumbnail support | `AttachmentSummary.thumbnailAvailable`    | 无缩略图不报错, 用文件类型图标降级。                         |
| Version semantics | `versionGroupId`, `versionNo`, `isLatest` | 列表默认 latest; 历史版本通过 versions 接口读取。            |
| Final semantics   | `isFinal`                                 | 同一版本组由后端保证唯一 final; 前端只发 mark / clear 命令。 |
| Permissions       | 既有 `canWrite` 输入和后端附件权限        | 写动作入口受 `canWrite` 控制, 后端仍是最终鉴权。             |

## 4. 命令与接口边界

| Route / Controller                       | Consumer          | Request / Params              | Response              | Guard / Permission      | Result  |
| ---------------------------------------- | ----------------- | ----------------------------- | --------------------- | ----------------------- | ------- |
| `GET /api/attachments/{id}/preview`      | `AttachmentStore` | `id`                          | `Blob`                | 后端附件读取权限        | Consume |
| `GET /api/attachments/{id}/thumbnail`    | `AttachmentStore` | `id`                          | `Blob` / no content   | 后端附件读取权限        | Consume |
| `GET /api/attachments/{id}/versions`     | `AttachmentStore` | `id`                          | `AttachmentSummary[]` | 后端附件读取权限        | Consume |
| `POST /api/attachments/{id}/versions`    | `AttachmentPanel` | file + metadata + change note | `AttachmentSummary`   | `canWrite` + 后端写权限 | Consume |
| `POST /api/attachments/{id}:mark-final`  | `AttachmentPanel` | optional note                 | `AttachmentSummary`   | `canWrite` + 后端写权限 | Consume |
| `POST /api/attachments/{id}:clear-final` | `AttachmentPanel` | required reason               | `AttachmentSummary`   | `canWrite` + 后端写权限 | Consume |

## 5. 测试与校验

| Check      | Required | Command / Evidence                                  | Result  | Gap / Reason |
| ---------- | -------- | --------------------------------------------------- | ------- | ------------ |
| Lint       | Yes      | `corepack pnpm nx lint poms-admin`                  | Pending | G3 执行。    |
| Build      | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache` | Pending | G3 执行。    |
| Unit tests | Yes      | `corepack pnpm nx test poms-admin --runInBand`      | Pending | G3 执行。    |
| API tests  | No       | N/A                                                 | N/A     | 不改后端。   |

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-05`
- Conditions: 实施必须复用 `AttachmentPanel` 和 `AttachmentStore`, 不新增后端 API。
