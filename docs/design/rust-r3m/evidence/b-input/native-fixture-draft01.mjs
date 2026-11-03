/**
 * RUST-R3I pure Native witness request definitions; never executed by author B.
 * No schema import/validation, API, DB, process, environment or product logic.
 * Sources: shared-contracts.ts:3076-3088,3201-3367;
 * sales-intelligence.controller.ts:76-237; service.ts:162-495.
 * Root supplies real Customer/Lead/Project IDs and #90 contact producer IDs.
 * This file neither creates contacts nor invents a placeholder UUID.
 * UUID spelling and explicit null/undefined are intentionally not normalized.
 * Plain short marker strings keep examples within the original text bounds.
 */

export function buildOpportunityQuery({ leadId, projectId } = {}) {
    const value = {};
    if (leadId !== undefined) value.leadId = leadId;
    if (projectId !== undefined) value.projectId = projectId;
    return value;
}

export function buildStakeholderRequest({ customerId, contactId, leadId, projectId, overrides = {} }) {
    return {
        ...buildOpportunityQuery({ leadId, projectId }),
        customerId,
        contactId,
        role: 'decision-maker',
        ...overrides,
    };
}

export function buildStakeholderFullRequest(ids, marker = 'Native I stakeholder') {
    return buildStakeholderRequest({
        ...ids,
        overrides: {
            role: 'decision-maker',
            attitude: 'neutral',
            influenceLevel: 'medium',
            accessLevel: 'indirect',
            focusAreas: ['预算', '交付'],
            communicationNotes: `${marker} initial communication`,
            isPrimary: false,
            ...ids.overrides,
        },
    });
}

export function buildStakeholderUpdate(overrides = {}, marker = 'Native I stakeholder') {
    return {
        role: 'technical-evaluator',
        attitude: 'supportive',
        influenceLevel: 'high',
        accessLevel: 'direct',
        focusAreas: ['采购', '预算'],
        communicationNotes: `${marker} revised communication`,
        isPrimary: true,
        ...overrides,
    };
}

export function buildCompetitorRequest({ customerId, leadId, projectId, overrides = {} }, marker = 'Native I competitor') {
    return {
        ...buildOpportunityQuery({ leadId, projectId }),
        customerId,
        competitorName: marker,
        ...overrides,
    };
}

export function buildCompetitorFullRequest(ids, marker = 'Native I competitor') {
    return buildCompetitorRequest({
        ...ids,
        overrides: {
            position: 'active-competitor',
            customerPreference: 'neutral',
            competitorStrengths: `${marker} initial strengths`,
            competitorWeaknesses: `${marker} initial weaknesses`,
            ourAdvantages: `${marker} initial advantages`,
            ourRisks: `${marker} initial risks`,
            winProbability: 'medium',
            evidence: `${marker} initial evidence`,
            ...ids.overrides,
        },
    }, marker);
}

export function buildCompetitorUpdate(overrides = {}, marker = 'Native I competitor') {
    return {
        competitorName: `${marker} revised`,
        position: 'incumbent',
        customerPreference: 'toward-us',
        competitorStrengths: `${marker} revised strengths`,
        competitorWeaknesses: `${marker} revised weaknesses`,
        ourAdvantages: `${marker} revised advantages`,
        ourRisks: `${marker} revised risks`,
        winProbability: 'high',
        evidence: `${marker} revised evidence`,
        ...overrides,
    };
}

export function buildDiscoveryRequest({ customerId, leadId, projectId, overrides = {} }) {
    return {
        ...buildOpportunityQuery({ leadId, projectId }),
        customerId,
        ...overrides,
    };
}

export function buildDiscoveryFullRequest(ids, marker = 'Native I discovery') {
    return buildDiscoveryRequest({
        ...ids,
        overrides: {
            procurementProcess: `${marker} initial procurement`,
            budgetSource: `${marker} initial budget`,
            customerPainPoints: `${marker} initial pain`,
            decisionCycle: `${marker} initial cycle`,
            nextContactPlan: `${marker} initial next contact`,
            remark: `${marker} initial remark`,
            ...ids.overrides,
        },
    });
}

export function buildDiscoveryUpdate(overrides = {}, marker = 'Native I discovery') {
    return {
        procurementProcess: `${marker} revised procurement`,
        budgetSource: `${marker} revised budget`,
        customerPainPoints: `${marker} revised pain`,
        decisionCycle: `${marker} revised cycle`,
        nextContactPlan: `${marker} revised next contact`,
        remark: `${marker} revised remark`,
        ...overrides,
    };
}

export function buildDiscoveryClearUpdate(overrides = {}) {
    return {
        procurementProcess: null,
        budgetSource: null,
        customerPainPoints: null,
        decisionCycle: null,
        nextContactPlan: null,
        remark: null,
        ...overrides,
    };
}

/**
 * Root may POST these through actual Native/Rust APIs in a chosen order.
 * The same real contact may hold both roles: original DDL has no role/contact
 * uniqueness and no single-primary rule. Default false keeps latest empty
 * discovery's next-contact gap observable instead of hiding it with primary.
 * H explicit score refresh consumes the resulting real facts separately.
 */
export function buildGapDataset(ids, marker = 'Native I gaps') {
    return {
        decisionMaker: buildStakeholderRequest({ ...ids, overrides: { role: 'decision-maker', isPrimary: false } }),
        technicalEvaluator: buildStakeholderRequest({ ...ids, overrides: { role: 'technical-evaluator', isPrimary: false } }),
        competitor: buildCompetitorRequest(ids, `${marker} competitor`),
        completeDiscovery: buildDiscoveryFullRequest(ids, marker),
        emptyLatestDiscovery: buildDiscoveryRequest(ids),
    };
}

// Deliberate source-risk definitions only, not expected-success claims:
// Root should separately remove both anchors from create (base.extend refine
// inheritance/DB CHECK witness), use uppercase customerId for strict comparisons,
// reorder duplicate focusAreas for audit equality, and inject Unicode/NUL only
// in this run's controlled fixtures. Never disable original FK/CHECK constraints.
