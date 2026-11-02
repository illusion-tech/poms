/**
 * Pure version-chain regression plans/assertions. Author execution: none.
 * No runner, requests, DB/privilege changes, process/env/clock discovery,
 * generated IDs, formatting, mocks, self-run, or product edits.
 *
 * Root supplies an actual eligible projectId, or projectIds.{cost,bid,pricing};
 * marker <=40 chars; actorUserId/adminUserId and otherUserId; optional
 * writerActor/otherActor (default admin/other, distinct real writer sessions).
 * Each family project already has a real current version AND nonempty children.
 * The pricing project has real current cost/bid plus real superseded predecessors
 * named staleCostId/staleBidId. All must be actual HTTP producer receipts.
 * A public-tender current bid must have a supported non-lost/cancelled result.
 * One shared project may be used: the declared pricing workspace reads refresh
 * its source IDs AFTER the cost/bid concurrency cases. Preserve declared order.
 *
 * Cases use the foundation request(state)/assert(exchange,state,evidence)
 * convention; concurrent cases instead expose requests(state) and accept an
 * array of two actual exchanges. Root alone executes/injects and saves receipts
 * in state[case.name]. Values may be {status,body} or actual bodies for reads.
 * No callback in this file calls a network/DB/runner operation.
 *
 * evidence.beforeRows/afterRows are complete row snapshots, keyed by table.
 * Prefer arrays of PostgreSQL to_jsonb(t)::text strings, captured before JSON
 * Number/Date conversion. Arrays of full plain rows are also accepted only if
 * all numeric/decimal columns are exact strings and timestamps are strings.
 * Whole-table snapshots may be supplied; assertions scope parents by project,
 * children by ALL historical parent IDs, and compare every captured row field.
 * Missing/empty historical or child evidence is a failure, not a skipped check.
 * Auth-session global maintenance and independent number reservations must be
 * observed separately, not mistaken for version-domain business changes.
 *
 * Concurrent evidence also supplies historyResponse/workspaceResponse (actual
 * GET exchanges) and lock:{table:'project',projectId,waitingBeforeRelease>=2,
 * released:true}. Root holds that owned project row, dispatches both requests,
 * observes TWO real app waiters on project FOR UPDATE, RELEASES its lock, then
 * awaits both results. Promise.all alone is not concurrency evidence.
 * Fault privilege changes/restoration are Root-owned; always restore in finally.
 * No independent creation audit is invented: version/actor/time are retained.
 */
import assert from 'node:assert/strict';

export const versionBusinessFamilies = Object.freeze({
    cost: {
        operationId: 'ProjectController_createProjectTechnicalCostPackage',
        tail: 'technical-cost-packages', workspaceTail: 'technical-cost-workspace', currentKey: 'currentPackage',
        table: 'project_technical_cost_package',
        children: [
            { table: 'project_technical_cost_item', parentKey: 'package_id', input: 'costItems', workspace: 'costItems' },
            { table: 'project_technical_risk_item', parentKey: 'package_id', input: 'riskItems', workspace: 'riskItems' },
            { table: 'project_technical_scope_item', parentKey: 'package_id', input: 'scopeItems', workspace: 'scopeItems' },
        ],
    },
    bid: {
        operationId: 'ProjectController_createProjectBidCommercialProcess',
        tail: 'bid-commercial-processes', workspaceTail: 'bid-commercial-workspace', currentKey: 'currentProcess',
        table: 'project_bid_commercial_process',
        children: [
            { table: 'project_bid_commercial_timeline_item', parentKey: 'process_id', input: 'timelineItems', workspace: 'timelineItems' },
            { table: 'project_bid_commercial_material_item', parentKey: 'process_id', input: 'materialItems', workspace: 'materialItems' },
        ],
    },
    pricing: {
        operationId: 'ProjectController_createProjectPricingMarginReview',
        tail: 'pricing-margin-reviews', workspaceTail: 'pricing-margin-workspace', currentKey: 'currentReview',
        table: 'project_pricing_margin_review',
        children: [{ table: 'project_pricing_margin_condition_item', parentKey: 'review_id', input: 'conditionItems', workspace: 'conditionItems' }],
    },
});

export const versionBusinessObservationHints = Object.freeze({
    lock: { table: 'project', key: 'id', mode: 'FOR UPDATE', transaction: 'same transaction as current/version/ref reads and all writes', actualWaiterQuery: 'SELECT id FROM poms.project ... FOR UPDATE' },
    parentInvariantFields: ['id', 'project_id', 'version', 'is_current', 'status', 'supersedes_id', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by'],
    mutableSupersessionFields: ['is_current', 'status', 'row_version', 'updated_at', 'updated_by'],
    decimalTextColumns: ['total_estimated_amount_excluding_tax', 'total_tax_cost_amount', 'total_estimated_amount_including_tax', 'quantity', 'unit_price', 'amount_excluding_tax', 'tax_cost_amount', 'amount_including_tax', 'quote_amount_tax_inclusive', 'quote_amount_tax_exclusive', 'tax_rate', 'gross_margin_rate'],
    noProjection: 'Capture every column, every historical parent and every historical child, not only current or successful response IDs.',
    faultOwner: 'Root; app-role INSERT denial only on the declared existing table; restore original privileges in finally',
    audits: 'No separate creation audit has been registered for these three domains; do not manufacture audit requirements.',
});

const snake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const camel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
const field = (row, key) => Object.hasOwn(row, key) ? row[key] : row[snake(key)];
const response = (value) => value?.response ?? value;
const receipt = (state, key) => {
    assert.ok(Object.hasOwn(state, key), `Missing actual dependency ${key}`);
    const value = response(state[key]);
    return value && Object.hasOwn(value, 'body') ? value.body : value;
};
const canonical = (value) => {
    assert.ok(!(value instanceof Date), 'Date-converted DB evidence can lose precision; capture full raw JSON text instead');
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
};
const decimalColumns = versionBusinessObservationHints.decimalTextColumns.flatMap((key) => [key, camel(key)]);
const rowObject = (row) => {
    const raw = typeof row === 'string' ? row : typeof row?.raw === 'string' ? row.raw : null;
    const parsed = raw === null ? { ...row } : JSON.parse(raw);
    assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.id === 'string', 'Full actual DB row with id required');
    for (const key of decimalColumns) {
        if (!Object.hasOwn(parsed, key) || parsed[key] === null) continue;
        if (raw !== null) {
            const token = raw.match(new RegExp(`"${key}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*"|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)`));
            assert.ok(token, `Lossless original decimal token required for ${key}`);
            parsed[key] = token[1].startsWith('"') ? JSON.parse(token[1]) : token[1];
        }
        assert.equal(typeof parsed[key], 'string', `Do not Number-round DB decimal ${key}`);
    }
    return canonical(parsed);
};
const rows = (snapshot, table) => {
    assert.ok(snapshot && Object.hasOwn(snapshot, table) && Array.isArray(snapshot[table]), `Missing complete DB snapshot for ${table}`);
    return snapshot[table].map(rowObject).sort((left, right) => left.id.localeCompare(right.id));
};
const familyTables = (family) => {
    const config = versionBusinessFamilies[family];
    assert.ok(config, `Unknown version family ${family}`);
    return ['project', config.table, ...config.children.map((child) => child.table)];
};
const allVersionTables = () => [...new Set(Object.keys(versionBusinessFamilies).flatMap(familyTables))];
const scoped = (snapshot, family, projectId) => {
    const config = versionBusinessFamilies[family];
    const parents = rows(snapshot, config.table).filter((row) => field(row, 'projectId') === projectId);
    const parentIds = new Set(parents.map((row) => row.id));
    const result = { project: rows(snapshot, 'project').filter((row) => row.id === projectId), [config.table]: parents };
    assert.equal(result.project.length, 1, 'The actual owned project row must exist once');
    for (const child of config.children) result[child.table] = rows(snapshot, child.table).filter((row) => parentIds.has(field(row, child.parentKey)));
    return result;
};
const current = (parents) => {
    const values = parents.filter((row) => field(row, 'isCurrent') === true);
    assert.equal(values.length, 1, 'Exactly one current row is required, including statuses other than effective');
    assert.equal(values[0].status, 'effective');
    return values[0];
};
const requireSeed = (snapshot, family, projectId) => {
    const config = versionBusinessFamilies[family];
    const value = scoped(snapshot, family, projectId);
    assert.ok(value[config.table].length > 0, 'Seed must be a real existing version; empty state cannot prove rollback of supersession');
    const seed = current(value[config.table]);
    for (const child of config.children) assert.ok(value[child.table].some((row) => field(row, child.parentKey) === seed.id), `Real seed must have nonempty ${child.table}`);
    return { value, seed };
};
const byId = (values, id) => {
    const found = values.filter((row) => row.id === id);
    assert.equal(found.length, 1, `Actual row ${id} must exist once`);
    return found[0];
};
const immutableParent = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !versionBusinessObservationHints.mutableSupersessionFields.includes(snake(key))));
const positiveVersion = (row) => {
    assert.ok(Number.isInteger(row.version) && row.version > 0, 'Version must be a positive actual integer');
    assert.ok(Number.isInteger(field(row, 'rowVersion')) && field(row, 'rowVersion') > 0, 'Row version must be a positive actual integer');
};
const checkInputChildren = (family, after, parent, request) => {
    const config = versionBusinessFamilies[family];
    for (const child of config.children) {
        const expected = request.json[child.input];
        assert.ok(Array.isArray(expected) && expected.length > 0, `DTO requires nonempty test ${child.input}`);
        const actual = after[child.table].filter((row) => field(row, child.parentKey) === parent.id).sort((a, b) => field(a, 'sortOrder') - field(b, 'sortOrder'));
        assert.equal(actual.length, expected.length, `New version ${parent.id} must own exactly its ${child.input}`);
        expected.forEach((input, index) => {
            for (const [key, value] of Object.entries(input)) assert.deepEqual(field(actual[index], key), value, `${child.table}.${key}: persisted child differs from its own request`);
        });
    }
};

export function buildVersionCostRequest(marker) {
    return {
        technicalFeasibilityDecision: 'feasible', technicalConclusionSummary: `${marker} technical conclusion`, allowNextStage: true,
        currencyCode: 'CNY', taxAssumptionSummary: `${marker} reviewed tax`, taxReviewStatus: 'reviewed',
        scopeItems: [{ scopeType: 'in-scope', label: `${marker} scope`, description: `${marker} equipment delivery`, sortOrder: 1 }],
        riskItems: [{ riskCategory: `${marker} supply`, riskLevel: 'R1', riskDescription: `${marker} reviewed risk`, impactScope: '设备交付', mitigationPlan: '已核实交期', ownerRole: '售前', riskStatus: 'closed', blocksNextStage: false, sortOrder: 1 }],
        costItems: [{ costCategory: 'equipment', costDescription: `${marker} cost`, estimationBasis: '已确认询价', amountExcludingTax: '100.00', taxCostAmount: '13.00', amountIncludingTax: '113.00', currencyCode: 'CNY', confidenceLevel: 'high', highUncertainty: false, sortOrder: 1 }],
    };
}
export function buildVersionBidRequest(projectId, marker) {
    return {
        bidMode: 'public-tender', currentStage: 'preparation', decision: 'participate', resultStatus: 'pending',
        processSummary: `${marker} process`, decisionSummary: `${marker} participate`, resultSummary: null,
        tenderNo: `${marker}-tender`, bidPackageNo: `${marker}-package`, ownerRole: '销售 / 商务',
        materialItems: [{ materialKey: `${marker}-material`, label: `${marker} material`, materialStatus: 'ready', responsibleRole: '商务', dueAt: null, blocksNextStep: false, navigationHint: `/projects/${projectId}/workspace/bid-commercial`, sortOrder: 1 }],
        timelineItems: [{ eventKey: `${marker}-event`, label: `${marker} timeline`, summary: `${marker} planned event`, timelineStatus: 'pending', occurredAt: null, dueAt: null, responsibleRole: '商务', sortOrder: 1 }],
    };
}
export function buildVersionPricingRequest(costId, bidId, marker) {
    return {
        technicalCostPackageId: costId, bidCommercialProcessId: bidId, pricingPath: 'bid', quoteVersion: `${marker}-quote`,
        currencyCode: 'CNY', quoteAmountTaxInclusive: '226.00', quoteAmountTaxExclusive: '200.00', taxRate: '0.13',
        taxConditionSummary: '报价税务条件已记录', paymentTermsSummary: '按约定节点回款',
        grossMarginRate: null, grossMarginBand: 'not-calculated', grossMarginSummary: '本轮尚未形成毛利结论',
        decision: 'pending', decisionSummary: `${marker} pending review`, ownerRole: '商务 / 财务',
        conditionItems: [{ conditionKey: `${marker}-payment`, conditionType: 'payment', label: `${marker} payment`, conditionSummary: '核实已记录回款节点', conditionStatus: 'open', requiredForContracting: false, responsibleRole: '财务', dueAt: null, resolutionSummary: null, sortOrder: 1 }],
    };
}

export function assertConcurrentVersions({ family, projectId, requests, exchanges, evidence }) {
    const config = versionBusinessFamilies[family];
    assert.equal(requests.length, 2); assert.equal(exchanges.length, 2);
    const replies = exchanges.map(response);
    replies.forEach((reply) => assert.equal(reply.status, 201, 'No expectedVersion was supplied: serialize both valid creates instead of dropping a version'));
    assert.equal(evidence?.lock?.table, 'project'); assert.equal(evidence.lock.projectId, projectId);
    assert.ok(evidence.lock.waitingBeforeRelease >= 2, 'Root must observe two real app project-row waiters before release');
    assert.equal(evidence.lock.released, true);
    const { value: before, seed } = requireSeed(evidence.beforeRows, family, projectId);
    const after = scoped(evidence.afterRows, family, projectId);
    const oldParents = before[config.table], newParents = after[config.table];
    assert.deepEqual(after.project, before.project, 'Locking/version creation must not mutate the project record');
    assert.equal(newParents.length, oldParents.length + 2);
    assert.equal(new Set(newParents.map((row) => row.id)).size, newParents.length);
    assert.equal(new Set(newParents.map((row) => row.version)).size, newParents.length, 'Versions must be unique per project');
    newParents.forEach(positiveVersion);
    const created = replies.map((reply, index) => ({ body: reply.body, request: requests[index] })).sort((a, b) => a.body.version - b.body.version);
    assert.notEqual(created[0].body.id, created[1].body.id);
    const maxBefore = Math.max(...oldParents.map((row) => row.version));
    assert.deepEqual(created.map((item) => item.body.version), [maxBefore + 1, maxBefore + 2]);
    assert.equal(created[0].body.supersedesId, seed.id);
    assert.equal(created[1].body.supersedesId, created[0].body.id);
    const currentAfter = current(newParents);
    assert.equal(currentAfter.id, created[1].body.id);
    const expectedIds = new Set([...oldParents.map((row) => row.id), ...created.map((item) => item.body.id)]);
    assert.ok(newParents.every((row) => expectedIds.has(row.id)), 'No replacement history may be lost or secretly substituted');
    for (const old of oldParents) {
        const actual = byId(newParents, old.id);
        if (old.id !== seed.id) assert.deepEqual(actual, old, 'Pre-existing historical version changed');
        else {
            assert.equal(field(actual, 'isCurrent'), false); assert.equal(actual.status, 'superseded');
            assert.equal(field(actual, 'rowVersion'), field(old, 'rowVersion') + 1);
            assert.deepEqual(immutableParent(actual), immutableParent(old), 'Supersession overwrote historical business facts');
        }
    }
    for (const [index, item] of created.entries()) {
        const actual = byId(newParents, item.body.id);
        assert.equal(item.body.projectId, projectId); assert.equal(item.body.status, 'effective'); assert.equal(item.body.isCurrent, true);
        assert.equal(field(actual, 'projectId'), projectId); assert.equal(field(actual, 'supersedesId'), item.body.supersedesId);
        assert.equal(field(actual, 'createdBy'), item.request.expectedActorId);
        assert.equal(field(actual, 'rowVersion'), item.body.rowVersion + (index === 0 ? 1 : 0));
        assert.equal(actual.status, index === 0 ? 'superseded' : 'effective');
        assert.equal(field(actual, 'isCurrent'), index === 1);
        checkInputChildren(family, after, actual, item.request);
    }
    for (const child of config.children) {
        const oldIds = new Set(before[child.table].map((row) => row.id));
        assert.deepEqual(after[child.table].filter((row) => oldIds.has(row.id)), before[child.table], 'Historical children were changed or removed');
        assert.equal(after[child.table].length, before[child.table].length + requests.reduce((sum, request) => sum + request.json[child.input].length, 0));
    }
    const history = response(evidence.historyResponse), workspace = response(evidence.workspaceResponse);
    assert.equal(history?.status, 200); assert.equal(workspace?.status, 200);
    assert.deepEqual(history.body.map((row) => row.version), newParents.map((row) => row.version).sort((a, b) => b - a));
    assert.deepEqual(new Set(history.body.map((row) => row.id)), expectedIds);
    for (const item of history.body) {
        const stored = byId(newParents, item.id);
        for (const key of ['projectId', 'version', 'isCurrent', 'status', 'supersedesId', 'rowVersion']) assert.deepEqual(item[key], field(stored, key));
    }
    assert.equal(workspace.body[config.currentKey]?.id, currentAfter.id);
    for (const child of config.children) assert.equal(workspace.body[child.workspace].length, created[1].request.json[child.input].length);
}

export function assertAtomicVersionRollback({ family, projectId, exchange, evidence, expectedStatus = 500 }) {
    assert.equal(response(exchange)?.status, expectedStatus);
    const { value: before } = requireSeed(evidence.beforeRows, family, projectId);
    const after = scoped(evidence.afterRows, family, projectId);
    assert.deepEqual(after, before, 'Necessary parent/child failure changed current, full history, historical children or project');
}

export function assertStalePricingReference({ reference, projectId, requestedId, exchange, evidence }) {
    const reply = response(exchange);
    assert.equal(reply?.status, 400, 'A real superseded reference is a business rejection, not a storage 500');
    const upstream = reference === 'cost' ? 'cost' : 'bid';
    assert.ok(reference === 'cost' || reference === 'bid');
    const upstreamConfig = versionBusinessFamilies[upstream];
    const historical = requireSeed(evidence.beforeRows, upstream, projectId);
    const old = byId(historical.value[upstreamConfig.table], requestedId);
    assert.equal(field(old, 'isCurrent'), false); assert.equal(old.status, 'superseded');
    assert.notEqual(old.id, historical.seed.id, 'Use a real same-project historical ID, not a made-up missing or cross-project UUID');
    const name = reference === 'cost' ? 'technicalCostPackageId' : 'bidCommercialProcessId';
    assert.ok(typeof reply.body.message === 'string' && reply.body.message.includes(name), 'Clear stale-reference business message required');
    for (const family of Object.keys(versionBusinessFamilies)) {
        assert.deepEqual(scoped(evidence.afterRows, family, projectId), scoped(evidence.beforeRows, family, projectId), 'Stale pricing reference wrote version-domain rows');
    }
}

export function buildVersionBusinessRegressionPlan(ids) {
    assert.ok(typeof ids.marker === 'string' && ids.marker.length > 0 && ids.marker.length <= 40);
    const projects = Object.fromEntries(['cost', 'bid', 'pricing'].map((family) => [family, ids.projectIds?.[family] ?? ids.projectId]));
    for (const id of Object.values(projects)) assert.ok(typeof id === 'string' && id.length > 0, 'Actual eligible project receipt required');
    const actors = [
        { actor: ids.writerActor ?? 'admin', expectedActorId: ids.actorUserId ?? ids.adminUserId },
        { actor: ids.otherActor ?? 'other', expectedActorId: ids.otherUserId },
    ];
    assert.notEqual(actors[0].actor, actors[1].actor, 'Use distinct real writer sessions so auth-session races do not mask the version test');
    actors.forEach((actor) => assert.ok(typeof actor.expectedActorId === 'string' && actor.expectedActorId.length > 0));
    for (const key of ['staleCostId', 'staleBidId']) assert.ok(typeof ids[key] === 'string' && ids[key].length > 0, `Actual historical pricing-project ${key} required`);
    const costRead = 'V.pricing.current-cost', bidRead = 'V.pricing.current-bid';
    const pricingRefs = (state) => {
        const cost = receipt(state, costRead).currentPackage, bid = receipt(state, bidRead).currentProcess;
        assert.ok(cost?.isCurrent && cost.status === 'effective' && cost.projectId === projects.pricing);
        assert.ok(bid?.isCurrent && bid.status === 'effective' && bid.projectId === projects.pricing);
        return { costId: cost.id, bidId: bid.id };
    };
    const request = (family, marker, state, actor = actors[0], overrides = {}) => {
        let json;
        if (family === 'cost') json = buildVersionCostRequest(marker);
        else if (family === 'bid') json = buildVersionBidRequest(projects[family], marker);
        else { const refs = pricingRefs(state); json = buildVersionPricingRequest(refs.costId, refs.bidId, marker); }
        return { ...actor, method: 'POST', path: `/api/projects/${projects[family]}/${versionBusinessFamilies[family].tail}`, json: { ...json, ...overrides } };
    };
    const observation = (family) => ({
        projectId: projects[family], beforeRows: familyTables(family), afterRows: familyTables(family), hints: versionBusinessObservationHints,
        historyRequest: { method: 'GET', path: `/api/projects/${projects[family]}/${versionBusinessFamilies[family].tail}` },
        workspaceRequest: { method: 'GET', path: `/api/projects/${projects[family]}/${versionBusinessFamilies[family].workspaceTail}` },
    });
    const cases = [];
    const concurrent = (family) => {
        const requests = (state) => actors.map((actor, index) => request(family, `${ids.marker}-${family}-${index + 1}`, state, actor));
        cases.push({ name: `V.${family}.concurrent-create`, kind: 'concurrent', operationId: versionBusinessFamilies[family].operationId,
            dependsOn: family === 'pricing' ? [costRead, bidRead] : ['Root.real-current-version-and-children'], expectedStatuses: [201, 201], requests,
            lock: { ...versionBusinessObservationHints.lock, projectId: projects[family], requiredActualWaiters: 2 }, observation: observation(family),
            assert(exchanges, state, evidence) { assertConcurrentVersions({ family, projectId: projects[family], requests: requests(state), exchanges, evidence }); },
        });
    };
    concurrent('cost'); concurrent('bid');
    for (const [name, tail, key] of [[costRead, 'technical-cost-workspace', 'currentPackage'], [bidRead, 'bid-commercial-workspace', 'currentProcess']]) {
        cases.push({ name, kind: 'read', operationId: key === 'currentPackage' ? 'ProjectController_getProjectTechnicalCostWorkspace' : 'ProjectController_getProjectBidCommercialWorkspace',
            dependsOn: ['V.cost.concurrent-create', 'V.bid.concurrent-create'], expectedStatus: 200,
            request: () => ({ actor: actors[0].actor, method: 'GET', path: `/api/projects/${projects.pricing}/${tail}` }),
            assert(exchange) { const reply = response(exchange); assert.equal(reply?.status, 200); assert.ok(reply.body[key]?.isCurrent && reply.body[key].status === 'effective'); assert.equal(reply.body[key].projectId, projects.pricing); },
        });
    }
    concurrent('pricing');
    for (const family of ['cost', 'bid', 'pricing']) {
        const config = versionBusinessFamilies[family];
        for (const table of [config.table, ...config.children.map((child) => child.table)]) {
            const name = `V.${family}.deny-insert.${table}`;
            cases.push({ name, kind: 'fault', operationId: config.operationId, dependsOn: [`V.${family}.concurrent-create`], expectedStatus: 500,
                fault: { owner: 'Root', table, privilege: 'INSERT', requiredWrite: true, restoreInFinally: true },
                request: (state) => request(family, `${ids.marker}-${family}-fault`, state), observation: observation(family),
                assert(exchange, state, evidence) { assertAtomicVersionRollback({ family, projectId: projects[family], exchange, evidence }); },
            });
        }
    }
    for (const reference of ['cost', 'bid']) {
        const requestedId = reference === 'cost' ? ids.staleCostId : ids.staleBidId;
        cases.push({ name: `V.pricing.stale-${reference}-reference`, kind: 'rejected-reference', operationId: versionBusinessFamilies.pricing.operationId,
            dependsOn: [costRead, bidRead, 'V.pricing.concurrent-create'], expectedStatus: 400,
            request: (state) => request('pricing', `${ids.marker}-stale-${reference}`, state, actors[0], reference === 'cost' ? { technicalCostPackageId: requestedId } : { bidCommercialProcessId: requestedId }),
            observation: { projectId: projects.pricing, beforeRows: allVersionTables(), afterRows: allVersionTables(), hints: versionBusinessObservationHints, sameProjectHistoricalReferenceRequired: true },
            assert(exchange, state, evidence) { assertStalePricingReference({ reference, projectId: projects.pricing, requestedId, exchange, evidence }); },
        });
    }
    return {
        kind: 'R3-version-business-regression-pure-definitions', executionByAuthor: false, cases,
        families: versionBusinessFamilies, observationHints: versionBusinessObservationHints,
        requiredPermissions: ['project:read', 'project:write'],
        fixtureRequirements: 'Real current parent and nonempty child seeds in all three families; pricing project current cost/bid and real superseded IDs; distinct writer sessions; isolated case windows; actual IDs only.',
        sourceAnchors: ['EX26/27/28 direct fact-source baselines: replace current without overwriting history', 'project_technical_cost/store.rs lock_project + next_version + supersede', 'project_bid_commercial/service.rs create and store.rs parent/timeline/material', 'project_pricing_margin/service.rs lock-local cost_reference/references and store.rs review/conditions'],
        requiredCounting: { concurrentCreates: 3, pricingSourceReads: 2, parentOrChildInsertFaults: 9, staleReferenceRejections: 2, totalDefinitions: 16 },
        cleanup: 'Root-owned real response IDs only. Preserve all failed/partial receipts and restore every actual privilege in finally.',
    };
}
