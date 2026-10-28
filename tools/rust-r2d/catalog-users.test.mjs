import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import {
    EXPECTED_USER_INCOMING_FOREIGN_KEYS,
    USER_CATALOG_SOURCE_PATHS,
    assertUserCatalog,
    assertUserIncomingForeignKeys,
    readUserIncomingForeignKeys
} from './catalog-users.mjs';

const repository = new URL('../../', import.meta.url);
const migrationDirectory = new URL('apps/poms-api/src/migrations/', repository);
const userTableNames = new Set(['platform_user', 'user_role_assignment', 'user_org_membership']);

// Build test fixtures from unchanged migration SQL, not the implementation's
// expected column/index arrays. This is a source-to-guard unit check only: it is
// deliberately not reported as a real PostgreSQL catalog observation.
function statements(path) {
    const source = readFileSync(new URL(path, repository), 'utf8').split('override async down')[0];
    return [...source.matchAll(/`([^`]*?)`/gs)].map((match) => match[1]);
}

function columnDefinition(name, sql) {
    const match = /^(uuid|varchar\((\d+)\)|text|boolean|integer|timestamptz) (not null|null)(?: default (.+))?$/.exec(sql.trim());
    assert(match, `Unrecognized source column ${name}: ${sql}`);
    const data_type = { uuid: 'uuid', text: 'text', boolean: 'boolean', integer: 'integer', timestamptz: 'timestamp with time zone' }[match[1]] ?? 'character varying';
    const rawDefault = match[4] ?? null;
    return {
        column_name: name,
        data_type,
        is_nullable: match[3] === 'null' ? 'YES' : 'NO',
        character_maximum_length: match[2] ? Number(match[2]) : null,
        column_default: rawDefault === "'active'" ? "'active'::character varying" : rawDefault
    };
}

function constraintDefinition(sql) {
    const bare = sql.replaceAll('"', '');
    const type = bare.startsWith('primary key') ? 'p' : bare.startsWith('unique') ? 'u' : bare.startsWith('foreign key') ? 'f' : null;
    assert(type, `Unrecognized source constraint: ${sql}`);
    return { contype: type, definition: bare };
}

function sourceCatalog() {
    const tables = new Map();
    const sql = USER_CATALOG_SOURCE_PATHS.flatMap(statements);
    for (const statement of sql) {
        const create = /^create table "poms"\."([^"]+)" \((.+)\);$/s.exec(statement);
        if (!create || !userTableNames.has(create[1])) continue;
        const table = { table: create[1], columns: [], constraints: [], indexes: [] };
        for (const part of create[2].split(', ')) {
            const column = /^"([^"]+)" (.+)$/s.exec(part);
            if (column) {
                table.columns.push(columnDefinition(column[1], column[2]));
                continue;
            }
            const primary = /^constraint "([^"]+)" (primary key \("([^"]+)"\))$/.exec(part);
            assert(primary, `Unrecognized source table clause: ${part}`);
            table.constraints.push({ conname: primary[1], ...constraintDefinition(primary[2]) });
            table.indexes.push({ indexname: primary[1], indexdef: `CREATE UNIQUE INDEX ${primary[1]} ON poms.${table.table} USING btree (${primary[3]})` });
        }
        tables.set(table.table, table);
    }
    for (const statement of sql) {
        const column = /^alter table "poms"\."([^"]+)" add column "([^"]+)" (.+);$/s.exec(statement);
        if (column && tables.has(column[1])) tables.get(column[1]).columns.push(columnDefinition(column[2], column[3]));
        const constraint = /^alter table "poms"\."([^"]+)" add constraint "([^"]+)" (.+);$/s.exec(statement);
        if (constraint && tables.has(constraint[1])) {
            const definition = constraintDefinition(constraint[3]);
            const table = tables.get(constraint[1]);
            table.constraints.push({ conname: constraint[2], ...definition });
            if (definition.contype === 'u') {
                const columns = /^unique \((.+)\)$/.exec(definition.definition)[1];
                table.indexes.push({ indexname: constraint[2], indexdef: `CREATE UNIQUE INDEX ${constraint[2]} ON poms.${table.table} USING btree (${columns})` });
            }
        }
        const index = /^create (unique )?index "([^"]+)" on "poms"\."([^"]+)" \((.+?)\)(?: where (.+))?;$/s.exec(statement);
        if (index && tables.has(index[3])) {
            let indexdef = `CREATE ${index[1] ? 'UNIQUE ' : ''}INDEX ${index[2]} ON poms.${index[3]} USING btree (${index[4].replaceAll('"', '')})`;
            if (index[5]) {
                const parts = index[5].split(' and ').map((predicate) => {
                    const comparison = /^"([^"]+)" = ('[^']+')$/.exec(predicate);
                    assert(comparison, `Unrecognized partial source index: ${predicate}`);
                    return `((${comparison[1]})::text = ${comparison[2]}::text)`;
                });
                indexdef += ` WHERE ${parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`}`;
            }
            tables.get(index[3]).indexes.push({ indexname: index[2], indexdef });
        }
    }
    return [...tables.values()];
}

function sourceIncoming() {
    const actions = { cascade: 'c', 'set null': 'n', restrict: 'r' };
    const rows = [];
    // Scan every product migration up(), so a new inbound edge cannot be hidden
    // by failing to add its source file to USER_CATALOG_SOURCE_PATHS.
    for (const name of readdirSync(migrationDirectory).filter((file) => file.endsWith('.ts'))) {
        for (const sql of statements(`apps/poms-api/src/migrations/${name}`)) {
            if (!/references\s+"?poms"?\s*\.\s*"?platform_user"?/i.test(sql)) continue;
            const match = /^alter table "([^"]+)"\."([^"]+)" add constraint "([^"]+)" foreign key \("([^"]+)"\) references "poms"\."platform_user" \("([^"]+)"\) on update (cascade) on delete (cascade|set null|restrict);$/.exec(sql);
            assert(match, `Unsupported source incoming FK in ${name}; extend the explicit source guard first`);
            rows.push({
                source_schema: match[1], source_table: match[2], conname: match[3], source_columns: [match[4]],
                target_schema: 'poms', target_table: 'platform_user', target_columns: [match[5]],
                update_action: actions[match[6]], delete_action: actions[match[7]], match_type: 's',
                convalidated: true, condeferrable: false, condeferred: false
            });
        }
    }
    return rows;
}

const sourceTables = sourceCatalog();
const sourceEdges = sourceIncoming();
function catalog() { return structuredClone(sourceTables); }
function incoming() { return structuredClone(sourceEdges); }

test('all current migration user columns, indexes, constraints and ten incoming edges match the guard', () => {
    assert.equal(userTableNames.size, 3);
    const actual = assertUserCatalog(catalog(), incoming());
    assert.deepEqual(actual, {
        incomingForeignKeys: 10, unknownForeignKeys: 0, userTables: 3, userColumns: 39,
        userConstraints: 9, userIndexes: 13, partialUniqueIndexes: 3,
        defaultsAndVersions: 'matched-original-migrations', productDdlChanged: false
    });
    assert.deepEqual(incoming().reduce((counts, edge) => ({ ...counts, [edge.delete_action]: (counts[edge.delete_action] ?? 0) + 1 }), {}), { c: 4, n: 3, r: 3 });
    assert.equal(EXPECTED_USER_INCOMING_FOREIGN_KEYS.every(Object.isFrozen), true);
    assert.equal(Object.isFrozen(EXPECTED_USER_INCOMING_FOREIGN_KEYS), true);
});

test('catalog row ordering and harmless SQL whitespace/identifier quotes do not change semantics', () => {
    const tables = catalog().toReversed();
    const before = structuredClone(tables);
    for (const table of tables) {
        table.columns.reverse();
        table.constraints.reverse();
        table.indexes.reverse();
        for (const constraint of table.constraints) {
            constraint.definition = constraint.definition.replaceAll('poms.', '"poms".').replace(/\bid\b/g, '"id"').replaceAll(' ', '\n  ');
        }
    }
    assert.equal(assertUserCatalog(tables, incoming().toReversed()).incomingForeignKeys, 10);
    const snapshot = structuredClone(tables);
    assertUserCatalog(tables, incoming());
    assert.deepEqual(tables, snapshot, 'Catalog assertion must not mutate caller facts');
    assert.notDeepEqual(tables, before);
});

test('every incoming edge is mandatory and unknown cross-schema references fail closed', () => {
    const rows = incoming();
    for (let index = 0; index < rows.length; index++) {
        assert.throws(() => assertUserIncomingForeignKeys(rows.filter((_, position) => position !== index)));
    }
    assert.throws(() => assertUserIncomingForeignKeys([...rows, { ...rows[0], source_schema: 'foreign', conname: 'external_owner' }]));
    const sameCount = incoming();
    sameCount[0].source_schema = 'foreign';
    assert.throws(() => assertUserIncomingForeignKeys(sameCount));
    const duplicate = incoming();
    duplicate[1] = { ...duplicate[0] };
    assert.throws(() => assertUserIncomingForeignKeys(duplicate));
});

test('incoming FK target, columns, actions, validity, matching and deferral are all checked', () => {
    for (const patch of [
        { source_columns: ['created_by'] }, { source_columns: ['user_id', 'created_by'] },
        { target_schema: 'public' }, { target_table: 'role' }, { target_columns: ['username'] },
        { update_action: 'a' }, { delete_action: 'a' }, { match_type: 'f' },
        { convalidated: false }, { condeferrable: true }, { condeferred: true }
    ]) {
        for (let index = 0; index < EXPECTED_USER_INCOMING_FOREIGN_KEYS.length; index++) {
            const rows = incoming();
            Object.assign(rows[index], patch);
            assert.throws(() => assertUserIncomingForeignKeys(rows));
        }
    }
});

test('missing/duplicate tables, extra or missing columns and complete null/default/type metadata are refused', () => {
    for (const name of userTableNames) {
        assert.throws(() => assertUserCatalog(catalog().filter((table) => table.table !== name), incoming()));
        const duplicate = catalog();
        duplicate.push(structuredClone(duplicate.find((table) => table.table === name)));
        assert.throws(() => assertUserCatalog(duplicate, incoming()));
        for (const patch of [
            { data_type: 'text' }, { is_nullable: 'YES' }, { column_default: '1' },
            { character_maximum_length: 128 }, { column_default: undefined }
        ]) {
            const tables = catalog();
            Object.assign(tables.find((table) => table.table === name).columns.find((column) => column.column_name === 'id'), patch);
            assert.throws(() => assertUserCatalog(tables, incoming()));
        }
        const extra = catalog();
        extra.find((table) => table.table === name).columns.push(columnDefinition('row_version_extra', 'integer not null default 1'));
        assert.throws(() => assertUserCatalog(extra, incoming()));
        const missing = catalog();
        missing.find((table) => table.table === name).columns.pop();
        assert.throws(() => assertUserCatalog(missing, incoming()));
    }
});

test('verified defaults, primary nullability and lack of relationship row-version columns are enforced', () => {
    for (const [name, patch] of [
        ['email_verified', { column_default: 'true' }], ['phone_verified', { is_nullable: 'YES' }],
        ['primary_org_unit_id', { is_nullable: 'NO' }], ['row_version', { data_type: 'bigint' }],
        ['avatar_url', { character_maximum_length: 2048 }], ['last_login_at', { column_default: 'now()' }]
    ]) {
        const tables = catalog();
        Object.assign(tables.find((table) => table.table === 'platform_user').columns.find((column) => column.column_name === name), patch);
        assert.throws(() => assertUserCatalog(tables, incoming()));
    }
    for (const name of ['user_org_membership', 'user_role_assignment']) {
        const tables = catalog();
        tables.find((table) => table.table === name).columns.push(columnDefinition('row_version', 'integer not null default 1'));
        assert.throws(() => assertUserCatalog(tables, incoming()));
    }
});

test('unknown actor FK, added status/membership checks and changed delete behavior are not original DDL', () => {
    for (const name of userTableNames) {
        const tables = catalog();
        tables.find((table) => table.table === name).constraints.push({
            conname: `${name}_new_check`, contype: 'c', definition: "CHECK (status IN ('active','revoked'))"
        });
        assert.throws(() => assertUserCatalog(tables, incoming()));
    }
    const actorFk = catalog();
    actorFk[0].constraints.push({ conname: 'platform_user_created_by_foreign', contype: 'f', definition: 'FOREIGN KEY (created_by) REFERENCES poms.platform_user(id) ON DELETE SET NULL' });
    assert.throws(() => assertUserCatalog(actorFk, incoming()));
    const changed = catalog();
    const foreign = changed[0].constraints.find((constraint) => constraint.contype === 'f');
    foreign.definition = foreign.definition.replace('set null', 'cascade');
    assert.throws(() => assertUserCatalog(changed, incoming()));
});

test('partial unique literal case, grouping, casts, predicate and indexed column order cannot be normalized away', () => {
    const mutations = [
        (sql) => sql.replace("'active'", "'ACTIVE'"),
        (sql) => sql.replace('::text', '::character varying'),
        (sql) => sql.replace(' AND ', ' OR '),
        (sql) => sql.replace('WHERE (((', 'WHERE (('),
        (sql) => sql.replace('USING btree (user_id)', 'USING btree (org_unit_id, user_id)'),
        (sql) => sql.replace('CREATE UNIQUE', 'CREATE'),
        (sql) => sql.split(' WHERE ')[0]
    ];
    for (const mutate of mutations) {
        const tables = catalog();
        const index = tables.find((table) => table.table === 'user_org_membership').indexes.find((row) => row.indexname === 'uq_user_primary_org_membership_active');
        index.indexdef = mutate(index.indexdef);
        assert.throws(() => assertUserCatalog(tables, incoming()));
    }
    const changedDefault = catalog();
    changedDefault.find((table) => table.table === 'user_role_assignment').columns.find((column) => column.column_name === 'status').column_default = "'ACTIVE'::character varying";
    assert.throws(() => assertUserCatalog(changedDefault, incoming()));
    const extraIndex = catalog();
    extraIndex[0].indexes.push({ indexname: 'extra_email_unique', indexdef: 'CREATE UNIQUE INDEX extra_email_unique ON poms.platform_user USING btree (email)' });
    assert.throws(() => assertUserCatalog(extraIndex, incoming()));
});

test('catalog reader performs exactly one parameterized SELECT and does not hide foreign source schemas', async () => {
    const expected = incoming();
    const calls = [];
    const actual = await readUserIncomingForeignKeys({ async query(sql, values) {
        calls.push({ sql, values });
        assert.match(sql, /^select /);
        assert.doesNotMatch(sql, /\b(?:insert|update|delete|create|alter|drop|begin|commit)\b/i);
        assert.doesNotMatch(sql, /where[^;]*source_ns\.nspname\s*=/i);
        assert.match(sql, /with ordinality/);
        assert.match(sql, /c\.convalidated,c\.condeferrable,c\.condeferred/);
        return { rows: expected };
    } });
    assert.equal(actual, expected);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].values, ['poms', 'platform_user']);
});
