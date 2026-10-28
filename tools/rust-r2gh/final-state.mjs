import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, lstatSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { privateRoot } from './database-client.mjs';
import { validateSource } from './fixture-guard.mjs';
const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
assert.equal(process.platform, 'linux');
assert([2, 5].includes(process.argv.length));
const [outputTag = '01', cleanupTag = 'final02', ownerTag = 'acceptance03'] = process.argv.slice(2);
assert(/^[0-9]{2}$/.test(outputTag) && /^final[0-9]{2}$/.test(cleanupTag) && /^[a-z0-9-]{1,35}$/.test(ownerTag));
const output = `tmp/rust-r2gh/final-state${outputTag}.json`;
assert(!existsSync(output));
validateSource();
const cleanup = JSON.parse(readFileSync(`tmp/rust-r2gh/cleanup-journals-${cleanupTag}.json`));
assert.equal(cleanup.result, 'pass');
assert.equal(cleanup.mode, 'all');
const directory = path.join(privateRoot, 'runs');
const files = readdirSync(directory).filter(file => /^(nest|rust)-[0-9a-f-]{36}(?:-gh)?\.json$/.test(file)).sort();
const report = { formatVersion: 1, result: 'pending', privateJournalValuesPrinted: false, journals: [], ports: [], owners: [], startedAt: new Date().toISOString() };
const prior = JSON.parse(readFileSync('tmp/rust-r2gh/cleanup-journals-final01.json'));
report.priorFailedRunResidualRecovery = { file: 'cleanup-journals-final01.json', runs: prior.runs.filter(row => row.cleanup[0].changed > 0).map(row => ({ backend: row.backend, runId: row.runId, priorExtensionState: row.priorState, removedInFinalSweep: row.cleanup[0].changed, secondPassZero: row.cleanup[1].zero })) };
for (const file of files) {
    const full = path.join(directory, file), stat = lstatSync(full), bytes = readFileSync(full), value = JSON.parse(bytes);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    assert.equal(value.state, 'cleaned', 'All attempted journal lifecycles must be closed');
    const base = file.replace(/-gh\.json$/, '.json'), extension = base.replace(/\.json$/, '-gh.json');
    assert(files.includes(base) && files.includes(extension), 'Every base and GH extension have a matching closed lifecycle');
    report.journals.push({ file, state: value.state, rawBytesSha256: createHash('sha256').update(bytes).digest('hex') });
}
assert.equal(cleanup.runs.length * 2, report.journals.length);
for (const row of cleanup.runs) { assert.equal(row.result, 'pass'); assert.equal(row.cleanup.length, 2); for (const result of row.cleanup) assert.equal(result.zero, true); }
for (const port of [5700, 5701, 5800, 5900]) {
    await runtime.assertPortAvailable({ host: '127.0.0.1', port });
    report.ports.push({ host: '127.0.0.1', port, available: true });
}
for (const [kind, file] of [['nest', `owner-nest-${ownerTag}-closeout.json`], ['rust', `owner-rust-${ownerTag}-closeout.json`], ['upstream', `upstream/${ownerTag}/closeout.json`]]) {
    const value = JSON.parse(readFileSync('tmp/rust-r2gh/' + file));
    assert.equal(value.result, 'pass'); assert.equal(value.stopped, true);
    if (kind !== 'upstream') { assert.equal(value.sourceUnchanged, true); assert.equal(value.binaryUnchanged, true); }
    report.owners.push({ kind, file, result: value.result, stopped: value.stopped, sourceUnchanged: value.sourceUnchanged, binaryUnchanged: value.binaryUnchanged });
}
report.result = 'pass'; report.finishedAt = new Date().toISOString();
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ result: 'pass', runs: cleanup.runs.length, journals: files.length, ports: report.ports, owners: report.owners, output }));
