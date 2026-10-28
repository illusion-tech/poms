import assert from 'node:assert/strict';
import { randomUUID, createHash, createHmac, createDecipheriv, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { OwnedFixture } from './owned-fixture.mjs';
import { managed } from './database-client.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { runG } from './g-http-cases.mjs';
import { runH } from './h-http-cases.mjs';
import { runGBadCipher } from './g-badcipher-cases.mjs';
import { OwnedCipherFaults } from './cipher-faults.mjs';
import { isDynamicTimestampPath, validateIssuedLifetimes } from './timestamp-policy.mjs';
const [nestFile, rustFile, upstreamFile, tag, onlyGroup] = process.argv.slice(2);
assert(process.argv.length === 6 || process.argv.length === 7);
assert(onlyGroup === undefined || ['G', 'H', 'GBadCipher'].includes(onlyGroup));
const groups = onlyGroup ? [onlyGroup] : ['G', 'H'];
assert(/^[a-z0-9-]{1,35}$/.test(tag));
assert.equal(process.platform, 'linux');
const receipts = { nest: JSON.parse(readFileSync(nestFile)), rust: JSON.parse(readFileSync(rustFile)) },
    upstreamReceipt = JSON.parse(readFileSync(upstreamFile));
for (const [backend, receipt] of Object.entries(receipts)) {
    assert.equal(receipt.backend, backend);
    assert.equal(receipt.origin, 'http://127.0.0.1:' + (backend === 'nest' ? 5700 : 5701));
    process.kill(receipt.pid, 0);
}
process.kill(upstreamReceipt.pid, 0);
const out = `tmp/rust-r2gh/compat-${tag}.json`;
assert(!existsSync(out));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const report = {
    formatVersion: 1,
    kind: 'G/H-original-Nest-versus-Rust-real-HTTP-PG',
    tag,
    node: process.version,
    startedAt: new Date().toISOString(),
    result: 'pending',
    selection: { groups },
    runIds: { G: randomUUID(), H: randomUUID(), GBadCipher: randomUUID() },
    receipts: { nest: { file: nestFile, sha256: sha(readFileSync(nestFile)) }, rust: { file: rustFile, sha256: sha(readFileSync(rustFile)) }, upstream: { file: upstreamFile, sha256: sha(readFileSync(upstreamFile)) } },
    executions: [],
    comparisons: [],
    boundary: 'Actual original Nest and Rust routes/adapters with the same synthetic loopback protocol fixture and independent GH PG15 databases. No live vendor certification. Protocol/cipher values verified in memory; saved evidence is sanitized.'
};
const inputDirectory = `tmp/rust-r2gh/compat-${tag}-input`;
assert(!existsSync(inputDirectory));
mkdirSync(inputDirectory, { mode: 0o700 });
const inputManifest = readdirSync('tools/rust-r2gh')
    .filter((file) => /\.(?:mjs|cjs|ts|cts)$/.test(file))
    .sort()
    .map((name) => {
        const file = 'tools/rust-r2gh/' + name,
            bytes = readFileSync(file),
            snapshot = inputDirectory + '/' + name;
        writeFileSync(snapshot, bytes, { flag: 'wx', mode: 0o600 });
        return { file, snapshot, bytes: bytes.length, rawBytesSha256: sha(bytes) };
    });
writeFileSync(inputDirectory + '/manifest.json', JSON.stringify(inputManifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
report.inputSnapshot = { manifest: inputDirectory + '/manifest.json', files: inputManifest.length, sha256: sha(JSON.stringify(inputManifest)) };
const writePlan = (value) => {
    const file = upstreamReceipt.planFile;
    assert.equal(file, resolve('tmp/rust-r2gh/upstream', upstreamReceipt.tag, 'plan.json'));
    const tmp = file + '.' + randomUUID() + '.tmp';
    writeFileSync(tmp, JSON.stringify(value) + '\n', { flag: 'wx', mode: 0o600 });
    renameSync(tmp, file);
};

async function execute(backend, group) {
    const runId = report.runIds[group],
        receipt = receipts[backend],
        execution = { backend, group, runId, result: 'pending', cases: [], notes: {}, cleanup: [], protocolChecks: [], startedAt: new Date().toISOString() };
    report.executions.push(execution);
    const rawCases = [],
        aliases = new Map(),
        opaqueSeen = new Set(),
        timeSeen = new Set();
    execution.timestampReceipts = [];
    execution.cookieTimingReceipts = [];
    execution.lifetimeReceipts = [];
    let fixture, context, settings, cipherFaults;
    const responseCookies = (cookies, caseId) =>
        cookies.map((cookie) => {
            const [pair, ...rawAttributes] = cookie.split(';'),
                name = pair.slice(0, pair.indexOf('=')),
                attributes = rawAttributes.map((attribute) => attribute.trim()),
                receivedAt = Date.now(),
                expiry = attributes.find((attribute) => /^expires=/i.test(attribute))?.slice(8),
                age = attributes.find((attribute) => /^max-age=/i.test(attribute))?.slice(8),
                maxAge = age === undefined ? null : Number(age);
            if (expiry && maxAge !== null) {
                assert(Number.isSafeInteger(maxAge) && maxAge >= 0);
                const expiresAt = Date.parse(expiry);
                assert(Number.isFinite(expiresAt));
                assert(maxAge === 0 ? expiresAt <= receivedAt : Math.abs(expiresAt - receivedAt - maxAge * 1000) <= 1500, 'Cookie Max-Age and Expires must agree within HTTP date rounding');
                execution.cookieTimingReceipts.push({ caseId, name, maxAge, expiresAt: expiry, receivedAt: new Date(receivedAt).toISOString(), timingVerified: true });
            }
            return { name, attributes: attributes.map((attribute) => (/^expires=/i.test(attribute) ? 'Expires=<timestamp>' : attribute)) };
        });
    const alias = (actual, label) => {
        assert(typeof actual === 'string' && typeof label === 'string' && label.length < 200);
        if (!actual) return;
        if (!aliases.has(actual)) aliases.set(actual, '<' + label + '>');
        if (label.toLowerCase().includes('state') && actual.includes('.')) {
            const [encoded, signature] = actual.split('.');
            const source = settings.IDENTITY_PROVIDER_STATE_KEY ?? settings.IDENTITY_PROVIDER_SECRET_KEY ?? settings.JWT_SECRET ?? 'poms-dev-secret-change-in-production',
                key = createHash('sha256').update(source).digest(),
                expected = createHmac('sha256', key).update(encoded).digest(),
                provided = Buffer.from(signature, 'base64url');
            assert.equal(provided.length, expected.length);
            assert(timingSafeEqual(provided, expected));
            execution.protocolChecks.push({ kind: 'state', label, length: actual.length, sha256: sha(actual), hmacVerified: true, payloadJsonParsed: JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) !== undefined });
        }
        if (label.toLowerCase().includes('ticket') && /^[A-Za-z0-9_-]{43}$/.test(actual)) {
            aliases.set(sha(actual), '<sha256:' + label + '>');
            execution.protocolChecks.push({ kind: 'ticket', label, length: actual.length, sha256: sha(actual) });
        }
    };
    const decrypt = (value) => {
        const [version, iv, tag, body] = value.split(':');
        assert.equal(version, 'v1');
        const source = settings.IDENTITY_PROVIDER_SECRET_KEY || settings.JWT_SECRET || 'poms-dev-secret-change-in-production',
            key = createHash('sha256').update(source).digest(),
            cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
        cipher.setAuthTag(Buffer.from(tag, 'base64'));
        return Buffer.concat([cipher.update(Buffer.from(body, 'base64')), cipher.final()]);
    };
    const factTables = new Set(['identity_provider_config', 'external_identity', 'identity_provider_oauth_grant', 'external_login_ticket', 'external_org_source', 'external_department_mapping', 'org_sync_run', 'org_sync_diff_item', 'org_unit', 'audit_log']);
    const normalize = (value, key = '', parts = ['cases'], parent, table) => {
        if (Array.isArray(value)) {
            const items = value.map((item) => normalize(item, key, [...parts, '*'], undefined, table));
            if (
                /^cases\/\*\/(?:before|after|facts)\/[^/]+$/.test(parts.join('/')) && factTables.has(key) &&
                items.every((item) => item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string')
            )
                return items.toSorted((a, b) => a.id.localeCompare(b.id));
            return items;
        }
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, normalize(item, name, [...parts, name], value, /^cases\/\*\/(?:before|after|facts)$/.test(parts.join('/')) && factTables.has(name) ? name : table)]));
        if (typeof value !== 'string') return value;
        if (/^(?:clientSecret|client_secret|app_secret|password)$/i.test(key)) return { sanitized: true, length: value.length, sha256: sha(value) };
        if (/encrypted/i.test(key)) {
            const fault = cipherFaults?.marker(value, key, parent, table);
            if (fault) return fault;
            const clear = decrypt(value);
            return { encrypted: true, decryptVerified: true, plaintextLength: clear.length, plaintextSha256: sha(clear) };
        }
        if (/^(csrfToken|accessToken|refreshToken|sessionToken)$/i.test(key)) {
            const identity = key + ':' + sha(value);
            if (!opaqueSeen.has(identity)) {
                opaqueSeen.add(identity);
                execution.protocolChecks.push({ kind: key, length: value.length, sha256: sha(value) });
            }
            return '<' + key + '>';
        }
        if (aliases.has(value)) return aliases.get(value);
        if (/^(?:ticket|state)$/i.test(key)) {
            const identity = key + ':' + sha(value);
            if (!opaqueSeen.has(identity)) {
                opaqueSeen.add(identity);
                execution.protocolChecks.push({ kind: key, length: value.length, sha256: sha(value) });
            }
            return '<' + key + '>';
        }
        if (isDynamicTimestampPath(parts) && /^\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d(?::?\d\d)?)$/.test(value) && Number.isFinite(Date.parse(value))) {
            const fractional = /\.(\d+)/.exec(value)?.[1] ?? '';
            const aligned = !/[1-9]/.test(fractional.slice(3));
            const identity = parts.join('/') + ':' + value;
            if (!timeSeen.has(identity)) {
                timeSeen.add(identity);
                execution.timestampReceipts.push({ field: key, path: parts.join('/'), value, millisecondAligned: aligned, projectionRule: 'Explicit original server-owned timestamp path' });
            }
            return { timestamp: true, millisecondAligned: aligned };
        }
        let text = value;
        for (const [actual, label] of [...aliases].sort((a, b) => b[0].length - a[0].length)) text = text.replaceAll(actual, label);
        if (text.startsWith('http:') || text.startsWith('https:') || text.startsWith('/')) {
            try {
                const url = new URL(value, receipt.origin);
                for (const name of ['state', 'ticket', 'code'])
                    if (url.searchParams.has(name)) {
                        const original = url.searchParams.get(name);
                        url.searchParams.set(name, aliases.get(original) ?? '<' + name + '>');
                    }
                text = url.href;
                for (const [actual, label] of [...aliases].sort((a, b) => b[0].length - a[0].length)) text = text.replaceAll(actual, label);
            } catch {
                /* Other original text remains literal. */
            }
        }
        return text;
    };
    try {
        fixture = await OwnedFixture.connect(backend, runId);
        context = await fixture.prepare();
        settings = managed(backend).childEnv;
        cipherFaults = new OwnedCipherFaults(fixture, decrypt);
        alias(receipt.origin, 'api-origin');
        alias(encodeURIComponent(receipt.origin), 'encoded-api-origin');
        alias(runId, 'run-id');
        alias(context.providerId, 'provider');
        alias(context.rootId, 'owned-root');
        for (const account of context.accounts) {
            alias(account.userId, 'user:' + account.account);
            alias(account.roleId, 'role:' + account.account);
            alias(account.orgId, 'base-org:' + account.account);
        }
        const admin = new NavigationHttpSession(receipt.origin, runId),
            viewer = new NavigationHttpSession(receipt.origin, runId),
            publicSession = new NavigationHttpSession(receipt.origin, runId);
        await admin.login('admin');
        await viewer.login('viewer');
        const compact = runId.replaceAll('-', ''),
            a = 'gh-a-' + compact,
            b = 'gh-b-' + compact,
            child = 'gh-c-' + compact,
            items = [
                { open_department_id: a, name: 'GH Parent ' + compact, order: 1 },
                { open_department_id: b, name: 'GH Other ' + compact, order: 2 }
            ];
        const defaultPlan = {
            formatVersion: 1,
            caseId: runId + ':compat',
            appId: context.clientId,
            secretSha256: sha(`synthetic-gh-secret-${compact}`),
            subject: context.subject,
            code: 'gh-synthetic-code',
            tree: { 0: items, 'gh-root': items, [a]: [{ open_department_id: child, name: 'GH Child ' + compact, order: 3 }], [b]: [], [child]: [] }
        };
        const upstream = async (patch) => {
            assert(patch && typeof patch === 'object' && !Array.isArray(patch));
            assert(Object.keys(patch).every((key) => ['mode', 'httpStatus', 'tree', 'code'].includes(key)));
            writePlan({ ...defaultPlan, ...patch, mode: patch.mode ?? undefined });
        };
        await upstream({});
        const snapshot = async () => {
            for (const intent of fixture.j.intents.toReversed()) await fixture.adopt(intent.key);
            await fixture.adoptAudits();
            return fixture.facts();
        };
        const request = async (id, session, method, route, options = {}, expectedStatus) => {
            assert(/^[a-zA-Z0-9:-]{1,100}$/.test(id));
            assert(!rawCases.some((row) => row.id === id));
            const row = { id, method, route, request: options, before: await snapshot(), result: 'pending' };
            rawCases.push(row);
            const sentAt = Date.now();
            const response = await session.request(method, route, options);
            const receivedAt = Date.now();
            row.response = { status: response.status, body: response.body, contentType: response.contentType, location: response.location, vary: response.vary, cookies: responseCookies(response.setCookie, id) };
            row.after = await snapshot();
            execution.lifetimeReceipts.push(...validateIssuedLifetimes(row, sentAt, receivedAt));
            if (expectedStatus !== undefined) assert((Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]).includes(response.status), `${group}:${id} expected ${expectedStatus}, actual ${response.status}`);
            row.result = 'pass';
            console.log(JSON.stringify({ backend, group, id, status: response.status }));
            return response;
        };
        const setPermissions = async (account, permissions) => {
            assert(['admin', 'viewer'].includes(account));
            assert(Array.isArray(permissions) && permissions.every((permission) => fixture.permissions.includes(permission)));
            const actor = context.accounts.find((row) => row.account === account),
                role = fixture.baseStore.read().roles.find((row) => row.id === actor.roleId);
            await fixture.client.query('BEGIN');
            try {
                const found = (await fixture.client.query('select role_key from poms.role where id=$1 for update', [actor.roleId])).rows;
                assert.equal(found.length, 1);
                assert.equal(found[0].role_key, role.key);
                await fixture.client.query('delete from poms.role_permission_assignment where role_id=$1', [actor.roleId]);
                for (const permission of permissions) await fixture.client.query('insert into poms.role_permission_assignment(role_id,permission_key)values($1,$2)', [actor.roleId, permission]);
                await fixture.client.query('COMMIT');
            } catch (error) {
                await fixture.client.query('ROLLBACK');
                throw error;
            }
        };
        const lockedRace = async (id, table, targetId, operations, expectedStatuses) => {
            assert(['identity_provider_config', 'external_login_ticket', 'org_sync_run'].includes(table));
            assert(fixture.j.objects.some((object) => object.table === table && object.id === targetId));
            assert(Array.isArray(operations) && operations.length === 2 && !rawCases.some((row) => row.id === id));
            for (const session of new Set(operations.map((operation) => operation.session))) {
                const account = context.accounts.find((account) => account.userId === session.userId);
                const token = session.cookies.get('poms_session');
                if (account && token) await fixture.base('session-non-due', account.account, { sessionHash: sha(token) });
            }
            const row = {
                id,
                kind: 'controlled-pg-row-lock-race',
                table,
                targetId,
                requests: operations.map((operation) => ({ method: operation.method, route: operation.route, options: operation.options ?? {} })),
                before: await snapshot(),
                waitWitnesses: [],
                result: 'pending'
            };
            rawCases.push(row);
            const pending = [];
            let transaction = false,
                settled = [];
            try {
                await fixture.client.query('BEGIN');
                transaction = true;
                await fixture.client.query("set local statement_timeout='15s'");
                const locked = await fixture.client.query(`select id::text from poms.${table} where id=$1::uuid for update`, [targetId]);
                assert.equal(locked.rowCount, 1);
                for (const [index, operation] of operations.entries()) {
                    const state = { done: false };
                    state.promise = operation.session.request(operation.method, operation.route, operation.options ?? {}).then(
                        (response) => {
                            state.done = true;
                            return { response };
                        },
                        (error) => {
                            state.done = true;
                            return { error };
                        }
                    );
                    pending.push(state);
                    const deadline = Date.now() + 6000;
                    let observed;
                    while (Date.now() < deadline) {
                        assert(!pending.some((state) => state.done), 'A race request finished before the controlled UPDATE barrier');
                        await fixture.client.query('select pg_stat_clear_snapshot()');
                        const waiting = await fixture.client.query(
                            "select pid,wait_event_type,wait_event from pg_stat_activity where datname=current_database() and usename=current_user and pid<>pg_backend_pid() and state='active' and wait_event_type='Lock' and query ilike $1 order by pid",
                            ['%update%' + table + '%']
                        );
                        if (waiting.rows.length >= index + 1) {
                            observed = waiting.rows;
                            break;
                        }
                        await new Promise((resolve) => setTimeout(resolve, 20));
                    }
                    assert(observed && observed.length === index + 1, 'Both real requests must reach their database UPDATE before release');
                    row.waitWitnesses.push({ step: index + 1, blocked: observed, observedAt: new Date().toISOString() });
                }
                assert(row.waitWitnesses[1].blocked.some((blockedRow) => blockedRow.pid === row.waitWitnesses[0].blocked[0].pid));
                await fixture.client.query('COMMIT');
                transaction = false;
            } finally {
                if (transaction) await fixture.client.query('ROLLBACK');
                settled = await Promise.all(pending.map((state) => state.promise));
                row.settledStatuses = settled.map((value) => value.response?.status ?? 'transport-error');
                execution.controlledRaceWitnesses ??= [];
                execution.controlledRaceWitnesses.push({ caseId: id, table, targetId, pidSteps: row.waitWitnesses });
                row.waitWitnesses = row.waitWitnesses.map((witness) => ({ step: witness.step, blockedUpdates: witness.blocked.length, allWaitTypeLock: witness.blocked.every((row) => row.wait_event_type === 'Lock') }));
            }
            assert(
                settled.every((value) => value.response),
                'Controlled race transport must settle successfully'
            );
            const responses = settled.map((value) => value.response);
            row.responses = responses.map((response) => ({
                status: response.status,
                body: response.body,
                contentType: response.contentType,
                location: response.location,
                vary: response.vary,
                cookieNames: response.setCookie.map((cookie) => cookie.slice(0, cookie.indexOf('=')))
            }));
            row.after = await snapshot();
            row.statuses = responses.map((response) => response.status).sort((a, b) => a - b);
            assert.deepEqual(
                row.statuses,
                [...expectedStatuses].sort((a, b) => a - b)
            );
            row.result = 'pass';
            console.log(JSON.stringify({ backend, group, id, statuses: row.statuses, realBlockedUpdates: row.waitWitnesses[1].blockedUpdates }));
            return responses;
        };
        const c = {
            backend,
            fixture,
            context,
            admin,
            viewer,
            publicSession,
            request,
            alias,
            upstream,
            setPermissions,
            lockedRace,
            withCipherFaults: (descriptors, action) => cipherFaults.withFaults(descriptors, action),
            freshSession: () => new NavigationHttpSession(receipt.origin, runId),
            caseNote: (key, value) => {
                assert(!Object.hasOwn(execution.notes, key));
                execution.notes[key] = value;
            }
        };
        await (group === 'G' ? runG(c) : group === 'H' ? runH(c) : runGBadCipher(c));
        const final = await snapshot();
        rawCases.push({ id: 'final-pg-facts', facts: final, result: 'pass' });
        execution.result = 'pass';
    } catch (error) {
        execution.result = 'fail';
        execution.error = { type: error.name, ...(error.name === 'AssertionError' ? { assertion: error.message.slice(0, 1500) } : { message: String(error.message).slice(0, 300) }) };
        process.exitCode = 1;
    } finally {
        if (fixture) {
            try {
                await fixture.adoptAudits();
                const allAudits = rawCases.flatMap((row) => [...(row.before?.audit_log ?? []), ...(row.after?.audit_log ?? []), ...(row.facts?.audit_log ?? [])]),
                    seen = new Set(),
                    auditCounts = new Map();
                for (const audit of allAudits) {
                    if (seen.has(audit.id)) continue;
                    seen.add(audit.id);
                    const key = audit.event_type + ':' + (aliases.get(audit.target_id) ?? audit.target_id),
                        count = (auditCounts.get(key) ?? 0) + 1;
                    auditCounts.set(key, count);
                    alias(audit.id, 'audit:' + key + ':' + count);
                }
                execution.orderingReceipts = [];
                for (const row of rawCases) {
                    if (row.method !== 'GET' || !/^\/api\/platform\/org-sync-runs\/[^/]+\/diff-items(?:\?|$)/.test(row.route ?? '') || !Array.isArray(row.response?.body)) continue;
                    const facts = new Map((row.after?.org_sync_diff_item ?? []).map(item => [item.id, item]));
                    const tieGroups = [];
                    const actualOrder = [];
                    let previous;
                    for (const item of row.response.body) {
                        const fact = facts.get(item.id);
                        assert(fact && typeof fact.created_at === 'string', 'Every listed diff must match its exact owned PG row');
                        const ms = Date.parse(fact.created_at);
                        assert(Number.isSafeInteger(ms));
                        const fraction = /\.(\d+)/.exec(fact.created_at)?.[1] ?? '';
                        const micros = BigInt(ms) * 1000n + BigInt(fraction.padEnd(6, '0').slice(3, 6));
                        const wireMicros = BigInt(Date.parse(item.createdAt)) * 1000n;
                        assert(wireMicros <= micros && micros < wireMicros + 1000n, 'Wire milliseconds must project the actual PG timestamp');
                        assert(previous === undefined || previous <= micros, 'Original diff-list contract orders created_at ASC');
                        actualOrder.push({ id: item.id, wireCreatedAt: item.createdAt, pgCreatedAt: fact.created_at, pgEpochMicros: micros.toString() });
                        if (!tieGroups.length || tieGroups.at(-1).micros !== micros) tieGroups.push({ micros, items: [] });
                        tieGroups.at(-1).items.push(item);
                        previous = micros;
                    }
                    execution.orderingReceipts.push({ caseId: row.id, rule: 'created_at ASC only; no UUID tie-breaker', actualOrder, exactPgTimestampTieSizes: tieGroups.map(group => group.items.length), verified: true });
                    row.response.body = tieGroups.flatMap(group => group.items.toSorted((left, right) => (aliases.get(left.id) ?? left.id).localeCompare(aliases.get(right.id) ?? right.id)));
                    row.responseOrderContract = { rule: 'created_at ASC', verified: true, onlyExactPgTimestampTiesCanonicalized: true };
                }
                execution.cases = normalize(rawCases);
                execution.notes = normalize(execution.notes, '', ['notes']);
                execution.cipherFaultReceipts = cipherFaults.receipts;
                execution.aliasCount = aliases.size;
            } catch (error) {
                execution.evidenceError = { type: error.name, assertion: error.name === 'AssertionError' ? error.message : undefined };
                execution.result = 'fail';
                process.exitCode = 1;
            }
            try {
                execution.cleanup.push(await fixture.cleanup());
                execution.cleanup.push(await fixture.cleanup());
                assert.equal(execution.cleanup[1].zero, true);
            } catch (error) {
                execution.cleanupError = { type: error.name, assertion: error.name === 'AssertionError' ? error.message : undefined };
                execution.result = 'fail';
                process.exitCode = 1;
            } finally {
                await fixture.close();
            }
        }
        writePlan({ formatVersion: 1, caseId: 'idle' });
        execution.finishedAt = new Date().toISOString();
    }
    return execution;
}
try {
    for (const group of groups) for (const backend of ['nest', 'rust']) await execute(backend, group);
    for (const group of groups) {
        const original = report.executions.find((row) => row.group === group && row.backend === 'nest'),
            candidate = report.executions.find((row) => row.group === group && row.backend === 'rust'),
            comparison = { group, result: 'pending', cases: original.cases.length, mismatches: [], acceptedCookieSecondRounding: [] };
        report.comparisons.push(comparison);
        for (const expected of original.cases) {
            const actual = candidate.cases.find((row) => row.id === expected.id),
                comparable = actual === undefined ? undefined : JSON.parse(JSON.stringify(actual));
            for (const [index, cookie] of (expected.response?.cookies ?? []).entries()) {
                const actualCookie = comparable?.response?.cookies?.[index];
                if (actualCookie?.name !== cookie.name) continue;
                const expectedIndex = cookie.attributes.findIndex((attribute) => /^max-age=/i.test(attribute)),
                    actualIndex = actualCookie.attributes.findIndex((attribute) => /^max-age=/i.test(attribute));
                if (expectedIndex < 0 || actualIndex < 0) continue;
                const expectedAge = Number(cookie.attributes[expectedIndex].slice(8)),
                    actualAge = Number(actualCookie.attributes[actualIndex].slice(8));
                if (expectedAge !== actualAge && Number.isSafeInteger(expectedAge) && Number.isSafeInteger(actualAge) && expectedAge > 0 && actualAge > 0 && Math.abs(expectedAge - actualAge) <= 1) {
                    comparison.acceptedCookieSecondRounding.push({ caseId: expected.id, cookie: cookie.name, originalMaxAge: expectedAge, candidateMaxAge: actualAge, maxDifferenceSeconds: 1, individualExpiresTimingVerified: true });
                    actualCookie.attributes[actualIndex] = cookie.attributes[expectedIndex];
                }
            }
            try {
                assert.deepEqual(comparable, expected);
            } catch (error) {
                comparison.mismatches.push({ id: expected.id, original: expected, candidate: actual, assertion: error.message.slice(0, 2500) });
            }
        }
        try {
            assert.deepEqual(candidate.notes, original.notes);
        } catch (error) {
            comparison.mismatches.push({ id: 'case-notes', original: original.notes, candidate: candidate.notes, assertion: error.message.slice(0, 2500) });
        }
        comparison.result = original.result !== 'pass' || candidate.result !== 'pass' ? 'blocked-by-failed-execution' : comparison.mismatches.length ? 'fail' : 'pass';
    }
    report.result = report.executions.every((row) => row.result === 'pass') && report.comparisons.every((row) => row.result === 'pass') ? 'pass' : 'fail';
} finally {
    report.finishedAt = new Date().toISOString();
    report.sourceFiles = ['tools/rust-r2gh/compat-acceptance.mjs', 'tools/rust-r2gh/owned-fixture.mjs', 'tools/rust-r2gh/g-http-cases.mjs', 'tools/rust-r2gh/h-http-cases.mjs'].map((file) => ({ file, rawBytesSha256: sha(readFileSync(file)) }));
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(
        JSON.stringify({
            result: report.result,
            out,
            executions: report.executions.map((row) => ({ backend: row.backend, group: row.group, result: row.result, cases: row.cases.length, error: row.error, cleanupError: row.cleanupError })),
            comparisons: report.comparisons.map((row) => ({ group: row.group, result: row.result, mismatchCases: row.mismatches.map((row) => row.id) }))
        })
    );
    if (report.result !== 'pass') process.exitCode = 1;
}
