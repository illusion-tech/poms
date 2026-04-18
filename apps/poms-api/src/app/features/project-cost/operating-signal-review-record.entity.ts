import { defineEntity } from '@mikro-orm/core';
import { OperatingSignalEvaluationResult } from './operating-signal-evaluation-result.entity';

const p = defineEntity.properties;

export const OperatingSignalReviewRecordSchema = defineEntity({
    name: 'OperatingSignalReviewRecord',
    tableName: 'operating_signal_review_record',
    schema: 'poms',
    comment: '经营信号人工复核记录',
    indexes: [
        {
            name: 'idx_osrr_signal_handled_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.signalEvaluationId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_osrr_decision_status', properties: ['reviewDecision', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_osrr_signal_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.signalEvaluationId}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        signalEvaluationId: () =>
            p.manyToOne(OperatingSignalEvaluationResult).mapToPk().fieldName('signal_evaluation_id').comment('关联经营信号结果'),
        reviewDecision: p.string().length(32).fieldName('review_decision').comment('复核结论'),
        resolvedDataMaturityLevel: p.string().length(32).nullable().fieldName('resolved_data_maturity_level').comment('复核后数据成熟度等级'),
        resolvedCostActionRecommendation: p.string().length(32).nullable().fieldName('resolved_cost_action_recommendation').comment('复核后成本动作建议'),
        resolvedCurrentActionLevel: p.string().length(32).fieldName('resolved_current_action_level').comment('复核后当前动作等级'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本'),
        referencedSnapshotVersion: p.string().length(64).fieldName('referenced_snapshot_version').comment('引用快照版本'),
        reviewComment: p.text().nullable().fieldName('review_comment').comment('复核说明'),
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

export class OperatingSignalReviewRecord extends OperatingSignalReviewRecordSchema.class {}

OperatingSignalReviewRecordSchema.setClass(OperatingSignalReviewRecord);
