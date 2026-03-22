import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectSchema = defineEntity({
    name: 'Project',
    tableName: 'project',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectCode: p.string().length(64).unique().fieldName('project_code'),
        projectName: p.string().length(255).fieldName('project_name'),
        customerId: p.uuid().nullable().fieldName('customer_id'),
        status: p.string().length(32),
        currentStage: p.string().length(64).fieldName('current_stage'),
        ownerOrgId: p.uuid().nullable().fieldName('owner_org_id'),
        ownerUserId: p.uuid().nullable().fieldName('owner_user_id'),
        plannedSignAt: p.datetime().nullable().fieldName('planned_sign_at'),
        closedAt: p.datetime().nullable().fieldName('closed_at'),
        closedReason: p.text().nullable().fieldName('closed_reason'),
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

export class Project extends ProjectSchema.class {
    close(reason: string, closedAt = new Date()): void {
        this.status = 'closed';
        this.closedReason = reason;
        this.closedAt = closedAt;
    }

    reopen(): void {
        this.status = 'active';
        this.closedReason = null;
        this.closedAt = null;
    }
}

ProjectSchema.setClass(Project);
