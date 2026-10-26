import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
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
assert(['provision', 'status', 'migrate', 'catalog'].includes(mode));
const root = resolve(import.meta.dirname, '../..');
const sourceHead = '1013afef266602e7c98eb433bd0f14483be3d7fd';
const databases = ['poms_r1c_nest', 'poms_r1c_rust'];
const marker = 'ae621cfc-3e3b-436d-9b70-4173191ece90';
const ownerPassword = readFileSync('/run/secrets/r1c-owner-password', 'utf8');
const appPassword = readFileSync('/run/secrets/r1c-app-password', 'utf8');
function validateAppSecret(value) {
    if (!/^[0-9a-f]{64}$/.test(value)) throw new Error('R1C secret format mismatch');
}
validateAppSecret(appPassword);
const connection = (database, app = false) => ({
    host: '127.0.0.1',
    port: 15432,
    database,
    user: app ? 'poms_r1c_app' : 'poms_r0e_owner',
    password: app ? appPassword : ownerPassword,
    connectionTimeoutMillis: 5000,
    application_name: 'poms-r1c-controlled-validation'
});
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
    } = await client.query(`select current_user as username,
        current_setting('server_version_num') as version, current_setting('port') as port,
        current_setting('poms.r0e_isolated', true) as isolated`);
    assert.deepEqual(row, { username: 'poms_r0e_owner', version: '150012', port: '15432', isolated: 'on' });
    const source = await withClient('poms_r0e_rust', (c) => c.query(`select instance_id::text from r0e_control.marker where database_name=current_database()`));
    assert.equal(source.rows[0]?.instance_id, 'f055884e-5eaf-44ad-a51e-ab9d3a2627ff');
}
async function verifyDatabase(client, database) {
    assert(databases.includes(database));
    const {
        rows: [row]
    } = await client.query(`select current_database() as database, instance_id::text as marker from r1c_control.marker where database_name=current_database()`);
    assert.deepEqual(row, { database, marker });
}
async function provision() {
    await withClient('postgres', async (client) => {
        await verifyCluster(client);
        const role = await client.query(`select rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolreplication,
            (select count(*)::int from pg_auth_members m where m.member=r.oid) as role_memberships
            from pg_roles r where rolname='poms_r1c_app'`);
        if (!role.rowCount) {
            // The password is constrained to random hex; it is never logged.
            await client.query(`create role poms_r1c_app login password '${appPassword}' nosuperuser nocreatedb nocreaterole nobypassrls`);
        } else assert.deepEqual(role.rows[0], { rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolbypassrls: false, rolreplication: false, role_memberships: 0 });
        for (const database of databases) {
            const exists = await client.query('select 1 from pg_database where datname=$1', [database]);
            if (exists.rowCount) {
                await withClient(database, (c) => verifyDatabase(c, database));
                continue;
            }
            await client.query(`create database "${database}" owner poms_r0e_owner encoding 'UTF8' lc_collate 'en_US.UTF-8' lc_ctype 'en_US.UTF-8' template template0`);
            await client.query(`revoke all on database "${database}" from public`);
            await client.query(`grant connect, temporary on database "${database}" to poms_r1c_app`);
            await withClient(database, async (c) => {
                await c.query(`begin;
                    revoke create on schema public from public;
                    create schema poms authorization poms_r0e_owner;
                    create schema r1c_control authorization poms_r0e_owner;
                    create extension pgcrypto with schema public version '1.3';
                    create extension btree_gist with schema public version '1.7';
                    create table r1c_control.marker(database_name text primary key, instance_id uuid not null, created_at timestamptz not null default now());`);
                await c.query('insert into r1c_control.marker(database_name,instance_id) values ($1,$2)', [database, marker]);
                await c.query(`grant usage on schema public, poms to poms_r1c_app;
                    alter default privileges for role poms_r0e_owner in schema poms grant select,insert,update,delete on tables to poms_r1c_app;
                    alter default privileges for role poms_r0e_owner in schema poms grant usage,select on sequences to poms_r1c_app;
                    commit`);
            });
        }
        await client.query(`alter role poms_r1c_app set search_path=poms,public`);
        await client.query(`alter role poms_r1c_app set timezone='Etc/GMT-8'`);
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
                has_schema_privilege(current_user,'r1c_control','USAGE') as marker_access
                from pg_roles r where r.rolname=current_user`);
                assert.deepEqual(row, {
                    username: 'poms_r1c_app',
                    session_username: 'poms_r1c_app',
                    timezone: 'Etc/GMT-8',
                    rolsuper: false,
                    rolcreatedb: false,
                    rolcreaterole: false,
                    rolbypassrls: false,
                    rolreplication: false,
                    role_memberships: 0,
                    schema_create: false,
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
            catalog: 'r1c-ten-tables',
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
