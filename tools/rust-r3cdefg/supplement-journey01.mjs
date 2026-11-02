/** Definition only; Root alone executes with a real authenticated Page/PG. */
function helpers(page, ctx, kind) {
    const timeout = 20000;
    const note = async (key, value) => { await ctx.observe(`supplement.${ctx.label}.${kind}.${key}`, value); };
    const must = (ok, message) => { if (!ok) throw new Error(`Original UI supplement: ${message}`); };
    const spec = (method, path, status = 200, query = {}) => ({ method, path, status, query });
    const act = async (label, specs, action) => {
        const pending = specs.map(s => page.waitForResponse(response => {
            const u = new URL(response.url());
            return response.request().method() === s.method && u.pathname === s.path
                && Object.entries(s.query).every(([k, v]) => u.searchParams.get(k) === v);
        }, { timeout }).then(async response => {
            const raw = await response.text();
            let body; try { body = JSON.parse(raw); } catch { body = { raw }; }
            let requestBody = null; const posted = response.request().postData();
            if (posted !== null) { try { requestBody = JSON.parse(posted); } catch { requestBody = { raw: posted }; } }
            const value = { method: s.method, url: response.url(), status: response.status(), requestBody, body, raw };
            await note(`${label}.http`, value); return { s, value };
        }).catch(async error => {
            await note(`${label}.wait-error`, { method: s.method, path: s.path, name: error.name, message: error.message });
            return { s, error };
        }));
        const complete = Promise.allSettled(pending); // rejection handlers are installed before the action
        let failure; try { await action(); } catch (error) { failure = error; }
        const settled = await complete;
        if (failure) throw failure;
        const rejected = settled.find(x => x.status === 'rejected'); if (rejected) throw rejected.reason;
        const results = settled.map(x => x.value);
        for (const r of results) if (r.value) must(r.value.status === r.s.status, `${label} expected ${r.s.status}, received ${r.value.status}`);
        for (const r of results) if (r.error) throw r.error;
        return results.map(x => x.value);
    };
    const goto = (label, path, specs) => act(label, specs, () => page.goto(new URL(path, ctx.baseUrl).href, { waitUntil: 'domcontentloaded' }));
    const text = async (label, locator) => {
        await locator.waitFor({ state: 'visible', timeout }); const value = await locator.innerText();
        await note(`${label}.dom`, value); return value;
    };
    const row = async (label, table, id) => {
        const value = await ctx.row(table, id); await note(`${label}.pg.${table}`, value);
        must(value && value.id === id, `${label}: missing PG ${table} row`); return value;
    };
    const todos = async (label, id) => {
        const value = await ctx.todosFor(id); await note(`${label}.pg.todos`, { sourceId: id, rows: value });
        must(Array.isArray(value) && value.every(x => x.source_id === id), `${label}: invalid real Todo result`); return value;
    };
    const count = async (label, id) => {
        if (typeof ctx.countFollowups !== 'function') { await note(`${label}.pg-count`, { available: false, reason: 'Root counter interface not supplied; all-lifecycle IDs and per-ID PG snapshots remain evidence' }); return null; }
        const value = await ctx.countFollowups(id); await note(`${label}.pg-count`, { projectId: id, count: value }); return String(value);
    };
    const select = async (dialog, id, name) => {
        await dialog.locator(`#${id}`).click(); const option = name === null ? page.getByRole('option').first() : page.getByRole('option', { name, exact: true });
        await option.waitFor({ state: 'visible', timeout }); await note(`select.${id}`, await option.innerText()); await option.click();
    };
    const date = async (dialog, id, value) => {
        const input = dialog.locator(`#${id}`); await input.fill(''); await input.pressSequentially(value); await input.press('Tab');
        await note(`date.${id}`, { typedLocal: value, displayed: await input.inputValue(), sourceFormat: 'yy-mm-dd + showTime/hourFormat24' });
    };
    const noWrites = async (label, scope) => {
        const names = await scope.getByRole('button', { name: /创建|新增|编辑|保存|删除|记录跟进|更正|作废/ }).allTextContents();
        await note(`${label}.write-buttons`, names); must(names.length === 0, `${label}: write buttons visible to readonly user`);
    };
    return { timeout, note, must, spec, act, goto, text, row, todos, count, select, date, noWrites };
}

export async function adminSupplement(page, ctx) {
    const h = helpers(page, ctx, 'admin'), projectId = ctx.ids.costProject;
    const marker = String(ctx.label).slice(0, 60), originalSummary = `UI项目跟进 ${marker}`, remoteSummary = `远端真实更正 ${marker}`;
    const fList = scope => h.spec('GET', '/api/sales-follow-up-records', 200, { projectId, lifecycleScope: scope });
    const panel = () => page.locator('app-sales-follow-up-panel');
    const ids = { projectId, originalId: null, remoteId: null, todoId: null };
    await h.note('boundary', { remoteReplace: 'separate real other-actor API action, never counted as UI', leadNavigation: 'out-of-scope: Lead14 producer remains unmigrated', importsPerformIO: false });

    const empty = await h.goto('empty-cost', `/projects/${ctx.ids.bidProject}/workspace/technical-cost`, [h.spec('GET', `/api/projects/${ctx.ids.bidProject}/technical-cost-workspace`)]);
    h.must(empty[0].body.currentPackage === null, 'bidProject must be the real empty-cost fixture');
    const emptyCost = page.locator('app-project-technical-cost-workspace');
    await emptyCost.getByText('技术与成本版本包尚未形成', { exact: true }).waitFor({ state: 'visible', timeout: h.timeout });
    await h.text('empty-cost', emptyCost);
    const forms = await emptyCost.locator('form,input,textarea,p-select,p-datepicker').count();
    const createButtons = await emptyCost.getByRole('button', { name: /创建|新增|保存/ }).count();
    await h.note('empty-cost.no-create-form', { forms, createButtons, source: 'original technical-cost workspace imports no FormsModule and has read-only workspace UI for all roles' });
    h.must(forms === 0 && createButtons === 0, 'empty-cost UI acquired an invented creation form/button');

    await h.goto('project-open', `/projects/${projectId}`, [h.spec('GET', `/api/projects/${projectId}`), fList('active')]);
    await panel().getByRole('button', { name: '记录跟进', exact: false }).click();
    const create = page.getByRole('dialog', { name: '记录销售跟进', exact: true });
    await create.waitFor({ state: 'visible', timeout: h.timeout });
    await h.select(create, 'salesFollowUpType', null); await h.select(create, 'salesFollowUpOutcome', '有进展');
    await h.date(create, 'salesFollowUpOccurredAt', '2030-02-01 10:30'); await h.date(create, 'salesFollowUpNextAt', '2030-02-02 09:45');
    await create.locator('#salesFollowUpSummary').fill(originalSummary); await create.locator('#salesFollowUpDetail').fill(`项目真实UI ${marker}`);
    const made = await h.act('project-followup.create', [h.spec('POST', '/api/sales-follow-up-records', 201), fList('active')], () => create.getByRole('button', { name: '保存跟进', exact: false }).click());
    const original = made[0].body; ids.originalId = original.id; await h.note('owned-identifiers', ids);
    h.must(original.projectId === projectId && made[0].requestBody.projectId === projectId && made[0].requestBody.leadId === null, 'original project UI anchor projection changed');
    h.must(typeof original.nextFollowUpAt === 'string', 'typed next date did not reach create');
    const originalPg = await h.row('created', 'sales_follow_up_record', original.id), originalTodos = await h.todos('created', original.id);
    h.must(originalPg.project_id === projectId && originalTodos.length === 1 && originalTodos[0].status === 'open', 'project producer did not persist one reminder');
    h.must(originalTodos[0].target_object_type === 'project' && originalTodos[0].target_object_id === projectId && originalTodos[0].project_id === projectId, 'real reminder must target project');
    await create.waitFor({ state: 'hidden', timeout: h.timeout });

    await panel().locator('article').filter({ hasText: originalSummary }).getByRole('button', { name: '更正', exact: false }).click();
    const staleDialog = page.getByRole('dialog', { name: '更正销售跟进', exact: true });
    await staleDialog.waitFor({ state: 'visible', timeout: h.timeout });
    await staleDialog.locator('#salesFollowUpSummary').fill(`旧UI待提交 ${marker}`);
    await staleDialog.locator('#salesFollowUpReplacementReason').fill(`UI旧版本冲突 ${marker}`);
    const remoteBody = {
        followUpType: original.followUpType, occurredAt: original.occurredAt, summary: remoteSummary,
        detail: `另一actor真实API ${marker}`, outcome: original.outcome, nextFollowUpAt: original.nextFollowUpAt,
        ownerOrgId: original.ownerOrgId, ownerUserId: original.ownerUserId,
        replacementReason: `远端先提交 ${marker}`, expectedVersion: original.rowVersion,
    };
    const remote = await ctx.remoteReplace(original.id, remoteBody);
    await h.note('remote-actor-api.replace', { actionKind: 'real-other-actor-API; not UI', recordId: original.id, requestBody: remoteBody, status: remote.status, body: remote.body });
    h.must(remote.status === 200 && remote.body && remote.body.id !== original.id, 'other actor real replacement failed');
    const current = remote.body; ids.remoteId = current.id; await h.note('owned-identifiers', ids);
    const beforeOld = await h.row('pre-stale.old', 'sales_follow_up_record', original.id), beforeNew = await h.row('pre-stale.current', 'sales_follow_up_record', current.id);
    const beforeTodosOld = await h.todos('pre-stale.old', original.id), beforeTodosNew = await h.todos('pre-stale.current', current.id);
    h.must(beforeOld.status === 'superseded' && beforeOld.replaced_by_record_id === current.id
        && beforeNew.status === 'active' && beforeNew.supersedes_record_id === original.id, 'real remote replacement did not persist both chain links');
    h.must(beforeTodosOld.length === 1 && beforeTodosOld[0].status === 'completed'
        && beforeTodosNew.length === 1 && beforeTodosNew[0].status === 'open', 'real remote replacement reminder transition mismatch');
    const beforeCount = await h.count('pre-stale', projectId);
    const stale = await h.act('stale-UI.replace', [h.spec('POST', `/api/sales-follow-up-records/${original.id}:replace`, 409)], () => staleDialog.getByRole('button', { name: '保存新版本', exact: false }).click());
    h.must(stale[0].requestBody.expectedVersion === original.rowVersion, 'stale expectedVersion must come from the original open dialog');
    h.must(stale[0].body.statusCode === 409 && String(stale[0].body.message).includes('does not match current version'), 'stale conflict body changed');
    await staleDialog.getByText('跟进记录没有更正成功，请刷新后重试。', { exact: true }).waitFor({ state: 'visible', timeout: h.timeout });
    await h.text('stale-UI.feedback', staleDialog);
    const afterOld = await h.row('post-stale.old', 'sales_follow_up_record', original.id), afterNew = await h.row('post-stale.current', 'sales_follow_up_record', current.id);
    const afterTodosOld = await h.todos('post-stale.old', original.id), afterTodosNew = await h.todos('post-stale.current', current.id);
    h.must(JSON.stringify(beforeOld) === JSON.stringify(afterOld) && JSON.stringify(beforeNew) === JSON.stringify(afterNew), 'stale UI changed persisted chain/versions');
    h.must(JSON.stringify(beforeTodosOld) === JSON.stringify(afterTodosOld) && JSON.stringify(beforeTodosNew) === JSON.stringify(afterTodosNew), 'stale UI changed persisted reminders');
    const afterCount = await h.count('post-stale', projectId); if (beforeCount !== null) h.must(beforeCount === afterCount, 'stale UI inserted a DB row');
    await staleDialog.getByRole('button', { name: '取消', exact: false }).click(); await staleDialog.waitFor({ state: 'hidden', timeout: h.timeout });
    const history = panel().locator('p-toggleswitch input[type="checkbox"]');
    const all = await h.act('normal-history-refresh', [fList('all')], () => history.check());
    h.must(Array.isArray(all[0].body), 'history is not the original complete array');
    h.must(JSON.stringify(all[0].body.map(x => x.id).sort()) === JSON.stringify([original.id, current.id].sort()), 'all-lifecycle scope has an extra/missing chain record');
    await h.note('stale-no-insert-evidence', { allLifecycleIds: all[0].body.map(x => x.id), pgCounterProvided: beforeCount !== null, beforeCount, afterCount, existingRowsAndTodosUnchanged: true });
    await h.act('normal-current-refresh', [fList('active')], () => history.uncheck());

    const todoLoad = await h.goto('todo-public-consumer', '/dashboard', [h.spec('GET', '/api/me/todos')]);
    h.must(Array.isArray(todoLoad[0].body), 'public Todo consumer did not return array');
    const todo = todoLoad[0].body.find(x => x.sourceId === current.id && x.targetObjectType === 'project' && x.targetObjectId === projectId);
    h.must(todo, 'Root-owned admin project reminder missing from actual /me/todos'); ids.todoId = todo.id;
    await h.note('owned-identifiers', ids);
    h.must(beforeTodosNew.some(x => x.id === todo.id && x.status === 'open'), 'UI Todo did not come from the real producer row');
    const bell = page.locator('a[aria-label="待办事项"]'); await bell.click();
    const menu = bell.locator('xpath=following-sibling::div[1]'); await menu.waitFor({ state: 'visible', timeout: h.timeout });
    await h.act('todo-actual-click', [h.spec('GET', `/api/projects/${projectId}`), fList('active')], () => menu.getByRole('button', { name: todo.title, exact: false }).click());
    const reached = new URL(page.url());
    h.must(reached.pathname === `/projects/${projectId}` && reached.searchParams.get('followUpId') === current.id && reached.searchParams.get('todoId') === todo.id, 'Todo UI reached the wrong real project/query anchors');
    await h.note('todo-real-link', { url: reached.href, sourceId: current.id, todoId: todo.id, sourceBehavior: 'project route + followUpId/todoId query context; no automatic row-scroll claim' });
    await page.getByText('从销售跟进待办进入', { exact: true }).waitFor({ state: 'visible', timeout: h.timeout });
    const currentArticle = panel().locator('article').filter({ hasText: remoteSummary }); await h.text('refreshed-current', currentArticle);
    await currentArticle.getByRole('button', { name: '作废', exact: false }).click();
    const voidDialog = page.getByRole('dialog', { name: '作废销售跟进', exact: true });
    await voidDialog.locator('#salesFollowUpVoidReason').fill(`UI当前链作废 ${marker}`);
    const voided = await h.act('current-chain.void', [h.spec('POST', `/api/sales-follow-up-records/${current.id}:void`), fList('active')], () => voidDialog.getByRole('button', { name: '确认作废', exact: false }).click());
    h.must(voided[0].requestBody.expectedVersion === current.rowVersion && voided[0].body.status === 'voided', 'normal refreshed UI did not void current version');
    const terminal = await h.row('terminal', 'sales_follow_up_record', current.id), terminalTodos = await h.todos('terminal', current.id);
    h.must(terminal.status === 'voided' && terminalTodos.some(x => x.id === todo.id && x.status === 'canceled' && x.completed_at !== null), 'current chain/Todo did not reach terminal state');
    await h.note('complete', ids); return ids;
}

export async function readonlySupplement(page, ctx) {
    const h = helpers(page, ctx, 'readonly'), customerId = ctx.ids.customer;
    await h.note('boundary', { role: 'Root logged-in viewer; no mutation attempts in this journey', customerWriteCheck: 'contact/follow-up panels only', leadNavigation: 'out-of-scope; Lead14 not migrated' });
    await h.goto('customer-readonly', `/customers/${customerId}`, [
        h.spec('GET', '/api/customer-contacts', 200, { customerId }), h.spec('GET', '/api/sales-follow-up-records', 200, { customerId, lifecycleScope: 'active' }),
    ]);
    const relations = page.locator('#customer-relations'), followups = page.locator('#customer-sales-follow-ups');
    await h.text('contacts', relations); await h.text('customer-followups', followups);
    await h.noWrites('contacts', relations); await h.noWrites('customer-followups', followups);
    const cases = [
        { id: ctx.ids.costProject, route: 'technical-cost', api: 'technical-cost-workspace', host: 'app-project-technical-cost-workspace', current: 'currentPackage' },
        { id: ctx.ids.bidProject, route: 'bid-commercial', api: 'bid-commercial-workspace', host: 'app-project-bid-commercial-workspace', current: 'currentProcess' },
        { id: ctx.ids.pricingProject, route: 'pricing-margin', api: 'pricing-margin-workspace', host: 'app-project-pricing-margin-workspace', current: 'currentReview' },
    ];
    for (const c of cases) {
        const result = await h.goto(`workspace.${c.route}`, `/projects/${c.id}/workspace/${c.route}`, [h.spec('GET', `/api/projects/${c.id}/${c.api}`)]);
        const body = result[0].body, host = page.locator(c.host); h.must(body[c.current], `${c.route}: missing Root real producer fact`);
        await h.text(`workspace.${c.route}`, host); await h.noWrites(`workspace.${c.route}`, host);
        h.must(!body.allowedActions.some(x => /^create-/.test(x)), `${c.route}: readonly workspace expanded create permission`);
        if (c.route === 'bid-commercial') {
            await h.note('workspace.bid-commercial.money', { applicability: 'N/A', source: 'original bid workspace has no monetary field; process facts remain readable', currentProcessId: body.currentProcess.id });
            await host.getByText('当前只读', { exact: true }).waitFor({ state: 'visible', timeout: h.timeout });
            continue;
        }
        const current = body[c.current], value = c.route === 'technical-cost' ? current.totalEstimatedAmountIncludingTax : current.quoteAmountTaxInclusive;
        const label = c.route === 'technical-cost' ? '含税估算' : '含税报价';
        h.must(typeof value === 'string', `${c.route}: amount no longer readable as original string`);
        const display = `${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${current.currencyCode ?? ''}`.trim();
        const fact = host.locator('app-workspace-fact-grid .workspace-fact-grid > div').filter({ has: page.getByText(label, { exact: true }) }).first();
        const displayed = await h.text(`workspace.${c.route}.money`, fact);
        h.must(displayed.includes(display), `${c.route}: readable amount was hidden or rewritten in DOM`);
        await h.note(`workspace.${c.route}.money-source`, { field: label, rawAmount: value, currency: current.currencyCode, expectedOriginalFormatAmount: display });
    }
    await h.note('complete', { readOnlySourceUIObserved: true, monetaryFieldsObservedWithoutMasking: ['technical cost amount', 'pricing quote amount'], productPermissionExpansion: false });
    return { customerId, workspaces: cases.map(c => ({ projectId: c.id, route: c.route })), leadNavigation: 'out-of-scope' };
}
