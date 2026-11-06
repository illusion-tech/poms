import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const workspace = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private/userfix/userfix115/run01';
const publicRoot = `${workspace}/tmp/rust-r4ghi/userfix/userfix115/run01`;
const outputRoot = `${workspace}/tools/rust-r4ghi/independent/userfix-final`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(process.platform, 'linux');
assert.equal(fs.realpathSync(privateRoot), privateRoot);
const readPrivate = file => {
  assert(file.startsWith(`${privateRoot}/`), 'Refuse data outside the authorized new run');
  assert.equal(fs.realpathSync(file), file, 'Refuse redirected evidence');
  assert(fs.lstatSync(file).isFile());
  return fs.readFileSync(file);
};
const pins = new Map();
const collectPins = value => {
  if (!value || typeof value !== 'object') return;
  if (typeof value.file === 'string' && value.file.startsWith(`${privateRoot}/`) && typeof value.rawBytesSha256 === 'string') {
    if (pins.has(value.file)) assert.equal(pins.get(value.file).rawBytesSha256, value.rawBytesSha256, 'Conflicting evidence pin');
    pins.set(value.file, value);
  }
  for (const child of Object.values(value)) collectPins(child);
};
const publicFiles = fs.readdirSync(publicRoot).filter(name => name.endsWith('.json')).sort();
for (const name of publicFiles) collectPins(json(`${publicRoot}/${name}`));
const originalChecks = [...pins.values()].map(pin => {
  const bytes = readPrivate(pin.file);
  return { file: pin.file, bytes: bytes.length, rawBytesSha256: sha(bytes), matches: sha(bytes) === pin.rawBytesSha256 && (pin.bytes === undefined || pin.bytes === bytes.length) };
});
assert(originalChecks.every(pin => pin.matches), 'A published original pin does not match');
const snapshots = [];
let tableFileCount = 0, rowCount = 0;
for (const name of fs.readdirSync(privateRoot).filter(name => /^snapshot-.+\.json$/.test(name)).sort()) {
  const bytes = readPrivate(`${privateRoot}/${name}`), snapshot = JSON.parse(bytes.toString('utf8'));
  const counts = {};
  for (const [database, data] of Object.entries(snapshot.databases)) {
    assert.equal(Object.keys(data.tables).length, 120);
    let rows = 0;
    for (const [table, meta] of Object.entries(data.tables)) {
      const tableBytes = readPrivate(meta.file);
      assert.equal(sha(tableBytes), meta.rawBytesSha256);
      const parsed = tableBytes.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
      assert.equal(parsed.length, meta.count);
      for (const row of parsed) { assert.equal(sha(row.raw), row.sha256); assert(Array.isArray(row.key)); }
      rows += parsed.length;
      tableFileCount++;
    }
    counts[database] = rows;
    rowCount += rows;
  }
  snapshots.push({ file: `${privateRoot}/${name}`, rawBytesSha256: sha(bytes), counts });
}
const checks = ['fmt01', 'clippy02', 'test01', 'build01'].map(name => {
  const folder = `tmp/rust-r4ghi/root/rust-${name}`;
  const bytes = fs.readFileSync(`${workspace}/${folder}/receipt.json`), receipt = JSON.parse(bytes.toString('utf8'));
  const matches = receipt.inputs.map(pin => ({ file: pin.file, matches: sha(fs.readFileSync(`${workspace}/${pin.file}`)) === pin.rawBytesSha256 }));
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.sourceStable, true);
  assert.equal(matches.length, 343);
  assert(matches.every(pin => pin.matches));
  return { file: `${folder}/receipt.json`, rawBytesSha256: sha(bytes), exitCode: receipt.exitCode, sourceStable: receipt.sourceStable, inputCount: matches.length, currentInputMatches: matches.filter(pin => pin.matches).length, inputPinsHash: sha(JSON.stringify(receipt.inputs)), args: receipt.args };
});
assert.equal(new Set(checks.map(check => check.inputPinsHash)).size, 1, 'Checks use different product input sets');
const testOutput = fs.readFileSync(`${workspace}/tmp/rust-r4ghi/root/rust-test01/stdout.log`, 'utf8');
const testGroups = [...testOutput.matchAll(/test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored;/g)];
const testTotals = testGroups.reduce((totals, group) => ({ groups: totals.groups + 1, passed: totals.passed + Number(group[1]), failed: totals.failed + Number(group[2]), ignored: totals.ignored + Number(group[3]) }), { groups: 0, passed: 0, failed: 0, ignored: 0 });
const binary = '/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/poms-api-rust';
const binaryHash = sha(fs.readFileSync(binary));
assert.equal(binaryHash, '2589d2bb057322e7cdde2b5ce2d492f12e78c67adf4de8a470d9f0bfbd07604e');
const shape = value => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, Array.isArray(child) ? `array(${child.length})` : child && typeof child === 'object' ? Object.keys(child) : typeof child]))
  : typeof value;
const selectedShapes = {};
for (const name of ['00063-faults01-1-FI-proof.json', '00093-pending01-1-FI-proof.json', '00107-races01-race-1-first-actual-lock-wait.json', '00129-cleanup-plan01-cleanup-plan.json', '00020-http-request-config.json']) {
  selectedShapes[name] = shape(JSON.parse(readPrivate(`${privateRoot}/${name}`).toString('utf8')));
}
const result = { kind: 'independent-userfix-actual-evidence-integrity-review', capturedAt: new Date().toISOString(), originalChecks, originalPinCount: originalChecks.length, allOriginalsMatch: true, snapshots, snapshotCount: snapshots.length, tableFileCount, rowCount, buildChecks: checks, testTotals, binary: { file: binary, rawBytesSha256: binaryHash }, selectedShapes, noBusinessOrSecretPayloadPublished: true, databaseConnectionsOpened: 0, runtimeProcessesStarted: 0, productModified: false, finalG3Signed: false };
fs.writeFileSync(`${outputRoot}/evidence-integrity01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ originalPinCount: result.originalPinCount, allOriginalsMatch: true, snapshotCount: result.snapshotCount, tableFileCount, rowCount, buildChecks: checks.map(({ file, exitCode, sourceStable, inputCount, currentInputMatches }) => ({ file, exitCode, sourceStable, inputCount, currentInputMatches })), testTotals, binaryHash, selectedShapes })}\n`);
