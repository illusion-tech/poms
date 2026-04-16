import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { CommissionFreezeDisputeRecord } from './commission-freeze-dispute-record.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';

export type CommissionFreezeChangeRequestStatus = 'effective' | 'closed';

const p = defineEntity.properties;

export const CommissionFreezeChangeRequestSchema = defineEntity({
    name: 'CommissionFreezeChangeRequest',
    tableName: 'commission_freeze_change_request',
    schema: 'poms',
    comment: '提成冻结后受控变更记录',
    indexes: [
        {
            name: 'idx_cfcr_dispute_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.disputeRecordId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_cfcr_replacement_freeze', properties: ['replacementFreezeVersionId'] },
        { name: 'idx_cfcr_superseded_freeze', properties: ['supersededFreezeVersionId'] },
        { name: 'idx_cfcr_summary_snapshot', properties: ['summarySnapshotId'] },
        {
            name: 'idx_cfcr_status_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.status}", "${columns.handledAt}" desc)`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        disputeRecordId: () =>
            p
                .manyToOne(CommissionFreezeDisputeRecord)
                .mapToPk()
                .fieldName('dispute_record_id')
                .foreignKeyName('cfcr_dispute_record_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('归属争议记录'),
        supersededFreezeVersionId: () =>
            p
                .manyToOne(CommissionRoleAssignment)
                .mapToPk()
                .fieldName('superseded_freeze_version_id')
                .foreignKeyName('cfcr_superseded_freeze_version_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('被替代冻结版本 ID'),
        replacementFreezeVersionId: () =>
            p
                .manyToOne(CommissionRoleAssignment)
                .mapToPk()
                .nullable()
                .fieldName('replacement_freeze_version_id')
                .foreignKeyName('cfcr_replacement_freeze_version_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('替代冻结版本 ID'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('cfcr_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('摘要快照 ID'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        arbitrationDecision: p.string().length(64).fieldName('arbitration_decision').comment('仲裁结论'),
        recalculationImpactMode: p.string().length(64).fieldName('recalculation_impact_mode').comment('回溯影响模式'),
        affectedCalculationSummary: p.text().nullable().fieldName('affected_calculation_summary').comment('受影响计算摘要'),
        affectedPayoutSummary: p.text().nullable().fieldName('affected_payout_summary').comment('受影响发放摘要'),
        riskFlagSummary: p.text().nullable().fieldName('risk_flag_summary').comment('风险标记摘要'),
        status: p
            .string()
            .length(32)
            .$type<CommissionFreezeChangeRequestStatus>()
            .default('closed')
            .comment('状态'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class CommissionFreezeChangeRequest extends CommissionFreezeChangeRequestSchema.class {}

CommissionFreezeChangeRequestSchema.setClass(CommissionFreezeChangeRequest);
