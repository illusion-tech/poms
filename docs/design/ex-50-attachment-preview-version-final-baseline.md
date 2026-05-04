# EX-50 附件预览与最终版治理基线

> 状态: G1 baseline
> 日期: 2026-05-05
> 关联 tracker: EX-50
> 前置: EX-45 附件证据库, FE-46 业务对象附件入口
> 后续实施: EX-51 后端运行时, FE-48 前端交互, EX-52 交接归档

## 1. 目标

EX-50 不交付运行时代码, 只冻结附件二阶段的设计边界。它把已经预留在 `Attachment` 实体中的版本字段、最终版字段, 以及 FE-46 已经接入的附件面板, 收敛为后续可实施的后端和前端合同。

本基线需要支持:

- 销售、项目、合同等业务对象可以直接预览图片和 PDF 附件。
- 附件可以形成明确的版本链, 允许替换为新版本, 同时保留历史版本。
- 业务对象列表默认呈现当前有效版本, 但可以追溯历史版本。
- 关键交付物可以被标记为最终版, 并可被审计地撤销最终版标记。
- 缩略图能力有统一接口, 但不把所有文件格式的缩略图生成都强行纳入当前实施。

## 2. 正式输入

| 输入               | 结论                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-45 附件证据库   | 已交付统一 `Attachment` / `AttachmentLink`, 上传、列表、详情、下载、更新元数据、作废、关联、解除关联 API。版本字段已预留, 但运行时只按 V1 写入。 |
| FE-46 业务对象入口 | 客户、项目、合同详情页已复用 `AttachmentPanel`, 当前只提供上传、列表、下载、作废入口。                                                           |
| Route Inventory    | 6.14 已登记 EX-45 现有附件路由。EX-50 需要补齐二阶段 planned route, 作为 EX-51 的合同输入。                                                      |
| 共享合同           | `AttachmentSummary` 已暴露 `versionGroupId`, `versionNo`, `isLatest`, `isFinal`; 后续需要补齐预览、缩略图和版本详情 DTO。                        |
| 安全边界           | 继续复用 EX-45 的附件读取权限、业务对象可见性校验、敏感级别与审计事件。预览不能绕过下载权限。                                                    |

## 3. 范围

### 3.1 Included

- 图片和 PDF 的受控预览。
- 缩略图读取接口和前端降级边界。
- 附件版本链模型和替换规则。
- 最新版本列表规则。
- 最终版标记和撤销标记规则。
- EX-51 需要实施的 planned route inventory。
- EX-51 需要补齐的合同、迁移、服务、测试清单。

### 3.2 Excluded

- Office 在线转换和 Office 文档预览。
- OCR、全文检索、内容抽取。
- 外部分享链接、匿名预览 URL、长期公开 URL。
- 批量下载和交接包, 由 EX-52 处理。
- 审批流或归档审批, 最终版标记只表示业务确认状态。
- 针对同一附件在不同业务对象上的目标级最终版治理。当前阶段最终版归属附件版本组。

## 4. 预览与缩略图

### 4.1 预览格式

EX-51 第一阶段只支持:

| 类型                    | 预览行为                     | 缩略图行为                                       |
| ----------------------- | ---------------------------- | ------------------------------------------------ |
| PNG / JPG / JPEG / WEBP | 内联返回原文件或安全派生文件 | 可以返回图片派生缩略图; 未生成时返回无缩略图状态 |
| PDF                     | 内联返回 PDF 文件            | 缩略图可为空; 前端使用文件类型图标降级           |
| 其他文件                | 返回不支持预览               | 返回无缩略图状态                                 |

预览不是下载权限之外的能力。用户只有在可以读取附件时, 才能访问预览和缩略图。

### 4.2 预览 URL

预览 URL 是受鉴权保护的后端路由, 不是公开 URL。前端可以直接使用该路由作为 iframe、object、image 或新窗口地址, 也可以通过客户端封装为临时 object URL。

本阶段不引入外部对象存储预签名 URL。如果未来存储 provider 切换为对象存储, 也应由后端受控路由统一签发短期 URL, 不能把永久 storage key 暴露给前端。

### 4.3 缩略图

缩略图接口必须稳定存在, 但缩略图文件可以不存在。后端需要清楚区分:

- `200`: 存在可返回的缩略图文件。
- `204`: 附件可访问, 但当前没有缩略图。
- `415`: 文件类型不支持生成或返回预览派生物。
- `403` / `404`: 权限或资源不可见。

前端必须对 `204` 和 `415` 做图标降级, 不能把它们显示为错误。

## 5. 版本链治理

### 5.1 数据语义

| 字段                   | 规则                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `versionGroupId`       | 同一附件版本链的稳定标识。EX-51 需要把历史 `NULL` 回填为自身 `id`, 并在新上传版本时继承原版本组。 |
| `versionNo`            | 版本组内递增版本号, 从 1 开始。                                                                   |
| `previousAttachmentId` | 指向被替换的上一最新版本。                                                                        |
| `isLatest`             | 同一版本组内只允许一个 active 版本为 `true`。                                                     |
| `changeNote`           | 新版本上传时必填或业务侧明确允许为空; 用于说明替换原因。                                          |
| `status`               | 历史版本保持 `active`, 作废只表达该具体版本失效, 不删除版本链。                                   |

### 5.2 替换规则

上传新版本不是更新原附件行, 而是创建新的 `Attachment` 行:

1. 以当前附件所在版本组为目标。
2. 找到该版本组的 active latest 版本。
3. 新建附件行, `versionNo = latest.versionNo + 1`。
4. 新行 `previousAttachmentId` 指向旧 latest。
5. 新行 `isLatest = true`, 旧 latest 改为 `isLatest = false`。
6. 新版本继承旧版本的 active 业务对象关联, 使业务对象仍能看到当前文件。
7. 新版本默认 `isFinal = false`, 即使旧版本是最终版也不能自动继承最终版状态。

同一版本组的替换需要串行处理。EX-51 应通过事务和唯一索引防止并发产生多个 latest。

### 5.3 列表规则

- `GET /attachments` 默认只返回目标对象关联下的 latest active 版本。
- 历史版本通过 `GET /attachments/{id}/versions` 查看。
- 如果后端需要兼容治理场景, 可以在 `GET /attachments` 增加 `includeVersions=true`, 但前端常规业务对象附件列表不使用历史版本列表。

## 6. 最终版治理

### 6.1 最终版定义

最终版表示该版本组中某一个附件版本被业务确认可作为当前交付、合同、验收或归档依据。它不是审批通过, 也不代表文件不可再替换。

### 6.2 标记规则

- 同一 `versionGroupId` 只能有一个 active 版本 `isFinal = true`。
- 只能标记 active 版本为最终版。
- 可以标记历史版本为最终版, 但该行为需要写入审计, 因为它可能不同于 latest。
- 上传新版本不会自动继承最终版。新版本需要重新标记。
- 撤销最终版必须记录原因。

### 6.3 审计事件

EX-51 至少需要记录:

- `attachment.previewed`
- `attachment.thumbnail_viewed`
- `attachment.version_created`
- `attachment.final_marked`
- `attachment.final_cleared`

审计载荷应包含 `attachmentId`, `versionGroupId`, `versionNo`, `targetType`, `targetId` 和操作者。

## 7. Planned API

| Capability                | Route                                | 说明                         |
| ------------------------- | ------------------------------------ | ---------------------------- |
| `previewAttachment`       | `GET /attachments/{id}/preview`      | 返回受控内联预览流。         |
| `getAttachmentThumbnail`  | `GET /attachments/{id}/thumbnail`    | 返回缩略图流或无缩略图状态。 |
| `listAttachmentVersions`  | `GET /attachments/{id}/versions`     | 返回同一版本组的版本历史。   |
| `uploadAttachmentVersion` | `POST /attachments/{id}/versions`    | 上传新文件并创建新版本。     |
| `markAttachmentFinal`     | `POST /attachments/{id}:mark-final`  | 标记某版本为最终版。         |
| `clearAttachmentFinal`    | `POST /attachments/{id}:clear-final` | 撤销版本组最终版标记。       |

这些 route 已同步登记到 `api-route-canonical-inventory.md`, 状态为 planned。

## 8. Planned Contracts

EX-51 需要在共享合同中新增或扩展:

| Contract                         | 用途                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `AttachmentPreviewCapability`    | 告诉前端是否可预览、是否有缩略图、预览 URL、缩略图 URL、支持类型和降级原因。 |
| `AttachmentVersionSummary`       | 返回版本历史, 包含版本号、latest、final、上传人、上传时间、变更说明、状态。  |
| `CreateAttachmentVersionRequest` | 新版本上传时的元数据和 `changeNote`。                                        |
| `MarkAttachmentFinalRequest`     | 标记最终版时的可选说明。                                                     |
| `ClearAttachmentFinalRequest`    | 撤销最终版时的必填原因。                                                     |

`AttachmentSummary` 应补齐 `previewUrl`, `thumbnailUrl`, `previewSupported`, `thumbnailAvailable`, `previousAttachmentId`, `changeNote` 等前端列表展示所需字段。

## 9. Planned Persistence

EX-51 需要新增迁移或修正现有预留字段约束:

- 回填 `attachment.version_group_id`。
- 确保新写入的附件始终有 `version_group_id`。
- 增加版本组内 `(version_group_id, version_no)` 唯一约束。
- 增加版本组内 active latest 唯一约束。
- 增加版本组内 active final 唯一约束。
- 如实施派生文件存储, 增加预览/缩略图 storage key、mime type、生成状态和错误信息字段。

如果当前数据库无法跨方言表达 partial unique index, EX-51 需要在服务事务中补充串行校验, 并在测试中覆盖并发或重复状态写入。

## 10. EX-51 实施清单

- 补齐共享合同和 generated client。
- 补齐 MikroORM 迁移。
- 补齐 `AttachmentService` 预览、缩略图、版本、最终版命令。
- 补齐 Controller route、OpenAPI tags 和鉴权。
- 补齐下载/预览统一的 readable guard。
- 补齐审计事件。
- 补齐单元测试和 API e2e 覆盖。
- 更新 FE-48 输入文档。

## 11. 验收边界

EX-50 作为 G1 baseline 的完成条件:

- 二阶段附件路由已登记为 planned。
- 预览、缩略图、版本链、最终版语义已冻结。
- 已明确 EX-51 后端实施输入和 out-of-scope。
- Tracker 更新到 Doing/G1。

EX-50 不要求运行时代码、迁移或前端截图。
