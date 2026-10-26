import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { databaseFor, root, sourceHead, validateSource, verifyConnection } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
assert.equal(process.platform, 'linux');
assert.equal(process.argv.length, 2);
const output = path.join(root, 'tmp/rust-r2b/schema-check.json');
assert(!existsSync(output));
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function connection(backend, owner = false) {
    const password = readFileSync(`/run/secrets/r2b-${owner ? 'owner' : 'app'}-password`, 'utf8');
    assert(owner ? password.length > 0 && !/[\r\n\0]/.test(password) : /^[0-9a-f]{64}$/.test(password));
    return new Client({ host: '127.0.0.1', port: 15432, database: databaseFor(backend), user: owner ? 'poms_r0e_owner' : 'poms_r2b_app', password, options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 5000 });
}
async function catalog(client) {
    const queries = {
        tables: "select c.relname, obj_description(c.oid,'pg_class') as comment from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relkind='r' order by c.relname",
        columns:
            "select c.relname,a.attname,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) as default,col_description(c.oid,a.attnum) as comment from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='poms' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum",
        constraints: "select c.relname,k.conname,pg_get_constraintdef(k.oid,true) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' order by c.relname,k.conname",
        indexes: "select tablename,indexname,indexdef from pg_indexes where schemaname='poms' order by tablename,indexname",
        migrations: 'select name from poms.poms_migrations order by name',
        triggers:
            "select c.relname,t.tgname,pg_get_triggerdef(t.oid,true) as definition,pg_get_functiondef(t.tgfoid) as function from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and not t.tgisinternal order by c.relname,t.tgname"
    };
    const result = {};
    await client.query('BEGIN READ ONLY');
    try {
        for (const [key, sql] of Object.entries(queries)) result[key] = (await client.query(sql)).rows;
    } finally {
        await client.query('ROLLBACK');
    }
    return result;
}
function cli(backend, command, extra = []) {
    const { childEnv } = loadManagedEnvironment({ mode: `managed-${backend}`, env: { ...process.env, POMS_ENV_FILE: `/r2b-private/${backend}.env` }, cwd: root });
    const args = [path.join(root, 'node_modules/@mikro-orm/cli/cli.js'), command, ...extra, '--config', 'apps/poms-api/src/mikro-orm.config.ts'];
    const result = spawnSync(process.execPath, args, {
        cwd: root,
        env: { ...childEnv, PGOPTIONS: '-c default_transaction_read_only=on', MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json' },
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 180000,
        shell: false,
        windowsHide: true
    });
    let text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    for (const secret of [childEnv.DB_PASSWORD, childEnv.JWT_SECRET]) text = text.replaceAll(secret, '[REDACTED]');
    const filename = `tmp/rust-r2b/schema-${backend}-${command.replace(':', '-')}.log`;
    writeFileSync(path.join(root, filename), text, { flag: 'wx', mode: 0o600 });
    return { command, args: extra, exitCode: result.status, signal: result.signal, log: filename, sha256: createHash('sha256').update(text).digest('hex'), text };
}
const report = { formatVersion: 1, result: 'pending', sourceHead, startedAt: new Date().toISOString(), copies: [] };
try {
    validateSource();
    for (const backend of ['nest', 'rust']) {
        const owner = connection(backend, true),
            app = connection(backend);
        try {
            await owner.connect();
            await verifyConnection(owner, databaseFor(backend), true);
            await app.connect();
            await verifyConnection(app, databaseFor(backend));
            for (const client of [owner, app]) await client.query('SET search_path=poms,public');
            const before = await catalog(app);
            assert.equal(before.migrations.length, 92);
            const visibility = {};
            for (const [key, client] of [
                ['owner', owner],
                ['app', app]
            ])
                visibility[key] = (await client.query("select count(*)::int as count from information_schema.constraint_column_usage where table_schema='poms'")).rows[0].count;
            const check = cli(backend, 'migration:check');
            const dump = cli(backend, 'schema:update', ['--dump']);
            const after = await catalog(app);
            assert.deepEqual(after, before, 'Read-only introspection changed the catalog');
            const proposedChecks = [...dump.text.matchAll(/alter table\s+(?:"poms"\.)?"([^"]+)"\s+add constraint\s+"([^"]+)"\s+check/gi)].map((match) => ({
                table: match[1],
                constraint: match[2],
                sameNamedConstraintExists: before.constraints.some((row) => row.relname === match[1] && row.conname === match[2])
            }));
            const comment = before.columns.find((row) => row.relname === 'lead_score_override' && row.attname === 'status')?.comment;
            delete check.text;
            delete dump.text;
            report.copies.push({
                backend,
                database: databaseFor(backend),
                result: check.exitCode === 0 ? 'clean' : 'failed-with-classification-required',
                catalogSha256: digest(before),
                catalogUnchanged: true,
                counts: Object.fromEntries(Object.entries(before).map(([key, rows]) => [key, rows.length])),
                visibility,
                proposedChecks,
                statusComment: comment,
                check,
                dump
            });
            assert.equal(dump.exitCode, 0);
            assert([0, 1].includes(check.exitCode));
        } finally {
            await Promise.allSettled([owner.end(), app.end()]);
        }
    }
    validateSource();
    report.result = 'observed';
} catch (error) {
    report.result = 'fail';
    report.failureReason = error.name;
    process.exitCode = 1;
} finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(
    JSON.stringify({
        result: report.result,
        copies: report.copies.map((copy) => ({ backend: copy.backend, checkExit: copy.check.exitCode, dumpExit: copy.dump.exitCode, catalogUnchanged: copy.catalogUnchanged, proposedChecks: copy.proposedChecks.length }))
    })
);
