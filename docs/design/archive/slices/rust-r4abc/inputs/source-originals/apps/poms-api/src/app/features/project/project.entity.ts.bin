import { defineEntity } from '@mikro-orm/core';
import { PROJECT_STAGES, PROJECT_STATUSES, ProjectStatusValue, type ProjectStage, type ProjectStatus } from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ProjectSchema = defineEntity({
    name: 'Project',
    tableName: 'project',
    schema: 'poms',
    comment: 'POMS 第一阶段项目主链路主体表',
    indexes: [
        { name: 'idx_project_status', properties: ['status'] },
        { name: 'idx_project_current_stage', properties: ['currentStage'] },
        { name: 'idx_project_customer_id', properties: ['customerId'] },
        { name: 'idx_project_owner_org_id', properties: ['ownerOrgId'] },
        { name: 'idx_project_source_lead_id', properties: ['sourceLeadId'] }
    ],
    checks: [
        {
            name: 'chk_project_status',
            expression: `"status" in (${toSqlStringList(PROJECT_STATUSES)})`
        },
        {
            name: 'chk_project_current_stage',
            expression: `"current_stage" in (${toSqlStringList(PROJECT_STAGES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('项目主键'),
        projectNo: p.string().length(64).unique().fieldName('project_no').comment('项目编号'),
        projectName: p.string().length(255).fieldName('project_name').comment('项目名称'),
        sourceLeadId: () => p.manyToOne(Lead).mapToPk().nullable().fieldName('source_lead_id').foreignKeyName('project_source_lead_id_foreign').updateRule('cascade').deleteRule('restrict').comment('项目来源线索标识'),
        customerId: () => p.manyToOne(Customer).mapToPk().nullable().fieldName('customer_id').foreignKeyName('project_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        customerName: p.string().length(255).nullable().fieldName('customer_name').comment('客户名称'),
        customerProjectNo: p.string().length(128).nullable().fieldName('customer_project_no').comment('客户项目编号'),
        status: p.string().$type<ProjectStatus>().length(32).comment('项目当前主状态'),
        currentStage: p.string().$type<ProjectStage>().length(64).fieldName('current_stage').comment('项目当前阶段'),
        ownerOrgId: p.uuid().nullable().fieldName('owner_org_id').comment('项目销售主责组织标识'),
        ownerUserId: p.uuid().nullable().fieldName('owner_user_id').comment('项目销售主责人标识'),
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
        this.status = ProjectStatusValue.Closed;
        this.closedReason = reason;
        this.closedAt = closedAt;
    }

    reopen(): void {
        this.status = ProjectStatusValue.Active;
        this.closedReason = null;
        this.closedAt = null;
    }
}

ProjectSchema.setClass(Project);
