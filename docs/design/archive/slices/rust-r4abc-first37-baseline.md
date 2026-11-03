# RUST-R4-ABC 首批 37 入口联合实施基线

- Gate Status: **Pending**。本文件是独立 G1 审查候选，不能据此进入 G2。
- 来源：main `1730f304c1cf5600721f80b6c06feec24269d387`；分支 `codex/poms-r4abc-first37`。
- GitHub：总体 [#57](https://github.com/illusion-tech/poms/issues/57) → R4 [#101](https://github.com/illusion-tech/poms/issues/101) → 本批 [#102](https://github.com/illusion-tech/poms/issues/102) → A [#103](https://github.com/illusion-tech/poms/issues/103)、B [#104](https://github.com/illusion-tech/poms/issues/104)、C [#105](https://github.com/illusion-tech/poms/issues/105)。G0 原生关系已实际读回；首次 C 创建 TLS 超时的 partial 原件另存，恢复时先查同名 Issue，未盲目重复创建。
- 类型：`cross-layer-high-risk`，包括 API / command、persistence、必要 Angular 消费修改。
- Owner：Root；A/B/C 三作者独占各自 Rust 领域模块，非作者 reviewer 独立审查 G1、G3、固定提交、集成和 G4。
- 配置：沿用迁移计划 §1.1/1.2，所有子代理显式 `gpt-6.1-sol / max`；Fast 无工具参数，未核实。Root 独占共享代码、正式治理、Git/GitHub和全部真实环境、构建、HTTP/PG/browser、故障与清理。
- 授权：用户“好的，开始吧”授权本批完整 G0–G4；四项后续业务答复直接构成本包输入。仅本批子项可在完成后关闭，**#101 / #57 保持 Open**。

## 1. 范围及正式输入

A 迁移商业放行与签约就绪 9 入口；B 迁移合同、合同业务号 lookup 和条款读取 9 入口；C 迁移回款、应付、付款、发票 19 入口。当前 controller AST → 当前完整 OpenAPI → authoritative canonical inventory 的逐项唯一连接见 `rust-r4abc/inputs/surface37-source01.json`；相对既有 Rust 173 操作的差集必须由该静态抽取证明，不能沿用历史 R0 计数或将 Native-only lookup 当成 Rust 已交付。

直接正式输入为 `contract-finance-design.md`（合同/资金/正式应收计划与差异规则）、`interface-command-design.md`、`interface-openapi-dto-design.md`、`table-structure-freeze-design.md`、`schema-ddl-design.md`、ADR-014/015、`api-route-canonical-inventory.md`、`backend-rust-migration-plan.md`，以及当前四 controller、调用服务、共享契约、完整 OpenAPI/client、92 迁移和已交付 R2/R3 producer 的原字节。作者静态输入分别归入 `rust-r4abc/inputs/authors/`，当前源去重原件由 `source-union01.json` 绑定。历史 Native 观察、纯 case、未来表探针均不是实际 Rust 验收。

本批还交付：真实准备版本、审核精确绑定、有效快照、正式应收计划生产；R2 contract-review 真实消费的必要扩展；真实 R3 成本/竞标/报价承接；最小实际成本映射只读保护；公共原子审计和会话参与。既有四条公共审批 HTTP 只复用，不重复计数。

后续移交、实际成本创建 40 项、经营、验收/完工/归档、提成完整 R4/R5 消费及整个 R4 阶段验收不在本批。C 不生产实际成本，不新造原不存在的 19 项财务 UI，不把合成映射 fixture 当成真实成本 producer。无生产部署、切流或性能认证。

## 2. 用户裁决和类型 SSOT

1. Rust 以业务语义、正确性和合理性为准，不追求 Node 缺陷级一致；不能判断的业务选择交用户。
2. 合同级真实准备 → 审核后原子激活 → Active 合同有效快照下生成正式应收计划。明确 `contractId`，补必要持久化、DTO 与 UI。
3. 合同、普通回款、发票金额是有限十进制正数，最多两位，超过 `numeric(18,2)` 拒绝；负数冲减另走显式未来业务。普通应付/付款基数也沿用当前正数规则；税额可为零。
4. 所选或继承付款合同必须 Active、同项目；应付已绑定合同则只能用该合同，省略/null 继承；未绑定才可选择同项目 Active 合同。保留既有合法项目级无合同付款。
5. 每合同金额、条款和应收节点独立；保留项目报价来源及差异复核，不复制项目总额、不自动分摊、不强制合同合计等于项目报价，不设置隐含硬预算。
6. 必要业务状态、版本、快照、已注册审计和认证会话写同一事务整体提交或回滚。合同编号使用既有 `next_with_connection`，与合同 INSERT 同事务；不得套用 R3 某些独立编号的语义。

ID 一律以 `Uuid` 解析后比较，接受大小写等价表示；存储及响应 canonical 小写。内部 UUID 与业务编号不可混用。坏 UUID 为 400，跨项目或不存在为 404；`expectedVersion` 提供且过时为 409；业务状态违例沿 B/A 400、C 422，未知 SQL 错误为 500。已知业务unique冲突走受控409：invoice_no全局唯一、contract_no、baseline project+code/current、contract readiness/preparation/current/version/exact、snapshot source preparation/active、plan contract+snapshot/current/version、review binding。Root按实际catalog冻结constraint name白名单，23505未知约束仍500不泄SQL；exact初始化在锁内命中原产物优先幂等返回，而不是用409代替幂等。标准错误形状沿 `ApiError::message`；500 沿 `ApiError::internal`。需机器裁决的 409 在同一形状增加 `code` 和 `candidateContractIds`：`contract_selection_required`、`preparation_binding_required`、`source_changed`、`payload_changed`。DTO 语法仍沿既有共享 Zod 错误协议，语义错误不冒充 Zod。

金额 trim 后只接受无符号普通十进制 `[0-9]+(?:\.[0-9]{1,2})?`；允许前导零，按规范化数值校容量，拒绝指数、正负号、分隔符、NaN/Infinity。金额规范输出两位，内部使用 i128 cents，禁止 f64。最大 `9999999999999999.99`。税层在可确定时满足含税=未税+税额；无税率反推或数据库静默舍入。输入 tax/down-payment/retention ratio 为 0..1，最多四位，输出四位；R3 八位源只有可无损规范为四位时可承接，不可表示则解释性阻断。真实日历 `YYYY-MM-DD` 与 RFC3339 时间分开；不得把质保届满日转时区日期。

旧 DTO 中 declared `createdBy/updatedBy` 为兼容可接收但忽略，所有新写实际 actor 必须认证 `session.sub`，不能由 body 冒名。未知字段行为仍由现共享契约统一处理。

## 3. 公开接口与真实来源生产顺序

37 个 method/path/operationId 保持 canonical；动作保留 colon grammar。请求、响应和 query 的required/nullable、读模型、严格操作回执和敏感投影以 `rust-r4abc/dto-freeze01.json` 为字段SSOT。发生以下**明确设计变更**，须先冻结后由 Root 同步 Shared → DTO → OpenAPI → Rust generated → client → UI，不能继续保护旧 585 schema/579 client 为永久不变。

- A01 `CreateCommercialReleaseBaselineRequest` 新增必填 `contractTerms: ContractCommercialTerms[]`，至少一项，contractId 唯一且合同为同项目草稿；项目级金额/税率对应 R3 真实报价源，各合同金额无合计约束。创建 draft baseline，不创建自报 diff 或 effective 资格。旧 `diffLevel/diffItems` 可作为非权威兼容字段，忽略；`quotationReviewId` 若传只认同项目真实 R3 pricing 身份，不凭裸 UUID 捏造未存在的 quotation approval handler。baseline 的 latestDiff 可空，响应正确表达未产生合同 diff。
- `ContractCommercialTerms` 精确字段：`contractId`、`amountTaxInclusive`、`amountTaxExclusive`、`taxRate`、`downPaymentRate`、`retentionRate`、`retentionDueDate: date|null`、`paymentTerms: string(1..1000)`、`receivablePlanSeeds: ReceivablePlanSeed[]`。币种来自目标合同且必须与来源一致。
- `ReceivablePlanSeed`：`nodeKey` trim 1..64、`label` trim 1..128、`plannedAmount` 正 cents、`plannedDate` 真实 date、`isRetentionNode` bool、`sortOrder` 非负 int、`note` 可空 string<=1000。至少一节点，key/order 唯一，合计严格等于**该合同**含税金额；无比例推导或自动尾差。retentionRate>0 时至少一质保节点，届满日非空且质保节点不早于届满日；retentionRate=0 不允许质保节点。**质保节点金额合计必须严格等于 inclusive cents×retention ratio**，乘积必须整除10000，否则拒绝并要求显式可表示条款，不静默取整。
- A05 `CreateContractReadinessPackageRequest` 必填 `projectId/contractId/sourceBaselineId/candidateTerms`；candidateTerms.contractId 必须相同、**amountTaxInclusive 必须等于 Contract.signedAmount**。服务端在同 Project 锁内读 current cost/bid/pricing 与条件项，验证真实来源、同项目、版本、币种和 draft baseline 引用，并冻结源 ID/version/rowVersion/hash；由服务端生成 diff、items、missingCount、guardDecision/packageStatus，自报字段不能授予 ready。来源不足可返回 blocked 包与真实缺项，不能伪造成功资格。
- 生产链：真实 R3 project/cost/bid → **B 创建真实 draft contract(s)** → A01 draft 项目商业来源候选（含这些合同的独立 referenceTerms）→ 已有 R3 pricing released/conditional-release 引用该候选 → A05 服务端检查 readyForContracting 及实际条件、promote baseline effective、产生合同级 diff/package → A04 必要复核 → A08 准备 → B 送审/审核/激活 → A09 正式计划。B 创建只要求真实 project，不要求先完成 pricing；不能照抄作者旧 recipe 把完整 released pricing 放在 B draft 前而造成循环。Root 对 R3 pricing 增最小同连接 baseline 存在/同项目/金额币种校验，回归原状态/来源替代竞态，不新造审批类型。
- A03 diff-history、A07 project-current-readiness 均新增可选 `contractId` query。显式选择按同项目查；省略时零份404、一份兼容返回、多份409 `contract_selection_required` + 该权限范围内 candidateContractIds。不得挑第一份或最新一份。
- A04 reviewDiff body 必填 `contractId/diffResultId`，审核 exact 合同 diff；expectedVersion 对 baseline，实际 diff/package 锁内重核。`reviewedFieldKeys` 必须覆盖全部需复核字段；不信任 body 角色覆盖；保持当前 project:write 权限，不私自新增财务角色。attachmentIds 去重并解析 UUID，要求 Attachment active、存在 active link 指向本project或本contract，且沿现attachments权限边界：project:read，confidential/restricted还需既有四种敏感权限之一；不接受其它项目的附件或未挂载对象。关联真实保存 `commercial_baseline_review_attachment(review_record_id,attachment_id)`，history回attachmentIds，留audit来源，不仅存自由文本。A05 可以先产 review-required 包，A04 成功后同 TX 刷新其 guard/status/version，GET 永不补写。只有pending-review可评审，最终approved/rejected不原地覆写；再次决策需要新的diff/package。
- A08/A09 body 必填 contractId；可兼容 packageId 断言但必须等于 path，不能忽略错误 ID。A08 回真实 preparationId，snapshotId 在实际激活前 null；A09 回真实 planVersionId/newVersionId/initRecordId。相同初始化幂等只返回原产物，不加版本/时间/audit。
- B create status 只允许 omitted/draft，signedAmount 必填正金额；B PATCH 加 optional expectedVersion 且仅 draft 可改核心属性，pending-review/active 不允许普通 PATCH 绕审核。B submitReview 必填 preparationId，回执可增 preparationId，snapshotId 不填准备 ID。B activate 消费 latest approved exact binding，不让 caller 重新指定另一套条款。B detail 增 currentPreparation 和 latestReviewBinding，snapshot summary 增 nullable sourcePreparationId；UI 才能真实选择/显示。
- C 保持19路由和请求领域边界，统一精确金额、真实付款合同归属、actual-cost typed UUID 映射保护、真实累计 settledAmount/allowedActions。Receipt 不新加正式计划门槛。无 idempotency key 的 create 不宣称提交后重试幂等；仅失败回滚后重试验证单一结果，COMMIT响应未知必须读回裁决。

差异只比较**同合同** referenceTerms（A01）与 candidateTerms（A05），与项目总报价无比率比较。沿正式最低线：金额>3%、税率变化、首付跨20%或偏差>5百分点、节点增删重排或日期偏移>10日、质保/范围变化均须新 baseline 重审；普通轻微条件/日期变化需 exact 字段复核；完全相同为 prompt/not-required。金额非零变更的<=3%放行还需可验证同合同毛利审批带未跨；本批没有真实合同成本分摊 producer，**缺该依据时明确 reapproval-required**，不拿项目总成本分摊、不自报毛利。重新建立显式该合同条款 baseline 后再由真实 R3 pricing 授权承接，不能 A04 批准 reapproval-required。

逐字段分级：inclusive/exclusive任何金额变化因上述缺同合同毛利依据均reapproval-required；taxRate任何变化必须重审；downPaymentRate跨0.20或绝对变化>0.05必须重审，否则非零变化review-required；retentionRate/retentionDueDate/isRetentionNode任何变化必须重审；paymentTerms任何文本变化视为条款变化必须重审，不解析自由文本猜“轻微”；节点key增删、sortOrder重排、plannedAmount重分配必须重审，plannedDate偏移>10自然日必须重审，1..10日review-required，label/note变化review-required；完全相同prompt。字段key由服务端生成（如receivablePlanSeeds[nodeKey].plannedDate），以最高级为整体等级。taxMode/taxBearer/scopePromise本批无结构化字段，不能宣称实现其独立判定；paymentTerms变更一律重审覆盖当前可表达的文本条款，未来新增结构化字段必须单独G1。

## 4. 持久化与版本链

精确新增/调整 DDL 为 `rust-r4abc/schema-freeze01.sql`（G1设计输入，G2才编入新migration/entity）。所有新写必要 FK/CHECK/唯一/partial-current 约束与 entity 映射逐项核对。旧行以 nullable 字段兼容，不把旧随机 marker 当合法新产物，也不静默销毁历史。

| 对象                                     | 规则                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| commercial baseline                      | 新 contract_terms jsonb，core不可变；draft/effective/superseded；同project current唯一；引用真实R3来源另由package/source envelope冻结                                                             |
| contract diff/package                    | contract_id 显式归属；current范围 project+contract；新增candidate_terms/source_facts/payload_hash，diff与exactpackage关联；同TX维护版本                                                           |
| contract_term_preparation                | 真prepared版本，prepared/superseded/activated；每contract version唯一/一个current；不可变payload/source/core fingerprint；activated_snapshot_id仅真实B产物                                        |
| contract_review_binding                  | approval_record_id PK，FK contract/preparation；冻结preparation_version/payload_hash；一prep可多次拒后重提，不设prep全局unique                                                                    |
| contract_term_snapshot                   | 保留active/superseded/voided；source_preparation_id历史可空，新B写必填且partial unique；有效version从1独立prep.version；金额/节点只从prepared拷贝                                                 |
| receivable_plan_version/node/init_record | Active合同+有效snapshot真实生成；contract/snapshot/preparation/readiness全FK；每contract版本唯一/一个current；contract+snapshot幂等唯一；节点key/order唯一；init记录真实actor/comment/version身份 |

prepared payload canonical hash：JSON对象键递归字典序，数组保持 sortOrder 后固定次序；UUID小写、金额两位、ratio四位、date原日历、datetime统一UTC RFC3339毫秒。只包含projectId/contractId、合同core fingerprint、terms/seeds、源ID/version/rowVersion和已通过diff身份；不包含 preparedAt/actor、业务 rowVersion、待审/active状态等可变事实。SHA-256 lowercase hex。core fingerprint包含 projectId/customerContractNo/signedAmount/currencyCode/signedAt/retentionDueDate；submit改变状态不导致core hash变化。

baseline freshness精确谓词是is_current、status允许draft→effective承接、不可变项目source hash及该contract referenceTerms hash；**baseline mutable row_version、latest_diff_result_id及其它contract的diff不进入prepared payload或freshness**。baseline rowVersion仅当前命令CAS；A05 promote或A04评审以及另一合同创建包不能凭无关rowVersion变化使已冻结prepared失效。R3 cost/bid/pricing真实ID/version/rowVersion/current/条件和exact合同diff结论仍需在送审/批准/激活时核对；A09不重新要求这些历史源current。批量baseline合同terms保存后不可patch，真正新source用新的baseline身份。

A08 exact重复返回原prepared；新源/条款只有draft且无pending approval时可显式创建version+1并supersede旧prepared。提交检查current准备、源有效、hash/core未变；binding不可原地改。reject可在源过时后退回draft以便修复；同prepared重提须仍current且源/core/hash有效。批准有binding时检查全部真实条件，旧无binding审批不能授予新准备资格：approve409 preparation_binding_required，reject仍可正常退回。approved仍pending-review同值，不制造合同版本更新。

激活检查 latest approved binding exact prep、无pending、源/core/hash仍有效、合同pending-review；同TX INSERT新active snapshot UUID、CAS合同active/currentSnapshotId、prep activated及真实timestamp、package真实snapshot marker、必要audit和session。第一次snapshot version=1。已经active重复activate按非法状态400，版本过时优先409；不得再生成快照。A09读取该active snapshot冻结seed，不再要求项目当下cost/bid/pricing仍current，避免新报价破坏旧有效合同计划。

## 5. 共享执行、锁序、身份与审计协议

Root 新增内部 `contract_support`，精确类型/签名与中途flush次序由 `rust-r4abc/shared-protocol01.md` 冻结，包括Actor.id/request_id/session/request_context、Error、金额/ratio/date/hash、typed contract facts和必要审计helper。session仅内部借给现sensitive projection/attachment权限判断，禁止序列化或Debug输出secret。A/B/C `pub async fn execute(session: &mut CommonSession<'_, '_>, operation_id: &str, id: Option<Uuid>, query: &serde_json::Value, body: &serde_json::Value, actor: &Actor) -> Result<serde_json::Value, Error>` 为领域分派边界；模块分别 `contract_readiness`、`contracts`、`contract_finance`，Root负责HTTP/guard/schema validation/lib/Cargo。模块不得取第二连接或自行commit。DTO schemaName和operationId来自37清单，不手写猜别名。B送审须先在同outerTX common flush实际Approval/Todo，再立即FK的binding INSERT，末尾audit/final flush/outerCOMMIT；auth participant只消费一次。

Root HTTP持有单 outerTX、新CommonState和 `PendingAuthentication::from_resolved`；CommonSession复用同connection/state/participant。成功命令最后common flush并outerCOMMIT；失败整体rollback，丢弃该请求身份图；read和同值PATCH不得flush任何业务/audit，仅原有必要认证参与按统一公共机制处理。R2 nested savepoint release不是outerCOMMIT。只有outerCOMMIT ACK后可发布写收据；未知commit标incomplete并读回，不盲目重试。

统一写锁序：先用无锁读发现project身份，再锁Project，重读且验证归属；再Contract（UUID稳定序）、Payable、目标finance row / readiness / baseline / diff / preparation / binding，最后新snapshot/plan。已有R3writer共用Project行锁。每条命令在锁内检查expectedVersion和资格；付款确认锁payable并重算全部confirmed总额后限制余额，不能只靠状态dirty碰运气。cost映射检查与写持有同项目锁；未来costproducer必须沿同锁序，后续另验真实链。

Contract/Approval/Todo继续走common tracked store，同一请求不创建重复identity；prepared/binding/plan typed SQL借同connection。ContractTerm仍read_only，不全局解除。若typedSQL影响已经tracked的同一ID，Root提供只针对该identity、且无未flush dirty时的exact refresh；禁止全局clear或丢失其它tracked变更。首次激活无旧Active改写需求，不为此重写R2全部表。

所有成功且确有业务写入的A/B/C命令新增同TX mandatory `poms.audit_log`：`event_type=完整operationId`、`target_type=CommercialReleaseBaseline/ContractReadinessPackage/Contract/ContractTermPreparation/ReceivablePlanVersion/Receipt/Payable/Payment/Invoice`、`target_id=真实UUID字符串`、`operator_id=session.sub`、`request_id=现请求correlation或null`、`result=success`、`reason=真实comment/close/void/exception reason或null`、`before_snapshot/after_snapshot=安全业务DTO`、`metadata={schemaVersion:1, projectId, contractId, operationId, sourceIds, payloadHash}`，不含secret/token/credentialHash。公共 `write_audit(&mut PgConnection, AuditWrite)` 不获取连接、不控制事务；必要INSERT失败必须使整个命令回滚。同值PATCH/exact幂等初始化0business audit/0business version；security_event沿现guard机制独立，不混作business audit。

R2真实contract-review approve/reject在同session消费binding并写其必要audit，不能用placeholder callback替代；Root承担原handler最小扩展，B提供 `validate_review_binding` 等同连接校验。无新财务角色/RBAC业务裁决，本批保持现permission；敏感合同字段继续现projection及安全访问留痕，不能因新detail裸露金额。

## 6. 实际验收与关闭条件

作者只交纯case/探针/图，Root独占新namespace `poms-r4abc`，新actors/secrets/PG15数据库与卷；旧private/PG17/失败partialignored均保留。公共dependency/browser cache可只读核pin复用，禁止整份旧private/运行profile/大target拷贝冒充新隔离。端口/真实进程身份/权限/来源manifest在环境计划另冻结，未实际绑定不宣称存在。

必需验证：37入口逐项认证/CSRF/permission/DTO/domain；真实R3→A→B→R2review→active→A09→C，含独立多合同金额/不同snapshot/plan；C无plan也可合法receipt；金额容量/精度/NaN/日期/uppercaseUUID/跨项目；真实累计、controlled CAS/source替代/双confirm/双初始化；逐必要write故障注入的精确命中与前后完整PG rollback，包含audit和session；真实catalog/新migration/entity/DDL/shared一致性；GET及同值PATCH业务no-op；安全projection；可用原合同/工作区UI的真实交互（contract选择、prepared/active/plan区别、送审精确版本）；新真实契约与旧Native差异分别陈述，不要求旧缺陷回归为真。

检查：git diff --check、format:md:check；受影响 API/admin/shared/contracts/client lint；Native及Angular必要build/test；OpenAPI generation、generated client/check、Rust shared check、migration-check并明确drift分类；Rust fmt/clippy/test/build；实际HTTP/PG/UI及fault/race/全自有cohort二次no-op清理。历史ignored单列且不升格。测试失败修复后保留原件与新重试。

G3前必须有统一候选来源、actual原件和非作者独审；固定提交、main集成及G4各有独立结论，不把SourceReady当Pass。G4只关闭103/104/105/102，101/57维持Open，tracker/GH/归档实读回一致。生命周期文件归档到 `docs/design/archive/slices/rust-r4abc/`，保留logical-origin与实际path/hash映射；普通归档/状态写回集中一次，避免为每脚本另造tiny Gate。

## 7. 当前结论和例外

当前仅G0完成、G1候选；作者静态输入和本包不是实际业务验收。Fake marker、client自报ready、direct createActive、无精度金额、非原子激活、错误allowedActions/settled汇总按 `existing-baseline-drift` 识别，在本片以用户裁决修复；契约与新DDL是 `design-change-required` 的显式已授权变更。现无绕过G1/G3的例外。新问题由reviewer明确Block/修订，不回写旧失败。G1 reviewer、时间、source manifest及online freeze回执将在独立审查通过后填入后续冻结记录。
