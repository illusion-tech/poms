import { defineEntity } from '@mikro-orm/core';
import {
    LEAD_BUDGET_STATUSES,
    LEAD_RATINGS,
    LEAD_STATUSES,
    LEAD_URGENCIES,
    LeadBudgetStatusValue,
    LeadRatingValue,
    LeadStatusValue,
    LeadUrgencyValue,
    type LeadBudgetStatus,
    type LeadRating,
    type LeadStatus,
    type LeadUrgency
} from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const LeadSchema = defineEntity({
    name: 'lead',
    tableName: 'lead',
    schema: 'poms',
    comment: 'POMS 销售线索事实源表',
    indexes: [
        { name: 'idx_lead_status', properties: ['status'] },
        { name: 'idx_lead_customer_id', properties: ['customerId'] },
        { name: 'idx_lead_source_code', properties: ['sourceCode'] },
        { name: 'idx_lead_budget_status', properties: ['budgetStatus'] },
        { name: 'idx_lead_urgency', properties: ['urgency'] },
        { name: 'idx_lead_rating_score', properties: ['rating', 'score'] },
        { name: 'idx_lead_owner_org_id', properties: ['ownerOrgId'] },
        { name: 'idx_lead_owner_user_id', properties: ['ownerUserId'] },
        { name: 'idx_lead_converted_project_id', properties: ['convertedProjectId'] }
    ],
    checks: [
        {
            name: 'chk_lead_status',
            expression: `"status" in (${toSqlStringList(LEAD_STATUSES)})`
        },
        {
            name: 'chk_lead_budget_status',
            expression: `"budget_status" in (${toSqlStringList(LEAD_BUDGET_STATUSES)})`
        },
        {
            name: 'chk_lead_urgency',
            expression: `"urgency" in (${toSqlStringList(LEAD_URGENCIES)})`
        },
        {
            name: 'chk_lead_estimated_amount_non_negative',
            expression: `"estimated_amount" is null or "estimated_amount" >= 0`
        },
        {
            name: 'chk_lead_score_range',
            expression: `"score" >= 0 and "score" <= 100`
        },
        {
            name: 'chk_lead_rating',
            expression: `"rating" in (${toSqlStringList(LEAD_RATINGS)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('线索主键'),
        leadNo: p.string().length(64).unique().fieldName('lead_no').comment('线索编号'),
        leadName: p.string().length(255).fieldName('lead_name').comment('线索标题/机会名称'),
        customerId: () => p.manyToOne(Customer).mapToPk().fieldName('customer_id').foreignKeyName('lead_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        customerName: p.string().length(255).fieldName('customer_name').comment('客户名称'),
        sourceCode: p.string().length(64).fieldName('source_code').comment('线索来源字典编码'),
        demandDescription: p.text().nullable().fieldName('demand_description').comment('客户需求描述'),
        budgetStatus: p.string().$type<LeadBudgetStatus>().length(32).default(LeadBudgetStatusValue.Unknown).fieldName('budget_status').comment('预算状态'),
        estimatedAmount: p.string().columnType('numeric(18,2)').nullable().fieldName('estimated_amount').comment('预计金额'),
        urgency: p.string().$type<LeadUrgency>().length(32).default(LeadUrgencyValue.Normal).comment('紧迫程度'),
        expectedDecisionDate: p.date().nullable().fieldName('expected_decision_date').comment('预计决策日期'),
        score: p.integer().default(0).comment('线索评分，范围 0-100'),
        rating: p.string().$type<LeadRating>().length(8).default(LeadRatingValue.D).comment('线索评级'),
        scoreReason: p.text().default('暂无有效评分事实').fieldName('score_reason').comment('线索评分说明'),
        scoreUpdatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('score_updated_at')
            .comment('线索评分更新时间'),
        status: p.string().$type<LeadStatus>().length(32).default(LeadStatusValue.Registered).comment('线索状态'),
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

export class Lead extends LeadSchema.class {}

LeadSchema.setClass(Lead);
