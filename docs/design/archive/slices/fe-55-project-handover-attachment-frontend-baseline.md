# FE-55 项目移交附件清单与批量下载前端入口实施基线包

- Gate Status: `Pass`
- Parent: `EX-52`
- Runtime Input: `EX-52A`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-05`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` -> `FE-55`

## 1. 范围

- 本次目标: 在合同承接 / 项目移交页面接入附件移交清单、刷新扫描、缺口 / 敏感排除提示、纳入项选择、短期下载包创建、下载包状态展示和受控下载。
- 本次明确不做: 新增后端 API、修改 EX-52A route、敏感导出审批流、对象存储迁移、长期外链、网盘式目录树、Office 在线预览、OCR 或全文检索。
- 下游可依赖的交付边界: 项目移交负责人可在正式移交上下文中看到应移交附件、排除原因、可下载项和短期下载包入口。
- 不允许下游依赖的留白: 不承诺敏感附件可通过前端强行纳入; 不承诺下载包长期有效; 不把附件中心变成项目移交入口。

## 2. 正式输入

| Input Type             | Document / Source                                                       | Status  | Notes                                                                  |
| ---------------------- | ----------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| Governance baseline    | `docs/design/ex-52-attachment-handover-batch-download-baseline.md`      | G4      | 冻结移交清单、handover 关系、敏感排除和短期下载包边界。                |
| Runtime implementation | `docs/design/ex-52a-attachment-handover-runtime-closeout.md`            | G4      | 五条 route、selection、download package、OpenAPI / client 已落地。     |
| Generated client       | `libs/shared/api-client/api/attachment-handover.service.ts`             | Stable  | 本片只消费 generated client，不手写 HTTP path。                        |
| Project handover view  | `ProjectHandoverDetailView.handoverId`                                  | Current | `handoverId` 为清单和下载包入口主键; 为空时前端显示未生成移交记录。    |
| Frontend host          | `apps/poms-admin/src/app/features/project/project-contract-handover.ts` | Current | 当前合同承接 / 正式移交页面是最合适的首个落点。                        |
| Existing attachment UX | `FE-48` / `FE-49`                                                       | G4      | 可复用附件状态、版本、final/latest 和来源跳转展示口径。                |
| Route inventory        | `docs/design/api-route-canonical-inventory.md`                          | Aligned | 本片只消费 EX-52A 已 aligned routes，不新增 public API route surface。 |

## 3. 本次 SSOT

| Concern           | SSOT                                                  | Implementation Rule                                                                                                          |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Handover identity | `ProjectHandoverDetailView.handoverId`                | 只有存在 handoverId 时才加载附件移交清单。                                                                                   |
| Checklist state   | `ProjectHandoverAttachmentChecklistView.items/counts` | 前端不重新计算来源、final/latest 或敏感排除，只展示后端返回状态。                                                            |
| Selection state   | `ProjectHandoverAttachmentChecklistItem.status`       | 前端按 included / excluded / missing / sensitive-excluded / stale-version 语义展示，并只选择可下载的 included 项创建下载包。 |
| Version identity  | `attachmentId`, `versionGroupId`, `rowVersion`        | 创建下载包时提交选择项版本期望，不用文件名或显示名作为身份。                                                                 |
| Download package  | `AttachmentDownloadPackageSummary`                    | 只对 ready 且未过期的下载包展示下载入口。                                                                                    |
| Security boundary | EX-52A 后端权限和敏感排除规则                         | 前端不提供绕过敏感排除的入口; 后端仍是最终鉴权。                                                                             |

## 4. 读写边界

| Operation        | Generated API                                       | UI Behavior                                             | Result    |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------- | --------- |
| Read checklist   | `attachmentHandoverControllerGetChecklist`          | 页面加载后读取当前移交清单和统计。                      | G1 frozen |
| Refresh scan     | `attachmentHandoverControllerRefreshChecklist`      | 提供刷新按钮，刷新后保留后端返回的排除 / 缺口提示。     | G1 frozen |
| Create package   | `attachmentHandoverControllerCreateDownloadPackage` | 仅对已纳入且可下载项创建短期包，并提交版本期望。        | G1 frozen |
| Read package     | `attachmentHandoverControllerGetDownloadPackage`    | 创建后读取状态和 manifest 摘要; failed 时展示失败原因。 | G1 frozen |
| Download package | `attachmentHandoverControllerDownloadPackage`       | 使用受控 authenticated blob 方式下载，不拼长期外链。    | G1 frozen |

## 5. 页面与交互边界

| Surface                 | Behavior                                                                               | Result    |
| ----------------------- | -------------------------------------------------------------------------------------- | --------- |
| 合同承接 / 正式移交页面 | 在正式移交状态下方新增附件移交清单区块。                                               | G1 frozen |
| 清单统计                | 展示总数、纳入、排除、缺口、可下载数量。                                               | G1 frozen |
| 清单列表                | 展示附件名、分类、安全级别、状态、来源、final/latest / stale 提示。                    | G1 frozen |
| 选择动作                | 本片允许从后端已纳入且可下载的清单项中选择本次下载包范围; 不允许把敏感排除项强行纳入。 | G1 frozen |
| 下载包                  | 展示文件数、总大小、过期时间、下载次数和失败原因。                                     | G1 frozen |

## 6. 持久化与路由边界

- Persistence: N/A. 本片不触及 migration、entity、DDL 或 seed。
- Public API route: N/A. 本片不新增、修改或删除 public API route。
- Admin route: N/A. 本片嵌入既有项目合同承接 / 移交页面，不新增一级菜单。

## 7. 测试与校验

| Check               | Required | Command / Evidence                                                                          | Result  | Gap / Reason                  |
| ------------------- | -------- | ------------------------------------------------------------------------------------------- | ------- | ----------------------------- |
| Admin focused tests | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-contract-handover` | Pending | G3 执行。                     |
| Store focused tests | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`   | Pending | G3 执行。                     |
| Admin lint          | Yes      | `corepack pnpm nx lint poms-admin`                                                          | Pending | G3 执行。                     |
| Admin build         | Yes      | `corepack pnpm nx build poms-admin --skip-nx-cache`                                         | Pending | G3 执行。                     |
| API checks          | No       | N/A                                                                                         | N/A     | 不改后端。                    |
| OpenAPI / client    | No       | N/A                                                                                         | N/A     | 只消费 EX-52A 已生成 client。 |
| Markdown            | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                     | Pending | G3 执行。                     |

## 8. 风险与例外

| Risk ID                            | Level  | Scope                | Mitigation                                                     |
| ---------------------------------- | ------ | -------------------- | -------------------------------------------------------------- |
| `FE55-R1-HANDOVER-ID-ABSENT`       | Medium | 还未生成项目移交记录 | `handoverId` 为空时显示空状态，不调用附件清单接口。            |
| `FE55-R2-DOWNLOAD-BLOB-AUTH`       | Medium | 下载包鉴权下载       | 优先沿用 HttpClient blob 下载方式，不在 UI 暴露长期 URL。      |
| `FE55-R3-SENSITIVE-EXCLUSION-COPY` | Low    | 敏感排除解释可读性   | 只展示后端 exclusionReason，不提供 override 文案或自动化决策。 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-05`
- Conditions:
  - 只消费 `EX-52A` generated client，不手写 route 或新增后端 API。
  - 前端不得绕过 `sensitive-excluded` 与 `downloadEligible=false`。
  - 首个入口落在合同承接 / 项目移交页面，不新增全局附件中心能力。
