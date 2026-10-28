// One externally owned backend per run. This runner starts no service, opens
// no SQL connection, and never serializes cookies, passwords or Set-Cookie.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NavigationHttpSession } from './http-client.mjs';
import { eHttpCases } from './e-http-plan.mjs';
import { fHttpPlan } from './f-protocol.mjs';
import { sourceHead, validateSource } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { invokeBatchFixture } = require('./batch-client.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const readJson = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fullPermissions = () => {
    const text = readFileSync(path.join(root, 'tools/rust-r1b/shared-manifest.json'), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(sha(text), '63ed639af64b2f0422cc955cfda4514758bed1da3841ba5f4a11076886cdb419');
    const values = JSON.parse(text).declarations.find(value => value.name === 'PERMISSION_KEYS')?.value;
    assert(Array.isArray(values) && values.length === 37 && new Set(values).size === 37 && values.every(value => typeof value === 'string'));
    return values;
};
const eSpec = readJson('tools/rust-r2ef/e-dictionary-openapi.json');
const settingSpec = readJson('tools/rust-r2ef/e-settings-openapi.json');
const eAuthority = readJson('tools/rust-r2ef/e-authority.json');
const fAuthority = readJson('tools/rust-r2ef/f-authority.json');

export function belowEvidence(name) {
    assert.equal(typeof name, 'string');
    const resolved = path.resolve(root, name);
    const parent = path.join(root, 'tmp/rust-r2ef');
    assert(resolved.startsWith(parent + path.sep) && resolved.endsWith('.json'), 'Only R2E/F JSON evidence paths are admitted');
    let cursor = path.dirname(resolved);
    while (cursor !== root) {
        if (existsSync(cursor)) assert(lstatSync(cursor).isDirectory() && !lstatSync(cursor).isSymbolicLink(), 'Evidence directory must not be a symlink');
        cursor = path.dirname(cursor);
    }
    if (existsSync(resolved)) assert(lstatSync(resolved).isFile() && !lstatSync(resolved).isSymbolicLink(), 'Evidence must be a regular file');
    return resolved;
}

export function validateServerReceipt(value, backend) {
    assert.equal(value.backend, backend);
    assert.equal(value.sourceHead, sourceHead);
    assert(Number.isSafeInteger(value.pid) && value.pid > 0);
    assert.equal(value.aliveBefore, true, 'Externally checked live owner receipt required');
    const origin = new URL(value.origin);
    assert.equal(origin.protocol, 'http:');
    assert(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname));
    assert.equal(origin.port, backend === 'nest' ? '5500' : '5501');
    assert.equal(value.origin, origin.origin);
    assert(!origin.username && !origin.password);
    if (value.binarySha256 !== undefined) assert(/^[a-f0-9]{64}$/.test(value.binarySha256));
    if (value.processIdentity !== undefined) {
        assert.equal(value.processIdentity.pid, value.pid);
        assert(/^[0-9]+$/.test(value.processIdentity.startTicks));
    }
    const result = Object.fromEntries(['backend', 'origin', 'pid', 'sourceHead', 'aliveBefore', 'binarySha256', 'ownerPlatform'].filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
    if (value.processIdentity) result.processIdentity = { pid: value.processIdentity.pid, startTicks: value.processIdentity.startTicks };
    if (value.sourceFiles) result.sourceFiles = value.sourceFiles.map(file => {
        assert(typeof file.file === 'string' && !path.posix.isAbsolute(file.file) && !file.file.includes('\\') && !file.file.includes(':') && file.file.split('/').every(part => part && part !== '.' && part !== '..'));
        const keys = ['sha256', 'normalizedLfSha256'].filter(key => file[key] !== undefined);
        assert.equal(keys.length, 1); assert(/^[a-f0-9]{64}$/.test(file[keys[0]]));
        return { file: file.file, [keys[0]]: file[keys[0]] };
    });
    return result;
}

function inputHashes() {
    return ['http-compat.mjs', 'http-client.mjs', 'batch-client.cjs', 'batch-protocol.cjs', 'e-http-plan.mjs', 'f-protocol.mjs', 'e-golden.json', 'f-golden.json', 'e-authority.json', 'f-authority.json'].map(file => ({ file: 'tools/rust-r2ef/' + file, normalizedLfSha256: sha(readFileSync(path.join(import.meta.dirname, file), 'utf8').replace(/\r\n/g, '\n')) }));
}
function safeError(error) { return { name: error?.name ?? 'Error', message: String(error?.message ?? 'operation failed').slice(0, 2000) }; }
function recordRows(value, label) { assert(Array.isArray(value) && value.every(row => row && typeof row === 'object' && !Array.isArray(row)), label); return value; }
function added(before, after, table) {
    const ids = new Set(recordRows(before?.[table] ?? [], 'before ' + table).map(row => row.id));
    return recordRows(after?.[table] ?? [], 'after ' + table).filter(row => !ids.has(row.id));
}
function headerValue(headers, name) { return Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name)?.[1]; }

// Login belongs to NavigationHttpSession. Case requests reuse that in-memory
// cookie jar but capture raw bytes/headers, with declared header overrides.
async function send(session, method, route, options = {}) {
    assert(/^\/api(?:\/|[?:]|$)/i.test(route), 'Only frozen API-origin relative routes');
    const url = new URL(route, session.origin);
    assert.equal(url.origin, session.origin);
    const custom = options.headers ?? {};
    const requestId = headerValue(custom, 'x-request-id') ?? options.requestId ?? session.identity.requestId;
    const headers = ['Host', new URL(session.origin).host, 'User-Agent', String(headerValue(custom, 'user-agent') ?? session.identity.userAgent), 'X-Forwarded-For', String(headerValue(custom, 'x-forwarded-for') ?? '192.0.2.25')];
    if (options.requestId !== null || headerValue(custom, 'x-request-id') !== undefined) headers.push('X-Request-Id', String(requestId));
    const correlation = headerValue(custom, 'x-correlation-id') ?? options.correlationId;
    if (correlation !== undefined) headers.push('X-Correlation-Id', String(correlation));
    if (session.cookies.size) headers.push('Cookie', [...session.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && options.csrf !== false && session.cookies.has('poms_csrf')) headers.push('X-CSRF-Token', typeof options.csrf === 'string' ? options.csrf : session.cookies.get('poms_csrf'));
    for (const [key, value] of Object.entries(custom)) if (!['x-request-id', 'x-correlation-id', 'user-agent', 'x-forwarded-for', 'cookie', 'set-cookie', 'x-csrf-token', 'host', 'content-length'].includes(key.toLowerCase())) headers.push(key, String(value));
    if (options.rawHeaders) headers.push(...options.rawHeaders);
    let body;
    if (Object.hasOwn(options, 'json')) { body = Buffer.from(JSON.stringify(options.json)); headers.push('Content-Type', 'application/json'); }
    else if (Object.hasOwn(options, 'body')) { body = Buffer.from(options.body); if (options.contentType) headers.push('Content-Type', options.contentType); }
    if (body !== undefined) headers.push('Content-Length', String(body.length));
    headers.push('Connection', 'close');
    return new Promise((resolve, reject) => {
        const request = http.request(url, { method, headers, timeout: 20_000 }, response => {
            const chunks = []; let length = 0;
            response.on('data', chunk => { length += chunk.length; if (length > 2 * 1024 * 1024) request.destroy(new Error('HTTP response exceeded limit')); else chunks.push(chunk); });
            response.on('error', () => reject(new Error('HTTP response failed')));
            response.on('end', () => {
                const rawBody = Buffer.concat(chunks).toString('utf8');
                const contentType = response.headers['content-type'] ?? '';
                let parsed = rawBody || null; let jsonParseError;
                if (rawBody && contentType.includes('application/json')) try { parsed = JSON.parse(rawBody); } catch { jsonParseError = 'invalid-json-response'; }
                const setCookies = response.headers['set-cookie'] ?? [];
                for (const cookie of setCookies) {
                    const pair = cookie.split(';', 1)[0], index = pair.indexOf('=');
                    if (index > 0) { const key = pair.slice(0, index), value = pair.slice(index + 1); if (value) session.cookies.set(key, value); else session.cookies.delete(key); }
                }
                resolve({ status: response.statusCode, body: parsed, rawBody, bodyByteLength: length, contentType, headers: Object.fromEntries(Object.entries(response.headers).filter(([key]) => key.toLowerCase() !== 'set-cookie')), setCookieCount: setCookies.length, ...(jsonParseError ? { jsonParseError } : {}) });
            });
        });
        request.on('timeout', () => request.destroy(new Error('HTTP request timeout')));
        request.on('error', () => reject(new Error('HTTP request failed')));
        request.end(body);
    });
}

export function rejectedDtoCases(extension) {
    const cases = [], sourceOnly = [];
    for (const [side, name] of [['E', 'e-golden.json'], ['F', 'f-golden.json']]) for (const entry of readJson('tools/rust-r2ef/' + name).cases) {
        if (entry.expected.success) continue;
        const id = `dto:${side}:${entry.schema}:${entry.name}`;
        const query = entry.schema.endsWith('Query');
        let route = { DictionaryItemListQuery: '/api/dictionaries', CreateDictionaryItemRequest: '/api/dictionaries', UpdateDictionaryItemRequest: '/api/dictionaries/' + extension.dictionaryUpdateId, UpdateSystemSettingRequest: '/api/platform/system-settings/attachment.max-upload-size-mb', AuditLogListQuery: '/api/audit-logs', EntityAuditLogListQuery: '/api/audit-logs/targets/lead/' + encodeURIComponent(extension.fFixture.targetId), SecurityEventListQuery: '/api/security-events', RecordRouteDeniedSecurityEventRequest: '/api/security-events:recordRouteDenied' }[entry.schema];
        assert(route, 'Unknown original DTO schema ' + entry.schema);
        const expectedBody = { statusCode: 400, message: 'Validation failed', ...(entry.expected.errors ? { errors: entry.expected.errors } : {}) };
        if (query) {
            if (entry.inputRaw === null) { sourceOnly.push({ id, reason: 'HTTP query is always an object, never undefined' }); continue; }
            const object = JSON.parse(entry.inputRaw);
            if (!object || typeof object !== 'object' || Array.isArray(object)) { sourceOnly.push({ id, reason: 'Simple query cannot carry a top-level JSON scalar/array/null' }); continue; }
            const parts = []; let reason;
            for (const [key, value] of Object.entries(object)) {
                const values = typeof value === 'string' ? [value] : Array.isArray(value) && value.length > 1 && value.every(item => typeof item === 'string') ? value : null;
                if (!values) { reason = 'Simple query only preserves strings or repeated arrays of at least two strings'; break; }
                try { for (const value of values) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value)); } catch { reason = 'Lone UTF16 surrogate cannot survive URI UTF8 encoding'; break; }
            }
            if (reason) { sourceOnly.push({ id, reason }); continue; }
            cases.push({ id, method: 'GET', route: route + (parts.length ? '?' + parts.join('&') : ''), expectedStatus: 400, expectedBody, dtoStage: 'exact-query-dto', schema: entry.schema, sourceCase: entry.name });
        } else {
            const method = entry.schema === 'CreateDictionaryItemRequest' || entry.schema === 'RecordRouteDeniedSecurityEventRequest' ? 'POST' : 'PATCH';
            const parserOnly = entry.inputRaw !== null && !['{', '['].includes(entry.inputRaw.trimStart()[0]);
            cases.push({ id, method, route, expectedStatus: 400, ...(entry.inputRaw === null ? {} : { body: entry.inputRaw, contentType: 'application/json' }), ...(!parserOnly ? { expectedBody } : {}), dtoStage: parserOnly ? 'parser-before-dto' : 'exact-body-dto', schema: entry.schema, sourceCase: entry.name });
        }
    }
    return { cases, sourceOnly, boundary: 'Every rejected body corpus case is attempted; scalar bodies exercise the real strict JSON parser, not Zod. Only lossless simple-query representations count as DTO HTTP evidence.' };
}

function expectRows(response, expected) {
    const rows = recordRows(response.body, 'Expected query array');
    if (expected.exactFields) for (const row of rows) assert.deepEqual(Object.keys(row).sort(), [...expected.exactFields].sort(), 'Exact summary projection');
    if (expected.count !== undefined) assert.equal(rows.length, expected.count);
    if (expected.minimum !== undefined) assert(rows.length >= expected.minimum, 'Minimum returned rows');
    if (expected.maximum !== undefined) assert(rows.length <= expected.maximum, 'Maximum returned rows');
    for (const field of ['targetType', 'targetId', 'operatorId', 'actorId', 'permissionKey']) if (expected[field] !== undefined) assert(rows.every(row => row[field] === expected[field]), 'Exact row filter ' + field);
    if (expected.timestamp) assert(rows.every(row => row.occurredAt === expected.timestamp), 'Inclusive timestamp');
    if (expected.descending) for (let index = 1; index < rows.length; index++) assert(Date.parse(rows[index - 1][expected.descending]) >= Date.parse(rows[index][expected.descending]), 'Descending event time');
}
function originalDictionaryProjection(body) { assert.deepEqual(Object.keys(body).sort(), Object.keys(eSpec.components.schemas.DictionaryItemSummary.properties).sort(), 'Original dictionary projection'); }
function sameDate(actual, expected) { if (actual === null || expected === null) assert.equal(actual, expected); else assert.equal(new Date(actual).toISOString(), new Date(expected).toISOString()); }
function verifyDictionary(body, facts) {
    originalDictionaryProjection(body);
    const stored = (facts.dictionaries ?? []).find(row => row.id === body.id);
    if (!stored) return;
    for (const [wire, pg] of [['domain', 'domain'], ['code', 'code'], ['name', 'name'], ['description', 'description'], ['status', 'status'], ['sortOrder', 'sort_order'], ['isSystem', 'is_system'], ['rowVersion', 'row_version'], ['createdBy', 'created_by'], ['updatedBy', 'updated_by']]) assert.deepEqual(body[wire], stored[pg], 'Dictionary PG field ' + pg);
    sameDate(body.createdAt, stored.created_at); sameDate(body.updatedAt, stored.updated_at);
    const usage = (facts.usageCases ?? []).find(row => row.id === body.id || row.domain === body.domain && row.code === body.code);
    if (usage) assert.equal(body.usageCount, usage.usageCount, 'Real business usage count');
}
function settingValue(facts) { return facts.settings === null ? eAuthority.settings[0].defaultValue : facts.settings?.value_json; }
function finiteLike(text, keyword) {
    // The owned query fixtures have ASCII code/name/description. This small
    // matcher checks the declared %, _ and literal cases, not all PG locales.
    if (text === null) return false;
    const chars = [...String(text).toLowerCase()], pattern = [...('%' + keyword + '%').toLowerCase()];
    let previous = Array(chars.length + 1).fill(false); previous[0] = true;
    for (let index = 0; index < pattern.length; index++) {
        let token = pattern[index], literal = false;
        if (token === '\\' && index + 1 < pattern.length) { token = pattern[++index]; literal = true; }
        const next = Array(chars.length + 1).fill(false);
        if (token === '%' && !literal) next[0] = previous[0];
        for (let at = 1; at <= chars.length; at++) next[at] = token === '%' && !literal ? previous[at] || next[at - 1] : previous[at - 1] && (token === '_' && !literal || token === chars[at - 1]);
        previous = next;
    }
    return previous[chars.length];
}
function verifyE(row, before, after) {
    const response = row.wire;
    if (row.route.toLowerCase().startsWith('/api/dictionaries') && ['POST', 'PATCH'].includes(row.method) && ![200, 201].includes(response.status)) {
        assert.deepEqual(after.dictionaries, before.dictionaries, 'Rejected dictionary command preserves PG rows');
        assert.equal(added(before, after, 'audits').length, 0, 'Rejected dictionary command creates no audit');
    }
    if (row.route.toLowerCase().startsWith('/api/platform/system-settings') && row.method === 'PATCH' && response.status !== 200) {
        assert.deepEqual(after.settings, before.settings, 'Rejected setting command preserves PG row');
        assert.equal(added(before, after, 'audits').length, 0, 'Rejected setting command creates no audit');
    }
    if (row.method === 'HEAD' || ![200, 201].includes(response.status)) return;
    if (row.route.toLowerCase().startsWith('/api/dictionaries')) {
        if (Array.isArray(response.body)) {
            for (const body of response.body) verifyDictionary(body, after);
            const url = new URL(row.route, 'http://fixture');
            for (const field of ['domain', 'status']) if (url.searchParams.has(field)) assert(response.body.every(body => body[field] === url.searchParams.get(field)), 'Dictionary query ' + field);
            const keyword = url.searchParams.get('keyword')?.trim();
            const selected = after.dictionaries.filter(body => (!url.searchParams.has('domain') || body.domain === url.searchParams.get('domain')) && (!url.searchParams.has('status') || body.status === url.searchParams.get('status')) && (!keyword || [body.code, body.name, body.description].some(text => finiteLike(text, keyword))));
            selected.sort((a, b) => Buffer.compare(Buffer.from(a.domain), Buffer.from(b.domain)) || a.sort_order - b.sort_order || Buffer.compare(Buffer.from(a.code), Buffer.from(b.code)));
            const owned = new Set(after.dictionaries.map(body => body.id));
            assert.deepEqual(response.body.filter(body => owned.has(body.id)).map(body => body.id), selected.map(body => body.id), 'Finite owned PG dictionary query and ordering');
            for (const usage of after.usageCases ?? []) if (response.body.some(body => body.id === usage.id)) assert.equal(response.body.find(body => body.id === usage.id).usageCount, usage.usageCount);
        } else {
            verifyDictionary(response.body, after);
            for (const key of ['name', 'description', 'status', 'sortOrder']) if (Object.hasOwn(row.request.json ?? {}, key)) {
                const value = row.request.json[key];
                assert.deepEqual(response.body[key], typeof value === 'string' && ['name', 'description'].includes(key) ? value.trim() : value, 'Requested dictionary field ' + key);
            }
            if (row.method === 'POST') {
                assert.equal(response.body.code, row.request.json.code.trim());
                assert.equal(response.body.domain, row.request.json.domain);
                assert.equal(response.body.isSystem, false);
            }
        }
        assert.equal(added(before, after, 'audits').length, 0, 'Dictionary operations introduce no audit writer');
        if (['e:dictionary-update-noop', 'e:dictionary-update-identity-strip'].includes(row.id)) {
            const id = response.body.id;
            assert.deepEqual(after.dictionaries.find(value => value.id === id), before.dictionaries.find(value => value.id === id), 'Dictionary no-op/identity strip preserves stored row');
        }
        if (row.id === 'e:dictionary-create') assert.equal(response.body.domain, 'lead-source');
    } else if (row.route.toLowerCase().startsWith('/api/platform/system-settings')) {
        const bodies = Array.isArray(response.body) ? response.body : [response.body];
        if (Array.isArray(response.body)) assert.deepEqual(bodies.map(body => body.key), eAuthority.settings.map(body => body.key), 'Exactly registry definitions in source order');
        for (const body of bodies) {
            assert.deepEqual(Object.keys(body).sort(), Object.keys(settingSpec.components.schemas.SystemSettingSummary.properties).sort(), 'Original settings projection');
            assert.equal(body.key, 'attachment.max-upload-size-mb');
            assert.equal(body.value, settingValue(after));
            assert.equal(body.rowVersion, after.settings?.row_version ?? 0);
            assert.equal(body.updatedBy, after.settings?.updated_by ?? null);
            sameDate(body.updatedAt, after.settings?.updated_at ?? null);
        }
        if (row.method === 'PATCH') {
            const events = added(before, after, 'audits').filter(event => event.event_type === 'platform.system_setting.updated' && event.target_id === 'attachment.max-upload-size-mb');
            assert.equal(events.length, 1, 'Exactly one original setting audit');
            assert.deepEqual(events[0].after_snapshot, response.body);
            assert.equal(events[0].before_snapshot.value, settingValue(before));
            assert.equal(events[0].request_id, headerValue(row.request.headers, 'x-request-id') ?? row.identity.requestId);
            if (row.id === 'e:settings-update-noop') assert.deepEqual(after.settings, before.settings, 'Setting no-op preserves stored version/time');
        }
    }
}
function verifyF(row, before, after, expected, session, report) {
    if (expected.rows) expectRows(row.wire, expected.rows);
    if (row.method === 'GET' && row.wire.status === 200 && Array.isArray(row.wire.body)) {
        const audit = row.route.toLowerCase().startsWith('/api/audit-logs');
        const records = new Map((audit ? after.audits : after.securityEvents).map(value => [value.id, value]));
        const fields = audit ? [['eventType', 'event_type'], ['targetType', 'target_type'], ['targetId', 'target_id'], ['operatorId', 'operator_id'], ['requestId', 'request_id'], ['result', 'result'], ['reason', 'reason'], ['beforeSnapshot', 'before_snapshot'], ['afterSnapshot', 'after_snapshot'], ['metadata', 'metadata']] : [['eventType', 'event_type'], ['severity', 'severity'], ['actorId', 'actor_id'], ['principal', 'principal'], ['requestId', 'request_id'], ['path', 'path'], ['method', 'method'], ['permissionKey', 'permission_key'], ['result', 'result'], ['ip', 'ip'], ['userAgent', 'user_agent'], ['details', 'details']];
        for (const body of row.wire.body) {
            const stored = records.get(body.id);
            assert(stored, 'Every run-scoped audit/security result has an actual owned PG row');
            for (const [wire, pg] of fields) assert.deepEqual(body[wire], stored[pg], 'Original audit/security PG projection ' + pg);
            sameDate(body.occurredAt, stored.occurred_at);
        }
    }
    if (expected.securityEventDelta !== undefined) assert.equal(added(before, after, 'securityEvents').length, expected.securityEventDelta);
    if (expected.securityEvent) {
        const events = added(before, after, 'securityEvents').filter(event => event.event_type === 'authz.route.denied');
        assert.equal(events.length, 1, 'One persisted routeDenied event');
        const event = events[0];
        for (const [wire, pg] of [['eventType', 'event_type'], ['severity', 'severity'], ['result', 'result'], ['method', 'method'], ['path', 'path'], ['details', 'details']]) assert.deepEqual(event[pg], expected.securityEvent[wire], 'RouteDenied field ' + pg);
        assert.equal(event.actor_id, session.userId);
        assert.equal(event.principal, row.actorUsername);
        assert.equal(event.request_id, headerValue(row.request.headers, 'x-request-id') ?? session.identity.requestId);
        assert.equal(event.permission_key, row.request.json.requiredPermissions[0]);
        assert.equal(event.user_agent, headerValue(row.request.headers, 'user-agent') ?? session.identity.userAgent);
        assert.equal(event.ip, String(headerValue(row.request.headers, 'x-forwarded-for') ?? '192.0.2.25').split(',')[0].trim());
    }
    if (expected.rawSessionTouchPreserved) report.deferredAssertions.push({ caseId: row.id, check: 'raw-session-touch-persistence', owner: 'root original SQL witness', reason: 'Batch facts intentionally expose no sessions or tokens' });
    if (expected.compareOriginalBody) report.deferredAssertions.push({ caseId: row.id, check: 'complete-original-body-cross-backend', owner: 'root paired report comparison', reason: 'Single-backend observation is not equivalence' });
}
function verifyCase(row, before, after, expected, session, report) {
    assert.equal(row.wire.status, expected.status ?? row.expectedStatus, 'Declared HTTP status');
    assert.equal(row.wire.jsonParseError, undefined);
    if (Object.hasOwn(expected, 'body')) assert.deepEqual(row.wire.body, expected.body, 'Complete original expected error/body');
    if (expected.guardCode) assert.equal(row.wire.body?.code, expected.guardCode);
    if (expected.emptyBody || row.method === 'HEAD') assert.equal(row.wire.bodyByteLength, 0);
    if (expected.contentTypeAbsent) assert.equal(row.wire.contentType, '');
    if (row.wire.bodyByteLength && typeof row.wire.body !== 'string') assert.equal(row.wire.contentType, 'application/json; charset=utf-8');
    if (row.headReference) {
        assert.equal(row.wire.status, row.headReference.status);
        assert.equal(row.wire.headers['content-length'], row.headReference.headers['content-length']);
        assert.equal(Number(row.wire.headers['content-length']), row.headReference.bodyByteLength);
        assert.equal(row.wire.contentType, row.headReference.contentType);
    }
    if (row.side === 'E') verifyE(row, before, after);
    if (row.side === 'F') verifyF(row, before, after, expected, session, report);
    if (row.dtoStage) {
        assert.equal(added(before, after, 'audits').length, 0, 'Rejected DTO creates no business audit');
        assert.equal(added(before, after, 'securityEvents').length, 0, 'Authenticated rejected DTO creates no security event');
        assert.deepEqual(after.dictionaries, before.dictionaries, 'Rejected DTO changes no dictionary');
        assert.deepEqual(after.settings, before.settings, 'Rejected DTO changes no setting');
    }
}

export function httpSelectionPlan(extension, selection = 'all') {
    assert(['all', 'E'].includes(selection), 'Only all or E selection is admitted');
    const eCases = eHttpCases({ dictionaryId: extension.dictionaryUpdateId, missingId: extension.missingId, createCode: extension.eCreatedCode });
    const fCases = selection === 'all' ? fHttpPlan(extension.fFixture).cases : [];
    const rejected = selection === 'all' ? rejectedDtoCases(extension) : { cases: [], sourceOnly: [], boundary: 'selection E: F and the DTO corpus are not executed or counted in this E54 affected increment' };
    return { selection, eCases, fCases, rejected };
}

export async function runHttpCompat({ backend, serverReceiptFile, tag = '01', selection = 'all' }) {
    assert(['nest', 'rust'].includes(backend));
    assert(['all', 'E'].includes(selection));
    assert(/^[a-z0-9][a-z0-9-]{0,39}$/.test(tag));
    const output = belowEvidence(`tmp/rust-r2ef/http-${process.platform}-${backend}-${tag}.json`);
    assert(!existsSync(output), 'Preserve prior HTTP evidence');
    const report = { formatVersion: 1, kind: 'r2ef-single-backend-http-observation', result: 'pending', assertions: 'pending', equivalenceClaim: false, selection, backend, platform: process.platform, sourceHead, runId: randomUUID(), runtime: { node: process.version, icu: process.versions.icu }, serviceOwnership: 'External root owner; runner starts/stops no service and does not certify owner closeout', startedAt: new Date().toISOString(), inputHashesBefore: inputHashes(), observations: [], facts: {}, factCaptures: [], fixtureActions: [], logouts: [], cleanup: [], deferredAssertions: [], deferredScope: selection === 'E' ? 'selection E: no F, rejected DTO, or complete-393 deferred assertions are executed by this increment' : 'all: full E/F/DTO protocol with explicit independent SQL/body comparison boundaries', cleanupCompleted: false };
    const sessions = {}; let prepared, permissions, latestFacts, prepareAttempted = false, phase = 'admission';
    const fixture = async (action, account = 'none', keys) => {
        const value = await invokeBatchFixture({ formatVersion: 1, backend, runId: report.runId, action, account, ...(keys ? { permissions: keys } : {}) });
        assert.equal(value.runId, report.runId); assert.equal(value.backend, backend); assert.equal(value.action, action);
        report.fixtureActions.push({ action, account, ...(keys ? { permissions: keys } : {}), state: value.state, matched: value.matched, changed: value.changed });
        return value;
    };
    const captureFacts = async label => {
        const value = await fixture('facts');
        const facts = Object.fromEntries(['dictionaries', 'settings', 'usageCases', 'audits', 'securityEvents'].map(key => [key, value.extension[key]]));
        for (const key of ['dictionaries', 'audits', 'securityEvents']) recordRows(facts[key], 'Real owned PG facts ' + key);
        const digest = sha(JSON.stringify(facts)); report.facts[digest] ??= facts;
        const capture = { label, capturedAt: new Date().toISOString(), sha256: digest };
        report.factCaptures.push(capture); latestFacts = { value: facts, capture }; return latestFacts;
    };
    const execute = async (testCase, side) => {
        const actor = testCase.actor ?? (testCase.actorOnlyPermission ? { onlyPermission: testCase.actorOnlyPermission } : 'admin');
        const account = actor === 'none' ? 'none' : actor === 'viewer' ? 'viewer' : 'admin';
        const profile = actor === 'adminOnly' ? ['platform:users:manage'] : typeof actor === 'object' ? [actor.onlyPermission] : null;
        const session = sessions[account];
        const row = { id: testCase.id, side, actor, actorUsername: report.actors?.[account]?.username, method: testCase.method, route: testCase.route ?? testCase.path, expectedStatus: testCase.expectedStatus ?? testCase.expected.status, identity: session.identity, dtoStage: testCase.dtoStage, sourceCase: testCase.sourceCase, declaredAssertion: testCase.assertion, startedAt: new Date().toISOString(), beforeFacts: latestFacts.capture.sha256, result: 'pending', errors: [] };
        const options = { ...(testCase.options ?? {}), ...(testCase.headers ? { headers: testCase.headers } : {}), ...(testCase.omitCsrf ? { csrf: false } : {}), ...(Object.hasOwn(testCase, 'json') ? { json: testCase.json } : {}), ...(Object.hasOwn(testCase, 'body') ? typeof testCase.body === 'string' && testCase.contentType ? { body: testCase.body, contentType: testCase.contentType } : { json: testCase.body } : {}), ...(testCase.rawBody !== undefined ? { body: testCase.rawBody, contentType: testCase.contentType } : {}) };
        row.request = { ...options }; // only synthetic case payloads, never cookies/credentials
        report.observations.push(row);
        const before = latestFacts.value;
        try {
            if (profile) await fixture('permissions', 'admin', profile);
            if (row.method === 'HEAD') row.headReference = await send(session, 'GET', row.route, options);
            row.wire = await send(session, row.method, row.route, options);
        } catch (error) { row.errors.push({ phase: 'http', ...safeError(error) }); }
        finally {
            if (profile) try { await fixture('permissions', 'admin', permissions); } catch (error) { row.errors.push({ phase: 'restore-permissions', ...safeError(error) }); }
        }
        try { row.afterFacts = (await captureFacts(row.id)).capture.sha256; } catch (error) { row.errors.push({ phase: 'facts', ...safeError(error) }); }
        if (!row.errors.length) try {
            const expected = testCase.expected ?? { status: testCase.expectedStatus, ...(testCase.expectedBody ? { body: testCase.expectedBody } : {}) };
            verifyCase(row, before, latestFacts.value, expected, session, report);
        } catch (error) { row.errors.push({ phase: 'assertions', ...safeError(error) }); }
        row.result = row.errors.length ? 'failed' : 'observed'; row.finishedAt = new Date().toISOString();
        if (row.dtoStage && row.wire?.status >= 200 && row.wire?.status < 300) throw new Error('Rejected DTO unexpectedly wrote/returned success; stop and preserve run evidence');
        if (!row.afterFacts) throw new Error('Facts capture failed; stop rather than reuse stale state');
    };
    try {
        const receiptPath = belowEvidence(serverReceiptFile), bytes = readFileSync(receiptPath);
        assert(bytes.length <= 2 * 1024 * 1024);
        const receipt = validateServerReceipt(JSON.parse(bytes), backend);
        report.serverReceipt = { file: path.relative(root, receiptPath).replaceAll('\\', '/'), rawBytesSha256: sha(bytes), value: receipt };
        permissions = process.platform === 'linux' ? [...validateSource()] : fullPermissions();
        assert.deepEqual(permissions, fAuthority.permissionKeys);
        phase = 'prepare'; prepareAttempted = true; prepared = await fixture('prepare');
        const extension = prepared.extension;
        assert(extension?.eCreatedCode && extension?.fFixture && extension.dictionaryUpdateId && extension.missingId, 'E/F prepared extension contract');
        assert.notEqual(extension.eCreatedCode, extension.createdCode, 'HTTP lead-source and UI attachment code intents are separate');
        for (const account of ['admin', 'viewer', 'none']) sessions[account] = new NavigationHttpSession(receipt.origin, report.runId);
        phase = 'login'; await sessions.admin.login('admin'); await sessions.viewer.login('viewer');
        report.actors = Object.fromEntries(['admin', 'viewer'].map(account => [account, { userId: sessions[account].userId, username: prepared.fixture.accounts.find(value => value.account === account)?.username }]));
        await captureFacts('initial');
        const { eCases, fCases, rejected } = httpSelectionPlan(extension, selection);
        report.coverage = { selection, plannedE: eCases.length, plannedF: fCases.length, rejectedDto: { selection, plannedHttp: rejected.cases.length, exactDto: rejected.cases.filter(value => value.dtoStage.startsWith('exact-')).length, parserOnly: rejected.cases.filter(value => value.dtoStage === 'parser-before-dto').length, sourceOnly: rejected.sourceOnly, boundary: rejected.boundary }, sqlBoundary: 'Pending/session CAS, no-op SQL statement shape, native PG collation and number allocation witnesses belong to root SQL evidence' };
        phase = 'E-http'; for (const entry of eCases) await execute(entry, 'E');
        phase = 'F-http'; for (const entry of fCases) await execute(entry, 'F');
        phase = 'rejected-dto-http'; for (const entry of rejected.cases) await execute(entry, 'DTO');
        report.assertions = report.observations.every(value => value.result === 'observed') ? 'pass' : 'failed';
    } catch (error) { report.failure = { phase, ...safeError(error) }; report.assertions = 'failed'; }
    finally {
        for (const [account, session] of Object.entries(sessions)) {
            if (account === 'none') { session.cookies.clear(); continue; }
            try {
                if (session.cookies.has('poms_session')) {
                    const response = await session.request('POST', '/api/auth/session:logout', { json: {} });
                    report.logouts.push({ account, status: response.status, body: response.body, contentType: response.contentType, setCookieCount: response.setCookie.length });
                }
            } catch (error) { report.logouts.push({ account, error: safeError(error) }); }
            finally { session.cookies.clear(); }
        }
        if (prepared) try { await captureFacts('final-after-logout'); } catch (error) { report.finalFactsFailure = safeError(error); }
        if (prepareAttempted) for (let pass = 0; pass < 2; pass++) try {
            const result = await fixture('cleanup');
            report.cleanup.push({ pass, result });
            assert.equal(result.state, 'cleaned');
            assert.equal(result.extension?.zero, true, 'Independent extension zero check');
            assert.equal(result.extension?.remaining, 0);
            if (pass === 1) { assert.equal(result.matched, 0); assert.equal(result.changed, 0); report.cleanupCompleted = report.cleanup.filter(value => value.result?.state === 'cleaned' && value.result?.extension?.zero === true && value.result?.extension?.remaining === 0).length === 2; }
        } catch (error) { report.cleanup.push({ pass, error: safeError(error) }); }
        try { if (process.platform === 'linux') validateSource(); report.inputHashesAfter = inputHashes(); assert.deepEqual(report.inputHashesAfter, report.inputHashesBefore); }
        catch (error) { report.sourceFailure = safeError(error); }
        report.finishedAt = new Date().toISOString();
        report.counts = {
            selection,
            plannedCases: report.coverage ? report.coverage.plannedE + report.coverage.plannedF + report.coverage.rejectedDto.plannedHttp : null,
            attemptedCases: report.observations.length,
            capturedCaseHttpResponses: report.observations.filter(value => value.wire).length + report.observations.filter(value => value.headReference).length,
            passedCaseAssertions: report.observations.filter(value => value.result === 'observed').length,
            failedCases: report.observations.filter(value => value.result === 'failed').length,
            exactDtoHttpResponses: report.observations.filter(value => value.wire && value.dtoStage?.startsWith('exact-')).length,
            parserOnlyHttpResponses: report.observations.filter(value => value.wire && value.dtoStage === 'parser-before-dto').length,
            actualFactsCaptures: report.factCaptures.length,
            distinctFactsPayloads: Object.keys(report.facts).length,
            deferredAssertions: report.deferredAssertions.length
        };
        report.result = report.assertions === 'pass' && report.cleanupCompleted && !report.sourceFailure && !report.finalFactsFailure ? 'observed' : 'failed';
        report.verdictBoundary = selection === 'E' ? 'selection E: observed means only this backend E54 affected HTTP increment and cleanup passed. F/DTO planned counts are zero; this is not a complete393 rerun or Nest/Rust equivalence.' : 'Observed means this backend met executed assertions and cleanup. It never means Nest/Rust equivalent; parser-only/query-source-only/deferred SQL/body comparisons remain explicitly separate.';
        writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    }
    return { report, output };
}

export function selfTest() {
    const permissions = fullPermissions(); assert.equal(permissions.length, 37);
    const extension = { dictionaryUpdateId: 'a0000000-0000-4000-8000-000000000001', missingId: 'a0000000-0000-4000-8000-000000000002', eCreatedCode: 'r2ef-http-owned', createdCode: 'r2ef-ui-owned', fFixture: { targetId: 'opaque-AbC', auditEventType: 'owned.audit', securityEventType: 'owned.security', operatorId: 'a0000000-0000-4000-8000-000000000001', actorId: 'a0000000-0000-4000-8000-000000000002', inclusiveAt: '2026-10-28T01:02:03.123Z', routePath: '/owned/r2ef' } };
    const rejected = rejectedDtoCases(extension);
    const all = httpSelectionPlan(extension), explicitAll = httpSelectionPlan(extension, 'all'), eOnly = httpSelectionPlan(extension, 'E');
    assert.deepEqual(all, explicitAll, 'Default retains complete all selection');
    assert.deepEqual(all.eCases, eHttpCases({ dictionaryId: extension.dictionaryUpdateId, missingId: extension.missingId, createCode: extension.eCreatedCode }));
    assert.deepEqual(all.fCases, fHttpPlan(extension.fFixture).cases); assert.deepEqual(all.rejected, rejected);
    assert.equal(eOnly.eCases.length, 54); assert.deepEqual(eOnly.fCases, []); assert.deepEqual(eOnly.rejected.cases, []); assert.deepEqual(eOnly.rejected.sourceOnly, []); assert(eOnly.rejected.boundary.includes('selection E'));
    assert.throws(() => httpSelectionPlan(extension, 'F'));
    assert(rejected.cases.length > 0 && rejected.sourceOnly.length > 0);
    assert(rejected.cases.some(value => value.dtoStage === 'parser-before-dto'));
    assert(rejected.cases.some(value => value.route.includes('limit=2&limit=3')));
    assert(rejected.sourceOnly.some(value => value.reason.includes('JSON scalar/array/null')));
    assert.throws(() => encodeURIComponent('\ud800'), URIError);
    assert.equal(new Set(rejected.cases.map(value => value.id)).size, rejected.cases.length);
    assert.equal(headerValue({ 'X-Request-Id': '' }, 'x-request-id'), '');
    assert(finiteLike('E keyword description', '%') && finiteLike('E keyword description', '_') && finiteLike('E keyword description', ' E '.trim()));
    assert(!finiteLike(null, '%') && !finiteLike('plain', '\u0085'));
    expectRows({ body: [{ id: 'a', occurredAt: '2026-01-02T00:00:00.000Z' }, { id: 'b', occurredAt: '2026-01-01T00:00:00.000Z' }] }, { exactFields: ['id', 'occurredAt'], count: 2, descending: 'occurredAt' });
    assert.throws(() => belowEvidence('tmp/rust-r2ef/../outside.json'));
    return { result: 'pass', boundary: 'Pure helper assertions only; no HTTP, fixture, database, service or browser executed', plannedE: eHttpCases({ dictionaryId: extension.dictionaryUpdateId, missingId: extension.missingId, createCode: extension.eCreatedCode }).length, plannedF: fHttpPlan(extension.fFixture).cases.length, rejectedHttpPlanned: rejected.cases.length, exactDtoPlanned: rejected.cases.filter(value => value.dtoStage.startsWith('exact-')).length, parserOnlyPlanned: rejected.cases.filter(value => value.dtoStage === 'parser-before-dto').length, querySourceOnly: rejected.sourceOnly.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--self-test') console.log(JSON.stringify(selfTest()));
    else {
        assert(args.length >= 2 && args.length <= 4 && (args[3] === undefined || args[3] === 'E'), 'Usage: http-compat.mjs --self-test | <nest|rust> <tmp/rust-r2ef/owner-receipt.json> [unique-tag] [E]');
        const { report, output } = await runHttpCompat({ backend: args[0], serverReceiptFile: args[1], tag: args[2] ?? '01', selection: args[3] ?? 'all' });
        console.log(JSON.stringify({ result: report.result, assertions: report.assertions, selection: report.selection, equivalenceClaim: false, output, runId: report.runId, observedCases: report.observations.length, cleanupCompleted: report.cleanupCompleted, failure: report.failure }));
        if (report.result !== 'observed') process.exitCode = 1;
    }
}
