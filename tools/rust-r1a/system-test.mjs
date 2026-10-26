// R1A process/HTTP acceptance. Run through check.sh system with the fixed PG15
// app secret. Every child is owned by this run; no port/PID scan or database write.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const binary = '/target/release/poms-api-rust';
const sentinel = 'r1a-secret-must-never-appear';
const assertions = [];
const children = [];
function check(name, condition) {
    assert.ok(condition, name);
    assertions.push(name);
}
async function freePort() {
    const listener = net.createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())));
    return port;
}
function request(port, requestPath, method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: requestPath, method, headers, timeout: 4000 }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('HTTP request deadline')));
        req.end();
    });
}
async function waitExit(child, timeoutMs = 4000) {
    if (child.exitCode !== null || child.signalCode !== null) return child.exitCode;
    let timer;
    try {
        await Promise.race([
            once(child, 'exit'),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Child exit deadline')), timeoutMs);
            })
        ]);
        return child.exitCode;
    } finally {
        clearTimeout(timer);
    }
}
async function app(directory, base, overrides = {}, expectedStart = true) {
    const env = { ...base, PORT: String(await freePort()), ...overrides };
    const child = spawn(binary, [], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const instance = { child, port: Number(env.PORT), output: '' };
    children.push(instance); // Registered immediately, including failed startup.
    child.stdout.on('data', (chunk) => {
        instance.output += chunk;
    });
    child.stderr.on('data', (chunk) => {
        instance.output += chunk;
    });
    await once(child, 'spawn');
    if (expectedStart) {
        const deadline = Date.now() + 8000;
        for (;;) {
            assert.equal(child.exitCode, null, 'Child exited before HTTP startup');
            try {
                if ((await request(instance.port, '/api')).status === 200) return instance;
            } catch {
                /* Startup pending. */
            }
            assert.ok(Date.now() < deadline, 'HTTP startup deadline');
            await delay(25);
        }
    }
    return instance;
}
async function finish(instance, signal = 'SIGTERM', expected = 0, startup = false) {
    if (instance.child.exitCode === null && instance.child.signalCode === null) instance.child.kill(signal);
    check(`exit-${signal}-${expected}`, (await waitExit(instance.child)) === expected);
    // Wait until inherited stdout/stderr handles have both closed.
    if (!instance.child.stdout.destroyed || !instance.child.stderr.destroyed) await once(instance.child, 'close');
    check('logs-no-synthetic-secret', !instance.output.includes(sentinel));
    check('logs-no-runtime-password', !instance.output.includes(process.env.DB_PASSWORD));
    const records = instance.output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    check(
        'logs-structured-events',
        records.every((record) => typeof record.event === 'string' && record.fields)
    );
    if (expected === 0) {
        const event = startup ? 'startup_cancelled' : 'shutdown_complete';
        check(
            `${event}-recorded`,
            records.some((record) => record.event === event)
        );
        let released = false;
        try {
            await request(instance.port, '/api');
        } catch {
            released = true;
        }
        check('listener-released', released);
    }
    return records;
}
function health(body, expectedStatus, database) {
    const value = JSON.parse(body);
    assert.deepEqual(Object.keys(value).sort(), ['service', 'status', 'checkedAt', 'uptimeSeconds', 'checks'].sort());
    check(`health-${expectedStatus}-identity`, value.service === 'poms-api' && value.status === expectedStatus);
    check('health-checkedAt-utc', value.checkedAt.endsWith('Z') && Number.isFinite(Date.parse(value.checkedAt)));
    check('health-uptime-integer', Number.isInteger(value.uptimeSeconds) && value.uptimeSeconds >= 0);
    assert.deepEqual(value.checks.process, { status: 'pass', message: 'API process is running.', durationMs: 0 });
    check('health-database-presence', 'database' in value.checks === database);
    if (database) {
        assert.deepEqual(Object.keys(value.checks.database).sort(), ['status', 'message', 'durationMs'].sort());
        check('health-database-duration', value.checks.database.durationMs >= 0);
    }
    return value;
}

assert.ok(process.env.DB_PASSWORD, 'Run through check.sh system with the isolated app secret');
const directory = await mkdtemp(path.join(os.tmpdir(), 'poms-r1a-system-'));
try {
    const envFile = path.join(directory, 'empty.env');
    await writeFile(envFile, '');
    const base = {
        PATH: '/usr/local/bin:/usr/bin:/bin',
        POMS_ENV_FILE: envFile,
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        DB_HOST: '127.0.0.1',
        DB_PORT: '15432',
        DB_USER: 'poms_r0e_app',
        DB_DATABASE: 'poms_r0e_rust',
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_CONNECT: '1',
        DB_ACQUIRE_TIMEOUT_MS: '300',
        DB_QUERY_TIMEOUT_MS: '300',
        DB_STATEMENT_TIMEOUT_MS: '300',
        SHUTDOWN_TIMEOUT_MS: '1000',
        JWT_SECRET: sentinel,
        POMS_SECRET_KEY: sentinel,
        CORS_ORIGIN: 'http://localhost:4200,https://example.invalid'
    };
    const running = await app(directory, base);
    let res = await request(running.port, '/api');
    check('root-http-contract', res.status === 200 && JSON.parse(res.body).message === 'Hello API');
    check('request-id-present', Boolean(res.headers['x-request-id']));
    res = await request(running.port, '/api/health');
    check('liveness-status', res.status === 200);
    health(res.body, 'live', false);
    res = await request(running.port, '/api/health/readiness');
    check('readiness-real-pg15-200', res.status === 200);
    const ready = health(res.body, 'ready', true);
    check('database-success-message', ready.checks.database.message === 'Database connection is healthy.');
    res = await request(running.port, `/api/unimplemented?token=${sentinel}`);
    // R1C's original Nest HTTP oracle corrected the earlier JSON assumption.
    check('unknown-route-error', res.status === 404 && res.headers['content-type'] === 'text/html; charset=utf-8' && res.body.includes('<pre>Cannot GET /api/unimplemented</pre>') && !res.body.includes(sentinel));
    check('unsupported-method-error', (await request(running.port, '/api', 'POST')).status === 404);
    res = await request(running.port, '/api', 'OPTIONS', {
        Origin: 'http://localhost:4200',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,X-CSRF-Token'
    });
    check('cors-preflight', res.status === 204 && res.headers['access-control-allow-origin'] === 'http://localhost:4200');
    check('cors-credentials', res.headers['access-control-allow-credentials'] === 'true');
    res = await request(running.port, '/api', 'GET', { Origin: 'https://denied.invalid', Cookie: sentinel, Authorization: sentinel });
    check('cors-denied-origin', !('access-control-allow-origin' in res.headers));
    await finish(running);

    const lazy = await app(directory, base, { DB_CONNECT: '', DB_PORT: '1' });
    res = await request(lazy.port, '/api/health/readiness');
    check('lazy-readiness-db-failure-503', res.status === 503);
    health(res.body, 'not_ready', true);
    await finish(lazy, 'SIGINT');

    // Own a synthetic TCP black hole: this is not a PostgreSQL connection and
    // uses no real credential. A signal must interrupt eager startup, too.
    for (const signal of ['SIGTERM', 'SIGINT']) {
        const sockets = new Set();
        const blackhole = net.createServer((socket) => {
            sockets.add(socket);
            socket.on('error', () => {
                /* The owned black-hole socket may reset during child shutdown. */
            });
            socket.on('close', () => sockets.delete(socket));
        });
        blackhole.listen(0, '127.0.0.1');
        await once(blackhole, 'listening');
        let timer;
        try {
            const connected = once(blackhole, 'connection');
            const pending = await app(
                directory,
                base,
                {
                    DB_PORT: String(blackhole.address().port),
                    DB_USER: 'synthetic',
                    DB_PASSWORD: sentinel,
                    DB_DATABASE: 'synthetic',
                    DB_ACQUIRE_TIMEOUT_MS: '5000',
                    SHUTDOWN_TIMEOUT_MS: '50'
                },
                false
            );
            await Promise.race([
                connected,
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Synthetic handshake deadline')), 2000);
                })
            ]);
            const started = Date.now();
            const records = await finish(pending, signal, 0, true);
            check(`startup-${signal}-bounded`, Date.now() - started < 1000);
            check(
                `startup-${signal}-never-listens`,
                records.every((record) => record.event !== 'listening')
            );
        } finally {
            clearTimeout(timer);
            for (const socket of sockets) socket.destroy();
            await new Promise((resolve) => blackhole.close(resolve));
        }
    }

    for (const [name, overrides, code] of [
        ['eager-db-failure', { DB_PORT: '1' }, 1],
        ['invalid-port', { PORT: '70000' }, 11],
        ['missing-explicit-file', { POMS_ENV_FILE: path.join(directory, 'absent.env') }, 11]
    ]) {
        const failure = await app(directory, base, overrides, false);
        check(name, (await waitExit(failure.child)) === code);
        const records = await finish(failure, 'SIGTERM', code);
        check(
            `${name}-no-listening`,
            records.every((record) => record.event !== 'listening')
        );
    }
    const reserved = net.createServer();
    reserved.listen(0, '127.0.0.1');
    await once(reserved, 'listening');
    try {
        const occupied = await app(directory, base, { PORT: String(reserved.address().port) }, false);
        check('occupied-port-fails', (await waitExit(occupied.child)) === 1);
        const records = await finish(occupied, 'SIGTERM', 1);
        check('occupied-port-still-owned', reserved.listening);
        check(
            'occupied-port-stage',
            records.some((record) => record.fields.stage === 'bind')
        );
    } finally {
        await new Promise((resolve) => reserved.close(resolve));
    }
    console.log(JSON.stringify({ status: 'ok', checks: assertions.length, assertions }));
} finally {
    for (const { child } of children) {
        if (child.exitCode === null && child.signalCode === null) {
            child.kill('SIGTERM');
            try {
                await waitExit(child);
            } catch {
                child.kill('SIGKILL');
                await waitExit(child);
            }
        }
    }
    await rm(directory, { recursive: true }); // Exact mkdtemp directory owned by this run.
}
