// Root-only finite ADD promotion. Importing exports only the no-replace primitive.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', I = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', M = '/home/wangzishi/projects/poms-rust-r4ghi';
const O = P + '/source15-callers120-promote-prepared01', SELF = R + '/tools/rust-r4ghi/promote-callers120-code02.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file); const b = fs.readFileSync(file);
  if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
function put(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return read(file).pin; }
const groups = ['policy-continuation15-287', 'legacy-authority15-284', 'period15-270', 'mixed15-271'];
function evidence() {
  const manifest = read(I + '/tools/rust-r4ghi/I/implementation/source15-callers-code02/sealed-code02/manifest120-code02.json', '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a');
  const review = read(R + '/tools/rust-r4ghi/independent/final-gates13/callers120-code-review02/review-callers120-code02-final.json', 'ff66299b80860079d77db44dda731f8f75054658355a1d46c81ef98106ed96d4');
  const wireReview = read(R + '/tools/rust-r4ghi/independent/final-gates13/callers120-code-review02/review-h15-code-readiness12002-final.json', 'b44768f5600910bcf0c38f43e0312ae3e8726cf2357f9924afb415505e588ed8');
  const m = JSON.parse(manifest.b), r = JSON.parse(review.b);
  assert.equal(m.issue, 120); assert.equal(m.edition, 'code02'); assert.equal(m.production.length, 25); assert.equal(m.validation.length, 4);
  assert.equal(r.verdict, 'code-ready-for-exact-input-review'); assert.equal(r.reviewerIsAuthor, false);
  assert.equal(r.toolingManifest.rawBytesSha256, manifest.pin.rawBytesSha256); assert.equal(r.actualPromotionVerified, false);
  assert.equal(r.finiteCodeCounts.productionADD, 25); assert.equal(r.finiteCodeCounts.H3Contribution, 0); assert.equal(r.finiteCodeCounts.backendSourceCompileContribution, 0);
  const targets = m.production.map(e => {
    assert.equal(e.operation, 'ADD'); assert.equal(e.beforeSHA256, null); assert.equal(e.inH3, false); assert.equal(e.backendSourceOrCompile, false);
    assert(groups.some(g => path.dirname(e.file) === 'tools/rust-r4ghi/' + g));
    const candidate = read(e.candidate.file, e.afterSHA256).pin;
    const f = r.futureRootCandidateMapping.find(p => p.file === R + '/' + e.file); assert(f);
    assert.equal(f.rawBytesSha256, candidate.rawBytesSha256); assert.deepEqual(f.candidate, candidate);
    return { file: R + '/' + e.file, relative: e.file, operation: 'ADD', beforeSHA256: null, candidate };
  });
  assert.equal(new Set(targets.map(t => t.file)).size, 25);
  return { manifest: manifest.pin, review: review.pin, wireReview: wireReview.pin, technicalG1: m.frozenG1, targets };
}
function fresh(p) {
  for (const q of p.protectedFiles) read(q.file, q.rawBytesSha256);
  const state15 = P + '/business/g2-business15/main01/state.json';
  if (p.state15 === null) assert(!fs.existsSync(state15)); else read(p.state15.file, p.state15.rawBytesSha256);
  for (const epoch of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + epoch + '/main01/driver.lock'));
  const source = json(p.sourcePins), compile = json(p.compilePins), helpers = json(p.helperPins);
  assert.equal(source.length, 420); assert.equal(compile.length, 528); assert.equal(helpers.length, 227);
  assert.equal(sha(JSON.stringify(source)), 'b55f88e158665474fb3890bec8749ec2af52544318f45aa068251bb476c18be7');
  for (const root of [R, M]) for (const e of [...source, ...compile]) read(root + '/' + e.file, e.sha256);
  const actual = fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => {
    const relative = 'tools/rust-r4ghi/business/' + n;
    return { file: relative, sha256: read(R + '/' + relative).pin.rawBytesSha256 };
  });
  assert.deepEqual(actual, helpers);
  for (const q of p.native14) read(q.file, q.rawBytesSha256);
  for (const q of p.executor118) read(q.file, q.rawBytesSha256);
}
export function installAdd120(stage, target, expectedSHA256) {
  assert.equal(path.dirname(stage), path.dirname(target));
  read(stage, expectedSHA256); assert(!fs.existsSync(target));
  fs.linkSync(stage, target); // Atomic EEXIST; never replaces an existing target.
  const st = fs.lstatSync(stage), to = fs.lstatSync(target);
  assert.equal(to.dev, st.dev); assert.equal(to.ino, st.ino); assert.equal(to.nlink, 2);
  assert.equal(sha(fs.readFileSync(target)), expectedSHA256);
  fs.unlinkSync(stage); return read(target, expectedSHA256).pin;
}
async function main(args) {
  assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R); assert.deepEqual(process.execArgv, []);
  assert.equal(sha(fs.readFileSync(process.execPath)), 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
  assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
  const mode = args[0]; assert(['prepare', 'dispatch', 'apply'].includes(mode));
  if (mode === 'prepare') {
    assert.equal(args.length, 1); assert(!fs.existsSync(O));
    const e = evidence(), inventory = JSON.parse(read(P + '/source15-build119-inventory34402-01/inventory-copy.json', '3ac1a8a7ccc0b50c5bb470034e0a313ecd7413c304e910fc5762ee4c99b841f0').b);
    const native14 = JSON.parse(read(P + '/source15-api119-start15-01/process.json', 'b42e176e4b77a63136cfee4a7fdc9f294552e1fd279acf3d951f066fa21a520c').b).code;
    const executor118 = JSON.parse(read(R + '/tools/rust-r4ghi/tax15-invocation118/tests/non-author-review01/review118-code01.json', 'b3d57cf0a7f4b08929001f9365c8c31176fd8bbc49b315f998caed59d55ae563').b).executionSources;
    const state15File = P + '/business/g2-business15/main01/state.json';
    const p = { kind: 'Root-finite-callers120-code02-filesystem-promotion-plan', ...e, operator: read(SELF).pin,
      sourcePins: inventory.sourcePins, compilePins: inventory.compilePins,
      helperPins: read(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1').pin,
      protectedFiles: [read(P + '/business/g2-business13/main01/state.json', 'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4').pin,
        read(P + '/business/g2-business14/main01/state.json', 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97').pin,
        read(P + '/business/g2-business13/main01/ownership.jsonl').pin,
        read(P + '/business/g2-business14/main01/ownership.jsonl', '559aa091ba9cfa1ef1c72dd2a7c4d21c8d4285588519de937e6db2b2efd6aa79').pin],
      state15: fs.existsSync(state15File) ? read(state15File).pin : null, native14, executor118,
      newDirectories: groups.map(g => R + '/tools/rust-r4ghi/' + g),
      count: 25, H3Delta: 0, backendDelta: 0, API: false, Cargo: false, context: false, DBHTTP: false, businessStateWrite: false };
    fresh(p); for (const t of p.targets) assert(!fs.existsSync(t.file)); for (const d of p.newDirectories) assert(!fs.existsSync(d));
    fs.mkdirSync(O, { mode: 0o700 }); const plan = put(O + '/plan120.json', p);
    const request = put(O + '/request-source-safety-review120.json', { kind: 'Root-requested-non-author-callers120-promotion-source-safety', plan, operator: p.operator,
      requestedVerdict: 'eligible-filesystem-action-source-safety-only', expectedReviewFields: ['approvedPlan', 'promotionOperator'],
      productCodeReviewAlreadyIndependent: e.review, newDirectories: p.newDirectories, noReplaceOnly: true,
      validationFilesPromoted: 0, actualPromotion: false, G3Certified: false, G4Certified: false });
    console.log(JSON.stringify({ plan, request, actualPromotion: false })); return;
  }
  const planPin = read(O + '/plan120.json').pin, p = json(planPin); assert.equal(p.kind, 'Root-finite-callers120-code02-filesystem-promotion-plan');
  assert.deepEqual(p.operator, read(SELF).pin); const actualEvidence = evidence();
  for (const k of ['manifest', 'review', 'wireReview', 'technicalG1', 'targets']) assert.deepEqual(p[k], actualEvidence[k]);
  if (mode === 'dispatch') {
    assert.equal(args.length, 5); assert.deepEqual([args[1], args[3]], ['--review', '--review-sha']);
    const review = read(args[2], args[4]), r = JSON.parse(review.b);
    assert.equal(r.verdict, 'eligible-filesystem-action-source-safety-only'); assert.deepEqual(r.approvedPlan, planPin); assert.deepEqual(r.promotionOperator, p.operator);
    const approval = { kind: 'Root-exact-reviewed-callers120-filesystem-promotion', plan: planPin, sourceSafetyReview: review.pin, operator: p.operator,
      productionCount: 25, newDirectories: p.newDirectories, mechanicalSiblingStages: 'each exact target + .caller120- + execution UUID; owned candidate bytes only', API: false, Cargo: false, context: false, DBHTTP: false, businessStateWrite: false };
    const approvalPin = put(O + '/Root-exact-promotion120-approval.json', approval), run = O + '/run01'; assert(!fs.existsSync(run)); fs.mkdirSync(run, { mode: 0o700 });
    const stdout = run + '/stdout.log', stderr = run + '/stderr.log', out = fs.openSync(stdout, 'wx', 0o600), err = fs.openSync(stderr, 'wx', 0o600);
    const argv = [SELF, 'apply', '--approval', approvalPin.file, '--approval-sha', approvalPin.rawBytesSha256];
    const began = new Date().toISOString(); put(run + '/dispatch.json', { began, plan: planPin, approval: approvalPin, argv: [process.execPath, ...argv], cwd: R, originalStdout: stdout, originalStderr: stderr });
    read(SELF, p.operator.rawBytesSha256); let result;
    try { result = spawnSync(process.execPath, argv, { cwd: R, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' }, stdio: ['ignore', out, err] }); }
    finally { fs.closeSync(out); fs.closeSync(err); }
    const receipt = put(run + '/command-receipt.json', { kind: 'Root-actual-callers120-promotion-command', began, ended: new Date().toISOString(), exitCode: result.status, signal: result.signal,
      processError: result.error ? { name: result.error.name, message: result.error.message } : null, stdout: read(stdout).pin, stderr: read(stderr).pin, businessG2Granted: false });
    console.log(JSON.stringify({ receipt, exitCode: result.status })); if (result.status !== 0) process.exitCode = 1; return;
  }
  assert.equal(args.length, 5); assert.deepEqual([args[1], args[3]], ['--approval', '--approval-sha']);
  const approval = json(read(args[2], args[4]).pin); assert.equal(approval.kind, 'Root-exact-reviewed-callers120-filesystem-promotion');
  assert.deepEqual(approval.plan, planPin); assert.deepEqual(approval.operator, p.operator); assert.equal(approval.productionCount, 25);
  const sourceSafety = json(approval.sourceSafetyReview); assert.equal(sourceSafety.verdict, 'eligible-filesystem-action-source-safety-only');
  assert.deepEqual(sourceSafety.approvedPlan, planPin); assert.deepEqual(sourceSafety.promotionOperator, p.operator);
  fresh(p); for (const t of p.targets) assert(!fs.existsSync(t.file)); for (const d of p.newDirectories) assert(!fs.existsSync(d));
  const D = O + '/actual01'; assert(!fs.existsSync(D)); fs.mkdirSync(D, { mode: 0o700 });
  const nonce = randomUUID(), lock = put(O + '/promotion-driver.lock', { pid: process.pid, nonce, plan: planPin });
  const installed = [], stages = [], createdDirectories = [];
  put(D + '/intent.json', { plan: planPin, approval: read(args[2], args[4]).pin, nonce });
  try {
    for (const d of p.newDirectories) { assert.equal(fs.realpathSync(path.dirname(d)), path.dirname(d)); fs.mkdirSync(d, { mode: 0o700 }); assert.equal(fs.realpathSync(d), d); createdDirectories.push(d); }
    for (const t of p.targets) { const b = read(t.candidate.file, t.candidate.rawBytesSha256).b, stage = t.file + '.caller120-' + nonce; fs.writeFileSync(stage, b, { flag: 'wx', mode: 0o600 }); stages.push({ stage, target: t.file, hash: t.candidate.rawBytesSha256 }); }
    for (const s of stages) installed.push(installAdd120(s.stage, s.target, s.hash));
    fresh(p); for (const s of stages) assert(!fs.existsSync(s.stage)); for (const t of p.targets) read(t.file, t.candidate.rawBytesSha256);
    const receipt = put(D + '/complete.json', { kind: 'Root-actual-callers120-code02-finite-filesystem-promotion', plan: planPin,
      productionInstalled: installed, createdDirectories, count: 25, helperCount: 227, sourceCount: 420, compileCount: 528,
      validationFilesPromoted: 0, H3Delta: 0, backendDelta: 0, API: false, Cargo: false, context: false, DBHTTP: false, businessStateWrite: false, G3Certified: false, G4Certified: false });
    assert.deepEqual(read(lock.file).pin, lock); fs.unlinkSync(lock.file); console.log(JSON.stringify({ receipt, installed: 25, helperCount: 227, businessG2Granted: false }));
  } catch (error) { put(D + '/partial.json', { kind: 'partial-callers120-promotion', message: error.message, installed, stages, createdDirectories, retainedLock: lock, blindRetryForbidden: true }); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({ kind: 'callers120-promotion-stopped', message: error.message, preserveAllArtifacts: true })); process.exitCode = 1; });
