import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const UserOrgMembershipSchema = defineEntity({
    name: 'UserOrgMembership',
    tableName: 'user_org_membership',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        userId: p.uuid().fieldName('user_id'),
        orgUnitId: p.uuid().fieldName('org_unit_id'),
        membershipType: p.string().length(32).fieldName('membership_type'),
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

export class UserOrgMembership extends UserOrgMembershipSchema.class {}

UserOrgMembershipSchema.setClass(UserOrgMembership);