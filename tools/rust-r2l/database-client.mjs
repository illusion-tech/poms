import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { lstatSync, readFileSync } from 'node:fs';
import { databaseFor, verifyConnection, validateSource } from './fixture-guard.mjs';
const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
export const privateRoot = '/home/wangzishi/.local/share/poms-r2l/private';
export function regularPrivate(file) {
    const stat = lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'Private file identity/mode');
    return readFileSync(file, 'utf8');
}
export function managed(backend) {
    assert(['nest', 'rust'].includes(backend));
    return loadManagedEnvironment({ mode: 'managed-' + backend, env: { ...process.env, POMS_ENV_FILE: privateRoot + '/' + backend + '.env' } });
}
export async function databaseClient(backend) {
    assert.equal(process.platform, 'linux');
    validateSource();
    const database = databaseFor(backend);
    // This owner connection is only a read-only marker and metadata check.
    const owner = new Client({ host: '127.0.0.1', port: 19432, database, user: 'poms_r0e_owner', password: regularPrivate('/home/wangzishi/.local/share/poms-r2l/private/owner-password'), connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2l-marker-readonly' });
    try { await owner.connect(); await verifyConnection(owner, database, true); }
    finally { await owner.end(); }
    const env = managed(backend).childEnv;
    const client = new Client({ host: '127.0.0.1', port: 19432, database, user: 'poms_r2l_app', password: env.DB_PASSWORD, connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2l-owned-fixture' });
    try { await client.connect(); await verifyConnection(client, database); return client; }
    catch (error) { await client.end(); throw error; }
}
