/**
 * Pure FollowUp business-concurrency definitions; Root alone executes.
 * No IO, requests, DB connections, processes, environment, clock, random IDs,
 * injected product state, runner, self-run, product edits or formatting.
 *
 * buildFollowUpConcurrencyBusinessPlan(ids) returns three independent cases.
 * Each case has producer.request()/assert(), requests(state), sourceLock(state)
 * and assert(race,state,evidence). state[producer.name] is the actual POST
 * receipt {status:201,body}, never a fabricated ID/version. responses must be
 * in the same order as requests(state); completion order is not request order.
 *
 * Root inputs follow the foundation definitions: actorUserId/actorOrgId,
 * otherUserId/otherOrgId, followUpTypeCode, times.{occurredAt,nextFollowUpAt,
 * replacementOccurredAt,replacementNextFollowUpAt}; both reminder times must
 * remain future throughout the actual run. writerActor/otherActor default to
 * admin/other and both sessions need the existing write permissions.
 * raceMarker (or marker) is a unique ASCII token of at most 24 characters.
 *
 * ids.fixtures['replace-replace'|'void-void'|'replace-void'] supplies each real
 * {customerId,projectId}. ids.customerId/projectId are a fallback only when
 * Root independently guarantees an isolated empty reminder stream per case.
 * Use three fresh actual projects, then POST one source per project. Its owner
 * is actorUserId; both replacement contenders explicitly assign otherUserId.
 * This keeps the legitimate source-Todo terminal status unambiguous: canceled.
 * Never reuse a terminal source or reset data/version to imitate a fresh row.
 *
 * Source lock: Root holds the returned parameterized SELECT ... FOR UPDATE in
 * its own transaction, dispatches BOTH requests, observes BOTH application
 * backends blocked by that source lock, then commits the blocker. A blocker or
 * waiter count on Todo/session/audit rows does not prove this source barrier.
 * No sleep-based overlap or simultaneous dispatch alone qualifies as evidence.
 *
 * race = {waitingBeforeRelease:2,responses:[actualExchangeA,actualExchangeB]}.
 * evidence = {
 *   lockTable:'poms.sales_follow_up_record', lockSourceId:actualSourceId,
 *   sourceRowLockHeldUntilTwoWaiters:true,
 *   beforeRows:{sales_follow_up_record:[],todo_item:[],audit_log:[]},
 *   afterRows: {sales_follow_up_record:[],todo_item:[],audit_log:[]}
 * }.
 * Snapshot scopes: ALL F rows for the isolated project; ALL follow-up reminder
 * rows for that project target (all owners, including canceled/history); ALL
 * audit rows targeting the actual source ID or carrying either requestId.
 * Capture beforeRows after producer and before blocker release; afterRows only
 * after both commands settle. Preserve raw actual receipts and lock evidence.
 * Auth-session maintenance is separate from this business graph; it must not
 * be mistaken for a losing command's business write. Missing evidence fails.
 */

import {
    buildFoundationFollowUpRequest,
    buildFoundationReplacementRequest,
    buildFoundationVoidRequest,
} from './foundation-business-regression01.mjs';

export const followUpConcurrencyBusinessRequirements = Object.freeze({
    kind: 'FollowUp-business-concurrency-definitions-only',
    authorExecution: false,
    races: ['replace-replace', 'void-void', 'replace-void'],
    expectedStatusMultiset: [200, 409],
    requiredSourceWaiters: 2,
    actorUsersMustDiffer: true,
    fixtureOrder: 'actual Customer/Project -> actual source POST -> snapshots -> source blocker -> two blocked commands -> release -> settled responses -> snapshots',
    sourceMechanism: [
        'apps/poms-api-rust/src/sales_follow_up/store.rs: lock_source SELECT source F FOR UPDATE',
        'apps/poms-api-rust/src/sales_follow_up/service.rs: flush locks/rechecks source before reminder::prepare',
        'apps/poms-api-rust/src/sales_follow_up/service.rs: record/reminder/session/required audit share one transaction',
    ],
    businessTruth: 'one source lifecycle transition; append-only unique replacement; one current Todo; winner required audit once; loser business graph unchanged',
});

const requireThat = (value, message) => { if (!value) throw new Error(message); };
const snake = (name) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const field = (row, name) => {
    requireThat(row && typeof row === 'object', 'Actual row required');
    if (Object.hasOwn(row, name)) return row[name];
    if (Object.hasOwn(row, snake(name))) return row[snake(name)];
    if (name === 'supersedesId') return row.supersedes_record_id;
    if (name === 'replacedById') return row.replaced_by_record_id;
    return undefined;
};
const canonical = (value) => {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
};
const equal = (actual, expected, label) => requireThat(JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)), label);
const instant = (value) => Date.parse(value instanceof Date ? value.toISOString() : value);
const date = (actual, expected, label) => {
    requireThat(Number.isFinite(instant(actual)) && Number.isFinite(instant(expected)), `${label}: actual datetime evidence required`);
    equal(instant(actual), instant(expected), label);
};
const actualDate = (value, label) => requireThat(Number.isFinite(instant(value)), `${label}: actual persisted datetime required`);
const textId = (value, label) => requireThat(typeof value === 'string' && value.length > 0, `${label}: real ID required`);
const activeTodo = (row) => ['open', 'processing'].includes(field(row, 'status'));
const rows = (map, table, phase) => {
    requireThat(map && Array.isArray(map[table]), `Missing ${phase}.${table} actual snapshot`);
    const values = map[table];
    requireThat(values.every((row) => row && typeof row.id === 'string'), `${phase}.${table}: actual row IDs required`);
    requireThat(new Set(values.map((row) => row.id)).size === values.length, `${phase}.${table}: duplicate row evidence`);
    return values;
};
const only = (values, label) => { requireThat(values.length === 1, `${label}: expected exactly one actual row`); return values[0]; };
const except = (row, names) => {
    const excluded = new Set(names.flatMap((name) => [name, snake(name)]));
    return Object.fromEntries(Object.entries(row).filter(([name]) => !excluded.has(name)));
};
const sourceReceipt = (state, producer) => {
    const receipt = state?.[producer.name];
    requireThat(receipt && receipt.status === 201 && receipt.body, `Missing actual 201 producer receipt ${producer.name}`);
    producer.assert(receipt);
    return receipt.body;
};
const requestId = (request) => request.headers['x-request-id'];
const auditMetadata = (row) => {
    const value = field(row, 'metadata');
    if (typeof value !== 'string') {
        requireThat(value && typeof value === 'object' && !Array.isArray(value), 'Persisted audit metadata object required');
        return value;
    }
    const parsed = JSON.parse(value);
    requireThat(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Persisted audit metadata object required');
    return parsed;
};

function makeCase(ids, key, modes, marker) {
    const fixture = ids.fixtures?.[key] ?? { customerId: ids.customerId, projectId: ids.projectId };
    textId(fixture.customerId, `${key}.customerId`);
    textId(fixture.projectId, `${key}.projectId`);
    const actor = ids.writerActor ?? 'admin';
    const otherActor = ids.otherActor ?? 'other';
    const producer = {
        name: `F.concurrent.${key}.source`,
        operationId: 'SalesFollowUpController_create', expectedStatus: 201,
        dependsOn: [`Root.actual-isolated-project:${fixture.projectId}`],
        request: () => ({
            actor, method: 'POST', path: '/api/sales-follow-up-records',
            headers: { 'x-request-id': `f-race:${marker}:${key}:seed` },
            json: buildFoundationFollowUpRequest(fixture.customerId, fixture.projectId, ids, {
                summary: `${marker} ${key} source`,
                detail: `${marker} source private detail`,
                ownerUserId: ids.actorUserId, ownerOrgId: ids.actorOrgId,
            }),
        }),
        assert(exchange) {
            requireThat(exchange?.status === 201 && exchange.body, `${key}: actual source POST must succeed`);
            const source = exchange.body;
            textId(source.id, `${key}.source.id`);
            requireThat(Number.isInteger(source.rowVersion) && source.rowVersion > 0, 'Actual source version required');
            equal(source.status, 'active', 'Producer must return an active source');
            equal(source.customerId, fixture.customerId, 'Source customer anchor');
            equal(source.projectId, fixture.projectId, 'Source project anchor');
            equal(source.ownerUserId, ids.actorUserId, 'Source reminder owner');
            equal(source.supersedesId, null, 'Producer must be a fresh lineage root');
            equal(source.replacedById, null, 'Producer must have no successor');
            date(source.nextFollowUpAt, ids.times.nextFollowUpAt, 'Source reminder due time');
        },
    };
    const definition = {
        name: `F.concurrent.${key}`, modes, fixture, producer,
        dependsOn: [producer.name], expectedStatusMultiset: [200, 409],
        actorUserIds: [ids.actorUserId, ids.otherUserId],
        replacementOwnerUserId: ids.otherUserId,
        requests(state) {
            const source = sourceReceipt(state, producer);
            return modes.map((mode, index) => {
                const side = index === 0 ? 'a' : 'b';
                const summary = `${marker} ${key} winner-${side}`;
                const json = mode === 'replace'
                    ? buildFoundationReplacementRequest(source, ids, {
                        summary, detail: `${marker} replacement private detail ${side}`,
                        replacementReason: `${marker} ${key} correction-${side}`,
                        ownerUserId: ids.otherUserId, ownerOrgId: ids.otherOrgId,
                    })
                    : buildFoundationVoidRequest(source, ids, {
                        reason: `${marker} ${key} withdraw-${side}`, comment: `actual contender ${side}`,
                    });
                return {
                    actor: index === 0 ? actor : otherActor,
                    operationId: mode === 'replace' ? 'SalesFollowUpController_replace' : 'SalesFollowUpController_void',
                    method: 'POST', path: `/api/sales-follow-up-records/${source.id}:${mode}`,
                    headers: { 'x-request-id': `f-race:${marker}:${key}:${side}` }, json,
                };
            });
        },
        sourceLock(state) {
            const source = sourceReceipt(state, producer);
            return {
                owner: 'Root', table: 'poms.sales_follow_up_record', sourceId: source.id,
                mode: 'FOR UPDATE', expectedVersion: source.rowVersion,
                sql: 'SELECT id,row_version,status FROM poms.sales_follow_up_record WHERE id=$1::uuid FOR UPDATE',
                params: [source.id], requiredWaitingBeforeRelease: 2,
                releaseOnlyAfter: 'both actual application transactions wait on this source-row blocker',
            };
        },
        assert(race, state, evidence) { return assertFollowUpConcurrencyBusiness(definition, race, state, evidence); },
    };
    return definition;
}

export function buildFollowUpConcurrencyBusinessPlan(ids) {
    requireThat(ids && typeof ids === 'object', 'Actual Root fixture inputs required');
    const marker = ids.raceMarker ?? ids.marker;
    requireThat(typeof marker === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/.test(marker), 'Unique ASCII raceMarker, 1..24 characters, required for bounded request IDs');
    for (const name of ['actorUserId', 'actorOrgId', 'otherUserId', 'otherOrgId', 'followUpTypeCode']) textId(ids[name], name);
    requireThat(ids.actorUserId !== ids.otherUserId, 'Contender identities must differ');
    requireThat((ids.writerActor ?? 'admin') !== (ids.otherActor ?? 'other'), 'Contender sessions must differ');
    for (const name of ['occurredAt', 'nextFollowUpAt', 'replacementOccurredAt', 'replacementNextFollowUpAt']) actualDate(ids.times?.[name], `times.${name}`);
    return {
        ...followUpConcurrencyBusinessRequirements,
        builderDependency: './foundation-business-regression01.mjs (three existing pure FollowUp DTO constructors)',
        requiredEvidence: ['two source-row waiters before blocker release', 'responses in request order', 'beforeRows/afterRows with all three scoped tables'],
        cases: [makeCase(ids, 'replace-replace', ['replace', 'replace'], marker), makeCase(ids, 'void-void', ['void', 'void'], marker), makeCase(ids, 'replace-void', ['replace', 'void'], marker)],
    };
}

export function buildFollowUpConcurrencyCases(ids) {
    return buildFollowUpConcurrencyBusinessPlan(ids).cases;
}

export function assertFollowUpConcurrencyBusiness(definition, race, state, evidence = {}) {
    const source = sourceReceipt(state, definition.producer);
    const requests = definition.requests(state);
    equal(race?.waitingBeforeRelease, 2, 'Both application transactions must actually wait before source blocker release');
    equal(evidence.lockTable, 'poms.sales_follow_up_record', 'Barrier must lock the source F table');
    equal(evidence.lockSourceId, source.id, 'Barrier must lock this actual source row');
    equal(evidence.sourceRowLockHeldUntilTwoWaiters, true, 'Root must retain actual proof that both requests reached the source lock');
    requireThat(Array.isArray(race.responses) && race.responses.length === 2, 'Two actual settled exchanges in request order required');
    equal(race.responses.map((value) => value.status).sort((a, b) => a - b), [200, 409], 'Same-source race must have one winner and one conflict');
    const winnerIndex = race.responses.findIndex((value) => value.status === 200);
    const loserIndex = 1 - winnerIndex;
    const winner = race.responses[winnerIndex].body;
    requireThat(winner && typeof winner === 'object', 'Winner response body required');
    const winningRequest = requests[winnerIndex], losingRequest = requests[loserIndex];
    const mode = definition.modes[winnerIndex], actorId = definition.actorUserIds[winnerIndex];
    for (const request of requests) equal(request.json.expectedVersion, source.rowVersion, 'Both commands must carry the same actual source version');
    requireThat(requestId(winningRequest) !== requestId(losingRequest), 'Contenders require distinct request IDs');

    const beforeF = rows(evidence.beforeRows, 'sales_follow_up_record', 'beforeRows');
    const afterF = rows(evidence.afterRows, 'sales_follow_up_record', 'afterRows');
    const beforeTodo = rows(evidence.beforeRows, 'todo_item', 'beforeRows');
    const afterTodo = rows(evidence.afterRows, 'todo_item', 'afterRows');
    const beforeAudit = rows(evidence.beforeRows, 'audit_log', 'beforeRows');
    const afterAudit = rows(evidence.afterRows, 'audit_log', 'afterRows');
    const old = only(beforeF, 'Fresh isolated source lineage');
    equal(old.id, source.id, 'Persisted baseline source ID');
    equal(field(old, 'status'), 'active', 'Persisted baseline source state');
    equal(field(old, 'rowVersion'), source.rowVersion, 'Persisted baseline source version');
    const changed = only(afterF.filter((row) => row.id === source.id), 'Retained source row');
    equal(field(changed, 'rowVersion'), source.rowVersion + 1, 'Source may change exactly once');
    equal(field(changed, 'updatedBy'), actorId, 'Only the winning actor updates the source');
    actualDate(field(changed, 'updatedAt'), 'Source updatedAt');
    requireThat(instant(field(changed, 'updatedAt')) >= instant(field(old, 'updatedAt')), 'Source updatedAt cannot move backwards');
    equal(except(changed, ['status', 'replacedByRecordId', 'replacedById', 'voidedAt', 'voidedBy', 'voidReason', 'rowVersion', 'updatedAt', 'updatedBy']),
        except(old, ['status', 'replacedByRecordId', 'replacedById', 'voidedAt', 'voidedBy', 'voidReason', 'rowVersion', 'updatedAt', 'updatedBy']), 'Source content/anchors/creation facts are append-only');

    const added = afterF.filter((row) => row.id !== source.id);
    let finalRow;
    if (mode === 'replace') {
        finalRow = only(added, 'Unique committed replacement; no losing replacement');
        equal(afterF.length, 2, 'One historical source plus one winning replacement');
        requireThat(finalRow.id !== source.id, 'Replacement must append a new record');
        equal(winner.id, finalRow.id, 'Winner returns the actual unique replacement');
        equal(field(changed, 'status'), 'superseded', 'Winning replacement supersedes source');
        equal(field(changed, 'replacedById'), finalRow.id, 'Source links only to the winning replacement');
        equal(field(finalRow, 'supersedesId'), source.id, 'Replacement links back to actual source');
        equal(field(finalRow, 'status'), 'active', 'Winning replacement is active');
        equal(field(finalRow, 'rowVersion'), 1, 'Unique replacement is inserted once');
        equal(field(finalRow, 'createdBy'), actorId, 'Winning replacement creator');
        equal(field(finalRow, 'updatedBy'), actorId, 'Winning replacement update actor');
        for (const name of ['customerId', 'leadId', 'projectId']) equal(field(finalRow, name), field(old, name), `Replacement retains ${name}`);
        for (const name of ['followUpType', 'summary', 'detail', 'outcome', 'ownerUserId', 'ownerOrgId', 'replacementReason']) equal(field(finalRow, name), winningRequest.json[name], `Only winning replacement ${name} persists`);
        for (const name of ['occurredAt', 'nextFollowUpAt']) date(field(finalRow, name), winningRequest.json[name], `Replacement ${name}`);
        for (const name of ['replacedById', 'voidedAt', 'voidedBy', 'voidReason']) equal(field(finalRow, name), null, `New active replacement has no ${name}`);
        for (const name of ['voidedAt', 'voidedBy', 'voidReason']) equal(field(changed, name), field(old, name), `A losing void cannot change source ${name}`);
    } else {
        equal(added.length, 0, 'Void winner leaves no losing replacement row');
        equal(afterF.length, 1, 'Void retains the one append-only source');
        finalRow = changed;
        equal(winner.id, source.id, 'Void returns the actual source');
        equal(field(changed, 'status'), 'voided', 'Winning void changes source lifecycle');
        equal(field(changed, 'replacedById'), null, 'A losing replacement cannot install a successor');
        equal(field(changed, 'voidedBy'), actorId, 'Only the winning actor voids source');
        equal(field(changed, 'voidReason'), `${winningRequest.json.reason}: ${winningRequest.json.comment}`, 'Only winning void reason/comment persists');
        actualDate(field(changed, 'voidedAt'), 'Winning void timestamp');
    }
    for (const name of ['customerId', 'leadId', 'projectId', 'status', 'summary', 'ownerUserId', 'ownerOrgId', 'rowVersion', 'supersedesId', 'replacedById', 'replacementReason', 'voidedBy', 'voidReason']) equal(winner[name], field(finalRow, name), `Winner response agrees with persisted ${name}`);
    equal(afterF.filter((row) => field(row, 'status') === 'active').length, mode === 'replace' ? 1 : 0, 'Active lineage contains only the winning replacement, if any');

    const oldTodo = only(beforeTodo.filter(activeTodo), 'Fresh stream must have only source active Todo');
    equal(field(oldTodo, 'sourceId'), source.id, 'Baseline active Todo belongs to source');
    equal(field(oldTodo, 'assigneeUserId'), source.ownerUserId, 'Baseline source Todo owner');
    const canceled = only(afterTodo.filter((row) => row.id === oldTodo.id), 'Source Todo retained');
    equal(field(canceled, 'status'), 'canceled', 'Winning owner-change replacement or void cancels source Todo');
    equal(field(canceled, 'rowVersion'), field(oldTodo, 'rowVersion') + 1, 'Source Todo changes once; loser cannot mutate it');
    actualDate(field(canceled, 'completedAt'), 'Canceled source Todo completion timestamp');
    equal(except(canceled, ['status', 'completedAt', 'rowVersion', 'updatedAt']), except(oldTodo, ['status', 'completedAt', 'rowVersion', 'updatedAt']), 'Source Todo identity/owner/target/content are retained');
    for (const prior of beforeTodo.filter((row) => row.id !== oldTodo.id)) equal(only(afterTodo.filter((row) => row.id === prior.id), 'Retained historical Todo'), prior, 'No unrelated/historical Todo write');
    const newTodos = afterTodo.filter((row) => !beforeTodo.some((prior) => prior.id === row.id));
    equal(afterTodo.length, beforeTodo.length + (mode === 'replace' ? 1 : 0), 'No losing Todo insert or historical deletion');
    if (mode === 'replace') {
        const currentTodo = only(newTodos, 'Only winning replacement produces a Todo');
        equal(field(currentTodo, 'sourceId'), finalRow.id, 'Current Todo belongs to winning replacement');
        equal(field(currentTodo, 'sourceType'), 'sales-follow-up-record', 'Current Todo source type');
        equal(field(currentTodo, 'todoType'), 'sales-follow-up-reminder', 'Current Todo type');
        equal(field(currentTodo, 'targetObjectType'), 'project', 'Most-specific actual target remains project');
        equal(field(currentTodo, 'targetObjectId'), source.projectId, 'Current Todo actual project target');
        equal(field(currentTodo, 'projectId'), source.projectId, 'Current Todo project association');
        equal(field(currentTodo, 'assigneeUserId'), definition.replacementOwnerUserId, 'Current Todo explicit replacement owner');
        equal(field(currentTodo, 'summary'), winningRequest.json.summary, 'Current Todo contains only winning public summary, no private detail');
        equal(field(currentTodo, 'status'), 'open', 'Single current reminder is open');
        equal(field(currentTodo, 'rowVersion'), 1, 'Current Todo is inserted once');
        equal(field(currentTodo, 'completedAt'), null, 'Current reminder is not completed');
        date(field(currentTodo, 'dueAt'), winningRequest.json.nextFollowUpAt, 'Current Todo due time');
    } else equal(newTodos.length, 0, 'Void winner leaves no losing Todo');
    equal(afterTodo.filter(activeTodo).length, mode === 'replace' ? 1 : 0, 'Only one winning current reminder, or none after void');

    equal(beforeAudit.length, 0, 'Fresh source/request audit scope must be empty before race');
    const successAudit = only(afterAudit, 'Exactly one necessary audit; losing request commits none');
    const event = mode === 'replace' ? 'sales-follow-up.replaced' : 'sales-follow-up.voided';
    equal(field(successAudit, 'eventType'), event, 'Only winning command event is audited');
    equal(field(successAudit, 'targetType'), 'sales-follow-up-record', 'Required audit target type');
    equal(field(successAudit, 'targetId'), source.id, 'Required audit targets original source');
    equal(field(successAudit, 'operatorId'), actorId, 'Required audit winning actor');
    equal(field(successAudit, 'requestId'), requestId(winningRequest), 'Required audit belongs to winning request only');
    equal(field(successAudit, 'result'), 'success', 'Required audit success');
    const metadata = auditMetadata(successAudit);
    for (const name of ['customerId', 'leadId', 'projectId', 'status', 'summary', 'outcome', 'rowVersion']) equal(metadata.before?.[name], field(old, name), `Audit before uses actual source ${name}`);
    for (const name of ['customerId', 'leadId', 'projectId', 'status', 'summary', 'outcome', 'rowVersion', 'supersedesId', 'replacedById', 'replacementReason', 'voidedBy', 'voidReason']) equal(metadata.after?.[name], field(finalRow, name), `Audit after uses committed winner ${name}`);
    if (mode === 'replace') {
        equal(metadata.replacementId, finalRow.id, 'Audit unique replacement ID');
        equal(metadata.replacementReason, winningRequest.json.replacementReason, 'Audit winning replacement reason');
    } else equal(metadata.reason, field(finalRow, 'voidReason'), 'Audit winning void reason');
    return { winnerIndex, loserIndex, winningOperation: mode, sourceId: source.id, replacementId: mode === 'replace' ? finalRow.id : null, winnerRequestId: requestId(winningRequest), loserRequestId: requestId(losingRequest) };
}
