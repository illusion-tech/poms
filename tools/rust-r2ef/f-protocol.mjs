// Finite F acceptance inputs for the root-owned isolated runner. This file
// creates no credentials, starts no service and does not connect to a database.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const corpus = JSON.parse(readFileSync(new URL('./f-golden.json', import.meta.url), 'utf8'));
const authority = JSON.parse(readFileSync(new URL('./f-authority.json', import.meta.url), 'utf8'));
export const F_OPERATIONS = [
    ['GET', '/api/audit-logs'], ['GET', '/api/audit-logs/targets/{targetType}/{targetId}'],
    ['GET', '/api/security-events'], ['POST', '/api/security-events:recordRouteDenied']
];
export const F_AUDIT_FIELDS = ['id', 'eventType', 'targetType', 'targetId', 'operatorId', 'requestId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata', 'occurredAt'];
export const F_SECURITY_FIELDS = ['id', 'eventType', 'severity', 'actorId', 'principal', 'requestId', 'path', 'method', 'permissionKey', 'result', 'ip', 'userAgent', 'details', 'occurredAt'];

export function expectedValidation(schema, name) {
    const entry = corpus.cases.find(entry => entry.schema === schema && entry.name === name);
    assert(entry && entry.expected.success === false, `Missing original invalid DTO case ${schema} ${name}`);
    return { status: 400, body: { statusCode: 400, message: 'Validation failed', ...(entry.expected.errors ? { errors: entry.expected.errors } : {}) } };
}

export function fHttpPlan(fixture) {
    for (const key of ['targetId', 'auditEventType', 'securityEventType', 'operatorId', 'actorId', 'inclusiveAt', 'routePath']) assert.equal(typeof fixture[key], 'string', `Missing F fixture field ${key}`);
    assert.notEqual(fixture.targetId, fixture.targetId.toUpperCase(), 'Strict varchar case fixture needs a mixed/lowercase target');
    const encode = encodeURIComponent;
    const audit = '/api/audit-logs?eventType=' + encode(fixture.auditEventType);
    const security = '/api/security-events?eventType=' + encode(fixture.securityEventType);
    const entity = type => '/api/audit-logs/targets/' + type + '/' + encode(fixture.targetId);
    const cases = [];
    const add = (id, actor, method, path, expected, extra = {}) => cases.push({ id: 'F:' + id, actor, method, path, expected, ...extra });
    const rows = (fields, extra = {}) => ({ status: 200, rows: { exactFields: fields, ...extra } });
    add('audit-default-limit', 'admin', 'GET', audit, rows(F_AUDIT_FIELDS, { count: 50, descending: 'occurredAt' }));
    add('audit-limit-100', 'admin', 'GET', audit + '&limit=100', rows(F_AUDIT_FIELDS, { count: 100 }));
    add('audit-coerce-hex', 'admin', 'GET', audit + '&limit=0x10', rows(F_AUDIT_FIELDS, { count: 16 }));
    add('audit-inclusive', 'admin', 'GET', audit + '&from=' + encode(fixture.inclusiveAt) + '&to=' + encode(fixture.inclusiveAt), rows(F_AUDIT_FIELDS, { minimum: 1, timestamp: fixture.inclusiveAt }));
    add('audit-reverse-range', 'admin', 'GET', audit + '&from=2027-01-01T00%3A00%3A00Z&to=2026-01-01T00%3A00%3A00Z', { status: 200, body: [] });
    add('audit-operator-uuid-case', 'admin', 'GET', audit + '&operatorId=' + fixture.operatorId.toUpperCase(), rows(F_AUDIT_FIELDS, { minimum: 1, operatorId: fixture.operatorId.toLowerCase() }));
    add('audit-target-space-exact', 'admin', 'GET', audit + '&targetId=' + encode(' ' + fixture.targetId + ' '), { status: 200, body: [] });
    add('audit-invalid-limit', 'admin', 'GET', '/api/audit-logs?limit=101', expectedValidation('AuditLogListQuery', 'limit:above'));
    add('audit-duplicate-limit', 'admin', 'GET', '/api/audit-logs?limit=2&limit=3', expectedValidation('AuditLogListQuery', 'limit:two-array'));
    add('audit-date-offset', 'admin', 'GET', '/api/audit-logs?from=2026-10-28T01%3A02%3A03%2B00%3A00', expectedValidation('AuditLogListQuery', 'from:offset'));
    add('security-default-limit', 'admin', 'GET', security, rows(F_SECURITY_FIELDS, { count: 50, descending: 'occurredAt' }));
    add('security-limit-100', 'admin', 'GET', security + '&limit=100', rows(F_SECURITY_FIELDS, { count: 100 }));
    add('security-actor-uuid-case', 'admin', 'GET', security + '&actorId=' + fixture.actorId.toUpperCase(), rows(F_SECURITY_FIELDS, { minimum: 1, actorId: fixture.actorId.toLowerCase() }));
    add('security-permission-is-filter-text', 'admin', 'GET', security + '&permissionKey=not-an-enum-filter', rows(F_SECURITY_FIELDS, { minimum: 1, permissionKey: 'not-an-enum-filter' }));
    add('security-invalid-result', 'admin', 'GET', '/api/security-events?result=success', expectedValidation('SecurityEventListQuery', 'result:"success"'));
    for (const target of authority.entityTargetTypes) {
        const permission = authority.targetReadPermissions[target][0];
        add('entity-type-' + target, { onlyPermission: permission }, 'GET', entity(target), rows(F_AUDIT_FIELDS, { minimum: 1, targetType: target, targetId: fixture.targetId }));
    }
    add('entity-js-trim', { onlyPermission: 'lead:read' }, 'GET', '/api/audit-logs/targets/lead/' + encode('\ufeff ' + fixture.targetId + '\u00a0'), rows(F_AUDIT_FIELDS, { minimum: 1, targetId: fixture.targetId }));
    add('entity-strict-case', { onlyPermission: 'lead:read' }, 'GET', '/api/audit-logs/targets/lead/' + encode(fixture.targetId.toUpperCase()), { status: 200, body: [] });
    add('entity-query-scope-cannot-override', { onlyPermission: 'lead:read' }, 'GET', entity('lead') + '?targetType=customer&targetId=spoof&operatorId=bad', rows(F_AUDIT_FIELDS, { minimum: 1, targetType: 'lead', targetId: fixture.targetId }));
    add('entity-secondary-permission', { onlyPermission: 'customer:read' }, 'GET', entity('lead'), { status: 403, body: { statusCode: 403, message: 'Missing permission to read lead audit logs', error: 'Forbidden' }, securityEventDelta: 0 });
    add('entity-invalid-type-before-id', { onlyPermission: 'lead:read' }, 'GET', '/api/audit-logs/targets/unsupported/%20', { status: 400, body: { statusCode: 400, message: 'Unsupported entity audit targetType: unsupported', error: 'Bad Request' } });
    add('entity-empty-id-before-permission', { onlyPermission: 'customer:read' }, 'GET', '/api/audit-logs/targets/lead/%20', { status: 400, body: { statusCode: 400, message: 'targetId is required', error: 'Bad Request' } });
    add('entity-query-before-type', { onlyPermission: 'lead:read' }, 'GET', '/api/audit-logs/targets/unsupported/id?limit=101', expectedValidation('EntityAuditLogListQuery', 'limit:above'));
    add('global-route-permission-before-query', 'viewer', 'GET', '/api/audit-logs?limit=101', { status: 403, guardCode: 'permission_denied' });
    add('entity-coarse-route-permission', 'adminOnly', 'GET', entity('lead'), { status: 403, guardCode: 'permission_denied' });
    add('session-before-query', 'none', 'GET', '/api/security-events?limit=101', { status: 401, guardCode: 'session_missing' });
    add('transport-uppercase-and-slash', 'admin', 'GET', audit.replace('/api/audit-logs', '/API/AUDIT-LOGS/'), rows(F_AUDIT_FIELDS, { count: 50 }));
    add('implicit-head', 'admin', 'HEAD', security, { status: 200, emptyBody: true, sameHeadersAs: 'F:security-default-limit' });
    add('dynamic-uri-before-session', 'none', 'GET', '/api/audit-logs/targets/lead/%FF', { status: 400, body: { statusCode: 400, message: "Failed to decode param '%FF'", error: 'Bad Request' } });
    add('dynamic-uri-before-method', 'none', 'POST', '/api/audit-logs/targets/%FF/id', { status: 400, body: { statusCode: 400, message: "Failed to decode param '%FF'", error: 'Bad Request' } });
    add('encoded-fixed-route-is-404', 'none', 'GET', '/api/%61udit-logs', { status: 404, compareOriginalBody: true });
    const command = '/api/security-events:recordRouteDenied';
    const body = { path: fixture.routePath, requiredPermissions: ['platform:users:manage'] };
    const accepted = details => ({ status: 202, emptyBody: true, contentTypeAbsent: true, securityEvent: { eventType: 'authz.route.denied', severity: 'warning', method: 'ROUTE', result: 'blocked', path: fixture.routePath, details } });
    add('route-denied-viewer', 'viewer', 'POST', command, accepted({ requiredPermissions: body.requiredPermissions, returnUrl: null }), { body, ownsRouteDenied: true });
    add('route-denied-context-and-duplicates', 'viewer', 'POST', command, accepted({ requiredPermissions: ['project:read', 'lead:read', 'project:read'], returnUrl: '/return' }), { body: { ...body, returnUrl: '/return', requiredPermissions: ['project:read', 'lead:read', 'project:read'], actorId: 'spoof', eventType: 'spoof' }, headers: { 'x-forwarded-for': ' 192.0.2.1 , 198.51.100.1', 'user-agent': 'r2ef-fixture-agent' }, ownsRouteDenied: true, expectedContext: { ip: '192.0.2.1', userAgent: 'r2ef-fixture-agent', permissionKey: 'project:read', actor: 'viewer' } });
    add('route-denied-null-return', 'viewer', 'POST', command, accepted({ requiredPermissions: body.requiredPermissions, returnUrl: null }), { body: { ...body, returnUrl: null }, ownsRouteDenied: true });
    add('route-denied-body-validation', 'viewer', 'POST', command, expectedValidation('RecordRouteDeniedSecurityEventRequest', 'empty'), { body: {} });
    add('route-denied-invalid-permission', 'viewer', 'POST', command, expectedValidation('RecordRouteDeniedSecurityEventRequest', 'permissions:wrong'), { body: { ...body, requiredPermissions: ['future:permission'] } });
    add('route-denied-session-before-dto', 'none', 'POST', command, { status: 401, guardCode: 'session_missing' }, { body: {} });
    add('route-denied-csrf-before-dto', 'viewer', 'POST', command, { status: 403, guardCode: 'csrf_failed' }, { body: {}, omitCsrf: true });
    add('route-denied-parser-before-session', 'none', 'POST', command, { status: 400, compareOriginalBody: true }, { rawBody: '{', contentType: 'application/json' });
    add('route-denied-long-request-id', 'viewer', 'POST', command, { status: 500, securityEventDelta: 0, rawSessionTouchPreserved: true }, { body, headers: { 'x-request-id': 'x'.repeat(65) } });
    add('route-denied-long-UA', 'viewer', 'POST', command, { status: 500, securityEventDelta: 0, rawSessionTouchPreserved: true }, { body, headers: { 'user-agent': 'x'.repeat(513) } });
    assert.equal(new Set(cases.map(entry => entry.id)).size, cases.length);
    return { formatVersion: 1, boundary: 'Planned finite F HTTP assertions; root must execute and retain actual observations separately', operations: F_OPERATIONS, fixture, cases };
}

export const F_SQL_WITNESSES = [
    { id: 'F:query-only', requirement: 'Real original list reads preserve exact filters, inclusive dates, default50/limit100, PG microsecond ordering and original summary projection. Do not invent a managed-session flush for GET.' },
    { id: 'F:route-denied-pending-success', requirement: 'Original event INSERT precedes dirty managed-session CAS within one flush transaction; raw session touch committed before it. Verify persisted actor/principal/requestId/IP/UA/details and exactly one event.' },
    { id: 'F:route-denied-no-pending', requirement: 'When session change-set is actually absent, no unconditional managed-session UPDATE; preserve real raw touch behavior.' },
    { id: 'F:route-denied-cas-conflict', requirement: 'Controlled interleaving invalidates the managed expected version: event INSERT rolls back, raw touch remains, original HTTP failure preserved. Root owns isolation and cleanup.' },
    { id: 'F:route-denied-storage-failure', requirement: 'Overlong request context fails without truncation, no persisted routeDenied event and no unintended managed-session commit. Record DB error only as bounded evidence, no secrets.' }
];

export const F_FIXTURE_REQUIREMENTS = {
    owner: 'root unified isolated PG15 fixture only',
    audit: 'At least 101 unique-timestamp lead records under auditEventType/targetId and one record for each other supported target type; operatorId known. One exact inclusive millisecond timestamp; one JSON sentinel and microsecond timestamp fixture. No actual business entity is required for opaque targetId.',
    security: 'At least 101 records under securityEventType; actorId known, one permission_key=not-an-enum-filter, exact nullable/JSON sentinels. RouteDenied and guard events carry distinct request ownership.',
    projection: 'Assert exact summary top-level keys, nullable values, original snapshot/details members including nested arrays and JS-number decoding. No real credentials or sensitive values in fixtures.',
    unprovedTransport: 'Original Nest must witness simple-query configuration and malformed percent/UTF8 dynamic path priority. Installed router matcher decodes captures before method/guards and Nest adapter maps URIError to BadRequestException; source/parser unit corpora are not an HTTP claim.',
    cleanup: 'Journal every intent before mutation; adopt owned events by exact identity, include guard failures, remove only exact owned PKs, retain failures and independently check zero residue twice.'
};
