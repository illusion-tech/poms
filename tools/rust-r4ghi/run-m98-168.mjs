// Capture the real fixed normal migrator invocation, one approved database at a time.
// `bundle` is FS-only and precedes the separate state-free after observation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertFixedM98Invocation136, verifyFixedM98Commands136, FIXED_M98_COMMAND136 as F } from './business/migration-command136.mjs';
const R = F.root, P = F.private, N = F.node, databases = ['poms_r4ghi_native', 'poms_r4ghi_rust'], sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.execPath, N); assert.deepEqual(process.execArgv, []); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const [mode, execute] = process.argv.slice(2); assert.equal(process.argv.length, 4); assert.equal(execute, '--execute'); assert(databases.includes(mode) || mode === 'bundle');
function pin(file) { const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(file), file); const raw = fs.readFileSync(file); return { file, rawBytesSha256: sha(raw) }; }
const approval = pin(R + '/' + F.approval), frozen = JSON.parse(fs.readFileSync(approval.file)); assert.equal(frozen.G2Authorized, true); assert.equal(frozen.actualM98Applied, false); assert.equal(frozen.kind, 'Root-frozen-Source13-corrective-G2-136');
assert.deepEqual(frozen.supportingTools.migrationWrapper, pin(R + '/tools/rust-r4ghi/run-m98-168.mjs'));
const ctx = { win: R, private: P, namespace: 'poms-r4ghi', state: { marker: F.marker } }, advance = { migrationName: F.target, approvedSQL: frozen.forwardMigration.migrationSQL, approvedMigrationSource: frozen.forwardMigration.migrationTS };
const base = P + '/migration98-136/commands168';
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return pin(file); }
if (mode === 'bundle') {
  const commands = databases.map(database => JSON.parse(fs.readFileSync(base + '/' + database + '/command.json'))), bundle = { commandProtocol: 'fixed-programmatic-up-only-136', commands };
  verifyFixedM98Commands136(ctx, bundle, advance); const receipt = write(base + '/actual-commands168.json', bundle);
  console.log(JSON.stringify({ completed: true, commandBundle: receipt, afterSnapshotStillRequired: true, migrationOrHTTPExecutedByBundle: false, G3Certified: false }));
} else {
  const runner = pin(R + '/' + F.runner), node = pin(N); assert.equal(runner.rawBytesSha256, F.runnerSHA256); assert.deepEqual(frozen.forwardMigration.runner, runner); assert.deepEqual(frozen.forwardMigration.node, node);
  assert(!fs.existsSync(P + '/business/g2-business12/main01/driver.lock')); assert(!fs.existsSync(P + '/business/g2-business13/main01/state.json'));
  const folder = base + '/' + mode; fs.mkdirSync(base, { recursive: true, mode: 0o700 }); fs.mkdirSync(folder, { mode: 0o700 });
  const argv = [N, runner.file, '--database', mode, '--execute']; write(folder + '/wrapper-intent.json', { kind: 'Root-actual-normal-M98-wrapper-intent168', argv, runner, node, approval, direction: 'up', database: mode, source12Retention: frozen.retainedSource12.receipt });
  const stdoutFD = fs.openSync(folder + '/stdout.json', 'wx', 0o600), stderrFD = fs.openSync(folder + '/stderr.log', 'wx', 0o600);
  let result; try { result = spawnSync(N, argv.slice(1), { cwd: R, env: process.env, stdio: ['ignore', stdoutFD, stderrFD], timeout: 180000 }); } finally { fs.closeSync(stdoutFD); fs.closeSync(stderrFD); }
  const stdout = pin(folder + '/stdout.json'), stderr = pin(folder + '/stderr.log');
  if (result.status !== 0) { const partial = write(folder + '/partial.json', { kind: 'actual-normal-M98-command168-failed-or-unknown', database: mode, argv, runner, node, approval, exitCode: result.status, signal: result.signal, stdout, stderr, noBlindRetryAfterUnknownCommit: true }); console.error(JSON.stringify({ completed: false, partial, privateDetailsPublished: false })); process.exitCode = 1; }
  else {
    const rawResult = JSON.parse(fs.readFileSync(stdout.file, 'utf8').trim()); assert.equal(rawResult.completed, true); assert.equal(rawResult.database, mode); assert.equal(rawResult.migrationName, F.target); assert.equal(rawResult.direction, 'up'); assert.equal(rawResult.migrations, 98);
    const executionReceipt = pin(P + '/migration98-136/' + mode + '/execution.json'); assert.deepEqual(rawResult.execution, executionReceipt);
    const command = { kind: 'captured-fixed-programmatic-M98-command136', database: mode, direction: 'up', migrationName: F.target, exitCode: result.status, argv, runner, node, approval,
      intent: pin(P + '/migration98-136/' + mode + '/intent.json'), executionReceipt, stdout, stderr }; assertFixedM98Invocation136(command);
    const expected = { kind: 'Root-fixed-only-up-M98-command136-intent', direction: 'up', database: mode, migrationName: F.target, argv, runner, node, approval, migratorMethod: 'up', migratorOptions: { migrations: [F.target] }, from: 97, to: 98 };
    assert.deepEqual(JSON.parse(fs.readFileSync(command.intent.file)), expected); assert.deepEqual(JSON.parse(fs.readFileSync(executionReceipt.file)), { ...expected, kind: 'actual-fixed-only-up-M98-command136', pendingBefore: [F.target], applied: [F.target], executedAfter: 98, exitCode: 0 });
    assert.deepEqual(pin(approval.file), approval); assert.deepEqual(pin(runner.file), runner); assert.deepEqual(pin(node.file), node);
    const receipt = write(folder + '/command.json', command); console.log(JSON.stringify({ completed: true, database: mode, command: receipt, actualExitCode: result.status, afterSnapshotStillRequired: true, crossDatabaseAtomicity: false, G3Certified: false }));
  }
}
