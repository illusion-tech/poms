import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { describeSql } = require('../rust-r2c/witness-query-core.cjs');

export const concurrencyCases = Object.freeze([
    { id: 'username-two-prechecks', kind: 'username', statuses: [201, 500], symmetric: true, auditDelta: 1 },
    { id: 'roles-delete-insert-conflict', kind: 'roles', statuses: [200, 500], symmetric: true, auditDelta: 1 },
    { id: 'org-delete-stale-user', kind: 'org-cas', statuses: [500], auditDelta: 0 },
    { id: 'target-user-stale-version', kind: 'user-cas', statuses: [500], auditDelta: 0 },
    { id: 'alias-user-stale-version', kind: 'user-cas', alias: true, statuses: [500], auditDelta: 0 },
    { id: 'profile-toggle-both-stale', kind: 'user-pair', statuses: [500, 500], auditDelta: 0 },
    { id: 'late-session-dirty-user', kind: 'session', command: 'dirty', statuses: [500], auditDelta: 0 },
    { id: 'late-session-noop-user', kind: 'session', command: 'noop', statuses: [500], auditDelta: 0 },
    { id: 'late-session-roles-empty', kind: 'session', command: 'roles', statuses: [500], auditDelta: 0 },
    { id: 'late-session-org-replace', kind: 'session', command: 'org', statuses: [500], auditDelta: 0 },
    { id: 'self-null-to-value', kind: 'nullable', self: true, values: true, statuses: [200], auditDelta: 1 },
    { id: 'self-value-to-null', kind: 'nullable', self: true, values: false, statuses: [200], auditDelta: 1 },
    { id: 'other-null-to-value', kind: 'nullable', self: false, values: true, statuses: [200], auditDelta: 1 },
    { id: 'caller-role-after-guard', kind: 'role-change', statuses: [200], auditDelta: 1, followupStatuses: [403, 200] },
    { id: 'caller-disable-after-guard', kind: 'caller-disable', statuses: [200], auditDelta: 1, followupStatuses: [401] },
    { id: 'org-inactive-after-precheck', kind: 'org-fk', statuses: [200], auditDelta: 1, followupStatuses: [409] }
].map((value) => Object.freeze({ ...value, statuses: Object.freeze(value.statuses), ...(value.followupStatuses ? { followupStatuses: Object.freeze(value.followupStatuses) } : {}) })));
export const concurrencyPlanSha256 = createHash('sha256').update(JSON.stringify(concurrencyCases)).digest('hex');
export function userRowLockMode(kind) { return kind === 'org-cas' ? 'FOR NO KEY UPDATE' : 'FOR UPDATE'; }
export function concurrencyManifest() {
    return { formatVersion: 1, schema: 'r2d-http-row-lock-plan.v1', planSha256: concurrencyPlanSha256, casePlan: concurrencyCases,
        barrierProtocol: 'PG15 exact journal-owned row locks, full blocker dependency paths and positive SQL grammar; no product preload or table locks',
        symmetry: 'Only username-two-prechecks and roles-delete-insert-conflict permit a declared winner/loser exchange. Original HTTP request order and every response array remain intact.',
        limits: 'PG wait proofs identify owned lock dependencies, not private bind values. Original Nest driver-phase evidence and separate service PG acceptance remain required. No all-interleavings, performance, owner-closeout or G3 claim.' };
}
const atom = '(?:\\$[1-9][0-9]*|\\?text|\\?number|true|false|null)(?:::[a-z_][a-z0-9_]*(?:\\[\\])?)*';
const col = '(?:[a-z_][a-z0-9_]*\\.)?';
function conjunction(where, predicates) {
    const terms = where.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+and\s+/);
    return terms.length === predicates.length && predicates.every((part) => terms.filter((term) => new RegExp(`^${part}$`).test(term)).length === 1);
}
export function queryKind(query) {
    const value = typeof query === 'string' ? describeSql(query) : query;
    if (!value || value.relations?.length !== 1) return 'other';
    const shape = value.sqlShape.replaceAll('"', '').toLowerCase().replace(/;\s*$/, '');
    if (/;|\b(?:join|union|intersect|except|with|or|not)\b/.test(shape)) return 'other';
    const table = value.relations[0];
    const where = /\bwhere\b([\s\S]*?)(?=\breturning\b|\bfor update\b|$)/.exec(shape)?.[1]?.trim() ?? '';
    const returning = /\breturning\b([\s\S]*)$/.exec(shape)?.[1]?.trim() ?? '';
    if (value.command === 'UPDATE' && new RegExp(`^update poms\\.${table} set `).test(shape)) {
        if (['platform_user', 'auth_session'].includes(table) && conjunction(where, [`${col}id\\s*=\\s*${atom}`, `${col}row_version\\s*=\\s*(?:\\$[1-9][0-9]*|\\?number)`]) && new RegExp(`^${col}row_version$`).test(returning))
            return table === 'platform_user' ? 'user-cas' : 'managed-session-cas';
        if (table === 'auth_session' && /\bcoalesce\s*\(/.test(shape) && /\bleast\s*\(/.test(shape)
            && conjunction(where, [`${col}id\\s*=\\s*${atom}`, `${col}status\\s*=\\s*${atom}`, `${col}last_seen_at\\s*<=\\s*${atom}`, `${col}idle_expires_at\\s*>\\s*${atom}`, `${col}absolute_expires_at\\s*>\\s*${atom}`])
            && /^last_seen_at\b/.test(returning)) return 'raw-session-touch';
    }
    if (value.command === 'INSERT' && new RegExp(`^insert into poms\\.${table}\\s*\\([a-z0-9_, ]+\\)\\s*values\\s*\\(`).test(shape) && !/\b(?:select|on conflict)\b/.test(shape)) {
        if (table === 'platform_user') return 'user-insert';
        if (table === 'user_role_assignment') return 'role-insert';
        if (table === 'user_org_membership') return 'membership-insert';
    }
    if (value.command === 'SELECT' && table === 'auth_session' && /^select id::text from poms\.auth_session where /.test(shape) && / for update$/.test(shape)
        && conjunction(where, [`id\\s*=\\s*${atom}`, `user_id\\s*=\\s*${atom}`])) return 'coordinator-session-lock';
    return 'other';
}
export function sanitizeActivity(row) {
    assert(Number.isSafeInteger(row.pid) && row.pid > 0 && Array.isArray(row.blockers) && row.blockers.every((pid) => Number.isSafeInteger(pid) && pid > 0));
    assert.equal(typeof row.query, 'string');
    return { pid: row.pid, state: row.state, waitEventType: row.wait_event_type, waitEvent: row.wait_event,
        blockers: row.blockers, query: describeSql(row.query), kind: queryKind(row.query) };
}
export function dependencyPath(rows, pid, roots) {
    const indexed = new Map(rows.map((row) => [row.pid, row])), queue = [[pid]];
    assert.equal(indexed.size, rows.length);
    while (queue.length) {
        const route = queue.shift(), current = route.at(-1);
        if (roots.includes(current)) return route;
        for (const next of indexed.get(current)?.blockers ?? []) if (!route.includes(next)) queue.push([...route, next]);
    }
    return null;
}
export function assertWaitProof(proof) {
    assert(Array.isArray(proof.rows) && Array.isArray(proof.roots) && proof.roots.length && proof.roots.every((pid) => Number.isSafeInteger(pid) && pid > 0));
    assert.equal(new Set(proof.roots).size, proof.roots.length); assert.equal(new Set(proof.waiterPids).size, proof.waiterPids.length);
    assert.equal(proof.waiterPids.length, proof.expectedCount); assert([1, 2].includes(proof.expectedCount));
    for (const pid of proof.waiterPids) {
        assert(!proof.roots.includes(pid)); const row = proof.rows.find((r) => r.pid === pid);
        assert(row && row.state === 'active' && row.waitEventType === 'Lock');
        assert.equal(row.kind, queryKind(row.query)); assert.equal(row.kind, proof.expectedKind);
        assert(dependencyPath(proof.rows, pid, proof.roots), 'SQL shape without an owned blocker path is not a barrier');
    }
    for (const pid of proof.roots) assert(proof.waiterPids.some((waiter) => dependencyPath(proof.rows, waiter, [pid])));
    assert.equal(new Date(proof.at).toISOString(), proof.at); return true;
}
export function assertCaseProofs(row) {
    const spec = concurrencyCases.find((value) => value.id === row.id); assert(spec);
    const kinds = spec.kind === 'session' ? ['raw-session-touch', 'coordinator-session-lock', 'managed-session-cas']
        : [spec.kind === 'username' ? 'user-insert' : spec.kind === 'roles' ? 'role-insert' : spec.kind === 'org-fk' ? 'membership-insert' : 'user-cas'];
    assert.deepEqual(row.proofs.map((proof) => proof.expectedKind), kinds);
    for (const proof of row.proofs) assertWaitProof(proof);
    if (spec.kind === 'session') {
        assert.equal(row.handoffAcquired, true);
        // SQLx may release an auth connection before the business flush uses
        // another pool connection. Both proofs bind to the same owned session
        // row through the coordinator, never to an invented same-PID rule.
        assert.equal(row.proofs[0].targetSessionId, row.proofs[2].targetSessionId);
        assert(/^[0-9a-f-]{36}$/.test(row.proofs[0].targetSessionId));
    }
    const expected = spec.symmetric || spec.kind === 'user-pair' ? 2 : 1;
    assert.equal(row.proofs[0].expectedCount, expected);
    if (spec.kind === 'username') assert.equal(row.sentinelRestored, true);
    if (['roles', 'org-cas', 'org-fk'].includes(spec.kind)) assert.equal(row.relationshipsDuringWait.length, 0, 'Native delete must already be committed and visible to the independent observer');
    return spec;
}
export function assertCaseTiming(row) {
    const stamp = (value) => { assert.equal(new Date(value).toISOString(), value); return Date.parse(value); };
    const start = stamp(row.startedAt), finish = stamp(row.finishedAt); assert(start <= finish);
    let previous = start;
    for (const proof of row.proofs) { const at = stamp(proof.at); assert(at >= previous && at <= finish); previous = at; }
    const release = stamp(row.releasedAt); assert(release >= previous && release <= finish);
    for (const request of row.requests) { assert(stamp(request.settledAt) >= release && stamp(request.settledAt) <= finish); }
    return true;
}
export function assertStatuses(row) {
    const spec = concurrencyCases.find((value) => value.id === row.id); assert(spec);
    const actual = row.requests.map((request) => request.status);
    if (spec.symmetric) {
        assert.equal(actual.length, 2); assert.equal(actual.filter((status) => status === spec.statuses[0]).length, 1); assert.equal(actual.filter((status) => status === spec.statuses[1]).length, 1);
        row.winnerClient = row.requests[actual.indexOf(spec.statuses[0])].client;
    } else assert.deepEqual(actual, spec.statuses);
    assert(row.requests.every((request) => request.setCookieCount === 0));
    assert.deepEqual((row.followups ?? []).map((request) => request.status), spec.followupStatuses ?? []); return true;
}
// HTTP outcomes settle into the report immediately. Every recovery/capture is
// attempted even after a barrier failure; no incomplete row can become observed.
export async function captureControlledRequests({ row, requests, send, control, release, adopt, captureFollowups, captureAfter, captureSessions, verify }) {
    const pending = requests.map((request) => {
        const descriptor = { ...request, status: null, response: null }; row.requests.push(descriptor);
        return Promise.resolve().then(() => send(request)).then((response) => {
            Object.assign(descriptor, { status: response.status, response: response.body, setCookieCount: response.setCookie.length, settledAt: new Date().toISOString() }); return { response };
        }, (error) => { descriptor.transportError = { name: error.name }; descriptor.settledAt = new Date().toISOString(); return { error }; });
    });
    let firstError; row.captureErrors = [];
    const failure = (phase, error) => { firstError ??= error; row.failurePhase ??= phase; row.captureErrors.push({ phase, name: error.name, ...(typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? { sqlstate: error.code } : {}) }); };
    try { await control(); } catch (error) { failure('barrier-control', error); }
    finally {
        try { await release(); } catch (error) { failure('release-locks', error); }
        for (const outcome of await Promise.all(pending)) if (outcome.error) failure('http-transport', outcome.error);
        if (adopt) try { row.adoption = await adopt(); } catch (error) { failure('adopt-created-user', error); }
        if (captureFollowups) try { await captureFollowups(); } catch (error) { failure('followup-http', error); }
        for (const [key, capture] of [['after', captureAfter], ['sessionsAfter', captureSessions]]) try { row[key] = await capture(); } catch (error) { failure(key, error); }
        row.finishedAt = new Date().toISOString();
        if (!firstError) try { await verify(); } catch (error) { failure('assertions', error); }
        row.result = firstError ? 'capture-incomplete' : 'observed';
    }
    if (firstError) throw firstError; return row;
}
