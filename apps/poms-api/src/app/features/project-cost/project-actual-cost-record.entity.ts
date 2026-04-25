import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { InternalCostRateVersion } from './internal-cost-rate-version.entity';

const p = defineEntity.properties;

export const ProjectActualCostRecordSchema = defineEntity({
    name: 'ProjectActualCostRecord',
    tableName: 'project_actual_cost_record',
    schema: 'poms',
    comment: 'POMS 项目级实际成本记录',
    indexes: [
        { name: 'idx_cost_record_project', properties: ['projectId'] },
        { name: 'idx_cost_record_status', properties: ['recordStatus'] },
        { name: 'idx_cost_record_stage', properties: ['executionStageCode'] },
        { name: 'idx_cost_record_type', properties: ['costType'] }
    ],
    uniques: [
        {
            name: 'uq_project_actual_cost_record_payment_fact_source_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceType}", "${columns.sourceId}") where "${columns.costType}" = 'PAYMENT_FACT' and "${columns.recordStatus}" in ('CONFIRMED', 'INCLUDED') and "${columns.sourceType}" is not null and "${columns.sourceId}" is not null`
        },
        {
            name: 'uq_project_actual_cost_record_invoice_source_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceType}", "${columns.sourceId}") where "${columns.costType}" = 'INVOICE' and "${columns.recordStatus}" in ('CONFIRMED', 'INCLUDED') and "${columns.sourceType}" is not null and "${columns.sourceId}" is not null`
        },
        {
            name: 'uq_project_actual_cost_record_expense_source_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceType}", "${columns.sourceId}") where "${columns.costType}" = 'EXPENSE' and "${columns.recordStatus}" in ('CONFIRMED', 'INCLUDED') and "${columns.sourceType}" is not null and "${columns.sourceId}" is not null`
        },
        {
            name: 'uq_project_actual_cost_record_procurement_source_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceType}", "${columns.sourceId}") where "${columns.costType}" = 'PROCUREMENT' and "${columns.recordStatus}" in ('REGISTERED', 'CONFIRMED', 'INCLUDED') and "${columns.sourceType}" is not null and "${columns.sourceId}" is not null`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        recordNo: p.string().length(64).unique().fieldName('record_no').comment('记录编号'),
        costType: p.string().length(32).fieldName('cost_type').comment('成本类型：PROCUREMENT/INVOICE/EXPENSE/PAYMENT_FACT/LABOR'),
        costSubtype: p.string().length(64).nullable().fieldName('cost_subtype').comment('成本子类型'),
        occurredOn: p.date().nullable().fieldName('occurred_on').comment('发生日期'),
        accountingPeriod: p.string().length(32).nullable().fieldName('accounting_period').comment('核算期间'),
        registeredAt: p.datetime().nullable().fieldName('registered_at').comment('登记时间'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at').comment('确认时间'),
        includedAt: p.datetime().nullable().fieldName('included_at').comment('纳入口径时间'),
        executionStageCode: p.string().length(64).nullable().fieldName('execution_stage_code').comment('执行阶段'),
        stageDerivedFromType: p.string().length(64).nullable().fieldName('stage_derived_from_type').comment('阶段推导来源类型'),
        stageDerivedFromId: p.string().length(64).nullable().fieldName('stage_derived_from_id').comment('阶段推导来源标识'),
        stageDerivedAt: p.datetime().nullable().fieldName('stage_derived_at').comment('阶段推导时间'),
        stageLockedAt: p.datetime().nullable().fieldName('stage_locked_at').comment('阶段锁定时间'),
        currency: p.string().length(16).default('CNY').comment('币种'),
        amountExcludingTax: p.decimal().precision(15).scale(4).nullable().fieldName('amount_excluding_tax').comment('不含税金额'),
        taxCostAmount: p.decimal().precision(15).scale(4).nullable().fieldName('tax_cost_amount').comment('税金成本'),
        amountIncludingTax: p.decimal().precision(15).scale(4).nullable().fieldName('amount_including_tax').comment('含税总额（实际成本主要金额）'),
        recordStatus: p.string().length(32).default('DRAFT').fieldName('record_status').comment('状态：DRAFT/REGISTERED/CONFIRMED/INCLUDED/VOIDED/REPLACED'),
        isIncludedInProjectCost: p.boolean().default(false).fieldName('is_included_in_project_cost').comment('是否已纳入项目成本'),
        isHighRisk: p.boolean().default(false).fieldName('is_high_risk').comment('是否高风险'),
        sourceType: p.string().length(64).nullable().fieldName('source_type').comment('来源类型'),
        sourceId: p.string().length(64).nullable().fieldName('source_id').comment('来源标识'),
        sourceRefNo: p.string().length(128).nullable().fieldName('source_ref_no').comment('来源引用号'),
        evidenceSummary: p.text().nullable().fieldName('evidence_summary').comment('依据摘要'),
        attachmentCount: p.integer().default(0).fieldName('attachment_count').comment('附件数量'),
        registeredBy: p.uuid().nullable().fieldName('registered_by').comment('登记人'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by').comment('确认人'),
        includedBy: p.uuid().nullable().fieldName('included_by').comment('纳入口径操作人'),
        ownerRole: p.string().length(64).nullable().fieldName('owner_role').comment('责任角色'),
        costDescription: p.text().nullable().fieldName('cost_description').comment('成本说明'),
        taxImpactSummary: p.text().nullable().fieldName('tax_impact_summary').comment('税务影响说明'),
        riskNote: p.text().nullable().fieldName('risk_note').comment('风险提示'),
        supersedesRecordId: () => p.manyToOne(ProjectActualCostRecord).mapToPk().nullable().fieldName('supersedes_record_id').comment('替代的旧记录'),
        voidReason: p.text().nullable().fieldName('void_reason').comment('作废原因'),

        // 人力成本 (LABOR) 特有字段
        laborPersonId: p.uuid().nullable().fieldName('labor_person_id').comment('人力成本-人员标识'),
        laborRole: p.string().length(64).nullable().fieldName('labor_role').comment('人力成本-角色'),
        laborPeriodType: p.string().length(32).nullable().fieldName('labor_period_type').comment('人力成本-归集周期类型：WEEK/MONTH'),
        laborPeriodStart: p.date().nullable().fieldName('labor_period_start').comment('人力成本-周期开始'),
        laborPeriodEnd: p.date().nullable().fieldName('labor_period_end').comment('人力成本-周期结束'),
        actualHours: p.decimal().precision(10).scale(2).nullable().fieldName('actual_hours').comment('人力成本-实际工时'),
        actualPersonDays: p.decimal().precision(10).scale(2).nullable().fieldName('actual_person_days').comment('人力成本-实际人天'),
        internalCostRate: p.decimal().precision(15).scale(4).nullable().fieldName('internal_cost_rate').comment('人力成本-采用成本率'),
        laborAmount: p.decimal().precision(15).scale(4).nullable().fieldName('labor_amount').comment('人力成本-计算金额'),
        workSummary: p.text().nullable().fieldName('work_summary').comment('人力成本-工作摘要'),
        deliveryStage: p.string().length(64).nullable().fieldName('delivery_stage').comment('人力成本-交付阶段'),
        rateVersionId: () => p.manyToOne(InternalCostRateVersion).mapToPk().nullable().fieldName('rate_version_id').comment('人力成本-对应成本率版本'),

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

export class ProjectActualCostRecord extends ProjectActualCostRecordSchema.class {
}

ProjectActualCostRecordSchema.setClass(ProjectActualCostRecord);
