import { defineEntity } from '@mikro-orm/core';
import { OrgUnit } from './org-unit.entity';
import { PlatformUser } from './platform-user.entity';

const p = defineEntity.properties;

export const UserOrgMembershipSchema = defineEntity({
    name: 'UserOrgMembership',
    tableName: 'user_org_membership',
    schema: 'poms',
    indexes: [
        { name: 'idx_user_org_membership_user_id_status', properties: ['userId', 'status'] },
        { name: 'idx_user_org_membership_org_unit_id_status', properties: ['orgUnitId', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_user_org_membership_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.userId}", "${columns.orgUnitId}") where "${columns.status}" = 'active'`
        },
        {
            name: 'uq_user_primary_org_membership_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.userId}") where "${columns.status}" = 'active' and "${columns.membershipType}" = 'primary'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        userId: () =>
            p
                .manyToOne(PlatformUser)
                .mapToPk()
                .fieldName('user_id')
                .foreignKeyName('user_org_membership_user_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        orgUnitId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .fieldName('org_unit_id')
                .foreignKeyName('user_org_membership_org_unit_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        membershipType: p.string().length(32).fieldName('membership_type'),
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

export class UserOrgMembership extends UserOrgMembershipSchema.class {}

UserOrgMembershipSchema.setClass(UserOrgMembership);
