'use strict';
// Test-only SQL observation. Only fixed statement labels and SHA-256 are saved:
// never query text, parameter values, rows, connection strings or error messages.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const output = path.join(root, 'tmp/rust-r2b/nest-witness-followup-sql.jsonl');
const file = fs.openSync(output, 'wx', 0o600);
const original = Client.prototype.query;
const connectionIds = new WeakMap();
let nextConnection = 0;
let sequence = 0;
let querySequence = 0;
let failed = false;
function captureFailure() {
    failed = true;
    try {
        fs.writeSync(2, 'R2B_SQL_CAPTURE_INCOMPLETE\n');
    } catch {
        /* Query semantics must not depend on evidence I/O. */
    }
}
function describe(text) {
    const normalized = text.replaceAll('"', '').trim();
    for (const command of ['BEGIN', 'COMMIT', 'ROLLBACK']) if (new RegExp(`^${command}\\b`, 'i').test(normalized)) return command;
    for (const [command, relation] of ['SELECT', 'UPDATE', 'INSERT', 'DELETE'].flatMap((command) => ['auth_session','audit_log','role_permission_assignment','user_role_assignment','role'].map((relation) => [command, relation]))) {
        if (new RegExp(`^${command}\\b`, 'i').test(normalized) && new RegExp(`\\b${relation}\\b`, 'i').test(normalized)) return `${command} poms.${relation}`;
    }
    return 'UNRECOGNIZED';
}
function record(client, queryId, text, phase, error, result) {
    try {
        if (!connectionIds.has(client)) connectionIds.set(client, ++nextConnection);
        const statement = describe(text);
        if (statement === 'UNRECOGNIZED') captureFailure();
        fs.writeSync(
            file,
            JSON.stringify({
                sequence: ++sequence,
                queryId,
                connection: connectionIds.get(client),
                at: new Date().toISOString(),
                phase,
                statement,
                sqlSha256: createHash('sha256').update(text).digest('hex'),
                captureIncomplete: failed,
                rowCount: Number.isInteger(result?.rowCount) ? result.rowCount : null,
                code: typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : null
            }) + '\n'
        );
    } catch {
        captureFailure();
    }
}
Client.prototype.query = function (...args) {
    const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
    if (typeof text !== 'string' || !(/\b(?:auth_session|audit_log|role|role_permission_assignment|user_role_assignment)\b/i.test(text) || /^\s*(?:begin|commit|rollback)\b/i.test(text))) return original.apply(this, args);
    const queryId = ++querySequence;
    // The real MikroORM/Kysely path uses promises. Other pg public signatures
    // pass through unchanged and invalidate evidence instead of being wrapped.
    if (args.some((value) => typeof value === 'function') || typeof args[0]?.callback === 'function' || typeof args[0]?.submit === 'function') {
        captureFailure();
        record(this, queryId, text, 'unsupported');
        return original.apply(this, args);
    }
    record(this, queryId, text, 'start');
    try {
        const result = original.apply(this, args);
        if (result && typeof result.then === 'function') {
            result.then(
                (value) => {
                    record(this, queryId, text, 'end', null, value);
                },
                (error) => {
                    record(this, queryId, text, 'error', error);
                }
            );
        } else {
            captureFailure();
            record(this, queryId, text, 'unsupported');
        }
        return result;
    } catch (error) {
        record(this, queryId, text, 'error', error);
        throw error;
    }
};
