/**
 * Definition only. Root logs in, owns Playwright, and invokes this function in
 * each Windows/Linux x Native/Rust combination. Author B never executes it.
 * No imports, launch, DB, fixture mutation, mocks, route interception, page
 * evaluate, Angular state injection, or APIRequestContext calls are used.
 * Responses below are read only after actual original-UI navigation/actions.
 *
 * Required ctx:
 *   baseUrl: http://127.0.0.1:12600 (or the Root-selected original UI origin)
 *   observe(name, data): Root's actual evidence recorder
 *   ids.customer, ids.customerDisplayName, ids.lead, ids.project,
 *   ids.contact, ids.contactName. ID values may be UUID strings or real row
 *   objects with .id. customer/contact names may also come from those objects.
 *
 * Exact fixture requirements:
 * - Full-permission real actor, already logged in by Root; no login here.
 * - Dedicated real Customer and ACTIVE #90 Contact belonging to that Customer;
 *   contactName is unique among that Customer's active contact options.
 * - Dedicated real registered Lead under that Customer, not yet converted,
 *   with no existing I stakeholder/competitor/discovery rows (initial gaps=7).
 * - A separate real H-converted Project under the same Customer. Its actual
 *   sourceLeadId is read from the page's own GET /api/projects/{id} response.
 * - At least one unique, short, single-line lead-target discussion on that
 *   source Lead, produced through real HTTP or the original UI before its H
 *   conversion. Optional ids.sourceLeadDiscussionId/body pin that real row.
 *   A converted Lead's original dialog now writes discussions to its Project;
 *   this journey cannot manufacture a new source-lead-target UI entry there.
 * - Fresh fixture set per combination/rerun. Created IDs are returned and
 *   emitted for Root-owned terminal cleanup; this function does not delete.
 * Optional ctx.journeyMarker selects unique short visible fixture text.
 *
 * Original UI limits (must not become invented UI acceptance):
 * - I has create/list/gaps controls, but no visible update controls for any of
 *   its three record types, and no delete API/UI. Contact editing is #90.
 * - J has create/list/type/body/pinned/key-conclusion controls, but no related
 *   Contact/FollowUp/Competitor selectors, and no edit/delete operation here.
 * - UI discovery creation requires at least one populated text field even
 *   though the existing API accepts an empty discovery record.
 * - K is guidance/timeline reading; no R4 write acceptance is claimed.
 *
 * Source anchors, unchanged original files:
 * apps/poms-admin/src/app.routes.ts:22,42,72,236
 * apps/poms-admin/src/app/shared/ui/sales-intelligence-panel.ts:
 *   271-278 actions; 330-465 lists/gaps; 519-671 dialogs;
 *   973-1060 create handlers; 1080 contact options; 1223 write anchor preference.
 * apps/poms-admin/src/app/shared/ui/business-discussion-panel.ts:
 *   73-121 actions/list; 123-163 dialog; 240-266 create; 294 read filters.
 * apps/poms-admin/src/app/features/customer/customer-workspace.ts:454-469
 * apps/poms-admin/src/app/features/lead/lead-list.ts:774,870-894,1512-1524
 * apps/poms-admin/src/app/features/project/project-detail.ts:206,229,421-442
 * apps/poms-admin/src/app/features/project/project-workspace-shell.ts:39-94
 * apps/poms-admin/src/app/features/project/project-workspace-home.ts:16-57
 * apps/poms-admin/src/app/shared/ui/project-lifecycle-timeline.ts:29-80,238
 * libs/admin/data-access/src/lib/sales-intelligence/sales-intelligence.store.ts:61-101
 * libs/admin/data-access/src/lib/business-discussion/business-discussion.store.ts:25-55
 */

const gapOrder = [
    'decision-maker', 'technical-evaluator', 'procurement-process', 'budget-source',
    'competitor', 'pain-point', 'next-contact',
];

const invariant = (condition, message) => {
    if (!condition) throw new Error(message);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idOf = (value) => typeof value === 'string' ? value : value?.id;

export async function intelligenceDiscussionJourney(page, ctx) {
    invariant(page && typeof page.getByRole === 'function', 'Root must supply its real Playwright Page');
    invariant(ctx && typeof ctx.observe === 'function', 'Root must supply ctx.observe(name, data)');
    const ids = ctx.ids ?? {};
    const customerId = idOf(ids.customer);
    const leadId = idOf(ids.lead);
    const projectId = idOf(ids.project);
    const contactId = idOf(ids.contact);
    const customerName = ids.customerDisplayName ?? ids.customer?.displayName;
    const contactName = ids.contactName ?? ids.contact?.name;
    for (const [name, value] of Object.entries({ customerId, leadId, projectId, contactId, customerName, contactName })) {
        invariant(typeof value === 'string' && value.length > 0, `UI fixture requires real ${name}`);
    }
    invariant(typeof ctx.baseUrl === 'string' && ctx.baseUrl.length > 0, 'Root must supply its original UI baseUrl');
    const base = ctx.baseUrl.replace(/\/$/, '');
    const marker = ctx.journeyMarker ?? `IJK-UI-${leadId}`;
    const created = { stakeholders: [], competitors: [], discoveries: [], discussions: [] };
    const unavailable = [
        { operations: ['OpportunityStakeholderController_update', 'CompetitorIntelligenceRecordController_update', 'SalesDiscoveryRecordController_update'], reason: 'Original SalesIntelligencePanel articles expose no edit control; data-store methods are not UI entry points', uiWriteAcceptance: false },
        { operations: ['I-delete'], reason: 'No existing I delete API or UI', uiWriteAcceptance: false },
        { operations: ['J-related-contact', 'J-related-follow-up', 'J-related-competitor'], reason: 'Original discussion dialog has no related-object selectors', uiWriteAcceptance: false },
        { operations: ['R4-approval-completion-archive-write'], reason: 'K journey reads existing guidance/timeline only', uiWriteAcceptance: false },
    ];
    let stage = 'preconditions';
    const observe = async (name, data) => ctx.observe(`IJK-original-ui.${name}`, data);

    const matches = ({ method = 'GET', path, params = {} }) => (response) => {
        const url = new URL(response.url());
        return response.request().method() === method && url.pathname === path
            && Object.entries(params).every(([key, value]) => url.searchParams.get(key) === value);
    };

    const readExchange = async (label, response, expectedStatus) => {
        const raw = await response.text();
        let body;
        try { body = JSON.parse(raw); } catch {
            await observe(`${label}.non-json`, { method: response.request().method(), url: response.url(), status: response.status(), raw });
            throw new Error(`${label}: original UI did not receive JSON`);
        }
        const request = response.request();
        const requestJson = request.method() === 'POST' ? request.postDataJSON() : null;
        const result = { method: request.method(), url: response.url(), status: response.status(), requestJson, body };
        // Login/cookie/header evidence remains with Root. These are only the
        // synthetic business request/response values generated by this UI.
        await observe(label, result);
        invariant(result.status === expectedStatus, `${label}: observed HTTP ${result.status}, expected original ${expectedStatus}`);
        return result;
    };

    const collect = async (label, specs, action) => {
        // Register all response observers before the real visible UI action.
        const waits = specs.map((spec) => page.waitForResponse(matches(spec)));
        const outputs = await Promise.all([action(), ...waits]);
        const result = {};
        for (let index = 0; index < specs.length; index += 1) {
            const spec = specs[index];
            result[spec.key] = await readExchange(`${label}.${spec.key}`, outputs[index + 1], spec.status ?? 200);
        }
        return result;
    };

    const textVisible = async (scope, text) => {
        // Labels such as a gap's label/explanation intentionally repeat in the
        // original template; either copy is the same visible business content.
        await scope.getByText(text, { exact: true }).first().waitFor({ state: 'visible' });
    };
    const card = (scope, heading) => scope.locator('section-card').filter({
        // The `has` locator is relative to each section-card, not prefixed by
        // an outer dialog locator; interactions still use visible roles/labels.
        has: page.getByRole('heading', { name: heading, exact: true }),
    });
    const articleWith = (scope, text) => scope.getByRole('article').filter({ hasText: text });
    const choose = async (dialog, label, option) => {
        await dialog.getByLabel(label, { exact: true }).click();
        await page.getByRole('option', typeof option === 'string'
            ? { name: option, exact: true } : { name: option }).click();
    };
    const assertGaps = async (panel, exchange, expectedItems) => {
        invariant(Array.isArray(exchange.body), 'gaps response must be the original array');
        invariant(JSON.stringify(exchange.body.map((gap) => gap.item)) === JSON.stringify(expectedItems), 'gaps item order differs from the expected original fact state');
        await textVisible(panel, `${expectedItems.length} 项待补`);
        if (expectedItems.length === 0) await textVisible(panel, '暂无情报缺口结果。');
        await observe(`${stage}.gaps-visible`, { items: expectedItems, visibleCount: expectedItems.length, url: page.url() });
    };
    const assertCreatedAnchor = (exchange, anchor, value) => {
        invariant(typeof exchange.body.id === 'string', 'UI create response must supply its actual new id');
        invariant(exchange.requestJson.customerId === customerId, 'UI write customer differs from actual current context');
        invariant(exchange.requestJson[anchor] === value, 'UI write did not retain its source anchor');
        const other = anchor === 'leadId' ? 'projectId' : 'leadId';
        invariant(exchange.requestJson[other] === undefined, 'Original writeOpportunityAnchors must send only its preferred anchor');
        invariant(exchange.body[anchor] === value && exchange.body[other] === null, 'Stored UI-created anchor differs from the actual request');
    };

    const createDiscussion = async (panel, label, targetType, targetId, body, params, flags = {}) => {
        await panel.getByRole('button', { name: '新增讨论', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '新增业务讨论', exact: true });
        await dialog.waitFor({ state: 'visible' });
        await choose(dialog, '讨论类型', flags.typeLabel ?? '一般讨论');
        await dialog.getByLabel('讨论内容', { exact: true }).fill(body);
        if (flags.pinned) await dialog.getByLabel('置顶', { exact: true }).setChecked(true);
        if (flags.keyConclusion) await dialog.getByLabel('关键结论', { exact: true }).setChecked(true);
        const exchanges = await collect(label, [
            { key: 'created', method: 'POST', path: '/api/business-discussions', status: 201 },
            { key: 'listed', path: '/api/business-discussions', params },
        ], () => dialog.getByRole('button', { name: '发布讨论', exact: true }).click());
        await dialog.waitFor({ state: 'hidden' });
        invariant(exchanges.created.requestJson.targetObjectType === targetType && exchanges.created.requestJson.targetObjectId === targetId, 'Discussion UI wrote to a different target');
        invariant(exchanges.created.body.body === body, 'Discussion immediate body differs from visible form');
        invariant(Array.isArray(exchanges.listed.body) && exchanges.listed.body.filter((item) => item.id === exchanges.created.body.id).length === 1, 'New UI discussion must occur exactly once in the refreshed list');
        await articleWith(panel, body).waitFor({ state: 'visible' });
        if (flags.pinned) await textVisible(articleWith(panel, body), '置顶');
        if (flags.keyConclusion) await textVisible(articleWith(panel, body), '关键结论');
        created.discussions.push({ id: exchanges.created.body.id, targetObjectType: targetType, targetObjectId: targetId, body });
        return exchanges;
    };

    const createCompetitor = async (panel, label, anchor, anchorId) => {
        await panel.getByRole('button', { name: '竞争态势', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '记录竞争态势', exact: true });
        const name = `${marker} ${label}`;
        await dialog.getByLabel('竞争对手', { exact: true }).fill(name);
        await choose(dialog, '竞争位置', '明确竞争对手');
        await choose(dialog, '客户倾向', '倾向我方');
        await choose(dialog, '胜率判断', '高');
        for (const [field, value] of Object.entries({ 对手优势: `${name} strengths`, 对手短板: `${name} weaknesses`, 我方优势: `${name} advantages`, 我方风险: `${name} risks`, 依据: `${name} evidence` })) {
            await dialog.getByLabel(field, { exact: true }).fill(value);
        }
        const exchanges = await collect(`${label}.competitor`, [
            { key: 'created', method: 'POST', path: '/api/competitor-intelligence-records', status: 201 },
            { key: 'gaps', path: '/api/sales-intelligence-gaps', params: { [anchor]: anchorId } },
        ], () => dialog.getByRole('button', { name: '保存竞争态势', exact: true }).click());
        await dialog.waitFor({ state: 'hidden' });
        assertCreatedAnchor(exchanges.created, anchor, anchorId);
        await articleWith(panel, name).waitFor({ state: 'visible' });
        await textVisible(articleWith(panel, name), `${name} advantages`);
        await textVisible(articleWith(panel, name), `${name} risks`);
        created.competitors.push({ id: exchanges.created.body.id, anchor, anchorId, competitorName: name });
        return exchanges;
    };

    try {
        await observe('entry-boundaries', { classification: 'source-backed-original-UI-scope', unavailable, originalContactsIssue: 90 });
        stage = 'customer';
        const customer = await collect('customer.initial', [
            { key: 'detail', path: `/api/customers/${customerId}` },
            { key: 'discussions', path: '/api/business-discussions', params: { customerId } },
        ], () => page.goto(`${base}/customers/${encodeURIComponent(customerId)}`, { waitUntil: 'domcontentloaded' }));
        invariant(customer.detail.body.id === customerId && customer.detail.body.displayName === customerName, 'Customer UI fixture identity/name differs from its producer');
        await page.getByRole('heading', { name: customerName, exact: true }).waitFor({ state: 'visible' });
        const relations = card(page, '客户关系');
        await textVisible(relations, contactName);
        for (const action of ['关系人', '竞争态势', '销售发现']) {
            invariant(await relations.getByRole('button', { name: action, exact: true }).count() === 0, 'Customer-only context must not invent an opportunity-write UI');
        }
        await observe('customer.relations-visible', { customerId, contactId, contactName, opportunityWriteControls: 0, source: 'CustomerWorkspace customer-only SalesIntelligencePanel; existing #90 contact is read, not recreated' });
        const customerDiscussion = await createDiscussion(card(page, '客户业务讨论'), 'customer.discussion', 'customer', customerId,
            `${marker} customer collaboration`, { customerId }, { pinned: true });

        stage = 'registered-lead';
        const lead = await collect('lead.initial', [
            { key: 'detail', path: `/api/leads/${leadId}` },
            { key: 'gaps', path: '/api/sales-intelligence-gaps', params: { leadId } },
            { key: 'discussions', path: '/api/business-discussions', params: { customerId, leadId } },
        ], () => page.goto(`${base}/leads?leadId=${encodeURIComponent(leadId)}`, { waitUntil: 'domcontentloaded' }));
        invariant(lead.detail.body.id === leadId && lead.detail.body.customerId === customerId && lead.detail.body.status === 'registered' && lead.detail.body.convertedProjectId === null,
            'UI fixture requires a real registered, unconverted Lead under the supplied Customer');
        const leadDialog = page.getByRole('dialog', { name: '线索详情', exact: true });
        await leadDialog.waitFor({ state: 'visible' });
        const intelligence = card(leadDialog, '销售情报');
        await intelligence.getByRole('heading', { name: '情报缺口', exact: true }).waitFor({ state: 'visible' });
        await assertGaps(intelligence, lead.gaps, gapOrder);
        await textVisible(intelligence, contactName);
        invariant(lead.discussions.body.some((comment) => comment.id === customerDiscussion.created.body.id), 'Lead read must include the actual customer-target UI discussion');

        for (const [index, role, label] of [[0, 'decision-maker', '决策人'], [1, 'technical-evaluator', '技术把关人']]) {
            await intelligence.getByRole('button', { name: '关系人', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: '记录机会关系人', exact: true });
            await choose(dialog, '联系人', new RegExp(`^${escapeRegex(contactName)}(?: ·|$)`));
            await choose(dialog, '角色', label);
            await choose(dialog, '态度', '支持');
            await choose(dialog, '影响力', '高');
            await choose(dialog, '可接触程度', '已建立直接联系');
            await dialog.getByLabel('关注点', { exact: true }).fill(`${marker}预算，${marker}交付`);
            const notes = `${marker} ${label} relationship`;
            await dialog.getByLabel('沟通备注', { exact: true }).fill(notes);
            const exchanges = await collect(`lead.stakeholder.${role}`, [
                { key: 'created', method: 'POST', path: '/api/opportunity-stakeholders', status: 201 },
                { key: 'gaps', path: '/api/sales-intelligence-gaps', params: { leadId } },
            ], () => dialog.getByRole('button', { name: '保存关系人', exact: true }).click());
            await dialog.waitFor({ state: 'hidden' });
            assertCreatedAnchor(exchanges.created, 'leadId', leadId);
            invariant(exchanges.created.body.contactId === contactId && exchanges.created.body.role === role, 'Visible contact/role selection did not produce the supplied real contact/selected role');
            invariant(JSON.stringify(exchanges.created.requestJson.focusAreas) === JSON.stringify([`${marker}预算`, `${marker}交付`]), 'UI comma parsing altered focus order/content');
            invariant(exchanges.created.requestJson.isPrimary === false, 'Fresh relationship form should retain original false default');
            await articleWith(intelligence, notes).waitFor({ state: 'visible' });
            await textVisible(articleWith(intelligence, notes), label);
            created.stakeholders.push({ id: exchanges.created.body.id, leadId, contactId, role, notes });
            await assertGaps(intelligence, exchanges.gaps, gapOrder.slice(index + 1));
        }

        const competitor = await createCompetitor(intelligence, 'lead', 'leadId', leadId);
        await assertGaps(intelligence, competitor.gaps, ['procurement-process', 'budget-source', 'pain-point', 'next-contact']);

        await intelligence.getByRole('button', { name: '销售发现', exact: true }).click();
        const discoveryDialog = page.getByRole('dialog', { name: '补充销售发现', exact: true });
        await discoveryDialog.getByRole('button', { name: '保存销售发现', exact: true }).click();
        await textVisible(discoveryDialog, '请至少补充一项销售发现。');
        await observe('lead.discovery-empty-form', { classification: 'original-frontend-validation-only', message: '请至少补充一项销售发现。', apiEmptyDiscoveryAcceptanceClaim: false });
        const discoveryFields = {
            采购流程: `${marker} procurement`, 预算来源: `${marker} budget`, 客户痛点: `${marker} pain`,
            决策周期: `${marker} cycle`, 下一步接触计划: `${marker} next contact`, 备注: `${marker} discovery remark`,
        };
        for (const [field, value] of Object.entries(discoveryFields)) await discoveryDialog.getByLabel(field, { exact: true }).fill(value);
        const discovery = await collect('lead.discovery', [
            { key: 'created', method: 'POST', path: '/api/sales-discovery-records', status: 201 },
            { key: 'gaps', path: '/api/sales-intelligence-gaps', params: { leadId } },
        ], () => discoveryDialog.getByRole('button', { name: '保存销售发现', exact: true }).click());
        await discoveryDialog.waitFor({ state: 'hidden' });
        assertCreatedAnchor(discovery.created, 'leadId', leadId);
        created.discoveries.push({ id: discovery.created.body.id, leadId, remark: discoveryFields.备注 });
        await articleWith(intelligence, discoveryFields.备注).waitFor({ state: 'visible' });
        await assertGaps(intelligence, discovery.gaps, []);

        const leadDiscussion = await createDiscussion(card(leadDialog, '业务讨论'), 'lead.discussion', 'lead', leadId,
            `${marker} lead intelligence conclusion`, { customerId, leadId }, { typeLabel: '情报补充', keyConclusion: true });
        const leadReload = await collect('lead.explicit-ui-refresh', [
            { key: 'stakeholders', path: '/api/opportunity-stakeholders', params: { leadId } },
            { key: 'competitors', path: '/api/competitor-intelligence-records', params: { leadId } },
            { key: 'discovery', path: '/api/sales-discovery-records', params: { leadId } },
            { key: 'gaps', path: '/api/sales-intelligence-gaps', params: { leadId } },
        ], () => intelligence.getByRole('button', { name: '刷新', exact: true }).click());
        for (const record of created.stakeholders) invariant(leadReload.stakeholders.body.some((row) => row.id === record.id), 'UI refresh lost an actual stakeholder create');
        invariant(leadReload.competitors.body.some((row) => row.id === competitor.created.body.id), 'UI refresh lost actual competitor');
        invariant(leadReload.discovery.body.some((row) => row.id === discovery.created.body.id), 'UI refresh lost actual discovery');
        await assertGaps(intelligence, leadReload.gaps, []);
        await observe('lead.available-ui-delivered', { created, unavailableIUpdates: unavailable[0], url: page.url() });

        stage = 'converted-project';
        const project = await collect('project.initial', [
            { key: 'detail', path: `/api/projects/${projectId}` },
            { key: 'timeline', path: `/api/projects/${projectId}/timeline` },
            { key: 'discussions', path: '/api/business-discussions', params: { projectId } },
            { key: 'gaps', path: '/api/sales-intelligence-gaps', params: { projectId } },
        ], () => page.goto(`${base}/projects/${encodeURIComponent(projectId)}`, { waitUntil: 'domcontentloaded' }));
        invariant(project.detail.body.id === projectId && project.detail.body.customerId === customerId && typeof project.detail.body.sourceLeadId === 'string', 'Project fixture must be an actual H conversion under the same Customer');
        const sourceLeadId = project.detail.body.sourceLeadId;
        invariant(sourceLeadId !== leadId, 'Registered Lead and already converted source Lead must be separate fixture rows');
        const discussionQuery = new URL(project.discussions.url).searchParams;
        invariant(discussionQuery.get('leadId') === sourceLeadId && discussionQuery.get('customerId') === customerId, 'Original Project UI must request its true source Lead and Customer with projectId');
        invariant(new URL(project.gaps.url).searchParams.get('leadId') === sourceLeadId, 'Project I list/gaps must retain both actual sourceLead and Project read anchors');
        const projectDiscussionPanel = card(page, '项目业务讨论');
        await projectDiscussionPanel.getByRole('heading', { name: '项目业务讨论', exact: true }).waitFor({ state: 'visible' });
        invariant(project.discussions.body.some((comment) => comment.id === customerDiscussion.created.body.id), 'Project discussion list must include actual customer discussion');
        invariant(!project.discussions.body.some((comment) => comment.id === leadDiscussion.created.body.id), 'Project aggregation must not invent an unrelated same-customer Lead target');
        const sourceComments = project.discussions.body.filter((comment) => comment.targetObjectType === 'lead' && comment.targetObjectId === sourceLeadId);
        const sourceComment = ids.sourceLeadDiscussionId
            ? sourceComments.find((comment) => comment.id === ids.sourceLeadDiscussionId)
            : ids.sourceLeadDiscussionBody
                ? sourceComments.find((comment) => comment.body === ids.sourceLeadDiscussionBody)
                : sourceComments[0];
        if (!sourceComment) {
            await observe('project.source-lead-fixture-missing', { classification: 'fixture-precondition-not-product-failure', sourceLeadId, projectId, sourceLeadAggregation: 'not-covered', required: 'a real lead-target discussion produced on this source Lead through real HTTP or original UI before conversion' });
            throw new Error('UI_FIXTURE_SOURCE_LEAD_DISCUSSION_REQUIRED: no real source-lead-target discussion to exercise aggregation');
        }
        const sourceArticle = articleWith(projectDiscussionPanel, sourceComment.body);
        await sourceArticle.waitFor({ state: 'visible' });
        await textVisible(sourceArticle, `线索 · ${sourceComment.targetTitle}`);
        await observe('project.source-lead-aggregation-visible', { sourceLeadId, projectId, discussionId: sourceComment.id, body: sourceComment.body, targetTitle: sourceComment.targetTitle, evidenceSource: 'actual original Project UI GET and visible article', sourceLeadCommentWriteViaThisJourney: false });

        const projectIntelligence = card(page, '项目销售情报');
        await projectIntelligence.getByRole('heading', { name: '情报缺口', exact: true }).waitFor({ state: 'visible' });
        await createCompetitor(projectIntelligence, 'project', 'projectId', projectId);
        const projectDiscussion = await createDiscussion(projectDiscussionPanel, 'project.discussion', 'project', projectId,
            `${marker} project risk decision`, { customerId, leadId: sourceLeadId, projectId }, { typeLabel: '风险提醒', pinned: true, keyConclusion: true });
        invariant(projectDiscussion.listed.body.filter((comment) => comment.id === sourceComment.id).length === 1, 'Refreshed Project list must retain source Lead discussion once');
        await sourceArticle.waitFor({ state: 'visible' });

        stage = 'workspace-read';
        await page.getByRole('heading', { name: '项目生命周期', exact: true }).waitFor({ state: 'visible' });
        invariant(project.timeline.body.projectId === projectId && Array.isArray(project.timeline.body.events), 'Timeline response must belong to the actual Project');
        await observe('project.timeline-visible', { projectId, url: page.url(), events: project.timeline.body.events, source: 'ProjectDetail original lifecycle component and actual page-triggered timeline GET', R4WriteAcceptance: false });
        const workspace = await collect('workspace.navigation', [
            { key: 'guidance', path: `/api/projects/${projectId}/workspace-guidance` },
        ], () => page.getByRole('button', { name: '项目工作区', exact: true }).click());
        await page.waitForURL((url) => url.pathname === `/projects/${projectId}/workspace`);
        await page.getByRole('heading', { name: '工作区导航', exact: true }).waitFor({ state: 'visible' });
        await page.getByRole('heading', { name: '推荐入口', exact: true }).waitFor({ state: 'visible' });
        const guidance = workspace.guidance.body;
        for (const field of ['headline', 'currentStageLabel', 'currentFocus', 'currentGap', 'nextStep', 'ownerLabel']) {
            if (typeof guidance[field] === 'string' && guidance[field].length > 0) await textVisible(page, guidance[field]);
        }
        await observe('workspace.guidance-visible', { projectId, url: page.url(), guidance, source: 'visible ProjectDetail 项目工作区 button -> original workspace shell/home; actual UI-triggered guidance GET', R4WriteAcceptance: false });
        const result = {
            status: 'completed-available-original-ui', customerId, leadId, projectId, sourceLeadId,
            created, sourceLeadDiscussionReadId: sourceComment.id, unavailable,
            coveredIThroughUI: ['stakeholder-create-list', 'competitor-create-list', 'discovery-create-list', 'gaps-seven-to-zero', 'project-preferred-write-anchor'],
            coveredJThroughUI: ['customer-create-list', 'registered-lead-create-list', 'project-create-list', 'source-lead-read-aggregation', 'customer-read-aggregation', 'type-pinned-key-conclusion-controls'],
            coveredKThroughUI: ['project-lifecycle-timeline-read', 'workspace-guidance-read'],
            IUpdateOrDeleteUIAcceptance: false, R4WriteAcceptance: false,
        };
        await observe('completed', result);
        return result;
    } catch (error) {
        await observe('failed', { stage, message: error instanceof Error ? error.message : String(error), created, unavailable, url: page.url() });
        throw error;
    }
}
