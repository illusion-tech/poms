import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { databaseFor, marker, validateAmbient, validateCluster, validateMarker, validateRuntime, validateSource, verifyConnection } from './fixture-guard.mjs';
import { journalStore, plannedJournal, validateJournal } from './fixture-journal.mjs';
import { assertOwned, cleanup, fixturePermissions, mutate } from './fixture-core.mjs';
import { auditSnapshot, navigationSummary, snapshot } from './fixture-snapshot.mjs';
import { executeFixture } from './fixture-run.mjs';
const require = createRequire(import.meta.url);
const { fixtureCredentials, fixtureRequestIdentity, fixtureCommand, parseFixtureRequest } = require('./fixture-protocol.cjs');
const runId = '62ebf92e-c623-4e31-9080-c5dbf01beb7d';
const base = { formatVersion: 1, runId, backend: 'rust', action: 'prepare', account: 'none' };
function parse(value) {
    return parseFixtureRequest(Buffer.from(JSON.stringify(value)));
}
function safeFailure(callback, code) {
    assert.throws(callback, (error) => error.code === code && error.message === code);
}
test('strict protocol hashes real-cookie input immediately and never returns token', () => {
    const token = 'a'.repeat(43);
    const result = parse({ ...base, action: 'expire-idle', account: 'admin', sessionToken: token });
    assert.equal(result.sessionHash, createHash('sha256').update(token).digest('hex'));
    assert.equal(Object.hasOwn(result, 'sessionToken'), false);
    assert.equal(JSON.stringify(result).includes(token), false);
    assert(Object.isFrozen(result));
    for (const action of ['prepare', 'cleanup']) assert.equal(parse({ ...base, action }).account, 'none');
    for (const action of ['disable', 'restore', 'permissions-none', 'permissions-and-partial', 'permissions-and-full']) assert.equal(parse({ ...base, action, account: 'viewer' }).account, 'viewer');
    for (const action of ['session-due', 'session-non-due', 'snapshot', 'expire-idle', 'expire-absolute', 'revoke']) assert.equal(parse({ ...base, action, account: 'viewer', sessionToken: token }).sessionHash, result.sessionHash);
});
for (const [label, value, code] of [
    ['extra URL', { ...base, url: 'postgres://secret' }, 'unknown_field'],
    ['unknown action', { ...base, action: 'sql' }, 'invalid_action'],
    ['old backend', { ...base, backend: 'r1d' }, 'invalid_backend'],
    ['wrong version', { ...base, formatVersion: 2 }, 'invalid_format'],
    ['path run ID', { ...base, runId: '../../secret' }, 'invalid_run_id'],
    ['prepare account', { ...base, account: 'admin' }, 'invalid_account'],
    ['cleanup token', { ...base, action: 'cleanup', sessionToken: 'sensitive' }, 'unexpected_session_token'],
    ['session lacks token', { ...base, action: 'revoke', account: 'viewer' }, 'invalid_session_token'],
    ['session wrong account', { ...base, action: 'revoke', account: 'none', sessionToken: 'a'.repeat(43) }, 'invalid_account']
])
    test(`protocol rejects ${label} without reflecting supplied data`, () => safeFailure(() => parse(value), code));
test('malformed/oversized/non UTF8 stdin is rejected', () => {
    for (const bytes of [Buffer.alloc(0), Buffer.alloc(16385)]) safeFailure(() => parseFixtureRequest(bytes), 'invalid_input_size');
    for (const bytes of [Buffer.from('{'), Buffer.from([0xff])]) safeFailure(() => parseFixtureRequest(bytes), 'invalid_json');
});
test('credentials are synthetic deterministic public fixture values', () => {
    assert.deepEqual(fixtureCredentials(runId, 'viewer'), { username: `r2b_viewer_${runId.replaceAll('-', '')}`, password: `R2B_${runId}_synthetic_only` });
    safeFailure(() => fixtureCredentials(runId, 'none'), 'invalid_account');
    assert.deepEqual(fixtureRequestIdentity(runId), { requestId: `r2b:${runId}`, userAgent: `poms-r2b-fixture/${runId}` });
});
test('commands are fixed per platform, with explicit ordinary WSL identity and no inherited secrets', () => {
    const win = fixtureCommand({ platform: 'win32' });
    assert.equal(win.executable, 'wsl.exe');
    assert.deepEqual(win.args, ['--distribution', 'Debian', '--user', 'wangzishi', '--cd', '/home/wangzishi/projects/poms-rust-r2b', '--', 'bash', 'tools/rust-r2b/fixture.sh']);
    const linux = fixtureCommand({ platform: 'linux' });
    assert.equal(linux.executable, process.execPath);
    assert(linux.args[0].endsWith('fixture-cli.mjs'));
    for (const command of [win, linux]) assert(Object.keys(command.env).every((key) => !/^(PG|DB_|MIKRO_|NODE_|POMS_|JWT_)/i.test(key)));
    safeFailure(() => fixtureCommand({ platform: 'darwin' }), 'unsupported_platform');
});
test('ambient PG and runtime overrides cannot influence the fixed connection', () => {
    validateAmbient({ PATH: '/usr/bin', HOME: '/home/synthetic' });
    for (const key of ['PGOPTIONS', 'PGPASSFILE', 'pghost', 'DB_HOST', 'DATABASE_URL', 'MIKRO_ORM_HOST', 'JWT_SECRET', 'NODE_OPTIONS', 'POMS_ENV_FILE']) safeFailure(() => validateAmbient({ [key]: 'not-reflected' }), 'ambient_override');
    assert.equal(databaseFor('rust'), 'poms_r2b_rust');
    for (const backend of ['poms', 'r1d', 'postgres']) safeFailure(() => databaseFor(backend), 'invalid_backend');
});
const metadata = {
    database: 'poms_r2b_rust',
    session_user: 'poms_r2b_app',
    current_user: 'poms_r2b_app',
    version: '150012',
    port: '15432',
    isolated: 'on',
    database_owner: 'poms_r0e_owner',
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolbypassrls: false,
    rolreplication: false,
    role_memberships: 0,
    schema_create: false,
    public_schema_create: false,
    database_create: false,
    marker_access: false
};
test('database identity rejects wrong DB/server/port/session/owner and all elevated privileges', () => {
    validateRuntime(metadata, 'poms_r2b_rust');
    for (const [key, value] of Object.entries({ database: 'poms_r1d_rust', port: '5432', version: '170004', isolated: 'off', session_user: 'poms_r0e_owner', current_user: 'poms_r0e_owner', database_owner: 'other' }))
        safeFailure(() => validateRuntime({ ...metadata, [key]: value }, 'poms_r2b_rust'), 'database_identity');
    for (const key of ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolbypassrls', 'rolreplication', 'schema_create', 'public_schema_create', 'database_create', 'marker_access'])
        safeFailure(() => validateRuntime({ ...metadata, [key]: true }, 'poms_r2b_rust'), 'runtime_privilege');
    safeFailure(() => validateRuntime({ ...metadata, role_memberships: 1 }, 'poms_r2b_rust'), 'runtime_privilege');
    safeFailure(() => validateCluster(metadata, 'poms', false), 'invalid_database');
});
test('owner-only instance marker must be a single exact row', () => {
    validateMarker([{ database: 'poms_r2b_rust', marker }], 'poms_r2b_rust');
    for (const rows of [
        [],
        [{ database: 'poms_r1c_rust', marker }],
        [{ database: 'poms_r2b_rust', marker: runId }],
        [
            { database: 'poms_r2b_rust', marker },
            { database: 'poms_r2b_rust', marker }
        ]
    ])
        safeFailure(() => validateMarker(rows, 'poms_r2b_rust'), 'instance_marker');
});
test('readonly preflight precedes all fixture writes; guard failure explicitly rolls back', async () => {
    const queries = [];
    const client = {
        query: async (sql) => {
            queries.push(sql);
            return { rows: [{ ...metadata, rolreplication: true }] };
        }
    };
    await assert.rejects(verifyConnection(client, 'poms_r2b_rust'), (error) => error.code === 'runtime_privilege');
    assert.equal(queries[0], 'BEGIN READ ONLY');
    assert.equal(queries.at(-1), 'ROLLBACK');
    assert.equal(
        queries.some((sql) => /insert|update|delete/i.test(sql)),
        false
    );
});
test('source guard independently checks working tree, staged/index and untracked inputs', () => {
    for (const failureIndex of [0, 1, 2]) {
        const seen = [];
        safeFailure(
            () =>
                validateSource((_command, args) => {
                    seen.push(args);
                    return seen.length === failureIndex + 1 ? 'changed' : '';
                }),
            'source_drift'
        );
        assert.equal(seen.length, failureIndex + 1);
        if (failureIndex === 1) assert(seen[1].includes('--cached'));
        if (failureIndex === 2) assert.equal(seen[2][0], 'ls-files');
    }
    const permissions = validateSource(() => '');
    assert.equal(permissions.length, 37);
    safeFailure(
        () =>
            validateSource(
                () => '',
                () => '{}'
            ),
        'manifest_drift'
    );
    assert.deepEqual(fixturePermissions('viewer', permissions), ['nav:dashboard:view', 'platform:org-units:manage']);
    assert.deepEqual(fixturePermissions('admin', permissions), permissions);
    assert.deepEqual(fixturePermissions('viewer', permissions, 'and-full'), ['nav:dashboard:view', 'platform:org-units:manage', 'platform:org-sync:manage']);
    assert.deepEqual(fixturePermissions('viewer', permissions, 'none'), []);
    safeFailure(() => fixturePermissions('viewer', permissions, 'arbitrary'), 'invalid_permission_profile');
});
test('journal validates target, exact fields, UUID ownership and preserves recovery intent', (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'poms-r2b-journal-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const store = journalStore(base, directory);
    assert.equal(store.read(), undefined);
    const journal = plannedJournal(base);
    store.write(journal);
    assert.deepEqual(store.read(), journal);
    journal.state = 'prepared';
    store.write(journal);
    assert.equal(store.read().state, 'prepared');
    for (const candidate of [
        { ...journal, backend: 'nest' },
        { ...journal, runId: '../other' },
        { ...journal, token: 'secret' },
        { ...journal, state: 'unknown' }
    ])
        safeFailure(() => validateJournal(candidate, base), 'invalid_journal');
    const duplicate = structuredClone(journal);
    duplicate.accounts[1].userId = duplicate.accounts[0].userId;
    safeFailure(() => validateJournal(duplicate, base), 'invalid_journal');
    const changed = structuredClone(journal);
    changed.accounts[0].username = 'seed-admin';
    safeFailure(() => validateJournal(changed, base), 'invalid_journal');
    const path = join(directory, 'runs', `rust-${runId}.json`);
    assert(!readFileSync(path, 'utf8').includes('password'));
    writeFileSync(path, '{"password":"do-not-reflect"}');
    safeFailure(() => store.read(), 'invalid_journal');
});
test('journal refuses a symlink rather than following a different run file', { skip: process.platform === 'win32' ? 'Windows symlink privilege is not assumed; production CLI is Linux' : false }, (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'poms-r2b-journal-link-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const store = journalStore(base, directory);
    const other = join(directory, 'other');
    writeFileSync(other, '{}', { mode: 0o600 });
    symlinkSync(other, join(directory, 'runs', `rust-${runId}.json`));
    safeFailure(() => store.read(), 'journal_file');
});
test('fixture ownership rejects unrelated same-name rows before any mutation', async () => {
    const journal = plannedJournal(base);
    let queries = 0;
    const client = {
        query: async () => {
            queries++;
            return { rows: [{ id: runId, username: 'seed-user' }] };
        }
    };
    await assert.rejects(assertOwned(client, journal), (error) => error.code === 'fixture_ownership');
    assert.equal(queries, 3);
});
test('wrong-session hash cannot mutate a different fixture account', async () => {
    const journal = plannedJournal(base);
    const queries = [];
    const client = {
        query: async (sql, args) => {
            queries.push({ sql, args });
            if (sql.startsWith('select id::text,username')) return { rows: [{ id: args[0], username: args[1] }] };
            if (sql.startsWith('select id::text,role_key')) return { rows: [{ id: args[0], role_key: args[1] }] };
            if (sql.startsWith('select id::text,code')) return { rows: [{ id: args[0], code: args[1] }] };
            if (sql.startsWith('select count(*)') || sql.startsWith('select (')) return { rows: [{ count: 0 }] };
            return { rowCount: 0, rows: [] };
        }
    };
    const request = parse({ ...base, action: 'revoke', account: 'admin', sessionToken: 'b'.repeat(43) });
    await assert.rejects(mutate(client, request, journal, []), (error) => error.code === 'fixture_target_not_found');
    const update = queries.find((query) => query.sql.startsWith('update'));
    assert.equal(update.args[0], journal.accounts[0].userId);
    assert.equal(update.args[1], request.sessionHash);
    assert.match(update.sql, /where user_id=\$1 and token_hash=\$2 and status='active'/);
});
test('session lock rejects concurrent prepare after cleanup COMMIT until final journal persistence', async () => {
    let heldBy;
    const history = [];
    function client(name) {
        return {
            query: async (sql) => {
                history.push([name, sql]);
                if (sql.startsWith('select pg_try_advisory_lock')) {
                    if (heldBy) return { rows: [{ locked: false }] };
                    heldBy = name;
                    return { rows: [{ locked: true }] };
                }
                if (sql.startsWith('select pg_advisory_unlock')) {
                    assert.equal(heldBy, name);
                    heldBy = undefined;
                    return { rows: [] };
                }
                if (sql.startsWith('select count(*)') || sql.startsWith('select (')) return { rows: [{ count: 0 }] };
                if (sql.startsWith('select\n')) return { rows: [{ users: 0, sessions: 0, roles: 0, organizations: 0, events: 0, audits: 0 }] };
                return { rows: [], rowCount: 0 };
            }
        };
    }
    let entered;
    const postCommit = new Promise((resolve) => {
        entered = resolve;
    });
    let resume;
    const finish = new Promise((resolve) => {
        resume = resolve;
    });
    const journal = plannedJournal(base);
    journal.state = 'prepared';
    let persisted = 'prepared';
    const first = executeFixture(client('first'), { ...base, action: 'cleanup' }, [], {
        read: () => structuredClone(journal),
        write: async (value) => {
            assert(history.some(([name, sql]) => name === 'first' && sql === 'COMMIT'));
            entered();
            await finish;
            persisted = value.state;
        }
    });
    await postCommit;
    assert.equal(persisted, 'prepared');
    await assert.rejects(executeFixture(client('second'), base, [], { read: () => assert.fail('concurrent journal read'), write: () => assert.fail('concurrent journal write') }), (error) => error.code === 'fixture_busy');
    assert.equal(heldBy, 'first');
    resume();
    assert.equal((await first).state, 'cleaned');
    assert.equal(persisted, 'cleaned');
    assert.equal(heldBy, undefined);
    assert.equal(history.at(-1)[1], 'select pg_advisory_unlock(1380074050,$1)');
});
test('non-run SET NULL references reject cleanup before any DELETE and owned rows stay locked', async () => {
    const journal = plannedJournal(base);
    const history = [];
    const client = {
        query: async (sql, args) => {
            history.push(sql);
            if (sql.startsWith('select id::text,username')) return { rows: [{ id: args[0], username: args[1] }] };
            if (sql.startsWith('select id::text,role_key')) return { rows: [{ id: args[0], role_key: args[1] }] };
            if (sql.startsWith('select id::text,code')) return { rows: [{ id: args[0], code: args[1] }] };
            return { rows: [{ count: sql.startsWith('select (') ? 1 : 0 }] };
        }
    };
    await assert.rejects(assertOwned(client, journal), (error) => error.code === 'foreign_fixture_reference');
    assert(history.filter((sql) => sql.startsWith('select id::')).every((sql) => sql.endsWith('for update')));
    const references = history.find((sql) => sql.startsWith('select ('));
    for (const name of ['primary_org_unit_id', 'parent_id', 'poms.customer', 'poms.sales_follow_up_record', 'poms.external_department_mapping', 'poms.org_sync_run', 'poms.org_sync_diff_item']) assert(references.includes(name));
    assert.equal(
        history.some((sql) => /^delete/i.test(sql)),
        false
    );
});

function ownedClient(history, respond) {
    return {
        query: async (sql, args) => {
            history.push({ sql, args });
            if (sql.startsWith('select id::text,username')) return { rows: [{ id: args[0], username: args[1] }] };
            if (sql.startsWith('select id::text,role_key')) return { rows: [{ id: args[0], role_key: args[1] }] };
            if (sql.startsWith('select id::text,code')) return { rows: [{ id: args[0], code: args[1] }] };
            if (sql.startsWith('select count(*)') || sql.startsWith('select (')) return { rows: [{ count: 0 }] };
            return respond(sql, args);
        }
    };
}
test('due and non-due controls bind only the selected run account and exact session hash', async () => {
    const journal = plannedJournal(base);
    for (const [action, seconds] of [
        ['session-due', 61],
        ['session-non-due', 0]
    ]) {
        const history = [];
        const request = parse({ ...base, action, account: 'viewer', sessionToken: 'b'.repeat(43) });
        const result = await mutate(
            ownedClient(history, async () => ({ rowCount: 1, rows: [] })),
            request,
            journal,
            []
        );
        assert.equal(result.state, action);
        const update = history.find((entry) => entry.sql.startsWith('update'));
        assert.deepEqual(update.args, [journal.accounts[1].userId, request.sessionHash, seconds]);
        assert.match(update.sql, /where user_id=\$1 and token_hash=\$2 and status='active'/);
        assert(!update.sql.includes('absolute_expires_at='));
    }
});
const summary = { targetId: 'platform-navigation', nodeCount: 2, routeCount: 1, hiddenCount: 0, disabledCount: 0, treeChecksum: 'c'.repeat(64), navigationKeys: ['platform', 'platform.navigation'], routeLinks: ['/platform/navigation'] };
test('navigation audit snapshot preserves null and empty request IDs but rejects unknown secret fields', () => {
    const row = {
        id: runId,
        eventType: 'platform.navigation.synced',
        targetType: 'NavigationTree',
        targetId: 'platform-navigation',
        operatorId: runId,
        requestId: null,
        result: 'success',
        reason: null,
        beforeSnapshot: null,
        afterSnapshot: summary,
        metadata: { source: 'static-navigation-ssot' },
        occurredAt: new Date('2026-10-26T06:00:00.123Z')
    };
    for (const requestId of [null, '', 'r'.repeat(64)]) {
        const result = auditSnapshot({ ...row, requestId }, [runId]);
        assert.equal(result.requestId, requestId);
        assert.equal(result.occurredAt, '2026-10-26T06:00:00.123Z');
        assert.equal(Object.keys(result).length, 12);
    }
    for (const changed of [
        { ...row, token: 'not-reflected' },
        { ...row, operatorId: 'foreign' },
        { ...row, beforeSnapshot: { cookie: 'not-reflected' } },
        { ...row, metadata: { source: 'static-navigation-ssot', secret: 'not-reflected' } },
        { ...row, afterSnapshot: { ...summary, password: 'not-reflected' } }
    ])
        assert.throws(
            () => auditSnapshot(changed, [runId]),
            (error) => /^snapshot_/.test(error.code) && !error.message.includes('not-reflected')
        );
    assert.equal(navigationSummary(summary), summary);
});
test('snapshot selects an exact run token, never exposes token/hash, and reads only owned audit/event scope', async () => {
    const journal = plannedJournal(base);
    const history = [];
    const token = 'b'.repeat(43);
    const request = parse({ ...base, action: 'snapshot', account: 'admin', sessionToken: token });
    const now = new Date('2026-10-26T06:00:00.123Z');
    const client = ownedClient(history, async (sql) => ({
        rows: sql.includes('from poms.auth_session') ? [{ id: runId, rowVersion: 2, status: 'active', lastSeenAt: now, idleExpiresAt: now, absoluteExpiresAt: now, updatedAt: now, revokedAt: null, revokedReason: null }] : []
    }));
    const result = await snapshot(client, request, journal);
    assert.equal(result.state, 'snapshot');
    assert.equal(Object.keys(result.snapshot.session).length, 9);
    assert(!JSON.stringify(result).includes(token));
    assert(!JSON.stringify(result).includes(request.sessionHash));
    const session = history.find((entry) => entry.sql.includes('from poms.auth_session'));
    assert.deepEqual(session.args, [journal.accounts[0].userId, request.sessionHash]);
    assert(!session.sql.split('from poms.auth_session')[0].includes('token_hash'));
    const audits = history.find((entry) => entry.sql.includes('from poms.audit_log'));
    assert.match(audits.sql, /where operator_id=any\(\$1::uuid\[\]\)/);
    const events = history.find((entry) => entry.sql.includes('from poms.security_event'));
    assert.deepEqual(events.args.slice(1), Object.values(fixtureRequestIdentity(runId)));
    assert(!history.some((entry) => /^(?:insert|update|delete)/i.test(entry.sql)));
});
test('snapshot missing session stops before any audit read, without falling back to another account', async () => {
    const history = [];
    const client = ownedClient(history, async () => ({ rows: [] }));
    const request = parse({ ...base, action: 'snapshot', account: 'admin', sessionToken: 'b'.repeat(43) });
    await assert.rejects(snapshot(client, request, plannedJournal(base)), (error) => error.code === 'fixture_target_not_found');
    assert(!history.some((entry) => entry.sql.includes('from poms.audit_log')));
});
test('cleanup uses operator UUIDs and nonempty run metadata, never shared targetId or nullable requestId', async () => {
    const history = [];
    let reads = 0;
    const client = ownedClient(history, async (sql) => ({ rows: sql.startsWith('select\n') ? [{ users: reads++ === 0 ? 2 : 0, sessions: 0, roles: 0, organizations: 0, events: 0, audits: 0 }] : [], rowCount: 0 }));
    const result = await cleanup(client, base, plannedJournal(base));
    assert.equal(result.state, 'cleaned');
    const audit = history.find((entry) => entry.sql.startsWith('delete from poms.audit_log'));
    assert.equal(audit.sql, 'delete from poms.audit_log where operator_id=any($1::uuid[])');
    const event = history.find((entry) => entry.sql.startsWith('delete from poms.security_event'));
    assert.deepEqual(event.args.slice(1), Object.values(fixtureRequestIdentity(runId)));
    assert(history.filter((entry) => entry.sql.startsWith('delete')).every((entry) => !/target_id|request_id is null|request_id=''/i.test(entry.sql)));
});
