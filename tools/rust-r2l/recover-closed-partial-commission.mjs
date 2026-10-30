// Root-only recovery of a fully certified partial attempt AFTER every original
// writer and observer is proved closed/restored. Never adopts a query match.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { LFixture } from './l-fixture.mjs';
import { marker, sourceHead } from './fixture-guard.mjs';
import { verifyFullCatalog } from './catalog-complete.mjs';
import { catalog as full107Catalog } from '../rust-r2c/schema-check.mjs';
const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const [input, output] = process.argv.slice(2);
assert(/^tmp\/rust-r2l\/commission-http-(?:nest|rust)-[a-z0-9-]{1,24}\.json$/.test(input ?? ''));
assert(output && !fs.existsSync(output));
assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l');
const bytes = fs.readFileSync(input), original = JSON.parse(bytes);
assert.equal(original.result, 'partial'); assert.equal(original.marker, marker); assert.equal(original.sourceHead, sourceHead);
assert.equal(input, `tmp/rust-r2l/commission-http-${original.backend}-${original.tag}.json`);
assert(original.resourceCloseout.every(row => row.result === 'pass'));
for (const name of ['native-witness-final', 'native-owner-close', 'pg7-observer-restore', 'pg7-owner-connection-close', 'fixture-connection-close'])
    assert(original.resourceCloseout.some(row => row.name === name && row.result === 'pass'));
if (original.rustRuntime) assert(original.resourceCloseout.some(row => row.name === 'rust-owner-close' && row.result === 'pass'));
assert.equal(original.pgObserverRestore.observerFootprintRestored, true);
assert(original.requests.every(row => row.response && row.certificates?.sdkComplete === true), 'Uncertified HTTP/creation evidence needs its own narrower recovery');
const report = { kind: 'controlled-recovery-of-closed-certified-partial-commission', result: 'pending', startedAt: new Date().toISOString(),
    input: { file: input, bytes: bytes.length, rawBytesSha256: sha(bytes), originalResult: 'partial' }, runId: original.runId, backend: original.backend,
    oldAttemptRelabelled: false, newBusinessAcceptanceClaimed: false, cleanup: [], resources: [] };
let fixture;
try {
    for (const port of [9700, 9701, 9800]) await runtime.assertPortAvailable(runtime.resolveTarget({ mode: 'external', baseUrl: 'http://127.0.0.1:' + port }));
    fixture = await LFixture.open(original.backend, original.runId);
    assert.equal(fixture.j.state, 'prepared');
    assert(fixture.j.intents.every(intent => ['adopted', 'absent'].includes(intent.state)));
    assert(fixture.j.directCreates.every(intent => ['promoted', 'absent', 'rolled-back'].includes(intent.state)));
    assert(fixture.j.mutations.every(intent => ['committed', 'recovered-committed', 'rolled-back'].includes(intent.state)));
    report.full107Before = await full107Catalog(fixture.client); await verifyFullCatalog(fixture.client);
    assert.deepEqual(report.full107Before, original.full107Before);
    report.preflight = await fixture.preflight();
    for (let index = 0; index < 2; index++) report.cleanup.push(await fixture.cleanup());
    assert.equal(report.cleanup[1].deleted, 0); report.doubleZero = true;
    report.full107After = await full107Catalog(fixture.client); await verifyFullCatalog(fixture.client);
    assert.deepEqual(report.full107After, report.full107Before); report.result = 'pass-exact-owned-recovery-only';
} catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally {
    if (fixture) try { await fixture.close(); report.resources.push({ name: 'recovery-fixture-client-close', result: 'pass' }); }
    catch (error) { report.resources.push({ name: 'recovery-fixture-client-close', result: 'fail', failure: { name: error.name, message: error.message } }); report.result = 'fail'; process.exitCode = 1; }
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ result: report.result, output, deleted: report.cleanup.map(row => row.deleted), doubleZero: report.doubleZero ?? false, failure: report.failure ?? null }));
}
