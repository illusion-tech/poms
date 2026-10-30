// Validation only: real PostgreSQL locks and cancellation of the one request
// proven to be waiting on this fixture's lock. No service or schema mutation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { verifyConnection } from './fixture-guard.mjs';
import { ident } from './catalog-complete.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const allowed = ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'];
const sha = value => createHash('sha256').update(value).digest('hex');

export function classifySnapshotStatement(query, table, command) {
    assert(allowed.includes(table));
    assert(['INSERT', 'UPDATE'].includes(command));
    if (typeof query !== 'string') return false;
    const start = query.replaceAll('"', '').trimStart().toLowerCase();
    const prefix = command === 'INSERT' ? 'insert into poms.' : 'update poms.';
    return start.startsWith(prefix + table) && /[\s(]/.test(start[prefix.length + table.length] ?? '');
}

export async function withSnapshotSqlBarrier(f, {
    caseId, table, rowIds = null, command, waiters = 1, action = 'release', backend,
    send, admitWaiters, onBarrier = async () => undefined,
}) {
    assert(allowed.includes(table));
    assert(['INSERT', 'UPDATE'].includes(command));
    assert([1, 2].includes(waiters));
    assert(['nest', 'rust'].includes(backend));
    assert(['release', 'cancel'].includes(action));
    assert(action !== 'cancel' || waiters === 1, 'Cancellation must name exactly one waiting request');
    assert(typeof send === 'function' && typeof admitWaiters === 'function' && typeof onBarrier === 'function');
    if (rowIds !== null) {
        assert(command === 'UPDATE' && rowIds.length > 0);
        for (const id of rowIds) assert(f.j.objects.some(row => row.table === table && row.id === id && row.creationProof));
    }
    const connection = f.client.connectionParameters;
    assert.equal(connection.host, '127.0.0.1');
    assert.equal(connection.port, 19432);
    assert.equal(connection.database, 'poms_r2l_' + f.backend);
    assert.equal(connection.user, 'poms_r2l_app');
    const config = { host: connection.host, port: connection.port, database: connection.database,
        user: connection.user, password: connection.password, connectionTimeoutMillis: 5000, query_timeout: 15000 };
    const locker = new Client({ ...config, application_name: 'poms-r2l-owned-snapshot-locker' });
    const reader = new Client({ ...config, application_name: 'poms-r2l-snapshot-barrier-observer' });
    const trace = { kind: 'real-owned-snapshot-SQL-lock-barrier', caseId, table, command,
        rowIds, expectedWaiters: waiters, action, backend, startedAt: new Date().toISOString(), result: 'pending' };
    let connectedLocker = false, connectedReader = false, held = false, pending = [];
    f.j.snapshotBarrierAttempts ??= []; f.j.snapshotBarrierAttempts.push(trace); f.save();
    try {
        await locker.connect(); connectedLocker = true; await verifyConnection(locker, connection.database);
        await reader.connect(); connectedReader = true; await verifyConnection(reader, connection.database);
        const lockerPid = Number((await locker.query('select pg_backend_pid() as pid')).rows[0].pid);
        const readerPid = Number((await reader.query('select pg_backend_pid() as pid')).rows[0].pid);
        assert(lockerPid !== readerPid); trace.fixtureLockerPid = lockerPid;
        await locker.query('begin'); held = true;
        if (rowIds === null) await locker.query('lock table poms.' + ident(table) + ' in share mode');
        else {
            const locked = await locker.query('select id::text from poms.' + ident(table) + ' where id=any($1::uuid[]) order by id for update', [rowIds]);
            assert.deepEqual(locked.rows.map(row => row.id).sort(), [...rowIds].sort());
        }
        trace.commandStartedAt = new Date().toISOString();
        pending = Array.from({ length: waiters }, (_, index) => Promise.resolve().then(() => send(index)));
        // Attach handlers immediately. A request failing before reaching SQL
        // remains a failed barrier and is still awaited during closeout.
        const outcomes = pending.map(promise => promise.then(value => ({ value }), error => ({ error })));
        let witnesses;
        for (let attempt = 0; attempt < 240; attempt++) {
            const rows = (await reader.query(`select pid, backend_start, backend_start::text as backend_start_text,
                xact_start, query_start, query_start::text as query_start_text, application_name,
                client_addr::text as client_addr, client_port,
                wait_event_type, wait_event, pg_blocking_pids(pid) as blockers, query
                from pg_stat_activity where datname=current_database() and usename=current_user
                and pid<>all($1::int[]) and wait_event_type='Lock' order by pid`, [[lockerPid, readerPid]])).rows;
            const reachesLocker = (row, seen = new Set()) => {
                if (row.blockers.includes(lockerPid)) return true;
                if (seen.has(row.pid)) return false; seen.add(row.pid);
                return row.blockers.some(pid => { const parent = rows.find(entry => entry.pid === pid); return parent && reachesLocker(parent, seen); });
            };
            const relevant = rows.filter(row => classifySnapshotStatement(row.query, table, command) && reachesLocker(row));
            if (relevant.length === waiters) {
                assert(relevant.every(row => backend === 'rust' ? row.application_name === 'poms-api-rust' : row.application_name === ''));
                witnesses = relevant; break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert(witnesses, 'Actual snapshot SQL did not reach the fixture-owned lock barrier');
        trace.barrier = { actualWaitingStatements: witnesses.length, allBlockerChainsReachFixture: true,
            ownedCommandVerified: false, observedAt: new Date().toISOString(), waiting: witnesses.map(({ query, ...row }) => ({ ...row, queryBytes: Buffer.byteLength(query), querySha256: sha(query) })) };
        f.save();
        trace.commandOwnershipProof = await admitWaiters(witnesses, trace);
        assert.equal(trace.commandOwnershipProof?.caseId, caseId);
        assert.deepEqual([...trace.commandOwnershipProof.backendPids].sort(), witnesses.map(row => row.pid).sort());
        trace.barrier.ownedCommandVerified = true; f.save(); await onBarrier(trace);
        let completed;
        if (action === 'cancel') {
            const expected = witnesses[0];
            const result = await reader.query(`select pg_cancel_backend(pid) as cancelled from pg_stat_activity
                where pid=$1 and backend_start::text=$2 and query_start::text=$3 and query=$4
                and datname=current_database() and usename=current_user and application_name=$5
                and wait_event_type='Lock' and $6=any(pg_blocking_pids(pid))
                and client_port=$7 and client_addr::text=$8`,
            [expected.pid, expected.backend_start_text, expected.query_start_text, expected.query, expected.application_name, lockerPid, expected.client_port, expected.client_addr]);
            assert.equal(result.rows.length, 1, 'Exact request and its owned lock must still match at cancellation');
            assert.equal(result.rows[0].cancelled, true);
            trace.cancellation = { pid: expected.pid, backendStart: expected.backend_start, requestQuerySha256: sha(expected.query),
                actualPgCancelBackendReturned: true, terminatedBackend: false, cancelledAt: new Date().toISOString() };
            // Keep the actual SQL blocked until cancellation has completed.
            // Releasing first could let the operation win the lock before the
            // server processes SIGINT, producing a false injection claim.
            let deadline;
            try {
                completed = await Promise.race([Promise.all(outcomes), new Promise((_, reject) => {
                    deadline = setTimeout(() => reject(new Error('Cancelled owned HTTP response deadline while lock remains held')), 15000);
                })]);
            } finally { clearTimeout(deadline); }
            for (const result of completed) if (result.error) throw result.error;
            assert(completed.every(result => result.value.status === 500), 'Cancellation must produce the actual failed HTTP response before releasing the fixture lock');
            const ended = (await reader.query(`select pid,backend_start::text as backend_start_text,state,xact_start
                from pg_stat_activity where pid=$1 and datname=current_database() and usename=current_user`, [expected.pid])).rows;
            assert(ended.length <= 1);
            if (ended.length) {
                assert.equal(ended[0].backend_start_text, expected.backend_start_text);
                assert.equal(ended[0].xact_start, null, 'The failed request must finish its actual outer transaction before releasing the lock');
                assert.equal(ended[0].state, 'idle');
            }
            trace.cancellation.settledWhileLockHeld = { observedAt: new Date().toISOString(), statuses: completed.map(result => result.value.status),
                backendEnded: ended.length === 0, backend: ended[0] ?? null, outerTransactionStillActive: false };
            f.save();
        }
        await locker.query('rollback'); held = false; trace.lockReleasedAt = new Date().toISOString();
        completed ??= await Promise.all(outcomes);
        for (const result of completed) if (result.error) throw result.error;
        const responses = completed.map(result => result.value);
        trace.statuses = responses.map(response => response.status); trace.result = 'observed';
        trace.finishedAt = new Date().toISOString(); f.save(); return { responses, trace };
    } catch (error) {
        trace.result = 'fail'; trace.failure = { name: error.name, message: error.message }; f.save(); throw error;
    } finally {
        trace.closeout = [];
        for (const [name, close] of [
            ['lock-rollback', async () => { if (held) await locker.query('rollback'); }],
            ['all-request-promises-settled', async () => { await Promise.allSettled(pending); }],
            ['reader-close', async () => { if (connectedReader) await reader.end(); }],
            ['locker-close', async () => { if (connectedLocker) await locker.end(); }],
        ]) {
            try { await close(); trace.closeout.push({ name, result: 'pass' }); }
            catch (error) { trace.closeout.push({ name, result: 'fail', failure: { name: error.name, message: error.message } }); }
        }
        f.save(); assert(trace.closeout.every(row => row.result === 'pass'), 'Snapshot barrier closeout incomplete');
    }
}
