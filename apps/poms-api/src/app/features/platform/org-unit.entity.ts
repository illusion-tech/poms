import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const OrgUnitSchema = defineEntity({
    name: 'OrgUnit',
    tableName: 'org_unit',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        name: p.string().length(128),
        code: p.string().length(64).unique(),
        description: p.text().nullable(),
        parentId: p.uuid().nullable().fieldName('parent_id'),
        isActive: p.boolean().default(true).fieldName('is_active'),
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

export class OrgUnit extends OrgUnitSchema.class {}

OrgUnitSchema.setClass(OrgUnit);
