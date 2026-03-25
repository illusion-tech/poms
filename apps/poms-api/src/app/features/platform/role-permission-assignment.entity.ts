import { defineEntity } from '@mikro-orm/core';
import type { PermissionKey } from '@poms/shared-contracts';

const p = defineEntity.properties;

export const RolePermissionAssignmentSchema = defineEntity({
    name: 'RolePermissionAssignment',
    tableName: 'role_permission_assignment',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        roleId: p.uuid().fieldName('role_id'),
        permissionKey: p.string().$type<PermissionKey>().length(128).fieldName('permission_key'),
        status: p.string().length(32).default('active'),
        assignedAt: p.datetime().onCreate(() => new Date()).fieldName('assigned_at'),
        assignedBy: p.uuid().nullable().fieldName('assigned_by'),
        revokedAt: p.datetime().nullable().fieldName('revoked_at'),
        revokedBy: p.uuid().nullable().fieldName('revoked_by'),
        changeReason: p.text().nullable().fieldName('change_reason'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by')
    }
});

export class RolePermissionAssignment extends RolePermissionAssignmentSchema.class {}

RolePermissionAssignmentSchema.setClass(RolePermissionAssignment);