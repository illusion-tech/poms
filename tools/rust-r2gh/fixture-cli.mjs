import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { databaseFor, fail, validateAmbient, validateSource, verifyConnection } from './fixture-guard.mjs';
import { executeFixture } from './fixture-run.mjs';
const require = createRequire(import.meta.url);
const { FixtureError, parseFixtureRequest } = require('./fixture-protocol.cjs');
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');

async function stdin() {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > 16384) fail('invalid_input_size');
        chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    try {
        return parseFixtureRequest(bytes);
    } finally {
        bytes.fill(0);
        for (const chunk of chunks) chunk.fill(0);
    }
}
function secret(path, app) {
    const password = readFileSync(path, 'utf8');
    if (app ? !/^[0-9a-f]{64}$/.test(password) : password.length === 0 || password.length > 1024 || /[\r\n\0]/.test(password)) fail('secret_format');
    return password;
}
function clientFor(database, owner) {
    return new Client({
        host: '127.0.0.1',
        port: 15432,
        database,
        user: owner ? 'poms_r0e_owner' : 'poms_r2gh_app',
        password: secret(owner ? '/run/secrets/r2gh-owner-password' : '/run/secrets/r2gh-app-password', !owner),
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
        application_name: 'poms-r2gh-fixture'
    });
}
async function main() {
    if (process.platform !== 'linux' || process.argv.length !== 2) fail('unsupported_invocation');
    validateAmbient(process.env);
    const request = await stdin();
    const permissions = validateSource();
    const database = databaseFor(request.backend);
    // Owner is used exclusively for a read-only identity/marker preflight.
    const owner = clientFor(database, true);
    try {
        await owner.connect();
        await verifyConnection(owner, database, true);
    } finally {
        await owner.end();
    }
    const client = clientFor(database, false);
    try {
        await client.connect();
        await verifyConnection(client, database);
        const outcome = await executeFixture(client, request, permissions);
        process.stdout.write(`${JSON.stringify({ formatVersion: 1, runId: request.runId, backend: request.backend, action: request.action, ...outcome })}\n`);
    } finally {
        await client.end();
    }
}
// The WSL frontend being terminated does not prove its Linux descendants exit.
// Bound this command independently; disconnect rolls back any open transaction,
// and the pre-commit journal remains available to an explicit cleanup command.
const deadline = setTimeout(() => {
    process.stderr.write('{"formatVersion":1,"code":"fixture_deadline"}\n');
    process.exit(1);
}, 45000);
deadline.unref();
try {
    await main();
} catch (error) {
    // Never serialize pg errors, query arguments, stack traces or credential paths.
    process.stderr.write(`${JSON.stringify({ formatVersion: 1, code: error instanceof FixtureError ? error.code : 'fixture_failed' })}\n`);
    process.exitCode = 1;
} finally {
    clearTimeout(deadline);
}
