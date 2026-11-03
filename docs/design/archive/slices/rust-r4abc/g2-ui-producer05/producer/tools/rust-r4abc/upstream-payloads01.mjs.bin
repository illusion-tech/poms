// Pure factories only: no imports, I/O, environment, HTTP or execution harness.
const id = (value, label) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error(`${label} requires an actual returned UUID`);
  return value.toLowerCase();
};
const rowId = (row, label) => id(row?.id, label);
const version = row => { if (!Number.isSafeInteger(row?.rowVersion) || row.rowVersion < 1) throw new Error('Fresh rowVersion required'); return row.rowVersion; };
const tag = context => { if (typeof context.tag !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(context.tag)) throw new Error('A fresh bounded case tag is required'); return context.tag; };
const suppliedText = (value, label) => { if (typeof value !== 'string' || !value.length) throw new Error(`${label} must be supplied explicitly`); return value; };
const request = (operationId, method, path, body, bind) => ({ operationId, method, path, body, bind });

export function contractTerms(context) {
  return {
    contractId: rowId(context.contract, 'contract'),
    amountTaxInclusive: context.contractInclusive ?? '56500.00',
    amountTaxExclusive: context.contractExclusive ?? '50000.00',
    taxRate: '0.1300', downPaymentRate: '1.0000', retentionRate: '0.0000',
    retentionDueDate: null, paymentTerms: '验收前按合同约定支付全部合同款。',
    receivablePlanSeeds: [{ nodeKey: 'full-payment', label: '合同付款', plannedAmount: context.contractInclusive ?? '56500.00',
      plannedDate: suppliedText(context.plannedDate, 'plannedDate'), isRetentionNode: false, sortOrder: 0, note: null }],
  };
}

export function customer(context) {
  return request('CustomerController_create', 'POST', '/api/customers', {
    displayName: `R4-${tag(context)}-客户`, ownerUserId: id(context.actorId, 'actor'),
    ...(context.ownerOrgId ? { ownerOrgId: id(context.ownerOrgId, 'owner organization') } : {}),
    sourceChannel: 'r4-actual-owned-producer',
  }, 'customer.id');
}

export function project(context) {
  return request('ProjectController_create', 'POST', '/api/projects', {
    projectName: `R4-${tag(context)}-项目`, customerId: rowId(context.customer, 'customer'),
    customerProjectNo: `R4-${tag(context)}`, currentStage: 'commercial-closure',
  }, 'project.id / project.rowVersion');
}

export function cost(context) {
  return request('ProjectController_createProjectTechnicalCostPackage', 'POST', `/api/projects/${rowId(context.project, 'project')}/technical-cost-packages`, {
    technicalFeasibilityDecision: 'feasible', technicalConclusionSummary: '本case技术范围可交付。', allowNextStage: true,
    currencyCode: 'CNY', taxAssumptionSummary: '成本含税额56500.00=未税50000.00+税6500.00。', taxReviewStatus: 'reviewed',
    scopeItems: [], riskItems: [], costItems: [{ costCategory: 'implementation', costDescription: '本case已估算实施成本',
      estimationBasis: '本case明确估算基数', amountExcludingTax: '50000.00', taxCostAmount: '6500.00', amountIncludingTax: '56500.00',
      currencyCode: 'CNY', confidenceLevel: 'high', highUncertainty: false, sortOrder: 0 }],
  }, 'cost.id / cost.version / cost.rowVersion');
}

export function bid(context, mode = 'direct') {
  const identity = mode === 'won' ? { bidMode: 'public-tender', currentStage: 'result-confirmed', decision: 'participate', resultStatus: 'won' }
    : mode === 'not-required' ? { bidMode: 'not-required', currentStage: 'result-confirmed', decision: 'not-required', resultStatus: 'not-applicable' }
    : mode === 'direct' ? { bidMode: 'direct-commercial', currentStage: 'negotiating', decision: 'participate', resultStatus: 'pending' }
    : null;
  if (!identity) throw new Error('Explicit direct / not-required / won mode required; no decision aliases');
  return request('ProjectController_createProjectBidCommercialProcess', 'POST', `/api/projects/${rowId(context.project, 'project')}/bid-commercial-processes`, {
    ...identity, processSummary: `R4-${tag(context)}真实商务过程`, decisionSummary: '通过实际R3命令登记本case决定。',
    resultSummary: mode === 'won' ? '本case真实中标结果。' : '沿真实直接商务放行，不虚构中标。', materialItems: [], timelineItems: [],
  }, 'bid.id / bid.version / bid.rowVersion');
}

export function draftContract(context) {
  return request('ContractController_create', 'POST', '/api/contracts', {
    projectId: rowId(context.project, 'project'), customerContractNo: `R4-${tag(context)}-合同`,
    signedAmount: context.contractInclusive ?? '56500.00', currencyCode: 'CNY',
  }, 'contract.id / contract.rowVersion / contract.contractNo');
}

export function baseline(context) {
  return request('ContractReadinessController_createCommercialReleaseBaseline', 'POST', '/api/commercial-release-baselines', {
    projectId: rowId(context.project, 'project'), baselineCode: `R4-${tag(context)}-base`, contractTerms: [contractTerms(context)],
    amountTaxInclusive: '113000.00', amountTaxExclusive: '100000.00', taxRate: '0.1300',
    downPaymentRate: '1.0000', retentionRate: '0.0000', paymentTerms: '项目商业来源；各合同金额与节点独立。',
  }, 'baseline.id / baseline.rowVersion; baselineStatus=draft (not qualification)');
}

export function summaryRequest(context) {
  const caseId = context.caseId ?? tag(context);
  if (typeof caseId !== 'string' || !/^[a-zA-Z0-9_-]{1,16}$/.test(caseId)) throw new Error('An explicit untruncated summary caseId1..16 is required');
  return {
    runId: id(context.runId, 'run'), caseId, actorId: id(context.actorId, 'actor'),
    expectedInstanceId: id(context.expectedInstanceId, 'actual Root marker'),
    projectId: rowId(context.project, 'project'), costPackageId: rowId(context.cost, 'cost'),
    baselineId: rowId(context.baseline, 'baseline'),
    fieldValues: { quoteVersion: `Q-${tag(context)}`, quoteAmountTaxInclusive: '113000.00', quoteAmountTaxExclusive: '100000.00', taxRate: '0.1300' },
  };
}

export function pricing(context, { mode = 'direct', condition = 'released' } = {}) {
  if (!['direct','not-required','won'].includes(mode) || !['released','open','closed','waived'].includes(condition)) throw new Error('Exact pricing path and condition variant required');
  const summary = context.summary;
  if (!summary?.outerCommitAcknowledged || !summary?.summarySnapshotId) throw new Error('Actual acknowledged internal summary receipt required');
  const conditions = condition === 'released' ? [] : [{ conditionKey: 'contracting-evidence', conditionType: 'approval', label: '本case合同材料条件',
    conditionSummary: '登记明确的合同材料条件，状态由实际R3命令保存。', conditionStatus: condition === 'open' ? 'open' : condition === 'waived' ? 'waived' : 'closed',
    requiredForContracting: true, resolutionSummary: condition === 'open' ? null : '本case明确条件处理结论。', sortOrder: 0 }];
  return request('ProjectController_createProjectPricingMarginReview', 'POST', `/api/projects/${rowId(context.project, 'project')}/pricing-margin-reviews`, {
    technicalCostPackageId: rowId(context.cost, 'cost'), bidCommercialProcessId: rowId(context.bid, 'bid'),
    commercialReleaseBaselineId: rowId(context.baseline, 'baseline'), pricingPath: mode === 'won' ? 'bid' : 'direct-commercial',
    quoteVersion: `Q-${tag(context)}`, currencyCode: 'CNY', quoteAmountTaxInclusive: '113000.00', quoteAmountTaxExclusive: '100000.00', taxRate: '0.1300',
    taxConditionSummary: '项目商业来源税率13%，四位可无损承接。', paymentTermsSummary: '各合同付款条款由独立referenceTerms明确。',
    grossMarginRate: '0.50000000', grossMarginBand: 'target', grossMarginSummary: '项目层毛利参考；不冒充合同成本分摊。',
    decision: condition === 'released' ? 'released' : 'conditional-release', decisionSummary: '真实R3放行事实，summary仅材料引用，不是审批通过证明。',
    approvalScenarioKey: summary.approvalScenarioKey, summaryPackageKey: summary.summaryPackageKey,
    summarySnapshotId: id(summary.summarySnapshotId, 'actual summary'), projectionLevel: summary.projectionLevel, exportPolicy: summary.exportPolicy,
    conditionItems: conditions,
  }, 'pricing.id / pricing.version / pricing.rowVersion / pricing.readyForContracting');
}

export function readiness(context, { lightReview = false } = {}) {
  const terms = contractTerms(context);
  if (lightReview) terms.receivablePlanSeeds[0].label = '合同付款（本case字段复核）';
  return request('ContractReadinessController_createContractReadinessPackage', 'POST', '/api/contract-readiness-packages', {
    projectId: rowId(context.project, 'project'), contractId: rowId(context.contract, 'contract'),
    sourceBaselineId: rowId(context.baseline, 'baseline'), candidateTerms: terms,
  }, 'readiness.id / readiness.rowVersion / readiness.latestDiffResultId / readiness.guardDecision');
}

export function reviewDiff(context) {
  const fields = [...new Set((context.diffHistory?.diffItems ?? []).map(item => item.fieldKey))];
  if (!fields.length) throw new Error('Read actual exact contract diff-history before required review');
  return request('ContractReadinessController_reviewDiff', 'POST', `/api/commercial-release-baselines/${rowId(context.baseline, 'baseline')}:reviewDiff`, {
    contractId: rowId(context.contract, 'contract'), diffResultId: id(context.readiness.latestDiffResultId, 'actual contract diff'),
    diffDecision: 'approved', reviewedFieldKeys: fields, attachmentIds: [], expectedVersion: version(context.baseline),
  }, 'reviewResult.diffResultId; reread baseline/current readiness versions');
}

export function prepare(context) {
  return request('ContractReadinessController_initializeContractSnapshot', 'POST', `/api/contract-readiness-packages/${rowId(context.readiness, 'readiness')}:initializeContractSnapshot`, {
    contractId: rowId(context.contract, 'contract'), contractReadinessPackageId: rowId(context.readiness, 'readiness'), expectedVersion: version(context.readiness),
  }, 'preparation.preparationId / preparation.preparationVersion; snapshotId=null');
}

export function submit(context) {
  return request('ContractController_submitReview', 'POST', `/api/contracts/${rowId(context.contract, 'contract')}:submitReview`, {
    preparationId: id(context.preparation.preparationId, 'actual preparation'), expectedVersion: version(context.contract), comment: '本case合同准备版本送审。',
  }, 'submitted.approvalRecordId / submitted.todoItemIds / submitted.preparationId');
}

export function decide(context, decision = 'approve') {
  if (!['approve','reject'].includes(decision)) throw new Error('Exact approve/reject command required');
  return request(decision === 'approve' ? 'ApprovalController_approveRecord' : 'ApprovalController_rejectRecord', 'POST',
    `/api/approval-records/${id(context.submitted.approvalRecordId, 'actual approval')}:${decision}`,
    { expectedVersion: version(context.approval), ...(decision === 'reject' ? { reason: '本case明确驳回，后续真实修订重提。' } : { comment: '本case实际指定审批人批准。' }) },
    'decision.businessStatusAfter; authenticate actual currentApproverUserId, not assumed actor');
}

export function activate(context) {
  return request('ContractController_activate', 'POST', `/api/contracts/${rowId(context.contract, 'contract')}:activate`, {
    expectedVersion: version(context.contract), comment: '本case按已审exact准备版本生效。',
  }, 'activated.snapshotId / activated.preparationId; reread contract/readiness');
}

export function plan(context) {
  return request('ContractReadinessController_initializeReceivablePlan', 'POST', `/api/contract-readiness-packages/${rowId(context.readiness, 'readiness')}:initializeReceivablePlan`, {
    contractId: rowId(context.contract, 'contract'), expectedVersion: version(context.readiness),
  }, 'plan.planVersionId / plan.initRecordId / plan.snapshotId');
}

export function receipt(context) {
  return request('ContractFinanceController_createReceipt', 'POST', `/api/contracts/${rowId(context.contract, 'active contract')}/receipt-records`, {
    receiptAmount: context.receiptAmount ?? '11300.00', receiptDate: suppliedText(context.instant, 'instant'), sourceType: 'manual',
  }, 'receipt.id / receipt.rowVersion');
}

export function confirmReceipt(context) {
  return request('ContractFinanceController_confirmReceipt','POST',`/api/receipt-records/${rowId(context.receipt,'receipt')}:confirm`,{
    expectedVersion:version(context.receipt),
  },'receipt confirmation; reread actual receipt');
}

export function payable(context) {
  return request('ContractFinanceController_createPayable','POST',`/api/projects/${rowId(context.project,'project')}/payable-records`,{
    contractId:rowId(context.contract,'active contract'),vendorName:`R4-${tag(context)}-供应商`,costCategory:'implementation',
    payableDescription:'本case真实采购承诺。',currency:'CNY',amountExcludingTax:'10000.00',taxAmount:'1300.00',amountIncludingTax:'11300.00',
    expectedPaymentDate:suppliedText(context.plannedDate, 'plannedDate'),
  },'payable.id / payable.rowVersion');
}

export function payment(context) {
  return request('ContractFinanceController_createPayment','POST',`/api/projects/${rowId(context.project,'project')}/payment-records`,{
    payableRecordId:rowId(context.payable,'payable'),currency:'CNY',amountExcludingTax:'10000.00',taxAmount:'1300.00',amountIncludingTax:'11300.00',
    paymentDate:suppliedText(context.instant, 'instant'),costCategory:'implementation',sourceType:'manual',
  },'payment.id / payment.rowVersion; contract inherited from actual payable');
}

export function invoice(context) {
  return request('ContractFinanceController_createInvoice','POST',`/api/projects/${rowId(context.project,'project')}/invoice-records`,{
    contractId:rowId(context.contract,'active contract'),invoiceType:'output',invoiceNumber:`R4-${tag(context)}-INV`,
    invoiceAmount:'11300.00',invoiceDate:suppliedText(context.plannedDate, 'plannedDate'),
  },'invoice.id / invoice.rowVersion');
}

export const readbacks = Object.freeze({
  contract: contract => `/api/contracts/${id(contract,'contract')}`,
  baseline: baseline => `/api/commercial-release-baselines/${id(baseline,'baseline')}`,
  currentReadiness: (project, contract) => `/api/projects/${id(project,'project')}/contract-readiness?contractId=${id(contract,'contract')}`,
  diffHistory: (baseline, contract) => `/api/commercial-release-baselines/${id(baseline,'baseline')}/diff-history?contractId=${id(contract,'contract')}`,
  approval: approval => `/api/approval-records/${id(approval,'approval')}`,
});
