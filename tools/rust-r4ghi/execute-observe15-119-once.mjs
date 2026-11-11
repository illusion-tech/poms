// Root-only single dispatch after exact state-free observation G2.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/observe15-119-prepared01', O = D + '/run01';
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
assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), R); assert.deepEqual(process.execArgv, []);
assert.equal(sha(fs.readFileSync(process.execPath)), 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
const args = process.argv.slice(2); assert.equal(args.length, 4); assert.deepEqual([args[0], args[2]], ['--review', '--review-sha']);
const review = read(args[1], args[3]), r = JSON.parse(review.b);
const requestPin = read(D + '/request-observe15-G2-review119.json'), request = JSON.parse(requestPin.b);
assert.equal(request.kind, 'Root-requested-exact-Source15-state-free-observation119-G2');
assert.equal(r.mode, 'observe15'); assert(typeof r.verdict === 'string' && r.verdict.startsWith('approved-'));
assert.deepEqual(r.approvedInput, request.input); assert.deepEqual(r.expectedApproval, request.expectedApproval);
const input = JSON.parse(read(request.input.file, request.input.rawBytesSha256).b);
assert.equal(input.kind, 'Root-source15-admission119-state-free-capture-input'); assert.equal(input.mode, 'observe15');
const entry = read(input.tooling.capture.file, input.tooling.capture.rawBytesSha256);
assert.equal(entry.pin.file, R + '/tools/rust-r4ghi/source15-admission119/capture-source15.mjs');
read(input.plan.file, input.plan.rawBytesSha256);
assert(!fs.existsSync(O)); assert(!fs.existsSync(request.expectedApproval.file));
assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
const ab = Buffer.from(JSON.stringify(request.expectedApprovalBody, null, 2) + '\n');
assert.equal(ab.length, request.expectedApproval.bytes); assert.equal(sha(ab), request.expectedApproval.rawBytesSha256);
fs.writeFileSync(request.expectedApproval.file, ab, { flag: 'wx', mode: 0o600 });
const approval = read(request.expectedApproval.file, request.expectedApproval.rawBytesSha256).pin;
fs.mkdirSync(O, { mode: 0o700 });
const stdout = O + '/stdout.log', stderr = O + '/stderr.log';
const out = fs.openSync(stdout, 'wx', 0o600), err = fs.openSync(stderr, 'wx', 0o600);
const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const argv = [entry.pin.file, '--input', request.input.file, '--input-sha', request.input.rawBytesSha256,
  '--approval', approval.file, '--approval-sha', approval.rawBytesSha256, '--execute'];
const began = new Date().toISOString();
const dispatch = put(O + '/dispatch.json', {
  kind: 'Root-actual-state-free-observe15-only119-dispatch', began, independentExactReview: review.pin,
  request: requestPin.pin, input: request.input, approval, entry: entry.pin,
  argv: [process.execPath, ...argv], cwd: R, originalStdout: stdout, originalStderr: stderr,
  scope: 'Only owner PostgreSQL connection and two defaultRO 139-table captures/conservation; no HTTP, session/auth-audit DML, domain command, ordinary context, state, migration, process control or Cargo', Source15Admitted: false,
});
read(entry.pin.file, entry.pin.rawBytesSha256);
let result; const start = performance.now();
try { result = spawnSync(process.execPath, argv, { cwd: R, env, stdio: ['ignore', out, err] }); }
finally { fs.closeSync(out); fs.closeSync(err); }
const receipt = put(O + '/command-receipt.json', {
  kind: 'Root-actual-state-free-observe15-only119-command', dispatch, began, ended: new Date().toISOString(),
  elapsedSeconds: (performance.now() - start) / 1000, exitCode: result.status, signal: result.signal,
  processError: result.error ? { name: result.error.name, message: result.error.message } : null,
  stdout: read(stdout).pin, stderr: read(stderr).pin, Source15Admitted: false,
});
console.log(JSON.stringify({ receipt, exitCode: result.status, stdoutBytes: fs.statSync(stdout).size, stderrBytes: fs.statSync(stderr).size }));
if (result.status !== 0) process.exitCode = 1;
