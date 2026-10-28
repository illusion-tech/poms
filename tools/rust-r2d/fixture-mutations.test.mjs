import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { plannedJournal } from './fixture-journal.mjs';
import { userFixture } from './fixture-users.mjs';
import { mutateReference } from './fixture-references.mjs';
const require = createRequire(import.meta.url);
const { parseFixtureRequest } = require('./fixture-protocol.cjs');
const base = { formatVersion: 1, runId: '12345678-1234-4234-8234-123456789abc', backend: 'nest', action: 'prepare', account: 'none' };
const parse = (value) => parseFixtureRequest(Buffer.from(JSON.stringify({ ...base, ...value })));
test('reference mutation protocol accepts only scoped slots and refuses arbitrary ids or cross-kind slots', () => {
    for (const slot of ['admin', 'viewer', 'alpha', 'inactive']) for (const action of ['role-set-active', 'role-set-inactive']) assert.equal(parse({ action, roleSlot: slot }).roleSlot, slot);
    for (const value of [
        { action: 'role-delete-owned', roleSlot: 'admin' },
        { action: 'org-delete-owned', orgSlot: 'viewer' },
        { action: 'org-set-values', orgSlot: 'alpha', roleSlot: 'alpha' },
        { action: 'role-set-active', roleSlot: 'root' },
        { action: 'role-set-active', roleSlot: 'alpha', id: 'arbitrary' },
        { roleSlot: 'alpha' },
        { action: 'user-profile-null', userSlot: 'admin', orgSlot: 'alpha' }
    ])
        assert.throws(() => parse(value));
    assert.equal(parse({ action: 'org-delete-owned', orgSlot: 'alpha' }).orgSlot, 'alpha');
});
test('version and nullable hydration mutations lock the named owned user and preserve required columns', async () => {
    const j = plannedJournal(base),
        user = j.accounts[0],
        queries = [];
    const client = {
        async query(sql, args) {
            queries.push({ sql, args });
            return sql.startsWith('select') ? { rowCount: 1, rows: [{ id: user.userId, username: user.username }] } : { rowCount: 1, rows: [] };
        }
    };
    for (const action of ['user-bump-version', 'user-nullable-null-no-version', 'user-nullable-values-no-version', 'user-profile-unverified']) {
        queries.length = 0;
        await userFixture(client, parse({ action, userSlot: 'admin' }), j, {});
        assert.match(queries[0].sql, /where id=\$1 for update$/);
        assert.deepEqual(queries[0].args, [user.userId]);
        assert(!queries[1].sql.includes('updated_at'));
        assert.equal(queries[1].sql.includes('row_version'), action === 'user-bump-version');
        assert.equal(queries[1].args[0], user.userId);
    }
    const changed = {
        async query() {
            return { rowCount: 1, rows: [{ username: 'foreign' }] };
        }
    };
    await assert.rejects(userFixture(changed, parse({ action: 'user-bump-version', userSlot: 'admin' }), j, {}), /fixture_user_ownership/);
});
test('role and org state mutation refuses altered ownership before issuing update', async () => {
    const j = plannedJournal(base);
    for (const request of [parse({ action: 'role-set-inactive', roleSlot: 'alpha' }), parse({ action: 'org-set-values', orgSlot: 'alpha' })]) {
        const queries = [];
        const client = {
            async query(sql, args) {
                queries.push({ sql, args });
                return { rowCount: 1, rows: [{ key: 'foreign' }] };
            }
        };
        await assert.rejects(mutateReference(client, request, j), /fixture_reference_ownership/);
        assert.equal(queries.length, 1);
        assert.match(queries[0].sql, /for update$/);
    }
});

test('ordering mutation accepts only four fixed time cases and only alters one owned created_at', async () => {
    const j = plannedJournal(base),
        user = j.accounts[0];
    for (const [timeCase, micros] of Object.entries({ 'micro-low': '123100', 'micro-high': '123900', 'tie-first': '123500', 'tie-second': '123500' })) {
        const calls = [];
        const client = {
            async query(sql, args) {
                calls.push({ sql, args });
                return { rowCount: 1, rows: [{ id: user.userId, username: user.username }] };
            }
        };
        await userFixture(client, parse({ action: 'user-created-at', userSlot: 'admin', timeCase }), j, {});
        assert.match(calls[0].sql, /for update$/);
        assert.equal(calls[1].sql, 'update poms.platform_user set created_at=$2::timestamptz where id=$1');
        assert.deepEqual(calls[1].args, [user.userId, `2020-01-02T00:00:00.${micros}Z`]);
    }
    for (const value of [
        { action: 'user-created-at', userSlot: 'admin' },
        { action: 'user-created-at', userSlot: 'admin', timeCase: '2020-01-01' },
        { action: 'user-profile-values', userSlot: 'admin', timeCase: 'micro-low' }
    ])
        assert.throws(() => parse(value));
    const calls = [];
    await userFixture(
        {
            async query(sql, args) {
                calls.push({ sql, args });
                return { rowCount: 1, rows: [{ username: user.username }] };
            }
        },
        parse({ action: 'user-membership-without-active-primary', userSlot: 'admin' }),
        j,
        {}
    );
    assert.equal(calls[1].sql, "update poms.user_org_membership set status='revoked' where user_id=$1 and status='active' and membership_type='primary'");
    assert.deepEqual(calls[1].args, [user.userId]);
});

test('duplicate-name fixture locks and validates both owned roles before its limited name update', async () => {
    const j = plannedJournal(base),
        request = parse({ action: 'role-duplicate-names', roleSlot: 'alpha' });
    for (const wrong of ['viewer', 'inactive', 'admin']) assert.throws(() => parse({ action: 'role-duplicate-names', roleSlot: wrong }));
    const ordered = j.roles.filter((row) => ['alpha', 'viewer'].includes(row.slot)).toSorted((a, b) => a.id.localeCompare(b.id));
    for (const badIndex of [-1, 0, 1]) {
        const calls = [];
        const client = {
            async query(sql, args) {
                const index = calls.length;
                calls.push({ sql, args });
                return sql.startsWith('select') ? { rowCount: 1, rows: [{ key: badIndex === index ? 'foreign' : ordered[index].key }] } : { rowCount: 2, rows: [] };
            }
        };
        if (badIndex >= 0) {
            await assert.rejects(mutateReference(client, request, j), /fixture_reference_ownership/);
            assert.equal(calls.length, badIndex + 1);
        } else {
            assert.equal((await mutateReference(client, request, j)).changed, 2);
            assert.deepEqual(
                calls.slice(0, 2).map((row) => row.args[0]),
                ordered.map((row) => row.id)
            );
            assert.equal(calls[2].sql, 'update poms.role set name=$2 where id=any($1::uuid[])');
            assert.deepEqual(calls[2].args, [ordered.map((row) => row.id), 'R2D 同名 12345678']);
        }
    }
});
