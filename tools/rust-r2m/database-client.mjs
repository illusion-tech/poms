import { readPrivateRegular } from './audit-private.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { lstatSync, readFileSync } from 'node:fs';
import { databaseFor, verifyConnection, validateSource, validateAmbient } from './fixture-guard.mjs';
const require = createRequire(import.meta.url);
function clientType() { return createRequire(require.resolve('@mikro-orm/postgresql'))('pg').Client; }
const { loadManagedEnvironment } = require('./managed-environment.cjs');
export const privateRoot = '/home/wangzishi/.local/share/poms-r2m/private';
export function regularPrivate(file) { return readPrivateRegular(file, {kind: 'owner'}); }
export function managed(backend) {
    assert(['nest', 'rust'].includes(backend));
    return loadManagedEnvironment({ mode: 'managed-' + backend, env: { ...process.env, POMS_ENV_FILE: privateRoot + '/' + backend + '.env' } });
}
export async function databaseClient(backend) {
    assert.equal(process.platform, 'linux');
    validateAmbient(process.env);
    validateSource();
    const database = databaseFor(backend);
    // This owner connection is only a read-only marker and metadata check.
    const Client = clientType();
    const owner = new Client({ host: '127.0.0.1', port: 20432, database, user: 'poms_r0e_owner', password: regularPrivate('/home/wangzishi/.local/share/poms-r2m/private/owner-password'), connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2m-marker-readonly' });
    try { await owner.connect(); await verifyConnection(owner, database, true); }
    finally { await owner.end(); }
    const env = managed(backend).childEnv;
    const client = new Client({ host: '127.0.0.1', port: 20432, database, user: 'poms_r2m_app', password: env.DB_PASSWORD, connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2m-owned-fixture' });
    try { await client.connect(); await verifyConnection(client, database); return client; }
    catch (error) { await client.end(); throw error; }
}
