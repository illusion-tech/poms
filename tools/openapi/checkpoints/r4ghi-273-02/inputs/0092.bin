import { defineEntity } from '@mikro-orm/core';
import {
    COMMISSION_PAYOUT_KINDS,
    COMMISSION_PAYOUT_STAGES,
    COMMISSION_PAYOUT_STATUSES,
    COMMISSION_PAYOUT_TIERS,
    type CommissionPayoutKind,
    type CommissionPayoutStage,
    type CommissionPayoutStatus,
    type CommissionPayoutTier
} from '@poms/shared-contracts';
import { Project } from '../project/project.entity';
import { CommissionCalculation } from './commission-calculation.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const CommissionPayoutSchema = defineEntity({
    name: 'CommissionPayout',
    tableName: 'commission_payout',
    schema: 'poms',
    indexes: [
        { name: 'idx_commission_payout_project_status', properties: ['projectId', 'status'] },
        { name: 'idx_commission_payout_calculation_id', properties: ['calculationId'] },
        { name: 'idx_commission_payout_source_payout_id', properties: ['sourcePayoutId'] }
    ],
    uniques: [
        {
            name: 'uq_commission_payout_primary_stage',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.calculationId}", "${columns.stageType}") where "${columns.payoutKind}" = 'primary'`
        }
    ],
    checks: [
        {
            name: 'chk_commission_payout_stage_type',
            expression: `"stage_type" in (${toSqlStringList(COMMISSION_PAYOUT_STAGES)})`
        },
        {
            name: 'chk_commission_payout_payout_kind',
            expression: `"payout_kind" in (${toSqlStringList(COMMISSION_PAYOUT_KINDS)})`
        },
        {
            name: 'chk_commission_payout_selected_tier',
            expression: `"selected_tier" in (${toSqlStringList(COMMISSION_PAYOUT_TIERS)})`
        },
        {
            name: 'chk_commission_payout_status',
            expression: `"status" in (${toSqlStringList(COMMISSION_PAYOUT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_payout_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        calculationId: () =>
            p
                .manyToOne(CommissionCalculation)
                .mapToPk()
                .fieldName('calculation_id')
                .foreignKeyName('commission_payout_calculation_id_foreign')
                .updateRule('cascade'),
        stageType: p.string().$type<CommissionPayoutStage>().length(32).fieldName('stage_type'),
        payoutKind: p.string().$type<CommissionPayoutKind>().length(32).default('primary').fieldName('payout_kind'),
        selectedTier: p.string().$type<CommissionPayoutTier>().length(32).default('basic').fieldName('selected_tier'),
        theoreticalCapAmount: p.decimal().precision(18).scale(2).fieldName('theoretical_cap_amount'),
        approvedAmount: p.decimal().precision(18).scale(2).nullable().fieldName('approved_amount'),
        paidRecordAmount: p.decimal().precision(18).scale(2).nullable().fieldName('paid_record_amount'),
        status: p.string().$type<CommissionPayoutStatus>().length(32).default('draft').fieldName('status'),
        approvedAt: p.datetime().nullable().fieldName('approved_at'),
        approvedBy: p.uuid().nullable().fieldName('approved_by'),
        handledAt: p.datetime().nullable().fieldName('handled_at'),
        handledBy: p.uuid().nullable().fieldName('handled_by'),
        reversedFromId: () =>
            p
                .manyToOne(CommissionPayout)
                .mapToPk()
                .nullable()
                .fieldName('reversed_from_id')
                .foreignKeyName('commission_payout_reversed_from_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        sourcePayoutId: () =>
            p
                .manyToOne(CommissionPayout)
                .mapToPk()
                .nullable()
                .fieldName('source_payout_id')
                .foreignKeyName('commission_payout_source_payout_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionPayout extends CommissionPayoutSchema.class {}

CommissionPayoutSchema.setClass(CommissionPayout);
