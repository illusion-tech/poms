import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { catalog, catalogQueries, classifyObservation, readOnlyCliPlan, schemaRunPlan } from './schema-check.mjs';

const env = { DB_DATABASE: 'poms_r2c_nest', DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_USER: 'poms_r2c_app' };
function observed() {
    const before = { tables: [{ relname: 'original' }], columns: [], constraints: [{ relname: 'original', conname: 'same_check', definition: 'CHECK (id IS NOT NULL)' }], indexes: [], migrations: [], triggers: [] };
    const visibility = { owner: 541, app: 0 };
    const baseline = { schema: { copies: [{ backend: 'nest', catalogSha256: createHash('sha256').update(JSON.stringify(before)).digest('hex'), sameNamedChecks: 1, visibility }] } };
    return { before, visibility, baseline, check: { exitCode: 1, text: 'Changes detected. Please create migration to update schema.' },
        dump: { exitCode: 0, text: 'alter table "poms"."original" add constraint "same_check" check (id is not null);\ncomment on column "poms"."lead_score_override"."status" is \'existing comment\';' } };
}

test('original Nx migration-check bypasses cache and child PG sessions are read-only', () => {
    const plan = readOnlyCliPlan('nest', 'migration-check', env);
    assert.deepEqual(plan.args.slice(1), ['run', 'poms-api:migration-check', '--skip-nx-cache']);
    assert.equal(plan.options.env.PGOPTIONS, '-c default_transaction_read_only=on');
    assert.equal(plan.options.shell, false); assert.equal(plan.options.windowsHide, true);
    const dump = readOnlyCliPlan('nest', 'schema-dump', env);
    assert.deepEqual(dump.args.slice(1), ['schema:update', '--dump', '--config', 'apps/poms-api/src/mikro-orm.config.ts']);
    assert(!dump.args.includes('--run'));
});

test('only an explicit second-attempt tag selects the direct launcher and a separate report', () => {
    assert.deepEqual(schemaRunPlan([]), { tag: 'initial', suffix: '', launcher: 'original-nx', report: 'tmp/rust-r2c/schema-check.json' });
    assert.deepEqual(schemaRunPlan(['--run-tag=2']), { tag: '2', suffix: '-2', launcher: 'installed-locked-mikro-orm', report: 'tmp/rust-r2c/schema-check-2.json' });
    for (const args of [['--run-tag=1'], ['--run-tag=3'], ['--run-tag=../../old'], ['--run-tag', '2'], ['--run-tag=2', '--force']])
        assert.throws(() => schemaRunPlan(args));
});

test('second migration check directly uses the exact installed locked CLI with original target config', () => {
    const plan = readOnlyCliPlan('nest', 'migration-check', env, 'installed-locked-mikro-orm');
    assert.deepEqual(plan.args.slice(1), ['migration:check', '--config', 'apps/poms-api/src/mikro-orm.config.ts']);
    assert(plan.args[0].endsWith('cli.js')); assert.equal(plan.executable, process.execPath);
    assert.equal(plan.launcher.kind, 'installed-locked-mikro-orm');
    assert.equal(plan.launcher.originalTargetCommand, 'corepack pnpm exec mikro-orm migration:check');
    assert.equal(plan.launcher.originalTargetValidated, true);
    assert.equal(plan.launcher.installedCli.version, '7.0.11');
    assert.match(plan.launcher.installedCli.entrySha256, /^[0-9a-f]{64}$/);
    assert.match(plan.launcher.substitution, /did not reach migration:check/);
    assert.equal(plan.options.env.MIKRO_ORM_CLI_TS_CONFIG_PATH, 'tsconfig.base.json');
    assert.equal(plan.options.env.PGOPTIONS, '-c default_transaction_read_only=on');
    assert(!plan.args.slice(1).some((arg) => /pnpm|corepack|schema:update/.test(arg)));
});

test('foreign databases, PG17 port, owner and arbitrary operation/options are refused before spawn', () => {
    for (const patch of [{ DB_DATABASE: 'poms_r2b_nest' }, { DB_DATABASE: 'poms_r2c_rust' }, { DB_PORT: '5432' },
        { DB_HOST: 'localhost' }, { DB_USER: 'poms_r0e_owner' }, { PGOPTIONS: '-c role=owner' }]) {
        assert.throws(() => readOnlyCliPlan('nest', 'migration-check', { ...env, ...patch }));
    }
    assert.throws(() => readOnlyCliPlan('nest', 'schema:update', env));
    assert.throws(() => readOnlyCliPlan('nest', 'migration-check', env, 'pnpm-ignore-security'));
});

test('catalog reads only six metadata sets inside a rolled-back read-only transaction', async () => {
    const calls = [];
    const result = await catalog({ async query(sql) { calls.push(sql); return { rows: [{ metadata: true }] }; } });
    assert.equal(calls[0], 'BEGIN READ ONLY'); assert.equal(calls.at(-1), 'ROLLBACK');
    assert.deepEqual(Object.keys(result), Object.keys(catalogQueries));
    assert(calls.slice(1, -1).every((sql) => /^select /i.test(sql)));
});

test('catalog failures still roll back; no proposed SQL is submitted', async () => {
    const calls = [];
    await assert.rejects(catalog({ async query(sql) { calls.push(sql); if (sql === catalogQueries.columns) throw new Error('synthetic'); return { rows: [] }; } }));
    assert.equal(calls.at(-1), 'ROLLBACK');
    assert(!calls.some((sql) => /^(?:alter|create|drop|insert|update|delete)\b/i.test(sql)));
});

test('matching archived catalog and measured visibility classify legacy failures without claiming clean', () => {
    const result = classifyObservation(observed());
    assert.equal(result.status, 'failed-with-classification');
    assert.equal(result.proposedSqlExecuted, false); assert.equal(result.allCheckExpressionsCompared, false);
    assert.equal(result.classification.length, 2);
});

test('new catalog, missing checks, elevated visibility, unknown DDL and tool failures remain unclassified', () => {
    for (const modify of [
        (value) => value.before.tables.push({ relname: 'new_table' }),
        (value) => { value.before.constraints = []; },
        (value) => { value.visibility = { owner: 541, app: 541 }; },
        (value) => { value.dump.text += '\ncreate table "unexpected" (id int);'; },
        (value) => { value.check.text = 'tool startup failed'; },
        (value) => { value.check.exitCode = null; },
        (value) => { value.check.spawnError = 'ETIMEDOUT'; },
        (value) => { value.check.signal = 'SIGTERM'; },
        (value) => { value.dump.spawnError = 'ENOENT'; },
        (value) => { value.dump.exitCode = 1; }
    ]) {
        const value = observed(); modify(value);
        assert.equal(classifyObservation(value).status, 'failed-with-classification-required');
    }
});

test('a zero check exit cannot hide a nonempty proposed DDL dump', () => {
    const value = observed(); value.check.exitCode = 0;
    assert.equal(classifyObservation(value).status, 'failed-with-classification-required');
    value.dump.text = 'No changes required';
    assert.equal(classifyObservation(value).status, 'clean');
    value.check.spawnError = 'ETIMEDOUT';
    assert.equal(classifyObservation(value).status, 'failed-with-classification-required');
});
