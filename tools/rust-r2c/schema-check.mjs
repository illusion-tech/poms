import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseFor, root, sourceHead, validateAmbient, validateSource, verifyConnection } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => sha256(JSON.stringify(value));
export const catalogQueries = Object.freeze({
    tables: "select c.relname, obj_description(c.oid,'pg_class') as comment from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relkind='r' order by c.relname",
    columns: "select c.relname,a.attname,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) as default,col_description(c.oid,a.attnum) as comment from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='poms' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum",
    constraints: "select c.relname,k.conname,pg_get_constraintdef(k.oid,true) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' order by c.relname,k.conname",
    indexes: "select tablename,indexname,indexdef from pg_indexes where schemaname='poms' order by tablename,indexname",
    migrations: 'select name from poms.poms_migrations order by name',
    triggers: "select c.relname,t.tgname,pg_get_triggerdef(t.oid,true) as definition,pg_get_functiondef(t.tgfoid) as function from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and not t.tgisinternal order by c.relname,t.tgname"
});

export async function catalog(client) {
    const result = {};
    await client.query('BEGIN READ ONLY');
    try { for (const [key, sql] of Object.entries(catalogQueries)) result[key] = (await client.query(sql)).rows; }
    finally { await client.query('ROLLBACK'); }
    return result;
}

export function schemaRunPlan(args) {
    if (args.length === 0) return { tag: 'initial', suffix: '', launcher: 'original-nx', report: 'tmp/rust-r2c/schema-check.json' };
    assert.deepEqual(args, ['--run-tag=2'], 'Only the explicitly reviewed second attempt is accepted');
    return { tag: '2', suffix: '-2', launcher: 'installed-locked-mikro-orm', report: 'tmp/rust-r2c/schema-check-2.json' };
}

function installedCli() {
    const packagePath = require.resolve('@mikro-orm/cli/package.json');
    const cli = JSON.parse(readFileSync(packagePath, 'utf8'));
    const declared = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).devDependencies['@mikro-orm/cli'];
    assert.equal(declared, '7.0.11'); assert.equal(cli.version, declared);
    assert(/^ {6}'@mikro-orm\/cli':\r?\n {8}specifier: 7\.0\.11\r?\n {8}version: 7\.0\.11\r?\n/m.test(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8')),
        'Installed CLI must match the existing exact locked importer');
    assert.equal(cli.bin['mikro-orm'], './cli.js');
    const entry = path.join(path.dirname(packagePath), 'cli.js');
    return { entry, version: cli.version, packageSha256: sha256(readFileSync(packagePath)), entrySha256: sha256(readFileSync(entry)) };
}

export function readOnlyCliPlan(backend, operation, childEnv, launcher = 'original-nx') {
    assert(['nest', 'rust'].includes(backend));
    assert(['migration-check', 'schema-dump'].includes(operation));
    assert(['original-nx', 'installed-locked-mikro-orm'].includes(launcher));
    assert.equal(childEnv.DB_DATABASE, databaseFor(backend));
    assert.equal(childEnv.DB_HOST, '127.0.0.1'); assert.equal(String(childEnv.DB_PORT), '15432');
    assert.equal(childEnv.DB_USER, 'poms_r2c_app');
    assert(!Object.hasOwn(childEnv, 'PGOPTIONS'), 'Do not inherit an arbitrary PGOPTIONS');
    const target = JSON.parse(readFileSync(path.join(root, 'apps/poms-api/project.json'), 'utf8')).targets['migration-check'];
    assert.equal(target.executor, 'nx:run-commands');
    assert.equal(target.options.command, 'corepack pnpm exec mikro-orm migration:check');
    assert.deepEqual(target.options.args, ['--config', 'apps/poms-api/src/mikro-orm.config.ts']);
    assert.deepEqual(target.options.env, { MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json' });
    const cli = installedCli();
    let args;
    if (operation === 'migration-check' && launcher === 'original-nx') {
        const nxPackage = require.resolve('nx/package.json');
        const nx = JSON.parse(readFileSync(nxPackage, 'utf8'));
        const nxEntry = path.resolve(path.dirname(nxPackage), typeof nx.bin === 'string' ? nx.bin : nx.bin.nx);
        assert(!path.relative(path.dirname(nxPackage), nxEntry).startsWith('..'));
        args = [nxEntry, 'run', 'poms-api:migration-check', '--skip-nx-cache'];
    } else args = [cli.entry, operation === 'migration-check' ? 'migration:check' : 'schema:update',
        ...(operation === 'schema-dump' ? ['--dump'] : []), ...target.options.args];
    return {
        executable: process.execPath,
        args,
        launcher: { kind: operation === 'schema-dump' ? 'installed-locked-mikro-orm' : launcher,
            originalNxTarget: 'poms-api:migration-check', originalTargetCommand: target.options.command,
            originalTargetArgs: target.options.args, originalTargetValidated: true,
            installedCli: { version: cli.version, packageSha256: cli.packageSha256, entrySha256: cli.entrySha256 },
            substitution: operation === 'migration-check' && launcher !== 'original-nx'
                ? 'Direct installed locked CLI; the original Nx/corepack/pnpm launcher did not reach migration:check before its first-attempt timeout.' : null },
        options: { cwd: root, env: { ...childEnv, PGOPTIONS: '-c default_transaction_read_only=on', MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json' },
            encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 180000, shell: false, windowsHide: true }
    };
}

export function classifyObservation({ check, dump, before, visibility, baseline }) {
    // eslint-disable-next-line no-control-regex -- Strip ANSI CSI output before classifying the original CLI dump.
    const dumpText = dump.text.replace(/\u001b\[[0-9;]*m/g, '');
    const ddlLines = dumpText.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^(?:alter|create|drop|comment\s+on)\b/i.test(line));
    const knownDdlOnly = ddlLines.every((line) => /^alter table\s+(?:"poms"\.)?"[^"]+"\s+add constraint\s+"[^"]+"\s+check\b/i.test(line)
        || /^comment on column\s+(?:"poms"\.)?"lead_score_override"\."status"\s+is\b/i.test(line));
    const proposedChecks = [...dumpText.matchAll(/alter table\s+(?:"poms"\.)?"([^"]+)"\s+add constraint\s+"([^"]+)"\s+check/gi)]
        .map((match) => ({ table: match[1], constraint: match[2], sameNamedConstraintExists: before.constraints.some((row) => row.relname === match[1] && row.conname === match[2]) }));
    const counts = Object.fromEntries(Object.entries(before).map(([key, rows]) => [key, rows.length]));
    const toolsCompleted = !check.spawnError && !dump.spawnError && !check.signal && !dump.signal;
    if (toolsCompleted && check.exitCode === 0 && dump.exitCode === 0 && ddlLines.length === 0)
        return { status: 'clean', classification: [], counts, proposedChecks, allCheckExpressionsCompared: false };
    const reference = baseline.schema.copies.find((copy) => copy.backend === 'nest');
    const known = toolsCompleted && check.exitCode === 1 && /changes detected/i.test(check.text ?? '') && dump.exitCode === 0 && knownDdlOnly && digest(before) === reference.catalogSha256
        && proposedChecks.length === reference.sameNamedChecks && proposedChecks.every((check) => check.sameNamedConstraintExists)
        && visibility.owner === reference.visibility.owner && visibility.app === reference.visibility.app;
    return {
        status: known ? 'failed-with-classification' : 'failed-with-classification-required',
        classification: known ? ['existing-baseline-drift: low-privilege MikroORM CHECK introspection visibility', 'existing-baseline-drift: lead_score_override.status comment mismatch'] : [],
        counts, proposedChecks, matchingArchivedR2BCatalog: digest(before) === reference.catalogSha256,
        allCheckExpressionsCompared: false, proposedSqlExecuted: false
    };
}

function sourceHashes() {
    const files = ['apps/poms-api/project.json', 'package.json', 'pnpm-lock.yaml', 'docs/design/rust-r2b-validation.json',
        'tools/rust-r2c/schema-check.mjs', 'tools/rust-r2c/fixture-guard.mjs', 'tools/rust-r2c/managed-environment.cjs'];
    function walk(relative) {
        for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
            assert(!entry.isSymbolicLink(), 'Source symlinks are not accepted');
            const child = `${relative}/${entry.name}`;
            if (entry.isDirectory()) walk(child); else files.push(child);
        }
    }
    for (const directory of ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src']) walk(directory);
    return files.sort().map((file) => ({ file, rawBytesSha256: sha256(readFileSync(path.join(root, file))) }));
}

async function main() {
    assert.equal(process.platform, 'linux');
    const run = schemaRunPlan(process.argv.slice(2));
    validateAmbient(process.env); validateSource();
    const output = path.join(root, run.report);
    assert(!existsSync(output), 'Retain the previous report; do not replace an observed run');
    function retainedAttempt() {
        if (run.tag === 'initial') return [];
        return ['schema-check.json', 'schema-nest-before.json', 'schema-nest-after.json',
            'schema-nest-migration-check.log', 'schema-nest-schema-dump.log']
            .map((name) => ({ file: `tmp/rust-r2c/${name}`, rawBytesSha256: sha256(readFileSync(path.join(root, 'tmp/rust-r2c', name))) }));
    }
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const { loadManagedEnvironment } = require('./managed-environment.cjs');
    const report = { formatVersion: 1, result: 'pending', sourceHead, runTag: run.tag, migrationCheckLauncher: run.launcher,
        startedAt: new Date().toISOString(), copies: [], sourceFiles: sourceHashes(), installedCli: installedCli(), retainedPriorAttempt: retainedAttempt() };
    const baseline = JSON.parse(readFileSync(path.join(root, 'docs/design/rust-r2b-validation.json'), 'utf8'));
    function connection(backend, owner) {
        const password = readFileSync(`/run/secrets/r2c-${owner ? 'owner' : 'app'}-password`, 'utf8');
        assert(owner ? password.length > 0 && password.length <= 1024 && !/[\r\n\0]/.test(password) : /^[0-9a-f]{64}$/.test(password));
        return new Client({ host: '127.0.0.1', port: 15432, database: databaseFor(backend), user: owner ? 'poms_r0e_owner' : 'poms_r2c_app', password,
            options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 5000, query_timeout: 10000 });
    }
    function cli(backend, operation) {
        const { childEnv } = loadManagedEnvironment({ mode: `managed-${backend}`, env: { ...process.env, POMS_ENV_FILE: `/r2c-private/${backend}.env` }, cwd: root });
        const plan = readOnlyCliPlan(backend, operation, childEnv, run.launcher);
        const result = spawnSync(plan.executable, plan.args, plan.options);
        let text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        for (const secret of [childEnv.DB_PASSWORD, childEnv.JWT_SECRET]) if (typeof secret === 'string' && secret.length) text = text.replaceAll(secret, '[REDACTED]');
        const log = `tmp/rust-r2c/schema-${backend}-${operation}${run.suffix}.log`;
        writeFileSync(path.join(root, log), text, { flag: 'wx', mode: 0o600 });
        return { operation, launcher: plan.launcher, argv: plan.args, exitCode: result.status, signal: result.signal,
            spawnError: result.error?.code ?? null, log, rawBytesSha256: sha256(text), text };
    }
    try {
        for (const backend of ['nest', 'rust']) {
            const owner = connection(backend, true), app = connection(backend, false);
            try {
                await owner.connect(); await verifyConnection(owner, databaseFor(backend), true);
                await app.connect(); await verifyConnection(app, databaseFor(backend));
                for (const client of [owner, app]) {
                    assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only, 'on');
                    await client.query('SET search_path=poms,public');
                }
                const before = await catalog(app); assert.equal(before.migrations.length, 92);
                const beforePath = `tmp/rust-r2c/schema-${backend}-before${run.suffix}.json`;
                writeFileSync(path.join(root, beforePath), JSON.stringify(before, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
                const visibility = {};
                for (const [key, client] of [['owner', owner], ['app', app]])
                    visibility[key] = (await client.query("select count(*)::int as count from information_schema.constraint_column_usage where table_schema='poms'")).rows[0].count;
                const check = cli(backend, 'migration-check'), dump = cli(backend, 'schema-dump');
                const after = await catalog(app);
                const afterPath = `tmp/rust-r2c/schema-${backend}-after${run.suffix}.json`;
                writeFileSync(path.join(root, afterPath), JSON.stringify(after, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
                assert.deepEqual(after, before, 'Read-only introspection changed catalog');
                const classification = classifyObservation({ check, dump, before, visibility, baseline });
                delete check.text; delete dump.text;
                report.copies.push({ backend, database: databaseFor(backend), ...classification, catalogUnchanged: true,
                    catalogSha256: digest(before), before: { path: beforePath, rawBytesSha256: sha256(readFileSync(path.join(root, beforePath))) },
                    after: { path: afterPath, rawBytesSha256: sha256(readFileSync(path.join(root, afterPath))) }, visibility, check, dump });
                assert(!check.spawnError && !dump.spawnError && !check.signal && !dump.signal);
                assert.equal(dump.exitCode, 0); assert([0, 1].includes(check.exitCode));
            } finally { await Promise.allSettled([owner.end(), app.end()]); }
        }
        validateSource(); assert.deepEqual(sourceHashes(), report.sourceFiles, 'Schema inputs changed during observation');
        assert.deepEqual(installedCli(), report.installedCli, 'Installed CLI changed during observation');
        assert.deepEqual(retainedAttempt(), report.retainedPriorAttempt, 'The first attempt must remain byte-for-byte intact');
        report.result = report.copies.some((copy) => copy.status === 'failed-with-classification-required') ? 'classification-required' : 'observed';
    } catch (error) { report.result = 'fail'; report.failureReason = error.name; process.exitCode = 1; }
    finally {
        try { report.priorAttemptUnchanged = JSON.stringify(retainedAttempt()) === JSON.stringify(report.retainedPriorAttempt); }
        catch { report.priorAttemptUnchanged = false; }
        if (!report.priorAttemptUnchanged) { report.result = 'fail'; report.failureReason = 'PriorAttemptChanged'; process.exitCode = 1; }
        report.finishedAt = new Date().toISOString(); writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    console.log(JSON.stringify({ result: report.result, copies: report.copies.map((copy) => ({ backend: copy.backend, status: copy.status, checkExit: copy.check.exitCode, dumpExit: copy.dump.exitCode, catalogUnchanged: copy.catalogUnchanged })) }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
