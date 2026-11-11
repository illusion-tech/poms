// Root filesystem-only construction. No API process, context, SQL or HTTP.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/start15-119-prepared01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
function put(name, value) {
  const file = D + '/' + name;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R);
assert(!fs.existsSync(D));
const request = JSON.parse(read(P + '/bind15-119-prepared01/request-bind15-G2-review119.json', 'd27a282433b3eb0df3a6a6d5928b88cd61b5270fe9ed277654e9d376d9580f75').b);
const priorInput = json(request.input);
const command = read(P + '/bind15-119-prepared01/run01/command-receipt.json');
assert.equal(JSON.parse(command.b).exitCode, 0);
const complete = read(P + '/source15-build119-bind-01/complete.json');
const c = JSON.parse(complete.b);
assert.equal(c.kind, 'actual-source15-build-mode-complete119'); assert.equal(c.mode, 'bind');
assert.equal(c.Source15Admitted, false);
assert.equal(c.input.rawBytesSha256, request.input.rawBytesSha256);
const binding = json(c.result);
assert.equal(binding.kind, 'actual-source15-owned-root-mirror-build119');
assert.equal(binding.helperCount, 227); assert.equal(binding.sourceCount, 420);
assert.equal(binding.NodeHelpersWereCargoInputs, false);
const plan = json(priorInput.preAPIPlan);
assert.equal(plan.consumer.buildBinding, null);
plan.consumer.buildBinding = c.result;
assert.deepEqual(binding.helperPins, plan.consumer.helperPins);
assert.deepEqual(binding.binary, plan.consumer.binary);
assert.deepEqual(binding.summaryBinary, plan.consumer.summaryBinary);
for (const k of ['apiProcess', 'readiness', 'observationReceipt', 'freshSnapshots', 'bootstrapCandidate']) assert.equal(plan.consumer[k], null);
assert.equal(plan.independentReview, null); assert.equal(plan.RootExecutionApproval, null);
for (const pin of plan.tooling.executionSources) read(pin.file, pin.rawBytesSha256);
for (const pin of [priorInput.state13, priorInput.state14, priorInput.ownership14]) read(pin.file, pin.rawBytesSha256);
for (const h of json(plan.consumer.helperPins)) read(R + '/' + h.file, h.sha256);
const normalEnv = read(P + '/rust.env', 'd42dc1e25b6fff80268586b42e23df50c33e04db16843f70f3f23df79a2e646d').pin;
for (const e of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + e + '/main01/driver.lock'));
assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
assert(!fs.existsSync(P + '/source15-api119-current.json'));
const outputDirectory = P + '/source15-api119-start15-01'; assert(!fs.existsSync(outputDirectory));
fs.mkdirSync(D, { mode: 0o700 });
const draft = put('preAPI-draft-with-actual-binding119.json', plan);
const code = plan.tooling.executionSources;
assert.equal(code.length, 14);
const input = {
  kind: 'Root-source15-119-API-input', mode: 'start15', state13: priorInput.state13, state14: priorInput.state14,
  helperPins: priorInput.helperPins, parent14: plan.parent14, outputDirectory, preAPIPlan: draft,
  apiProcess15: null, buildPair15: priorInput.buildPair, buildBinding15: c.result, normalRustEnv: normalEnv,
  tooling: { entry: code.find(p => p.file === R + '/tools/rust-r4ghi/source15-admission119/api-runtime-source15.mjs'), manifest: plan.tooling.manifest, executionSources: code },
};
const ip = put('start15-input119.json', input);
const approval = {
  kind: 'Root-exact-source15-119-API', input: ip, mode: 'start15', toolingManifest: plan.tooling.manifest,
  stateMinted: false, domainHTTP: false, ordinaryContextCreated: false, processControl: true, readinessHTTP: true,
};
const ab = Buffer.from(JSON.stringify(approval, null, 2) + '\n');
const ap = { file: D + '/Root-exact-start15-approval119.json', bytes: ab.length, rawBytesSha256: sha(ab) };
const rp = put('request-start15-G2-review119.json', {
  kind: 'Root-requested-exact-owned-Source15-API-start119-G2', recordedAt: new Date().toISOString(),
  input: ip, expectedApproval: ap, expectedApprovalBody: approval,
  actualBindingComplete: complete.pin, actualBindingCommand: command.pin,
  requestedAction: 'Only owned ROOT15 mirror API start, exact original pipes and real readiness GET; no ordinary context, state, domain HTTP, SQL, migration or Cargo',
  API15AlreadyStarted: false, actualG2: false, Source15Admitted: false,
});
console.log(JSON.stringify({ request: rp, input: ip, expectedApproval: ap, API15AlreadyStarted: false }));
