import { defineEntity } from '@mikro-orm/core';
import { PlatformUser } from './platform-user.entity';
import { PlatformRole } from './role.entity';

const p = defineEntity.properties;

export const UserRoleAssignmentSchema = defineEntity({
    name: 'UserRoleAssignment',
    tableName: 'user_role_assignment',
    schema: 'poms',
    indexes: [
        { name: 'idx_user_role_assignment_user_id_status', properties: ['userId', 'status'] },
        { name: 'idx_user_role_assignment_role_id_status', properties: ['roleId', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_user_role_assignment_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.userId}", "${columns.roleId}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        userId: () =>
            p
                .manyToOne(PlatformUser)
                .mapToPk()
                .fieldName('user_id')
                .foreignKeyName('user_role_assignment_user_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        roleId: () =>
            p
                .manyToOne(PlatformRole)
                .mapToPk()
                .fieldName('role_id')
                .foreignKeyName('user_role_assignment_role_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
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

export class UserRoleAssignment extends UserRoleAssignmentSchema.class {}

UserRoleAssignmentSchema.setClass(UserRoleAssignment);
