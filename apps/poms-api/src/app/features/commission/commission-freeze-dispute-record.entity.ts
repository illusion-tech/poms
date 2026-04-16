import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { Project } from '../project/project.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';

export type CommissionFreezeDisputeRecordStatus = 'submitted' | 'closed';
export type CommissionFreezeDisputeArbitrationStatus = 'pending' | 'arbitrated';

const p = defineEntity.properties;

export const CommissionFreezeDisputeRecordSchema = defineEntity({
    name: 'CommissionFreezeDisputeRecord',
    tableName: 'commission_freeze_dispute_record',
    schema: 'poms',
    comment: '提成冻结后争议记录',
    indexes: [
        {
            name: 'idx_cfdr_project_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_cfdr_freeze_version_status', properties: ['freezeVersionId', 'status'] },
        { name: 'idx_cfdr_summary_snapshot', properties: ['summarySnapshotId'] }
    ],
    uniques: [
        {
            name: 'uq_cfdr_open_freeze_version',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.freezeVersionId}") where "${columns.status}" = 'submitted'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('cfdr_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('项目 ID'),
        freezeVersionId: () =>
            p
                .manyToOne(CommissionRoleAssignment)
                .mapToPk()
                .fieldName('freeze_version_id')
                .foreignKeyName('cfdr_freeze_version_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('被争议冻结版本 ID'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('cfdr_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('摘要快照 ID'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        disputeReason: p.text().fieldName('dispute_reason').comment('争议原因'),
        affectedAssignmentSummary: p.text().fieldName('affected_assignment_summary').comment('影响角色摘要'),
        arbitrationStatus: p
            .string()
            .length(32)
            .$type<CommissionFreezeDisputeArbitrationStatus>()
            .default('pending')
            .fieldName('arbitration_status')
            .comment('仲裁状态'),
        recalculationImpactMode: p.string().length(64).fieldName('recalculation_impact_mode').comment('回溯影响模式'),
        impactAssessmentSummary: p.text().nullable().fieldName('impact_assessment_summary').comment('影响评估摘要'),
        status: p
            .string()
            .length(32)
            .$type<CommissionFreezeDisputeRecordStatus>()
            .default('submitted')
            .comment('状态'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class CommissionFreezeDisputeRecord extends CommissionFreezeDisputeRecordSchema.class {}

CommissionFreezeDisputeRecordSchema.setClass(CommissionFreezeDisputeRecord);
