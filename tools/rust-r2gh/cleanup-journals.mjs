import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { OwnedFixture } from './owned-fixture.mjs';
import { privateRoot } from './database-client.mjs';
const [tag, mode = 'pending'] = process.argv.slice(2);
assert(process.argv.length <= 4 && /^[a-z0-9-]{1,35}$/.test(tag) && ['pending', 'all'].includes(mode));
const directory = join(privateRoot, 'runs'),
    out = `tmp/rust-r2gh/cleanup-journals-${tag}.json`;
assert(!existsSync(out));
const files = readdirSync(directory)
        .filter((file) => /^(nest|rust)-[0-9a-f-]{36}-gh\.json$/.test(file))
        .sort(),
    report = { formatVersion: 1, tag, mode, result: 'pending', runs: [], startedAt: new Date().toISOString() };
for (const name of files) {
    const file = join(directory, name),
        stat = lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    const journal = JSON.parse(readFileSync(file));
    if (mode === 'pending' && journal.state === 'cleaned') continue;
    const row = { backend: journal.backend, runId: journal.runId, priorState: journal.state, cleanup: [], result: 'pending' };
    report.runs.push(row);
    let fixture;
    try {
        fixture = await OwnedFixture.connect(row.backend, row.runId);
        row.cleanup.push(await fixture.cleanup());
        row.cleanup.push(await fixture.cleanup());
        assert.equal(row.cleanup[1].zero, true);
        row.result = 'pass';
    } catch (error) {
        row.result = 'fail';
        row.error = { type: error.name, assertion: error.name === 'AssertionError' ? error.message : undefined };
        report.result = 'fail';
        process.exitCode = 1;
    } finally {
        if (fixture) await fixture.close();
    }
}
if (report.result === 'pending') report.result = 'pass';
report.finishedAt = new Date().toISOString();
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(
    JSON.stringify({
        result: report.result,
        out,
        runs: report.runs.map((row) => ({ backend: row.backend, runId: row.runId, priorState: row.priorState, result: row.result, cleanup: row.cleanup.map((result) => ({ changed: result.changed, zero: result.zero })), error: row.error }))
    })
);
