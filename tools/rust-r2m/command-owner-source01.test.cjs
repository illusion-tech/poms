// The full copied owner runs over Fake process/FS/IPC/clock adapters only.
// No actual process, signal, port, private file, DB or browser is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path').posix;
const { EventEmitter } = require('node:events');
const { createHash } = require('node:crypto');
const source = fs.readFileSync('tools/rust-r2m/command-owner.cjs', 'utf8');
const original = fs.readFileSync('tools/e2e/runtime.cjs', 'utf8');
const ROOT = '/home/wangzishi/projects/poms-rust-r2m';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2m/private';
const NODE = '/controlled/fnm/node';
const baseOptions = () => ({ executable: NODE, args: ['tools/rust-r2m/acceptance-api-runtime.mjs', '--run', '--backend', 'nest', '--mode', 'api', '--tag', 'controlled', '--cap', 'tmp/rust-r2m/source-cap-controlled.json'], cwd: ROOT, env: { PATH: '/controlled/bin', HOME: '/home/wangzishi', LANG: 'C.UTF-8' }, logPath: PRIVATE + '/execution-logs/acceptance-nest-controlled.log', runId: 'r2m-api-controlled-run', timeoutMs: 900000 });

function fakeOwner(configuration = {}) {
    let now = 0, anchorGone = false, backendGone = false, descendantGone = !configuration.descendant, startTick = '10', sent, spawned = false, exited = false, fsOps = 0;
    const signals = [], starts = [], spawnCalls = [], file = { dev: 1, ino: 2, size: 0, mtimeMs: 1, ctimeMs: 1, mode: 0o100600, nlink: 1, isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false };
    const directory = { dev: 1, ino: 1, mode: 0o40700, isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false };
    const absent = () => Object.assign(new Error('controlled absent process'), { code: 'ENOENT' });
    const child = new EventEmitter();
    function deliver() {
        if (!sent) return;
        const startupAt = configuration.startupAt ?? 10;
        if (!spawned && now >= startupAt) { spawned = true; child.emit('message', { type: 'backend-spawned', runId: configuration.foreignHandshake ? 'r2m-api-foreign-run' : sent.runId, pid: 43 }); }
        if (spawned && !exited && now >= startupAt + (configuration.duration ?? 400000)) { exited = true; backendGone = true; if (configuration.reuseAfterExit) startTick = '20'; child.emit('message', { type: 'backend-exit', runId: sent.runId, code: configuration.exitCode ?? 0 }); }
    }
    Object.assign(child, { pid: 42, exitCode: null, signalCode: null, connected: true, kill() { signals.push('child-kill'); anchorGone = true; child.exitCode = 1; }, send(message) { if (message.type === 'start') { starts.push(message); sent = message; deliver(); } else if (message.type === 'release') { anchorGone = true; child.exitCode = 0; child.connected = false; } } });
    const fakeFs = {
        constants: { O_WRONLY: 1, O_APPEND: 2, O_NOFOLLOW: 4 },
        lstatSync(value) { fsOps++; if (value.endsWith('.log')) return configuration.logSymlink ? { ...file, isSymbolicLink: () => true } : file; return configuration.parentSymlink && value === PRIVATE ? { ...directory, isSymbolicLink: () => true } : directory; },
        realpathSync(value) { fsOps++; return value; }, existsSync() { fsOps++; return true; }, mkdirSync() { fsOps++; }, openSync(value, flags) { fsOps++; assert.equal(value, baseOptions().logPath); assert.equal(flags, 7); return 3; }, fstatSync() { fsOps++; return file; }, closeSync() { fsOps++; },
        readdirSync(value) { fsOps++; assert.equal(value, '/proc'); return ['42', '43', ...(configuration.descendant ? ['44'] : []), '99']; },
        readFileSync(value) { fsOps++; if (value.endsWith('boot_id')) return 'controlled-boot'; const match = /^\/proc\/(\d+)\/stat$/.exec(value); assert(match); const pid = Number(match[1]); if ((pid === 42 && anchorGone) || (pid === 43 && backendGone) || (pid === 44 && descendantGone)) throw absent(); const fields = Array(20).fill('0'); fields[0] = 'S'; fields[1] = pid === 42 ? '1' : '42'; fields[2] = pid === 99 ? '99' : '42'; fields[19] = pid === 42 ? startTick : '11'; return pid + ' (controlled) ' + fields.join(' '); }
    };
    const fakeProcess = { platform: configuration.platform ?? 'linux', execPath: NODE, env: { ...baseOptions().env, JWT_SECRET: 'controlled-ambient-not-forwarded', NODE_OPTIONS: 'controlled-ambient-not-forwarded' }, cwd: () => configuration.cwd ?? ROOT, kill(pid, signal) { signals.push({ pid, signal }); assert.equal(pid, -42); if (signal === 'SIGTERM') { backendGone = true; child.emit('message', { type: 'backend-exit', runId: sent.runId, code: 0 }); if (!configuration.descendant) descendantGone = true; } else if (signal === 'SIGKILL') { backendGone = true; descendantGone = true; anchorGone = true; child.signalCode = 'SIGKILL'; } } };
    const fakeSpawn = (executable, args, options) => { spawnCalls.push({ executable, args, options }); assert.equal(executable, NODE); assert.deepEqual(Array.from(args), [ROOT + '/tools/e2e/runtime-worker.cjs']); queueMicrotask(() => child.emit('spawn')); return child; };
    const module = { exports: {} }, forbiddenNetwork = { createServer() { assert.fail('No actual/readiness API should be reachable'); }, get() { assert.fail('No HTTP request is permitted'); } };
    vm.runInNewContext(source, { module, exports: module.exports, __dirname: ROOT + '/tools/rust-r2m', process: fakeProcess, URL, Date: { now: () => now }, setTimeout(callback, ms) { now += ms; deliver(); queueMicrotask(callback); return 1; }, require(name) { if (name === 'node:child_process') return { spawn: fakeSpawn, execFile() { assert.fail('No Windows process query is allowed'); } }; if (name === 'node:fs') return fakeFs; if (name === 'node:path') return path; if (['node:http', 'node:https', 'node:net'].includes(name)) return forbiddenNetwork; return require(name); } });
    return { runtime: module.exports, signals, starts, spawnCalls, now: () => now, fsOps: () => fsOps };
}

test('a genuine Fake command may run beyond300s and finish within the finite900s budget with only one original worker/handshake', async () => {
    const model = fakeOwner(); const receipt = await model.runtime.runOwnedCommand(baseOptions());
    assert.equal(receipt.code, 0); assert(model.now() > 300000 && model.now() < 900000); assert.equal(model.spawnCalls.length, 1); assert.equal(model.starts.length, 1);
    assert.equal(model.spawnCalls[0].options.cwd, ROOT); assert.equal(model.spawnCalls[0].options.detached, true); assert.equal(model.starts[0].executable, NODE); assert.equal(model.starts[0].runId, 'r2m-api-controlled-run');
    assert.deepEqual(Object.keys(model.starts[0].env).sort(), ['HOME', 'LANG', 'PATH']); assert(!Object.hasOwn(model.spawnCalls[0].options.env, 'JWT_SECRET')); assert(!Object.hasOwn(model.spawnCalls[0].options.env, 'NODE_OPTIONS')); assert(model.signals.every(x => x.pid === -42));
});

test('command900001 and startup60001 are rejected before filesystem, handshake or spawn', async () => {
    for (const [field, values] of [['timeoutMs', [0, -1, 900001, 1.5, NaN, Infinity]], ['startupTimeoutMs', [0, -1, 60001, 900000]]]) for (const value of values) { const model = fakeOwner(), options = baseOptions(); options[field] = value; await assert.rejects(model.runtime.runOwnedCommand(options), /invalid M/); assert.equal(model.fsOps(), 0); assert.equal(model.spawnCalls.length, 0); }
});

test('M-only cwd, Node entry, log namespace and inherited environment cannot be broadened', async () => {
    const mutations = [o => o.cwd = '/home/wangzishi/projects/poms-rust-r2l', o => o.executable = '/usr/bin/other-node', o => o.args[0] = '-e', o => o.args[0] = 'tools/rust-r2l/old.mjs', o => o.logPath = PRIVATE.replace('r2m', 'r2l') + '/execution-logs/acceptance-nest-controlled.log', o => o.logPath += '/../../other.log', o => o.env.NODE_OPTIONS = '--require controlled', o => o.env.database_url = 'controlled', o => o.env.JWT_SECRET = 'controlled', o => o.env.PATH = '/foreign', o => o.host = 'foreign'];
    for (const mutate of mutations) { const model = fakeOwner(), options = baseOptions(); mutate(options); await assert.rejects(model.runtime.runOwnedCommand(options), /invalid M/); assert.equal(model.fsOps(), 0); assert.equal(model.spawnCalls.length, 0); }
    const model = fakeOwner({ platform: 'win32' }); await assert.rejects(model.runtime.runOwnedCommand(baseOptions()), /runtime scope/); assert.equal(model.fsOps(), 0);
});

test('a long command never extends the original startup handshake beyond60s and wrong run-ID acknowledgements stay untrusted', async () => {
    for (const config of [{ startupAt: 60001 }, { foreignHandshake: true }]) { const model = fakeOwner(config); await assert.rejects(model.runtime.runOwnedCommand(baseOptions()), /startup deadline/); assert(model.now() >= 60000 && model.now() < 65000); assert.equal(model.spawnCalls.length, 1); assert.equal(model.starts.length, 1); assert(model.signals.every(x => x.pid === -42)); }
});

test('900s deadline stops the same owned tree without retrying the command or manufacturing a final business report', async () => {
    const model = fakeOwner({ duration: 900001 }); await assert.rejects(model.runtime.runOwnedCommand(baseOptions()), /owned command deadline/); assert(model.now() >= 900000 && model.now() < 904000); assert.equal(model.starts.length, 1); assert.equal(model.spawnCalls.length, 1); assert(model.signals.some(x => x.pid === -42 && x.signal === 'SIGTERM'));
});

test('copied birth-identity mismatch refuses signals and copied descendant cleanup force-stops only its own group', async () => {
    const reused = fakeOwner({ duration: 25, reuseAfterExit: true }); await assert.rejects(reused.runtime.runOwnedCommand(baseOptions()), /identity mismatch/); assert.equal(reused.signals.length, 0);
    const tree = fakeOwner({ duration: 25, descendant: true }); assert.equal((await tree.runtime.runOwnedCommand(baseOptions())).code, 0); assert(tree.signals.some(x => x.signal === 'SIGTERM' && x.pid === -42)); assert(tree.signals.some(x => x.signal === 'SIGKILL' && x.pid === -42)); assert(tree.signals.every(x => x.pid === -42));
});

test('private log/parent symlinks are refused before spawn and no generic listener/readiness API is exported', async () => {
    for (const config of [{ logSymlink: true }, { parentSymlink: true }]) { const model = fakeOwner(config); await assert.rejects(model.runtime.runOwnedCommand(baseOptions()), /invalid M/); assert.equal(model.spawnCalls.length, 0); }
    const model = fakeOwner(); assert.deepEqual(Object.keys(model.runtime).sort(), ['runOwnedCommand', 'stopOwned']); await assert.rejects(model.runtime.stopOwned({ pid: 42, runId: 'forged' }), /unowned/); assert.equal(model.signals.length, 0);
});

test('mature PID/start identity, group scan and stop implementation remain byte-for-byte original', () => {
    const fragment = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));
    for (const [start, end] of [['async function processIdentity(', 'function alive('], ['function alive(', 'async function groupMembers('], ['async function groupMembers(', 'async function stopOwned('], ['async function stopOwned(', 'async function launchOwned(']]) assert.equal(fragment(source, start, end), fragment(original, start, end));
    const manifest = JSON.parse(fs.readFileSync('tools/rust-r2m/audit-command-owner-before-source01.json')); for (const item of manifest.files) assert.equal(createHash('sha256').update(fs.readFileSync(item.file)).digest('hex'), item.rawBytesSha256);
});
