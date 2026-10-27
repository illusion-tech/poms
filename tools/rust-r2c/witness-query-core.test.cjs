'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { describeSql, matchesBarrier, sqlShape, installQueryCapture } = require('./witness-query-core.cjs');

test('SQL shape redacts literals/comments and never includes bound values or returned rows', async () => {
    const sql = "/* private password */ select 'secret''value', $$dollar secret$$, $tag$tagged$tag$, 123, $1 from \"poms\".\"org_unit\" -- bearer token\n where \"code\" = $2";
    const shape = sqlShape(sql);
    for (const secret of ['password', 'secret', 'value', 'tagged', 'bearer', '123']) assert(!shape.includes(secret));
    assert(shape.includes('$1') && shape.includes('$2') && shape.includes('"poms"."org_unit"'));
    const rows = [];
    class Client { query() { return Promise.resolve({ command: 'SELECT', rowCount: 1, rows: [{ password: 'never-log-me' }] }); } }
    const capture = installQueryCapture(Client, { append: (row) => rows.push(row) });
    try { await new Client().query(sql, ['bound-secret', 'another-secret']); }
    finally { capture.uninstall(); }
    const evidence = JSON.stringify(rows);
    for (const secret of ['bound-secret', 'another-secret', 'never-log-me', 'dollar secret']) assert(!evidence.includes(secret));
    assert.equal(rows[0].parameterCount, 2);
    assert.equal(rows[1].rowCount, 1);
    assert.deepEqual(rows[1].resultCommands, ['SELECT']);
});

test('unarmed promise, result, arguments and synchronous exceptions retain original identities', async () => {
    const result = { rowCount: 1 };
    const promise = Promise.resolve(result);
    const args = ['select 1', [42]];
    const failure = new Error('hidden driver detail');
    const rows = [];
    let calls = 0;
    class Client { query(...actual) { calls++; assert.deepEqual(actual, args); if (calls === 2) throw failure; return promise; } }
    const capture = installQueryCapture(Client, { append: (row) => rows.push(row) });
    try {
        const client = new Client();
        assert.equal(client.query(...args), promise);
        assert.equal(await promise, result);
        assert.throws(() => client.query(...args), (error) => error === failure);
        assert.deepEqual(rows.map((row) => row.phase), ['start', 'end', 'start', 'error']);
        assert(!JSON.stringify(rows).includes(failure.message));
    } finally { capture.uninstall(); }
});

test('callback and non-promise signatures pass through and invalidate capture', () => {
    let originalArgs;
    const callback = () => undefined;
    const marker = {};
    class Client { query(...args) { originalArgs = args; return marker; } }
    const rows = [];
    const capture = installQueryCapture(Client, { append: (row) => rows.push(row) });
    try {
        assert.equal(new Client().query('select 1', callback), marker);
        assert.equal(originalArgs[1], callback);
        assert.equal(rows[0].phase, 'unsupported');
        assert(capture.isIncomplete());
    } finally { capture.uninstall(); }
});

test('after-select barrier fires only after query resolves and delays delivery to the caller', async () => {
    let resolveQuery;
    let release;
    let received = false;
    const events = [];
    class Client { query() { return new Promise((resolve) => { resolveQuery = resolve; }); } }
    const capture = installQueryCapture(Client, {
        append: (row) => events.push(row),
        barrierFor: (phase, context) => matchesBarrier('after-org-select', phase, context) ? { kind: 'after-org-select', barrierId: 'case' } : null,
        pause: () => new Promise((resolve) => { release = resolve; })
    });
    try {
        const promise = new Client().query('select "o".* from "poms"."org_unit" as "o" order by "o"."display_order" asc, "o"."created_at" asc').then(() => { received = true; });
        assert.deepEqual(events.map((row) => row.phase), ['start']);
        resolveQuery({ rows: [{ id: 'read-at-this-time' }], rowCount: 1 });
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(events.map((row) => row.phase), ['start', 'end', 'barrier-hit']);
        assert.equal(received, false);
        release(true);
        await promise;
        assert(received);
        assert.equal(events.at(-1).phase, 'barrier-release');
    } finally { capture.uninstall(); }
});

test('barriers distinguish all-org, code lookup and managed session CAS from raw touch', () => {
    assert(matchesBarrier('after-org-code-select', 'after', describeSql('select * from poms.org_unit where code=$1 limit 1')));
    assert(!matchesBarrier('after-org-select', 'after', describeSql('select * from poms.org_unit where id=$1 order by display_order,created_at')));
    assert(!matchesBarrier('before-managed-session-update', 'before', describeSql('update poms.auth_session set row_version=row_version+1 where id=$1 and status=$2')));
    assert(matchesBarrier('before-managed-session-update', 'before', describeSql('update poms.auth_session set row_version=row_version+1 where id=$1 and row_version=$2')));
    assert(!matchesBarrier('after-org-select', 'before', describeSql('select * from poms.org_unit order by display_order,created_at')));
});

test('evidence append failure cannot replace the actual driver result', async () => {
    const value = { rows: [] };
    class Client { query() { return Promise.resolve(value); } }
    let failures = 0;
    const capture = installQueryCapture(Client, { append: () => { throw new Error('disk'); }, onFailure: () => { failures++; } });
    try { assert.equal(await new Client().query('select 1'), value); assert(capture.isIncomplete()); assert(failures > 0); }
    finally { capture.uninstall(); }
});

test('before-CAS barrier prevents sending SQL until released and query rejection is preserved', async () => {
    const error = Object.assign(new Error('hidden'), { code: '40001' });
    const events = [];
    let invoked = false;
    let release;
    class Client { query() { invoked = true; return Promise.reject(error); } }
    const capture = installQueryCapture(Client, {
        append: (row) => events.push(row),
        barrierFor: (phase, context) => matchesBarrier('before-managed-session-update', phase, context) ? { kind: 'before-managed-session-update', barrierId: 'case' } : null,
        pause: () => new Promise((resolve) => { release = resolve; })
    });
    try {
        const promise = new Client().query('update poms.auth_session set row_version=row_version+1 where id=$1 and row_version=$2');
        assert.equal(invoked, false);
        assert.deepEqual(events.map((row) => row.phase), ['barrier-hit']);
        release(true);
        await assert.rejects(promise, (observed) => observed === error);
        assert.deepEqual(events.map((row) => row.phase), ['barrier-hit', 'barrier-release', 'start', 'error']);
        assert.equal(events.at(-1).code, '40001');
    } finally { capture.uninstall(); }
});
