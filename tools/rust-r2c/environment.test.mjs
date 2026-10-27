import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual bounded guard functions, without importing the CLI or pg.
const source = readFileSync(new URL('./database-environment.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('database-environment.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['connection', 'validateAppSecret', 'verifyCluster', 'verifyDatabase', 'status', 'migrations', 'seed']);
const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text));
assert.equal(functions.length, names.size);
const databases = ['poms_r2c_nest', 'poms_r2c_rust'];
const marker = 'bdbfcab9-a643-4379-88fc-b19d45d1ca24';
const sourceHead = '705973835d4c823ae8aa3988976e8d6a13b31dfe';
const runtime = {
    username: 'poms_r2c_app',
    session_username: 'poms_r2c_app',
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
};
function cluster(database) {
    return { database, session_username: 'poms_r0e_owner', username: 'poms_r0e_owner', version: '150012', port: '15432', isolated: 'on' };
}
function load(extra = {}) {
    const context = vm.createContext({ assert, databases, marker, sourceHead, root: '/synthetic/r2c', appPassword: 'a'.repeat(64), ownerPassword: 'synthetic-owner', console: { log: () => undefined }, ...extra });
    vm.runInContext(functions.map((node) => node.getText()).join('\n'), context);
    return context;
}
function rowsIn(context, rows) {
    context.syntheticRows = JSON.stringify(rows);
    return vm.runInContext('JSON.parse(syntheticRows)', context);
}
test('connection admits only R2C copies and owner metadata postgres, with explicit credentials', () => {
    const context = load();
    for (const database of databases) {
        const options = context.connection(database, true);
        assert.equal(options.host, '127.0.0.1');
        assert.equal(options.port, 15432);
        assert.equal(options.user, 'poms_r2c_app');
        assert.equal(options.password, 'a'.repeat(64));
        assert.equal(options.connectionTimeoutMillis, 5000);
        assert.equal(options.query_timeout, 10000);
    }
    assert.equal(context.connection('postgres').user, 'poms_r0e_owner');
    for (const database of ['poms', 'poms_r0e_rust', 'poms_r1e_rust', 'poms_r2c_other', 'postgres://other', 'postgres']) assert.throws(() => context.connection(database, true));
});
test('owner metadata rejects PG17, wrong identity, old database, port or isolation marker', async () => {
    const context = load();
    await context.verifyCluster({ query: async () => ({ rows: rowsIn(context, [cluster(databases[0])]) }) });
    for (const change of [{ version: '170004' }, { port: '5432' }, { isolated: null }, { database: 'poms_r1e_rust' }, { session_username: 'postgres' }, { username: 'poms_r2c_app' }]) {
        await assert.rejects(context.verifyCluster({ query: async () => ({ rows: rowsIn(context, [{ ...cluster(databases[0]), ...change }]) }) }));
    }
});
test('database marker is read-only, exact single row and exact owner; rollback on refusal', async () => {
    const context = load();
    for (const rows of [[{ database: databases[0], marker, owner: 'poms_r0e_owner' }], [], [{ database: databases[0], marker: 'wrong', owner: 'poms_r0e_owner' }], [{ database: databases[0], marker, owner: 'postgres' }]]) {
        const calls = [];
        const client = {
            query: async (sql) => {
                calls.push(sql);
                return { rows: rowsIn(context, sql.includes('r2c_control.marker') ? rows : sql.startsWith('select current_database()') ? [cluster(databases[0])] : []) };
            }
        };
        if (rows.length === 1 && rows[0].marker === marker && rows[0].owner === 'poms_r0e_owner') await context.verifyDatabase(client, databases[0]);
        else await assert.rejects(context.verifyDatabase(client, databases[0]));
        assert(calls.includes('BEGIN READ ONLY'));
        assert.equal(calls.at(-1), 'ROLLBACK');
    }
});
test('actual status refuses every privileged role flag, membership, CREATE or control access', async () => {
    for (const field of [null, 'rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolbypassrls', 'rolreplication', 'role_memberships', 'schema_create', 'public_schema_create', 'database_create', 'marker_access']) {
        const context = load({
            withClient: async (database, callback) =>
                callback({
                    query: async (sql) => ({
                        rows: rowsIn(
                            context,
                            sql.includes("current_setting('TimeZone')")
                                ? [{ ...runtime, ...(field ? { [field]: field === 'role_memberships' ? 1 : true } : {}) }]
                                : sql.includes('r2c_control.marker')
                                  ? [{ database, marker, owner: 'poms_r0e_owner' }]
                                  : [cluster(database)]
                        )
                    })
                })
        });
        if (field === null) await context.status();
        else await assert.rejects(context.status());
    }
});
test('actual ambient guard rejects PGOPTIONS and case-folded process/database overrides', () => {
    const guard = ast.statements.find((node) => node.getText().startsWith('assert(!Object.keys(process.env)'));
    assert(guard);
    for (const key of ['PGOPTIONS', 'PGHOST', 'pgpassword', 'DB_HOST', 'db_port', 'MIKRO_ORM_HOST', 'DATABASE_URL', 'JWT_SECRET', 'NODE_OPTIONS', 'POMS_ENV_FILE']) {
        assert.throws(() => vm.runInNewContext(guard.getText(), { assert, process: { env: { [key]: 'synthetic-override' } } }));
    }
});
for (const target of ['working', 'index', 'untracked']) {
    test(`actual migration and seed guards refuse ${target} drift before loading sources or connecting`, async () => {
        const calls = [];
        const context = load({
            execFileSync: (_command, args) => {
                calls.push(args);
                return (target === 'index' ? args.includes('--cached') : target === 'untracked' ? args[0] === 'ls-files' : args[0] === 'diff' && !args.includes('--cached')) ? 'changed' : '';
            }
        });
        assert.throws(() => context.migrations());
        await assert.rejects(context.seed());
        assert(calls.every((args) => args.includes('apps/poms-api/src/migrations') || args.includes('apps/poms-api/src')));
        if (target !== 'untracked') assert(calls.every((args) => args.includes(sourceHead)));
    });
}
