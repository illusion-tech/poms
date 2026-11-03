/**
 * Pure business-regression definitions for the previously delivered R3 30 ops.
 * No runner, requests, DB access, private reads, process/env discovery, clock,
 * UUID generation, mocks, self-run or product changes. Root alone executes.
 *
 * Reuse the two unchanged pure builders among the five E1 compatibility files.
 * Importing them performs no IO. This use neither rewrites frozen originals nor
 * extends the existing Root-owned 2026-11-09 E1 deadline/approval.
 *
 * Root interface:
 *   const plan = buildFoundationBusinessRegressionPlan(ids);
 * Each case has dependsOn, request(state), expectedStatus and
 * assert(exchange,state,evidence). These functions are pure; there is no loop
 * here that executes cases. Root retains actual receipts in state[case.name],
 * either as {status,body} or directly as the actual response body.
 * Run the returned cases in their declared order: reads observe a particular
 * lifecycle phase, so data dependencies do not authorize parallel reordering.
 *
 * Root supplies ids.marker (unique, <=40 chars), actorUserId/actorOrgId,
 * otherUserId/otherOrgId, active followUpTypeCode from the real dictionary,
 * and times.{occurredAt,replacementOccurredAt,nextFollowUpAt,
 * replacementNextFollowUpAt}. Reminder times must be future relative to Root's
 * captured clock; occurred times must be real chosen fixture timestamps.
 * Actor session keys default to admin/other; ids.writerActor/otherActor override.
 * sourceCode is optional: Customer.sourceChannel is a text field, not a new
 * lead-source eligibility check. No synthetic UUID, Customer or Project is used.
 *
 * Creation order: actual Customer POST -> Project POST -> two Cost versions ->
 * direct pending Pricing -> two Bid versions -> bid pending Pricing -> Contact
 * -> FollowUp create/replace/void. All IDs/versions/numbers come from actual
 * receipts. Existing Root customer/project IDs may be retained separately; these
 * isolated producers make aggregation/count assertions unambiguous.
 *
 * evidence.row: Root's actual persisted row for the case's observed table/id.
 * Money/rate columns in that row must be read as decimal text (SQL ::text or
 * the driver's decimal-string type), never JSON-number/Number round-tripped.
 * evidence.beforeRows/afterRows: exact business table snapshots for rejected or
 * injected-failure cases; omit auth-session maintenance and independent number
 * reservations from these maps. Missing evidence fails an assertion, never
 * becomes an assumed pass. No SQL/preparation is embedded in this definition.
 * evidence.auditRows: exact rows for this actual command/request where an
 * observation.auditEvent is declared; required success audit must exist once.
 *
 * Main route coverage is exactly A8+B6+C3+D3+G3+E3+F4=30 distinct operations.
 * GET /api/me/todos is an auxiliary existing read, explicitly not a 31st R3 op.
 * Normal statuses/contracts are checked; Node bugs, redundant Zod issues, raw
 * HTML bodies, floating-point artifacts and split business/audit commits are
 * not acceptance targets. Old witnesses remain historical evidence.
 */

import {
    buildCostRequest,
    buildDirectPricingRequest,
    buildBidPricingRequest,
} from '../../docs/design/archive/slices/rust-r3cdefg/input-a/native-fixture-draft01.mjs';
import {
    bidCommercialRequestWithChildren,
} from '../../docs/design/archive/slices/rust-r3cdefg/input-b/native-fixture-draft01.mjs';

export const foundationBuilderDependencies = Object.freeze([
    { file: 'docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs', bytes: 4774, sha256: '041932f361cb4308ce7c854ac1506c53a6846dcf58cb0732c1d15519f8018a83', use: 'pure cost/direct-pricing/bid-pricing constructors' },
    { file: 'docs/design/rust-r3cdefg/input-b/native-fixture-draft01.mjs', bytes: 4215, sha256: '7e5824cb04bda5a3ae38869b27d2f00a624b7d853875ec1ca8e0461773a14946', use: 'pure bid/material/timeline constructor' },
]);

export const foundationOperationGroups = Object.freeze({
    A: ['CustomerController_list', 'CustomerController_create', 'CustomerController_getById', 'CustomerController_update', 'CustomerController_listAliases', 'CustomerController_createAlias', 'CustomerAliasController_delete', 'CustomerController_getWorkspaceOverview'],
    B: ['ProjectController_list', 'ProjectController_create', 'ProjectController_getByCode', 'ProjectController_getById', 'ProjectController_updateBasicInfo', 'ProjectController_reassignOwner'],
    C: ['ProjectController_listProjectTechnicalCostPackages', 'ProjectController_createProjectTechnicalCostPackage', 'ProjectController_getProjectTechnicalCostWorkspace'],
    D: ['ProjectController_listProjectBidCommercialProcesses', 'ProjectController_createProjectBidCommercialProcess', 'ProjectController_getProjectBidCommercialWorkspace'],
    G: ['ProjectController_listProjectPricingMarginReviews', 'ProjectController_createProjectPricingMarginReview', 'ProjectController_getProjectPricingMarginWorkspace'],
    E: ['CustomerContactController_list', 'CustomerContactController_create', 'CustomerContactController_update'],
    F: ['SalesFollowUpController_list', 'SalesFollowUpController_create', 'SalesFollowUpController_replace', 'SalesFollowUpController_void'],
});

export const foundationRowObservationHints = Object.freeze({
    project_technical_cost_package: { decimalTextColumns: ['total_estimated_amount_excluding_tax', 'total_tax_cost_amount', 'total_estimated_amount_including_tax'] },
    project_technical_cost_item: { decimalTextColumns: ['quantity', 'unit_price', 'amount_excluding_tax', 'tax_cost_amount', 'amount_including_tax'] },
    project_pricing_margin_review: { decimalTextColumns: ['quote_amount_tax_inclusive', 'quote_amount_tax_exclusive', 'tax_rate', 'gross_margin_rate'] },
    sales_follow_up_record: { publicFieldMapping: { supersedesId: 'supersedes_record_id', replacedById: 'replaced_by_record_id' }, lifecycleHistoryMustRemain: true },
    todo_item: { activeStatuses: ['open', 'processing'], sourceType: 'sales-follow-up-record', todoType: 'sales-follow-up-reminder', sourceScope: 'actual owned follow-up IDs and their owner/project stream' },
});

export const foundationStaticFindings = Object.freeze([
    {
        id: 'OLD-CONTACT-CREATE-GENDER', status: 'static-finding-await-actual-business-regression',
        contract: 'libs/shared/contracts/src/lib/shared-contracts.ts:3121-3136 allows optional CreateCustomerContactRequest.gender',
        observedSource: [
            'apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.controller.ts:50-65 omits gender from create projection',
            'apps/poms-api-rust/src/customer_contacts/validation.rs:166 parses _gender and discards it',
            'apps/poms-api-rust/src/customer_contacts/model.rs:9-21 Create has no gender',
            'apps/poms-api-rust/src/customer_contacts/service.rs:104 writes Unknown unconditionally',
        ],
        businessTarget: 'An explicit female/male value must persist and round-trip; only missing gender defaults to unknown',
        regression: 'E.contact.create and E.contact.list-created must assert female, including the real persisted row; never expect unknown for an explicit female request',
        owner: 'Root investigates/fixes the old module only after actual regression; this definition changes no product',
    },
    {
        id: 'OLD-FOLLOWUP-REQUIRED-AUDIT-ATOMICITY', status: 'static-finding-await-actual-injected-regression',
        businessSource: 'Current user whole-command rollback decision; EX-48 lifecycle and required audit + EX-49 reminder consistency',
        observedSource: [
            'apps/poms-api-rust/src/sales_follow_up/service.rs:180-208 commits flush before a separate replacement audit',
            'apps/poms-api-rust/src/sales_follow_up/service.rs:246-273 commits void/reminders before a separate audit',
        ],
        businessTarget: 'Rejected required audit rolls back record lifecycle, replacement row and reminder changes together; independent number gaps are unrelated',
        regression: 'buildFoundationRequiredAuditFaultCases supplies pure replace/void definitions with full before/after business snapshots',
        owner: 'Root actual fault injection and bounded repair; not a new author-side execution or full-repository audit',
    },
]);

const requireThat = (value, message) => { if (!value) throw new Error(message); };
const snake = (name) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const rowValue = (row, name) => {
    if (Object.hasOwn(row, name)) return row[name];
    if (Object.hasOwn(row, snake(name))) return row[snake(name)];
    if (name === 'supersedesId') return row.supersedes_record_id;
    if (name === 'replacedById') return row.replaced_by_record_id;
    return undefined;
};
const receipt = (state, key) => {
    const value = state[key];
    requireThat(value !== undefined, `Missing actual dependency receipt ${key}`);
    return value && Object.hasOwn(value, 'body') ? value.body : value;
};
const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
};
const equal = (actual, expected, message) => requireThat(JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)), message);
const one = (rows, id) => {
    requireThat(Array.isArray(rows), 'Expected a public array response');
    const found = rows.filter((row) => row.id === id);
    requireThat(found.length === 1, `Actual row ${id} must occur once`);
    return found[0];
};
const row = (evidence) => { requireThat(evidence?.row && typeof evidence.row === 'object', 'Root must supply the actual persisted evidence.row'); return evidence.row; };
const version = (value) => requireThat(Number.isInteger(value.rowVersion) && value.rowVersion > 0, 'Business rowVersion must be a positive integer');
const changed = (current, before) => { version(current); requireThat(current.rowVersion === before.rowVersion + 1, 'A real single-row update must increment its actual version once'); };
const stored = (body, evidence, fields) => {
    const actual = row(evidence);
    requireThat(actual.id === body.id, 'Persisted evidence belongs to a different actual row');
    for (const field of fields) equal(rowValue(actual, field), body[field], `Persisted ${field} must agree with the public result`);
};
const unchanged = (evidence) => {
    requireThat(evidence?.beforeRows && evidence?.afterRows, 'Root must capture beforeRows and afterRows for this business rejection/failure');
    requireThat(Object.keys(evidence.beforeRows).length > 0 && Object.keys(evidence.afterRows).length > 0, 'Empty evidence maps do not prove business rollback');
    equal(evidence.afterRows, evidence.beforeRows, 'Rejected command changed business rows, required audit or reminders');
};
const audit = (evidence, eventType, targetId, actorId) => {
    requireThat(Array.isArray(evidence?.auditRows) && evidence.auditRows.length === 1, 'Root must capture exactly one required success audit for the actual request');
    const value = evidence.auditRows[0];
    equal(rowValue(value, 'eventType'), eventType, 'Required audit event');
    equal(rowValue(value, 'targetId'), targetId, 'Required audit target');
    equal(rowValue(value, 'operatorId'), actorId, 'Required audit operator');
    equal(value.result, 'success', 'Required audit result');
};

// Integer units, not Number/toFixed: financial equality must not inherit Node
// floating-point precision loss. Only public decimal strings enter this helper.
export function decimalUnits(value, scale = 2) {
    requireThat(typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value), 'Expected an exact decimal string');
    const negative = value.startsWith('-');
    const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
    requireThat(fraction.length <= scale, `Decimal exceeds ${scale} published places`);
    const units = BigInt(whole) * (10n ** BigInt(scale)) + BigInt(fraction.padEnd(scale, '0') || '0');
    return negative ? -units : units;
}
const money = (actual, expected, label) => equal(decimalUnits(actual).toString(), decimalUnits(expected).toString(), `${label}: monetary amount changed`);
const isoEqual = (actual, expected, label) => {
    requireThat(typeof actual === 'string' && Number.isFinite(Date.parse(actual)), `${label}: actual ISO datetime required`);
    equal(Date.parse(actual), Date.parse(expected), `${label}: datetime instant changed`);
};
const history = (rows, first, latest) => {
    requireThat(Array.isArray(rows) && rows.length === 2, 'Fresh project must retain both actual version records');
    const old = one(rows, first.id), current = one(rows, latest.id);
    requireThat(rows.filter((item) => item.isCurrent && item.status === 'effective').length === 1, 'Exactly one effective current business version is required');
    requireThat(current.isCurrent && current.status === 'effective' && current.supersedesId === old.id, 'Current version must refer to its actual predecessor');
    requireThat(!old.isCurrent && old.status === 'superseded', 'Historical predecessor must remain as superseded');
    requireThat(current.version === old.version + 1, 'Version sequence must advance by one');
    equal(rows.map((item) => item.version), [current.version, old.version], 'Version list should expose newest first');
};

export function buildFoundationCustomerRequest(ids, overrides = {}) {
    return { displayName: `${ids.marker} customer`, legalName: `${ids.marker} legal`, shortName: `${ids.marker} short`, ownerUserId: ids.actorUserId, ownerOrgId: ids.actorOrgId, sourceChannel: ids.sourceCode ?? null, remark: `${ids.marker} original customer`, ...overrides };
}
export function buildFoundationProjectRequest(customerId, ids, overrides = {}) {
    return { projectName: `${ids.marker} project`, customerId, customerProjectNo: `${ids.marker}-external`, currentStage: 'assessment', plannedSignAt: ids.times.nextFollowUpAt, ...overrides };
}
export function buildFoundationContactRequest(customerId, ids, overrides = {}) {
    return { customerId, name: `${ids.marker} contact`, gender: 'female', department: '业务', title: '采购负责人', workPhone: null, mobile: '01000000000', wechat: null, email: 'regression@example.com', remark: `${ids.marker} contact initial`, ...overrides };
}
export function buildFoundationFollowUpRequest(customerId, projectId, ids, overrides = {}) {
    return { customerId, projectId, leadId: null, followUpType: ids.followUpTypeCode, occurredAt: ids.times.occurredAt, summary: `${ids.marker} original follow-up`, detail: `${ids.marker} detail must not leak to global todos`, outcome: 'progress', nextFollowUpAt: ids.times.nextFollowUpAt, ownerUserId: ids.actorUserId, ownerOrgId: ids.actorOrgId, ...overrides };
}
export function buildFoundationReplacementRequest(source, ids, overrides = {}) {
    return { followUpType: ids.followUpTypeCode, occurredAt: ids.times.replacementOccurredAt, summary: `${ids.marker} corrected follow-up`, detail: null, outcome: 'waiting-customer', nextFollowUpAt: ids.times.replacementNextFollowUpAt, ownerUserId: ids.otherUserId, ownerOrgId: ids.otherOrgId, replacementReason: `${ids.marker} correction reason`, expectedVersion: source.rowVersion, ...overrides };
}
export function buildFoundationVoidRequest(source, ids, overrides = {}) {
    return { reason: `${ids.marker} withdraw follow-up`, comment: null, expectedVersion: source.rowVersion, ...overrides };
}
export function buildFoundationCostRequest(ids, revision = 1) {
    const request = buildCostRequest({ technicalConclusionSummary: `${ids.marker} cost revision ${revision}` });
    request.scopeItems = request.scopeItems.map((item) => ({ ...item, label: `${ids.marker} equipment scope` }));
    request.riskItems = request.riskItems.map((item) => ({ ...item, riskCategory: `${ids.marker} supply`, riskDescription: `${ids.marker} reviewed delivery risk` }));
    const item = request.costItems[0];
    request.costItems = [
        { ...item, costDescription: `${ids.marker} equipment`, quantity: '1.2500', unit: '套', unitPrice: '80.0800', amountExcludingTax: '100.10', taxCostAmount: '13.01', amountIncludingTax: '113.11', sortOrder: 1 },
        { ...item, costDescription: `${ids.marker} accessory`, quantity: '0.2000', unit: '套', unitPrice: '1.0000', amountExcludingTax: '0.20', taxCostAmount: '0.03', amountIncludingTax: '0.23', sortOrder: 2 },
    ];
    return request;
}
export function buildFoundationBidRequest(projectId, ids, revision = 1) {
    const request = bidCommercialRequestWithChildren(`${ids.marker} B${revision}`, 'publicTender', `/projects/${projectId}/workspace/bid-commercial`);
    request.materialItems = request.materialItems.map((item) => ({ ...item, dueAt: item.dueAt === null ? null : ids.times.nextFollowUpAt }));
    request.timelineItems = request.timelineItems.map((item) => ({ ...item, occurredAt: item.occurredAt === null ? null : ids.times.occurredAt, dueAt: ids.times.nextFollowUpAt }));
    if (revision === 2) {
        request.currentStage = 'result-confirmed';
        request.resultStatus = 'won';
        request.resultSummary = `${ids.marker} actual awarded result fixture`;
        request.materialItems = request.materialItems.map((item) => ({ ...item, materialStatus: 'ready', blocksNextStep: false }));
        request.timelineItems = request.timelineItems.map((item) => ({ ...item, timelineStatus: 'done', occurredAt: ids.times.replacementOccurredAt }));
    }
    return request;
}
export function buildFoundationPricingRequest(costId, bidId, ids, revision = 1) {
    const overrides = { quoteVersion: `${ids.marker}-Q${revision}`, grossMarginRate: '0.4985', grossMarginBand: 'target', grossMarginSummary: `${ids.marker} margin based on 100.30 / 200.00`, decisionSummary: `${ids.marker} pending review ${revision}` };
    const request = bidId ? buildBidPricingRequest(costId, bidId, overrides) : buildDirectPricingRequest(costId, overrides);
    request.conditionItems = request.conditionItems.map((item) => ({ ...item, conditionKey: `${ids.marker}-payment`, dueAt: ids.times.nextFollowUpAt }));
    return request;
}

function definition(name, operationId, dependsOn, expectedStatus, request, check, observation = null, extra = {}) {
    return {
        name, operationId, dependsOn, expectedStatus, request, observation, ...extra,
        assert(exchange, state, evidence = {}) {
            requireThat(exchange && exchange.status === expectedStatus, `${name}: expected normal business HTTP ${expectedStatus}, received ${exchange?.status}`);
            check(exchange.body, state, evidence);
        },
    };
}

function checkCost(value, projectId, evidence = null) {
    version(value); equal(value.projectId, projectId, 'Cost package changed project');
    money(value.totalEstimatedAmountExcludingTax, '100.30', 'Cost total excluding tax');
    money(value.totalTaxCostAmount, '13.04', 'Cost total tax');
    money(value.totalEstimatedAmountIncludingTax, '113.34', 'Cost total including tax');
    requireThat(decimalUnits(value.totalEstimatedAmountExcludingTax) + decimalUnits(value.totalTaxCostAmount) === decimalUnits(value.totalEstimatedAmountIncludingTax), 'Cost totals must reconcile exactly');
    if (evidence) {
        stored(value, evidence, ['projectId', 'version', 'isCurrent', 'status', 'supersedesId', 'rowVersion']);
        money(rowValue(row(evidence), 'totalEstimatedAmountExcludingTax'), '100.30', 'Stored cost excluding tax');
        money(rowValue(row(evidence), 'totalTaxCostAmount'), '13.04', 'Stored cost tax');
        money(rowValue(row(evidence), 'totalEstimatedAmountIncludingTax'), '113.34', 'Stored cost including tax');
    }
}
function checkQuote(value, projectId, costId, bidId, evidence = null) {
    version(value); equal(value.projectId, projectId, 'Pricing review changed project');
    equal(value.technicalCostPackageId, costId, 'Pricing must reference the actual current cost producer');
    equal(value.bidCommercialProcessId, bidId, 'Pricing bid reference changed');
    money(value.quoteAmountTaxExclusive, '200.00', 'Quote excluding tax');
    money(value.quoteAmountTaxInclusive, '226.00', 'Quote including tax');
    equal(decimalUnits(value.taxRate, 8).toString(), decimalUnits('0.13', 8).toString(), 'Tax rate must remain an exact decimal');
    equal(decimalUnits(value.grossMarginRate, 8).toString(), decimalUnits('0.4985', 8).toString(), 'Margin rate must not lose decimal precision');
    requireThat(value.decision === 'pending' && value.readyForContracting === false, 'Pending review must not become released/contract-ready');
    if (evidence) {
        stored(value, evidence, ['projectId', 'version', 'isCurrent', 'status', 'technicalCostPackageId', 'bidCommercialProcessId']);
        money(rowValue(row(evidence), 'quoteAmountTaxExclusive'), '200.00', 'Stored quote excluding tax');
        money(rowValue(row(evidence), 'quoteAmountTaxInclusive'), '226.00', 'Stored quote including tax');
        equal(decimalUnits(rowValue(row(evidence), 'taxRate'), 8).toString(), decimalUnits('0.13', 8).toString(), 'Stored tax rate');
        equal(decimalUnits(rowValue(row(evidence), 'grossMarginRate'), 8).toString(), decimalUnits('0.4985', 8).toString(), 'Stored margin rate');
    }
}
function checkTodo(rows, sourceId, projectId, ownerId, dueAt, present, emptyStream = false, expectedSummary = null) {
    requireThat(Array.isArray(rows), 'My Todos must be an array');
    requireThat(rows.every((item) => item.assigneeUserId === ownerId), 'My Todos must not expose another actor assignment');
    const reminders = rows.filter((item) => item.sourceType === 'sales-follow-up-record' && item.todoType === 'sales-follow-up-reminder' && item.sourceId === sourceId);
    equal(reminders.length, present ? 1 : 0, 'A source record must have exactly one current personal reminder or none after supersede/void');
    const stream = rows.filter((item) => item.sourceType === 'sales-follow-up-record' && item.todoType === 'sales-follow-up-reminder' && item.targetObjectType === 'project' && item.targetObjectId === projectId && ['open', 'processing'].includes(item.status));
    if (present) requireThat(stream.length === 1 && stream[0].sourceId === sourceId, 'This actual owner/project stream must have exactly one current source');
    if (emptyStream) equal(stream.length, 0, 'Superseded or voided source must not leave a stale/fallback active stream');
    for (const item of reminders) {
        equal(item.assigneeUserId, ownerId, 'Reminder assignee differs from actual follow-up owner');
        equal(item.targetObjectType, 'project', 'Most-specific reminder target must be project');
        equal(item.targetObjectId, projectId, 'Reminder points at wrong project');
        equal(item.projectId, projectId, 'Reminder project projection changed');
        requireThat(['open', 'processing'].includes(item.status), 'My Todos should only contain an active reminder');
        isoEqual(item.dueAt, dueAt, 'Reminder due time');
        equal(item.allowedActions, [], 'Reminder cannot be completed independently of a new business fact');
        requireThat(!Object.hasOwn(item, 'detail'), 'Global Todo must not expose full follow-up detail');
        requireThat(!item.summary?.includes('detail must not leak to global todos'), 'Reminder summary leaked the full detail fixture');
        if (expectedSummary) requireThat(typeof item.summary === 'string' && item.summary.includes(expectedSummary), 'Reminder should summarize the actual follow-up summary');
    }
}

export function buildFoundationBusinessRegressionPlan(ids) {
    requireThat(ids && typeof ids.marker === 'string' && ids.marker.length > 0 && ids.marker.length <= 40, 'Root supplies a unique short marker, at most40 characters');
    for (const key of ['actorUserId', 'actorOrgId', 'otherUserId', 'otherOrgId', 'followUpTypeCode']) requireThat(typeof ids[key] === 'string' && ids[key].length > 0, `Root supplies real ${key}`);
    for (const key of ['occurredAt', 'replacementOccurredAt', 'nextFollowUpAt', 'replacementNextFollowUpAt']) requireThat(typeof ids.times?.[key] === 'string', `Root supplies explicit times.${key}`);
    const actor = ids.writerActor ?? 'admin', otherActor = ids.otherActor ?? 'other';
    const C = (state) => receipt(state, 'A.customer.create').id;
    const P = (state) => receipt(state, 'B.project.create').id;
    const K1 = (state) => receipt(state, 'C.cost.create.v1');
    const K2 = (state) => receipt(state, 'C.cost.create.v2');
    const B1 = (state) => receipt(state, 'D.bid.create.v1');
    const B2 = (state) => receipt(state, 'D.bid.create.v2');
    const Q1 = (state) => receipt(state, 'G.pricing.create.direct');
    const Q2 = (state) => receipt(state, 'G.pricing.create.bid');
    const F1 = (state) => receipt(state, 'F.followup.create');
    const F2 = (state) => receipt(state, 'F.followup.replace');
    const cases = [];
    const add = (...args) => cases.push(definition(...args));

    add('A.customer.create', 'CustomerController_create', [], 201,
        () => ({ actor, method: 'POST', path: '/api/customers', json: buildFoundationCustomerRequest(ids) }),
        (body, state, evidence) => { version(body); equal(body.status, 'active', 'Customer starts active'); equal(body.displayName, `${ids.marker} customer`, 'Customer name changed'); equal(body.ownerUserId, ids.actorUserId, 'Customer owner'); requireThat(/^CUST-\d{4}-\d{6,}$/.test(body.customerNo), 'Actual unique customer business number required, no first-number assumption'); stored(body, evidence, ['displayName', 'ownerUserId', 'ownerOrgId', 'status', 'rowVersion']); },
        { row: { table: 'customer', id: 'response.id' }, numberReservation: 'Observe actual customerNo; gaps may remain and never reuse' });
    add('A.customer.detail.initial', 'CustomerController_getById', ['A.customer.create'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}` }),
        (body, state) => { equal(body.id, C(state), 'Customer detail id'); equal([body.leadCount, body.projectCount, body.contractCount], [0, 0, 0], 'Fresh isolated customer initial aggregates'); requireThat(body.aliases.filter((item) => item.isPrimary).length === 1, 'Exactly one primary alias'); });
    add('A.aliases.initial', 'CustomerController_listAliases', ['A.customer.create'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}/aliases` }),
        (body, state) => { requireThat(Array.isArray(body) && body.filter((item) => item.isPrimary).length === 1, 'Primary alias is a real create side effect'); const primary = body.find((item) => item.isPrimary); equal(primary.customerId, C(state), 'Primary alias customer'); equal(primary.aliasName, receipt(state, 'A.customer.create').displayName, 'Initial primary alias reflects the actual created display name'); });
    add('A.alias.create', 'CustomerController_createAlias', ['A.customer.create'], 201,
        (state) => ({ actor, method: 'POST', path: `/api/customers/${C(state)}/aliases`, json: { aliasName: `${ids.marker} procurement alias`, aliasType: 'alias' } }),
        (body, state, evidence) => { equal(body.customerId, C(state), 'Alias customer'); equal(body.isPrimary, false, 'Additional alias must not replace the primary alias'); requireThat(typeof body.normalizedName === 'string' && body.normalizedName.length > 0, 'Searchable normalized alias required'); stored(body, evidence, ['customerId', 'aliasName', 'aliasType', 'normalizedName', 'isPrimary']); }, { row: { table: 'customer_alias', id: 'response.id' } });
    add('A.aliases.after-create', 'CustomerController_listAliases', ['A.alias.create', 'A.aliases.initial'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}/aliases` }),
        (body, state) => { one(body, receipt(state, 'A.alias.create').id); requireThat(body.filter((item) => item.isPrimary).length === 1, 'Alias creation retained exactly one primary alias'); });
    add('A.alias.delete-primary-denied', 'CustomerAliasController_delete', ['A.aliases.after-create'], 409,
        (state) => ({ actor, method: 'DELETE', path: `/api/customer-aliases/${receipt(state, 'A.aliases.initial').find((item) => item.isPrimary).id}` }),
        (body, state, evidence) => unchanged(evidence), { beforeRows: ['customer_alias'], afterRows: ['customer_alias'], scope: 'only owned customer aliases' });
    add('A.alias.delete', 'CustomerAliasController_delete', ['A.alias.delete-primary-denied'], 204,
        (state) => ({ actor, method: 'DELETE', path: `/api/customer-aliases/${receipt(state, 'A.alias.create').id}` }),
        (body, state, evidence) => { requireThat(evidence?.deletedRowAbsent === true, 'Actual alias delete must be verified from owned persisted rows'); audit(evidence, 'customer.alias.deleted', C(state), ids.actorUserId); }, { deletedRow: { table: 'customer_alias', id: 'A.alias.create.id' }, auditEvent: 'customer.alias.deleted' });
    add('A.aliases.after-delete', 'CustomerController_listAliases', ['A.alias.delete', 'A.alias.delete-primary-denied'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}/aliases` }),
        (body, state) => { requireThat(!body.some((item) => item.id === receipt(state, 'A.alias.create').id), 'Deleted alias remained visible'); requireThat(body.filter((item) => item.isPrimary).length === 1, 'Primary alias must survive both delete operations'); });
    add('A.customer.update', 'CustomerController_update', ['A.customer.detail.initial', 'A.aliases.after-delete'], 200,
        (state) => ({ actor, method: 'PATCH', path: `/api/customers/${C(state)}`, json: { displayName: `${ids.marker} customer revised`, legalName: null, ownerUserId: ids.otherUserId, ownerOrgId: ids.otherOrgId, remark: `${ids.marker} customer revised remark` } }),
        (body, state, evidence) => { changed(body, receipt(state, 'A.customer.detail.initial')); equal(body.displayName, `${ids.marker} customer revised`, 'Customer name update'); equal(body.legalName, null, 'Explicit null must clear legalName'); equal(body.ownerUserId, ids.otherUserId, 'Customer owner update'); stored(body, evidence, ['displayName', 'legalName', 'ownerUserId', 'ownerOrgId', 'rowVersion']); }, { row: { table: 'customer', id: 'A.customer.create.id' } });
    add('A.customer.list', 'CustomerController_list', ['A.customer.update'], 200,
        () => ({ actor, method: 'GET', path: '/api/customers', query: { keyword: ids.marker, ownerOrgId: ids.otherOrgId, status: 'active' } }),
        (body, state) => { const actual = one(body, C(state)); equal(actual.displayName, receipt(state, 'A.customer.update').displayName, 'Customer filtered list must expose current fact'); equal(actual.ownerOrgId, ids.otherOrgId, 'Customer owner filter'); });

    add('B.project.create', 'ProjectController_create', ['A.customer.update'], 201,
        (state) => ({ actor, method: 'POST', path: '/api/projects', json: buildFoundationProjectRequest(C(state), ids) }),
        (body, state, evidence) => { version(body); equal(body.customerId, C(state), 'Project customer'); equal(body.customerName, receipt(state, 'A.customer.update').displayName, 'Project current customer name'); equal(body.sourceLeadId, null, 'Direct project create must not invent a source Lead'); equal(body.currentStage, 'assessment', 'Declared project initial stage'); requireThat(/^PRJ-\d{4}-\d{6,}$/.test(body.projectNo), 'Actual unique project number required'); stored(body, evidence, ['customerId', 'projectName', 'sourceLeadId', 'currentStage', 'rowVersion']); }, { row: { table: 'project', id: 'response.id' } });
    add('B.project.list', 'ProjectController_list', ['B.project.create'], 200,
        () => ({ actor, method: 'GET', path: '/api/projects', query: { keyword: ids.marker, currentStage: 'assessment', status: 'active' } }),
        (body, state) => { const actual = one(body, P(state)); equal(actual.customerId, C(state), 'Project list customer'); });
    add('B.project.lookup', 'ProjectController_getByCode', ['B.project.create'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/projects:lookup', query: { projectNo: receipt(state, 'B.project.create').projectNo } }),
        (body, state) => { equal(body.id, P(state), 'Lookup actual generated business number, never a hard-coded counter value'); });
    add('B.project.detail', 'ProjectController_getById', ['B.project.create'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}` }),
        (body, state) => { equal(body.id, P(state), 'Project detail id'); equal(body.sourceLeadSummary, null, 'Direct create has no source Lead summary'); equal(body.currentContractSummary.activeContractCount, 0, 'Fresh project has no invented contract fact'); });
    add('B.project.update', 'ProjectController_updateBasicInfo', ['B.project.detail'], 200,
        (state) => ({ actor, method: 'PATCH', path: `/api/projects/${P(state)}`, json: { projectName: `${ids.marker} revised project`, customerProjectNo: null, plannedSignAt: null } }),
        (body, state, evidence) => { changed(body, receipt(state, 'B.project.detail')); equal(body.customerProjectNo, null, 'Explicit null clears external project number'); equal(body.plannedSignAt, null, 'Explicit null clears planned datetime'); equal(body.customerId, C(state), 'Basic update must not lose customer'); stored(body, evidence, ['projectName', 'customerProjectNo', 'plannedSignAt', 'rowVersion']); }, { row: { table: 'project', id: 'B.project.create.id' } });
    add('B.project.reassign', 'ProjectController_reassignOwner', ['B.project.update'], 201,
        (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}:reassignOwner`, json: { ownerUserId: ids.otherUserId, ownerOrgId: ids.otherOrgId, reason: `${ids.marker} business ownership transfer`, expectedVersion: receipt(state, 'B.project.update').rowVersion } }),
        (body, state, evidence) => { equal(body.targetId, P(state), 'Ownership command target'); equal(body.newOwnerUserId, ids.otherUserId, 'Ownership command new user'); equal(body.newOwnerOrgId, ids.otherOrgId, 'Ownership command new organization'); requireThat(typeof body.projectOwnerReassignmentRecordId === 'string', 'Ownership command must retain an actual reassignment record'); const actual = row(evidence); equal(actual.id, P(state), 'Ownership persisted row'); equal(rowValue(actual, 'ownerUserId'), ids.otherUserId, 'Ownership must persist'); equal(rowValue(actual, 'rowVersion'), receipt(state, 'B.project.update').rowVersion + 1, 'Ownership version advances once'); }, { row: { table: 'project', id: 'B.project.create.id' }, additionalTable: 'project_owner_reassignment_record' });
    add('B.project.owner-detail', 'ProjectController_getById', ['B.project.reassign'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}` }),
        (body) => { equal(body.ownerUserId, ids.otherUserId, 'Owner read-back'); equal(body.ownerOrgId, ids.otherOrgId, 'Owner organization read-back'); });
    add('B.project.stale-owner-command', 'ProjectController_reassignOwner', ['B.project.reassign'], 409,
        (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}:reassignOwner`, json: { ownerUserId: ids.actorUserId, ownerOrgId: ids.actorOrgId, reason: `${ids.marker} deliberately stale transfer`, expectedVersion: receipt(state, 'B.project.update').rowVersion } }),
        (body, state, evidence) => unchanged(evidence), { beforeRows: ['project', 'project_owner_reassignment_record', 'audit_log'], afterRows: ['project', 'project_owner_reassignment_record', 'audit_log'], scope: 'owned project/request only' });
    add('A.customer.aggregate-detail', 'CustomerController_getById', ['B.project.create'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}` }),
        (body) => { equal(body.projectCount, 1, 'Customer project count must reflect its real producer'); equal(body.leadCount, 0, 'No synthetic Lead count'); equal(body.contractCount, 0, 'No synthetic Contract count'); });
    add('A.customer.workspace', 'CustomerController_getWorkspaceOverview', ['B.project.create'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}/workspace-overview` }),
        (body, state) => { equal(body.customerId, C(state), 'Workspace customer'); equal(body.summary.projectCount, 1, 'Workspace aggregate project count'); one(body.activeProjects, P(state)); });

    for (const revision of [1, 2]) {
        const name = `C.cost.create.v${revision}`;
        add(name, 'ProjectController_createProjectTechnicalCostPackage', revision === 1 ? ['B.project.create'] : ['C.cost.create.v1'], 201,
            (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}/technical-cost-packages`, json: buildFoundationCostRequest(ids, revision) }),
            (body, state, evidence) => { checkCost(body, P(state), evidence); requireThat(body.isCurrent && body.status === 'effective', 'Created cost package must be current/effective'); if (revision === 2) { equal(body.supersedesId, K1(state).id, 'Cost actual predecessor'); equal(body.version, K1(state).version + 1, 'Cost version advance'); } }, { row: { table: 'project_technical_cost_package', id: 'response.id' } });
    }
    add('C.cost.list', 'ProjectController_listProjectTechnicalCostPackages', ['C.cost.create.v2'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}/technical-cost-packages` }),
        (body, state) => { history(body, K1(state), K2(state)); for (const value of body) checkCost(value, P(state)); });
    add('C.cost.workspace', 'ProjectController_getProjectTechnicalCostWorkspace', ['C.cost.create.v2'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}/technical-cost-workspace` }),
        (body, state) => { equal(body.currentPackage.id, K2(state).id, 'Cost workspace must read the current actual package'); checkCost(body.currentPackage, P(state)); equal(body.costItems.length, 2, 'Both cost children must persist'); const expected = buildFoundationCostRequest(ids, 2); body.costItems.forEach((item, index) => { equal(item.packageId, K2(state).id, 'Cost child FK'); for (const field of ['amountExcludingTax', 'taxCostAmount', 'amountIncludingTax']) money(item[field], expected.costItems[index][field], `Cost child ${field}`); for (const field of ['quantity', 'unitPrice']) equal(decimalUnits(item[field], 4).toString(), decimalUnits(expected.costItems[index][field], 4).toString(), `Cost child ${field} exact decimal`); }); equal(body.scopeItems.length, expected.scopeItems.length, 'Scope child count'); equal(body.riskItems.length, expected.riskItems.length, 'Risk child count'); });

    add('G.pricing.create.direct', 'ProjectController_createProjectPricingMarginReview', ['C.cost.create.v2'], 201,
        (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}/pricing-margin-reviews`, json: buildFoundationPricingRequest(K2(state).id, null, ids, 1) }),
        (body, state, evidence) => checkQuote(body, P(state), K2(state).id, null, evidence), { row: { table: 'project_pricing_margin_review', id: 'response.id' } });
    for (const revision of [1, 2]) {
        add(`D.bid.create.v${revision}`, 'ProjectController_createProjectBidCommercialProcess', revision === 1 ? ['G.pricing.create.direct'] : ['D.bid.create.v1'], 201,
            (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}/bid-commercial-processes`, json: buildFoundationBidRequest(P(state), ids, revision) }),
            (body, state, evidence) => { version(body); equal(body.projectId, P(state), 'Bid project'); requireThat(body.isCurrent && body.status === 'effective', 'New bid version must be effective/current'); if (revision === 2) { equal(body.resultStatus, 'won', 'Declared won bid result'); equal(body.supersedesId, B1(state).id, 'Bid actual predecessor'); equal(body.version, B1(state).version + 1, 'Bid version advance'); } stored(body, evidence, ['projectId', 'version', 'isCurrent', 'status', 'resultStatus']); }, { row: { table: 'project_bid_commercial_process', id: 'response.id' } });
    }
    add('D.bid.list', 'ProjectController_listProjectBidCommercialProcesses', ['D.bid.create.v2'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}/bid-commercial-processes` }),
        (body, state) => history(body, B1(state), B2(state)));
    add('D.bid.workspace', 'ProjectController_getProjectBidCommercialWorkspace', ['D.bid.create.v2'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}/bid-commercial-workspace` }),
        (body, state) => { equal(body.currentProcess.id, B2(state).id, 'Bid workspace current producer'); const expected = buildFoundationBidRequest(P(state), ids, 2); equal(body.materialItems.length, expected.materialItems.length, 'Bid material count'); equal(body.timelineItems.length, expected.timelineItems.length, 'Bid timeline count'); for (const item of [...body.materialItems, ...body.timelineItems]) equal(item.processId, B2(state).id, 'Bid child belongs to current process'); body.timelineItems.forEach((item, index) => isoEqual(item.occurredAt, expected.timelineItems[index].occurredAt, 'Declared event time')); });
    add('G.pricing.create.bid', 'ProjectController_createProjectPricingMarginReview', ['D.bid.create.v2', 'G.pricing.create.direct'], 201,
        (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}/pricing-margin-reviews`, json: buildFoundationPricingRequest(K2(state).id, B2(state).id, ids, 2) }),
        (body, state, evidence) => { checkQuote(body, P(state), K2(state).id, B2(state).id, evidence); equal(body.supersedesId, Q1(state).id, 'Pricing actual predecessor'); equal(body.version, Q1(state).version + 1, 'Pricing version advance'); }, { row: { table: 'project_pricing_margin_review', id: 'response.id' } });
    add('G.pricing.list', 'ProjectController_listProjectPricingMarginReviews', ['G.pricing.create.bid'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}/pricing-margin-reviews` }),
        (body, state) => history(body, Q1(state), Q2(state)));
    add('G.pricing.workspace', 'ProjectController_getProjectPricingMarginWorkspace', ['G.pricing.create.bid'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/projects/${P(state)}/pricing-margin-workspace` }),
        (body, state) => { equal(body.currentReview.id, Q2(state).id, 'Pricing workspace current review'); equal(body.technicalCostPackage.id, K2(state).id, 'Pricing current cost projection'); equal(body.bidCommercialProcess.id, B2(state).id, 'Pricing current bid projection'); requireThat(body.readyForContracting === false, 'Pending review must not unlock contracting'); equal(body.conditionItems.length, 1, 'Pricing condition child persisted'); equal(body.conditionItems[0].reviewId, Q2(state).id, 'Condition current review FK'); checkQuote(body.currentReview, P(state), K2(state).id, B2(state).id); });
    add('G.pricing.stale-cost-rejected', 'ProjectController_createProjectPricingMarginReview', ['G.pricing.create.bid'], 400,
        (state) => ({ actor, method: 'POST', path: `/api/projects/${P(state)}/pricing-margin-reviews`, json: buildFoundationPricingRequest(K1(state).id, B2(state).id, ids, 3) }),
        (body, state, evidence) => unchanged(evidence), { beforeRows: ['project_pricing_margin_review', 'project_pricing_margin_condition_item'], afterRows: ['project_pricing_margin_review', 'project_pricing_margin_condition_item'], scope: 'owned project only; no supersession on rejected references' });

    add('E.contact.create', 'CustomerContactController_create', ['A.customer.create'], 201,
        (state) => ({ actor, method: 'POST', path: '/api/customer-contacts', json: buildFoundationContactRequest(C(state), ids) }),
        (body, state, evidence) => { version(body); equal(body.customerId, C(state), 'Contact customer'); equal(body.gender, 'female', 'Explicit public Create gender must persist; old controller omission is not a business target'); equal(body.status, 'active', 'Contact starts active'); stored(body, evidence, ['customerId', 'name', 'gender', 'status', 'rowVersion']); }, { row: { table: 'customer_contact', id: 'response.id' }, knownStaticFinding: 'OLD-CONTACT-CREATE-GENDER' });
    add('E.contact.list-created', 'CustomerContactController_list', ['E.contact.create'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/customer-contacts', query: { customerId: C(state) } }),
        (body, state) => { const actual = one(body, receipt(state, 'E.contact.create').id); equal(actual.gender, 'female', 'Gender read-back must retain explicit Create value'); });
    add('E.contact.update', 'CustomerContactController_update', ['E.contact.list-created'], 200,
        (state) => ({ actor, method: 'PATCH', path: `/api/customer-contacts/${receipt(state, 'E.contact.create').id}`, json: { gender: 'male', department: null, title: '项目采购', remark: `${ids.marker} updated contact` } }),
        (body, state, evidence) => { changed(body, receipt(state, 'E.contact.create')); equal(body.gender, 'male', 'Contact gender update'); equal(body.department, null, 'Contact explicit-null clear'); stored(body, evidence, ['customerId', 'gender', 'department', 'title', 'remark', 'rowVersion']); audit(evidence, 'customer-contact.updated', body.id, ids.actorUserId); }, { row: { table: 'customer_contact', id: 'E.contact.create.id' }, auditEvent: 'customer-contact.updated' });
    add('E.contact.list-updated', 'CustomerContactController_list', ['E.contact.update'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/customer-contacts', query: { customerId: C(state) } }),
        (body, state) => { const actual = one(body, receipt(state, 'E.contact.create').id); equal(actual.gender, 'male', 'Updated gender reread'); equal(actual.department, null, 'Cleared department reread'); });

    add('F.followup.create', 'SalesFollowUpController_create', ['B.project.create'], 201,
        (state) => ({ actor, method: 'POST', path: '/api/sales-follow-up-records', json: buildFoundationFollowUpRequest(C(state), P(state), ids) }),
        (body, state, evidence) => { version(body); equal(body.customerId, C(state), 'Follow-up customer'); equal(body.projectId, P(state), 'Follow-up project'); equal(body.status, 'active', 'New follow-up starts active'); equal(body.supersedesId, null, 'New follow-up has no invented predecessor'); equal(body.ownerUserId, ids.actorUserId, 'Declared follow-up owner'); isoEqual(body.occurredAt, ids.times.occurredAt, 'Follow-up occurredAt'); isoEqual(body.nextFollowUpAt, ids.times.nextFollowUpAt, 'Follow-up next date'); stored(body, evidence, ['customerId', 'projectId', 'status', 'ownerUserId', 'rowVersion']); }, { row: { table: 'sales_follow_up_record', id: 'response.id' }, reminder: 'actual todo_item current stream; Root observes real row' });
    add('F.followup.list-created', 'SalesFollowUpController_list', ['F.followup.create'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/sales-follow-up-records', query: { projectId: P(state) } }),
        (body, state) => { requireThat(body.every((item) => item.status === 'active'), 'Default follow-up list excludes lifecycle history'); one(body, F1(state).id); });
    add('aux.todo.writer.created', 'ApprovalController_getMyTodos', ['F.followup.create'], 200,
        () => ({ actor, method: 'GET', path: '/api/me/todos' }),
        (body, state) => checkTodo(body, F1(state).id, P(state), ids.actorUserId, ids.times.nextFollowUpAt, true, false, F1(state).summary), null, { auxiliaryExistingRead: true, countedR3Operation: false });
    add('F.followup.replace', 'SalesFollowUpController_replace', ['F.followup.create', 'aux.todo.writer.created'], 200,
        (state) => ({ actor, method: 'POST', path: `/api/sales-follow-up-records/${F1(state).id}:replace`, json: buildFoundationReplacementRequest(F1(state), ids) }),
        (body, state, evidence) => { version(body); requireThat(body.id !== F1(state).id, 'Replacement is append-only, not an in-place body overwrite'); equal(body.supersedesId, F1(state).id, 'Replacement predecessor'); equal(body.customerId, F1(state).customerId, 'Replacement customer anchor immutable'); equal(body.projectId, F1(state).projectId, 'Replacement project anchor immutable'); equal(body.leadId, F1(state).leadId, 'Replacement Lead anchor immutable'); equal(body.status, 'active', 'Replacement is current active'); equal(body.ownerUserId, ids.otherUserId, 'Replacement explicit owner transfer'); isoEqual(body.occurredAt, ids.times.replacementOccurredAt, 'Replacement occurredAt'); isoEqual(body.nextFollowUpAt, ids.times.replacementNextFollowUpAt, 'Replacement next date'); stored(body, evidence, ['customerId', 'projectId', 'status', 'ownerUserId', 'supersedesId', 'rowVersion']); audit(evidence, 'sales-follow-up.replaced', F1(state).id, ids.actorUserId); }, { row: { table: 'sales_follow_up_record', id: 'response.id' }, auditEvent: 'sales-follow-up.replaced' });
    add('F.followup.history-replaced', 'SalesFollowUpController_list', ['F.followup.replace'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/sales-follow-up-records', query: { projectId: P(state), lifecycleScope: 'all' } }),
        (body, state) => { const old = one(body, F1(state).id), current = one(body, F2(state).id); equal(old.status, 'superseded', 'Old follow-up becomes historical'); equal(old.replacedById, current.id, 'Old/new links must agree'); equal(current.supersedesId, old.id, 'New/old links must agree'); equal(old.summary, F1(state).summary, 'Historical summary must remain immutable'); equal(old.detail, F1(state).detail, 'Historical detail must remain immutable'); isoEqual(old.occurredAt, F1(state).occurredAt, 'Historical occurredAt'); requireThat(body.filter((item) => item.status === 'active').length === 1, 'Only one active record in this isolated replacement chain'); });
    add('F.followup.active-replaced', 'SalesFollowUpController_list', ['F.followup.replace'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/sales-follow-up-records', query: { projectId: P(state) } }),
        (body, state) => { equal(body.length, 1, 'Only actual replacement remains in default list'); equal(body[0].id, F2(state).id, 'Default list current replacement'); });
    add('A.workspace.active-followup', 'CustomerController_getWorkspaceOverview', ['F.followup.replace'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}/workspace-overview` }),
        (body, state) => { one(body.recentFollowUps, F2(state).id); requireThat(!body.recentFollowUps.some((item) => item.id === F1(state).id), 'Workspace must not treat superseded follow-up as active business fact'); });
    add('aux.todo.writer.replaced', 'ApprovalController_getMyTodos', ['F.followup.replace'], 200,
        () => ({ actor, method: 'GET', path: '/api/me/todos' }),
        (body, state) => checkTodo(body, F1(state).id, P(state), ids.actorUserId, ids.times.nextFollowUpAt, false, true), null, { auxiliaryExistingRead: true, countedR3Operation: false });
    add('aux.todo.other.replaced', 'ApprovalController_getMyTodos', ['F.followup.replace'], 200,
        () => ({ actor: otherActor, method: 'GET', path: '/api/me/todos' }),
        (body, state) => { checkTodo(body, F2(state).id, P(state), ids.otherUserId, ids.times.replacementNextFollowUpAt, true, false, F2(state).summary); checkTodo(body, F1(state).id, P(state), ids.otherUserId, ids.times.nextFollowUpAt, false); }, null, { auxiliaryExistingRead: true, countedR3Operation: false });
    add('F.followup.replace-stale', 'SalesFollowUpController_replace', ['F.followup.replace'], 409,
        (state) => ({ actor, method: 'POST', path: `/api/sales-follow-up-records/${F1(state).id}:replace`, json: buildFoundationReplacementRequest(F1(state), ids) }),
        (body, state, evidence) => unchanged(evidence), { beforeRows: ['sales_follow_up_record', 'todo_item', 'audit_log'], afterRows: ['sales_follow_up_record', 'todo_item', 'audit_log'], scope: 'owned replacement chain/request only' });
    add('F.followup.void-version-mismatch', 'SalesFollowUpController_void', ['F.followup.replace'], 409,
        (state) => ({ actor, method: 'POST', path: `/api/sales-follow-up-records/${F2(state).id}:void`, json: buildFoundationVoidRequest(F2(state), ids, { expectedVersion: F2(state).rowVersion + 100 }) }),
        (body, state, evidence) => unchanged(evidence), { beforeRows: ['sales_follow_up_record', 'todo_item', 'audit_log'], afterRows: ['sales_follow_up_record', 'todo_item', 'audit_log'], scope: 'owned replacement chain/request only' });
    add('F.followup.void', 'SalesFollowUpController_void', ['F.followup.replace', 'F.followup.void-version-mismatch'], 200,
        (state) => ({ actor, method: 'POST', path: `/api/sales-follow-up-records/${F2(state).id}:void`, json: buildFoundationVoidRequest(F2(state), ids) }),
        (body, state, evidence) => { changed(body, F2(state)); equal(body.status, 'voided', 'Void is a lifecycle transition, not deletion'); equal(body.voidedBy, ids.actorUserId, 'Void actor retained'); requireThat(typeof body.voidedAt === 'string' && typeof body.voidReason === 'string', 'Void metadata required'); stored(body, evidence, ['status', 'rowVersion', 'voidedBy', 'voidReason']); audit(evidence, 'sales-follow-up.voided', body.id, ids.actorUserId); }, { row: { table: 'sales_follow_up_record', id: 'F.followup.replace.id' }, auditEvent: 'sales-follow-up.voided' });
    add('F.followup.active-voided', 'SalesFollowUpController_list', ['F.followup.void'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/sales-follow-up-records', query: { projectId: P(state) } }),
        (body) => equal(body, [], 'Voided/superseded records must not participate in the default list'));
    add('F.followup.history-voided', 'SalesFollowUpController_list', ['F.followup.void'], 200,
        (state) => ({ actor, method: 'GET', path: '/api/sales-follow-up-records', query: { projectId: P(state), lifecycleScope: 'all' } }),
        (body, state) => { equal(one(body, F1(state).id).status, 'superseded', 'Original history retained'); equal(one(body, F2(state).id).status, 'voided', 'Voided replacement retained'); equal(body.length, 2, 'No hidden fallback replacement or physical deletion'); });
    add('aux.todo.other.voided', 'ApprovalController_getMyTodos', ['F.followup.void'], 200,
        () => ({ actor: otherActor, method: 'GET', path: '/api/me/todos' }),
        (body, state) => { checkTodo(body, F2(state).id, P(state), ids.otherUserId, ids.times.replacementNextFollowUpAt, false, true); checkTodo(body, F1(state).id, P(state), ids.otherUserId, ids.times.nextFollowUpAt, false); }, null, { auxiliaryExistingRead: true, countedR3Operation: false });
    add('A.workspace.voided-followups', 'CustomerController_getWorkspaceOverview', ['F.followup.void'], 200,
        (state) => ({ actor, method: 'GET', path: `/api/customers/${C(state)}/workspace-overview` }),
        (body, state) => { requireThat(!body.recentFollowUps.some((item) => [F1(state).id, F2(state).id].includes(item.id)), 'Workspace must exclude both superseded and voided follow-up facts'); equal(body.summary.projectCount, 1, 'Follow-up lifecycle must not alter project count'); });

    return {
        kind: 'R3-old30-business-semantics-regression-definitions-only',
        operationGroups: foundationOperationGroups, builderDependencies: foundationBuilderDependencies,
        rowObservationHints: foundationRowObservationHints,
        counting: { mainDistinctOperations: 30, auxiliaryTodoReadCountedAsR3: false, executionByAuthor: false },
        requiredPermissions: ['customer:read', 'customer:write', 'project:read', 'project:write'],
        cases, staticFindings: foundationStaticFindings,
        followUpTruth: 'EX-48 append-only replacement/void; EX-49 one current reminder per owner/most-specific target stream; user whole-command rollback',
        cleanup: 'Root-owned actual receipt IDs only; retain old snapshots and never read old private directories',
    };
}

/**
 * Supplementary required-audit atomicity probes. Root first POSTs a separate
 * actual active follow-up using buildFoundationFollowUpRequest, then supplies
 * ids.faultSourceId/faultSourceVersion. The same untouched active source may be
 * used sequentially only when the preceding failure really rolled back.
 * Root alone arranges/restores the controlled audit_log INSERT denial.
 */
export function buildFoundationRequiredAuditFaultCases(ids) {
    requireThat(typeof ids.faultSourceId === 'string' && Number.isInteger(ids.faultSourceVersion) && ids.faultSourceVersion > 0, 'Actual fresh fault-source id/version required');
    const source = { id: ids.faultSourceId, rowVersion: ids.faultSourceVersion };
    const actor = ids.writerActor ?? 'admin';
    const observation = { faultOwner: 'Root', fault: 'deny owned app role audit_log INSERT; restore in finally', beforeRows: ['sales_follow_up_record', 'todo_item', 'audit_log'], afterRows: ['sales_follow_up_record', 'todo_item', 'audit_log'], scope: 'actual source/replacement candidates, its reminder stream and request audit only; auth-session maintenance is recorded separately' };
    return [
        definition('F.required-audit.replace-rollback', 'SalesFollowUpController_replace', ['Root.actual-fault-source-create'], 500,
            () => ({ actor, method: 'POST', path: `/api/sales-follow-up-records/${source.id}:replace`, json: buildFoundationReplacementRequest(source, ids) }),
            (body, state, evidence) => unchanged(evidence), observation, { expectedBusinessResult: 'no new replacement, no lifecycle/version/actor changes, no reminder changes and no committed required audit' }),
        definition('F.required-audit.void-rollback', 'SalesFollowUpController_void', ['Root.actual-fault-source-create'], 500,
            () => ({ actor, method: 'POST', path: `/api/sales-follow-up-records/${source.id}:void`, json: buildFoundationVoidRequest(source, ids) }),
            (body, state, evidence) => unchanged(evidence), observation, { expectedBusinessResult: 'source remains active at actual prior version; reminder remains unchanged; required audit failure cannot leave business committed' }),
    ];
}
