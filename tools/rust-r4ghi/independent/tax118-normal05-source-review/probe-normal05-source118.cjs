// Exact assertion/assignment spans and derivation only. Never runs a Root module.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const LR = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const LI = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const O = P + '/tax15-commit-once118-prepared05';
const D = I + '/tools/rust-r4ghi/I/independent-root-tax118-normal05-review01';
const ts = require(require.resolve('typescript', { paths: [R] }));
const sha = b => createHash('sha256').update(b).digest('hex');
const bytes = v => Buffer.from(JSON.stringify(v, null, 2) + '\n');
function read(file, expected) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink());
  const b = fs.readFileSync(file); if (expected) assert.equal(sha(b), expected);
  return { b, pin: { file: file.split(path.sep).join('/').replace(R, LR).replace(I, LI), bytes: b.length, rawBytesSha256: sha(b) } };
}
function put(name, obj) { const f = D + '/' + name; fs.writeFileSync(f, bytes(obj), { flag: 'wx' }); return read(f).pin; }
const prep = read(R + '/tools/rust-r4ghi/prepare-tax118-normal05.mjs', '6b85b80d10abee487fe075eade3abeccf066bc2efab4e8934db601fceba0de22');
const outer = read(R + '/tools/rust-r4ghi/execute-tax118-normal-once05.mjs', 'da5e81ab3d9f8a63bec71e91a8be7753ae487edcb6b4da5c053b860b9709d991');
const base = read(R + '/tools/rust-r4ghi/execute-tax118-fi-once03.mjs', 'd506d884b436f8e06e4e2e24ebe21ad1533270b48587760e00fa6c9a907b4d40');
const derivation = read(R + '/tools/rust-r4ghi/tax118-normal-outer05-derivation.json', '13a0b0bc137f5145ab660b65e071fd90729a3f00f773470a224fc32e91c6054b');
const fiMetadata = read(R + '/tools/rust-r4ghi/prepare-tax118-fi04.mjs', '5e9a4cd69e0eb74d334e6a07e85f0d8f07884d5a29f108fd72f4603476b3cbe5');
const cases = [], clone = structuredClone;
function check(name, fn) { fn(); cases.push({ name, passed: true }); }
const edits = JSON.parse(derivation.b).edits;
check('all seven restricted normal outer edits are exact forward and context-aware inverse', () => {
  assert.equal(edits.length, 7);
  const forward = edits.reduce((s, e) => { assert.equal(s.split(e.from).length - 1, e.occurrences); return s.split(e.from).join(e.to); }, base.b.toString());
  assert.deepEqual(Buffer.from(forward), outer.b);
  let inverse = forward.split(edits[0].to).join(edits[0].from);
  inverse = edits.slice(1).reverse().reduce((s, e) => s.split(e.to).join(e.from), inverse);
  assert.deepEqual(Buffer.from(inverse), base.b);
});
const sf = ts.createSourceFile('prepare-tax118-normal05.mjs', prep.b.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const fsf = ts.createSourceFile('prepare-tax118-fi04.mjs', fiMetadata.b.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function findFunction(file, name) { return file.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(file); }
check('samePin helper remains identical to reviewed FI04 including actual optional length checks', () => assert.equal(findFunction(sf, 'samePin'), findFunction(fsf, 'samePin')));
const predicates = sf.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
  sf.getLineAndCharacterOfPosition(n.getStart()).line + 1 >= 13 &&
  sf.getLineAndCharacterOfPosition(n.getStart()).line + 1 <= 20).map(n => n.getText(sf));
const args = ['state','record','sweep','fi','prepared','inventory','prior','priorRequest','complete','journal','exit','code'];
const predicateFn = new Function('assert', 'samePin', 'sha', 'Buffer', ...args, predicates.join('\n') + '\nreturn true;');
const fullPin = { file: O + '/SYNTHETIC-PIN.json', bytes: 5, rawBytesSha256: sha('model') };
const cliPin = { file: fullPin.file, rawBytesSha256: fullPin.rawBytesSha256 };
const samePin = new Function('assert','read', findFunction(sf, 'samePin') + '\nreturn samePin;')(assert, (file, expected) => {
  assert.equal(file, fullPin.file); assert.equal(expected, fullPin.rawBytesSha256); return { b: Buffer.from('model') };
});
function fixture() {
  const body = { syntheticOnly: 'not-a-runtime-body' }, inventory = [{key:'model-Z'}, {key:'model-A'}];
  const failures = inventory.map(d => ({ key: d.key, observation: fullPin }));
  const prepared = { body, bodySHA256: sha(JSON.stringify(body)), inventory: clone(inventory) };
  const prior = { nonce: '4c818b53-edc6-40cf-a293-49a8c0f4a3ab', bodySHA256: prepared.bodySHA256, prepared15: fullPin, executionSources: [fullPin] };
  const fi = { scope: { syntheticScope: true }, inventory: clone(inventory), failures: clone(failures), bodySHA256: prepared.bodySHA256, normalTaxPOSTExecuted: false };
  const sweep = { fiComplete: cliPin, scope: clone(fi.scope), inventory: clone(inventory), failures: clone(failures) };
  const record = { sweep, taxPreparation: { artifact: fullPin, body: clone(body) }, complete: null, sidecar: null };
  const state = { taxContinuation15: record, consumerChecks: { tax15Invocation118: { invocations: { [prior.nonce]: { closedJournal: fullPin } } } } };
  return { state, record, sweep, fi, prepared, inventory, prior,
    priorRequest: { input: fullPin, expectedRootReview: fullPin },
    complete: { kind: 'actual-Tax15-invocation118-command-complete', mode: 'fi-closed-set', input: cliPin, review: cliPin, result: fullPin, closed: { closedJournal: fullPin } },
    journal: { phase: 'closed-verified', nonce: prior.nonce, input: cliPin, result: fullPin },
    exit: { phase: 'exit-verified', failed: false, nonce: prior.nonce, result: fullPin },
    code: { kind: 'non-author-Tax15-invocation118-code-review', verdict: 'code-ready-for-exact-input-review', reviewerIsAuthor: false, executionSources: [fullPin] } };
}
function testPredicates(name, mutate, passes) {
  check(name, () => {
    const f = fixture(); if (mutate) mutate(f);
    const run = () => predicateFn(assert, samePin, sha, Buffer, ...args.map(k => f[k]));
    if (passes) assert.equal(run(), true); else assert.throws(run);
  });
}
testPredicates('normal metadata actual assertion span accepts coherent FI-only complete shape and CLI optional bytes', null, true);
testPredicates('failed FI journal rejected', f => { f.journal.phase = 'closed-failed'; }, false);
testPredicates('failed native exit rejected', f => { f.exit.failed = true; }, false);
testPredicates('wrong FI result/state pin rejected', f => { f.sweep.fiComplete = { ...fullPin, rawBytesSha256: '0'.repeat(64) }; }, false);
testPredicates('trimmed FI inventory rejected', f => { f.fi.inventory.pop(); }, false);
testPredicates('reordered complete failures rejected even when state agrees', f => { f.fi.failures.reverse(); f.sweep.failures.reverse(); }, false);
testPredicates('missing complete failures rejected', f => { f.fi.failures.pop(); f.sweep.failures.pop(); }, false);
testPredicates('wrong unchanged body hash rejected', f => { f.fi.bodySHA256 = '0'.repeat(64); }, false);
testPredicates('prepared body changed after FI rejected', f => { f.prepared.body.syntheticOnly = 'changed'; }, false);
testPredicates('FI claims previous normal execution rejected', f => { f.fi.normalTaxPOSTExecuted = true; }, false);
for (const field of ['activeFault', 'blockedObservation']) testPredicates('state ' + field + ' blocks normal metadata', f => { f.state[field] = { exists:true }; }, false);
for (const field of ['pendingTaxTrial','normalTaxPending','unexpectedTaxACK','complete','sidecar']) testPredicates('record ' + field + ' blocks normal metadata', f => { f.record[field] = { exists:true }; }, false);
testPredicates('cached 201 ACK blocks a new normal metadata package', f => { f.sweep.finalSuccess = { status:201 }; }, false);

const assignments = [];
function walk(n) {
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.expression.getText(sf) === 'input') assignments.push({ field:n.left.name.text, value:n.right.getText(sf) });
  ts.forEachChild(n, walk);
}
walk(sf);
check('normal input changes only six intended fields and explicitly clears FI set approval', () => {
  assert.deepEqual(assignments.map(x=>x.field), ['mode','nonce','phase','expectedEntryState','approvedClosedFISet','approvedFICompletion']);
  assert.equal(assignments.find(x=>x.field==='approvedClosedFISet').value, 'null');
  assert.equal(assignments.find(x=>x.field==='approvedFICompletion').value, 'complete.result');
});
const source = outer.b.toString(), begin = source.indexOf("assert.equal(request.kind, 'Root-requested-Tax15-commit-once118-exact-G2');"), end = source.indexOf('fs.writeFileSync(request.expectedRootReview.file, bytes,');
assert(begin >= 0 && end > begin); const guard = source.slice(begin,end);
assert(!guard.includes('spawnSync(') && !guard.includes('writeFileSync('));
const guardFn = new Function('assert','request','r','R','P','O','read','fs','sha','Buffer', guard+'\nreturn true;');
function outerModel(mutate) {
  const memory = new Map(); const save = (f,v) => { const b=bytes(v);memory.set(f,b);return {file:f,bytes:b.length,rawBytesSha256:sha(b)}; };
  const state=save(O+'/SYNTHETIC-STATE.json',{synthetic:true});memory.set(P+'/business/g2-business15/main01/state.json',memory.get(state.file));
  const src=save(LR+'/tools/rust-r4ghi/tax15-invocation118/run-tax15-once.mjs',{syntheticSource:true});
  const code=save(O+'/SYNTHETIC-CODE-REVIEW.json',{kind:'non-author-Tax15-invocation118-code-review',verdict:'code-ready-for-exact-input-review',reviewerIsAuthor:false,executionSources:[src]});
  const input={kind:'Root-reviewed-Tax15-invocation118',mode:'commit-once',nonce:'27685885-fbcc-47dd-9b8d-a82a691a774a',expectedEntryState:state,codeReview:code,executionSources:[src]};
  for(let i=0;Object.keys(input).length<34;i++)input['SYNTHETIC_'+i]=null;
  const ip=save(O+'/SYNTHETIC-INPUT.json',input),body={kind:'Root-approved-exact-Tax15-invocation118',approvedInput:ip,codeReview:code,expectedEntryState:state,mode:'commit-once',nonce:input.nonce,actualG2Authorized:true,normalTaxPOSTGranted:true,FIGranted:false};
  if(mutate)mutate(body);const b=bytes(body),rp={file:O+'/SYNTHETIC-REVIEW.json',bytes:b.length,rawBytesSha256:sha(b)};
  const request={kind:'Root-requested-Tax15-commit-once118-exact-G2',input:ip,expectedRootReview:rp,expectedRootReviewBody:body},r={mode:'commit-once',verdict:'approved-SYNTHETIC-MODEL-ONLY',approvedInput:ip,expectedRootReview:rp};
  const read=(f,h)=>{assert(memory.has(f));const b=memory.get(f);if(h)assert.equal(sha(b),h);return{b};};
  return()=>guardFn(assert,request,r,LR,P,O+'/run01',read,{existsSync:()=>false},sha,Buffer);
}
check('normal outer full nine-field positive matches normal=true and FI=false',()=>assert.equal(outerModel()(),true));
check('normal outer false normal grant rejected',()=>assert.throws(outerModel(b=>{b.normalTaxPOSTGranted=false;})));
check('normal outer FI grant rejected',()=>assert.throws(outerModel(b=>{b.FIGranted=true;})));
check('normal outer wrong mode rejected',()=>assert.throws(outerModel(b=>{b.mode='fi-closed-set';})));
check('normal outer mismatched nonce rejected',()=>assert.throws(outerModel(b=>{b.nonce='old';})));
check('normal outer false G2 rejected',()=>assert.throws(outerModel(b=>{b.actualG2Authorized=false;})));

for(const x of[prep,outer,base,derivation,fiMetadata])assert.deepEqual(read(x.pin.file.replace(LR,R),x.pin.rawBytesSha256).b,x.b);
const capture=put('source-capture-normal05.json',{kind:'immutable-normal05-orchestration-source-capture',sources:[prep,outer].map(x=>({original:x.pin,rawBase64:x.b.toString('base64')}))});
const result=put('checks-normal05-source118.json',{kind:'isolated-normal05-source-contract-checks',sources:{preparer:prep.pin,outer:outer.pin,baseFIOuter:base.pin,derivation:derivation.pin,reviewedFIHelper:fiMetadata.pin},cases,passed:cases.length,failed:0,sourceCapture:capture,diagnosticModel:read(__filename).pin,metadataAssertionStatements:predicates,normalInputAssignments:assignments,outerPrewriteGuardSpan:guard,
  modelBoundary:'Only exact pure helpers, selected actual pre-write assertion statements and outer guard span run with synthetic decoded objects/pin/state/review buffers. No complete module, metadata program, prepared data, raw FI evidence or native runtime is executed. This is not a full34-key/eight-source runtime or rollback oracle.',
  sourcePinsBeforeAfterStable:true,actualFIOrPrepareResultRead:false,currentOrdinaryStateOrTicketValuesRead:false,RootOrPrivateWritten:false,productionModulesExecuted:false,actualDispatches:0,nativeOrContextCalls:0,SQLHTTP:false,globalFSOrCryptoPatched:false});
console.log(JSON.stringify({result,sourceCapture:capture,cases:cases.length,passed:cases.length,actualDispatches:0}));
