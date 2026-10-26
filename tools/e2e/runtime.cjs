// One owned-process implementation for API Jest and browser Playwright.
const { spawn, execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const owned = new WeakMap();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const systemEnvironment = (env = process.env) =>
    Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE'].filter((key) => env[key] !== undefined).map((key) => [key, env[key]]));
function fail(message) {
    throw new Error(`E2E runtime: ${message}`);
}
function bounded(value, fallback, name) {
    const number = value === undefined ? fallback : Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > 300000) fail(`invalid ${name}`);
    return number;
}
function portNumber(value) {
    const port = Number(value);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) fail('invalid port');
    return port;
}
function parsedUrl(value, originOnly = false) {
    let url;
    try {
        url = new URL(value);
    } catch {
        fail('invalid HTTP URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (originOnly && url.pathname !== '/')) fail('invalid HTTP URL');
    return url;
}
function resolveTarget({ mode = 'managed-nest', baseUrl, host = '127.0.0.1', port } = {}) {
    if (!['managed-nest', 'managed-rust', 'external'].includes(mode)) fail('invalid mode');
    let origin;
    if (mode === 'external') {
        if (typeof baseUrl !== 'string' || !baseUrl.trim()) fail('external requires an origin');
        origin = parsedUrl(baseUrl, true).origin;
        const url = new URL(origin);
        host = url.hostname.replace(/^\[|\]$/g, '');
        port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    } else {
        if (baseUrl !== undefined) fail('managed target conflicts with external URL');
        if (typeof host !== 'string' || !['127.0.0.1', 'localhost', '::1'].includes(host)) fail('managed host must be loopback');
        port = portNumber(port);
        origin = `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
    }
    return Object.freeze({ mode, managed: mode !== 'external', host, port, origin, apiBaseUrl: `${origin}/api`, readinessUrl: `${origin}/api/health/readiness` });
}
function validateApiReady({ status, bodyText }) {
    try {
        const body = JSON.parse(bodyText);
        return status === 200 && body.service === 'poms-api' && body.status === 'ready' && body.checks?.process?.status === 'pass' && body.checks?.database?.status === 'pass';
    } catch {
        return false;
    }
}
async function assertPortAvailable({ host, port }) {
    portNumber(port);
    if (typeof host !== 'string' || !['127.0.0.1', 'localhost', '::1'].includes(host)) fail('managed host must be loopback');
    await new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once('error', () => reject(new Error('E2E runtime: port is occupied or unavailable')));
        probe.listen({ host, port, exclusive: true }, () => probe.close((error) => (error ? reject(new Error('E2E runtime: port probe failed')) : resolve())));
    });
}
function requestOnce(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const client = url.protocol === 'https:' ? https : http;
        const request = client.get(url, { agent: false, timeout: timeoutMs, headers: { accept: 'application/json,text/html' } }, (response) => {
            const chunks = [];
            let length = 0;
            response.on('data', (chunk) => {
                length += chunk.length;
                if (length > 1024 * 1024) request.destroy(new Error('readiness body limit'));
                else chunks.push(chunk);
            });
            response.once('error', () => reject(new Error('readiness response failed')));
            response.once('end', () => resolve({ status: response.statusCode, headers: response.headers, bodyText: Buffer.concat(chunks).toString('utf8') }));
        });
        request.once('error', () => reject(new Error('readiness request failed')));
        request.once('timeout', () => request.destroy(new Error('readiness request deadline')));
    });
}
async function waitForReadiness({ url, timeoutMs = 60000, requestTimeoutMs = 1000, validateReady = validateApiReady, isAlive = () => true }) {
    const address = parsedUrl(url);
    timeoutMs = bounded(timeoutMs, 60000, 'readiness timeout');
    requestTimeoutMs = bounded(requestTimeoutMs, 1000, 'request timeout');
    if (typeof validateReady !== 'function' || typeof isAlive !== 'function') fail('invalid readiness callback');
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!isAlive()) fail('owned backend exited before readiness');
        try {
            const response = await requestOnce(address, Math.min(requestTimeoutMs, Math.max(1, deadline - Date.now())));
            if (!isAlive()) fail('owned backend exited before readiness');
            if (validateReady(response)) return response;
        } catch {
            /* Retry until the bounded deadline, without logging input. */
        }
        if (!isAlive()) fail('owned backend exited before readiness');
        await sleep(Math.min(50, Math.max(0, deadline - Date.now())));
    }
    fail('HTTP readiness deadline exceeded');
}
async function processIdentity(pid) {
    if (!Number.isSafeInteger(pid) || pid < 1) fail('invalid process identity');
    if (process.platform === 'linux') {
        try {
            const text = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
            const fields = text
                .slice(text.lastIndexOf(')') + 2)
                .trim()
                .split(/\s+/);
            const boot = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
            return { pid, parentPid: Number(fields[1]), group: Number(fields[2]), state: fields[0], startIdentity: `linux:${boot}:${fields[19]}` };
        } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ESRCH') return null;
            fail('process identity unavailable');
        }
    }
    if (process.platform === 'win32') {
        const powershell = path.join(process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        try {
            const { stdout } = await execFileAsync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'process-identity.ps1'), '-ProcessId', String(pid)], { windowsHide: true, timeout: 10000, encoding: 'utf8' });
            return stdout.trim() ? JSON.parse(stdout.replace(/^\uFEFF/, '')) : null;
        } catch {
            fail('process identity unavailable');
        }
    }
    fail('unsupported process ownership platform');
}
function alive(record) {
    return record.child.exitCode === null && record.child.signalCode === null && !record.backendExited;
}
async function groupMembers(pid) {
    const members = [];
    for (const name of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(name) || Number(name) === pid) continue;
        const member = await processIdentity(Number(name));
        if (member?.group === pid && member.state !== 'Z') members.push(member);
    }
    return members;
}
async function stopOwned(handle, { graceMs = 5000, killMs = 3000 } = {}) {
    const record = owned.get(handle);
    if (!record) fail('unowned process handle');
    if (record.stopping) return record.stopping;
    graceMs = bounded(graceMs, 5000, 'grace timeout');
    killMs = bounded(killMs, 3000, 'kill timeout');
    record.stopping = (async () => {
        const identity = await processIdentity(record.pid);
        if (!identity) {
            if (record.child.exitCode === null && record.child.signalCode === null) fail('owned anchor identity disappeared');
            if (process.platform === 'linux' && (await groupMembers(record.pid)).length !== 0) fail('owned anchor exited with live descendants');
            return;
        }
        if (identity.startIdentity !== record.startIdentity || (process.platform === 'linux' && identity.group !== record.pid)) fail('owned process identity mismatch');
        if (process.platform === 'win32') {
            const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
            try {
                await execFileAsync(taskkill, ['/PID', String(record.pid), '/T', '/F'], { timeout: killMs, windowsHide: true, encoding: 'utf8' });
            } catch {
                if (await processIdentity(record.pid)) fail('owned Windows tree termination failed');
            }
        } else {
            try {
                process.kill(-record.pid, 'SIGTERM');
            } catch (error) {
                if (error.code !== 'ESRCH') fail('owned process signal failed');
            }
            const deadline = Date.now() + graceMs;
            let drained = false;
            while (Date.now() < deadline) {
                if (record.backendExited && (await groupMembers(record.pid)).length === 0) {
                    drained = true;
                    break;
                }
                await sleep(25);
            }
            const current = await processIdentity(record.pid);
            if (current && current.startIdentity !== record.startIdentity) fail('owned process identity mismatch');
            if (current) {
                if (drained && record.child.connected) record.child.send({ type: 'release', runId: record.runId });
                else {
                    try {
                        process.kill(-record.pid, 'SIGKILL');
                    } catch (error) {
                        if (error.code !== 'ESRCH') fail('owned process force signal failed');
                    }
                }
            }
        }
        const deadline = Date.now() + killMs;
        while (Date.now() < deadline) {
            const remainingAnchor = await processIdentity(record.pid);
            if (remainingAnchor && remainingAnchor.startIdentity !== record.startIdentity) fail('owned process identity mismatch');
            // A vanished tree root alone does not prove its descendants have
            // stopped. Linux PID1 may retain terminated zombie entries, but no
            // running/sleeping/uninterruptible group member may remain.
            if (!remainingAnchor && (process.platform !== 'linux' || (await groupMembers(record.pid)).length === 0)) return;
            await sleep(25);
        }
        fail('owned process did not terminate');
    })();
    return record.stopping;
}
async function launchOwned({ kind, executable, args = [], cwd, env, readyUrl = '', timeoutMs = 60000, logPath, runId = randomUUID() }) {
    if (
        !['nest', 'rust', 'admin', 'fixture', 'command'].includes(kind) ||
        typeof executable !== 'string' ||
        !path.isAbsolute(executable) ||
        !Array.isArray(args) ||
        args.some((arg) => typeof arg !== 'string') ||
        !path.isAbsolute(cwd ?? '') ||
        !env ||
        Object.values(env).some((value) => typeof value !== 'string') ||
        typeof runId !== 'string' ||
        !/^[A-Za-z0-9_-]{8,80}$/.test(runId)
    )
        fail('invalid owned launch input');
    if (!['linux', 'win32'].includes(process.platform)) fail('unsupported process ownership platform');
    bounded(timeoutMs, 60000, 'startup timeout');
    if (logPath === undefined) logPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poms-e2e-owned-')), 'server.log');
    if (!path.isAbsolute(logPath) || !logPath.endsWith('.log') || (fs.existsSync(logPath) && fs.lstatSync(logPath).isSymbolicLink())) fail('invalid owned log path');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const fd = fs.openSync(logPath, 'a', 0o600);
    let child;
    try {
        child = spawn(process.execPath, [path.join(__dirname, 'runtime-worker.cjs')], { cwd, env: systemEnvironment(), detached: true, windowsHide: true, stdio: ['ignore', fd, fd, 'ipc'] });
    } finally {
        fs.closeSync(fd);
    }
    const record = { child, runId, logPath, backendExited: false, backendCode: null, backendFailed: false, serverPid: null, pid: child.pid, startIdentity: null, stopping: null };
    const handle = Object.freeze({
        runId,
        get pid() {
            return record.pid;
        },
        get serverPid() {
            return record.serverPid;
        },
        get startIdentity() {
            return record.startIdentity;
        },
        url: readyUrl,
        logPath,
        kind
    });
    owned.set(handle, record);
    child.on('message', (message) => {
        if (message?.runId !== runId) return;
        if (message.type === 'backend-spawned') record.serverPid = message.pid;
        if (message.type === 'backend-error' || message.type === 'backend-exit') record.backendExited = true;
        if (message.type === 'backend-error') record.backendFailed = true;
        if (message.type === 'backend-exit') record.backendCode = message.code;
    });
    try {
        await new Promise((resolve, reject) => {
            child.once('spawn', resolve);
            child.once('error', () => reject(new Error('E2E runtime: anchor spawn failed')));
        });
        const identity = await processIdentity(child.pid);
        if (!identity) fail('owned anchor exited before identity handshake');
        record.pid = identity.pid;
        record.startIdentity = identity.startIdentity;
        if (process.platform === 'linux' && identity.group !== identity.pid) fail('owned anchor group mismatch');
        child.send({ type: 'start', runId, executable, args, cwd, env });
        const handshakeDeadline = Date.now() + timeoutMs;
        while (record.serverPid === null && !record.backendExited && child.exitCode === null && child.signalCode === null && Date.now() < handshakeDeadline) await sleep(10);
        if (record.serverPid === null && !record.backendExited) fail('owned backend startup deadline');
        return handle;
    } catch (error) {
        if (record.startIdentity) await stopOwned(handle, { graceMs: 250, killMs: 3000 });
        else {
            child.kill();
        }
        fail(error.message.startsWith('E2E runtime:') ? error.message.slice('E2E runtime: '.length) : 'owned startup failed');
    }
}
async function startOwned(options) {
    const { host, port, readyUrl, timeoutMs = 60000, requestTimeoutMs = 1000, validateReady = validateApiReady } = options;
    const readyAddress = parsedUrl(readyUrl);
    if (readyAddress.protocol !== 'http:' || readyAddress.hostname.replace(/^\[|\]$/g, '') !== host || Number(readyAddress.port || 80) !== portNumber(port)) fail('readiness target differs from owned listener');
    bounded(timeoutMs, 60000, 'readiness timeout');
    bounded(requestTimeoutMs, 1000, 'request timeout');
    if (typeof validateReady !== 'function') fail('invalid readiness callback');
    await assertPortAvailable({ host, port });
    const handle = await launchOwned(options);
    try {
        await waitForReadiness({ url: readyUrl, timeoutMs, requestTimeoutMs, validateReady, isAlive: () => alive(owned.get(handle)) });
        return handle;
    } catch (error) {
        await stopOwned(handle, { graceMs: 250, killMs: 3000 });
        throw error;
    }
}
async function runOwnedCommand(options) {
    const timeoutMs = bounded(options.timeoutMs, 180000, 'command timeout');
    const handle = await launchOwned({ ...options, kind: 'command', timeoutMs });
    const record = owned.get(handle);
    try {
        const deadline = Date.now() + timeoutMs;
        while (!record.backendExited && record.child.exitCode === null && record.child.signalCode === null && Date.now() < deadline) await sleep(25);
        if (!record.backendExited) fail('owned command deadline exceeded');
        if (record.backendFailed || record.backendCode !== 0) fail('owned command failed');
        return { code: 0, logPath: handle.logPath };
    } finally {
        await stopOwned(handle, { graceMs: 250, killMs: 3000 });
    }
}
module.exports = { resolveTarget, validateApiReady, assertPortAvailable, waitForReadiness, startOwned, stopOwned, runOwnedCommand };
