// Read-only verification of Root's independently reviewed, fixed UP-only source.
// Never imports/executes that runner, ORM, SQL, HTTP or a child process.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const FIXED_M98_COMMAND136 = Object.freeze({
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  node: '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',
  runner: 'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs',
  runnerSHA256: '29e195b4e80c6089387d66e384eb7b7eef28f5c58cf047a7ce87726e6cc0e5e1',
  target: 'Migration20261108090000_rust_frozen_assignment_parent_lock',
  sql: 'docs/design/rust-r4ghi/g2-frozen-participant-parent-lock65.sql',
  sqlSHA256: '90b091eb36a7f58ae0cf3a9504b2426ea6de868a4bab9af5a2c1e6bd89e0106e',
  tsSHA256: 'daf3656ec2a726c30ebaba8b0ba91945404f9b7a5848d8d293546bc3c7fa4916',
  approval: 'docs/design/rust-r4ghi/source13-g2-freeze136.json',
  marker: '0ca66699-053b-4f40-ad5c-82fed4cf1a6f',
});
const F = FIXED_M98_COMMAND136, databases = ['poms_r4ghi_native', 'poms_r4ghi_rust'];
const tsPath = 'apps/poms-api/src/migrations/' + F.target + '.ts';
const samePin = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
function bytes(pin) {
  assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const value = fs.readFileSync(pin.file); assert.equal(sha(value), pin.rawBytesSha256); return value;
}
const json = pin => JSON.parse(bytes(pin));
function evidence(pin) {
  const value = bytes(pin), actual = fs.realpathSync(pin.file);
  assert([F.private, F.root + '/tmp/rust-r4ghi'].some(root => { const relative = path.relative(fs.realpathSync(root), actual); return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); }), 'Real command output must stay in the owned evidence roots');
  return value;
}
export function assertFixedM98Invocation136(command) {
  assert.equal(command.kind, 'captured-fixed-programmatic-M98-command136'); assert(databases.includes(command.database)); assert.equal(command.direction, 'up'); assert.equal(command.migrationName, F.target); assert.equal(command.exitCode, 0);
  assert.deepEqual(command.argv, [F.node, F.root + '/' + F.runner, '--database', command.database, '--execute'], 'Only the reviewed fixed programmatic UP invocation is accepted; matching self-reported direction is insufficient');
  assert.deepEqual(command.runner, { file: F.root + '/' + F.runner, rawBytesSha256: F.runnerSHA256 });
  assert.equal(command.node?.file, F.node); assert(/^[a-f0-9]{64}$/.test(command.node.rawBytesSha256));
  assert.equal(command.approval?.file, F.root + '/' + F.approval); assert(/^[a-f0-9]{64}$/.test(command.approval.rawBytesSha256));
  const folder = F.private + '/migration98-136/' + command.database;
  assert.equal(command.intent?.file, folder + '/intent.json'); assert.equal(command.executionReceipt?.file, folder + '/execution.json');
  return { direction: 'up', database: command.database, migrationName: F.target, argv: command.argv, runner: command.runner, node: command.node, approval: command.approval,
    migratorMethod: 'up', migratorOptions: { migrations: [F.target] }, from: 97, to: 98 };
}
function verifyApproval136(command, advance) {
  bytes(command.runner); bytes(command.node); const approval = json(command.approval);
  assert.equal(approval.kind, 'Root-frozen-Source13-corrective-G2-136'); assert.equal(approval.G2Authorized, true); assert.equal(approval.actualM98Applied, false);
  const forward = approval.forwardMigration; assert.deepEqual(forward.databases, databases); assert.equal(forward.from, 97); assert.equal(forward.to, 98); assert.equal(forward.name, F.target);
  assert.equal(forward.mechanism, 'programmatic-MikroORM-migrator-up-only'); assert.deepEqual(forward.runner, command.runner); assert.deepEqual(forward.node, command.node);
  assert(samePin(forward.migrationSQL, advance.approvedSQL)); assert(samePin(forward.migrationTS, advance.approvedMigrationSource));
  const files = fs.readdirSync(F.root + '/apps/poms-api/src/migrations').filter(name => /^Migration\d{14}.*\.ts$/.test(name)).sort().map(name => 'apps/poms-api/src/migrations/' + name);
  assert.equal(files.length, 98); assert.equal(forward.inputs.length, 98); assert.deepEqual(forward.inputs.map(pin => pin.file), files);
  for (const input of forward.inputs) bytes({ file: F.root + '/' + input.file, rawBytesSha256: input.rawBytesSha256 });
  return approval;
}
export function verifyFixedM98Commands136(ctx, receipt, advance) {
  assert.equal(ctx.win, F.root); assert.equal(ctx.private, F.private); assert.equal(ctx.namespace, 'poms-r4ghi'); assert.equal(ctx.state.marker, F.marker);
  assert.equal(receipt.commandProtocol, 'fixed-programmatic-up-only-136'); assert.equal(advance.migrationName, F.target);
  assert.deepEqual(advance.approvedSQL, { file: F.root + '/' + F.sql, rawBytesSha256: F.sqlSHA256 });
  assert.deepEqual(advance.approvedMigrationSource, { file: F.root + '/' + tsPath, rawBytesSha256: F.tsSHA256 });
  assert.equal(receipt.commands.length, 2); assert.deepEqual(receipt.commands.map(command => command.database).sort(), databases);
  // Validate both immutable invocation shapes before reading any approval. This
  // also rejects mutually identical DOWN/unrelated argv while G2 is missing.
  const expected = receipt.commands.map(assertFixedM98Invocation136);
  assert(samePin(receipt.commands[0].runner, receipt.commands[1].runner)); assert(samePin(receipt.commands[0].node, receipt.commands[1].node)); assert(samePin(receipt.commands[0].approval, receipt.commands[1].approval));
  for (let index = 0; index < receipt.commands.length; index += 1) {
    const command = receipt.commands[index], common = expected[index]; verifyApproval136(command, advance);
    const intent = JSON.parse(evidence(command.intent)), execution = JSON.parse(evidence(command.executionReceipt));
    assert.deepEqual(intent, { kind: 'Root-fixed-only-up-M98-command136-intent', ...common });
    assert.deepEqual(execution, { ...intent, kind: 'actual-fixed-only-up-M98-command136', pendingBefore: [F.target], applied: [F.target], executedAfter: 98, exitCode: 0 });
    const stdout = JSON.parse(evidence(command.stdout).toString().trim()); evidence(command.stderr);
    assert.deepEqual(stdout, { completed: true, database: command.database, direction: 'up', migrationName: F.target, migrations: 98, execution: command.executionReceipt, G3Certified: false }, 'Real stdout must point to this exact successful fixed-runner execution original');
  }
  return { kind: 'verified-fixed-only-up-M98-command-chain136', runnerSHA256: F.runnerSHA256, target: F.target, actualDatabases: databases };
}
