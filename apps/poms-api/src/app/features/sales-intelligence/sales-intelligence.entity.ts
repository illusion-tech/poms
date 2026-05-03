import { defineEntity } from '@mikro-orm/core';
import {
    COMPETITOR_POSITIONS,
    CUSTOMER_CONTACT_STATUSES,
    CUSTOMER_PREFERENCES,
    CompetitorPositionValue,
    CustomerContactStatusValue,
    CustomerPreferenceValue,
    OPPORTUNITY_STAKEHOLDER_ACCESS_LEVELS,
    OPPORTUNITY_STAKEHOLDER_ATTITUDES,
    OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVELS,
    OPPORTUNITY_STAKEHOLDER_ROLES,
    OpportunityStakeholderAccessLevelValue,
    OpportunityStakeholderAttitudeValue,
    OpportunityStakeholderInfluenceLevelValue,
    WIN_PROBABILITY_LEVELS,
    WinProbabilityLevelValue,
    type CompetitorPosition,
    type CustomerContactStatus,
    type CustomerPreference,
    type OpportunityStakeholderAccessLevel,
    type OpportunityStakeholderAttitude,
    type OpportunityStakeholderInfluenceLevel,
    type OpportunityStakeholderRole,
    type WinProbabilityLevel
} from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const CustomerContactSchema = defineEntity({
    name: 'CustomerContact',
    tableName: 'customer_contact',
    schema: 'poms',
    comment: '客户联系人基础资料',
    indexes: [{ name: 'idx_customer_contact_customer_status', properties: ['customerId', 'status'] }],
    checks: [
        {
            name: 'chk_customer_contact_status',
            expression: `"status" in (${toSqlStringList(CUSTOMER_CONTACT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('客户联系人主键'),
        customerId: () =>
            p
                .manyToOne(Customer)
                .mapToPk()
                .fieldName('customer_id')
                .foreignKeyName('customer_contact_customer_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('客户主数据标识'),
        name: p.string().length(128).comment('联系人姓名'),
        department: p.string().length(128).nullable().comment('客户单位部门'),
        title: p.string().length(128).nullable().comment('客户单位职务 / 岗位'),
        workPhone: p.string().length(64).nullable().fieldName('work_phone').comment('工作电话'),
        mobile: p.string().length(64).nullable().comment('手机号 / 工作手机'),
        wechat: p.string().length(128).nullable().comment('微信 / IM 联系方式'),
        email: p.string().length(255).nullable().comment('工作邮箱'),
        remark: p.text().nullable().comment('业务备注'),
        status: p.string().$type<CustomerContactStatus>().length(32).default(CustomerContactStatusValue.Active).comment('联系人状态'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export const OpportunityStakeholderSchema = defineEntity({
    name: 'OpportunityStakeholder',
    tableName: 'opportunity_stakeholder',
    schema: 'poms',
    comment: '线索 / 项目机会关系人与决策链记录',
    indexes: [
        {
            name: 'idx_opportunity_stakeholder_lead',
            properties: ['leadId', 'isPrimary', 'updatedAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.leadId}", "${columns.isPrimary}" desc, "${columns.updatedAt}" desc)`
        },
        {
            name: 'idx_opportunity_stakeholder_project',
            properties: ['projectId', 'isPrimary', 'updatedAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.isPrimary}" desc, "${columns.updatedAt}" desc)`
        },
        { name: 'idx_opportunity_stakeholder_contact', properties: ['contactId'] }
    ],
    checks: [
        { name: 'chk_opportunity_stakeholder_anchor', expression: `"lead_id" is not null or "project_id" is not null` },
        { name: 'chk_opportunity_stakeholder_role', expression: `"role" in (${toSqlStringList(OPPORTUNITY_STAKEHOLDER_ROLES)})` },
        { name: 'chk_opportunity_stakeholder_attitude', expression: `"attitude" in (${toSqlStringList(OPPORTUNITY_STAKEHOLDER_ATTITUDES)})` },
        { name: 'chk_opportunity_stakeholder_influence', expression: `"influence_level" in (${toSqlStringList(OPPORTUNITY_STAKEHOLDER_INFLUENCE_LEVELS)})` },
        { name: 'chk_opportunity_stakeholder_access', expression: `"access_level" in (${toSqlStringList(OPPORTUNITY_STAKEHOLDER_ACCESS_LEVELS)})` }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('机会关系人主键'),
        customerId: () => p.manyToOne(Customer).mapToPk().fieldName('customer_id').foreignKeyName('opportunity_stakeholder_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        leadId: () => p.manyToOne(Lead).mapToPk().nullable().fieldName('lead_id').foreignKeyName('opportunity_stakeholder_lead_id_foreign').updateRule('cascade').deleteRule('restrict').comment('线索上下文标识'),
        projectId: () => p.manyToOne(Project).mapToPk().nullable().fieldName('project_id').foreignKeyName('opportunity_stakeholder_project_id_foreign').updateRule('cascade').deleteRule('restrict').comment('项目上下文标识'),
        contactId: () => p.manyToOne(CustomerContact).mapToPk().fieldName('contact_id').foreignKeyName('opportunity_stakeholder_contact_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户联系人标识'),
        role: p.string().$type<OpportunityStakeholderRole>().length(64).comment('当前机会中的角色'),
        attitude: p.string().$type<OpportunityStakeholderAttitude>().length(32).default(OpportunityStakeholderAttitudeValue.Unknown).comment('对当前机会的态度'),
        influenceLevel: p.string().$type<OpportunityStakeholderInfluenceLevel>().length(32).default(OpportunityStakeholderInfluenceLevelValue.Unknown).fieldName('influence_level').comment('影响力等级'),
        accessLevel: p.string().$type<OpportunityStakeholderAccessLevel>().length(32).default(OpportunityStakeholderAccessLevelValue.Unknown).fieldName('access_level').comment('可接触程度'),
        focusAreas: p.json<string[]>().default([]).fieldName('focus_areas_json').comment('关注重点标签'),
        communicationNotes: p.text().nullable().fieldName('communication_notes').comment('业务沟通偏好 / 注意事项'),
        isPrimary: p.boolean().default(false).fieldName('is_primary').comment('是否关键关系人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export const CompetitorIntelligenceRecordSchema = defineEntity({
    name: 'CompetitorIntelligenceRecord',
    tableName: 'competitor_intelligence_record',
    schema: 'poms',
    comment: '线索 / 项目竞争态势记录',
    indexes: [
        {
            name: 'idx_competitor_intelligence_lead',
            properties: ['leadId', 'updatedAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.leadId}", "${columns.updatedAt}" desc)`
        },
        {
            name: 'idx_competitor_intelligence_project',
            properties: ['projectId', 'updatedAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.updatedAt}" desc)`
        }
    ],
    checks: [
        { name: 'chk_competitor_intelligence_anchor', expression: `"lead_id" is not null or "project_id" is not null` },
        { name: 'chk_competitor_position', expression: `"position" in (${toSqlStringList(COMPETITOR_POSITIONS)})` },
        { name: 'chk_competitor_customer_preference', expression: `"customer_preference" in (${toSqlStringList(CUSTOMER_PREFERENCES)})` },
        { name: 'chk_competitor_win_probability', expression: `"win_probability" in (${toSqlStringList(WIN_PROBABILITY_LEVELS)})` }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('竞争态势记录主键'),
        customerId: () => p.manyToOne(Customer).mapToPk().fieldName('customer_id').foreignKeyName('competitor_intelligence_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        leadId: () => p.manyToOne(Lead).mapToPk().nullable().fieldName('lead_id').foreignKeyName('competitor_intelligence_lead_id_foreign').updateRule('cascade').deleteRule('restrict').comment('线索上下文标识'),
        projectId: () => p.manyToOne(Project).mapToPk().nullable().fieldName('project_id').foreignKeyName('competitor_intelligence_project_id_foreign').updateRule('cascade').deleteRule('restrict').comment('项目上下文标识'),
        competitorName: p.string().length(255).fieldName('competitor_name').comment('竞争对手名称'),
        position: p.string().$type<CompetitorPosition>().length(64).default(CompetitorPositionValue.Unknown).comment('竞争位置'),
        customerPreference: p.string().$type<CustomerPreference>().length(64).default(CustomerPreferenceValue.Unknown).fieldName('customer_preference').comment('客户倾向'),
        competitorStrengths: p.text().nullable().fieldName('competitor_strengths').comment('对手优势'),
        competitorWeaknesses: p.text().nullable().fieldName('competitor_weaknesses').comment('对手弱点'),
        ourAdvantages: p.text().nullable().fieldName('our_advantages').comment('我方优势'),
        ourRisks: p.text().nullable().fieldName('our_risks').comment('我方风险'),
        winProbability: p.string().$type<WinProbabilityLevel>().length(32).default(WinProbabilityLevelValue.Unknown).fieldName('win_probability').comment('胜率判断'),
        evidence: p.text().nullable().comment('判断依据'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export const SalesDiscoveryRecordSchema = defineEntity({
    name: 'SalesDiscoveryRecord',
    tableName: 'sales_discovery_record',
    schema: 'poms',
    comment: '线索 / 项目销售情报记录',
    indexes: [
        {
            name: 'idx_sales_discovery_lead',
            properties: ['leadId', 'updatedAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.leadId}", "${columns.updatedAt}" desc)`
        },
        {
            name: 'idx_sales_discovery_project',
            properties: ['projectId', 'updatedAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.updatedAt}" desc)`
        }
    ],
    checks: [{ name: 'chk_sales_discovery_anchor', expression: `"lead_id" is not null or "project_id" is not null` }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('销售情报记录主键'),
        customerId: () => p.manyToOne(Customer).mapToPk().fieldName('customer_id').foreignKeyName('sales_discovery_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        leadId: () => p.manyToOne(Lead).mapToPk().nullable().fieldName('lead_id').foreignKeyName('sales_discovery_lead_id_foreign').updateRule('cascade').deleteRule('restrict').comment('线索上下文标识'),
        projectId: () => p.manyToOne(Project).mapToPk().nullable().fieldName('project_id').foreignKeyName('sales_discovery_project_id_foreign').updateRule('cascade').deleteRule('restrict').comment('项目上下文标识'),
        procurementProcess: p.text().nullable().fieldName('procurement_process').comment('采购流程'),
        budgetSource: p.text().nullable().fieldName('budget_source').comment('预算来源'),
        customerPainPoints: p.text().nullable().fieldName('customer_pain_points').comment('客户核心痛点'),
        decisionCycle: p.text().nullable().fieldName('decision_cycle').comment('决策周期'),
        nextContactPlan: p.text().nullable().fieldName('next_contact_plan').comment('下一步接触计划'),
        remark: p.text().nullable().comment('备注'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export class CustomerContact extends CustomerContactSchema.class {}

export class OpportunityStakeholder extends OpportunityStakeholderSchema.class {}

export class CompetitorIntelligenceRecord extends CompetitorIntelligenceRecordSchema.class {}

export class SalesDiscoveryRecord extends SalesDiscoveryRecordSchema.class {}

CustomerContactSchema.setClass(CustomerContact);
OpportunityStakeholderSchema.setClass(OpportunityStakeholder);
CompetitorIntelligenceRecordSchema.setClass(CompetitorIntelligenceRecord);
SalesDiscoveryRecordSchema.setClass(SalesDiscoveryRecord);
