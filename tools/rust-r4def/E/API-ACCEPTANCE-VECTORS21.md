# E21 真实 API 验收驱动

`api-acceptance-vectors21.mjs` 是 Root 统一验收可注入的串行驱动，21 个案例初始全部 `not-run`。本作者只做语法及静态入口检查，没有启动/访问服务、数据库、旧 private、浏览器，也没有执行任何验收请求。它不能代替真实验收、独立 G3 或 G4。

驱动与 E `delivery04.json` 四源指纹绑定，不继续使用 delivery01 的旧采购进度比较。Root 必须同时接入其 C 每次真实付款确认递增应付版本、F 正式 `completed` 来源资格的必要修正；适配器不转换 `completed` 为 `paid`。G1 及原作者证据没有改写。

## 注入接口

```js
import { createEAcceptanceSuite, describeEAcceptanceVectors, WITNESSES }
  from './tools/rust-r4def/E/api-acceptance-vectors21.mjs';

const suite = createEAcceptanceSuite(actualContext, {
  // Root 负责真实cookie/session/CSRF、当前spec查路由、保存原始请求回执。
  async request(operationId, id, body, actor, meta) {
    // meta={caseId,stepId,method,path,query}；GET body=null。
    // 方法必须调用真实服务，不能返回fixture或调用内部execute假装HTTP。
    const receipt = await rootActualRequest(operationId, id, body, actor, meta);
    return { status: receipt.status, body: receipt.unwrappedBody,
      receiptId: receipt.savedRawReceiptId, requestId: receipt.requestId };
  },
  // 可选的只读核证hook，与HTTP断言分开计数。Root已同意提供。
  async observeEvidence(evidenceId, actor, meta) {
    const receipt = await rootReadOnlyEvidenceReceipt(evidenceId, actor, meta);
    // body为本次真实cost_governance_evidence的snake_case PG行。
    return { body: receipt.row, receiptId: receipt.savedRawReceiptId };
  },
});

const initial = suite.manifest(); // 21 not-run，0 passed，0 HTTP请求
// Root保存initial以及实际context/服务实例/四源/驱动的rawsha后再明确执行。
const result = await suite.run();
// 或选定案例；其依赖会自动纳入、仍按CASE顺序串行。
// const result = await suite.run({ caseIds: ['E21-13', 'E21-15'] });
```

导入模块和 `describeEAcceptanceVectors()` / `suite.manifest()` 没有 I/O；只有显式 `run()` 会调用注入函数。一份 suite 只能执行一次，防止失败重试默默重复业务事实。需要重跑时由 Root 先判断上次真实回执/提交状态，选择新 tag 和明确的新 context，不能自动当作回滚。callback 抛错、缺少真实 receiptId 或返回未预期状态都不能计通过。驱动不发并发请求、不自行重试、不导入生产逻辑计算期望。

operation catalogue 提供实际 method/path；业务 `id` 是路径中的项目或资源 UUID，全局发布/全局分摊/审计列表是 null。GET 查询参数只在第五个 `meta.query`，不能混入 JSON body。Root 需解开自己的 HTTP envelope，body 保持冻结 schema 的真实返回形状（列表为数组）。`requestId` 可选，用于 Root 将真实 HTTP/安全事件证据进一步精确关联。

## actualContext

以下是字段形状，不是可向真实环境提交的假 UUID fixture；所有变量必须从 Root 真实 API 生产及读回取得：

```js
const actualContext = {
  tag: uniqueCaseTag, // 1..20 ASCII字母/数字/_/-，本次独占
  project: { id: actualProject.id },
  activeContract: { id: actualContract.id, projectId: actualProject.id,
    status: actualContract.status, currencyCode: actualContract.currencyCode },
  otherProject: { id: actualOtherProject.id },
  expenseCategory: actualActiveExpenseDictionaryCode,
  costCategory: actualCostCategoryCode,
  actors: {
    full: actualBothSensitiveFinanceActor,
    financeOnly: actualNoSensitiveFinanceActor,
    operatingOnly: actualOperatingOnlyFinanceActor,
    laborOnly: actualLaborOnlyFinanceActor,
    auditFull: actualBothSensitiveAuditActor,
    auditFinanceOnly: actualNoSensitiveAuditActor,
  },
  persons: { partialCoverage: actualPersonA.id, priorityChange: actualPersonB.id },
  assessments: {
    payable: { periodStart: '2026-11-04', periodEnd: '2026-11-04',
      attributedStage: actualResponsiblePayableAssessment.stage,
      reason: actualResponsiblePayableAssessment.reason,
      evidenceSummary: actualResponsiblePayableAssessment.evidenceSummary },
    historicalLabor: { periodStart: '2026-10-01', periodEnd: '2026-10-03',
      attributedStage: actualResponsibleLaborAssessment.stage,
      reason: actualResponsibleLaborAssessment.reason,
      evidenceSummary: actualResponsibleLaborAssessment.evidenceSummary },
    priorityChange: { periodStart: '2026-09-01', periodEnd: '2026-09-30',
      attributedStage: actualResponsiblePriorityAssessment.stage,
      reason: actualResponsiblePriorityAssessment.reason,
      evidenceSummary: actualResponsiblePriorityAssessment.evidenceSummary },
  },
  // 可选；缺少真实历史事实时 E21-20 保持not-run，绝不SQL造旧行。
  legacy: { unprovedInvoice: { id: actualLegacyInvoice.id,
    projectId: actualProject.id, currencyProof: 'missing',
    receiptId: actualReadOnlyLegacyProofReceiptId } },
};
```

本组固定币种 CNY、固定业务日/人工期间见请求，不从项目 currentStage 猜历史。合同必须真实 Active 且同项目/CNY，项目不受总报价硬预算控制。Root 可复用 `tools/rust-r4abc/upstream-payloads01.mjs` 的纯请求 factory 先通过真实 R3/A/B API 取得这组真实基础，不得跳过上游审批或靠 SQL 插 producer。

actors 是 callback 认识的真实会话引用，至少包含 `{id: actualUserUuid, permissions: actualPermissionStrings}`。脚本把同一对象传回 Root，不创建或提升权限；摘要只保存 actorKey/id，不复制其凭据。权限矩阵严格检查：

- full：`contract:finance:manage` + 两项敏感读权限。
- financeOnly：财务管理，有意缺 operating/labor 两项敏感读。
- operatingOnly / laborOnly：财务管理，仅相应一项敏感读。
- auditFull：`platform:users:manage` + 两项敏感读；发布费率只有非敏感 command 回执，因此用这个真实审计入口读回已发布行的当前 row_version，不猜 CAS 版本。
- auditFinanceOnly：`platform:users:manage`，缺 operating/labor 敏感读；审计管理权限也不代替敏感授权。

两个人员必须是 Root 已验证的不同真实人员，且相关 person/hour rate key 没有其他现行版本；不能把某个员工默认归入角色汇总。role code 由 fresh tag 构成独占键。若环境已有同 key 费率，需要 Root 使用新专用真实人员或另行通过正式受控命令准备，不删除或改写历史率。本脚本不偷偷选择前驱。

assessments 是责任人对指定业务日/完整期间的真实明确判断。驱动缺此信息就保留对应案例 not-run；不把当前 projectStage、handover 或单个里程碑当作整段劳动期间证明。劳动采用正式 manual evidence 命令登记完整期间责任判断；应付阶段使用真实 payable sourceId/当前 sourceVersion/业务日及责任说明。所有 E 创建均 registered、not included，F 具证后才 confirmed，仍 not included。

## 21 个案例

- 01：费用六入口（create/update/confirm/void/list/detail）、陈旧 CAS、确认后禁止直改和作废终态；每种返回都检查 raw 为 null/投影可用。
- 02：已确认费用→E expense；重复当前映射409；真实费用已映射后的更新/作废422；源版本不变。
- 03：超过两位、0/负数/溢出/指数文字拒绝；税额不平422；失败前后真实费用列表一致；未知净/税保持 null，不伪造0。
- 04：C 真采购/付款；未确认付款拒绝映射；确认后 E payment-fact；`2026-11-03T16:30Z` 按香港为 `2026-11-04`；重复映射拒绝。
- 05：真实 input invoice 先 draft，正式 PATCH verified；分别验证无合同显式币种、同 Active 合同不可变 snapshot→source preparation 币种；invoice 净/税未知保持 null；output invoice 不作支出成本。
- 06：C 真采购→E procurement；当前唯一，原 C 金额和作废不能绕过映射；为后续链保留原0.00净已付捕获。
- 07：人工固定乘算见证、HALF_UP、hour/day 两种单位、同 rateVersionId 不同不重叠期间可各自登记。
- 08：0分币422，数量/费率超精度拒绝；缺劳动敏感读时 create/replace 在计算前403。
- 09：个人率只覆盖10日至20日时，整月/左边界/右边界/单日角色归集均拒绝；明确1/2/3小时三段分别10.00、40.00、30.00，不按日历比例猜工时。
- 10：同person/role当前期间的交叠与共用端点409；下一日邻接登记成功。
- 11：同真实role发布后继0.0001率，使用其合法新区间替代会舍入0并422；旧行状态/版本整体回滚；使用原历史率正确替代为69.14，新ID/真链/旧replaced终态。
- 12：四种财务 actor 的 list/detail/写回执投影；非labor/费用用 operating，labor包括可反推字段只用labor；强授权也不能读旧 raw 键。
- 13：C净20.00/税1.20/含税21.20确认后，E原采购捕获不变；陈旧 sourceVersion 的 F 证据409；当前源证据正式确认，并只读核证 captured1→current2/净已付0→20。
- 14：第二笔净30.00/税1.80/含税31.80，仍partial但应付版本递增；陈旧/已确认付款重提不增版本。F真实单项目100%分摊含税106.00，核证原capture1/previous2/current3/净总额50。末笔净50.00/税3.00/含税53.00付清 completed，再以真实分摊替代命令核证1/previous3/current4/净总额100；全程不included。
- 15：劳动按123.4567率原期捕获154.32，发布11月1日后继，原率严格截到10月31日仍覆盖原期；F具证确认时冻结同率受控截短证明；旧率可显式补记有效期内，不得用于11月。
- 16：新率边界不得破坏已捕获劳动期间；失败无旧成本改写，之后合法边界可发布；旧头/陈旧CAS拒绝。
- 17：E已登记具名角色劳动后新增局部个人率；F不认可原角色权威，409且不落阶段、不假确认、不重算旧金额。
- 18：当前费率须显式前驱、边界合理、CAS准确；发布 command 不裸返 rate/key/person 等敏感字段。
- 19：真实 Expense/非labor/LABOR/全局rate审计包标签；费用前106.00/后212.00更新历史完整；无敏感读时 snapshot/reason 均null，metadata最多保留Root已定义安全UUID/operation/package白名单；投影-only GET 的真实安全事件已持久化且不复制敏感说明。
- 20：仅 Root 有真实 preexisting verified input invoice 且无币种证明时运行，映射422；不造旧数据、不猜默认币种。
- 21：跨项目源409、非法查询枚举400、联合请求额外金额键400；五种costType实际列表可过滤读回。

`WITNESSES` 冻结了独立手算：123.4567×1.25=154.320875→154.32；17.2850×3.00=51.855→51.86；80.1250×1.50=120.1875→120.19；0.5000×0.01=0.005→0.01；0.0001×0.01=0.000001→0.00拒绝；17.2850×4.00=69.14。请求金额与分摊106.00来自这些固定见证，金额期望不从返回值/生产算法求出。

## 回执、内部证明与计数

返回摘要逐 case 保存真实 operation/method/path/query、状态码、actor id、receiptId/requestId 及断言结论；不保存会话凭据和真实敏感响应副本。Root 负责保存原始回执，摘要只是索引。resources 记录便于跨case绑定的实际业务UUID；完整产物及精确清理清单必须以 callback 保存的全部真实回执为准，不能仅靠此辅助列表。驱动不包含SQL清理动作。

公开 F evidenceProjection 只有 businessDate/reason/sourceReferences/payloadHash。驱动不能凭其 hash 宣称内部 proof 已验证。observeEvidence 必须只读查询 `evidenceId` 对应本批真实 `cost_governance_evidence`，保留真实 PG 原始回执；脚本核验 schema_version、payload_hash、原始 immutable source_basis、captured/previousCertified/current version、原因、source identity、当前/原始 payload hash、最近认证 hash 锚点、确切净已付总额0/20/50/100或历史率截短日期。没有 hook 或缺真实回执的 observation 保留 `needs-evidence`，HTTP成功单独计数，case 不计通过。

执行前 `counts.passed=0, httpRequestsPassed=0, readOnlyObservationsPassed=0, notRun=21`。依赖的 HTTP 部分没通过时，后续case保留not-run并给依赖原因；内部核证缺hook不阻止已经具备真实HTTP前提的后续case运行，但不会转为整体Pass。失败不自动重试或生成替代假事实。

并发、故障注入、COMMIT回执不确定性、数据库迁移/preflight、浏览器/生成client、历史冻结快照/纳入态的正式producer和独立G3/G4由Root另控；本驱动不会创建假F/included/snapshot。E审计对象不在旧 EntityAuditTargetType 枚举内，本组使用正式全局 audit-logs 入口读实际对象；不会构造非法entity targetType路径来声称第二审计入口验收。

静态来源：joint-g1-06/target-full-spec06.json、operation-map06.json、E delivery04/作者实际源码、F真实 evidence/service/projection 模块、C canonical 状态及正式请求DTO、Root runtime_audit/protection.rs 已定义安全metadata规则。Root捕获统一执行包时需为这些当时实际文件及本驱动/本说明记录rawsha；静态引用不代表真实服务运行。
