import { OperatingEvaluationEvidence } from './rust-r4ghi-entities.entity';
import { defineEntity } from '@mikro-orm/core';
import {
    OPERATING_DATA_MATURITY_LEVELS,
    OPERATING_LIFECYCLE_STATUSES,
    OPERATING_SIGNAL_REVIEW_DECISIONS,
    OPERATING_SNAPSHOT_ACTION_LEVELS,
    OperatingLifecycleStatusValue,
    OperatingSignalReviewDecisionValue,
    type OperatingDataMaturityLevel,
    type OperatingLifecycleStatus,
    type OperatingSignalReviewDecision,
    type OperatingSnapshotActionLevel
} from '@poms/shared-contracts';
import { OperatingSignalEvaluationResult } from './operating-signal-evaluation-result.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
const toPostgresTextAnyArray = (values: readonly string[]): string => `ANY ((ARRAY[${values.map((value) => `'${value.replaceAll("'", "''")}'::character varying`).join(', ')}])::text[])`;

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
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.signalEvaluationId}") where "${columns.status}" = '${OperatingLifecycleStatusValue.Active}'`
        },
        {"name":"uq_jghi_signal_review_current","expression":"CREATE UNIQUE INDEX uq_jghi_signal_review_current ON poms.operating_signal_review_record(signal_evaluation_id)\n WHERE producer_version=1 AND status='active'"},
        {"name":"uq_jghi_signal_review_successor","expression":"CREATE UNIQUE INDEX uq_jghi_signal_review_successor ON poms.operating_signal_review_record(supersedes_id)\n WHERE supersedes_id IS NOT NULL"}
    ],
    checks: [
        {
            name: 'chk_os_review_review_decision',
            expression: `"review_decision" in (${toSqlStringList(OPERATING_SIGNAL_REVIEW_DECISIONS)})`
        },
        {
            name: 'chk_os_review_resolved_cost_action',
            expression: `"resolved_cost_action_recommendation" is null or ("resolved_cost_action_recommendation")::text = ${toPostgresTextAnyArray(OPERATING_SNAPSHOT_ACTION_LEVELS)}`
        },
        {
            name: 'chk_os_review_resolved_current_action',
            expression: `"resolved_current_action_level" in (${toSqlStringList(OPERATING_SNAPSHOT_ACTION_LEVELS)})`
        },
        {
            name: 'chk_os_review_resolved_data_maturity',
            expression: `"resolved_data_maturity_level" is null or ("resolved_data_maturity_level")::text = ${toPostgresTextAnyArray(OPERATING_DATA_MATURITY_LEVELS)}`
        },
        {
            name: 'chk_os_review_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        },
        {"name":"ck_jghi_osreview_v1","expression":"producer_version=0 OR\n  (producer_version=1 AND evidence_id IS NOT NULL AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'\n   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$'\n   AND expected_signal_version IS NOT NULL AND expected_signal_version>0\n   AND review_payload IS NOT NULL AND jsonb_typeof(review_payload)='object'\n   AND payload_hash IS NOT NULL AND payload_hash~'^[0-9a-f]{64}$' AND handled_by IS NOT NULL)"}
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        signalEvaluationId: () =>
            p.manyToOne(OperatingSignalEvaluationResult).mapToPk().fieldName('signal_evaluation_id').comment('关联经营信号结果'),
        reviewDecision: p.string().$type<OperatingSignalReviewDecision>().length(32).default(OperatingSignalReviewDecisionValue.Approve).fieldName('review_decision').comment('复核结论'),
        resolvedDataMaturityLevel: p.string().$type<OperatingDataMaturityLevel | null>().length(32).nullable().fieldName('resolved_data_maturity_level').comment('复核后数据成熟度等级'),
        resolvedCostActionRecommendation: p.string().$type<OperatingSnapshotActionLevel | null>().length(32).nullable().fieldName('resolved_cost_action_recommendation').comment('复核后成本动作建议'),
        resolvedCurrentActionLevel: p.string().$type<OperatingSnapshotActionLevel>().length(32).fieldName('resolved_current_action_level').comment('复核后当前动作等级'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本'),
        referencedSnapshotVersion: p.string().length(64).fieldName('referenced_snapshot_version').comment('引用快照版本'),
        reviewComment: p.text().nullable().fieldName('review_comment').comment('复核说明'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('处理人'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    ,
        producerVersion: p.smallint().default(0).fieldName("producer_version"),
        evidenceId: () => p.manyToOne(OperatingEvaluationEvidence).mapToPk().joinColumns("evidence_id").referencedColumnNames("id").foreignKeyName("operating_signal_review_record_evidence_id_fkey").deleteRule("no action").updateRule("no action").nullable(),
        sourceHash: p.string().length(64).nullable().fieldName("source_hash"),
        evaluationHash: p.string().length(64).nullable().fieldName("evaluation_hash"),
        expectedSignalVersion: p.integer().nullable().fieldName("expected_signal_version"),
        reviewPayload: p.json<unknown>().columnType('jsonb').nullable().fieldName("review_payload"),
        payloadHash: p.string().length(64).nullable().fieldName("payload_hash"),
        supersedesId: () => p.manyToOne(OperatingSignalReviewRecord).mapToPk().joinColumns("supersedes_id").referencedColumnNames("id").foreignKeyName("operating_signal_review_record_supersedes_id_fkey").deleteRule("no action").updateRule("no action").nullable()
    }
});

export class OperatingSignalReviewRecord extends OperatingSignalReviewRecordSchema.class {}

OperatingSignalReviewRecordSchema.setClass(OperatingSignalReviewRecord);
