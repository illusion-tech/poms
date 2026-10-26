import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { MikroORM } from '@mikro-orm/postgresql';
import { Migrator, Migration } from '@mikro-orm/migrations';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const mode = process.argv[2] ?? 'status';
let phase = 'startup';
assert(process.argv.length <= 3 && ['provision', 'status', 'migrate', 'catalog', 'env', 'seed'].includes(mode));
const root = resolve(import.meta.dirname, '../..');
const sourceHead = '19f837c9e33fe9cdeb7ca94f3c932c9621cb91d3';
const databases = ['poms_r2a_nest', 'poms_r2a_rust'];
const marker = '178684c0-41b5-4ed7-bdbb-3386b39e0e61';
assert(!Object.keys(process.env).some((key) => /^(?:PG|DB_|MIKRO_)/i.test(key) || /^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/i.test(key)), 'Ambient database/process override is forbidden');
const ownerPassword = readFileSync('/run/secrets/r2a-owner-password', 'utf8');
const appPassword = readFileSync('/run/secrets/r2a-app-password', 'utf8');
assert(ownerPassword.length > 0 && ownerPassword.length <= 1024 && !/[\r\n\0]/.test(ownerPassword), 'Owner secret format mismatch');
function validateAppSecret(value) {
    if (!/^[0-9a-f]{64}$/.test(value)) throw new Error('R2A secret format mismatch');
}
validateAppSecret(appPassword);
function connection(database, app = false) {
    assert(databases.includes(database) || (!app && database === 'postgres'), 'Invalid R2A database');
    return {
        host: '127.0.0.1',
        port: 15432,
        database,
        user: app ? 'poms_r2a_app' : 'poms_r0e_owner',
        password: app ? appPassword : ownerPassword,
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
        application_name: 'poms-r2a-controlled-validation'
    };
}
async function withClient(database, callback, app = false) {
    const client = new Client(connection(database, app));
    await client.connect();
    try {
        return await callback(client);
    } finally {
        await client.end();
    }
}
async function verifyCluster(client) {
    const {
        rows: [row]
    } = await client.query(`select current_database() as database,session_user as session_username,current_user as username,
        current_setting('server_version_num') as version, current_setting('port') as port,
        current_setting('poms.r0e_isolated', true) as isolated`);
    assert(row && ['postgres', ...databases].includes(row.database), 'Unexpected database');
    assert.deepEqual(row, { database: row.database, session_username: 'poms_r0e_owner', username: 'poms_r0e_owner', version: '150012', port: '15432', isolated: 'on' });
}
async function verifyDatabase(client, database) {
    assert(databases.includes(database));
    await verifyCluster(client);
    await client.query('BEGIN READ ONLY');
    try {
        const { rows } = await client.query(`select current_database() as database, instance_id::text as marker,
            pg_get_userbyid(d.datdba) as owner from r2a_control.marker m
            join pg_database d on d.datname=current_database() where m.database_name=current_database()`);
        assert.deepEqual(rows, [{ database, marker, owner: 'poms_r0e_owner' }]);
    } finally {
        await client.query('ROLLBACK');
    }
}
async function provision() {
    await withClient('postgres', async (client) => {
        await verifyCluster(client);
        const role = await client.query(`select rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolreplication,
            (select count(*)::int from pg_auth_members m where m.member=r.oid) as role_memberships
            from pg_roles r where rolname='poms_r2a_app'`);
        if (!role.rowCount) {
            // The password is constrained to random hex; it is never logged.
            await client.query(`create role poms_r2a_app login password '${appPassword}' nosuperuser nocreatedb nocreaterole nobypassrls noreplication`);
        } else assert.deepEqual(role.rows[0], { rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolbypassrls: false, rolreplication: false, role_memberships: 0 });
        for (const database of databases) {
            const exists = await client.query('select 1 from pg_database where datname=$1', [database]);
            if (exists.rowCount) {
                await withClient(database, (c) => verifyDatabase(c, database));
                continue;
            }
            await client.query(`create database "${database}" owner poms_r0e_owner encoding 'UTF8' lc_collate 'en_US.UTF-8' lc_ctype 'en_US.UTF-8' template template0`);
            await client.query(`revoke all on database "${database}" from public`);
            await client.query(`grant connect, temporary on database "${database}" to poms_r2a_app`);
            await withClient(database, async (c) => {
                await c.query(`begin;
                    revoke create on schema public from public;
                    create schema poms authorization poms_r0e_owner;
                    create schema r2a_control authorization poms_r0e_owner;
                    create extension pgcrypto with schema public version '1.3';
                    create extension btree_gist with schema public version '1.7';
                    create table r2a_control.marker(database_name text primary key, instance_id uuid not null, created_at timestamptz not null default now());`);
                await c.query('insert into r2a_control.marker(database_name,instance_id) values ($1,$2)', [database, marker]);
                await c.query(`grant usage on schema public, poms to poms_r2a_app;
                    alter default privileges for role poms_r0e_owner in schema poms grant select,insert,update,delete on tables to poms_r2a_app;
                    alter default privileges for role poms_r0e_owner in schema poms grant usage,select on sequences to poms_r2a_app;
                    commit`);
            });
        }
        await client.query(`alter role poms_r2a_app set search_path=poms,public`);
        await client.query(`alter role poms_r2a_app set timezone='Etc/GMT-8'`);
    });
}
function migrations() {
    const inputPaths = ['apps/poms-api/src/migrations', 'pnpm-lock.yaml', 'package.json'];
    for (const args of [
        ['diff', sourceHead, '--', ...inputPaths],
        ['diff', '--cached', sourceHead, '--', ...inputPaths],
        ['ls-files', '--others', '--exclude-standard', '--', ...inputPaths]
    ]) {
        assert.equal(execFileSync('git', args, { cwd: root, encoding: 'utf8' }), '', 'Migration source changed after freeze');
    }
    const directory = resolve(root, inputPaths[0]);
    const files = readdirSync(directory)
        .filter((name) => /^Migration.*\.ts$/.test(name))
        .sort();
    assert.equal(files.length, 92);
    const hashes = [];
    const list = files.map((name) => {
        const source = readFileSync(resolve(directory, name), 'utf8').replace(/\r\n/g, '\n');
        hashes.push({ name, sha256: createHash('sha256').update(source).digest('hex') });
        const module = { exports: {} };
        const context = vm.createContext({
            module,
            exports: module.exports,
            require: (dependency) => {
                assert.equal(dependency, '@mikro-orm/migrations');
                return { Migration };
            }
        });
        const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
        vm.runInContext(compiled.outputText, context, { filename: name, timeout: 5000 });
        const classes = Object.values(module.exports);
        assert.equal(classes.length, 1);
        return { name: name.slice(0, -3), class: classes[0] };
    });
    return { list, hashes };
}

function writeEnvironments() {
    const secretPath = '/r2a-private/jwt-secret';
    if (!existsSync(secretPath)) writeFileSync(secretPath, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
    const jwtSecret = readFileSync(secretPath, 'utf8');
    assert(/^[0-9a-f]{64}$/.test(jwtSecret), 'Invalid R2A private JWT secret format');
    for (const [index, backend] of ['nest', 'rust'].entries()) {
        const target = `/r2a-private/${backend}.env`;
        const content = `NODE_ENV=test\nHOST=127.0.0.1\nPORT=${5100 + index}\nDB_CONNECT=true\nDB_HOST=127.0.0.1\nDB_PORT=15432\nDB_DATABASE=poms_r2a_${backend}\nDB_USER=poms_r2a_app\nDB_PASSWORD=${appPassword}\nDB_SCHEMA=poms\nJWT_SECRET=${jwtSecret}\nCORS_ORIGIN=http://127.0.0.1:5200\n`;
        if (existsSync(target)) assert.equal(readFileSync(target, 'utf8') === content, true, 'Existing R2A environment differs; inspect instead of overwrite');
        else writeFileSync(target, content, { mode: 0o600, flag: 'wx' });
    }
    console.log(JSON.stringify({ operation: 'env', backends: ['nest', 'rust'], credentialsLogged: false }));
}

async function seed() {
    const inputs = ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'pnpm-lock.yaml', 'package.json'];
    for (const args of [
        ['diff', sourceHead, '--', ...inputs],
        ['diff', '--cached', sourceHead, '--', ...inputs],
        ['ls-files', '--others', '--exclude-standard', '--', ...inputs]
    ]) {
        const diff = execFileSync('git', args, { cwd: root, encoding: 'utf8' });
        assert.equal(diff, '', 'Original seeder or fixture inputs changed after freeze');
    }
    const { loadManagedEnvironment } = require('./managed-environment.cjs');
    for (const backend of ['nest', 'rust']) {
        const database = `poms_r2a_${backend}`;
        await withClient(database, async (client) => {
            await verifyCluster(client);
            await verifyDatabase(client, database);
            const {
                rows: [row]
            } = await client.query('select count(*)::int as count from poms.poms_migrations');
            assert.equal(row.count, 92, 'Seed requires all historical migrations');
        });
        const { childEnv } = loadManagedEnvironment({ mode: `managed-${backend}`, env: { ...process.env, POMS_ENV_FILE: `/r2a-private/${backend}.env` }, cwd: root });
        const log = openSync(`/r2a-private/seed-${backend}.log`, 'a', 0o600);
        try {
            execFileSync(process.execPath, [resolve(root, 'node_modules/@mikro-orm/cli/cli.js'), 'seeder:run', '--config', 'apps/poms-api/src/mikro-orm.config.ts'], {
                cwd: root,
                env: { ...childEnv, MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json' },
                stdio: ['ignore', log, log],
                timeout: 180000
            });
        } finally {
            closeSync(log);
        }
        console.log(JSON.stringify({ operation: 'seed', database, fixture: 'original DatabaseSeeder', result: 'passed' }));
    }
}
async function migrate() {
    phase = 'load-migrations';
    const { list, hashes } = migrations();
    for (const database of databases) {
        await withClient(database, async (client) => {
            await verifyCluster(client);
            await verifyDatabase(client, database);
        });
        const config = connection(database);
        phase = 'initialize-migrator';
        const orm = await MikroORM.init({
            host: config.host,
            port: config.port,
            dbName: database,
            user: config.user,
            password: config.password,
            schema: 'poms',
            entities: [],
            discovery: { warnWhenNoEntities: false },
            extensions: [Migrator],
            ensureDatabase: false,
            debug: false,
            logger: () => {
                // The controlled runner reports counts; raw SQL/driver text stays private.
            },
            migrations: { migrationsList: list, tableName: 'poms_migrations', transactional: true, allOrNothing: true, safe: true, snapshot: false }
        });
        try {
            phase = 'get-migrator';
            const migrator = orm.migrator;
            phase = 'read-executed';
            const before = await migrator.getExecuted();
            phase = 'execute-historical-migrations';
            const applied = await migrator.up();
            const after = await migrator.getExecuted();
            assert.equal(after.length, 92);
            console.log(JSON.stringify({ database, migrationsBefore: before.length, migrationsApplied: applied.length, migrationsAfter: after.length, migrationSourceSha256: createHash('sha256').update(JSON.stringify(hashes)).digest('hex') }));
        } finally {
            await orm.close(true);
        }
    }
}
async function status() {
    await withClient('postgres', verifyCluster);
    for (const database of databases) {
        await withClient(database, async (client) => {
            await verifyDatabase(client, database);
            const { rows } = await client.query(`select current_database() as database, current_setting('server_version') as version,
                (select count(*)::int from information_schema.tables where table_schema='poms' and table_type='BASE TABLE') as tables,
                (select jsonb_object_agg(extname,extversion) from pg_extension) as extensions`);
            console.log(JSON.stringify(rows[0]));
        });
        await withClient(
            database,
            async (client) => {
                const {
                    rows: [row]
                } = await client.query(`select current_user as username,session_user as session_username,current_setting('TimeZone') as timezone,
                r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,
                (select count(*)::int from pg_auth_members m where m.member=r.oid) as role_memberships,
                has_schema_privilege(current_user,'poms','CREATE') as schema_create,
                has_schema_privilege(current_user,'public','CREATE') as public_schema_create,
                has_database_privilege(current_user,current_database(),'CREATE') as database_create,
                has_schema_privilege(current_user,'r2a_control','USAGE') as marker_access
                from pg_roles r where r.rolname=current_user`);
                assert.deepEqual(row, {
                    username: 'poms_r2a_app',
                    session_username: 'poms_r2a_app',
                    timezone: 'Etc/GMT-8',
                    rolsuper: false,
                    rolcreatedb: false,
                    rolcreaterole: false,
                    rolbypassrls: false,
                    rolreplication: false,
                    role_memberships: 0,
                    schema_create: false,
                    public_schema_create: false,
                    database_create: false,
                    marker_access: false
                });
            },
            true
        );
    }
}
async function catalog() {
    const persistenceText = readFileSync(resolve(root, 'tools/rust-r0f/data-compat/r1-persistence.json'), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(persistenceText).digest('hex'), '8b6bb9af544ba4876e1847d22a4b5a2afff38ced13453b1ac206bf5be8eb691f');
    const persistence = JSON.parse(persistenceText);
    const catalogues = [];
    const typeMap = { uuid: 'uuid', manyToOne: 'uuid', string: 'character varying', datetime: 'timestamp with time zone', integer: 'integer', boolean: 'boolean', text: 'text', json: 'jsonb' };
    for (const database of databases) {
        const tables = await withClient(database, async (client) => {
            await verifyDatabase(client, database);
            await client.query('begin read only');
            try {
                const result = [];
                for (const table of persistence.tables) {
                    const { rows: columns } = await client.query(
                        `select column_name, data_type, is_nullable,
                        character_maximum_length, column_default from information_schema.columns
                        where table_schema='poms' and table_name=$1 order by ordinal_position`,
                        [table.table]
                    );
                    assert.deepEqual(columns.map((c) => c.column_name).sort(), table.fields.map((f) => f.column).sort(), `Column set: ${table.table}`);
                    for (const field of table.fields) {
                        const column = columns.find((c) => c.column_name === field.column);
                        assert.equal(column.data_type, typeMap[field.type], `Column type: ${table.table}.${field.column}`);
                        assert.equal(column.is_nullable === 'YES', field.nullable, `Column nullability: ${table.table}.${field.column}`);
                        const length = field.expression.match(/\.length\((\d+)\)/);
                        if (length) assert.equal(column.character_maximum_length, Number(length[1]), `Column length: ${table.table}.${field.column}`);
                    }
                    const { rows: constraints } = await client.query(
                        `select conname,contype,pg_get_constraintdef(c.oid) as definition from pg_constraint c
                        join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
                        where n.nspname='poms' and t.relname=$1 order by conname`,
                        [table.table]
                    );
                    const { rows: indexes } = await client.query(`select indexname,indexdef from pg_indexes where schemaname='poms' and tablename=$1 order by indexname`, [table.table]);
                    result.push({ table: table.table, columns, constraints, indexes });
                }
                return result;
            } finally {
                await client.query('rollback');
            }
        });
        catalogues.push(tables);
    }
    assert.deepEqual(catalogues[0], catalogues[1], 'Two independent migration catalogues differ');
    console.log(
        JSON.stringify({
            catalog: 'r2a-ten-tables',
            tables: catalogues[0].length,
            fields: catalogues[0].reduce((sum, table) => sum + table.columns.length, 0),
            matchingCopies: 2,
            details: catalogues[0],
            sha256: createHash('sha256').update(JSON.stringify(catalogues[0])).digest('hex')
        })
    );
}
try {
    if (mode === 'provision') await provision();
    if (mode === 'migrate') await migrate();
    await status();
    if (mode === 'catalog') await catalog();
    if (mode === 'env') writeEnvironments();
    if (mode === 'seed') await seed();
} catch (error) {
    // Do not print driver text, SQL, config or cause; they may contain credentials.
    console.error(
        JSON.stringify({
            result: 'failed',
            operation: mode,
            phase,
            category: error?.constructor?.name ?? 'Error',
            sqlstate: typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : undefined,
            assertion: error instanceof assert.AssertionError ? error.message : undefined,
            typeMessage: error instanceof TypeError ? error.message.replaceAll(ownerPassword, '[redacted]').replaceAll(appPassword, '[redacted]') : undefined
        })
    );
    process.exitCode = 1;
}
