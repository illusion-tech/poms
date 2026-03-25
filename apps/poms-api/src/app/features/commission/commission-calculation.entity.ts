import { defineEntity } from '@mikro-orm/core';

export type CommissionCalculationStatus = 'pending' | 'calculated' | 'effective' | 'superseded';

const p = defineEntity.properties;

export const CommissionCalculationSchema = defineEntity({
    name: 'CommissionCalculation',
    tableName: 'commission_calculation',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: p.uuid().fieldName('project_id'),
        ruleVersionId: p.uuid().fieldName('rule_version_id'),
        version: p.integer(),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        status: p.string().length(32).default('pending') as ReturnType<typeof p.string> & { (): CommissionCalculationStatus },
        recognizedRevenueTaxExclusive: p.decimal({ precision: 18, scale: 2 }).fieldName('recognized_revenue_tax_exclusive'),
        recognizedCostTaxExclusive: p.decimal({ precision: 18, scale: 2 }).fieldName('recognized_cost_tax_exclusive'),
        contributionMargin: p.decimal({ precision: 18, scale: 2 }).fieldName('contribution_margin'),
        contributionMarginRate: p.decimal({ precision: 8, scale: 4 }).fieldName('contribution_margin_rate'),
        commissionPool: p.decimal({ precision: 18, scale: 2 }).fieldName('commission_pool'),
        recalculatedFromId: p.uuid().nullable().fieldName('recalculated_from_id'),
        approvedAt: p.datetime().nullable().fieldName('approved_at'),
        approvedBy: p.uuid().nullable().fieldName('approved_by'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionCalculation extends CommissionCalculationSchema.class {}

CommissionCalculationSchema.setClass(CommissionCalculation);
