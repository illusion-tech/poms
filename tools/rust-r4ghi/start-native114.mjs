import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', dir = '/home/wangzishi/.local/share/poms-r4ghi/private/native-reference92/source12-native01';
const sha = b => createHash('sha256').update(b).digest('hex'), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
assert.equal(process.platform, 'linux'); assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--approved-plan-sha');
const bytes = fs.readFileSync(dir + '/plan.json'); assert.equal(sha(bytes), process.argv[3]); const plan = JSON.parse(bytes);
assert.equal(plan.phaseRun, 'source12-native01');
for (const p of plan.sourcePins) assert.equal(pin(root + '/' + p.file).rawBytesSha256, p.rawBytesSha256);
assert.equal(pin(plan.env.file).rawBytesSha256, plan.env.rawBytesSha256); assert.equal(pin(plan.build.entry.file).rawBytesSha256, plan.build.entry.rawBytesSha256); assert.equal(pin(plan.node.file).rawBytesSha256, plan.node.rawBytesSha256);
assert(!fs.existsSync('/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock'));
const state = JSON.parse(fs.readFileSync(dir + '/state.json')); assert.equal(state.phase, 'baseline-captured'); assert.equal(state.planSHA256, sha(bytes));
assert(!fs.existsSync(dir + '/process.json')); assert(!fs.existsSync(dir + '/start-intent.json'));
const sockets = () => ['/proc/net/tcp', '/proc/net/tcp6'].flatMap(f => fs.readFileSync(f, 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.trim().split(/\s+/))).filter(r => r[3] === '0A' && Number.parseInt(r[1].split(':')[1], 16) === 31442);
assert.equal(sockets().length, 0, 'An existing31442 listener is not owned by this launch');
const startedAt = new Date().toISOString(); fs.writeFileSync(dir + '/start-intent.json', JSON.stringify({ plan: pin(dir + '/plan.json'), node: plan.node, env: plan.env, preload: plan.preload, entry: plan.build.entry, nonce: plan.processNonce, startedAt }) + '\n', { flag: 'wx', mode: 0o600 });
const out = fs.openSync(dir + '/stdout.log', 'wx', 0o600), err = fs.openSync(dir + '/stderr.log', 'wx', 0o600);
const child = spawn(plan.node.file, ['--require', plan.preload.file, plan.build.entry.file], { cwd: root, detached: true, stdio: ['ignore', out, err], env: { ...process.env,
  POMS_ENV_FILE: plan.env.file, POMS_R4GHI_NATIVE_ENV_SHA256: plan.env.rawBytesSha256, POMS_R4GHI_NATIVE_REFERENCE_RUN: plan.processNonce } });
fs.closeSync(out); fs.closeSync(err); assert(child.pid > 1); child.unref();
const pid = child.pid, procStart = () => { const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); return stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19]; };
const startTime = procStart(); assert.equal(fs.realpathSync(`/proc/${pid}/exe`), fs.realpathSync(plan.node.file));
const record = { kind: 'Root-owned-Native-reference92-process', namespace: 'poms-r4ghi', phaseRun: plan.phaseRun, root, port: 31442, pid, startTime, startedAt,
  nonce: plan.processNonce, planSHA256: sha(bytes), entry: plan.build.entry, env: plan.env, preload: plan.preload };
fs.writeFileSync(dir + '/process.json', JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
let listening = false;
for (let i = 0; i < 80; ++i) { assert.equal(procStart(), startTime); const inodes = new Set(fs.readdirSync(`/proc/${pid}/fd`).flatMap(f => { try { const m = /^socket:\[(\d+)\]$/.exec(fs.readlinkSync(`/proc/${pid}/fd/${f}`)); return m ? [m[1]] : []; } catch { return []; } }));
  const owned = sockets().filter(r => inodes.has(r[9])); if (owned.length) { assert(owned.every(r => r[1].split(':')[0] === '0100007F')); listening = true; break; } await new Promise(r => setTimeout(r, 250)); }
assert(listening, 'No actual loopback31442 listener; preserve owned process/logs for review');
console.log(JSON.stringify({ process: pin(dir + '/process.json'), pid, actualOwnedLoopback31442Listener: true, HTTPExecuted: false }));
