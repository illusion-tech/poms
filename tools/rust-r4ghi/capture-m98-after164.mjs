// State-free, read-only observation after the two fixed normal M98 commands.
// No createContext, state mint, migration, HTTP, process launch or business write.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { FIXED, guard, sourcePins, ownedFile } from './business/context.mjs';
import { capture } from './business/snapshot.mjs';
import { verifyFixedM98Commands136 } from './business/migration-command136.mjs';
import { sha } from './business/pure.mjs';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', N = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
assert.equal(process.platform, 'linux'); assert.equal(process.execPath, N); assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-plan-sha' && args[4] === '--execute');
assert.equal(FIXED.migrations, 98); assert.equal(FIXED.tables, 139); assert.equal(FIXED.win, R); assert.equal(FIXED.private, P);
function read(pin) { assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const raw = ownedFile(pin.file); assert.equal(sha(raw), pin.rawBytesSha256); return raw; }
const json = pin => JSON.parse(read(pin)), planRaw = ownedFile(args[1]); assert.equal(sha(planRaw), args[3]); const plan = JSON.parse(planRaw);
assert.equal(plan.kind, 'Root-approved-state-free-M98-after-capture164'); assert.equal(plan.epoch, 'g2-business13'); assert.equal(plan.run, 'main01'); assert.equal(plan.G3Certified, false);
assert.equal(plan.approval.file, R + '/docs/design/rust-r4ghi/source13-g2-freeze136.json'); const approval = json(plan.approval); assert.equal(approval.kind, 'Root-frozen-Source13-corrective-G2-136'); assert.equal(approval.G2Authorized, true); assert.equal(approval.actualM98Applied, false);
assert.deepEqual(approval.supportingTools.migrationAfterCapture, { file: R + '/tools/rust-r4ghi/capture-m98-after164.mjs', rawBytesSha256: sha(ownedFile(R + '/tools/rust-r4ghi/capture-m98-after164.mjs')) });
assert.equal(plan.outputDirectory, P + '/migration98-136/after164'); assert(!fs.existsSync(plan.outputDirectory));
assert(!fs.existsSync(P + '/business/g2-business12/main01/driver.lock')); assert(!fs.existsSync(P + '/business/g2-business13/main01/state.json'), 'Only the later final108 plan may first mint Source13 state');
const oldStateFile = P + '/business/g2-business12/main01/state.json', oldStateRaw = ownedFile(oldStateFile), oldState = JSON.parse(oldStateRaw); assert.equal(oldState.epoch, 'g2-business12'); assert(!oldState.activeFault && !oldState.blockedObservation);
assert.equal(oldState.apiProcess.rawBytesSha256, 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1'); assert.equal(oldState.processRestart1351.registry.rawBytesSha256, '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b');
const retention = json(plan.retentionReceipt); assert.equal(retention.kind, 'actual-source12-candidate-and-real-data-retained-before-corrective-consumer'); assert.equal(retention.producerEpoch, 'g2-business12'); assert.equal(retention.marker, oldState.marker);
assert.equal(retention.stoppedAPI.pid, 11616); assert.equal(retention.stoppedAPI.processGone, true);
assert.deepEqual(retention.activeExecution.activeApiProcess, { file: P + '/rust-api1351-process.json', rawBytesSha256: 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1' });
assert.deepEqual(retention.activeExecution.activeRestartRegistry, { file: P + '/business/g2-business12/main01/007134-p1351-registry.json', rawBytesSha256: '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b' });
assert.deepEqual(retention.activeExecution.activeCandidate, { file: P + '/business/g2-business12/main01/007133-p1351-candidate.json', rawBytesSha256: '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c' }); assert.equal(retention.activeExecution.generation, 'API1351'); assert.equal(retention.activeExecution.oldEvidenceRelabelledAs1351, false);
assert.deepEqual(plan.retentionReceipt, approval.retainedSource12.receipt); assert.deepEqual(plan.migrationBefore, retention.after); read(plan.migrationBefore);
const oldProcess = json({ file: oldState.apiProcess.file, rawBytesSha256: oldState.apiProcess.rawBytesSha256 });
if (fs.existsSync('/proc/' + oldProcess.pid + '/stat')) { const stat = fs.readFileSync('/proc/' + oldProcess.pid + '/stat', 'utf8'); assert.notEqual(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], oldProcess.startTime, 'The same physical1351 must be stopped'); }
for (const port of [31441, 31442]) await new Promise((resolve, reject) => { const socket = net.createConnection({ host: '127.0.0.1', port }); socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Unknown API listener status')); }); socket.once('connect', () => { socket.destroy(); reject(new Error('No API may run during the state-free schema observation')); }); socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(error)); });
const identity = JSON.parse(ownedFile(FIXED.stateRoot + '/identity.json')); assert.equal(identity.namespace, FIXED.namespace); assert.equal(identity.marker, '0ca66699-053b-4f40-ad5c-82fed4cf1a6f'); assert.equal(identity.base, FIXED.base); assert.equal(identity.container, 'poms-r4ghi-pg15'); assert.equal(identity.volume, 'poms-r4ghi-pg15-data'); assert.equal(identity.port, 25434); assert.deepEqual(identity.databases, FIXED.databases);
const provision = json(plan.provision); assert.equal(provision.marker, identity.marker); assert.equal(provision.namespace, identity.namespace); assert.deepEqual(provision.databaseOids.map(item => item.database), FIXED.databases);
const currentHelperPins = () => fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).sort().map(file => ({ file: 'tools/rust-r4ghi/business/' + file, sha256: sha(ownedFile(R + '/tools/rust-r4ghi/business/' + file)) }));
const helperPins = currentHelperPins(); assert.deepEqual(json(plan.helperGraph), helperPins);
const pins = sourcePins(); assert.deepEqual(json(plan.sourcePins), pins); assert.equal(sha(JSON.stringify(pins)), plan.sourcePinsSHA256); assert.equal(pins.length, plan.sourceCount);
const ctx = { ...FIXED, identity, provision, epoch: plan.epoch, run: plan.run, state: { marker: identity.marker }, priv: plan.outputDirectory };
const commands = json(plan.actualCommands); verifyFixedM98Commands136(ctx, commands, { migrationName: approval.forwardMigration.name, approvedSQL: approval.forwardMigration.migrationSQL, approvedMigrationSource: approval.forwardMigration.migrationTS });
const require = createRequire(FIXED.mirror + '/package.json'), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const passwordFile = P + '/owner-password', passwordStat = fs.lstatSync(passwordFile); assert.equal(passwordStat.mode & 0o777, 0o600); const password = ownedFile(passwordFile).toString(); assert(/^[a-f0-9]{64}$/.test(password));
fs.mkdirSync(plan.outputDirectory, { mode: 0o700 });
ctx.artifact = (name, value) => { assert.equal(path.basename(name), name); const raw = Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = ctx.priv + '/' + name; fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return { file, bytes: raw.length, rawBytesSha256: sha(raw) }; };
ctx.db = async (fn, database) => { assert(FIXED.databases.includes(database)); const client = new Client({ host: FIXED.host, port: FIXED.port, database, user: FIXED.owner, password, application_name: 'r4ghi-state-free-M98-after164', connectionTimeoutMillis: 8000, query_timeout: 45000,
  options: '-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000' }); await client.connect(); try { assert.equal((await client.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on'); await guard(ctx, client, database); return await fn(client); } finally { await client.end(); } };
try {
  const after = await capture(ctx, 'migration-after164'); assert.deepEqual(sourcePins(), pins); assert.deepEqual(currentHelperPins(), helperPins); read(plan.helperGraph); read(plan.sourcePins); read(plan.actualCommands); read(plan.approval); assert.deepEqual(ownedFile(args[1]), planRaw); assert.deepEqual(ownedFile(oldStateFile), oldStateRaw); assert(!fs.existsSync(P + '/business/g2-business13/main01/state.json'));
  const result = ctx.artifact('receipt164.json', { kind: 'actual-state-free-M98-after-observation164', plan: { file: args[1], rawBytesSha256: args[3] }, approval: plan.approval, actualCommands: plan.actualCommands, migrationBefore: plan.migrationBefore, migrationAfter: after.manifest, helperGraph: plan.helperGraph,
    sourcePins: plan.sourcePins, sourcePinsSHA256: plan.sourcePinsSHA256, sourceCount: pins.length, readOnlyConnections: true, originalSource12StateUnmodified: true, Source13StateMinted: false, comparisonOrDataBaselineMinted: false, HTTPRequests: 0, DMLOrDDLExecuted: false, G3Certified: false });
  console.log(JSON.stringify({ completed: true, observation: result, migrationAfter: after.manifest, Source13StateMinted: false, G3Certified: false }));
} catch (error) { const partial = ctx.artifact('partial164.json', { name: error.name, stack: error.stack, privateOriginalsRetained: true }); console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true, privateDetailsPublished: false })); process.exitCode = 1; }
