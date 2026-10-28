import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { FixtureError } = require('./fixture-protocol.cjs');
export const root = fileURLToPath(new URL('../../', import.meta.url));
export const sourceHead = '126ede22bb4b379ae656ccde9cee9d82da383be4';
export const marker = 'd668d8df-b350-4d4d-8b70-dc7866a1d5f9';
const manifestPath = 'tools/rust-r1b/shared-manifest.json';
const manifestHash = '63ed639af64b2f0422cc955cfda4514758bed1da3841ba5f4a11076886cdb419';
export function fail(code) {
    throw new FixtureError(code);
}
export function validateAmbient(env) {
    if (Object.keys(env).some((key) => /^(?:PG|DB_|MIKRO_)/i.test(key) || /^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/i.test(key))) fail('ambient_override');
}
export function validateSource(run = execFileSync, read = readFileSync) {
    const paths = ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'pnpm-lock.yaml', 'package.json', manifestPath];
    for (const args of [
        ['diff', sourceHead, '--', ...paths],
        ['diff', '--cached', sourceHead, '--', ...paths],
        ['ls-files', '--others', '--exclude-standard', '--', ...paths]
    ])
        if (run('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 }) !== '') fail('source_drift');
    const text = read(new URL('../../tools/rust-r1b/shared-manifest.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    if (createHash('sha256').update(text).digest('hex') !== manifestHash) fail('manifest_drift');
    const permissions = JSON.parse(text).declarations.find((value) => value.name === 'PERMISSION_KEYS')?.value;
    if (!Array.isArray(permissions) || permissions.length !== 37 || new Set(permissions).size !== 37 || permissions.some((value) => typeof value !== 'string') || !permissions.includes('project:read')) fail('manifest_shape');
    return Object.freeze([...permissions]);
}
export function databaseFor(backend) {
    if (!['nest', 'rust'].includes(backend)) fail('invalid_backend');
    return `poms_r2gh_${backend}`;
}
export function validateCluster(row, database, owner) {
    if (!['poms_r2gh_nest', 'poms_r2gh_rust'].includes(database)) fail('invalid_database');
    const user = owner ? 'poms_r0e_owner' : 'poms_r2gh_app';
    if (!row || row.database !== database || row.session_user !== user || row.current_user !== user || row.version !== '150012' || row.port !== '15432' || row.isolated !== 'on' || row.database_owner !== 'poms_r0e_owner') fail('database_identity');
}
export function validateRuntime(row, database) {
    validateCluster(row, database, false);
    if (['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolbypassrls', 'rolreplication', 'schema_create', 'public_schema_create', 'database_create', 'marker_access'].some((key) => row[key] !== false) || row.role_memberships !== 0)
        fail('runtime_privilege');
}
export function validateMarker(rows, database) {
    if (rows.length !== 1 || rows[0].database !== database || rows[0].marker !== marker) fail('instance_marker');
}
export const metadataSql = `select current_database() as database, session_user::text, current_user::text,
    current_setting('server_version_num') as version, current_setting('port') as port,
    current_setting('poms.r0e_isolated', true) as isolated,
    pg_get_userbyid(d.datdba) as database_owner,
    r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls, r.rolreplication,
    (select count(*)::int from pg_auth_members m where m.member=r.oid) as role_memberships,
    has_schema_privilege(current_user,'poms','CREATE') as schema_create,
    has_schema_privilege(current_user,'public','CREATE') as public_schema_create,
    has_database_privilege(current_user,current_database(),'CREATE') as database_create,
    has_schema_privilege(current_user,'r2gh_control','USAGE') as marker_access
    from pg_roles r join pg_database d on d.datname=current_database() where r.rolname=current_user`;
export async function verifyConnection(client, database, owner = false) {
    await client.query('BEGIN READ ONLY');
    try {
        const result = await client.query(metadataSql);
        if (result.rows.length !== 1) fail('database_identity');
        if (owner) {
            validateCluster(result.rows[0], database, true);
            const found = await client.query('select current_database() as database, instance_id::text as marker from r2gh_control.marker where database_name=current_database()');
            validateMarker(found.rows, database);
        } else validateRuntime(result.rows[0], database);
    } finally {
        await client.query('ROLLBACK');
    }
}
