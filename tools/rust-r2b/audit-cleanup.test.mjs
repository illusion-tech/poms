import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPortsClosed, auditRegisteredRuns, inspectInventory } from './audit-cleanup.mjs';
import { sourceHead } from './fixture-guard.mjs';
import { plannedJournal } from './fixture-journal.mjs';
import { seedRoles } from './system-lease-model.mjs';

// Synthetic in-memory control files only. These tests never run the CLI, open
// network sockets, connect to PostgreSQL, or invoke any real fixture command.
const runIds = { nest: '11111111-1111-4111-8111-111111111111', rust: '22222222-2222-4222-8222-222222222222' };
const leaseIds = { nest: '33333333-3333-4333-8333-333333333333', rust: '44444444-4444-4444-8444-444444444444' };
function entry(directory, name, value) {
    return { key: directory + '/' + name, directory, name, mode: 0o600, bytes: Buffer.from(JSON.stringify(value) + '\n') };
}
function fixture() {
    const entries = [];
    for (const backend of ['nest', 'rust']) {
        const run = plannedJournal({ backend, runId: runIds[backend] }); run.state = 'cleaned';
        entries.push(entry('runs', backend + '-' + run.runId + '.json', run));
        const snapshot = {
            roles: seedRoles.map((role, index) => ({ id: role.id, role_key: role.key, name: role.key, description: null,
                is_active: true, is_system_role: true, display_order: index * 10, row_version: 1,
                created_at: '2026-10-20T08:00:00.123456+08:00', created_by: null,
                updated_at: '2026-10-20T08:00:00.123456+08:00', updated_by: null })),
            permissions: [], userRoles: [], audits: [], catalog: []
        };
        const lease = { formatVersion: 1, backend, runId: run.runId, leaseId: leaseIds[backend], actorId: run.accounts[0].userId,
            sourceHead, state: 'restored', base: snapshot, authorized: structuredClone(snapshot), pending: null, completed: [],
            createdAt: '2026-10-26T00:00:00.000Z', deadlineAt: '2026-10-26T00:10:00.000Z' };
        entries.push(entry('system-leases', backend + '-' + lease.leaseId + '.json', lease));
        entries.push(entry('system-leases', backend + '-active.json', { formatVersion: 1, backend, leaseId: lease.leaseId }));
    }
    return { journals: entries.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0),
        sources: [{ key: 'tools/rust-r2b/audit-cleanup.mjs', mode: 0o644, bytes: Buffer.from('frozen synthetic source\n') }] };
}
function clone(snapshot) {
    return Object.fromEntries(Object.entries(snapshot).map(([name, rows]) => [name, rows.map((row) => ({ ...row, bytes: Buffer.from(row.bytes) }))]));
}
function change(snapshot, directory, name, mutate) {
    const found = snapshot.journals.find((row) => row.directory === directory && row.name === name);
    const value = JSON.parse(found.bytes); mutate(value); found.bytes = Buffer.from(JSON.stringify(value) + '\n');
}
function adapter(state, cleanup) {
    return { snapshot: () => clone(state), ports: () => assertPortsClosed(async () => true), cleanup };
}
const zero = (request) => ({ formatVersion: 1, runId: request.runId, backend: request.backend, action: 'cleanup', state: 'cleaned', matched: 0, changed: 0 });

test('inventory derives only known backend/run IDs and binds each restored lease to its ordinary actor', () => {
    const result = inspectInventory(fixture().journals);
    assert.deepEqual(result.runs.map((run) => [run.backend, run.runId]), [['nest', runIds.nest], ['rust', runIds.rust]]);
    assert.equal(result.leases.length, 2); assert.equal(result.pointers.length, 2);
    assert(result.runs.every((run) => /^[0-9a-f]{64}$/.test(run.sha256)));
    assert(!JSON.stringify(result).includes('username'));
});
test('unknown filenames, backends, directories and duplicate file identities are refused', () => {
    for (const foreign of [entry('runs', 'prod-' + runIds.nest + '.json', {}), entry('runs', 'nest-active.json', {}),
        entry('runs', 'nest-' + runIds.nest + '.json.tmp', {}), entry('elsewhere', 'nest-' + runIds.nest + '.json', {})]) {
        const state = fixture(); state.journals.push(foreign); assert.throws(() => inspectInventory(state.journals));
    }
    const repeated = fixture(); repeated.journals.push(repeated.journals[0]); assert.throws(() => inspectInventory(repeated.journals));
});
test('ordinary content must match filename and fixed synthetic origin', () => {
    for (const mutate of [value => { value.runId = runIds.rust; }, value => { value.backend = 'rust'; },
        value => { value.accounts[0].username = 'unrelated'; }, value => { value.accounts[0].roleKey = 'platform-admin'; }]) {
        const state = fixture(); change(state, 'runs', 'nest-' + runIds.nest + '.json', mutate);
        assert.throws(() => inspectInventory(state.journals));
    }
});
test('any planned or prepared ordinary run is refused before a cleanup call', async () => {
    for (const status of ['planned', 'prepared']) {
        const state = fixture(); change(state, 'runs', 'rust-' + runIds.rust + '.json', value => { value.state = status; });
        let calls = 0, probes = 0;
        await assert.rejects(auditRegisteredRuns({ snapshot: () => clone(state), ports: async () => { probes++; }, cleanup: async () => { calls++; } }));
        assert.equal(calls, 0); assert.equal(probes, 0);
    }
});
test('active and restoring system journals are refused even when no active pointer selects them', () => {
    for (const status of ['active', 'restoring']) {
        const state = fixture(); const original = state.journals.find((row) => row.name === 'nest-' + leaseIds.nest + '.json');
        const value = JSON.parse(original.bytes); value.state = status; value.leaseId = '55555555-5555-4555-8555-555555555555';
        state.journals.push(entry('system-leases', 'nest-' + value.leaseId + '.json', value));
        assert.throws(() => inspectInventory(state.journals), /lease_not_restored/);
    }
});
test('lease source, lease filename, actor and ordinary run origin are all required', () => {
    for (const mutate of [value => { value.sourceHead = '0'.repeat(40); }, value => { value.leaseId = leaseIds.rust; },
        value => { value.actorId = '55555555-5555-4555-8555-555555555555'; }, value => { value.runId = runIds.rust; }]) {
        const state = fixture(); change(state, 'system-leases', 'nest-' + leaseIds.nest + '.json', mutate);
        assert.throws(() => inspectInventory(state.journals));
    }
});
test('completed audit identities must exist, be unique and belong to the known actor', () => {
    const auditId = '55555555-5555-4555-8555-555555555555';
    for (const variant of ['valid', 'missing', 'duplicate', 'wrong-actor']) {
        const state = fixture(); change(state, 'system-leases', 'nest-' + leaseIds.nest + '.json', value => {
            value.completed = [{ step: 'admin-edit', auditId }];
            value.authorized.audits = [{ id: auditId, event_type: 'platform.role.updated', target_type: 'PlatformRole', target_id: seedRoles[0].id,
                operator_id: value.actorId, request_id: null, result: 'success', reason: null, before_snapshot: null, after_snapshot: null,
                metadata: null, occurred_at: '2026-10-26T00:00:01.000Z' }];
            if (variant === 'missing') value.authorized.audits = [];
            if (variant === 'duplicate') value.completed.push({ step: 'admin-edit', auditId });
            if (variant === 'wrong-actor') value.authorized.audits[0].operator_id = '66666666-6666-4666-8666-666666666666';
        });
        if (variant === 'valid') inspectInventory(state.journals);
        else assert.throws(() => inspectInventory(state.journals));
    }
});
test('missing, cross-backend or dangling active pointers are refused', () => {
    const missing = fixture(); missing.journals = missing.journals.filter((row) => row.name !== 'rust-active.json');
    assert.throws(() => inspectInventory(missing.journals));
    for (const mutate of [value => { value.backend = 'rust'; }, value => { value.leaseId = leaseIds.rust; }, value => { value.extra = true; }]) {
        const state = fixture(); change(state, 'system-leases', 'nest-active.json', mutate); assert.throws(() => inspectInventory(state.journals));
    }
});
test('private modes, bounded byte lengths, malformed JSON and invalid UTF8 are refused', () => {
    for (const mutate of [row => { row.mode = 0o644; }, row => { row.bytes = Buffer.alloc(16385, 32); },
        row => { row.bytes = Buffer.from('{'); }, row => { row.bytes = Buffer.from([0xff]); }]) {
        const state = fixture(); mutate(state.journals.find((row) => row.directory === 'runs'));
        assert.throws(() => inspectInventory(state.journals));
    }
});
test('fixed port probes require positive closed evidence for all three loopback ports', async () => {
    const probed = []; await assertPortsClosed(async (port) => { probed.push(port); return true; });
    assert.deepEqual(probed, [5100, 5101, 5200]);
    for (const unsafe of [false, undefined, 'ECONNREFUSED']) await assert.rejects(assertPortsClosed(async (port) => port === 5200 ? unsafe : true), /listener/);
});
test('all validated runs are checked sequentially with only the fixed cleanup request', async () => {
    const state = fixture(); const calls = []; let running = 0;
    const report = await auditRegisteredRuns(adapter(state, async (request) => {
        assert.equal(++running, 1); assert.deepEqual(Object.keys(request).sort(), ['account', 'action', 'backend', 'formatVersion', 'runId']);
        assert.equal(request.account, 'none'); assert.equal(request.action, 'cleanup');
        calls.push(request); await Promise.resolve(); running--; return zero(request);
    }));
    assert.equal(report.result, 'pass'); assert.equal(report.cleanups.length, 2); assert.equal(calls[0].backend, 'nest'); assert.equal(calls[1].backend, 'rust');
    assert.equal(report.source.beforeSha256, report.source.afterSha256); assert.equal(report.journals.beforeSha256, report.journals.afterSha256);
});
test('nonzero cleanup, wrong response identity or extra result fields cannot pass', async () => {
    for (const mutate of [value => { value.matched = 1; }, value => { value.changed = 1; }, value => { value.backend = 'rust'; },
        value => { value.token = 'must not be reflected'; }, value => { value.state = 'prepared'; }]) {
        const state = fixture(); let calls = 0;
        await assert.rejects(auditRegisteredRuns(adapter(state, async (request) => { calls++; const response = zero(request); mutate(response); return response; })), (error) => {
            assert(!error.message.includes('must not be reflected')); return true;
        });
        assert.equal(calls, 1);
    }
});
test('a listener refusal occurs before any real-cleanup seam is invoked', async () => {
    const state = fixture(); let calls = 0;
    await assert.rejects(auditRegisteredRuns({ snapshot: () => clone(state), ports: () => assertPortsClosed(async () => false), cleanup: async () => { calls++; } }));
    assert.equal(calls, 0);
});
test('source-byte changes stop the audit before the next run', async () => {
    const state = fixture(); let calls = 0;
    await assert.rejects(auditRegisteredRuns(adapter(state, async (request) => { calls++; state.sources[0].bytes = Buffer.from('changed source'); return zero(request); })), /input_changed/);
    assert.equal(calls, 1);
});
test('journal whitespace is a byte change even when parsed JSON would be equal', async () => {
    const state = fixture(); let calls = 0;
    await assert.rejects(auditRegisteredRuns(adapter(state, async (request) => { calls++; state.journals[0].bytes = Buffer.concat([state.journals[0].bytes, Buffer.from('\n')]); return zero(request); })), /input_changed/);
    assert.equal(calls, 1);
});
test('new or renamed journal entries cannot disappear from the before/after directory check', async () => {
    const state = fixture(); let calls = 0;
    await assert.rejects(auditRegisteredRuns(adapter(state, async (request) => { calls++; state.journals.push(entry('runs', 'unknown.json', {})); return zero(request); })), /input_changed/);
    assert.equal(calls, 1);
});
