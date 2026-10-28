'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const protocol = require('./fixture-protocol.cjs');

const productionFile = path.join(__dirname, 'invoke-fixture.cjs');
const productionSource = readFileSync(productionFile, 'utf8');
const request = { formatVersion: 1, runId: '12345678-1234-4234-8234-123456789abc', backend: 'rust', action: 'facts', account: 'none' };
const maxOutput = 8 * 1024 * 1024;

// This is an actual Node child with real stdin/stdout pipes. It has no fixture,
// database, server or external command entrypoint. Pauses separate byte writes
// inside UTF8 scalars instead of testing a decoder helper in isolation.
async function controlledChild() {
    process.stdout.on('error', () => process.exit(0));
    process.stdin.setEncoding('utf8');
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const job = JSON.parse(process.argv[1]);
    if (JSON.stringify(JSON.parse(input)) !== JSON.stringify(job.request)) process.exit(2);
    let output = job.raw;
    if (job.length !== undefined) output += ' '.repeat(job.length - output.length);
    const bytes = Buffer.from(output, 'utf8');
    const cuts = [...new Set([0, ...(job.cuts ?? []), bytes.length])].sort((a, b) => a - b);
    for (let index = 1; index < cuts.length; index++) {
        await new Promise((resolve, reject) => process.stdout.write(bytes.subarray(cuts[index - 1], cuts[index]), (error) => error ? reject(error) : resolve()));
        if (job.delay && index < cuts.length - 1) await new Promise((resolve) => setTimeout(resolve, job.delay));
    }
    if (job.stderr) process.stderr.write(job.stderr);
    process.exitCode = job.exitCode ?? 0;
}
const childSource = `(${controlledChild.toString()})().catch(() => process.exit(3));`;

function responseFor(input = request, facts = {}) {
    return { formatVersion: 1, runId: input.runId, backend: input.backend, action: input.action, matched: 0, changed: 0, state: 'facts', facts };
}
function loadProduction(job) {
    const module = { exports: {} };
    let commands = 0;
    const env = {};
    for (const key of ['SYSTEMROOT', 'WINDIR']) if (process.env[key]) env[key] = process.env[key];
    vm.runInNewContext(productionSource, {
        module, Buffer, JSON, setTimeout, clearTimeout,
        require(name) {
            if (name === './fixture-protocol.cjs') return { ...protocol, fixtureCommand() {
                commands++;
                return { executable: process.execPath, args: ['-e', childSource, JSON.stringify({ request, ...job })], cwd: path.resolve(__dirname, '../..'), env };
            } };
            return require(name);
        }
    }, { filename: productionFile });
    return { invoke: module.exports.invokeFixture, commands: () => commands };
}
function assertExactJson(actual, expected) {
    assert.deepEqual(actual, expected);
    assert.deepEqual(Buffer.from(JSON.stringify(actual)), Buffer.from(JSON.stringify(expected)));
}

test('actual child preserves 1/2/3/4-byte UTF8 scalars split at every byte boundary', { timeout: 20000 }, async (t) => {
    for (const [name, scalar, width] of [['ASCII', 'A', 1], ['two-byte', 'é', 2], ['three-byte', '汉', 3], ['four-byte', '😀', 4]]) {
        await t.test(name, async () => {
            const expected = responseFor(request, { value: `before:${scalar}:after` });
            const raw = JSON.stringify(expected), bytes = Buffer.from(raw);
            const prefix = Buffer.from('"value":"before:');
            const start = bytes.indexOf(prefix) + prefix.length;
            assert(start >= prefix.length);
            assert.equal(Buffer.byteLength(scalar), width);
            assert.deepEqual(bytes.subarray(start, start + width), Buffer.from(scalar));
            // Both surrounding boundaries and each interior byte boundary are
            // emitted separately; the ASCII case is the single-byte control.
            const cuts = Array.from({ length: width + 1 }, (_, index) => start + index);
            const fixture = loadProduction({ raw, cuts, delay: 60 });
            assertExactJson(await fixture.invoke(request), expected);
            assert.equal(fixture.commands(), 1);
        });
    }
});

test('actual child retains all 128 audit emoji when first, middle and last scalars cross stdout chunks', { timeout: 20000 }, async () => {
    const displayName = '😀'.repeat(128);
    const expected = responseFor(request, { audit_log: [{ before_snapshot: { displayName }, after_snapshot: { displayName } }] });
    const raw = JSON.stringify(expected), bytes = Buffer.from(raw), prefix = Buffer.from('"displayName":"');
    const start = bytes.indexOf(prefix) + prefix.length;
    assert(start >= prefix.length);
    const cuts = [0, 64, 127].flatMap((index) => [1, 2, 3].map((offset) => start + index * 4 + offset));
    const actual = await loadProduction({ raw, cuts, delay: 60 }).invoke(request);
    assertExactJson(actual, expected);
    for (const snapshot of [actual.facts.audit_log[0].before_snapshot, actual.facts.audit_log[0].after_snapshot]) {
        assert.equal(snapshot.displayName.length, 256);
        assert.equal([...snapshot.displayName].length, 128);
        assert(!snapshot.displayName.includes('\ufffd'));
    }
});

test('actual child output accepts the original exact character limit and rejects one extra character', { timeout: 20000 }, async () => {
    const expected = responseFor(), raw = JSON.stringify(expected);
    assertExactJson(await loadProduction({ raw, length: maxOutput }).invoke(request), expected);
    await assert.rejects(loadProduction({ raw, length: maxOutput + 1 }).invoke(request), /R2D fixture exceeded output limit/);
});

test('original request guard refuses bad intent before selecting or spawning a child', () => {
    const fixture = loadProduction({ raw: JSON.stringify(responseFor()) });
    for (const delta of [{ backend: 'pg17' }, { runId: '../other' }, { action: 'reset' }, { account: 'admin' }, { sql: 'select 1' }, { sessionToken: 'unexpected' }]) {
        assert.throws(() => fixture.invoke({ ...request, ...delta }));
    }
    assert.equal(fixture.commands(), 0);
});

test('actual child output still enforces complete response envelope and snapshot protocol', { timeout: 20000 }, async () => {
    const invalid = [
        'not-json',
        ...[
            { formatVersion: 2 }, { runId: '87654321-4321-4321-8321-cba987654321' }, { backend: 'nest' }, { action: 'prepare' },
            { matched: -1 }, { matched: 0.5 }, { changed: -1 }, { changed: 0.5 }, { state: 1 }, { unexpected: true }
        ].map((delta) => JSON.stringify({ ...responseFor(), ...delta }))
    ];
    for (const raw of invalid) await assert.rejects(loadProduction({ raw }).invoke(request), /R2D fixture returned invalid protocol output/);
    const snapshotRequest = { ...request, action: 'snapshot', account: 'admin', sessionToken: 'a'.repeat(43) };
    const snapshotResponse = { ...responseFor(snapshotRequest), state: 'snapshot' };
    for (const snapshot of [undefined, { session: {} }, { session: {}, audits: [], securityEvents: null }]) {
        const fixture = loadProduction({ request: snapshotRequest, raw: JSON.stringify({ ...snapshotResponse, snapshot }) });
        await assert.rejects(fixture.invoke(snapshotRequest), /R2D fixture returned invalid protocol output/);
    }
    const valid = { ...snapshotResponse, snapshot: { session: {}, audits: [], securityEvents: [] } };
    assertExactJson(await loadProduction({ request: snapshotRequest, raw: JSON.stringify(valid) }).invoke(snapshotRequest), valid);
});

test('nonzero actual child status retains only the permitted protocol error code', { timeout: 20000 }, async () => {
    const secret = 'private-detail-must-not-reach-error';
    await assert.rejects(loadProduction({ raw: JSON.stringify(responseFor()), exitCode: 1, stderr: `{"code":"fixture_ownership","message":"${secret}"}` }).invoke(request), (error) => {
        assert.equal(error.message, 'R2D fixture rejected guarded operation: fixture_ownership');
        assert(!error.message.includes(secret));
        return true;
    });
    assert.equal(readFileSync(productionFile, 'utf8'), productionSource, 'Production source must stay unchanged during the tests');
});
