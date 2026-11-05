# R4D 项目移交与回款判断冻结 G1 候选 01

- Gate Status: `Pending`，用户已裁决产品闭环，待联合 G1 完成精确输入及非作者复核；尚未冻结，禁止据此开始产品编码。
- Parent: [#106](https://github.com/illusion-tech/poms/issues/106)；D 子片 [#107](https://github.com/illusion-tech/poms/issues/107)；阶段 [#101](https://github.com/illusion-tech/poms/issues/101) 与总体 [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open。
- Base: `565661b9113372de4da6662a4a692fbfd2296dd6`；准备分支 `codex/poms-r4def-next28`。
- Owner: D 作者；共享契约、schema、路由适配、迁移及公共文档由 Root 独占集成。
- Slice Type: `cross-layer-high-risk`；当前文档交付阶段为 `docs-only`。
- Author configuration: 用户明确指定 `Sol6.1 / max`；Fast 未核实，不宣称启用。
- Evidence class: `static-input-only`。本候选只证明源码/正式设计/完整规范的静态核对，不证明任何业务 HTTP、数据库事务、浏览器或迁移已经实跑。
- Machine input: [D-g1-candidate01.json](D-g1-candidate01.json)，包含完整规范的现有 D 5 操作和传递 schema、目标 7 操作/DTO、原始字节 SHA256、候选 producer/DDL/验证矩阵。精确 SQL 候选另见 [D-schema-candidate01.sql](D-schema-candidate01.sql)，未执行。

## 1. 范围与 G1 阻断

现有范围是 D 5 个 HTTP：合同承接摘要、项目最新移交详情、指定移交详情、最终移交确认、合同移交前再基线化。用户已明确同意新增准备与本人参与确认 2 入口，目标 D 7 与 E 11、F 12 合计本批 30，其中 28 既有、2 新增；B 受控合同变更复用现有操作不重复计数。当前规范中既有 28 和已交付 Rust 210 无重叠。真实的草稿、参与人确认、摘要、回款判断冻结、合同变更来源及 R2 附件消费均属于需要补齐的机制；不得以 fixture 直接插入 `draft / confirmed / effective` 作为交付。

用户裁决原文载于 [user-decisions01.json](user-decisions01.json)。D-B1/B2/B3/B5 的产品方向已获得明确授权；下表保留最初缺口及其收敛条件，不表示仍需用户重复批准同一选择。剩余工作是 Root 将精确 route/DTO/DDL/正式输入写回并完成独立 G1。

| ID   | 阻断事实                                                                                                        | 推荐裁决                                                                                                              | 冻结条件                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D-B1 | 现有 5 HTTP 没有准备、指派执行负责人、参与人自确认入口；完整 spec 也没有通用 confirmation HTTP                  | 用户已选新增准备和参与人自确认 2 入口；先走 canonical 登记。本批由 28 调整为 30，D 由 5 调整为 7                      | Root 正式文档和权威路由清单先冻结                                                  |
| D-B2 | lifecycle 要求角色权重冻结后才能完成移交；command 和 closure 又允许先形成移交事实，再由 R5 完成最终收口         | 将 `ProjectHandover.status=confirmed` 固定为移交事实已确认；最终 `execution` 准入由真实 R5 角色冻结及同链校验联合派生 | 正式输入写回同一分层语义，R4 不宣称最终 closure                                    |
| D-B3 | Node/Rust 均无真实合同变更生产闭环；`contract_amendment` 仅版本/状态，无 preparation/审批/目标快照绑定          | 复用已有 B 的准备、精确审核、activate 路由增加正式变更分支；D 只消费具有精确 before/after 来源的 effective amendment  | 冻结 B 受影响 DTO、审批绑定、激活/计划版本机制与 D 所有权，不接受只种 effective 行 |
| D-B4 | 现有项目级摘要只取一份 project current readiness；单一 `contract_term_snapshot` FK 不能完整表达多合同承接集合   | 新增不可变项目移交依据及合同成员表；原单快照字段保留真实合同快照锚点，新增整体依据 ID，所有合同逐份检查               | Root 冻结新字段、兼容锚点语义和全合同校验，禁止把单合同冒充整集合                  |
| D-B5 | `project.owner_user_id` 只表达销售主责；执行/商务/售前责任人无正式项目字段；现 common 确认一人一行、单 role key | 用户已明确允许兼任及本人确认；准备动作显式指派职责，增加职责映射，一人确认一次覆盖本人已分配职责                      | Root 冻结四类必选职责、指派权限和明确财务参与标记；不存在代签                      |
| D-B6 | `receiptJudgmentMode` 当前是任意 string 且 optional，测试甚至使用无正式含义的 `milestone-receipt`               | 固定 `project-aggregate / contract-separate` 两种业务模式；准备时必选，确认时冻结，禁止默认和普通修改                 | Root 冻结代码值及兼容策略；不能把任意旧字符串当合法策略                            |

现有生产缺口为 `existing-baseline-drift`，补齐公开入口/契约/DDL 为用户授权的 `design-change-required`。不以 Node bug parity 放行，不以内部 CLI、测试入口或未登记 HTTP 代替产品入口。

## 2. 产品可操作闭环的两个方案

### 2.1 方案一：派生草稿并改变既有 `:confirm`

在已有 B activate / A initializeReceivablePlan 成功后，通过同一 `CommonSession` 检查全部有效合同，资料完整时派生待移交草稿。GET 保持只读，不在读侧补写。该方式只能派生合同事实，不能派生执行负责人、商务/售前责任指派和真实同意。

因此仍须将现有 `:confirm` 明确建模为分阶段命令：准备阶段登记执行负责人和职责，确认阶段只记录当前登录人自确认，最后一名确认并满足所有 gate 时原子终结。请求至少新增准备/自确认的判别字段，响应必须由现有 `businessStatusAfter: confirmed` 改为 `draft / pending-confirmation / confirmed` 的正式 union。所有参与人共享已持久化的同一摘要版本；后续请求不得按传来的名单替别人确认。

此方案保留 5 个 URI/operationId，但不是保持现有合同：需要正式改变 command、DTO、响应与 UI。既有一次终结语义和全名单提交客户端不能未经迁移继续使用。项目当前仅有销售 owner，故“激活后自动得到完整参与人”不是成立的前提。若准备期间事实变化，必须关闭旧确认、生成新版本，不能让已同意旧材料的人自动同意新材料。

### 2.2 方案二：新增明确入口（用户已选择，待 G1）

| Method / canonical path                                      | 候选 operationId                                              | 权限/身份                                                            | Request                                            | Success / Response                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| `POST /api/projects/{projectId}/project-handovers`           | `ProjectHandoverController_prepareProjectHandover`            | `project:write`、会话/CSRF及项目动作范围                             | `PrepareProjectHandoverRequest`（见下）            | `201 ProjectHandoverDetailView`；真实 pending 确认、摘要/依据引用和后续动作 |
| `POST /api/project-handovers/{id}/participant-confirmations` | `ProjectHandoverController_confirmProjectHandoverParticipant` | 已认证、CSRF、`project:read` 与当前 pending 参与人关系；不接受代确认 | `ConfirmProjectHandoverParticipantRequest`（见下） | `200 ProjectHandoverDetailView`；只更新本人参与状态和本人 todo              |

只有上述路线在 `api-route-canonical-inventory.md` 先成为 authoritative 行并冻结 DTO 后才能实现；它们已属用户授权目标范围，当前尚未实现。

`PrepareProjectHandoverRequest` 精确字段：`executionOwnerUserId: UUID`；`participants: [{userId: UUID, responsibilities: [{roleKey: sales-owner|business-admin|technical-support|execution-owner|finance, responsibilitySummary: trim string 1..1000}]}]`（至少1个唯一user，每user职责不重复）；`financeConfirmationRequired: boolean`；`receiptJudgmentMode: project-aggregate|contract-separate`；`expectedProjectVersion: positive int`；`expectedSourceHash: lowercase hex SHA256`；可选 `expectedCurrentHandoverVersion: positive int`、`comment: trim string ≤1000`。四类核心职责必须各有承担人；一位 execution-owner且等于显式执行人；sales-owner等于真实project.owner；财务标记为true时finance职责必须存在。财务参与是准备人明确确认的事项，不能由系统角色猜测。此字段不允许规避已存在的真实财务/税务阻断。

`ConfirmProjectHandoverParticipantRequest` 只有 `summarySnapshotId: UUID`、`handoverBasisSnapshotId: UUID`、`expectedConfirmationVersion: positive int`、可选 `comment: trim string ≤1000`。**没有 `userId / actorId / participantStatus / roleKeys` 请求字段**；actor来自已认证会话，所确认职责仅来自当前不可变材料。属于当前名单、同summary/basis后，必须在项目/当前依据/实际合同和附件来源锁内重新采集完整active合同集合、各snapshot/plan及实际附件语义，并比较当前hash与已固定依据。source-changed即409 `source_changed`，在写本人确认、todo、count或audit之前整体拒绝，不能等到final才阻断。只有来源仍一致且本人pending时才写入；其他用户或相同id不同职责不允许覆盖。已经本人确认且同一版本、来源仍一致时可返回幂等200原状，旧版本或source-changed均409。

两条新路由响应复用扩展 `ProjectHandoverDetailView`，required字段包含：`handoverBasisSnapshotId: UUID|null`、`sourcePayloadHash: SHA256|null`、`executionOwnerUserId: UUID|null`、`financeConfirmationRequired: boolean|null`、`version: positive int|null`、`closureStatus: not-started|handover-in-progress|handover-confirmed-freeze-pending|handover-completed-with-commission-freeze|review-required`、`executionAdmission: {allowed:boolean, blockingReasons:string[]}`；participant每项增加 `responsibilities[{roleKey,responsibilitySummary}]`，`requiredCount/confirmedCount`按唯一用户计数。保留旧 `participantRoleKey` 作为兼容主职责（有execution-owner优先，否则按固定role顺序），不得把它当全部职责。prepare响应 `handoverStatus=draft`，self-confirm即使最后一人完成仍为draft，最终确认仍由既有`:confirm`明确触发。

`GET contract-handover` 增加required `projectRowVersion: positive int / sourcePayloadHash: SHA256 / contractReadiness[]`；每个contractReadiness含 `contractId / readinessPackageId / preparationId / snapshotId / planVersionId / status / blockingReasons[]`。它根据真实来源只读计算current hash，供prepare直接提交expectedSourceHash，不依赖未公开内部数据。只有通过`project:write`动作守卫者返回optional `availableParticipants:[{id:UUID,displayName:string}]`，来源为真实active `platform_user`，只含必要内部展示名，不返回用户名、邮箱、电话、组织、平台角色或管理字段；只读者不含该属性，也不为此授予平台users管理权限。详情增加 `projectRowVersion / currentSourcePayloadHash / sourceChanged`，历史sourcePayloadHash始终保持当时值，current hash另列。

金额汇总按币种进行：同币种使用精确cents求和；多币种返回新增`amountTotalsByCurrency[{currencyCode,totalSignedAmountProjection}]`，旧单合计projection的value为null、displayText为“按币种查看”，不做未经定义的汇兑相加。每份合同保留独立金额，汇总不成为硬总额或自动分摊规则。

流程：真实合同准备/审核/生效 → 真实正式应收计划 → 商务准备动作明确责任人并冻结承接材料 → 各参与人使用本人会话确认 → 具备终结权限者执行既有 `:confirm` → 真实移交事实/回款模式冻结 → R5 消费该事实完成角色权重冻结 → 同链完整后才具备 execution 准入。最后一步不是本片已交付功能。

UI 最小改动是现有 `project-contract-handover.ts` 增加准备表单、参与职责/本人确认状态及操作、回款模式选择、最终确认动作与结果刷新。当前页面只有 GET 摘要和附件刷新/打包/下载，`ProjectWorkspaceStore` 没有 prepare、self-confirm 或最终 confirm 调用；页面“系统会生成可读取移交记录”的文案目前没有对应 producer。任何路线都需要真实浏览器闭环，不能只新增 library 函数。

### 2.3 责任人与权限不从审计字段反推

- 销售主责建议读取当前 `project.owner_user_id` 并在准备材料中固定，变更后须重新准备。
- 执行负责人必须显式选定有效用户并记录指派人；不得沿用 sales owner、contract createdBy 或第一个具有平台角色的用户。
- 商务行政、售前/技术和必要财务职责由准备动作明确指派。正式设计列出的四类关键职责不能被“名单非空且有 execution-owner”替代。
- 用户已明确允许同一人承担多个职责，每个职责有责任说明；一人只能以本人会话确认自己的已分配职责，角色权重/提成比例不在此表单出现。
- prepare/final维持 `project:write`，self-confirm采用`project:read`+严格本人关系。开发基线中的销售助理确实只有project:read，不能要求所有真实参与人额外获得项目编辑权；也不能根据这些开发角色自动挑业务承担人。

## 3. 正式输入与 SSOT

| Concern                     | 正式输入                                                                                                                   | 冻结规则                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 生命周期及销售/执行责任分离 | `project-lifecycle-design.md` §5.5、§6、§9–11                                                                              | 合同有效不等于移交；销售 owner 不被执行 owner 覆盖；execution gate 与 R5 联合 |
| 合同集合及独立金额          | `contract-finance-design.md` §15；真实 R4ABC preparation/activation/plan                                                   | 纳入全部当前 active 合同；每合同独立金额和来源，不受项目报价硬总额/分摊约束   |
| 移交准备与摘要              | `phase2-contract-to-handover-workspace.md` §6–10；`phase2-project-handover-gate-workspace.md` §6–10                        | 真实来源、明确职责、同一 handover-confirmation 摘要，GET 不补写               |
| R5 边界                     | `phase2-commission-freeze-at-handover.md` §3–7；`phase2-handover-closure-rules.md` §3–7                                    | 事实确认、回款模式冻结、角色权重冻结分别留痕；最终收口联合派生                |
| 公共命令/DTO/读侧           | `interface-command-design.md` §4.5、§4.7；`interface-openapi-dto-design.md` §5.1、§5.7；`query-view-boundary-design.md` §5 | 保留 canonical、opId、敏感投影；任何修订先冻契约                              |
| schema/逻辑表               | `schema-ddl-design.md` §8.1、§8.5/相关完整性；`table-structure-freeze-design.md` §4、§7                                    | 版本、替代、唯一当前、来源 FK、不可变 payload 与具体 DDL 对齐                 |
| 横切会话与审计              | 当前 `contract_support`、`approval_common` 与 R4ABC 真实实现                                                               | 一条外层事务、一条连接、同一 CommonState、真实 audit；必要失败整体回滚        |
| 现状差异证据                | Node controller/query/command/repository/entity/spec/seed，Rust handover_facts/attachments                                 | 只作静态行为/缺口依据；不将旧实现 bug 当业务规范                              |

UUID 使用系统内部 UUID；来源 ID 不伪造成 UUID。钱使用十进制字符串及精确两位 cents；比例使用明确单位和精度。`confirmedAt / generatedAt / handledAt` 为 UTC instant；`retentionDueDate` 保持 date，不作时区转换。生命周期状态、手工职责、快照版本、乐观锁 `rowVersion` 分别建模，不混用。

## 4. 当前 D 5 操作矩阵

以下均来自完整当前 spec，成功码均 `200`。权限来自当前 controller；公共路由 inventory 当前均 `aligned`，canonical capability 的名称与真实 operationId 不必相同。

| OperationId（`ProjectHandoverController_` 前缀） | Method / path                                     | 权限                        | Request → Response                                                       | 读/写视图及守卫                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `getContractHandoverSummary`                     | `GET /api/projects/{projectId}/contract-handover` | `project:read`              | path string → `ContractHandoverSummaryView`                              | 全部 active 合同、逐合同实际 readiness/preparation/snapshot/plan、当前移交依据/再基线化、摘要引用；无写侧生成    |
| `getProjectHandoverDetailByProject`              | `GET /api/projects/{projectId}/project-handover`  | `project:read`              | path string → `ProjectHandoverDetailView`                                | 当前有效或最新可解释链；不存在时 `not-started` 与 null IDs，不伪造 draft                                         |
| `getProjectHandoverDetailByHandover`             | `GET /api/project-handovers/{id}`                 | `project:read`              | path string → `ProjectHandoverDetailView`                                | 指定历史 handover 的不可变材料/确认，不套用其他当前合同的内容；不存在 404                                        |
| `confirmProjectHandover`                         | `POST /api/project-handovers/{id}:confirm`        | `project:write`、会话、CSRF | `ConfirmProjectHandoverRequest` → `ConfirmProjectHandoverResult`         | 当前 draft、版本/摘要/依据一致、各人真实自确认、执行负责人已确认、无 source drift/未收口再基线化；原子终结及冻结 |
| `rebaselineContractHandover`                     | `POST /api/contract-handover-rebaselines`         | `project:write`、会话、CSRF | `RebaselineContractHandoverRequest` → `RebaselineContractHandoverResult` | 精确 effective amendment、当前 draft/依据、真实受影响项、新 snapshot 来源与集合归属；原子切换新待确认材料        |

当前确认请求：`comment?`（trim，≤1000）、`participantConfirmations[]`（至少一项，UUID+roleKey≤64+literal confirmed）、`receiptJudgmentMode?`（任意非空 string≤64）、`contractSummarySnapshotId`、`expectedVersion?`（正整数）。当前响应：`targetId`、literal confirmed、`confirmationRecordId`、nullable `receiptJudgmentFreezeId`、合同摘要/单基线/移交摘要 ID、projection/export。

当前再基线化请求：`contractAmendmentId`、trim 非空 `rebaselineReason`≤1000、非空 `affectedHandoverItemIds[]`、`effectiveBaselineAfterId`、`expectedVersion?`。当前响应只含 `targetId / rebaselineRecordId / effectiveBaselineAfterId / resultStatus=effective`；正式 command 要求的完整结果链应由扩展响应及 GET 返回，不能靠页面临时拼接。

当前 GET DTO 嵌套字段、required/nullable、枚举与传递 schema 原样记录在 JSON 的 `currentPublicContract`；它们描述当前基线，不代表建议的变更已被冻结。

建议修订：prepare 固定整体 `handoverBasisSnapshotId / sourcePayloadHash / version`，GET 增加每合同 readiness/snapshot/plan 结果和 `closureStatus / executionAdmission`、真实 `handoverBasisItems[{id,itemType,sourceType,sourceId,sourceVersion,summary}]`；既有单值 rollup 仍显示 all-contract 状态，但多成员时 nullable 单来源字段不得谎指一份 latest readiness。final confirm 新增 required `handoverBasisSnapshotId / summarySnapshotId / sourcePayloadHash / expectedVersion`；旧全名单仅可作为所有(user,role)集合一致性检查，不是生成他人同意的授权；`receiptJudgmentMode?`若传入必须等于准备时已选值。result保留现有字段并增加required整体basis/hash/closureStatus/executionAdmission。R5 pending时不得返回execution allowed。新增字段和literal变更交Root单点处理。

rebaseline请求增加required `sourceHandoverId / handoverBasisSnapshotId / sourcePayloadHash / expectedVersion`，旧`effectiveBaselineAfterId`必须等于所选变更已绑定的after snapshot；响应新增required `sourceHandoverId / replacementHandoverId / handoverBasisSnapshotId / contractSummarySnapshotId / summarySnapshotId / sourcePayloadHash / affectedHandoverItems[] / currentHandoverBaselineSummary`，与new effective rebaseline同事务返回。GET和response直接提供可回溯的新结果链。

所有 GET 的金融字段使用真实 actor 的 `contract-finance` 敏感投影；缺敏感权限输出 masked/denied，并在同外层事务写必要 security audit。禁止复制 Node command 构造虚假全敏感权限用户。守卫在内部读真实原始事实，不借 UI 投影真假决定业务正确性。空结果和数据库不可用严格区分；数据库/必须审计失败返回 500 并回滚。

`ProjectHandoverBasisItemSummary.summary`固定为安全常量摘要模板，只允许已登记item/source类型、规范来源ID、规范版本和可见状态，例如“合同条款来源 <UUID> · 版本 2”；不能复制source payload的成本、风险、报价、税务或人工原文，也不拼接金额、费率、工时、自由说明。详细材料另依字段包授权投影。相同约束适用于`affectedHandoverItems[]`和source-generated blocker/impact摘要；`latestHandoverRebaselineSummary.impactSummary`只显示项数及安全类型，不把rebaselineReason或payload原文直接回显给只读者。

### 4.1 受控合同变更：复用 B 路由的精确分支

正式 `interface-command-design.md` 的 `submitContractAmendment / activateContractAmendment`、`interface-openapi-dto-design.md` §5.2 仍列独立 `/contract-amendments/{id}:submit / :activate` 草案，权威canonical未登记、完整spec未实现。Root必须写回本次复用方案，不保留两套相互冲突的实现输入；本片不实现这两个草案URI。

| 已有 operationId / path                                                                                                            | 目标 DTO 变化                                                                                                                                                                                 | 新分支结果                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ContractReadinessController_createContractReadinessPackage` / `POST /api/contract-readiness-packages`                             | 现有request新增可选 `amendment:{sourceSnapshotId:UUID,reason:trim string 1..1000,expectedContractVersion:positive int}`；Active合同必填、Draft合同禁止；candidateTerms仍通过真实来源/diff审核 | 真实 amendment draft与新readiness绑定，返回detail新增nullable `contractAmendmentId / sourceContractSnapshotId / amendmentStatus`；不改Active合同主表金额                                                                     |
| `ContractReadinessController_initializeContractSnapshot` / `POST /api/contract-readiness-packages/{id}:initializeContractSnapshot` | 现有request新增 `contractAmendmentId?:UUID`，Active分支必填并匹配该readiness；expectedVersion继续针对readiness                                                                                | 新prepared版本，存旧contractCoreHash+新candidateTerms/hash；amendment绑定preparation；result新增nullable `contractAmendmentId`                                                                                               |
| `ContractController_submitReview` / `POST /api/contracts/{id}:submitReview`                                                        | 现有`preparationId`保留，新增`contractAmendmentId?:UUID`；Active分支必填，精确匹配prepared source                                                                                             | contract仍Active，amendment submitted；review_binding绑定amendment/preparation/version/hash；response补nullable amendmentId                                                                                                  |
| 已有 R2 `ApprovalController_approveRecord / rejectRecord`                                                                          | 公共request无新增；handler消费精确review_binding中的amendmentId                                                                                                                               | approve只改amendment为approved；reject将本变更voided并保留审核历史；不能把Active合同改回draft，不能生效未批准变更                                                                                                            |
| `ContractController_activate` / `POST /api/contracts/{id}:activate`                                                                | 现有request新增`contractAmendmentId?:UUID / approvalRecordId?:UUID`；Active变更分支两者必填，不使用模糊latest approval                                                                        | 同事务旧snapshot superseded、新snapshot(version+1)active、amendment effective且before/after准确、contract金额及currentSnapshot和适用正式plan切新版本；返回beforeSnapshotId/contractAmendmentId/snapshotVersion/planVersionId |
| `ContractReadinessController_initializeReceivablePlan` / `POST /api/contract-readiness-packages/{id}:initializeReceivablePlan`     | 请求已有contractId和package；response补nullable contractAmendmentId；不新增URI                                                                                                                | 正式plan核心抽成同session内部producer供变更activate调用；该公开入口对已生成新snapshot/plan返回精确幂等结果，初次签约原显式初始化路径保留                                                                                     |

初次签约路径保留原规则。变更路径有三个关键区别：新candidate金额不必等于旧contract.signedAmount；准备时只验证旧core尚未变化并精确绑定before snapshot；**只有activate成功时**才更新contract金额及currentSnapshot。旧activated preparation可以`is_current=false`但必须保留`status=activated`及原activated_snapshot字段，不能因准备新版本而抹除历史或违反现有activation CHECK。新来源/diff/approval不通过时，旧Active snapshot/plan仍有效。

按Root [protocol01](protocol01.md)，正式变更activate必须借同一session调用 `initialize_plan_from_effective_snapshot` 核心producer，完成新plan/version/nodes/initRecord及readiness指针后才能整体提交；节点或audit失败时旧snapshot/plan/contract/amendment全部保持原样。原plan/nodes/receipt关联只改当前性，不删除或重新挂载历史事实。后续公开initializeReceivablePlan的精确重试不再生成重复节点或初始化记录。

移交准备校验从每份当前active snapshot向后追溯**当时已批准**的preparation/review/readiness/plan和冻结sourceFacts，不要求这些历史来源仍是项目当前版本；正在准备或待审的新变更不会使旧Active事实假失效。新snapshot原子切换后，旧draft依赖的snapshot hash变化，才显示source-changed并等待再基线化。任何旧snapshot尚有其他合同/财务关联均保留，不删除节点或重写已确认receipt。

## 5. 真实 producer 与所有权

| Producer / owner                              | 触发和输入                                                                                   | 输出/版本                                                                                                                                                                                                          | 失败边界                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `prepare_handover / D`                        | 已选方案二准备 HTTP；真实 actor、project、明确职责/执行人、所选回款模式、source hash/version | all-contract 依据 snapshot、合同承接 summary、handover-confirmation summary、真实 draft、pending confirmation+participant+todo；每次材料变化新版本                                                                 | 同一外层事务；缺一份合同/plan/来源、缺职责或写任何必需表失败均无半成品           |
| `produce_contract_summary / D + common`       | prepare/rebaseline 的已验证合同成员快照；不得由 GET 调用                                     | `targetType=project`，`approvalScenarioKey=handover-confirmation`，package=`contract-handover-confirmation`，projection=`handover-confirmation`，export=`handover-controlled`；payload+hash 固定来源和字段规则版本 | active definition 必须存在并匹配；字段投影至少一项；失败回滚                     |
| `produce_handover_summary / D + common`       | 同一合同 summary、整体依据、职责、回款模式、附件清单固定版本                                 | `targetType=project-handover`，同 `handover-confirmation` scenario，package=`project-handover-confirmation`；与合同 summary 联合引用                                                                               | 不沿用 Node seed 的 scenario=`project-handover` 漂移；不只写 metadata 无实际材料 |
| `create_confirmation / D 调 common`           | 明确用户/职责，已生成不可变移交 summary                                                      | common 一人一 pending participant/todo；职责映射固定 user→roles；summary 绑定不可更换                                                                                                                              | 不预设 confirmed；重复用户不重复建 common participant；缺角色 mapping 不放行     |
| `confirm_own_participation / D 调 common`     | 方案二 self-confirm HTTP；actor 必须是 pending 参与人；summary/confirmation version 匹配     | 仅本人状态/时间/意见、本人 todo；真实 confirmedCount；各人均确认后 common record confirmed                                                                                                                         | 无代签、无批量替他人确认；最后一人确认不伪造 R5 冻结                             |
| `finalize_handover / D`                       | 既有 `:confirm`，全部来源及个人确认再次在锁下校验                                            | handover confirmed、真实 confirmedAt/By、project_receipt_judgment_freeze、audit；R5 source-ready                                                                                                                   | 回款模式未定或同链冲突时整体拒绝；不改 Project.owner，不直接推进 execution       |
| `produce_contract_amendment / B 共享改动候选` | 真实 Active 合同经既有准备→绑定审核→activate 正式变更分支；明确 reason/sourceSnapshot        | amendment version、source preparation/review、before/after snapshot、payload hash；新 plan 由正式 snapshot seeds 版本化生成                                                                                        | 审核批准前保留旧 Active事实；激活与来源绑定失败整单回滚；无 fixture 变更         |
| `rebaseline_handover / D`                     | 既有 rebaseline HTTP；消费真实 effective amendment 和实际 affected basis items               | 追加 rebaseline/impact；新整体依据/summary/draft；旧确认关闭/待办取消，新确认 pending；effective chain 原子切换                                                                                                    | 不重写已 confirmed 移交历史，不任意接受其他项目/合同条款快照                     |

`approval_summary_snapshot` 和 `approval_summary_field_projection` 当前只有元数据/规则，不能保存已交接的实际值；D 必须新增不可变 payload 记录。摘要 payload 应含已批准来源的明确引用、必要确认字段、脱敏字段规则与附件清单/哈希，不把一大段 `channel_scope_summary` 当结构化业务数据。短时 reveal 不写入默认 payload 可见范围。

两份正式摘要package definition由本片版本化SQL注册（见SQL候选末尾），场景/包/投影/export/rule版本固定；定义缺失不是要求测试seed先插入的前提。prepare调用真实domain producer生成字段投影、值payload及摘要来源hash，同事务audit。旧 `r4_summary_producer` 属测试producer，不能用作产品触发或生产资料来源。SQL若遇既有同key却不同rule/策略的定义，显式停止并要求有证据的数据协调，不静默覆盖。

## 6. 表、字段与必要 DDL 候选

### 6.1 现有表与实际字段

| Table                                                                                                                 | 当前字段/约束                                                                                                                                                                                                                   | D 消费或修正                                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `project_handover`                                                                                                    | id/project_id、contract_summary_snapshot_id、effective_handover_baseline_snapshot_id→contract_term_snapshot、summary_snapshot_id、handover_rebaseline_record_id、status、confirmed_at/by、comment、created/updated、row_version | 保留真实里程碑；增加整体依据/version/current/supersedes/执行人/确认绑定；confirmed 行历史材料不可原地改写 |
| `contract_handover_rebaseline_record`                                                                                 | amendment/project、reason、effective_baseline_after_id、status、handled_at/by、supersedes、created/updated、row_version；project/amendment 条件唯一 effective                                                                   | 增加 before/after 整体依据/来源handover/目标handover；切换有因果、影响真实可寻址                          |
| `handover_baseline_impact_item`                                                                                       | record、affected_handover_item_id（当前裸 UUID）、impact_type/summary、supersedes_baseline_id                                                                                                                                   | 补真实 basis item FK 和 `(record,item)` unique；校验同项目/当前旧依据；拒绝只因 UUID 合法便接受           |
| `project_receipt_judgment_freeze`                                                                                     | project/mode/source_type/source_id、source_handover/summary/rebaseline、current、frozen_at/by、supersedes、row_version；每project一 current                                                                                     | 模式 CHECK、整体依据引用/version；冻结后普通编辑不可改，已有calc/payout时绝不切模式                       |
| `confirmation_record / confirmation_participant / todo_item`                                                          | target/project/type、pending/confirmed/closed、counts/times/version；participant unique(record,user)、单role；todo 来源及assignee                                                                                               | 复用真实 common 命令；D 新职责映射承接多角色，不修改 shared confirmation 历史语义                         |
| `approval_summary_package_definition / snapshot / field_projection`                                                   | scenario/package/projection/export/rule版本；active tuple唯一；projection unique(snapshot,field)                                                                                                                                | 迁移种正式两个 package，scenario一致；追加实际payload；supersedes时旧记录保留                             |
| `contract / term_snapshot / readiness / preparation / review_binding / receivable_plan_version / init_record / nodes` | R4ABC 的 per-contract 准备、hash、审核绑定、生效snapshot和正式plan链                                                                                                                                                            | 准备读取快照当时已批准事实，逐合同关联；不依赖一份“项目当前readiness”                                     |
| `contract_amendment`                                                                                                  | id/contract/version/current/supersedes/status/audit/version，没有payload/review/snapshot绑定                                                                                                                                    | 增加正式变更 source/before/after/审批绑定，不能把任意 effective状态行视为足够证据                         |
| R2 `project_handover_attachment_selection / attachment_download_package / item / attachment_link / attachment`        | 真实handover FK、来源refs、版本组/security/status/rowVersion；package manifest及item绑定                                                                                                                                        | D 只读真实材料版本；原有R2HTTP消费D真实handover。最终确认不调用另一个pool的K5写服务                       |

### 6.2 新增结构（必须先 SQL、再 entity/contract）

1. `project_handover_basis_snapshot`：`id uuid PK`、`project_id FK`、`version int>0`、`source_payload jsonb NOT NULL`、`payload_hash varchar(64)`、`status`、`is_current bool`、`supersedes_id self FK`、`generated_at timestamptz`、`generated_by uuid`、`row_version int`。`UNIQUE(project_id,version)`、每项目一条 current，hash 为规范 JSON SHA256；payload 不可 UPDATE，替代只改变 current/status。
2. `project_handover_contract_basis`：`id uuid PK`、`basis_snapshot_id FK`、`contract_id FK`、`term_snapshot_id FK`、`readiness_package_id FK`、`preparation_id FK`、`plan_version_id FK`、可选 `contract_amendment_id FK`、`source_payload_hash`、`currency_code`、独立 signed/terms amount（精确 numeric/string 投影）、`is_compatibility_anchor bool`。`UNIQUE(basis_snapshot_id,contract_id)`，每basis一条兼容锚点；所有来源必须属于同contract/project。
3. `project_handover_basis_item`：`id uuid PK`、`basis_snapshot_id FK`、`item_type`（scope/risk/receivable/cost/responsibility/attachment/contract）、`source_type`、真实 `source_id`、可选 source_version/hash、`payload jsonb`、created。受影响项必须引用真实此表，不是随机 UUID。
4. `project_handover_summary_payload`：`summary_snapshot_id PK/FK`、`project_id FK`、`handover_id`（合同summary可空）、`basis_snapshot_id FK`、`contract_summary_snapshot_id`（移交summary必须非空）、`payload jsonb NOT NULL`、`payload_hash`、`source_hash`、`generated_at/by`。只插入，需材料变化即新summary，不覆盖。
5. `project_handover_participant_role`：`id uuid PK`、`handover_id FK`、`confirmation_record_id FK`、`confirmation_participant_id FK`、`participant_user_id FK`、`role_key`、`responsibility_summary NOT NULL`、created。`UNIQUE(handover_id,participant_user_id,role_key)`，role属于冻结职责集合；一个且仅一个execution-owner用户。用户已允许兼任，一人common确认行对应多个职责映射。

现有表的新增列与约束：

- `project_handover` 增加 `producer_version`、`basis_snapshot_id FK`、`version`、`is_current`、`supersedes_id FK`、`execution_owner_user_id FK`、`confirmation_record_id FK`、`finance_confirmation_required`、`prepared_receipt_judgment_mode`、`source_payload_hash`；唯一 `(project_id,version)`、每project一current、确认时间/确认人和status联动 CHECK。历史新增字段保持null/current=false，不伪造回填；producer_version=1的新行必须完整。
- 现有 `effective_handover_baseline_snapshot_id` 保留指向真实term snapshot的FK；整体合同集合由`basis_snapshot_id`表达。首次准备按稳定contract UUID顺序选第一成员为兼容锚点；再基线化时锚点必须是本次amendment.after snapshot，使rebaseline目标、handover旧单值字段及freeze链一致。它仅用于旧单值契约，不能替代集合校验；UI不将其误称“全项目唯一合同基线”。Root须冻结该兼容语义，禁止把aggregate UUID塞进term snapshot FK。
- rebaseline 增加 `basis_before_id / basis_after_id / source_handover_id / replacement_handover_id` FK；保留旧目标snapshot作为本次变更合同的真实条款目标。写侧核验 amendment.after_snapshot_id=请求目标，同一整集合其余合同不被替换。
- receipt freeze 增加 `basis_snapshot_id / version`，CHECK mode及source_type，现有 `uq_prjf_project_current` 保留。若已经有不同当前冻结，除正式受控新移交/更正且无计算/发放依据外拒绝；本片不提供普通模式修改能力。
- amendment 增加 `source_preparation_id / source_review_id / before_snapshot_id / after_snapshot_id / payload_hash / amendment_reason / effective_at/by`；每contract version/current唯一，effective时after必填且与preparation/review同链。
- payload和新当前索引的迁移必须先审计现存多current/缺来源记录；不能回填随机snapshot、假参与人或把旧E2E seed自动认证。遗留不完整行保留可读/blocked，数据修复另列。

DDL 中所有父子归属、term/preparation/plan合同一致性不能只靠单列 FK 假装满足；采用可实现的复合 FK 或同事务锁下校验并给违反测试。具体 SQL、约束名、ORM元数据和生成 schema 由 Root 单点冻结，不允许各线自行迁移。

## 7. 再基线化、版本与历史

现 Node rebaseline 要求 `findLatestConfirmedByProjectId`，却不更新该行的 effective baseline/summary；从正式设计看同时存在“移交前不可操作”和“链被改挂但摘要未换”的错误。新机制以当前未终结承接依据为输入。正式合同变更激活后，旧 draft 的来源不再当前，应显示 source-changed；rebaseline 成功才生成新 draft和摘要，关闭旧确认，参与人针对新材料重新确认。整链切换及旧状态改变必须原子完成。

已 confirmed 的旧 handover 及回款冻结保持历史可回放。若业务需要确认后再移交，必须生成新版本/明确替代并按正式受控规则处理；不能复用“移交前 rebaseline”原地重写完成事实。历史 by-id GET 始终显示当时的合同集合、职责、模式和摘要，而当前项目 GET 显示新链与变更原因。

`processing / pending-effective` 记录真实存在时必须阻断确认。若本片使用同步确认即生效的再基线化，三个阶段可处同一外层事务内部，HTTP 只在所有写入成功后返回 effective；不必为了状态图提交一个不可收口的中间记录。异步审批只有存在真实登记的审批/完成入口才可引入。

## 8. CommonSession、锁与 audit 协议

全部产品 command 接收 Root 借出的 `&mut CommonSession<'_, '_>` 和真实 `Actor`；禁止自行 `Database.with_connection`、重新从pool取连接、独立提交 common service 写入，或在内部错误后继续提交其他必要写入。

外层 adapter 开 BEGIN，构造同一 CommonState/PendingAuthentication，按项目行锁 → 合同UUID稳定顺序 → preparation/readiness/snapshot/plan → handover/current basis/rebaseline/freeze → confirmation/participants 的一致顺序处理。D/F/E 不持有对方公共锁再反向回调；F只读 D 的事实接口，不反锁生命周期历史。

新 typed SQL 写入用 `session.connection`，所有 common summary/confirmation/todo 操作借同一 session。FK需要先落父表时可 `common::flush`，其成功仍不是 commit。任何必需payload、参与人、todo、freeze、impact、audit、认证pending flush失败，错误必须向外传播，adapter ROLLBACK，不能吞错后返回200。事务成功前不得返回已确认结果；commit未知结果不伪称成功。

使用 `contract_support::audit`，target和operationId为真实动作；记录 actor/requestId、project/handover、before/after status及rowVersion、basis和两层summary、rebaseline/confirmation/receiptFreeze、source IDs/hash、参与职责差异和reason。不在日志写凭据或未授权金融原值；失败结果以真实平台错误事件处理，不能保留已回滚的成功业务audit。

同一人重试已确认参与人时，只允许明确的幂等同版本结果或409；不重复增加 confirmedCount。final、rebaseline、prepare并发必须通过项目锁、expectedVersion和unique current确保一赢家；没有expectedVersion也不能越过source hash和状态守卫。

## 9. R2 附件与 F 消费接口

必须用本片真正准备/确认产生的 handover ID 经已有 R2 checklist→refresh→download-package→download 实跑，原对象/文件版本/manifest/security审计均可回溯。仅调用 `handover_facts.find_handover` 得到 id/project 不等于D业务交付。D不能直接调用当前K5 `AttachmentService`，它自己持有 Database 并可能开独立连接/flush；如D最终确认必须纳入附件材料，由同session typed只读查询冻结已存在selection/attachment版本哈希，并在确认锁下重验，避免跨事务写服务。

初次prepare不以R2 selection已持久化为前提，否则“先有handover才可refresh”和“先refresh才可prepare”会循环。D用同session扫描实际project/lead/contract/follow-up附件链接，按R2纯规则冻结实际附件version UUID、内容hash、状态/security及纳入/排除语义。source hash不包含selection ID、selection.rowVersion/updatedAt、自动生成的handover link ID或重复sourceRef；R2 refresh对同一实际材料的元数据补写不使D材料过期。真实文件版本、有效性、安全级别或纳入语义改变才需要新材料与重新确认；reprepare须明确承接先前已纳入的手工材料，不能因新handover ID而丢失。

附件变化需要新移交材料/重新确认；有敏感排除或合规排除时记录真实排除理由，不把所有 excluded 都当缺失；mandatory缺失/stale必须按明确准备规则阻断，不凭页面数量猜。

提供给 F 的候选只读边界 `load_handover_facts_in_session(session, project_id, as_of?)`：返回 `{handoverId, projectId, status, confirmedAt, confirmedBy, contractSummarySnapshotId, handoverSummarySnapshotId, effectiveHandoverBaselineSnapshotId, handoverBasisSnapshotId, handoverRebaselineRecordId, sourcePayloadHash, contractMembers[{contractId, termSnapshotId, readinessId, planVersionId}]}`。读取外层当前连接和不可变历史payload；不通过 project.current_stage 猜历史区间，不生成虚拟阶段起止。签约前成本不要求已有移交。`confirmedAt`只证明移交事实确认时点，缺R5冻结时不证明execution已开始。

## 10. 待执行验证矩阵

所有下列业务结果目前均为 `not-run / G1-design-only`，不会从 Node seed/旧报告借证。

| ID    | 验证场景                                                                                     | 必须证据                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D-V01 | 完整 spec/canonical/current AST 5操作和新增候选路由独立登记、无重复HTTP计数                  | 固定源SHA、生成diff、operationId/method/path/权限/status对齐                                                            |
| D-V02 | 从真实R3/R4ABC生产两份独立金额合同、精确审核、active snapshot、正式plans，再准备移交         | HTTP/DB来源链，禁止种入D draft或confirmed参与人；合同总额无需等于项目报价                                               |
| D-V03 | 任一合同未基线批准、无snapshot、plan不匹配、source hash变化                                  | 项目汇总blocked且定位具体contract，零准备/确认副作用                                                                    |
| D-V04 | 明确执行/销售/商务/售前和条件财务职责；无效用户/缺角色/未授权指派                            | 真实用户/职责映射，明确400/403及零副作用                                                                                |
| D-V05 | 不同真实会话逐一自确认，冒充userId/全名单代确认、非参与人、重复确认                          | 本人变更/本人todo，403/409，counts准确                                                                                  |
| D-V06 | 最后一人已同意但材料版本过期/旧summary/未完成再基线化                                        | 不终结；旧同意不自动继承新材料                                                                                          |
| D-V07 | 最终确认完整链及回款模式freeze；缺模式、未知模式、current freeze冲突                         | 真实confirmed记录/freeze/audit同链；失败整体回滚                                                                        |
| D-V08 | 没有R5角色冻结时移交事实已确认、execution仍blocked                                           | UI/GET明确“待提成角色冻结”；无execution推进/最终closure宣称                                                             |
| D-V09 | 真正合同变更准备/审核/激活→版本化plan→移交前rebaseline→各人重新确认                          | amendment精确before/after、impact真实项、旧链历史保持                                                                   |
| D-V10 | amendment非effective/不当前/不同合同或项目/目标不是该变更snapshot/随机affectedUUID           | 400/404/409，链不切换                                                                                                   |
| D-V11 | prepare/final/self-confirm/rebaseline分别并发和互竞                                          | 一赢家、唯一current、无重复count/freeze/impact；完整原始事务证据                                                        |
| D-V12 | 在summary、payload、participant、todo、freeze、impact、audit、auth flush每个必需写处注入失败 | 原始前后DB对比、全部业务及相关common写回滚、无200                                                                       |
| D-V13 | by-project current与by-id历史；源合同后来变更或新增                                          | 历史payload不漂移，当前source-changed/新版本可解释                                                                      |
| D-V14 | 敏感字段允许/遮罩/拒绝；必要security audit写失败                                             | 无金融原值泄漏，真实actor+同事务audit失败即500                                                                          |
| D-V15 | D真实handover经R2真实文件checklist/refresh/package/download                                  | 字节hash、manifest、版本/security/expiry及错误路径；不只测read adapter                                                  |
| D-V16 | F按confirmedAt读取历史移交facts；签约前成本/无R5冻结                                         | 无假阶段区间、无循环依赖、不把confirmed等同execution                                                                    |
| D-V17 | 浏览器完成准备→各人确认→终结→显示R5pending；stale/denied/失败重试                            | 真实UI网络/结果，按钮按allowedActions和身份，页面不能伪造成功                                                           |
| D-V18 | schema迁移/entity/contract一致；旧不完整seed/行识别                                          | SQL-first、约束/复合归属、既有drift分类，无随机回填                                                                     |
| D-V19 | Active变更待审/拒绝、激活中snapshot/plan/audit故障、新plan公开精确重试                       | 旧Active事实持续有效；失败整链回滚；无重复plan/nodes；真实R2审核绑定                                                    |
| D-V20 | GET选择集与source hash：project:write可选active名字，只读者/缺权限/无效用户                  | 不手输UUID，不扩平台管理权限，无敏感用户字段，prepare可由公开GET完成                                                    |
| D-V21 | 参与人确认前合同/计划/附件真实来源变化，以及已确认者同版本重试但来源已变                     | self-confirm返回409 source_changed；participant/count/todo/audit均不写；安全basis摘要无source payload金融/风险/人工原文 |

实现后的必要检查：Rust fmt/check/clippy/相关有意义测试；API/admin及受影响库lint/build/test（触及UI必须覆盖）；HTTP/DB故障注入和并发；浏览器E2E；完整OpenAPI生成+diff与client检查；migration-check及classification；`git diff --check`、Markdown格式检查。每项明确 ran/pass、ran/fail、not-required 或 blocked。独立G3、固定提交复核和G4只收本片，阶段父保持Open。

## 11. 一致性与候选结论

- 当前 D 5 个 public route 的 method/path/opId/status/permission 已静态核对，未改变。
- Node query 单 project readiness、seed 预制参与人、任意模式字符串、已确认行原地再挂基线、summary metadata无实际payload，均明确留作修正项，不能被“兼容Node”豁免。
- G1为Pending；用户已选方案二、兼任/本人确认、事实/准入分层和真实变更闭环；Root完成正式输入、路由/DTO、schema、共享事务所有权写回与独立评审前，不开始G2。
- 本候选没有产品代码、DDL执行、共享契约/生成物修改、业务实跑结论、合并或部署授权。待Root形成联合G1后，D可按冻结的最小可操作闭环实施并接受独立G3/G4。
- 已执行静态检查：`git diff --check`、`deno task format:md:check` 通过；候选JSON可解析、5既有/7目标、现有D传递36 schema、连同变更/R2依赖的目标71 schema、21待执行场景及71项来源rawsha已生成。产品lint/build/test、HTTP/PG/浏览器与SQL执行均`not-required for this docs-only turn / not-run for G2 acceptance`。
