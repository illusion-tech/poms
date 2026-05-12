# FE-60B 附件面板 Upload Session 上传体验实施基线包

- Gate Status: `Pass`
- Parent: `FE-60`
- Owner: `Codex`
- Slice Type: `frontend-only` / `shared attachment panel UX`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-12`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-60B`
- Upstream Slices: `EX-65D`, `FE-48`, `FE-49`, `FE-55`, `FE-60A`

## 1. 范围

- 本次目标:
  - 复用现有 `AttachmentPanel`，把上传附件 / 上传新版本的用户体验显式切到 upload session 流程。
  - 展示 create session、获取 upload target、local proxy / OBS presigned PUT 上传、complete 的阶段、上传模式、provider、进度与完成态。
  - 上传失败时保留当前文件和元数据，允许用户再次点击上传重试。
  - 上传进行中提供用户主动中止入口，调用后端 abort session，并阻断本次 complete。
  - 对 local proxy 和 OBS presigned PUT 都使用 `HttpClient` upload progress event；不在前端暴露 storage key、bucket 写权限或永久对象 URL。
- 本次明确不做:
  - 不新增或修改后端 public route、DTO、OpenAPI schema、generated client 或 migration。
  - 不实现 multipart 上传 UI；`EX-65E` 已将 multipart 重分类为后续大文件增强。
  - 不改附件分类、权限、预览、下载、版本链、最终版标记或项目移交下载包语义。
  - 不接入真实 Huawei OBS 租户联调；使用现有后端 upload session API 和前端 focused tests 证明体验路径。
- 下游可依赖的交付边界:
  - 所有已嵌入 `AttachmentPanel` 的线索、客户、项目、合同和项目移交入口获得一致上传体验。
  - `FE-60` parent 可在本片完成后进入前端最小闭环收口。

## 2. 正式输入

| Input Type           | Document / Source                                               | Section / Anchor                            | Status | Notes                                                                           |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Runtime API          | `ex-65d-attachment-upload-session-runtime-closeout.md`          | upload session API / frontend build impact  | Pass   | 已提供 create / upload-target / proxy object / complete / abort generated API。 |
| Integration closeout | `ex-65e-attachment-storage-provider-integration-closeout.md`    | first-version minimum loop                  | Pass   | local proxy 与 OBS presigned PUT 最小闭环已验证；真实 OBS smoke 留给生产。      |
| Existing UI          | `apps/poms-admin/src/app/shared/ui/attachment-panel.ts`         | upload and version upload dialogs           | Pass   | 本片只改复用面板，不逐个改业务页面。                                            |
| Data access          | `libs/admin/data-access/src/lib/attachment/attachment.store.ts` | EX-65D minimal adapter                      | Pass   | 当前已内部 create session -> upload target -> complete，但没有可见进度/abort。  |
| Provider config      | `FE-60A` closeout                                               | attachment storage provider config frontend | Pass   | 配置页已完成，provider 默认选择由后端处理。                                     |

## 3. 本次 SSOT

| Concern              | SSOT                                                         | Implementation / Validation Rule                                                                          |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Upload state machine | Generated `AttachmentUploadSessionStatus` and EX-65D runtime | 前端只呈现阶段，不自行改写后端状态机；complete / abort 由 API 决定。                                      |
| Upload mode          | Generated `AttachmentUploadMode`                             | `proxy` 走 POMS 后端 object route；`presigned-put` 直 PUT upload target URL；`multipart` 暂 fail closed。 |
| Progress events      | Angular `HttpClient` upload progress                         | local proxy 与 presigned PUT 都订阅 `UploadProgress`；无法获得 total 时使用 file size 回退。              |
| Abort                | `POST /attachment-upload-sessions/{id}:abort`                | 用户中止只对当前 active session 生效；中止后不调用 complete。                                             |
| Retry                | Existing selected file and form state                        | 失败不清空 dialog，用户重新点击上传会创建新 session。                                                     |
| Security             | Backend-controlled target and metadata                       | 前端不展示 storage key、bucket 写权限、永久 URL 或 secret；OBS target 只用于短期 PUT。                    |
| Validation           | Admin focused tests + lint/build                             | 覆盖上传进度、失败保留、abort、版本上传复用路径。                                                         |

## 4. 验证边界

| Area               | Required Evidence                                                                                             | Result Before Execution |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Store session flow | 单测或 component mock 断言 create -> upload target -> complete，并有 progress state。                         | Planned                 |
| Abort flow         | 上传中止调用 store abort，dialog 展示中止态，不触发 complete。                                                | Planned                 |
| Retry flow         | 上传失败后保留 selected file / form，二次上传会重新调用 store upload。                                        | Planned                 |
| Version upload     | 新版本上传 dialog 展示同一 session 进度与失败 / 中止体验。                                                    | Planned                 |
| Static checks      | `poms-admin` focused/full tests、`poms-admin` lint/build、`admin-data-access` lint、markdown/diff check       | Planned                 |
| Browser smoke      | 如本地 dev server 可用，打开复用附件入口或至少确认 app route build 可用；真实文件上传需要后端和测试数据配合。 | Planned                 |

## 5. 例外与风险

| Exception ID                       | Level  | Scope                   | Approved By | Cleanup Owner               | Cleanup Due                    | Notes                                                                                      |
| ---------------------------------- | ------ | ----------------------- | ----------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| `FE60B-E1-REAL-OBS-TENANT-NOT-RUN` | medium | real Huawei OBS smoke   | Codex local | Deployment / ops owner      | before production enablement   | 本地不使用真实 OBS 凭据；真实 presigned PUT 跨域、header 和下载 smoke 仍需生产启用前验证。 |
| `FE60B-E2-MULTIPART-UI-DEFERRED`   | low    | multipart large-file UX | Codex local | Future upload scaling owner | when max upload size is raised | 当前最小闭环只支持 local proxy 与 presigned PUT；multipart UI 留给后续大文件增强。         |

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-12`
- Conditions:
  - 不新增后端 route、DTO、OpenAPI、generated client 或 migration。
  - 上传失败 / 用户中止不得创建 active attachment；由后端 session complete 控制。
  - 本片完成前 `FE-60` parent 继续保持 `Doing`，不能直接关闭父任务。
