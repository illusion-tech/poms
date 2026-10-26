import assert from 'node:assert/strict';

// Constraints below are the existing Migration20260325153000 declarations;
// this only checks the resulting PostgreSQL 15 catalog and never applies DDL.
export function assertRoleCatalog(tables) {
    const role = tables.find((t) => t.table === 'role');
    assert(role, 'Missing role catalog');
    const expectedDefaults = { id: 'gen_random_uuid()', is_active: 'true', is_system_role: 'false', display_order: '0', row_version: '1', created_at: 'now()', updated_at: 'now()' };
    for (const column of role.columns) assert.equal(column.column_default, expectedDefaults[column.column_name] ?? null, `role default ${column.column_name}`);
    assert.deepEqual(role.constraints.filter((c) => c.contype === 'p' || c.contype === 'u').map((c) => [c.conname,c.definition]).sort(), [['role_pkey','PRIMARY KEY (id)'],['role_role_key_unique','UNIQUE (role_key)']].sort());
    assert.equal(role.constraints.some((c) => c.contype === 'c' || c.contype === 'f'), false, 'Role has no new check or actor FK');
    for (const [tableName, columns] of [['role_permission_assignment','role_id, permission_key'], ['user_role_assignment','user_id, role_id']]) {
        const table = tables.find((t) => t.table === tableName);
        assert(table, `Missing ${tableName}`);
        assert.equal(table.columns.some((c) => c.column_name === 'row_version'), false, 'Assignments have no row version');
        const defaults={id:'gen_random_uuid()',status:"'active'::character varying",assigned_at:'now()',created_at:'now()'};
        for (const column of table.columns) assert.equal(column.column_default, defaults[column.column_name] ?? null, `${tableName} default ${column.column_name}`);
        assert.equal(table.constraints.some((c) => c.contype === 'c'), false, 'Historical status/key text has no enum-like CHECK');
        const unique=table.indexes.find((i)=>i.indexname===`uq_${tableName}_active`);
        assert.equal(unique?.indexdef,`CREATE UNIQUE INDEX uq_${tableName}_active ON poms.${tableName} USING btree (${columns}) WHERE ((status)::text = 'active'::text)`);
        const foreign=table.constraints.filter((c)=>c.contype==='f');
        const expected=[['role_id','role'],...(tableName==='user_role_assignment'?[['user_id','platform_user']]:[])];
        assert.equal(foreign.length,expected.length);
        for(const [column,target] of expected) assert.equal(foreign.find((c)=>c.conname===`${tableName}_${column}_foreign`)?.definition,`FOREIGN KEY (${column}) REFERENCES poms.${target}(id) ON UPDATE CASCADE ON DELETE CASCADE`);
        assert.equal(table.constraints.find((c)=>c.contype==='p')?.definition,'PRIMARY KEY (id)');
    }
    return {roleTables:3,partialUniqueIndexes:2,assignmentForeignKeys:3,defaultsAndVersions:'matched-original-migration',productDdlChanged:false};
}
