import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';

export type CommissionCalculationStatus = 'pending' | 'calculated' | 'effective' | 'superseded';

const p = defineEntity.properties;

export const CommissionCalculationSchema = defineEntity({
    name: 'CommissionCalculation',
    tableName: 'commission_calculation',
    schema: 'poms',
    indexes: [
        { name: 'idx_commission_calculation_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_commission_calculation_status', properties: ['status'] }
    ],
    uniques: [{ name: 'commission_calculation_project_version_unique', properties: ['projectId', 'version'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_calculation_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        ruleVersionId: () =>
            p
                .manyToOne(CommissionRuleVersion)
                .mapToPk()
                .fieldName('rule_version_id')
                .foreignKeyName('commission_calculation_rule_version_id_foreign')
                .updateRule('cascade'),
        version: p.integer(),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        status: p.string().$type<CommissionCalculationStatus>().length(32).default('pending'),
        recognizedRevenueTaxExclusive: p.decimal().precision(18).scale(2).fieldName('recognized_revenue_tax_exclusive'),
        recognizedCostTaxExclusive: p.decimal().precision(18).scale(2).fieldName('recognized_cost_tax_exclusive'),
        contributionMargin: p.decimal().precision(18).scale(2).fieldName('contribution_margin'),
        contributionMarginRate: p.decimal().precision(8).scale(4).fieldName('contribution_margin_rate'),
        commissionPool: p.decimal().precision(18).scale(2).fieldName('commission_pool'),
        recalculatedFromId: () =>
            p
                .manyToOne(CommissionCalculation)
                .mapToPk()
                .nullable()
                .fieldName('recalculated_from_id')
                .foreignKeyName('commission_calculation_recalculated_from_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        approvedAt: p.datetime().nullable().fieldName('approved_at'),
        approvedBy: p.uuid().nullable().fieldName('approved_by'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionCalculation extends CommissionCalculationSchema.class {}

CommissionCalculationSchema.setClass(CommissionCalculation);
