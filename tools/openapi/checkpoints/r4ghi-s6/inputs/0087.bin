import { defineEntity } from '@mikro-orm/core';
import {
    BASELINE_SELECTION_SOURCES,
    COMMISSION_FINAL_SETTLEMENT_STATUSES,
    COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES,
    COMMISSION_NON_RETENTION_SETTLEMENT_STATUSES,
    COMMISSION_RETENTION_SETTLEMENT_STATUSES,
    OPERATING_DATA_MATURITY_LEVELS,
    OPERATING_SNAPSHOT_ACTION_LEVELS,
    type BaselineSelectionSource,
    type CommissionFinalSettlementStatus,
    type CommissionLifecycleSnapshotStatus,
    type CommissionNonRetentionSettlementStatus,
    type CommissionRetentionSettlementStatus,
    type OperatingDataMaturityLevel,
    type OperatingSnapshotActionLevel
} from '@poms/shared-contracts';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { ReceiptRecord } from '../contract-finance/receipt-record.entity';
import { CommissionGateReviewRecord } from '../project-cost/commission-gate-review-record.entity';
import { Project } from '../project/project.entity';
import { CommissionDepartureExceptionDecision } from './commission-departure-exception-decision.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';

export type CommissionFinalSettlementSnapshotStatus = CommissionLifecycleSnapshotStatus;

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const CommissionFinalSettlementSnapshotSchema = defineEntity({
    name: 'CommissionFinalSettlementSnapshot',
    tableName: 'commission_final_settlement_snapshot',
    schema: 'poms',
    comment: '最终结算 / 质保金收口快照',
    indexes: [
        { name: 'idx_cfss_project_current', properties: ['projectId', 'isCurrent'] },
        {
            name: 'idx_cfss_project_generated_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.generatedAt}" desc)`
        },
        { name: 'idx_cfss_status_generated_at', properties: ['status', 'generatedAt'] },
        { name: 'idx_cfss_freeze_version', properties: ['freezeVersionId'] },
        { name: 'idx_cfss_gate_review', properties: ['gateReviewRecordId'] },
        { name: 'idx_cfss_summary_snapshot', properties: ['summarySnapshotId'] }
    ],
    uniques: [
        { name: 'cfss_project_version_unique', properties: ['projectId', 'version'] },
        {
            name: 'uq_cfss_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        }
    ],
    checks: [
        {
            name: 'chk_cfss_data_maturity_level',
            expression: `"data_maturity_level" in (${toSqlStringList(OPERATING_DATA_MATURITY_LEVELS)})`
        },
        {
            name: 'chk_cfss_final_settlement_status',
            expression: `"final_settlement_status" in (${toSqlStringList(COMMISSION_FINAL_SETTLEMENT_STATUSES)})`
        },
        {
            name: 'chk_cfss_non_retention_settlement_status',
            expression: `"non_retention_settlement_status" in (${toSqlStringList(COMMISSION_NON_RETENTION_SETTLEMENT_STATUSES)})`
        },
        {
            name: 'chk_cfss_retention_settlement_status',
            expression: `"retention_settlement_status" in (${toSqlStringList(COMMISSION_RETENTION_SETTLEMENT_STATUSES)})`
        },
        {
            name: 'chk_cfss_baseline_selection_source',
            expression: `"baseline_selection_source" in (${toSqlStringList(BASELINE_SELECTION_SOURCES)})`
        },
        {
            name: 'chk_cfss_cost_action_recommendation',
            expression: `"cost_action_recommendation" in (${toSqlStringList(OPERATING_SNAPSHOT_ACTION_LEVELS)})`
        },
        {
            name: 'chk_cfss_current_action_level',
            expression: `"current_action_level" in (${toSqlStringList(OPERATING_SNAPSHOT_ACTION_LEVELS)})`
        },
        {
            name: 'chk_cfss_status',
            expression: `"status" in (${toSqlStringList(COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_final_settlement_snapshot_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('关联项目'),
        freezeVersionId: () =>
            p
                .manyToOne(CommissionRoleAssignment)
                .mapToPk()
                .fieldName('freeze_version_id')
                .foreignKeyName('cfss_freeze_version_fk')
                .updateRule('cascade')
                .comment('当前冻结版本'),
        gateReviewRecordId: () =>
            p
                .manyToOne(CommissionGateReviewRecord)
                .mapToPk()
                .fieldName('gate_review_record_id')
                .foreignKeyName('cfss_gate_review_fk')
                .updateRule('cascade')
                .comment('当前 gate 复核记录'),
        retentionReceiptRecordId: () =>
            p
                .manyToOne(ReceiptRecord)
                .mapToPk()
                .nullable()
                .fieldName('retention_receipt_record_id')
                .foreignKeyName('cfss_retention_receipt_fk')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('质保金到账事实引用'),
        departureExceptionDecisionId: () =>
            p
                .manyToOne(CommissionDepartureExceptionDecision)
                .mapToPk()
                .nullable()
                .fieldName('departure_exception_decision_id')
                .foreignKeyName('cfss_departure_exception_fk')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('离职 / 特例结论引用'),
        version: p.integer().comment('版本号'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效'),
        finalSettlementStatus: p
            .string()
            .$type<CommissionFinalSettlementStatus>()
            .length(32)
            .fieldName('final_settlement_status')
            .comment('项目级最终结算状态'),
        nonRetentionSettlementStatus: p
            .string()
            .$type<CommissionNonRetentionSettlementStatus>()
            .length(32)
            .fieldName('non_retention_settlement_status')
            .comment('非质保部分结清状态'),
        retentionSettlementStatus: p
            .string()
            .$type<CommissionRetentionSettlementStatus>()
            .length(32)
            .fieldName('retention_settlement_status')
            .comment('质保金结算状态'),
        retentionRequirementSummary: p
            .text()
            .nullable()
            .fieldName('retention_requirement_summary')
            .comment('质保金结算条件摘要'),
        retentionReceiptSummary: p.text().nullable().fieldName('retention_receipt_summary').comment('质保金到账摘要'),
        departureExceptionSummary: p.text().nullable().fieldName('departure_exception_summary').comment('离职 / 特例摘要'),
        baselineSelectionSource: p
            .string()
            .$type<BaselineSelectionSource>()
            .length(32)
            .fieldName('baseline_selection_source')
            .comment('基线选择来源'),
        taxImpactSummary: p.text().fieldName('tax_impact_summary').comment('税务影响摘要'),
        taxImpactPendingAmount: p
            .decimal()
            .precision(18)
            .scale(2)
            .default(0)
            .fieldName('tax_impact_pending_amount')
            .comment('待闭合税务影响金额'),
        dataMaturityLevel: p.string().$type<OperatingDataMaturityLevel>().length(32).fieldName('data_maturity_level').comment('数据成熟度等级'),
        costActionRecommendation: p
            .string()
            .$type<OperatingSnapshotActionLevel>()
            .length(32)
            .fieldName('cost_action_recommendation')
            .comment('成本侧动作建议'),
        currentActionLevel: p
            .string()
            .$type<OperatingSnapshotActionLevel>()
            .length(32)
            .fieldName('current_action_level')
            .comment('当前动作等级'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本'),
        referencedSnapshotVersion: p.string().length(64).fieldName('referenced_snapshot_version').comment('引用快照版本'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('cfss_summary_snapshot_fk')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('摘要快照 ID'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        generatedAt: p.datetime().defaultRaw('now()').fieldName('generated_at').comment('快照生成时间'),
        status: p
            .string()
            .length(32)
            .default('active')
            .$type<CommissionFinalSettlementSnapshotStatus>()
            .fieldName('status')
            .comment('状态：active/superseded/voided'),
        supersedesId: () =>
            p
                .manyToOne(CommissionFinalSettlementSnapshot)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('cfss_supersedes_fk')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('被替代的旧快照'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionFinalSettlementSnapshot extends CommissionFinalSettlementSnapshotSchema.class {}

CommissionFinalSettlementSnapshotSchema.setClass(CommissionFinalSettlementSnapshot);
