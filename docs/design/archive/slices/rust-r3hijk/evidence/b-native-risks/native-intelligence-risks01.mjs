/**
 * RUST-R3I #94: pure original-Native risk vectors, not G2 implementation.
 * Base 7f970c992291c61477eb9bd83a48cec19a769d88; namespace rust-r3hijk only.
 * No imports, top-level execution, direct I/O, schema invocation or host setup.
 * Root alone invokes nativeIntelligenceRisks(ctx), captures SQL/wire originals,
 * prepares facts, restores permissions and closes the owned cohort.
 *
 * Original sources: sales-intelligence.controller.ts:76-237;
 * sales-intelligence.service.ts:162-495,539-687; repository.ts OR/sort reads;
 * shared-contracts.ts:3076-3088,3201-3367; audit-log.entity.ts request_id64;
 * lead-score-facts.service.ts:48-70; lead.service.ts:148-229; existing
 * PATCH /api/leads/{id} recomputes facts, GET /{id}/score-history exposes them.
 * Root's new actual Zod oracle says all three missing-anchor creates produce
 * custom400; the older author input remains an immutable prior risk statement.
 * These functions are definitions only until Root actually runs their HTTP.
 *
 * ctx contract: case/step/expect/ids/build/produceCustomer/produceContact/
 * produceLead/produceProject/rows/row/audit/due/withDenied/observe/
 * concurrentOnRow and prepare as supplied by Root. ctx.expect(opId) must yield
 * a numeric source status (or {nativeStatusSourceExpectation:number}). Actors
 * admin/other both need one original lead|project write permission for CAS.
 *
 * Needed prepare whitelist, always on IDs first produced in this function:
 * customer.status=inactive; customer_contact.status=inactive;
 * lead.status=closed; project.status=closed;
 * opportunity_stakeholder.focus_areas_json = JSONB null/object/13-string array;
 * sales_discovery_record.created_at/updated_at = valid UTC timestamptz text.
 * For focus_areas_json, null means JSONB 'null'::jsonb, NEVER SQL NULL; bind the
 * JSON value through JSON.stringify(value)::jsonb. Original NOT NULL/FK/CHECK
 * constraints stay enabled. No DDL, seed or old-row mutation is requested.
 * These prepared facts are tagged separately, not HTTP producer certification.
 * True discovery timestamp ties retain actual score choice plus original SQL;
 * they do not license adding created_at/id to the score's updated_at-only sort.
 */
export async function nativeIntelligenceRisks(ctx) {
    let ordinal = 0;
    let executedCases = 0;
    const seedTag = String(ctx.ids.customerId).slice(0, 8);
    const rid = () => `i94-${seedTag}-${++ordinal}`;
    const configs = {
        stakeholder: {
            table: 'opportunity_stakeholder', route: '/api/opportunity-stakeholders',
            create: 'OpportunityStakeholderController_create', list: 'OpportunityStakeholderController_list',
            update: 'OpportunityStakeholderController_update',
            full: 'buildStakeholderFullRequest', patch: 'buildStakeholderUpdate',
            event: 'opportunity-stakeholder.updated', command: 'update-opportunity-stakeholder',
            fields: ['role', 'attitude', 'influenceLevel', 'accessLevel', 'focusAreas', 'communicationNotes', 'isPrimary'],
            redacted: ['focusAreas', 'communicationNotes'],
        },
        competitor: {
            table: 'competitor_intelligence_record', route: '/api/competitor-intelligence-records',
            create: 'CompetitorIntelligenceRecordController_create', list: 'CompetitorIntelligenceRecordController_list',
            update: 'CompetitorIntelligenceRecordController_update',
            full: 'buildCompetitorFullRequest', patch: 'buildCompetitorUpdate',
            event: 'competitor-intelligence.updated', command: 'update-competitor-intelligence-record',
            fields: ['competitorName', 'position', 'customerPreference', 'competitorStrengths', 'competitorWeaknesses', 'ourAdvantages', 'ourRisks', 'winProbability', 'evidence'],
            redacted: ['competitorStrengths', 'competitorWeaknesses', 'ourAdvantages', 'ourRisks', 'evidence'],
        },
        discovery: {
            table: 'sales_discovery_record', route: '/api/sales-discovery-records',
            create: 'SalesDiscoveryRecordController_create', list: 'SalesDiscoveryRecordController_list',
            update: 'SalesDiscoveryRecordController_update',
            full: 'buildDiscoveryFullRequest', patch: 'buildDiscoveryUpdate',
            event: 'sales-discovery-record.updated', command: 'update-sales-discovery-record',
            fields: ['procurementProcess', 'budgetSource', 'customerPainPoints', 'decisionCycle', 'nextContactPlan', 'remark'],
            redacted: ['procurementProcess', 'budgetSource', 'customerPainPoints', 'decisionCycle', 'nextContactPlan', 'remark'],
        },
    };
    const allGapItems = ['decision-maker', 'technical-evaluator', 'procurement-process', 'budget-source', 'competitor', 'pain-point', 'next-contact'];
    const gapLabels = {
        'decision-maker': '决策人未知', 'technical-evaluator': '技术把关人未知',
        'procurement-process': '采购流程未知', 'budget-source': '预算来源未知',
        competitor: '竞争对手未知', 'pain-point': '客户核心痛点不明确',
        'next-contact': '下一步接触对象不明确',
    };
    const samples = {};

    function check(value, message) {
        if (!value) throw new Error(message);
    }
    function canonical(value) {
        if (value && typeof value.toJSON === 'function') return canonical(value.toJSON());
        if (Array.isArray(value)) return value.map(canonical);
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
        }
        return value;
    }
    function equal(actual, expected, message) {
        check(JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)), message);
    }
    function copy(value) {
        return JSON.parse(JSON.stringify(value));
    }
    function query(route, anchors) {
        const values = Object.entries(anchors).filter(([, value]) => value !== undefined);
        return route + (values.length ? '?' + values.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&') : '');
    }
    function idsOf(values) {
        return values.map((value) => value.id).sort();
    }
    async function normalStatus(opId) {
        const source = await ctx.expect(opId);
        const status = typeof source === 'number' ? source : source?.nativeStatusSourceExpectation;
        check(Number.isInteger(status), `Root ctx.expect needs original numeric status: ${opId}`);
        return status;
    }
    async function row(table, id) {
        const value = await ctx.row(table, id);
        check(value?.id === id, `Actual owned ${table} row missing`);
        return copy(value);
    }
    async function audits(requestId) {
        const value = await ctx.audit(requestId);
        const result = Array.isArray(value) ? value : value?.rows;
        check(Array.isArray(result), 'Root ctx.audit must return actual rows');
        return result;
    }
    async function group(name) {
        const customer = await ctx.produceCustomer(`I94 ${name}`);
        const contact = await ctx.produceContact(customer.id, `I94 ${name}`);
        const lead = await ctx.produceLead(`I94 ${name}`, { customerId: customer.id });
        // The existing foundation POST permits choosing this owned customer;
        // ctx.produceProject(label) alone need not expose customer overrides.
        const produced = await ctx.step(`I94.${name}.producer.project`, 'POST', '/api/projects', {
            json: { customerId: customer.id, projectName: `I94 ${name} project` },
            requestId: rid(),
        }, 201);
        const project = produced.body;
        check(lead.customerId === customer.id && project.customerId === customer.id && contact.customerId === customer.id, 'Owned producer group must share one real customer');
        return { customer, contact, lead, project, ids: { customerId: customer.id, contactId: contact.id, leadId: lead.id, projectId: project.id } };
    }
    async function create(kind, label, body, options = {}) {
        const config = configs[kind];
        const response = await ctx.step(label, 'POST', config.route, { json: body, requestId: rid(), ...options }, await normalStatus(config.create));
        check(response.body?.id, `${label}: real created ID missing`);
        return response;
    }
    async function list(kind, label, anchors) {
        const config = configs[kind];
        const response = await ctx.step(label, 'GET', query(config.route, anchors), {}, await normalStatus(config.list));
        check(Array.isArray(response.body), `${label}: list must be original array`);
        return response;
    }
    async function gaps(label, anchors, expectedItems) {
        const response = await ctx.step(label, 'GET', query('/api/sales-intelligence-gaps', anchors), {}, await normalStatus('SalesIntelligenceGapController_list'));
        equal(response.body.map((value) => value.item), expectedItems, `${label}: stable gap order`);
        for (const value of response.body) {
            const severity = ['decision-maker', 'procurement-process', 'budget-source'].includes(value.item) ? 'soft-blocker' : 'attention';
            equal(value, { item: value.item, label: gapLabels[value.item], explanation: gapLabels[value.item], isMissing: true, severity }, `${label}: original complete gap shape`);
        }
        return response;
    }
    async function run(name, work) {
        await ctx.case(`I94.${name}`, async () => {
            const value = await work();
            await ctx.observe(`I94.${name}`, value);
            executedCases += 1;
        });
    }
    function auditField(value, redacted) {
        if (!redacted) return value ?? null;
        if (Array.isArray(value)) return { changed: true, count: value.length };
        const text = typeof value === 'string' ? value : '';
        return { changed: true, present: text.length > 0, length: text.length };
    }
    async function patch(kind, label, id, body, options = {}, expected) {
        const config = configs[kind];
        return ctx.step(label, 'PATCH', `${config.route}/${id}`, { json: body, requestId: rid(), ...options }, expected ?? await normalStatus(config.update));
    }

    await run('N1.missing-anchor-custom400', async () => {
        const ids = { customerId: ctx.ids.customerId, contactId: ctx.ids.contactId };
        const requests = {
            stakeholder: ctx.build.buildStakeholderRequest(ids),
            competitor: ctx.build.buildCompetitorRequest(ids, 'I94 anchorless competitor'),
            discovery: ctx.build.buildDiscoveryRequest(ids),
        };
        const outcomes = {};
        for (const [kind, request] of Object.entries(requests)) {
            const response = await ctx.step(`I94.N1.${kind}.create`, 'POST', configs[kind].route, { json: request, requestId: rid() }, 400);
            check(response.body.message === 'Validation failed', `${kind}: original validation body`);
            check(response.body.errors?.some((issue) => issue.code === 'custom' && issue.message === 'At least one opportunity anchor is required' && issue.path.length === 0), `${kind}: inherited anchor refinement custom issue`);
            outcomes[kind] = { request, response };
        }
        const queryResponse = await ctx.step('I94.N1.unknown-only-query', 'GET', query(configs.stakeholder.route, { customerId: ctx.ids.customerId }), {}, 400);
        check(queryResponse.body.errors?.some((issue) => issue.message === 'At least one opportunity anchor is required'), 'Unknown-only query must not create an anchor');
        return { outcomes, queryResponse, basis: 'Root oracle already observed custom400; these are the separate actual HTTP vectors, not a claim that this definition was executed by its author' };
    });

    let active;
    await run('N1N3.three-domain-full-roundtrip', async () => {
        active = await group('roundtrip');
        const outcomes = {};
        for (const [kind, config] of Object.entries(configs)) {
            const marker = `I94 ${kind}`;
            const request = ctx.build[config.full](active.ids, marker);
            const created = await create(kind, `I94.roundtrip.${kind}.create`, request);
            const listed = await list(kind, `I94.roundtrip.${kind}.list`, { leadId: active.lead.id, projectId: active.project.id });
            check(listed.body.some((value) => value.id === created.body.id), `${kind}: actual list must contain producer`);
            const update = ctx.build[config.patch]({}, marker);
            const before = await row(config.table, created.body.id);
            const requestId = rid();
            const changed = await patch(kind, `I94.roundtrip.${kind}.update`, created.body.id, update, { requestId });
            const after = await row(config.table, created.body.id);
            check(after.row_version === before.row_version + 1, `${kind}: managed version increment`);
            check(after.updated_by === ctx.ids.adminUserId, `${kind}: actual actor persisted`);
            for (const field of config.fields) equal(changed.body[field], update[field], `${kind}.${field}: full PATCH response`);
            const actualAudits = await audits(requestId);
            check(actualAudits.length === 1, `${kind}: one changed-field audit`);
            const audit = actualAudits[0];
            check(audit.event_type === config.event && audit.target_id === created.body.id && audit.operator_id === ctx.ids.adminUserId, `${kind}: audit identity`);
            equal(audit.metadata.changedFields, config.fields, `${kind}: source changedFields order`);
            equal(audit.metadata.redactedFields, config.redacted, `${kind}: source redacted subset order`);
            check(audit.metadata.sourceCommand === config.command, `${kind}: sourceCommand`);
            for (const field of config.fields) {
                equal(audit.before_snapshot[field], auditField(created.body[field], config.redacted.includes(field)), `${kind}.${field}: exact before audit summary`);
                equal(audit.after_snapshot[field], auditField(update[field], config.redacted.includes(field)), `${kind}.${field}: exact after audit summary`);
            }
            if (kind === 'stakeholder') {
                for (const field of ['workPhone', 'mobile', 'wechat', 'email', 'remark']) check(!Object.hasOwn(changed.body, field), 'Stakeholder must not expose extra contact fields');
            }
            samples[kind] = { id: created.body.id, config, update };
            outcomes[kind] = { request, created, listed, update, changed, before, after, actualAudits };
        }
        return { active, outcomes, classification: 'Every row and context was produced through actual APIs; audit/SQL ordering comes from Root case markers' };
    });

    await run('N2.same-customer-dual-anchor-OR', async () => {
        const bothId = samples.competitor.id;
        const leadOnlyRequest = ctx.build.buildCompetitorRequest({ customerId: active.customer.id, leadId: active.lead.id }, 'I94 lead only');
        const projectOnlyRequest = ctx.build.buildCompetitorRequest({ customerId: active.customer.id, projectId: active.project.id }, 'I94 project only');
        const leadOnly = await create('competitor', 'I94.OR.lead-only', leadOnlyRequest);
        const projectOnly = await create('competitor', 'I94.OR.project-only', projectOnlyRequest);
        const byLead = await list('competitor', 'I94.OR.list-lead', { leadId: active.lead.id });
        const byProject = await list('competitor', 'I94.OR.list-project', { projectId: active.project.id });
        const both = await list('competitor', 'I94.OR.list-both', { leadId: active.lead.id, projectId: active.project.id });
        equal(idsOf(byLead.body), [bothId, leadOnly.body.id].sort(), 'Lead predicate only');
        equal(idsOf(byProject.body), [bothId, projectOnly.body.id].sort(), 'Project predicate only');
        equal(idsOf(both.body), [bothId, leadOnly.body.id, projectOnly.body.id].sort(), 'OR union with one occurrence of dual-anchor row');
        return { leadOnlyRequest, projectOnlyRequest, leadOnly, projectOnly, byLead, byProject, both, projectSourceLeadId: active.project.sourceLeadId ?? null };
    });

    await run('N2.UUID-spelling-and-priority', async () => {
        const upperCustomer = active.customer.id.toUpperCase();
        check(upperCustomer !== active.customer.id, 'Root must provide UUID with an alphabetic hex unit');
        const request = ctx.build.buildCompetitorRequest({ customerId: upperCustomer, leadId: active.lead.id }, 'I94 uppercase customer');
        const rejected = await ctx.step('I94.UUID.customer-upper', 'POST', configs.competitor.route, { json: request, requestId: rid() }, 400);
        check(rejected.body.message === `Lead ${active.lead.id} does not belong to customer ${upperCustomer}`, 'Original JS customer UUID comparison');
        const upperQuery = await list('competitor', 'I94.UUID.query-upper', { leadId: active.lead.id.toUpperCase(), projectId: active.project.id.toUpperCase() });
        check(upperQuery.body.some((value) => value.id === samples.competitor.id), 'Query UUID PG lookup must not be made stricter');
        const absent = '00000000-0000-0000-0000-000000000000';
        equal(await ctx.rows('lead', { id: absent }), [], 'Nil lead must actually be absent');
        equal(await ctx.rows('project', { id: absent }), [], 'Nil project must actually be absent');
        const missing = await ctx.step('I94.UUID.both-missing', 'GET', query(configs.discovery.route, { leadId: absent, projectId: absent }), {}, 404);
        check(missing.body.message === `Lead ${absent} not found`, 'Lead missing check precedes Project missing');
        return { request, rejected, upperQuery, missing };
    });

    await run('N2.no-added-active-or-state-gates', async () => {
        const owned = await group('inactive');
        await ctx.prepare('customer', owned.customer.id, { status: 'inactive' });
        await ctx.prepare('customer_contact', owned.contact.id, { status: 'inactive' });
        await ctx.prepare('lead', owned.lead.id, { status: 'closed' });
        await ctx.prepare('project', owned.project.id, { status: 'closed' });
        const responses = {};
        for (const [kind, config] of Object.entries(configs)) responses[kind] = await create(kind, `I94.inactive.${kind}`, ctx.build[config.full](owned.ids, `I94 inactive ${kind}`));
        return { owned, responses, classification: 'Real producers first, then explicitly prepared legal statuses; confirms I existence/customer checks, not HTTP close/disable certification' };
    });

    await run('N3.audit-and-business-denial-rollback', async () => {
        const sample = samples.competitor;
        const outcomes = [];
        for (const [table, privilege] of [['audit_log', 'INSERT'], [sample.config.table, 'UPDATE']]) {
            const before = await row(sample.config.table, sample.id);
            const requestId = rid();
            await ctx.due('admin');
            let response;
            await ctx.withDenied(table, privilege, async () => {
                response = await patch('competitor', `I94.denied.${table}`, sample.id, { evidence: `I94 denied ${table}` }, { requestId }, 500);
            });
            const after = await row(sample.config.table, sample.id);
            const actualAudits = await audits(requestId);
            equal(after, before, 'Single-TX failed PATCH preserves full business row');
            equal(actualAudits, [], 'Single-TX failed PATCH leaves no committed field audit');
            check(response.body.message === 'Internal server error', 'Original unknown DB error body');
            outcomes.push({ table, privilege, before, response, after, actualAudits });
        }
        return { outcomes, sessionBoundary: 'Root due/SQL markers retain raw session touch and managed flush separately; no entire-request zero-DML claim' };
    });

    await run('N8.requestId65-changed-noop-and-create', async () => {
        const sample = samples.competitor;
        const longId = `${rid()}-`.padEnd(65, 'r');
        const before = await row(sample.config.table, sample.id);
        await ctx.due('admin');
        const changed = await patch('competitor', 'I94.requestId65.changed', sample.id, { evidence: 'I94 requestId65 changed' }, { requestId: longId }, 500);
        equal(await row(sample.config.table, sample.id), before, 'Overlength audit requestId rollback');
        equal(await audits(longId), [], 'Rejected audit requestId must not be truncated into an audit');
        await ctx.due('other');
        const noop = await patch('competitor', 'I94.requestId65.noop', sample.id, { evidence: before.evidence }, { actor: 'other', requestId: longId });
        const afterNoop = await row(sample.config.table, sample.id);
        equal(afterNoop, before, 'No-op must not rewrite actor/version/business fields');
        check(noop.body.updatedBy === before.updated_by && noop.body.rowVersion === before.row_version, 'No-op response metadata');
        equal(await audits(longId), [], 'No-op without business audit is not given a synthetic audit');
        const createRequest = ctx.build.buildDiscoveryRequest(active.ids);
        const created = await create('discovery', 'I94.requestId65.create', createRequest, { requestId: longId });
        equal(await audits(longId), [], 'Create has no field audit');
        return { longIdLength: longId.length, before, changed, noop, afterNoop, createRequest, created, sessionBoundary: 'No-op may flush managed session; Root original SQL is authoritative' };
    });

    await run('N5.codepoint-versus-audit-UTF16', async () => {
        const sample = samples.stakeholder;
        const emoji = '🙂';
        const requestId = rid();
        const update = { focusAreas: [emoji.repeat(64)], communicationNotes: emoji.repeat(2000) };
        const changed = await patch('stakeholder', 'I94.Unicode.boundary', sample.id, update, { requestId });
        equal(changed.body.focusAreas, update.focusAreas, '64 codepoint focus item');
        check(changed.body.communicationNotes === update.communicationNotes, '2000 codepoint communication text');
        const actualAudits = await audits(requestId);
        check(actualAudits.length === 1, 'Unicode changed-field audit');
        equal(actualAudits[0].metadata.changedFields, ['focusAreas', 'communicationNotes'], 'Unicode fixed field order');
        equal(actualAudits[0].after_snapshot.focusAreas, { changed: true, count: 1 }, 'Array uses item count');
        equal(actualAudits[0].after_snapshot.communicationNotes, { changed: true, present: true, length: 4000 }, 'Audit uses UTF16 units');
        const before = await row(sample.config.table, sample.id);
        const rejected = await patch('stakeholder', 'I94.Unicode.plus-one', sample.id, { communicationNotes: emoji.repeat(2001) }, {}, 400);
        check(rejected.body.errors?.some((issue) => issue.path[0] === 'communicationNotes' && issue.code === 'too_big'), 'Plus-one original DTO issue');
        equal(await row(sample.config.table, sample.id), before, 'DTO rejection leaves business row');
        return { changed, actualAudits, rejected, stored: before, codepointBoundary: 2000, auditUTF16Length: 4000 };
    });

    await run('N7.legal-legacy-focus-JSONB-read', async () => {
        const variants = [
            ['json-null', null, []],
            ['json-object', { legacy: 'retained' }, { legacy: 'retained' }],
            ['over-request-cap', Array.from({ length: 13 }, (_, index) => `legacy-${index}`), Array.from({ length: 13 }, (_, index) => `legacy-${index}`)],
        ];
        const outcomes = [];
        for (const [name, storedValue, expectedOutput] of variants) {
            const created = await create('stakeholder', `I94.focus.${name}.producer`, ctx.build.buildStakeholderRequest(active.ids));
            await ctx.prepare('opportunity_stakeholder', created.body.id, { focus_areas_json: storedValue });
            const prepared = await row('opportunity_stakeholder', created.body.id);
            const listed = await list('stakeholder', `I94.focus.${name}.list`, { leadId: active.lead.id });
            const actual = listed.body.find((value) => value.id === created.body.id);
            check(actual, 'Prepared legacy focus row must remain readable');
            equal(actual.focusAreas, expectedOutput, 'Original focusAreas nullish fallback/raw mapper');
            let changed = null;
            if (name === 'json-object') {
                changed = await patch('stakeholder', 'I94.focus.object.unrelated-patch', created.body.id, { isPrimary: true });
                equal(changed.body.focusAreas, expectedOutput, 'Unrelated PATCH does not revalidate old focus shape');
            }
            outcomes.push({ name, created, prepared, listed, changed });
        }
        return { outcomes, classification: 'Only initial empty-array rows were actual HTTP writes; legacy JSONB values are explicitly prepared legal reads/patch facts, never accepted request claims' };
    });

    await run('N6.stable-gaps-latest-and-score-sort', async () => {
        const owned = await group('latest');
        const anchor = { leadId: owned.lead.id, projectId: owned.project.id };
        const initial = await gaps('I94.gaps.initial', anchor, allGapItems);
        const decision = await create('stakeholder', 'I94.gaps.decision', ctx.build.buildStakeholderRequest({ ...owned.ids, overrides: { role: 'decision-maker', isPrimary: false } }));
        const technical = await create('stakeholder', 'I94.gaps.technical', ctx.build.buildStakeholderRequest({ ...owned.ids, overrides: { role: 'technical-evaluator', isPrimary: false } }));
        const competitor = await create('competitor', 'I94.gaps.competitor', ctx.build.buildCompetitorRequest(owned.ids, 'I94 gaps unknown-default competitor'));
        const complete = await create('discovery', 'I94.gaps.complete', ctx.build.buildDiscoveryFullRequest(owned.ids, 'I94 complete'));
        const completedGaps = await gaps('I94.gaps.complete-list', anchor, []);
        async function score(name) {
            const before = await row('lead', owned.lead.id);
            const changed = await ctx.step(`I94.score.${name}.refresh-via-update`, 'PATCH', `/api/leads/${owned.lead.id}`, {
                json: { leadName: `I94 latest ${name}`, expectedVersion: before.row_version }, requestId: rid(),
            }, 200);
            const history = await ctx.step(`I94.score.${name}.history`, 'GET', `/api/leads/${owned.lead.id}/score-history`, {}, 200);
            const facts = history.body.snapshots[0]?.componentBreakdown?.salesIntelligenceFacts;
            check(facts && typeof facts.nextContactKnown === 'boolean', 'Actual H score snapshot must expose I facts');
            return { before, changed, history, facts };
        }
        const allKnown = { decisionMakerKnown: true, technicalEvaluatorKnown: true, procurementProcessKnown: true, budgetSourceKnown: true, competitorKnown: true, painPointKnown: true, nextContactKnown: true };
        const completeScore = await score('complete');
        equal(completeScore.facts, allKnown, 'H actual snapshot consumes complete I producer facts');
        const empty = await create('discovery', 'I94.gaps.new-empty', ctx.build.buildDiscoveryRequest(owned.ids));
        await ctx.prepare('sales_discovery_record', complete.body.id, { updated_at: '2027-01-02T00:00:00.000Z', created_at: '2029-01-01T00:00:00.000Z' });
        await ctx.prepare('sales_discovery_record', empty.body.id, { updated_at: '2027-01-03T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' });
        const expectedMissing = ['procurement-process', 'budget-source', 'pain-point', 'next-contact'];
        const latestGaps = await gaps('I94.gaps.latest-empty', anchor, expectedMissing);
        const emptyKnown = { decisionMakerKnown: true, technicalEvaluatorKnown: true, procurementProcessKnown: false, budgetSourceKnown: false, competitorKnown: true, painPointKnown: false, nextContactKnown: false };
        const latestScore = await score('latest-empty');
        equal(latestScore.facts, emptyKnown, 'Latest empty record must not merge old complete facts');
        await ctx.prepare('sales_discovery_record', complete.body.id, { updated_at: '2027-02-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' });
        await ctx.prepare('sales_discovery_record', empty.body.id, { updated_at: '2027-02-01T00:00:00.000Z', created_at: '2028-01-01T00:00:00.000Z' });
        const tieGaps = await gaps('I94.gaps.tie-created-desc', anchor, expectedMissing);
        const tieScore = await score('tie-observe');
        check([allKnown, emptyKnown].some((value) => JSON.stringify(canonical(value)) === JSON.stringify(canonical(tieScore.facts))), 'A true updated_at tie may select either original candidate');
        return {
            owned, initial, decision, technical, competitor, complete, completedGaps, completeScore,
            empty, latestGaps, latestScore, tieGaps, tieScore,
            originalGapOrder: ['updated_at DESC', 'created_at DESC'],
            originalScoreOrder: ['updated_at DESC'],
            classification: 'Real producers and H updates, then prepared legal timestamps. Root SQL markers must retain the two distinct ORDER BY shapes; actual true-tie score choice is observed, not a new deterministic tie policy',
        };
    });

    await run('N4.two-reader-managed-CAS', async () => {
        const created = await create('discovery', 'I94.CAS.producer', ctx.build.buildDiscoveryFullRequest(active.ids, 'I94 CAS'));
        const before = await row('sales_discovery_record', created.body.id);
        const path = `${configs.discovery.route}/${created.body.id}`;
        const requests = [
            { actor: 'admin', method: 'PATCH', path, json: { remark: 'I94 CAS admin' } },
            { actor: 'other', method: 'PATCH', path, json: { remark: 'I94 CAS other' } },
        ];
        const race = await ctx.concurrentOnRow('sales_discovery_record', created.body.id, requests);
        const responses = Array.isArray(race) ? race : race?.responses;
        check(Array.isArray(responses) && responses.length === 2, 'Root race must expose two actual responses');
        equal(responses.map((value) => value.status).sort((a, b) => a - b), [200, 500], 'Original managed CAS source expectation, not client-version409');
        const winnerIndex = responses.findIndex((value) => value.status === 200);
        const winner = responses[winnerIndex];
        const after = await row('sales_discovery_record', created.body.id);
        check(after.row_version === before.row_version + 1 && after.remark === winner.body.remark, 'Single successful managed update');
        check(after.updated_by === (winnerIndex === 0 ? ctx.ids.adminUserId : ctx.ids.otherUserId), 'Persisted CAS winner actor');
        const actualAudits = await ctx.rows('audit_log', { target_id: created.body.id });
        check(actualAudits.length === 1 && actualAudits[0].event_type === configs.discovery.event, 'Losing same-TX audit must roll back');
        if (winner.requestId != null) check(actualAudits[0].request_id === winner.requestId, 'Committed audit belongs to actual winner');
        return { created, before, requests, race, after, actualAudits, classification: 'Actual two-reader barrier and SQL/wire evidence owned by Root; this definition itself does not certify a race outcome or Gate' };
    });

    await ctx.observe('I94.native-risk-vectors.terminal', {
        definedCases: 11,
        completedCaseCallbacks: executedCases,
        allCaseCallbacksCompleted: executedCases === 11,
        meaning: 'Only Root invocation creates actual Native observations; author wrote definitions only',
        originalInputsRewritten: false,
        G1SelfCertified: false,
        G2ImplementationClaim: false,
    });
}
