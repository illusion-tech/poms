import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createContext, ownedFile } from './business/context.mjs';
import { sha } from './business/pure.mjs';
import { capture, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'retain-existing-real-epoch12-before-source13-139' }) + '\n', { flag: 'wx', mode: 0o600 });
const out = `${ctx.private}/retention/epoch12-before-source13-139`;
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(out), out);
const filePin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
try {
  assert(!ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleanupPlan && !ctx.state.cleaned && !ctx.state.retention139);
  assert.equal(sha(JSON.stringify(ctx.pins)), '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
  const eoId = ctx.state.fixtures.uiFixtureViews23.eo.pause.result.projectId;
  assert(ctx.state.fixtures.uiFixtureViews23.eo.UICommandObserved && ctx.state.fixtures.uiFixtureViews23.own.UICommandObserved);
  assert(ctx.state.fixtures.uiFormFixtureViews18['role-create'].UICommandObserved && ctx.state.fixtures.uiFormFixtureViews18['gh-capture'].UICommandObserved);
  assert(ctx.state.uiExpense18Receipts?.[eoId] && ctx.state.uiLifecycle18Receipts?.[eoId], 'Finish the authorized real forms before advancing product/schema');
  const native = JSON.parse(fs.readFileSync(ctx.private + '/native-reference92/source12-native01/state.json')); assert.equal(native.phase, 'cleaned-conserved-by-92-02');

  const p = ctx.state.apiProcess.record;
  assert.equal(p.pid, 108720); assert.equal(p.binarySha256, 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff');
  const processStat = fs.readFileSync(`/proc/${p.pid}/stat`, 'utf8');
  assert.equal(processStat.slice(processStat.lastIndexOf(') ') + 2).split(' ')[19], p.startTime);
  assert.equal(fs.realpathSync(`/proc/${p.pid}/exe`), p.binary); assert.equal(sha(fs.readFileSync(p.binary)), p.binarySha256);
  const binary = `${out}/api135.binary`; fs.copyFileSync(p.binary, binary, fs.constants.COPYFILE_EXCL); fs.chmodSync(binary, 0o600);
  assert.equal(filePin(binary).rawBytesSha256, p.binarySha256);
  const helperSources = [];
  for (const pin of ctx.helperPins) {
    assert(/^tools\/rust-r4ghi\/business\/[A-Za-z0-9_.-]+\.(mjs|json)$/.test(pin.file));
    const source = ctx.win + '/' + pin.file; assert.equal(sha(fs.readFileSync(source)), pin.sha256);
    const target = out + '/helper-sources/' + pin.file; fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL); fs.chmodSync(target, 0o600); assert.equal(filePin(target).rawBytesSha256, pin.sha256);
    helperSources.push({ original: pin, retained: filePin(target) });
  }
  const stop = spawnSync(process.execPath, [`${ctx.win}/tools/rust-r4ghi/api-runtime01.mjs`, 'stop', '135'], { cwd: ctx.win, encoding: 'utf8', timeout: 20000 });
  fs.writeFileSync(`${out}/api-stop-stdout.log`, stop.stdout ?? '', { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(`${out}/api-stop-stderr.log`, stop.stderr ?? '', { flag: 'wx', mode: 0o600 });
  assert.equal(stop.status, 0); const stopped = JSON.parse(stop.stdout); assert.equal(stopped.pid, p.pid); assert.equal(stopped.processGone, true);
  const inspection = spawnSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'container', 'inspect', ctx.identity.container], { encoding: 'utf8', timeout: 15000 });
  assert.equal(inspection.status, 0); const container = JSON.parse(inspection.stdout)[0];
  assert.equal(container.Config.Labels['org.poms.scope'], ctx.namespace); assert.equal(container.Config.Labels['org.poms.base'], ctx.base);
  assert(container.State.Running && container.Mounts.some(m => m.Name === ctx.identity.volume));
  assert(container.NetworkSettings.Ports['15432/tcp'].some(x => x.HostIp === '127.0.0.1' && x.HostPort === '25434'));
  const before = await capture(ctx, ctx.next('retained139-before')); assertRecorded(ctx, before);
  const password = ownedFile(`${ctx.private}/owner-password`).toString(); assert(/^[a-f0-9]{64}$/.test(password));
  const archives = [];
  for (const database of ctx.databases) {
    const archive = `${out}/${database}.dump`, stderr = `${out}/${database}-dump-stderr.log`;
    const fd = fs.openSync(archive, 'wx', 0o600), errors = fs.openSync(stderr, 'wx', 0o600);
    let result;
    try { result = spawnSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'exec', '--env', 'PGPASSWORD', ctx.identity.container,
      'pg_dump', '--format=custom', '--no-owner', '--no-password', '--host=/run/postgresql', '--port=15432', '--username=poms_r0e_owner', `--dbname=${database}`],
    { env: { ...process.env, PGPASSWORD: password }, stdio: ['ignore', fd, errors], timeout: 60000 }); }
    finally { fs.closeSync(fd); fs.closeSync(errors); }
    assert.equal(result.status, 0, 'Private PG15 archive failed; original namespace remains retained');
    assert.equal(fs.readFileSync(archive).subarray(0, 5).toString(), 'PGDMP');
    const list = `${out}/${database}-toc.txt`, listErrors = `${out}/${database}-toc-stderr.log`;
    const input = fs.openSync(archive, 'r'), output = fs.openSync(list, 'wx', 0o600), err = fs.openSync(listErrors, 'wx', 0o600);
    let checked;
    try { checked = spawnSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'exec', '-i', ctx.identity.container, 'pg_restore', '--list'],
      { stdio: [input, output, err], timeout: 60000 }); }
    finally { fs.closeSync(input); fs.closeSync(output); fs.closeSync(err); }
    assert.equal(checked.status, 0, 'Archive table-of-contents validation failed; do not claim restore certification');
    archives.push({ database, archive: filePin(archive), toc: filePin(list), restoreActuallyExecuted: false, restoredXminPreservationClaimed: false });
  }
  const objects = [];
  for (const database of ctx.databases) {
    for (const item of before.objects[database].files) {
      assert(item.file.startsWith(before.objects[database].root + '/'));
      assert.equal(sha(fs.readFileSync(item.file)), item.sha256);
      const target = path.resolve(out, 'objects', database, item.key); assert(target.startsWith(out + '/objects/' + database + '/'));
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 }); fs.copyFileSync(item.file, target, fs.constants.COPYFILE_EXCL); fs.chmodSync(target, 0o600);
      assert.equal(sha(fs.readFileSync(target)), item.sha256); objects.push({ database, key: item.key, original: item.file, copy: filePin(target) });
    }
  }
  const after = await capture(ctx, ctx.next('retained139-after')); assertRecorded(ctx, after);
  const identities = item => readRows(item).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
  for (const database of ctx.databases) {
    for (const table of Object.keys(before.databases[database].tables)) assert.deepEqual(identities(before.databases[database].tables[table]), identities(after.databases[database].tables[table]));
    assert.deepEqual(before.databases[database].meta, after.databases[database].meta); assert.deepEqual(before.objects[database], after.objects[database]);
  }
  const receipt = ctx.artifact(`${ctx.next('retention139-complete')}.json`, { kind: 'actual-source12-candidate-and-real-data-retained-before-corrective-consumer',
    producerEpoch: ctx.epoch, marker: ctx.identity.marker, before: before.manifest, after: after.manifest, binary: filePin(binary), stoppedAPI: stopped,
    containerId: container.Id, volumeRetained: ctx.identity.volume, archives, objects, allRowsXminCatalogSequencesObjectsUnchangedByBackup: true,
    privateOriginalsRetainedInPlace: true, oldSourcePinsRetained: ctx.pins, newConsumerAdmissionStillRequired: true,
    databaseRestoreExecuted: false, currentSourceRebound: false, historicalFactsBackfilled: false, G3Certified: false, G4Certified: false },
  { kind: 'actual-source12-candidate-and-data-retained', originalCandidateStopped: true, databases: archives.length, objectCopies: objects.length,
    databaseRestoreExecuted: false, businessRowsAndXminUnchanged: true, originalEpochRebound: false, privateCredentialsPublished: false, G3Certified: false });
  ctx.state.retention139 = receipt; ctx.persist();
  const frozenState = `${out}/state-at-retention139.json`; fs.writeFileSync(frozenState, JSON.stringify(ctx.state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const index = { kind: 'private-retained-source12-material-index139', producerEpoch: ctx.epoch, run: ctx.run, marker: ctx.identity.marker,
    receipt, frozenState: filePin(frozenState), baseline: ctx.state.baseline, retainedSnapshot: after.manifest, binary: filePin(binary), archives, objects, helperSources };
  fs.writeFileSync(`${out}/index.json`, JSON.stringify(index, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const indexPin = filePin(`${out}/index.json`);
  fs.writeFileSync(`${ctx.win}/docs/design/rust-r4ghi/retained-source12-before-source13-139.json`, JSON.stringify({ kind: index.kind,
    producerEpoch: ctx.epoch, sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), frozenSourcePacket: 'docs/design/rust-r4ghi/retention/final12-source140/receipt.json',
    privateIndex: indexPin, frozenState: filePin(frozenState), retainedSnapshot: after.manifest, retainedBinarySHA256: p.binarySha256,
    databaseArchives: archives.map(x => ({ database: x.database, bytes: x.archive.bytes, rawBytesSha256: x.archive.rawBytesSha256, tocChecked: true })),
    originalDatabaseVolumeRetained: true, allDataAndXminUnchanged: true, originalPrivateEvidenceRetained: true, API135Stopped: true,
    databaseRestoreExecuted: false, originalSourceEpochRebound: false, newConsumerAdmissionStillRequired: true, periodAcceptancePassed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: 'retained', databases: archives.length, objectCopies: objects.length, privateIndex: indexPin,
    API135Stopped: true, businessRowsAndXminUnchanged: true, originalEpochRebound: false, G3Certified: false }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('retention139-partial')}.json`, { name: error.name, message: error.message, stack: error.stack }); ctx.persist();
  console.error(JSON.stringify({ status: 'failed-or-partial', privateOriginal: original, originalsMustBeRetained: true })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
