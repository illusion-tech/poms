import { defineEntity } from '@mikro-orm/core';

export type CommissionPayoutStatus = 'draft' | 'pending-approval' | 'approved' | 'paid' | 'reversed';
export type CommissionPayoutStage = 'first' | 'second' | 'final';
export type CommissionPayoutTier = 'basic' | 'mid' | 'premium';

const p = defineEntity.properties;

export const CommissionPayoutSchema = defineEntity({
    name: 'CommissionPayout',
    tableName: 'commission_payout',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: p.uuid().fieldName('project_id'),
        calculationId: p.uuid().fieldName('calculation_id'),
        stageType: p.string().length(32).fieldName('stage_type') as ReturnType<typeof p.string> & { (): CommissionPayoutStage },
        selectedTier: p.string().length(32).default('basic').fieldName('selected_tier') as ReturnType<typeof p.string> & { (): CommissionPayoutTier },
        theoreticalCapAmount: p.decimal({ precision: 18, scale: 2 }).fieldName('theoretical_cap_amount'),
        approvedAmount: p.decimal({ precision: 18, scale: 2 }).nullable().fieldName('approved_amount'),
        paidRecordAmount: p.decimal({ precision: 18, scale: 2 }).nullable().fieldName('paid_record_amount'),
        status: p.string().length(32).default('draft').fieldName('status') as ReturnType<typeof p.string> & { (): CommissionPayoutStatus },
        approvedAt: p.datetime().nullable().fieldName('approved_at'),
        approvedBy: p.uuid().nullable().fieldName('approved_by'),
        handledAt: p.datetime().nullable().fieldName('handled_at'),
        handledBy: p.uuid().nullable().fieldName('handled_by'),
        reversedFromId: p.uuid().nullable().fieldName('reversed_from_id'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionPayout extends CommissionPayoutSchema.class {}

CommissionPayoutSchema.setClass(CommissionPayout);
