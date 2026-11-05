// Root-only read-only schema/base-state evidence for the new isolated databases.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
assert.equal(process.platform, 'linux');
const root = '/home/wangzishi/projects/poms-rust-r4def', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const state = '/home/wangzishi/.local/share/poms-r4def', priv = state + '/private';
const identity = JSON.parse(fs.readFileSync(state + '/identity.json')); assert.equal(identity.namespace, 'poms-r4def');
const container = JSON.parse(execFileSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'inspect', 'poms-r4def-pg15'], { encoding: 'utf8' }))[0];
assert.equal(container.Config.Labels['org.poms.scope'], 'poms-r4def'); assert.equal(container.Config.Labels['org.poms.base'], identity.base); assert(container.State.Running);
const require = createRequire(root + '/package.json'), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const passwordFile = priv + '/owner-password'; assert(fs.lstatSync(passwordFile).isFile()); const password = fs.readFileSync(passwordFile, 'utf8'); assert(/^[a-f0-9]{64}$/.test(password));
const out = win + '/tmp/rust-r4def/root/catalog25'; fs.mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
    for (const backend of ['native', 'rust']) {
        const client = new Client({ host: '127.0.0.1', port: 25433, database: 'poms_r4def_' + backend, user: 'poms_r0e_owner', password }); await client.connect();
        try {
            await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
            const { rows: columns } = await client.query("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale,ordinal_position FROM information_schema.columns WHERE table_schema='poms' ORDER BY table_name,ordinal_position");
            const { rows: indexes } = await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='poms' ORDER BY tablename,indexname");
            const { rows: constraints } = await client.query("SELECT c.relname table_name,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' ORDER BY c.relname,k.conname");
            const tables = [...new Set(columns.map(c => c.table_name))]; const rowsByTable = {}, summary = [];
            for (const table of tables) {
                assert(/^[a-z_][a-z_0-9]*$/.test(table));
                const { rows } = await client.query(`SELECT to_jsonb(t) value FROM poms."${table}" t ORDER BY to_jsonb(t)::text`);
                rowsByTable[table] = rows.map(r => r.value); summary.push({ table, count: rows.length, sha256: hash(rowsByTable[table]) });
            }
            await client.query('COMMIT');
            fs.writeFileSync(out + '/' + backend + '-catalog.json', JSON.stringify({ columns, indexes, constraints, summary }, null, 2) + '\n', { flag: 'wx' });
            fs.writeFileSync(priv + '/cleanup-before-' + backend + '-rows.json', JSON.stringify(rowsByTable, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
            console.log(JSON.stringify({ backend, tables: tables.length, baseRows: summary.reduce((n, t) => n + t.count, 0), allConstraintsValidated: constraints.every(c => c.convalidated), privateRowsPublished: false }));
        } finally { await client.end(); }
    }
} catch (error) {
    fs.writeFileSync(priv + '/catalog25-error.log', error.stack ?? String(error), { mode: 0o600 });
    console.error(JSON.stringify({ phase: 'catalog25', result: 'failed', errorName: error.name, code: error.code ?? null, privateErrorRetained: true })); process.exitCode = 1;
}
