// H lead14: pure Native witness constructors only; never executed by author.
// Current schema/controller: shared-contracts.ts:2559-2790; lead.controller.ts.
// Root supplies real active customer, active lead-source code, actor and org IDs.
// No placeholder UUID, schema import, HTTP, DB, clock or environment operation.

export function minimalCreateLeadRequest(customerId, sourceCode, overrides = {}) {
    return {
        leadName: 'H Native 线索',
        customerId,
        sourceCode,
        demandDescription: '客户需要确认设备范围与预算。',
        budgetStatus: 'unknown',
        urgency: 'normal',
        ...overrides,
    };
}

export function qualificationReadyLeadRequest({ customerId, sourceCode, ownerUserId, ownerOrgId, overrides = {} }) {
    return minimalCreateLeadRequest(customerId, sourceCode, {
        leadName: 'H Native 可确认线索',
        demandDescription: '客户已确认设备建设目标、项目范围、预算来源及下一步沟通安排。',
        budgetStatus: 'budget-confirmed',
        estimatedAmount: '1200000.00',
        urgency: 'high',
        expectedDecisionDate: '2026-11-20',
        ...(ownerUserId === undefined ? {} : { ownerUserId }),
        ...(ownerOrgId === undefined ? {} : { ownerOrgId }),
        ...overrides,
    });
}

export function publicPoolLeadRequest(customerId, sourceCode, overrides = {}) {
    return minimalCreateLeadRequest(customerId, sourceCode, { ownerUserId: null, ...overrides });
}

export function updateLeadRequest(overrides = {}) {
    return { demandDescription: '客户已补充新的设备需求说明。', ...overrides };
}

export function claimLeadRequest(expectedVersion) {
    return expectedVersion === undefined ? {} : { expectedVersion };
}

export function assignLeadRequest(ownerUserId, expectedVersion, overrides = {}) {
    return {
        ownerUserId,
        reason: 'H Native 调整销售主责。',
        ...(expectedVersion === undefined ? {} : { expectedVersion }),
        ...overrides,
    };
}

export function qualifyLeadRequest(qualificationSummary = '客户需求、预算、金额和责任归口已经确认。') {
    return { qualificationSummary };
}

export function closeLeadRequest(closedReason = '客户暂缓本次采购。') {
    return { closedReason };
}

export function convertLeadRequest(overrides = {}) {
    return {
        projectName: 'H Native 正式项目',
        customerProjectNo: 'H-NATIVE-PROJECT',
        plannedSignAt: '2026-11-20T00:00:00.123Z',
        ...overrides,
    };
}

export function submitScoreOverrideRequest(expectedLeadRowVersion, overrides = {}) {
    return { score: 85, reason: '客户已确认新增关键事实，申请人工评估。', expectedLeadRowVersion, ...overrides };
}

export function approveScoreOverrideRequest(expectedOverrideRowVersion, overrides = {}) {
    return { expectedOverrideRowVersion, note: '已核实人工评估依据。', ...overrides };
}

export function rejectScoreOverrideRequest(expectedOverrideRowVersion, overrides = {}) {
    return { reason: '现有依据不足以支持人工调整。', expectedOverrideRowVersion, ...overrides };
}

export function revokeScoreOverrideRequest(expectedOverrideRowVersion, overrides = {}) {
    return { reason: '人工调整依据已失效，恢复系统评分。', expectedOverrideRowVersion, ...overrides };
}

export function leadListQuery(overrides = {}) {
    return { scope: 'all', page: '1', pageSize: '500', ...overrides };
}
