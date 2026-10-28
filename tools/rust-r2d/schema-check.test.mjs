import assert from 'node:assert/strict';
import test from 'node:test';
import { readOnlyCliPlan } from './schema-check.mjs';

const env = { DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_USER: 'poms_r2d_app', DB_DATABASE: 'poms_r2d_nest' };
test('R2D schema only selects installed locked read-only check or dump and names the launcher substitution', () => {
    for (const operation of ['migration-check', 'schema-dump']) {
        const plan = readOnlyCliPlan('nest', operation, env);
        assert.equal(plan.executable, process.execPath);
        assert.deepEqual(plan.args.slice(1), operation === 'migration-check'
            ? ['migration:check', '--config', 'apps/poms-api/src/mikro-orm.config.ts']
            : ['schema:update', '--dump', '--config', 'apps/poms-api/src/mikro-orm.config.ts']);
        assert.equal(plan.options.env.PGOPTIONS, '-c default_transaction_read_only=on');
        assert.equal(plan.options.env.MIKRO_ORM_CLI_TS_CONFIG_PATH, 'tsconfig.base.json');
        assert.equal(plan.options.shell, false); assert.equal(plan.launcher.installedCli.version, '7.0.11');
        assert(plan.launcher.substitution.includes('does not claim'));
    }
});
test('R2D schema rejects a writable command or PG17, old database, owner and ambient options before IO', () => {
    for (const patch of [{DB_PORT:'5432'}, {DB_DATABASE:'poms_r2c_nest'}, {DB_USER:'poms_r0e_owner'}, {DB_HOST:'localhost'}, {PGOPTIONS:''}])
        assert.throws(() => readOnlyCliPlan('nest', 'migration-check', {...env,...patch}));
    for (const operation of ['migration:up','migration-create','schema:update','schema-dump --run'])
        assert.throws(() => readOnlyCliPlan('nest',operation,env));
    assert.throws(() => readOnlyCliPlan('rust','migration-check',env));
});
