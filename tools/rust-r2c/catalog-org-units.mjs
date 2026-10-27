import assert from 'node:assert/strict';

// These are the existing product migration edges, including the RESTRICT
// source-authority edge. Fixture cleanup must refuse edges outside this set.
export const EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS = Object.freeze([
    ['poms', 'org_unit', 'parent_id', 'org_unit_parent_id_foreign', 'n'],
    ['poms', 'platform_user', 'primary_org_unit_id', 'platform_user_primary_org_unit_id_foreign', 'n'],
    ['poms', 'user_org_membership', 'org_unit_id', 'user_org_membership_org_unit_id_foreign', 'c'],
    ['poms', 'customer', 'owner_org_id', 'customer_owner_org_id_foreign', 'n'],
    ['poms', 'sales_follow_up_record', 'owner_org_id', 'sales_follow_up_owner_org_id_foreign', 'n'],
    ['poms', 'external_org_source', 'authoritative_org_unit_id', 'external_org_source_authoritative_org_unit_id_foreign', 'r'],
    ['poms', 'external_department_mapping', 'org_unit_id', 'external_department_mapping_org_unit_id_foreign', 'n'],
    ['poms', 'org_sync_diff_item', 'org_unit_id', 'org_sync_diff_item_org_unit_id_foreign', 'n']
].map(([source_schema, source_table, column, conname, delete_action]) => Object.freeze({
    source_schema, source_table, column, conname, delete_action
})));

// The caller owns connection identity checks and its read-only transaction.
// Source schema is deliberately not filtered: an unexpected schema's FK must
// also block cleanup instead of silently changing a foreign row on deletion.
export async function readOrgUnitIncomingForeignKeys(client) {
    const { rows } = await client.query(`select source_ns.nspname as source_schema,
        source_table.relname as source_table,c.conname,
        array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,position)
            join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.position) as source_columns,
        target_ns.nspname as target_schema,target_table.relname as target_table,
        array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,position)
            join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.position) as target_columns,
        c.confupdtype::text as update_action,c.confdeltype::text as delete_action,
        c.confmatchtype::text as match_type,c.convalidated,c.condeferrable,c.condeferred,
        pg_get_constraintdef(c.oid) as definition
        from pg_constraint c
        join pg_class source_table on source_table.oid=c.conrelid
        join pg_namespace source_ns on source_ns.oid=source_table.relnamespace
        join pg_class target_table on target_table.oid=c.confrelid
        join pg_namespace target_ns on target_ns.oid=target_table.relnamespace
        where c.contype='f' and target_ns.nspname=$1 and target_table.relname=$2
        order by source_ns.nspname,source_table.relname,c.conname`, ['poms', 'org_unit']);
    return rows;
}

export function assertOrgUnitIncomingForeignKeys(rows) {
    assert(Array.isArray(rows), 'Missing organization incoming FK catalog');
    assert.equal(rows.length, EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS.length, 'Organization incoming FK set changed');
    const names = new Set();
    for (const expected of EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS) {
        const key = `${expected.source_schema}.${expected.source_table}.${expected.conname}`;
        const found = rows.filter((row) => `${row.source_schema}.${row.source_table}.${row.conname}` === key);
        assert.equal(found.length, 1, `Missing or duplicate organization incoming FK: ${key}`);
        assert.equal(names.has(key), false, 'Duplicate incoming FK expectation');
        names.add(key);
        const [row] = found;
        assert.deepEqual(row.source_columns, [expected.column], `Organization FK columns: ${key}`);
        assert.equal(row.target_schema, 'poms', `Organization FK target schema: ${key}`);
        assert.equal(row.target_table, 'org_unit', `Organization FK target table: ${key}`);
        assert.deepEqual(row.target_columns, ['id'], `Organization FK target columns: ${key}`);
        assert.equal(row.update_action, 'c', `Organization FK update action: ${key}`);
        assert.equal(row.delete_action, expected.delete_action, `Organization FK delete action: ${key}`);
        assert.equal(row.match_type, 's', `Organization FK match type: ${key}`);
        assert.equal(row.convalidated, true, `Organization FK validation: ${key}`);
        assert.equal(row.condeferrable, false, `Organization FK deferrability: ${key}`);
        assert.equal(row.condeferred, false, `Organization FK deferred mode: ${key}`);
    }
    return { incomingForeignKeys: rows.length, unknownForeignKeys: 0 };
}

const columns = [
    ['id', 'uuid', 'NO', null, 'gen_random_uuid()'],
    ['name', 'character varying', 'NO', 128, null],
    ['code', 'character varying', 'NO', 64, null],
    ['description', 'text', 'YES', null, null],
    ['parent_id', 'uuid', 'YES', null, null],
    ['is_active', 'boolean', 'NO', null, 'true'],
    ['display_order', 'integer', 'NO', null, '0'],
    ['row_version', 'integer', 'NO', null, '1'],
    ['created_at', 'timestamp with time zone', 'NO', null, 'now()'],
    ['created_by', 'uuid', 'YES', null, null],
    ['updated_at', 'timestamp with time zone', 'NO', null, 'now()'],
    ['updated_by', 'uuid', 'YES', null, null]
];

// Ignore only catalog pretty-printing, quotes and grouping parentheses. Casts,
// operators, argument order, predicates and literal values must still match.
function sqlShape(text) {
    assert.equal(typeof text, 'string', 'Missing catalog SQL definition');
    return text.replace(/["()\s]/g, '').toLowerCase();
}

export function assertOrgUnitCatalog(tables, incomingForeignKeys) {
    const found = tables.filter((table) => table.table === 'org_unit');
    assert.equal(found.length, 1, 'Missing or duplicate org_unit catalog');
    const [org] = found;
    const actualColumns = org.columns.map((column) => [column.column_name, column.data_type,
        column.is_nullable, column.character_maximum_length, column.column_default]);
    assert.deepEqual(actualColumns.toSorted((a, b) => a[0].localeCompare(b[0])),
        columns.toSorted((a, b) => a[0].localeCompare(b[0])), 'Organization columns/types/nullability/defaults differ');
    const expectedConstraints = [
        ['org_unit_pkey', 'p', 'PRIMARY KEY (id)'],
        ['org_unit_code_unique', 'u', 'UNIQUE (code)'],
        ['org_unit_parent_id_foreign', 'f', 'FOREIGN KEY (parent_id) REFERENCES poms.org_unit(id) ON UPDATE CASCADE ON DELETE SET NULL'],
        ['chk_org_unit_parent_not_self', 'c', 'CHECK ((parent_id IS NULL) OR (parent_id <> id))']
    ];
    assert.deepEqual(org.constraints.map((row) => [row.conname, row.contype, sqlShape(row.definition)])
        .toSorted((a, b) => a[0].localeCompare(b[0])),
    expectedConstraints.map(([name, type, definition]) => [name, type, sqlShape(definition)])
        .toSorted((a, b) => a[0].localeCompare(b[0])), 'Organization constraints differ');
    const expectedIndexes = [
        ['org_unit_pkey', 'CREATE UNIQUE INDEX org_unit_pkey ON poms.org_unit USING btree (id)'],
        ['org_unit_code_unique', 'CREATE UNIQUE INDEX org_unit_code_unique ON poms.org_unit USING btree (code)'],
        ['idx_org_unit_parent_id', 'CREATE INDEX idx_org_unit_parent_id ON poms.org_unit USING btree (parent_id)'],
        ['idx_org_unit_is_active', 'CREATE INDEX idx_org_unit_is_active ON poms.org_unit USING btree (is_active)'],
        ['idx_org_unit_parent_display_order', 'CREATE INDEX idx_org_unit_parent_display_order ON poms.org_unit USING btree (parent_id, display_order, created_at)'],
        ['uq_org_unit_parent_name_ci', "CREATE UNIQUE INDEX uq_org_unit_parent_name_ci ON poms.org_unit USING btree (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower((name)::text))"]
    ];
    assert.deepEqual(org.indexes.map((row) => [row.indexname, sqlShape(row.indexdef)])
        .toSorted((a, b) => a[0].localeCompare(b[0])),
    expectedIndexes.map(([name, definition]) => [name, sqlShape(definition)])
        .toSorted((a, b) => a[0].localeCompare(b[0])), 'Organization indexes differ');
    return {
        ...assertOrgUnitIncomingForeignKeys(incomingForeignKeys),
        organizationTables: 1, organizationColumns: columns.length, organizationIndexes: expectedIndexes.length,
        defaultsAndVersions: 'matched-original-migrations', productDdlChanged: false
    };
}
