/**
 * Pure B repair requests/assertions. Root owns producers, sessions, barriers,
 * ACL fault injection/restoration, HTTP/PG execution and private evidence.
 * No IO, environment, program invocation, runner, random ID or current clock.
 * All request IDs are deterministic from Root's unique ASCII marker <=24.
 *
 * ids: customerId/contactId, actorUserId/otherUserId, otherOrgId/otherOrgName,
 * marker, writerActor?='admin', otherActor?='other'. Root supplies real IDs.
 * Normal case: request(evidence), assert(exchange,evidence).
 * Race: requests(evidence), sourceLock, assert(race,evidence), responses in
 * request order. race.waitingBeforeRelease must be actual source waiters=2.
 * evidence.beforeRows/afterRows maps contain complete owned customer,
 * customer_alias, customer_contact and audit_log arrays as applicable; do not
 * include independent auth keepalive in the business graph.
 * For CAS/fault probes, evidence.pendingSession has {due:true,requestId,
 * authKeepaliveSeparated:true,before,after}, captured for actual business-
 * managed pending fields. Root must distinguish independent auth guard upkeep.
 * No missing probe or empty graph is interpreted as a pass.
 * Owner-org projection case also requires evidence.readBack actual GET receipt.
 * CustomerDetailView uses FLAT public body fields (serde flatten).
 */
import {
    requireThat, equal, uuidEqual, value, rows, one, body, flatCustomer,
    actualDate, noBusinessWrites, onlyBusinessRowChange, pendingSessionRolledBack,
} from './assertions01.mjs';

const fields = ['rowVersion', 'updatedAt', 'updatedBy'];
const source = (evidence, table, id) => one(rows(evidence.beforeRows, table), id);
const header = (ids, name) => ({ 'x-request-id': `r3b:${ids.marker}:${name}` });
const actor = (ids) => ids.writerActor ?? 'admin';
const other = (ids) => ids.otherActor ?? 'other';
const request = (ids, name, role, table, json) => ({
    actor: role, method: 'PATCH',
    path: table === 'customer' ? `/api/customers/${ids.customerId}` : `/api/customer-contacts/${ids.contactId}`,
    headers: header(ids, name), json,
});
function actualInputs(ids) {
    requireThat(ids && /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/.test(ids.marker), 'Root unique ASCII marker 1..24 required');
    for (const name of ['customerId', 'contactId', 'actorUserId', 'otherUserId', 'otherOrgId']) uuidEqual(ids[name], ids[name], name);
    requireThat(ids.actorUserId !== ids.otherUserId && actor(ids) !== other(ids), 'Two actual different actors/sessions required');
    requireThat(typeof ids.otherOrgName === 'string' && ids.otherOrgName.length > 0, 'Actual other organization name required');
}
function changed(exchange, evidence, table, id, field, expected, operator, auditDelta = 0) {
    const result = table === 'customer' ? flatCustomer(exchange) : body(exchange, 200);
    const graph = onlyBusinessRowChange(evidence, table, id, [...fields, field], auditDelta);
    equal(value(graph.after, 'rowVersion'), value(graph.before, 'rowVersion') + 1, 'One business update increments version once');
    equal(result.rowVersion, value(graph.after, 'rowVersion'), 'Response version agrees with stored winner');
    equal(value(graph.after, field), expected, 'Winning business field');
    equal(result[field], expected, 'Response business field');
    uuidEqual(value(graph.after, 'updatedBy'), operator, 'Stored winning actor');
    uuidEqual(result.updatedBy, operator, 'Response winning actor');
    actualDate(value(graph.after, 'updatedAt'), 'Actual update time required');
    return { result, ...graph };
}

export function buildCustomerRepairCases(ids) {
    actualInputs(ids);
    return [
        {
            name: 'B.customer.noop.other', operationId: 'CustomerController_update',
            request(evidence) { return request(ids, 'customer-noop', other(ids), 'customer', { displayName: value(source(evidence, 'customer', ids.customerId), 'displayName') }); },
            assert(exchange, evidence) {
                const result = flatCustomer(exchange), before = source(evidence, 'customer', ids.customerId);
                noBusinessWrites(evidence);
                for (const name of ['displayName', 'rowVersion', 'updatedBy']) equal(result[name], value(before, name), `No-op response ${name}`);
            },
        },
        {
            name: 'B.customer.noop.owner-org-case', operationId: 'CustomerController_update',
            request(evidence) {
                const id = value(source(evidence, 'customer', ids.customerId), 'ownerOrgId');
                uuidEqual(id, id, 'Actual existing organization');
                return request(ids, 'org-noop', other(ids), 'customer', { ownerOrgId: id.toUpperCase() });
            },
            assert(exchange, evidence) {
                const result = flatCustomer(exchange), before = source(evidence, 'customer', ids.customerId);
                noBusinessWrites(evidence);
                uuidEqual(result.ownerOrgId, value(before, 'ownerOrgId'), 'UUID spelling is a business no-op');
                equal(result.rowVersion, value(before, 'rowVersion'), 'UUID spelling must not advance version');
                equal(result.updatedBy, value(before, 'updatedBy'), 'UUID spelling must not change actor');
                const read = flatCustomer(evidence.readBack);
                equal(result.ownerOrgName, read.ownerOrgName, 'Immediate no-op organization name matches GET');
                requireThat(typeof result.ownerOrgName === 'string' && result.ownerOrgName.length > 0, 'Actual organization name cannot disappear because of UUID case');
            },
        },
        {
            name: 'B.customer.change.other', operationId: 'CustomerController_update',
            request() { return request(ids, 'customer-change', other(ids), 'customer', { remark: `${ids.marker} real customer change` }); },
            assert(exchange, evidence) { changed(exchange, evidence, 'customer', ids.customerId, 'remark', `${ids.marker} real customer change`, ids.otherUserId); },
        },
        {
            name: 'B.customer.change.owner-org-uppercase', operationId: 'CustomerController_update',
            request(evidence) {
                const before = source(evidence, 'customer', ids.customerId);
                requireThat(value(before, 'ownerOrgId')?.toLowerCase() !== ids.otherOrgId.toLowerCase(), 'Projection probe needs a real organization change');
                return request(ids, 'org-change', actor(ids), 'customer', { ownerOrgId: ids.otherOrgId.toUpperCase() });
            },
            assert(exchange, evidence) {
                const result = flatCustomer(exchange), read = flatCustomer(evidence.readBack);
                const graph = onlyBusinessRowChange(evidence, 'customer', ids.customerId, [...fields, 'ownerOrgId']);
                uuidEqual(result.ownerOrgId, ids.otherOrgId, 'Immediate response organization identity');
                uuidEqual(read.ownerOrgId, ids.otherOrgId, 'GET organization identity');
                uuidEqual(value(graph.after, 'ownerOrgId'), ids.otherOrgId, 'Stored organization identity');
                equal(result.ownerOrgName, ids.otherOrgName, 'Immediate organization name is correct');
                equal(read.ownerOrgName, ids.otherOrgName, 'GET organization name is correct');
                equal(value(graph.after, 'rowVersion'), value(graph.before, 'rowVersion') + 1, 'Real org change advances version once');
                equal(result.rowVersion, value(graph.after, 'rowVersion'), 'Immediate org update version');
                uuidEqual(value(graph.after, 'updatedBy'), ids.actorUserId, 'Real org update actor');
            },
        },
        {
            name: 'B.contact.noop.other', operationId: 'CustomerContactController_update',
            request(evidence) { return request(ids, 'contact-noop', other(ids), 'customer_contact', { title: value(source(evidence, 'customer_contact', ids.contactId), 'title') }); },
            assert(exchange, evidence) {
                const result = body(exchange, 200), before = source(evidence, 'customer_contact', ids.contactId);
                noBusinessWrites(evidence);
                for (const name of ['title', 'rowVersion', 'updatedBy']) equal(result[name], value(before, name), `Contact no-op response ${name}`);
            },
        },
    ];
}

export function buildCustomerCasCases(ids) {
    actualInputs(ids);
    return ['customer', 'customer_contact'].map((table) => {
        const customer = table === 'customer', id = customer ? ids.customerId : ids.contactId;
        const field = customer ? 'remark' : 'title', label = customer ? 'customer-cas' : 'contact-cas';
        const definition = {
            name: `B.${label}`, operationId: customer ? 'CustomerController_update' : 'CustomerContactController_update',
            sourceLock: { table: `poms.${table}`, id, sql: `SELECT id,row_version FROM poms.${table} WHERE id=$1::uuid FOR UPDATE`, params: [id], requiredWaitingBeforeRelease: 2 },
            observation: 'Root must observe both real changed PATCH UPDATE waiters; two actors avoid a shared-session blocker. No DTO expectedVersion is added.',
            requests(evidence) {
                const prior = value(source(evidence, table, id), field);
                return [actor(ids), other(ids)].map((role, index) => {
                    const text = `${ids.marker} ${label} winner-${index}`;
                    requireThat(prior !== text, 'Both CAS requests must be real changes');
                    return request(ids, `${label}-${index}`, role, table, { [field]: text });
                });
            },
            assert(race, evidence) {
                equal(race?.waitingBeforeRelease, 2, 'Both actual source UPDATE waiters required');
                equal(evidence.lockSourceId, id, 'Source blocker identity');
                equal(evidence.lockTable, `poms.${table}`, 'Source blocker table');
                requireThat(Array.isArray(race.responses) && race.responses.length === 2, 'Two actual exchanges in request order required');
                equal(race.responses.map((item) => item.status).sort((a, b) => a - b), [200, 409], 'Normal CAS loss is409, not SQL500');
                const winner = race.responses.findIndex((item) => item.status === 200), loser = 1 - winner;
                const requests = definition.requests(evidence);
                const graph = changed(race.responses[winner], evidence, table, id, field, requests[winner].json[field], winner === 0 ? ids.actorUserId : ids.otherUserId, customer ? 0 : 1);
                if (!customer) {
                    const audit = graph.addedAudit[0];
                    equal(value(audit, 'eventType'), 'customer-contact.updated', 'Existing required contact event only');
                    equal(value(audit, 'requestId'), requests[winner].headers['x-request-id'], 'Only winner audit commits');
                    uuidEqual(value(audit, 'operatorId'), winner === 0 ? ids.actorUserId : ids.otherUserId, 'Required audit winning actor');
                    equal(value(audit, 'targetId'), id, 'Required audit target');
                }
                pendingSessionRolledBack(evidence, requests[loser].headers['x-request-id']);
                return { winnerIndex: winner, loserIndex: loser };
            },
        };
        return definition;
    });
}

export function buildCustomerRequiredWriteFaultCases(ids) {
    actualInputs(ids);
    return [
        { name: 'customer-update', table: 'customer', fault: 'Root deny app role customer UPDATE only; restore in finally', field: 'remark' },
        { name: 'contact-update', table: 'customer_contact', fault: 'Root deny app role customer_contact UPDATE only, after required audit/session; restore in finally', field: 'title' },
        { name: 'contact-audit', table: 'customer_contact', fault: 'Root deny app role audit_log INSERT only; restore in finally', field: 'title' },
    ].map(({ name, table, fault, field }) => ({
        name: `B.required-write.${name}`, expectedStatus: 500, fault,
        observation: 'Actual due business-managed session fields required; independent auth upkeep is outside the business snapshot.',
        request: () => request(ids, `fault-${name}`, actor(ids), table, { [field]: `${ids.marker} necessary write ${name}` }),
        assert(exchange, evidence) {
            body(exchange, 500);
            noBusinessWrites(evidence);
            pendingSessionRolledBack(evidence, header(ids, `fault-${name}`)['x-request-id']);
        },
    }));
}
