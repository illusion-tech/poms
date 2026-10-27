import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { membershipMatrix, sortTies, SORT_TIES } from './fixture-matrices.mjs';
import { plannedJournal, validateJournal } from './fixture-journal.mjs';
const require = createRequire(import.meta.url);
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const { parseFixtureRequest } = require('./fixture-protocol.cjs');
const { validateFixtureFacts } = require('./invoke-fixture.cjs');
const request = { formatVersion: 1, runId: randomUUID(), backend: 'nest', account: 'none', action: 'org-membership-matrix', orgSlot: 'main' };
function journalFor(slots) {
    const journal = plannedJournal(request);
    journal.orgs = slots.map((slot) => ({ slot, orgId: randomUUID(), initialCode: orgFixtureSpec(request.runId, slot).databaseCode, parentSlot: slot === 'child' ? 'main' : null, deleted: false }));
    return journal;
}
test('fixture transport admits complete matrix facts and rejects missing, short or unexpected facts',()=>{
    const members=Array.from({length:4},()=>({id:randomUUID()})),users=Array.from({length:2},()=>({id:randomUUID()}));
    validateFixtureFacts(request,{fixtureFacts:{memberships:members,users}});
    validateFixtureFacts({...request,action:'org-sort-ties'},{fixtureFacts:{organizations:members}});
    for(const result of [{},{fixtureFacts:{}},{fixtureFacts:{memberships:members.slice(1),users}},{fixtureFacts:{memberships:members,users,unknown:[]}}])assert.throws(()=>validateFixtureFacts(request,result));
    assert.throws(()=>validateFixtureFacts({...request,action:'org-snapshot'},{fixtureFacts:{memberships:members,users}}));
});
test('matrix protocol accepts only fixed anchor slots and forbids caller IDs', () => {
    assert.equal(parseFixtureRequest(Buffer.from(JSON.stringify(request))).orgSlot, 'main');
    for (const extra of [{ orgSlot: 'second' }, { primaryId: randomUUID() }, { action: 'org-sort-ties' }, { memberships: [] }]) assert.throws(() => parseFixtureRequest(Buffer.from(JSON.stringify({ ...request, ...extra }))));
    assert.equal(orgFixtureSpec(request.runId, 'negative-default').displayOrder, -2147483647);
});
test('membership UUID journal fsync failure prevents every DML statement', async () => {
    const journal = journalFor(['main', 'child']),
        primaryId = randomUUID(),
        calls = [];
    const client = {
        query: async (sql) => {
            calls.push(sql);
            return { rows: sql.includes("membership_type='primary'") ? [{ id: primaryId }] : [] };
        }
    };
    await assert.rejects(
        membershipMatrix(client, request, journal, {
            write: async (value) => {
                validateJournal(value, request);
                throw Error('fsync failed');
            }
        }),
        /fsync failed/
    );
    assert(calls.every((sql) => sql.startsWith('select')));
    assert.equal(journal.membershipMatrix.primaryId, primaryId);
    assert.equal(new Set(Object.values(journal.membershipMatrix)).size, 4);
    const bad = structuredClone(journal);
    bad.membershipMatrix.unknownId = bad.accounts[0].userId;
    assert.throws(() => validateJournal(bad, request));
});
test('membership matrix changes only journal-bound users and orgs after UUID persistence', async () => {
    const journal = journalFor(['main', 'child']),
        calls = [],
        primaryId = randomUUID();
    const client = {
        query: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.startsWith('select id') && sql.includes("membership_type='primary'")) return { rows: [{ id: primaryId }] };
            if (sql.startsWith('select')) return { rows: [] };
            return { rowCount: 1 };
        }
    };
    const result = await membershipMatrix(client, request, journal, {
        write: async (value) => {
            validateJournal(value, request);
            calls.push({ sql: 'JOURNAL_FSYNC' });
        }
    });
    assert.equal(result.changed, 5);
    assert(calls.findIndex((call) => call.sql === 'JOURNAL_FSYNC') < calls.findIndex((call) => call.sql.startsWith('update')));
    const insert = calls.find((call) => call.sql.startsWith('insert'));
    assert.match(insert.sql, /'secondary','active'/);
    assert.match(insert.sql, /'historical-unknown','active'/);
    assert.match(insert.sql, /'secondary','revoked'/);
    assert.deepEqual(insert.params, [journal.membershipMatrix.secondaryId, journal.accounts[1].userId, journal.orgs[0].orgId, journal.membershipMatrix.unknownId, journal.accounts[0].userId, journal.orgs[1].orgId, journal.membershipMatrix.revokedId]);
});
test('tie matrix keeps microsecond PG inputs distinct and refuses incomplete/non-root targets before DML', async () => {
    const journal = journalFor(SORT_TIES.map((value) => value.slot)),
        calls = [];
    const client = {
        query: async (sql, params) => {
            calls.push({ sql, params });
            return { rowCount: 1, rows: [] };
        }
    };
    const tieRequest = { ...request, action: 'org-sort-ties', orgSlot: 'tie-a' };
    await sortTies(client, tieRequest, journal);
    assert.equal(calls.filter((call) => call.sql.startsWith('update')).length, 4);
    assert.equal(new Set(SORT_TIES.map((value) => value.createdAt)).size, 4);
    assert.equal(new Set(SORT_TIES.map((value) => Date.parse(value.createdAt))).size, 1);
    assert(calls.slice(0, 4).every((call) => call.sql.includes('parent_id is null') && !call.sql.includes('set code')));
    calls.length = 0;
    journal.orgs[1].parentSlot = 'main';
    await assert.rejects(sortTies(client, tieRequest, journal), /matrix_parent/);
    assert.equal(calls.length, 0);
});
