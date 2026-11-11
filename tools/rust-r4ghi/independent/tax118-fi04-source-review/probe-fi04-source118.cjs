// Exact pure helpers/expressions and pre-write guard models; no whole Root module.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const LR = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const LI = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const O = P + '/tax15-fi-closed-set118-prepared03';
const D = I + '/tools/rust-r4ghi/I/independent-root-tax118-fi-orchestration-review01';
const ts = require(require.resolve('typescript', { paths: [R] }));
const sha = b => createHash('sha256').update(b).digest('hex');
const bytes = v => Buffer.from(JSON.stringify(v, null, 2) + '\n');
function read(file, hash) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink());
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash);
  return { b, pin: { file: file.split(path.sep).join('/').replace(R, LR).replace(I, LI), bytes: b.length, rawBytesSha256: sha(b) } };
}
function put(name, value) {
  const file = D + '/' + name; fs.writeFileSync(file, bytes(value), { flag: 'wx' }); return read(file).pin;
}
const old = read(R + '/tools/rust-r4ghi/prepare-tax118-fi03.mjs', 'b8cab8f0160d3a45843b9d711445dd68ca00a20be34bffaaea8c38b440f2b74d');
const corrected = read(R + '/tools/rust-r4ghi/prepare-tax118-fi04.mjs', '5e9a4cd69e0eb74d334e6a07e85f0d8f07884d5a29f108fd72f4603476b3cbe5');
const change = read(R + '/tools/rust-r4ghi/tax118-fi-preparer04-derivation.json', '62aa0f109e5863143f5c4aff8dc53ccd5be9949ce6136a02811db2dea210581c');
const outer = read(R + '/tools/rust-r4ghi/execute-tax118-fi-once03.mjs', 'd506d884b436f8e06e4e2e24ebe21ad1533270b48587760e00fa6c9a907b4d40');
const outerBase = read(R + '/tools/rust-r4ghi/execute-prepare118-once03.mjs', '01f4e1c187370ea07c2ebc02854a0d6173777ea885612907baa43f72a00a9e10');
const outerChange = read(R + '/tools/rust-r4ghi/tax118-fi-outer03-derivation.json', 'd2cb0079c8ce9ce5cb531df6f1e75306d542bb45a5b9e5823502c20e923c59fd');
const runner = read(R + '/tools/rust-r4ghi/tax15-invocation118/run-tax15-once.mjs', '0f5fed8fabce7d65f3a4854da0f1ce751889c296933cff7ebc73ede0e7af0667');
const proof = read(R + '/tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs', 'a5b50ba102c4def8ebf0594a4cfa5ff207ee9a0e3452875385a5806659e0bfb8');
const cases = [];
function check(name, fn) { fn(); cases.push({ name, passed: true }); }
const edits = JSON.parse(change.b).edits;
check('all eight preparer edits exactly map03 to04 and inverse to original bytes', () => {
  assert.equal(edits.length, 8);
  const fwd = edits.reduce((s, e) => { assert.equal(s.split(e.from).length - 1, 1); return s.replace(e.from, e.to); }, old.b.toString());
  assert.deepEqual(Buffer.from(fwd), corrected.b);
  const inv = [...edits].reverse().reduce((s, e) => { assert.equal(s.split(e.to).length - 1, 1); return s.replace(e.to, e.from); }, fwd);
  assert.deepEqual(Buffer.from(inv), old.b);
});
check('all five FI outer literal edits exactly map approved01f4 base to d506 and inverse', () => {
  const list = JSON.parse(outerChange.b).edits;
  const fwd = list.reduce((s, e) => { assert.equal(s.split(e.from).length - 1, e.occurrences); return s.split(e.from).join(e.to); }, outerBase.b.toString());
  assert.deepEqual(Buffer.from(fwd), outer.b);
  // The new directory itself contains "fi-closed-set". Restore its exact
  // directory literal before reversing the general mode replacement.
  const pathRestored = fwd.split(list[0].to).join(list[0].from);
  const inv = list.slice(1).reverse().reduce((s, e) => s.split(e.to).join(e.from), pathRestored);
  assert.deepEqual(Buffer.from(inv), outerBase.b);
});
const src = corrected.b.toString(), sf = ts.createSourceFile('prepare-tax118-fi04.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const same = sf.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'samePin');
const j = sf.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(sf) === 'json'));
assert(same && j);
const memory = new Map();
const modelRead = (file, expected) => {
  assert(memory.has(file)); const b = memory.get(file); if (expected) assert.equal(sha(b), expected);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
};
const helpers = new Function('read', 'assert', j.getText(sf) + '\n' + same.getText(sf) + '\nreturn {json,samePin};')(modelRead, assert);
const file = O + '/SYNTHETIC-PIN-ONLY.json', b = bytes({ syntheticModel: true }); memory.set(file, b);
const full = { file, bytes: b.length, rawBytesSha256: sha(b) }, cli = { file, rawBytesSha256: sha(b) };
check('actual CLI main constructs input/review pins without bytes; no implicit augmentation', () => {
  assert(runner.b.toString().includes('{ file: args[1], rawBytesSha256: args[3] }'));
  assert(runner.b.toString().includes('{ file: args[5], rawBytesSha256: args[7] }'));
  assert(runner.b.toString().includes('input: inputPin'));
  assert(runner.b.toString().includes('review: reviewPin'));
  assert(proof.b.toString().includes('inputPin: freeze118({ ...inputPin })'));
});
check('old whole pin comparison rejects true two-key CLI versus three-key metadata shape', () => {
  assert(old.b.toString().includes('assert.deepEqual(complete.input,priorRequest.input);'));
  assert(old.b.toString().includes('assert.deepEqual(complete.review,priorRequest.expectedRootReview);'));
  assert(old.b.toString().includes('assert.deepEqual(journal.input,priorRequest.input);'));
  assert.throws(() => assert.deepEqual(cli, full));
});
for (const [name, a, other] of [['CLI to full', cli, full], ['full to CLI', full, cli], ['full to full', full, full], ['CLI to CLI', cli, cli]]) {
  check('04 samePin accepts matching ' + name, () => helpers.samePin(a, other));
}
check('04 rejects different file', () => assert.throws(() => helpers.samePin(cli, { ...full, file: file + '-other' })));
check('04 rejects different digest', () => assert.throws(() => helpers.samePin(cli, { ...full, rawBytesSha256: '0'.repeat(64) })));
check('04 rejects wrong left optional length', () => assert.throws(() => helpers.samePin({ ...full, bytes: 1 }, cli)));
check('04 rejects wrong right optional length', () => assert.throws(() => helpers.samePin(cli, { ...full, bytes: 1 })));
check('04 rejects underlying raw corruption', () => { memory.set(file, Buffer.from('corrupt')); assert.throws(() => helpers.samePin(cli, full)); memory.set(file, b); });
check('04 JSON accepts missing optional bytes', () => assert.deepEqual(helpers.json(cli), { syntheticModel: true }));
check('04 JSON validates optional bytes', () => { assert.deepEqual(helpers.json(full), { syntheticModel: true }); assert.throws(() => helpers.json({ ...full, bytes: 1 })); });
const inventory = [{ key: 'zeta-MODEL' }, { key: 'alpha-MODEL' }, { key: 'middle-MODEL' }];
let setExpression;
function walk(n) {
  if (ts.isCallExpression(n) && n.expression.getText(sf) === 'put' && n.arguments[0]?.text === 'complete-ordered-FI-set118.json') setExpression = n.arguments[1];
  ts.forEachChild(n, walk);
}
walk(sf); assert(setExpression);
const modelPrepared = { fullInventory: full, bodySHA256: '1'.repeat(64) }, modelComplete = { result: cli };
const set = new Function('complete', 'prepared', 'inventory', 'sha', 'Buffer', 'return (' + setExpression.getText(sf) + ');')(modelComplete, modelPrepared, inventory, sha, Buffer);
check('exact metadata set expression keeps all original descriptors and original order', () => {
  assert.deepEqual(set.orderedFamilyKeys, inventory.map(d => d.key)); assert.deepEqual(set.descriptors, inventory);
  assert.equal(set.inventorySHA256, sha(Buffer.from(JSON.stringify(inventory)))); assert.equal(set.kind, 'Root-approved-Tax15-closed-FI-set118');
  assert.deepEqual(set.prepared, cli); assert.deepEqual(set.fullInventory, full);
});

const out = outer.b.toString(), begin = out.indexOf("assert.equal(request.kind, 'Root-requested-Tax15-fi-closed-set118-exact-G2');"), end = out.indexOf('fs.writeFileSync(request.expectedRootReview.file, bytes,');
assert(begin >= 0 && end > begin);
const span = out.slice(begin, end); assert(!span.includes('spawnSync(') && !span.includes('writeFileSync('));
const outerGuard = new Function('assert', 'request', 'r', 'R', 'P', 'O', 'read', 'fs', 'sha', 'Buffer', span + '\nreturn true;');
function guardCase(mutator) {
  const m = new Map(); const pinFor = (f, v) => { const data = bytes(v); m.set(f, data); return { file: f, bytes: data.length, rawBytesSha256: sha(data) }; };
  const entry = pinFor(O + '/SYNTHETIC-STATE.json', { model: true }); m.set(P + '/business/g2-business15/main01/state.json', m.get(entry.file));
  const runFile = LR + '/tools/rust-r4ghi/tax15-invocation118/run-tax15-once.mjs';
  const cp = pinFor(runFile, { modelSourceOnly: true });
  const review = pinFor(O + '/SYNTHETIC-CODE-REVIEW.json', { kind: 'non-author-Tax15-invocation118-code-review', verdict: 'code-ready-for-exact-input-review', reviewerIsAuthor: false, executionSources: [cp] });
  const input = { mode: 'fi-closed-set', kind: 'Root-reviewed-Tax15-invocation118', nonce: 'bba46250-cb0f-4f34-8573-fb2d2e27456a', codeReview: review, executionSources: [cp], expectedEntryState: entry };
  for (let i = 0; Object.keys(input).length < 34; i++) input['SYNTHETIC_' + i] = null;
  const ip = pinFor(O + '/SYNTHETIC-INPUT.json', input);
  const body = { kind: 'Root-approved-exact-Tax15-invocation118', approvedInput: ip, codeReview: review, expectedEntryState: entry, mode: 'fi-closed-set', nonce: input.nonce, actualG2Authorized: true, normalTaxPOSTGranted: false, FIGranted: true };
  if (mutator) mutator(body);
  const bb = bytes(body), expected = { file: O + '/SYNTHETIC-ROOT-REVIEW.json', bytes: bb.length, rawBytesSha256: sha(bb) };
  const request = { kind: 'Root-requested-Tax15-fi-closed-set118-exact-G2', input: ip, expectedRootReview: expected, expectedRootReviewBody: body };
  const r = { mode: 'fi-closed-set', verdict: 'approved-SYNTHETIC-ONLY', approvedInput: ip, expectedRootReview: expected };
  const rread = (f, hash) => { assert(m.has(f)); const b = m.get(f); if (hash) assert.equal(sha(b), hash); return { b }; };
  return () => outerGuard(assert, request, r, LR, P, O + '/run01', rread, { existsSync: () => false }, sha, Buffer);
}
check('FI exact pre-write guard accepts full consistent nine-field FI-only body', () => assert.equal(guardCase()(), true));
check('FI exact pre-write guard rejects normal grant', () => assert.throws(guardCase(b => { b.normalTaxPOSTGranted = true; })));
check('FI exact pre-write guard rejects false FI grant', () => assert.throws(guardCase(b => { b.FIGranted = false; })));
check('FI exact pre-write guard rejects prepare-only body mode', () => assert.throws(guardCase(b => { b.mode = 'prepare-only'; })));
check('FI exact pre-write guard rejects false G2', () => assert.throws(guardCase(b => { b.actualG2Authorized = false; })));
check('FI exact pre-write guard rejects mismatched nonce', () => assert.throws(guardCase(b => { b.nonce = 'old-nonce'; })));
for (const item of [old, corrected, change, outer, outerBase, outerChange, runner, proof]) {
  const file = item.pin.file.replace(LR, R); assert.deepEqual(read(file, item.pin.rawBytesSha256).b, item.b);
}
const capture = put('source-capture-fi03-04-outer03.json', { kind: 'immutable-FI-orchestration-source-capture', sources: [old, corrected, outer].map(x => ({ original: x.pin, rawBase64: x.b.toString('base64') })) });
const result = put('checks-fi04-source118.json', { kind: 'isolated-FI-metadata-pin-and-outer-source-contract-checks', sources: { oldPreparer03: old.pin, preparer04: corrected.pin, outerFI03: outer.pin, preparerDerivation: change.pin, outerDerivation: outerChange.pin, runner: runner.pin, invocationProof: proof.pin }, cases, passed: cases.length, failed: 0,
  modelSource: read(__filename).pin, sourceCapture: capture, samePinFunctionSource: same.getText(sf), jsonHelperSource: j.getText(sf), closedSetObjectSource: setExpression.getText(sf), outerExactGuardSpan: span,
  modelScope: 'Exact pure metadata helpers/object expression and pre-write guard span only. Pin/JSON/set/state/review buffers are synthetic. No whole Root module, prepared input, mode, context or effect is executed. The outer fixture tests mode/body guard only, not full34-key runtime schema or eight-source admission.',
  byteShapesAreFromActualRunnerABI: true, actualPrepareResultRead: false, ordinaryStateOrTicketValuesRead: false,
  beforeAfterSourcesStable: true, RootOrPrivateWritten: false, globalFSOrCryptoPatched: false, actualDispatches: 0, actualNativeOrContextCalls: 0, SQLHTTP: false });
console.log(JSON.stringify({ result, sourceCapture: capture, cases: cases.length, passed: cases.length, actualDispatches: 0 }));
