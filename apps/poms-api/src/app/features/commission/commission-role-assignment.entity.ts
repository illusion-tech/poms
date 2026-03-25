import { defineEntity } from '@mikro-orm/core';

export type CommissionRoleAssignmentStatus = 'draft' | 'frozen' | 'superseded';

export interface CommissionParticipant {
    userId: string;
    displayName: string;
    roleType: string;
    weight: number;
}

const p = defineEntity.properties;

export const CommissionRoleAssignmentSchema = defineEntity({
    name: 'CommissionRoleAssignment',
    tableName: 'commission_role_assignment',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: p.uuid().fieldName('project_id'),
        version: p.integer(),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        status: p.string().length(32).default('draft') as ReturnType<typeof p.string> & { (): CommissionRoleAssignmentStatus },
        participantsJson: p.json<CommissionParticipant[]>().default([]).fieldName('participants_json'),
        frozenAt: p.datetime().nullable().fieldName('frozen_at'),
        frozenBy: p.uuid().nullable().fieldName('frozen_by'),
        supersedesId: p.uuid().nullable().fieldName('supersedes_id'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionRoleAssignment extends CommissionRoleAssignmentSchema.class {}

CommissionRoleAssignmentSchema.setClass(CommissionRoleAssignment);
