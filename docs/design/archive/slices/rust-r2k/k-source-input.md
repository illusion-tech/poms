# RUST-R2K 五操作源码输入候选

- Gate Status: `G1 Pending`。本件是作者 A 的只读输入，不代表联合 G1 已通过。
- Task: `RUST-R2K` / [#78](https://github.com/illusion-tech/poms/issues/78)，父 `RUST-R2 #67`；并行参数子 Issue [#83](https://github.com/illusion-tech/poms/issues/83)，父 #61。
- Base: `f23490d0f0e145fb030d8f070726dd2aa00cf074`。
- 工作分支：`codex/poms-r2k-handover-r4-route`（Root 建立；本作者未操作 Git 写入）。
- 范围：完整 K 五个既有公共操作、既有三表及附件链接持久化、真实 ZIP/存储/审计；消费 B 的四类真实事实读取。并行的 R4 两项参数裁决由 Root/B 单列，计零新增操作。
- 本次不做：L 四公开路由、R2M、R3/R4/R5 全域迁移、Rust 移交确认/冻结写链、公开 draft 创建 API、新业务限制、原 TS/Angular/contracts/spec/client 改造、部署。
- 作者 A 本阶段只写本件和 `k-sources.json`；未运行 DB、ORM、服务、文件存储或 HTTP。下文运行结论均为待验，不把旧 Jest mock 作为真实验收。

## 1. 来源与优先级

行为 authority 是上述 base 的真实 `AttachmentService`、repository、原 entity/schema、原 Zod/DTO、controller、完整 OpenAPI 与原 UI consumer。`EX-52/52A`、`FE-55` 为具名历史设计输入；其中旧路径参数标签和计划语义不能覆盖后来已交付的 #82 或当前产品源码。G2 后遇到源码推断与实际原 Nest 不同，应保留原件并追加同次纠偏，不能改写本次冻结原件。

`k-sources.json` 记录逐文件 raw SHA256、仅 CRLF→LF 后 SHA256、字节数、来源分组，以及从完整 spec 机械提取的五个 operation。历史迁移链整体纳入指纹，不新增 migration。治理状态文档属于本次读取时点快照，后续 Root 的合法 Gate/状态更新不冒充产品漂移。

关键范围：

- `apps/poms-api/src/app/features/attachment/attachment.service.ts:927–1168`：五方法；`:1468–1870`：权限、候选、选择、manifest、ZIP、存储位置；`:1897–1904`：archive 仅 requireAttachment；`:2180–2189`：审计包装。
- 同目录 `attachment.repository.ts:80–105,125–165,251–267,294–375`：真实 create/find/flush；`attachment.entity.ts:173–358`：三表；`attachment-handover.controller.ts:15–62`：五公开入口。
- 同目录 `attachment-storage.service.ts:51–69` 及 registry/provider：读取原 location；写包使用当时 default provider。现 Rust `attachment_storage/registry.rs:155–189` 已有对应 save 端口。
- `libs/shared/contracts/src/lib/shared-contracts.ts:4168–4326`、`libs/api/contracts/src/lib/attachment/attachment.dto.ts:87–93`：精确 DTO。完整 spec/生成 client 已由 #82 统一参数 `id`。
- `libs/admin/data-access/src/lib/project/project-workspace.store.ts:251–353`、`apps/poms-admin/src/app/features/project/project-contract-handover.ts:362–415,497–537,755–758`：真实 consumer。

## 2. 五操作 surface

所有入口保留现有 `/api` 前缀、operationId、Cookie session、全局 guard 顺序及 DTO serializer。路径参数为 plain string，未新增 UUID pipe。#82 已完成五参数同步，不再次开 route 设计，也不加 alias。scope/R0 机器清单中的旧 `handoverId/packageId` 标签仍是历史输入，当前 spec/controller 是 `{id}`。

| Method | 当前路径                                                   | operationId                                          | 原 service                                       | 原显式权限/成功状态         |
| ------ | ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | --------------------------- |
| GET    | `/api/project-handovers/{id}/attachment-checklist`         | `AttachmentHandoverController_getChecklist`          | `getProjectHandoverAttachmentChecklist`          | `project:read` / 200        |
| POST   | `/api/project-handovers/{id}/attachment-checklist:refresh` | `AttachmentHandoverController_refreshChecklist`      | `refreshProjectHandoverAttachmentChecklist`      | `project:write` / 显式 200  |
| POST   | `/api/project-handovers/{id}/attachment-download-packages` | `AttachmentHandoverController_createDownloadPackage` | `createProjectHandoverAttachmentDownloadPackage` | `project:read` / 显式 200   |
| GET    | `/api/attachment-download-packages/{id}`                   | `AttachmentHandoverController_getDownloadPackage`    | `getAttachmentDownloadPackage`                   | `project:read` / 200        |
| GET    | `/api/attachment-download-packages/{id}/download`          | `AttachmentHandoverController_downloadPackage`       | `openAttachmentDownloadPackage`                  | `project:read` / binary 200 |

下载 controller 设置 `Cache-Control: private, no-store`，`Content-Type: application/zip`，`Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(fileName ?? id+'.zip')}`。原 StreamableFile 不指定 length、ETag、Range 或新下载 token。HEAD/早期流错误/晚期流错误/取消沿用现有真实 binary controller 语义，仍须对 K 入口实测。

## 3. DTO、JS 与权限顺序

- Refresh：`preserveManualExclusions`、`includeHistoricalSelections` 均为 boolean/default true。后者当前 service 未消费，不得因此增加过滤或历史清理。
- Create：`selectionIds` 为可省略 UUID 数组，若提供最少 1 项，无 max/unique 声明；`expectedSelectionVersions` 可省略数组，每项 UUID + positive integer；`confirmedSensitiveExclusion` default true；`note` 为 trim/max1000 的 nullable/optional string。当前 service 未消费 note，不写入包或审计。
- 以原 Zod 解析结果为准：unknown keys、缺失/null、类型错误、Unicode length、默认值及 validation issue 格式由原有限 DTO oracle 冻结；不要用 Rust serde 直接替代或接受 schema 拒绝的 `selectionIds:[]`。service 内部 JS Set/Map/string equality 保留大小写，不把 UUID 请求字面量提前 canonicalize。
- `requireProjectHandoverContext` 首先检查 `project:${read|write}`，否则 403 `Missing project ${mode} permission`；再查 handover（404 `Project handover ${id} not found`），再查其 project（404 `Project ${id} not found`）。没有 owner、confirmed、freeze、snapshot、审批或额外 sensitive-read 门槛。
- 包访问先 find package（404 `Attachment download package ${id} not found`），再执行上述 handover/project/read 检查。HTTP guard 的更早拒绝与 service 内权限检查必须分层保留。
- K 普通批量包只允许 `normal/internal`，即使操作者有四类 sensitive-read 权限也不纳入 confidential/restricted；不得套用 J 单附件的特殊读取授权扩大包内容。
- 保留 `JsString`、ECMAScript trim/slice、JSON.stringify 属性顺序/转义、Map/Set 首次插入顺序以及 Buffer UTF8 对 lone surrogate 的替代编码。PG text bind 的 UTF8 转换与 jsonb 原始 JSON 边界分开；不能提前 lossy 后掩盖原失败。

## 4. 候选、版本与清单

### 4.1 真实候选收集

先并行查询 project 的 contracts，以及 `project_id=P OR lead_id=sourceLead` 的 followups（没有 sourceLead 时只有 project 条件）。候选 target 顺序固定为 project → source lead（若 truthy）→ contracts（createdAt DESC）→ followups（occurredAt DESC、createdAt DESC）→ 本 handover；原 label 为 `项目附件`、`来源线索附件`、`合同 ${contractNo}`、`销售跟进附件`、`已纳入移交附件`。

每个 target 顺序执行 `findAttachmentsByTarget`：active links，linkedAt DESC；附件为 active 且 isLatest=true，uploadedAt DESC；再取这些附件全部 active links。无链接 IDs 时立即返回空。不是读取所有版本或每个域额外做 ACL。

对每个最新候选，按 versionGroupId（nullish 则 attachment.id）查 active final，按 versionNo DESC/uploadedAt DESC 取首；有 final 优先使用它，标 `final`，否则保留该候选，按其 isFinal 标 `final` 或 `latest-no-final`。不重挑一个不存在链接的全局 latest，不加 stale 检测。

以解析后 versionGroupId 去重。首个候选的 attachment/status/reason 保留；后来的 target 只合并 sourceRefs。sourceRef 先取当前 target 的匹配 links，否则产生 relationType=null 的 fallback；合并 key 是 `${sourceType}:${sourceId}:${relationType ?? ''}`，后值替换但保留首次 key 插入顺序。最后用 `displayName.localeCompare(other,'zh-CN')` 稳定排序；不能追加 id tie-breaker。现依赖已有匹配 Node ICU 的 data/collator，可复用数据，不能用字典序。

### 4.2 GET 与 refresh

GET 先读持久 selections（updatedAt DESC、createdAt DESC），然后写 `attachment.handover_checklist_viewed` success audit（projectId、selectionCount）。有 selections 直接映射，无 selections 才收集候选；因此 audit 早于空清单的候选查询。候选视图 selectionId/rowVersion/updatedAt=null，staleVersion=false，不写选择或 handover link。

Refresh 的 existingSelections 与候选收集并行。existing 按非空 versionGroupId 建 Map。每个候选 create 或复用 selection；若 preserve=true 且既有 status=`excluded`，保留其全部原 attachment/展示/原因/sourceRefs，否则更新候选字段及 updatedBy。`sensitive-excluded` 不属于该人工保留条件。included 且有 attachmentId 时，确保存在同 attachment/handover、relation=`handover`、status=active 的 link；没有才 create。

一次显式 saveHandoverEntities 后写 refreshed audit，返回本次 candidates 对应的 refreshed selections。没有候选的旧 selection 未删除，也不额外 unlink 旧 link。后续 GET 会查询全部持久 selections；不要把 refresh 返回集合误当完整 replace。

视图 counts 分别统计五种 status，downloadable 按映射的 downloadEligible。已有 selection 只有 status=included、attachmentId truthy、securityLevel 为 normal/internal 时 eligible；staleVersion 仅等于持久 status=`stale-version`，不查询当前最终版本重新判定。

## 5. 创建包、快照与失败

1. 先 read 权限及真实 handover/project，读 selections；若空，调用原 refresh（同一 request/user，因而还要 write），随后按其真实 selectionIds 再查 rows；该 IDs 查询无 orderBy。没有额外“先 refresh 必须由用户点选”限制。
2. 若 selectionIds 存在，JS Set 去重后按 repository 返回顺序筛 selections；命中数与 Set.size 不等则 400 `Some attachment checklist selections do not exist for this handover`。不是按请求数组顺序归档。
3. expectations 按输入顺序逐条检查，仅限 selected 集合；未知 selection 400 `Attachment selection ${id} is not part of this package request`，rowVersion 严格不等则 409 `Attachment selection ${id} version mismatch`。不要求覆盖全部 selected，不增加提交时二次校验/锁。
4. included 来自 selected、status=included、有 attachmentId/securityLevel、normal/internal。excluded 来自全部 selections 中 status!=included，包含未选择项。included 空先 400 `No downloadable handover attachment selections are available`；其后才在 confirmedSensitiveExclusion=false 且 excluded 含 sensitive-excluded 时 400 `Sensitive exclusions must be confirmed before creating a handover package`。
5. now + 精确 24h（86400000ms）为 expiresAt，包 id=randomUUID，初始 running；storage 三字段 null、downloadedAt/failedReason=null、downloadCount=0。fileName 为 `project-handover-${handover.id}-attachments.zip`。manifestSummary 记录 included/excluded counts、按原序 attachment IDs、excludedReasons 的 Set 去重序；exclusionReason 使用 nullish 回退 status，不使用 truthy 回退。
6. included items 使用前述原序及连续 index；excluded items 来自全部 excluded，fileName=null，exclusionReason 回退 status。item id 由原数据库默认生成。没有 selectionId FK；冻结的是 attachmentId/versionGroupId/sourceRefs/entryName，不把后续 final 变化自动带入旧包。
7. 只有 archive 构建和 storage.saveDownloadPackage 在 try/catch。成功写 ready/location；Error 失败写 failed/原 error.message，非 Error 才固定 `Unknown package generation failure`。随后显式保存 package + items，再单独审计；生成失败可以正常 200 返回 failed summary。
8. 后续 DB/audit 错误不在该 catch；不自动移除成功写出的 ZIP，不补对象事务，不把已提交业务行回滚。原 repository.create 的 AUTO flush 可能在 archive 的附件查询或 storage 的配置查询前提交 running/items；refresh 内 findExistingActiveLink 亦可能触发新 selection AUTO flush。具体 SQL/UoW/失败残留以本批原 Nest 实际 trace 冻结，不能照“单次最终 flush”臆造原子性。

archive 对 included 的 attachmentId 逐个 requireAttachment（仅存在性，没有 active/security/target 的再次校验），读取该真实 row 的已存 location 并 readBuffer；不重新 resolve final。manifest 与所有文件 buffer 同时在内存，顺序读取，没有异步任务/流式 ZIP/大小上限新规则。

## 6. ZIP 字节 authority

`attachment.service.ts:1689–1834` 是完整原算法，未使用 zip、archiver 或压缩 SDK。

- entries 首项 `manifest.json`。其内容为 UTF8 `JSON.stringify(value,null,2)`，无尾换行。属性序为 packageId、handoverId、projectId、createdAt、expiresAt、manifestSummary、items。items 属性序为 selectionId、attachmentId、versionGroupId、displayName、category、securityLevel、fileName、sourceRefs；只列 included，排除信息在 manifestSummary。
- entryName=`String(index+1).padStart(3,'0') + '-' + sanitize(displayName) + extension`。extension 按原始 displayName 是否含 `.` 决定：含则空，不含则 `.bin`。sanitize 先将连续 `[\\/:*?"<>|]+` 替换成单 `_`，再 JS trim，再 UTF16 slice(0,180)，空则 `attachment.bin`。因此不能根据清洗后的名重算扩展名；保留补充字符边界及重复 `.bin` 等原结果。
- local header 30B：signature=0x04034b50，versionNeeded=20，flags=0x0800，method=0，DOS time/date，同 CRC32，compressed/uncompressed length 均原 bytes length，UTF8 name byte length，extraLength=0。
- central header 46B：signature=0x02014b50，madeBy/needed=20，flags=0x0800，method=0，相同时间/CRC/length/name；extra/comment/disk/internal/external attrs 全 0，记录 local offset。local 区后完整 centralDirectory，最后 EOCD 22B，single disk、entry count 两处、central length/offset、comment=0。
- 所有 header 数字 little endian。CRC32 初值0xffffffff，逐 byte 8轮多项式0xedb88320，最终 xor0xffffffff/unsigned32；不是 SHA 校验替代。
- 全包一次 new Date 取 UTC DOS 时间；year=max(UTCyear,1980)，month/day UTC，seconds 向下取偶数。不是本地时区、Unix extra timestamp 或 package.createdAt 强行固定；DOS 精度2秒。超过 ZIP32/Buffer write 字段范围保留原错误边界，不悄悄升级 ZIP64/截断计数。
- 实际双端比较：用真实 ZIP parser 独立验证结构/CRC/内容/文件名，并逐项对齐 manifest。仅生成 UUID/有记录 time window 内的 ISO 和 DOS clock 字段可按具名映射比较；不能全包忽略 bytes，也不能仅比较 unzip 后文件数。纯 helper 固定输入可机械提取原方法做 byte equality，须标纯验证而非真实存储运行。

## 7. 已存在的真实存储端口

K 直接复用 `Arc<AttachmentStorage>`，不复制 registry/default/secret/provider authority：

```rust
save_download_package(
    &self, package_id: &str, file_name: &str,
    body: &[u8], created_at: Option<DateTime<Utc>>,
) -> Result<ObjectLocation, StorageFailure>;
read_buffer(&self, location: &ObjectLocation) -> Result<Vec<u8>, StorageFailure>;
open_read_stream(&self, location: &ObjectLocation) -> Result<Body, StorageFailure>;
```

以上方法已存在于 `attachment_storage/registry.rs`，不是待建空 port。save 在真正 put 前解析当时 default runtime；key 为（含原 provider keyPrefix）`attachment-download-packages/YYYY/MM/DD/packageId/safeFileName`，contentType=`application/zip`，UTC 分日。TS safeFileName 只做连续非法字符替换、无 trim/180 截取；本 slice 生成固定 ASCII 包名。旧 package 缺 provider 时读取 fallback=`local`、bucket nullish→null，已有 key 不随 default 切换改写。底层本地/OBS 读取、错误及取消沿用真实 adapter；新验收必须让 K 消费真实对象。

现 Cargo 已有 Vec/chrono/uuid/serde、JsString、ICU、tokio、storage/binary helpers。建议新增 crate/feature：**无**。手写 ZIP32/CRC32 对齐原源，避免引入 zip crate 改时间、attribute、flag、extra 或压缩行为。Root 单写 Cargo/lock/lib/config/根 HTTP；A 不新增 SDK/环境。

## 8. 最小真实 facts port 与状态边界

B 候选 `crate::handover_facts::HandoverFacts::new(Database)`，构造纯函数，普通独立 SELECT，不加 FOR UPDATE、owner过滤、统一快照事务或新状态门槛。建议 errors 统一既有 `StorageFailure { status: Option<StatusCode>, message: JsString }`，SQL错误最终标准500；未找到返回 None，由 K 按原顺序生成404。以下字段已覆盖 K 全部实际消费：

```text
find_handover(id: &str) -> Result<Option<HandoverFact { id, project_id }>, StorageFailure>
find_project(id: &str) -> Result<Option<ProjectFact { id, source_lead_id: Option<String> }>, StorageFailure>
find_contracts_by_project(id: &str) -> Result<Vec<ContractSource { id, contract_no }>, StorageFailure>
find_followups_for_sources(project_id: &str, source_lead_id: Option<&str>)
    -> Result<Vec<FollowUpSource { id }>, StorageFailure>
```

contracts 必须 created_at DESC；followups 必须 project_id OR source lead_id、occurred_at DESC/created_at DESC。order ties 不加隐式 id 排序。无 freeze/snapshot EvidenceFact 产品口；原 sourceLeadId 的 truthy 边界不由 adapter“修正”。K service 先做原权限检查，再调用 getters。

Root 已选定供联合 G1 审阅的架构：保持既有 `AttachmentsService::new(Database,Arc<AttachmentStorage>)` 签名，在现 service struct 增私有 `facts: HandoverFacts`，以 `database.clone()` 纯构造 `HandoverFacts::new`（derive Clone）。不做外部 I/O、不建立第二 UoW。现 CallContext/实体图保留同一 session 与 pending flush；仅认证本批 K 公共入口边界，不因此认证任意未迁移 R4 caller-owned UoW。

### 8.1 R4 来源验收与产品迁移分列

原生产没有公开“创建 draft 移交”API。本批不能把写几个 handover 字段称原命令成功。Root/B 应具名冻结原 `database.seeder.ts` 的 prepared-state recipe 及 e2e fixture 逻辑身份，完整 remap 所有相关 UUID、actor、定义/快照/确认/项目/合同链，事前写封闭 ownership intent；在 fresh 两库生成 owned prepared state 后，实际原 Nest confirm 产生 confirmed 事实，可选执行原 freeze，保存原 HTTP/SQL/状态/审计证明，再由同一真实事实链供 K 消费。

这个链证明事实来源及消费者，不宣称 Rust R4 confirm/freeze 写链已迁移；不向 Rust 暴露新的状态门槛。K 正负例还应验证原允许 draft/未冻结输入的边界，而不是仅用 confirmed 成功掩盖额外 restriction。更细 recipe、schema 及两项参数 authority 见 B 的 `docs/design/rust-r2kr4/facts-route-input.md` 与 `facts-route-sources.json`，由 Root 联合包冻结，A 不复制一套来源。

B 的具名 recipe 为原 `makeHandoverE2EFixture(2,'main',true)`；原 seeder `:1195–1225` 创建 package/dispatch，`:1279–1531` 准备 project/contract/term/baseline/diff/readiness，`:1535–1685` 准备两类 summary、draft handover、confirmation record/participants，`:2063–2104` 派生 fixture/participant IDs。验收不使用预置 freeze 冒充本次命令产物；完整 ownership/分支列由 B 的机械 INSERT 清单约束。原 workflow e2e `:22–69` 与 `support/project-handover-api.ts:26–40` 作为原命令调用参考。

## 9. 持久化、审计与 Native 必证点

已有三表 `project_handover_attachment_selection`、`attachment_download_package`、`attachment_download_package_item` 在 `Migration20260505113000_ex52a_attachment_handover_runtime.ts` 建立，全部历史迁移链仍须整体初始化/对照。选择项 partial unique `(handover_id,version_group_id) WHERE version_group_id IS NOT NULL`；三表原 FK/check/index/default/onCreate/onUpdate 保留。selection/package 的 row_version 为 ORM version；item/link 没有此版本。不得新加乐观锁、约束或忽略原 PG23505。

K 写 selection/link/package/item 与 audit_log，读取 attachment、四类 facts、provider config；沿用当前 ResolvedSession/pending auth flush 和身份图。审计 `targetType` 一律 `attachment`，operator/requestId 原 nullish 语义，event：

- viewed：handover target，success，projectId/selectionCount，早于候选收集。
- refreshed：handover target，success，projectId/refreshedCount/includedCount，在显式业务 save 后。
- batch_package_created：package target，ready为success否则failed，projectId/projectHandoverId/packageId/attachmentIds/excludedAttachmentIds，在业务 save 后。
- batch_package_expired：package target，rejected，projectId/projectHandoverId/packageId；先保存 expired、再 audit、再409。
- batch_package_downloaded：package target，success，projectId/projectHandoverId/packageId/downloadCount；先 open，再设置 Date/count、保存、audit，最后交给 controller pipe。

Native 最小有限见证（先观察、再定 store，不用手写 ORM oracle 替代）：

1. 无 selection GET、refresh（含新+既有多个候选）和隐式 refresh create 的完整 SELECT/AUTO flush/CREATE/UPDATE/audit 顺序、SQL参数类型、实际 versions/createdAt/updatedAt、pending auth 首次 coflush；明确空 refresh 是否 flush。
2. final 优先、normal/internal 纳入、两敏感级排除、多源去重、manual excluded preserve true/false、旧 selection 留存、真实 R4 recipe 事实输入，均使用真实 J 上传/版本/link 接口和持久行；验证缺 handover/project、project read/write 差异。
3. DTO省略/null/错误、selection duplicate/未知/另 handover、expected missing/冲突/重复及 UUID 字面大小写；不新增 service 限制。
4. 成功包：真实本地文件/ZIP/manifest/items/审计；GET状态不lazy expire；default切换后旧location可读；至少一条受控真实 OBS 包写/读以见证 save 使用现 authority，而非 mock provider。
5. TTL精确边界和二次download：首个 expired branch保存+审计+409，随后 not-ready409；ready读取失败不加count，成功open后计数+审计，即使body首段/后段失败。HEAD原effect、header/cache/noRange由真实HTTP见证。
6. 真实 owned 文件缺失/读取失败、put失败、DB/check/unique或audit故障，逐项记录 status/body、failedReason、已提交 running/failed/ready/packageItems、ZIP残留及审计；fault前后 source/catalog/原 bytes 校验恢复。没有 rollback 就不替原回滚。
7. 同 loaded version 的 download counter/refresh竞争以有限确定性原 SQL/CAS witness 裁定，保留原 precheck/PK-only batch窗口及实际 RETURNING；不凭理想事务增加锁或二次 expectation。

## 10. 验收与交付分工

Root 划定候选作者边界：A 拥有现 `attachments` 的 model/store 三个 K 实体扩展、service/ZIP/validation/http 内部接线及 K tests/probe/helpers；B 独占新增 `handover_facts/**` 与 facts tests，以及原 R4 两参数的受限变更；Root 统一 crate lib/全局 router/state/Config/Cargo、source guards、全环境/ownership fixtures、原 Nest 与 Rust actual运行、UI、审计与正式治理；C 独立 G1/G3。A 不改 B 文件或共享入口。该分工仍待联合 G1 通过才可产品开工。

原 TS service/controller 及 UI specs 主要使用 mock repository/storage，列入来源但不能作为真实 PG/存储证据。G3至少包括当前5operation+guard/CSRF/HEAD/404/path/error/DTO真实HTTP对照、完整schema/92迁移链验证、上列PG/ZIP/local/OBS/审计有限见证、原Angular页面和store原接线消费新Rust端点的实际UI流程、既有IJ19+6相关回归与Rust完整checks。运行和比较器均保留原失败、time bounds/UUID允许映射、源/二进制和cleanup证据；不能把不同case的随机顺序、时间或工具故障当产品P2。

所有夹具为新 K 环境封闭 owned roots/rows/objects，先登记 intent，实际创建及外层commit证据后收养；global default 修改按前值/精确版本条件恢复。文件故障精确恢复原 bytes/hash，临时DDL恢复完整catalog/ACL；两次零残留及 owner source/binary unchanged/正常停服由Root验收。无旧IJ/L1运行、无真实OBS凭据、不触生产租户。

本件只完成输入整理。当前无 K 产品实现或运行 Pass；联合 G1 明确通过前不进入 G2。
