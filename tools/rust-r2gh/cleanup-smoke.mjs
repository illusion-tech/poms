import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { OwnedFixture } from './owned-fixture.mjs';
assert.equal(process.platform, 'linux'); assert.equal(process.argv.length, 2);
const output = 'tmp/rust-r2gh/cleanup-smoke01.json'; assert(!existsSync(output));
const report = { formatVersion: 1, result: 'pending', sourceSha256: createHash('sha256').update(readFileSync('tools/rust-r2gh/owned-fixture.mjs')).digest('hex'), copies: [] };
try {
    for (const backend of ['nest', 'rust']) {
        const runId = randomUUID(), fixture = await OwnedFixture.connect(backend, runId);
        const row = { backend, runId, cleanup: [] }; report.copies.push(row);
        try { await fixture.prepare(); }
        finally {
            try {
                for (let pass = 0; pass < 2; pass++) {
                    const result = await fixture.cleanup();
                    const extensionState = JSON.parse(readFileSync(fixture.file)).state, baseState = fixture.baseStore.read().state;
                    assert.equal(extensionState, 'cleaned'); assert.equal(baseState, 'cleaned');
                    row.cleanup.push({ pass, matched: result.matched, changed: result.changed, zero: result.zero, extensionState, baseState });
                    if (pass === 1) assert.deepEqual([result.matched, result.changed, result.zero], [0, 0, true]);
                }
            } finally { await fixture.close(); }
        }
    }
    report.result = 'pass';
} catch (error) { report.result = 'fail'; report.error = { name: error.name }; process.exitCode = 1; }
finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify({ result: report.result, copies: report.copies, output }));
