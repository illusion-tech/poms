// Read-only admission for the real SQL barrier. It never sends cancellation.
import assert from 'node:assert/strict';
import { classifySnapshotStatement } from './l-snapshot-sql-barrier.mjs';
export function pgQueryStartedAfter(value, startedAt) {
    // pg decodes timestamptz to Date. Date.parse(Date) stringifies it with
    // second precision; getTime preserves the actual millisecond sample.
    const queryTime = value instanceof Date ? value.getTime() : Date.parse(value);
    const start = Date.parse(startedAt); assert(Number.isFinite(queryTime) && Number.isFinite(start));
    return queryTime >= start;
}

export function admitNativeSnapshotWaiters({ native, runId, caseId, waiting, trace, requireFinishedFinalInsert = false }) {
    const report = native.report(); assert.equal(report.originalNativeProducerOrRuntime, true);
    assert.equal(report.pgCaptureComplete, true);
    assert.equal(report.sqlObserver?.backendPidSource, 'original pg Client.processID read separately for each actual query');
    const queries = native.sql.filter(row => row.context?.runId === runId && row.context?.caseId === caseId);
    const pending = queries.filter(row => row.phase === 'start' && row.command === trace.command && row.relations.includes(trace.table)
        && !queries.some(other => other.queryId === row.queryId && ['end', 'error'].includes(other.phase)));
    assert.equal(pending.length, waiting.length, 'Every blocked original query must have a live admitted case/PID witness');
    for (const row of waiting) {
        assert.equal(row.application_name, '');
        assert(classifySnapshotStatement(row.query, trace.table, trace.command));
        assert.equal(pending.filter(query => query.backendPid === row.pid).length, 1);
        assert(pgQueryStartedAfter(row.query_start, trace.commandStartedAt));
    }
    const finishedFinalInserts = queries.filter(row => row.command === 'INSERT' && row.relations.includes('commission_final_settlement_snapshot') && row.phase === 'end' && row.rowCount === 1);
    if (requireFinishedFinalInsert) {
        assert(finishedFinalInserts.length > 0, 'Late failure requires actual completed FinalSettlement INSERT, not merely query start');
        assert(finishedFinalInserts.every(row => row.sequence < Math.min(...pending.map(query => query.sequence))));
    }
    return { kind: 'original-Native-admitted-case-query-pg-Client-processID', runId, caseId,
        backendPids: waiting.map(row => row.pid), nativeProcessId: report.processId, sqlObserver: report.sqlObserver,
        pendingQueries: pending.map(({ queryId, backendPid, sqlSha256, context, at, sequence }) => ({ queryId, backendPid, sqlSha256, context, at, sequence })),
        completedFinalInserts: finishedFinalInserts.map(({ queryId, backendPid, sqlSha256, rowCount, at, sequence }) => ({ queryId, backendPid, sqlSha256, rowCount, at, sequence })) };
}

export async function admitRustSnapshotWaiters({ observer, runtimeReport, runId, caseId, waiting, trace }) {
    const physical = await observer.admit(runtimeReport);
    assert.equal(physical.kind, 'owned-proc-socket-original-BackendKeyData-hard-binding');
    for (const row of waiting) {
        assert.equal(row.application_name, 'poms-api-rust');
        assert(classifySnapshotStatement(row.query, trace.table, trace.command));
        assert(pgQueryStartedAfter(row.query_start, trace.commandStartedAt));
        assert.equal(physical.backendProofs.filter(proof => proof.backendPid === row.pid).length, 1,
            'Waiting PostgreSQL PID must be the original BackendKeyData of an actually owned Rust socket');
    }
    return { kind: 'owned-Rust-process-sockets-original-BackendKeyData-shared-case-PID-set', runId, caseId,
        backendPids: waiting.map(row => row.pid), physical,
        requestToIndividualPoolPidClaimed: false,
        priorFinalInsertObservation: { independentRustSqlStatementCompletionObserved: false,
            basis: 'Exact compiled store awaits the earlier FinalSettlement write before issuing the now actually waiting Rule statement. This is source/control-flow inference, not an independent SQLx INSERT wire trace.' },
        boundary: 'Only this preplanned shared case may issue the one/two business requests in the barrier window. It does not invent a per-caller PID mapping or SQLx wire statement trace.' };
}
