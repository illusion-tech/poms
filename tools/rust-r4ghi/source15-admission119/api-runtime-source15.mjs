// Fixed owned API lifecycle. No automatic stop/start/retry and no context mint.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import net from 'node:net'; import { spawn } from 'node:child_process'; import { once } from 'node:events'; import { createHash, randomUUID } from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', M = '/home/wangzishi/projects/poms-rust-r4ghi', P = '/home/wangzishi/.local/share/poms-r4ghi/private', PORT15 = 31441;
const sha = x => createHash('sha256').update(x).digest('hex'), delay = ms => new Promise(r => setTimeout(r, ms));
export function apiPin15(p) { assert(p && typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') && path.resolve(p.file) === p.file && /^[a-f0-9]{64}$/.test(p.rawBytesSha256)); const s = fs.lstatSync(p.file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(p.file), p.file); const b = fs.readFileSync(p.file); assert.equal(sha(b), p.rawBytesSha256); if (p.bytes !== undefined) assert.equal(b.length, p.bytes); return b; }
const json = p => JSON.parse(apiPin15(p)), same = (a, b) => { assert(a && b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
const pin = file => { const b = fs.readFileSync(file); const p = { file, bytes: b.length, rawBytesSha256: sha(b) }; apiPin15(p); return p; };
function put(dir, name, value) { assert.equal(path.basename(name), name); const b = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = dir + '/' + name, fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, b); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } assert.equal(fs.statSync(file).mode & 0o777, 0o600); return pin(file); }
export function procAPI15(text) { const l = text.indexOf(' ('), r = text.lastIndexOf(') '); assert(l > 0 && r > l); const tail = text.slice(r + 2).trim().split(/\s+/); assert(tail.length >= 20 && /^\d+$/.test(tail[19])); return { pid: Number(text.slice(0, l)), startTime: tail[19] }; }
const envKeys15 = ['NODE_ENV', 'HOST', 'PORT', 'DB_CONNECT', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA', 'JWT_SECRET', 'CORS_ORIGIN', 'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY', 'POMS_ATTACHMENT_LOCAL_ROOT'];
export function runtimeEnv15(text) {
  assert(typeof text === 'string' && !text.includes('\0')); const values = new Map();
  for (const line of text.split(/\r?\n/)) { if (!line.trim() || line.trim().startsWith('#')) continue; const m = /^([A-Z_][A-Z0-9_]*)=([^\r\n]*)$/.exec(line); assert(m); const [, k, v] = m; assert(envKeys15.includes(k) && !values.has(k)); assert(!/["'#$`\\]/.test(v)); values.set(k, v); }
  assert.deepEqual([...values.keys()].sort(), [...envKeys15].sort());
  for (const [k, v] of Object.entries({ HOST: '127.0.0.1', DB_CONNECT: 'true', DB_HOST: '127.0.0.1', DB_PORT: '25434', DB_DATABASE: 'poms_r4ghi_rust', DB_USER: 'poms_r4ghi_rust_app', DB_SCHEMA: 'poms' })) assert.equal(values.get(k), v, 'Isolated configuration mismatch');
  for (const k of ['DB_PASSWORD', 'JWT_SECRET', 'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY']) assert(typeof values.get(k) === 'string' && values.get(k).length >= 32);
  assert(/^\d+$/.test(values.get('PORT')) && Number(values.get('PORT')) > 0 && Number(values.get('PORT')) <= 65535);
  const allowed = ['http://127.0.0.1:14610', 'http://localhost:14610', 'http://127.0.0.1:44551', 'http://localhost:44551']; assert(values.get('CORS_ORIGIN').split(',').every(x => allowed.includes(x)));
  assert.equal(values.get('POMS_ATTACHMENT_LOCAL_ROOT'), '/home/wangzishi/.local/share/poms-r4ghi/objects/rust');
  values.set('HOST', '127.0.0.1'); values.set('PORT', String(PORT15)); values.set('CORS_ORIGIN', 'http://127.0.0.1:44551,http://localhost:44551'); return [...values].map(([k, v]) => k + '=' + v).join('\n') + '\n';
}
export function listenerAPI15(tcp4, tcp6, targets, allowMissing = false) {
  const listeners = []; for (const [version, text] of [[4, tcp4], [6, tcp6]]) for (const line of text.trim().split('\n').slice(1)) { const f = line.trim().split(/\s+/); if (f.length < 10 || f[3] !== '0A') continue; const [host, port] = f[1].split(':'); if (parseInt(port, 16) === PORT15) listeners.push({ version, host, inode: f[9] }); }
  if (allowMissing && listeners.length === 0) return null; assert.equal(listeners.length, 1); const l = listeners[0]; assert.equal(l.version, 4); assert.equal(l.host, '0100007F'); assert(targets.includes('socket:[' + l.inode + ']')); return l;
}
function listener(pid, allowMissing = false) { const fds = []; for (const f of fs.readdirSync('/proc/' + pid + '/fd')) try { fds.push(fs.readlinkSync('/proc/' + pid + '/fd/' + f)); } catch (e) { if (e.code !== 'ENOENT') throw e; } return listenerAPI15(fs.readFileSync('/proc/net/tcp', 'utf8'), fs.readFileSync('/proc/net/tcp6', 'utf8'), fds, allowMissing); }
export function assertProcessIdentityFacts15(record, expectedBinary, actual) {
  assert.equal(actual.bootId, record.bootId); assert.equal(actual.pid, record.pid); assert.equal(actual.startTime, record.startTime);
  assert.equal(actual.exe, record.binary); assert.equal(actual.cwd, M); assert.equal(actual.dev, expectedBinary.dev); assert.equal(actual.ino, expectedBinary.ino);
}
function owned(record, facts) {
  const stat = procAPI15(fs.readFileSync('/proc/' + record.pid + '/stat', 'utf8')), executable = fs.statSync('/proc/' + record.pid + '/exe', { bigint: true }), f = facts.find(x => x.file === record.binary); assert(f);
  assertProcessIdentityFacts15(record, f, { bootId: fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), ...stat, exe: fs.realpathSync('/proc/' + record.pid + '/exe'), cwd: fs.realpathSync('/proc/' + record.pid + '/cwd'), dev: executable.dev.toString(), ino: executable.ino.toString() }); return record;
}
function currentHelpers(input) { const expected = json(input.helperPins), actual = fs.readdirSync(ROOT + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => { const file = ROOT + '/tools/rust-r4ghi/business/' + n; return { file: 'tools/rust-r4ghi/business/' + n, sha256: pin(file).rawBytesSha256 }; }); assert.deepEqual(actual, expected); return actual; }
function preimport(input) { assert.equal(input.tooling.entry.file, fileURLToPath(import.meta.url)); apiPin15(input.tooling.entry); const m = json(input.tooling.manifest); assert.equal(m.kind, 'source15-admission119-code-candidate'); assert.equal(m.production.length, 14); assert.equal(input.tooling.executionSources.length, 14); for (const e of m.production) { const p = input.tooling.executionSources.find(x => x.file === ROOT + '/' + e.file); assert(p); assert.equal(p.rawBytesSha256, e.afterSHA256); apiPin15(p); } return currentHelpers(input); }
function stateBookend(input) { for (const [p, sha] of [[input.state13, 'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'], [input.state14, 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97']]) { assert.equal(p.rawBytesSha256, sha); apiPin15(p); } }
export async function runAPI15(inputPin, approvalPin) {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.deepEqual(process.execArgv, []);
  assert(inputPin.file.startsWith(P + '/') && approvalPin.file.startsWith(P + '/')); const input = json(inputPin), approval = json(approvalPin);
  assert.equal(input.kind, 'Root-source15-119-API-input'); assert(['retire14', 'start15', 'status15'].includes(input.mode)); assert.equal(approval.kind, 'Root-exact-source15-119-API'); same(approval.input, inputPin); assert.equal(approval.mode, input.mode); same(approval.toolingManifest, input.tooling.manifest); assert.equal(approval.stateMinted, false); assert.equal(approval.domainHTTP, false); assert.equal(approval.ordinaryContextCreated, false); assert.equal(approval.processControl, input.mode !== 'status15'); assert.equal(approval.readinessHTTP, input.mode === 'start15');
  const helpers = preimport(input); stateBookend(input); if (input.mode !== 'status15') assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
  for (const e of ['g2-business13', 'g2-business14', 'g2-business15']) assert(!fs.existsSync(P + '/business/' + e + '/main01/driver.lock'));
  const d = P + '/business/g2-business15/main01'; fs.mkdirSync(d, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(d), d); const nonce = randomUUID(), lock = d + '/driver.lock'; const lockPin = put(d, 'driver.lock', { nonce, pid: process.pid, input: inputPin, mode: input.mode });
  let directory, child = null, signalSent = false;
  try {
    const retained = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/retained-source14-for15.mjs').href);
    if (input.mode === 'status15') { const r = json(input.apiProcess15), b = json(input.buildBinding15); assert.equal(r.kind, 'actual-source15-owned-API-process119'); assert.equal(r.epoch, 'g2-business15'); same(r.buildBinding, input.buildBinding15); assert.equal(r.binary, b.binary.file); for (const p of [b.binary, b.summaryBinary]) retained.binary15(p, b.binaryFiles); owned(r, b.binaryFiles); listener(r.pid); stateBookend(input); console.log(JSON.stringify({ mode: 'status', pid: r.pid, alive: true, port: PORT15, binarySha256: r.binarySha256, privateCredentialsPrinted: false })); return; }
    assert(input.outputDirectory.startsWith(P + '/source15-api119-') && path.dirname(input.outputDirectory) === P); assert(!fs.existsSync(input.outputDirectory)); fs.mkdirSync(input.outputDirectory, { mode: 0o700 }); directory = input.outputDirectory;
    put(directory, 'intent.json', { kind: 'source15-119-API-intent', mode: input.mode, input: inputPin, approval: approvalPin, nonce });
    if (input.mode === 'retire14') {
      // Additional named readonly seam is declared explicitly in the manifest;
      // it is never selected by an ordinary15/Reg5 verifier.
      const parent = retained.verifyRetained14BeforeRetirement15(input.parent14); assert.equal(parent.current15Granted, false); assert.equal(parent.retainedParentOnly, true);
      const pair = json(input.buildPair15); assert.equal(pair.kind, 'actual-source15-eight-Cargo-steps119'); assert.equal(pair.helperPins, null); assert.equal(pair.NodeHelpersWereCargoInputs, false);
      for (const [label, receipt] of [['Root', pair.Root], ['mirror', pair.mirror]]) { const build = json(receipt); assert.equal(build.kind, 'actual-Source15-owned-cargo-checks-and-build119'); assert.equal(build.root, label === 'Root' ? ROOT : M); assert(build.targetDirectory.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/')); assert.equal(build.sourceStable, true); for (const name of ['fmt', 'clippy', 'test', 'build']) { assert.equal(build.steps[name].exitCode, 0); apiPin15(build.steps[name].stdout); apiPin15(build.steps[name].stderr); } for (const p of [build.binary, build.summaryBinary]) retained.binary15(p, build.binaryFiles); }
      const r = json(input.parent14.apiProcess14); assert.equal(r.namespace, 'poms-r4ghi'); assert.equal(r.root, M); assert.equal(r.port, PORT15); assert(r.binary.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT14/'));
      for (const p of [input.parent14.binary14, input.parent14.summaryBinary14]) retained.binary15(p, input.parent14.binaryFiles14);
      owned(r, input.parent14.binaryFiles14); listener(r.pid);
      put(directory, 'signal-intent.json', { kind: 'owned-source14-SIGTERM-intent119', apiProcess14: input.parent14.apiProcess14, processRecord: r, ownedIdentityVerified: true });
      process.kill(r.pid, 'SIGTERM'); signalSent = true;
      let gone = false; for (let n = 0; n < 160; n++) { try { const now = procAPI15(fs.readFileSync('/proc/' + r.pid + '/stat', 'utf8')); if (now.startTime !== r.startTime) { gone = true; break; } } catch (e) { if (e.code === 'ENOENT') { gone = true; break; } throw e; } await delay(125); }
      assert(gone, 'Exact old API still present: preserve intent, no force-kill or automatic retry');
      stateBookend(input); currentHelpers(input);
      const result = put(directory, 'retirement14.json', { kind: 'actual-source14-API-retirement-for15', input: inputPin, approval: approvalPin, apiProcess14: input.parent14.apiProcess14, processRecord: r, signalOwnedIdentityVerified: true, signal: 'SIGTERM', stopped: true, finalRetention14: input.parent14.finalRetention14, retainedParentOnly: true, current15Granted: false, Source15Admitted: false });
      console.log(JSON.stringify({ mode: 'retire14', receipt: result, Source15Admitted: false })); return result;
    }
    const native = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/source15-admission.mjs').href), draft = json(input.preAPIPlan), facts = native.verifyPreAPI15(draft);
    same(draft.consumer.helperPins, input.helperPins); same(draft.consumer.buildBinding, input.buildBinding15); assert.equal(facts.current15Granted, false);
    const c = draft.consumer; assert.equal(c.binary.file, c.binaryRoot + '/debug/poms-api-rust'); assert.equal(c.summaryBinary.file, c.binaryRoot + '/debug/examples/r4ghi_summary_producer08');
    assert.equal(input.normalRustEnv.file, P + '/rust.env'); const environment = runtimeEnv15(apiPin15(input.normalRustEnv).toString());
    assert.equal(fs.realpathSync('/home/wangzishi/.local/share/poms-r4ghi/objects/rust'), '/home/wangzishi/.local/share/poms-r4ghi/objects/rust');
    const current = P + '/source15-api119-current.json'; assert(!fs.existsSync(current), 'Prior intent exists: do not restart or overwrite'); const intent = put(directory, 'start-intent.json', { input: inputPin, approval: approvalPin, binary: c.binary, binaryFiles: c.binaryFiles, buildBinding: input.buildBinding15, nonce });
    const pointerFD = fs.openSync(current, 'wx', 0o600); try { fs.writeFileSync(pointerFD, JSON.stringify({ intent, session: directory, input: inputPin }) + '\n'); fs.fsyncSync(pointerFD); } finally { fs.closeSync(pointerFD); }
    await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(PORT15, '127.0.0.1', () => probe.close(resolve)); });
    const envPin = put(directory, 'runtime.env', Buffer.from(environment));
    const stdout = fs.openSync(directory + '/stdout-original.bin', 'wx', 0o600), stderr = fs.openSync(directory + '/stderr-original.bin', 'wx', 0o600);
    try { child = spawn(c.binary.file, [], { cwd: M, env: { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', POMS_ENV_FILE: envPin.file }, detached: true, stdio: ['ignore', stdout, stderr] }); put(directory, 'spawn-returned.json', { pid: child.pid ?? null, input: inputPin, pendingIdentity: true }); await once(child, 'spawn'); child.unref(); }
    finally { fs.closeSync(stdout); fs.closeSync(stderr); }
    const bootId = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(); let processIdentity;
    for (let n = 0; n < 30; n++) { try { processIdentity = procAPI15(fs.readFileSync('/proc/' + child.pid + '/stat', 'utf8')); break; } catch (e) { if (n === 29) throw e; await delay(20); } }
    assert(processIdentity);
    const record = { kind: 'actual-source15-owned-API-process119', namespace: 'poms-r4ghi', epoch: 'g2-business15', binary: c.binary.file, root: M, pid: child.pid, startTime: processIdentity.startTime, binarySha256: c.binary.rawBytesSha256, port: PORT15, bootId, startedAt: new Date().toISOString(), binaryFiles: c.binaryFiles, buildBinding: input.buildBinding15, normalEnv: envPin, baseNormalEnv: input.normalRustEnv, input: inputPin, code: input.tooling.executionSources };
    owned(record, c.binaryFiles); put(directory, 'process-pending-readiness.json', { ...record, kind: 'pending-source15-owned-API-process119', readinessVerified: false });
    let ready = null;
    for (let n = 0; n < 60; n++) {
      owned(record, c.binaryFiles); if (!listener(record.pid, true)) { await delay(250); continue; }
      let response, bytes; try { response = await fetch('http://127.0.0.1:' + PORT15 + '/api/health/readiness', { redirect: 'error', signal: AbortSignal.timeout(1000) }); bytes = Buffer.from(await response.arrayBuffer()); }
      catch (e) { assert(['TypeError', 'TimeoutError', 'AbortError'].includes(e.name)); put(directory, 'readiness-failure-' + n + '.json', { transportComplete: false, category: e.name }); await delay(250); continue; }
      const raw = put(directory, 'readiness-attempt-' + n + '.json', { method: 'GET', url: 'http://127.0.0.1:31441/api/health/readiness', status: response.status, headers: Object.fromEntries(response.headers), body: bytes.toString() });
      if (response.status === 200) { const b = JSON.parse(bytes); assert.equal(b.service, 'poms-api'); assert.equal(b.status, 'ready'); assert.equal(b.checks?.process?.status, 'pass'); assert.equal(b.checks?.database?.status, 'pass'); ready = raw; break; }
      assert.equal(response.status, 503); await delay(250);
    }
    assert(ready, 'Readiness failed: preserve owned process and logs; no automatic stop/retry'); owned(record, c.binaryFiles); listener(record.pid); for (const p of [c.binary, c.summaryBinary]) retained.binary15(p, c.binaryFiles); currentHelpers(input); stateBookend(input);
    const processPin = put(directory, 'process.json', { ...record, readinessAttempt: ready });
    const readyPin = put(directory, 'readiness.json', { mode: 'start', port: PORT15, readiness: 200, privateCredentialsPrinted: false, pid: record.pid, binarySha256: record.binarySha256 });
    const complete = put(directory, 'complete.json', { kind: 'actual-Source15-API-start119', input: inputPin, approval: approvalPin, process: processPin, readiness: readyPin, newStateMinted: false, defaultROFresh15ObservationStillRequired: true, Source15Admitted: false });
    console.log(JSON.stringify({ mode: 'start', port: PORT15, readiness: 200, privateCredentialsPrinted: false, pid: record.pid, binarySha256: record.binarySha256, process: processPin, readinessReceipt: readyPin, complete })); return complete;
  } catch (e) { if (directory) put(directory, 'partial-uncertain.json', { kind: 'source15-API-partial119', input: inputPin, pid: child?.pid ?? null, signalSent, processMayBeAlive: Boolean(child?.pid), message: e.message, normalRetryAllowed: false, automaticSignal: false, stateMinted: false }); throw e; }
  finally { same(pin(lock), lockPin); const owner = json(lockPin); assert.equal(owner.nonce, nonce); assert.equal(owner.pid, process.pid); fs.unlinkSync(lock); }
}
export async function mainAPI15(args = process.argv.slice(2)) { if (args.length === 1 && args[0] === '--help') { console.log('Root only --input FILE --input-sha SHA --approval FILE --approval-sha SHA --execute; retire14|start15|status15, each separately exact-approved. No automatic lifecycle or context.'); return; } assert.equal(args.length, 9); assert.deepEqual([args[0], args[2], args[4], args[6], args[8]], ['--input', '--input-sha', '--approval', '--approval-sha', '--execute']); return runAPI15({ file: args[1], rawBytesSha256: args[3] }, { file: args[5], rawBytesSha256: args[7] }); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) mainAPI15().catch(e => { console.error(JSON.stringify({ kind: 'source15-API-stopped', message: e.message, preserveAllArtifacts: true, automaticSignal: false })); process.exitCode = 1; });
