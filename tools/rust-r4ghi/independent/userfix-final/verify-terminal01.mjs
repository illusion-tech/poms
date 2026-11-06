import fs from 'node:fs';
import net from 'node:net';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const newPrivate = '/home/wangzishi/.local/share/poms-r4ghi/private';
const run = `${newPrivate}/userfix/userfix115/run01`;
const output = `${win}/tools/rust-r4ghi/independent/userfix-final`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readPublic = file => { const bytes = fs.readFileSync(`${win}/${file}`); return { value: JSON.parse(bytes.toString('utf8')), pin: { file, bytes: bytes.length, rawBytesSha256: sha(bytes) } }; };
const stop = readPublic('tmp/rust-r4ghi/root/userfix-stop01.json');
const pgStop = readPublic('tmp/rust-r4ghi/root/environment01/stopped01.json');
assert.equal(stop.value.namespace, 'poms-r4ghi'); assert.equal(stop.value.port, 31441);
assert(stop.value.processGone && stop.value.portFree && stop.value.connectionRefused);
const processFile = `${newPrivate}/rust-api01-process.json`;
assert.equal(stop.value.processRecord.file, processFile);
assert.equal(fs.realpathSync(processFile), processFile);
const processBytes = fs.readFileSync(processFile); assert.equal(sha(processBytes), stop.value.processRecord.rawBytesSha256);
const processRecord = JSON.parse(processBytes.toString('utf8'));
assert.equal(processRecord.pid, stop.value.pid); assert.equal(processRecord.port, 31441);
assert.equal(processRecord.binarySha256, stop.value.binarySha256);
assert.equal(processRecord.binarySha256, '2589d2bb057322e7cdde2b5ce2d492f12e78c67adf4de8a470d9f0bfbd07604e');
let actualStartTime = null;
try { actualStartTime = fs.readFileSync(`/proc/${processRecord.pid}/stat`, 'utf8').split(' ')[21]; } catch {}
assert.notEqual(actualStartTime, processRecord.startTime, 'Owned API process still exists');
const portClosed = await new Promise((resolve, reject) => {
  const socket = net.connect({ host: '127.0.0.1', port: 31441 });
  socket.once('connect', () => { socket.destroy(); reject(new Error('API port still listening')); });
  socket.once('error', error => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolve(true) : reject(error); });
  socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Port closure was not determined')); });
});
const containerMetadata = (...args) => {
  const result = spawnSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', ...args], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, 'Read-only Podman metadata query failed');
  return result.stdout.trim();
};
assert.equal(pgStop.value.container, 'poms-r4ghi-pg15'); assert.equal(pgStop.value.stopped, true);
const actualContainer = {
  id: containerMetadata('inspect', '--format', '{{.Id}}', 'poms-r4ghi-pg15'),
  running: containerMetadata('inspect', '--format', '{{.State.Running}}', 'poms-r4ghi-pg15') === 'true',
  status: containerMetadata('inspect', '--format', '{{.State.Status}}', 'poms-r4ghi-pg15'),
  volume: containerMetadata('volume', 'inspect', '--format', '{{.Name}}', 'poms-r4ghi-pg15-data'),
};
assert.equal(actualContainer.id, pgStop.value.id); assert.equal(actualContainer.running, false);
assert.equal(actualContainer.volume, pgStop.value.volumeRetained);
let directories = 0, files = 0;
const checkMode = directory => {
  const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink());
  assert.equal(stat.mode & 0o077, 0, 'Private directory has group/other access'); directories++;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`; assert.equal(fs.realpathSync(file), file);
    if (entry.isDirectory()) checkMode(file);
    else { const meta = fs.lstatSync(file); assert(meta.isFile() && !meta.isSymbolicLink()); assert.equal(meta.nlink, 1); assert.equal(meta.mode & 0o077, 0, 'Private file has group/other access'); files++; }
  }
};
checkMode(run);
const apply = JSON.parse(fs.readFileSync(`${run}/00130-cleanup-apply01-complete.json`, 'utf8'));
const applyShape = Object.fromEntries(Object.entries(apply).map(([key, value]) => [key, value && typeof value === 'object' ? Array.isArray(value) ? `array(${value.length})` : Object.keys(value) : typeof value]));
const result = {
  kind: 'independent-userfix-actual-terminal-review', capturedAt: new Date().toISOString(),
  apiStop: stop.pin, pgStop: pgStop.pin,
  actualOwnedProcessGone: true, actualAPIPortConnectionRefused: portClosed,
  processIdentityAndBinaryHashMatch: true, actualContainer,
  privateRunPermissions: { directories, files, allGroupOtherAccessZero: true, regularFilesNoSymlinkOrHardlink: true },
  applyShape,
  readOnlyMetadataActions: true, databaseConnectionsOpened: 0, cleanupExecutedByReviewer: false,
  productModified: false, privatePayloadPublished: false,
};
fs.writeFileSync(`${output}/terminal-verified01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify(result)}\n`);
