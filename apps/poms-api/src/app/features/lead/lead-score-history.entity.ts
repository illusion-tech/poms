import { defineEntity } from '@mikro-orm/core';
import {
    LEAD_EFFECTIVE_SCORE_SOURCES,
    LEAD_RATINGS,
    LEAD_SCORE_OVERRIDE_STATUSES,
    LEAD_SCORE_SNAPSHOT_KINDS,
    LeadEffectiveScoreSourceValue,
    LeadRatingValue,
    LeadScoreOverrideStatusValue,
    LeadScoreSnapshotKindValue,
    type LeadEffectiveScoreSource,
    type LeadGateSummary,
    type LeadRating,
    type LeadScoreOverrideStatus,
    type LeadScoreSnapshotKind
} from '@poms/shared-contracts';
import { Lead } from './lead.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const LEAD_SCORE_FORMULA_VERSION = 'lead-score-v1';

export const LeadScoreSnapshotSchema = defineEntity({
    name: 'LeadScoreSnapshot',
    tableName: 'lead_score_snapshot',
    schema: 'poms',
    comment: '线索评分历史快照',
    indexes: [
        { name: 'idx_lss_lead_created', properties: ['leadId', 'createdAt'] },
        { name: 'idx_lss_kind_created', properties: ['snapshotKind', 'createdAt'] },
        { name: 'idx_lss_source_record', properties: ['sourceRecordId'] }
    ],
    checks: [
        {
            name: 'chk_lss_snapshot_kind',
            expression: `"snapshot_kind" in (${toSqlStringList(LEAD_SCORE_SNAPSHOT_KINDS)})`
        },
        {
            name: 'chk_lss_system_score_range',
            expression: `"system_score" >= 0 and "system_score" <= 100`
        },
        {
            name: 'chk_lss_effective_score_range',
            expression: `"effective_score" >= 0 and "effective_score" <= 100`
        },
        {
            name: 'chk_lss_system_rating',
            expression: `"system_rating" in (${toSqlStringList(LEAD_RATINGS)})`
        },
        {
            name: 'chk_lss_effective_rating',
            expression: `"effective_rating" in (${toSqlStringList(LEAD_RATINGS)})`
        },
        {
            name: 'chk_lss_effective_score_source',
            expression: `"effective_score_source" in (${toSqlStringList(LEAD_EFFECTIVE_SCORE_SOURCES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('评分快照主键'),
        leadId: () => p.manyToOne(Lead).mapToPk().fieldName('lead_id').foreignKeyName('lead_score_snapshot_lead_id_foreign').updateRule('cascade').deleteRule('cascade').comment('线索 ID'),
        snapshotKind: p.string().$type<LeadScoreSnapshotKind>().length(32).default(LeadScoreSnapshotKindValue.System).fieldName('snapshot_kind').comment('快照类型'),
        overrideId: p.uuid().nullable().fieldName('override_id').comment('关联人工覆盖记录 ID'),
        formulaVersion: p.string().length(64).default(LEAD_SCORE_FORMULA_VERSION).fieldName('formula_version').comment('评分公式版本'),
        systemScore: p.integer().default(0).fieldName('system_score').comment('当时系统评分'),
        systemRating: p.string().$type<LeadRating>().length(8).default(LeadRatingValue.D).fieldName('system_rating').comment('当时系统评级'),
        effectiveScore: p.integer().default(0).fieldName('effective_score').comment('当时有效评分'),
        effectiveRating: p.string().$type<LeadRating>().length(8).default(LeadRatingValue.D).fieldName('effective_rating').comment('当时有效评级'),
        effectiveScoreSource: p.string().$type<LeadEffectiveScoreSource>().length(32).default(LeadEffectiveScoreSourceValue.System).fieldName('effective_score_source').comment('有效评分来源'),
        scoreReason: p.text().fieldName('score_reason').comment('评分说明'),
        componentBreakdown: p.json<Record<string, unknown>>().defaultRaw(`'{}'::jsonb`).fieldName('component_breakdown').comment('评分组件摘要'),
        gateSummarySnapshot: p.json<LeadGateSummary>().fieldName('gate_summary_snapshot').comment('硬闸口摘要快照'),
        sourceCommand: p.string().length(64).fieldName('source_command').comment('触发命令'),
        sourceRecordId: p.uuid().nullable().fieldName('source_record_id').comment('触发记录 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人')
    }
});

export const LeadScoreOverrideSchema = defineEntity({
    name: 'LeadScoreOverride',
    tableName: 'lead_score_override',
    schema: 'poms',
    comment: '线索评分人工覆盖记录',
    indexes: [
        { name: 'idx_lso_lead_status', properties: ['leadId', 'status'] },
        { name: 'idx_lso_requested_at', properties: ['requestedAt'] },
        { name: 'idx_lso_superseded_by', properties: ['supersededById'] }
    ],
    uniques: [
        {
            name: 'uq_lso_lead_pending',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.leadId}") where "${columns.status}" = '${LeadScoreOverrideStatusValue.Pending}'`
        },
        {
            name: 'uq_lso_lead_approved',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.leadId}") where "${columns.status}" = '${LeadScoreOverrideStatusValue.Approved}'`
        }
    ],
    checks: [
        {
            name: 'chk_lso_status',
            expression: `"status" in (${toSqlStringList(LEAD_SCORE_OVERRIDE_STATUSES)})`
        },
        {
            name: 'chk_lso_requested_score_range',
            expression: `"requested_score" >= 0 and "requested_score" <= 100`
        },
        {
            name: 'chk_lso_requested_rating',
            expression: `"requested_rating" in (${toSqlStringList(LEAD_RATINGS)})`
        },
        {
            name: 'chk_lso_system_score_at_request_range',
            expression: `"system_score_at_request" >= 0 and "system_score_at_request" <= 100`
        },
        {
            name: 'chk_lso_system_rating_at_request',
            expression: `"system_rating_at_request" in (${toSqlStringList(LEAD_RATINGS)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('人工覆盖记录主键'),
        leadId: () => p.manyToOne(Lead).mapToPk().fieldName('lead_id').foreignKeyName('lead_score_override_lead_id_foreign').updateRule('cascade').deleteRule('cascade').comment('线索 ID'),
        requestedScore: p.integer().fieldName('requested_score').comment('请求覆盖评分'),
        requestedRating: p.string().$type<LeadRating>().length(8).fieldName('requested_rating').comment('请求覆盖评级'),
        reason: p.text().comment('提交原因'),
        status: p.string().$type<LeadScoreOverrideStatus>().length(32).default(LeadScoreOverrideStatusValue.Pending).comment('覆盖状态'),
        systemScoreAtRequest: p.integer().fieldName('system_score_at_request').comment('提交时系统评分'),
        systemRatingAtRequest: p.string().$type<LeadRating>().length(8).fieldName('system_rating_at_request').comment('提交时系统评级'),
        requestedBy: p.uuid().nullable().fieldName('requested_by').comment('提交人'),
        requestedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('requested_at').comment('提交时间'),
        approvedBy: p.uuid().nullable().fieldName('approved_by').comment('批准人'),
        approvedAt: p.datetime().nullable().fieldName('approved_at').comment('批准时间'),
        approvalNote: p.text().nullable().fieldName('approval_note').comment('批准说明'),
        rejectedBy: p.uuid().nullable().fieldName('rejected_by').comment('驳回人'),
        rejectedAt: p.datetime().nullable().fieldName('rejected_at').comment('驳回时间'),
        rejectReason: p.text().nullable().fieldName('reject_reason').comment('驳回原因'),
        revokedBy: p.uuid().nullable().fieldName('revoked_by').comment('撤销人'),
        revokedAt: p.datetime().nullable().fieldName('revoked_at').comment('撤销时间'),
        revokeReason: p.text().nullable().fieldName('revoke_reason').comment('撤销原因'),
        supersededById: p.uuid().nullable().fieldName('superseded_by_id').comment('替代本记录的新覆盖记录 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class LeadScoreSnapshot extends LeadScoreSnapshotSchema.class {}

export class LeadScoreOverride extends LeadScoreOverrideSchema.class {}

LeadScoreSnapshotSchema.setClass(LeadScoreSnapshot);
LeadScoreOverrideSchema.setClass(LeadScoreOverride);
