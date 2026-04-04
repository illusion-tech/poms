import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionPayout } from './commission-payout.entity';

export type CommissionAdjustmentType = 'suspend-payout' | 'reverse-payout' | 'clawback' | 'supplement' | 'recalculate';
export type CommissionAdjustmentStatus = 'draft' | 'pending-approval' | 'approved' | 'executed' | 'rejected' | 'closed';

const p = defineEntity.properties;

export const CommissionAdjustmentSchema = defineEntity({
    name: 'CommissionAdjustment',
    tableName: 'commission_adjustment',
    schema: 'poms',
    indexes: [
        { name: 'idx_commission_adjustment_project_status', properties: ['projectId', 'status'] },
        { name: 'idx_commission_adjustment_related_payout_id', properties: ['relatedPayoutId'] },
        { name: 'idx_commission_adjustment_related_calculation_id', properties: ['relatedCalculationId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_adjustment_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        adjustmentType: p.string().$type<CommissionAdjustmentType>().length(32).fieldName('adjustment_type'),
        relatedPayoutId: () =>
            p
                .manyToOne(CommissionPayout)
                .mapToPk()
                .nullable()
                .fieldName('related_payout_id')
                .foreignKeyName('commission_adjustment_related_payout_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        relatedCalculationId: () =>
            p
                .manyToOne(CommissionCalculation)
                .mapToPk()
                .nullable()
                .fieldName('related_calculation_id')
                .foreignKeyName('commission_adjustment_related_calculation_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        amount: p.decimal().precision(18).scale(2).nullable().fieldName('amount'),
        reason: p.string().length(256),
        status: p.string().$type<CommissionAdjustmentStatus>().length(32).default('draft'),
        executedAt: p.datetime().nullable().fieldName('executed_at'),
        executedBy: p.uuid().nullable().fieldName('executed_by'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionAdjustment extends CommissionAdjustmentSchema.class {}

CommissionAdjustmentSchema.setClass(CommissionAdjustment);
