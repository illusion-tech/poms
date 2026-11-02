/**
 * R3C #88 / R3G #92: pure Native witness request definitions only.
 * No schema import, validation, API, database, environment or execution code.
 * Sources: shared-contracts.ts:4622-4683,5050-5093;
 * project.controller.ts:298-315; project.service.ts:557-765,793-849;
 * original pricing UI builder: project-pricing-margin-workspace.ts:1046-1088.
 * Root supplies real producer IDs. No placeholder UUID is silently invented.
 * Overrides are shallow and intended for Root's separately controlled cases.
 */

export const STABLE_CONDITION_DUE_AT = '2026-11-02T00:00:00.000Z';

/** Required cost fields plus one deterministic scope, risk and cost child. */
export function buildCostRequest(overrides = {}) {
    return {
        technicalFeasibilityDecision: 'feasible',
        technicalConclusionSummary: 'G1 技术方案可行。',
        allowNextStage: true,
        currencyCode: 'CNY',
        taxAssumptionSummary: 'G1 设备成本含税测算，税务已复核。',
        taxReviewStatus: 'reviewed',
        scopeItems: [
            {
                scopeType: 'in-scope',
                label: 'G1 设备交付',
                description: '包含一项设备供货。',
                sortOrder: 1,
            },
        ],
        riskItems: [
            {
                riskCategory: 'G1 供货',
                riskLevel: 'R1',
                riskDescription: '供货周期已经核实。',
                impactScope: '设备供货范围。',
                mitigationPlan: '按已核实周期交付。',
                ownerRole: '售前',
                riskStatus: 'closed',
                blocksNextStage: false,
                sortOrder: 1,
            },
        ],
        costItems: [
            {
                costCategory: 'equipment',
                costDescription: 'G1 设备成本',
                estimationBasis: 'G1 已确认询价。',
                amountExcludingTax: '100.00',
                taxCostAmount: '13.00',
                amountIncludingTax: '113.00',
                currencyCode: 'CNY',
                confidenceLevel: 'high',
                highUncertainty: false,
                sortOrder: 1,
            },
        ],
        ...overrides,
    };
}

/**
 * Pending decision deliberately needs no commercial-baseline/summary FK setup.
 * costId must come from this project's actual current cost producer.
 * bid path needs bidId from this project's actual current bid producer with a
 * supported result; direct path may pass null and uses Native's no-reference rule.
 */
export function buildPricingRequest({
    costId,
    bidId = null,
    pricingPath = 'direct-commercial',
    overrides = {},
}) {
    return {
        technicalCostPackageId: costId,
        bidCommercialProcessId: bidId,
        pricingPath,
        quoteVersion: 'Q-G1-01',
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
        conditionItems: [
            {
                conditionKey: 'g1-payment-review',
                conditionType: 'payment',
                label: 'G1 回款条件确认',
                conditionSummary: '核实已记录的回款节点。',
                conditionStatus: 'open',
                requiredForContracting: false,
                responsibleRole: '财务',
                dueAt: STABLE_CONDITION_DUE_AT,
                resolutionSummary: null,
                sortOrder: 1,
            },
        ],
        ...overrides,
    };
}

/** Direct-commercial example: current cost, deliberately no bid reference. */
export function buildDirectPricingRequest(costId, overrides = {}) {
    return buildPricingRequest({
        costId,
        bidId: null,
        pricingPath: 'direct-commercial',
        overrides: { quoteVersion: 'Q-G1-DIRECT-01', ...overrides },
    });
}

/** Bid example: actual current cost and bid references, pending decision. */
export function buildBidPricingRequest(costId, bidId, overrides = {}) {
    return buildPricingRequest({
        costId,
        bidId,
        pricingPath: 'bid',
        overrides: { quoteVersion: 'Q-G1-BID-01', ...overrides },
    });
}

/** Both request examples remain parameterized; this function has no side effects. */
export function buildPricingExamples(costId, bidId) {
    return {
        direct: buildDirectPricingRequest(costId),
        bid: buildBidPricingRequest(costId, bidId),
    };
}
