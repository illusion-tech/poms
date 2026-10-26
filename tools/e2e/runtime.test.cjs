const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const runtime = require('./runtime.cjs');
const cwd = path.resolve(__dirname, '../..');
const fixture = path.join(__dirname, 'fixtures/server.cjs');
function linuxState(pid) {
    if (process.platform !== 'linux') return null;
    try {
        const text = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        const fields = text
            .slice(text.lastIndexOf(')') + 2)
            .trim()
            .split(/\s+/);
        return { state: fields[0], parentPid: Number(fields[1]), group: Number(fields[2]), exitCode: Number(fields[49]) };
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ESRCH') return null;
        throw error;
    }
}
const alive = (pid) => {
    // kill(pid,0) also succeeds for a terminated zombie. Use the kernel state,
    // not a higher listener limit or a skipped cleanup assertion.
    if (linuxState(pid)?.state === 'Z') return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};
async function freePort() {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return port;
}
async function options(mode = 'ready', report) {
    const port = await freePort();
    return {
        kind: 'fixture',
        executable: process.execPath,
        args: [fixture, String(port), mode, ...(report ? [report] : [])],
        cwd,
        env: {},
        host: '127.0.0.1',
        port,
        readyUrl: `http://127.0.0.1:${port}/api/health/readiness`,
        timeoutMs: 500,
        requestTimeoutMs: 100
    };
}
test('target selection rejects ambiguous mode, URL and port before side effects', () => {
    const target = runtime.resolveTarget({ mode: 'external', baseUrl: 'https://example.invalid/' });
    assert.equal(target.apiBaseUrl, 'https://example.invalid/api');
    assert.equal(target.managed, false);
    for (const value of ['', 'file:///tmp/x', 'http://u:p@localhost', 'http://localhost/api', 'http://localhost/?x=1', 'http://localhost/#x']) assert.throws(() => runtime.resolveTarget({ mode: 'external', baseUrl: value }));
    for (const port of [0, -1, 65536, NaN, '1x']) assert.throws(() => runtime.resolveTarget({ port }));
    assert.throws(() => runtime.resolveTarget({ mode: '' }));
    assert.throws(() => runtime.resolveTarget({ mode: 'managed-nest', port: 1234, baseUrl: 'http://localhost' }));
});
test('owned listener passes real HTTP readiness and repeated stop terminates only its tree', async () => {
    const input = await options();
    const handle = await runtime.startOwned(input);
    assert(Object.isFrozen(handle));
    assert(handle.pid > 0);
    assert(handle.serverPid > 0);
    assert(handle.startIdentity);
    try {
        await assert.rejects(runtime.stopOwned({ ...handle, startIdentity: 'stale' }), /unowned/);
        assert(alive(handle.pid));
    } finally {
        await runtime.stopOwned(handle, { graceMs: 250, killMs: 3000 });
    }
    await runtime.stopOwned(handle);
    assert.equal(alive(handle.pid), false);
    assert.equal(alive(handle.serverPid), false);
    await runtime.assertPortAvailable(input);
});
test('occupied port is rejected without stopping the independent listener', async () => {
    const server = http.createServer((_request, response) => response.end('independent'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    try {
        await assert.rejects(runtime.startOwned({ ...(await options()), port, readyUrl: `http://127.0.0.1:${port}/api/health/readiness` }), /occupied/);
        assert(server.listening);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
for (const mode of ['early', 'fake', 'stall'])
    test(`${mode} startup fails and removes its owned anchor/backend`, async (t) => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-e2e-negative-'));
        t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
        const report = path.join(directory, 'report.json');
        const input = await options(mode, report);
        await assert.rejects(runtime.startOwned(input), /exited|readiness/);
        const state = JSON.parse(fs.readFileSync(report, 'utf8'));
        assert.equal(alive(state.anchor), false);
        assert.equal(alive(state.server), false);
        await runtime.assertPortAvailable(input);
    });
test('owned descendants are force-cleaned when a descendant ignores SIGTERM', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-e2e-tree-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const report = path.join(directory, 'report.json');
    const handle = await runtime.startOwned(await options('tree', report));
    const state = JSON.parse(fs.readFileSync(report, 'utf8'));
    await runtime.stopOwned(handle, { graceMs: 100, killMs: 3000 });
    assert.equal(alive(state.server), false);
    assert.equal(alive(state.descendant), false);
    const remaining = linuxState(state.descendant);
    if (remaining) {
        assert.equal(remaining.state, 'Z');
        assert.equal(remaining.exitCode & 0x7f, 9); // force signal actually completed
        console.log(JSON.stringify({ kind: 'terminated-descendant', state: 'Z', parentPid: remaining.parentPid, signal: 'SIGKILL', pidEntryMayAwaitReaping: true }));
    }
});
test('external HTTP readiness never acquires or stops ownership', async () => {
    const server = http.createServer((_request, response) => response.end(JSON.stringify({ service: 'poms-api', status: 'ready', checks: { process: { status: 'pass' }, database: { status: 'pass' } } })));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
        await runtime.waitForReadiness({ url: `http://127.0.0.1:${server.address().port}/api/health/readiness`, timeoutMs: 500 });
        await assert.rejects(runtime.stopOwned({ pid: process.pid, runId: 'external', startIdentity: 'forged' }), /unowned/);
        assert(server.listening);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
test('build command completion/failure use the same owned tree boundary', async () => {
    assert.equal((await runtime.runOwnedCommand({ executable: process.execPath, args: ['-e', 'process.exit(0)'], cwd, env: {}, timeoutMs: 500 })).code, 0);
    await assert.rejects(runtime.runOwnedCommand({ executable: process.execPath, args: ['-e', 'process.exit(3)'], cwd, env: {}, timeoutMs: 500 }), /command failed/);
});

test('kernel birth identity mismatch refuses all signals even with a real owned handle', async () => {
    // Execute the same CommonJS implementation with isolated OS adapters. This
    // makes an otherwise nondeterministic PID-reuse race exact without killing
    // a real process, changing production files, or adding a runtime test hook.
    const { EventEmitter } = require('node:events');
    const vm = require('node:vm');
    let startTick = '10',
        signals = 0,
        anchorGone = false;
    const child = new EventEmitter();
    Object.assign(child, {
        pid: 42,
        exitCode: null,
        signalCode: null,
        connected: true,
        kill: () => {
            signals++;
        },
        send: (message) => setImmediate(() => child.emit('message', { type: 'backend-spawned', runId: message.runId, pid: 43 }))
    });
    const fakeFs = {
        mkdtempSync: () => '/tmp/owned-fixture',
        existsSync: () => false,
        mkdirSync: () => undefined,
        openSync: () => 3,
        closeSync: () => undefined,
        readdirSync: () => ['42', '43'],
        readFileSync: (file) => {
            if (file.endsWith('boot_id')) return 'public-boot-id';
            if (anchorGone && file === '/proc/42/stat') {
                const error = new Error('synthetic absent anchor');
                error.code = 'ENOENT';
                throw error;
            }
            const fields = Array(20).fill('0');
            fields[0] = 'R';
            fields[1] = '1';
            fields[2] = '42';
            fields[19] = startTick;
            return `42 (owned-fixture) ${fields.join(' ')}`;
        }
    };
    const fakeHttp = {
        get: (_url, _options, callback) => {
            const request = new EventEmitter();
            request.destroy = () => undefined;
            setImmediate(() => {
                const response = new EventEmitter();
                response.statusCode = 200;
                response.headers = {};
                callback(response);
                response.emit('data', Buffer.from('{"service":"poms-api","status":"ready","checks":{"process":{"status":"pass"},"database":{"status":"pass"}}}'));
                response.emit('end');
            });
            return request;
        }
    };
    const fakeNet = {
        createServer: () => {
            const server = new EventEmitter();
            server.listen = (_options, callback) => setImmediate(callback);
            server.close = (callback) => callback();
            return server;
        }
    };
    const adapters = {
        'node:fs': fakeFs,
        'node:http': fakeHttp,
        'node:net': fakeNet,
        'node:path': path.posix,
        'node:child_process': {
            spawn: () => {
                setImmediate(() => child.emit('spawn'));
                return child;
            },
            execFile: () => {
                throw new Error('Unexpected process metadata command');
            }
        }
    };
    function isolatedRuntime() {
        const module = { exports: {} };
        vm.runInNewContext(
            fs.readFileSync(path.join(__dirname, 'runtime.cjs'), 'utf8'),
            {
                module,
                require: (name) => adapters[name] ?? require(name),
                process: {
                    platform: 'linux',
                    execPath: '/node',
                    env: {},
                    kill: () => {
                        signals++;
                    }
                },
                __dirname: '/repo/tools/e2e',
                URL,
                Buffer,
                setTimeout,
                setImmediate
            },
            { filename: 'runtime.cjs' }
        );
        return module.exports;
    }
    const api = isolatedRuntime();
    const handle = await api.startOwned({ kind: 'fixture', executable: '/node', args: [], cwd: '/repo', env: {}, host: '127.0.0.1', port: 3333, readyUrl: 'http://127.0.0.1:3333/api/health/readiness', timeoutMs: 200 });
    startTick = '11';
    await assert.rejects(api.stopOwned(handle), /identity mismatch/);
    assert.equal(signals, 0);
    // The other terminal path must also refuse a false cleanup success after
    // an externally reaped anchor, without signaling an identity it no longer owns.
    startTick = '10';
    const second = isolatedRuntime();
    const secondHandle = await second.startOwned({ kind: 'fixture', executable: '/node', args: [], cwd: '/repo', env: {}, host: '127.0.0.1', port: 3333, readyUrl: 'http://127.0.0.1:3333/api/health/readiness', timeoutMs: 200 });
    anchorGone = true;
    child.exitCode = 1;
    await assert.rejects(second.stopOwned(secondHandle), /live descendants/);
    assert.equal(signals, 0);
});
