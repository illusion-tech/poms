// Root single dispatch after independent exact prepare-only review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/tax15-prepare118-prepared02', O = D + '/run01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file); return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
function put(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return read(file).pin; }
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R); assert.deepEqual(process.execArgv, []);
assert.equal(sha(fs.readFileSync(process.execPath)), 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
const args = process.argv.slice(2); assert.equal(args.length, 4); assert.deepEqual([args[0], args[2]], ['--review', '--review-sha']);
const review = read(args[1], args[3]), r = JSON.parse(review.b), requestPin = read(D + '/request-prepare-only-G2-review118.json');
const request = JSON.parse(requestPin.b);
assert.equal(request.kind, 'Root-requested-Tax15-prepare-only118-exact-G2');
assert.equal(r.mode, 'prepare-only'); assert(typeof r.verdict === 'string' && r.verdict.startsWith('approved-'));
assert.deepEqual(r.approvedInput, request.input); assert.deepEqual(r.expectedRootReview, request.expectedRootReview);
const input = JSON.parse(read(request.input.file, request.input.rawBytesSha256).b); assert.equal(input.mode, 'prepare-only');
assert.equal(input.kind, 'Root-reviewed-Tax15-invocation118'); assert.equal(Object.keys(input).length, 34);
const entry = input.executionSources.find(p => p.file === R + '/tools/rust-r4ghi/tax15-invocation118/run-tax15-once.mjs'); assert(entry);
const codeReview = JSON.parse(read(input.codeReview.file, input.codeReview.rawBytesSha256).b);
assert.equal(codeReview.kind, 'non-author-Tax15-invocation118-code-review');
assert.equal(codeReview.verdict, 'code-ready-for-exact-input-review');
assert.equal(codeReview.reviewerIsAuthor, false);
assert.deepEqual(codeReview.executionSources, input.executionSources);
for (const p of input.executionSources) read(p.file, p.rawBytesSha256);
const liveState = read(P + '/business/g2-business15/main01/state.json', input.expectedEntryState.rawBytesSha256);
assert.deepEqual(liveState.b, read(input.expectedEntryState.file, input.expectedEntryState.rawBytesSha256).b);
assert(!fs.existsSync(O)); assert(!fs.existsSync(request.expectedRootReview.file));
for (const epoch of [13, 14, 15]) assert(!fs.existsSync(P + '/business/g2-business' + epoch + '/main01/driver.lock'));
const bytes = Buffer.from(JSON.stringify(request.expectedRootReviewBody, null, 2) + '\n');
assert.equal(bytes.length, request.expectedRootReview.bytes); assert.equal(sha(bytes), request.expectedRootReview.rawBytesSha256);
assert.equal(request.expectedRootReviewBody.actualG2Authorized, true);
assert.equal(request.expectedRootReviewBody.normalTaxPOSTGranted, false); assert.equal(request.expectedRootReviewBody.FIGranted, false);
fs.writeFileSync(request.expectedRootReview.file, bytes, { flag: 'wx', mode: 0o600 });
const rootReview = read(request.expectedRootReview.file, request.expectedRootReview.rawBytesSha256).pin;
fs.mkdirSync(O, { mode: 0o700 });
const stdout = O + '/stdout.log', stderr = O + '/stderr.log', out = fs.openSync(stdout, 'wx', 0o600), err = fs.openSync(stderr, 'wx', 0o600);
const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const argv = [entry.file, '--input', request.input.file, '--input-sha', request.input.rawBytesSha256,
  '--review', rootReview.file, '--review-sha', rootReview.rawBytesSha256, '--execute'];
const began = new Date().toISOString();
const dispatch = put(O + '/dispatch.json', { kind: 'Root-actual-single-Tax15-prepare-only118-dispatch', began,
  independentExactReview: review.pin, request: requestPin.pin, input: request.input, RootReview: rootReview, entry,
  argv: [process.execPath, ...argv], cwd: R, originalStdout: stdout, originalStderr: stderr,
  scope: 'One actual native entry/exit; actor auth and complete read-only preparation evidence. Auth session/audit may write; no classification, FI, Tax/Main command or normal201' });
read(entry.file, entry.rawBytesSha256); let result; const start = performance.now();
try { result = spawnSync(process.execPath, argv, { cwd: R, env, stdio: ['ignore', out, err] }); }
finally { fs.closeSync(out); fs.closeSync(err); }
const receipt = put(O + '/command-receipt.json', { kind: 'Root-actual-single-Tax15-prepare-only118-command', dispatch, began,
  ended: new Date().toISOString(), elapsedSeconds: (performance.now() - start) / 1000,
  exitCode: result.status, signal: result.signal, processError: result.error ? { name: result.error.name, message: result.error.message } : null,
  stdout: read(stdout).pin, stderr: read(stderr).pin, normalTaxPOSTGranted: false, FIGranted: false, blindRetryForbidden: true });
console.log(JSON.stringify({ receipt, exitCode: result.status, stdoutBytes: fs.statSync(stdout).size, stderrBytes: fs.statSync(stderr).size }));
if (result.status !== 0) process.exitCode = 1;
