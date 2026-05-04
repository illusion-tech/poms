# EX-52 附件移交清单与批量下载治理基线

> 状态: G1 baseline
> 日期: 2026-05-05
> 关联 tracker: EX-52
> 前置: EX-45 附件证据库, EX-51 附件版本 / 最终版运行时, L3 项目移交强节点设计
> 后续实施: 附件移交清单运行时、移交打包下载前端入口

## 1. 目标

EX-52 是治理基线, 不直接交付运行时代码。它冻结附件在项目移交场景下如何被选入交接清单、如何形成 `handover` 关系、如何批量打包下载、如何排除敏感附件并留下审计证据。

本基线需要支持:

- 项目移交时能从线索、项目、合同和销售过程证据中形成可解释的附件交接清单。
- 清单选择的是明确附件版本, 优先使用最终版, 没有最终版时使用最新有效版本并标出原因。
- 被纳入移交的附件通过 `handover` 关系挂到具体项目移交记录, 不是只笼统挂到项目。
- 批量下载生成受控交接包, 只包含当前用户有权读取且允许批量导出的附件。
- 敏感附件默认不进入批量包, 清单中只显示被排除原因和单独查看入口。

## 2. 正式输入

| 输入                    | 结论                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-45 附件证据库        | 已交付 `Attachment` / `AttachmentLink`, 多业务对象挂载、下载鉴权、作废和 `handover` relation type 预留。                                                      |
| EX-51 附件版本 / 最终版 | 已交付版本链、latest / final 语义、图片 / PDF 受控预览、版本替换、最终版标记 / 撤销和审计。                                                                   |
| FE-49 附件中心          | 当前附件中心是前端聚合的读取页, 不提供后端全局检索 API, 也不提供批量下载。                                                                                    |
| L3 项目移交强节点       | 项目移交必须引用同一份交接事实清单、确认摘要和打印材料口径, 移交完成后下游执行 / 提成不得回头重新猜测交接材料。                                               |
| Route Inventory         | EX-45 和 EX-50 / EX-51 附件路由已登记。EX-52 需要新增项目移交附件清单和下载包 planned route, 作为后续运行时切片输入。                                         |
| 当前共享合同            | `AttachmentTargetType` 尚不包含 `project-handover`。后续运行时若要把附件挂到具体移交记录, 必须扩展该枚举和 DB check, 不能用普通 `project` target 偷代表移交。 |

## 3. 范围

### 3.1 Included

- 项目移交附件清单的数据来源、选择规则和缺口状态。
- `AttachmentRelationType = handover` 的使用边界。
- `AttachmentTargetType` 后续扩展 `project-handover` 的必要性。
- 批量下载包的生成、下载、过期、审计和清单 manifest 规则。
- 敏感 / 机密 / 高机密附件的批量排除和例外申请边界。
- 后续运行时需要实施的 planned route、合同、迁移、服务和测试清单。

### 3.2 Excluded

- 网盘式目录树、文件夹拖拽、长期外链分享。
- Office 在线预览、OCR、全文检索、内容抽取。
- 对象存储迁移和异步转码平台。
- 把附件清单做成移交完成的唯一硬闸口; 它是移交事实清单的一部分, 仍需和角色确认、合同承接、提成冻结前置条件共同判断。
- 绕过附件安全等级的批量导出。

## 4. 移交清单语义

### 4.1 清单来源

后续运行时生成项目移交附件清单时, 至少应扫描以下来源:

| 来源                           | 读取依据                                              | 清单角色                                             |
| ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| 线索来源附件                   | `project.sourceLeadId` + 线索转项目 `source` link     | 证明客户需求、沟通截图、会议纪要和早期判断依据。     |
| 项目附件                       | `targetType = project`                                | 项目推进过程中的范围、风险、报价、技术和管理证据。   |
| 合同附件                       | 项目当前有效合同集合                                  | 合同正文、补充协议、客户盖章件、商务条款和回款证明。 |
| 销售跟进附件                   | 项目 / 来源线索相关销售跟进记录                       | 关键沟通纪要和承诺事项的上下文证据。                 |
| 项目移交记录已存在的附件选择项 | `targetType = project-handover` + `relation=handover` | 表示本次移交已经明确纳入的附件版本和选择结果。       |

当前 POMS 没有独立 `opportunity` 业务对象。销售机会材料在现有模型中分别落在线索、项目、销售跟进和客户上下文, 后续不得为 EX-52 临时引入新的 opportunity 附件 target。

### 4.2 版本选择规则

清单项必须选择明确的附件版本:

1. 同一 `versionGroupId` 存在 active final 版本时, 默认选择 final 版本。
2. 没有 final 版本时, 默认选择 active latest 版本, 并把 `selectionReason` 标为 `latest-no-final`。
3. 历史版本只有在用户显式选择并写入原因时才可进入移交。
4. 作废版本不得进入移交包; 已经进入历史清单的作废版本只能保留审计引用, 不再下载。
5. 同一版本组在一个移交清单中只能出现一次, 重复来源只追加 source references。

### 4.3 清单状态

建议冻结以下状态语义:

| 状态                 | 含义                                          | 是否进入批量包 |
| -------------------- | --------------------------------------------- | -------------- |
| `included`           | 已纳入本次移交, 可批量下载                    | 是             |
| `missing`            | 预期类别缺失, 需要业务补齐                    | 否             |
| `excluded`           | 用户显式排除, 必须有原因                      | 否             |
| `sensitive-excluded` | 因安全等级或权限规则默认排除                  | 否             |
| `stale-version`      | 已选择版本不再是 latest / final, 需要重新确认 | 否             |

## 5. `handover` 关系边界

`AttachmentRelationType = handover` 不表示“这个附件属于项目”, 而表示“这个附件版本被纳入某一次正式项目移交”。

后续运行时应遵守:

- `handover` link 的 target 必须是具体 `project-handover` 记录。
- 因当前 `AttachmentTargetType` 尚无 `project-handover`, 后续运行时必须扩展 shared contract、DB check、OpenAPI 和 generated client。
- 普通项目材料继续使用 `targetType = project` + `normal/evidence/source`。
- 线索转项目形成的来源延续继续使用 `relationType = source`, 不得把来源关联改写为 `handover`。
- `final` 表示附件版本组的业务确认状态; `handover` 表示某次移交选择, 二者可以同时存在但语义不能互相替代。

## 6. 敏感附件排除规则

批量下载默认只允许 `normal` 和 `internal` 附件进入交接包。

| 安全等级       | 清单展示                   | 默认批量下载 | 例外                               |
| -------------- | -------------------------- | ------------ | ---------------------------------- |
| `normal`       | 完整展示                   | 允许         | N/A                                |
| `internal`     | 完整展示                   | 允许         | N/A                                |
| `sensitive`    | 展示元数据和排除原因       | 默认排除     | 后续可做显式申请, 必须有理由和审计 |
| `confidential` | 展示受限元数据, 不显示预览 | 排除         | 不进入普通交接包                   |
| `restricted`   | 只显示存在性和受限原因     | 排除         | 不进入普通交接包                   |

敏感附件被排除时, 系统必须把 `attachmentId`, `versionGroupId`, `securityLevel`, `targetType`, `targetId`, `reason` 写入清单 manifest 或审计载荷。不得静默漏掉。

## 7. 批量下载包

### 7.1 包语义

批量下载包是一次短期、受控、可审计的导出结果。它不是文件夹, 也不是长期可访问的对象存储链接。

建议包内结构只做稳定分组:

```text
manifest.json
lead/
project/
contract/
sales-follow-up/
```

文件名由后端统一清洗, 至少包含来源类型、附件展示名、版本号和附件 ID 后缀, 避免重名覆盖。

### 7.2 生命周期

| 状态        | 含义                       |
| ----------- | -------------------------- |
| `pending`   | 已创建, 等待打包           |
| `running`   | 正在生成归档               |
| `ready`     | 可下载                     |
| `failed`    | 生成失败, 保留失败原因     |
| `expired`   | 已过期, 不再允许下载       |
| `cancelled` | 用户或系统取消, 不再继续包 |

首个运行时切片可以同步生成小包, 但公共合同仍应按 package resource 设计, 以便未来替换为异步打包。

### 7.3 审计事件

后续运行时至少记录:

- `attachment.handover_checklist_viewed`
- `attachment.handover_checklist_refreshed`
- `attachment.handover_link_created`
- `attachment.batch_package_created`
- `attachment.batch_package_downloaded`
- `attachment.batch_package_sensitive_excluded`
- `attachment.batch_package_expired`

审计载荷必须包含 `projectId`, `projectHandoverId`, `packageId`, `attachmentIds`, `excludedAttachmentIds`, `createdBy` 和 `requestId`。

## 8. Planned API

这些 route 已同步登记到 `api-route-canonical-inventory.md`, 状态为 planned。

| Capability                                       | Route                                                       | 说明                                              |
| ------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------- |
| `getProjectHandoverAttachmentChecklist`          | `GET /project-handovers/{id}/attachment-checklist`          | 读取某次项目移交的附件交接清单。                  |
| `refreshProjectHandoverAttachmentChecklist`      | `POST /project-handovers/{id}/attachment-checklist:refresh` | 重新扫描来源并生成清单建议, 不自动完成移交。      |
| `createProjectHandoverAttachmentDownloadPackage` | `POST /project-handovers/{id}/attachment-download-packages` | 按清单选择创建短期批量下载包。                    |
| `getAttachmentDownloadPackage`                   | `GET /attachment-download-packages/{id}`                    | 查询包状态、manifest 摘要、过期时间和排除项统计。 |
| `downloadAttachmentDownloadPackage`              | `GET /attachment-download-packages/{id}/download`           | 下载 ready 状态的短期归档文件。                   |

## 9. Planned Contracts

后续运行时需要新增或扩展:

| Contract                                                | 用途                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ProjectHandoverAttachmentChecklistView`                | 移交附件清单总览, 包含 included / missing / excluded / sensitive-excluded 统计。 |
| `ProjectHandoverAttachmentChecklistItem`                | 单个清单项, 包含来源、附件版本、选择原因、状态、排除原因和下载资格。             |
| `RefreshProjectHandoverAttachmentChecklistRequest`      | 重新扫描清单时的选项, 如是否包含历史选择和是否保留人工排除项。                   |
| `CreateProjectHandoverAttachmentDownloadPackageRequest` | 创建下载包时的附件选择、敏感排除确认、manifest 说明和期望 rowVersion。           |
| `AttachmentDownloadPackageSummary`                      | 下载包状态、manifest、过期时间、创建人、下载次数和排除项统计。                   |

`AttachmentTargetType` 需要新增 `project-handover`。如果运行时切片发现已有 target 校验无法定位项目移交权限, 必须先修正权限和 target resolver, 不允许绕过为普通项目读取。

## 10. Planned Persistence

后续运行时至少需要冻结以下持久化边界:

| 表                                      | 用途                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `project_handover_attachment_selection` | 保存某次项目移交的附件版本选择、来源引用、状态、排除原因和 rowVersion。     |
| `attachment_download_package`           | 保存打包请求、状态、manifest、storage key、过期时间、创建人和下载审计摘要。 |
| `attachment_download_package_item`      | 保存每个包中包含或排除的附件版本、来源和排除原因。                          |

迁移还必须扩展:

- `AttachmentTargetType` / `attachment_link.target_type` check: 新增 `project-handover`。
- `TargetObjectType` 如需暴露审计 / 待办来源, 必须与 existing `project-handover` 语义保持一致。
- 下载包 storage key 不得返回给前端; 前端只能通过受控 download route 获取。

## 11. 后续实施清单

- 补齐 route inventory planned rows 对应的 controller / service / DTO。
- 扩展 shared contracts、OpenAPI 和 generated client。
- 扩展 `AttachmentTargetType`、target resolver 和权限校验。
- 新增移交清单选择表和下载包表 migration。
- 补齐清单生成、版本选择、敏感排除、批量打包和审计测试。
- 在项目移交工作区或附件中心补充受控入口; 不在普通附件面板里强行加入批量下载。

## 12. 验收边界

EX-52 作为 G1 baseline 的完成条件:

- 移交清单、`handover` 关系、版本选择和敏感排除语义已冻结。
- 批量下载包的 route、合同、持久化和审计输入已冻结。
- Planned route 已登记到 route inventory。
- Tracker 更新到 Doing / G1。

EX-52 不要求运行时代码、migration、OpenAPI 或前端截图。
