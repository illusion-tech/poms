# G 线联合 G1 输入审计候选

状态：**G1 Pending，仅供 Root 独立复核，未准入产品编码**。G #111 / 本批 #110 / 联合验收 #114 / 用户裁决 #115。模型期望 `gpt-6.1-sol`、`max`；实际模型/effort 工具证明不可用，Fast 未核实。

Root 提供基线：`codex/poms-r4ghi-next25` / `aaa4b16ac66092f0cb1dc6646a02cf14e80823ee`，Rust 正式 240，R4 67/92，剩余 25。本代理没有运行 Git；字节级来源另见 `sources01.json`。只写本目录；未启 DB/API、未改产品/共享资源、未读取凭证。

## 九个既有入口

全部 `ProjectCostController_` operationId，权限均 `contract:finance:manage`，会话 `pomsSession`，POST 应有 CSRF。canonical 文件 `docs/design/api-route-canonical-inventory.md` 的路由不含全局 `/api` 前缀；当前均 `aligned`。

| operationId 后缀 | 方法与实际路径 | canonical 行 | 输入 DTO / 实际输出 | 持久化 |
| --- | --- | --- | --- | --- |
| activateOperatingBaselinePackage | POST /api/operating-baseline-packages | 162 | ActivateOperatingBaselinePackageRequestDto / CommandResult，201 | supersede 旧 operating_baseline_package；插入新包及 change_package_baseline |
| getCurrentOperatingBaselinePackage | GET /api/projects/{projectId}/operating-baseline-package | 163 | projectId / OperatingBaselinePackageSummary，200 | 当前 is_current 包 |
| createProjectOperatingSnapshot | POST /api/project-operating-snapshots | 164 | CreateProjectOperatingSnapshotRequestDto / CommandResult，201 | project_operating_snapshot |
| getProjectOperatingSnapshot | GET /api/project-operating-snapshots/{id} | 550 | id / ProjectOperatingSnapshotSummary，200 | 固定历史快照 |
| createPeriodClosingSnapshot | POST /api/period-closing-snapshots | 165 | CreatePeriodClosingSnapshotRequestDto / CommandResult，201 | period_closing_snapshot |
| getPeriodClosingSnapshot | GET /api/period-closing-snapshots/{id} | 533 | id / PeriodClosingSnapshotSummary，200 | 固定期末快照 |
| createOperatingRestatement | POST /api/operating-restatements | 166 | CreateOperatingRestatementRequestDto / CommandResult，201 | 旧项目快照 superseded、新 restated 快照、operating_restatement_record |
| listOperatingRestatements | GET /api/projects/{projectId}/operating-restatements | 556 | projectId / OperatingRestatementListView 数组，200 | handled_at DESC、created_at DESC；Rust 应补 id 稳定排序 |
| getOperatingRestatement | GET /api/operating-restatements/{id} | 532 | id / OperatingRestatementSummary，200 | 固定重述记录 |

完整当前请求/返回 schema、全部递归 `$ref` 和安全声明见 `contract01.json`；完整共享 TS、DTO、OpenAPI、客户端的 SHA256 见 `sources01.json`。四个 POST 在当前 OpenAPI 的 201 只有 description，真实返回 CommandResult 未登记响应 schema，需要 Root 修正生成链。金额和原因等敏感字段现有 G DTO 仍为原值，不能直接沿用至 Rust。

## 已证实的阻断与正确机制

1. **毛利公式已由 Root 裁决按正式设计修正。** `project-cost.service.ts:2369/2378` 用合同总额；正式 `phase2-project-unified-accounting-view-caliber.md:191-209` 是已确认回款未税减 included 成本未税，分母也是回款未税。示例合同 200000、确认回款未税 80000、成本未税 120000，正确毛利 `-40000.00`、率 `-0.500000`；回款为零时率为 null。Node spec 的正毛利断言属于既有 drift，不是验收真值。
2. **金额来源不能由客户端提交。** Node 四写入口直接收基线/变更金额、合同/回款/成本、税务摘要、动作等级和基线版本；重述自由覆写并跳过再基线引用/日期范围校验。Rust 应只接受真实来源 ID、版本、选择和理由，服务器从固定 producer 派生；可选“请求金额仅作严格相等断言”也必须由 Root 明确冻结，不能继续当金额来源。
3. **确认回款未税依据缺失，#115 待答。** `receipt_record` 只有 `receipt_amount`、日期和状态；C confirm 只是状态 CAS，没有快照、净税和币种冻结。不能把现金金额直接叫未税收入，也不能用当前税率倒推旧回款。
4. **included 成本没有真实 producer，#115 待答。** E 生成 registered，F 阶段确认止于 confirmed，静态搜索未找到 included/flag=true 的业务写链。`phase2-cost-source-to-project-record-mapping.md:412-471` 明确按来源链选择主累计节点：默认付款事实，发票补税务，采购补承诺；不能将三节点求和。
5. **项目估算只能采用一次。** R3 technical-cost 是项目级估算，R4 readiness 的 `sourceFacts.cost` 固定包 ID/版本；多合同共享同一个项目包不能每合同加一遍。原始包须冻结；移交前再基线化沿真实 before/after handover basis；执行后正式变更按批准成本版本差额，不能使用合同签约金额差额代替成本。不同合同绑定相互冲突的项目包需要正式选择依据，不取第一行。
6. **历史与并发证据不完备。** Node 基线旧包 nativeUpdate 仅按 ID，无版本谓词；期末先查再独立 save；重述先并行读再 flush，不能证明同期间根。保留既有唯一索引，还需 Rust 明确锁、CAS、同项目/期间 lineage、不可变来源成员和证据。
7. **未知金额、敏感字段不能伪装。** invoice/source 成本缺净额时不可 gross-as-net 或 COALESCE 0。原始财务字段及包含金额/薪酬的摘要/理由需 `operating:finance:sensitive:read` 投影；含 labor 或可推回 labor 的群组还要求 `labor-cost-rate:sensitive:read`，使用现有 F 的可逆群组交集规则。

## receipt basis 最小提案（Root 独占迁移/DTO/C producer）

建议独立 `receipt_accounting_basis`（表名待冻结）：`receipt_id` PK/FK、同项目/合同复合身份、确认后 receipt row_version、`term_snapshot_id/version`、currency、gross/net/tax `numeric(18,2)`、tax_rate 四位、policy/producer version、source_payload/hash、captured_at/by。

入口沿既有 `createReceiptRecord` 声明真实现金到账额；`confirmReceiptRecord` 在同 outerTX 中锁项目→合同→回款，验证实际已激活且批准的同合同 snapshot，冻结 basis 并 CAS 确认。税率来自该 `contract_term_snapshot.tax_rate`；币种来源当前审计模型是 `contract.currency_code` 及合同准备/移交成员冻结，不是 term snapshot 独立币种列。Root 还需确认激活后合同币种不可变性或将币种加入被哈希的快照依据。

若用户确认到账额含税，精确计算：`net_cents = HALF_UP(gross_cents * 10000 / (10000 + rate_scaled4))`，`tax_cents = gross_cents - net_cents`。不能分别舍入净税导致不守恒。推荐按每笔回款冻结，税率/币种/原始快照永不被后续合同变更重解释。

仍待明确：确认时生效条款或到账日适用条款（尤其跨合同变更）；旧已确认回款的显式依据补正入口。历史没有依据保持 `legacy-unverified`，不自动猜测、不补随机 basis、不把金额记零。

## 成本显式纳入候选（#115 待答）

纳入条件：真实 E captured source_basis 与当前来源语义可核实；confirmed 且未被替代/作废；F v1 active stage attribution 固定真实业务日期；来源链主累计角色明确；净金额已知；币种同核算上下文；税务调整不与主体成本/已计税额重叠；共享事实只消费 F 已算出的项目份额。

建议保持九条路由，在快照/期末创建请求增加显式 `inclusionDecisions`：真实类型/ID/expectedVersion、纳入或排除及理由。服务器证明资格并计算，成本 CAS、成员清单、快照、H producer、业务审计、必要安全事件和 auth 同 outerTX。若业务要求独立于生成快照纳入，应由 Root 先登记独立 canonical 命令并修改入口计数，本代理不自加第十条。

自动方案只能是在被冻结的、可证明无歧义来源链政策下自动提名候选；“所有 confirmed 自动 included”违背正式设计。发票当前没有 payable/payment link，不能按同项目/相近日期/相同金额猜链。必要关系应由真实来源命令/显式判断生成并保留证据。共享源被某个项目消费份额时，不应把整个源成本标成 included 从而错误阻断其余份额；采用 result 级 membership，并对已消费整批替代要求显式重述/差额链。

## 经营来源、事务与跨线冻结候选

合同：有效合同集合的确切 term snapshot/preparation/review binding；资金：真实确认回款和上述 basis；成本：实际 E source_facts + F stage/evidence；分摊：F basis/result/source snapshot、所选金额层优先 v2；税务：真实 F treatment/evidence 的 pending、抵扣和非重复调整；基线：正式采用的项目技术成本版本、移交再基线链、执行期批准变更。

写路径统一 `CommonSession` + `Actor`，不得新开 pool/事务或 HTTP 调同机服务。按全部受影响项目 UUID 升序加锁，再按同领域既有合同/来源/成本/治理/快照顺序锁定并复核；新读到额外项目则重新确定完整集合，不能临时逆序补锁。所有状态切换显式 `WHERE row_version=expected AND status/current=...` 检查一行；新增唯一约束映射须由 Root 在共享错误注册中维护。任何持久化、H producer、audit、安全事件或 auth coflush 失败整体回滚。只在外层 commit 成功后返回成功。

G/H 已形成接口候选：

```text
evaluate(session, snapshotId, expectedRowVersion, expectedSourceHash, actor)
  -> EvaluationRefs
```

G 写入不可变来源包后，H 同连接重载验证，生产 DMER→OSER→first/second/final/retention 绑定。G collector 拥有唯一 L2 来源稳定事实；H 提供版本化纯函数规则，具体共享模块由 Root 冻结，避免双生产权。包必须包括实际合同/receipt/cost/allocation/tax 成员、版本、hash、金额层 unknown、pending/unmapped/归属/税务/分摊/重述缺口、baseline/period/restatement refs 和传递性 `containsLabor`。页面和后续 I/R5 只消费相同 snapshot/sourceHash。

H 提出的无任意数值阈值规则仍为候选：矛盾 provenance/币种拒事务；合法缺关键事实/金额层 unknown → insufficient+review；有待闭合缺口 → preliminary+review；必要事实全完备且缺口闭合 → mature+prompt；权威 cost block 不降级。关键零值与未知必须区分。最小 R5 与执行阶段 producer 仍按 #115 待答，不模拟状态/冻结。

## Root 需冻结的结构/契约/UI 变化

- SQL-first receipt basis；baseline provenance（原始成本版本、移交/执行变更链、currency/hash）；snapshot evidence/member records；period 到同项目 ProjectOperatingSnapshot 的稳定配对；scoped successor/period root；inclusion decision/membership。旧行保留 uncertified。
- 原始 period 快照不可改写；restatement 保持同一 period/window，明确 terminal snapshot、来源变更、reason 和 supersedes，不随当前基线重算历史。确认 `YYYY-MM`/ISO week、业务时区（既有成本代码用 Hong Kong）、business cutoff 与 knowledge capturedAt 两种时间；历史来源证据不足时不认证。
- 请求移除权威金额/结论，只留来源引用/选择/版本/理由；四 POST 明确 CommandResult；读取改敏感群组投影，真实 unknown 可空并有认证状态；Root 统一更新共享 TS/DTO/spec/client/adapter，G 不直接编辑共享面。
- 现有 operating overview 只有查询和跳转，本批没有九入口的真实作者 UI。需要现有经营工作区增加基线建立、成本纳入/排除、生成当前快照、期末冻结、历史/重述可操作表单及 source/version 解释；不让用户手输核算总额。权限/忙碌/冲突/未知/未认证/空态均需可见。

## 必须真实验收的矩阵

故障：对每个 G 新写点、included CAS、H 的 DMER/OSER/四 stage binding、业务 audit、敏感安全事件和 auth flush 分别注入失败，核对全部表无部分提交；未知 commit 与回滚失败单独标注，不称成功。

并发：首包双激活、同版本替代、同期间双冻结、同源重述双提交、跨项目/跨期间目标、快照并行回款确认/成本替代/stage重分/税务替代/分摊整批替代/移交再基线化；共享 A/B 份额同时纳入与替代保持守恒，不死锁、不重复计量。并发撤销权限时财务写与必需证据回滚。

业务：真实多合同；毛利 receipts 公式与零分母；大额末分精度；HALF_UP 边界；费率四位/工时两位不重新定价；来源链付款/采购/发票只量一次；未知税层不补零；F selected layer/residual policy 原样消费；可抵扣税不重复入成本；旧期间原始结果不变，真实补录通过新重述链；同项目估算跨合同不倍增。

UI：用真实上游生产流程创建基线→明确纳入/排除→快照→期末冻结→补录→重述；所有页面同 sourceHash；同时读原快照与新链及原因。覆盖 finance-only、operating-only、finance+operating、再加 labor 四组合；网络/DTO/DOM/tooltip/错误/审计自由文本不能还原被屏蔽薪酬。现有页面窄屏和桌面均验 loading/403/空态/待裁决/冲突重载；按钮去重不能代替后端约束。

静态审计/JSON/来源 hash 检查本轮可执行；产品 lint/build/test、迁移、HTTP、浏览器尚未执行且本轮被禁止。完整机器矩阵和每入口事务记录在 `audit01.json`。本文件不是 G1 Pass、G3 或 G4 证据。
