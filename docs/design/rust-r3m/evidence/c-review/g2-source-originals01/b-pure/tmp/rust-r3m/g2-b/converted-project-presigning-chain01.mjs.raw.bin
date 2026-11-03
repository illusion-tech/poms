/**
 * Pure C/D/G continuation of ONE actual A conversion receipt. No IO/runner,
 * schema execution, environment, clock, programs or historical E1 imports.
 * Root runs cases sequentially and retains state[case.name]={status,body}.
 * Root supplies state[ids.convertStateKey]={status:200,body:ProjectSummary,
 * request:{method:'POST',path:'/api/leads/<actual lead>:convertToProject'}}.
 * The old :convert typo is not accepted and no alias is added.
 * ids has actual customerId/leadId, actorUserId, marker<=24 ASCII,
 * times.{occurredAt,nextFollowUpAt}, writerActor?='admin', convertStateKey.
 * The actual converted project is fresh: no prepared cost/bid/pricing rows.
 *
 * Normal POST evidence.row is its actual persisted parent row (or supply it
 * in evidence.afterRows[table]); decimal columns must be captured as text.
 * Workspace GETs read actual children and lists prove retained/current rows.
 * Rejection/fault evidence.beforeRows/afterRows is the complete owned graph
 * of project + all C/D/G parents/children + required audit, excluding separate
 * auth upkeep. Missing evidence fails. Root owns any SQL faults/restoration.
 */
import { requireThat, equal, uuidEqual, value, rows, one, body, receipt, decimalUnits, noBusinessWrites, actualDate } from './assertions01.mjs';

const actor = (ids) => ids.writerActor ?? 'admin';
const idOf = (state, name) => receipt(state, name, 201).id;
const money = (actual, expected, label, scale = 2) => equal(decimalUnits(actual, scale).toString(), decimalUnits(expected, scale).toString(), label);
const persisted = (evidence, table, id) => {
    const row = evidence?.row ?? one(rows(evidence?.afterRows, table), id);
    equal(row.id, id, 'Actual persisted parent identity');
    return row;
};
export function convertedProject(state, ids) {
    const exchange = state?.[ids.convertStateKey], project = body(exchange, 200);
    equal(exchange.request?.method, 'POST', 'Actual conversion method');
    equal(exchange.request?.path, `/api/leads/${ids.leadId}:convertToProject`, 'Canonical actual conversion provenance');
    uuidEqual(project.sourceLeadId, ids.leadId, 'Project must come from the actual source Lead');
    uuidEqual(project.customerId, ids.customerId, 'Converted project retains the actual Customer');
    uuidEqual(project.id, project.id, 'Actual conversion-returned Project UUID');
    return project;
}

export function buildCostBusinessRequest(ids, revision = 1) {
    const item = (description, quantity, price, excluding, tax, including, order) => ({
        costCategory: 'equipment', costDescription: `${ids.marker} ${description}`,
        estimationBasis: 'Actual confirmed supplier quote', quantity, unit: '套', unitPrice: price,
        amountExcludingTax: excluding, taxCostAmount: tax, amountIncludingTax: including,
        currencyCode: 'CNY', confidenceLevel: 'high', highUncertainty: false, sortOrder: order,
    });
    return {
        technicalFeasibilityDecision: 'feasible', technicalConclusionSummary: `${ids.marker} converted cost revision ${revision}`,
        allowNextStage: true, currencyCode: 'CNY', taxAssumptionSummary: 'Tax cost reviewed', taxReviewStatus: 'reviewed',
        scopeItems: [{ scopeType: 'in-scope', label: `${ids.marker} equipment scope`, description: 'Confirmed equipment delivery', sortOrder: 1 }],
        riskItems: [{ riskCategory: `${ids.marker} supply`, riskLevel: revision === 1 ? 'R1' : 'R4', riskDescription: 'Actual risk reviewed', impactScope: 'Equipment delivery', mitigationPlan: 'Confirmed mitigation', ownerRole: '售前', riskStatus: 'closed', blocksNextStage: false, sortOrder: 1 }],
        costItems: [item('equipment', '1.2500', '80.0800', '100.10', '13.01', '113.11', 1), item('accessory', '0.2000', '1.0000', '0.20', '0.03', '0.23', 2)],
    };
}
export function buildBidBusinessRequest(ids, projectId, revision = 1) {
    return {
        bidMode: 'public-tender', decision: 'participate', resultStatus: revision === 1 ? 'pending' : 'won',
        currentStage: revision === 1 ? 'preparation' : 'result-confirmed',
        processSummary: `${ids.marker} converted bid revision ${revision}`, decisionSummary: 'Actual bid participation decision',
        resultSummary: revision === 1 ? null : 'Actual award confirmation', tenderNo: `${ids.marker}-T${revision}`, bidPackageNo: `${ids.marker}-B${revision}`, ownerRole: '商务',
        materialItems: [{ materialKey: `${ids.marker}-bid-file`, label: 'Confirmed bid file', materialStatus: 'ready', responsibleRole: '商务', dueAt: ids.times.nextFollowUpAt, blocksNextStep: false, navigationHint: `/projects/${projectId}/workspace/bid-commercial`, sortOrder: 1 }],
        timelineItems: [{ eventKey: `${ids.marker}-bid-confirmed`, label: 'Bid fact confirmed', summary: 'Actual event fact', timelineStatus: 'done', occurredAt: ids.times.occurredAt, dueAt: ids.times.nextFollowUpAt, responsibleRole: '商务', sortOrder: 1 }],
    };
}
export function buildPricingBusinessRequest(ids, costId, bidId, revision = 1) {
    return {
        technicalCostPackageId: costId, bidCommercialProcessId: bidId,
        pricingPath: bidId === null ? 'direct-commercial' : 'bid', quoteVersion: `${ids.marker}-Q${revision}`, currencyCode: 'CNY',
        quoteAmountTaxInclusive: '226.00', quoteAmountTaxExclusive: '200.00', taxRate: '0.13',
        taxConditionSummary: 'Recorded tax terms', paymentTermsSummary: 'Recorded payment milestones',
        grossMarginRate: '0.4985', grossMarginBand: 'target', grossMarginSummary: '1 - 100.30 / 200.00 = 0.4985',
        decision: 'pending', decisionSummary: `${ids.marker} pending commercial review ${revision}`,
        conditionItems: [{ conditionKey: `${ids.marker}-payment`, conditionType: 'payment', label: 'Payment review', conditionSummary: 'Review actual payment milestones', conditionStatus: 'open', requiredForContracting: false, responsibleRole: '财务', dueAt: ids.times.nextFollowUpAt, resolutionSummary: null, sortOrder: 1 }],
    };
}

function checkCreated(result, stored, project, revision, previous, ids) {
    uuidEqual(result.projectId, project.id, 'POST must use the same converted Project');
    uuidEqual(value(stored, 'projectId'), project.id, 'Persisted same converted Project');
    equal(result.version, revision, 'Consecutive actual business version');
    equal(value(stored, 'version'), revision, 'Persisted business version');
    equal(result.isCurrent, true, 'New version is current'); equal(result.status, 'effective', 'New version is effective');
    equal(value(stored, 'isCurrent'), true, 'Persisted new current'); equal(value(stored, 'status'), 'effective', 'Persisted effective');
    equal(result.supersedesId, previous?.id ?? null, 'New version links its real predecessor');
    equal(value(stored, 'supersedesId'), previous?.id ?? null, 'Persisted actual predecessor');
    equal(result.rowVersion, 1, 'New version is inserted once');
    uuidEqual(result.createdBy, ids.actorUserId, 'Actual version creator');
}
function checkHistory(list, first, current) {
    requireThat(Array.isArray(list) && list.length === 2, 'Fresh converted Project retains exactly two actual versions');
    equal(list.map((item) => item.id), [current.id, first.id], 'History exposes newest version first');
    equal(list.filter((item) => item.isCurrent && item.status === 'effective').length, 1, 'Exactly one effective current version');
    const old = one(list, first.id), latest = one(list, current.id);
    equal(old.status, 'superseded', 'Historical version remains superseded'); equal(old.isCurrent, false, 'Historical version is not current');
    equal(latest.supersedesId, first.id, 'Current links real historical version');
    equal(latest.version, old.version + 1, 'Version sequence advances once');
}

export function buildConvertedProjectPresigningPlan(ids) {
    requireThat(ids && /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/.test(ids.marker), 'Actual unique ASCII marker required');
    requireThat(typeof ids.convertStateKey === 'string' && ids.convertStateKey.length > 0, 'Actual conversion receipt state key required');
    for (const name of ['customerId', 'leadId', 'actorUserId']) uuidEqual(ids[name], ids[name], name);
    for (const name of ['occurredAt', 'nextFollowUpAt']) actualDate(ids.times?.[name], `Actual times.${name} required`);
    const names = { cost1: 'B.chain.cost.v1', cost2: 'B.chain.cost.v2', direct: 'B.chain.pricing.direct', bid1: 'B.chain.bid.v1', bid2: 'B.chain.bid.v2', pricing: 'B.chain.pricing.bid' };
    const project = (state) => convertedProject(state, ids);
    const req = (state, name, method, suffix, json) => ({ actor: actor(ids), method, path: `/api/projects/${project(state).id}/${suffix}`, headers: { 'x-request-id': `r3b:${ids.marker}:${name}` }, ...(json === undefined ? {} : { json }) });
    const cases = [];
    const add = (name, operationId, dependsOn, status, request, assert, observation = null) => cases.push({ name, operationId, dependsOn, expectedStatus: status, request, observation, assert(exchange, state, evidence = {}) { const result = body(exchange, status); return assert(result, state, evidence); } });
    for (const revision of [1, 2]) add(names[`cost${revision}`], 'ProjectController_createProjectTechnicalCostPackage', [revision === 1 ? ids.convertStateKey : names.cost1], 201,
        (state) => req(state, `cost${revision}`, 'POST', 'technical-cost-packages', buildCostBusinessRequest(ids, revision)),
        (result, state, evidence) => {
            const stored = persisted(evidence, 'project_technical_cost_package', result.id);
            checkCreated(result, stored, project(state), revision, revision === 1 ? null : receipt(state, names.cost1, 201), ids);
            for (const [field, expected] of [['totalEstimatedAmountExcludingTax', '100.30'], ['totalTaxCostAmount', '13.04'], ['totalEstimatedAmountIncludingTax', '113.34']]) {
                money(result[field], expected, `Response exact ${field}`); money(value(stored, field), expected, `Persisted exact ${field}`);
            }
            equal(result.highestRiskLevel, revision === 1 ? 'R1' : 'R4', 'Actual risk fact');
        }, { table: 'project_technical_cost_package', decimalText: true, children: ['project_technical_scope_item', 'project_technical_risk_item', 'project_technical_cost_item'] });
    add('B.chain.cost.history', 'ProjectController_listProjectTechnicalCostPackages', [names.cost2], 200,
        (state) => req(state, 'cost-list', 'GET', 'technical-cost-packages'),
        (result, state) => checkHistory(result, receipt(state, names.cost1, 201), receipt(state, names.cost2, 201)));
    add('B.chain.cost.workspace', 'ProjectController_getProjectTechnicalCostWorkspace', [names.cost2], 200,
        (state) => req(state, 'cost-workspace', 'GET', 'technical-cost-workspace'),
        (result, state) => {
            uuidEqual(result.projectId, project(state).id, 'Cost workspace converted Project');
            equal(result.currentPackage.id, idOf(state, names.cost2), 'Cost workspace uses actual current');
            equal(result.scopeItems.length, 1, 'Actual scope child'); equal(result.riskItems.length, 1, 'Actual risk child'); equal(result.costItems.length, 2, 'Actual cost children');
            for (const [index, item] of result.costItems.entries()) {
                const expected = buildCostBusinessRequest(ids, 2).costItems[index];
                for (const field of ['amountExcludingTax', 'taxCostAmount', 'amountIncludingTax']) money(item[field], expected[field], `Cost child exact ${field}`);
                money(item.quantity, expected.quantity, 'Cost child quantity four places', 4); money(item.unitPrice, expected.unitPrice, 'Cost child price four places', 4);
            }
        });
    function pricing(name, revision, bid) {
        add(name, 'ProjectController_createProjectPricingMarginReview', [names.cost2, ...(bid ? [names.bid2] : [])], 201,
            (state) => req(state, `pricing${revision}`, 'POST', 'pricing-margin-reviews', buildPricingBusinessRequest(ids, idOf(state, names.cost2), bid ? idOf(state, names.bid2) : null, revision)),
            (result, state, evidence) => {
                const stored = persisted(evidence, 'project_pricing_margin_review', result.id);
                checkCreated(result, stored, project(state), revision, revision === 1 ? null : receipt(state, names.direct, 201), ids);
                uuidEqual(result.technicalCostPackageId, idOf(state, names.cost2), 'Pricing actual current cost');
                if (bid) uuidEqual(result.bidCommercialProcessId, idOf(state, names.bid2), 'Pricing actual current bid'); else equal(result.bidCommercialProcessId, null, 'Explicit direct path without bid reference');
                equal(result.pricingPath, bid ? 'bid' : 'direct-commercial', 'Actual pricing path'); equal(result.decision, 'pending', 'No prepared R4 approval/release fact');
                equal(result.readyForContracting, false, 'Pending review does not claim contract readiness');
                money(result.quoteAmountTaxInclusive, '226.00', 'Response inclusive quote'); money(value(stored, 'quoteAmountTaxInclusive'), '226.00', 'Stored inclusive quote');
                money(result.quoteAmountTaxExclusive, '200.00', 'Response exclusive quote'); money(value(stored, 'quoteAmountTaxExclusive'), '200.00', 'Stored exclusive quote');
                money(value(stored, 'taxRate'), '0.13', 'Stored tax rate', 8); money(value(stored, 'grossMarginRate'), '0.4985', 'Stored margin rate', 8);
            }, { table: 'project_pricing_margin_review', decimalText: true, children: ['project_pricing_margin_condition_item'] });
    }
    pricing(names.direct, 1, false);
    for (const revision of [1, 2]) add(names[`bid${revision}`], 'ProjectController_createProjectBidCommercialProcess', [revision === 1 ? names.direct : names.bid1], 201,
        (state) => req(state, `bid${revision}`, 'POST', 'bid-commercial-processes', buildBidBusinessRequest(ids, project(state).id, revision)),
        (result, state, evidence) => {
            checkCreated(result, persisted(evidence, 'project_bid_commercial_process', result.id), project(state), revision, revision === 1 ? null : receipt(state, names.bid1, 201), ids);
            equal(result.resultStatus, revision === 1 ? 'pending' : 'won', 'Actual bid result');
        }, { table: 'project_bid_commercial_process', children: ['project_bid_commercial_material_item', 'project_bid_commercial_timeline_item'] });
    add('B.chain.bid.history', 'ProjectController_listProjectBidCommercialProcesses', [names.bid2], 200,
        (state) => req(state, 'bid-list', 'GET', 'bid-commercial-processes'),
        (result, state) => checkHistory(result, receipt(state, names.bid1, 201), receipt(state, names.bid2, 201)));
    add('B.chain.bid.workspace', 'ProjectController_getProjectBidCommercialWorkspace', [names.bid2], 200,
        (state) => req(state, 'bid-workspace', 'GET', 'bid-commercial-workspace'),
        (result, state) => { uuidEqual(result.projectId, project(state).id, 'Bid workspace same converted Project'); equal(result.currentProcess.id, idOf(state, names.bid2), 'Bid actual current'); equal(result.materialItems.length, 1, 'Actual material'); equal(result.timelineItems.length, 1, 'Actual bid timeline fact'); });
    pricing(names.pricing, 2, true);
    add('B.chain.pricing.history', 'ProjectController_listProjectPricingMarginReviews', [names.pricing], 200,
        (state) => req(state, 'pricing-list', 'GET', 'pricing-margin-reviews'),
        (result, state) => checkHistory(result, receipt(state, names.direct, 201), receipt(state, names.pricing, 201)));
    add('B.chain.pricing.workspace', 'ProjectController_getProjectPricingMarginWorkspace', [names.pricing], 200,
        (state) => req(state, 'pricing-workspace', 'GET', 'pricing-margin-workspace'),
        (result, state) => {
            uuidEqual(result.projectId, project(state).id, 'Pricing workspace same converted Project');
            equal(result.currentReview.id, idOf(state, names.pricing), 'Pricing actual current'); equal(result.technicalCostPackage.id, idOf(state, names.cost2), 'Stored actual cost reference'); equal(result.bidCommercialProcess.id, idOf(state, names.bid2), 'Stored actual bid reference');
            equal(result.conditionItems.length, 1, 'Actual pricing condition'); equal(result.readyForContracting, false, 'Pending projection remains not ready');
        });
    add('B.chain.pricing.stale-cost-rejected', 'ProjectController_createProjectPricingMarginReview', [names.pricing], 400,
        (state) => req(state, 'stale-cost', 'POST', 'pricing-margin-reviews', buildPricingBusinessRequest(ids, idOf(state, names.cost1), idOf(state, names.bid2), 3)),
        (result, state, evidence) => noBusinessWrites(evidence), { completeOwnedBeforeAfterGraph: true });
    const faults = [
        ['cost', 'project_technical_risk_item', 'technical-cost-packages', (state) => buildCostBusinessRequest(ids, 3)],
        ['bid', 'project_bid_commercial_material_item', 'bid-commercial-processes', (state) => buildBidBusinessRequest(ids, project(state).id, 3)],
        ['pricing', 'project_pricing_margin_condition_item', 'pricing-margin-reviews', (state) => buildPricingBusinessRequest(ids, idOf(state, names.cost2), idOf(state, names.bid2), 3)],
    ].map(([name, table, suffix, json]) => ({
        name: `B.chain.required-child.${name}`, dependsOn: [names.pricing], expectedStatus: 500,
        fault: `Root deny app role INSERT on ${table}; restore in finally`,
        request: (state) => req(state, `fault-${name}`, 'POST', suffix, json(state)),
        assert(exchange, state, evidence) { body(exchange, 500); noBusinessWrites(evidence); },
    }));
    return { kind: 'same-actual-converted-Project-C-D-G-pure-plan', convertStateKey: ids.convertStateKey, cases, faults, executionByAuthor: false, noE1OrHistoricalRunnerImports: true };
}
