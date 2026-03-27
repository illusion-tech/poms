import { defineEntity } from '@mikro-orm/core';

export type CommissionAdjustmentType = 'suspend-payout' | 'reverse-payout' | 'clawback' | 'supplement' | 'recalculate';
export type CommissionAdjustmentStatus = 'draft' | 'pending-approval' | 'approved' | 'executed' | 'rejected' | 'closed';

const p = defineEntity.properties;

export const CommissionAdjustmentSchema = defineEntity({
    name: 'CommissionAdjustment',
    tableName: 'commission_adjustment',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: p.uuid().fieldName('project_id'),
        adjustmentType: p.string().$type<CommissionAdjustmentType>().length(32).fieldName('adjustment_type'),
        relatedPayoutId: p.uuid().nullable().fieldName('related_payout_id'),
        relatedCalculationId: p.uuid().nullable().fieldName('related_calculation_id'),
        amount: p.decimal().precision(18).scale(2).nullable().fieldName('amount'),
        reason: p.string().length(256),
        status: p.string().$type<CommissionAdjustmentStatus>().length(32).default('draft'),
        executedAt: p.datetime().nullable().fieldName('executed_at'),
        executedBy: p.uuid().nullable().fieldName('executed_by'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionAdjustment extends CommissionAdjustmentSchema.class {}

CommissionAdjustmentSchema.setClass(CommissionAdjustment);
