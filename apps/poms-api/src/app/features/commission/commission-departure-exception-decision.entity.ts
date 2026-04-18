import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { Project } from '../project/project.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';

export type CommissionDepartureExceptionDecisionStatus = 'active' | 'superseded' | 'voided';

const p = defineEntity.properties;

export const CommissionDepartureExceptionDecisionSchema = defineEntity({
    name: 'CommissionDepartureExceptionDecision',
    tableName: 'commission_departure_exception_decision',
    schema: 'poms',
    comment: '离职 / 特例结论',
    indexes: [
        { name: 'idx_cded_project_current', properties: ['projectId', 'isCurrent'] },
        {
            name: 'idx_cded_project_handled_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_cded_freeze_version_status', properties: ['freezeVersionId', 'status'] },
        { name: 'idx_cded_summary_snapshot', properties: ['summarySnapshotId'] },
        { name: 'idx_cded_decision_status', properties: ['decisionCode', 'status'] }
    ],
    uniques: [
        { name: 'cded_project_version_unique', properties: ['projectId', 'version'] },
        {
            name: 'uq_cded_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_departure_exception_decision_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('关联项目'),
        freezeVersionId: () =>
            p
                .manyToOne(CommissionRoleAssignment)
                .mapToPk()
                .fieldName('freeze_version_id')
                .foreignKeyName('cded_freeze_version_fk')
                .updateRule('cascade')
                .comment('关联当前冻结版本'),
        version: p.integer().comment('版本号'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效'),
        departureScenarioCode: p.string().length(64).fieldName('departure_scenario_code').comment('离职 / 特例情形码'),
        decisionCode: p.string().length(32).fieldName('decision_code').comment('结论码'),
        decisionSummary: p.text().fieldName('decision_summary').comment('结论摘要'),
        confirmationRequirementSummary: p
            .text()
            .nullable()
            .fieldName('confirmation_requirement_summary')
            .comment('责任承接确认要求摘要'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('cded_summary_snapshot_fk')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('摘要快照 ID'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('处理人'),
        status: p
            .string()
            .length(32)
            .default('active')
            .$type<CommissionDepartureExceptionDecisionStatus>()
            .fieldName('status')
            .comment('状态：active/superseded/voided'),
        supersedesId: () =>
            p
                .manyToOne(CommissionDepartureExceptionDecision)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('cded_supersedes_fk')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('被替代的旧结论'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionDepartureExceptionDecision extends CommissionDepartureExceptionDecisionSchema.class {}

CommissionDepartureExceptionDecisionSchema.setClass(CommissionDepartureExceptionDecision);
