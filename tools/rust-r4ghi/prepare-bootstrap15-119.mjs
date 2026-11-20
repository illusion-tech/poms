// Root filesystem-only preparation of the separate B0-only exact review input.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/bootstrap15-119-prepared01', E = P + '/business/g2-business15/main01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R); assert(!fs.existsSync(D));
const command = read(P + '/plan15-bootstrap-119-prepared01/run01/command-receipt.json');
assert.equal(JSON.parse(command.b).exitCode, 0);
const planPin = read(P + '/source15-plan119-bootstrap01.json').pin, plan = json(planPin);
assert.equal(plan.kind, 'fixed-Source14-to15-admission119-plan');
assert(plan.consumer.observationReceipt); assert.equal(plan.consumer.freshSnapshots.length, 2);
assert.equal(plan.consumer.bootstrapCandidate, null); assert.equal(plan.independentReview, null); assert.equal(plan.RootExecutionApproval, null);
for (const p of plan.tooling.executionSources) read(p.file, p.rawBytesSha256);
for (const h of json(plan.consumer.helperPins)) read(R + '/' + h.file, h.sha256);
const core = await import(pathToFileURL(R + '/tools/rust-r4ghi/business/source15-admission-core.mjs').href);
const scope = core.scope15(plan);
const input = {
  kind: 'Root-source15-119-publisher-input', mode: 'bootstrap', plan: planPin, helperPins: plan.consumer.helperPins,
  registryFile: E + '/consumer-registry119-Reg5.json', candidateFile: E + '/code-candidate-admitted119-B1.json',
  bootstrapFile: E + '/code-candidate-bootstrap119-B0.json', intentFile: E + '/source15-bootstrap119-intent.jsonl',
  tooling: { entry: plan.tooling.executionSources.find(p => p.file === R + '/tools/rust-r4ghi/source15-admission119/admit-source15.mjs'), manifest: plan.tooling.manifest, executionSources: plan.tooling.executionSources },
};
for (const file of [input.registryFile, input.candidateFile, input.bootstrapFile, input.intentFile, E + '/state.json', E + '/ownership.jsonl']) assert(!fs.existsSync(file));
for (const e of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + e + '/main01/driver.lock'));
fs.mkdirSync(D, { mode: 0o700 });
function put(name, value) {
  const file = D + '/' + name;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
const ip = put('bootstrap15-input119.json', input);
const approval = {
  kind: 'Root-authorized-source15-bootstrap-only119', input: ip, mode: 'bootstrap', plan: planPin,
  candidateInput: planPin, scope15: scope, toolingManifest: plan.tooling.manifest,
  publishState: false, ordinaryContext: false, domainEffects: false,
};
const ab = Buffer.from(JSON.stringify(approval, null, 2) + '\n');
const ap = { file: D + '/Root-exact-bootstrap15-approval119.json', bytes: ab.length, rawBytesSha256: sha(ab) };
const request = put('request-publisher-G2-review119.json', {
  kind: 'Root-requested-exact-Source15-publisher119-G2', recordedAt: new Date().toISOString(), mode: 'bootstrap',
  input: ip, expectedApproval: ap, expectedApprovalBody: approval,
  actualBootstrapPlan: planPin, actualPlanCommand: command.pin, scope15: scope,
  requestedAction: 'Only actual B0 wx/readback after full native bootstrap verification; no Reg5, B1, state, context, SQL/HTTP, process control or Cargo',
  B0AlreadyWritten: false, actualG2: false, Source15Admitted: false,
});
console.log(JSON.stringify({ request, input: ip, expectedApproval: ap, B0AlreadyWritten: false }));
