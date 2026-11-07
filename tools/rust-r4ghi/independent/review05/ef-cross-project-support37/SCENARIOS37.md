# 非空 E/F 跨项目重述候选

此目录是 review05 编写、由 Root 独立审查后决定晋升的候选，不能当作独立证书。当前只实际执行了离线纯负例及语法检查，没有发送 PG/HTTP。旧 18/19 单项目 live、空四类 correction 的原件和 fail-closed guards 不改。

## 可立即准备的 live 场景

Root 使用新 epoch 中的两个**真实 HTTP 创建且已完成实际责任链**的项目 P1/P2。实际 M 必须对两项目都具有当前权限和 OwnerWrite，且具有真实 operating finance / labor sensitive 权限。两个项目分别沿现有真实合同批准激活、technical-cost-package 采用、必要 handover 及 G baseline activation 生产，不能复制主项目 source IDs 到另一项目。

按下列顺序生产，并把返回原件写进同一 owned ledger：

1. `ProjectCostController_publishInternalCostRateVersion`：为本 namespace 的独立 roleCode 发布 CNY/hour 费率，例如 `rateScopeType:'role', personId:null, rateUnit:'hour', rateValue:'100.0000', effectiveFrom:<真实 HK 今日>`。省略无前任时的 expectedVersion 和 supersedesRateVersionId；不得更新现有非 owned 费率。roleCode 是本测试真正发布的身份，不冒充已有人员角色。
2. `ProjectCostController_createProjectActualCostRecord` 在 P1：`costType:'labor', laborRole:<该 roleCode>, laborPersonId:null, laborPeriodType:'week', laborPeriodStart:<真实同日>, laborPeriodEnd:<真实同日>, actualHours:'8', actualPersonDays:null, rateVersionId:<步骤1真实 targetId>, workSummary:<真实本测试工时说明>`。`cost-labor` 业务号沿现有 response-root 绑定登记。
3. 真实 GET 此成本，再 `confirmCostStageAttribution`：同日执行 ledger 的实际 id/sequence_no/entered_at 作为 source evidence，`stageAttributionMode:'auto'`、stage 必须等于该 ledger 的真实 to_stage。不要用今天当前 stage 推断历史区间。若跨度多日，本候选不合格。
4. 另在 P1 生产独立已确认 Expense → E actual cost C2 → F stage S2；不要把 L1 同时放入 stageCorrections。保留真实原 stage 及证据；后续重分类如仍为同一 stage，只能标注为“同 stage 的归属证据替换”，不得声称已测 distinct-stage 变更。要测 distinct-stage，原始手工归属也必须是实际有说明和权限的 F producer，不得伪造另一阶段 ledger。
5. `confirmAccountingTaxTreatment(P1)` 引用真实 C2 source/version/businessDate/currency，显式提交负责人的 pending/deductibility/amount 结论。原请求和更正请求都必须有依据与说明。不得把无税务 producer 的未知税额默认成零。
6. `confirmSharedCostAllocationBasis` 使用 **完整真实** sourceCostRecordIds（可只含 L1）、当前实际 expectedSourceVersions，projectShareItems 为 P1/P2，例如权重 1/1；measurementBasis:'excluding-tax'，不填客户端 allocatedAmount。返回的两个 result ID 和完整 source snapshots 均入 owned ledger。
7. 各项目读取真实 preparation，显式分类：L1 作为共享池来源，在 P1 以 `decision:'exclude', recognitionRole:'direct-source', primaryCostRef:null` 明确排除其直接累计，理由说明其经济额仅按完整 allocation-share 累计；两个实际 allocation result 以 include/allocation-share 纳入，各项目其余真实成本明确分类。不要把共享来源称为 evidence-only：该角色要求另一个真实主成本，allocation result 不能假装该主成本。不得简单复用旧 expenseDecisions()，该 helper 明确拒 allocation。通过真实 G realtime capture 固定 P1/P2；GET 原快照、source context 及四阶段绑定，保全原件。
8. 调用候选 `prepareNonemptyCrossProjectRestatement37(ctx, api, scenario)`。它只发送 canonical preparation GET、调用现有 capture 读取见证；所有 ExpectedRef 来自真实 preparation 或实际 frozen G member 的 server hash，**不本地计算业务 hash**。以下四数组各恰好一项：
   - labor：L1、同真实 rate、原工作日区间、例如 8→9 小时；原真实 S1 用作同区间 authority；不造 source cost ID。
   - allocation：完整原 basis、全部原 source cost refs、全部原 P1/P2 result refs；例如权重 1/1→2/1。每项 reason 必填，零权重同样有理由；全零拒绝。
   - stage：不同于 L1 的 C2 及 S2、真实同日 project-stage ledger；sourceVersion 必须是实际 sequence_no。
   - tax：原实际 tax snapshot，expectedSourceRefs 包含实际 C2；保留源币种；明确 replacementReason 和负责人的更正结论。C2 经 stage producer 改版本后的税来源由服务器真实 transition rebind，客户端不能猜新版本。

`scenario` 的最小形状（所有 ID 从实际 owned 原件提取，不接受此文件中的占位符为真实输入）：

```js
{
  primaryProjectId, primarySnapshotId, projectIds: [P1, P2],
  reason: '本次真实工时、完整分摊批次、归属与税务依据更正原因',
  summary: '保留旧事实；新 E/F/G/H、audit、receipt 同事务',
  requirePeriod: false,
  labor: { costId: L1, rateId, actualHours: '9', actualPersonDays: null,
    workSummary: '本次真实更正后的工时说明', reason: '明确工时纠错理由' },
  allocation: { basisId, reason: '完整批次更正理由', shares: [
    { projectId: P1, allocationWeight: '2', reason: 'P1 修订后的真实分摊依据' },
    { projectId: P2, allocationWeight: '1', reason: 'P2 保留的真实分摊依据' }
  ] },
  stage: { costId: C2, projectStageRecordId, newAttributedStage: 'execution', reason: '实际归属更正证据说明' },
  tax: { taxTreatmentId, request: {
    taxTreatmentType, deductibilityStatus, taxImpactAmount, taxImpactSummary,
    taxPendingFlag, taxImpactPendingAmount, basisSummary, replacementReason
  } }
}
```

实际 POST 前，Root 须独立审查/晋升本目录三份 number-support 候选。它只允许 **一个**实际 owned labor replacement：旧成本最新原件 + G 返回的新 restatement/snapshot 双锚 + 新成本 before-absent + supersedes 关系 + actor/project/currency + 两份真实 E audit + 同 physical xmin + 官方 `AC-LBR` 存储业务号/完整 counter 单步。不会接受任意 SQL 插入或仅同项目/同 actor 猜测归属。多个 labor replacements 必须另做新的完整计数证明，本候选直接拒绝。

候选 planner 明确 `executableByThisPlanner:false`，不内置 business POST。它输出的 binding 是可审请求材料，不能绕过必要写 FI 准入。现有 gh-write-facts / required-write-inventory 的四数组空、单项目、live guard 继续保留。Root 新增 producer-specific inventory 之后，才可实际逐写 FI + 一次成功，不能把普通成功追认成 FI。

## 必须实际验证的结果

- 所有 reverse-discovered `(projectId, terminalSnapshotId, periodRef)` 与各 target preparation 一致；缺 P2、缺一个期间终端、重复 target、stale root/ref/hash 都在首个 E/F effect 前拒绝并保全两库全表/hash/xmin/catalog/sequence 原件。不得把外层 scope='period' 当作删除 live target 的理由。
- L1 原记录替换，真实新 E 成本由 rate×quantity 服务器计算；新 F 首阶段与原确切工作区间一致。新 F 完整 basis/results/source snapshots 保留两个项目，并且所有净/税/含税分层金额、残差按 server 结果守恒；无重复 source cost 或接收方伪造成本。
- S2 / tax / basis / result 真实前后继关系、cause refs、source hash 改变；旧快照/context/source-members/payload/金额证据保持不可变，允许真实状态/版本 supersede。
- 每个真实受影响终端生成新 G snapshot/context/member/decision 与 H evidence/maturity/signal/四阶段 bindings/summary；E/F/G/H/audit/receipt/pending-auth 均检查实际 common xmin。不能只数新 G/H 行而漏内层 E/F 必要写。
- current 仅按各项目真实 live 终端关系更新，period 不提升 current。原 current 与四阶段 binding 的变更必须精确符合实际 current 终端是否在闭包内。
- 幂等同体回执与异体冲突均检查原业务行/xmin，不再次运行成功 POST 来修工具断言。失败/断 ACK 均先以原 before/after/raw reconciliation 定位实际提交状态。
- 业务号在 E 的同外事务内分配（project_actual_cost/mod.rs724-726），FI 失败应精确回滚 counter；此路径不能套 Origin 独立计数器留号政策。

## 期间场景真实资格

先读 exact decision05 `bd1a7556...` 和实际 epoch source pin。新 fixture 的 term activation `effective_at=clock_now()`；G 只收已完成期间且 term effectiveAt<=cutoff。new09 真实 baseline 两库各7个旧 term 全缺 currency/net/gross/tax/preparation/approval/adopted estimate，因此也不能借作正向历史链；见 review36。

在当前时间没有合格历史源时，可立即运行真实 preparation GET 的拒绝/缺证案例，并运行以上 live 非空跨项目案例；期间 positive 保持未覆盖，不能 SQL 造历史/回填旧 term/改时钟/把 producer_version0 改成1。后续若自然跨期后保留的真实新链具备完整资格：先对 P1/P2 正常 period close，分别在有 realtime current 与无 realtime current 的新 owned 项目验证 current 不变，再以 `requirePeriod:true` 执行同一 correction planner，完整消费服务端实际期间+live 终端闭包。期间原 baseline/window/root 固定，period 不成为 current；闭包中的真实当前 live 终端应正常更新。时间资格由当时实际 preparation 决定，本文件不是资格豁免。

## 边界

候选不修改 Root 产品/Git/数据库。新所有行由原 HTTP ledger 归属并列入 exact-owned cleanup；不借用旧业务行、不引入 cleanup 白名单。已有真实测试 actor 的认证等借用仍由 Root 既有精确列 allowlist 处理。作者候选还需 Root 非作者审查及真实执行；本目录不认证整体 G3/G4。
