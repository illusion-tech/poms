// Root stops only the exact owned Linux process recorded by this batch.
import fs from 'node:fs';
import net from 'node:net';
import assert from 'node:assert/strict';
import { pin, sha } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', state = '/home/wangzishi/.local/share/poms-r3m';
assert.equal(process.cwd(), root);
const [backend, tag] = process.argv.slice(2); assert(['nest', 'rust'].includes(backend)); assert(/^[a-z0-9-]{1,40}$/.test(tag));
const file = state + '/private/' + backend + '-' + tag + '.json', record = JSON.parse(fs.readFileSync(file));
assert.equal(record.backend, backend); assert.equal(record.cwd, root);
assert.equal(record.bootId, fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim());
const proc = '/proc/' + record.pid;
assert.equal(fs.readFileSync(proc + '/stat', 'utf8').split(') ')[1].split(' ')[19], record.startTime);
assert.equal(sha(fs.readFileSync(proc + '/cmdline')), record.argvSha256);
assert.equal(pin(record.entry).rawBytesSha256, record.artifactSha256);
process.kill(record.pid, 'SIGTERM');
async function free() { return await new Promise(resolve => { const s = net.createServer(); s.once('error', () => resolve(false)); s.listen(record.port, '127.0.0.1', () => s.close(() => resolve(true))); }); }
let gone = false;
for (let i = 0; i < 100; i++) {
  const running = fs.existsSync(proc + '/stat') && fs.readFileSync(proc + '/stat', 'utf8').split(') ')[1].split(' ')[0] !== 'Z';
  if (!running && await free()) { gone = true; break; }
  await new Promise(resolve => setTimeout(resolve, 100));
}
assert(gone, 'Owned process did not exit; inspect before escalating');
const out = 'tmp/rust-r3m/runtime/' + backend + '-' + tag + '-stop01.json';
fs.writeFileSync(out, JSON.stringify({ kind: 'R3-owned-runtime-stop', record: pin(file), pid: record.pid, tag, backend, port: record.port, SIGTERM: true, exited: true, portFree: true, otherProcessesTouched: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ backend, tag, pid: record.pid, exited: true, portFree: true }));
