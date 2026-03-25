import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const RoleSchema = defineEntity({
    name: 'PlatformRole',
    tableName: 'role',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        roleKey: p.string().length(64).unique().fieldName('role_key'),
        name: p.string().length(128),
        description: p.text().nullable(),
        isActive: p.boolean().default(true).fieldName('is_active'),
        isSystemRole: p.boolean().default(false).fieldName('is_system_role'),
        displayOrder: p.integer().default(0).fieldName('display_order'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .onCreate(() => new Date())
            .fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p
            .datetime()
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class PlatformRole extends RoleSchema.class {}

RoleSchema.setClass(PlatformRole);
