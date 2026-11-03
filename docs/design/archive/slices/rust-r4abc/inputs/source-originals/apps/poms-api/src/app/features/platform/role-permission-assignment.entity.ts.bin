import { defineEntity } from '@mikro-orm/core';
import type { PermissionKey } from '@poms/shared-contracts';
import { PlatformRole } from './role.entity';

const p = defineEntity.properties;

export const RolePermissionAssignmentSchema = defineEntity({
    name: 'RolePermissionAssignment',
    tableName: 'role_permission_assignment',
    schema: 'poms',
    indexes: [
        { name: 'idx_role_permission_assignment_role_id_status', properties: ['roleId', 'status'] },
        { name: 'idx_role_permission_assignment_permission_key', properties: ['permissionKey'] }
    ],
    uniques: [
        {
            name: 'uq_role_permission_assignment_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.roleId}", "${columns.permissionKey}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        roleId: () =>
            p
                .manyToOne(PlatformRole)
                .mapToPk()
                .fieldName('role_id')
                .foreignKeyName('role_permission_assignment_role_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        permissionKey: p.string().$type<PermissionKey>().length(128).fieldName('permission_key'),
        status: p.string().length(32).default('active'),
        assignedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('assigned_at'),
        assignedBy: p.uuid().nullable().fieldName('assigned_by'),
        revokedAt: p.datetime().nullable().fieldName('revoked_at'),
        revokedBy: p.uuid().nullable().fieldName('revoked_by'),
        changeReason: p.text().nullable().fieldName('change_reason'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by')
    }
});

export class RolePermissionAssignment extends RolePermissionAssignmentSchema.class {}

RolePermissionAssignmentSchema.setClass(RolePermissionAssignment);
