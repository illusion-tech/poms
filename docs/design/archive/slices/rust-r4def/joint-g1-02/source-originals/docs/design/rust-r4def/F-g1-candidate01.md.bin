# R4 第二批 F：成本治理 12 入口 G1 候选

- 状态：`G1 Pending / Ready-for-freeze candidate`；用户业务裁决已记录，仍待 Root 联合冻结及非作者复核，不能作为实际验收证明。
- 日期：2026-11-04；基线：`565661b9113372de4da6662a4a692fbfd2296dd6`；工作分支：`codex/poms-r4def-next28`。
- Issue：[F #109](https://github.com/illusion-tech/poms/issues/109)，批次父 [#106](https://github.com/illusion-tech/poms/issues/106)；[#101](https://github.com/illusion-tech/poms/issues/101) / [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open。线上 G0 / 联合 G1 由 Root 统一同步，本文件未修改 GitHub 状态。
- 切片：`cross-layer-high-risk`。本轮仅设计准备；实现、迁移执行、真实验收、独立 G3 / G4 均未发生。
- 分工：用户已同意补齐 2 个 D 入口，当前 D 移交 7、E 成本基础 11、F 成本治理 12，共 30；本文件只负责 F。分配模型目标为 `Sol6.1/max`，运行时身份与 Fast 模式没有独立核实。
- 机器清单：[F-g1-candidate01.json](F-g1-candidate01.json)，含 12 operation 的原始契约投影、传递 schema、来源文件字节数 / SHA-256、设计决策和验收场景。

## 1. 边界与正式输入

本批要交付可用于后续经营计算的真实分摊、阶段归属和税务处理事实，并让六个写入口在业务数据与审计之间保持原子性。F 实际验收必须消费 E 本批真实 `ProjectActualCostRecord`；需要移交依据时消费 D 本批真实移交事实。现有 Node 输出和单元测试用于识别兼容面，业务规则优先服从正式设计及本次联合 G1。[用户裁决](user-decisions01.json)与[联合基线](../rust-r4def-next30-baseline.md)是本轮增量 SSOT。

经营核算 / 风险视图 17 入口和验收 / 完工 / 归档 8 入口仅做依赖说明。本批不实现经营快照、关账、重述、提成 / R5、执行准入、部署或新的财务 UI；不把已有 R2 事实读取适配计作真实 producer。F 不通过直接 SQL 伪造 `INCLUDED`、经营快照、验收记录或已完成移交以完成验收。

| 输入                                                                                          | 冻结用途                                                | 本次采用的章节                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `phase2-project-actual-cost-records.md`                                                       | 成本状态、历史不覆盖、阶段锁定、率版本                  | §7、§8.2、§9                                                     |
| `phase2-cost-source-to-project-record-mapping.md`                                             | 显式三层金额、共享份额、来源链防重复                    | §3.1、§3.6、§7.8、§8、§9                                         |
| `phase2-actual-cost-accumulation-stage-view.md`                                               | 三层累计、已锁定阶段、待归属缺口                        | §5、§7.4、§9、§10                                                |
| `phase2-estimated-to-actual-cost-bridge.md`                                                   | 项目份额、基线 / 快照引用和下游解释                     | §3.4–3.5、§4.4、§9                                               |
| `phase2-project-unified-accounting-view-caliber.md`                                           | 不含税经营口径、可抵扣税不重复计入、历史快照不可改写    | §4.3、§5.4、§8.4、§9                                             |
| `interface-command-design.md` / `interface-openapi-dto-design.md`                             | 六个受控命令、path identity、稳定结果包                 | §4.6 / §5.5A                                                     |
| `api-route-canonical-inventory.md`                                                            | resource-first / colon-action 的 authoritative 行       | `project-cost` 行                                                |
| `table-structure-freeze-design.md` / `schema-ddl-design.md`                                   | 四表命名、唯一当前、外键、替代链                        | 第二批表清单 / §8.8–8.9                                          |
| `query-view-boundary-design.md` / `phase2-data-permission-and-sensitive-visibility-design.md` | 历史 / 当前读侧分离、财务敏感字段和范围权限             | §5.3B / 读侧约束                                                 |
| `project-lifecycle-design.md`                                                                 | 真实生命周期语义及签约前阶段合法性                      | §5–6                                                             |
| Node controller / service / repository / 四表 entity / 完整 service spec                      | 现有路径、DTO、排序和既有行为差异                       | F controller 231–330；service 996–1367；spec 1892–2190 为 F 专段 |
| Rust `contract_support` / `approval_common`                                                   | Root 外层事务、同连接借用、鉴权 coflush、审计和提交回执 | `http.rs`、`mod.rs`、`session.rs`、`service.rs`、`receipt.rs`    |

正式设计文档当前头部多为 `Review`。联合 G1 须明确把采用章节和已接受业务裁决一起冻结，不能仅凭旧文档标题声称本次已经 Pass。来源原字节哈希见 JSON；不把静态扫描视为运行测试。

## 2. 12 个公开入口

所有入口的现有 permission 均为 `contract:finance:manage`；GET 200、POST 201。路径均包含 `/api` 前缀。`opId` 在下表省略共同前缀 `ProjectCostController_`，机器清单保留全名。六个 POST 的现 OpenAPI 成功响应只有描述，没有响应 schema；TypeScript 实际返回 `CommandResult`。这是既有契约缺口，本批应由 Root 显式补齐，不能宣称已对齐。

| Method / path                                                            | opId                                | 请求 DTO                                   | 当前响应 / 读视图                                | identity / 版本锚点                              |
| ------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| `POST /api/shared-cost-allocation-bases`                                 | `confirmSharedCostAllocationBasis`  | `ConfirmSharedCostAllocationBasisRequest`  | `CommandResult`                                  | 新依据资源，无无锚点 `expectedVersion`           |
| `GET /api/shared-cost-allocation-bases/{id}`                             | `getSharedCostAllocationBasis`      | N/A                                        | `SharedCostAllocationBasisSummary`，内嵌全部结果 | basis ID                                         |
| `GET /api/shared-cost-allocation-bases/{id}/results`                     | `listSharedCostAllocationResults`   | N/A                                        | `SharedCostAllocationResultListView`，裸数组     | basis ID                                         |
| `POST /api/shared-cost-allocation-results/{id}:replace`                  | `replaceSharedCostAllocationResult` | `ReplaceSharedCostAllocationResultRequest` | `CommandResult`                                  | 被替代 result ID / result `rowVersion`           |
| `POST /api/project-actual-cost-records/{id}/stage-attributions`          | `confirmCostStageAttribution`       | `ConfirmCostStageAttributionRequest`       | `CommandResult`                                  | cost ID / cost `rowVersion`                      |
| `POST /api/cost-stage-attributions/{id}:reclassify`                      | `reclassifyCostStageAttribution`    | `ReclassifyCostStageAttributionRequest`    | `CommandResult`                                  | 被替代 attribution ID / attribution `rowVersion` |
| `GET /api/project-actual-cost-records/{costRecordId}/stage-attributions` | `listCostStageAttributions`         | N/A                                        | `CostStageAttributionHistoryView`，裸数组        | cost ID                                          |
| `GET /api/cost-stage-attributions/{id}`                                  | `getCostStageAttribution`           | N/A                                        | `CostStageAttributionSnapshotSummary`            | attribution ID                                   |
| `POST /api/projects/{projectId}/accounting-tax-treatments`               | `confirmAccountingTaxTreatment`     | `ConfirmAccountingTaxTreatmentRequest`     | `CommandResult`                                  | 项目 ID + treatment type，新建当前项             |
| `POST /api/accounting-tax-treatments/{id}:replace`                       | `replaceAccountingTaxTreatment`     | `ReplaceAccountingTaxTreatmentRequest`     | `CommandResult`                                  | 被替代 tax ID / tax `rowVersion`                 |
| `GET /api/projects/{projectId}/accounting-tax-treatments`                | `listAccountingTaxTreatments`       | N/A                                        | `AccountingTaxTreatmentListView`，裸数组         | 项目 ID                                          |
| `GET /api/accounting-tax-treatments/{id}`                                | `getAccountingTaxTreatment`         | N/A                                        | `AccountingTaxTreatmentSnapshotSummary`          | tax ID                                           |

全部 canonical command 行已存在且 `aligned`。GET/POST 阶段子集合中的 `{costRecordId}` / `{id}` 只是参数标签差异，匹配时须视为同一路径形态，分别保留既有 operationId。不得新增第二套路由或把 `:replace` 变成 `/replace`。

当前 DTO 的字段、类型、可空与默认值完整存入 JSON。`expectedVersion` 在现 shared contract 是 optional，给值必须严格匹配；候选不擅自把它改成必填。无论是否提交版本，都要在锁内复核状态和当前项，竞争失败返回 409，不能产生两个 successor。

## 3. 业务 SSOT 与本轮裁决

### 3.1 已有正式规则，技术实现可直接据此约束

- 来源事实不是经营成本本身；只有有效统一成本与分摊份额可供后续经营消费。共享来源全额与项目份额不能并计，分摊也不能自动把记录升级为 `INCLUDED`。
- 金额三层分别继承，未知保持 null。E 的 `PAYMENT_FACT` / `PROCUREMENT` 引用 Payment / Payable 显式未税、税、含税；`INVOICE` 当前只有含税 `invoice_amount`，不能伪造未税金额；`EXPENSE` 逐项复制；`LABOR` 未税 = 含税 = 人力金额，税为 0。
- 可证实的链只有 `payment.payable_record_id -> payable`；同一合同不能证明两张发票 / 一笔付款是同一经济事件。禁止用合同 ID 或相近金额猜测去重关系。本批所有成本 / 份额均不自动 included；经济事件身份、正式纳入和跨链防重复由后续经营 17 入口治理，本批不提前固定 payment 优先。F 仅阻止同一源成本被多个当前分摊批次复用，并完整保存已经证实的来源链。
- 一个共享来源同时只能用一套当前依据；精确 source ID 集合哈希不能防止 `[A,B]` 与 `[B,C]` 交叉复用，必须逐项持久化并发占用约束。人力 `sourceId = rateVersionId` 不代表同一经济事实，不能对所有 LABOR 使用 `(sourceType, sourceId)` 全局唯一。
- `CONFIRMED` / `INCLUDED` 成本必须已有唯一阶段并锁定，阶段重命名、计划补填不能搬移历史；来源修正必须新建替代 / 显式重述链。`stageLockedAt` 不得依赖可选 `lockedBySnapshotId` 才写入。
- 可抵扣进项税只解释，不重复进入经营成本；未知税额 / 待确认金额不得自动记为 0，也不得让 `taxPendingFlag=false` 与非零 pending amount 共存。

### 3.2 已明确的账务口径

| ID                   | 本轮采用方案                                                                                                                        | 裁决来源与实现约束                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-B01 金额精度       | 货币结果 / 费用 / 普通成本采用 `numeric(18,2)`；费率保留 4 位、工时 / 人天 2 位；人力精确乘算保留原乘积，再显式 `HALF_UP` 至分      | 用户已接受。旧记录非分币值先报告，不静默迁移；拒绝数据库隐式舍入                                                                                    |
| F-B02 分摊计量与尾差 | 必填 `measurementBasis` 明确金额层；精确权重 + 最大余数至分，余数相同按 project UUID 字节序；同币种，无隐式汇兑                     | 用户已接受精确权重 / 确定性尾差。Root 技术口径：net / tax 齐全时分别分摊、gross=sum；gross-only 只承认 gross，不补造 net / tax。分摊不等于 included |
| F-B03 分摊替代范围   | 必填完整新项目份额集，在同一事务整批替代并守恒；path 仍指向一个旧 result，响应返回新 basis 及完整结果集                             | 用户已接受。不得只改 3000→3500 后挪用其它项目金额；不得静默遗漏 sibling                                                                             |
| F-B04 税务人工判定   | 可结构化来源或财务 manual assessment；manual 必有真实 actor、理由、业务日期、币种与可回放依据；金额只作为税务事实，不自动再计入成本 | Root 技术裁决；不从 `deductibilityStatus` 自行推导调整总额或税法结论                                                                                |
| F-B05 阶段与证据     | 真实日期 / 对象，或具证 manual；confirmed 必锁，无经营 snapshot 也锁；签约前不以已移交为统一前置                                    | Root 技术裁决；无完整历史区间时不发明 execution 期间，D 移交确认不等于 R5 执行准入                                                                  |

技术可自主决定：固定点十进制、溢出检查、排序锁、逐来源占用表、当前项条件唯一、supersedes 一对一、同事务审计、哈希规范、历史不可覆盖与错误码分类。具体字段和 SQL 候选随本文件及 JSON 一起提交 Root 冻结，不再等待重复业务确认。

### 3.3 所需 DTO 改进候选（Root 统一改 shared contract / OpenAPI / client）

保持 12 条 method/path/operationId/permission/status。候选增加结构化依据，字段命名须在联合 G1 定稿；本文件没有修改共享 DTO。

- 分摊 confirm 增加必填 `measurementBasis` 与来源版本数组 `expectedSourceVersions`；份额必填 `allocationWeight`（非负 `numeric(18,6)`，至少一个正值），现 `allocationRatio` 仅为 6 位展示结果，不能拿舍入后的比率反算钱。客户端 `allocatedAmount` 为可选校验值，提交时须与服务端结果逐分一致。
- 分摊 replace 增加必填完整 `projectShareItems` 与 `expectedBasisVersion`，同时锁定并检查全部当前结果；禁止在 body 重复 path superseded ID。内部生成新 basis + 全部新 results，保留旧 basis / result 链及来源冻结内容。
- 阶段请求增加 `attributionEvidence`：`sourceType`、`sourceId?`、`sourceVersion?`、`businessDate`、`reason`。manual 可以没有系统源 ID，但要保存依据文本 / 附件引用与真实责任人。`attributedStage` 是待验证的目标，auto 不信任客户端给的结论。
- 税务请求增加 `currency`、`sourceReferences[]` / manual assessment，以及专门的 `replacementReason`。不再把理由仅藏在 `basisSummary`。来源 ID 必须按来源域区分 UUID / 外部字符串，不统一强转 UUID。
- 写响应使用真实的 `CommandResult` 基础类型，增加各自实际创建 ID、旧新链和稳定输出引用；税务结果直接携带 `taxImpactSummaryProjection` / `taxImpactPendingAmountProjection`。未实现经营基线 / 快照时，引用显式 null / pending reason，不填虚构版本或宣称可直接用于完整经营判断。
- Root 已确认 `contract:finance:manage` 只是入口权限。全部治理 GET 与写响应的金额 / 权重 / 自由说明通过现有 `SensitiveStringFieldProjection` 协议及 `operating-finance` 包（`operating:finance:sensitive:read`）；raw 敏感字段从响应删除，没有原值旁路。结果不附带 labor person / rate 明细。具体字段 remove / add 及 schema 在 JSON 中冻结，由 Root 生成 shared / spec / client delta。

## 4. 四表与 DDL 候选

沿用 `poms.shared_cost_allocation_basis`、`shared_cost_allocation_result`、`cost_stage_attribution_snapshot`、`accounting_tax_treatment_snapshot`，保持既有主键 / 外键 / `row_version` / 责任人 / timestamptz。状态沿用 `pending/active/superseded/voided`，阶段快照使用 `active/superseded/voided`；确认才进入 active。

| 对象              | 现状                                                                                  | 必要候选补点                                                                                                                                      |                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| allocation basis  | active scope 唯一；scope key 为排序去重 UUID 用 `                                     | ` 拼接后 SHA-256，前缀 `cost-scope:`                                                                                                              | 冻结币种、主计量层、三层来源总额、精确权重 / 算法版本 / 来源 payload hash；源集合占用明细不可省 |
| allocation result | active `(basis_id,project_id)` 唯一；`allocated_amount 18,2` / `allocation_ratio 9,6` | `supersedes_id` 自引用 FK + successor 唯一，金额非负、比率 0..1、保存精确权重和尾差；整批替代操作 ID                                              |                                                                                                 |
| stage snapshot    | active cost 唯一，cost FK；`locked_by_snapshot_id` 仅裸 UUID                          | 新增真实依据 / 业务日期 / 哈希快照，supersedes FK + 唯一；不可把任意 UUID 当有效锁。成本 confirmed / included 的阶段非空与锁非空由 E/F 同事务约束 |                                                                                                 |
| tax snapshot      | active `(project_id,tax_treatment_type)` 唯一；金额 `18,2`                            | 来源 / manual assessment / 币种 / 前后影响快照、替代理由，supersedes FK + 唯一，pending 金额 / flag 一致性检查                                    |                                                                                                 |
| 分摊来源快照明细  | 当前缺失                                                                              | `(basis_id,cost_record_id)` 主键、cost / basis FK、来源版本与冻结金额；逐源当前占用唯一以阻止交叉集合复用。保留旧明细，仅切换当前占用             |                                                                                                 |
| 治理证据快照      | 当前缺失                                                                              | versioned JSONB 或独立规范表保存来源、日期、actor、payload hash；不能只把 hash 写进 audit 而丢掉原始冻结内容                                      |                                                                                                 |

JSON 与 [F-schema-candidate01.sql](F-schema-candidate01.sql) 提供 SQL 候选及约束职责。它不是已执行的迁移；Root 必须按最终 DTO / 物理表命名生成正式 migration，确认 live schema 和历史数据后再执行。跨行守恒不能写成普通 CHECK：采用锁定的 basis + 完整结果集，并以 deferred constraint trigger 或等价统一写入口守卫校验；必须在真实并发场景证明无旁路。

`lockedBySnapshotId` 不能默认为已存在的经营快照。若客户端提供，必须读取并验证类型、项目、状态、引用范围、真实冻结时点与当前 cost；不存在 404、错项目 / 错范围 422、冻结结果不得原地修改。经营 17 入口未交付时，不为测试新建伪快照。已有冻结历史若受到重分类 / 分摊 / 税务替代影响，保留原冻结 payload，并形成待重述依赖；重述机制未交付前不得声称旧期间已完成重算。

## 5. E → F → 未来经营输入契约

E 的内部候选 `load_cost_source_facts_in_session` 必须借用同一个 `CommonSession`，返回并按需锁定：cost ID / rowVersion / project / currency / costType / status / included flag / sourceType / sourceId / sourceRowVersion / contractId / payableRecordId? / 三层 nullable Decimal / occurredOn / labor period / rateVersionId? / supersedes / replacement。日期为业务 `date`，责任和提交时间为 UTC instant；不得将 `sourceId varchar(64)` 无差别当内部 UUID。

F 的内部候选 `derive_and_lock_stage_in_session(session, costFacts, evidence, actor)` 返回：stage code、依据类型 / ID / 版本、businessDate、锁定时点、attribution ID 和冻结依据 hash。E 在拟直接创建 confirmed cost 时必须同事务调用；找不到唯一依据则阻断该确认，不产生 confirmed + null stage。registered cost 可保持待归属，并显式进入缺口状态；新增公开“确认成本”入口不属于本批默许范围。

D 提供的候选只读事实为 `load_handover_facts_in_session(session, projectId, asOf?)`：handover ID、status、confirmedAt / By、contractSummarySnapshotId、handoverSummarySnapshotId、effectiveHandoverBaselineSnapshotId、handoverRebaselineRecordId、sourcePayloadHash 和合同快照成员。它不提供虚拟阶段区间，也不代表 R5 角色冻结或 execution 已准入。F 不把 D 的当前状态逆推到历史日期。

F 向未来经营提供不可变的治理引用：source version / amounts / currency / basis and result versions / stage attribution version / tax treatment version / supersedes links / allocationStabilitySummary / pending reasons。经营层未来只能在已纳入口径、同币种、去重后的真实成本上构建 `includedCostTotal`；同时消费税务摘要、待确认金额、基线 / 快照版本及成熟度。F 本批不创建虚构 `mature`、`PROMPT` 或经营版本来填字段，也不把分摊结果直接相加当完整经营结果。

## 6. Root 事务、审计与并发协议

1. Root HTTP adapter 完成 session / CSRF / route permission、UUID 与结构校验后开启唯一外层事务，构造 request-local `CommonState` 与 `PendingAuthentication`，借出 `CommonSession::borrow_with_participant`。
2. F 的 execute / service / repository 只使用 `session.connection`；不得新取 pool connection，不拥有 BEGIN / COMMIT，不吞掉错误继续返回成功，不清空共享 identity map。
3. 多项目共享写先按 UUID 顺序锁全部受影响 project；再锁 basis / source / current results 或 cost / attribution / tax 当前项，锁后重读 `rowVersion`、源状态、归属和金额。E/F/Root 共用同一锁顺序，不能一处先 cost 一处先 project。
4. 业务新行、旧项 `superseded`、cost 阶段锁字段、依据快照、必要确认记录 / summary、审计日志均在同一事务。使用 `contract_support::audit`，metadata 保留 operationId、actor / requestId、全部受影响项目、来源快照 hash、算法版本、理由与前后 ID；不得写 session 凭证。
5. 若确需 common confirmation / summary，调用已存在的 `*_with_session`，同参与者共同 flush；没有正式参与人设计时不伪造确认人和 approvalRecord。写入追踪的 `inserted` 只标记待提交，不能当数据库提交证据。
6. 成功 flush 后仅 Root 提交；提交成功后才发布 committed receipt。audit 插入失败、auth coflush 失败、源状态竞争、约束冲突及外层 commit 失败都不可留下可见半链。未知 commit 结果只报未知 / 失败，不声称已回滚或已验收成功。
7. GET 不修改 source / stage / 治理事实；按既有投影协议产生的 security event 也必须加入同一外层事务，不以独立连接写入。多项目 basis 必须逐项目判断范围与敏感权限；不能返回原始 source payload，不能用局部可见份额冒充整批总额。列表保留完整历史并以明确 status 区分当前项。现 Node 排序为 result status ASC / createdAt ASC，stage handledAt DESC / createdAt DESC，tax confirmedAt DESC / createdAt DESC；候选加 ID 作同时间稳定 tie-break，不能只筛 active 隐藏历史。

建议 HTTP 分类：结构 / 精度错误 400，登录失败 401，CSRF / permission 403，真实资源不存在 404，状态 / stale version / 当前项竞争 409，业务归属 / 不守恒 / 跨币种 / 证据不足 422。唯一约束名称必须加入受控业务冲突映射；未知数据库异常仍为 500。

## 7. 既有 drift 与实际验收要求

| Drift                                                                                               | 当前证据                                                                       | 本批处理                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `existing-baseline-drift`：分摊缺少源状态 / 币种 / 总额核对、交叉集合约束与冻结来源明细             | Node service 996–1068；spec 1892–1999 仅 mock 存在源 ID 和单个 30% 份额        | 使用 E 真源与 source snapshot；整批守恒 / 竞争测试                   |
| `existing-baseline-drift`：单项替代任改金额                                                         | Node service 1089–1133；spec 接受 3000→3500                                    | 按 F-B03 审批后的整批语义实现；禁止无规则改动别项目                  |
| `existing-baseline-drift`：阶段是客户端自由文本，锁只在提供 snapshot ID 时落地                      | Node service 1135–1234；spec 不断言 stageLockedAt                              | 真源派生 / 具证 manual；confirmed 一律锁定，旧链不可变               |
| `existing-baseline-drift`：税务只有文本依据，替代无单独理由，POST response 无 schema / 税务稳定字段 | shared contract 9049–9101；controller 六个 POST；service 1254–1349             | Root 冻结并生成明确 contract delta；无来源 / manual 责任拒绝         |
| `design-change-required`：精度和 payload 扩展                                                       | 实际成本 15,4，对比 F 18,2；现 DTO 没有金额层 / 精确权重 / structured evidence | 按已接受 F-B01–F-B05 统一冻结字段 / migration / projection 后进入 G2 |

必须实际执行的验收场景列在 JSON，各项初始状态均 `not-run`。最低场景包括：12 路由 + 六种读视图；401 / 403 / CSRF；两项目真实成本分摊；重复 / 缺失 / 非 confirmed 源；源状态 / rowVersion 竞争；来源集合交叉；同链承诺 + 付款防双算；未知税额 / 无未税字段拒绝混层；跨币种；0 / 容量边界 / 非法精度；三项目 0.01 分配、并列余数、权重置换稳定；完整替代链和 sibling 失败整体回滚；来源被 E 替代后旧快照仍可回放；签约前与 D 真实移交日期；跨阶段 labor period 拆分或拒绝；错项目 / 虚假 snapshot；stage reclassify 保存旧链；税务 deductible / non-deductible / pending / manual 的来源可回放；audit 故障和 auth coflush 故障后业务与链均无残留；并发同目标只有一个成功。

G3 还须独立核对正式设计 → DTO / OpenAPI / client → migration / schema → Rust guard / 写链 → 真 DB / HTTP 证据。完整 Node spec 已作为静态来源读取和索引，F 专段有 8 个测试，不能替代新的真实验收。G4 仅在实现与实际证据满足后处理 #109 / #106 的实际边界，#101 / #57 不随本批关闭。

## 8. 本轮校验与 G1 结论

- 本轮可做的校验：候选 JSON 可解析、F operation 数量为 12、POST/GET 各 6、method/path/opId/权限/status 与 Root 原始表及 full spec 对应、source 原字节 hash 复核、候选 Markdown formatter、`git diff --check`。
- 本轮不要求执行：产品 build / lint / API / DB 测试、migration 执行、client generate；本轮没有产品改动，不能报告这些检查通过。
- 例外：无已批准例外。正式 G1 reviewer / approvedAt 待 Root 联合冻结；不得把已接受业务口径直接当作 G1 Pass 或产品验收。
- 当前结论：F 的 12 入口边界、既有差异、候选内部接口及真实验收要求已形成；F-B01–F-B05 已有用户或 Root 裁决，最终 G1 取决于 Root 统一 DTO / 物理 schema / 权限投影冻结与非作者复核。
