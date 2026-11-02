/**
 * Static original-UI journey definition. Importing this module performs no I/O.
 * Root alone supplies the logged-in Playwright Page and the real PG readers.
 *
 * ctx = {
 *   baseUrl: UI origin, label: unique cell label,
 *   ids: { customer: existing active-customer UUID },
 *   observe(label, value): void | Promise<void>,
 *   row(table, id): Promise<physical PostgreSQL row | null>,
 *   todosFor(sourceId): Promise<physical PostgreSQL Todo rows[]>
 * }
 *
 * Source: customer-workspace.ts:169-174,453-476; sales-intelligence-panel.ts
 * contact dialog/create/update; sales-follow-up-panel.ts:96-336,529-605.
 * The source workspace uses section-navigation buttons, rather than ARIA tabs.
 * No route interception, direct API request, component access or evaluate call.
 */
export async function customerJourney(page, ctx) {
    const customerId = ctx.ids.customer;
    const cell = String(ctx.label);
    const marker = cell.slice(0, 64);
    const created = { customerId, contactId: null, followUpId: null, replacementId: null, todoIds: [] };
    const timeout = 20000;
    const note = async (label, value) => { await ctx.observe(`customer-journey.${cell}.${label}`, value); };
    const require = (condition, message) => {
        if (!condition) throw new Error(`Original customer UI: ${message}`);
    };
    require(typeof customerId === 'string' && customerId.length > 0, 'ctx.ids.customer must be a UUID string');
    require(typeof ctx.row === 'function' && typeof ctx.todosFor === 'function', 'real PG readers are required');

    const api = (method, path, status, query = {}) => ({ method, path, status, query });
    const matches = (spec, response) => {
        if (response.request().method() !== spec.method) return false;
        const url = new URL(response.url());
        return url.pathname === spec.path
            && Object.entries(spec.query).every(([key, value]) => url.searchParams.get(key) === value);
    };
    const requestBody = request => {
        const raw = request.postData();
        if (raw === null) return null;
        try { return JSON.parse(raw); } catch { return { unparsedBody: raw }; }
    };

    // Every waiter gets a rejection handler immediately and is awaited even if
    // the DOM action fails. A missing follow-on GET is a recorded timeout, not
    // an unhandled promise or a fabricated HTTP response.
    const act = async (label, specs, action) => {
        const waiters = specs.map(spec => page.waitForResponse(response => matches(spec, response), { timeout })
            .then(async response => {
                const rawBody = await response.text();
                let body;
                try { body = JSON.parse(rawBody); } catch { body = { unparsedBody: rawBody }; }
                const observation = {
                    method: response.request().method(),
                    url: response.url(),
                    status: response.status(),
                    requestBody: requestBody(response.request()),
                    body,
                    rawBody,
                };
                await note(`${label}.http.${spec.method}.${spec.path}`, observation);
                return { spec, observation };
            })
            .catch(async error => {
                await note(`${label}.wait-failure`, {
                    method: spec.method, path: spec.path, query: spec.query,
                    name: error.name, message: error.message,
                    responseObserved: false,
                });
                return { spec, error };
            }));
        const completion = Promise.allSettled(waiters);
        let actionError = null;
        try { await action(); } catch (error) { actionError = error; }
        const settled = await completion;
        if (actionError) {
            await note(`${label}.action-failure`, { name: actionError.name, message: actionError.message });
            throw actionError;
        }
        const rejected = settled.find(result => result.status === 'rejected');
        if (rejected) throw rejected.reason;
        const results = settled.map(result => result.value);
        for (const result of results) {
            if (result.observation) {
                require(result.observation.status === result.spec.status,
                    `${label}: ${result.spec.method} ${result.spec.path} returned ${result.observation.status}, expected ${result.spec.status}`);
            }
        }
        for (const result of results) if (result.error) throw result.error;
        return results.map(result => result.observation);
    };
    const dbRow = async (label, table, id) => {
        const row = await ctx.row(table, id);
        await note(`${label}.pg.${table}`, { id, row });
        require(row && row.id === id, `${label}: missing ${table} row ${id}`);
        return row;
    };
    const dbTodos = async (label, sourceId) => {
        const rows = await ctx.todosFor(sourceId);
        await note(`${label}.pg.todo_item`, { sourceId, rows });
        require(Array.isArray(rows), `${label}: todosFor must return an array`);
        require(rows.every(row => row.source_id === sourceId), `${label}: wrong Todo source returned`);
        return rows;
    };
    const sameInstant = (left, right) => left !== null && right !== null
        && Number.isFinite(Date.parse(String(left)))
        && Date.parse(String(left)) === Date.parse(String(right));
    const rowsIn = (observation, label) => {
        require(Array.isArray(observation.body), `${label}: expected the original array response`);
        return observation.body;
    };
    const visibleText = async (label, locator) => {
        await locator.waitFor({ state: 'visible', timeout });
        const text = await locator.innerText();
        await note(`${label}.dom`, { text });
        return text;
    };
    const select = async (dialog, inputId, optionName, label) => {
        await dialog.locator(`#${inputId}`).click();
        const option = optionName === null
            ? page.getByRole('option').first()
            : page.getByRole('option', { name: optionName, exact: true });
        await option.waitFor({ state: 'visible', timeout });
        const optionText = await option.innerText();
        await option.click();
        await note(`${label}.dropdown`, { inputId, optionText });
    };
    const date = async (dialog, inputId, text, label) => {
        const field = dialog.locator(`#${inputId}`);
        await field.fill('');
        await field.pressSequentially(text, { delay: 2 });
        await field.press('Tab');
        const displayed = await field.inputValue();
        await note(`${label}.date-input`, { inputId, typed: text, displayed });
        require(displayed.length > 0, `${label}: original date input did not retain a value`);
    };
    const contactList = () => api('GET', '/api/customer-contacts', 200, { customerId });
    const followList = scope => api('GET', '/api/sales-follow-up-records', 200, { customerId, lifecycleScope: scope });

    await note('source-boundary', {
        structure: 'original customer workspace section-navigation buttons and dialogs',
        existingCustomerProducer: 'Root supplied active customer; this journey creates no customer',
        contactProducer: 'real UI POST and PATCH',
        followUpProducer: 'real UI create/replace/void with original UI expectedVersion',
        todoConsumer: 'Root-supplied real PG reader; this definition does not claim public Todo navigation coverage',
        scope: 'customer context only; Lead/project producers and out-of-scope workspace requests remain separate',
        executedByDefinitionAuthor: false,
    });

    const initial = await act('open', [
        api('GET', `/api/customers/${customerId}`, 200), contactList(), followList('active'),
    ], () => page.goto(new URL(`/customers/${customerId}`, ctx.baseUrl).href, { waitUntil: 'domcontentloaded' }));
    require(rowsIn(initial[1], 'initial contacts').length === 0, 'Root precondition requires no contacts on this customer');
    require(rowsIn(initial[2], 'initial follow-ups').length === 0, 'Root precondition requires no follow-ups on this customer');

    const navigation = page.getByRole('navigation', { name: '客户工作台分区导航', exact: true });
    await navigation.getByRole('button', { name: '客户关系', exact: false }).click();
    const relations = page.locator('#customer-relations');
    await relations.getByRole('button', { name: '新增联系人', exact: false }).click();
    const contactCreateDialog = page.getByRole('dialog', { name: '新增客户联系人', exact: true });
    await contactCreateDialog.waitFor({ state: 'visible', timeout });
    const contactName = `UI联系人 ${marker}`;
    const contactTitle = `UI岗位 ${marker}`;
    const editedTitle = `UI调整岗位 ${marker}`;
    const emailLocal = marker.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32) || 'customerui';
    await contactCreateDialog.locator('#salesIntelligenceContactName').fill(contactName);
    await select(contactCreateDialog, 'salesIntelligenceContactGender', '女', 'contact.create.gender');
    await contactCreateDialog.locator('#salesIntelligenceContactDepartment').fill('UI客户关系部门');
    await contactCreateDialog.locator('#salesIntelligenceContactTitle').fill(contactTitle);
    await contactCreateDialog.locator('#salesIntelligenceContactPhone').fill('010-88886666');
    await contactCreateDialog.locator('#salesIntelligenceContactMobile').fill('13812345678');
    await contactCreateDialog.locator('#salesIntelligenceContactWechat').fill(`ui-${emailLocal}`);
    await contactCreateDialog.locator('#salesIntelligenceContactEmail').fill(`${emailLocal}@example.test`);
    await contactCreateDialog.locator('#salesIntelligenceContactRemark').fill(`UI联系人创建 ${marker}`);
    const contactCreated = await act('contact.create', [api('POST', '/api/customer-contacts', 201), contactList()],
        () => contactCreateDialog.getByRole('button', { name: '保存联系人', exact: false }).click());
    const contact = contactCreated[0].body;
    require(contact && typeof contact.id === 'string', 'contact create response has no ID');
    created.contactId = contact.id;
    await note('created-identifiers', { ...created });
    require(contactCreated[0].requestBody.gender === 'female', 'original UI did not submit selected female gender');
    require(contact.gender === 'unknown', 'original HTTP create must retain the controller gender omission');
    require(contact.customerId === customerId && contact.name === contactName && contact.status === 'active', 'wrong created contact context/value');
    require(rowsIn(contactCreated[1], 'contact create reload').some(row => row.id === contact.id && row.gender === 'unknown'), 'created contact absent from real reload');
    const contactPgCreated = await dbRow('contact.create', 'customer_contact', contact.id);
    require(contactPgCreated.customer_id === customerId && contactPgCreated.gender === 'unknown', 'created contact PG context/gender mismatch');
    await contactCreateDialog.waitFor({ state: 'hidden', timeout });
    let contactArticle = relations.locator('article').filter({ hasText: contactName });
    const contactCreatedText = await visibleText('contact.create.list', contactArticle);
    require(contactCreatedText.includes(contactName) && contactCreatedText.includes(contactTitle), 'created contact not rendered in original list');

    await contactArticle.getByRole('button', { name: `编辑客户联系人 ${contactName}`, exact: false }).click();
    const contactEditDialog = page.getByRole('dialog', { name: '编辑客户联系人', exact: true });
    await contactEditDialog.waitFor({ state: 'visible', timeout });
    await select(contactEditDialog, 'salesIntelligenceContactGender', '女', 'contact.edit.gender');
    await contactEditDialog.locator('#salesIntelligenceContactTitle').fill(editedTitle);
    await contactEditDialog.locator('#salesIntelligenceContactPhone').fill('');
    await contactEditDialog.locator('#salesIntelligenceContactRemark').fill(`UI联系人修改 ${marker}`);
    const contactEdited = await act('contact.edit', [api('PATCH', `/api/customer-contacts/${contact.id}`, 200), contactList()],
        () => contactEditDialog.getByRole('button', { name: '保存修改', exact: false }).click());
    require(contactEdited[0].requestBody.gender === 'female' && contactEdited[0].requestBody.workPhone === null, 'original edit did not send gender/null clear');
    require(!Object.hasOwn(contactEdited[0].requestBody, 'expectedVersion'), 'contact UI unexpectedly added expectedVersion');
    require(contactEdited[0].body.id === contact.id && contactEdited[0].body.gender === 'female' && contactEdited[0].body.title === editedTitle, 'contact PATCH response mismatch');
    require(rowsIn(contactEdited[1], 'contact edit reload').some(row => row.id === contact.id && row.gender === 'female' && row.title === editedTitle && row.workPhone === null), 'edited contact absent from real reload');
    const contactPgEdited = await dbRow('contact.edit', 'customer_contact', contact.id);
    require(contactPgEdited.gender === 'female' && contactPgEdited.title === editedTitle && contactPgEdited.work_phone === null, 'contact PATCH did not persist');
    require(contactPgEdited.row_version === contactPgCreated.row_version + 1, 'contact PATCH row version did not advance once');
    await contactEditDialog.waitFor({ state: 'hidden', timeout });
    contactArticle = relations.locator('article').filter({ hasText: contactName });
    const contactEditedText = await visibleText('contact.edit.list', contactArticle);
    require(contactEditedText.includes(editedTitle), 'edited contact title not rendered');
    await contactArticle.getByText('女', { exact: true }).waitFor({ state: 'visible', timeout });

    await navigation.getByRole('button', { name: '销售跟进', exact: false }).click();
    const followUps = page.locator('#customer-sales-follow-ups');
    await followUps.getByRole('button', { name: '记录跟进', exact: false }).click();
    const createDialog = page.getByRole('dialog', { name: '记录销售跟进', exact: true });
    await createDialog.waitFor({ state: 'visible', timeout });
    await select(createDialog, 'salesFollowUpType', null, 'follow-up.create.type');
    await select(createDialog, 'salesFollowUpOutcome', '有进展', 'follow-up.create.outcome');
    await date(createDialog, 'salesFollowUpOccurredAt', '2030-01-01 10:30', 'follow-up.create.occurred');
    await date(createDialog, 'salesFollowUpNextAt', '2030-01-02 09:45', 'follow-up.create.next');
    const firstSummary = `UI跟进 ${marker}`;
    const replacementSummary = `UI更正 ${marker}`;
    await createDialog.locator('#salesFollowUpSummary').fill(firstSummary);
    await createDialog.locator('#salesFollowUpDetail').fill(`UI真实跟进详情 ${marker}`);
    const followCreated = await act('follow-up.create', [api('POST', '/api/sales-follow-up-records', 201), followList('active')],
        () => createDialog.getByRole('button', { name: '保存跟进', exact: false }).click());
    const original = followCreated[0].body;
    require(original && typeof original.id === 'string', 'follow-up create response has no ID');
    created.followUpId = original.id;
    await note('created-identifiers', { ...created });
    require(followCreated[0].requestBody.customerId === customerId && followCreated[0].requestBody.leadId === null && followCreated[0].requestBody.projectId === null, 'original customer UI did not preserve customer-only anchor projection');
    require(typeof followCreated[0].requestBody.nextFollowUpAt === 'string' && sameInstant(original.nextFollowUpAt, followCreated[0].requestBody.nextFollowUpAt), 'typed next date did not reach the real create request/response');
    require(!Object.hasOwn(followCreated[0].requestBody, 'ownerUserId') && !Object.hasOwn(followCreated[0].requestBody, 'ownerOrgId'), 'original create UI unexpectedly supplied owner overrides');
    require(original.customerId === customerId && original.summary === firstSummary && original.status === 'active', 'follow-up create response mismatch');
    require(rowsIn(followCreated[1], 'follow-up create reload').some(row => row.id === original.id && row.summary === firstSummary), 'new follow-up absent from real reload');
    const originalPg = await dbRow('follow-up.create', 'sales_follow_up_record', original.id);
    require(originalPg.customer_id === customerId && originalPg.status === 'active' && originalPg.owner_user_id, 'created follow-up PG context/owner mismatch');
    require(sameInstant(originalPg.next_follow_up_at, original.nextFollowUpAt), 'created follow-up next date PG mismatch');
    const originalTodos = await dbTodos('follow-up.create', original.id);
    require(originalTodos.length === 1, 'fresh customer follow-up must produce exactly one real reminder');
    const originalTodo = originalTodos[0];
    created.todoIds.push(originalTodo.id);
    await note('created-identifiers', { ...created });
    require(originalTodo.source_type === 'sales-follow-up-record' && originalTodo.todo_type === 'sales-follow-up-reminder' && originalTodo.status === 'open', 'new reminder source/type/status mismatch');
    require(originalTodo.assignee_user_id === originalPg.owner_user_id && originalTodo.target_object_type === 'customer' && originalTodo.target_object_id === customerId && originalTodo.project_id === null, 'new reminder assignee/target mismatch');
    require(sameInstant(originalTodo.due_at, original.nextFollowUpAt), 'new reminder due date mismatch');
    await createDialog.waitFor({ state: 'hidden', timeout });
    let firstArticle = followUps.locator('article').filter({ hasText: firstSummary });
    await visibleText('follow-up.create.list', firstArticle);

    await firstArticle.getByRole('button', { name: '更正', exact: false }).click();
    const replaceDialog = page.getByRole('dialog', { name: '更正销售跟进', exact: true });
    await replaceDialog.waitFor({ state: 'visible', timeout });
    await replaceDialog.locator('#salesFollowUpSummary').fill(replacementSummary);
    await replaceDialog.locator('#salesFollowUpDetail').fill(`UI更正后详情 ${marker}`);
    await replaceDialog.locator('#salesFollowUpReplacementReason').fill(`UI更正原因 ${marker}`);
    await select(replaceDialog, 'salesFollowUpOutcome', '待客户反馈', 'follow-up.replace.outcome');
    await date(replaceDialog, 'salesFollowUpNextAt', '2030-01-03 10:15', 'follow-up.replace.next');
    const followReplaced = await act('follow-up.replace', [api('POST', `/api/sales-follow-up-records/${original.id}:replace`, 200), followList('active')],
        () => replaceDialog.getByRole('button', { name: '保存新版本', exact: false }).click());
    const replacement = followReplaced[0].body;
    require(replacement && typeof replacement.id === 'string' && replacement.id !== original.id, 'replace must return a new follow-up ID');
    created.replacementId = replacement.id;
    await note('created-identifiers', { ...created });
    require(followReplaced[0].requestBody.expectedVersion === original.rowVersion, 'replace expectedVersion was not supplied by the original UI record');
    require(followReplaced[0].requestBody.ownerUserId === original.ownerUserId && followReplaced[0].requestBody.ownerOrgId === original.ownerOrgId, 'replace UI did not preserve selected record owner fields');
    require(replacement.supersedesId === original.id && replacement.status === 'active' && replacement.summary === replacementSummary, 'replace response link/state mismatch');
    const activeAfterReplace = rowsIn(followReplaced[1], 'follow-up replace reload');
    require(activeAfterReplace.some(row => row.id === replacement.id) && !activeAfterReplace.some(row => row.id === original.id), 'active reload did not swap the current record');
    const supersededPg = await dbRow('follow-up.replace.old', 'sales_follow_up_record', original.id);
    const replacementPg = await dbRow('follow-up.replace.new', 'sales_follow_up_record', replacement.id);
    require(supersededPg.status === 'superseded' && supersededPg.replaced_by_record_id === replacement.id, 'old follow-up did not retain the forward link');
    require(replacementPg.status === 'active' && replacementPg.supersedes_record_id === original.id && replacementPg.customer_id === customerId, 'replacement did not retain the backward/customer links');
    require(replacementPg.owner_user_id === originalPg.owner_user_id && replacementPg.row_version === replacement.rowVersion, 'replacement owner/version mismatch');
    const oldTodosAfterReplace = await dbTodos('follow-up.replace.old', original.id);
    const newTodosAfterReplace = await dbTodos('follow-up.replace.new', replacement.id);
    require(oldTodosAfterReplace.length === 1 && oldTodosAfterReplace[0].id === originalTodo.id && oldTodosAfterReplace[0].status === 'completed' && oldTodosAfterReplace[0].completed_at !== null, 'same-owner/customer replacement must complete the original reminder');
    require(newTodosAfterReplace.length === 1 && newTodosAfterReplace[0].status === 'open' && newTodosAfterReplace[0].source_id === replacement.id, 'replacement must create its own open reminder');
    const replacementTodo = newTodosAfterReplace[0];
    created.todoIds.push(replacementTodo.id);
    await note('created-identifiers', { ...created });
    require(replacementTodo.assignee_user_id === replacementPg.owner_user_id && replacementTodo.target_object_id === customerId && sameInstant(replacementTodo.due_at, replacement.nextFollowUpAt), 'replacement reminder target/assignee/date mismatch');
    await replaceDialog.waitFor({ state: 'hidden', timeout });
    await visibleText('follow-up.replace.list', followUps.locator('article').filter({ hasText: replacementSummary }));

    const history = followUps.locator('p-toggleswitch input[type="checkbox"]');
    require(!(await history.isChecked()), 'original panel unexpectedly started in history mode');
    const historyOn = await act('follow-up.history.on', [followList('all')], () => history.check());
    const historicalRows = rowsIn(historyOn[0], 'history reload');
    require(historicalRows.some(row => row.id === original.id && row.status === 'superseded') && historicalRows.some(row => row.id === replacement.id && row.status === 'active'), 'original history toggle did not load both versions');
    firstArticle = followUps.locator('article').filter({ hasText: firstSummary });
    await firstArticle.getByText('已替代', { exact: true }).waitFor({ state: 'visible', timeout });
    await visibleText('follow-up.history.old', firstArticle);

    const replacementArticle = followUps.locator('article').filter({ hasText: replacementSummary });
    await replacementArticle.getByRole('button', { name: '作废', exact: false }).click();
    const voidDialog = page.getByRole('dialog', { name: '作废销售跟进', exact: true });
    await voidDialog.waitFor({ state: 'visible', timeout });
    const voidReason = `UI作废原因 ${marker}`;
    const voidComment = `UI补充说明 ${marker}`;
    await voidDialog.locator('#salesFollowUpVoidReason').fill(voidReason);
    await voidDialog.locator('#salesFollowUpVoidComment').fill(voidComment);
    const followVoided = await act('follow-up.void', [api('POST', `/api/sales-follow-up-records/${replacement.id}:void`, 200), followList('all')],
        () => voidDialog.getByRole('button', { name: '确认作废', exact: false }).click());
    require(followVoided[0].requestBody.expectedVersion === replacement.rowVersion, 'void expectedVersion was not supplied by the original UI record');
    require(followVoided[0].body.id === replacement.id && followVoided[0].body.status === 'voided' && followVoided[0].body.voidReason === `${voidReason}: ${voidComment}`, 'void response state/reason mismatch');
    require(rowsIn(followVoided[1], 'void history reload').some(row => row.id === replacement.id && row.status === 'voided'), 'voided record absent from real history reload');
    const voidedPg = await dbRow('follow-up.void', 'sales_follow_up_record', replacement.id);
    require(voidedPg.status === 'voided' && voidedPg.void_reason === `${voidReason}: ${voidComment}` && voidedPg.voided_at !== null && voidedPg.voided_by !== null, 'void did not persist terminal record fields');
    require(voidedPg.row_version === replacementPg.row_version + 1, 'void record version did not advance once');
    const canceledTodos = await dbTodos('follow-up.void.current', replacement.id);
    const retainedTodos = await dbTodos('follow-up.void.old', original.id);
    require(canceledTodos.length === 1 && canceledTodos[0].id === replacementTodo.id && canceledTodos[0].status === 'canceled' && canceledTodos[0].completed_at !== null, 'void did not retain/cancel the current reminder');
    require(retainedTodos.length === 1 && retainedTodos[0].id === originalTodo.id && retainedTodos[0].status === 'completed', 'void changed the superseded source reminder');
    await voidDialog.waitFor({ state: 'hidden', timeout });
    await replacementArticle.getByText('已作废', { exact: true }).waitFor({ state: 'visible', timeout });
    await visibleText('follow-up.void.history', replacementArticle);
    const historyOff = await act('follow-up.history.off', [followList('active')], () => history.uncheck());
    require(rowsIn(historyOff[0], 'final active reload').length === 0, 'terminal records leaked into active list');
    await followUps.getByText('暂无销售跟进记录。', { exact: true }).waitFor({ state: 'visible', timeout });
    await visibleText('follow-up.void.active-empty', followUps);

    await note('completed-identifiers', { ...created });
    return {
        ...created,
        contactCreatedStatus: contactCreated[0].status,
        contactEditedStatus: contactEdited[0].status,
        followUpCreatedStatus: followCreated[0].status,
        followUpReplacedStatus: followReplaced[0].status,
        followUpVoidedStatus: followVoided[0].status,
        originalTodoTerminal: retainedTodos[0].status,
        replacementTodoTerminal: canceledTodos[0].status,
        g3Certified: false,
        g4Certified: false,
    };
}
