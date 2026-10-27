import assert from 'node:assert/strict';
import test from 'node:test';
import {
    EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS, assertOrgUnitCatalog,
    assertOrgUnitIncomingForeignKeys, readOrgUnitIncomingForeignKeys
} from './catalog-org-units.mjs';

function incoming() {
    return EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS.map((edge) => ({
        source_schema: edge.source_schema, source_table: edge.source_table, conname: edge.conname,
        source_columns: [edge.column], target_schema: 'poms', target_table: 'org_unit', target_columns: ['id'],
        update_action: 'c', delete_action: edge.delete_action, match_type: 's',
        convalidated: true, condeferrable: false, condeferred: false
    }));
}

function catalog() {
    const shape = [
        ['id', 'uuid', false, null, 'gen_random_uuid()'],
        ['name', 'character varying', false, 128, null], ['code', 'character varying', false, 64, null],
        ['description', 'text', true, null, null], ['parent_id', 'uuid', true, null, null],
        ['is_active', 'boolean', false, null, 'true'], ['display_order', 'integer', false, null, '0'],
        ['row_version', 'integer', false, null, '1'],
        ['created_at', 'timestamp with time zone', false, null, 'now()'], ['created_by', 'uuid', true, null, null],
        ['updated_at', 'timestamp with time zone', false, null, 'now()'], ['updated_by', 'uuid', true, null, null]
    ];
    return [{
        table: 'org_unit',
        columns: shape.map(([column_name, data_type, nullable, character_maximum_length, column_default]) => ({
            column_name, data_type, is_nullable: nullable ? 'YES' : 'NO', character_maximum_length, column_default
        })),
        constraints: [
            ['org_unit_pkey', 'p', 'PRIMARY KEY (id)'], ['org_unit_code_unique', 'u', 'UNIQUE (code)'],
            ['org_unit_parent_id_foreign', 'f', 'FOREIGN KEY (parent_id) REFERENCES poms.org_unit(id) ON UPDATE CASCADE ON DELETE SET NULL'],
            ['chk_org_unit_parent_not_self', 'c', 'CHECK (((parent_id IS NULL) OR (parent_id <> id)))']
        ].map(([conname, contype, definition]) => ({ conname, contype, definition })),
        indexes: [
            ['org_unit_pkey', 'CREATE UNIQUE INDEX org_unit_pkey ON poms.org_unit USING btree (id)'],
            ['org_unit_code_unique', 'CREATE UNIQUE INDEX org_unit_code_unique ON poms.org_unit USING btree (code)'],
            ['idx_org_unit_parent_id', 'CREATE INDEX idx_org_unit_parent_id ON poms.org_unit USING btree (parent_id)'],
            ['idx_org_unit_is_active', 'CREATE INDEX idx_org_unit_is_active ON poms.org_unit USING btree (is_active)'],
            ['idx_org_unit_parent_display_order', 'CREATE INDEX idx_org_unit_parent_display_order ON poms.org_unit USING btree (parent_id, display_order, created_at)'],
            ['uq_org_unit_parent_name_ci', "CREATE UNIQUE INDEX uq_org_unit_parent_name_ci ON poms.org_unit USING btree (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower((name)::text))"]
        ].map(([indexname, indexdef]) => ({ indexname, indexdef }))
    }];
}

test('original organization DDL includes eight incoming FKs and the restrictive authority edge', () => {
    const result = assertOrgUnitCatalog(catalog(), incoming());
    assert.equal(result.incomingForeignKeys, 8);
    assert.equal(result.organizationColumns, 12);
    assert.equal(result.productDdlChanged, false);
    assert.equal(incoming().find((edge) => edge.source_table === 'external_org_source').delete_action, 'r');
});

test('missing restrictive edge and unknown cross-schema edges are both refused', () => {
    const rows = incoming();
    assert.throws(() => assertOrgUnitIncomingForeignKeys(rows.filter((row) => row.source_table !== 'external_org_source')));
    assert.throws(() => assertOrgUnitIncomingForeignKeys([...rows, { ...rows[0], source_schema: 'foreign', conname: 'foreign_reference' }]));
    assert.throws(() => assertOrgUnitIncomingForeignKeys(rows.map((row, index) => index === 0 ? { ...row, source_schema: 'foreign' } : row)));
});

test('FK validation, action, column, target and deferrability drift cannot pass cleanup guard', () => {
    for (const patch of [
        { convalidated: false }, { condeferrable: true }, { condeferred: true }, { update_action: 'a' },
        { delete_action: 'c' }, { source_columns: ['created_by'] }, { target_schema: 'public' },
        { target_columns: ['code'] }, { target_table: 'role' }, { match_type: 'f' }
    ]) {
        const rows = incoming();
        rows[0] = { ...rows[0], ...patch };
        assert.throws(() => assertOrgUnitIncomingForeignKeys(rows));
    }
});

test('duplicate expected edge cannot hide a missing edge', () => {
    const rows = incoming();
    rows[1] = { ...rows[0] };
    assert.throws(() => assertOrgUnitIncomingForeignKeys(rows));
});

test('version default, nullable fields and extra columns are checked independently', () => {
    for (const patch of [{ column_default: '0' }, { is_nullable: 'YES' }, { data_type: 'bigint' }]) {
        const tables = catalog();
        Object.assign(tables[0].columns.find((column) => column.column_name === 'row_version'), patch);
        assert.throws(() => assertOrgUnitCatalog(tables, incoming()));
    }
    const tables = catalog();
    tables[0].columns.push({ ...tables[0].columns[0], column_name: 'new_column' });
    assert.throws(() => assertOrgUnitCatalog(tables, incoming()));
});

test('sibling trim, partial uniqueness and a recursive check are not accepted as original DDL', () => {
    for (const transform of [
        (sql) => sql.replace('lower((name)::text)', 'lower(btrim((name)::text))'),
        (sql) => `${sql} WHERE is_active`,
        (sql) => sql.replace('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111')
    ]) {
        const tables = catalog();
        const index = tables[0].indexes.find((row) => row.indexname === 'uq_org_unit_parent_name_ci');
        index.indexdef = transform(index.indexdef);
        assert.throws(() => assertOrgUnitCatalog(tables, incoming()));
    }
    const tables = catalog();
    tables[0].constraints.push({ conname: 'new_cycle_constraint', contype: 'c', definition: 'CHECK (display_order >= 0)' });
    assert.throws(() => assertOrgUnitCatalog(tables, incoming()));
});

test('catalog reader is one parameterized read and sees source schemas beyond poms', async () => {
    const calls = [];
    const rows = incoming();
    const actual = await readOrgUnitIncomingForeignKeys({ async query(sql, params) {
        calls.push({ sql, params });
        assert.match(sql, /^select /);
        assert.doesNotMatch(sql, /\b(?:insert|update|delete|create|alter|drop|begin|commit)\b/i);
        assert.doesNotMatch(sql, /where[^;]*source_ns\.nspname\s*=/i);
        return { rows };
    } });
    assert.equal(actual, rows);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].params, ['poms', 'org_unit']);
});
