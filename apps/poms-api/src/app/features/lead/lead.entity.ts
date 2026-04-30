import { defineEntity } from '@mikro-orm/core';
import type { LeadBudgetStatus, LeadSourceStatus, LeadStatus, LeadUrgency } from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';

const p = defineEntity.properties;

export const LeadSourceSchema = defineEntity({
    name: 'LeadSource',
    tableName: 'lead_source',
    schema: 'poms',
    comment: '线索来源字典',
    indexes: [{ name: 'idx_lead_source_status_sort', properties: ['status', 'sortOrder'] }],
    checks: [
        {
            name: 'chk_lead_source_status',
            expression: `"status" in ('active', 'inactive')`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('线索来源主键'),
        code: p.string().length(64).unique().comment('线索来源稳定编码'),
        name: p.string().length(128).comment('线索来源名称'),
        description: p.text().nullable().comment('线索来源说明'),
        status: p.string().$type<LeadSourceStatus>().length(32).default('active').comment('线索来源状态'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号'),
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

export const LeadSchema = defineEntity({
    name: 'Lead',
    tableName: 'lead',
    schema: 'poms',
    comment: 'POMS 销售线索事实源表',
    indexes: [
        { name: 'idx_lead_status', properties: ['status'] },
        { name: 'idx_lead_customer_id', properties: ['customerId'] },
        { name: 'idx_lead_source_id', properties: ['sourceId'] },
        { name: 'idx_lead_budget_status', properties: ['budgetStatus'] },
        { name: 'idx_lead_urgency', properties: ['urgency'] },
        { name: 'idx_lead_owner_org_id', properties: ['ownerOrgId'] },
        { name: 'idx_lead_owner_user_id', properties: ['ownerUserId'] },
        { name: 'idx_lead_converted_project_id', properties: ['convertedProjectId'] }
    ],
    checks: [
        {
            name: 'chk_lead_status',
            expression: `"status" in ('registered', 'qualified', 'converted', 'closed')`
        },
        {
            name: 'chk_lead_budget_status',
            expression: `"budget_status" in ('unknown', 'no-budget', 'rough-budget', 'budget-confirmed', 'budget-approved')`
        },
        {
            name: 'chk_lead_urgency',
            expression: `"urgency" in ('low', 'normal', 'high', 'critical')`
        },
        {
            name: 'chk_lead_estimated_amount_non_negative',
            expression: `"estimated_amount" is null or "estimated_amount" >= 0`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('线索主键'),
        leadNo: p.string().length(64).unique().fieldName('lead_no').comment('线索编号'),
        leadName: p.string().length(255).fieldName('lead_name').comment('线索标题/机会名称'),
        customerId: () => p.manyToOne(Customer).mapToPk().fieldName('customer_id').foreignKeyName('lead_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        customerName: p.string().length(255).fieldName('customer_name').comment('客户名称'),
        sourceId: () => p.manyToOne(LeadSource).mapToPk().fieldName('source_id').foreignKeyName('lead_source_id_foreign').updateRule('cascade').deleteRule('restrict').comment('线索来源主数据标识'),
        sourceChannel: p.string().length(64).nullable().fieldName('source_channel').comment('线索来源名称快照'),
        demandDescription: p.text().nullable().fieldName('demand_description').comment('客户需求描述'),
        budgetStatus: p.string().$type<LeadBudgetStatus>().length(32).default('unknown').fieldName('budget_status').comment('预算状态'),
        estimatedAmount: p.string().columnType('numeric(18,2)').nullable().fieldName('estimated_amount').comment('预计金额'),
        urgency: p.string().$type<LeadUrgency>().length(32).default('normal').comment('紧迫程度'),
        expectedDecisionDate: p.date().nullable().fieldName('expected_decision_date').comment('预计决策日期'),
        status: p.string().$type<LeadStatus>().length(32).default('registered').comment('线索状态'),
        ownerOrgId: p.uuid().nullable().fieldName('owner_org_id').comment('线索销售主责组织标识，可为空表示公共池'),
        ownerUserId: p.uuid().nullable().fieldName('owner_user_id').comment('线索销售主责人标识，可为空表示公共池'),
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

export class LeadSource extends LeadSourceSchema.class {}

export class Lead extends LeadSchema.class {}

LeadSourceSchema.setClass(LeadSource);
LeadSchema.setClass(Lead);
