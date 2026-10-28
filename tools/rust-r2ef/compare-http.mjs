// Read-only parity over the complete actual reports. No services, HTTP or SQL.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { belowEvidence, rejectedDtoCases } from './http-compat.mjs';
import { eHttpCases } from './e-http-plan.mjs';
import { fHttpPlan } from './f-protocol.mjs';
import { sourceHead } from './fixture-guard.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FIELDS = new Set(['id', 'code', 'userId', 'username', 'actorUsername', 'operatorId', 'actorId', 'requestId', 'principal', 'targetId', 'eventType', 'path', 'returnUrl', 'userAgent', 'createdBy', 'updatedBy']);
const SETTING = 'attachment.max-upload-size-mb';

// These original migrations, rather than observed report membership, define
// the only 32 default dictionary logical identities admitted by this reader.
export function defaultSeedCatalog() {
    const files = [
        ['Migration20260503170000_ex58c_configurable_dictionary_runtime.ts', '56afc4bb4c90ae6d2d8564a8bb5867cbaf54e5ccae4d604c5d246038ae4ce2f5'],
        ['Migration20260430100000_ex43_lead_source_and_profile_enrichment.ts', '4fd3c1f2efe20dafcefe898fb80f125a826cc4955a05a33047da8a57d74a5632'],
        ['Migration20260529120000_ex70a_lead_source_dictionary_direct_cutover.ts', 'e0b5204d1901e7492b3ec49c0f979a6eeb2da8f8c89e7073b2e6063323081002']
    ];
    const sources = files.map(([name, expected]) => {
        const file = 'apps/poms-api/src/migrations/' + name;
        const text = readFileSync(new URL('../../' + file, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
        assert.equal(hash(text), expected, 'Frozen original default dictionary seed source');
        return { file, normalizedLfSha256: expected, text };
    });
    const rows = [];
    const base = sources[0].text.slice(sources[0].text.indexOf('private seedDictionaryItems(): void'), sources[0].text.indexOf('private addDictionaryManagePermissionToPlatformAdmin(): void'));
    const decode = value => value.replaceAll("''", "'");
    for (const match of base.matchAll(/^\s*\('((?:''|[^'])*)', '((?:''|[^'])*)', '((?:''|[^'])*)', '((?:''|[^'])*)', (\d+), true\)[,;]?\s*$/gm)) {
        rows.push({ domain: decode(match[1]), code: decode(match[2]), name: decode(match[3]), description: decode(match[4]), sortOrder: Number(match[5]), source: sources[0].file });
    }
    assert.equal(rows.length, 24, 'Exactly the original 24 EX58C tuples');
    for (const match of sources[1].text.matchAll(/^\s*\('(51000000-0000-4000-8000-00000000000[1-8])', '((?:''|[^'])*)', '((?:''|[^'])*)', '((?:''|[^'])*)', (\d+)\)[,]?\s*$/gm)) {
        rows.push({ domain: 'lead-source', code: decode(match[2]), name: decode(match[3]), description: decode(match[4]), sortOrder: Number(match[5]), source: sources[1].file + ' -> ' + sources[2].file });
    }
    assert.equal(rows.length, 32, 'Exactly eight original legacy lead-source tuples are copied by EX70A');
    const byKey = new Map(rows.map(row => [row.domain + '/' + row.code, row]));
    assert.equal(byKey.size, 32);
    return { byKey, sources: sources.map(({ text, ...receipt }) => receipt), explanation: 'EX58C omits id and uses dictionary_item gen_random_uuid(); EX70A copies eight existing EX43 lead-source values without their legacy id, and its fallback ON CONFLICT preserves the copied rows. Only these exact 24+8 domain/code identities map default dictionary IDs.' };
}

export function defaultDictionaryIdentity(body, catalog) {
    const key = body.domain + '/' + body.code, seed = catalog.byKey.get(key);
    assert(seed, 'Default dictionary domain/code is not in the frozen source whitelist');
    assert(UUID.test(body.id));
    for (const field of ['domain', 'code', 'name', 'description', 'sortOrder']) assert.deepEqual(body[field], seed[field], 'Original default dictionary field ' + field);
    for (const [field, value] of [['status', 'active'], ['isSystem', true], ['rowVersion', 1], ['createdBy', null], ['updatedBy', null]]) assert.deepEqual(body[field], value, 'Original default dictionary initial ' + field);
    return { key, logical: 'default-dictionary:' + key, source: seed.source };
}

export function firstDifference(left, right, where = '$') {
    if (Object.is(left, right)) return null;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return where;
    if (Array.isArray(left) !== Array.isArray(right)) return where;
    if (Array.isArray(left)) {
        if (left.length !== right.length) return where + '.length';
        for (let index = 0; index < left.length; index++) { const found = firstDifference(left[index], right[index], `${where}[${index}]`); if (found) return found; }
        return null;
    }
    const a = Object.keys(left).sort(), b = Object.keys(right).sort();
    if (a.length !== b.length || a.some((key, index) => key !== b[index])) return where + '.<keys>';
    for (const key of a) { const found = firstDifference(left[key], right[key], where + '.' + key); if (found) return found; }
    return null;
}
function failure(error, where) { return { path: error?.difference ?? where, message: String(error?.message ?? 'comparison failed').slice(0, 1200), name: error?.name ?? 'Error' }; }
function equal(left, right, where) { const difference = firstDifference(left, right, where); if (difference) throw Object.assign(new Error('Complete values differ'), { difference }); }
function facts(run, digest) { const value = run.facts?.[digest]; assert(value, 'Missing actual facts payload ' + digest); assert.equal(hash(JSON.stringify(value)), digest, 'Facts payload hash'); return value; }
function initialFacts(run) { const captures = run.factCaptures.filter(value => value.label === 'initial'); assert.equal(captures.length, 1); return facts(run, captures[0].sha256); }
function rowById(run, id) { const rows = run.observations.filter(row => row.id === id); assert.equal(rows.length, 1, 'One planned case ' + id); return rows[0]; }
function iso(value) { assert.equal(typeof value, 'string'); const instant = new Date(value); assert(Number.isFinite(instant.getTime()), 'Valid calendar timestamp'); return instant.toISOString(); }
function microInstant(value) {
    const milliseconds = Date.parse(value); assert(Number.isFinite(milliseconds));
    const fraction = /\.(\d+)(?:Z|[+-]\d\d:\d\d)$/.exec(value)?.[1] ?? '';
    assert(fraction.length <= 6, 'PG seed timestamp retains at most six fractional digits');
    return BigInt(milliseconds) * 1000n + BigInt((fraction.padEnd(6, '0').slice(3)) || '0');
}
function validateWire(wire, method) {
    assert(wire && Number.isInteger(wire.status)); assert.equal(typeof wire.contentType, 'string');
    assert.equal(typeof wire.rawBody, 'string'); assert.equal(Buffer.byteLength(wire.rawBody), wire.bodyByteLength);
    assert(!Object.keys(wire.headers ?? {}).some(key => key.toLowerCase() === 'set-cookie'));
    if (method === 'HEAD') { assert.equal(wire.bodyByteLength, 0); assert.equal(wire.body, null); }
    else if (wire.contentType.includes('application/json') && wire.rawBody) equal(JSON.parse(wire.rawBody), wire.body, '$.parsedWireBody');
    else equal(wire.body, wire.rawBody || null, '$.literalWireBody');
    if (method !== 'HEAD' && wire.headers?.['content-length'] !== undefined) assert.equal(Number(wire.headers['content-length']), wire.bodyByteLength);
}

export function validateReportAdmission(run, backend) {
    assert.equal(run.formatVersion, 1); assert.equal(run.kind, 'r2ef-single-backend-http-observation');
    assert.equal(run.backend, backend); assert.equal(run.sourceHead, sourceHead);
    assert.equal(run.result, 'observed'); assert.equal(run.assertions, 'pass'); assert.equal(run.equivalenceClaim, false);
    assert(UUID.test(run.runId)); assert.equal(run.cleanupCompleted, true);
    for (const key of ['failure', 'sourceFailure', 'finalFactsFailure']) assert.equal(run[key], undefined, 'No suppressed ' + key);
    assert.equal(run.observations.length, 393, 'Every one of the 393 actual cases is required');
    assert.equal(new Set(run.observations.map(value => value.id)).size, 393);
    assert.equal(run.coverage.plannedE, 54); assert.equal(run.coverage.plannedF, 49);
    assert.equal(run.coverage.rejectedDto.plannedHttp, 290); assert.equal(run.coverage.rejectedDto.exactDto, 279); assert.equal(run.coverage.rejectedDto.parserOnly, 11);
    equal(run.inputHashesBefore, run.inputHashesAfter, '$.source.beforeAfter');
    assert.equal(run.inputHashesBefore.length, 10); assert.equal(new Set(run.inputHashesBefore.map(value => value.file)).size, 10);
    for (const entry of run.inputHashesBefore) assert(/^[a-f0-9]{64}$/.test(entry.normalizedLfSha256));
    assert.equal(run.cleanup.length, 2);
    for (const [index, cleanup] of run.cleanup.entries()) {
        assert.equal(cleanup.pass, index); assert.equal(cleanup.error, undefined);
        assert.equal(cleanup.result.state, 'cleaned'); assert.equal(cleanup.result.extension.zero, true); assert.equal(cleanup.result.extension.remaining, 0);
        if (index === 1) { assert.equal(cleanup.result.matched, 0); assert.equal(cleanup.result.changed, 0); }
    }
    let previous = run.factCaptures.find(value => value.label === 'initial')?.sha256;
    for (const row of run.observations) {
        assert.equal(row.result, 'observed', row.id); assert.deepEqual(row.errors, [], row.id + ' errors');
        assert.equal(row.beforeFacts, previous, row.id + ' previous facts continuity');
        facts(run, row.beforeFacts); facts(run, row.afterFacts); previous = row.afterFacts;
        assert.equal(row.wire.status, row.expectedStatus, row.id + ' actual expected status');
        validateWire(row.wire, row.method);
        if (row.method === 'HEAD') {
            validateWire(row.headReference, 'GET');
            assert.equal(row.wire.status, row.headReference.status);
            assert.equal(row.wire.contentType, row.headReference.contentType);
            assert.equal(Number(row.wire.headers['content-length']), row.headReference.bodyByteLength);
        }
    }
    for (const capture of run.factCaptures) { assert(Number.isFinite(Date.parse(capture.capturedAt))); facts(run, capture.sha256); }
}

function requestOptions(entry) {
    return { ...(entry.options ?? {}), ...(entry.headers ? { headers: entry.headers } : {}), ...(entry.omitCsrf ? { csrf: false } : {}), ...(Object.hasOwn(entry, 'json') ? { json: entry.json } : {}), ...(Object.hasOwn(entry, 'body') ? typeof entry.body === 'string' && entry.contentType ? { body: entry.body, contentType: entry.contentType } : { json: entry.body } : {}), ...(entry.rawBody !== undefined ? { body: entry.rawBody, contentType: entry.contentType } : {}) };
}
function declaredPlan(run, extension) {
    return [
        ...eHttpCases({ dictionaryId: extension.dictionaryUpdateId, missingId: extension.missingId, createCode: extension.eCreatedCode }).map(row => ({ ...row, side: 'E' })),
        ...fHttpPlan(extension.fFixture).cases.map(row => ({ ...row, side: 'F' })),
        ...rejectedDtoCases(extension).cases.map(row => ({ ...row, side: 'DTO' }))
    ].map(entry => ({ id: entry.id, side: entry.side, actor: entry.actor ?? (entry.actorOnlyPermission ? { onlyPermission: entry.actorOnlyPermission } : 'admin'), method: entry.method, route: entry.route ?? entry.path, expectedStatus: entry.expectedStatus ?? entry.expected.status, request: requestOptions(entry), dtoStage: entry.dtoStage, sourceCase: entry.sourceCase }));
}

function seedIndex(row, field) {
    const value = row[field]; assert(value && value.source === 'r2ef-synthetic');
    if (Object.hasOwn(value, 'index')) { assert(Number.isInteger(value.index) && value.index > 0 && value.index < 110); return value.index; }
    assert.equal(value.nested?.[0], 'sentinel'); assert.equal(value.nested?.[1]?.safe, 'visible'); return 0;
}

export function buildMapper(run) {
    const initial = initialFacts(run), values = new Map(), declarations = [], messages = new Map(), clocks = new Map(), clockDeclarations = [];
    const ownedDictionaries = new Map(), externalDictionaries = new Map(), externalDictionaryKeys = new Map(), defaultSeeds = defaultSeedCatalog();
    const add = (raw, logical, source) => { assert.equal(typeof raw, 'string'); if (values.has(raw)) assert.equal(values.get(raw), logical, 'No ambiguous identity alias'); else { values.set(raw, logical); declarations.push({ raw, logical, source }); } };
    add(run.runId, '<runId>', 'report.runId');
    add('r2ef:' + run.runId, '<requestId:run>', 'fixtureRequestIdentity');
    add('poms-r2ef-fixture/' + run.runId, '<userAgent:run>', 'fixtureRequestIdentity');
    for (const account of ['admin', 'viewer']) {
        const actor = run.actors[account]; assert(UUID.test(actor.userId));
        assert.equal(actor.username, `r2ef_${account}_${run.runId.replaceAll('-', '')}`);
        add(actor.userId, `<actor:${account}>`, 'actual login actor');
        if (actor.userId.toUpperCase() !== actor.userId) add(actor.userId.toUpperCase(), `<actor:${account}:UPPER>`, 'declared uppercase UUID query');
        add(actor.username, `<username:${account}>`, 'actual login username');
    }
    assert.equal(initial.dictionaries.length, 7);
    const initialNames = new Map([['E Usage 0', ['attachment-category', '0']], ['E Usage 1', ['sales-follow-up-type', '1']], ['E Usage 2', ['expense-category', '2']], ['E Usage 3', ['lead-source', '3']], ['E Original', ['lead-source', 'u']], ['E Noop', ['lead-source', 'n']], ['E Inactive', ['lead-source', 'i']]]);
    for (const dictionary of initial.dictionaries) {
        assert(initialNames.has(dictionary.name), 'Only the seven declared fixture dictionary names');
        assert.equal(dictionary.domain, initialNames.get(dictionary.name)[0]);
        assert.equal(dictionary.code, 'e' + run.runId.replaceAll('-', '').slice(0, 24) + initialNames.get(dictionary.name)[1]);
        const logical = `dictionary:${dictionary.domain}:${dictionary.name}`;
        assert(![...ownedDictionaries.values()].includes(logical), 'Unique initial dictionary domain/name');
        assert.equal(dictionary.created_by, run.actors.admin.userId); assert.equal(dictionary.updated_by, run.actors.admin.userId);
        assert.equal(iso(dictionary.created_at), '2026-01-01T00:00:00.000Z'); assert.equal(iso(dictionary.updated_at), '2026-01-01T00:00:00.000Z');
        ownedDictionaries.set(dictionary.id, logical); add(dictionary.id, `<${logical}>`, 'initial owned dictionary domain/name'); add(dictionary.code, `<code:${logical}>`, 'initial owned dictionary code');
    }
    const update = initial.dictionaries.filter(row => row.domain === 'lead-source' && row.name === 'E Original'); assert.equal(update.length, 1);
    const createdCase = rowById(run, 'e:dictionary-create'), created = createdCase.wire.body;
    assert.equal(created.domain, 'lead-source'); assert.equal(created.code, createdCase.request.json.code);
    assert.equal(created.code, 'e' + run.runId.replaceAll('-', '').slice(0, 24) + 'api');
    const createdPg = facts(run, createdCase.afterFacts).dictionaries.filter(row => row.id === created.id); assert.equal(createdPg.length, 1);
    assert.equal(createdPg[0].created_by, run.actors.admin.userId); assert.equal(createdPg[0].code, created.code);
    assert(!initial.dictionaries.some(row => row.id === created.id));
    ownedDictionaries.set(created.id, 'dictionary:created-http'); add(created.id, '<dictionary:created-http>', 'real create response and adopted PG row'); add(created.code, '<code:dictionary:created-http>', 'root-preplanned HTTP lead-source code');
    const missingCase = rowById(run, 'e:dictionary-missing'), missingId = missingCase.route.slice('/api/dictionaries/'.length); assert(UUID.test(missingId));
    assert(Object.values(run.facts).every(snapshot => !snapshot.dictionaries.some(row => row.id === missingId)));
    add(missingId, '<dictionary:missing>', 'declared exact nonexistent read-only UUID');
    messages.set(`Dictionary item not found: ${missingId}`, 'Dictionary item not found: <dictionary:missing>');
    messages.set(`Dictionary item already exists: lead-source/${created.code}`, 'Dictionary item already exists: lead-source/<code:dictionary:created-http>');
    const targetId = 'r2ef-target-' + run.runId, auditEventType = 'r2ef.audit.' + run.runId, securityEventType = 'r2ef.security.' + run.runId, routePath = '/r2ef/' + run.runId + '/protected';
    for (const [raw, logical] of [[targetId, '<target:opaque>'], [targetId.toUpperCase(), '<target:opaque:UPPER>'], [auditEventType, '<eventType:audit-seed>'], [securityEventType, '<eventType:security-seed>'], [routePath, '<routePath:owned>']]) add(raw, logical, 'exact prepared F namespace');
    const seedKeys = [];
    for (const [table, field, event, alias] of [['audits', 'after_snapshot', auditEventType, 'audit'], ['securityEvents', 'details', securityEventType, 'security']]) {
        const seeds = initial[table].filter(row => row.event_type === event); assert.equal(seeds.length, 110);
        const indexes = new Set();
        for (const seed of seeds) {
            const index = seedIndex(seed, field); assert(!indexes.has(index)); indexes.add(index);
            const expected = BigInt(Date.UTC(2026, 0, 1)) * 1000n + BigInt(index) * 1_000_000n + (index === 109 ? 123n : 0n);
            assert.equal(microInstant(seed.occurred_at), expected, 'Exact fixed PG microseconds remain authoritative');
            if (alias === 'audit') { assert.equal(seed.target_id, targetId); assert.equal(seed.operator_id, run.actors.admin.userId); }
            else { assert.equal(seed.path, routePath); assert.equal(seed.actor_id, run.actors.admin.userId); assert.equal(seed.principal, run.actors.admin.username); }
            const key = `${alias}:seed:${index}:${alias === 'audit' ? seed.target_type : seed.method}:${expected}`;
            add(seed.id, `<${key}>`, 'initial original event/target/index/exact PG time'); seedKeys.push(key);
            for (const snapshot of Object.values(run.facts)) {
                const matching = snapshot[table].filter(row => row.id === seed.id); assert.equal(matching.length, 1); equal(matching[0], seed, '$.immutableSeed.' + key);
            }
        }
    }
    const extension = { dictionaryUpdateId: update[0].id, missingId, eCreatedCode: created.code, fFixture: { targetId, auditEventType, securityEventType, operatorId: run.actors.admin.userId, actorId: run.actors.admin.userId, inclusiveAt: '2026-01-01T00:00:00.000Z', routePath } };
    const clock = (entity, field, raw, logical, source, bounds) => {
        const wireValue = iso(raw), time = Date.parse(raw);
        if (bounds) assert(time >= Date.parse(bounds.startedAt) - 1000 && time <= Date.parse(bounds.finishedAt) + 1000, 'Dynamic clock is inside its actual request window (+/-1s)');
        const key = entity + '.' + field; if (!clocks.has(key)) clocks.set(key, new Map());
        const existing = clocks.get(key).get(wireValue); assert(!existing || existing === logical, 'No ambiguous per-record clock state');
        clocks.get(key).set(wireValue, logical); clockDeclarations.push({ entity, field, rawPg: raw, wireValue, logical, source });
    };
    const firstList = rowById(run, 'e:dictionary-list').wire.body;
    const defaultKeys = new Set();
    for (const body of firstList.filter(row => !ownedDictionaries.has(row.id))) {
        assert(UUID.test(body.id)); assert(!externalDictionaries.has(body.id));
        const identity = defaultDictionaryIdentity(body, defaultSeeds);
        assert(!defaultKeys.has(identity.key), 'Each original default domain/code is unique'); defaultKeys.add(identity.key);
        externalDictionaries.set(body.id, body);
        externalDictionaryKeys.set(body.id, identity.logical);
        add(body.id, `<${identity.logical}>`, identity.source + '; exact initial domain/code and all source fields');
        assert(Date.parse(body.createdAt) <= Date.parse(run.startedAt)); assert(Date.parse(body.createdAt) <= Date.parse(body.updatedAt)); assert(Date.parse(body.updatedAt) <= Date.parse(run.startedAt));
        for (const field of ['createdAt', 'updatedAt']) clock(identity.logical, field, body[field], `<clock:${identity.logical}:initial:${field}>`, identity.source + '; first default dictionary response, immutable throughout this run');
    }
    assert.equal(externalDictionaries.size, 32, 'Exact original source baseline dictionary population');
    equal([...defaultKeys].sort(), [...defaultSeeds.byKey.keys()].sort(), '$.completeOriginalDefaultDictionaryKeys');
    if (initial.settings !== null) {
        assert.equal(initial.settings.key, SETTING); assert(Date.parse(initial.settings.created_at) <= Date.parse(initial.settings.updated_at)); assert(Date.parse(initial.settings.updated_at) <= Date.parse(run.startedAt));
        clock('setting:' + SETTING, 'updatedAt', initial.settings.updated_at, '<clock:setting:initial:updatedAt>', 'Exact original global setting snapshot, initialization clock only');
    }
    for (const row of run.observations) {
        if (row.side !== 'E' || ![200, 201].includes(row.wire.status) || !['POST', 'PATCH'].includes(row.method)) continue;
        const before = facts(run, row.beforeFacts), after = facts(run, row.afterFacts);
        if (row.route.startsWith('/api/dictionaries')) {
            const body = row.wire.body, entity = ownedDictionaries.get(body.id); assert(entity);
            const prior = before.dictionaries.find(value => value.id === body.id), stored = after.dictionaries.find(value => value.id === body.id); assert(stored);
            if (!prior) for (const [wire, pg] of [['createdAt', 'created_at'], ['updatedAt', 'updated_at']]) clock(entity, wire, stored[pg], `<clock:${entity}:${row.id}:${wire}>`, 'Actual created dictionary PG field', row);
            else if (prior.updated_at !== stored.updated_at) clock(entity, 'updatedAt', stored.updated_at, `<clock:${entity}:${row.id}:updatedAt>`, 'Actual dictionary mutation PG field', row);
        } else if (row.route.startsWith('/api/platform/system-settings')) {
            if (before.settings?.updated_at !== after.settings?.updated_at) clock('setting:' + SETTING, 'updatedAt', after.settings.updated_at, `<clock:setting:${row.id}:updatedAt>`, 'Actual setting mutation PG field', row);
        }
    }
    return { run, initial, values, declarations, messages, clocks, clockDeclarations, ownedDictionaries, externalDictionaries, externalDictionaryKeys, defaultSeeds, extension, seedKeys: seedKeys.sort() };
}

export function normalizeValue(value, mapper, field = '') {
    if (typeof value === 'string') return field === 'message' && mapper.messages.has(value) ? mapper.messages.get(value) : FIELDS.has(field) && mapper.values.has(value) ? mapper.values.get(value) : value;
    if (Array.isArray(value)) return value.map(item => normalizeValue(item, mapper, field));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item, mapper, key)]));
    return value;
}
function normalizeRoute(route, mapper) {
    let result = route;
    for (const [raw, logical] of [...mapper.values].sort(([a], [b]) => b.length - a.length)) {
        for (const token of new Set([raw, encodeURIComponent(raw)])) if (result.includes(token)) result = result.split(token).join(logical);
    }
    return result;
}
function normalizedClock(mapper, entity, field, value) {
    if (value === null) return null;
    assert.equal(iso(value), value, 'Wire clock retains original canonical JS milliseconds');
    return mapper.clocks.get(entity + '.' + field)?.get(value) ?? value;
}
export function normalizeBody(row, wire, mapper) {
    if (typeof wire.body === 'string') return wire.body; // Complete literal HTML/parser text, no replacement.
    const normalizeRecord = body => {
        const result = normalizeValue(body, mapper);
        if (!body || typeof body !== 'object' || Array.isArray(body)) return result;
        const route = row.route.toLowerCase();
        if (route.startsWith('/api/dictionaries') && typeof body.id === 'string' && typeof body.domain === 'string') {
            const entity = mapper.ownedDictionaries.get(body.id) ?? mapper.externalDictionaryKeys?.get(body.id) ?? null;
            if (mapper.externalDictionaries.has(body.id)) equal(body, mapper.externalDictionaries.get(body.id), '$.immutableExternalDictionary.' + body.id);
            if (entity) for (const field of ['createdAt', 'updatedAt']) result[field] = normalizedClock(mapper, entity, field, body[field]);
        } else if (route.startsWith('/api/platform/system-settings') && body.key === SETTING) result.updatedAt = normalizedClock(mapper, 'setting:' + SETTING, 'updatedAt', body.updatedAt);
        return result;
    };
    return Array.isArray(wire.body) ? wire.body.map(normalizeRecord) : normalizeRecord(wire.body);
}
function wireView(row, wire, mapper) { return { status: wire.status, contentType: wire.contentType, body: normalizeBody(row, wire, mapper), setCookieCount: wire.setCookieCount }; }

export function compareReports(nest, rust) {
    const report = { formatVersion: 1, kind: 'r2ef-complete-http-parity', result: 'fail', sourceHead, expectedCases: 393, comparedCases: 0, admissionFailures: [], mappingFailures: [], planDifferences: [], responseDifferences: [], clockValidationFailures: [], headObservations: [], comparisons: [] };
    for (const [backend, run] of [['nest', nest], ['rust', rust]]) try { validateReportAdmission(run, backend); } catch (error) { report.admissionFailures.push({ backend, ...failure(error, '$.admission.' + backend) }); }
    if (report.admissionFailures.length) return report;
    try {
        equal(nest.platform, rust.platform, '$.runner.platform'); equal(nest.runtime, rust.runtime, '$.runner.runtime'); equal(nest.coverage, rust.coverage, '$.completeCoverage'); equal(nest.inputHashesBefore, rust.inputHashesBefore, '$.candidateInputHashes');
    } catch (error) { report.admissionFailures.push(failure(error, '$.candidate')); return report; }
    let left, right;
    try { left = buildMapper(nest); right = buildMapper(rust); equal(left.seedKeys, right.seedKeys, '$.fixedSeedIdentities'); equal([...left.externalDictionaryKeys.values()].sort(), [...right.externalDictionaryKeys.values()].sort(), '$.sourceBoundDefaultDictionaryLogicalKeys'); equal(left.defaultSeeds.sources, right.defaultSeeds.sources, '$.defaultSeedSourceEpoch'); }
    catch (error) { (String(error.message).includes('clock') || String(error.message).includes('timestamp') ? report.clockValidationFailures : report.mappingFailures).push(failure(error, '$.logicalMapping')); return report; }
    report.identityMappings = { nest: left.declarations, rust: right.declarations };
    report.clockRules = { nest: left.clockDeclarations, rust: right.clockDeclarations };
    report.defaultDictionaryAuthority = { sources: left.defaultSeeds.sources, identities: [...left.defaultSeeds.byKey.keys()].sort(), explanation: left.defaultSeeds.explanation };
    let expectedLeft, expectedRight;
    try { expectedLeft = declaredPlan(nest, left.extension); expectedRight = declaredPlan(rust, right.extension); assert.equal(expectedLeft.length, 393); assert.equal(expectedRight.length, 393); }
    catch (error) { report.planDifferences.push(failure(error, '$.declaredPlan')); return report; }
    for (let index = 0; index < 393; index++) {
        const a = nest.observations[index], b = rust.observations[index], declarationA = expectedLeft[index], declarationB = expectedRight[index];
        const entry = { index, id: a.id, result: 'fail' }; report.comparisons.push(entry);
        try {
            for (const [observed, declared] of [[a, declarationA], [b, declarationB]]) for (const key of ['id', 'side', 'actor', 'method', 'route', 'expectedStatus', 'request', 'dtoStage', 'sourceCase']) equal(observed[key], declared[key], `$.declared[${index}].${key}`);
            const plan = (row, mapper) => ({ id: row.id, side: row.side, actor: row.actor, method: row.method, route: normalizeRoute(row.route, mapper), expectedStatus: row.expectedStatus, request: normalizeValue(row.request, mapper), dtoStage: row.dtoStage, sourceCase: row.sourceCase });
            equal(plan(a, left), plan(b, right), `$.plan[${index}]`);
        } catch (error) { report.planDifferences.push({ id: a.id, ...failure(error, '$.plan[' + index + ']') }); continue; }
        try {
            equal(wireView(a, a.wire, left), wireView(b, b.wire, right), `$.response[${index}]`);
            if (a.method === 'HEAD') {
                equal(wireView({ ...a, method: 'GET' }, a.headReference, left), wireView({ ...b, method: 'GET' }, b.headReference, right), `$.headGetReference[${index}]`);
                report.headObservations.push({ id: a.id, nestContentLength: a.wire.headers['content-length'], rustContentLength: b.wire.headers['content-length'], bothBodiesEmpty: true, sameBackendGetLengthValidated: true });
            }
            entry.result = 'pass'; report.comparedCases++;
        } catch (error) {
            const record = { id: a.id, ...failure(error, '$.response[' + index + ']') };
            if (record.message.includes('clock') || record.message.includes('timestamp')) report.clockValidationFailures.push(record); else report.responseDifferences.push(record);
        }
    }
    report.sourceEpoch = nest.inputHashesBefore;
    report.closedHttpDeferred = nest.deferredAssertions.filter(value => value.check === 'complete-original-body-cross-backend').map(value => ({ caseId: value.caseId, result: report.comparisons.find(row => row.id === value.caseId)?.result }));
    report.remainingIndependentEvidence = nest.deferredAssertions.filter(value => value.check !== 'complete-original-body-cross-backend');
    report.normalization = {
        identities: 'Exact registered run/request/UA/actor/username, seven initial owned dictionary domain/name IDs and codes, real HTTP-created dictionary ID/code, declared nonexistent UUID, 32 exact source-whitelisted default dictionary IDs keyed by domain/code, prepared F namespace, and 220 seed IDs keyed by original event/target/index/exact PG microseconds. Default business codes/fields remain literal. Other UUIDs and business strings remain literal.',
        errorMessages: 'Only the two complete original dictionary missing/duplicate message templates bind their declared UUID/code. HTML and parser text remain wholly literal.',
        clocks: 'Only top-level dictionary createdAt/updatedAt and setting updatedAt. Seven fixture dictionary initial times remain pinned. HTTP creation/mutation clocks bind exact per-record PG values and their actual request windows (+/-1s), then retain state-specific tokens across reads/no-ops. The 32 original source-bound domain/code default dictionary initialization clocks and the original setting initialization clock may differ, but remain immutable within each run. No F occurredAt or nested snapshot dates are transformed.',
        arrays: 'All response arrays and ordering are preserved. JSON object key order is semantically irrelevant; no field is deleted.',
        headers: 'Status, Content-Type and Set-Cookie count are compared. HEAD length is checked against its own complete real GET and both cross-backend lengths are reported. Other raw transport headers/bytes remain in immutable input reports; complete HTML bodies are compared literally.'
    };
    report.result = report.comparedCases === 393 && ![report.admissionFailures, report.mappingFailures, report.planDifferences, report.responseDifferences, report.clockValidationFailures].some(values => values.length) ? 'pass' : 'fail';
    report.boundary = 'Complete 393-case actual HTTP body parity, including all 11 strict-parser cases and the formerly deferred original parser/404 bodies. The 86 non-transportable query corpus entries and root SQL/CAS/number/UI/owner closeout evidence remain separate. No automatic G3/G4 claim.';
    return report;
}

export function selfTest() {
    assert.equal(firstDifference({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }), null);
    assert.equal(firstDifference([1, 2], [2, 1]), '$[0]');
    assert.equal(microInstant('2026-01-01T09:01:49.000123+09:00'), BigInt(Date.UTC(2026, 0, 1, 0, 1, 49)) * 1000n + 123n);
    const mapper = { values: new Map([['owned-id', '<actor:admin>']]), messages: new Map(), ownedDictionaries: new Map(), externalDictionaries: new Map(), clocks: new Map() };
    equal(normalizeValue({ actorId: 'owned-id', unknownUuid: 'not-owned', description: 'owned-id', occurredAt: '2026-01-01T00:00:00.000Z' }, mapper), { actorId: '<actor:admin>', unknownUuid: 'not-owned', description: 'owned-id', occurredAt: '2026-01-01T00:00:00.000Z' }, '$.restrictedMapping');
    equal(normalizeValue({ message: 'prefix owned-id suffix', enum: ['owned-id', 'owned-id'], nested: { updatedAt: '2026-01-01T00:00:00.000Z' } }, mapper), { message: 'prefix owned-id suffix', enum: ['owned-id', 'owned-id'], nested: { updatedAt: '2026-01-01T00:00:00.000Z' } }, '$.businessStringsAndDatesRemainLiteral');
    const body = '<html>literal original 404</html>';
    assert.equal(normalizeBody({ route: '/api/%61udit-logs' }, { body }, mapper), body);
    assert(firstDifference({ body }, { body: body + ' ' }));
    assert(firstDifference({ occurredAt: '2026-01-01T00:00:00.000Z' }, { occurredAt: '2026-01-01T00:00:00.001Z' }));
    assert.throws(() => validateReportAdmission({ formatVersion: 1, kind: 'r2ef-single-backend-http-observation', backend: 'nest', sourceHead, result: 'observed', assertions: 'pass', equivalenceClaim: false, runId: 'a0000000-0000-4000-8000-000000000001', cleanupCompleted: true, observations: [] }, 'nest'));
    const defaults = defaultSeedCatalog(); assert.equal(defaults.byKey.size, 32); assert.equal(defaults.sources.length, 3);
    const seed = defaults.byKey.get('attachment-category/customer-profile');
    const base = { ...seed, id: 'a0000000-0000-4000-8000-000000000001', status: 'active', isSystem: true, rowVersion: 1, createdBy: null, updatedBy: null };
    equal(defaultDictionaryIdentity(base, defaults), defaultDictionaryIdentity({ ...base, id: 'a0000000-0000-4000-8000-000000000002' }, defaults), '$.sameSourceDefaultDifferentUuid');
    for (const change of [{ code: 'unknown-default' }, { name: 'changed' }, { description: 'changed' }, { sortOrder: 9999 }, { status: 'inactive' }, { isSystem: false }, { rowVersion: 2 }, { createdBy: 'a0000000-0000-4000-8000-000000000003' }]) assert.throws(() => defaultDictionaryIdentity({ ...base, ...change }, defaults));
    return { result: 'pass', boundary: 'Pure comparison helper checks; no actual report parity, HTTP, SQL, services or browser executed' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--self-test') console.log(JSON.stringify(selfTest()));
    else {
        assert.equal(args.length, 3, 'Usage: compare-http.mjs --self-test | <nest-report.json> <rust-report.json> <new-comparison.json>');
        const files = args.map(name => ({ name, file: belowEvidence(name) })); assert.equal(new Set(files.map(value => value.file)).size, 3); assert(!existsSync(files[2].file));
        const inputs = files.slice(0, 2).map(value => ({ ...value, bytes: readFileSync(value.file) }));
        let report;
        try { report = compareReports(...inputs.map(value => JSON.parse(value.bytes))); }
        catch (error) { report = { formatVersion: 1, kind: 'r2ef-complete-http-parity', result: 'fail', failure: failure(error, '$.comparison') }; }
        report.inputs = inputs.map(value => ({ file: value.name, rawBytesSha256: hash(value.bytes) }));
        report.comparator = { file: 'tools/rust-r2ef/compare-http.mjs', normalizedLfSha256: hash(readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n')) };
        writeFileSync(files[2].file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ result: report.result, comparedCases: report.comparedCases, output: files[2].name, admissionFailures: report.admissionFailures?.length, mappingFailures: report.mappingFailures?.length, planDifferences: report.planDifferences?.length, responseDifferences: report.responseDifferences?.length, clockValidationFailures: report.clockValidationFailures?.length, failure: report.failure }));
        if (report.result !== 'pass') process.exitCode = 1;
    }
}
