// Actual read-only observation after the FS-only119 publication and separateB2.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { FIXED, guard, sourcePins, ownedFile } from './business/context.mjs';
import { capture, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { assertAdmittedContext54 } from './business/consumer-admission54.mjs';
import { sha } from './business/pure.mjs';
const R = FIXED.win, P = FIXED.private, D = P + '/business/g2-business13/main01', O = D + '/tool119-post240';
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.deepEqual(process.argv.slice(2), ['--execute']); assert(!fs.existsSync(O)); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const pin = (file, expected) => { const raw = ownedFile(file); if (expected) assert.equal(sha(raw), expected); return { file, rawBytesSha256: sha(raw) }; };
const json = p => { pin(p.file, p.rawBytesSha256); return JSON.parse(ownedFile(p.file)); };
const write = (file, value) => { const raw = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return pin(file); };
const nonce = randomUUID(), lock = D + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'actual-readonly-post119-capture228' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const commandPin = pin(P + '/tool119-238-publish/command238.json', '70e65b0faa4332b278c800ddf08d31b752f3cc12ed9390fa957335d10db5927d'), command = json(commandPin); assert.equal(command.exitCode, 0); assert.equal(command.mode, 'publish');
  const published = json(command.stdout); assert.equal(published.status, 'published119'); assert.equal(published.registry.rawBytesSha256, '2047baf16b5e5fcd24ddc4aa0729c770033edc60c44f04a152315d9d3f0b03a7');
  const publication = json(published.publication); const planPin = pin(D + '/tool119-republish237/plan119-237.json', '171d9eaab71fd1c6f0e2e61c9fe9021496fb6c1788e80922a9dc108b11d5233d'), plan = json(planPin);
  assert.deepEqual(publication.approvedPlan, planPin); const stateRaw = ownedFile(D + '/state.json'), state = JSON.parse(stateRaw), entry = json(plan.entryState);
  assert.equal(sha(stateRaw), publication.publishedState.rawBytesSha256); const expected = structuredClone(entry); expected.sequence += 1; expected.toolAdmission119 = { registry: published.registry, approvedPlan: planPin }; assert.deepEqual(state, expected);
  const helpers = json(plan.H1), sources = json(plan.sourcePins); assert.equal(helpers.length, 198); assert.equal(sources.length, 416); assert.deepEqual(sourcePins(), sources);
  const identity = JSON.parse(ownedFile(FIXED.stateRoot + '/identity.json')), provision = JSON.parse(ownedFile(R + '/tmp/rust-r4ghi/root/environment01/provision01.json'));
  assert.equal(identity.marker, state.marker); assert.equal(identity.namespace, FIXED.namespace); assert.equal(provision.marker, identity.marker); assert.equal(FIXED.migrations, 98); assert.equal(FIXED.tables, 139);
  const ctx = { ...FIXED, identity, provision, epoch: state.epoch, run: state.run, priv: D, state, pins: sources, helperPins: helpers };
  assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true });
  const require = createRequire(FIXED.mirror + '/package.json'), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg'); const password = ownedFile(P + '/owner-password').toString(); assert(/^[a-f0-9]{64}$/.test(password));
  ctx.db = async (fn, database) => { assert(FIXED.databases.includes(database)); const client = new Client({ host: FIXED.host, port: FIXED.port, database, user: FIXED.owner, password, application_name: 'r4ghi-post119-readonly240', connectionTimeoutMillis: 8000, query_timeout: 45000,
    options: '-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000' }); await client.connect();
    try { assert.equal((await client.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on'); await guard(ctx, client, database); return await fn(client); } finally { await client.end(); } };
  fs.mkdirSync(O, { mode: 0o700 }); const stateCopy = write(O + '/published-state-at240.json', stateRaw);
  const observation = { ...ctx, priv: O, artifact: (name, value) => { assert.equal(path.basename(name), name); return write(O + '/' + name, { ...value, namespace: FIXED.namespace, namespaceAnnotationProducer: 'actual-readonly-post119-240' }); } };
  const current = await capture(observation, 'tool119-post240'); assertRecorded(ctx, current); const before = json(plan.beforeSnapshot), afterPrePublication = json(plan.afterSnapshot), counts = {};
  for (const database of FIXED.databases) {
    for (const original of [before, afterPrePublication]) { assert.deepEqual(current.databases[database].meta, original.databases[database].meta); assert.deepEqual(current.objects[database], original.objects[database]);
      assert.deepEqual(Object.keys(current.databases[database].tables), Object.keys(original.databases[database].tables));
      for (const table of Object.keys(current.databases[database].tables)) assert.deepEqual(readRows(current.databases[database].tables[table]), readRows(original.databases[database].tables[table])); }
    counts[database] = Object.values(current.databases[database].tables).reduce((n, t) => n + t.count, 0);
  }
  for (const item of [...sources, ...helpers]) assert.equal(sha(ownedFile(R + '/' + item.file)), item.sha256);
  for (const p of [plan.baseRegistry, plan.baseB0, plan.baseB1, plan.H0, plan.sourcePins]) pin(p.file, p.rawBytesSha256);
  assert.deepEqual(ownedFile(D + '/state.json'), stateRaw); assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true });
  const receipt = write(O + '/receipt240.json', { kind: 'actual-readonly-post119-publication-full-data-and-metadata-conservation240', publicationCommand: commandPin,
    publication: published.publication, registry119: published.registry, approvedPlan: planPin, publishedState: stateCopy, before: plan.beforeSnapshot, secondPrePublication: plan.afterSnapshot,
    actualPostPublicationSnapshot: current.manifest, counts, all139TablesEachDatabaseRawXminMetaSequencesObjectsUnchanged: true,
    originalR3B0B1H0AndSource416Preserved: true, metadataDeltaOnly119AndCounterPlusOne: true, helperH1Count: helpers.length, helperH1: plan.H1,
    currentAPIProcessIdentityChecked: true, defaultTransactionReadOnly: true, createContextOrPersistCalled: false, SQLDMLOrDDL: false, HTTP: false, G3Certified: false, G4Certified: false });
  console.log(JSON.stringify({ receipt, actualPostPublicationSnapshot: current.manifest, publishedState: stateCopy, counts, fullPostPublicationEquivalence: true, metadataDeltaOnly119AndCounterPlusOne: true, HTTPOrDMLExecuted: false, G3Certified: false }));
} catch (error) { if (!fs.existsSync(O)) fs.mkdirSync(O, { mode: 0o700 }); const partial = write(O + '/partial240.json', { name: error.name, message: error.message, stack: error.stack, noBlindRetry: true }); console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true })); process.exitCode = 1; }
finally { const owner = JSON.parse(ownedFile(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
