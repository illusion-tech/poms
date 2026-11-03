// Independent literal expectations for the four archived constructor modes.
// No archived builder import, execution, clock or environment access.
import { FIXTURE_ARGUMENTS } from './e1-registry01.mjs';

export const expectedCost = {
    technicalFeasibilityDecision: 'feasible',
    technicalConclusionSummary: 'G1 技术方案可行。',
    allowNextStage: true,
    currencyCode: 'CNY',
    taxAssumptionSummary: 'G1 设备成本含税测算，税务已复核。',
    taxReviewStatus: 'reviewed',
    scopeItems: [{ scopeType: 'in-scope', label: 'G1 设备交付', description: '包含一项设备供货。', sortOrder: 1 }],
    riskItems: [{ riskCategory: 'G1 供货', riskLevel: 'R1', riskDescription: '供货周期已经核实。', impactScope: '设备供货范围。', mitigationPlan: '按已核实周期交付。', ownerRole: '售前', riskStatus: 'closed', blocksNextStage: false, sortOrder: 1 }],
    costItems: [{ costCategory: 'equipment', costDescription: 'G1 设备成本', estimationBasis: 'G1 已确认询价。', amountExcludingTax: '100.00', taxCostAmount: '13.00', amountIncludingTax: '113.00', currencyCode: 'CNY', confidenceLevel: 'high', highUncertainty: false, sortOrder: 1 }],
};

const commonPricing = {
    technicalCostPackageId: FIXTURE_ARGUMENTS.costId,
    currencyCode: 'CNY',
    quoteAmountTaxInclusive: '226.00',
    quoteAmountTaxExclusive: '200.00',
    taxRate: '0.13',
    taxConditionSummary: 'G1 报价税务条件已记录。',
    paymentTermsSummary: 'G1 按约定节点回款。',
    grossMarginBand: 'not-calculated',
    grossMarginSummary: 'G1 毛利判断待评审。',
    decision: 'pending',
    decisionSummary: 'G1 待形成评审结论。',
    conditionItems: [{ conditionKey: 'g1-payment-review', conditionType: 'payment', label: 'G1 回款条件确认', conditionSummary: '核实已记录的回款节点。', conditionStatus: 'open', requiredForContracting: false, responsibleRole: '财务', dueAt: '2026-11-02T00:00:00.000Z', resolutionSummary: null, sortOrder: 1 }],
};

export const expectedDirectPricing = { ...commonPricing, bidCommercialProcessId: null, pricingPath: 'direct-commercial', quoteVersion: 'Q-G1-DIRECT-01' };
export const expectedBidPricing = { ...commonPricing, bidCommercialProcessId: FIXTURE_ARGUMENTS.bidId, pricingPath: 'bid', quoteVersion: 'Q-G1-BID-01' };

export const expectedBidWithChildren = {
    bidMode: 'public-tender',
    decision: 'participate',
    resultStatus: 'pending',
    currentStage: 'preparation',
    processSummary: 'E1-replay01 process',
    decisionSummary: 'E1-replay01 decision',
    resultSummary: null,
    tenderNo: 'E1-replay01 tender',
    bidPackageNo: 'E1-replay01 package',
    ownerRole: 'E1-replay01 owner',
    materialItems: [
        { materialKey: 'E1-replay01 material', label: 'E1-replay01 material label', materialStatus: 'in-progress', responsibleRole: 'E1-replay01 material owner', dueAt: '2026-11-03T08:00:00.123Z', blocksNextStep: true, navigationHint: FIXTURE_ARGUMENTS.navigationHint, sortOrder: 1 },
        { materialKey: 'E1-replay01 ready material', label: 'E1-replay01 ready material label', materialStatus: 'ready', responsibleRole: null, dueAt: null, blocksNextStep: false, navigationHint: null, sortOrder: 2 },
    ],
    timelineItems: [
        { eventKey: 'E1-replay01 completed event', label: 'E1-replay01 completed event label', summary: 'E1-replay01 completed event summary', timelineStatus: 'done', occurredAt: '2026-11-02T02:00:00.456Z', dueAt: '2026-11-02T03:00:00.000Z', responsibleRole: 'E1-replay01 event owner', sortOrder: 1 },
        { eventKey: 'E1-replay01 pending event', label: 'E1-replay01 pending event label', summary: null, timelineStatus: 'pending', occurredAt: null, dueAt: '2026-11-04T08:00:00.000Z', responsibleRole: null, sortOrder: 2 },
    ],
};
