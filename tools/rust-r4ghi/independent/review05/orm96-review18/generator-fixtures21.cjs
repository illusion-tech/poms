const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const installed = createRequire(path.join(root, 'package.json'));
const ts = installed('typescript');
const { defineEntity } = installed('@mikro-orm/core');
const { MikroORM, SchemaComparator } = installed('@mikro-orm/postgresql');
const source = fs.readFileSync(path.join(__dirname, 'scalar-default-generator-candidate/apps/poms-api/src/app/core/persistence/poms-schema-generator.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const moduleValue = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(installed, moduleValue, moduleValue.exports);
const { PomsSchemaGenerator } = moduleValue.exports;

function fixture() {
    const p = defineEntity.properties;
    const TargetSchema = defineEntity({
        name: 'DefaultFixtureTarget', schema: 'poms', tableName: 'default_fixture_target',
        uniques: [{ properties: ['id', 'tenantId'] }, { properties: ['code', 'tenantId'] }],
        properties: { id: p.uuid().primary(), tenantId: p.uuid().fieldName('tenant_id'), code: p.string().length(8) }
    });
    const Target = TargetSchema.class;
    const ChildSchema = defineEntity({
        name: 'DefaultFixtureChild', schema: 'poms', tableName: 'default_fixture_child',
        properties: {
            id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
            tenantId: p.uuid().nullable().fieldName('tenant_id'),
            code: p.string().length(8).defaultRaw("'fixed'::character varying"),
            scope: () => p.manyToOne(Target).mapToPk().joinColumns('id', 'tenant_id').referencedColumnNames('id', 'tenant_id').columnTypes('uuid', 'uuid').ownColumns().hidden().hydrate(false).nullable(),
            codeScope: () => p.manyToOne(Target).mapToPk().joinColumns('code', 'tenant_id').referencedColumnNames('code', 'tenant_id').columnTypes('varchar(8)', 'uuid').ownColumns().hidden().hydrate(false).nullable(),
            single: () => p.manyToOne(Target).mapToPk().joinColumns('single_id').referencedColumnNames('id').defaultRaw('gen_random_uuid()').nullable(),
            owned: () => p.manyToOne(Target).mapToPk().joinColumns('owned_id', 'owned_tenant_id').referencedColumnNames('id', 'tenant_id').columnTypes('uuid', 'uuid').ownColumns('owned_id', 'owned_tenant_id').defaultRaw('gen_random_uuid()').nullable()
        }
    });
    return [TargetSchema, ChildSchema];
}

async function build(useExtension) {
    const orm = await MikroORM.init({ entities: fixture(), dbName: 'offline_fixtures_no_database', connect: false, ensureDatabase: false, metadataCache: { enabled: false }, schema: 'poms', extensions: useExtension ? [PomsSchemaGenerator] : [] });
    try {
        if (useExtension) assert.ok(orm.schema instanceof PomsSchemaGenerator);
        const target = orm.schema.getTargetSchema();
        const table = target.getTable('poms.default_fixture_child');
        const output = JSON.parse(JSON.stringify(target.toJSON()));
        if (useExtension) {
            assert.equal(table.getColumn('id').default, 'gen_random_uuid()');
            assert.equal(table.getColumn('code').default, "'fixed'");
            assert.equal(table.getColumn('tenant_id').default, undefined);
            assert.equal(table.getColumn('single_id').default, 'gen_random_uuid()');
            assert.equal(table.getColumn('owned_id').default, 'gen_random_uuid()');
            assert.equal(table.getColumn('owned_tenant_id').default, 'gen_random_uuid()');
            const wrong = orm.schema.getTargetSchema();
            wrong.getTable('poms.default_fixture_child').getColumn('id').default = null;
            const comparator = new SchemaComparator(orm.em.getDriver().getPlatform());
            const diff = comparator.compare(wrong, target);
            assert.ok(diff.changedTables['poms.default_fixture_child'].changedColumns.id.changedProperties.has('default'));
            const proposedSQL = orm.schema.diffToSQL(diff, { wrap: false, safe: false, dropTables: false });
            assert.match(proposedSQL, /alter column "id" set default gen_random_uuid\(\)/);
            fs.writeFileSync(path.join(__dirname, 'generator-fixture-default-diff21.sql.bin'), proposedSQL);
        }
        return output;
    } finally { await orm.close(); }
}

async function main() {
    const baseline = await build(false);
    const candidate = await build(true);
    const before = baseline.tables.find((t) => t.name === 'default_fixture_child');
    const after = candidate.tables.find((t) => t.name === 'default_fixture_child');
    assert.equal(before.columns.id.default, null);
    assert.equal(before.columns.code.default, null);
    assert.deepEqual(before.foreignKeys, after.foreignKeys);
    assert.deepEqual(before.indexes, after.indexes);
    assert.deepEqual(Object.keys(before.columns), Object.keys(after.columns));
    fs.writeFileSync(path.join(__dirname, 'generator-fixtures21.json'), JSON.stringify({
        kind: 'actual-MikroORM7-offline-schema-extension-positive-and-negative-fixtures',
        supportedExtensionActuallyActive: true, declaredUUIDDefaultRestored: true,
        declaredNonUUIDLiteralDefaultRestoredExactly: true, noDefaultOnSharedOtherFKColumn: true,
        singleColumnRelationOutsideScopeUnchanged: true, ownedCompositeRelationOutsideScopeUnchanged: true,
        FKAndIndexAndColumnOrderPreserved: true, actualComparatorStillDetectsMissingDefault: true,
        generatedFixSQLWasNotExecuted: true, baseline, candidate, DBConnected: false, SQLExecuted: false,
        G3Certified: false, G4Certified: false
    }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: true, actualMikroORM7: true, positiveAndNegativeCases: 7, SQLExecuted: false }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
