// Request-only candidate. Import performs no I/O. No SQL or fake F producers.
import { randomUUID } from 'node:crypto';
import { OPERATIONS, SOURCE_PINS } from './contract44.mjs';

const E = 'ProjectCostController_', C = 'ContractFinanceController_';
const permissions = { manage: 'contract:finance:manage', operating: 'operating:finance:sensitive:read', labor: 'labor-cost-rate:sensitive:read' };
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
class CheckFailure extends Error { constructor(code) { super(code); this.code = code; } }
class MissingContext extends Error { constructor(code) { super(code); this.code = code; } }
const check = (value, code) => { if (!value) throw new CheckFailure(code); };
const requireContext = (value, code) => { if (!value) throw new MissingContext(code); };
const same = (actual, expected, code) => check(actual === expected, code);
const idOf = row => { check(uuid(row?.id), 'real-returned-row-id'); return row.id; };
const version = row => { check(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0, 'real-returned-row-version'); return row.rowVersion; };
const clone = value => structuredClone(value);
const list = value => { check(Array.isArray(value), 'actual-list-response'); return value; };
const find = (rows, id) => { const value = list(rows).find(row => row.id === id); check(value, 'actual-row-in-list'); return value; };
const frozen = value => { for (const child of Object.values(value)) if (child && typeof child === 'object') frozen(child); return Object.freeze(value); };
export const WITNESSES = frozen({
  ordinary: { layers: ['0.11','0.01','0.12'], initial: [['0.04','0.00','0.04','0.333333','1.000000'],['0.07','0.01','0.08','0.666667','2.000000']], replacement: [['0.02','0.00','0.02','0.200000','1.000000'],['0.09','0.01','0.10','0.800000','4.000000']] },
  // 0.5000 * 0.02 hours = 0.010000 -> 0.01; known ordinary 0.02 + protected 0.01 = 0.03.
  mixed: { layers: ['0.03','0.00','0.03'], initial: [['0.02','0.00','0.02','0.500000','1.000000'],['0.01','0.00','0.01','0.500000','1.000000']], replacement: [['0.01','0.00','0.01','0.333333','1.000000'],['0.02','0.00','0.02','0.666667','2.000000']] },
  maximum: { layers: ['9999999999999999.99','0.00','9999999999999999.99'], initial: [['5000000000000000.00','0.00','5000000000000000.00','0.500000','1.000000'],['4999999999999999.99','0.00','4999999999999999.99','0.500000','1.000000']] },
  grossOnly: { layers: [null,null,'0.01'], initial: [[null,null,'0.01','0.500000','1.000000'],[null,null,'0.00','0.500000','1.000000']] },
  mainPriority: { layers: ['0.11','0.01','0.12'], initial: [['0.06','0.00','0.06','0.500000','1.000000'],['0.05','0.01','0.06','0.500000','1.000000']], replacement: [['0.06','0.00','0.06','0.500000','1.000000'],['0.05','0.01','0.06','0.500000','1.000000']] },
});

const CASES = [
  ['F44-01','真实E费用→registered，snapshot/CAS/source version拒绝及F确认',[]],
  ['F44-02','未分摊阶段重分类，消费真实D确认日期/版本',['F44-01']],
  ['F44-03','税务pending→deductible确认/读/列表/完整替代',['F44-01']],
  ['F44-04','双项目独立分币见证与完整batch替代',['F44-02']],
  ['F44-05','已allocated成本禁止重分类且阶段锁保持',['F44-04']],
  ['F44-06','真实E费率和labor生产，双敏感阶段写与历史读',[]],
  ['F44-07','混合LABOR全组反推保护、写403及批替代',['F44-06']],
  ['F44-08','LABOR税务来源与旧链污点，不因替换成普通来源失敏',['F44-07']],
  ['F44-09','未知净税保持null，未知主层拒绝、gross-only成功',[]],
  ['F44-10','真实C payable→E procurement→F的18,2容量上限',[]],
  ['F44-11','用户已选gross主层1:1反例，F46确认与整批替代',[]],
];
export const describeFAcceptance44 = () => CASES.map(([id,title,dependsOn]) => ({ id,title,dependsOn:[...dependsOn],status:'not-run',requests:[] }));

function field(projection, expected, hidden = false) {
  check(projection && typeof projection === 'object', 'typed-sensitive-field-projection');
  check(['operating-finance','labor-cost-rate'].includes(projection.fieldPackageKey), 'registered-F-sensitive-package');
  check(typeof projection.displayText === 'string' && projection.displayText.length > 0 && projection.displayText.length <= 2000, 'bounded-projection-display');
  if (hidden) { check(['masked','denied'].includes(projection.mode), 'entire-sensitive-field-masked'); same(projection.value,null,'masked-value-null'); }
  else { same(projection.mode,'full','authorized-full-projection'); if (expected !== undefined) same(projection.value,expected,'independent-projection-witness'); }
}
function packet(projection) { field(projection); check(typeof projection.value === 'string','JSON-projection-string'); return JSON.parse(projection.value); }
function noRaw(value) {
  for (const key of ['allocatedAmount','allocationRatio','allocationWeight','sourceCostRecords','sourcePayload','sourceVersionTransitions','frozen_payload','taxImpactAmount','taxImpactPendingAmount','basisSummary','attributionSummary','internalCostRate','laborAmount','laborPersonId','projectShareItems']) check(!Object.hasOwn(value,key),'no-direct-F-raw-'+key);
}
function evidence(projection) {
  const value = packet(projection);
  check(/^[0-9a-f]{64}$/.test(value.payloadHash),'public-evidence-hash');
  for (const key of ['sourcePayload','frozen_payload','costBefore','sourceVersionTransitions','allocationPolicy']) check(!Object.hasOwn(value,key),'public-evidence-is-summary-'+key);
  return value;
}
function receipt(value) {
  check(uuid(value?.targetId) && uuid(value?.evidenceId),'actual-F-receipt-identities');
  same(value.resultStatus,'success','F-receipt-success'); noRaw(value);
}
function costState(row, status, amounts, labor = false) {
  idOf(row); version(row); same(row.recordStatus,status,'real-cost-status');
  same(row.isIncludedInProjectCost,false,'cost-never-INCLUDED'); same(row.includedAt,null,'cost-includedAt-null'); same(row.includedBy,null,'cost-includedBy-null');
  for (const key of ['amountExcludingTax','taxCostAmount','amountIncludingTax','sourceId','sourceRefNo','internalCostRate','laborAmount','laborPersonId']) if (Object.hasOwn(row,key)) same(row[key],null,'E-raw-null-'+key);
  for (const key of ['source_basis','sourceBasis','calculationBasis','sourcePayload']) check(!Object.hasOwn(row,key),'no-E-private-basis-'+key);
  const projected = row[labor ? 'laborSensitiveProjection' : 'financialProjection'];
  ['amountExcludingTax','taxCostAmount','amountIncludingTax'].forEach((name,index) => field(projected?.[name],amounts[index]));
  if (status === 'registered') { same(row.stageLockedAt,null,'registered-unlocked'); same(row.confirmedAt,null,'registered-not-confirmed'); }
  else { check(typeof row.stageLockedAt === 'string' && uuid(row.confirmedBy) && uuid(row.stageDerivedFromId),'confirmed-stage-lock-responsibility'); }
}
function hiddenStage(row) { noRaw(row); field(row.attributionSummaryProjection,undefined,true); field(row.evidenceProjection,undefined,true); same(row.attributedStage,'sensitive','hidden-stage-target'); }
function hiddenBasis(row) { noRaw(row); field(row.financialProjection,undefined,true); field(row.basisSummaryProjection,undefined,true); same(row.basisType,'sensitive','hidden-basis-type'); same(row.allocationMethod,'sensitive','hidden-allocation-method'); for (const result of list(row.results)) { noRaw(result); field(result.financialProjection,undefined,true); } }
function hiddenTax(row) { noRaw(row); same(row.taxTreatmentType,'sensitive','hidden-tax-type'); for (const key of ['taxImpactAmountProjection','taxImpactSummaryProjection','taxImpactPendingAmountProjection','basisSummaryProjection','sourceEvidenceProjection']) field(row[key],undefined,true); }

export function createFAcceptanceSuite44(context, { request } = {}) {
  const cases = describeFAcceptance44(), state = {}, resources = [], byId = new Map(cases.map(c => [c.id,c]));
  let active, step = 0, invoked = false;
  const actor = key => { const a = context.actors?.[key]; requireContext(a && uuid(a.id) && Array.isArray(a.permissions),'actual-actor-'+key); return a; };
  const authorized = key => { const a = actor(key); requireContext([permissions.manage,permissions.operating,permissions.labor].every(p => a.permissions.includes(p)),'dual-full-actor'); return a; };
  const partials = () => ['financeOnly','operatingOnly','laborOnly'].map(key => { const a = actor(key); requireContext(a.permissions.includes(permissions.manage),'route-permission-'+key); requireContext(a.permissions.includes(permissions.operating)===(key==='operatingOnly')&&a.permissions.includes(permissions.labor)===(key==='laborOnly'),'exact-sensitive-grant-matrix-'+key); return key; });
  const date = () => { const d = context.businessDate ?? context.assessments?.payable?.periodStart; requireContext(/^\d{4}-\d{2}-\d{2}$/.test(d),'actual-business-date'); return d; };
  const assessment = () => { const a = context.stageAssessment ?? context.assessments?.payable; requireContext(a?.periodStart === date() && a?.periodEnd === date() && a?.attributedStage?.trim() && a?.reason?.trim() && a?.evidenceSummary?.trim(),'responsible-full-day-stage-assessment'); return a; };
  const base = () => {
    requireContext(/^[A-Za-z0-9_-]{1,20}$/.test(context.tag || ''),'fresh-unique-tag');
    requireContext(uuid(context.project?.id) && uuid(context.otherProject?.id) && context.project.id !== context.otherProject.id,'two-real-projects');
    requireContext(uuid(context.activeContract?.id) && context.activeContract.projectId === context.project.id && context.activeContract.status === 'active','actual-active-same-project-contract');
    requireContext(typeof context.expenseCategory === 'string' && context.expenseCategory.length > 0,'actual-expense-category'); authorized('full'); date(); assessment();
  };
  const project = () => context.project.id;
  const targets = () => [context.project.id,context.otherProject.id].map(s => s.toLowerCase()).sort();
  const reason = () => { requireContext(typeof context.taxReason === 'string' && context.taxReason.trim().length > 5 && !context.taxReason.startsWith('REQUIRED'),'responsible-finance-taxReason'); return context.taxReason; };
  const remember = (kind,id) => { check(uuid(id),'real-created-resource-id'); resources.push({caseId:active.id,kind,id}); return id; };
  async function call(name, id = null, body = null, actorKey = 'full', expectedStatus) {
    const operationId = name.includes('_') ? name : E + name, definition = OPERATIONS[operationId]; check(definition,'frozen-operation-catalogue');
    if (id !== null) check(uuid(id),'actual-path-identity');
    const a = actor(actorKey), expected = expectedStatus ?? definition.success;
    const meta = {expectedStatus:expected,caseId:active.id,stepId:`${active.id}:${++step}`,method:definition.method,path:definition.path.replace(/\{[^}]+\}/g,id ?? ''),query:{}};
    const item = {...meta,operationId,actorKey,actorId:a.id,expectedStatus:expected,status:'requested'}; active.requests.push(item);
    let response;
    try { response = await request(operationId,id,clone(body),a,meta); }
    catch (error) { item.status='failed'; throw error; }
    requireContext(response && typeof response.receiptId === 'string' && response.receiptId.length > 0,'actual-http-receipt-required');
    item.receiptId=response.receiptId; item.httpStatus=response.status; if(response.requestId)item.requestId=response.requestId;
    item.status=response.status === expected ? 'passed' : 'failed'; same(response.status,expected,'HTTP-'+meta.stepId);
    return response.body;
  }
  const readCost = id => call('getProjectActualCostRecordDetail',id);
  const sourceRef = (type,row,why = assessment().reason) => ({kind:'source',sourceType:type,sourceId:idOf(row),sourceVersion:version(row),businessDate:date(),reason:why});
  const manual = () => ({kind:'manual',businessDate:date(),reason:assessment().reason,evidenceSummary:assessment().evidenceSummary,attachmentIds:[]});
  const stageBody = (row,ref = manual()) => ({stageAttributionMode:'manual',attributedStage:assessment().attributedStage,expectedVersion:version(row),attributionSummary:assessment().evidenceSummary,attributionEvidence:ref});
  async function makeExpense(amounts,label) {
    const body={contractId:context.activeContract.id,expenseCategory:context.expenseCategory,expenseDescription:`R4F44-${context.tag}-${label}`,expenseDate:date(),currency:'CNY',amountExcludingTax:amounts[0],taxAmount:amounts[1],amountIncludingTax:amounts[2],sourceType:'manual',evidenceSummary:`R4F44-${context.tag}-实际API费用来源`,attachmentCount:0};
    const created=await call('createExpenseRecord',project(),body); remember('ExpenseRecord',idOf(created)); same(created.status,'recorded','expense-created');
    const expense=await call('confirmExpenseRecord',created.id,{expectedVersion:version(created)}); same(expense.status,'confirmed','expense-confirmed');
    const command=await call('createProjectActualCostRecord',project(),{costType:'expense',expenseRecordId:expense.id,expectedSourceVersion:version(expense),costDescription:`R4F44-${context.tag}-${label}`,evidenceSummary:'由本次真实费用映射，尚未included'});
    const cost=await readCost(remember('ProjectActualCostRecord',command.targetId)); costState(cost,'registered',amounts); return {expense,cost,amounts};
  }
  async function confirm(row,amounts,labor=false,body=stageBody(row)) {
    const result=await call('confirmCostStageAttribution',row.id,body); receipt(result); remember('CostStageAttributionSnapshot',result.targetId);
    const detail=await call('getCostStageAttribution',result.targetId); same(detail.costRecordId,row.id,'actual-attributed-cost'); same(detail.governanceCertification,'verified','certified-stage'); evidence(detail.evidenceProjection);
    const cost=await readCost(row.id); costState(cost,'confirmed',amounts,labor); same(cost.rowVersion,row.rowVersion+1,'stage-cost-CAS-increment'); same(cost.stageDerivedFromId,result.targetId,'stage-lock-actual-attribution');
    same(list(await call('listCostStageAttributions',row.id)).filter(r=>r.status==='active').length,1,'one-active-stage'); return {cost,stage:detail};
  }
  const shareItems = expected => targets().map((projectId,index)=>({projectId,allocationWeight:expected[index][4],allocatedAmount:expected[index][2],allocationRatio:expected[index][3],allocationSummary:`R4F44-${context.tag}-明确完整项目份额`}));
  const allocationBody = (costs,witness) => ({basisType:`R4F44-${context.tag}`,allocationMethod:'weighted',sourceCostRecordIds:costs.map(r=>r.id),measurementBasis:'including-tax',expectedSourceVersions:costs.map(r=>({costRecordId:r.id,expectedVersion:version(r)})),projectShareItems:shareItems(witness.initial),basisSummary:`R4F44-${context.tag}-具证来源、权重与完整份额，不自动included`});
  function checkAllocation(view,witness,which='initial') {
    noRaw(view); same(view.governanceCertification,'verified','certified-basis'); same(view.measurementBasis,'including-tax','explicit-gross-main-layer');
    const data=packet(view.financialProjection); ['sourceAmountExcludingTax','sourceTaxCostAmount','sourceAmountIncludingTax'].forEach((key,i)=>same(data[key],witness.layers[i],'source-layer-'+key)); same(data.measurementAmount,witness.layers[2],'selected-total');
    const rows=list(view.results); same(rows.length,2,'complete-two-project-result-set');
    targets().forEach((target,index)=>{
      const row=rows.find(r=>r.projectId===target); check(row,'actual-target-project'); noRaw(row); same(row.basisId,view.id,'one-batch-identity'); same(row.governanceCertification,'verified','certified-result');
      const money=packet(row.financialProjection),expected=witness[which][index];
      ['amountExcludingTax','taxCostAmount','amountIncludingTax','allocationRatio','allocationWeight'].forEach((key,i)=>same(money[key],expected[i],'independent-share-'+key)); same(money.allocatedAmount,expected[2],'selected-share-gross');
    });
    return rows;
  }
  const taxBody = (type,refs,replace=false) => ({taxTreatmentType:type,deductibilityStatus:replace?'deductible':'pending',taxImpactAmount:replace?'-0.01':'0.00',taxImpactSummary:`R4F44-${context.tag}-${reason()}`,taxPendingFlag:!replace,taxImpactPendingAmount:replace?'0.00':'0.01',basisSummary:`R4F44-${context.tag}-仅治理事实，不重复加税`,currency:'CNY',sourceReferences:refs});
  function checkTax(row,impact,pending) { noRaw(row); same(row.governanceCertification,'verified','certified-tax'); field(row.taxImpactAmountProjection,impact); field(row.taxImpactPendingAmountProjection,pending); evidence(row.sourceEvidenceProjection); }
  const noHints = error => { const text=JSON.stringify(error); for(const key of ['allocatedAmount','allocationWeight','taxImpactAmount','sourcePayload','laborAmount','internalCostRate']) check(!text.includes(key),'no-write-oracle-'+key); };
  const implementations = {};

  implementations['F44-01']=async()=>{
    base(); const value=await makeExpense(WITNESSES.ordinary.layers,'ordinary'), original=value.cost;
    const body=stageBody(original,sourceRef('expense-record',value.expense));
    await call('confirmCostStageAttribution',original.id,{...body,expectedVersion:version(original)+1},'full',409);
    await call('confirmCostStageAttribution',original.id,{...body,lockedBySnapshotId:randomUUID()},'full',422);
    await call('confirmCostStageAttribution',original.id,{...body,attributionEvidence:{...body.attributionEvidence,sourceVersion:version(value.expense)+1}},'full',409);
    await call('confirmCostStageAttribution',original.id,{...body,stageAttributionMode:'auto'},'full',422);
    const unchanged=await readCost(original.id); costState(unchanged,'registered',value.amounts); same(unchanged.rowVersion,original.rowVersion,'failed-stage-all-visible-state-unchanged'); same(list(await call('listCostStageAttributions',original.id)).length,0,'failed-stage-no-attribution');
    state.ordinary={...value,...await confirm(original,value.amounts,false,body)};
  };
  implementations['F44-02']=async()=>{
    const value=state.ordinary, old=value.stage, cost=await readCost(value.cost.id);
    const handover=await call('ProjectHandoverController_getProjectHandoverDetailByProject',project());
    requireContext(uuid(handover.handoverId)&&handover.projectId===project()&&handover.handoverStatus==='confirmed'&&typeof handover.confirmedAt==='string','actual-confirmed-D-handover');
    const businessDay=new Date(new Date(handover.confirmedAt).getTime()+8*60*60*1000).toISOString().slice(0,10); requireContext(businessDay===date(),'D-confirmed-HK-date-matches-cost'); requireContext(old.attributedStage!=='handover','distinct-real-reclassification-target');
    const body={newAttributedStage:'handover',expectedVersion:version(old),reclassifyReason:'按本次真实移交确认的日期及版本更正归属；保留原人工判断链',attributionEvidence:{kind:'source',sourceType:'project-handover',sourceId:handover.handoverId,sourceVersion:version(handover),businessDate:businessDay,reason:'真实D已确认移交事实，仅用于handover日期，不推断execution区间'}};
    await call('reclassifyCostStageAttribution',old.id,{...body,expectedVersion:version(old)+1},'full',409);
    const result=await call('reclassifyCostStageAttribution',old.id,body); receipt(result); same(result.supersedesAttributionId,old.id,'reclass-receipt-predecessor'); remember('CostStageAttributionSnapshot',result.targetId);
    const detail=await call('getCostStageAttribution',result.targetId), before=await call('getCostStageAttribution',old.id); same(before.status,'superseded','old-stage-superseded'); same(evidence(before.evidenceProjection).payloadHash,evidence(old.evidenceProjection).payloadHash,'old-stage-evidence-unchanged'); same(detail.supersedesId,old.id,'stage-chain'); same(detail.attributedStage,'handover','real-D-stage');
    const actualD=evidence(detail.evidenceProjection);same(actualD.sourceReferences[0].sourceId,handover.handoverId,'F-evidence-bound-to-real-D-id');same(actualD.sourceReferences[0].sourceVersion,handover.rowVersion,'F-evidence-bound-to-real-D-version');same(detail.evidenceBusinessDate,businessDay,'F-evidence-HK-date');
    const after=await readCost(cost.id); costState(after,'confirmed',value.amounts); same(after.rowVersion,cost.rowVersion+1,'reclass-one-cost-version'); same(after.confirmedAt,cost.confirmedAt,'original-confirmation-time-retained'); same(after.confirmedBy,cost.confirmedBy,'original-confirming-actor-retained'); same(after.stageDerivedFromId,detail.id,'current-stage-pointer');
    const history=list(await call('listCostStageAttributions',cost.id)); same(history.length,2,'two-real-stage-versions'); same(history.filter(r=>r.status==='active').length,1,'unique-current-stage'); state.ordinary={...value,cost:after,stage:detail};
  };
  implementations['F44-03']=async()=>{
    const value=state.ordinary, before=await readCost(value.cost.id), type=`R4F44-${context.tag}-ordinary`;
    const body=taxBody(type,[sourceRef('expense-record',value.expense,reason())]);
    await call('confirmAccountingTaxTreatment',project(),{...body,taxPendingFlag:false},'full',422);
    await call('confirmAccountingTaxTreatment',project(),{...body,currency:'USD'},'full',422);
    const created=await call('confirmAccountingTaxTreatment',project(),body); receipt(created); remember('AccountingTaxTreatmentSnapshot',created.targetId);
    let tax=await call('getAccountingTaxTreatment',created.targetId); checkTax(tax,'0.00','0.01'); same(tax.deductibilityStatus,'pending','pending-tax-fact'); same(tax.confirmedBy,actor('full').id,'real-finance-actor');
    const originalHash=evidence(tax.sourceEvidenceProjection).payloadHash; same(evidence(tax.sourceEvidenceProjection).sourceReferences[0].sourceId,value.expense.id,'real-tax-source-ID');
    const replacement={...taxBody(type,body.sourceReferences,true),replacementReason:reason(),expectedVersion:version(tax)};
    await call('replaceAccountingTaxTreatment',tax.id,{...replacement,expectedVersion:version(tax)+1},'full',409);
    const changed=await call('replaceAccountingTaxTreatment',tax.id,replacement); receipt(changed); same(changed.supersedesTaxTreatmentSnapshotId,tax.id,'tax-receipt-chain'); remember('AccountingTaxTreatmentSnapshot',changed.targetId);
    const current=await call('getAccountingTaxTreatment',changed.targetId), old=await call('getAccountingTaxTreatment',tax.id); checkTax(current,'-0.01','0.00'); same(current.supersedesId,tax.id,'tax-predecessor'); same(old.status,'superseded','old-tax-terminal'); same(evidence(old.sourceEvidenceProjection).payloadHash,originalHash,'old-tax-proof-immutable');
    const rows=list(await call('listAccountingTaxTreatments',project())).filter(r=>r.id===tax.id||r.id===current.id); same(rows.length,2,'tax-history-complete'); same(rows.filter(r=>r.status==='active').length,1,'one-active-tax-version');
    partials();hiddenTax(await call('getAccountingTaxTreatment',current.id,null,'financeOnly'));
    const after=await readCost(before.id); costState(after,'confirmed',value.amounts); same(after.rowVersion,before.rowVersion,'tax-does-not-rewrite-cost'); state.tax=current;
  };
  implementations['F44-04']=async()=>{
    const value=state.ordinary, cost=await readCost(value.cost.id), body=allocationBody([cost],WITNESSES.ordinary);
    await call('confirmSharedCostAllocationBasis',null,{...body,expectedSourceVersions:[{costRecordId:cost.id,expectedVersion:version(cost)+1}]},'full',409);
    const wrong=clone(body); wrong.projectShareItems[0].allocatedAmount='0.05'; await call('confirmSharedCostAllocationBasis',null,wrong,'full',422);
    const made=await call('confirmSharedCostAllocationBasis',null,body); receipt(made); remember('SharedCostAllocationBasis',made.basisId); const basis=await call('getSharedCostAllocationBasis',made.basisId), rows=checkAllocation(basis,WITNESSES.ordinary); same(list(await call('listSharedCostAllocationResults',basis.id)).length,2,'results-list');
    const anchor=rows.find(r=>r.projectId===targets()[0]), replacement={expectedVersion:version(anchor),expectedBasisVersion:version(basis),projectShareItems:shareItems(WITNESSES.ordinary.replacement),replacementReason:'完整两项目份额按明确1:4权重替代，来源仍为真实0.12'};
    await call('replaceSharedCostAllocationResult',anchor.id,{...replacement,expectedBasisVersion:version(basis)+1},'full',409);
    const bad=clone(replacement); bad.projectShareItems[0].allocatedAmount='0.03'; await call('replaceSharedCostAllocationResult',anchor.id,bad,'full',422);
    const changed=await call('replaceSharedCostAllocationResult',anchor.id,replacement); receipt(changed); same(changed.supersedesBasisId,basis.id,'whole-basis-replaced'); same(changed.allocationResultIds.length,2,'whole-replacement-receipt'); remember('SharedCostAllocationBasis',changed.basisId);
    const next=await call('getSharedCostAllocationBasis',changed.basisId), current=checkAllocation(next,WITNESSES.ordinary,'replacement'), historical=await call('getSharedCostAllocationBasis',basis.id); checkAllocation(historical,WITNESSES.ordinary); same(historical.status,'superseded','old-basis-terminal'); for(const row of historical.results)same(row.status,'superseded','all-old-results-terminal');
    for(const row of current)same(row.supersedesId,rows.find(old=>old.projectId===row.projectId).id,'each-project-real-predecessor'); same(next.supersedesId,basis.id,'new-basis-chain');
    state.ordinaryAllocation={basis:next,rows:current,oldBasis:historical};
  };
  implementations['F44-05']=async()=>{
    const value=state.ordinary, before=await readCost(value.cost.id), history=list(await call('listCostStageAttributions',before.id));
    await call('reclassifyCostStageAttribution',value.stage.id,{newAttributedStage:assessment().attributedStage,expectedVersion:version(value.stage),reclassifyReason:'试图改动已分摊源，应拒绝而不覆盖历史',attributionEvidence:manual()},'full',409);
    const after=await readCost(before.id); same(after.rowVersion,before.rowVersion,'allocated-source-version-locked'); same(after.stageLockedAt,before.stageLockedAt,'allocated-stage-lock-preserved'); same(list(await call('listCostStageAttributions',before.id)).length,history.length,'no-reclass-remnant'); costState(after,'confirmed',value.amounts);
  };
  implementations['F44-06']=async()=>{
    base(); const ordinary=await makeExpense(['0.02','0.00','0.02'],'mixed-known'); const ordinaryConfirmed=await confirm(ordinary.cost,ordinary.amounts); ordinary.cost=ordinaryConfirmed.cost;
    const role=`R4F44-${context.tag}-cent`, published=await call('publishInternalCostRateVersion',null,{rateScopeType:'role',roleCode:role,rateUnit:'hour',rateValue:'0.5000',currency:'CNY',effectiveFrom:date(),changeReason:'隔离验收真实发布四位率，按两位工时精确得到一分'}); remember('InternalCostRateVersion',published.targetId);
    const created=await call('createProjectActualCostRecord',project(),{costType:'labor',laborRole:role,laborPeriodType:'month',laborPeriodStart:date(),laborPeriodEnd:date(),actualHours:'0.02',rateVersionId:published.targetId,workSummary:'真实published rate × 0.02 hours = 0.01',costDescription:`R4F44-${context.tag}-protected-labor`,attachmentIds:[]});
    let labor=await readCost(remember('ProjectActualCostRecord',created.targetId)); costState(labor,'registered',['0.01','0.00','0.01'],true); field(labor.laborSensitiveProjection.internalCostRate,'0.5000'); field(labor.laborSensitiveProjection.laborAmount,'0.01');
    const body=stageBody(labor); for(const key of partials())noHints(await call('confirmCostStageAttribution',labor.id,body,key,403));
    same((await readCost(labor.id)).rowVersion,labor.rowVersion,'denied-labor-stage-not-written'); const confirmed=await confirm(labor,['0.01','0.00','0.01'],true); labor=confirmed.cost;
    for(const key of partials()){ hiddenStage(await call('getCostStageAttribution',confirmed.stage.id,null,key)); for(const row of list(await call('listCostStageAttributions',labor.id,null,key)))hiddenStage(row); }
    state.mixed={ordinary,labor,stage:confirmed.stage};
  };
  implementations['F44-07']=async()=>{
    const value=state.mixed, body=allocationBody([value.ordinary.cost,value.labor],WITNESSES.mixed);
    // Independently expose only each actor's permitted component, then still
    // require the derived mixed total/weights/ratios to remain fully masked.
    const known=await call('getProjectActualCostRecordDetail',value.ordinary.cost.id,null,'operatingOnly'); field(known.financialProjection.amountIncludingTax,'0.02');
    const protectedOwn=await call('getProjectActualCostRecordDetail',value.labor.id,null,'laborOnly'); field(protectedOwn.laborSensitiveProjection.laborAmount,'0.01');
    for(const key of partials()){ const invalid=clone(body); invalid.projectShareItems[0].allocatedAmount='0.99'; noHints(await call('confirmSharedCostAllocationBasis',null,invalid,key,403)); }
    const made=await call('confirmSharedCostAllocationBasis',null,body); receipt(made); remember('SharedCostAllocationBasis',made.basisId); const basis=await call('getSharedCostAllocationBasis',made.basisId), rows=checkAllocation(basis,WITNESSES.mixed); const anchor=rows.find(r=>r.projectId===targets()[0]);
    const replacement={expectedVersion:version(anchor),expectedBasisVersion:version(basis),projectShareItems:shareItems(WITNESSES.mixed.replacement),replacementReason:'真实mixed来源完整两项目替代，不能通过少一项敏感授权反推人工金额'};
    for(const key of partials()){ hiddenBasis(await call('getSharedCostAllocationBasis',basis.id,null,key)); for(const row of list(await call('listSharedCostAllocationResults',basis.id,null,key))){noRaw(row);field(row.financialProjection,undefined,true);} const invalid=clone(replacement);invalid.projectShareItems[0].allocatedAmount='0.99';noHints(await call('replaceSharedCostAllocationResult',anchor.id,invalid,key,403)); }
    const changed=await call('replaceSharedCostAllocationResult',anchor.id,replacement); receipt(changed); remember('SharedCostAllocationBasis',changed.basisId); const next=await call('getSharedCostAllocationBasis',changed.basisId);checkAllocation(next,WITNESSES.mixed,'replacement');
    for(const key of partials()){hiddenBasis(await call('getSharedCostAllocationBasis',basis.id,null,key));hiddenBasis(await call('getSharedCostAllocationBasis',next.id,null,key));}
    state.mixedAllocation=next;
  };
  implementations['F44-08']=async()=>{
    const value=state.mixed, type=`R4F44-${context.tag}-mixed`, refs=[sourceRef('project-actual-cost-record',value.labor,reason()),sourceRef('project-actual-cost-record',value.ordinary.cost,reason())];
    const body={...taxBody(type,refs),deductibilityStatus:'deductible',taxPendingFlag:false,taxImpactAmount:'0.00',taxImpactPendingAmount:'0.00'};
    for(const key of partials())noHints(await call('confirmAccountingTaxTreatment',project(),{...body,taxImpactPendingAmount:'0.01'},key,403));
    const made=await call('confirmAccountingTaxTreatment',project(),body); receipt(made); remember('AccountingTaxTreatmentSnapshot',made.targetId); const tax=await call('getAccountingTaxTreatment',made.targetId); checkTax(tax,'0.00','0.00');
    const replaceBody={...body,sourceReferences:[refs[1]],expectedVersion:version(tax),replacementReason:reason()};
    for(const key of partials())noHints(await call('replaceAccountingTaxTreatment',tax.id,{...replaceBody,taxImpactPendingAmount:'0.01'},key,403));
    const oldHash=evidence(tax.sourceEvidenceProjection).payloadHash;
    const changed=await call('replaceAccountingTaxTreatment',tax.id,replaceBody); receipt(changed); remember('AccountingTaxTreatmentSnapshot',changed.targetId); const next=await call('getAccountingTaxTreatment',changed.targetId);same(next.supersedesId,tax.id,'mixed-tax-real-history');same(next.status,'active','mixed-tax-current-active');checkTax(next,'0.00','0.00');
    for(const key of partials()){hiddenTax(await call('getAccountingTaxTreatment',tax.id,null,key));hiddenTax(await call('getAccountingTaxTreatment',next.id,null,key));const history=list(await call('listAccountingTaxTreatments',project(),null,key)).filter(r=>r.id===tax.id||r.id===next.id);same(history.length,2,'both-tainted-tax-versions-visible-as-masked');history.forEach(hiddenTax);noHints(await call('replaceAccountingTaxTreatment',next.id,{...replaceBody,expectedVersion:version(next)},key,403));}
    const historical=await call('getAccountingTaxTreatment',tax.id);same(historical.status,'superseded','mixed-old-tax-terminal');same(evidence(historical.sourceEvidenceProjection).payloadHash,oldHash,'mixed-old-proof-unchanged');same(list(await call('listAccountingTaxTreatments',project())).filter(r=>r.taxTreatmentType===type).length,2,'denied-tax-writes-have-no-extra-public-history');
    costState(await readCost(value.labor.id),'confirmed',['0.01','0.00','0.01'],true);costState(await readCost(value.ordinary.cost.id),'confirmed',value.ordinary.amounts);
  };
  implementations['F44-09']=async()=>{
    base(); const value=await makeExpense(WITNESSES.grossOnly.layers,'unknown-net-tax'); const confirmed=await confirm(value.cost,value.amounts); const body=allocationBody([confirmed.cost],WITNESSES.grossOnly);
    await call('confirmSharedCostAllocationBasis',null,{...body,measurementBasis:'excluding-tax'},'full',422);
    const made=await call('confirmSharedCostAllocationBasis',null,body);receipt(made);remember('SharedCostAllocationBasis',made.basisId);checkAllocation(await call('getSharedCostAllocationBasis',made.basisId),WITNESSES.grossOnly);costState(await readCost(confirmed.cost.id),'confirmed',value.amounts);
  };
  implementations['F44-10']=async()=>{
    base(); const maximum=WITNESSES.maximum.layers[0]; requireContext(typeof context.costCategory==='string'&&context.costCategory.length>0,'actual-payable-cost-category');
    const payable=await call(C+'createPayable',project(),{contractId:context.activeContract.id,vendorName:`R4F44-${context.tag}-MAX`,costCategory:context.costCategory,payableDescription:'隔离验收18,2容量上限，实际承诺来源；合同金额不当成本预算',currency:'CNY',amountExcludingTax:maximum,taxAmount:'0.00',amountIncludingTax:maximum,expectedPaymentDate:date(),evidenceSummary:'真实C API承诺源，不宣称已付款或included',attachmentCount:0});remember('PayableRecord',idOf(payable));
    const actual=await call(C+'getPayable',payable.id); same(actual.amountExcludingTax,maximum,'C-max-net-string');same(actual.amountIncludingTax,maximum,'C-max-gross-string');same(actual.taxAmount,'0.00','C-explicit-zero-tax');same(actual.status,'recorded','C-no-fake-payment');
    const created=await call('createProjectActualCostRecord',project(),{costType:'procurement',payableRecordId:actual.id,expectedSourceVersion:version(actual),costDescription:'真实MAX采购承诺逐字继承，不改经营纳入口径'});const registered=await readCost(remember('ProjectActualCostRecord',created.targetId));costState(registered,'registered',WITNESSES.maximum.layers);
    const confirmed=await confirm(registered,WITNESSES.maximum.layers,false,stageBody(registered,sourceRef('payable-record',actual)));
    const made=await call('confirmSharedCostAllocationBasis',null,allocationBody([confirmed.cost],WITNESSES.maximum));receipt(made);remember('SharedCostAllocationBasis',made.basisId);const view=await call('getSharedCostAllocationBasis',made.basisId);checkAllocation(view,WITNESSES.maximum);const source=packet(view.financialProjection).sourceCostRecords.find(r=>r.costRecordId===confirmed.cost.id);check(source,'actual-max-F-source');same(source.sourceId,actual.id,'C-E-F-real-source-identity');same(source.amountExcludingTax,maximum,'F-max-source-net-string');same(source.amountIncludingTax,maximum,'F-max-source-gross-string');costState(await readCost(confirmed.cost.id),'confirmed',WITNESSES.maximum.layers);
  };
  implementations['F44-11']=async()=>{
    base();const decision=context.allocationPolicyDecision;
    requireContext(decision?.id==='selected-measurement-first'&&decision.version===2&&typeof decision.authorityReceipt==='string'&&!decision.authorityReceipt.startsWith('REQUIRED'),'Root-frozen-reviewed-F46-policy-required');
    const value=await makeExpense(WITNESSES.mainPriority.layers,'selected-primary-counterexample'), confirmed=await confirm(value.cost,value.amounts);
    const made=await call('confirmSharedCostAllocationBasis',null,allocationBody([confirmed.cost],WITNESSES.mainPriority));receipt(made);remember('SharedCostAllocationBasis',made.basisId);
    const basis=await call('getSharedCostAllocationBasis',made.basisId),rows=checkAllocation(basis,WITNESSES.mainPriority),anchor=rows.find(r=>r.projectId===targets()[0]);
    const replacement={expectedVersion:version(anchor),expectedBasisVersion:version(basis),projectShareItems:shareItems(WITNESSES.mainPriority.replacement),replacementReason:'用户明确gross主层优先，完整新批仍按0.06/0.06，旧批证据不改写'};
    const changed=await call('replaceSharedCostAllocationResult',anchor.id,replacement);receipt(changed);remember('SharedCostAllocationBasis',changed.basisId);const next=await call('getSharedCostAllocationBasis',changed.basisId);checkAllocation(next,WITNESSES.mainPriority,'replacement');same(next.supersedesId,basis.id,'policy-whole-batch-chain');
    const old=await call('getSharedCostAllocationBasis',basis.id);checkAllocation(old,WITNESSES.mainPriority);same(old.status,'superseded','policy-old-batch-historical');costState(await readCost(confirmed.cost.id),'confirmed',value.amounts);
  };
  return {
    manifest(){return {kind:'F44-request-only-single-use-candidate',cases:describeFAcceptance44(),f12Operations:Object.keys(OPERATIONS).filter(k=>OPERATIONS[k].group==='F'),sourcePins:SOURCE_PINS,sourcePinMeaning:'Frozen author inputs; Root must bind the same actual F46 deployment before policy certification',witnesses:WITNESSES,allRuntimeStatus:'not-run-until-real-request-callback',publicDtoOrProductChanges:false};},
    async run(){
      check(!invoked,'single-use-suite-cannot-replay-business-producers');invoked=true;requireContext(typeof request==='function','real-request-callback-required');
      for(const item of cases){const blocked=item.dependsOn.find(id=>byId.get(id).status!=='passed');if(blocked){item.reason='dependency-not-passed:'+blocked;continue;}active=item;step=0;try{await implementations[item.id]();item.status='passed';}catch(error){item.status=error instanceof MissingContext?'needs-context':'failed';item.reason=error.code??'request-or-assertion-failed';}}
      const called=new Set(cases.flatMap(c=>c.requests.filter(r=>r.status==='passed'&&r.httpStatus<300).map(r=>r.operationId)));
      return {kind:'F44-actual-request-callback-result',cases,resources,counts:{passed:cases.filter(c=>c.status==='passed').length,failed:cases.filter(c=>c.status==='failed').length,needsContext:cases.filter(c=>c.status==='needs-context').length,notRun:cases.filter(c=>c.status==='not-run').length,httpRequests:cases.reduce((n,c)=>n+c.requests.length,0)},f12SuccessfulCoverage:Object.keys(OPERATIONS).filter(k=>OPERATIONS[k].group==='F').map(operationId=>({operationId,status:called.has(operationId)?'actual-success-response-observed':'not-run-or-failed'})),notCertifiedHere:['PG private evidence/policy/hash verification','atomic rollback/fault injection/concurrency (fault32)','independent G3/G4','economic-event dedup/INCLUDED/operating17','F46 source/deployment attestation and private v2 policy tag require separate Root evidence; nonambiguous cases alone do not certify main-layer semantics']};
    },
  };
}
