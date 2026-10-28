// Root authorizes execution and owns API lifecycle. This runner only uses the
// new R2EF databases, journalled rows/codes and the exact live server receipt.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { databaseClient } from './database-client.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { validateSource, validateAmbient, sourceHead } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { invokeBatchFixture } = require('./batch-client.cjs');
const { describeSql } = require('../rust-r2c/witness-query-core.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const CASES = Object.freeze([
    { id: 'dictionary-cas', kind: 'dictionary-cas-update', account: 'admin', pending: false, count: 1, statuses: [500] },
    { id: 'dictionary-create-session-cas', kind: 'dictionary-insert', account: 'admin', pending: true, count: 1, statuses: [500] },
    { id: 'route-denied-session-cas', kind: 'security-insert', account: 'viewer', pending: true, count: 1, statuses: [500] },
    { id: 'dictionary-unique-create', kind: 'dictionary-insert', account: 'admin', pending: false, count: 2, statuses: [201, 500] }
]);
function evidence(file, mustExist = false) {
    assert.equal(typeof file, 'string'); const value = path.resolve(root, file), folder = path.join(root, 'tmp/rust-r2ef');
    assert(value.startsWith(folder + path.sep) && value.endsWith('.json'), 'Evidence must stay in tmp/rust-r2ef');
    let cursor = path.dirname(value); while (cursor !== root) { if (existsSync(cursor)) { const info = lstatSync(cursor); assert(info.isDirectory() && !info.isSymbolicLink()); } cursor = path.dirname(cursor); }
    if (existsSync(value)) { const info = lstatSync(value); assert(info.isFile() && !info.isSymbolicLink()); if (mustExist) assert(info.size <= 16 * 1024 * 1024); } else assert(!mustExist, 'Evidence input must exist');
    return value;
}
function sourceFile(file) { assert(typeof file === 'string' && !path.posix.isAbsolute(file) && !file.includes('\\') && !file.includes(':') && file.split('/').every(piece => piece && piece !== '.' && piece !== '..')); const resolved = path.join(root, file); assert(lstatSync(resolved).isFile() && !lstatSync(resolved).isSymbolicLink()); return resolved; }
function worker(pid) { assert(Number.isSafeInteger(pid) && pid > 0); process.kill(pid, 0); const text = readFileSync(`/proc/${pid}/stat`, 'utf8'), fields = text.slice(text.lastIndexOf(')') + 1).trim().split(/\s+/); assert(/^[0-9]+$/.test(fields[19])); return { pid, startTicks: fields[19] }; }
function failure(error, phase) { return { phase, name: /^[A-Za-z][A-Za-z0-9_]*$/.test(error?.name ?? '') ? error.name : 'Error', code: /^[A-Za-z0-9_]{1,64}$/.test(error?.code ?? '') ? error.code : 'runner_operation_failed', ...(error?.name === 'AssertionError' ? { assertion: String(error.message).split('\n')[0].slice(0, 240) } : {}) }; }
function inputs() { return ['http-concurrency.mjs', 'http-client.mjs', 'database-client.mjs', 'managed-environment.cjs', 'fixture-guard.mjs', 'batch-client.cjs', 'batch-protocol.cjs', 'batch-fixture.mjs', 'batch-extension.mjs', 'fixture-core.mjs', 'fixture-cleanup.mjs', 'fixture-journal.mjs', 'fixture-protocol.cjs', 'e-authority.json', 'f-authority.json'].map(file => ({ file: 'tools/rust-r2ef/' + file, sha256: sha(readFileSync(path.join(import.meta.dirname, file))) })).concat([{ file: 'tools/rust-r2c/witness-query-core.cjs', sha256: sha(readFileSync(sourceFile('tools/rust-r2c/witness-query-core.cjs'))) }]); }
function validateReceipt(value, backend) {
    assert.equal(value.backend, backend); assert.equal(value.sourceHead, sourceHead); assert.equal(value.aliveBefore, true); assert.equal(value.platform ?? value.ownerPlatform, 'linux');
    const origin = new URL(value.origin); assert.equal(origin.protocol, 'http:'); assert(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)); assert.equal(origin.port, backend === 'nest' ? '5500' : '5501'); assert.equal(value.origin, origin.origin); assert(!origin.username && !origin.password);
    assert(/^[a-f0-9]{64}$/.test(value.binarySha256)); assert.deepEqual(worker(value.pid), value.processIdentity); assert(Array.isArray(value.sourceFiles) && value.sourceFiles.length > 0);
    for (const entry of value.sourceFiles) { const bytes = readFileSync(sourceFile(entry.file)); assert.equal(entry.sha256 ?? entry.normalizedLfSha256, sha(entry.sha256 ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n')), 'Owner source epoch must match'); }
    return value;
}
function live(receipt) {
    assert.deepEqual(worker(receipt.pid), receipt.processIdentity, 'Server PID identity must remain exact');
    let bytes;
    if (receipt.backend === 'nest') { const binary = path.resolve(receipt.binary); assert.equal(binary, path.join(root, 'dist/apps/poms-api/main.js')); assert(lstatSync(binary).isFile() && !lstatSync(binary).isSymbolicLink()); const args = readFileSync(`/proc/${receipt.pid}/cmdline`, 'utf8').split('\0'); assert(args.includes(binary) || args.includes('dist/apps/poms-api/main.js')); bytes = readFileSync(binary); }
    else bytes = readFileSync(`/proc/${receipt.pid}/exe`);
    assert.equal(sha(bytes), receipt.binarySha256, 'Server binary must match the owner receipt'); return { processIdentity: worker(receipt.pid), binarySha256: receipt.binarySha256, alive: true, at: new Date().toISOString() };
}
function kind(description) {
    const shape = description.sqlShape.replaceAll('"', '').toLowerCase();
    if (description.relations.length !== 1) return 'other';
    if (description.command === 'UPDATE' && description.relations[0] === 'dictionary_item' && /\bwhere\b/.test(shape) && /\brow_version\b/.test(shape)) return 'dictionary-cas-update';
    if (description.command === 'INSERT' && description.relations[0] === 'dictionary_item') return 'dictionary-insert';
    if (description.command === 'INSERT' && description.relations[0] === 'security_event') return 'security-insert'; return 'other';
}
function activityRow(row) { assert(Number.isSafeInteger(row.pid) && row.pid > 0 && Array.isArray(row.blockers) && row.blockers.every(pid => Number.isSafeInteger(pid) && pid > 0)); const description = describeSql(row.query); return { pid: row.pid, state: row.state, waitEventType: row.wait_event_type, waitEvent: row.wait_event, blockers: row.blockers, query: description, kind: kind(description) }; }
function dependency(rows, pid, rootPid) { const byPid = new Map(rows.map(row => [row.pid, row])), pending = [[pid]]; while (pending.length) { const route = pending.shift(), current = route.at(-1); if (current === rootPid) return route; for (const next of byPid.get(current)?.blockers ?? []) if (!route.includes(next)) pending.push([...route, next]); } return null; }
function verifyProof(proof) { assert.equal(proof.waiterPids.length, proof.expectedCount); assert.equal(new Set(proof.waiterPids).size, proof.expectedCount); for (const pid of proof.waiterPids) { const row = proof.rows.find(row => row.pid === pid); assert(row && row.state === 'active' && row.waitEventType === 'Lock'); assert.equal(row.kind, proof.expectedKind); assert(dependency(proof.rows, pid, proof.rootPid), 'Blocking SQL must depend on the current root PID'); } return true; }

// Login and cookies belong to NavigationHttpSession. Controlled operation
// requests use its in-memory jar and expose abort only for finally cleanup.
function controlled(session, method, route, json) {
    const url = new URL(route, session.origin); assert.equal(url.origin, session.origin); assert(route.startsWith('/api/'));
    const headers = ['Host', url.host, 'User-Agent', session.identity.userAgent, 'X-Forwarded-For', '192.0.2.25', 'X-Request-Id', session.identity.requestId, 'Content-Type', 'application/json', 'Connection', 'close'];
    if (session.cookies.size) headers.push('Cookie', [...session.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (session.cookies.has('poms_csrf')) headers.push('X-CSRF-Token', session.cookies.get('poms_csrf'));
    const body = Buffer.from(JSON.stringify(json)); headers.push('Content-Length', String(body.length));
    const handle = { settled: false, aborted: false, transportFailure: false, startedAt: new Date().toISOString() }; let request, settle;
    handle.done = new Promise(resolve => {
        const finish = value => { if (handle.settled) return; handle.settled = true; handle.finishedAt = new Date().toISOString(); handle.value = value; resolve(value); }; settle = finish;
        request = http.request(url, { method, headers, timeout: 20_000 }, response => {
            const chunks = []; let length = 0;
            response.on('data', chunk => { length += chunk.length; if (length > 2 * 1024 * 1024) { handle.transportFailure = true; request.destroy(); } else chunks.push(chunk); });
            response.on('error', () => { handle.transportFailure = true; finish({ transportError: 'response_failed' }); });
            response.on('end', () => {
                try {
                    const text = Buffer.concat(chunks).toString('utf8'), contentType = response.headers['content-type'] ?? '', setCookies = response.headers['set-cookie'] ?? [];
                    for (const cookie of setCookies) { const pair = cookie.split(';', 1)[0], at = pair.indexOf('='); if (at > 0) { const key = pair.slice(0, at), value = pair.slice(at + 1); if (value) session.cookies.set(key, value); else session.cookies.delete(key); } }
                    finish({ status: response.statusCode, body: text ? contentType.includes('application/json') ? JSON.parse(text) : text : null, contentType, bodyByteLength: length, setCookieCount: setCookies.length });
                } catch { handle.transportFailure = true; finish({ transportError: 'invalid_response' }); }
            });
        });
        request.on('timeout', () => { handle.transportFailure = true; request.destroy(); });
        request.on('error', () => { handle.transportFailure = true; finish({ transportError: handle.aborted ? 'controlled_abort' : 'request_failed' }); }); request.end(body);
    });
    handle.abort = () => { if (!handle.settled) { handle.aborted = true; handle.transportFailure = true; request.destroy(); settle({ transportError: 'controlled_abort' }); } }; return handle;
}
async function sessionFacts(client, session, actorId) {
    const token = session.cookies.get('poms_session'); assert(/^[A-Za-z0-9_-]{43}$/.test(token ?? ''));
    const rows = (await client.query('select id::text,user_id::text,status,row_version,to_jsonb(last_seen_at) as last_seen_at,to_jsonb(updated_at) as updated_at,to_jsonb(idle_expires_at) as idle_expires_at,to_jsonb(absolute_expires_at) as absolute_expires_at from poms.auth_session where user_id=$1 and token_hash=$2', [actorId, sha(token)])).rows;
    assert.equal(rows.length, 1, 'Exact owned in-memory session must exist'); return rows[0];
}
function rawTouch(before, blocked, after, mutation) {
    assert(Date.parse(blocked.last_seen_at) > Date.parse(before.last_seen_at) + 50_000, 'Due-session raw touch must be committed before the blocked INSERT');
    assert(blocked.row_version > before.row_version, 'Raw touch must advance the persisted session version');
    assert.equal(mutation.before.row_version, blocked.row_version); assert.equal(mutation.after.row_version, blocked.row_version + 1);
    assert.equal(after.row_version, mutation.after.row_version, 'Failed managed CAS must not commit another session version');
    assert.equal(after.last_seen_at, blocked.last_seen_at, 'Earlier raw touch survives the failed business/audit flush');
    assert.equal(after.updated_at, blocked.updated_at, 'Root raw bump and failed managed flush do not rewrite updated_at');
    return { rawTouchVersionDelta: blocked.row_version - before.row_version, controlledBumpDelta: 1, failedManagedFlushDelta: 0, rawTouchPreserved: true };
}

export function concurrencyPlan() { return { formatVersion: 1, sourceHead, cases: CASES, boundary: 'Planned real HTTP + PG blocking probes. Each case has a separate journalled run; this object is not execution evidence.' }; }
export async function runHttpConcurrency({ backend, serverReceiptFile, tag = '01', selectedCaseIds = CASES.map(row => row.id) }) {
    assert.equal(process.platform, 'linux'); assert.equal(realpathSync(process.cwd()), realpathSync(root)); assert(['nest', 'rust'].includes(backend)); assert(/^[a-z0-9][a-z0-9-]{0,30}$/.test(tag)); process.umask(0o077);
    validateAmbient(process.env); validateSource();
    assert(selectedCaseIds.length > 0 && new Set(selectedCaseIds).size === selectedCaseIds.length && selectedCaseIds.every(id => CASES.some(row => row.id === id)));
    const output = evidence(`tmp/rust-r2ef/http-concurrency-${backend}-${tag}.json`); assert(!existsSync(output), 'Preserve previous raw report');
    for (const id of selectedCaseIds) assert(!existsSync(evidence(`tmp/rust-r2ef/http-concurrency-intent-${backend}-${tag}-${id}.json`)), 'Preserve previous mutation intent');
    const receiptBytes = readFileSync(evidence(serverReceiptFile, true)), receipt = validateReceipt(JSON.parse(receiptBytes), backend);
    const report = { formatVersion: 1, sourceHead, backend, tag, platform: process.platform, node: process.version, result: 'pending', startedAt: new Date().toISOString(), plan: concurrencyPlan(), selectedCaseIds,
        serverReceipt: { file: path.relative(root, evidence(serverReceiptFile)).replaceAll('\\', '/'), sha256: sha(receiptBytes), value: { backend, origin: receipt.origin, pid: receipt.pid, processIdentity: receipt.processIdentity, binarySha256: receipt.binarySha256, sourceHead } }, inputsBefore: inputs(), cases: [],
        ownership: 'Root-owned API process, new R2EF DB only, shared durable fixture before business writes; global runner lease. Coordinator must serialize other writers to this DB.', secretBoundary: 'Session tokens/cookies/passwords/hash bind values stay in memory; activity records retain only SQL shape/digest and PID dependencies.' };
    let control, observer, leased = false, transaction = false, phase = 'database-preflight';
    const leaseKey = createHash('sha256').update('r2ef-concurrency:' + backend).digest().readInt32BE(0);
    const begin = async () => { assert(!transaction); await control.query('BEGIN'); transaction = true; await control.query("set local statement_timeout='10s'"); await control.query("set local time zone 'UTC'"); };
    const end = async commit => { if (transaction) { try { await control.query(commit ? 'COMMIT' : 'ROLLBACK'); } finally { transaction = false; } } };
    async function one(spec) {
        const runId = randomUUID(), row = { id: spec.id, runId, result: 'pending', startedAt: new Date().toISOString(), fixtureActions: [], requests: [], proofs: [], mutations: [], cleanup: [], logouts: [] }; report.cases.push(row);
        const sessions = [], pending = []; let prepareAttempted = false, prepared, localPhase = 'prepare', safeToClean = true;
        const fixture = async (action, account = 'none', session) => { const value = await invokeBatchFixture({ formatVersion: 1, runId, backend, action, account, ...(session ? { sessionToken: session.cookies.get('poms_session') } : {}) }); row.fixtureActions.push({ action, account, state: value.state, matched: value.matched, changed: value.changed }); return value; };
        const facts = async label => { const value = (await fixture('facts')).extension; assert(value?.dictionaries && value?.securityEvents); const focused = { dictionaries: value.dictionaries, routeDenied: value.securityEvents.filter(event => event.actor_id === row.actorId && event.event_type === 'authz.route.denied').map(event => ({ id: event.id, actor_id: event.actor_id, event_type: event.event_type, path: event.path, method: event.method, result: event.result })), auditIds: value.audits.map(event => event.id), securityEventIds: value.securityEvents.map(event => event.id) }; row.factCaptures ??= []; row.factCaptures.push({ label, at: new Date().toISOString(), sha256: sha(JSON.stringify(focused)) }); return focused; };
        const sessionSet = async () => Promise.all(sessions.map(session => sessionFacts(observer, session, row.actorId)));
        async function proof() {
            const deadline = Date.now() + 5000;
            while (Date.now() < deadline) {
                assert(pending.every(handle => !handle.settled), 'A concurrency request completed before its required database barrier');
                const found = await observer.query("select pid,state,wait_event_type,wait_event,pg_blocking_pids(pid) as blockers,query from pg_stat_activity where datname=current_database() and usename=current_user and wait_event_type='Lock' order by pid");
                const rows = found.rows.map(activityRow), waits = rows.filter(value => ![control.processID, observer.processID].includes(value.pid) && dependency(rows, value.pid, control.processID)); row.lastBlockedActivity = rows;
                assert(waits.length <= spec.count, 'Unexpected writer depends on the root lock; coordinator must serialize this DB');
                if (waits.length === spec.count) { const value = { stage: spec.id + ':held', at: new Date().toISOString(), rootPid: control.processID, expectedCount: spec.count, expectedKind: spec.kind, waiterPids: waits.map(value => value.pid), dependencyPaths: waits.map(value => dependency(rows, value.pid, control.processID)), rows: waits, serverIdentity: worker(receipt.pid) }; assert.deepEqual(value.serverIdentity, receipt.processIdentity); verifyProof(value); row.proofs.push(value); return value; }
                await delay(10);
            }
            throw new Error('R2EF_CONCURRENCY_BARRIER_TIMEOUT');
        }
        try {
            row.serverBefore = live(receipt); prepareAttempted = true; prepared = await fixture('prepare'); assert.equal(prepared.state, 'prepared');
            const extension = prepared.extension, account = prepared.fixture.accounts.find(value => value.account === spec.account); assert(account); row.actorId = account.userId; row.dictionaryId = extension.dictionaryUpdateId; row.createdIntent = { domain: extension.eCreatedDictionary.domain, code: extension.eCreatedCode, actorId: extension.eCreatedDictionary.actorId };
            localPhase = 'login'; for (let index = 0; index < spec.count; index++) { const session = new NavigationHttpSession(receipt.origin, runId); await session.login(spec.account); assert.equal(session.userId, row.actorId); sessions.push(session); }
            for (const session of sessions) await fixture(spec.pending ? 'session-due' : 'session-non-due', spec.account, session);
            row.sessionsBefore = await sessionSet(); row.before = await facts('before-lock');
            const target = row.before.dictionaries.find(value => value.id === row.dictionaryId); assert(target); assert(!row.before.dictionaries.some(value => value.domain === row.createdIntent.domain && value.code === row.createdIntent.code));
            const intentFile = evidence(`tmp/rust-r2ef/http-concurrency-intent-${backend}-${tag}-${spec.id}.json`);
            const intent = { formatVersion: 1, sourceHead, backend, tag, runId, caseId: spec.id, actorId: row.actorId, dictionaryId: row.dictionaryId, createdIntent: row.createdIntent, sessionIds: row.sessionsBefore.map(value => value.id), plannedMutation: spec.id === 'dictionary-cas' ? { table: 'dictionary_item', id: row.dictionaryId, change: 'row_version + 1 only' } : spec.pending ? { table: 'auth_session', id: row.sessionsBefore[0].id, userId: row.actorId, change: 'row_version + 1 only after blocked INSERT' } : { table: 'dictionary_item', domain: row.createdIntent.domain, code: row.createdIntent.code, change: 'two HTTP creates under one pre-journalled logical intent' } };
            const intentBytes = JSON.stringify(intent, null, 2) + '\n'; writeFileSync(intentFile, intentBytes, { flag: 'wx', mode: 0o600 }); row.intent = { file: path.relative(root, intentFile).replaceAll('\\', '/'), sha256: sha(intentBytes) };
            localPhase = 'hold-lock'; await begin();
            if (spec.id === 'dictionary-cas') { const locked = (await control.query('select to_jsonb(t) as row from poms.dictionary_item t where id=$1 and domain=$2 and code=$3 for update', [target.id, target.domain, target.code])).rows; assert.equal(locked.length, 1); assert.deepEqual(locked[0].row, target); row.heldLock = { kind: 'row', table: 'dictionary_item', id: target.id, holderPid: control.processID }; }
            else { const table = spec.kind === 'security-insert' ? 'security_event' : 'dictionary_item'; await control.query(table === 'security_event' ? 'lock table poms.security_event in share mode' : 'lock table poms.dictionary_item in share mode'); row.heldLock = { kind: 'table-share', table, holderPid: control.processID }; }
            localPhase = 'http-blocked';
            const request = spec.id === 'dictionary-cas' ? { method: 'PATCH', route: '/api/dictionaries/' + target.id, json: { name: 'E concurrency rejected overwrite' } } : spec.kind === 'security-insert' ? { method: 'POST', route: '/api/security-events:recordRouteDenied', json: { path: extension.fFixture.routePath, requiredPermissions: ['platform:users:manage'] } } : { method: 'POST', route: '/api/dictionaries', json: { domain: row.createdIntent.domain, code: row.createdIntent.code, name: 'E concurrency created' } };
            for (const session of sessions) { pending.push(controlled(session, request.method, request.route, request.json)); row.requests.push({ ...request }); }
            await proof(); row.sessionsWhileBlocked = await sessionSet();
            localPhase = 'invalidate-version';
            if (spec.id === 'dictionary-cas') {
                const before = (await control.query('select id::text,row_version,to_jsonb(updated_at) as updated_at from poms.dictionary_item where id=$1', [target.id])).rows[0];
                const changed = await control.query('update poms.dictionary_item set row_version=row_version+1 where id=$1 and row_version=$2 returning id', [target.id, before.row_version]); assert.equal(changed.rowCount, 1);
                const after = (await control.query('select id::text,row_version,to_jsonb(updated_at) as updated_at from poms.dictionary_item where id=$1', [target.id])).rows[0]; assert.equal(after.row_version, before.row_version + 1); assert.equal(after.updated_at, before.updated_at); row.mutations.push({ table: 'dictionary_item', id: target.id, before, after });
            } else if (spec.pending) {
                const observed = row.sessionsWhileBlocked[0];
                const before = (await control.query('select id::text,user_id::text,row_version,to_jsonb(last_seen_at) as last_seen_at,to_jsonb(updated_at) as updated_at from poms.auth_session where id=$1 and user_id=$2 for update', [observed.id, row.actorId])).rows[0]; assert(before); assert.equal(before.row_version, observed.row_version);
                const changed = await control.query('update poms.auth_session set row_version=row_version+1 where id=$1 and user_id=$2 and row_version=$3 returning id', [observed.id, row.actorId, before.row_version]); assert.equal(changed.rowCount, 1);
                const after = (await control.query('select id::text,user_id::text,row_version,to_jsonb(last_seen_at) as last_seen_at,to_jsonb(updated_at) as updated_at from poms.auth_session where id=$1 and user_id=$2', [observed.id, row.actorId])).rows[0]; row.mutations.push({ table: 'auth_session', id: observed.id, before, after });
            }
            localPhase = 'release-and-observe'; row.releaseStartedAt = new Date().toISOString(); await end(true); row.releasedAt = new Date().toISOString();
            const responses = await Promise.all(pending.map(handle => handle.done)); for (const [index, response] of responses.entries()) Object.assign(row.requests[index], { response, startedAt: pending[index].startedAt, finishedAt: pending[index].finishedAt });
            row.sessionsAfter = await sessionSet(); row.after = await facts('after-http');
            assert.deepEqual(responses.map(response => response.status).toSorted((a, b) => a - b), spec.statuses, 'Only the frozen real race statuses are accepted');
            for (const response of responses.filter(value => value.status === 500)) assert.deepEqual(response.body, { statusCode: 500, message: 'Internal server error' });
            if (spec.id === 'dictionary-cas') { const actual = row.after.dictionaries.find(value => value.id === target.id); assert.deepEqual(actual, { ...target, row_version: target.row_version + 1 }, 'Rejected business CAS preserves every field except the root-controlled version bump'); }
            else if (spec.kind === 'security-insert') { assert.deepEqual(row.after.routeDenied, row.before.routeDenied, 'Failed managed session CAS rolls back the routeDenied event'); row.rawTouch = rawTouch(row.sessionsBefore[0], row.sessionsWhileBlocked[0], row.sessionsAfter[0], row.mutations[0]); }
            else { const created = row.after.dictionaries.filter(value => value.domain === row.createdIntent.domain && value.code === row.createdIntent.code); if (spec.pending) { assert.equal(created.length, 0, 'Failed pending session CAS rolls back the dictionary INSERT'); row.rawTouch = rawTouch(row.sessionsBefore[0], row.sessionsWhileBlocked[0], row.sessionsAfter[0], row.mutations[0]); } else { assert.equal(created.length, 1); assert.equal(created[0].created_by, row.actorId); assert.equal(responses.find(value => value.status === 201).body.id, created[0].id); assert(!responses.some(value => value.status === 409), 'Precheck conflict cannot substitute for a proved unique INSERT race'); row.oneCommittedDictionary = created[0]; } }
            row.serverAfter = live(receipt); row.result = 'observed';
        } catch (error) { row.failure = failure(error, localPhase); row.result = 'failed'; if (localPhase === 'login' && error?.name !== 'AssertionError') { safeToClean = false; row.quiescenceFailure = { code: 'login_transport_failure_requires_coordinator_quiescence', retainedJournal: true }; } }
        finally {
            try { await end(false); } catch (error) { row.rollbackFailure = failure(error, 'rollback'); safeToClean = false; }
            const deadline = Date.now() + 22_000; while (pending.some(handle => !handle.settled) && Date.now() < deadline) await delay(20);
            for (const handle of pending) handle.abort(); await Promise.all(pending.map(handle => handle.done));
            for (const [index, handle] of pending.entries()) if (!row.requests[index].response) Object.assign(row.requests[index], { response: handle.value, startedAt: handle.startedAt, finishedAt: handle.finishedAt });
            row.requestClose = { allSettled: pending.every(handle => handle.settled), aborted: pending.filter(handle => handle.aborted).length, transportFailures: pending.filter(handle => handle.transportFailure).length };
            if (row.requestClose.aborted || row.requestClose.transportFailures) { safeToClean = false; row.quiescenceFailure = { code: 'transport_aborted_request_requires_coordinator_quiescence', retainedJournal: true }; }
            if (safeToClean) {
                for (const session of sessions) try { if (session.cookies.has('poms_session')) { const response = await session.request('POST', '/api/auth/session:logout', { json: {} }); row.logouts.push({ status: response.status, setCookieCount: response.setCookie.length }); } } catch (error) { row.logouts.push(failure(error, 'logout')); safeToClean = false; row.quiescenceFailure = { code: 'logout_transport_failure_requires_coordinator_quiescence', retainedJournal: true }; }
                if (safeToClean && prepared) try { row.finalFacts = await facts('after-logout'); } catch (error) { row.finalFactsFailure = failure(error, 'final-facts'); }
                if (safeToClean && prepareAttempted) for (let pass = 0; pass < 2; pass++) try { const result = await fixture('cleanup'); const value = { pass, state: result.state, matched: result.matched, changed: result.changed, extension: result.extension, base: result.cleanup }; row.cleanup.push(value); assert.equal(result.state, 'cleaned'); assert.equal(result.extension?.zero, true); assert.equal(result.extension?.remaining, 0); if (pass === 1) { assert.equal(result.matched, 0); assert.equal(result.changed, 0); } } catch (error) { row.cleanup.push({ pass, failure: failure(error, 'cleanup') }); }
            }
            for (const session of sessions) session.cookies.clear();
            row.cleanupCompleted = row.cleanup.length === 2 && row.cleanup.every(value => value.state === 'cleaned' && value.extension?.zero && value.extension?.remaining === 0) && row.cleanup[1].matched === 0 && row.cleanup[1].changed === 0;
            if (!row.cleanupCompleted || row.finalFactsFailure || row.rollbackFailure) row.result = 'failed'; row.finishedAt = new Date().toISOString();
        }
        return row;
    }
    try {
        report.serverBefore = live(receipt); control = await databaseClient(backend); observer = await databaseClient(backend); await observer.query("set time zone 'UTC'");
        const lease = await control.query('select pg_try_advisory_lock(1380074315,$1) as locked', [leaseKey]); assert.equal(lease.rows[0]?.locked, true, 'Only one R2EF concurrency runner may own this database'); leased = true; report.controlPid = control.processID; report.observerPid = observer.processID;
        phase = 'cases'; for (const id of selectedCaseIds) { const result = await one(CASES.find(row => row.id === id)); if (!result.cleanupCompleted) break; }
    } catch (error) { report.failure = failure(error, phase); }
    finally {
        try { await end(false); } catch (error) { report.rollbackFailure = failure(error, 'outer-rollback'); }
        if (leased) try { const unlocked = await control.query('select pg_advisory_unlock(1380074315,$1) as unlocked', [leaseKey]); assert.equal(unlocked.rows[0]?.unlocked, true); } catch (error) { report.leaseFailure = failure(error, 'lease-release'); }
        for (const client of [observer, control]) if (client) try { await client.end(); } catch (error) { report.closeFailure = failure(error, 'database-close'); }
        try { validateSource(); report.inputsAfter = inputs(); assert.deepEqual(report.inputsAfter, report.inputsBefore); validateReceipt(receipt, backend); report.serverAfter = live(receipt); } catch (error) { report.sourceOrOwnerFailure = failure(error, 'source-owner-closeout'); }
        report.cleanupCompleted = report.cases.length === selectedCaseIds.length && report.cases.every(row => row.cleanupCompleted);
        report.result = report.cases.length === selectedCaseIds.length && report.cases.every(row => row.result === 'observed') && report.cleanupCompleted && !['failure', 'rollbackFailure', 'leaseFailure', 'closeFailure', 'sourceOrOwnerFailure'].some(key => report[key]) ? 'observed' : 'failed';
        report.finishedAt = new Date().toISOString(); report.counts = { selectedCases: selectedCaseIds.length, attemptedCases: report.cases.length, observedCases: report.cases.filter(row => row.result === 'observed').length, controlledHttpRequests: report.cases.reduce((sum, row) => sum + row.requests.length, 0), provedDatabaseBarriers: report.cases.reduce((sum, row) => sum + row.proofs.length, 0), independentCleanups: report.cases.reduce((sum, row) => sum + row.cleanup.filter(value => value.state === 'cleaned' && value.extension?.zero).length, 0) };
        report.verdictBoundary = 'Observed means these executed barrier/status/PG-side-effect assertions and cleanup passed for this backend. Nest/Rust equivalence needs the two original reports; primitive number tests do not claim an original borrowed transaction.';
        writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    return { report, output };
}

export function selfTest() {
    const row = activityRow({ pid: 21, state: 'active', wait_event_type: 'Lock', wait_event: 'relation', blockers: [10], query: "insert into poms.dictionary_item(code,name) values ('private-value','owned-name') returning id" });
    assert.equal(row.kind, 'dictionary-insert'); assert(!JSON.stringify(row).includes('private-value')); assert(!JSON.stringify(row).includes('owned-name')); assert.deepEqual(dependency([row], 21, 10), [21, 10]);
    assert(verifyProof({ expectedCount: 1, expectedKind: 'dictionary-insert', rootPid: 10, waiterPids: [21], rows: [row] }));
    assert.throws(() => verifyProof({ expectedCount: 1, expectedKind: 'dictionary-insert', rootPid: 99, waiterPids: [21], rows: [row] }));
    assert.equal(kind(describeSql('update poms.dictionary_item set name=$1,row_version=row_version+1 where id=$2 and row_version=$3 returning row_version')), 'dictionary-cas-update');
    assert.equal(kind(describeSql('insert into poms.security_event(event_type) values ($1) returning id')), 'security-insert'); assert.equal(CASES.length, 4); assert.equal(CASES.reduce((sum, row) => sum + row.count, 0), 5);
    return { result: 'pass', plannedCases: 4, plannedControlledRequests: 5, boundary: 'Pure SQL-shape/dependency/plan checks only; no DB, fixture, HTTP or service execution' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--self-test') console.log(JSON.stringify(selfTest()));
    else if (args.length === 1 && args[0] === '--plan') console.log(JSON.stringify(concurrencyPlan(), null, 2));
    else {
        if (args[0] === '--run') args.shift(); assert(args.length === 3 || args.length === 5, 'Usage: http-concurrency.mjs [--run] <nest|rust> <owner-receipt.json> <unique-tag> [--case <id>]');
        const selectedCaseIds = args.length === 5 ? (assert.equal(args[3], '--case'), [args[4]]) : undefined;
        const { report, output } = await runHttpConcurrency({ backend: args[0], serverReceiptFile: args[1], tag: args[2], ...(selectedCaseIds ? { selectedCaseIds } : {}) });
        console.log(JSON.stringify({ result: report.result, backend: report.backend, output, counts: report.counts, cleanupCompleted: report.cleanupCompleted, failure: report.failure })); if (report.result !== 'observed') process.exitCode = 1;
    }
}
