// Root-only single dispatch after exact non-author bind-only G2.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/bind15-119-prepared01', O = D + '/run01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
function put(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return read(file).pin;
}
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R);
assert.deepEqual(process.execArgv, []);
assert.equal(sha(fs.readFileSync(process.execPath)), 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
const args = process.argv.slice(2); assert.equal(args.length, 4);
assert.deepEqual([args[0], args[2]], ['--review', '--review-sha']);
const review = read(args[1], args[3]), r = JSON.parse(review.b);
const requestPin = read(D + '/request-bind15-G2-review119.json');
const request = JSON.parse(requestPin.b);
assert.equal(request.kind, 'Root-requested-exact-Source15-helper-binding119-G2');
assert.equal(r.mode, 'bind'); assert(typeof r.verdict === 'string' && r.verdict.startsWith('approved-'));
assert.deepEqual(r.approvedInput, request.input);
assert.deepEqual(r.expectedApproval, request.expectedApproval);
const input = JSON.parse(read(request.input.file, request.input.rawBytesSha256).b);
assert.equal(input.kind, 'Root-source15-119-build-input'); assert.equal(input.mode, 'bind');
assert.equal(JSON.parse(read(input.preAPIPlan.file, input.preAPIPlan.rawBytesSha256).b).consumer.buildBinding, null);
const entry = read(input.tooling.entry.file, input.tooling.entry.rawBytesSha256);
for (const pin of input.tooling.executionSources) read(pin.file, pin.rawBytesSha256);
assert(!fs.existsSync(O)); assert(!fs.existsSync(input.outputDirectory));
assert(!fs.existsSync(request.expectedApproval.file));
const approvalBytes = Buffer.from(JSON.stringify(request.expectedApprovalBody, null, 2) + '\n');
assert.equal(approvalBytes.length, request.expectedApproval.bytes);
assert.equal(sha(approvalBytes), request.expectedApproval.rawBytesSha256);
fs.writeFileSync(request.expectedApproval.file, approvalBytes, { flag: 'wx', mode: 0o600 });
const approval = read(request.expectedApproval.file, request.expectedApproval.rawBytesSha256).pin;
fs.mkdirSync(O, { mode: 0o700 });
const stdout = O + '/stdout.log', stderr = O + '/stderr.log';
const out = fs.openSync(stdout, 'wx', 0o600), err = fs.openSync(stderr, 'wx', 0o600);
const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const argv = [entry.pin.file, '--input', request.input.file, '--input-sha', request.input.rawBytesSha256,
  '--approval', approval.file, '--approval-sha', approval.rawBytesSha256, '--execute'];
const began = new Date().toISOString();
const dispatch = put(O + '/dispatch.json', {
  kind: 'Root-actual-bind15-only119-dispatch', began, independentExactReview: review.pin,
  request: requestPin.pin, input: request.input, approval, entry: entry.pin,
  argv: [process.execPath, ...argv], cwd: R, originalStdout: stdout, originalStderr: stderr,
  scope: 'Only actual buildBinding wx/readback and native preAPI postcheck; no API, state, SQL/HTTP, Cargo or source copy',
  Source15Admitted: false,
});
read(entry.pin.file, entry.pin.rawBytesSha256);
let result; const start = performance.now();
try { result = spawnSync(process.execPath, argv, { cwd: R, env, stdio: ['ignore', out, err] }); }
finally { fs.closeSync(out); fs.closeSync(err); }
const receipt = put(O + '/command-receipt.json', {
  kind: 'Root-actual-bind15-only119-command', dispatch, began, ended: new Date().toISOString(),
  elapsedSeconds: (performance.now() - start) / 1000, exitCode: result.status, signal: result.signal,
  processError: result.error ? { name: result.error.name, message: result.error.message } : null,
  stdout: read(stdout).pin, stderr: read(stderr).pin, Source15Admitted: false,
});
console.log(JSON.stringify({ receipt, exitCode: result.status, stdoutBytes: fs.statSync(stdout).size, stderrBytes: fs.statSync(stderr).size }));
if (result.status !== 0) process.exitCode = 1;
