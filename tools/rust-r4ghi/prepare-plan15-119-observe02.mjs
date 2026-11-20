// Root filesystem-only assembly-input construction from actual predecessors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R);
const args = process.argv.slice(2); assert.equal(args.length, 1);
const stage = args[0]; assert(['pre-observe', 'bootstrap'].includes(stage));
const D = P + '/plan15-' + stage + '-119-prepared01';
assert(!fs.existsSync(D));
const startRequest = JSON.parse(read(P + '/start15-119-prepared01/request-start15-G2-review119.json').b);
const startInput = json(startRequest.input);
const startCommand = read(P + '/start15-119-prepared01/run01/command-receipt.json');
assert.equal(JSON.parse(startCommand.b).exitCode, 0);
const started = read(P + '/source15-api119-start15-01/complete.json');
const api = JSON.parse(started.b);
assert.equal(api.kind, 'actual-Source15-API-start119'); assert.equal(api.Source15Admitted, false);
assert.equal(api.input.rawBytesSha256, startRequest.input.rawBytesSha256);
const processRecord = json(api.process), readiness = json(api.readiness);
assert.equal(processRecord.kind, 'actual-source15-owned-API-process119');
assert.equal(readiness.readiness, 200); assert.equal(readiness.pid, processRecord.pid);
let plan, priorPlan = null, observation = null;
if (stage === 'pre-observe') {
  plan = json(startInput.preAPIPlan);
  assert.equal(plan.consumer.apiProcess, null); assert.equal(plan.consumer.readiness, null);
  plan.consumer.apiProcess = api.process; plan.consumer.readiness = api.readiness;
} else {
  priorPlan = read(P + '/source15-plan119-pre-observe01.json').pin;
  plan = json(priorPlan);
  const observedCommand = JSON.parse(read(P + '/observe15-119-prepared02/run01/command-receipt.json').b);
  assert.equal(observedCommand.exitCode, 0);
  const observedOutput = json(observedCommand.stdout);
  observation = observedOutput.receipt;
  const observed = json(observation);
  assert.equal(observed.kind, 'actual-source15-state-free-M98-observation119');
  assert.equal(observed.Source15Admitted, false);
  assert.equal(observed.stableObservations.length, 2);
  assert.equal(plan.consumer.observationReceipt, null); assert.equal(plan.consumer.freshSnapshots, null);
  plan.consumer.observationReceipt = observation;
  plan.consumer.freshSnapshots = observed.stableObservations;
}
assert.deepEqual(plan.tooling.executionSources, processRecord.code);
for (const pin of plan.tooling.executionSources) read(pin.file, pin.rawBytesSha256);
for (const pin of [startInput.state13, startInput.state14]) read(pin.file, pin.rawBytesSha256);
for (const h of json(plan.consumer.helperPins)) read(R + '/' + h.file, h.sha256);
for (const k of ['bootstrapCandidate']) assert.equal(plan.consumer[k], null);
assert.equal(plan.independentReview, null); assert.equal(plan.RootExecutionApproval, null);
for (const e of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + e + '/main01/driver.lock'));
assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
const outputFile = P + '/source15-plan119-' + stage + '01.json'; assert(!fs.existsSync(outputFile));
// Check already registered actual source bytes before importing their pure readers.
const retained = await import(pathToFileURL(R + '/tools/rust-r4ghi/business/retained-source14-for15.mjs').href);
const core = await import(pathToFileURL(R + '/tools/rust-r4ghi/business/source15-admission-core.mjs').href);
const parent = retained.verifyRetained14For15(plan.parent14);
const resources = core.resourceEntries15(parent);
assert.deepEqual(resources, plan.resources); assert.equal(resources.length, 9);
core.assertStateTransfer15(plan.stateTransfer, parent.state);
plan.resources = resources;
core.assertPlanShape15(plan, stage);
const scope = core.scope15(plan);
plan.resources = null; // The actual registered assembler independently derives them.
fs.mkdirSync(D, { mode: 0o700 });
function put(name, value) {
  const file = D + '/' + name;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
const draft = put('draft-plan119.json', plan), code = plan.tooling.executionSources;
const input = {
  kind: 'Root-source15-119-plan-assembly-input', mode: 'assemble-plan', stage,
  helperPins: plan.consumer.helperPins, draftPlan: draft, outputFile,
  tooling: { entry: code.find(p => p.file === R + '/tools/rust-r4ghi/source15-admission119/plan-source15.mjs'), manifest: plan.tooling.manifest, executionSources: code },
};
const ip = put('plan-assembly-input119.json', input);
const approval = {
  kind: 'Root-exact-source15-119-operation', input: ip, mode: 'assemble-plan', stage,
  toolingManifest: plan.tooling.manifest, scope15: scope,
  domainHTTP: false, stateMinted: false, ordinaryContextCreated: false,
};
const ab = Buffer.from(JSON.stringify(approval, null, 2) + '\n');
const ap = { file: D + '/Root-exact-plan-assembly-approval119.json', bytes: ab.length, rawBytesSha256: sha(ab) };
const request = put('request-plan-assembly-G2-review119.json', {
  kind: 'Root-requested-exact-Source15-plan-assembly119-G2', recordedAt: new Date().toISOString(), mode: 'assemble-plan', stage,
  input: ip, expectedApproval: ap, expectedApprovalBody: approval,
  actualAPIComplete: started.pin, actualAPICommand: startCommand.pin, priorPlan, actualObservation: observation,
  requestedAction: 'Only immutable metadata plan assembly with native resource derivation and complete postcheck; no context, SQL/HTTP, Cargo, process control, registry, candidate or state',
  resourceCount: 9, scope15: scope, actualPlan: false, actualG2: false, Source15Admitted: false,
});
console.log(JSON.stringify({ request, input: ip, expectedApproval: ap, stage, actualPlan: false }));
