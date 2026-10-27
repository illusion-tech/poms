import assert from 'node:assert/strict';

// A successful HTTP response alone cannot establish complete SQL evidence.
// Match query lifetimes first, then transactions independently per connection.
export function analyzeSql(events, { requireComplete = true } = {}) {
    const queries = new Map();
    const barriers = new Map();
    let previous = 0;
    for (const row of events) {
        assert(Number.isInteger(row.sequence) && row.sequence > previous, 'SQL event sequence is not strictly increasing');
        previous = row.sequence;
        assert(Number.isInteger(row.queryId) && row.queryId > 0 && Number.isInteger(row.connection) && row.connection > 0, 'Invalid SQL event identity');
        assert(['start', 'end', 'error', 'barrier-hit', 'barrier-release', 'unsupported', 'barrier-error', 'barrier-timeout'].includes(row.phase), 'Unknown SQL event phase');
        assert(row.captureIncomplete === false && row.phase !== 'unsupported' && !['barrier-error', 'barrier-timeout'].includes(row.phase), 'SQL capture is incomplete');
        if (['barrier-hit', 'barrier-release'].includes(row.phase)) {
            assert(typeof row.barrierId === 'string' && /^[a-z0-9-]{1,80}$/.test(row.barrierId), 'Invalid barrier event identity');
            const key = `${row.queryId}:${row.barrierId}`;
            const events = barriers.get(key) ?? [];
            events.push(row);
            barriers.set(key, events);
        }
        if (!['start', 'end', 'error'].includes(row.phase)) continue;
        const query = queries.get(row.queryId) ?? [];
        query.push(row);
        queries.set(row.queryId, query);
    }
    const completed = [];
    const pendingQueries = [];
    for (const [queryId, rows] of queries) {
        if (rows.length === 1 && rows[0].phase === 'start') { pendingQueries.push(queryId); continue; }
        assert.equal(rows.length, 2, 'A query must have one start and one terminal event');
        assert.equal(rows[0].phase, 'start', 'SQL terminal without start');
        assert(['end', 'error'].includes(rows[1].phase), 'SQL terminal must be end/error');
        for (const key of ['connection', 'command', 'statement', 'sqlShape', 'sqlSha256', 'parameterCount']) assert.deepEqual(rows[0][key], rows[1][key], `SQL start/end mismatch: ${key}`);
        completed.push({ ...rows[1], startedSequence: rows[0].sequence, startedAt: rows[0].at });
    }
    if (requireComplete) assert.equal(pendingQueries.length, 0, 'SQL query has no terminal event');
    const pendingBarriers = [];
    for (const [key, rows] of barriers) {
        assert.equal(rows[0].phase, 'barrier-hit', 'Barrier release without a hit');
        if (rows.length === 1) { pendingBarriers.push(key); continue; }
        assert.equal(rows.length, 2, 'Barrier must have one hit and release');
        assert.equal(rows[1].phase, 'barrier-release', 'Barrier has no successful release');
        for (const field of ['connection', 'queryId', 'barrierId', 'barrierKind', 'sqlSha256']) assert.deepEqual(rows[0][field], rows[1][field], `Barrier identity mismatch: ${field}`);
    }
    if (requireComplete) assert.equal(pendingBarriers.length, 0, 'SQL barrier was not released');
    completed.sort((left, right) => left.sequence - right.sequence);
    const open = new Map();
    const transactions = [];
    const autocommit = [];
    for (const row of completed) {
        const transaction = open.get(row.connection);
        if (row.command === 'BEGIN') {
            assert(!transaction, 'Nested BEGIN on one connection');
            if (row.phase === 'end') open.set(row.connection, { connection: row.connection, beginQueryId: row.queryId, statements: [row], outcome: null });
            else autocommit.push(row);
        } else if (transaction) {
            transaction.statements.push(row);
            if (['COMMIT', 'ROLLBACK'].includes(row.command) && row.phase === 'end') {
                transaction.outcome = row.resultCommands?.includes('ROLLBACK') ? 'ROLLBACK' : row.command;
                transaction.endQueryId = row.queryId;
                transactions.push(transaction);
                open.delete(row.connection);
            }
        } else {
            assert(!['COMMIT', 'ROLLBACK'].includes(row.command), 'Transaction end without BEGIN on that connection');
            autocommit.push(row);
        }
    }
    if (requireComplete) assert.equal(open.size, 0, 'SQL transaction is still open');
    return { completed, transactions, autocommit, pendingQueries, pendingBarriers, openTransactions: [...open.values()] };
}

export function parseSqlJsonl(text) {
    if (!text) return [];
    assert(text.endsWith('\n'), 'SQL log has a partial trailing record');
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}
