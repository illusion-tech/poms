import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import { databaseFor, validateAmbient, validateSource, verifyConnection } from './fixture-guard.mjs';
import { journalStore } from './fixture-journal.mjs';
import { equal, fail, planStep, seedRoles, validateStepResult } from './system-lease-model.mjs';
import { initializeSession, leaseStore, restoreLease, snapshot } from './system-lease-storage.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const { maxLeaseMs, maxMessageBytes, parseMessage } = require('./system-lease-protocol.cjs');
const lockKey = Object.freeze([0x523242, 0x535953]);
const authorityHash = 'd66d844f9706b67081fbba69d52b3215887119db1145d23d7cdf35cd052de6a3';
function readAuthority(permissions) {
    const text = readFileSync(new URL('./roles-authority.json', import.meta.url), 'utf8').replaceAll('\r\n','\n');
    if (createHash('sha256').update(text).digest('hex') !== authorityHash) fail('system_lease_authority');
    const value = JSON.parse(text);
    if (!equal(value.permissions.map((item) => item.key), permissions) ||
        !equal(value.minimumPermissions['platform-admin'], permissions) ||
        value.minimumPermissions['project-viewer'].length !== 6) fail('system_lease_authority');
    return value;
}
function secret(path, app) {
    const value = readFileSync(path, 'utf8');
    if (app ? !/^[0-9a-f]{64}$/.test(value) : value.length < 1 || value.length > 1024 || /[\r\n\0]/.test(value)) fail('system_lease_secret');
    return value;
}
function clientFor(database, owner) {
    return new Client({
        host: '127.0.0.1', port: 15432, database,
        user: owner ? 'poms_r0e_owner' : 'poms_r2b_app',
        password: secret(owner ? '/run/secrets/r2b-owner-password' : '/run/secrets/r2b-app-password', !owner),
        connectionTimeoutMillis: 5000, query_timeout: 10000,
        application_name: owner ? 'poms-r2b-system-restore' : 'poms-r2b-system-lease'
    });
}
function backendStopped(backend) {
    return new Promise((resolve) => {
        const socket = createConnection({ host: '127.0.0.1', port: backend === 'nest' ? 5100 : 5101 });
        let settled = false;
        const finish = (value) => { if (!settled) { settled = true; socket.destroy(); resolve(value); } };
        socket.setTimeout(1000, () => finish(false));
        socket.on('connect', () => finish(false));
        socket.on('error', (error) => finish(error.code === 'ECONNREFUSED'));
    });
}
function inputQueue() {
    const pending = [];
    const waiting = [];
    let bytes = Buffer.alloc(0);
    let ended = false;
    function put(value) {
        if (ended) return;
        if (value.stop) ended = true;
        if (waiting.length) waiting.shift()(value); else pending.push(value);
    }
    process.stdin.on('data', (chunk) => {
        if (ended) return;
        bytes = Buffer.concat([bytes, chunk]);
        let newline = bytes.indexOf(10);
        while (newline !== -1) {
            const line = bytes.subarray(0,newline);
            bytes = bytes.subarray(newline + 1);
            try { put({ message: parseMessage(line) }); }
            catch { put({ stop: 'protocol-error' }); process.stdin.pause(); return; }
            newline = bytes.indexOf(10);
        }
        if (bytes.length > maxMessageBytes) { put({ stop: 'protocol-error' }); process.stdin.pause(); }
    });
    process.stdin.on('end', () => put({ stop: bytes.length ? 'protocol-error' : 'eof' }));
    process.stdin.on('error', () => put({ stop: 'stdin-error' }));
    return { put, next: () => pending.length ? Promise.resolve(pending.shift()) : new Promise((resolve) => waiting.push(resolve)) };
}
function reply(request, event, extra = {}) {
    process.stdout.write(JSON.stringify({
        formatVersion: 1, runId: request.runId, backend: request.backend,
        sequence: request.sequence, action: request.action, event, ...extra
    }) + '\n');
}
export async function runWorker() {
    if (process.platform !== 'linux' || process.argv.length !== 2) fail('system_lease_invocation');
    validateAmbient(process.env);
    const permissions = validateSource();
    const authority = readAuthority(permissions);
    const queue = inputQueue();
    const acquireTimer = setTimeout(() => queue.put({ stop: 'acquire-deadline' }), 30000);
    let timer; let hardTimer; let client; let owner; let record; let store; let database; let locked = false;
    const stop = () => queue.put({ stop: 'signal' });
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
    async function recover(value) {
        if (!value || value.state === 'restored') return;
        if (!locked) fail('system_lease_lock_lost');
        await restoreLease(owner, store, value, authority, { backendStopped: await backendStopped(value.backend) });
    }
    try {
        const first = await queue.next();
        clearTimeout(acquireTimer);
        if (!first.message || first.message.action !== 'acquire') fail('system_lease_protocol');
        const request = first.message;
        database = databaseFor(request.backend);
        owner = clientFor(database, true);
        await owner.connect(); await verifyConnection(owner, database, true);
        await initializeSession(owner);
        await owner.query("SET lock_timeout='5s'");
        owner.on('error', () => { locked = false; queue.put({ stop: 'connection-error' }); });
        client = clientFor(database, false);
        await client.connect(); await verifyConnection(client, database);
        await initializeSession(client);
        client.on('error', () => queue.put({ stop: 'connection-error' }));
        const lock = await owner.query('select pg_try_advisory_lock($1::int,$2::int) as locked', lockKey);
        if (lock.rows.length !== 1 || lock.rows[0].locked !== true) fail('system_lease_busy');
        locked = true;
        store = leaseStore(request.backend);
        // Recover under the same continuous lock before any new snapshot/ready.
        await recover(store.active());
        const ordinary = journalStore({ runId: request.runId, backend: request.backend }).read();
        if (!ordinary || ordinary.state !== 'prepared') fail('system_lease_actor');
        const actor = ordinary.accounts.find((account) => account.account === 'admin');
        const found = await client.query('select id::text,username,is_active from poms.platform_user where id=$1', [actor.userId]);
        if (found.rows.length !== 1 || found.rows[0].username !== actor.username || found.rows[0].is_active !== true) fail('system_lease_actor');
        const base = await snapshot(client);
        const createdAt = new Date().toISOString();
        record = {
            formatVersion: 1, backend: request.backend, runId: request.runId, leaseId: randomUUID(),
            actorId: actor.userId, sourceHead: '9734515f84ebe1a4833d207124adbfbe378f691f',
            state: 'active', base, authorized: structuredClone(base), pending: null, completed: [],
            createdAt, deadlineAt: new Date(Date.parse(createdAt) + maxLeaseMs).toISOString()
        };
        // Snapshot COMMIT precedes sidecar fsync; ready follows both fsyncs.
        store.create(record);
        timer = setTimeout(() => queue.put({ stop: 'lease-deadline' }), maxLeaseMs);
        hardTimer = setTimeout(() => {
            process.stderr.write('{"formatVersion":1,"code":"system_lease_restore_deadline"}\n');
            process.exit(1);
        }, maxLeaseMs + 120000);
        let sequence = 0;
        reply(request, 'ready', { leaseId: record.leaseId, actorId: record.actorId, roles: seedRoles });
        for (;;) {
            const item = await queue.next();
            if (item.stop) {
                if (item.stop === 'protocol-error' || item.stop === 'stdin-error') fail('system_lease_protocol');
                await recover(record);
                if (item.stop === 'connection-error' || item.stop === 'lease-deadline') fail('system_lease_lifecycle');
                return;
            }
            const message = item.message;
            if (message.action === 'acquire' || message.runId !== record.runId || message.backend !== record.backend ||
                message.leaseId !== record.leaseId || message.sequence !== ++sequence) fail('system_lease_protocol');
            if (message.action === 'before') {
                if (record.pending || record.completed.length >= 64) fail('system_lease_state');
                const current = await snapshot(client);
                if (!equal(current, record.authorized)) fail();
                const plan = planStep(message.step, record, authority);
                record.pending = { step: message.step, startedAt: new Date().toISOString() };
                store.write(record);
                reply(message, 'step-ready', { leaseId: record.leaseId, step: message.step, ...plan });
            } else if (message.action === 'after') {
                if (record.pending?.step !== message.step) fail('system_lease_state');
                const current = await snapshot(client);
                const auditId = validateStepResult(record, current, authority);
                record.completed.push({ step: message.step, auditId });
                record.authorized = current; record.pending = null;
                store.write(record);
                reply(message, 'step-complete', { leaseId: record.leaseId, step: message.step, auditId });
            } else {
                await recover(record);
                await owner.query('select pg_advisory_unlock($1::int,$2::int)', lockKey);
                locked = false;
                await client.end(); client = undefined;
                await owner.end(); owner = undefined;
                reply(message, 'released', { leaseId: record.leaseId, restored: true, completed: record.completed.length });
                return;
            }
        }
    } finally {
        try {
            if (record && record.state !== 'restored') await recover(record);
        } finally {
            try { if (client) await client.end(); }
            finally {
                try {
                    if (owner) {
                        try { if (locked) await owner.query('select pg_advisory_unlock($1::int,$2::int)', lockKey); }
                        finally { await owner.end(); }
                    }
                } finally {
                    clearTimeout(acquireTimer); clearTimeout(timer); clearTimeout(hardTimer);
                    process.off('SIGTERM', stop); process.off('SIGINT', stop);
                }
            }
        }
    }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try { await runWorker(); }
    catch (error) {
        const code = typeof error.message === 'string' && /^system_lease_[a-z_]+$/.test(error.message) ? error.message : 'system_lease_failed';
        const stage = typeof error.systemLeaseStage === 'string' && /^[a-z_]{1,40}$/.test(error.systemLeaseStage) ? error.systemLeaseStage : null;
        const sqlstate = typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : null;
        process.stderr.write(JSON.stringify({ formatVersion: 1, code, stage, sqlstate }) + '\n');
        process.exitCode = 1;
    }
}
