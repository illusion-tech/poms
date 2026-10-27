import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { auditRegisteredRuns, assertPortsClosed, inspectInventory } from './audit-cleanup.mjs';
import { plannedJournal } from './fixture-journal.mjs';

function state() {
    return {
        sources: [{ key: 'fixed-product-source', mode: 0o644, bytes: Buffer.from('unchanged source') }],
        journals: ['nest', 'rust'].map((backend) => {
            const runId = randomUUID(), journal = plannedJournal({ backend, runId });
            journal.state = 'cleaned';
            const name = `${backend}-${runId}.json`;
            return { directory: 'runs', name, key: `runs/${name}`, mode: 0o600, bytes: Buffer.from(JSON.stringify(journal) + '\n') };
        })
    };
}
function copy(value) {
    return Object.fromEntries(Object.entries(value).map(([key, rows]) => [key, rows.map((row) => ({ ...row, bytes: Buffer.from(row.bytes) }))]));
}
function zero(request) { const { account, ...rest } = request; assert.equal(account, 'none'); return { ...rest, state: 'cleaned', matched: 0, changed: 0 }; }
function adapter(value, cleanup = async (request) => zero(request)) {
    return { snapshot: () => copy(value), ports: () => assertPortsClosed(async () => true), cleanup };
}

test('only cleaned R2C journals bind exact file/run/backend identities', () => {
    const value = state(); assert.equal(inspectInventory(value.journals).runs.length, 2);
    for (const modify of [
        (journal) => { journal.state = 'prepared'; }, (journal) => { journal.state = 'planned'; },
        (journal) => { journal.runId = randomUUID(); }, (journal) => { journal.accounts[0].roleKey = 'platform-admin'; }
    ]) {
        const candidate = state(), journal = JSON.parse(candidate.journals[0].bytes); modify(journal);
        candidate.journals[0].bytes = Buffer.from(JSON.stringify(journal));
        assert.throws(() => inspectInventory(candidate.journals));
    }
});

test('foreign leases, temporary files, duplicate entries, UTF8 and private-mode violations are refused', () => {
    for (const modify of [
        (entry) => { entry.directory = 'system-leases'; }, (entry) => { entry.name += '.tmp'; entry.key += '.tmp'; },
        (entry) => { entry.mode = 0o644; }, (entry) => { entry.bytes = Buffer.from([0xff]); },
        (entry) => { entry.bytes = Buffer.alloc(16385); }
    ]) {
        const value = state(); modify(value.journals[0]); assert.throws(() => inspectInventory(value.journals));
    }
    const value = state(); value.journals.push(value.journals[0]); assert.throws(() => inspectInventory(value.journals));
});

test('both backend inventories are required before any cleanup', async () => {
    const value = state(); value.journals.pop(); let calls = 0;
    await assert.rejects(auditRegisteredRuns(adapter(value, async () => { calls++; })));
    assert.equal(calls, 0);
});

test('listener refusal precedes every cleanup and checks only fixed R2C ports', async () => {
    const probed = []; await assertPortsClosed(async (port) => { probed.push(port); return true; });
    assert.deepEqual(probed, [5300, 5301, 5400]);
    const value = state(); let calls = 0;
    await assert.rejects(auditRegisteredRuns({ snapshot: () => copy(value), ports: () => assertPortsClosed(async () => false), cleanup: async () => { calls++; } }), /listener/);
    assert.equal(calls, 0);
});

test('each already-cleaned run receives two sequential exact zero/zero cleanup checks', async () => {
    const value = state(), calls = []; let active = 0;
    const report = await auditRegisteredRuns(adapter(value, async (request) => {
        assert.equal(++active, 1); calls.push({ ...request });
        assert.deepEqual(Object.keys(request).sort(), ['account', 'action', 'backend', 'formatVersion', 'runId']);
        assert.equal(request.action, 'cleanup'); await Promise.resolve(); active--;
        return zero(request);
    }));
    assert.equal(report.result, 'pass'); assert.equal(calls.length, 4);
    assert.deepEqual(calls[0], calls[1]); assert.deepEqual(calls[2], calls[3]);
    assert.equal(report.cleanups.length, 2); assert.equal(report.source.beforeSha256, report.source.afterSha256);
    assert.equal(report.journals.beforeSha256, report.journals.afterSha256);
});

test('nonzero, mismatched or extra-field results cannot certify residual cleanup', async () => {
    for (const modify of [
        (result) => { result.matched = 1; }, (result) => { result.changed = 1; },
        (result) => { result.backend = 'foreign'; }, (result) => { result.extra = 'must-not-echo'; }
    ]) {
        const value = state(); let calls = 0;
        await assert.rejects(auditRegisteredRuns(adapter(value, async (request) => { calls++; const result = zero(request); modify(result); return result; })));
        assert.equal(calls, 1);
    }
});

test('source or journal byte changes stop before the second cleanup', async () => {
    for (const collection of ['sources', 'journals']) {
        const value = state(); let calls = 0;
        await assert.rejects(auditRegisteredRuns(adapter(value, async (request) => {
            calls++; value[collection][0].bytes = Buffer.concat([value[collection][0].bytes, Buffer.from('\n')]);
            return zero(request);
        })), /input_changed/);
        assert.equal(calls, 1);
    }
});

test('journal names cannot be inserted or removed during final auditing', async () => {
    const value = state(); let calls = 0;
    await assert.rejects(auditRegisteredRuns(adapter(value, async (request) => { calls++; value.journals.pop(); return zero(request); })), /input_changed/);
    assert.equal(calls, 1);
});
