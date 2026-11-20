// Root filesystem-only preparation; no context, authentication, SQL/HTTP or mode.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/source15-tax118-prepare-recipe01';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', O = P + '/tax15-prepare118-prepared01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file); return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
function same(a, b) { assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); }
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R);
const args = process.argv.slice(2); assert.equal(args.length, 12);
assert.deepEqual([args[0], args[2], args[4], args[6], args[8], args[10]], ['--state', '--state-sha', '--actor-facts', '--actor-facts-sha', '--technical-readback', '--technical-readback-sha']);
assert.equal(args[1], P + '/business/g2-business15/main01/state.json'); assert(!fs.existsSync(O));
const stateRead = read(args[1], args[3]), state = JSON.parse(stateRead.b), actorFactsPin = read(args[5], args[7]).pin, actor = json(actorFactsPin);
const technicalReadback = read(args[9], args[11]), technical = JSON.parse(technicalReadback.b);
assert(typeof technical.verdict === 'string' && technical.verdict.startsWith('approved-'));
assert(typeof technical.author === 'string' && typeof technical.reviewer === 'string' && technical.author !== technical.reviewer);
assert.equal(state.epoch, 'g2-business15'); assert.equal(state.namespace, 'poms-r4ghi'); assert.equal(state.run, 'main01'); assert(!state.taxContinuation15);
assert.equal(actor.kind, 'Root-actual-offline-Source15-manager-permission-evidence118'); same(actor.source15State, stateRead.pin);
assert.equal(actor.actorId, state.actors.manager.id); assert.equal(actor.accountIsActive, true); assert.equal(actor.fullSetNotSubset, true);
assert.equal(actor.actualColdObservation.rawBytesSha256, '8f2543fa1d353ba0d3b2611778b85edf1c27754c1895a1b35575941fe717f620');
assert.deepEqual(actor.expectedActorPermissions, [...new Set(actor.expectedActorPermissions)].sort());
const regPin = state.codeEpochAdmission15.registry, reg = json(regPin), candidate = state.codeEpochAdmission15.candidate;
read(candidate.file, candidate.rawBytesSha256); assert.notEqual(candidate.rawBytesSha256, reg.consumer.candidateReceipt.rawBytesSha256);
const c = reg.consumer, sources = json(c.sourcePins), helpers = json(c.helperPins);
assert.equal(sources.length, 420); assert.equal(helpers.length, 227); assert.equal(sha(JSON.stringify(sources)), c.sourcePinsSHA256);
assert.equal(c.sourcePinsSHA256, 'b55f88e158665474fb3890bec8749ec2af52544318f45aa068251bb476c18be7');
for (const epoch of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + epoch + '/main01/driver.lock'));
const runtimeTemplate = read(H + '/tax-runtime15.required-null.json', 'b4f8a993048551945994ad4e8ff6f859a3f7d1619d388535687b83c872eb0d05');
const inputTemplate = read(H + '/prepare-input118.null.json', '815fdcd01cc6e63633a024ad3cb0264a5c520dae6cbb9d6a3085e68b2cdb7639');
const runtime = JSON.parse(runtimeTemplate.b), input = JSON.parse(inputTemplate.b), cold = json(actor.actualColdObservation);
same(cold.apiProcess, c.apiProcess); same(cold.sourcePins, c.sourcePins); same(cold.helperPins, c.helperPins);
Object.assign(runtime.current, {
  sourceCount: c.sourceCount, sourcePinsSHA256: c.sourcePinsSHA256, sourcePins: sources,
  binarySHA256: c.binary.rawBytesSha256, apiProcess: c.apiProcess, candidate,
  helperCount: c.helperCount, helperSources: helpers, helperPins: c.helperPins, codeAdmission15: regPin,
  retentionIndex: reg.retentionIndex, retainedProducerState: reg.producerState,
  producerProjectionSHA256: sha(JSON.stringify(state.fixtures.sharedSourceFollowup58)),
});
runtime.retainedMain13.sourceState = reg.producerState;
assert.equal(runtime.retainedMain13.original.bytes, 4524);
read(runtime.retainedMain13.original.file, 'c075de72639a418cb4c76932d6fd325e012d77e9552f55377249bf88bb0ff09c');
for (const value of Object.values(runtime.legacy)) if (value && typeof value === 'object' && typeof value.file === 'string') read(value.file, value.rawBytesSha256);
const codeReview = json(input.codeReview); assert.equal(codeReview.reviewerIsAuthor, false); assert.equal(codeReview.verdict, 'code-ready-for-exact-input-review');
input.executionSources = codeReview.executionSources;
for (const p of input.executionSources) read(p.file, p.rawBytesSha256);
for (const p of [input.technicalG1, input.baseline, input.wireSpec]) read(p.file, p.rawBytesSha256);
read(stateRead.pin.file, stateRead.pin.rawBytesSha256);
const runtimeFile = P + '/business/g2-business15/main01/tax-runtime15-118-prepare01.json';
assert(!fs.existsSync(runtimeFile));
fs.mkdirSync(O, { mode: 0o700 });
function put(name, value) { const file = O + '/' + name; fs.writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return read(file).pin; }
const entryState = put('entry-state15.json', stateRead.b);
fs.writeFileSync(runtimeFile, JSON.stringify(runtime, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const runtimePin = read(runtimeFile).pin;
Object.assign(input, {
  nonce: randomUUID(), actorId: actor.actorId, expectedActorPermissions: actor.expectedActorPermissions,
  expectedEntryState: entryState, runtimeBindings: runtimePin, codeAdmission15: regPin, candidate,
  actualHelperPins: c.helperPins, actualSourcePins: c.sourcePins, actualCompilePins: c.compilePins, apiProcess: c.apiProcess,
});
assert.equal(Object.keys(input).length, 34); assert.equal(input.mode, 'prepare-only');
for (const key of ['bodySHA256', 'prepared15', 'fullInventory', 'approvedClosedFISet', 'selectedFamily', 'approvedRecovery', 'approvedCompletedPrefix', 'approvedStartCursor', 'approvedFICompletion', 'expectedActiveFault']) assert.equal(input[key], null);
const ip = put('prepare-only-input118.json', input);
const expectedRootReviewBody = {
  kind: 'Root-approved-exact-Tax15-invocation118', approvedInput: ip, codeReview: input.codeReview,
  expectedEntryState: entryState, mode: 'prepare-only', nonce: input.nonce,
  actualG2Authorized: true, normalTaxPOSTGranted: false, FIGranted: false,
};
const bytes = Buffer.from(JSON.stringify(expectedRootReviewBody, null, 2) + '\n');
const expectedRootReview = { file: O + '/Root-exact-prepare-only-review118.json', bytes: bytes.length, rawBytesSha256: sha(bytes) };
const request = put('request-prepare-only-G2-review118.json', {
  kind: 'Root-requested-Tax15-prepare-only118-exact-G2', recordedAt: new Date().toISOString(), mode: 'prepare-only',
  input: ip, expectedRootReview, expectedRootReviewBody, actualTechnicalReadback: technicalReadback.pin,
  actualSource15EntryState: stateRead.pin, actualOfflineActorEvidence: actorFactsPin,
  runtimeTemplate: runtimeTemplate.pin, inputTemplate: inputTemplate.pin,
  requestedAction: 'Single native createContext entry/exit, fresh actor auth and complete read-only preparation/targets/body/inventory evidence; no classification, FI, Tax/Main command or normal201',
  authenticationMayCreateSessionAndAuthAudit: true, actualG2: false, preparationAlreadyRun: false, RootReviewSigned: false,
});
console.log(JSON.stringify({ request, input: ip, expectedRootReview, preparationAlreadyRun: false }));
