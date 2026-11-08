// Temporary task-owned TCP relay only. No HTTP parser, body logging or retries.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const relayFixed24 = Object.freeze({ win: 'E:/projects/worktrees/poms-r3hijk-next28/poms', linux: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', private: '/home/wangzishi/.local/share/poms-r4ghi/private', unc: '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private' });
export const sha24 = bytes => createHash('sha256').update(bytes).digest('hex');
export const newJSON24 = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
export function relayPaths24(uiRun) {
  assert(typeof uiRun === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(uiRun));
  return { windows: `${relayFixed24.win}/tmp/rust-r4ghi/private/ui-relay24/${uiRun}`, linux: `${relayFixed24.private}/ui/relay24/${uiRun}`, unc: `${relayFixed24.unc}/ui/relay24/${uiRun}` };
}
export function privateIPv4_24(address) {
  if (net.isIP(address) !== 4) return false; const [a, b] = address.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
export function validateRelay24(plan) {
  assert.equal(plan.namespace, 'poms-r4ghi'); const r = plan.relay24; assert(r && r.schemaVersion === 1);
  assert(['runtime14', 'role18', 'expense18', 'gh18', 'lifecycle18'].includes(r.workerKind)); assert.equal(r.interfaceName, 'eth0');
  assert(privateIPv4_24(r.wslIPv4) && r.wslIPv4 !== '10.255.255.254');
  assert.deepEqual(r.linuxListen, { address: r.wslIPv4, port: 44552 }); assert.deepEqual(r.linuxTarget, { address: '127.0.0.1', port: 44551 });
  assert.deepEqual(r.windowsListen, { address: '127.0.0.1', port: 44551 }); assert.deepEqual(r.windowsTarget, { address: r.wslIPv4, port: 44552 });
  assert.deepEqual(r.paths, relayPaths24(plan.uiRun)); assert(Number.isInteger(r.readyTimeoutMs) && r.readyTimeoutMs >= 1000 && r.readyTimeoutMs <= 30000);
  assert(Number.isInteger(r.stopTimeoutMs) && r.stopTimeoutMs >= 1000 && r.stopTimeoutMs <= 15000);
  assert(Number.isInteger(r.lifetimeSeconds) && r.lifetimeSeconds >= plan.overallTimeoutSeconds + 120 && r.lifetimeSeconds <= 3900);
  return r;
}
export function readPlan24(file, expected) { assert(/^[a-f0-9]{64}$/.test(expected)); const bytes = fs.readFileSync(file); assert.equal(sha24(bytes), expected); const plan = JSON.parse(bytes); validateRelay24(plan); return plan; }
export function verifyNode24(plan, mode) {
  const expected = mode === 'linux' ? plan.metadata16.linuxNode : { executable: plan.windows.node.executablePath, rawBytesSha256: plan.windows.node.rawBytesSha256 };
  assert.equal(sha24(fs.readFileSync(process.execPath)), expected.rawBytesSha256); assert.equal(fs.realpathSync(process.execPath).toLowerCase(), fs.realpathSync(expected.executable).toLowerCase());
}
export function verifyHelper24(plan, moduleURL, mode) {
  const root = mode === 'linux' ? relayFixed24.linux : relayFixed24.win, file = fileURLToPath(moduleURL), relative = path.relative(root, file).split(path.sep).join('/');
  assert(relative.startsWith('tools/rust-r4ghi/business/ui-relay-')); const pin = plan.sourceBases.find(item => item.file === relative); assert(pin); assert.equal(sha24(fs.readFileSync(file)), pin.rawBytesSha256); return { file, rawBytesSha256: pin.rawBytesSha256 };
}
export function args24(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) { assert(/^--[a-z-]+$/.test(argv[i]) && argv[i + 1] && !Object.hasOwn(result, argv[i])); result[argv[i]] = argv[i + 1]; } return result; }
export function startIdentity24() {
  return { pid: process.pid, startTime: process.platform === 'linux' ? fs.readFileSync('/proc/self/stat', 'utf8').slice(fs.readFileSync('/proc/self/stat', 'utf8').lastIndexOf(') ') + 2).split(' ')[19] : null,
    launchedAt: new Date().toISOString(), executable: fs.realpathSync(process.execPath), executableSHA256: sha24(fs.readFileSync(process.execPath)) };
}
export async function serveRelay24(mode, argv, moduleURL) {
  const a = args24(argv); assert.deepEqual(Object.keys(a).sort(), ['--nonce', '--plan', '--plan-sha'].sort()); assert(/^[a-f0-9]{64}$/.test(a['--nonce']));
  assert.equal(process.platform, mode === 'linux' ? 'linux' : 'win32'); const plan = readPlan24(a['--plan'], a['--plan-sha']), r = validateRelay24(plan); verifyNode24(plan, mode);
  const helper = verifyHelper24(plan, moduleURL, mode); verifyHelper24(plan, import.meta.url, mode);
  if (mode === 'linux') assert(os.networkInterfaces()[r.interfaceName]?.some(item => item.family === 'IPv4' && item.address === r.wslIPv4 && !item.internal), 'Explicit eth0 IPv4 changed; Root must review a new plan');
  const directory = r.paths[mode]; if (mode === 'linux') { assert(!fs.existsSync(directory)); fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(directory), directory); } else assert(fs.statSync(directory).isDirectory());
  const identity = startIdentity24(), nonce = a['--nonce'], readyFile = `${directory}/${mode}-ready.json`, doneFile = `${directory}/${mode}-done.json`, stopFile = `${directory}/${mode}-stop.json`;
  assert(!fs.existsSync(readyFile) && !fs.existsSync(doneFile) && !fs.existsSync(stopFile));
  const listen = mode === 'linux' ? r.linuxListen : r.windowsListen, target = mode === 'linux' ? r.linuxTarget : r.windowsTarget;
  const processRecord = { kind: 'owned-byte-relay-process24', mode, nonce, planSHA256: a['--plan-sha'], identity, helper, listen, target, payloadLogged: false };
  newJSON24(`${directory}/${mode}-process.json`, processRecord);
  const sockets = new Set(); let accepted = 0, clientBytes = 0, targetBytes = 0, closing = false, reason = 'deadline', errorCodes = [];
  const server = net.createServer({ allowHalfOpen: true }, client => {
    accepted++; const upstream = net.createConnection({ host: target.address, port: target.port, allowHalfOpen: true }); sockets.add(client); sockets.add(upstream);
    const closePair = () => { client.destroy(); upstream.destroy(); };
    for (const socket of [client, upstream]) { socket.setTimeout(120000, closePair); socket.once('error', error => { if (errorCodes.length < 100) errorCodes.push(String(error.code ?? 'SOCKET_ERROR')); closePair(); }); socket.once('close', () => sockets.delete(socket)); }
    client.once('close', () => { clientBytes += client.bytesRead; targetBytes += upstream.bytesRead; });
    // Byte streams are never decoded, buffered for logs, inspected or replayed.
    client.pipe(upstream); upstream.pipe(client);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen({ host: listen.address, port: listen.port, exclusive: true }, resolve); });
  newJSON24(readyFile, { kind: 'owned-byte-relay-ready24', mode, nonce, planSHA256: a['--plan-sha'], identity, helper, listen, target, interfaceName: mode === 'linux' ? r.interfaceName : null, payloadLogged: false });
  let monitor, deadline;
  const finish = async why => {
    if (closing) return; closing = true; reason = why; clearInterval(monitor); clearTimeout(deadline);
    for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve));
    newJSON24(doneFile, { kind: 'owned-byte-relay-stopped24', mode, nonce, planSHA256: a['--plan-sha'], identity, reason, accepted, clientBytes, targetBytes, errorCodes, remainingSockets: sockets.size, payloadOrCookiesLogged: false });
  };
  process.once('SIGTERM', () => { void finish('owned-SIGTERM'); }); process.once('SIGINT', () => { void finish('owned-SIGINT'); });
  monitor = setInterval(() => { if (fs.existsSync(stopFile)) { const stop = JSON.parse(fs.readFileSync(stopFile)); if (stop.nonce === nonce && stop.pid === process.pid && stop.planSHA256 === a['--plan-sha']) void finish('exact-private-stop'); } }, 100);
  deadline = setTimeout(() => { void finish('bounded-lifetime-expired'); }, r.lifetimeSeconds * 1000);
}
export async function stopLinuxRelay24(argv, moduleURL) {
  assert.equal(process.platform, 'linux'); const a = args24(argv); assert.deepEqual(Object.keys(a).sort(), ['--nonce', '--plan', '--plan-sha', '--record-name', '--record-sha'].sort());
  assert(['linux-ready.json', 'linux-process.json'].includes(a['--record-name']));
  const plan = readPlan24(a['--plan'], a['--plan-sha']); verifyNode24(plan, 'linux'); verifyHelper24(plan, moduleURL, 'linux'); verifyHelper24(plan, import.meta.url, 'linux');
  const file = `${validateRelay24(plan).paths.linux}/${a['--record-name']}`, bytes = fs.readFileSync(file); assert.equal(sha24(bytes), a['--record-sha']); const ready = JSON.parse(bytes);
  assert.equal(ready.nonce, a['--nonce']); assert.equal(ready.planSHA256, a['--plan-sha']); assert.equal(ready.mode, 'linux'); assert(ready.identity.pid > 1);
  const proc = `/proc/${ready.identity.pid}`; if (!fs.existsSync(`${proc}/stat`)) return;
  const stat = fs.readFileSync(`${proc}/stat`, 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], ready.identity.startTime, 'PID reused; do not signal');
  assert.equal(fs.realpathSync(`${proc}/exe`), ready.identity.executable); assert.equal(sha24(fs.readFileSync(ready.identity.executable)), ready.identity.executableSHA256);
  process.kill(ready.identity.pid, 'SIGTERM');
}
