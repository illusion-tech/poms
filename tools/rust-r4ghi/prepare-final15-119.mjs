// Root filesystem-only final-review, assembly-input and publisher-input preparation.
// Every phase requires actual predecessors; this never invokes a lifecycle mode.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const F = P + '/final15-119-prepared01', E = P + '/business/g2-business15/main01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
function put(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
function expected(file, body) {
  const b = Buffer.from(JSON.stringify(body, null, 2) + '\n');
  return { file, bytes: b.length, rawBytesSha256: sha(b) };
}
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R);
const args = process.argv.slice(2), action = args[0];
assert(['request-review', 'assemble-input', 'publish-input'].includes(action));
assert.equal(args.length, action === 'assemble-input' ? 5 : 1);
if (action === 'assemble-input') assert.deepEqual([args[1], args[3]], ['--review', '--review-sha']);
const bootstrapPlan = read(P + '/source15-plan119-bootstrap01.json').pin, plan = json(bootstrapPlan);
assert.equal(plan.kind, 'fixed-Source14-to15-admission119-plan'); assert.equal(plan.consumer.bootstrapCandidate, null);
assert.equal(plan.independentReview, null); assert.equal(plan.RootExecutionApproval, null);
const bootstrapCommand = read(P + '/bootstrap15-119-prepared01/run01/command-receipt.json');
const command = JSON.parse(bootstrapCommand.b); assert.equal(command.exitCode, 0);
const output = json(command.stdout), b0 = output.bootstrap, b0Body = json(b0);
assert.equal(b0Body.kind, 'actual-Source15-bootstrap-code-candidate119');
for (const pin of plan.tooling.executionSources) read(pin.file, pin.rawBytesSha256);
for (const h of json(plan.consumer.helperPins)) read(R + '/' + h.file, h.sha256);
for (const epoch of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + epoch + '/main01/driver.lock'));
for (const file of [E + '/state.json', E + '/ownership.jsonl', E + '/consumer-registry119-Reg5.json', E + '/code-candidate-admitted119-B1.json']) assert(!fs.existsSync(file));
const core = await import(pathToFileURL(R + '/tools/rust-r4ghi/business/source15-admission-core.mjs').href);
const scope = core.scope15(plan); assert.equal(b0Body.scope15, scope);
const bindings = {
  scope15: scope, bootstrapCandidate: b0, toolingManifest: plan.tooling.manifest,
  finalRetention14: plan.parent14.finalRetention14, apiProcess15: plan.consumer.apiProcess,
  sourcePins15: plan.consumer.sourcePins, helperPins15: plan.consumer.helperPins, buildBinding15: plan.consumer.buildBinding,
};
if (action === 'request-review') {
  assert(!fs.existsSync(F)); fs.mkdirSync(F, { mode: 0o700 });
  const request = put(F + '/request-final-scope-B0-review119.json', {
    kind: 'Root-requested-independent-fixed14-to15-admission119-final-review', recordedAt: new Date().toISOString(),
    actualBootstrapPlan: bootstrapPlan, actualBootstrapCommand: bootstrapCommand.pin,
    requiredReviewKind: 'non-author-fixed14-to15-admission119-review', requiredVerdict: 'approved-bounded-publication',
    author: '/root', requiredActualBindings: bindings, requiresNonAuthor: true,
    G3Certified: false, G4Certified: false, actualFinalPlan: null, actualReg5: null, actualB1: null, actualState15: null,
    onlyScopeExclusions: ['consumer.bootstrapCandidate', 'independentReview', 'RootExecutionApproval'],
    requestedAction: 'Independent actual scope plus actual B0 review; no publication, ordinary context, SQL/HTTP, process control or Cargo. Review is independent of its future finalPlan hash.',
  });
  console.log(JSON.stringify({ request, scope15: scope, bootstrap: b0, actualPublication: false }));
} else if (action === 'assemble-input') {
  const request = JSON.parse(read(F + '/request-final-scope-B0-review119.json').b);
  assert.deepEqual(request.requiredActualBindings, bindings);
  const review = read(args[2], args[4]), rb = JSON.parse(review.b);
  assert.equal(rb.kind, 'non-author-fixed14-to15-admission119-review'); assert.equal(rb.verdict, 'approved-bounded-publication');
  assert(typeof rb.author === 'string' && typeof rb.reviewer === 'string' && rb.author !== rb.reviewer);
  for (const k of ['G3Certified', 'G4Certified']) assert.equal(rb[k], false);
  assert.equal(rb.scope15, scope);
  for (const k of Object.keys(bindings).filter(k => k !== 'scope15')) core.samePin15(rb[k], bindings[k]);
  const D = P + '/plan15-publish-119-prepared01'; assert(!fs.existsSync(D));
  const outputFile = P + '/source15-plan119-publish01.json'; assert(!fs.existsSync(outputFile));
  const internal = { kind: 'Root-exact-fixed14-to15-publication119', ...bindings, independentReview: review.pin,
    allowedMode: 'publish', requiresState15Absent: true, domainEffects: false };
  const internalPin = put(F + '/Root-internal-publication-approval119.json', internal);
  plan.consumer.bootstrapCandidate = b0; plan.independentReview = review.pin; plan.RootExecutionApproval = internalPin;
  assert.equal(core.scope15(plan), scope);
  plan.resources = null; fs.mkdirSync(D, { mode: 0o700 });
  const draft = put(D + '/draft-plan119.json', plan), code = plan.tooling.executionSources;
  const input = { kind: 'Root-source15-119-plan-assembly-input', mode: 'assemble-plan', stage: 'publish',
    helperPins: plan.consumer.helperPins, draftPlan: draft, outputFile,
    tooling: { entry: code.find(p => p.file === R + '/tools/rust-r4ghi/source15-admission119/plan-source15.mjs'), manifest: plan.tooling.manifest, executionSources: code } };
  const ip = put(D + '/plan-assembly-input119.json', input);
  const approval = { kind: 'Root-exact-source15-119-operation', input: ip, mode: 'assemble-plan', stage: 'publish',
    toolingManifest: plan.tooling.manifest, scope15: scope, domainHTTP: false, stateMinted: false, ordinaryContextCreated: false };
  const ap = expected(D + '/Root-exact-plan-assembly-approval119.json', approval);
  const rp = put(D + '/request-plan-assembly-G2-review119.json', {
    kind: 'Root-requested-exact-Source15-plan-assembly119-G2', recordedAt: new Date().toISOString(), mode: 'assemble-plan', stage: 'publish',
    input: ip, expectedApproval: ap, expectedApprovalBody: approval, scope15: scope,
    actualBootstrapPlan: bootstrapPlan, actualBootstrap: b0, independentPublicationReview: review.pin, RootInternalApproval: internalPin,
    requestedAction: 'Only final immutable plan assembly/readback and native verifyPlan15 publish; no Reg5/B1/state or context/SQL/HTTP/process control/Cargo',
    actualPlan: false, actualG2: false, Source15Admitted: false,
  });
  console.log(JSON.stringify({ request: rp, input: ip, expectedApproval: ap, actualFinalPlan: false }));
} else {
  const finalCommand = read(P + '/plan15-publish-119-prepared01/run01/command-receipt.json');
  assert.equal(JSON.parse(finalCommand.b).exitCode, 0);
  const finalPlanPin = read(P + '/source15-plan119-publish01.json').pin, finalPlan = json(finalPlanPin);
  assert.equal(core.scope15(finalPlan), scope); core.samePin15(finalPlan.consumer.bootstrapCandidate, b0);
  const oldRequest = JSON.parse(read(P + '/bootstrap15-119-prepared01/request-publisher-G2-review119.json').b);
  const oldInput = json(oldRequest.input);
  const D = P + '/publish15-119-prepared01'; assert(!fs.existsSync(D));
  const input = { ...oldInput, mode: 'publish', plan: finalPlanPin, intentFile: E + '/source15-publication119-intent.jsonl' };
  assert.notEqual(input.intentFile, oldInput.intentFile); assert(!fs.existsSync(input.intentFile));
  fs.mkdirSync(D, { mode: 0o700 }); const ip = put(D + '/publish15-input119.json', input);
  const approval = { kind: 'Root-exact-source15-publisher119', input: ip, plan: finalPlanPin, mode: 'publish',
    toolingManifest: finalPlan.tooling.manifest, scope15: scope, bootstrapCandidate: b0,
    RootExecutionApproval: finalPlan.RootExecutionApproval, publishState: true, ordinaryContext: false, domainEffects: false };
  const ap = expected(D + '/Root-exact-publish15-approval119.json', approval);
  const rp = put(D + '/request-publisher-G2-review119.json', {
    kind: 'Root-requested-exact-Source15-publisher119-G2', recordedAt: new Date().toISOString(), mode: 'publish',
    input: ip, expectedApproval: ap, expectedApprovalBody: approval,
    actualFinalPlan: finalPlanPin, actualFinalPlanCommand: finalCommand.pin, scope15: scope,
    requestedAction: 'Native Reg5 wx/readback then actual B1 wx/readback then atomic no-replace state last; no ordinary context, domain command, SQL/HTTP, process control or Cargo',
    actualPublication: false, actualG2: false, businessG2Granted: false,
  });
  console.log(JSON.stringify({ request: rp, input: ip, expectedApproval: ap, actualPublication: false }));
}
