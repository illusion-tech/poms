# R4H 最终联合 G1 契约提案 01

状态：**FINAL-G1-PROPOSAL-NOT-ADMITTED**。H #112 / 本批 #110；8 既有 HTTP、新增 H 路由 0。三项用户裁决已消费；#115 仅为独立用户创建补缺，不是裁决载体。这里仍是 tools-only 提案，没有产品编码、Git、DB/API 或凭证访问。

审查入口：[完整规则与接线](proposal01.json)、[10 个既有 schema 精确 delta](dto-delta01.json)、[immutable source context JSON Schema](source-context.schema.json)、[当前源观测](observed-inputs01.json)。Root 最终绑定当前 main 的联合来源清单，原 H/g1 证据不覆盖。

## G ↔ H 精确入口与事务顺序

统一签名：

    project_operating_signals::evaluate_with_session(
      session: &mut CommonSession<'_, '_>,
      snapshot_id: Uuid,
      expected_row_version: i32,
      expected_source_hash: &str,
      actor: &Actor,
    ) -> Result<OperatingEvaluationRefs, Error>

纯 helper：

    derive_operating_evaluation(
      context: &OperatingSourceContext,
      review: Option<&VerifiedMaterialityReview>,
    ) -> Result<OperatingEvaluationDraft, Error>

    derive_cost_readiness(
      context: &OperatingSourceContext,
    ) -> Result<CostReadiness, Error>

G collector 预分配 snapshot UUID → H pure derive → G 一次 INSERT 最终事实/动作及 v1 immutable source context → 同一外层事务 H evaluate 按 ID/v1/hash 重载、重算校验 → DMER/OSER/四 binding/source summary → 必需 audit/auth/security flush → 一次 COMMIT。H 不独立 BEGIN/COMMIT、不新借连接、不回写 G factual snapshot，避免版本循环。

Root 独占 common/model/hash/context loader；G 是唯一来源收集 authority，H 是唯一 policy authority。模型/序列化没有第二套业务规则。详细返回 refs 和 Rust 模块归属见 proposal interface/modules。

## 来源包与零/未知

JSON Schema 有 14 个定义，全部字段 required，缺失显式 null。顶层包括：schema/producer/policy/hash、context/project/currency/scope、formalEligibility、snapshot/period/restatement、baseline、contracts、receipts、classified costs、allocations、tax、pending/unclassified、upstream cost constraints、exhaustive scope、labor lineage、派生 metric assertions。

- Amount 独立 knowledge=known/unknown；unknown.value=null 且有原因。known.value 是精确两位字符串；0.00 必须有真实 source-basis、全 known 成员求和或封闭且已分类 source-scope 的零证明。
- “登记集合当前总和为 0”不证明业务成熟；没有真实成本分类范围依据仍 insufficient。全部排除的真实已验证记录可证明纳入合计为零；不能用缺记录、未分类或排除未知硬事实冒充零。
- 收款现金额是 gross；确认时冻结同合同净税依据，gross=net+tax。历史缺 basis 或纳入成本缺分类/来源/阶段/币种/税务/版本，formalEligibility=missing-evidence，正式 G/H 发布失败关闭；人工不能补造这些硬事实。
- sourceHash 的精确字段 whitelist 在 proposal sourceContext。排除 context/snapshot 随机 ID、rowVersion、生成时间、policy、派生 metrics/动作/评价 ID；事实范围不变时不因新生成 ID 改 hash。evaluationHash 再绑定 policyHash、派生结果和已验证 review overlay。
- labor lineage 为 yes/no/unknown；只有完整证明非 labor 才 no，未知按最严格可逆字段组处理。完整内部来源包不进入公开 DTO/client。

## 枚举、规则与四阶段

Root 已采纳：signal/risk 补 normal/unknown；maturity 保留 insufficient/preliminary/mature，未评估使用 evaluationStatus。源位置分别为 shared-contracts.ts 9331–9342、9344–9355，新增 knowledge/status/stage/review 枚举放 9318 附近。evaluationStatus 包含 not-evaluated，不增加 unknown maturity。

毛利=确认回款未税−纳入成本未税，分母确认回款未税。零分母返回无有效比例；未知不填零。回款比例用同冻结币种 gross cash/gross contract 做精确比较；<20% 只观察。毛利率 <-100% 或 >100% 加极端值复核，等于边界不命中该极端规则。

建议冻结：仅 facts known、mature、回款比例 ≥20%、净回款>0 时，负经营毛利可自动判 risk/alert；低/零回款或 immature 的负观察毛利进入 unknown+明确人工 materiality review，独立成本/税务/重述硬约束仍生效。正向不利成本偏差或“过高/过多/跳变”若无正式阈值，必须 materiality-unassessed，不发明百分比。人工只分类已列明且证据完整的定性问题，不能改来源、maturity、已证明风险/阻断或公式边界。

| 原因 | 项目动作 | first | second | final | retention |
| --- | --- | --- | --- | --- | --- |
| H01 硬事实缺口 | review | prompt | block | block | block |
| H02 初步、可识别待收口 | review | prompt | review | review | review |
| H03 低回款比例 | prompt | prompt | prompt | prompt | prompt |
| H04 已确认关注 | review | prompt | review | review | review |
| H05 已确认风险 | block | review | block | block | block |
| H06 重述待确认 | review | review | block | block | block |
| H07 极端值 | review | review | review | block | block |
| H08 定性材料尚未人工判断 | review | review | review | review | review |
| H09 独立权威成本 BLOCK | block | review | block | block | block |
| H10 独立权威成本 REVIEW | review | prompt | review | review | review |
| H11 完备正常 | prompt | prompt | prompt | prompt | prompt |

项目取 costAction 下限与全部项目候选的最高级；阶段分别取候选最高级，H09/H10 明确规定独立成本约束的阶段下限，不能把项目动作照搬四阶段。完整原因全部落表，每个并列最高主因都标识并输出授权 projection，不只留第一条。

## 复核、摘要、敏感字段

两 review 均必需 expectedVersion、expectedSourceHash、expectedEvaluationHash、requestKey。旧成熟度/成本建议/基线/快照字段是严格 source assertions；普通人工只能确认或收紧，不允许无审批例外降级。signal review CAS 递增 OSER 父版本并追加独立复核记录，系统值不改；同事务替换四阶段 effective bindings/source summaries。

gate review 的 bindingAction 断言处理前值；新增 reviewAction=acknowledge/tighten-review/tighten-block。decision=confirmed/review-required/blocked 是服务端转换结果断言。REVIEW 作为经营建议可在人工确认后仍为 REVIEW；confirmed 只代表此版本人工职责满足，不能解释成提成可发。BLOCK/硬缺口/未判断材料不能确认掉。

request.summarySnapshotId 断言当前 producer source summary；review 同事务生成新的 reviewed summary，response 回新 ID。摘要必须精确绑定 project/stage/binding+version/source/evaluation/policy hash、signalReview、gateReview、sourceSummary。生产定义：commission-gate-review / project-operating-commission-gate-v1 / projection=commission-gate-review / export=internal-only。不使用 e2e-v1。

raw 税务/金额/分摊/未映射/复核/建议/阻断/下一步文本旧键保留为**所有调用者 literal null**，原值只在 projection.value；所有理由、证据引用及可逆 aggregate group 同样保护。route finance manage 不替代敏感授权；labor yes/unknown 时同时评估 operating-finance 与 labor-cost-rate，取整组最严格模式。必需 audit/summary/auth flush/security event 任一失败整体回滚；敏感 GET 的事件失败不返回 payload。

未生成评价的 current-project GET 返回 typed409 OperatingEvaluationNotReadyError，evaluationStatus=not-evaluated/missing-evidence，禁止伪造评价 UUID；item ID 不存在仍404。Root 负责该 typed error schema/adapter。正常 success 必须有真实 package。

## 10 个 DTO delta 与 TypeScript 编译边界

dto-delta01.json 逐项列出两 request 与八 response 的目标字段、保护键和源行号。共同新增 evaluationContext/reasonItems/reviewState/metricKnowledge/currentActionLevel；反馈明确输出四 stageBindings，不混用不同快照最严重 binding。

共享只保留一向来源：shared-contracts.ts → createZodDto → OpenAPI → generated client/Rust → admin。Root 不能为了旧 Node return literal 编译而把新字段变 optional 或减弱 raw-null。

建议由 Root 从最终冻结前 H schema 原字节生成独立 rust-r4ghi-native-reference.ts，附 source SHA/extraction manifest；旧 frozen 原件不改。Native service/controller 的旧 H Promise shapes 使用该参考类型，Swagger 仍用当前共享 DTO。四个旧 shape 中的 enum slot 可用 Pick<CurrentSharedShape,key> 生成兼容 alias，以兼容新 normal/unknown union，不能用 any cast。旧 Node 结果仅 Native-reference，不能认证新契约或新规则。

实际 UI 要改 projection helpers、新 normal/unknown label、同源 hash store 校验、未评估/未知/暂不稳定/冲突状态，并补真实 review 表单；客户端不能编辑成熟度或任意 gate 结论。原 H UI 只有读取展示，不以 seeded 页面充当作者链。变更文件与 Native/admin/shared/Rust 所需检查列在 proposal compile。

## 剩余联合冻结点与验收

不再等待已答三项裁决。Root 联合采纳 H09/H10 阶段下限、保守低回款负毛利解释与 materiality-review 语义，并与 G/I/minimalR5 合并确认共享模块、生产摘要及迁移名。H 不依赖 I/R5 尚待用户确认的权重或最终验收细节来定义本规则，也不宣称未来发放 guard 已完成。

验收覆盖：真实上游→G→H→两人工表单→六 GET/原页；100.00−60.00=40.00/40%；零/未知/历史净税补正；11 规则与并列原因及全部边界；每点事务故障；producer/review/source-replace barrier 并发与幂等；敏感四组合/labor三态/admin/JSON+DOM+audit+summary 泄漏；真实阶段链。全部 planned-not-run。

本次仅通过工具产物 JSON/Schema 引用与结构检查；不等于 G1 Pass、产品实现准入或运行验收。

补充精确表达：与 G 已对齐 pure preparation 可 server 预分配 UUID、截止固定而不落业务；未满足阶段条件但已明确排除的真实 registered 成本可用 nullable stageRef/attributedStage、recordStatus 和 stageEvidenceState 表达，保留 pendingFacts 及排除理由。只有 include 必须 confirmed/included+verified 非空阶段依据。排除不能消除真实不确定性、不能绕过 confirmed receipt basis 或 included 硬事实；source-context.schema.json 已用条件约束表达。

成本去重补充：canonicalAccumulationKey 只对当前快照 included 主体经济份额唯一。sourceChainKey 另行禁止 payable 采购承诺主体与对应付款主体同时累计，真实分期付款 paymentId 可以分别纳入。已 exclude 的同链 invoice/tax-support 通过 primaryCostRef 留痕，不算主体重复；共享份额 key 绑定 F source-set hash+project/result，禁止同来源全额与对应份额并计。schema 已增加这些字段和 support 必须 exclude 的条件。

最终 G/H 对齐：准备态无唯一已证币种时 currency=null，正式 eligible 才要求真实唯一三字母币种，不填 CNY/UNKNOWN。allocation-share 的 costRef/recordStatus=null，sourceRef 指真实 F result，allocationSourceMembers 保留其实际成本/来源/阶段/治理/血缘；不新造 ProjectActualCostRecord。included 份额须所有实际成员满足硬条件。建议 Root 仅将 gross_margin_rate 扩为 numeric(38,6)，合同/税率原精度不变；分级使用未舍入有理数，展示精确六位 half-away-from-zero，超存储界明确拒绝，不能截断。

