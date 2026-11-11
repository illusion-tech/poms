// Root filesystem-only input construction after actual owned API14 retirement.
// This does not sign an approval or run any lifecycle, context, SQL or HTTP mode.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const I = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const O = P + '/bind15-119-prepared01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, expected) {
  const s = fs.lstatSync(file);
  assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file);
  if (expected) assert.equal(sha(b), expected, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
function put(name, value) {
  const file = O + '/' + name;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
assert.equal(process.platform, 'linux');
assert.equal(process.cwd(), R);
assert(!fs.existsSync(O));
const recipe = read(I + '/tools/rust-r4ghi/I/implementation/source15-admission119-operation-recipe01/recipe119.json', '490b71be1f831909a66724fee3b9d665a5e74ef7e17106effa0290cdb032e348');
const retireRequest = JSON.parse(read(P + '/retire14-119-prepared01/request-retire14-G2-review119.json', 'b578f939d9851e2faf1c294af89d527fecca2a687b43df1e02314fdf6c3aabbb').b);
const retireInput = json(retireRequest.input);
const outerRetire = read(P + '/retire14-119-prepared01/run01/command-receipt.json');
assert.equal(JSON.parse(outerRetire.b).exitCode, 0);
const retirement = read(P + '/source15-api119-retire14-01/retirement14.json');
const stopped = JSON.parse(retirement.b);
assert.equal(stopped.kind, 'actual-source14-API-retirement-for15');
assert.equal(stopped.stopped, true);
assert.equal(stopped.signalOwnedIdentityVerified, true);
assert.equal(stopped.Source15Admitted, false);
const parent14 = structuredClone(retireInput.parent14);
assert.equal(parent14.retirement14, null);
parent14.retirement14 = retirement.pin;
const manifest = read(I + '/tools/rust-r4ghi/I/implementation/source15-admission119-code02/sealed-code02/manifest119-code02.json', '37ac7622343defd6a4f2139de0170593e79ecb23ce31b1c331e467c2b0a74994');
const m = JSON.parse(manifest.b);
const code = m.production.map(e => read(R + '/' + e.file, e.afterSHA256).pin);
assert.deepEqual(code, retireInput.tooling.executionSources);
const wholeReview = read(R + '/tools/rust-r4ghi/independent/final-gates13/whole119-code-review02/review-whole119-code02.json', '4f367c4e99610766f94411b602ddf1aa8355a24260d6af1d945a6d1970566e08');
const helpers = retireInput.helperPins;
assert.equal(helpers.rawBytesSha256, '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1');
assert.equal(json(helpers).length, 227);
for (const h of json(helpers)) read(R + '/' + h.file, h.sha256);
const product = read(P + '/source15-parent-products119-prepared01/native-product-composition34402.json', 'faf2bce489e6ca0c4b7ba6b412753974116fcab5964ec73ac5a565e95137f697');
const helperComposition = read(P + '/source15-components119-H9-prepared01/promotion01/Root-final-H3-composition119.json', '9685c8162f06174ea3b88bd9962c3289be43121e74ccfe02ca7a07f07a9aec74');
const transfer = JSON.parse(read(P + '/source15-parent-products119-prepared01/state-transfer15-explicit26.json', 'f494483b1cb04120dcd2b12533dd8cdf383dc3cd457e6c2f9b8f6cee6a5edf94').b);
const pairPin = read(P + '/source15-build119-checks34402-02/build-pair.json', 'af055e8a3adef435b20d49b947030994c2acb0b5e63d7178ec96b15138c95e4c').pin;
const pair = json(pairPin), inventory = json(pair.inventory), mirror = json(pair.mirror);
assert.equal(pair.kind, 'actual-source15-eight-Cargo-steps119');
const source = json(inventory.sourcePins), compile = json(inventory.compilePins);
assert.equal(source.length, 420); assert.equal(compile.length, 528);
assert.equal(sha(JSON.stringify(source)), 'b55f88e158665474fb3890bec8749ec2af52544318f45aa068251bb476c18be7');
// Each imported original leaf was checked through the exact manifest above.
const retained = await import(pathToFileURL(R + '/tools/rust-r4ghi/business/retained-source14-for15.mjs').href);
const core = await import(pathToFileURL(R + '/tools/rust-r4ghi/business/source15-admission-core.mjs').href);
const parent = retained.verifyRetained14For15(parent14);
const resources = core.resourceEntries15(parent);
assert.equal(resources.length, 9);
core.assertStateTransfer15(transfer, parent.state);
const plan = JSON.parse(read(R + '/tools/rust-r4ghi/business/source15-admission.template.json', m.production.find(e => e.file === 'tools/rust-r4ghi/business/source15-admission.template.json').afterSHA256).b);
plan.parent14 = parent14;
Object.assign(plan.consumer, {
  sourcePins: inventory.sourcePins, sourcePinsSHA256: sha(JSON.stringify(source)), sourceCount: source.length,
  compilePins: inventory.compilePins, helperPins: helpers, helperCount: 227,
  binary: mirror.binary, summaryBinary: mirror.summaryBinary, trustedSummaryBinary: mirror.summaryBinary,
  binaryFiles: mirror.binaryFiles, binaryRoot: mirror.targetDirectory,
});
plan.sourceDeltas = JSON.parse(product.b).entries.map(({ file, beforeSHA256, afterSHA256 }) => ({ file, beforeSHA256, afterSHA256 }));
plan.productComposition = product.pin;
plan.helperComposition = helperComposition.pin;
plan.stateTransfer = transfer;
plan.resources = resources;
plan.tooling = { manifest: manifest.pin, executionSources: code, independentCodeReview: wholeReview.pin };
for (const k of ['buildBinding', 'apiProcess', 'readiness', 'observationReceipt', 'freshSnapshots', 'bootstrapCandidate']) assert.equal(plan.consumer[k], null);
for (const k of ['independentReview', 'RootExecutionApproval']) assert.equal(plan[k], null);
const rawHistory = read(P + '/source15-raw-execution-history119-01/history.json', 'cdc62446a854d5c63bcfe499129e909517d280b23bba287df69c93b94d113f28').pin;
const rawReview = read(R + '/tools/rust-r4ghi/independent/final-gates13/rawbuild119-actual-history-readback01/review-actual-raw-history119.json', 'f48b4e0e5312fdaec2ad769124eac7acdeb244bb92b1272af73176c5e1ce2167').pin;
const ownership = read(P + '/business/g2-business14/main01/ownership.jsonl', '559aa091ba9cfa1ef1c72dd2a7c4d21c8d4285588519de937e6db2b2efd6aa79').pin;
for (const e of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + e + '/main01/driver.lock'));
assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
const outputDirectory = P + '/source15-build119-bind-01';
assert(!fs.existsSync(outputDirectory));
fs.mkdirSync(O, { mode: 0o700 });
const pp = put('preAPI-draft-binding-null119.json', plan);
const tooling = {
  entry: code.find(p => p.file === R + '/tools/rust-r4ghi/source15-admission119/build-source15.mjs'),
  manifest: manifest.pin,
  executionSources: m.production.map((e, i) => ({ ...code[i], target: e.file })),
  independentCodeReview: wholeReview.pin,
};
const input = {
  kind: 'Root-source15-119-build-input', mode: 'bind', state13: retireInput.state13, state14: retireInput.state14,
  ownership14: ownership, archive344: parent14.archive344, finalRetention14: parent14.finalRetention14,
  finalRetention14Review: parent14.finalRetentionReview, retirement14: retirement.pin, productComposition: product.pin,
  currentHelperPins: helpers, helperPins: helpers, inventory: null, buildPair: pairPin, targetRoot: null,
  outputDirectory, preAPIPlan: pp, tooling, rustExecutionHistory: rawHistory, rustExecutionReview: rawReview,
};
const ip = put('bind15-input119.json', input);
const approval = {
  kind: 'Root-exact-source15-119-build', input: ip, mode: 'bind', toolingManifest: manifest.pin,
  stateMinted: false, domainHTTP: false, ordinaryContextCreated: false,
  runsCargo: false, mirrorSourceCopy: false, helperFSBinding: true,
};
const ab = Buffer.from(JSON.stringify(approval, null, 2) + '\n');
const ap = { file: O + '/Root-exact-bind15-approval119.json', bytes: ab.length, rawBytesSha256: sha(ab) };
const request = put('request-bind15-G2-review119.json', {
  kind: 'Root-requested-exact-Source15-helper-binding119-G2', recordedAt: new Date().toISOString(),
  input: ip, expectedApproval: ap, expectedApprovalBody: approval, recipe: recipe.pin,
  actualRetirement: retirement.pin, retirementCommand: outerRetire.pin,
  requestedAction: 'Only actual build-binding wx/readback and native preAPI postcheck, no API start or state/SQL/HTTP/Cargo',
  resourcesDerivedByNativeReader: true, resourceCount: resources.length,
  currentSource15StateAbsent: true, actualBinding: false, actualG2: false, Source15Admitted: false,
});
console.log(JSON.stringify({ request, input: ip, expectedApproval: ap, actualBinding: false }));
