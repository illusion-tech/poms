// Offline provenance by default; explicit --execute is controlled PG15 only.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { MikroORM } from '@mikro-orm/postgresql';
import { format } from 'prettier';
import { createServices, entities, provenance, read, root, sha, sourceGuardTests } from './session-source.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const mode = process.argv[2] ?? '--check';
assert(process.argv.length <= 3 && ['--check', '--write', '--execute'].includes(mode), 'Usage: session-bridge.mjs --check|--write|--execute');
const manifestFile = 'tools/rust-r1c/session-source.json';
const artifact = { ...provenance(), generatorManifest: ['tools/rust-r1c/session-source.mjs', 'tools/rust-r1c/session-bridge.mjs'].map((file) => ({ file, sha256: sha(read(file)) })) };
sourceGuardTests();
const text = await format(JSON.stringify(artifact), { ...JSON.parse(read('.prettierrc.json')), parser: 'json', endOfLine: 'lf' });
if (mode === '--write') writeFileSync(path.join(root, manifestFile), text, 'utf8');
else assert.equal(read(manifestFile), text, 'Original session source/provenance changed; review before explicit regeneration');
if (mode !== '--execute') {
    console.log(JSON.stringify({ result: 'pass', mode, sourceManifestSha256: artifact.sourceManifestSha256, entities: Object.keys(entities).length, platformMethods: artifact.excerpts.length, manifestSha256: sha(text), database: false }));
} else {
    let orm;
    let phase = 'input-guard';
    try {
        assert.equal(process.env.POMS_R1C_DATABASE_TEST, '1', 'Controlled R1C opt-in is required');
        assert(!Object.hasOwn(process.env, 'PGOPTIONS'), 'Inherited PGOPTIONS is rejected');
        assert(!Object.keys(process.env).some((key) => key.startsWith('MIKRO_ORM_')), 'Inherited MikroORM environment overrides are rejected');
        const raw = process.env.POMS_R1C_DATABASE_TEST_URL;
        const match = /^postgres:\/\/poms_r1c_app:([0-9a-f]{64})@127\.0\.0\.1:15432\/(poms_r1c_(?:nest|rust))$/.exec(raw ?? '');
        assert(match, 'Controlled URL must identify a dedicated R1C app database');
        const database = match[2];
        const connection = { host: '127.0.0.1', port: 15432, user: 'poms_r1c_app', password: match[1], database, ssl: false, connectionTimeoutMillis: 5000, application_name: 'poms-r1c-original-session-bridge' };
        const input = JSON.parse(readFileSync(0, 'utf8'));
        assert(['create', 'resolve', 'rotate', 'revoke', 'profile', 'verify'].includes(input.action), 'Unapproved original-service action');
        const client = new Client(connection);
        phase = 'server-identity-guard';
        await client.connect();
        try {
            const {
                rows: [row]
            } = await client.query(`SELECT current_database() AS database_name, current_setting('server_version_num') AS version,
                current_setting('port') AS port,current_setting('poms.r0e_isolated',true) AS isolated,
                session_user::text AS session_name,current_user::text AS current_name,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,
                (SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS role_memberships,
                pg_has_role(current_user,'poms_r0e_owner','MEMBER') AS owner_member,has_schema_privilege(current_user,'poms','CREATE') AS schema_create
                FROM pg_roles r WHERE r.rolname=current_user`);
            assert.deepEqual(row, {
                database_name: database,
                version: '150012',
                port: '15432',
                isolated: 'on',
                session_name: 'poms_r1c_app',
                current_name: 'poms_r1c_app',
                rolsuper: false,
                rolcreatedb: false,
                rolcreaterole: false,
                rolbypassrls: false,
                rolreplication: false,
                role_memberships: 0,
                owner_member: false,
                schema_create: false
            });
        } finally {
            await client.end();
        }
        phase = 'original-entity-discovery';
        orm = await MikroORM.init({
            host: connection.host,
            port: connection.port,
            user: connection.user,
            password: connection.password,
            dbName: database,
            schema: 'poms',
            entities: Object.values(entities),
            ensureDatabase: false,
            debug: false,
            logger: () => undefined,
            driverOptions: { ssl: false, statement_timeout: 5000, connectionTimeoutMillis: 5000, options: '-c timezone=Etc/GMT-8 -c search_path=poms,public' },
            pool: { min: 0, max: 2 }
        });
        const [metadata] = await orm.em.getConnection().execute(`SELECT current_database() AS database_name,current_user::text AS role,
            current_setting('TimeZone') AS timezone,current_setting('search_path') AS search_path,r.rolreplication,
            (SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS role_memberships
            FROM pg_roles r WHERE r.rolname=current_user`);
        assert.deepEqual(metadata, { database_name: database, role: 'poms_r1c_app', timezone: 'Etc/GMT-8', search_path: 'poms,public', rolreplication: false, role_memberships: 0 });
        const { session, platform } = createServices(orm.em.fork());
        const options = { now: new Date(input.now ?? '2026-05-13T01:00:00.000Z'), idleTimeoutSeconds: input.idle ?? 900, absoluteTimeoutSeconds: input.absolute ?? 28800, lastSeenThrottleSeconds: input.throttle ?? 60 };
        assert(Number.isFinite(options.now.getTime()), 'Explicit lifecycle date is invalid');
        const info = input.info ?? {};
        phase = `original-${input.action}`;
        let result;
        if (input.action === 'create') result = await session.createSession(input.userId, info, options);
        if (input.action === 'resolve') result = await session.resolveSessionToken(input.token, info, options);
        if (input.action === 'rotate') result = await session.refreshCsrfToken(input.token, info, options);
        if (input.action === 'revoke') result = { revoked: await session.revokeSessionToken(input.token, input.reason, options) };
        if (input.action === 'profile') result = await platform.getSanitizedUserProfile(input.userId, input.fallback);
        if (input.action === 'verify') result = await platform.verifyCredentials(input.username, String.fromCharCode(...input.passwordUnits));
        // These are public, disposable acceptance tokens. Do not emit stored
        // credential/session/CSRF hashes, raw driver errors or URL values.
        const safe = JSON.parse(JSON.stringify(result, (key, value) => (/^(?:tokenHash|csrfTokenHash|passwordHash)$/.test(key) ? undefined : value)));
        console.log(JSON.stringify({ result: 'pass', database, sourceManifestSha256: artifact.sourceManifestSha256, value: safe }));
    } catch (error) {
        const code = error?.code;
        if (['session_missing', 'session_expired', 'session_revoked', 'account_disabled'].includes(code)) {
            console.log(JSON.stringify({ result: 'domain-error', code }));
        } else {
            console.error(JSON.stringify({ result: 'failed', phase, category: error?.constructor?.name ?? 'Error', sqlstate: typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined }));
            process.exitCode = 1;
        }
    } finally {
        if (orm) await orm.close(true);
    }
}
