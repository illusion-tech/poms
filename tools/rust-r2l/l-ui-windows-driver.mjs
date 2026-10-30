// V2 stdio bridge. Credentials arrive only after Root ACKs the real Windows
// process identity. EOF/error rejects every waiter and cooperatively aborts UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import readline from 'node:readline';
import { runOriginalLUi } from './l-ui-browser.mjs';

export const BRIDGE_PREFIX = 'POMS_L_UI_BRIDGE_V2 ';
const NODE = 'C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe';
const NODE_SHA = '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Exported only to exercise lifecycle failure paths with in-memory streams.
export function createDriverBridge({ input, output, controller, ackTimeoutMs = 45000, configurationTimeoutMs = 15000 }) {
    const pending = new Map(); let sequence = 0, closing = false, failed, profileAcknowledged = false, configured = false;
    let configResolve, configReject;
    const configuration = new Promise((resolve, reject) => { configResolve = resolve; configReject = reject; });
    configuration.catch(() => {});
    const timer = setTimeout(() => fail('configuration-deadline'), configurationTimeoutMs); timer.unref?.();
    function emit(value) {
        if (output.destroyed || output.writableEnded) { fail('stdout-closed'); return; }
        try { output.write(BRIDGE_PREFIX + JSON.stringify(value) + '\n'); } catch { fail('stdout-error'); }
    }
    function fail(code) {
        if (failed || closing) return;
        failed = new Error('UI bridge ' + code); clearTimeout(timer); configReject(failed);
        for (const item of pending.values()) { clearTimeout(item.timer); item.reject(failed); }
        pending.clear(); if (!controller.signal.aborted) controller.abort(failed);
    }
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    lines.on('line', (line) => {
        if (failed || closing) return;
        try {
            assert(line.length <= 4 * 1024 * 1024);
            const value = JSON.parse(line);
            if (value.type === 'abort') { fail('Root-abort'); return; }
            if (value.type === 'configuration') {
                assert(profileAcknowledged && !configured); configured = true; clearTimeout(timer); configResolve(value.options); return;
            }
            assert.equal(value.type, 'ack'); const item = pending.get(value.id); assert(item);
            pending.delete(value.id); clearTimeout(item.timer);
            if (!value.ok) { item.reject(new Error('Root rejected UI bridge request')); fail('Root-rejection'); return; }
            if (item.type === 'profile') profileAcknowledged = true;
            item.resolve(value.identity ?? null);
        } catch { fail('invalid-input'); }
    });
    lines.on('close', () => { if (!closing) fail('stdin-EOF'); });
    lines.on('error', () => fail('readline-error'));
    input.on('error', () => fail('stdin-error')); output.on('error', () => fail('stdout-error'));
    function request(type, fields = {}) {
        if (failed || closing) return Promise.reject(failed ?? new Error('UI bridge is closing'));
        const id = ++sequence;
        const result = new Promise((resolve, reject) => {
            const deadline = setTimeout(() => fail(type + '-ACK-deadline'), ackTimeoutMs); deadline.unref?.();
            pending.set(id, { type, resolve, reject, timer: deadline }); emit({ type, id, ...fields });
        });
        result.catch(() => {}); return result;
    }
    return { configuration, request, emit, fail,
        pendingCount: () => pending.size,
        close() { closing = true; clearTimeout(timer); configReject(new Error('UI bridge closed')); for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('UI bridge closed')); } pending.clear(); lines.close(); input.pause(); }
    };
}

async function main() {
    assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.19.0');
    assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--bridge-id');
    const bridgeId = process.argv[3]; assert(/^[0-9a-f-]{36}$/.test(bridgeId));
    process.chdir(ROOT);
    const executable = fs.realpathSync(process.execPath), driverPath = fs.realpathSync(fileURLToPath(import.meta.url));
    assert.equal(executable.toLowerCase(), NODE.toLowerCase()); assert.equal(sha(fs.readFileSync(executable)), NODE_SHA);
    const controller = new AbortController();
    const bridge = createDriverBridge({ input: process.stdin, output: process.stdout, controller });
    let uiTimer;
    try {
        await bridge.request('profile', { bridgeId, windowsPid: process.pid, node: process.version, executable,
            executableRawBytesSha256: NODE_SHA, driverPath, driverRawBytesSha256: sha(fs.readFileSync(driverPath)),
            driverArgv: process.argv.slice(), credentialInputsRecorded: false });
        const options = await bridge.configuration;
        const totalMs = options.totalTimeoutMs ?? 300000; assert(Number.isInteger(totalMs) && totalMs >= 1000 && totalMs <= 360000);
        uiTimer = setTimeout(() => bridge.fail('driver-total-deadline'), totalMs); uiTimer.unref();
        const report = await runOriginalLUi({ ...options, signal: controller.signal,
            onBeforeStep: (info) => bridge.request('callback', { phase: 'before', info }),
            onAfterStep: (info) => bridge.request('callback', { phase: 'after', info }) });
        clearTimeout(uiTimer);
        // Keep the verified Windows anchor until Root inspects the closed tree.
        await bridge.request('result', { report });
    } catch (error) {
        clearTimeout(uiTimer); process.exitCode = 1;
        const failure = { report: error.report ?? null, name: error.name,
            message: error.report ? 'Actual browser attempt failed; preserved public report' : 'UI driver aborted before a completed browser report' };
        if (controller.signal.aborted) bridge.emit({ type: 'failure', id: 0, ...failure });
        else { try { await bridge.request('failure', failure); } catch { /* Root/stdio already lost. */ } }
    } finally { bridge.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
    await main();
}
