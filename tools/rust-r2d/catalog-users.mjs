import assert from 'node:assert/strict';

// Source authority: the unchanged product migrations, not a generated schema or
// a successful fixture insert. The caller verifies its controlled PG15 identity
// and owns the read-only transaction. This module never connects or applies DDL.
export const USER_CATALOG_SOURCE_PATHS = Object.freeze([
    'apps/poms-api/src/migrations/Migration20260325153000_init_platform_governance_core.ts',
    'apps/poms-api/src/migrations/Migration20260405100000_extract_local_credential_and_add_verified_fields.ts',
    'apps/poms-api/src/migrations/Migration20260429140000_ex42_customer_master_data.ts',
    'apps/poms-api/src/migrations/Migration20260430120000_ex44_sales_follow_up_record.ts',
    'apps/poms-api/src/migrations/Migration20260507143000_ex64c_external_identity_binding.ts',
    'apps/poms-api/src/migrations/Migration20260507160000_ex64d_identity_provider_oauth_grant.ts',
    'apps/poms-api/src/migrations/Migration20260507173000_ex64e_external_login_ticket.ts',
    'apps/poms-api/src/migrations/Migration20260513100000_ex66b_auth_session.ts',
    'apps/poms-api/src/migrations/Migration20260610120000_ex72b_external_org_sync_persistence.ts'
]);

export const EXPECTED_USER_INCOMING_FOREIGN_KEYS = Object.freeze([
    ['poms', 'user_role_assignment', 'user_id', 'user_role_assignment_user_id_foreign', 'c'],
    ['poms', 'user_org_membership', 'user_id', 'user_org_membership_user_id_foreign', 'c'],
    ['poms', 'local_credential', 'user_id', 'local_credential_user_id_foreign', 'c'],
    ['poms', 'auth_session', 'user_id', 'auth_session_user_id_foreign', 'c'],
    ['poms', 'customer', 'owner_user_id', 'customer_owner_user_id_foreign', 'n'],
    ['poms', 'sales_follow_up_record', 'owner_user_id', 'sales_follow_up_owner_user_id_foreign', 'n'],
    ['poms', 'org_sync_run', 'requested_by', 'org_sync_run_requested_by_foreign', 'n'],
    ['poms', 'external_identity', 'poms_user_id', 'external_identity_poms_user_id_foreign', 'r'],
    ['poms', 'external_login_ticket', 'poms_user_id', 'external_login_ticket_poms_user_id_foreign', 'r'],
    ['poms', 'identity_provider_oauth_grant', 'poms_user_id', 'identity_provider_oauth_grant_poms_user_id_foreign', 'r']
].map(([source_schema, source_table, column, conname, delete_action]) => Object.freeze({
    source_schema, source_table, column, conname, delete_action
})));

// Deliberately do not filter the source namespace. An inbound FK in a new or
// foreign schema is a cleanup blocker, even when it has a familiar table name.
export async function readUserIncomingForeignKeys(client) {
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
        order by source_ns.nspname,source_table.relname,c.conname`, ['poms', 'platform_user']);
    return rows;
}

export function assertUserIncomingForeignKeys(rows) {
    assert(Array.isArray(rows), 'Missing user incoming FK catalog');
    assert.equal(rows.length, EXPECTED_USER_INCOMING_FOREIGN_KEYS.length, 'User incoming FK set changed');
    for (const expected of EXPECTED_USER_INCOMING_FOREIGN_KEYS) {
        const key = `${expected.source_schema}.${expected.source_table}.${expected.conname}`;
        const found = rows.filter((row) => `${row.source_schema}.${row.source_table}.${row.conname}` === key);
        assert.equal(found.length, 1, `Missing or duplicate user incoming FK: ${key}`);
        const [row] = found;
        assert.deepEqual(row.source_columns, [expected.column], `User FK source columns: ${key}`);
        assert.equal(row.target_schema, 'poms', `User FK target schema: ${key}`);
        assert.equal(row.target_table, 'platform_user', `User FK target table: ${key}`);
        assert.deepEqual(row.target_columns, ['id'], `User FK target columns: ${key}`);
        assert.equal(row.update_action, 'c', `User FK update action: ${key}`);
        assert.equal(row.delete_action, expected.delete_action, `User FK delete action: ${key}`);
        assert.equal(row.match_type, 's', `User FK match type: ${key}`);
        assert.equal(row.convalidated, true, `User FK validation: ${key}`);
        assert.equal(row.condeferrable, false, `User FK deferrability: ${key}`);
        assert.equal(row.condeferred, false, `User FK deferred mode: ${key}`);
    }
    return { incomingForeignKeys: rows.length, unknownForeignKeys: 0 };
}

const userColumns = [
    ['id', 'uuid', 'NO', null, 'gen_random_uuid()'],
    ['username', 'character varying', 'NO', 64, null],
    ['display_name', 'character varying', 'NO', 128, null],
    ['email', 'character varying', 'YES', 255, null],
    ['phone', 'character varying', 'YES', 64, null],
    ['avatar_url', 'character varying', 'YES', 512, null],
    ['is_active', 'boolean', 'NO', null, 'true'],
    ['primary_org_unit_id', 'uuid', 'YES', null, null],
    ['last_login_at', 'timestamp with time zone', 'YES', null, null],
    ['row_version', 'integer', 'NO', null, '1'],
    ['created_at', 'timestamp with time zone', 'NO', null, 'now()'],
    ['created_by', 'uuid', 'YES', null, null],
    ['updated_at', 'timestamp with time zone', 'NO', null, 'now()'],
    ['updated_by', 'uuid', 'YES', null, null],
    ['email_verified', 'boolean', 'NO', null, 'false'],
    ['phone_verified', 'boolean', 'NO', null, 'false']
];

const relationColumns = [
    ['status', 'character varying', 'NO', 32, "'active'::character varying"],
    ['assigned_at', 'timestamp with time zone', 'NO', null, 'now()'],
    ['assigned_by', 'uuid', 'YES', null, null],
    ['revoked_at', 'timestamp with time zone', 'YES', null, null],
    ['revoked_by', 'uuid', 'YES', null, null],
    ['change_reason', 'text', 'YES', null, null],
    ['created_at', 'timestamp with time zone', 'NO', null, 'now()'],
    ['created_by', 'uuid', 'YES', null, null]
];

const catalogs = [
    {
        table: 'platform_user',
        columns: userColumns,
        constraints: [
            ['platform_user_pkey', 'p', 'PRIMARY KEY (id)'],
            ['platform_user_username_unique', 'u', 'UNIQUE (username)'],
            ['platform_user_primary_org_unit_id_foreign', 'f', 'FOREIGN KEY (primary_org_unit_id) REFERENCES poms.org_unit(id) ON UPDATE CASCADE ON DELETE SET NULL']
        ],
        indexes: [
            ['platform_user_pkey', 'CREATE UNIQUE INDEX platform_user_pkey ON poms.platform_user USING btree (id)'],
            ['platform_user_username_unique', 'CREATE UNIQUE INDEX platform_user_username_unique ON poms.platform_user USING btree (username)'],
            ['idx_platform_user_is_active', 'CREATE INDEX idx_platform_user_is_active ON poms.platform_user USING btree (is_active)'],
            ['idx_platform_user_primary_org_unit_id', 'CREATE INDEX idx_platform_user_primary_org_unit_id ON poms.platform_user USING btree (primary_org_unit_id)']
        ]
    },
    {
        table: 'user_role_assignment',
        columns: [
            ['id', 'uuid', 'NO', null, 'gen_random_uuid()'],
            ['user_id', 'uuid', 'NO', null, null],
            ['role_id', 'uuid', 'NO', null, null],
            ...relationColumns
        ],
        constraints: [
            ['user_role_assignment_pkey', 'p', 'PRIMARY KEY (id)'],
            ['user_role_assignment_user_id_foreign', 'f', 'FOREIGN KEY (user_id) REFERENCES poms.platform_user(id) ON UPDATE CASCADE ON DELETE CASCADE'],
            ['user_role_assignment_role_id_foreign', 'f', 'FOREIGN KEY (role_id) REFERENCES poms.role(id) ON UPDATE CASCADE ON DELETE CASCADE']
        ],
        indexes: [
            ['user_role_assignment_pkey', 'CREATE UNIQUE INDEX user_role_assignment_pkey ON poms.user_role_assignment USING btree (id)'],
            ['idx_user_role_assignment_user_id_status', 'CREATE INDEX idx_user_role_assignment_user_id_status ON poms.user_role_assignment USING btree (user_id, status)'],
            ['idx_user_role_assignment_role_id_status', 'CREATE INDEX idx_user_role_assignment_role_id_status ON poms.user_role_assignment USING btree (role_id, status)'],
            ['uq_user_role_assignment_active', "CREATE UNIQUE INDEX uq_user_role_assignment_active ON poms.user_role_assignment USING btree (user_id, role_id) WHERE ((status)::text = 'active'::text)"]
        ]
    },
    {
        table: 'user_org_membership',
        columns: [
            ['id', 'uuid', 'NO', null, 'gen_random_uuid()'],
            ['user_id', 'uuid', 'NO', null, null],
            ['org_unit_id', 'uuid', 'NO', null, null],
            ['membership_type', 'character varying', 'NO', 32, null],
            ...relationColumns
        ],
        constraints: [
            ['user_org_membership_pkey', 'p', 'PRIMARY KEY (id)'],
            ['user_org_membership_user_id_foreign', 'f', 'FOREIGN KEY (user_id) REFERENCES poms.platform_user(id) ON UPDATE CASCADE ON DELETE CASCADE'],
            ['user_org_membership_org_unit_id_foreign', 'f', 'FOREIGN KEY (org_unit_id) REFERENCES poms.org_unit(id) ON UPDATE CASCADE ON DELETE CASCADE']
        ],
        indexes: [
            ['user_org_membership_pkey', 'CREATE UNIQUE INDEX user_org_membership_pkey ON poms.user_org_membership USING btree (id)'],
            ['idx_user_org_membership_user_id_status', 'CREATE INDEX idx_user_org_membership_user_id_status ON poms.user_org_membership USING btree (user_id, status)'],
            ['idx_user_org_membership_org_unit_id_status', 'CREATE INDEX idx_user_org_membership_org_unit_id_status ON poms.user_org_membership USING btree (org_unit_id, status)'],
            ['uq_user_org_membership_active', "CREATE UNIQUE INDEX uq_user_org_membership_active ON poms.user_org_membership USING btree (user_id, org_unit_id) WHERE ((status)::text = 'active'::text)"],
            ['uq_user_primary_org_membership_active', "CREATE UNIQUE INDEX uq_user_primary_org_membership_active ON poms.user_org_membership USING btree (user_id) WHERE (((status)::text = 'active'::text) AND ((membership_type)::text = 'primary'::text))"]
        ]
    }
];

// Normalize formatting and simple quoted identifiers only. Literal case,
// casts, parentheses, boolean grouping, operators and column order survive.
// PG15's real catalog definitions, not a hand-simplified boolean expression,
// are the expected representation of the unchanged migration SQL.
function sqlTokens(sql) {
    assert.equal(typeof sql, 'string', 'Missing catalog SQL definition');
    const tokens = [];
    let offset = 0;
    while (offset < sql.length) {
        const suffix = sql.slice(offset);
        const whitespace = /^\s+/.exec(suffix);
        if (whitespace) {
            offset += whitespace[0].length;
            continue;
        }
        const quoted = /^(?:'(?:''|[^'])*'|"(?:""|[^"])*")/.exec(suffix);
        if (quoted) {
            const token = quoted[0];
            tokens.push(/^"[a-z_][a-z0-9_]*"$/.test(token) ? token.slice(1, -1) : token);
            offset += token.length;
            continue;
        }
        assert(!suffix.startsWith("'") && !suffix.startsWith('"'), 'Invalid quoted catalog SQL');
        const word = /^[a-z_][a-z0-9_$]*/i.exec(suffix);
        if (word) {
            tokens.push(word[0].toLowerCase());
            offset += word[0].length;
            continue;
        }
        // Keep every remaining character: never discard an unexpected token.
        tokens.push(sql[offset]);
        offset++;
    }
    return tokens;
}

function namedOrder(left, right) {
    return left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0;
}

export function assertUserCatalog(tables, incomingForeignKeys) {
    assert(Array.isArray(tables), 'Missing user table catalog');
    let columnCount = 0;
    let constraintCount = 0;
    let indexCount = 0;
    for (const expected of catalogs) {
        const found = tables.filter((row) => row.table === expected.table);
        assert.equal(found.length, 1, `Missing or duplicate user table catalog: ${expected.table}`);
        const [actual] = found;
        assert(Array.isArray(actual.columns), `Missing column catalog: ${expected.table}`);
        assert(Array.isArray(actual.constraints), `Missing constraint catalog: ${expected.table}`);
        assert(Array.isArray(actual.indexes), `Missing index catalog: ${expected.table}`);
        const actualColumns = actual.columns.map((column) => [column.column_name, column.data_type,
            column.is_nullable, column.character_maximum_length,
            column.column_default === null ? null : sqlTokens(column.column_default)]);
        const expectedColumns = expected.columns.map(([name, type, nullable, length, value]) =>
            [name, type, nullable, length, value === null ? null : sqlTokens(value)]);
        assert.deepEqual(actualColumns.toSorted(namedOrder), expectedColumns.toSorted(namedOrder),
            `User columns/types/nullability/defaults differ: ${expected.table}`);
        assert.deepEqual(actual.constraints.map((row) => [row.conname, row.contype, sqlTokens(row.definition)])
            .toSorted(namedOrder), expected.constraints.map(([name, type, sql]) => [name, type, sqlTokens(sql)])
            .toSorted(namedOrder), `User constraints differ: ${expected.table}`);
        assert.deepEqual(actual.indexes.map((row) => [row.indexname, sqlTokens(row.indexdef)])
            .toSorted(namedOrder), expected.indexes.map(([name, sql]) => [name, sqlTokens(sql)])
            .toSorted(namedOrder), `User indexes differ: ${expected.table}`);
        columnCount += expected.columns.length;
        constraintCount += expected.constraints.length;
        indexCount += expected.indexes.length;
    }
    return {
        ...assertUserIncomingForeignKeys(incomingForeignKeys),
        userTables: catalogs.length,
        userColumns: columnCount,
        userConstraints: constraintCount,
        userIndexes: indexCount,
        partialUniqueIndexes: 3,
        defaultsAndVersions: 'matched-original-migrations',
        productDdlChanged: false
    };
}
