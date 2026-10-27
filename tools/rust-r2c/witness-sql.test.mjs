import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeSql, parseSqlJsonl } from './witness-sql.mjs';

function trace(entries) {
    let sequence = 0;
    return entries.flatMap(([connection, queryId, command, terminal = 'end', resultCommand = command]) => ['start', terminal].map((phase) => ({ sequence: ++sequence, queryId, connection, phase, command, statement: command, sqlShape: command, sqlSha256: `${queryId}`, parameterCount: 0, captureIncomplete: false, resultCommands: phase === 'end' ? [resultCommand] : [] })));
}

test('transactions pair per connection despite interleaved other-connection reads/writes', () => {
    const value = analyzeSql(trace([[1, 1, 'BEGIN'], [2, 2, 'UPDATE'], [1, 3, 'UPDATE'], [2, 4, 'BEGIN'], [1, 5, 'COMMIT'], [2, 6, 'INSERT'], [2, 7, 'ROLLBACK']]));
    assert.deepEqual(value.transactions.map((tx) => [tx.connection, tx.statements.map((query) => query.queryId), tx.outcome]), [[1, [1, 3, 5], 'COMMIT'], [2, [4, 6, 7], 'ROLLBACK']]);
    assert.deepEqual(value.autocommit.map((row) => row.queryId), [2]);
});

test('SQL error remains part of its rolled-back transaction and COMMIT can report ROLLBACK', () => {
    const value = analyzeSql(trace([[1, 1, 'BEGIN'], [1, 2, 'UPDATE', 'error'], [1, 3, 'COMMIT', 'end', 'ROLLBACK']]));
    assert.equal(value.transactions[0].outcome, 'ROLLBACK');
    assert.equal(value.transactions[0].statements[1].phase, 'error');
});

test('incomplete query/transaction and mispaired query identities cannot certify evidence', () => {
    assert.throws(() => analyzeSql(trace([[1, 1, 'BEGIN']])));
    assert.throws(() => analyzeSql(trace([[1, 1, 'SELECT']]).slice(0, 1)));
    assert.throws(() => analyzeSql(trace([[2, 1, 'COMMIT']])));
    const mismatched = trace([[1, 1, 'SELECT']]); mismatched[1].connection = 2;
    assert.throws(() => analyzeSql(mismatched));
    const duplicated = trace([[1, 1, 'SELECT']]); duplicated[1].sequence = 1;
    assert.throws(() => analyzeSql(duplicated));
});

test('barrier events do not create fake SQL queries and failure/timeout invalidates evidence', () => {
    const events = trace([[1, 1, 'SELECT']]);
    events.push({ ...events[1], sequence: 3, phase: 'barrier-hit', barrierId: 'case', barrierKind: 'after-org-select' }, { ...events[1], sequence: 4, phase: 'barrier-release', barrierId: 'case', barrierKind: 'after-org-select' });
    assert.equal(analyzeSql(events).completed.length, 1);
    events[3].phase = 'barrier-timeout';
    assert.throws(() => analyzeSql(events));
});

test('unknown event phases and unreleased or mismatched barriers are rejected', () => {
    const events = trace([[1, 1, 'SELECT']]);
    assert.throws(() => analyzeSql([...events, { ...events[1], sequence: 3, phase: 'invented' }]));
    const hit = { ...events[1], sequence: 3, phase: 'barrier-hit', barrierId: 'case', barrierKind: 'after-org-select' };
    assert.throws(() => analyzeSql([...events, hit]));
    const release = { ...hit, sequence: 4, phase: 'barrier-release', connection: 2 };
    assert.throws(() => analyzeSql([...events, hit, release]));
});

test('trailing partial JSONL record and explicit incomplete flag are rejected', () => {
    assert.throws(() => parseSqlJsonl('{"sequence":1}'));
    assert.deepEqual(parseSqlJsonl(''), []);
    const events = trace([[1, 1, 'SELECT']]); events[1].captureIncomplete = true;
    assert.throws(() => analyzeSql(events));
    assert.equal(parseSqlJsonl(events.map((row) => JSON.stringify(row)).join('\n') + '\n').length, 2);
});
