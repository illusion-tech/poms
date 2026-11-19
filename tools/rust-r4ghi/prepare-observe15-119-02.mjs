// New immutable observation input after a genuine independent capture-code supplement.
// The original unsent input, approval image and successful plan remain untouched.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/observe15-119-prepared02';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R);
const args = process.argv.slice(2); assert.equal(args.length, 4);
assert.deepEqual([args[0], args[2]], ['--capture-code-review', '--capture-code-review-sha']);
const supplement = read(args[1], args[3]), review = JSON.parse(supplement.b);
assert.equal(review.kind, 'non-author-source15-admission119-code-review');
assert.equal(review.retain14CodeReady, true); assert.equal(review.actualG2Authorized, false);
assert(typeof review.author === 'string' && typeof review.reviewer === 'string' && review.author !== review.reviewer);
const oldRequestPin = read(P + '/observe15-119-prepared01/request-observe15-G2-review119.json', 'f30f80948f402a07eec3116a1d8653a430ca052257adfbe67b1fe3c9db11e0b9').pin;
const oldRequest = json(oldRequestPin), original = json(oldRequest.input);
assert.equal(oldRequest.input.rawBytesSha256, 'db399ac2875e3a05945a1cb4b12d5db1e2def6e26d7346b0d993041eaa2fed30');
assert(!fs.existsSync(oldRequest.expectedApproval.file)); assert(!fs.existsSync(P + '/observe15-119-prepared01/run01'));
assert(!fs.existsSync(D)); assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
assert.equal(original.tooling.independentCodeReview.rawBytesSha256, '4f367c4e99610766f94411b602ddf1aa8355a24260d6af1d945a6d1970566e08');
assert.equal(review.toolingManifest.file, original.tooling.manifest.file);
assert.equal(review.toolingManifest.rawBytesSha256, original.tooling.manifest.rawBytesSha256);
read(review.toolingManifest.file, review.toolingManifest.rawBytesSha256);
const input = structuredClone(original); input.tooling.independentCodeReview = supplement.pin;
const inverse = structuredClone(input); inverse.tooling.independentCodeReview = original.tooling.independentCodeReview;
assert.deepEqual(inverse, original);
for (const k of ['state13', 'state14', 'ownership14', 'sourcePins', 'helperPins', 'identity', 'provision', 'archive344', 'plan', 'apiProcess']) read(input[k].file, input[k].rawBytesSha256);
read(input.tooling.capture.file, input.tooling.capture.rawBytesSha256);
for (const h of json(input.helperPins)) read(R + '/' + h.file, h.sha256);
for (const epoch of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + epoch + '/main01/driver.lock'));
fs.mkdirSync(D, { mode: 0o700 });
function put(name, value) { const file = D + '/' + name; fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return read(file).pin; }
const ip = put('observe15-input119.json', input);
const approval = { ...oldRequest.expectedApprovalBody, input: ip, independentCodeReview: supplement.pin };
const ab = Buffer.from(JSON.stringify(approval, null, 2) + '\n');
const ap = { file: D + '/Root-exact-observe15-approval119.json', bytes: ab.length, rawBytesSha256: sha(ab) };
const request = put('request-observe15-G2-review119.json', {
  kind: 'Root-requested-exact-Source15-state-free-observation119-G2', recordedAt: new Date().toISOString(),
  input: ip, expectedApproval: ap, expectedApprovalBody: approval,
  originalUnexecutedRequest: oldRequestPin, originalUnexecutedInput: oldRequest.input,
  originalUnexecutedExpectedApproval: oldRequest.expectedApproval, independentCaptureCodeSupplement: supplement.pin,
  inputChangedPointers: ['/tooling/independentCodeReview'], originalPlanUnchanged: input.plan,
  requestedAction: oldRequest.requestedAction, ownerDatabaseAuthenticationOnly: true, authenticationMayCreateSessionAndAuthAudit: false,
  executor: read(R + '/tools/rust-r4ghi/execute-observe15-119-once02.mjs', '3a0519cd46163b76b2f00a05ba38099ac1c831b9ddd5d9ad4b53f553cb5522df').pin,
  observationAlreadyRun: false, actualG2: false, Source15Admitted: false,
});
console.log(JSON.stringify({ request, input: ip, expectedApproval: ap, observationAlreadyRun: false }));
