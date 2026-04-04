import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectSchema = defineEntity({
    name: 'Project',
    tableName: 'project',
    schema: 'poms',
    comment: 'POMS 第一阶段项目主链路主体表',
    indexes: [
        { name: 'idx_project_status', properties: ['status'] },
        { name: 'idx_project_current_stage', properties: ['currentStage'] },
        { name: 'idx_project_owner_org_id', properties: ['ownerOrgId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('项目主键'),
        projectCode: p.string().length(64).unique().fieldName('project_code').comment('项目编号'),
        projectName: p.string().length(255).fieldName('project_name').comment('项目名称'),
        customerId: p.uuid().nullable().fieldName('customer_id').comment('客户标识，第一阶段先保留业务引用'),
        status: p.string().length(32).comment('项目当前主状态'),
        currentStage: p.string().length(64).fieldName('current_stage').comment('项目当前阶段'),
        ownerOrgId: p.uuid().nullable().fieldName('owner_org_id').comment('项目归属组织标识'),
        ownerUserId: p.uuid().nullable().fieldName('owner_user_id').comment('项目负责人标识'),
        plannedSignAt: p.datetime().nullable().fieldName('planned_sign_at').comment('预计签约时间'),
        closedAt: p.datetime().nullable().fieldName('closed_at').comment('项目关闭时间'),
        closedReason: p.text().nullable().fieldName('closed_reason').comment('项目关闭原因'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
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
