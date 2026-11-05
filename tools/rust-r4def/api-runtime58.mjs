// Own one local Rust process, with new-namespace private credentials and PID identity.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const edition=process.argv[3]??'58';assert(/^\d+$/.test(edition));
const mode = process.argv[2] ?? 'start'; assert(['start', 'status', 'stop'].includes(mode));
const root = '/home/wangzishi/projects/poms-rust-r4def', state = '/home/wangzishi/.local/share/poms-r4def', priv = state + '/private';
const identity = JSON.parse(fs.readFileSync(state + '/identity.json')); assert.equal(identity.namespace, 'poms-r4def');
const binary = '/home/wangzishi/.cache/poms-r4def-target-ROOT/debug/poms-api-rust', record = priv + '/rust-api'+edition+'-process.json', port = 31341;
function startTime(pid) { try { return fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(' ')[21]; } catch { return null; } }
function owned() { const p = JSON.parse(fs.readFileSync(record)); assert.equal(p.binary, binary); assert.equal(p.root, root); assert.equal(p.namespace, identity.namespace); const now = startTime(p.pid); if (now !== null) assert.equal(now, p.startTime, 'Never signal a reused PID'); return { ...p, alive: now !== null }; }
if (mode === 'start') {
    assert(!fs.existsSync(record), 'Inspect the existing owned process before starting again'); assert(fs.statSync(binary).isFile());
    await new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(port, '127.0.0.1', () => server.close(resolve)); });
    const runtimeEnv = priv + '/rust-api'+edition+'.env'; const base = fs.readFileSync(priv + '/rust.env', 'utf8');
    fs.writeFileSync(runtimeEnv, base.trimEnd() + `\nHOST=127.0.0.1\nPORT=${port}\nCORS_ORIGINS=http://127.0.0.1:44451,http://localhost:44451\n`, { flag: 'wx', mode: 0o600 });
    const env = { PATH: '/home/wangzishi/.cargo/bin:/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', POMS_ENV_FILE: runtimeEnv };
    const stdout = fs.openSync(priv + '/rust-api'+edition+'-stdout-original.bin', 'wx', 0o600), stderr = fs.openSync(priv + '/rust-api'+edition+'-stderr-original.bin', 'wx', 0o600);
    const child = spawn(binary, [], { cwd: root, env, detached: true, stdio: ['ignore', stdout, stderr] }); child.unref(); fs.closeSync(stdout); fs.closeSync(stderr);
    const p = { namespace: identity.namespace, binary, root, pid: child.pid, startTime: startTime(child.pid), binarySha256: createHash('sha256').update(fs.readFileSync(binary)).digest('hex'), port, startedAt: new Date().toISOString() };
    assert(p.pid && p.startTime); fs.writeFileSync(record, JSON.stringify(p, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    let response; for (let i = 0; i < 60; i++) { try { response = await fetch(`http://127.0.0.1:${port}/api/health/readiness`); if (response.ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
    assert(response?.ok, 'Owned readiness did not succeed; inspect only this new private log');
    console.log(JSON.stringify({ mode, pid: p.pid, port, readiness: response.status, binarySha256: p.binarySha256, privateCredentialsPrinted: false }));
} else if (mode === 'status') {
    const p = owned(); console.log(JSON.stringify({ mode, pid: p.pid, alive: p.alive, port, binarySha256: p.binarySha256, privateCredentialsPrinted: false }));
} else {
    const p = owned(); if (p.alive) { process.kill(p.pid, 'SIGTERM'); for (let i = 0; i < 80 && startTime(p.pid) !== null; i++) await new Promise(r => setTimeout(r, 125)); }
    console.log(JSON.stringify({ mode, pid: p.pid, processGone: startTime(p.pid) === null, privatePreserved: true }));
}
