import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { OperatingSignalToCommissionGateBinding } from './operating-signal-gate-binding.entity';

const p = defineEntity.properties;

export const CommissionGateReviewRecordSchema = defineEntity({
    name: 'CommissionGateReviewRecord',
    tableName: 'commission_gate_review_record',
    schema: 'poms',
    comment: '提成 gate 复核与阻断留痕',
    indexes: [
        {
            name: 'idx_cgrr_binding_handled_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.bindingId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_cgrr_decision_status', properties: ['gateReviewDecision', 'status'] },
        { name: 'idx_cgrr_summary_snapshot', properties: ['summarySnapshotId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        bindingId: () =>
            p.manyToOne(OperatingSignalToCommissionGateBinding).mapToPk().fieldName('binding_id').comment('关联 gate 绑定结果'),
        gateReviewDecision: p.string().length(32).fieldName('gate_review_decision').comment('gate 复核结论'),
        blockingReasonCode: p.string().length(64).nullable().fieldName('blocking_reason_code').comment('阻断原因编码'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('commission_gate_review_record_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('摘要快照 ID'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        nextActionSummary: p.text().nullable().fieldName('next_action_summary').comment('下一步动作摘要'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('处理人'),
        status: p.string().length(32).default('active').comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class CommissionGateReviewRecord extends CommissionGateReviewRecordSchema.class {}

CommissionGateReviewRecordSchema.setClass(CommissionGateReviewRecord);
