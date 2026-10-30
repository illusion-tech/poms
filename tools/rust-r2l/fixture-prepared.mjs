// No ORM/PG connection or DML on import. Only Root invokes the reviewed batch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { authority } from './catalog-complete.mjs';
import { columns, digest, identities, normalize, rowIdentity } from './fixture-core.mjs';
import { canonicalDefinitions } from './fixture-commission-policy.mjs';
const root = new URL('../../', import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const lf = (file) => fs.readFileSync(new URL(file, root), 'utf8').replace(/\r\n/g, '\n');
export const preparedSource = Object.freeze({
    file: 'apps/poms-api/src/seeders/database.seeder.ts', normalizedLfSha256: 'c2450781dab397c75c15f70a81bcc258967a18ee467df9befdcbe96b1ccd5fcd'
});
export const omittedIdentityPolicy = Object.freeze({
    contract_term_snapshot: Object.freeze(['source_readiness_id', 'source_baseline_id'])
});
export function expectedPreparedIdentity(table, values) {
    const row = normalize(table, values), omitted = [];
    for (const key of identities[table]) {
        if (Object.hasOwn(row, key)) continue;
        assert(omittedIdentityPolicy[table]?.includes(key) && columns.get(table).get(key).nullable, 'Unreviewed omitted immutable field: ' + table + '.' + key);
        row[key] = null; omitted.push({ table, column: key, expected: null, physicalNullableAndNoDefaultMustBeVerified: true });
    }
    return { expectedIdentity: rowIdentity(table, row), omitted };
}
export function inspectPreparedDefaultSources() {
    const sourceInput = authority.sourceInput;
    assert.equal(sha(fs.readFileSync(new URL(sourceInput.path, root))), sourceInput.sha256);
    const input = JSON.parse(lf(sourceInput.path)); assert.equal(input.migrations.length, 92);
    for (const migration of input.migrations) assert.equal(sha(lf(migration.file)), migration.normalizedLfSha256, 'Frozen migration source drift');
    const entity = 'apps/poms-api/src/app/features/contract/contract.entity.ts';
    assert.equal(sha(lf(entity)), 'bbf371f538ad03a83df0f5e2d49663e416a1de79f334241a7075753c68ee71c6');
    const migration = input.migrations.find(({ file }) => file.endsWith('Migration20260422031100_add_contract_term_snapshot_core_fields.ts'));
    assert(migration);
    return {
        migrations: { sourceInput: { ...sourceInput }, verifiedCount: input.migrations.length, sourceHead: input.sourceHead },
        exactFieldSource: { ...migration }, entity: { file: entity, normalizedLfSha256: sha(lf(entity)) },
        actualNoConnectionMetadataObservation: {
            file: 'tmp/rust-r2l/metadata-export01/schema-input.json', sha256: '5462742271f209248ad78592b9a2bf4966aa5be6d5dab1d874c6f18e49ba8c64',
            reportSha256: 'd459f48999d812aa66833cb336e24db7c287c2fc06edda186cefd2c00c5eba91',
            table: 'contract_term_snapshot', properties: ['sourceReadinessId', 'sourceBaselineId'], nullable: true, defaultOrDefaultRawPresent: false,
            boundary: 'Recorded SDK connect:false metadata only; not evidence of the current PostgreSQL defaults'
        },
        physicalVerificationRequiredBeforeInsert: true
    };
}
export async function validateCommissionPreparedPlan(plan) {
    assert.equal(plan?.kind, 'commission-prepared-original-source-typed-rows');
    assert.equal(plan.result, 'source-plan-not-executed');
    assert.equal(plan.source.file, preparedSource.file);
    assert.equal(plan.source.normalizedLfSha256, preparedSource.normalizedLfSha256);
    assert.equal(sha(lf(preparedSource.file)), preparedSource.normalizedLfSha256);
    const { buildCommissionPreparedRows } = await import('./commission-prepared-source.mjs');
    const rebuilt = await buildCommissionPreparedRows({
        uuidMappings: Object.fromEntries(plan.mappings.map(({ from, to }) => [from, to])),
        names: Object.fromEntries(plan.textMappings.map(({ field, to }) => [field, to])), logicalIds: plan.explicitLogicalIds
    });
    assert.equal(digest(plan), digest(rebuilt), 'Prepared source/column/value/mapping plan drift');
    assert.equal(plan.rows.length, 18); assert.equal(new Set(plan.rows.map(({ table }) => table)).size, 15);
    assert.deepEqual(Object.values(plan.readonlyBorrowedDefinitions).sort(), canonicalDefinitions.map(({ id }) => id).sort());
    const rows = plan.rows.map((entry) => {
        assert.equal(entry.provenance, 'prepared-original-seeder-source-not-Native-generated');
        assert.deepEqual(Object.keys(entry.values), entry.source.columns, 'Original INSERT column projection changed');
        return { ...structuredClone(entry), ...expectedPreparedIdentity(entry.table, entry.values) };
    });
    return { rows, sourcePlanSha256: digest(plan), defaultSources: inspectPreparedDefaultSources(),
        sourceBoundary: { historicalProposal01PreparedTables: 14, epoch02PreparedTables: 15, preparedRows: 18, preparedFundingReceipt: { table: 'receipt_record', amount: 100000, provenance: 'original named seeder literal INSERT; not an actual Native receipt producer' }, retentionReceiptRequiresSeparateActualCreateConfirm: true } };
}
export async function verifyPreparedPhysicalDefaults(client, rows) {
    const required = [...new Map(rows.flatMap((entry) => entry.omitted ?? []).map((item) => [item.table + '.' + item.column, item])).values()];
    const evidence = [];
    for (const item of required) {
        const result = await client.query(`select c.relname as table_name,a.attname as column_name,not a.attnotnull as nullable,
pg_get_expr(d.adbin,d.adrelid) as default_expression from pg_attribute a join pg_class c on c.oid=a.attrelid
join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where n.nspname='poms' and c.relname=$1 and a.attname=$2 and a.attnum>0 and not a.attisdropped`, [item.table, item.column]);
        assert.equal(result.rows.length, 1, 'Missing physical omitted-identity column');
        const actual = result.rows[0]; assert.equal(actual.table_name, item.table); assert.equal(actual.column_name, item.column);
        assert.equal(actual.nullable, true, 'Omitted identity is not physically nullable');
        assert.equal(actual.default_expression, null, 'Omitted identity has a physical SQL default');
        evidence.push({ ...item, kind: 'actual-readonly-pg-attribute-default-expression', actual: structuredClone(actual), INSERTColumnAdded: false });
    }
    return evidence;
}
