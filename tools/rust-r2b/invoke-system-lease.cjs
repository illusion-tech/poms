'use strict';
const { spawn } = require('node:child_process');
const { parseMessage, systemLeaseCommand, uuid, maxLeaseMs, maxMessageBytes } = require('./system-lease-protocol.cjs');

function attachLease(child, initial) {
    return new Promise((resolve, reject) => {
        let bytes = Buffer.alloc(0);
        let total = 0;
        let pending;
        let leaseId;
        let sequence = 0;
        let exited = false;
        let healthy = true;
        let diagnostic;
        let stderrBytes = Buffer.alloc(0);
        let exitResolve;
        const exit = new Promise((done) => { exitResolve = done; });
        const lifetime = setTimeout(() => stop(new Error('R2B system lease lifetime expired; preserve its journal')), maxLeaseMs + 120000);
        function stop(error) {
            healthy = false;
            if (diagnostic) {
                error.diagnostic = diagnostic;
                error.message += '; ' + diagnostic.code + ' stage=' + diagnostic.stage + ' SQLSTATE=' + diagnostic.sqlstate;
            }
            if (pending) { clearTimeout(pending.timer); pending.reject(error); pending = undefined; }
            child.stdin.end();
            reject(error);
        }
        function call(action, step) {
            if (pending || exited || !healthy) return Promise.reject(new Error('R2B system lease is unavailable'));
            const request = { ...initial, action, sequence: action === 'acquire' ? 0 : ++sequence,
                ...(action === 'acquire' ? {} : { leaseId }), ...(step ? { step } : {}) };
            parseMessage(Buffer.from(JSON.stringify(request)));
            return new Promise((done, failed) => {
                const timer = setTimeout(() => stop(new Error('R2B system lease response timed out; preserve its journal')), action === 'release' ? 120000 : 45000);
                pending = { request, resolve: done, reject: failed, timer };
                child.stdin.write(JSON.stringify(request) + '\n');
            });
        }
        function response(line) {
            if (!pending || line.length > maxMessageBytes) throw new Error('protocol');
            const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line));
            const request = pending.request;
            const expectedEvent = { acquire: 'ready', before: 'step-ready', after: 'step-complete', release: 'released' }[request.action];
            if (value.formatVersion !== 1 || value.runId !== initial.runId || value.backend !== initial.backend ||
                value.sequence !== request.sequence || value.action !== request.action || value.event !== expectedEvent ||
                !uuid.test(value.leaseId) || (leaseId && value.leaseId !== leaseId)) throw new Error('protocol');
            const allowed = ['formatVersion','runId','backend','sequence','action','event','leaseId'];
            if (request.action === 'acquire') {
                allowed.push('actorId','roles');
                if (!uuid.test(value.actorId) || !Array.isArray(value.roles) || value.roles.length !== 2 ||
                    value.roles[0].key !== 'platform-admin' || value.roles[0].id !== '30000000-0000-4000-8000-000000000001' ||
                    value.roles[1].key !== 'project-viewer' || value.roles[1].id !== '30000000-0000-4000-8000-000000000002') throw new Error('protocol');
                leaseId = value.leaseId;
            } else if (request.action === 'before') {
                allowed.push('step','roleId','eventType','expectedStatus','request');
                if (value.step !== request.step || !['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'].includes(value.roleId) ||
                    ![200,409].includes(value.expectedStatus) || !value.request || !['PATCH','POST','PUT'].includes(value.request.method) ||
                    typeof value.request.path !== 'string' || !value.request.path.startsWith('/api/platform/roles/' + value.roleId)) throw new Error('protocol');
            } else if (request.action === 'after') {
                allowed.push('step','auditId');
                if (value.step !== request.step || !uuid.test(value.auditId)) throw new Error('protocol');
            } else {
                allowed.push('restored','completed');
                if (value.restored !== true || !Number.isSafeInteger(value.completed) || value.completed < 0) throw new Error('protocol');
            }
            if (Object.keys(value).sort().join(',') !== allowed.sort().join(',')) throw new Error('protocol');
            const done = pending; pending = undefined; clearTimeout(done.timer); done.resolve(value);
        }
        child.stdout.on('data', (chunk) => {
            total += chunk.length;
            if (total > 2 * 1024 * 1024) { stop(new Error('R2B system lease exceeded output limit')); return; }
            bytes = Buffer.concat([bytes,chunk]);
            let newline = bytes.indexOf(10);
            try {
                while (newline !== -1) {
                    const line = bytes.subarray(0,newline); bytes = bytes.subarray(newline + 1);
                    response(line);
                    newline = bytes.indexOf(10);
                }
                if (bytes.length > maxMessageBytes) throw new Error('protocol');
            } catch { stop(new Error('R2B system lease returned invalid protocol output')); }
        });
        // Only this exact bounded static diagnostic shape may leave stderr.
        // Raw PostgreSQL messages, paths, queries and transport logs are ignored.
        child.stderr.on('data', (chunk) => {
            stderrBytes = Buffer.concat([stderrBytes,chunk]);
            if (stderrBytes.length > maxMessageBytes) { stderrBytes = Buffer.alloc(0); return; }
            let newline = stderrBytes.indexOf(10);
            while (newline !== -1) {
                const line = stderrBytes.subarray(0,newline); stderrBytes = stderrBytes.subarray(newline + 1);
                try {
                    const value = JSON.parse(new TextDecoder('utf-8', { fatal:true }).decode(line));
                    if (Object.keys(value).sort().join(',') === 'code,formatVersion,sqlstate,stage' && value.formatVersion === 1 &&
                        typeof value.code === 'string' && /^system_lease_[a-z_]{1,80}$/.test(value.code) &&
                        (value.stage === null || (typeof value.stage === 'string' && /^[a-z_]{1,40}$/.test(value.stage))) &&
                        (value.sqlstate === null || (typeof value.sqlstate === 'string' && /^[0-9A-Z]{5}$/.test(value.sqlstate)))) diagnostic = value;
                } catch { /* Untrusted transport output is never reflected. */ }
                newline = stderrBytes.indexOf(10);
            }
        });
        child.on('error', () => stop(new Error('R2B system lease could not start')));
        child.stdin.on('error', () => stop(new Error('R2B system lease stdin failed')));
        child.on('close', (code) => {
            exited = true; clearTimeout(lifetime);
            if (pending) stop(new Error('R2B system lease exited before acknowledgement; preserve its journal'));
            exitResolve(code);
        });
        call('acquire').then((ready) => {
            resolve(Object.freeze({
                ready,
                assertAlive() { if (!healthy || exited) throw new Error('R2B system lease is no longer alive'); },
                before(step) { return call('before', step); },
                after(step) { return call('after', step); },
                async release() {
                    const released = await call('release');
                    child.stdin.end();
                    const code = await exit;
                    if (code !== 0 || !healthy) throw new Error('R2B system lease restoration did not end successfully');
                    return released;
                }
            }));
        }, reject);
    });
}
function acquireSystemLease(request) {
    if (!request || Object.keys(request).sort().join(',') !== 'backend,formatVersion,runId') return Promise.reject(new Error('R2B system lease request is invalid'));
    const initial = parseMessage(Buffer.from(JSON.stringify({ ...request, action: 'acquire', sequence: 0 })));
    const command = systemLeaseCommand();
    const child = spawn(command.executable, command.args, {
        cwd: command.cwd, env: command.env, shell: false, windowsHide: true, stdio: ['pipe','pipe','pipe']
    });
    return attachLease(child, initial);
}
module.exports = { acquireSystemLease, attachLease };
