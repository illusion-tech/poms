import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DEV_ORG_UNITS, DEV_ROLES } from '../app/core/platform/dev-platform.fixtures';
import { loadValidatedEnv } from '../config/load-env';
import { sqlText, sqlValue, stableUuid } from './seed-utils';

type SqlConnection = {
    execute<T = unknown>(sql: string): Promise<T>;
};

interface RoleRow {
    id: string;
    role_key: string;
}

export class PlatformBootstrapSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const schema = loadValidatedEnv().DB_SCHEMA;
        await seedPlatformBootstrap(em.getConnection(), schema);
    }
}

export async function seedPlatformBootstrap(connection: SqlConnection, schema: string): Promise<void> {
    await seedOrgUnits(connection, schema);
    await seedRoles(connection, schema);
    await seedRolePermissions(connection, schema);

    console.log(`Seeded platform bootstrap roles and org units in schema "${schema}".`);
}

async function seedOrgUnits(connection: SqlConnection, schema: string): Promise<void> {
    const values = DEV_ORG_UNITS.map((orgUnit, index) => `(${sqlValue(orgUnit.id)}, ${sqlValue(orgUnit.name)}, ${sqlValue(orgUnit.code)}, ${sqlText(toBootstrapDescription(orgUnit.description))}, ${index * 10})`).join(',\n            ');

    await connection.execute(`
        insert into "${schema}"."org_unit" (
            "id",
            "name",
            "code",
            "description",
            "display_order"
        )
        values
            ${values}
        on conflict ("code") do update
        set
            "name" = excluded."name",
            "description" = excluded."description",
            "display_order" = excluded."display_order",
            "is_active" = true,
            "updated_at" = now();
    `);
}

async function seedRoles(connection: SqlConnection, schema: string): Promise<void> {
    const values = DEV_ROLES.map((role, index) => `(${sqlValue(role.id)}, ${sqlValue(role.roleKey)}, ${sqlValue(role.name)}, ${sqlText(toBootstrapDescription(role.description))}, ${role.isSystemRole ? 'true' : 'false'}, ${index * 10})`).join(
        ',\n            '
    );

    await connection.execute(`
        insert into "${schema}"."role" (
            "id",
            "role_key",
            "name",
            "description",
            "is_system_role",
            "display_order"
        )
        values
            ${values}
        on conflict ("role_key") do update
        set
            "name" = excluded."name",
            "description" = excluded."description",
            "is_system_role" = excluded."is_system_role",
            "display_order" = excluded."display_order",
            "is_active" = true,
            "updated_at" = now();
    `);
}

async function seedRolePermissions(connection: SqlConnection, schema: string): Promise<void> {
    const roleRows = await connection.execute<RoleRow[]>(`
        select "id", "role_key"
        from "${schema}"."role"
        where "role_key" in (${DEV_ROLES.map((role) => sqlValue(role.roleKey)).join(', ')});
    `);
    const roleIdByKey = new Map(roleRows.map((role) => [role.role_key, role.id]));
    const managedRoleIds = roleRows.map((role) => sqlValue(role.id)).join(', ');

    if (!managedRoleIds) {
        throw new Error('Platform bootstrap roles were not found after role seed.');
    }

    await connection.execute(`
        delete from "${schema}"."role_permission_assignment"
        where "role_id" in (${managedRoleIds});
    `);

    const assignmentValues = DEV_ROLES.flatMap((role) => {
        const roleId = roleIdByKey.get(role.roleKey);
        if (!roleId) {
            throw new Error(`Platform bootstrap role not found: ${role.roleKey}`);
        }

        return [...new Set(role.permissions)].map((permissionKey) => `(${sqlValue(stableUuid(`role-permission:${roleId}:${permissionKey}`))}, ${sqlValue(roleId)}, ${sqlValue(permissionKey)})`);
    }).join(',\n            ');

    if (!assignmentValues) {
        return;
    }

    await connection.execute(`
        insert into "${schema}"."role_permission_assignment" (
            "id",
            "role_id",
            "permission_key"
        )
        values
            ${assignmentValues};
    `);
}

function toBootstrapDescription(description: string | null): string | null {
    return description?.replace('开发环境默认', 'POMS 基础') ?? null;
}
