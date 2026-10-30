// SOURCE-only opt-in todo42 consumer slice. Root supplies its reviewed actual
// HTTP/SDK capture closure and bounded owner; no runtime starts on import.
import assert from 'node:assert/strict';
import { buildPreparedTodoFacts, originalTodoProjection } from './l-todo-facts-source.mjs';

export const todoConsumptionPlan = Object.freeze({
    kind: 'source-only-extra-three-Todo-fact-consumption-cases', requiredProfile: 'todo42',
    sources: ['ApprovalService.findOpenTodosForUser421-474 + mapTodoItemToSummary1143-1180',
        'SalesFollowUpService original create object + SalesFollowUpRepository original fresh-stream reminder methods',
        'BusinessTrialSeeder first Lead INSERT projection'],
    existing: 'The current31/114 actual runs cover contract/payout/adjustment facts, approval source and open filtering.',
    new: ['project/lead/customer names independently renamed after Todo title capture', 'sourceType=sales-follow-up-record', 'processing included', 'dueAt=null fallback',
        'fixed UTC+8 reminder text', '160-code-unit summary projection', 'completed excluded', 'assignee isolation', 'createdAt tie observed without invented ID ordering', 'todos requires auth only'],
    default40Modified: false, newPreparedRowsAreNativeProducers: false, allSevenNonemptyQueriesInOneRequestClaimed: false,
    proof: 'Only named source-prepared rows through strict per-row direct before-absence/RETURNING/outer COMMIT proof. Returned DTO IDs are never adopted.',
    comparison: 'Retain the entire actual response DTO list and whole owned facts before/after every call. Root compares both backends with typed bidirectional UUID/time maps; do not drop fields.',
    lifecycle: 'Root owns Native/Rust startup, original SDK login/certification, full107 before/after, exact cleanup double zero and all closeout.',
    runtimeStatus: 'Pending fixture42 integration/source review and actual Root run; no G3/G4 claim.',
});

export async function runExtraTodoFacts({ fixture: f, customer, project, ids, assigneeSession, otherActorId,
    call, facts, retainPrepared, retainCase, preparedAt }) {
    assert.equal(f.fixtureProfile?.name, 'todo42', 'This explicit consumer must not run against legacy40');
    assert.equal(f.j.namespace, 'poms-r2l-todo42'); assert.equal(f.supportedTables.length, 42);
    for (const fn of [call, facts, retainPrepared, retainCase]) assert.equal(typeof fn, 'function');
    const actorId = f.actors.admin, actors = Object.values(f.actors);
    assert(actors.includes(assigneeSession.userId) && actors.includes(otherActorId) && assigneeSession.userId !== otherActorId);
    assert.equal(assigneeSession.userId, f.actors.viewer);
    assert(f.j.basePreparationConfig?.viewerPermissions && !['project:read', 'lead:read', 'customer:read'].some(key => f.j.basePreparationConfig.viewerPermissions.includes(key)),
        'Use the actual fresh viewer with no project/lead/customer read permission to witness the original auth-only Todo boundary');
    const orgId = f.base.accounts.find(row => row.account === 'admin').orgId;
    const sourcePlan = await buildPreparedTodoFacts({ runId: f.runId, actorId, orgId, customer, project, ids,
        assigneeId: assigneeSession.userId, ...(preparedAt ? { preparedAt } : {}) });
    const baseScope = { actors, projects: [project.id], borrowedActors: [], ownedCustomerIds: [customer.id] };
    f.defineCase('todo42.prepare-lead', { ...baseScope, ownedLeadIds: [] });
    await retainPrepared({ state: 'planned-source-not-Native-generated', sourcePlan, profile: f.fixtureProfile });
    const lead = await f.insert('lead', sourcePlan.rows[0].values, { caseId: 'todo42.prepare-lead' });
    assert.equal(lead.id, ids.lead);
    f.defineCase('todo42.prepare-reminders', { ...baseScope, ownedLeadIds: [lead.id] });
    const createdRows = [lead];
    for (const row of sourcePlan.rows.slice(1)) createdRows.push(await f.insert(row.table, row.values, { caseId: 'todo42.prepare-reminders' }));
    await retainPrepared({ state: 'actual-direct-committed-owned-prepared-rows', sourcePlan, createdRows, profile: f.fixtureProfile,
        boundary: 'Each row has its own actual direct creation proof; this is not a single Native producer or synthetic batch certificate.' });
    const oracle = originalTodoProjection(), cases = [];
    const consume = async name => {
        const before = await facts(), response = await call(assigneeSession, name, 'GET', '/api/me/todos');
        assert.equal(response.status, 200); assert.equal(response.parseError, null); assert(Array.isArray(response.body));
        assert(Buffer.isBuffer(response.bodyBytes), 'The Root closure must return the actual transport bytes, not a fabricated DTO');
        const after = await facts();
        const ownTodoIds = new Set(f.j.objects.filter(row => row.table === 'todo_item' && row.creationProof).map(row => row.id));
        for (const dto of response.body) assert(ownTodoIds.has(dto.id), 'An HTTP DTO never supplies ownership');
        // Every scalar of these new DTOs is compared to the unmodified original
        // mapper over the actual physical committed rows. This does not parse
        // the response through Zod or replace its raw bytes.
        for (const row of before.todo_item.filter(row => ids.todos.includes(row.id) && row.assignee_user_id === assigneeSession.userId && ['open', 'processing'].includes(row.status))) {
            const target = row.target_object_type;
            const related = target === 'project' ? { project: { projectName: before.project.find(item => item.id === row.target_object_id)?.project_name } }
                : target === 'lead' ? { lead: { leadName: before.lead.find(item => item.id === row.target_object_id)?.lead_name } }
                : { customer: { displayName: before.customer.find(item => item.id === row.target_object_id)?.display_name } };
            const expected = oracle.project(oracle.hydrateTodo(row), related);
            const actual = response.body.filter(item => item.id === row.id); assert.equal(actual.length, 1); assert.deepEqual(actual[0], expected);
        }
        const result = { name, before, after, actualResponse: response, originalMapperSource: oracle.source,
            expectedFromActualCommittedRows: true, crossBackendCompared: false, NativeProducerCertified: false };
        await retainCase(result); cases.push({ name, status: response.status, todos: response.body.length }); return response.body;
    };
    const initial = await consume('todo42.all-open');
    assert.equal(initial.filter(row => ids.todos.includes(row.id)).length, 3);
    assert.deepEqual(initial.filter(row => ids.todos.includes(row.id)).map(row => row.targetObjectType), ['project', 'lead', 'customer']);
    await f.updateOwned('project', project.id, { project_name: 'Todo42 project fact ' + f.runId }, 'Named owned read fixture: independently change the actual Project fact, preserving captured Todo.title');
    await f.updateOwned('lead', lead.id, { lead_name: 'Todo42 lead fact ' + f.runId }, 'Named owned read fixture: independently change the actual Lead fact, preserving captured Todo.title');
    await f.updateOwned('customer', customer.id, { display_name: 'Todo42 customer fact ' + f.runId }, 'Named owned read fixture: independently change the actual Customer fact, preserving captured Todo.title');
    const renamed = await consume('todo42.facts-renamed');
    for (const [index, type] of ['project', 'lead', 'customer'].entries()) {
        const dto = renamed.find(row => row.id === ids.todos[index]); assert(dto);
        assert.equal(dto.targetTitle, `Todo42 ${type} fact ${f.runId}`); assert.equal(dto.title, initial.find(row => row.id === dto.id).title);
    }
    await f.updateOwned('todo_item', ids.todos[0], { status: 'processing' }, 'Named owned read fixture: include original processing filter branch');
    await f.updateOwned('todo_item', ids.todos[1], { due_at: null }, 'Named owned read fixture: no-due reminder fallback, not a sales producer call');
    await f.updateOwned('todo_item', ids.todos[2], { status: 'completed', completed_at: '2026-05-08T03:15:00.000Z' }, 'Named owned read fixture: terminal Todo excluded');
    const processing = await consume('todo42.processing-no-due');
    assert.equal(processing.find(row => row.id === ids.todos[0])?.status, 'processing');
    assert.equal(processing.find(row => row.id === ids.todos[1])?.currentNodeName, '下次跟进');
    assert(!processing.some(row => row.id === ids.todos[2]));
    await f.updateOwned('todo_item', ids.todos[2], { status: 'open', completed_at: null, assignee_user_id: otherActorId },
        'Named owned read countercondition: different actual fresh actor, preserving source identity and no seed principal changes');
    const isolated = await consume('todo42.assignee-isolation'); assert(!isolated.some(row => row.id === ids.todos[2]));
    const tieAt = (await facts()).todo_item.find(row => row.id === ids.todos[1]).created_at;
    await f.updateOwned('todo_item', ids.todos[0], { created_at: tieAt }, 'Named owned read fixture: actual createdAt tie; retain observed response order without asserting an ID tie-breaker');
    await consume('todo42.created-at-tie');
    return { kind: 'actual-extra-Todo-fact-consumption-not-cross-backend-certification', result: 'observed', cases,
        sourcePlan, originalMapper: { source: oracle.source, compiledSha256: oracle.compiledSha256 },
        authenticationOnlyUserId: assigneeSession.userId, lifecycleOwnedByRoot: true, G3Certified: false, G4Certified: false };
}
