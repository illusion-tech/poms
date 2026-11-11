// Root-only, explicitly approved state-free observation. Importing this file has no effects.
// retain14 deliberately has no dependency on an unpromoted Source15 module.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CAPTURE15 = Object.freeze({
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  mirror: '/home/wangzishi/projects/poms-rust-r4ghi',
  namespace: 'poms-r4ghi', run: 'main01', tables: 139, migrations: 98,
  archive344SHA: '0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77',
  state14SHA: 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97',
  source14SHA: '1e1847f7163cd3a530448d1c5d0297055ef09ef1033c596f59b827f7b58ac573',
  helper14SHA: 'ad317f729c087788761b6a7eecc3a9db042f64d98231d5ab0e8fa1dd0dbea433',
});
const sha = value => createHash('sha256').update(value).digest('hex');
const d14 = CAPTURE15.private + '/business/g2-business14/main01';
const d15 = CAPTURE15.private + '/business/g2-business15/main01';
export function strictPinCapture15(pin) {
  assert(pin && typeof pin.file === 'string' && pin.file.startsWith('/') && !pin.file.includes('\\'));
  assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  assert.equal(path.resolve(pin.file), pin.file, 'Canonical native Linux path required');
  const stat = fs.lstatSync(pin.file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Regular single-link receipt/source required');
  assert.equal(fs.realpathSync(pin.file), pin.file, 'No redirected input');
  const bytes = fs.readFileSync(pin.file);
  assert.equal(sha(bytes), pin.rawBytesSha256, 'Input bytes differ');
  if (pin.bytes !== undefined) assert.equal(bytes.length, pin.bytes);
  return bytes;
}
const read = pin => JSON.parse(strictPinCapture15(pin));
const pinOf = file => { const bytes = fs.readFileSync(file); const pin = { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; strictPinCapture15(pin); return pin; };
const same = (a, b) => { assert(a && b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
const below = (root, file) => { assert(file.startsWith(root + '/')); assert.equal(path.resolve(file), file); };
function relative(file) { assert(typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\')); assert(file.split('/').every(x => x && x !== '.' && x !== '..')); return file; }
export function verifyCodeCapture15(root, pins) {
  assert(Array.isArray(pins) && pins.length > 0);
  assert.equal(new Set(pins.map(p => p.file)).size, pins.length);
  assert.deepEqual(pins.map(p => p.file), pins.map(p => p.file).sort());
  for (const p of pins) strictPinCapture15({ file: root + '/' + relative(p.file), rawBytesSha256: p.sha256 });
  return pins;
}
export function actualHelpersCapture15(root) {
  const directory = root + '/tools/rust-r4ghi/business';
  return fs.readdirSync(directory).filter(n => /\.(mjs|json)$/.test(n)).sort().map(name => {
    const file = directory + '/' + name, pin = pinOf(file);
    return { file: 'tools/rust-r4ghi/business/' + name, sha256: pin.rawBytesSha256 };
  });
}
export function regularTreeCapture15(root) {
  assert.equal(fs.realpathSync(root), root);
  const found = [], walk = directory => {
    const s = fs.lstatSync(directory); assert(s.isDirectory() && !s.isSymbolicLink()); assert.equal(fs.realpathSync(directory), directory);
    for (const name of fs.readdirSync(directory).sort()) {
      const file = directory + '/' + name, stat = fs.lstatSync(file); assert(!stat.isSymbolicLink());
      if (stat.isDirectory()) walk(file); else { assert(stat.isFile() && stat.nlink === 1); found.push(file.slice(root.length + 1)); }
    }
  };
  walk(root); return found.sort();
}
export function rowsCapture15(meta) {
  const rows = strictPinCapture15(meta).toString().split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.equal(rows.length, meta.count);
  for (const r of rows) { assert.equal(sha(r.raw), r.sha256); assert(Array.isArray(r.key)); assert(typeof r.xmin === 'string'); }
  return rows;
}
export function assertCaptureApproval15(inputPin, input, approval) {
  assert.equal(input.kind, 'Root-source15-admission119-state-free-capture-input');
  assert(['retain14', 'observe15'].includes(input.mode));
  assert.equal(input.namespace, CAPTURE15.namespace); assert.equal(input.run, CAPTURE15.run);
  assert.equal(approval.kind, 'Root-exact-state-free-capture-source15-119');
  same(approval.input, inputPin); assert.equal(approval.mode, input.mode);
  assert.equal(approval.authorizesDefaultReadOnlyCapture, true);
  for (const k of ['stateMinted', 'domainHTTP', 'DML', 'migration', 'processControl', 'ordinaryContextCreated']) assert.equal(approval[k], false);
  for (const k of ['state13', 'state14', 'ownership14', 'sourcePins', 'helperPins', 'identity', 'provision', 'archive344']) same(approval[k], input[k]);
  assert.deepEqual(approval.http14Attempts, input.http14Attempts);
  assert.equal(approval.independentCodeReview.rawBytesSha256, input.tooling.independentCodeReview.rawBytesSha256);
}
function verifyTooling(input) {
  assert.equal(input.tooling.capture.file, fileURLToPath(import.meta.url));
  strictPinCapture15(input.tooling.capture);
  const manifest = read(input.tooling.manifest), review = read(input.tooling.independentCodeReview);
  assert.equal(manifest.kind, 'source15-admission119-code-candidate');
  assert(manifest.production.some(p => p.file === 'tools/rust-r4ghi/source15-admission119/capture-source15.mjs' && p.afterSHA256 === input.tooling.capture.rawBytesSha256));
  same(review.toolingManifest, input.tooling.manifest);
  assert.equal(review.retain14CodeReady, true); assert.equal(review.actualG2Authorized, false);
  assert.equal(review.kind, 'non-author-source15-admission119-code-review');
}
function binaryFile(pin, facts) {
  const f = facts.find(x => x.file === pin.file); same(f, pin);
  const s = fs.lstatSync(pin.file, { bigint: true });
  assert(s.isFile() && !s.isSymbolicLink()); assert.equal(fs.realpathSync(pin.file), pin.file);
  assert.equal(s.dev.toString(), f.dev); assert.equal(s.ino.toString(), f.ino); assert.equal(Number(s.nlink), f.nlink);
  assert.equal(sha(fs.readFileSync(pin.file)), pin.rawBytesSha256);
}
export function parseProcCapture15(text) {
  const left = text.indexOf(' ('), right = text.lastIndexOf(') ');
  assert(left > 0 && right > left);
  const tail = text.slice(right + 2).trim().split(/\s+/);
  assert(tail.length >= 20 && /^\d+$/.test(tail[19]));
  return { pid: Number(text.slice(0, left)), startTime: tail[19] };
}
function processProof(input, live) {
  const record = read(input.apiProcess);
  assert.equal(record.namespace, CAPTURE15.namespace); assert.equal(record.root, CAPTURE15.mirror); assert.equal(record.port, 31441);
  assert(Number.isSafeInteger(record.pid) && record.pid > 1);
  assert.equal(record.binary, input.apiBinary.file); assert.equal(record.binarySha256, input.apiBinary.rawBytesSha256);
  const generation = input.mode === 'retain14' ? 'ROOT14' : 'ROOT15';
  for (const p of [input.apiBinary, input.summaryBinary]) { below('/home/wangzishi/.cache/poms-r4ghi-target-' + generation, p.file); binaryFile(p, input.binaryFiles); }
  if (live) {
    assert.deepEqual(parseProcCapture15(fs.readFileSync('/proc/' + record.pid + '/stat', 'utf8')), { pid: record.pid, startTime: record.startTime });
    assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), record.bootId);
    assert.equal(fs.realpathSync('/proc/' + record.pid + '/exe'), record.binary);
    assert.equal(fs.realpathSync('/proc/' + record.pid + '/cwd'), record.root);
  }
  return record;
}
function checkState14(input) {
  assert.equal(input.state14.file, d14 + '/state.json'); assert.equal(input.state14.rawBytesSha256, CAPTURE15.state14SHA);
  const state = read(input.state14);
  assert.equal(state.namespace, CAPTURE15.namespace); assert.equal(state.epoch, 'g2-business14'); assert.equal(state.run, CAPTURE15.run); assert.equal(state.sequence, 24);
  assert.equal(state.taxContinuation13?.mainCompletion?.status, 201);
  assert.equal(state.taxContinuation13.mainCompletion.postconditions, 'verified');
  assert(!state.taxContinuation14?.sweep?.finalSuccess, 'This retention may not erase a newly submitted Tax command');
  same(state.consumerAdmission54.registry, input.registry4); same(state.codeEpochAdmission252.registry, input.registry4);
  return state;
}
function verifyArchive(input, sources, helpers) {
  assert.equal(input.archive344.rawBytesSha256, CAPTURE15.archive344SHA);
  const a = read(input.archive344); assert.equal(a.kind, 'actual-source14-input-preservation344');
  assert.equal(a.root, CAPTURE15.root); assert.equal(a.sourceCount, 420); assert.equal(a.compileCount, 528); assert.equal(a.helperCount, 218);
  same(a.manifests.sources, input.source14); same(a.manifests.compiles, input.compile14); same(a.manifests.helpers, input.helper14);
  assert.equal(a.sourcePinsSHA256, 'f99501c14e52968dbda47dde1243597e32b24e8433e90669d9aea8c5bdf3cf1d');
  assert.equal(a.files.length, 746); assert.equal(new Set(a.files.map(x => x.relative)).size, 746);
  // The actual archive has an explicit original/archive map; no ctx.win redirection.
  const expected = new Map([...read(input.compile14), ...read(input.helper14)].map(p => [p.file, p.sha256]));
  assert.equal(expected.size, 746); assert.equal(read(input.compile14).length, 528); assert.equal(read(input.helper14).length, 218);
  for (const leaf of a.files) {
    relative(leaf.relative); assert.equal(leaf.original.file, CAPTURE15.root + '/' + leaf.relative);
    assert.equal(leaf.archive.file, a.archiveRoot + '/tree/' + leaf.relative);
    assert.equal(leaf.original.rawBytesSha256, expected.get(leaf.relative)); sameHash(leaf.original, leaf.archive);
    strictPinCapture15(leaf.original); strictPinCapture15(leaf.archive);
  }
  assert.deepEqual(new Set(a.files.map(x => x.relative)), new Set(expected.keys()));
  assert.deepEqual(regularTreeCapture15(a.archiveRoot + '/tree'), [...expected.keys()].sort(), 'Archive tree may not contain unregistered files');
  for (const s of sources) assert.equal(expected.get(s.file), s.sha256);
  assert.deepEqual(helpers, read(input.helper14));
  const review = read(input.archive344Review);
  assert.equal(input.archive344Review.rawBytesSha256, '6a0341fd2176e5d8d1625d3a2dde6ac3f083732edfc49f77b7f3818385781ef3');
  // Independently signed preservation is an additional input, not a substitute for the leaf reads above.
  assert(JSON.stringify(review).includes(CAPTURE15.archive344SHA));
  return a;
}
export function verifyHTTP14Capture15(state, attempts) {
  assert(Array.isArray(attempts) && attempts.length === 10, 'Exact ten real Source14 HTTP attempts required');
  const out = CAPTURE15.root + '/tmp/rust-r4ghi/business/g2-business14/main01';
  assert.deepEqual(attempts.map(x => x.file), fs.readdirSync(out).filter(n => /^\d{6}-http-http\.json$/.test(n)).sort().map(n => out + '/' + n));
  let auth = null;
  for (const pin of attempts) {
    const http = read(pin), cfg = read(http.originals.requestConfig);
    assert.equal(http.kind, 'actual-business-HTTP-attempt'); assert.equal(http.status, 200);
    assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
    assert(typeof http.requestId === 'string' && http.requestId.startsWith(state.prefix + '-') && /^[A-Za-z0-9_-]{1,100}$/.test(http.requestId));
    assert.equal(cfg.requestId, http.requestId); assert.equal(cfg.headers?.['X-Request-Id'], http.requestId);
    assert.equal(cfg.operationId, http.operationId); assert.equal(cfg.method, http.method);
    assert(cfg.url.startsWith('http://127.0.0.1:31441/api/'));
    for (const p of Object.values(http.originals)) { below(d14, p.file); strictPinCapture15(p); }
    assert.equal(read(http.originals.responseHeaders).status, 200);
    if (http.method === 'POST') {
      assert.equal(auth, null, 'Exactly one actual login POST');
      assert.equal(http.operationId, 'AuthController_createPasswordAuthSession'); auth = http;
    } else assert.equal(http.method, 'GET', 'No Source14 domain command may be hidden by retention');
  }
  assert(auth);
  const owned = Object.values(state.owned).filter(x => x.table === 'auth_session' && x.proof?.requestId === auth.requestId);
  assert.equal(owned.length, 1); const proof = owned[0].proof;
  assert.equal(proof.status, 200); assert.equal(proof.transport, 'HTTP'); assert.equal(proof.responseComplete, true); assert.equal(proof.beforeAbsent, true);
  assert.equal(proof.operationId, auth.operationId);
  return { attempts: structuredClone(attempts), loginRequestId: auth.requestId, loginPOSTStatus: 200, domainPOSTs: 0 };
}
const sameHash = (a, b) => { assert.equal(a.rawBytesSha256, b.rawBytesSha256); assert.equal(a.bytes, b.bytes); };
function artifactWriter(folder) {
  return (name, value) => {
    assert.equal(path.basename(name), name); assert(!name.includes('\\'));
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n');
    const file = folder + '/' + name; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return pinOf(file);
  };
}
function assertNoConcurrentDrivers() {
  for (const epoch of ['g2-business13', 'g2-business14', 'g2-business15']) assert(!fs.existsSync(CAPTURE15.private + '/business/' + epoch + '/main01/driver.lock'), 'Another driver is active');
}
export async function runCapture15(inputPin, approvalPin) {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0');
  assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.deepEqual(process.execArgv, []);
  below(CAPTURE15.private, inputPin.file); below(CAPTURE15.private, approvalPin.file);
  const input = read(inputPin), approval = read(approvalPin);
  assertCaptureApproval15(inputPin, input, approval); verifyTooling(input);
  const sources = read(input.sourcePins), helpers = read(input.helperPins);
  verifyCodeCapture15(CAPTURE15.root, sources); verifyCodeCapture15(CAPTURE15.root, helpers);
  assert.deepEqual(actualHelpersCapture15(CAPTURE15.root), helpers);
  assert.equal(sha(JSON.stringify(sources)), input.sourcePinsSHA256);
  assert.equal(sources.length, input.sourceCount);
  const stateRaw = strictPinCapture15(input.state14), state = checkState14(input);
  const state13Raw = strictPinCapture15(input.state13);
  assert.equal(input.state13.file, CAPTURE15.private + '/business/g2-business13/main01/state.json');
  assert.equal(input.state13.rawBytesSha256, 'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4');
  const actualHTTP14 = verifyHTTP14Capture15(state, input.http14Attempts);
  const ownershipRaw = strictPinCapture15(input.ownership14);
  assert.equal(input.ownership14.file, d14 + '/ownership.jsonl');
  assert.equal(input.ownership14.rawBytesSha256, '559aa091ba9cfa1ef1c72dd2a7c4d21c8d4285588519de937e6db2b2efd6aa79');
  if (input.mode === 'retain14') {
    same(input.sourcePins, input.source14); same(input.helperPins, input.helper14);
    assert.equal(input.sourcePins.rawBytesSha256, CAPTURE15.source14SHA); assert.equal(sources.length, 420);
    assert.equal(input.helperPins.rawBytesSha256, CAPTURE15.helper14SHA); assert.equal(helpers.length, 218);
    verifyArchive(input, sources, helpers);
  } else {
    assert(!fs.existsSync(d15 + '/state.json'), 'State-free observation cannot consume an already minted epoch');
    assert(input.plan && input.finalRetention14); strictPinCapture15(input.finalRetention14);
  }
  assertNoConcurrentDrivers();
  const directory = input.mode === 'retain14' ? d14 : d15;
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(directory), directory);
  const nonce = randomUUID(), lock = directory + '/driver.lock';
  const lockBody = { kind: 'source15-admission119-readonly-lock', pid: process.pid, nonce, mode: input.mode, input: inputPin, approval: approvalPin };
  fs.writeFileSync(lock, JSON.stringify(lockBody) + '\n', { flag: 'wx', mode: 0o600 });
  let folder, artifact;
  try {
    // Nothing from the current runtime is imported until every helper has been checked.
    const { FIXED, sourcePins, guard } = await import(pathToFileURL(CAPTURE15.root + '/tools/rust-r4ghi/business/context.mjs').href);
    const { capture } = await import(pathToFileURL(CAPTURE15.root + '/tools/rust-r4ghi/business/snapshot.mjs').href);
    const { assertRecorded } = await import(pathToFileURL(CAPTURE15.root + '/tools/rust-r4ghi/business/ledger.mjs').href);
    const { assertDataEqual252, assertPublishIdle252, verifyRetainedMain252 } = await import(pathToFileURL(CAPTURE15.root + '/tools/rust-r4ghi/business/same-m98-code-core252.mjs').href);
    assert.equal(FIXED.private, CAPTURE15.private); assert.equal(FIXED.win, CAPTURE15.root); assert.deepEqual(sourcePins(), sources);
    assertPublishIdle252(state);
    const identity = read(input.identity), provision = read(input.provision);
    for (const [k, v] of Object.entries({ namespace: FIXED.namespace, base: FIXED.base, container: 'poms-r4ghi-pg15', volume: 'poms-r4ghi-pg15-data', port: FIXED.port })) assert.equal(identity[k], v);
    assert.deepEqual(identity.databases, FIXED.databases); assert.equal(state.marker, identity.marker);
    for (const k of ['namespace', 'marker', 'container', 'volume']) assert.equal(provision[k], identity[k]);
    assert(Array.isArray(provision.databaseOids) && provision.databaseOids.length === 2);
    const baseCtx = { ...FIXED, epoch: 'g2-business14', run: CAPTURE15.run, priv: d14, state, pins: state.sourcePins, helperPins: read(input.helper14), identity, provision };
    assert.deepEqual(strictPinCapture15(input.state14), stateRaw); assert.deepEqual(strictPinCapture15(input.ownership14), ownershipRaw);
    assert.deepEqual(strictPinCapture15(input.state13), state13Raw);
    const registry4 = read(input.registry4), priorIndex = read(registry4.retentionIndex), parent13 = read(registry4.producerState);
    assert.equal(registry4.producerState.rawBytesSha256, input.state13.rawBytesSha256);
    const command = priorIndex.commands.find(x => x.pointer === '/taxContinuation13/mainCompletion'); assert(command);
    const Main13Bridge = { record: verifyRetainedMain252({ state: parent13, current: state, entry: command, receipt: command.original, database: FIXED.database, readJSON: read, readRows: rowsCapture15 }),
      producerEpoch: 'g2-business13', producerState: registry4.producerState, retainedThrough14: input.state14, original: command.original, replayForbidden: true, currentConsumerCertified: false };
    let bookend, retention = null;
    if (input.mode === 'retain14') {
      const plan14 = read(registry4.approvedPlan);
      for (const [a, b] of [[input.apiProcess, plan14.consumer.apiProcess], [input.apiBinary, plan14.consumer.binary], [input.summaryBinary, plan14.consumer.summaryBinary]]) same(a, b);
      assert.deepEqual(input.binaryFiles, plan14.consumer.binaryFiles);
      assert.deepEqual(sources, read(plan14.consumer.sourcePins)); assert.deepEqual(helpers, read(plan14.consumer.helperPins));
      const { assertCodeEpochContext252 } = await import(pathToFileURL(CAPTURE15.root + '/tools/rust-r4ghi/business/same-m98-code-admission252.mjs').href);
      bookend = () => assertCodeEpochContext252(baseCtx, registry4, { liveProcess: true, sourceFiles: true });
    } else {
      const { verifyPlan15 } = await import(pathToFileURL(CAPTURE15.root + '/tools/rust-r4ghi/business/source15-admission.mjs').href);
      const plan15 = read(input.plan);
      for (const [a, b] of [[input.apiProcess, plan15.consumer.apiProcess], [input.apiBinary, plan15.consumer.binary], [input.summaryBinary, plan15.consumer.summaryBinary], [input.finalRetention14, plan15.parent14.finalRetention14]]) same(a, b);
      assert.deepEqual(input.binaryFiles, plan15.consumer.binaryFiles);
      assert.deepEqual(sources, read(plan15.consumer.sourcePins)); assert.deepEqual(helpers, read(plan15.consumer.helperPins));
      bookend = () => verifyPlan15(input.plan, { stage: 'pre-observe' });
      retention = read(input.finalRetention14);
    }
    bookend(); processProof(input, true);
    folder = directory + '/retained-capture119-' + nonce; fs.mkdirSync(folder, { mode: 0o700 }); artifact = artifactWriter(folder);
    const frozenState = artifact('state-final-source14.json', stateRaw), frozenOwnership = artifact('ownership-final-source14.jsonl', ownershipRaw);
    const password = strictPinCapture15(input.ownerPassword).toString(); assert.equal(input.ownerPassword.file, CAPTURE15.private + '/owner-password'); assert(/^[a-f0-9]{64}$/.test(password));
    const require = createRequire(FIXED.mirror + '/package.json'), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const ctx = { ...baseCtx, epoch: input.mode === 'retain14' ? 'g2-business14' : 'g2-business15', priv: folder, pins: sources, helperPins: helpers, artifact };
    ctx.db = async (fn, database = FIXED.database) => {
      assert(FIXED.databases.includes(database));
      const client = new Client({ host: FIXED.host, port: FIXED.port, user: FIXED.owner, password, database, application_name: 'source15-119-default-readonly', connectionTimeoutMillis: 8000, query_timeout: 45000,
        options: '-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000' });
      await client.connect();
      try { await guard(ctx, client, database); assert.equal((await client.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on'); return await fn(client); }
      finally { await client.end(); }
    };
    const a = await capture(ctx, 's15-ret-' + nonce + '-a'), b = await capture(ctx, 's15-ret-' + nonce + '-b');
    const conservation = assertDataEqual252(a, b, rowsCapture15);
    // Assertions read the real old ledger and frozen state. They never register new ownership.
    assertRecorded({ ...baseCtx, priv: d14 }, a); assertRecorded({ ...baseCtx, priv: d14 }, b);
    if (retention) for (const observed of [a, b]) assertDataEqual252(read(retention.retainedSnapshot), observed, rowsCapture15);
    assert.deepEqual(strictPinCapture15(input.state14), stateRaw); assert.deepEqual(strictPinCapture15(input.ownership14), ownershipRaw);
    assert.deepEqual(strictPinCapture15(input.state13), state13Raw); assert.deepEqual(verifyHTTP14Capture15(state, input.http14Attempts), actualHTTP14);
    assert.deepEqual(sourcePins(), sources); assert.deepEqual(actualHelpersCapture15(CAPTURE15.root), helpers);
    bookend(); processProof(input, true);
    const receipt = artifact(input.mode === 'retain14' ? 'retention-final-source14-M98.json' : 'fresh15-M98-observations.json', {
      kind: input.mode === 'retain14' ? 'actual-final-source14-M98-retention119' : 'actual-source15-state-free-M98-observation119',
      namespace: CAPTURE15.namespace, producerEpoch: 'g2-business14', consumerEpoch: 'g2-business15', run: CAPTURE15.run, marker: state.marker,
      finalRetainedPoint: input.mode === 'retain14', diagnosticOnly: false, frozenState: frozenState, frozenOwnership,
      stableObservations: [a.manifest, b.manifest], retainedSnapshot: b.manifest, sourcePins: input.sourcePins, helperPins: input.helperPins,
      archive344: input.archive344, archive344Review: input.archive344Review, registry4: input.registry4, apiProcess: input.apiProcess,
      apiBinary: input.apiBinary, summaryBinary: input.summaryBinary, binaryFiles: input.binaryFiles,
      finalRetention14: input.finalRetention14 ?? null, input: inputPin, approval: approvalPin, tooling: input.tooling,
      actualHTTP14, preservedSource13: input.state13,
      resources: registry4.fixtureAdmissions, Main13Bridge: { ...Main13Bridge, retainedThrough14: frozenState },
      original14Sequence: state.sequence, Source13Complete: false, successfulTaxPreparation14: false, authPOSTStatus: 200,
      conservation, stateMinted: false, noDomainHTTP: true, noStateRewrite: true, noMigration: true, noBusinessBaselineReset: true,
      Source15Admitted: false, G3Certified: false, G4Certified: false,
    });
    console.log(JSON.stringify({ receipt, stateMinted: false, Source15Admitted: false }));
    return receipt;
  } catch (error) {
    if (artifact) { const partial = artifact('partial119.json', { kind: 'partial-state-free-capture119', input: inputPin, approval: approvalPin, message: error.message, completed: false, finalRetainedPoint: false, blindRetryForbidden: true }); console.error(JSON.stringify({ partial })); }
    throw error;
  } finally {
    assert.deepEqual(read(pinOf(lock)), lockBody); fs.unlinkSync(lock);
  }
}
export async function mainCapture15(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') { console.log('Root only: --input FILE --input-sha SHA --approval FILE --approval-sha SHA --execute; retain14|observe15. No ordinary context/state publication.'); return; }
  assert.equal(args.length, 9); assert.deepEqual([args[0], args[2], args[4], args[6], args[8]], ['--input', '--input-sha', '--approval', '--approval-sha', '--execute']);
  return runCapture15({ file: args[1], rawBytesSha256: args[3] }, { file: args[5], rawBytesSha256: args[7] });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) mainCapture15().catch(error => { console.error(JSON.stringify({ kind: 'source15-capture-rejected', message: error.message, Source15Admitted: false })); process.exitCode = 1; });
