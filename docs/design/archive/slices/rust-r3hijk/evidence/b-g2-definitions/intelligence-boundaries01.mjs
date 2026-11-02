/**
 * RUST-R3I supplemental request definitions only; not execution evidence.
 *
 * Authority: unchanged b-input/acceptance-matrix.json (89 requirements),
 * shared-contracts.ts:3077-3088,3201-3367 and the original controllers.
 * No imports, IO, schema execution, clocks, UUID generation, environment,
 * database/DDL, self-run, assertions or product changes.
 *
 * Root supplies actual current-run Customer/Lead/Project/Contact producer IDs:
 *   ctxcustomerId (customerId is also accepted as the old builder input key),
 *   leadId, projectId, contactId; admin/other/org/sourceCode remain optional.
 * missingUUID is optional and must be an actually verified absent UUID.
 * Optional stakeholderId/competitorId/discoveryId must identify real records
 * produced through the corresponding I HTTP create operation in both runs.
 * A missing-row response is never evidence of a successful business PATCH.
 *
 * 48 unconditional request definitions, two only when missingUUID is supplied,
 * plus 7/6/5 PATCH definitions when the three corresponding real IDs are supplied
 * (48-68 total). Valid schema requests deliberately have no expected HTTP status.
 * expectedStatus:400 is only attached to source-invalid DTO/query requests;
 * authorized guards and the original parser are prerequisites for reaching DTO.
 *
 * query is an ordinary query object, except two explicit parser vectors where
 * query is the exact raw query string. Root must send those strings unchanged;
 * repeated/bracket keys are not to be collapsed into a preferred scalar value.
 *
 * JSONB legacy reads/prepared rows, session/audit/CAS faults, and stored-score
 * observations remain Root-owned cases. This file does not pretend HTTP can
 * create legacy JSONB object/null values rejected by the original request DTO.
 */

const resources = Object.freeze({
    stakeholder: {
        route: '/api/opportunity-stakeholders',
        list: 'OpportunityStakeholderController_list',
        create: 'OpportunityStakeholderController_create',
        update: 'OpportunityStakeholderController_update',
        createSchema: 'CreateOpportunityStakeholderRequestSchema',
        updateSchema: 'UpdateOpportunityStakeholderRequestSchema',
    },
    competitor: {
        route: '/api/competitor-intelligence-records',
        list: 'CompetitorIntelligenceRecordController_list',
        create: 'CompetitorIntelligenceRecordController_create',
        update: 'CompetitorIntelligenceRecordController_update',
        createSchema: 'CreateCompetitorIntelligenceRecordRequestSchema',
        updateSchema: 'UpdateCompetitorIntelligenceRecordRequestSchema',
    },
    discovery: {
        route: '/api/sales-discovery-records',
        list: 'SalesDiscoveryRecordController_list',
        create: 'SalesDiscoveryRecordController_create',
        update: 'SalesDiscoveryRecordController_update',
        createSchema: 'CreateSalesDiscoveryRecordRequestSchema',
        updateSchema: 'UpdateSalesDiscoveryRecordRequestSchema',
    },
    gaps: {
        route: '/api/sales-intelligence-gaps',
        list: 'SalesIntelligenceGapController_list',
    },
});

const without = (value, key) => Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
);

export function buildIntelligenceBoundaryCases(ids = {}) {
    const customerId = ids.ctxcustomerId ?? ids.customerId;
    const { leadId, projectId, contactId, missingUUID } = ids;
    const upper = (value) => typeof value === 'string' ? value.toUpperCase() : value;
    const mutant = (value, index, replacement) => typeof value === 'string'
        ? `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`
        : value;
    const query = { leadId, projectId };
    const stakeholder = { ...query, customerId, contactId, role: 'unknown' };
    const competitor = { ...query, customerId, competitorName: 'I supplemental competitor' };
    const discovery = { ...query, customerId };
    const cases = [];

    const list = (kind, name, input, requirementIds, invalid = false, extra = {}) => {
        const resource = resources[kind];
        cases.push({
            name: `I-boundary.${name}`, operationId: resource.list,
            method: 'GET', path: resource.route, query: input,
            schemaName: 'OpportunityContextQuerySchema', requirementIds,
            fixtureRequirement: 'Root-supplied real opportunity context; no status/owner/active gate assumed',
            ...(invalid ? { expectedStatus: 400 } : {}), ...extra,
        });
    };
    const create = (kind, name, json, requirementIds, invalid = false, extra = {}) => {
        const resource = resources[kind];
        cases.push({
            name: `I-boundary.${name}`, operationId: resource.create,
            method: 'POST', path: resource.route, json,
            schemaName: resource.createSchema, requirementIds,
            fixtureRequirement: 'Root-supplied real Customer/Lead/Project and, for stakeholder, real #90 Contact',
            ...(invalid ? { expectedStatus: 400 } : {}), ...extra,
        });
    };
    const patch = (kind, id, name, json, requirementIds, invalid = false, extra = {}) => {
        const resource = resources[kind];
        cases.push({
            name: `I-boundary.${name}`, operationId: resource.update,
            method: 'PATCH', path: `${resource.route}/${id}`, json,
            schemaName: resource.updateSchema, requirementIds,
            fixtureRequirement: `Root must retain the actual ${kind} HTTP create receipt for this supplied id; absent-row checks do not certify this PATCH`,
            ...(invalid ? { expectedStatus: 400 } : {}), ...extra,
        });
    };

    // Q01-Q12: root refinement, non-coercion, original UUID spelling, and the
    // actual Express query parser's repeated/structured parameter boundary.
    list('stakeholder', 'query.no-anchor', {}, ['I-QUERY-01'], true);
    list('competitor', 'query.unknown-only', { unknown: 'retained-only-before-strip' }, ['I-QUERY-01'], true);
    list('discovery', 'query.customer-only', { customerId }, ['I-QUERY-01'], true);
    list('gaps', 'query.blank-lead', { leadId: '' }, ['I-QUERY-02'], true);
    list('stakeholder', 'query.invalid-project', { projectId: 'not-a-uuid' }, ['I-QUERY-02'], true);
    list('competitor', 'query.uuid-no-trim', { leadId: ` ${leadId} ` }, ['I-QUERY-02'], true);
    list('discovery', 'query.uuid-version-zero', { leadId: mutant(leadId, 14, '0') }, ['I-QUERY-02'], true);
    list('gaps', 'query.uuid-invalid-variant', { projectId: mutant(projectId, 19, '7') }, ['I-QUERY-02'], true);
    list('stakeholder', 'query.repeated-lead',
        `leadId=${encodeURIComponent(leadId)}&leadId=${encodeURIComponent(leadId)}`,
        ['I-QUERY-03'], true, { parserProbe: 'two same-name scalar parameters; retain raw bytes and actual parsed value' });
    list('competitor', 'query.bracket-project',
        `projectId%5Bkey%5D=${encodeURIComponent(projectId)}`,
        ['I-QUERY-03'], true, { parserProbe: 'bracket key; capture actual parser/refinement error rather than choosing a synthetic scalar' });
    list('discovery', 'query.project-plus-unknown', { projectId, customerId: 'not-a-uuid', limit: 0, unknown: [] }, ['I-QUERY-01', 'I-QUERY-04']);
    list('gaps', 'query.uppercase-two-anchors', { leadId: upper(leadId), projectId: upper(projectId) }, ['I-QUERY-02', 'I-QUERY-04']);

    // S01-S12: request JSONB shape is constrained even though legal old JSONB
    // rows may contain other shapes. None of these creates prepared old facts.
    create('stakeholder', 'stakeholder.body-null', null, ['I-DTO-01'], true);
    create('stakeholder', 'stakeholder.missing-contact', without(stakeholder, 'contactId'), ['I-DTO-01'], true);
    create('stakeholder', 'stakeholder.role-null', { ...stakeholder, role: null }, ['I-DTO-05'], true);
    create('stakeholder', 'stakeholder.optional-enums-and-boolean-not-nullable', {
        ...stakeholder, attitude: null, influenceLevel: null, accessLevel: null, isPrimary: 'false',
    }, ['I-DTO-05', 'I-DTO-08'], true);
    create('stakeholder', 'stakeholder.focus-null', { ...stakeholder, focusAreas: null }, ['I-DTO-06'], true);
    create('stakeholder', 'stakeholder.focus-object-length-property', { ...stakeholder, focusAreas: { length: 13, legacy: true } }, ['I-DTO-06'], true);
    create('stakeholder', 'stakeholder.focus-thirteen-items', { ...stakeholder, focusAreas: Array.from({ length: 13 }, (_, index) => `tag-${index}`) }, ['I-DTO-06'], true);
    create('stakeholder', 'stakeholder.focus-twelve-items', { ...stakeholder, focusAreas: Array.from({ length: 12 }, (_, index) => `tag-${index}`) }, ['I-DTO-06']);
    create('stakeholder', 'stakeholder.focus-empty-item', { ...stakeholder, focusAreas: [''] }, ['I-DTO-06'], true);
    create('stakeholder', 'stakeholder.focus-emoji64', { ...stakeholder, focusAreas: ['🙂'.repeat(64)] }, ['I-DTO-06', 'I-DTO-12']);
    create('stakeholder', 'stakeholder.focus-emoji65', { ...stakeholder, focusAreas: ['🙂'.repeat(65)] }, ['I-DTO-06', 'I-DTO-12'], true);
    create('stakeholder', 'stakeholder.focus-trim-duplicates-order', { ...stakeholder, focusAreas: ['\ufeff预算 ', '预算', '交付'] }, ['I-DTO-06', 'I-AUDIT-ARRAY-01']);

    // C01-C09: scalar limits are source Unicode code points; optional enums
    // reject null, while five optional texts retain explicit-null presence.
    create('competitor', 'competitor.body-array', [], ['I-DTO-01'], true);
    create('competitor', 'competitor.missing-name', without(competitor, 'competitorName'), ['I-DTO-01', 'I-DTO-09'], true);
    create('competitor', 'competitor.name-trim-to-empty', { ...competitor, competitorName: '\ufeff\u00a0 ' }, ['I-DTO-09', 'I-DTO-12'], true);
    create('competitor', 'competitor.name-emoji255', { ...competitor, competitorName: '🙂'.repeat(255) }, ['I-DTO-09', 'I-DTO-12']);
    create('competitor', 'competitor.name-emoji256', { ...competitor, competitorName: '🙂'.repeat(256) }, ['I-DTO-09', 'I-DTO-12'], true);
    create('competitor', 'competitor.optional-enums-null', { ...competitor, position: null, customerPreference: null, winProbability: null }, ['I-DTO-09'], true);
    create('competitor', 'competitor.all-nullable-texts-null', {
        ...competitor, competitorStrengths: null, competitorWeaknesses: null,
        ourAdvantages: null, ourRisks: null, evidence: null,
    }, ['I-DTO-10', 'I-CREATE-02']);
    create('competitor', 'competitor.unknown-server-fields-strip', {
        ...competitor, id: missingUUID, rowVersion: -7, expectedVersion: 0,
        createdAt: 'not-a-date', updatedAt: null, createdBy: ids.other, updatedBy: ids.admin,
        unknown: { nested: ['no-new-persistence-field'] },
    }, ['I-DTO-04']);
    create('competitor', 'competitor.evidence-bmp2001', { ...competitor, evidence: 'e'.repeat(2001) }, ['I-DTO-10'], true);

    // D01-D09: optional empty discovery remains legitimate; null is different
    // from missing, and request strings never coerce arrays/objects/booleans.
    create('discovery', 'discovery.body-number', 0, ['I-DTO-01'], true);
    create('discovery', 'discovery.customer-null', { ...discovery, customerId: null }, ['I-DTO-01', 'I-DTO-03'], true);
    create('discovery', 'discovery.all-six-texts-null', {
        ...discovery, procurementProcess: null, budgetSource: null, customerPainPoints: null,
        decisionCycle: null, nextContactPlan: null, remark: null,
    }, ['I-DTO-11', 'I-CREATE-02']);
    create('discovery', 'discovery.budget-emoji1000', { ...discovery, budgetSource: '🙂'.repeat(1000) }, ['I-DTO-11', 'I-DTO-12']);
    create('discovery', 'discovery.budget-emoji1001', { ...discovery, budgetSource: '🙂'.repeat(1001) }, ['I-DTO-11', 'I-DTO-12'], true);
    create('discovery', 'discovery.procurement-bmp2001', { ...discovery, procurementProcess: 'p'.repeat(2001) }, ['I-DTO-11'], true);
    create('discovery', 'discovery.remark-bom-and-nbsp-trim', { ...discovery, remark: '\ufeff\u00a0retained\u00a0\ufeff' }, ['I-DTO-11', 'I-DTO-12']);
    create('discovery', 'discovery.remark-nel-and-zero-width-not-trim', { ...discovery, remark: '\u0085\u200b' }, ['I-DTO-11', 'I-DTO-12']);
    create('discovery', 'discovery.six-wrong-text-types', {
        ...discovery, procurementProcess: [], budgetSource: { length: 1001 }, customerPainPoints: false,
        decisionCycle: 1, nextContactPlan: {}, remark: ['not-a-string'],
    }, ['I-DTO-11'], true);

    // U01-U06: valid UUID spelling and valid-schema database edge probes.
    // No success/DB-error expectation is manufactured for these requests.
    create('competitor', 'uuid.uppercase-customer-is-not-canonicalized', { ...competitor, customerId: upper(customerId) }, ['I-DTO-03', 'I-ANCHOR-03']);
    create('stakeholder', 'uuid.uppercase-inputs-remain-original-strings', {
        ...stakeholder, customerId: upper(customerId), leadId: upper(leadId), contactId: upper(contactId),
    }, ['I-DTO-03', 'I-ANCHOR-03']);
    create('stakeholder', 'jsonb.focus-lone-surrogate-schema-versus-storage', { ...stakeholder, focusAreas: ['\ud800'] }, ['I-DTO-06', 'I-DTO-12'], false, { boundary: 'source-valid string item; observe actual JSONB storage error and residual rows separately' });
    create('stakeholder', 'jsonb.focus-nul-schema-versus-storage', { ...stakeholder, focusAreas: ['\u0000'] }, ['I-DTO-06', 'I-DTO-12'], false, { boundary: 'source-valid string item; not a request-level NUL ban' });
    create('competitor', 'text.name-lone-surrogate-immediate-versus-reread', { ...competitor, competitorName: '\ud800' }, ['I-DTO-09', 'I-DTO-12'], false, { boundary: 'capture immediate wire, stored text and later GET independently; create has no field audit' });
    create('discovery', 'text.remark-nul-schema-versus-storage', { ...discovery, remark: '\u0000' }, ['I-DTO-11', 'I-DTO-12'], false, { boundary: 'source-valid string; observe actual text storage error without relabelling it DTO400' });

    if (typeof missingUUID === 'string' && missingUUID.length > 0) {
        list('discovery', 'context.both-anchors-verified-missing', { leadId: missingUUID, projectId: missingUUID }, ['I-QUERY-05', 'I-ANCHOR-01'], false, { boundary: 'Root verifies both rows are absent; valid UUID shape is not a DTO failure expectation' });
        create('stakeholder', 'context.verified-missing-contact-after-opportunity', { ...stakeholder, contactId: missingUUID }, ['I-ANCHOR-06'], false, { boundary: 'Root verifies absent Contact and real valid opportunity context; no invented row or business-success claim' });
    }

    if (typeof ids.stakeholderId === 'string' && ids.stakeholderId.length > 0) {
        const id = ids.stakeholderId;
        patch('stakeholder', id, 'patch.stakeholder.empty', {}, ['I-PATCH-01'], true);
        patch('stakeholder', id, 'patch.stakeholder.unknown-only', {
            customerId, leadId, projectId, contactId, rowVersion: 1, expectedVersion: 1, createdAt: 'ignored',
        }, ['I-PATCH-01'], true);
        patch('stakeholder', id, 'patch.stakeholder.null-false-empty-array', {
            communicationNotes: null, focusAreas: [], isPrimary: false,
        }, ['I-PATCH-04']);
        patch('stakeholder', id, 'patch.stakeholder.valid-plus-immutable-fields', {
            role: 'finance-legal', customerId: null, leadId: 'not-a-uuid', projectId: [], contactId: 0,
            id: missingUUID, rowVersion: -1, expectedVersion: 0, updatedBy: ids.other,
        }, ['I-PATCH-02']);
        patch('stakeholder', id, 'patch.stakeholder.focus-string-is-not-array', { focusAreas: '🙂'.repeat(7) }, ['I-DTO-06', 'I-PATCH-03'], true);
        patch('stakeholder', id, 'patch.stakeholder.redacted-lone-surrogate-text', { communicationNotes: '\ud800' }, ['I-DTO-12', 'I-AUDIT-UTF16-01'], false, { boundary: 'real PATCH only; capture UTF16 audit summary, immediate text and stored replacement separately' });
        patch('stakeholder', id, 'patch.stakeholder.focus-order-and-duplicates', { focusAreas: ['b', 'a', 'b'] }, ['I-AUDIT-ARRAY-01'], false, { boundary: 'compare against captured actual before array; do not sort, deduplicate or presume a change without before evidence' });
    }

    if (typeof ids.competitorId === 'string' && ids.competitorId.length > 0) {
        const id = ids.competitorId;
        patch('competitor', id, 'patch.competitor.empty', {}, ['I-PATCH-01'], true);
        patch('competitor', id, 'patch.competitor.unknown-only', { customerId, leadId, projectId, expectedVersion: 1, rowVersion: 1, updatedAt: null }, ['I-PATCH-01'], true);
        patch('competitor', id, 'patch.competitor.all-five-nullable-texts-clear', {
            competitorStrengths: null, competitorWeaknesses: null, ourAdvantages: null, ourRisks: null, evidence: null,
        }, ['I-PATCH-04']);
        patch('competitor', id, 'patch.competitor.valid-plus-immutable-fields', {
            competitorName: ' I supplemental revised ', customerId: false, leadId: [], projectId: 'not-a-uuid',
            expectedVersion: 0, rowVersion: -1, createdBy: ids.other, updatedBy: ids.admin,
        }, ['I-PATCH-02']);
        patch('competitor', id, 'patch.competitor.evidence-bmp2000', { evidence: 'e'.repeat(2000) }, ['I-DTO-10', 'I-PATCH-03']);
        patch('competitor', id, 'patch.competitor.nonredacted-name-lone-surrogate', { competitorName: '\ud800' }, ['I-DTO-12', 'I-AUDIT-NONREDACTED-01'], false, { boundary: 'real row and before snapshot required; observe JSONB audit failure/rollback without predicting an outcome from missing-row lookup' });
    }

    if (typeof ids.discoveryId === 'string' && ids.discoveryId.length > 0) {
        const id = ids.discoveryId;
        patch('discovery', id, 'patch.discovery.empty', {}, ['I-PATCH-01'], true);
        patch('discovery', id, 'patch.discovery.unknown-only', { customerId, leadId, projectId, expectedVersion: 1, rowVersion: 1, createdAt: null }, ['I-PATCH-01'], true);
        patch('discovery', id, 'patch.discovery.all-six-nullable-texts-clear', {
            procurementProcess: null, budgetSource: null, customerPainPoints: null, decisionCycle: null, nextContactPlan: null, remark: null,
        }, ['I-PATCH-04']);
        patch('discovery', id, 'patch.discovery.valid-plus-immutable-fields', {
            remark: '\ufeff retained remark \ufeff', customerId: {}, leadId: null, projectId: 0,
            expectedVersion: -1, rowVersion: 0, updatedBy: ids.other,
        }, ['I-PATCH-02', 'I-DTO-12']);
        patch('discovery', id, 'patch.discovery.mixed-null-and-codepoint-boundaries', {
            procurementProcess: null, budgetSource: null, customerPainPoints: null, decisionCycle: null,
            nextContactPlan: '🙂'.repeat(1000), remark: 'e\u0301'.repeat(1000),
        }, ['I-PATCH-03', 'I-PATCH-04', 'I-DTO-12'], false, { boundary: 'two code points per combining pair; no normalization; audit text length remains UTF16' });
    }

    return cases;
}
