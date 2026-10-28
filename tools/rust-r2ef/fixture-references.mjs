import { fail } from './fixture-guard.mjs';
import { scanExternalReferences } from './fixture-cleanup.mjs';

export async function mutateReference(client, request, j) {
    if (request.action === 'role-duplicate-names') {
        if (request.roleSlot !== 'alpha') fail('invalid_reference_slot');
        const owned = j.roles.filter((row) => ['alpha', 'viewer'].includes(row.slot)).toSorted((a, b) => a.id.localeCompare(b.id));
        if (owned.length !== 2 || owned[0].id === owned[1].id) fail('fixture_reference_ownership');
        for (const entry of owned) {
            const found = await client.query('select id::text,role_key as key from poms.role where id=$1 for update', [entry.id]);
            if (found.rowCount !== 1 || found.rows[0].key !== entry.key) fail('fixture_reference_ownership');
        }
        const result = await client.query('update poms.role set name=$2 where id=any($1::uuid[])', [owned.map((row) => row.id), `R2EF 同名 ${j.runId.slice(0, 8)}`]);
        if (result.rowCount !== 2) fail('fixture_target_not_found');
        return { matched: 2, changed: 2, state: request.action };
    }
    const role = request.action.startsWith('role-');
    const table = role ? 'role' : 'org_unit';
    const key = role ? 'role_key' : 'code';
    const entry = j[role ? 'roles' : 'orgs'].find((row) => row.slot === request[role ? 'roleSlot' : 'orgSlot']);
    if (!entry) fail('invalid_reference_slot');
    const found = await client.query(`select id::text,${key} as key from poms.${table} where id=$1 for update`, [entry.id]);
    if (found.rowCount !== 1 || found.rows[0].key !== entry.key) fail('fixture_reference_ownership');
    let result;
    if (['role-set-active', 'role-set-inactive'].includes(request.action)) {
        result = await client.query('update poms.role set is_active=$2,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [entry.id, request.action === 'role-set-active']);
    } else if (request.action === 'org-set-values') {
        result = await client.query("update poms.org_unit set name='R2EF witnessed organization',description='R2EF witnessed description',row_version=row_version+1,updated_at=clock_timestamp() where id=$1", [entry.id]);
    } else if (request.action === 'role-delete-owned' || request.action === 'org-delete-owned') {
        if (entry.slot !== 'alpha') fail('invalid_reference_slot');
        // A destructive race probe is permitted only for an unused reference.
        // Keep all table locks until commit; do not erase historical references.
        await scanExternalReferences(client, j);
        const { rows: tables } = await client.query("select table_name from information_schema.tables where table_schema='poms' and table_type='BASE TABLE' order by table_name");
        for (const { table_name: name } of tables) {
            if (!/^[a-z_][a-z0-9_]*$/.test(name)) fail('catalog_identifier');
            if (role && name === 'role_permission_assignment') continue;
            const { rows } = await client.query(`select 1 from poms."${name}" t where lower(to_jsonb(t)::text) like $1${name === table ? ' and id<>$2::uuid' : ''} limit 1`, name === table ? [`%${entry.id}%`, entry.id] : [`%${entry.id}%`]);
            if (rows.length) fail('fixture_reference_in_use');
        }
        if (role) await client.query('delete from poms.role_permission_assignment where role_id=$1', [entry.id]);
        result = await client.query(`delete from poms.${table} where id=$1`, [entry.id]);
    } else fail('invalid_reference_action');
    if (result.rowCount !== 1) fail('fixture_target_not_found');
    return { matched: 1, changed: 1, state: request.action };
}
