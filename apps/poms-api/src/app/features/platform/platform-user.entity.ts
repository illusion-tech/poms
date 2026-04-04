import { defineEntity } from '@mikro-orm/core';
import { OrgUnit } from './org-unit.entity';

const p = defineEntity.properties;

export const PlatformUserSchema = defineEntity({
    name: 'PlatformUser',
    tableName: 'platform_user',
    schema: 'poms',
    indexes: [
        { name: 'idx_platform_user_is_active', properties: ['isActive'] },
        { name: 'idx_platform_user_primary_org_unit_id', properties: ['primaryOrgUnitId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        username: p.string().length(64).unique(),
        passwordHash: p.string().length(255).nullable().fieldName('password_hash'),
        displayName: p.string().length(128).fieldName('display_name'),
        email: p.string().length(255).nullable(),
        phone: p.string().length(64).nullable(),
        avatarUrl: p.string().length(512).nullable().fieldName('avatar_url'),
        isActive: p.boolean().default(true).fieldName('is_active'),
        primaryOrgUnitId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .nullable()
                .fieldName('primary_org_unit_id')
                .foreignKeyName('platform_user_primary_org_unit_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        lastLoginAt: p.datetime().nullable().fieldName('last_login_at'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class PlatformUser extends PlatformUserSchema.class {}

PlatformUserSchema.setClass(PlatformUser);
