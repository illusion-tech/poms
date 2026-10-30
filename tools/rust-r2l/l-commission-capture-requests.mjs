// SOURCE-only shared-case capture for the later commission edge epoch.
// The original d7 default114 driver is deliberately not edited by this file.
// No request, SQL, runtime, observer install or owner process runs on import.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { caseIdentity } from './fixture-core.mjs';

const snapshotTables = Object.freeze(['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']);
const sha = value => createHash('sha256').update(value).digest('hex');

export function validateCommissionCaptureRequests(requests, watch) {
    assert(Array.isArray(requests) && [1, 2].includes(requests.length));
    assert(Array.isArray(watch) && [0, 2].includes(watch.length), 'Declare zero or the exact two snapshot intents');
    assert.equal(new Set(requests.map(item => item.session)).size, requests.length,
        'Concurrent requests require different in-memory sessions; origin/identity are mutable');
    for (const item of requests) {
        assert(item.session && typeof item.session.request === 'function' && typeof item.session.userId === 'string');
        assert.equal(item.method, 'POST');
        assert(/^\/api\/approval-records\/[^/?]+:approve$/.test(item.route), 'This capture is limited to the existing L approval operation');
        assert(item.options && Object.keys(item.options).every(key => key === 'json') && Object.hasOwn(item.options, 'json'));
        assert(item.options.json && typeof item.options.json === 'object' && !Array.isArray(item.options.json));
    }
    if (watch.length) {
        assert.deepEqual(watch.map(([table]) => table).sort(), [...snapshotTables].sort());
        for (const [, selector] of watch) {
            assert.deepEqual(Object.keys(selector).sort(), ['created_by', 'project_id']);
            assert(requests.every(item => item.session.userId === selector.created_by));
        }
        assert.equal(watch[0][1].project_id, watch[1][1].project_id);
    }
    return { requestCount: requests.length, expectedSnapshotTables: [...snapshotTables], snapshotIntentsDeclared: watch.length === 2 };
}

// Every dependency is the current driver closure, rather than a second SDK,
// fixture, database connection or independent ownership journal.
export function createCommissionRequestCapture({
    fixture: f, native, pg, rustRuntime, runId, backend, consumerBackend,
    contexts, committed, report, raw, scope, facts, certify, save,
    requestByteEvidence, redacted, lease,
}) {
    for (const fn of [scope, facts, certify, save, requestByteEvidence, redacted]) assert.equal(typeof fn, 'function');
    assert(f && native && pg && contexts instanceof Map && Array.isArray(committed) && lease && typeof lease.active === 'boolean');
    assert(['nest', 'rust'].includes(backend) && ['native', 'rust'].includes(consumerBackend));
    if (consumerBackend === 'rust') assert(rustRuntime);

    return async function captureRequests({ name, requests, watch = [], run }) {
        const plan = validateCommissionCaptureRequests(requests, watch);
        // Snapshot the actual JSON once; a barrier callback cannot change a
        // caller's body between durable preregistration and wire dispatch.
        requests = requests.map(item => ({ ...item, options: { json: JSON.parse(JSON.stringify(item.options.json)) } }));
        assert.equal(typeof run, 'function');
        assert.equal(lease.active, false, 'A normal call or a second capture must not interleave this SDK cursor/shared PG case');
        lease.active = true;
        let batch, privateBatch;
        const pending = [], responses = [], dispatched = new Set();
        try {
            const selectedScope = scope(name), identity = caseIdentity(runId, name), baseIndex = report.requests.length;
            const op = consumerBackend === 'rust' ? 'l.http' : 'l.producer';
            const intents = [];
            const all = [['audit_log', { request_id: selectedScope.requestId }], ['security_event', { request_id: selectedScope.requestId }], ...watch];
            for (const [table, selector] of all) intents.push(await f.intent(table, selector, { caseId: name }));
            const from = committed.length, sqlStart = native.sql.length, before = await facts();
            const bindings = requests.map((request, offset) => ({
                offset, index: baseIndex + offset, correlationId: 'l-commission-batch-' + randomUUID(),
                context: { runId, caseId: name, index: baseIndex + offset, op },
                userId: request.session.userId, route: request.route, method: request.method,
            }));
            // Register every actual request context before acquiring any lock.
            // The Native ALS observer therefore sees both requests, including
            // each pending SQL and its independently sampled pg Client PID.
            for (const binding of bindings) {
                assert(!contexts.has(binding.correlationId)); contexts.set(binding.correlationId, binding.context);
            }
            const startedAt = new Date().toISOString();
            privateBatch = { name, startedAt, executionBackend: consumerBackend, plan, bindings, intents, before,
                committedCursor: from, sqlStart, certification: { state: 'pending' }, requests: [] };
            batch = { name, startedAt, executionBackend: consumerBackend, plan, bindings, sqlStart,
                before: redacted(before), certificates: { state: 'pending' },
                attribution: 'Certificates are for this shared case. No invented per-caller SQLx PID or PG event attribution.' };
            raw.captureBatches ??= []; raw.captureBatches.push(privateBatch);
            report.captureBatches ??= []; report.captureBatches.push(batch);
            const pairs = requests.map((request, offset) => {
                const binding = bindings[offset], privateRequest = {
                    name: name + '.request-' + offset, executionBackend: consumerBackend, method: request.method, route: request.route,
                    context: binding.context, correlationId: binding.correlationId, captureBatch: name,
                    requestBody: requestByteEvidence(request.options.json), dispatch: 'planned', certification: { state: 'pending' },
                };
                const publicRequest = { name: privateRequest.name, executionBackend: consumerBackend, method: request.method, path: request.route,
                    captureBatch: name, request: { body: redacted(request.options.json) }, dispatch: 'planned', certificates: { state: 'pending' } };
                raw.requests.push(privateRequest); privateBatch.requests.push(privateRequest);
                report.requests.push(publicRequest); return { privateRequest, publicRequest };
            });
            save();
            // beginCase performs its quiet/context/catalog checks exactly once,
            // while no barrier locker transaction exists yet.
            await pg.beginCase({ caseId: name, index: baseIndex, op });
            privateBatch.pgCaseOpenedAt = batch.pgCaseOpenedAt = new Date().toISOString(); save();
            const send = offset => {
                assert(Number.isInteger(offset) && offset >= 0 && offset < requests.length);
                assert(!dispatched.has(offset), 'An actual request may be dispatched once'); dispatched.add(offset);
                const request = requests[offset], binding = bindings[offset], { privateRequest, publicRequest } = pairs[offset];
                const promise = (async () => {
                    const session = request.session, originalOrigin = session.origin, originalIdentity = session.identity;
                    session.origin = consumerBackend === 'rust' ? rustRuntime.origin : native.origin; session.identity = identity;
                    try {
                        privateRequest.startedAt = publicRequest.startedAt = new Date().toISOString();
                        privateRequest.dispatch = publicRequest.dispatch = 'started'; save();
                        const response = await session.request(request.method, request.route, {
                            ...request.options, requestId: selectedScope.requestId, correlationId: binding.correlationId,
                        });
                        responses[offset] = response;
                        const finishedAt = new Date().toISOString();
                        Object.assign(privateRequest, { httpFinishedAt: finishedAt, dispatch: 'response-durable', response: {
                            status: response.status, contentType: response.contentType, bodyBytesBase64: response.bodyBytes.toString('base64'),
                            setCookie: response.setCookie, parseError: response.parseError,
                        } });
                        Object.assign(publicRequest, { httpFinishedAt: finishedAt, dispatch: 'response-durable', response: {
                            status: response.status, contentType: response.contentType, body: redacted(response.body),
                            wireBodyBytes: response.bodyBytes.length, wireBodySha256: sha(response.bodyBytes),
                            exactBytesRetainedPrivately: true, parseError: response.parseError,
                        } });
                        // Durable raw bytes precede all PG/SDK drain, ownership
                        // admission, expected-status checks and barrier return.
                        save(); return response;
                    } catch (error) {
                        privateRequest.failure = { name: error.name, message: error.message, stack: error.stack };
                        publicRequest.failure = { name: error.name, detailsRetainedPrivately: true }; save(); throw error;
                    } finally { session.origin = originalOrigin; session.identity = originalIdentity; }
                })();
                // Immediate rejection handler prevents a second request or lock
                // failure from leaving the first promise unobserved.
                pending.push(promise.then(value => ({ value }), error => ({ error }))); return promise;
            };
            const outcome = await run({ send, bindings, context: { runId, caseId: name, index: baseIndex, op },
                before, sqlStart, committedCursor: from, intents, pgCaseOpenedBeforeLocker: true });
            const completed = await Promise.all(pending);
            for (const item of completed) if (item.error) throw item.error;
            assert.equal(dispatched.size, requests.length, 'Every preregistered request must actually be sent');
            assert.equal(responses.length, requests.length);
            if (outcome?.responses) assert(outcome.responses.every((response, index) => response === responses[index]));
            await native.witness.drain(); native.witness.assertComplete();
            const pgRows = await pg.drainCase(); privateBatch.pgRows = pgRows; save();
            const actualCreates = consumerBackend === 'rust' ? pgRows : committed.slice(from);
            for (const item of actualCreates.filter(item => snapshotTables.includes(item.table))) {
                assert(pgRows.some(other => other.table === item.table && other.id === item.id), 'Every actual snapshot needs its independent PG7 certificate');
            }
            const snapshotCounts = Object.fromEntries(snapshotTables.map(table => [table, actualCreates.filter(item => item.table === table).length]));
            assert.equal(snapshotCounts[snapshotTables[0]], snapshotCounts[snapshotTables[1]], 'A committed snapshot pair must remain complete');
            const successes = responses.filter(response => response.status === 200).length;
            assert.equal(snapshotCounts[snapshotTables[0]], plan.snapshotIntentsDeclared ? successes : 0,
                'Only actual successful final/retention approval responses may produce the declared pairs');
            const certificates = await certify(from, intents, name, pgRows, false, true, consumerBackend);
            if (snapshotCounts[snapshotTables[0]]) report.pg7SnapshotPositiveRequests.push({ caseId: name, executionBackend: consumerBackend,
                sharedCase: true, successfulRequests: successes, proofSource: consumerBackend === 'rust' ? 'actual-PG-insert-and-outer-commit' : 'original-SDK-matched-PG-shadow',
                snapshots: actualCreates.filter(item => snapshotTables.includes(item.table)).map(({ table, id }) => ({ table, id })) });
            const after = await facts(), finishedAt = new Date().toISOString();
            Object.assign(privateBatch, { after, finishedAt, sqlEnd: native.sql.length, certificates, snapshotCounts,
                certification: { state: 'complete' }, barrier: outcome?.trace ?? null });
            Object.assign(batch, { after: redacted(after), finishedAt, sqlEnd: native.sql.length, certificates, snapshotCounts,
                barrier: redacted(outcome?.trace ?? null), statuses: responses.map(response => response.status) });
            for (const { privateRequest, publicRequest } of pairs) {
                privateRequest.certification = { state: 'complete', sharedCase: name, perCallerPgEventAttributionClaimed: false };
                publicRequest.certificates = { state: 'complete', sharedCase: name, perCallerPgEventAttributionClaimed: false };
            }
            save(); return { responses, trace: outcome?.trace ?? null, before, after, certificates, snapshotCounts, bindings, caseId: name };
        } catch (error) {
            if (privateBatch) privateBatch.failure = { name: error.name, message: error.message, stack: error.stack };
            if (batch) batch.failure = { name: error.name, detailsRetainedPrivately: true };
            save(); throw error;
        } finally {
            await Promise.allSettled(pending); lease.active = false;
            // On failure preserve the actual PG active case and durable rows;
            // the outer owner must use its existing Partial/recovery closeout.
            // This factory neither invents a certificate nor clears context.
        }
    };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url && process.argv.includes('--check')) {
    const actor = '00000000-0000-4000-8000-000000000014', project = '11111111-1111-4111-8111-111111111111';
    const session = () => ({ userId: actor, request() { assert.fail('A pure plan check must never send HTTP'); } });
    const first = session(), second = session();
    const item = value => ({ session: value, method: 'POST', route: '/api/approval-records/synthetic:approve', options: { json: { expectedVersion: 1 } } });
    const watch = snapshotTables.map(table => [table, { project_id: project, created_by: actor }]);
    assert.equal(validateCommissionCaptureRequests([item(first)], []).requestCount, 1);
    assert.equal(validateCommissionCaptureRequests([item(first), item(second)], watch).requestCount, 2);
    const rejects = [
        () => validateCommissionCaptureRequests([item(first), item(first)], watch),
        () => validateCommissionCaptureRequests([{ ...item(first), route: '/api/commission-payouts/synthetic:submitApproval' }], watch),
        () => validateCommissionCaptureRequests([item(first)], watch.slice(0, 1)),
        () => validateCommissionCaptureRequests([item(first)], watch.map(([table, selector]) => [table, { ...selector, status: 'active' }])),
        () => validateCommissionCaptureRequests([item(first)], watch.map(([table, selector]) => [table, { ...selector, created_by: project }])),
        () => validateCommissionCaptureRequests([{ ...item(first), options: { json: {}, rawHeaders: [] } }], []),
        () => validateCommissionCaptureRequests([{ ...item(first), method: 'GET' }], []),
    ];
    for (const reject of rejects) assert.throws(reject);
    console.log(JSON.stringify({ kind: 'pure-commission-shared-case-plan-check', positive: 2, rejected: rejects.length,
        SQLExecuted: false, HTTPExecuted: false, NativeStarted: false, PostgreSQLExecuted: false, runtimeAcceptanceClaimed: false }));
}
