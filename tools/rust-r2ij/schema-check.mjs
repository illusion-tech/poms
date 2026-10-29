import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseFor, root, sourceHead, validateAmbient, validateSource, verifyConnection } from './fixture-guard.mjs';
import { catalog, classifyObservation } from '../rust-r2c/schema-check.mjs';

const require = createRequire(import.meta.url);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => sha256(JSON.stringify(value));

function installedCli() {
    const packagePath = require.resolve('@mikro-orm/cli/package.json');
    const cli = JSON.parse(readFileSync(packagePath, 'utf8'));
    const declared = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).devDependencies['@mikro-orm/cli'];
    assert.equal(declared, '7.0.11'); assert.equal(cli.version, declared);
    assert(/^ {6}'@mikro-orm\/cli':\r?\n {8}specifier: 7\.0\.11\r?\n {8}version: 7\.0\.11\r?\n/m.test(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8')));
    assert.equal(cli.bin['mikro-orm'], './cli.js');
    const entry = path.join(path.dirname(packagePath), 'cli.js');
    return { entry, version: cli.version, packageSha256: sha256(readFileSync(packagePath)), entrySha256: sha256(readFileSync(entry)) };
}

export function readOnlyCliPlan(backend, operation, childEnv) {
    assert(['nest', 'rust'].includes(backend));
    assert(['migration-check', 'schema-dump'].includes(operation));
    assert.equal(childEnv.DB_DATABASE, databaseFor(backend));
    assert.equal(childEnv.DB_HOST, '127.0.0.1'); assert.equal(String(childEnv.DB_PORT), '16432');
    assert.equal(childEnv.DB_USER, 'poms_r2ij_app');
    assert(!Object.hasOwn(childEnv, 'PGOPTIONS'));
    const target = JSON.parse(readFileSync(path.join(root, 'apps/poms-api/project.json'), 'utf8')).targets['migration-check'];
    assert.equal(target.executor, 'nx:run-commands');
    assert.equal(target.options.command, 'corepack pnpm exec mikro-orm migration:check');
    assert.deepEqual(target.options.args, ['--config', 'apps/poms-api/src/mikro-orm.config.ts']);
    assert.deepEqual(target.options.env, { MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json' });
    const cli = installedCli();
    return {
        executable: process.execPath,
        args: [cli.entry, operation === 'migration-check' ? 'migration:check' : 'schema:update',
            ...(operation === 'schema-dump' ? ['--dump'] : []), ...target.options.args],
        launcher: { kind: 'installed-locked-mikro-orm', originalNxTarget: 'poms-api:migration-check',
            originalTargetCommand: target.options.command, originalTargetArgs: target.options.args,
            originalTargetValidated: true, installedCli: cli,
            substitution: 'Use the same installed locked CLI as R2C schema-check-2; this R2IJ run does not claim to execute the Nx/corepack/pnpm launcher.' },
        options: { cwd: root, env: { ...childEnv, PGOPTIONS: '-c default_transaction_read_only=on', MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json' },
            encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 180000, shell: false, windowsHide: true }
    };
}

function sourceHashes() {
    const files = ['apps/poms-api/project.json', 'package.json', 'pnpm-lock.yaml', 'docs/design/rust-r2b-validation.json',
        'tools/rust-r2c/schema-check.mjs', 'tools/rust-r2ij/schema-check.mjs', 'tools/rust-r2ij/fixture-guard.mjs', 'tools/rust-r2ij/managed-environment.cjs'];
    function walk(relative) {
        for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
            assert(!entry.isSymbolicLink()); const child = `${relative}/${entry.name}`;
            if (entry.isDirectory()) walk(child); else files.push(child);
        }
    }
    for (const directory of ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src']) walk(directory);
    return files.sort().map(file => ({ file, rawBytesSha256: sha256(readFileSync(path.join(root, file))) }));
}

async function main() {
    assert.equal(process.platform, 'linux'); assert.equal(process.argv.length, 2);
    validateAmbient(process.env); validateSource();
    const output = path.join(root, 'tmp/rust-r2ij/schema-check.json');
    assert(!existsSync(output), 'Preserve existing schema evidence');
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const { loadManagedEnvironment } = require('./managed-environment.cjs');
    const report = { formatVersion: 1, result: 'pending', sourceHead, startedAt: new Date().toISOString(),
        copies: [], sourceFiles: sourceHashes(), installedCli: installedCli(), proposedSqlExecuted: false };
    const baseline = JSON.parse(readFileSync(path.join(root, 'docs/design/rust-r2b-validation.json'), 'utf8'));
    function connection(backend, owner) {
        const password = readFileSync(`/home/wangzishi/.local/share/poms-r2ij/private/${owner ? 'owner' : 'app'}-password`, 'utf8');
        assert(owner ? password.length > 0 && password.length <= 1024 && !/[\r\n\0]/.test(password) : /^[0-9a-f]{64}$/.test(password));
        return new Client({ host: '127.0.0.1', port: 16432, database: databaseFor(backend), user: owner ? 'poms_r0e_owner' : 'poms_r2ij_app', password,
            options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 5000, query_timeout: 10000 });
    }
    function cli(backend, operation) {
        const { childEnv } = loadManagedEnvironment({ mode: `managed-${backend}`, env: { ...process.env, POMS_ENV_FILE: `/home/wangzishi/.local/share/poms-r2ij/private/${backend}.env` }, cwd: root });
        const plan = readOnlyCliPlan(backend, operation, childEnv);
        const result = spawnSync(plan.executable, plan.args, plan.options);
        let text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        for (const secret of [childEnv.DB_PASSWORD, childEnv.JWT_SECRET]) if (typeof secret === 'string' && secret.length) text = text.replaceAll(secret, '[REDACTED]');
        const log = `tmp/rust-r2ij/schema-${backend}-${operation}.log`;
        writeFileSync(path.join(root, log), text, { flag: 'wx', mode: 0o600 });
        return { operation, launcher: plan.launcher, argv: plan.args, exitCode: result.status, signal: result.signal,
            spawnError: result.error?.code ?? null, log, rawBytesSha256: sha256(text), text };
    }
    try {
        for (const backend of ['nest', 'rust']) {
            const owner = connection(backend, true), app = connection(backend, false);
            const copy = { backend, database: databaseFor(backend), status: 'capture-incomplete', phase: 'connection' };
            report.copies.push(copy);
            try {
                await owner.connect(); await verifyConnection(owner, databaseFor(backend), true);
                await app.connect(); await verifyConnection(app, databaseFor(backend));
                for (const client of [owner, app]) {
                    assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only, 'on');
                    await client.query('SET search_path=poms,public');
                }
                copy.phase = 'before-catalog';
                const before = await catalog(app);
                const beforePath = `tmp/rust-r2ij/schema-${backend}-before.json`;
                writeFileSync(path.join(root, beforePath), JSON.stringify(before, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
                copy.before = { path: beforePath, rawBytesSha256: sha256(readFileSync(path.join(root, beforePath))) };
                copy.catalogSha256 = digest(before); assert.equal(before.migrations.length, 92);
                copy.phase = 'visibility';
                const visibility = {};
                copy.visibility = visibility;
                for (const [key, client] of [['owner', owner], ['app', app]])
                    visibility[key] = (await client.query("select count(*)::int as count from information_schema.constraint_column_usage where table_schema='poms'")).rows[0].count;
                const metadata = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'text'));
                copy.phase = 'migration-check';
                const check = cli(backend, 'migration-check'); copy.check = metadata(check);
                copy.phase = 'schema-dump';
                const dump = cli(backend, 'schema-dump'); copy.dump = metadata(dump);
                copy.phase = 'after-catalog';
                const after = await catalog(app);
                const afterPath = `tmp/rust-r2ij/schema-${backend}-after.json`;
                writeFileSync(path.join(root, afterPath), JSON.stringify(after, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
                copy.after = { path: afterPath, rawBytesSha256: sha256(readFileSync(path.join(root, afterPath))) };
                copy.catalogUnchanged = digest(before) === digest(after);
                assert.deepEqual(after, before);
                copy.phase = 'classification';
                const classification = classifyObservation({ check, dump, before, visibility, baseline });
                Object.assign(copy, classification);
                assert(!check.spawnError && !dump.spawnError && !check.signal && !dump.signal);
                assert.equal(dump.exitCode, 0); assert([0, 1].includes(check.exitCode));
                copy.phase = 'complete';
            } finally { await Promise.allSettled([owner.end(), app.end()]); }
        }
        report.result = report.copies.some(copy => copy.status === 'failed-with-classification-required') ? 'classification-required' : 'observed';
    } catch (error) { report.result = 'fail'; report.failureReason = error.name; process.exitCode = 1; }
    finally {
        try { report.sourceFilesAfter = sourceHashes(); assert.deepEqual(report.sourceFilesAfter, report.sourceFiles); validateSource(); report.sourcesUnchanged = true; }
        catch { report.sourcesUnchanged = false; report.result = 'fail'; process.exitCode = 1; }
        try { report.installedCliAfter = installedCli(); assert.deepEqual(report.installedCliAfter, report.installedCli); report.installedCliUnchanged = true; }
        catch { report.installedCliUnchanged = false; report.result = 'fail'; process.exitCode = 1; }
        report.finishedAt = new Date().toISOString(); writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    console.log(JSON.stringify({ result: report.result, copies: report.copies.map(copy => ({ backend: copy.backend, status: copy.status, phase: copy.phase, checkExit: copy.check?.exitCode, dumpExit: copy.dump?.exitCode, catalogUnchanged: copy.catalogUnchanged })) }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
