// Root-only FS publisher. No createContext, DB, HTTP, migration or business effect.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash, randomUUID } from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/business/g2-business15/main01';
const sha = x => createHash('sha256').update(x).digest('hex');
export function readPublisherPin15(p) { assert(p && typeof p.file === 'string' && p.file.startsWith('/') && !p.file.includes('\\') && path.resolve(p.file) === p.file && /^[a-f0-9]{64}$/.test(p.rawBytesSha256)); const st = fs.lstatSync(p.file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(p.file), p.file); const b = fs.readFileSync(p.file); assert.equal(sha(b), p.rawBytesSha256); if (p.bytes !== undefined) assert.equal(b.length, p.bytes); return b; }
const json = p => JSON.parse(readPublisherPin15(p));
const pin = file => { const b = fs.readFileSync(file); const p = { file, bytes: b.length, rawBytesSha256: sha(b) }; readPublisherPin15(p); return p; };
const same = (a, b) => { assert(a && b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
const syncDirectory = directory => { const fd = fs.openSync(directory, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } };
export function writeExclusive15(file, value) { const b = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'); const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, b); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } syncDirectory(path.dirname(file)); return pin(file); }
export function atomicNoReplace15(staged, target) {
  assert.equal(path.dirname(staged), path.dirname(target)); const before = pin(staged), st = fs.lstatSync(staged, { bigint: true });
  // link(2) is atomic and fails EEXIST. rename(2) can overwrite and is not used.
  fs.linkSync(staged, target); syncDirectory(path.dirname(target));
  const now = fs.lstatSync(target, { bigint: true }); assert.equal(now.dev, st.dev); assert.equal(now.ino, st.ino);
  assert.equal(sha(fs.readFileSync(target)), before.rawBytesSha256);
  fs.unlinkSync(staged); syncDirectory(path.dirname(target));
  const result = pin(target); assert.equal(result.rawBytesSha256, before.rawBytesSha256); return result;
}
function preimport(input) {
  assert.equal(input.kind, 'Root-source15-119-publisher-input'); assert(['bootstrap', 'inspect', 'publish', 'B1'].includes(input.mode));
  assert.equal(input.tooling.entry.file, fileURLToPath(import.meta.url)); readPublisherPin15(input.tooling.entry);
  const manifest = json(input.tooling.manifest); assert.equal(manifest.kind, 'source15-admission119-code-candidate'); assert.equal(manifest.production.length, 14);
  assert(Array.isArray(input.tooling.executionSources) && input.tooling.executionSources.length === 14);
  for (const e of manifest.production) { const p = input.tooling.executionSources.find(x => x.file === ROOT + '/' + e.file); assert(p); assert.equal(p.rawBytesSha256, e.afterSHA256); readPublisherPin15(p); }
  const helpers = json(input.helperPins), actual = fs.readdirSync(ROOT + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => { const f = ROOT + '/tools/rust-r4ghi/business/' + n; return { file: 'tools/rust-r4ghi/business/' + n, sha256: pin(f).rawBytesSha256 }; }); assert.deepEqual(actual, helpers);
  return helpers;
}
export function assertPublisherApproval15(inputPin, input, approval) {
  assert.equal(approval.kind, input.mode === 'bootstrap' ? 'Root-authorized-source15-bootstrap-only119' : 'Root-exact-source15-publisher119');
  same(approval.input, inputPin); assert.equal(approval.mode, input.mode); same(approval.plan, input.plan); same(approval.toolingManifest, input.tooling.manifest);
  assert.equal(approval.domainEffects, false); assert.equal(approval.ordinaryContext, false);
  if (input.mode === 'bootstrap') { same(approval.candidateInput, input.plan); assert.equal(approval.publishState, false); }
  else assert.equal(approval.publishState, input.mode === 'publish');
}
function paths(input) {
  for (const k of ['registryFile', 'candidateFile', 'bootstrapFile', 'intentFile']) { assert(typeof input[k] === 'string' && input[k].startsWith(D + '/') && path.dirname(input[k]) === D); assert(!input[k].includes('\\')); }
  assert.equal(new Set([input.registryFile, input.candidateFile, input.bootstrapFile, input.intentFile, D + '/state.json', D + '/ownership.jsonl']).size, 6);
}
function journal(file, value) { const fd = fs.openSync(file, 'a', 0o600); try { fs.writeFileSync(fd, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
export async function runPublisher15(inputPin, approvalPin) {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.deepEqual(process.execArgv, []);
  assert(inputPin.file.startsWith(P + '/') && approvalPin.file.startsWith(P + '/'));
  const input = json(inputPin), approval = json(approvalPin); assertPublisherApproval15(inputPin, input, approval); preimport(input); paths(input);
  for (const epoch of ['g2-business13', 'g2-business14', 'g2-business15']) assert(!fs.existsSync(P + '/business/' + epoch + '/main01/driver.lock'), 'Another epoch driver is active');
  fs.mkdirSync(D, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(D), D);
  const nonce = randomUUID(), lock = D + '/driver.lock'; const locked = writeExclusive15(lock, { pid: process.pid, nonce, input: inputPin, mode: input.mode });
  let activated = null, intentCreated = false, activationAttempted = false;
  try {
    const core = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/source15-admission-core.mjs').href);
    const api = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/source15-admission.mjs').href);
    const stage = input.mode === 'bootstrap' ? 'bootstrap' : input.mode === 'inspect' ? 'inspect' : input.mode === 'B1' ? 'B1' : 'publish';
    const facts = api.verifyPlan15(input.plan, { stage });
    same(facts.plan.tooling.manifest, input.tooling.manifest); same(facts.plan.consumer.helperPins, input.helperPins);
    assert.equal(approval.scope15, facts.scope15); core.assertPublishIdle15(facts.parent.state);
    if (input.mode === 'inspect') { console.log(JSON.stringify({ mode: 'inspect', scope15: facts.scope15, ordinaryAdmission: fs.existsSync(D + '/state.json'), orphanArtifacts: [input.registryFile, input.candidateFile].filter(f => fs.existsSync(f)).map(pin), effectsGranted: false })); return facts; }
    if (input.mode === 'B1') { const state = json(pin(D + '/state.json')), regPin = pin(input.registryFile), b1 = pin(input.candidateFile); same(state.codeEpochAdmission15.registry, regPin); same(state.codeEpochAdmission15.candidate, b1); assert.deepEqual(json(regPin), core.registryBody15(facts.plan, input.plan, facts)); assert.deepEqual(json(b1), core.admittedBody15(facts.plan, regPin, facts.bootstrap)); console.log(JSON.stringify({ mode: 'B1', registry: regPin, candidate: b1, createsCandidate: false })); return b1; }
    for (const f of [D + '/state.json', D + '/ownership.jsonl', input.registryFile, input.candidateFile, input.intentFile]) assert(!fs.existsSync(f), 'Existing publication/orphan: read-only reconciliation required');
    if (input.mode === 'bootstrap') assert(!fs.existsSync(input.bootstrapFile)); else same(facts.plan.consumer.bootstrapCandidate, pin(input.bootstrapFile));
    writeExclusive15(input.intentFile, Buffer.from(JSON.stringify({ phase: 'intent', pid: process.pid, nonce, input: inputPin, approval: approvalPin, mode: input.mode, scope15: facts.scope15 }) + '\n')); intentCreated = true;
    if (input.mode === 'bootstrap') {
      const b0 = writeExclusive15(input.bootstrapFile, core.bootstrapBody15(facts.plan, input.plan, approvalPin, facts.apiRecord));
      assert.deepEqual(json(b0), core.bootstrapBody15(facts.plan, input.plan, approvalPin, facts.apiRecord));
      journal(input.intentFile, { phase: 'bootstrap-written', bootstrap: b0, stateMinted: false });
      console.log(JSON.stringify({ mode: 'bootstrap', bootstrap: b0, stateMinted: false })); return b0;
    }
    same(approval.bootstrapCandidate, facts.plan.consumer.bootstrapCandidate); same(approval.RootExecutionApproval, facts.plan.RootExecutionApproval);
    const reg = writeExclusive15(input.registryFile, core.registryBody15(facts.plan, input.plan, facts)); journal(input.intentFile, { phase: 'registry-written', registry: reg });
    const body = core.admittedBody15(facts.plan, reg, facts.bootstrap), b1 = writeExclusive15(input.candidateFile, body);
    const actualBody = json(b1); assert.deepEqual(actualBody, body); journal(input.intentFile, { phase: 'candidate-written', candidate: b1 });
    const next = core.buildState15(facts.parent, { ...facts, actualWrittenB1: { pin: b1, body: actualBody, verifiedFromDisk: true } }, reg, new Date().toISOString());
    const ownership = writeExclusive15(D + '/ownership.jsonl', Buffer.alloc(0));
    const staged = D + '/state119-' + nonce + '.staged'; const stagedPin = writeExclusive15(staged, next);
    journal(input.intentFile, { phase: 'state-staged', staged: stagedPin, registry: reg, candidate: b1, initialOwnership: ownership });
    journal(input.intentFile, { phase: 'activation-intent', staged: stagedPin, target: D + '/state.json', noReplace: true }); activationAttempted = true;
    activated = atomicNoReplace15(staged, D + '/state.json');
    // Activation happened: preserve this fact before any further verification.
    journal(input.intentFile, { phase: 'state-activated', state: activated, registry: reg, candidate: b1, Source15BusinessG2Granted: false });
    assert.deepEqual(json(activated), next); api.verifyPlan15(input.plan, { stage: 'B1' });
    const receipt = writeExclusive15(D + '/publication119-' + nonce + '.json', { kind: 'actual-Source15-FS-publication119', input: inputPin, approval: approvalPin, plan: input.plan, scope15: facts.scope15, registry: reg, candidate: b1, state: activated, initialOwnership: ownership, ordinaryStateActivated: true, independentActualReadbackRequired: true, businessG2Granted: false, G3Certified: false, G4Certified: false });
    journal(input.intentFile, { phase: 'complete', receipt }); console.log(JSON.stringify({ mode: 'publish', receipt, businessG2Granted: false })); return receipt;
  } catch (error) { if (intentCreated) journal(input.intentFile, { phase: 'failed-or-partial', message: error.message, actualActivatedState: activated, activationOutcome: activated ? 'known-activated' : activationAttempted ? 'uncertain-inspect-original-target-and-stage' : 'not-attempted', blindRetryForbidden: true, orphanReconciliationRequired: true }); throw error; }
  finally { same(pin(lock), locked); const l = json(locked); assert.equal(l.pid, process.pid); assert.equal(l.nonce, nonce); fs.unlinkSync(lock); syncDirectory(D); }
}
export async function mainPublisher15(args = process.argv.slice(2)) { if (args.length === 1 && args[0] === '--help') { console.log('Root FS only --input FILE --input-sha SHA --approval FILE --approval-sha SHA --execute; bootstrap|inspect|publish|B1. B1 verifies existing bytes; publication never replaces a state or orphan.'); return; } assert.equal(args.length, 9); assert.deepEqual([args[0], args[2], args[4], args[6], args[8]], ['--input', '--input-sha', '--approval', '--approval-sha', '--execute']); return runPublisher15({ file: args[1], rawBytesSha256: args[3] }, { file: args[5], rawBytesSha256: args[7] }); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) mainPublisher15().catch(e => { console.error(JSON.stringify({ kind: 'source15-publication-stopped', message: e.message, preserveAllArtifacts: true, blindRetryForbidden: true })); process.exitCode = 1; });
