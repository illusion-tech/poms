# G 最终联合 G1 目标契约提案

**候选，未准入 G2。** G #111 / 本批 #110。只写 `tools/rust-r4ghi/G/final-g1`，不改产品/共享、不运行 DB/API/Git。期望 `gpt-6.1-sol/max`，Fast 未核实。

本文件是要交付的目标，不重复旧审计。精确请求/返回在 `target-dto.schema.json`；逐表/列与约束在 `target-schema.sql`；完整机器提案在 `proposal01.json`；所有正式源及 H 契约 hash 在 `sources01.json`。Root 统一提升 migration/ORM/DTO/spec/client/adapter 并独立复核后才准入。

## 路由、输入与返回

维持 G 九入口，均 `contract:finance:manage`，POST 会话/CSRF/真实 actor。四 POST 201、五 GET 200。写入业务选择/理由和金额/血缘可见性同时使用现有敏感权限规则；`containsLabor=unknown` 不弱化权限。

| operationId（前缀 ProjectCostController_） | 方法 / 路径（省略 /api） | 目标输入 / 返回 | canonical 行 |
| --- | --- | --- | --- |
| activateOperatingBaselinePackage | POST /operating-baseline-packages | ActivateOperatingBaselinePackageRequest / OperatingCommandResult | 162 |
| getCurrentOperatingBaselinePackage | GET /projects/{projectId}/operating-baseline-package | projectId / OperatingBaselinePackageSummary | 163 |
| createProjectOperatingSnapshot | POST /project-operating-snapshots | CreateProjectOperatingSnapshotRequest / OperatingCommandResult | 164 |
| getProjectOperatingSnapshot | GET /project-operating-snapshots/{id} | id / ProjectOperatingSnapshotSummary | 550 |
| createPeriodClosingSnapshot | POST /period-closing-snapshots | CreatePeriodClosingSnapshotRequest / OperatingCommandResult | 165 |
| getPeriodClosingSnapshot | GET /period-closing-snapshots/{id} | id / PeriodClosingSnapshotSummary | 533 |
| createOperatingRestatement | POST /operating-restatements | CreateOperatingRestatementRequest / OperatingCommandResult | 166 |
| listOperatingRestatements | GET /projects/{projectId}/operating-restatements | projectId / OperatingRestatementSummary[] | 556 |
| getOperatingRestatement | GET /operating-restatements/{id} | id / OperatingRestatementSummary | 532 |

四写请求统一必需 `inputVersion=server-derived-v1`、`projectId`、`expectedVersion`（经营 head revision，0 明确表示尚无 head）、`expectedProjectVersion`（真实项目正版本）、`expectedInputHash`。每个提交引用都带 kind、实际 ID、正 `expectedVersion`、payloadHash；分类 `expectedVersion=0` 仅表示该计量单元尚无当前 decision。业务选择不能只传 UUID 省略版本。

- 激活基线：`expectedCurrentPackageRef` 可空，`originalAdoptedCostRef` 必需，`selectedHandoverBasisRef/handoverRebaselineRef` 显式可空，`approvedChangeRefs[]`、`reason`。输入正式来源，不输入基线金额。
- 项目快照：`baselinePackageRef`、`snapshotMode=realtime|period-end`、显式 `periodKey|null`、`costDecisions[]`。period-end 分支必须调用同一个期末 producer，产生唯一 paired period，不能绕过期末唯一性。
- 期末：`baselinePackageRef`、真实月/ISO 周 `periodKey`、`expectedPeriodSnapshotRef|null`、`costDecisions[]`；已有 active 期末不允许普通 create 替代。
- 重述：`scope=live|period`、`restatesSnapshotRef`、`periodEndSnapshotRef|null`、reason/summary、costDecisions、真实 E laborCorrections/F allocationCorrections、完整 `affectedTargets[]` 与 `acknowledgedChangedSourceRefs[]`。live 纠错不伪造期末；period 重述固定原窗口和 period root。

`CostDecisionInput` 的真实 target、前 decision 版本、include/exclude、recognitionRole、reasonCode/reasonText、primaryCostRef、supportingSourceRefs/evidenceRefs 全部显式。primary money 来自真实 producer，`canonicalAccumulationKey`/来源链由服务器构造，不接收客户端金额、占比计算结果或行动结论。

旧金额/动作字段只可放入显式 `assertions`：服务器重新计算并逐个严格对比；不匹配 409 `assertion_mismatch`，unknown 不能匹配数字，不悄悄忽略旧输入。实际新 UI 一律不提交 assertion 或金额总数。

返回 CommandResult 增加 `rowVersion/newHeadVersion/snapshotId/periodEndSnapshotId/restatementIds/sourceHash/evaluationRefs`，N/A 显式 null。GET 增加 producer/certification、capturedRowVersion、headVersion、sourceContextId/payloadHash、真实 sourceRows 及 G/H 引用；历史读取不重新绑定当前来源。精确金额、可逆摘要/理由都经过既有 operating-finance/labor 投影，不能在兼容字段留第二套原值。

## 基线来源只采用一次

原始成本 = 第一次正式签约采用的**项目级**技术成本包净额，不按合同份数重复相加。必须证明所有采用包属于同一条真实项目版本链；存在分叉/不相容包时拒绝，不能取第一条或把两个项目总额相加。

`handoverBaselineCost` 是真实移交/再基线化 before/after 所承接的项目成本版本。`executionChangePackageTotal` 只认进入执行后正式批准并生效的项目成本版本差额，每次 transition 计一次。最终：

```text
originalBaselineCost = original adopted project estimate net
changePackageTotal = handoverBaselineCost - originalBaselineCost + executionChangePackageTotal
currentEffectiveBaselineCost = handoverBaselineCost + executionChangePackageTotal
```

合同签约额/合同变更额不能代替成本差额。基线激活只写 `operating_baseline_source` 与包/变更/head；它不要求尚未发生的回款、不制造经营快照或 H evaluation。full source context 是后续快照专用。

## 真正的成本纳入与跨快照不可变性

G 命令是纳入口径 producer。直接成本仅在实际 E source_facts、真实 source 版本/币种/金额层、F 阶段/证据和来源链资格均通过后 CAS：

```sql
UPDATE poms.project_actual_cost_record
SET record_status='included',is_included_in_project_cost=true,
    included_at=$now,included_by=$actor,row_version=row_version+1
WHERE id=$id AND row_version=$expected
  AND record_status='confirmed' AND NOT is_included_in_project_cost;
```

必须恰好一行。新 `project_cost_inclusion_decision` 追加理由和精确 source/state 证据，`project_cost_inclusion_head` CAS 当前决定，`operating_snapshot_cost_member` 固定每份快照的实际 decision/来源版本和金额。后续快照复用历史决定不重算或再计一遍。

`isIncludedInProjectCost` 是已经被正式消费的 sticky 事实：不可把 flag 重置 false/status 改回 confirmed 来绕过替换保护。历史已经纳入的行后续被正式 replacement 时保留 flag=true、状态变 replaced；原 membership 永远不变。修改已经发布的 include/exclude 或金额来源必须走显式重述，不能普通 create 偷换当前分类。

共享池的原 CostRecord 保持 confirmed、不当作来源全额 included。真正纳入的是 F result：新增 `is_included_in_project_cost/included_at/by` 并真实 CAS result version，member 只消费该项目份额。H costRef/recordStatus 可空，sourceRef 指向真实 SharedCostAllocationResult，逐源成员保留真实成本类型/日期/阶段/费率血缘，不制造 synthetic ProjectActualCostRecord。

付款/费用/人力是真实主体单元，分期付款的不同 paymentId 可分别累计。采购承诺例外和已吸收同一承诺的付款主体互斥；invoice 默认 tax-support/evidence-only 且 exclude，不重复加主体成本。无原生链链接的票据，只能由本次显式 supporting refs + 真 ID/版本/项目/币种/证据/理由形成可审计关联，不能按金额/日期猜链。

普通 E/F 替换/重分/源变更增加真实 consumed-membership guard，返回 409 `operating_restatement_required`。重述内部生成不可由客户端伪造的 `RestatementPermit`，调用真实 E 人力计算/F 整批替代 producer，持有实际来源锁、使用精确工时/费率/权重、保留 predecessor，新阶段证据真实派生；G/H 全链同事务。共享整批影响多个项目时，`affectedTargets` 必须完整覆盖，不能只改一个份额。不存在的非人力纠错 producer 继续明确阻断，不能接收 correction amount 造事实。

## 含税回款 basis：扩展现有确认入口，新增路由 0

保留 `ContractFinanceController_confirmReceiptRecord` / `POST /api/receipt-records/{id}:confirm`（200），请求改为必需 expectedVersion/expectedContractVersion，`mode=confirm|certify-existing-basis` 以及真实 basis 引用。

confirm：仅 pending-confirmation；basis 选定真实同合同已激活条款 snapshot、其版本/hash、真实币种来源和证据。服务器由现金 gross 分精度与该条款税率四位计算：

```text
net_cents = HALF_UP(gross_cents * 10000 / (10000 + tax_rate_scaled4))
tax_cents = gross_cents - net_cents
```

同 outerTX 插入不可变 `receipt_accounting_basis`、CAS 确认回款、审计/auth。币种取被激活商业基线与同合同激活后不可编辑的 currency 绑定；未来真实条款 activation 同时冻结 `contract_term_snapshot.currency_code`，旧 null 不批量填。

历史补齐：`mode=certify-existing-basis` 仅 confirmed 且尚无 basis。操作者必须明确选原始实际条款/币种及证据、写理由；服务器验证真实 ID/版本/hash/生效批准链。只 CAS receipt row_version+1 和插入新 basis，不改 gross/date/status/confirmedAt/confirmedBy，不重复确认。UI 可推荐唯一可证明的到账日适用条款；不唯一时必须显式证据选择，不能自动 latest/current。原条款本身税率/币种不可证明则仍 unknown，先补真实上游来源，不在此假造。

历史经营 context 不回填。新 basis 只被新重述显式消费。当前已存在 basis 的重定税/纠错不属于“缺 basis 补齐”，拒绝而非悄悄换税率；若后续必须独立 basis correction endpoint，Root 需另登记/重核计数。

## G/H 单事务顺序与锁

精确接口与参数写在机器提案。H 是 policy 唯一权威，G 是 factual collector 唯一权威：

```text
真实来源 + 显式classification/真实E-F纠正
  -> G OperatingSourceContext
  -> H derive_operating_evaluation(context, None)
  -> G INSERT snapshot v1（最终facts/currentActionLevel一次写入）
  -> H evaluate_with_session(session, snapshotId, 1, sourceHash, actor)
  -> H重载hash/v1复算断言并写DMER/OSER/四binding/summary
  -> required audit/security/auth coflush -> 唯一外层COMMIT
```

H 不回写 G 事实。缺 confirmed receipt basis 或 included 硬来源/金额/阶段/分类依据，formalEligibility=missing-evidence，正式发布拒绝；准备态可以显式 unknown，不能包装成 official current。money knowledge 与 maturity/evaluation 分离，0 需要穷举 scope 或已授权分类零证明；laborLineage=yes/no/unknown，unknown 使用最强可逆敏感群组。

先发现完整受影响项目集合，再按 UUID 升序 lock project；发现新作用域则重新开始，不能逆序补锁。随后固定顺序 head/current baseline→contract/terms→receipts/basis→E 所需 rate-family advisory（全族）/rate/source 行→cost 行→F basis/results/stage/tax/evidence→G decision/heads/snapshot/period/restatement。所有集合按类型注册序+UUID 排序，复核身份与版本。shared replacement 必须先确定所有项目/源集合；全部必要写失败一并回滚，认证独立 raw touch 的既有边界不改。

`expectedInputHash` 是写入前真实 upstream scope/head 的准备 hash，复锁后不符 409；新 classification ID/实际 included CAS 后的 sourceHash 则按 H factual whitelist 重新计算。两者不混为同一个值。H sourceHash 排除 generated snapshot/context IDs、rowVersion/time结果字段及 policy/metrics，完整 payloadHash 仍绑定最终持久化 context；evaluationHash 再绑定 policy 与结论。

## 期末与最小真实 UI

快照采用“截至期间末累计”，start=null 表示项目起点；月/ISO 周必须真实，未结束的未来期间拒绝。business timezone 沿既有 Asia/Hong_Kong，不改 DB 时区。knowledgeCutoff 是实际采集时点。重述保留原 business cutoff、使用后来真实获知的来源，原 period 字节/hash 不变。

共享正常冻结要求 F result 当时已生效且全部源成员在 cutoff 内；重述可采后来真实生效但所有源实际发生日在旧 cutoff 之前的完整批次，保留 F 生效日和 late-recognized 两事实。跨 cutoff 混批不按 roundedRatio 臆造部分份额，需要真实 F 拆批，否则 missing-evidence。

既有 H `GET /projects/{id}/unified-accounting?view=preparation&intent=...` 返回 G collector 的 `OperatingPreparation/sourceRows`（可带 periodKey/restatesSnapshotId/receiptId）。准备态只读真实来源，无 snapshot/classification/R5 fixture 业务落表，不认证 current；H 如需预览只调用同一 pure derive。G GET 当前基线仍维持缺失 404，首次建立走准备态。

现有经营工作区增加：无基线/setup；真实来源表（版本、资格、原金额层投影）；采用估算基线；include/exclude 理由；实时/期末提交；原快照与重述历史；到真实 receipt basis/E/F 纠错入口的链接。资金确认增加实际条款/证据选择和净税结果。浏览器只渲染和提交真实 refs/versions/hash/业务选择，不实现 H policy、金额汇总或税率公式。冲突重载、403、unknown/0、未认证和 labor mask 均显式。

## TS / Native 构建与计数

Root 把当前 G 旧请求/返回完整 schemas/types 按既有 R4DEF 做法固定为 frozen-native-reference（原字节见旧 `G/g1/contract01.json`）。新 shared DTO 明确 inputVersion；Node 仅 legacy reference branch 使用原接口，新 server-derived-v1 在参考 runtime 返回清晰 422 unsupported，除非 Root 选择真实实现 Node producer。不能 type-cast 新 body 后让旧 Node 用伪金额跑业务。

生成 client/Shared 视图采用清楚的 ServerDerivedV1 / deprecated FrozenLegacyReference 分支，Angular 先判 outputVersion/producerVersion。缺 discriminator 只能 legacy-unverified，不可认作 current。Rust v1 旧 raw 兼容金额若保留一律 null；真实值只走群组投影。Native 类型导入/受控 adapter 为 Root 独占编辑，需实际 Native build、Angular build、OpenAPI/client 检查；声明与旧参考差异必须留标签。

候选总数保持 **32 = 原25 + stage2 + condition-close1 + R5min4**；G 9 既有、receipt basis 新路由0、preview新路由0。confirm 的新显式模式和 H 既有 query 扩展必须冻结 canonical 语义与 DTO；以后若拆成新公开入口必须重核，不隐藏增加。

真实验收最小闭环：签约/批准/激活→真实gross receipt+basis→E成本→F阶段/税务/整批分摊→G显式纳入→H四阶段产物→真实I/R5消费者。逐必要写 FI、expectedVersion/hash 并发、跨项目整批替代、原快照哈希不变、分与HALF_UP边界、低回款大负毛利率、同项目估算不倍增和全部敏感权限组合均必须实际证明。derived gross_margin_rate 提案单独扩为 numeric(38,6)，阈值使用未舍入有理数，税/合同/人工费率精度不变。
