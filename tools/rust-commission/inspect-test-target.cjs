// Read only the configured TEST release and migration/schema metadata. Never
// loads the API entry point or prints credentials, application rows, or envs.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

(async () => {
    if (process.argv[2] !== '--remote') {
        const result = JSON.parse(execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'root@121.36.34.169', 'node - --remote'], { input: fs.readFileSync(__filename), encoding: 'utf8', windowsHide: true, timeout: 20000 }));
        const directory = path.resolve(__dirname, '../../apps/poms-api/src/migrations');
        const names = fs.readdirSync(directory).filter(name => /^Migration.*\.ts$/.test(name)).map(name => name.slice(0, -3));
        const applied = new Set((result.migrations ?? []).map(name => name.replace(/\.(?:js|ts)$/, '')));
        result.pendingInCheckout = result.migrations === null ? null : names.filter(name => !applied.has(name)).sort();
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }
    const current = fs.realpathSync('/srv/poms/test/current');
    if (!current.startsWith('/srv/poms/test/releases/')) throw new Error('Unexpected TEST release path');
    const requireApi = createRequire(path.join(current, 'api/package.json'));
    const pg = createRequire(requireApi.resolve('@mikro-orm/postgresql'))('pg');
    const env = {};
    for (const line of fs.readFileSync('/srv/poms/test/shared/poms-api.env', 'utf8').split(/\r?\n/)) {
        const text = line.trim(), separator = text.indexOf('=');
        if (text && !text.startsWith('#') && separator > 0) env[text.slice(0, separator).trim()] = text.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    }
    const client = new pg.Client({ host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 5432), database: env.DB_DATABASE || env.DB_NAME || 'poms', user: env.DB_USER || 'postgres', password: env.DB_PASSWORD, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
    try {
        await client.connect();
        await client.query('BEGIN READ ONLY');
        const catalog = await client.query("SELECT quote_ident(n.nspname)||'.'||quote_ident(c.relname) AS relation FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2", [env.DB_SCHEMA || 'poms', env.MIGRATIONS_TABLE_NAME || 'poms_migrations']);
        const migrations = catalog.rows.length ? (await client.query('SELECT name FROM ' + catalog.rows[0].relation + ' ORDER BY id')).rows.map(row => row.name) : null;
        const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_name IN ('contract_term_preparation','project_handover_basis_snapshot','receipt_accounting_basis','commission_low_down_payment_release','commission_final_settlement_snapshot') ORDER BY table_name", [env.DB_SCHEMA || 'poms'])).rows.map(row => row.table_name);
        process.stdout.write(JSON.stringify({ currentRelease: current, metadataRead: true, transaction: 'read-only', migrations, presentTables: tables }));
    } finally {
        try { await client.query('ROLLBACK'); } catch { /* A failed connection has no transaction. */ }
        await client.end();
    }
})().catch(error => { process.stderr.write('TEST metadata read failed: ' + (error.code || error.name) + '\n'); process.exitCode = 1; });
