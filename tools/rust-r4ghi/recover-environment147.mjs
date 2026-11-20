// Restore only the already-provisioned stopped container; never create/restore DB data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux'); assert.deepEqual(process.argv.slice(2), ['--execute']);
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', stateRoot = '/home/wangzishi/.local/share/poms-r4ghi', priv = stateRoot + '/private';
const sha = b => createHash('sha256').update(b).digest('hex'), identity = JSON.parse(fs.readFileSync(stateRoot + '/identity.json')), provision = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4ghi/root/environment01/provision01.json'));
assert.equal(identity.namespace, 'poms-r4ghi'); assert.equal(identity.marker, '0ca66699-053b-4f40-ad5c-82fed4cf1a6f'); assert.equal(identity.port, 25434);
assert(!fs.existsSync(priv + '/business/g2-business12/main01/driver.lock'));
const out = priv + '/environment-recovery147'; fs.mkdirSync(out, { mode: 0o700 });
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
function podman(label, args) { const r = spawnSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', ...args], { encoding: 'utf8', timeout: 45000 }); fs.writeFileSync(out + '/' + label + '-stdout.json', r.stdout ?? '', { flag: 'wx', mode: 0o600 }); fs.writeFileSync(out + '/' + label + '-stderr.log', r.stderr ?? '', { flag: 'wx', mode: 0o600 }); return r; }
const beforeResult = podman('inspect-before', ['container', 'inspect', identity.container]); assert.equal(beforeResult.status, 0); const before = JSON.parse(beforeResult.stdout)[0];
assert.equal(before.Id, provision.containerId); assert.equal(before.Name, identity.container); assert.equal(before.Config.Labels['org.poms.scope'], identity.namespace); assert.equal(before.Config.Labels['org.poms.base'], identity.base);
assert(before.Mounts.some(m => m.Name === identity.volume && m.Destination === '/var/lib/postgresql/data' && m.Source === '/home/wangzishi/.local/share/containers/storage/volumes/poms-r4ghi-pg15-data/_data'));
assert.deepEqual(before.HostConfig.PortBindings['15432/tcp'], [{ HostIp: '127.0.0.1', HostPort: '25434' }]); assert.equal(before.State.Running, false);
const oldProcess = JSON.parse(fs.readFileSync(priv + '/rust-api135-process.json')); assert.equal(oldProcess.pid, 108720); assert(!fs.existsSync('/proc/108720/stat')); assert.equal(sha(fs.readFileSync(oldProcess.binary)), oldProcess.binarySha256);
fs.writeFileSync(out + '/intent.json', JSON.stringify({ kind: 'restart-only-existing-owned-isolated-container147', containerId: before.Id, namespace: identity.namespace, marker: identity.marker, volume: identity.volume,
  oldAPIProcess: pin(priv + '/rust-api135-process.json'), oldAPINotAlive: true, oldProcessRecordRewritten: false, databaseRestorePlanned: false, bootId: fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const started = podman('start', ['start', identity.container]); assert.equal(started.status, 0);
let ready = false; for (let i = 0; i < 30; ++i) { const r = spawnSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'exec', identity.container, 'pg_isready', '--host=/run/postgresql', '--port=15432', '--username=poms_r0e_owner'], { encoding: 'utf8', timeout: 5000 }); if (r.status === 0) { ready = true; break; } await new Promise(resolve => setTimeout(resolve, 500)); } assert(ready);
const afterResult = podman('inspect-after', ['container', 'inspect', identity.container]); assert.equal(afterResult.status, 0); const after = JSON.parse(afterResult.stdout)[0]; assert.equal(after.Id, before.Id); assert(after.State.Running);
assert(after.Mounts.some(m => m.Name === identity.volume)); assert.deepEqual(after.NetworkSettings.Ports['15432/tcp'], [{ HostIp: '127.0.0.1', HostPort: '25434' }]);
const receipt = { kind: 'actual-existing-owned-container-restarted147', containerId: before.Id, containerName: identity.container, volume: identity.volume, originalVolumeKept: true, databaseRestoreExecuted: false,
  oldAPI135StillStopped: true, noAPIStarted: true, PGReadiness: true, fullRowXminCatalogObjectsVerificationStillRequired: true, before: pin(out + '/inspect-before-stdout.json'), after: pin(out + '/inspect-after-stdout.json'), G3Certified: false };
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ containerRestarted: identity.container, sameContainerId: before.Id, sameVolume: identity.volume, databaseRestoreExecuted: false, noAPIStarted: true, receipt: pin(out + '/receipt.json') }));
