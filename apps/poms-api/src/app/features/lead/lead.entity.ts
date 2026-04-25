import { defineEntity } from '@mikro-orm/core';
import type { LeadStatus } from '@poms/shared-contracts';

const p = defineEntity.properties;

export const LeadSchema = defineEntity({
    name: 'Lead',
    tableName: 'lead',
    schema: 'poms',
    comment: 'POMS 销售线索最小事实源表',
    indexes: [
        { name: 'idx_lead_status', properties: ['status'] },
        { name: 'idx_lead_owner_org_id', properties: ['ownerOrgId'] },
        { name: 'idx_lead_owner_user_id', properties: ['ownerUserId'] },
        { name: 'idx_lead_converted_project_id', properties: ['convertedProjectId'] }
    ],
    checks: [
        {
            name: 'chk_lead_status',
            expression: `"status" in ('registered', 'qualified', 'converted', 'closed')`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('线索主键'),
        leadNo: p.string().length(64).unique().fieldName('lead_no').comment('线索编号'),
        leadName: p.string().length(255).fieldName('lead_name').comment('线索标题/机会名称'),
        customerName: p.string().length(255).fieldName('customer_name').comment('客户名称'),
        sourceChannel: p.string().length(64).nullable().fieldName('source_channel').comment('线索来源渠道'),
        status: p.string().$type<LeadStatus>().length(32).default('registered').comment('线索状态'),
        ownerOrgId: p.uuid().nullable().fieldName('owner_org_id').comment('线索主责组织标识'),
        ownerUserId: p.uuid().nullable().fieldName('owner_user_id').comment('线索主责人标识'),
        qualificationSummary: p.text().nullable().fieldName('qualification_summary').comment('线索有效性说明'),
        qualifiedAt: p.datetime().nullable().fieldName('qualified_at').comment('线索有效化时间'),
        qualifiedBy: p.uuid().nullable().fieldName('qualified_by').comment('线索有效化操作人'),
        closedReason: p.text().nullable().fieldName('closed_reason').comment('线索关闭原因'),
        closedAt: p.datetime().nullable().fieldName('closed_at').comment('线索关闭时间'),
        closedBy: p.uuid().nullable().fieldName('closed_by').comment('线索关闭操作人'),
        convertedProjectId: p.uuid().nullable().fieldName('converted_project_id').comment('已转项目标识'),
        convertedAt: p.datetime().nullable().fieldName('converted_at').comment('线索转项目时间'),
        convertedBy: p.uuid().nullable().fieldName('converted_by').comment('线索转项目操作人'),
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

export class Lead extends LeadSchema.class {}

LeadSchema.setClass(Lead);
