import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const dir = '/home/wangzishi/.local/share/poms-r4ghi/private/native-reference92/source12-native01', sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--approved-process-sha');
const bytes = fs.readFileSync(dir + '/process.json'); assert.equal(sha(bytes), process.argv[3]); const record = JSON.parse(bytes), plan = JSON.parse(fs.readFileSync(dir + '/plan.json'));
assert.equal(sha(fs.readFileSync(dir + '/plan.json')), record.planSHA256);
const start = () => { const s = fs.readFileSync(`/proc/${record.pid}/stat`, 'utf8'); return s.slice(s.lastIndexOf(') ') + 2).split(' ')[19]; };
assert.equal(start(), record.startTime); assert.equal(fs.realpathSync(`/proc/${record.pid}/exe`), fs.realpathSync(plan.node.file));
assert.equal(sha(fs.readFileSync(`/proc/${record.pid}/exe`)), plan.node.rawBytesSha256);
assert.deepEqual(fs.readFileSync(`/proc/${record.pid}/cmdline`).toString().split('\0').filter(Boolean), [plan.node.file, '--require', plan.preload.file, plan.build.entry.file]);
const env = Object.fromEntries(fs.readFileSync(`/proc/${record.pid}/environ`).toString().split('\0').filter(Boolean).map(v => { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1)]; }));
assert.equal(env.POMS_R4GHI_NATIVE_REFERENCE_RUN, record.nonce); assert.equal(env.POMS_ENV_FILE, plan.env.file);
process.kill(record.pid, 'SIGTERM');
let ended = false; for (let i = 0; i < 80; ++i) { if (!fs.existsSync(`/proc/${record.pid}/stat`) || start() !== record.startTime) { ended = true; break; } await new Promise(r => setTimeout(r, 100)); }
assert(ended, 'Owned process did not exit after SIGTERM');
fs.writeFileSync(dir + '/process-stopped.json', JSON.stringify({ kind: 'Root-stopped-only-owned-Native92-process', pid: record.pid, startTime: record.startTime, processSHA256: sha(bytes), signal: 'SIGTERM', stopped: true }) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ pid: record.pid, stopped: true, unrelatedProcessesTouched: false }));
