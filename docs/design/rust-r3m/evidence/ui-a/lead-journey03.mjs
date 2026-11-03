// Definition only: importing this module neither opens a browser nor runs a
// journey. Root supplies an already logged-in Playwright Page and calls it.
// All business writes below are visible original Angular UI interactions.
// Network responses are observed for evidence/real IDs, never used to replace
// a UI operation. No route mocks, evaluate/state injection, HTTP client, I/O,
// environment access, browser launch, clock, or generated fixture IDs.
// Revision 03 retains 02's complete journey and source-labelled buttons. It
// fills the real conversion datepicker and observes request/response/GET/UI.
// Pinned revisions 01/02 and their actual outcomes are never rewritten here.
import assert from 'node:assert/strict';

/**
 * Required ctx:
 *   baseUrl: actual original UI origin, e.g. http://127.0.0.1:12600
 *   ids: { customerId, customerDisplayName, leadId, sourceCode, sourceName }
 *   observe(name, value): Root-owned recording callback, sync or async.
 * ids.customer/lead/project may instead be real producer objects with id.
 *
 * The primary supplied leadId must be this UI run's registered editable Lead,
 * linked to the supplied active Customer, with an existing active source,
 * non-null real owner/org, and no pending/approved score override. It is edited,
 * then qualified and converted: isolate it per platform/backend combination.
 * Root's full-permission actor is already logged in; authentication is not
 * implemented or certified here. Customer/source visible labels must be unique
 * in their dropdowns. Keep the UI-only dataset small enough for the primary
 * Lead to be in the customer-filtered table's current page.
 *
 * Root must create the Page's BrowserContext with timezoneId: 'Asia/Tokyo'.
 * Optional ctx.options: { createLead:false, scoreOverrides:false,
 * qualifyAndConvert:false, plannedSignDate:'2026-12-01' }. The optional date is
 * a local yyyy-mm-dd day, filled into the visible yy-mm-dd PrimeNG input.
 * Defaults execute every branch. Disabling a branch
 * records an explicit omission; there is no silent fallback from failed UI
 * creation to a prepared row and no claim that prepared rows certify UI create.
 *
 * Actual newly created Lead/Project IDs are returned and sent to observe.
 * A supplied ids.projectId is reference metadata only; the conversion project
 * in this journey is identified from its real UI-triggered response and URL.
 */
export async function leadJourney(page, ctx) {
    assert.equal(typeof ctx?.observe, 'function', 'Root must provide ctx.observe');
    const ids = ctx.ids ?? {};
    const realId = (value) => typeof value === 'string' ? value : value?.id;
    const customerId = ids.customerId ?? realId(ids.customer);
    const customerName = ids.customerDisplayName ?? ids.customer?.displayName;
    const primaryLeadId = ids.leadId ?? realId(ids.lead);
    const sourceCode = ids.sourceCode;
    const sourceName = ids.sourceName;
    for (const [name, value] of Object.entries({ customerId, customerName, primaryLeadId, sourceCode, sourceName, baseUrl: ctx.baseUrl })) {
        assert.equal(typeof value, 'string', `Root must supply actual ${name}`);
        assert.ok(value.length > 0, `Root must supply nonempty ${name}`);
    }
    const options = ctx.options ?? {};
    const result = {
        preparedLeadId: primaryLeadId,
        preparedProjectId: ids.projectId ?? realId(ids.project) ?? null,
        uiCreatedLeadId: null,
        editedLeadId: null,
        convertedProjectId: null,
        executed: [],
        omitted: [],
    };
    const observe = async (name, value) => { await ctx.observe(`lead.ui.${name}`, value); };
    const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const endpoint = (response) => new URL(response.url()).pathname;
    const leadPath = `/api/leads/${primaryLeadId}`;
    const historyPath = `${leadPath}/score-history`;
    const timeout = ctx.timeoutMs ?? 30_000;

    // Every locator below is anchored to the protected original source.
    await observe('locator-source-anchors', {
        definition: 'lead-journey03',
        labelledButtons: 'Source p-button[label] descendant button:visible, scoped to its unique row/dialog; native 历史 button uses its source label attribute.',
        route: 'apps/poms-admin/src/app.routes.ts:42 /leads; :236 /projects/:id',
        workbench: 'apps/poms-admin/src/app/features/lead/lead-list.ts:264,289 visible filter aria-labels; :337 search placeholder; :340,342 named comboboxes',
        row: 'lead-list.ts:398-402 title button and visible leadNo; :454 查看',
        create: 'lead-list.ts:494 登记线索 dialog; :501-652 native labels/inputId; :662 submit; :1781-1813 real store create',
        edit: 'lead-list.ts:667 编辑线索 dialog; :678-758 labels/inputId; :769 保存修改; :1815-1840 update with current rowVersion',
        detail: 'lead-list.ts:774 线索详情 dialog; :802 历史; :919 编辑信息; :928 确认有效; :934 转入项目',
        score: 'lead-list.ts:945 评分历史与人工覆盖; :1009-1055 approve/reject/revoke placeholders/buttons; :1072-1098 submit form; :2014-2087 original actions',
        qualify: 'lead-list.ts:1225 确认线索有效; :1254 summary placeholder; :1262 确认有效; :2106-2120 real action',
        convert: 'lead-list.ts:1267 转入项目; :1291 customer project no; :1303 name; :1308-1315 visible 预计签约日期/inputId=plannedSignAt/dateFormat=yy-mm-dd; :1325 button; :2173 corrected Date.toISOString and navigation',
        project: 'apps/poms-admin/src/app/features/project/project-detail.ts:191-193 context header; :396-397 预计签约 and date yyyy-MM-dd; :911 real loadProject GET; shared/ui/project-context-header.ts:27 h1 title',
    });

    const waitResponse = (method, path, check = () => true) => page.waitForResponse((response) =>
        response.request().method() === method && endpoint(response) === path && check(new URL(response.url())),
    { timeout }).then((response) => ({ response }), (error) => ({ error }));

    const recordResponse = async (name, response, expectedStatus) => {
        let body;
        try { body = await response.json(); } catch { body = { nonJsonBody: await response.text() }; }
        let request = null;
        try { request = response.request().postDataJSON(); } catch { request = response.request().postData(); }
        await observe(name, {
            evidence: 'observed real response caused by the preceding UI interaction',
            method: response.request().method(), url: response.url(), status: response.status(), request, body,
        });
        assert.equal(response.status(), expectedStatus, `${name}: original UI request status`);
        return body;
    };

    const ui = async (name, method, path, status, action, config = {}) => {
        const responsePromise = waitResponse(method, path, config.queryCheck);
        const refreshPromise = config.refreshHistory ? waitResponse('GET', historyPath) : null;
        await action();
        const observed = await responsePromise;
        if (observed.error) throw observed.error;
        const body = await recordResponse(name, observed.response, status);
        let history = null;
        if (refreshPromise) {
            const refreshed = await refreshPromise;
            if (refreshed.error) throw refreshed.error;
            history = await recordResponse(`${name}.history-refresh`, refreshed.response, 200);
            assert.equal(history.leadId, primaryLeadId);
        }
        result.executed.push(name);
        return { body, history, response: observed.response };
    };

    const dialog = (name) => page.getByRole('dialog', { name, exact: true });
    const labelledButton = (scope, label) => scope.locator(`p-button[label="${label}"] button:visible`);
    const select = async (control, optionName) => {
        await control.click();
        const option = page.getByRole('option', { name: optionName, exact: true });
        await option.waitFor({ state: 'visible', timeout });
        assert.equal(await option.count(), 1, 'The real visible dropdown label must identify exactly one option');
        await option.click();
    };
    const namedSelect = (label, optionName) => select(page.getByRole('combobox', { name: label, exact: true }), optionName);
    // PrimeNG exposes these source inputId values on its focusable form control.
    // Labels/options are still visible UI. This does not access Angular internals.
    const formSelect = (scope, inputId, optionName) => select(scope.locator(`[id="${inputId}"]`), optionName);
    const closeDialog = async (scope) => {
        await labelledButton(scope, '关闭').click();
        await scope.waitFor({ state: 'hidden', timeout });
    };

    const initial = await ui('workbench.initial', 'GET', '/api/leads', 200,
        () => page.goto(new URL('/leads', ctx.baseUrl).href),
        { queryCheck: (url) => !url.searchParams.get('keyword') });
    await page.getByRole('heading', { name: '线索分布', exact: true }).waitFor({ state: 'visible', timeout });
    assert.ok(Array.isArray(initial.body.items));
    await ui('workbench.registered-scope', 'GET', '/api/leads', 200,
        () => page.getByRole('button', { name: '筛选待确认线索', exact: true }).click(),
        { queryCheck: (url) => url.searchParams.get('scope') === 'registered' });
    await ui('workbench.my-ownership', 'GET', '/api/leads', 200,
        () => namedSelect('按归属筛选', '我的'),
        { queryCheck: (url) => url.searchParams.get('ownershipScope') === 'mine' });
    await ui('workbench.public-pool', 'GET', '/api/leads', 200,
        () => namedSelect('按归属筛选', '公共池'),
        { queryCheck: (url) => url.searchParams.get('ownershipScope') === 'public-pool' });
    await ui('workbench.all-ownership', 'GET', '/api/leads', 200,
        () => namedSelect('按归属筛选', '全部'),
        { queryCheck: (url) => url.searchParams.get('ownershipScope') === 'all' });
    await ui('workbench.rating-filter', 'GET', '/api/leads', 200,
        () => namedSelect('按评级筛选', 'A级'),
        { queryCheck: (url) => url.searchParams.get('rating') === 'A' });
    await ui('workbench.rating-reset', 'GET', '/api/leads', 200,
        () => namedSelect('按评级筛选', '全部评级'),
        { queryCheck: (url) => !url.searchParams.has('rating') });
    const customerList = await ui('workbench.customer-search', 'GET', '/api/leads', 200,
        () => page.getByPlaceholder('搜索线索、客户、销售主责', { exact: true }).fill(customerName),
        { queryCheck: (url) => url.searchParams.get('keyword') === customerName });
    let primary = customerList.body.items.find((lead) => lead.id === primaryLeadId);
    assert.ok(primary, 'The supplied real registered Lead must be in the visible customer-filtered page');
    assert.equal(primary.status, 'registered');
    assert.equal(primary.customerId, customerId);
    await observe('workbench.visible-fixture-row', {
        leadId: primary.id, leadNo: primary.leadNo, leadName: primary.leadName,
        customerId: primary.customerId, filteredItems: customerList.body.items.map((lead) => lead.id),
        scope: customerList.body.scope, summary: customerList.body.summary, facets: customerList.body.facets,
    });

    if (options.createLead !== false) {
        await page.getByRole('button', { name: '登记线索', exact: true }).click();
        const create = dialog('登记线索');
        await create.waitFor({ state: 'visible', timeout });
        const newName = `H93 UI登记 ${customerName}`;
        await create.getByLabel('线索标题', { exact: true }).fill(newName);
        await formSelect(create, 'leadCustomerId', new RegExp(`^${esc(customerName)}（[^）]+）$`));
        await formSelect(create, 'leadSourceCode', sourceName);
        await create.getByLabel('需求描述', { exact: true }).fill('通过原 Angular 页面登记，客户需求、采购范围、预算来源与后续沟通安排均已确认。');
        await formSelect(create, 'budgetStatus', '预算已确认');
        await formSelect(create, 'leadUrgency', '高');
        await create.getByLabel('预计金额', { exact: true }).fill('1200000.25');
        const created = await ui('create.real-ui-submit', 'POST', '/api/leads', 201,
            () => labelledButton(create, '登记线索').click());
        assert.equal(created.body.customerId, customerId);
        assert.equal(created.body.sourceCode, sourceCode);
        assert.equal(created.body.leadName, newName);
        assert.ok(typeof created.body.id === 'string' && created.body.id.length > 0);
        result.uiCreatedLeadId = created.body.id;
        await create.waitFor({ state: 'hidden', timeout });
        await observe('create.actual-product-id', { leadId: created.body.id, origin: 'UI POST response body', uiCreateObserved: true });
    } else {
        result.omitted.push('UI create');
        await observe('create.omitted', { reason: 'Root explicitly selected prepared-row mode', uiCreateObserved: false });
    }

    const row = page.getByRole('row').filter({ hasText: primary.leadNo });
    await row.waitFor({ state: 'visible', timeout });
    assert.equal(await row.count(), 1, 'The visible real leadNo must identify exactly one table row');
    const opened = await ui('detail.open-from-visible-row', 'GET', leadPath, 200,
        () => labelledButton(row, '查看').click());
    primary = opened.body;
    const detail = dialog('线索详情');
    await detail.waitFor({ state: 'visible', timeout });
    await detail.getByRole('heading', { name: primary.leadName, exact: true }).waitFor({ state: 'visible', timeout });
    assert.ok(primary.ownerUserId && primary.ownerOrgId, 'Primary real fixture must have owner/org so the UI can reach qualify/convert');
    await observe('detail.rendered', { id: primary.id, text: await detail.innerText() });

    await labelledButton(detail, '编辑信息').click();
    const edit = dialog('编辑线索');
    await edit.waitFor({ state: 'visible', timeout });
    const editedName = `${primary.leadName} · UI修订`;
    await edit.getByLabel('线索标题', { exact: true }).fill(editedName);
    await formSelect(edit, 'editLeadSourceCode', sourceName);
    await edit.getByLabel('需求描述', { exact: true }).fill('原 Angular UI 已核实需求和采购范围，预算与预计金额已经确认，销售主责及归口组织保持可追溯。');
    await formSelect(edit, 'editBudgetStatus', '预算已确认');
    await formSelect(edit, 'editLeadUrgency', '高');
    await edit.getByLabel('预计金额', { exact: true }).fill('1200000.25');
    const edited = await ui('edit.real-ui-save', 'PATCH', leadPath, 200,
        () => labelledButton(edit, '保存修改').click());
    assert.equal(edited.body.id, primaryLeadId);
    assert.equal(edited.body.leadName, editedName);
    assert.ok(edited.body.rowVersion > primary.rowVersion);
    result.editedLeadId = edited.body.id;
    await edit.waitFor({ state: 'hidden', timeout });
    await detail.getByRole('heading', { name: editedName, exact: true }).waitFor({ state: 'visible', timeout });
    await observe('edit.refreshed-detail', { id: primaryLeadId, text: await detail.innerText() });

    const scoreOpen = await ui('score.history-open', 'GET', historyPath, 200,
        () => detail.locator('button[label="历史"]:visible').click());
    const historyDialog = dialog('评分历史与人工覆盖');
    await historyDialog.waitFor({ state: 'visible', timeout });
    await historyDialog.getByText('评分快照', { exact: true }).waitFor({ state: 'visible', timeout });
    await observe('score.history-rendered', { id: primaryLeadId, text: await historyDialog.innerText() });
    if (options.scoreOverrides !== false) {
        assert.equal(scoreOpen.body.pendingOverride, null, 'Primary UI fixture must start without a pending override');
        assert.equal(scoreOpen.body.activeOverride, null, 'Primary UI fixture must start without an approved override');
        const submit = async (score, reason, name) => {
            await historyDialog.getByLabel('覆盖分数', { exact: true }).fill(String(score));
            await historyDialog.getByLabel('覆盖原因', { exact: true }).fill(reason);
            const response = await ui(name, 'POST', `${leadPath}/score-overrides`, 201,
                () => labelledButton(historyDialog, '提交覆盖申请').click(), { refreshHistory: true });
            assert.equal(response.body.status, 'pending');
            assert.equal(response.history.pendingOverride.id, response.body.id);
            await historyDialog.getByText('待审批覆盖', { exact: true }).waitFor({ state: 'visible', timeout });
            return response;
        };
        const first = await submit(80, '原 UI 已核实关键商务事实，申请按实际判断覆盖。', 'score.submit-first');
        await historyDialog.getByPlaceholder('批准备注，可留空', { exact: true }).fill('原 UI 审批已复核覆盖依据。');
        const approved = await ui('score.approve', 'POST', `/api/lead-score-overrides/${first.body.id}:approve`, 200,
            () => labelledButton(historyDialog, '批准').click(), { refreshHistory: true });
        assert.equal(approved.history.activeOverride.id, first.body.id);
        assert.equal(approved.history.pendingOverride, null);
        await historyDialog.getByText('生效中的人工覆盖', { exact: true }).waitFor({ state: 'visible', timeout });
        await observe('score.approved-overlay-rendered', { overrideId: first.body.id, text: await historyDialog.innerText() });
        await historyDialog.getByPlaceholder('撤销原因', { exact: true }).fill('原 UI 验证完成，恢复存储的系统评分。');
        const revoked = await ui('score.revoke', 'POST', `/api/lead-score-overrides/${first.body.id}:revoke`, 200,
            () => labelledButton(historyDialog, '撤销覆盖').click(), { refreshHistory: true });
        assert.equal(revoked.history.activeOverride, null);
        assert.ok(revoked.history.snapshots.some((snapshot) => snapshot.snapshotKind === 'override-revoked' && snapshot.overrideId === null && snapshot.sourceRecordId === first.body.id));
        const second = await submit(79, '原 UI 第二次申请用于核对驳回路径。', 'score.submit-second');
        const beforeRejectSnapshots = second.history.snapshots.length;
        await historyDialog.getByPlaceholder('驳回原因', { exact: true }).fill('原 UI 复核认为现有依据不足，不采用本次覆盖。');
        const rejected = await ui('score.reject', 'POST', `/api/lead-score-overrides/${second.body.id}:reject`, 200,
            () => labelledButton(historyDialog, '驳回').click(), { refreshHistory: true });
        assert.equal(rejected.history.pendingOverride, null);
        assert.equal(rejected.history.activeOverride, null);
        assert.equal(rejected.history.snapshots.length, beforeRejectSnapshots);
        assert.ok(rejected.history.overrides.some((entry) => entry.id === second.body.id && entry.status === 'rejected'));
        await observe('score.rejected-rendered', { overrideId: second.body.id, text: await historyDialog.innerText() });
    } else {
        result.omitted.push('UI score-override writes');
        await observe('score.writes-omitted', { reason: 'Root explicitly disabled scoreOverride writes; history read only' });
    }
    await closeDialog(historyDialog);

    if (options.qualifyAndConvert !== false) {
        await labelledButton(detail, '确认有效').click();
        const qualify = dialog('确认线索有效');
        await qualify.waitFor({ state: 'visible', timeout });
        await qualify.getByPlaceholder('例如：客户预算明确，已确认采购意向。', { exact: true }).fill('原 Angular UI 已确认客户需求、预算和采购意向，销售主责与主责组织完整，可以进入项目推进。');
        const qualified = await ui('qualify.real-ui-submit', 'POST', `${leadPath}:qualify`, 200,
            () => labelledButton(qualify, '确认有效').click());
        assert.equal(qualified.body.status, 'qualified');
        assert.equal(qualified.body.gateSummary.conversion.status, 'ready');
        await qualify.waitFor({ state: 'hidden', timeout });
        await labelledButton(detail, '转入项目').waitFor({ state: 'visible', timeout });
        await labelledButton(detail, '转入项目').click();
        const convert = dialog('转入项目');
        await convert.waitFor({ state: 'visible', timeout });
        const projectName = `${editedName} · UI转项目`;
        await convert.getByLabel('项目名称', { exact: true }).fill(projectName);
        await convert.getByLabel('客户项目编号', { exact: true }).fill(`H93-UI-${primaryLeadId}`);
        const plannedSignDate = options.plannedSignDate ?? '2026-12-01';
        assert.match(plannedSignDate, /^\d{4}-\d{2}-\d{2}$/, 'Root-selected local signing date uses yyyy-mm-dd');
        // Explicit Tokyo offset makes this expectation independent of the Node
        // host timezone; the actual Date comes from the visible browser input.
        const expectedPlannedSignAt = new Date(`${plannedSignDate}T00:00:00+09:00`).toISOString();
        assert.equal(new Date(Date.parse(expectedPlannedSignAt) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), plannedSignDate, 'Selected local calendar day must be valid');
        const signingInput = convert.getByLabel('预计签约日期', { exact: true });
        await signingInput.fill(plannedSignDate);
        await signingInput.press('Tab');
        await convert.getByLabel('项目名称', { exact: true }).click();
        assert.equal(await signingInput.inputValue(), plannedSignDate, 'Visible datepicker retains the selected local calendar day');
        await observe('convert.sign-date-filled', { localDate: plannedSignDate, expectedPlannedSignAt, requiredBrowserTimezoneId: 'Asia/Tokyo', visibleInputValue: await signingInput.inputValue(), datePickerInputExercised: true });

        // Register before the conversion click: navigation can issue GET before
        // ui() finishes recording POST. Attach rejection handling immediately.
        const projectReadPromise = page.waitForResponse((response) =>
            response.request().method() === 'GET' && /^\/api\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(endpoint(response)),
        { timeout }).then((response) => ({ response }), (error) => ({ error }));
        const converted = await ui('convert.real-ui-submit', 'POST', `${leadPath}:convertToProject`, 200,
            () => labelledButton(convert, '转入项目').click());
        const actualConvertRequest = converted.response.request().postDataJSON();
        assert.equal(typeof actualConvertRequest?.plannedSignAt, 'string');
        assert.match(actualConvertRequest.plannedSignAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, 'Real UI request supplies ISO datetime, including time and UTC designator');
        assert.equal(actualConvertRequest.plannedSignAt, expectedPlannedSignAt, 'Request represents the selected Tokyo local midnight');
        assert.equal(converted.body.plannedSignAt, expectedPlannedSignAt, 'Conversion response preserves the actual requested instant');
        assert.equal(converted.body.sourceLeadId, primaryLeadId);
        assert.equal(converted.body.customerId, customerId);
        assert.equal(converted.body.projectName, projectName);
        assert.ok(typeof converted.body.id === 'string' && converted.body.id.length > 0);
        result.convertedProjectId = converted.body.id;
        result.convertedLocalSignDate = plannedSignDate;
        result.convertedPlannedSignAt = expectedPlannedSignAt;
        await page.waitForURL((url) => url.pathname === `/projects/${converted.body.id}`, { timeout });
        await page.getByRole('heading', { level: 1, name: projectName, exact: true }).waitFor({ state: 'visible', timeout });
        const projectRead = await projectReadPromise;
        if (projectRead.error) throw projectRead.error;
        assert.equal(endpoint(projectRead.response), `/api/projects/${converted.body.id}`, 'Observed GET must be for the actual conversion response ID');
        const readProject = await recordResponse('convert.project-date-get', projectRead.response, 200);
        assert.equal(readProject.id, converted.body.id);
        assert.equal(readProject.plannedSignAt, expectedPlannedSignAt, 'Subsequent real Project GET preserves the same instant');
        assert.equal(readProject.stageSummary.plannedSignAt, expectedPlannedSignAt, 'Page stage summary preserves the same instant');
        const dateCard = page.getByText('预计签约', { exact: true }).locator('..');
        await dateCard.getByText(plannedSignDate, { exact: true }).waitFor({ state: 'visible', timeout });
        await observe('convert.sign-date-request-response-get-page', {
            projectId: converted.body.id, localDate: plannedSignDate, timezoneId: 'Asia/Tokyo',
            actualRequest: actualConvertRequest, responsePlannedSignAt: converted.body.plannedSignAt,
            getPlannedSignAt: readProject.plannedSignAt, stagePlannedSignAt: readProject.stageSummary.plannedSignAt,
            visibleDateCard: await dateCard.innerText(),
        });
        await observe('convert.real-project-route', {
            projectId: converted.body.id, sourceLeadId: primaryLeadId, url: page.url(),
            heading: await page.getByRole('heading', { level: 1, name: projectName, exact: true }).innerText(),
            idOrigin: 'UI conversion response body and subsequent real project URL',
        });
    } else {
        result.omitted.push('UI qualify and conversion');
        await observe('qualify-convert.omitted', { reason: 'Root explicitly disabled the consuming state-transition branch' });
    }

    await observe('completed', result);
    return result;
}
