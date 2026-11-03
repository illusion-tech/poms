# R4E 成本基础 11 操作 G1 候选 01

- Gate Status: `Pending`，静态设计候选，尚未联合冻结、实现或真实验收。
- Child: [#108](https://github.com/illusion-tech/poms/issues/108)；批次父 [#106](https://github.com/illusion-tech/poms/issues/106)。阶段 [#101](https://github.com/illusion-tech/poms/issues/101) 与总体 [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open。
- Base: `565661b9113372de4da6662a4a692fbfd2296dd6`；本批分支 `codex/poms-r4def-next28`。
- Owner: E 成本基础线；联合 G1 / 共享文件 / 路由接线 / 迁移由 Root 统筹。
- 本候选产物类型：`docs-only`；未来实现类型：`cross-layer-high-risk`（API、来源映射、金额、版本链、持久化、审计、并发）。
- 模型登记沿用本次显式指定 `Sol6.1 / max`；`Fast` 未核实，不作已启用声明。
- 完整字段约束、源文件 raw-bytes SHA-256、静态测试清单见 [E-g1-candidate01.json](E-g1-candidate01.json)；精确DDL建议见 [E-schema-candidate01.sql](E-schema-candidate01.sql)，均未执行。

## 1. 本次边界与正式输入

本线只交付下列 11 个既有 HTTP 操作。五种 `costType` 是同一个 POST 的五个真实 union variant，分别冻结业务规则，HTTP 计数仍为 1。用户新增授权后联合批次为 D 移交 7、E 成本基础 11、F 成本治理 12，共30入口；D/F由对应线负责，本线不认领经营17、验收/完工/归档8、完整提成、完整替代/作废传播、生产切流或整个 R4 完成。

正式业务输入为 `phase2-project-actual-cost-records.md`、`phase2-cost-source-to-project-record-mapping.md`、`phase2-actual-cost-accumulation-stage-view.md`，命令/DTO输入为 `interface-command-design.md`、`interface-openapi-dto-design.md`，查询与字段可见性由 `query-view-boundary-design.md`、`phase2-data-permission-and-sensitive-visibility-design.md` 约束。表与 DDL 输入为 `table-structure-freeze-design.md`、`schema-ddl-design.md`；路由以 `api-route-canonical-inventory.md` 为准，union 表达受 `ADR-016` 约束。上述 phase2 文档仍标为 Review；本候选显式列出跨文档差异，不把旧 Node 实现当作业务正确性的最终权威。

当前 Node controller/service/repository、三个 E 主实体、完整 `project-cost.service.spec.ts`、共享 Zod contract、当前 OpenAPI/client、现有迁移，以及 Rust `contract_finance` / `contract_support` / `approval_common` 均作为静态对照。Root 的 `inputs/surface28-source01.json` 已给出当前 AST / OpenAPI / canonical join；本候选从该结果选取 E 的 11 行，并另列 OpenAPI 未表达的运行时规则。没有运行 Node/Rust服务、数据库迁移或端到端验收。

## 2. 公开接口与权限

所有路径均带 `/api` 前缀；入口权限均为 `contract:finance:manage`，继续使用 Root 的 session、账号状态、CSRF 与权限守卫。平台管理员身份本身不能代替业务权限。人员/角色、成本率、费率版本和可反推率的quantity/金额另受现有 `labor-cost-rate` 字段包约束，要求 `labor-cost-rate:sensitive:read`；财务管理权限本身不是敏感权限。

| Handler                            | Method | Path                                            | Success | Request / Response                                        |
| ---------------------------------- | ------ | ----------------------------------------------- | ------- | --------------------------------------------------------- |
| `publishInternalCostRateVersion`   | POST   | `/api/internal-cost-rate-versions`              | 201     | `PublishInternalCostRateVersionRequest` / `CommandResult` |
| `createProjectActualCostRecord`    | POST   | `/api/projects/{projectId}/actual-cost-records` | 201     | 五 variant union / `CommandResult`                        |
| `listProjectActualCostRecords`     | GET    | `/api/projects/{projectId}/actual-cost-records` | 200     | 三个可选查询条件 / `ProjectActualCostRecordListView`      |
| `getProjectActualCostRecordDetail` | GET    | `/api/project-actual-cost-records/{id}`         | 200     | path UUID / `ProjectActualCostRecordDetailView`           |
| `replaceLaborCostRecord`           | POST   | `/api/project-actual-cost-records/{id}:replace` | 201     | `ReplaceLaborCostRecordRequest` / `CommandResult`         |
| `listExpenseRecords`               | GET    | `/api/projects/{projectId}/expense-records`     | 200     | path UUID / `ExpenseRecordList`                           |
| `getExpenseRecordDetail`           | GET    | `/api/expense-records/{id}`                     | 200     | path UUID / `ExpenseRecordDetailView`                     |
| `createExpenseRecord`              | POST   | `/api/projects/{projectId}/expense-records`     | 201     | `CreateExpenseRecordRequest` / `ExpenseRecordSummary`     |
| `updateExpenseRecord`              | PATCH  | `/api/expense-records/{id}`                     | 200     | `UpdateExpenseRecordRequest` / `ExpenseRecordSummary`     |
| `confirmExpenseRecord`             | POST   | `/api/expense-records/{id}:confirm`             | 200     | `ConfirmExpenseRecordRequest` / `ExpenseRecordSummary`    |
| `voidExpenseRecord`                | POST   | `/api/expense-records/{id}:void`                | 200     | `VoidExpenseRecordRequest` / `ExpenseRecordSummary`       |

operationId 均为 `ProjectCostController_` 加表中 handler。canonical 库存对应行：154、167–172、160–161、522–523、542、546–548，状态均为 `aligned`。现有字面 colon action 不改名；`replace` 的旧记录身份只来自 path，禁止 body 另传被替代 ID。

错误边界：格式、UUID、union、金额精度与查询枚举输入错误为 400；未登录为 401；CSRF/权限失败为 403；目标/来源不存在或合同不属于项目为 404；版本、同源重复、费率覆盖、替代分叉冲突为 409；已冻结费用不可改、已映射费用不可作废、税额拆分不一致、阶段真源不足等业务不满足为 422。SQL/审计/快照故障为 500 且整笔回滚。状态码不得靠捕获任意 SQL 错误后伪装成功。

## 3. DTO 字段与序列化 SSOT

以下 `?` 表示可省略，`|null` 表示允许显式 null；不得把省略与 null 混同。UUID 在新写入及内部比较时规范化，业务日期为严格有效 Gregorian `YYYY-MM-DD`，时间点输出 UTC ISO datetime 毫秒，不以 UTC 截断代替业务日期。

### 3.1 费率发布

`PublishInternalCostRateVersionRequest`：必填 `rateScopeType=person|role`、`rateUnit=hour|day`、`rateValue:string`（trim、1–64）、`currency:string`（trim、1–16）、`effectiveFrom:date`；可选 `personId?:UUID|null`、`roleCode?:string|null`、`effectiveTo?:date|null`、`changeReason?:string|null`、`supersedesRateVersionId?:UUID|null`、`expectedVersion?:positive integer`。

业务补充：person scope 只接受 personId，role scope 只接受非空且不超过 64 字符的 roleCode；不能用两种 identity 随意拼键。`rateKey=scope:identity:unit`，不把业务 laborRole 强行等同于 RBAC role。金额率必须正、最多四位且在 `numeric(15,4)` 容量内。首版 version=1；已有链头必须显式 supersede 当前链头，同 key、后继 effectiveFrom 严格晚于前版开始；日期含首尾，不允许相同 scope/unit 生效区间重叠。旧版金额和既有人力记录不回写；必要的区间终止、旧版状态/链头切换、新版和发布审计同事务。

同 rateKey 发布使用稳定的事务级 key 锁，再锁链头；不能只依赖“查不到 current 后插入”。保留 current unique、key/version unique 和区间排斥约束，并把已知业务约束 SQLSTATE 转为 409。`expectedVersion` 保持现有可选传输契约，提供时必须匹配；没有提供也通过锁/条件更新防丢失更新。

### 3.2 实际成本 union

五种 variant 均为 strict object：不允许其他 variant 的字段或用户直写金额、状态、sourceType/sourceId、阶段锁字段。

- `payment-fact`：必填 `costType`、`paymentRecordId:UUID`；`costDescription?:string|null`（trim、1–1000）、`evidenceSummary?:string|null`（trim、1–2000）、`expectedSourceVersion?:positive integer`。
- `invoice`：必填 `costType`、`invoiceRecordId:UUID`；以上三个可选字段，另有 `taxImpactSummary?:string|null`（trim、1–2000）。
- `expense`：必填 `costType`、`expenseRecordId:UUID`；可选字段同 invoice。
- `procurement`：必填 `costType`、`payableRecordId:UUID`；可选字段同 invoice。
- `labor`：必填 `costType`、`rateVersionId:UUID`、`laborPeriodType=week|month`、`laborPeriodStart:date`、`laborPeriodEnd:date`；可选 `laborPersonId?:UUID|null`、`laborRole?:string|null`、`actualHours?:string|null` / `actualPersonDays?:string|null`（各 trim、1–64）、`workSummary?:string|null`（trim、1–1000）、`costDescription?:string|null`、`attachmentIds?:UUID[]`。

LABOR 必须恰有与费率单位对应的正 quantity，不能在一个对象中混用 hours/personDays。person 费率必须匹配人员；role 费率必须匹配角色，有人员成本率覆盖完整期间时不能绕过个人优先规则改用角色费率。整个归集子期间必须落在一个有效费率区间内，跨费率日或跨阶段须拆分。week/month 允许因费率或阶段边界拆成子期间；不能要求所有记录恰好整周/整月而阻断正式拆分规则。

历史费率用于补记：Root已核定 superseded 但在所记期间有效的受控版本可用于显式历史补记/替代，retired拒绝。当前 Node 只允许active的做法会阻断旧期间的合法记录；新旧区间和原计算依据需快照回放，无可回放依据不重算，不能从“当前费率”重算。

### 3.3 人力替代

`ReplaceLaborCostRecordRequest` 必填 `laborPeriodStart`、`laborPeriodEnd`、`rateVersionId`、`replaceReason:string`（trim、1–256）；可选 `actualHours?`、`actualPersonDays?`（可 null、trim、1–64）、`workSummary?`（可 null、trim、1–1000）、`expectedSupersededRecordVersion?:positive integer`。project、人员/角色、periodType 从原记录继承。原记录必须为未 included 的 labor，且处于 registered/confirmed 当前链头；draft/voided/replaced/included 不得作为普通替代起点。已有 successor 或已被 F 快照/分摊锁定时拒绝普通替代，避免稳定下游依据被无痕失效。

成功创建不同 UUID 的 registered 后继，旧记录变 replaced，前后金额/期间/费率不物理覆盖，保存 reason、操作者和时间。`supersedesRecordId` 唯一，旧新行与计算依据、审计同事务。列表保留旧记录，详情可正反向回看。返回 targetId 必须为新 UUID；旧 mock spec 中 create 统一返回 RECORD_ID 的偶然行为不应变成产品契约。正式 DTO 文档提及 replacementRecordId/recalculationCandidateId，但当前 `CommandResult` 没有这两个字段，不能擅增公共输出。

### 3.4 费用事实

Create 必填 `expenseCategory:DictionaryCode`、`expenseDescription`（trim、1–2000）、`expenseDate:date`、`amountIncludingTax:string`（trim、1–64）；可选 `contractId?:UUID|null`、`currency?:string`（trim、1–16，缺省 CNY）、`taxAmount?:string|null`、`amountExcludingTax?:string|null`（trim、1–64）、`sourceType?:manual|reimbursement|import`（缺省 manual）、`evidenceSummary?:string|null`（trim、1–2000）、`attachmentCount?:nonnegative integer`（缺省0）。

Update 包含相同字段，均可省略，另有 `expectedVersion?:positive integer`；至少存在一个可修改字段。contractId/taxAmount/amountExcludingTax/evidenceSummary 可显式置 null；其余字段不能以 null 代替省略。确认只接受 `expectedVersion?`。作废必填 `reason`（trim、1–1000），可选 `comment?:string|null`（trim、1–1000）、`expectedVersion?`。正式 DTO 设计表里 confirm 的 comment/必填 expectedVersion 与当前共享 schema 不同；本候选保留共享 schema，不自行添加 comment 或把版本字段改成必填。

Create 验证项目存在；提供合同则验证同项目，合同绑定有效性与 R4ABC 资金域采用同一规则，不设项目总报价硬预算。expenseCategory 必须是当前 active 费用字典项；更新时重新校验变更类别。创建状态 recorded。仅 draft/recorded 可 PATCH（当前 API只创建 recorded）；recorded 可 confirm，确认 actor/time 均来自 session。voided 为终态；confirmed 不可普通 PATCH；任何当前有效统一成本映射存在时均不可普通 void。作废 reason/comment 形成可回放依据。

费用 gross 必须正；税额和未税金额可未知 null，但已知时必须非负、不得超过 gross；两项均已知时严格 `gross=net+tax`。不把未知税额补成0，也不凭缺省税率反推。现 Node 只在两项均非空时检查等式，且使用浮点误差容忍，应补足单项范围检查。

### 3.5 输出与读视图

`CommandResult` 必含 `targetId:UUID`、`targetType`、`resultStatus`、`businessStatusAfter`、`approvalRecordId:UUID|null`、`confirmationRecordId:UUID|null`、`todoItemIds:UUID[]`；现 E 成功值分别为 `success`、目标对象名、active/registered/confirmed，审批/确认引用 null、todos 空。可选 snapshotId/preparationId 只有真实产生才返回。当前 OpenAPI 的三处 command 201 仅 description、缺 response schema，是已有文档漂移；由 Root 统一决定显式补 `CommandResult`，不能声称当前 schema已完整声明。

`ExpenseRecordSummary` 完整字段：id/projectId/contractId、expenseCategory/expenseDescription/expenseDate/currency、amountIncludingTax/taxAmount/amountExcludingTax、sourceType/status、evidenceSummary/attachmentCount、confirmedAt/confirmedBy、voidedAt/voidReason、rowVersion/createdAt/updatedAt。日期是 date；其余时间点是 datetime；三个金额为 decimal string，后两项 nullable。ExpenseRecordList 为裸数组。详情只增加 allowedActions：recorded 无映射为 update/confirm/void，confirmed 无映射为 void，voided 或有映射为空。动作提示与命令守卫必须一致。

`ProjectActualCostRecordSummary` 完整字段：id/projectId/recordNo/costType/costSubtype、occurredOn/accountingPeriod/registeredAt/confirmedAt/includedAt、executionStageCode/stageDerivedFromType/stageDerivedFromId/stageDerivedAt/stageLockedAt、currency/amountExcludingTax/taxCostAmount/amountIncludingTax、recordStatus/isIncludedInProjectCost/isHighRisk、sourceType/sourceId/sourceRefNo/evidenceSummary/attachmentCount、registeredBy/confirmedBy/includedBy/ownerRole、costDescription/taxImpactSummary/riskNote/supersedesRecordId/voidReason、rowVersion/createdAt/updatedAt。完整 null/required 规则以 JSON 内复制的当前 schema 为准。

实际成本列表为裸数组，过滤 `costType / recordStatus / sourceType`，默认按 occurredOn DESC NULLS FIRST、createdAt DESC，再以 id 稳定打破并列；费用列表 expenseDate DESC、createdAt DESC、id。Node 的查询 interface 未把三过滤条件写入 OpenAPI：Root 应在联合契约中补明同名可选枚举条件，未知值400；不能把字段遗漏误判为不支持过滤。现列表空结果保持 []，不凭空改成404。

当前成本详情增加 sourceStatusSummary/effectivePeriodSummary/measurementBasisSummary/supersedesSummary/allowedActions，以及 laborPersonId/laborRole/laborPeriodType/laborPeriodStart/laborPeriodEnd/actualHours/actualPersonDays/internalCostRate/rateVersionId/laborAmount/workSummary/deliveryStage。金额展示只用锁定的成本/计算快照值；来源当前状态可读实时状态并明确来源缺失，不重新计算历史金额。旧/新费率发布后详情仍能回放当时的人员/角色、quantity、rate、区间、结果与替代原因。

### 3.6 必要的字段级响应变更

新增 `LaborCostSensitiveProjection`，每个字段均复用现有 `SensitiveStringFieldProjection`，字段名为 `laborPersonId, laborRole, actualHours, actualPersonDays, internalCostRate, rateVersionId, laborAmount, amountExcludingTax, taxCostAmount, amountIncludingTax, sourceId, sourceRefNo, sourceStatusSummary, measurementBasisSummary, costDescription, evidenceSummary, workSummary`。该对象的raw值仅作为投影输入，不作为额外原始返回字段。

`ProjectActualCostRecordSummary` 新增必填 `laborSensitiveProjection:LaborCostSensitiveProjection|null`。非labor为null且原字段保持原义；labor行的nullable `amountExcludingTax/taxCostAmount/amountIncludingTax/sourceId/sourceRefNo/costDescription/evidenceSummary` 恒为null（包括拥有敏感权限者），真实值只经投影返回。详情继承该规则；原 `laborPersonId/laborRole/actualHours/actualPersonDays/internalCostRate/rateVersionId/laborAmount/workSummary` 不再作为原值字段输出，统一进入投影对象。`measurementBasisSummary/sourceStatusSummary` 在labor行恒null，其投影填入对象，避免“hours × rate”或rateKey旁路。labor期间、阶段、状态、record ID和替代链ID仍可见；列表不是项目人工成本汇总入口，不能把逐条金额当成可公开项目汇总。

授权者投影为full，缺敏感权限为masked/value=null，原值本来为空则full/value=null/reason=field-package-not-applicable；不把masked改成真实0。使用Rust `auth::projection::plan` 和Shared字段包映射生成同一batch安全事件，再以同 `CommonSession` 连接持久化事件。禁止调用会另取连接的 `project_fields` 包装器；安全审计失败整体报错。Node当前E未投影属于现存缺口，需Root同步共享DTO、OpenAPI、client和最小UI，不扩展读权限。本候选JSON包含现有schema与建议schema分别命名，防止把提案当成现状。

## 4. 五种来源映射与经济事件去重

所有映射先验证目标 project 存在，来源 projectId 严格一致，expectedSourceVersion 提供时匹配；读取正式来源事实并在同一事务锁定后再次验证，不相信 body 金额。实际 `sourceType` 为 `payment-record / invoice-record / expense-record / payable-record / labor`（小写），不使用设计草案里的大写展示枚举写库。

- payment-fact：只接受 confirmed PaymentRecord；currency 与未税/税额/gross 三层逐项继承，未知税额/gross 保持 null；occurredOn 为 paymentDate 按业务时区转换的日期，sourceRefNo 为 PaymentRecord UUID，confirmed actor/time 来自真实支付确认。registered actor/time 与映射操作审计另留，不能把来源确认时间误充本次操作时间。
- invoice：只接受 input+verified、无 open exception；gross=invoiceAmount，未税/税额未知为null，不臆造净额或已抵扣结论；sourceRefNo=invoiceNumber，occurredOn=invoiceDate。当前来源无currency字段，Node固定CNY不可沿用。Root已核定只接受显式来源币种，或由发票明确绑定的contract及不可变币种依据派生并快照；项目有多个合同且未绑定时不得猜。币种未知则422拒绝成本映射；必要时由Root单写invoice DTO/persist补显式currency，E不自行做汇率换算。
- expense：只接受 confirmed ExpenseRecord；三层金额、currency、日期、attachmentCount继承；证据/说明缺省回落来源。void与mapping并发使用同project锁和expense行锁；合法结果只能是先void导致mapping拒绝，或先mapping导致void拒绝。
- procurement：正式上游唯一对象是 PayableRecord；只接受 recorded/partially-paid/paid/closed 等正式承诺态，draft/voided拒绝；occurredOn=expectedPaymentDate，继承三层金额、币种、附件/说明；默认registered且not included，表达采购承诺，不能再建设平行采购承诺对象。
- labor：唯一来源费率版本与不可变计算依据绑定；rateVersionId不是“劳动投入经济事件ID”。不同人员/项目/期间可以引用同费率；不能对labor套 `(sourceType,sourceId)` 全局唯一。在项目+明确人员（请求或person费率唯一身份，否则明确角色汇总）+日期区间上禁止同scope当前记录重叠，防周/月重复归集；更正通过replace，费率/阶段边界拆分子区间不得重叠。person scope和role aggregate scope的成员覆盖不可凭RBAC/创建者推断；此处只保证同显式scope不重叠，不冒充已证明跨scope员工投入无重复。

付款/发票/费用映射在正式业务条件与唯一阶段归属同时成立时可到confirmed；缺来源/阶段确认依据则保持registered并保留待归属缺口，后续由F具证确认并写入/锁定阶段；不存在的来源仍404、来源状态不合法仍409，不能把无效单据登记成有效成本。采购/labor默认registered。本批所有创建记录均 `isIncludedInProjectCost=false`，不自动生成included；confirmed不代表经营已吸收，不能因来源已验票/已付款而提升included。registered没有confirmedAt/By与stageLockedAt，来源原确认actor/time只进入source_basis；成功响应businessStatusAfter必须反映实际状态。

同源幂等语义为“保证只产生一条当前有效映射”，现公共契约不含 idempotency key；重复 POST 返回409，不新建第二条。若首次已commit但响应丢失，客户端可从成本列表/详情回看sourceId；不把重试隐式变成不同的写入。四种单据源的当前集合统一为 registered/confirmed/included，与 Rust `current_mapping` 的保守消费者一致；通过条件唯一索引加锁共同保证，作废/替代历史保留。

经济事件去重与同源唯一是两种约束。本批不先决定PAYMENT_FACT优先等纳入主体；只登记/确认真实成本并锁阶段。PROCUREMENT、PAYMENT_FACT、INVOICE和EXPENSE可以保留各自业务语义并存，但全部not included。未来经营17必须在显式来源链上决定主累计依据与税务影响，并防同一经济事件重复计量；不能因其为并列来源类型就自动相加，也不能让共享来源全额和分摊份额并存。

当前数据库可证明的单据链只有 `PaymentRecord.payableRecordId -> PayableRecord`；InvoiceRecord、ExpenseRecord没有指向付款/采购承诺的事件外键。同项目、同合同、同金额或接近日期均不足以证明同一经济事件。E/F本批不新增included入口，不以缺失链接为理由假装已建立全局事件去重；后续included必须提供显式事件绑定/主累计依据与金额层、税务差额/证据、当前唯一吸收约束。没有可验证链接时阻断自动included，保留未收口缺口；该后续边界不能冒充本批已完成能力。

## 5. 精度、日期与历史兼容建议

| Field                         | Current Node  | G1建议            | Rule                                        |
| ----------------------------- | ------------- | ----------------- | ------------------------------------------- |
| expense三金额                 | numeric(15,4) | numeric(18,2)     | 正gross、非负split、最多2位输入、无隐式舍入 |
| 单据映射三金额                | numeric(15,4) | numeric(18,2)     | 按已交付来源逐项复制、null保留              |
| rateValue/internalCostRate    | numeric(15,4) | 保留numeric(15,4) | 正数、最多4位、不可用money2位解析           |
| actualHours/actualPersonDays  | numeric(10,2) | 保留numeric(10,2) | 正数、最多2位、一个单位                     |
| laborAmount及对应总账金额     | numeric(15,4) | numeric(18,2)     | 精确乘法后显式HALF_UP到2位                  |
| occurredOn/费用/费率/归集期间 | date          | date              | 有效日历、含首尾、禁止datetime替代          |

费率四位和quantity两位是现实体/初始迁移的明确区分，正式劳动设计要求保存基础、单价、结果；用户已在 `user-decisions01.json` 明确裁决最终入账统一2位、人工精确乘算后显式HALF_UP到分、历史超精度不自动改写。不能继续使用JS Number乘法+toFixed(4)，也不能让 PostgreSQL 的类型转换代替业务舍入规则。

令 `r4=rate*10000`、`q2=quantity*100`，用有界整数checked multiplication得到六位原乘积 `p6=r4*q2`，`ledgerCents=(p6+5000)/10000`（非负整数除法，HALF_UP）。例 `0.5000 × 0.01 = 0.005000 -> 0.01`，`0.4999 × 0.01 = 0.004999 -> 0.00`。Root已核定后一类结果422拒绝、整笔不写，提示增加汇总粒度，不落零金额成本。结果必须在18,2容量内；不要因两个输入各自合法就放任结果溢出。

计算依据至少保存 quantity字段/值/单位、rateVersionId/rateKey/人员或角色/采用rate值、采集时费率有效区间、原六位乘积、HALF_UP规则版本、最终两位金额、actor/time。可使用新增不可变 `calculation_basis jsonb` 列；同次源映射保存 `source_basis jsonb`（来源id、rowVersion、状态、三金额、币种、日期、contractId/payableRecordId与阶段真源）。本线不自行修改公共DTO；审计before/after和metadata同事务记录引用/摘要，不能仅保留一条最终总额。

历史迁移必须先preflight全部相关三金额/labor_amount是否为分币整数、范围/正负/税额一致性、来源规范化冲突、替代分叉、费率区间重叠与劳动区间重叠。存在非分币历史金额时禁止直接ALTER numeric(18,2)或UPDATE round；先保存不可变原始值/哈希并走受控修正或明确legacy保留策略。rate/quantity不降精度；已confirmed/included历史不得静默重算。当前没有实库preflight结果，无法宣称该迁移已兼容全部历史数据。

## 6. DDL 候选与并发协议

以下仅为Root统一迁移的设计输入，未执行DDL，也未编辑旧迁移或ORM mapping。

1. 对expense三金额、cost三金额/labor_amount的18,2调整必须位于preflight成功之后；rate_value/internal_cost_rate维持15,4，quantity维持10,2。新增必要的金额正负/三层等式、日期范围、scope identity、sourceType/costType对应、labor必有rate和唯一计量单位检查。
2. 保留并核验费率key/version唯一、链头唯一、旧版FK与区间排斥；建议区间排斥覆盖 active和superseded的已发布有效区间，retired是否仍占据历史区间由联合G1定义。发布旧版截断和新插入顺序不得触发伪冲突；不修改历史已锁定计算依据。
3. 四类单据源采用 `(source_type,source_id)` 条件唯一，当前状态registered/confirmed/included；每行costType与sourceType需正确对应。source_id保留varchar(64)正式类型，只有本批内部来源按UUID解析/规范化；不得把所有legacy字符串直接SQL cast成uuid。preflight发现等价UUID文本重复须显式处理。
4. `UNIQUE(supersedes_record_id) WHERE supersedes_record_id IS NOT NULL` 防劳动替代分叉；自引用FK、旧新同项目和同labor身份、旧状态改变/新插入采用rowVersion条件更新。LABOR区间排斥可用btree_gist对project、人员/角色identity、闭区间排斥；是否采用此强化约束待联合G1确认。
5. `source_basis jsonb` / `calculation_basis jsonb` 只保存业务依据，不保存credential、cookie或任意请求。新记录必有符合类型的依据；旧行迁移标记legacy，不能伪造已存在的原始快照。
6. F定义的成本阶段快照、锁字段及本次业务审计与cost写入同一事务。阶段缺失时不允许confirmed/included落库；可用数据库check保障必要字段齐全，但跨表快照引用真值仍须服务与验收检查。

统一锁顺序建议：项目UUID排序 -> 合同UUID排序 -> Payable -> Payment/Invoice/Expense源行 -> CostRecord UUID排序 -> F分摊/阶段对象。global rate发布走独立rateKey锁；labor登记在项目锁之后锁所需rateKey及费率，global发布不得反向获取项目锁。D/F与C消费/写入使用同协议。E不能独占一套锁而让C的 `current_mapping` 读取检查在另一条连接上脱离事务。

映射来源先发现project，再锁project并重读来源归属，随后按统一顺序锁合同与来源；锁定后重验sourceVersion/status/mapping。这样发票改金额/置异常、费用void、采购改核心边界与E映射竞争时，只能有一方先完成。C允许采购付款进度更新，但不改已映射承诺金额；E不阻断该合法进度动作。

## 7. Root CommonSession / F 输入契约

E导出形态建议与C一致：`execute(&mut CommonSession, operation_id, Option<Uuid>, query, body, &Actor) -> Result<Value, Error>`。Root独占pool连接、外层BEGIN/COMMIT/ROLLBACK、pending authentication参与者和最后flush；E只借用 `session.connection` 与 `session.state`，不创建pool、不提交、不吞错误。Common服务允许的内部savepoint不构成独立业务提交；调用失败必须冒泡到外层整体回滚。

每个写命令的费用/成本/旧新版/业务号/计算依据/来源依据/阶段快照/必要确认和audit必须全部在该外层事务。审计失败、最终common flush失败、commit失败时不得返回201/200并留下部分成功。审计event_type使用准确operationId，actor来自session，requestId作关联，before/after记录旧新业务值，reason与metadata保留来源和精度规则；审计不得把rowVersion同意当作审批结论。

当前 `contract_support::AuditWrite.project_id` 为必填UUID，而费率发布是global命令，没有项目上下文。Root需将元数据project维度显式可空或提供同连接global audit helper；禁止伪造项目UUID。`Error` 的已知唯一约束清单也需Root加入E约束，包含23505与费率排斥23P01对应的可理解409；不对未知约束广泛吞错。

建议E向F提供只读typed来源事实接口 `load_cost_source_facts(session, costRecordIds, lock)`：`costRecordId, rowVersion, projectId, costType, recordStatus, isIncludedInProjectCost, currency, amountExcludingTax?, taxCostAmount?, amountIncludingTax?, sourceType?, sourceId?, sourceRowVersion?, contractId?, payableRecordId?, rateVersionId?, supersedesRecordId?, replacementId?, executionStageCode?, stageLockedAt?, sourceBasis`。所有decimal保持明确层次，禁止COALESCE把invoice gross与payment net混为相同计量层；缺值必须成为业务缺口。

F向E提供 `derive_and_lock_stage(session, costRecord/sourceFacts, actor)` 或等价借用接口。派生顺序为正式阶段/里程碑 -> 来源对应移交/验收等业务上下文 -> 来源日期当时有效的阶段区间；必须唯一，保存真源引用和锁时点。同项目当前阶段、最近一个移交或任意“未分配”标签不是历史真源。签约前真实成本可存在，不能把handover完成设为所有成本硬前提。Root已核定无唯一阶段/确认依据时保留registered，F在具证后执行确认与阶段锁定；若请求本身要求具证确认而证据缺失/歧义则422且不写confirmed。F接口不负责猜测或填造阶段。

F分摊消费来源层和cost状态时仍须验证完整来源集、同币种、当前未被替代/作废、独占/共享模式、来源总额/全部份额守恒。E替代须检查F已锁定引用；F不得从E列表金额推测经济事件已去重。本批没有included命令，因此不把共享成本确认或阶段归属操作暗中升级为最终累计吸收。

## 8. 静态对照结论与待定项

- `existing-baseline-drift`：Node费用和cost使用15,4/Number容忍及toFixed4；正式通用货币18,2与本批资金域18,2不同。费率与quantity的不同精度有明确现实体依据，必须保留。
- `existing-baseline-drift`：Node payment/invoice/expense直接confirmed且stage字段全部null，正式设计要求confirmed前唯一阶段锁定；由E/F同事务补齐，不能当作兼容oracle继续照抄。
- `existing-baseline-drift`：Node替代缺少原终态/successor守卫和分叉DDL，允许already-replaced再替代；普通allowedActions也未充分排除voided。
- `existing-baseline-drift`：费率publish和labor create缺少若干scope/正数/项目/个人率优先/历史版本治理；现spec主要使用repository mocks，不证明真实事务、DDL或并发。
- `existing-baseline-drift`：当前OpenAPI未声明三处CommandResult响应与实际成本query字段；正式DTO设计的confirm comment/expectedVersion、replacement额外结果字段与共享schema不同。本候选没有偷改公共契约。
- `design-change-required`：用户已批准人工结果HALF_UP到2位、费率4位/quantity2位、历史超精度不自动改写；字段级敏感投影、LABOR明确person/role scope区间去重需Root同步DTO/DDL。Root已核定零分币结果422、历史非分币preflight阻断、superseded原区间补记/retired拒绝、无真源保留registered并由F具证确认、发票币种只从显式来源或明确合同不可变依据派生。无真实历史/币种/阶段证据时不冒称问题已经由实现收口。

E推荐联合G1采用：费率4位/quantity2位/最终货币2位HALF_UP，记录完整计算依据；来源链可并存、同源current唯一、全部默认not included；终态不可替代分叉；阶段真源唯一后confirmed并原子锁定。历史非分币金额或无真源记录只标待处理，不静默改写。

## 9. 有意义的验收计划

下列均为待执行方案，机器清单对每项保存 `planned-not-run`。Node完整spec共见JSON静态目录；其现有测试不足以替代真实SQL、HTTP和消费者验证。

1. 真实调用A/B生成并生效合同，再调用C生成/确认付款、验票发票、正式应付；E通过五variant产生真实成本，不靠直接插入合成映射替代producer。费用与labor项目/身份分开覆盖。
2. 五variant分别检验必填、strict跨variant字段、未知costType、path/body身份、来源缺失/跨项目/错误状态/open exception/stale sourceVersion；每个负例核验cost/audit/业务号与状态均无部分写入。
3. 重复与并发映射同一源只成功一次；映射对C修改/异常/close、expense void、采购付款进度并发；核对C `current_mapping` / allowedActions及真实写守卫立即消费E产物。
4. 费用create/update/confirm/void状态矩阵、optional/null、active字典、同项目合同、三层金额精确一致/单项大于gross、税未知、正数边界、18,2上限与超精度拒绝；每合同金额独立，不以项目总报价合计封顶。
5. 费率首版/显式后继/错误scope/unit/同key重叠/相邻日期/并发首发/并发替代/staleVersion；旧劳动记录在新版本后金额、采用率和快照不漂移；历史补记策略按最终G1覆盖。
6. labor小时/人天二选一，4位率、2位quantity、HALF_UP边界、结果溢出/0.00策略，跨费率日/跨阶段拒绝且拆分可成功；同期间周/月重复及不同人员共用角色率分别验证。
7. 替代旧/新UUID不同、旧replaced新registered、supersedes双向详情、第二后继冲突、非labor/included/voided/replaced/stale版本/F锁定引用均拒绝；并发替代只有一条成功。
8. 阶段明确来源、历史日期区间、歧义/缺失保留registered、签约前有效阶段、F具证确认后锁定、阶段重命名后历史不漂移；cost+attribution+audit任一注入故障整笔回滚。
9. F以真实E产物验证同币种、三层计量层、缺值、守恒、独占/共享、替代引用；同采购事件的payment/payable/invoice并存时不能累计三次。未交付included链只能给出明确阻断，不能伪造成功场景。
10. HTTP 401/403/CSRF/权限、DTO请求和实际响应schema、列表过滤/排序/null日期/空数组、详情敏感字段可见性、actor与requestId审计、审计或common最终flush故障、out-of-band SQL唯一与FK约束。

后续实施必需：Rust fmt/clippy/build/test、真实HTTP+PostgreSQL并发与回滚、migration/ORM/DDL对齐、OpenAPI/client差异、原生Node参考仅作可解释对照、独立G3和G4真实上游consumer验收。当前文档候选只要求JSON解析/覆盖计数/source pin自检、`git diff --check`及Markdown格式检查；没有以静态检查替代运行证据。

本轮已执行静态检查：JSON可解析、11个唯一operationId/5个variant/32个当前schema、50个输入rawsha逐一复核；完整现有mock spec静态列出58项，规划真实场景46项。E定向Markdown格式检查通过，`git diff --check`通过；全库Markdown检查曾仅报D作者正在编辑的 `D-g1-candidate01.md` 未格式化，已通知D，不改其独占文件。所有运行、DDL与实库preflight仍为未执行。

## 10. G1 结论

`Pending`。E的11路由/五variant/字段/来源/精确DDL/事务与验证方案已供Root联合审查，用户精度决定与Root技术决定已写入；跨线公共DTO/DDL和非作者审查仍由Root统一冻结。批准人/批准时点均为N/A（尚未冻结），不是例外放行。Root完成联合G1前，本线不进入产品实现；完成本批也不关闭#101/#57。
