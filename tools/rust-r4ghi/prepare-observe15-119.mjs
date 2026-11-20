// Root-only filesystem input construction; no capture, auth, SQL or HTTP here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/observe15-119-prepared01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R); assert(!fs.existsSync(D));
const command = read(P + '/plan15-pre-observe-119-prepared01/run01/command-receipt.json');
assert.equal(JSON.parse(command.b).exitCode, 0);
const planPin = read(P + '/source15-plan119-pre-observe01.json').pin, plan = json(planPin);
assert.equal(plan.kind, 'fixed-Source14-to15-admission119-plan');
assert.equal(plan.consumer.observationReceipt, null); assert.equal(plan.consumer.freshSnapshots, null);
assert.equal(plan.consumer.bootstrapCandidate, null); assert.equal(plan.independentReview, null); assert.equal(plan.RootExecutionApproval, null);
const retained = json(plan.parent14.finalRetention14);
const originalInputPin = retained.input, input = json(originalInputPin);
assert.equal(input.kind, 'Root-source15-admission119-state-free-capture-input'); assert.equal(input.mode, 'retain14');
Object.assign(input, {
  mode: 'observe15', sourcePins: plan.consumer.sourcePins, sourcePinsSHA256: plan.consumer.sourcePinsSHA256,
  sourceCount: plan.consumer.sourceCount, helperPins: plan.consumer.helperPins,
  apiProcess: plan.consumer.apiProcess, apiBinary: plan.consumer.binary,
  summaryBinary: plan.consumer.summaryBinary, binaryFiles: plan.consumer.binaryFiles,
  finalRetention14: plan.parent14.finalRetention14, plan: planPin,
  tooling: {
    capture: plan.tooling.executionSources.find(p => p.file === R + '/tools/rust-r4ghi/source15-admission119/capture-source15.mjs'),
    manifest: plan.tooling.manifest, independentCodeReview: plan.tooling.independentCodeReview,
  },
});
for (const k of ['state13', 'state14', 'ownership14', 'identity', 'provision', 'archive344', 'source14', 'compile14', 'helper14']) read(input[k].file, input[k].rawBytesSha256);
for (const p of plan.tooling.executionSources) read(p.file, p.rawBytesSha256);
for (const h of json(input.helperPins)) read(R + '/' + h.file, h.sha256);
const original = json(originalInputPin);
for (const k of ['identity', 'provision', 'archive344', 'archive344Review', 'registry4', 'source14', 'compile14', 'helper14', 'state13', 'state14', 'ownership14', 'http14Attempts', 'ownerPassword']) assert.deepEqual(input[k], original[k]);
for (const e of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + e + '/main01/driver.lock'));
assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
fs.mkdirSync(D, { mode: 0o700 });
function put(name, value) {
  const file = D + '/' + name;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
const ip = put('observe15-input119.json', input);
const approval = {
  kind: 'Root-exact-state-free-capture-source15-119', input: ip, mode: 'observe15', authorizesDefaultReadOnlyCapture: true,
  stateMinted: false, domainHTTP: false, DML: false, migration: false, processControl: false, ordinaryContextCreated: false,
  state13: input.state13, state14: input.state14, ownership14: input.ownership14,
  sourcePins: input.sourcePins, helperPins: input.helperPins, identity: input.identity, provision: input.provision,
  archive344: input.archive344, http14Attempts: input.http14Attempts, independentCodeReview: input.tooling.independentCodeReview,
};
const ab = Buffer.from(JSON.stringify(approval, null, 2) + '\n');
const ap = { file: D + '/Root-exact-observe15-approval119.json', bytes: ab.length, rawBytesSha256: sha(ab) };
const request = put('request-observe15-G2-review119.json', {
  kind: 'Root-requested-exact-Source15-state-free-observation119-G2', recordedAt: new Date().toISOString(),
  input: ip, expectedApproval: ap, expectedApprovalBody: approval,
  actualPreObservePlan: planPin, actualPlanCommand: command.pin, originalRetain14Input: originalInputPin,
  requestedAction: 'Only owner PostgreSQL connection and two complete default-read-only 139-table observations with raw/xmin/meta/sequence/objects/owned conservation; no HTTP, session/auth-audit DML, domain command, ordinary context, state, migration, process control or Cargo',
  ownerDatabaseAuthenticationOnly: true, authenticationMayCreateSessionAndAuthAudit: false,
  observationAlreadyRun: false, actualG2: false, Source15Admitted: false,
});
console.log(JSON.stringify({ request, input: ip, expectedApproval: ap, observationAlreadyRun: false }));
