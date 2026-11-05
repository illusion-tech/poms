# D 受控合同变更与再基线化候选 44

本目录只提供 Root 注入真实 HTTP callback 的候选。作者未调用服务/DB、未改产品/Root/环境、未读 private；静态依据是 Root 当前626 schema、A/B/D实际源码，以及明确授权读取的公开 continuation40/D42 回执。所有9阶段初始not-run，0 HTTP通过。

## 最小一次变更与完整链

```js
import { contextFromPublicReceipts44, createAmendmentAcceptance44 }
  from './tools/rust-r4def/E/amendment44/request-driver44.mjs';

const ids = contextFromPublicReceipts44(actualContinuation40Result, actualD42Result);
const suite = createAmendmentAcceptance44({
  ...ids, tag: freshTag16,
  author: h.actor('full'), // 实际project read/write + contract finance manage/sensitive read
  handoverOperator: h.actor('writer'),
  auditActor: h.actor('full'), // 实际platform:users:manage；不以write权替代读取权限
}, {
  request: h.request,
  resolveApprover: id => actualLoggedInActorById(id),
  resolveParticipant: id => actualLoggedInActorById(id),
});

const initial = suite.manifest();
await suite.capture();
const firstActualAmendment = await suite.amend('A1'); // 最小版本：到真实Active新snapshot+完整plan
// 暂不再基线化，D42旧材料仍保留，sourceChanged应为true。

await suite.amend('A2'); // 同A第二跳，使用最新真实before snapshot/contract CAS
await suite.amend('B1'); // B第一跳，独立金额与计划
const result = await suite.rebaseline(); // 原D42→全部链→新材料→3人重新本人确认→final
// 或从新suite直接await suite.runAll()；已ACK的capture/A1会被跳过，不重放。
```

Root现公开形状的主contract为A，secondContract为B。A从snapshot v1→v2→v3，B从v1→v2；名称序号仅是候选步骤标签，实际UUID、版本、prep/approval/payloadHash全部来自本轮真实API返回。resolver必须将actual currentApproverUserId/participantId匹配到真实已登录session，不默认vp_owner、不换creator代批，不代其他人确认。

API adapter遵循 `{status,body,receiptId,requestId?}`，GET query在第五参数meta.query，路径不含query；body由Root解开真实HTTP envelope。`request-driver44.mjs` 没有导入环境/旧fixture、SQL、网络或运行时。每阶段只可尝试一次，失败/提交不确定后保留全部真实回执并停止，不能自动重试业务写入。`manifest()`逐请求保存operation/path/query/actorId/状态码/原始receipt索引及阶段原因，Root负责真实原件保存。

## 沿现有 UI 可以完成的正式路径

候选只修改 `candidateTerms.receivablePlanSeeds[0].label`，其他已读取条款、净/含税金额、税率、节点身份/数量/日期等保持原值。固定金额见证来自本场景两个合同各自56500.00含税/50000.00未税/0.1300税率，不从项目113000.00总报价倒算硬预算。

1. 真实GET当前Active合同、readiness与其同一商业sourceBaseline；必须具有contract-finance完整读投影和该合同明确referenceTerms。
2. 通过正式 `createContractReadinessPackage` 携带 amendment.sourceSnapshotId/expectedContractVersion/reason创建真实amendment。Active合同继续指向旧快照。
3. 只允许本次review-required/prompt。实际diffItems逐字段精确复核，正式reviewDiff写入责任说明和当前baseline CAS；没有新建商业baseline，也没有改其商业reference条款。该正式复核可以更新baseline复核元数据/rowVersion，不声称baseline整行字节不变。
4. 正式initializeContractSnapshot得到preparationId，snapshotId仍null；submit绑定此prep/amendment，读实际ApprovalRecordSummary.currentStatus与currentApproverUserId，真实指定审批人批准。
5. activate携带真实amendment/approval/当前contract CAS，原子生成新snapshot及完整formal plan。旧snapshot变superseded，旧合同始终Active；不额外调用initializeReceivablePlan写计划，不复制历史到账。

若实际diff判为reapproval-required，驱动停止，须由Root另建真实商业来源与重新放行；不能在本驱动把review标成通过来绕过。需要改变金额/重大条款或技术V2来源时也不能拿本候选的只读reference捷径冒充商业批准。

## 再基线化与证据

capture要求当前正是D42已确认、3名实际参与人、两合同V1 snapshot及同源frozenMaterials；初始化同时读取真实contract-handover.contractReadiness，保存每合同当时的真实planVersionId。affected项按原frozen snapshotId和原planVersionId分别匹配真实contract/receivable basis item；不解析summary文字猜合同，不写假basis item。A/B都变化时必须显式包含全部4项。

先发一个缺少一项的合法形状请求，期望400并通过GET证实没有新材料；再用完整affected集合和最后一个真实current effective amendment作为anchor提交。D实际服务负责追溯A两跳+B一跳，anchor只是当前链中真实一环，不代表只承认最近一条。

公开rebaseline command不包含全部chain证据，因此驱动通过正式audit-logs读实际rebaselineRecordId对应 `metadata.amendmentChains`，逐项核对各合同from/to snapshot、amendment顺序/数量以及每跳真实preparationId、approvalRecordId和payloadHash。缺真实授权audit读者时标needs-evidence，不能仅凭200声称完整链核证通过。

新handover/basis/contractSummary/summary/hash均须与旧材料不同。新confirmation record独立、3人全部pending、confirmedCount=0；旧confirmed标记不继承。驱动在本人确认前提交带claimed confirmed标记的负例，期望409，证明服务器不相信请求里的同意标记；随后才分别使用3人的真实session对新summary/basis及实时confirmation CAS确认（兼任者一次确认其全部职责），最后由操作人正式固定。

新材料的合同snapshot按A v3/B v2更新；技术成本来源仍是原真实V1，所以scope/risk数组应与旧V1完全一致。旧D42详情保持原V1 scope/risk、原snapshot/summary/basis和原人员确认历史。此候选比较的是“新合同版本与同一不可变V1技术来源”，不冒充已生产V2技术范围。

最终新handover confirmed仍是 `handover-confirmed-freeze-pending`，executionAdmission.allowed=false；R5同链提成角色冻结没有在本批变更中完成。

## 历史到账必须有真实基线

catalogue只有 `ContractFinanceController_listReceipts`，没有createReceipt/confirmReceipt。capture及每次activate、最终再基线化后逐合同比较实际receipt列表（UUID、金额、确认信息、版本等整份返回）。本驱动不会重放到账。

如果任一合同没有preexisting confirmed receipt，空列表前后相等只能证明本次未新增receipt，不能声称保住了已有到账；observation会needs-evidence，整体completed不会变true。Root要验收历史到账不重放，应在fresh capture前通过C真实API登记/确认至少一笔各合同receipt，并保留原始回执。不能用SQL造旧行或把空表等同于已有到账测试。

## 可选真实 UI 选择器

以下均从Root当前模板读取，Root可先以 `.rebaseline({confirm:false})` 保留新材料pending，再自行跑本人确认浏览器；此时fresh-confirmations阶段保持not-run，不计API全通过。

- 限定 `page.locator('app-project-handover-actions')`；合同选择 `getByRole('combobox', {name:'选择合同', exact:true})`，value用实际合同UUID。
- `getByLabel('变更原因', {exact:true})`；首节点名称 `locator('input[name="node-label-0"]')`。其余金额/日期保留真实已显示值。
- 按序点击精确button名称：`建立变更就绪包` → 勾选当前真实差异字段、填`审核或操作意见` → `记录已逐项核对的本次差异` → `准备精确变更版本` → `提交正式合同变更审核`。
- 切换actual currentApprover对应真实身份后 `批准本次变更`，切回有权操作人 `生效新快照与完整回款计划`。
- 按真实旧basis items勾选所有改变合同条款/回款项，再点 `再基线化并重新发起各人确认`；每人读新冻结材料并点 `确认本人全部已指派职责`，最后 `正式确认本次移交事实`。

显示新版本、本人确认按钮及R5阻断必须以真实页面/HTTP结果判断；不能通过DOM注入组件状态。此处只给选择器建议，作者未跑浏览器。
